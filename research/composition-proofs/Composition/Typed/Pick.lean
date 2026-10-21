/-
Disjoint composition label by label: a list of rows composes iff, at
every label, at most one row is present, and the composition's field is
then that row's (`composeAll_iff_pick`). With rows named by indices,
the present row is the first one present (`pick_map`), so two columns
with the same presence compose alike (`pick_map_same`). Used for flat
row equations (Typed/Flat.lean).
-/
import Composition.Compose

namespace Composition.Typed

open Composition

variable {V : Type}

/-- The one present entry (`some (some v)`), none present
(`some none`), or two present (`none`). -/
def pick : List (Option V) → Option (Option V)
  | [] => some none
  | none :: os => pick os
  | some v :: os => match pick os with
    | some none => some (some v)
    | _ => none

theorem composeAll_iff_pick {L : Type} :
    ∀ (xs : List (Row L V)) (v : Row L V),
      composeAll xs = some v ↔ ∀ k, pick (xs.map (· k)) = some (v k)
  | [], v => by
    constructor
    · intro h k
      simp only [composeAll, Option.some.injEq] at h
      subst h
      rfl
    · intro h
      have : v = Row.empty := funext fun k => by
        have := h k
        simp only [List.map_nil, pick, Option.some.injEq] at this
        exact this.symm
      subst this
      rfl
  | x :: xs, v => by
    simp only [composeAll, Option.bind_eq_some_iff, List.map_cons]
    constructor
    · rintro ⟨w, hw, hc⟩ k
      obtain ⟨hxw, rfl⟩ := compose_eq_some.mp hc
      have hk := (composeAll_iff_pick xs w).mp hw k
      cases hx : x k with
      | none => simp [pick, hk, union, hx]
      | some a =>
        rcases hxw k with h | h
        · rw [hx] at h
          cases h
        · simp [pick, hk, h, union, hx]
    · intro h
      have ht : ∀ k, ∃ o, pick (xs.map (· k)) = some o := fun k => by
        have := h k
        cases hx : x k with
        | none => simp only [hx, pick] at this; exact ⟨_, this⟩
        | some a =>
          simp only [hx, pick] at this
          split at this
          · next o hp => exact ⟨_, hp⟩
          · cases this
      let w : Row L V := fun k => (pick (xs.map (· k))).getD none
      have hw : composeAll xs = some w :=
        (composeAll_iff_pick xs w).mpr fun k => by
          obtain ⟨o, ho⟩ := ht k
          simp [w, ho]
      refine ⟨w, hw, compose_eq_some.mpr ⟨fun k => ?_, funext fun k => ?_⟩⟩
      · have := h k
        cases hx : x k with
        | none => exact Or.inl rfl
        | some a =>
          right
          simp only [hx, pick] at this
          split at this
          · next hp => simp [w, hp]
          · cases this
      · have := h k
        cases hx : x k with
        | none =>
          simp only [hx, pick] at this
          simp [union, hx, w, this]
        | some a =>
          simp only [hx, pick] at this
          split at this
          · simp only [Option.some.injEq] at this
            show v k = union x w k
            rw [union_of_some hx]
            exact this.symm
          · cases this

/-- `pick` of a column: the first present row's field, unless two rows
are present. -/
theorem pick_map (c : Nat → Option V) :
    ∀ rs : List Nat, pick (rs.map c) =
      if 2 ≤ (rs.filter fun r => (c r).isSome).length then none
      else some ((rs.find? fun r => (c r).isSome).bind c)
  | [] => by simp [pick]
  | r :: rs => by
    have ih := pick_map c rs
    cases hc : c r with
    | none =>
      simp [pick, hc, ih, List.filter, List.find?]
    | some a =>
      simp only [List.map_cons, hc, pick, ih, List.filter, Option.isSome_some,
        List.length_cons, List.find?, Option.bind_some]
      by_cases h2 : 2 ≤ (rs.filter fun r => (c r).isSome).length
      · have h3 : 2 ≤ (rs.filter fun r => (c r).isSome).length + 1 := by
          omega
        simp [h2, h3]
      · simp only [h2, ↓reduceIte]
        cases hf : rs.find? (fun r => (c r).isSome) with
        | none =>
          have : (rs.filter fun r => (c r).isSome).length = 0 := by
            rw [List.length_eq_zero_iff, List.filter_eq_nil_iff]
            intro x hx hcx
            exact absurd (List.find?_eq_none.mp hf x hx) (by simp [hcx])
          simp [this]
        | some r' =>
          have hr' := List.find?_some hf
          have hm := List.mem_of_find?_eq_some hf
          have : 1 ≤ (rs.filter fun r => (c r).isSome).length :=
            List.length_pos_iff.mpr (List.ne_nil_of_mem
              (List.mem_filter.mpr ⟨hm, hr'⟩))
          have h3 : 2 ≤ (rs.filter fun r => (c r).isSome).length + 1 := by
            omega
          simp only [h3, ↓reduceIte]
          cases hcr : c r' with
          | none => simp [hcr] at hr'
          | some b => simp [hcr]

theorem find?_congr' {p q : Nat → Bool} :
    ∀ rs : List Nat, (∀ r ∈ rs, p r = q r) → rs.find? p = rs.find? q
  | [], _ => rfl
  | r :: rs, h => by
    simp only [List.find?, h r List.mem_cons_self,
      find?_congr' rs fun x hx => h x (List.mem_cons_of_mem _ hx)]

/-- Two columns with the same presence on `rs`: `pick` fails together,
and otherwise picks the same row. -/
theorem pick_map_same {W : Type} (c : Nat → Option V) (d : Nat → Option W)
    (rs : List Nat) (hp : ∀ r ∈ rs, (c r).isSome = (d r).isSome) :
    (rs.filter fun r => (c r).isSome) = (rs.filter fun r => (d r).isSome) ∧
      (rs.find? fun r => (c r).isSome) = (rs.find? fun r => (d r).isSome) :=
  ⟨List.filter_congr fun r hr => hp r hr,
   find?_congr' rs fun r hr => hp r hr⟩

end Composition.Typed
