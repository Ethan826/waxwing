/-
Finite-base shape selection, isolated from source translation.
This proves the obstruction for every nonempty finite list covering B.
It does not generate a SigProblem or prove a Waxwing translation.
-/
import Composition.Sig.Finite

namespace Composition.TypedAttack.FiniteShapes

open Composition Composition.Syntax

inductive Branch (B : Type) where
  | base : B → Branch B
  | arrow : Branch B
  | record : Branch B
  deriving DecidableEq

def branches (bs : List B) : List (Branch B) :=
  bs.map Branch.base ++ [.arrow, .record]

def Matches : Branch B → G Nat B → Prop
  | .base b, .base c => b = c
  | .arrow, .arrow _ _ => True
  | .record, .record _ => True
  | _, _ => False

/-- Exactly one branch gets the field. Each present field has its
branch's shape. Every part is either that field or empty. -/
def SplitAt [DecidableEq B] (bs : List B) (a : G Nat B)
    (u : Branch B → Row Nat (G Nat B)) : Prop :=
  ∃ chosen ∈ branches bs, Matches chosen a ∧
    ∀ tag, u tag = if tag = chosen then single 0 a else Row.empty

def Complete (bs : List B) : Prop := ∀ b : B, b ∈ bs

/-- All base constants, arrows and records are covered. -/
theorem covered (bs : List B) (hc : Complete bs) (a : G Nat B) :
    ∃ tag ∈ branches bs, Matches tag a := by
  cases a with
  | base b =>
    exact ⟨.base b, List.mem_append_left _
      (List.mem_map.mpr ⟨b, hc b, rfl⟩), rfl⟩
  | arrow x y => exact ⟨.arrow, by simp [branches], trivial⟩
  | record r => exact ⟨.record, by simp [branches], trivial⟩

/-- A shape-dependent finite row partition always exists. -/
theorem split_exists [DecidableEq B] (bs : List B) (hc : Complete bs)
    (a : G Nat B) : ∃ u, SplitAt bs a u := by
  obtain ⟨tag, ht, hm⟩ := covered bs hc a
  exact ⟨fun t => if t = tag then single 0 a else Row.empty,
    tag, ht, hm, fun _ => rfl⟩

/-- Each produced part is finite whenever the input type is finite. -/
theorem split_finite [DecidableEq B] {bs : List B} {a : G Nat B}
    {u : Branch B → Row Nat (G Nat B)} (hs : SplitAt bs a u)
    (ha : FinG a) : ∀ tag, FinG (.record (u tag)) := by
  obtain ⟨chosen, _, _, hu⟩ := hs
  intro tag
  rw [hu tag]
  split
  · refine (finG_record _).mpr ⟨⟨[0], ?_⟩, ?_⟩
    · intro k hk
      by_cases h : k = 0
      · simp [h]
      · simp [single, h] at hk
    · intro k
      unfold single
      split
      · exact ha
      · trivial
  · exact finG_emptyG

/-- The base arm's presence is forced by the type, not the label set. -/
theorem base_presence [DecidableEq B] {bs : List B} {a : G Nat B}
    {u : Branch B → Row Nat (G Nat B)} (hs : SplitAt bs a u) (b : B) :
    u (.base b) 0 ≠ none ↔ a = .base b := by
  obtain ⟨tag, _, hm, hu⟩ := hs
  rw [hu (.base b)]
  constructor
  · intro hp
    by_cases he : Branch.base b = tag
    · subst tag
      cases a <;> simp_all [Matches]
    · simp [he, Row.empty] at hp
  · intro ha
    subst a
    have he : Branch.base b = tag := by
      cases tag <;> simp_all [Matches]
    simp [he, single]

/-- No constant per-pattern presence choice covers both a base and an
arrow instance. This holds for every complete finite base list. -/
theorem no_uniform [DecidableEq B] (bs : List B) (b : B) :
    ¬ ∃ p : Bool, ∀ a : G Nat B,
      ∃ u, SplitAt bs a u ∧ (u (.base b) 0).isSome = p := by
  rintro ⟨p, hp⟩
  obtain ⟨u, hu, eu⟩ := hp (.base b)
  obtain ⟨v, hv, ev⟩ := hp (.arrow (.base b) (.base b))
  have h1 := (base_presence hu b).mpr rfl
  have h0 : v (.base b) 0 = none := by
    apply Classical.byContradiction
    intro hn
    have := (base_presence hv b).mp hn
    cases this
  have e1 : p = true := eu.symm.trans (Option.isSome_iff_ne_none.mpr h1)
  rw [h0, e1] at ev
  cases ev

/-- A new unlisted base constant makes the same finite family invalid. -/
theorem missing_base [DecidableEq B] {bs : List B} {b : B} (hb : b ∉ bs) :
    ¬ ∃ u, SplitAt bs (.base b) u := by
  rintro ⟨u, tag, ht, hm, _⟩
  cases tag with
  | base c =>
    simp only [Matches] at hm
    subst c
    simp [branches] at ht
    exact hb ht
  | arrow => exact hm
  | record => exact hm


end Composition.TypedAttack.FiniteShapes
