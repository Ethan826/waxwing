/-
Cell shape (`CS`), the invariant behind cell locality (construction.md
§6, step 2): written labels and bases of the problem everywhere; a cell
constant `X r S` only directly under its own cell label `inr S`, with
`r ∈ S` and `S` among the cells `C`; and no cell constant anywhere else.
The pre-instance's values have this shape, and substitutions that send
non-cell constants to cell-shaped values and each `X r S` to some
`X r' S` keep it. So cell constants are only ever compared with cell
constants of the same cell.
-/
import Composition.Typed.UnifEval

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type}

/-- Not a cell constant. -/
def NonX : CConst Label → Prop
  | .X _ _ => False
  | _ => True

mutual
  def CS (P : SigProblem Label B) (C : List Cell) : CG Label B → Prop
    | .base (.inl b) => b ∈ basesOf P
    | .base (.inr c) => NonX c
    | .arrow a b => CS P C a ∧ CS P C b
    | .record f => (∀ l, f (.inl l) ≠ none → l ∈ written P) ∧
        (∀ l, CSO P C (f (.inl l))) ∧
        ∀ S, f (.inr S) = none ∨
          (S ∈ C ∧ ∃ r ∈ S, f (.inr S) = some (cv (.X r S)))

  def CSO (P : SigProblem Label B) (C : List Cell) :
      Option (CG Label B) → Prop
    | none => True
    | some g => CS P C g
end

/-- A cell-shaped row. -/
def CSRow (P : SigProblem Label B) (C : List Cell)
    (f : Row (CL Label) (CG Label B)) : Prop :=
  (∀ l, f (.inl l) ≠ none → l ∈ written P) ∧ (∀ l, CSO P C (f (.inl l))) ∧
    ∀ S, f (.inr S) = none ∨
      (S ∈ C ∧ ∃ r ∈ S, f (.inr S) = some (cv (.X r S)))

variable {P : SigProblem Label B} {C : List Cell}

theorem cs_record (f : Row (CL Label) (CG Label B)) :
    CS P C (.record f) ↔ CSRow P C f := by
  simp only [CS, CSRow]

/-- Substitutions that keep the cell shape. -/
def Compat (P : SigProblem Label B) (C : List Cell) (σ : CSubst Label B) :
    Prop :=
  (∀ c, NonX c → CS P C (σ c)) ∧
    ∀ r S, r ∈ S → ∃ r' ∈ S, σ (.X r S) = cv (.X r' S)

mutual
  theorem cs_subst {σ : CSubst Label B} (hσ : Compat P C σ) :
      ∀ g : CG Label B, CS P C g → CS P C (substG σ g)
    | .base (.inl _), h => h
    | .base (.inr c), h => hσ.1 c h
    | .arrow a b, h => ⟨cs_subst hσ a h.1, cs_subst hσ b h.2⟩
    | .record f, h => by
      rw [substG_record, cs_record]
      have hf := (cs_record f).mp h
      refine ⟨fun l hl => hf.1 l fun h0 => hl (by simp [h0, substO]),
        fun l => csO_subst hσ (f (.inl l)) (hf.2.1 l), fun S => ?_⟩
      rcases hf.2.2 S with h0 | ⟨hS, r, hr, h1⟩
      · left; simp [h0, substO]
      · right
        obtain ⟨r', hr', h2⟩ := hσ.2 r S hr
        exact ⟨hS, r', hr', by simp [h1, substO, substG, h2]⟩

  theorem csO_subst {σ : CSubst Label B} (hσ : Compat P C σ) :
      ∀ o : Option (CG Label B), CSO P C o → CSO P C (substO σ o)
    | none, _ => trivial
    | some g, h => cs_subst hσ g h
end

mutual
  /-- Cell-shaped values use only the problem's labels and bases. -/
  theorem cs_within : ∀ g : CG Label B, CS P C g → WithinG P g
    | .base (.inl _), h => h
    | .base (.inr _), _ => trivial
    | .arrow a b, h => ⟨cs_within a h.1, cs_within b h.2⟩
    | .record f, h => by
      have hf := (cs_record f).mp h
      refine ⟨hf.1, fun j => ?_⟩
      cases j with
      | inl l => exact csO_within (f (.inl l)) (hf.2.1 l)
      | inr S =>
        rcases hf.2.2 S with h0 | ⟨_, r, _, h1⟩
        · simp [h0, WithinO]
        · simp [h1, WithinO, WithinG]

  theorem csO_within : ∀ o : Option (CG Label B), CSO P C o → WithinO P o
    | none, _ => trivial
    | some g, h => cs_within g h
end

theorem csRow_union {x y : Row (CL Label) (CG Label B)} (hx : CSRow P C x)
    (hy : CSRow P C y) : CSRow P C (union x y) := by
  refine ⟨fun l hl => ?_, fun l => ?_, fun S => ?_⟩
  · simp only [union] at hl
    cases h : x (.inl l) with
    | none => rw [h] at hl; exact hy.1 l hl
    | some _ => exact hx.1 l (by simp [h])
  · simp only [union]
    cases h : x (.inl l) with
    | none => exact hy.2.1 l
    | some g => have := hx.2.1 l; rw [h] at this; exact this
  · simp only [union]
    cases h : x (.inr S) with
    | none => exact hy.2.2 S
    | some g =>
      rcases hx.2.2 S with h0 | h1
      · rw [h] at h0; cases h0
      · rw [h] at h1; exact Or.inr h1

theorem csRow_empty : CSRow P C (Row.empty : Row (CL Label) (CG Label B)) :=
  ⟨fun _ h => absurd rfl h, fun _ => trivial, fun _ => Or.inl rfl⟩

theorem composeAll_cs :
    ∀ {xs : List (Row (CL Label) (CG Label B))}
      {v : Row (CL Label) (CG Label B)},
      (∀ x ∈ xs, CSRow P C x) → composeAll xs = some v → CSRow P C v
  | [], v, _, h => by
    simp only [composeAll, Option.some.injEq] at h
    subst h
    exact csRow_empty
  | x :: xs, v, hx, h => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨_, rfl⟩ := compose_eq_some.mp hc
    exact csRow_union (hx x (by simp))
      (composeAll_cs (fun y hy => hx y (by simp [hy])) hw)

end Composition.Typed
