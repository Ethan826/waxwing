/-
The semantics of each unifier step: equations between well-formed
sides compare values (`holds_eq_iff`); records decompose one field at a
time (`record_step`); a closed expression that evaluates is well formed
(`defined_wf`).
-/
import Composition.Unify.Record

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

mutual
  theorem defined_wf {θ : Assign Label B} :
      ∀ (t : TExpr Label B) {g : G Label B}, rowVarsT t = [] →
        evalT θ t = some g → wfT t = true
    | .base _, _, _, _ => rfl
    | .tvar _, _, _, _ => rfl
    | .arrow a c, g, hr, h => by
      simp only [rowVarsT, List.append_eq_nil_iff] at hr
      simp only [evalT, Option.bind_eq_some_iff, Option.map_eq_some_iff]
        at h
      obtain ⟨va, ha, vc, hc, _⟩ := h
      simp [wfT, defined_wf a hr.1 ha, defined_wf c hr.2 hc]
    | .record fs tails, g, hr, h => by
      simp only [rowVarsT, List.append_eq_nil_iff] at hr
      obtain ⟨hf, rfl⟩ := hr
      rw [evalT_closedRecord] at h
      simp only [Option.map_eq_some_iff] at h
      obtain ⟨fr, hfr, _⟩ := h
      simp [wfT, defined_wfF fs hf hfr,
        (noDupB_iff _).mpr (evalF_nodup fs hfr)]

  theorem defined_wfF {θ : Assign Label B} :
      ∀ (fs : Fields Label B) {fr : Row Label (G Label B)},
        rowVarsF fs = [] → evalF θ fs = some fr → wfF fs = true
    | .nil, _, _, _ => rfl
    | .cons l t rest, fr, hr, h => by
      simp only [rowVarsF, List.append_eq_nil_iff] at hr
      simp only [evalF, Option.bind_eq_some_iff] at h
      obtain ⟨g, hg, r, hrr, _⟩ := h
      simp [wfF, defined_wf t hr.1 hg, defined_wfF rest hr.2 hrr]
end

theorem holds_eq_iff {θ : Assign Label B} {a b : TExpr Label B}
    (ha : wfT a = true) (hb : wfT b = true) :
    Holds θ (.eq a b) ↔ evalT θ a = evalT θ b := by
  obtain ⟨ga, hga⟩ := wf_defined (θ := θ) a ha
  obtain ⟨gb, hgb⟩ := wf_defined (θ := θ) b hb
  simp only [Holds, hga, hgb, Option.some.injEq]
  constructor
  · rintro ⟨g, rfl, rfl⟩
    rfl
  · intro h
    exact ⟨ga, rfl, h.symm⟩

theorem wf_record_cons {l : Label} {t : TExpr Label B} {r : Fields Label B}
    (h : wfT (.record (.cons l t r) []) = true) :
    wfT t = true ∧ wfT (.record r []) = true ∧ l ∉ r.labels := by
  simp only [wfT, Bool.and_eq_true, List.isEmpty_nil, true_and, wfF,
    noDupB, Fields.labels, Bool.not_eq_true', decide_eq_false_iff_not] at h
  exact ⟨h.2.1, by simp [wfT, h.1.2, h.2.2], h.1.1⟩

/-- The record step: `{ l: t, r } = { fs' }` iff `fs'` has `l`, at a
type equal to `t`, and the rest agree. -/
theorem record_step {θ : Assign Label B} {l : Label} {t : TExpr Label B}
    {r fs' : Fields Label B}
    (h1 : wfT (.record (.cons l t r) []) = true)
    (h2 : wfT (.record fs' []) = true) :
    evalT θ (.record (.cons l t r) []) = evalT θ (.record fs' []) ↔
      ∃ u rest, removeField l fs' = some (u, rest) ∧
        evalT θ t = evalT θ u ∧
        evalT θ (.record r []) = evalT θ (.record rest []) := by
  obtain ⟨F, hF⟩ := (wf_defined (θ := θ) _ h1)
  obtain ⟨F', hF'⟩ := (wf_defined (θ := θ) _ h2)
  rw [evalT_closedRecord] at hF hF'
  simp only [Option.map_eq_some_iff] at hF hF'
  obtain ⟨fr, hfr, rfl⟩ := hF
  obtain ⟨fr', hfr', rfl⟩ := hF'
  have hself : removeField l (.cons l t r) = some (t, r) := by
    simp [removeField]
  obtain ⟨vt, frr, hvt, hfrr, rfl, hl⟩ := removeField_eval hself hfr
  rw [evalT_closedRecord, evalT_closedRecord, hfr, hfr', evalT_closedRecord,
    hfrr, hvt]
  simp only [Option.map_some, Option.some.injEq, G.record.injEq]
  constructor
  · intro he
    cases hrm : removeField l fs' with
    | none =>
      have this : fr' l = none := by
        cases hv : fr' l with
        | none => rfl
        | some _ =>
          exact absurd ((evalF_dom fs' hfr' l).mp (by simp [hv]))
            (removeField_none hrm)
      rw [← he] at this
      simp [union, single] at this
    | some p =>
      obtain ⟨u, rest⟩ := p
      obtain ⟨vu, fr'', hvu, hfr'', rfl, hl'⟩ := removeField_eval hrm hfr'
      have hat := congrFun he l
      simp [union, single] at hat
      refine ⟨u, rest, rfl, by rw [hvu, hat], ?_⟩
      rw [evalT_closedRecord, hfr'']
      simp only [Option.map_some, Option.some.injEq, G.record.injEq]
      funext k
      have hk := congrFun he k
      by_cases hkl : k = l
      · subst hkl
        rw [hl, hl']
      · simpa [union, single, hkl] using hk
  · rintro ⟨u, rest, hrm, htu, hrr⟩
    obtain ⟨vu, fr'', hvu, hfr'', rfl, hl'⟩ := removeField_eval hrm hfr'
    rw [hvu] at htu
    simp only [Option.some.injEq] at htu
    rw [evalT_closedRecord, hfr''] at hrr
    simp only [Option.map_some, Option.some.injEq, G.record.injEq] at hrr
    rw [htu, hrr]

theorem record_nil_ne {θ : Assign Label B} {l : Label}
    {t : TExpr Label B} {r : Fields Label B}
    (h : wfT (.record (.cons l t r) []) = true) :
    evalT θ (.record .nil []) ≠ evalT θ (.record (.cons l t r) []) := by
  obtain ⟨F, hF⟩ := wf_defined (θ := θ) _ h
  rw [hF]
  rw [evalT_closedRecord] at hF ⊢
  simp only [Option.map_eq_some_iff] at hF
  obtain ⟨fr, hfr, rfl⟩ := hF
  have := (evalF_dom _ hfr l).mpr (by simp [Fields.labels])
  simp only [evalF, Option.map_some, ne_eq, Option.some.injEq,
    G.record.injEq]
  intro he
  rw [← he] at this
  exact this rfl

end Composition.Syntax
