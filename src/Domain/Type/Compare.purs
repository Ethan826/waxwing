module Domain.Type.Compare
  ( sameRow
  , sameRows
  , compareRows
  , compareParts
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
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
