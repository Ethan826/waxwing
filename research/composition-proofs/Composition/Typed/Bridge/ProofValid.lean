/-
Proof of B0 (Bridge/Valid.lean): option B's validity implies closed
validity, at the identity extension (E1).
-/
import Composition.Typed.Bridge.Valid
import Composition.Typed.Bridge.ProofExtension

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- B0. -/
theorem openToFin : OpenToFin (Label := Label) (B := B) := by
  intro P h
  have := h B id fun _ _ e => e
  rwa [mapBaseId P] at this

end Composition.Typed
