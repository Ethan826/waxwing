# Open-row merge, adopted design: arguments for the solving rules

Status:
Task B0 of docs/plans/2026-10-19-row-merge-implementation-plan.md,
2026-10-19; for the user's review. Only B0 is authorized; nothing here
approves a fixture reclassification, a diagnostic change, a regression
retirement or any later task.

One section per rule of the adopted design (QT-strict + Sym + H, the
plan's §2), written before implementation, by kind (docs/engineering.md,
"Evidence for solvers and diagnostics"): rewrites keep the solutions
(fresh unknowns accounted for); rejections establish that no solution
exists; the one defaulting rule selects a solution that satisfies every
constraint and is the least; iteration terminates. Each argument names
the check that backs it. Commands run from the directory named; outputs
are in each directory's README. Nothing here was run on the compiler.

Sections of docs/plans/2026-10-17-open-row-merge-rules.md that still
hold, unchanged: §0 (semantics, with the addition below), §1 flatten,
§2 common labels, §3 cancelling common tails, §4 a constant with no
unknown opposite, §6 one unknown alone, §7 the bind rule without U3
(steps 2 and 6), §10 decomposition without the binding of a meta apart
from itself, §11 removal's fresh remainder, §11b without the `Outside`
and `Derived` rows, and §12's rollback paragraph. Superseded: §5 (the
sum rule), §8 (homes and commits), §9 (the drain and quiet equations),
§11a, §13's measure, §14 (the `naming` index).

## 0. Semantics

As the earlier file's §0: atoms are labels and rigid row variables; an
assignment gives each unknown a set of atoms; a row denotes its fields,
its rigid tails and its unknowns' atoms, and is well formed when no atom
occurs twice, a label stands beside a rigid only if the hypotheses say
the rigid lacks it, and two rigids stand together only if the
hypotheses say they are disjoint. With field types (research/
row-merge-typed): a row denotes a finite map from labels to types, each
label of an unknown typed by a variable of its own, and two rows are
equal when they have the same labels and equal types at each.
`Merge l r t` holds under an assignment when `l` and `r` are well formed
together and `t` denotes their disjoint union.

## 1. Desugaring a row of several unknowns

**Rule** (plan §2.1). A row made with unknown tails `m1 … mk` (k ≥ 2)
becomes the row with one fresh unknown `t` in their place, with
`Merge m1 m2 t1`, …, `Merge t(k-2) mk t` and each predicate's parts
required disjoint.

**Kind: rewrite.** The written row is well formed only if its tails are
pairwise disjoint (§0), which is what the required facts say. Under any
solution of the original problem, set each `ti` to the union of its
parts: every predicate holds and the new row denotes the old one.
Conversely a solution of the new problem gives `t` the disjoint union of
`m1 … mk` (by induction along the fold), so its restriction to the old
unknowns solves the old problem. The fresh unknowns are determined by
the old ones, so nothing is added or lost. **Checked:** every run of the
prototypes desugars every multi-unknown row (research/row-merge-qt
`QT-strict` variants; research/row-merge-typed `made`, at every depth),
judged by their oracles (S, L, H; G for types): no violation.

## 2. PureScript's cases 1-3

As the re-plan's §13.1 and §14.1 (whose bullets argue the mirrored
cases; the same arguments with the parts in their written roles argue
these). Case 1: `l` closed, so `σ(t) = fields(l) ⊎ σ(r)` exactly when
`t` unifies with `{ fields(l), ...r }` (the row unifier is most general;
field types of labels both rows hold are unified). Case 2: `r` and `t`
closed; every solution needs `r`'s labels in `t` with equal types and
gives `l` the rest, its only value; a label with two types has no
unifier (a contradiction); a label of `r` missing from `t` has no
solution either, but PureScript reports no progress (line 654), kept.
Case 3: `σ(l) = F ⊎ σ(rest)`; with `u` fresh and `Merge rest r u`, `u` is
determined, so the solutions restricted to the old unknowns are kept.
**Checked:** research/row-merge-qt (labels, ground typed domain) and
research/row-merge-typed (unknown field types, nested rows; `node
tr-run.mjs nested 1 2000`, `assoc 1 500`): no S, L, G or H violation;
mutations of case 2's type unification and case 3's rewritten part are
caught (research/row-merge-typed README, "Sensitivity").

