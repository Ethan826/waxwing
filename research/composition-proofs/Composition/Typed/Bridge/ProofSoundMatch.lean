/-
Option-B soundness track: `ReachMatch` (the core of B4f) and `HvSubst`.
Each mismatch between the renamed generic subterm and its ground
partner is separated by one back substitution, which `HvReach` turns
into a contradiction. E5 (`MapBaseSyntax`, owned by another track) is a
hypothesis; only its `written` component is used.
-/
import Composition.Typed.Bridge.ProofSoundSeparate

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

section RM
variable (P : SigProblem Label B) (θs : CAssign Label B) {B₁ : Type}
  (j : B → B₁) (θR : Assign Label B₁) (hj : Function.Injective j)
  (hcov : ∀ s, BackSubst j s → Covers P θs (substAssign s θR))
  (hw : written (P.mapBase j) = written P)

include hcov in
theorem reach_agree (s : B₁ → G Label B) (hs : BackSubst j s) :
    ∃ ν, ∀ g κ t, ReachR P j θs θR g κ t →
      hv P (substAssign s θR) ν κ g = substBase s t := by
  obtain ⟨ν, _, hty, hrow⟩ := hcov s hs
  exact ⟨ν, hvReach P θs B₁ j θR s ν hty hrow⟩

-- The linter misses uses through the mutual partner.
set_option linter.unusedSectionVars false in
include hj hcov hw in
mutual
  theorem rm_aux : ∀ (g : CG Label B) κ t, ReachR P j θs θR g κ t →
      hv (P.mapBase j) θR (reachVal P j θs θR) κ
        (mapG (Sum.map j id) g) = t
    | .base (.inl b), κ, t, hr => by
      simp only [mapG, Sum.map_inl, hv]
      apply Classical.byContradiction
      intro hne
      obtain ⟨s, hs, hd⟩ := separate (Label := Label) _ j hj _ _ hne
      obtain ⟨ν, hν⟩ := reach_agree P θs j θR hcov s hs
      have := hν _ _ _ hr
      simp only [hv] at this
      apply hd
      simp only [substBase, hs b]
      exact this
    | .base (.inr c), κ, t, hr => by
      simp only [mapG, Sum.map_inr, hv, id]
      have hex : ∃ t, ReachR P j θs θR (.base (.inr c)) κ t := ⟨t, hr⟩
      simp only [reachVal, hex, dite_true]
      apply Classical.byContradiction
      intro hne
      obtain ⟨s, hs, hd⟩ := separate (Label := Label) _ j hj _ _ hne
      obtain ⟨ν, hν⟩ := reach_agree P θs j θR hcov s hs
      have h1 := hν _ _ _ hr
      have h2 := hν _ _ _ (Classical.choose_spec hex)
      simp only [hv] at h1 h2
      exact hd (h2.symm.trans h1)
    | .arrow a c, κ, t, hr => by
      by_cases ht : ∃ p q, t = .arrow p q
      · obtain ⟨p, q, rfl⟩ := ht
        simp only [mapG, hv]
        rw [rm_aux a κ p (Reach.arrowL hr), rm_aux c κ q (Reach.arrowR hr)]
      · exfalso
        obtain ⟨s, hs, hd⟩ := separateArrow (Label := Label) _ j hj t
          (fun p q e => ht ⟨p, q, e⟩)
        obtain ⟨ν, hν⟩ := reach_agree P θs j θR hcov s hs
        have := hν _ _ _ hr
        simp only [hv] at this
        exact hd _ _ this.symm
    | .record f, κ, t, hr => by
      by_cases ht : ∃ h, t = .record h
      · obtain ⟨h, rfl⟩ := ht
        obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ j hj
        obtain ⟨ν, hν⟩ := reach_agree P θs j θR hcov s hs
        have E := hν _ _ _ hr
        simp only [hv, substBase] at E
        have E' := G.record.inj E
        rw [cellOfSubst P B₁ j s θR] at E'
        simp only [mapG, hv]
        congr 1
        funext k
        have Ek := congrFun E' k
        rw [hw]
        by_cases hk : k ∈ written P
        · simp only [hk, ite_true] at Ek ⊢
          exact rmO_aux (f (.inl k)) κ (h k)
            (fun g t hg ht => Reach.wr hr hk hg ht)
            (by cases hf : f (.inl k) <;> cases hh : h k <;>
                  rw [hf, hh] at Ek <;> simp [hvO, substBaseO] at Ek ⊢)
        · simp only [hk, ite_false] at Ek ⊢
          by_cases hc : cellOf (P.mapBase j) θR k = []
          · simp only [hc, ite_true] at Ek ⊢
            cases hh : h k
            · rfl
            · rw [hh] at Ek; simp [substBaseO] at Ek
          · simp only [hc, ite_false] at Ek ⊢
            exact rmO_aux (f (.inr (cellOf (P.mapBase j) θR k))) (some k)
              (h k) (fun g t hg ht => Reach.cl hr hk hc hg ht)
              (by cases hf : f (.inr (cellOf (P.mapBase j) θR k)) <;>
                    cases hh : h k <;> rw [hf, hh] at Ek <;>
                    simp [hvO, substBaseO] at Ek ⊢)
      · exfalso
        obtain ⟨s, hs, hd⟩ := separateRecord (Label := Label) _ j hj t
          (fun h e => ht ⟨h, e⟩)
        obtain ⟨ν, hν⟩ := reach_agree P θs j θR hcov s hs
        have := hν _ _ _ hr
        simp only [hv] at this
        exact hd _ this.symm

  theorem rmO_aux : ∀ (o : Option (CG Label B)) κ
      (ot : Option (G Label B₁)),
      (∀ g t, o = some g → ot = some t → ReachR P j θs θR g κ t) →
      (o = none ↔ ot = none) →
      hvO (P.mapBase j) θR (reachVal P j θs θR) κ
        (mapGO (Sum.map j id) o) = ot
    | none, _, ot, _, hn => by simp [mapGO, hvO, (hn.mp rfl)]
    | some _, _, none, _, hn => absurd (hn.mpr rfl) (by simp)
    | some g, κ, some t, hr, _ => by
      simp only [mapGO, hvO]
      rw [rm_aux g κ t (hr g t rfl rfl)]
