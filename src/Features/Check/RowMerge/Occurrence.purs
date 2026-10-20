module Features.Check.RowMerge.Occurrence (nextPredicate, recorded) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Domain.Syntax (Span)
import Domain.Type.Record (recordRow)
import Features.Check.OriginStore (onOrigins)
import Features.Check.PartOrigin (Step, madeOccurrence)
import Features.Check.RowMerge.Merge (Row)
import Features.Check.RowStore (mergesOf)
import Features.Check.Subst (Flex(..), Subst, storeOf)

-- The identity the next predicate made will have.
nextPredicate ∷ Subst → Int
nextPredicate subst = (mergesOf (storeOf subst)).next

-- A written row's desugaring recorded as diagnostic metadata
-- (Features.Check.PartOrigin): the predicates made since identity
-- `first`, the row's unknown tails and the tail that replaced them. Its
-- owner, if any, is the use's to add (Features.Check.RowMerge.Use).
recorded
  ∷ Maybe Span → Array Step → Int → Row → Flex → Subst → Subst
recorded site steps first written result subst =
  onOrigins (madeOccurrence ids occurrence) subst
  where
  next = nextPredicate subst
  ids = if next > first then Array.range first (next - 1) else []
  occurrence =
    { site
    , steps
    , parts: Array.mapMaybe metaId written.tails
    , result
    , row: recordRow written.fields
        (Array.filter rigid written.tails <> [ result ])
    , owner: Nothing
    , items: Map.empty
    }

rigid ∷ Flex → Boolean
rigid = case _ of
  Rigid _ → true
  Meta _ → false

metaId ∷ Flex → Maybe Int
metaId = case _ of
  Meta meta → Just meta
  Rigid _ → Nothing
