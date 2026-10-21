/-
Constructive presence witnesses (dossier §18.6, §18.13 stream 3). D2
says a valid problem has, per pattern, one written choice `Q` and one
tuple of complement-free set terms over the rests that works for every
finite rest assignment satisfying `D`; its terms are chosen classically
(`sel`, D2.lean). `witness` computes them.

Given a pattern as a finite set of pairs `ps` (a mentioned rigid index,
a written label), `witness P ps`:
- for each vector `c` of bits on the mentioned rigid indices `M`, takes
  the first flexible vector (on the mentioned flexible indices) that
  satisfies `B` at `c` if `D` allows `c` (`regionSel`), all false if `D`
  rules `c` out, and fails if `D` allows `c` and nothing works;
- builds flexible term `j` as the union of the regions (`region`,
  D2Terms) whose chosen bit `j` is set (`witTerm`), as in D2.lean;
- takes the first written choice `qs` satisfying `B` with `ps` on the
  written labels (`writtenSel`).

The per-region choice is automatically uniform: the region terms are
built from the vectors alone, not from `R`, and a rest label lies in
exactly the region of its own bits (or in no term, when it is outside
every rest of `M`, where all-false bits satisfy every atom). So no extra
condition is needed beyond each region's choice working at that region.

`witness_sound`: whatever `witness` returns satisfies D2's property
(`Works`), with no hypothesis on the problem beyond the pattern lying in
the written labels. `witness_complete`: for a valid scoped problem, with
infinitely many labels, `witness` succeeds on every pattern satisfying
`D` on the written labels. `valid_iff_witness` characterizes validity
by the witness succeeding on every listed pattern `D` allows, and
`witness_d2` / `d2_witness` recover D2 for arbitrary patterns with these
explicit terms.
-/
import Composition.Presence.D2
import Composition.Presence.DecideValid
import Composition.Presence.O2

namespace Composition.Presence

open Composition.Syntax (dedup mem_dedup)

variable {Label : Type}

/-! ### The procedure -/

/-- The mentioned rigid indices, each once. -/
def rigM (P : PProblem Label) : List Nat := dedup (mentioned P)

/-- The mentioned flexible indices, each once. -/
def flexM (P : PProblem Label) : List Nat := dedup (flexMentioned P)

/-- The flexible bits for the rigid bits `c`: all false if `D` rules
`c` out; otherwise the first vector on the flexible indices satisfying
`B` at `c`, or `none` if there is none. -/
def regionSel (P : PProblem Label) (c : Nat → Bool) :
    Option (Nat → Bool) :=
  if P.D.all (holdsBB c fun _ => false) then
    (vecs (flexM P)).find? fun s => P.B.all (holdsBB c s)
  else some fun _ => false

/-- The chosen flexible bits for `c` (all false on failure, which
`restOk` rules out). -/
def selC (P : PProblem Label) (c : Nat → Bool) : Nat → Bool :=
  (regionSel P c).getD fun _ => false

/-- Every region has a choice. -/
def restOk (P : PProblem Label) : Bool :=
  (vecs (rigM P)).all fun c => (regionSel P (restrict (rigM P) c)).isSome

/-- The witness term for flexible set `j`: the regions whose chosen bit
`j` is set. It depends on `P` only. -/
def witTerm (P : PProblem Label) (j : Nat) : STerm :=
  unionAll ((vecs (rigM P)).map fun c =>
    if selC P (restrict (rigM P) c) j = true
    then region (rigM P) c else .empty)

variable [DecidableEq Label]

/-- The first written choice (pairs of a mentioned flexible index and a
written label) satisfying `B` with the pattern `ps` on the written
labels. -/
def writtenSel (P : PProblem Label) (ps : List (Nat × Label)) :
    Option (List (Nat × Label)) :=
  (subsets (grid (flexM P) (written P))).find? (bOn P ps)

