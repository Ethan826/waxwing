/-
K8 (dossier §16): P9s's semantic acceptance rule refuses `splitSig`,
which is valid both over all partial maps (`splitSig_valid`,
Adversarial.lean) and in Waxwing's finite semantics (`splitSig_validFin`,
here; the witnesses are parts of the finite input row). With K7 the
boundary reads: every signature the semantic rule admits has a finite
table the executable checker accepts, and some valid signatures are
nevertheless excluded by that rule (`semantic_rule_boundary`).

The proof of `splitSig_not_accepts` follows one written by the
adversarial reviewer of §16 (scratch, 2026-10-20), adapted here.
-/
import Composition.Sig.Complete

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- K8. -/
theorem splitSig_not_accepts : ¬ Accepts (splitSig : SigProblem Label B) := by
  intro hA
  obtain ⟨σ, -, hB⟩ := hA (fun _ _ => false)
    ⟨fun r l h => by simp [splitSig] at h, fun r s l _ h => by simp at h⟩
  generalize hΓ :
    genAssign (splitSig : SigProblem Label B) (fun _ _ => false) σ = Γ at hB
  have heq := hB (.eq (.record .nil [0]) (.record .nil [3, 4]))
    (by simp [splitSig])
  have h31 := hB (.disjoint 3 1) (by simp [splitSig])
  have h42 := hB (.disjoint 4 2) (by simp [splitSig])
  simp only [liftAtom, HoldsG] at heq h31 h42
  obtain ⟨g, hl, hr, -⟩ := heq
  simp only [liftT, liftF] at hl hr
  rw [evalT_tails] at hl hr
  simp only [List.map_cons, List.map_nil, composeAll_single, Option.map_some,
    Option.some.injEq] at hl
  subst hl
  have h0 : Γ.row 0 (.inr 0) = some (.base (.inr (.R 0))) := by
    simp [← hΓ, genAssign, splitSig, genRow]
  have h1 : Γ.row 1 (.inr 1) ≠ none := by
    simp [← hΓ, genAssign, splitSig, genRow]
  have h2 : Γ.row 2 (.inr 2) ≠ none := by
    simp [← hΓ, genAssign, splitSig, genRow]
  have hnd01 : ¬ Declared (splitSig : SigProblem Label B) 0 1 := by
    simp [Declared, splitSig]
  have hnd02 : ¬ Declared (splitSig : SigProblem Label B) 0 2 := by
    simp [Declared, splitSig]
  have hpair : composeAll [Γ.row 3, Γ.row 4] = compose (Γ.row 3) (Γ.row 4) := by
    simp [composeAll, compose_empty]
  simp only [List.map_cons, List.map_nil, hpair] at hr
  cases hc : compose (Γ.row 3) (Γ.row 4) with
  | none => simp [hc] at hr
  | some w =>
    simp only [hc, Option.map_some, Option.some.injEq, G.record.injEq] at hr
    subst hr
    obtain ⟨-, hw⟩ := compose_eq_some.mp hc
    have hk := congrFun hw (.inr 0)
    rw [h0] at hk
    simp only [union] at hk
    cases h3 : Γ.row 3 (.inr 0) with
    | some t =>
      exact hnd01 (h31.2 0 (by simp [splitSig]) 1 (by simp [splitSig])
        (by decide) (by simp [h3]) h1)
    | none =>
      rw [h3] at hk
      exact hnd02 (h42.2 0 (by simp [splitSig]) 2 (by simp [splitSig])
        (by decide) (by simp [← hk]) h2)

omit [DecidableEq Label] in
/-- A part of a finite row is finite. -/
theorem finG_part {f g : Row Label (G Label B)}
    (hfg : ∀ k, f k ≠ none → f k = g k) (hg : FinG (.record g)) :
    FinG (.record f) := by
  rw [finG_record] at hg ⊢
  obtain ⟨⟨ls, hls⟩, hv⟩ := hg
  refine ⟨⟨ls, fun k hk => hls k (by rw [← hfg k hk]; exact hk)⟩,
    fun k => ?_⟩
  by_cases h : f k = none
  · simp [h, FinO]
  · rw [hfg k h]; exact hv k

/-- `splitSig` is valid in Waxwing's finite semantics. -/
theorem splitSig_validFin : ValidFin (splitSig : SigProblem Label B) := by
  intro θR _ hrow hd
  have hst : Disjoint (θR.row 1) (θR.row 2) :=
    hd (.disjoint 1 2) (by simp [splitSig])
  have hfin : FinG (.record (θR.row 0)) := hrow 0 (by simp [splitSig])
  let u := outside (θR.row 0) (θR.row 1)
  let v := inside (θR.row 0) (θR.row 1)
  have hu : FinG (.record u) := finG_part (fun k h => by
    by_cases h' : θR.row 1 k = none <;> simp_all [u, outside]) hfin
  have hv : FinG (.record v) := finG_part (fun k h => by
    by_cases h' : θR.row 1 k = none <;> simp_all [v, inside]) hfin
  have huv : Disjoint u v := fun l => by
    by_cases h : θR.row 1 l = none <;> simp [u, v, outside, inside, h]
  have hr : union u v = θR.row 0 := by
    funext l
    by_cases h : θR.row 1 l = none <;>
      cases hr : θR.row 0 l <;> simp [u, v, outside, inside, union, h, hr]
  refine ⟨⟨fun _ => emptyG, fun n => if n = 3 then u else v⟩,
    ⟨fun _ => finG_emptyG, fun n => ?_⟩, ?_⟩
  · by_cases h : n = 3 <;> simp [h, hu, hv]
  intro a ha
  simp only [splitSig, List.mem_cons] at ha
  rcases ha with rfl | rfl | rfl | h
  · refine ⟨.record (θR.row 0), by simp [evalT_tails, combine, splitSig,
      composeAll_single], ?_⟩
    simp [evalT_tails, combine, splitSig, composeAll_pair huv, hr]
  · intro l
    by_cases h : θR.row 1 l = none <;>
      simp [combine, splitSig, u, outside, h]
  · intro l
    by_cases h : θR.row 1 l = none
    · simp [combine, splitSig, v, inside, h]
    · rcases hst l with h' | h'
      · exact absurd h' h
      · simp [combine, splitSig, h']
  · simp at h

/-- Every signature the semantic rule admits has a finite table the
executable checker accepts; some valid signatures are nevertheless
excluded by that rule. -/
theorem semantic_rule_boundary [DecidableEq B] :
    (∀ P : SigProblem Label B, Accepts P →
        ∃ T : CertTable Label B, checkAll P T = true) ∧
      ∃ P : SigProblem Label B, ValidFin P ∧ ValidAll P ∧ ¬ Accepts P :=
  ⟨fun _ h => accepts_checkAll h,
   ⟨splitSig, splitSig_validFin, splitSig_valid, splitSig_not_accepts⟩⟩

end Composition.Syntax
