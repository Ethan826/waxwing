/-
Named corollaries of the accepted scenarios (dossier §18.59). Each
accepted problem is `ValidOpen`, by `cellOpenImpl`; and `divide5` with
no written labels is accepted, the boundary case of `scDivide5`, whose
universal refusal needs a non-empty list. `scIntArm` and `scRoute`
already state `ValidOpen`.
-/
import Composition.Typed.Cell.Proofs.Main
import Composition.Typed.Cell.Proofs.Wave2
import Composition.Typed.Cell.Proofs.W4

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

/-- `star` is `ValidOpen` at every n. -/
theorem star_validOpen {B : Type} [DecidableEq B] (b : B) (n : Nat) :
    ValidOpen (cStar n b false false) :=
  cellOpenImpl _ _ (scStar B b n)

/-- `star-read` is `ValidOpen` at every n. -/
theorem starRead_validOpen {B : Type} [DecidableEq B] (b : B) (n : Nat) :
    ValidOpen (cStarR n b (starIdx n) id) :=
  cellOpenImpl _ _ (scStarRead B b n)

/-- `dep` is `ValidOpen` at every k. -/
theorem dep_validOpen {B : Type} [DecidableEq B] (k : Nat) :
    ValidOpen (depFam (B := B) k) :=
  cellOpenImpl _ _ ((scDep B).1 k)

/-- `divide` and `divide2` are `ValidOpen` at every m. -/
theorem divide_validOpen {B : Type} [DecidableEq B] (m : Nat)
    (two : Bool) : ValidOpen (divideSig (B := B) m two) :=
  cellOpenImpl _ _ ((scDep B).2 m two)

/-- `divide3` is `ValidOpen` for every list of labels. -/
theorem divide3_validOpen {Label B : Type} [DecidableEq Label]
    [DecidableEq B] (as : List Label) :
    ValidOpen (divide3Sig (B := B) as) :=
  match scDivide3 Label B as with
  | ⟨_, _, h⟩ => cellOpenImpl _ _ h

/-- The declared `split` is `ValidOpen`. -/
theorem splitSig_validOpen (Label B : Type) [DecidableEq Label]
    [DecidableEq B] : ValidOpen (splitSig : SigProblem Label B) :=
  cellOpenImpl _ _ (scSplitSig Label B)

/-- `D = [disjoint 0 0]` with `lacks 0 0` and `{...0} = {}` is
`ValidOpen`. -/
theorem selfDisjoint_validOpen (B : Type) [DecidableEq B] :
    ValidOpen (⟨[], [0], [.disjoint 0 0],
      [.lacks 0 0, .eq (.record .nil [0]) (.record .nil [])]⟩ :
        SigProblem Nat B) :=
  cellOpenImpl _ _ (scSelfDisjoint B)

/-- `divide5` with no written labels is accepted (route's division).
Source: the wave-2 soundness review's scratch theorem, verbatim. -/
theorem divide5_nil_accepted (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    checkI (divide5Sig (B := B) ([] : List Label))
      ⟨[], [(3, .record [] [⟨0, [], [[(1, false)]]⟩]),
            (4, .record [] [⟨0, [], [[(1, true)]]⟩])]⟩ = true := rfl

end Composition.Typed.Cells
