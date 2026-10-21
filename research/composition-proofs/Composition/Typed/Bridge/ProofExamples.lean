/-
Proofs of the intended instances N1, N2, N2′, N5 and N7
(Bridge/Examples.lean). Renaming `routeP`, `agreeP`, `intArmP b` and
`shapeSplit ()` is definitional (`rfl`), so option-B validity reduces
to closed validity at every base type.
-/
import Composition.Typed.Bridge.Examples
import Composition.TypedAttack.ShapeSplit

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-- N1. -/
theorem shapeSplitSeparates : ShapeSplitSeparates :=
  ⟨TypedAttack.shapeSplit_validFin, fun h =>
    TypedAttack.validity_not_extension_stable.2
      (h Bool (fun _ => false) fun _ _ _ => rfl)⟩

/-- N2. -/
theorem routeOpen : RouteOpen (Label := Label) (B := B) :=
  fun B₁ _ _ => (routeP_valid (Label := Label) (B := B₁)).2

/-- N2′. -/
theorem agreeOpen : AgreeOpen (Label := Label) (B := B) :=
  fun B₁ _ _ => (agreeP_valid (Label := Label) (B := B₁)).2

/-- `intArmP`'s witness: `f` in `u2`, `m1 = { f: b }`, `β = α`. -/
def intArmWit (b : B) (a : G Nat B) : Assign Nat B :=
  ⟨fun _ => a, fun r => if r = 1 then single 0 a
    else if r = 2 then single 0 (.base b) else Row.empty⟩

/-- `intArmP b` is closed-valid at every base type. -/
theorem intArmP_validFin (b : B) : ValidFin (intArmP b) := by
  intro θR hty _ _
  have ha : FinG (θR.ty 0) := hty 0 (by simp [intArmP])
  refine ⟨intArmWit b (θR.ty 0), ⟨fun _ => ha, fun r => ?_⟩, ?_⟩
  · simp only [intArmWit]
    split
    · exact TypedAttack.finG_single ha
    · split
      · exact TypedAttack.finG_single trivial
      · exact finG_emptyG
  · intro x hx
    simp only [intArmP, List.mem_cons, List.not_mem_nil, or_false] at hx
    rcases hx with rfl | rfl | rfl <;>
      simp [Holds, combine, intArmWit, composeAll, intArmP,
        compose_empty, empty_compose, evalT, evalF]

/-- N5. -/
theorem intArmOpen : IntArmOpen (B := B) :=
  fun b _ i _ => intArmP_validFin (i b)

/-- N7. -/
theorem twoBaseInjective : TwoBaseInjective (B := B) := by
  intro b₁ b₂ hne
  refine ⟨fun B₁ i hi θR _ _ hD => ?_, fun h => ?_⟩
  · obtain ⟨g₁, h₁, h₁'⟩ := hD _ (List.mem_cons_self ..)
    obtain ⟨g₂, h₂, h₂'⟩ :=
      hD _ (List.mem_cons_of_mem _ (List.mem_cons_self ..))
    simp only [mapBaseT, evalT, Option.some.injEq] at h₁ h₁' h₂ h₂'
    subst h₁ h₂
    exact absurd (hi (G.base.inj (h₁'.trans h₂'.symm))) hne
  · obtain ⟨_, _, hB⟩ := h ⟨fun _ => .base (), fun _ => Row.empty⟩
      (fun _ _ => trivial)
      (fun _ h => by simp [twoBaseP, SigProblem.mapBase] at h)
      (fun a ha => by
        simp only [twoBaseP, SigProblem.mapBase, List.map, List.mem_cons,
          List.not_mem_nil, or_false] at ha
        rcases ha with rfl | rfl <;> exact ⟨_, rfl, rfl⟩)
    exact hB .ff (by simp [twoBaseP, SigProblem.mapBase, mapBaseAtom])

end Composition.Typed
