module Features.Check.Links
  ( linkTo
  , relayTo
  , linkOf
  , relayOf
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

-- The same label as `to`, as the checker relays a clause row between rows
-- on its own: a report follows it only past a clause-row hop (Provenance
-- `trail`), so a relay shows where a label arose without moving any
-- other trail.
relayTo ∷ OccurrenceId → OccurrenceId → Subst → Subst
relayTo from to (Subst bindings) =
  Subst bindings { relays = Map.insertWith keepFirst from to bindings.relays }
  where
  keepFirst first _ = first

relayOf ∷ Subst → OccurrenceId → Maybe OccurrenceId
relayOf (Subst bindings) from = Map.lookup from bindings.relays
