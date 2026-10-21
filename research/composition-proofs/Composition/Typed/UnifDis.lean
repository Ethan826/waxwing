/-
The disagreement step, proved by recursion on the left value: two
different cell-shaped values clash, or give a `Bind1` or `Bind2` at
their first difference (UnifDisDefs.lean).
-/
import Composition.Typed.UnifDisDefs

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {C : List Cell}

theorem clash0 {s t : CG Label B}
    (h : ∀ τ : CSubst Label B, substG τ (pr [] s) ≠ substG τ (pr [] t)) :
    DisOut P C s t := Or.inl ⟨[], nil_mem_Ls C, h⟩

theorem samePos_arrowL (a b a' b' : CG Label B) :
    SamePos P (.arrow a b) (.arrow a' b') a a' where
  occ _ := ⟨Or.inl, Or.inl⟩
  fin := ⟨And.left, And.left⟩
  unif _ he := by simp only [substG, G.arrow.injEq] at he; exact he.1
  proj _ _ he := by simp only [pr, substG, G.arrow.injEq] at he; exact he.1
  hv _ _ he := by simp only [hv, G.arrow.injEq] at he; exact he.1

theorem samePos_arrowR (a b a' b' : CG Label B) :
    SamePos P (.arrow a b) (.arrow a' b') b b' where
  occ _ := ⟨Or.inr, Or.inr⟩
  fin := ⟨And.right, And.right⟩
  unif _ he := by simp only [substG, G.arrow.injEq] at he; exact he.2
  proj _ _ he := by simp only [pr, substG, G.arrow.injEq] at he; exact he.2
  hv _ _ he := by simp only [hv, G.arrow.injEq] at he; exact he.2

