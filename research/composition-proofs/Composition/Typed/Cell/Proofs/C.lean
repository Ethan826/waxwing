/-
Proof stream C (research/division-campaign/cellcheck/proof-plan.md):
conservative query soundness. Proves CV2 `ImplSound` (`implSound`),
CD2 `ApartSound` (`apartSound`) and CB3 `EqSound` (`eqSound`), with
two lemmas on the query computations: the soundness (→) direction of
QX3 `CoverExact` (`coverS_sound`) and the ← direction of QX2
`CellPossExact` (`cellPossS_complete`). The converse directions of QX2
and QX3 are not proved here. The proofs live in the parts under
`Proofs/C/`, imported here in order.
-/
import Composition.Typed.Cell.Proofs.C.Cover
import Composition.Typed.Cell.Proofs.C.Impl
import Composition.Typed.Cell.Proofs.C.Apart
import Composition.Typed.Cell.Proofs.C.Pieces
import Composition.Typed.Cell.Proofs.C.Eq
