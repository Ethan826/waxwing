/-
Non-vacuity of D3b with a hypothesis that forces field types to agree
(dossier §18.6; typed challenge `agreement-hypothesis`): `∀ r s t.
r = s ⊎ t ⇒ ∃ u v. r = u ⊎ v, u = s`. Its generic instance gives `r`
and `s` one shared constant in their common cell (and `r`, `t` in
theirs), so `u = s`, `v = t` solves the body there, and `d3bFlat` with
`d3bValidAll` gives validity.
-/
import Composition.Typed.FlatMain
import Composition.Typed.ExamplesValid

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

def agreeP : SigProblem Label B :=
  ⟨[], [0, 1, 2], [.eq (.record .nil [0]) (.record .nil [1, 2])],
   [.eq (.record .nil [0]) (.record .nil [3, 4]),
    .eq (.record .nil [3]) (.record .nil [1])]⟩

omit [DecidableEq Label] in
theorem agreeP_scoped : Scoped (agreeP : SigProblem Label B) := by
  constructor <;> intro n hn <;>
    simp_all [agreeP, tyVarsOf, rowVarsOf, rowVarsT, rowVarsF, tyVarsT,
      tyVarsF]

omit [DecidableEq Label] in
theorem agreeP_flat : FlatD (agreeP : SigProblem Label B) := by
  intro a ha
  simp only [agreeP, List.mem_singleton] at ha
  subst ha
  trivial

omit [DecidableEq Label] in
theorem written_agreeP : written (agreeP : SigProblem Label B) = [] := by
  simp [written, labelsOf, agreeP, labelsT, labelsF]

theorem agreeP_hasInstance (π : Pattern Label) :
    HasInstance (agreeP : SigProblem Label B) π :=
  hasInstance_noLabels written_agreeP (fun a ha => by
    simp only [agreeP, List.mem_singleton] at ha
    subst ha
    have hdis : Composition.Disjoint (fun _ : Label => (none : Option
        (G Label B))) (fun _ => none) := fun _ => Or.inl rfl
    refine ⟨.record fun _ => none, by simp [evalT_tails, composeAll_single],
      ?_⟩
    rw [evalT_tails]
    simp only [List.map_cons, List.map_nil, composeAll_pair hdis,
      Option.map_some]
    exact congrArg (fun r => some (G.record r)) (union_empty _)) π

/-- `u = s`, `v = t`. -/
noncomputable def agreeSol (π : Pattern Label) : CAssign Label B :=
  ⟨fun _ => emptyG, fun n =>
    if n = 3 then flatRow agreeP π 1
    else if n = 4 then flatRow agreeP π 2 else Row.empty⟩

theorem agreeP_solvable (π : Pattern Label) :
    SolvableFinAt (agreeP : SigProblem Label B) (thetaFlat agreeP π) := by
  have hD := sat_thetaFlat (π := π) agreeP_scoped agreeP_flat
    (agreeP_hasInstance (B := B) π)
  refine ⟨agreeSol π, ⟨fun _ => finG_emptyG, fun n => ?_⟩, ?_⟩
  · simp only [agreeSol]
    split
    · exact flatRow_fin 1
    split
    · exact flatRow_fin 2
    · exact (finG_record _).mpr ⟨⟨[], fun _ h => absurd rfl h⟩,
        fun _ => by simp [FinO, Row.empty]⟩
  intro a ha
  simp only [cliftP, agreeP, List.map_cons, List.map_nil, List.mem_cons,
    List.not_mem_nil, or_false] at ha
  have h0 := (holds_flat_iff (rs1 := [0]) (rs2 := [1, 2])).mp
    (hD (.eq (.record .nil [0]) (.record .nil [1, 2])) (by
      simp [cliftP, agreeP, cliftAtom, cliftT, cliftF]))
  rcases ha with rfl | rfl
  · show Holds _ (.eq (.record .nil [0]) (.record .nil [3, 4]))
    refine holds_flat_iff.mpr fun j => ?_
    simpa [combine, cliftP, agreeP, agreeSol, thetaFlat] using h0 j
  · exact ⟨.record (flatRow agreeP π 1), by
      simp [cliftAtom, cliftT, cliftF, evalT_tails, combine, cliftP, agreeP,
        agreeSol, composeAll_single], by
      simp [cliftT, cliftF, evalT_tails, combine, cliftP, agreeP, thetaFlat,
        composeAll_single]⟩

/-- `agreement-hypothesis` is valid, certified by its generic instance. -/
theorem agreeP_valid :
    ValidAll (agreeP : SigProblem Label B) ∧
      ValidFin (agreeP : SigProblem Label B) := by
  have hg : ∀ π, GenericInst (agreeP : SigProblem Label B) π
      (thetaFlat agreeP π) := fun π =>
    (d3bFlat _ π agreeP_scoped agreeP_flat (agreeP_hasInstance π)).1
  refine ⟨(d3bValidAll agreeP).1 fun π _ => ⟨_, hg π, ?_⟩,
    (d3bValidAll agreeP).2 fun π _ => ⟨_, hg π, agreeP_solvable π⟩⟩
  obtain ⟨σ, _, hσ⟩ := agreeP_solvable (B := B) π
  exact ⟨σ, hσ⟩

end Composition.Typed
