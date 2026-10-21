/-
B2 (`D3bCompleteOn`), proved from E2, E5 and E6 (Extension.lean,
another tranche), taken as hypotheses. The route is `d3bComplete`'s,
at the extension: realize `θs` over `B₁` (`dn` after renaming along
`Sum.map j id`); it satisfies the renamed `D` (E2, E6) and has pattern
`π` (E5 keeps the written labels). A solution there lifts by `up` with
bases kept (`holds_up` at `P.mapBase j`), then the `U`-relative back
map `backOn` brings it to `B` (E2 again, positivity); `up_dn_on` is the
round trip on `θs`'s rigid values.
-/
import Composition.Typed.Bridge.ProofFreshBack

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B₁ : Type} [DecidableEq Label]

omit [DecidableEq Label] in
mutual
  /-- Renaming along `m`, then `k`, fixes a lifted expression whose
  bases `k ∘ m` fixes (the `holds_up` variant's syntax half). -/
  theorem mapBack_clift (m : CB Label B → CB Label B₁)
      (k : CB Label B₁ → CB Label B) :
      ∀ t : TExpr Label B, (∀ b ∈ basesT t, k (m (.inl b)) = .inl b) →
        mapBaseT k (mapBaseT m (cliftT t)) = cliftT t
    | .base b, h => by simp [cliftT, mapBaseT, h b (by simp [basesT])]
    | .arrow t u, h => by
      simp [cliftT, mapBaseT,
        mapBack_clift m k t fun b hb => h b (by simp [basesT, hb]),
        mapBack_clift m k u fun b hb => h b (by simp [basesT, hb])]
    | .tvar _, _ => rfl
    | .record fs _, h => by
      simp [cliftT, mapBaseT, mapBack_cliftF m k fs fun b hb =>
        h b (by simpa [basesT] using hb)]

  theorem mapBack_cliftF (m : CB Label B → CB Label B₁)
      (k : CB Label B₁ → CB Label B) :
      ∀ fs : Fields Label B, (∀ b ∈ basesF fs, k (m (.inl b)) = .inl b) →
        mapBaseF k (mapBaseF m (cliftF fs)) = cliftF fs
    | .nil, _ => rfl
    | .cons _ t rest, h => by
      simp [cliftF, mapBaseF,
        mapBack_clift m k t fun b hb => h b (by simp [basesF, hb]),
        mapBack_cliftF m k rest fun b hb => h b (by simp [basesF, hb])]
end

omit [DecidableEq Label] in
theorem mapBack_atom {P : SigProblem Label B} (m : CB Label B → CB Label B₁)
    (k : CB Label B₁ → CB Label B)
    (h : ∀ b ∈ basesOf P, k (m (.inl b)) = .inl b) {a : Atom Label B}
    (ha : a ∈ P.D ++ P.B) :
    mapBaseAtom k (mapBaseAtom m (cliftAtom a)) = cliftAtom a := by
  cases a with
  | eq t u =>
    have hb := bases_of_mem ha
    simp [cliftAtom, mapBaseAtom,
      mapBack_clift m k t fun b hb' => h b (hb.1 b hb'),
      mapBack_clift m k u fun b hb' => h b (hb.2 b hb')]
  | lacks _ _ => rfl
  | disjoint _ _ => rfl
  | ff => rfl

