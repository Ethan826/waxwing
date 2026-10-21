/-
The source-level boundary (dossier §17). Signature problems translated by
hand from Waxwing functions (sig-oracle/source-boundary.mjs; no
translator is implemented). Kernel-checked: each function P9s's search
certifies is valid in the finite semantics, its certificate table
checked by `decide` (not only by the evaluator). And `route`, a valid
function in the intended fragment, is refused by the semantic rule, so
no table can certify it:

    fn divide(whole: { ...u, ...v }, left: { ...s }, right: { ...t }): Int
      where u disjoint s, v disjoint t = 0
    fn route(x: { ...r }, y: { ...s }, z: { ...t }): Int
      where s disjoint t = divide(x, y, z)
-/
import Composition.Sig.SplitNotAccepted
import Composition.Sig.CheckData

namespace Composition.Syntax.SourceBoundary

open Composition Composition.Syntax Composition.Syntax.CheckData

theorem greeting_validFin : ValidFin ex_src_greeting :=
  checkAll_validFin (T := tab_src_greeting) (by decide)
theorem mark_validFin : ValidFin ex_src_mark :=
  checkAll_validFin (T := tab_src_mark) (by decide)
theorem markForwarded_validFin : ValidFin ex_src_markForwarded :=
  checkAll_validFin (T := tab_src_markForwarded) (by decide)
theorem join_validFin : ValidFin ex_src_join :=
  checkAll_validFin (T := tab_src_join) (by decide)
theorem forwarded_validFin : ValidFin ex_src_forwarded :=
  checkAll_validFin (T := tab_src_forwarded) (by decide)
theorem join3_validFin : ValidFin ex_src_join3 :=
  checkAll_validFin (T := tab_src_join3) (by decide)
theorem both_validFin : ValidFin ex_src_both :=
  checkAll_validFin (T := tab_src_both) (by decide)
theorem wrapAccepts_validFin : ValidFin ex_src_wrapAccepts :=
  checkAll_validFin (T := tab_src_wrapAccepts) (by decide)
theorem routeNarrowed_validFin : ValidFin ex_src_routeNarrowed :=
  checkAll_validFin (T := tab_src_routeNarrowed) (by decide)

set_option maxRecDepth 100000 in
/-- Every exported certificate table, kernel-checked at once. -/
theorem exported_all_pass :
    (exported.all fun e => checkAll e.2.1 e.2.2) = true := by decide

variable {Label B : Type} [DecidableEq Label]

/-- `route`'s problem: rigid rows 0-2 (`r`, `s`, `t`); `divide`'s
instantiated `u`, `v`, `s`, `t` are flexible rows 3-6. -/
def routeSig : SigProblem Label B :=
  ⟨[], [0, 1, 2], [.disjoint 1 2],
   [.eq (.record .nil [0]) (.record .nil [3, 4]),
    .eq (.record .nil [1]) (.record .nil [5]),
    .eq (.record .nil [2]) (.record .nil [6]),
    .disjoint 3 5, .disjoint 4 6, .disjoint 3 4]⟩

theorem routeSig_not_accepts : ¬ Accepts (routeSig : SigProblem Label B) := by
  intro hA
  obtain ⟨σ, -, hB⟩ := hA (fun _ _ => false)
    ⟨fun r l h => by simp [routeSig] at h, fun r s l _ h => by simp at h⟩
  generalize hΓ :
    genAssign (routeSig : SigProblem Label B) (fun _ _ => false) σ = Γ at hB
  have e0 := hB (.eq (.record .nil [0]) (.record .nil [3, 4]))
    (by simp [routeSig])
  have e1 := hB (.eq (.record .nil [1]) (.record .nil [5])) (by simp [routeSig])
  have e2 := hB (.eq (.record .nil [2]) (.record .nil [6])) (by simp [routeSig])
  have h35 := hB (.disjoint 3 5) (by simp [routeSig])
  have h46 := hB (.disjoint 4 6) (by simp [routeSig])
  simp only [liftAtom, HoldsG, liftT, liftF, evalT_tails, List.map_cons,
    List.map_nil, composeAll_single, Option.map_some] at e0 e1 e2 h35 h46
  obtain ⟨g, hl, hr, -⟩ := e0
  obtain ⟨g1, hl1, hr1, -⟩ := e1
  obtain ⟨g2, hl2, hr2, -⟩ := e2
  simp only [Option.some.injEq] at hl hl1 hl2 hr1 hr2
  subst hl hl1 hl2
  simp only [G.record.injEq] at hr1 hr2
  have h0 : Γ.row 0 (.inr 0) = some (.base (.inr (.R 0))) := by
    simp [← hΓ, genAssign, routeSig, genRow]
  have h5 : Γ.row 5 (.inr 1) ≠ none := by
    rw [hr1]; simp [← hΓ, genAssign, routeSig, genRow]
  have h6 : Γ.row 6 (.inr 2) ≠ none := by
    rw [hr2]; simp [← hΓ, genAssign, routeSig, genRow]
  have hpair : composeAll [Γ.row 3, Γ.row 4] = compose (Γ.row 3) (Γ.row 4) := by
    simp [composeAll, compose_empty]
  rw [hpair] at hr
  cases hc : compose (Γ.row 3) (Γ.row 4) with
  | none => simp [hc] at hr
  | some w =>
    simp only [hc, Option.map_some, Option.some.injEq, G.record.injEq] at hr
    subst hr
    obtain ⟨-, hw⟩ := compose_eq_some.mp hc
    have hk := congrFun hw (.inr 0)
    rw [h0] at hk
    simp only [union] at hk
    have hnd1 : ¬ Declared (routeSig : SigProblem Label B) 0 1 := by
      simp [Declared, routeSig]
    have hnd2 : ¬ Declared (routeSig : SigProblem Label B) 0 2 := by
      simp [Declared, routeSig]
    cases h3 : Γ.row 3 (.inr 0) with
    | some _ =>
      exact hnd1 (h35.2 0 (by simp [routeSig]) 1
        (by simp [routeSig]) (by decide) (by simp [h3]) h5)
    | none =>
      rw [h3] at hk
      exact hnd2 (h46.2 0 (by simp [routeSig]) 2
        (by simp [routeSig]) (by decide) (by simp [← hk]) h6)

