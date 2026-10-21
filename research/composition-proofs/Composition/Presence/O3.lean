/-
O3 (dossier §18.6): a presence problem is valid iff `D` is impossible on
the written labels, or both its written part and its rest part are
valid. The proof splits every assignment at the written labels: an atom
holds everywhere iff it holds on the written labels and on the rest
(`holdsOn_split`), and on either part it depends only on the
assignments there (`holdsOn_congr`). (⇐) cuts a rigid assignment `ρ`
into a pattern `π = ρ ∩ written` and a rest `R = ρ ∖ written`, takes `Q`
and `S` from the two parts and glues `σ = Q ∪ S`. (⇒) applies `Valid`
to `π` alone (D holds off the written labels, where everything is
empty) and to `π₀ ∪ R` for a fixed pattern `π₀`, then restricts the
witness to each part. The split and locality lemmas are private here;
O2 states them for the atoms of a problem.
-/
import Composition.Presence.Defs

namespace Composition.Presence

section Helpers

variable {Label : Type}

/-- `eval` at `k` depends only on the assignments at `k`. -/
private theorem eval_congr_at {ρ ρ' σ σ' : Nat → LSet Label} {k : Label}
    (hρ : ∀ i, ρ i k ↔ ρ' i k) (hσ : ∀ j, σ j k ↔ σ' j k) :
    ∀ e : SExpr Label, eval ρ σ e k ↔ eval ρ' σ' e k
  | .rigid i => hρ i
  | .flex j => hσ j
  | .lab _ => Iff.rfl
  | .union a b =>
      or_congr (eval_congr_at hρ hσ a) (eval_congr_at hρ hσ b)

