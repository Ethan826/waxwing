module Features.Resolve.TypeIndices
  ( TypeIndices
  , typeIndices
  , indexOf
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..), fst)

-- The declared types' names with their indices, sorted by name, built once
-- per program and searched by halves. Scanning the types for each written
-- type made a program of n types O(n²) (T007, R001 Task 15); a sorted
-- array is a few times cheaper to build than a Map of the same names.
newtype TypeIndices = TypeIndices (Array (Tuple String Int))

type Range = { low ∷ Int, high ∷ Int }

-- The sort is stable, so a name declared twice has its first declaration
-- first, where a scan in declaration order would find it.
typeIndices ∷ ∀ r. Array { name ∷ String | r } → TypeIndices
typeIndices entries = TypeIndices
  (Array.sortWith fst (Array.mapWithIndex indexed entries))
  where
  indexed index entry = Tuple entry.name index

-- The index of the first type declared with this name.
indexOf ∷ TypeIndices → String → Maybe Int
indexOf (TypeIndices sorted) name = Array.index sorted first >>= named
  where
  first = tailRec (narrowed sorted name)
    { low: 0, high: Array.length sorted }
  named (Tuple found index) = if found == name then Just index else Nothing

-- The first position whose name is not below `name`, by halving the range
-- that holds it. The middle of a nonempty range is always in the array;
-- were it not, narrowing from above still ends the loop.
narrowed ∷ Array (Tuple String Int) → String → Range → Step Range Int
narrowed sorted name range =
  if range.low >= range.high then Done range.low
  else Loop (maybe range { high = middle } halved (Array.index sorted middle))
  where
  middle = (range.low + range.high) / 2
  halved (Tuple found _) =
    if found < name then range { low = middle + 1 }
    else range { high = middle }
