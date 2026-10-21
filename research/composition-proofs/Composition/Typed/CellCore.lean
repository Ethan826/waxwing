/-
Cell independence for pairs, the binding lemmas (construction.md §6,
steps 2-3). A binding of a non-cell constant holds in every projection;
a binding of a cell constant `X r S := X r' S` holds in the projection
onto `S` and leaves the others unchanged, since they never contain
`X r S`.
-/
import Composition.Typed.CellDef

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type}
variable {P : SigProblem Label B} {C : List Cell}

def prE (L : List Cell) (E : Pairs Label B) : Pairs Label B :=
  E.map fun p => (pr L p.1, pr L p.2)

theorem pr_bind_fix {L : List Cell} {τ : CSubst Label B} {x : CConst Label}
    {u : CG Label B} (h : τ x = substG τ (pr L u)) (g : CG Label B) :
    substG τ (pr L (substG (bind x u) g)) = substG τ (pr L g) := by
  rw [pr_subst, substG_comp]
  refine substG_congr _ fun c _ => ?_
  by_cases hc : c = x
  · subst hc; simp [bind, h]
  · simp [bind, hc, pr, substG]

theorem pr_bind_id {L : List Cell} {r : Nat} {S : Cell} {u : CG Label B}
    (hS : S ∉ L) {g : CG Label B} (hg : CS P C g) :
    pr L (substG (bind (.X r S) u) g) = pr L g := by
  rw [pr_subst]
  conv => rhs; rw [← substG_id (pr L g)]
  refine substG_congr _ fun c hc => ?_
  have : c ≠ .X r S := fun e => by subst e; exact hS (occ_pr_X g hg hc)
  simp [bind, this, pr]

theorem unifL_prE_bind {L : List Cell} {τ : CSubst Label B} {x : CConst Label}
    {u : CG Label B} {E : Pairs Label B} (h : τ x = substG τ (pr L u))
    (hE : UnifL τ (prE L E)) : UnifL τ (prE L (substE (bind x u) E)) := by
  intro p hp
  simp only [prE, substE, List.map_map, List.mem_map, Function.comp_def] at hp
  obtain ⟨q, hq, rfl⟩ := hp
  simp only [pr_bind_fix h]
  exact hE _ (List.mem_map_of_mem (f := fun p => (pr L p.1, pr L p.2)) hq)

theorem prE_bind_id {L : List Cell} {r : Nat} {S : Cell} {u : CG Label B}
    {E : Pairs Label B} (hS : S ∉ L) (hE : GoodE P C E) :
    prE L (substE (bind (.X r S) u) E) = prE L E := by
  simp only [prE, substE, List.map_map, Function.comp_def]
  refine List.map_congr_left fun q hq => ?_
  rw [pr_bind_id hS (hE q hq).1, pr_bind_id hS (hE q hq).2.1]

theorem mem_prE {L : List Cell} {E : Pairs Label B}
    {p : CG Label B × CG Label B} (hp : p ∈ E) :
    (pr L p.1, pr L p.2) ∈ prE L E :=
  List.mem_map_of_mem (f := fun p => (pr L p.1, pr L p.2)) hp

end Composition.Typed
