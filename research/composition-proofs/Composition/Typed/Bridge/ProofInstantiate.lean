/-
The first bridge tranche, instantiated (dossier §18.33, §18.38). The
proof agents took one another's statements as hypotheses; here each
hypothesis is discharged by the proved statement, so the results below
depend on no open premise. Every stated premise of B2, B2n, B3a, B3e
and B3f remains: "no open premise" means no unproved hypothesis, not
fewer assumptions.
-/
import Composition.Typed.Bridge.ProofExtension
import Composition.Typed.Bridge.ProofSat
import Composition.Typed.Bridge.ProofSupport
import Composition.Typed.Bridge.ProofFresh
import Composition.Typed.Bridge.ProofFreshComplete
import Composition.Typed.Bridge.ProofFreshFinExt
import Composition.Typed.Bridge.ProofComplete

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- B2, from E2, E5 and E6. -/
theorem d3bCompleteOn : D3bCompleteOn (Label := Label) (B := B) :=
  d3bCompleteOn_of (fun _ _ _ => satMapBase) mapBaseSyntax mapBaseClift

omit [DecidableEq Label] in
/-- B2f, from E3. -/
theorem constsFinite : ConstsFinite (Label := Label) (B := B) :=
  constsFinite_of finSupport

/-- B2g, from E1 and E3. -/
theorem completeOnGivesComplete :
    CompleteOnGivesComplete (Label := Label) (B := B) :=
  completeOnGivesComplete_of mapBaseId finSupport

/-- B2n, from B2: for a particular generic instance, finitely many fresh
opaque types suffice; `U.length < n` is a sufficient bound, not a
claimed optimal one. -/
theorem d3bCompleteFinExt : D3bCompleteFinExt (Label := Label) (B := B) :=
  d3bCompleteFinExt_of_on d3bCompleteOn

/-- B3a, from B2 and B2f. -/
theorem d3bCompleteOpen : D3bCompleteOpen (Label := Label) (B := B) :=
  d3bCompleteOpen_of d3bCompleteOn constsFinite

/-- B3e: option-B completeness for the equation-free fragment, with no
open existence premise (its scope, label-freshness and fragment premises
remain). -/
theorem d3bOpenCompleteEqFree :
    D3bOpenCompleteEqFree (Label := Label) (B := B) :=
  d3bOpenCompleteEqFree_of_B2 d3bCompleteOn constsFinite

/-- B3f: the same for the flat fragment. -/
theorem d3bOpenCompleteFlat :
    D3bOpenCompleteFlat (Label := Label) (B := B) :=
  d3bOpenCompleteFlat_of_B2 d3bCompleteOn constsFinite

end Composition.Typed
