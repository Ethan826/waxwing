import Composition.Typed.Cell.Proofs.W4.Cert

namespace Composition.Typed.Cells.ProofsW4

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {B : Type}

theorem starP_cStar (n : Nat) (b : B) : StarP n (cStar n b false false) :=
  ⟨rfl, rfl, rfl⟩

theorem sameL_self (P : SigProblem Nat B) : SameL P (written P) :=
  fun _ => Iff.rfl

/-- Every binding of the star certificate is well-formed (at any problem
of the star shape that reads it). -/
theorem certOk_star {n : Nat} {P : SigProblem Nat B} (h : StarP n P) (b : B)
    (L : List Nat) :
    certOkC P (implQ P) ⟨(starIdx n).map fun i => (i, CellV.record
        [(i, .base b)] [pc i L, pc 0 L]),
      (starIdx n).flatMap fun i =>
        [(n + i, CellV.record [(i, .base b)] [pc i L]),
         (2 * n + i, CellV.record [] [pc 0 L])]⟩ = true := by
  simp only [certOkC, Bool.and_eq_true]
  simp only [List.all_eq_true, List.mem_map, List.mem_flatMap]
  constructor
  · rintro e ⟨i, hi, rfl⟩
    exact wf_v h hi b L L
  · rintro e ⟨i, hi, he⟩
    simp only [List.mem_cons, List.mem_nil_iff, or_false] at he
    rcases he with rfl | rfl
    · simp [wf_a h hi b L]
    · simp [wf_b h L]

theorem atoms_star [DecidableEq B] {n : Nat} {P : SigProblem Nat B} (h : StarP n P) (b : B)
    {σ : CellCert Nat B} {L : List Nat} (hL : SameL P L)
    (hv : ∀ i ∈ starIdx n,
      σ.ty.lookup i = some (.record [(i, .base b)] [pc i L, pc 0 L]))
    (ha : ∀ i ∈ starIdx n,
      σ.row.lookup (n + i) = some (.record [(i, .base b)] [pc i L]))
    (hb : ∀ i ∈ starIdx n,
      σ.row.lookup (2 * n + i) = some (.record [] [pc 0 L])) :
    ∀ a ∈ (starIdx n).flatMap (starB n b), atomC P (implQ P) σ a = true := by
  intro a ha'
  obtain ⟨i, hi, ha'⟩ := List.mem_flatMap.1 ha'
  simp only [starB, List.mem_cons, List.mem_nil_iff, or_false] at ha'
  rcases ha' with rfl | rfl | rfl | rfl
  · exact atom1 h hi b hL (ha i hi)
  · exact atom2 h hi hL (hb i hi)
  · exact atom3 h hi b (ha i hi) (hb i hi)
  · exact atom4 h hi b hL hL hL hL (hv i hi) (ha i hi) (hb i hi)

end Composition.Typed.Cells.ProofsW4

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed.Cells.ProofsW4

/-- `star` n is accepted at every n, by its certificate. -/
theorem scStar (B : Type) [DecidableEq B] (b : B) : ScStar B b := by
  intro n
  have h := starP_cStar n b
  have hok := certOk_star h b (written (cStar n b false false))
  have hc : certOkC (cStar n b false false) (implQ (cStar n b false false))
      (cStarCert n b false false) = true := hok
  have ha : (cStar n b false false).B.all
      (atomC (cStar n b false false) (implQ (cStar n b false false))
        (cStarCert n b false false)) = true :=
    List.all_eq_true.2 (atoms_star h b (sameL_self _) (fun i hi => star_ty b hi)
      (fun i hi => star_row_a b hi) (fun i hi => star_row_b b hi))
  simp only [checkI, cellCheck, fragment_star h, hc, ha, Bool.and_self]

end Composition.Typed.Cells
