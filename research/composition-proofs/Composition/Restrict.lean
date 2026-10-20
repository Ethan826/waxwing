/-
R1, the existential reduction: restricting every row, at every depth,
to the labels written in a problem turns a solution into a solution
that mentions only those labels. The evaluation lemma is directional
(`evalT_restrict`): restriction preserves a successful evaluation; it
need not preserve an undefined one, since two rows overlapping only at
an unwritten label compose once that label is removed.
-/
import Composition.Reduction

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

mutual
  /-- Keep only the labels in `L`, at every depth. -/
  def restrictG (L : List Label) : G Label B → G Label B
    | .base b => .base b
    | .arrow a c => .arrow (restrictG L a) (restrictG L c)
    | .record f => .record fun l => if l ∈ L then restrictO L (f l) else none

  def restrictO (L : List Label) : Option (G Label B) → Option (G Label B)
    | none => none
    | some g => some (restrictG L g)
end

/-- Restrict a row: drop labels outside `L`, restrict the rest. -/
def rrow (L : List Label) (f : Row Label (G Label B)) :
    Row Label (G Label B) :=
  fun l => if l ∈ L then restrictO L (f l) else none

def restrictA (L : List Label) (θ : Assign Label B) : Assign Label B :=
  ⟨fun n => restrictG L (θ.ty n), fun r => rrow L (θ.row r)⟩

theorem restrictG_record (L : List Label) (f : Label → Option (G Label B)) :
    restrictG L (.record f) = .record (rrow L f) := by
  simp only [restrictG]
  rfl

theorem rrow_union (L : List Label) (r s : Row Label (G Label B)) :
    rrow L (union r s) = union (rrow L r) (rrow L s) := by
  funext l
  by_cases hl : l ∈ L <;> cases hr : r l <;>
    simp [rrow, union, hl, hr, restrictO]

theorem rrow_none {L : List Label} {r : Row Label (G Label B)} {l : Label}
    (h : r l = none) : rrow L r l = none := by
  simp [rrow, h, restrictO]

theorem rrow_disjoint {L : List Label} {r s : Row Label (G Label B)}
    (h : Disjoint r s) : Disjoint (rrow L r) (rrow L s) := fun l =>
  (h l).elim (fun h' => Or.inl (rrow_none h')) (fun h' => Or.inr (rrow_none h'))

theorem composeAll_rrow (L : List Label) :
    ∀ {xs : List (Row Label (G Label B))} {v : Row Label (G Label B)},
      composeAll xs = some v →
        composeAll (xs.map (rrow L)) = some (rrow L v)
  | [], v, h => by
    simp [composeAll] at h
    subst h
    simp only [List.map_nil, composeAll, Option.some.injEq]
    funext l
    simp [rrow, Row.empty, restrictO]
  | x :: xs, v, h => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨hd, rfl⟩ := compose_eq_some.mp hc
    simp only [List.map_cons, composeAll, composeAll_rrow L hw,
      Option.bind_some]
    exact compose_eq_some.mpr ⟨rrow_disjoint hd, rrow_union L x w⟩

theorem rrow_single {L : List Label} {l : Label} (hl : l ∈ L)
    (g : G Label B) : rrow L (single l g) = single l (restrictG L g) := by
  funext k
  by_cases hk : k = l
  · subst hk
    simp [rrow, single, hl, restrictO]
  · simp [rrow, single, hk, restrictO]

mutual
  /-- Restriction preserves successful evaluation of an expression
  whose written labels are in `L`. -/
  theorem evalT_restrict {L : List Label} {θ : Assign Label B} :
      ∀ (t : TExpr Label B) {g : G Label B}, (∀ l ∈ labelsT t, l ∈ L) →
        evalT θ t = some g → evalT (restrictA L θ) t = some (restrictG L g)
    | .base _, g, _, h => by
      simp [evalT] at h
      subst h
      simp [evalT, restrictG]
    | .arrow t u, g, hl, h => by
      simp only [evalT, Option.bind_eq_some_iff, Option.map_eq_some_iff]
        at h
      obtain ⟨a, ha, c, hc, rfl⟩ := h
      have h1 := evalT_restrict t (fun l hm => hl l (by simp [labelsT, hm]))
        ha
      have h2 := evalT_restrict u (fun l hm => hl l (by simp [labelsT, hm]))
        hc
      simp [evalT, h1, h2, restrictG]
    | .tvar n, g, _, h => by
      simp [evalT] at h
      subst h
      simp [evalT, restrictA]
    | .record fs tails, g, hl, h => by
      rw [evalT_record] at h ⊢
      cases hf : fieldRows θ fs with
      | none => simp [hf] at h
      | some frs =>
        simp only [hf, Option.bind_some, Option.map_eq_some_iff] at h
        obtain ⟨v, hv, rfl⟩ := h
        have := fieldRows_restrict fs (fun l hm => hl l (by
          simpa [labelsT] using hm)) hf
        rw [this, Option.bind_some]
        have hc := composeAll_rrow L hv
        simp only [List.map_append, List.map_map, Function.comp_def] at hc
        simp [restrictA, hc, restrictG_record]

  theorem fieldRows_restrict {L : List Label} {θ : Assign Label B} :
      ∀ (fs : Fields Label B) {frs : List (Row Label (G Label B))},
        (∀ l ∈ labelsF fs, l ∈ L) → fieldRows θ fs = some frs →
          fieldRows (restrictA L θ) fs = some (frs.map (rrow L))
    | .nil, frs, _, h => by
      simp [fieldRows] at h
      subst h
      rfl
    | .cons l t rest, frs, hl, h => by
      simp only [fieldRows, Option.bind_eq_some_iff, Option.map_eq_some_iff]
        at h
      obtain ⟨g, hg, xs, hxs, rfl⟩ := h
      have h1 := evalT_restrict t (fun k hm => hl k (by
        simp [labelsF, hm])) hg
      have h2 := fieldRows_restrict rest (fun k hm => hl k (by
        simp [labelsF, hm])) hxs
      have hlL : l ∈ L := hl l (by simp [labelsF])
      simp [fieldRows, h1, h2, rrow_single hlL]
end

end Composition.Syntax
