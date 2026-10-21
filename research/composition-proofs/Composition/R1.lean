/-
R1 proved: a call-site problem with a solution has one whose rows, at
every depth, use only the labels written in the problem.
-/
import Composition.Restrict

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

mutual
  theorem within_restrictG (L : List Label) :
      ∀ g : G Label B, Within L (restrictG L g)
    | .base b => by simp only [restrictG]; exact .base b
    | .arrow a c => by
      simp only [restrictG]
      exact .arrow (within_restrictG L a) (within_restrictG L c)
    | .record f => by
      rw [restrictG_record]
      refine .record (fun l h => ?_) (fun l g h => ?_)
      · by_cases hl : l ∈ L
        · exact hl
        · simp [rrow, hl] at h
      · by_cases hl : l ∈ L
        · simp only [rrow, hl, ite_true] at h
          exact within_restrictO L (f l) g h
        · simp [rrow, hl] at h

  theorem within_restrictO (L : List Label) :
      ∀ (o : Option (G Label B)) (g : G Label B),
        restrictO L o = some g → Within L g
    | none, g, h => by simp [restrictO] at h
    | some g0, g, h => by
      simp only [restrictO, Option.some.injEq] at h
      subst h
      exact within_restrictG L g0
end

theorem assignWithin_restrict (L : List Label) (θ : Assign Label B) :
    AssignWithin L (restrictA L θ) := by
  refine ⟨fun n => within_restrictG L _, fun r l h => ?_, fun r l g h => ?_⟩
  · by_cases hl : l ∈ L
    · exact hl
    · simp [restrictA, rrow, hl] at h
  · by_cases hl : l ∈ L
    · simp only [restrictA, rrow, hl, ite_true] at h
      exact within_restrictO L _ g h
    · simp [restrictA, rrow, hl] at h

/-- Labels an atom writes. -/
def atomLabels : Atom Label B → List Label
  | .eq t u => labelsT t ++ labelsT u
  | .lacks _ l => [l]
  | .disjoint _ _ => []
  | .ff => []

theorem holds_restrict {L : List Label} {θ : Assign Label B}
    (a : Atom Label B) (hl : ∀ l ∈ atomLabels a, l ∈ L)
    (h : Holds θ a) : Holds (restrictA L θ) a := by
  cases a with
  | eq t u =>
    obtain ⟨g, ht, hu⟩ := h
    refine ⟨restrictG L g, evalT_restrict t (fun l hm => hl l ?_) ht,
      evalT_restrict u (fun l hm => hl l ?_) hu⟩ <;>
      simp [atomLabels, hm]
  | lacks r l => exact rrow_none h
  | disjoint r s => exact rrow_disjoint h
  | ff => exact h

omit [DecidableEq Label] in
theorem atomLabels_sub {C : Problem Label B} {a : Atom Label B}
    (ha : a ∈ C) : ∀ l ∈ atomLabels a, l ∈ labelsOf C := by
  intro l hl
  simp only [labelsOf, List.mem_flatMap]
  refine ⟨a, ha, ?_⟩
  cases a <;> first
    | (simp [atomLabels] at hl; done)
    | simpa [atomLabels] using hl

/-- R1. -/
theorem r1 : R1 Label B := by
  intro C
  constructor
  · rintro ⟨θ, h⟩
    refine ⟨restrictA (labelsOf C) θ, assignWithin_restrict _ θ,
      fun a ha => holds_restrict a (atomLabels_sub ha) (h a ha)⟩
  · rintro ⟨θ, _, h⟩
    exact ⟨θ, h⟩

end Composition.Syntax
