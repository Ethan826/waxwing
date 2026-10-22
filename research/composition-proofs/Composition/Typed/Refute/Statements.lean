/-
Design stream CX (dossier §18.66), statements only: refuting a
signature by a checked counter-instance. A ground substitution `ρ` of
the rigid variables names a finite rigid assignment `θR`; if `θR`
satisfies `D` and the body with `ρ` applied is unsatisfiable
(`decideCall` false), the signature is not `ValidOpen`. Every claim is
a `Prop` definition; none is proved. Prose, intended truth status and
review questions: research/division-campaign/refute/statements.md.
-/
import Composition.Typed.Bridge.Valid
import Composition.Unify.Decider

namespace Composition.Typed.Refute

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-! ### Ground substitutions and what they denote -/

/-- A ground, evaluable type expression: no type variable and, at every
depth, no row tail and no repeated label (`wfT` forbids tails). -/
def GroundT (t : TExpr Label B) : Prop :=
  wfT t = true ∧ tyVarsT t = []

/-- Ground, evaluable written fields: a closed record's fields. -/
def GroundF (fs : Fields Label B) : Prop :=
  GroundT (.record fs [])

/-- `ρ` binds exactly the rigid variables of `P`, each to a ground
expression (a row to ground fields and no tail), and denotes `θR` on
them. Bindings of flexible variables are forbidden: they would fix a
choice that `ValidOpen` leaves to the existential side. -/
def Denotes (P : SigProblem Label B) (ρ : Subst Label B)
    (θR : Assign Label B) : Prop :=
  (∀ p ∈ ρ.ty, p.1 ∈ P.rigidTy) ∧ (∀ p ∈ ρ.row, p.1 ∈ P.rigidRow) ∧
  (∀ n ∈ P.rigidTy, ∃ t, ρ.ty.lookup n = some t ∧ GroundT t ∧
    evalT θR t = some (θR.ty n)) ∧
  (∀ r ∈ P.rigidRow, ∃ fs, ρ.row.lookup r = some (fs, []) ∧ GroundF fs ∧
    evalF θR fs = some (θR.row r))

/-- `ValidFin`'s finiteness premise on the rigid part of `θR`. -/
def RigidFin (P : SigProblem Label B) (θR : Assign Label B) : Prop :=
  (∀ n ∈ P.rigidTy, FinG (θR.ty n)) ∧
    ∀ r ∈ P.rigidRow, FinG (.record (θR.row r))

/-- CX-D1. What a ground substitution denotes is finite at every
depth. -/
def DenotesFin : Prop :=
  ∀ (P : SigProblem Label B) (ρ : Subst Label B) (θR : Assign Label B),
    Denotes P ρ θR → RigidFin P θR

/-- CX-D2. Conversely every rigid assignment finite at every depth is
denoted by some ground substitution (completeness side only). -/
def FinDenotable : Prop :=
  ∀ (P : SigProblem Label B) (θR : Assign Label B),
    RigidFin P θR → ∃ ρ : Subst Label B, Denotes P ρ θR

/-! ### The substitution lemma -/

/-- CX-S. Applying `ρ` to a problem does not change its truth under
the combined assignment: rigid variables read from `θR` (which `ρ`
denotes), flexible ones from `θF`. The substituted problem mentions
only flexible variables, so `θF` alone reads it. CX needs `→`; the
completeness side needs `←`. -/
def SubstSat : Prop :=
  ∀ (P : SigProblem Label B) (ρ : Subst Label B) (θR θF : Assign Label B)
    (C : Problem Label B), Denotes P ρ θR →
    (Sat (combine P θR θF) C ↔ Sat θF (substProblem ρ C))

/-- CX-FM. A satisfiable problem has a solution finite at every depth
(the `ValidFin` witness side). -/
def SatFin : Prop :=
  ∀ C : Problem Label B, Satisfiable C → ∃ θ, FinAssign θ ∧ Sat θ C

/-! ### CX: refutation at a counter-instance -/

