/-
Proof stream F (cell checker, assembly): CB2 `AtomSound`, CM
`CellSound`, `CellOpen`, `CellOpenImpl` (dossier §18.54-18.55; plan
research/division-campaign/cellcheck/proof-plan.md). Other streams'
statements enter as hypotheses; B5 is `d3bSoundOpen`.
-/
import Composition.Typed.Cell.Statements
import Composition.Typed.Bridge.ProofInstantiateSound

namespace Composition.Typed.Cells.ProofsF

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

/-! ### Rows -/

theorem union_empty_left {α β : Type} (s : Row α β) :
    union Row.empty s = s := rfl

theorem union_empty_right {α β : Type} (r : Row α β) :
    union r Row.empty = r := by
  funext k; unfold union; cases r k <;> rfl

theorem union_ne_none {α β : Type} {r s : Row α β} {k : α}
    (h : union r s k ≠ none) : r k ≠ none ∨ s k ≠ none := by
  unfold union at h
  cases hr : r k with
  | some _ => exact Or.inl (by simp)
  | none => rw [hr] at h; exact Or.inr h

theorem cpiecesRow_ne_none (P : SigProblem Label B) (θs : CAssign Label B)
    {ps : List (CellPiece Label)} {k : CL Label}
    (h : cpiecesRow P θs ps k ≠ none) :
    ∃ q ∈ ps, cpieceRow P θs q k ≠ none := by
  induction ps with
  | nil => exact absurd rfl h
  | cons q ps ih =>
    simp only [cpiecesRow, List.foldr] at h
    rcases union_ne_none h with h | h
    · exact ⟨q, List.mem_cons_self .., h⟩
    · obtain ⟨q', hq', h'⟩ := ih h
      exact ⟨q', List.mem_cons_of_mem _ hq', h'⟩

theorem cvDenFields_inr (P : SigProblem Label B) (θs : CAssign Label B)
    (fs : List (Label × CellV Label B)) (S : Cell) :
    cvDenFields P θs fs (.inr S) = none := by
  induction fs with
  | nil => rfl
  | cons e rest ih =>
    obtain ⟨l, v⟩ := e
    simp [cvDenFields, ih]

theorem cvDenFields_inl_ne_none (P : SigProblem Label B)
    (θs : CAssign Label B) {fs : List (Label × CellV Label B)} {l : Label}
    (h : cvDenFields P θs fs (.inl l) ≠ none) : l ∈ fs.map Prod.fst := by
  induction fs with
  | nil => exact absurd rfl h
  | cons e rest ih =>
    obtain ⟨l', v⟩ := e
    by_cases hl : l = l'
    · subst hl; simp
    · simp only [cvDenFields, Sum.inl.injEq, hl, ↓reduceIte] at h
      exact List.mem_cons_of_mem _ (ih h)

theorem cpieceRow_inl_ne_none (P : SigProblem Label B) (θs : CAssign Label B)
    {q : CellPiece Label} {l : Label} (h : cpieceRow P θs q (.inl l) ≠ none) :
    q.row ∈ P.rigidRow ∧ l ∈ q.labels ∧ θs.row q.row (.inl l) ≠ none := by
  simp only [cpieceRow] at h
  split at h
  · rename_i hc; exact ⟨hc.1, hc.2, h⟩
  · exact absurd rfl h

theorem cpieceRow_inr_ne_none (P : SigProblem Label B) (θs : CAssign Label B)
    {q : CellPiece Label} {S : Cell} (h : cpieceRow P θs q (.inr S) ≠ none) :
    q.row ∈ P.rigidRow ∧ q.selects S = true ∧
      θs.row q.row (.inr S) ≠ none := by
  simp only [cpieceRow] at h
  split at h
  · rename_i hc; exact ⟨hc.1, hc.2, h⟩
  · exact absurd rfl h

variable [DecidableEq B]

/-- Stream B's lemma (`cellCheck_certOk`), as a Prop. -/
def CellCheckCertOk : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    cellCheck P Q σ = true → certOkC P Q σ = true

