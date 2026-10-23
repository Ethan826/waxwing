-- T-R0b §3.2-§3.3: operators, conditionals and application (E7-E11,
-- E14, E15). Each relates its children's types by `eq` atoms (B1); none
-- reads a solved shape: application is `eq τ_e (τ̄ → ⟨p, res⟩)` whatever
-- `e` turns out to be (§4).
module Features.Check.Generate.Operator
  ( application
  , arithmetic
  , comparison
  , conditional
  , interpolate
  , pipe
  ) where

import Prelude
import Data.Array as Array
import Data.Traversable (sequence)
import Data.Tuple (fst)
import Domain.Recorded.Atom (Atom(..), Base(..), RTExpr(..), ReqAtom(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr)
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Fault (Gen)
import Features.Check.Generate.Fresh (childAt, childOf, nodeRes)
import Features.Check.Generate.Out
  ( Generated
  , Item(..)
  , Listed
  , concatOut
  , emit
  , listed
  , varsOut
  )
import Features.Check.Generate.Translate (arrowOf)

-- E7 (`Add`, Int) and E8 (`Concat`, Text): `eq τ_l b`, `eq τ_r b`.
arithmetic
  ∷ Recur
  → Context
  → Path
  → Span
  → Int
  → String
  → Base
  → Expr
  → Expr
  → Gen Generated
arithmetic recur context path span rule label base left right = ado
  one ← recur context (childOf path label "left") left
  other ← recur context (childOf path label "right") right
  in
    { ty: Base base
    , out: concatOut
        [ emit (at context path (ExprRule rule))
            [ agree span (Equal one.ty (Base base))
            , agree span (Equal other.ty (Base base))
            ]
        , one.out
        , other.out
        ]
    }

-- E9: `eq τ_part Text` per part, each at `Interpolate/parts/i`.
interpolate ∷ Recur → Context → Path → Span → Array Expr → Gen Generated
interpolate recur context path span parts = textual
  <$> sequence (Array.mapWithIndex part parts)
  where
  part index = recur context (childAt path "Interpolate" "parts" index)
  textPart found = agree span (Equal found.ty (Base TextBase))
  textual generated =
    { ty: Base TextBase
    , out: concatOut
        ( [ emit (at context path (ExprRule 9)) (map textPart generated) ]
            <> map _.out generated
        )
    }

-- E10: `eq τ_l τ_r`, and `cmp τ_l` [VOR] at the left operand only (C6).
comparison ∷ Recur → Context → Path → Span → Expr → Expr → Gen Generated
comparison recur context path span left right = ado
  one ← recur context (childOf path "Compare" "left") left
  other ← recur context (childOf path "Compare" "right") right
  in
    { ty: Base BoolBase
    , out: concatOut
        [ emit (at context path (ExprRule 10))
            [ agree span (Equal one.ty other.ty)
            , listed (ToBQ (Comparable one.ty)) RowC 6 Body span
            ]
        , one.out
        , other.out
        ]
    }

-- E11: `eq τ_c Bool`, `eq τ_y ⟨p, res⟩`, `eq τ_n ⟨p, res⟩`.
conditional
  ∷ Recur → Context → Path → Span → Expr → Expr → Expr → Gen Generated
conditional recur context path span condition yes no = ado
  tested ← recur context (childOf path "If" "condition") condition
  taken ← recur context (childOf path "If" "then") yes
  other ← recur context (childOf path "If" "else") no
  in
    { ty: res
    , out: concatOut
        [ varsOut [ resVar ]
        , emit (at context path (ExprRule 11))
            [ agree span (Equal tested.ty (Base BoolBase))
            , agree span (Equal taken.ty res)
            , agree span (Equal other.ty res)
            ]
        , tested.out
        , taken.out
        , other.out
        ]
    }
  where
  resVar = nodeRes path (ExprRule 11) span
  res = TVar (fst resVar)

-- E14: `eq τ_e (τ_{a₁} → … → τ_{a_k} → ⟨p, res⟩)`.
application
  ∷ Recur → Context → Path → Span → Expr → Array Expr → Gen Generated
application recur context path span function arguments =
  applied context path
    span
    14
    <$> recur context (childOf path "Apply" "function") function
    <*> sequence (Array.mapWithIndex argument arguments)
  where
  argument index = recur context (childAt path "Apply" "args" index)

-- E15: as E14 with `e = r` and `a₁ = l` (FN001 §5); a named call on the
-- right is E5's partial application, so no case split on its form.
pipe ∷ Recur → Context → Path → Span → Expr → Expr → Gen Generated
pipe recur context path span left right = applied context path span 15
  <$> recur context (childOf path "Pipe" "right") right
  <*> (pure <$> recur context (childOf path "Pipe" "left") left)

-- The applied value, then its arguments (for E15 the right operand is
-- generated before the left, an order no entry depends on).
applied
  ∷ Context → Path → Span → Int → Generated → Array Generated → Generated
applied context path span rule function arguments =
  { ty: res
  , out: concatOut
      ( [ varsOut [ resVar ]
        , emit (at context path (ExprRule rule))
            [ agree span (Equal function.ty (arrowOf (map _.ty arguments) res))
            ]
        , function.out
        ]
          <> map _.out arguments
      )
  }
  where
  resVar = nodeRes path (ExprRule rule) span
  res = TVar (fst resVar)

-- A body agreement (B1, origin body) at the node's span.
agree ∷ Span → Atom → Listed
agree span atom = listed (ToB atom) RowB 1 Body span
