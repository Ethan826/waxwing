# Typed and nested rows: the adopted configuration against an oracle

Evidence for docs/plans/2026-10-19-row-merge-implementation-plan.md
(Task B0): what research/row-merge-qt cannot show, since its rows are
labels. Here a field has a type (`Int`, `Bool`, a type unknown, or a
record whose row may itself have unknown tails), so the checks cover
type variables in fields, records in merged fields and merges of
records that contain merges. JavaScript, written for this purpose,
sharing no code with the compiler or with research/row-merge-qt. Needs
only `node`. Not part of `npm run verify`; scripts/width.mjs checks the
80 columns; the 250-line limit holds by review.

## Files

| File | What it is |
|---|---|
| tr-solver.mjs | rows, types, unification (types structurally, rows by ADR 013's one-unknown rules after cancellation), occurs checks, lacks and pairs with the bind rule (no N5), and `made`: a written row with two or more unknown tails becomes one unknown and `Merge` predicates folded from the left, at every depth |
| tr-cases.mjs | PureScript 0.15.16's three `unionRows` cases, Sym's mirror (option `sym`), the full rescan, H at the end (option `hEnd`), and the read-back the oracle checks (written apart from the solver's flatten) |
| tr-oracle.mjs | the oracle: every assignment of label sets to the unknowns (subsets of the problem's labels), each field of an unknown typed by its own variable, the type equations solved by first-order unification with an occurs check; least solutions and most general typings |
| tr-run.mjs | the families `nested` and `assoc`, judged per variant (QT-strict, +Sym, +H, +Sym+H) |

No rigid tails: they stay covered by research/row-merge-qt's
labels-only domains, the typed domain qt-typed.mjs (ground types) and
the compiler tests the plan lists.

## Why the oracle's type part is complete

For fixed label sets the problem is a set of equations between
first-order terms (`Int`, `Bool`, `Rec:<labels>(…)`, variables). Such a
set has a solution exactly when it has a most general unifier
(Robinson), so the oracle decides satisfiability per assignment of
label sets, and the unifier is the most general typing for those sets.
A label the problem never names can be removed from every unknown of a
solution and leaves a solution, so subsets of the problem's labels
suffice. An accepted run is checked by reading back its label sets and
types: the sets must be the least solution's, and the types must equal
that solution's unifier up to renaming of variables (`G`).

## Commands and output (2026-10-19, node v26.6.0)

Each exits 0; no `S/L-violated`, `G-violated`, `H-violated`,
`H:newWithSolution` or `baseDiff` key for any variant.

| Command | Output (abridged) |
|---|---|
| `node tr-run.mjs nested 1 2000` | oracle: 856 without solution, 1,051 with a least one, 93 with solutions but no least; 1,319 with a type unknown in a field, 216 with a merge inside a field. Accepted runs QT-strict 5,204, +Sym 5,792, +H 5,204, +Sym+H 5,792; `mirrorDiff` 129, 0, 90, 0; no `acceptDiff` or `kindDiff`; `H:new` 314 (+H), 64 (+Sym+H) |
| `node tr-run.mjs nested 2 2000` | the same pattern: accepted 4,894 / 5,334; `mirrorDiff` 131, 0, 88, 0; no `acceptDiff` or `kindDiff` |
| `node tr-run.mjs assoc 1 500` | 12 programs per problem (both associations, every argument order), two orders each: +Sym and +Sym+H no `acceptDiff` or `kindDiff`; QT-strict `acceptDiff` 50, `kindDiff` 20. Accepted runs +Sym+H 1,872 of 12,000; oracle: 355 problems with a least solution, 119 with solutions but no least, 26 none |
| `node tr-run.mjs assoc 2 500` | +Sym+H no `acceptDiff` or `kindDiff`; QT-strict `acceptDiff` 68, `kindDiff` 20 |

Half of the `nested` problems plant a solution (rows rewritten by
expanding unknowns into their planted fields, types written as type
unknowns at random); the other half are random and mostly have none.

## Sensitivity

Run 2026-10-19 in a deleted scratch copy, one mutation at a time:

| Mutation | Caught |
|---|---|
| case 2 without unifying the subtracted labels' types | `nested`: `G-violated` 20 (+Sym+H), exit 1 (`assoc` did not catch it) |
| case 3 rewriting the other part | `H-violated` 69 (+Sym+H), `acceptDiff`, exit 1 in both families |
| H ignoring lacks | `H:newWithSolution` 1,352 (+Sym+H), exit 1 in both |
| the read-back skipping nested bindings | `S/L-violated` 1,874 (+Sym+H), exit 1 in both |
| case 1 firing when the left part has no fields (instead of no tail) | `H-violated` 702, `S/L-violated` 453, exit 1 in both |

## What the evidence does not show

Labels a, b (a, b, c in `assoc`), at most two type unknowns and one
level of nesting; no rigid tails, no effects, no texts; synthetic
generators. Order independence and association independence are
measured on these families, not proved.
