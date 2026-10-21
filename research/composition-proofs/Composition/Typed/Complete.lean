/-
D3b's completeness half (`D3bComplete`): with fresh labels `z` for the
cells and fresh bases `e` for the constants, a generic instance is
realized as a rigid assignment `dn θs`, which satisfies `D` (`dn`
commutes with evaluation) and has pattern `π`. A solution there maps
back by `up` (renaming `z S` to `inr S` and `e c` to `inr c`), and
`up (dn g) = g` for values within the problem's symbols, so it solves
the body at `θs`.
-/
import Composition.Typed.Realize
import Composition.Typed.LiftCommute
import Composition.Typed.Transfer

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

open Classical in
/-- Ground label to generic label, back: `z S ↦ inr S`. -/
noncomputable def zSrc (z : Cell → Label) : CL Label → Option Label
  | .inl k => if ∃ S, z S = k then none else some k
  | .inr S => some (z S)

open Classical in
noncomputable def eBack (e : CConst Label → B) (b : B) : CB Label B :=
  if h : ∃ c, e c = b then .inr (Classical.choose h) else .inl b

variable {P : SigProblem Label B} {z : Cell → Label} {e : CConst Label → B}

omit [DecidableEq Label] in
theorem freshOk (hF : Fresh P z e) : UpOk P (zSrc z) (eBack e) := by
  refine ⟨fun l hl => ?_, fun j l hl hj => ?_, fun b hb => ?_⟩
  · have : ¬ ∃ S, z S = l := fun ⟨S, hS⟩ => hF.2.1 S (hS ▸ hl)
    simp [zSrc, this]
  · cases j with
    | inl k =>
      simp only [zSrc] at hj
      split at hj
      · cases hj
      · cases hj; rfl
    | inr S =>
      simp only [zSrc, Option.some.injEq] at hj
      exact absurd (hj ▸ hl) (hF.2.1 S)
  · have : ¬ ∃ c, e c = b := fun ⟨c, hc⟩ => hF.2.2.2 c (hc ▸ hb)
    simp [eBack, this]

omit [DecidableEq Label] in
theorem eBack_e (hF : Fresh P z e) (c : CConst Label) :
    eBack e (e c) = .inr c := by
  have h : ∃ c', e c' = e c := ⟨c, rfl⟩
  simp only [eBack, h, ↓reduceDIte]
  rw [hF.2.2.1 _ _ (Classical.choose_spec h)]

omit [DecidableEq Label] in
mutual
  /-- The round trip on values within the problem's symbols. -/
  theorem up_dn (hF : Fresh P z e) :
      ∀ g : CG Label B, WithinG P g → up (zSrc z) (eBack e) (dn z e g) = g
    | .base (.inl b), h => by
      simp [dn, up, (freshOk hF).2.2 b h]
    | .base (.inr c), _ => by simp [dn, up, eBack_e hF c]
    | .arrow a c, h => by
      simp only [WithinG] at h
      simp [dn, up, up_dn hF a h.1, up_dn hF c h.2]
    | .record f, h => by
      rw [dn_record, up_record]
      congr 1
      funext j
      cases j with
      | inl k =>
        by_cases hk : ∃ S, z S = k
        · obtain ⟨S, rfl⟩ := hk
          have hn : f (.inl (z S)) = none := by
            cases hfz : f (.inl (z S)) with
            | none => rfl
            | some g => exact absurd (h.1 _ (by simp [hfz])) (hF.2.1 S)
          have hs : zSrc z (.inl (z S)) = none := by simp [zSrc]
          rw [upRow_none hs, hn]
        · have : zSrc z (.inl k) = some k := by simp [zSrc, hk]
          rw [upRow_some this]
          simp only [dnRow, rinv_of_not fun S hS => hk ⟨S, hS⟩]
          exact upO_dnO hF _ (h.2 _)
      | inr S =>
        rw [upRow_some (show zSrc z (.inr S) = some (z S) from rfl)]
        simp only [dnRow, rinv_z hF.1 S]
        exact upO_dnO hF _ (h.2 _)

  theorem upO_dnO (hF : Fresh P z e) :
      ∀ o : Option (CG Label B), WithinO P o →
        upO (zSrc z) (eBack e) (dnO z e o) = o
    | none, _ => rfl
    | some g, h => by simp [dnO, upO, up_dn hF g h]
end

/-- The ground label a generic one is realized as. -/
def back (z : Cell → Label) : CL Label → Label
  | .inl k => k
  | .inr S => z S

omit [DecidableEq Label] in
theorem back_rinv (k : Label) : back z (rinv z k) = k := by
  unfold rinv
  split
  · next h => exact Classical.choose_spec h
  · rfl