## 3. Case 1g: parts with no unknown

**Rule** (qt-strict.mjs `oriented`, its first condition). When neither
part has an unknown tail (each is fields plus zero or more rigid tails),
`t` is unified with `{ fields(l), fields(r), ...tails(l), ...tails(r) }`.

**Prerequisites.** (a) The parts' disjointness `l # r` was required when
the predicate was made (§1) and, on rigids, entailed by the givens: a
label beside a rigid needs the rigid to lack it (otherwise D3''), two
rigids need a `disjoint` clause or an implying row (otherwise D3), a
rigid twice is D3'. (b) No unknown in either part, at the time of the
test, after following bindings.

**Kind: rewrite (an improving substitution).** With no unknown in either
part, `σ(l)` and `σ(r)` are the same for every assignment: the fixed
atoms of each. Their disjoint union is defined by (a), and it is what
the symbolic row denotes; the row is well formed by (a). So every
solution gives `t` that value, and unifying `t` with the row keeps every
solution (Jones 1995 §4: an improving substitution leaves the
satisfiable instances unchanged; the dependency left right -> union of
Environment.hs lines 525-527 says the same). Associativity and
commutativity of disjoint union make the result independent of which
part is written first and of how three or more parts were grouped.

**Correspondence with PureScript.** PureScript has no symbolic union: a
wanted `Union r s t` over rigid `r`, `s` is solved only by matching a
given `Union r s rs` from the signature through left right -> union
(Entailment.hs `matches`, lines 275, 735-750), which binds `t := rs`.
The two operations agree exactly where a given exists for the same
parts, in the same orientation and grouping, after case 3 has moved the
known labels; there the given's result variable is, written in
Waxwing's notation, the row `{ ...r, ...s }`. Elsewhere 1g is broader:
the parts swapped, another grouping, or disjointness entailed by a
`where` clause or an implying row with no `Union` given. Checked against
the installed purs 0.15.16 (research/purs-given-1g, `node run.mjs`, 6
cases; expectations written before the run, all held) and through the
adopted configuration (research/row-merge-qt, `node qt-given.mjs`, 7
cases):

| Program | purs | 1g |
|---|---|---|
| `merge a b` under `Union r s rs` | accept | accept |
| `merge b a` under it | NoInstanceFound | accept |
| `merge a b`, no given (Waxwing: `where r disjoint s`) | NoInstanceFound | accept; without the clause D3 |
| `merge (ext "a" a) b` under the given | accept | accept |
| `merge (merge a b) c` under `Union r s rs`, `Union rs u rsu` | accept | accept |
| `merge a (merge b c)` under them | NoInstanceFound | accept |

**Classification: adapted** (not "as published" as the plan's first
draft had it): it agrees with given matching where a given exists and
otherwise rests on the argument above. **Narrowing it** to where a given
would match (the parts joined, in that orientation and grouping, by a
row the signature writes) would reject the swapped and regrouped
programs and every merge inside a function whose signature states only
`r disjoint s`; no annotation can repair those (rigid parts cannot be
annotated further), so the programmer would have to restructure the
signature. The plan recommends the broad form, for the user's decision
(plan §10).

## 4. Sym

