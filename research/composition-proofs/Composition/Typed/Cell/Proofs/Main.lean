/-
The first soundness tranche, instantiated (dossier §18.54-18.56). The
streams proved dependent results from the others' statements as
hypotheses (`_of`); here every hypothesis is discharged by its proof,
so `cellSound`, `cellOpen` and `cellOpenImpl` rest on no open
statement. CD3 (`evalDefined`) is proved but CM does not need it.
-/
import Composition.Typed.Cell.Proofs.A
import Composition.Typed.Cell.Proofs.B
import Composition.Typed.Cell.Proofs.C
import Composition.Typed.Cell.Proofs.D
import Composition.Typed.Cell.Proofs.E
import Composition.Typed.Cell.Proofs.F
import Composition.Typed.Cell.Proofs.G

namespace Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- CI3: denotation commutes with instantiation. -/
theorem evalCommutes : EvalCommutes (Label := Label) (B := B) :=
  evalCommutes_of pieceIsSubRow apartSound

omit [DecidableEq B] in
/-- CD3: symbolically evaluated expressions are defined. -/
theorem evalDefined : EvalDefined (Label := Label) (B := B) :=
  evalDefined_of pieceIsSubRow apartSound

/-- CB2: accepted atoms hold at every generic instance of the region. -/
theorem atomSound : AtomSound (Label := Label) (B := B) :=
  atomSound_of evalCommutes eqSound evalWf

/-- CM: an accepted certificate solves the body at every generic
instance with the evidence (`CellShape` included), finitely. -/
theorem cellSound : CellSound (Label := Label) (B := B) :=
  cellSound_of atomSound cInstFin bodyAll cellCheck_certOk

/-- CM-open: acceptance under conservative queries gives `ValidOpen`. -/
theorem cellOpen : CellOpen (Label := Label) (B := B) :=
  cellOpen_of cellSound fragmentIff coverFree

/-- CM-impl: acceptance with the proposed queries gives `ValidOpen`. -/
theorem cellOpenImpl : CellOpenImpl (Label := Label) (B := B) :=
  cellOpenImpl_of cellOpen implSound

end Composition.Typed.Cells
