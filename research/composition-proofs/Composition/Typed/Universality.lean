/-
`Universality` and `D3bExists`, proved. For an arbitrary `IsMGU` `τ`
over the allowed cells, our Robinson unifier `μ` (MGUExists.lean) is an
instance of it, `μ = τ'' ∘ τ`, with `τ''` taken finite. The valuation
`hv ν0 ∘ τ''`, with `ν0` the canonical valuation of an instance, maps
`thetaStar τ` onto the instance: `hv` reads the pre-instance only at
cell-local positions (`Agree`), where `μ` fixes every reading that
satisfies `D` (`MguSpec`), and every occupied cell is allowed
(UnivOcc.lean). No freshness premise is used.
-/
import Composition.Typed.UnivCover

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- `μ`'s values that the generic instance uses are within the
problem's labels and bases. -/
theorem spec_within {P : SigProblem Label B} {C : List Cell}
    {E : Pairs Label B} {μ : CSubst Label B} (h : MguSpec P C E μ)
    (c : CConst Label) (hc : NonX c ∨ ∃ r S, r ∈ S ∧ c = .X r S) :
    WithinG P (μ c) := by
  rcases hc with hc | ⟨r, S, hr, rfl⟩
  · exact cs_within _ (h.2.2.1.1 c hc)
  · obtain ⟨r', _, h1⟩ := h.2.2.1.2 r S hr
    rw [h1]
    trivial

open Classical in
theorem universality : Universality (Label := Label) (B := B) := by
  intro P π τ hS _ hM
  have hU : UnifiesD P π (allowedCells P π) τ := hM.1
  have hDef := (unifiesD_iff.mp hU).1
  obtain ⟨μ, hμ⟩ := mguSpec_exists ⟨τ, hU⟩
  obtain ⟨τ'', h''⟩ := hM.2.2 μ (unifiesD_iff.mpr ⟨hDef, hμ.1⟩)
  let τ3 : CSubst Label B := fun c => if FinG (τ'' c) then τ'' c else cv c
  have hfin3 : ∀ c, FinG (τ3 c) := fun c => by
    by_cases h : FinG (τ'' c)
    · simp [τ3, h]
    · simp only [τ3, h, ↓reduceIte]; trivial
  have h3 : ∀ c, substG τ3 (τ c) = μ c := fun c => by
    rw [← h'' c]
    refine substG_congr _ fun d hd => ?_
    have := fin_of_occ_subst _ hd ((h'' c).symm ▸ hμ.2.1 c)
    simp [τ3, this]
  have hWτ : ∀ c, (NonX c ∨ ∃ r S, r ∈ S ∧ c = .X r S) → WithinG P (τ c) :=
    fun c hc => within_of_subst (σ := τ'') _
      (by rw [h'' c]; exact spec_within hμ c hc)
  have hrow : ∀ r, (thetaStar P π τ).row r =
      sRow τ (etaRow P π (allowedCells P π) r) := fun _ => rfl
  refine ⟨⟨⟨fun n _ => hM.2.1 _, fun r _ => ?_⟩, hU, fun r _ l hl => ?_,
    fun θR hD hπ => ?_⟩, ⟨fun n _ => hWτ _ (Or.inl trivial), fun r _ => ?_⟩⟩
  · rw [hrow, show (G.record (sRow τ (etaRow P π (allowedCells P π) r)) :
      CG Label B) = substG τ (.record (etaRow P π (allowedCells P π) r)) from
      (substG_record _ _).symm]
    exact fin_substG _ (eta_fin r) fun c _ => hM.2.1 c
  · show (substO τ (etaRow P π (allowedCells P π) r (.inl l))).isSome = π r l
    cases h : π r l <;> simp [etaRow, hl, h, substO]
  · have hC := fun k hk hc => occupied_allowed hS hD hπ (k := k) hk hc
    let ν0 := canonVal P θR
    have hA := hμ.2.2.2.2 θR ν0 (hvSat_canon hS hD hπ hC)
    have hcomp : vcomp P θR (vcomp P θR ν0 τ3) τ = vcomp P θR ν0 μ := by
      funext c κ
      simp only [vcomp]
      rw [← hv_subst, h3]
    refine ⟨vcomp P θR ν0 τ3, fun hR c κ => hv_fin hR (canonVal_fin hR) κ _
      (hfin3 c), fun n hn => ?_, fun r hr => ?_⟩
    · show vcomp P θR (vcomp P θR ν0 τ3) τ (.T n) none = θR.ty n
      rw [hcomp, hA.1 (.T n) trivial]
      simp [ν0, canonVal, hn]
    · rw [hrow, hvRow_subst, hcomp]
      have hcs := (cs_record (P := P) _).mpr
        ((eta_cs (P := P) (π := π) (C := allowedCells P π)).2 r)
      have := hv_congr hA _ hcs
      rw [hv_record, hv_record] at this
      exact (G.record.inj this).trans (hvRow_etaC hπ hC hr)
  · rw [hrow]
    refine ⟨fun k hk => ?_, fun j => ?_⟩
    · simp only [sRow, ne_eq, substO_none_iff] at hk
      simp only [etaRow] at hk
      split at hk
      · next h => exact h.1
      · exact absurd rfl hk
    · cases j with
      | inl l =>
        simp only [sRow, etaRow]
        split
        · exact hWτ _ (Or.inl trivial)
        · trivial
      | inr S =>
        simp only [sRow, etaRow]
        split
        · next h => exact hWτ _ (Or.inr ⟨r, S, h.2, rfl⟩)
        · trivial

/-- `D3bExists`: every pattern with an instance has a generic instance.
Assembled from `cellIndependence`, `mguExists` and `universality`. -/
theorem d3bExists : D3bExists (Label := Label) (B := B) := by
  intro P π hS hI
  obtain ⟨τ, hτ⟩ := mguExists P π _ (cellIndependence P π hS hI)
  exact ⟨_, (universality P π τ hS hI hτ).1⟩

/-- `D3bExists` with `WithinC` kept: the generic instance `universality`
builds is also within the problem's symbols. `WithinC` admits the
problem's written labels and bases together with symbolic cell labels
and generic constants; it does not say that θ* is written in the
program. The bridge's `D3bExistsWithin` (dossier §18.32) is this
statement. -/
theorem d3bExistsWithin (P : SigProblem Label B) (π : Pattern Label)
    (hS : Scoped P) (hI : HasInstance P π) :
    ∃ θs, GenericInst P π θs ∧ WithinC P θs := by
  obtain ⟨τ, hτ⟩ := mguExists P π _ (cellIndependence P π hS hI)
  exact ⟨_, universality P π τ hS hI hτ⟩

end Composition.Typed
