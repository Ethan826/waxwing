/-
Option C, statements only (dossier §18.39 item 3;
research/division-campaign/star/projection-statements.md). Definitions
and proposed statements as `Prop`s; nothing here is proved and nothing
is claimed to hold.

A piece is a rigid row restricted to a list of written labels, with or
without its rest, optionally guarded at each label by literals over
other rigid rows' presence at that label. Strategy A's `{ r, ex }` is
the piece `⟨r, written P ∖ ex, [], true⟩`; projection onto written
labels is a piece with no guard and no rest; one-literal guards are the
smallest extension past projection (`r|(S ∩ dom s)`, `r|(S ∖ dom s)`).
A schematic certificate instantiates at a finite pattern to an ordinary
`Cert` (§15.2), so `checkCert` (K4) is the reference for every
statement.
-/
import Composition.Sig.Patterns

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- A guard literal: rigid row `row` holds (`pos`) or lacks (`!pos`)
the label at hand. -/
structure Lit where
  row : Nat
  pos : Bool

/-- A piece: rigid row `row` at the written labels in `labels` where
every literal of `guard` holds, plus its rest iff `rest`. -/
structure Piece (Label : Type) where
  row : Nat
  labels : List Label
  guard : List Lit
  rest : Bool

/-- A literal at label `l` of finite pattern `p`. -/
def litAt (p : List (Nat × Label)) (l : Label) (g : Lit) : Bool :=
  decide ((g.row, l) ∈ p) == g.pos

/-- A literal at label `l` of a semantic pattern. -/
def litSem (π : Pattern Label) (l : Label) (g : Lit) : Bool :=
  π g.row l == g.pos

/-- The piece's entries at finite pattern `p`, as a syntactic row. -/
def Piece.entries (P : SigProblem Label B) (p : List (Nat × Label))
    (q : Piece Label) : List (GL Label × SG Label B) :=
  ((q.labels.filter fun l => decide (l ∈ written P) &&
      decide ((q.row, l) ∈ p) && q.guard.all (litAt p l)).map
    fun l => (.inl l, .base (.inr (.A q.row l)))) ++
  (if q.rest then [(.inr q.row, .base (.inr (.R q.row)))] else [])

/-- The piece's denotation at a semantic pattern: `genRow` restricted
to the piece's labels where the guard holds, and to its rest iff
`rest`. Field types are therefore the rigid row's own. -/
def pieceRow (P : SigProblem Label B) (π : Pattern Label) (q : Piece Label) :
    Row (GL Label) (GG Label B)
  | .inl l => if l ∈ q.labels ∧ q.guard.all (litSem π l) = true then
      genRow P π q.row (.inl l) else none
  | .inr s => if q.rest = true then genRow P π q.row (.inr s) else none

/-- Fragments. `Old`: strategy A's `{ r, ex }`. `Proj`: no guard (the
operation the author asked about). `OneLit`: at most one literal. -/
def Piece.Old (q : Piece Label) : Prop := q.guard = [] ∧ q.rest = true
def Piece.Proj (q : Piece Label) : Prop := q.guard = []
def Piece.OneLit (q : Piece Label) : Prop := q.guard.length ≤ 1

/-- Schematic values: generic values whose records carry written
fields and pieces. -/
inductive SV (Label B : Type) where
  | base : GB Label B → SV Label B
  | arrow : SV Label B → SV Label B → SV Label B
  | record : List (Label × SV Label B) → List (Piece Label) → SV Label B

mutual
  /-- Instantiation at finite pattern `p`. -/
  def SV.inst (P : SigProblem Label B) (p : List (Nat × Label)) :
      SV Label B → SG Label B
    | .base b => .base b
    | .arrow a c => .arrow (SV.inst P p a) (SV.inst P p c)
    | .record fs ps => .record (SV.instFields P p fs ++
        (ps.map (Piece.entries P p)).flatten)

  def SV.instFields (P : SigProblem Label B) (p : List (Nat × Label)) :
      List (Label × SV Label B) → List (GL Label × SG Label B)
    | [] => []
    | (l, v) :: rest => (.inl l, SV.inst P p v) :: SV.instFields P p rest
