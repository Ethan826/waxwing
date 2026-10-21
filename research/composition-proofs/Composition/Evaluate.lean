/-
How written fields and records evaluate, in terms of their parts: the
one-field rows of the fields and the rows of the tails. These lemmas let
substitution be reasoned about as rearranging a list of parts.
-/
import Composition.Subst

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem bind_comm {α β γ : Type} (x : Option α) (y : Option β)
    (f : α → β → Option γ) :
    (x.bind fun a => y.bind fun b => f a b) =
      y.bind fun b => x.bind fun a => f a b := by
  cases x <;> cases y <;> rfl

theorem evalF_eq (θ : Assign Label B) :
    ∀ fs : Fields Label B,
      evalF θ fs = (fieldRows θ fs).bind composeAll
  | .nil => by simp [evalF, fieldRows, composeAll]
  | .cons l t rest => by
    rw [evalF, fieldRows, evalF_eq θ rest]
    cases evalT θ t <;> cases fieldRows θ rest <;> rfl

/-- A record evaluates to the composition of its field rows and tails. -/
theorem evalT_record (θ : Assign Label B) (fs : Fields Label B)
    (tails : List Nat) :
    evalT θ (.record fs tails) =
      ((fieldRows θ fs).bind fun frs =>
        composeAll (frs ++ tails.map θ.row)).map G.record := by
  rw [evalT, evalF_eq, Option.bind_assoc]
  cases fieldRows θ fs with
  | none => rfl
  | some frs =>
    simp only [Option.bind_some, composeAll, composeAll_append]
    rw [bind_comm]
    cases composeAll frs <;> cases composeAll (tails.map θ.row) <;> rfl

theorem fieldRows_append (θ : Assign Label B) :
    ∀ a b : Fields Label B,
      fieldRows θ (a.append b) =
        (fieldRows θ a).bind fun xs => (fieldRows θ b).map (xs ++ ·)
  | .nil, b => by
    simp [Fields.append, fieldRows]
  | .cons l t rest, b => by
    rw [Fields.append, fieldRows, fieldRows, fieldRows_append θ rest b]
    cases evalT θ t <;> cases fieldRows θ rest <;>
      cases fieldRows θ b <;> rfl

theorem single_none_iff {l k : Label} {g : G Label B} :
    single l g k = none ↔ k ≠ l := by
  by_cases h : k = l <;> simp [single, h]

/-- Field rows lack a label iff it is not written. -/
theorem fieldRows_none_iff (θ : Assign Label B) :
    ∀ (f : Fields Label B) (frs : List (Row Label (G Label B))),
      fieldRows θ f = some frs → ∀ k,
        ((∀ x ∈ frs, x k = none) ↔ k ∉ f.labels)
  | .nil, frs, h, k => by
    simp [fieldRows] at h
    subst h
    simp [Fields.labels]
  | .cons l t rest, frs, h, k => by
    simp only [fieldRows, Option.bind_eq_some_iff, Option.map_eq_some_iff]
      at h
    obtain ⟨g, _, xs, hxs, rfl⟩ := h
    simp [Fields.labels, single_none_iff, fieldRows_none_iff θ rest xs hxs k]

/-- Field rows are disjoint from a row iff it lacks every written
label. -/
theorem fieldRows_disjoint (θ : Assign Label B) (f : Fields Label B)
    (frs : List (Row Label (G Label B))) (h : fieldRows θ f = some frs)
    (y : Row Label (G Label B)) :
    (∀ x ∈ frs, Disjoint x y) ↔ ∀ k ∈ f.labels, y k = none := by
  constructor
  · intro hd k hk
    apply Classical.byContradiction
    intro hy
    have : ¬ ∀ x ∈ frs, x k = none := fun hall =>
      (fieldRows_none_iff θ f frs h k).mp hall hk
    simp only [Classical.not_forall] at this
    obtain ⟨x, hx, hxk⟩ := this
    rcases hd x hx k with h' | h'
    · exact hxk h'
    · exact hy h'
  · intro hy x hx k
    by_cases hk : k ∈ f.labels
    · exact Or.inr (hy k hk)
    · exact Or.inl ((fieldRows_none_iff θ f frs h k).mpr hk x hx)

end Composition.Syntax
