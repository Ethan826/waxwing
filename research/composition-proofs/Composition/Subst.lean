/-
Substitution and binding equations (second milestone, step 2:
definitions). A substitution is a finite list of bindings: type
variables to type expressions, row variables to rows written as fields
plus tails. It is applied in parallel, once: a binding's right-hand side
is not itself substituted. `eqs σ` are its binding equations, the
constraints `x = σ(x)` that a solver must keep beside its residual
(dossier §2.1).
-/
import Composition.Syntax

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

def Fields.append : Fields Label B → Fields Label B → Fields Label B
  | .nil, g => g
  | .cons l t rest, g => .cons l t (rest.append g)

def Fields.labels : Fields Label B → List Label
  | .nil => []
  | .cons l _ rest => l :: rest.labels

/-- The one-field rows of written fields, if every field type is
defined. -/
noncomputable def fieldRows (θ : Assign Label B) :
    Fields Label B → Option (List (Row Label (G Label B)))
  | .nil => some []
  | .cons l t rest =>
    (evalT θ t).bind fun g => (fieldRows θ rest).map (single l g :: ·)

/-- A finite substitution. -/
structure Subst (Label B : Type) where
  ty : List (Nat × TExpr Label B)
  row : List (Nat × (Fields Label B × List Nat))

/-- What a row variable stands for: its binding, or itself. -/
def rowOf (σ : Subst Label B) (r : Nat) : Fields Label B × List Nat :=
  (σ.row.lookup r).getD (.nil, [r])

/-- Replace each tail by what it stands for: fields, then tails. -/
def expandTails (σ : Subst Label B) :
    List Nat → Fields Label B × List Nat
  | [] => (.nil, [])
  | r :: rs =>
    ((rowOf σ r).1.append (expandTails σ rs).1,
      (rowOf σ r).2 ++ (expandTails σ rs).2)

mutual
  def substT (σ : Subst Label B) : TExpr Label B → TExpr Label B
    | .base b => .base b
    | .arrow t u => .arrow (substT σ t) (substT σ u)
    | .tvar n => (σ.ty.lookup n).getD (.tvar n)
    | .record fs tails =>
      .record ((substF σ fs).append (expandTails σ tails).1)
        (expandTails σ tails).2

  def substF (σ : Subst Label B) : Fields Label B → Fields Label B
    | .nil => .nil
    | .cons l t rest => .cons l (substT σ t) (substF σ rest)
end

/-- The binding equations of `σ`. -/
def eqs (σ : Subst Label B) : Problem Label B :=
  σ.ty.map (fun p => .eq (.tvar p.1) p.2) ++
    σ.row.map (fun p => .eq (.record .nil [p.1]) (.record p.2.1 p.2.2))

/-- An atom with `σ` applied: `lacks` and `disjoint` on a bound row
variable become the corresponding facts about its fields and tails. -/
def substAtom (σ : Subst Label B) : Atom Label B → Problem Label B
  | .eq t u => [.eq (substT σ t) (substT σ u)]
  | .lacks r l =>
    (if l ∈ (rowOf σ r).1.labels then [.ff] else []) ++
      (rowOf σ r).2.map (fun t => .lacks t l)
  | .disjoint r s =>
    let f1 := (rowOf σ r).1.labels
    let f2 := (rowOf σ s).1.labels
    let t1 := (rowOf σ r).2
    let t2 := (rowOf σ s).2
    (if f1.any (· ∈ f2) then [.ff] else []) ++
      f1.flatMap (fun l => t2.map (fun t => .lacks t l)) ++
      f2.flatMap (fun l => t1.map (fun t => .lacks t l)) ++
      t1.flatMap (fun a => t2.map (fun b => .disjoint a b))
  | .ff => [.ff]

def substProblem (σ : Subst Label B) (C : Problem Label B) :
    Problem Label B :=
  C.flatMap (substAtom σ)

end Composition.Syntax
