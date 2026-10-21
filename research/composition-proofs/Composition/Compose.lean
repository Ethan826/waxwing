/-
Partial disjoint composition as an `Option`-valued operation, and the
algebra the substitution proofs need: identity, commutativity,
associativity, flattening of lists, and the domain of a composition.
Disjointness of arbitrary maps is not decidable, so these definitions
are classical (noncomputable); they are semantics, not an algorithm.
-/
import Composition.Rows

namespace Composition

open Classical

variable {Label V : Type}

/-- `r ⊎ s`, defined only for disjoint rows. -/
noncomputable def compose (r s : Row Label V) : Option (Row Label V) :=
  if Disjoint r s then some (union r s) else none

/-- Compose a list of rows, right to left; `{}` for the empty list. -/
noncomputable def composeAll : List (Row Label V) → Option (Row Label V)
  | [] => some Row.empty
  | r :: rs => (composeAll rs).bind (compose r)

theorem compose_eq_some {r s u : Row Label V} :
    compose r s = some u ↔ Disjoint r s ∧ u = union r s := by
  unfold compose
  split <;> simp_all [eq_comm]

theorem union_comm {r s : Row Label V} (h : Disjoint r s) :
    union r s = union s r := by
  funext l
  rcases h l with h' | h' <;> cases hr : r l <;> cases hs : s l <;>
    simp_all [union]

theorem disjoint_comm {r s : Row Label V} :
    Disjoint r s ↔ Disjoint s r :=
  ⟨fun h l => (h l).symm, fun h l => (h l).symm⟩

theorem compose_comm (r s : Row Label V) : compose r s = compose s r := by
  unfold compose
  by_cases h : Disjoint r s
  · simp [h, disjoint_comm.mp h, union_comm h]
  · have : ¬ Disjoint s r := fun h' => h (disjoint_comm.mp h')
    simp [h, this]

theorem union_empty (r : Row Label V) : union r Row.empty = r := by
  funext l
  cases h : r l <;> simp [union, Row.empty, h]

theorem empty_union (r : Row Label V) : union Row.empty r = r := by
  funext l
  simp [union, Row.empty]

theorem compose_empty (r : Row Label V) : compose r Row.empty = some r := by
  simp [compose, Disjoint, Row.empty, union_empty]

theorem empty_compose (r : Row Label V) : compose Row.empty r = some r := by
  rw [compose_comm, compose_empty]

/-- Pointwise view of the union. -/
theorem union_none_iff {r s : Row Label V} {l : Label} :
    union r s l = none ↔ r l = none ∧ s l = none := by
  cases h : r l <;> simp [union, h]

theorem union_assoc (r s t : Row Label V) :
    union (union r s) t = union r (union s t) := by
  funext l
  cases h : r l <;> simp [union, h]

theorem disjoint_union_left {r s t : Row Label V} :
    Disjoint (union r s) t ↔ Disjoint r t ∧ Disjoint s t := by
  constructor
  · intro h
    refine ⟨fun l => ?_, fun l => ?_⟩ <;> rcases h l with h' | h' <;>
      simp_all [union_none_iff]
  · rintro ⟨h1, h2⟩ l
    rcases h1 l with a | a <;> rcases h2 l with b | b <;>
      simp_all [union_none_iff]

theorem disjoint_union_right {r s t : Row Label V} :
    Disjoint r (union s t) ↔ Disjoint r s ∧ Disjoint r t := by
  rw [disjoint_comm, disjoint_union_left, disjoint_comm,
    @disjoint_comm _ _ t r]

/-- Associativity of partial composition, in the `Option` monad: both
sides are defined iff the three rows are pairwise disjoint. -/
theorem compose_assoc (r s t : Row Label V) :
    (compose r s).bind (fun a => compose a t) =
      (compose s t).bind (fun b => compose r b) := by
  by_cases hrs : Disjoint r s <;> by_cases hst : Disjoint s t <;>
    by_cases hrt : Disjoint r t <;>
    simp [compose, hrs, hst, hrt, disjoint_union_left,
      disjoint_union_right, union_assoc]

/-- Composing a concatenation: compose each half, then the two results. -/
theorem composeAll_append (xs ys : List (Row Label V)) :
    composeAll (xs ++ ys) =
      (composeAll ys).bind (fun b =>
        (composeAll xs).bind (fun a => compose a b)) := by
  induction xs with
  | nil => simp [composeAll, empty_compose]
  | cons x xs ih =>
    simp only [List.cons_append, composeAll, ih, Option.bind_assoc]
    congr 1
    funext b
    congr 1
    funext a
    exact (compose_assoc x a b).symm

/-- A composition lacks a label iff every part does. -/
theorem composeAll_none_iff {rows : List (Row Label V)} {v : Row Label V}
    (h : composeAll rows = some v) (l : Label) :
    v l = none ↔ ∀ x ∈ rows, x l = none := by
  induction rows generalizing v with
  | nil =>
    simp [composeAll] at h
    simp [← h, Row.empty]
  | cons x xs ih =>
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨_, rfl⟩ := compose_eq_some.mp hc
    simp [union_none_iff, ih hw]

/-- Two parts can be composed in either order. -/
theorem compose_swap (x y c : Row Label V) :
    (compose y c).bind (compose x) = (compose x c).bind (compose y) := by
  have h1 := compose_assoc x y c
  have h2 := compose_assoc y x c
  rw [compose_comm x y] at h1
  rw [← h1, h2]

/-- Composition of a list does not depend on the order of its parts. -/
theorem composeAll_perm {xs ys : List (Row Label V)} (h : xs.Perm ys) :
    composeAll xs = composeAll ys := by
  induction h with
  | nil => rfl
  | cons x _ ih => simp [composeAll, ih]
  | swap x y zs =>
    simp only [composeAll, Option.bind_assoc]
    congr 1
    funext c
    exact (compose_swap x y c).symm
  | trans _ _ ih1 ih2 => rw [ih1, ih2]

/-- A list's composition depends on a sublist only through that
sublist's composition. -/
theorem composeAll_congr (xs ys ys' : List (Row Label V))
    (h : composeAll ys = composeAll ys') :
    composeAll (xs ++ ys) = composeAll (xs ++ ys') := by
  rw [composeAll_append, composeAll_append, h]

/-- A composition of one row is that row. -/
theorem composeAll_single (r : Row Label V) : composeAll [r] = some r := by
  simp [composeAll, compose_empty]

/-- Two compositions are disjoint iff every part of one is disjoint from
every part of the other. -/
theorem disjoint_composeAll {xs ys : List (Row Label V)}
    {v w : Row Label V} (hv : composeAll xs = some v)
    (hw : composeAll ys = some w) :
    Disjoint v w ↔ ∀ x ∈ xs, ∀ y ∈ ys, Disjoint x y := by
  constructor
  · intro h x hx y hy l
    rcases h l with h' | h'
    · exact Or.inl (((composeAll_none_iff hv l).mp h') x hx)
    · exact Or.inr (((composeAll_none_iff hw l).mp h') y hy)
  · intro h l
    rw [composeAll_none_iff hv, composeAll_none_iff hw]
    by_cases hx : ∀ x ∈ xs, x l = none
    · exact Or.inl hx
    · right
      intro y hy
      simp only [Classical.not_forall] at hx
      obtain ⟨x, hx, hl⟩ := hx
      rcases h x hx y hy l with h' | h'
      · exact absurd h' hl
      · exact h'

end Composition
