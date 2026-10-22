/-
Proof stream W6: `dep` k accepted at every `k` (the first conjunct of
`ScDep`), through lookups in the certificate's `flatMap`.
-/
import Composition.Typed.Cell.ScenariosMore

namespace Composition.Typed.Cells.ProofsW6

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type} [DecidableEq B]

theorem lookup_append {β : Type} (a : Nat) :
    ∀ xs ys : List (Nat × β),
      (xs ++ ys).lookup a = ((xs.lookup a).or (ys.lookup a))
  | [], _ => rfl
  | (k, v) :: xs, ys => by
    simp only [List.cons_append, List.lookup]
    split <;> simp [lookup_append a xs ys]

theorem lookup_flatMap_none {γ β : Type} (f : γ → List (Nat × β)) (a : Nat) :
    ∀ l : List γ, (∀ j ∈ l, (f j).lookup a = none) →
      (l.flatMap f).lookup a = none
  | [], _ => rfl
  | j :: l, h => by
    rw [List.flatMap_cons, lookup_append, h j (by simp),
      lookup_flatMap_none f a l fun j' hj' => h j' (by simp [hj'])]
    rfl

/-- A key looked up in a `flatMap` is found in the block of the one index
whose block can hold it. -/
theorem lookup_flatMap {γ β : Type} (f : γ → List (Nat × β)) (a : Nat)
    (i : γ) : ∀ l : List γ, i ∈ l →
      (∀ j ∈ l, j ≠ i → (f j).lookup a = none) →
      (l.flatMap f).lookup a = (f i).lookup a
  | [], h, _ => by simp at h
  | j :: l, h, hu => by
    rw [List.flatMap_cons, lookup_append]
    by_cases hji : j = i
    · subst hji
      cases hfj : (f j).lookup a with
      | some b => rfl
      | none =>
        rw [lookup_flatMap_none f a l fun j' hj' => ?_]
        · rfl
        by_cases hj'j : j' = j
        · exact hj'j ▸ hfj
        · exact hu j' (by simp [hj']) hj'j
    · have hi : i ∈ l := by simpa [Ne.symm hji] using h
      rw [hu j (by simp) hji, lookup_flatMap f a i l hi
        fun j' hj' => hu j' (by simp [hj'])]
      rfl

omit [DecidableEq B] in
theorem written_dep (k l : Nat) :
    l ∈ written (depFam (B := B) k) ↔ 0 < k ∧ (l = 0 ∨ l = 1) := by
  have h : written (depFam (B := B) k) = (List.range k).flatMap fun _ => [0, 1] := by
    show List.flatMap _ ([] ++ (List.range k).flatMap _) = _
    rw [List.nil_append, List.flatMap_assoc]
    rfl
  rw [h]
  simp
  exact fun _ => ⟨fun ⟨x, hx⟩ => by omega, fun hk => ⟨0, hk⟩⟩

omit [DecidableEq B] in
theorem dep_lookup (k i : Nat) (hi : i < k) (c : Nat) (hc : c = 1 ∨ c = 2) :
    (depFamCert (B := B) k).row.lookup (k + 2 * i + c) =
      some (if c = 1 then .record [] [⟨i, [1], []⟩]
        else .record [] [⟨i, [0], [[]]⟩]) := by
  rw [depFamCert, lookup_flatMap _ _ i _ (List.mem_range.2 hi)]
  · have h21 : (k + 2 * i + 2 == k + 2 * i + 1) = false :=
      beq_false_of_ne (by omega)
    rcases hc with rfl | rfl
    · simp only [List.lookup, beq_self_eq_true]; rfl
    · simp only [List.lookup, beq_self_eq_true, h21]; rfl
  · intro j _ hji
    have h1 : (k + 2 * i + c == k + 2 * j + 1) = false :=
      beq_false_of_ne (by omega)
    have h2 : (k + 2 * i + c == k + 2 * j + 2) = false :=
      beq_false_of_ne (by omega)
    simp only [List.lookup, h1, h2]

