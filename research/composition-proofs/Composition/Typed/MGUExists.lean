/-
`MGUExists`, proved. `D` at a substituted pre-instance is a fixed
presence condition plus the equations `eqPairs` (UnifEval.lean); those
are finite cell-shaped pairs (UnifCSEval.lean, UnifFin.lean), so
Robinson's theorem in the generic model (UnifMain.lean) gives a most
general unifier with finite values. Correspondence with Robinson 1965:
construction.md §6.1.
-/
import Composition.Typed.UnifMain
import Composition.Typed.LiftCommute

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

theorem unifiesD_iff {P : SigProblem Label B} {π : Pattern Label}
    {C : List Cell} {τ : CSubst Label B} :
    UnifiesD P π C τ ↔ (∀ a ∈ P.D, DefOk (eta P π C) a) ∧
      UnifL τ (eqPairs (eta P π C) P.D) := by
  unfold UnifiesD
  rw [thetaOf_eq]
  exact sat_sAssign P.D

/-- The equations of `D` at the pre-instance are finite and cell-shaped. -/
theorem goodE_eqPairs (P : SigProblem Label B) (π : Pattern Label)
    (C : List Cell) : GoodE P C (eqPairs (eta P π C) P.D) := by
  intro p hp
  obtain ⟨a, ha, hpa⟩ := List.mem_filterMap.mp hp
  cases a with
  | eq t u =>
    simp only [eqPair, Option.bind_eq_some_iff, Option.map_eq_some_iff] at hpa
    obtain ⟨x, hx, y, hy, rfl⟩ := hpa
    have hm : Atom.eq t u ∈ P.D ++ P.B := List.mem_append_left _ ha
    have hl := labels_of_mem hm
    have hb := bases_of_mem hm
    obtain ⟨hty, hrow⟩ := eta_cs (P := P) (C := C) (π := π)
    refine ⟨eval_cs hty hrow t (fun l h => hl l (by simp [labelsOf, h]))
        hb.1 hx,
      eval_cs hty hrow u (fun l h => hl l (by simp [labelsOf, h])) hb.2 hy,
      eval_fin eta_finAssign t hx, eval_fin eta_finAssign u hy⟩
  | lacks _ _ => simp [eqPair] at hpa
  | disjoint _ _ => simp [eqPair] at hpa
  | ff => simp [eqPair] at hpa

omit [DecidableEq Label] in
theorem occE_cover : ∀ E : Pairs Label B, (∀ p ∈ E, FinG p.1 ∧ FinG p.2) →
    ∃ L : List (CConst Label), ∀ c, OccE c E → c ∈ L
  | [], _ => ⟨[], fun _ ⟨_, hp, _⟩ => absurd hp List.not_mem_nil⟩
  | p :: E, h => by
    obtain ⟨L, hL⟩ := occE_cover E fun q hq => h q (List.mem_cons_of_mem _ hq)
    obtain ⟨L1, h1⟩ := fin_occ_cover p.1 (h p List.mem_cons_self).1
    obtain ⟨L2, h2⟩ := fin_occ_cover p.2 (h p List.mem_cons_self).2
    refine ⟨L1 ++ L2 ++ L, fun c ⟨q, hq, ho⟩ => ?_⟩
    rcases List.mem_cons.mp hq with rfl | hq
    · rcases ho with ho | ho
      · exact List.mem_append_left _ (List.mem_append_left _ (h1 c ho))
      · exact List.mem_append_left _ (List.mem_append_right _ (h2 c ho))
    · exact List.mem_append_right _ (hL c ⟨q, hq, ho⟩)

/-- Robinson's theorem for the pre-instance, with the stronger fixed
point properties of `MguSpec`. -/
theorem mguSpec_exists {P : SigProblem Label B} {π : Pattern Label}
    {C : List Cell} (h : ∃ τ, UnifiesD P π C τ) :
    ∃ μ, MguSpec P C (eqPairs (eta P π C) P.D) μ := by
  obtain ⟨τ, hτ⟩ := h
  have hg := goodE_eqPairs P π C
  obtain ⟨L, hL⟩ := occE_cover _ fun p hp => ⟨(hg p hp).2.2.1, (hg p hp).2.2.2⟩
  exact robinson L.length _ hg ⟨L, Nat.le_refl _, hL⟩
    ⟨τ, (unifiesD_iff.mp hτ).2⟩

theorem isMGU_of_spec {P : SigProblem Label B} {π : Pattern Label}
    {C : List Cell} {μ : CSubst Label B} (hD : ∀ a ∈ P.D, DefOk (eta P π C) a)
    (h : MguSpec P C (eqPairs (eta P π C) P.D) μ) : IsMGU P π C μ :=
  ⟨unifiesD_iff.mpr ⟨hD, h.1⟩, h.2.1, fun τ' hτ' =>
    ⟨τ', h.2.2.2.1 τ' (unifiesD_iff.mp hτ').2⟩⟩

/-- `MGUExists`. -/
theorem mguExists : MGUExists (Label := Label) (B := B) := by
  intro P π C h
  obtain ⟨μ, hμ⟩ := mguSpec_exists h
  obtain ⟨τ, hτ⟩ := h
  exact ⟨μ, isMGU_of_spec (unifiesD_iff.mp hτ).1 hμ⟩

end Composition.Typed
