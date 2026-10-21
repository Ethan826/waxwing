/-
Proof stream C, part 3 (denotation and apartness): lemmas on piece and
field denotations, and CD2 `ApartSound` (`apartSound`).
-/
import Composition.Typed.Cell.Proofs.C.Impl

/-! ### Denotation lemmas -/

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

theorem union_ne_none {α β : Type} {r s : Row α β} {k : α} :
    union r s k ≠ none ↔ r k ≠ none ∨ s k ≠ none := by
  simp only [union]
  cases r k <;> simp

theorem cpieceRow_inl_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {q : CellPiece Label} {l : Label} (h : cpieceRow P θs q (.inl l) ≠ none) :
    q.row ∈ P.rigidRow ∧ l ∈ q.labels ∧ θs.row q.row (.inl l) ≠ none := by
  simp only [cpieceRow] at h
  split at h
  · rename_i hc; exact ⟨hc.1, hc.2, h⟩
  · exact absurd rfl h

theorem cpieceRow_inr_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {q : CellPiece Label} {S : Cell} (h : cpieceRow P θs q (.inr S) ≠ none) :
    q.row ∈ P.rigidRow ∧ q.selects S = true ∧ θs.row q.row (.inr S) ≠ none := by
  simp only [cpieceRow] at h
  split at h
  · rename_i hc; exact ⟨hc.1, hc.2, h⟩
  · exact absurd rfl h

theorem cpieceRow_of_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {q : CellPiece Label} {k : CL Label} (h : cpieceRow P θs q k ≠ none) :
    cpieceRow P θs q k = θs.row q.row k := by
  cases k with
  | inl l =>
    have := cpieceRow_inl_ne h
    simp [cpieceRow, this.1, this.2.1]
  | inr S =>
    have := cpieceRow_inr_ne h
    simp [cpieceRow, this.1, this.2.1]

theorem cpiecesRow_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {k : CL Label} : ∀ {ps : List (CellPiece Label)},
    cpiecesRow P θs ps k ≠ none → ∃ q ∈ ps, cpieceRow P θs q k ≠ none
  | [], h => absurd rfl h
  | q :: ps, h => by
    rw [show cpiecesRow P θs (q :: ps) =
      union (cpieceRow P θs q) (cpiecesRow P θs ps) from rfl] at h
    rcases union_ne_none.mp h with h0 | h0
    · exact ⟨q, List.mem_cons_self, h0⟩
    · obtain ⟨q', hq', h1⟩ := cpiecesRow_ne h0
      exact ⟨q', List.mem_cons_of_mem _ hq', h1⟩

theorem cvDenFields_inr {P : SigProblem Label B} {θs : CAssign Label B}
    {S : Cell} : ∀ fs : List (Label × CellV Label B),
    cvDenFields P θs fs (.inr S) = none
  | [] => rfl
  | (l, v) :: rest => by
    simp only [cvDenFields]
    simp [cvDenFields_inr rest]

