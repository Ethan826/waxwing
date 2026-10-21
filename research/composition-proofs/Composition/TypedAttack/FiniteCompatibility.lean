/-
The necessary branch constraints do not assume a chosen canonical split.
Thus the finite-base obstruction is not an artifact of restricting the
witnesses to one particular construction. Source translation is separate.
-/
import Composition.TypedAttack.FiniteShapes

namespace Composition.TypedAttack.FiniteShapes

open Composition Composition.Syntax

/-- Necessary conditions of the shape-split equation family: a holder
exists, every holder carries the input type, and its branch must match.
These conditions allow arbitrary rows and do not assume SplitAt. -/
def Compatible (bs : List B) (a : G Nat B)
    (u : Branch B → Row Nat (G Nat B)) : Prop :=
  (∃ tag ∈ branches bs, u tag 0 = some a) ∧
  ∀ tag ∈ branches bs, ∀ g, u tag 0 = some g → Matches tag g ∧ g = a

theorem split_compatible [DecidableEq B] {bs : List B} {a : G Nat B}
    {u : Branch B → Row Nat (G Nat B)} (hs : SplitAt bs a u) :
    Compatible bs a u := by
  obtain ⟨chosen, hc, hm, hu⟩ := hs
  constructor
  · exact ⟨chosen, hc, by simp [hu, single]⟩
  · intro tag _ g hg
    rw [hu tag] at hg
    by_cases he : tag = chosen
    · subst tag
      simp only [ite_true, single, Option.some.injEq] at hg
      subst g
      exact ⟨hm, rfl⟩
    · simp [he, Row.empty] at hg

/-- Unlike the construction theorem, this applies to every compatible
solution of the branch requirements. -/
theorem compatible_base_presence {bs : List B} {a : G Nat B}
    {u : Branch B → Row Nat (G Nat B)} (hc : Compatible bs a u)
    (b : B) (hb : b ∈ bs) :
    u (.base b) 0 ≠ none ↔ a = .base b := by
  have ht : Branch.base b ∈ branches bs :=
    List.mem_append_left _ (List.mem_map.mpr ⟨b, hb, rfl⟩)
  constructor
  · intro hn
    obtain ⟨g, hg⟩ := Option.ne_none_iff_exists'.mp hn
    obtain ⟨hm, rfl⟩ := hc.2 (.base b) ht g hg
    cases g <;> simp_all [Matches]
  · intro ha
    subst a
    obtain ⟨tag, ht', hg⟩ := hc.1
    have hm := (hc.2 tag ht' _ hg).1
    have he : tag = Branch.base b := by
      cases tag <;> simp_all [Matches]
    subst tag
    simp [hg]

/-- Finite shape coverage and forced type-dependent placement coexist.
An arbitrary uniform witness family is impossible, even among all
Compatible solutions, not just among our constructed SplitAt witnesses. -/
theorem no_uniform_compatible (bs : List B) (b : B) (hb : b ∈ bs) :
    ¬ ∃ p : Bool, ∀ a : G Nat B, FinG a →
      ∃ u, Compatible bs a u ∧ (u (.base b) 0).isSome = p := by
  rintro ⟨p, hp⟩
  obtain ⟨u, hu, eu⟩ := hp (.base b) trivial
  obtain ⟨v, hv, ev⟩ := hp (.arrow (.base b) (.base b)) ⟨trivial, trivial⟩
  have h1 := (compatible_base_presence hu b hb).mpr rfl
  have h0 : v (.base b) 0 = none := by
    apply Classical.byContradiction
    intro hn
    have := (compatible_base_presence hv b hb).mp hn
    cases this
  have ep : p = true := eu.symm.trans (Option.isSome_iff_ne_none.mpr h1)
  rw [h0, ep] at ev
  cases ev

/-- The generalized obstruction: with any complete nonempty finite
base list, every finite input has a finite compatible solution, but
no uniform presence choice exists for a named base arm. -/
theorem finite_separation [DecidableEq B] (bs : List B)
    (hcomplete : Complete bs) (b : B) :
    (∀ a : G Nat B, FinG a →
      ∃ u, Compatible bs a u ∧ ∀ tag, FinG (.record (u tag))) ∧
    (¬ ∃ p : Bool, ∀ a : G Nat B, FinG a →
      ∃ u, Compatible bs a u ∧ (u (.base b) 0).isSome = p) := by
  constructor
  · intro a ha
    obtain ⟨u, hu⟩ := split_exists bs hcomplete a
    exact ⟨u, split_compatible hu, split_finite hu ha⟩
  · exact no_uniform_compatible bs b (hcomplete b)


end Composition.TypedAttack.FiniteShapes
