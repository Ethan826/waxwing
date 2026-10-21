/-
D3a attack, R1 (research/division-campaign/d3a/attack.md): with finitely
many base types a valid signature can need witnesses that case on the
shape of a rigid type variable, so no typed template works for every
rigid assignment of a pattern.

`shapeSplit b` is, with label `f` = 0, rows `u1 u2 u3` = 1-3,
`m1 m2 m3` = 4-6, `w` = 7 and type variables `α` = 0 (rigid), `β1 β2`
= 1, 2:

  ∀ α. ∃ u1 u2 u3 m1 m2 m3 w β1 β2.
    { ...u1, ...u2, ...u3 } = { f: α },
    { ...u1, ...m1 } = { f: b },
    { ...u2, ...m2 } = { f: β1 → β2 },
    { ...u3, ...m3 } = { f: { ...w } }.

Exactly one `uᵢ` holds `f`, at `α`; `u1` only if `α = b`, `u2` only if
`α` is an arrow, `u3` only if it is a record. With base types `Unit`
every ground type is one of the three, so the signature is valid
(`shapeSplit_valid`, and over finite values `shapeSplit_validFin`); with
a second base type it is not (`shapeSplit_not_valid`). Which `uᵢ` holds `f` is forced by `α`'s shape
(`u1_holds_iff`), so no witness family fixes that presence uniformly
(`no_uniform_presence`). A D3a template fixes each flexible row's
presence at each written label per pattern, and this problem has no
rigid rows, hence one pattern: no D3a template exists, in any grammar.
-/
import Composition.Sig.Finite

namespace Composition.TypedAttack

open Composition Composition.Syntax

variable {B : Type}

/-- `{ f: t }`. -/
def fOf (t : TExpr Nat B) : TExpr Nat B := .record (.cons 0 t .nil) []

/-- `{ ...r₁, ..., ...rₙ }`. -/
def tl (rs : List Nat) : TExpr Nat B := .record .nil rs

def shapeSplit (b : B) : SigProblem Nat B :=
  ⟨[0], [], [],
   [.eq (tl [1, 2, 3]) (fOf (.tvar 0)),
    .eq (tl [1, 4]) (fOf (.base b)),
    .eq (tl [2, 5]) (fOf (.arrow (.tvar 1) (.tvar 2))),
    .eq (tl [3, 6]) (fOf (tl [7]))]⟩

theorem evalT_fOf (θ : Assign Nat B) (t : TExpr Nat B) :
    evalT θ (fOf t) = (evalT θ t).map fun g => .record (single 0 g) := by
  rw [fOf, evalT_record]
  simp only [fieldRows]
  cases evalT θ t <;> simp [composeAll_single]

/-- A label a part holds is held, at the same field, by the composition. -/
theorem composeAll_of_mem {V : Type} {rows : List (Row Nat V)}
    {v : Row Nat V} (h : composeAll rows = some v) {x : Row Nat V}
    (hx : x ∈ rows) {l : Nat} {g : V} (hg : x l = some g) : v l = some g := by
  induction rows generalizing v with
  | nil => simp at hx
  | cons y ys ih =>
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨hd, rfl⟩ := compose_eq_some.mp hc
    rcases List.mem_cons.mp hx with rfl | hx
    · simp [union, hg]
    · have hwl := ih hw hx
      rcases hd l with hy | hy
      · simp [union, hy, hwl]
      · simp [hwl] at hy

/-- An atom `{ ...rs } = { f: t }` makes the parts' composition the
one-field row at `t`'s value. -/
theorem tl_fOf {θ : Assign Nat B} {rs : List Nat} {t : TExpr Nat B}
    (h : Holds θ (.eq (tl rs) (fOf t))) :
    ∃ g, evalT θ t = some g ∧ composeAll (rs.map θ.row) = some (single 0 g) := by
  obtain ⟨g', h1, h2⟩ := h
  rw [tl, evalT_tails] at h1
  rw [evalT_fOf] at h2
  cases ht : evalT θ t with
  | none => simp [ht] at h2
  | some g =>
    simp only [ht, Option.map_some, Option.some.injEq] at h2
    subst h2
    cases hc : composeAll (rs.map θ.row) with
    | none => simp [hc] at h1
    | some v =>
      simp only [hc, Option.map_some, Option.some.injEq, G.record.injEq] at h1
      exact ⟨g, rfl, by rw [h1]⟩

