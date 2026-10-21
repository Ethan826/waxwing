/-
Tools for D2 (presence): reading an atom at one unwritten label as a
bit check, and the set terms that build uniform witnesses.

At an unwritten label `k` an atom of the problem sees only `k`'s
membership in each set (a bit vector), so `HoldsOn` on the rest is
`HoldsB` at every rest label (`holdsB_of_holdsOn`, `holdsOn_of_holdsB`).
`HoldsB` reads only the rigid indices the atom mentions (`holdsB_congr`).
The region term of a bit vector `c` on the mentioned indices `M` holds
exactly the labels whose bits on `M` are `c`, provided some bit is set
(`region_eval`); `vecs M` lists a vector for every pattern on `M`.
-/
import Composition.Presence.Defs

namespace Composition.Presence

variable {Label : Type}

/-- The rigid indices an expression mentions. -/
def SExpr.rigidIdx : SExpr Label → List Nat
  | .rigid i => [i]
  | .union a b => a.rigidIdx ++ b.rigidIdx
  | _ => []

/-- The rigid indices an atom mentions. -/
def PAtom.rigidIdx : PAtom Label → List Nat
  | .disj a b => a.rigidIdx ++ b.rigidIdx
  | .lacks _ a => a.rigidIdx
  | .eq a b => a.rigidIdx ++ b.rigidIdx

/-- The rigid indices mentioned by a problem. -/
def mentioned (P : PProblem Label) : List Nat :=
  (P.D ++ P.B).flatMap PAtom.rigidIdx

/-! ### One unwritten label as bits -/

/-- `b` and `s` are label `k`'s membership in `ρ` and in `σ`. -/
def Bits (ρ σ : Nat → LSet Label) (k : Label) (b s : Nat → Bool) :
    Prop :=
  (∀ i, b i = true ↔ ρ i k) ∧ (∀ j, s j = true ↔ σ j k)

/-- Off the written labels `W`, an expression whose labels are in `W`
evaluates as its bit version (a written label is not `k`). -/
theorem eval_bits {W : List Label} {ρ σ : Nat → LSet Label} {k : Label}
    {b s : Nat → Bool} (hb : Bits ρ σ k b s) (hk : k ∉ W) :
    ∀ e : SExpr Label, (∀ l ∈ e.labels, l ∈ W) →
      (eval ρ σ e k ↔ evalB b s e = true)
  | .rigid i, _ => (hb.1 i).symm
  | .flex j, _ => (hb.2 j).symm
  | .lab l, hl => by
    have hlW : l ∈ W := hl l (by simp [SExpr.labels])
    simp only [eval, evalB]
    constructor
    · intro h; subst h; exact absurd hlW hk
    · intro h; cases h
  | .union x y, hl => by
    have hx := eval_bits hb hk x
      (fun l h => hl l (by simp [SExpr.labels, h]))
    have hy := eval_bits hb hk y
      (fun l h => hl l (by simp [SExpr.labels, h]))
    simp only [eval, evalB, Bool.or_eq_true, hx, hy]

/-- An atom holding on the rest holds bitwise at each rest label. -/
theorem holdsB_of_holdsOn {W : List Label} {ρ σ : Nat → LSet Label}
    {k : Label} {b s : Nat → Bool} (hb : Bits ρ σ k b s) (hk : k ∉ W)
    (a : PAtom Label) (hl : ∀ l ∈ a.labels, l ∈ W)
    (h : HoldsOn (· ∉ W) ρ σ a) : HoldsB b s a := by
  cases a with
  | disj x y =>
    have h' : ¬ (eval ρ σ x k ∧ eval ρ σ y k) := h k hk
    rw [eval_bits hb hk x (fun l h => hl l (by simp [PAtom.labels, h])),
      eval_bits hb hk y (fun l h => hl l (by simp [PAtom.labels, h]))]
      at h'
    exact h'
  | lacks => trivial
  | eq x y =>
    have h' := h k hk
    rw [eval_bits hb hk x (fun l h => hl l (by simp [PAtom.labels, h])),
      eval_bits hb hk y (fun l h => hl l (by simp [PAtom.labels, h]))]
      at h'
    exact Bool.eq_iff_iff.mpr h'

