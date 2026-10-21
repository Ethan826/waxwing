/-
Running `witness` (Witness.lean) on small problems. A term is read at
one label through `STerm.evalBits`, the label's membership in each rest
as bits (`evalBits_iff`); the `#guard`s compare the computed terms, over
every vector on the indices involved, with the expected set formulas.
`split` gets `u = R₀ ∖ R₁` and `v = R₀ ∩ R₁` on every region `D` allows;
invalid controls get `none`.
-/
import Composition.Presence.Witness
import Composition.Presence.Examples

namespace Composition.Presence

variable {Label : Type}

/-- A term at one label whose membership in each rest is `b`. -/
def STerm.evalBits (b : Nat → Bool) : STerm → Bool
  | .empty => false
  | .rigid i => b i
  | .union x y => x.evalBits b || y.evalBits b
  | .inter x y => x.evalBits b && y.evalBits b
  | .diff x y => x.evalBits b && !y.evalBits b

theorem evalBits_iff {R : Nat → LSet Label} {k : Label} {b : Nat → Bool}
    (hb : ∀ i, b i = true ↔ R i k) :
    ∀ t : STerm, t.evalBits b = true ↔ t.eval R k
  | .empty => by simp [STerm.evalBits, STerm.eval]
  | .rigid i => hb i
  | .union x y => by
    simp [STerm.evalBits, STerm.eval, evalBits_iff hb x, evalBits_iff hb y]
  | .inter x y => by
    simp [STerm.evalBits, STerm.eval, evalBits_iff hb x, evalBits_iff hb y]
  | .diff x y => by
    simp only [STerm.evalBits, STerm.eval, ← evalBits_iff hb x,
      ← evalBits_iff hb y]
    cases x.evalBits b <;> cases y.evalBits b <;> decide

/-- `t` reads as `f` at every vector on `M` that `D` allows. -/
def agreesOn (P : PProblem Label) (M : List Nat) (t : STerm)
    (f : (Nat → Bool) → Bool) : Bool :=
  (vecs M).all fun b =>
    !(P.D.all (holdsBB b fun _ => false)) || t.evalBits b == f b

namespace WitnessExamples

open Composition.Presence.Examples (split bad)

-- `split`: no written labels, so the pattern is empty.
#guard (witness split []).isSome
#guard ((witness split []).map (·.1)) == some []
-- `u = R₀ ∖ R₁`, `v = R₀ ∩ R₁` wherever `r₁ ∩ r₂ = ∅` allows.
#guard ((witness split []).map fun w =>
  agreesOn split [0, 1, 2] (w.2 0) fun b => b 0 && !b 1) == some true
#guard ((witness split []).map fun w =>
  agreesOn split [0, 1, 2] (w.2 1) fun b => b 0 && b 1) == some true
-- No other flexible set is used.
#guard ((witness split []).map fun w =>
  agreesOn split [0, 1, 2] (w.2 2) fun _ => false) == some true
-- The all-false region (a label in no rest) is in no term.
#guard ((witness split []).map fun w =>
  (w.2 0).evalBits (fun _ => false) || (w.2 1).evalBits (fun _ => false))
  == some false

-- Invalid controls: without `D`, and `r₀ ∩ r₀ = ∅`.
#guard (witness ({ D := [], B := splitB } : PProblem Nat) []).isNone
#guard (witness bad []).isNone

-- `keepOut` (`r₀ = u`, `7 ∉ u`) given `7 ∉ r₀`: `Q` is empty, `u = R₀`.
#guard ((witness ({ D := [.lacks 7 (.rigid 0)], B := keepOut } :
  PProblem Nat) []).map (·.1)) == some []
#guard ((witness ({ D := [.lacks 7 (.rigid 0)], B := keepOut } :
  PProblem Nat) []).map fun w =>
    agreesOn ({ D := [.lacks 7 (.rigid 0)], B := keepOut } : PProblem Nat)
      [0] (w.2 0) fun b => b 0) == some true
-- Without the clause the rest part passes, but the pattern `7 ∈ r₀`
-- has no written choice; the pattern `7 ∉ r₀` still has one.
#guard (witness ({ D := [], B := keepOut } : PProblem Nat) [(0, 7)]).isNone
#guard (witness ({ D := [], B := keepOut } : PProblem Nat) []).isSome

-- `withLab`: `7 ∪ r₀ = 7 ∪ u`, `7 ∉ u`; `u = R₀` on the rest.
#guard ((witness withLab []).map (·.1)) == some []
#guard ((witness withLab []).map fun w =>
  agreesOn withLab [0] (w.2 0) fun b => b 0) == some true

-- `noPattern`: vacuously valid (no pattern satisfies `D`), and the rest
-- part fails, so `witness` gives nothing; `valid_iff_witness` only asks
-- about patterns `D` allows.
#guard (witness noPattern []).isNone
#guard !dSatCheck noPattern

-- The two checks agree with `validCheck` on these problems.
#guard restOk split == bitCheck split
#guard restOk bad == bitCheck bad
#guard restOk noPattern == bitCheck noPattern

end WitnessExamples

end Composition.Presence
