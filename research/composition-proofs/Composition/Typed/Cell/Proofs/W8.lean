/-
Proof stream W8 (wave 2): representation correspondence. CI4
`ProjPieceDen`, CI4′ `ProjGuardRefused`, CI4″ `SchPieceDen` and CI5
`DeclaredIsNoCommonCell` (statements.md §2.2).
-/
import Composition.Typed.Cell.Statements
import Composition.Typed.Cell.Proofs.C.Cover

namespace Composition.Typed.Cells.ProofsW8

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
/-- The two-literal cube's `cellPossS` is `freeS` of the rigid rows
equal to `r` or `s`. -/
theorem cellPossS_two (P : SigProblem Label B) (r s : Nat)
    (hr : r ∈ P.rigidRow) (hs : s ∈ P.rigidRow) :
    cellPossS P [(r, true), (s, true)] =
      freeS P (P.rigidRow.filter fun x => [(r, true), (s, true)].contains (x, true)) := by
  have hne : (P.rigidRow.filter fun x =>
      [(r, true), (s, true)].contains (x, true)).isEmpty = false := by
    rw [List.isEmpty_eq_false_iff]
    intro h
    have : r ∈ P.rigidRow.filter fun x => [(r, true), (s, true)].contains (x, true) := by
      simp [hr]
    rw [h] at this; simp at this
  have hall : ((P.rigidRow.filter fun x =>
      [(r, true), (s, true)].contains (x, true)).all fun x =>
        ![(r, true), (s, true)].contains (x, false)) = true := by
    simp
  have hK : ([(r, true), (s, true)].all fun e =>
      !e.2 || decide (e.1 ∈ P.rigidRow)) = true := by
    simp [hr, hs]
  simp only [cellPossS, hne, hall, hK, Bool.not_false, Bool.true_and, Bool.and_true]

omit [DecidableEq Label] in
/-- `freeS` decides `FreeCell` (the other direction is stream C's
`freeS_of_free`). -/
theorem free_of_freeS {P : SigProblem Label B} {S : Cell}
    (h : freeS P S = true) : FreeCell P S := by
  simp only [freeS, List.all_eq_true] at h
  intro r hr s hs ha
  have := h r hr s hs _ ha
  simp at this

omit [DecidableEq Label] in
/-- `freeS` is false exactly when some pair of the cell is declared
disjoint. -/
theorem freeS_false_iff (P : SigProblem Label B) (S : Cell) :
    freeS P S = false ↔ ∃ x ∈ S, ∃ y ∈ S, Atom.disjoint x y ∈ P.D := by
  constructor
  · intro h
    apply Classical.byContradiction
    intro hn
    have hf : FreeCell P S := fun x hx y hy hd => hn ⟨x, hx, y, hy, hd⟩
    rw [ProofsC.freeS_of_free hf] at h
    exact Bool.noConfusion h
  · rintro ⟨x, hx, y, hy, hd⟩
    cases h : freeS P S with
    | false => rfl
    | true => exact absurd hd (free_of_freeS h x hx y hy)

end Composition.Typed.Cells.ProofsW8

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells.ProofsW8

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- CI4. -/
theorem projPieceDen : ProjPieceDen (Label := Label) (B := B) := by
  intro P π q hg hrow
  have hge : q.guard.isEmpty = true := by simp [hg]
  refine ⟨⟨q.row, q.labels, if q.rest then [[]] else []⟩,
    by simp [ofProjPiece, hge], ?_, ?_⟩
  · intro l hl
    by_cases hlq : l ∈ q.labels
    · simp [cpieceRow, pieceRow, hg, hrow, hlq, hl, thetaFree, eta, etaRow, genRow]
      cases π q.row l <;> rfl
    · simp [cpieceRow, pieceRow, hlq]
  · intro θs S
    cases hr : q.rest <;>
      simp [cpieceRow, CellPiece.selects, cubeSat, hrow]

omit [DecidableEq Label] in
/-- CI4′. -/
theorem projGuardRefused : ProjGuardRefused (Label := Label) := by
  intro q hq
  have : q.guard.isEmpty = false := by
    cases h : q.guard with
    | nil => exact absurd h hq
    | cons _ _ => rfl
  simp [ofProjPiece, this]

omit [DecidableEq B] in
/-- CI4″. -/
theorem schPieceDen : SchPieceDen (Label := Label) (B := B) := by
  intro P π q hrow
  refine ⟨?_, ?_⟩
  · intro l hl
    by_cases hex : l ∈ q.2
    · simp [cpieceRow, SchpieceRow, ofSchPiece, hex]
    · simp [cpieceRow, SchpieceRow, ofSchPiece, hex, hrow, hl, thetaFree, eta,
        etaRow, genRow]
      cases π q.1 l <;> rfl
  · intro θs S
    simp [cpieceRow, ofSchPiece, CellPiece.selects, cubeSat, hrow]

omit [DecidableEq Label] [DecidableEq B] in
/-- CI5. -/
theorem declaredIsNoCommonCell :
    DeclaredIsNoCommonCell (Label := Label) (B := B) := by
  intro P r s hr hs _
  rw [cellPossS_two P r s hr hs, freeS_false_iff]
  have hmem : ∀ x, x ∈ (P.rigidRow.filter fun x =>
      [(r, true), (s, true)].contains (x, true)) ↔ x = r ∨ x = s := by
    intro x
    simp only [List.mem_filter, List.contains_iff_mem, List.mem_cons,
      Prod.mk.injEq, and_true, List.not_mem_nil, or_false]
    constructor
    · exact fun h => h.2
    · rintro (rfl | rfl)
      · exact ⟨hr, Or.inl rfl⟩
      · exact ⟨hs, Or.inr rfl⟩
  simp only [hmem, declaredS_iff, Declared]
  constructor
  · rintro ⟨x, hx, y, hy, h⟩
    rcases hx with rfl | rfl <;> rcases hy with rfl | rfl
    · exact Or.inr (Or.inl h)
    · exact Or.inl (Or.inl h)
    · exact Or.inl (Or.inr h)
    · exact Or.inr (Or.inr h)
  · rintro ((h | h) | h | h)
    · exact ⟨r, Or.inl rfl, s, Or.inr rfl, h⟩
    · exact ⟨s, Or.inr rfl, r, Or.inl rfl, h⟩
    · exact ⟨r, Or.inl rfl, r, Or.inl rfl, h⟩
    · exact ⟨s, Or.inr rfl, s, Or.inr rfl, h⟩

end Composition.Typed.Cells
