/-
Proof stream C, part 1 (cubes and cover): candidate cells, `cubeSat`,
the ← direction of QX2 `CellPossExact` (`cellPossS_complete`) and the
soundness (→) direction of QX3 `CoverExact` (`coverS_sound`).
-/
import Composition.Typed.Cell.Statements
import Composition.Typed.Cell.Exact

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

/-! ### Candidate cells and `cellPossS` -/

theorem mem_of_mem_subsets {α : Type} :
    ∀ {l S : List α} {x : α}, S ∈ subsets l → x ∈ S → x ∈ l
  | [], S, x, hS, hx => by
    simp [subsets] at hS; subst hS; simp at hx
  | a :: l, S, x, hS, hx => by
    simp only [subsets, List.mem_append, List.mem_map] at hS
    rcases hS with hS | ⟨T, hT, rfl⟩
    · exact List.mem_cons_of_mem _ (mem_of_mem_subsets hS hx)
    · rcases List.mem_cons.mp hx with rfl | hx
      · exact List.mem_cons_self
      · exact List.mem_cons_of_mem _ (mem_of_mem_subsets hT hx)

omit [DecidableEq Label] in
theorem mem_rigid_of_cand {P : SigProblem Label B} {S : Cell} {x : Nat}
    (hS : S ∈ cellCands P) (hx : x ∈ S) : x ∈ P.rigidRow := by
  simp only [cellCands, List.mem_filter] at hS
  exact mem_of_mem_subsets hS.1 hx

theorem cubeSat_iff {S : Cell} {K : CellCube} :
    cubeSat S K = true ↔ ∀ e ∈ K, (e.1 ∈ S ↔ e.2 = true) := by
  simp only [cubeSat, List.all_eq_true, beq_iff_eq]
  refine forall_congr' fun e => forall_congr' fun _ => ?_
  cases e.2 <;> simp

theorem cubeSat_cons {S : Cell} {K : CellCube} {x : Nat} {b : Bool} :
    cubeSat S ((x, b) :: K) = true ↔ (x ∈ S ↔ b = true) ∧ cubeSat S K = true := by
  simp only [cubeSat_iff, List.mem_cons, forall_eq_or_imp]

