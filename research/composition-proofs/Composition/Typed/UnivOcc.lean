/-
Every occupied cell is allowed (construction.md §6, step 1). Collapse
the instance onto its written labels and one unwritten label `k`, read
as `k`'s cell `S`, at every depth (`up` with `srcK`): the image is the
singleton-cell pre-instance under a substitution, and satisfies `D`.
-/
import Composition.Typed.CellIndep

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {π : Pattern Label}

open Classical in
/-- Read written labels as themselves and cell `S` from label `k`. -/
noncomputable def srcK (P : SigProblem Label B) (S : Cell) (k : Label) :
    CL Label → Option Label
  | .inl l => if l ∈ written P then some l else none
  | .inr S' => if S' = S then some k else none

theorem srcKOk {S : Cell} {k : Label} (hk : k ∉ written P) :
    UpOk P (srcK P S k) (.inl : B → CB Label B) := by
  refine ⟨fun l hl => by simp [srcK, hl], fun j l hl hj => ?_,
    fun _ _ => rfl⟩
  cases j with
  | inl l' =>
    simp only [srcK] at hj
    split at hj
    · cases hj; rfl
    · cases hj
  | inr S' =>
    simp only [srcK] at hj
    split at hj
    · cases hj; exact absurd hl hk
    · cases hj

/-- The unifier the instance gives for its cell `S` at label `k`. -/
noncomputable def cellUnifier (P : SigProblem Label B) (θR : Assign Label B)
    (S : Cell) (k : Label) : CSubst Label B
  | .T n => up (srcK P S k) .inl (θR.ty n)
  | .A r l => up (srcK P S k) .inl ((θR.row r l).getD emptyG)
  | .X r _ => up (srcK P S k) .inl ((θR.row r k).getD emptyG)

theorem thetaOf_cell {θR : Assign Label B} (hπ : InPattern P π θR)
    {k : Label} {r : Nat} (hr : r ∈ P.rigidRow) :
    (thetaOf P π [cellOf P θR k] (cellUnifier P θR (cellOf P θR k) k)).row r =
      upRow (srcK P (cellOf P θR k) k) .inl (θR.row r) := by
  funext j
  cases j with
  | inl l =>
    by_cases hl : l ∈ written P
    · have hp := hπ r hr l hl
      simp only [thetaOf, eta, etaRow, hl, true_and, upRow, srcK,
        ↓reduceIte]
      cases h : θR.row r l with
      | none => rw [h] at hp; simp [← hp, substO, upO]
      | some g =>
        rw [h] at hp
        simp [← hp, substO, substG, cellUnifier, h, upO]
    · simp [thetaOf, eta, etaRow, hl, upRow, srcK, substO]
  | inr S' =>
    by_cases hS : S' = cellOf P θR k
    · subst hS
      by_cases hrk : r ∈ cellOf P θR k
      · have hne := (mem_cellOf.mp hrk).2
        cases h : θR.row r k with
        | none => exact absurd h hne
        | some g =>
          simp [thetaOf, eta, etaRow, hrk, upRow, srcK, substO, substG,
            cellUnifier, h, upO]
      · have hnone : θR.row r k = none := by
          cases h : θR.row r k with
          | none => rfl
          | some _ => exact absurd (mem_cellOf.mpr ⟨hr, by simp [h]⟩) hrk
        simp [thetaOf, eta, etaRow, hrk, upRow, srcK, substO, hnone, upO]
    · simp [thetaOf, eta, etaRow, hS, upRow, srcK, substO]

/-- An occupied cell of an instance is allowed. -/
theorem occupied_allowed (hS : Scoped P) {θR : Assign Label B}
    (hD : Sat θR P.D) (hπ : InPattern P π θR) {k : Label}
    (hk : k ∉ written P) (hc : cellOf P θR k ≠ []) :
    cellOf P θR k ∈ allowedCells P π := by
  simp only [allowedCells, cellCands, List.mem_filter, decide_eq_true_eq]
  refine ⟨⟨filter_mem_subsets _ _, by simpa using hc⟩,
    cellUnifier P θR (cellOf P θR k) k, ?_⟩
  have hup : Sat (upAssign (srcK P (cellOf P θR k) k) .inl θR)
      (cliftP P).D := by
    intro a ha
    simp only [cliftP, List.mem_map] at ha
    obtain ⟨a0, ha0, rfl⟩ := ha
    exact holds_up (srcKOk hk) (List.mem_append_left _ ha0) (hD _ ha0)
  refine (sat_congr (fun n _ => ?_) (fun r hr => ?_)).mp hup
  · simp [thetaOf, eta, upAssign, substG, cellUnifier]
  · have hr' : r ∈ P.rigidRow := hS.2 r (by
      simpa [cliftP, rowVarsOf_clift] using hr)
    exact (thetaOf_cell hπ hr').symm

end Composition.Typed
