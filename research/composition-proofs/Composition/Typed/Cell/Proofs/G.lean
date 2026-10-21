/-
Proof stream G (proof-plan.md): concrete checks of the cell checker's
premises on `route`. `ScRoute` (Cell/Scenarios.lean): `route` is outside
`Accepts`, inside `ValidOpen`, and its cell certificate is accepted.
`CellShapeNeeded` (Cell/ScenariosMore.lean): `routeJunk`, `thetaFree`
with junk entries at cell `[1, 2]`, is a generic instance within the
problem's symbols (`hvRow` never reads `[1, 2]`, because every instance
keeps rows 1 and 2 disjoint), lacks the cell shape, and the accepted
certificate fails there. Non-vacuity: `route` has a pattern with an
instance.
-/
import Composition.Typed.Cell.ScenariosMore
import Composition.Typed.ExamplesValid
import Composition.Typed.Bridge.ProofExamples

namespace Composition.Typed.Cells.ProofsG

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

theorem ite_neg' {α : Type} {c : Prop} [Decidable c] (h : ¬ c) {a b : α} :
    (if c then a else b) = b := by simp [h]

/-- `route`'s rows of `routeJunk` agree with `thetaFree` off row 0, 2's
cell `[1, 2]`. -/
theorem junk_row (π : Pattern Label) (r : Nat) (k : CL Label) :
    (routeJunk (B := B) π).row r k =
      if (r = 0 ∨ r = 2) ∧ k = .inr [1, 2] then some emptyG
      else (thetaFree routeP π).row r k := rfl

omit [DecidableEq Label] in
/-- Cell `[1, 2]` is not free in `route`. -/
theorem not_free_12 :
    [1, 2] ∉ freeCells (routeP : SigProblem Label B) := by
  intro h
  exact (mem_freeCells.mp h).2.2 1 (by simp) 2 (by simp) (by simp [routeP])

