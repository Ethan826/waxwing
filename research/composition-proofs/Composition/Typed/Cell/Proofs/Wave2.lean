/-
The second proof wave, instantiated (dossier §18.57). W3 and W9 proved
their results from QX2 and QX3 as hypotheses; W1 proves those, so
here every wave-2 result rests on no unproved statement.
-/
import Composition.Typed.Cell.Proofs.W1
import Composition.Typed.Cell.Proofs.W2
import Composition.Typed.Cell.Proofs.W3
import Composition.Typed.Cell.Proofs.W4
import Composition.Typed.Cell.Proofs.W5
import Composition.Typed.Cell.Proofs.W6
import Composition.Typed.Cell.Proofs.W7
import Composition.Typed.Cell.Proofs.W8
import Composition.Typed.Cell.Proofs.W9

namespace Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- QR3: `cellBoth` is exact over the region, on the fragment. -/
theorem cellBothExact : CellBothExact (Label := Label) (B := B) :=
  cellBothExact_of cellPossExact

omit [DecidableEq B] in
/-- QR4: `cover` is exact over the region, on the fragment. -/
theorem coverRegionExact : CoverRegionExact (Label := Label) (B := B) :=
  coverRegionExact_of coverExact

omit [DecidableEq Label] [DecidableEq B] in
/-- QX4: with no declarations, covering all of `r` is DNF tautology. -/
theorem coverTautology : CoverTautology (Label := Label) (B := B) :=
  coverTautology_of coverExact

/-- `CheckTautology`: the checker passes the reduction's certificate
exactly when `R` is a tautology (this certificate format only). -/
theorem checkTautology : CheckTautology Label B :=
  checkTautology_of coverExact

end Composition.Typed.Cells
