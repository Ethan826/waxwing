/-
Flat row equations label by label (for Typed/Flat.lean). An equation
between compositions of rows holds iff, at every label, both sides pick
the same field (`holds_flat_iff`). A column (the rows' fields at one
label) with the same presence as an instance's column, and with equal
fields on the rows the instance's equation pairs, satisfies the equation
there too (`col_eq`); and every instance with that presence gives the
paired rows equal fields (`col_agree`). Also: the representative of a
class of rows (`repBy`) and its properties.
-/
import Composition.Typed.Pick
import Composition.Typed.Defs
import Composition.Sig.Examples

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

theorem holds_flat_iff {L Bb : Type} [DecidableEq L] {Γ : Assign L Bb}
    {rs1 rs2 : List Nat} :
    Holds Γ (.eq (.record .nil rs1) (.record .nil rs2)) ↔
      ∀ k, ∃ o, pick (rs1.map fun r => Γ.row r k) = some o ∧
        pick (rs2.map fun r => Γ.row r k) = some o := by
  have hm : ∀ rs : List Nat, ∀ k,
      (rs.map Γ.row).map (· k) = rs.map fun r => Γ.row r k := fun rs k => by
    simp [List.map_map, Function.comp_def]
  constructor
  · rintro ⟨g, h1, h2⟩ k
    rw [evalT_tails, Option.map_eq_some_iff] at h1 h2
    obtain ⟨v1, hv1, rfl⟩ := h1
    obtain ⟨v2, hv2, he⟩ := h2
    cases he
    refine ⟨v1 k, ?_, ?_⟩
    · rw [← hm]; exact (composeAll_iff_pick _ _).mp hv1 k
    · rw [← hm]; exact (composeAll_iff_pick _ _).mp hv2 k
  · intro h
    let v : Row L (G L Bb) := fun k => Classical.choose (h k)
    refine ⟨.record v, ?_, ?_⟩
    · rw [evalT_tails, (composeAll_iff_pick _ v).mpr fun k => by
        rw [hm]; exact (Classical.choose_spec (h k)).1]
      rfl
    · rw [evalT_tails, (composeAll_iff_pick _ v).mpr fun k => by
        rw [hm]; exact (Classical.choose_spec (h k)).2]
      rfl

theorem find?_present {V : Type} {c : Nat → Option V} {rs : List Nat}
    {r : Nat} (h : rs.find? (fun r => (c r).isSome) = some r) :
    (c r).isSome = true := by
  have := List.find?_some h
  simpa using this

/-- Picks equal at an instance column: either both sides pick nothing,
or the rows they pick have equal fields. -/
theorem col_cases {V : Type} {c : Nat → Option V} {rs1 rs2 : List Nat}
    {o : Option V} (h1 : pick (rs1.map c) = some o)
    (h2 : pick (rs2.map c) = some o) :
    ((rs1.find? fun r => (c r).isSome) = none ∧
      (rs2.find? fun r => (c r).isSome) = none) ∨
    ∃ r1 r2, (rs1.find? fun r => (c r).isSome) = some r1 ∧
      (rs2.find? fun r => (c r).isSome) = some r2 ∧ c r1 = c r2 := by
  rw [pick_map] at h1 h2
  split at h1
  · cases h1
  split at h2
  · cases h2
  simp only [Option.some.injEq] at h1 h2
  cases hf1 : rs1.find? (fun r => (c r).isSome) with
  | none =>
    cases hf2 : rs2.find? (fun r => (c r).isSome) with
    | none => exact Or.inl ⟨rfl, rfl⟩
    | some r2 =>
      rw [hf1] at h1
      rw [hf2] at h2
      have := find?_present hf2
      simp only [Option.bind_none, Option.bind_some] at h1 h2
      rw [← h1] at h2
      simp [h2] at this
  | some r1 =>
    cases hf2 : rs2.find? (fun r => (c r).isSome) with
    | none =>
      rw [hf1] at h1
      rw [hf2] at h2
      have := find?_present hf1
      simp only [Option.bind_none, Option.bind_some] at h1 h2
      rw [← h2] at h1
      simp [h1] at this
    | some r2 =>
      rw [hf1] at h1
      rw [hf2] at h2
      exact Or.inr ⟨r1, r2, rfl, rfl, by simpa using h1.trans h2.symm⟩

