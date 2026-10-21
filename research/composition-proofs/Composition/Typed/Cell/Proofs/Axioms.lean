/-
Axiom dependencies of the cell checker's first soundness tranche
(dossier §18.54-18.56). Run:
`lake env lean Composition/Typed/Cell/Proofs/Axioms.lean`; the output is
research/division-campaign/cellcheck/axioms.out.
-/
import Composition.Typed.Cell.Proofs.Main

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
