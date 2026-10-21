/-
The P-1 bridge, statements only: intended instances N1-N6 and the
closed boundary (N3).
-/
import Composition.Typed.Bridge.Valid
import Composition.Typed.Bridge.Fresh
import Composition.Typed.Examples
import Composition.Typed.ExamplesFlat
import Composition.TypedAttack.ShapeSplitCore

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B' : Type} [DecidableEq Label]

/-! ### Intended instances and the closed boundary -/

/-- N1. `shape-split` is closed-valid over `Unit` and not option-B
valid. -/
def ShapeSplitSeparates : Prop :=
  ValidFin (TypedAttack.shapeSplit () : SigProblem Nat Unit) ∧
    ¬ ValidOpen (TypedAttack.shapeSplit () : SigProblem Nat Unit)

/-- N2. `route` is option-B valid, at every base type. -/
def RouteOpen : Prop := ValidOpen (routeP : SigProblem Label B)

/-- N2'. The flat-equation example is option-B valid. -/
def AgreeOpen : Prop := ValidOpen (agreeP : SigProblem Label B)

/-- N3 (P-3 boundary). D3b completeness fails for closed validity: at
`shape-split` over `Unit`, the explicit generic instance is within the
problem's symbols, the problem is closed-valid in its one pattern, and
the body is not solvable there. -/
def ClosedBoundary : Prop :=
  let P : SigProblem Nat Unit := TypedAttack.shapeSplit ()
  let π : Pattern Nat := fun _ _ => false
  GenericInst P π (thetaFree P π) ∧ WithinC P (thetaFree P π) ∧
    ValidFinIn P π ∧ ¬ SolvableFinAt P (thetaFree P π)

/-- N4. B2's premises are jointly inhabited at `route`, extension
`inl`, constants realized by `inr`. -/
def RouteFreshOn : Prop :=
  ∀ π : Pattern Nat, ∃ (z : Cell → Nat) (U : List (CConst Nat)),
    FreshLabels (routeP : SigProblem Nat B) z ∧
    FreshBasesOn (routeP : SigProblem Nat B)
      (Sum.inl : B → B ⊕ CConst Nat) U Sum.inr ∧
    ConstsInC (routeP : SigProblem Nat B) U (thetaFree routeP π) ∧
    WithinC (routeP : SigProblem Nat B) (thetaFree routeP π) ∧
    GenericInst (routeP : SigProblem Nat B) π (thetaFree routeP π)

/-- A written base and a rigid type variable: `∀ α. ∃ u1 u2 m1 m2 β.
{ ...u1, ...u2 } = { f: α }, { ...u1, ...m1 } = { f: b },
{ ...u2, ...m2 } = { f: β }`. The `b` arm is not exhaustive; the
`β` arm takes every α, atoms included. Label `f` = 0; rows `u1 u2 m1
m2` = 0-3; `α` = 0 (rigid), `β` = 1. -/
def intArmP (b : B) : SigProblem Nat B :=
  ⟨[0], [], [],
   [.eq (.record .nil [0, 1]) (.record (.cons 0 (.tvar 0) .nil) []),
    .eq (.record .nil [0, 2]) (.record (.cons 0 (.base b) .nil) []),
    .eq (.record .nil [1, 3]) (.record (.cons 0 (.tvar 1) .nil) [])]⟩

/-- N5. `intArmP` is option-B valid: written base kept, α may be an
atom. -/
def IntArmOpen : Prop := ∀ b : B, ValidOpen (intArmP b)

/-- N6. B2's premises with a written base (`basesOf ≠ []`), so the
disjointness conjunct of `FreshBasesOn` is exercised. -/
def IntArmFreshOn : Prop :=
  ∀ (b : B) (π : Pattern Nat), ∃ (z : Cell → Nat) (U : List (CConst Nat)),
    FreshLabels (intArmP b) z ∧
    FreshBasesOn (intArmP b) (Sum.inl : B → B ⊕ CConst Nat) U Sum.inr ∧
    ConstsInC (intArmP b) U (thetaFree (intArmP b) π) ∧
    WithinC (intArmP b) (thetaFree (intArmP b) π) ∧
    GenericInst (intArmP b) π (thetaFree (intArmP b) π)

/-- Two written bases, both required of α. With injective extensions
`D` is unsatisfiable; identifying the bases makes it satisfiable while
the body `ff` stays false. -/
def twoBaseP (b₁ b₂ : B) : SigProblem Nat B :=
  ⟨[0], [], [.eq (.tvar 0) (.base b₁), .eq (.tvar 0) (.base b₂)], [.ff]⟩

/-- N7. Why extensions are injective (§1): a non-injective map changes
`D`'s satisfiability. Second review, §10. -/
def TwoBaseInjective : Prop :=
  ∀ b₁ b₂ : B, b₁ ≠ b₂ →
    ValidOpen (twoBaseP b₁ b₂) ∧
      ¬ ValidFin ((twoBaseP b₁ b₂).mapBase (fun _ => ()))

end Composition.Typed