/-- B2, from E2 (at any label and base types), E5 and E6. -/
theorem d3bCompleteOn_of
    (hE2 : ∀ (L B' : Type) [DecidableEq L], SatMapBase (Label := L) (B := B'))
    (hE5 : MapBaseSyntax (Label := Label) (B := B))
    (hE6 : MapBaseClift (Label := Label) (B := B)) :
    D3bCompleteOn (Label := Label) (B := B) := by
  intro P π θs B₁ j z e U hj hL hB hU hW hg
  obtain ⟨hfin, hD, hpat, _⟩ := hg
  have hwr : written (P.mapBase j) = written P := (hE5 P B₁ j).1
  have hzw : ∀ S, z S ∉ written (P.mapBase j) := hwr ▸ hL.2
  have hb : ∀ b ∈ basesOf P, backOn j U e (.inl (j b)) = .inl b :=
    fun b hb => backOn_j hj fun c hc => hB.2 c hc b hb
  have hc : ∀ c ∈ U, backOn j U e (.inl (e c)) = .inr c :=
    fun c hc => backOn_e hB.1 hc
  have hrt := @up_dn_on _ _ _ _ z U e j (backOn j U e) hL.1 hL.2 hb hc
  have hD₁ : Sat (mapAssign (Sum.map j id) θs) (cliftP (P.mapBase j)).D := by
    rw [hE6]; exact hE2 _ _ _ _ θs _ hD
  have hDR : Sat (dnAssign z e (mapAssign (Sum.map j id) θs))
      (P.mapBase j).D := fun a ha =>
    dn_holds hzw a (labels_of_mem (List.mem_append_left _ ha))
      (hD₁ _ (List.mem_map_of_mem ha))
  have hπR : InPattern (P.mapBase j) π
      (dnAssign z e (mapAssign (Sum.map j id) θs)) := fun r hr l hl => by
    show (dnRow z e (fun x => mapGO _ (θs.row r x)) l).isSome = π r l
    rw [hwr] at hl
    rw [dnRow, rinv_of_not fun S hS => hL.2 S (by rw [hS]; exact hl),
      ← hpat r hr l hl]
    cases θs.row r (.inl l) <;> rfl
  have hround : ∀ θF : Assign Label B₁,
      combine (cliftP P) θs
        (mapAssign (backOn j U e) (upAssign (zSrc z) Sum.inl θF)) =
      mapAssign (backOn j U e) (upAssign (zSrc z) Sum.inl
        (combine (P.mapBase j)
          (dnAssign z e (mapAssign (Sum.map j id) θs)) θF)) := by
    intro θF
    simp only [combine, mapAssign, upAssign, cliftP, dnAssign,
      SigProblem.mapBase]
    congr 1
    · funext n
      by_cases hn : n ∈ P.rigidTy
      · simp [hn, hrt _ (hW.1 n hn) (hU.1 n hn)]
      · simp [hn]
    · funext r x
      by_cases hr : r ∈ P.rigidRow
      · have := hrt _ (hW.2 r hr) (hU.2 r hr)
        rw [mapG_record, dn_record, up_record, mapG_record] at this
        simp [hr, ← congrFun (G.record.inj this) x]
      · simp [hr]
  have hsolve : ∀ θF, Sat (combine (P.mapBase j)
      (dnAssign z e (mapAssign (Sum.map j id) θs)) θF) (P.mapBase j).B →
      Sat (combine (cliftP P) θs
        (mapAssign (backOn j U e) (upAssign (zSrc z) Sum.inl θF)))
        (cliftP P).B := fun θF h => by
    rw [hround]
    have h1 : Sat (upAssign (zSrc z) Sum.inl (combine (P.mapBase j)
        (dnAssign z e (mapAssign (Sum.map j id) θs)) θF))
        (cliftP (P.mapBase j)).B := fun a ha => by
      simp only [cliftP, List.mem_map] at ha
      obtain ⟨a0, ha0, rfl⟩ := ha
      exact holds_up (zSrcOk hzw) (List.mem_append_right _ ha0) (h _ ha0)
    have h2 := hE2 _ _ _ (backOn j U e) _ _ h1
    rw [hE6] at h2
    intro a ha
    simp only [cliftP, List.mem_map] at ha
    obtain ⟨a0, ha0, rfl⟩ := ha
    have := h2 _ (List.mem_map_of_mem (List.mem_map_of_mem
      (List.mem_map_of_mem ha0)))
    rwa [mapBack_atom (Sum.map j id) (backOn j U e) hb
      (List.mem_append_right _ ha0)] at this
  have hpre : ∀ jj k, zSrc z jj = some k →
      (fun k => some (rinv z k)) k = some jj := fun jj k h => by
    cases jj with
    | inl k' =>
      simp only [zSrc] at h
      split at h
      · cases h
      · next hn =>
        cases h
        simp [rinv_of_not fun S hS => hn ⟨S, hS⟩]
    | inr S =>
      cases h
      simp [rinv_z hL.1 S]
  refine ⟨fun hv => ?_, fun hv => ?_⟩
  · obtain ⟨θF, hθF⟩ := hv _ hDR hπR
    exact ⟨_, hsolve θF hθF⟩
  · obtain ⟨θF, hfF, hθF⟩ := hv _ ⟨fun n hn =>
      dn_fin _ (finBack_mapG _ _ (hfin.1 n hn)), fun r hr => by
        have := dn_fin (z := z) (e := e) _
          (finBack_mapG (Sum.map j id) _ (hfin.2 r hr))
        rwa [mapG_record, dn_record] at this⟩ hDR hπR
    refine ⟨_, ⟨fun n => ?_, fun r => ?_⟩, hsolve θF hθF⟩
    · exact finBack_mapG _ _
        (up_fin (φ := Sum.inl) _ hpre (fun _ => trivial) _ (hfF.1 n))
    · have := finBack_mapG (backOn j U e) _
        (up_fin (φ := Sum.inl) _ hpre (fun _ => trivial) _ (hfF.2 r))
      rwa [up_record, mapG_record] at this

end Composition.Typed
