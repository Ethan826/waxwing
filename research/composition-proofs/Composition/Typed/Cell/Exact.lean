/-
Region-query statements for the cell checker (dossier §18.51 item 4).
STATEMENTS ONLY (`def … : Prop`); nothing is proved. Soundness of the
proposed queries needs no fragment (`ImplSound`, Cell/Statements.lean);
exactness needs `LDFragment`, so that the region is a product over
written labels and every free cell is occupied in some instance.
-/
import Composition.Typed.Cell.Statements

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-! ### Exactness of the cell computations, for every problem -/

/-- QX1. `freeS` computes `FreeCell`. -/
def FreeSIff : Prop :=
  ∀ (P : SigProblem Label B) (S : Cell), freeS P S = true ↔ FreeCell P S

/-- QX2. `cellPossS` is exact for a cube with a positive literal. -/
def CellPossExact : Prop :=
  ∀ (P : SigProblem Label B) (K : CellCube), (∃ x, (x, true) ∈ K) →
    (cellPossS P K = true ↔
      ∃ S ∈ cellCands P, FreeCell P S ∧ cubeSat S K = true)

/-- QX3. `coverS` is exact over the free candidate cells of `r`. -/
def CoverExact : Prop :=
  ∀ (P : SigProblem Label B) (r : Nat) (L R : List CellCube),
    r ∈ P.rigidRow →
    (coverS P r L R = true ↔ ∀ S ∈ cellCands P, FreeCell P S → r ∈ S →
      L.any (cubeSat S) = true → R.any (cubeSat S) = true)

/-- QX4. The reduction behind "no efficient exact form" (statements.md
§6): with no declarations, covering the whole of `r` is tautology of
`R` over the other rows. -/
def CoverTautology : Prop :=
  ∀ (r : Nat) (xs : List Nat) (R : List CellCube), (r :: xs).Nodup →
    let P : SigProblem Label B := ⟨[], r :: xs, [], []⟩
    (coverS P r [[]] R = true ↔
      ∀ T ∈ subsets xs, R.any (cubeSat (r :: T)) = true)

/-! ### Exactness over the region, on the fragment -/

/-- QR1. `possW` is exact. -/
def PossWExact : Prop :=
  ∀ (P : SigProblem Label B) (r : Nat) (l : Label), LDFragment P →
    r ∈ P.rigidRow →
    ((implQ P).possW r l = true ↔
      ∃ θs, InCellRegion P θs ∧ θs.row r (.inl l) ≠ none)

/-- QR2. `possBoth` is exact (the old `possibleBoth`, now needed: pieces
need not carry a whole rest, so `declared` no longer rules out a shared
written label). -/
def PossBothExact : Prop :=
  ∀ (P : SigProblem Label B) (r s : Nat) (l : Label), LDFragment P →
    r ∈ P.rigidRow → s ∈ P.rigidRow →
    ((implQ P).possBoth r s l = true ↔ ∃ θs, InCellRegion P θs ∧
      θs.row r (.inl l) ≠ none ∧ θs.row s (.inl l) ≠ none)

/-- QR3. `cellBoth` is exact. -/
def CellBothExact : Prop :=
  ∀ (P : SigProblem Label B) (r s : Nat) (K : CellCube), LDFragment P →
    r ∈ P.rigidRow → s ∈ P.rigidRow →
    ((implQ P).cellBoth r s K = true ↔ ∃ θs, InCellRegion P θs ∧
      ∃ S, cubeSat S K = true ∧ θs.row r (.inr S) ≠ none ∧
        θs.row s (.inr S) ≠ none)

/-- QR4. `cover` is exact. -/
def CoverRegionExact : Prop :=
  ∀ (P : SigProblem Label B) (r : Nat) (L R : List CellCube),
    LDFragment P → r ∈ P.rigidRow →
    ((implQ P).cover r L R = true ↔ ∀ θs, InCellRegion P θs → ∀ S,
      θs.row r (.inr S) ≠ none → L.any (cubeSat S) = true →
        R.any (cubeSat S) = true)

/-- QR5. The fragment's region is never empty, and the two queries the
old checker also used, `nonEmpty` and `must`, are constant on it: a
written label is never forced present, so neither is asked. -/
def RegionTrivialities : Prop :=
  ∀ P : SigProblem Label B, LDFragment P →
    (∃ θs, InCellRegion P θs) ∧
    ∀ r ∈ P.rigidRow, ∀ l, ∃ θs, InCellRegion P θs ∧
      θs.row r (.inl l) = none

end Composition.Typed.Cells
