/-
Non-vacuity of D3b, continued: `route` is valid (over all values and
over finite ones) through its generic instance alone, by `d3bEqFree`,
`routeP_solvable` and `d3bValidAll`. The control, `split` without its
hypothesis, has a generic instance with no solution, and is invalid.
-/
import Composition.Typed.Examples

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
theorem routeP_scoped : Scoped (routeP : SigProblem Label B) := by
  constructor <;> intro n hn <;>
    simp_all [routeP, tyVarsOf, rowVarsOf]

omit [DecidableEq Label] in
theorem routeP_eqFree : EqFree (routeP : SigProblem Label B) := by
  intro a ha
  simp only [routeP, List.mem_singleton] at ha
  subst ha
  trivial

theorem routeP_hasInstance (π : Pattern Label) :
    HasInstance (routeP : SigProblem Label B) π :=
  hasInstance_noLabels written_routeP (fun a ha => by
    simp only [routeP, List.mem_singleton] at ha
    subst ha
    intro l
    exact Or.inl rfl) π

/-- `route` is valid, certified by one solution per pattern at its
generic instance. -/
theorem routeP_valid :
    ValidAll (routeP : SigProblem Label B) ∧
      ValidFin (routeP : SigProblem Label B) := by
  have hg : ∀ π, GenericInst (routeP : SigProblem Label B) π
      (thetaFree routeP π) := fun π =>
    (d3bEqFree _ π routeP_scoped routeP_eqFree (routeP_hasInstance π)).1
  refine ⟨(d3bValidAll routeP).1 fun π _ => ⟨_, hg π, ?_⟩,
    (d3bValidAll routeP).2 fun π _ => ⟨_, hg π, routeP_solvable π⟩⟩
  obtain ⟨σ, _, hσ⟩ := routeP_solvable (B := B) π
  exact ⟨σ, hσ⟩

/-- `split` without its hypothesis (dossier §13.7, `split-undeclared`):
`∀ r s t. ∃ u v. r = u ⊎ v, u disjoint s, v disjoint t`. -/
def splitFree : SigProblem Label B :=
  ⟨[], [0, 1, 2], [],
   [.eq (.record .nil [0]) (.record .nil [3, 4]), .disjoint 3 1,
    .disjoint 4 2]⟩

omit [DecidableEq Label] in
theorem splitFree_core {L V : Type} {r u v s t : Row L V} {k : L}
    (hr : r k ≠ none) (huv : r = union u v) (hus : Composition.Disjoint u s)
    (hvt : Composition.Disjoint v t) (hs : s k ≠ none) (ht : t k ≠ none) :
    False := by
  subst huv
  rcases union_ne_none.mp hr with h | h
  · rcases hus k with h' | h'
    · exact h h'
    · exact hs h'
  · rcases hvt k with h' | h'
    · exact h h'
    · exact ht h'

/-- The body forces `r = u ⊎ v` for the rows it composes. -/
theorem split_eq {Lb Bb : Type} [DecidableEq Lb] {Γ : Assign Lb Bb}
    (h : Holds Γ (.eq (.record .nil [0]) (.record .nil [3, 4]))) :
    Γ.row 0 = union (Γ.row 3) (Γ.row 4) := by
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

theorem combine_row_rigid {Lb Bb : Type} {P : SigProblem Lb Bb}
    {θR θF : Assign Lb Bb} {r : Nat} (h : r ∈ P.rigidRow) :
    (combine P θR θF).row r = θR.row r := by
  simp [combine, h]

/-- At the generic instance, the cell of all three rows has nowhere to
go: no solution. -/
theorem splitFree_unsolvable (π : Pattern Label) :
    ¬ SolvableAt (splitFree : SigProblem Label B) (thetaFree splitFree π) := by
  rintro ⟨σ, hσ⟩
  have hS : [0, 1, 2] ∈ freeCells (splitFree : SigProblem Label B) :=
    mem_freeCells.mpr ⟨by show [0, 1, 2] ∈ subsets [0, 1, 2]; decide,
      by simp, fun _ _ _ _ h => by simp [splitFree] at h⟩
  have hrow : ∀ r ∈ [0, 1, 2], (combine (cliftP splitFree)
      (thetaFree (splitFree : SigProblem Label B) π) σ).row r
        (.inr [0, 1, 2]) ≠ none := fun r hr => by
    rw [combine_row_rigid (by simpa [cliftP, splitFree] using hr)]
    show etaRow splitFree π (freeCells splitFree) r (.inr [0, 1, 2]) ≠ none
    simp only [etaRow, hS, true_and]
    simp [hr]
  exact splitFree_core (hrow 0 (by simp))
    (split_eq (hσ _ (by simp [cliftP, splitFree, cliftAtom, cliftT, cliftF])))
    (hσ (.disjoint 3 1) (by simp [cliftP, splitFree, cliftAtom]))
    (hσ (.disjoint 4 2) (by simp [cliftP, splitFree, cliftAtom]))
    (hrow 1 (by simp)) (hrow 2 (by simp))

/-- The control is invalid: every rigid row holding one label `z`. -/
theorem splitFree_not_valid (z : Label) :
    ¬ ValidAll (splitFree : SigProblem Label B) := by
  intro hv
  obtain ⟨θF, h⟩ := hv ⟨fun _ => emptyG, fun _ => oneField z⟩
    (by simp [Sat, splitFree])
  have hz : ∀ r ∈ [0, 1, 2], (combine splitFree
      ⟨fun _ => emptyG, fun _ => oneField (B := B) z⟩ θF).row r z ≠ none :=
    fun r hr => by
      simp only [List.mem_cons, List.not_mem_nil, or_false] at hr
      rcases hr with rfl | rfl | rfl <;>
        simp [combine, splitFree, oneField, single]
  exact splitFree_core (hz 0 (by simp))
    (split_eq (h _ (by simp [splitFree])))
    (h (.disjoint 3 1) (by simp [splitFree]))
    (h (.disjoint 4 2) (by simp [splitFree])) (hz 1 (by simp)) (hz 2 (by simp))

end Composition.Typed
