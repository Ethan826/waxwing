/-
Tools for deciding the written part of a presence problem (dossier §18.6,
§18.11). `WrittenValid` and the first disjunct of O3 quantify over
assignments `Nat → LSet Label`, but on the written labels an atom reads
only the rigid indices the problem mentions (`mentioned`, D2Terms) and
the flexible indices `B` mentions (`flexMentioned`, Decide), and only
membership at the written labels. So a pattern is a finite set of pairs
(mentioned rigid index, written label), a written choice one of pairs
(mentioned flexible index, written label), and `subsets` lists them all.
`holdsW` evaluates an atom on the written labels as a `Bool`
(`holdsW_iff`); comparing labels needs `DecidableEq Label`, assumed
here only. `satD_congr` and `satB_congr` say the mentioned indices at
the written labels are all that matter. The checks built from these, and
the decider for `Valid`, are in DecideValid.
-/
import Composition.Presence.Decide
import Composition.Presence.O3
import Composition.Pattern

namespace Composition.Presence

open Composition.Syntax (dedup mem_dedup)

variable {Label : Type}

/-! ### Finite sets of pairs -/

/-- Every sublist of `xs`, as a list of its kept elements. -/
def subsets {α : Type} : List α → List (List α)
  | [] => [[]]
  | x :: xs => (subsets xs).flatMap fun s => [s, x :: s]

theorem subsets_sub {α : Type} :
    ∀ {xs s : List α}, s ∈ subsets xs → ∀ x ∈ s, x ∈ xs
  | [], s, h => by simp [subsets] at h; simp [h]
  | y :: ys, s, h => by
    simp only [subsets, List.mem_flatMap, List.mem_cons, List.not_mem_nil,
      or_false] at h
    obtain ⟨t, ht, rfl | rfl⟩ := h
    · exact fun x hx => List.mem_cons_of_mem _ (subsets_sub ht x hx)
    · intro x hx
      rcases List.mem_cons.mp hx with rfl | hx
      · exact List.mem_cons_self
      · exact List.mem_cons_of_mem _ (subsets_sub ht x hx)