/-- The witness for the pattern `ps`: a written choice and one term per
flexible set, or `none`. -/
def witness (P : PProblem Label) (ps : List (Nat × Label)) :
    Option (List (Nat × Label) × (Nat → STerm)) :=
  if restOk P then (writtenSel P ps).map fun qs => (qs, witTerm P)
  else none

omit [DecidableEq Label]

/-- D2's property for the pattern `π`, the written choice `Q` and the
terms `t`: `Q` stays in the written labels, and for every finite rest
assignment satisfying `D` the terms lie inside the rests and, with `π`
and `Q`, satisfy `B` everywhere. -/
def Works (P : PProblem Label) (π Q : Nat → LSet Label)
    (t : Nat → STerm) : Prop :=
  (∀ j k, Q j k → k ∈ written P) ∧
  ∀ R : Nat → LSet Label, (∀ i, FinSet (R i)) →
    (∀ i k, R i k → k ∉ written P) →
    SatOn (· ∉ written P) R noFlex P.D →
      (∀ j k, (t j).eval R k → ∃ i, R i k) ∧
      SatOn univ (fun i k => π i k ∨ R i k)
        (fun j k => Q j k ∨ (t j).eval R k) P.B

/-! ### Region choices -/

theorem mem_rigM {P : PProblem Label} {i : Nat} :
    i ∈ rigM P ↔ i ∈ mentioned P := mem_dedup

theorem mem_flexM {P : PProblem Label} {j : Nat} :
    j ∈ flexM P ↔ j ∈ flexMentioned P := mem_dedup

/-- An atom of the problem reads rigid indices in `rigM P`. -/
theorem rigidIdx_rigM {P : PProblem Label} {a : PAtom Label}
    (ha : a ∈ P.D ++ P.B) : ∀ i ∈ a.rigidIdx, i ∈ rigM P :=
  fun i hi => mem_rigM.mpr (rigids_mentioned ha i hi)

/-- `D` and `B` atoms read the same at `b` and at `b` restricted to
`rigM P`. -/
theorem holdsB_restrict {P : PProblem Label} {a : PAtom Label}
    (ha : a ∈ P.D ++ P.B) (b s : Nat → Bool) :
    HoldsB (restrict (rigM P) b) s a ↔ HoldsB b s a :=
  holdsB_congr a fun i hi => by
    simp [restrict, rigidIdx_rigM ha i hi]

