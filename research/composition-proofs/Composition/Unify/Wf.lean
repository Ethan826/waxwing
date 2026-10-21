/-
Well-formed closed expressions (every record has no tails and no
repeated label) are always defined; a closed expression that is not
well formed is never defined. Computable checks, for the decider.
-/
import Composition.Unify.Occurs

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- No label repeats. -/
def noDupB : List Label → Bool
  | [] => true
  | x :: xs => !(decide (x ∈ xs)) && noDupB xs

theorem noDupB_iff : ∀ xs : List Label, noDupB xs = true ↔ xs.Nodup
  | [] => by simp [noDupB]
  | x :: xs => by simp [noDupB, noDupB_iff xs, List.nodup_cons]

mutual
  def wfT : TExpr Label B → Bool
    | .base _ => true
    | .arrow t u => wfT t && wfT u
    | .tvar _ => true
    | .record fs tails => tails.isEmpty && noDupB fs.labels && wfF fs

  def wfF : Fields Label B → Bool
    | .nil => true
    | .cons _ t rest => wfT t && wfF rest
end

/-- The domain of written fields is their labels. -/
theorem evalF_dom {θ : Assign Label B} :
    ∀ (fs : Fields Label B) {fr : Row Label (G Label B)},
      evalF θ fs = some fr → ∀ l, (fr l ≠ none ↔ l ∈ fs.labels)
  | .nil, fr, h, l => by
    simp [evalF] at h
    subst h
    simp [Row.empty, Fields.labels]
  | .cons k t rest, fr, h, l => by
    simp only [evalF, Option.bind_eq_some_iff] at h
    obtain ⟨g, _, r, hr, hc⟩ := h
    obtain ⟨_, rfl⟩ := compose_eq_some.mp hc
    have ih := evalF_dom rest hr l
    by_cases hl : l = k
    · subst hl
      simp [union, single, Fields.labels]
    · simp only [union, single, hl, ite_false, Fields.labels,
        List.mem_cons, false_or]
      exact ih

theorem evalF_nodup {θ : Assign Label B} :
    ∀ (fs : Fields Label B) {fr : Row Label (G Label B)},
      evalF θ fs = some fr → fs.labels.Nodup
  | .nil, _, _ => List.nodup_nil
  | .cons k t rest, fr, h => by
    simp only [evalF, Option.bind_eq_some_iff] at h
    obtain ⟨g, _, r, hr, hc⟩ := h
    obtain ⟨hd, rfl⟩ := compose_eq_some.mp hc
    refine List.nodup_cons.mpr ⟨fun hk => ?_, evalF_nodup rest hr⟩
    have := (evalF_dom rest hr k).mpr hk
    rcases hd k with h1 | h1
    · simp [single] at h1
    · exact this h1

mutual
  /-- Well-formed expressions are defined. -/
  theorem wf_defined {θ : Assign Label B} :
      ∀ t : TExpr Label B, wfT t = true → ∃ g, evalT θ t = some g
    | .base b, _ => ⟨_, rfl⟩
    | .tvar n, _ => ⟨_, rfl⟩
    | .arrow t u, h => by
      simp only [wfT, Bool.and_eq_true] at h
      obtain ⟨g1, h1⟩ := wf_defined (θ := θ) t h.1
      obtain ⟨g2, h2⟩ := wf_defined (θ := θ) u h.2
      exact ⟨.arrow g1 g2, by simp [evalT, h1, h2]⟩
    | .record fs tails, h => by
      simp only [wfT, Bool.and_eq_true, List.isEmpty_iff] at h
      obtain ⟨⟨rfl, hn⟩, hf⟩ := h
      obtain ⟨fr, hfr⟩ := wfF_defined (θ := θ) fs hf ((noDupB_iff _).mp hn)
      exact ⟨.record fr, by
        simp [evalT, hfr, composeAll, compose_empty]⟩

  theorem wfF_defined {θ : Assign Label B} :
      ∀ fs : Fields Label B, wfF fs = true → fs.labels.Nodup →
        ∃ fr, evalF θ fs = some fr
    | .nil, _, _ => ⟨_, rfl⟩
    | .cons l t rest, h, hn => by
      simp only [wfF, Bool.and_eq_true] at h
      have hn' : (l :: rest.labels).Nodup := by simpa [Fields.labels] using hn
      have ⟨hl, hs⟩ := List.nodup_cons.mp hn'
      obtain ⟨g, hg⟩ := wf_defined (θ := θ) t h.1
      obtain ⟨fr, hfr⟩ := wfF_defined (θ := θ) rest h.2 hs
      refine ⟨union (single l g) fr, ?_⟩
      simp only [evalF, hg, hfr, Option.bind_some]
      refine compose_eq_some.mpr ⟨fun k => ?_, rfl⟩
      by_cases hk : k = l
      · subst hk
        right
        apply Classical.byContradiction
        intro hne
        exact hl ((evalF_dom rest hfr k).mp hne)
      · left
        simp [single, hk]
end

end Composition.Syntax
