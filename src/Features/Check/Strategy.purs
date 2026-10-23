-- The strategy value (T-R0a §4.1; Task 4.1). A spec gives a guard, an
-- untrusted search, a trusted check and a witness adapter; `strategy`
-- composes them in that fixed order and is the only way to make a
-- `Strategy`. The certificate type is closed over, so `decide` holds
-- strategies of different formats in one array. Only `check` yields a
-- `Valid`; a wrong search costs completeness, never soundness.
module Features.Check.Strategy
  ( Guarded(..)
  , Ran
  , Search(..)
  , Strategy
  , StrategySpec
  , runStrategy
  , strategy
  ) where

import Prelude
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..))
import Domain.Recorded (RecordedProblem)
import Domain.Verdict
  ( Assurance
  , Attempt(..)
  , Claim
  , Compilation
  , InternalFault(..)
  , LimitReached(..)
  , SearchEnd(..)
  , Solution
  , StrategyName
  , Unsupport
  , Valid
  )
import Domain.Verdict.Search (Budget, CheckRefusal, SearchHint)

type StrategySpec cert =
  { name ∷ StrategyName
  , sound ∷ Assurance
  , guard ∷ RecordedProblem → Guarded
  , search ∷ Budget → RecordedProblem → Search cert
  , check ∷ RecordedProblem → cert → Either CheckRefusal Valid
  , witness ∷ RecordedProblem → cert → Compilation
  }

data Guarded = InScope | OutOfScope Unsupport

-- `Inconsistent`: the state the search reads beside the problem (an
-- injected context or table) disagrees with it, as a declaration the
-- problem names but the context lacks. That is not the search's own
-- failure (`NoCandidate (Broke …)`, which never stops the run; G-Q13),
-- so it stops the run as `BrokenInvariant` (ruling R10 (iii)).
data Search cert
  = Candidate cert Claim (Array SearchHint)
  | NoCandidate SearchEnd (Array SearchHint)
  | Inconsistent String

-- One strategy's run: its attempt, its hints, and the solution its
-- acceptance gives. T-R0a's `run` returns the attempt alone; `decide`
-- also needs the hints (rule 2 seeds refuters with them) and the
-- assurance a Solution carries.
type Ran =
  { attempt ∷ Attempt
  , hints ∷ Array SearchHint
  , solution ∷ Maybe Solution
  }

newtype Strategy = Strategy
  (Budget → RecordedProblem → Either InternalFault Ran)

strategy ∷ ∀ cert. StrategySpec cert → Strategy
strategy spec = Strategy (attempt spec)

runStrategy
  ∷ Budget → RecordedProblem → Strategy → Either InternalFault Ran
runStrategy budget problem (Strategy run) = run budget problem

-- A declining guard ends the attempt before the search. With no fuel
-- left, the search is not called: the attempt ran out of budget.
attempt
  ∷ ∀ cert
  . StrategySpec cert
  → Budget
  → RecordedProblem
  → Either InternalFault Ran
attempt spec budget problem = case spec.guard problem of
  OutOfScope reason → Right (unsolved (Declined spec.name reason) [])
  InScope
    | budget.fuel <= 0 → Right (unsolved spent [])
    | otherwise → searched spec problem (spec.search budget problem)
  where
  spent = Searched spec.name (OutOfBudget (StrategyBudget spec.name))

searched
  ∷ ∀ cert
  . StrategySpec cert
  → RecordedProblem
  → Search cert
  → Either InternalFault Ran
searched spec problem = case _ of
  Candidate cert claim hints → Right (checked spec problem cert claim hints)
  NoCandidate end hints → Right (unsolved (Searched spec.name end) hints)
  Inconsistent what → Left (BrokenInvariant what)

-- Only the check decides; a refusal is an attempt and the run goes on.
checked
  ∷ ∀ cert
  . StrategySpec cert
  → RecordedProblem
  → cert
  → Claim
  → Array SearchHint
  → Ran
checked spec problem cert claim hints =
  either refused accepted (spec.check problem cert)
  where
  refused refusal = unsolved (CheckFailed spec.name claim refusal) hints
  accepted validity =
    { attempt: Accepted spec.name validity compilation
    , hints
    , solution: Just
        { strategy: spec.name
        , validity
        , assurance: spec.sound
        , compilation
        }
    }
  compilation = spec.witness problem cert

unsolved ∷ Attempt → Array SearchHint → Ran
unsolved made hints = { attempt: made, hints, solution: Nothing }