/-- A part holding `f` holds it at the one field. -/
theorem part_field {θ : Assign Nat B} {rs : List Nat} {g g' : G Nat B}
    (hc : composeAll (rs.map θ.row) = some (single 0 g)) {r : Nat}
    (hr : r ∈ rs) (hg : θ.row r 0 = some g') : g' = g := by
  have := composeAll_of_mem hc (List.mem_map_of_mem hr) hg
  simpa [single] using this.symm

section Facts

variable {b : B} {θR θF : Assign Nat B}
  (h : Sat (combine (shapeSplit b) θR θF) (shapeSplit b).B)
include h

private theorem atom (i : Nat) (a) (ha : (shapeSplit b).B[i]? = some a) :
    Holds (combine (shapeSplit b) θR θF) a :=
  h a (List.mem_of_getElem? ha)

/-- Some `uᵢ` holds `f`, and any that does holds it at `α`. -/
theorem holder :
    (∃ i ∈ [1, 2, 3], θF.row i 0 ≠ none) ∧
      ∀ i ∈ [1, 2, 3], ∀ g, θF.row i 0 = some g → g = θR.ty 0 := by
  obtain ⟨g, hg, hc⟩ := tl_fOf (atom h 0 _ rfl)
  simp only [evalT, combine, shapeSplit, List.mem_singleton, ite_true,
    Option.some.injEq] at hg
  subst hg
  refine ⟨?_, fun i hi g' hr => ?_⟩
  · refine Classical.byContradiction fun hn => ?_
    have hn' : ∀ i ∈ [1, 2, 3], θF.row i 0 = none := fun i hi =>
      Classical.byContradiction fun h' => hn ⟨i, hi, h'⟩
    have := (composeAll_none_iff hc 0).mpr (by
      intro x hx
      obtain ⟨i, hi, rfl⟩ := List.mem_map.mp hx
      simpa [combine, shapeSplit] using hn' i hi)
    simp [single] at this
  · exact part_field hc hi (by simpa [combine, shapeSplit] using hr)

theorem u1_base {g} (hr : θF.row 1 0 = some g) : g = .base b := by
  obtain ⟨g', hg, hc⟩ := tl_fOf (atom h 1 _ rfl)
  simp only [evalT, Option.some.injEq] at hg
  subst hg
  exact part_field hc (r := 1) (by simp)
    (by simpa [combine, shapeSplit] using hr)

theorem u2_arrow {g} (hr : θF.row 2 0 = some g) : ∃ x y, g = .arrow x y := by
  obtain ⟨g', hg, hc⟩ := tl_fOf (atom h 2 _ rfl)
  simp only [evalT, combine, shapeSplit, Option.bind_some, Option.map_some,
    Option.some.injEq] at hg
  subst hg
  exact ⟨_, _, part_field hc (r := 2) (by simp)
    (by simpa [combine, shapeSplit] using hr)⟩

theorem u3_record {g} (hr : θF.row 3 0 = some g) : ∃ ρ, g = .record ρ := by
  obtain ⟨g', hg, hc⟩ := tl_fOf (atom h 3 _ rfl)
  rw [tl, evalT_tails] at hg
  simp only [List.map, composeAll_single, Option.map_some,
    Option.some.injEq] at hg
  subst hg
  exact ⟨_, part_field hc (r := 3) (by simp)
    (by simpa [combine, shapeSplit] using hr)⟩

/-- `u1` holds `f` exactly when `α` is the base type `b`. -/
theorem u1_holds_iff : θF.row 1 0 ≠ none ↔ θR.ty 0 = .base b := by
  obtain ⟨⟨i, hi, hne⟩, hat⟩ := holder h
  constructor
  · intro h1
    obtain ⟨g, hg⟩ := Option.ne_none_iff_exists'.mp h1
    rw [← hat 1 (by simp) g hg, u1_base h hg]
  · intro hα
    obtain ⟨g, hg⟩ := Option.ne_none_iff_exists'.mp hne
    have hgα := hat i hi g hg
    simp only [List.mem_cons, List.not_mem_nil, or_false] at hi
    rcases hi with rfl | rfl | rfl
    · exact hne
    · obtain ⟨x, y, rfl⟩ := u2_arrow h hg
      rw [hα] at hgα
      cases hgα
    · obtain ⟨ρ, rfl⟩ := u3_record h hg
      rw [hα] at hgα
      cases hgα

end Facts

end Composition.TypedAttack
