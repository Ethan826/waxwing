/-
Stream W7: `divide5` is option-B valid (each label of `r` goes to `u`
when `s` lacks it, else to `t`; `q` is empty), and no cell certificate
passes: the equation needs some piece of `r` holding a written label
`a`, and each of `u`, `t`, `q` refuses it (`s`, resp. `s₂`, may hold
`a` with `r`; `q lacks a`).
-/
import Composition.Typed.Cell.Proofs.Main

namespace Composition.Typed.Cells.ProofsW7

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
theorem finG_subrow {f g : Row Label (G Label B)} (hf : FinG (.record f))
    (h : ∀ k, g k = none ∨ g k = f k) : FinG (.record g) := by
  obtain ⟨⟨ls, hls⟩, hk⟩ := (finG_record _).mp hf
  refine (finG_record _).mpr ⟨⟨ls, fun k hk' => hls k ?_⟩, fun k => ?_⟩
  · rcases h k with h | h
    · exact absurd h hk'
    · rwa [h] at hk'
  · rcases h k with h | h <;> rw [h]
    · trivial
    · exact hk k

/-- `u` takes `r` where `s` is absent, `t` where `s` is present. -/
def d5Wit (θR : Assign Label B) : Assign Label B :=
  ⟨fun _ => emptyG, fun r k =>
    if r = 3 then (if θR.row 1 k = none then θR.row 0 k else none)
    else if r = 4 then (if θR.row 1 k = none then none else θR.row 0 k)
    else none⟩

theorem d5_validFin (as : List Label) : ValidFin (divide5Sig (B := B) as) := by
  intro θR _ hrow hD
  have h0 := hrow 0 (by simp [divide5Sig])
  have h12 : Composition.Disjoint (θR.row 1) (θR.row 2) :=
    hD (.disjoint 1 2) (by simp [divide5Sig])
  have c3 : (combine (divide5Sig (B := B) as) θR (d5Wit θR)).row 3 =
      fun k => if θR.row 1 k = none then θR.row 0 k else none := by
    funext k; simp [combine, divide5Sig, d5Wit]
  have c4 : (combine (divide5Sig (B := B) as) θR (d5Wit θR)).row 4 =
      fun k => if θR.row 1 k = none then none else θR.row 0 k := by
    funext k; simp [combine, divide5Sig, d5Wit]
  have c5 : (combine (divide5Sig (B := B) as) θR (d5Wit θR)).row 5 =
      Row.empty := by
    funext k; simp [combine, divide5Sig, d5Wit, Row.empty]
  have cr : ∀ r ∈ [0, 1, 2],
      (combine (divide5Sig (B := B) as) θR (d5Wit θR)).row r = θR.row r :=
    fun r hr => by simp only [combine, divide5Sig, hr, ite_true]
  refine ⟨d5Wit θR, ⟨fun _ => finG_emptyG, fun r => ?_⟩, ?_⟩
  · simp only [d5Wit]
    split
    · exact finG_subrow h0 fun k => by split <;> simp
    · split
      · exact finG_subrow h0 fun k => by split <;> simp
      · exact finG_emptyG
  · intro x hx
    simp only [divide5Sig, List.mem_append, List.mem_cons, List.mem_map,
      List.not_mem_nil, or_false] at hx
    rcases hx with (rfl | rfl | rfl) | ⟨a, -, rfl⟩
    · refine ⟨.record (θR.row 0), ?_, ?_⟩
      · rw [evalT_tails]
        simp [composeAll_single, cr 0 (by simp)]
      · rw [evalT_tails]
        simp only [List.map_cons, List.map_nil, composeAll, compose_empty,
          c3, c4, c5, Option.bind_some]
        rw [compose_eq_some.mpr ⟨fun k => ?_, rfl⟩]
        · show some _ = _
          congr 2
          funext k
          simp only [union]
          by_cases h : θR.row 1 k = none <;> simp [h] <;>
            cases θR.row 0 k <;> rfl
        · by_cases h : θR.row 1 k = none <;> simp [h]
    · show Composition.Disjoint _ _
      rw [c3, cr 1 (by simp)]
      intro k
      by_cases h : θR.row 1 k = none <;> simp [h]
    · show Composition.Disjoint _ _
      rw [c4, cr 2 (by simp)]
      intro k
      by_cases h : θR.row 1 k = none
      · simp [h]
      · rcases h12 k with h' | h'
        · exact absurd h' h
        · exact Or.inr h'
    · show (combine (divide5Sig (B := B) as) θR (d5Wit θR)).row 5 a = none
      rw [c5]; rfl

omit [DecidableEq Label] in
theorem d5_mapBase {B₁ : Type} (i : B → B₁) (as : List Label) :
    (divide5Sig (B := B) as).mapBase i = divide5Sig as := by
  simp [SigProblem.mapBase, divide5Sig, mapBaseAtom, mapBaseT, mapBaseF,
    Function.comp_def]

theorem d5_open (as : List Label) : ValidOpen (divide5Sig (B := B) as) :=
  fun _ i _ => by rw [d5_mapBase i]; exact d5_validFin as

variable [DecidableEq B]

