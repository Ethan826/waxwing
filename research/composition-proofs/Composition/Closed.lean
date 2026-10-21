/-
Two facts R2 needs. Congruence: a problem's truth depends only on the
variables it mentions. Closedness (R2′): a pattern's problem mentions no
row variable.
-/
import Composition.R1

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

def atomRowVars : Atom Label B → List Nat
  | .eq t u => rowVarsT t ++ rowVarsT u
  | .lacks r _ => [r]
  | .disjoint r s => [r, s]
  | .ff => []

def atomTyVars : Atom Label B → List Nat
  | .eq t u => tyVarsT t ++ tyVarsT u
  | _ => []

omit [DecidableEq Label] in
theorem rowVarsOf_eq (C : Problem Label B) :
    rowVarsOf C = C.flatMap atomRowVars := by
  unfold rowVarsOf
  congr 1

omit [DecidableEq Label] in
theorem tyVarsOf_eq (C : Problem Label B) :
    tyVarsOf C = C.flatMap atomTyVars := by
  unfold tyVarsOf
  congr 1

mutual
  theorem evalT_congr {θ θ' : Assign Label B} :
      ∀ t : TExpr Label B, (∀ n ∈ tyVarsT t, θ.ty n = θ'.ty n) →
        (∀ r ∈ rowVarsT t, θ.row r = θ'.row r) → evalT θ t = evalT θ' t
    | .base _, _, _ => rfl
    | .arrow t u, ht, hr => by
      simp only [evalT]
      rw [evalT_congr t (fun n h => ht n (by simp [tyVarsT, h]))
          (fun r h => hr r (by simp [rowVarsT, h])),
        evalT_congr u (fun n h => ht n (by simp [tyVarsT, h]))
          (fun r h => hr r (by simp [rowVarsT, h]))]
    | .tvar n, ht, _ => by simp [evalT, ht n (by simp [tyVarsT])]
    | .record fs tails, ht, hr => by
      rw [evalT_record, evalT_record,
        fieldRows_congr fs (fun n h => ht n (by simpa [tyVarsT] using h))
          (fun r h => hr r (by simp [rowVarsT, h])),
        List.map_congr_left (fun r h => hr r (by simp [rowVarsT, h]))]

  theorem fieldRows_congr {θ θ' : Assign Label B} :
      ∀ fs : Fields Label B, (∀ n ∈ tyVarsF fs, θ.ty n = θ'.ty n) →
        (∀ r ∈ rowVarsF fs, θ.row r = θ'.row r) →
          fieldRows θ fs = fieldRows θ' fs
    | .nil, _, _ => rfl
    | .cons l t rest, ht, hr => by
      simp only [fieldRows]
      rw [evalT_congr t (fun n h => ht n (by simp [tyVarsF, h]))
          (fun r h => hr r (by simp [rowVarsF, h])),
        fieldRows_congr rest (fun n h => ht n (by simp [tyVarsF, h]))
          (fun r h => hr r (by simp [rowVarsF, h]))]
end

theorem holds_congr {θ θ' : Assign Label B} (a : Atom Label B)
    (ht : ∀ n ∈ atomTyVars a, θ.ty n = θ'.ty n)
    (hr : ∀ r ∈ atomRowVars a, θ.row r = θ'.row r)
    (h : Holds θ a) : Holds θ' a := by
  cases a with
  | eq t u =>
    simp only [atomTyVars, atomRowVars, List.mem_append] at ht hr
    simp only [Holds] at h ⊢
    rwa [← evalT_congr t (fun n h => ht n (Or.inl h))
        (fun r h => hr r (Or.inl h)),
      ← evalT_congr u (fun n h => ht n (Or.inr h))
        (fun r h => hr r (Or.inr h))]
  | lacks r l =>
    have e := hr r (by simp [atomRowVars])
    simp only [Holds] at h ⊢
    rwa [← e]
  | disjoint r s =>
    have e1 := hr r (by simp [atomRowVars])
    have e2 := hr s (by simp [atomRowVars])
    simp only [Holds] at h ⊢
    rwa [← e1, ← e2]
  | ff => exact h

theorem sat_congr {θ θ' : Assign Label B} {C : Problem Label B}
    (ht : ∀ n ∈ tyVarsOf C, θ.ty n = θ'.ty n)
    (hr : ∀ r ∈ rowVarsOf C, θ.row r = θ'.row r) :
    Sat θ C ↔ Sat θ' C := by
  rw [tyVarsOf_eq] at ht
  rw [rowVarsOf_eq] at hr
  simp only [List.mem_flatMap] at ht hr
  constructor
  · intro h a ha
    exact holds_congr a (fun n hn => ht n ⟨a, ha, hn⟩)
      (fun r hn => hr r ⟨a, ha, hn⟩) (h a ha)
  · intro h a ha
    exact holds_congr a (fun n hn => (ht n ⟨a, ha, hn⟩).symm)
      (fun r hn => (hr r ⟨a, ha, hn⟩).symm) (h a ha)

end Composition.Syntax
