/-
Proofs of the structural building blocks E1, E4, E5 and E6
(Bridge/Extension.lean): renaming bases is a functor on syntax that
keeps labels, variables and atom shapes. Each is an induction on
`TExpr`/`Fields`.
-/
import Composition.Typed.Bridge.Extension

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B₁ B₂ : Type}

mutual
  theorem mapBaseT_id : ∀ t : TExpr Label B, mapBaseT id t = t
    | .base _ => rfl
    | .arrow t u => by simp [mapBaseT, mapBaseT_id t, mapBaseT_id u]
    | .tvar _ => rfl
    | .record fs _ => by simp [mapBaseT, mapBaseF_id fs]

  theorem mapBaseF_id : ∀ fs : Fields Label B, mapBaseF id fs = fs
    | .nil => rfl
    | .cons _ t rest => by simp [mapBaseF, mapBaseT_id t, mapBaseF_id rest]
end

theorem mapBaseAtom_id : ∀ a : Atom Label B, mapBaseAtom id a = a
  | .eq t u => by simp [mapBaseAtom, mapBaseT_id]
  | .lacks _ _ | .disjoint _ _ | .ff => rfl

mutual
  theorem mapBaseT_comp (f : B → B₁) (g : B₁ → B₂) :
      ∀ t : TExpr Label B, mapBaseT g (mapBaseT f t) = mapBaseT (g ∘ f) t
    | .base _ => rfl
    | .arrow t u => by
      simp [mapBaseT, mapBaseT_comp f g t, mapBaseT_comp f g u]
    | .tvar _ => rfl
    | .record fs _ => by simp [mapBaseT, mapBaseF_comp f g fs]

  theorem mapBaseF_comp (f : B → B₁) (g : B₁ → B₂) :
      ∀ fs : Fields Label B, mapBaseF g (mapBaseF f fs) = mapBaseF (g ∘ f) fs
    | .nil => rfl
    | .cons _ t rest => by
      simp [mapBaseF, mapBaseT_comp f g t, mapBaseF_comp f g rest]
end

theorem mapBaseAtom_comp (f : B → B₁) (g : B₁ → B₂) :
    ∀ a : Atom Label B,
      mapBaseAtom g (mapBaseAtom f a) = mapBaseAtom (g ∘ f) a
  | .eq t u => by simp [mapBaseAtom, mapBaseT_comp]
  | .lacks _ _ | .disjoint _ _ | .ff => rfl

/-! ### What renaming keeps: labels, variables; what it maps: bases -/

mutual
  theorem labelsT_map (f : B → B₁) :
      ∀ t : TExpr Label B, labelsT (mapBaseT f t) = labelsT t
    | .base _ | .tvar _ => rfl
    | .arrow t u => by simp [mapBaseT, labelsT, labelsT_map f t,
        labelsT_map f u]
    | .record fs _ => by simp [mapBaseT, labelsT, labelsF_map f fs]

  theorem labelsF_map (f : B → B₁) :
      ∀ fs : Fields Label B, labelsF (mapBaseF f fs) = labelsF fs
    | .nil => rfl
    | .cons _ t rest => by simp [mapBaseF, labelsF, labelsT_map f t,
        labelsF_map f rest]
end

mutual
  theorem tyVarsT_map (f : B → B₁) :
      ∀ t : TExpr Label B, tyVarsT (mapBaseT f t) = tyVarsT t
    | .base _ | .tvar _ => rfl
    | .arrow t u => by simp [mapBaseT, tyVarsT, tyVarsT_map f t,
        tyVarsT_map f u]
    | .record fs _ => by simp [mapBaseT, tyVarsT, tyVarsF_map f fs]

  theorem tyVarsF_map (f : B → B₁) :
      ∀ fs : Fields Label B, tyVarsF (mapBaseF f fs) = tyVarsF fs
    | .nil => rfl
    | .cons _ t rest => by simp [mapBaseF, tyVarsF, tyVarsT_map f t,
        tyVarsF_map f rest]
end

mutual
  theorem rowVarsT_map (f : B → B₁) :
      ∀ t : TExpr Label B, rowVarsT (mapBaseT f t) = rowVarsT t
    | .base _ | .tvar _ => rfl
    | .arrow t u => by simp [mapBaseT, rowVarsT, rowVarsT_map f t,
        rowVarsT_map f u]
    | .record fs _ => by simp [mapBaseT, rowVarsT, rowVarsF_map f fs]

  theorem rowVarsF_map (f : B → B₁) :
      ∀ fs : Fields Label B, rowVarsF (mapBaseF f fs) = rowVarsF fs
    | .nil => rfl
    | .cons _ t rest => by simp [mapBaseF, rowVarsF, rowVarsT_map f t,
        rowVarsF_map f rest]
