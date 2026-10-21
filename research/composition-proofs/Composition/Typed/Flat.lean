/-
D3b for flat row hypotheses (`r = s`, `r = s ⊎ t`, with `lacks`,
`disjoint`, `ff`): `thetaFlat` is a generic instance. Each generic label
is checked against an instance with the same presence there: `θ0` (any
instance) at a written label, an instance occupying the cell at a cell
label. Rows the hypotheses pair at a label share one constant, because
every instance gives them equal fields there (`col_agree`); so the
generic instance satisfies `D` (`col_eq`), and the canonical valuation
covers every instance.
-/
import Composition.Typed.FlatCols
import Composition.Typed.EqFree

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {π : Pattern Label}

theorem agreeAt_equiv (l : Label) :
    (∀ r, AgreeAt P π l r r) ∧
      (∀ r s, AgreeAt P π l r s → AgreeAt P π l s r) ∧
      ∀ r s t, AgreeAt P π l r s → AgreeAt P π l s t →
        AgreeAt P π l r t :=
  ⟨fun _ _ _ => rfl, fun _ _ h θ hθ => (h θ hθ).symm,
   fun _ _ _ h1 h2 θ hθ => (h1 θ hθ).trans (h2 θ hθ)⟩

theorem agreeIn_equiv (S : Cell) :
    (∀ r, AgreeIn P π S r r) ∧
      (∀ r s, AgreeIn P π S r s → AgreeIn P π S s r) ∧
      ∀ r s t, AgreeIn P π S r s → AgreeIn P π S s t →
        AgreeIn P π S r t :=
  ⟨fun _ _ _ _ _ _ => rfl, fun _ _ h θ hθ k hk hc => (h θ hθ k hk hc).symm,
   fun _ _ _ h1 h2 θ hθ k hk hc =>
     (h1 θ hθ k hk hc).trans (h2 θ hθ k hk hc)⟩

theorem mem_occupied {S : Cell} :
    S ∈ occupiedCells P π ↔
      S ∈ subsets P.rigidRow ∧ S ≠ [] ∧ Occupied P π S := by
  simp only [occupiedCells, cellCands, List.mem_filter, decide_eq_true_eq,
    ne_eq]
  exact ⟨fun ⟨⟨a, b⟩, c⟩ => ⟨a, b, c⟩, fun ⟨a, b, c⟩ => ⟨⟨a, b⟩, c⟩⟩

/-- The cell of an unwritten label of an instance is occupied. -/
theorem cellOf_occupied {θR : Assign Label B} (hθ : Inst P π θR) {k : Label}
    (hk : k ∉ written P) (hc : cellOf P θR k ≠ []) :
    cellOf P θR k ∈ occupiedCells P π :=
  mem_occupied.mpr ⟨filter_mem_subsets _ _, hc, θR, hθ, k, hk, rfl⟩

theorem pick_none {V : Type} {c : Nat → Option V} :
    ∀ rs : List Nat, (∀ r ∈ rs, c r = none) → pick (rs.map c) = some none
  | [], _ => rfl
  | r :: rs, h => by
    simp only [List.map_cons, h r List.mem_cons_self, pick]
    exact pick_none rs fun x hx => h x (List.mem_cons_of_mem _ hx)

/-- Presence of a flat row at a written label and in a cell. -/
theorem flatRow_inl_isSome {r : Nat} {l : Label} (hl : l ∈ written P) :
    (flatRow P π r (.inl l)).isSome = π r l := by
  cases h : π r l <;> simp [flatRow, hl, h]

theorem flatRow_inr_isSome {r : Nat} {S : Cell} (hS : S ∈ occupiedCells P π) :
    (flatRow P π r (.inr S)).isSome = decide (r ∈ S) := by
  by_cases h : r ∈ S <;> simp [flatRow, hS, h]

omit [DecidableEq Label] in
/-- Presence of an instance's row in the cell of one of its labels. -/
theorem inst_isSome_cell {θR : Assign Label B} {k : Label} {r : Nat}
    (hr : r ∈ P.rigidRow) :
    (θR.row r k).isSome = decide (r ∈ cellOf P θR k) := by
  cases h : θR.row r k <;> simp [cellOf, List.mem_filter, hr, h]

omit [DecidableEq Label] in
/-- Rows of a flat atom of a scoped `D` are rigid. -/
theorem flat_rigid (hS : Scoped P) {rs1 rs2 : List Nat}
    (ha : Atom.eq (.record .nil rs1) (.record .nil rs2) ∈ P.D) :
    ∀ r ∈ rs1 ++ rs2, r ∈ P.rigidRow := fun r hr =>
  hS.2 r (List.mem_flatMap.mpr ⟨_, ha, by
    simpa [rowVarsT, rowVarsF] using hr⟩)

