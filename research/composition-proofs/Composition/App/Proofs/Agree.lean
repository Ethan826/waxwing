/-
Scope A, S4 (conservativity): on a scoped signature problem of the
existing model, validity over `GA` at every injective base extension
(`ValidOpenA (embedP P)`) is `ValidOpen P`.

The argument transports assignments between the two models along maps
that are homomorphic on bases, arrows and records:
- (→) lift the rigid assignment by `embedG`, apply `ValidOpenA`, and
  collapse the flexible witness back to `G` (`collapse` sends each `app`
  node to the empty record);
- (←) encode the rigid assignment into `G (B₁ ⊕ CV Label B₁)`, each
  finite `app` value becoming a fresh base `Sum.inr`, apply `ValidOpen`
  at `Sum.inl ∘ i`, and decode the witness (`dec`).
One evaluation-homomorphism lemma per direction of map (`evalT_homA`,
`evalA_homG`) does the bulk of the work. S2 is the special case of
`evalA_homG` at `embedG` and is not used.

`Scoped` is not used either: rigid values are finite by `ValidFin`'s own
hypotheses, and that is all the round trip `dec ∘ enc` needs.
-/
import Composition.App.Statements

namespace Composition.App

open Classical Composition Composition.Syntax Composition.Typed

variable {Label B : Type}

/-! ### Rows mapped fieldwise -/

/-- Map every field of a row. -/
def rmap {V W : Type} (φ : V → W) (r : Row Label V) : Row Label W :=
  fun k => (r k).map φ

theorem rmap_none {V W : Type} (φ : V → W) (r : Row Label V) (l : Label) :
    rmap φ r l = none ↔ r l = none := by
  simp [rmap]

theorem disjoint_rmap {V W : Type} (φ : V → W) (r s : Row Label V) :
    Disjoint (rmap φ r) (rmap φ s) ↔ Disjoint r s := by
  simp only [Disjoint, rmap_none]

theorem union_rmap {V W : Type} (φ : V → W) (r s : Row Label V) :
    union (rmap φ r) (rmap φ s) = rmap φ (union r s) := by
  funext l
  unfold union rmap
  cases h : r l <;> simp [h]

theorem rmap_empty {V W : Type} (φ : V → W) :
    rmap φ (Row.empty : Row Label V) = Row.empty := by
  funext l
  rfl

theorem compose_rmap {V W : Type} (φ : V → W) (r s : Row Label V) :
    compose (rmap φ r) (rmap φ s) = (compose r s).map (rmap φ) := by
  unfold compose
  by_cases h : Disjoint r s
  · simp [h, (disjoint_rmap φ r s).mpr h, union_rmap]
  · simp [h, mt (disjoint_rmap φ r s).mp h]

theorem composeAll_rmap {V W : Type} (φ : V → W) :
    ∀ rs : List (Row Label V),
      composeAll (rs.map (rmap φ)) = (composeAll rs).map (rmap φ)
  | [] => by simp [composeAll, rmap_empty]
  | r :: rs => by
    simp only [List.map_cons, composeAll, composeAll_rmap φ rs]
    cases composeAll rs <;> simp [compose_rmap]

theorem single_rmap [DecidableEq Label] {B₁ B₂ : Type}
    (φ : GA Label B₁ → G Label B₂) (l : Label) (g : GA Label B₁) :
    single l (φ g) = rmap φ (singleA l g) := by
  funext k
  by_cases h : k = l <;> simp [single, singleA, rmap, h]

theorem singleA_rmap [DecidableEq Label] {B₁ B₂ : Type}
    (ψ : G Label B₂ → GA Label B₁) (l : Label) (g : G Label B₂) :
    singleA l (ψ g) = rmap ψ (single l g) := by
  funext k
  by_cases h : k = l <;> simp [single, singleA, rmap, h]

/-! ### Maps homomorphic off `app`, and assignments carried along them -/

/-- `φ : GA → G` renames bases along `i`/`j` and commutes with arrows
and records. -/
structure IsHomA {B₁ B₂ : Type} (φ : GA Label B₁ → G Label B₂)
    (i : B → B₁) (j : B → B₂) : Prop where
  base : ∀ b, φ (.base (i b)) = .base (j b)
  arrow : ∀ a c, φ (.arrow a c) = .arrow (φ a) (φ c)
  record : ∀ f, φ (.record f) = .record (rmap φ f)

