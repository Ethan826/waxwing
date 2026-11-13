/-
Scope A, S5′ (Statements.lean): the check over `TExprA` is sound atom
by atom, relative to P-G0's two clauses on the existing model (taken as
the hypothesis `PG0Clauses M`) and to S3 (taken as the hypothesis `h3`,
proved elsewhere).

The argument erases the assignment over `GA` to one over `G`
(`eraseAssign`), shows evaluation commutes with erasure
(`evalT_eraseT`), transfers `D` and the binding equations to the erased
problem, and reads definedness and the row tests back. The hypothesis
"no `app` in `D`" is not used: `theorem s5'_of_s3` discharges it with
an unused binder.
-/
import Composition.App.Statements

namespace Composition.App

open Classical Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### Rows mapped pointwise -/

section RowMap

variable {V W : Type}

/-- A row with every present field mapped by `f`. -/
def ermap (f : V → W) (r : Row Label V) : Row Label W :=
  fun k => (r k).map f

omit [DecidableEq Label] in
theorem disjoint_ermap (f : V → W) (r s : Row Label V) :
    Disjoint (ermap f r) (ermap f s) ↔ Disjoint r s := by
  simp [Disjoint, ermap]

omit [DecidableEq Label] in
theorem union_ermap (f : V → W) (r s : Row Label V) :
    union (ermap f r) (ermap f s) = ermap f (union r s) := by
  funext l
  cases h : r l <;> simp [union, ermap, h]

omit [DecidableEq Label] in
theorem compose_ermap (f : V → W) (r s : Row Label V) :
    compose (ermap f r) (ermap f s) = (compose r s).map (ermap f) := by
  unfold compose
  by_cases h : Disjoint r s
  · simp [h, (disjoint_ermap f r s).mpr h, union_ermap]
  · have : ¬ Disjoint (ermap f r) (ermap f s) :=
      fun h' => h ((disjoint_ermap f r s).mp h')
    simp [h, this]

omit [DecidableEq Label] in
theorem composeAll_ermap (f : V → W) (rs : List (Row Label V)) :
    composeAll (rs.map (ermap f)) = (composeAll rs).map (ermap f) := by
  induction rs with
  | nil => rfl
  | cons r rs ih =>
    simp only [List.map_cons, composeAll, ih]
    cases composeAll rs with
    | none => rfl
    | some v => simp [compose_ermap]

end RowMap

/-! ### Erasing an assignment, and evaluation under erasure -/

omit [DecidableEq Label] in
theorem eraseGO_eq (o : Option (GA Label B)) : eraseGO o = o.map eraseG := by
  cases o <;> rfl

/-- The erased assignment `θ₀` of the existing model. -/
def eraseAssign (θ : AssignA Label B) : Assign Label B :=
  ⟨fun n => eraseG (θ.ty n), fun r => ermap eraseG (θ.row r)⟩

omit [DecidableEq Label] in
theorem eraseG_record (r : Row Label (GA Label B)) :
    eraseG (GA.record r) = G.record (ermap eraseG r) := by
  simp only [eraseG, eraseGO_eq]
  rfl

theorem ermap_singleA (l : Label) (g : GA Label B) :
    ermap eraseG (singleA l g) = single l (eraseG g) := by
  funext k
  by_cases h : k = l <;> simp [ermap, singleA, single, h]

