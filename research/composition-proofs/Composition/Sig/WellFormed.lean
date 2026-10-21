/-
Well-formedness decided on denotations (dossier §15.2) and K2's second
half: `wfS` checks W3 at every depth, reading each record at the first
occurrence of each label; `declaredS` decides `Declared` over `D`'s
atoms.
-/
import Composition.Sig.Check

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem lookup_cons {α : Type} {k k' : GL Label} {a : α}
    {rest : List (GL Label × α)} :
    ((k, a) :: rest).lookup k' = if k' = k then some a else rest.lookup k' := by
  by_cases h : k' = k
  · subst h; simp [List.lookup]
  · have hb : (k' == k) = false := by simp [h]
    simp [List.lookup, h, hb]

theorem lookup_isSome_iff {α : Type} {k : GL Label} :
    ∀ {xs : List (GL Label × α)}, (xs.lookup k).isSome ↔ k ∈ xs.map Prod.fst
  | [] => by simp [List.lookup]
  | (k', a) :: rest => by
    rw [lookup_cons]
    by_cases h : k = k' <;> simp [h, lookup_isSome_iff]

/-- `D` declares `r` and `s` disjoint, decided over `D`'s atoms. -/
def declaredS (P : SigProblem Label B) (r s : Nat) : Bool :=
  P.D.any fun
    | .disjoint x y => (x == r && y == s) || (x == s && y == r)
    | _ => false

omit [DecidableEq Label] in
theorem declaredS_iff {P : SigProblem Label B} {r s : Nat} :
    declaredS P r s = true ↔ Declared P r s := by
  simp only [declaredS, List.any_eq_true, Declared]
  constructor
  · rintro ⟨a, ha, h⟩
    cases a with
    | disjoint x y =>
      simp only [Bool.or_eq_true, Bool.and_eq_true, beq_iff_eq] at h
      rcases h with ⟨rfl, rfl⟩ | ⟨rfl, rfl⟩
      · exact Or.inl ha
      · exact Or.inr ha
    | _ => simp at h
  · rintro (h | h)
    · exact ⟨_, h, by simp⟩
    · exact ⟨_, h, by simp⟩

/-- Rests of two different rigid rows in `xs` are declared disjoint. -/
def restsOkS (P : SigProblem Label B) (xs ys : List (GL Label × SG Label B)) :
    Bool :=
  P.rigidRow.all fun r => P.rigidRow.all fun s =>
    decide (r = s) || !(decide (.inr r ∈ keys xs) && decide (.inr s ∈ keys ys))
      || declaredS P r s

theorem restsOkS_iff {P : SigProblem Label B}
    {xs ys : List (GL Label × SG Label B)} :
    restsOkS P xs ys = true ↔ ∀ r ∈ P.rigidRow, ∀ s ∈ P.rigidRow, r ≠ s →
      denRow xs (.inr r) ≠ none → denRow ys (.inr s) ≠ none →
        Declared P r s := by
  simp only [restsOkS, List.all_eq_true, Bool.or_eq_true, decide_eq_true_eq,
    Bool.not_eq_true', Bool.and_eq_false_iff, decide_eq_false_iff_not,
    declaredS_iff, Ne, denRow_none_iff, Classical.not_not]
  constructor
  · intro h r hr s hs hne h1 h2
    rcases h r hr s hs with (h' | h' | h') | h'
    · exact absurd h' hne
    · exact absurd h1 h'
    · exact absurd h2 h'
    · exact h'
  · intro h r hr s hs
    by_cases hne : r = s
    · exact Or.inl (Or.inl hne)
    by_cases h1 : (.inr r : GL Label) ∈ keys xs
    · by_cases h2 : (.inr s : GL Label) ∈ keys ys
      · exact Or.inr (h r hr s hs hne h1 h2)
      · exact Or.inl (Or.inr (Or.inr h2))
    · exact Or.inl (Or.inr (Or.inl h1))

mutual
  /-- W3 at every depth, on first occurrences. -/
  def wfS (P : SigProblem Label B) : SG Label B → Bool
    | .base _ => true
    | .arrow a c => wfS P a && wfS P c
    | .record xs => restsOkS P xs xs && wfFirst P xs []

  def wfFirst (P : SigProblem Label B) :
      List (GL Label × SG Label B) → List (GL Label) → Bool
    | [], _ => true
    | (k, a) :: rest, seen =>
      (decide (k ∈ seen) || wfS P a) && wfFirst P rest (k :: seen)
end

mutual
    /-- K2, well-formedness. -/
  theorem wfS_iff (P : SigProblem Label B) :
      ∀ s : SG Label B, wfS P s = true ↔ WFG P (den s)
    | .base _ => by simp [wfS, den, WFG]
    | .arrow a c => by simp [wfS, den, WFG, wfS_iff P a, wfS_iff P c]
    | .record xs => by
      simp only [wfS, Bool.and_eq_true, den, WFG, restsOkS_iff,
        wfFirst_iff P xs []]
      refine and_congr Iff.rfl ⟨fun h k => ?_, fun h k _ a ha => ?_⟩
      · rw [denRow_eq_lookup]
        cases hx : xs.lookup k with
        | none => simp [WFO]
        | some a => simpa [WFO] using h k (by simp) a hx
      · have := h k
        rw [denRow_eq_lookup, ha] at this
        simpa [WFO] using this

    theorem wfFirst_iff (P : SigProblem Label B) :
      ∀ (xs : List (GL Label × SG Label B)) (seen : List (GL Label)),
        wfFirst P xs seen = true ↔
          ∀ k, k ∉ seen → ∀ a, xs.lookup k = some a → WFG P (den a)
    | [], _ => by simp [wfFirst, List.lookup]
    | (k, a) :: rest, seen => by
      simp only [wfFirst, Bool.and_eq_true, Bool.or_eq_true,
        decide_eq_true_eq, wfFirst_iff P rest (k :: seen), wfS_iff P a]
      constructor
      · rintro ⟨hk, hr⟩ k' hs a' ha'
        rw [lookup_cons] at ha'
        by_cases h : k' = k
        · subst h
          simp only [↓reduceIte, Option.some.injEq] at ha'
          subst ha'
          exact hk.resolve_left hs
        · simp only [h, ↓reduceIte] at ha'
          exact hr k' (by simp [h, hs]) a' ha'
      · intro h
        refine ⟨?_, fun k' hs a' ha' => ?_⟩
        · by_cases hs : k ∈ seen
          · exact Or.inl hs
          · exact Or.inr (h k hs a (by simp))
        · simp only [List.mem_cons, not_or] at hs
          exact h k' hs.2 a' (by rw [lookup_cons]; simp [hs.1, ha'])
end

end Composition.Syntax
