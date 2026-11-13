/-
Scope A's statements (docs/plans/2026-11-13-scope-a-free-constructor-
design.md §6; approved for investigation, dossier §18.192), as named
propositions with no proofs: the interface the proofs are written
against. Changing any of them is the interface owner's decision and goes
back for approval.

S1 is Lean's generated injectivity and `noConfusion` for `GA` (cited,
not restated). S5 is P-G0 over `GA` and is not stated here: S5′ states
exactly what it assumes about P-G0 instead.
-/
import Composition.App.Defs
import Composition.Subst
import Composition.Typed.Bridge.Valid

namespace Composition.App

open Classical Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ## S2: the embedding of the existing model -/

mutual
  def embedG : G Label B → GA Label B
    | .base b => .base b
    | .arrow a c => .arrow (embedG a) (embedG c)
    | .record f => .record fun k => embedGO (f k)

  def embedGO : Option (G Label B) → Option (GA Label B)
    | none => none
    | some g => some (embedG g)
end

mutual
  def embedT : TExpr Label B → TExprA Label B
    | .base b => .base b
    | .arrow t u => .arrow (embedT t) (embedT u)
    | .tvar n => .tvar n
    | .record fs tails => .record (embedF fs) tails

  def embedF : Fields Label B → FieldsA Label B
    | .nil => .nil
    | .cons l t rest => .cons l (embedT t) (embedF rest)
end

def embedAssign (θ : Assign Label B) : AssignA Label B :=
  ⟨fun n => embedG (θ.ty n), fun r k => (θ.row r k).map embedG⟩

def embedAtom : Atom Label B → AtomA Label B
  | .eq t u => .eq (embedT t) (embedT u)
  | .lacks r l => .lacks r l
  | .disjoint r s => .disjoint r s
  | .ff => .ff

def embedP (P : SigProblem Label B) : SigProblemA Label B :=
  ⟨P.rigidTy, P.rigidRow, P.D.map embedAtom, P.B.map embedAtom⟩

/-- S2. Evaluation of an embedded expression is the embedding of
evaluation. -/
def S2 : Prop :=
  ∀ (θ : Assign Label B) (t : TExpr Label B),
    evalA (embedAssign θ) (embedT t) = (evalT θ t).map embedG

/-! ## S3: substitution, in `Composition.Subst`'s binding-equation form -/

/-- A finite substitution over `TExprA`, as `Subst`. -/
structure SubstA (Label B : Type) where
  ty : List (Nat × TExprA Label B)
  row : List (Nat × (FieldsA Label B × List Nat))

def FieldsA.append : FieldsA Label B → FieldsA Label B → FieldsA Label B
  | .nil, g => g
  | .cons l t rest, g => .cons l t (rest.append g)

def rowOfA (σ : SubstA Label B) (r : Nat) : FieldsA Label B × List Nat :=
  (σ.row.lookup r).getD (.nil, [r])

def expandTailsA (σ : SubstA Label B) :
    List Nat → FieldsA Label B × List Nat
  | [] => (.nil, [])
  | r :: rs =>
    ((rowOfA σ r).1.append (expandTailsA σ rs).1,
      (rowOfA σ r).2 ++ (expandTailsA σ rs).2)

mutual
  def substTA (σ : SubstA Label B) : TExprA Label B → TExprA Label B
    | .base b => .base b
    | .arrow t u => .arrow (substTA σ t) (substTA σ u)
    | .tvar n => (σ.ty.lookup n).getD (.tvar n)
    | .record fs tails =>
      .record ((substFA σ fs).append (expandTailsA σ tails).1)
        (expandTailsA σ tails).2
    | .app t as => .app t (substArgsA σ as)

  def substFA (σ : SubstA Label B) : FieldsA Label B → FieldsA Label B
    | .nil => .nil
    | .cons l t rest => .cons l (substTA σ t) (substFA σ rest)

  def substArgsA (σ : SubstA Label B) : ArgsA Label B → ArgsA Label B
    | .nil => .nil
    | .cons t rest => .cons (substTA σ t) (substArgsA σ rest)
