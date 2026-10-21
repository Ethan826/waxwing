/-
Projection and evaluation (for `CellIndependence`): projecting a generic
assignment onto cells `L` maps every defined value of the problem's
expressions to its projection, and projecting the pre-instance over `C`
onto `L ⊆ C` gives the pre-instance over `L`. Also: an undefined
composition stays undefined under any row map that keeps the presence
of the label where two rows overlap.
-/
import Composition.Typed.MGUExists

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- A row map that commutes with composition. -/
structure RowHom {L V : Type} (ψ : Row L V → Row L V) : Prop where
  union : ∀ x y, ψ (union x y) = union (ψ x) (ψ y)
  disj : ∀ x y, Composition.Disjoint x y → Composition.Disjoint (ψ x) (ψ y)
  empty : ψ Row.empty = Row.empty

theorem composeAll_hom {L V : Type} {ψ : Row L V → Row L V} (hψ : RowHom ψ) :
    ∀ {xs : List (Row L V)} {v : Row L V}, composeAll xs = some v →
      composeAll (xs.map ψ) = some (ψ v)
  | [], v, h => by
    simp only [composeAll, Option.some.injEq] at h
    subst h
    simp [composeAll, hψ.empty]
  | x :: xs, v, h => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨hxw, rfl⟩ := compose_eq_some.mp hc
    simp only [List.map_cons, composeAll, composeAll_hom hψ hw,
      Option.bind_some]
    exact compose_eq_some.mpr ⟨hψ.disj x w hxw, hψ.union x w⟩

/-- An undefined composition has a label where two rows overlap; maps
keeping presence there keep it undefined. -/
theorem composeAll_conflict {L V : Type} :
    ∀ {xs : List (Row L V)}, composeAll xs = none →
      ∃ j, (∃ x ∈ xs, x j ≠ none) ∧ ∀ ψ : Row L V → Row L V, RowHom ψ →
        (∀ x, ψ x j = none ↔ x j = none) → composeAll (xs.map ψ) = none
  | [], h => by simp [composeAll] at h
  | x :: xs, h => by
    cases hw : composeAll xs with
    | none =>
      obtain ⟨j, ⟨y, hy, hyj⟩, hj⟩ := composeAll_conflict hw
      refine ⟨j, ⟨y, List.mem_cons_of_mem _ hy, hyj⟩, fun ψ hψ hp => ?_⟩
      simp [composeAll, hj ψ hψ hp]
    | some w =>
      simp only [composeAll, hw, Option.bind_some, compose] at h
      split at h
      · cases h
      · next hd =>
        obtain ⟨j, hj⟩ : ∃ j, x j ≠ none ∧ w j ≠ none :=
          Classical.byContradiction fun hn => hd fun j =>
            Classical.byContradiction fun hj' => hn ⟨j, by
              simp only [not_or] at hj'; exact hj'⟩
        refine ⟨j, ⟨x, List.mem_cons_self, hj.1⟩, fun ψ hψ hp => ?_⟩
        simp only [List.map_cons, composeAll, composeAll_hom hψ hw,
          Option.bind_some, compose]
        split
        · next hd' =>
          rcases hd' j with h0 | h0
          · exact absurd ((hp x).mp h0) hj.1
          · exact absurd ((hp w).mp h0) hj.2
        · rfl

omit [DecidableEq Label] in
theorem prRow_hom (L : List Cell) :
    RowHom (prRow L : Row (CL Label) (CG Label B) → _) where
  union x y := by
    funext j
    cases j with
    | inl l => cases h : x (.inl l) <;> simp [prRow, union, h, prO]
    | inr S =>
      by_cases hS : S ∈ L
      · cases h : x (.inr S) <;> simp [prRow, union, h, prO, hS]
      · simp [prRow, union, hS]
  disj x y h j := by
    cases j with
    | inl l => rcases h (.inl l) with h0 | h0 <;> simp [prRow, h0, prO]
    | inr S =>
      by_cases hS : S ∈ L
      · rcases h (.inr S) with h0 | h0 <;> simp [prRow, h0, prO, hS]
      · simp [prRow, hS]
  empty := by funext j; cases j <;> simp [prRow, Row.empty, prO]

theorem prRow_single (L : List Cell) (l : Label) (g : CG Label B) :
    prRow L (single (.inl l) g) = single (.inl l) (pr L g) := by
  funext j
  cases j with
  | inl k => by_cases h : k = l <;> simp [prRow, single, h, prO]
  | inr S => simp [prRow, single, prO]

/-- Projection of a generic assignment. -/
def prAssign (L : List Cell) (Γ : CAssign Label B) : CAssign Label B :=
  ⟨fun n => pr L (Γ.ty n), fun r => prRow L (Γ.row r)⟩

theorem eta_pr {P : SigProblem Label B} {π : Pattern Label}
    {C L : List Cell} (hL : ∀ S ∈ L, S ∈ C) :
    prAssign L (eta P π C) = eta P π L := by
  simp only [prAssign, eta]
  congr 1
  funext r j
  cases j with
  | inl l =>
    simp only [prRow, etaRow]
    split <;> simp [prO, pr]
  | inr S =>
    by_cases hS : S ∈ L
    · by_cases hr : r ∈ S <;> simp [prRow, etaRow, hS, hL S hS, hr, prO, pr]
    · simp [prRow, etaRow, hS]

end Composition.Typed
