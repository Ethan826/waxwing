/-
Substitution commutes with evaluation (for `MGUExists`): a substitution
of constants changes field values but never presence, so a composition
defined at the pre-instance stays defined after substitution and
conversely. `D` at `thetaOf P π C τ` is therefore a fixed presence
condition (`DefOk`) plus first-order equations between the values `D`'s
sides take at the pre-instance (`eqPairs`), with `τ` applied to both.
-/
import Composition.Typed.UnifOccurs

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- `τ` applied to every field of a row. -/
def sRow (τ : CSubst Label B) (f : Row (CL Label) (CG Label B)) :
    Row (CL Label) (CG Label B) := fun j => substO τ (f j)

/-- `τ` applied to every value of an assignment. -/
def sAssign (τ : CSubst Label B) (Γ : CAssign Label B) : CAssign Label B :=
  ⟨fun n => substG τ (Γ.ty n), fun r => sRow τ (Γ.row r)⟩

theorem thetaOf_eq (P : SigProblem Label B) (π : Pattern Label)
    (C : List Cell) (τ : CSubst Label B) :
    thetaOf P π C τ = sAssign τ (eta P π C) := rfl

omit [DecidableEq Label] in
theorem sRow_disjoint {τ : CSubst Label B} {x y : Row (CL Label) (CG Label B)} :
    Composition.Disjoint (sRow τ x) (sRow τ y) ↔ Composition.Disjoint x y := by
  simp only [Composition.Disjoint, sRow, substO_none_iff]

omit [DecidableEq Label] in
theorem sRow_union (τ : CSubst Label B) (x y : Row (CL Label) (CG Label B)) :
    sRow τ (union x y) = union (sRow τ x) (sRow τ y) := by
  funext j
  simp only [sRow, union]
  cases x j <;> simp [substO]

