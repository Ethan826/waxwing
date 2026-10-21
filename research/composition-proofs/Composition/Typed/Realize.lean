/-
Realizing a generic value as a ground one (for D3bComplete): cell label
`inr S` becomes the fresh label `z S`, constant `c` the fresh base
`e c`, everything else stays. `dn` reads ground label `k` from generic
label `rinv z k` (`inr S` if `k = z S`, else `inl k`), so it is a
homomorphism for the problem's expressions when `z` is injective and
avoids the written labels; it keeps values finite.
-/
import Composition.Typed.Commute

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

open Classical in
/-- The generic label a ground label is read from. -/
noncomputable def rinv (z : Cell → Label) (k : Label) : CL Label :=
  if h : ∃ S, z S = k then .inr (Classical.choose h) else .inl k

mutual
  noncomputable def dn (z : Cell → Label) (e : CConst Label → B) :
      CG Label B → G Label B
    | .base (.inl b) => .base b
    | .base (.inr c) => .base (e c)
    | .arrow a c => .arrow (dn z e a) (dn z e c)
    | .record f => .record fun k => dnO z e (f (rinv z k))

  noncomputable def dnO (z : Cell → Label) (e : CConst Label → B) :
      Option (CG Label B) → Option (G Label B)
    | none => none
    | some g => some (dn z e g)
end

noncomputable def dnRow (z : Cell → Label) (e : CConst Label → B)
    (f : Row (CL Label) (CG Label B)) : Row Label (G Label B) :=
  fun k => dnO z e (f (rinv z k))

noncomputable def dnAssign (z : Cell → Label) (e : CConst Label → B)
    (σ : CAssign Label B) : Assign Label B :=
  ⟨fun n => dn z e (σ.ty n), fun r => dnRow z e (σ.row r)⟩

variable {P : SigProblem Label B} {z : Cell → Label} {e : CConst Label → B}

omit [DecidableEq Label] in
theorem dn_record (f : Row (CL Label) (CG Label B)) :
    dn z e (.record f) = .record (dnRow z e f) := by
  simp only [dn]
  rfl

