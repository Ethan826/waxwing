-- trusted surface: every diff needs token review; see docs/engineering.md
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
import Data.Foldable (class Foldable, any, fold, foldMap)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe, maybe')
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (ReqAtom, Role(..), Var(..))
import Domain.Recorded.Effect (Obligation, Placed, UnsupportedKind)
import Domain.Recorded.Effect as Recorded
import Domain.Recorded.Origin (Entry)
import Domain.Verdict.Search (CheckAt)
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
import Features.Check.Strategy.Effects.Record (recordDefect)

-- A2's record defect first (spec §6), then rule 1 and 1′ and §3.2(a),
-- then the unchecked effects below.
blocks ∷ Array (Entry ReqAtom) → RecordedProblem → Array Unsupport
blocks open problem =
  defective problem <> ordinary open problem <> unchecked problem

-- A2 spec §4.1 and §6: record validation before any search. A problem
-- that breaks a record invariant blocks Solved whatever a strategy
-- offers, and is reported even when no strategy offers a candidate
-- (C4(b)). It reads the problem alone, as `certify`'s step 0 does.
defective ∷ RecordedProblem → Array Unsupport
defective problem = maybe [] defect (recordDefect problem)
  where
  defect ∷ CheckAt → Array Unsupport
  defect at = [ RecordDefective at.provenance ]

-- Rule 1: every `outside` kind (decided, Q3). Rule 1′: a `spread j`
-- with j ≥ 2 (decided, Q4). §3.2(a): `open`, the `BQ` atoms whose
-- meaning `ValidR` leaves open, from the injected detector.
ordinary ∷ Array (Entry ReqAtom) → RecordedProblem → Array Unsupport
ordinary open problem =
  nubEq (map outside view.outside) <> spread <> requirements
  where
  view = fields problem
  outside entry = Outside entry.value
  spread =
    if any secondSpread (Map.keys view.vars) then [ SecondSpread ]
    else []
  requirements = if null open then [] else [ RequirementAtoms ]

-- Rule 1 also blocks a problem that records an `Unsupported` obligation
-- (FX032: an operation's `with` row), known from the problem before any
-- search (a-min statements §7, "Routing"): `EffectsUnchecked` names each
-- unsupported kind once.
unchecked ∷ RecordedProblem → Array Unsupport
unchecked problem = if null kinds then [] else [ EffectsUnchecked kinds ]
  where
  kinds = nubEq (mapMaybe unsupported (fields problem).effects.obligations)

unsupported ∷ Placed Obligation → Maybe UnsupportedKind
unsupported placed = case placed.value of
  Recorded.Unsupported kind → Just kind
  _ → Nothing

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
  withDeclines found =
    Unsupported (NonEmptyArray.nubEq (merged (withAll found)))
  withAll found = NonEmptyArray.appendArray found (declines readings)

-- R034 (2): an `Unsupported` reason names each unsupported kind once,
-- as `unchecked` does. Every `EffectsUnchecked` among the blocks and
-- declines becomes one with the union of all their kinds, in first
-- occurrence order (the join of the powerset semilattice); the `nubEq`
-- after it keeps the first, so one entry stands at the first one's
-- place. Every other entry keeps its place, and an `EffectsUnchecked []`
-- still counts as an entry.
merged ∷ ∀ f. Functor f ⇒ Foldable f ⇒ f Unsupport → f Unsupport
merged entries = map joined entries
  where
  kinds = nubEq (foldMap (fold <<< uncheckedKinds) entries)
  joined entry =
    maybe entry (const (EffectsUnchecked kinds)) (uncheckedKinds entry)

-- No wildcard: a new `Unsupport` fails to compile until it is placed.
uncheckedKinds ∷ Unsupport → Maybe (Array UnsupportedKind)
uncheckedKinds = case _ of
  EffectsUnchecked found → Just found
  Outside _ → Nothing
  RequirementAtoms → Nothing
  GuardOutsideFragment _ → Nothing
  SeveralTailSubtraction → Nothing
  SecondSpread → Nothing
  ClassF _ → Nothing
  RecordDefective _ → Nothing
  EffectLimit _ → Nothing
  EffectsUnread _ → Nothing

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
      (NonEmptyArray.fromArray (nubEq (merged (declines strategies))))
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
