/-
Design stream CX (dossier §18.66), statements only: non-vacuity
checks. Each `Prop` names a concrete problem that should inhabit a
premise (or, for controls, fail to). None is proved. Prose:
research/division-campaign/refute/statements.md.
-/
import Composition.Typed.Refute.Rules
import Composition.Typed.Cell.Scenarios

namespace Composition.Typed.Refute

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type}

/-! ### `star-unlacked` (W5, `notOpenUnl`) -/

/-- W5's counter-instance written as a ground substitution: `h`
(row 0) is `{ f_n: {} }`, every `r_i` is empty. -/
def unlRho (n : Nat) : Subst Nat B :=
  ⟨[], (0, (.cons n (.record .nil []) .nil, [])) ::
    (starIdx n).map fun i => (i, (.nil, []))⟩

/-- The assignment `unlRho n` denotes: W5's `θR`. -/
def unlTheta (n : Nat) : Assign Nat B :=
  ⟨fun _ => emptyG, fun r => if r = 0 then single n emptyG else Row.empty⟩

/-- X1. W5's counter-instance inhabits CX's premise at the identity
extension. -/
def UnlCounter [DecidableEq B] (b : B) : Prop :=
  ∀ n, 1 ≤ n → CounterAt (cStar n b true false) id (unlRho n) (unlTheta n)

/-- X2. The same substitution, over `B ⊕ Nat`, is a checked
certificate. -/
def UnlChecked [DecidableEq B] (b : B) : Prop :=
  ∀ n, 1 ≤ n → CXChecked (cStar n b true false) (unlRho n)

/-- X3 (control). The valid `star` (`ScStar`) has no counter-instance
at any extension. -/
def StarNoCounter (b : B) : Prop :=
  ∀ n (B₁ : Type) [DecidableEq B₁] (i : B → B₁), Function.Injective i →
    ∀ ρ θR, ¬ CounterAt (cStar n b false false) i ρ θR

/-! ### The candidate c1 rules -/

/-- `Int = Bool` in the body, nothing declared. -/
def clashP (b c : B) : SigProblem Nat B := ⟨[], [], [], [.eq (.base b) (.base c)]⟩

/-- `x = x -> Int` in the body, nothing declared. -/
def occursP (b : B) : SigProblem Nat B :=
  ⟨[], [], [], [.eq (.tvar 0) (.arrow (.tvar 0) (.base b))]⟩

/-- X4. The clash rule fires on `clashP`, which is not `ValidOpen`. -/
def ClashFires : Prop :=
  ∀ b c : B, b ≠ c → ClashRule (clashP b c) ∧ ¬ ValidOpen (clashP b c)

/-- X5. The occurs rule fires on `occursP`, which is not `ValidOpen`. -/
def OccursFires : Prop :=
  ∀ b : B, OccursRule (occursP b) ∧ ¬ ValidOpen (occursP b)

/-- `x = Int`, `x` flexible: valid (take `x := Int`). -/
def flexP (b : B) : SigProblem Nat B := ⟨[], [], [], [.eq (.tvar 0) (.base b)]⟩

/-- A solver's choice `x := Bool`. -/
def badChoice (c : B) : Subst Nat B := ⟨[(0, .base c)], []⟩

/-- X6. `ClashAfterSubstSound` is false: `flexP b` is valid, yet the
clash rule fires on its body rewritten by `badChoice c`. -/
def ClashAfterSubstRefuted : Prop :=
  ∀ b c : B, b ≠ c →
    ValidOpen (flexP b) ∧ ClashIn (substProblem (badChoice c) (flexP b).B) ∧
      ¬ ClashAfterSubstSound (Label := Nat) (B := B)

end Composition.Typed.Refute
