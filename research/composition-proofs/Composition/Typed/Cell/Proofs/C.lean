/-
Proof stream C (research/division-campaign/cellcheck/proof-plan.md):
conservative query soundness. Proves CV2 `ImplSound` (`implSound`),
CD2 `ApartSound` (`apartSound`) and CB3 `EqSound` (`eqSound`), with
two lemmas on the query computations: the soundness (→) direction of
QX3 `CoverExact` (`coverS_sound`) and the ← direction of QX2
`CellPossExact` (`cellPossS_complete`). The converse directions of QX2
and QX3 are not proved here.
-/
import Composition.Typed.Cell.Statements
import Composition.Typed.Cell.Exact

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

/-! ### Candidate cells and `cellPossS` -/

theorem mem_of_mem_subsets {α : Type} :
    ∀ {l S : List α} {x : α}, S ∈ subsets l → x ∈ S → x ∈ l
  | [], S, x, hS, hx => by
    simp [subsets] at hS; subst hS; simp at hx
  | a :: l, S, x, hS, hx => by
    simp only [subsets, List.mem_append, List.mem_map] at hS
    rcases hS with hS | ⟨T, hT, rfl⟩
    · exact List.mem_cons_of_mem _ (mem_of_mem_subsets hS hx)
    · rcases List.mem_cons.mp hx with rfl | hx
      · exact List.mem_cons_self
      · exact List.mem_cons_of_mem _ (mem_of_mem_subsets hT hx)

omit [DecidableEq Label] in
theorem mem_rigid_of_cand {P : SigProblem Label B} {S : Cell} {x : Nat}
    (hS : S ∈ cellCands P) (hx : x ∈ S) : x ∈ P.rigidRow := by
  simp only [cellCands, List.mem_filter] at hS
  exact mem_of_mem_subsets hS.1 hx

theorem cubeSat_iff {S : Cell} {K : CellCube} :
    cubeSat S K = true ↔ ∀ e ∈ K, (e.1 ∈ S ↔ e.2 = true) := by
  simp only [cubeSat, List.all_eq_true, beq_iff_eq]
  refine forall_congr' fun e => forall_congr' fun _ => ?_
  cases e.2 <;> simp

theorem cubeSat_cons {S : Cell} {K : CellCube} {x : Nat} {b : Bool} :
    cubeSat S ((x, b) :: K) = true ↔ (x ∈ S ↔ b = true) ∧ cubeSat S K = true := by
  simp only [cubeSat_iff, List.mem_cons, forall_eq_or_imp]

