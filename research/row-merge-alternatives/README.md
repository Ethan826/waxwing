# Row-merge alternatives: prototypes and a Z3 oracle

Evidence for docs/plans/2026-10-18-row-merge-alternatives.md (the
assessment of whether R005 Tranche B's custom solver is worth its cost).
Toys, like research/open-row-merge, which they import: JavaScript,
labels only (field types ignored), nothing from output/, nothing built.
They need only `node` (ES modules), except z3-oracle.mjs, which needs a
Z3 module installed outside the repository (below). Run from this
directory. Not part of `npm run verify`; scripts/width.mjs checks the
80 columns; the 250-line limit holds by review.

## Files

| File | What it is |
|---|---|
| alt-solver.mjs | alternative A: facts and bind rule as Tasks 1-3, one-tail rules after cancellation, everything else waits; modes `defer` (A), `eager` (A0); options `noHome`, `commit` (variant AH) |
| alt-drive.mjs | drives A on steps like ../open-row-merge/drive.mjs; the end default (unsolved metas `{}`) checked against each waiting equation |
| gen.mjs | perm.mjs's raw and dense generators, same draws per seed |
| compare.mjs | raw or dense problems, five orders, current design vs A, A0, A-nohome, AH, judged by the brute-force oracle |
| compare-programs.mjs | program-shaped merge trees (programs-gen.mjs) and review F2's 392 `k(merge, ..., merge)` programs |
| fixtures-compare.mjs | the 72 executable fixtures (test/fixtures/r005b) through the current design, A, A0 and AH |
| z3-encode.mjs | the problems as Z3 formulas, from the oracle's stated meaning |
| z3-oracle.mjs | Z3 against the brute force (satisfiable, solution set, least solution) and Z3 against both solvers' claims |

## Commands and output (run 2026-10-18, node v26.6.0)

| Command | Output (abridged) |
|---|---|
| `node fixtures-compare.mjs` | `72 fixtures with rows`; `A Solved>Unresolved (2): design-forced-bound, diag-14-fix`; `AH Solved>Unresolved (1): design-forced-bound`; A0 order-dependent on 19 Solved and 10 Contradiction fixtures; about 2 s |
| `node compare.mjs 21 2000` | current accept 2010, refuse 7655, D4 335 (as ../open-row-merge's perm.mjs); A accept 1965, refuse 7620, D4 415 (`accept>D4` 45, `refuse>D4` 35); AH `accept>D4` 5, `refuse>D4` 10; A0 `orderDiff` 293; no `S-`, `L-` or `H-violated` key for any variant |
| `node compare.mjs 21 2000 dense` | current accept 2900, refuse 3090, D4 4010; A `accept>D4` 1335, `refuse>D4` 1605; AH 725, 975; no violation |
| `node compare.mjs <s> 4000`, s = 22, 23, 24 | no violation; A `accept>D4` 84, 92, 141 of 3990, 4315, 3940 accepts, `orderDiff` 2, 1, 1; AH `accept>D4` 15, 5, 30, `orderDiff` 0; current `orderDiff` 0 |
| `node compare.mjs <s> 4000 dense`, s = 22, 23, 24 | no violation; A `accept>D4` 2485, 2380, 2585 of 5610, 5635, 5750; AH 1365, 1255, 1335; `orderDiff` 0 for A, AH and current |
| `node compare-programs.mjs shaped 1 2000` | current accept 1782, refuse 2104, D4 114; A and AH accept 1782 (no `accept>D4`), `refuse>D4` 18; `orderDiff` 0 (two orders per problem); A0 `orderDiff` 485, `accept>D4` 47; no violation |
| `SHARE=1 node compare-programs.mjs shaped 1 2000` | A and AH `refuse>D4` 4, no `accept>D4`, `orderDiff` 0 |
| `node compare-programs.mjs shaped 2 4000` (and `SHARE=1`) | A and AH no `accept>D4`; `refuse>D4` 23 (10); `orderDiff` 1 (0) |
| `node compare-programs.mjs f2` | current accept 186, D4 206; A, A0 and AH accept 0: `accept>D4` 186 |

Each A variant accepted only problems the current design accepts and
refused only problems it refuses, on every run above: its losses are
moves to Unresolved. (An earlier revision of alt-solver.mjs lacked the
rule "metas against nothing are all {}"; it lost more and showed more
order differences. All numbers here are from the committed revision.)

## Z3

Not a dependency. Installed for this assessment in a scratch directory
outside the repository (`npm install --ignore-scripts z3-solver` in an
empty directory): z3-solver 5.3.1 from npm (integrity
`sha512-xndynBQo…`, Z3 `5.3.1.0 ac9156f9…`), with async-mutex 0.3.2 and
tslib 2.8.1; a 34.6 MB WebAssembly build. Pass its entry point:

```sh
export Z3_MODULE=<scratch>/node_modules/z3-solver/build/node.js
node z3-oracle.mjs fixtures      # 72 fixtures, two orders each
node z3-oracle.mjs raw 21 1000   # five orders each
node z3-oracle.mjs dense 21 1000
```

| Run | Problems | Time | Result |
|---|---|---|---|
| fixtures | 72 | 2.6 s | no `DIFF-*` or `Z3-REJECTS-*` key; Z3 counts odd-cycle 0, determinate 1, diag-01 4 solutions |
| raw, seed 21 | 1,000 | 34.7 s | none; 51 problems over the 64-solution enumeration cap (count compared only below it) |
| dense, seed 21 | 1,000 | 70.1 s | none; 64 over the cap |

`DIFF-*` keys are disagreements between Z3 and the brute force
(satisfiability, solution set, least solution); `Z3-REJECTS-*` keys are
claims of the current prototype or of A that Z3 contradicts (an
accepted assignment that is not a solution or not the least; a refusal
of a satisfiable problem). The first run reported `DIFF-solutions` 44
and `DIFF-least` 5 on raw: a bug in the cross-check's own key (atom
lists compared unsorted), fixed before the runs above.

**Sensitivity** (2026-10-18, in a deleted scratch copy, raw seed 21,
300 problems): dropping the at-most-once count gave `DIFF-sat` 8,
`DIFF-count` 41, `DIFF-least` 9; dropping the rigid-beside-label rule
gave `DIFF-count` 15 and `Z3-REJECTS-current-refuse` 5; dropping the
`lacks` constraint gave `DIFF-count` 21; making A accept every waiting
equation gave `Z3-REJECTS-A-solution` 75 (and compare.mjs `S-violated`
75).

## What the evidence does not show

Labels only: no field types, so no nested equations; no effect rows, so
no rollback or joint fixpoint; no texts. A is a toy written for this
assessment, not ported from the compiler, and its order differences
(above) are not analysed beyond the examples in the assessment.
