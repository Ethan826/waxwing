/-
O1's per-label lemmas (dossier §18.6, §18.11). Every atom is a
condition at one label at a time. At a label `k` that no atom writes,
a label constant is false, so an atom's truth at `k` depends only on
the membership bits of `k` in the rigid and flexible sets
(`holdsOn_rest_iff`). With every flexible bit false, an atom can fail
only through a rigid set it mentions that holds `k`
(`holdsB_zero_of_rigids`); this bounds the labels a witness needs.
-/
import Composition.Presence.Defs

namespace Composition.Presence

variable {Label : Type}

open Classical

/-- The membership bits of label `k` in the sets `ρ`. -/
noncomputable def bits (ρ : Nat → LSet Label) (k : Label) : Nat → Bool :=
  fun i => decide (ρ i k)

theorem bits_true {ρ : Nat → LSet Label} {k : Label} {i : Nat}
    (h : ρ i k) : bits ρ k i = true := decide_eq_true h

theorem bits_false {ρ : Nat → LSet Label} {k : Label} {i : Nat}
    (h : ¬ ρ i k) : bits ρ k i = false := decide_eq_false h

theorem of_bits {ρ : Nat → LSet Label} {k : Label} {i : Nat}
    (h : bits ρ k i = true) : ρ i k := of_decide_eq_true h

/-- The rigid indices an expression mentions. -/
def SExpr.rigids : SExpr Label → List Nat
  | .rigid i => [i]
  | .union a b => a.rigids ++ b.rigids
  | _ => []

/-- The rigid indices an atom mentions. -/
def PAtom.rigids : PAtom Label → List Nat
  | .disj a b => a.rigids ++ b.rigids
  | .lacks _ a => a.rigids
  | .eq a b => a.rigids ++ b.rigids

/-- At a label `x` does not write, `eval` is `evalB` of the bits. -/
theorem eval_iff_evalB (ρ σ : Nat → LSet Label) (k : Label) :
    ∀ x : SExpr Label, k ∉ x.labels →
      (eval ρ σ x k ↔ evalB (bits ρ k) (bits σ k) x = true)
  | .rigid i, _ => by simp [eval, evalB, bits]
  | .flex j, _ => by simp [eval, evalB, bits]
  | .lab l, h => by
    -- `k ≠ l`, since `l` is the only written label of `.lab l`.
    have : k ≠ l := fun e => h (by simp [SExpr.labels, e])
    simp [eval, evalB, this]
  | .union a b, h => by
    have ha : k ∉ a.labels := fun m => h (by simp [SExpr.labels, m])
    have hb : k ∉ b.labels := fun m => h (by simp [SExpr.labels, m])
    simp [eval, evalB, eval_iff_evalB ρ σ k a ha,
      eval_iff_evalB ρ σ k b hb]

/-- Bits of equal truth values are equal. -/
private theorem bool_eq_of_iff {p q : Bool} (h : p = true ↔ q = true) :
    p = q := by
  cases p <;> cases q <;> simp_all

/-- On the labels outside `W`, which hold every label `a` writes, an
atom holds iff it holds at the bits of each such label. -/
theorem holdsOn_rest_iff (W : List Label) (ρ σ : Nat → LSet Label)
    (a : PAtom Label) (hW : ∀ l ∈ a.labels, l ∈ W) :
    HoldsOn (· ∉ W) ρ σ a ↔
      ∀ k, k ∉ W → HoldsB (bits ρ k) (bits σ k) a := by
  cases a with
  | disj x y =>
    have hx : ∀ k, k ∉ W → k ∉ x.labels := fun k hk m =>
      hk (hW k (by simp [PAtom.labels, m]))
    have hy : ∀ k, k ∉ W → k ∉ y.labels := fun k hk m =>
      hk (hW k (by simp [PAtom.labels, m]))
    simp only [HoldsOn, HoldsB]
    exact ⟨fun h k hk => by
        rw [← eval_iff_evalB ρ σ k x (hx k hk),
          ← eval_iff_evalB ρ σ k y (hy k hk)]
        exact h k hk,
      fun h k hk => by
        rw [eval_iff_evalB ρ σ k x (hx k hk),
          eval_iff_evalB ρ σ k y (hy k hk)]
        exact h k hk⟩
  | lacks l x =>
    -- `l` is written, so it is not among the labels outside `W`.
    have hl : l ∈ W := hW l (by simp [PAtom.labels])
    simp only [HoldsOn, HoldsB]
    exact ⟨fun _ _ _ => trivial, fun _ h => absurd hl h⟩
  | eq x y =>
    have hx : ∀ k, k ∉ W → k ∉ x.labels := fun k hk m =>
      hk (hW k (by simp [PAtom.labels, m]))
    have hy : ∀ k, k ∉ W → k ∉ y.labels := fun k hk m =>
      hk (hW k (by simp [PAtom.labels, m]))
    simp only [HoldsOn, HoldsB]
    exact ⟨fun h k hk => bool_eq_of_iff (by
        rw [← eval_iff_evalB ρ σ k x (hx k hk),
          ← eval_iff_evalB ρ σ k y (hy k hk)]
        exact h k hk),
      fun h k hk => by
        rw [eval_iff_evalB ρ σ k x (hx k hk),
          eval_iff_evalB ρ σ k y (hy k hk), h k hk]⟩

/-- With every flexible bit false, an expression is false when every
rigid set it mentions has bit false. -/
theorem evalB_zero (b : Nat → Bool) :
    ∀ x : SExpr Label, (∀ i ∈ x.rigids, b i = false) →
      evalB b (fun _ => false) x = false
  | .rigid i, h => by simpa [evalB] using h i (by simp [SExpr.rigids])
  | .flex _, _ => rfl
  | .lab _, _ => rfl
  | .union x y, h => by
    simp only [evalB]
    rw [evalB_zero b x (fun i m => h i (by simp [SExpr.rigids, m])),
      evalB_zero b y (fun i m => h i (by simp [SExpr.rigids, m]))]
    rfl

/-- With every flexible bit false, an atom holds when every rigid set it
mentions has bit false. -/
theorem holdsB_zero_of_rigids (b : Nat → Bool) (a : PAtom Label)
    (h : ∀ i ∈ a.rigids, b i = false) :
    HoldsB b (fun _ => false) a := by
  cases a with
  | disj x y =>
    simp only [HoldsB]
    rw [evalB_zero b x (fun i m => h i (by simp [PAtom.rigids, m]))]
    simp
  | lacks _ _ => trivial
  | eq x y =>
    simp only [HoldsB]
    rw [evalB_zero b x (fun i m => h i (by simp [PAtom.rigids, m])),
      evalB_zero b y (fun i m => h i (by simp [PAtom.rigids, m]))]

/-- Every label an atom of the problem writes is written. -/
theorem labels_written (P : PProblem Label) (a : PAtom Label)
    (ha : a ∈ P.D ++ P.B) : ∀ l ∈ a.labels, l ∈ written P := by
  intro l hl
  simp only [written, List.mem_flatMap]
  exact ⟨a, ha, hl⟩

/-- No flexible set holds anything: its bits are all false. -/
theorem bits_noFlex (k : Label) :
    bits (noFlex (Label := Label)) k = fun _ => false := by
  funext j
  exact bits_false id

end Composition.Presence
