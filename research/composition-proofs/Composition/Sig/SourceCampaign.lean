/-
Stream 5 of the parallel campaign (dossier §18.13): checks behind the
source-to-constraint specification
(research/division-campaign/source/translation.md). Uses the existing
model (`SigProblem`, `ValidFin`); no new semantics.

1. Waxwing's `where` clauses, written or implied by a signature's types,
   are `lacks` and `disjoint` atoms over rigid rows only. Such a `D` is
   closed downwards (removing fields keeps it true) and holds at the
   all-empty assignment. So a source-derived `D` is never unsatisfiable
   (the vacuity case of O3 and §2.3's refusal never arise from source),
   and it never forces a label to be present in a rigid row.
2. Three translated examples of translation.md, proved valid directly:
   `swapped` (join called with its arguments exchanged), `twice` (a
   record passed twice to a generic `same(p: a, q: a)`) and the
   self-call `both(x: { ...u }): { ...u, ...v } = both(x)`.
3. Two refusals: a rigid type variable equated with a record (n11) and
   a field read through a bare rigid tail (n02, `missingField`).
-/
import Composition.Sig.SourceBoundary

namespace Composition.Syntax.SourceCampaign

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- The atoms a Waxwing `where` clause, written or implied, can be. -/
def ClauseAtom : Atom Label B → Prop
  | .lacks _ _ => True
  | .disjoint _ _ => True
  | _ => False

def ClauseOnly (D : Problem Label B) : Prop := ∀ a ∈ D, ClauseAtom a

/-- `θ'`'s rows are `θ`'s with some fields removed. -/
def RowsBelow (θ' θ : Assign Label B) : Prop :=
  ∀ r l, θ'.row r l = none ∨ θ'.row r l = θ.row r l

/-- Source clauses are closed downwards. -/
theorem clauseOnly_down {D : Problem Label B} (hD : ClauseOnly D)
    {θ θ' : Assign Label B} (hb : RowsBelow θ' θ) (h : Sat θ D) :
    Sat θ' D := by
  intro a ha
  have hc := hD a ha
  have hh := h a ha
  cases a with
  | lacks r l =>
    rcases hb r l with h' | h'
    · exact h'
    · simp only [Holds] at hh ⊢; rw [h', hh]
  | disjoint r s =>
    intro l
    rcases hb r l with h1 | h1
    · exact Or.inl h1
    rcases hb s l with h2 | h2
    · exact Or.inr h2
    rw [h1, h2]; exact hh l
  | eq _ _ => exact absurd hc id
  | ff => exact absurd hc id

/-- The all-empty assignment. -/
def emptyAssign : Assign Label B := ⟨fun _ => emptyG, fun _ _ => none⟩

/-- Source clauses hold when every row is empty. -/
theorem clauseOnly_empty {D : Problem Label B} (hD : ClauseOnly D) :
    Sat (emptyAssign : Assign Label B) D := by
  intro a ha
  have hc := hD a ha
  cases a with
  | lacks _ _ => rfl
  | disjoint _ _ => exact fun _ => Or.inl rfl
  | eq _ _ => exact absurd hc id
  | ff => exact absurd hc id

omit [DecidableEq Label] in
theorem finAssign_empty : FinAssign (emptyAssign : Assign Label B) :=
  ⟨fun _ => finG_emptyG, fun _ => finG_emptyG⟩

/-- So a source-derived `D` is satisfiable by a finite assignment: the
vacuity disjunct of O3 never applies to source programs. -/
theorem clauseOnly_satisfiable {D : Problem Label B} (hD : ClauseOnly D) :
    ∃ θ : Assign Label B, FinAssign θ ∧ Sat θ D :=
  ⟨emptyAssign, finAssign_empty, clauseOnly_empty hD⟩

/-- Removing one field of one row keeps a source `D` true: no source
clause forces a label to be present. -/
theorem clauseOnly_drop {D : Problem Label B} (hD : ClauseOnly D)
    {θ : Assign Label B} (h : Sat θ D) (r0 : Nat) (l0 : Label) :
    Sat ⟨θ.ty, fun r l => if r = r0 ∧ l = l0 then none else θ.row r l⟩ D :=
  clauseOnly_down hD (fun r l => by
    by_cases hrl : r = r0 ∧ l = l0 <;> simp [hrl]) h

/-! Valid examples (translation.md, §4). Rigid rows 0, 1; flexible 3+. -/

/-- `swapped(a: { ...r }, b: { ...s }): { ...r, ...s } where r disjoint s
= join(b, a)`: `join`'s `r`, `s` become flexible 3, 4. -/
def swappedSig : SigProblem Label B :=
  ⟨[], [0, 1], [.disjoint 0 1],
   [.eq (.record .nil [1]) (.record .nil [3]),
    .eq (.record .nil [0]) (.record .nil [4]),
    .disjoint 3 4,
    .eq (.record .nil [3, 4]) (.record .nil [0, 1])]⟩

/-- `both(x: { ...u }): { ...u, ...v } = both(x)`: the result's two
tails imply `u disjoint v`; the call's copies are flexible 3, 4. -/
def selfCallSig : SigProblem Label B :=
  ⟨[], [0, 1], [.disjoint 0 1],
   [.eq (.record .nil [0]) (.record .nil [3]),
    .disjoint 3 4,
    .eq (.record .nil [3, 4]) (.record .nil [0, 1])]⟩

/-- `twice(x: { ...r }): Int = same(x, x)` with `same(p: a, q: a)`:
`same`'s `a` is flexible type variable 1. -/
def twiceSig : SigProblem Label B :=
  ⟨[], [0], [],
   [.eq (.tvar 1) (.record .nil [0]), .eq (.tvar 1) (.record .nil [0])]⟩

/-- Flexible rows 3 and 4 set to `a` and `b`, everything else empty. -/
def twoRows (a b : Row Label (G Label B)) (ty : Nat → G Label B) :
    Assign Label B :=
  ⟨ty, fun n => if n = 3 then a else if n = 4 then b else Row.empty⟩

omit [DecidableEq Label] in
theorem finRows_two {a b : Row Label (G Label B)}
    (ha : FinG (.record a)) (hb : FinG (.record b)) (n : Nat) :
    FinG (.record ((twoRows a b (fun _ => emptyG)).row n)) := by
  simp only [twoRows]
  by_cases h3 : n = 3
  · simp only [h3, ↓reduceIte]; exact ha
  by_cases h4 : n = 4
  · simp only [h4, ↓reduceIte]; exact hb
  simp only [h3, h4, ↓reduceIte]
  exact finG_emptyG

theorem swapped_validFin : ValidFin (swappedSig : SigProblem Label B) := by
  intro θR _ hrow hd
  have h01 : Disjoint (θR.row 0) (θR.row 1) :=
    hd (.disjoint 0 1) (by simp [swappedSig])
  have h10 : Disjoint (θR.row 1) (θR.row 0) := disjoint_comm.mp h01
  refine ⟨twoRows (θR.row 1) (θR.row 0) (fun _ => emptyG),
    ⟨fun _ => finG_emptyG, finRows_two (hrow 1 (by simp [swappedSig]))
      (hrow 0 (by simp [swappedSig]))⟩, ?_⟩
  intro a ha
  simp only [swappedSig, List.mem_cons] at ha
  rcases ha with rfl | rfl | rfl | rfl | h
  · exact ⟨.record (θR.row 1), by simp [evalT_tails, combine, swappedSig,
      composeAll_single], by simp [evalT_tails, combine, swappedSig,
      twoRows, composeAll_single]⟩
  · exact ⟨.record (θR.row 0), by simp [evalT_tails, combine, swappedSig,
      composeAll_single], by simp [evalT_tails, combine, swappedSig,
      twoRows, composeAll_single]⟩
  · intro l
    simpa [combine, swappedSig, twoRows] using h10 l
  · refine ⟨.record (union (θR.row 0) (θR.row 1)), ?_, ?_⟩
    · simp [evalT_tails, combine, swappedSig, twoRows, composeAll_pair h10,
        union_comm h10]
    · simp [evalT_tails, combine, swappedSig, composeAll_pair h01]
  · simp at h

theorem selfCall_validFin : ValidFin (selfCallSig : SigProblem Label B) := by
  intro θR _ hrow hd
  have h01 : Disjoint (θR.row 0) (θR.row 1) :=
    hd (.disjoint 0 1) (by simp [selfCallSig])
  refine ⟨twoRows (θR.row 0) (θR.row 1) (fun _ => emptyG),
    ⟨fun _ => finG_emptyG, finRows_two (hrow 0 (by simp [selfCallSig]))
      (hrow 1 (by simp [selfCallSig]))⟩, ?_⟩
  intro a ha
  simp only [selfCallSig, List.mem_cons] at ha
  rcases ha with rfl | rfl | rfl | h
  · exact ⟨.record (θR.row 0), by simp [evalT_tails, combine, selfCallSig,
      composeAll_single], by simp [evalT_tails, combine, selfCallSig,
      twoRows, composeAll_single]⟩
  · intro l
    simpa [combine, selfCallSig, twoRows] using h01 l
  · refine ⟨.record (union (θR.row 0) (θR.row 1)), ?_, ?_⟩
    · simp [evalT_tails, combine, selfCallSig, twoRows, composeAll_pair h01]
    · simp [evalT_tails, combine, selfCallSig, composeAll_pair h01]
  · simp at h

theorem twice_validFin : ValidFin (twiceSig : SigProblem Label B) := by
  intro θR _ hrow _
  have h0 : FinG (.record (θR.row 0)) := hrow 0 (by simp [twiceSig])
  refine ⟨⟨fun _ => .record (θR.row 0), fun _ => Row.empty⟩,
    ⟨fun _ => h0, fun _ => finG_emptyG⟩, ?_⟩
  intro a ha
  have hv : Holds (combine twiceSig θR
      ⟨fun _ => .record (θR.row 0), fun _ => Row.empty⟩)
      (.eq (.tvar 1) (.record .nil [0])) :=
    ⟨.record (θR.row 0), by simp [evalT, combine, twiceSig],
      by simp [evalT_tails, combine, twiceSig, composeAll_single]⟩
  simp only [twiceSig, List.mem_cons, List.not_mem_nil, or_false] at ha
  rcases ha with rfl | rfl <;> exact hv

/-! Refusals. -/

/-- n11, `fn bad(x: a): Text = x.name`, reduced to its core: a rigid type
variable equated with a record. Not valid: `a` may be a base type. -/
def tyvarRecordSig : SigProblem Label B :=
  ⟨[0], [], [], [.eq (.tvar 0) (.record .nil [3])]⟩

theorem tyvarRecord_not_validFin (b : B) :
    ¬ ValidFin (tyvarRecordSig : SigProblem Label B) := by
  intro hv
  obtain ⟨θF, -, h⟩ := hv ⟨fun _ => .base b, fun _ => Row.empty⟩
    (fun _ _ => trivial) (fun _ h => by simp [tyvarRecordSig] at h)
    (by simp [Sat, tyvarRecordSig])
  obtain ⟨g, h1, h2⟩ := h (.eq (.tvar 0) (.record .nil [3]))
    (by simp [tyvarRecordSig])
  simp only [evalT, combine, tyvarRecordSig, List.mem_singleton,
    ↓reduceIte, Option.some.injEq] at h1
  subst h1
  simp [evalT_tails, combine, tyvarRecordSig] at h2

/-- n02, `fn bad(p: { ...r }): Text = p.name`: the access gives
`{ ...r } = { name: α, ...ρ }`. Not valid: `r` may be empty, and no
source clause can say otherwise (`clauseOnly_drop`). -/
def missingSig (name : Label) : SigProblem Label B :=
  ⟨[], [0], [], [.eq (.record .nil [0]) (.record (.cons name (.tvar 1) .nil)
    [3])]⟩

theorem missing_not_validFin (name : Label) :
    ¬ ValidFin (missingSig name : SigProblem Label B) := by
  intro hv
  obtain ⟨θF, -, h⟩ := hv emptyAssign (fun _ h => by simp [missingSig] at h)
    (fun _ _ => finG_emptyG) (by simp [Sat, missingSig])
  obtain ⟨g, h1, h2⟩ := h (.eq (.record .nil [0])
    (.record (.cons name (.tvar 1) .nil) [3])) (by simp [missingSig])
  simp only [evalT_tails, combine, missingSig, List.map_cons, List.map_nil,
    List.mem_singleton, ↓reduceIte, composeAll_single, Option.map_some,
    Option.some.injEq] at h1
  subst h1
  rw [evalT_record] at h2
  simp only [fieldRows, evalT, List.map_cons, List.map_nil] at h2
  generalize hθ : combine (missingSig name) emptyAssign θF = θ at h2
  cases hc : compose (single name (θ.ty 1)) (θ.row 3) with
  | none => simp [composeAll, compose_empty, hc] at h2
  | some w =>
    simp [composeAll, compose_empty, hc] at h2
    obtain ⟨-, hw⟩ := compose_eq_some.mp hc
    have := congrFun h2 name
    simp [emptyAssign, hw, union, single] at this

end Composition.Syntax.SourceCampaign
