/-
More scenarios, added after the completeness review (statements.md
§10.2), and the checks behind two claims of the prose. STATEMENTS ONLY
(`def … : Prop`); nothing is proved.
-/
import Composition.Typed.Cell.Scenarios
import Composition.Typed.ExamplesFlat
import Composition.Typed.Bridge.Examples

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-! ### Why `CellShape` is a premise (statements.md §4) -/

/-- `route`'s `thetaFree` with entries for rows 0 and 2 at cell
`[1, 2]`, which no instance occupies. -/
noncomputable def routeJunk (π : Pattern Label) : CAssign Label B :=
  ⟨(thetaFree routeP π).ty, fun r k =>
    if (r = 0 ∨ r = 2) ∧ k = .inr [1, 2] then some emptyG
    else (thetaFree routeP π).row r k⟩

/-- A generic instance within symbols, without the cell shape, at
which `route`'s accepted certificate fails (`v disjoint x`). -/
def CellShapeNeeded (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    Prop :=
  ∀ π, HasInstance (routeP : SigProblem Label B) π →
    GenericInst routeP π (routeJunk (B := B) π) ∧
    WithinC (routeP : SigProblem Label B) (routeJunk π) ∧
    ¬ CellShape (routeP : SigProblem Label B) (routeJunk π) ∧
    ¬ CellSolves (routeP : SigProblem Label B) (routeJunk π) routeCert

/-! ### Checking a certificate decides DNF tautology (statements.md §6.3) -/

/-- With no declarations, `{...r} = {...u}` under `u := ⟨r, [], R⟩`
passes iff `R` covers every cell of `r`. -/
def CheckTautology (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    Prop :=
  ∀ (r u : Nat) (xs : List Nat) (R : List CellCube), (r :: xs).Nodup →
    u ∉ r :: xs →
    (checkI (⟨[], r :: xs, [], [.eq (.record .nil [r]) (.record .nil [u])]⟩ :
        SigProblem Label B) ⟨[], [(u, .record [] [⟨r, [], R⟩])]⟩ = true ↔
      ∀ T ∈ subsets xs, R.any (cubeSat (r :: T)) = true)

/-! ### Rigid type variables: `intArmP` (N5) -/

/-- Intended: accepted (`α := {}`-free arms; `β := α`). -/
def ScIntArm (B : Type) [DecidableEq B] : Prop :=
  ∀ b : B, ValidOpen (intArmP b) ∧
    checkI (intArmP b) ⟨[(1, .rty 0)],
      [(0, .record [] []), (1, .record [(0, .rty 0)] []),
       (2, .record [(0, .base b)] []), (3, .record [] [])]⟩ = true

/-! ### `star-read` and `star-cross` (star/problems.mjs) -/

/-- Field access at `idx`: `v_i = { lab i: w_i, ...c_i }`, `w_i = Int`,
with `c_i = 3n + i`, `w_i = n + i`. -/
def readB (n : Nat) (b : B) (lab : Nat → Nat) (i : Nat) :
    List (Atom Nat B) :=
  [.eq (.tvar i) (.record (.cons (lab i) (.tvar (n + i)) .nil) [3 * n + i]),
   .eq (.tvar (n + i)) (.base b)]

def cStarR (n : Nat) (b : B) (idx : List Nat) (lab : Nat → Nat) :
    SigProblem Nat B :=
  ⟨[], 0 :: starIdx n, (cStar n b false false).D,
   (cStar n b false false).B ++ idx.flatMap (readB n b lab)⟩

/-- The star certificate, plus `w_i := Int`, `c_i := { ...r_i, ...h }`. -/
def cStarRCert (n : Nat) (b : B) (idx : List Nat) (lab : Nat → Nat) :
    CellCert Nat B :=
  ⟨(cStarCert n b false false).ty ++ idx.map (fun i => (n + i, .base b)),
   (cStarCert n b false false).row ++ idx.map fun i => (3 * n + i,
     .record [] [wholePiece (cStarR n b idx lab) i,
       wholePiece (cStarR n b idx lab) 0])⟩

/-- `star-read`: intended accepted at every `n`. -/
def ScStarRead (B : Type) [DecidableEq B] (b : B) : Prop :=
  ∀ n, checkI (cStarR n b (starIdx n) id)
    (cStarRCert n b (starIdx n) id) = true

/-- `star-cross` (`j_1.f2`; `r_1` may lack `f2`): intended refused, by
the natural certificate and by every certificate. -/
def ScStarCross (B : Type) [DecidableEq B] (b : B) : Prop :=
  ∀ n, 2 ≤ n →
    checkI (cStarR n b [1] fun _ => 2) (cStarRCert n b [1] fun _ => 2) =
      false ∧ ¬ ValidOpen (cStarR n b [1] fun _ => 2) ∧
    ∀ σ, checkI (cStarR n b [1] fun _ => 2) σ = false

/-! ### `dep`, `divide`, `divide2` (labels `a = 0`, `b = 1`, `c = 0`) -/

/-- `dep` k: `{...r_i} = {...u_i, ...t_i}`, `u_i lacks a`, `t_i lacks b`;
`r_i = i`, `u_i = k + 2i + 1`, `t_i = k + 2i + 2`, for `i < k`. -/
def depFam (k : Nat) : SigProblem Nat B :=
  ⟨[], List.range k, [], (List.range k).flatMap fun i =>
    [.eq (.record .nil [i]) (.record .nil [k + 2 * i + 1, k + 2 * i + 2]),
     .lacks (k + 2 * i + 1) 0, .lacks (k + 2 * i + 2) 1]⟩

/-- `u_i := r_i|{b}`, `t_i := r_i` without `b`. -/
def depFamCert (k : Nat) : CellCert Nat B :=
  ⟨[], (List.range k).flatMap fun i =>
    [(k + 2 * i + 1, .record [] [⟨i, [1], []⟩]),
     (k + 2 * i + 2, .record [] [⟨i, [0], [[]]⟩])]⟩

/-- `divide` m (labels `1..m`), and `divide2` m (also `u lacks c`). -/
def divideSig (m : Nat) (two : Bool) : SigProblem Nat B :=
  ⟨[], [0], [], [.eq (.record .nil [0]) (.record .nil [1, 2])] ++
    (starIdx m).map (.lacks 2) ++ (if two then [.lacks 1 0] else [])⟩

/-- `divide`: `u := r`; `divide2`: `u := r|{a_j}`, `t := r` without them. -/
def divideCert (m : Nat) (two : Bool) : CellCert Nat B :=
  if two then ⟨[], [(1, .record [] [⟨0, starIdx m, []⟩]),
      (2, .record [] [⟨0, [0], [[]]⟩])]⟩
  else ⟨[], [(1, .record [] [⟨0, 0 :: starIdx m, [[]]⟩])]⟩

/-- Intended: all accepted (the pattern-dependent written witnesses). -/
def ScDep (B : Type) [DecidableEq B] : Prop :=
  (∀ k, checkI (depFam (B := B) k) (depFamCert k) = true) ∧
  ∀ m two, checkI (divideSig (B := B) m two) (divideCert m two) = true

/-! ### Declared split, `disjoint r r`, outside the fragment -/

/-- `split` with its declaration: `route`'s division, intended accepted. -/
def ScSplitSig (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    Prop :=
  checkI (splitSig : SigProblem Label B)
    ⟨[], [(3, .record [] [⟨0, [], [[(1, false)]]⟩]),
          (4, .record [] [⟨0, [], [[(1, true)]]⟩])]⟩ = true

/-- `D = [disjoint 0 0]` empties row 0: intended accepted. -/
def ScSelfDisjoint (B : Type) [DecidableEq B] : Prop :=
  checkI (⟨[], [0], [.disjoint 0 0],
    [.lacks 0 0, .eq (.record .nil [0]) (.record .nil [])]⟩ :
      SigProblem Nat B) ⟨[], []⟩ = true

/-- Recorded incompleteness of the guard: `agreeP` (flat equation in
`D`) and `D = [ff]` are `ValidOpen` and refused by every certificate. -/
def ScOutsideFragment (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    Prop :=
  ValidOpen (agreeP : SigProblem Label B) ∧
  (∀ σ, checkI (agreeP : SigProblem Label B) σ = false) ∧
  ValidOpen (⟨[], [0], [.ff], []⟩ : SigProblem Label B) ∧
  ∀ σ, checkI (⟨[], [0], [.ff], []⟩ : SigProblem Label B) σ = false

/-! ### Rigidity and certificate validation -/

/-- Each refused: a piece of a flexible row; `rty` of a flexible type
variable; an ill-formed shadowed binding; an unused non-record row
binding. -/
def ScCertRefusals (B : Type) [DecidableEq B] (b : B) : Prop :=
  checkI (routeP : SigProblem Nat B)
      ⟨[], (routeCert (B := B)).row ++ [(9, .record [] [⟨5, [], [[]]⟩])]⟩ =
    false ∧
  checkI (intArmP b) ⟨[(1, .rty 1)], [(0, .record [] []),
      (1, .record [(0, .rty 0)] []), (2, .record [(0, .base b)] []),
      (3, .record [] [])]⟩ = false ∧
  checkI (routeP : SigProblem Nat B) ⟨[], (routeCert (B := B)).row ++
      [(3, .record [] [⟨0, [], [[]]⟩, ⟨0, [], [[]]⟩])]⟩ = false ∧
  checkI (routeP : SigProblem Nat B) ⟨[], (routeCert (B := B)).row ++
      [(9, .arrow (.record [] []) (.record [] []))]⟩ = false

end Composition.Typed.Cells
