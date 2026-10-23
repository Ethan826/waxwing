-- One declaration's outcome under generate-then-decide (T-R0a §3.2-§3.5,
-- §4.1, §5.1). Data only: Features decide it, Format renders it. The
-- tokens Valid and Refuted, and `TheoremRef` (Task 5.1), are re-exported
-- as types without constructors (scripts/structure.mjs). Admission's
-- types are in Domain.Verdict.Admission, the static refusals
-- (re-exported here) in Domain.Verdict.Static;
-- `DeclReport` and `Report` (§7) are Task 1.2's, in Features, because their
-- shadow-phase slot holds today's checker state (ruling R2).
module Domain.Verdict
  ( module Exports
  , Assurance(..)
  , Attempt(..)
  , Claim(..)
  , Compilation(..)
  , DeclOutcome(..)
  , Decision
  , Derivation
  , EmissionFault(..)
  , Evidence(..)
  , FunctionName(..)
  , InferenceFailure(..)
  , InternalFault(..)
  , Key
  , LimitAt
  , LimitReached(..)
  , NoWitnessReason(..)
  , RefuterEnd(..)
  , RefuterName(..)
  , RuleName(..)
  , SearchEnd(..)
  , SearchFault(..)
  , ShadowRecord
  , Solution
  , StatementRef(..)
  , StrategyName(..)
  , Unresolved
  , UnresolvedReason(..)
  , Unsupport(..)
  , Verdict(..)
  ) where

import Prelude (class Eq, Void)
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Either (Either)
import Domain.Recorded (AtomId, OutsideKind, RecordedProblem)
import Domain.Type (Ty)
import Domain.Verdict.Internal
  ( CX
  , ForcednessEvidence
  , NonForced
  , Refuted
  , Valid
  ) as Exports
import Domain.Verdict.Static
  ( PolicyCode(..)
  , Site
  , StaticCode(..)
  , StaticRefusal(..)
  ) as Exports
import Domain.Verdict.Static (Site, StaticRefusal)
import Domain.Verdict.Theorem.Internal (TheoremRef) as Exports
import Domain.Verdict.Theorem.Internal (TheoremRef)
import Domain.Verdict.Unsound (Unsound)
import Domain.Verdict.Open (CheckedCX, Question, RefuteRefusal, Witness)
import Domain.Verdict.Search (CheckRefusal, SearchHint)

-- One per declaration, in declaration order; each keeps its problem.
data DeclOutcome
  = Refused (NonEmptyArray StaticRefusal) RecordedProblem -- classes a, b′
  | Decided RecordedProblem Decision
  | Faulted RecordedProblem InternalFault

type Decision =
  { verdict ∷ Verdict
  , attempts ∷ Array Attempt
  , searchFaults ∷ Array SearchFault
  }

data Verdict
  = Solved Solution
  | Contradiction Evidence
  | Unresolved Unresolved

type Solution =
  { strategy ∷ StrategyName
  , validity ∷ Exports.Valid
  , assurance ∷ Assurance
  , compilation ∷ Compilation
  }

-- A strategy's Sound_F, proved or awaiting proof (always labelled).
data Assurance = Proved TheoremRef | Pending StatementRef

-- W §1.6, adopted as defined.
data Compilation = Witnessed Witness | NoWitness NoWitnessReason

-- W §1.6's reasons, each with its owner: a non-constructive strategy's
-- (Task 4.1, AT9). `AdapterUnsupported` and `HoleContract` join with
-- their adapters (Tasks 4.4, 6.1).
data NoWitnessReason = NonConstructive StrategyName

data Evidence
  = ByRule Derivation -- ground (1)
  | ByCounterInstance Exports.Refuted -- ground (2)

-- A sound rule applied to the whole D and original B atoms. The rule is
-- named, not held: the registry entry is a Features value that Domain
-- cannot name, and `checkDerivation` looks it up in the injected rules.
type Derivation =
  { rule ∷ RuleName
  , premises ∷ NonEmptyArray AtomId
  , blame ∷ Array Site
  }

type Unresolved =
  { reason ∷ UnresolvedReason
  , hints ∷ Array SearchHint
  }

-- Decision 9's three families, and only those.
data UnresolvedReason
  = Inference InferenceFailure
  | Unsupported (NonEmptyArray Unsupport)
  | Limit (NonEmptyArray LimitAt)

data InferenceFailure
  = NoStrategyApplies
  | NoCandidate
  | NoAcceptedCertificate

data Unsupport
  = Outside OutsideKind
  | RequirementAtoms
  | GuardOutsideFragment StrategyName
  | SeveralTailSubtraction
  | SecondSpread
  | ClassF Question

type LimitAt = { limit ∷ LimitReached, site ∷ Site }

data LimitReached
  = InferredTypeDepth Int
  | SpecializationKeys Int -- lowering only
  | ReexaminationSteps
  | StrategyBudget StrategyName

-- Stops the declaration's run: a trusted component failed or an invariant
-- broke. A separate outcome, `Faulted`, never an Unresolved reason.
data InternalFault
  = BothVerdicts StrategyName Evidence
  | DerivationRefused RuleName Unsound
  | BrokenInvariant String

-- Found at emission, after a Solved verdict; blocks emission only.
data EmissionFault = ReCheckFailed FunctionName Key

-- A specialization key as Domain sees it: the declaration's id and its
-- ground type arguments. The specializer's own key holds IR types, which
-- Domain may not import; Task 6.4 builds this view from it (ruling R11).
type Key =
  { declaration ∷ Int
  , function ∷ Boolean
  , effect ∷ Boolean
  , arguments ∷ Array (Ty Void)
  }

-- A suspected defect of an untrusted search that did not stop the run:
-- a `ClaimsComplete` candidate its check refused, or a failure confined
-- to the search's own code (G-Q13, confirmed by dossier §18.71 item 2).
data SearchFault
  = CandidateRefused StrategyName CheckRefusal
  | SearchBroke StrategyName String

data Attempt
  = Declined StrategyName Unsupport
  | Searched StrategyName SearchEnd
  | CheckFailed StrategyName Claim CheckRefusal
  | Accepted StrategyName Exports.Valid Compilation
  | RefuterEnded RefuterName RefuterEnd
  | Shadow ShadowRecord

-- `Broke`: the search's own code failed (ruling R10). Its partial result
-- is discarded; no exception is caught to produce it.
data SearchEnd
  = Exhausted
  | OutOfBudget LimitReached
  | Broke String

-- What an untrusted search says of its candidate.
data Claim = ClaimsComplete | Heuristic

data RefuterEnd
  = NoCounterInstance SearchEnd
  | CXRefused RefuteRefusal

-- Research evidence in the attempt log; never `Evidence`.
type ShadowRecord =
  { refuter ∷ RefuterName
  , awaits ∷ StatementRef
  , result ∷ Either RefuterEnd CheckedCX
  }

-- Canonical names (T-R0a §4.1); a constructor per strategy as each lands.
data StrategyName = OnlineSolver

newtype RuleName = RuleName String

newtype RefuterName = RefuterName String

newtype StatementRef = StatementRef String

newtype FunctionName = FunctionName String

derive instance eqStrategyName ∷ Eq StrategyName

-- `decide` lists each reason once (§5.3 rule 3).
derive instance eqUnsupport ∷ Eq Unsupport
