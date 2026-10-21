/-
Slicing a signature problem (dossier §18.20 item 4;
research/division-campaign/slicing/statements.md). STATEMENTS ONLY:
definitions, and each claim a `Prop` definition. None is proved or
assumed anywhere; they wait for the author's review of the definitions.

A slice is a sub-problem: some of `D`, some of `B`, and the rigid
variables among its own. Every variable links, of either sort, rigid or
flexible, at any depth (a row inside a field type counts), in `D` as in
`B`. An atom that mentions no variable goes to the ground slice, which
is kept and checked like any other. `IsSlicing` is the general shape;
`slices` computes the finest one (connected components plus the ground
slice). The `#guard`s show the definitions compute what statements.md
§2 says on its examples; they prove nothing.
-/
import Composition.Sig.Patterns

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- A type variable or a row variable. -/
inductive SVar where
  | ty : Nat → SVar
  | row : Nat → SVar
  deriving DecidableEq

/-- The variables an atom mentions, at any depth. -/
def atomVars (a : Atom Label B) : List SVar :=
  (tyVarsOf [a]).map .ty ++ (rowVarsOf [a]).map .row

def varsOf (C : Problem Label B) : List SVar := C.flatMap atomVars

/-- Rigid in `P`. -/
def RigidIn (P : SigProblem Label B) : SVar → Prop
  | .ty n => n ∈ P.rigidTy
  | .row r => r ∈ P.rigidRow

/-! ### The general shape -/

/-- `S` slices `P`: each slice keeps some of `P`'s clauses and body, and
agrees with `P` on which of its variables are rigid; every atom of `P`
lies in some slice; two slices share no variable. A variable-free atom
may lie in several slices. -/
structure IsSlicing (P : SigProblem Label B) (S : List (SigProblem Label B)) :
    Prop where
  sub : ∀ Q ∈ S, (∀ a ∈ Q.D, a ∈ P.D) ∧ ∀ a ∈ Q.B, a ∈ P.B
  sort : ∀ Q ∈ S, ∀ x ∈ varsOf (Q.D ++ Q.B), RigidIn Q x ↔ RigidIn P x
  cover : (∀ a ∈ P.D, ∃ Q ∈ S, a ∈ Q.D) ∧ ∀ a ∈ P.B, ∃ Q ∈ S, a ∈ Q.B
  apart : S.Pairwise fun Q Q' =>
    ∀ x ∈ varsOf (Q.D ++ Q.B), x ∉ varsOf (Q'.D ++ Q'.B)

/-! ### The computed slicing -/

def isGround (a : Atom Label B) : Bool := (atomVars a).isEmpty

def touches (vs : List SVar) (a : Atom Label B) : Bool :=
  (atomVars a).any (· ∈ vs)

/-- Add the variables of every atom that meets `vs`. -/
def grow (C : Problem Label B) (vs : List SVar) : List SVar :=
  (vs ++ (C.filter (touches vs)).flatMap atomVars).eraseDups

def closeN (C : Problem Label B) : Nat → List SVar → List SVar
  | 0, vs => vs
  | n + 1, vs => closeN C n (grow C vs)

/-- The variables connected to atom `a` through atoms of `C`. Each round
that adds a variable adds a new atom's, so `C.length` rounds suffice. -/
def component (C : Problem Label B) (a : Atom Label B) : List SVar :=
  closeN C C.length (atomVars a)

def atomsOf (P : SigProblem Label B) : Problem Label B := P.D ++ P.B

/-- One variable set per component, in order of its first atom. -/
def componentSets (P : SigProblem Label B) : List (List SVar) :=
  (atomsOf P).foldl (fun acc a =>
    if isGround a || acc.any (touches · a) then acc
    else acc ++ [component (atomsOf P) a]) []

/-- The slice on the variables `vs`. -/
def sliceOn (P : SigProblem Label B) (vs : List SVar) : SigProblem Label B :=
  ⟨P.rigidTy.filter (SVar.ty · ∈ vs), P.rigidRow.filter (SVar.row · ∈ vs),
   P.D.filter (touches vs), P.B.filter (touches vs)⟩

/-- Every variable-free atom of `D` and of `B`, kept. -/
def groundSlice (P : SigProblem Label B) : SigProblem Label B :=
  ⟨[], [], P.D.filter isGround, P.B.filter isGround⟩

def slices (P : SigProblem Label B) : List (SigProblem Label B) :=
  groundSlice P :: (componentSets P).map (sliceOn P)

/-! ### Vacuity -/

def DSat (P : SigProblem Label B) : Prop := ∃ θ, Sat θ P.D