omit [DecidableEq Label] in
/-- `freeS` is true on a free cell (one direction of QX1). -/
theorem freeS_of_free {P : SigProblem Label B} {S : Cell}
    (h : FreeCell P S) : freeS P S = true := by
  simp only [freeS, List.all_eq_true]
  intro r hr s hs a ha
  cases a with
  | disjoint x y =>
    simp only [Bool.not_eq_true', Bool.and_eq_false_iff, beq_eq_false_iff_ne]
    by_cases hx : x = r
    · subst hx
      by_cases hy : y = s
      · subst hy; exact absurd ha (h x hr y hs)
      · exact Or.inr hy
    · exact Or.inl hx
  | _ => rfl

omit [DecidableEq Label] in
/-- QX2's ← direction: a free candidate cell satisfying a cube with a
positive literal makes `cellPossS` true. -/
theorem cellPossS_complete (P : SigProblem Label B) (K : CellCube)
    (hpos : ∃ x, (x, true) ∈ K) {S : Cell} (hS : S ∈ cellCands P)
    (hfree : FreeCell P S) (hsat : cubeSat S K = true) :
    cellPossS P K = true := by
  have hK := cubeSat_iff.mp hsat
  have hposS : ∀ x, (x, true) ∈ K → x ∈ S := fun x hx => (hK _ hx).2 rfl
  obtain ⟨x0, hx0⟩ := hpos
  simp only [cellPossS, Bool.and_eq_true, Bool.not_eq_true', List.isEmpty_eq_false_iff,
    List.all_eq_true, Bool.or_eq_true, decide_eq_true_eq, Bool.not_eq_true']
  refine ⟨⟨⟨?_, ?_⟩, ?_⟩, ?_⟩
  · intro hnil
    have : x0 ∈ P.rigidRow.filter fun x => K.contains (x, true) := by
      simp only [List.mem_filter, List.contains_iff_mem]
      exact ⟨mem_rigid_of_cand hS (hposS x0 hx0), hx0⟩
    rw [hnil] at this; simp at this
  · intro e he
    rcases e with ⟨x, b⟩
    cases b
    · exact Or.inl rfl
    · exact Or.inr (mem_rigid_of_cand hS (hposS x he))
  · intro x hx
    simp only [List.mem_filter, List.contains_iff_mem] at hx
    refine Bool.eq_false_iff.mpr fun hf => ?_
    rw [List.contains_iff_mem] at hf
    have h2 := (hK _ hf).1 (hposS x hx.2)
    simp at h2
  · apply freeS_of_free
    intro r hr s hs
    simp only [List.mem_filter, List.contains_iff_mem] at hr hs
    exact hfree r (hposS r hr.2) s (hposS s hs.2)

/-! ### QX3's soundness direction -/

omit [DecidableEq Label] in
theorem coverK_sound (P : SigProblem Label B) (r : Nat) (R : List CellCube) :
    ∀ (fuel : Nat) (K : CellCube), coverK P r R fuel K = true →
      ∀ S ∈ cellCands P, FreeCell P S → r ∈ S → cubeSat S K = true →
        R.any (cubeSat S) = true := by
  intro fuel
  induction fuel with
  | zero => intro K h; simp [coverK] at h
  | succ n ih =>
    intro K h S hS hfree hr hsat
    have hposs : ∀ K', cubeSat S K' = true →
        cellPossS P ((r, true) :: K') = true := fun K' h' =>
      cellPossS_complete P _ ⟨r, List.mem_cons_self⟩ hS hfree
        (cubeSat_cons.mpr ⟨by simp [hr], h'⟩)
    simp only [coverK, Bool.or_eq_true, Bool.not_eq_true'] at h
    rcases h with (h | h) | h
    · rw [hposs K hsat] at h; exact absurd h (by decide)
    · obtain ⟨K', hK', hsub⟩ := List.any_eq_true.mp h
      refine List.any_eq_true.mpr ⟨K', hK', ?_⟩
      refine cubeSat_iff.mpr fun e he => ?_
      simp only [subsumesS, List.all_eq_true, Bool.not_eq_true'] at hsub
      have hf := hsub e he
      refine Classical.byContradiction fun hne => ?_
      have : cubeSat S ((e.1, !e.2) :: K) = true := by
        refine cubeSat_cons.mpr ⟨?_, hsat⟩
        cases hb : e.2 <;> simp_all
      rw [hposs _ this] at hf; exact absurd hf (by decide)
    · split at h
      · exact absurd h (by decide)
      · rename_i x _
        simp only [Bool.and_eq_true] at h
        by_cases hx : x ∈ S
        · exact ih _ h.1 S hS hfree hr (cubeSat_cons.mpr ⟨by simp [hx], hsat⟩)
        · exact ih _ h.2 S hS hfree hr (cubeSat_cons.mpr ⟨by simp [hx], hsat⟩)

end Composition.Typed.Cells.ProofsC

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
/-- QX3 `CoverExact`'s → direction, with its premises: `coverS` is
sound over the free candidate cells of `r`. -/
theorem coverS_sound (P : SigProblem Label B) (r : Nat) (L R : List CellCube)
    (_hr : r ∈ P.rigidRow) (h : coverS P r L R = true) :
    ∀ S ∈ cellCands P, FreeCell P S → r ∈ S →
      L.any (cubeSat S) = true → R.any (cubeSat S) = true := by
  intro S hS hfree hrS hL
  obtain ⟨K, hK, hsat⟩ := List.any_eq_true.mp hL
  simp only [coverS, List.all_eq_true] at h
  exact ProofsC.coverK_sound P r R _ K (h K hK) S hS hfree hrS hsat

end Composition.Typed.Cells

/-! ### CV2: the proposed queries are conservative -/

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

theorem holds_of_D {P : SigProblem Label B} {θs : CAssign Label B}
    (hD : Sat θs (cliftP P).D) {a : Atom Label B} (ha : a ∈ P.D) :
    Holds θs (cliftAtom a) :=
  hD _ (List.mem_map.mpr ⟨a, ha, rfl⟩)

omit [DecidableEq Label] in
theorem written_of_within {P : SigProblem Label B} {θs : CAssign Label B}
    (hW : WithinC P θs) {r : Nat} (hr : r ∈ P.rigidRow) {l : Label}
    (h : θs.row r (.inl l) ≠ none) : l ∈ written P := by
  have := hW.2 r hr
  simp only [WithinG] at this
  exact this.1 l h

/-- `holdersOK` refuses holders `rs` of `l` only when a declared atom,
true at `θs`, empties one of them at `l`. -/
theorem holders_sound {P : SigProblem Label B} {θs : CAssign Label B}
    (hD : Sat θs (cliftP P).D) {l : Label} {rs : List Nat}
    (h : holdersOK P l rs = false) :
    ∃ r ∈ rs, θs.row r (.inl l) = none := by
  simp only [holdersOK, List.all_eq_false] at h
  obtain ⟨a, ha, hf⟩ := h
  have hh := holds_of_D hD ha
  cases a with
  | lacks x k =>
    simp only [cliftAtom, Holds] at hh
    simp at hf
    obtain ⟨rfl, hx⟩ := hf
    exact ⟨x, hx, hh⟩
  | disjoint x y =>
    simp only [cliftAtom, Holds, Composition.Disjoint] at hh
    simp at hf
    obtain ⟨hx, hy⟩ := hf
    rcases hh (.inl l) with h | h
    · exact ⟨x, hx, h⟩
    · exact ⟨y, hy, h⟩
  | eq _ _ => simp at hf
  | ff => simp at hf

theorem possW_sound {P : SigProblem Label B} {θs : CAssign Label B}
    (hW : WithinC P θs) (hD : Sat θs (cliftP P).D) {r : Nat}
    (hr : r ∈ P.rigidRow) {l : Label}
    (h : (decide (l ∈ written P) && holdersOK P l [r]) = false) :
    θs.row r (.inl l) = none := by
  rcases Bool.and_eq_false_iff.mp h with h | h
  · refine Classical.byContradiction fun hne => ?_
    have := written_of_within hW hr hne
    simp_all
  · obtain ⟨x, hx, hn⟩ := holders_sound hD h
    simp only [List.mem_singleton] at hx
    subst hx; exact hn

theorem possBoth_sound {P : SigProblem Label B} {θs : CAssign Label B}
    (hW : WithinC P θs) (hD : Sat θs (cliftP P).D) {r s : Nat}
    (hr : r ∈ P.rigidRow) {l : Label}
    (h : (decide (l ∈ written P) && holdersOK P l [r, s]) = false) :
    θs.row r (.inl l) = none ∨ θs.row s (.inl l) = none := by
  rcases Bool.and_eq_false_iff.mp h with h | h
  · refine Or.inl (Classical.byContradiction fun hne => ?_)
    have := written_of_within hW hr hne
    simp_all
  · obtain ⟨x, hx, hn⟩ := holders_sound hD h
    simp only [List.mem_cons, List.not_mem_nil, or_false] at hx
    rcases hx with rfl | rfl
    · exact Or.inl hn
    · exact Or.inr hn

end Composition.Typed.Cells.ProofsC

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-- CV2. -/
theorem implSound : ImplSound (Label := Label) (B := B) := by
  intro P θs hreg r hr s hs
  obtain ⟨π, _, hG, hW, hC⟩ := hreg
  have hD := hG.2.1
  refine ⟨fun l h => ProofsC.possW_sound hW hD hr h,
    fun l h => ProofsC.possBoth_sound hW hD hr h, fun K S h hK => ?_,
    fun L R S h hS hL => ?_⟩
  · refine Classical.byContradiction fun hne => ?_
    simp only [not_or, ← ne_eq, Option.ne_none_iff_isSome] at hne
    obtain ⟨hcand, hfree, hrS⟩ := hC r hr S hne.1
    obtain ⟨_, _, hsS⟩ := hC s hs S hne.2
    have hsat : cubeSat S ((r, true) :: (s, true) :: K) = true :=
      ProofsC.cubeSat_cons.mpr ⟨by simp [hrS],
        ProofsC.cubeSat_cons.mpr ⟨by simp [hsS], hK⟩⟩
    have := ProofsC.cellPossS_complete P _ ⟨r, List.mem_cons_self⟩ hcand hfree hsat
    simp only [implQ] at h
    rw [this] at h; exact absurd h (by decide)
  · obtain ⟨hcand, hfree, hrS⟩ :=
      hC r hr S (Option.ne_none_iff_isSome.mp hS)
    exact coverS_sound P r L R hr h S hcand hfree hrS hL

end Composition.Typed.Cells

/-! ### Denotation lemmas -/

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

theorem union_ne_none {α β : Type} {r s : Row α β} {k : α} :
    union r s k ≠ none ↔ r k ≠ none ∨ s k ≠ none := by
  simp only [union]
  cases r k <;> simp

theorem cpieceRow_inl_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {q : CellPiece Label} {l : Label} (h : cpieceRow P θs q (.inl l) ≠ none) :
    q.row ∈ P.rigidRow ∧ l ∈ q.labels ∧ θs.row q.row (.inl l) ≠ none := by
  simp only [cpieceRow] at h
  split at h
  · rename_i hc; exact ⟨hc.1, hc.2, h⟩
  · exact absurd rfl h

theorem cpieceRow_inr_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {q : CellPiece Label} {S : Cell} (h : cpieceRow P θs q (.inr S) ≠ none) :
    q.row ∈ P.rigidRow ∧ q.selects S = true ∧ θs.row q.row (.inr S) ≠ none := by
  simp only [cpieceRow] at h
  split at h
  · rename_i hc; exact ⟨hc.1, hc.2, h⟩
  · exact absurd rfl h

theorem cpieceRow_of_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {q : CellPiece Label} {k : CL Label} (h : cpieceRow P θs q k ≠ none) :
    cpieceRow P θs q k = θs.row q.row k := by
  cases k with
  | inl l =>
    have := cpieceRow_inl_ne h
    simp [cpieceRow, this.1, this.2.1]
  | inr S =>
    have := cpieceRow_inr_ne h
    simp [cpieceRow, this.1, this.2.1]

theorem cpiecesRow_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {k : CL Label} : ∀ {ps : List (CellPiece Label)},
    cpiecesRow P θs ps k ≠ none → ∃ q ∈ ps, cpieceRow P θs q k ≠ none
  | [], h => absurd rfl h
  | q :: ps, h => by
    rw [show cpiecesRow P θs (q :: ps) =
      union (cpieceRow P θs q) (cpiecesRow P θs ps) from rfl] at h
    rcases union_ne_none.mp h with h0 | h0
    · exact ⟨q, List.mem_cons_self, h0⟩
    · obtain ⟨q', hq', h1⟩ := cpiecesRow_ne h0
      exact ⟨q', List.mem_cons_of_mem _ hq', h1⟩

theorem cvDenFields_inr {P : SigProblem Label B} {θs : CAssign Label B}
    {S : Cell} : ∀ fs : List (Label × CellV Label B),
    cvDenFields P θs fs (.inr S) = none
  | [] => rfl
  | (l, v) :: rest => by
    simp only [cvDenFields]
    simp [cvDenFields_inr rest]

theorem cvDenFields_inl {P : SigProblem Label B} {θs : CAssign Label B}
    {l : Label} : ∀ fs : List (Label × CellV Label B),
    cvDenFields P θs fs (.inl l) = (fs.lookup l).map (cvDen P θs)
  | [] => rfl
  | (l', v) :: rest => by
    simp only [cvDenFields, List.lookup_cons, Sum.inl.injEq]
    by_cases h : l = l'
    · subst h; simp
    · have hb : (l == l') = false := by simp [h]
      simp [h, hb, cvDenFields_inl rest]

theorem mem_of_lookup {β : Type} : ∀ {fs : List (Label × β)} {l : Label} {v : β},
    fs.lookup l = some v → (l, v) ∈ fs
  | [], _, _, h => by simp at h
  | (l', w) :: rest, l, v, h => by
    simp only [List.lookup_cons] at h
    by_cases hl : l = l'
    · subst hl; simp at h; subst h; exact List.mem_cons_self
    · have hb : (l == l') = false := by simp [hl]
      simp only [hb] at h; exact List.mem_cons_of_mem _ (mem_of_lookup h)

theorem lookup_isSome {β : Type} : ∀ {fs : List (Label × β)} {l : Label},
    (∃ e ∈ fs, e.1 = l) → (fs.lookup l).isSome
  | [], _, ⟨_, h, _⟩ => by simp at h
  | (l', w) :: rest, l, ⟨e, he, hl⟩ => by
    simp only [List.lookup_cons]
    by_cases h : l = l'
    · subst h; simp
    · have hb : (l == l') = false := by simp [h]
      simp only [hb]
      rcases List.mem_cons.mp he with rfl | he
      · exact absurd hl.symm h
      · exact lookup_isSome ⟨e, he, hl⟩

theorem cvDenFields_ne {P : SigProblem Label B} {θs : CAssign Label B}
    {fs : List (Label × CellV Label B)} {k : CL Label}
    (h : cvDenFields P θs fs k ≠ none) : ∃ l, k = .inl l ∧ ∃ e ∈ fs, e.1 = l := by
  cases k with
  | inr S => exact absurd (cvDenFields_inr fs) h
  | inl l =>
    refine ⟨l, rfl, ?_⟩
    rw [cvDenFields_inl] at h
    cases hl : fs.lookup l with
    | none => simp [hl] at h
    | some v => exact ⟨(l, v), mem_of_lookup hl, rfl⟩

/-! ### CD2 -/

theorem cubeSat_append {S : Cell} {K K' : CellCube}
    (h : cubeSat S K = true) (h' : cubeSat S K' = true) :
    cubeSat S (K ++ K') = true := by
  simp only [cubeSat, List.all_append, Bool.and_eq_true] at *
  exact ⟨h, h'⟩

/-- Apart pieces never share an entry in the region. -/
theorem piecesApart_sound {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {q q' : CellPiece Label} (h : piecesApart Q q q' = true) (k : CL Label) :
    cpieceRow P θs q k = none ∨ cpieceRow P θs q' k = none := by
  refine Classical.byContradiction fun hne => ?_
  simp only [not_or] at hne
  simp only [piecesApart, Bool.and_eq_true, List.all_eq_true] at h
  cases k with
  | inl l =>
    obtain ⟨hr, hl, hv⟩ := cpieceRow_inl_ne hne.1
    obtain ⟨hr', hl', hv'⟩ := cpieceRow_inl_ne hne.2
    have h1 := h.1 l hl
    simp only [hl', decide_true, Bool.not_true, Bool.false_or,
      Bool.not_eq_true'] at h1
    rcases (hQ θs hreg q.row hr q'.row hr').2.1 l h1 with h2 | h2
    · exact hv h2
    · exact hv' h2
  | inr S =>
    obtain ⟨hr, hs, hv⟩ := cpieceRow_inr_ne hne.1
    obtain ⟨hr', hs', hv'⟩ := cpieceRow_inr_ne hne.2
    obtain ⟨K, hK, hKs⟩ := List.any_eq_true.mp hs
    obtain ⟨K', hK', hKs'⟩ := List.any_eq_true.mp hs'
    have h1 := h.2 K hK K' hK'
    simp only [Bool.not_eq_true'] at h1
    rcases (hQ θs hreg q.row hr q'.row hr').2.2.1 (K ++ K') S h1
        (cubeSat_append hKs hKs') with h2 | h2
    · exact hv h2
    · exact hv' h2

/-- `lackC` leaves every piece empty at `l` in the region. -/
theorem lackC_sound {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {ps : List (CellPiece Label)} {l : Label} (h : lackC Q ps l = true) :
    ∀ q ∈ ps, cpieceRow P θs q (.inl l) = none := by
  intro q hq
  refine Classical.byContradiction fun hne => ?_
  obtain ⟨hr, hl, hv⟩ := cpieceRow_inl_ne hne
  simp only [lackC, List.all_eq_true] at h
  have h1 := h q hq
  simp only [hl, decide_true, Bool.not_true, Bool.false_or,
    Bool.not_eq_true'] at h1
  exact hv ((hQ θs hreg q.row hr q.row hr).1 l h1)

end Composition.Typed.Cells.ProofsC

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-- CD2. -/
theorem apartSound : ApartSound (Label := Label) (B := B) := by
  intro P Q hQ θs hreg x y h k
  refine Classical.byContradiction fun hne => ?_
  simp only [not_or] at hne
  have hx := ProofsC.union_ne_none.mp hne.1
  have hy := ProofsC.union_ne_none.mp hne.2
  simp only [apartC, Bool.and_eq_true, List.all_eq_true] at h
  obtain ⟨⟨hfx, hfy⟩, hpp⟩ := h
  rcases hx with hx | hx
  · obtain ⟨l, rfl, e, he, rfl⟩ := ProofsC.cvDenFields_ne hx
    have h1 := hfx e he
    simp only [Bool.not_eq_true', List.any_eq_false, decide_eq_true_eq] at h1
    rcases hy with hy | hy
    · obtain ⟨l', hl', e', he', rfl⟩ := ProofsC.cvDenFields_ne hy
      exact h1.1 e' he' (Sum.inl.inj hl').symm
    · obtain ⟨q, hq, hq'⟩ := ProofsC.cpiecesRow_ne hy
      exact hq' (ProofsC.lackC_sound hQ hreg h1.2 q hq)
  · obtain ⟨q, hq, hq'⟩ := ProofsC.cpiecesRow_ne hx
    rcases hy with hy | hy
    · obtain ⟨l, rfl, e, he, rfl⟩ := ProofsC.cvDenFields_ne hy
      exact hq' (ProofsC.lackC_sound hQ hreg (hfy e he) q hq)
    · obtain ⟨q', hq2, hq2'⟩ := ProofsC.cpiecesRow_ne hy
      rcases ProofsC.piecesApart_sound hQ hreg (hpp q hq q' hq2) k with h2 | h2
      · exact hq' h2
      · exact hq2' h2

end Composition.Typed.Cells

/-! ### CB3 -/

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- At most one row contributes at each key: two pieces both non-empty
at `k` are on the same row. -/
def PCoh (P : SigProblem Label B) (θs : CAssign Label B)
    (ps : List (CellPiece Label)) : Prop :=
  ∀ k, ∀ q1 ∈ ps, ∀ q2 ∈ ps, cpieceRow P θs q1 k ≠ none →
    cpieceRow P θs q2 k ≠ none → q1.row = q2.row

omit [DecidableEq B] in
theorem pcoh_single {P : SigProblem Label B} {θs : CAssign Label B}
    {ps : List (CellPiece Label)} (h : ps.length ≤ 1) : PCoh P θs ps := by
  intro k q1 h1 q2 h2 _ _
  match ps, h, h1, h2 with
  | [_], _, h1, h2 =>
    simp only [List.mem_singleton] at h1 h2
    rw [h1, h2]

omit [DecidableEq B] in
theorem pcoh_append {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {ps ps' : List (CellPiece Label)} (h : PCoh P θs ps) (h' : PCoh P θs ps')
    (hap : ∀ q ∈ ps, ∀ q' ∈ ps', piecesApart Q q q' = true) :
    PCoh P θs (ps ++ ps') := by
  intro k q1 hq1 q2 hq2 hn1 hn2
  rcases List.mem_append.mp hq1 with hq1 | hq1 <;>
    rcases List.mem_append.mp hq2 with hq2 | hq2
  · exact h k q1 hq1 q2 hq2 hn1 hn2
  · rcases piecesApart_sound hQ hreg (hap q1 hq1 q2 hq2) k with h0 | h0
    · exact absurd h0 hn1
    · exact absurd h0 hn2
  · rcases piecesApart_sound hQ hreg (hap q2 hq2 q1 hq1) k with h0 | h0
    · exact absurd h0 hn2
    · exact absurd h0 hn1
  · exact h' k q1 hq1 q2 hq2 hn1 hn2

omit [DecidableEq B] in
/-- The composition fold keeps pieces coherent, and collects them all. -/
theorem compose_pcoh {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs) :
    ∀ (parts : List (CRow Label B)) (acc res : CRow Label B),
      (∀ x ∈ parts, x.2.length ≤ 1) → PCoh P θs acc.2 →
      parts.foldlM (fun acc x => if apartC Q acc x
        then some (acc.1 ++ x.1, acc.2 ++ x.2) else none) acc = some res →
      PCoh P θs res.2 ∧ res.2 = acc.2 ++ parts.flatMap (·.2)
  | [], acc, res, _, hc, h => by
    simp only [List.foldlM_nil] at h
    cases h; exact ⟨hc, by simp⟩
  | x :: parts, acc, res, hl, hc, h => by
    simp only [List.foldlM_cons] at h
    split at h
    · rename_i hap
      have hap' : ∀ q ∈ acc.2, ∀ q' ∈ x.2, piecesApart Q q q' = true := by
        simp only [apartC, Bool.and_eq_true, List.all_eq_true] at hap
        exact hap.2
      have hc' : PCoh P θs (acc.2 ++ x.2) :=
        pcoh_append hQ hreg hc (pcoh_single (hl x List.mem_cons_self)) hap'
      obtain ⟨h1, h2⟩ := compose_pcoh hQ hreg parts _ res
        (fun y hy => hl y (List.mem_cons_of_mem _ hy)) hc' h
      exact ⟨h1, by simp [h2]⟩
    · simp at h

omit [DecidableEq B] in
theorem cpiecesRow_of_pcoh {P : SigProblem Label B} {θs : CAssign Label B}
    {k : CL Label} : ∀ {ps : List (CellPiece Label)} {q : CellPiece Label},
    PCoh P θs ps → q ∈ ps → cpieceRow P θs q k ≠ none →
      cpiecesRow P θs ps k = θs.row q.row k
  | [], _, _, hq, _ => by simp at hq
  | q0 :: ps, q, hc, hq, hn => by
    rw [show cpiecesRow P θs (q0 :: ps) k =
      union (cpieceRow P θs q0) (cpiecesRow P θs ps) k from rfl]
    cases h0 : cpieceRow P θs q0 k with
    | some v =>
      have hn0 : cpieceRow P θs q0 k ≠ none := by simp [h0]
      have hrow := hc k q0 List.mem_cons_self q hq hn0 hn
      rw [← hrow, ← cpieceRow_of_ne hn0, h0]
      simp [union, h0]
    | none =>
      simp only [union, h0]
      rcases List.mem_cons.mp hq with rfl | hq
      · exact absurd h0 hn
      · exact cpiecesRow_of_pcoh
          (fun k q1 h1 q2 h2 => hc k q1 (List.mem_cons_of_mem _ h1) q2
            (List.mem_cons_of_mem _ h2)) hq hn

omit [DecidableEq B] in
/-- Each non-empty piece of `xp` has a non-empty piece of the same row in
`yp`, by `sameW` on written labels and by `cover` on cells. -/
theorem transfer {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {xp yp : List (CellPiece Label)} (hw : sameW Q xp yp = true)
    (hc : ∀ q ∈ xp,
      Q.cover q.row (rowCubes xp q.row) (rowCubes yp q.row) = true)
    (k : CL Label) (q : CellPiece Label) (hq : q ∈ xp)
    (hn : cpieceRow P θs q k ≠ none) :
    ∃ q' ∈ yp, q'.row = q.row ∧ cpieceRow P θs q' k ≠ none := by
  cases k with
  | inl l =>
    obtain ⟨hr, hl, hv⟩ := cpieceRow_inl_ne hn
    simp only [sameW, List.all_eq_true] at hw
    have h1 := hw q hq l hl
    simp only [Bool.or_eq_true, Bool.not_eq_true', List.any_eq_true,
      Bool.and_eq_true, decide_eq_true_eq] at h1
    rcases h1 with h1 | ⟨q', hq', hrow, hl'⟩
    · exact absurd ((hQ θs hreg q.row hr q.row hr).1 l h1) hv
    · refine ⟨q', hq', hrow, ?_⟩
      simp only [cpieceRow, hrow, hr, hl', and_self, ite_true]
      exact hv
  | inr S =>
    obtain ⟨hr, hs, hv⟩ := cpieceRow_inr_ne hn
    obtain ⟨K, hK, hKs⟩ := List.any_eq_true.mp hs
    have hL : (rowCubes xp q.row).any (cubeSat S) = true := by
      refine List.any_eq_true.mpr ⟨K, ?_, hKs⟩
      simp only [rowCubes, List.mem_flatMap, List.mem_filter]
      exact ⟨q, ⟨hq, by simp⟩, hK⟩
    have hR := (hQ θs hreg q.row hr q.row hr).2.2.2 _ _ S (hc q hq) hv hL
    obtain ⟨K', hK', hKs'⟩ := List.any_eq_true.mp hR
    simp only [rowCubes, List.mem_flatMap, List.mem_filter,
      decide_eq_true_eq] at hK'
    obtain ⟨q', ⟨hq', hrow⟩, hK'⟩ := hK'
    refine ⟨q', hq', hrow, ?_⟩
    have hsel : q'.selects S = true := List.any_eq_true.mpr ⟨K', hK', hKs'⟩
    simp only [cpieceRow, hrow, hr, hsel, and_self, ite_true]
    exact hv

omit [DecidableEq B] in
theorem pieces_eq {P : SigProblem Label B} {θs : CAssign Label B}
    {xp yp : List (CellPiece Label)} (hx : PCoh P θs xp) (hy : PCoh P θs yp)
    (k : CL Label)
    (txy : ∀ q ∈ xp, cpieceRow P θs q k ≠ none →
      ∃ q' ∈ yp, q'.row = q.row ∧ cpieceRow P θs q' k ≠ none)
    (tyx : ∀ q ∈ yp, cpieceRow P θs q k ≠ none →
      ∃ q' ∈ xp, q'.row = q.row ∧ cpieceRow P θs q' k ≠ none) :
    cpiecesRow P θs xp k = cpiecesRow P θs yp k := by
  by_cases h : ∃ q ∈ xp, cpieceRow P θs q k ≠ none
  · obtain ⟨q, hq, hn⟩ := h
    obtain ⟨q', hq', hrow, hn'⟩ := txy q hq hn
    rw [cpiecesRow_of_pcoh hx hq hn, cpiecesRow_of_pcoh hy hq' hn', hrow]
  · have hxn : cpiecesRow P θs xp k = none :=
      Classical.byContradiction fun hne => h (cpiecesRow_ne hne)
    have hyn : cpiecesRow P θs yp k = none :=
      Classical.byContradiction fun hne => by
        obtain ⟨q, hq, hn⟩ := cpiecesRow_ne hne
        obtain ⟨q', hq', _, hn'⟩ := tyx q hq hn
        exact h ⟨q', hq', hn'⟩
    rw [hxn, hyn]

omit [DecidableEq B] in
theorem wfFC_mem {P : SigProblem Label B} {Q : CellQ Label} :
    ∀ {fs : List (Label × CellV Label B)}, wfFC P Q fs = true →
      ∀ e ∈ fs, wfC P Q e.2 = true
  | [], _, e, he => by simp at he
  | (l, v) :: rest, h, e, he => by
    simp only [wfFC, Bool.and_eq_true] at h
    rcases List.mem_cons.mp he with rfl | he
    · exact h.1
    · exact wfFC_mem h.2 e he

omit [DecidableEq Label] [DecidableEq B] in
theorem flatMap_parts (fs : List (Label × CellV Label B))
    (ps : List (CellPiece Label)) :
    (fs.map (fun e => (([e], []) : CRow Label B)) ++
      ps.map (fun q => (([], [q]) : CRow Label B))).flatMap (·.2) = ps := by
  induction fs with
  | nil =>
    simp only [List.map_nil, List.nil_append]
    induction ps with
    | nil => rfl
    | cons q ps ih => simp [ih]
  | cons e fs ih => simpa using ih

omit [DecidableEq B] in
/-- A well-formed record's pieces are coherent in the region. -/
theorem wf_pcoh {P : SigProblem Label B} {Q : CellQ Label}
    (hQ : QSound P Q) {θs : CAssign Label B} (hreg : InCellRegion P θs)
    {fs : List (Label × CellV Label B)} {ps : List (CellPiece Label)}
    (h : (composeC Q (fs.map (fun e => ([e], [])) ++
        ps.map (fun q => ([], [q])))).isSome = true) :
    PCoh P θs ps := by
  obtain ⟨res, hres⟩ := Option.isSome_iff_exists.mp h
  have hl : ∀ x ∈ (fs.map (fun e => (([e], []) : CRow Label B)) ++
      ps.map (fun q => (([], [q]) : CRow Label B))), x.2.length ≤ 1 := by
    intro x hx
    simp only [List.mem_append, List.mem_map] at hx
    rcases hx with ⟨e, _, rfl⟩ | ⟨q, _, rfl⟩ <;> simp
  obtain ⟨h1, h2⟩ := compose_pcoh hQ hreg _ ([], []) res hl
    (pcoh_single (by simp)) hres
  rw [h2, flatMap_parts] at h1
  simpa using h1

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
