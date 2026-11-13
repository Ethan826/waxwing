/-
Scope A, S2 and S3 (Composition.App.Statements). S2: evaluation commutes
with the embedding of the existing model, because composing rows only
reads which labels are present, and mapping a row's values does not
change that. S3: substitution preserves values under its binding
equations, by the argument of `Composition.Syntax.subst_evalT`
(Correspond.lean) with one more case, applications, whose arguments are
handled by a third mutual clause.
-/
import Composition.App.Statements
import Composition.Correspond

namespace Composition.App

open Classical Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ## S2 -/

/-- Map the values of a row. -/
private def rmap {V W : Type} (f : V → W) (r : Row Label V) : Row Label W :=
  fun k => (r k).map f

omit [DecidableEq Label] in
private theorem rmap_disjoint {V W : Type} (f : V → W) (r s : Row Label V) :
    Disjoint (rmap f r) (rmap f s) ↔ Disjoint r s := by
  simp [Disjoint, rmap]

omit [DecidableEq Label] in
private theorem rmap_union {V W : Type} (f : V → W) (r s : Row Label V) :
    union (rmap f r) (rmap f s) = rmap f (union r s) := by
  funext k
  simp only [union, rmap]
  cases r k <;> rfl

omit [DecidableEq Label] in
private theorem rmap_compose {V W : Type} (f : V → W) (r s : Row Label V) :
    compose (rmap f r) (rmap f s) = (compose r s).map (rmap f) := by
  unfold compose
  by_cases h : Disjoint r s
  · simp [h, rmap_disjoint, rmap_union]
  · simp [h, rmap_disjoint]

omit [DecidableEq Label] in
private theorem rmap_composeAll {V W : Type} (f : V → W) :
    ∀ xs : List (Row Label V),
      composeAll (xs.map (rmap f)) = (composeAll xs).map (rmap f)
  | [] => by
    simp only [List.map, composeAll, Option.map_some]
    congr
  | x :: xs => by
    simp only [List.map, composeAll, rmap_composeAll f xs]
    cases composeAll xs with
    | none => rfl
    | some v => simp [rmap_compose]

omit [DecidableEq Label] in
private theorem embedGO_eq : ∀ o : Option (G Label B),
    embedGO o = o.map embedG
  | none => by simp [embedGO]
  | some g => by simp [embedGO]

omit [DecidableEq Label] in
private theorem embedG_record (v : Row Label (G Label B)) :
    embedG (G.record v) = GA.record (rmap embedG v) := by
  simp only [embedG, embedGO_eq]
  rfl

private theorem singleA_embed (l : Label) (g : G Label B) :
    singleA l (embedG g) = rmap embedG (single l g) := by
  funext k
  by_cases h : k = l <;> simp [singleA, single, rmap, h]

mutual
  private theorem s2T (θ : Assign Label B) :
      ∀ t : TExpr Label B,
        evalA (embedAssign θ) (embedT t) = (evalT θ t).map embedG
    | .base b => by simp [embedT, evalA, evalT, embedG]
    | .arrow t u => by
      simp only [embedT, evalA, evalT, s2T θ t, s2T θ u]
      cases evalT θ t <;> cases evalT θ u <;> simp [embedG]
    | .tvar n => by simp [embedT, evalA, evalT, embedAssign]
    | .record fs tails => by
      simp only [embedT, evalA, evalT, s2F θ fs]
      cases evalF θ fs with
      | none => rfl
      | some fr =>
        have ht : tails.map (embedAssign θ).row =
            (tails.map θ.row).map (rmap embedG) := by
          simp only [List.map_map]
          rfl
        simp only [Option.map_some, Option.bind_some, ht, ← List.map_cons,
          rmap_composeAll]
        cases composeAll (fr :: tails.map θ.row) <;>
          simp [embedG_record]

  private theorem s2F (θ : Assign Label B) :
      ∀ fs : Fields Label B,
        evalFA (embedAssign θ) (embedF fs) = (evalF θ fs).map (rmap embedG)
    | .nil => by
      simp only [embedF, evalFA, evalF, Option.map_some]
      congr
    | .cons l t rest => by
      simp only [embedF, evalFA, evalF, s2T θ t, s2F θ rest]
      cases evalT θ t with
      | none => rfl
      | some g =>
        cases evalF θ rest with
        | none => rfl
        | some r => simp [singleA_embed, rmap_compose]
end

theorem s2 : S2 (Label := Label) (B := B) := s2T

/-! ## S3 -/

/-- The one-field rows of written fields, as `fieldRows`. -/
private noncomputable def fieldRowsA (θ : AssignA Label B) :
    FieldsA Label B → Option (List (Row Label (GA Label B)))
  | .nil => some []
  | .cons l t rest =>
    (evalA θ t).bind fun g => (fieldRowsA θ rest).map (singleA l g :: ·)

private theorem evalFA_eq (θ : AssignA Label B) :
    ∀ fs : FieldsA Label B,
      evalFA θ fs = (fieldRowsA θ fs).bind composeAll
  | .nil => by simp [evalFA, fieldRowsA, composeAll]
  | .cons l t rest => by
    rw [evalFA, fieldRowsA, evalFA_eq θ rest]
    cases evalA θ t <;> cases fieldRowsA θ rest <;> rfl

private theorem evalA_record (θ : AssignA Label B) (fs : FieldsA Label B)
    (tails : List Nat) :
    evalA θ (.record fs tails) =
      ((fieldRowsA θ fs).bind fun frs =>
        composeAll (frs ++ tails.map θ.row)).map GA.record := by
  rw [evalA, evalFA_eq, Option.bind_assoc]
  cases fieldRowsA θ fs with
  | none => rfl
  | some frs =>
    simp only [Option.bind_some, composeAll, composeAll_append]
    rw [bind_comm]
    cases composeAll frs <;> cases composeAll (tails.map θ.row) <;> rfl

