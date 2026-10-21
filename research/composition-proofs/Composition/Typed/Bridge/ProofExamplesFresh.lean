/-
Proofs of N3 (the closed boundary), N4 and N6 (B2's premises jointly
inhabited) from Bridge/Examples.lean. The generic instance is
`thetaFree`, given by `d3bEqFree`; its constants are listed by
`freeConsts`. For N3 the generic solution is renamed along `() ↦ false`
(E2, E6) and transferred to `α = true` over `Bool`, where shape-split
has no solution (`no_solution_at`).
-/
import Composition.Typed.Bridge.Examples
import Composition.Typed.Bridge.ProofSat
import Composition.Typed.EqFree
import Composition.Typed.ExamplesValid
import Composition.TypedAttack.ShapeSplit

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### An injection of cells into `Nat` -/

/-- `x :: xs ↦ 2^x (2 enc xs + 1)`. -/
def cellEnc : Cell → Nat
  | [] => 0
  | x :: xs => 2 ^ x * (2 * cellEnc xs + 1)

theorem pow_odd_inj : ∀ (x y a b : Nat),
    2 ^ x * (2 * a + 1) = 2 ^ y * (2 * b + 1) → x = y ∧ a = b
  | 0, 0, a, b, h => by simp at h; omega
  | 0, y + 1, a, b, h => by
    rw [Nat.pow_succ, Nat.mul_comm (2 ^ y), Nat.mul_assoc] at h
    generalize 2 ^ y * (2 * b + 1) = t at h
    omega
  | x + 1, 0, a, b, h => by
    rw [Nat.pow_succ, Nat.mul_comm (2 ^ x), Nat.mul_assoc] at h
    generalize 2 ^ x * (2 * a + 1) = t at h
    omega
  | x + 1, y + 1, a, b, h => by
    rw [Nat.pow_succ, Nat.pow_succ, Nat.mul_comm (2 ^ x),
      Nat.mul_comm (2 ^ y), Nat.mul_assoc, Nat.mul_assoc] at h
    have := pow_odd_inj x y a b (Nat.eq_of_mul_eq_mul_left (by decide) h)
    omega

