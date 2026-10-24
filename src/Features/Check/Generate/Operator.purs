-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.2-§3.3: operators, conditionals and application (E7-E11,
-- E14, E15). Each relates its children's types by `eq` atoms (B1); none
-- reads a solved shape: application is `eq τ_e (τ̄ → ⟨p, res⟩)` whatever
-- `e` turns out to be (§4). Checked nodes as today's (Check/Infer.purs,
-- Apply.purs, Pipe.purs; D1 spec §3.5, R0 Task 7.1b).
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
import Data.Foldable (traverse_)
import Data.Traversable (sequence, traverse)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr)
import Domain.Syntax (Operator, Span)
import Domain.Type (Ty(..))
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Elab (Elab, GenTy)
import Features.Check.Generate.Fresh (childAt, childOf, nodeRes)
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom(..)
  , GenEntry(..)
  , GenReq(..)
  , Tagged
  , emit
  )
import Features.Check.Generate.Node
  ( Generated
  , Ruled
  , arrowOf
  , fixed
  , flex
  , tagged
  )

type Binary = Checked.Expr → Checked.Expr → Checked.Node

-- E7 (`Add`, Int) and E8 (`Concat`, Text): `eq τ_l b`, `eq τ_r b`.
arithmetic
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → { rule ∷ Int, label ∷ String, base ∷ GenTy s, made ∷ Binary }
  → Expr
  → Expr
  → Gen s (Ruled s)
arithmetic recur context path span operator left right = do
  one ← recur context (childOf path operator.label "left") left
  other ← recur context (childOf path operator.label "right") right
  pure
    { ty: operator.base
    , node: fixed (operator.made <$> one.expr <*> other.expr)
    , emits: do
        emit (at context path (ExprRule operator.rule))
          [ agree span (GenEqual one.ty operator.base)
          , agree span (GenEqual other.ty operator.base)
          ]
        one.emits
        other.emits
    }

-- E9: `eq τ_part Text` per part, each at `Interpolate/parts/i`.
interpolate
  ∷ ∀ s. Recur s → Context s → Path → Span → Array Expr → Gen s (Ruled s)
interpolate recur context path span parts = textual
  <$> sequence (Array.mapWithIndex part parts)
  where
  part index = recur context (childAt path "Interpolate" "parts" index)
  textPart found = agree span (GenEqual found.ty TText)
  textual generated =
    { ty: TText
    , node: fixed (Checked.Interpolate <$> traverse _.expr generated)
    , emits: do
        emit (at context path (ExprRule 9)) (map textPart generated)
        traverse_ _.emits generated
    }

-- E10: `eq τ_l τ_r`, and `cmp τ_l` [VOR] at the left operand only (C6).
comparison
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Operator
  → Expr
  → Expr
  → Gen s (Ruled s)
comparison recur context path span operator left right = do
  one ← recur context (childOf path "Compare" "left") left
  other ← recur context (childOf path "Compare" "right") right
  pure
    { ty: TBool
    , node: fixed (Checked.Compare operator <$> one.expr <*> other.expr)
    , emits: do
        emit (at context path (ExprRule 10))
          [ agree span (GenEqual one.ty other.ty)
          , tagged (EmitBQ (GenComparable one.ty)) RowC 6 Body span
          ]
        one.emits
        other.emits
    }

-- E11: `eq τ_c Bool`, `eq τ_y ⟨p, res⟩`, `eq τ_n ⟨p, res⟩`.
conditional
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Expr
  → Expr
  → Expr
  → Gen s (Ruled s)
conditional recur context path span condition yes no = do
  tested ← recur context (childOf path "If" "condition") condition
  taken ← recur context (childOf path "If" "then") yes
  other ← recur context (childOf path "If" "else") no
  res ← flex <$> nodeRes path (ExprRule 11) span
  pure
    { ty: res
    , node: fixed (Checked.If <$> tested.expr <*> taken.expr <*> other.expr)
    , emits: do
        emit (at context path (ExprRule 11))
          [ agree span (GenEqual tested.ty TBool)
          , agree span (GenEqual taken.ty res)
          , agree span (GenEqual other.ty res)
          ]
        tested.emits
        taken.emits
        other.emits
    }

-- E14: `eq τ_e (τ_{a₁} → … → τ_{a_k} → ⟨p, res⟩)`.
application
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Expr
  → Array Expr
  → Gen s (Ruled s)
application recur context path span function arguments = do
  callee ← recur context (childOf path "Apply" "function") function
  generated ← sequence (Array.mapWithIndex argument arguments)
  applied context path span 14 callee generated
    (Checked.Apply <$> callee.expr <*> traverse _.expr generated)
  where
  argument index = recur context (childAt path "Apply" "args" index)

-- E15: as E14 with `e = r` and `a₁ = l` (FN001 §5); a named call on the
-- right is E5's partial application, so no case split on its form. The
-- checked node keeps the left operand first (Check/Pipe.purs).
pipe ∷ ∀ s. Recur s → Context s → Path → Span → Expr → Expr → Gen s (Ruled s)
pipe recur context path span left right = do
  callee ← recur context (childOf path "Pipe" "right") right
  value ← recur context (childOf path "Pipe" "left") left
  applied context path span 15 callee [ value ]
    (Checked.Pipe <$> value.expr <*> callee.expr)

-- The applied value, then its arguments (for E15 the right operand is
-- generated before the left, an order no entry depends on).
applied
  ∷ ∀ s
  . Context s
  → Path
  → Span
  → Int
  → Generated s
  → Array (Generated s)
  → Elab s Checked.Node
  → Gen s (Ruled s)
applied context path span rule function arguments node = made
  <$> nodeRes path (ExprRule rule) span
  where
  made handle =
    { ty: flex handle
    , node: fixed node
    , emits: do
        emit (at context path (ExprRule rule))
          [ agree span
              ( GenEqual function.ty
                  (arrowOf (map _.ty arguments) (flex handle))
              )
          ]
        function.emits
        traverse_ _.emits arguments
    }

-- A body agreement (B1, origin body) at the node's span.
agree ∷ ∀ s. Span → GenAtom s → Tagged s
agree span atom = tagged (EmitB atom) RowB 1 Body span
