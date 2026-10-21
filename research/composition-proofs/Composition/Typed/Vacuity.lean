/-
Vacuity (`InstanceIffUnifiable`): a pattern has an instance satisfying
`D` iff `D` is unifiable on the pre-instance with no cell. From a
unifier, `hv` at the empty rigid assignment (every unwritten label and
constant dropped or emptied) gives an instance; from an instance,
dropping its unwritten labels (`up`) gives a unifier.
-/
import Composition.Typed.LiftCommute
import Composition.Typed.EqFree

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {π : Pattern Label}

omit [DecidableEq Label] in
mutual
  theorem rowVarsT_clift : ∀ t : TExpr Label B,
      rowVarsT (cliftT t) = rowVarsT t
    | .base _ => rfl
    | .arrow t u => by simp [cliftT, rowVarsT, rowVarsT_clift t,
        rowVarsT_clift u]
    | .tvar _ => rfl
    | .record fs tails => by simp [cliftT, rowVarsT, rowVarsF_clift fs]

  theorem rowVarsF_clift : ∀ fs : Fields Label B,
      rowVarsF (cliftF fs) = rowVarsF fs
    | .nil => rfl
    | .cons _ t rest => by simp [cliftF, rowVarsF, rowVarsT_clift t,
        rowVarsF_clift rest]
end

omit [DecidableEq Label] in
theorem rowVarsOf_clift (C : Problem Label B) :
    rowVarsOf (C.map cliftAtom) = rowVarsOf C := by
  induction C with
  | nil => rfl
  | cons a C ih =>
    cases a <;> simp_all [rowVarsOf, cliftAtom, rowVarsT_clift]

/-- Keep written labels, drop every other. -/
def dropSrc (P : SigProblem Label B) : CL Label → Option Label
  | .inl k => if k ∈ written P then some k else none
  | .inr _ => none

theorem dropOk : UpOk P (dropSrc P) (.inl : B → CB Label B) := by
  refine ⟨fun l hl => by simp [dropSrc, hl], fun j l hl hj => ?_,
    fun _ _ => rfl⟩
  cases j with
  | inl k =>
    simp only [dropSrc] at hj
    split at hj
    · cases hj; rfl
    · cases hj
  | inr _ => cases hj

/-- The unifier an instance gives. -/
noncomputable def instUnifier (P : SigProblem Label B) (θR : Assign Label B) :
    CSubst Label B
  | .T n => up (dropSrc P) .inl (θR.ty n)
  | .A r l => up (dropSrc P) .inl ((θR.row r l).getD emptyG)
  | .X _ _ => .record fun _ => none

theorem thetaOf_inst {θR : Assign Label B} (hπ : InPattern P π θR)
    {r : Nat} (hr : r ∈ P.rigidRow) :
    (thetaOf P π [] (instUnifier P θR)).row r =
      upRow (dropSrc P) .inl (θR.row r) := by
  funext j
  cases j with
  | inl l =>
    by_cases hl : l ∈ written P
    · have hp := hπ r hr l hl
      simp only [thetaOf, eta, etaRow, hl, true_and, upRow, dropSrc,
        ↓reduceIte]
      cases h : θR.row r l with
      | none =>
        rw [h] at hp
        simp [← hp, substO, upO]
      | some g =>
        rw [h] at hp
        simp [← hp, substO, substG, instUnifier, h, upO]
    · simp [thetaOf, eta, etaRow, hl, upRow, dropSrc, substO]
  | inr S => simp [thetaOf, eta, etaRow, upRow, dropSrc, substO]

/-- Vacuity. -/
theorem instanceIffUnifiable :
    InstanceIffUnifiable (Label := Label) (B := B) := by
  intro P π hS
  constructor
  · rintro ⟨θR, hD, hπ⟩
    refine ⟨instUnifier P θR, ?_⟩
    have hup : Sat (upAssign (dropSrc P) .inl θR) (cliftP P).D := by
      intro a ha
      simp only [cliftP, List.mem_map] at ha
      obtain ⟨a0, ha0, rfl⟩ := ha
      exact holds_up dropOk (List.mem_append_left _ ha0) (hD _ ha0)
    refine (sat_congr (fun n _ => ?_) (fun r hr => ?_)).mp hup
    · simp [thetaOf, eta, upAssign, substG, instUnifier]
    · have hr' : r ∈ P.rigidRow := hS.2 r (by
        simpa [cliftP, rowVarsOf_clift] using hr)
      exact (thetaOf_inst hπ hr').symm
  · rintro ⟨τ, hτ⟩
    let θ0 : Assign Label B := ⟨fun _ => emptyG, fun _ _ => none⟩
    refine ⟨hvAssign P θ0 (fun _ _ => emptyG) (thetaOf P π [] τ),
      fun a ha => ?_, fun r _ l hl => ?_⟩
    · exact holds_hv a (labels_of_mem (List.mem_append_left _ ha))
        (hτ _ (List.mem_map_of_mem ha))
    · show (hvRow P θ0 _ none (thetaOf P π [] τ |>.row r) l).isSome = π r l
      cases h : π r l <;>
        simp [hvRow, hl, thetaOf, eta, etaRow, h, substO, hvO]

end Composition.Typed
