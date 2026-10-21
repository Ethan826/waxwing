/-
Post-substitution slicing: proposed statements only, no new proofs.
`subst_sat` in Binding supplies pointwise correspondence under `eqs`.
Rigid lists and D are retained, so every permitted rigid assignment is
still quantified. Sound specialization does not imply equivalence.
-/
import Composition.Sig.SliceDefs
import Composition.Binding

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- Binding equations remain body obligations, never extra hypotheses. -/
def substP (P : SigProblem Label B) (σ : Subst Label B) :
    SigProblem Label B :=
  ⟨P.rigidTy, P.rigidRow, P.D, eqs σ ++ substProblem σ P.B⟩

/-- Intended solver substitutions bind flexible variables only.
Soundness below does not need this restriction: rigid bindings in the
body make specialization harder, rather than removing rigid cases. -/
def FlexibleSubst (P : SigProblem Label B) (σ : Subst Label B) : Prop :=
  (∀ e ∈ σ.ty, e.1 ∉ P.rigidTy) ∧
    ∀ e ∈ σ.row, e.1 ∉ P.rigidRow

/-- Proposed one-way validity preservation, over all and finite values. -/
def SubstSound (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (P : SigProblem Label B) σ,
    (ValidAll (substP P σ) → ValidAll P) ∧
    (ValidFin (substP P σ) → ValidFin P)

/-- An extra obligation for solution-preserving substitution.
A solver choice for one ground instance does not establish this. -/
def BindingEntailed (P : SigProblem Label B) (σ : Subst Label B) : Prop :=
  ∀ θR θF, Sat θR P.D → Sat (combine P θR θF) P.B →
    Sat (combine P θR θF) (eqs σ)

/-- Proposed equivalence only with bindings entailed by every original
solution, for every permitted rigid assignment. -/
def SubstEquivalent (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (P : SigProblem Label B) σ, BindingEntailed P σ →
    (ValidAll (substP P σ) ↔ ValidAll P) ∧
    (ValidFin (substP P σ) ↔ ValidFin P)

/-- The proposed certificate chain ends in original validity. A failed
search after a chosen substitution remains Unresolved. -/
def C1Subst (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) σ Ts,
    checkSliced (substP P σ) Ts = true → ValidAll P ∧ ValidFin P

end Composition.Syntax