/-- A region's choice satisfies `B` there when `D` allows it. -/
theorem regionSel_spec {P : PProblem Label} {c s : Nat → Bool}
    (h : regionSel P c = some s)
    (hD : ∀ a ∈ P.D, HoldsB c (fun _ => false) a) :
    ∀ a ∈ P.B, HoldsB c s a := by
  have hD' : P.D.all (holdsBB c fun _ => false) = true :=
    List.all_eq_true.mpr fun a ha => (holdsBB_iff _ _ a).mpr (hD a ha)
  simp only [regionSel, hD', ↓reduceIte] at h
  have hs := List.find?_some h
  intro a ha
  exact (holdsBB_iff _ _ a).mp (List.all_eq_true.mp hs a ha)

/-- Under the per-region check every region has a choice. -/
theorem regionSel_isSome {P : PProblem Label} (hbv : BitValid P)
    (c : Nat → Bool) : (regionSel P c).isSome := by
  unfold regionSel
  split
  · rename_i hD
    have hD' : ∀ a ∈ P.D, HoldsB c (fun _ => false) a := fun a ha =>
      (holdsBB_iff _ _ a).mp (List.all_eq_true.mp hD a ha)
    obtain ⟨s, hs⟩ := hbv c hD'
    obtain ⟨s', hs', hss⟩ := vecs_cover s (flexM P)
    rw [List.find?_isSome]
    refine ⟨s', hs', List.all_eq_true.mpr fun a ha =>
      (holdsBB_iff _ _ a).mpr ?_⟩
    exact (holdsB_congr_flex a fun j hj =>
      (hss j (mem_flexM.mpr (List.mem_flatMap.mpr ⟨a, ha, hj⟩))).symm).mp
        (hs a ha)
  · rfl

/-- `restOk` gives a choice at every restricted vector. -/
theorem regionSel_of_restOk {P : PProblem Label} (h : restOk P = true)
    (b : Nat → Bool) :
    regionSel P (restrict (rigM P) b) =
      some (selC P (restrict (rigM P) b)) := by
  obtain ⟨c, hc, hcb⟩ := vecs_cover b (rigM P)
  have hs := List.all_eq_true.mp h c hc
  rw [restrict_eq hcb] at hs
  unfold selC
  cases hr : regionSel P (restrict (rigM P) b) with
  | none => rw [hr] at hs; cases hs
  | some s => rfl

/-- The chosen bits at a restricted vector satisfy `B` there whenever
`D` holds there. -/
theorem selC_spec {P : PProblem Label} (h : restOk P = true)
    {b : Nat → Bool} (hD : ∀ a ∈ P.D, HoldsB b (fun _ => false) a) :
    ∀ a ∈ P.B, HoldsB b (selC P (restrict (rigM P) b)) a := by
  intro a ha
  have := regionSel_spec (regionSel_of_restOk h b) (fun d hd =>
    (holdsB_restrict (List.mem_append_left _ hd) _ _).mpr (hD d hd)) a ha
  exact (holdsB_restrict (List.mem_append_right _ ha) _ _).mp this

/-- `restOk` decides the per-region check. -/
theorem restOk_iff (P : PProblem Label) : restOk P = true ↔ BitValid P := by
  constructor
  · intro h b hD
    exact ⟨_, selC_spec h hD⟩
  · intro hbv
    exact List.all_eq_true.mpr fun c _ => regionSel_isSome hbv _

/-! ### The terms -/

/-- A label is in `witTerm P j` iff it is in some rest of `rigM P` and
the bits chosen for its own bits set `j`. -/
theorem witTerm_eval (P : PProblem Label) (R : Nat → LSet Label)
    (k : Label) {b : Nat → Bool} (hb : ∀ i, b i = true ↔ R i k)
    (j : Nat) : (witTerm P j).eval R k ↔ (∃ i ∈ rigM P, R i k) ∧
      selC P (restrict (rigM P) b) j = true := by
  simp only [witTerm, unionAll_eval, List.mem_map]
  constructor
  · rintro ⟨u, ⟨c, _, rfl⟩, hu⟩
    by_cases hs : selC P (restrict (rigM P) c) j = true
    · simp only [hs, ↓reduceIte, region_eval] at hu
      refine ⟨hu.2, ?_⟩
      rwa [restrict_eq (b := b) (b' := c) (fun i hi =>
        Bool.eq_iff_iff.mpr ((hb i).trans (hu.1 i hi).symm))]
    · simp only [hs, Bool.false_eq_true, ↓reduceIte, STerm.eval] at hu
  · rintro ⟨hM, hs⟩
    obtain ⟨c, hc, hcb⟩ := vecs_cover b (rigM P)
    refine ⟨_, ⟨c, hc, rfl⟩, ?_⟩
    rw [← restrict_eq hcb] at hs
    simp only [hs, ↓reduceIte, region_eval]
    exact ⟨fun i hi => by rw [hcb i hi]; exact hb i, hM⟩

/-- The terms lie inside the mentioned rests. -/
theorem witTerm_sub (P : PProblem Label) (R : Nat → LSet Label)
    (k : Label) (j : Nat) (h : (witTerm P j).eval R k) :
    ∃ i ∈ rigM P, R i k :=
  ((witTerm_eval P R k (bitsOf_spec R k) j).mp h).1

/-- The rest part: on the unwritten labels, `R` with the terms
satisfies `B`, label by label. -/
theorem witTerm_rest (P : PProblem Label) (h : restOk P = true)
    (R : Nat → LSet Label) (hRD : SatOn (· ∉ written P) R noFlex P.D)
    (a : PAtom Label) (ha : a ∈ P.B) :
    HoldsOn (· ∉ written P) R (fun j => (witTerm P j).eval R) a := by
  have haB : a ∈ P.D ++ P.B := List.mem_append_right _ ha
  apply holdsOn_of_holdsB a (mem_written_of haB)
  intro k hk
  have hb := bitsOf_spec R k
  have hDk : ∀ d ∈ P.D, HoldsB (bitsOf R k) (fun _ => false) d :=
    fun d hd => holdsB_of_holdsOn ⟨hb, fun _ => by simp [noFlex]⟩ hk d
      (mem_written_of (List.mem_append_left _ hd)) (hRD d hd)
  by_cases hM : ∃ i ∈ rigM P, R i k
  · refine ⟨bitsOf R k, selC P (restrict (rigM P) (bitsOf R k)),
      ⟨hb, fun j => ?_⟩, selC_spec h hDk a ha⟩
    show _ ↔ (witTerm P j).eval R k
    rw [witTerm_eval P R k hb j]
    exact ⟨fun h => ⟨hM, h⟩, fun h => h.2⟩
  · refine ⟨bitsOf R k, fun _ => false, ⟨hb, fun j => ?_⟩, ?_⟩
    · exact ⟨fun h => (Bool.false_ne_true h).elim,
        fun h => absurd (witTerm_sub P R k j h) hM⟩
    · refine (holdsB_congr a (fun i hi => ?_)).mpr (holdsB_zero a)
      cases hbi : bitsOf R k i
      · rfl
      · exact absurd ⟨i, rigidIdx_rigM haB i hi, (hb i).mp hbi⟩ hM

/-- The terms with `restOk` work for any pattern and written choice
that satisfy `B` on the written labels. -/
theorem works_of_written (P : PProblem Label) (h : restOk P = true)
    {π Q : Nat → LSet Label} (hπ : ∀ i k, π i k → k ∈ written P)
    (hQ : ∀ j k, Q j k → k ∈ written P)
    (hQB : SatOn (· ∈ written P) π Q P.B) : Works P π Q (witTerm P) := by
  refine ⟨hQ, fun R _ hRw hRD => ⟨fun j k hk => ?_, ?_⟩⟩
  · obtain ⟨i, -, hi⟩ := witTerm_sub P R k j hk
    exact ⟨i, hi⟩
  · intro a ha
    obtain ⟨hsplit, hloc, -⟩ := o2 P a (List.mem_append_right _ ha)
    rw [hsplit]
    constructor
    · refine (hloc (· ∈ written P) _ π _ Q (fun i k hk => ?_)
        (fun j k hk => ?_)).mpr (hQB a ha)
      · exact ⟨fun h => h.elim id (fun hr => absurd hk (hRw i k hr)),
          Or.inl⟩
      · refine ⟨fun h => h.elim id (fun ht => ?_), Or.inl⟩
        obtain ⟨i, -, hi⟩ := witTerm_sub P R k j ht
        exact absurd hk (hRw i k hi)
    · refine (hloc (· ∉ written P) _ R _ (fun j => (witTerm P j).eval R)
        (fun i k hk => ?_) (fun j k hk => ?_)).mpr
        (witTerm_rest P h R hRD a ha)
      · exact ⟨fun h => h.elim (fun hp => absurd (hπ i k hp) hk) id,
          Or.inr⟩
      · exact ⟨fun h => h.elim (fun hq => absurd (hQ j k hq) hk) id,
          Or.inr⟩

/-! ### Soundness and completeness -/

variable [DecidableEq Label]

theorem witness_some {P : PProblem Label} {ps qs : List (Nat × Label)}
    {t : Nat → STerm} (h : witness P ps = some (qs, t)) :
    restOk P = true ∧ writtenSel P ps = some qs ∧ t = witTerm P := by
  unfold witness at h
  split at h
  · rename_i hr
    cases hw : writtenSel P ps with
    | none => rw [hw] at h; cases h
    | some qs' =>
      rw [hw] at h
      cases h
      exact ⟨hr, rfl, rfl⟩
  · cases h

theorem writtenSel_spec {P : PProblem Label} {ps qs : List (Nat × Label)}
    (h : writtenSel P ps = some qs) :
    (∀ j k, pairSet qs j k → k ∈ written P) ∧
      SatOn (· ∈ written P) (pairSet ps) (pairSet qs) P.B :=
  ⟨grid_within (List.mem_of_find?_eq_some h),
    (bOn_iff P ps qs).mp (List.find?_some h)⟩

/-- Soundness: whatever `witness` returns satisfies D2's property for
the pattern. No validity, `Scoped` or label hypothesis is needed. -/
theorem witness_sound (P : PProblem Label) (ps : List (Nat × Label))
    (hps : ∀ i k, pairSet ps i k → k ∈ written P)
    {qs : List (Nat × Label)} {t : Nat → STerm}
    (h : witness P ps = some (qs, t)) :
    Works P (pairSet ps) (pairSet qs) t := by
  obtain ⟨hr, hw, rfl⟩ := witness_some h
  obtain ⟨hQ, hQB⟩ := writtenSel_spec hw
  exact works_of_written P hr hps hQ hQB

/-- Completeness: with infinitely many labels, a valid scoped problem
has a witness for every pattern within the written labels that
satisfies `D` there. -/
theorem witness_complete (hinf : InfiniteLabels Label)
    (P : PProblem Label) (hs : Scoped P) (hV : Valid P)
    (ps : List (Nat × Label)) (hps : ∀ i k, pairSet ps i k → k ∈ written P)
    (hD : SatOn (· ∈ written P) (pairSet ps) noFlex P.D) :
    ∃ qs t, witness P ps = some (qs, t) := by
  obtain ⟨hWV, hRV⟩ : WrittenValid P ∧ RestValid P := by
    rcases (o3 P hs).mp hV with hno | h
    · exact absurd ⟨pairSet ps, hps, hD⟩ hno
    · exact h
  have hr : restOk P = true :=
    (restOk_iff P).mpr (bitValid_of_restValid hinf P hRV)
  obtain ⟨Q, -, hQB⟩ := hWV (pairSet ps) hps hD
  obtain ⟨qs, hqs, hc⟩ := grid_cover (flexM P) (written P) Q
  have hsome : (writtenSel P ps).isSome := by
    unfold writtenSel
    rw [List.find?_isSome]
    exact ⟨qs, hqs, (bOn_iff P ps qs).mpr ((satB_congr
      (fun _ _ _ _ => Iff.rfl)
      (fun j hj k hk => hc j (mem_flexM.mpr hj) k hk)).mpr hQB)⟩
  obtain ⟨qs', hqs'⟩ := Option.isSome_iff_exists.mp hsome
  exact ⟨qs', witTerm P, by simp [witness, hr, hqs']⟩

