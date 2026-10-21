/-
Acceptance scenarios for the cell checker (dossier §18.51 item 5), with
intended verdicts. STATEMENTS ONLY (`def … : Prop`); nothing is proved.
The universal refusals (`∀ σ`) are what CM-impl and the problem's
invalidity would give; the single-certificate refusals check that the
refusal happens where intended. Guards stay deferred: `divide5` is the
recorded limitation.
-/
import Composition.Typed.Cell.Statements
import Composition.Typed.ExamplesValid
import Composition.TypedAttack.ShapeSplit

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- The checker with the proposed queries. -/
def checkI (P : SigProblem Label B) (σ : CellCert Label B) : Bool :=
  cellCheck P (implQ P) σ

/-! ### `route`: outside `Accepts`, inside `ValidOpen` -/

/-- `u := r` outside `s`, `v := r` inside `s`, `w := s`, `x := t`. -/
def routeCert : CellCert Label B :=
  ⟨[], [(3, .record [] [⟨0, [], [[(1, false)]]⟩]),
        (4, .record [] [⟨0, [], [[(1, true)]]⟩]),
        (5, .record [] [⟨1, [], [[]]⟩]), (6, .record [] [⟨2, [], [[]]⟩])]⟩

/-- Intended: accepted. -/
def ScRoute (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  checkI (routeP : SigProblem Label B) routeCert = true

/-- A broken certificate for a valid problem: `u := r` overlaps `v`. -/
def routeBroken : CellCert Label B :=
  ⟨[], [(3, .record [] [⟨0, [], [[]]⟩]),
        (4, .record [] [⟨0, [], [[(1, true)]]⟩]),
        (5, .record [] [⟨1, [], [[]]⟩]), (6, .record [] [⟨2, [], [[]]⟩])]⟩

/-- Intended: refused. -/
def ScBroken (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  checkI (routeP : SigProblem Label B) routeBroken = false

/-! ### `star` n (star/problems.mjs): hub `h = 0`, rows `r_i = i`, label
`f_i = i`; flexible rows `a_i = n + i`, `b_i = 2n + i`; type variables
`v_i = i`. `unl`: drop `h lacks f_n`; `und`: drop `h disjoint r_n`. -/

def starIdx (n : Nat) : List Nat := (List.range n).map (· + 1)

def starD (n : Nat) (unl und : Bool) (i : Nat) : List (Atom Nat B) :=
  (if und && i == n then [] else [.disjoint 0 i]) ++
  (if unl && i == n then [] else [.lacks 0 i]) ++ [.lacks i i]

def starB (n : Nat) (b : B) (i : Nat) : List (Atom Nat B) :=
  [.eq (.record (.cons i (.base b) .nil) [i]) (.record .nil [n + i]),
   .eq (.record .nil [0]) (.record .nil [2 * n + i]),
   .disjoint (n + i) (2 * n + i),
   .eq (.tvar i) (.record .nil [n + i, 2 * n + i])]

def cStar (n : Nat) (b : B) (unl und : Bool) : SigProblem Nat B :=
  ⟨[], 0 :: starIdx n, (starIdx n).flatMap (starD n unl und),
   (starIdx n).flatMap (starB n b)⟩

/-- `a_i := { f_i: Int, ...r_i }`, `b_i := { ...h }`, `v_i := a_i ⊎ b_i`. -/
def cStarCert (n : Nat) (b : B) (unl und : Bool) : CellCert Nat B :=
  ⟨(starIdx n).map (fun i => (i, .record [(i, .base b)]
      [wholePiece (cStar n b unl und) i, wholePiece (cStar n b unl und) 0])),
   (starIdx n).flatMap fun i =>
     [(n + i, .record [(i, .base b)] [wholePiece (cStar n b unl und) i]),
      (2 * n + i, .record [] [wholePiece (cStar n b unl und) 0])]⟩

/-- Intended: accepted at every `n` (in particular `n = 1, 2, 3`). -/
def ScStar (B : Type) [DecidableEq B] (b : B) : Prop :=
  ∀ n, checkI (cStar n b false false)
    (cStarCert n b false false) = true

/-- Intended: refused, by the same certificate (`h` may hold `f_n`) and
by every certificate (the problem is not `ValidOpen`). -/
def ScStarUnlacked (B : Type) [DecidableEq B] (b : B) : Prop :=
  ∀ n, 1 ≤ n →
    checkI (cStar n b true false)
      (cStarCert n b true false) = false ∧
    ¬ ValidOpen (cStar n b true false) ∧
    ∀ σ, checkI (cStar n b true false) σ = false

/-- Intended: refused (`h` and `r_n` may share an unwritten label). -/
def ScStarUndeclared (B : Type) [DecidableEq B] (b : B) : Prop :=
  ∀ n, 1 ≤ n →
    checkI (cStar n b false true)
      (cStarCert n b false true) = false ∧
    ¬ ValidOpen (cStar n b false true) ∧
    ∀ σ, checkI (cStar n b false true) σ = false

/-! ### `divide3` and `divide5` (Sig/ProjectionDefs.lean) -/

/-- Option C's `sigma3` through `ofProjPiece`: `u := r|as`, `t := r`'s
rest (every cell of `r`). -/
def divide3Cert (as : List Label) : CellCert Label B :=
  ⟨[], [(2, .record [] [ofProjPiece ⟨0, as, [], false⟩]),
        (3, .record [] [ofProjPiece ⟨0, [], [], true⟩])]⟩

/-- Intended: accepted, for every list of labels. -/
def ScDivide3 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ as : List Label, checkI (divide3Sig (B := B) as)
    (divide3Cert as) = true

/-- Recorded limitation, guards deferred: `divide5` is valid (argued in
§18.47, unchecked) and no guard-free cell certificate passes. -/
def ScDivide5 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ as : List Label, as ≠ [] →
    ValidOpen (divide5Sig (B := B) as) ∧
    ∀ σ, checkI (divide5Sig (B := B) as) σ = false

/-! ### Negative controls -/

/-- `shapeSplit ()`: `ValidFin` over `Unit`, not `ValidOpen` (N1).
Intended: refused by every certificate. -/
def ScShapeSplit : Prop :=
  ∀ σ : CellCert Nat Unit,
    checkI (TypedAttack.shapeSplit ()) σ = false

/-- `split` without its declaration (`splitFree`). Intended: refused by
`route`'s division and by every certificate. -/
def ScSplitFree (B : Type) [DecidableEq B] : Prop :=
  checkI (splitFree : SigProblem Nat B)
      ⟨[], [(3, .record [] [⟨0, [], [[(1, false)]]⟩]),
            (4, .record [] [⟨0, [], [[(1, true)]]⟩])]⟩ = false ∧
    ∀ σ, checkI (splitFree : SigProblem Nat B) σ = false

end Composition.Typed.Cells
