/-
For B2 (`D3bCompleteOn`): the `U`-relative back map and its round trip
(statements.md §10.6). `eBackOn` reads `e c` back as `c` for `c ∈ U`
first, then `j b` as `b`, and anything else as `T 0`; `eBack`'s choice
over all constants cannot be used, since `e` is injective only on `U`.
`up_dn_on` is `up_dn` at an extension: realizing a value within `P`'s
symbols and `U` over `B₁`, then reading it back, gives it again.
-/
import Composition.Typed.Bridge.Fresh
import Composition.Typed.Complete

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B₁ : Type} [DecidableEq Label]

open Classical in
/-- The `U`-relative back map on bases. -/
noncomputable def eBackOn (j : B → B₁) (U : List (CConst Label))
    (e : CConst Label → B₁) (b₁ : B₁) : CB Label B :=
  if hc : ∃ c ∈ U, e c = b₁ then .inr (Classical.choose hc)
  else if hb : ∃ b, j b = b₁ then .inl (Classical.choose hb)
  else .inr (.T 0)

/-- The back map on generic bases over `B₁`: constants stay. -/
noncomputable def backOn (j : B → B₁) (U : List (CConst Label))
    (e : CConst Label → B₁) : CB Label B₁ → CB Label B
  | .inl b₁ => eBackOn j U e b₁
  | .inr c => .inr c

