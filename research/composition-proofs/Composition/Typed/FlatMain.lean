/-
D3b for flat row hypotheses (`D3bFlat`): `thetaFlat` satisfies `D`
(flat equations by `flat_eq_at`; `lacks`, `disjoint`, `ff` as in the
equation-free case, with occupied cells in place of free ones), has
pattern `π`, is finite and within the problem's symbols, and the
canonical valuation covers every instance: a row's class representative
has the same field as the row in every instance.
-/
import Composition.Typed.Flat

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {π : Pattern Label}

/-- `thetaFlat` satisfies `D`. -/
theorem sat_thetaFlat (hS : Scoped P) (hF : FlatD P) (hI : HasInstance P π) :
    Sat (thetaFlat P π) (cliftP P).D := by
  obtain ⟨θ0, hD0, hπ0⟩ := hI
  intro a ha
  simp only [cliftP, List.mem_map] at ha
  obtain ⟨a0, ha0, rfl⟩ := ha
  have hrig := scoped_rows hS ha0
  cases a0 with
  | eq t u =>
    obtain ⟨rs1, rs2, rfl, rfl⟩ := flatAtom_eq (hF _ ha0)
    exact holds_flat_iff.mpr fun j =>
      flat_eq_at hS ha0 ⟨θ0, hD0, hπ0⟩ j
  | ff => exact (hD0 _ ha0).elim
  | lacks r l =>
    have hl := lacks_written ha0
    have hp := hπ0 r (hrig r (by simp [rowVarsOf])) l hl
    rw [show θ0.row r l = none from hD0 _ ha0] at hp
    show flatRow P π r (.inl l) = none
    simp [flatRow, ← hp]
  | disjoint r s =>
    have h0 : Composition.Disjoint (θ0.row r) (θ0.row s) := hD0 _ ha0
    have hr := hrig r (by simp [rowVarsOf])
    have hs := hrig s (by simp [rowVarsOf])
    show Composition.Disjoint (flatRow P π r) (flatRow P π s)
    intro j
    cases j with
    | inl l =>
      by_cases hl : l ∈ written P
      · have h1 := flatRow_inl_isSome (π := π) (r := r) hl
        have h2 := flatRow_inl_isSome (π := π) (r := s) hl
        rw [← hπ0 r hr l hl] at h1
        rw [← hπ0 s hs l hl] at h2
        rcases h0 l with h | h
        · left
          rw [h] at h1
          cases hx : flatRow P π r (.inl l) <;> simp_all
        · right
          rw [h] at h2
          cases hx : flatRow P π s (.inl l) <;> simp_all
      · left
        simp [flatRow, hl]
    | inr S =>
      by_cases hS' : S ∈ occupiedCells P π
      · obtain ⟨_, _, θ1, hθ1, k1, _, hc1⟩ := mem_occupied.mp hS'
        have h1 : Composition.Disjoint (θ1.row r) (θ1.row s) := hθ1.1 _ ha0
        rcases h1 k1 with h | h
        · left
          have : r ∉ S := by
            rw [← hc1]
            simp [cellOf, h]
          simp [flatRow, this]
        · right
          have : s ∉ S := by
            rw [← hc1]
            simp [cellOf, h]
          simp [flatRow, this]
      · left
        simp [flatRow, hS']

/-- The flat rows map to the covered rows. -/
theorem hvRow_flat {θR : Assign Label B} (hθ : Inst P π θR) {r : Nat}
    (hr : r ∈ P.rigidRow) :
    hvRow P θR (canonVal P θR) none (flatRow P π r) = θR.row r := by
  funext k
  by_cases hw : k ∈ written P
  · have hp := hθ.2 r hr k hw
    obtain ⟨hm, hag⟩ := repBy_spec (agreeAt_equiv (P := P) (π := π) k).1 hr
    simp only [hvRow, hw, ↓reduceIte, flatRow, true_and]
    cases hπk : π r k
    · rw [hπk] at hp
      simp only [Bool.false_eq_true, ↓reduceIte, hvO]
      cases h : θR.row r k <;> simp_all
    · rw [hπk] at hp
      simp only [↓reduceIte, hvO, hv, canonVal, hm, hag θR hθ]
      exact getD_of_isSome hp
  · by_cases hc : cellOf P θR k = []
    · simp only [hvRow, hw, hc, ↓reduceIte]
      cases h : θR.row r k with
      | none => rfl
      | some v =>
        have : r ∈ cellOf P θR k := mem_cellOf.mpr ⟨hr, by simp [h]⟩
        rw [hc] at this
        cases this
    · obtain ⟨hm, hag⟩ := repBy_spec
        (agreeIn_equiv (P := P) (π := π) (cellOf P θR k)).1 hr
      simp only [hvRow, hw, hc, ↓reduceIte, flatRow,
        cellOf_occupied hθ hw hc, true_and]
      by_cases hrk : r ∈ cellOf P θR k
      · simp only [hrk, ↓reduceIte, hvO, hv, canonVal, hm,
          hag θR hθ k hw rfl]
        exact getD_of_isSome (Option.isSome_iff_ne_none.mpr
          (mem_cellOf.mp hrk).2)
      · simp only [hrk, ↓reduceIte, hvO]
        cases h : θR.row r k with
        | none => rfl
        | some v => exact absurd (mem_cellOf.mpr ⟨hr, by simp [h]⟩) hrk

theorem flatRow_fin (r : Nat) : FinG (.record (flatRow P π r)) := by
  refine (finG_record _).mpr ⟨⟨(written P).map .inl ++
    (occupiedCells P π).map .inr, fun j hj => ?_⟩, fun j => ?_⟩
  · cases j with
    | inl l =>
      simp only [flatRow] at hj
      split at hj
      · next h => exact List.mem_append_left _ (List.mem_map_of_mem h.1)
      · exact absurd rfl hj
    | inr S =>
      simp only [flatRow] at hj
      split at hj
      · next h => exact List.mem_append_right _ (List.mem_map_of_mem h.1)
      · exact absurd rfl hj
  · cases j <;> simp only [flatRow] <;> split <;> simp [FinO, FinG]

theorem flatRow_within (r : Nat) : WithinG P (.record (flatRow P π r)) := by
  refine ⟨fun k hk => ?_, fun j => ?_⟩
  · simp only [flatRow] at hk
    split at hk
    · next h => exact h.1
    · exact absurd rfl hk
  · cases j <;> simp only [flatRow] <;> split <;> simp [WithinO, WithinG]

/-- D3b for flat row hypotheses. -/
theorem d3bFlat : D3bFlat (Label := Label) (B := B) := by
  intro P π hS hF hI
  refine ⟨⟨⟨fun n _ => by simp [thetaFlat, FinG], fun r _ => flatRow_fin r⟩,
    sat_thetaFlat hS hF hI, fun r _ l hl => flatRow_inl_isSome hl,
    fun θR hD hπ => ?_⟩,
    ⟨fun n _ => by simp [thetaFlat, WithinG], fun r _ => flatRow_within r⟩⟩
  refine ⟨canonVal P θR, canonVal_fin, fun n hn => ?_, fun r hr =>
    hvRow_flat ⟨hD, hπ⟩ hr⟩
  simp [thetaFlat, hv, canonVal, hn]

end Composition.Typed