omit [DecidableEq Label] in
theorem rinv_z (hz : ∀ S S', z S = z S' → S = S') (S : Cell) :
    rinv z (z S) = .inr S := by
  have h : ∃ S', z S' = z S := ⟨S, rfl⟩
  simp only [rinv, h, ↓reduceDIte]
  rw [hz _ _ (Classical.choose_spec h)]

omit [DecidableEq Label] in
theorem rinv_of_not {k : Label} (hk : ∀ S, z S ≠ k) : rinv z k = .inl k := by
  have h : ¬ ∃ S, z S = k := fun ⟨S, hS⟩ => hk S hS
  simp only [rinv, h, ↓reduceDIte]

omit [DecidableEq Label] in
theorem rinv_inl {k l : Label} (h : rinv z k = .inl l) : k = l := by
  unfold rinv at h
  split at h
  · cases h
  · cases h; rfl

omit [DecidableEq Label] in
theorem dnRow_disjoint {x y : Row (CL Label) (CG Label B)}
    (h : Composition.Disjoint x y) :
    Composition.Disjoint (dnRow z e x) (dnRow z e y) := fun k => by
  rcases h (rinv z k) with h' | h' <;> simp [dnRow, h', dnO]

omit [DecidableEq Label] in
theorem dnRow_union (x y : Row (CL Label) (CG Label B)) :
    dnRow z e (union x y) = union (dnRow z e x) (dnRow z e y) := by
  funext k
  simp only [dnRow, union]
  cases x (rinv z k) <;> rfl

omit [DecidableEq Label] in
theorem composeAll_dnRow :
    ∀ {xs : List (Row (CL Label) (CG Label B))}
      {v : Row (CL Label) (CG Label B)},
      composeAll xs = some v →
        composeAll (xs.map (dnRow z e)) = some (dnRow z e v)
  | [], v, h => by
    simp only [composeAll, Option.some.injEq] at h
    subst h
    rfl
  | x :: xs, v, h => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨hxw, rfl⟩ := compose_eq_some.mp hc
    simp only [List.map_cons, composeAll, composeAll_dnRow hw,
      Option.bind_some]
    exact compose_eq_some.mpr ⟨dnRow_disjoint hxw, dnRow_union x w⟩

theorem dnRow_single (hzw : ∀ S, z S ∉ written P) {l : Label}
    (hl : l ∈ written P) (g : CG Label B) :
    dnRow z e (single (.inl l) g) = single l (dn z e g) := by
  funext k
  by_cases hk : k = l
  · subst hk
    rw [dnRow, rinv_of_not fun S h => hzw S (by rw [h]; exact hl)]
    simp [single, dnO]
  · have : rinv z k ≠ .inl l := fun h => hk (rinv_inl h)
    simp [dnRow, single, this, hk, dnO]

mutual
  theorem dn_evalT (hzw : ∀ S, z S ∉ written P) :
      ∀ (t : TExpr Label B), (∀ l ∈ labelsT t, l ∈ written P) →
        ∀ {Γ : CAssign Label B} {g : CG Label B},
          evalT Γ (cliftT t) = some g →
            evalT (dnAssign z e Γ) t = some (dn z e g)
    | .base b, _, Γ, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      simp [evalT, dn]
    | .arrow t u, hl, Γ, g, h => by
      simp only [cliftT, evalT, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨a, ha, b, hb, rfl⟩ := h
      have := dn_evalT hzw t (fun l h => hl l (by simp [labelsT, h])) ha
      have := dn_evalT hzw u (fun l h => hl l (by simp [labelsT, h])) hb
      simp_all [evalT, dn]
    | .tvar n, _, Γ, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      simp [evalT, dnAssign]
    | .record fs tails, hl, Γ, g, h => by
      simp only [cliftT] at h
      rw [evalT_record] at h
      simp only [Option.map_eq_some_iff, Option.bind_eq_some_iff] at h
      obtain ⟨v, ⟨frs, hfr, hv⟩, rfl⟩ := h
      have hf := dn_fieldRows hzw fs (fun l h => hl l (by
        simpa [labelsT] using h)) hfr
      rw [evalT_record, hf]
      have hmap : (frs.map (dnRow z e) ++ tails.map (dnAssign z e Γ).row) =
          (frs ++ tails.map Γ.row).map (dnRow z e) := by
        simp [dnAssign, List.map_append, List.map_map, Function.comp_def]
      simp only [Option.bind_some, hmap, composeAll_dnRow hv,
        Option.map_some, dn_record]

  theorem dn_fieldRows (hzw : ∀ S, z S ∉ written P) :
      ∀ (fs : Fields Label B), (∀ l ∈ labelsF fs, l ∈ written P) →
        ∀ {Γ : CAssign Label B} {frs : List (Row (CL Label) (CG Label B))},
          fieldRows Γ (cliftF fs) = some frs →
            fieldRows (dnAssign z e Γ) fs = some (frs.map (dnRow z e))
    | .nil, _, Γ, frs, h => by
      simp only [cliftF, fieldRows, Option.some.injEq] at h
      subst h
      rfl
    | .cons l t rest, hl, Γ, frs, h => by
      simp only [cliftF, fieldRows, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨g, hg, frs', hfrs', rfl⟩ := h
      have hlw : l ∈ written P := hl l (by simp [labelsF])
      have ht := dn_evalT hzw t (fun k h => hl k (by simp [labelsF, h])) hg
      have hr := dn_fieldRows hzw rest (fun k h => hl k (by
        simp [labelsF, h])) hfrs'
      simp [fieldRows, ht, hr, dnRow_single hzw hlw]
end

end Composition.Typed