end

/-- The binding equations of `σ`, as `eqs`. -/
def eqsA (σ : SubstA Label B) : ProblemA Label B :=
  σ.ty.map (fun p => .eq (.tvar p.1) p.2) ++
    σ.row.map (fun p => .eq (.record .nil [p.1]) (.record p.2.1 p.2.2))

/-- S3. Under its binding equations, substitution preserves the value of
every expression, applications included (`subst_evalT` extended). -/
def S3 : Prop :=
  ∀ (θ : AssignA Label B) (σ : SubstA Label B), SatA θ (eqsA σ) →
    ∀ t : TExprA Label B, evalA θ (substTA σ t) = evalA θ t

/-! ## S4: conservativity over application-free problems -/

/-- S4. On a scoped signature problem of the existing model (no `app`
node anywhere, and no requirement atoms, which `SigProblem` has none
of), validity over `GA` is `ValidOpen`. -/
def S4 : Prop :=
  ∀ P : SigProblem Label B, Scoped P →
    (ValidOpenA (embedP P) ↔ Composition.Typed.ValidOpen P)

/-! ## The constructor table and the holder set (explicit assumptions)

The compiler's tables enter as a `Table`, the holder set as `Holder`,
and the bases as a classification. These are assumptions about the
compiler, not facts the proofs establish: generation must record the
holder set exactly (ruling K-a; test/r0-holders.test.mjs), and a
recorded ground type names only Waxwing's bases (T-R0b §2.2). -/

mutual
  /-- A declared field type: a base, a type parameter, an arrow, a
  closed record, an applied declared type, or a handler type. Effect
  rows are not represented: an in-scope head declares none (D6.2). -/
  inductive FT (Label B : Type) where
    | base : B → FT Label B
    | param : Nat → FT Label B
    | arrow : FT Label B → FT Label B → FT Label B
    | record : FTFields Label B → FT Label B
    | data : Nat → FTArgs Label B → FT Label B
    | handler : FT Label B

  /-- A closed record's fields, in order. -/
  inductive FTFields (Label B : Type) where
    | nil : FTFields Label B
    | cons : Label → FT Label B → FTFields Label B → FTFields Label B

  /-- The arguments of an applied declared type, in order. -/
  inductive FTArgs (Label B : Type) where
    | nil : FTArgs Label B
    | cons : FT Label B → FTArgs Label B → FTArgs Label B
end

/-- A declared type: its number of type parameters and its constructors,
each a list of field types. -/
structure DeclT (Label B : Type) where
  params : Nat
  ctors : List (List (FT Label B))

abbrev Table (Label B : Type) := Nat → Option (DeclT Label B)

/-- How a base of a recorded ground type is classified: Waxwing's
printable bases (`Int`, `Bool`, `Text`, `Unit`), a declared type of no
parameters, or a base outside Waxwing's (only a value of an injective
extension). -/
inductive BaseKind where
  | prim : BaseKind
  | data : Nat → BaseKind
  | fresh : BaseKind

mutual
  /-- D7. `t`'s constructors hold a function, directly or through
  another declared type, a record field or a type argument. -/
  inductive Holder (T : Table Label B) : Nat → Prop where
    | mk {t : Nat} {d : DeclT Label B} {c : List (FT Label B)}
        {f : FT Label B} :
        T t = some d → c ∈ d.ctors → f ∈ c → HoldsFn T f → Holder T t

  /-- A field type that holds a function. -/
  inductive HoldsFn (T : Table Label B) : FT Label B → Prop where
    | arrow {a c : FT Label B} : HoldsFn T (.arrow a c)
    | handler : HoldsFn T .handler
    | head {t : Nat} {as : FTArgs Label B} :
        Holder T t → HoldsFn T (.data t as)
    | arg {t : Nat} {as : FTArgs Label B} :
        HoldsFnA T as → HoldsFn T (.data t as)
    | record {fs : FTFields Label B} :
        HoldsFnF T fs → HoldsFn T (.record fs)

  inductive HoldsFnF (T : Table Label B) : FTFields Label B → Prop where
    | here {l : Label} {f : FT Label B} {rest : FTFields Label B} :
        HoldsFn T f → HoldsFnF T (.cons l f rest)
    | there {l : Label} {f : FT Label B} {rest : FTFields Label B} :
        HoldsFnF T rest → HoldsFnF T (.cons l f rest)

  inductive HoldsFnA (T : Table Label B) : FTArgs Label B → Prop where
    | here {f : FT Label B} {rest : FTArgs Label B} :
        HoldsFn T f → HoldsFnA T (.cons f rest)
    | there {f : FT Label B} {rest : FTArgs Label B} :
        HoldsFnA T rest → HoldsFnA T (.cons f rest)