/-- `ψ : G → GA` renames bases along `j`/`i` and commutes with arrows
and records. -/
structure IsHomG {B₁ B₂ : Type} (ψ : G Label B₂ → GA Label B₁)
    (i : B → B₁) (j : B → B₂) : Prop where
  base : ∀ b, ψ (.base (j b)) = .base (i b)
  arrow : ∀ a c, ψ (.arrow a c) = .arrow (ψ a) (ψ c)
  record : ∀ f, ψ (.record f) = .record (rmap ψ f)

def homA {B₁ B₂ : Type} (φ : GA Label B₁ → G Label B₂)
    (θ : AssignA Label B₁) : Assign Label B₂ :=
  ⟨fun n => φ (θ.ty n), fun r => rmap φ (θ.row r)⟩

def homG {B₁ B₂ : Type} (ψ : G Label B₂ → GA Label B₁)
    (θ : Assign Label B₂) : AssignA Label B₁ :=
  ⟨fun n => ψ (θ.ty n), fun r => rmap ψ (θ.row r)⟩

variable [DecidableEq Label]

/-! ### Evaluation homomorphisms -/

section HomA
variable {B₁ B₂ : Type} {φ : GA Label B₁ → G Label B₂} {i : B → B₁}
  {j : B → B₂}

mutual
  theorem evalT_homA (h : IsHomA φ i j) (θ : AssignA Label B₁) :
      ∀ t : TExpr Label B, evalT (homA φ θ) (mapBaseT j t) =
        (evalA θ ((embedT t).mapBase i)).map φ
    | .base b => by
      simp [mapBaseT, embedT, TExprA.mapBase, evalT, evalA, h.base]
    | .arrow t u => by
      simp only [mapBaseT, embedT, TExprA.mapBase, evalT, evalA,
        evalT_homA h θ t, evalT_homA h θ u]
      cases evalA θ ((embedT t).mapBase i) <;>
        cases evalA θ ((embedT u).mapBase i) <;> simp [h.arrow]
    | .tvar n => by
      simp [mapBaseT, embedT, TExprA.mapBase, evalT, evalA, homA]
    | .record fs tails => by
      simp only [mapBaseT, embedT, TExprA.mapBase, evalT, evalA,
        evalF_homA h θ fs]
      cases evalFA θ ((embedF fs).mapBase i) with
      | none => simp
      | some fr =>
        have hl : (rmap φ fr :: tails.map (homA φ θ).row) =
            (fr :: tails.map θ.row).map (rmap φ) := by
          simp [homA, Function.comp_def]
        simp only [Option.map_some, Option.bind_some, hl, composeAll_rmap]
        cases composeAll (fr :: tails.map θ.row) <;> simp [h.record]

  theorem evalF_homA (h : IsHomA φ i j) (θ : AssignA Label B₁) :
      ∀ fs : Fields Label B, evalF (homA φ θ) (mapBaseF j fs) =
        (evalFA θ ((embedF fs).mapBase i)).map (rmap φ)
    | .nil => by
      simp [mapBaseF, embedF, FieldsA.mapBase, evalF, evalFA, rmap_empty]
    | .cons l t rest => by
      simp only [mapBaseF, embedF, FieldsA.mapBase, evalF, evalFA,
        evalT_homA h θ t, evalF_homA h θ rest]
      cases evalA θ ((embedT t).mapBase i) <;>
        cases evalFA θ ((embedF rest).mapBase i) <;>
        simp [single_rmap, compose_rmap]
end

