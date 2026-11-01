-- What a strategy's or refuter's run reads and leaves besides the
-- verdict (T-R0a §4.1-§4.3; Task 4.1): the injected budget, a search's
-- hints and a check's refusal. They were uninhabited in
-- Domain.Verdict.Open until Task 4.1 gave them representations here.
module Domain.Verdict.Search
  ( Applied(..)
  , Budget
  , CheckAt
  , CheckRefusal(..)
  , Limitation(..)
  , MalformedReason(..)
  , PackageKey(..)
  , SearchHint(..)
  ) where

import Prelude
import Domain.Recorded (AtomId)
import Domain.Recorded.Atom (Var)
import Domain.Recorded.Effect
  ( EVar
  , Position
  , Provenance
  , UnsupportedKind
  )
import Domain.Row (EffectRef)
import Domain.Type (TypeId)

-- §4.3: fuel, a depth bound and a key bound. Each strategy and each
-- refuter search receives the whole value, and nothing it spends is
-- passed on, so no bound is shared between attempts (an
-- order-independence condition of §5.3).
type Budget = { fuel ∷ Int, depth ∷ Int, keys ∷ Int }

-- Advisory text a search leaves (§4.2): never a reason, never evidence.
-- Ordered, so `decide` hands refuters the hints sorted canonically.
data SearchHint = SearchHint String

-- A strategy check's refusal of a candidate (§4.1).
data CheckRefusal
  -- A `BQ` atom whose meaning `ValidR` leaves open under the candidate
  -- (§3.2(a), G-A-i(f)): read as a decline, never a `SearchFault`.
  = RequirementOpen AtomId
  -- An atom the candidate does not satisfy: an equation whose sides
  -- differ, or `ff`.
  | Unsatisfied AtomId
  -- A record in the atom whose composition `D` does not make defined
  -- under the candidate (a label twice, a tail not entailed to lack a
  -- field, two tails not entailed disjoint).
  | Undefined AtomId
  -- A `lacks` or `disjoint` atom `D` does not entail under the candidate.
  | NotEntailed AtomId
  -- A `BQ` atom the ground rule judges false under the candidate: never
  -- a `Contradiction`, since the binding is the candidate's (AT19).
  | RequirementFails AtomId
  -- A `BQ` atom the guard admitted that the check cannot judge (a
  -- backstop: guard and check disagree, which Task 4.3's RT8 counts as
  -- a defect).
  | RequirementUnjudged AtomId
  -- The candidate is not a generic substitution: it binds a rigid
  -- variable, binds a row variable to a non-record, or is not
  -- idempotent.
  | NotGeneric
  -- A2 (spec §6): the recorded problem breaks a record invariant (step
  -- 0, §4.1) at check j of that obligation; candidate-independent.
  | RecordDefect CheckAt
  -- The package breaks an I3 domain or form fact (§4.2, §5 (a)-(j)).
  | Malformed MalformedReason
  -- An obligation the validator cannot certify under a stated
  -- limitation, at check j.
  | NotCertifiable Limitation CheckAt
  -- A recorded obligation the package fails, at its check j.
  | ObligationFailed CheckAt

-- An obligation's provenance and the index of its violated check (§5).
type CheckAt = { provenance ∷ Provenance, check ∷ Int }

-- A key of one of the package's four maps (spec §2.2).
data PackageKey
  = KeyType Var
  | KeyRow Var
  | KeyEffect EVar
  | KeyMark Position

-- I3's reasons (spec §4.2, §5's checks (a)-(j)), each naming its key;
-- (k), an application the declared arities lack or count otherwise
-- (§18.148 (1)), naming its key and the application's head.
data MalformedReason
  = BindsForced EVar
  | WrongSort PackageKey
  | MissingKey PackageKey
  | ExtraKey PackageKey
  | NonCanonical PackageKey
  | UnknownMark PackageKey String
  | NotN PackageKey
  | HoleTwoSorts Int
  | UnsolvedImage PackageKey
  | KeylessFail PackageKey
  | Undeclared PackageKey Applied
  | WrongArity PackageKey Applied

-- An application's head: an effect label's effect or a data type.
data Applied = AppliedEffect EffectRef | AppliedData TypeId

-- Why an obligation is not certifiable (spec §6): a recorded
-- unsupported kind, a rigid-tailed exact obligation, or a dependency on
-- a forced tail (§5.1).
data Limitation
  = UnsupportedRecorded UnsupportedKind
  | RigidExact
  | ForcedTail

derive instance eqSearchHint ∷ Eq SearchHint
derive instance ordSearchHint ∷ Ord SearchHint
derive instance eqPackageKey ∷ Eq PackageKey
derive instance ordPackageKey ∷ Ord PackageKey
derive instance eqApplied ∷ Eq Applied
derive instance eqMalformedReason ∷ Eq MalformedReason
derive instance eqLimitation ∷ Eq Limitation
derive instance eqCheckRefusal ∷ Eq CheckRefusal
