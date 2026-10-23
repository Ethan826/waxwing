-- Rules 1, 1′ and 3 of T-R0a §5.3 (Task 4.1): what blocks a
-- whole-declaration Solved, the reason an Unresolved verdict carries,
-- computed from the attempts, and the `SearchFault`s they imply.
module Features.Check.Decide.Reason
  ( blocks
  , reason
  , searchFaults
  ) where

import Prelude
import Data.Array (all, filter, mapMaybe, nubEq, null)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Foldable (any)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe')
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (ReqAtom, Role(..), Var(..))
import Domain.Recorded.Origin (Entry, Path(..), PathRoot(..))
import Domain.Verdict
  ( Attempt(..)
  , Claim(..)
  , InferenceFailure(..)
  , LimitAt
  , LimitReached
  , RefuterEnd(..)
  , SearchEnd(..)
  , SearchFault(..)
  , StrategyName
  , UnresolvedReason(..)
  , Unsupport(..)
  )
import Domain.Verdict.Search (CheckRefusal(..))

-- What one attempt says to rule 3. A `RequirementOpen` refusal reads
-- as a decline (G-A-i(f), §3.2(a)), not as a refused candidate.
data Reading
  = Declines Unsupport
  | RanOut LimitReached
  | RefusedComplete
  | RefusedHeuristic
  | Searching
  | RefuterRanOut LimitReached
  | NotAStrategy

-- Rule 1: every `outside` kind (decided, Q3). Rule 1′: a `spread j`
-- with j ≥ 2 (decided, Q4). §3.2(a): `open`, the `BQ` atoms whose
-- meaning `ValidR` leaves open, from the injected detector.
blocks ∷ Array (Entry ReqAtom) → RecordedProblem → Array Unsupport
blocks open problem =
  nubEq (map outside view.outside) <> spread <> requirements
  where
  view = fields problem
  outside entry = Outside entry.value
  spread =
    if any secondSpread (Map.keys view.vars) then [ SecondSpread ]
    else []
  requirements = if null open then [] else [ RequirementAtoms ]

-- Rule 3. Blocked: the blocks and every decline. Otherwise, in T-R0a's
-- proposed order (G-A-i(b)): `Limit` unless a `ClaimsComplete`
-- candidate was refused; `Unsupported` if every strategy declined;
-- else `Inference`. With no strategy at all, nothing applies.
reason ∷ Array Unsupport → Array Attempt → UnresolvedReason
reason blocked attempts =
  maybe' (const (fromAttempts readings)) withDeclines
    (NonEmptyArray.fromArray blocked)
  where
  readings = map reading attempts
  withDeclines found = Unsupported
    (NonEmptyArray.nubEq (NonEmptyArray.appendArray found (declines readings)))

-- A refused `ClaimsComplete` candidate, or an untrusted search's own
-- broken invariant (G-Q13): neither stops the run.
searchFaults ∷ Array Attempt → Array SearchFault
searchFaults = mapMaybe searchFault

fromAttempts ∷ Array Reading → UnresolvedReason
fromAttempts readings =
  maybe' (const (unlimited readings)) Limit limited
  where
  limited =
    if any refusedComplete readings then Nothing
    else NonEmptyArray.fromArray (mapMaybe limitAt readings)

unlimited ∷ Array Reading → UnresolvedReason
unlimited readings =
  if null strategies then Inference NoStrategyApplies
  else if all declined strategies then
    maybe' (const (inference readings)) Unsupported
      (NonEmptyArray.fromArray (nubEq (declines strategies)))
  else inference readings
  where
  strategies = filter byStrategy readings

inference ∷ Array Reading → UnresolvedReason
inference readings
  | any refused readings = Inference NoAcceptedCertificate
  | otherwise = Inference NoCandidate

reading ∷ Attempt → Reading
reading = case _ of
  Declined _ why → Declines why
  Searched _ end → searchEnded end
  CheckFailed _ claim refusal → refusedWith claim refusal
  Accepted _ _ _ → Searching
  RefuterEnded _ end → refuterEnded end
  Shadow _ → NotAStrategy

searchEnded ∷ SearchEnd → Reading
searchEnded = case _ of
  Exhausted → Searching
  OutOfBudget limit → RanOut limit
  Broke _ → Searching

refusedWith ∷ Claim → CheckRefusal → Reading
refusedWith claim = case _ of
  RequirementOpen _ → Declines RequirementAtoms
  Unsatisfied _ → claimed claim

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

searchFault ∷ Attempt → Maybe SearchFault
searchFault = case _ of
  Declined _ _ → Nothing
  Searched name end → broke name end
  CheckFailed name claim refusal → candidate name claim refusal
  Accepted _ _ _ → Nothing
  RefuterEnded _ _ → Nothing
  Shadow _ → Nothing

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
declines = mapMaybe declined'
  where
  declined' = case _ of
    Declines why → Just why
    _ → Nothing

declined ∷ Reading → Boolean
declined = case _ of
  Declines _ → true
  _ → false

refusedComplete ∷ Reading → Boolean
refusedComplete = case _ of
  RefusedComplete → true
  _ → false

refused ∷ Reading → Boolean
refused = case _ of
  RefusedComplete → true
  RefusedHeuristic → true
  _ → false

byStrategy ∷ Reading → Boolean
byStrategy = case _ of
  RefuterRanOut _ → false
  NotAStrategy → false
  _ → true

secondSpread ∷ Var → Boolean
secondSpread = case _ of
  FreshVar _ (Spread index) → index >= 2
  FreshVar _ _ → false
  RigidVar _ → false
