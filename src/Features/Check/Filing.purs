module Features.Check.Filing
  ( Mode(..)
  , originOf
  , filing
  , remainder
  , missing
  ) where

import Prelude
import Prim hiding (Row)
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Domain.Checked.Internal (Open(..))
import Domain.Problem (Problem(..))
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (TyRow)
import Features.Check.Consume (closeTail, consumeIgnoring)
import Features.Check.Context (CheckEnv)
import Features.Check.Groups
  ( grew
  , groupAt
  , placed
  , remainderOf
  , signatureOf
  , started
  , unfiled
  )
import Features.Check.Provenance (Consumed(ClauseRow), Origin)
import Features.Check.Restricted (ClauseEntry, ClauseSignature)
import Features.Check.Scheme (State)
import Features.Check.Walked (End(..), endOf)
import Features.Check.Watch (watchTail)

-- Where `sync` runs. Checking reports at the node's span (P13); settling at
-- the clause entry's handler literal, and leaves a rigid tail to the tail
-- pass (design §3.5), but still files merges and extensions (class upkeep
-- that correction S needs).
data Mode = Checking Span | Settling

originOf ∷ Mode → ClauseEntry → Origin
originOf mode entry = { span, consumed: ClauseRow, via: Nothing }
  where
  span = case mode of
    Checking at → at
    Settling → entry.handler

-- F1′ for one clause.
filing
  ∷ ∀ r
  . CheckEnv r
  → Mode
  → State
  → Int
  → Either Diagnostic State
filing env mode state id = maybe (Right state) (filed env mode state id)
  (Map.lookup id state.restricted.clauses)

data Choice = New | Join Int | Merge Int | Stay

-- Filed under its resolved tail. An unbound one is a group member: when
-- its labels grew it joins the group already there or starts a new one
-- (rev10 N1; no merge of the old φ); otherwise it merges with a different
-- group found there, or stays. A rigid or closed tail ends φ (N4).
filed
  ∷ ∀ r
  . CheckEnv r
  → Mode
  → State
  → Int
  → ClauseEntry
  → Either Diagnostic State
filed env mode state id entry = case endOf state.subst entry.row of
  Loose meta → unbound env origin loose id entry meta
  Fixed variable → ended (Row [] (Just (Rigid variable)))
  Ended → closed
  where
  origin = originOf mode entry
  loose = state { restricted = unfiled id entry.tail state.restricted }
  -- Settling leaves a rigid tail to the tail pass (§3.5: never in the loop).
  ended stage = case mode of
    Settling → Right loose
    Checking _ → ending env loose origin entry stage
  -- A closed tail closes φ (N4). No Task 7 program observes this: C is read
  -- only from Task 8 on, and R is closed by the same unification elsewhere.
  closed = remainder loose entry >>= closeTail env loose origin

-- A rigid tail binds the group's remainder φ to it.
ending
  ∷ ∀ r
  . CheckEnv r
  → State
  → Origin
  → ClauseEntry
  → TyRow Open
  → Either Diagnostic State
ending env state origin entry stage = remainder state entry >>= consumed
  where
  consumed phi = consumeIgnoring env state { origin, stage, target: phi }

unbound
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → State
  → Int
  → ClauseEntry
  → Int
  → Either Diagnostic State
unbound env origin state id entry meta = case choice of
  New → Right (stay fresh state.next)
  Join group → Right (stay state group)
  Merge group → merged group
  Stay → Right (stay state entry.group)
  where
  found = groupAt state.restricted meta
  now = signatureOf state.subst entry
  choice
    | grownSince now entry = maybe New Join found
    | otherwise = maybe Stay different found
  different group = if group /= entry.group then Merge group else Stay
  fresh = state
    { next = state.next + 2
    , restricted = started state.next (state.next + 1) meta state.restricted
    }
  stay from group = from
    { subst = watchTail meta from.subst
    , restricted = placed id group meta from.restricted
    }
  merged group = do
    old ← remainder state entry
    kept ← maybe (missing entry) Right (remainderOf state.restricted group)
    consumed ← consumeIgnoring env state { origin, stage: old, target: kept }
    pure (stay consumed (min entry.group group))

remainder ∷ State → ClauseEntry → Either Diagnostic (TyRow Open)
remainder state entry =
  maybe (missing entry) Right (remainderOf state.restricted entry.group)

missing ∷ ∀ a. ClauseEntry → Either Diagnostic a
missing entry = Left
  (problemAt (Internal "Clause without a group") entry.handler)

grownSince ∷ ClauseSignature → ClauseEntry → Boolean
grownSince now entry = maybe false (flip grew now) entry.signature
