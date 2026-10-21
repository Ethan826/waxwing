/-
Proof stream B (research/division-campaign/cellcheck/proof-plan.md),
part 1: apartness and composition. Field-label distinctness of
`evalFC`, a characterisation of `apartC`, self-apartness `SelfOK`,
and `composeC` as pairwise-apart concatenation preserving `SelfOK`.
-/
import Composition.Typed.Cell.Statements

namespace Composition.Typed.Cells.ProofsB

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

theorem evalFC_nodup (P : SigProblem Label B) (Q : CellQ Label)
    (σ : CellCert Label B) :
    ∀ (fs : Fields Label B) r, evalFC P Q σ fs = some r →
      (r.map Prod.fst).Nodup
  | .nil, r, h => by simp [evalFC] at h; subst h; simp
  | .cons l t rest, r, h => by
    simp only [evalFC, Option.bind_eq_some_iff] at h
    obtain ⟨g, _, r', hr', h⟩ := h
    split at h
    · simp at h
    · rename_i hn
      simp only [Option.some.injEq] at h
      subst h
      simp only [List.map_cons, List.nodup_cons]
      exact ⟨hn, evalFC_nodup P Q σ rest r' hr'⟩

/-- A piece `q` never holds label `l` (one conjunct of `lackC`). -/
def Lk (Q : CellQ Label) (q : CellPiece Label) (l : Label) : Prop :=
  (!decide (l ∈ q.labels) || !Q.possW q.row l) = true

