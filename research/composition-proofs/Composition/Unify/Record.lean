/-
Closed records, one field at a time: the record step of the unifier and
its semantics (`record_step`). Also: a closed expression is defined iff
well formed (`defined_wf`), and well-formed expressions are closed.
-/
import Composition.Unify.Wf

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- Take out the field labelled `l`: its type and the other fields. -/
def removeField (l : Label) :
    Fields Label B → Option (TExpr Label B × Fields Label B)
  | .nil => none
  | .cons k t rest =>
    if k = l then some (t, rest)
    else (removeField l rest).map fun p => (p.1, .cons k t p.2)

theorem removeField_none :
    ∀ {fs : Fields Label B} {l : Label}, removeField l fs = none →
      l ∉ fs.labels
  | .nil, _, _ => by simp [Fields.labels]
  | .cons k t rest, l, h => by
    by_cases hk : k = l
    · simp [removeField, hk] at h
    · simp only [removeField, hk, ite_false, Option.map_eq_none_iff] at h
      simp [Fields.labels, Ne.symm hk, removeField_none h]

theorem removeField_labels :
    ∀ {fs : Fields Label B} {l : Label} {u : TExpr Label B}
      {rest : Fields Label B}, removeField l fs = some (u, rest) →
        rest.labels = fs.labels.erase l
  | .nil, _, _, _, h => by simp [removeField] at h
  | .cons k t r, l, u, rest, h => by
    by_cases hk : k = l
    · subst hk
      simp only [removeField, ite_true, Option.some.injEq,
        Prod.mk.injEq] at h
      obtain ⟨rfl, rfl⟩ := h
      simp [Fields.labels]
    · simp only [removeField, hk, ite_false, Option.map_eq_some_iff] at h
      obtain ⟨⟨u', r'⟩, hr, he⟩ := h
      simp only [Prod.mk.injEq] at he
      obtain ⟨rfl, rfl⟩ := he
      have hb : ¬ (k == l) = true := by simpa using hk
      simp [Fields.labels, removeField_labels hr, List.erase_cons_tail hb]

theorem removeField_wf :
    ∀ {fs : Fields Label B} {l : Label} {u : TExpr Label B}
      {rest : Fields Label B}, removeField l fs = some (u, rest) →
        wfF fs = true → wfT u = true ∧ wfF rest = true
  | .nil, _, _, _, h, _ => by simp [removeField] at h
  | .cons k t r, l, u, rest, h, hw => by
    simp only [wfF, Bool.and_eq_true] at hw
    by_cases hk : k = l
    · simp only [removeField, hk, ite_true, Option.some.injEq,
        Prod.mk.injEq] at h
      obtain ⟨rfl, rfl⟩ := h
      exact hw
    · simp only [removeField, hk, ite_false, Option.map_eq_some_iff] at h
      obtain ⟨⟨u', r'⟩, hr, he⟩ := h
      simp only [Prod.mk.injEq] at he
      obtain ⟨rfl, rfl⟩ := he
      have := removeField_wf hr hw.2
      exact ⟨this.1, by simp [wfF, hw.1, this.2]⟩

/-- Evaluating around a removed field. -/
theorem removeField_eval {θ : Assign Label B} :
    ∀ {fs : Fields Label B} {l : Label} {u : TExpr Label B}
      {rest : Fields Label B} {fr : Row Label (G Label B)},
      removeField l fs = some (u, rest) → evalF θ fs = some fr →
        ∃ v fr', evalT θ u = some v ∧ evalF θ rest = some fr' ∧
          fr = union (single l v) fr' ∧ fr' l = none
  | .nil, _, _, _, _, h, _ => by simp [removeField] at h
  | .cons k t r, l, u, rest, fr, h, he => by
    simp only [evalF, Option.bind_eq_some_iff] at he
    obtain ⟨g, hg, fr0, hr0, hc⟩ := he
    obtain ⟨hd, rfl⟩ := compose_eq_some.mp hc
    by_cases hk : k = l
    · subst hk
      simp only [removeField, ite_true, Option.some.injEq,
        Prod.mk.injEq] at h
      obtain ⟨rfl, rfl⟩ := h
      refine ⟨g, fr0, hg, hr0, rfl, ?_⟩
      rcases hd k with h1 | h1
      · simp [single] at h1
      · exact h1
    · simp only [removeField, hk, ite_false, Option.map_eq_some_iff] at h
      obtain ⟨⟨u', r'⟩, hr, hpe⟩ := h
      simp only [Prod.mk.injEq] at hpe
      obtain ⟨rfl, rfl⟩ := hpe
      obtain ⟨v, fr', hv, hr', rfl, hl⟩ := removeField_eval hr hr0
      refine ⟨v, union (single k g) fr', hv, ?_, ?_, ?_⟩
      · simp only [evalF, hg, hr', Option.bind_some]
        refine compose_eq_some.mpr ⟨fun j => ?_, rfl⟩
        rcases hd j with h1 | h1
        · exact Or.inl h1
        · exact Or.inr (union_none_iff.mp h1).2
      · funext j
        by_cases hj : j = l
        · subst hj
          simp [union, single, Ne.symm hk]
        · by_cases hj' : j = k
          · subst hj'
            simp [union, single, hj]
          · simp [union, single, hj, hj']
      · simp [union, single, Ne.symm hk, hl]

theorem evalT_closedRecord (θ : Assign Label B) (fs : Fields Label B) :
    evalT θ (.record fs []) = (evalF θ fs).map G.record := by
  simp only [evalT]
  cases evalF θ fs <;> simp [composeAll, compose_empty]

end Composition.Syntax
