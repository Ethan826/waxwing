/-
Option-B soundness track: separation. Over an injective extension, one
back substitution tells apart any two different ground values, and
keeps a non-arrow (non-record) value so. Bases outside `j`'s image go
to `emptyG` or `arrow emptyG emptyG`, chosen at the first difference.
-/
import Composition.Typed.Bridge.ProofSoundBasic

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
theorem sep_base_nonbase {B₁ : Type} (j : B → B₁)
    (hj : Function.Injective j) (a : B₁) (t' : G Label B₁)
    (h : ∀ x, t' ≠ .base x) :
    ∃ s : B₁ → G Label B, BackSubst j s ∧ s a ≠ substBase s t' := by
  cases t' with
  | base x => exact absurd rfl (h x)
  | arrow p q =>
    refine ⟨backS j emptyG, backS_back j hj _, ?_⟩
    rcases backS_cases j (emptyG : G Label B) a with ⟨b, hb⟩ | hb <;>
      rw [hb] <;> simp [substBase, emptyG]
  | record f =>
    refine ⟨backS j (.arrow emptyG emptyG), backS_back j hj _, ?_⟩
    rcases backS_cases j (.arrow emptyG emptyG : G Label B) a with
      ⟨b, hb⟩ | hb <;> rw [hb] <;> simp [substBase]

omit [DecidableEq Label] in
open Classical in
theorem sep_base_base {B₁ : Type} (j : B → B₁) (hj : Function.Injective j)
    (a a' : B₁) (hne : a ≠ a') :
    ∃ s : B₁ → G Label B, BackSubst j s ∧ s a ≠ s a' := by
  let s : B₁ → G Label B := fun x =>
    if h : ∃ b, j b = x then .base (Classical.choose h)
    else if x = a then emptyG else .arrow emptyG emptyG
  have hback : BackSubst j s := by
    intro b
    have h : ∃ b', j b' = j b := ⟨b, rfl⟩
    simp only [s, h, dite_true]
    exact congrArg _ (hj (Classical.choose_spec h))
  refine ⟨s, hback, ?_⟩
  by_cases ha : ∃ b, j b = a
  · by_cases ha' : ∃ b, j b = a'
    · simp only [s, ha, ha', dite_true]
      intro heq
      apply hne
      have e := G.base.inj heq
      rw [← Classical.choose_spec ha, ← Classical.choose_spec ha', e]
    · simp only [s, ha, ha', dite_true, Ne.symm hne, ite_false]
      simp
  · by_cases ha' : ∃ b, j b = a'
    · simp only [s, ha, ha', dite_true, dite_false, ite_true]
      simp [emptyG]
    · simp only [s, ha, ha', dite_false, ite_true, Ne.symm hne, ite_false]
      simp [emptyG]

omit [DecidableEq Label] in
mutual
  theorem separate_aux {B₁ : Type} (j : B → B₁) (hj : Function.Injective j) :
      ∀ t t' : G Label B₁, t ≠ t' → ∃ s : B₁ → G Label B,
        BackSubst j s ∧ substBase s t ≠ substBase s t'
    | .base a, .base a', hne => by
      have : a ≠ a' := fun e => hne (e ▸ rfl)
      exact sep_base_base (Label := Label) j hj a a' this
    | .base a, .arrow p q, _ =>
      sep_base_nonbase j hj a _ (fun _ h => by cases h)
    | .base a, .record f, _ =>
      sep_base_nonbase j hj a _ (fun _ h => by cases h)
    | .arrow p q, .base a, _ => by
      obtain ⟨s, hs, hd⟩ := sep_base_nonbase j hj a (.arrow p q)
        (fun _ h => by cases h)
      exact ⟨s, hs, fun e => hd e.symm⟩
    | .record f, .base a, _ => by
      obtain ⟨s, hs, hd⟩ := sep_base_nonbase j hj a (.record f)
        (fun _ h => by cases h)
      exact ⟨s, hs, fun e => hd e.symm⟩
    | .arrow p q, .record f, _ => by
      obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ j hj
      exact ⟨s, hs, by simp [substBase]⟩
    | .record f, .arrow p q, _ => by
      obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ j hj
      exact ⟨s, hs, by simp [substBase]⟩
    | .arrow p q, .arrow p' q', hne => by
      by_cases hp : p = p'
      · have hq : q ≠ q' := fun e => hne (hp ▸ e ▸ rfl)
        obtain ⟨s, hs, hd⟩ := separate_aux j hj q q' hq
        exact ⟨s, hs, fun e => hd (by simp [substBase] at e; exact e.2)⟩
      · obtain ⟨s, hs, hd⟩ := separate_aux j hj p p' hp
        exact ⟨s, hs, fun e => hd (by simp [substBase] at e; exact e.1)⟩
    | .record f, .record f', hne => by
      have : ∃ k, f k ≠ f' k := by
        apply Classical.byContradiction
        intro h
        apply hne
        congr 1
        funext k
        exact Classical.byContradiction fun hk => h ⟨k, hk⟩
      obtain ⟨k, hk⟩ := this
      obtain ⟨s, hs, hd⟩ := separateO_aux j hj (f k) (f' k) hk
      exact ⟨s, hs, fun e => hd (by
        simp only [substBase] at e
        exact congrFun (G.record.inj e) k)⟩

  theorem separateO_aux {B₁ : Type} (j : B → B₁)
      (hj : Function.Injective j) :
      ∀ o o' : Option (G Label B₁), o ≠ o' → ∃ s : B₁ → G Label B,
        BackSubst j s ∧ substBaseO s o ≠ substBaseO s o'
    | none, none, h => absurd rfl h
    | none, some _, _ => by
      obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ j hj
      exact ⟨s, hs, by simp [substBaseO]⟩
    | some _, none, _ => by
      obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ j hj
      exact ⟨s, hs, by simp [substBaseO]⟩
    | some g, some g', h => by
      have : g ≠ g' := fun e => h (e ▸ rfl)
      obtain ⟨s, hs, hd⟩ := separate_aux j hj g g' this
      exact ⟨s, hs, fun e => hd (by simp [substBaseO] at e; exact e)⟩
end

omit [DecidableEq Label] in
theorem separate : Separate (Label := Label) (B := B) :=
  fun _ j hj t t' h => separate_aux j hj t t' h

omit [DecidableEq Label] in
theorem separateArrow : SeparateArrow (Label := Label) (B := B) := by
  intro B₁ j hj t ht
  cases t with
  | arrow a c => exact absurd rfl (ht a c)
  | record f =>
    obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ j hj
    exact ⟨s, hs, fun _ _ e => by simp [substBase] at e⟩
  | base x =>
    refine ⟨backS j emptyG, backS_back j hj _, fun a c => ?_⟩
    simp only [substBase]
    rcases backS_cases j (emptyG : G Label B) x with ⟨b, hb⟩ | hb <;>
      rw [hb] <;> simp [emptyG]

omit [DecidableEq Label] in
theorem separateRecord : SeparateRecord (Label := Label) (B := B) := by
  intro B₁ j hj t ht
  cases t with
  | record f => exact absurd rfl (ht f)
  | arrow a c =>
    obtain ⟨s, hs⟩ := backSubstExists (Label := Label) _ j hj
    exact ⟨s, hs, fun _ e => by simp [substBase] at e⟩
  | base x =>
    refine ⟨backS j (.arrow emptyG emptyG), backS_back j hj _, fun h => ?_⟩
    simp only [substBase]
    rcases backS_cases j (.arrow emptyG emptyG : G Label B) x with
      ⟨b, hb⟩ | hb <;> rw [hb] <;> simp

end Composition.Typed
