/-
Split irrelevance (research/division-campaign/split-irrelevance/
statements.md §2-§4): the calculus λ-split, its reference evaluator,
specialization-time sites, acceptance and the constraint model.

Types are the shared model's `TExpr`, read at a key `θ : Assign` by
`evalT` (Composition/Syntax.lean). Terms carry site numbers into the
program's tables. A copy of declaration `f` at rigid key `θ` reads its
types at the **local key** `loc f θ`: `θ` extended by the solutions of
`f`'s own flexible variables, which a split inside `f` may change (a
lambda in the caller typed through the callee's instantiation; review
finding S1). Two splits are two programs with the same bodies, types
and requirements, and different witnesses and local keys
(`SplitVariant`).
-/
import Composition.Sig.Examples

namespace Composition.SplitIrrelevance

open Composition Composition.Syntax

variable {Label B : Type}

/-- Terms. `call f k a` calls declaration `f` with the witness at site
`k`; `site k e` is a `show`-like operation whose argument type is the
type at site `k`; `ann k e` is any other typed position (a lambda's
parameter, a comparison's operand): `e` at run time, but its type at
site `k` must be defined, and meet the site's requirement, at every
key; `project k e` (excluded, E3) keeps the labels of the type at site
`k`. -/
inductive Tm (Label : Type) where
  | var : Nat → Tm Label
  | num : Nat → Tm Label
  | empty : Tm Label
  | extend : Label → Tm Label → Tm Label → Tm Label
  | spread : Tm Label → Tm Label → Tm Label
  | field : Tm Label → Label → Tm Label
  | without : Tm Label → Label → Tm Label
  | lam : Tm Label → Tm Label
  | app : Tm Label → Tm Label → Tm Label
  | call : Nat → Nat → Tm Label → Tm Label
  | site : Nat → Tm Label → Tm Label
  | ann : Nat → Tm Label → Tm Label
  | project : Nat → Tm Label → Tm Label

/-- Run-time values. `shown v` is what a `show` site yields: the value
printed, which determines any rendering of it. -/
inductive V (Label : Type) where
  | num : Nat → V Label
  | record : List (Label × V Label) → V Label
  | clo : List (V Label) → Tm Label → V Label
  | shown : V Label → V Label

/-- A program: bodies; per site its type and the requirement its ground
type must meet (printability for `show`, comparability for `==`, none
for a plain annotation); per call site the witness (the callee's rigid
key as a function of the caller's local key); per declaration its local
key, declared clauses, and requirement interface on rigid keys. -/
structure Prog (Label B : Type) where
  body : Nat → Tm Label
  ty : Nat → TExpr Label B
  ok : Nat → G Label B → Prop
  wit : Nat → Assign Label B → Assign Label B
  loc : Nat → Assign Label B → Assign Label B
  D : Nat → Problem Label B
  Req : Nat → Assign Label B → Prop

/-- Two splits: bodies, site types, site requirements, clauses and
interfaces agree; witnesses and local keys may differ. -/
def SplitVariant (P₁ P₂ : Prog Label B) : Prop :=
  P₁.body = P₂.body ∧ P₁.ty = P₂.ty ∧ P₁.ok = P₂.ok ∧ P₁.D = P₂.D ∧
    P₁.Req = P₂.Req

/-- The labels of a run-time record. -/
def keysOf (fs : List (Label × V Label)) : List Label := fs.map Prod.fst

variable [DecidableEq Label]

/-- The reference evaluator, with fuel. Only `project` reads the key.
`app` runs a closure's body at the key where it is applied, not where
it was created; only the excluded `project` could tell the difference
(a projecting closure returned from a callee would read the caller's
key). -/
noncomputable def eval (P : Prog Label B) :
    Assign Label B → Nat → List (V Label) → Tm Label → Option (V Label)
  | _, 0, _, _ => none
  | θ, n + 1, ρ, t =>
    match t with
    | .var i => ρ[i]?
    | .num k => some (.num k)
    | .empty => some (.record [])
    | .extend l e r =>
      match eval P θ n ρ e, eval P θ n ρ r with
      | some v, some (.record fs) =>
        if l ∈ keysOf fs then none else some (.record ((l, v) :: fs))
      | _, _ => none
    | .spread a b =>
      match eval P θ n ρ a, eval P θ n ρ b with
      | some (.record fa), some (.record fb) =>
        if (keysOf fa).any (· ∈ keysOf fb) then none
        else some (.record (fa ++ fb))
      | _, _ => none
    | .field e l =>
      match eval P θ n ρ e with
      | some (.record fs) => fs.lookup l
      | _ => none
    | .without e l =>
      match eval P θ n ρ e with
      | some (.record fs) => some (.record (fs.filter (·.1 ≠ l)))
      | _ => none
    | .lam b => some (.clo ρ b)
    | .app f a =>
      match eval P θ n ρ f, eval P θ n ρ a with
      | some (.clo ρ' b), some v => eval P θ n (v :: ρ') b
      | _, _ => none
    | .call f k a =>
      match eval P θ n ρ a with
      | some v => eval P (P.loc f (P.wit k θ)) n [v] (P.body f)
      | none => none
    | .site _ e => (eval P θ n ρ e).map .shown
    | .ann _ e => eval P θ n ρ e
    | .project k e =>
      match eval P θ n ρ e, evalT θ (P.ty k) with
      | some (.record fs), some (.record r) =>
        some (.record (fs.filter fun p => (r p.1).isSome))
      | _, _ => none

/-- No `project` anywhere in the term. -/
def PF : Tm Label → Prop
  | .var _ | .num _ | .empty => True
  | .extend _ e r => PF e ∧ PF r
  | .spread a b => PF a ∧ PF b
  | .field e _ | .without e _ => PF e
  | .lam b => PF b
  | .app f a => PF f ∧ PF a
  | .call _ _ a => PF a
  | .site _ e | .ann _ e => PF e
  | .project _ _ => False

/-- Values whose closures are projection-free. -/
inductive VPF : V Label → Prop
  | num (k : Nat) : VPF (.num k)
  | record (fs : List (Label × V Label)) :
      (∀ p ∈ fs, VPF p.2) → VPF (.record fs)
  | clo (ρ : List (V Label)) (b : Tm Label) :
      (∀ v ∈ ρ, VPF v) → PF b → VPF (.clo ρ b)
  | shown (v : V Label) : VPF v → VPF (.shown v)

/-- A program whose bodies are projection-free. -/
def ProgPF (P : Prog Label B) : Prop := ∀ f, PF (P.body f)

/-- Immediate subterms. A call's argument is one; the callee's body is
not (it is reached through the call, at the witness's key). -/
inductive Sub : Tm Label → Tm Label → Prop
  | extend₁ (l : Label) (e r : Tm Label) : Sub e (.extend l e r)
  | extend₂ (l : Label) (e r : Tm Label) : Sub r (.extend l e r)
  | spread₁ (a b : Tm Label) : Sub a (.spread a b)
  | spread₂ (a b : Tm Label) : Sub b (.spread a b)
  | field (e : Tm Label) (l : Label) : Sub e (.field e l)
  | without (e : Tm Label) (l : Label) : Sub e (.without e l)
  | lam (b : Tm Label) : Sub b (.lam b)
  | app₁ (f a : Tm Label) : Sub f (.app f a)
  | app₂ (f a : Tm Label) : Sub a (.app f a)
  | call (f k : Nat) (a : Tm Label) : Sub a (.call f k a)
  | site (k : Nat) (e : Tm Label) : Sub e (.site k e)
  | ann (k : Nat) (e : Tm Label) : Sub e (.ann k e)
  | project (k : Nat) (e : Tm Label) : Sub e (.project k e)

/-- Site `k` occurs in `t` (a `show` or an annotation), under any
lambda, applied or not, without descending into calls. -/
inductive LocalSite : Tm Label → Nat → Prop
  | site (k : Nat) (e : Tm Label) : LocalSite (.site k e) k
  | ann (k : Nat) (e : Tm Label) : LocalSite (.ann k e) k
  | sub {t' t k} : Sub t' t → LocalSite t' k → LocalSite t k

/-- `t` contains a call of `f` at site `k`, under any lambda. -/
inductive CallIn : Tm Label → Nat → Nat → Prop
  | here (f k : Nat) (a : Tm Label) : CallIn (.call f k a) f k
  | sub {t' t f k} : Sub t' t → CallIn t' f k → CallIn t f k

/-- Specializing `t` at local key `θ` reaches site `k` at local key
`θ'`: in `t` itself, or through a call, in the callee's copy at the
witness's key. -/
inductive SiteAt (P : Prog Label B) :
    Assign Label B → Tm Label → Nat → Assign Label B → Prop
  | here {θ t k} : LocalSite t k → SiteAt P θ t k θ
  | call {θ t f k k' θ'} : CallIn t f k →
      SiteAt P (P.loc f (P.wit k θ)) (P.body f) k' θ' → SiteAt P θ t k' θ'

/-- Specializing `t` at local key `θ` creates a copy of `f` at rigid key
`θ'` (the keys a ground check at call edges would inspect). -/
inductive KeyAt (P : Prog Label B) :
    Assign Label B → Tm Label → Nat → Assign Label B → Prop
  | here {θ t f k} : CallIn t f k → KeyAt P θ t f (P.wit k θ)
  | call {θ t f k g θ'} : CallIn t f k →
      KeyAt P (P.loc f (P.wit k θ)) (P.body f) g θ' → KeyAt P θ t g θ'

/-- A site's type is defined at the key and meets the site's
requirement. -/
def SiteOk (P : Prog Label B) (θ : Assign Label B) (k : Nat) : Prop :=
  ∃ g, evalT θ (P.ty k) = some g ∧ P.ok k g

/-- `t` is accepted at local key `θ`: every reached site is defined and
meets its requirement (review finding S5: undefined types refuse). -/
def Accepted (P : Prog Label B) (θ : Assign Label B) (t : Tm Label) :
    Prop :=
  ∀ k θ', SiteAt P θ t k θ' → SiteOk P θ' k

/-- The model counts every specialization-time requirement: (i) a key
satisfying a declaration's interface makes its local sites defined and
meet their requirements at the copy's local key, and (ii) every call's
witness meets the callee's interface. -/
def Covers (P : Prog Label B) : Prop :=
  ∀ f θ, P.Req f θ →
    (∀ k, LocalSite (P.body f) k → SiteOk P (P.loc f θ) k) ∧
    (∀ g k, CallIn (P.body f) g k → P.Req g (P.wit k (P.loc f θ)))

/-- Model M1 in general: the declared clauses together with every local
site's requirement at the copy's local key. -/
def Req₁ (P : Prog Label B) (f : Nat) (θ : Assign Label B) : Prop :=
  Sat θ (P.D f) ∧ ∀ k, LocalSite (P.body f) k → SiteOk P (P.loc f θ) k

/-- Model M0 (today): declared clauses only. -/
def Req₀ (P : Prog Label B) (f : Nat) (θ : Assign Label B) : Prop :=
  Sat θ (P.D f)

/-- `P` with another requirement interface. -/
def withReq (P : Prog Label B) (R : Nat → Assign Label B → Prop) :
    Prog Label B :=
  { P with Req := R }

/-- Printability (Specialize/Printable.purs `groundPrintable`): no arrow
at any depth. -/
inductive Printable : G Label B → Prop
  | base (b : B) : Printable (.base b)
  | record (r : Row Label (G Label B)) :
      (∀ l g, r l = some g → Printable g) → Printable (.record r)

end Composition.SplitIrrelevance
