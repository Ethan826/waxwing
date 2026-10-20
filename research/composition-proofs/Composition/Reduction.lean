/-
The finite-reduction statements for existential call-site satisfiability
(second milestone, step 3). STATEMENTS ONLY: each is a `Prop` definition,
not a theorem; none is proved or assumed anywhere. They come back to the
author before any proof (dossier §10).
-/
import Composition.Binding

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

mutual
  /-- Labels written in an expression's record fields. -/
  def labelsT : TExpr Label B → List Label
    | .base _ => []
    | .arrow t u => labelsT t ++ labelsT u
    | .tvar _ => []
    | .record fs _ => labelsF fs

  def labelsF : Fields Label B → List Label
    | .nil => []
    | .cons l t rest => l :: labelsT t ++ labelsF rest
end

mutual
  /-- Row variables written as tails. -/
  def rowVarsT : TExpr Label B → List Nat
    | .base _ => []
    | .arrow t u => rowVarsT t ++ rowVarsT u
    | .tvar _ => []
    | .record fs tails => rowVarsF fs ++ tails

  def rowVarsF : Fields Label B → List Nat
    | .nil => []
    | .cons _ t rest => rowVarsT t ++ rowVarsF rest
end

mutual
  def tyVarsT : TExpr Label B → List Nat
    | .base _ => []
    | .arrow t u => tyVarsT t ++ tyVarsT u
    | .tvar n => [n]
    | .record fs _ => tyVarsF fs

  def tyVarsF : Fields Label B → List Nat
    | .nil => []
    | .cons _ t rest => tyVarsT t ++ tyVarsF rest
end

/-- Labels written anywhere in a problem, `lacks` atoms included. -/
def labelsOf : Problem Label B → List Label :=
  List.flatMap fun
    | .eq t u => labelsT t ++ labelsT u
    | .lacks _ l => [l]
    | .disjoint _ _ => []
    | .ff => []

def rowVarsOf : Problem Label B → List Nat :=
  List.flatMap fun
    | .eq t u => rowVarsT t ++ rowVarsT u
    | .lacks r _ => [r]
    | .disjoint r s => [r, s]
    | .ff => []

def tyVarsOf : Problem Label B → List Nat :=
  List.flatMap fun
    | .eq t u => tyVarsT t ++ tyVarsT u
    | _ => []

/-- A ground type mentions only labels in `L`, at every depth. -/
inductive Within (L : List Label) : G Label B → Prop
  | base (b : B) : Within L (.base b)
  | arrow {a c : G Label B} : Within L a → Within L c →
      Within L (.arrow a c)
  | record {f : Label → Option (G Label B)} :
      (∀ l, f l ≠ none → l ∈ L) →
      (∀ l g, f l = some g → Within L g) → Within L (.record f)

/-- Every value an assignment gives is within `L`; in particular every
row is finite, with domain inside `L`. -/
def AssignWithin (L : List Label) (θ : Assign Label B) : Prop :=
  (∀ n, Within L (θ.ty n)) ∧
    (∀ r l, θ.row r l ≠ none → l ∈ L) ∧
    (∀ r l g, θ.row r l = some g → Within L g)

/-- R1, existential reduction: a call-site problem has a solution iff it
has one that uses only the labels written in it, at every depth. No
stand-in for unwritten labels is needed. -/
def R1 (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ C : Problem Label B,
    Satisfiable C ↔ ∃ θ, AssignWithin (labelsOf C) θ ∧ Sat θ C

/-- The fields `{ l: fresh r l | l ∈ L, π r l }`, in `L`'s order. -/
def patternFields (π : Nat → Label → Bool) (fresh : Nat → Label → Nat)
    (r : Nat) : List Label → Fields Label B
  | [] => .nil
  | l :: ls =>
    if π r l then .cons l (.tvar (fresh r l)) (patternFields π fresh r ls)
    else patternFields π fresh r ls

/-- A presence pattern as a substitution: each row variable becomes the
closed record of its present labels, each at its own fresh type
variable. -/
def patternSubst (π : Nat → Label → Bool) (fresh : Nat → Label → Nat)
    (rs : List Nat) (L : List Label) : Subst Label B :=
  ⟨[], rs.map fun r => (r, (patternFields π fresh r L, []))⟩

/-- The fresh variables are distinct from each other and from the
problem's own type variables. -/
def FreshFor (C : Problem Label B) (fresh : Nat → Label → Nat) : Prop :=
  (∀ r l r' l', fresh r l = fresh r' l' → r = r' ∧ l = l') ∧
    ∀ r l, fresh r l ∉ tyVarsOf C

/-- A problem is closed when no row variable occurs in it. -/
def Closed (C : Problem Label B) : Prop := rowVarsOf C = []

/-- R2, presence patterns: a call-site problem has a solution iff, for
some presence pattern over its row variables and written labels, the
closed problem the pattern gives has one. Each row variable's field at
each label gets its own type variable. -/
def R2 (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (C : Problem Label B) (fresh : Nat → Label → Nat), FreshFor C fresh →
    (Satisfiable C ↔ ∃ π : Nat → Label → Bool,
      Satisfiable (substProblem
        (patternSubst π fresh (rowVarsOf C) (labelsOf C).eraseDups) C))

/-- R2′, closedness: a pattern's problem has no row variables, so R3
applies to it. Only the patterns' values on the problem's row variables
and written labels matter, so finitely many patterns need trying. -/
def R2Closed (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (C : Problem Label B) (fresh : Nat → Label → Nat)
    (π : Nat → Label → Bool),
    Closed (substProblem
      (patternSubst π fresh (rowVarsOf C) (labelsOf C).eraseDups) C)

/-- R3, the specification a closed-problem decider must meet. A `Prop`
like this is trivially met by a classical (noncomputable) choice, so R3
means decidability only for `f` given as a computable definition:
Robinson's unification with occurs check over base types, functions
and closed records, comparing label sets (to be written). -/
def R3Spec (f : Problem Label B → Bool) : Prop :=
  ∀ C : Problem Label B, Closed C → (f C = true ↔ Satisfiable C)

end Composition.Syntax
