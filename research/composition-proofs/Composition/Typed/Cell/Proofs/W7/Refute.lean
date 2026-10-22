/-
Stream W7: the term `{...4, ...6}` on `route` evaluates symbolically
under `route`'s accepted certificate, but is undefined at `routeJunk`,
where rows 4 and 6 both hold cell `[1, 2]`.
-/
import Composition.Typed.Cell.Refutations
import Composition.Typed.Cell.Proofs.Main

namespace Composition.Typed.Cells.ProofsW7

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

omit [DecidableEq B] in
theorem route_eval46 : ∃ v : CellV Label B, evalC (routeP : SigProblem Label B)
    (implQ (routeP : SigProblem Label B)) routeCert (.record .nil [4, 6]) =
      some v := ⟨_, rfl⟩

omit [DecidableEq B] in
theorem junk_eval46 (π : Pattern Label) :
    evalT (combine (cliftP (routeP : SigProblem Label B)) (routeJunk π)
      (cinst routeP (routeJunk π) routeCert))
      (cliftT (.record .nil [4, 6])) = none := by
  have h4 : (combine (cliftP (routeP : SigProblem Label B)) (routeJunk π)
      (cinst routeP (routeJunk π) routeCert)).row 4 =
      cvDenRowOf routeP (routeJunk π)
        (.record [] [⟨0, [], [[(1, true)]]⟩]) := rfl
  have h6 : (combine (cliftP (routeP : SigProblem Label B)) (routeJunk π)
      (cinst routeP (routeJunk π) routeCert)).row 6 =
      cvDenRowOf routeP (routeJunk π)
        (.record [] [⟨2, [], [[]]⟩]) := rfl
  show evalT _ (.record .nil [4, 6]) = none
  rw [evalT_tails]
  simp only [List.map, composeAll, compose_empty, h4, h6,
    Option.bind_some]
  simp only [compose]
  split
  · next hd =>
    exfalso
    rcases hd (.inr [1, 2]) with h | h <;>
    simp [routeP, cvDenRowOf, cpiecesRow, cpieceRow, union, cvDenFields,
        CellPiece.selects, cubeSat, ProofsG.junk_row, Row.empty] at h
  · rfl

end Composition.Typed.Cells.ProofsW7
