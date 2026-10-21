/-
`CellIndependence`, proved. Pairs: finite cell-shaped pairs are
unifiable if their written projection and each single-cell projection
are (`ci_core`, by Robinson's induction on constants). Problem: with an
instance, `D` is unifiable with no cell (`instanceIffUnifiable`, which
uses `Scoped`) and with each allowed cell alone; projecting the
pre-instance over all allowed cells onto `[]` or `[S]` gives those
pre-instances, and presence over all cells follows label by label.
-/
import Composition.Typed.CellCore
import Composition.Typed.Vacuity

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {C : List Cell}

theorem ci_core : ∀ (n : Nat) (E : Pairs Label B), GoodE P C E →
    (∃ L : List (CConst Label), L.length ≤ n ∧ ∀ c, OccE c E → c ∈ L) →
    (∀ L ∈ Ls C, ∃ τ, UnifL τ (prE L E)) → ∃ τ, UnifL τ E := by
  intro n
  induction n with
  | zero =>
    intro E hE ⟨L, hl, hL⟩ hpr
    by_cases hall : ∀ p ∈ E, p.1 = p.2
    · exact ⟨cv, fun p hp => by rw [hall p hp]⟩
    exfalso
    have hL0 : L = [] := List.eq_nil_of_length_eq_zero (by omega)
    subst hL0
    obtain ⟨p, hp, hne⟩ : ∃ p ∈ E, p.1 ≠ p.2 :=
      Classical.byContradiction fun h => hall fun p hp =>
        Classical.byContradiction fun hn => h ⟨p, hp, hn⟩
    have hg := hE p hp
    rcases dis p.1 p.2 hg.1 hg.2.1 hne with ⟨L, hL', hc⟩ |
        ⟨x, _, _, _, _, ho, _⟩ | ⟨r, _, S, _, _, _, ho, _⟩
    · obtain ⟨τ, hτ⟩ := hpr L hL'
      exact hc τ (hτ _ (mem_prE hp))
    · exact List.not_mem_nil (hL x ⟨p, hp, ho⟩)
    · exact List.not_mem_nil (hL _ ⟨p, hp, ho⟩)
  | succ n ih =>
    intro E hE hcount hpr
    by_cases hall : ∀ p ∈ E, p.1 = p.2
    · exact ⟨cv, fun p hp => by rw [hall p hp]⟩
    obtain ⟨p, hp, hne⟩ : ∃ p ∈ E, p.1 ≠ p.2 :=
      Classical.byContradiction fun h => hall fun p hp =>
        Classical.byContradiction fun hn => h ⟨p, hp, hn⟩
    have hg := hE p hp
    rcases dis p.1 p.2 hg.1 hg.2.1 hne with ⟨L, hL', hc⟩ |
        ⟨x, u, hx, hu, hux, ho, hvu, hfu, _, h2, _⟩ |
        ⟨r, r', S, hrr, _, hr', ho, ho', _, h2, _⟩
    · obtain ⟨τ, hτ⟩ := hpr L hL'
      exact (hc τ (hτ _ (mem_prE hp))).elim
    · have hσ := bind1_compat hx hu
      have hfu' := hfu hg.2.2.1 hg.2.2.2
      have hxu : ¬ Occ x u := fun hoc => by
        obtain ⟨τ, hτ⟩ := hpr [] (nil_mem_Ls C)
        exact occurs_no_unifier (occ_pr_nonX hx u hu hoc)
          (fun e => hux (pr_eq_cv e))
          (h2 [] (nil_mem_Ls C) τ (hτ _ (mem_prE hp)))
      have hub : ∀ d, Occ d u → OccE d E := fun d hd => ⟨p, hp, hvu d hd⟩
      obtain ⟨τ', hτ'⟩ := ih _ (goodE_bind hE hσ hfu')
        (count_bind hxu hub ⟨p, hp, ho⟩ hcount) fun L hL => by
          obtain ⟨τ, hτ⟩ := hpr L hL
          exact ⟨τ, unifL_prE_bind (h2 L hL τ (hτ _ (mem_prE hp))) hτ⟩
      exact ⟨_, unifL_substE hτ'⟩
    · have hσ := bind2_compat (P := P) (C := C) (r := r) hr'
      have hxu : ¬ Occ (.X r S) (cv (.X r' S) : CG Label B) := fun hoc => by
        simp only [Occ, CConst.X.injEq] at hoc
        exact hrr hoc.1.symm
      have hub : ∀ d, Occ d (cv (.X r' S) : CG Label B) → OccE d E :=
        fun d hd => by
          simp only [Occ] at hd
          subst hd
          exact ⟨p, hp, ho'⟩
      obtain ⟨τ', hτ'⟩ := ih _ (goodE_bind hE hσ trivial)
        (count_bind hxu hub ⟨p, hp, ho⟩ hcount) fun L hL => by
          obtain ⟨τ, hτ⟩ := hpr L hL
          by_cases hS : S ∈ L
          · have hLS : L = [S] := by
              rcases mem_Ls hL with rfl | ⟨S', _, rfl⟩
              · simp at hS
              · simp only [List.mem_singleton] at hS; rw [hS]
            subst hLS
            refine ⟨τ, unifL_prE_bind ?_ hτ⟩
            simpa [pr, substG] using h2 τ (hτ _ (mem_prE hp))
          · exact ⟨τ, by rw [prE_bind_id hS hE]; exact hτ⟩
      exact ⟨_, unifL_substE hτ'⟩

/-- Projection of the equations over `C` onto `L ⊆ C`. -/
theorem prE_eqPairs {π : Pattern Label} {L : List Cell}
    (hL : ∀ S ∈ L, S ∈ C) {τ : CSubst Label B}
    (h : UnifL τ (eqPairs (eta P π L) P.D)) :
    UnifL τ (prE L (eqPairs (eta P π C) P.D)) := by
  intro q hq
  obtain ⟨p, hp, rfl⟩ := List.mem_map.mp hq
  obtain ⟨a, ha, hpa⟩ := List.mem_filterMap.mp hp
  refine h _ (List.mem_filterMap.mpr ⟨a, ha, ?_⟩)
  cases a with
  | eq t u =>
    simp only [eqPair, Option.bind_eq_some_iff, Option.map_eq_some_iff] at hpa
    obtain ⟨x, hx, y, hy, rfl⟩ := hpa
    rw [← eta_pr hL]
    simp [eqPair, pr_evalT L t hx, pr_evalT L u hy]
  | lacks _ _ => simp [eqPair] at hpa
  | disjoint _ _ => simp [eqPair] at hpa
  | ff => simp [eqPair] at hpa

/-- `CellIndependence`. -/
theorem cellIndependence : CellIndependence (Label := Label) (B := B) := by
  intro P π hS hI
  obtain ⟨τ0, h0⟩ := (instanceIffUnifiable P π hS).mp hI
  have hA : ∀ S ∈ allowedCells P π, ∃ τ, UnifiesD P π [S] τ := fun S hS' => by
    simp only [allowedCells, List.mem_filter, decide_eq_true_eq] at hS'
    exact hS'.2
  have hD := defOk_cells (unifiesD_iff.mp h0).1 fun S hS' => by
    obtain ⟨τ, hτ⟩ := hA S hS'
    exact (unifiesD_iff.mp hτ).1
  have hg := goodE_eqPairs P π (allowedCells P π)
  obtain ⟨L, hL⟩ := occE_cover _ fun p hp => ⟨(hg p hp).2.2.1, (hg p hp).2.2.2⟩
  obtain ⟨τ, hτ⟩ := ci_core L.length _ hg ⟨L, Nat.le_refl _, hL⟩ fun L hL => by
    rcases mem_Ls hL with rfl | ⟨S, hS', rfl⟩
    · exact ⟨τ0, prE_eqPairs (by simp) (unifiesD_iff.mp h0).2⟩
    · obtain ⟨τ, hτ⟩ := hA S hS'
      exact ⟨τ, prE_eqPairs (by simpa using hS') (unifiesD_iff.mp hτ).2⟩
  exact ⟨τ, unifiesD_iff.mpr ⟨hD, hτ⟩⟩

end Composition.Typed
