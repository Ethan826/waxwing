/-
Wave 2, stream W5: the refused star scenarios (`ScStarUnlacked`,
`ScStarUndeclared`, `ScStarCross`; statements.md §8). Each problem has
a finite rigid assignment satisfying `D` at which no flexible assignment
solves the body, so it is not `ValidFin`, hence not `ValidOpen`.
CM-impl (`cellOpenImpl`) then refuses every certificate, the natural
one included.
-/
import Composition.Typed.Cell.Proofs.W5.Rows
import Composition.Typed.Cell.Proofs.Main

namespace Composition.Typed.Cells.ProofsW5

open Composition Composition.Syntax Composition.Typed

variable {B : Type}

theorem refuseAll [DecidableEq B] {P : SigProblem Nat B}
    (h : ¬ ValidOpen P) : ∀ σ, checkI P σ = false := fun σ => by
  cases hc : checkI P σ
  · rfl
  · exact absurd (cellOpenImpl P σ hc) h

/-! ### The three problems are not `ValidOpen` -/

/-- `unl`: `h := { f_n }`, every other rigid row empty. -/
theorem notOpenUnl (b : B) (n : Nat) (hn : 1 ≤ n) :
    ¬ ValidOpen (cStar n b true false) := by
  intro hV
  let θR : Assign Nat B :=
    ⟨fun _ => emptyG, fun r => if r = 0 then single n emptyG else Row.empty⟩
  have hD : Sat θR (cStar n b true false).D := by
    intro a ha
    simp only [cStar, List.mem_flatMap] at ha
    obtain ⟨i, hi, ha⟩ := ha
    have hi' := idxMem hi
    have hi0 : i ≠ 0 := by omega
    by_cases hin : i = n
    · subst hin
      simp [starD] at ha
      rcases ha with rfl | rfl <;>
        simp [Holds, θR, hi0, Composition.Disjoint, Row.empty]
    · simp [starD, hin] at ha
      rcases ha with rfl | rfl | rfl <;>
        simp [Holds, θR, hi0, Composition.Disjoint, Row.empty, single, hin]
  obtain ⟨θF, -, hS⟩ := validFin_of_open hV θR (fun _ _ => finG_emptyG)
    (fun r _ => by
      simp only [θR]
      split
      · exact finG_single_at _ finG_emptyG
      · exact finG_emptyG) hD
  exact starClash (n := n) (i := n)
    (fun a ha => hS a (List.mem_flatMap.2 ⟨n, memIdx hn (Nat.le_refl n), ha⟩))
    n (Or.inl rfl) (by simp [combine, cStar, θR, single])

/-- `und`: `h := { 0 }` and `r_n := { 0 }`, every other rigid row
empty; label `0` is no `f_i`. -/
theorem notOpenUnd (b : B) (n : Nat) (hn : 1 ≤ n) :
    ¬ ValidOpen (cStar n b false true) := by
  intro hV
  let θR : Assign Nat B := ⟨fun _ => emptyG,
    fun r => if r = 0 ∨ r = n then single 0 emptyG else Row.empty⟩
  have hD : Sat θR (cStar n b false true).D := by
    intro a ha
    simp only [cStar, List.mem_flatMap] at ha
    obtain ⟨i, hi, ha⟩ := ha
    have hi' := idxMem hi
    have hi0 : i ≠ 0 := by omega
    by_cases hin : i = n
    · subst hin
      simp [starD] at ha
      rcases ha with rfl | rfl <;>
        simp [Holds, θR, hi0, single, Ne.symm hi0]
    · simp [starD, hin] at ha
      rcases ha with rfl | rfl | rfl <;>
        simp [Holds, θR, hi0, hin, Composition.Disjoint, Row.empty, single]
  obtain ⟨θF, -, hS⟩ := validFin_of_open hV θR (fun _ _ => finG_emptyG)
    (fun r _ => by
      simp only [θR]
      split
      · exact finG_single_at _ finG_emptyG
      · exact finG_emptyG) hD
  have hnm := memIdx hn (Nat.le_refl n)
  exact starClash (n := n) (i := n)
    (fun a ha => hS a (List.mem_flatMap.2 ⟨n, hnm, ha⟩))
    0 (Or.inr (by simp [combine, cStar, θR, single, hnm]))
    (by simp [combine, cStar, θR, single])

