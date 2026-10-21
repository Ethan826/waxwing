/-
`hv` and substitution (for `Universality`): `hv` of a substituted value
is `hv` of the value under the composed valuation; and on a cell-shaped
value `hv` at the top context reads a non-cell constant only at the top
context and a cell constant `X r S` only at the unwritten labels of
cell `S` (`Agree`). Those are the only readings coverage must match.
-/
import Composition.Typed.UnifPr

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {θ : Assign Label B}

/-- The valuation `ν` after the substitution `τ`. -/
noncomputable def vcomp (P : SigProblem Label B) (θ : Assign Label B)
    (ν : Val Label B) (τ : CSubst Label B) : Val Label B :=
  fun c κ => hv P θ ν κ (τ c)

mutual
  theorem hv_subst (ν : Val Label B) (τ : CSubst Label B) :
      ∀ (κ : Option Label) (g : CG Label B),
        hv P θ ν κ (substG τ g) = hv P θ (vcomp P θ ν τ) κ g
    | _, .base (.inl _) => rfl
    | _, .base (.inr _) => rfl
    | κ, .arrow a b => by
      simp only [substG, hv, hv_subst ν τ κ a, hv_subst ν τ κ b]
    | κ, .record f => by
      rw [substG_record, hv_record, hv_record]
      congr 1
      funext k
      rw [hvRow_eq, hvRow_eq]
      cases src P θ k with
      | none => rfl
      | some j => exact hvO_subst ν τ _ (f j)

  theorem hvO_subst (ν : Val Label B) (τ : CSubst Label B) :
      ∀ (κ : Option Label) (o : Option (CG Label B)),
        hvO P θ ν κ (substO τ o) = hvO P θ (vcomp P θ ν τ) κ o
    | _, none => rfl
    | κ, some g => by simp only [substO, hvO, hv_subst ν τ κ g]
end

theorem hvRow_subst (ν : Val Label B) (τ : CSubst Label B)
    (f : Row (CL Label) (CG Label B)) :
    hvRow P θ ν none (sRow τ f) = hvRow P θ (vcomp P θ ν τ) none f := by
  have := hv_subst (P := P) (θ := θ) ν τ none (.record f)
  rw [substG_record, hv_record, hv_record] at this
  exact G.record.inj this

/-- Two valuations agree on every reading `hv` makes of a cell-shaped
value from the top context. -/
def Agree (P : SigProblem Label B) (θ : Assign Label B)
    (ν ν' : Val Label B) : Prop :=
  (∀ c, NonX c → ν c none = ν' c none) ∧
    ∀ r S k, k ∉ written P → cellOf P θ k = S →
      ν (.X r S) (some k) = ν' (.X r S) (some k)

variable {C : List Cell}

mutual
  theorem hv_congr {ν ν' : Val Label B} (h : Agree P θ ν ν') :
      ∀ g : CG Label B, CS P C g → hv P θ ν none g = hv P θ ν' none g
    | .base (.inl _), _ => rfl
    | .base (.inr c), hg => h.1 c hg
    | .arrow a b, hg => by
      simp only [hv, hv_congr h a hg.1, hv_congr h b hg.2]
    | .record f, hg => by
      have hf := (cs_record f).mp hg
      rw [hv_record, hv_record]
      congr 1
      funext k
      simp only [hvRow]
      by_cases hw : k ∈ written P
      · simp only [hw, ↓reduceIte]
        exact hvO_congr h (f (.inl k)) (hf.2.1 k)
      · by_cases hc : cellOf P θ k = []
        · simp [hw, hc]
        · simp only [hw, hc, ↓reduceIte]
          rcases hf.2.2 (cellOf P θ k) with h0 | ⟨_, r, _, h1⟩
          · rw [h0]; rfl
          · rw [h1]
            simp only [hvO, hv, h.2 r _ k hw rfl]

  theorem hvO_congr {ν ν' : Val Label B} (h : Agree P θ ν ν') :
      ∀ o : Option (CG Label B), CSO P C o →
        hvO P θ ν none o = hvO P θ ν' none o
    | none, _ => rfl
    | some g, hg => by simp only [hvO, hv_congr h g hg]
end

omit [DecidableEq Label] in
theorem agree_refl (ν : Val Label B) : Agree P θ ν ν :=
  ⟨fun _ _ => rfl, fun _ _ _ _ _ => rfl⟩

omit [DecidableEq Label] in
theorem agree_symm {ν ν' : Val Label B} (h : Agree P θ ν ν') :
    Agree P θ ν' ν :=
  ⟨fun c hc => (h.1 c hc).symm, fun r S k hk hS => (h.2 r S k hk hS).symm⟩

omit [DecidableEq Label] in
theorem agree_trans {ν ν' ν'' : Val Label B} (h : Agree P θ ν ν')
    (h' : Agree P θ ν' ν'') : Agree P θ ν ν'' :=
  ⟨fun c hc => (h.1 c hc).trans (h'.1 c hc),
   fun r S k hk hS => (h.2 r S k hk hS).trans (h'.2 r S k hk hS)⟩

end Composition.Typed
