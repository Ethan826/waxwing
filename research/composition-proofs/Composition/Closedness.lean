/-
R2′ proved: a pattern's problem mentions no row variable.
-/
import Composition.Pattern

namespace Composition.Syntax

open Composition

variable {Label B : Type}

theorem rowVarsF_patternFields (π : Nat → Label → Bool)
    (fresh : Nat → Label → Nat) (r : Nat) :
    ∀ L : List Label, rowVarsF (B := B) (patternFields π fresh r L) = []
  | [] => rfl
  | l :: ls => by
    by_cases hp : π r l = true
    · simp [patternFields, hp, rowVarsF, rowVarsT,
        rowVarsF_patternFields π fresh r ls]
    · simp [patternFields, hp, rowVarsF_patternFields π fresh r ls]

theorem rowVarsF_append :
    ∀ a b : Fields Label B, rowVarsF (a.append b) = rowVarsF a ++ rowVarsF b
  | .nil, _ => rfl
  | .cons _ t rest, b => by
    simp [Fields.append, rowVarsF, rowVarsF_append rest b]

section
variable {π : Nat → Label → Bool} {fresh : Nat → Label → Nat}
  {R : List Nat} {L : List Label}

theorem expandTails_pattern :
    ∀ tails : List Nat, (∀ r ∈ tails, r ∈ R) →
      (expandTails (patternSubst (B := B) π fresh R L) tails).2 = [] ∧
      rowVarsF (expandTails (patternSubst (B := B) π fresh R L) tails).1
        = []
  | [], _ => ⟨rfl, rfl⟩
  | r :: rs, h => by
    have ih := expandTails_pattern rs (fun x hx => h x (by simp [hx]))
    have hr := rowOf_pattern (B := B) (π := π) (fresh := fresh) (L := L)
      (h r (by simp))
    simp [expandTails, hr, ih, rowVarsF_append, rowVarsF_patternFields]

mutual
  theorem substT_closed :
      ∀ t : TExpr Label B, (∀ r ∈ rowVarsT t, r ∈ R) →
        rowVarsT (substT (patternSubst π fresh R L) t) = []
    | .base _, _ => rfl
    | .arrow t u, h => by
      simp [substT, rowVarsT,
        substT_closed t (fun r hr => h r (by simp [rowVarsT, hr])),
        substT_closed u (fun r hr => h r (by simp [rowVarsT, hr]))]
    | .tvar n, _ => by simp [substT, patternSubst, rowVarsT]
    | .record fs tails, h => by
      have he := expandTails_pattern (B := B) (π := π) (fresh := fresh)
        (L := L) tails (fun r hr => h r (by simp [rowVarsT, hr]))
      simp [substT, rowVarsT, rowVarsF_append, he.1, he.2,
        substF_closed fs (fun r hr => h r (by simp [rowVarsT, hr]))]

  theorem substF_closed :
      ∀ fs : Fields Label B, (∀ r ∈ rowVarsF fs, r ∈ R) →
        rowVarsF (substF (patternSubst π fresh R L) fs) = []
    | .nil, _ => rfl
    | .cons _ t rest, h => by
      simp [substF, rowVarsF,
        substT_closed t (fun r hr => h r (by simp [rowVarsF, hr])),
        substF_closed rest (fun r hr => h r (by simp [rowVarsF, hr]))]
end

theorem substAtom_closed [DecidableEq Label] (a : Atom Label B)
    (h : ∀ r ∈ atomRowVars a, r ∈ R) :
    ∀ b ∈ substAtom (patternSubst π fresh R L) a, atomRowVars b = [] := by
  cases a with
  | eq t u =>
    simp only [atomRowVars, List.mem_append] at h
    simp [substAtom, atomRowVars,
      substT_closed t (fun r hr => h r (Or.inl hr)),
      substT_closed u (fun r hr => h r (Or.inr hr))]
  | lacks r l =>
    have hr := rowOf_pattern (B := B) (π := π) (fresh := fresh) (L := L)
      (h r (by simp [atomRowVars]))
    intro b hb
    simp only [substAtom, hr, List.map_nil, List.append_nil] at hb
    split at hb <;> simp_all [atomRowVars]
  | disjoint r s =>
    have hr := rowOf_pattern (B := B) (π := π) (fresh := fresh) (L := L)
      (h r (by simp [atomRowVars]))
    have hs := rowOf_pattern (B := B) (π := π) (fresh := fresh) (L := L)
      (h s (by simp [atomRowVars]))
    intro b hb
    simp only [substAtom, hr, hs, List.map_nil, List.flatMap_nil,
      List.append_nil] at hb
    split at hb <;> simp_all [atomRowVars]
  | ff => simp [substAtom, atomRowVars]
end

/-- R2′. -/
theorem r2Closed [DecidableEq Label] : R2Closed Label B := by
  intro C fresh π
  unfold Closed patternProblem substProblem
  rw [rowVarsOf_eq, List.flatMap_eq_nil_iff]
  intro b hb
  simp only [List.mem_flatMap] at hb
  obtain ⟨a, ha, hb⟩ := hb
  refine substAtom_closed a (fun r hr => ?_) b hb
  rw [rowVarsOf_eq]
  exact List.mem_flatMap.mpr ⟨a, ha, hr⟩

end Composition.Syntax
