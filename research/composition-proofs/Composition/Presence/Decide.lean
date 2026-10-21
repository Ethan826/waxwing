/-
The per-region check is decidable (dossier §18.6, §18.11): `BitValid`
quantifies over all bit vectors `b, s : Nat → Bool`, but `HoldsB` reads
only the indices the problem mentions, so it is enough to try every
vector on the mentioned rigid indices (`mentioned`, D2Terms) and to
search the vectors on the mentioned flexible indices (`flexMentioned`).
`bitCheck` does this with `vecs` (D2Terms) and is computable;
`bitCheck_iff` shows it decides `BitValid`, and with O1's two halves
(`restValid_iff_bitCheck`) it decides `RestValid` when there are
infinitely many labels. The `#guard`s run it on small problems.
-/
import Composition.Presence.D2Terms
import Composition.Presence.O1

namespace Composition.Presence

variable {Label : Type}

/-- The flexible indices an expression mentions. -/
def SExpr.flexIdx : SExpr Label → List Nat
  | .flex j => [j]
  | .union a b => a.flexIdx ++ b.flexIdx
  | _ => []

/-- The flexible indices an atom mentions. -/
def PAtom.flexIdx : PAtom Label → List Nat
  | .disj a b => a.flexIdx ++ b.flexIdx
  | .lacks _ a => a.flexIdx
  | .eq a b => a.flexIdx ++ b.flexIdx

/-- The flexible indices mentioned by `B`. -/
def flexMentioned (P : PProblem Label) : List Nat :=
  P.B.flatMap PAtom.flexIdx

/-- `HoldsB` as a `Bool`. -/
def holdsBB (b s : Nat → Bool) : PAtom Label → Bool
  | .disj x y => !(evalB b s x && evalB b s y)
  | .lacks _ _ => true
  | .eq x y => evalB b s x == evalB b s y

theorem holdsBB_iff (b s : Nat → Bool) (a : PAtom Label) :
    holdsBB b s a = true ↔ HoldsB b s a := by
  cases a with
  | disj x y =>
    simp only [holdsBB, HoldsB]
    cases evalB b s x <;> cases evalB b s y <;> decide
  | lacks => simp [holdsBB, HoldsB]
  | eq x y =>
    simp only [holdsBB, HoldsB]
    cases evalB b s x <;> cases evalB b s y <;> decide