omit [DecidableEq B] in
/-- `rowC`'s parts denote the row the combined assignment holds (the
whole piece of a rigid row is the row itself, given `WithinC`). -/
theorem rowC_den (P : SigProblem Label B) (θs : CAssign Label B)
    (σ : CellCert Label B) (hW : WithinC P θs) {r : Nat}
    {x : CRow Label B} (h : rowC P σ r = some x) :
    (combine (cliftP P) θs (cinst P θs σ)).row r =
      union (cvDenFields P θs x.1) (cpiecesRow P θs x.2) := by
  unfold rowC at h
  by_cases hr : r ∈ P.rigidRow
  · simp only [hr, ↓reduceIte, Option.some.injEq] at h
    subst h
    have hc : (combine (cliftP P) θs (cinst P θs σ)).row r = θs.row r := by
      simp [combine, cliftP, hr]
    rw [hc]
    show θs.row r = union Row.empty (union (cpieceRow P θs (wholePiece P r)) Row.empty)
    rw [union_empty_left, union_empty_right]
    funext k
    cases k with
    | inl l =>
      simp only [cpieceRow, wholePiece, hr, true_and]
      by_cases hl : l ∈ written P
      · simp [hl]
      · have hw := (hW.2 r hr)
        simp only [WithinG] at hw
        have : θs.row r (.inl l) = none := by
          apply Classical.byContradiction; intro hne; exact hl (hw.1 l hne)
        simp [hl, this]
    | inr S =>
      simp [cpieceRow, wholePiece, CellPiece.selects, hr, cubeSat]
  · simp only [hr, ↓reduceIte] at h
    have hc : (combine (cliftP P) θs (cinst P θs σ)).row r =
        ((σ.row.lookup r).map (cvDenRowOf P θs)).getD Row.empty := by
      simp [combine, cliftP, hr, cinst]
    rw [hc]
    cases hl : σ.row.lookup r with
    | none =>
      rw [hl] at h
      simp only [Option.getD_none, Option.some.injEq] at h
      subst h
      funext k
      simp [cvDenFields, cpiecesRow, union, Row.empty]
    | some v =>
      rw [hl] at h
      cases v with
      | record fs ps =>
        simp only [Option.getD_some, Option.some.injEq] at h
        subst h
        rfl
      | base _ => simp at h
      | rty _ => simp at h
      | arrow _ _ => simp at h

/-! ### Queries -/

section Region
variable {P : SigProblem Label B} {Q : CellQ Label} {θs : CAssign Label B}

omit [DecidableEq B] in
theorem qs_possW (hQ : QSound P Q) (hreg : InCellRegion P θs) {r : Nat}
    (hr : r ∈ P.rigidRow) {l : Label} (h : Q.possW r l = false) :
    θs.row r (.inl l) = none :=
  (hQ θs hreg r hr r hr).1 l h

omit [DecidableEq B] in
/-- A `lackC` part has no piece holding `l`. -/
theorem lackC_sound (hQ : QSound P Q) (hreg : InCellRegion P θs)
    {ps : List (CellPiece Label)} {l : Label} (h : lackC Q ps l = true) :
    cpiecesRow P θs ps (.inl l) = none := by
  apply Classical.byContradiction; intro hne
  obtain ⟨q, hq, hne⟩ := cpiecesRow_ne_none P θs hne
  obtain ⟨hr, hl, hθ⟩ := cpieceRow_inl_ne_none P θs hne
  have h1 := List.all_eq_true.1 h q hq
  simp only [hl, decide_true, Bool.not_true, Bool.false_or,
    Bool.not_eq_eq_eq_not, Bool.not_true] at h1
  exact hθ (qs_possW hQ hreg hr h1)

