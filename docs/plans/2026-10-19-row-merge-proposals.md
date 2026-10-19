# Open-row merge, adopted design: proposals for the user (Task B0)

Status:
Proposals only, 2026-10-19. Nothing here is applied: no fixture, text,
regression row or source changed. Each item waits on the user's
decision (docs/plans/2026-10-19-row-merge-implementation-plan.md §10).

Every program below defines

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
```

Classes are the adopted configuration's in every order
(research/row-merge-qt, `node qt-adopted.mjs controls` and
`examples`). Texts marked **approved** are forms the user approved on
2026-10-17; texts marked **proposed** are new.

## 1. Fixture reclassifications

| Fixture | Source (after `merge`) | Now | Proposed | Diagnostic |
|---|---|---|---|---|
| `design-forced-bound` | `fn both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int }): Int = 0;` `fn main(): Int = both(merge, merge);` | Solved, output `0` | Unresolved | **approved** D4 `Cannot tell whether merge's r or s has field x; pass a lambda with annotated parameters in place of merge` at the first `merge`; notes `r and s are written here` at merge's result type, `{ x: Int } is required here` at both's first parameter type |
| `diag-14-fix` | `fn apply(f: (a, b) -> { x: Int, y: Int }, g: (a, b) -> Int): Int = 0;` `fn noX(p: { ...u }, q: { ...v }): Int where u lacks { y }, v lacks { x } = 0;` `fn main(): Int = apply(merge, noX);` | Solved | Unresolved | **proposed** D4 (§2.2) at `merge`; notes `r and s are written here`, `{ x: Int, y: Int } is required here` at apply's parameter type |
| `design-quiet` | `fn apply0(f: (a, b) -> c, g: (d, e) -> c): Int = 0;` `fn main(): Int = apply0(merge, merge);` | Solved | Unresolved | **proposed** D4 (§2.1) at the first `merge`; note `r and s are written here` |
| `same` (new) | `fn same(f: (p, q) -> { x: Int }, g: (p, q) -> { y: Int }): Int = 0;` `fn main(): Int = same(merge, merge);` | — (the earlier design: Contradiction) | Unresolved, 0 solutions | **approved** D4 form, field `x`, at the first `merge` |

Annotated variants, each Solved with output `0` (accepted in every
order; the annotation is the smallest, `node qt-adopted.mjs examples`):

| New fixture | `main` | Narrows? |
|---|---|---|
| `design-forced-bound-annotated` | `both(fn(p: {}, q) => merge(p, q), merge)` | no |
| `diag-14-fix-annotated` | `apply(fn(p: { x: Int }, q) => merge(p, q), noX)` | no |
| `design-quiet-annotated` | `apply0(fn(p: {}, q) => merge(p, q), fn(p: {}, q) => merge(p, q))` | yes: 3 of 5 typings excluded |

The research controls (research/row-merge-qt/fixtures/order-*.json and
research/purs-row-experiment/cases/) gain the adopted configuration's
expected outcomes: order-22-*, -23-*, -24-* Unresolved; order-A-* and
order-S-shapes-1910 Contradiction; domain-b-1, -17, -9 Unresolved;
domain-b-3, -7 Contradiction; each in every order.

## 2. D4 texts and the choice of predicate

1. **A waiting predicate with no field** (S1, S3; `design-quiet`):
   `Cannot tell what merge's r and s hold; pass a lambda with annotated
   parameters in place of merge`.
2. **Every field has one candidate part** (program 12, `diag-14-fix`):
   `Cannot tell how merge's r and s split { x: Int, y: Int }; pass a
   lambda with annotated parameters in place of merge`.
3. **R11** (which predicate a body reports): the earliest-site
   predicate with a field two of its parts may hold; if none has one,
   the earliest predicate. Needed for `determinate`'s approved text: its
   earliest waiting predicate has no field, and the approved text names
   field `a` at the second `merge`. Modelled, order independent (`node
   qt-adopted.mjs report`: `determinate` site 9, field `a`; Q1 site 4,
   field `b`; `odd-cycle`, `diag-01`, program 11 site 1, field `x`).

## 3. H's location

Each fact that rules the field out of a part keeps its reason by the
approved precedence and, as metadata, the span of the use whose seeding
stated it. Primary: the latest of those spans in source order; if no
such fact has a written reason, the predicate's site. Notes: `required
here` at the predicate's site, `excluded here` at each reason's span in
source order. `diag-14` keeps its approved location (`noX`) and notes.

## 4. R10.2 and R10.1

Extend R10.1 to bindings case 2 makes (the left part bound to `{}`):
they keep their predicate, so a later failure there reads as D6, not
`Expected {}, found …`. Open for the user: where a written fact also
excludes the label, prefer the fact's own text (R10.2's principle) or
D6 (rules file §9).

## 5. Case 1g

(Approved broad, 2026-10-19; plan §10.)

Keep 1g as measured (parts with no unknown give their symbolic union,
whenever their disjointness is entailed), named in the README as an
adapted rule, with research/purs-given-1g as the record of where it
agrees with and goes beyond PureScript (rules file §3).

## 6. Regression rows

As the plan's §8: retire `r005b-pruned-reason`; drop the planned
`r005b-upper` and `r005b-bound-reason`; reword `-defer`, `-quiet`,
`-pending-dedup`, `-pending-end`, `-drain-text`, `-drained-reason`; add
`-sym`, `-sym-rigid`, `-h-exclusion`, `-h-binds`, `-one-unknown`,
`-self-pair`, and (proposed by B0) `r005b-case2-reason`: a binding case
2 made loses its predicate, probe the shape of problem 1558 of `node
qt-render.mjs case2` written as a Waxwing program in B3.