mutual
  /-- Step 1: evaluation commutes with erasure. -/
  theorem evalT_eraseT (θ : AssignA Label B) :
      ∀ t : TExprA Label B,
        evalT (eraseAssign θ) (eraseT t) = (evalA θ t).map eraseG
    | .base b => by simp [eraseT, evalT, evalA, eraseG]
    | .arrow t u => by
      simp only [eraseT, evalT, evalA, evalT_eraseT θ t, evalT_eraseT θ u]
      cases evalA θ t <;> cases evalA θ u <;> simp [eraseG]
    | .tvar n => by simp [eraseT, evalT, evalA, eraseAssign]
    | .record fs tails => by
      simp only [eraseT, evalT, evalA, evalF_eraseF θ fs]
      cases evalFA θ fs with
      | none => rfl
      | some fr =>
        have : (ermap eraseG fr :: tails.map (eraseAssign θ).row) =
            (fr :: tails.map θ.row).map (ermap eraseG) := by
          simp [eraseAssign, Function.comp_def]
        simp only [Option.map_some, Option.bind_some, this,
          composeAll_ermap]
        cases composeAll (fr :: tails.map θ.row) <;>
          simp [eraseG_record]
    | .app _ as => by
      simp only [eraseT, evalA, evalArgs_eraseArgs θ as]
      cases evalArgsA θ as <;> simp [eraseG]

  theorem evalF_eraseF (θ : AssignA Label B) :
      ∀ fs : FieldsA Label B,
        evalF (eraseAssign θ) (eraseF fs) = (evalFA θ fs).map (ermap eraseG)
    | .nil => by
      simp only [eraseF, evalF, evalFA, Option.map_some]
      congr
    | .cons l t rest => by
      simp only [eraseF, evalF, evalFA, evalT_eraseT θ t,
        evalF_eraseF θ rest]
      cases evalA θ t with
      | none => rfl
      | some g =>
        cases evalFA θ rest with
        | none => rfl
        | some r =>
          simp [← ermap_singleA, compose_ermap]

  theorem evalArgs_eraseArgs (θ : AssignA Label B) :
      ∀ as : ArgsA Label B,
        evalT (eraseAssign θ) (eraseArgs as) = (evalArgsA θ as).map eraseList
    | .nil => by
      simp [eraseArgs, evalT, evalF, evalArgsA, composeAll, compose_empty,
        eraseList]
      rfl
    | .cons t rest => by
      simp only [eraseArgs, evalT, evalArgsA, evalT_eraseT θ t,
        evalArgs_eraseArgs θ rest]
      cases evalA θ t <;> cases evalArgsA θ rest <;> simp [eraseList]
end

/-! ### Step 2: satisfaction transfers to the erased problem -/

theorem holds_erase (θ : AssignA Label B) (a : AtomA Label B)
    (h : HoldsA θ a) : Holds (eraseAssign θ) (eraseAtom a) := by
  cases a with
  | eq t u =>
    obtain ⟨g, ht, hu⟩ := h
    exact ⟨eraseG g, by simp [evalT_eraseT, ht], by simp [evalT_eraseT, hu]⟩
  | lacks r l =>
    simp only [HoldsA] at h
    simp [eraseAtom, Holds, eraseAssign, ermap, h]
  | disjoint r s =>
    simp only [HoldsA] at h
    exact (disjoint_ermap eraseG _ _).mpr h
  | ff => exact h

theorem sat_erase (θ : AssignA Label B) (C : ProblemA Label B)
    (h : SatA θ C) : Sat (eraseAssign θ) (C.map eraseAtom) := by
  intro a ha
  obtain ⟨a', ha', rfl⟩ := List.mem_map.mp ha
  exact holds_erase θ a' (h a' ha')

omit [DecidableEq Label] in
/-- The binding equations of the erased substitution are the erased
binding equations. -/
theorem eqs_eraseS (σ : SubstA Label B) :
    eqs (eraseS σ) = (eqsA σ).map eraseAtom := by
  simp [eqs, eqsA, eraseS, List.map_append, Function.comp_def, eraseAtom,
    eraseT, eraseF]

/-! ### S5′ -/

