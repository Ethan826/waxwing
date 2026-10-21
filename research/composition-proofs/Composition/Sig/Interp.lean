/-
The interpretation `h` (dossier §14.3, as amended in §14.8) and L2: it
maps generic values into the ground model of one rigid assignment `θ`.
Constants become `θ`'s values (`c`, arbitrary, where `θ` gives none);
a written label maps field by field; at an unwritten label `k`, a row
takes `θ`'s field at `k` from the rigid row whose rest it holds and
which holds `k`. Under W3 and `θ`'s declared disjointness that row is
unique (`restWit_unique`), so `h` commutes with composition
(`hRow_union`, `composeAll_hRow`). Unwritten `inl` labels are dropped,
which is why W1 and W2 are not needed (§14.8).
-/
import Composition.Sig.Generic

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- `θ` respects every declared `disjoint`. -/
def DeclOk (P : SigProblem Label B) (θ : Assign Label B) : Prop :=
  ∀ r s, Declared P r s → Composition.Disjoint (θ.row r) (θ.row s)

/-- Rigid row `r` supplies unwritten label `k` of generic row `f`. -/
def RestWit {V : Type} (P : SigProblem Label B) (θ : Assign Label B)
    (f : Row (GL Label) V) (k : Label) (r : Nat) : Prop :=
  r ∈ P.rigidRow ∧ f (.inr r) ≠ none ∧ θ.row r k ≠ none

open Classical in
/-- `θ`'s field at unwritten label `k` from a rest `f` holds. -/
noncomputable def restAt {V : Type} (P : SigProblem Label B)
    (θ : Assign Label B) (f : Row (GL Label) V) (k : Label) :
    Option (G Label B) :=
  if h : ∃ r, RestWit P θ f k r then θ.row (Classical.choose h) k else none

mutual
  /-- `h` on values. -/
  noncomputable def interp (P : SigProblem Label B) (θ : Assign Label B)
      (c : G Label B) : GG Label B → G Label B
    | .base (.inl b) => .base b
    | .base (.inr (.A r l)) =>
      if r ∈ P.rigidRow then (θ.row r l).getD c else c
    | .base (.inr (.R _)) => c
    | .base (.inr (.T n)) => if n ∈ P.rigidTy then θ.ty n else c
    | .arrow a b => .arrow (interp P θ c a) (interp P θ c b)
    | .record f => .record fun k =>
      if k ∈ written P then interpO P θ c (f (.inl k)) else restAt P θ f k

  noncomputable def interpO (P : SigProblem Label B) (θ : Assign Label B)
      (c : G Label B) : Option (GG Label B) → Option (G Label B)
    | none => none
    | some g => some (interp P θ c g)
end

/-- `h` on rows. -/
noncomputable def hRow (P : SigProblem Label B) (θ : Assign Label B)
    (c : G Label B) (f : Row (GL Label) (GG Label B)) : Row Label (G Label B) :=
  fun k => if k ∈ written P then interpO P θ c (f (.inl k)) else restAt P θ f k

/-- `h` on assignments. -/
noncomputable def hAssign (P : SigProblem Label B) (θ : Assign Label B)
    (c : G Label B) (Γ : Assign (GL Label) (GB Label B)) : Assign Label B :=
  ⟨fun n => interp P θ c (Γ.ty n), fun r => hRow P θ c (Γ.row r)⟩

variable {P : SigProblem Label B} {θ : Assign Label B} {c : G Label B}

theorem interp_record (f : Row (GL Label) (GG Label B)) :
    interp P θ c (.record f) = .record (hRow P θ c f) := by
  simp only [interp]
  rfl

omit [DecidableEq Label] in
theorem restWit_unique {V : Type} {f : Row (GL Label) V} {k : Label}
    {r s : Nat} (hwf : WFRow P f) (hD : DeclOk P θ)
    (hr : RestWit P θ f k r) (hs : RestWit P θ f k s) : r = s := by
  apply Classical.byContradiction
  intro hne
  rcases hD r s (hwf r hr.1 s hs.1 hne hr.2.1 hs.2.1) k with h | h
  · exact hr.2.2 h
  · exact hs.2.2 h

omit [DecidableEq Label] in
theorem restAt_of_wit {V : Type} {f : Row (GL Label) V} {k : Label}
    {r : Nat} (hwf : WFRow P f) (hD : DeclOk P θ)
    (hr : RestWit P θ f k r) : restAt P θ f k = θ.row r k := by
  have h : ∃ r, RestWit P θ f k r := ⟨r, hr⟩
  unfold restAt
  split
  · next h' => rw [restWit_unique hwf hD (Classical.choose_spec h') hr]
  · exact absurd h ‹_›

omit [DecidableEq Label] in
theorem restAt_of_none {V : Type} {f : Row (GL Label) V} {k : Label}
    (h : ∀ r, ¬ RestWit P θ f k r) : restAt P θ f k = none := by
  unfold restAt
  split
  · next h' => exact absurd (Classical.choose_spec h') (h _)
  · rfl

omit [DecidableEq Label] in
theorem restAt_wit {V : Type} {f : Row (GL Label) V} {k : Label}
    (h : restAt P θ f k ≠ none) : ∃ r, RestWit P θ f k r := by
  apply Classical.byContradiction
  intro hn
  exact h (restAt_of_none fun r hr => hn ⟨r, hr⟩)

omit [DecidableEq Label] in
theorem wfRow_mono {V : Type} {f g : Row (GL Label) V}
    (hsub : ∀ k, f k ≠ none → g k ≠ none) (hg : WFRow P g) : WFRow P f :=
  fun r hr s hs hne hfr hfs => hg r hr s hs hne (hsub _ hfr) (hsub _ hfs)

