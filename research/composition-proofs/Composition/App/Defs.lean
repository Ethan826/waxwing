/-
Scope A (dossier §18.190-§18.192;
docs/plans/2026-11-13-scope-a-free-constructor-design.md): the
free-constructor model for data applications, beside the existing model
(decision U4). Definitions only. Nothing in `Composition.Syntax` or any
existing file changes; this module imports them.

D1 `GA`, D2 `TExprA`, D3 `evalA`, D4 `HoldsA`/`SatA`, and the signature
problem over them. Type ids are `Nat` (the compiler's `TypeId`). Handler
heads are not in the model: they stay under `Outside HandlerType`.
-/
import Composition.Syntax
import Composition.Sig.Finite

namespace Composition.App

open Classical Composition Composition.Syntax

variable {Label B : Type}

/-- D1. Ground values with free constructor nodes: `app t vs` is the
declared type `t` applied to the values `vs`, equal to another node only
when the heads and the arguments are equal (S1, Lean's `noConfusion`). -/
inductive GA (Label B : Type) where
  | base : B → GA Label B
  | arrow : GA Label B → GA Label B → GA Label B
  | record : (Label → Option (GA Label B)) → GA Label B
  | app : Nat → List (GA Label B) → GA Label B

mutual
  /-- D2. Type expressions with applications. -/
  inductive TExprA (Label B : Type) where
    | base : B → TExprA Label B
    | arrow : TExprA Label B → TExprA Label B → TExprA Label B
    | tvar : Nat → TExprA Label B
    | record : FieldsA Label B → List Nat → TExprA Label B
    | app : Nat → ArgsA Label B → TExprA Label B

  /-- Written fields of a record type, in order. -/
  inductive FieldsA (Label B : Type) where
    | nil : FieldsA Label B
    | cons : Label → TExprA Label B → FieldsA Label B → FieldsA Label B

  /-- The arguments of an application, in order. -/
  inductive ArgsA (Label B : Type) where
    | nil : ArgsA Label B
    | cons : TExprA Label B → ArgsA Label B → ArgsA Label B
end

/-- An assignment of every type variable and row variable to `GA`. -/
structure AssignA (Label B : Type) where
  ty : Nat → GA Label B
  row : Nat → Row Label (GA Label B)

variable [DecidableEq Label]

/-- The one-field row over `GA`. -/
def singleA (l : Label) (g : GA Label B) : Row Label (GA Label B) :=
  fun k => if k = l then some g else none

mutual
  /-- D3. The value an expression denotes, if every composition in it is
  defined. As `evalT`, plus: an application is defined exactly when
  every argument is. -/
  noncomputable def evalA (θ : AssignA Label B) :
      TExprA Label B → Option (GA Label B)
    | .base b => some (.base b)
    | .arrow t u =>
      (evalA θ t).bind fun a => (evalA θ u).map (GA.arrow a)
    | .tvar n => some (θ.ty n)
    | .record fs tails =>
      (evalFA θ fs).bind fun fr =>
        (composeAll (fr :: tails.map θ.row)).map GA.record
    | .app t as => (evalArgsA θ as).map (GA.app t)

  noncomputable def evalFA (θ : AssignA Label B) :
      FieldsA Label B → Option (Row Label (GA Label B))
    | .nil => some Row.empty
    | .cons l t rest =>
      (evalA θ t).bind fun g =>
        (evalFA θ rest).bind fun r => compose (singleA l g) r

  noncomputable def evalArgsA (θ : AssignA Label B) :
      ArgsA Label B → Option (List (GA Label B))
    | .nil => some []
    | .cons t rest =>
      (evalA θ t).bind fun g => (evalArgsA θ rest).map (g :: ·)
end

/-- Atoms over `TExprA`. `lacks` and `disjoint` read rows only, as in
`Composition.Syntax.Atom`. -/
inductive AtomA (Label B : Type) where
  | eq : TExprA Label B → TExprA Label B → AtomA Label B
  | lacks : Nat → Label → AtomA Label B
  | disjoint : Nat → Nat → AtomA Label B
  | ff : AtomA Label B

/-- D4. -/
def HoldsA (θ : AssignA Label B) : AtomA Label B → Prop
  | .eq t u => ∃ g, evalA θ t = some g ∧ evalA θ u = some g
  | .lacks r l => θ.row r l = none
  | .disjoint r s => Disjoint (θ.row r) (θ.row s)
  | .ff => False

abbrev ProblemA (Label B : Type) := List (AtomA Label B)

def SatA (θ : AssignA Label B) (C : ProblemA Label B) : Prop :=
  ∀ a ∈ C, HoldsA θ a

/-- A signature problem over `TExprA` (the shape of `SigProblem`). -/
structure SigProblemA (Label B : Type) where
  rigidTy : List Nat
  rigidRow : List Nat
  D : ProblemA Label B
  B : ProblemA Label B

def combineA (P : SigProblemA Label B) (θR θF : AssignA Label B) :
    AssignA Label B :=
  ⟨fun n => if n ∈ P.rigidTy then θR.ty n else θF.ty n,
   fun r => if r ∈ P.rigidRow then θR.row r else θF.row r⟩

/-! ### Finiteness, as `ValidFin` asks -/

mutual
  def FinGA : GA Label B → Prop
    | .base _ => True
    | .arrow a c => FinGA a ∧ FinGA c
    | .record f => FinRow f ∧ ∀ k, FinOA (f k)
    | .app _ vs => FinListA vs

  def FinOA : Option (GA Label B) → Prop
    | none => True
    | some g => FinGA g

  def FinListA : List (GA Label B) → Prop
    | [] => True
    | v :: vs => FinGA v ∧ FinListA vs
end

def FinAssignA (θ : AssignA Label B) : Prop :=
  (∀ n, FinGA (θ.ty n)) ∧ ∀ r, FinGA (.record (θ.row r))

/-- `ValidFin` over `GA`, without requirement atoms. -/
def ValidFinA (P : SigProblemA Label B) : Prop :=
  ∀ θR, (∀ n ∈ P.rigidTy, FinGA (θR.ty n)) →
    (∀ r ∈ P.rigidRow, FinGA (.record (θR.row r))) → SatA θR P.D →
      ∃ θF, FinAssignA θF ∧ SatA (combineA P θR θF) P.B

/-! ### Base renaming, for the injective base extensions of `ValidOpen` -/

mutual
  def TExprA.mapBase {B₁ : Type} (i : B → B₁) :
      TExprA Label B → TExprA Label B₁
    | .base b => .base (i b)
    | .arrow t u => .arrow (t.mapBase i) (u.mapBase i)
    | .tvar n => .tvar n
    | .record fs tails => .record (fs.mapBase i) tails
    | .app t as => .app t (as.mapBase i)

  def FieldsA.mapBase {B₁ : Type} (i : B → B₁) :
      FieldsA Label B → FieldsA Label B₁
    | .nil => .nil
    | .cons l t rest => .cons l (t.mapBase i) (rest.mapBase i)

  def ArgsA.mapBase {B₁ : Type} (i : B → B₁) :
      ArgsA Label B → ArgsA Label B₁
    | .nil => .nil
    | .cons t rest => .cons (t.mapBase i) (rest.mapBase i)
end

def AtomA.mapBase {B₁ : Type} (i : B → B₁) :
    AtomA Label B → AtomA Label B₁
  | .eq t u => .eq (t.mapBase i) (u.mapBase i)
  | .lacks r l => .lacks r l
  | .disjoint r s => .disjoint r s
  | .ff => .ff

def SigProblemA.mapBase {B₁ : Type} (i : B → B₁)
    (P : SigProblemA Label B) : SigProblemA Label B₁ :=
  ⟨P.rigidTy, P.rigidRow, P.D.map (AtomA.mapBase i),
   P.B.map (AtomA.mapBase i)⟩

/-- D5 (requirement-free part): `ValidFin` over `GA` at every injective
base extension, the shape of `ValidOpen`. -/
def ValidOpenA (P : SigProblemA Label B) : Prop :=
  ∀ (B₁ : Type) (i : B → B₁), Function.Injective i →
    ValidFinA (P.mapBase i)

end Composition.App