theorem d5_refused (as : List Label) (has : as ≠ []) (σ : CellCert Label B) :
    checkI (divide5Sig (B := B) as) σ = false := by
  obtain ⟨a, ha⟩ := List.exists_mem_of_ne_nil as has
  rw [Bool.eq_false_iff]
  intro hc
  have hB := bodyAll _ _ _ hc
  have haw : a ∈ written (divide5Sig (B := B) as) := by
    simp [written, labelsOf, divide5Sig]
    exact Or.inr (Or.inr ⟨_, ⟨a, ha, rfl⟩, by simp⟩)
  have hpw : (implQ (divide5Sig (B := B) as)).possW 0 a = true := by
    simp only [implQ, decide_eq_true haw, Bool.true_and]
    simp [holdersOK, divide5Sig]
  have hpb1 : (implQ (divide5Sig (B := B) as)).possBoth 0 1 a = true := by
    simp only [implQ, decide_eq_true haw, Bool.true_and]
    simp [holdersOK, divide5Sig]
  have hpb2 : (implQ (divide5Sig (B := B) as)).possBoth 0 2 a = true := by
    simp only [implQ, decide_eq_true haw, Bool.true_and]
    simp [holdersOK, divide5Sig]
  obtain ⟨p3, h3, ap3⟩ : ∃ p, rowC (divide5Sig (B := B) as) σ 3 = some p ∧
      apartC (implQ (divide5Sig (B := B) as)) p
        ([], [wholePiece (divide5Sig as) 1]) = true := by
    have := hB (.disjoint 3 1) (by simp [divide5Sig])
    have h1 : rowC (divide5Sig (B := B) as) σ 1 =
      some ([], [wholePiece (divide5Sig as) 1]) := rfl
    simp only [atomC, h1] at this
    cases h : rowC (divide5Sig (B := B) as) σ 3 with
    | none => simp only [h] at this; exact absurd this Bool.false_ne_true
    | some p => simp only [h] at this; exact ⟨p, rfl, this⟩
  obtain ⟨p4, h4, ap4⟩ : ∃ p, rowC (divide5Sig (B := B) as) σ 4 = some p ∧
      apartC (implQ (divide5Sig (B := B) as)) p
        ([], [wholePiece (divide5Sig as) 2]) = true := by
    have := hB (.disjoint 4 2) (by simp [divide5Sig])
    have h2 : rowC (divide5Sig (B := B) as) σ 2 =
      some ([], [wholePiece (divide5Sig as) 2]) := rfl
    simp only [atomC, h2] at this
    cases h : rowC (divide5Sig (B := B) as) σ 4 with
    | none => simp only [h] at this; exact absurd this Bool.false_ne_true
    | some p => simp only [h] at this; exact ⟨p, rfl, this⟩
  obtain ⟨p5, h5, lp5⟩ : ∃ p, rowC (divide5Sig (B := B) as) σ 5 = some p ∧
      lackC (implQ (divide5Sig (B := B) as)) p.2 a = true := by
    have := hB (.lacks 5 a) (by simp [divide5Sig, ha])
    simp only [atomC] at this
    cases h : rowC (divide5Sig (B := B) as) σ 5 with
    | none => simp only [h] at this; exact absurd this Bool.false_ne_true
    | some p =>
      simp only [h, Bool.and_eq_true] at this; exact ⟨p, rfl, this.2⟩
  have he := hB (.eq (.record .nil [0]) (.record .nil [3, 4, 5]))
    (by simp [divide5Sig])
  have hl : evalC (divide5Sig (B := B) as) (implQ (divide5Sig (B := B) as)) σ (.record .nil [0]) =
      some (.record [] [wholePiece (divide5Sig as) 0]) := rfl
  have hr : evalC (divide5Sig (B := B) as) (implQ (divide5Sig (B := B) as)) σ
      (.record .nil [3, 4, 5]) =
      (composeC (implQ (divide5Sig (B := B) as)) [([], []), p3, p4, p5]).map
        fun x => .record x.1 x.2 := by
    simp [evalC, evalFC, h3, h4, h5]
  simp only [atomC, hl, hr] at he
  cases hx : composeC (implQ (divide5Sig (B := B) as)) [([], []), p3, p4, p5]
    with
  | none => simp [hx] at he
  | some x =>
    simp only [hx, Option.map_some] at he
    obtain ⟨-, rfl⟩ := (ProofsB.composeC_iff _ _ _).1 hx
    simp only [eqC, sameW, Bool.and_eq_true] at he
    have hw := he.1.1.2
    simp [wholePiece, ProofsB.cat] at hw
    rcases hw a haw with h | ⟨q, hq, hq0, hqa⟩ | ⟨q, hq, hq0, hqa⟩ |
        ⟨q, hq, hq0, hqa⟩
    · rw [hpw] at h; exact Bool.noConfusion h
    · simp only [apartC, Bool.and_eq_true, List.all_eq_true] at ap3
      have := ap3.2 q hq _ (List.mem_singleton_self _)
      simp only [piecesApart, Bool.and_eq_true, List.all_eq_true] at this
      have := this.1 a hqa
      simp [wholePiece, haw, hq0, hpb1] at this
    · simp only [apartC, Bool.and_eq_true, List.all_eq_true] at ap4
      have := ap4.2 q hq _ (List.mem_singleton_self _)
      simp only [piecesApart, Bool.and_eq_true, List.all_eq_true] at this
      have := this.1 a hqa
      simp [wholePiece, haw, hq0, hpb2] at this
    · simp only [lackC, List.all_eq_true] at lp5
      have := lp5 q hq
      simp [hqa, hq0, hpw] at this

end Composition.Typed.Cells.ProofsW7
