import Composition.Typed.Cell.Proofs.W4.Query

namespace Composition.Typed.Cells.ProofsW4

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type} {n : Nat} {P : SigProblem Nat B}

/-- A whole-cell piece of row `r` at labels `L`. -/
abbrev pc (r : Nat) (L : List Nat) : CellPiece Nat := ⟨r, L, [[]]⟩

theorem apartC_nil_left (Q : CellQ Nat) (x : CRow Nat B) :
    apartC Q ([], []) x = true := by
  simp [apartC, lackC]

theorem apartC_f_i (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n)
    (v : CellV Nat B) (L : List Nat) :
    apartC (implQ P) ([(i, v)], []) ([], [pc i L]) = true := by
  simp [apartC, lackC, possW_ii h hi]

theorem piecesApart_i0 (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n)
    (L L' : List Nat) : piecesApart (implQ P) (pc i L) (pc 0 L') = true := by
  simp [piecesApart, possBoth_i0 h hi, cellBoth_i0 h hi]

theorem apartC_fi_0 (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n)
    (fs : List (Nat × CellV Nat B)) (hfs : ∀ e ∈ fs, e.1 = i)
    (L L' : List Nat) :
    apartC (implQ P) (fs, [pc i L]) ([], [pc 0 L']) = true := by
  simp only [apartC, lackC]
  simp only [List.all_cons, List.all_nil, piecesApart_i0 h hi, List.any_nil,
    Bool.and_true, Bool.not_false, Bool.true_and, List.all_eq_true]
  intro e he
  rw [hfs e he, possW_0i h hi]
  simp

theorem apartC_f_i0 (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n)
    (v : CellV Nat B) (L L' : List Nat) :
    apartC (implQ P) ([(i, v)], []) ([], [pc i L, pc 0 L']) = true := by
  simp [apartC, lackC, possW_ii h hi, possW_0i h hi]

theorem sameW_of (Q : CellQ Nat) (xs ys : List (CellPiece Nat))
    (h : ∀ q ∈ xs, ∀ l ∈ q.labels, ∃ q' ∈ ys, q'.row = q.row ∧ l ∈ q'.labels) :
    sameW Q xs ys = true := by
  simp only [sameW, List.all_eq_true, Bool.or_eq_true, List.any_eq_true,
    Bool.and_eq_true, decide_eq_true_eq]
  intro q hq l hl
  exact Or.inr (h q hq l hl)

theorem sameW_one (Q : CellQ Nat) (r : Nat) (L L' : List Nat)
    (hL : ∀ l, l ∈ L → l ∈ L') : sameW Q [pc r L] [pc r L'] = true :=
  sameW_of Q _ _ fun q hq l hl => by
    simp only [List.mem_singleton] at hq; subst hq
    exact ⟨pc r L', by simp, rfl, hL l hl⟩

theorem sameW_two (Q : CellQ Nat) (i : Nat) (L1 L2 L1' L2' : List Nat)
    (h1 : ∀ l, l ∈ L1 → l ∈ L1') (h2 : ∀ l, l ∈ L2 → l ∈ L2') :
    sameW Q [pc i L1, pc 0 L2] [pc i L1', pc 0 L2'] = true :=
  sameW_of Q _ _ fun q hq l hl => by
    simp only [List.mem_cons, List.mem_nil_iff, or_false] at hq
    rcases hq with rfl | rfl
    · exact ⟨pc i L1', by simp, rfl, h1 l hl⟩
    · exact ⟨pc 0 L2', by simp, rfl, h2 l hl⟩

theorem sameCells_one (P : SigProblem Nat B) (r : Nat) (L L' : List Nat) :
    sameCells (implQ P) [pc r L] [pc r L'] = true := by
  simp [sameCells, rowCubes, cover_one]

theorem sameCells_two (P : SigProblem Nat B) {i : Nat} (hi : i ≠ 0)
    (L1 L2 L1' L2' : List Nat) :
    sameCells (implQ P) [pc i L1, pc 0 L2] [pc i L1', pc 0 L2'] = true := by
  simp [sameCells, rowCubes, cover_one, hi, Ne.symm hi]

theorem eqC_rec [DecidableEq B] (Q : CellQ Nat) (fs : List (Nat × CellV Nat B))
    (xp yp : List (CellPiece Nat)) (hf : eqFC Q fs fs = true)
    (h1 : sameW Q xp yp = true) (h2 : sameW Q yp xp = true)
    (h3 : sameCells Q xp yp = true) :
    eqC Q (.record fs xp) (.record fs yp) = true := by
  have h4 : (fs.all fun e => fs.any fun e' => decide (e'.1 = e.1)) = true := by
    simp only [List.all_eq_true, List.any_eq_true, decide_eq_true_eq]
    exact fun e he => ⟨e, he, rfl⟩
  simp only [eqC, hf, h4, h1, h2, h3, Bool.and_self]

theorem eqFC_one [DecidableEq B] (Q : CellQ Nat) (i : Nat) (b : B) :
    eqFC Q [(i, .base b)] [(i, .base b)] = true := by
  simp [eqFC, eqC]

theorem eqFC_nil [DecidableEq B] (Q : CellQ Nat) :
    eqFC Q ([] : List (Nat × CellV Nat B)) [] = true := by
  simp [eqFC]

end Composition.Typed.Cells.ProofsW4
