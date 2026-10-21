/-
The P-1 bridge, proofs: B3a, B3e and B3f (statements in
`Bridge/Complete.lean`). B3a is proved from B2 (`D3bCompleteOn`) and
B2f (`ConstsFinite`), taken as hypotheses: B2 is instantiated at the
extension `B₁ = B ⊕ CConst Label`, `j = Sum.inl`, `e = Sum.inr`, where
the constants are fresh by construction, and option-B validity is read
at that extension. B3e and B3f compose B3a with the proved existence
results `d3bEqFree` and `d3bFlat`, at their explicit instances.
-/
import Composition.Typed.Bridge.Complete
import Composition.Typed.EqFree
import Composition.Typed.FlatMain

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

private theorem inl_inj {α β : Type} :
    Function.Injective (Sum.inl : α → α ⊕ β) :=
  fun _ _ h => Sum.inl.inj h

omit [DecidableEq Label] in
/-- `Sum.inr` gives fresh bases on any `U` at the extension `Sum.inl`. -/
theorem freshBasesOn_sum (P : SigProblem Label B)
    (U : List (CConst Label)) :
    FreshBasesOn P (Sum.inl : B → B ⊕ CConst Label) U Sum.inr :=
  ⟨fun _ _ _ _ h => Sum.inr.inj h, fun _ _ _ _ h => by cases h⟩

/-- `ValidFin` gives `ValidFinIn` for every pattern. -/
theorem validFinIn_of_validFin {P : SigProblem Label B}
    (h : ValidFin P) (π : Pattern Label) : ValidFinIn P π :=
  fun θR hR hD _ => h θR hR.1 hR.2 hD

/-- B3a, from B2 and B2f. Premises used: `FreshLabels P z`,
`WithinC P θs`, `GenericInst P π θs` (its `RigidFinC` part feeds B2f,
the whole feeds B2) and `ValidOpen P` (at `Sum.inl`). -/
theorem d3bCompleteOpen_of
    (hB2 : D3bCompleteOn (Label := Label) (B := B))
    (hB2f : ConstsFinite (Label := Label) (B := B)) :
    D3bCompleteOpen (Label := Label) (B := B) := by
  intro P π θs z hz hW hG hV
  obtain ⟨U, hU⟩ := hB2f P θs hG.1
  have hVF := hV (B ⊕ CConst Label) Sum.inl inl_inj
  exact (hB2 P π θs (B ⊕ CConst Label) Sum.inl z Sum.inr U
    inl_inj hz (freshBasesOn_sum P U) hU hW hG).2
    (validFinIn_of_validFin hVF π)

/-- B3e, from B3a. Premises used: `Scoped P`, `EqFree P` and
`HasInstance P π` (for `d3bEqFree`), `∃ z, FreshLabels P z` and
`ValidOpen P` (for B3a). -/
theorem d3bOpenCompleteEqFree_of
    (hB3a : D3bCompleteOpen (Label := Label) (B := B)) :
    D3bOpenCompleteEqFree (Label := Label) (B := B) := by
  intro P hS hE ⟨z, hz⟩ hV π hI
  obtain ⟨hG, hW⟩ := d3bEqFree P π hS hE hI
  exact hB3a P π _ z hz hW hG hV

/-- B3f, from B3a. Premises used: `Scoped P`, `FlatD P` and
`HasInstance P π` (for `d3bFlat`), `∃ z, FreshLabels P z` and
`ValidOpen P` (for B3a). -/
theorem d3bOpenCompleteFlat_of
    (hB3a : D3bCompleteOpen (Label := Label) (B := B)) :
    D3bOpenCompleteFlat (Label := Label) (B := B) := by
  intro P hS hF ⟨z, hz⟩ hV π hI
  obtain ⟨hG, hW⟩ := d3bFlat P π hS hF hI
  exact hB3a P π _ z hz hW hG hV

/-- B3e, from B2 and B2f. -/
theorem d3bOpenCompleteEqFree_of_B2
    (hB2 : D3bCompleteOn (Label := Label) (B := B))
    (hB2f : ConstsFinite (Label := Label) (B := B)) :
    D3bOpenCompleteEqFree (Label := Label) (B := B) :=
  d3bOpenCompleteEqFree_of (d3bCompleteOpen_of hB2 hB2f)

/-- B3f, from B2 and B2f. -/
theorem d3bOpenCompleteFlat_of_B2
    (hB2 : D3bCompleteOn (Label := Label) (B := B))
    (hB2f : ConstsFinite (Label := Label) (B := B)) :
    D3bOpenCompleteFlat (Label := Label) (B := B) :=
  d3bOpenCompleteFlat_of (d3bCompleteOpen_of hB2 hB2f)

end Composition.Typed
