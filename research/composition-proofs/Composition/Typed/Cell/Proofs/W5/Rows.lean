/-
Wave 2, stream W5, helpers: what a held record equation says about the
labels each side lacks, the star body's clash (a label in both `a_i`
and `b_i`), star indices, and `ValidOpen → ValidFin` (through
`mapBase id`).
-/
import Composition.Typed.Cell.ScenariosMore
import Composition.Typed.Bridge.ProofExtension

namespace Composition.Typed.Cells.ProofsW5

open Composition Composition.Syntax Composition.Typed

variable {B : Type}

/-! ### Rows and records -/

theorem finG_single_at {g : G Nat B} (l : Nat) (h : FinG g) :
    FinG (.record (single l g)) := by
  refine (finG_record _).mpr ⟨⟨[l], fun k hk => ?_⟩, fun k => ?_⟩
  · by_cases hk0 : k = l
    · simp [hk0]
    · simp [single, hk0] at hk
  · unfold single
    split
    · exact h
    · trivial

/-- A defined record expression lacks a label iff its fields and every
tail do. -/
theorem recEval {θ : Assign Nat B} {fs : Fields Nat B} {ts : List Nat}
    {g : G Nat B} (h : evalT θ (.record fs ts) = some g) :
    ∃ fr v, evalF θ fs = some fr ∧ g = .record v ∧
      ∀ l, (v l = none ↔ fr l = none ∧ ∀ r ∈ ts, θ.row r l = none) := by
  simp only [evalT, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
  obtain ⟨fr, hfr, v, hv, rfl⟩ := h
  refine ⟨fr, v, hfr, rfl, fun l => ?_⟩
  rw [composeAll_none_iff hv]
  simp

theorem evalF_nil (θ : Assign Nat B) :
    evalF θ (.nil : Fields Nat B) = some Row.empty := by
  simp [evalF]

theorem evalF_one (θ : Assign Nat B) (l : Nat) (t : TExpr Nat B)
    {g : G Nat B} (ht : evalT θ t = some g) :
    evalF θ (.cons l t .nil) = some (single l g) := by
  simp [evalF, ht, compose_empty]

/-- Both sides of a held record equation lack the same labels. -/
theorem eqRows {θ : Assign Nat B} {fs fs' : Fields Nat B} {ts ts' : List Nat}
    {fr fr' : Row Nat (G Nat B)} (hf : evalF θ fs = some fr)
    (hf' : evalF θ fs' = some fr')
    (h : Holds θ (.eq (.record fs ts) (.record fs' ts'))) (l : Nat) :
    (fr l = none ∧ ∀ r ∈ ts, θ.row r l = none) ↔
      (fr' l = none ∧ ∀ r ∈ ts', θ.row r l = none) := by
  obtain ⟨g, h1, h2⟩ := h
  obtain ⟨f1, v1, e1, rfl, hv1⟩ := recEval h1
  obtain ⟨f2, v2, e2, hg, hv2⟩ := recEval h2
  rw [hf, Option.some.injEq] at e1
  rw [hf', Option.some.injEq] at e2
  subst e1 e2
  injection hg with hg
  subst hg
  rw [← hv1, ← hv2]

/-- A type variable equal to a record expression is a record lacking
what the expression lacks. -/
theorem tvarRec {θ : Assign Nat B} {k : Nat} {fs : Fields Nat B}
    {ts : List Nat} {fr : Row Nat (G Nat B)} (hf : evalF θ fs = some fr)
    (h : Holds θ (.eq (.tvar k) (.record fs ts))) :
    ∃ v, θ.ty k = .record v ∧
      ∀ l, (v l = none ↔ fr l = none ∧ ∀ r ∈ ts, θ.row r l = none) := by
  obtain ⟨g, h1, h2⟩ := h
  simp only [evalT, Option.some.injEq] at h1
  obtain ⟨f1, v, e1, rfl, hv⟩ := recEval h2
  rw [hf, Option.some.injEq] at e1
  subst e1
  exact ⟨v, h1, hv⟩

/-- `{ f_i: b, ...r_i } = { ...a }`. -/
theorem aRow {θ : Assign Nat B} {i k : Nat} {b : B}
    (h : Holds θ (.eq (.record (.cons i (.base b) .nil) [i])
      (.record .nil [k]))) (l : Nat) :
    θ.row k l = none ↔ l ≠ i ∧ θ.row i l = none := by
  have := eqRows (evalF_one θ i (.base b) rfl) (evalF_nil θ) h l
  simp only [List.mem_singleton, forall_eq, Row.empty, true_and] at this
  rw [← this]
  simp [single]

/-- `{ ...h } = { ...b }`. -/
theorem bRow {θ : Assign Nat B} {k : Nat}
    (h : Holds θ (.eq (.record .nil [0]) (.record .nil [k]))) (l : Nat) :
    θ.row k l = none ↔ θ.row 0 l = none := by
  have := eqRows (evalF_nil θ) (evalF_nil θ) h l
  simpa [Row.empty] using this.symm

/-- A label in both `a_i` (as `f_i` or from `r_i`) and `b_i` (from `h`)
breaks `a_i disjoint b_i`. -/
theorem starClash {θ : Assign Nat B} {n i : Nat} {b : B}
    (hB : ∀ a ∈ starB n b i, Holds θ a) (l : Nat)
    (ha : l = i ∨ θ.row i l ≠ none) (hb : θ.row 0 l ≠ none) : False := by
  have h1 := hB (.eq (.record (.cons i (.base b) .nil) [i])
    (.record .nil [n + i])) (by simp [starB])
  have h2 := hB (.eq (.record .nil [0]) (.record .nil [2 * n + i]))
    (by simp [starB])
  have h3 := hB (.disjoint (n + i) (2 * n + i)) (by simp [starB])
  rcases h3 l with h | h
  · have := (aRow h1 l).1 h
    rcases ha with ha | ha
    · exact this.1 ha
    · exact ha this.2
  · exact hb ((bRow h2 l).1 h)

/-! ### Indices and the reduction to `ValidFin` -/

theorem memIdx {n i : Nat} (h1 : 1 ≤ i) (h2 : i ≤ n) : i ∈ starIdx n := by
  simp only [starIdx, List.mem_map, List.mem_range]
  exact ⟨i - 1, by omega, by omega⟩

theorem idxMem {n i : Nat} (h : i ∈ starIdx n) : 1 ≤ i ∧ i ≤ n := by
  simp only [starIdx, List.mem_map, List.mem_range] at h
  obtain ⟨k, hk, rfl⟩ := h
  omega

theorem validFin_of_open {P : SigProblem Nat B} (h : ValidOpen P) :
    ValidFin P := by
  have := h B id (fun _ _ e => e)
  rwa [mapBaseId P] at this


end Composition.Typed.Cells.ProofsW5