/-- `D` has a solution finite at the rigid variables (`ValidFin`'s range). -/
def DSatFin (P : SigProblem Label B) : Prop :=
  ∃ θ : Assign Label B, (∀ n ∈ P.rigidTy, FinG (θ.ty n)) ∧
    (∀ r ∈ P.rigidRow, FinG (.record (θ.row r))) ∧ Sat θ P.D

/-! ### Statements -/

/-- S0: the computed slices are a slicing. -/
def S0 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B, IsSlicing P (slices P)

/-- `D` is satisfiable iff it is in every slice. -/
def DSatSplit (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (P : SigProblem Label B) S, IsSlicing P S → (DSat P ↔ ∀ Q ∈ S, DSat Q)

/-- S1, independence: valid iff `D` is impossible or every slice is
valid. The disjunct is needed: `D` impossible in one slice makes `P`
valid while another slice may be invalid (`vacuity-one-slice`). -/
def S1 (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (P : SigProblem Label B) S, IsSlicing P S →
    (ValidAll P ↔ ¬ DSat P ∨ ∀ Q ∈ S, ValidAll Q)

def S1Fin (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (P : SigProblem Label B) S, IsSlicing P S →
    (ValidFin P ↔ ¬ DSatFin P ∨ ∀ Q ∈ S, ValidFin Q)

/-- `S` slices `P`'s body by flexible variables only: every slice keeps
all of `D` and `P`'s rigid lists; slices share only rigid variables. -/
structure IsFlexSlicing (P : SigProblem Label B)
    (S : List (SigProblem Label B)) : Prop where
  same : ∀ Q ∈ S, Q.rigidTy = P.rigidTy ∧ Q.rigidRow = P.rigidRow ∧ Q.D = P.D
  sub : ∀ Q ∈ S, ∀ a ∈ Q.B, a ∈ P.B
  cover : ∀ a ∈ P.B, ∃ Q ∈ S, a ∈ Q.B
  apart : S.Pairwise fun Q Q' =>
    ∀ x ∈ varsOf Q.B, x ∈ varsOf Q'.B → RigidIn P x

/-- S1r, the refinement: rigid variables need not link, when every
slice keeps all of `D`; no vacuity disjunct. -/
def S1r (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (P : SigProblem Label B) S, IsFlexSlicing P S →
    (ValidAll P ↔ ∀ Q ∈ S, ValidAll Q) ∧ (ValidFin P ↔ ∀ Q ∈ S, ValidFin Q)

/-- S1-acc: P9s's acceptance commutes with the computed slicing. -/
def S1Acc (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B, Accepts P ↔ ∀ Q ∈ slices P, Accepts Q

/-- The pairs some slice makes relevant: its rigid rows with the labels
written in it. -/
def relevantPairs (P : SigProblem Label B) : List (Nat × Label) :=
  (slices P).flatMap pairs

/-- P9s's rule, asking only for patterns that hold no irrelevant pair. -/
def AcceptsOn (P : SigProblem Label B) (keep : List (Nat × Label)) : Prop :=
  ∀ π, Consistent P π → (∀ r l, (r, l) ∉ keep → π r l = false) →
    ∃ σ, Certifies P π σ

/-- S2, irrelevant pairs. -/
def S2 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B, Accepts P ↔ AcceptsOn P (relevantPairs P)

/-! ### Checkers and their statements -/

/-- `checkAll` over the patterns of relevant pairs only. -/
def checkAllOn (P : SigProblem Label B) (T : CertTable Label B) : Bool :=
  (subsets (relevantPairs P)).all fun p =>
    !consistentS P p || checkCert P p (lookupCert T p)

/-- `checkAll` on every slice, one table each, in order. -/
def checkSliced (P : SigProblem Label B) (Ts : List (CertTable Label B)) :
    Bool :=
  (slices P).length == Ts.length &&
    ((slices P).zip Ts).all fun e => checkAll e.1 e.2

/-- C1: the sliced checker is sound (from S0, S1, S1Fin and K6). -/
def C1 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) Ts, checkSliced P Ts = true →
    ValidAll P ∧ ValidFin P

/-- C2: some table passes the whole iff some tables pass the slices. -/
def C2 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B,
    (∃ T, checkAll P T = true) ↔ ∃ Ts, checkSliced P Ts = true

/-- C3: S2 for the checker, soundness and verdict. -/
def C3 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B,
    (∀ T, checkAllOn P T = true → ValidAll P ∧ ValidFin P) ∧
    ((∃ T, checkAll P T = true) ↔ ∃ T, checkAllOn P T = true)

/-! ### What the definitions compute (statements.md §5.1) -/

section Examples

/-- A record of tails only. -/
def rows (ts : List Nat) : TExpr String String := .record .nil ts

/-- `x = {..r}`, `x = {..s}`: one slice through the flexible `x`. -/
def sharedTy : SigProblem String String :=
  ⟨[], [0, 1], [], [.eq (.tvar 1) (rows [0]), .eq (.tvar 1) (rows [1])]⟩

#guard (componentSets sharedTy).length == 1

/-- `u = r` and `u = s` inside a field `f`: one slice. -/
def nestedRow : SigProblem String String :=
  let f (r : Nat) : TExpr String String :=
    .record (.cons "f" (rows [r]) .nil) []
  ⟨[], [0, 1], [], [.eq (f 3) (f 0), .eq (f 3) (f 1)]⟩

#guard (componentSets nestedRow).length == 1

/-- `ff` beside `u = r`: kept in the ground slice. -/
def groundFF : SigProblem String String :=
  ⟨[], [0], [], [.eq (rows [3]) (rows [0]), .ff]⟩

#guard (groundSlice groundFF).B.length == 1
#guard (componentSets groundFF).length == 1

/-- `u = r`, `u lacks a`: `(0, "a")` is relevant though no atom names
row 0 and `a` together. -/
def atomRel : SigProblem String String :=
  ⟨[], [0], [], [.eq (rows [3]) (rows [0]), .lacks 3 "a"]⟩

#guard relevantPairs atomRel == [(0, "a")]

/-- Two independent parts: two slices, three relevant pairs of four. -/
def twoParts : SigProblem String String :=
  ⟨[], [0, 1], [.lacks 1 "b"],
   [.eq (rows [3]) (rows [0]),
    .eq (.record (.cons "b" (.base "Int") .nil) [1]) (rows [4]),
    .lacks 4 "a"]⟩

#guard (componentSets twoParts).length == 2
#guard (relevantPairs twoParts).eraseDups.length == 2
#guard (pairs twoParts).eraseDups.length == 4

end Examples

end Composition.Syntax