theorem cellEnc_inj : ∀ S S' : Cell, cellEnc S = cellEnc S' → S = S'
  | [], [], _ => rfl
  | [], x :: xs, h | x :: xs, [], h => by
    have := Nat.mul_pos (Nat.two_pow_pos x)
      (by omega : 0 < 2 * cellEnc xs + 1)
    simp only [cellEnc] at h
    omega
  | x :: xs, y :: ys, h => by
    obtain ⟨rfl, h'⟩ := pow_odd_inj x y _ _ h
    rw [cellEnc_inj xs ys h']

/-! ### The constants of `thetaFree` -/

/-- Every constant `thetaFree P π` can use. -/
noncomputable def freeConsts (P : SigProblem Label B) :
    List (CConst Label) :=
  P.rigidTy.map .T ++ P.rigidRow.flatMap (fun r => (written P).map (.A r))
    ++ (freeCells P).flatMap fun S => S.map (.X · S)

theorem constsIn_thetaFree (P : SigProblem Label B) (π : Pattern Label) :
    ConstsInC P (freeConsts P) (thetaFree P π) := by
  refine ⟨fun n hn => ?_, fun r hr k => ?_⟩
  · simp [thetaFree, eta, BasesWithin, constIn, freeConsts, hn]
  · cases k with
    | inl l =>
      by_cases h : l ∈ written P ∧ π r l = true
      · simp only [thetaFree, eta, etaRow, h, and_self, ite_true]
        simp [BasesWithinO, BasesWithin, constIn, freeConsts]
        exact ⟨hr, h.1⟩
      · simp only [thetaFree, eta, etaRow, h, ite_false]
        trivial
    | inr S =>
      by_cases h : S ∈ freeCells P ∧ r ∈ S
      · simp only [thetaFree, eta, etaRow, h, and_self, ite_true]
        simp [BasesWithinO, BasesWithin, constIn, freeConsts]
        exact ⟨S, h.1, r, h.2, rfl, rfl⟩
      · simp only [thetaFree, eta, etaRow, h, ite_false]
        trivial

/-! ### N3 -/

omit [DecidableEq Label] in
/-- `combine` commutes with renaming bases. -/
theorem mapAssign_combine {B' : Type} (P : SigProblem Label B)
    (f : B → B') (θ σ : Assign Label B) :
    mapAssign f (combine P θ σ) =
      combine (P.mapBase f) (mapAssign f θ) (mapAssign f σ) := by
  simp only [mapAssign, combine, SigProblem.mapBase]
  congr 1
  · funext n
    by_cases h : n ∈ P.rigidTy <;> simp [h]
  · funext r k
    by_cases h : r ∈ P.rigidRow <;> simp [h]

/-- N3. -/
theorem closedBoundary : ClosedBoundary := by
  unfold ClosedBoundary
  intro P π
  have hS : Scoped P := by
    simp [P, Scoped, TypedAttack.shapeSplit, tyVarsOf, rowVarsOf]
  have hE : EqFree P := fun a ha => by simp [P, TypedAttack.shapeSplit] at ha
  have hI : HasInstance P π :=
    ⟨⟨fun _ => .base (), fun _ => Row.empty⟩,
      fun _ h => by simp [P, TypedAttack.shapeSplit] at h,
      fun _ h => by simp [P, TypedAttack.shapeSplit] at h⟩
  obtain ⟨hg, hw⟩ := d3bEqFree P π hS hE hI
  refine ⟨hg, hw, fun θR hR hD _ =>
    TypedAttack.shapeSplit_validFin θR hR.1 hR.2 hD, ?_⟩
  rintro ⟨σ, -, hσ⟩
  let F : CB Nat Unit → CB Nat Bool := Sum.map (fun _ => false) id
  have hm := satMapBase _ F _ _ hσ
  have e : cliftP (TypedAttack.shapeSplit false) = (cliftP P).mapBase F :=
    mapBaseClift P Bool fun _ => false
  rw [mapAssign_combine] at hm
  have hm' : Sat (combine (cliftP (TypedAttack.shapeSplit false))
      (mapAssign F (thetaFree P π)) (mapAssign F σ))
      (cliftP (TypedAttack.shapeSplit false)).B := by
    rw [e]
    exact hm
  let θR : Assign Nat Bool := ⟨fun _ => .base true, fun _ => Row.empty⟩
  have hc : Covers (TypedAttack.shapeSplit false) (mapAssign F (thetaFree P π))
      θR := ⟨fun _ _ => .base true, fun _ _ _ => trivial,
        fun n hn => by
          simp only [TypedAttack.shapeSplit, List.mem_singleton] at hn
          subst hn
          rfl,
        fun r hr => by simp [TypedAttack.shapeSplit] at hr⟩
  obtain ⟨θF, hF, -⟩ := transfer _ _ θR _ hc hm'
  exact TypedAttack.no_solution_at (b := false) (b' := true) (by decide)
    rfl hF

/-! ### N4, N6 -/

/-- N4. -/
theorem routeFreshOn : RouteFreshOn (B := B) := by
  intro π
  have hP : basesOf (routeP : SigProblem Nat B) = [] := by
    simp [basesOf, routeP, basesT, basesF]
  obtain ⟨hg, hw⟩ := d3bEqFree _ π routeP_scoped routeP_eqFree
    (routeP_hasInstance (B := B) π)
  refine ⟨cellEnc, freeConsts routeP,
    ⟨cellEnc_inj, fun S => by simp [written_routeP]⟩,
    ⟨fun _ _ _ _ h => Sum.inr.inj h, fun _ _ b hb => by simp [hP] at hb⟩,
    constsIn_thetaFree _ π, hw, hg⟩

/-- N6. -/
theorem intArmFreshOn : IntArmFreshOn (B := B) := by
  intro b π
  have hS : Scoped (intArmP b) := by
    simp [Scoped, intArmP, tyVarsOf, rowVarsOf]
  have hE : EqFree (intArmP b) := fun a ha => by simp [intArmP] at ha
  have hI : HasInstance (intArmP b) π :=
    ⟨⟨fun _ => .base b, fun _ => Row.empty⟩,
      fun _ h => by simp [intArmP] at h,
      fun _ h => by simp [intArmP] at h⟩
  obtain ⟨hg, hw⟩ := d3bEqFree _ π hS hE hI
  refine ⟨fun S => cellEnc S + 1, freeConsts (intArmP b),
    ⟨fun S S' h => cellEnc_inj S S' (Nat.add_right_cancel h), fun S => ?_⟩,
    ⟨fun _ _ _ _ h => Sum.inr.inj h, fun _ _ _ _ h => by cases h⟩,
    constsIn_thetaFree _ π, hw, hg⟩
  simp [written, labelsOf, intArmP, labelsT, labelsF]

end Composition.Typed
