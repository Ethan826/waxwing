/-
Option-B soundness track, basic obligations: back substitutions exist,
cells and patterns survive substitution, `hv` agrees with a covered
back substitution on reached pairs, finiteness, `combine` under
renaming, `SubstInstance` and BS-c1f. Statements:
Bridge/ProofSoundObligations.lean and Bridge/Sound.lean. E1, E2, E2′,
E5 and E6 (Bridge/Extension.lean, owned by another track) are taken as
hypotheses.
-/
import Composition.Typed.Bridge.ProofSoundObligations

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### Back substitutions -/

open Classical in
/-- Preimages of `j` back to their base, anything else to `o`. -/
noncomputable def backS {B₁ : Type} (j : B → B₁) (o : G Label B) :
    B₁ → G Label B := fun x =>
  if h : ∃ b, j b = x then .base (Classical.choose h) else o

omit [DecidableEq Label] in
theorem backS_back {B₁ : Type} (j : B → B₁) (hj : Function.Injective j)
    (o : G Label B) : BackSubst j (backS j o) := by
  intro b
  have h : ∃ b', j b' = j b := ⟨b, rfl⟩
  simp only [backS, h, dite_true]
  exact congrArg _ (hj (Classical.choose_spec h))

omit [DecidableEq Label] in
theorem backS_cases {B₁ : Type} (j : B → B₁) (o : G Label B) (x : B₁) :
    (∃ b, backS j o x = .base b) ∨ backS j o x = o := by
  unfold backS
  split
  · exact Or.inl ⟨_, rfl⟩
  · exact Or.inr rfl

omit [DecidableEq Label] in
theorem backSubstExists : BackSubstExists (Label := Label) (B := B) :=
  fun _ j hj => ⟨_, backS_back j hj emptyG⟩

/-! ### Cells, patterns, reached pairs -/

omit [DecidableEq Label] in
theorem cellOfSubst : CellOfSubst (Label := Label) (B := B) := by
  intro P B₁ j s θ
  funext k
  simp only [cellOf, substAssign, SigProblem.mapBase]
  congr 1
  funext r
  cases θ.row r k <;> rfl

omit [DecidableEq Label] in
theorem inPatternSubst : InPatternSubst (Label := Label) (B := B) := by
  intro P B₁ s θ r _ l _
  simp only [substAssign, presenceOf]
  cases θ.row r l <;> rfl

theorem hvReach : HvReach (Label := Label) (B := B) := by
  intro P θs B₁ j θR s ν hty hrow g κ t hr
  have hcell := cellOfSubst (Label := Label) P B₁ j s θR
  induction hr with
  | root h =>
    rcases h with ⟨n, hn, rfl, rfl⟩ | ⟨r, hr, rfl, rfl⟩
    · exact hty n hn
    · have := hrow r hr
      simp only [hv, substBase]
      unfold hvRow at this
      rw [this]; rfl
  | arrowL _ ih =>
    simp only [hv, substBase] at ih; exact (G.arrow.inj ih).1
  | arrowR _ ih =>
    simp only [hv, substBase] at ih; exact (G.arrow.inj ih).2
  | @wr f h κ k g t _ hk hf hh ih =>
    simp only [hv, substBase] at ih
    have := congrFun (G.record.inj ih) k
    simp only [hk, ite_true, hf, hh, hvO, substBaseO] at this
    exact Option.some.inj this
  | @cl f h κ k g t _ hk hc hf hh ih =>
    simp only [hv, substBase] at ih
    have := congrFun (G.record.inj ih) k
    rw [hcell] at this
    simp only [hk, ite_false, hc, hf, hh, hvO, substBaseO] at this
    exact Option.some.inj this

