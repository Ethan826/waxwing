/-
Finite syntactic certificates (dossier §15.2, with the author's three
details, §15.7). A generic value is written as syntax; a record is a
list of label-value entries, read at the first occurrence of each label.
A certificate is two lists of variable bindings, also read at the first
occurrence; an unbound variable denotes the empty record. A table pairs
patterns with certificates; a missing pattern gets the empty
certificate. Duplicates are a property of this representation only:
evaluation still refuses a composition whose parts share a label
(Check.lean, CheckExamples.lean). K1: every denotation is finite.
-/
import Composition.Sig.Soundness

namespace Composition.Syntax

open Composition

variable {Label B : Type}

deriving instance DecidableEq for Const

/-- Syntactic generic values. -/
inductive SG (Label B : Type) where
  | base : GB Label B → SG Label B
  | arrow : SG Label B → SG Label B → SG Label B
  | record : List (GL Label × SG Label B) → SG Label B

variable [DecidableEq Label]

mutual
  /-- The generic value a syntactic one denotes. -/
  def den : SG Label B → GG Label B
    | .base b => .base b
    | .arrow a c => .arrow (den a) (den c)
    | .record fs => .record (denRow fs)

  /-- A list's row: each label at its first occurrence. -/
  def denRow : List (GL Label × SG Label B) → Row (GL Label) (GG Label B)
    | [] => fun _ => none
    | (k, s) :: rest => fun k' =>
      if k' = k then some (den s) else denRow rest k'
end

/-- A certificate: variable bindings, first occurrence wins. -/
structure Cert (Label B : Type) where
  ty : List (Nat × SG Label B)
  row : List (Nat × List (GL Label × SG Label B))

def Cert.empty : Cert Label B := ⟨[], []⟩

/-- The empty generic record. -/
def emptyGG : GG Label B := .record fun _ => none

/-- A certificate's assignment; unbound variables are empty records. -/
def denCert (C : Cert Label B) : Assign (GL Label) (GB Label B) :=
  ⟨fun n => ((C.ty.lookup n).map den).getD emptyGG,
   fun r => ((C.row.lookup r).map denRow).getD Row.empty⟩

mutual
  theorem fin_den : ∀ s : SG Label B, FinG (den s)
    | .base _ => by simp [den, FinG]
    | .arrow a c => by
      simp only [den, FinG]
      exact ⟨fin_den a, fin_den c⟩
    | .record fs => by
      rw [den, finG_record]
      exact fin_denRow fs

  theorem fin_denRow : ∀ fs : List (GL Label × SG Label B),
      FinRow (denRow fs) ∧ ∀ k, FinO (denRow fs k)
    | [] => ⟨⟨[], fun _ h => absurd rfl h⟩, fun _ => by simp [denRow, FinO]⟩
    | (k, s) :: rest => by
      obtain ⟨⟨ls, hls⟩, hf⟩ := fin_denRow rest
      refine ⟨⟨k :: ls, fun k' hk => ?_⟩, fun k' => ?_⟩
      · by_cases h : k' = k
        · simp [h]
        · simp only [denRow, h, ↓reduceIte] at hk
          exact List.mem_cons_of_mem _ (hls k' hk)
      · by_cases h : k' = k
        · simp only [denRow, h, ↓reduceIte, FinO]
          exact fin_den s
        · simp only [denRow, h, ↓reduceIte]
          exact hf k'
end

omit [DecidableEq Label] in
theorem fin_emptyGG : FinG (emptyGG : GG Label B) := by
  rw [emptyGG, finG_record]
  exact ⟨⟨[], fun _ h => absurd rfl h⟩, fun _ => by simp [FinO]⟩

/-- K1. -/
theorem fin_denCert (C : Cert Label B) : FinAssign (denCert C) := by
  refine ⟨fun n => ?_, fun r => ?_⟩
  · simp only [denCert]
    cases C.ty.lookup n with
    | none => exact fin_emptyGG
    | some s => exact fin_den s
  · simp only [denCert]
    cases C.row.lookup r with
    | none =>
      rw [finG_record]
      exact ⟨⟨[], fun _ h => absurd rfl h⟩, fun _ => by simp [Row.empty, FinO]⟩
    | some fs =>
      rw [finG_record]
      exact fin_denRow fs

end Composition.Syntax
