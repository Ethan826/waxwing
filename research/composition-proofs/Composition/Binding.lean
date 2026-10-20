/-
Atoms and problems under substitution, and the binding-equation
correspondence of dossier §2.1 (second milestone, step 2).
-/
import Composition.Correspond

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem sat_single {θ : Assign Label B} {a : Atom Label B} :
    Sat θ [a] ↔ Holds θ a := by
  simp [Sat]

theorem sat_ff_if {θ : Assign Label B} {p : Prop} [Decidable p] :
    Sat θ (if p then [.ff] else []) ↔ ¬ p := by
  by_cases h : p <;> simp [h, Sat, Holds]

theorem sat_map_lacks {θ : Assign Label B} {ts : List Nat} {l : Label} :
    Sat θ (ts.map fun t => .lacks t l) ↔ ∀ t ∈ ts, θ.row t l = none := by
  simp [Sat, Holds]

theorem sat_map_disjoint {θ : Assign Label B} {x : Nat} {ts : List Nat} :
    Sat θ (ts.map fun b => .disjoint x b) ↔
      ∀ b ∈ ts, Disjoint (θ.row x) (θ.row b) := by
  simp [Sat, Holds]

/-- A row variable lacks a label iff what it stands for does. -/
theorem subst_lacks {θ : Assign Label B} {σ : Subst Label B}
    (he : Sat θ (eqs σ)) (r : Nat) (l : Label) :
    Holds θ (.lacks r l) ↔ Sat θ (substAtom σ (.lacks r l)) := by
  obtain ⟨frs, hf, hc⟩ := rowOf_eval he r
  simp only [Holds, substAtom, sat_append, sat_ff_if, sat_map_lacks]
  rw [composeAll_none_iff hc, ← fieldRows_none_iff θ _ frs hf l]
  simp [or_imp, forall_and]

theorem any_mem_iff {xs ys : List Label} :
    (xs.any (· ∈ ys)) = true ↔ ∃ k ∈ xs, k ∈ ys := by
  simp

/-- Two row variables are disjoint iff what they stand for is. -/
theorem subst_disjoint {θ : Assign Label B} {σ : Subst Label B}
    (he : Sat θ (eqs σ)) (r s : Nat) :
    Holds θ (.disjoint r s) ↔ Sat θ (substAtom σ (.disjoint r s)) := by
  obtain ⟨f1, hf1, hc1⟩ := rowOf_eval he r
  obtain ⟨f2, hf2, hc2⟩ := rowOf_eval he s
  simp only [Holds, substAtom, sat_append, sat_ff_if, sat_flatMap,
    sat_map_lacks]
  rw [disjoint_composeAll hc1 hc2]
  simp only [List.mem_append, List.mem_map, or_imp, forall_and,
    forall_exists_index, and_imp, forall_apply_eq_imp_iff₂]
  have a1 := fun y => fieldRows_disjoint θ _ f1 hf1 y
  have a2 := fun y => fieldRows_disjoint θ _ f2 hf2 y
  have hsym : ∀ x y : Row Label (G Label B), Disjoint x y ↔ Disjoint y x :=
    fun _ _ => disjoint_comm
  constructor
  · rintro ⟨⟨hff, htf⟩, hft, htt⟩
    refine ⟨⟨⟨?_, ?_⟩, ?_⟩, ?_⟩
    · rw [any_mem_iff]
      rintro ⟨k, hk1, hk2⟩
      have hy : ∀ y ∈ f2, y k = none := fun y hy =>
        ((a1 y).mp (fun x hx => hff x hx y hy)) k hk1
      exact (fieldRows_none_iff θ _ f2 hf2 k).mp hy hk2
    · intro k hk t ht
      exact (a1 (θ.row t)).mp (fun x hx => hft x hx t ht) k hk
    · intro k hk t ht
      exact (a2 (θ.row t)).mp
        (fun y hy => (hsym _ _).mp (htf t ht y hy)) k hk
    · intro a ha
      exact sat_map_disjoint.mpr (fun b hb => htt a ha b hb)
  · rintro ⟨⟨⟨hff, hft⟩, htf⟩, htt⟩
    refine ⟨⟨?_, ?_⟩, ?_, ?_⟩
    · intro x hx y hy
      refine (a1 y).mpr (fun k hk => ?_) x hx
      exact (fieldRows_none_iff θ _ f2 hf2 k).mpr
        (fun hk2 => hff (any_mem_iff.mpr ⟨k, hk, hk2⟩)) y hy
    · intro t ht y hy
      exact (hsym _ _).mpr ((a2 (θ.row t)).mpr
        (fun k hk => htf k hk t ht) y hy)
    · intro x hx t ht
      exact (a1 (θ.row t)).mpr (fun k hk => hft k hk t ht) x hx
    · intro a ha b hb
      exact sat_map_disjoint.mp (htt a ha) b hb

/-- Under its binding equations, a substitution preserves every atom. -/
theorem subst_atom {θ : Assign Label B} {σ : Subst Label B}
    (he : Sat θ (eqs σ)) :
    ∀ a : Atom Label B, Holds θ a ↔ Sat θ (substAtom σ a)
  | .eq t u => by
    rw [substAtom, sat_single]
    simp [Holds, subst_evalT he]
  | .lacks r l => subst_lacks he r l
  | .disjoint r s => subst_disjoint he r s
  | .ff => by simp [substAtom, Sat, Holds]

/-- Under its binding equations, a substitution preserves every
problem. -/
theorem subst_sat {θ : Assign Label B} {σ : Subst Label B}
    (he : Sat θ (eqs σ)) (C : Problem Label B) :
    Sat θ C ↔ Sat θ (substProblem σ C) := by
  rw [substProblem, sat_flatMap]
  exact ⟨fun h a ha => (subst_atom he a).mp (h a ha),
    fun h a ha => (subst_atom he a).mpr (h a ha)⟩

/-- Dossier §2.1 (i): if every solution of `C` satisfies the binding
equations of `σ` (for example because `C` contains them), then `C` and
`eqs σ ∧ Cσ` have exactly the same solutions. -/
theorem binding_correspondence (C : Problem Label B) (σ : Subst Label B)
    (entailed : ∀ θ, Sat θ C → Sat θ (eqs σ)) (θ : Assign Label B) :
    Sat θ C ↔ Sat θ (eqs σ ++ substProblem σ C) := by
  rw [sat_append]
  constructor
  · intro h
    have he := entailed θ h
    exact ⟨he, (subst_sat he C).mp h⟩
  · rintro ⟨he, h⟩
    exact (subst_sat he C).mpr h

/-- The binding equations cannot be dropped: solving `x = true` gives
`σ = [x ↦ true]`, and `Cσ` alone (`true = true`) is satisfied by an
assignment that `C` excludes. -/
theorem bindings_needed :
    let C : Problem Unit Bool := [.eq (.tvar 0) (.base true)]
    let σ : Subst Unit Bool := ⟨[(0, .base true)], []⟩
    (∀ θ, Sat θ C → Sat θ (eqs σ)) ∧
      ∃ θ, Sat θ (substProblem σ C) ∧ ¬ Sat θ C := by
  refine ⟨fun θ h => by simpa [eqs] using h, ?_⟩
  refine ⟨⟨fun _ => .base false, fun _ _ => none⟩, ?_, ?_⟩
  · simp [Sat, substProblem, substAtom, substT, Holds, evalT]
  · simp [Sat, Holds, evalT]

end Composition.Syntax
