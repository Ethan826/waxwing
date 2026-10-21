/-
D2 for presence (dossier §18.6): uniform term witnesses, proved from
O1, O2 and O3 taken as hypotheses (`d2_of`).

Given a valid problem and a pattern `π` satisfying `D` on the written
labels, O3 splits validity into a written part, which gives the choice
`Q` for `π`, and a rest part, which O1 turns into the per-region check
`BitValid`. For each vector `c` of bits on the mentioned rigid indices
`M`, `sel` picks flexible bits that satisfy `B` there. The term `t j` is
the union of the regions (`region`) of the vectors whose chosen bit `j`
is set. A rest label inside some rest of `M` lies in exactly the region
of its own bits, so its flexible bits are the chosen ones; a rest label
outside every rest of `M` lies in no term, and all-false bits satisfy
every atom (`holdsB_zero`). The terms do not depend on `R`, and they
lie inside the union of `M`'s rests. O2 joins the written and rest
parts and shows each depends only on the assignments restricted to it.
-/
import Composition.Presence.D2Terms

namespace Composition.Presence

variable {Label : Type}

theorem mem_written_of {P : PProblem Label} {a : PAtom Label}
    (ha : a ∈ P.D ++ P.B) : ∀ l ∈ a.labels, l ∈ written P :=
  fun _ hl => List.mem_flatMap.mpr ⟨a, ha, hl⟩

theorem rigids_mentioned {P : PProblem Label} {a : PAtom Label}
    (ha : a ∈ P.D ++ P.B) : ∀ i ∈ a.rigidIdx, i ∈ mentioned P :=
  fun _ hi => List.mem_flatMap.mpr ⟨a, ha, hi⟩

open Classical in
/-- Label `k`'s membership in each `ρ i`, as bits. -/
noncomputable def bitsOf (ρ : Nat → LSet Label) (k : Label) :
    Nat → Bool :=
  fun i => decide (ρ i k)

theorem bitsOf_spec (ρ : Nat → LSet Label) (k : Label) (i : Nat) :
    bitsOf ρ k i = true ↔ ρ i k := by
  simp [bitsOf]

open Classical in
/-- The flexible bits for rigid bits `c`: a witness of the per-region
check when `D` allows `c` (otherwise unused). -/
noncomputable def sel (P : PProblem Label) (hbv : BitValid P)
    (c : Nat → Bool) : Nat → Bool :=
  if h : ∀ a ∈ P.D, HoldsB c (fun _ => false) a then
    Classical.choose (hbv c h)
  else fun _ => false

