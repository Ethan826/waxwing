/-
Proof stream C, part 5 (equality): CB3 `EqSound` (`eqSound`), by
induction on the size of the compared values.
-/
import Composition.Typed.Cell.Proofs.C.Pieces

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

theorem eqFC_lookup {Q : CellQ Label} {yf : List (Label × CellV Label B)} :
    ∀ {xf : List (Label × CellV Label B)}, eqFC Q yf xf = true →
      ∀ l a, (l, a) ∈ xf → ∃ b, yf.lookup l = some b ∧ eqC Q a b = true
  | [], _, l, a, h => by simp at h
  | (l', a') :: rest, h, l, a, hm => by
    simp only [eqFC, Bool.and_eq_true] at h
    rcases List.mem_cons.mp hm with he | hm
    · cases he
      split at h
      · rename_i b hb; exact ⟨b, hb, h.1⟩
      · simp at h
    · exact eqFC_lookup h.2 l a hm

theorem eqSound_aux {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs) :
    ∀ (n : Nat) (a b : CellV Label B), sizeOf a < n →
      wfC P Q a = true → wfC P Q b = true →
      eqC Q a b = true → cvDen P θs a = cvDen P θs b
  | 0, _, _, hs, _, _, _ => absurd hs (Nat.not_lt_zero _)
  | _ + 1, .base x, b, _, _, _, h => by
    cases b <;> simp [eqC] at h
    subst h; rfl
  | _ + 1, .rty n, b, _, _, _, h => by
    cases b <;> simp [eqC] at h
    subst h; rfl
  | n + 1, .arrow a c, b, hs, ha, hb, h => by
    cases b with
    | arrow a' c' =>
      simp only [wfC, Bool.and_eq_true] at ha hb
      simp only [eqC, Bool.and_eq_true] at h
      simp only [CellV.arrow.sizeOf_spec] at hs
      simp only [cvDen]
      rw [eqSound_aux hQ hreg n a a' (by omega) ha.1 hb.1 h.1,
        eqSound_aux hQ hreg n c c' (by omega) ha.2 hb.2 h.2]
    | _ => simp [eqC] at h
  | n + 1, .record xf xp, b, hs, ha, hb, h => by
    cases b with
    | record yf yp =>
      simp only [wfC, Bool.and_eq_true] at ha hb
      simp only [eqC, Bool.and_eq_true, List.all_eq_true, List.any_eq_true,
        decide_eq_true_eq] at h
      obtain ⟨⟨⟨⟨hfc, hlab⟩, hw1⟩, hw2⟩, hcells⟩ := h
      have IH : ∀ l a', (l, a') ∈ xf → ∀ b', wfC P Q a' = true →
          wfC P Q b' = true → eqC Q a' b' = true →
          cvDen P θs a' = cvDen P θs b' := fun l a' hm b' h1 h2 h3 =>
        have hlt : sizeOf a' < n := by
          have := List.sizeOf_lt_of_mem hm
          simp only [Prod.mk.sizeOf_spec] at this
          simp only [CellV.record.sizeOf_spec] at hs
          omega
        eqSound_aux hQ hreg n a' b' hlt h1 h2 h3
      have hfields : ∀ l, cvDenFields P θs xf (.inl l) =
          cvDenFields P θs yf (.inl l) := by
        intro l
        rw [cvDenFields_inl, cvDenFields_inl]
        cases hx : xf.lookup l with
        | none =>
          cases hy : yf.lookup l with
          | none => rfl
          | some b =>
            obtain ⟨e', he', hl'⟩ := hlab (l, b) (mem_of_lookup hy)
            have := lookup_isSome (fs := xf) ⟨e', he', hl'⟩
            simp [hx] at this
        | some a =>
          obtain ⟨b, hb', hab⟩ := eqFC_lookup hfc l a (mem_of_lookup hx)
          rw [hb']
          simp only [Option.map_some, Option.some.injEq]
          exact IH l a (mem_of_lookup hx) b
            (wfFC_mem ha.1.1 _ (mem_of_lookup hx))
            (wfFC_mem hb.1.1 _ (mem_of_lookup hb')) hab
      have hcx := wf_pcoh hQ hreg ha.2
      have hcy := wf_pcoh hQ hreg hb.2
      simp only [sameCells, Bool.and_eq_true, List.all_eq_true,
        List.mem_append] at hcells
      have hpieces : ∀ k, cpiecesRow P θs xp k = cpiecesRow P θs yp k :=
        fun k => pieces_eq hcx hcy k
          (transfer hQ hreg hw1 (fun q hq => (hcells q (Or.inl hq)).1) k)
          (transfer hQ hreg hw2 (fun q hq => (hcells q (Or.inr hq)).2) k)
      simp only [cvDen]
      congr 1
      funext k
      cases k with
      | inl l => simp only [union, hfields l, hpieces]
      | inr S => simp only [union, cvDenFields_inr, hpieces]
    | _ => simp [eqC] at h

end Composition.Typed.Cells.ProofsC

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- CB3. -/
theorem eqSound : EqSound (Label := Label) (B := B) :=
  fun _ _ hQ _ hreg a b ha hb h =>
    ProofsC.eqSound_aux hQ hreg (sizeOf a + 1) a b (Nat.lt_succ_self _) ha hb h

end Composition.Typed.Cells
