import Composition.Typed.Cell.Proofs.W4.Star

namespace Composition.Typed.Cells.ProofsW4

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type}

theorem lookup_append_some {V : Type} {l₁ l₂ : List (Nat × V)} {k : Nat} {v : V}
    (h : l₁.lookup k = some v) : (l₁ ++ l₂).lookup k = some v := by
  rw [List.lookup_append, h]; rfl

theorem lookup_append_none {V : Type} {l₁ l₂ : List (Nat × V)} {k : Nat}
    (h : l₁.lookup k = none) : (l₁ ++ l₂).lookup k = l₂.lookup k := by
  rw [List.lookup_append, h]; rfl

theorem starP_cStarR (n : Nat) (b : B) :
    StarP n (cStarR n b (starIdx n) id) := ⟨rfl, rfl, rfl⟩

/-- `star-read` writes no label `star` does not. -/
theorem sameL_read (n : Nat) (b : B) :
    SameL (cStarR n b (starIdx n) id) (written (cStar n b false false)) := by
  intro l
  simp only [written, labelsOf, cStarR, cStar, List.mem_flatMap, List.mem_append]
  constructor
  · rintro ⟨a, ha, hl⟩
    exact ⟨a, by rcases ha with ha | ha <;> simp [ha], hl⟩
  · rintro ⟨a, ha | ha | ha, hl⟩
    · exact ⟨a, Or.inl ha, hl⟩
    · exact ⟨a, Or.inr ha, hl⟩
    · obtain ⟨i, hi, ha⟩ := ha
      simp only [readB, List.mem_cons, List.mem_nil_iff, or_false] at ha
      rcases ha with rfl | rfl
      · simp only [labelsT, labelsF, id, List.nil_append, List.append_nil,
          List.mem_cons, List.mem_nil_iff, or_false] at hl
        subst hl
        have hD : (Atom.lacks l l : Atom Nat B) ∈ starD n false false l := by
          simp [starD]
        exact ⟨.lacks l l, Or.inl ⟨l, hi, hD⟩, by simp⟩
      · simp [labelsT] at hl

section
variable (n : Nat) (b : B) {i : Nat} (hi : i ∈ starIdx n)
include hi

local notation "PR" => cStarR n b (starIdx n) id
local notation "σR" => cStarRCert n b (starIdx n) id

theorem read_ty_w : (σR).ty.lookup (n + i) = some (.base b) := by
  simp only [cStarRCert]
  rw [lookup_append_none]
  · exact lookup_map_key (fun j => n + j) (fun _ => CellV.base b) _
      (fun _ _ h => by omega) hi
  · refine lookup_none fun e he => ?_
    obtain ⟨j, hj, rfl⟩ := List.mem_map.1 he
    have := mem_starIdx.1 hj; have := mem_starIdx.1 hi
    simp only [ne_eq]; omega

theorem read_row_c : (σR).row.lookup (3 * n + i) =
    some (.record [] [pc i (written PR), pc 0 (written PR)]) := by
  simp only [cStarRCert]
  rw [lookup_append_none]
  · exact lookup_map_key (fun j => 3 * n + j) (fun j => CellV.record []
      [pc j (written PR), pc 0 (written PR)]) _ (fun _ _ h => by omega) hi
  · refine lookup_none fun e he => ?_
    obtain ⟨j, hj, he⟩ := List.mem_flatMap.1 he
    have := mem_starIdx.1 hj; have := mem_starIdx.1 hi
    simp only [List.mem_cons, List.mem_nil_iff, or_false] at he
    rcases he with rfl | rfl <;> simp only [ne_eq] <;> omega

end

variable [DecidableEq B]

section
variable (n : Nat) (b : B)

local notation "PR" => cStarR n b (starIdx n) id
local notation "σR" => cStarRCert n b (starIdx n) id

omit [DecidableEq B] in
theorem read_ty_v {i : Nat} (hi : i ∈ starIdx n) : (σR).ty.lookup i =
    some (.record [(i, .base b)] [pc i (written (cStar n b false false)),
      pc 0 (written (cStar n b false false))]) :=
  lookup_append_some (star_ty b hi)

theorem atoms_read :
    ∀ a ∈ (starIdx n).flatMap (readB n b id), atomC PR (implQ PR) σR a = true := by
  intro a ha
  obtain ⟨i, hi, ha⟩ := List.mem_flatMap.1 ha
  simp only [readB, List.mem_cons, List.mem_nil_iff, or_false] at ha
  rcases ha with rfl | rfl
  · exact atom5 (starP_cStarR n b) hi b (sameL_self _) (sameL_self _)
      (sameL_read n b) (sameL_read n b) (read_ty_v n b hi) (read_ty_w n b hi)
      (read_row_c n b hi)
  · exact atom6 (starP_cStarR n b) (n + i) b (read_ty_w n b hi)

omit [DecidableEq B] in
theorem certOk_read : certOkC PR (implQ PR) σR = true := by
  have h := starP_cStarR n b
  have hok := certOk_star h b (written (cStar n b false false))
  simp only [certOkC, Bool.and_eq_true] at hok
  simp only [certOkC, cStarRCert, List.all_append, Bool.and_eq_true]
  refine ⟨⟨hok.1, ?_⟩, ⟨hok.2, ?_⟩⟩
  · simp only [List.all_eq_true, List.mem_map]
    rintro e ⟨i, -, rfl⟩
    rfl
  · simp only [List.all_eq_true, List.mem_map]
    rintro e ⟨i, hi, rfl⟩
    have := wf_c h hi (written PR) (written PR)
    simp only [Bool.and_eq_true]
    exact ⟨this, trivial⟩

end

end Composition.Typed.Cells.ProofsW4

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed.Cells.ProofsW4

/-- `star-read` n is accepted at every n, by its certificate. -/
theorem scStarRead (B : Type) [DecidableEq B] (b : B) : ScStarRead B b := by
  intro n
  have h := starP_cStarR n b
  have hs : ((cStar n b false false).B).all (atomC (cStarR n b (starIdx n) id)
      (implQ (cStarR n b (starIdx n) id)) (cStarRCert n b (starIdx n) id)) =
      true :=
    List.all_eq_true.2 (atoms_star h b (sameL_read n b) (fun i hi => read_ty_v n b hi)
      (fun i hi => lookup_append_some (star_row_a b hi))
      (fun i hi => lookup_append_some (star_row_b b hi)))
  have hr := List.all_eq_true.2 (atoms_read n b)
  simp only [checkI, cellCheck, fragment_star h, certOk_read, Bool.true_and]
  show (List.all ((cStar n b false false).B ++ _) _) = true
  rw [List.all_append, hs, hr]; rfl

end Composition.Typed.Cells
