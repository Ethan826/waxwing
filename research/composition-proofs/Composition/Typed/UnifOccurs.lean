/-
The occurs check in the generic model: generic values are well-founded
trees (records may branch infinitely, but every path is finite), so no
value is a proper part of itself, and `c = u` with `c` occurring
properly in `u` has no unifier. This is Robinson's occurs check, proved
here for `CG` directly rather than taken from the finite-term setting.
-/
import Composition.Typed.Unif

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type}

/-- `w` is a proper part of `h`. -/
inductive PSub : CG Label B → CG Label B → Prop
  | arrowL0 {a b : CG Label B} : PSub a (.arrow a b)
  | arrowR0 {a b : CG Label B} : PSub b (.arrow a b)
  | rec0 {a : CG Label B} {f : Row (CL Label) (CG Label B)} (j : CL Label) :
      f j = some a → PSub a (.record f)
  | arrowL {w a b : CG Label B} : PSub w a → PSub w (.arrow a b)
  | arrowR {w a b : CG Label B} : PSub w b → PSub w (.arrow a b)
  | recI {w a : CG Label B} {f : Row (CL Label) (CG Label B)} (j : CL Label) :
      f j = some a → PSub w a → PSub w (.record f)

theorem psub_trans {w h k : CG Label B} (h₁ : PSub w h) (h₂ : PSub h k) :
    PSub w k := by
  induction h₂ with
  | arrowL0 => exact .arrowL h₁
  | arrowR0 => exact .arrowR h₁
  | rec0 j hj => exact .recI j hj h₁
  | arrowL _ ih => exact .arrowL (ih h₁)
  | arrowR _ ih => exact .arrowR (ih h₁)
  | recI j hj _ ih => exact .recI j hj (ih h₁)

mutual
  theorem psub_acc : ∀ k : CG Label B, Acc PSub k
    | .base _ => .intro _ fun _ hw => by cases hw
    | .arrow a b => .intro _ fun w hw => by
      cases hw with
      | arrowL0 => exact psub_acc a
      | arrowR0 => exact psub_acc b
      | arrowL p => exact (psub_acc a).inv p
      | arrowR p => exact (psub_acc b).inv p
    | .record f => .intro _ fun w hw => by
      cases hw with
      | rec0 j hj => exact psubO_acc (f j) hj
      | recI j hj p => exact (psubO_acc (f j) hj).inv p

  theorem psubO_acc : ∀ (o : Option (CG Label B)) {a : CG Label B},
      o = some a → Acc PSub a
    | none, _, ho => by cases ho
    | some g, _, ho => by
      injection ho with ho
      subst ho
      exact psub_acc g
end

theorem psub_irrefl (h : CG Label B) : ¬ PSub h h := by
  induction psub_acc h with
  | intro k _ ih => exact fun hp => ih k hp hp

mutual
  theorem occ_psub {τ : CSubst Label B} {x : CConst Label} :
      ∀ u : CG Label B, Occ x u → u = cv x ∨ PSub (τ x) (substG τ u)
    | .base (.inl _), h => by simp [Occ] at h
    | .base (.inr d), h => by simp only [Occ] at h; subst h; exact Or.inl rfl
    | .arrow a b, h => by
      right
      simp only [substG]
      rcases h with h | h
      · rcases occ_psub (τ := τ) a h with rfl | p
        · exact .arrowL0
        · exact .arrowL p
      · rcases occ_psub (τ := τ) b h with rfl | p
        · exact .arrowR0
        · exact .arrowR p
    | .record f, ⟨j, hj⟩ => by
      right
      rw [substG_record]
      obtain ⟨a, ha, e⟩ := occO_psub (τ := τ) (f j) hj
      have hj' : substO τ (f j) = some (substG τ a) := by simp [ha, substO]
      rcases e with rfl | p
      · exact .rec0 j hj'
      · exact .recI j hj' p

  theorem occO_psub {τ : CSubst Label B} {x : CConst Label} :
      ∀ o : Option (CG Label B), OccO x o →
        ∃ a, o = some a ∧ (a = cv x ∨ PSub (τ x) (substG τ a))
    | none, h => by simp [OccO] at h
    | some g, h => ⟨g, rfl, occ_psub (τ := τ) g h⟩
end

/-- The occurs check: `x = u` has no unifier when `x` occurs in `u` and
`u` is not `x` itself. -/
theorem occurs_no_unifier {τ : CSubst Label B} {x : CConst Label}
    {u : CG Label B} (ho : Occ x u) (hne : u ≠ cv x) :
    τ x ≠ substG τ u := by
  intro he
  rcases occ_psub (τ := τ) u ho with h | p
  · exact hne h
  · rw [← he] at p
    exact psub_irrefl _ p

end Composition.Typed