As the re-plan's §14.1. Prerequisites (the user's boundaries): the
parts were required disjoint when the predicate was made (every maker
does: §1 and Task 7's literal); a part is closed only when it has no
tail at all, so a rigid tail makes it open; field types are unified,
never compared or dropped; rigid tails are never bound, split or
subtracted. **Checked:** `mirrorDiff` 0 for +Sym on every family of
research/row-merge-qt and research/row-merge-typed (where unknown field
types and nested rows are included); the mutation "case 1 firing for a
part with no fields" (closed tested by fields, not tails) is caught.

## 5. Re-examination and termination

A full rescan applies §2-§4 to every waiting predicate until a pass
changes nothing. **Termination, argued for acyclic predicates.** Order
predicates by "above": `P'` is above `P` when `P`'s result unknown
occurs in a part of `P'`. When this relation is acyclic, give each
predicate its height (the longest chain above it) and take the measure
(number of waiting predicates, Σ over labels in parts of the height of
their predicate). Cases 1, 2, 1g and their mirrors remove a predicate
(the first component falls; bindings they make may add labels to other
parts, which the lexicographic order allows); case 3 and 3' move at
least one label from a part of `P` into `P`'s result, which appears only
in parts of predicates above `P` (smaller height), so the second
component falls; the unifier terminates as ADR 013's. **Not argued:** a
cyclic "above" relation (a result unknown reaching, through bindings, a
part of a predicate below it); no argument here excludes it. **Checked:**
every run of every family above terminated; B3 adds a step counter with
a stated bound, and a run reaching it is a `Stop Limit`, never a verdict.

## 6. The end of a body

**Defaulting** (one rule, kind: selection). When no predicate waits,
every unbound unknown carries at most lacks facts and pairs (including a
pair of an unknown with itself, §8), all met by `{}`, so the all-`{}`
completion satisfies every remaining constraint; bindings were most
general and every image is monotone in the free unknowns, so it is the
least solution (the earlier file's §12 argument, unchanged). No unknown
a waiting predicate mentions is defaulted: a waiting predicate makes the
body Unresolved or (by H) a Contradiction. **Checked:** S and L on every
accepted run of every family, labels and types.

## 7. H: classification only

**Rule** (re-plan §14.2). Only when solving and permitted defaulting
end Unresolved: for each waiting predicate, cancel equal atoms between
`l ⊎ r` and `t`; a constant left on one side that every unknown of the
other side cannot hold (re-plan §11.1, `cannotHold`) makes the body a
Contradiction. **Kind: rejection.** Argument as §14.2: the constant must
lie in some unknown of the other side in any solution; none can. It
reads the final state and writes nothing, so acceptance and types are
those without H by construction. **Checked:** `baseDiff` 0, no new
Contradiction with a solution, on research/row-merge-qt's families and
research/row-merge-typed's; H ignoring lacks is caught (1,352
Contradictions with solutions).

**Location (proposed; replaces the plan's first draft).** The first
draft's "the latest site at which a fact or binding arrived" depends on
the order of processing. Proposed instead, from provenance only: each
fact that rules the constant out of a part keeps its reason by the
approved precedence (`prefer`: kind, then source position, so the
reason kept does not depend on arrival order) and, as metadata, the
source span of the use whose seeding stated it. The primary location is
the latest of those spans in source order; when no such fact has a
written reason (every one was made while solving), the predicate's own
site. Notes: `required here` at the predicate's site, `excluded here`
at each reason's written span in source order. On `diag-14` this gives
the approved location: the excluding facts are `noX`'s two clauses,
seeded at the use `noX` (prototype: steps 2 and 3, location 3, notes 2
and 3, predicate site 1, the `merge`). **Checked** in the prototype as a
model (no text is rendered there): `node qt-render.mjs render 2000`
gives one modelled H diagnostic per problem across orders in every
family (fixtures 1, raw 10, dense 81, shapes 45 problems with H).

## 8. A meta apart from itself (N5 removed)

`m # m` is stored as a pair, as any pair. It is the fact itself, so no
solution changes; `{}` meets it at the end, and a label later bound into
`m` meets the pair when the bind rule re-requires it on the image (an
overlap, D2). **Checked:** the prototypes run with `selfApart: false`.

## 9. What R10.2 protected, and case 2's empty bindings

R10.2 kept the fact that pruned an upper bound to `{}` so that a later
failure at that meta read as the fact (D1, D2), never `Expected {},
found …`. Bound-driven emptying goes with the bounds. Emptying does not
go entirely: case 2 binds the left part to `{}` when the right part and
the result have the same labels. **Measured** (`node qt-render.mjs
case2 2000`): case 2 empties a meta in 8 of 10,000 raw runs and 9 of
4,000 shape runs; 3 shape runs then fail at a mismatch whose rows reach
such a meta, and in each of those problems another order fails
differently (problems 1558 and 1810 with a fact: `not entailed` or
`overlap`). **Finding.** Ordinary case bindings still need protection:
without the predicate kept as the binding's cause, those runs would read
`Expected {}, found …`. R10.1 as modified (bindings a case made keep
their predicate, plan G-2) covers them with D6. Whether a written fact
that also excludes the label should be preferred (D1 over D6, R10.2's
principle) is a rendering question for the user; R10.2 is not retired
here (plan §10).

## 10. Unknown field types, nested rows and association

research/row-merge-typed's oracle is complete for its problems: for
fixed label sets the type constraints are first-order equations, which
have a solution exactly when they unify (Robinson), with the unifier as
the most general typing; labels the problem never names can be dropped.
Measured (README there): `nested` seeds 1 and 2, 2,000 problems each
(about 1,300 with a type unknown in a field, about 220 with a merge
inside a field), every order and the mirror: +Sym+H no violation, no
`acceptDiff`, `kindDiff` or `mirrorDiff`. `assoc` seeds 1 and 2, 500
problems each, twelve programs per problem (both groupings, every
argument order), two orders each: +Sym+H no `acceptDiff` or `kindDiff`
(QT-strict alone: 50 and 68 `acceptDiff`). In research/row-merge-qt,
the ten fixtures with three unknown tails give one outcome over every
tail order and step order (`node qt-adopted.mjs three`).

**Not checked:** rigid tails together with unknown field types or nested
rows; more than one level of nesting; more than two labels in nested
rows or three in `assoc`; effects. Association is measured, not argued
beyond §3's remark for 1g.

## 11. Ledger (the plan's §6), status after B0

| # | Claim | Status |
|---|---|---|
| M1 | each case keeps solutions | argued (§2-§4); checked, labels and types |
| M2 | desugaring keeps solutions | argued (§1); checked |
| M3 | re-examination terminates | argued for acyclic predicates (§5); the cyclic case not argued; every run terminated |
| M4 | Solved is a solution, the least | argued (§6); S, L, G checked |
| M5 | Contradiction has no solution | argued (§2, §7); H checked |
| M6 | Unresolved with 0, 1, several | `odd-cycle` 0, `determinate` 1, `diag-01` 4 under the adopted configuration (`node qt-fixtures.mjs programs`) |
| M7 | H changes no acceptance or type | by construction; `baseDiff` 0 |
| M8 | order independence | measured, not proved |
| M9 | swapped arguments change nothing | measured (`mirrorDiff` 0) |
| M10 | association changes nothing | measured (§10); argued for 1g only |
| M11 | unknown field types | checked (§10) without rigid tails |
| M12 | nested predicates | checked one level deep (§10); sites and paths are the compiler's (B3) |
| M13 | rollback, joint fixpoint | argued (plan §2.9); compiler tests B3 |
| M14 | rows ground after specialization | argued; Task 8 |
| M15 | one unknown tail per row | argued (plan §2.1); guard in B3 |
| M16 | §5's annotations, narrowing | checked (`node qt-adopted.mjs examples`) |
| M17 | 1g agrees with given matching where a given exists, and is broader | checked against purs (§3) |
| M18 | the proposed H location and R11 choice are order independent | modelled and measured (`node qt-render.mjs render`, `node qt-adopted.mjs report`) |
