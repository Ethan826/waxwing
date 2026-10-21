/-
L3 (dossier §14.4, scoped as in §14.8): `h` commutes with evaluation,
for expressions whose labels are written labels of the problem. Rigid
variables need no separate premise: the generic assignment gives every
rigid variable its constant, and `combine_hAssign` shows that `h` of the
generic assignment is `θ` on rigid variables.
-/
import Composition.Sig.Interp

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {θ : Assign Label B} {c : G Label B}

theorem hRow_single {l : Label} (hl : l ∈ written P) (g : GG Label B) :
    hRow P θ c (single (.inl l) g) = single l (interp P θ c g) := by
  funext k
  by_cases hk : k ∈ written P
  · by_cases hkl : k = l
    · subst hkl
      simp [hRow, hk, single, interpO]
    · simp [hRow, hk, single, hkl, interpO]
  · have hkl : k ≠ l := fun h => hk (h ▸ hl)
    simp only [hRow, hk, ↓reduceIte, single, hkl]
    exact restAt_of_none fun _ hr => hr.2.1 (by simp [single])

theorem genRow_inr {π : Pattern Label} {r s : Nat}
    (h : genRow P π r (.inr s) ≠ none) : s = r := by
  simp only [genRow] at h
  split at h
  · assumption
  · exact absurd rfl h

/-- A rigid row's generic image is `θ`'s row, for `θ`'s own pattern. -/
theorem hRow_genRow {r : Nat} (hr : r ∈ P.rigidRow) :
    hRow P θ c (genRow P (presenceOf θ) r) = θ.row r := by
  funext k
  by_cases hk : k ∈ written P
  · simp only [hRow, hk, ↓reduceIte, genRow, presenceOf, true_and]
    cases h : θ.row r k with
    | none => simp [interpO]
    | some v => simp [interpO, interp, hr, h]
  · simp only [hRow, hk, ↓reduceIte]
    unfold restAt
    split
    · next hw =>
      have := Classical.choose_spec hw
      rw [genRow_inr this.2.1]
    · next hw =>
      cases h : θ.row r k with
      | none => rfl
      | some v =>
        exact absurd ⟨r, hr, by simp [genRow], by simp [h]⟩ hw

/-- `h` of the generic assignment is `θ` on rigid variables and `h` of
the certificate on flexible ones. -/
theorem combine_hAssign (σ : Assign (GL Label) (GB Label B)) :
    combine P θ (hAssign P θ c σ) =
      hAssign P θ c (genAssign P (presenceOf θ) σ) := by
  simp only [combine, hAssign, genAssign]
  congr 1
  · funext n
    by_cases hn : n ∈ P.rigidTy <;> simp [hn, interp]
  · funext r
    by_cases hr : r ∈ P.rigidRow
    · simp [hr, hRow_genRow hr]
    · simp [hr]

theorem composeAll_part {L V : Type} :
    ∀ {xs : List (Row L V)} {v : Row L V} {x : Row L V} {k : L} {g : V},
      composeAll xs = some v → x ∈ xs → x k = some g → v k = some g
  | [], _, _, _, _, _, hx, _ => by simp at hx
  | y :: ys, v, x, k, g, h, hx, hk => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨hyw, rfl⟩ := compose_eq_some.mp hc
    rcases List.mem_cons.mp hx with rfl | hx
    · exact union_of_some hk
    · have hwk := composeAll_part hw hx hk
      rcases hyw k with h | h
      · rw [union_of_none h, hwk]
      · rw [h] at hwk
        exact absurd hwk (by simp)

mutual
  /-- L3. -/
  theorem interp_evalT (hD : DeclOk P θ) :
      ∀ (t : TExpr Label B), (∀ l ∈ labelsT t, l ∈ written P) →
        ∀ {Γ : Assign (GL Label) (GB Label B)} {g : GG Label B},
          evalT Γ (liftT t) = some g → WFG P g →
            evalT (hAssign P θ c Γ) t = some (interp P θ c g)
    | .base b, _, Γ, g, h, _ => by
      simp only [liftT, evalT, Option.some.injEq] at h
      subst h
      simp [evalT, interp]
    | .arrow t u, hl, Γ, g, h, hw => by
      simp only [liftT, evalT, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨a, ha, b, hb, rfl⟩ := h
      simp only [WFG] at hw
      have hla : ∀ l ∈ labelsT t, l ∈ written P := fun l h =>
        hl l (by simp [labelsT, h])
      have hlb : ∀ l ∈ labelsT u, l ∈ written P := fun l h =>
        hl l (by simp [labelsT, h])
      simp [evalT, interp_evalT hD t hla ha hw.1,
        interp_evalT hD u hlb hb hw.2, interp]
    | .tvar n, _, Γ, g, h, _ => by
      simp only [liftT, evalT, Option.some.injEq] at h
      subst h
      simp [evalT, hAssign]
    | .record fs tails, hl, Γ, g, h, hw => by
      simp only [liftT] at h
      rw [evalT_record] at h
      simp only [Option.map_eq_some_iff, Option.bind_eq_some_iff] at h
      obtain ⟨v, ⟨frs, hfr, hv⟩, rfl⟩ := h
      simp only [WFG] at hw
      have hparts : ∀ x ∈ frs, ∀ k g', x k = some g' → WFG P g' :=
        fun x hx k g' hk => by
          have := hw.2 k
          rw [composeAll_part hv (List.mem_append_left _ hx) hk] at this
          exact this
      have hf := interp_fieldRows hD fs (fun l h => hl l (by
        simpa [labelsT] using h)) hfr hparts
      rw [evalT_record, hf]
      have hmap : (frs.map (hRow P θ c) ++ tails.map (hAssign P θ c Γ).row) =
          (frs ++ tails.map Γ.row).map (hRow P θ c) := by
        simp [hAssign, List.map_append, List.map_map, Function.comp_def]
      simp only [Option.bind_some, hmap, composeAll_hRow hD hv hw.1,
        Option.map_some, interp_record]

  theorem interp_fieldRows (hD : DeclOk P θ) :
      ∀ (fs : Fields Label B), (∀ l ∈ labelsF fs, l ∈ written P) →
        ∀ {Γ : Assign (GL Label) (GB Label B)}
          {frs : List (Row (GL Label) (GG Label B))},
          fieldRows Γ (liftF fs) = some frs →
          (∀ x ∈ frs, ∀ k g, x k = some g → WFG P g) →
            fieldRows (hAssign P θ c Γ) fs = some (frs.map (hRow P θ c))
    | .nil, _, Γ, frs, h, _ => by
      simp only [liftF, fieldRows, Option.some.injEq] at h
      subst h
      rfl
    | .cons l t rest, hl, Γ, frs, h, hw => by
      simp only [liftF, fieldRows, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨g, hg, frs', hfrs', rfl⟩ := h
      have hlw : l ∈ written P := hl l (by simp [labelsF])
      have hwg : WFG P g :=
        hw _ (List.mem_cons.mpr (Or.inl rfl)) (.inl l) g (by simp [single])
      have ht := interp_evalT hD t (fun k h => hl k (by
        simp [labelsF, h])) hg hwg
      have hr := interp_fieldRows hD rest (fun k h => hl k (by
        simp [labelsF, h])) hfrs' (fun x hx => hw x (List.mem_cons_of_mem _ hx))
      simp [fieldRows, ht, hr, hRow_single hlw]
end

end Composition.Syntax
