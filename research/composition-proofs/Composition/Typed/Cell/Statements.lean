/-
The cell checker's statements (dossier §18.51). STATEMENTS ONLY: each
is a `def … : Prop`; nothing is proved and nothing is claimed to hold.
Target: the `←` direction of `openCharacterization`, through B5
(`d3bSoundOpen`). No computed θ*: the main statement takes a generic
instance and its evidence as premises.
Prose and review: research/division-campaign/cellcheck/statements.md.
-/
import Composition.Typed.Cell.Check
import Composition.Typed.Bridge.Valid

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-! ### CM: the main statement and its corollaries -/

/-- CM. An accepted certificate, instantiated at any generic instance of
the region, solves the original body there, finitely. The certificate
is arbitrary (untrusted); the queries need only be conservative. -/
def CellSound : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    QSound P Q → cellCheck P Q σ = true →
    ∀ π θs, HasInstance P π → GenericInst P π θs → WithinC P θs →
      CellShape P θs → CellSolves P θs σ

/-- CM-open. With pattern coverage (CV) and B5: acceptance gives
option-B validity. -/
def CellOpen : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    QSound P Q → cellCheck P Q σ = true → ValidOpen P

/-- CM-impl. The same for the proposed queries, with no premise. -/
def CellOpenImpl : Prop :=
  ∀ (P : SigProblem Label B) (σ : CellCert Label B),
    cellCheck P (implQ P) σ = true → ValidOpen P

/-! ### CI: certificate instantiation -/

/-- CI1. A piece denotes its source row's own entries, so field types
are the row's: the whole piece is the row itself (given `WithinC`), and
any piece is a sub-row of its source. -/
def PieceIsSubRow : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B), WithinC P θs →
    ∀ r ∈ P.rigidRow,
      cpieceRow P θs (wholePiece P r) = θs.row r ∧
      ∀ (q : CellPiece Label) k, q.row = r →
        cpieceRow P θs q k = none ∨ cpieceRow P θs q k = θs.row r k

/-- CI2. Instantiation is finite at every finite generic instance, for
every certificate (no well-formedness premise). -/
def CInstFin : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B) (σ : CellCert Label B),
    RigidFinC P θs → FinAssign (cinst P θs σ)

/-- CI3. Denotation commutes with instantiation: where the symbolic
evaluator returns `v`, the ordinary evaluator under the instantiated
certificate returns `v`'s denotation, at every generic instance of the
region. -/
def EvalCommutes : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    QSound P Q → certOkC P Q σ = true → ∀ θs, InCellRegion P θs →
    ∀ t v, evalC P Q σ t = some v →
      evalT (combine (cliftP P) θs (cinst P θs σ)) (cliftT t) =
        some (cvDen P θs v)

/-- CI4. Option C's guard-free pieces have an image and denote, on
written labels, the labels option C's `pieceRow` holds at the same
pattern (compared at `thetaFree`, entry presence only; values differ by
model). Their rest becomes every cell of the row, or none. -/
def ProjPieceDen : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (q : Piece Label),
    q.guard = [] → q.row ∈ P.rigidRow →
    ∃ c, ofProjPiece q = some c ∧
      (∀ l ∈ written P, (cpieceRow P (thetaFree P π) c (.inl l)).isSome =
        (pieceRow P π q (.inl l)).isSome) ∧
      ∀ θs S, cpieceRow P θs c (.inr S) =
        if q.rest then θs.row q.row (.inr S) else none

/-- CI4′. A guarded piece has no image. -/
def ProjGuardRefused : Prop :=
  ∀ q : Piece Label, q.guard ≠ [] → ofProjPiece q = none

/-- CI4″. Strategy A's `{r, ex}`: on written labels, the labels A's
`SchpieceRow` holds at the same pattern (presence, at `thetaFree`); on
cells, every cell of the row. -/
def SchPieceDen : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (q : SchPiece Label),
    q.1 ∈ P.rigidRow →
    (∀ l ∈ written P,
      (cpieceRow P (thetaFree P π) (ofSchPiece P q) (.inl l)).isSome =
        (SchpieceRow P π q (.inl l)).isSome) ∧
    ∀ θs S, cpieceRow P θs (ofSchPiece P q) (.inr S) = θs.row q.1 (.inr S)