omit [DecidableEq B] in
/-- Apart parts denote disjoint rows (CD2's content, proved here for the
parts `atomC` reads). -/
theorem apartC_sound (hQ : QSound P Q) (hreg : InCellRegion P θs)
    {x y : CRow Label B} (h : apartC Q x y = true) :
    Composition.Disjoint
      (union (cvDenFields P θs x.1) (cpiecesRow P θs x.2))
      (union (cvDenFields P θs y.1) (cpiecesRow P θs y.2)) := by
  simp only [apartC, Bool.and_eq_true, List.all_eq_true] at h
  obtain ⟨⟨hxf, hyf⟩, hpp⟩ := h
  intro k
  apply Classical.byContradiction; intro hk
  simp only [not_or] at hk
  obtain ⟨ha, hb⟩ := hk
  rcases union_ne_none ha with ha | ha <;>
    rcases union_ne_none hb with hb | hb
  · -- field / field
    cases k with
    | inr S => exact ha (cvDenFields_inr P θs _ S)
    | inl l =>
      obtain ⟨e, he, rfl⟩ := List.mem_map.1 (cvDenFields_inl_ne_none P θs ha)
      obtain ⟨e', he', hee⟩ := List.mem_map.1 (cvDenFields_inl_ne_none P θs hb)
      have := hxf e he
      simp only [Bool.not_eq_eq_eq_not, Bool.not_true, List.any_eq_false,
        decide_eq_true_eq] at this
      exact this.1 e' he' hee
  · -- field / piece
    cases k with
    | inr S => exact ha (cvDenFields_inr P θs _ S)
    | inl l =>
      obtain ⟨e, he, rfl⟩ := List.mem_map.1 (cvDenFields_inl_ne_none P θs ha)
      have := (hxf e he).2
      exact hb (lackC_sound hQ hreg this)
  · -- piece / field
    cases k with
    | inr S => exact hb (cvDenFields_inr P θs _ S)
    | inl l =>
      obtain ⟨e, he, rfl⟩ := List.mem_map.1 (cvDenFields_inl_ne_none P θs hb)
      exact ha (lackC_sound hQ hreg (hyf e he))
  · -- piece / piece
    obtain ⟨q, hq, ha⟩ := cpiecesRow_ne_none P θs ha
    obtain ⟨q', hq', hb⟩ := cpiecesRow_ne_none P θs hb
    have hap := hpp q hq q' hq'
    simp only [piecesApart, Bool.and_eq_true, List.all_eq_true] at hap
    cases k with
    | inl l =>
      obtain ⟨hr, hl, hθ⟩ := cpieceRow_inl_ne_none P θs ha
      obtain ⟨hr', hl', hθ'⟩ := cpieceRow_inl_ne_none P θs hb
      have h1 := hap.1 l hl
      simp only [hl', decide_true, Bool.not_true, Bool.false_or,
        Bool.not_eq_eq_eq_not] at h1
      rcases (hQ θs hreg q.row hr q'.row hr').2.1 l h1 with h2 | h2
      · exact hθ h2
      · exact hθ' h2
    | inr S =>
      obtain ⟨hr, hs, hθ⟩ := cpieceRow_inr_ne_none P θs ha
      obtain ⟨hr', hs', hθ'⟩ := cpieceRow_inr_ne_none P θs hb
      simp only [CellPiece.selects, List.any_eq_true] at hs hs'
      obtain ⟨K, hK, hKS⟩ := hs
      obtain ⟨K', hK', hKS'⟩ := hs'
      have h1 := hap.2 K hK K' hK'
      simp only [Bool.not_eq_eq_eq_not, Bool.not_true] at h1
      have hsat : cubeSat S (K ++ K') = true := by
        simp only [cubeSat, List.all_append, Bool.and_eq_true] at hKS hKS' ⊢
        exact ⟨hKS, hKS'⟩
      rcases (hQ θs hreg q.row hr q'.row hr').2.2.1 _ S h1 hsat with h2 | h2
      · exact hθ h2
      · exact hθ' h2

end Region

end Composition.Typed.Cells.ProofsF

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed
open Composition.Typed.Cells.ProofsF

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- CB2, from CI3 (`EvalCommutes`), CB3 (`EqSound`) and CB4 (`EvalWf`).
Rows (`lacks`, `disjoint`) are proved here from `QSound` and `WithinC`
directly. -/
theorem atomSound_of
    (hCI3 : EvalCommutes (Label := Label) (B := B))
    (hCB3 : EqSound (Label := Label) (B := B))
    (hCB4 : EvalWf (Label := Label) (B := B)) :
    AtomSound (Label := Label) (B := B) := by
  intro P Q σ hQ hok θs hreg a ha
  have hW : WithinC P θs := by
    obtain ⟨_, _, _, hW, _⟩ := hreg; exact hW
  cases a with
  | eq t u =>
    simp only [atomC] at ha
    split at ha
    · rename_i a b ht hu
      refine ⟨cvDen P θs a, hCI3 P Q σ hQ hok θs hreg t a ht, ?_⟩
      rw [hCI3 P Q σ hQ hok θs hreg u b hu]
      exact congrArg some (hCB3 P Q hQ θs hreg a b
        (hCB4 P Q σ hok t a ht) (hCB4 P Q σ hok u b hu) ha).symm
    · exact absurd ha (by simp)
  | lacks r l =>
    simp only [atomC] at ha
    split at ha
    · rename_i x hx
      simp only [Bool.and_eq_true, Bool.not_eq_eq_eq_not, Bool.not_true,
        decide_eq_false_iff_not] at ha
      show (combine (cliftP P) θs (cinst P θs σ)).row r (.inl l) = none
      rw [rowC_den P θs σ hW hx]
      apply Classical.byContradiction; intro hne
      rcases union_ne_none hne with h | h
      · exact ha.1 (cvDenFields_inl_ne_none P θs h)
      · exact h (lackC_sound hQ hreg ha.2)
    · exact absurd ha (by simp)
  | disjoint r s =>
    simp only [atomC] at ha
    split at ha
    · rename_i x y hx hy
      show Composition.Disjoint
        ((combine (cliftP P) θs (cinst P θs σ)).row r)
        ((combine (cliftP P) θs (cinst P θs σ)).row s)
      rw [rowC_den P θs σ hW hx, rowC_den P θs σ hW hy]
      exact apartC_sound hQ hreg ha
    · exact absurd ha (by simp)
  | ff => simp [atomC] at ha

/-- CM, from CB2 (`AtomSound`), CI2 (`CInstFin`), CB1 (`BodyAll`) and
stream B's `CellCheckCertOk`. -/
theorem cellSound_of
    (hCB2 : AtomSound (Label := Label) (B := B))
    (hCI2 : CInstFin (Label := Label) (B := B))
    (hCB1 : BodyAll (Label := Label) (B := B))
    (hok : CellCheckCertOk (Label := Label) (B := B)) :
    CellSound (Label := Label) (B := B) := by
  intro P Q σ hQ hc π θs hI hG hW hS
  have hreg : InCellRegion P θs := ⟨π, hI, hG, hW, hS⟩
  refine ⟨hCI2 P θs σ hG.1, ?_⟩
  intro a ha
  obtain ⟨a0, ha0, rfl⟩ := List.mem_map.1 ha
  exact hCB2 P Q σ hQ (hok P Q σ hc) θs hreg a0 (hCB1 P Q σ hc a0 ha0)

/-- CM-open, from CM, CG (`FragmentIff`), CV1 (`CoverFree`) and B5
(`d3bSoundOpen`). -/
theorem cellOpen_of
    (hCM : CellSound (Label := Label) (B := B))
    (hCG : FragmentIff (Label := Label) (B := B))
    (hCV1 : CoverFree (Label := Label) (B := B)) :
    CellOpen (Label := Label) (B := B) := by
  intro P Q σ hQ hc
  have hfrag : fragmentS P = true := by
    simp only [cellCheck, Bool.and_eq_true] at hc; exact hc.1.1
  have hLD := (hCG P).1 hfrag
  refine d3bSoundOpen P fun π hI => ?_
  obtain ⟨hG, hW, hS⟩ := hCV1 P π hLD hI
  obtain ⟨hfin, hsat⟩ := hCM P Q σ hQ hc π (thetaFree P π) hI hG hW hS
  exact ⟨thetaFree P π, hG, cinst P (thetaFree P π) σ, hfin, hsat⟩

/-- CM-impl, from CM-open and CV2 (`ImplSound`). -/
theorem cellOpenImpl_of
    (hCO : CellOpen (Label := Label) (B := B))
    (hCV2 : ImplSound (Label := Label) (B := B)) :
    CellOpenImpl (Label := Label) (B := B) :=
  fun P σ h => hCO P (implQ P) σ (hCV2 P) h

end Composition.Typed.Cells