omit [DecidableEq Label] in
theorem reachFin : ReachFin (Label := Label) (B := B) := by
  intro P θs B₁ j θR hfin g κ t hr
  induction hr with
  | root h =>
    rcases h with ⟨n, hn, _, rfl⟩ | ⟨r, hr, _, rfl⟩
    · exact hfin.1 n hn
    · exact hfin.2 r hr
  | arrowL _ ih => exact ih.1
  | arrowR _ ih => exact ih.2
  | @wr f h κ k g t _ _ _ hh ih =>
    have := ih.2 k; rw [hh] at this; exact this
  | @cl f h κ k g t _ _ _ _ hh ih =>
    have := ih.2 k; rw [hh] at this; exact this

/-! ### Renaming: finiteness and `combine` -/

omit [DecidableEq Label] in
mutual
  theorem finMapG_aux {B₁ : Type} (f : B → B₁) :
      ∀ g : G Label B, FinG g → FinG (mapG f g)
    | .base _, _ => by simp [mapG, FinG]
    | .arrow a c, h => by
      simp only [mapG, FinG] at h ⊢
      exact ⟨finMapG_aux f a h.1, finMapG_aux f c h.2⟩
    | .record r, h => by
      simp only [mapG, FinG] at h ⊢
      obtain ⟨⟨ls, hls⟩, hk⟩ := h
      refine ⟨⟨ls, fun k hne => hls k ?_⟩,
        fun k => finMapGO_aux f (r k) (hk k)⟩
      intro e; apply hne; simp [e, mapGO]

  theorem finMapGO_aux {B₁ : Type} (f : B → B₁) :
      ∀ o : Option (G Label B), FinO o → FinO (mapGO f o)
    | none, _ => by simp [mapGO, FinO]
    | some g, h => by
      simp only [mapGO, FinO] at h ⊢
      exact finMapG_aux f g h
end

omit [DecidableEq Label] in
theorem finMapG : FinMapG (Label := Label) (B := B) :=
  fun _ f g h => finMapG_aux f g h

omit [DecidableEq Label] in
theorem combineMap : CombineMap (Label := Label) (B := B) := by
  intro Q B₁ f θ σ
  simp only [combine, mapAssign, SigProblem.mapBase]
  congr 1
  · funext n; by_cases h : n ∈ Q.rigidTy <;> simp [h]
  · funext r k; by_cases h : r ∈ Q.rigidRow <;> simp [h]

/-! ### `SubstInstance` and BS-c1f -/

/-- From E2′ (at `g = j`, `h = id`), E1 and E5. -/
theorem substInstance_of (h1 : MapBaseId (Label := Label) (B := B))
    (h2' : SatSubstBase (Label := Label) (B := B))
    (h5 : MapBaseSyntax (Label := Label) (B := B)) :
    SubstInstance (Label := Label) (B := B) := by
  intro P π B₁ j s θR hs hD hπ
  refine ⟨?_, fun r hr l hl => ?_⟩
  · have h := h2' P B₁ B j id s θR P.D (fun b _ => hs b)
      (fun a ha => List.mem_append_left _ ha) hD
    have hid : P.D.map (mapBaseAtom id) = P.D := congrArg SigProblem.D (h1 P)
    rwa [hid] at h
  · have hl' : l ∈ written (P.mapBase j) := by rw [(h5 P B₁ j).1]; exact hl
    have := hπ r hr l hl'
    simp only [substAssign]
    cases h : θR.row r l <;> rw [h] at this <;> exact this

/-- BS-c1f, from E2 (at the generic model's labels and bases) and E6. -/
theorem solvableMapBaseFwd_of
    (h2 : SatMapBase (Label := CL Label) (B := CB Label B))
    (h6 : MapBaseClift (Label := Label) (B := B)) :
    SolvableMapBaseFwd (Label := Label) (B := B) := by
  intro P θs B₁ j ⟨σ, hσf, hσ⟩
  refine ⟨mapAssign (Sum.map j id) σ, ⟨fun n => ?_, fun r => ?_⟩, ?_⟩
  · exact finMapG_aux _ _ (hσf.1 n)
  · have := finMapG_aux (Sum.map j id) _ (hσf.2 r)
    simp only [mapG] at this
    exact this
  · rw [h6 P B₁ j, mapC, combineMap]
    exact h2 _ _ _ _ hσ

end Composition.Typed
