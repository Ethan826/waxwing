-- The tokens only trusted checkers mint (T-R0a §3.1, §3.3, §3.4, §6). The
-- constructors are visible only to the modules scripts/structure.mjs
-- allows: Features.Check.Strategy.Substitution (G0's check),
-- Features.Check.Refute.Rules (`checkDerivation`, `trustedRefuter`) and
-- Features.Check.Admit.Forcedness.Check (the forcedness check), and to
-- Domain.Verdict, which imports the types alone to re-export them.
module Domain.Verdict.Internal
  ( CX
  , ForcednessEvidence(..)
  , NonForced(..)
  , Refuted(..)
  , Valid(..)
  ) where

import Data.Array.NonEmpty (NonEmptyArray)
import Domain.Recorded (AtomId)
import Domain.Recorded.Atom (OutsideKind)
import Domain.Verdict.Open
  ( Alternative
  , CXSubst
  , NonForcednessEvidence
  , RigidAssignment
  )

-- One injected checker accepted the problem, nothing more (T-R0a §3.3),
-- with the outside kinds its candidate's substituted terms expose (Scope
-- A, dossier §18.198; Features.Check.Strategy.Exposed). Rule 1 blocks
-- Solved on a non-empty list as on a marker.
data Valid = Valid (Array OutsideKind)

-- CX's certificate at base B ⊕ Nat, with the sub-body it refutes (§3.4).
type CX = { rho ∷ CXSubst, body ∷ NonEmptyArray AtomId }

-- A counter-instance that passed CX's check (ground 2). Only a trusted
-- refuter, given a proved theorem, wraps one (§5.1).
newtype Refuted = Refuted CX

-- A split is not forced (§6). Syntactic difference alone never makes one.
data NonForced
  = Alternatives
      { at ∷ RigidAssignment
      , one ∷ Alternative
      , other ∷ Alternative
      }
  | NonForcedness NonForcednessEvidence

-- A split is forced. Its payload is gate G-forced's (§6, open there).
data ForcednessEvidence = ForcednessEvidence
