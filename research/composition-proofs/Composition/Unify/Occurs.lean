/-
The occurs check, justified against the ground model itself. `G`'s
records hold arbitrary functions, so ground values are not assumed to be
finite trees; instead the immediate-part relation `Part` is shown
well-founded by `G`'s own induction (`acc_part`), hence no value is a
proper part of itself (`not_part_self`). A type variable occurring
properly inside an expression denotes a proper part of the expression's
value (`occurs_part`), so `x = t` then has no solution.
-/
import Composition.Enum

namespace Composition.Syntax

open Composition

variable {Label B : Type}

/-- `Part a g`: `a` is an immediate part of the ground value `g`. -/
inductive Part : G Label B → G Label B → Prop
  | arrowL (a c : G Label B) : Part a (.arrow a c)
  | arrowR (a c : G Label B) : Part c (.arrow a c)
  | field (f : Label → Option (G Label B)) (l : Label) (v : G Label B) :
      f l = some v → Part v (.record f)

mutual
  theorem acc_part : ∀ g : G Label B, Acc Part g
    | .base _ => .intro _ fun _ h => by cases h
    | .arrow a c => .intro _ fun y h => by
      cases h
      · exact acc_part a
      · exact acc_part c
    | .record f => .intro _ fun y h => by
      cases h with
      | field _ l _ hv => exact acc_partO (f l) y hv

  theorem acc_partO : ∀ (o : Option (G Label B)) (y : G Label B),
      o = some y → Acc Part y
    | none, _, h => by cases h
    | some g, _, h => by
      cases h
      exact acc_part g
end

theorem acc_not_self {α : Type} {R : α → α → Prop} {a : α} (h : Acc R a) :
    ¬ R a a :=
  Acc.rec (motive := fun x _ => ¬ R x x)
    (fun x _ ih hxx => ih x hxx hxx) h

/-- No ground value is a proper part of itself. -/
theorem not_part_self (g : G Label B) : ¬ Relation.TransGen Part g g :=
  acc_not_self (acc_part g).transGen

/-- `a` is `g` or a proper part of it. -/
def PartStar (a g : G Label B) : Prop := a = g ∨ Relation.TransGen Part a g

theorem PartStar.tail {a b c : G Label B} (h : PartStar a b)
    (p : Part b c) : Relation.TransGen Part a c := by
  rcases h with rfl | h
  · exact .single p
  · exact .tail h p

variable [DecidableEq Label]

mutual
  /-- A variable occurring in an expression denotes a part (possibly the
  whole) of the expression's value. -/
  theorem occurs_part {θ : Assign Label B} {x : Nat} :
      ∀ (t : TExpr Label B) {g : G Label B}, x ∈ tyVarsT t →
        evalT θ t = some g → PartStar (θ.ty x) g
    | .base _, _, hx, _ => by simp [tyVarsT] at hx
    | .tvar n, g, hx, h => by
      simp [tyVarsT] at hx
      subst hx
      simp [evalT] at h
      exact Or.inl h
    | .arrow a c, g, hx, h => by
      simp only [evalT, Option.bind_eq_some_iff, Option.map_eq_some_iff]
        at h
      obtain ⟨va, ha, vc, hc, rfl⟩ := h
      simp only [tyVarsT, List.mem_append] at hx
      rcases hx with hx | hx
      · exact .inr ((occurs_part a hx ha).tail (.arrowL va vc))
      · exact .inr ((occurs_part c hx hc).tail (.arrowR va vc))
    | .record fs tails, g, hx, h => by
      simp only [tyVarsT] at hx
      rw [evalT] at h
      simp only [Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
      obtain ⟨fr, hf, v, hv, rfl⟩ := h
      obtain ⟨l, w, hw, hpart⟩ := occurs_partF fs hx hf
      have hvl : v l = some w := by
        simp only [composeAll, Option.bind_eq_some_iff] at hv
        obtain ⟨u, _, hc⟩ := hv
        obtain ⟨_, rfl⟩ := compose_eq_some.mp hc
        exact union_of_some hw
      exact .inr (hpart.tail (.field v l w hvl))

  theorem occurs_partF {θ : Assign Label B} {x : Nat} :
      ∀ (fs : Fields Label B) {fr : Row Label (G Label B)},
        x ∈ tyVarsF fs → evalF θ fs = some fr →
          ∃ l w, fr l = some w ∧ PartStar (θ.ty x) w
    | .nil, _, hx, _ => by simp [tyVarsF] at hx
    | .cons l t rest, fr, hx, h => by
      simp only [evalF, Option.bind_eq_some_iff] at h
      obtain ⟨g, hg, r, hr, hc⟩ := h
      obtain ⟨hd, rfl⟩ := compose_eq_some.mp hc
      simp only [tyVarsF, List.mem_append] at hx
      rcases hx with hx | hx
      · exact ⟨l, g, by simp [union, single], occurs_part t hx hg⟩
      · obtain ⟨k, w, hw, hp⟩ := occurs_partF rest hx hr
        refine ⟨k, w, ?_, hp⟩
        by_cases hk : k = l
        · subst hk
          rcases hd k with h1 | h1
          · simp [single] at h1
          · rw [h1] at hw
            cases hw
        · simp [union, single, hk, hw]
end

end Composition.Syntax