theorem apartC_iff (Q : CellQ Label) (x y : CRow Label B) :
    apartC Q x y = true ↔
      (∀ e ∈ x.1, ∀ e' ∈ y.1, e'.1 ≠ e.1) ∧
      (∀ e ∈ x.1, ∀ q ∈ y.2, Lk Q q e.1) ∧
      (∀ e ∈ y.1, ∀ q ∈ x.2, Lk Q q e.1) ∧
      (∀ q ∈ x.2, ∀ q' ∈ y.2, piecesApart Q q q' = true) := by
  simp only [apartC, lackC, Lk, Bool.and_eq_true, List.all_eq_true,
    Bool.not_eq_true', List.any_eq_false, decide_eq_true_eq]
  constructor
  · rintro ⟨⟨h1, h2⟩, h3⟩
    exact ⟨fun e he e' he' => (h1 e he).1 e' he',
      fun e he => (h1 e he).2, h2, h3⟩
  · rintro ⟨h1, h2, h3, h4⟩
    exact ⟨⟨fun e he => ⟨fun e' he' => h1 e he e' he', h2 e he⟩, h3⟩, h4⟩

/-- A row's parts are pairwise apart in the order fields then pieces. -/
def SelfOK (Q : CellQ Label) (x : CRow Label B) : Prop :=
  x.1.Pairwise (fun e e' => e'.1 ≠ e.1) ∧
    (∀ e ∈ x.1, ∀ q ∈ x.2, Lk Q q e.1) ∧
    x.2.Pairwise (fun q q' => piecesApart Q q q' = true)

/-- The decomposition `wfC` checks: one part per field, then one per
piece. -/
def fine (x : CRow Label B) : List (CRow Label B) :=
  x.1.map (fun e => ([e], [])) ++ x.2.map (fun q => ([], [q]))

theorem pairwise_fine_iff (Q : CellQ Label) (x : CRow Label B) :
    (fine x).Pairwise (fun a b => apartC Q a b = true) ↔ SelfOK Q x := by
  have ff : ∀ e e' : Label × CellV Label B,
      apartC Q ([e], []) ([e'], []) = true ↔ e'.1 ≠ e.1 := by
    intro e e'; simp [apartC_iff]
  have fp : ∀ (e : Label × CellV Label B) q,
      apartC Q ([e], []) ([], [q]) = true ↔ Lk Q q e.1 := by
    intro e q; simp [apartC_iff]
  have pp : ∀ q q' : CellPiece Label,
      apartC Q (([] : List (Label × CellV Label B)), [q]) ([], [q']) = true ↔
        piecesApart Q q q' = true := by
    intro q q'; simp [apartC_iff]
  simp only [fine, List.pairwise_append, List.pairwise_map, ff, pp,
    List.mem_map, SelfOK, forall_exists_index, and_imp,
    forall_apply_eq_imp_iff₂, fp]
  exact ⟨fun ⟨a, b, c⟩ => ⟨a, c, b⟩, fun ⟨a, c, b⟩ => ⟨a, b, c⟩⟩

/-- Componentwise concatenation of parts. -/
def cat (parts : List (CRow Label B)) : CRow Label B :=
  (parts.flatMap Prod.fst, parts.flatMap Prod.snd)

theorem apartC_left_append (Q : CellQ Label) (x y z : CRow Label B) :
    apartC Q (x.1 ++ y.1, x.2 ++ y.2) z = true ↔
      apartC Q x z = true ∧ apartC Q y z = true := by
  simp only [apartC_iff, List.mem_append]
  constructor
  · rintro ⟨h1, h2, h3, h4⟩
    exact ⟨⟨fun e he => h1 e (.inl he), fun e he => h2 e (.inl he),
        fun e he q hq => h3 e he q (.inl hq), fun q hq => h4 q (.inl hq)⟩,
      ⟨fun e he => h1 e (.inr he), fun e he => h2 e (.inr he),
        fun e he q hq => h3 e he q (.inr hq), fun q hq => h4 q (.inr hq)⟩⟩
  · rintro ⟨⟨a1, a2, a3, a4⟩, ⟨b1, b2, b3, b4⟩⟩
    exact ⟨fun e he => he.elim (a1 e) (b1 e), fun e he => he.elim (a2 e) (b2 e),
      fun e he q hq => hq.elim (a3 e he q) (b3 e he q),
      fun q hq => hq.elim (a4 q) (b4 q)⟩

theorem apartC_right_append (Q : CellQ Label) (x y z : CRow Label B) :
    apartC Q z (x.1 ++ y.1, x.2 ++ y.2) = true ↔
      apartC Q z x = true ∧ apartC Q z y = true := by
  simp only [apartC_iff, List.mem_append]
  constructor
  · rintro ⟨h1, h2, h3, h4⟩
    exact ⟨⟨fun e he e' he' => h1 e he e' (.inl he'), fun e he q hq => h2 e he q (.inl hq),
        fun e he => h3 e (.inl he), fun q hq q' hq' => h4 q hq q' (.inl hq')⟩,
      ⟨fun e he e' he' => h1 e he e' (.inr he'), fun e he q hq => h2 e he q (.inr hq),
        fun e he => h3 e (.inr he), fun q hq q' hq' => h4 q hq q' (.inr hq')⟩⟩
  · rintro ⟨⟨a1, a2, a3, a4⟩, ⟨b1, b2, b3, b4⟩⟩
    exact ⟨fun e he e' he' => he'.elim (a1 e he e') (b1 e he e'),
      fun e he q hq => hq.elim (a2 e he q) (b2 e he q),
      fun e he => he.elim (a3 e) (b3 e),
      fun q hq q' hq' => hq'.elim (a4 q hq q') (b4 q hq q')⟩

theorem apartC_nil_left (Q : CellQ Label) (z : CRow Label B) :
    apartC Q ([], []) z = true := by
  simp [apartC_iff]

theorem apartC_cat_right (Q : CellQ Label) (z : CRow Label B) :
    ∀ parts : List (CRow Label B),
      apartC Q z (cat parts) = true ↔ ∀ p ∈ parts, apartC Q z p = true
  | [] => by simp [cat, apartC_iff]
  | p :: ps => by
    have h := apartC_right_append Q p (cat ps) z
    have ih := apartC_cat_right Q z ps
    simp only [cat, List.flatMap_cons] at h ih ⊢
    rw [h, ih]
    simp

theorem foldlM_iff (Q : CellQ Label) :
    ∀ (parts : List (CRow Label B)) (acc r : CRow Label B),
      parts.foldlM (fun acc x => if apartC Q acc x
        then some (acc.1 ++ x.1, acc.2 ++ x.2) else none) acc = some r ↔
      (∀ p ∈ parts, apartC Q acc p = true) ∧
        parts.Pairwise (fun a b => apartC Q a b = true) ∧
        r = (acc.1 ++ (cat parts).1, acc.2 ++ (cat parts).2)
  | [], acc, r => by
    simp only [List.foldlM_nil, cat, List.flatMap_nil, List.append_nil,
      List.not_mem_nil, List.Pairwise.nil, true_and]
    constructor
    · intro h; cases h; simp
    · intro h; rw [h.2]; rfl
  | p :: ps, acc, r => by
    simp only [List.foldlM_cons]
    by_cases h : apartC Q acc p = true
    · simp only [h, ite_true]
      show List.foldlM _ (acc.1 ++ p.1, acc.2 ++ p.2) ps = some r ↔ _
      rw [foldlM_iff Q ps]
      simp only [apartC_left_append, List.mem_cons, forall_eq_or_imp,
        List.pairwise_cons, cat, List.flatMap_cons, List.append_assoc, h,
        true_and]
      constructor
      · rintro ⟨h1, h2, h3⟩
        exact ⟨fun q hq => (h1 q hq).1, ⟨fun q hq => (h1 q hq).2, h2⟩, h3⟩
      · rintro ⟨h1, ⟨h2, h3⟩, h4⟩
        exact ⟨fun q hq => ⟨h1 q hq, h2 q hq⟩, h3, h4⟩
    · simp [h]

theorem composeC_iff (Q : CellQ Label) (parts : List (CRow Label B))
    (r : CRow Label B) :
    composeC Q parts = some r ↔
      parts.Pairwise (fun a b => apartC Q a b = true) ∧ r = cat parts := by
  unfold composeC
  rw [foldlM_iff]
  simp [apartC_nil_left]

theorem selfOK_append (Q : CellQ Label) (x y : CRow Label B) :
    SelfOK Q x → SelfOK Q y → apartC Q x y = true →
      SelfOK Q (x.1 ++ y.1, x.2 ++ y.2) := by
  rintro ⟨x1, x2, x3⟩ ⟨y1, y2, y3⟩ h
  rw [apartC_iff] at h
  obtain ⟨h1, h2, h3, h4⟩ := h
  refine ⟨List.pairwise_append.2 ⟨x1, y1, h1⟩, ?_,
    List.pairwise_append.2 ⟨x3, y3, h4⟩⟩
  simp only [List.mem_append]
  intro e he q hq
  exact he.elim (fun he => hq.elim (x2 e he q) (h2 e he q))
    (fun he => hq.elim (h3 e he q) (y2 e he q))

theorem selfOK_cat (Q : CellQ Label) :
    ∀ parts : List (CRow Label B),
      parts.Pairwise (fun a b => apartC Q a b = true) →
      (∀ p ∈ parts, SelfOK Q p) → SelfOK Q (cat parts)
  | [], _, _ => by simp [cat, SelfOK]
  | p :: ps, hpw, hs => by
    rw [List.pairwise_cons] at hpw
    have := selfOK_append Q p (cat ps) (hs p (by simp))
      (selfOK_cat Q ps hpw.2 fun q hq => hs q (by simp [hq]))
      ((apartC_cat_right Q p ps).2 hpw.1)
    simpa [cat] using this

end Composition.Typed.Cells.ProofsB
