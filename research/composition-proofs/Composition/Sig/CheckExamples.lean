/-
Executable evidence for the verified checker (dossier §15.5, §15.8).
Every certificate the untrusted search exported (CheckData.lean) passes
`checkAll`, so by `checkAll_validFin` each of those signatures is valid.
Then the representation boundaries, each against a passing control:
reordered fields, shadowed duplicate entries and bindings, omitted
bindings, broken certificates, and the distinction between duplicates
in a certificate's lists (allowed, first occurrence) and overlapping
parts of a composition (refused). These are `#guard`s, run by Lean's
evaluator, not kernel proofs.
-/
import Composition.Sig.CheckData

namespace Composition.Syntax.CheckExamples

open Composition Composition.Syntax Composition.Syntax.CheckData

/-- The names of exported problems the checker refuses (none). -/
def refused : List String :=
  (exported.filter fun e => !checkAll e.2.1 e.2.2).map (·.1)

#guard refused == []
#guard exported.length == 58

abbrev S := SG String String

def R0 : S := .base (.inr (.R 0))
def int : S := .base (.inl "Int")

/-- `∀ r s. r disjoint s ⇒ ∃ u v. u = r ∧ v = s ∧ u disjoint v`. -/
def alias : SigProblem String String :=
  ⟨[], [0, 1], [.disjoint 0 1],
   [.eq (.record .nil [3]) (.record .nil [0]),
    .eq (.record .nil [4]) (.record .nil [1]), .disjoint 3 4]⟩

def aliasCert (u v : List (GL String × S)) : CertTable String String :=
  [([], ⟨[], [(3, u), (4, v)]⟩)]

def u0 : List (GL String × S) := [(.inr 0, R0)]
def v1 : List (GL String × S) := [(.inr 1, .base (.inr (.R 1)))]

-- The control passes.
#guard checkAll alias (aliasCert u0 v1)
-- Omitted binding: `u` unbound is `{}`, not `r`.
#guard !checkAll alias [([], ⟨[], [(4, v1)]⟩)]
-- Missing table entry: the empty certificate.
#guard !checkAll alias []
-- Shadowed duplicate binding: the first one counts.
#guard checkAll alias [([], ⟨[], [(3, u0), (3, []), (4, v1)]⟩)]
#guard !checkAll alias [([], ⟨[], [(3, []), (3, u0), (4, v1)]⟩)]
-- Shadowed duplicate entry: the first one counts.
#guard checkAll alias (aliasCert [(.inr 0, R0), (.inr 0, int)] v1)
#guard !checkAll alias (aliasCert [(.inr 0, int), (.inr 0, R0)] v1)
-- An unneeded binding omitted: no change.
#guard checkAll alias [([], ⟨[(7, int)], [(3, u0), (4, v1)]⟩)]
-- Broken: without the clause, the same certificate fails (D2).
#guard !checkAll { alias with D := [] } (aliasCert u0 v1)

/-- `∀ r. r lacks a, b ⇒ ∃ u x. x = { b: { a: Int, ...r } } ∧ u = r`,
checked with fields in either order. (Without `lacks b` the pattern
where `r` holds `b` needs a certificate too, and an empty one fails.) -/
def nested : SigProblem String String :=
  ⟨[], [0], [.lacks 0 "a", .lacks 0 "b"],
   [.eq (.tvar 1) (.record (.cons "b" (.record (.cons "a" (.base "Int")
      .nil) [0]) .nil) []),
    .eq (.record .nil [3]) (.record .nil [0])]⟩

def xVal (inner : List (GL String × S)) : S :=
  .record [(.inl "b", .record inner)]

#guard checkAll nested [([], ⟨[(1, xVal [(.inl "a", int), (.inr 0, R0)])],
  [(3, u0)]⟩)]
-- Reordered fields: the same denotation.
#guard checkAll nested [([], ⟨[(1, xVal [(.inr 0, R0), (.inl "a", int)])],
  [(3, u0)]⟩)]
-- The pattern where `r` holds `b` is real: without `lacks b`, this
-- one-entry table is refused.
#guard !checkAll { nested with D := [.lacks 0 "a"] }
  [([], ⟨[(1, xVal [(.inl "a", int), (.inr 0, R0)])], [(3, u0)]⟩)]
-- Broken: a wrong field type.
#guard !checkAll nested [([], ⟨[(1, xVal [(.inl "a", R0), (.inr 0, R0)])],
  [(3, u0)]⟩)]

/-- `∀ r. r lacks a ⇒ ∃ u w. { a: Int } = { ...u } ∧ w = { ...u, ...r }`:
a duplicate inside `u`'s list is one field. -/
def dupList : SigProblem String String :=
  ⟨[], [0], [.lacks 0 "a"],
   [.eq (.record (.cons "a" (.base "Int") .nil) []) (.record .nil [3]),
    .eq (.record .nil [5]) (.record .nil [3, 0])]⟩

#guard checkAll dupList [([], ⟨[], [(3, [(.inl "a", int), (.inl "a", int)]),
  (5, [(.inl "a", int), (.inr 0, R0)])]⟩)]

/-- `∀ r. ∃ u. { ...u, ...r } = { ...u, ...r }`, at the pattern where `r`
holds `a`: a `u` holding `a` makes the composition overlap, and it is
refused, though duplicates are allowed inside one list. -/
def overlap : SigProblem String String :=
  ⟨[], [0], [],
   [.eq (.record .nil [3, 0]) (.record .nil [3, 0]),
    .eq (.record (.cons "a" (.base "Int") .nil) []) (.record (.cons "a"
      (.base "Int") .nil) [])]⟩

#guard checkAll overlap [([(0, "a")], ⟨[], []⟩), ([], ⟨[], []⟩)]
#guard !checkAll overlap [([(0, "a")], ⟨[], [(3, [(.inl "a", int)])]⟩),
  ([], ⟨[], []⟩)]
#guard (evalS overlap [(0, "a")] ⟨[], [(3, [(.inl "a", int)])]⟩
  (liftT (.record .nil [3, 0]))).isNone

end Composition.Syntax.CheckExamples