theorem cvDenFields_inl {P : SigProblem Label B} {θs : CAssign Label B}
    {l : Label} : ∀ fs : List (Label × CellV Label B),
    cvDenFields P θs fs (.inl l) = (fs.lookup l).map (cvDen P θs)
  | [] => rfl
  | (l', v) :: rest => by
    simp only [cvDenFields, List.lookup_cons, Sum.inl.injEq]
    by_cases h : l = l'
    · subst h; simp
    · have hb : (l == l') = false := by simp [h]
      simp [h, hb, cvDenFields_inl rest]

theorem mem_of_lookup {β : Type} : ∀ {fs : List (Label × β)} {l : Label} {v : β},
    fs.lookup l = some v → (l, v) ∈ fs
  | [], _, _, h => by simp at h
  | (l', w) :: rest, l, v, h => by
    simp only [List.lookup_cons] at h
    by_cases hl : l = l'
    · subst hl; simp at h; subst h; exact List.mem_cons_self
    · have hb : (l == l') = false := by simp [hl]
      simp only [hb] at h; exact List.mem_cons_of_mem _ (mem_of_lookup h)

theorem lookup_isSome {β : Type} : ∀ {fs : List (Label × β)} {l : Label},
    (∃ e ∈ fs, e.1 = l) → (fs.lookup l).isSome
  | [], _, ⟨_, h, _⟩ => by simp at h
  | (l', w) :: rest, l, ⟨e, he, hl⟩ => by
    simp only [List.lookup_cons]
    by_cases h : l = l'
    · subst h; simp
    · have hb : (l == l') = false := by simp [h]
      simp only [hb]
      rcases List.mem_cons.mp he with rfl | he
      · exact absurd hl.symm h
      · exact lookup_isSome ⟨e, he, hl⟩

theorem cvDenFields_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {fs : List (Label × CellV Label B)} {k : CL Label}
    (h : cvDenFields P θs fs k ≠ none) : ∃ l, k = .inl l ∧ ∃ e ∈ fs, e.1 = l := by
  cases k with
  | inr S => exact absurd (cvDenFields_inr fs) h
  | inl l =>
    refine ⟨l, rfl, ?_⟩
    rw [cvDenFields_inl] at h
    cases hl : fs.lookup l with
    | none => simp [hl] at h
    | some v => exact ⟨(l, v), mem_of_lookup hl, rfl⟩

/-! ### CD2 -/

theorem cubeSat_append {S : Cell} {K K' : CellCube}
    (h : cubeSat S K = true) (h' : cubeSat S K' = true) :
    cubeSat S (K ++ K') = true := by
  simp only [cubeSat, List.all_append, Bool.and_eq_true] at *
  exact ⟨h, h'⟩

/-- Apart pieces never share an entry in the region. -/
theorem piecesApart_sound {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {q q' : CellPiece Label} (h : piecesApart Q q q' = true) (k : CL Label) :
    cpieceRow P θs q k = none ∨ cpieceRow P θs q' k = none := by
  refine Classical.byContradiction fun hne => ?_
  simp only [not_or] at hne
  simp only [piecesApart, Bool.and_eq_true, List.all_eq_true] at h
  cases k with
  | inl l =>
    obtain ⟨hr, hl, hv⟩ := cpieceRow_inl_ne hne.1
    obtain ⟨hr', hl', hv'⟩ := cpieceRow_inl_ne hne.2
    have h1 := h.1 l hl
    simp only [hl', decide_true, Bool.not_true, Bool.false_or,
      Bool.not_eq_true'] at h1
    rcases (hQ θs hreg q.row hr q'.row hr').2.1 l h1 with h2 | h2
    · exact hv h2
    · exact hv' h2
  | inr S =>
    obtain ⟨hr, hs, hv⟩ := cpieceRow_inr_ne hne.1
    obtain ⟨hr', hs', hv'⟩ := cpieceRow_inr_ne hne.2
    obtain ⟨K, hK, hKs⟩ := List.any_eq_true.mp hs
    obtain ⟨K', hK', hKs'⟩ := List.any_eq_true.mp hs'
    have h1 := h.2 K hK K' hK'
    simp only [Bool.not_eq_true'] at h1
    rcases (hQ θs hreg q.row hr q'.row hr').2.2.1 (K ++ K') S h1
        (cubeSat_append hKs hKs') with h2 | h2
    · exact hv h2
    · exact hv' h2

/-- `lackC` leaves every piece empty at `l` in the region. -/
theorem lackC_sound {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {ps : List (CellPiece Label)} {l : Label} (h : lackC Q ps l = true) :
    ∀ q ∈ ps, cpieceRow P θs q (.inl l) = none := by
  intro q hq
  refine Classical.byContradiction fun hne => ?_
  obtain ⟨hr, hl, hv⟩ := cpieceRow_inl_ne hne
  simp only [lackC, List.all_eq_true] at h
  have h1 := h q hq
  simp only [hl, decide_true, Bool.not_true, Bool.false_or,
    Bool.not_eq_true'] at h1
  exact hv ((hQ θs hreg q.row hr q.row hr).1 l h1)

end Composition.Typed.Cells.ProofsC

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-- CD2. -/
theorem apartSound : ApartSound (Label := Label) (B := B) := by
  intro P Q hQ θs hreg x y h k
  refine Classical.byContradiction fun hne => ?_
  simp only [not_or] at hne
  have hx := ProofsC.union_ne_none.mp hne.1
  have hy := ProofsC.union_ne_none.mp hne.2
  simp only [apartC, Bool.and_eq_true, List.all_eq_true] at h
  obtain ⟨⟨hfx, hfy⟩, hpp⟩ := h
  rcases hx with hx | hx
  · obtain ⟨l, rfl, e, he, rfl⟩ := ProofsC.cvDenFields_ne hx
    have h1 := hfx e he
    simp only [Bool.not_eq_true', List.any_eq_false, decide_eq_true_eq] at h1
    rcases hy with hy | hy
    · obtain ⟨l', hl', e', he', rfl⟩ := ProofsC.cvDenFields_ne hy
      exact h1.1 e' he' (Sum.inl.inj hl').symm
    · obtain ⟨q, hq, hq'⟩ := ProofsC.cpiecesRow_ne hy
      exact hq' (ProofsC.lackC_sound hQ hreg h1.2 q hq)
  · obtain ⟨q, hq, hq'⟩ := ProofsC.cpiecesRow_ne hx
    rcases hy with hy | hy
    · obtain ⟨l, rfl, e, he, rfl⟩ := ProofsC.cvDenFields_ne hy
      exact hq' (ProofsC.lackC_sound hQ hreg (hfy e he) q hq)
    · obtain ⟨q', hq2, hq2'⟩ := ProofsC.cpiecesRow_ne hy
      rcases ProofsC.piecesApart_sound hQ hreg (hpp q hq q' hq2) k with h2 | h2
      · exact hq' h2
      · exact hq2' h2

end Composition.Typed.Cells
