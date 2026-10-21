/-
D3b for equation-free hypotheses (construction.md §8): when `D` has only
`lacks`, `disjoint` and `ff` atoms, the pre-instance over the cells with
no declared-disjoint pair, `thetaFree`, is a generic instance. No
unification is needed: every constant stays opaque, and the canonical
valuation reads each constant off the covered assignment, a cell
constant at the label that expands its cell.
-/
import Composition.Typed.Transfer

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B}

/-- The canonical valuation of `θR`. -/
def canonVal (P : SigProblem Label B) (θR : Assign Label B) :
    Val Label B
  | .T n, _ => if n ∈ P.rigidTy then θR.ty n else emptyG
  | .A r l, _ => if r ∈ P.rigidRow then (θR.row r l).getD emptyG else emptyG
  | .X r _, some k =>
    if r ∈ P.rigidRow then (θR.row r k).getD emptyG else emptyG
  | .X _ _, none => emptyG

omit [DecidableEq Label] in
theorem fin_field {θR : Assign Label B} (hR : RigidFin P θR) {r : Nat}
    (hr : r ∈ P.rigidRow) (k : Label) : FinG ((θR.row r k).getD emptyG) := by
  have := ((finG_record _).mp (hR.2 r hr)).2 k
  cases h : θR.row r k with
  | none => exact finG_emptyG
  | some g => rw [h] at this; exact this

omit [DecidableEq Label] in
theorem canonVal_fin {θR : Assign Label B} (hR : RigidFin P θR) :
    ∀ c κ, FinG (canonVal P θR c κ)
  | .T n, _ => by
    simp only [canonVal]
    split
    · next hn => exact hR.1 n hn
    · exact finG_emptyG
  | .A r l, _ => by
    simp only [canonVal]
    split
    · next hr => exact fin_field hR hr l
    · exact finG_emptyG
  | .X r _, some k => by
    simp only [canonVal]
    split
    · next hr => exact fin_field hR hr k
    · exact finG_emptyG
  | .X _ _, none => finG_emptyG

omit [DecidableEq Label] in
theorem getD_of_isSome {o : Option (G Label B)} {d : G Label B}
    (h : o.isSome = true) : some (o.getD d) = o := by
  cases o <;> simp_all

omit [DecidableEq Label] in
theorem mem_freeCells {S : Cell} :
    S ∈ freeCells P ↔ S ∈ subsets P.rigidRow ∧ S ≠ [] ∧ FreeCell P S := by
  simp only [freeCells, cellCands, List.mem_filter, decide_eq_true_eq,
    ne_eq]
  exact ⟨fun ⟨⟨a, b⟩, c⟩ => ⟨a, b, c⟩, fun ⟨a, b, c⟩ => ⟨⟨a, b⟩, c⟩⟩

omit [DecidableEq Label] in
theorem mem_cellOf {θR : Assign Label B} {k : Label} {r : Nat} :
    r ∈ cellOf P θR k ↔ r ∈ P.rigidRow ∧ θR.row r k ≠ none := by
  simp [cellOf, List.mem_filter, Option.isSome_iff_ne_none]

/-- An occupied cell of an instance satisfying `D` is a free cell. -/
theorem cellOf_free {θR : Assign Label B} (hD : Sat θR P.D) {k : Label}
    (hc : cellOf P θR k ≠ []) : cellOf P θR k ∈ freeCells P := by
  refine mem_freeCells.mpr ⟨filter_mem_subsets _ _, hc, ?_⟩
  intro r hr s hs hd
  rcases (hD _ hd : Composition.Disjoint (θR.row r) (θR.row s)) k with h | h
  · exact (mem_cellOf.mp hr).2 h
  · exact (mem_cellOf.mp hs).2 h

/-- The pre-instance's rows map to the covered rows. -/
theorem hvRow_eta {θR : Assign Label B} {π : Pattern Label}
    (hD : Sat θR P.D) (hπ : InPattern P π θR) {r : Nat}
    (hr : r ∈ P.rigidRow) :
    hvRow P θR (canonVal P θR) none (etaRow P π (freeCells P) r) =
      θR.row r := by
  funext k
  by_cases hw : k ∈ written P
  · have hp := hπ r hr k hw
    simp only [hvRow, hw, ↓reduceIte, etaRow, true_and]
    cases hπk : π r k
    · rw [hπk] at hp
      simp only [Bool.false_eq_true, ↓reduceIte, hvO]
      cases h : θR.row r k <;> simp_all
    · rw [hπk] at hp
      simp only [↓reduceIte, hvO, hv, canonVal, hr]
      exact getD_of_isSome hp
  · by_cases hc : cellOf P θR k = []
    · simp only [hvRow, hw, hc, ↓reduceIte]
      cases h : θR.row r k with
      | none => rfl
      | some v =>
        have : r ∈ cellOf P θR k := mem_cellOf.mpr ⟨hr, by simp [h]⟩
        rw [hc] at this
        cases this
    · simp only [hvRow, hw, hc, ↓reduceIte, etaRow, cellOf_free hD hc,
        true_and]
      by_cases hrk : r ∈ cellOf P θR k
      · simp only [hrk, ↓reduceIte, hvO, hv, canonVal, hr]
        exact getD_of_isSome (Option.isSome_iff_ne_none.mpr
          (mem_cellOf.mp hrk).2)
      · simp only [hrk, ↓reduceIte, hvO]
        cases h : θR.row r k with
        | none => rfl
        | some v => exact absurd (mem_cellOf.mpr ⟨hr, by simp [h]⟩) hrk

