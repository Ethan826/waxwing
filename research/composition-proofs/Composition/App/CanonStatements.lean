/-
Scope A Stage 0c (dossier §18.196): canonicalization. Statements only,
no proofs; the interface owner's.

The compiler compares terms in canonical form: `under` and `canonical`
(src/Features/Check/Strategy/Candidate.purs:45-58, 93-106) sort record
fields by label and tails at every depth, applications included, and
`equal` (Atoms.purs:76-79) asks `defined` of that form and then
syntactic equality. `CheckA` (Statements.lean) compared raw
`substTA`, so it covered only part of what the compiler accepts (design
§16.2). Here the orders are abstract: any functions returning a
permutation of their input. The compiler's `sortWith fst` and `sort`
are such functions (stable sorts permute).
-/
import Composition.App.Statements

namespace Composition.App

open Classical Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

def FieldsA.toList : FieldsA Label B → List (Label × TExprA Label B)
  | .nil => []
  | .cons l t rest => (l, t) :: rest.toList

def FieldsA.ofList : List (Label × TExprA Label B) → FieldsA Label B
  | [] => .nil
  | (l, t) :: rest => .cons l t (FieldsA.ofList rest)

/-- The orders canonicalization applies: each returns a permutation of
its input. -/
structure Orders (Label B : Type) where
  fields : List (Label × TExprA Label B) → List (Label × TExprA Label B)
  tails : List Nat → List Nat
  fields_perm : ∀ l, (fields l).Perm l
  tails_perm : ∀ l, (tails l).Perm l

mutual
  /-- `canonical` over `TExprA`: children first, then each record's
  fields and tails reordered. Repeated labels are kept, as in the
  compiler, so definedness still sees them. -/
  def canonA (o : Orders Label B) : TExprA Label B → TExprA Label B
    | .base b => .base b
    | .arrow t u => .arrow (canonA o t) (canonA o u)
    | .tvar n => .tvar n
    | .record fs tails =>
      .record (FieldsA.ofList (o.fields (canonFA o fs).toList))
        (o.tails tails)
    | .app t as => .app t (canonArgsA o as)

  def canonFA (o : Orders Label B) : FieldsA Label B → FieldsA Label B
    | .nil => .nil
    | .cons l t rest => .cons l (canonA o t) (canonFA o rest)

  def canonArgsA (o : Orders Label B) : ArgsA Label B → ArgsA Label B
    | .nil => .nil
    | .cons t rest => .cons (canonA o t) (canonArgsA o rest)
end

/-- S9. Canonicalization preserves evaluation, definedness included:
reordering a record's fields or tails changes neither whether it
composes nor what it denotes. -/
def S9 : Prop :=
  ∀ (o : Orders Label B) (θ : AssignA Label B) (t : TExprA Label B),
    evalA θ (canonA o t) = evalA θ t

/-- The check over `TExprA` as the compiler performs it: both sides
substituted and canonicalized, compared syntactically, and the
canonical form asked `defined`. The row tests are `CheckA`'s. -/
def CheckAc (M : Check0 Label B) (o : Orders Label B)
    (P : SigProblemA Label B) (σ : SubstA Label B) : Prop :=
  ∀ a ∈ P.B, match a with
    | .eq t u => canonA o (substTA σ t) = canonA o (substTA σ u) ∧
        M.DefOK (eraseP P) (eraseT (canonA o (substTA σ t)))
    | .lacks r l => M.RowOK (eraseP P) (eraseS σ) (.lacks r l)
    | .disjoint r s => M.RowOK (eraseP P) (eraseS σ) (.disjoint r s)
    | .ff => False

/-- S5′c. S5′ for the canonicalizing check. Relative to `PG0Clauses`,
which are assumed: they are proved for no compiler code and are not
implied by P-G0 as currently stated (design §16.2, §18.196). D6.5's
"no `app` in `D`" is kept as a hypothesis although S5′'s proof did not
need it (§18.194). -/
def S5'c : Prop :=
  ∀ M : Check0 Label B, PG0Clauses M →
    ∀ (o : Orders Label B) (P : SigProblemA Label B) (σ : SubstA Label B),
      (∀ a ∈ P.D, AppFreeAtom a) → CheckAc M o P σ →
      ∀ θ : AssignA Label B, SatA θ P.D → SatA θ (eqsA σ) → SatA θ P.B

end Composition.App
