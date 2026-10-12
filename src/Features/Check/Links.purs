module Features.Check.Links
  ( linkTo
  , linkOf
  ) where

import Data.Map as Map
import Data.Maybe (Maybe)
import Features.Check.Occurrence (OccurrenceId)
import Features.Check.Subst (Subst(..))

-- `from` is the same label as `to`; an occurrence's first link stays.
linkTo ∷ OccurrenceId → OccurrenceId → Subst → Subst
linkTo from to (Subst bindings) =
  Subst bindings { links = Map.insertWith keepFirst from to bindings.links }
  where
  keepFirst first _ = first

linkOf ∷ Subst → OccurrenceId → Maybe OccurrenceId
linkOf (Subst bindings) from = Map.lookup from bindings.links
