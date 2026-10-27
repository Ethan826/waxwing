-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.2-§3.3: matches and lambdas, which extend `Γ` (E12, E13;
-- E16 is Generate.Block). Lambdas are monomorphic: a binding is the
-- bound expression's type, never generalized (§5.1). Children:
-- `Match/scrutinee`, `Match/arms/k/pattern`, `Match/arms/k/body`,
-- `Lambda/body`. Checked nodes as today's (Check/Arms.purs, Lambda.purs;
-- D1 spec §3.5, R0 Task 7.1b); a lambda's parameter is read at
-- `ParamType p k`, annotated or not. Marked types (amin tranche 1, Task
-- 3, Task 4): a match is its `⟨p, res⟩`; a lambda's stages before the
-- last have the fresh rows `⟨p, stage k⟩` and its last stage the
-- lambda's own row `⟨p, effect⟩` (Check/Lambda.purs: `row` is the body's
-- row and the last stage's, Check/Stages.purs `stages` the others'); an
-- annotated parameter k is marked as Generate.Marked `InAnnotation p k`
-- reads it, with its owned clause rows (Generate.Owned), and recorded in
-- `annotations` at `Lambda/params/k`, a key of its own (a parameter is
-- not a node, so no node path takes that step).
module Features.Check.Generate.Control
  ( lambda
  , match
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (sequence, traverse)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (CheckedName(..), Role(..), VarSort(..))
import Domain.Recorded.Effect (ERole(..), EVar(..), MTy)
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(Named)
  )
import Domain.Resolved (Arm, Expr, LocalId, Param)
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Elab (Elab, GenTy)
import Features.Check.Generate.Fresh (child, childAt, childOf, nodeRes)
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom(..)
  , GenEntry(..)
  , Tagged
  , effected
  , emit
  , fresh
  , lifted
  , positioned
  )
import Features.Check.Generate.Node
  ( Ruled
  , arrowOf
  , fixed
  , flex
  , markedFlex
  , markersAt
  , stagedArrow
  , tagged
  )
import Features.Check.Generate.Marked (MarkNaming(..), marked)
import Features.Check.Generate.Minted (Part(..), mintedAt)
import Features.Check.Generate.Out (EffectItem(..), TypeMarker)
import Features.Check.Generate.Owned (annotationClauses)
import Features.Check.Generate.Pattern (pattern)
import Features.Check.Generate.Translate (Naming(..), translate)

-- E12: arm `k`'s pattern against `τ_s` gives `Γ_k`; its body under
-- `Γ_k`; `eq τ_{body_k} ⟨p, res⟩` (B1). The arms read the scrutinee's
-- generated type, a child's result (G-local), never a solved one.
match
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Expr
  → Array Arm
  → Gen s (Ruled s)
match recur context path span scrutinee arms = do
  tested ← recur context (childOf path "Match" "scrutinee") scrutinee
  found ← sequence (Array.mapWithIndex (armOf (scrutineeOf tested)) arms)
  handle ← nodeRes path (ExprRule 12) span
  let res = flex handle
  pure
    { ty: res
    , marked: markedFlex handle
    , node: fixed (Checked.Match <$> tested.expr <*> traverse _.arm found)
    , emits: do
        emit (at context path (ExprRule 12)) (map (armAtom res) found)
        tested.emits
        traverse_ _.emits found
    }
  where
  armOf scrutineeType index arm = armWith scrutineeType
    (childAt path "Match" "arms" index)
    arm
  armWith scrutineeType armPath arm = do
    bound ← pattern context (child armPath [ Named "pattern" ]) scrutineeType
      arm.pattern
    body ← recur bound.context (child armPath [ Named "body" ]) arm.body
    pure
      { ty: body.ty
      , arm: { pattern: _, body: _, span: arm.span } <$> bound.pattern
          <*> body.expr
      , emits: bound.emits *> body.emits
      }
  armAtom res arm = tagged (EmitB (GenEqual arm.ty res)) RowB 1 Body span
  scrutineeOf tested = { ty: tested.ty, marked: tested.marked }

-- E13: `σ₁ → … → σ_m → τ_body`; an annotated parameter `k` is `⟦A_k⟧ν_f`
-- with its definedness atom `eq σ_k σ_k` (B14, origin types), an
-- unannotated one `⟨p, param k⟩` at `ParamType p k`; markers of the
-- annotations follow, origin types.
lambda
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Array Param
  → Expr
  → Gen s (Ruled s)
lambda recur context path span parameters body = do
  effected (mintedAt path ([ effect ] <> stages) [])
  typed ← sequence (Array.mapWithIndex (parameterOf path) parameters)
  inner ← recur (Array.foldl bindParameter context typed)
    (childOf path "Lambda" "body")
    body
  pure
    { ty: arrowOf (map _.ty typed) inner.ty
    , marked: stagedArrow path
        { supplied: 0
        , parameters: map _.marked typed
        , last: { labels: [], tail: Just effect }
        , result: inner.marked
        }
    , node: fixed (Checked.Lambda <$> traverse _.param typed <*> inner.expr)
    , emits: do
        emit (at context path (ExprRule 13))
          ( Array.concatMap (_.defined <@> span) typed
              <> markersAt Types span (Array.concatMap _.marks typed)
          )
        inner.emits
    }
  where
  effect = EffFresh path EffectOf
  stages = Array.mapWithIndex stage (Array.drop 1 parameters)
  stage index _ = EffFresh path (Stage index)
  parameterOf = parameterAt context
  bindParameter current found = maybe current
    (bindLocal <@> { ty: found.ty, marked: found.marked } <@> current)
    found.local

type Typed s =
  { local ∷ Maybe LocalId
  , ty ∷ GenTy s
  , marked ∷ MTy
  , param ∷ Elab s Checked.Param
  , defined ∷ Span → Array (Tagged s)
  , marks ∷ Array TypeMarker
  }

parameterAt
  ∷ ∀ s. Context s → Path → Int → Param → Gen s (Typed s)
parameterAt context path index parameter = do
  made ← maybe unannotated annotated parameter.ty
  read ← positioned (ParamType path index) made.ty
  pure
    { local: parameter.local
    , ty: made.ty
    , marked: made.marked
    , param: { local: parameter.local, ty: _ } <$> read
    , defined: made.defined
    , marks: made.marks
    }
  where
  annotated written = do
    found ← lifted (translate context.tables Rigidly written)
    markedType ← lifted
      (marked context.tables (InAnnotation path index) written)
    let owned = annotationClauses path index markedType
    effected
      ( [ AnnotationAt (childAt path "Lambda" "params" index) owned ]
          <> mintedAt path [] [ PartTy owned ]
      )
    pure (annotation found owned)
  annotation found markedType =
    { ty: found.ty
    , marked: markedType
    , defined: definedness found.ty
    , marks: found.marks
    }
  definedness ty span =
    [ tagged (EmitB (GenEqual ty ty)) RowB 14 Types span ]
  unannotated = unwritten <$> fresh
    { path
    , role: Param index
    , rule: ExprRule 13
    , span: parameter.span
    , sort: SortType
    , position: ParamType path index
    }
  unwritten handle =
    { ty: flex handle, marked: markedFlex handle, defined: const [], marks: [] }
