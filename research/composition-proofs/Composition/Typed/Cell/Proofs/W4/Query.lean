import Composition.Typed.Cell.ScenariosMore

namespace Composition.Typed.Cells.ProofsW4

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type}

theorem all_false_of_mem {α : Type} {l : List α} {f : α → Bool} {a : α}
    (h : a ∈ l) (hf : f a = false) : l.all f = false := by
  cases h' : l.all f
  · rfl
  · rw [List.all_eq_true] at h'
    rw [h' a h] at hf
    exact hf

theorem mem_starIdx {n i : Nat} : i ∈ starIdx n ↔ 1 ≤ i ∧ i ≤ n := by
  simp only [starIdx, List.mem_map, List.mem_range]
  constructor
  · rintro ⟨j, hj, rfl⟩; omega
  · intro h; exact ⟨i - 1, by omega, by omega⟩

/-- The shape `cStar n` and `cStarR n` share: no rigid type variable, the
hub and the spokes rigid, the declarations of `star`. -/
structure StarP (n : Nat) (P : SigProblem Nat B) : Prop where
  ty : P.rigidTy = []
  row : P.rigidRow = 0 :: starIdx n
  D : P.D = (starIdx n).flatMap (starD (B := B) n false false)

variable {n : Nat} {P : SigProblem Nat B}

theorem mem_D (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n) {a : Atom Nat B}
    (ha : a ∈ starD (B := B) n false false i) : a ∈ P.D := by
  rw [h.D]; exact List.mem_flatMap.2 ⟨i, hi, ha⟩

theorem possW_ii (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n) :
    (implQ P).possW i i = false := by
  have : holdersOK P i [i] = false :=
    all_false_of_mem (mem_D h hi (a := .lacks i i) (by simp [starD])) (by simp)
  simp [implQ, this]

theorem possW_0i (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n) :
    (implQ P).possW 0 i = false := by
  have : holdersOK P i [0] = false :=
    all_false_of_mem (mem_D h hi (a := .lacks 0 i) (by simp [starD])) (by simp)
  simp [implQ, this]

theorem possBoth_i0 (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n) (l : Nat) :
    (implQ P).possBoth i 0 l = false := by
  have : holdersOK P l [i, 0] = false :=
    all_false_of_mem (mem_D h hi (a := .disjoint 0 i) (by simp [starD]))
      (by simp)
  simp [implQ, this]

theorem cellBoth_i0 (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n) :
    (implQ P).cellBoth i 0 [] = false := by
  have hD := mem_D h hi (a := .disjoint 0 i) (by simp [starD])
  have hfree : ∀ S : Cell, 0 ∈ S → i ∈ S → freeS P S = false := by
    intro S h0 hiS
    refine all_false_of_mem h0 (all_false_of_mem hiS (all_false_of_mem hD ?_))
    simp
  have hpos := hfree
    ((P.rigidRow).filter fun x => [(i, true), (0, true)].contains (x, true))
    (List.mem_filter.2 ⟨by rw [h.row]; simp, by simp⟩)
    (List.mem_filter.2 ⟨by rw [h.row]; simp [hi], by simp⟩)
  simp only [implQ, cellPossS, hpos, Bool.and_false]

theorem cover_one (P : SigProblem Nat B) (r : Nat) :
    (implQ P).cover r [[]] [[]] = true := by
  simp [implQ, coverS, coverK, subsumesS, litRows]

end Composition.Typed.Cells.ProofsW4
