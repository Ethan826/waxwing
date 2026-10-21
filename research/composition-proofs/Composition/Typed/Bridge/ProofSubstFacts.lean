/-
Helper facts about renaming and substituting bases (statements.md
§10.6): finiteness is kept (`FinSubstBase`, `FinMapG`), renamings
compose on values (`MapAssignComp`), and presence is unchanged, so
patterns are kept (`InPatternSubst`). `CombineMap` is
`mapAssign_combine` (ProofExamplesFresh.lean).
-/
import Composition.Typed.Bridge.ProofSat
import Composition.Typed.Model

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B₁ B₂ : Type}

mutual
  /-- `FinSubstBase`. -/
  theorem fin_substBase {s : B₁ → G Label B₂} (hs : ∀ b, FinG (s b)) :
      ∀ v : G Label B₁, FinG v → FinG (substBase s v)
    | .base b, _ => hs b
    | .arrow a c, hv => ⟨fin_substBase hs a hv.1, fin_substBase hs c hv.2⟩
    | .record r, hv => by
      obtain ⟨⟨ls, hls⟩, hr⟩ := (finG_record r).mp hv
      exact (finG_record _).mpr
        ⟨⟨ls, fun k hk => hls k fun hn => hk (substBaseO_none.mpr hn)⟩,
          fun k => fin_substBaseO hs (r k) (hr k)⟩

  theorem fin_substBaseO {s : B₁ → G Label B₂} (hs : ∀ b, FinG (s b)) :
      ∀ o : Option (G Label B₁), FinO o → FinO (substBaseO s o)
    | none, _ => trivial
    | some v, hv => fin_substBase hs v hv
end

/-- `FinMapG`. -/
theorem fin_mapG (f : B → B₁) (v : G Label B) (hv : FinG v) :
    FinG (mapG f v) := by
  rw [mapG_eq]
  exact fin_substBase (s := fun b => .base (f b)) (fun _ => trivial) v hv

theorem finAssign_mapAssign (f : B → B₁) {θ : Assign Label B}
    (hθ : FinAssign θ) : FinAssign (mapAssign f θ) :=
  ⟨fun n => fin_mapG f _ (hθ.1 n), fun r => fin_mapG f _ (hθ.2 r)⟩

mutual
  theorem mapG_comp (f : B → B₁) (g : B₁ → B₂) :
      ∀ v : G Label B, mapG g (mapG f v) = mapG (g ∘ f) v
    | .base _ => rfl
    | .arrow a c => by simp [mapG, mapG_comp f g a, mapG_comp f g c]
    | .record r => by
      simp only [mapG, G.record.injEq]
      funext k
      exact mapGO_comp f g (r k)

  theorem mapGO_comp (f : B → B₁) (g : B₁ → B₂) :
      ∀ o : Option (G Label B), mapGO g (mapGO f o) = mapGO (g ∘ f) o
    | none => rfl
    | some v => by simp [mapGO, mapG_comp f g v]
end

/-- `MapAssignComp`. -/
theorem mapAssign_comp (f : B → B₁) (g : B₁ → B₂) (θ : Assign Label B) :
    mapAssign g (mapAssign f θ) = mapAssign (g ∘ f) θ := by
  simp [mapAssign, mapG_comp, mapGO_comp]

/-- `InPatternSubst`: substituting bases keeps every row's presence, so
an instance of pattern `π` stays one. -/
theorem inPattern_substAssign {P : SigProblem Label B}
    {P' : SigProblem Label B₂} (hrow : P'.rigidRow = P.rigidRow)
    (hw : written P' = written P) {π : Pattern Label}
    (s : B₁ → G Label B₂) {θ : Assign Label B₁}
    (h : ∀ r ∈ P.rigidRow, ∀ l ∈ written P, (θ.row r l).isSome = π r l) :
    InPattern P' π (substAssign s θ) := by
  intro r hr l hl
  show (substBaseO s (θ.row r l)).isSome = _
  rw [hrow] at hr
  rw [hw] at hl
  rw [← h r hr l hl]
  cases θ.row r l <;> rfl

end Composition.Typed
