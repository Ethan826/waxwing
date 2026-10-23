-- T-R0b §3.2-§3.3: the forms that extend `Γ` (E12, E13, E16). Lambdas
-- and `let`s are monomorphic: a binding is the bound expression's type,
-- never generalized (§5.1). Children: `Match/scrutinee`,
-- `Match/arms/k/pattern`, `Match/arms/k/body`, `Lambda/body`,
-- `Block/items/i/Let/value` (`…/Defer/value`, `…/Discard/value`),
-- `Block/result`.
module Features.Check.Generate.Control
  ( block
  , lambda
  , match
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe, maybe, maybe')
import Data.Traversable (mapAccumL, sequence)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom
  ( Atom(..)
  , Base(..)
  , CheckedName(..)
  , OutsideKind(..)
  , RTExpr(..)
  , Role(..)
  , Var
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(Named)
  )
import Domain.Resolved (Arm, Expr, LocalId, Param)
import Domain.Resolved as Resolved
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Fault (Gen)
import Features.Check.Generate.Fresh
  ( child
  , childAt
  , childOf
  , fresh
  , nodeRes
  , rigidNaming
  )
import Features.Check.Generate.Out
  ( Generated
  , Item(ToB, ToOutside)
  , Listed
  , Out
  , TypeMarker
  , concatOut
  , emit
  , listed
  , markersAt
  , varsOut
  )
import Features.Check.Generate.Pattern (pattern)
import Features.Check.Generate.Translate (arrowOf, translate)

-- E12: arm `k`'s pattern against `τ_s` gives `Γ_k`; its body under
-- `Γ_k`; `eq τ_{body_k} ⟨p, res⟩` (B1). The arms read the scrutinee's
-- generated type, a child's result (G-local), never a solved one.
match ∷ Recur → Context → Path → Span → Expr → Array Arm → Gen Generated
match recur context path span scrutinee arms = do
  tested ← recur context (childOf path "Match" "scrutinee") scrutinee
  found ← sequence (Array.mapWithIndex (armOf tested.ty) arms)
  pure
    { ty: res
    , out: concatOut
        ( [ varsOut [ resVar ]
          , emit (at context path (ExprRule 12)) (map armAtom found)
          , tested.out
          ]
            <> map _.out found
        )
    }
  where
  resVar = nodeRes path (ExprRule 12) span
  res = TVar (fst resVar)
  armOf scrutineeType index arm = armWith scrutineeType
    (childAt path "Match" "arms" index)
    arm
  armWith scrutineeType armPath arm =
    pattern context (child armPath [ Named "pattern" ]) scrutineeType
      arm.pattern
      >>= armResult armPath arm
  armResult armPath arm bound = armBody bound.out
    <$> recur bound.context (child armPath [ Named "body" ]) arm.body
  armBody patternOut body =
    { ty: body.ty, out: concatOut [ patternOut, body.out ] }
  armAtom arm = listed (ToB (Equal arm.ty res)) RowB 1 Body span

-- E13: `σ₁ → … → σ_m → τ_body`; an annotated parameter `k` is `⟦A_k⟧ν_f`
-- with its definedness atom `eq σ_k σ_k` (B14, origin types), an
-- unannotated one `⟨p, param k⟩` at `ParamType p k`; markers of the
-- annotations follow, origin types.
lambda
  ∷ Recur → Context → Path → Span → Array Param → Expr → Gen Generated
lambda recur context path span parameters body = do
  typed ← sequence
    (Array.mapWithIndex (parameterOf context path span) parameters)
  inner ← recur (Array.foldl bindParameter context typed)
    (childOf path "Lambda" "body")
    body
  pure
    { ty: arrowOf (map _.ty typed) inner.ty
    , out: concatOut
        [ varsOut (Array.concatMap _.vars typed)
        , emit (at context path (ExprRule 13))
            ( Array.concatMap _.defined typed
                <> markersAt Types span (Array.concatMap _.marks typed)
            )
        , inner.out
        ]
    }
  where
  bindParameter current found = maybe current
    (bindLocal <@> found.ty <@> current)
    found.local

type Typed =
  { local ∷ Maybe LocalId
  , ty ∷ RTExpr
  , vars ∷ Array (Tuple Var VarInfo)
  , defined ∷ Array Listed
  , marks ∷ Array TypeMarker
  }

parameterOf ∷ Context → Path → Span → Int → Param → Gen Typed
parameterOf context path span index parameter =
  maybe' unannotated annotated parameter.ty
  where
  annotated written = annotation
    <$> translate context.tables rigidNaming written
  annotation found =
    { local: parameter.local
    , ty: found.ty
    , vars: []
    , defined: [ listed (ToB (Equal found.ty found.ty)) RowB 14 Types span ]
    , marks: found.marks
    }
  unannotated _ = pure
    { local: parameter.local
    , ty: TVar (fst var)
    , vars: [ var ]
    , defined: []
    , marks: []
    }
  var = fresh
    { path
    , role: Param index
    , rule: ExprRule 13
    , span: parameter.span
    , sort: SortType
    , position: ParamType path index
    }

-- E16: items in order, each `let` extending `Γ` for the items after it;
-- `defer e` gives `eq τ_e Unit` (B1) and `Outside Deferred` (O6) at the
-- item's path with its span (reading 19). The block's type is the
-- result's. One pass (`mapAccumL`, a loop) carries the environment, a
-- fault included, so a block of thousands of items costs no stack.
block ∷ Recur → Context → Path → Array Resolved.Item → Expr → Gen Generated
block recur context path items result = do
  outs ← sequence done.value
  inner ← done.accum
  final ← recur inner (childOf path "Block" "result") result
  pure { ty: final.ty, out: concatOut (Array.snoc outs final.out) }
  where
  done = mapAccumL step (pure context) (Array.mapWithIndex Tuple items)
  step current (Tuple index found) = split
    (current >>= visitAt index found)
  visitAt index found walked = itemOf recur walked
    (childAt path "Block" "items" index)
    found
  split visited = { accum: _.accum <$> visited, value: _.value <$> visited }

type Visited = { accum ∷ Context, value ∷ Out }

itemOf ∷ Recur → Context → Path → Resolved.Item → Gen Visited
itemOf recur context path = case _ of
  Resolved.Let _ local value → letItem context local
    <$> recur context (childOf path "Let" "value") value
  Resolved.Defer span value → deferred context path span
    <$> recur context (childOf path "Defer" "value") value
  Resolved.Discard value → discarded context
    <$> recur context (childOf path "Discard" "value") value

discarded ∷ Context → Generated → Visited
discarded context found = { accum: context, value: found.out }

letItem ∷ Context → Maybe LocalId → Generated → Visited
letItem context local found =
  { accum: maybe context (bindLocal <@> found.ty <@> context) local
  , value: found.out
  }

deferred ∷ Context → Path → Span → Generated → Visited
deferred context path span found =
  { accum: context
  , value: concatOut
      [ emit (at context path (ExprRule 16))
          [ listed (ToB (Equal found.ty (Base UnitBase))) RowB 1 Body span
          , listed (ToOutside Deferred) RowO 6 Body span
          ]
      , found.out
      ]
  }
