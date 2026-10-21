/-
The option-B soundness track instantiated, and the bridge composed with
general existence (dossier §18.41 step 3). Each stream hypothesis is
discharged by the proved statement. General completeness is stated
directly as `D3bOpenComplete`, from `d3bExistsWithin` and B3a; it is not
presented through `BridgeComposition`, whose `D3bExists` premise would
go unused (§18.42). Research-model results: no executable checker, no
source-level guarantee.
-/
import Composition.Typed.Universality
import Composition.Typed.Bridge.ProofInstantiate
import Composition.Typed.Bridge.ProofSoundMain

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- BS-c1f, from E2 (at `CL Label`, `CB Label B`) and E6. -/
theorem solvableMapBaseFwd :
    SolvableMapBaseFwd (Label := Label) (B := B) :=
  solvableMapBaseFwd_of satMapBase mapBaseClift

/-- B4f, from E1, E2′ and E5. -/
theorem genericInstExtFin : GenericInstExtFin (Label := Label) (B := B) :=
  genericInstExtFin_of mapBaseId satSubstBase mapBaseSyntax

/-- B5: solved generic instances for every pattern give option-B
validity (finite values). -/
theorem d3bSoundOpen : D3bSoundOpen (Label := Label) (B := B) :=
  d3bSoundOpen_of mapBaseId satMapBase satSubstBase mapBaseSyntax
    mapBaseClift

/-- B3, general: every option-B-valid Scoped problem with fresh labels
has, for each pattern with an instance, a generic instance within its
symbols at which the body is solvable. Existence is `d3bExistsWithin`;
completeness at that instance is B3a. -/
theorem d3bOpenComplete : D3bOpenComplete (Label := Label) (B := B) := by
  intro P hS ⟨z, hz⟩ hV π hI
  obtain ⟨θs, hg, hw⟩ := d3bExistsWithin P π hS hI
  exact ⟨θs, hg, hw, d3bCompleteOpen P π θs z hz hw hg hV⟩

/-- C, the characterization: `→` from B3 (general), `←` from B5. -/
theorem openCharacterization :
    OpenCharacterization (Label := Label) (B := B) := by
  intro P hS hz _
  constructor
  · exact fun hV => d3bOpenComplete P hS hz hV
  · intro h
    exact d3bSoundOpen P fun π hI =>
      let ⟨θs, hg, _, hs⟩ := h π hI
      ⟨θs, hg, hs⟩

/-- C with its existence premise discharged by `d3bExistsWithin`: a
corollary of the reviewed C, not a separately reviewed statement. For a
Scoped problem with fresh labels, option-B validity holds exactly when
every pattern with an instance has a solvable generic instance within
the problem's symbols. -/
theorem openCharacterization_scoped (P : SigProblem Label B)
    (hS : Scoped P) (hz : ∃ z, FreshLabels P z) :
    ValidOpen P ↔ ∀ π, HasInstance P π →
      ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs :=
  openCharacterization P hS hz fun π hI => d3bExistsWithin P π hS hI

end Composition.Typed
