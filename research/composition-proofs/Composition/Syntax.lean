/-
Finite constraint syntax for call-site problems and its interpretation
(second milestone, step 1).

Sorts: type variables and row variables, both numbered. Type expressions
are base types, functions, type variables and record types; a record
type is written fields plus row tails, `{ l1: t1, ..., ...r, ...s }`,
and denotes the disjoint composition of its fields and tails (D3).
Ground types are base types, functions and records whose rows are maps
from labels to ground types. All variables here are flexible: the
problem asks whether some assignment satisfies it.
-/
import Composition.Compose

namespace Composition.Syntax

open Classical Composition

variable {Label B : Type} [DecidableEq Label]

/-- Ground types. A record's row is a map from labels to ground types. -/
inductive G (Label B : Type) where
  | base : B → G Label B
  | arrow : G Label B → G Label B → G Label B
  | record : (Label → Option (G Label B)) → G Label B

mutual
  /-- Type expressions. -/
  inductive TExpr (Label B : Type) where
    | base : B → TExpr Label B
    | arrow : TExpr Label B → TExpr Label B → TExpr Label B
    | tvar : Nat → TExpr Label B
    | record : Fields Label B → List Nat → TExpr Label B

  /-- Written fields of a record type, in order. -/
  inductive Fields (Label B : Type) where
    | nil : Fields Label B
    | cons : Label → TExpr Label B → Fields Label B → Fields Label B
end

/-- An assignment of every type variable and row variable. -/
structure Assign (Label B : Type) where
  ty : Nat → G Label B
  row : Nat → Row Label (G Label B)

/-- The one-field row. -/
def single (l : Label) (g : G Label B) : Row Label (G Label B) :=
  fun k => if k = l then some g else none

mutual
  /-- The ground type an expression denotes, if its compositions are
  defined. -/
  noncomputable def evalT (θ : Assign Label B) :
      TExpr Label B → Option (G Label B)
    | .base b => some (.base b)
    | .arrow t u =>
      (evalT θ t).bind fun a => (evalT θ u).map (G.arrow a)
    | .tvar n => some (θ.ty n)
    | .record fs tails =>
      (evalF θ fs).bind fun fr =>
        (composeAll (fr :: tails.map θ.row)).map G.record

  /-- The row written fields denote; undefined if a label repeats. -/
  noncomputable def evalF (θ : Assign Label B) :
      Fields Label B → Option (Row Label (G Label B))
    | .nil => some Row.empty
    | .cons l t rest =>
      (evalT θ t).bind fun g =>
        (evalF θ rest).bind fun r => compose (single l g) r
end

/-- Atomic constraints (D5). `ff` is the unsatisfiable atom. -/
inductive Atom (Label B : Type) where
  | eq : TExpr Label B → TExpr Label B → Atom Label B
  | lacks : Nat → Label → Atom Label B
  | disjoint : Nat → Nat → Atom Label B
  | ff : Atom Label B

/-- An atom holds under an assignment. An equation needs both sides
defined and equal. -/
def Holds (θ : Assign Label B) : Atom Label B → Prop
  | .eq t u => ∃ g, evalT θ t = some g ∧ evalT θ u = some g
  | .lacks r l => θ.row r l = none
  | .disjoint r s => Disjoint (θ.row r) (θ.row s)
  | .ff => False

/-- A call-site problem: a finite conjunction of atoms. -/
abbrev Problem (Label B : Type) := List (Atom Label B)

def Sat (θ : Assign Label B) (C : Problem Label B) : Prop :=
  ∀ a ∈ C, Holds θ a

def Satisfiable (C : Problem Label B) : Prop := ∃ θ, Sat θ C

end Composition.Syntax
