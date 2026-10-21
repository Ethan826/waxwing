/-
Proof stream E (cell checker, first soundness tranche): CI3
`EvalCommutes` and CD3 `EvalDefined`, from CI1 `PieceIsSubRow` and CD2
`ApartSound` as hypotheses. Plan: research/division-campaign/cellcheck/
proof-plan.md. Structural induction over the evaluator: written fields
by `evalFC`'s own duplicate check, rigid tails by CI1, flexible tails
by `cinst`, and the left fold of `composeC` against the right fold of
`composeAll` by CD2 at every step.
-/
import Composition.Typed.Cell.Proofs.E.Rows

namespace Composition.Typed.Cells.ProofsE

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

section Main
variable (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B)
  (θs : CAssign Label B)

/-- The assignment the ordinary evaluator reads. -/
abbrev θc : CAssign Label B := combine (cliftP P) θs (cinst P θs σ)

theorem cvDen_empty_record :
    cvDen P θs (.record [] [] : CellV Label B) = emptyG := by
  simp only [cvDen, cvDenFields, cpiecesRow, List.foldr_nil, emptyG]
  congr 1

theorem tyC_den (n : Nat) :
    (θc P σ θs).ty n = cvDen P θs (tyC P σ n) := by
  simp only [combine, cliftP, tyC, cinst]
  by_cases hn : n ∈ P.rigidTy
  · simp [hn, cvDen]
  · simp only [hn, ite_false]
    cases hl : σ.ty.lookup n with
    | none => simp [cvDen_empty_record]
    | some v => simp

theorem rowC_den (hci1 : PieceIsSubRow (Label := Label) (B := B))
    (hw : WithinC P θs) (r : Nat) (x : CRow Label B)
    (h : rowC P σ r = some x) :
    (θc P σ θs).row r = rowDen P θs x := by
  simp only [combine, cliftP, rowC, cinst] at h ⊢
  by_cases hr : r ∈ P.rigidRow
  · simp only [hr, ite_true, Option.some.injEq] at h ⊢
    subst h
    have := (hci1 P θs hw r hr).1
    simp [rowDen, cvDenFields, cpiecesRow, empty_union, union_empty, this]
  · simp only [hr, ite_false] at h ⊢
    cases hl : σ.row.lookup r with
    | none =>
      simp only [hl, Option.getD_none, Option.some.injEq] at h
      subst h
      simp [rowDen, cvDenFields, cpiecesRow, empty_union]
    | some v =>
      simp only [hl, Option.getD_some] at h
      cases v with
      | record fs ps =>
        simp only [Option.some.injEq] at h
        subst h
        simp [rowDen, cvDenRowOf]
      | base _ => simp at h
      | rty _ => simp at h
      | arrow _ _ => simp at h

theorem tails_den (hci1 : PieceIsSubRow (Label := Label) (B := B))
    (hw : WithinC P θs) (tails : List Nat) (rs : List (CRow Label B))
    (h : tails.mapM (rowC P σ) = some rs) :
    tails.map (θc P σ θs).row = rs.map (rowDen P θs) := by
  induction tails generalizing rs with
  | nil =>
    simp at h
    subst h
    rfl
  | cons r rest ih =>
    simp only [List.mapM_cons, bind, Option.bind_eq_some_iff, pure,
      Option.some.injEq] at h
    obtain ⟨x, hx, xs, hxs, rfl⟩ := h
    simp [rowC_den P σ θs hci1 hw r x hx, ih xs hxs]

