/-
Maps from ground values into the generic model (for the converse and
for vacuity): `up` reads each generic label from at most one ground
label (`src`), maps bases by `φ`, and is a homomorphism for the
problem's expressions when written labels and bases map to themselves
(`UpOk`). Two instances: dropping every unwritten label
(InstanceIffUnifiable), and renaming fresh labels and bases back to
cells and constants (D3bComplete).
-/
import Composition.Typed.Commute

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

mutual
  def up (src : CL Label → Option Label) (φ : B → CB Label B) :
      G Label B → CG Label B
    | .base b => .base (φ b)
    | .arrow a c => .arrow (up src φ a) (up src φ c)
    | .record f => .record fun j => match src j with
      | none => none
      | some k => upO src φ (f k)

  def upO (src : CL Label → Option Label) (φ : B → CB Label B) :
      Option (G Label B) → Option (CG Label B)
    | none => none
    | some g => some (up src φ g)
end

def upRow (src : CL Label → Option Label) (φ : B → CB Label B)
    (f : Row Label (G Label B)) : Row (CL Label) (CG Label B) :=
  fun j => match src j with
    | none => none
    | some k => upO src φ (f k)

def upAssign (src : CL Label → Option Label) (φ : B → CB Label B)
    (θ : Assign Label B) : CAssign Label B :=
  ⟨fun n => up src φ (θ.ty n), fun r => upRow src φ (θ.row r)⟩

/-- Written labels and bases map to themselves. -/
def UpOk (P : SigProblem Label B) (src : CL Label → Option Label)
    (φ : B → CB Label B) : Prop :=
  (∀ l ∈ written P, src (.inl l) = some l) ∧
    (∀ j l, l ∈ written P → src j = some l → j = .inl l) ∧
    ∀ b ∈ basesOf P, φ b = .inl b

variable {P : SigProblem Label B} {src : CL Label → Option Label}
  {φ : B → CB Label B}

omit [DecidableEq Label] in
theorem up_record (f : Row Label (G Label B)) :
    up src φ (.record f) = .record (upRow src φ f) := by
  simp only [up]
  rfl

omit [DecidableEq Label] in
theorem upRow_disjoint {x y : Row Label (G Label B)}
    (h : Composition.Disjoint x y) :
    Composition.Disjoint (upRow src φ x) (upRow src φ y) := by
  intro j
  simp only [upRow]
  cases src j with
  | none => exact Or.inl rfl
  | some k => rcases h k with h' | h' <;> simp [h', upO]

omit [DecidableEq Label] in
theorem upRow_union (x y : Row Label (G Label B)) :
    upRow src φ (union x y) = union (upRow src φ x) (upRow src φ y) := by
  funext j
  simp only [upRow, union]
  cases src j with
  | none => rfl
  | some k => cases hx : x k <;> simp [hx, upO]

omit [DecidableEq Label] in
theorem composeAll_upRow :
    ∀ {xs : List (Row Label (G Label B))} {v : Row Label (G Label B)},
      composeAll xs = some v →
        composeAll (xs.map (upRow src φ)) = some (upRow src φ v)
  | [], v, h => by
    simp only [composeAll, Option.some.injEq] at h
    subst h
    simp only [List.map_nil, composeAll, Option.some.injEq]
    funext j
    simp only [upRow, Row.empty]
    cases src j <;> rfl
  | x :: xs, v, h => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨hxw, rfl⟩ := compose_eq_some.mp hc
    simp only [List.map_cons, composeAll, composeAll_upRow hw,
      Option.bind_some]
    exact compose_eq_some.mpr ⟨upRow_disjoint hxw, upRow_union x w⟩

theorem upRow_single (hok : UpOk P src φ) {l : Label} (hl : l ∈ written P)
    (g : G Label B) :
    upRow src φ (single l g) = single (.inl l) (up src φ g) := by
  funext j
  simp only [upRow]
  cases hj : src j with
  | none =>
    have : j ≠ .inl l := fun h => by rw [h, hok.1 l hl] at hj; cases hj
    simp [single, this]
  | some k =>
    by_cases hk : k = l
    · subst hk
      have := hok.2.1 j k hl hj
      subst this
      simp [single, upO]
    · have : j ≠ .inl l := fun h => by
        rw [h, hok.1 l hl] at hj
        exact hk (Option.some.inj hj).symm
      simp [single, hk, this, upO]

end Composition.Typed