end
end RM

/-- `ReachMatch`, from E5. -/
theorem reachMatch_of (h5 : MapBaseSyntax (Label := Label) (B := B)) :
    ReachMatch (Label := Label) (B := B) :=
  fun P θs B₁ j θR hj hcov g κ t hr =>
    rm_aux P θs j θR hj hcov (h5 P B₁ j).1 g κ t hr

section HS
variable (P : SigProblem Label B) {B₁ : Type} (j : B → B₁)
  (s : B₁ → G Label B) (θ : Assign Label B₁) (ν : Val Label B₁)
  (hs : BackSubst j s) (hw : written (P.mapBase j) = written P)

set_option linter.unusedSectionVars false in
include hs hw in
mutual
  theorem hvs_go : ∀ (g : CG Label B) κ,
      substBase s (hv (P.mapBase j) θ ν κ (mapG (Sum.map j id) g)) =
        hv P (substAssign s θ) (fun c κ' => substBase s (ν c κ')) κ g
    | .base (.inl b), κ => by
      simp only [mapG, Sum.map_inl, hv, substBase]; exact hs b
    | .base (.inr c), κ => by simp [mapG, hv]
    | .arrow a c, κ => by
      simp only [mapG, hv, substBase]; rw [hvs_go a κ, hvs_go c κ]
    | .record f, κ => by
      simp only [mapG, hv, substBase]
      congr 1; funext k
      rw [hw, ← cellOfSubst (Label := Label) P B₁ j s θ]
      split
      · exact hvs_goO _ κ
      · split
        · rfl
        · exact hvs_goO _ (some k)

  theorem hvs_goO : ∀ (o : Option (CG Label B)) κ,
      substBaseO s (hvO (P.mapBase j) θ ν κ (mapGO (Sum.map j id) o)) =
        hvO P (substAssign s θ) (fun c κ' => substBase s (ν c κ')) κ o
    | none, _ => rfl
    | some g, κ => by
      simp only [mapGO, hvO, substBaseO]; rw [hvs_go g κ]
end
end HS

/-- `HvSubst`, from E5. Not used by B4f or B5. -/
theorem hvSubst_of (h5 : MapBaseSyntax (Label := Label) (B := B)) :
    HvSubst (Label := Label) (B := B) :=
  fun P B₁ j s θ ν κ g hs => hvs_go P j s θ ν hs (h5 P B₁ j).1 g κ

end Composition.Typed