mutual
  theorem evalC_commutes (hci1 : PieceIsSubRow (Label := Label) (B := B))
      (hcd2 : ApartSound (Label := Label) (B := B))
      (hQ : QSound P Q) (hreg : InCellRegion P θs) :
      ∀ (t : TExpr Label B) (v : CellV Label B),
      evalC P Q σ t = some v →
      evalT (θc P σ θs) (cliftT t) = some (cvDen P θs v)
    | .base b, v, h => by
      simp only [evalC, Option.some.injEq] at h
      subst h
      simp [evalT, cliftT, cvDen]
    | .arrow t u, v, h => by
      simp only [evalC, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
      obtain ⟨a, ha, c, hc, rfl⟩ := h
      have iha := evalC_commutes hci1 hcd2 hQ hreg t a ha
      have ihc := evalC_commutes hci1 hcd2 hQ hreg u c hc
      simp [evalT, cliftT, iha, ihc, cvDen]
    | .tvar n, v, h => by
      simp only [evalC, Option.some.injEq] at h
      subst h
      simp only [cliftT, evalT]
      rw [tyC_den]
    | .record fs tails, v, h => by
      simp only [evalC, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
      obtain ⟨fr, hfr, rs, hrs, x, hx, rfl⟩ := h
      have ihf := evalFC_commutes hci1 hcd2 hQ hreg fs fr hfr
      have hw : WithinC P θs := by
        obtain ⟨_, _, _, hw, _⟩ := hreg
        exact hw
      have htails := tails_den P σ θs hci1 hw tails rs hrs
      have hap : ∀ x y : CRow Label B, apartC Q x y = true →
          Composition.Disjoint (rowDen P θs x) (rowDen P θs y) :=
        fun x y hxy => hcd2 P Q hQ θs hreg x y hxy
      have hall := composeC_composeAll P Q θs hap _ x hx
      simp only [List.map_cons] at hall
      have hfr0 : rowDen P θs ((fr, []) : CRow Label B) =
          cvDenFields P θs fr := by
        simp [rowDen, cpiecesRow, union_empty]
      rw [hfr0, ← htails] at hall
      simp only [cliftT, evalT, ihf, Option.bind_some, hall, Option.map_some,
        cvDen]
      rfl

  theorem evalFC_commutes (hci1 : PieceIsSubRow (Label := Label) (B := B))
      (hcd2 : ApartSound (Label := Label) (B := B))
      (hQ : QSound P Q) (hreg : InCellRegion P θs) :
      ∀ (fs : Fields Label B)
      (r : List (Label × CellV Label B)),
      evalFC P Q σ fs = some r →
      evalF (θc P σ θs) (cliftF fs) = some (cvDenFields P θs r)
    | .nil, r, h => by
      simp only [evalFC, Option.some.injEq] at h
      subst h
      simp [evalF, cliftF, cvDenFields]
    | .cons l t rest, r, h => by
      simp only [evalFC, Option.bind_eq_some_iff] at h
      obtain ⟨g, hg, r', hr', h⟩ := h
      by_cases hl : l ∈ r'.map Prod.fst
      · simp [hl] at h
      · simp only [hl, ite_false, Option.some.injEq] at h
        subst h
        have iht := evalC_commutes hci1 hcd2 hQ hreg t g hg
        have ihr := evalFC_commutes hci1 hcd2 hQ hreg rest r' hr'
        simp only [cliftF, evalF, iht, ihr, Option.bind_some]
        rw [compose_eq_some]
        refine ⟨fun k => ?_, ?_⟩
        · by_cases hk : k = .inl l
          · subst hk
            exact Or.inr (cvDenFields_notMem P θs r' l hl)
          · exact Or.inl (by simp [single, hk])
        · funext k
          by_cases hk : k = .inl l
          · subst hk
            simp [union, single, cvDenFields]
          · simp [union, single, cvDenFields, hk]
end

end Main

end Composition.Typed.Cells.ProofsE

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-- CI3 from CI1 and CD2. `certOkC` is not used: the evaluator's own
checks (duplicate labels, `rowC` refusing non-records, `composeC`'s
apartness) suffice. -/
theorem evalCommutes_of (hci1 : PieceIsSubRow (Label := Label) (B := B))
    (hcd2 : ApartSound (Label := Label) (B := B)) :
    EvalCommutes (Label := Label) (B := B) := by
  intro P Q σ hQ _ θs hreg t v h
  exact ProofsE.evalC_commutes P Q σ θs hci1 hcd2 hQ hreg t v h

/-- CD3 from CI1 and CD2, through CI3. -/
theorem evalDefined_of (hci1 : PieceIsSubRow (Label := Label) (B := B))
    (hcd2 : ApartSound (Label := Label) (B := B)) :
    EvalDefined (Label := Label) (B := B) := by
  intro P Q σ hQ hok θs hreg t v h
  rw [evalCommutes_of hci1 hcd2 P Q σ hQ hok θs hreg t v h]
  rfl

end Composition.Typed.Cells
