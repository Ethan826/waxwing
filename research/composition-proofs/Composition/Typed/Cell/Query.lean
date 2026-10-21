/-
The region of the cell checker and the queries it reads it through
(dossier §18.51 item 4). Definitions only; exactness and soundness are
stated in Cell/Statements.lean.

The region is the set of generic instances the checker answers for: a
generic instance of some pattern with an instance, within the problem's
symbols, whose occupied cells are exactly the free cells
(`CellShape`, the evidence `thetaFree` provides on the equation-free
fragment). Queries are injected (`CellQ`): the checker's soundness needs
only that each answer is conservative (`QSound`); `implQ` is the
proposed implementation.
-/
import Composition.Typed.Cell.Format

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-! ### The region -/

/-- Rigid row `r` holds cell `S` in `θs` exactly when `S` is a candidate
cell containing `r` with no declared disjoint pair inside. -/
def CellShape (P : SigProblem Label B) (θs : CAssign Label B) : Prop :=
  ∀ r ∈ P.rigidRow, ∀ S : Cell,
    (θs.row r (.inr S)).isSome = true ↔
      S ∈ cellCands P ∧ FreeCell P S ∧ r ∈ S

/-- The generic instances the checker answers for. -/
def InCellRegion (P : SigProblem Label B) (θs : CAssign Label B) : Prop :=
  ∃ π, HasInstance P π ∧ GenericInst P π θs ∧ WithinC P θs ∧
    CellShape P θs

/-! ### Queries -/

/-- The queries the cell checker asks. `possW r l`: may `r` hold written
label `l`; `possBoth r s l`: may both; `cellBoth r s K`: may both hold
one cell satisfying `K`; `cover r L R`: is every cell of `r` that some
cube of `L` selects also selected by some cube of `R`. -/
structure CellQ (Label : Type) where
  possW : Nat → Label → Bool
  possBoth : Nat → Nat → Label → Bool
  cellBoth : Nat → Nat → CellCube → Bool
  cover : Nat → List CellCube → List CellCube → Bool

/-- Every answer is conservative over the region: a `false` possibility
is impossible at every generic instance in it; a `true` cover holds at
every one. -/
def QSound (P : SigProblem Label B) (Q : CellQ Label) : Prop :=
  ∀ θs, InCellRegion P θs → ∀ r ∈ P.rigidRow, ∀ s ∈ P.rigidRow,
    (∀ l, Q.possW r l = false → θs.row r (.inl l) = none) ∧
    (∀ l, Q.possBoth r s l = false →
      θs.row r (.inl l) = none ∨ θs.row s (.inl l) = none) ∧
    (∀ K S, Q.cellBoth r s K = false → cubeSat S K = true →
      θs.row r (.inr S) = none ∨ θs.row s (.inr S) = none) ∧
    (∀ L R S, Q.cover r L R = true → θs.row r (.inr S) ≠ none →
      L.any (cubeSat S) = true → R.any (cubeSat S) = true)

/-! ### The proposed implementation -/

/-- `FreeCell`, computed. -/
def freeS (P : SigProblem Label B) (S : Cell) : Bool :=
  S.all fun r => S.all fun s => P.D.all fun
    | .disjoint x y => !(x == r && y == s)
    | _ => true

/-- Some free candidate cell satisfies `K`. The least candidate is the
rigid rows `K` asks for; freeness is closed under removing rows. Exact
when `K` has a positive literal (statement `CellPossExact`). -/
def cellPossS (P : SigProblem Label B) (K : CellCube) : Bool :=
  let pos := P.rigidRow.filter fun x => K.contains (x, true)
  !pos.isEmpty && (K.all fun e => !e.2 || decide (e.1 ∈ P.rigidRow)) &&
    (pos.all fun x => !K.contains (x, false)) && freeS P pos

/-- `K'` holds on every free cell of `r` satisfying `K`. -/
def subsumesS (P : SigProblem Label B) (r : Nat) (K K' : CellCube) :
    Bool :=
  K'.all fun e => !cellPossS P ((r, true) :: (e.1, !e.2) :: K)

/-- The rows `R`'s literals mention. -/
def litRows (R : List CellCube) : List Nat := R.flatMap (·.map (·.1))

/-- Every free cell of `r` satisfying `K` satisfies some cube of `R`:
vacuous, or one cube subsumes, or split on a row `R` mentions that `K`
leaves open. `fuel` bounds the depth; `coverS` gives it `litRows R`'s
length, enough to fix every mentioned row. Exponential in the number of
splits in the worst case (statements.md §6). -/
def coverK (P : SigProblem Label B) (r : Nat) (R : List CellCube) :
    Nat → CellCube → Bool
  | 0, _ => false
  | fuel + 1, K =>
    !cellPossS P ((r, true) :: K) || R.any (subsumesS P r K) ||
      match (litRows R).find? (fun x => !K.any (·.1 == x)) with
      | none => false
      | some x => coverK P r R fuel ((x, true) :: K) &&
          coverK P r R fuel ((x, false) :: K)

def coverS (P : SigProblem Label B) (r : Nat) (L R : List CellCube) :
    Bool :=
  L.all (coverK P r R ((litRows R).length + 1))

/-- The proposed implementation. Written-label queries reuse
`holdersOK` (a function of `D` alone); its exactness is restated
against `HasInstance`, not `consistentS`. -/
def implQ (P : SigProblem Label B) : CellQ Label :=
  ⟨fun r l => decide (l ∈ written P) && holdersOK P l [r],
   fun r s l => decide (l ∈ written P) && holdersOK P l [r, s],
   fun r s K => cellPossS P ((r, true) :: (s, true) :: K),
   coverS P⟩

end Composition.Typed.Cells
