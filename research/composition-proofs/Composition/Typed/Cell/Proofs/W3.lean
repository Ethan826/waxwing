/-
Cell checker, wave 2 proof stream W3 (region exactness, cells): QR3
`CellBothExact` and QR4 `CoverRegionExact`, from W1's QX2
`CellPossExact` and QX3 `CoverExact` respectively. Plan:
research/division-campaign/cellcheck/proof-plan.md ("Wave 2").

The ← direction of each reads the region through `CellShape` and uses
wave 1's `cellPossS_complete` / `coverS_sound`. The → direction needs a
region point occupying a given free candidate cell: `thetaFree P π`
with `π` the empty pattern, whose instance is the all-empty assignment
(the fragment has only `lacks` and `disjoint`), occupies every free
candidate cell of every row containing it, and is in the region by
`coverFree`.
-/
import Composition.Typed.Cell.Exact
import Composition.Typed.Cell.Proofs.C
import Composition.Typed.Cell.Proofs.D

namespace Composition.Typed.Cells.ProofsW3

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- On the fragment, the empty pattern has an instance: every row
empty. -/
theorem hasInstance_empty {P : SigProblem Label B} (hF : LDFragment P) :
    HasInstance P (fun _ _ => false) := by
  refine ⟨⟨fun _ => emptyG, fun _ => Row.empty⟩, ?_, ?_⟩
  · intro a ha
    rcases hF a ha with ⟨r, l, rfl, _⟩ | ⟨r, s, rfl, _, _⟩
    · rfl
    · intro _; exact Or.inl rfl
  · intro _ _ _ _; rfl

omit [DecidableEq B] in
/-- On the fragment, some point of the region occupies, in every row it
contains, every free candidate cell. -/
theorem region_point {P : SigProblem Label B} (hF : LDFragment P) :
    ∃ θs, InCellRegion P θs ∧ ∀ S ∈ cellCands P, FreeCell P S →
      ∀ r ∈ S, θs.row r (.inr S) ≠ none := by
  have hI := hasInstance_empty hF
  obtain ⟨hG, hW, hC⟩ := coverFree P _ hF hI
  refine ⟨thetaFree P (fun _ _ => false), ⟨_, hI, hG, hW, hC⟩, ?_⟩
  intro S hS hfree r hr
  have hS' : S ∈ freeCells P := by
    simp only [cellCands, List.mem_filter, decide_eq_true_eq] at hS
    exact mem_freeCells.mpr ⟨hS.1, hS.2, hfree⟩
  simp [thetaFree, eta, etaRow, hS', hr]

end Composition.Typed.Cells.ProofsW3

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
/-- QR3, from QX2. -/
theorem cellBothExact_of (h2 : CellPossExact (Label := Label) (B := B)) :
    CellBothExact (Label := Label) (B := B) := by
  intro P r s K hF hr hs
  show cellPossS P ((r, true) :: (s, true) :: K) = true ↔ _
  constructor
  · intro h
    obtain ⟨S, hS, hfree, hsat⟩ :=
      (h2 P _ ⟨r, List.mem_cons_self⟩).mp h
    obtain ⟨hrS, hsat⟩ := ProofsC.cubeSat_cons.mp hsat
    obtain ⟨hsS, hsat⟩ := ProofsC.cubeSat_cons.mp hsat
    obtain ⟨θs, hθ, hocc⟩ := ProofsW3.region_point hF
    exact ⟨θs, hθ, S, hsat, hocc S hS hfree r (hrS.mpr rfl),
      hocc S hS hfree s (hsS.mpr rfl)⟩
  · rintro ⟨θs, ⟨_, _, _, _, hC⟩, S, hsat, hrS, hsS⟩
    obtain ⟨hS, hfree, hr'⟩ :=
      hC r hr S (Option.isSome_iff_ne_none.mpr hrS)
    obtain ⟨_, _, hs'⟩ := hC s hs S (Option.isSome_iff_ne_none.mpr hsS)
    refine ProofsC.cellPossS_complete P _ ⟨r, List.mem_cons_self⟩ hS hfree ?_
    exact ProofsC.cubeSat_cons.mpr ⟨by simp [hr'],
      ProofsC.cubeSat_cons.mpr ⟨by simp [hs'], hsat⟩⟩

omit [DecidableEq B] in
/-- QR4, from QX3. -/
theorem coverRegionExact_of (h3 : CoverExact (Label := Label) (B := B)) :
    CoverRegionExact (Label := Label) (B := B) := by
  intro P r L R hF hr
  show coverS P r L R = true ↔ _
  constructor
  · rintro h θs ⟨_, _, _, _, hC⟩ S hrS hL
    obtain ⟨hS, hfree, hr'⟩ :=
      hC r hr S (Option.isSome_iff_ne_none.mpr hrS)
    exact coverS_sound P r L R hr h S hS hfree hr' hL
  · intro h
    refine (h3 P r L R hr).mpr fun S hS hfree hrS hL => ?_
    obtain ⟨θs, hθ, hocc⟩ := ProofsW3.region_point hF
    exact h θs hθ S (hocc S hS hfree r hrS) hL

end Composition.Typed.Cells
