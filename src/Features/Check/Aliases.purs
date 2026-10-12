module Features.Check.Aliases
  ( Aliases
  , noAliases
  , landing
  , aliased
  , jumped
  ) where

import Prelude
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, fromMaybe, maybe)
import Data.Tuple (Tuple(..))

-- BACKLOG T008. A row meta bound to a bare tail (`m := ρ`, no label) is an
-- alias hop, and settling makes a chain of them as long as the declaration
-- (one per consumption, the newest hop at the far end). Walking a row
-- through the chain cost one lookup per hop, so each of N consumptions cost
-- O(N): 14 million lookups for 1,000 installations, the whole of the
-- quadratic time. The feed graph was not the cause (its rows are short).
--
-- The hops are grouped into classes, as in a union-find that only grows at
-- one end: `reach` sends a member to its class, `ends` sends a class to the
-- far end of its hops. A meta in no table is its own class and its own end.
-- The invariant: from every member, the hops to the class's end are all
-- label-free, so a walk may jump to `landing` and continue from there
-- without changing a label, an occurrence or the tail it reaches. The tables
-- are plain data in the substitution, so a postponed pair reverts them.
-- Nothing is merged unless one side is a lone meta; the unmerged case just
-- keeps the old hop-by-hop walk, so the tables never need to be complete.
type Aliases = { reach ∷ Map Int Int, ends ∷ Map Int Int }

noAliases ∷ Aliases
noAliases = { reach: Map.empty, ends: Map.empty }

classOf ∷ Aliases → Int → Int
classOf aliases meta = fromMaybe meta (Map.lookup meta aliases.reach)

-- The meta that the label-free hops from `meta` end at. A meta outside
-- every class (nearly all of them) costs one lookup.
landing ∷ Aliases → Int → Int
landing aliases meta = maybe meta ended (Map.lookup meta aliases.reach)
  where
  ended group = fromMaybe group (Map.lookup group aliases.ends)

-- `meta`, the end of its hops, is now bound to the bare tail `next`. When
-- `next` is a lone meta it joins the class and becomes its end, so every
-- earlier member lands on it; when `meta` is a lone meta it joins `next`'s
-- class. Otherwise nothing is recorded and the hop is walked as before. A
-- class's name is its first member, which is a member of itself.
aliased ∷ Aliases → Int → Int → Aliases
aliased aliases meta next
  | landing aliases meta /= meta || landing aliases next == meta = aliases
  | alone aliases next = aliases
      { reach = Map.insert next (classOf aliases meta)
          (Map.insert meta (classOf aliases meta) aliases.reach)
      , ends = Map.insert (classOf aliases meta) next aliases.ends
      }
  | alone aliases meta = aliases
      { reach = Map.insert meta (classOf aliases next) aliases.reach }
  | otherwise = aliases

-- A meta in no class.
alone ∷ Aliases → Int → Boolean
alone aliases one = not (Map.member one aliases.reach)

-- The binding that bound meta `meta` leads to in `table`, with the meta that
-- holds it. A bare binding (`bare`) may be a hop, which is jumped to the
-- end of its class; if the hops end unbound, that end's own `open` row is
-- the binding. Only a class's end holds labels or is unbound, so a binding
-- that is not bare is returned as it stands.
jumped
  ∷ ∀ row
  . Aliases
  → Map Int row
  → (row → Boolean)
  → (Int → row)
  → Int
  → Maybe (Tuple Int row)
jumped aliases table bare open meta = reached <$> Map.lookup meta table
  where
  reached row
    | bare row = hop (landing aliases meta) row
    | otherwise = Tuple meta row
  hop end row
    | end == meta = Tuple meta row
    | otherwise = Tuple end (fromMaybe (open end) (Map.lookup end table))
