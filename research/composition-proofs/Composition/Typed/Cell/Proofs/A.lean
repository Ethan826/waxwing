/-
Proof stream A (cellcheck/proof-plan.md): instantiation and finiteness.
CI1 `PieceIsSubRow` and CI2 `CInstFin` from Cell/Statements.lean.
-/
import Composition.Typed.Cell.Statements

namespace Composition.Typed.Cells.ProofsA

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

/-- A piece's entry is absent, or is its source rigid row's entry. -/
theorem cpieceRow_cases (P : SigProblem Label B) (θs : CAssign Label B)
    (q : CellPiece Label) (k : CL Label) :
    cpieceRow P θs q k = none ∨
      (q.row ∈ P.rigidRow ∧ cpieceRow P θs q k = θs.row q.row k) := by
  cases k with
  | inl l =>
    simp only [cpieceRow]
    by_cases h : q.row ∈ P.rigidRow ∧ l ∈ q.labels
    · exact Or.inr ⟨h.1, by simp [h]⟩
    · exact Or.inl (by simp [h])
  | inr S =>
    simp only [cpieceRow]
    by_cases h : q.row ∈ P.rigidRow ∧ q.selects S = true
    · exact Or.inr ⟨h.1, by simp [h]⟩
    · exact Or.inl (by simp only [h, ite_false])

omit [DecidableEq Label] in
theorem finRow_union {V : Type} {r s : Row (CL Label) V}
    (hr : FinRow r) (hs : FinRow s) : FinRow (union r s) := by
  obtain ⟨lr, hlr⟩ := hr
  obtain ⟨ls, hls⟩ := hs
  refine ⟨lr ++ ls, fun k hk => ?_⟩
  cases h : r k with
  | some t => exact List.mem_append_left _ (hlr k (by simp [h]))
  | none =>
    rw [union_of_none h] at hk
    exact List.mem_append_right _ (hls k hk)

omit [DecidableEq Label] in
theorem finO_union {r s : Row (CL Label) (CG Label B)}
    (hr : ∀ k, FinO (r k)) (hs : ∀ k, FinO (s k)) (k : CL Label) :
    FinO (union r s k) := by
  cases h : r k with
  | some t => rw [union_of_some h]; rw [← h]; exact hr k
  | none => rw [union_of_none h]; exact hs k

omit [DecidableEq Label] in
theorem finRow_empty {V : Type} : FinRow (Row.empty : Row (CL Label) V) :=
  ⟨[], fun _ h => absurd rfl h⟩

/-- Pieces are finite at a rigid-finite instance. -/
theorem cpiecesRow_fin (P : SigProblem Label B) (θs : CAssign Label B)
    (hθ : RigidFinC P θs) (ps : List (CellPiece Label)) :
    FinRow (cpiecesRow P θs ps) ∧ ∀ k, FinO (cpiecesRow P θs ps k) := by
  induction ps with
  | nil => exact ⟨finRow_empty, fun _ => by simp [cpiecesRow, Row.empty, FinO]⟩
  | cons q ps ih =>
    have hq : FinRow (cpieceRow P θs q) ∧ ∀ k, FinO (cpieceRow P θs q k) := by
      constructor
      · by_cases hr : q.row ∈ P.rigidRow
        · obtain ⟨ls, hls⟩ := ((finG_record _).mp (hθ.2 q.row hr)).1
          refine ⟨ls, fun k hk => hls k ?_⟩
          rcases cpieceRow_cases P θs q k with h | ⟨_, h⟩
          · exact absurd h hk
          · rwa [h] at hk
        · refine ⟨[], fun k hk => absurd ?_ hk⟩
          rcases cpieceRow_cases P θs q k with h | ⟨h', _⟩
          · exact h
          · exact absurd h' hr
      · intro k
        rcases cpieceRow_cases P θs q k with h | ⟨hr, h⟩
        · rw [h]; exact trivial
        · rw [h]; exact ((finG_record _).mp (hθ.2 q.row hr)).2 k
    show FinRow (union (cpieceRow P θs q) (cpiecesRow P θs ps)) ∧
      ∀ k, FinO (union (cpieceRow P θs q) (cpiecesRow P θs ps) k)
    exact ⟨finRow_union hq.1 ih.1, finO_union hq.2 ih.2⟩