end

mutual
  /-- Every piece, at every depth, lies in fragment `F`. -/
  def SV.AllPieces (F : Piece Label → Prop) : SV Label B → Prop
    | .base _ => True
    | .arrow a c => SV.AllPieces F a ∧ SV.AllPieces F c
    | .record fs ps => SV.AllPiecesF F fs ∧ ∀ q ∈ ps, F q

  def SV.AllPiecesF (F : Piece Label → Prop) :
      List (Label × SV Label B) → Prop
    | [] => True
    | (_, v) :: rest => SV.AllPieces F v ∧ SV.AllPiecesF F rest
end

/-- A schematic certificate: type variables to values, flexible rows to
written fields and pieces; unbound variables are `{}` after
instantiation, as in `denCert`. -/
structure SCert (Label B : Type) where
  ty : List (Nat × SV Label B)
  row : List (Nat × (List (Label × SV Label B) × List (Piece Label)))

/-- The ordinary certificate a schematic one gives at `p` (SC1's
`inst σ π`). -/
def SCert.inst (P : SigProblem Label B) (p : List (Nat × Label))
    (σ : SCert Label B) : Cert Label B :=
  ⟨σ.ty.map fun e => (e.1, SV.inst P p e.2),
   σ.row.map fun e => (e.1, SV.instFields P p e.2.1 ++
     (e.2.2.map (Piece.entries P p)).flatten)⟩

def SCert.AllPieces (F : Piece Label → Prop) (σ : SCert Label B) : Prop :=
  (∀ e ∈ σ.ty, SV.AllPieces F e.2) ∧
    ∀ e ∈ σ.row, SV.AllPiecesF F e.2.1 ∧ ∀ q ∈ e.2.2, F q

variable [DecidableEq B]

/-- The instantiation passes the proved per-pattern checker (K4). -/
def Works (P : SigProblem Label B) (σ : SCert Label B)
    (p : List (Nat × Label)) : Prop :=
  checkCert P p (σ.inst P p) = true

/-- A region: the finite consistent patterns that agree with a cube of
fixed bits `(r, l, b)`. -/
def InRegion (P : SigProblem Label B) (cube : List (Nat × Label × Bool))
    (p : List (Nat × Label)) : Prop :=
  p ∈ patterns P ∧ consistentS P p = true ∧
    ∀ c ∈ cube, decide ((c.1, c.2.1) ∈ p) = c.2.2

/-- One certificate works at every pattern of a region. -/
def UniformOn (P : SigProblem Label B) (cube : List (Nat × Label × Bool))
    (σ : SCert Label B) : Prop :=
  ∀ p, InRegion P cube p → Works P σ p

/-! ### Proposed statements (none proved) -/

/-- PI1 (SC1 for pieces): a piece's entries denote `pieceRow`. -/
def PI1 : Prop :=
  ∀ (P : SigProblem Label B) (p : List (Nat × Label)) (q : Piece Label),
    denRow (q.entries P p) = pieceRow P (patternOf p) q

/-- PI2: the whole row is the unguarded piece over every written label
with its rest; strategy A's `{ r, ex }` is the unguarded piece over
`written P ∖ ex` with its rest. -/
def PI2 : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (r : Nat) (ex : List Label),
    pieceRow P π ⟨r, written P, [], true⟩ = genRow P π r ∧
    pieceRow P π ⟨r, (written P).filter (· ∉ ex), [], true⟩ =
      fun k => match k with
        | .inl l => if l ∈ ex then none else genRow P π r (.inl l)
        | .inr s => genRow P π r (.inr s)

/-- PC3 (SC3 for pieces), for a candidate symbolic checker `chk`:
acceptance on a region implies `checkCert` at each of its patterns. -/
def PC3 (chk : SigProblem Label B → SCert Label B →
    List (Nat × Label × Bool) → Bool) : Prop :=
  ∀ P σ cube, chk P σ cube = true → UniformOn P cube σ

