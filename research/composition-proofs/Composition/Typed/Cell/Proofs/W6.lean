/-
Proof stream W6 (cellcheck/proof-plan.md, wave 2): the accepted and
refused scenarios of Cell/Scenarios.lean and Cell/ScenariosMore.lean.
The concrete scenarios close by kernel evaluation (`rfl`); `ScIntArm`
evaluates to one comparison `decide (b = b)` at an abstract `B`, closed
by `simp`. The parametric ones (`ScDep`, `ScDivide3`) are in W6/.
-/
import Composition.Typed.Cell.Proofs.W6.Divide
import Composition.Typed.Cell.Proofs.W6.Dep
import Composition.Typed.Cell.Proofs.W6.Divide3
import Composition.Typed.Bridge.ProofExamples

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

/-- `route`'s certificate with `u := r` overlapping `v`: refused. -/
theorem scBroken (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    ScBroken Label B := rfl

/-- `split` with its declaration: accepted. -/
theorem scSplitSig (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    ScSplitSig Label B := rfl

/-- `disjoint r r` empties `r`: accepted. -/
theorem scSelfDisjoint (B : Type) [DecidableEq B] : ScSelfDisjoint B := rfl

/-- The four certificate-validation refusals. -/
theorem scCertRefusals (B : Type) [DecidableEq B] (b : B) :
    ScCertRefusals B b := ⟨rfl, rfl, rfl, rfl⟩

/-- `intArmP`: `ValidOpen` (`intArmOpen`) and accepted. -/
theorem scIntArm (B : Type) [DecidableEq B] : ScIntArm B := by
  intro b
  refine ⟨intArmOpen b, ?_⟩
  unfold checkI cellCheck
  simp only [Bool.and_eq_true]
  refine ⟨⟨rfl, rfl⟩, ?_⟩
  simp only [intArmP, List.all_cons, List.all_nil, Bool.and_true,
    Bool.and_eq_true]
  refine ⟨rfl, ?_, rfl⟩
  change eqC (implQ (intArmP b)) (.record [(0, .base b)] [])
    (.record [(0, .base b)] []) = true
  simp [eqC, eqFC, sameW, sameCells, rowCubes]

/-- `dep` k and `divide`/`divide2` m: accepted at every size. -/
theorem scDep (B : Type) [DecidableEq B] : ScDep B :=
  ⟨ProofsW6.dep_check, fun m two => by
    cases two
    · exact ProofsW6.divide_false m
    · exact ProofsW6.divide_true m⟩

/-- `divide3`: option C's `sigma3` has a cell image, accepted for every
list of labels. -/
theorem scDivide3 (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    ScDivide3 Label B := fun as =>
  ⟨_, ProofsW6.ofProjCert_sigma3 as, ProofsW6.divide3_check as⟩

end Composition.Typed.Cells
