/-
One elimination step of Robinson's procedure, in the generic model.
`MguSpec E μ`: `μ` unifies the pairs `E`, has finite values, keeps the
cell shape, is a fixed point of every unifier (`τ = τ ∘ μ`, which makes
it most general), and is a fixed point of every `hv` reading that
satisfies `E` (`Agree`, needed for coverage). Binding `x := u`, with
every unifier and every reading satisfying it, turns a spec for the
substituted pairs into a spec for `E`.
-/
import Composition.Typed.UnifDis

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

abbrev Pairs (Label B : Type) := List (CG Label B × CG Label B)

def OccE (c : CConst Label) (E : Pairs Label B) : Prop :=
  ∃ p ∈ E, Occ c p.1 ∨ Occ c p.2

def GoodE (P : SigProblem Label B) (C : List Cell) (E : Pairs Label B) :
    Prop :=
  ∀ p ∈ E, CS P C p.1 ∧ CS P C p.2 ∧ FinG p.1 ∧ FinG p.2

def substE (σ : CSubst Label B) (E : Pairs Label B) : Pairs Label B :=
  E.map fun p => (substG σ p.1, substG σ p.2)

def HvSat (P : SigProblem Label B) (θ : Assign Label B) (ν : Val Label B)
    (E : Pairs Label B) : Prop :=
  ∀ p ∈ E, hv P θ ν none p.1 = hv P θ ν none p.2

def MguSpec (P : SigProblem Label B) (C : List Cell) (E : Pairs Label B)
    (μ : CSubst Label B) : Prop :=
  UnifL μ E ∧ (∀ c, FinG (μ c)) ∧ Compat P C μ ∧
    (∀ τ, UnifL τ E → ∀ c, substG τ (μ c) = τ c) ∧
    ∀ θ ν, HvSat P θ ν E → Agree P θ (vcomp P θ ν μ) ν

open Classical in
/-- The single binding `x := u`. -/
noncomputable def bind (x : CConst Label) (u : CG Label B) : CSubst Label B :=
  fun c => if c = x then u else cv c

variable {P : SigProblem Label B} {C : List Cell}

omit [DecidableEq Label] in
theorem unifL_substE {σ τ : CSubst Label B} {E : Pairs Label B}
    (h : UnifL τ (substE σ E)) :
    UnifL (fun c => substG τ (σ c)) E := by
  intro p hp
  have := h _ (List.mem_map_of_mem (f := fun p => (substG σ p.1, substG σ p.2))
    hp)
  simpa [substG_comp] using this

omit [DecidableEq Label] in
/-- A unifier satisfying the binding is unchanged by it. -/
theorem subst_bind_fix {τ : CSubst Label B} {x : CConst Label}
    {u : CG Label B} (h : τ x = substG τ u) (g : CG Label B) :
    substG τ (substG (bind x u) g) = substG τ g := by
  rw [substG_comp]
  refine substG_congr g fun c _ => ?_
  by_cases hc : c = x
  · subst hc; simp [bind, h]
  · simp [bind, hc, substG]

omit [DecidableEq Label] in
theorem unifL_bind {τ : CSubst Label B} {x : CConst Label} {u : CG Label B}
    {E : Pairs Label B} (h : τ x = substG τ u) (hE : UnifL τ E) :
    UnifL τ (substE (bind x u) E) := by
  intro p hp
  obtain ⟨q, hq, rfl⟩ := List.mem_map.mp hp
  simp only [subst_bind_fix h]
  exact hE q hq

theorem hvSat_bind {θ : Assign Label B} {ν : Val Label B}
    {x : CConst Label} {u : CG Label B} {E : Pairs Label B}
    (hE : GoodE P C E) (ha : Agree P θ (vcomp P θ ν (bind x u)) ν)
    (h : HvSat P θ ν E) : HvSat P θ ν (substE (bind x u) E) := by
  intro p hp
  obtain ⟨q, hq, rfl⟩ := List.mem_map.mp hp
  simp only [hv_subst]
  rw [hv_congr ha q.1 (hE q hq).1, hv_congr ha q.2 (hE q hq).2.1]
  exact h q hq

theorem elim_step {E : Pairs Label B} {x : CConst Label} {u : CG Label B}
    (hE : GoodE P C E) (hσ : Compat P C (bind x u)) (hfu : FinG u)
    (hux : ∀ τ, UnifL τ E → τ x = substG τ u)
    (hhv : ∀ θ ν, HvSat P θ ν E → Agree P θ (vcomp P θ ν (bind x u)) ν)
    {μ' : CSubst Label B} (hμ : MguSpec P C (substE (bind x u) E) μ') :
    MguSpec P C E (fun c => substG μ' (bind x u c)) := by
  obtain ⟨hu, hf, hc, hm, hh⟩ := hμ
  refine ⟨unifL_substE hu, fun c => ?_, ⟨fun c hc' => ?_, fun r S hr => ?_⟩,
    fun τ hτ c => ?_, fun θ ν hs => ?_⟩
  · refine fin_substG _ ?_ fun d _ => hf d
    by_cases h : c = x
    · simp [bind, h, hfu]
    · simp [bind, h]; trivial
  · exact cs_subst hc _ (hσ.1 c hc')
  · obtain ⟨r', hr', h1⟩ := hσ.2 r S hr
    obtain ⟨r'', hr'', h2⟩ := hc.2 r' S hr'
    exact ⟨r'', hr'', by simp [h1, substG, h2]⟩
  · have hτ' := unifL_bind (hux τ hτ) hτ
    rw [substG_comp, substG_congr (τ₂ := τ) _ fun d _ => hm τ hτ' d]
    by_cases h : c = x
    · subst h; simp [bind, hux τ hτ]
    · simp [bind, h, substG]
  · have hA := hh θ ν (hvSat_bind hE (hhv θ ν hs) hs)
    have hs' : HvSat P θ (vcomp P θ ν μ') E := fun p hp => by
      rw [hv_congr hA p.1 (hE p hp).1, hv_congr hA p.2 (hE p hp).2.1]
      exact hs p hp
    have hB := agree_trans (hhv θ _ hs') hA
    refine ⟨fun c hc' => ?_, fun r S k hk hk' => ?_⟩
    · have := hB.1 c hc'
      simpa [vcomp, hv_subst] using this
    · have := hB.2 r S k hk hk'
      simpa [vcomp, hv_subst] using this

end Composition.Typed
