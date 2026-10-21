/-
C9, statements first (dossier §13): what a signature problem is and
what it means for it to hold, with checked examples that separate
validity from satisfiability. No checking procedure is defined here.

A signature problem has rigid type and row variables (the declaration's
`∀`), declared clauses `D` mentioning only them, and body constraints
`B` mentioning rigid and flexible variables. It holds when every rigid
assignment satisfying `D` extends, by some flexible assignment, to a
solution of `B`: the flexible assignment may depend on the rigid one.
-/
import Composition.Unify.Examples

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

structure SigProblem (Label B : Type) where
  rigidTy : List Nat
  rigidRow : List Nat
  D : Problem Label B
  B : Problem Label B

/-- Rigid variables from `θR`, flexible ones from `θF`. -/
def combine (P : SigProblem Label B) (θR θF : Assign Label B) :
    Assign Label B :=
  ⟨fun n => if n ∈ P.rigidTy then θR.ty n else θF.ty n,
   fun r => if r ∈ P.rigidRow then θR.row r else θF.row r⟩

/-- `D` mentions only rigid variables. -/
def Scoped (P : SigProblem Label B) : Prop :=
  (∀ n ∈ tyVarsOf P.D, n ∈ P.rigidTy) ∧ ∀ r ∈ rowVarsOf P.D, r ∈ P.rigidRow

/-- The signature holds over all partial maps, infinite rows included
(dossier D6, §2.2). Named `Valid` until §14.8; Waxwing's own semantics,
finite rows and values, is `ValidFin` (Sig/Finite.lean). -/
def ValidAll (P : SigProblem Label B) : Prop :=
  ∀ θR, Sat θR P.D → ∃ θF, Sat (combine P θR θF) P.B

/-- Validity over rigid assignments restricted to labels `L` only: what
reusing the existential restriction (R1) would check. -/
def ValidWithin (L : List Label) (P : SigProblem Label B) : Prop :=
  ∀ θR, AssignWithin L θR → Sat θR P.D → ∃ θF, Sat (combine P θR θF) P.B

/-- The empty record, a ground value for any `B`. -/
def emptyG : G Label B := .record fun _ => none

/-- A one-field row at label `z`. -/
def oneField (z : Label) : Row Label (G Label B) := single z emptyG

/-- §2.2: `r lacks { l }` in the body, no declared clause. Satisfiable,
not valid. -/
theorem lacks_sat_not_valid (l : Label) :
    let P : SigProblem Label B := ⟨[], [0], [], [.lacks 0 l]⟩
    Satisfiable (P.D ++ P.B) ∧ ¬ ValidAll P := by
  refine ⟨⟨⟨fun _ => emptyG, fun _ _ => none⟩, by simp [Sat, Holds]⟩, ?_⟩
  intro hv
  obtain ⟨θF, h⟩ := hv ⟨fun _ => emptyG, fun _ => oneField l⟩ (by simp [Sat])
  have := h (.lacks 0 l) (by simp)
  simp [Holds, combine, oneField, single] at this

/-- Unnamed labels: the body needs two rigid rows disjoint, nothing
declares it, and no label is written. Satisfiable; valid over rows
restricted to the written labels (there are none, so the rows are
empty); not valid, because both rows may hold the same unwritten label.
R1 must not be reused for rigid rows. -/
theorem unnamed_labels_matter (z : Label) :
    let P : SigProblem Label B := ⟨[], [0, 1], [], [.disjoint 0 1]⟩
    Satisfiable (P.D ++ P.B) ∧ ValidWithin (labelsOf (P.D ++ P.B)) P ∧
      ¬ ValidAll P := by
  refine ⟨⟨⟨fun _ => emptyG, fun _ _ => none⟩, ?_⟩, ?_, ?_⟩
  · simp [Sat, Holds, Composition.Disjoint]
  · intro θR hw _
    refine ⟨θR, ?_⟩
    simp only [Sat, List.mem_singleton, forall_eq, Holds]
    intro l
    left
    simp only [combine, List.mem_cons, true_or, ite_true]
    cases h : θR.row 0 l with
    | none => rfl
    | some g =>
      have := hw.2.1 0 l (by simp [h])
      simp [labelsOf] at this
  · intro hv
    obtain ⟨θF, h⟩ := hv ⟨fun _ => emptyG, fun _ => oneField z⟩ (by simp [Sat])
    have := h (.disjoint 0 1) (by simp) z
    simp [combine, oneField, single] at this

/-- With the clause declared, the same body holds. -/
theorem declared_disjoint_valid :
    ValidAll (⟨[], [0, 1], [.disjoint 0 1], [.disjoint 0 1]⟩ :
      SigProblem Label B) := by
  intro θR hd
  refine ⟨θR, ?_⟩
  have := hd (.disjoint 0 1) (by simp)
  intro a ha
  simp only [List.mem_singleton] at ha
  subst ha
  simpa [Holds, combine] using this

/-- A rigid type variable: `a = Int` is satisfiable, not valid. -/
theorem rigid_type_not_valid (b : B) :
    let P : SigProblem Label B := ⟨[0], [], [], [.eq (.tvar 0) (.base b)]⟩
    Satisfiable (P.D ++ P.B) ∧ ¬ ValidAll P := by
  refine ⟨⟨⟨fun _ => .base b, fun _ _ => none⟩, ?_⟩, ?_⟩
  · simp [Sat, Holds, evalT]
  · intro hv
    obtain ⟨θF, h⟩ := hv ⟨fun _ => emptyG, fun _ _ => none⟩ (by simp [Sat])
    obtain ⟨g, h1, h2⟩ := h (.eq (.tvar 0) (.base b)) (by simp)
    simp [evalT, combine, emptyG] at h1 h2
    rw [← h1] at h2
    cases h2

end Composition.Syntax
