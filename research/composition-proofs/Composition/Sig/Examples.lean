/-
Signature examples (dossier §13): program 6 holds; and a signature that
holds only because the flexible solution depends on the rigid one.
-/
import Composition.Sig.Validity

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem evalT_tails (θ : Assign Label B) (rs : List Nat) :
    evalT θ (.record .nil rs) = (composeAll (rs.map θ.row)).map G.record := by
  rw [evalT_record]
  simp [fieldRows]

omit [DecidableEq Label] in
theorem composeAll_pair {r s : Row Label (G Label B)} (h : Disjoint r s) :
    composeAll [r, s] = some (union r s) := by
  simp [composeAll, compose_empty, compose_eq_some.mpr ⟨h, rfl⟩]

/-- Program 6: `forwarded(a: { ...r }, b: { ...s }): { ...r, ...s }
where r disjoint s = join(a, b)`. Flexible rows 2 and 3 are `join`'s
instantiated parts. -/
def p6Sig : SigProblem Label B :=
  ⟨[], [0, 1], [.disjoint 0 1],
   [.eq (.record .nil [2]) (.record .nil [0]),
    .eq (.record .nil [3]) (.record .nil [1]),
    .disjoint 2 3,
    .eq (.record .nil [2, 3]) (.record .nil [0, 1])]⟩

theorem p6Sig_valid : Valid (p6Sig : SigProblem Label B) := by
  intro θR hd
  have hdis : Disjoint (θR.row 0) (θR.row 1) :=
    hd (.disjoint 0 1) (by simp [p6Sig])
  refine ⟨⟨θR.ty, fun r => if r = 2 then θR.row 0 else θR.row 1⟩, ?_⟩
  intro a ha
  simp only [p6Sig, List.mem_cons] at ha
  rcases ha with rfl | rfl | rfl | rfl | h
  · exact ⟨.record (θR.row 0),
      by simp [evalT_tails, combine, p6Sig, composeAll_single],
      by simp [evalT_tails, combine, p6Sig, composeAll_single]⟩
  · exact ⟨.record (θR.row 1),
      by simp [evalT_tails, combine, p6Sig, composeAll_single],
      by simp [evalT_tails, combine, p6Sig, composeAll_single]⟩
  · simpa [Holds, combine, p6Sig] using hdis
  · exact ⟨.record (union (θR.row 0) (θR.row 1)),
      by simp [evalT_tails, combine, p6Sig, composeAll_pair hdis],
      by simp [evalT_tails, combine, p6Sig, composeAll_pair hdis]⟩
  · simp at h

/-- A signature whose flexible solution must depend on the rigid one:
`∀ r s. r disjoint s ⇒ ∃ u v. { ...u, ...v } = { ...r, ...s } ∧ u lacks
admin`. The part holding `admin`, if any, goes to `v`. -/
def depSig (admin : Label) : SigProblem Label B :=
  ⟨[], [0, 1], [.disjoint 0 1],
   [.eq (.record .nil [2, 3]) (.record .nil [0, 1]), .lacks 2 admin]⟩

/-- The flexible assignment placing rigid rows `i` and `j` in `u`, `v`. -/
def place (θR : Assign Label B) (i j : Nat) : Assign Label B :=
  ⟨θR.ty, fun r => if r = 2 then θR.row i else θR.row j⟩

theorem depSig_valid (admin : Label) :
    Valid (depSig admin : SigProblem Label B) := by
  intro θR hd
  have hdis : Disjoint (θR.row 0) (θR.row 1) :=
    hd (.disjoint 0 1) (by simp [depSig])
  have hdis' : Disjoint (θR.row 1) (θR.row 0) := disjoint_comm.mp hdis
  cases h0 : θR.row 0 admin with
  | none =>
    refine ⟨place θR 0 1, ?_⟩
    intro a ha
    simp only [depSig, List.mem_cons] at ha
    rcases ha with rfl | rfl | h
    · exact ⟨.record (union (θR.row 0) (θR.row 1)),
        by simp [evalT_tails, combine, depSig, place, composeAll_pair hdis],
        by simp [evalT_tails, combine, depSig, composeAll_pair hdis]⟩
    · simp [Holds, combine, depSig, place, h0]
    · simp at h
  | some g =>
    have h1 : θR.row 1 admin = none := by
      rcases hdis admin with h | h
      · rw [h0] at h
        cases h
      · exact h
    refine ⟨place θR 1 0, ?_⟩
    intro a ha
    simp only [depSig, List.mem_cons] at ha
    rcases ha with rfl | rfl | h
    · refine ⟨.record (union (θR.row 0) (θR.row 1)), ?_,
        by simp [evalT_tails, combine, depSig, composeAll_pair hdis]⟩
      simp [evalT_tails, combine, depSig, place, composeAll_pair hdis',
        union_comm hdis']
    · simp [Holds, combine, depSig, place, h1]
    · simp at h

/-- Neither placement works for every rigid assignment: the solution
must depend on the rigid rows. -/
theorem depSig_needs_dependence (admin : Label) :
    (¬ ∀ θR : Assign Label B, Sat θR (depSig admin).D →
        Sat (combine (depSig admin) θR (place θR 0 1)) (depSig admin).B) ∧
    (¬ ∀ θR : Assign Label B, Sat θR (depSig admin).D →
        Sat (combine (depSig admin) θR (place θR 1 0)) (depSig admin).B) := by
  have hr : ∀ i : Nat, Sat (⟨fun _ => emptyG, fun r => if r = i then
      oneField admin else fun _ => none⟩ : Assign Label B)
      (depSig admin).D := by
    intro i a ha
    simp only [depSig, List.mem_singleton] at ha
    subst ha
    intro l
    by_cases h0 : (0 : Nat) = i <;> by_cases h1 : (1 : Nat) = i
    · exfalso
      omega
    all_goals simp_all
  constructor
  · intro h
    have := h _ (hr 0) (.lacks 2 admin) (by simp [depSig])
    simp [Holds, combine, depSig, place, oneField, single] at this
  · intro h
    have := h _ (hr 1) (.lacks 2 admin) (by simp [depSig])
    simp [Holds, combine, depSig, place, oneField, single] at this

end Composition.Syntax