omit [DecidableEq Label] in
theorem flatAtom_eq {t u : TExpr Label B} (h : FlatAtom (.eq t u)) :
    ∃ rs1 rs2, t = .record .nil rs1 ∧ u = .record .nil rs2 := by
  cases t <;> cases u <;> simp only [FlatAtom] at h
  rename_i fs1 rs1 fs2 rs2
  cases fs1 <;> cases fs2 <;> try simp only at h
  exact ⟨rs1, rs2, rfl, rfl⟩

/-- A flat equation of `D` holds at `thetaFlat`, label by label. -/
theorem flat_eq_at (hS : Scoped P) {rs1 rs2 : List Nat}
    (ha : Atom.eq (.record .nil rs1) (.record .nil rs2) ∈ P.D)
    (hI : HasInstance P π) (j : CL Label) :
    ∃ o, pick (rs1.map fun r => flatRow P π r j) = some o ∧
      pick (rs2.map fun r => flatRow P π r j) = some o := by
  obtain ⟨θ0, hD0, hπ0⟩ := hI
  have hrig := flat_rigid hS ha
  have mem1 : ∀ {c : Nat → Option (G Label B)} {r : Nat},
      (rs1.find? fun r => (c r).isSome) = some r → r ∈ P.rigidRow :=
    fun e => hrig _ (List.mem_append_left _ (List.mem_of_find?_eq_some e))
  have mem2 : ∀ {c : Nat → Option (G Label B)} {r : Nat},
      (rs2.find? fun r => (c r).isSome) = some r → r ∈ P.rigidRow :=
    fun e => hrig _ (List.mem_append_right _ (List.mem_of_find?_eq_some e))
  cases j with
  | inl l =>
    by_cases hl : l ∈ written P
    · have hp : ∀ r ∈ rs1 ++ rs2, (θ0.row r l).isSome =
          (flatRow P π r (.inl l)).isSome := fun r hr => by
        rw [flatRow_inl_isSome hl, hπ0 r (hrig r hr) l hl]
      refine col_eq _ _ rs1 rs2 hp (holds_flat_iff.mp (hD0 _ ha) l)
        fun r1 r2 e1 e2 => ?_
      have hr1 := mem1 e1
      have hr2 := mem2 e2
      have p1 : π r1 l = true := by
        rw [← hπ0 r1 hr1 l hl]; exact find?_present e1
      have p2 : π r2 l = true := by
        rw [← hπ0 r2 hr2 l hl]; exact find?_present e2
      have hag : AgreeAt P π l r1 r2 := fun θR hθ =>
        col_agree (fun r => θ0.row r l) (fun r => θR.row r l) rs1 rs2
          (fun r hr => by
            rw [hπ0 r (hrig r hr) l hl, hθ.2 r (hrig r hr) l hl])
          (holds_flat_iff.mp (hθ.1 _ ha) l) e1 e2
      have := repBy_congr (agreeAt_equiv l).2.1 (agreeAt_equiv l).2.2 hr1 hag
      simp [flatRow, hl, p1, p2, this]
    · exact ⟨none, pick_none _ fun r _ => by simp [flatRow, hl],
        pick_none _ fun r _ => by simp [flatRow, hl]⟩
  | inr S =>
    by_cases hS' : S ∈ occupiedCells P π
    · obtain ⟨_, _, θ1, hθ1, k1, _, hc1⟩ := mem_occupied.mp hS'
      have hp : ∀ r ∈ rs1 ++ rs2, (θ1.row r k1).isSome =
          (flatRow P π r (.inr S)).isSome := fun r hr => by
        rw [flatRow_inr_isSome hS', inst_isSome_cell (hrig r hr), hc1]
      refine col_eq _ _ rs1 rs2 hp (holds_flat_iff.mp (hθ1.1 _ ha) k1)
        fun r1 r2 e1 e2 => ?_
      have hr1 := mem1 e1
      have hr2 := mem2 e2
      have m1 : r1 ∈ S := by
        have := find?_present e1
        rw [inst_isSome_cell hr1, hc1] at this
        simpa using this
      have m2 : r2 ∈ S := by
        have := find?_present e2
        rw [inst_isSome_cell hr2, hc1] at this
        simpa using this
      have hag : AgreeIn P π S r1 r2 := fun θR hθ k _ hc =>
        col_agree (fun r => θ1.row r k1) (fun r => θR.row r k) rs1 rs2
          (fun r hr => by
            rw [inst_isSome_cell (hrig r hr), inst_isSome_cell (hrig r hr),
              hc1, hc])
          (holds_flat_iff.mp (hθ.1 _ ha) k) e1 e2
      have := repBy_congr (agreeIn_equiv S).2.1 (agreeIn_equiv S).2.2 hr1 hag
      simp [flatRow, hS', m1, m2, this]
    · exact ⟨none, pick_none _ fun r _ => by simp [flatRow, hS'],
        pick_none _ fun r _ => by simp [flatRow, hS']⟩

end Composition.Typed
