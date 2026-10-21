/-
`hv` and composition (the analogue of P9s's L2, Sig/Interp.lean). At a
written label `hv` reads the generic field at `inl l`; at an unwritten
label `k` it reads the field at the cell label `inr (cellOf θ k)`. Both
reads are pointwise in the generic row, so `hv` maps disjoint rows to
disjoint rows and unions to unions with no side condition: different
labels of the ground model read different generic labels.
-/
import Composition.Typed.Model

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {θ : Assign Label B} {ν : Val Label B}

/-- The generic label `hv` reads for ground label `k`, if any. -/
def src (P : SigProblem Label B) (θ : Assign Label B) (k : Label) :
    Option (CL Label) :=
  if k ∈ written P then some (.inl k)
  else if cellOf P θ k = [] then none else some (.inr (cellOf P θ k))

/-- The context under ground label `k`. -/
def ctxAt (P : SigProblem Label B) (κ : Option Label) (k : Label) :
    Option Label :=
  if k ∈ written P then κ else some k

theorem hvRow_eq (κ : Option Label) (f : Row (CL Label) (CG Label B))
    (k : Label) : hvRow P θ ν κ f k =
      match src P θ k with
      | none => none
      | some j => hvO P θ ν (ctxAt P κ k) (f j) := by
  unfold hvRow src ctxAt
  by_cases hw : k ∈ written P
  · simp [hw]
  · by_cases hc : cellOf P θ k = []
    · simp [hw, hc]
    · simp [hw, hc]

theorem hv_record (κ : Option Label) (f : Row (CL Label) (CG Label B)) :
    hv P θ ν κ (.record f) = .record (hvRow P θ ν κ f) := by
  simp only [hv]
  rfl

theorem hvO_none (κ : Option Label) : hvO P θ ν κ none = none := rfl

theorem hvRow_none_iff {κ : Option Label} {f : Row (CL Label) (CG Label B)}
    {k : Label} : hvRow P θ ν κ f k = none ↔
      ∀ j, src P θ k = some j → f j = none := by
  rw [hvRow_eq]
  cases h : src P θ k with
  | none => simp
  | some j =>
    simp only [Option.some.injEq, forall_eq']
    cases f j <;> simp [hvO]

/-- `hv` keeps disjointness. -/
theorem hvRow_disjoint {κ : Option Label} {x y : Row (CL Label) (CG Label B)}
    (h : Composition.Disjoint x y) :
    Composition.Disjoint (hvRow P θ ν κ x) (hvRow P θ ν κ y) := by
  intro k
  cases hs : src P θ k with
  | none =>
    left
    exact hvRow_none_iff.mpr fun j hj => by simp [hs] at hj
  | some j =>
    rcases h j with h' | h'
    · left
      exact hvRow_none_iff.mpr fun j' hj' => by
        rw [hs] at hj'
        cases hj'
        exact h'
    · right
      exact hvRow_none_iff.mpr fun j' hj' => by
        rw [hs] at hj'
        cases hj'
        exact h'

/-- `hv` of a union is the union of the images. -/
theorem hvRow_union (κ : Option Label) (x y : Row (CL Label) (CG Label B)) :
    hvRow P θ ν κ (union x y) = union (hvRow P θ ν κ x) (hvRow P θ ν κ y) := by
  funext k
  have hx := hvRow_eq (P := P) (θ := θ) (ν := ν) κ x k
  have hy := hvRow_eq (P := P) (θ := θ) (ν := ν) κ y k
  rw [hvRow_eq]
  cases hs : src P θ k with
  | none =>
    simp only [hs] at hx hy
    rw [union_of_none hx, hy]
  | some j =>
    simp only [hs] at hx hy
    cases hxj : x j with
    | some g =>
      have h1 : hvRow P θ ν κ x k = some (hv P θ ν (ctxAt P κ k) g) := by
        rw [hx, hxj]
        rfl
      rw [union_of_some h1]
      simp [union, hxj, hvO]
    | none =>
      have h1 : hvRow P θ ν κ x k = none := by
        rw [hx, hxj]
        rfl
      rw [union_of_none h1, hy]
      simp [union, hxj]

theorem hvRow_empty (κ : Option Label) :
    hvRow P θ ν κ Row.empty = Row.empty := by
  funext k
  rw [hvRow_eq]
  cases src P θ k <;> rfl

theorem compose_hvRow (κ : Option Label) {x y v : Row (CL Label) (CG Label B)}
    (h : compose x y = some v) :
    compose (hvRow P θ ν κ x) (hvRow P θ ν κ y) = some (hvRow P θ ν κ v) := by
  obtain ⟨hxy, rfl⟩ := compose_eq_some.mp h
  exact compose_eq_some.mpr ⟨hvRow_disjoint hxy, hvRow_union κ x y⟩

/-- `hv` of a composed list of rows. -/
theorem composeAll_hvRow (κ : Option Label) :
    ∀ {xs : List (Row (CL Label) (CG Label B))} {v : Row (CL Label) (CG Label B)},
      composeAll xs = some v →
        composeAll (xs.map (hvRow P θ ν κ)) = some (hvRow P θ ν κ v)
  | [], v, h => by
    simp only [composeAll, Option.some.injEq] at h
    subst h
    simp [composeAll, hvRow_empty]
  | x :: xs, v, h => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    simp only [List.map_cons, composeAll, composeAll_hvRow κ hw,
      Option.bind_some]
    exact compose_hvRow κ hc

theorem src_unwritten {k : Label} {j : CL Label} (hk : k ∉ written P)
    (h : src P θ k = some j) : ∃ S, j = .inr S := by
  unfold src at h
  simp only [hk, ↓reduceIte] at h
  split at h
  · cases h
  · exact ⟨_, (Option.some.inj h).symm⟩

/-- A written field maps to the same field. -/
theorem hvRow_single {l : Label} (hl : l ∈ written P) (κ : Option Label)
    (g : CG Label B) :
    hvRow P θ ν κ (single (.inl l) g) = single l (hv P θ ν κ g) := by
  funext k
  by_cases hk : k ∈ written P
  · rw [hvRow_eq]
    have : src P θ k = some (.inl k) := by simp [src, hk]
    rw [this]
    by_cases hkl : k = l
    · subst hkl
      simp [single, hvO, ctxAt, hk]
    · simp [single, hkl, hvO]
  · have hkl : k ≠ l := fun h => hk (h ▸ hl)
    have : single l (hv P θ ν κ g) k = none := by simp [single, hkl]
    rw [this]
    refine hvRow_none_iff.mpr fun j hj => ?_
    obtain ⟨S, rfl⟩ := src_unwritten hk hj
    simp [single]

end Composition.Typed