/-- Validity is the witness succeeding on every listed pattern that
satisfies `D` on the written labels (with infinitely many labels, for
scoped problems). -/
theorem valid_iff_witness (hinf : InfiniteLabels Label)
    (P : PProblem Label) (hs : Scoped P) :
    Valid P ↔ ∀ ps ∈ subsets (grid (mentioned P) (written P)),
      dOn P ps = true → (witness P ps).isSome := by
  constructor
  · intro hV ps hps hD
    obtain ⟨qs, t, h⟩ := witness_complete hinf P hs hV ps (grid_within hps)
      ((dOn_iff P ps).mp hD)
    simp [h]
  · intro hW
    refine (o3 P hs).mpr ?_
    by_cases hex : ∃ π : Nat → LSet Label, (∀ i k, π i k → k ∈ written P) ∧
        SatOn (· ∈ written P) π noFlex P.D
    · right
      -- One allowed pattern gives `restOk`.
      have hok : ∀ ps ∈ subsets (grid (mentioned P) (written P)),
          dOn P ps = true → restOk P = true ∧
            ∃ qs, writtenSel P ps = some qs := by
        intro ps hps hD
        obtain ⟨⟨qs, t⟩, h⟩ := Option.isSome_iff_exists.mp (hW ps hps hD)
        obtain ⟨hr, hw, -⟩ := witness_some h
        exact ⟨hr, qs, hw⟩
      obtain ⟨π, -, hπD⟩ := hex
      obtain ⟨ps0, hps0, hc0⟩ := grid_cover (mentioned P) (written P) π
      have hr := (hok ps0 hps0 ((dOn_iff P ps0).mpr
        ((satD_congr hc0).mpr hπD))).1
      refine ⟨fun π' _ hD' => ?_,
        restValid_of_bitValid P ((restOk_iff P).mp hr)⟩
      obtain ⟨ps, hps, hc⟩ := grid_cover (mentioned P) (written P) π'
      obtain ⟨-, qs, hw⟩ := hok ps hps ((dOn_iff P ps).mpr
        ((satD_congr hc).mpr hD'))
      obtain ⟨hQ, hQB⟩ := writtenSel_spec hw
      exact ⟨pairSet qs, hQ,
        (satB_congr hc fun _ _ _ _ => Iff.rfl).mp hQB⟩
    · exact Or.inl hex

/-- D2 with explicit terms, for any pattern `π`: the listed pattern
agreeing with `π` on the mentioned indices × written labels has a
witness, and its choice and terms work for `π`. -/
theorem witness_d2 (hinf : InfiniteLabels Label) (P : PProblem Label)
    (hs : Scoped P) (hV : Valid P) (π : Nat → LSet Label)
    (hπ : ∀ i k, π i k → k ∈ written P)
    (hD : SatOn (· ∈ written P) π noFlex P.D) :
    ∃ ps ∈ subsets (grid (mentioned P) (written P)),
      (∀ i ∈ mentioned P, ∀ k ∈ written P, (pairSet ps i k ↔ π i k)) ∧
      ∃ qs t, witness P ps = some (qs, t) ∧ Works P π (pairSet qs) t := by
  obtain ⟨ps, hps, hc⟩ := grid_cover (mentioned P) (written P) π
  have hpsw := grid_within hps
  obtain ⟨qs, t, h⟩ := witness_complete hinf P hs hV ps hpsw
    ((satD_congr hc).mpr hD)
  refine ⟨ps, hps, hc, qs, t, h, ?_⟩
  obtain ⟨hQ, hW⟩ := witness_sound P ps hpsw h
  refine ⟨hQ, fun R hfin hRw hRD => ?_⟩
  obtain ⟨hsub, hB⟩ := hW R hfin hRw hRD
  refine ⟨hsub, fun a ha => (holdsOn_congr_idx a (fun i hi k _ => ?_)
    (fun _ _ _ _ => Iff.rfl)).mp (hB a ha)⟩
  by_cases hk : k ∈ written P
  · exact or_congr_left (hc i (rigids_mentioned
      (List.mem_append_right _ ha) i hi) k hk)
  · exact or_congr_left (iff_of_false (fun h => hk (hpsw i k h))
      (fun h => hk (hπ i k h)))

omit [DecidableEq Label] in
/-- D2 again, now through `witness` (labels compared classically). -/
theorem d2_witness : D2 (Label := Label) := by
  intro hinf P hs hV π hπ hD
  classical
  obtain ⟨-, -, -, qs, t, -, hW⟩ := witness_d2 hinf P hs hV π hπ hD
  exact ⟨pairSet qs, t, hW⟩

end Composition.Presence