private theorem fieldRowsA_append (θ : AssignA Label B) :
    ∀ a b : FieldsA Label B,
      fieldRowsA θ (a.append b) =
        (fieldRowsA θ a).bind fun xs => (fieldRowsA θ b).map (xs ++ ·)
  | .nil, b => by
    simp [FieldsA.append, fieldRowsA]
  | .cons l t rest, b => by
    rw [FieldsA.append, fieldRowsA, fieldRowsA, fieldRowsA_append θ rest b]
    cases evalA θ t <;> cases fieldRowsA θ rest <;>
      cases fieldRowsA θ b <;> rfl

private theorem rowOfA_eval {θ : AssignA Label B} {σ : SubstA Label B}
    (he : SatA θ (eqsA σ)) (r : Nat) :
    ∃ frs, fieldRowsA θ (rowOfA σ r).1 = some frs ∧
      composeAll (frs ++ (rowOfA σ r).2.map θ.row) = some (θ.row r) := by
  unfold rowOfA
  cases hl : σ.row.lookup r with
  | none => exact ⟨[], rfl, composeAll_single _⟩
  | some p =>
    have hm := lookup_mem hl
    have := he _ (List.mem_append_right _ (List.mem_map.mpr ⟨_, hm, rfl⟩))
    obtain ⟨g, h1, h2⟩ := this
    rw [evalA_record] at h1 h2
    simp [fieldRowsA, composeAll_single] at h1
    subst h1
    simp only [Option.getD_some]
    cases hf : fieldRowsA θ p.1 with
    | none => simp [hf] at h2
    | some frs =>
      simp only [hf, Option.bind_some, Option.map_eq_some_iff] at h2
      obtain ⟨v, hv, hrec⟩ := h2
      cases hrec
      exact ⟨frs, rfl, hv⟩

private theorem expandTailsA_eval {θ : AssignA Label B} {σ : SubstA Label B}
    (he : SatA θ (eqsA σ)) :
    ∀ tails : List Nat, ∃ frs,
      fieldRowsA θ (expandTailsA σ tails).1 = some frs ∧
      composeAll (frs ++ (expandTailsA σ tails).2.map θ.row) =
        composeAll (tails.map θ.row)
  | [] => ⟨[], rfl, rfl⟩
  | r :: rs => by
    obtain ⟨f1, hf1, hc1⟩ := rowOfA_eval he r
    obtain ⟨f2, hf2, hc2⟩ := expandTailsA_eval he rs
    refine ⟨f1 ++ f2, ?_, ?_⟩
    · simp [expandTailsA, fieldRowsA_append, hf1, hf2]
    · simp only [expandTailsA, List.map_append]
      rw [composeAll_perm (perm_middle _ _ _ _), composeAll_append, hc2,
        hc1]
      simp [composeAll]

mutual
  private theorem s3T {θ : AssignA Label B} {σ : SubstA Label B}
      (he : SatA θ (eqsA σ)) :
      ∀ t : TExprA Label B, evalA θ (substTA σ t) = evalA θ t
    | .base _ => by simp [substTA]
    | .arrow t u => by
      simp [substTA, evalA, s3T he t, s3T he u]
    | .tvar n => by
      simp only [substTA]
      cases hl : σ.ty.lookup n with
      | none => rfl
      | some t =>
        have := he _ (List.mem_append_left _
          (List.mem_map.mpr ⟨_, lookup_mem hl, rfl⟩))
        obtain ⟨g, h1, h2⟩ := this
        simp [evalA] at h1
        simp [h2, evalA, h1]
    | .record fs tails => by
      obtain ⟨fe, hfe, hce⟩ := expandTailsA_eval he tails
      rw [substTA, evalA_record, evalA_record, fieldRowsA_append,
        s3F he fs, hfe]
      cases fieldRowsA θ fs with
      | none => rfl
      | some xs =>
        simp only [Option.bind_some, Option.map_some]
        rw [List.append_assoc, composeAll_congr xs _ _ hce]
    | .app t as => by
      simp [substTA, evalA, s3Args he as]

  private theorem s3F {θ : AssignA Label B} {σ : SubstA Label B}
      (he : SatA θ (eqsA σ)) :
      ∀ fs : FieldsA Label B, fieldRowsA θ (substFA σ fs) = fieldRowsA θ fs
    | .nil => rfl
    | .cons l t rest => by
      simp [substFA, fieldRowsA, s3T he t, s3F he rest]

  private theorem s3Args {θ : AssignA Label B} {σ : SubstA Label B}
      (he : SatA θ (eqsA σ)) :
      ∀ as : ArgsA Label B, evalArgsA θ (substArgsA σ as) = evalArgsA θ as
    | .nil => by simp [substArgsA]
    | .cons t rest => by
      simp [substArgsA, evalArgsA, s3T he t, s3Args he rest]
end

theorem s3 : S3 (Label := Label) (B := B) := fun _ _ he => s3T he

/-- S3 at a concrete application: with type variable 0 bound to
`app 0 (cons (tvar 1) nil)`, the expression `app 2 (cons (tvar 0) nil)`
keeps its value under any assignment satisfying the binding equation. -/
example (θ : AssignA Label B)
    (he : SatA θ (eqsA (⟨[(0, .app 0 (.cons (.tvar 1) .nil))], []⟩ :
      SubstA Label B))) :
    evalA θ (substTA ⟨[(0, .app 0 (.cons (.tvar 1) .nil))], []⟩
        (.app 2 (.cons (.tvar 0) .nil))) =
      evalA θ (.app 2 (.cons (.tvar 0) .nil)) :=
  s3 θ _ he _

end Composition.App