theorem sel_spec (P : PProblem Label) (hbv : BitValid P)
    {c : Nat → Bool} (h : ∀ a ∈ P.D, HoldsB c (fun _ => false) a) :
    ∀ a ∈ P.B, HoldsB c (sel P hbv c) a := by
  unfold sel
  split
  · rename_i h'
    exact Classical.choose_spec (hbv c h')
  · contradiction

/-- The witness term for flexible set `j`: the regions whose chosen
bit `j` is set. It depends on `P` and the choice only, not on `R`. -/
noncomputable def witT (P : PProblem Label) (hbv : BitValid P)
    (j : Nat) : STerm :=
  unionAll ((vecs (mentioned P)).map fun c =>
    if sel P hbv (restrict (mentioned P) c) j = true
    then region (mentioned P) c else .empty)

/-- A label is in `t j` iff it is in some mentioned rest and the bits
chosen for its own bits on `M` set `j`. -/
theorem witT_eval (P : PProblem Label) (hbv : BitValid P)
    (R : Nat → LSet Label) (k : Label) {b : Nat → Bool}
    (hb : ∀ i, b i = true ↔ R i k) (j : Nat) :
    (witT P hbv j).eval R k ↔ (∃ i ∈ mentioned P, R i k) ∧
      sel P hbv (restrict (mentioned P) b) j = true := by
  simp only [witT, unionAll_eval, List.mem_map]
  constructor
  · rintro ⟨u, ⟨c, _, rfl⟩, hu⟩
    by_cases hs : sel P hbv (restrict (mentioned P) c) j = true
    · simp only [hs, ↓reduceIte, region_eval] at hu
      refine ⟨hu.2, ?_⟩
      -- `c` agrees with `b` on `M`, so both select the same bits.
      rwa [restrict_eq (b := b) (b' := c) (fun i hi =>
        Bool.eq_iff_iff.mpr ((hb i).trans (hu.1 i hi).symm))]
    · simp only [hs, Bool.false_eq_true, ↓reduceIte, STerm.eval] at hu
  · rintro ⟨hM, hs⟩
    obtain ⟨c, hc, hcb⟩ := vecs_cover b (mentioned P)
    refine ⟨_, ⟨c, hc, rfl⟩, ?_⟩
    rw [← restrict_eq hcb] at hs
    simp only [hs, ↓reduceIte, region_eval]
    exact ⟨fun i hi => by rw [hcb i hi]; exact hb i, hM⟩

/-- Witnesses lie inside the mentioned rigid rests. -/
theorem witT_sub (P : PProblem Label) (hbv : BitValid P)
    (R : Nat → LSet Label) (k : Label) (j : Nat)
    (h : (witT P hbv j).eval R k) : ∃ i ∈ mentioned P, R i k :=
  ((witT_eval P hbv R k (bitsOf_spec R k) j).mp h).1

/-- The rest part: on the unwritten labels, `R` with the terms
satisfies `B`, checked label by label. -/
theorem rest_part (P : PProblem Label) (hbv : BitValid P)
    (R : Nat → LSet Label) (hRD : SatOn (· ∉ written P) R noFlex P.D)
    (a : PAtom Label) (ha : a ∈ P.B) :
    HoldsOn (· ∉ written P) R (fun j => (witT P hbv j).eval R) a := by
  have haB : a ∈ P.D ++ P.B := List.mem_append_right _ ha
  apply holdsOn_of_holdsB a (mem_written_of haB)
  intro k hk
  have hb := bitsOf_spec R k
  -- `D` holds at `k`'s bits, read off `hRD`.
  have hDk : ∀ d ∈ P.D, HoldsB (bitsOf R k) (fun _ => false) d :=
    fun d hd => holdsB_of_holdsOn ⟨hb, fun _ => by simp [noFlex]⟩ hk d
      (mem_written_of (List.mem_append_left _ hd)) (hRD d hd)
  by_cases hM : ∃ i ∈ mentioned P, R i k
  · refine ⟨bitsOf R k, sel P hbv (restrict (mentioned P) (bitsOf R k)),
      ⟨hb, fun j => ?_⟩, ?_⟩
    · show _ ↔ (witT P hbv j).eval R k
      rw [witT_eval P hbv R k hb j]
      exact ⟨fun h => ⟨hM, h⟩, fun h => h.2⟩
    · -- An atom of the problem reads only bits on `M`.
      have hr : ∀ d ∈ P.D ++ P.B, ∀ i ∈ d.rigidIdx,
          restrict (mentioned P) (bitsOf R k) i = bitsOf R k i :=
        fun d hd i hi => by
          simp [restrict, rigids_mentioned hd i hi]
      have hsel := sel_spec P hbv (c := restrict (mentioned P)
        (bitsOf R k)) (fun d hd => (holdsB_congr d
          (hr d (List.mem_append_left _ hd))).mpr (hDk d hd)) a ha
      exact (holdsB_congr a (hr a haB)).mp hsel
  · -- Outside every mentioned rest: no term holds `k`, all bits that
    -- `a` reads are false.
    refine ⟨bitsOf R k, fun _ => false, ⟨hb, fun j => ?_⟩, ?_⟩
    · exact ⟨fun h => (Bool.false_ne_true h).elim,
        fun h => absurd (witT_sub P hbv R k j h) hM⟩
    · refine (holdsB_congr a (fun i hi => ?_)).mpr (holdsB_zero a)
      cases hbi : bitsOf R k i
      · rfl
      · exact absurd ⟨i, rigids_mentioned haB i hi, (hb i).mp hbi⟩ hM

/-- D2 (presence), from O1, O2 and O3. -/
theorem d2_of {Label : Type} (h1 : O1 (Label := Label))
    (h2 : O2 (Label := Label)) (h3 : O3 (Label := Label)) :
    D2 (Label := Label) := by
  intro hinf P hP hV π hπ hD
  -- `π` witnesses that `D` is possible on the written labels, so O3
  -- gives both parts.
  obtain ⟨hWV, hRV⟩ : WrittenValid P ∧ RestValid P := by
    rcases (h3 P hP).mp hV with hno | h
    · exact absurd ⟨π, hπ, hD⟩ hno
    · exact h
  have hbv : BitValid P := (h1 hinf P hP).mp hRV
  obtain ⟨Q, hQ, hQB⟩ := hWV π hπ hD
  refine ⟨Q, witT P hbv, hQ, fun R _ hRw hRD => ⟨fun j k hk => ?_, ?_⟩⟩
  · obtain ⟨i, -, hi⟩ := witT_sub P hbv R k j hk
    exact ⟨i, hi⟩
  · intro a ha
    obtain ⟨hsplit, hloc, -⟩ := h2 P a (List.mem_append_right _ ha)
    rw [hsplit]
    constructor
    · -- Written labels: `R` and the terms are empty there.
      refine (hloc (· ∈ written P) _ π _ Q (fun i k hk => ?_)
        (fun j k hk => ?_)).mpr (hQB a ha)
      · exact ⟨fun h => h.elim id (fun hr => absurd hk (hRw i k hr)),
          Or.inl⟩
      · refine ⟨fun h => h.elim id (fun ht => ?_), Or.inl⟩
        obtain ⟨i, -, hi⟩ := witT_sub P hbv R k j ht
        exact absurd hk (hRw i k hi)
    · -- Unwritten labels: `π` and `Q` are empty there.
      refine (hloc (· ∉ written P) _ R _ (fun j => (witT P hbv j).eval R)
        (fun i k hk => ?_) (fun j k hk => ?_)).mpr
        (rest_part P hbv R hRD a ha)
      · exact ⟨fun h => h.elim (fun hp => absurd (hπ i k hp) hk) id,
          Or.inr⟩
      · exact ⟨fun h => h.elim (fun hq => absurd (hQ j k hq) hk) id,
          Or.inr⟩

end Composition.Presence
