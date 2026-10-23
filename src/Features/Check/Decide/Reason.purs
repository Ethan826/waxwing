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
import Domain.Recorded.Origin (Entry)
import Domain.Verdict
  ( Attempt
  , InferenceFailure(..)
  , SearchFault
  , UnresolvedReason(..)
  , Unsupport(..)
  )
import Features.Check.Decide.Reading
  ( Reading
  , byStrategy
  , declined
  , declines
  , limitAt
  , reading
  , refused
  , refusedComplete
  , searchFault
  )

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

secondSpread ∷ Var → Boolean
secondSpread = case _ of
  FreshVar _ (Spread index) → index >= 2
  FreshVar _ _ → false
  RigidVar _ → false
