/-
O2 (dossier §18.6): the written/rest split is exact. Every atom says
something pointwise about labels, so holding on all labels is holding
on the written labels and on the rest (`holdsOn_split`, by excluded
middle on membership in `written P`). The value of a set expression at
a label reads the assignments at that label only (`eval_congr`), so
an atom restricted to `K` depends only on the assignments restricted
to `K` (`holdsOn_congr`). A written label denotes itself, so it is
empty outside the written labels. None of the three parts uses the
atom's membership in the problem.
-/
import Composition.Presence.Defs

namespace Composition.Presence

variable {Label : Type}

/-- Holding on all labels is holding on `W` and on its complement. -/
theorem holdsOn_split (W : LSet Label) (ρ σ : Nat → LSet Label)
    (a : PAtom Label) :
    HoldsOn univ ρ σ a ↔
      HoldsOn W ρ σ a ∧ HoldsOn (fun k => ¬ W k) ρ σ a := by
  cases a with
  | disj x y =>
    simp only [HoldsOn, univ]
    refine ⟨fun h => ⟨fun k _ => h k trivial, fun k _ => h k trivial⟩,
      fun ⟨h₁, h₂⟩ k _ => ?_⟩
    exact (Classical.em (W k)).elim (h₁ k) (h₂ k)
  | lacks l x =>
    simp only [HoldsOn, univ]
    refine ⟨fun h => ⟨fun _ => h trivial, fun _ => h trivial⟩,
      fun ⟨h₁, h₂⟩ _ => ?_⟩
    exact (Classical.em (W l)).elim h₁ h₂
  | eq x y =>
    simp only [HoldsOn, univ]
    refine ⟨fun h => ⟨fun k _ => h k trivial, fun k _ => h k trivial⟩,
      fun ⟨h₁, h₂⟩ k _ => ?_⟩
    exact (Classical.em (W k)).elim (h₁ k) (h₂ k)

/-- A set expression's value at `k` reads the assignments at `k`. -/
theorem eval_congr (ρ ρ' σ σ' : Nat → LSet Label) (k : Label)
    (hρ : ∀ i, ρ i k ↔ ρ' i k) (hσ : ∀ j, σ j k ↔ σ' j k) :
    ∀ e : SExpr Label, eval ρ σ e k ↔ eval ρ' σ' e k
  | .rigid i => hρ i
  | .flex j => hσ j
  | .lab _ => Iff.rfl
  | .union a b =>
    or_congr (eval_congr ρ ρ' σ σ' k hρ hσ a)
      (eval_congr ρ ρ' σ σ' k hρ hσ b)

/-- An atom restricted to `K` depends only on the assignments
restricted to `K`. -/
theorem holdsOn_congr (K : LSet Label) (ρ ρ' σ σ' : Nat → LSet Label)
    (hρ : ∀ i k, K k → (ρ i k ↔ ρ' i k))
    (hσ : ∀ j k, K k → (σ j k ↔ σ' j k)) (a : PAtom Label) :
    HoldsOn K ρ σ a ↔ HoldsOn K ρ' σ' a := by
  -- At a label of `K`, every set expression has the same value.
  have he : ∀ k, K k → ∀ e : SExpr Label,
      (eval ρ σ e k ↔ eval ρ' σ' e k) := fun k hk =>
    eval_congr ρ ρ' σ σ' k (fun i => hρ i k hk) (fun j => hσ j k hk)
  cases a with
  | disj x y =>
    simp only [HoldsOn]
    exact forall_congr' fun k => ⟨fun h hk => by
      rw [← he k hk x, ← he k hk y]; exact h hk, fun h hk => by
      rw [he k hk x, he k hk y]; exact h hk⟩
  | lacks l x =>
    simp only [HoldsOn]
    exact ⟨fun h hl => by rw [← he l hl x]; exact h hl,
      fun h hl => by rw [he l hl x]; exact h hl⟩
  | eq x y =>
    simp only [HoldsOn]
    exact forall_congr' fun k => ⟨fun h hk => by
      rw [← he k hk x, ← he k hk y]; exact h hk, fun h hk => by
      rw [he k hk x, he k hk y]; exact h hk⟩

/-- O2. The written/rest split is exact, local, and puts no written
label on the rest. -/
theorem o2 {Label : Type} : O2 (Label := Label) := by
  intro P a _
  refine ⟨fun ρ σ => holdsOn_split (· ∈ written P) ρ σ a,
    fun K ρ ρ' σ σ' hρ hσ => holdsOn_congr K ρ ρ' σ σ' hρ hσ a, ?_⟩
  -- `.lab l` holds at `l` only; `l` is written and `k` is not.
  intro ρ σ l k hl hk h
  simp only [eval] at h
  exact hk (h ▸ hl)

end Composition.Presence
