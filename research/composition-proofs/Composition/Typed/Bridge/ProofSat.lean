/-
Positivity (E2, E2′; Bridge/Extension.lean), the pattern of `transfer`
and `holds_up` for a value substitution `s`. `substBase s` acts on a
row label by label (`substRow`), so it maps disjoint rows to disjoint
rows, unions to unions and compositions to compositions with no side
condition. Hence it commutes with evaluation wherever every written
base `g b` goes to the base `h b`; `lacks` and `disjoint` hold label by
label. Renaming (`mapG f`) is the substitution `base ∘ f`.
-/
import Composition.Typed.Bridge.ProofExtension

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B₁ B₂ : Type} [DecidableEq Label]

/-- `substBase` on a row, label by label. -/
def substRow (s : B₁ → G Label B₂) (r : Row Label (G Label B₁)) :
    Row Label (G Label B₂) := fun k => substBaseO s (r k)

section Rows

omit [DecidableEq Label]
variable {s : B₁ → G Label B₂}

theorem substBaseO_eq (o : Option (G Label B₁)) :
    substBaseO s o = o.map (substBase s) := by
  cases o <;> rfl

theorem substBaseO_none {o : Option (G Label B₁)} :
    substBaseO s o = none ↔ o = none := by
  cases o <;> simp [substBaseO]