/-- `star-cross`: every rigid row empty; `v_1` then holds only `f_1`,
but the read needs `f_2`. -/
theorem notOpenCross (b : B) (n : Nat) (hn : 2 ≤ n) :
    ¬ ValidOpen (cStarR n b [1] fun _ => 2) := by
  intro hV
  let θR : Assign Nat B := ⟨fun _ => emptyG, fun _ => Row.empty⟩
  have hD : Sat θR (cStarR n b [1] fun _ => 2).D := by
    intro a ha
    simp only [cStarR, cStar, List.mem_flatMap] at ha
    obtain ⟨i, -, ha⟩ := ha
    simp [starD] at ha
    rcases ha with rfl | rfl | rfl <;>
      simp [Holds, θR, Composition.Disjoint, Row.empty]
  obtain ⟨θF, -, hS⟩ := validFin_of_open hV θR (fun _ _ => finG_emptyG)
    (fun _ _ => finG_emptyG) hD
  have h1m := memIdx (n := n) (i := 1) (Nat.le_refl 1) (by omega)
  have hB : ∀ a ∈ starB n b 1, Holds (combine (cStarR n b [1] fun _ => 2)
      θR θF) a := fun a ha =>
    hS a (List.mem_append_left _ (List.mem_flatMap.2 ⟨1, h1m, ha⟩))
  have hR := hS (.eq (.tvar 1)
    (.record (.cons 2 (.tvar (n + 1)) .nil) [3 * n + 1]))
    (List.mem_append_right _ (by simp [readB]))
  obtain ⟨v, hv, hvl⟩ := tvarRec (evalF_one _ 2 _ rfl) hR
  obtain ⟨v', hv', hvl'⟩ :=
    tvarRec (evalF_nil _) (hB (.eq (.tvar 1)
      (.record .nil [n + 1, 2 * n + 1])) (by simp [starB]))
  rw [hv] at hv'
  injection hv' with hv'
  subst hv'
  have ha := (aRow (hB (.eq (.record (.cons 1 (.base b) .nil) [1])
    (.record .nil [n + 1])) (by simp [starB])) 2).2
    ⟨by decide, by simp [combine, cStarR, θR, Row.empty, h1m]⟩
  have hb := (bRow (hB (.eq (.record .nil [0])
    (.record .nil [2 * n + 1])) (by simp [starB])) 2).2
    (by simp [combine, cStarR, θR, Row.empty])
  have := (hvl 2).1 ((hvl' 2).2 ⟨rfl, by simp [ha, hb]⟩)
  simp [single] at this

end Composition.Typed.Cells.ProofsW5

namespace Composition.Typed.Cells

open ProofsW5

/-- `star` without `h lacks f_n`: refused by the natural certificate and
by every certificate; the problem is not `ValidOpen`. -/
theorem scStarUnlacked {B : Type} [DecidableEq B] (b : B) :
    ScStarUnlacked B b := fun n hn =>
  have hall := refuseAll (notOpenUnl b n hn)
  ⟨hall _, notOpenUnl b n hn, hall⟩

/-- `star` without `h disjoint r_n`: likewise refused. -/
theorem scStarUndeclared {B : Type} [DecidableEq B] (b : B) :
    ScStarUndeclared B b := fun n hn =>
  have hall := refuseAll (notOpenUnd b n hn)
  ⟨hall _, notOpenUnd b n hn, hall⟩

/-- `star-cross` (`j_1.f2`): likewise refused. -/
theorem scStarCross {B : Type} [DecidableEq B] (b : B) :
    ScStarCross B b := fun n hn =>
  have hall := refuseAll (notOpenCross b n hn)
  ⟨hall _, notOpenCross b n hn, hall⟩

end Composition.Typed.Cells
