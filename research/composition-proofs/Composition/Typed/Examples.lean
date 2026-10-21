/-
Non-vacuity of D3b (construction.md §11): `route` and `split` are
certified through their generic instance, one call-site solution at
`thetaFree` each, with `u` the cells of `r` outside `s` and `v` those
inside (the division of dossier §18.1); `split` without its hypothesis
has no solution at its generic instance and is refuted directly.
-/
import Composition.Typed.EqFree
import Composition.Sig.Adversarial

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- Row `f` restricted to the cells that do (`inside`) or do not hold
rigid row `s`; written labels are dropped. -/
def cellsWith (s : Nat) (inside : Bool) (f : Row (CL Label) (CG Label B)) :
    Row (CL Label) (CG Label B)
  | .inl _ => none
  | .inr S => if decide (s ∈ S) = inside then f (.inr S) else none

omit [DecidableEq Label] in
theorem cellsWith_disjoint (s : Nat) (f : Row (CL Label) (CG Label B)) :
    Composition.Disjoint (cellsWith s false f) (cellsWith s true f) := by
  intro j
  cases j with
  | inl _ => exact Or.inl rfl
  | inr S => by_cases h : s ∈ S <;> simp [cellsWith, h]

omit [DecidableEq Label] in
theorem cellsWith_union (s : Nat) {f : Row (CL Label) (CG Label B)}
    (hf : ∀ l, f (.inl l) = none) :
    union (cellsWith s false f) (cellsWith s true f) = f := by
  funext j
  cases j with
  | inl l => simp [union, cellsWith, hf l]
  | inr S => by_cases h : s ∈ S <;> cases hS : f (.inr S) <;>
      simp [union, cellsWith, h, hS]