theorem s5'_of_s3 (h3 : S3 (Label := Label) (B := B)) :
    S5' (Label := Label) (B := B) := by
  intro M hM P σ _hD hC θ hθD hθσ a ha
  have hD0 : Sat (eraseAssign θ) (eraseP P).D := sat_erase θ P.D hθD
  have hσ0 : Sat (eraseAssign θ) (eqs (eraseS σ)) := by
    rw [eqs_eraseS]; exact sat_erase θ _ hθσ
  obtain ⟨hdef, hrow⟩ := hM (eraseP P) (eraseS σ) (eraseAssign θ) hD0 hσ0
  have hca := hC a ha
  cases a with
  | eq t u =>
    obtain ⟨hsyn, hok⟩ := hca
    have hs := hdef _ hok
    rw [evalT_eraseT, Option.isSome_map] at hs
    obtain ⟨g, hg⟩ := Option.isSome_iff_exists.mp hs
    refine ⟨g, ?_, ?_⟩
    · rw [← h3 θ σ hθσ t]; exact hg
    · rw [← h3 θ σ hθσ u, ← hsyn]; exact hg
  | lacks r l =>
    have h := hrow (.lacks r l) (.inl ⟨r, l, rfl⟩) hca
    simp only [Holds, eraseAssign, ermap, Option.map_eq_none_iff] at h
    exact h
  | disjoint r s =>
    have h := hrow (.disjoint r s) (.inr ⟨r, s, rfl⟩) hca
    exact (disjoint_ermap eraseG _ _).mp h
  | ff => exact hca.elim

/-! ### Non-vacuity: the semantic check satisfies P-G0's clauses -/

/-- The semantic check: a term is defined when it evaluates under every
assignment satisfying `D` and any binding equations; a row atom is
accepted when it holds under every assignment satisfying `D` and the
candidate's binding equations. -/
def semCheck : Check0 Label B where
  DefOK P u := ∀ (σ : Subst Label B) (θ : Assign Label B),
    Sat θ P.D → Sat θ (eqs σ) → (evalT θ u).isSome
  RowOK P σ a := ∀ θ : Assign Label B, Sat θ P.D → Sat θ (eqs σ) → Holds θ a

theorem pg0Clauses_semCheck : PG0Clauses (semCheck (Label := Label) (B := B)) :=
  fun _ σ θ hD hσ => ⟨fun _ h => h σ θ hD hσ, fun _ _ h => h θ hD hσ⟩

/-- The semantic check accepts a problem whose `B` holds an equation
between applications, with no `D`: `app 0 [tvar 0] = app 0 [base b]`
under `σ` binding `0` to `base b`. -/
example (b : B) :
    CheckA (semCheck (Label := Label) (B := B))
      ⟨[], [], [], [.eq (.app 0 (.cons (.tvar 0) .nil))
                        (.app 0 (.cons (.base b) .nil))]⟩
      ⟨[(0, .base b)], []⟩ := by
  intro a ha
  simp only [List.mem_singleton] at ha
  subst ha
  refine ⟨by simp [substTA, substArgsA], ?_⟩
  intro σ θ _ _
  simp [substTA, substArgsA, eraseT, eraseArgs, evalT, evalF, composeAll,
    compose_empty]

/-- With the example's check accepted, S5′ (from S3) gives the equation
under every assignment satisfying the binding equation. -/
example (h3 : S3 (Label := Label) (B := B)) (b : B) (θ : AssignA Label B)
    (hθ : θ.ty 0 = .base b) :
    HoldsA θ (.eq (.app 0 (.cons (.tvar 0) .nil))
                  (.app 0 (.cons (.base b) .nil))) := by
  have hc : CheckA (semCheck (Label := Label) (B := B))
      ⟨[], [], [], [.eq (.app 0 (.cons (.tvar 0) .nil))
                        (.app 0 (.cons (.base b) .nil))]⟩
      ⟨[(0, .base b)], []⟩ := by
    intro a ha
    simp only [List.mem_singleton] at ha
    subst ha
    refine ⟨by simp [substTA, substArgsA], ?_⟩
    intro σ θ _ _
    simp [substTA, substArgsA, eraseT, eraseArgs, evalT, evalF, composeAll,
      compose_empty]
  refine s5'_of_s3 h3 semCheck pg0Clauses_semCheck _ _ (by simp) hc θ
    (by simp [SatA]) ?_ _ (List.mem_singleton_self _)
  intro a ha
  simp [eqsA] at ha
  subst ha
  exact ⟨.base b, by simp [evalA, hθ], by simp [evalA]⟩

end Composition.App
