-- A sound rule's constructor (T-R0a §5.2; ruling R7). Only
-- Features.Check.Refute.Rules imports this module, and it exports the
-- type alone (scripts/structure.mjs). A rule names its theorem, a
-- `TheoremRef` that only the hidden registry Refute.Theorems can make,
-- so production can neither build a rule nor inject one; tests mint one
-- through this module's compiled JS (test/r0-stubs.mjs).
module Features.Check.Refute.Rules.Internal (SoundRule(..)) where

import Data.Maybe (Maybe)
import Domain.Verdict (Derivation, RuleName, TheoremRef)
import Features.Check.Refute.Sig (SigProblem)

-- Data rather than T-R0a's newtype, so that no `coerce` reaches it and
-- its compiled form keeps a constructor. `apply` is C1-T's rule on a
-- prefix (CX refute/statements.md §5); its theorem is proved, never
-- pending.
data SoundRule = SoundRule
  { name ∷ RuleName
  , theorem ∷ TheoremRef
  , apply ∷ SigProblem → Maybe Derivation
  }