theorem thetaFree_row_12 (π : Pattern Label) (r : Nat) :
    (thetaFree (routeP : SigProblem Label B) π).row r (.inr [1, 2]) =
      none := by
  show etaRow (routeP : SigProblem Label B) π (freeCells routeP) r
    (.inr [1, 2]) = none
  simp only [etaRow]
  rw [ite_neg' (fun h => not_free_12 h.1)]

/-- No instance of `route`'s `D` puts a label in cell `[1, 2]`. -/
theorem cellOf_ne_12 {θR : Assign Label B}
    (hD : Sat θR (routeP : SigProblem Label B).D) (k : Label) :
    cellOf (routeP : SigProblem Label B) θR k ≠ [1, 2] := by
  intro h
  have h1 : (1 : Nat) ∈ cellOf (routeP : SigProblem Label B) θR k := by
    rw [h]; simp
  have h2 : (2 : Nat) ∈ cellOf (routeP : SigProblem Label B) θR k := by
    rw [h]; simp
  have hd : Composition.Disjoint (θR.row 1) (θR.row 2) :=
    hD (.disjoint 1 2) (by simp [routeP])
  rcases hd k with h | h
  · exact (mem_cellOf.mp h1).2 h
  · exact (mem_cellOf.mp h2).2 h

/-- `hv` reads `routeJunk` as it reads `thetaFree`. -/
theorem hvRow_junk {θR : Assign Label B}
    (hD : Sat θR (routeP : SigProblem Label B).D) (ν : Val Label B)
    (π : Pattern Label) (r : Nat) :
    hvRow (routeP : SigProblem Label B) θR ν none
        ((routeJunk (B := B) π).row r) =
      hvRow routeP θR ν none ((thetaFree routeP π).row r) := by
  funext k
  simp only [hvRow, written_routeP, List.not_mem_nil, ite_false]
  split
  · rfl
  · rw [junk_row, ite_neg' (fun h => cellOf_ne_12 hD k (Sum.inr.inj h.2))]

theorem junk_fin (π : Pattern Label) (r : Nat) :
    FinG (.record ((routeJunk (B := B) π).row r)) := by
  obtain ⟨⟨ls, hls⟩, hk⟩ := (finG_record _).mp
    (eta_fin (P := (routeP : SigProblem Label B)) (π := π)
      (C := freeCells routeP) r)
  refine (finG_record _).mpr ⟨⟨.inr [1, 2] :: ls, fun k hk' => ?_⟩,
    fun k => ?_⟩
  · rw [junk_row] at hk'
    split at hk'
    · next h => rw [h.2]; exact List.mem_cons_self
    · exact List.mem_cons_of_mem _ (hls k hk')
  · rw [junk_row]
    split
    · exact finG_emptyG
    · exact hk k

theorem junk_sat (π : Pattern Label) :
    Sat (routeJunk (B := B) π) (cliftP (routeP : SigProblem Label B)).D := by
  intro a ha
  simp only [cliftP, routeP, List.map_cons, List.map_nil, List.mem_cons,
    List.not_mem_nil, or_false] at ha
  subst ha
  show Composition.Disjoint ((routeJunk π).row 1) ((routeJunk π).row 2)
  intro j
  by_cases hj : j = .inr [1, 2]
  · subst hj
    left
    rw [junk_row, ite_neg' (by simp)]
    exact thetaFree_row_12 π 1
  · rw [junk_row, junk_row, ite_neg' (by simp), ite_neg' (by simp [hj])]
    show etaRow (routeP : SigProblem Label B) π (freeCells routeP) 1 j = none ∨
      etaRow (routeP : SigProblem Label B) π (freeCells routeP) 2 j = none
    rcases j with l | S
    · left; simp [etaRow, written_routeP]
    · simp only [etaRow]
      by_cases h : S ∈ freeCells (routeP : SigProblem Label B) ∧ 1 ∈ S
      · right
        rw [ite_neg']
        intro h2
        exact (mem_freeCells.mp h.1).2.2 1 h.2 2 h2.2 (by simp [routeP])
      · left; rw [ite_neg' h]

theorem junk_generic (π : Pattern Label) :
    GenericInst (routeP : SigProblem Label B) π (routeJunk π) := by
  refine ⟨⟨fun n hn => by simp [routeP] at hn, fun r _ => junk_fin π r⟩,
    junk_sat π, fun r _ l hl => by simp [written_routeP] at hl,
    fun θR hD hπ => ⟨canonVal routeP θR, canonVal_fin,
      fun n hn => by simp [routeP] at hn, fun r hr => ?_⟩⟩
  rw [hvRow_junk hD]
  exact hvRow_eta hD hπ hr

theorem junk_within (π : Pattern Label) :
    WithinC (routeP : SigProblem Label B) (routeJunk π) := by
  refine ⟨fun n hn => by simp [routeP] at hn, fun r _ => ?_⟩
  obtain ⟨h1, h2⟩ := eta_within (P := (routeP : SigProblem Label B))
    (π := π) (C := freeCells routeP) r
  refine ⟨fun k hk => h1 k ?_, fun k => ?_⟩
  · rw [junk_row, ite_neg' (by simp)] at hk
    exact hk
  · rw [junk_row]
    split
    · simp [WithinO, WithinG, emptyG]
    · exact h2 k

theorem junk_not_shape (π : Pattern Label) :
    ¬ CellShape (routeP : SigProblem Label B) (routeJunk π) := by
  intro h
  have := h 0 (by simp [routeP]) [1, 2] (by simp [junk_row])
  simp at this

theorem junk_not_solves (π : Pattern Label) :
    ¬ CellSolves (routeP : SigProblem Label B) (routeJunk π) routeCert := by
  rintro ⟨-, hS⟩
  have h : Composition.Disjoint
      ((combine (cliftP (routeP : SigProblem Label B)) (routeJunk π)
        (cinst routeP (routeJunk π) routeCert)).row 4)
      ((combine (cliftP (routeP : SigProblem Label B)) (routeJunk π)
        (cinst routeP (routeJunk π) routeCert)).row 6) :=
    hS (cliftAtom (.disjoint 4 6)) (by simp [cliftP, routeP, cliftAtom])
  have h4 : (combine (cliftP (routeP : SigProblem Label B)) (routeJunk π)
      (cinst routeP (routeJunk π) routeCert)).row 4 =
      cvDenRowOf routeP (routeJunk π)
        (.record [] [⟨0, [], [[(1, true)]]⟩]) := rfl
  have h6 : (combine (cliftP (routeP : SigProblem Label B)) (routeJunk π)
      (cinst routeP (routeJunk π) routeCert)).row 6 =
      cvDenRowOf routeP (routeJunk π)
        (.record [] [⟨2, [], [[]]⟩]) := rfl
  rw [h4, h6] at h
  rcases h (.inr [1, 2]) with h | h <;>
    simp [routeP, cvDenRowOf, cpiecesRow, cpieceRow, union, cvDenFields,
      CellPiece.selects, cubeSat, junk_row, Row.empty] at h

end Composition.Typed.Cells.ProofsG

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

/-- `ScRoute`: `route` is outside `Accepts`, `ValidOpen`, and accepted. -/
theorem scRoute (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    ScRoute Label B :=
  ⟨rfl, SourceBoundary.routeSig_not_accepts, routeOpen, rfl⟩

/-- `CellShapeNeeded`: every conjunct, at every pattern with an instance
(the instance premise is not needed). -/
theorem cellShapeNeeded (Label B : Type) [DecidableEq Label]
    [DecidableEq B] : CellShapeNeeded Label B := fun π _ =>
  ⟨ProofsG.junk_generic π, ProofsG.junk_within π,
    ProofsG.junk_not_shape π, ProofsG.junk_not_solves π⟩

/-- Non-vacuity of `CellShapeNeeded`: `route` has a pattern with an
instance. -/
theorem routeP_hasInstance (Label B : Type) [DecidableEq Label]
    [DecidableEq B] : ∃ π, HasInstance (routeP : SigProblem Label B) π :=
  ⟨fun _ _ => false, Composition.Typed.routeP_hasInstance _⟩

end Composition.Typed.Cells