end

def FTArgs.length : FTArgs Label B → Nat
  | .nil => 0
  | .cons _ rest => rest.length + 1

mutual
  /-- Every declared type a field type mentions is declared with that
  many arguments, and every parameter index is below `n`. -/
  def FTWF (T : Table Label B) (n : Nat) : FT Label B → Prop
    | .base _ => True
    | .param i => i < n
    | .arrow a c => FTWF T n a ∧ FTWF T n c
    | .record fs => FTWFF T n fs
    | .data u as => (∃ e, T u = some e ∧ e.params = as.length) ∧
        FTWFA T n as
    | .handler => True

  def FTWFF (T : Table Label B) (n : Nat) : FTFields Label B → Prop
    | .nil => True
    | .cons _ f rest => FTWF T n f ∧ FTWFF T n rest

  def FTWFA (T : Table Label B) (n : Nat) : FTArgs Label B → Prop
    | .nil => True
    | .cons f rest => FTWF T n f ∧ FTWFA T n rest
end

/-- The table is closed: every declared type a constructor field
mentions is declared, with that many arguments, and every parameter
index is in range. -/
def TableWF (T : Table Label B) : Prop :=
  ∀ t d, T t = some d → ∀ c ∈ d.ctors, ∀ f ∈ c, FTWF T d.params f

mutual
  /- Every base a field type names is one of Waxwing's printable bases:
  a declared type of no parameters is written `.data u .nil`, never as a
  base, and no declaration names a base outside Waxwing's. -/
  def FTBases (kind : B → BaseKind) : FT Label B → Prop
    | .base b => kind b = .prim
    | .param _ => True
    | .arrow a c => FTBases kind a ∧ FTBases kind c
    | .record fs => FTBasesF kind fs
    | .data _ as => FTBasesA kind as
    | .handler => True

  def FTBasesF (kind : B → BaseKind) : FTFields Label B → Prop
    | .nil => True
    | .cons _ f rest => FTBases kind f ∧ FTBasesF kind rest

  def FTBasesA (kind : B → BaseKind) : FTArgs Label B → Prop
    | .nil => True
    | .cons f rest => FTBases kind f ∧ FTBasesA kind rest
end

/-- The table's field types name only Waxwing's bases. -/
def TableBases (T : Table Label B) (kind : B → BaseKind) : Prop :=
  ∀ t d, T t = some d → ∀ c ∈ d.ctors, ∀ f ∈ c, FTBases kind f

/-! ## S6: requirement agreement -/

variable (T : Table Label B) (kind : B → BaseKind)

/-- GroundRule's `Holds` on a ground value (GroundRule.purs:46-76): a
printable base; a declared type of no parameters outside the holder set;
a record whose fields all hold; an application of a declared head
outside the holder set whose arguments all hold. Arrows never hold.
(The compiler's `holders.declared` is `T`'s domain and
`holders.holding` is `Holder T`.) -/
inductive JHolds : GA Label B → Prop where
  | prim {b : B} : kind b = .prim → JHolds (.base b)
  | data {b : B} {t : Nat} : kind b = .data t → (T t).isSome →
      ¬ Holder T t → JHolds (.base b)
  | record {f : Label → Option (GA Label B)} :
      (∀ k g, f k = some g → JHolds g) → JHolds (.record f)
  | app {t : Nat} {vs : List (GA Label B)} : (T t).isSome →
      ¬ Holder T t → (∀ v ∈ vs, JHolds v) → JHolds (.app t vs)

