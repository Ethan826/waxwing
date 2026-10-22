import Composition.Typed.Cell.Proofs.W4.Atoms

namespace Composition.Typed.Cells.ProofsW4

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type} {n : Nat} {P : SigProblem Nat B}

/-! ### Lookups -/

theorem lookup_none {V : Type} {l : List (Nat × V)} {k : Nat}
    (h : ∀ e ∈ l, e.1 ≠ k) : l.lookup k = none := by
  induction l with
  | nil => rfl
  | cons e l ih =>
    obtain ⟨k', v⟩ := e
    have hk : (k == k') = false := by
      simpa using fun h' => h _ List.mem_cons_self h'.symm
    rw [List.lookup_cons, hk]
    exact ih fun e he => h e (List.mem_cons_of_mem _ he)

theorem lookup_flatMap {V : Type} (g : Nat → List (Nat × V)) {k i : Nat}
    {v : V} (hgi : (g i).lookup k = some v)
    (l : List Nat) (hgj : ∀ j ∈ l, j ≠ i → (g j).lookup k = none) :
    i ∈ l → (l.flatMap g).lookup k = some v := by
  induction l with
  | nil => simp
  | cons j l ih =>
    intro hil
    rw [List.flatMap_cons, List.lookup_append]
    by_cases hj : j = i
    · subst hj; rw [hgi]; rfl
    · rw [hgj j List.mem_cons_self hj,
        ih (fun j' hj' => hgj j' (List.mem_cons_of_mem _ hj'))
          ((List.mem_cons.1 hil).resolve_left (Ne.symm hj))]
      rfl

theorem lookup_map_key {V : Type} (key : Nat → Nat) (f : Nat → V) {i : Nat}
    (l : List Nat) (hkey : ∀ j ∈ l, key j = key i → j = i) :
    i ∈ l → (l.map fun j => (key j, f j)).lookup (key i) = some (f i) := by
  induction l with
  | nil => simp
  | cons j l ih =>
    intro hk
    simp only [List.map_cons, List.lookup_cons]
    by_cases hj : key i = key j
    · have := hkey j List.mem_cons_self hj.symm
      subst this; simp
    · have : (key i == key j) = false := by simpa using hj
      rw [this]
      refine ih (fun j' hj' => hkey j' (List.mem_cons_of_mem _ hj')) ?_
      exact (List.mem_cons.1 hk).resolve_left fun h' => hj (h' ▸ rfl)

/-! ### Well-formedness and the fragment guard -/

theorem fragment_star (h : StarP n P) : fragmentS P = true := by
  simp only [fragmentS, List.all_eq_true, h.D, List.mem_flatMap]
  rintro a ⟨i, hi, ha⟩
  simp [starD] at ha
  rw [h.row]
  rcases ha with rfl | rfl | rfl <;> simp [hi]

theorem rigid_i (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n) :
    i ∈ P.rigidRow := by
  rw [h.row]; exact List.mem_cons_of_mem _ hi

theorem rigid_0 (h : StarP n P) : 0 ∈ P.rigidRow := by
  rw [h.row]; exact List.mem_cons_self

section
variable (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n)
  (b : B) (L L0 : List Nat)
include h hi

theorem wf_a : wfC P (implQ P) (.record [(i, .base b)] [pc i L]) = true := by
  simp [wfC, wfFC, composeC, apartC_nil_left, apartC_f_i h hi, rigid_i h hi]

omit hi in
theorem wf_b : wfC P (implQ P) (.record [] [pc 0 L0]) = true := by
  simp [wfC, wfFC, composeC, apartC_nil_left, rigid_0 h]

theorem wf_v :
    wfC P (implQ P) (.record [(i, .base b)] [pc i L, pc 0 L0]) = true := by
  simp [wfC, wfFC, composeC, apartC_nil_left, apartC_f_i h hi, rigid_i h hi,
    rigid_0 h, apartC_fi_0 h hi [(i, CellV.base b)]]

theorem wf_c : wfC P (implQ P) (.record [] [pc i L, pc 0 L0]) = true := by
  simp [wfC, wfFC, composeC, apartC_nil_left, rigid_i h hi, rigid_0 h,
    apartC_fi_0 h hi []]

end

/-! ### The star certificate's lookups -/

section
variable (b : B) {i : Nat} (hi : i ∈ starIdx n)
include hi

local notation "Pc" => cStar n b false false

theorem star_ty : (cStarCert n b false false).ty.lookup i =
    some (.record [(i, .base b)] [pc i (written Pc), pc 0 (written Pc)]) :=
  lookup_map_key (fun j => j) (fun j => CellV.record [(j, .base b)]
    [pc j (written Pc), pc 0 (written Pc)]) _ (fun _ _ h => h) hi

theorem star_row_a : (cStarCert n b false false).row.lookup (n + i) =
    some (.record [(i, .base b)] [pc i (written Pc)]) := by
  have := (mem_starIdx.1 hi)
  refine lookup_flatMap (fun j => [(n + j, CellV.record [(j, .base b)]
      [pc j (written Pc)]), (2 * n + j, .record [] [pc 0 (written Pc)])])
    (by simp) _ (fun j hj hne => lookup_none ?_) hi
  have := (mem_starIdx.1 hj)
  simp only [List.mem_cons, List.mem_nil_iff, or_false]
  rintro e (rfl | rfl) <;> simp <;> omega

theorem star_row_b : (cStarCert n b false false).row.lookup (2 * n + i) =
    some (.record [] [pc 0 (written Pc)]) := by
  have := (mem_starIdx.1 hi)
  refine lookup_flatMap (fun j => [(n + j, CellV.record [(j, .base b)]
      [pc j (written Pc)]), (2 * n + j, .record [] [pc 0 (written Pc)])])
    (by
      rw [List.lookup_cons, show (2 * n + i == n + i) = false by simp; omega]
      simp) _ (fun j hj hne => lookup_none ?_) hi
  have := (mem_starIdx.1 hj)
  simp only [List.mem_cons, List.mem_nil_iff, or_false]
  rintro e (rfl | rfl) <;> simp <;> omega

end

end Composition.Typed.Cells.ProofsW4
