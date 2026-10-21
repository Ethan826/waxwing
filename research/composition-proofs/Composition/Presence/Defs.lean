/-
The presence fragment (dossier §18.6, §18.11): definitions and the exact
statements of D1's obligations O1-O3 and of D2 for presence. STATEMENTS
ONLY: each claim is a `Prop` definition, proved elsewhere (Presence/O1,
O2, O3, D2). This file is the shared interface; changing it needs the
author's review.

Model. Labels are any type (no decidable equality is assumed; the proofs
are classical); label sets are predicates. Rigid and flexible set
variables are numbered and assigned by functions `Nat → LSet Label`.
Rows are finite: every quantified set is finite (`FinSet`). Written
labels are the label constants and `lacks` labels of the problem. Atoms
all say "something is empty".
-/
namespace Composition.Presence

variable {Label : Type}

abbrev LSet (Label : Type) := Label → Prop

/-- A finite set of labels. -/
def FinSet (S : LSet Label) : Prop := ∃ ls : List Label, ∀ l, S l → l ∈ ls

/-- Set expressions: rigid and flexible set variables, a written label,
union (the presence of a record expression's parts). -/
inductive SExpr (Label : Type) where
  | rigid : Nat → SExpr Label
  | flex : Nat → SExpr Label
  | lab : Label → SExpr Label
  | union : SExpr Label → SExpr Label → SExpr Label

/-- Atoms: `e₁ ∩ e₂ = ∅` (`disjoint`, composition definedness), `l ∉ e`
(`lacks`), `e₁ = e₂` (a record equation's presence). -/
inductive PAtom (Label : Type) where
  | disj : SExpr Label → SExpr Label → PAtom Label
  | lacks : Label → SExpr Label → PAtom Label
  | eq : SExpr Label → SExpr Label → PAtom Label

def eval (ρ σ : Nat → LSet Label) : SExpr Label → LSet Label
  | .rigid i => ρ i
  | .flex j => σ j
  | .lab l => fun k => k = l
  | .union a b => fun k => eval ρ σ a k ∨ eval ρ σ b k

/-- An atom holds at the labels in `K`. -/
def HoldsOn (K : LSet Label) (ρ σ : Nat → LSet Label) : PAtom Label → Prop
  | .disj a b => ∀ k, K k → ¬ (eval ρ σ a k ∧ eval ρ σ b k)
  | .lacks l a => K l → ¬ eval ρ σ a l
  | .eq a b => ∀ k, K k → (eval ρ σ a k ↔ eval ρ σ b k)

def SatOn (K : LSet Label) (ρ σ : Nat → LSet Label)
    (C : List (PAtom Label)) : Prop :=
  ∀ a ∈ C, HoldsOn K ρ σ a

/-- Every label. -/
def univ : LSet Label := fun _ => True

/-- No flexible set holds anything (for evaluating `D`). -/
def noFlex : Nat → LSet Label := fun _ _ => False

/-- A presence problem: clauses `D` over rigid sets, body `B`. -/
structure PProblem (Label : Type) where
  D : List (PAtom Label)
  B : List (PAtom Label)

def SExpr.flexFree : SExpr Label → Prop
  | .flex _ => False
  | .union a b => a.flexFree ∧ b.flexFree
  | _ => True

def PAtom.flexFree : PAtom Label → Prop
  | .disj a b => a.flexFree ∧ b.flexFree
  | .lacks _ a => a.flexFree
  | .eq a b => a.flexFree ∧ b.flexFree

/-- `D` mentions rigid sets only. Not enforced by the semantics: `D` is
always evaluated with no flexible set (`noFlex`), so a flexible variable
in `D` reads as empty; O1 and O3 hold without this hypothesis. -/
def Scoped (P : PProblem Label) : Prop := ∀ a ∈ P.D, a.flexFree

def SExpr.labels : SExpr Label → List Label
  | .lab l => [l]
  | .union a b => a.labels ++ b.labels
  | _ => []

def PAtom.labels : PAtom Label → List Label
  | .disj a b => a.labels ++ b.labels
  | .lacks l a => l :: a.labels
  | .eq a b => a.labels ++ b.labels

/-- The written labels of a problem. -/
def written (P : PProblem Label) : List Label :=
  (P.D ++ P.B).flatMap PAtom.labels

/-- Validity over finite sets: every finite rigid assignment satisfying
`D` has a finite flexible assignment satisfying `B`. -/
def Valid (P : PProblem Label) : Prop :=
  ∀ ρ : Nat → LSet Label, (∀ i, FinSet (ρ i)) → SatOn univ ρ noFlex P.D →
    ∃ σ : Nat → LSet Label, (∀ j, FinSet (σ j)) ∧ SatOn univ ρ σ P.B

/-- Infinitely many labels: no finite list holds them all. -/
def InfiniteLabels (Label : Type) : Prop := ∀ ls : List Label, ∃ k, k ∉ ls

/-! ### O2: the written/rest split is exact. -/

/-- O2. Every atom holds iff it holds on the written labels and on the
rest; each part depends only on the assignments restricted to it; and a
written label is empty on the rest. -/
def O2 : Prop :=
  ∀ (P : PProblem Label) (a : PAtom Label), a ∈ P.D ++ P.B →
    (∀ ρ σ, HoldsOn univ ρ σ a ↔
      HoldsOn (· ∈ written P) ρ σ a ∧ HoldsOn (· ∉ written P) ρ σ a) ∧
    (∀ (K : LSet Label) ρ ρ' σ σ',
      (∀ i k, K k → (ρ i k ↔ ρ' i k)) → (∀ j k, K k → (σ j k ↔ σ' j k)) →
        (HoldsOn K ρ σ a ↔ HoldsOn K ρ' σ' a)) ∧
    (∀ ρ σ l k, l ∈ written P → k ∉ written P → ¬ eval ρ σ (.lab l) k)

/-! ### O3: written choices depend on the pattern only. -/

/-- The written part: every pattern `π` (rigid sets within the written
labels) satisfying `D` there has a written choice `Q` satisfying `B`
there. -/
def WrittenValid (P : PProblem Label) : Prop :=
  ∀ π : Nat → LSet Label, (∀ i k, π i k → k ∈ written P) →
    SatOn (· ∈ written P) π noFlex P.D →
      ∃ Q : Nat → LSet Label, (∀ j k, Q j k → k ∈ written P) ∧
        SatOn (· ∈ written P) π Q P.B

/-- The rest part: every finite rest assignment (outside the written
labels) satisfying `D` there has a finite rest witness satisfying `B`
there. -/
def RestValid (P : PProblem Label) : Prop :=
  ∀ R : Nat → LSet Label, (∀ i, FinSet (R i)) →
    (∀ i k, R i k → k ∉ written P) → SatOn (· ∉ written P) R noFlex P.D →
      ∃ S : Nat → LSet Label, (∀ j, FinSet (S j)) ∧
        (∀ j k, S j k → k ∉ written P) ∧ SatOn (· ∉ written P) R S P.B

/-- O3. A problem is valid iff `D` is impossible on the written labels,
or both parts are valid. (The first disjunct is needed: an impossible
written part makes the problem valid vacuously while the rest part may
fail.) -/
def O3 : Prop :=
  ∀ P : PProblem Label, Scoped P →
    (Valid P ↔ (¬ ∃ π : Nat → LSet Label, (∀ i k, π i k → k ∈ written P) ∧
        SatOn (· ∈ written P) π noFlex P.D) ∨
      (WrittenValid P ∧ RestValid P))

/-! ### O1: finite rows; the rest part is decided per region. -/

def evalB (b s : Nat → Bool) : SExpr Label → Bool
  | .rigid i => b i
  | .flex j => s j
  | .lab _ => false
  | .union x y => evalB b s x || evalB b s y

/-- An atom at one unwritten label whose membership in the rigid sets is
`b` and in the flexible sets `s` (`lacks` concerns written labels only). -/
def HoldsB (b s : Nat → Bool) : PAtom Label → Prop
  | .disj x y => ¬ (evalB b s x = true ∧ evalB b s y = true)
  | .lacks _ _ => True
  | .eq x y => evalB b s x = evalB b s y

/-- The per-region check: for every membership vector `D` allows, some
flexible vector satisfies `B`. -/
def BitValid (P : PProblem Label) : Prop :=
  ∀ b : Nat → Bool, (∀ a ∈ P.D, HoldsB b (fun _ => false) a) →
    ∃ s : Nat → Bool, ∀ a ∈ P.B, HoldsB b s a

/-- O1. With infinitely many labels, the rest part over finite sets is
valid iff the per-region check holds. -/
def O1 : Prop :=
  InfiniteLabels Label → ∀ P : PProblem Label, Scoped P →
    (RestValid P ↔ BitValid P)

/-! ### D2 for presence: uniform term witnesses. -/

/-- Set terms over the rigid rests: no complement. -/
inductive STerm where
  | empty : STerm
  | rigid : Nat → STerm
  | union : STerm → STerm → STerm
  | inter : STerm → STerm → STerm
  | diff : STerm → STerm → STerm

def STerm.eval (R : Nat → LSet Label) : STerm → LSet Label
  | .empty => fun _ => False
  | .rigid i => R i
  | .union x y => fun k => x.eval R k ∨ y.eval R k
  | .inter x y => fun k => x.eval R k ∧ y.eval R k
  | .diff x y => fun k => x.eval R k ∧ ¬ y.eval R k

/-- D2 (presence). For a valid problem and each pattern `π` satisfying
`D` on the written labels, one written choice `Q` and one tuple of set
terms `t` work for every finite rest assignment satisfying `D`: uniform
per pattern, witnesses inside the rigid rests. -/
def D2 : Prop :=
  InfiniteLabels Label → ∀ P : PProblem Label, Scoped P → Valid P →
    ∀ π : Nat → LSet Label, (∀ i k, π i k → k ∈ written P) →
      SatOn (· ∈ written P) π noFlex P.D →
        ∃ (Q : Nat → LSet Label) (t : Nat → STerm),
          (∀ j k, Q j k → k ∈ written P) ∧
          ∀ R : Nat → LSet Label, (∀ i, FinSet (R i)) →
            (∀ i k, R i k → k ∉ written P) →
            SatOn (· ∉ written P) R noFlex P.D →
              (∀ j k, (t j).eval R k → ∃ i, R i k) ∧
              SatOn univ (fun i k => π i k ∨ R i k)
                (fun j k => Q j k ∨ (t j).eval R k) P.B

end Composition.Presence