/-- G-ValidR §3.1 H-a: false at a holder head, whatever the arguments;
otherwise every argument must hold. -/
inductive ReqHa : GA Label B → Prop where
  | prim {b : B} : kind b = .prim → ReqHa (.base b)
  | data {b : B} {t : Nat} : kind b = .data t → ¬ Holder T t →
      ReqHa (.base b)
  | record {f : Label → Option (GA Label B)} :
      (∀ k g, f k = some g → ReqHa g) → ReqHa (.record f)
  | app {t : Nat} {vs : List (GA Label B)} : ¬ Holder T t →
      (∀ v ∈ vs, ReqHa v) → ReqHa (.app t vs)

/-- H-c: through the arguments only, the holder set ignored. -/
inductive ReqHc : GA Label B → Prop where
  | prim {b : B} : kind b = .prim → ReqHc (.base b)
  | data {b : B} {t : Nat} : kind b = .data t → ReqHc (.base b)
  | record {f : Label → Option (GA Label B)} :
      (∀ k g, f k = some g → ReqHc g) → ReqHc (.record f)
  | app {t : Nat} {vs : List (GA Label B)} :
      (∀ v ∈ vs, ReqHc v) → ReqHc (.app t vs)

mutual
  /-- A declared field type at given arguments, as a ground value.
  `dataB t` is the base standing for a declared type `t` of no
  parameters (`kind (dataB t) = .data t`). A handler field becomes an
  arrow, which no requirement accepts. -/
  noncomputable def instFT (dataB : Nat → B) (vs : List (GA Label B)) :
      FT Label B → GA Label B
    | .base b => .base b
    | .param i => (vs[i]?).getD (.record fun _ => none)
    | .arrow a c => .arrow (instFT dataB vs a) (instFT dataB vs c)
    | .record fs => .record (instFields dataB vs fs)
    | .data u .nil => .base (dataB u)
    | .data u (.cons a as) =>
        .app u (instFT dataB vs a :: instArgs dataB vs as)
    | .handler => .arrow (.record fun _ => none) (.record fun _ => none)

  noncomputable def instFields (dataB : Nat → B) (vs : List (GA Label B)) :
      FTFields Label B → Label → Option (GA Label B)
    | .nil => fun _ => none
    | .cons l f rest => fun k =>
        if k = l then some (instFT dataB vs f) else instFields dataB vs rest k

  noncomputable def instArgs (dataB : Nat → B) (vs : List (GA Label B)) :
      FTArgs Label B → List (GA Label B)
    | .nil => []
    | .cons f rest => instFT dataB vs f :: instArgs dataB vs rest
end

/-- The values a value reaches through record fields and through the
constructor fields of its applied heads, instantiated at the
arguments. -/
inductive Reach (dataB : Nat → B) : GA Label B → GA Label B → Prop where
  | refl {v : GA Label B} : Reach dataB v v
  | field {f : Label → Option (GA Label B)} {k : Label}
      {g w : GA Label B} :
      f k = some g → Reach dataB g w → Reach dataB (.record f) w
  | ctor {t : Nat} {vs : List (GA Label B)} {d : DeclT Label B}
      {c : List (FT Label B)} {fl : FT Label B} {w : GA Label B} :
      T t = some d → c ∈ d.ctors → fl ∈ c →
      Reach dataB (instFT dataB vs fl) w → Reach dataB (.app t vs) w
  | base {b : B} {t : Nat} {d : DeclT Label B} {c : List (FT Label B)}
      {fl : FT Label B} {w : GA Label B} :
      kind b = .data t → T t = some d → c ∈ d.ctors → fl ∈ c →
      Reach dataB (instFT dataB [] fl) w → Reach dataB (.base b) w

/-- H-b: by the constructor fields instantiated at the arguments,
phantom parameters ignored: nothing reachable is an arrow or a base
outside Waxwing's. -/
def ReqHb (dataB : Nat → B) (v : GA Label B) : Prop :=
  ∀ w, Reach T kind dataB v w →
    (∀ a c, w ≠ .arrow a c) ∧ ∀ b, w = .base b → kind b ≠ .fresh

