/-
Run-time irrelevance (statements.md §4, R) for the reference evaluator:
two splits of a projection-free program evaluate every projection-free
term to the same result at every fuel. A sanity lemma about this
semantics (review finding S4): the evaluator reads keys only at
`project`. Compiled Go is not modeled (assumption A-go).
-/
import Composition.SplitIrrelevance.Defs

namespace Composition.SplitIrrelevance

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

theorem mem_of_lookup {fs : List (Label × V Label)} {l : Label}
    {v : V Label} (h : fs.lookup l = some v) : (l, v) ∈ fs := by
  induction fs with
  | nil => simp at h
  | cons p fs ih =>
    obtain ⟨a, w⟩ := p
    by_cases hl : l = a
    · subst hl
      simp at h
      simp [h]
    · have hb : (l == a) = false := by simpa using hl
      simp only [List.lookup, hb] at h
      exact List.mem_cons_of_mem _ (ih h)

/-- Evaluation of projection-free terms yields projection-free values. -/
theorem eval_vpf {P : Prog Label B} (hP : ProgPF P) :
    ∀ (n : Nat) (θ : Assign Label B) (ρ : List (V Label)) (t : Tm Label)
      (v : V Label), PF t → (∀ w ∈ ρ, VPF w) → eval P θ n ρ t = some v →
      VPF v := by
  intro n
  induction n with
  | zero => intro _ _ _ _ _ _ h; simp [eval] at h
  | succ n ih =>
    intro θ ρ t v ht hρ h
    cases t with
    | var i =>
      simp only [eval] at h
      exact hρ _ (List.mem_of_getElem? h)
    | num k => simp only [eval] at h; cases h; exact .num k
    | empty => simp only [eval] at h; cases h; exact .record [] (by simp)
    | extend l e r =>
      obtain ⟨he, hr⟩ := ht
      simp only [eval] at h
      split at h
      · rename_i w fs hw hfs
        split at h
        · cases h
        · cases h
          have h1 := ih θ ρ e w he hρ hw
          have h2 := ih θ ρ r _ hr hρ hfs
          cases h2 with
          | record _ hf =>
            refine .record _ fun p hp => ?_
            simp only [List.mem_cons] at hp
            rcases hp with rfl | hp
            · exact h1
            · exact hf p hp
      · cases h
    | spread a b =>
      obtain ⟨ha, hb⟩ := ht
      simp only [eval] at h
      split at h
      · rename_i fa fb hfa hfb
        split at h
        · cases h
        · cases h
          cases ih θ ρ a _ ha hρ hfa with
          | record _ h1 =>
            cases ih θ ρ b _ hb hρ hfb with
            | record _ h2 =>
              refine .record _ fun p hp => ?_
              rcases List.mem_append.mp hp with hp | hp
              · exact h1 p hp
              · exact h2 p hp
      · cases h
    | field e l =>
      simp only [eval] at h
      split at h
      · rename_i fs hfs
        cases ih θ ρ e _ ht hρ hfs with
        | record _ hf => exact hf _ (mem_of_lookup h)
      · cases h
    | without e l =>
      simp only [eval] at h
      split at h
      · rename_i fs hfs
        cases h
        cases ih θ ρ e _ ht hρ hfs with
        | record _ hf =>
          exact .record _ fun p hp => hf p (List.mem_filter.mp hp).1
      · cases h
    | lam b => simp only [eval] at h; cases h; exact .clo ρ b hρ ht
    | app f a =>
      obtain ⟨hf, ha⟩ := ht
      simp only [eval] at h
      split at h
      · rename_i ρ' b w hc hw
        cases ih θ ρ f _ hf hρ hc with
        | clo _ _ hρ' hb =>
          refine ih θ (w :: ρ') b v hb (fun x hx => ?_) h
          simp only [List.mem_cons] at hx
          rcases hx with rfl | hx
          · exact ih θ ρ a x ha hρ hw
          · exact hρ' x hx
      · cases h
    | call f k a =>
      simp only [eval] at h
      split at h
      · rename_i w hw
        refine ih _ [w] _ v (hP f) (fun x hx => ?_) h
        simp only [List.mem_singleton] at hx
        subst hx
        exact ih θ ρ a x ht hρ hw
      · cases h
    | site k e =>
      simp only [eval, Option.map_eq_some_iff] at h
      obtain ⟨w, hw, rfl⟩ := h
      exact .shown w (ih θ ρ e w ht hρ hw)
    | ann k e =>
      simp only [eval] at h
      exact ih θ ρ e v ht hρ h
    | project k e => exact ht.elim

/-- R, run-time irrelevance: split variants, projection-free, agree on
every projection-free term at any keys, fuel and environment of
projection-free values. -/
theorem eval_split {P₁ P₂ : Prog Label B} (hv : SplitVariant P₁ P₂)
    (hP : ProgPF P₁) :
    ∀ (n : Nat) (θ₁ θ₂ : Assign Label B) (ρ : List (V Label))
      (t : Tm Label), PF t → (∀ w ∈ ρ, VPF w) →
      eval P₁ θ₁ n ρ t = eval P₂ θ₂ n ρ t := by
  obtain ⟨hb, _⟩ := hv
  have hP₂ : ProgPF P₂ := fun f => hb ▸ hP f
  intro n
  induction n with
  | zero => intros; simp [eval]
  | succ n ih =>
    intro θ₁ θ₂ ρ t ht hρ
    cases t with
    | var i => simp only [eval]
    | num k => simp only [eval]
    | empty => simp only [eval]
    | extend l e r =>
      simp only [eval]
      rw [ih θ₁ θ₂ ρ e ht.1 hρ, ih θ₁ θ₂ ρ r ht.2 hρ]
    | spread a b =>
      simp only [eval]
      rw [ih θ₁ θ₂ ρ a ht.1 hρ, ih θ₁ θ₂ ρ b ht.2 hρ]
    | field e l => simp only [eval]; rw [ih θ₁ θ₂ ρ e ht hρ]
    | without e l => simp only [eval]; rw [ih θ₁ θ₂ ρ e ht hρ]
    | lam b => simp only [eval]
    | app f a =>
      simp only [eval]
      rw [ih θ₁ θ₂ ρ f ht.1 hρ, ih θ₁ θ₂ ρ a ht.2 hρ]
      cases hf : eval P₂ θ₂ n ρ f with
      | none => rfl
      | some c =>
        cases ha : eval P₂ θ₂ n ρ a with
        | none => cases c <;> rfl
        | some w =>
          cases c with
          | clo ρ' b =>
            have hc := eval_vpf hP₂ n θ₂ ρ f _ ht.1 hρ hf
            have hw := eval_vpf hP₂ n θ₂ ρ a w ht.2 hρ ha
            cases hc with
            | clo _ _ hρ' hb' =>
              refine ih θ₁ θ₂ (w :: ρ') b hb' (fun x hx => ?_)
              simp only [List.mem_cons] at hx
              rcases hx with rfl | hx
              · exact hw
              · exact hρ' x hx
          | _ => rfl
    | call f k a =>
      simp only [eval]
      rw [ih θ₁ θ₂ ρ a ht hρ]
      cases ha : eval P₂ θ₂ n ρ a with
      | none => rfl
      | some w =>
        have hw := eval_vpf hP₂ n θ₂ ρ a w ht hρ ha
        simp only
        rw [hb]
        refine ih _ _ [w] _ (hP₂ f) (fun x hx => ?_)
        simp only [List.mem_singleton] at hx
        exact hx ▸ hw
    | site k e => simp only [eval]; rw [ih θ₁ θ₂ ρ e ht hρ]
    | ann k e => simp only [eval]; rw [ih θ₁ θ₂ ρ e ht hρ]
    | project k e => exact ht.elim

end Composition.SplitIrrelevance
