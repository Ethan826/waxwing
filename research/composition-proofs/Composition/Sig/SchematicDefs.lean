/-
Strategy A's symbolic checker (dossier §18.39): SC2's declaration
fragment, `checkSym`, and the statements SC2-SC4 with optional SC3′.
Research model of star/schematic.mjs, not the prototype. Primary
statements use strategy A's empty cube; cube-general ones are for B,
deferred. Nothing is proved.
Prose: research/division-campaign/star/sc-statements.md.
-/
import Composition.Sig.SchematicCert

namespace Composition.Syntax

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-! ### SC2's declaration fragment -/

/-- `D` holds only `lacks` and `disjoint` atoms on declared rigid rows. -/
def LDFragment (P : SigProblem Label B) : Prop :=
  ∀ a ∈ P.D, (∃ r l, a = .lacks r l ∧ r ∈ P.rigidRow) ∨
    ∃ r s, a = .disjoint r s ∧ r ∈ P.rigidRow ∧ s ∈ P.rigidRow

def fragmentS (P : SigProblem Label B) : Bool :=
  P.D.all fun
    | .lacks r _ => decide (r ∈ P.rigidRow)
    | .disjoint r s => decide (r ∈ P.rigidRow) && decide (s ∈ P.rigidRow)
    | _ => false

/-! ### The symbolic checker -/

abbrev SRow (Label B : Type) :=
  List (Label × SchV Label B) × List (SchPiece Label)

section Check
variable (P : SigProblem Label B) (c : Cube Label) (σ : SchCert Label B)

/-- No piece of `ps` holds `l` at any pattern of the region. -/
def lackY (ps : List (SchPiece Label)) (l : Label) : Bool :=
  ps.all fun q => decide (l ∈ q.2) || !possibleS P c q.1 l

/-- Two parts never share a label; their rests are distinct and
declared disjoint. -/
def apartY (x y : SRow Label B) : Bool :=
  x.1.all (fun e =>
    !decide (e.1 ∈ y.1.map Prod.fst) && lackY P c y.2 e.1) &&
  y.1.all (fun e => lackY P c x.2 e.1) &&
  x.2.all fun q => y.2.all fun q' =>
    !decide (q.1 = q'.1) && declaredS P q.1 q'.1

def composeY (parts : List (SRow Label B)) : Option (SRow Label B) :=
  parts.foldlM (fun acc x => if apartY P c acc x
    then some (acc.1 ++ x.1, acc.2 ++ x.2) else none) ([], [])

mutual
  /-- Definedness and W3 of a certificate value, at every depth. -/
  def wfY : SchV Label B → Bool
    | .base _ => true
    | .arrow a b => wfY a && wfY b
    | .record fs ps => wfFY fs &&
      ps.all (fun q => decide (q.1 ∈ P.rigidRow)) &&
      (composeY P c (fs.map (fun e => ([e], [])) ++
        ps.map (fun q => ([], [q])))).isSome

  def wfFY : List (Label × SchV Label B) → Bool
    | [] => true
    | (_, s) :: rest => wfY s && wfFY rest
end

def certOkY : Bool :=
  σ.ty.all (fun e => wfY P c e.2) && σ.row.all fun e =>
    wfY P c e.2 && match e.2 with | .record _ _ => true | _ => false

def tyY (n : Nat) : SchV Label B :=
  if n ∈ P.rigidTy then .base (.inr (.T n))
  else (σ.ty.lookup n).getD (.record [] [])

def rowY (r : Nat) : Option (SRow Label B) :=
  if r ∈ P.rigidRow then some ([], [(r, [])]) else
  match (σ.row.lookup r).getD (.record [] []) with
  | .record fs ps => some (fs, ps)
  | _ => none

mutual
  /-- Evaluation; `none` when some composition may be undefined. -/
  def evalY : TExpr Label B → Option (SchV Label B)
    | .base b => some (.base (.inl b))
    | .arrow t u => (evalY t).bind fun a => (evalY u).map (.arrow a)
    | .tvar n => some (tyY P σ n)
    | .record fs tails => (evalFY fs).bind fun fr =>
      (tails.mapM (rowY P σ)).bind fun rs =>
        (composeY P c ((fr, []) :: rs)).map fun x => .record x.1 x.2

  def evalFY : Fields Label B → Option (List (Label × SchV Label B))
    | .nil => some []
    | .cons l t rest => (evalY t).bind fun g => (evalFY rest).bind fun r =>
      if l ∈ r.map Prod.fst then none else some ((l, g) :: r)
end

/-- A written field against pieces: one holds `l` at every pattern of
the region, with exactly that field's constant. -/
def againstY (a : SchV Label B) (ps : List (SchPiece Label)) (l : Label) :
    Bool :=
  ps.any fun q => !decide (l ∈ q.2) && mustS P c q.1 l &&
    match a with
    | .base (.inr (.A r k)) => decide (r = q.1) && decide (k = l)
    | _ => false

/-- Every piece of `xs` that may hold `l` is matched in `ys`. -/
def sameY (xs ys : List (SchPiece Label)) (l : Label) : Bool :=
  xs.all fun q => decide (l ∈ q.2) || !possibleS P c q.1 l ||
    ys.any fun q' => decide (q'.1 = q.1) && !decide (l ∈ q'.2)

def sameRests (xp yp : List (SchPiece Label)) : Bool :=
  xp.all (fun q => yp.any fun q' => decide (q.1 = q'.1)) &&
  yp.all fun q => xp.any fun q' => decide (q.1 = q'.1)

