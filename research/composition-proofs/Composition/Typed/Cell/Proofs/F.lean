/-
Proof stream F (cell checker, assembly): CB2 `AtomSound`, CM
`CellSound`, `CellOpen`, `CellOpenImpl` (dossier §18.54-18.55; plan
research/division-campaign/cellcheck/proof-plan.md). Other streams'
statements enter as hypotheses; B5 is `d3bSoundOpen`. Row lemmas reuse
stream C's proved `apartSound` (CD2) and `ProofsC.lackC_sound`.
-/
import Composition.Typed.Cell.Statements
import Composition.Typed.Cell.Proofs.C
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
/-- A `lackC` part has no piece holding `l` (from stream C's per-piece
`ProofsC.lackC_sound`). -/
theorem lackC_sound (hQ : QSound P Q) (hreg : InCellRegion P θs)
    {ps : List (CellPiece Label)} {l : Label} (h : lackC Q ps l = true) :
    cpiecesRow P θs ps (.inl l) = none := by
  apply Classical.byContradiction; intro hne
  obtain ⟨q, hq, hne⟩ := cpiecesRow_ne_none P θs hne
  exact hne (ProofsC.lackC_sound hQ hreg h q hq)

omit [DecidableEq B] in
/-- Apart parts denote disjoint rows: CD2, stream C's `apartSound`. -/
theorem apartC_sound (hQ : QSound P Q) (hreg : InCellRegion P θs)
    {x y : CRow Label B} (h : apartC Q x y = true) :
    Composition.Disjoint
      (union (cvDenFields P θs x.1) (cpiecesRow P θs x.2))
      (union (cvDenFields P θs y.1) (cpiecesRow P θs y.2)) :=
  apartSound P Q hQ θs hreg x y h

end Region

end Composition.Typed.Cells.ProofsF

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed
open Composition.Typed.Cells.ProofsF

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- CB2, from CI3 (`EvalCommutes`), CB3 (`EqSound`) and CB4 (`EvalWf`).
Rows (`lacks`, `disjoint`) follow from `QSound` and `WithinC`, through
stream C's `lackC_sound` and `apartSound`. -/
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