/-- PC4 (SC4 for pieces): one certificate working on the empty cube
gives `Accepts`. -/
def PC4 : Prop :=
  ∀ (P : SigProblem Label B) (σ : SCert Label B), UniformOn P [] σ →
    Accepts P

/-! ### `divide3` and `divide5`, over a list of written labels `as` -/

/-- `divide3` (star/problems.mjs): rigid `r = 0`, `s = 1`, `s lacks a`
for `a ∈ as`; flexible `u = 2`, `t = 3`; `r = u ⊎ t`, `u disjoint s`,
`t lacks a`. -/
def divide3Sig (as : List Label) : SigProblem Label B :=
  ⟨[], [0, 1], as.map (.lacks 1),
   [.eq (.record .nil [0]) (.record .nil [2, 3]), .disjoint 2 1] ++
     as.map (.lacks 3)⟩

/-- The projection certificate: `u := r|as`, `t := r`'s rest. -/
def sigma3 (as : List Label) : SCert Label B :=
  ⟨[], [(2, ([], [⟨0, as, [], false⟩])), (3, ([], [⟨0, [], [], true⟩]))]⟩

/-- `divide5` (new here): rigid `r = 0`, `s = 1`, `s₂ = 2` with
`s disjoint s₂`; flexible `u = 3`, `t = 4`, `q = 5`; `r = u ⊎ t ⊎ q`,
`u disjoint s`, `t disjoint s₂`, `q lacks a`. -/
def divide5Sig (as : List Label) : SigProblem Label B :=
  ⟨[], [0, 1, 2], [.disjoint 1 2],
   [.eq (.record .nil [0]) (.record .nil [3, 4, 5]), .disjoint 3 1,
     .disjoint 4 2] ++ as.map (.lacks 5)⟩

/-- One-literal guards: `u := r|(as ∖ dom s)`, `t := r|(as ∩ dom s)`,
`q := r`'s rest. -/
def sigma5 (as : List Label) : SCert Label B :=
  ⟨[], [(3, ([], [⟨0, as, [⟨1, false⟩], false⟩])),
        (4, ([], [⟨0, as, [⟨1, true⟩], false⟩])),
        (5, ([], [⟨0, [], [], true⟩]))]⟩

/-- PD3: the projection certificate works at every consistent pattern
of `divide3`. -/
def PD3 : Prop :=
  ∀ as : List Label, as.Nodup →
    UniformOn (divide3Sig (B := B) as) [] (sigma3 as)

/-- PD3⁻: with `Old` pieces only, a certificate working at two
consistent patterns of `divide3` forces them to agree on every bit, so
covering the `2^|as|` patterns takes `2^|as|` certificates. -/
def PD3neg : Prop :=
  ∀ (as : List Label) (σ : SCert Label B) (p p' : List (Nat × Label)),
    let P : SigProblem Label B := divide3Sig as
    as.Nodup → σ.AllPieces Piece.Old →
    InRegion P [] p → InRegion P [] p' → Works P σ p → Works P σ p' →
    ∀ a ∈ as, ((0, a) ∈ p ↔ (0, a) ∈ p')

/-- PD5: the one-literal certificate works at every consistent
pattern of `divide5` (so `divide5` is in `Accepts`). -/
def PD5 : Prop :=
  ∀ as : List Label, as.Nodup →
    UniformOn (divide5Sig (B := B) as) [] (sigma5 as)

/-- PD5⁻: with `Proj` pieces, no certificate works both at a pattern
where `r` and `s` hold some `a` and at one where `r` and `s₂` hold it;
covering the `2^|as|` patterns choosing `s` or `s₂` at each label takes
`2^|as|` certificates. -/
def PD5neg : Prop :=
  ∀ (as : List Label) (σ : SCert Label B) (p p' : List (Nat × Label)),
    let P : SigProblem Label B := divide5Sig as
    as.Nodup → σ.AllPieces Piece.Proj →
    InRegion P [] p → InRegion P [] p' → Works P σ p → Works P σ p' →
    ∀ a ∈ as, ¬ ((0, a) ∈ p ∧ (1, a) ∈ p ∧ (0, a) ∈ p' ∧ (2, a) ∈ p')

end Composition.Syntax
