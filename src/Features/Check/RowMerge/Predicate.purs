module Features.Check.RowMerge.Predicate
  ( waiting
  , anyWaiting
  , made
  , replaced
  , solved
  , moved
  , boundByCase
  , causeOf
  , causeIn
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Domain.Syntax (Span)
import Features.Check.RowMerge.Merge (Merge, Merges, Row)
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.RowStore (mergesOf, onMerges)
import Features.Check.Subst (Flex, Subst(..), onStore, storeOf)

-- The waiting predicates, in identity order (the order they were made):
-- the rescan's order (plan §2.4).
waiting ∷ Subst → Array Merge
waiting subst = Array.fromFoldable (Map.values (merged subst).waiting)

anyWaiting ∷ Subst → Boolean
anyWaiting subst = not (Map.isEmpty (merged subst).waiting)

-- A new predicate, with the next identity. Its parts' disjointness is the
-- maker's to require (Features.Check.RowMerge.Desugar).
made ∷ Maybe Span → Row → Row → Row → Subst → Subst
made site left right result = onStore (onMerges added)
  where
  added found = found
    { waiting = Map.insert found.next
        { id: found.next, left, right, result, site }
        found.waiting
    , next = found.next + 1
    }

-- Case 3's replacement keeps the identity (rules §5's lineage).
replaced ∷ Merge → Subst → Subst
replaced merge = onStore (onMerges changed)
  where
  changed found = found
    { waiting = Map.insert merge.id merge found.waiting }

solved ∷ Int → Subst → Subst
solved id = onStore (onMerges removed)
  where
  removed found = found { waiting = Map.delete id found.waiting }

-- The labels one case 3 moved into the predicate's result.
moved ∷ Int → Array String → Subst → Subst
moved id labels = onStore (onMerges recorded)
  where
  recorded found = found
    { moves = Map.insert id (prior found <> [ labels ]) found.moves }
  prior found = maybe [] identity (Map.lookup id found.moves)

-- Each meta bound between `before` and `after`, recorded as bound by
-- predicate `id`'s case (R10.1, extended to case 2).
boundByCase ∷ Int → Subst → Subst → Subst
boundByCase id (Subst before) after@(Subst now) =
  onStore (onMerges recorded) after
  where
  fresh = Set.difference (Map.keys now.types) (Map.keys before.types)
  recorded found = found
    { boundBy = foldl (byThis id) found.boundBy fresh }
  byThis predicate table meta = Map.insert meta predicate table

-- The predicate whose case bound one of these metas, the earliest made.
causeOf ∷ Subst → Array Int → Maybe Int
causeOf subst metas = Array.head (Array.sort (Array.mapMaybe caused metas))
  where
  caused meta = Map.lookup meta (merged subst).boundBy

-- The predicate whose case bound a meta these tails lead to, if any; the
-- tails are followed only when some case has bound something.
causeIn ∷ Subst → Array Flex → Maybe Int
causeIn subst tails
  | Map.isEmpty (merged subst).boundBy = Nothing
  | otherwise = causeOf subst
      (Array.fromFoldable (metasThrough subst tails))

merged ∷ Subst → Merges
merged subst = mergesOf (storeOf subst)
