/-
Lemmas for coverage (construction.md §6, steps 4-5): the canonical
valuation maps the pre-instance over any cell list containing the
instance's occupied cells onto the instance, and reads `D`'s equations
consistently (`HvSat`); finiteness and the problem's symbols pass back
through substitution.
-/
import Composition.Typed.UnivOcc

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {π : Pattern Label} {C : List Cell}

/-- `hvRow_eta` for any cell list holding every occupied cell. -/
theorem hvRow_etaC {θR : Assign Label B} (hπ : InPattern P π θR)
    (hC : ∀ k, k ∉ written P → cellOf P θR k ≠ [] → cellOf P θR k ∈ C)
    {r : Nat} (hr : r ∈ P.rigidRow) :
    hvRow P θR (canonVal P θR) none (etaRow P π C r) = θR.row r := by
  funext k
  by_cases hw : k ∈ written P
  · have hp := hπ r hr k hw
    simp only [hvRow, hw, ↓reduceIte, etaRow, true_and]
    cases hπk : π r k
    · rw [hπk] at hp
      simp only [Bool.false_eq_true, ↓reduceIte, hvO]
      cases h : θR.row r k <;> simp_all
    · rw [hπk] at hp
      simp only [↓reduceIte, hvO, hv, canonVal, hr]
      exact getD_of_isSome hp
  · by_cases hc : cellOf P θR k = []
    · simp only [hvRow, hw, hc, ↓reduceIte]
      cases h : θR.row r k with
      | none => rfl
      | some v =>
        have : r ∈ cellOf P θR k := mem_cellOf.mpr ⟨hr, by simp [h]⟩
        rw [hc] at this
        cases this
    · simp only [hvRow, hw, hc, ↓reduceIte, etaRow, hC k hw hc, true_and]
      by_cases hrk : r ∈ cellOf P θR k
      · simp only [hrk, ↓reduceIte, hvO, hv, canonVal, hr]
        exact getD_of_isSome (Option.isSome_iff_ne_none.mpr
          (mem_cellOf.mp hrk).2)
      · simp only [hrk, ↓reduceIte, hvO]
        cases h : θR.row r k with
        | none => rfl
        | some v => exact absurd (mem_cellOf.mpr ⟨hr, by simp [h]⟩) hrk

/-- The canonical valuation reads `D`'s equations at the pre-instance
consistently with the instance. -/
theorem hvSat_canon (hS : Scoped P) {θR : Assign Label B}
    (hD : Sat θR P.D) (hπ : InPattern P π θR)
    (hC : ∀ k, k ∉ written P → cellOf P θR k ≠ [] → cellOf P θR k ∈ C) :
    HvSat P θR (canonVal P θR) (eqPairs (eta P π C) P.D) := by
  intro p hp
  obtain ⟨a, ha, hpa⟩ := List.mem_filterMap.mp hp
  cases a with
  | eq t u =>
    simp only [eqPair, Option.bind_eq_some_iff, Option.map_eq_some_iff] at hpa
    obtain ⟨x, hx, y, hy, rfl⟩ := hpa
    have hm : Atom.eq t u ∈ P.D ++ P.B := List.mem_append_left _ ha
    have hl := labels_of_mem hm
    have ht := hv_evalT (θ := θR) (ν := canonVal P θR) t
      (fun l h => hl l (by simp [labelsOf, h])) hx
    have hu := hv_evalT (θ := θR) (ν := canonVal P θR) u
      (fun l h => hl l (by simp [labelsOf, h])) hy
    have hty : ∀ n, n ∈ tyVarsT t ∨ n ∈ tyVarsT u → n ∈ P.rigidTy :=
      fun n hn => hS.1 n (List.mem_flatMap.mpr ⟨_, ha, by simpa using hn⟩)
    have hrw : ∀ r, r ∈ rowVarsT t ∨ r ∈ rowVarsT u → r ∈ P.rigidRow :=
      fun r hr => hS.2 r (List.mem_flatMap.mpr ⟨_, ha, by simpa using hr⟩)
    have ecg : ∀ e : TExpr Label B, (∀ n ∈ tyVarsT e, n ∈ P.rigidTy) →
        (∀ r ∈ rowVarsT e, r ∈ P.rigidRow) →
        evalT (hvAssign P θR (canonVal P θR) (eta P π C)) e = evalT θR e :=
      fun e h1 h2 => evalT_congr e
        (fun n hn => by simp [hvAssign, eta, hv, canonVal, h1 n hn])
        (fun r hr => hvRow_etaC hπ hC (h2 r hr))
    rw [ecg t (fun n h => hty n (Or.inl h)) (fun r h => hrw r (Or.inl h))]
      at ht
    rw [ecg u (fun n h => hty n (Or.inr h)) (fun r h => hrw r (Or.inr h))]
      at hu
    obtain ⟨g, hg1, hg2⟩ := hD _ ha
    rw [hg1] at ht
    rw [hg2] at hu
    exact (Option.some.inj ht).symm.trans (Option.some.inj hu)
  | lacks _ _ => simp [eqPair] at hpa
  | disjoint _ _ => simp [eqPair] at hpa
  | ff => simp [eqPair] at hpa

omit [DecidableEq Label] in
mutual
  theorem within_of_subst {σ : CSubst Label B} :
      ∀ g : CG Label B, WithinG P (substG σ g) → WithinG P g
    | .base (.inl _), h => h
    | .base (.inr _), _ => trivial
    | .arrow a b, h => ⟨within_of_subst a h.1, within_of_subst b h.2⟩
    | .record f, h => by
      rw [substG_record] at h
      refine ⟨fun k hk => h.1 k fun h0 => hk (substO_none_iff.mp h0),
        fun j => withinO_of_subst (f j) (h.2 j)⟩

  theorem withinO_of_subst {σ : CSubst Label B} :
      ∀ o : Option (CG Label B), WithinO P (substO σ o) → WithinO P o
    | none, _ => trivial
    | some g, h => within_of_subst g h
end

omit [DecidableEq Label] in
mutual
  theorem fin_of_occ_subst {σ : CSubst Label B} {d : CConst Label} :
      ∀ g : CG Label B, Occ d g → FinG (substG σ g) → FinG (σ d)
    | .base (.inl _), h, _ => h.elim
    | .base (.inr c), h, hf => by simp only [Occ] at h; subst h; exact hf
    | .arrow a b, h, hf => by
      rcases h with h | h
      · exact fin_of_occ_subst a h hf.1
      · exact fin_of_occ_subst b h hf.2
    | .record f, ⟨j, hj⟩, hf => by
      rw [substG_record, finG_record] at hf
      exact finO_of_occ_subst (f j) hj (hf.2 j)

  theorem finO_of_occ_subst {σ : CSubst Label B} {d : CConst Label} :
      ∀ o : Option (CG Label B), OccO d o → FinO (substO σ o) → FinG (σ d)
    | none, h, _ => h.elim
    | some g, h, hf => fin_of_occ_subst g h hf
end

end Composition.Typed
