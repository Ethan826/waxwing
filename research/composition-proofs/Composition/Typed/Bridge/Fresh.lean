/-
The P-1 bridge, statements only: finite freshness. `FreshBasesOn`
injects only the constants a generic instance uses (`ConstsInC`) into
an extension of `B`, in place of `Fresh`'s base half. B2f, B2c, B2
(`D3bCompleteOn`) and B2g.
-/
import Composition.Typed.Bridge.Extension
import Composition.Typed.Defs

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B' : Type} [DecidableEq Label]

/-! ### The finite freshness premise -/

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

end Composition.Typed
