/-
Proof stream W6: `divide3` with option C's `sigma3`, accepted for every
list of labels (`ScDivide3`).
-/
import Composition.Typed.Cell.ScenariosMore

namespace Composition.Typed.Cells.ProofsW6

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- `sigma3`'s image under `ofProjCert`. -/
def cert3 (as : List Label) : CellCert Label B :=
  ⟨[], [(2, .record [] [⟨0, as, []⟩]), (3, .record [] [⟨0, [], [[]]⟩])]⟩

omit [DecidableEq Label] [DecidableEq B] in
theorem ofProjCert_sigma3 (as : List Label) :
    ofProjCert (sigma3 (B := B) as) = some (cert3 as) := rfl

omit [DecidableEq Label] [DecidableEq B] in
theorem written_divide3 (as : List Label) (l : Label) :
    l ∈ written (divide3Sig (B := B) as) ↔ l ∈ as := by
  simp [written, divide3Sig, labelsOf, labelsT, labelsF, List.flatMap_map]

omit [DecidableEq B] in
theorem holdersOK_divide3 (as : List Label) (l : Label) (hl : l ∈ as) :
    holdersOK (divide3Sig (B := B) as) l [0, 1] = false := by
  simp [holdersOK, divide3Sig, List.all_map, Function.comp_def]
  exact hl

theorem divide3_check (as : List Label) :
    checkI (divide3Sig (B := B) as) (cert3 as) = true := by
  have hw := written_divide3 (B := B) as
  have happ : piecesApart (implQ (divide3Sig (B := B) as)) ⟨0, as, []⟩
      ⟨0, [], [[]]⟩ = true := by
    simp [piecesApart]
  have h2 : rowC (divide3Sig (B := B) as) (cert3 as) 2 =
      some ([], [⟨0, as, []⟩]) := rfl
  have h3 : rowC (divide3Sig (B := B) as) (cert3 as) 3 =
      some ([], [⟨0, [], [[]]⟩]) := rfl
  have h1 : rowC (divide3Sig (B := B) as) (cert3 as) 1 =
      some ([], [wholePiece (divide3Sig (B := B) as) 1]) := rfl
  have hev : evalC (divide3Sig (B := B) as) (implQ (divide3Sig (B := B) as))
      (cert3 as) (.record .nil [2, 3]) =
      some (.record [] [⟨0, as, []⟩, ⟨0, [], [[]]⟩]) := by
    simp [evalC, evalFC, composeC, apartC, lackC, happ, h2, h3]
  have hev0 : evalC (divide3Sig (B := B) as) (implQ (divide3Sig (B := B) as))
      (cert3 as) (.record .nil [0]) =
      some (.record [] [wholePiece (divide3Sig (B := B) as) 0]) := rfl
  unfold checkI cellCheck
  simp only [Bool.and_eq_true]
  refine ⟨⟨?_, rfl⟩, ?_⟩
  · simp [fragmentS, divide3Sig, List.all_map, Function.comp_def]
  have hB : (divide3Sig (B := B) as).B =
      [.eq (.record .nil [0]) (.record .nil [2, 3]), .disjoint 2 1] ++
        as.map (.lacks 3) := rfl
  rw [hB]
  simp only [List.all_cons, List.all_append, List.all_nil,
    Bool.and_true, Bool.and_eq_true, List.all_eq_true, List.mem_map]
  refine ⟨⟨?_, ?_⟩, ?_⟩
  · simp only [atomC, hev, hev0]
    simp [eqC, eqFC, sameW, sameCells, rowCubes, wholePiece, implQ, hw,
      coverS, coverK, subsumesS, litRows]
    exact fun x hx => .inr hx
  · simp only [atomC, h2, h1]
    simp [apartC, piecesApart, wholePiece, implQ, hw]
    exact fun x hx => .inr (holdersOK_divide3 as x hx)
  · rintro _ ⟨a, _, rfl⟩
    simp only [atomC, h3]
    simp [lackC]

end Composition.Typed.Cells.ProofsW6
