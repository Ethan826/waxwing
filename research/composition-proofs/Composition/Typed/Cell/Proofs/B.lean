import Composition.Typed.Cell.Statements

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

section AtomLevel
variable [DecidableEq B]

theorem cellCheck_certOk (P : SigProblem Label B) (Q : CellQ Label)
    (σ : CellCert Label B) : cellCheck P Q σ = true → certOkC P Q σ = true := by
  intro h
  simp only [cellCheck, Bool.and_eq_true] at h
  exact h.1.2

theorem bodyAll : BodyAll (Label := Label) (B := B) := by
  intro P Q σ h a ha
  simp only [cellCheck, Bool.and_eq_true, List.all_eq_true] at h
  exact h.2 a ha

theorem eqBothSides : EqBothSides (Label := Label) (B := B) := by
  intro P Q σ t u h
  simp only [atomC] at h
  split at h
  · rename_i a b ha hb
    simp [ha, hb]
  · simp at h

end AtomLevel

namespace ProofsB

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

theorem wfFC_iff (P : SigProblem Label B) (Q : CellQ Label) :
    ∀ fs : List (Label × CellV Label B),
      wfFC P Q fs = true ↔ ∀ e ∈ fs, wfC P Q e.2 = true
  | [] => by simp [wfFC]
  | (l, v) :: rest => by
    simp only [wfFC, Bool.and_eq_true, wfFC_iff P Q rest, List.mem_cons,
      forall_eq_or_imp]

theorem wfC_record_iff (P : SigProblem Label B) (Q : CellQ Label)
    (fs : List (Label × CellV Label B)) (ps : List (CellPiece Label)) :
    wfC P Q (.record fs ps) = true ↔
      (∀ e ∈ fs, wfC P Q e.2 = true) ∧ (∀ q ∈ ps, q.row ∈ P.rigidRow) ∧
        SelfOK Q (fs, ps) := by
  rw [wfC]
  simp only [Bool.and_eq_true, wfFC_iff, List.all_eq_true, decide_eq_true_eq,
    Option.isSome_iff_exists]
  have : (∃ r, composeC Q (fine (fs, ps)) = some r) ↔ SelfOK Q (fs, ps) := by
    simp only [composeC_iff, exists_eq_right, pairwise_fine_iff]
  rw [← this]
  exact and_assoc

theorem selfOK_fields (Q : CellQ Label) (fr : List (Label × CellV Label B))
    (h : (fr.map Prod.fst).Nodup) : SelfOK Q (fr, []) := by
  refine ⟨?_, by simp, List.Pairwise.nil⟩
  have h' := List.pairwise_map.1 h
  exact h'.imp fun hne heq => hne heq.symm

theorem lookup_mem {α : Type} :
    ∀ (xs : List (Nat × α)) (n : Nat) (v : α), xs.lookup n = some v →
      (n, v) ∈ xs
  | [], _, _, h => by simp at h
  | (k, w) :: rest, n, v, h => by
    by_cases hk : n = k
    · subst hk
      simp only [List.lookup_cons_self, Option.some.injEq] at h
      subst h; simp
    · have : List.lookup n ((k, w) :: rest) = List.lookup n rest := by
        have hb : (n == k) = false := by simp [hk]
        simp [List.lookup, hb]
      rw [this] at h
      exact List.mem_cons_of_mem _ (lookup_mem rest n v h)

theorem certOk_ty {P : SigProblem Label B} {Q : CellQ Label}
    {σ : CellCert Label B} (hc : certOkC P Q σ = true) :
    ∀ n v, σ.ty.lookup n = some v → wfC P Q v = true := by
  intro n v h
  simp only [certOkC, Bool.and_eq_true, List.all_eq_true] at hc
  exact hc.1 _ (lookup_mem _ _ _ h)

theorem certOk_row {P : SigProblem Label B} {Q : CellQ Label}
    {σ : CellCert Label B} (hc : certOkC P Q σ = true) :
    ∀ n v, σ.row.lookup n = some v → wfC P Q v = true := by
  intro n v h
  simp only [certOkC, Bool.and_eq_true, List.all_eq_true] at hc
  exact (hc.2 _ (lookup_mem _ _ _ h)).1

theorem wf_empty (P : SigProblem Label B) (Q : CellQ Label) :
    wfC P Q (.record [] []) = true := by
  rw [wfC_record_iff]
  exact ⟨by simp, by simp, by simp [SelfOK]⟩

theorem tyC_wf {P : SigProblem Label B} {Q : CellQ Label}
    {σ : CellCert Label B} (hc : certOkC P Q σ = true) (n : Nat) :
    wfC P Q (tyC P σ n) = true := by
  unfold tyC
  split
  · rename_i h; simp [wfC, h]
  · cases hl : σ.ty.lookup n with
    | none => simpa using wf_empty P Q
    | some v => simpa using certOk_ty hc n v hl

