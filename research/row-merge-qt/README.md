# Row merge on qualified types: a labels-only prototype

Evidence for docs/plans/2026-10-18-row-merge-qualified-types.md (R005
Tranche B re-planned under ADR 014). A toy like research/open-row-merge
and research/row-merge-alternatives, whose oracle, generators and
solvers it imports: JavaScript, labels only (field types ignored),
nothing from output/, nothing built. Needs only `node` (ES modules). Run
from this directory. Not part of `npm run verify`; scripts/width.mjs
checks the 80 columns; the 250-line limit holds by review.

## What it implements

Qualified types with row predicates, solved by improvement only when
determined (the design's §3):

- facts: lacks and disjointness on metas, decomposed over known parts,
  re-required when a meta is bound; facts on rigids must be entailed by
  the hypotheses (the signature's givens);
- ADR 013's one-tail unification after cancelling common labels and
  tails, rigid tails treated as constants;
- `Merge`: an equation the one-tail rules cannot solve waits as a
  predicate, re-examined after every step (full rescan), with pairwise
  improvement by the dependencies (`r s -> t`, `r t -> s`);
- the end of a body: every unbound meta defaults to `{}`, accepted only
  if every waiting predicate then holds; otherwise Unresolved (D4).

Variants (qt-compare.mjs `VARIANTS`): `QT`, PureScript's strict form
(at most one meta tail per row; `{ ...?r, ...?s }` becomes a fresh `?t`
with `Merge ?r ?s ?t`, opaque until determined); `QS`, the forward
dependency applied symbolically (rows keep several tails), the proposed
core; suffixes `E` (an empty union empties its parts), `H` (a constant
every part excludes is a contradiction) and `C` (a constant with one
non-excluding part is committed there): the design's §3.6 items N2-N4,
flagged, not standard. `C` (the current design), `A` and `AH` are the
alternatives assessment's prototypes, run beside them.

## Files

| File | What it is |
|---|---|
| qt-facts.mjs | state, flatten, facts and entailment, the bind rule, the one-tail unifier |
| qt-preds.mjs | mode `strict` (QT): desugaring into `Merge r s t`, forward/backward improvement, pairwise dependencies, options |
| qt-sym.mjs | mode `sym` (QS): waiting predicates, re-examination, pairwise dependencies, options, the end default |
| qt-drive.mjs | `verdictQT(hyp, steps, opts)`: creation-site obligations, a step, improvement after each step, the end |
| qt-compare.mjs | raw, dense and program-shaped problems and review F2's family through C, A, AH and the QT/QS variants, judged by the brute-force oracle |
| qt-fixtures.mjs | the 72 fixtures (test/fixtures/r005b) and the 19 programs through every variant; exit 1 on an oracle violation |
| qt-programs.mjs | the 19 programs by fixture, program 16 (`same`) and the zero-solution bucket problem written out |

## Commands and output (run 2026-10-18, node v26.6.0)

| Command | Output (abridged) |
|---|---|
| `node qt-fixtures.mjs fixtures` | `72 fixtures with rows`; QS, QS-EH: `S>U` design-forced-bound, diag-14-fix; QS `C>U` diag-14 (QS-EH keeps it C); every QT/QS variant `U>C` odd-cycle; `violations 0`, exit 0; about 3 s |
| `node qt-fixtures.mjs programs` | one line per program variant (the design's §4.1 table); #16 `same` C under QT and QS (U under A, AH); `U0 zero (new)` U with 0 solutions, `U1 determinate` U with 1, `U4 diag-01` U with 4, under every variant; `violations 0`, exit 0 |
| `node qt-compare.mjs f2` | C accept 186, D4 206; every QT/QS variant D4 392 (`accept>D4` 186) |
| `node qt-compare.mjs raw 21 2000` | C accept 2010, refuse 7655, D4 335; QT `accept>D4` 170; QS 55; QS-EH 45, `refuse>D4` 25; QS-EHC 5, 0 |
| `node qt-compare.mjs raw <s> 4000`, s = 22, 23, 24 | QS-EH `accept>D4` 84, 92, 141; `refuse>D4` 15, 45, 35; `orderDiff` 2, 1, 1 |
| `node qt-compare.mjs dense 21 2000` and `dense <s> 4000`, s = 22-24 | QS-EH `accept>D4` 1325, 2475, 2370, 2555; `D4>accept` 25, 45, 40, 25 (C unresolved, QS-EH accepts the least solution) |
| `node qt-compare.mjs shaped 1 2000`, `shaped 2 4000`, each also with `SHARE=1` | QS-EH: no `accept>D4`; `refuse>D4` 10 and 14 (with SHARE 0 and 4); `orderDiff` 0 |

No run of any variant shows an `S-violated`, `L-violated` or
`H-violated` key: an accepted assignment always satisfied every
constraint and was the least solution, and no refusal had a solution.
The design's §4.3 has the totals per generator.

## Sensitivity

Run 2026-10-18 in a deleted scratch copy (raw seed 21, 1,000 problems,
and the 72 fixtures), one mutation at a time, each restored after:

| Mutation | Caught |
|---|---|
| the end accepts every waiting predicate | `S-violated` and `L-violated` 230 and 245 (QS and QS-EH, one each); fixtures: 2,304 violations |
| `r t -> s` without its equal-other-sides test | `H-violated` 5; fixtures: 1,200 violations |
| `r s -> t` without its same-parts test | `H-violated` 21 and 6 (one each); fixtures: 1,484 violations |
| creation-site obligations dropped in mode `sym` | `S-violated`, `L-violated` 29 each; fixtures: none (they write their obligations as steps) |
| the end default ignores predicates with constants on one side | `S-violated`, `L-violated` 105 each; fixtures: 1,224 violations |

One mutation (the same-parts rule unifying with its own parts' side)
was caught by neither, so it is not listed as a check.

## What the evidence does not show

Labels only: no field types (so no nested predicates), no effect rows
(so no rollback or joint fixpoint), no texts. The prototype is a toy
written for the re-plan, not a port of the compiler. Its order
differences are counted, not analysed. One defect was found and fixed
while writing it: the first `r s -> t` rule replaced two predicates by
an equation that could itself only wait, which looped (raw seed 24
never finished); every number above is from the fixed revision.
