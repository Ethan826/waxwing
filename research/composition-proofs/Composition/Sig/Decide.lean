/-
Equality of denotations (dossier §15.2) and K2's first half. `eqS`
reads a record at the first occurrence of each label only (`seen` holds
the labels already read), so a shadowed entry never affects the answer.
-/
import Composition.Sig.WellFormed

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

mutual
  /-- Equality of denotations. -/
  def eqS : SG Label B → SG Label B → Bool
    | .base a, .base b => decide (a = b)
    | .arrow a c, .arrow a' c' => eqS a a' && eqS c c'
    | .record xs, .record ys =>
      eqFirst xs [] ys && (keys ys).all fun k => decide (k ∈ keys xs)
    | _, _ => false

  /-- Each first-occurrence entry of `xs` not in `seen` has an equal
  value in `ys`. -/
  def eqFirst : List (GL Label × SG Label B) → List (GL Label) →
      List (GL Label × SG Label B) → Bool
    | [], _, _ => true
    | (k, a) :: rest, seen, ys =>
      (decide (k ∈ seen) ||
        match ys.lookup k with
        | some b => eqS a b
        | none => false) && eqFirst rest (k :: seen) ys
end

mutual
  theorem eqS_iff : ∀ s t : SG Label B, eqS s t = true ↔ den s = den t
    | .base a, .base b => by simp [eqS, den]
    | .base _, .arrow _ _ => by simp [eqS, den]
    | .base _, .record _ => by simp [eqS, den]
    | .arrow _ _, .base _ => by simp [eqS, den]
    | .arrow a c, .arrow a' c' => by
      simp [eqS, den, eqS_iff a a', eqS_iff c c']
    | .arrow _ _, .record _ => by simp [eqS, den]
    | .record _, .base _ => by simp [eqS, den]
    | .record _, .arrow _ _ => by simp [eqS, den]
    | .record xs, .record ys => by
      simp only [eqS, Bool.and_eq_true, eqFirst_iff xs [] ys, den,
        G.record.injEq, List.all_eq_true, decide_eq_true_eq]
      constructor
      · rintro ⟨h1, h2⟩
        funext k
        rw [denRow_eq_lookup, denRow_eq_lookup]
        cases hx : xs.lookup k with
        | some a =>
          obtain ⟨b, hb, he⟩ := h1 k (by simp) a hx
          simp [hb, he]
        | none =>
          cases hy : ys.lookup k with
          | none => rfl
          | some b =>
            have hk : k ∈ keys ys := lookup_isSome_iff.mp (by simp [hy])
            have := lookup_isSome_iff.mpr (h2 k hk)
            simp [hx] at this
      · intro h
        refine ⟨fun k _ a hx => ?_, fun k hk => ?_⟩
        · have := congrFun h k
          rw [denRow_eq_lookup, denRow_eq_lookup, hx] at this
          cases hy : ys.lookup k with
          | none => simp [hy] at this
          | some b => exact ⟨b, rfl, by simpa [hy] using this⟩
        · have := congrFun h k
          rw [denRow_eq_lookup, denRow_eq_lookup] at this
          have hs := lookup_isSome_iff.mpr hk
          apply lookup_isSome_iff.mp
          cases hx : xs.lookup k with
          | some _ => rfl
          | none => cases hy : ys.lookup k <;> simp_all

  theorem eqFirst_iff : ∀ (xs : List (GL Label × SG Label B))
      (seen : List (GL Label)) (ys : List (GL Label × SG Label B)),
      eqFirst xs seen ys = true ↔ ∀ k, k ∉ seen → ∀ a, xs.lookup k = some a →
        ∃ b, ys.lookup k = some b ∧ den a = den b
    | [], _, _ => by simp [eqFirst, List.lookup]
    | (k, a) :: rest, seen, ys => by
      simp only [eqFirst, Bool.and_eq_true, Bool.or_eq_true,
        decide_eq_true_eq, eqFirst_iff rest (k :: seen) ys]
      constructor
      · rintro ⟨hk, hr⟩ k' hs a' ha'
        rw [lookup_cons] at ha'
        by_cases h : k' = k
        · subst h
          simp only [↓reduceIte, Option.some.injEq] at ha'
          subst ha'
          rcases hk with hk | hk
          · exact absurd hk hs
          · cases hy : ys.lookup k' with
            | none => simp [hy] at hk
            | some b =>
              exact ⟨b, rfl, (eqS_iff _ _).mp (by simpa [hy] using hk)⟩
        · simp only [h, ↓reduceIte] at ha'
          exact hr k' (by simp [h, hs]) a' ha'
      · intro h
        refine ⟨?_, fun k' hs a' ha' => ?_⟩
        · by_cases hs : k ∈ seen
          · exact Or.inl hs
          · obtain ⟨b, hb, he⟩ := h k hs a (by simp)
            exact Or.inr (by simp [hb, (eqS_iff a b).mpr he])
        · simp only [List.mem_cons, not_or] at hs
          exact h k' hs.2 a' (by rw [lookup_cons]; simp [hs.1, ha'])
end

/-- One generic atom under the certificate, with D1 and D2. -/
def checkAtom (P : SigProblem Label B) (p : List (Nat × Label))
    (C : Cert Label B) : Atom (GL Label) (GB Label B) → Bool
  | .eq t u =>
    match evalS P p C t, evalS P p C u with
    | some a, some b => eqS a b && wfS P a
    | _, _ => false
  | .lacks r l => !decide (l ∈ keys (rowS P p C r))
  | .disjoint x y => disjointS (rowS P p C x) (rowS P p C y) &&
      restsOkS P (rowS P p C x) (rowS P p C y)
  | .ff => false

/-- The certificate checks for pattern `p`. -/
def checkCert (P : SigProblem Label B) (p : List (Nat × Label))
    (C : Cert Label B) : Bool :=
  P.B.all fun a => checkAtom P p C (liftAtom a)

theorem checkAtom_sound {P : SigProblem Label B} {p : List (Nat × Label)}
    {C : Cert Label B} :
    ∀ a : Atom (GL Label) (GB Label B), checkAtom P p C a = true →
      HoldsG P (genAssign P (patternOf p) (denCert C)) a
  | .eq t u, h => by
    simp only [checkAtom] at h
    cases ht : evalS P p C t <;> cases hu : evalS P p C u <;>
      simp only [ht, hu, Bool.and_eq_true, reduceCtorEq] at h
    rename_i a b
    refine ⟨den a, ?_, ?_, (wfS_iff P a).mp h.2⟩
    · simp [evalT_den, ht]
    · simp [evalT_den, hu, (eqS_iff a b).mp h.1]
  | .lacks r l, h => by
    simp only [checkAtom, Bool.not_eq_true', decide_eq_false_iff_not] at h
    show (genAssign P (patternOf p) (denCert C)).row r l = none
    rw [← denRow_rowS]
    exact denRow_none_iff.mpr h
  | .disjoint x y, h => by
    simp only [checkAtom, Bool.and_eq_true] at h
    refine ⟨?_, ?_⟩
    · show Composition.Disjoint _ _
      rw [← denRow_rowS, ← denRow_rowS]
      exact disjointS_iff.mp h.1
    · have := restsOkS_iff.mp h.2
      simpa only [denRow_rowS] using this
  | .ff, h => by simp [checkAtom] at h

/-- K4. -/
theorem checkCert_sound {P : SigProblem Label B} {p : List (Nat × Label)}
    {C : Cert Label B} (h : checkCert P p C = true) :
    Certifies P (patternOf p) (denCert C) :=
  ⟨fin_denCert C, fun a ha =>
    checkAtom_sound _ (List.all_eq_true.mp h a ha)⟩

end Composition.Syntax