theorem union_ne_none {V L : Type} {x y : Row L V} {k : L} :
    union x y k ≠ none ↔ x k ≠ none ∨ y k ≠ none := by
  rw [Ne, union_none_iff]
  constructor
  · intro h
    by_cases hx : x k = none
    · exact Or.inr fun hy => h ⟨hx, hy⟩
    · exact Or.inl hx
  · rintro (h | h) ⟨hx, hy⟩
    · exact h hx
    · exact h hy

/-- L2, disjointness: generic disjointness with D2 survives `h`. -/
theorem hRow_disjoint {x y : Row (GL Label) (GG Label B)}
    (hxy : Composition.Disjoint x y) (hD : DeclOk P θ)
    (h2 : ∀ r ∈ P.rigidRow, ∀ s ∈ P.rigidRow, r ≠ s → x (.inr r) ≠ none →
      y (.inr s) ≠ none → Declared P r s) :
    Composition.Disjoint (hRow P θ c x) (hRow P θ c y) := by
  intro k
  by_cases hk : k ∈ written P
  · simp only [hRow, hk, ↓reduceIte]
    rcases hxy (.inl k) with h | h
    · exact Or.inl (by rw [h]; rfl)
    · exact Or.inr (by rw [h]; rfl)
  · simp only [hRow, hk, ↓reduceIte]
    by_cases hx : restAt P θ x k = none
    · exact Or.inl hx
    by_cases hy : restAt P θ y k = none
    · exact Or.inr hy
    obtain ⟨r, hr⟩ := restAt_wit hx
    obtain ⟨s, hs⟩ := restAt_wit hy
    by_cases hrs : r = s
    · subst hrs
      rcases hxy (.inr r) with h | h
      · exact absurd h hr.2.1
      · exact absurd h hs.2.1
    · rcases hD r s (h2 r hr.1 s hs.1 hrs hr.2.1 hs.2.1) k with h | h
      · exact absurd h hr.2.2
      · exact absurd h hs.2.2

/-- L2, composition: `h` of a well-formed union is the union of the
images. -/
theorem hRow_union {x y : Row (GL Label) (GG Label B)}
    (hwf : WFRow P (union x y)) (hD : DeclOk P θ) :
    hRow P θ c (union x y) = union (hRow P θ c x) (hRow P θ c y) := by
  funext k
  by_cases hk : k ∈ written P
  · simp only [hRow, hk, ↓reduceIte, union]
    cases x (.inl k) <;> rfl
  · have ex : ∀ z, hRow P θ c z k = restAt P θ z k := fun z => by
      simp only [hRow, hk, ↓reduceIte]
    simp only [union, ex]
    have hwx : WFRow P x := wfRow_mono (fun _ h => union_ne_none.mpr
      (Or.inl h)) hwf
    have hwy : WFRow P y := wfRow_mono (fun _ h => union_ne_none.mpr
      (Or.inr h)) hwf
    by_cases hX : ∃ r, RestWit P θ x k r
    · obtain ⟨r, hr⟩ := hX
      have hu : RestWit P θ (union x y) k r :=
        ⟨hr.1, union_ne_none.mpr (Or.inl hr.2.1), hr.2.2⟩
      rw [restAt_of_wit hwf hD hu, restAt_of_wit hwx hD hr]
      cases h : θ.row r k with
      | none => exact absurd h hr.2.2
      | some v => rfl
    · have hx : restAt P θ x k = none :=
        restAt_of_none fun r hr => hX ⟨r, hr⟩
      rw [hx]
      by_cases hY : ∃ s, RestWit P θ y k s
      · obtain ⟨s, hs⟩ := hY
        have hu : RestWit P θ (union x y) k s :=
          ⟨hs.1, union_ne_none.mpr (Or.inr hs.2.1), hs.2.2⟩
        rw [restAt_of_wit hwf hD hu, restAt_of_wit hwy hD hs]
      · rw [restAt_of_none fun s hs => hY ⟨s, hs⟩]
        apply restAt_of_none
        intro r hr
        rcases union_ne_none.mp hr.2.1 with h | h
        · exact hX ⟨r, hr.1, h, hr.2.2⟩
        · exact hY ⟨r, hr.1, h, hr.2.2⟩

theorem hRow_empty : hRow P θ c Row.empty = Row.empty := by
  funext k
  by_cases hk : k ∈ written P
  · simp only [hRow, hk, ↓reduceIte, Row.empty]
    rfl
  · simp only [hRow, hk, ↓reduceIte]
    exact restAt_of_none fun _ hr => hr.2.1 rfl

/-- L2 for a list of parts. -/
theorem composeAll_hRow (hD : DeclOk P θ) :
    ∀ {xs : List (Row (GL Label) (GG Label B))}
      {v : Row (GL Label) (GG Label B)},
      composeAll xs = some v → WFRow P v →
        composeAll (xs.map (hRow P θ c)) = some (hRow P θ c v)
  | [], v, h, _ => by
    simp only [composeAll, Option.some.injEq] at h
    subst h
    simp [composeAll, hRow_empty]
  | x :: xs, v, h, hwf => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨hxw, rfl⟩ := compose_eq_some.mp hc
    have hww : WFRow P w := wfRow_mono (fun _ h => union_ne_none.mpr
      (Or.inr h)) hwf
    simp only [List.map_cons, composeAll, composeAll_hRow hD hw hww,
      Option.bind_some]
    rw [hRow_union hwf hD]
    refine compose_eq_some.mpr ⟨?_, rfl⟩
    refine hRow_disjoint hxw hD fun r hr s hs hne h1 h2 => ?_
    exact hwf r hr s hs hne (union_ne_none.mpr (Or.inl h1))
      (union_ne_none.mpr (Or.inr h2))

end Composition.Syntax
