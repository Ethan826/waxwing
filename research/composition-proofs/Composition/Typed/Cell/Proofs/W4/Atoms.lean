import Composition.Typed.Cell.Proofs.W4.Eval

namespace Composition.Typed.Cells.ProofsW4

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type} {n : Nat} {P : SigProblem Nat B}
  {σ : CellCert Nat B}

theorem rowC_rigid {r : Nat} (hr : r ∈ P.rigidRow) :
    rowC P σ r = some ([], [pc r (written P)]) := by
  simp [rowC, hr, wholePiece]

theorem rowC_flex {r : Nat} (hr : r ∉ P.rigidRow) {fs ps}
    (hl : σ.row.lookup r = some (.record fs ps)) :
    rowC P σ r = some (fs, ps) := by
  simp [rowC, hr, hl]

theorem tyC_flex (h : StarP n P) {k : Nat} {v : CellV Nat B}
    (hl : σ.ty.lookup k = some v) : tyC P σ k = v := by
  simp [tyC, h.ty, hl]

theorem flex_row (h : StarP n P) {i k : Nat} (hi : i ∈ starIdx n)
    (hk : n < k) : k ∉ P.rigidRow := by
  rw [h.row]
  have := (mem_starIdx.1 hi).1
  simp only [List.mem_cons, mem_starIdx, not_or]
  omega

/-- The written labels of `P`, up to membership. -/
def SameL (P : SigProblem Nat B) (L : List Nat) : Prop :=
  ∀ l, l ∈ L ↔ l ∈ written P

section
variable [DecidableEq B] (h : StarP n P) {i : Nat} (hi : i ∈ starIdx n) (b : B)
  {L L0 : List Nat} (hL : SameL P L) (hL0 : SameL P L0)
include h hi hL

/-- `{f_i: Int, ...r_i} = {...a_i}`. -/
theorem atom1 (ha : σ.row.lookup (n + i) = some (.record [(i, .base b)] [pc i L])) :
    atomC P (implQ P) σ (.eq (.record (.cons i (.base b) .nil) [i])
      (.record .nil [n + i])) = true := by
  have hri : i ∈ P.rigidRow := by rw [h.row]; exact List.mem_cons_of_mem _ hi
  have hn : 0 < i := (mem_starIdx.1 hi).1
  simp only [atomC, evalC, evalFC, List.mapM_cons, List.mapM_nil, rowC_rigid hri,
    rowC_flex (flex_row h hi (by omega : n < n + i)) ha]
  simp [composeC, apartC_nil_left, apartC_f_i h hi]
  exact eqC_rec _ _ _ _ (eqFC_one _ i b)
    (sameW_one _ i _ _ fun l hl => (hL l).2 hl)
    (sameW_one _ i _ _ fun l hl => (hL l).1 hl) (sameCells_one P i _ _)

/-- `{...h} = {...b_i}`. -/
theorem atom2 (hb : σ.row.lookup (2 * n + i) = some (.record [] [pc 0 L])) :
    atomC P (implQ P) σ (.eq (.record .nil [0]) (.record .nil [2 * n + i])) =
      true := by
  have hr0 : 0 ∈ P.rigidRow := by rw [h.row]; exact List.mem_cons_self
  have hn : 0 < i := (mem_starIdx.1 hi).1
  simp only [atomC, evalC, evalFC, List.mapM_cons, List.mapM_nil, rowC_rigid hr0,
    rowC_flex (flex_row h hi (by omega : n < 2 * n + i)) hb]
  simp [composeC, apartC_nil_left]
  exact eqC_rec _ _ _ _ (eqFC_nil _)
    (sameW_one _ 0 _ _ fun l hl => (hL l).2 hl)
    (sameW_one _ 0 _ _ fun l hl => (hL l).1 hl) (sameCells_one P 0 _ _)