omit [DecidableEq Label] in
theorem composeAll_sRow (τ : CSubst Label B) :
    ∀ xs : List (Row (CL Label) (CG Label B)),
      composeAll (xs.map (sRow τ)) = (composeAll xs).map (sRow τ)
  | [] => by
    simp only [List.map_nil, composeAll, Option.map_some, Option.some.injEq]
    funext j
    rfl
  | x :: xs => by
    simp only [List.map_cons, composeAll, composeAll_sRow τ xs]
    cases composeAll xs with
    | none => rfl
    | some w =>
      simp only [Option.map_some, Option.bind_some, compose]
      by_cases h : Composition.Disjoint x w
      · simp [h, sRow_disjoint.mpr h, sRow_union]
      · have h' : ¬ Composition.Disjoint (sRow τ x) (sRow τ w) :=
          fun h' => h (sRow_disjoint.mp h')
        simp [h, h']

theorem sRow_single (τ : CSubst Label B) (l : CL Label) (g : CG Label B) :
    sRow τ (single l g) = single l (substG τ g) := by
  funext j
  simp only [sRow, single]
  split <;> rfl

mutual
  theorem subst_evalT (τ : CSubst Label B) :
      ∀ (t : TExpr Label B) (Γ : CAssign Label B),
        evalT (sAssign τ Γ) (cliftT t) = (evalT Γ (cliftT t)).map (substG τ)
    | .base _, _ => rfl
    | .arrow t u, Γ => by
      simp only [cliftT, evalT, subst_evalT τ t Γ, subst_evalT τ u Γ]
      cases evalT Γ (cliftT t) <;> cases evalT Γ (cliftT u) <;> rfl
    | .tvar _, _ => rfl
    | .record fs tails, Γ => by
      simp only [cliftT]
      rw [evalT_record, evalT_record, subst_fieldRows τ fs Γ]
      cases fieldRows Γ (cliftF fs) with
      | none => rfl
      | some frs =>
        have hmap : (frs.map (sRow τ) ++ tails.map (sAssign τ Γ).row) =
            (frs ++ tails.map Γ.row).map (sRow τ) := by
          simp [sAssign, List.map_append, List.map_map, Function.comp_def]
        simp only [Option.map_some, Option.bind_some, hmap, composeAll_sRow]
        cases composeAll (frs ++ tails.map Γ.row) with
        | none => rfl
        | some v => simp only [Option.map_some, substG_record]; rfl

  theorem subst_fieldRows (τ : CSubst Label B) :
      ∀ (fs : Fields Label B) (Γ : CAssign Label B),
        fieldRows (sAssign τ Γ) (cliftF fs) =
          (fieldRows Γ (cliftF fs)).map (List.map (sRow τ))
    | .nil, _ => rfl
    | .cons l t rest, Γ => by
      simp only [cliftF, fieldRows, subst_evalT τ t Γ,
        subst_fieldRows τ rest Γ]
      cases evalT Γ (cliftT t) with
      | none => rfl
      | some g =>
        cases fieldRows Γ (cliftF rest) with
        | none => rfl
        | some frs => simp [sRow_single]
end

/-- The presence half of an atom at `Γ`: what no substitution changes. -/
def DefOk (Γ : CAssign Label B) : Atom Label B → Prop
  | .eq t u => (evalT Γ (cliftT t)).isSome ∧ (evalT Γ (cliftT u)).isSome
  | .lacks r l => Γ.row r (.inl l) = none
  | .disjoint r s => Composition.Disjoint (Γ.row r) (Γ.row s)
  | .ff => False

/-- The value pair of an equation at `Γ`, when both sides are defined. -/
noncomputable def eqPair (Γ : CAssign Label B) :
    Atom Label B → Option (CG Label B × CG Label B)
  | .eq t u => (evalT Γ (cliftT t)).bind fun x =>
      (evalT Γ (cliftT u)).map fun y => (x, y)
  | _ => none

noncomputable def eqPairs (Γ : CAssign Label B) (D : Problem Label B) :
    List (CG Label B × CG Label B) :=
  D.filterMap (eqPair Γ)

/-- `τ` unifies a list of value pairs. -/
def UnifL (τ : CSubst Label B) (E : List (CG Label B × CG Label B)) : Prop :=
  ∀ p ∈ E, substG τ p.1 = substG τ p.2

theorem holds_sAssign {τ : CSubst Label B} {Γ : CAssign Label B} :
    ∀ a : Atom Label B, Holds (sAssign τ Γ) (cliftAtom a) ↔
      DefOk Γ a ∧ ∀ p, eqPair Γ a = some p → substG τ p.1 = substG τ p.2
  | .eq t u => by
    simp only [cliftAtom, Holds, subst_evalT, DefOk, eqPair]
    cases evalT Γ (cliftT t) <;> cases evalT Γ (cliftT u) <;> simp [eq_comm]
  | .lacks r l => by
    simp [cliftAtom, Holds, DefOk, eqPair, sAssign, sRow, substO_none_iff]
  | .disjoint r s => by
    simp only [cliftAtom, Holds, DefOk, eqPair, sAssign, sRow_disjoint]
    simp
  | .ff => by simp [cliftAtom, Holds, DefOk]

/-- `D` at a substituted assignment: presence at `Γ`, and the equations'
value pairs unified. -/
theorem sat_sAssign {τ : CSubst Label B} {Γ : CAssign Label B}
    (D : Problem Label B) :
    Sat (sAssign τ Γ) (D.map cliftAtom) ↔
      (∀ a ∈ D, DefOk Γ a) ∧ UnifL τ (eqPairs Γ D) := by
  constructor
  · intro h
    have h' : ∀ a ∈ D, Holds (sAssign τ Γ) (cliftAtom a) :=
      fun a ha => h _ (List.mem_map_of_mem ha)
    refine ⟨fun a ha => ((holds_sAssign a).mp (h' a ha)).1, fun p hp => ?_⟩
    obtain ⟨a, ha, hp⟩ := List.mem_filterMap.mp hp
    exact ((holds_sAssign a).mp (h' a ha)).2 p hp
  · rintro ⟨h1, h2⟩ b hb
    obtain ⟨a, ha, rfl⟩ := List.mem_map.mp hb
    exact (holds_sAssign a).mpr ⟨h1 a ha, fun p hp =>
      h2 p (List.mem_filterMap.mpr ⟨a, ha, hp⟩)⟩

end Composition.Typed
