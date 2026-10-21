/-
Signature problems (dossier D6, §2.2): rigid assignments of type `R`
with declared clauses `D`, flexible assignments of type `F` with body
constraints `B`. Claims C10 (the evidence principle) and C11 (inclusion),
and the dossier's example of a signature that fails although `D ∧ B`
has solutions.
-/
import Composition.Forced

namespace Composition

variable {Label Ty R F : Type}

/-- The signature holds: every permitted rigid assignment extends. -/
def SigHolds (D : R → Prop) (B : R → F → Prop) : Prop :=
  ∀ ρ, D ρ → ∃ φ, B ρ φ

/-- The signature fails: some permitted rigid assignment has no
extension (the quantified statement is false; §2.4). -/
def SigFails (D : R → Prop) (B : R → F → Prop) : Prop :=
  ∃ ρ, D ρ ∧ ¬ ∃ φ, B ρ φ

/-- Failure is exactly the negation of the quantified statement. -/
theorem sigFails_iff (D : R → Prop) (B : R → F → Prop) :
    SigFails D B ↔ ¬ SigHolds D B := by
  constructor
  · rintro ⟨ρ, hd, hn⟩ hh
    exact hn (hh ρ hd)
  · intro hn
    apply Classical.byContradiction
    intro hno
    apply hn
    intro ρ hd
    apply Classical.byContradiction
    intro hφ
    exact hno ⟨ρ, hd, hφ⟩

/-- C10, the evidence principle: a rigid assignment satisfying `D`
together with a call-site refutation of the body at that assignment
establishes that the signature fails. No procedure for finding such
evidence is assumed (that is C9). -/
theorem c10 (D : R → Prop) (B : R → F → Prop) (ρ : R) (hd : D ρ)
    (refutation : ∀ φ, ¬ B ρ φ) : SigFails D B :=
  ⟨ρ, hd, fun ⟨φ, hb⟩ => refutation φ hb⟩

/-- The instance alone is not evidence: here `D` holds at every `ρ`,
yet the signature holds. -/
theorem instance_alone_insufficient :
    ∃ (D : Unit → Prop) (B : Unit → Unit → Prop), D () ∧ SigHolds D B :=
  ⟨fun _ => True, fun _ _ => True, trivial, fun _ _ => ⟨(), trivial⟩⟩

/-- C11, inclusion: if the body's constraints split into a part on the
rigid variables that the declared clauses imply and a part that some
flexible assignment always satisfies, the signature holds. -/
theorem c11 (D P : R → Prop) (E : R → F → Prop) (B : R → F → Prop)
    (split : ∀ ρ φ, B ρ φ ↔ P ρ ∧ E ρ φ)
    (included : ∀ ρ, D ρ → P ρ)
    (solvable : ∀ ρ, ∃ φ, E ρ φ) : SigHolds D B := by
  intro ρ hd
  obtain ⟨φ, he⟩ := solvable ρ
  exact ⟨φ, (split ρ φ).mpr ⟨included ρ hd, he⟩⟩

/-- §2.2's example: a body that writes `admin` beside `...r` needs `r`
to lack `admin`. With no declared clause, `D ∧ B` has a solution
(`r` empty), yet the signature fails at `r = { admin: Int }`. One
label (`Unit`), base types from `Forced`. -/
theorem fails_while_satisfiable :
    let D : Row Unit Base → Prop := fun _ => True
    let B : Row Unit Base → Unit → Prop := fun r _ => Lacks r ()
    (∃ r φ, D r ∧ B r φ) ∧ SigFails D B := by
  refine ⟨⟨Row.empty, (), trivial, rfl⟩, ?_⟩
  refine c10 _ _ (fun _ => some Base.int) trivial ?_
  intro _ h
  simp [Lacks] at h

end Composition
