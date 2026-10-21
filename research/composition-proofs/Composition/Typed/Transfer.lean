/-
D3b's soundness half (construction.md §5): the transfer theorem and its
consequences. `hv` is the homomorphism carrying a generic solution to
every rigid assignment the generic instance covers: it commutes with
evaluation (Typed/Commute.lean), so equations hold by function
application; `lacks` and `disjoint` hold label by label; and `Covers`
makes `hv` of the generic rigid values the given rigid values.
-/
import Composition.Typed.Commute
import Composition.Typed.Defs
import Composition.Sig.Soundness

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {θ : Assign Label B} {ν : Val Label B}

/-- `hv` of the generic rigid assignment is `θ` on rigid variables. -/
theorem combine_hvAssign {θs : CAssign Label B}
    (hty : ∀ n ∈ P.rigidTy, hv P θ ν none (θs.ty n) = θ.ty n)
    (hrow : ∀ r ∈ P.rigidRow, hvRow P θ ν none (θs.row r) = θ.row r)
    (σ : CAssign Label B) :
    combine P θ (hvAssign P θ ν σ) =
      hvAssign P θ ν (combine (cliftP P) θs σ) := by
  simp only [combine, hvAssign, cliftP]
  congr 1
  · funext n
    by_cases hn : n ∈ P.rigidTy
    · simp [hn, hty n hn]
    · simp [hn]
  · funext r
    by_cases hr : r ∈ P.rigidRow
    · simp [hr, hrow r hr]
    · simp [hr]

/-- Each atom of `P` holds at the image of a generic assignment where
its lifted form holds. -/
theorem holds_hv {Γ : CAssign Label B} :
    ∀ a : Atom Label B, (∀ l ∈ labelsOf [a], l ∈ written P) →
      Holds Γ (cliftAtom a) → Holds (hvAssign P θ ν Γ) a
  | .eq t u, hl, ⟨g, ht, hu⟩ => by
    have hlt : ∀ l ∈ labelsT t, l ∈ written P := fun l h =>
      hl l (by simp [labelsOf, h])
    have hlu : ∀ l ∈ labelsT u, l ∈ written P := fun l h =>
      hl l (by simp [labelsOf, h])
    exact ⟨_, hv_evalT t hlt ht, hv_evalT u hlu hu⟩
  | .lacks r l, hl, h => by
    have hw : l ∈ written P := hl l (by simp [labelsOf])
    have h' : Γ.row r (.inl l) = none := h
    show hvRow P θ ν none (Γ.row r) l = none
    simp [hvRow, hw, h', hvO]
  | .disjoint x y, _, h => hvRow_disjoint (κ := none) h
  | .ff, _, h => h

/-- The image of a finite generic assignment is finite. -/
theorem hvAssign_fin (hθ : RigidFin P θ) (hν : ∀ c κ, FinG (ν c κ))
    {σ : CAssign Label B} (hσ : FinAssign σ) :
    FinAssign (hvAssign P θ ν σ) := by
  refine ⟨fun n => hv_fin hθ hν none _ (hσ.1 n), fun r => ?_⟩
  show FinG (.record (hvRow P θ ν none (σ.row r)))
  rw [← hv_record]
  exact hv_fin hθ hν none _ (hσ.2 r)

/-- Transfer. -/
theorem transfer : Transfer (Label := Label) (B := B) := by
  intro P θs θR σ ⟨ν, hν, hty, hrow⟩ hσ
  refine ⟨hvAssign P θR ν σ, ?_, fun hσf hR => hvAssign_fin hR (hν hR) hσf⟩
  rw [combine_hvAssign hty hrow]
  intro a ha
  exact holds_hv a (labels_written ha) (hσ _ (List.mem_map_of_mem ha))

/-- D3b's soundness half. -/
theorem d3bSound : D3bSound (Label := Label) (B := B) := by
  intro P π θs hg
  refine ⟨fun ⟨σ, hσ⟩ θR hD hπ => ?_, fun ⟨σ, hσf, hσ⟩ θR hR hD hπ => ?_⟩
  · obtain ⟨θF, h, _⟩ := transfer P θs θR σ (hg.2.2.2 θR hD hπ) hσ
    exact ⟨θF, h⟩
  · obtain ⟨θF, h, hf⟩ := transfer P θs θR σ (hg.2.2.2 θR hD hπ) hσ
    exact ⟨θF, hf hσf hR, h⟩

omit [DecidableEq Label] in
/-- Every rigid assignment is in its own pattern. -/
theorem inPattern_presenceOf (θR : Assign Label B) :
    InPattern P (presenceOf θR) θR := fun _ _ _ _ => rfl

/-- Assembly over patterns. -/
theorem d3bValidAll : D3bValidAll (Label := Label) (B := B) := by
  intro P
  refine ⟨fun h θR hD => ?_, fun h θR hty hrow hD => ?_⟩
  · obtain ⟨θs, hg, hs⟩ := h (presenceOf θR) ⟨θR, hD, inPattern_presenceOf θR⟩
    exact (d3bSound P _ θs hg).1 hs θR hD (inPattern_presenceOf θR)
  · obtain ⟨θs, hg, hs⟩ := h (presenceOf θR) ⟨θR, hD, inPattern_presenceOf θR⟩
    exact (d3bSound P _ θs hg).2 hs θR ⟨hty, hrow⟩ hD
      (inPattern_presenceOf θR)

end Composition.Typed
