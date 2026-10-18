module Features.Check.RowStore
  ( RowStore(..)
  , module Features.Check.Because
  , emptyStore
  , lackTable
  , withLacks
  , partnersOf
  , withApart
  , withoutPairs
  , arrival
  , stamped
  , atSite
  ) where

import Prelude
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax (Span)
import Features.Check.Because
  ( Because(..)
  , Lack
  , Pair
  , WrittenLack
  , plain
  , prefer
  , preferLack
  , rank
  )
import Features.Check.Flex (Flex)

-- What the record tails of a substitution are known to satisfy (R005
-- Tranche B design §1.3), kept inside the substitution so that a
-- postponed effect pair that reverts it reverts these too. `lacks`: the
-- labels each record tail may never hold, a meta's or a signature's rigid
-- one's, each with its reason (Features.Check.Lacks). `apart`: pairs of
-- tails, each a rigid or an unbound meta, that hold no label in common,
-- kept both ways with one reason (a rigid pair is a body's hypothesis, a
-- meta's an obligation). `arrivedAt`: where a meta was bound, the span of
-- the requirement being checked (`site`) when it was. The upper bounds,
-- pending equations and their index arrive with Tasks 4 and 5.
newtype RowStore = RowStore
  { lacks ∷ Map Flex (Map String Lack)
  , apart ∷ Map Flex (Map Flex Because)
  , arrivedAt ∷ Map Int Span
  , site ∷ Maybe Span
  }

emptyStore ∷ RowStore
emptyStore = RowStore
  { lacks: Map.empty, apart: Map.empty, arrivedAt: Map.empty, site: Nothing }

-- The labels a tail lacks, each with its reason.
lackTable ∷ RowStore → Flex → Map String Lack
lackTable (RowStore store) tail = maybe Map.empty identity
  (Map.lookup tail store.lacks)

-- What the tail already lacks is kept; of two reasons for one label the
-- preferred (Features.Check.Because).
withLacks ∷ Flex → Map String Lack → RowStore → RowStore
withLacks tail found (RowStore store)
  | Map.isEmpty found = RowStore store
  | otherwise = RowStore store
      { lacks = Map.insertWith (Map.unionWith preferLack) tail found
          store.lacks
      }

-- The tails this one is apart from, each with its reason.
partnersOf ∷ RowStore → Flex → Map Flex Because
partnersOf (RowStore store) tail = maybe Map.empty identity
  (Map.lookup tail store.apart)

-- The pair recorded both ways, the preferred reason kept.
withApart ∷ Flex → Flex → Because → RowStore → RowStore
withApart one other because (RowStore store) = RowStore store
  { apart = added other one (added one other store.apart) }
  where
  added from to = Map.insertWith (Map.unionWith prefer) from
    (Map.singleton to because)

-- The tail's pairs removed from both sides (it was bound: its pairs are
-- re-required on its image).
withoutPairs ∷ Flex → RowStore → RowStore
withoutPairs tail store@(RowStore found) = RowStore found
  { apart = Map.delete tail
      (foldl dropped found.apart (Map.keys (partnersOf store tail)))
  }
  where
  dropped table partner = Map.update (Just <<< Map.delete tail) partner table

-- Where a meta was bound, if a requirement was being checked.
arrival ∷ RowStore → Int → Maybe Span
arrival (RowStore store) meta = Map.lookup meta store.arrivedAt

-- The meta stamped with the current requirement's span, if any.
stamped ∷ Int → RowStore → RowStore
stamped meta (RowStore store) = maybe (RowStore store) stamp store.site
  where
  stamp span = RowStore store
    { arrivedAt = Map.insert meta span store.arrivedAt }

-- The requirement being checked, or none.
atSite ∷ Maybe Span → RowStore → RowStore
atSite site (RowStore store) = RowStore store { site = site }
