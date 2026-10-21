/-
Validity is decidable (dossier §18.6, §18.11). `dSatCheck` tries every
pattern on the mentioned rigid indices × written labels against `D`;
`writtenCheck` searches, for each pattern `D` allows, the written
choices on the mentioned flexible indices × written labels for one
satisfying `B` (DecideWritten). `dWritten_iff` and `writtenCheck_iff`
show they decide the two statements of O3 that quantify over written
assignments; with `restValid_iff_bitCheck` (Decide), `validCheck`
decides `Valid` when there are infinitely many labels
(`valid_iff_validCheck`). The `#guard`s run it on small problems,
including ones where the written part decides the answer.
-/
import Composition.Presence.DecideWritten

namespace Composition.Presence

variable {Label : Type} [DecidableEq Label]

/-- The pattern `ps` satisfies `D` on the written labels. -/
def dOn (P : PProblem Label) (ps : List (Nat × Label)) : Bool :=
  P.D.all (holdsW (written P) (pairBit ps) fun _ _ => false)

/-- The pattern `ps` and the choice `qs` satisfy `B` on the written
labels. -/
def bOn (P : PProblem Label) (ps qs : List (Nat × Label)) : Bool :=
  P.B.all (holdsW (written P) (pairBit ps) (pairBit qs))

/-- Some pattern satisfies `D` on the written labels. -/
def dSatCheck (P : PProblem Label) : Bool :=
  (subsets (grid (mentioned P) (written P))).any (dOn P)

/-- Every pattern satisfying `D` on the written labels has a written
choice satisfying `B` there. -/
def writtenCheck (P : PProblem Label) : Bool :=
  (subsets (grid (mentioned P) (written P))).all fun ps =>
    !dOn P ps ||
      (subsets (grid (flexMentioned P) (written P))).any (bOn P ps)

/-- `D` impossible on the written labels, or both parts valid. -/
def validCheck (P : PProblem Label) : Bool :=
  !dSatCheck P || (writtenCheck P && bitCheck P)

theorem pairBit_iff (ps : List (Nat × Label)) (i : Nat) (k : Label) :
    pairBit ps i k = true ↔ pairSet ps i k :=
  decide_eq_true_iff

theorem dOn_iff (P : PProblem Label) (ps : List (Nat × Label)) :
    dOn P ps = true ↔ SatOn (· ∈ written P) (pairSet ps) noFlex P.D := by
  simp only [dOn, List.all_eq_true]
  exact forall_congr' fun a => imp_congr_right fun _ =>
    holdsW_iff (pairBit_iff ps)
      (fun _ _ => ⟨(fun h => nomatch h), False.elim⟩) _ a

theorem bOn_iff (P : PProblem Label) (ps qs : List (Nat × Label)) :
    bOn P ps qs = true ↔
      SatOn (· ∈ written P) (pairSet ps) (pairSet qs) P.B := by
  simp only [bOn, List.all_eq_true]
  exact forall_congr' fun a => imp_congr_right fun _ =>
    holdsW_iff (pairBit_iff ps) (pairBit_iff qs) _ a

/-- `dSatCheck` decides whether `D` is possible on the written labels. -/
theorem dWritten_iff (P : PProblem Label) :
    dSatCheck P = true ↔ ∃ π : Nat → LSet Label,
      (∀ i k, π i k → k ∈ written P) ∧
      SatOn (· ∈ written P) π noFlex P.D := by
  simp only [dSatCheck, List.any_eq_true]
  constructor
  · rintro ⟨ps, hps, hD⟩
    exact ⟨pairSet ps, grid_within hps, (dOn_iff P ps).mp hD⟩
  · rintro ⟨π, -, hD⟩
    obtain ⟨ps, hps, hc⟩ := grid_cover (mentioned P) (written P) π
    exact ⟨ps, hps, (dOn_iff P ps).mpr ((satD_congr hc).mpr hD)⟩

/-- `writtenCheck` decides the written part. -/
theorem writtenCheck_iff (P : PProblem Label) :
    writtenCheck P = true ↔ WrittenValid P := by
  simp only [writtenCheck, List.all_eq_true, Bool.or_eq_true,
    Bool.not_eq_true', List.any_eq_true]
  constructor
  · intro h π _ hD
    obtain ⟨ps, hps, hc⟩ := grid_cover (mentioned P) (written P) π
    rcases h ps hps with hF | ⟨qs, hqs, hB⟩
    · have hT := (dOn_iff P ps).mpr ((satD_congr hc).mpr hD)
      rw [hF] at hT
      cases hT
    · exact ⟨pairSet qs, grid_within hqs,
        (satB_congr hc fun _ _ _ _ => Iff.rfl).mp ((bOn_iff P ps qs).mp hB)⟩
  · intro h ps hps
    cases hD : dOn P ps
    · exact Or.inl rfl
    · right
      obtain ⟨Q, -, hB⟩ :=
        h (pairSet ps) (grid_within hps) ((dOn_iff P ps).mp hD)
      obtain ⟨qs, hqs, hc⟩ := grid_cover (flexMentioned P) (written P) Q
      exact ⟨qs, hqs, (bOn_iff P ps qs).mpr
        ((satB_congr (fun _ _ _ _ => Iff.rfl) hc).mpr hB)⟩

/-- With infinitely many labels, `validCheck` decides validity: O3
splits it, and each part is a finite check. -/
theorem valid_iff_validCheck (hinf : InfiniteLabels Label)
    (P : PProblem Label) (hs : Scoped P) :
    Valid P ↔ validCheck P = true := by
  rw [o3 P hs, ← dWritten_iff, writtenCheck_iff P |>.symm,
    restValid_iff_bitCheck hinf]
  unfold validCheck
  cases dSatCheck P <;> cases writtenCheck P <;> cases bitCheck P <;>
    decide

/-! ### Examples -/

-- The presence split is valid; without its clause it is not.
#guard validCheck { D := splitD, B := splitB }
#guard !validCheck { D := [], B := splitB }

/-- `r₀ = u`, with label `7` not in `u`: valid only if `7 ∉ r₀`. -/
def keepOut : List (PAtom Nat) :=
  [.eq (.rigid 0) (.flex 0), .disj (.lab 7) (.flex 0)]

-- Given `7 ∉ r₀`, valid.
#guard validCheck { D := [.lacks 7 (.rigid 0)], B := keepOut }
-- Without it, the rest part passes but the written part fails.
#guard bitCheck ({ D := [], B := keepOut } : PProblem Nat)
#guard !writtenCheck ({ D := [], B := keepOut } : PProblem Nat)
#guard !validCheck ({ D := [], B := keepOut } : PProblem Nat)

/-- `7 ∪ r₀ = 7 ∪ u`, `7 ∉ u`, given `7 ∉ r₀`: valid, with `u = r₀`. -/
def withLab : PProblem Nat :=
  { D := [.lacks 7 (.rigid 0)],
    B := [.eq (.union (.lab 7) (.rigid 0)) (.union (.lab 7) (.flex 0)),
      .disj (.lab 7) (.flex 0)] }

#guard validCheck withLab

/-- `7 ∉ {7}` is impossible, so this is vacuously valid although its
rest part fails (`r₀ ∩ r₀ = ∅`). -/
def noPattern : PProblem Nat :=
  { D := [.lacks 7 (.lab 7)], B := [.disj (.rigid 0) (.rigid 0)] }

#guard !dSatCheck noPattern
#guard !bitCheck noPattern
#guard validCheck noPattern

end Composition.Presence
