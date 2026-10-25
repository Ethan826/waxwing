-- Int arithmetic as one node shape shared by every tree (Syntax, Resolved,
-- Checked, IR), so each whole-tree walk has one case that folds or
-- traverses the operands (D001; design docs/plans/2026-10-23-int-
-- arithmetic-design.md, section 7 step 0). The operators are built-in
-- nodes, a documented stopgap permitted by the design's Rulings: they are
-- not resolved through a prelude or dictionaries (C001), and this node is
-- the single place to remove when operator resolution is designed.
module Domain.Arithmetic
  ( Arithmetic(..)
  , BinaryOp(..)
  , operands
  ) where

import Prelude
import Data.Foldable (class Foldable)
import Data.Traversable (class Traversable)

-- `+` today; Task 3 of the plan adds `Minus`, Task 4 `Times`.
data BinaryOp = Plus

-- Operands in written order, which is evaluation order (left then right).
data Arithmetic e = Binary BinaryOp e e

derive instance eqBinaryOp ∷ Eq BinaryOp
derive instance functorArithmetic ∷ Functor Arithmetic
derive instance foldableArithmetic ∷ Foldable Arithmetic
derive instance traversableArithmetic ∷ Traversable Arithmetic

-- The operands, left to right.
operands ∷ ∀ e. Arithmetic e → Array e
operands (Binary _ left right) = [ left, right ]
