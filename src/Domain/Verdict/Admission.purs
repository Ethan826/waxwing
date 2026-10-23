-- The boundary to admission and lowering (T-R0a §6). A compilation refusal
-- never changes the verdict or the recorded problem. `NonForced` and
-- `ForcednessEvidence` reach this module as types only, through
-- Domain.Verdict: only the forcedness `check` mints either.
module Domain.Verdict.Admission
  ( Admission(..)
  , AdmissibilityRefusal(..)
  , AdmittedStatus(..)
  , CheckedForcedness(..)
  , CompileRefusal(..)
  , Forcedness(..)
  , ForcednessPolicy
  , PolicyRefusal(..)
  , SupportRefusal(..)
  ) where

import Data.Array.NonEmpty (NonEmptyArray)
import Data.Either (Either)
import Data.Maybe (Maybe)
import Domain.Recorded (CallSite, RecordedProblem)
import Domain.Verdict
  ( ForcednessEvidence
  , FunctionName
  , LimitAt
  , NoWitnessReason
  , NonForced
  , Site
  , Solution
  )
import Domain.Verdict.Open
  ( Construct
  , ForcednessClaim
  , ForcednessRefusal
  , SplitJudgement
  )
import Domain.Verdict.Witness (Witness)

data Admission
  = Admitted
      { witness ∷ Witness
      , splits ∷ SplitJudgement
      , status ∷ AdmittedStatus
      }
  | NotCompiled (NonEmptyArray CompileRefusal)
  | NotJudged -- not Solved; nothing to admit

-- W's AdmStatus without Inadmissible, which goes through `AtA`.
data AdmittedStatus = Admissible | AdmittedPendingR019

-- T-R0e's layers: policy, admissibility, support.
data CompileRefusal
  = AtP PolicyRefusal
  | AtA AdmissibilityRefusal
  | AtS SupportRefusal

-- Decision 3, per split site. No G3 constructor while G3 is held.
data PolicyRefusal
  = SplitUnforced CallSite NonForced
  | ForcednessUndecided CallSite

data AdmissibilityRefusal
  = Inadmissible CallSite Int -- the callee's VarId of the failing slot
  | ComponentBlocked FunctionName

data SupportRefusal
  = NotLowerable Construct Site
  | NoCompilation NoWitnessReason
  | AdmissionLimit LimitAt

-- An untrusted search, which candidate solutions may seed, and a trusted
-- check, which reads no Solution and alone mints an answer (Task 6.3).
type ForcednessPolicy =
  { search ∷ RecordedProblem → Site → Array Solution → Maybe ForcednessClaim
  , check ∷
      RecordedProblem
      → Site
      → ForcednessClaim
      → Either ForcednessRefusal CheckedForcedness
  }

data CheckedForcedness
  = Forced ForcednessEvidence
  | NotForced NonForced

-- P's answer at one split site: `Undecided` when search finds nothing or
-- check refuses its claim.
data Forcedness = Checked CheckedForcedness | Undecided
