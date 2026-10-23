-- How `decide` runs a refuter (T-R0a §5.1, §5.3 rule 2; Task 4.1), and
-- the shadow refuter, Q10's second constructor (`trustedRefuter` is in
-- Features.Check.Refute.Rules).
--
-- Seeding. A refuter's search runs once with no hint and once with each
-- hint alone, in canonical order, each on the whole budget, and the
-- first counter-instance its check accepts is taken. So the search is
-- monotone in its hints whatever it does with several: adding a hint
-- (which adding a strategy may do) adds a run and removes none, and a
-- counter-instance found without it is still found (AT7's premise,
-- test/r0-order.test.mjs). Canonical sorting alone would not give this.
--
-- Ending. The spec's search returns `Maybe CX`, which cannot tell an
-- exhausted search from a spent budget, so `Nothing` on every run is
-- `NoCounterInstance Exhausted`. A refuter therefore never contributes
-- `Limit` to rule 3; T-R0a §5.1 fixes the search's type.
--
-- Fuel (Task 4.3, documented, not changed). A strategy with no fuel is
-- not searched (Features.Check.Strategy); a refuter's search still runs
-- and is given the budget to respect. Skipping it would need a refuter
-- `LimitReached` that Domain.Verdict does not have, and its end could
-- still not say "spent" through `Maybe CX`: an open question for the
-- author and T-R0a's owner (test/r0-online-carries.test.mjs).
module Features.Check.Decide.Refuters
  ( ShadowRefuter
  , canonical
  , refute
  , shadowRefuter
  , shadowRecord
  ) where

import Prelude
import Data.Array (cons, findMap, mapMaybe, nub, singleton, sort)
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..), maybe')
import Domain.Recorded (RecordedProblem)
import Domain.Verdict
  ( CX
  , RefuterEnd(..)
  , Refuted
  , SearchEnd(..)
  , ShadowRecord
  , StatementRef
  )
import Domain.Verdict.Open (RefuteRefusal)
import Domain.Verdict.Search (Budget, SearchHint)
import Features.Check.Refute.Rules (Refuter, RefuterSpec, refuterParts)

-- A refuter whose `RefuteSound` is not proved runs only in shadow: its
-- result is a `Shadow` record, never evidence (§5.1, Q10).
newtype ShadowRefuter = ShadowRefuter
  { awaits ∷ StatementRef, spec ∷ RefuterSpec }

type Searching = Budget → Array SearchHint → RecordedProblem → Maybe CX

shadowRefuter ∷ StatementRef → RefuterSpec → ShadowRefuter
shadowRefuter awaits spec = ShadowRefuter { awaits, spec }

-- The hints as a set in canonical order.
canonical ∷ Array SearchHint → Array SearchHint
canonical hints = sort (nub hints)

-- A trusted refuter: its `Refuted`, or how it ended.
refute
  ∷ Budget
  → Array SearchHint
  → RecordedProblem
  → Refuter
  → Either RefuterEnd Refuted
refute budget hints problem refuter =
  seeded parts.search (parts.confirm problem) budget hints problem
  where
  parts = refuterParts refuter

shadowRecord
  ∷ Budget
  → Array SearchHint
  → RecordedProblem
  → ShadowRefuter
  → ShadowRecord
shadowRecord budget hints problem (ShadowRefuter shadow) =
  { refuter: shadow.spec.name
  , awaits: shadow.awaits
  , result:
      seeded shadow.spec.search (shadow.spec.check problem) budget hints
        problem
  }

-- Every seed's counter-instance goes to the check; the first accepted
-- wins, else the first refusal is reported.
seeded
  ∷ ∀ a
  . Searching
  → (CX → Either RefuteRefusal a)
  → Budget
  → Array SearchHint
  → RecordedProblem
  → Either RefuterEnd a
seeded search confirm budget hints problem =
  maybe' noneAccepted Right (findMap accepted checks)
  where
  seeds = cons [] (map singleton (canonical hints))
  checks = map confirm (mapMaybe found seeds)
  found seed = search budget seed problem
  accepted = either (const Nothing) Just
  noneAccepted _ = Left
    (maybe' nothingFound CXRefused (findMap refused checks))
  refused = either Just (const Nothing)
  nothingFound _ = NoCounterInstance Exhausted