/-- Same presence, and equal fields where the instance's picks pair two
rows: the column satisfies the equation. -/
theorem col_eq {V W : Type} (c : Nat → Option V) (d : Nat → Option W)
    (rs1 rs2 : List Nat)
    (hp : ∀ r ∈ rs1 ++ rs2, (c r).isSome = (d r).isSome)
    (h0 : ∃ o, pick (rs1.map c) = some o ∧ pick (rs2.map c) = some o)
    (hag : ∀ r1 r2, (rs1.find? fun r => (c r).isSome) = some r1 →
      (rs2.find? fun r => (c r).isSome) = some r2 → d r1 = d r2) :
    ∃ o, pick (rs1.map d) = some o ∧ pick (rs2.map d) = some o := by
  obtain ⟨o, h1, h2⟩ := h0
  obtain ⟨f1, g1⟩ := pick_map_same c d rs1 fun r hr =>
    hp r (List.mem_append_left _ hr)
  obtain ⟨f2, g2⟩ := pick_map_same c d rs2 fun r hr =>
    hp r (List.mem_append_right _ hr)
  have h1' := h1
  have h2' := h2
  rw [pick_map] at h1' h2'
  rw [pick_map, pick_map, ← f1, ← f2, ← g1, ← g2]
  split at h1'
  · cases h1'
  split at h2'
  · cases h2'
  next n1 n2 =>
  simp only [n1, n2, ↓reduceIte, Option.some.injEq, exists_eq_left']
  rcases col_cases h1 h2 with ⟨e1, e2⟩ | ⟨r1, r2, e1, e2, _⟩
  · simp [e1, e2]
  · simp [e1, e2, hag r1 r2 e1 e2]

/-- An instance column with the same presence: the paired rows have
equal fields there. -/
theorem col_agree {V W : Type} (c : Nat → Option V) (d : Nat → Option W)
    (rs1 rs2 : List Nat)
    (hp : ∀ r ∈ rs1 ++ rs2, (c r).isSome = (d r).isSome)
    (hd : ∃ o, pick (rs1.map d) = some o ∧ pick (rs2.map d) = some o)
    {r1 r2 : Nat} (e1 : (rs1.find? fun r => (c r).isSome) = some r1)
    (e2 : (rs2.find? fun r => (c r).isSome) = some r2) : d r1 = d r2 := by
  obtain ⟨_, g1⟩ := pick_map_same c d rs1 fun r hr =>
    hp r (List.mem_append_left _ hr)
  obtain ⟨_, g2⟩ := pick_map_same c d rs2 fun r hr =>
    hp r (List.mem_append_right _ hr)
  obtain ⟨o, h1, h2⟩ := hd
  rcases col_cases h1 h2 with ⟨n1, _⟩ | ⟨s1, s2, f1, f2, h⟩
  · rw [← g1, e1] at n1
    cases n1
  · rw [← g1, e1] at f1
    rw [← g2, e2] at f2
    cases f1
    cases f2
    exact h

/-! ### Representatives -/

variable {P : SigProblem Label B}

omit [DecidableEq Label] in
open Classical in
theorem repBy_spec {rel : Nat → Nat → Prop} (hrefl : ∀ r, rel r r)
    {r : Nat} (hr : r ∈ P.rigidRow) :
    repBy P rel r ∈ P.rigidRow ∧ rel (repBy P rel r) r := by
  unfold repBy
  cases hf : P.rigidRow.find? (fun s => decide (rel s r)) with
  | none =>
    have := List.find?_eq_none.mp hf r hr
    simp [hrefl r] at this
  | some s =>
    exact ⟨List.mem_of_find?_eq_some hf, by simpa using List.find?_some hf⟩

omit [DecidableEq Label] in
open Classical in
theorem repBy_congr {rel : Nat → Nat → Prop}
    (hsymm : ∀ r s, rel r s → rel s r)
    (htrans : ∀ r s t, rel r s → rel s t → rel r t)
    {r r' : Nat} (hr : r ∈ P.rigidRow) (h : rel r r') :
    repBy P rel r = repBy P rel r' := by
  unfold repBy
  have hp : ∀ s ∈ P.rigidRow, decide (rel s r) = decide (rel s r') :=
    fun s _ => by
      simp only [decide_eq_decide]
      exact ⟨fun h1 => htrans _ _ _ h1 h,
        fun h1 => htrans _ _ _ h1 (hsymm _ _ h)⟩
  rw [find?_congr' _ hp]
  cases hf : P.rigidRow.find? (fun s => decide (rel s r')) with
  | none =>
    have := List.find?_eq_none.mp hf r hr
    simp [h] at this
  | some s => rfl

end Composition.Typed
