/-
Presence patterns: how a pattern's records evaluate, and R2′
(closedness) proved.
-/
import Composition.Closed

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem mem_dedup {α : Type} [DecidableEq α] {a : α} :
    ∀ {xs : List α}, a ∈ dedup xs ↔ a ∈ xs
  | [] => by simp [dedup]
  | x :: xs => by
    by_cases h : x ∈ xs
    · simp only [dedup, h, ite_true, mem_dedup, List.mem_cons]
      constructor
      · exact Or.inr
      · rintro (rfl | h') <;> assumption
    · simp [dedup, h, mem_dedup]

theorem nodup_dedup {α : Type} [DecidableEq α] :
    ∀ xs : List α, (dedup xs).Nodup
  | [] => List.nodup_nil
  | x :: xs => by
    by_cases h : x ∈ xs
    · simp only [dedup, h, ite_true]
      exact nodup_dedup xs
    · simp only [dedup, h, ite_false]
      exact List.nodup_cons.mpr ⟨fun hm => h (mem_dedup.mp hm),
        nodup_dedup xs⟩

/-- The row a pattern gives `r` over `L`, under `θ`. -/
def patRow (θ : Assign Label B) (π : Nat → Label → Bool)
    (fresh : Nat → Label → Nat) (r : Nat) (L : List Label) :
    Row Label (G Label B) :=
  fun l => if l ∈ L ∧ π r l = true then some (θ.ty (fresh r l)) else none

theorem evalF_patternFields (θ : Assign Label B) (π : Nat → Label → Bool)
    (fresh : Nat → Label → Nat) (r : Nat) :
    ∀ L : List Label, L.Nodup →
      evalF θ (patternFields π fresh r L) = some (patRow θ π fresh r L)
  | [], _ => by
    simp only [patternFields, evalF, Option.some.injEq]
    funext l
    simp [patRow, Row.empty]
  | l :: ls, hn => by
    have ⟨hl, hs⟩ := List.nodup_cons.mp hn
    have ih := evalF_patternFields θ π fresh r ls hs
    by_cases hp : π r l = true
    · simp only [patternFields, hp, ite_true, evalF, ih, Option.bind_some]
      refine compose_eq_some.mpr ⟨fun k => ?_, funext fun k => ?_⟩
      · by_cases hk : k = l
        · subst hk
          right
          simp [patRow, hl]
        · left
          simp [single, hk]
      · by_cases hk : k = l
        · subst hk
          simp [patRow, union, single, hp]
        · simp [patRow, union, single, hk]
    · have hf : π r l = false := by simpa using hp
      simp only [patternFields, hf, Bool.false_eq_true, ite_false, ih]
      congr 1
      funext k
      by_cases hk : k = l
      · subst hk
        simp [patRow, hp, hl]
      · simp [patRow, hk]

theorem evalT_pattern (θ : Assign Label B) (π : Nat → Label → Bool)
    (fresh : Nat → Label → Nat) (r : Nat) (L : List Label) (hn : L.Nodup) :
    evalT θ (.record (patternFields π fresh r L) []) =
      some (.record (patRow θ π fresh r L)) := by
  simp [evalT, evalF_patternFields θ π fresh r L hn, composeAll,
    compose_empty]

omit [DecidableEq Label] in
theorem lookup_map_mem {β : Type} (v : Nat → β) :
    ∀ {R : List Nat} {r : Nat}, r ∈ R →
      (R.map fun x => (x, v x)).lookup r = some (v r)
  | x :: xs, r, h => by
    by_cases hx : r = x
    · subst hx
      simp
    · have : (r == x) = false := by simpa using hx
      simp only [List.map_cons, List.lookup, this]
      exact lookup_map_mem v (List.mem_of_ne_of_mem hx h)

omit [DecidableEq Label] in
theorem rowOf_pattern {π : Nat → Label → Bool} {fresh : Nat → Label → Nat}
    {R : List Nat} {L : List Label} {r : Nat} (h : r ∈ R) :
    rowOf (patternSubst (B := B) π fresh R L) r =
      (patternFields π fresh r L, []) := by
  simp [rowOf, patternSubst, lookup_map_mem (fun x =>
    ((patternFields (B := B) π fresh x L), ([] : List Nat))) h]

end Composition.Syntax
