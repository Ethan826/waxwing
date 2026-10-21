/-
Proof stream E, row helpers: the denotation of a record part
(`rowDen`), its behaviour under append, and `composeC`'s left fold
against `composeAll`'s right fold given apartness. Used by the mutual
core in Composition/Typed/Cell/Proofs/E.lean.
-/
import Composition.Typed.Cell.Statements

namespace Composition.Typed.Cells.ProofsE

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

/-- A record part's denotation: fields first, then pieces. -/
def rowDen (P : SigProblem Label B) (θs : CAssign Label B)
    (x : CRow Label B) : Row (CL Label) (CG Label B) :=
  union (cvDenFields P θs x.1) (cpiecesRow P θs x.2)

theorem cvDenFields_inr (P : SigProblem Label B) (θs : CAssign Label B)
    (fs : List (Label × CellV Label B)) (S : Cell) :
    cvDenFields P θs fs (.inr S) = none := by
  induction fs with
  | nil => simp [cvDenFields, Row.empty]
  | cons e rest ih =>
    obtain ⟨l, v⟩ := e
    simp [cvDenFields, ih]

theorem cvDenFields_notMem (P : SigProblem Label B) (θs : CAssign Label B)
    (fs : List (Label × CellV Label B)) (l : Label)
    (h : l ∉ fs.map Prod.fst) : cvDenFields P θs fs (.inl l) = none := by
  induction fs with
  | nil => simp [cvDenFields, Row.empty]
  | cons e rest ih =>
    obtain ⟨l', v⟩ := e
    simp only [List.map_cons, List.mem_cons, not_or] at h
    have hne : (Sum.inl l : CL Label) ≠ Sum.inl l' := by simpa using h.1
    simp [cvDenFields, hne, ih h.2]

theorem cvDenFields_append (P : SigProblem Label B) (θs : CAssign Label B)
    (a b : List (Label × CellV Label B)) :
    cvDenFields P θs (a ++ b) =
      union (cvDenFields P θs a) (cvDenFields P θs b) := by
  induction a with
  | nil => simp [cvDenFields, empty_union]
  | cons e rest ih =>
    obtain ⟨l, v⟩ := e
    funext k
    simp only [List.cons_append, cvDenFields, ih]
    by_cases hk : k = .inl l <;> simp [union, hk]

theorem cpiecesRow_append (P : SigProblem Label B) (θs : CAssign Label B)
    (a b : List (CellPiece Label)) :
    cpiecesRow P θs (a ++ b) =
      union (cpiecesRow P θs a) (cpiecesRow P θs b) := by
  induction a with
  | nil => simp [cpiecesRow, empty_union]
  | cons q rest ih =>
    simp only [cpiecesRow, List.cons_append, List.foldr_cons] at ih ⊢
    rw [ih, union_assoc]

theorem rowDen_empty (P : SigProblem Label B) (θs : CAssign Label B) :
    rowDen P θs (([], []) : CRow Label B) = Row.empty := by
  simp [rowDen, cvDenFields, cpiecesRow, empty_union]

/-- Regrouping a union of two disjoint unions. -/
theorem union_union_swap {L V : Type} (a b c d : Row L V)
    (h : Composition.Disjoint (union a b) (union c d)) :
    union (union a c) (union b d) = union (union a b) (union c d) := by
  funext l
  have hl := h l
  cases ha : a l <;> cases hb : b l <;> cases hc : c l <;>
    cases hd : d l <;> simp_all [union]

theorem rowDen_append (P : SigProblem Label B) (θs : CAssign Label B)
    (x y : CRow Label B)
    (h : Composition.Disjoint (rowDen P θs x) (rowDen P θs y)) :
    rowDen P θs (x.1 ++ y.1, x.2 ++ y.2) =
      union (rowDen P θs x) (rowDen P θs y) := by
  simp only [rowDen, cvDenFields_append, cpiecesRow_append] at h ⊢
  exact union_union_swap _ _ _ _ h

/-- `composeC`'s left fold against `composeAll`'s right fold. -/
theorem foldlM_composeAll (P : SigProblem Label B) (Q : CellQ Label)
    (θs : CAssign Label B)
    (hap : ∀ x y : CRow Label B, apartC Q x y = true →
      Composition.Disjoint (rowDen P θs x) (rowDen P θs y))
    (parts : List (CRow Label B)) (acc x : CRow Label B)
    (h : parts.foldlM (fun acc x => if apartC Q acc x
      then some (acc.1 ++ x.1, acc.2 ++ x.2) else none) acc = some x) :
    composeAll (rowDen P θs acc :: parts.map (rowDen P θs)) =
      some (rowDen P θs x) := by
  induction parts generalizing acc with
  | nil =>
    simp only [List.foldlM_nil] at h
    cases h
    simp [composeAll, compose_empty]
  | cons y ys ih =>
    simp only [List.foldlM_cons] at h
    by_cases hxy : apartC Q acc y = true
    · simp only [hxy, ite_true] at h
      have hd := hap acc y hxy
      have ih' := ih _ h
      rw [rowDen_append P θs acc y hd] at ih'
      simp only [List.map_cons, composeAll] at ih' ⊢
      obtain ⟨b, hb, hc⟩ := Option.bind_eq_some_iff.mp ih'
      rw [compose_eq_some] at hc
      obtain ⟨hdb, hx⟩ := hc
      rw [disjoint_union_left] at hdb
      rw [hb]
      simp only [Option.bind_some]
      have h1 : compose (rowDen P θs y) b =
          some (union (rowDen P θs y) b) :=
        compose_eq_some.mpr ⟨hdb.2, rfl⟩
      rw [h1]
      simp only [Option.bind_some]
      rw [compose_eq_some]
      refine ⟨disjoint_union_right.mpr ⟨hd, hdb.1⟩, ?_⟩
      rw [hx, union_assoc]
    · simp [hxy] at h

theorem composeC_composeAll (P : SigProblem Label B) (Q : CellQ Label)
    (θs : CAssign Label B)
    (hap : ∀ x y : CRow Label B, apartC Q x y = true →
      Composition.Disjoint (rowDen P θs x) (rowDen P θs y))
    (parts : List (CRow Label B)) (x : CRow Label B)
    (h : composeC Q parts = some x) :
    composeAll (parts.map (rowDen P θs)) = some (rowDen P θs x) := by
  have := foldlM_composeAll P Q θs hap parts ([], []) x h
  rw [rowDen_empty] at this
  simp only [composeAll] at this
  cases hc : composeAll (parts.map (rowDen P θs)) with
  | none => simp [hc] at this
  | some u =>
    rw [hc] at this
    simpa [empty_compose] using this

end Composition.Typed.Cells.ProofsE
