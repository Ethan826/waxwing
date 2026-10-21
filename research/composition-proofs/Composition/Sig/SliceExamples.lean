import Composition.Sig.SliceDefs

namespace Composition.Syntax

/-! Examples of the proposed definitions; these guards prove no claims. -/

section Examples

/-- A record of tails only. -/
def rows (ts : List Nat) : TExpr String String := .record .nil ts

/-- `x = {..r}`, `x = {..s}`: one slice through the flexible `x`. -/
def sharedTy : SigProblem String String :=
  ⟨[], [0, 1], [], [.eq (.tvar 1) (rows [0]), .eq (.tvar 1) (rows [1])]⟩

#guard (componentSets sharedTy).length == 1

/-- `u = r` and `u = s` inside a field `f`: one slice. -/
def nestedRow : SigProblem String String :=
  let f (r : Nat) : TExpr String String :=
    .record (.cons "f" (rows [r]) .nil) []
  ⟨[], [0, 1], [], [.eq (f 3) (f 0), .eq (f 3) (f 1)]⟩

#guard (componentSets nestedRow).length == 1

/-- `ff` beside `u = r`: kept in the ground slice. -/
def groundFF : SigProblem String String :=
  ⟨[], [0], [], [.eq (rows [3]) (rows [0]), .ff]⟩

#guard (groundSlice groundFF).B.length == 1
#guard (componentSets groundFF).length == 1

/-- `u = r`, `u lacks a`: `(0, "a")` is relevant though no atom names
row 0 and `a` together. -/
def atomRel : SigProblem String String :=
  ⟨[], [0], [], [.eq (rows [3]) (rows [0]), .lacks 3 "a"]⟩

#guard relevantPairs atomRel == [(0, "a")]

/-- Two independent parts: two slices, two distinct relevant pairs of four. -/
def twoParts : SigProblem String String :=
  ⟨[], [0, 1], [.lacks 1 "b"],
   [.eq (rows [3]) (rows [0]),
    .eq (.record (.cons "b" (.base "Int") .nil) [1]) (rows [4]),
    .lacks 4 "a"]⟩

#guard (componentSets twoParts).length == 2
#guard (relevantPairs twoParts).eraseDups.length == 2
#guard (pairs twoParts).eraseDups.length == 4

end Examples

end Composition.Syntax
