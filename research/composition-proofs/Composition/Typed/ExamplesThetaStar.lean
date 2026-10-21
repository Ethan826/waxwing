/-
`thetaStar` on the worked examples (review F6 of
research/division-campaign/reviews/d3b-existence-review.md). The other
examples certify through `thetaFree` and `thetaFlat`; these check D3b's
general construction `thetaStar` itself.

These are theorem-level checks about a classical construction, not a
run of a computed one. `allowedCells` is a classical filter on an
existential over all substitutions, and `thetaStar` takes an arbitrary
MGU `τ` as an argument, so θ* is fixed only up to the choice of MGU.
Each check quantifies over every such `τ` or obtains one by
`mguExists`. Nothing here evaluates `allowedCells` or `thetaStar`.
The three problems write no label, so each check holds at every
pattern `π`; `z` is any label, used for a one-field instance.

- `route`: every generic instance occupies the cell `{r}` (`[0]`), so
  the cell-free pre-instance is not generic; `[0]` is allowed and
  `[1, 2]` is not (`s disjoint t`).
- `agree` (`r = s ⊎ t`): `{r}` alone is not allowed; `Fresh` holds at
  `Label := List Nat`, `B := CConst (List Nat)`, and there `thetaStar`
  is solvable for every MGU, through `thetaStar_valid_iff_fresh`.
- `split` without its hypothesis: no solution at `thetaStar` for any
  MGU, through `universality` and `d3bSound`, with no `Fresh`.
-/
import Composition.Typed.Conditional
import Composition.Typed.ExamplesFlat

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### `route` -/

/-- The instance of `route` in which row 0 holds label `z` alone. -/
def routeInst (z : Label) : Assign Label B :=
  ⟨fun _ => emptyG, fun r k =>
    if r = 0 ∧ k = z then some emptyG else none⟩

theorem routeInst_sat (z : Label) :
    Sat (routeInst (B := B) z) (routeP : SigProblem Label B).D := by
  intro a ha
  simp only [routeP, List.mem_singleton] at ha
  subst ha
  intro k
  simp [routeInst]

theorem routeInst_inPattern (z : Label) (π : Pattern Label) :
    InPattern (routeP : SigProblem Label B) π (routeInst z) := by
  intro _ _ l hl
  rw [written_routeP] at hl
  cases hl

theorem routeInst_cellOf (z : Label) :
    cellOf (routeP : SigProblem Label B) (routeInst z) z = [0] := by
  simp [cellOf, routeP, routeInst]

/-- Every generic instance of `route` occupies the cell `{r}`. -/
theorem routeP_generic_occupies (z : Label) (π : Pattern Label)
    (θs : CAssign Label B) (h : GenericInst routeP π θs) :
    θs.row 0 (.inr [0]) ≠ none := by
  intro h0
  obtain ⟨ν, _, _, hrow⟩ :=
    h.2.2.2 _ (routeInst_sat z) (routeInst_inPattern z π)
  have hz := congrFun (hrow 0 (by simp [routeP])) z
  have hw := written_routeP (Label := Label) (B := B)
  simp only [hvRow, hw, List.not_mem_nil, ite_false, routeInst_cellOf,
    h0, hvO] at hz
  simp [routeInst] at hz

/-- The cell-free pre-instance of `route` is not generic. -/
theorem routeP_eta_not_generic (z : Label) (π : Pattern Label) :
    ¬ GenericInst (routeP : SigProblem Label B) π (eta routeP π []) :=
  fun h => routeP_generic_occupies z π _ h (by simp [eta, etaRow])

/-- `{r}` is an allowed cell of `route`. -/
theorem routeP_allowed_r (z : Label) (π : Pattern Label) :
    [0] ∈ allowedCells (routeP : SigProblem Label B) π := by
  have h := occupied_allowed routeP_scoped (routeInst_sat (B := B) z)
    (routeInst_inPattern z π) (k := z) (by simp [written_routeP])
    (by simp [routeInst_cellOf])
  rwa [routeInst_cellOf] at h

/-- `{s, t}` is not allowed: `s disjoint t`. -/
theorem routeP_not_allowed_st (π : Pattern Label) :
    [1, 2] ∉ allowedCells (routeP : SigProblem Label B) π := by
  intro h
  simp only [allowedCells, List.mem_filter, decide_eq_true_eq] at h
  obtain ⟨τ, hτ⟩ := h.2
  have hd := hτ (.disjoint 1 2) (by simp [cliftP, routeP, cliftAtom])
  rcases hd (.inr [1, 2]) with h1 | h1 <;>
    simp [thetaOf, eta, etaRow, substO] at h1

/-- `thetaStar` occupies `{r}`, for every MGU over the allowed cells. -/
theorem routeP_thetaStar_occupies (z : Label) (π : Pattern Label)
    (τ : CSubst Label B)
    (hM : IsMGU routeP π (allowedCells (B := B) routeP π) τ) :
    (thetaStar routeP π τ).row 0 (.inr [0]) ≠ none :=
  routeP_generic_occupies z π _ (universality routeP π τ routeP_scoped
    (routeP_hasInstance π) hM).1

