/-
The unifier's termination measure, lexicographic: the number of
distinct type variables, then the total size. Variable elimination
lowers the first; every other step keeps the first from rising and
lowers the second. Also the elimination substitution `[x ↦ t]` and what
it does to variables and well-formedness.
-/
import Composition.Unify.Steps

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

mutual
  def sizeT : TExpr Label B → Nat
    | .base _ => 1
    | .tvar _ => 1
    | .arrow t u => 1 + sizeT t + sizeT u
    | .record fs _ => 1 + sizeF fs

  def sizeF : Fields Label B → Nat
    | .nil => 0
    | .cons _ t rest => 1 + sizeT t + sizeF rest
end

def sizeE : Problem Label B → Nat
  | [] => 0
  | .eq t u :: rest => sizeT t + sizeT u + sizeE rest
  | _ :: rest => sizeE rest

def nvars (E : Problem Label B) : Nat := (dedup (tyVarsOf E)).length

theorem nodup_length_le {α : Type} [DecidableEq α] :
    ∀ {l1 l2 : List α}, l1.Nodup → (∀ y ∈ l1, y ∈ l2) →
      l1.length ≤ l2.length
  | [], _, _, _ => Nat.zero_le _
  | a :: as, l2, hn, hs => by
    have ⟨ha, has⟩ := List.nodup_cons.mp hn
    have hsub : ∀ y ∈ as, y ∈ l2.erase a := fun y hy =>
      (List.mem_erase_of_ne (fun h => ha (by subst h; exact hy))).mpr
        (hs y (List.mem_cons_of_mem _ hy))
    have := nodup_length_le has hsub
    rw [List.length_erase_of_mem (hs a (by simp))] at this
    have : 0 < l2.length := List.length_pos_of_mem (hs a (by simp))
    simp only [List.length_cons]
    omega

omit [DecidableEq Label] in
theorem nvars_le {E E' : Problem Label B}
    (h : ∀ n ∈ tyVarsOf E', n ∈ tyVarsOf E) : nvars E' ≤ nvars E :=
  nodup_length_le (nodup_dedup _) fun y hy =>
    mem_dedup.mpr (h y (mem_dedup.mp hy))

omit [DecidableEq Label] in
theorem nvars_lt {E E' : Problem Label B} {x : Nat}
    (h : ∀ n ∈ tyVarsOf E', n ∈ tyVarsOf E) (hx : x ∈ tyVarsOf E)
    (hx' : x ∉ tyVarsOf E') : nvars E' < nvars E := by
  have hsub : ∀ y ∈ dedup (tyVarsOf E'), y ∈ (dedup (tyVarsOf E)).erase x :=
    fun y hy => by
      have hy' := mem_dedup.mp hy
      exact (List.mem_erase_of_ne (fun h => hx' (by subst h; exact hy'))).mpr
        (mem_dedup.mpr (h y hy'))
  have hle := nodup_length_le (nodup_dedup _) hsub
  rw [List.length_erase_of_mem (mem_dedup.mpr hx)] at hle
  have : 0 < (dedup (tyVarsOf E)).length :=
    List.length_pos_of_mem (mem_dedup.mpr hx)
  unfold nvars
  omega

/-- The substitution `[x ↦ t]`. -/
def elimSubst (x : Nat) (t : TExpr Label B) : Subst Label B :=
  ⟨[(x, t)], []⟩

omit [DecidableEq Label] in
theorem expandTails_elim (x : Nat) (t : TExpr Label B) :
    ∀ tails : List Nat, expandTails (elimSubst x t) tails = (.nil, tails)
  | [] => rfl
  | r :: rs => by
    have ih := expandTails_elim x t rs
    simp only [elimSubst] at ih
    simp [expandTails, rowOf, elimSubst, ih, Fields.append]

omit [DecidableEq Label] in
theorem append_nil : ∀ fs : Fields Label B, fs.append .nil = fs
  | .nil => rfl
  | .cons l t r => by simp [Fields.append, append_nil r]

omit [DecidableEq Label] in
theorem labels_substF (σ : Subst Label B) :
    ∀ fs : Fields Label B, (substF σ fs).labels = fs.labels
  | .nil => rfl
  | .cons l t r => by simp [substF, Fields.labels, labels_substF σ r]

end Composition.Syntax
