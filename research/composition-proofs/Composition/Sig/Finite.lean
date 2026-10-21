/-
Waxwing's own semantics for signatures (dossier §14.8): rows are finite
and so is every record value, at every depth, in rigid assignments and
in flexible witnesses. `ValidAll` (Sig/Validity.lean) quantifies over
arbitrary partial maps instead; neither is derived from the other here.
Definitions only.
-/
import Composition.Sig.Adversarial

namespace Composition.Syntax

open Composition

variable {Label B : Type}

/-- A row holds finitely many labels. -/
def FinRow {V : Type} (f : Row Label V) : Prop :=
  ∃ ls : List Label, ∀ k, f k ≠ none → k ∈ ls

mutual
  /-- A ground value is finite: every row in it, at any depth, is. -/
  def FinG : G Label B → Prop
    | .base _ => True
    | .arrow a c => FinG a ∧ FinG c
    | .record f => FinRow f ∧ ∀ k, FinO (f k)

  def FinO : Option (G Label B) → Prop
    | none => True
    | some g => FinG g
end

theorem finG_record (f : Row Label (G Label B)) :
    FinG (.record f) ↔ FinRow f ∧ ∀ k, FinO (f k) := by
  simp only [FinG]

/-- Every value of an assignment is finite: each type variable's value,
and each row variable's row taken as a record. -/
def FinAssign (θ : Assign Label B) : Prop :=
  (∀ n, FinG (θ.ty n)) ∧ ∀ r, FinG (.record (θ.row r))

theorem finG_emptyG : FinG (emptyG : G Label B) := by
  refine (finG_record _).mpr ⟨⟨[], fun _ h => absurd rfl h⟩, fun _ => ?_⟩
  simp [FinO]

variable [DecidableEq Label]

/-- The signature holds over finite values: every rigid assignment whose
rigid values are finite and which satisfies `D` extends, by a finite
flexible assignment, to a solution of `B`. -/
def ValidFin (P : SigProblem Label B) : Prop :=
  ∀ θR, (∀ n ∈ P.rigidTy, FinG (θR.ty n)) →
    (∀ r ∈ P.rigidRow, FinG (.record (θR.row r))) → Sat θR P.D →
      ∃ θF, FinAssign θF ∧ Sat (combine P θR θF) P.B

end Composition.Syntax
