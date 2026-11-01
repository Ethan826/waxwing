-- What one attempt says to rule 3 (T-R0a §5.3; Tasks 4.1, 4.2), split
-- from Features.Check.Decide.Reason. Every classifier names each
-- constructor it reads: no wildcard arm carries a meaning, so a new
-- constructor fails to compile here instead of being counted silently
-- (Task 4.1's review, carried to Task 4.2).
module Features.Check.Decide.Reading
  ( Reading(..)
  , byStrategy
  , declined
  , declines
  , limitAt
  , reading
  , refused
  , refusedComplete
  , searchFault
  ) where

import Data.Array (mapMaybe)
import Data.Maybe (Maybe(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Verdict
  ( Attempt(..)
  , Claim(..)
  , LimitAt
  , LimitReached
  , RefuterEnd(..)
  , SearchEnd(..)
  , SearchFault(..)
  , StrategyName
  , Unsupport(..)
  )
import Domain.Verdict.Search (CheckRefusal(..), Limitation(..))

-- A `RequirementOpen` refusal reads as a decline (G-A-i(f), §3.2(a)),
-- not as a refused candidate.
data Reading
  = Declines Unsupport
  | RanOut LimitReached
  | RefusedComplete
  | RefusedHeuristic
  | Searching
  | RefuterRanOut LimitReached
  | NotAStrategy

reading ∷ Attempt → Reading
reading = case _ of
  Declined _ why → Declines why
  Searched _ end → searchEnded end
  CheckFailed _ claim refusal → refusedWith claim refusal
  Accepted _ _ _ → Searching
  RefuterEnded _ end → refuterEnded end
  Shadow _ → NotAStrategy

-- A refused `ClaimsComplete` candidate, or an untrusted search's own
-- broken invariant (G-Q13): neither stops the run.
searchFault ∷ Attempt → Maybe SearchFault
searchFault = case _ of
  Declined _ _ → Nothing
  Searched name end → broke name end
  CheckFailed name claim refusal → candidate name claim refusal
  Accepted _ _ _ → Nothing
  RefuterEnded _ _ → Nothing
  Shadow _ → Nothing

-- A budget limit has no node of its own: it is the declaration's,
-- sited at its body's root.
limitAt ∷ Reading → Maybe LimitAt
limitAt = case _ of
  RanOut limit → Just (atBody limit)
  RefuterRanOut limit → Just (atBody limit)
  Declines _ → Nothing
  RefusedComplete → Nothing
  RefusedHeuristic → Nothing
  Searching → Nothing
  NotAStrategy → Nothing
  where
  atBody limit = { limit, site: Path { root: InBody, steps: [] } }

declines ∷ Array Reading → Array Unsupport
declines = mapMaybe declinedWith

declined ∷ Reading → Boolean
declined = case _ of
  Declines _ → true
  RanOut _ → false
  RefusedComplete → false
  RefusedHeuristic → false
  Searching → false
  RefuterRanOut _ → false
  NotAStrategy → false

refusedComplete ∷ Reading → Boolean
refusedComplete = case _ of
  RefusedComplete → true
  Declines _ → false
  RanOut _ → false
  RefusedHeuristic → false
  Searching → false
  RefuterRanOut _ → false
  NotAStrategy → false

refused ∷ Reading → Boolean
refused = case _ of
  RefusedComplete → true
  RefusedHeuristic → true
  Declines _ → false
  RanOut _ → false
  Searching → false
  RefuterRanOut _ → false
  NotAStrategy → false

-- Whether the attempt is a strategy's: rule 3's "every strategy
-- declined" ranges over these alone.
byStrategy ∷ Reading → Boolean
byStrategy = case _ of
  Declines _ → true
  RanOut _ → true
  RefusedComplete → true
  RefusedHeuristic → true
  Searching → true
  RefuterRanOut _ → false
  NotAStrategy → false

declinedWith ∷ Reading → Maybe Unsupport
declinedWith = case _ of
  Declines why → Just why
  RanOut _ → Nothing
  RefusedComplete → Nothing
  RefusedHeuristic → Nothing
  Searching → Nothing
  RefuterRanOut _ → Nothing
  NotAStrategy → Nothing

searchEnded ∷ SearchEnd → Reading
searchEnded = case _ of
  Exhausted → Searching
  OutOfBudget limit → RanOut limit
  Broke _ → Searching

-- G0's refusals other than `RequirementOpen` are refused candidates;
-- `RequirementUnjudged` among them, so a guard/check disagreement on a
-- `ClaimsComplete` candidate is visible as a `CandidateRefused` fault.
-- A2's (spec §6): a record defect and a limitation decline, so they
-- raise no fault; `Malformed` and `ObligationFailed` are refused.
refusedWith ∷ Claim → CheckRefusal → Reading
refusedWith claim = case _ of
  RequirementOpen _ → Declines RequirementAtoms
  Unsatisfied _ → claimed claim
  Undefined _ → claimed claim
  NotEntailed _ → claimed claim
  RequirementFails _ → claimed claim
  RequirementUnjudged _ → claimed claim
  NotGeneric → claimed claim
  RecordDefect at → Declines (RecordDefective at.provenance)
  Malformed _ → claimed claim
  NotCertifiable limitation _ → Declines (limited limitation)
  ObligationFailed _ → claimed claim

-- A recorded unsupported kind is rule 1's `EffectsUnchecked`; the
-- candidate-dependent limitations are `EffectLimit`.
limited ∷ Limitation → Unsupport
limited = case _ of
  UnsupportedRecorded kind → EffectsUnchecked [ kind ]
  RigidExact → EffectLimit RigidExact
  ForcedTail → EffectLimit ForcedTail

claimed ∷ Claim → Reading
claimed = case _ of
  ClaimsComplete → RefusedComplete
  Heuristic → RefusedHeuristic

refuterEnded ∷ RefuterEnd → Reading
refuterEnded = case _ of
  NoCounterInstance (OutOfBudget limit) → RefuterRanOut limit
  NoCounterInstance Exhausted → NotAStrategy
  NoCounterInstance (Broke _) → NotAStrategy
  CXRefused _ → NotAStrategy

broke ∷ StrategyName → SearchEnd → Maybe SearchFault
broke name = case _ of
  Broke what → Just (SearchBroke name what)
  Exhausted → Nothing
  OutOfBudget _ → Nothing

candidate ∷ StrategyName → Claim → CheckRefusal → Maybe SearchFault
candidate name claim refusal =
  if refusedComplete (refusedWith claim refusal) then
    Just (CandidateRefused name refusal)
  else Nothing
