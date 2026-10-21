/-
Acceptance irrelevance (statements.md §4, C-local and C): when the
model counts every specialization-time requirement (`Covers`), a key
satisfying a declaration's interface is accepted, and every call edge
reached meets its callee's interface (a ground check there never
fires). Two splits that both satisfy `Covers` are both accepted.
-/
import Composition.SplitIrrelevance.Defs

namespace Composition.SplitIrrelevance

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- The induction behind C-local: from a body's own obligations at a
local key, every reached site is fine. -/
theorem siteOk_of_reach {P : Prog Label B} (hc : Covers P)
    {θ : Assign Label B} {t : Tm Label} {k : Nat} {θ' : Assign Label B}
    (h : SiteAt P θ t k θ')
    (hl : ∀ k, LocalSite t k → SiteOk P θ k)
    (hk : ∀ g k, CallIn t g k → P.Req g (P.wit k θ)) : SiteOk P θ' k := by
  induction h with
  | here hs => exact hl _ hs
  | call hci _ ih =>
    obtain ⟨hl', hk'⟩ := hc _ _ (hk _ _ hci)
    exact ih hl' hk'

/-- C-local: coverage gives acceptance. -/
theorem accepted_of_covers {P : Prog Label B} (hc : Covers P) {f : Nat}
    {θ : Assign Label B} (hr : P.Req f θ) :
    Accepted P (P.loc f θ) (P.body f) := by
  intro k θ' h
  obtain ⟨hl, hk⟩ := hc f θ hr
  exact siteOk_of_reach hc h hl hk

/-- Under `Covers`, every copy specialization creates meets its
callee's interface: a ground check at call edges is silent. -/
theorem req_of_keyAt {P : Prog Label B} (hc : Covers P)
    {θ : Assign Label B} {t : Tm Label} {g : Nat} {θ' : Assign Label B}
    (h : KeyAt P θ t g θ')
    (hk : ∀ g k, CallIn t g k → P.Req g (P.wit k θ)) : P.Req g θ' := by
  induction h with
  | here hci => exact hk _ _ hci
  | call hci _ ih => exact ih (hc _ _ (hk _ _ hci)).2

theorem req_of_covers {P : Prog Label B} (hc : Covers P) {f g : Nat}
    {θ θ' : Assign Label B} (hr : P.Req f θ)
    (h : KeyAt P (P.loc f θ) (P.body f) g θ') : P.Req g θ' :=
  req_of_keyAt hc h (hc f θ hr).2

/-- C, acceptance irrelevance: two splits, each valid in a model that
counts every requirement, are both accepted, at every declaration and
key its interface admits. -/
theorem accepted_split {P₁ P₂ : Prog Label B} (hv : SplitVariant P₁ P₂)
    (h₁ : Covers P₁) (h₂ : Covers P₂) {f : Nat} {θ : Assign Label B}
    (hr : P₁.Req f θ) :
    Accepted P₁ (P₁.loc f θ) (P₁.body f) ∧
      Accepted P₂ (P₂.loc f θ) (P₂.body f) := by
  obtain ⟨_, _, _, _, hR⟩ := hv
  exact ⟨accepted_of_covers h₁ hr, accepted_of_covers h₂ (hR ▸ hr)⟩

/-- Under M1 (`Req₁`), clause (i) of `Covers` holds by definition, so
coverage reduces to (ii): every call meets the callee's `Req₁`. -/
theorem covers_req₁_iff (P : Prog Label B) :
    Covers (withReq P (Req₁ P)) ↔
      ∀ f θ, Req₁ P f θ → ∀ g k, CallIn (P.body f) g k →
        Req₁ P g (P.wit k (P.loc f θ)) := by
  constructor
  · intro hc f θ hr g k hci
    exact (hc f θ hr).2 g k hci
  · intro h f θ hr
    exact ⟨hr.2, h f θ hr⟩

end Composition.SplitIrrelevance
