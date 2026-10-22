/-
Proof stream W9 (dossier §18.57, wave 2): QX4 `CoverTautology` and
`CheckTautology`, the reductions of statements.md §6.3, from QX3
`CoverExact` (proved by another stream) as a hypothesis. They concern
exact checking of this certificate format only: with no declarations,
deciding one certificate's acceptance decides DNF tautology over the
other rows. No complexity claim is stated or proved here.
-/
import Composition.Typed.Cell.Proofs.C
import Composition.Typed.Cell.ScenariosMore

namespace Composition.Typed.Cells.ProofsW9

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
/-- The cells of `r :: xs` containing `r` are `r :: T`, `T ⊆ xs`. -/
theorem cands_cover_iff (r : Nat) (xs : List Nat) (φ : Cell → Prop)
    (P : SigProblem Label B) (hP : P.rigidRow = r :: xs)
    (hnd : (r :: xs).Nodup) :
    (∀ S ∈ cellCands P, r ∈ S → φ S) ↔ ∀ T ∈ subsets xs, φ (r :: T) := by
  have hr : r ∉ xs := (List.nodup_cons.mp hnd).1
  simp only [cellCands, hP, subsets, List.mem_filter, List.mem_append,
    List.mem_map, decide_eq_true_eq]
  constructor
  · intro h T hT
    exact h (r :: T) ⟨Or.inr ⟨T, hT, rfl⟩, List.cons_ne_nil _ _⟩
      List.mem_cons_self
  · rintro h S ⟨hS | ⟨T, hT, rfl⟩, -⟩ hrS
    · exact absurd (ProofsC.mem_of_mem_subsets hS hrS) hr
    · exact h T hT

omit [DecidableEq Label] in
/-- `coverK` reads the problem only through its rigid rows and `D`. -/
theorem coverK_congr {P P' : SigProblem Label B}
    (hR : P.rigidRow = P'.rigidRow) (hD : P.D = P'.D) (r : Nat)
    (R : List CellCube) : ∀ n K, coverK P r R n K = coverK P' r R n K
  | 0, _ => rfl
  | n + 1, K => by
    have hposs : ∀ K, cellPossS P K = cellPossS P' K := fun K => by
      simp only [cellPossS, freeS, hR, hD]
    have hsub : subsumesS P r K = subsumesS P' r K :=
      funext fun K' => by simp only [subsumesS, hposs]
    have hrec : coverK P r R n = coverK P' r R n :=
      funext (coverK_congr hR hD r R n)
    simp only [coverK, hposs, hsub, hrec]

omit [DecidableEq Label] in
theorem coverS_congr {P P' : SigProblem Label B}
    (hR : P.rigidRow = P'.rigidRow) (hD : P.D = P'.D) (r : Nat)
    (L R : List CellCube) : coverS P r L R = coverS P' r L R := by
  simp only [coverS, funext (coverK_congr hR hD r R _)]

omit [DecidableEq Label] in
/-- Every cube is covered by the empty cube (which `subsumesS` reads as
"no literal to refute"). -/
theorem coverS_all (P : SigProblem Label B) (r : Nat) (L : List CellCube) :
    coverS P r L [[]] = true := by
  simp [coverS, coverK, subsumesS, litRows]

variable [DecidableEq B]

/-- The checker on `CheckTautology`'s problem asks one cover query. -/
theorem checkI_eq (r u : Nat) (xs : List Nat) (R : List CellCube)
    (hu : u ∉ r :: xs) :
    checkI (⟨[], r :: xs, [], [.eq (.record .nil [r]) (.record .nil [u])]⟩ :
        SigProblem Label B) ⟨[], [(u, .record [] [⟨r, [], R⟩])]⟩ =
      coverS (⟨[], r :: xs, [], []⟩ : SigProblem Label B) r [[]] R := by
  have hw : written (⟨[], r :: xs, [], [.eq (.record .nil [r])
      (.record .nil [u])]⟩ : SigProblem Label B) = [] := by
    simp [written, labelsOf, labelsT, labelsF]
  rw [coverS_congr (P := (⟨[], r :: xs, [], []⟩ : SigProblem Label B))
    (P' := (⟨[], r :: xs, [], [.eq (.record .nil [r])
      (.record .nil [u])]⟩ : SigProblem Label B)) rfl rfl]
  have hu' : u ∉ r :: xs := hu
  simp [checkI, cellCheck, fragmentS, certOkC, wfC, wfFC, composeC, apartC,
    atomC, evalC, evalFC, rowC, wholePiece, hw, hu', eqC, eqFC, sameW,
    sameCells, rowCubes, implQ, coverS_all, lackC, piecesApart]

end Composition.Typed.Cells.ProofsW9

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq Label] [DecidableEq B] in
/-- QX4 from QX3: with no declarations, covering the whole of `r` is
tautology of `R` over the other rows. -/
theorem coverTautology_of (h3 : CoverExact (Label := Label) (B := B)) :
    CoverTautology (Label := Label) (B := B) := by
  intro r xs R hnd
  simp only []
  rw [h3 _ r [[]] R List.mem_cons_self]
  have hfree : ∀ S, FreeCell (⟨[], r :: xs, [], []⟩ : SigProblem Label B) S :=
    fun S _ _ _ _ h => by simp at h
  have hL : ∀ S, [([] : CellCube)].any (cubeSat S) = true := fun S => by
    simp [cubeSat]
  rw [← ProofsW9.cands_cover_iff r xs (fun S => R.any (cubeSat S) = true)
    (⟨[], r :: xs, [], []⟩ : SigProblem Label B) rfl hnd]
  exact ⟨fun h S hS hr => h S hS (hfree S) hr (hL S),
    fun h S hS _ hr _ => h S hS hr⟩

/-- `CheckTautology` from QX3: with no declarations, the one-equation
problem's certificate `u := ⟨r, [], R⟩` is accepted iff `R` covers every
cell of `r`. -/
theorem checkTautology_of (h3 : CoverExact (Label := Label) (B := B)) :
    CheckTautology Label B := by
  intro r u xs R hnd hu
  rw [ProofsW9.checkI_eq r u xs R hu]
  exact coverTautology_of h3 r xs R hnd

end Composition.Typed.Cells
