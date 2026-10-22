/-
Proof stream W1 (research/division-campaign/cellcheck/proof-plan.md,
wave 2): exactness of the cell computations. Proves QX1 `FreeSIff`
(`freeSIff`), QX2 `CellPossExact` (`cellPossExact`) and QX3
`CoverExact` (`coverExact`). The directions wave 1 proved are reused:
`ProofsC.freeS_of_free`, `ProofsC.cellPossS_complete` and
`coverS_sound`.
-/
import Composition.Typed.Cell.Proofs.C

namespace Composition.Typed.Cells.ProofsW1

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type}

/-! ### `freeS` -/

theorem free_of_freeS {P : SigProblem Label B} {S : Cell}
    (h : freeS P S = true) : FreeCell P S := by
  intro r hr s hs ha
  simp only [freeS, List.all_eq_true] at h
  have := h r hr s hs _ ha
  simp at this

/-! ### `cellPossS` is sound -/

/-- A filter of a list is one of its sublists. -/
theorem filter_mem_subsets {α : Type} (p : α → Bool) :
    ∀ l : List α, l.filter p ∈ subsets l
  | [] => by simp [subsets]
  | a :: l => by
    simp only [subsets, List.mem_append, List.mem_map]
    by_cases hp : p a = true
    · rw [List.filter_cons_of_pos hp]
      exact Or.inr ⟨_, filter_mem_subsets p l, rfl⟩
    · rw [List.filter_cons_of_neg hp]
      exact Or.inl (filter_mem_subsets p l)

/-- QX2's → direction: the least candidate witnesses `cellPossS`. -/
theorem cellPossS_sound (P : SigProblem Label B) (K : CellCube)
    (h : cellPossS P K = true) :
    ∃ S ∈ cellCands P, FreeCell P S ∧ cubeSat S K = true := by
  simp only [cellPossS, Bool.and_eq_true, Bool.not_eq_true',
    List.isEmpty_eq_false_iff, List.all_eq_true, Bool.or_eq_true,
    decide_eq_true_eq] at h
  obtain ⟨⟨⟨hne, hrig⟩, hcons⟩, hfree⟩ := h
  refine ⟨_, ?_, free_of_freeS hfree, ?_⟩
  · simp only [cellCands, List.mem_filter, decide_eq_true_eq]
    exact ⟨filter_mem_subsets _ _, hne⟩
  · refine ProofsC.cubeSat_iff.mpr fun e he => ?_
    rcases e with ⟨x, b⟩
    simp only [List.mem_filter, List.contains_iff_mem]
    cases b
    · simp only [Bool.false_eq_true, iff_false, not_and]
      intro _ hxt
      have := hcons x (List.mem_filter.mpr ⟨by assumption,
        List.contains_iff_mem.mpr hxt⟩)
      rw [List.contains_iff_mem.mpr he] at this
      exact absurd this (by decide)
    · simp only [iff_true]
      rcases hrig _ he with hb | hx
      · simp at hb
      · exact ⟨hx, he⟩

/-! ### `coverS` is complete -/

/-- The semantic cover property for one cube. -/
def Sem (P : SigProblem Label B) (r : Nat) (R : List CellCube)
    (K : CellCube) : Prop :=
  ∀ S ∈ cellCands P, FreeCell P S → r ∈ S → cubeSat S K = true →
    R.any (cubeSat S) = true

/-- The rows of `R` that `K` leaves open, with multiplicity. -/
def openRows (R : List CellCube) (K : CellCube) : List Nat :=
  (litRows R).filter fun x => !K.any (·.1 == x)

theorem openRows_lt (R : List CellCube) (K : CellCube) (x : Nat) (b : Bool)
    (hx : x ∈ openRows R K) :
    (openRows R ((x, b) :: K)).length < (openRows R K).length := by
  have heq : openRows R ((x, b) :: K) =
      (openRows R K).filter fun y => !(x == y) := by
    simp only [openRows, List.filter_filter, List.any_cons]
    congr 1
    funext y
    cases x == y <;> simp
  rw [heq, List.length_filter_lt_length_iff_exists]
  exact ⟨x, hx, by simp⟩

