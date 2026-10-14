module Domain.Type.Compare
  ( sameRow
  , sameRows
  , compareRows
  , compareParts
  , Head(..)
  , Link
  , sameSpines
  , compareSpines
  ) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe, maybe')
import Data.Tuple (Tuple(..))
import Domain.Row (Row(..))

-- Rows with no label (every row before row syntax) compare by their
-- tails alone.
sameRow ∷ ∀ a v. Eq a ⇒ Eq v ⇒ Row a v → Row a v → Boolean
sameRow one@(Row oneLabels oneTail) other@(Row otherLabels otherTail)
  | Array.null oneLabels && Array.null otherLabels = oneTail == otherTail
  | otherwise = one == other

-- Compared before type arguments; the order is set in Core's instance.
sameRows ∷ ∀ a v. Eq a ⇒ Eq v ⇒ Array (Row a v) → Array (Row a v) → Boolean
sameRows one other = Array.null one && Array.null other || one == other

compareRows
  ∷ ∀ a v. Ord a ⇒ Ord v ⇒ Array (Row a v) → Array (Row a v) → Ordering
compareRows one other =
  if Array.null one && Array.null other then EQ else compare one other

-- The first pair's order, or when equal the second's, computed only then.
compareParts ∷ ∀ a b. Ord a ⇒ Ord b ⇒ a → a → b → b → Ordering
compareParts one other second third = case compare one other of
  EQ → compare second third
  decided → decided

-- Constructors in declaration order, as the derived instance ranked them.
data Head
  = IntHead
  | BoolHead
  | DataHead
  | VarHead
  | FunHead
  | UnitHead
  | HandlerHead
  | TextHead

derive instance eqHead ∷ Eq Head
derive instance ordHead ∷ Ord Head

-- One arrow of a spine, seen through the caller's view of its type: the
-- parameter, the arrow's row and the rest of the spine. Core owns the type,
-- so it supplies the view; the loops below stay free of its constructors.
type Link a v = { parameter ∷ a, row ∷ Row a v, rest ∷ a }

-- Two arrows' spines in step, by a loop, until a parameter or row differs
-- or one side is no longer an arrow.
sameSpines
  ∷ ∀ a v
  . Eq a
  ⇒ Eq v
  ⇒ (a → Maybe (Link a v))
  → a
  → a
  → Boolean
sameSpines view left right = tailRec step (Tuple left right)
  where
  step (Tuple one other) = maybe' (unmatched one other) advance
    (Tuple <$> view one <*> view other)
  unmatched one other _ = Done (one == other)
  advance (Tuple first second)
    | first.parameter == second.parameter && sameRow first.row second.row =
        Loop (Tuple first.rest second.rest)
    | otherwise = Done false

compareSpines
  ∷ ∀ a v
  . Ord a
  ⇒ Ord v
  ⇒ (a → Maybe (Link a v))
  → a
  → a
  → Ordering
compareSpines view left right = tailRec step (Tuple left right)
  where
  step (Tuple one other) = maybe' (unmatched one other) advance
    (Tuple <$> view one <*> view other)
  unmatched one other _ = Done (compare one other)
  advance (Tuple first second) = continued first.rest second.rest
    (compareParts first.parameter second.parameter first.row second.row)
  continued rest more = case _ of
    EQ → Loop (Tuple rest more)
    decided → Done decided
