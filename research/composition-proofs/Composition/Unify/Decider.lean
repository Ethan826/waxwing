/-
R3 and the call-site decider. `decideClosed` checks that every atom is
an equation between well-formed sides and then unifies; on closed
problems it answers true exactly for the satisfiable ones (`r3`).
`decideCall` tries `decideClosed` on every enumerated pattern of a
call-site problem; it answers true exactly for the satisfiable ones
(`decideCall_correct`). Both are computable.
-/
import Composition.Unify.Complete

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- Every atom is an equation between well-formed sides. -/
def allWfEqB (C : Problem Label B) : Bool :=
  C.all fun
    | .eq t u => wfT t && wfT u
    | _ => false

omit [DecidableEq B] in
theorem allWfEqB_iff (C : Problem Label B) :
    allWfEqB C = true ↔ AllWfEq C := by
  simp only [allWfEqB, List.all_eq_true, AllWfEq]
  constructor
  · intro h a ha
    have := h a ha
    cases a with
    | eq t u =>
      simp only [Bool.and_eq_true] at this
      exact ⟨t, u, rfl, this.1, this.2⟩
    | _ => simp at this
  · intro h a ha
    obtain ⟨t, u, rfl, ht, hu⟩ := h a ha
    simp [ht, hu]

/-- The closed-problem decider. -/
def decideClosed (C : Problem Label B) : Bool :=
  if allWfEqB C then unify C else false

omit [DecidableEq B] in
theorem not_allWfEq_unsat {C : Problem Label B} (hc : Closed C)
    (h : ¬ AllWfEq C) : ¬ Satisfiable C := by
  rintro ⟨θ, hθ⟩
  apply h
  intro a ha
  have hrv : atomRowVars a = [] := by
    unfold Closed at hc
    rw [rowVarsOf_eq, List.flatMap_eq_nil_iff] at hc
    exact hc a ha
  have hh := hθ a ha
  cases a with
  | eq t u =>
    simp only [atomRowVars, List.append_eq_nil_iff] at hrv
    obtain ⟨g, h1, h2⟩ := hh
    exact ⟨t, u, rfl, defined_wf t hrv.1 h1, defined_wf u hrv.2 h2⟩
  | lacks r l => simp [atomRowVars] at hrv
  | disjoint r s => simp [atomRowVars] at hrv
  | ff => exact hh.elim

/-- R3: the decider meets the specification of dossier §10.3. -/
theorem r3 : R3Spec (decideClosed (Label := Label) (B := B)) := by
  intro C hc
  unfold decideClosed
  by_cases hw : allWfEqB C = true
  · have hw' := (allWfEqB_iff C).mp hw
    simp only [hw, ite_true]
    exact ⟨unify_sound C hw', unify_complete C hw'⟩
  · simp only [hw, Bool.false_eq_true, ite_false, false_iff]
    exact not_allWfEq_unsat hc (fun h => hw ((allWfEqB_iff C).mpr h))

/-- The call-site decider: try every enumerated pattern. -/
def decideCall (C : Problem Label B) : Bool :=
  (subsets (pairsOf C)).any fun S =>
    decideClosed (patternProblem C (patternOf S) (freshAlloc C))

/-- Call-site decidability: R2Enum, the fresh allocation, closedness
and R3, composed. -/
theorem decideCall_correct (C : Problem Label B) :
    decideCall C = true ↔ Satisfiable C := by
  rw [r2Enum C (freshAlloc C) (freshAlloc_fresh C), decideCall,
    List.any_eq_true]
  constructor
  · rintro ⟨S, hS, h⟩
    exact ⟨S, hS, (r3 _ (r2Closed C (freshAlloc C) (patternOf S))).mp h⟩
  · rintro ⟨S, hS, h⟩
    exact ⟨S, hS, (r3 _ (r2Closed C (freshAlloc C) (patternOf S))).mpr h⟩

end Composition.Syntax