theorem mem_litRows {R : List CellCube} {K' : CellCube} {e : Nat × Bool}
    (hK' : K' ∈ R) (he : e ∈ K') : e.1 ∈ litRows R := by
  simp only [litRows, List.mem_flatMap, List.mem_map]
  exact ⟨K', hK', e, he, rfl⟩

theorem coverK_complete (P : SigProblem Label B) (r : Nat)
    (R : List CellCube) :
    ∀ (fuel : Nat) (K : CellCube), (openRows R K).length < fuel →
      Sem P r R K → coverK P r R fuel K = true := by
  intro fuel
  induction fuel with
  | zero => intro K h; exact absurd h (Nat.not_lt_zero _)
  | succ n ih =>
    intro K hlt hsem
    simp only [coverK, Bool.or_eq_true, Bool.not_eq_true']
    by_cases hposs : cellPossS P ((r, true) :: K) = true
    · split
      · -- every row `R` mentions is fixed by `K`: some cube subsumes
        rename_i hnone
        left; right
        obtain ⟨S, hS, hfree, hsat⟩ := cellPossS_sound P _ hposs
        obtain ⟨hrS, hKS⟩ := ProofsC.cubeSat_cons.mp hsat
        have hrS : r ∈ S := hrS.mpr rfl
        obtain ⟨K', hK', hS'⟩ :=
          List.any_eq_true.mp (hsem S hS hfree hrS hKS)
        refine List.any_eq_true.mpr ⟨K', hK', ?_⟩
        simp only [subsumesS, List.all_eq_true, Bool.not_eq_true']
        intro e he
        refine Bool.eq_false_iff.mpr fun hc => ?_
        obtain ⟨T, -, -, hT⟩ := cellPossS_sound P _ hc
        obtain ⟨-, hT⟩ := ProofsC.cubeSat_cons.mp hT
        obtain ⟨hTe, hTK⟩ := ProofsC.cubeSat_cons.mp hT
        have hm := List.find?_eq_none.mp hnone e.1 (mem_litRows hK' he)
        simp only [Bool.not_eq_true', Bool.not_eq_false] at hm
        obtain ⟨f, hf, hfe⟩ := List.any_eq_true.mp hm
        have hfe : f.1 = e.1 := by simpa using hfe
        have h1 := (ProofsC.cubeSat_iff.mp hKS) f hf
        have h2 := (ProofsC.cubeSat_iff.mp hTK) f hf
        have h3 := (ProofsC.cubeSat_iff.mp hS') e he
        rw [hfe] at h1 h2
        cases hb : e.2 <;> cases hfb : f.2 <;> simp_all
      · rename_i x hx
        right
        have hxo : x ∈ openRows R K := by
          simp only [openRows, List.mem_filter]
          have hp := List.find?_some hx
          exact ⟨List.mem_of_find?_eq_some hx, hp⟩
        have hsem' : ∀ b, Sem P r R ((x, b) :: K) := fun b S hS hf hr hs =>
          hsem S hS hf hr (ProofsC.cubeSat_cons.mp hs).2
        have hlt' : ∀ b, (openRows R ((x, b) :: K)).length < n := fun b =>
          Nat.lt_of_lt_of_le (openRows_lt R K x b hxo) (Nat.lt_succ_iff.mp hlt)
        simp only [Bool.and_eq_true]
        exact ⟨ih _ (hlt' true) (hsem' true), ih _ (hlt' false) (hsem' false)⟩
    · left; left; simpa using hposs

end Composition.Typed.Cells.ProofsW1

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq Label] [DecidableEq B] in
/-- QX1. -/
theorem freeSIff : FreeSIff (Label := Label) (B := B) := fun _ _ =>
  ⟨ProofsW1.free_of_freeS, ProofsC.freeS_of_free⟩

omit [DecidableEq Label] [DecidableEq B] in
/-- QX2. -/
theorem cellPossExact : CellPossExact (Label := Label) (B := B) :=
  fun P K hpos =>
    ⟨ProofsW1.cellPossS_sound P K,
     fun ⟨_, hS, hfree, hsat⟩ => ProofsC.cellPossS_complete P K hpos hS hfree hsat⟩

omit [DecidableEq Label] [DecidableEq B] in
/-- QX3. -/
theorem coverExact : CoverExact (Label := Label) (B := B) :=
  fun P r L R hr => by
    refine ⟨coverS_sound P r L R hr, fun h => ?_⟩
    simp only [coverS, List.all_eq_true]
    intro K hK
    refine ProofsW1.coverK_complete P r R _ K ?_ ?_
    · exact Nat.lt_succ_of_le (List.length_filter_le _ _)
    · intro S hS hfree hrS hsat
      exact h S hS hfree hrS (List.any_eq_true.mpr ⟨K, hK, hsat⟩)

end Composition.Typed.Cells
