/-
R2 proved. Each direction builds an assignment that satisfies the
chosen pattern's binding equations and applies the pointwise
correspondence `subst_sat`; the global `binding_correspondence` does
not apply, because one pattern's equations are not entailed by `C`.
Forward: restrict a solution (R1), read the pattern and the fresh
variables' values off it. Backward: give each row variable the row its
pattern's fields evaluate to; the pattern's problem is closed (R2′), so
changing rows does not affect it.
-/
import Composition.Closedness

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem evalT_tail (θ : Assign Label B) (r : Nat) :
    evalT θ (.record .nil [r]) = some (.record (θ.row r)) := by
  rw [evalT_record]
  simp [fieldRows, composeAll_single]

theorem sat_eqs_pattern {θ : Assign Label B} {π : Nat → Label → Bool}
    {fresh : Nat → Label → Nat} {R : List Nat} {L : List Label}
    (hn : L.Nodup) (h : ∀ r ∈ R, θ.row r = patRow θ π fresh r L) :
    Sat θ (eqs (patternSubst π fresh R L)) := by
  intro a ha
  simp only [eqs, patternSubst, List.map_nil, List.nil_append,
    List.map_map, List.mem_map, Function.comp_def] at ha
  obtain ⟨r, hr, rfl⟩ := ha
  exact ⟨_, evalT_tail θ r, by rw [evalT_pattern θ π fresh r L hn, h r hr]⟩

omit [DecidableEq Label] in
theorem mem_pairsOf {C : Problem Label B} {r : Nat} {l : Label}
    [DecidableEq Label] :
    (r, l) ∈ pairsOf C ↔ r ∈ rowVarsOf C ∧ l ∈ labelsOf C := by
  simp [pairsOf, labs, mem_dedup]

/-- The forward assignment: fresh variables take the restricted
solution's field types. -/
def forwardAssign (C : Problem Label B) (fresh : Nat → Label → Nat)
    (θ : Assign Label B) : Assign Label B :=
  ⟨fun n =>
    match (pairsOf C).find? (fun p => fresh p.1 p.2 == n) with
    | some p => (θ.row p.1 p.2).getD (θ.ty n)
    | none => θ.ty n,
   θ.row⟩

theorem r2_forward {C : Problem Label B} {fresh : Nat → Label → Nat}
    (hF : FreshFor C fresh) (h : Satisfiable C) :
    ∃ π, Satisfiable (patternProblem C π fresh) := by
  obtain ⟨θ1, hw, hs⟩ := (r1 C).mp h
  let π : Nat → Label → Bool := fun r l => (θ1.row r l).isSome
  let θ2 := forwardAssign C fresh θ1
  have hfind : ∀ n ∈ tyVarsOf C,
      (pairsOf C).find? (fun p => fresh p.1 p.2 == n) = none := by
    intro n hn
    refine List.find?_eq_none.mpr fun p hp he => ?_
    have ⟨h1, h2⟩ := mem_pairsOf.mp hp
    simp only [beq_iff_eq] at he
    exact hF.2 p.1 h1 p.2 h2 (he ▸ hn)
  have hs2 : Sat θ2 C := (sat_congr (θ := θ1) (θ' := θ2)
    (fun n hn => by simp [θ2, forwardAssign, hfind n hn])
    (fun _ _ => rfl)).mp hs
  have hrow : ∀ r ∈ rowVarsOf C,
      θ2.row r = patRow θ2 π fresh r (labs C) := by
    intro r hr
    funext l
    simp only [patRow]
    by_cases hl : l ∈ labs C
    · have hlC : l ∈ labelsOf C := mem_dedup.mp hl
      cases hv : θ1.row r l with
      | none => simp [θ2, forwardAssign, π, hv]
      | some g =>
        have hp : (r, l) ∈ pairsOf C := mem_pairsOf.mpr ⟨hr, hlC⟩
        cases hf : (pairsOf C).find? (fun p => fresh p.1 p.2 == fresh r l)
          with
        | none =>
          exact absurd (List.find?_eq_none.mp hf _ hp) (by simp)
        | some p =>
          have hpm := List.mem_of_find?_eq_some hf
          have hpe := List.find?_some hf
          simp only [beq_iff_eq] at hpe
          have ⟨h1, h2⟩ := mem_pairsOf.mp hpm
          obtain ⟨rfl, rfl⟩ := hF.1 p.1 h1 p.2 h2 r hr l hlC hpe
          simp [θ2, forwardAssign, π, hv, hf, hl]
    · have hnone : θ1.row r l = none := by
        cases hv : θ1.row r l with
        | none => rfl
        | some g =>
          exact absurd (mem_dedup.mpr (hw.2.1 r l (by simp [hv]))) hl
      simp [θ2, forwardAssign, hl, hnone]
  have he := sat_eqs_pattern (nodup_dedup _) hrow
  exact ⟨π, θ2, (subst_sat he C).mp hs2⟩

theorem r2_backward {C : Problem Label B} {fresh : Nat → Label → Nat}
    {π : Nat → Label → Bool}
    (h : Satisfiable (patternProblem C π fresh)) : Satisfiable C := by
  obtain ⟨θ, hs⟩ := h
  let θ3 : Assign Label B := ⟨θ.ty, fun r => patRow θ π fresh r (labs C)⟩
  have he : Sat θ3 (eqs (patternSubst π fresh (rowVarsOf C) (labs C))) :=
    sat_eqs_pattern (nodup_dedup _) (fun _ _ => rfl)
  have hc : rowVarsOf (patternProblem C π fresh) = [] := r2Closed C fresh π
  have hs3 : Sat θ3 (patternProblem C π fresh) :=
    (sat_congr (θ := θ) (θ' := θ3) (fun _ _ => rfl)
      (fun r hr => by rw [hc] at hr; simp at hr)).mp hs
  exact ⟨θ3, (subst_sat he C).mpr hs3⟩

/-- R2. -/
theorem r2 : R2 Label B := fun _ _ hF =>
  ⟨r2_forward hF, fun ⟨_, h⟩ => r2_backward h⟩

end Composition.Syntax
