/-
Robinson's unification theorem for the generic model's finite
cell-shaped pairs (J. A. Robinson, "A Machine-Oriented Logic Based on
the Resolution Principle", J. ACM 12(1), 1965, the Unification
Theorem): a unifiable finite set of pairs has a most general unifier.
Proved here directly, by induction on the number of constants, with
the disagreement step of UnifDis.lean; construction.md §6.1 records how
this model departs from Robinson's term language and why the direct
proof covers the departures. The result is stronger than most
generality: every unifier `τ` satisfies `τ = τ ∘ μ`, and every `hv`
reading satisfying the pairs is a fixed point of `μ` (for coverage).
-/
import Composition.Typed.UnifStep

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {C : List Cell}

omit [DecidableEq Label] in
theorem goodE_bind {E : Pairs Label B} {x : CConst Label} {u : CG Label B}
    (hE : GoodE P C E) (hσ : Compat P C (bind x u)) (hfu : FinG u) :
    GoodE P C (substE (bind x u) E) := by
  intro p hp
  obtain ⟨q, hq, rfl⟩ := List.mem_map.mp hp
  have hfin : ∀ c, FinG (bind x u c) := fun c => by
    by_cases h : c = x
    · simp [bind, h, hfu]
    · simp [bind, h]; trivial
  obtain ⟨h1, h2, h3, h4⟩ := hE q hq
  exact ⟨cs_subst hσ _ h1, cs_subst hσ _ h2,
    fin_substG _ h3 fun c _ => hfin c, fin_substG _ h4 fun c _ => hfin c⟩

omit [DecidableEq Label] in
theorem occE_bind {E : Pairs Label B} {x c : CConst Label} {u : CG Label B}
    (hxu : ¬ Occ x u) (hu : ∀ d, Occ d u → OccE d E)
    (h : OccE c (substE (bind x u) E)) : OccE c E ∧ c ≠ x := by
  obtain ⟨p, hp, ho⟩ := h
  obtain ⟨q, hq, rfl⟩ := List.mem_map.mp hp
  rcases ho with ho | ho
  · obtain ⟨d, hd, hc⟩ := occ_substG _ ho
    by_cases h : d = x
    · subst h
      simp only [bind, ↓reduceIte] at hc
      exact ⟨hu c hc, fun e => hxu (e ▸ hc)⟩
    · simp only [bind, h, ↓reduceIte, Occ] at hc
      subst hc
      exact ⟨⟨q, hq, Or.inl hd⟩, h⟩
  · obtain ⟨d, hd, hc⟩ := occ_substG _ ho
    by_cases h : d = x
    · subst h
      simp only [bind, ↓reduceIte] at hc
      exact ⟨hu c hc, fun e => hxu (e ▸ hc)⟩
    · simp only [bind, h, ↓reduceIte, Occ] at hc
      subst hc
      exact ⟨⟨q, hq, Or.inr hd⟩, h⟩

omit [DecidableEq Label] in
theorem count_bind {E : Pairs Label B} {x : CConst Label} {u : CG Label B}
    {n : Nat} (hxu : ¬ Occ x u) (hu : ∀ d, Occ d u → OccE d E)
    (hx : OccE x E)
    (hL : ∃ L : List (CConst Label), L.length ≤ n + 1 ∧ ∀ c, OccE c E → c ∈ L) :
    ∃ L : List (CConst Label), L.length ≤ n ∧
      ∀ c, OccE c (substE (bind x u) E) → c ∈ L := by
  classical
  obtain ⟨L, hl, hc⟩ := hL
  refine ⟨L.erase x, ?_, fun c h => ?_⟩
  · rw [List.length_erase_of_mem (hc x hx)]
    omega
  · obtain ⟨h1, h2⟩ := occE_bind hxu hu h
    exact (List.mem_erase_of_ne h2).mpr (hc c h1)

theorem mguSpec_id {E : Pairs Label B} (h : ∀ p ∈ E, p.1 = p.2) :
    MguSpec P C E cv := by
  refine ⟨fun p hp => by rw [h p hp], fun _ => trivial,
    ⟨fun c hc => hc, fun r S hr => ⟨r, hr, rfl⟩⟩, fun _ _ _ => rfl,
    fun _ _ _ => ⟨fun _ _ => rfl, fun _ _ _ _ _ => rfl⟩⟩

end Composition.Typed
