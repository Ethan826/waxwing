/-
Call-site problems, entailment, and forced placement: claims C7a and
C7b, and the counterexample that refutes the dossier's first statement
of C7.

A call-site problem over assignments of type `A` is a predicate on `A`
(dossier D5, D6): its solutions are the assignments satisfying it.
-/
import Composition.Rows

namespace Composition

variable {Label Ty A : Type}

/-- `C ⊨ c`: every solution of `C` satisfies `c`. -/
def Entails (C c : A → Prop) : Prop := ∀ θ, C θ → c θ

/-- `C` has a solution. -/
def Satisfiable (C : A → Prop) : Prop := ∃ θ, C θ

/-- C7a: presence of `l` in the part `part` is forced iff adding
"`part` lacks `l`" leaves no solution. -/
theorem c7a (C : A → Prop) (part : A → Row Label Ty) (l : Label) :
    Entails C (fun θ => part θ l ≠ none) ↔
      ¬ Satisfiable (fun θ => C θ ∧ Lacks (part θ) l) := by
  constructor
  · rintro h ⟨θ, hc, hl⟩
    exact h θ hc hl
  · intro h θ hc hl
    exact h ⟨θ, hc, hl⟩

/-- C7b: if `l` is forced present in `r`, every solution makes `u` the
disjoint composition of `r` and `s`, and every solution gives `u` the
field `l : τ`, then every solution gives `r` the field `l : τ`. -/
theorem c7b (C : A → Prop) (r s u : A → Row Label Ty) (l : Label)
    (τ : Ty)
    (present : Entails C (fun θ => r θ l ≠ none))
    (composed : Entails C (fun θ => DUnion (r θ) (s θ) (u θ)))
    (result : Entails C (fun θ => u θ l = some τ)) :
    Entails C (fun θ => r θ l = some τ) := by
  intro θ hc
  have hp : r θ l ≠ none := present θ hc
  obtain ⟨_, hu⟩ := composed θ hc
  have hr : u θ l = some τ := result θ hc
  cases h : r θ l with
  | none => exact absurd h hp
  | some t =>
    rw [hu, union_of_some h] at hr
    rw [hr]

/-- The dossier's first statement of C7: forced typed presence iff
"lacks" is refuted. -/
def FirstC7 (C : A → Prop) (part : A → Row Label Ty) (l : Label)
    (τ : Ty) : Prop :=
  Entails C (fun θ => part θ l = some τ) ↔
    ¬ Satisfiable (fun θ => C θ ∧ Lacks (part θ) l)

/-- Two base types suffice for the counterexample. -/
inductive Base where
  | int
  | bool
  deriving DecidableEq

/-- The counterexample: `C` fixes `r = { x: Bool }` (one label, `Unit`).
"`r` lacks `x`" is refuted, but `x ∈ r : Int` is not entailed. -/
theorem first_c7_false :
    ¬ FirstC7 (A := Row Unit Base)
      (fun r => r = fun _ => some Base.bool) id () Base.int := by
  intro h
  have refuted : ¬ Satisfiable (A := Row Unit Base)
      (fun r => r = (fun _ => some Base.bool) ∧ Lacks (id r) ()) := by
    rintro ⟨r, rfl, hl⟩
    simp [Lacks] at hl
  have entailed := h.mpr refuted
  have := entailed (fun _ => some Base.bool) rfl
  simp at this

end Composition
