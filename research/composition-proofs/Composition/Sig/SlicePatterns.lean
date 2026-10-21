/-
Declaration-consistent enumeration: research definitions and proposed
exactness obligations. This does not change checkAll or production.
Only declared lacks/disjoint facts constrain these patterns; arbitrary
D equations and ff are ignored exactly as by consistentS.
-/
import Composition.Sig.SliceDefs

namespace Composition.Syntax

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- Allowed holders of one written label, under the declaration facts. -/
def holdersOK (P : SigProblem Label B) (l : Label) (rs : List Nat) : Bool :=
  P.D.all fun
    | .lacks r k => !(decide (k = l) && decide (r ∈ rs))
    | .disjoint r s => !(decide (r ∈ rs) && decide (s ∈ rs))
    | _ => true

/-- Product, one allowed holder subset per distinct written label.
The simple research definition still scans subsets to find each factor;
it promises no efficient implementation or bounded resource use. -/
def consistentPatterns (P : SigProblem Label B) : List (List (Nat × Label)) :=
  ((written P).eraseDups).foldr (fun l acc =>
    ((subsets P.rigidRow.eraseDups).filter (holdersOK P l)).flatMap fun rs =>
      acc.map fun p => rs.map (fun r => (r, l)) ++ p) [[]]

/-- Exactness in both directions as sets of pairs. Duplicated written
labels in pairs/patterns affect list cost, never samePattern lookup. -/
def CP (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B,
    (∀ p ∈ consistentPatterns P, ∃ q ∈ patterns P,
      consistentS P q = true ∧ samePattern p q = true) ∧
    (∀ q ∈ patterns P, consistentS P q = true →
      ∃ p ∈ consistentPatterns P, samePattern p q = true)

/-- Proposed alternate reference loop, not a production optimization. -/
def checkAllCons (P : SigProblem Label B) (T : CertTable Label B) : Bool :=
  (consistentPatterns P).all fun p => checkCert P p (lookupCert T p)

/-- Pointwise equality, including which certificate samePattern finds. -/
def C4 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) T, checkAllCons P T = checkAll P T

end Composition.Syntax
