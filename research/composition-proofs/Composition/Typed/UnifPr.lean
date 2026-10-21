/-
Projection onto a set of cells (for `CellIndependence`): `pr L` keeps
written labels and the cell labels in `L`, at every depth, and drops
other cell labels. It commutes with substitution and keeps the
non-cell constants of a cell-shaped value; a cell constant survives
only if its cell is kept.
-/
import Composition.Typed.UnifFin

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type}

mutual
  def pr (L : List Cell) : CG Label B → CG Label B
    | .base b => .base b
    | .arrow a b => .arrow (pr L a) (pr L b)
    | .record f => .record fun j => match j with
      | .inl l => prO L (f (.inl l))
      | .inr S => if S ∈ L then prO L (f (.inr S)) else none

  def prO (L : List Cell) : Option (CG Label B) → Option (CG Label B)
    | none => none
    | some g => some (pr L g)
end

def prRow (L : List Cell) (f : Row (CL Label) (CG Label B)) :
    Row (CL Label) (CG Label B)
  | .inl l => prO L (f (.inl l))
  | .inr S => if S ∈ L then prO L (f (.inr S)) else none

theorem pr_record (L : List Cell) (f : Row (CL Label) (CG Label B)) :
    pr L (.record f) = .record (prRow L f) := by
  simp only [pr]
  congr 1

theorem prO_none_iff {L : List Cell} {o : Option (CG Label B)} :
    prO L o = none ↔ o = none := by
  cases o <;> simp [prO]

mutual
  theorem pr_subst (L : List Cell) (σ : CSubst Label B) : ∀ g : CG Label B,
      pr L (substG σ g) = substG (fun c => pr L (σ c)) (pr L g)
    | .base (.inl _) => rfl
    | .base (.inr _) => rfl
    | .arrow a b => by
      simp only [substG, pr, pr_subst L σ a, pr_subst L σ b]
    | .record f => by
      rw [substG_record, pr_record, pr_record, substG_record]
      congr 1
      funext j
      cases j with
      | inl l => exact prO_subst L σ (f (.inl l))
      | inr S =>
        simp only [prRow]
        split
        · exact prO_subst L σ (f (.inr S))
        · rfl

  theorem prO_subst (L : List Cell) (σ : CSubst Label B) :
      ∀ o : Option (CG Label B),
        prO L (substO σ o) = substO (fun c => pr L (σ c)) (prO L o)
    | none => rfl
    | some g => by simp only [substO, prO, pr_subst L σ g]
end

mutual
  theorem occ_of_pr {L : List Cell} {c : CConst Label} :
      ∀ g : CG Label B, Occ c (pr L g) → Occ c g
    | .base _, h => h
    | .arrow a b, h => by
      rcases h with h | h
      · exact Or.inl (occ_of_pr a h)
      · exact Or.inr (occ_of_pr b h)
    | .record f, h => by
      rw [pr_record] at h
      obtain ⟨j, hj⟩ := h
      cases j with
      | inl l => exact ⟨_, occO_of_prO (f (.inl l)) hj⟩
      | inr S =>
        simp only [prRow] at hj
        split at hj
        · exact ⟨_, occO_of_prO (f (.inr S)) hj⟩
        · exact hj.elim

  theorem occO_of_prO {L : List Cell} {c : CConst Label} :
      ∀ o : Option (CG Label B), OccO c (prO L o) → OccO c o
    | none, h => h
    | some g, h => occ_of_pr g h
end

variable {P : SigProblem Label B} {C : List Cell}

mutual
  /-- Projection keeps non-cell constants of a cell-shaped value. -/
  theorem occ_pr_nonX {L : List Cell} {c : CConst Label} (hc : NonX c) :
      ∀ g : CG Label B, CS P C g → Occ c g → Occ c (pr L g)
    | .base _, _, h => h
    | .arrow a b, hg, h => by
      rcases h with h | h
      · exact Or.inl (occ_pr_nonX hc a hg.1 h)
      · exact Or.inr (occ_pr_nonX hc b hg.2 h)
    | .record f, hg, h => by
      have hf := (cs_record f).mp hg
      rw [pr_record]
      obtain ⟨j, hj⟩ := h
      cases j with
      | inl l => exact ⟨.inl l, occO_pr_nonX hc (f (.inl l)) (hf.2.1 l) hj⟩
      | inr S =>
        rcases hf.2.2 S with h0 | ⟨_, r, _, h1⟩
        · rw [h0] at hj; exact hj.elim
        · rw [h1] at hj
          simp only [OccO, Occ] at hj
          subst hj
          exact hc.elim

  theorem occO_pr_nonX {L : List Cell} {c : CConst Label} (hc : NonX c) :
      ∀ o : Option (CG Label B), CSO P C o → OccO c o → OccO c (prO L o)
    | none, _, h => h
    | some g, hg, h => occ_pr_nonX hc g hg h
end

mutual
  /-- A cell constant survives projection only with its cell. -/
  theorem occ_pr_X {L : List Cell} {r : Nat} {S : Cell} :
      ∀ g : CG Label B, CS P C g → Occ (.X r S) (pr L g) → S ∈ L
    | .base (.inl _), _, h => h.elim
    | .base (.inr c), hg, h => by
      simp only [pr, Occ] at h
      subst h
      exact hg.elim
    | .arrow a b, hg, h => by
      rcases h with h | h
      · exact occ_pr_X a hg.1 h
      · exact occ_pr_X b hg.2 h
    | .record f, hg, h => by
      have hf := (cs_record f).mp hg
      rw [pr_record] at h
      obtain ⟨j, hj⟩ := h
      cases j with
      | inl l => exact occO_pr_X (f (.inl l)) (hf.2.1 l) hj
      | inr S' =>
        simp only [prRow] at hj
        split at hj
        · next hS =>
          rcases hf.2.2 S' with h0 | ⟨_, r', _, h1⟩
          · rw [h0] at hj; exact hj.elim
          · rw [h1] at hj
            simp only [prO, pr, OccO, Occ, CConst.X.injEq] at hj
            exact hj.2 ▸ hS
        · exact hj.elim

  theorem occO_pr_X {L : List Cell} {r : Nat} {S : Cell} :
      ∀ o : Option (CG Label B), CSO P C o → OccO (.X r S) (prO L o) → S ∈ L
    | none, _, h => h.elim
    | some g, hg, h => occ_pr_X g hg h
end

theorem pr_eq_cv {L : List Cell} {u : CG Label B} {x : CConst Label}
    (h : pr L u = cv x) : u = cv x := by
  cases u with
  | base b => simpa [pr] using h
  | arrow a b => simp [pr] at h
  | record f => rw [pr_record] at h; cases h

end Composition.Typed
