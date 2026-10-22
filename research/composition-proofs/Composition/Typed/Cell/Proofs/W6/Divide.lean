/-
Proof stream W6: `divide` and `divide2` m accepted at every `m` (the
second conjunct of `ScDep`).
-/
import Composition.Typed.Cell.ScenariosMore

namespace Composition.Typed.Cells.ProofsW6

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type} [DecidableEq B]

omit [DecidableEq B] in
theorem written_divide (m : Nat) (two : Bool) (l : Nat) :
    l ∈ written (divideSig (B := B) m two) ↔
      l ∈ starIdx m ∨ (two = true ∧ l = 0) := by
  cases two <;> simp [written, divideSig, labelsOf, labelsT, labelsF, starIdx,
    List.flatMap_map, Function.comp_def, @eq_comm _ l]

theorem zero_not_mem_starIdx (m : Nat) : 0 ∉ starIdx m := by
  simp [starIdx]

theorem divide_true (m : Nat) :
    checkI (divideSig (B := B) m true) (divideCert m true) = true := by
  have hw := written_divide (B := B) m true
  have hz := zero_not_mem_starIdx m
  have happ : piecesApart (implQ (divideSig (B := B) m true))
      ⟨0, starIdx m, []⟩ ⟨0, [0], [[]]⟩ = true := by
    simp [piecesApart, starIdx]
  have h1 : rowC (divideSig (B := B) m true) (divideCert m true) 1 =
      some ([], [⟨0, starIdx m, []⟩]) := rfl
  have h2 : rowC (divideSig (B := B) m true) (divideCert m true) 2 =
      some ([], [⟨0, [0], [[]]⟩]) := rfl
  have hev : evalC (divideSig (B := B) m true) (implQ (divideSig (B := B) m true))
      (divideCert m true) (.record .nil [1, 2]) =
      some (.record [] [⟨0, starIdx m, []⟩, ⟨0, [0], [[]]⟩]) := by
    simp [evalC, evalFC, composeC, apartC, lackC, happ, h1, h2]
  have hev0 : evalC (divideSig (B := B) m true) (implQ (divideSig (B := B) m true))
      (divideCert m true) (.record .nil [0]) =
      some (.record [] [wholePiece (divideSig m true) 0]) := rfl
  unfold checkI cellCheck
  simp only [Bool.and_eq_true]
  refine ⟨⟨rfl, rfl⟩, ?_⟩
  have hB : (divideSig (B := B) m true).B =
      .eq (.record .nil [0]) (.record .nil [1, 2]) ::
        ((starIdx m).map (.lacks 2) ++ [.lacks 1 0]) := rfl
  rw [hB]
  simp only [List.all_cons, List.all_append, List.all_nil,
    Bool.and_true, Bool.and_eq_true, List.all_eq_true, List.mem_map]
  refine ⟨?_, ?_, ?_⟩
  · have hc : coverS (divideSig (B := B) m true) 0 [[]] [[]] = true := rfl
    simp only [atomC, hev, hev0]
    simp [eqC, eqFC, sameW, sameCells, rowCubes, wholePiece, implQ, hw, hc]
    exact ⟨fun x hx => .inr hx, fun x hx => .inr (.inl hx)⟩
  · rintro _ ⟨j, hj, rfl⟩
    simp only [atomC, h2]
    simp only [lackC]
    simp only [List.mem_cons, List.not_mem_nil, or_false, List.all_cons,
      List.all_nil, Bool.and_true, Bool.or_eq_true,
      decide_eq_false_iff_not, Bool.and_true, List.map_nil,
      Bool.not_eq_eq_eq_not, Bool.not_true, Bool.and_eq_true]
    exact ⟨by simp, Or.inl fun h => hz (h ▸ hj)⟩
  · simp only [atomC, h1]
    simp [lackC, hz]

theorem divide_false (m : Nat) :
    checkI (divideSig (B := B) m false) (divideCert m false) = true := by
  have hw := written_divide (B := B) m false
  have hz := zero_not_mem_starIdx m
  have hev : evalC (divideSig (B := B) m false) (implQ (divideSig (B := B) m false))
      (divideCert m false) (.record .nil [1, 2]) =
      some (.record [] [⟨0, 0 :: starIdx m, [[]]⟩]) := rfl
  have hev0 : evalC (divideSig (B := B) m false) (implQ (divideSig (B := B) m false))
      (divideCert m false) (.record .nil [0]) =
      some (.record [] [wholePiece (divideSig m false) 0]) := rfl
  unfold checkI cellCheck
  simp only [Bool.and_eq_true]
  refine ⟨⟨rfl, rfl⟩, ?_⟩
  have hB : (divideSig (B := B) m false).B =
      .eq (.record .nil [0]) (.record .nil [1, 2]) ::
        ((starIdx m).map (.lacks 2) ++ []) := rfl
  rw [hB]
  simp only [List.all_cons, List.all_append, List.all_nil,
    Bool.and_true, Bool.and_eq_true, List.all_eq_true, List.mem_map]
  refine ⟨?_, ?_⟩
  · have hc : coverS (divideSig (B := B) m false) 0 [[]] [[]] = true := rfl
    simp only [atomC, hev, hev0]
    simp [eqC, eqFC, sameW, sameCells, rowCubes, wholePiece, implQ, hw, hc]
    exact ⟨fun x hx => .inr (.inr hx), .inl (.inl hz), fun x hx => .inr hx⟩
  · rintro _ ⟨j, hj, rfl⟩
    rfl

end Composition.Typed.Cells.ProofsW6
