/-
Proof stream B (research/division-campaign/cellcheck/proof-plan.md),
part 2: well-formedness. `wfC` on records, certificate lookups, and
the mutual induction showing `evalC` returns well-formed cells.
-/
import Composition.Typed.Cell.Proofs.B.Apart

namespace Composition.Typed.Cells.ProofsB

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

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

end Composition.Typed.Cells.ProofsB
