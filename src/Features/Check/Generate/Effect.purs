-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.5, E17, E20 and E21: operations, handlers and `with` (E22
-- and E23 are Generate.Failure). Each marker's condition is syntactic
-- (§3.5): decided from the node and the tables, never a solved type.
-- Children: `Perform/args/k`, `Handler/clauses/k/body`, `With/handler`,
-- `With/body`. Checked nodes as today's (Check/Operation.purs,
-- Handler.purs, ClauseBody.purs; D1 spec §3.5, R0 Task 7.1b): a perform
-- is a named call (Generate.Call `applied`), and a clause's parameter
-- types are read at `ClauseParamType p c k` (spec §12.2; the clauses are
-- in Generate.HandlerClause). A handler literal's marked type keeps its
-- label with the mark at `Literal p`, its R `⟨p, handler inference⟩` and
-- its C `⟨p, handler clauses⟩` (statements §2, "Copies through
-- equations"); `with`'s is its `⟨p, res⟩` (amin tranche 1, Task 4).
module Features.Check.Generate.Effect
  ( agree
  , handler
  , marker
  , operationRef
  , perform
  , with
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..))
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId)
import Domain.Recorded.Atom (OutsideKind(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Position(..)
  )
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr, HandlerClause, Ty, TyRow, VarId(..))
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..), closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Call (applied)
import Features.Check.Generate.Callee (Called, atUse, recordInstance)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Elab (Ref)
import Features.Check.Generate.Fresh (childAt, childOf, instances, nodeRes)
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom
  , GenEntry(..)
  , Tagged
  , effected
  , emit
  , lifted
  , slots
  )
import Features.Check.Generate.HandlerClause (effectId, handlerClause)
import Features.Check.Generate.Lookup (effectSorts, operationShape)
import Features.Check.Generate.Minted (Part(..), mintedAt)
import Features.Check.Generate.Node
  ( Ruled
  , arrowOf
  , fixed
  , flex
  , instanceArrow
  , markedFlex
  , markedRef
  , markersAt
  , tagged
  )
import Features.Check.Generate.Translate (translate, translateAll)

-- E17, a reference: `θ(⟦T̄ → result⟧)`.
operationRef
  ∷ ∀ s. Context s → Path → Span → EffectId → Int → Gen s (Ruled s)
operationRef context path span effect index = referenced
  <$> operation context path span effect index
  where
  referenced found =
    { ty: arrowOf found.parameters found.result
    , marked: instanceArrow path 0 found.instance
    , node: fixed (Checked.OperationRef effect index <$> found.slots)
    , emits: emit (at context path (ExprRule 17))
        (found.entries <> found.markers)
    }