theorem substRow_disjoint {r r' : Row Label (G Label B₁)} :
    Composition.Disjoint (substRow s r) (substRow s r') ↔
      Composition.Disjoint r r' := by
  simp [Composition.Disjoint, substRow, substBaseO_none]

theorem substRow_union (r r' : Row Label (G Label B₁)) :
    substRow s (union r r') = union (substRow s r) (substRow s r') := by
  funext k
  cases h : r k <;> simp [substRow, union, h, substBaseO]

theorem compose_substRow (r r' : Row Label (G Label B₁)) :
    compose (substRow s r) (substRow s r') =
      (compose r r').map (substRow s) := by
  by_cases h : Composition.Disjoint r r'
  · simp [compose, h, substRow_disjoint.mpr h, substRow_union]
  · have h' : ¬ Composition.Disjoint (substRow s r) (substRow s r') :=
      fun h' => h (substRow_disjoint.mp h')
    simp [compose, h, h']

theorem composeAll_substRow : ∀ xs : List (Row Label (G Label B₁)),
    composeAll (xs.map (substRow s)) = (composeAll xs).map (substRow s)
  | [] => rfl
  | x :: xs => by
    simp only [List.map_cons, composeAll, composeAll_substRow xs]
    cases composeAll xs <;> simp [compose_substRow]

end Rows

theorem substRow_single {s : B₁ → G Label B₂} (l : Label)
    (v : G Label B₁) :
    substRow s (single l v) = single l (substBase s v) := by
  funext k
  by_cases hk : k = l <;> simp [substRow, single, hk, substBaseO]

variable {g : B → B₁} {h : B → B₂} {s : B₁ → G Label B₂}
  {θ : Assign Label B₁}

mutual
  /-- Substitution commutes with evaluation where written bases agree. -/
  theorem evalT_subst : ∀ t : TExpr Label B,
      (∀ b ∈ basesT t, s (g b) = .base (h b)) →
      evalT (substAssign s θ) (mapBaseT h t) =
        (evalT θ (mapBaseT g t)).map (substBase s)
    | .base b, hb => by
      simp [mapBaseT, evalT, substBase, hb b (by simp [basesT])]
    | .arrow t u, hb => by
      have ht := evalT_subst t fun b m => hb b (by simp [basesT, m])
      have hu := evalT_subst u fun b m => hb b (by simp [basesT, m])
      simp only [mapBaseT, evalT, ht, hu]
      cases evalT θ (mapBaseT g t) <;> cases evalT θ (mapBaseT g u) <;>
        simp [substBase]
    | .tvar n, _ => by simp [mapBaseT, evalT, substAssign]
    | .record fs tails, hb => by
      have hf := evalF_subst fs fun b m => hb b (by simpa [basesT] using m)
      have hrows : tails.map (substAssign s θ).row =
          (tails.map θ.row).map (substRow s) := by
        simp only [List.map_map]
        rfl
      simp only [mapBaseT, evalT, hf, hrows]
      cases evalF θ (mapBaseF g fs) with
      | none => rfl
      | some fr =>
        have := composeAll_substRow (s := s) (fr :: tails.map θ.row)
        simp only [List.map_cons] at this
        simp only [Option.map_some, Option.bind_some, this]
        cases composeAll (fr :: tails.map θ.row) <;> simp [substBase] <;>
          rfl

  theorem evalF_subst : ∀ fs : Fields Label B,
      (∀ b ∈ basesF fs, s (g b) = .base (h b)) →
      evalF (substAssign s θ) (mapBaseF h fs) =
        (evalF θ (mapBaseF g fs)).map (substRow s)
    | .nil, _ => by
      simp only [mapBaseF, evalF, Option.map_some]
      congr 1
    | .cons l t rest, hb => by
      have ht := evalT_subst t fun b m => hb b (by simp [basesF, m])
      have hr := evalF_subst rest fun b m => hb b (by simp [basesF, m])
      simp only [mapBaseF, evalF, ht, hr]
      cases evalT θ (mapBaseT g t) <;> cases evalF θ (mapBaseF g rest) <;>
        simp [← substRow_single, compose_substRow]
end

/-- Each atom's satisfaction is carried along the substitution. -/
theorem holds_subst : ∀ a : Atom Label B,
    (∀ t u, a = .eq t u → ∀ b ∈ basesT t ++ basesT u,
      s (g b) = .base (h b)) →
    Holds θ (mapBaseAtom g a) → Holds (substAssign s θ) (mapBaseAtom h a)
  | .eq t u, hb, ⟨v, h1, h2⟩ => by
    have hb' := hb t u rfl
    refine ⟨substBase s v, ?_, ?_⟩
    · rw [evalT_subst t fun b m => hb' b (by simp [m]), h1]
      rfl
    · rw [evalT_subst u fun b m => hb' b (by simp [m]), h2]
      rfl
  | .lacks r l, _, hl => by
    show substBaseO s (θ.row r l) = none
    exact substBaseO_none.mpr hl
  | .disjoint r r', _, hd => substRow_disjoint.mpr hd
  | .ff, _, hf => hf

/-- E2′. -/
theorem satSubstBase : SatSubstBase (Label := Label) (B := B) := by
  intro P B₁ B₂ g h s θ C hs hC hsat a ha
  obtain ⟨a', ha', rfl⟩ := List.mem_map.mp ha
  refine holds_subst a' (fun t u he b hm => hs b ?_)
    (hsat _ (List.mem_map_of_mem ha'))
  subst he
  exact List.mem_flatMap.mpr ⟨.eq t u, hC _ ha', hm⟩

omit [DecidableEq Label] in
mutual
  theorem mapG_eq (f : B → B₁) : ∀ v : G Label B,
      mapG f v = substBase (fun b => .base (f b)) v
    | .base _ => rfl
    | .arrow a c => by simp [mapG, substBase, mapG_eq f a, mapG_eq f c]
    | .record r => by
      simp only [mapG, substBase, G.record.injEq]
      funext k
      exact mapGO_eq f (r k)

  theorem mapGO_eq (f : B → B₁) : ∀ o : Option (G Label B),
      mapGO f o = substBaseO (fun b => .base (f b)) o
    | none => rfl
    | some v => by simp [mapGO, substBaseO, mapG_eq f v]
end

/-- E2. -/
theorem satMapBase : SatMapBase (Label := Label) (B := B) := by
  intro B₁ f θ C hsat a ha
  obtain ⟨a', ha', rfl⟩ := List.mem_map.mp ha
  have he : mapAssign f θ = substAssign (fun b => .base (f b)) θ := by
    simp only [mapAssign, substAssign, mapG_eq, mapGO_eq]
  rw [he]
  have h0 : Holds θ (mapBaseAtom id a') := by
    rw [mapBaseAtom_id]
    exact hsat a' ha'
  exact holds_subst (g := id) a' (fun _ _ _ _ _ => rfl) h0

end Composition.Typed