omit hL in
/-- `a_i disjoint b_i`. -/
theorem atom3
    (ha : σ.row.lookup (n + i) = some (.record [(i, .base b)] [pc i L]))
    (hb : σ.row.lookup (2 * n + i) = some (.record [] [pc 0 L0])) :
    atomC P (implQ P) σ (.disjoint (n + i) (2 * n + i)) = true := by
  have hn : 0 < i := (mem_starIdx.1 hi).1
  simp only [atomC, rowC_flex (flex_row h hi (by omega : n < n + i)) ha,
    rowC_flex (flex_row h hi (by omega : n < 2 * n + i)) hb]
  exact apartC_fi_0 h hi _ (by simp) _ _

include hL0 in
/-- `v_i = {...a_i, ...b_i}`. -/
theorem atom4 {L1 L2 : List Nat} (hL1 : SameL P L1) (hL2 : SameL P L2)
    (hv : σ.ty.lookup i = some (.record [(i, .base b)] [pc i L1, pc 0 L2]))
    (ha : σ.row.lookup (n + i) = some (.record [(i, .base b)] [pc i L]))
    (hb : σ.row.lookup (2 * n + i) = some (.record [] [pc 0 L0])) :
    atomC P (implQ P) σ (.eq (.tvar i) (.record .nil [n + i, 2 * n + i])) =
      true := by
  have hn : 0 < i := (mem_starIdx.1 hi).1
  simp only [atomC, evalC, evalFC, List.mapM_cons, List.mapM_nil, tyC_flex h hv,
    rowC_flex (flex_row h hi (by omega : n < n + i)) ha,
    rowC_flex (flex_row h hi (by omega : n < 2 * n + i)) hb]
  simp [composeC, apartC_nil_left, apartC_fi_0 h hi [(i, CellV.base b)]]
  exact eqC_rec _ _ _ _ (eqFC_one _ i b)
    (sameW_two _ i _ _ _ _ (fun l hl => (hL l).2 ((hL1 l).1 hl))
      (fun l hl => (hL0 l).2 ((hL2 l).1 hl)))
    (sameW_two _ i _ _ _ _ (fun l hl => (hL1 l).2 ((hL l).1 hl))
      (fun l hl => (hL2 l).2 ((hL0 l).1 hl)))
    (sameCells_two P (by omega) _ _ _ _)

include hL0 in
/-- `v_i = {f_i: w_i, ...c_i}` (`star-read`). -/
theorem atom5 {L1 L2 : List Nat} (hL1 : SameL P L1) (hL2 : SameL P L2)
    (hv : σ.ty.lookup i = some (.record [(i, .base b)] [pc i L1, pc 0 L2]))
    (hw : σ.ty.lookup (n + i) = some (.base b))
    (hc : σ.row.lookup (3 * n + i) = some (.record [] [pc i L, pc 0 L0])) :
    atomC P (implQ P) σ (.eq (.tvar i)
      (.record (.cons i (.tvar (n + i)) .nil) [3 * n + i])) = true := by
  have hn : 0 < i := (mem_starIdx.1 hi).1
  simp only [atomC, evalC, evalFC, List.mapM_cons, List.mapM_nil, tyC_flex h hv,
    tyC_flex h hw, rowC_flex (flex_row h hi (by omega : n < 3 * n + i)) hc]
  simp [composeC, apartC_nil_left, apartC_f_i0 h hi]
  exact eqC_rec _ _ _ _ (eqFC_one _ i b)
    (sameW_two _ i _ _ _ _ (fun l hl => (hL l).2 ((hL1 l).1 hl))
      (fun l hl => (hL0 l).2 ((hL2 l).1 hl)))
    (sameW_two _ i _ _ _ _ (fun l hl => (hL1 l).2 ((hL l).1 hl))
      (fun l hl => (hL2 l).2 ((hL0 l).1 hl)))
    (sameCells_two P (by omega) _ _ _ _)

end

/-- `w_i = Int` (`star-read`). -/
theorem atom6 [DecidableEq B] (h : StarP n P) (k : Nat) (b : B)
    (hw : σ.ty.lookup k = some (.base b)) :
    atomC P (implQ P) σ (.eq (.tvar k) (.base b)) = true := by
  simp [atomC, evalC, tyC_flex h hw, eqC]

end Composition.Typed.Cells.ProofsW4