/-- The instance `d3bExistsWithin` gives occupies `{r}`. -/
theorem routeP_exists_occupies (z : Label) (π : Pattern Label) :
    ∃ θs, GenericInst (routeP : SigProblem Label B) π θs ∧
      WithinC routeP θs ∧ θs.row 0 (.inr [0]) ≠ none := by
  obtain ⟨θs, hg, hW⟩ :=
    d3bExistsWithin routeP π routeP_scoped (routeP_hasInstance π)
  exact ⟨θs, hg, hW, routeP_generic_occupies z π θs hg⟩

/-! ### `agree` -/

/-- An equation `a = b ⊎ c` between row variables. -/
theorem eq_union {Lb Bb : Type} [DecidableEq Lb] {Γ : Assign Lb Bb}
    {a b c : Nat}
    (h : Holds Γ (.eq (.record .nil [a]) (.record .nil [b, c]))) :
    Γ.row a = union (Γ.row b) (Γ.row c) := by
  obtain ⟨g, h1, h2⟩ := h
  rw [evalT_tails] at h1 h2
  simp only [List.map_cons, List.map_nil, composeAll_single,
    Option.map_some, Option.some.injEq] at h1
  subst h1
  simp only [List.map_cons, List.map_nil, composeAll, compose_empty,
    Option.bind_some, Option.map_eq_some_iff] at h2
  obtain ⟨w, hw, hwg⟩ := h2
  obtain ⟨_, rfl⟩ := compose_eq_some.mp hw
  exact (G.record.inj hwg).symm

/-- `r = s ⊎ t` refuses `{r}` alone. -/
theorem agreeP_not_allowed_r (π : Pattern Label) :
    ¬ Allowed (agreeP : SigProblem Label B) π [0] := by
  rintro ⟨τ, hτ⟩
  have he := eq_union (hτ _ (List.mem_map_of_mem (f := cliftAtom)
    (List.mem_singleton_self _)))
  have h0 := congrFun he (.inr [0])
  simp [thetaOf, eta, etaRow, substO, union] at h0

/-- `Fresh` holds for `agree` at `Label := List Nat`,
`B := CConst (List Nat)`, with the identity maps. -/
theorem agreeP_fresh :
    Fresh (agreeP : SigProblem (List Nat) (CConst (List Nat))) id id := by
  refine ⟨fun _ _ h => h, fun S => ?_, fun _ _ h => h, fun c => ?_⟩
  · simp [written_agreeP]
  · simp [basesOf, agreeP, basesT, basesF]

/-- `agree` at `Label := List Nat`, `B := CConst (List Nat)`. -/
local notation "agreeN" =>
  (agreeP : SigProblem (List Nat) (CConst (List Nat)))

/-- At those types, `thetaStar` solves `agree` for every MGU over the
allowed cells. -/
theorem agreeP_thetaStar_solvable (π : Pattern (List Nat))
    (τ : CSubst (List Nat) (CConst (List Nat)))
    (hM : IsMGU agreeN π (allowedCells agreeN π) τ) :
    SolvableAt agreeN (thetaStar agreeN π τ) ∧
      SolvableFinAt agreeN (thetaStar agreeN π τ) := by
  have h := thetaStar_valid_iff_fresh agreeP_scoped
    (agreeP_hasInstance π) hM agreeP_fresh
  exact ⟨h.1.1 fun θR hD _ => agreeP_valid.1 θR hD,
    h.2.1 fun θR hR hD _ => agreeP_valid.2 θR hR.1 hR.2 hD⟩

/-- Some MGU over the allowed cells exists, and `thetaStar` at it solves
`agree`. -/
theorem agreeP_thetaStar_exists (π : Pattern (List Nat)) :
    ∃ τ, IsMGU agreeN π (allowedCells agreeN π) τ ∧
      SolvableAt agreeN (thetaStar agreeN π τ) := by
  obtain ⟨τ, hM⟩ := mguExists agreeP π _
    (cellIndependence agreeP π agreeP_scoped (agreeP_hasInstance π))
  exact ⟨τ, hM, (agreeP_thetaStar_solvable π τ hM).1⟩

/-! ### `split` without its hypothesis -/

omit [DecidableEq Label] in
theorem splitFree_scoped : Scoped (splitFree : SigProblem Label B) := by
  constructor <;> intro n hn <;> simp_all [splitFree, tyVarsOf, rowVarsOf]

omit [DecidableEq Label] in
theorem written_splitFree :
    written (splitFree : SigProblem Label B) = [] := by
  simp [written, labelsOf, splitFree, labelsT, labelsF]

theorem splitFree_hasInstance (π : Pattern Label) :
    HasInstance (splitFree : SigProblem Label B) π :=
  hasInstance_noLabels written_splitFree (by simp [Sat, splitFree]) π

/-- `thetaStar` does not certify the invalid control: no solution, for
any MGU over the allowed cells, with no freshness premise. -/
theorem splitFree_thetaStar_unsolvable (z : Label) (π : Pattern Label)
    (τ : CSubst Label B)
    (hM : IsMGU splitFree π (allowedCells (B := B) splitFree π) τ) :
    ¬ SolvableAt splitFree (thetaStar splitFree π τ) := by
  intro hs
  have hg := (universality splitFree π τ splitFree_scoped
    (splitFree_hasInstance π) hM).1
  have hv := (d3bSound splitFree π _ hg).1 hs
  exact splitFree_not_valid z fun θR hD => hv θR hD fun _ _ l hl => by
    rw [written_splitFree] at hl
    cases hl

end Composition.Typed