omit [DecidableEq Label] in
mutual
  theorem dn_fin : ∀ g : CG Label B, FinG g → FinG (dn z e g)
    | .base (.inl _), _ => trivial
    | .base (.inr _), _ => trivial
    | .arrow a c, h => by
      simp only [FinG] at h
      simp only [dn, FinG]
      exact ⟨dn_fin a h.1, dn_fin c h.2⟩
    | .record f, h => by
      rw [dn_record, finG_record]
      obtain ⟨⟨ls, hls⟩, hv⟩ := (finG_record f).mp h
      refine ⟨⟨ls.map (back z), fun k hk => ?_⟩, fun k => dnO_fin _ (hv _)⟩
      have : f (rinv z k) ≠ none := fun h' => hk (by simp [dnRow, h', dnO])
      exact List.mem_map.mpr ⟨_, hls _ this, back_rinv k⟩

  theorem dnO_fin : ∀ o : Option (CG Label B), FinO o → FinO (dnO z e o)
    | none, _ => trivial
    | some g, h => dn_fin g h
end

theorem dn_holds (hzw : ∀ S, z S ∉ written P) {Γ : CAssign Label B} :
    ∀ a : Atom Label B, (∀ l ∈ labelsOf [a], l ∈ written P) →
      Holds Γ (cliftAtom a) → Holds (dnAssign z e Γ) a
  | .eq t u, hl, ⟨g, ht, hu⟩ =>
    ⟨_, dn_evalT hzw t (fun l h => hl l (by simp [labelsOf, h])) ht,
      dn_evalT hzw u (fun l h => hl l (by simp [labelsOf, h])) hu⟩
  | .lacks r l, hl, h => by
    have hw : l ∈ written P := hl l (by simp [labelsOf])
    have h' : Γ.row r (.inl l) = none := h
    show dnRow z e (Γ.row r) l = none
    rw [dnRow, rinv_of_not fun S hS => hzw S (by rw [hS]; exact hw), h']
    rfl
  | .disjoint x y, _, h => dnRow_disjoint h
  | .ff, _, h => h

/-- D3b's completeness half. -/
theorem d3bComplete : D3bComplete (Label := Label) (B := B) := by
  intro P π θs z e hF hW hg
  obtain ⟨hfin, hD, hpat, _⟩ := hg
  have hzw := hF.2.1
  have hDR : Sat (dnAssign z e θs) P.D := fun a ha =>
    dn_holds hzw a (labels_of_mem (List.mem_append_left _ ha))
      (hD _ (List.mem_map_of_mem ha))
  have hπR : InPattern P π (dnAssign z e θs) := fun r hr l hl => by
    show (dnRow z e (θs.row r) l).isSome = π r l
    rw [dnRow, rinv_of_not fun S hS => hzw S (by rw [hS]; exact hl),
      ← hpat r hr l hl]
    cases θs.row r (.inl l) <;> rfl
  have hround : ∀ σF : Assign Label B,
      combine (cliftP P) θs (upAssign (zSrc z) (eBack e) σF) =
        upAssign (zSrc z) (eBack e) (combine P (dnAssign z e θs) σF) := by
    intro σF
    simp only [combine, upAssign, cliftP, dnAssign]
    congr 1
    · funext n
      by_cases hn : n ∈ P.rigidTy
      · simp [hn, up_dn hF _ (hW.1 n hn)]
      · simp [hn]
    · funext r
      by_cases hr : r ∈ P.rigidRow
      · have := up_dn hF _ (hW.2 r hr)
        rw [dn_record, up_record] at this
        simp [hr, G.record.inj this]
      · simp [hr]
  have hsolve : ∀ θF, Sat (combine P (dnAssign z e θs) θF) P.B →
      Sat (combine (cliftP P) θs (upAssign (zSrc z) (eBack e) θF))
        (cliftP P).B := fun θF h => by
    rw [hround]
    intro a ha
    simp only [cliftP, List.mem_map] at ha
    obtain ⟨a0, ha0, rfl⟩ := ha
    exact holds_up (freshOk hF) (List.mem_append_right _ ha0) (h _ ha0)
  have hpre : ∀ j k, zSrc z j = some k →
      (fun k => some (rinv z k)) k = some j := fun j k h => by
    cases j with
    | inl k' =>
      simp only [zSrc] at h
      split at h
      · cases h
      · next hn =>
        cases h
        simp [rinv_of_not fun S hS => hn ⟨S, hS⟩]
    | inr S =>
      cases h
      simp [rinv_z hF.1 S]
  refine ⟨fun hv => ?_, fun hv => ?_⟩
  · obtain ⟨θF, hθF⟩ := hv _ hDR hπR
    exact ⟨_, hsolve θF hθF⟩
  · obtain ⟨θF, hfF, hθF⟩ := hv _ ⟨fun n hn => dn_fin _ (hfin.1 n hn),
      fun r hr => by
        show FinG (.record (dnRow z e (θs.row r)))
        rw [← dn_record]; exact dn_fin _ (hfin.2 r hr)⟩ hDR hπR
    refine ⟨_, ⟨fun n => ?_, fun r => ?_⟩, hsolve θF hθF⟩
    · exact up_fin _ hpre (fun _ => trivial) _ (hfF.1 n)
    · show FinG (.record (upRow (zSrc z) (eBack e) (θF.row r)))
      rw [← up_record]
      exact up_fin _ hpre (fun _ => trivial) _ (hfF.2 r)

end Composition.Typed