theorem sat_homA (h : IsHomA φ i j) (θ : AssignA Label B₁)
    (C : Problem Label B)
    (hs : SatA θ ((C.map embedAtom).map (AtomA.mapBase i))) :
    Sat (homA φ θ) (C.map (mapBaseAtom j)) := by
  intro a ha
  obtain ⟨a0, h0, rfl⟩ := List.mem_map.mp ha
  have hA := hs _ (List.mem_map.mpr
    ⟨embedAtom a0, List.mem_map.mpr ⟨a0, h0, rfl⟩, rfl⟩)
  cases a0 with
  | eq t u =>
    obtain ⟨g, h1, h2⟩ := hA
    exact ⟨φ g, by rw [evalT_homA h, h1]; rfl,
      by rw [evalT_homA h, h2]; rfl⟩
  | lacks r l => exact (rmap_none φ _ l).mpr hA
  | disjoint r s => exact (disjoint_rmap φ _ _).mpr hA
  | ff => exact hA.elim

end HomA

section HomG
variable {B₁ B₂ : Type} {ψ : G Label B₂ → GA Label B₁} {i : B → B₁}
  {j : B → B₂}

mutual
  theorem evalA_homG (h : IsHomG ψ i j) (θ : Assign Label B₂) :
      ∀ t : TExpr Label B, evalA (homG ψ θ) ((embedT t).mapBase i) =
        (evalT θ (mapBaseT j t)).map ψ
    | .base b => by
      simp [mapBaseT, embedT, TExprA.mapBase, evalT, evalA, h.base]
    | .arrow t u => by
      simp only [mapBaseT, embedT, TExprA.mapBase, evalT, evalA,
        evalA_homG h θ t, evalA_homG h θ u]
      cases evalT θ (mapBaseT j t) <;>
        cases evalT θ (mapBaseT j u) <;> simp [h.arrow]
    | .tvar n => by
      simp [mapBaseT, embedT, TExprA.mapBase, evalT, evalA, homG]
    | .record fs tails => by
      simp only [mapBaseT, embedT, TExprA.mapBase, evalT, evalA,
        evalFA_homG h θ fs]
      cases evalF θ (mapBaseF j fs) with
      | none => simp
      | some fr =>
        have hl : (rmap ψ fr :: tails.map (homG ψ θ).row) =
            (fr :: tails.map θ.row).map (rmap ψ) := by
          simp [homG, Function.comp_def]
        simp only [Option.map_some, Option.bind_some, hl, composeAll_rmap]
        cases composeAll (fr :: tails.map θ.row) <;> simp [h.record]

  theorem evalFA_homG (h : IsHomG ψ i j) (θ : Assign Label B₂) :
      ∀ fs : Fields Label B, evalFA (homG ψ θ) ((embedF fs).mapBase i) =
        (evalF θ (mapBaseF j fs)).map (rmap ψ)
    | .nil => by
      simp [mapBaseF, embedF, FieldsA.mapBase, evalF, evalFA, rmap_empty]
    | .cons l t rest => by
      simp only [mapBaseF, embedF, FieldsA.mapBase, evalF, evalFA,
        evalA_homG h θ t, evalFA_homG h θ rest]
      cases evalT θ (mapBaseT j t) <;>
        cases evalF θ (mapBaseF j rest) <;>
        simp [singleA_rmap, compose_rmap]
end

theorem sat_homG (h : IsHomG ψ i j) (θ : Assign Label B₂)
    (C : Problem Label B) (hs : Sat θ (C.map (mapBaseAtom j))) :
    SatA (homG ψ θ) ((C.map embedAtom).map (AtomA.mapBase i)) := by
  intro a ha
  obtain ⟨a1, h1, rfl⟩ := List.mem_map.mp ha
  obtain ⟨a0, h0, rfl⟩ := List.mem_map.mp h1
  have hA := hs _ (List.mem_map.mpr ⟨a0, h0, rfl⟩)
  cases a0 with
  | eq t u =>
    obtain ⟨g, e1, e2⟩ := hA
    exact ⟨ψ g, by rw [evalA_homG h, e1]; rfl,
      by rw [evalA_homG h, e2]; rfl⟩
  | lacks r l => exact (rmap_none ψ _ l).mpr hA
  | disjoint r s => exact (disjoint_rmap ψ _ _).mpr hA
  | ff => exact hA.elim

end HomG

/-! ### The four maps -/

omit [DecidableEq Label] in
theorem embedGO_eq (o : Option (G Label B)) : embedGO o = o.map embedG := by
  cases o <;> rfl