omit [DecidableEq Label] in
theorem fin_of_sub {f g : Row (CL Label) (CG Label B)}
    (h : ∀ j, f j = none ∨ f j = g j) (hg : FinG (.record g)) :
    FinG (.record f) := by
  obtain ⟨⟨ls, hls⟩, hv⟩ := (finG_record g).mp hg
  refine (finG_record f).mpr ⟨⟨ls, fun j hj => ?_⟩, fun j => ?_⟩
  · rcases h j with h' | h'
    · exact absurd h' hj
    · exact hls j (h' ▸ hj)
  · rcases h j with h' | h'
    · simp [h', FinO]
    · rw [h']
      exact hv j

omit [DecidableEq Label] in
theorem cellsWith_sub (s : Nat) (b : Bool) (f : Row (CL Label) (CG Label B)) :
    ∀ j, cellsWith s b f j = none ∨ cellsWith s b f j = f j := by
  intro j
  cases j with
  | inl _ => exact Or.inl rfl
  | inr S => by_cases h : decide (s ∈ S) = b <;> simp [cellsWith, h]

/-- `route` (dossier §17): `∀ r s t. s disjoint t ⇒ ∃ u v w x.
r = u ⊎ v, s = w, t = x, u disjoint w, v disjoint x, u disjoint v`. -/
def routeP : SigProblem Label B :=
  ⟨[], [0, 1, 2], [.disjoint 1 2],
   [.eq (.record .nil [0]) (.record .nil [3, 4]),
    .eq (.record .nil [1]) (.record .nil [5]),
    .eq (.record .nil [2]) (.record .nil [6]),
    .disjoint 3 5, .disjoint 4 6, .disjoint 3 4]⟩

omit [DecidableEq Label] in
theorem written_routeP : written (routeP : SigProblem Label B) = [] := by
  simp [written, labelsOf, routeP, labelsT, labelsF]

/-- With no written label, every pattern has the empty instance. -/
theorem hasInstance_noLabels {P : SigProblem Label B} (hw : written P = [])
    (hD : Sat ⟨fun _ => emptyG, fun _ _ => none⟩ P.D) (π : Pattern Label) :
    HasInstance P π :=
  ⟨_, hD, fun _ _ l hl => by rw [hw] at hl; cases hl⟩

/-- No written label: the pre-instance holds no written field. -/
theorem etaRow_inl {P : SigProblem Label B} (hw : written P = [])
    {π : Pattern Label} {C : List Cell} (r : Nat) (l : Label) :
    etaRow P π C r (.inl l) = none := by
  simp [etaRow, hw]

/-- Two rows declared disjoint share no cell of `freeCells`. -/
theorem etaRow_free_disjoint {P : SigProblem Label B} {π : Pattern Label}
    {r s : Nat} (hd : Atom.disjoint r s ∈ P.D) {S : Cell}
    (h1 : etaRow P π (freeCells P) r (.inr S) ≠ none)
    (h2 : etaRow P π (freeCells P) s (.inr S) ≠ none) : False := by
  simp only [etaRow] at h1 h2
  split at h1
  · next hr =>
    split at h2
    · next hs => exact (mem_freeCells.mp hr.1).2.2 r hr.2 s hs.2 hd
    · exact h2 rfl
  · exact h1 rfl

theorem etaRow_inr_mem {P : SigProblem Label B} {π : Pattern Label}
    {C : List Cell} {r : Nat} {S : Cell}
    (h : etaRow P π C r (.inr S) ≠ none) : r ∈ S := by
  simp only [etaRow] at h
  split at h
  · next hr => exact hr.2
  · exact absurd rfl h

theorem etaRow_inr_other {P : SigProblem Label B} {π : Pattern Label}
    {C : List Cell} {r s : Nat} {S : Cell}
    (h : etaRow P π C r (.inr S) ≠ none) (hs : s ∈ S) :
    etaRow P π C s (.inr S) ≠ none := by
  simp only [etaRow] at h ⊢
  split at h
  · next hr => simp [hr.1, hs]
  · exact absurd rfl h

/-- The generic solution of `route`: `u`, `v` divide `r` by `s`. -/
noncomputable def routeSol (P : SigProblem Label B) (π : Pattern Label) :
    CAssign Label B :=
  ⟨fun _ => emptyG, fun n =>
    if n = 3 then cellsWith 1 false (etaRow P π (freeCells P) 0)
    else if n = 4 then cellsWith 1 true (etaRow P π (freeCells P) 0)
    else if n = 5 then etaRow P π (freeCells P) 1
    else if n = 6 then etaRow P π (freeCells P) 2 else Row.empty⟩

theorem routeSol_fin (P : SigProblem Label B) (π : Pattern Label) :
    FinAssign (routeSol P π) := by
  refine ⟨fun _ => finG_emptyG, fun n => ?_⟩
  simp only [routeSol]
  split
  · exact fin_of_sub (cellsWith_sub 1 false _) (eta_fin 0)
  split
  · exact fin_of_sub (cellsWith_sub 1 true _) (eta_fin 0)
  split
  · exact eta_fin 1
  split
  · exact eta_fin 2
  · exact (finG_record _).mpr ⟨⟨[], fun _ h => absurd rfl h⟩,
      fun _ => by simp [FinO, Row.empty]⟩

/-- The generic assignment `route`'s body is solved under. -/
noncomputable def routeΓ (π : Pattern Label) : CAssign Label B :=
  combine (cliftP (routeP : SigProblem Label B))
    (thetaFree routeP π) (routeSol routeP π)

/-- `route`'s generic rows. -/
noncomputable def routeRow (π : Pattern Label) (r : Nat) :
    Row (CL Label) (CG Label B) :=
  etaRow (routeP : SigProblem Label B) π
    (freeCells (routeP : SigProblem Label B)) r

theorem routeΓ_rows (π : Pattern Label) :
    (routeΓ π).row 0 = routeRow (B := B) π 0 ∧
    (routeΓ π).row 1 = routeRow (B := B) π 1 ∧
    (routeΓ π).row 2 = routeRow (B := B) π 2 ∧
    (routeΓ π).row 3 = cellsWith 1 false (routeRow (B := B) π 0) ∧
    (routeΓ π).row 4 = cellsWith 1 true (routeRow (B := B) π 0) ∧
    (routeΓ π).row 5 = routeRow (B := B) π 1 ∧
    (routeΓ π).row 6 = routeRow (B := B) π 2 := by
  simp [routeΓ, routeRow, combine, cliftP, routeP, thetaFree, eta, routeSol]

theorem evalT_tails1 (Γ : CAssign Label B) (a : Nat) :
    evalT Γ (.record .nil [a]) = some (.record (Γ.row a)) := by
  simp [evalT_tails, composeAll_single]

/-- `route` is solvable at its generic instance, for every pattern. -/
theorem routeP_solvable (π : Pattern Label) :
    SolvableFinAt (routeP : SigProblem Label B) (thetaFree routeP π) := by
  refine ⟨routeSol routeP π, routeSol_fin _ _, ?_⟩
  have hw := written_routeP (Label := Label) (B := B)
  obtain ⟨h0, h1, h2, h3, h4, h5, h6⟩ := routeΓ_rows (B := B) π
  change Sat (routeΓ π) _
  intro a ha
  simp only [cliftP, routeP, List.map_cons, List.map_nil, List.mem_cons,
    List.not_mem_nil, or_false] at ha
  rcases ha with rfl | rfl | rfl | rfl | rfl | rfl
  · refine ⟨.record (routeRow π 0), ?_, ?_⟩
    · exact (evalT_tails1 _ 0).trans (by rw [h0])
    · show evalT _ (.record .nil [3, 4]) = _
      rw [evalT_tails]
      simp only [List.map_cons, List.map_nil, h3, h4,
        composeAll_pair (cellsWith_disjoint _ _), Option.map_some]
      rw [cellsWith_union (f := routeRow π 0) _ (fun l => etaRow_inl hw 0 l)]
  · exact ⟨_, evalT_tails1 _ 1, (evalT_tails1 _ 5).trans (by rw [h1, h5])⟩
  · exact ⟨_, evalT_tails1 _ 2, (evalT_tails1 _ 6).trans (by rw [h2, h6])⟩
  · show Composition.Disjoint ((routeΓ π).row 3) ((routeΓ π).row 5)
    rw [h3, h5]
    intro j
    cases j with
    | inl l => exact Or.inl rfl
    | inr S =>
      by_cases h : 1 ∈ S
      · left
        simp [cellsWith, h]
      · right
        simp [routeRow, etaRow, h]
  · show Composition.Disjoint ((routeΓ π).row 4) ((routeΓ π).row 6)
    rw [h4, h6]
    intro j
    cases j with
    | inl l => exact Or.inl rfl
    | inr S =>
      by_cases hS : cellsWith 1 true (routeRow (B := B) π 0) (.inr S) = none
      · exact Or.inl hS
      · by_cases h6' : routeRow (B := B) π 2 (.inr S) = none
        · exact Or.inr h6'
        · exfalso
          have h1S : 1 ∈ S := by
            by_cases hn : 1 ∈ S
            · exact hn
            · simp [cellsWith, hn] at hS
          have h0' : routeRow (B := B) π 0 (.inr S) ≠ none :=
            fun h => hS (by simp [cellsWith, h1S, h])
          exact etaRow_free_disjoint (r := 1) (s := 2) (by simp [routeP])
            (etaRow_inr_other h0' h1S) h6'
  · show Composition.Disjoint ((routeΓ π).row 3) ((routeΓ π).row 4)
    rw [h3, h4]
    exact cellsWith_disjoint 1 _

end Composition.Typed
