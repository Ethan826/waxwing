/- Further proposals from completeness review; no proofs or new solver. -/
import Composition.Sig.SliceDefs

namespace Composition.Syntax

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- P9s counterpart of S1r: all of D and the rigid lists are retained.
Scoped restricts this refinement to declared rigid hypotheses. -/
def S1rAcc (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) S, Scoped P → IsFlexSlicing P S →
    (Accepts P ↔ ∀ Q ∈ S, Accepts Q)

/-- Relevance for a supplied flexible-only slicing; keeping all rigid
rows can retain extra pairs, but dropping D here is not licensed. -/
def flexRelevantPairs (S : List (SigProblem Label B)) : List (Nat × Label) :=
  (S.flatMap pairs).eraseDups

/-- Proposed refined S2, with the same erasure obligation per slice. -/
def S2r (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) S, Scoped P → IsFlexSlicing P S →
    (Accepts P ↔ AcceptsOn P (flexRelevantPairs S))

end Composition.Syntax