/-- S6. Where GroundRule says `Holds`, each of G-ValidR §3.1's three
readings agrees, for every declared table that is closed and names only
Waxwing's bases, and every classification of the bases. -/
def S6 : Prop :=
  ∀ (T : Table Label B) (kind : B → BaseKind) (dataB : Nat → B),
    TableWF T → TableBases T kind → (∀ t, kind (dataB t) = .data t) →
    ∀ v : GA Label B, JHolds T kind v →
      ReqHa T kind v ∧ ReqHb T kind dataB v ∧ ReqHc kind v

/-! ## S8: no hidden effects inside an in-scope application -/

/-- S8 as first written, without `TableBases`. **Refuted**
(`not_s8NoBases`, Proofs/Req.lean): a field written as a base whose
kind is a declared type lets `Reach` enter a holder that `Holder` never
inspects. Kept as the reason S8 carries `TableBases`. -/
def S8NoBases : Prop :=
  ∀ (T : Table Label B) (kind : B → BaseKind) (dataB : Nat → B),
    TableWF T → (∀ t, kind (dataB t) = .data t) →
    ∀ (t : Nat) (vs : List (GA Label B)), (T t).isSome → ¬ Holder T t →
      (∀ v ∈ vs, ∀ w, Reach T kind dataB v w → ∀ a c, w ≠ .arrow a c) →
      ∀ w, Reach T kind dataB (.app t vs) w → ∀ a c, w ≠ .arrow a c

/-- S8 (its Lean part). A declared head outside the holder set, in a
closed table naming only Waxwing's bases, applied to arguments that
reach no arrow, reaches no arrow through its constructor fields: no
function value, and so no erased effect row, lies inside an in-scope
application. -/
def S8 : Prop :=
  ∀ (T : Table Label B) (kind : B → BaseKind) (dataB : Nat → B),
    TableWF T → TableBases T kind → (∀ t, kind (dataB t) = .data t) →
    ∀ (t : Nat) (vs : List (GA Label B)), (T t).isSome → ¬ Holder T t →
      (∀ v ∈ vs, ∀ w, Reach T kind dataB v w → ∀ a c, w ≠ .arrow a c) →
      ∀ w, Reach T kind dataB (.app t vs) w → ∀ a c, w ≠ .arrow a c

/-! ## S5′: what the `app` case assumes about P-G0, exactly -/

/- Erasure to the existing model: an application becomes an arrow
chain of its erased arguments ending in the empty record. The chain is
defined exactly when every argument is, which is what the compiler's
`defined` says of `App` (Strategy/Atoms.purs:101). -/
mutual
  def eraseG : GA Label B → G Label B
    | .base b => .base b
    | .arrow a c => .arrow (eraseG a) (eraseG c)
    | .record f => .record fun k => eraseGO (f k)
    | .app _ vs => eraseList vs

  def eraseGO : Option (GA Label B) → Option (G Label B)
    | none => none
    | some g => some (eraseG g)

  /-- An application's erased arguments as an arrow chain ending in the
  empty record. -/
  def eraseList : List (GA Label B) → G Label B
    | [] => .record fun _ => none
    | v :: vs => .arrow (eraseG v) (eraseList vs)
end

mutual
  def eraseT : TExprA Label B → TExpr Label B
    | .base b => .base b
    | .arrow t u => .arrow (eraseT t) (eraseT u)
    | .tvar n => .tvar n
    | .record fs tails => .record (eraseF fs) tails
    | .app _ as => eraseArgs as

  def eraseF : FieldsA Label B → Fields Label B
    | .nil => .nil
    | .cons l t rest => .cons l (eraseT t) (eraseF rest)

  def eraseArgs : ArgsA Label B → TExpr Label B
    | .nil => .record .nil []
    | .cons t rest => .arrow (eraseT t) (eraseArgs rest)
end

