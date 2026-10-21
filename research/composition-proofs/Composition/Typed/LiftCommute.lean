/-
`up` commutes with evaluation of the problem's expressions (labels
written, bases written), so it carries atoms of `P` holding at a ground
assignment to their lifted forms at its image; and it keeps values
finite when each generic label is read from a ground label with a known
partial inverse (`pre`).
-/
import Composition.Typed.Lift

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {src : CL Label → Option Label}
  {φ : B → CB Label B}

mutual
  theorem up_evalT (hok : UpOk P src φ) :
      ∀ (t : TExpr Label B), (∀ l ∈ labelsT t, l ∈ written P) →
        (∀ b ∈ basesT t, b ∈ basesOf P) →
        ∀ {θ : Assign Label B} {g : G Label B}, evalT θ t = some g →
          evalT (upAssign src φ θ) (cliftT t) = some (up src φ g)
    | .base b, _, hb, θ, g, h => by
      simp only [evalT, Option.some.injEq] at h
      subst h
      simp [cliftT, evalT, up, hok.2.2 b (hb b (by simp [basesT]))]
    | .arrow t u, hl, hb, θ, g, h => by
      simp only [evalT, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨a, ha, c, hc, rfl⟩ := h
      have := up_evalT hok t (fun l h => hl l (by simp [labelsT, h]))
        (fun b h => hb b (by simp [basesT, h])) ha
      have := up_evalT hok u (fun l h => hl l (by simp [labelsT, h]))
        (fun b h => hb b (by simp [basesT, h])) hc
      simp_all [cliftT, evalT, up]
    | .tvar n, _, _, θ, g, h => by
      simp only [evalT, Option.some.injEq] at h
      subst h
      simp [cliftT, evalT, upAssign]
    | .record fs tails, hl, hb, θ, g, h => by
      rw [evalT_record] at h
      simp only [Option.map_eq_some_iff, Option.bind_eq_some_iff] at h
      obtain ⟨v, ⟨frs, hfr, hv⟩, rfl⟩ := h
      have hf := up_fieldRows hok fs (fun l h => hl l (by
        simpa [labelsT] using h)) (fun b h => hb b (by
        simpa [basesT] using h)) hfr
      simp only [cliftT]
      rw [evalT_record, hf]
      have hmap : (frs.map (upRow src φ) ++
          tails.map (upAssign src φ θ).row) =
          (frs ++ tails.map θ.row).map (upRow src φ) := by
        simp [upAssign, List.map_append, List.map_map, Function.comp_def]
      simp only [Option.bind_some, hmap, composeAll_upRow hv,
        Option.map_some, up_record]

  theorem up_fieldRows (hok : UpOk P src φ) :
      ∀ (fs : Fields Label B), (∀ l ∈ labelsF fs, l ∈ written P) →
        (∀ b ∈ basesF fs, b ∈ basesOf P) →
        ∀ {θ : Assign Label B} {frs : List (Row Label (G Label B))},
          fieldRows θ fs = some frs →
            fieldRows (upAssign src φ θ) (cliftF fs) =
              some (frs.map (upRow src φ))
    | .nil, _, _, θ, frs, h => by
      simp only [fieldRows, Option.some.injEq] at h
      subst h
      rfl
    | .cons l t rest, hl, hb, θ, frs, h => by
      simp only [fieldRows, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨g, hg, frs', hfrs', rfl⟩ := h
      have hlw : l ∈ written P := hl l (by simp [labelsF])
      have ht := up_evalT hok t (fun k h => hl k (by simp [labelsF, h]))
        (fun b h => hb b (by simp [basesF, h])) hg
      have hr := up_fieldRows hok rest (fun k h => hl k (by
        simp [labelsF, h])) (fun b h => hb b (by simp [basesF, h])) hfrs'
      simp [cliftF, fieldRows, ht, hr, upRow_single hok hlw]
end

omit [DecidableEq Label] in
theorem bases_of_mem {t u : TExpr Label B}
    (ha : Atom.eq t u ∈ P.D ++ P.B) :
    (∀ b ∈ basesT t, b ∈ basesOf P) ∧ ∀ b ∈ basesT u, b ∈ basesOf P :=
  ⟨fun b hb => List.mem_flatMap.mpr ⟨_, ha, by simp [hb]⟩,
   fun b hb => List.mem_flatMap.mpr ⟨_, ha, by simp [hb]⟩⟩

omit [DecidableEq Label] in
theorem labels_of_mem {a : Atom Label B} (ha : a ∈ P.D ++ P.B) :
    ∀ l ∈ labelsOf [a], l ∈ written P := fun l hl => by
  simp only [written, labelsOf, List.flatMap_cons, List.flatMap_nil,
    List.append_nil] at hl ⊢
  exact List.mem_flatMap.mpr ⟨a, ha, hl⟩

/-- An atom of `P` holding at `θ` holds, lifted, at its image. -/
theorem holds_up (hok : UpOk P src φ) {θ : Assign Label B}
    {a : Atom Label B} (ha : a ∈ P.D ++ P.B) (h : Holds θ a) :
    Holds (upAssign src φ θ) (cliftAtom a) := by
  have hl := labels_of_mem ha
  cases a with
  | eq t u =>
    obtain ⟨g, ht, hu⟩ := h
    have hb := bases_of_mem ha
    exact ⟨_, up_evalT hok t (fun l h => hl l (by simp [labelsOf, h])) hb.1
      ht, up_evalT hok u (fun l h => hl l (by simp [labelsOf, h])) hb.2 hu⟩
  | lacks r l =>
    have hw : l ∈ written P := hl l (by simp [labelsOf])
    have h' : θ.row r l = none := h
    show upRow src φ (θ.row r) (.inl l) = none
    simp [upRow, hok.1 l hw, h', upO]
  | disjoint x y => exact upRow_disjoint h
  | ff => exact h.elim

omit [DecidableEq Label] in
theorem upRow_some {f : Row Label (G Label B)} {j : CL Label} {k : Label}
    (h : src j = some k) : upRow src φ f j = upO src φ (f k) := by
  simp [upRow, h]

omit [DecidableEq Label] in
theorem upRow_none {f : Row Label (G Label B)} {j : CL Label}
    (h : src j = none) : upRow src φ f j = none := by
  simp [upRow, h]

omit [DecidableEq Label] in
mutual
  /-- With a partial inverse of `src`, `up` keeps values finite. -/
  theorem up_fin (pre : Label → Option (CL Label))
      (hpre : ∀ j k, src j = some k → pre k = some j)
      (hφ : ∀ b, FinG (G.base (φ b) : CG Label B)) :
      ∀ g : G Label B, FinG g → FinG (up src φ g)
    | .base b, _ => hφ b
    | .arrow a c, h => by
      simp only [FinG] at h
      simp only [up, FinG]
      exact ⟨up_fin pre hpre hφ a h.1, up_fin pre hpre hφ c h.2⟩
    | .record f, h => by
      rw [up_record, finG_record]
      obtain ⟨⟨ls, hls⟩, hv⟩ := (finG_record f).mp h
      refine ⟨⟨ls.filterMap pre, fun j hj => ?_⟩, fun j => ?_⟩
      · cases hs : src j with
        | none => exact absurd (upRow_none hs) hj
        | some k =>
          rw [upRow_some hs] at hj
          have hk : f k ≠ none := fun h => hj (by rw [h]; rfl)
          exact List.mem_filterMap.mpr ⟨k, hls k hk, hpre j k hs⟩
      · cases hs : src j with
        | none => rw [upRow_none hs]; trivial
        | some k =>
          rw [upRow_some hs]
          exact upO_fin pre hpre hφ (f k) (hv k)

  theorem upO_fin (pre : Label → Option (CL Label))
      (hpre : ∀ j k, src j = some k → pre k = some j)
      (hφ : ∀ b, FinG (G.base (φ b) : CG Label B)) :
      ∀ o : Option (G Label B), FinO o → FinO (upO src φ o)
    | none, _ => trivial
    | some g, h => up_fin pre hpre hφ g h
end

end Composition.Typed