mutual
  def eqY : SchV Label B → SchV Label B → Bool
    | .base a, .base b => decide (a = b)
    | .arrow a b, .arrow a' b' => eqY a a' && eqY b b'
    | .record xf xp, .record yf yp =>
      eqFY yf yp xf && sameRests xp yp &&
      yf.all (fun e => (xf.lookup e.1).isSome ||
        againstY P c e.2 xp e.1) &&
      (written P).all fun l =>
        decide (l ∈ xf.map Prod.fst) || decide (l ∈ yf.map Prod.fst) ||
        (sameY P c xp yp l && sameY P c yp xp l)
    | _, _ => false

  def eqFY (yf : List (Label × SchV Label B)) (yp : List (SchPiece Label)) :
      List (Label × SchV Label B) → Bool
    | [] => true
    | (l, a) :: rest => (match yf.lookup l with
        | some b => eqY a b
        | none => againstY P c a yp l) && eqFY yf yp rest
end

/-- One atom of the original body. An equation needs both sides
evaluated (defined) and equal. -/
def atomY : Atom Label B → Bool
  | .eq t u => match evalY P c σ t, evalY P c σ u with
    | some a, some b => eqY P c a b
    | _, _ => false
  | .lacks r l => match rowY P σ r with
    | some x => !decide (l ∈ x.1.map Prod.fst) && lackY P c x.2 l
    | none => false
  | .disjoint r s => match rowY P σ r, rowY P σ s with
    | some x, some y => apartY P c x y
    | _, _ => false
  | .ff => false

/-- Fragment guard, certificate well-formedness, then every atom of the
original `P.B`; vacuously true on an empty region. -/
def checkSym : Bool :=
  fragmentS P && certOkY P c σ &&
    (!nonEmptyS P c || P.B.all (atomY P c σ))

end Check

/-! ### Statements (none proved) -/

/-- The four queries are exact for the region of `c`. -/
def QueriesExact (P : SigProblem Label B) (c : Cube Label) : Prop :=
  (nonEmptyS P c = true ↔ ∃ p, SchInRegion P c p) ∧
  (∀ r l, possibleS P c r l = true ↔ ∃ p, SchInRegion P c p ∧ (r, l) ∈ p) ∧
  (∀ r l, mustS P c r l = true ↔ ∀ p, SchInRegion P c p → (r, l) ∈ p) ∧
  (∀ r s l, possibleBothS P c r s l = true ↔
    ∃ p, SchInRegion P c p ∧ (r, l) ∈ p ∧ (s, l) ∈ p)

def SC2 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B, LDFragment P → QueriesExact P []

/-- For B, deferred: SC2 at every cube. -/
def SC2B (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) c, LDFragment P → QueriesExact P c

/-- The guard decides the fragment; consistency is a per-label product
(CP) and closed under removing a holder (stated for every `P`: in this
model they do not need the fragment); outside the fragment `checkSym`
is false (Unresolved). -/
def SC2Frag (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B,
    (fragmentS P = true ↔ LDFragment P) ∧
    (∀ p ∈ patterns P, consistentS P p = true ↔
      ∀ l ∈ written P, holdersOK P l ((p.filter (·.2 = l)).map (·.1))) ∧
    (∀ p q : List (Nat × Label), consistentS P p = true →
      (∀ x ∈ q, x ∈ p) → consistentS P q = true) ∧
    (fragmentS P = false → ∀ c (σ : SchCert Label B), checkSym P c σ = false)

/-- Inside the fragment, each consistent pattern is the presence of a
rigid assignment satisfying `D` (the converse is `consistent_presenceOf`,
proved, Soundness.lean). -/
def SC2Real (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B, LDFragment P → ∀ p ∈ patterns P,
    consistentS P p = true → ∃ θR : Assign Label B, Sat θR P.D ∧
      ∀ r ∈ P.rigidRow, ∀ l ∈ written P,
        presenceOf θR r l = patternOf p r l

/-- SC2Real can fail outside the fragment: `D = [ff]`. -/
def SC2Boundary : Prop :=
  let P : SigProblem Nat Nat := ⟨[], [0], [.ff], [.lacks 0 0]⟩
  ¬ LDFragment P ∧ [] ∈ patterns P ∧ consistentS P [] = true ∧
    ¬ ∃ θR : Assign Nat Nat, Sat θR P.D

/-- And with an equation in `D` forcing row 0 empty. -/
def SC2Boundary' : Prop :=
  let P : SigProblem Nat Nat :=
    ⟨[], [0], [.eq (.record .nil [0]) (.record .nil [])], [.lacks 0 0]⟩
  ¬ LDFragment P ∧ [(0, 0)] ∈ patterns P ∧ consistentS P [(0, 0)] = true ∧
    ∀ θR : Assign Nat Nat, Sat θR P.D → presenceOf θR 0 0 = false

/-- SC3, for every (untrusted) certificate. -/
def SC3 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) (σ : SchCert Label B), checkSym P [] σ = true →
    ∀ p, SchInRegion P [] p → checkCert P p (instCert P p σ) = true

/-- For B, deferred: SC3 over a cube's region. -/
def SC3B (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) (c : Cube Label) (σ : SchCert Label B),
    checkSym P c σ = true →
      ∀ p, SchInRegion P c p → checkCert P p (instCert P p σ) = true

def SC4 (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) (σ : SchCert Label B),
    checkSym P [] σ = true → Accepts P ∧ ValidAll P ∧ ValidFin P

/-- Optional: the atom loop is exact, given the guard and a well-formed
certificate. -/
def SC3' (Label B : Type) [DecidableEq Label] [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) (σ : SchCert Label B),
    fragmentS P = true → certOkY P [] σ = true →
    (∀ p, SchInRegion P [] p → checkCert P p (instCert P p σ) = true) →
      checkSym P [] σ = true

end Composition.Syntax
