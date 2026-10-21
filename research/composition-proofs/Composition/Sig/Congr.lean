/-
K7a (dossier §16): generic satisfaction depends only on the variables
an atom mentions. The hypotheses compare complete assigned values,
nested field types included, not merely which labels are present. D2
reads only the two rows of its `disjoint` atom; `P.rigidRow` and
`Declared` depend on the problem alone. Lifting a problem into the
generic model keeps its variables.
-/
import Composition.Sig.Patterns

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- K7a. -/
theorem holdsG_congr {P : SigProblem Label B}
    {Γ Γ' : Assign (GL Label) (GB Label B)} (a : Atom (GL Label) (GB Label B))
    (ht : ∀ n ∈ atomTyVars a, Γ.ty n = Γ'.ty n)
    (hr : ∀ r ∈ atomRowVars a, Γ.row r = Γ'.row r)
    (h : HoldsG P Γ a) : HoldsG P Γ' a := by
  cases a with
  | eq t u =>
    simp only [atomTyVars, atomRowVars, List.mem_append] at ht hr
    obtain ⟨g, h1, h2, hw⟩ := h
    refine ⟨g, ?_, ?_, hw⟩
    · rwa [← evalT_congr t (fun n h => ht n (Or.inl h))
        (fun r h => hr r (Or.inl h))]
    · rwa [← evalT_congr u (fun n h => ht n (Or.inr h))
        (fun r h => hr r (Or.inr h))]
  | lacks r l =>
    have e := hr r (by simp [atomRowVars])
    simp only [HoldsG, Holds] at h ⊢
    rwa [← e]
  | disjoint x y =>
    have e1 := hr x (by simp [atomRowVars])
    have e2 := hr y (by simp [atomRowVars])
    obtain ⟨h1, h2⟩ := h
    refine ⟨?_, ?_⟩
    · simp only [Holds] at h1 ⊢
      rwa [← e1, ← e2]
    · rw [← e1, ← e2]
      exact h2
  | ff => exact h

omit [DecidableEq Label] in
mutual
  theorem tyVarsT_liftT : ∀ t : TExpr Label B, tyVarsT (liftT t) = tyVarsT t
    | .base _ => rfl
    | .arrow t u => by simp [liftT, tyVarsT, tyVarsT_liftT t, tyVarsT_liftT u]
    | .tvar _ => rfl
    | .record fs _ => by simp [liftT, tyVarsT, tyVarsF_liftF fs]

  theorem tyVarsF_liftF : ∀ fs : Fields Label B, tyVarsF (liftF fs) = tyVarsF fs
    | .nil => rfl
    | .cons _ t rest => by
      simp [liftF, tyVarsF, tyVarsT_liftT t, tyVarsF_liftF rest]
end

omit [DecidableEq Label] in
mutual
  theorem rowVarsT_liftT : ∀ t : TExpr Label B, rowVarsT (liftT t) = rowVarsT t
    | .base _ => rfl
    | .arrow t u => by
      simp [liftT, rowVarsT, rowVarsT_liftT t, rowVarsT_liftT u]
    | .tvar _ => rfl
    | .record fs _ => by simp [liftT, rowVarsT, rowVarsF_liftF fs]

  theorem rowVarsF_liftF : ∀ fs : Fields Label B,
      rowVarsF (liftF fs) = rowVarsF fs
    | .nil => rfl
    | .cons _ t rest => by
      simp [liftF, rowVarsF, rowVarsT_liftT t, rowVarsF_liftF rest]
end

omit [DecidableEq Label] in
/-- Lifting keeps an atom's variables. -/
theorem atomVars_liftAtom (a : Atom Label B) :
    atomTyVars (liftAtom a) = atomTyVars a ∧
      atomRowVars (liftAtom a) = atomRowVars a := by
  cases a <;> simp [liftAtom, atomTyVars, atomRowVars, tyVarsT_liftT,
    rowVarsT_liftT]

end Composition.Syntax
