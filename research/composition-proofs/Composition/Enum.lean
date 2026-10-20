/-
Finite enumeration of patterns (R2Enum) and an explicit allocation of
fresh variables (`freshAlloc_fresh`), both proved.
-/
import Composition.R2

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
theorem patternFields_congr {π π' : Nat → Label → Bool}
    {fresh : Nat → Label → Nat} {r : Nat} :
    ∀ L : List Label, (∀ l ∈ L, π r l = π' r l) →
      patternFields (B := B) π fresh r L = patternFields π' fresh r L
  | [], _ => rfl
  | l :: ls, h => by
    simp only [patternFields, h l (by simp),
      patternFields_congr ls (fun k hk => h k (by simp [hk]))]

/-- A pattern's problem depends only on the pattern's values at the
pairs of `C`. -/
theorem patternProblem_congr {C : Problem Label B}
    {π π' : Nat → Label → Bool} {fresh : Nat → Label → Nat}
    (h : ∀ r ∈ rowVarsOf C, ∀ l ∈ labs C, π r l = π' r l) :
    patternProblem C π fresh = patternProblem C π' fresh := by
  unfold patternProblem patternSubst
  congr 2
  exact List.map_congr_left fun r hr =>
    by rw [patternFields_congr _ (h r hr)]

theorem filter_mem_subsets {α : Type} (p : α → Bool) :
    ∀ xs : List α, xs.filter p ∈ subsets xs
  | [] => by simp [subsets]
  | x :: xs => by
    by_cases hp : p x = true
    · simp [List.filter, hp, subsets, filter_mem_subsets p xs]
    · simp [List.filter, hp, subsets, filter_mem_subsets p xs]

/-- R2-enumerated. -/
theorem r2Enum : R2Enum Label B := by
  intro C fresh hF
  constructor
  · intro h
    obtain ⟨π, hs⟩ := r2_forward hF h
    refine ⟨(pairsOf C).filter (fun q => π q.1 q.2),
      filter_mem_subsets _ _, ?_⟩
    rw [patternProblem_congr (π' := π) fun r hr l hl => ?_]
    · exact hs
    · have hp : (r, l) ∈ pairsOf C :=
        mem_pairsOf.mpr ⟨hr, mem_dedup.mp hl⟩
      simp [patternOf, List.mem_filter, hp]
  · rintro ⟨S, _, h⟩
    exact r2_backward h

theorem le_foldr_max : ∀ {xs : List Nat} {n : Nat}, n ∈ xs →
    n ≤ xs.foldr max 0
  | x :: xs, n, h => by
    rcases List.mem_cons.mp h with rfl | h
    · exact Nat.le_max_left _ _
    · exact Nat.le_trans (le_foldr_max h) (Nat.le_max_right _ _)

/-- The explicit allocation meets `FreshFor`. -/
theorem freshAlloc_fresh (C : Problem Label B) :
    FreshFor C (freshAlloc C) := by
  constructor
  · intro r hr l hl r' hr' l' hl' he
    have h1 : (r, l) ∈ pairsOf C := mem_pairsOf.mpr ⟨hr, hl⟩
    have h2 : (r', l') ∈ pairsOf C := mem_pairsOf.mpr ⟨hr', hl'⟩
    have hi : (pairsOf C).idxOf (r, l) = (pairsOf C).idxOf (r', l') := by
      simp only [freshAlloc] at he
      omega
    have e1 := List.getElem_idxOf (List.idxOf_lt_length_iff.mpr h1)
    have e2 := List.getElem_idxOf (List.idxOf_lt_length_iff.mpr h2)
    have : (r, l) = (r', l') := by
      rw [← e1, ← e2]
      simp only [hi]
    exact Prod.mk.inj this
  · intro r _ l _ hn
    have := le_foldr_max hn
    simp only [freshAlloc] at this
    omega

end Composition.Syntax
