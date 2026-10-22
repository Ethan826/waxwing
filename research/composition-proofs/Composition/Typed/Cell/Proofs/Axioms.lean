/-
Axiom dependencies of the cell checker's proofs: the first soundness
tranche (dossier §18.54-18.56) and the second wave (§18.57). Run:
`lake env lean Composition/Typed/Cell/Proofs/Axioms.lean`; the output is
research/division-campaign/cellcheck/axioms.out.
-/
import Composition.Typed.Cell.Proofs.Main
import Composition.Typed.Cell.Proofs.Wave2

open Composition.Typed.Cells

-- Instantiation and finiteness (A).
#print axioms cInstFin
#print axioms pieceIsSubRow
-- Definedness and the original body (B).
#print axioms dupRefused
#print axioms eqBothSides
#print axioms bodyAll
#print axioms evalWf
#print axioms cellCheck_certOk
-- Conservative queries (C), with one direction of QX3.
#print axioms implSound
#print axioms apartSound
#print axioms eqSound
#print axioms coverS_sound
-- Coverage at `thetaFree` and the guard (D).
#print axioms coverFree
#print axioms cellShape_thetaFree
#print axioms fragmentIff
-- The evaluator (E), instantiated.
#print axioms evalCommutes
#print axioms evalDefined
-- Assembly (F), instantiated.
#print axioms atomSound
#print axioms cellSound
#print axioms cellOpen
#print axioms cellOpenImpl
-- Premise checks (G).
#print axioms scRoute
#print axioms cellShapeNeeded
#print axioms routeP_hasInstance
-- Wave 2: computational exactness (W1).
#print axioms freeSIff
#print axioms cellPossExact
#print axioms coverExact
-- Wave 2: exactness over the region (W2, W3 instantiated).
#print axioms possWExact
#print axioms possBothExact
#print axioms cellBothExact
#print axioms coverRegionExact
#print axioms regionTrivialities
-- Wave 2: `star` controls (W5).
#print axioms scStarUnlacked
#print axioms scStarUndeclared
#print axioms scStarCross
-- Wave 2: scenario families (W6).
#print axioms scDep
#print axioms scDivide3
#print axioms scIntArm
#print axioms scSplitSig
#print axioms scSelfDisjoint
#print axioms scBroken
#print axioms scCertRefusals
-- Wave 2: controls and the `CellShape` regression guards (W7).
#print axioms scShapeSplit
#print axioms scSplitFree
#print axioms scOutsideFragment
#print axioms scDivide5
#print axioms not_cellSoundNoShape
#print axioms not_evalDefinedNoShape
-- Wave 2: representation correspondence (W8).
#print axioms projPieceDen
#print axioms projGuardRefused
#print axioms schPieceDen
#print axioms declaredIsNoCommonCell
-- Wave 2: the tautology reduction, this certificate format only (W9).
#print axioms coverTautology
#print axioms checkTautology