omit [DecidableEq Label] in
/-- `freeS` is true on a free cell (one direction of QX1). -/
theorem freeS_of_free {P : SigProblem Label B} {S : Cell}
    (h : FreeCell P S) : freeS P S = true := by
  simp only [freeS, List.all_eq_true]
  intro r hr s hs a ha
  cases a with
  | disjoint x y =>
    simp only [Bool.not_eq_true', Bool.and_eq_false_iff, beq_eq_false_iff_ne]
    by_cases hx : x = r
    · subst hx
      by_cases hy : y = s
      · subst hy; exact absurd ha (h x hr y hs)
      · exact Or.inr hy
    · exact Or.inl hx
  | _ => rfl

omit [DecidableEq Label] in
/-- QX2's ← direction: a free candidate cell satisfying a cube with a
positive literal makes `cellPossS` true. -/
theorem cellPossS_complete (P : SigProblem Label B) (K : CellCube)
    (hpos : ∃ x, (x, true) ∈ K) {S : Cell} (hS : S ∈ cellCands P)
    (hfree : FreeCell P S) (hsat : cubeSat S K = true) :
    cellPossS P K = true := by
  have hK := cubeSat_iff.mp hsat
  have hposS : ∀ x, (x, true) ∈ K → x ∈ S := fun x hx => (hK _ hx).2 rfl
  obtain ⟨x0, hx0⟩ := hpos
  simp only [cellPossS, Bool.and_eq_true, Bool.not_eq_true', List.isEmpty_eq_false_iff,
    List.all_eq_true, Bool.or_eq_true, decide_eq_true_eq, Bool.not_eq_true']
  refine ⟨⟨⟨?_, ?_⟩, ?_⟩, ?_⟩
  · intro hnil
    have : x0 ∈ P.rigidRow.filter fun x => K.contains (x, true) := by
      simp only [List.mem_filter, List.contains_iff_mem]
      exact ⟨mem_rigid_of_cand hS (hposS x0 hx0), hx0⟩
    rw [hnil] at this; simp at this
  · intro e he
    rcases e with ⟨x, b⟩
    cases b
    · exact Or.inl rfl
    · exact Or.inr (mem_rigid_of_cand hS (hposS x he))
  · intro x hx
    simp only [List.mem_filter, List.contains_iff_mem] at hx
    refine Bool.eq_false_iff.mpr fun hf => ?_
    rw [List.contains_iff_mem] at hf
    have h2 := (hK _ hf).1 (hposS x hx.2)
    simp at h2
  · apply freeS_of_free
    intro r hr s hs
    simp only [List.mem_filter, List.contains_iff_mem] at hr hs
    exact hfree r (hposS r hr.2) s (hposS s hs.2)

/-! ### QX3's soundness direction -/

omit [DecidableEq Label] in
theorem coverK_sound (P : SigProblem Label B) (r : Nat) (R : List CellCube) :
    ∀ (fuel : Nat) (K : CellCube), coverK P r R fuel K = true →
      ∀ S ∈ cellCands P, FreeCell P S → r ∈ S → cubeSat S K = true →
        R.any (cubeSat S) = true := by
  intro fuel
  induction fuel with
  | zero => intro K h; simp [coverK] at h
  | succ n ih =>
    intro K h S hS hfree hr hsat
    have hposs : ∀ K', cubeSat S K' = true →
        cellPossS P ((r, true) :: K') = true := fun K' h' =>
      cellPossS_complete P _ ⟨r, List.mem_cons_self⟩ hS hfree
        (cubeSat_cons.mpr ⟨by simp [hr], h'⟩)
    simp only [coverK, Bool.or_eq_true, Bool.not_eq_true'] at h
    rcases h with (h | h) | h
    · rw [hposs K hsat] at h; exact absurd h (by decide)
    · obtain ⟨K', hK', hsub⟩ := List.any_eq_true.mp h
      refine List.any_eq_true.mpr ⟨K', hK', ?_⟩
      refine cubeSat_iff.mpr fun e he => ?_
      simp only [subsumesS, List.all_eq_true, Bool.not_eq_true'] at hsub
      have hf := hsub e he
      refine Classical.byContradiction fun hne => ?_
      have : cubeSat S ((e.1, !e.2) :: K) = true := by
        refine cubeSat_cons.mpr ⟨?_, hsat⟩
        cases hb : e.2 <;> simp_all
      rw [hposs _ this] at hf; exact absurd hf (by decide)
    · split at h
      · exact absurd h (by decide)
      · rename_i x _
        simp only [Bool.and_eq_true] at h
        by_cases hx : x ∈ S
        · exact ih _ h.1 S hS hfree hr (cubeSat_cons.mpr ⟨by simp [hx], hsat⟩)
        · exact ih _ h.2 S hS hfree hr (cubeSat_cons.mpr ⟨by simp [hx], hsat⟩)

end Composition.Typed.Cells.ProofsC

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
/-- QX3 `CoverExact`'s → direction, with its premises: `coverS` is
sound over the free candidate cells of `r`. -/
theorem coverS_sound (P : SigProblem Label B) (r : Nat) (L R : List CellCube)
    (_hr : r ∈ P.rigidRow) (h : coverS P r L R = true) :
    ∀ S ∈ cellCands P, FreeCell P S → r ∈ S →
      L.any (cubeSat S) = true → R.any (cubeSat S) = true := by
  intro S hS hfree hrS hL
  obtain ⟨K, hK, hsat⟩ := List.any_eq_true.mp hL
  simp only [coverS, List.all_eq_true] at h
  exact ProofsC.coverK_sound P r R _ K (h K hK) S hS hfree hrS hsat

end Composition.Typed.Cells
