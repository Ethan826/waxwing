/-
The closed-problem unifier (dossier §11): Robinson's unification with
occurs check, in Martelli and Montanari's transformation form, on lists
of equations; records are decomposed one field at a time. Computable.
Termination: the lexicographic measure of Measure.lean, each recursive
call proved to lower it.
-/
import Composition.Unify.Elim

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
theorem removeField_size :
    ∀ {fs : Fields Label B} {l : Label} {u : TExpr Label B}
      {rest : Fields Label B}, removeField l fs = some (u, rest) →
        sizeF fs = 1 + sizeT u + sizeF rest
  | .nil, _, _, _, h => by simp [removeField] at h
  | .cons k t r, l, u, rest, h => by
    by_cases hk : k = l
    · simp only [removeField, hk, ite_true, Option.some.injEq,
        Prod.mk.injEq] at h
      obtain ⟨rfl, rfl⟩ := h
      simp [sizeF]
    · simp only [removeField, hk, ite_false, Option.map_eq_some_iff] at h
      obtain ⟨⟨u', r'⟩, hr, he⟩ := h
      simp only [Prod.mk.injEq] at he
      obtain ⟨rfl, rfl⟩ := he
      have := removeField_size hr
      simp only [sizeF]
      omega

omit [DecidableEq B] in
theorem removeField_vars :
    ∀ {fs : Fields Label B} {l : Label} {u : TExpr Label B}
      {rest : Fields Label B} {n : Nat}, removeField l fs = some (u, rest) →
        (n ∈ tyVarsT u ∨ n ∈ tyVarsF rest) → n ∈ tyVarsF fs
  | .nil, _, _, _, _, h, _ => by simp [removeField] at h
  | .cons k t r, l, u, rest, n, h, hn => by
    by_cases hk : k = l
    · simp only [removeField, hk, ite_true, Option.some.injEq,
        Prod.mk.injEq] at h
      obtain ⟨rfl, rfl⟩ := h
      simpa [tyVarsF] using hn
    · simp only [removeField, hk, ite_false, Option.map_eq_some_iff] at h
      obtain ⟨⟨u', r'⟩, hr, he⟩ := h
      simp only [Prod.mk.injEq] at he
      obtain ⟨rfl, rfl⟩ := he
      simp only [tyVarsF, List.mem_append] at hn ⊢
      rcases hn with hn | hn | hn
      · exact Or.inr (removeField_vars hr (Or.inl hn))
      · exact Or.inl hn
      · exact Or.inr (removeField_vars hr (Or.inr hn))

/-- The measure, as a pair ordered lexicographically. -/
def measure (E : Problem Label B) : Nat × Nat := (nvars E, sizeE E)

theorem lex_lt {a a' b b' : Nat} (h1 : a' ≤ a) (h2 : b' < b) :
    Prod.Lex (· < ·) (· < ·) (a', b') (a, b) := by
  rcases Nat.lt_or_eq_of_le h1 with h | h
  · exact .left _ _ h
  · subst h
    exact .right _ h2

omit [DecidableEq Label] [DecidableEq B] in
theorem tyVarsOf_append (E F : Problem Label B) :
    tyVarsOf (E ++ F) = tyVarsOf E ++ tyVarsOf F := by
  simp [tyVarsOf_eq]

omit [DecidableEq B] in
theorem tyVarsOf_substAtom_other {x : Nat} {t : TExpr Label B}
    (a : Atom Label B) (ha : ∀ p q, a ≠ .eq p q) :
    tyVarsOf (substAtom (elimSubst x t) a) = [] := by
  cases a with
  | eq p q => exact absurd rfl (ha p q)
  | lacks r l =>
    simp [substAtom, rowOf, elimSubst, tyVarsOf_eq, Fields.labels,
      atomTyVars]
  | disjoint r s =>
    simp [substAtom, rowOf, elimSubst, tyVarsOf_eq, Fields.labels,
      atomTyVars]
  | ff => simp [substAtom, tyVarsOf_eq, atomTyVars]

omit [DecidableEq B] in
/-- The variables after eliminating `x`, for any problem. -/
theorem tyVarsOf_elim_gen {x n : Nat} {t : TExpr Label B} :
    ∀ {E : Problem Label B},
      n ∈ tyVarsOf (substProblem (elimSubst x t) E) →
        (n ∈ tyVarsOf E ∧ n ≠ x) ∨ n ∈ tyVarsT t
  | [], h => by simp [substProblem, tyVarsOf] at h
  | a :: rest, h => by
    have hsplit : substProblem (elimSubst x t) (a :: rest) =
        substAtom (elimSubst x t) a ++ substProblem (elimSubst x t) rest := by
      simp [substProblem]
    rw [hsplit, tyVarsOf_append] at h
    have hrest : ∀ m ∈ tyVarsOf rest, m ∈ tyVarsOf (a :: rest) := by
      intro m hm
      rw [tyVarsOf_eq] at hm ⊢
      simp only [List.flatMap_cons, List.mem_append]
      exact Or.inr hm
    cases a with
    | eq p q =>
      simp only [substAtom, List.mem_append] at h
      rw [tyVarsOf_cons]
      simp only [List.mem_append]
      rcases h with h | h
      · simp only [tyVarsOf_eq, List.flatMap_cons, List.flatMap_nil,
          List.append_nil, atomTyVars, List.mem_append] at h
        rcases h with h | h
        · rcases substT_elim_vars p h with ⟨h1, h2⟩ | h
          · exact Or.inl ⟨Or.inl (Or.inl h1), h2⟩
          · exact Or.inr h
        · rcases substT_elim_vars q h with ⟨h1, h2⟩ | h
          · exact Or.inl ⟨Or.inl (Or.inr h1), h2⟩
          · exact Or.inr h
      · rcases tyVarsOf_elim_gen h with ⟨h1, h2⟩ | h
        · exact Or.inl ⟨Or.inr h1, h2⟩
        · exact Or.inr h
    | lacks r l | disjoint r l | ff =>
      simp only [List.mem_append] at h
      rcases h with h | h
      · rw [tyVarsOf_substAtom_other _ (by intro p q hc; cases hc)] at h
        cases h
      · rcases tyVarsOf_elim_gen h with ⟨h1, h2⟩ | h
        · exact Or.inl ⟨hrest n h1, h2⟩
        · exact Or.inr h