def eraseAtom : AtomA Label B → Atom Label B
  | .eq t u => .eq (eraseT t) (eraseT u)
  | .lacks r l => .lacks r l
  | .disjoint r s => .disjoint r s
  | .ff => .ff

def eraseP (P : SigProblemA Label B) : SigProblem Label B :=
  ⟨P.rigidTy, P.rigidRow, P.D.map eraseAtom, P.B.map eraseAtom⟩

def eraseS (σ : SubstA Label B) : Subst Label B :=
  ⟨σ.ty.map fun p => (p.1, eraseT p.2),
   σ.row.map fun p => (p.1, (eraseF p.2.1, p.2.2))⟩

/-- G0's check on application-free terms, left abstract: `DefOK` is its
`defined` and `RowOK` its `lacking`/`apart` tests (Strategy/Atoms.purs).
Nothing is assumed about them beyond P-G0's clauses. -/
structure Check0 (Label B : Type) where
  DefOK : SigProblem Label B → TExpr Label B → Prop
  RowOK : SigProblem Label B → Subst Label B → Atom Label B → Prop

/-- P-G0's two clauses on the existing model, assumed and not proved
(R0 plan §4, P-G0, `Pending genericSubstitutionSound`): under an
assignment satisfying a problem's `D` and a candidate's binding
equations, a term the check calls defined is defined, and a `lacks` or
`disjoint` atom the check accepts holds. The existence of such an
assignment is also P-G0's and is not assumed or claimed here. -/
def PG0Clauses (M : Check0 Label B) : Prop :=
  ∀ (P : SigProblem Label B) (σ : Subst Label B) (θ : Assign Label B),
    Sat θ P.D → Sat θ (eqs σ) →
      (∀ u, M.DefOK P u → (evalT θ u).isSome) ∧
      (∀ a, (∃ r l, a = .lacks r l) ∨ (∃ r s, a = .disjoint r s) →
        M.RowOK P σ a → Holds θ a)

/-- G0's check over `TExprA`, modeled on Strategy/Atoms.purs:76-79: an
equation needs both substituted sides syntactically equal and defined;
the row tests read the erased problem and substitution, since they read
labels and tails only. `ff` is refused. -/
def CheckA (M : Check0 Label B) (P : SigProblemA Label B)
    (σ : SubstA Label B) : Prop :=
  ∀ a ∈ P.B, match a with
    | .eq t u => substTA σ t = substTA σ u ∧
        M.DefOK (eraseP P) (eraseT (substTA σ t))
    | .lacks r l => M.RowOK (eraseP P) (eraseS σ) (.lacks r l)
    | .disjoint r s => M.RowOK (eraseP P) (eraseS σ) (.disjoint r s)
    | .ff => False

/- No `app` node in an expression (for D6.5's `D`). -/
mutual
  def AppFreeT : TExprA Label B → Prop
    | .base _ => True
    | .arrow t u => AppFreeT t ∧ AppFreeT u
    | .tvar _ => True
    | .record fs _ => AppFreeF fs
    | .app _ _ => False

  def AppFreeF : FieldsA Label B → Prop
    | .nil => True
    | .cons _ t rest => AppFreeT t ∧ AppFreeF rest
end

def AppFreeAtom : AtomA Label B → Prop
  | .eq t u => AppFreeT t ∧ AppFreeT u
  | _ => True

/-- S5′. If P-G0's clauses hold on the existing model, then on a
problem with no `app` in `D` (D6.5), every atom of `B` holds under any
assignment over `GA` satisfying `D` and the candidate's binding
equations, whenever the check over `TExprA` accepts. Requirement atoms
are S6's; the existence of the assignment stays P-G0's. -/
def S5' : Prop :=
  ∀ M : Check0 Label B, PG0Clauses M →
    ∀ (P : SigProblemA Label B) (σ : SubstA Label B),
      (∀ a ∈ P.D, AppFreeAtom a) → CheckA M P σ →
      ∀ θ : AssignA Label B, SatA θ P.D → SatA θ (eqsA σ) → SatA θ P.B

end Composition.App