/-- CI5. Where P9s needed `declared r s` between two rests, the cell
model needs no common free cell; for distinct rigid rows these agree
(up to `disjoint r r`, which empties `r`). -/
def DeclaredIsNoCommonCell : Prop :=
  ∀ (P : SigProblem Label B) (r s : Nat), r ∈ P.rigidRow →
    s ∈ P.rigidRow → r ≠ s →
    (cellPossS P [(r, true), (s, true)] = false ↔
      declaredS P r s = true ∨ Atom.disjoint r r ∈ P.D ∨
        Atom.disjoint s s ∈ P.D)

/-- CG. The guard computes the fragment (SC2Frag's first conjunct,
restated here because CM-open depends on it). -/
def FragmentIff : Prop :=
  ∀ P : SigProblem Label B, fragmentS P = true ↔ LDFragment P

/-! ### CB: the original body -/

/-- CB1. Acceptance reads every atom of the original `P.B`. -/
def BodyAll : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    cellCheck P Q σ = true → ∀ a ∈ P.B, atomC P Q σ a = true

/-- CB2. Each accepted atom holds at every generic instance of the
region, under the instantiated certificate. -/
def AtomSound : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    QSound P Q → certOkC P Q σ = true → ∀ θs, InCellRegion P θs →
    ∀ a, atomC P Q σ a = true →
      Holds (combine (cliftP P) θs (cinst P θs σ)) (cliftAtom a)

/-- CB3. `eqC` is sound for well-formed values. -/
def EqSound : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label), QSound P Q →
    ∀ θs, InCellRegion P θs → ∀ a b : CellV Label B,
      wfC P Q a = true → wfC P Q b = true → eqC Q a b = true →
      cvDen P θs a = cvDen P θs b

/-- CB4. The evaluator returns well-formed values from a well-formed
certificate (the invariant CB3 needs). -/
def EvalWf : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    certOkC P Q σ = true → ∀ t v, evalC P Q σ t = some v →
      wfC P Q v = true

/-! ### CD: definedness -/

/-- CD1. Duplicate written labels are refused. -/
def DupRefused : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B)
    (fs : Fields Label B) r, evalFC P Q σ fs = some r →
      (r.map Prod.fst).Nodup

/-- CD2. Apart parts denote disjoint rows at every generic instance of
the region (overlapping record parts are refused). -/
def ApartSound : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label), QSound P Q →
    ∀ θs, InCellRegion P θs → ∀ x y : CRow Label B,
      apartC Q x y = true →
      Composition.Disjoint
        (union (cvDenFields P θs x.1) (cpiecesRow P θs x.2))
        (union (cvDenFields P θs y.1) (cpiecesRow P θs y.2))

/-- CD3. Nested subterms: a symbolically evaluated expression is defined
at every generic instance of the region (the definedness half of CI3,
stated on its own). -/
def EvalDefined : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    QSound P Q → certOkC P Q σ = true → ∀ θs, InCellRegion P θs →
    ∀ t v, evalC P Q σ t = some v →
      (evalT (combine (cliftP P) θs (cinst P θs σ)) (cliftT t)).isSome

/-- CD4. An accepted equation has both sides evaluated. -/
def EqBothSides : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B)
    (t u : TExpr Label B), atomC P Q σ (.eq t u) = true →
      (evalC P Q σ t).isSome ∧ (evalC P Q σ u).isSome

/-! ### CV: pattern coverage -/

/-- CV1. On the guarded fragment, every pattern with an instance has a
generic instance in the region: `thetaFree`, with `d3bEqFree`'s
evidence and the cell shape. -/
def CoverFree : Prop :=
  ∀ (P : SigProblem Label B) π, LDFragment P → HasInstance P π →
    GenericInst P π (thetaFree P π) ∧ WithinC P (thetaFree P π) ∧
      CellShape P (thetaFree P π)

/-- CV2. The proposed queries are conservative for every problem (no
fragment premise): they answer for every pattern with an instance. -/
def ImplSound : Prop :=
  ∀ P : SigProblem Label B, QSound P (implQ P)

end Composition.Typed.Cells
