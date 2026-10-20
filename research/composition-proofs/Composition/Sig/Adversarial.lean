/-
The author's counterexamples to P9 (dossier §13.7), checked in the
semantic model. (1) A valid signature whose flexible rows must divide a
rigid row's unnamed labels, which P9's whole-rest placement cannot do.
(2) An invalid signature that P9's proposed hard instance (a rigid type
variable set to a record over a fresh label) does not refute.
-/
import Composition.Sig.Examples

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- `∀ r s t. s disjoint t ⇒ ∃ u v. r = u ⊎ v ∧ u disjoint s ∧ v
disjoint t`. Rigid rows 0, 1, 2; flexible rows 3 (u) and 4 (v). -/
def splitSig : SigProblem Label B :=
  ⟨[], [0, 1, 2], [.disjoint 1 2],
   [.eq (.record .nil [0]) (.record .nil [3, 4]), .disjoint 3 1,
    .disjoint 4 2]⟩

/-- The rows of `r` whose labels `s` lacks, and those it holds. -/
def outside (r s : Row Label (G Label B)) : Row Label (G Label B) :=
  fun l => if s l = none then r l else none

def inside (r s : Row Label (G Label B)) : Row Label (G Label B) :=
  fun l => if s l = none then none else r l

theorem splitSig_valid : Valid (splitSig : SigProblem Label B) := by
  intro θR hd
  have hst : Disjoint (θR.row 1) (θR.row 2) :=
    hd (.disjoint 1 2) (by simp [splitSig])
  let u := outside (θR.row 0) (θR.row 1)
  let v := inside (θR.row 0) (θR.row 1)
  have huv : Disjoint u v := fun l => by
    by_cases h : θR.row 1 l = none <;> simp [u, v, outside, inside, h]
  have hr : union u v = θR.row 0 := by
    funext l
    by_cases h : θR.row 1 l = none <;>
      cases hr : θR.row 0 l <;> simp [u, v, outside, inside, union, h, hr]
  refine ⟨⟨θR.ty, fun n => if n = 3 then u else v⟩, ?_⟩
  intro a ha
  simp only [splitSig, List.mem_cons] at ha
  rcases ha with rfl | rfl | rfl | h
  · refine ⟨.record (θR.row 0), by simp [evalT_tails, combine, splitSig,
      composeAll_single], ?_⟩
    simp [evalT_tails, combine, splitSig, composeAll_pair huv, hr]
  · intro l
    by_cases h : θR.row 1 l = none <;>
      simp [combine, splitSig, u, outside, h]
  · intro l
    by_cases h : θR.row 1 l = none
    · simp [combine, splitSig, v, inside, h]
    · rcases hst l with h' | h'
      · exact absurd h' h
      · simp [combine, splitSig, h']
  · simp at h

/-- Whole-rest placement: `u` and `v` each take all of `r` or none of
it (no labels are written, so nothing else can be placed). Both choices
fail for some permitted rigid assignment. -/
def wholeRest (θR : Assign Label B) (uTakesR : Bool) : Assign Label B :=
  ⟨θR.ty, fun n => if (n = 3) = uTakesR then θR.row 0 else fun _ => none⟩

theorem wholeRest_fails (z : Label) (uTakesR : Bool) :
    ∃ θR : Assign Label B, Sat θR (splitSig : SigProblem Label B).D ∧
      ¬ Sat (combine splitSig θR (wholeRest θR uTakesR)) splitSig.B := by
  cases uTakesR with
  | true =>
    refine ⟨⟨fun _ => emptyG, fun n => if n = 2 then fun _ => none
      else oneField z⟩, ?_, ?_⟩
    · intro a ha
      simp only [splitSig, List.mem_singleton] at ha
      subst ha
      intro l
      simp
    · intro h
      have := h (.disjoint 3 1) (by simp [splitSig]) z
      simp [combine, splitSig, wholeRest, oneField, single] at this
  | false =>
    refine ⟨⟨fun _ => emptyG, fun n => if n = 1 then fun _ => none
      else oneField z⟩, ?_, ?_⟩
    · intro a ha
      simp only [splitSig, List.mem_singleton] at ha
      subst ha
      intro l
      simp
    · intro h
      have := h (.disjoint 4 2) (by simp [splitSig]) z
      simp [combine, splitSig, wholeRest, oneField, single] at this

/-- `∀ α. ∃ r. α = { ...r }`: invalid (α may be a function type). -/
def recSig : SigProblem Label B :=
  ⟨[0], [], [], [.eq (.tvar 0) (.record .nil [1])]⟩

theorem recSig_not_valid : ¬ Valid (recSig : SigProblem Label B) := by
  intro hv
  obtain ⟨θF, h⟩ := hv ⟨fun _ => .arrow emptyG emptyG, fun _ _ => none⟩
    (by simp [Sat, recSig])
  obtain ⟨g, h1, h2⟩ := h (.eq (.tvar 0) (.record .nil [1]))
    (by simp [recSig])
  rw [evalT_tails] at h2
  simp only [List.map_cons, List.map_nil, composeAll_single,
    Option.map_some, Option.some.injEq] at h2
  simp [evalT, combine, recSig] at h1
  rw [← h2] at h1
  cases h1

/-- P9's proposed hard instance, α a record over a fresh label, does
not refute it: there the body has a solution. -/
theorem recSig_hard_instance_solvable (z : Label) :
    ∃ θF : Assign Label B, Sat (combine recSig
      ⟨fun _ => .record (oneField z), fun _ _ => none⟩ θF) recSig.B := by
  refine ⟨⟨fun _ => emptyG, fun _ => oneField z⟩, ?_⟩
  intro a ha
  simp only [recSig, List.mem_singleton] at ha
  subst ha
  exact ⟨.record (oneField z), by simp [evalT, combine, recSig],
    by simp [evalT_tails, combine, recSig, composeAll_single]⟩

end Composition.Syntax