/-- Every subset of `xs` is listed: one entry agrees with `p` on `xs`.
Classical: `p` need not be decidable. -/
theorem subsets_cover {α : Type} (p : α → Prop) :
    ∀ xs : List α, ∃ s ∈ subsets xs, ∀ x ∈ xs, (x ∈ s ↔ p x)
  | [] => ⟨[], by simp [subsets], by simp⟩
  | y :: ys => by
    obtain ⟨s, hs, hsp⟩ := subsets_cover p ys
    by_cases hy : p y
    · refine ⟨y :: s, ?_, fun x hx => ?_⟩
      · simp only [subsets, List.mem_flatMap]; exact ⟨s, hs, by simp⟩
      · by_cases hxy : x = y
        · subst hxy; simp [hy]
        · have hx' : x ∈ ys := (List.mem_cons.mp hx).resolve_left hxy
          simp [hxy, hsp x hx']
    · refine ⟨s, ?_, fun x hx => ?_⟩
      · simp only [subsets, List.mem_flatMap]; exact ⟨s, hs, by simp⟩
      · rcases List.mem_cons.mp hx with rfl | hx
        · exact iff_of_false
            (fun h => hy ((hsp _ (subsets_sub hs _ h)).mp h)) hy
        · exact hsp x hx

/-- The pairs `M × W`, each once. -/
def grid [DecidableEq Label] (M : List Nat) (W : List Label) :
    List (Nat × Label) :=
  dedup (M.flatMap fun i => W.map fun k => (i, k))

theorem mem_grid [DecidableEq Label] {M : List Nat} {W : List Label}
    {i : Nat} {k : Label} : (i, k) ∈ grid M W ↔ i ∈ M ∧ k ∈ W := by
  simp [grid, mem_dedup]

/-- A finite set of pairs as an assignment. -/
def pairSet (ps : List (Nat × Label)) : Nat → LSet Label :=
  fun i k => (i, k) ∈ ps

/-- `pairSet` as a `Bool`. -/
def pairBit [DecidableEq Label] (ps : List (Nat × Label)) :
    Nat → Label → Bool :=
  fun i k => decide ((i, k) ∈ ps)

/-- A listed set lies within the written labels `W`. -/
theorem grid_within [DecidableEq Label] {M : List Nat} {W : List Label}
    {ps : List (Nat × Label)} (h : ps ∈ subsets (grid M W)) :
    ∀ i k, pairSet ps i k → k ∈ W :=
  fun _ _ hk => (mem_grid.mp (subsets_sub h _ hk)).2

/-- Every assignment agrees on `M × W` with a listed set. -/
theorem grid_cover [DecidableEq Label] (M : List Nat) (W : List Label)
    (π : Nat → LSet Label) : ∃ ps ∈ subsets (grid M W),
      ∀ i ∈ M, ∀ k ∈ W, (pairSet ps i k ↔ π i k) :=
  let ⟨ps, hps, hc⟩ :=
    subsets_cover (fun x : Nat × Label => π x.1 x.2) (grid M W)
  ⟨ps, hps, fun i hi k hk => hc (i, k) (mem_grid.mpr ⟨hi, hk⟩)⟩

/-! ### Atoms on the written labels -/

/-- `eval` at a label, as a `Bool`. -/
def evalW [DecidableEq Label] (r f : Nat → Label → Bool) :
    SExpr Label → Label → Bool
  | .rigid i, k => r i k
  | .flex j, k => f j k
  | .lab l, k => decide (k = l)
  | .union a b, k => evalW r f a k || evalW r f b k

/-- `HoldsOn (· ∈ W)` as a `Bool`. -/
def holdsW [DecidableEq Label] (W : List Label)
    (r f : Nat → Label → Bool) : PAtom Label → Bool
  | .disj x y => W.all fun k => !(evalW r f x k && evalW r f y k)
  | .lacks l x => !decide (l ∈ W) || !evalW r f x l
  | .eq x y => W.all fun k => evalW r f x k == evalW r f y k

section Agree

variable [DecidableEq Label] {r f : Nat → Label → Bool}
  {ρ σ : Nat → LSet Label} (hr : ∀ i k, r i k = true ↔ ρ i k)
  (hf : ∀ j k, f j k = true ↔ σ j k)
include hr hf

theorem evalW_iff (k : Label) :
    ∀ e : SExpr Label, evalW r f e k = true ↔ eval ρ σ e k
  | .rigid i => hr i k
  | .flex j => hf j k
  | .lab _ => decide_eq_true_iff
  | .union a b => by
    simp only [evalW, eval, Bool.or_eq_true, evalW_iff k a, evalW_iff k b]

theorem holdsW_iff (W : List Label) :
    ∀ a : PAtom Label, holdsW W r f a = true ↔ HoldsOn (· ∈ W) ρ σ a
  | .disj x y => by
    simp only [holdsW, HoldsOn, List.all_eq_true]
    refine forall_congr' fun k => imp_congr_right fun _ => ?_
    rw [← evalW_iff hr hf k x, ← evalW_iff hr hf k y]
    cases evalW r f x k <;> cases evalW r f y k <;> decide
  | .lacks l x => by
    show (!decide (l ∈ W) || !evalW r f x l) = true ↔
      (l ∈ W → ¬ eval ρ σ x l)
    rw [← evalW_iff hr hf l x]
    cases evalW r f x l <;> by_cases hl : l ∈ W <;> simp [hl]
  | .eq x y => by
    simp only [holdsW, HoldsOn, List.all_eq_true]
    refine forall_congr' fun k => imp_congr_right fun _ => ?_
    rw [← evalW_iff hr hf k x, ← evalW_iff hr hf k y]
    cases evalW r f x k <;> cases evalW r f y k <;> decide

end Agree

/-- `eval` at `k` reads only the indices the expression mentions. -/
theorem eval_congr_idx {ρ ρ' σ σ' : Nat → LSet Label} {k : Label} :
    ∀ e : SExpr Label, (∀ i ∈ e.rigidIdx, ρ i k ↔ ρ' i k) →
      (∀ j ∈ e.flexIdx, σ j k ↔ σ' j k) →
      (eval ρ σ e k ↔ eval ρ' σ' e k)
  | .rigid i, hρ, _ => hρ i (by simp [SExpr.rigidIdx])
  | .flex j, _, hσ => hσ j (by simp [SExpr.flexIdx])
  | .lab _, _, _ => Iff.rfl
  | .union a b, hρ, hσ => or_congr
      (eval_congr_idx a (fun i h => hρ i (List.mem_append_left _ h))
        (fun j h => hσ j (List.mem_append_left _ h)))
      (eval_congr_idx b (fun i h => hρ i (List.mem_append_right _ h))
        (fun j h => hσ j (List.mem_append_right _ h)))

/-- On `K`, an atom reads only the mentioned indices at labels in `K`. -/
theorem holdsOn_congr_idx {K : LSet Label}
    {ρ ρ' σ σ' : Nat → LSet Label} :
    ∀ a : PAtom Label, (∀ i ∈ a.rigidIdx, ∀ k, K k → (ρ i k ↔ ρ' i k)) →
      (∀ j ∈ a.flexIdx, ∀ k, K k → (σ j k ↔ σ' j k)) →
      (HoldsOn K ρ σ a ↔ HoldsOn K ρ' σ' a)
  | .disj x y, hρ, hσ => forall_congr' fun k => imp_congr_right fun hk =>
      not_congr (and_congr
        (eval_congr_idx x (fun i h => hρ i (List.mem_append_left _ h) k hk)
          (fun j h => hσ j (List.mem_append_left _ h) k hk))
        (eval_congr_idx y (fun i h => hρ i (List.mem_append_right _ h) k hk)
          (fun j h => hσ j (List.mem_append_right _ h) k hk)))
  | .lacks l x, hρ, hσ => imp_congr_right fun hl => not_congr
      (eval_congr_idx x (fun i h => hρ i h l hl) (fun j h => hσ j h l hl))
  | .eq x y, hρ, hσ => forall_congr' fun k => imp_congr_right fun hk =>
      iff_congr
        (eval_congr_idx x (fun i h => hρ i (List.mem_append_left _ h) k hk)
          (fun j h => hσ j (List.mem_append_left _ h) k hk))
        (eval_congr_idx y (fun i h => hρ i (List.mem_append_right _ h) k hk)
          (fun j h => hσ j (List.mem_append_right _ h) k hk))

/-- `D` on the written labels reads `ρ` only on mentioned × written. -/
theorem satD_congr {P : PProblem Label} {ρ ρ' : Nat → LSet Label}
    (h : ∀ i ∈ mentioned P, ∀ k ∈ written P, (ρ i k ↔ ρ' i k)) :
    SatOn (· ∈ written P) ρ noFlex P.D ↔
      SatOn (· ∈ written P) ρ' noFlex P.D :=
  forall_congr' fun a => imp_congr_right fun ha =>
    holdsOn_congr_idx a (fun i hi k hk => h i (List.mem_flatMap.mpr
      ⟨a, List.mem_append_left _ ha, hi⟩) k hk) fun _ _ _ _ => Iff.rfl

/-- `B` on the written labels reads `σ` only on `flexMentioned P`. -/
theorem satB_congr {P : PProblem Label} {ρ ρ' σ σ' : Nat → LSet Label}
    (hρ : ∀ i ∈ mentioned P, ∀ k ∈ written P, (ρ i k ↔ ρ' i k))
    (hσ : ∀ j ∈ flexMentioned P, ∀ k ∈ written P, (σ j k ↔ σ' j k)) :
    SatOn (· ∈ written P) ρ σ P.B ↔ SatOn (· ∈ written P) ρ' σ' P.B :=
  forall_congr' fun a => imp_congr_right fun ha =>
    holdsOn_congr_idx a (fun i hi k hk => hρ i (List.mem_flatMap.mpr
      ⟨a, List.mem_append_right _ ha, hi⟩) k hk)
      fun j hj k hk => hσ j (List.mem_flatMap.mpr ⟨a, ha, hj⟩) k hk

end Composition.Presence
