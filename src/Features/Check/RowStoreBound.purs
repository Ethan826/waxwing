module Features.Check.RowStoreBound
  ( boundOf
  , withBound
  , withoutBound
  , emptiedOf
  , withEmptied
  ) where

import Prelude
import Data.Map as Map
import Data.Maybe (Maybe)
import Features.Check.RowBound (Bound)
import Features.Check.RowStore (RowStore(..))

-- The upper bound of an unbound meta, if it has one.
boundOf ∷ RowStore → Int → Maybe Bound
boundOf (RowStore store) meta = Map.lookup meta store.upper

-- The meta's bound set or narrowed: a change.
withBound ∷ Int → Bound → RowStore → RowStore
withBound meta bound (RowStore store) = RowStore store
  { upper = Map.insert meta bound store.upper, changes = store.changes + 1 }

-- The bound of a meta just bound (U3: its image took it over).
withoutBound ∷ Int → RowStore → RowStore
withoutBound meta (RowStore store) = RowStore store
  { upper = Map.delete meta store.upper }

-- The last bound of a meta U4 bound to `{}`: what narrowed it, and what
-- pruned it, by atom.
emptiedOf ∷ RowStore → Int → Maybe Bound
emptiedOf (RowStore store) meta = Map.lookup meta store.emptied

withEmptied ∷ Int → Bound → RowStore → RowStore
withEmptied meta bound (RowStore store) = RowStore store
  { emptied = Map.insert meta bound store.emptied }