/-- Locality: on `K`, an atom depends only on the assignments on `K`. -/
private theorem holdsOn_congr {K : LSet Label}
    {ρ ρ' σ σ' : Nat → LSet Label}
    (hρ : ∀ i k, K k → (ρ i k ↔ ρ' i k))
    (hσ : ∀ j k, K k → (σ j k ↔ σ' j k)) :
    ∀ a : PAtom Label, HoldsOn K ρ σ a ↔ HoldsOn K ρ' σ' a
  | .disj x y => forall_congr' fun k => imp_congr_right fun hk =>
      not_congr (and_congr
        (eval_congr_at (hρ · k hk) (hσ · k hk) x)
        (eval_congr_at (hρ · k hk) (hσ · k hk) y))
  | .lacks l x => imp_congr_right fun hl =>
      not_congr (eval_congr_at (hρ · l hl) (hσ · l hl) x)
  | .eq x y => forall_congr' fun k => imp_congr_right fun hk =>
      iff_congr
        (eval_congr_at (hρ · k hk) (hσ · k hk) x)
        (eval_congr_at (hρ · k hk) (hσ · k hk) y)

/-- The split: an atom holds at every label iff it holds on the labels
of `W` and on the rest. Classical: each label is in `W` or not. -/
private theorem holdsOn_split (W : List Label) (ρ σ : Nat → LSet Label) :
    ∀ a : PAtom Label, HoldsOn univ ρ σ a ↔
      HoldsOn (· ∈ W) ρ σ a ∧ HoldsOn (· ∉ W) ρ σ a
  | .disj _ _ => ⟨fun h => ⟨fun k _ => h k trivial, fun k _ => h k trivial⟩,
      fun ⟨hw, hr⟩ k _ =>
        (Classical.em (k ∈ W)).elim (hw k) (hr k)⟩
  | .lacks l _ => ⟨fun h => ⟨fun _ => h trivial, fun _ => h trivial⟩,
      fun ⟨hw, hr⟩ _ => (Classical.em (l ∈ W)).elim hw hr⟩
  | .eq _ _ => ⟨fun h => ⟨fun k _ => h k trivial, fun k _ => h k trivial⟩,
      fun ⟨hw, hr⟩ k _ =>
        (Classical.em (k ∈ W)).elim (hw k) (hr k)⟩

/-- A set expression is empty at a label it does not mention where every
set variable is empty. -/
private theorem eval_empty {ρ σ : Nat → LSet Label} {k : Label}
    (hρ : ∀ i, ¬ ρ i k) (hσ : ∀ j, ¬ σ j k) :
    ∀ e : SExpr Label, k ∉ e.labels → ¬ eval ρ σ e k
  | .rigid i, _ => hρ i
  | .flex j, _ => hσ j
  | .lab l, h => fun e => h (by
      show k ∈ [l]
      rw [show k = l from e]
      exact List.mem_singleton_self l)
  | .union a b, h => fun e => e.elim
      (eval_empty hρ hσ a fun m => h (List.mem_append_left _ m))
      (eval_empty hρ hσ b fun m => h (List.mem_append_right _ m))

/-- An atom whose labels lie in `W` holds off `W` when every set variable
lies within `W`: both sides of each atom are empty there, and a `lacks`
label is in `W`. -/
private theorem holdsOn_off {W : List Label} {ρ σ : Nat → LSet Label}
    (hρ : ∀ i k, ρ i k → k ∈ W) (hσ : ∀ j k, σ j k → k ∈ W) :
    ∀ a : PAtom Label, (∀ l ∈ a.labels, l ∈ W) → HoldsOn (· ∉ W) ρ σ a
  | .disj x _, h => fun k hk hxy =>
      eval_empty (fun i hi => hk (hρ i k hi)) (fun j hj => hk (hσ j k hj))
        x (fun m => hk (h k (List.mem_append_left _ m))) hxy.1
  | .lacks l _, h => fun hl => absurd (h l List.mem_cons_self) hl
  | .eq x y, h => fun k hk => iff_of_false
      (eval_empty (fun i hi => hk (hρ i k hi)) (fun j hj => hk (hσ j k hj))
        x (fun m => hk (h k (List.mem_append_left _ m))))
      (eval_empty (fun i hi => hk (hρ i k hi)) (fun j hj => hk (hσ j k hj))
        y (fun m => hk (h k (List.mem_append_right _ m))))

/-- The labels of the problem's atoms are written. -/
private theorem labels_written {P : PProblem Label} {a : PAtom Label}
    (ha : a ∈ P.D ++ P.B) : ∀ l ∈ a.labels, l ∈ written P := by
  intro l hl
  unfold written
  exact List.mem_flatMap.mpr ⟨a, ha, hl⟩

/-- A subset of a finite set is finite. -/
private theorem finSet_mono {S T : LSet Label} (hS : FinSet S)
    (h : ∀ k, T k → S k) : FinSet T :=
  let ⟨ls, hls⟩ := hS
  ⟨ls, fun k hk => hls k (h k hk)⟩

/-- A set within a list, joined with a finite set, is finite. -/
private theorem finSet_union {W : List Label} {A B : LSet Label}
    (hA : ∀ k, A k → k ∈ W) (hB : FinSet B) :
    FinSet (fun k => A k ∨ B k) :=
  let ⟨ls, hls⟩ := hB
  ⟨W ++ ls, fun k hk => hk.elim
    (fun h => List.mem_append_left _ (hA k h))
    (fun h => List.mem_append_right _ (hls k h))⟩

/-- `ρ ∪ R` is `ρ` where `R` is empty. -/
private theorem union_left {A B : LSet Label} {k : Label} (hB : ¬ B k) :
    (A k ∨ B k) ↔ A k :=
  ⟨fun h => h.elim id (absurd · hB), Or.inl⟩

/-- `ρ ∪ R` is `R` where `ρ` is empty. -/
private theorem union_right {A B : LSet Label} {k : Label} (hA : ¬ A k) :
    (A k ∨ B k) ↔ B k :=
  ⟨fun h => h.elim (absurd · hA) id, Or.inr⟩

/-- (⇒), written part: `Valid` at the pattern itself. -/
private theorem writtenValid_of_valid {P : PProblem Label}
    (hv : Valid P) : WrittenValid P := by
  intro π hπ hD
  obtain ⟨σ, -, hB⟩ := hv π (fun i => ⟨written P, hπ i⟩) fun a ha =>
    (holdsOn_split (written P) π noFlex a).2 ⟨hD a ha,
      holdsOn_off hπ (fun _ _ h => (h : False).elim) a
        (labels_written (List.mem_append_left _ ha))⟩
  refine ⟨fun j k => σ j k ∧ k ∈ written P, fun _ _ h => h.2, ?_⟩
  intro a ha
  exact (holdsOn_congr (fun _ _ _ => Iff.rfl)
    (fun _ _ hk => (and_iff_left hk).symm) a).1
    ((holdsOn_split (written P) π σ a).1 (hB a ha)).1

/-- (⇒), rest part: `Valid` at a fixed pattern `π₀` joined with the
rest assignment. -/
private theorem restValid_of_valid {P : PProblem Label} (hv : Valid P)
    {π₀ : Nat → LSet Label} (hπw : ∀ i k, π₀ i k → k ∈ written P)
    (hπD : SatOn (· ∈ written P) π₀ noFlex P.D) : RestValid P := by
  intro R hRfin hRw hRD
  have onW : ∀ i k, k ∈ written P → ((π₀ i k ∨ R i k) ↔ π₀ i k) :=
    fun i k hk => union_left fun h => hRw i k h hk
  have offW : ∀ i k, k ∉ written P → ((π₀ i k ∨ R i k) ↔ R i k) :=
    fun i k hk => union_right fun h => hk (hπw i k h)
  obtain ⟨σ, hσfin, hB⟩ := hv (fun i k => π₀ i k ∨ R i k)
    (fun i => finSet_union (hπw i) (hRfin i)) fun a ha =>
      (holdsOn_split (written P) _ noFlex a).2
        ⟨(holdsOn_congr onW (fun _ _ _ => Iff.rfl) a).2 (hπD a ha),
         (holdsOn_congr offW (fun _ _ _ => Iff.rfl) a).2 (hRD a ha)⟩
  refine ⟨fun j k => σ j k ∧ k ∉ written P,
    fun j => finSet_mono (hσfin j) fun _ h => h.1, fun _ _ h => h.2, ?_⟩
  intro a ha
  exact (holdsOn_congr offW (fun _ _ hk => (and_iff_left hk).symm) a).1
    ((holdsOn_split (written P) _ σ a).1 (hB a ha)).2

/-- The pattern and the rest of a rigid assignment satisfy `D` on their
parts when the assignment satisfies it everywhere. -/
private theorem satOn_parts {P : PProblem Label} {ρ : Nat → LSet Label}
    (hD : SatOn univ ρ noFlex P.D) :
    SatOn (· ∈ written P) (fun i k => ρ i k ∧ k ∈ written P) noFlex P.D ∧
    SatOn (· ∉ written P) (fun i k => ρ i k ∧ k ∉ written P) noFlex
      P.D :=
  ⟨fun a ha => (holdsOn_congr (fun _ _ hk => (and_iff_left hk).symm)
      (fun _ _ _ => Iff.rfl) a).1
      ((holdsOn_split (written P) ρ noFlex a).1 (hD a ha)).1,
   fun a ha => (holdsOn_congr (fun _ _ hk => (and_iff_left hk).symm)
      (fun _ _ _ => Iff.rfl) a).1
      ((holdsOn_split (written P) ρ noFlex a).1 (hD a ha)).2⟩

/-- (⇐) from both parts: glue `σ = Q ∪ S`. -/
private theorem valid_of_parts {P : PProblem Label}
    (hw : WrittenValid P) (hr : RestValid P) : Valid P := by
  intro ρ hfin hD
  obtain ⟨Q, hQw, hQB⟩ :=
    hw (fun i k => ρ i k ∧ k ∈ written P) (fun _ _ h => h.2)
      (satOn_parts hD).1
  obtain ⟨S, hSfin, hSw, hSB⟩ :=
    hr (fun i k => ρ i k ∧ k ∉ written P)
      (fun i => finSet_mono (hfin i) fun _ h => h.1) (fun _ _ h => h.2)
      (satOn_parts hD).2
  -- On the written labels `σ` is `Q` and `ρ` is the pattern; on the
  -- rest `σ` is `S` and `ρ` is the rest assignment.
  refine ⟨fun j k => Q j k ∨ S j k,
    fun j => finSet_union (hQw j) (hSfin j), fun a ha =>
      (holdsOn_split (written P) ρ _ a).2 ⟨?_, ?_⟩⟩
  · exact (holdsOn_congr (fun _ _ hk => (and_iff_left hk).symm)
      (fun j k hk => union_left fun h => hSw j k h hk) a).2 (hQB a ha)
  · exact (holdsOn_congr (fun _ _ hk => (and_iff_left hk).symm)
      (fun j k hk => union_right fun h => hk (hQw j k h)) a).2 (hSB a ha)

end Helpers

/-- O3. A presence problem is valid iff `D` is impossible on the written
labels, or both its written part and its rest part are valid. -/
theorem o3 {Label : Type} : O3 (Label := Label) := by
  intro P _
  constructor
  · intro hv
    by_cases h0 : ∃ π : Nat → LSet Label,
        (∀ i k, π i k → k ∈ written P) ∧
        SatOn (· ∈ written P) π noFlex P.D
    · obtain ⟨π₀, hπw, hπD⟩ := h0
      exact Or.inr
        ⟨writtenValid_of_valid hv, restValid_of_valid hv hπw hπD⟩
    · exact Or.inl h0
  · rintro (h0 | ⟨hw, hr⟩)
    · -- No pattern satisfies `D`, yet any `ρ` satisfying `D` would
      -- give one: `ρ ∩ written`. So `Valid` holds vacuously.
      intro ρ _ hD
      exact absurd ⟨_, fun _ _ h => h.2, (satOn_parts hD).1⟩ h0
    · exact valid_of_parts hw hr

end Composition.Presence