omit [DecidableEq Label] in
theorem backOn_e {j : B → B₁} {U : List (CConst Label)}
    {e : CConst Label → B₁} (he : ∀ c ∈ U, ∀ c' ∈ U, e c = e c' → c = c')
    {c : CConst Label} (hc : c ∈ U) : backOn j U e (.inl (e c)) = .inr c := by
  have h : ∃ c' ∈ U, e c' = e c := ⟨c, hc, rfl⟩
  simp only [backOn, eBackOn, h, ↓reduceDIte]
  obtain ⟨h1, h2⟩ := Classical.choose_spec h
  rw [he _ h1 _ hc h2]

omit [DecidableEq Label] in
theorem backOn_j {j : B → B₁} {U : List (CConst Label)}
    {e : CConst Label → B₁} (hj : Function.Injective j) {b : B}
    (hne : ∀ c ∈ U, e c ≠ j b) : backOn j U e (.inl (j b)) = .inl b := by
  have hn : ¬ ∃ c ∈ U, e c = j b := fun ⟨c, hc, h⟩ => hne c hc h
  have h : ∃ b', j b' = j b := ⟨b, rfl⟩
  simp only [backOn, eBackOn, hn, h, ↓reduceDIte]
  rw [hj (Classical.choose_spec h)]

omit [DecidableEq Label] in
/-- `freshOk`'s label half, with bases kept (`φ = inl`). -/
theorem zSrcOk {P₁ : SigProblem Label B₁} {z : Cell → Label}
    (hzw : ∀ S, z S ∉ written P₁) : UpOk P₁ (zSrc z) Sum.inl := by
  refine ⟨fun l hl => ?_, fun j l hl hj => ?_, fun _ _ => rfl⟩
  · have : ¬ ∃ S, z S = l := fun ⟨S, hS⟩ => hzw S (hS ▸ hl)
    simp [zSrc, this]
  · cases j with
    | inl k =>
      simp only [zSrc] at hj
      split at hj
      · cases hj
      · cases hj; rfl
    | inr S =>
      simp only [zSrc, Option.some.injEq] at hj
      exact absurd (hj ▸ hl) (hzw S)

omit [DecidableEq Label] in
theorem mapG_record {B' : Type} (f : B → B') (r : Row Label (G Label B)) :
    mapG f (.record r) = .record fun k => mapGO f (r k) := by
  simp only [mapG]

omit [DecidableEq Label] in
mutual
  /-- Renaming bases keeps values finite (`FinMapG`, §10.6). -/
  theorem finBack_mapG {B' : Type} (f : B → B') :
      ∀ g : G Label B, FinG g → FinG (mapG f g)
    | .base _, _ => trivial
    | .arrow a c, h => by
      simp only [FinG] at h
      simp only [mapG, FinG]
      exact ⟨finBack_mapG f a h.1, finBack_mapG f c h.2⟩
    | .record r, h => by
      rw [mapG_record, finG_record]
      obtain ⟨⟨ls, hls⟩, hv⟩ := (finG_record r).mp h
      refine ⟨⟨ls, fun k hk => hls k fun h' => hk ?_⟩,
        fun k => finBack_mapGO f _ (hv k)⟩
      simp [h', mapGO]

  theorem finBack_mapGO {B' : Type} (f : B → B') :
      ∀ o : Option (G Label B), FinO o → FinO (mapGO f o)
    | none, _ => trivial
    | some g, h => finBack_mapG f g h
end

variable {P : SigProblem Label B} {z : Cell → Label} {U : List (CConst Label)}
  {e : CConst Label → B₁} {j : B → B₁} {k : CB Label B₁ → CB Label B}

omit [DecidableEq Label] in
mutual
  /-- The `U`-relative round trip (`up_dn_on`, §10.6): realize along
  `j` and `dn`, lift by `up`, read back by `k`. -/
  theorem up_dn_on (hz : ∀ S S', z S = z S' → S = S')
      (hzw : ∀ S, z S ∉ written P)
      (hb : ∀ b ∈ basesOf P, k (.inl (j b)) = .inl b)
      (hc : ∀ c ∈ U, k (.inl (e c)) = .inr c) :
      ∀ g : CG Label B, WithinG P g → BasesWithin (constIn U) g →
        mapG k (up (zSrc z) Sum.inl (dn z e (mapG (Sum.map j id) g))) = g
    | .base (.inl b), h, _ => by
      simp [mapG, dn, up, hb b h]
    | .base (.inr c), _, hu => by
      simp [mapG, dn, up, hc c hu]
    | .arrow a c, h, hu => by
      simp only [WithinG] at h
      simp only [BasesWithin] at hu
      simp [mapG, dn, up, up_dn_on hz hzw hb hc a h.1 hu.1,
        up_dn_on hz hzw hb hc c h.2 hu.2]
    | .record f, h, hu => by
      rw [mapG_record, dn_record, up_record, mapG_record]
      congr 1
      funext j
      cases j with
      | inl l =>
        by_cases hl : ∃ S, z S = l
        · obtain ⟨S, rfl⟩ := hl
          have hn : f (.inl (z S)) = none := by
            cases hfz : f (.inl (z S)) with
            | none => rfl
            | some g => exact absurd (h.1 _ (by simp [hfz])) (hzw S)
          have hs : zSrc z (.inl (z S)) = none := by simp [zSrc]
          rw [upRow_none hs, hn]
          rfl
        · have : zSrc z (.inl l) = some l := by simp [zSrc, hl]
          rw [upRow_some this]
          simp only [dnRow, rinv_of_not fun S hS => hl ⟨S, hS⟩]
          exact upO_dnO_on hz hzw hb hc _ (h.2 _) (hu _)
      | inr S =>
        rw [upRow_some (show zSrc z (.inr S) = some (z S) from rfl)]
        simp only [dnRow, rinv_z hz S]
        exact upO_dnO_on hz hzw hb hc _ (h.2 _) (hu _)

  theorem upO_dnO_on (hz : ∀ S S', z S = z S' → S = S')
      (hzw : ∀ S, z S ∉ written P)
      (hb : ∀ b ∈ basesOf P, k (.inl (j b)) = .inl b)
      (hc : ∀ c ∈ U, k (.inl (e c)) = .inr c) :
      ∀ o : Option (CG Label B), WithinO P o → BasesWithinO (constIn U) o →
        mapGO k (upO (zSrc z) Sum.inl (dnO z e (mapGO (Sum.map j id) o))) = o
    | none, _, _ => rfl
    | some g, h, hu => by
      simp [mapGO, dnO, upO, up_dn_on hz hzw hb hc g h hu]
end

end Composition.Typed
