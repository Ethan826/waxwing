/-
Robinson's theorem in the generic model (see UnifRobinson.lean for the
source and construction.md §6.1 for the correspondence): finite
cell-shaped pairs with a unifier have a most general one satisfying
`MguSpec`. Induction on the number of constants: a clash contradicts
the unifier, and a binding eliminates one constant.
-/
import Composition.Typed.UnifRobinson

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {C : List Cell}

omit [DecidableEq Label] in
theorem clash_no_unifier {s t : CG Label B} (h : Clash C s t)
    {τ : CSubst Label B} (he : substG τ s = substG τ t) : False := by
  obtain ⟨L, _, hc⟩ := h
  apply hc fun c => pr L (τ c)
  rw [← pr_subst, ← pr_subst, he]

omit [DecidableEq Label] in
theorem bind1_compat {x : CConst Label} {u : CG Label B} (hx : NonX x)
    (hu : CS P C u) : Compat P C (bind x u) := by
  refine ⟨fun c hc => ?_, fun r S hr => ⟨r, hr, ?_⟩⟩
  · by_cases h : c = x
    · simp [bind, h, hu]
    · simpa [bind, h, CS] using hc
  · have : (CConst.X r S : CConst Label) ≠ x := fun e => by
      subst e; exact hx.elim
    simp [bind, this]

omit [DecidableEq Label] in
theorem bind2_compat {r r' : Nat} {S : Cell} (hr' : r' ∈ S) :
    Compat P C (bind (.X r S) (cv (.X r' S) : CG Label B)) := by
  refine ⟨fun c hc => ?_, fun r0 S0 hr0 => ?_⟩
  · have : c ≠ .X r S := fun e => by subst e; exact hc.elim
    simpa [bind, this, CS] using hc
  · by_cases h : (CConst.X r0 S0 : CConst Label) = .X r S
    · simp only [CConst.X.injEq] at h
      obtain ⟨rfl, rfl⟩ := h
      exact ⟨r', hr', by simp [bind]⟩
    · exact ⟨r0, hr0, by simp [bind, h]⟩

theorem robinson : ∀ (n : Nat) (E : Pairs Label B), GoodE P C E →
    (∃ L : List (CConst Label), L.length ≤ n ∧ ∀ c, OccE c E → c ∈ L) →
    (∃ τ, UnifL τ E) → ∃ μ, MguSpec P C E μ := by
  intro n
  induction n with
  | zero =>
    intro E hE ⟨L, hl, hL⟩ ⟨τ, hτ⟩
    by_cases hall : ∀ p ∈ E, p.1 = p.2
    · exact ⟨cv, mguSpec_id hall⟩
    · exfalso
      have hL0 : L = [] := List.eq_nil_of_length_eq_zero (by omega)
      subst hL0
      obtain ⟨p, hp, hne⟩ : ∃ p ∈ E, p.1 ≠ p.2 :=
        Classical.byContradiction fun h => hall fun p hp =>
          Classical.byContradiction fun hn => h ⟨p, hp, hn⟩
      have hg := hE p hp
      rcases dis p.1 p.2 hg.1 hg.2.1 hne with hc | ⟨x, _, _, _, _, ho, _⟩ |
          ⟨r, _, S, _, _, _, ho, _⟩
      · exact clash_no_unifier hc (hτ p hp)
      · exact List.not_mem_nil (hL x ⟨p, hp, ho⟩)
      · exact List.not_mem_nil (hL _ ⟨p, hp, ho⟩)
  | succ n ih =>
    intro E hE hcount ⟨τ0, hτ0⟩
    by_cases hall : ∀ p ∈ E, p.1 = p.2
    · exact ⟨cv, mguSpec_id hall⟩
    obtain ⟨p, hp, hne⟩ : ∃ p ∈ E, p.1 ≠ p.2 :=
      Classical.byContradiction fun h => hall fun p hp =>
        Classical.byContradiction fun hn => h ⟨p, hp, hn⟩
    have hg := hE p hp
    rcases dis p.1 p.2 hg.1 hg.2.1 hne with hc |
        ⟨x, u, hx, hu, hux, ho, hvu, hfu, h1, _, h3⟩ |
        ⟨r, r', S, hrr, _, hr', ho, ho', h1, _, h3⟩
    · exact (clash_no_unifier hc (hτ0 p hp)).elim
    · have hσ := bind1_compat hx hu
      have hfu' := hfu hg.2.2.1 hg.2.2.2
      have hxu : ¬ Occ x u := fun hoc =>
        occurs_no_unifier hoc hux (h1 τ0 (hτ0 p hp))
      have hub : ∀ d, Occ d u → OccE d E := fun d hd => ⟨p, hp, hvu d hd⟩
      have hhv : ∀ θ ν, HvSat P θ ν E →
          Agree P θ (vcomp P θ ν (bind x u)) ν := by
        intro θ ν hs
        refine ⟨fun c _ => ?_, fun r S k _ _ => ?_⟩
        · by_cases h : c = x
          · subst h; simpa [vcomp, bind] using (h3 θ ν (hs p hp)).symm
          · simp [vcomp, bind, h, hv]
        · have : (CConst.X r S : CConst Label) ≠ x := fun e => by
            subst e; exact hx.elim
          simp [vcomp, bind, this, hv]
      obtain ⟨μ', hμ'⟩ := ih _ (goodE_bind hE hσ hfu')
        (count_bind hxu hub ⟨p, hp, ho⟩ hcount)
        ⟨τ0, unifL_bind (h1 τ0 (hτ0 p hp)) hτ0⟩
      exact ⟨_, elim_step hE hσ hfu' (fun τ hτ => h1 τ (hτ p hp)) hhv hμ'⟩
    · have hσ := bind2_compat (P := P) (C := C) (r := r) hr'
      have hxu : ¬ Occ (.X r S) (cv (.X r' S) : CG Label B) := fun hoc => by
        simp only [Occ, CConst.X.injEq] at hoc
        exact hrr hoc.1.symm
      have hub : ∀ d, Occ d (cv (.X r' S) : CG Label B) → OccE d E :=
        fun d hd => by
          simp only [Occ] at hd
          subst hd
          exact ⟨p, hp, ho'⟩
      have hhv : ∀ θ ν, HvSat P θ ν E →
          Agree P θ (vcomp P θ ν (bind (.X r S) (cv (.X r' S)))) ν := by
        intro θ ν hs
        refine ⟨fun c hc => ?_, fun r0 S0 k hk hk' => ?_⟩
        · have : c ≠ .X r S := fun e => by subst e; exact hc.elim
          simp [vcomp, bind, this, hv]
        · by_cases h : (CConst.X r0 S0 : CConst Label) = .X r S
          · simp only [CConst.X.injEq] at h
            obtain ⟨rfl, rfl⟩ := h
            simpa [vcomp, bind, hv] using (h3 θ ν (hs p hp) k hk hk').symm
          · simp [vcomp, bind, h, hv]
      obtain ⟨μ', hμ'⟩ := ih _ (goodE_bind hE hσ trivial)
        (count_bind hxu hub ⟨p, hp, ho⟩ hcount)
        ⟨τ0, unifL_bind (by simpa [substG] using h1 τ0 (hτ0 p hp)) hτ0⟩
      exact ⟨_, elim_step hE hσ trivial
        (fun τ hτ => by simpa [substG] using h1 τ (hτ p hp)) hhv hμ'⟩

end Composition.Typed
