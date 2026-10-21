/-
The P-1 bridge (dossier §18.31): STATEMENTS ONLY, for the author's
review. Every claim below is a `Prop` definition; none is proved, and
none is assumed by any theorem. Prose, intended instances, the
restrictions table and the review record:
research/division-campaign/bridge/statements.md.

Option B's validity is `ValidOpen`: `ValidFin` at every injective
extension of the bases. An extension renames bases only. Labels,
variables, rigid lists, arrows, records and row structure are
unchanged, and written bases keep their identity (`mapBase`).
`ValidAtoms` is the same at one fixed atom supply, `B ⊕ Nat`.

The bridge replaces `Fresh`'s injection of every `CConst` into `B` by
an injection of the finitely many constants a generic instance uses,
into an extension of `B` (`FreshBasesOn`, `D3bCompleteOn`). Existence
(`D3bExists`, open) and completeness are kept apart; the composition
is an implication from `D3bExists` (`BridgeComposition`).
-/
import Composition.Typed.ExamplesValid
import Composition.Typed.ExamplesFlat
import Composition.TypedAttack.ShapeSplitCore

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B' : Type} [DecidableEq Label]

/-! ### Extensions: renaming bases -/

mutual
  /-- Rename the bases written in an expression. -/
  def mapBaseT (f : B → B') : TExpr Label B → TExpr Label B'
    | .base b => .base (f b)
    | .arrow t u => .arrow (mapBaseT f t) (mapBaseT f u)
    | .tvar n => .tvar n
    | .record fs tails => .record (mapBaseF f fs) tails

  def mapBaseF (f : B → B') : Fields Label B → Fields Label B'
    | .nil => .nil
    | .cons l t rest => .cons l (mapBaseT f t) (mapBaseF f rest)
end

def mapBaseAtom (f : B → B') : Atom Label B → Atom Label B'
  | .eq t u => .eq (mapBaseT f t) (mapBaseT f u)
  | .lacks r l => .lacks r l
  | .disjoint r s => .disjoint r s
  | .ff => .ff

/-- The same signature problem with its written bases renamed along
`f`: same rigid lists, labels, variables and atom shapes. -/
def _root_.Composition.Syntax.SigProblem.mapBase (f : B → B')
    (P : SigProblem Label B) : SigProblem Label B' :=
  ⟨P.rigidTy, P.rigidRow, P.D.map (mapBaseAtom f), P.B.map (mapBaseAtom f)⟩

mutual
  /-- Rename the bases of a ground value, at every depth. -/
  def mapG (f : B → B') : G Label B → G Label B'
    | .base b => .base (f b)
    | .arrow a c => .arrow (mapG f a) (mapG f c)
    | .record r => .record fun k => mapGO f (r k)

  def mapGO (f : B → B') : Option (G Label B) → Option (G Label B')
    | none => none
    | some g => some (mapG f g)
end

def mapAssign (f : B → B') (θ : Assign Label B) : Assign Label B' :=
  ⟨fun n => mapG f (θ.ty n), fun r k => mapGO f (θ.row r k)⟩

/-- A generic assignment carried along `j`: problem bases renamed,
constants and cell labels kept. -/
def mapC (j : B → B') (θ : CAssign Label B) : CAssign Label B' :=
  mapAssign (Sum.map j id) θ

/-! ### Option B's validity -/

/-- Valid at every injective extension of the bases (option B). -/
def ValidOpen (P : SigProblem Label B) : Prop :=
  ∀ (B₁ : Type) (i : B → B₁), Function.Injective i →
    ValidFin (P.mapBase i)

/-- Valid at one fixed supply of atoms. -/
def ValidAtoms (P : SigProblem Label B) : Prop :=
  ValidFin (P.mapBase (Sum.inl : B → B ⊕ Nat))

/-! ### Supports and the finite freshness premise -/

mutual
  /-- Every base in the value satisfies `s`, at every depth. -/
  def BasesWithin (s : B → Prop) : G Label B → Prop
    | .base b => s b
    | .arrow a c => BasesWithin s a ∧ BasesWithin s c
    | .record f => ∀ k, BasesWithinO s (f k)

  def BasesWithinO (s : B → Prop) : Option (G Label B) → Prop
    | none => True
    | some g => BasesWithin s g
end

/-- A generic base is a problem base or a constant listed in `U`. -/
def constIn (U : List (CConst Label)) : CB Label B → Prop
  | .inl _ => True
  | .inr c => c ∈ U

/-- The rigid values of `θs` use only the constants in `U`. -/
def ConstsInC (P : SigProblem Label B) (U : List (CConst Label))
    (θs : CAssign Label B) : Prop :=
  (∀ n ∈ P.rigidTy, BasesWithin (constIn U) (θs.ty n)) ∧
    ∀ r ∈ P.rigidRow, BasesWithin (constIn U) (.record (θs.row r))

/-- The label half of `Fresh`, unchanged. -/
def FreshLabels (P : SigProblem Label B) (z : Cell → Label) : Prop :=
  (∀ S S', z S = z S' → S = S') ∧ ∀ S, z S ∉ written P

/-- The base half of `Fresh`, relative to the constants in `U` and to
an extension `j`: `e` is injective on `U` and misses the images of the
written bases. Nothing is required of `e` off `U`. -/
def FreshBasesOn (P : SigProblem Label B) (j : B → B')
    (U : List (CConst Label)) (e : CConst Label → B') : Prop :=
  (∀ c ∈ U, ∀ c' ∈ U, e c = e c' → c = c') ∧
    ∀ c ∈ U, ∀ b ∈ basesOf P, e c ≠ j b

/-- Generic instances within the problem's symbols, for some instance
of every pattern that has one. -/
def D3bExistsWithin : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label), Scoped P →
    HasInstance P π → ∃ θs, GenericInst P π θs ∧ WithinC P θs

/-! ### Building blocks (proposed, unproved) -/

/-- E1. The identity extension changes nothing. -/
def MapBaseId : Prop :=
  ∀ P : SigProblem Label B, P.mapBase id = P

/-- E2. Positivity: renaming bases by any function preserves
satisfaction. -/
def SatMapBase : Prop :=
  ∀ (B₁ : Type) (f : B → B₁) (θ : Assign Label B) (C : Problem Label B),
    Sat θ C → Sat (mapAssign f θ) (C.map (mapBaseAtom f))

/-- E3. A finite value uses finitely many bases. -/
def FinSupport : Prop :=
  ∀ g : G Label B, FinG g → ∃ bs : List B, BasesWithin (· ∈ bs) g

mutual
  /-- Replace each base by a value, at every depth. -/
  def substBase (s : B → G Label B') : G Label B → G Label B'
    | .base b => s b
    | .arrow a c => .arrow (substBase s a) (substBase s c)
    | .record r => .record fun k => substBaseO s (r k)

  def substBaseO (s : B → G Label B') :
      Option (G Label B) → Option (G Label B')
    | none => none
    | some g => some (substBase s g)
end

def substAssign (s : B → G Label B') (θ : Assign Label B) :
    Assign Label B' :=
  ⟨fun n => substBase s (θ.ty n), fun r k => substBaseO s (θ.row r k)⟩

/-- E2′. Positivity for value substitutions: replacing bases by values
preserves satisfaction of `P`'s atoms, provided every written base `b`
becomes the base `f b`. -/
def SatSubstBase : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (f : B → B₁)
    (s : B → G Label B₁) (θ : Assign Label B) (C : Problem Label B),
    (∀ b ∈ basesOf P, s b = .base (f b)) → (∀ a ∈ C, a ∈ P.D ++ P.B) →
    Sat θ C → Sat (substAssign s θ) (C.map (mapBaseAtom f))

/-- E4. Renamings compose. -/
def MapBaseComp : Prop :=
  ∀ (P : SigProblem Label B) (B₁ B₂ : Type) (f : B → B₁) (g : B₁ → B₂),
    (P.mapBase f).mapBase g = P.mapBase (g ∘ f)

/-- E5. Renaming keeps the written labels, scope, and maps the written
bases. -/
def MapBaseSyntax : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (f : B → B₁),
    written (P.mapBase f) = written P ∧
    basesOf (P.mapBase f) = (basesOf P).map f ∧
    (Scoped (P.mapBase f) ↔ Scoped P)

/-- E6. Renaming commutes with reading the problem generically. -/
def MapBaseClift : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (f : B → B₁),
    cliftP (P.mapBase f) = (cliftP P).mapBase (Sum.map f id)

/-! ### B0, B1: the two definitions of option B -/

/-- B0 (memo C1). Option B's validity implies closed validity. -/
def OpenToFin : Prop :=
  ∀ P : SigProblem Label B, ValidOpen P → ValidFin P

/-- B1a. -/
def OpenToAtoms : Prop :=
  ∀ P : SigProblem Label B, ValidOpen P → ValidAtoms P

/-- B1b. -/
def AtomsToOpen : Prop :=
  ∀ P : SigProblem Label B, ValidAtoms P → ValidOpen P

/-- B1 (memo C3). -/
def AtomsIffOpen : Prop :=
  ∀ P : SigProblem Label B, ValidAtoms P ↔ ValidOpen P

/-- BS. Stability under unrelated additions: an injective extension
neither gains nor loses option-B validity. -/
def OpenExtensionStable : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (j : B → B₁),
    Function.Injective j → (ValidOpen P ↔ ValidOpen (P.mapBase j))

/-! ### B2: `d3bComplete` with finitely many fresh bases -/

/-- B2f. A finite generic instance uses finitely many constants. -/
def ConstsFinite : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B), RigidFinC P θs →
    ∃ U : List (CConst Label), ConstsInC P U θs

/-- B2c. `Fresh` gives the new premises at the identity extension, for
every `U`: B2 generalizes `D3bComplete`'s premise. -/
def FreshGivesFreshOn : Prop :=
  ∀ (P : SigProblem Label B) (z : Cell → Label) (e : CConst Label → B),
    Fresh P z e → FreshLabels P z ∧ ∀ U, FreshBasesOn P id U e

/-- B2. `D3bComplete` with `Fresh`'s base half replaced by fresh bases
for the constants `θs` uses, in an injective extension `j`; validity
is read at the extension. Other premises as in `D3bComplete`. -/
def D3bCompleteOn : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (B₁ : Type) (j : B → B₁) (z : Cell → Label) (e : CConst Label → B₁)
    (U : List (CConst Label)),
    Function.Injective j → FreshLabels P z → FreshBasesOn P j U e →
    ConstsInC P U θs → WithinC P θs → GenericInst P π θs →
      (ValidIn (P.mapBase j) π → SolvableAt P θs) ∧
      (ValidFinIn (P.mapBase j) π → SolvableFinAt P θs)

/-- B2g. B2 gives back `D3bComplete`, both halves (with B2c, B2f, E1). -/
def CompleteOnGivesComplete : Prop :=
  D3bCompleteOn (Label := Label) (B := B) →
    D3bComplete (Label := Label) (B := B)

/-! ### B3: completeness under option B -/

/-- B3a. Completeness at a given generic instance, under option B. No
existence claim. -/
def D3bCompleteOpen : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (z : Cell → Label), FreshLabels P z → WithinC P θs →
    GenericInst P π θs → ValidOpen P → SolvableFinAt P θs

/-- W. Per instance: a generic instance can be trimmed to the problem's
symbols (delete unwritten `inl` labels; replace unwritten problem bases
by constants unused in the rigid values). -/
def WithinTrim : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B),
    GenericInst P π θs → ∃ θs', GenericInst P π θs' ∧ WithinC P θs'

/-- W, global form (follows from `WithinTrim`). -/
def ExistsToWithin : Prop :=
  D3bExists (Label := Label) (B := B) →
    D3bExistsWithin (Label := Label) (B := B)

/-- Existence within symbols, for one problem. -/
def ExistsWithinAt (P : SigProblem Label B) : Prop :=
  ∀ π, HasInstance P π → ∃ θs, GenericInst P π θs ∧ WithinC P θs

/-- B3, per problem: existence for this problem, with option-B
validity, gives a solvable generic instance per pattern. -/
def D3bOpenCompleteAt : Prop :=
  ∀ P : SigProblem Label B, (∃ z, FreshLabels P z) → ExistsWithinAt P →
    ValidOpen P → ∀ π, HasInstance P π →
      ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs

/-- B3e. Unconditional on the equation-free fragment (existence there is
`d3bEqFree`, proved). -/
def D3bOpenCompleteEqFree : Prop :=
  ∀ P : SigProblem Label B, Scoped P → EqFree P →
    (∃ z, FreshLabels P z) → ValidOpen P → ∀ π, HasInstance P π →
      SolvableFinAt P (thetaFree P π)

/-- B3f. Unconditional on the flat fragment (`d3bFlat`, proved). -/
def D3bOpenCompleteFlat : Prop :=
  ∀ P : SigProblem Label B, Scoped P → FlatD P →
    (∃ z, FreshLabels P z) → ValidOpen P → ∀ π, HasInstance P π →
      SolvableFinAt P (thetaFlat P π)

/-- B3's conclusion: every option-B-valid problem has, for each pattern
with an instance, a generic instance within its symbols at which the
body is solvable. -/
def D3bOpenComplete : Prop :=
  ∀ P : SigProblem Label B, Scoped P → (∃ z, FreshLabels P z) →
    ValidOpen P → ∀ π, HasInstance P π →
      ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs

/-- B3. The composition, conditional on the open existence claim. -/
def BridgeComposition : Prop :=
  D3bExists (Label := Label) (B := B) →
    D3bOpenComplete (Label := Label) (B := B)

/-! ### B4, B5: soundness for option B (for a decision procedure) -/

/-- B4f. A generic instance over `B` covers every finite instance over
any injective extension. -/
def GenericInstExtFin : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (B₁ : Type) (j : B → B₁), Function.Injective j →
    GenericInst P π θs → ∀ θR : Assign Label B₁,
      RigidFin (P.mapBase j) θR → Sat θR (P.mapBase j).D →
      InPattern (P.mapBase j) π θR → Covers (P.mapBase j) (mapC j θs) θR

/-- B4. The same for every instance, finite or not: a generic instance
stays generic over any injective extension. Stronger than B5 needs. -/
def GenericInstExt : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (B₁ : Type) (j : B → B₁), Function.Injective j →
    GenericInst P π θs → GenericInst (P.mapBase j) π (mapC j θs)

/-- B5. Solved generic instances for every pattern give option-B
validity. -/
def D3bSoundOpen : Prop :=
  ∀ P : SigProblem Label B,
    (∀ π, HasInstance P π → ∃ θs, GenericInst P π θs ∧ SolvableFinAt P θs) →
    ValidOpen P

/-- C. The characterization (P-3): for a problem with existence within
symbols, option-B validity is exactly solvability at generic instances.
`←` is B5; `→` is B3 per problem. -/
def OpenCharacterization : Prop :=
  ∀ P : SigProblem Label B, Scoped P → (∃ z, FreshLabels P z) →
    ExistsWithinAt P →
      (ValidOpen P ↔ ∀ π, HasInstance P π →
        ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs)

/-! ### Equivariance: checking is stable under extension -/

/-- BS-c1. Solvability at a generic instance survives renaming. -/
def SolvableMapBase : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B) (B₁ : Type)
    (j : B → B₁), Function.Injective j →
    (SolvableFinAt P θs ↔ SolvableFinAt (P.mapBase j) (mapC j θs))

/-- BS-c2. The explicit equation-free instance commutes with renaming.
(`thetaFlat` and `thetaStar` are not stated: `thetaFlat` is semantic
over instances at `B`.) -/
def ThetaFreeMapBase : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (B₁ : Type)
    (j : B → B₁),
    thetaFree (P.mapBase j) π = mapC j (thetaFree P π)

/-! ### Intended instances and the closed boundary -/

/-- N1. `shape-split` is closed-valid over `Unit` and not option-B
valid. -/
def ShapeSplitSeparates : Prop :=
  ValidFin (TypedAttack.shapeSplit () : SigProblem Nat Unit) ∧
    ¬ ValidOpen (TypedAttack.shapeSplit () : SigProblem Nat Unit)

/-- N2. `route` is option-B valid, at every base type. -/
def RouteOpen : Prop := ValidOpen (routeP : SigProblem Label B)

/-- N2'. The flat-equation example is option-B valid. -/
def AgreeOpen : Prop := ValidOpen (agreeP : SigProblem Label B)

/-- N3 (P-3 boundary). D3b completeness fails for closed validity: at
`shape-split` over `Unit`, the explicit generic instance is within the
problem's symbols, the problem is closed-valid in its one pattern, and
the body is not solvable there. -/
def ClosedBoundary : Prop :=
  let P : SigProblem Nat Unit := TypedAttack.shapeSplit ()
  let π : Pattern Nat := fun _ _ => false
  GenericInst P π (thetaFree P π) ∧ WithinC P (thetaFree P π) ∧
    ValidFinIn P π ∧ ¬ SolvableFinAt P (thetaFree P π)

/-- N4. B2's premises are jointly inhabited at `route`, extension
`inl`, constants realized by `inr`. -/
def RouteFreshOn : Prop :=
  ∀ π : Pattern Nat, ∃ (z : Cell → Nat) (U : List (CConst Nat)),
    FreshLabels (routeP : SigProblem Nat B) z ∧
    FreshBasesOn (routeP : SigProblem Nat B)
      (Sum.inl : B → B ⊕ CConst Nat) U Sum.inr ∧
    ConstsInC (routeP : SigProblem Nat B) U (thetaFree routeP π) ∧
    WithinC (routeP : SigProblem Nat B) (thetaFree routeP π) ∧
    GenericInst (routeP : SigProblem Nat B) π (thetaFree routeP π)

/-- A written base and a rigid type variable: `∀ α. ∃ u1 u2 m1 m2 β.
{ ...u1, ...u2 } = { f: α }, { ...u1, ...m1 } = { f: b },
{ ...u2, ...m2 } = { f: β }`. The `b` arm is not exhaustive; the
`β` arm takes every α, atoms included. Label `f` = 0; rows `u1 u2 m1
m2` = 0-3; `α` = 0 (rigid), `β` = 1. -/
def intArmP (b : B) : SigProblem Nat B :=
  ⟨[0], [], [],
   [.eq (.record .nil [0, 1]) (.record (.cons 0 (.tvar 0) .nil) []),
    .eq (.record .nil [0, 2]) (.record (.cons 0 (.base b) .nil) []),
    .eq (.record .nil [1, 3]) (.record (.cons 0 (.tvar 1) .nil) [])]⟩

/-- N5. `intArmP` is option-B valid: written base kept, α may be an
atom. -/
def IntArmOpen : Prop := ∀ b : B, ValidOpen (intArmP b)

/-- N6. B2's premises with a written base (`basesOf ≠ []`), so the
disjointness conjunct of `FreshBasesOn` is exercised. -/
def IntArmFreshOn : Prop :=
  ∀ (b : B) (π : Pattern Nat), ∃ (z : Cell → Nat) (U : List (CConst Nat)),
    FreshLabels (intArmP b) z ∧
    FreshBasesOn (intArmP b) (Sum.inl : B → B ⊕ CConst Nat) U Sum.inr ∧
    ConstsInC (intArmP b) U (thetaFree (intArmP b) π) ∧
    WithinC (intArmP b) (thetaFree (intArmP b) π) ∧
    GenericInst (intArmP b) π (thetaFree (intArmP b) π)

end Composition.Typed
