/-
Finite patterns, certificate tables and the checker (dossier §15.2,
§15.7); K2's consistency half, K5 and K6. A table is a list of pattern
and certificate entries; a pattern is looked up by its set of pairs,
the first matching entry wins, and a missing pattern gets the empty
certificate. `checkAll` checks every finite pattern that is consistent
with `D`; K6 turns its acceptance into `ValidAll` and `ValidFin`.
-/
import Composition.Sig.Decide

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- Rigid rows paired with written labels. -/
def pairs (P : SigProblem Label B) : List (Nat × Label) :=
  P.rigidRow.flatMap fun r => (written P).map (r, ·)

/-- One finite pattern per sublist of `pairs P`. -/
def patterns (P : SigProblem Label B) : List (List (Nat × Label)) :=
  subsets (pairs P)

/-- `Consistent` for `patternOf p`, over `D`'s atoms. -/
def consistentS (P : SigProblem Label B) (p : List (Nat × Label)) : Bool :=
  P.D.all fun
    | .lacks r l => !decide ((r, l) ∈ p)
    | .disjoint r s =>
      p.all fun q => !(decide (q.1 = r) && decide ((s, q.2) ∈ p))
    | _ => true

omit [DecidableEq B] in
/-- K2, consistency. -/
theorem consistentS_iff {P : SigProblem Label B} {p : List (Nat × Label)} :
    consistentS P p = true ↔ Consistent P (patternOf p) := by
  simp only [consistentS, List.all_eq_true, Consistent, patternOf,
    decide_eq_true_eq, decide_eq_false_iff_not]
  constructor
  · intro h
    refine ⟨fun r l hl => ?_, fun r s l hd ⟨h1, h2⟩ => ?_⟩
    · simpa using h _ hl
    · have := h _ hd
      simp only [List.all_eq_true, Bool.not_eq_true', Bool.and_eq_false_iff,
        decide_eq_false_iff_not] at this
      rcases this (r, l) h1 with h' | h'
      · exact h' rfl
      · exact h' h2
  · rintro ⟨hl, hd⟩ a ha
    cases a with
    | lacks r l => simpa using hl r l ha
    | disjoint r s =>
      simp only [List.all_eq_true, Bool.not_eq_true', Bool.and_eq_false_iff,
        decide_eq_false_iff_not]
      intro q hq
      by_cases h : q.1 = r
      · exact Or.inr fun hs => hd r s q.2 ha ⟨by simpa [← h] using hq, hs⟩
      · exact Or.inl h
    | _ => rfl

omit [DecidableEq Label] [DecidableEq B] in
theorem mem_pairs {P : SigProblem Label B} {r : Nat} {l : Label} :
    (r, l) ∈ pairs P ↔ r ∈ P.rigidRow ∧ l ∈ written P := by
  simp [pairs]

omit [DecidableEq B] in
/-- K5: every consistent pattern agrees, where `genAssign` reads it,
with a consistent finite pattern. -/
theorem pattern_cover {P : SigProblem Label B} {π : Pattern Label}
    (hc : Consistent P π) :
    ∃ p ∈ patterns P, Consistent P (patternOf p) ∧
      ∀ σ, genAssign P π σ = genAssign P (patternOf p) σ := by
  refine ⟨(pairs P).filter fun q => π q.1 q.2, filter_mem_subsets _ _,
    ?_, fun σ => ?_⟩
  · have hsub : ∀ r l, patternOf ((pairs P).filter fun q => π q.1 q.2) r l =
        true → π r l = true := fun r l h => by
      simp only [patternOf, decide_eq_true_eq, List.mem_filter] at h
      exact h.2
    refine ⟨fun r l hl => ?_, fun r s l hd ⟨h1, h2⟩ => ?_⟩
    · cases h : patternOf _ r l
      · rfl
      · exact absurd (hsub r l h) (by simp [hc.1 r l hl])
    · exact hc.2 r s l hd ⟨hsub r l h1, hsub s l h2⟩
  · simp only [genAssign]
    congr 1
    funext r
    by_cases hr : r ∈ P.rigidRow
    · simp only [hr, ↓reduceIte]
      funext k
      cases k with
      | inl l =>
        simp only [genRow, patternOf, List.mem_filter, mem_pairs,
          decide_eq_true_eq]
        by_cases hl : l ∈ written P <;> simp [hl, hr]
      | inr s => rfl
    · simp [hr]

/-- Pattern and certificate entries, as exported by a search. -/
abbrev CertTable (Label B : Type) :=
  List (List (Nat × Label) × Cert Label B)

/-- Two patterns hold the same pairs. -/
def samePattern (p q : List (Nat × Label)) : Bool :=
  p.all (fun x => decide (x ∈ q)) && q.all fun x => decide (x ∈ p)

/-- The first entry for `p`'s pairs; the empty certificate if none. -/
def lookupCert (T : CertTable Label B) (p : List (Nat × Label)) :
    Cert Label B :=
  match T.find? fun e => samePattern e.1 p with
  | some e => e.2
  | none => Cert.empty

/-- The checker. -/
def checkAll (P : SigProblem Label B) (T : CertTable Label B) : Bool :=
  (patterns P).all fun p => !consistentS P p || checkCert P p (lookupCert T p)

/-- K6. -/
theorem checkAll_accepts {P : SigProblem Label B} {T : CertTable Label B}
    (h : checkAll P T = true) : Accepts P := by
  intro π hc
  obtain ⟨p, hp, hcp, heq⟩ := pattern_cover hc
  have hp' := List.all_eq_true.mp h p hp
  simp only [consistentS_iff.mpr hcp, Bool.not_true, Bool.false_or] at hp'
  obtain ⟨hfin, hB⟩ := checkCert_sound hp'
  exact ⟨_, hfin, fun a ha => by rw [heq]; exact hB a ha⟩

theorem checkAll_validAll {P : SigProblem Label B} {T : CertTable Label B}
    (h : checkAll P T = true) : ValidAll P :=
  s1 (checkAll_accepts h)

theorem checkAll_validFin {P : SigProblem Label B} {T : CertTable Label B}
    (h : checkAll P T = true) : ValidFin P :=
  s1_fin (checkAll_accepts h)

end Composition.Syntax
