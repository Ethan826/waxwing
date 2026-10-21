/-
Proof stream C, part 4 (pieces and composition): for CB3, coherence of
a record's pieces (`PCoh`) through the composition fold, and transfer
of non-empty pieces between records compared by `eqC`.
-/
import Composition.Typed.Cell.Proofs.C.Apart

/-! ### CB3 -/

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- At most one row contributes at each key: two pieces both non-empty
at `k` are on the same row. -/
def PCoh (P : SigProblem Label B) (θs : CAssign Label B)
    (ps : List (CellPiece Label)) : Prop :=
  ∀ k, ∀ q1 ∈ ps, ∀ q2 ∈ ps, cpieceRow P θs q1 k ≠ none →
    cpieceRow P θs q2 k ≠ none → q1.row = q2.row

omit [DecidableEq B] in
theorem pcoh_single {P : SigProblem Label B} {θs : CAssign Label B}
    {ps : List (CellPiece Label)} (h : ps.length ≤ 1) : PCoh P θs ps := by
  intro k q1 h1 q2 h2 _ _
  match ps, h, h1, h2 with
  | [_], _, h1, h2 =>
    simp only [List.mem_singleton] at h1 h2
    rw [h1, h2]

omit [DecidableEq B] in
theorem pcoh_append {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {ps ps' : List (CellPiece Label)} (h : PCoh P θs ps) (h' : PCoh P θs ps')
    (hap : ∀ q ∈ ps, ∀ q' ∈ ps', piecesApart Q q q' = true) :
    PCoh P θs (ps ++ ps') := by
  intro k q1 hq1 q2 hq2 hn1 hn2
  rcases List.mem_append.mp hq1 with hq1 | hq1 <;>
    rcases List.mem_append.mp hq2 with hq2 | hq2
  · exact h k q1 hq1 q2 hq2 hn1 hn2
  · rcases piecesApart_sound hQ hreg (hap q1 hq1 q2 hq2) k with h0 | h0
    · exact absurd h0 hn1
    · exact absurd h0 hn2
  · rcases piecesApart_sound hQ hreg (hap q2 hq2 q1 hq1) k with h0 | h0
    · exact absurd h0 hn2
    · exact absurd h0 hn1
  · exact h' k q1 hq1 q2 hq2 hn1 hn2

omit [DecidableEq B] in
/-- The composition fold keeps pieces coherent, and collects them all. -/
theorem compose_pcoh {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs) :
    ∀ (parts : List (CRow Label B)) (acc res : CRow Label B),
      (∀ x ∈ parts, x.2.length ≤ 1) → PCoh P θs acc.2 →
      parts.foldlM (fun acc x => if apartC Q acc x
        then some (acc.1 ++ x.1, acc.2 ++ x.2) else none) acc = some res →
      PCoh P θs res.2 ∧ res.2 = acc.2 ++ parts.flatMap (·.2)
  | [], acc, res, _, hc, h => by
    simp only [List.foldlM_nil] at h
    cases h; exact ⟨hc, by simp⟩
  | x :: parts, acc, res, hl, hc, h => by
    simp only [List.foldlM_cons] at h
    split at h
    · rename_i hap
      have hap' : ∀ q ∈ acc.2, ∀ q' ∈ x.2, piecesApart Q q q' = true := by
        simp only [apartC, Bool.and_eq_true, List.all_eq_true] at hap
        exact hap.2
      have hc' : PCoh P θs (acc.2 ++ x.2) :=
        pcoh_append hQ hreg hc (pcoh_single (hl x List.mem_cons_self)) hap'
      obtain ⟨h1, h2⟩ := compose_pcoh hQ hreg parts _ res
        (fun y hy => hl y (List.mem_cons_of_mem _ hy)) hc' h
      exact ⟨h1, by simp [h2]⟩
    · simp at h

omit [DecidableEq B] in
theorem cpiecesRow_of_pcoh {P : SigProblem Label B} {θs : CAssign Label B}
    {k : CL Label} : ∀ {ps : List (CellPiece Label)} {q : CellPiece Label},
    PCoh P θs ps → q ∈ ps → cpieceRow P θs q k ≠ none →
      cpiecesRow P θs ps k = θs.row q.row k
  | [], _, _, hq, _ => by simp at hq
  | q0 :: ps, q, hc, hq, hn => by
    rw [show cpiecesRow P θs (q0 :: ps) k =
      union (cpieceRow P θs q0) (cpiecesRow P θs ps) k from rfl]
    cases h0 : cpieceRow P θs q0 k with
    | some v =>
      have hn0 : cpieceRow P θs q0 k ≠ none := by simp [h0]
      have hrow := hc k q0 List.mem_cons_self q hq hn0 hn
      rw [← hrow, ← cpieceRow_of_ne hn0, h0]
      simp [union, h0]
    | none =>
      simp only [union, h0]
      rcases List.mem_cons.mp hq with rfl | hq
      · exact absurd h0 hn
      · exact cpiecesRow_of_pcoh
          (fun k q1 h1 q2 h2 => hc k q1 (List.mem_cons_of_mem _ h1) q2
            (List.mem_cons_of_mem _ h2)) hq hn

omit [DecidableEq B] in
/-- Each non-empty piece of `xp` has a non-empty piece of the same row in
`yp`, by `sameW` on written labels and by `cover` on cells. -/
theorem transfer {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {xp yp : List (CellPiece Label)} (hw : sameW Q xp yp = true)
    (hc : ∀ q ∈ xp,
      Q.cover q.row (rowCubes xp q.row) (rowCubes yp q.row) = true)
    (k : CL Label) (q : CellPiece Label) (hq : q ∈ xp)
    (hn : cpieceRow P θs q k ≠ none) :
    ∃ q' ∈ yp, q'.row = q.row ∧ cpieceRow P θs q' k ≠ none := by
  cases k with
  | inl l =>
    obtain ⟨hr, hl, hv⟩ := cpieceRow_inl_ne hn
    simp only [sameW, List.all_eq_true] at hw
    have h1 := hw q hq l hl
    simp only [Bool.or_eq_true, Bool.not_eq_true', List.any_eq_true,
      Bool.and_eq_true, decide_eq_true_eq] at h1
    rcases h1 with h1 | ⟨q', hq', hrow, hl'⟩
    · exact absurd ((hQ θs hreg q.row hr q.row hr).1 l h1) hv
    · refine ⟨q', hq', hrow, ?_⟩
      simp only [cpieceRow, hrow, hr, hl', and_self, ite_true]
      exact hv
  | inr S =>
    obtain ⟨hr, hs, hv⟩ := cpieceRow_inr_ne hn
    obtain ⟨K, hK, hKs⟩ := List.any_eq_true.mp hs
    have hL : (rowCubes xp q.row).any (cubeSat S) = true := by
      refine List.any_eq_true.mpr ⟨K, ?_, hKs⟩
      simp only [rowCubes, List.mem_flatMap, List.mem_filter]
      exact ⟨q, ⟨hq, by simp⟩, hK⟩
    have hR := (hQ θs hreg q.row hr q.row hr).2.2.2 _ _ S (hc q hq) hv hL
    obtain ⟨K', hK', hKs'⟩ := List.any_eq_true.mp hR
    simp only [rowCubes, List.mem_flatMap, List.mem_filter,
      decide_eq_true_eq] at hK'
    obtain ⟨q', ⟨hq', hrow⟩, hK'⟩ := hK'
    refine ⟨q', hq', hrow, ?_⟩
    have hsel : q'.selects S = true := List.any_eq_true.mpr ⟨K', hK', hKs'⟩
    simp only [cpieceRow, hrow, hr, hsel, and_self, ite_true]
    exact hv

omit [DecidableEq B] in
theorem pieces_eq {P : SigProblem Label B} {θs : CAssign Label B}
    {xp yp : List (CellPiece Label)} (hx : PCoh P θs xp) (hy : PCoh P θs yp)
    (k : CL Label)
    (txy : ∀ q ∈ xp, cpieceRow P θs q k ≠ none →
      ∃ q' ∈ yp, q'.row = q.row ∧ cpieceRow P θs q' k ≠ none)
    (tyx : ∀ q ∈ yp, cpieceRow P θs q k ≠ none →
      ∃ q' ∈ xp, q'.row = q.row ∧ cpieceRow P θs q' k ≠ none) :
    cpiecesRow P θs xp k = cpiecesRow P θs yp k := by
  by_cases h : ∃ q ∈ xp, cpieceRow P θs q k ≠ none
  · obtain ⟨q, hq, hn⟩ := h
    obtain ⟨q', hq', hrow, hn'⟩ := txy q hq hn
    rw [cpiecesRow_of_pcoh hx hq hn, cpiecesRow_of_pcoh hy hq' hn', hrow]
  · have hxn : cpiecesRow P θs xp k = none :=
      Classical.byContradiction fun hne => h (cpiecesRow_ne hne)
    have hyn : cpiecesRow P θs yp k = none :=
      Classical.byContradiction fun hne => by
        obtain ⟨q, hq, hn⟩ := cpiecesRow_ne hne
        obtain ⟨q', hq', _, hn'⟩ := tyx q hq hn
        exact h ⟨q', hq', hn'⟩
    rw [hxn, hyn]

omit [DecidableEq B] in
theorem wfFC_mem {P : SigProblem Label B} {Q : CellQ Label} :
    ∀ {fs : List (Label × CellV Label B)}, wfFC P Q fs = true →
      ∀ e ∈ fs, wfC P Q e.2 = true
  | [], _, e, he => by simp at he
  | (l, v) :: rest, h, e, he => by
    simp only [wfFC, Bool.and_eq_true] at h
    rcases List.mem_cons.mp he with rfl | he
    · exact h.1
    · exact wfFC_mem h.2 e he

omit [DecidableEq Label] [DecidableEq B] in
theorem flatMap_parts (fs : List (Label × CellV Label B))
    (ps : List (CellPiece Label)) :
    (fs.map (fun e => (([e], []) : CRow Label B)) ++
      ps.map (fun q => (([], [q]) : CRow Label B))).flatMap (·.2) = ps := by
  induction fs with
  | nil =>
    simp only [List.map_nil, List.nil_append]
    induction ps with
    | nil => rfl
    | cons q ps ih => simp [ih]
  | cons e fs ih => simpa using ih

omit [DecidableEq B] in
/-- A well-formed record's pieces are coherent in the region. -/
theorem wf_pcoh {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {fs : List (Label × CellV Label B)} {ps : List (CellPiece Label)}
    (h : (composeC Q (fs.map (fun e => ([e], [])) ++
        ps.map (fun q => ([], [q])))).isSome = true) :
    PCoh P θs ps := by
  obtain ⟨res, hres⟩ := Option.isSome_iff_exists.mp h
  have hl : ∀ x ∈ (fs.map (fun e => (([e], []) : CRow Label B)) ++
      ps.map (fun q => (([], [q]) : CRow Label B))), x.2.length ≤ 1 := by
    intro x hx
    simp only [List.mem_append, List.mem_map] at hx
    rcases hx with ⟨e, _, rfl⟩ | ⟨q, _, rfl⟩ <;> simp
  obtain ⟨h1, h2⟩ := compose_pcoh hQ hreg _ ([], []) res hl
    (pcoh_single (by simp)) hres
  rw [h2, flatMap_parts] at h1
  simpa using h1

end Composition.Typed.Cells.ProofsC
