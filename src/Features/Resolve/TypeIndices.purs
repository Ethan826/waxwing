module Features.Resolve.TypeIndices
  ( Indexed
  , TypeIndices
  , typeIndices
  , indexOf
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Resolved as Resolved

-- The declared types' names with their indices, sorted by name, built once
-- per program and searched by halves. Scanning the types for each written
-- type made a program of n types O(n²) (T007, R001 Task 15); a sorted
-- array is a few times cheaper to build than a Map of the same names.
newtype TypeIndices = TypeIndices (Array (Tuple String Int))

-- The declared types with their names' index, which a written type's name
-- is looked up in rather than scanned for (R014).
type Indexed r =
  { types ∷ Array Resolved.TypeInfo, typeIndices ∷ TypeIndices | r }

-- The sort is stable, so a name declared twice has its first declaration
-- first, where a scan in declaration order would find it.
typeIndices ∷ ∀ r. Array { name ∷ String | r } → TypeIndices
typeIndices entries = TypeIndices
  (Array.sortWith fst (Array.mapWithIndex indexed entries))
  where
  indexed index entry = Tuple entry.name index

-- The index of the first type declared with this name.
indexOf ∷ TypeIndices → String → Maybe Int
indexOf (TypeIndices sorted) name =
  Array.index sorted (firstFrom sorted name 0 (Array.length sorted))
    >>= named
  where
  named (Tuple found index) = if found == name then Just index else Nothing

-- The first position in [low, high) whose name is not below `name`, by
-- halving the range. A self tail call compiles to a loop. The middle of a
-- nonempty range is always in the array; were it not, narrowing from
-- above would still end the search.
firstFrom ∷ Array (Tuple String Int) → String → Int → Int → Int
firstFrom sorted name low high =
  if low >= high then low
  else if below then firstFrom sorted name (middle + 1) high
  else firstFrom sorted name low middle
  where
  middle = (low + high) / 2
  below = maybe false before (Array.index sorted middle)
  before (Tuple found _) = found < name