omit [DecidableEq B] in
theorem dep_row (k i : Nat) (hi : i < k) (c : Nat) (hc : c = 1 ∨ c = 2) :
    rowC (depFam (B := B) k) (depFamCert k) (k + 2 * i + c) =
      some ([], if c = 1 then [⟨i, [1], []⟩] else [⟨i, [0], [[]]⟩]) := by
  have hn : k + 2 * i + c ∉ (depFam (B := B) k).rigidRow := by
    simp only [depFam, List.mem_range]; omega
  simp only [rowC, hn, ite_false, dep_lookup k i hi c hc]
  rcases hc with rfl | rfl <;> rfl

omit [DecidableEq B] in
theorem dep_rigid (k i : Nat) (hi : i < k) :
    rowC (depFam (B := B) k) (depFamCert k) i =
      some ([], [wholePiece (depFam (B := B) k) i]) := by
  have hr : i ∈ (depFam (B := B) k).rigidRow := List.mem_range.2 hi
  simp only [rowC, hr, ite_true]

theorem dep_check (k : Nat) :
    checkI (depFam (B := B) k) (depFamCert k) = true := by
  unfold checkI cellCheck
  simp only [Bool.and_eq_true]
  refine ⟨⟨rfl, ?_⟩, ?_⟩
  · simp only [certOkC, depFamCert, List.all_nil, Bool.true_and, List.all_flatMap,
      List.all_eq_true, List.mem_range]
    intro i hi
    have hr : i ∈ (depFam (B := B) k).rigidRow := List.mem_range.2 hi
    simp [wfC, wfFC, composeC, apartC, hr]
  · have hB : (depFam (B := B) k).B = (List.range k).flatMap fun i =>
        [.eq (.record .nil [i]) (.record .nil [k + 2 * i + 1, k + 2 * i + 2]),
         .lacks (k + 2 * i + 1) 0, .lacks (k + 2 * i + 2) 1] := rfl
    rw [hB]
    simp only [List.all_flatMap, List.all_eq_true, List.mem_range]
    intro i hi
    have h1 := dep_row (B := B) k i hi 1 (.inl rfl)
    have h2 := dep_row (B := B) k i hi 2 (.inr rfl)
    simp only [↓reduceIte, Nat.reduceEqDiff] at h1 h2
    have h0 := dep_rigid (B := B) k i hi
    simp only [List.mem_cons, List.not_mem_nil, or_false, forall_eq_or_imp,
      forall_eq]
    refine ⟨?_, ?_, ?_⟩
    · have hk : 0 < k := Nat.lt_of_le_of_lt (Nat.zero_le i) hi
      have hw := written_dep (B := B) k
      have happ : piecesApart (implQ (depFam (B := B) k)) ⟨i, [1], []⟩
          ⟨i, [0], [[]]⟩ = true := rfl
      have hev : evalC (depFam (B := B) k) (implQ (depFam (B := B) k)) (depFamCert k)
          (.record .nil [k + 2 * i + 1, k + 2 * i + 2]) =
          some (.record [] [⟨i, [1], []⟩, ⟨i, [0], [[]]⟩]) := by
        simp [evalC, evalFC, composeC, apartC, lackC, happ, h1, h2]
      have hev0 : evalC (depFam (B := B) k) (implQ (depFam (B := B) k)) (depFamCert k)
          (.record .nil [i]) = some (.record [] [wholePiece (depFam (B := B) k) i]) := by
        simp [evalC, evalFC, composeC, apartC, h0]
      simp only [atomC, hev, hev0]
      simp [eqC, eqFC, sameW, sameCells, rowCubes, wholePiece, implQ, hw, hk,
        coverS, coverK, subsumesS, litRows]
    · simp only [atomC, h1]; rfl
    · simp only [atomC, h2]; rfl

end Composition.Typed.Cells.ProofsW6
