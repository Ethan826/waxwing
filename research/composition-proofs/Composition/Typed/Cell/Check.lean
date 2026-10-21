/-
The cell checker (dossier §18.51): symbolic evaluation of the original
body `P.B` under an untrusted cell certificate, reading the region only
through injected queries. Definitions only. The evaluator has the shape
of strategy A's (`evalY`, `composeY`, `wfY`, `eqY`, Sig/SchematicDefs),
but pieces, apartness and equality are re-defined for cells, and none of
strategy A's correctness statements is carried over.
-/
import Composition.Typed.Cell.Query
import Composition.Sig.SchematicDefs

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- A record's parts: written fields and pieces. -/
abbrev CRow (Label B : Type) :=
  List (Label × CellV Label B) × List (CellPiece Label)

section Check
variable (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B)

/-- No piece of `ps` holds label `l` anywhere in the region. -/
def lackC (ps : List (CellPiece Label)) (l : Label) : Bool :=
  ps.all fun q => !decide (l ∈ q.labels) || !Q.possW q.row l

/-- Two pieces never share a written label or a cell in the region. -/
def piecesApart (q q' : CellPiece Label) : Bool :=
  (q.labels.all fun l => !decide (l ∈ q'.labels) ||
    !Q.possBoth q.row q'.row l) &&
  q.cubes.all fun K => q'.cubes.all fun K' =>
    !Q.cellBoth q.row q'.row (K ++ K')

/-- Two parts never share a label: fields syntactically, a field against
a piece through `lackC`, pieces through `piecesApart`. -/
def apartC (x y : CRow Label B) : Bool :=
  x.1.all (fun e =>
    !(y.1.any fun e' => decide (e'.1 = e.1)) && lackC Q y.2 e.1) &&
  y.1.all (fun e => lackC Q x.2 e.1) &&
  x.2.all fun q => y.2.all (piecesApart Q q)

def composeC (parts : List (CRow Label B)) : Option (CRow Label B) :=
  parts.foldlM (fun acc x => if apartC Q acc x
    then some (acc.1 ++ x.1, acc.2 ++ x.2) else none) ([], [])

mutual
  /-- Well-formedness of a value at every depth: rigid type variables
  and rows only, parts pairwise apart. -/
  def wfC : CellV Label B → Bool
    | .base _ => true
    | .rty n => decide (n ∈ P.rigidTy)
    | .arrow a b => wfC a && wfC b
    | .record fs ps => wfFC fs &&
      ps.all (fun q => decide (q.row ∈ P.rigidRow)) &&
      (composeC Q (fs.map (fun e => ([e], [])) ++
        ps.map (fun q => ([], [q])))).isSome

  def wfFC : List (Label × CellV Label B) → Bool
    | [] => true
    | (_, v) :: rest => wfC v && wfFC rest
end

/-- Every binding, used or shadowed, is well-formed; row bindings are
records. -/
def certOkC : Bool :=
  σ.ty.all (fun e => wfC P Q e.2) && σ.row.all fun e =>
    wfC P Q e.2 && match e.2 with | .record _ _ => true | _ => false

def tyC (n : Nat) : CellV Label B :=
  if n ∈ P.rigidTy then .rty n
  else (σ.ty.lookup n).getD (.record [] [])

/-- A rigid row is its whole piece; a flexible row its binding. -/
def rowC (r : Nat) : Option (CRow Label B) :=
  if r ∈ P.rigidRow then some ([], [wholePiece P r]) else
  match (σ.row.lookup r).getD (.record [] []) with
  | .record fs ps => some (fs, ps)
  | _ => none

mutual
  /-- Symbolic evaluation; `none` when a composition may be undefined
  somewhere in the region or a written label repeats. -/
  def evalC : TExpr Label B → Option (CellV Label B)
    | .base b => some (.base b)
    | .arrow t u => (evalC t).bind fun a => (evalC u).map (.arrow a)
    | .tvar n => some (tyC P σ n)
    | .record fs tails => (evalFC fs).bind fun fr =>
      (tails.mapM (rowC P σ)).bind fun rs =>
        (composeC Q ((fr, []) :: rs)).map fun x => .record x.1 x.2

  def evalFC : Fields Label B → Option (List (Label × CellV Label B))
    | .nil => some []
    | .cons l t rest => (evalC t).bind fun g => (evalFC rest).bind fun r =>
      if l ∈ r.map Prod.fst then none else some ((l, g) :: r)
end

/-- Every written label a piece of `xs` may hold is held by a piece of
the same row in `ys`. -/
def sameW (xs ys : List (CellPiece Label)) : Bool :=
  xs.all fun q => q.labels.all fun l => !Q.possW q.row l ||
    ys.any fun q' => decide (q'.row = q.row) && decide (l ∈ q'.labels)

/-- The cubes the pieces of row `r` contribute. -/
def rowCubes (ps : List (CellPiece Label)) (r : Nat) : List CellCube :=
  (ps.filter fun q => decide (q.row = r)).flatMap (·.cubes)

/-- For each row with a piece on either side, both sides select the same
cells of that row. -/
def sameCells (xs ys : List (CellPiece Label)) : Bool :=
  (xs ++ ys).all fun q =>
    Q.cover q.row (rowCubes xs q.row) (rowCubes ys q.row) &&
    Q.cover q.row (rowCubes ys q.row) (rowCubes xs q.row)

mutual
  /-- Equality at every generic instance of the region, for well-formed
  values. Sources must match: a written field never equals a piece's
  entry, and two rows' entries are never identified. -/
  def eqC : CellV Label B → CellV Label B → Bool
    | .base a, .base b => decide (a = b)
    | .rty n, .rty m => decide (n = m)
    | .arrow a b, .arrow a' b' => eqC a a' && eqC b b'
    | .record xf xp, .record yf yp =>
      eqFC yf xf && (yf.all fun e => xf.any fun e' => decide (e'.1 = e.1)) &&
      sameW Q xp yp && sameW Q yp xp && sameCells Q xp yp
    | _, _ => false

  /-- Every field of the last argument has an equal field in `yf`. -/
  def eqFC (yf : List (Label × CellV Label B)) :
      List (Label × CellV Label B) → Bool
    | [] => true
    | (l, a) :: rest => (match yf.lookup l with
        | some b => eqC a b
        | none => false) && eqFC yf rest
end

/-- One atom of the original body. An equation needs both sides to
evaluate and to be equal. -/
def atomC : Atom Label B → Bool
  | .eq t u => match evalC P Q σ t, evalC P Q σ u with
    | some a, some b => eqC Q a b
    | _, _ => false
  | .lacks r l => match rowC P σ r with
    | some x => !decide (l ∈ x.1.map Prod.fst) && lackC Q x.2 l
    | none => false
  | .disjoint r s => match rowC P σ r, rowC P σ s with
    | some x, some y => apartC Q x y
    | _, _ => false
  | .ff => false

/-- The checker: the fragment guard (pattern coverage is established
only there), certificate well-formedness, then every atom of the
original `P.B`, binding equations included; nothing is dropped as
solved. -/
def cellCheck : Bool :=
  fragmentS P && certOkC P Q σ && P.B.all (atomC P Q σ)

end Check

end Composition.Typed.Cells