/-- What `rowC` returns is a well-formed row in parts. -/
theorem rowC_wf {P : SigProblem Label B} {Q : CellQ Label}
    {σ : CellCert Label B} (hc : certOkC P Q σ = true) (r : Nat)
    (x : CRow Label B) (h : rowC P σ r = some x) :
    (∀ e ∈ x.1, wfC P Q e.2 = true) ∧ (∀ q ∈ x.2, q.row ∈ P.rigidRow) ∧
      SelfOK Q x := by
  unfold rowC at h
  split at h
  · rename_i hr
    simp only [Option.some.injEq] at h
    subst h
    refine ⟨by simp, by simp [wholePiece, hr], by simp [SelfOK]⟩
  · have hw : wfC P Q ((σ.row.lookup r).getD (.record [] [])) = true := by
      cases hl : σ.row.lookup r with
      | none => simpa using wf_empty P Q
      | some v => simpa using certOk_row hc r v hl
    split at h
    · rename_i fs ps he
      rw [he, wfC_record_iff] at hw
      simp only [Option.some.injEq] at h
      subst h
      exact hw
    · simp at h

theorem mapM_mem {α β : Type} (f : α → Option β) :
    ∀ (xs : List α) (ys : List β), xs.mapM f = some ys →
      ∀ y ∈ ys, ∃ x ∈ xs, f x = some y
  | [], ys, h => by simp at h; subst h; simp
  | x :: xs, ys, h => by
    simp only [List.mapM_cons, Option.bind_eq_bind, Option.bind_eq_some_iff,
      Option.pure_def, Option.some.injEq] at h
    obtain ⟨b, hb, bs, hbs, rfl⟩ := h
    intro y hy
    rcases List.mem_cons.1 hy with rfl | hy
    · exact ⟨x, by simp, hb⟩
    · obtain ⟨x', hx', hf⟩ := mapM_mem f xs bs hbs y hy
      exact ⟨x', by simp [hx'], hf⟩

mutual
  theorem evalC_wf (P : SigProblem Label B) (Q : CellQ Label)
      (σ : CellCert Label B) (hc : certOkC P Q σ = true) :
      ∀ (t : TExpr Label B) v, evalC P Q σ t = some v → wfC P Q v = true
    | .base b, v, h => by
      simp only [evalC, Option.some.injEq] at h; subst h; simp [wfC]
    | .arrow t u, v, h => by
      simp only [evalC, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
      obtain ⟨a, ha, c, hc', rfl⟩ := h
      simp [wfC, evalC_wf P Q σ hc t a ha, evalC_wf P Q σ hc u c hc']
    | .tvar n, v, h => by
      simp only [evalC, Option.some.injEq] at h; subst h; exact tyC_wf hc n
    | .record fs tails, v, h => by
      simp only [evalC, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
      obtain ⟨fr, hfr, rs, hrs, x, hx, rfl⟩ := h
      rw [composeC_iff] at hx
      obtain ⟨hpw, rfl⟩ := hx
      have hparts : ∀ p ∈ (fr, ([] : List (CellPiece Label))) :: rs,
          (∀ e ∈ p.1, wfC P Q e.2 = true) ∧ (∀ q ∈ p.2, q.row ∈ P.rigidRow) ∧
            SelfOK Q p := by
        intro p hp
        rcases List.mem_cons.1 hp with rfl | hp
        · exact ⟨evalFC_wf P Q σ hc fs fr hfr, by simp,
            selfOK_fields Q fr (evalFC_nodup P Q σ fs fr hfr)⟩
        · obtain ⟨r, _, hr⟩ := mapM_mem _ tails rs hrs p hp
          exact rowC_wf hc r p hr
      rw [wfC_record_iff]
      refine ⟨?_, ?_, selfOK_cat Q _ hpw fun p hp => (hparts p hp).2.2⟩
      · intro e he
        simp only [cat, List.mem_flatMap] at he
        obtain ⟨p, hp, he⟩ := he
        exact (hparts p hp).1 e he
      · intro q hq
        simp only [cat, List.mem_flatMap] at hq
        obtain ⟨p, hp, hq⟩ := hq
        exact (hparts p hp).2.1 q hq

  theorem evalFC_wf (P : SigProblem Label B) (Q : CellQ Label)
      (σ : CellCert Label B) (hc : certOkC P Q σ = true) :
      ∀ (fs : Fields Label B) r, evalFC P Q σ fs = some r →
        ∀ e ∈ r, wfC P Q e.2 = true
    | .nil, r, h => by simp [evalFC] at h; subst h; simp
    | .cons l t rest, r, h => by
      simp only [evalFC, Option.bind_eq_some_iff] at h
      obtain ⟨g, hg, r', hr', h⟩ := h
      split at h
      · simp at h
      · simp only [Option.some.injEq] at h
        subst h
        intro e he
        rcases List.mem_cons.1 he with rfl | he
        · exact evalC_wf P Q σ hc t g hg
        · exact evalFC_wf P Q σ hc rest r' hr' e he
end

end ProofsB

theorem dupRefused : DupRefused (Label := Label) (B := B) :=
  fun P Q σ fs r h => ProofsB.evalFC_nodup P Q σ fs r h

theorem evalWf : EvalWf (Label := Label) (B := B) :=
  fun P Q σ hc t v h => ProofsB.evalC_wf P Q σ hc t v h

end Composition.Typed.Cells
