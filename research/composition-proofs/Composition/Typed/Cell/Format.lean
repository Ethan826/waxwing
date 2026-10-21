/-
Cell-based certificates for option B (dossier §18.51): the untrusted
format and its denotation at a generic instance `θs`. Definitions only;
no claim. The statements are in Cell/Statements.lean and
Cell/Scenarios.lean; prose, restrictions and review in
research/division-campaign/cellcheck/statements.md.

A piece copies part of one named rigid row out of `θs`: the row's own
entries at some written labels and at the Venn cells a list of cubes
selects. Its field types are therefore the source row's, whatever `θs`
holds there (constants, or terms an mgu put there). A cube is a
conjunction of membership literals over rigid rows; a cell `S` meets
`(x, b)` iff `(x ∈ S) = b`. A certificate never names a generic constant:
it reaches `θs` only through pieces and rigid type variables, so one
certificate is read at every generic instance of every pattern.
-/
import Composition.Typed.Defs
import Composition.Sig.ProjectionDefs
import Composition.Sig.SchematicCert

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-- A conjunction of literals: row `x` is (`true`) or is not (`false`) a
member of the cell. -/
abbrev CellCube := List (Nat × Bool)

/-- Cell `S` satisfies cube `K`. -/
def cubeSat (S : Cell) (K : CellCube) : Bool :=
  K.all fun e => decide (e.1 ∈ S) == e.2

/-- A piece: rigid row `row` at the written labels `labels` and at the
cells some cube of `cubes` selects. `cubes = []` selects no cell;
`cubes = [[]]` selects every cell (the whole unwritten part). -/
structure CellPiece (Label : Type) where
  row : Nat
  labels : List Label
  cubes : List CellCube

def CellPiece.selects (q : CellPiece Label) (S : Cell) : Bool :=
  q.cubes.any (cubeSat S)

/-- Schematic values. There is no constant and no single-field reference:
rigid content enters only through pieces and rigid type variables. -/
inductive CellV (Label B : Type) where
  | base : B → CellV Label B
  | rty : Nat → CellV Label B
  | arrow : CellV Label B → CellV Label B → CellV Label B
  | record : List (Label × CellV Label B) → List (CellPiece Label) →
      CellV Label B

/-- The untrusted certificate: the solver's bindings, first occurrence
wins; an unbound flexible variable is `{}`. -/
structure CellCert (Label B : Type) where
  ty : List (Nat × CellV Label B)
  row : List (Nat × CellV Label B)

/-! ### Denotation at a generic instance -/

/-- A piece at `θs`: the source row's own entries where selected. A
piece on a row outside `P.rigidRow` denotes the empty row (the checker
refuses such pieces, so no verdict depends on this reading). -/
def cpieceRow (P : SigProblem Label B) (θs : CAssign Label B)
    (q : CellPiece Label) : Row (CL Label) (CG Label B)
  | .inl l => if q.row ∈ P.rigidRow ∧ l ∈ q.labels then
      θs.row q.row (.inl l) else none
  | .inr S => if q.row ∈ P.rigidRow ∧ q.selects S = true then
      θs.row q.row (.inr S) else none

def cpiecesRow (P : SigProblem Label B) (θs : CAssign Label B)
    (ps : List (CellPiece Label)) : Row (CL Label) (CG Label B) :=
  ps.foldr (fun q acc => union (cpieceRow P θs q) acc) Row.empty

mutual
  /-- A schematic value at `θs`. A rigid type variable reads `θs`; a
  type variable outside `P.rigidTy` denotes `{}`. Records are the union
  of their fields and pieces, fields first; the checker guarantees the
  parts are disjoint wherever it accepts. -/
  def cvDen (P : SigProblem Label B) (θs : CAssign Label B) :
      CellV Label B → CG Label B
    | .base b => .base (.inl b)
    | .rty n => if n ∈ P.rigidTy then θs.ty n else emptyG
    | .arrow a c => .arrow (cvDen P θs a) (cvDen P θs c)
    | .record fs ps =>
      .record (union (cvDenFields P θs fs) (cpiecesRow P θs ps))

  def cvDenFields (P : SigProblem Label B) (θs : CAssign Label B) :
      List (Label × CellV Label B) → Row (CL Label) (CG Label B)
    | [] => Row.empty
    | (l, v) :: rest => fun k =>
      if k = .inl l then some (cvDen P θs v) else cvDenFields P θs rest k
end

/-- A row binding's row; a non-record binding denotes `{}`. -/
def cvDenRowOf (P : SigProblem Label B) (θs : CAssign Label B) :
    CellV Label B → Row (CL Label) (CG Label B)
  | .record fs ps => union (cvDenFields P θs fs) (cpiecesRow P θs ps)
  | _ => Row.empty

/-- Instantiation at `θs`: the flexible assignment the certificate
denotes there. Bindings of rigid variables are present but unread
(`combine` takes rigid values from `θs`). -/
def cinst (P : SigProblem Label B) (θs : CAssign Label B)
    (σ : CellCert Label B) : CAssign Label B :=
  ⟨fun n => ((σ.ty.lookup n).map (cvDen P θs)).getD emptyG,
   fun r => ((σ.row.lookup r).map (cvDenRowOf P θs)).getD Row.empty⟩

/-- The certificate solves the body at `θs`, finitely. -/
def CellSolves (P : SigProblem Label B) (θs : CAssign Label B)
    (σ : CellCert Label B) : Prop :=
  FinAssign (cinst P θs σ) ∧
    Sat (combine (cliftP P) θs (cinst P θs σ)) (cliftP P).B

/-! ### Relation to strategy A's `{r, ex}` and option C's pieces -/

/-- The whole rigid row `r`: every written label, every cell. -/
def wholePiece (P : SigProblem Label B) (r : Nat) : CellPiece Label :=
  ⟨r, written P, [[]]⟩

/-- Strategy A's `{r, ex}` (P9s, `SchPiece`): `r` without the written
labels `ex`, rest included. Syntactic image only: P9s's rest is one
label `inr r` private to `r`; here it is every cell of `r`, and cells
are shared with other rows. -/
def ofSchPiece (P : SigProblem Label B) (q : SchPiece Label) :
    CellPiece Label :=
  ⟨q.1, (written P).filter (· ∉ q.2), [[]]⟩

/-- Option C's guard-free `⟨r, S, rest?⟩` (`Piece` with `guard = []`):
the rest becomes every cell or none. Guards have no image (deferred). -/
def ofProjPiece (q : Piece Label) : CellPiece Label :=
  ⟨q.row, q.labels, if q.rest then [[]] else []⟩

end Composition.Typed.Cells
