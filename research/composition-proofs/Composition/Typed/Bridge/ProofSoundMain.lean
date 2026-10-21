/-
Option-B soundness: B4f `GenericInstExtFin` and B5 `D3bSoundOpen`
(Bridge/Sound.lean), with BS-c1f (ProofSoundBasic.lean). Hypotheses,
owned by the extension track (Bridge/Extension.lean): E1 `MapBaseId`,
E2′ `SatSubstBase`, E5 `MapBaseSyntax` (its `written` component) for
B4f; additionally E2 `SatMapBase` (at the generic model's labels and
bases) and E6 `MapBaseClift` for B5, through BS-c1f.
-/
import Composition.Typed.Bridge.ProofSoundMatch
import Composition.Typed.Transfer

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- B4f, from E1, E2′ and E5. Every back substitution of `θR` is an
instance over `B`, so θs covers it; `ReachMatch` then makes `reachVal`
cover `θR` by `mapC j θs`. -/
theorem genericInstExtFin_of (h1 : MapBaseId (Label := Label) (B := B))
    (h2' : SatSubstBase (Label := Label) (B := B))
    (h5 : MapBaseSyntax (Label := Label) (B := B)) :
    GenericInstExtFin (Label := Label) (B := B) := by
  intro P π θs B₁ j hj hgen θR hfin hD hπ
  have hcov : ∀ s, BackSubst j s → Covers P θs (substAssign s θR) := by
    intro s hs
    obtain ⟨hD', hπ'⟩ := substInstance_of h1 h2' h5 P π B₁ j s θR hs hD hπ
    exact hgen.2.2.2 _ hD' hπ'
  have rm := reachMatch_of h5 P θs B₁ j θR hj hcov
  refine ⟨reachVal P j θs θR, ?_, ?_, ?_⟩
  · intro hf c κ
    unfold reachVal
    split
    · rename_i h
      exact reachFin P θs B₁ j θR hf _ _ _ (Classical.choose_spec h)
    · exact finG_emptyG
  · intro n hn
    exact rm _ _ _ (Reach.root (Or.inl ⟨n, hn, rfl, rfl⟩))
  · intro r hr
    have := rm _ _ _ (Reach.root (Or.inr ⟨r, hr, rfl, rfl⟩))
    simp only [mapG, hv] at this
    exact G.record.inj this

/-- B5, from B4f, BS-c1f and their hypotheses. An instance `θR` over an
injective extension has a back substitution, an instance over `B` of
its own pattern; the solved generic instance for that pattern covers
`θR` (B4f), its solution carries over (BS-c1f), and `transfer` gives a
finite solution at `θR`. -/
theorem d3bSoundOpen_of (h1 : MapBaseId (Label := Label) (B := B))
    (h2 : SatMapBase (Label := CL Label) (B := CB Label B))
    (h2' : SatSubstBase (Label := Label) (B := B))
    (h5 : MapBaseSyntax (Label := Label) (B := B))
    (h6 : MapBaseClift (Label := Label) (B := B)) :
    D3bSoundOpen (Label := Label) (B := B) := by
  intro P hall B₁ i hi θR hty hrow hD
  obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ i hi
  have hπ : InPattern (P.mapBase i) (presenceOf θR) θR :=
    fun _ _ _ _ => rfl
  obtain ⟨hD', hπ'⟩ :=
    substInstance_of h1 h2' h5 P (presenceOf θR) B₁ i s θR hs hD hπ
  obtain ⟨θs, hgen, hsol⟩ := hall (presenceOf θR) ⟨_, hD', hπ'⟩
  have hcov := genericInstExtFin_of h1 h2' h5 P (presenceOf θR) θs B₁ i
    hi hgen θR ⟨hty, hrow⟩ hD hπ
  obtain ⟨σ, hσf, hσ⟩ := solvableMapBaseFwd_of h2 h6 P θs B₁ i hsol
  obtain ⟨θF, hF, hfin⟩ := transfer _ _ _ _ hcov hσ
  exact ⟨θF, hfin hσf ⟨hty, hrow⟩, hF⟩

end Composition.Typed