end

mutual
  theorem basesT_map (f : B → B₁) :
      ∀ t : TExpr Label B, basesT (mapBaseT f t) = (basesT t).map f
    | .base _ | .tvar _ => rfl
    | .arrow t u => by simp [mapBaseT, basesT, basesT_map f t,
        basesT_map f u]
    | .record fs _ => by simp [mapBaseT, basesT, basesF_map f fs]

  theorem basesF_map (f : B → B₁) :
      ∀ fs : Fields Label B, basesF (mapBaseF f fs) = (basesF fs).map f
    | .nil => rfl
    | .cons _ t rest => by simp [mapBaseF, basesF, basesT_map f t,
        basesF_map f rest]
end

mutual
  theorem cliftT_map (f : B → B₁) : ∀ t : TExpr Label B,
      cliftT (mapBaseT f t) =
        mapBaseT (Sum.map f id) (cliftT (Label := Label) t)
    | .base _ | .tvar _ => rfl
    | .arrow t u => by simp [mapBaseT, cliftT, cliftT_map f t,
        cliftT_map f u]
    | .record fs _ => by simp [mapBaseT, cliftT, cliftF_map f fs]

  theorem cliftF_map (f : B → B₁) : ∀ fs : Fields Label B,
      cliftF (mapBaseF f fs) =
        mapBaseF (Sum.map f id) (cliftF (Label := Label) fs)
    | .nil => rfl
    | .cons _ t rest => by simp [mapBaseF, cliftF, cliftT_map f t,
        cliftF_map f rest]
end

theorem labelsOf_map (f : B → B₁) (C : Problem Label B) :
    labelsOf (C.map (mapBaseAtom f)) = labelsOf C := by
  induction C with
  | nil => rfl
  | cons a C ih =>
    cases a <;> simp_all [labelsOf, mapBaseAtom, labelsT_map]

theorem tyVarsOf_map (f : B → B₁) (C : Problem Label B) :
    tyVarsOf (C.map (mapBaseAtom f)) = tyVarsOf C := by
  induction C with
  | nil => rfl
  | cons a C ih =>
    cases a <;> simp_all [tyVarsOf, mapBaseAtom, tyVarsT_map]

theorem rowVarsOf_map (f : B → B₁) (C : Problem Label B) :
    rowVarsOf (C.map (mapBaseAtom f)) = rowVarsOf C := by
  induction C with
  | nil => rfl
  | cons a C ih =>
    cases a <;> simp_all [rowVarsOf, mapBaseAtom, rowVarsT_map]

/-- E1. -/
theorem mapBaseId : MapBaseId (Label := Label) (B := B) := by
  rintro ⟨rt, rr, D, Bd⟩
  simp [SigProblem.mapBase, funext mapBaseAtom_id]

/-- E4. -/
theorem mapBaseComp : MapBaseComp (Label := Label) (B := B) := by
  intro P B₁ B₂ f g
  simp [SigProblem.mapBase, Function.comp_def, mapBaseAtom_comp]

/-- E5. -/
theorem mapBaseSyntax : MapBaseSyntax (Label := Label) (B := B) := by
  intro P B₁ f
  refine ⟨?_, ?_, ?_⟩
  · simp [written, SigProblem.mapBase, ← List.map_append, labelsOf_map]
  · simp only [basesOf, SigProblem.mapBase, ← List.map_append,
      List.flatMap_map, List.map_flatMap]
    congr 1
    funext a
    cases a <;> simp [mapBaseAtom, basesT_map]
  · simp [Scoped, SigProblem.mapBase, tyVarsOf_map, rowVarsOf_map]

/-- E6. -/
theorem mapBaseClift : MapBaseClift (Label := Label) (B := B) := by
  intro P B₁ f
  have h : ∀ a : Atom Label B, cliftAtom (mapBaseAtom f a) =
      mapBaseAtom (Sum.map f id) (cliftAtom a) := by
    intro a
    cases a <;> simp [cliftAtom, mapBaseAtom, cliftT_map]
  simp [cliftP, SigProblem.mapBase, Function.comp_def, h]

end Composition.Typed
