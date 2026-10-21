/-
P9s's soundness (dossier §14.4, as amended in §14.8). L1: a rigid
assignment satisfying `D` has a consistent pattern. L4: each generic atom
of a certificate holds under `h`. S1: acceptance implies `ValidAll`;
S1-fin: acceptance implies `ValidFin`, Waxwing's finite semantics, with
the empty record as `c`. Acceptance does not check that `D` is
satisfiable: a declaration with impossible clauses is valid vacuously,
and refused separately (§2.3).
-/
import Composition.Sig.FinitePres

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {θ : Assign Label B} {c : G Label B}

/-- `θ` satisfying `D` respects its declared `disjoint`s. -/
theorem declOk_of_sat (h : Sat θ P.D) : DeclOk P θ := by
  rintro r s (hd | hd)
  · exact h _ hd
  · exact disjoint_comm.mp (h _ hd)

/-- L1. -/
theorem consistent_presenceOf (h : Sat θ P.D) :
    Consistent P (presenceOf θ) := by
  refine ⟨fun r l hl => ?_, fun r s l hd ⟨h1, h2⟩ => ?_⟩
  · have : θ.row r l = none := h _ hl
    simp [presenceOf, this]
  · rcases (h _ hd : Composition.Disjoint (θ.row r) (θ.row s)) l with
      h' | h' <;> simp [presenceOf, h'] at h1 h2

/-- L4. -/
theorem holds_interp (hD : DeclOk P θ) {Γ : Assign (GL Label) (GB Label B)} :
    ∀ a : Atom Label B, (∀ l ∈ labelsOf [a], l ∈ written P) →
      HoldsG P Γ (liftAtom a) → Holds (hAssign P θ c Γ) a
  | .eq t u, hl, ⟨g, ht, hu, hw⟩ => by
    have hlt : ∀ l ∈ labelsT t, l ∈ written P := fun l h =>
      hl l (by simp [labelsOf, h])
    have hlu : ∀ l ∈ labelsT u, l ∈ written P := fun l h =>
      hl l (by simp [labelsOf, h])
    exact ⟨_, interp_evalT hD t hlt ht hw, interp_evalT hD u hlu hu hw⟩
  | .lacks r l, hl, h => by
    have hw : l ∈ written P := hl l (by simp [labelsOf])
    have h' : Γ.row r (.inl l) = none := h
    show hRow P θ c (Γ.row r) l = none
    simp [hRow, hw, h', interpO]
  | .disjoint x y, _, ⟨hxy, h2⟩ => hRow_disjoint hxy hD h2
  | .ff, _, h => h

omit [DecidableEq Label] in
theorem labels_written {a : Atom Label B} (ha : a ∈ P.B) :
    ∀ l ∈ labelsOf [a], l ∈ written P := fun l hl => by
  simp only [written, labelsOf, List.flatMap_cons, List.flatMap_nil,
    List.append_nil] at hl ⊢
  exact List.mem_flatMap.mpr ⟨a, List.mem_append_right _ ha, hl⟩

/-- The certificate's image solves the body at `θ`. -/
theorem sat_interp {σ : Assign (GL Label) (GB Label B)} (hD : Sat θ P.D)
    (hσ : Certifies P (presenceOf θ) σ) :
    Sat (combine P θ (hAssign P θ c σ)) P.B := by
  rw [combine_hAssign]
  intro a ha
  exact holds_interp (declOk_of_sat hD) a (labels_written ha) (hσ.2 a ha)

/-- S1: P9s's acceptance is sound for `ValidAll`. -/
theorem s1 (h : Accepts P) : ValidAll P := by
  intro θR hD
  obtain ⟨σ, hσ⟩ := h _ (consistent_presenceOf hD)
  exact ⟨hAssign P θR emptyG σ, sat_interp hD hσ⟩

/-- S1-fin: P9s's acceptance is sound for Waxwing's finite semantics. -/
theorem s1_fin (h : Accepts P) : ValidFin P := by
  intro θR hty hrow hD
  obtain ⟨σ, hσ⟩ := h _ (consistent_presenceOf hD)
  refine ⟨hAssign P θR emptyG σ, ⟨fun n => ?_, fun r => ?_⟩,
    sat_interp hD hσ⟩
  · exact interp_fin hty hrow finG_emptyG _ (hσ.1.1 n)
  · show FinG (.record (hRow P θR emptyG (σ.row r)))
    rw [← interp_record]
    exact interp_fin hty hrow finG_emptyG _ (hσ.1.2 r)

end Composition.Syntax