mutual
  theorem cvDen_fin (P : SigProblem Label B) (θs : CAssign Label B)
      (hθ : RigidFinC P θs) : ∀ v : CellV Label B, FinG (cvDen P θs v)
    | .base b => by simp [cvDen, FinG]
    | .rty n => by
      simp only [cvDen]
      split
      · exact hθ.1 n ‹_›
      · exact finG_emptyG
    | .arrow a c => by
      simp only [cvDen, FinG]
      exact ⟨cvDen_fin P θs hθ a, cvDen_fin P θs hθ c⟩
    | .record fs ps => by
      simp only [cvDen]
      have hf := cvDenFields_fin P θs hθ fs
      have hp := cpiecesRow_fin P θs hθ ps
      exact (finG_record _).mpr ⟨finRow_union hf.1 hp.1, finO_union hf.2 hp.2⟩

  theorem cvDenFields_fin (P : SigProblem Label B) (θs : CAssign Label B)
      (hθ : RigidFinC P θs) : ∀ fs : List (Label × CellV Label B),
      FinRow (cvDenFields P θs fs) ∧ ∀ k, FinO (cvDenFields P θs fs k)
    | [] => ⟨finRow_empty, fun _ => by simp [cvDenFields, Row.empty, FinO]⟩
    | (l, v) :: rest => by
      have ih := cvDenFields_fin P θs hθ rest
      have hv := cvDen_fin P θs hθ v
      obtain ⟨ls, hls⟩ := ih.1
      constructor
      · refine ⟨.inl l :: ls, fun k hk => ?_⟩
        simp only [cvDenFields] at hk
        by_cases h : k = .inl l
        · simp [h]
        · simp only [h, ite_false] at hk
          exact List.mem_cons_of_mem _ (hls k hk)
      · intro k
        simp only [cvDenFields]
        by_cases h : k = .inl l
        · simp only [h, ite_true]; exact hv
        · simp only [h, ite_false]; exact ih.2 k
end

end Composition.Typed.Cells.ProofsA

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- CI2. -/
theorem cInstFin : CInstFin (Label := Label) (B := B) := by
  intro P θs σ hθ
  constructor
  · intro n
    show FinG ((((σ.ty.lookup n).map (cvDen P θs)).getD emptyG))
    cases σ.ty.lookup n with
    | none => exact finG_emptyG
    | some v => exact ProofsA.cvDen_fin P θs hθ v
  · intro r
    show FinG (.record (((σ.row.lookup r).map (cvDenRowOf P θs)).getD Row.empty))
    cases σ.row.lookup r with
    | none =>
      exact (finG_record _).mpr ⟨ProofsA.finRow_empty,
        fun _ => by simp [Row.empty, FinO]⟩
    | some v =>
      cases v with
      | record fs ps =>
        have hf := ProofsA.cvDenFields_fin P θs hθ fs
        have hp := ProofsA.cpiecesRow_fin P θs hθ ps
        exact (finG_record _).mpr
          ⟨ProofsA.finRow_union hf.1 hp.1, ProofsA.finO_union hf.2 hp.2⟩
      | _ =>
        exact (finG_record _).mpr ⟨ProofsA.finRow_empty,
          fun _ => by simp [cvDenRowOf, Row.empty, FinO]⟩

omit [DecidableEq B] in
/-- CI1. -/
theorem pieceIsSubRow : PieceIsSubRow (Label := Label) (B := B) := by
  intro P θs hW r hr
  refine ⟨?_, fun q k hq => ?_⟩
  · funext k
    cases k with
    | inl l =>
      simp only [cpieceRow, wholePiece]
      by_cases hl : l ∈ written P
      · simp [hr, hl]
      · have hwr := hW.2 r hr
        simp only [WithinG] at hwr
        have : θs.row r (.inl l) = none := by
          cases hc : θs.row r (.inl l) with
          | none => rfl
          | some t => exact absurd (hwr.1 l (by simp [hc])) hl
        simp [hl, this]
    | inr S =>
      simp [cpieceRow, wholePiece, CellPiece.selects, cubeSat, hr]
  · rcases ProofsA.cpieceRow_cases P θs q k with h | ⟨_, h⟩
    · exact Or.inl h
    · exact Or.inr (hq ▸ h)

end Composition.Typed.Cells