/-- The pre-instance is finite. -/
theorem eta_fin {π : Pattern Label} {C : List Cell} (r : Nat) :
    FinG (.record (etaRow P π C r)) := by
  refine (finG_record _).mpr ⟨⟨(written P).map .inl ++ C.map .inr,
    fun j hj => ?_⟩, fun j => ?_⟩
  · cases j with
    | inl l =>
      simp only [etaRow] at hj
      split at hj
      · next h => exact List.mem_append_left _ (List.mem_map_of_mem h.1)
      · exact absurd rfl hj
    | inr S =>
      simp only [etaRow] at hj
      split at hj
      · next h => exact List.mem_append_right _ (List.mem_map_of_mem h.1)
      · exact absurd rfl hj
  · cases j <;> simp only [etaRow] <;> split <;> simp [FinO, FinG]

/-- The pre-instance uses only written labels, cells and constants. -/
theorem eta_within {π : Pattern Label} {C : List Cell} (r : Nat) :
    WithinG P (.record (etaRow P π C r)) := by
  refine ⟨fun k hk => ?_, fun j => ?_⟩
  · simp only [etaRow] at hk
    split at hk
    · next h => exact h.1
    · exact absurd rfl hk
  · cases j <;> simp only [etaRow] <;> split <;> simp [WithinO, WithinG]

omit [DecidableEq Label] in
theorem lacks_written {r : Nat} {l : Label} (h : Atom.lacks r l ∈ P.D) :
    l ∈ written P := by
  simp only [written, labelsOf]
  exact List.mem_flatMap.mpr ⟨_, List.mem_append_left _ h, by simp⟩

omit [DecidableEq Label] in
theorem scoped_rows {a : Atom Label B} (hS : Scoped P) (ha : a ∈ P.D) :
    ∀ r ∈ rowVarsOf [a], r ∈ P.rigidRow := fun r hr =>
  hS.2 r (List.mem_flatMap.mpr ⟨a, ha, by simpa [rowVarsOf] using hr⟩)

/-- `thetaFree` satisfies an equation-free `D` that has an instance. -/
theorem sat_thetaFree {π : Pattern Label} (hS : Scoped P) (hE : EqFree P)
    (hI : HasInstance P π) : Sat (thetaFree P π) (cliftP P).D := by
  obtain ⟨θ0, hD0, hπ0⟩ := hI
  intro a ha
  simp only [cliftP, List.mem_map] at ha
  obtain ⟨a0, ha0, rfl⟩ := ha
  have hrig := scoped_rows hS ha0
  cases a0 with
  | eq t u => exact (hE _ ha0).elim
  | ff => exact (hD0 _ ha0).elim
  | lacks r l =>
    have hl := lacks_written ha0
    have hp := hπ0 r (hrig r (by simp [rowVarsOf])) l hl
    rw [show θ0.row r l = none from hD0 _ ha0] at hp
    show etaRow P π (freeCells P) r (.inl l) = none
    simp [etaRow, ← hp]
  | disjoint r s =>
    have h0 : Composition.Disjoint (θ0.row r) (θ0.row s) := hD0 _ ha0
    have hr := hrig r (by simp [rowVarsOf])
    have hs := hrig s (by simp [rowVarsOf])
    show Composition.Disjoint (etaRow P π (freeCells P) r)
      (etaRow P π (freeCells P) s)
    intro j
    cases j with
    | inl l =>
      by_cases hb : l ∈ written P ∧ π r l = true ∧ π s l = true
      · have h1 := hπ0 r hr l hb.1
        have h2 := hπ0 s hs l hb.1
        rw [hb.2.1] at h1
        rw [hb.2.2] at h2
        rcases h0 l with h | h <;> simp [h] at h1 h2
      · by_cases hrl : l ∈ written P ∧ π r l = true
        · right
          simp only [etaRow]
          split
          · next h => exact absurd ⟨h.1, hrl.2, h.2⟩ hb
          · rfl
        · left
          simp only [etaRow]
          split
          · next h => exact absurd h hrl
          · rfl
    | inr S =>
      by_cases hb : S ∈ freeCells P ∧ r ∈ S ∧ s ∈ S
      · exact ((mem_freeCells.mp hb.1).2.2 r hb.2.1 s hb.2.2 ha0).elim
      · by_cases hrS : S ∈ freeCells P ∧ r ∈ S
        · right
          simp only [etaRow]
          split
          · next h => exact absurd ⟨h.1, hrS.2, h.2⟩ hb
          · rfl
        · left
          simp only [etaRow]
          split
          · next h => exact absurd h hrS
          · rfl

/-- D3b for equation-free hypotheses. -/
theorem d3bEqFree : D3bEqFree (Label := Label) (B := B) := by
  intro P π hS hE hI
  refine ⟨⟨⟨fun n _ => by simp [thetaFree, eta, FinG], fun r _ => eta_fin r⟩,
    sat_thetaFree hS hE hI, fun r _ l hl => ?_, fun θR hD hπ => ?_⟩,
    ⟨fun n _ => by simp [thetaFree, eta, WithinG], fun r _ => eta_within r⟩⟩
  · show (etaRow P π (freeCells P) r (.inl l)).isSome = π r l
    cases h : π r l <;> simp [etaRow, hl, h]
  · refine ⟨canonVal P θR, canonVal_fin, fun n hn => ?_, fun r hr => ?_⟩
    · simp [thetaFree, eta, hv, canonVal, hn]
    · exact hvRow_eta hD hπ hr

end Composition.Typed
