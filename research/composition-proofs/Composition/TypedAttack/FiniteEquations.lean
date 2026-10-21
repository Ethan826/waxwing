/-
The finite-base family as row equations, including the remainder rows.
No generated Nat-indexed SigProblem/source translation is asserted here.
-/
import Composition.TypedAttack.FiniteCompatibility

namespace Composition.TypedAttack.FiniteShapes

open Composition Composition.Syntax

variable {B : Type}

def target (a : G Nat B) : Branch B → G Nat B
  | .base b => .base b
  | .arrow => match a with
    | .arrow x y => .arrow x y
    | _ => .arrow emptyG emptyG
  | .record => match a with
    | .record r => .record r
    | _ => emptyG

theorem target_eq {a : G Nat B} {tag : Branch B}
    (h : Matches tag a) : target a tag = a := by
  cases tag <;> cases a <;> simp_all [Matches, target]

theorem target_finite {a : G Nat B} (h : FinG a) (tag : Branch B) :
    FinG (target a tag) := by
  cases tag <;> cases a <;> simp_all [target, FinG]
  all_goals exact finG_emptyG

/-- A selected part occurs once; every other part is empty. -/
theorem compose_selected {A : Type} [DecidableEq A]
    (xs : List A) (hn : xs.Nodup) (k : A) (a : G Nat B) :
    composeAll (xs.map fun t =>
      if t = k then single 0 a else Row.empty) =
      some (if k ∈ xs then single 0 a else Row.empty) := by
  induction xs with
  | nil => simp [composeAll]
  | cons x xs ih =>
    obtain ⟨hx, ht⟩ := List.nodup_cons.mp hn
    by_cases he : x = k
    · subst x
      simp [List.map, composeAll, ih ht, hx, compose_empty]
    · by_cases hk : k ∈ xs
      · simp [List.map, composeAll, ih ht, he, hk, empty_compose]
      · simp [List.map, composeAll, ih ht, he, hk, Ne.symm he,
          empty_compose]

theorem branches_nodup {bs : List B} (hn : bs.Nodup) :
    (branches bs).Nodup := by
  rw [branches, List.nodup_append]
  refine ⟨?_, by simp, ?_⟩
  · induction bs with
    | nil => simp
    | cons b bs ih =>
      obtain ⟨hnot, htail⟩ := List.nodup_cons.mp hn
      rw [List.map_cons, List.nodup_cons]
      constructor
      · intro hm
        obtain ⟨c, hc, he⟩ := List.mem_map.mp hm
        cases he
        exact hnot hc
      · exact ih htail
  · intro tag hm other ht he
    subst other
    obtain ⟨b, _, rfl⟩ := List.mem_map.mp hm
    simp at ht

/-- Actual row equations: all u parts compose to {f:a}; each u plus
its remainder composes to its branch target. -/
def EquationFamily (bs : List B) (a : G Nat B)
    (u m : Branch B → Row Nat (G Nat B)) : Prop :=
  composeAll ((branches bs).map u) = some (single 0 a) ∧
    ∀ tag ∈ branches bs,
      compose (u tag) (m tag) = some (single 0 (target a tag))

/-- A finite input admits finite u and m rows satisfying every equation.
The target function supplies the shared arrow components/record row. -/
theorem equation_family_valid [DecidableEq B] (bs : List B) (hn : bs.Nodup)
    (hc : Complete bs) (a : G Nat B) (ha : FinG a) :
    ∃ u m, EquationFamily bs a u m ∧ Compatible bs a u ∧
      (∀ tag, FinG (.record (u tag))) ∧
      (∀ tag, FinG (.record (m tag))) := by
  obtain ⟨chosen, ht, hm⟩ := covered bs hc a
  let u : Branch B → Row Nat (G Nat B) := fun tag =>
    if tag = chosen then single 0 a else Row.empty
  let m : Branch B → Row Nat (G Nat B) := fun tag =>
    if tag = chosen then Row.empty else single 0 (target a tag)
  have hu : SplitAt bs a u := ⟨chosen, ht, hm, fun _ => rfl⟩
  refine ⟨u, m, ⟨?_, ?_⟩, split_compatible hu, split_finite hu ha, ?_⟩
  · change composeAll ((branches bs).map fun tag =>
      if tag = chosen then single 0 a else Row.empty) = _
    rw [compose_selected _ (branches_nodup hn)]
    simp [ht]
  · intro tag _
    by_cases he : tag = chosen
    · subst tag
      simp [u, m, target_eq hm, compose_empty]
    · simp [u, m, he, empty_compose]
  · intro tag
    by_cases he : tag = chosen
    · simp only [m, he, ite_true]
      exact finG_emptyG
    · simp only [m, he, ite_false]
      have hg := target_finite ha tag
      refine (finG_record _).mpr ⟨⟨[0], ?_⟩, ?_⟩
      · intro k hk
        by_cases h : k = 0
        · simp [h]
        · simp [single, h] at hk
      · intro k
        unfold single
        split
        · exact hg
        · trivial

/-- Two bases and four builtin-like bases both instantiate the result.
These are model examples, not a model of all Waxwing types. -/
theorem bool_base_coverage : Complete [false, true] := by
  intro b
  cases b <;> simp

theorem four_base_coverage : Complete (List.finRange 4) := by
  intro b
  simp


end Composition.TypedAttack.FiniteShapes