theorem samePos_field {f g : Row (CL Label) (CG Label B)} {l : Label}
    {a a' : CG Label B} (hl : l ∈ written P) (hf : f (.inl l) = some a)
    (hg : g (.inl l) = some a') :
    SamePos P (.record f) (.record g) a a' where
  occ _ := ⟨fun h => ⟨.inl l, by rw [hf]; exact h⟩,
    fun h => ⟨.inl l, by rw [hg]; exact h⟩⟩
  fin := ⟨fun h => by have := ((finG_record f).mp h).2 (.inl l)
                      rw [hf] at this; exact this,
    fun h => by have := ((finG_record g).mp h).2 (.inl l)
                rw [hg] at this; exact this⟩
  unif τ he := by
    rw [substG_record, substG_record] at he
    have := congrFun (G.record.inj he) (.inl l)
    simpa [hf, hg, substO] using this
  proj L τ he := by
    rw [pr_record, pr_record, substG_record, substG_record] at he
    have := congrFun (G.record.inj he) (.inl l)
    simpa [prRow, hf, hg, prO, substO] using this
  hv θ ν he := by
    rw [hv_record, hv_record] at he
    have := congrFun (G.record.inj he) l
    simpa [hvRow, hl, hf, hg, hvO] using this

theorem dis_cell {f g : Row (CL Label) (CG Label B)} {S : Cell}
    (hf : CSRow P C f) (hg : CSRow P C g) (hne : f (.inr S) ≠ g (.inr S)) :
    DisOut P C (.record f) (.record g) := by
  have key : ∀ (L : List Cell), S ∈ L → ∀ τ : CSubst Label B,
      substG τ (pr L (.record f)) = substG τ (pr L (.record g)) →
        substO τ (prO L (f (.inr S))) = substO τ (prO L (g (.inr S))) := by
    intro L hS τ he
    rw [pr_record, pr_record, substG_record, substG_record] at he
    have := congrFun (G.record.inj he) (.inr S)
    simpa only [prRow, hS, ↓reduceIte] using this
  rcases hf.2.2 S with h0 | ⟨hS, r, hr, h1⟩ <;>
    rcases hg.2.2 S with h0' | ⟨hS', r', hr', h1'⟩
  · exact absurd (h0.trans h0'.symm) hne
  · refine Or.inl ⟨[S], single_mem_Ls hS', fun τ he => ?_⟩
    have := key [S] (by simp) τ he
    simp [h0, h1', substO, prO] at this
  · refine Or.inl ⟨[S], single_mem_Ls hS, fun τ he => ?_⟩
    have := key [S] (by simp) τ he
    simp [h0', h1, substO, prO] at this
  · have hrr : r ≠ r' := fun h => hne (by rw [h1, h1', h])
    refine Or.inr (Or.inr ⟨r, r', S, hrr, hS, hr',
      Or.inl ⟨.inr S, by simp [h1, OccO, Occ]⟩,
      Or.inr ⟨.inr S, by simp [h1', OccO, Occ]⟩, fun τ he => ?_,
      fun τ he => ?_, fun θ ν he k hk hc => ?_⟩)
    · rw [substG_record, substG_record] at he
      have := congrFun (G.record.inj he) (.inr S)
      simpa [h1, h1', substO, substG] using this
    · have := key [S] (by simp) τ he
      simpa [h1, h1', substO, substG, prO, pr] using this
    · rw [hv_record, hv_record] at he
      have := congrFun (G.record.inj he) k
      have hS0 : S ≠ [] := List.ne_nil_of_mem hr
      simpa [hvRow, hk, hS0, hc, h1, h1', hvO, hv] using this

mutual
  theorem dis : ∀ (s t : CG Label B), CS P C s → CS P C t → s ≠ t →
      DisOut P C s t
    | .base (.inr x), t, hs, ht, hne => dis_var hs ht hne
    | s, .base (.inr y), hs, ht, hne =>
      dis_symm (dis_var ht hs fun h => hne h.symm)
    | .base (.inl b), .base (.inl b'), _, _, hne =>
      clash0 fun τ h => hne (by simpa [pr, substG] using h)
    | .base (.inl _), .arrow _ _, _, _, _ =>
      clash0 fun τ h => by simp [pr, substG] at h
    | .base (.inl _), .record _, _, _, _ =>
      clash0 fun τ h => by simp [pr, substG] at h
    | .arrow _ _, .base (.inl _), _, _, _ =>
      clash0 fun τ h => by simp [pr, substG] at h
    | .arrow _ _, .record _, _, _, _ =>
      clash0 fun τ h => by simp [pr, substG] at h
    | .record _, .base (.inl _), _, _, _ =>
      clash0 fun τ h => by simp [pr, substG] at h
    | .record _, .arrow _ _, _, _, _ =>
      clash0 fun τ h => by simp [pr, substG] at h
    | .arrow a b, .arrow a' b', hs, ht, hne => by
      by_cases ha : a = a'
      · subst ha
        have hb : b ≠ b' := fun h => hne (by rw [h])
        exact dis_lift (samePos_arrowR a b a b') (dis b b' hs.2 ht.2 hb)
      · exact dis_lift (samePos_arrowL a b a' b') (dis a a' hs.1 ht.1 ha)
    | .record f, .record g, hs, ht, hne => by
      have hf := (cs_record f).mp hs
      have hg := (cs_record g).mp ht
      have : ∃ j, f j ≠ g j := Classical.byContradiction fun h =>
        hne (congrArg G.record (funext fun j =>
          Classical.byContradiction fun h' => h ⟨j, h'⟩))
      obtain ⟨j, hj⟩ := this
      cases j with
      | inr S => exact dis_cell hf hg hj
      | inl l => exact dis_field hf hg hj (f (.inl l)) rfl

  theorem dis_field {f g : Row (CL Label) (CG Label B)} {l : Label}
      (hf : CSRow P C f) (hg : CSRow P C g) (hj : f (.inl l) ≠ g (.inl l)) :
      ∀ o, f (.inl l) = o → DisOut P C (.record f) (.record g)
    | none, ho => by
      cases hg' : g (.inl l) with
      | none => exact absurd (ho.trans hg'.symm) hj
      | some a' =>
        refine clash0 fun τ he => ?_
        rw [pr_record, pr_record, substG_record, substG_record] at he
        have := congrFun (G.record.inj he) (.inl l)
        simp [prRow, ho, hg', prO, substO] at this
    | some a, ho => by
      cases hg' : g (.inl l) with
      | none =>
        refine clash0 fun τ he => ?_
        rw [pr_record, pr_record, substG_record, substG_record] at he
        have := congrFun (G.record.inj he) (.inl l)
        simp [prRow, ho, hg', prO, substO] at this
      | some a' =>
        have hl : l ∈ written P := hf.1 l (by rw [ho]; simp)
        have ha : CS P C a := by have := hf.2.1 l; rw [ho] at this; exact this
        have ha' : CS P C a' := by
          have := hg.2.1 l; rw [hg'] at this; exact this
        have hne : a ≠ a' := fun h => hj (by rw [ho, hg', h])
        exact dis_lift (samePos_field hl ho hg') (dis a a' ha ha' hne)
end

end Composition.Typed