/-- `evalB` reads only the mentioned flexible bits. -/
theorem evalB_congr_flex {b s s' : Nat → Bool} :
    ∀ e : SExpr Label, (∀ j ∈ e.flexIdx, s j = s' j) →
      evalB b s e = evalB b s' e
  | .rigid _, _ => rfl
  | .flex j, h => h j (by simp [SExpr.flexIdx])
  | .lab _, _ => rfl
  | .union x y, h => by
    simp only [evalB]
    rw [evalB_congr_flex x (fun j hj => h j (by simp [SExpr.flexIdx, hj])),
      evalB_congr_flex y (fun j hj => h j (by simp [SExpr.flexIdx, hj]))]

/-- `HoldsB` reads only the mentioned flexible bits. -/
theorem holdsB_congr_flex {b s s' : Nat → Bool} (a : PAtom Label)
    (h : ∀ j ∈ a.flexIdx, s j = s' j) : HoldsB b s a ↔ HoldsB b s' a := by
  cases a with
  | disj x y =>
    simp only [HoldsB]
    rw [evalB_congr_flex x (fun j hj => h j (by simp [PAtom.flexIdx, hj])),
      evalB_congr_flex y (fun j hj => h j (by simp [PAtom.flexIdx, hj]))]
  | lacks => exact Iff.rfl
  | eq x y =>
    simp only [HoldsB]
    rw [evalB_congr_flex x (fun j hj => h j (by simp [PAtom.flexIdx, hj])),
      evalB_congr_flex y (fun j hj => h j (by simp [PAtom.flexIdx, hj]))]

/-- The finite per-region check: every rigid vector on the mentioned
rigid indices that `D` allows has a flexible vector on the mentioned
flexible indices satisfying `B`. -/
def bitCheck (P : PProblem Label) : Bool :=
  (vecs (mentioned P)).all fun b =>
    !(P.D.all (holdsBB b fun _ => false)) ||
      (vecs (flexMentioned P)).any fun s => P.B.all (holdsBB b s)

/-- Atoms of `D` and `B` read rigid indices in `mentioned P`. -/
private theorem rigid_mem {P : PProblem Label} {a : PAtom Label}
    (ha : a ∈ P.D ++ P.B) : ∀ i ∈ a.rigidIdx, i ∈ mentioned P :=
  fun _ hi => List.mem_flatMap.mpr ⟨a, ha, hi⟩

/-- `D` and `B` hold at `b` iff at any `c` agreeing on `mentioned P`. -/
private theorem holdsB_mentioned {P : PProblem Label} {b c s : Nat → Bool}
    (hc : ∀ i ∈ mentioned P, c i = b i) {a : PAtom Label}
    (ha : a ∈ P.D ++ P.B) : HoldsB c s a ↔ HoldsB b s a :=
  holdsB_congr a fun i hi => hc i (rigid_mem ha i hi)

/-- The finite check decides the per-region check: bits outside the
mentioned indices do not matter. -/
theorem bitCheck_iff (P : PProblem Label) :
    bitCheck P = true ↔ BitValid P := by
  simp only [bitCheck, List.all_eq_true, Bool.or_eq_true,
    Bool.not_eq_true', List.any_eq_true]
  constructor
  · intro h b hD
    obtain ⟨c, hc, hcb⟩ := vecs_cover b (mentioned P)
    rcases h c hc with hF | ⟨s, -, hs⟩
    · -- `D` holds at `c`, contradicting `hF`.
      have hall : (P.D.all (holdsBB c fun _ => false)) = true :=
        List.all_eq_true.mpr fun a ha => (holdsBB_iff _ _ a).mpr
          ((holdsB_mentioned hcb (List.mem_append_left _ ha)).mpr
            (hD a ha))
      rw [hF] at hall
      cases hall
    · exact ⟨s, fun a ha => (holdsB_mentioned hcb
        (List.mem_append_right _ ha)).mp ((holdsBB_iff _ _ a).mp
          (hs a ha))⟩
  · intro h c _
    cases hD : P.D.all (holdsBB c fun _ => false)
    · exact Or.inl rfl
    · right
      have hD' : ∀ a ∈ P.D, HoldsB c (fun _ => false) a := fun a ha =>
        (holdsBB_iff _ _ a).mp (List.all_eq_true.mp hD a ha)
      obtain ⟨s, hs⟩ := h c hD'
      obtain ⟨s', hs', hss⟩ := vecs_cover s (flexMentioned P)
      refine ⟨s', hs', fun a ha => (holdsBB_iff _ _ a).mpr ?_⟩
      exact (holdsB_congr_flex a fun j hj =>
        (hss j (List.mem_flatMap.mpr ⟨a, ha, hj⟩)).symm).mp (hs a ha)

/-- With infinitely many labels, the rest part is decided by the finite
check (through O1's two halves; `Scoped` is not needed). -/
theorem restValid_iff_bitCheck (hinf : InfiniteLabels Label)
    (P : PProblem Label) : RestValid P ↔ bitCheck P = true :=
  ⟨fun h => (bitCheck_iff P).mpr (bitValid_of_restValid hinf P h),
    fun h => restValid_of_bitValid P ((bitCheck_iff P).mp h)⟩

/-! ### Examples -/

/-- The split presence problem: `r0 = u ∪ v` with `u` avoiding `r1` and
`v` avoiding `r2`, given `r1 ∩ r2 = ∅`. -/
def splitB : List (PAtom Nat) :=
  [.eq (.rigid 0) (.union (.flex 0) (.flex 1)),
    .disj (.flex 0) (.flex 1),
    .disj (.flex 0) (.rigid 1),
    .disj (.flex 1) (.rigid 2)]

def splitD : List (PAtom Nat) := [.disj (.rigid 1) (.rigid 2)]

#guard bitCheck { D := splitD, B := splitB }
-- Without `D`, a label in `r0`, `r1` and `r2` has nowhere to go.
#guard !bitCheck { D := [], B := splitB }
-- `r0 ∩ r0 = ∅` fails at a label in `r0`.
#guard !bitCheck ({ D := [], B := [.disj (.rigid 0) (.rigid 0)] } :
  PProblem Nat)

end Composition.Presence