/-- Bitwise truth at every rest label gives truth on the rest; `lacks`
holds there because its label is written. -/
theorem holdsOn_of_holdsB {W : List Label} {ρ σ : Nat → LSet Label}
    (a : PAtom Label) (hl : ∀ l ∈ a.labels, l ∈ W)
    (h : ∀ k, k ∉ W → ∃ b s, Bits ρ σ k b s ∧ HoldsB b s a) :
    HoldsOn (· ∉ W) ρ σ a := by
  cases a with
  | disj x y =>
    intro k hk
    obtain ⟨b, s, hb, hB⟩ := h k hk
    rw [eval_bits hb hk x (fun l h => hl l (by simp [PAtom.labels, h])),
      eval_bits hb hk y (fun l h => hl l (by simp [PAtom.labels, h]))]
    exact hB
  | lacks l x =>
    intro hk
    exact absurd (hl l (by simp [PAtom.labels])) hk
  | eq x y =>
    intro k hk
    obtain ⟨b, s, hb, hB⟩ := h k hk
    rw [eval_bits hb hk x (fun l h => hl l (by simp [PAtom.labels, h])),
      eval_bits hb hk y (fun l h => hl l (by simp [PAtom.labels, h]))]
    exact Bool.eq_iff_iff.mp hB

/-- `evalB` reads only the mentioned rigid bits. -/
theorem evalB_congr {b b' s : Nat → Bool} :
    ∀ e : SExpr Label, (∀ i ∈ e.rigidIdx, b i = b' i) →
      evalB b s e = evalB b' s e
  | .rigid i, h => h i (by simp [SExpr.rigidIdx])
  | .flex _, _ => rfl
  | .lab _, _ => rfl
  | .union x y, h => by
    simp only [evalB]
    rw [evalB_congr x (fun i hi => h i (by simp [SExpr.rigidIdx, hi])),
      evalB_congr y (fun i hi => h i (by simp [SExpr.rigidIdx, hi]))]

/-- `HoldsB` reads only the mentioned rigid bits. -/
theorem holdsB_congr {b b' s : Nat → Bool} (a : PAtom Label)
    (h : ∀ i ∈ a.rigidIdx, b i = b' i) : HoldsB b s a ↔ HoldsB b' s a := by
  cases a with
  | disj x y =>
    simp only [HoldsB]
    rw [evalB_congr x (fun i hi => h i (by simp [PAtom.rigidIdx, hi])),
      evalB_congr y (fun i hi => h i (by simp [PAtom.rigidIdx, hi]))]
  | lacks => exact Iff.rfl
  | eq x y =>
    simp only [HoldsB]
    rw [evalB_congr x (fun i hi => h i (by simp [PAtom.rigidIdx, hi])),
      evalB_congr y (fun i hi => h i (by simp [PAtom.rigidIdx, hi]))]

theorem evalB_allFalse :
    ∀ e : SExpr Label, evalB (fun _ => false) (fun _ => false) e = false
  | .rigid _ => rfl
  | .flex _ => rfl
  | .lab _ => rfl
  | .union x y => by simp only [evalB, evalB_allFalse x, evalB_allFalse y]; rfl

/-- A label in no set satisfies every atom. -/
theorem holdsB_zero (a : PAtom Label) :
    HoldsB (fun _ => false) (fun _ => false) a := by
  cases a <;> simp [HoldsB, evalB_allFalse]

/-! ### Set terms -/

/-- The union of the rigid rests in `is`. -/
def unionT : List Nat → STerm
  | [] => .empty
  | i :: is => .union (.rigid i) (unionT is)

/-- `u` intersected with the rigid rests in `is`. -/
def interT : List Nat → STerm → STerm
  | [], u => u
  | i :: is, u => .inter (.rigid i) (interT is u)

/-- The union of a list of terms. -/
def unionAll : List STerm → STerm
  | [] => .empty
  | u :: us => .union u (unionAll us)

theorem unionT_eval (R : Nat → LSet Label) (k : Label) :
    ∀ is : List Nat, (unionT is).eval R k ↔ ∃ i ∈ is, R i k
  | [] => by simp [unionT, STerm.eval]
  | i :: is => by simp [unionT, STerm.eval, unionT_eval R k is]

theorem interT_eval (R : Nat → LSet Label) (k : Label) (u : STerm) :
    ∀ is : List Nat, (interT is u).eval R k ↔
      (∀ i ∈ is, R i k) ∧ u.eval R k
  | [] => by simp [interT]
  | i :: is => by
    simp [interT, STerm.eval, interT_eval R k u is, and_assoc]

theorem unionAll_eval (R : Nat → LSet Label) (k : Label) :
    ∀ us : List STerm, (unionAll us).eval R k ↔ ∃ u ∈ us, u.eval R k
  | [] => by simp [unionAll, STerm.eval]
  | u :: us => by simp [unionAll, STerm.eval, unionAll_eval R k us]

/-- The labels whose bits on `M` are `c`, within the union of `M`'s
rests (no complement is available, so the all-false region is not a
term; it needs none, see D2.lean). -/
def region (M : List Nat) (c : Nat → Bool) : STerm :=
  .diff (interT (M.filter c) (unionT M))
    (unionT (M.filter fun i => !c i))

theorem region_eval (R : Nat → LSet Label) (k : Label) (M : List Nat)
    (c : Nat → Bool) : (region M c).eval R k ↔
      (∀ i ∈ M, c i = true ↔ R i k) ∧ ∃ i ∈ M, R i k := by
  simp only [region, STerm.eval, interT_eval, unionT_eval, List.mem_filter,
    Bool.not_eq_true']
  constructor
  · rintro ⟨⟨hT, hM⟩, hF⟩
    refine ⟨fun i hi => ⟨fun hc => hT i ⟨hi, hc⟩, fun hR => ?_⟩, hM⟩
    cases hc : c i
    · exact absurd ⟨i, ⟨hi, hc⟩, hR⟩ hF
    · rfl
  · rintro ⟨hc, hM⟩
    refine ⟨⟨fun i hi => (hc i hi.1).mp hi.2, hM⟩, ?_⟩
    rintro ⟨i, ⟨hi, hf⟩, hR⟩
    have := (hc i hi).mpr hR
    rw [hf] at this
    cases this

/-- One vector for each pattern of bits on `M`. -/
def vecs : List Nat → List (Nat → Bool)
  | [] => [fun _ => false]
  | i :: is => (vecs is).flatMap fun c =>
      [false, true].map fun v x => if x = i then v else c x

theorem vecs_cover (b : Nat → Bool) :
    ∀ M : List Nat, ∃ c ∈ vecs M, ∀ i ∈ M, c i = b i
  | [] => ⟨fun _ => false, by simp [vecs], by simp⟩
  | i :: is => by
    obtain ⟨c, hc, hcb⟩ := vecs_cover b is
    refine ⟨fun x => if x = i then b i else c x, ?_, ?_⟩
    · simp only [vecs, List.mem_flatMap, List.mem_map]
      exact ⟨c, hc, b i, by cases b i <;> simp, rfl⟩
    · intro x hx
      by_cases hxi : x = i
      · subst hxi; simp
      · show (if x = i then b i else c x) = b x
        simp only [hxi, ite_false]
        exact hcb x (by simpa [hxi] using hx)

/-- `b`'s bits on `M`, false elsewhere. -/
def restrict (M : List Nat) (b : Nat → Bool) : Nat → Bool :=
  fun x => if x ∈ M then b x else false

theorem restrict_eq {M : List Nat} {b b' : Nat → Bool}
    (h : ∀ i ∈ M, b i = b' i) : restrict M b = restrict M b' := by
  funext x
  by_cases hx : x ∈ M <;> simp [restrict, hx, h]

end Composition.Presence