-- E17, a call: `eq τ_{e_k} θ(⟦T_k⟧)` per argument up to the operation's
-- `n` parameters (B1), typed as E5 types a call (amendment, Task 4.3: a
-- perform is checked as a named call, Check/Operation.purs `named`, so
-- the rule takes E5's cases, where §3.5 wrote `θ(⟦result⟧)` alone):
-- `θ(⟦result⟧)` with `n` arguments, the arrow of the rest with fewer,
-- and with more `⟨p, res⟩` and `eq θ(⟦result⟧) (τ_{e_{n+1}} → … → ⟨p,
-- res⟩)` (B1), as RT8's read-back found. The arguments are generated
-- before the operation is looked up.
perform
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → EffectId
  → Int
  → Array Expr
  → Gen s (Ruled s)
perform recur context path span effect index arguments = do
  generated ← sequence (Array.mapWithIndex argument arguments)
  found ← operation context path span effect index
  applied context { path, span, rule: ExprRule 17, row: RowB }
    (Checked.Perform effect index)
    found
    generated
  where
  argument place = recur context (childAt path "Perform" "args" place)

-- The operation instantiated. When the effect has parameters, `Outside
-- EffectArgument` (O2, origin body): their link to the handler's
-- instantiation runs through the erased row and is not recorded. Then
-- the markers of `T̄` and the result (origin inst). Both follow the
-- argument equations, so they are the instance's markers.
operation
  ∷ ∀ s. Context s → Path → Span → EffectId → Int → Gen s (Called s)
operation context path span effect index = do
  shape ← lifted (operationShape context.tables effect index)
  inst ← instances path (ExprRule 17) span shape.sorts
  parameters ← lifted (translateAll context.tables inst.naming shape.parameters)
  result ← lifted (translate context.tables inst.naming shape.result)
  read ← slots path inst.slots
  markedTypes ← lifted
    ( atUse context path shape.parameters
        (operationRow effect shape.sorts)
        shape.result
    )
  recordInstance path shape.sorts markedTypes
  pure
    { parameters: parameters.tys
    , result: result.ty
    , entries: []
    , markers: marker (not (Array.null shape.sorts)) EffectArgument 2 span
        <> markersAt InstOrigin span (parameters.marks <> result.marks)
    , slots: read
    , instance: markedTypes
    }

-- An operation's row, as Check/Operation.purs `operationUse` writes it:
-- its own effect over the effect's parameters, plain, closed.
operationRow ∷ ∀ a. EffectId → Array a → TyRow VarId
operationRow effect parameters = Row
  [ Label (UserEffect effect) (Array.mapWithIndex parameter parameters)
      Plain
  ]
  Nothing
  where
  parameter index _ = Type.TVar (VarId index)

-- E20: `app (Handler e) [⟨p, inst j⟩ …]`, `Outside HandlerType` (O3),
-- clause bodies with parameters at θ of their declared types; markers of
-- those types follow (origin inst). The checked node holds the written
-- label's arguments (Check/ClauseBody.purs `labelArgs`), which the
-- witness binds `⟨p, inst j⟩` to.
handler
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Label (Ty VarId)
  → Array HandlerClause
  → Gen s (Ruled s)
handler recur context path span (Label effect _ mark) clauses = do
  sorts ← lifted (effectSorts context.tables effect)
  inst ← instances path (ExprRule 20) span sorts
  found ← sequence (Array.mapWithIndex (clauseOf inst.naming) clauses)
  read ← slots path inst.slots
  let markedType = literalType path effect inst.all
  effected
    ( mintedAt path (literalVars path)
        (map PartTy ([ markedType ] <> Array.concatMap _.marked found))
    )
  pure
    { ty: Type.THandler (Label effect (map snd inst.slots) mark)
        { inference: closedRow, clauses: Nothing }
    , marked: markedType
    , node: fixed
        ( Checked.Handler (effectId effect) <$> read
            <*> traverse _.clause found
        )
    , emits: do
        emit (at context path (ExprRule 20))
          ( marker true HandlerType 3 span
              <> markersAt InstOrigin span (Array.concatMap _.marks found)
          )
        traverse_ _.emits found
    }
  where
  snd (Tuple _ ty) = ty
  clauseOf naming place = handlerClause recur context
    { handler: path, clause: place }
    naming

-- E21: `⟨p, res⟩`, `Outside HandlerType`; no equation through the
-- handler.
with
  ∷ ∀ s. Recur s → Context s → Path → Span → Expr → Expr → Gen s (Ruled s)
with recur context path span installed body = do
  handlerPart ← recur context (childOf path "With" "handler") installed
  bodyPart ← recur context (childOf path "With" "body") body
  res ← nodeRes path (ExprRule 21) span
  pure
    { ty: flex res
    , marked: markedFlex res
    , node: fixed (Checked.With <$> handlerPart.expr <*> bodyPart.expr)
    , emits: do
        emit (at context path (ExprRule 21)) (marker true HandlerType 3 span)
        handlerPart.emits
        bodyPart.emits
    }

-- An explicit marker of this rule (origin body), when its condition
-- holds.
marker ∷ ∀ s. Boolean → OutsideKind → Int → Span → Array (Tagged s)
marker holds kind row span =
  if holds then [ tagged (EmitOutside kind) RowO row Body span ] else []

agree ∷ ∀ s. Span → GenAtom s → Tagged s
agree span atom = tagged (EmitB atom) RowB 1 Body span

-- A handler literal's marked type, R and C its own variables.
literalType ∷ ∀ s. Path → EffectRef → Array (Ref s) → MTy
literalType path effect arguments = MHandler
  { effect, args: map markedRef arguments, mark: At (Literal path) }
  { inference: tailOnly inference, clauses: Just (tailOnly clauses) }
  where
  inference = EffFresh path HandlerInference
  clauses = EffFresh path HandlerClauses

literalVars ∷ Path → Array EVar
literalVars path =
  [ EffFresh path HandlerInference, EffFresh path HandlerClauses ]

tailOnly ∷ EVar → MRow
tailOnly variable = { labels: [], tail: Just variable }