omit [DecidableEq B] in
theorem dec_elim {x : Nat} {t : TExpr Label B} {E rest : Problem Label B}
    (hE : ∀ n ∈ tyVarsOf rest, n ∈ tyVarsOf E)
    (ht : ∀ n ∈ tyVarsT t, n ∈ tyVarsOf E) (hx : x ∈ tyVarsOf E)
    (hxt : x ∉ tyVarsT t) :
    Prod.Lex (· < ·) (· < ·)
      (measure (substProblem (elimSubst x t) rest)) (measure E) := by
  refine .left _ _ (nvars_lt (x := x) (fun n hn => ?_) hx fun hn => ?_)
  · rcases tyVarsOf_elim_gen hn with ⟨h1, _⟩ | h
    · exact hE n h1
    · exact ht n h
  · rcases tyVarsOf_elim_gen hn with ⟨_, h2⟩ | h
    · exact h2 rfl
    · exact hxt h

omit [DecidableEq Label] [DecidableEq B] in
theorem dec_le {E E' : Problem Label B}
    (hv : ∀ n ∈ tyVarsOf E', n ∈ tyVarsOf E) (hs : sizeE E' < sizeE E) :
    Prod.Lex (· < ·) (· < ·) (measure E') (measure E) :=
  lex_lt (nvars_le hv) hs

omit [DecidableEq Label] [DecidableEq B] in
theorem mem_tyVarsOf_cons {a b : TExpr Label B} {rest : Problem Label B}
    {n : Nat} :
    n ∈ tyVarsOf (.eq a b :: rest) ↔
      n ∈ tyVarsT a ∨ n ∈ tyVarsT b ∨ n ∈ tyVarsOf rest := by
  rw [tyVarsOf_cons]
  simp

/-- The closed-problem unifier. -/
def unify : Problem Label B → Bool
  | [] => true
  | .eq (.tvar x) (.tvar y) :: rest =>
    if x = y then unify rest
    else unify (substProblem (elimSubst x (.tvar y)) rest)
  | .eq (.tvar x) t :: rest =>
    if x ∈ tyVarsT t then false
    else unify (substProblem (elimSubst x t) rest)
  | .eq t (.tvar x) :: rest =>
    if x ∈ tyVarsT t then false
    else unify (substProblem (elimSubst x t) rest)
  | .eq (.base b) (.base b') :: rest => if b = b' then unify rest else false
  | .eq (.arrow a c) (.arrow a' c') :: rest =>
    unify (.eq a a' :: .eq c c' :: rest)
  | .eq (.record .nil []) (.record .nil []) :: rest => unify rest
  | .eq (.record (.cons l t r) []) (.record fs' []) :: rest =>
    match _hr : removeField l fs' with
    | none => false
    | some (u, rest') =>
      unify (.eq t u :: .eq (.record r []) (.record rest' []) :: rest)
  | _ => false
termination_by E => measure E
decreasing_by
  · apply dec_le (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inr hn)))
    simp only [sizeE, sizeT]
    omega
  · rename_i h
    exact dec_elim (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inr hn)))
      (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inl hn)))
      (mem_tyVarsOf_cons.mpr (Or.inl (by simp [tyVarsT])))
      (by simpa [tyVarsT] using h)
  · rename_i h
    exact dec_elim (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inr hn)))
      (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inl hn)))
      (mem_tyVarsOf_cons.mpr (Or.inl (by simp [tyVarsT]))) h
  · rename_i h
    exact dec_elim (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inr hn)))
      (fun n hn => mem_tyVarsOf_cons.mpr (Or.inl hn))
      (mem_tyVarsOf_cons.mpr (Or.inr (Or.inl (by simp [tyVarsT])))) h
  · apply dec_le (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inr hn)))
    simp only [sizeE, sizeT]
    omega
  · apply dec_le
    · intro n hn
      simp only [mem_tyVarsOf_cons, tyVarsT, List.mem_append] at hn ⊢
      rcases hn with h | h | h | h | h <;> simp [h]
    · simp only [sizeE, sizeT]
      omega
  · apply dec_le (fun n hn => mem_tyVarsOf_cons.mpr (Or.inr (Or.inr hn)))
    simp only [sizeE, sizeT, sizeF]
    omega
  · apply dec_le
    · intro n hn
      simp only [mem_tyVarsOf_cons, tyVarsT, tyVarsF, List.mem_append]
        at hn ⊢
      rcases hn with h | h | h | h | h
      · simp [h]
      · exact Or.inr (Or.inl (removeField_vars _hr (Or.inl h)))
      · simp [h]
      · exact Or.inr (Or.inl (removeField_vars _hr (Or.inr h)))
      · simp [h]
    · have := removeField_size _hr
      simp only [sizeE, sizeT, sizeF]
      omega

end Composition.Syntax