/-- The counter-instance: over bases `B₁` (with decidable equality, for
`decideCall`), `ρ` denotes `θR`, `θR` satisfies the renamed `D`, and
the renamed body with `ρ` applied is unsatisfiable. -/
def CounterAt {B₁ : Type} [DecidableEq B₁] (P : SigProblem Label B)
    (i : B → B₁) (ρ : Subst Label B₁) (θR : Assign Label B₁) : Prop :=
  Denotes (P.mapBase i) ρ θR ∧ Sat θR (P.mapBase i).D ∧
    decideCall (substProblem ρ (P.mapBase i).B) = false

/-- CX (requirements.md §4.4). A counter-instance over an injective
extension of the bases refutes option-B validity. -/
def CX : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) [DecidableEq B₁] (i : B → B₁),
    Function.Injective i → ∀ (ρ : Subst Label B₁) (θR : Assign Label B₁),
      CounterAt P i ρ θR → ¬ ValidOpen P

/-- CX-C. The converse at some extension: an invalid signature has a
counter-instance. The extension's decidable equality is existential
(classical in general). -/
def CXComplete : Prop :=
  ∀ P : SigProblem Label B, ¬ ValidOpen P →
    ∃ (B₁ : Type) (_ : DecidableEq B₁) (i : B → B₁), Function.Injective i ∧
      ∃ (ρ : Subst Label B₁) (θR : Assign Label B₁), CounterAt P i ρ θR

/-- CX-CA. The converse at the one fixed supply `B ⊕ Nat`, which a
refuter can search. Needs B1b (`AtomsToOpen`, unproved). -/
def CXCompleteAtoms [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B, ¬ ValidOpen P →
    ∃ (ρ : Subst Label (B ⊕ Nat)) (θR : Assign Label (B ⊕ Nat)),
      CounterAt P Sum.inl ρ θR

/-! ### Checked counter-instances and the refuter interface -/

/-- A checkable certificate at `B ⊕ Nat`: decidable conditions only.
`ρ` binds exactly the rigid variables, each to a ground evaluable
expression; `D` is scoped, so `ρ` closes it and `decideCall` reads it;
the substituted `D` holds and the substituted body does not. No `θR`
is given: it is the one `ρ` denotes. -/
def CXChecked [DecidableEq B] (P : SigProblem Label B)
    (ρ : Subst Label (B ⊕ Nat)) : Prop :=
  let P' := P.mapBase (Sum.inl : B → B ⊕ Nat)
  Scoped P ∧
  (∀ p ∈ ρ.ty, p.1 ∈ P.rigidTy) ∧ (∀ p ∈ ρ.row, p.1 ∈ P.rigidRow) ∧
  (∀ n ∈ P.rigidTy, ∃ t, ρ.ty.lookup n = some t ∧ GroundT t) ∧
  (∀ r ∈ P.rigidRow, ∃ fs, ρ.row.lookup r = some (fs, []) ∧ GroundF fs) ∧
  decideCall (substProblem ρ P'.D) = true ∧
  decideCall (substProblem ρ P'.B) = false

/-- CX-K. A checked certificate refutes the signature. -/
def CXCheckedSound [DecidableEq B] : Prop :=
  ∀ (P : SigProblem Label B) (ρ : Subst Label (B ⊕ Nat)),
    CXChecked P ρ → ¬ ValidOpen P

/-- CX-KC. A scoped invalid signature has a checked certificate. -/
def CXCheckedComplete [DecidableEq B] : Prop :=
  ∀ P : SigProblem Label B, Scoped P → ¬ ValidOpen P →
    ∃ ρ : Subst Label (B ⊕ Nat), CXChecked P ρ

/-- `Refute_sound` (requirements.md §4.4), the interface a refuting
strategy supplies: whatever its certificate type, a certificate its
check accepts refutes option-B validity. -/
def RefuteSound {Cert : Type} (check : SigProblem Label B → Cert → Bool) :
    Prop :=
  ∀ P c, check P c = true → ¬ ValidOpen P

/-- A check whose acceptances are checked CX certificates. -/
def RealizesCX [DecidableEq B] {Cert : Type}
    (check : SigProblem Label B → Cert → Bool) : Prop :=
  ∀ P c, check P c = true → ∃ ρ, CXChecked P ρ

/-- CX-R. Such a check meets the interface. -/
def RefuteSoundOfCX [DecidableEq B] : Prop :=
  ∀ {Cert : Type} (check : SigProblem Label B → Cert → Bool),
    RealizesCX check → RefuteSound check

end Composition.Typed.Refute
