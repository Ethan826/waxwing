/-
Strategy A's schematic certificates (dossier §18.39): the untrusted
certificate format, what it denotes at a pattern, its instantiation as
an ordinary `Cert`, SC1, and regions with the four region queries.
Research model of star/schematic.mjs and region.mjs, not the
prototype. Definitions and statements only; nothing is proved.
Prose: research/division-campaign/star/sc-statements.md.
-/
import Composition.Sig.SlicePatterns

namespace Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- A piece `(r, ex)`: rigid row `r` without written labels `ex`, rest
included. -/
abbrev SchPiece (Label : Type) := Nat × List Label

/-- Schematic values. Fields carry written labels only; rests enter
only through pieces. -/
inductive SchV (Label B : Type) where
  | base : GB Label B → SchV Label B
  | arrow : SchV Label B → SchV Label B → SchV Label B
  | record : List (Label × SchV Label B) → List (SchPiece Label) → SchV Label B

/-- The untrusted certificate: the solver's substitution as bindings,
first occurrence wins; an unbound variable is `{}`. -/
structure SchCert (Label B : Type) where
  ty : List (Nat × SchV Label B)
  row : List (Nat × SchV Label B)

/-! ### Meaning at a pattern -/

def SchpieceRow (P : SigProblem Label B) (π : Pattern Label)
    (q : SchPiece Label) : Row (GL Label) (GG Label B)
  | .inl l => if l ∈ q.2 then none else genRow P π q.1 (.inl l)
  | .inr s => genRow P π q.1 (.inr s)

def piecesRow (P : SigProblem Label B) (π : Pattern Label)
    (ps : List (SchPiece Label)) : Row (GL Label) (GG Label B) :=
  ps.foldr (fun q acc => union (SchpieceRow P π q) acc) Row.empty

mutual
  def sden (P : SigProblem Label B) (π : Pattern Label) :
      SchV Label B → GG Label B
    | .base b => .base b
    | .arrow a c => .arrow (sden P π a) (sden P π c)
    | .record fs ps =>
      .record (union (sdenRow P π fs) (piecesRow P π ps))

  def sdenRow (P : SigProblem Label B) (π : Pattern Label) :
      List (Label × SchV Label B) → Row (GL Label) (GG Label B)
    | [] => Row.empty
    | (l, s) :: rest => fun k =>
      if k = .inl l then some (sden P π s) else sdenRow P π rest k
end

/-- A row binding's row; a non-record binding denotes `{}`. -/
def sdenRowOf (P : SigProblem Label B) (π : Pattern Label) :
    SchV Label B → Row (GL Label) (GG Label B)
  | .record fs ps => union (sdenRow P π fs) (piecesRow P π ps)
  | _ => Row.empty

def sdenCert (P : SigProblem Label B) (π : Pattern Label)
    (σ : SchCert Label B) : Assign (GL Label) (GB Label B) :=
  ⟨fun n => ((σ.ty.lookup n).map (sden P π)).getD emptyGG,
   fun r => ((σ.row.lookup r).map (sdenRowOf P π)).getD Row.empty⟩

/-! ### Instantiation at a finite pattern -/

def pieceS (P : SigProblem Label B) (p : List (Nat × Label))
    (q : SchPiece Label) : List (GL Label × SG Label B) :=
  ((written P).filter fun l =>
      decide ((q.1, l) ∈ p) && !decide (l ∈ q.2)).map
    (fun l => (.inl l, .base (.inr (.A q.1 l)))) ++
  [(.inr q.1, .base (.inr (.R q.1)))]

mutual
  def inst (P : SigProblem Label B) (p : List (Nat × Label)) :
      SchV Label B → SG Label B
    | .base b => .base b
    | .arrow a c => .arrow (inst P p a) (inst P p c)
    | .record fs ps =>
      .record (instFields P p fs ++ ps.flatMap (pieceS P p))

  def instFields (P : SigProblem Label B) (p : List (Nat × Label)) :
      List (Label × SchV Label B) → List (GL Label × SG Label B)
    | [] => []
    | (l, s) :: rest => (.inl l, inst P p s) :: instFields P p rest
end

def instRowOf (P : SigProblem Label B) (p : List (Nat × Label)) :
    SchV Label B → List (GL Label × SG Label B)
  | .record fs ps => instFields P p fs ++ ps.flatMap (pieceS P p)
  | _ => []

/-- The ordinary certificate a schematic one gives at `p`. -/
def instCert (P : SigProblem Label B) (p : List (Nat × Label))
    (σ : SchCert Label B) : Cert Label B :=
  ⟨σ.ty.map fun e => (e.1, inst P p e.2),
   σ.row.map fun e => (e.1, instRowOf P p e.2)⟩

/-! ### SC1 (statement only) -/

/-- SC1: instantiation denotes the schematic meaning at `patternOf p`,
value by value and for the whole certificate. -/
def SC1 (Label B : Type) [DecidableEq Label] : Prop :=
  ∀ (P : SigProblem Label B) (p : List (Nat × Label)) (σ : SchCert Label B),
    (∀ s, den (inst P p s) = sden P (patternOf p) s) ∧
      denCert (instCert P p σ) = sdenCert P (patternOf p) σ

section Regions
variable [DecidableEq B]

/-! ### Regions and the four queries -/

/-- Fixed bits `(r, l, b)`. Strategy A uses `[]`; others are for B. -/
abbrev Cube (Label : Type) := List (Nat × Label × Bool)

def agreesS (c : Cube Label) (p : List (Nat × Label)) : Bool :=
  c.all fun e => decide ((e.1, e.2.1) ∈ p) == e.2.2

/-- Consistent finite patterns agreeing with the cube. -/
def SchInRegion (P : SigProblem Label B) (c : Cube Label)
    (p : List (Nat × Label)) : Prop :=
  p ∈ patterns P ∧ consistentS P p = true ∧ agreesS c p = true

def forcedS (c : Cube Label) (l : Label) : List Nat :=
  (c.filter fun e => decide (e.2.1 = l) && e.2.2).map (·.1)

/-- `hs` may be exactly the forced-or-chosen holders of `l`. -/
def allowedS (P : SigProblem Label B) (c : Cube Label) (l : Label)
    (hs : List Nat) : Bool :=
  decide (l ∈ written P) && holdersOK P l hs &&
    hs.all fun r => decide (r ∈ P.rigidRow) && !decide ((r, l, false) ∈ c)

def nonEmptyS (P : SigProblem Label B) (c : Cube Label) : Bool :=
  c.all fun e => !e.2.2 || allowedS P c e.2.1 (forcedS c e.2.1)

def possibleS (P : SigProblem Label B) (c : Cube Label) (r : Nat)
    (l : Label) : Bool :=
  nonEmptyS P c && allowedS P c l (r :: forcedS c l)

def mustS (P : SigProblem Label B) (c : Cube Label) (r : Nat)
    (l : Label) : Bool :=
  !nonEmptyS P c || decide (r ∈ forcedS c l)

def possibleBothS (P : SigProblem Label B) (c : Cube Label) (r s : Nat)
    (l : Label) : Bool :=
  nonEmptyS P c && allowedS P c l (r :: s :: forcedS c l)

/-! ### SC2's declaration fragment -/
end Regions

end Composition.Syntax