mutual
  /-- Collapse to the existing model: an `app` node becomes `{}`. -/
  def collapse : GA Label B → G Label B
    | .base b => .base b
    | .arrow a c => .arrow (collapse a) (collapse c)
    | .record f => .record fun k => collapseO (f k)
    | .app _ _ => .record fun _ => none

  def collapseO : Option (GA Label B) → Option (G Label B)
    | none => none
    | some g => some (collapse g)
end

omit [DecidableEq Label] in
theorem collapseO_eq (o : Option (GA Label B)) :
    collapseO o = o.map collapse := by
  cases o <;> rfl

/-- Fresh bases for the finite `app` values over `B₁`. -/
abbrev CV (Label B₁ : Type) := {v : GA Label B₁ // FinGA v}

mutual
  /-- Encode into the existing model: a finite `app` value becomes the
  fresh base `Sum.inr` naming it. (An infinite one, never met on the
  values that matter, becomes `{}`.) -/
  noncomputable def enc : GA Label B → G Label (B ⊕ CV Label B)
    | .base b => .base (.inl b)
    | .arrow a c => .arrow (enc a) (enc c)
    | .record f => .record fun k => encO (f k)
    | .app t vs =>
      if h : FinGA (.app t vs) then .base (.inr ⟨.app t vs, h⟩)
      else .record fun _ => none

  noncomputable def encO :
      Option (GA Label B) → Option (G Label (B ⊕ CV Label B))
    | none => none
    | some g => some (enc g)
end

omit [DecidableEq Label] in
theorem encO_eq (o : Option (GA Label B)) : encO o = o.map enc := by
  cases o <;> rfl

mutual
  /-- Decode: a fresh base `Sum.inr v` becomes `v`. -/
  def dec : G Label (B ⊕ CV Label B) → GA Label B
    | .base (.inl b) => .base b
    | .base (.inr v) => v.1
    | .arrow a c => .arrow (dec a) (dec c)
    | .record f => .record fun k => decO (f k)

  def decO : Option (G Label (B ⊕ CV Label B)) → Option (GA Label B)
    | none => none
    | some g => some (dec g)
end

omit [DecidableEq Label] in
theorem decO_eq (o : Option (G Label (B ⊕ CV Label B))) :
    decO o = o.map dec := by
  cases o <;> rfl

omit [DecidableEq Label] in
theorem embedG_hom {B₁ : Type} (i : B → B₁) :
    IsHomG (embedG : G Label B₁ → GA Label B₁) i i :=
  ⟨fun _ => rfl, fun _ _ => rfl,
    fun f => by simp only [embedG, embedGO_eq]; rfl⟩

omit [DecidableEq Label] in
theorem collapse_hom {B₁ : Type} (i : B → B₁) :
    IsHomA (collapse : GA Label B₁ → G Label B₁) i i :=
  ⟨fun _ => rfl, fun _ _ => rfl,
    fun f => by simp only [collapse, collapseO_eq]; rfl⟩

omit [DecidableEq Label] in
theorem enc_hom {B₁ : Type} (i : B → B₁) :
    IsHomA (enc : GA Label B₁ → G Label (B₁ ⊕ CV Label B₁)) i
      (Sum.inl ∘ i) :=
  ⟨fun _ => rfl, fun _ _ => rfl,
    fun f => by simp only [enc, encO_eq]; rfl⟩

omit [DecidableEq Label] in
theorem dec_hom {B₁ : Type} (i : B → B₁) :
    IsHomG (dec : G Label (B₁ ⊕ CV Label B₁) → GA Label B₁) i
      (Sum.inl ∘ i) :=
  ⟨fun _ => rfl, fun _ _ => rfl,
    fun f => by simp only [dec, decO_eq]; rfl⟩

/-! ### Round trips and finiteness -/

omit [DecidableEq Label] in
mutual
  theorem collapse_embedG : ∀ g : G Label B, collapse (embedG g) = g
    | .base _ => rfl
    | .arrow a c => by
      simp only [embedG, collapse, collapse_embedG a, collapse_embedG c]
    | .record f => by
      simp only [embedG, collapse, G.record.injEq]
      funext k
      exact collapseO_embedGO (f k)

  theorem collapseO_embedGO :
      ∀ o : Option (G Label B), collapseO (embedGO o) = o
    | none => rfl
    | some g => by simp only [embedGO, collapseO, collapse_embedG g]
end

omit [DecidableEq Label] in
mutual
  theorem dec_enc : ∀ g : GA Label B, FinGA g → dec (enc g) = g
    | .base _, _ => rfl
    | .arrow a c, h => by
      simp only [FinGA] at h
      simp only [enc, dec, dec_enc a h.1, dec_enc c h.2]
    | .record f, h => by
      simp only [FinGA] at h
      simp only [enc, dec, GA.record.injEq]
      funext k
      exact decO_encO (f k) (h.2 k)
    | .app t vs, h => by
      simp [enc, h, dec]

  theorem decO_encO :
      ∀ o : Option (GA Label B), FinOA o → decO (encO o) = o
    | none, _ => rfl
    | some g, h => by simp only [encO, decO, dec_enc g h]
end

omit [DecidableEq Label] in
mutual
  theorem finGA_embedG : ∀ g : G Label B, FinG g → FinGA (embedG g)
    | .base _, _ => trivial
    | .arrow a c, h => by
      simp only [FinG] at h
      simp only [embedG, FinGA]
      exact ⟨finGA_embedG a h.1, finGA_embedG c h.2⟩
    | .record f, h => by
      obtain ⟨⟨ls, hls⟩, hv⟩ := (finG_record f).mp h
      simp only [embedG, FinGA]
      refine ⟨⟨ls, fun k hk => hls k fun h' => hk ?_⟩,
        fun k => finOA_embedGO (f k) (hv k)⟩
      simp [h', embedGO]

  theorem finOA_embedGO :
      ∀ o : Option (G Label B), FinO o → FinOA (embedGO o)
    | none, _ => trivial
    | some g, h => finGA_embedG g h
end

omit [DecidableEq Label] in
mutual
  theorem finG_collapse : ∀ g : GA Label B, FinGA g → FinG (collapse g)
    | .base _, _ => trivial
    | .arrow a c, h => by
      simp only [FinGA] at h
      simp only [collapse, FinG]
      exact ⟨finG_collapse a h.1, finG_collapse c h.2⟩
    | .record f, h => by
      simp only [FinGA] at h
      obtain ⟨⟨ls, hls⟩, hv⟩ := h
      simp only [collapse]
      refine (finG_record _).mpr ⟨⟨ls, fun k hk => hls k fun h' => hk ?_⟩,
        fun k => finO_collapseO (f k) (hv k)⟩
      simp [h', collapseO]
    | .app _ _, _ => finG_emptyG

  theorem finO_collapseO :
      ∀ o : Option (GA Label B), FinOA o → FinO (collapseO o)
    | none, _ => trivial
    | some g, h => finG_collapse g h
end

omit [DecidableEq Label] in
mutual
  theorem finG_enc : ∀ g : GA Label B, FinGA g → FinG (enc g)
    | .base _, _ => trivial
    | .arrow a c, h => by
      simp only [FinGA] at h
      simp only [enc, FinG]
      exact ⟨finG_enc a h.1, finG_enc c h.2⟩
    | .record f, h => by
      simp only [FinGA] at h
      obtain ⟨⟨ls, hls⟩, hv⟩ := h
      simp only [enc]
      refine (finG_record _).mpr ⟨⟨ls, fun k hk => hls k fun h' => hk ?_⟩,
        fun k => finO_encO (f k) (hv k)⟩
      simp [h', encO]
    | .app t vs, h => by
      simp [enc, h, FinG]

  theorem finO_encO :
      ∀ o : Option (GA Label B), FinOA o → FinO (encO o)
    | none, _ => trivial
    | some g, h => finG_enc g h
end

omit [DecidableEq Label] in
mutual
  theorem finGA_dec :
      ∀ g : G Label (B ⊕ CV Label B), FinG g → FinGA (dec g)
    | .base (.inl _), _ => trivial
    | .base (.inr v), _ => v.2
    | .arrow a c, h => by
      simp only [FinG] at h
      simp only [dec, FinGA]
      exact ⟨finGA_dec a h.1, finGA_dec c h.2⟩
    | .record f, h => by
      obtain ⟨⟨ls, hls⟩, hv⟩ := (finG_record f).mp h
      simp only [dec, FinGA]
      refine ⟨⟨ls, fun k hk => hls k fun h' => hk ?_⟩,
        fun k => finOA_decO (f k) (hv k)⟩
      simp [h', decO]

  theorem finOA_decO :
      ∀ o : Option (G Label (B ⊕ CV Label B)), FinO o → FinOA (decO o)
    | none, _ => trivial
    | some g, h => finGA_dec g h
end

/-! ### Assignments under the round trips -/

omit [DecidableEq Label] in
theorem collapse_combine {B₁ : Type} (P : SigProblem Label B)
    (i : B → B₁) (θR : Assign Label B₁) (θF : AssignA Label B₁) :
    homA collapse (combineA ((embedP P).mapBase i) (embedAssign θR) θF) =
      combine (P.mapBase i) θR (homA collapse θF) := by
  simp only [homA, combineA, combine, embedAssign, Assign.mk.injEq]
  constructor
  · funext n
    by_cases hn : n ∈ P.rigidTy
    · have h1 : n ∈ ((embedP P).mapBase i).rigidTy := hn
      have h2 : n ∈ (P.mapBase i).rigidTy := hn
      simp only [h1, h2, ↓reduceIte]; exact collapse_embedG _
    · have h1 : n ∉ ((embedP P).mapBase i).rigidTy := hn
      have h2 : n ∉ (P.mapBase i).rigidTy := hn
      simp only [h1, h2, ↓reduceIte]
  · funext r
    by_cases hr : r ∈ P.rigidRow
    · have h1 : r ∈ ((embedP P).mapBase i).rigidRow := hr
      have h2 : r ∈ (P.mapBase i).rigidRow := hr
      simp only [h1, h2, ↓reduceIte]
      funext k
      simp only [rmap, Option.map_map]
      cases θR.row r k with
      | none => rfl
      | some g => exact congrArg some (collapse_embedG g)
    · have h1 : r ∉ ((embedP P).mapBase i).rigidRow := hr
      have h2 : r ∉ (P.mapBase i).rigidRow := hr
      simp only [h1, h2, ↓reduceIte]

omit [DecidableEq Label] in
theorem dec_combine {B₁ : Type} (P : SigProblem Label B)
    (i : B → B₁) (θR : AssignA Label B₁)
    (θF : Assign Label (B₁ ⊕ CV Label B₁))
    (hty : ∀ n ∈ P.rigidTy, FinGA (θR.ty n))
    (hrow : ∀ r ∈ P.rigidRow, FinGA (.record (θR.row r))) :
    homG dec (combine (P.mapBase (Sum.inl ∘ i : B → B₁ ⊕ CV Label B₁)) (homA enc θR) θF) =
      combineA ((embedP P).mapBase i) θR (homG dec θF) := by
  simp only [homG, homA, combineA, combine, AssignA.mk.injEq]
  constructor
  · funext n
    by_cases hn : n ∈ P.rigidTy
    · have h1 : n ∈ ((embedP P).mapBase i).rigidTy := hn
      have h2 : n ∈ (P.mapBase (Sum.inl ∘ i : B → B₁ ⊕ CV Label B₁)).rigidTy := hn
      simp only [h1, h2, ↓reduceIte]; exact dec_enc _ (hty n hn)
    · have h1 : n ∉ ((embedP P).mapBase i).rigidTy := hn
      have h2 : n ∉ (P.mapBase (Sum.inl ∘ i : B → B₁ ⊕ CV Label B₁)).rigidTy := hn
      simp only [h1, h2, ↓reduceIte]
  · funext r
    by_cases hr : r ∈ P.rigidRow
    · have h1 : r ∈ ((embedP P).mapBase i).rigidRow := hr
      have h2 : r ∈ (P.mapBase (Sum.inl ∘ i : B → B₁ ⊕ CV Label B₁)).rigidRow := hr
      simp only [h1, h2, ↓reduceIte]
      have hf := hrow r hr
      simp only [FinGA] at hf
      funext k
      simp only [rmap, Option.map_map]
      have hk := hf.2 k
      cases e : θR.row r k with
      | none => rfl
      | some g =>
        rw [e] at hk
        exact congrArg some (dec_enc g hk)
    · have h1 : r ∉ ((embedP P).mapBase i).rigidRow := hr
      have h2 : r ∉ (P.mapBase (Sum.inl ∘ i : B → B₁ ⊕ CV Label B₁)).rigidRow := hr
      simp only [h1, h2, ↓reduceIte]

/-! ### S4 -/

/-- S4, proved outright; `Scoped` is not needed. -/
theorem s4 : S4 (Label := Label) (B := B) := by
  intro P _hscoped
  constructor
  · intro hA B₁ i hi θR hty hrow hD
    have hrowA : ∀ r ∈ ((embedP P).mapBase i).rigidRow,
        FinGA (.record ((embedAssign θR).row r)) := by
      intro r hr
      have := finGA_embedG _ (hrow r hr)
      simp only [embedG, embedGO_eq] at this
      exact this
    obtain ⟨θF, hfin, hsat⟩ := hA B₁ i hi (embedAssign θR)
      (fun n hn => finGA_embedG _ (hty n hn)) hrowA
      (sat_homG (embedG_hom i) θR P.D hD)
    refine ⟨homA collapse θF,
      ⟨fun n => finG_collapse _ (hfin.1 n), fun r => ?_⟩, ?_⟩
    · have := finG_collapse _ (hfin.2 r)
      simp only [collapse, collapseO_eq] at this
      exact this
    · have := sat_homA (collapse_hom i) _ P.B hsat
      rwa [collapse_combine] at this
  · intro hO B₁ i hi θR hty hrow hD
    have hinj : Function.Injective (Sum.inl ∘ i : B → B₁ ⊕ CV Label B₁) :=
      fun a b h => hi (Sum.inl.inj h)
    have hrowG : ∀ r ∈ (P.mapBase (Sum.inl ∘ i : B → B₁ ⊕ CV Label B₁)).rigidRow,
        FinG (.record ((homA enc θR).row r)) := by
      intro r hr
      have := finG_enc _ (hrow r hr)
      simp only [enc, encO_eq] at this
      exact this
    obtain ⟨θF, hfin, hsat⟩ := hO (B₁ ⊕ CV Label B₁) (Sum.inl ∘ i) hinj
      (homA enc θR) (fun n hn => finG_enc _ (hty n hn)) hrowG
      (sat_homA (enc_hom i) θR P.D hD)
    refine ⟨homG dec θF,
      ⟨fun n => finGA_dec _ (hfin.1 n), fun r => ?_⟩, ?_⟩
    · have := finGA_dec _ (hfin.2 r)
      simp only [dec, decO_eq] at this
      exact this
    · have := sat_homG (dec_hom i) _ P.B hsat
      rwa [dec_combine P i θR θF hty hrow] at this

/-- The requested form, from S2. `h2` is not needed: `s4` is proved
outright (S2 is the `embedG` case of `evalA_homG`). -/
theorem s4_of_s2 (_h2 : S2 (Label := Label) (B := B)) :
    S4 (Label := Label) (B := B) :=
  s4

end Composition.App

/-! ### A concrete instance -/

namespace Composition.App.AgreeExample

open Composition Composition.Syntax Composition.Typed Composition.App

/-- Rigid `τ0` and `ρ1`, with `ρ1` lacking label `0`; `B` asks that a
flexible `τ2` equal the record `{ 0: τ0, ...ρ1 }`. -/
def P0 : SigProblem Nat Unit :=
  ⟨[0], [1], [.lacks 1 0],
   [.eq (.tvar 2) (.record (.cons 0 (.tvar 0) .nil) [1])]⟩

theorem p0_scoped : Scoped P0 := by
  constructor <;> intro x hx <;>
    simp [P0, tyVarsOf, rowVarsOf] at hx ⊢ <;> omega

/-- One direction of S4 at `P0`: `ValidOpen` transfers to `GA`. -/
example (h : ValidOpen P0) : ValidOpenA (embedP P0) :=
  (s4 P0 p0_scoped).mpr h

end Composition.App.AgreeExample
