/-
Cell checker, proof stream D (coverage): CV1 `CoverFree` and CG
`FragmentIff`. Plan: research/division-campaign/cellcheck/proof-plan.md.
CV1's generic-instance and within conjuncts come from `d3bEqFree`; the
fragment gives its `Scoped` and `EqFree` premises. `CellShape` holds at
`thetaFree` for every problem (`cellShape_thetaFree`).
-/
import Composition.Typed.Cell.Statements
import Composition.Typed.EqFree

namespace Composition.Typed.Cells.ProofsD

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq Label] [DecidableEq B] in
/-- The fragment's atoms are equation-free. -/
theorem eqFree_of_fragment {P : SigProblem Label B} (h : LDFragment P) :
    EqFree P := by
  intro a ha
  rcases h a ha with ⟨r, l, rfl, _⟩ | ⟨r, s, rfl, _, _⟩ <;> trivial

omit [DecidableEq Label] [DecidableEq B] in
/-- The fragment mentions only rigid variables. -/
theorem scoped_of_fragment {P : SigProblem Label B} (h : LDFragment P) :
    Scoped P := by
  constructor
  · intro n hn
    simp only [tyVarsOf, List.mem_flatMap] at hn
    obtain ⟨a, ha, hn⟩ := hn
    rcases h a ha with ⟨r, l, rfl, _⟩ | ⟨r, s, rfl, _, _⟩ <;> simp at hn
  · intro x hx
    simp only [rowVarsOf, List.mem_flatMap] at hx
    obtain ⟨a, ha, hx⟩ := hx
    rcases h a ha with ⟨r, l, rfl, hr⟩ | ⟨r, s, rfl, hr, hs⟩
    · simp at hx; subst hx; exact hr
    · simp at hx
      rcases hx with rfl | rfl
      · exact hr
      · exact hs

end Composition.Typed.Cells.ProofsD

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- `thetaFree` has the cell shape, for every problem and pattern (no
fragment premise). -/
theorem cellShape_thetaFree (P : SigProblem Label B) (π : Pattern Label) :
    CellShape P (thetaFree P π) := by
  intro r _ S hS
  have hS' : S ∈ freeCells P ∧ r ∈ S := by
    by_cases hn : S ∈ freeCells P ∧ r ∈ S
    · exact hn
    · simp [thetaFree, eta, etaRow, hn] at hS
  refine ⟨?_, (mem_freeCells.mp hS'.1).2.2, hS'.2⟩
  obtain ⟨h1, h2, _⟩ := mem_freeCells.mp hS'.1
  simp only [cellCands, List.mem_filter, decide_eq_true_eq]
  exact ⟨h1, h2⟩

omit [DecidableEq B] in
/-- CV1. -/
theorem coverFree : CoverFree (Label := Label) (B := B) := by
  intro P π hF hI
  obtain ⟨hG, hW⟩ := d3bEqFree P π (ProofsD.scoped_of_fragment hF)
    (ProofsD.eqFree_of_fragment hF) hI
  exact ⟨hG, hW, cellShape_thetaFree P π⟩

omit [DecidableEq Label] [DecidableEq B] in
/-- CG. -/
theorem fragmentIff : FragmentIff (Label := Label) (B := B) := by
  intro P
  simp only [fragmentS, List.all_eq_true, LDFragment]
  refine forall_congr' fun a => imp_congr_right fun _ => ?_
  cases a with
  | disjoint r s =>
    simp only [Bool.and_eq_true, decide_eq_true_eq]
    constructor
    · intro h; exact Or.inr ⟨r, s, rfl, h.1, h.2⟩
    · rintro (⟨_, _, h, _⟩ | ⟨_, _, h, hr, hs⟩)
      · cases h
      · cases h; exact ⟨hr, hs⟩
  | _ => simp