theorem routeSig_validFin : ValidFin (routeSig : SigProblem Label B) := by
  intro θR _ hrow hd
  have hst : Disjoint (θR.row 1) (θR.row 2) :=
    hd (.disjoint 1 2) (by simp [routeSig])
  have hfin : ∀ r ∈ [0, 1, 2], FinG (.record (θR.row r)) :=
    fun r hr => hrow r (by simpa [routeSig] using hr)
  let u := outside (θR.row 0) (θR.row 1)
  let v := inside (θR.row 0) (θR.row 1)
  have h0 := hfin 0 (by simp)
  have hu : FinG (.record u) := finG_part (fun k h => by
    by_cases h' : θR.row 1 k = none <;> simp_all [u, outside]) h0
  have hv : FinG (.record v) := finG_part (fun k h => by
    by_cases h' : θR.row 1 k = none <;> simp_all [v, inside]) h0
  have huv : Disjoint u v := fun l => by
    by_cases h : θR.row 1 l = none <;> simp [u, v, outside, inside, h]
  have hr : union u v = θR.row 0 := by
    funext l
    by_cases h : θR.row 1 l = none <;>
      cases hr : θR.row 0 l <;> simp [u, v, outside, inside, union, h, hr]
  let rows : Nat → Row Label (G Label B) := fun n =>
    if n = 3 then u else if n = 4 then v else if n = 5 then θR.row 1
    else if n = 6 then θR.row 2 else Row.empty
  refine ⟨⟨fun _ => emptyG, rows⟩, ⟨fun _ => finG_emptyG, fun n => ?_⟩, ?_⟩
  · simp only [rows]
    by_cases h3 : n = 3
    · simp only [h3, ↓reduceIte]; exact hu
    by_cases h4 : n = 4
    · simp only [h4, ↓reduceIte]; exact hv
    by_cases h5 : n = 5
    · simp only [h5, ↓reduceIte]; exact hfin 1 (by simp)
    by_cases h6 : n = 6
    · simp only [h6, ↓reduceIte]; exact hfin 2 (by simp)
    simp only [h3, h4, h5, h6, ↓reduceIte]
    exact finG_part (fun _ h => absurd rfl h) finG_emptyG
  intro a ha
  simp only [routeSig, List.mem_cons] at ha
  rcases ha with rfl | rfl | rfl | rfl | rfl | rfl | h
  · refine ⟨.record (θR.row 0), by simp [evalT_tails, combine, routeSig,
      composeAll_single], ?_⟩
    simp [evalT_tails, combine, routeSig, rows, composeAll_pair huv, hr]
  · exact ⟨.record (θR.row 1), by simp [evalT_tails, combine, routeSig,
      composeAll_single], by simp [evalT_tails, combine, routeSig, rows,
      composeAll_single]⟩
  · exact ⟨.record (θR.row 2), by simp [evalT_tails, combine, routeSig,
      composeAll_single], by simp [evalT_tails, combine, routeSig, rows,
      composeAll_single]⟩
  · intro l
    by_cases h : θR.row 1 l = none <;>
      simp [combine, routeSig, rows, u, outside, h]
  · intro l
    by_cases h : θR.row 1 l = none
    · simp [combine, routeSig, rows, v, inside, h]
    · rcases hst l with h' | h'
      · exact absurd h' h
      · simp [combine, routeSig, rows, h']
  · intro l
    simpa [combine, routeSig, rows] using huv l
  · simp at h

end Composition.Syntax.SourceBoundary
