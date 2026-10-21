/-
A conditional corollary, kept separate from existence: IF `Fresh P z e`
holds (every cell injects into a label outside `written P`, every
constant of `CConst Label`, all infinitely many, injects into a base
outside `basesOf P`), then for Scoped `P` and a pattern with an instance,
validity in the pattern is solvability at `thetaStar` for any MGU over
the allowed cells. `universality` supplies `GenericInst` and `WithinC`
without freshness; the `Fresh` premise is used only by `d3bComplete`.
Nothing here says whether Waxwing's type universe provides `Fresh`.
-/
import Composition.Typed.Universality
import Composition.Typed.Complete

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

theorem thetaStar_valid_iff_fresh {P : SigProblem Label B}
    {π : Pattern Label} {τ : CSubst Label B} {z : Cell → Label}
    {e : CConst Label → B} (hS : Scoped P) (hI : HasInstance P π)
    (hM : IsMGU P π (allowedCells P π) τ) (hF : Fresh P z e) :
    (ValidIn P π ↔ SolvableAt P (thetaStar P π τ)) ∧
      (ValidFinIn P π ↔ SolvableFinAt P (thetaStar P π τ)) := by
  obtain ⟨hg, hW⟩ := universality P π τ hS hI hM
  have hc := d3bComplete P π _ z e hF hW hg
  have hs := d3bSound P π _ hg
  exact ⟨⟨hc.1, hs.1⟩, ⟨hc.2, hs.2⟩⟩

end Composition.Typed
