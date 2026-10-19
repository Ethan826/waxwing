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

Variants (qt-compare.mjs `VARIANTS`): `QT`, PureScript's strict form (at
most one meta tail per row; `{ ...?r, ...?s }` becomes a fresh `?t` with
`Merge ?r ?s ?t`, opaque until determined); `QS`, the forward dependency
applied symbolically (rows keep several tails), the proposed core;
suffixes `E` (an empty union empties its parts), `H` (a constant no part
can hold is a contradiction), `Z` (a meta of one side that can hold
nothing of the other side is `{}`; subsumes E) and `C` (a constant with
one possible part is committed there): the design's §3.6 items N2-N4 and
N6, locally introduced, flagged, not approved. "Can hold" uses
entailment (qt-facts.mjs `cannotHold`; option `plain` restores the
pre-follow-up test, for the fixtures that pin it). `C` (the current
design), `A` and `AH` are the alternatives assessment's prototypes, run
beside them.

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
| qt-strict.mjs | QT-strict (design §13): PureScript 0.15.16's three `unionRows` cases, entailment by the signature's rows, no pairwise improvement (option `pairwise` for QT-strict+P), no N5/E/H/Z, and no default for what a waiting predicate constrains |
| qt-adapt.mjs | QT-strict, +Sym, +H, +Sym+H and QS-EHZ beside the current design on the generators and F2: verdicts, oracle checks, `acceptDiff`, `kindDiff`, `mirrorDiff`, and for +H `baseDiff`, `H:new`, `H:newWithSolution` (design §14) |
| qt-typed.mjs | a typed domain (fields `a:Int`, `a:Bool`, `b:Int`, labels unique by name) with its own brute-force oracle; every problem of two equations, both orders and the mirror, through the QT-strict variants |
| qt-checks2.mjs | `sym` (typed swapped-input programs), `generality` (does each annotation narrow the solutions or is it redundant), `kinds` (QT-strict's verdict-kind fixture under each variant) |
| qt-examples.mjs | Q1 and Q2: Waxwing programs QT rejects and QS accepts, with QT's smallest annotation (design §11.3) |
| qt-checks.mjs | committed checks: `order` (the order fixtures), `annotations`, `f2`, `stage4`, `strict` (QT-strict's examples and its agreement with the installed purs) |
| qt-domains.mjs | every problem of research/open-row-merge's exhaustive domains A and B in every order, QT, QS-EH and QS-EHZ against the oracle; exit 1 on a violation or a QS-EHZ order difference |
| qt-trace.mjs | the adopted configuration (`QT-strict+Sym+H`) driven with each step's written position, the provenance of facts and the metas case 2 empties (through the `st.trace` hooks in qt-facts.mjs and qt-strict.mjs, which only record) |
| qt-render.mjs | `render`: the diagnostic the rules select, modelled from provenance, compared across orders apart from the verdict kind; `case2`: case 2's empty bindings and the failures that meet them |
| qt-adopted.mjs | `examples`, `three`, `controls`, `report`: the implementation plan's figures for the adopted configuration |
| qt-given.mjs | case 1g on the six programs of research/purs-given-1g |
| qt-termination.mjs | the adopted configuration with a trace of every case-3 move and rescan pass (hooks `rescan`, `pass`, `moved`, which only record): lineage disjointness, productive passes, cyclic "above" graphs, edge changes and the B0 height measure (as written and shifted by one); the research families (ledger L1) |
| qt-cyclic.mjs | L1's checks: named cyclic examples, a cyclic family judged by the oracle, and qt-termination.mjs's families; exit 1 on a violation |
| qt-2g.mjs | the proposed case 2g (option `g2` of qt-strict.mjs, NOT adopted; docs/plans/2026-10-19-row-merge-limitations.md) beside the adopted configuration: oracle checks of the 2g variant, order and mirror differences, every verdict change |
| qt-locate.mjs | L2: refusals met while solving whose modelled diagnostic depends on the order, split by conflict (the minimal unsatisfiable subsets the oracle finds in each order's failing prefix), and the `latest` location rule's residuals |
| fixtures/order-*.json | six order-dependent problems (four raw, two from domain A): rows, every permutation, recorded outcomes of the configuration without and with the repair; and order-S-shapes-1910, a QT-strict difference of verdict class only (Contradiction against Unresolved) |

## Commands and output

Rerun from the committed tree on 2026-10-18 (node v26.6.0, branch
`qt-evidence`); each exits 0. The design's §4.3 records the first run,
before the follow-up; §11 records these.

| Command | Output (abridged) |
|---|---|
| `node qt-checks.mjs order` | 18 `ok` lines: each of the six fixtures reproduces its recorded outcomes; QS-EHZ one outcome in every order; the variant without the repair (QS-EH, or QS-EHZ with `plain`) still order-dependent |
| `node qt-checks.mjs annotations` | 11 `ok`: program 11's and 12's annotations accepted; Q1, Q2 D4 under QT and accepted by QS-EHZ in every order; QT with `fn(p: {}, …)` accepted, solution the least |
| `node qt-checks.mjs f2` | `ok   F2: 186 with a least solution; accepted plain 0; with the shared parameter annotated, QS-EHZ + QT 372` |
| `node qt-checks.mjs stage4` | `ok   stage 4: 25 fixtures, waiting in 0 (none)` |
| `node qt-fixtures.mjs fixtures` | `72 fixtures with rows`; QS-EHZ: `S>U` design-forced-bound, diag-14-fix; `U>C` odd-cycle; QT also `C>U` diag-14; `violations 0` |
| `node qt-fixtures.mjs programs` | the design's §4.1 table plus QS-EHZ; `U0 zero (new)` U with 0 solutions, `U1 determinate` U with 1, `U4 diag-01` U with 4; `violations 0` |
| `node qt-compare.mjs f2` | C accept 186; every QT/QS variant D4 392 (`accept>D4` 186) |
| `node qt-compare.mjs raw 21 2000`, `raw <s> 4000` (s = 22-24) | totals: C accept 14,255; QT `accept>D4` 1,322; QS-EHZ 145, `refuse>D4` 35, `orderDiff` 0 |
| `node qt-compare.mjs dense 21 2000`, `dense <s> 4000` | totals: QS-EHZ `accept>D4` 5,565, `D4>accept` 135, `orderDiff` 0 |
| `node qt-compare.mjs shaped 1 2000`, `shaped 2 4000`, each also with `SHARE=1` | totals: QS-EHZ no `accept>D4`, `refuse>D4` 24, `orderDiff` 0; QT `accept>D4` 22 (all with SHARE) |
| `node qt-domains.mjs B 10` | 79,825 problems, about 5 s; QS-EHZ accept 192,266, refuse 249,734, D4 11,550, no `orderDiff`; QT `orderDiff` 29 |
| `node qt-domains.mjs A 10` | 3,339,712 problems, about 115 s on 10 workers; QS-EHZ accept 863,588, refuse 18,370,812, D4 70,892, no `orderDiff`; QS-EH `orderDiff` 207 |

No run of any variant shows an `S-violated`, `L-violated` or
`H-violated` key: an accepted assignment always satisfied every
constraint and was the least solution, and no refusal had a solution.
`whyDiff` (problems refused in every order for different reasons, a
proxy for the diagnostic) is reported per variant, the current design
included; it is not an order-independence defect (design §11.1).

## QT-strict (2026-10-19, branch `qt-strict`)

Rerun from the committed tree; each exits 0. Variant `QT-strict` is
`{ qts: true, selfApart: false, pairwise: false }`; `QT-strict+P`
adds positional pairwise improvement, for comparison only.

| Command | Output (abridged) |
|---|---|
| `node qt-checks.mjs strict` | 23 `ok`: S1-S3 D4 under QT-strict and accepted by QS-EHZ in every order; each accepted by QT-strict with its annotation, the solution the least; S2 with its arguments swapped accepted; on the 13 cases of research/purs-row-experiment QT-strict's acceptance equals purs's (`sig`, `nub`) in every order |
| `node qt-checks.mjs order` | 21 `ok` (adds order-S-shapes-1910: rejected in both orders, classes `refuse, D4`) |
| `node qt-fixtures.mjs fixtures` | QT-strict `S>U` design-forced-bound, design-quiet, diag-14-fix; `C>U` diag-03, diag-05, diag-14; `violations 0` |
| `node qt-fixtures.mjs programs` | QT-strict U on programs 11, 12, 13 (design-quiet) and 16 (`same`, C under the current design); `violations 0` |
| `node qt-compare.mjs …` (the seeds above) | QT-strict totals: raw accept 9,075 (`accept>D4` 5,180), dense 4,340 (15,555), shapes 7,228 (3,318), F2 0 (186); `acceptDiff` 0 everywhere; `orderDiff` 7 on shapes, 0 elsewhere |
| `node qt-domains.mjs A 10`, `… B 10` | QT-strict A: accept 178,616, refuse 16,446,806, D4 2,679,870, no `orderDiff` or `acceptDiff`; B: 8,092, 96,260, 349,198, none |

## QT-strict's adaptations (2026-10-19, branch `qt-adaptations`)

Fields may now be typed (`label:Type`); qt-facts.mjs compares labels by
name for uniqueness, overlap and lacks, so the labels-only results
above are unchanged. Rerun from the committed tree; each exits 0.

| Command | Output (abridged) |
|---|---|
| `node qt-adapt.mjs …` (the same seeds and shapes as qt-compare.mjs) | no `violated`, `acceptDiff`, `baseDiff` or `H:newWithSolution` key for any variant; accepted runs (QT-strict, +Sym, +H, +Sym+H): raw 9,075, 9,210, 9,075, 9,210; dense 4,340 each; shapes 7,228, 7,792, 7,228, 7,792; F2 0; `kindDiff` shapes 7, 0, 0, 0; `mirrorDiff` raw 602, 0, 66, 0 and shapes 2,014, 0, 861, 0; `H:new` raw 1,580 (+H), 270 (+Sym+H), dense 2,620, 2,620, shapes 2,089, 428 |
| `node qt-typed.mjs 10` | 336,610 problems; accepted runs 8,048, 11,042, 8,048, 11,042; `mirrorDiff` 50,550, 0, 4,170, 0; `H:new` 51,996, 4,056; no violation |
| `node qt-domains.mjs B 10`, `… A 10` | B: accepted 8,092, 8,352, 8,092, 8,352; A: 178,616, 182,332, 178,616, 182,332; no `orderDiff`, `acceptDiff` or `kindDiff` for any QT-strict variant; `mirrorDiff` 0 with Sym; `H:new` A 759,684 and 636,788, B 33,384 and 25,716; about 6 min for A |
| `node qt-checks2.mjs sym` | 5 `ok`: each typed program has one outcome under +Sym over every order of both orientations, matching the typed oracle |
| `node qt-checks2.mjs generality` | 8 `ok` (design §14.4) |
| `node qt-checks2.mjs kinds` | QT-strict `refuse, D4`; +Sym, +H, +Sym+H `refuse, refuse` |
| `node qt-fixtures.mjs fixtures` | every QT-strict variant `S>U` design-forced-bound, design-quiet, diag-14-fix; `C>U` QT-strict diag-03, diag-05, diag-14; +Sym diag-14; +H and +Sym+H none |

Sensitivity (scratch copies, final code): case 2 without its type
check gives `S-violated` and `L-violated` in the typed domain; H
without `cannotHold` gives `H:newWithSolution` 330 and 320 (raw seed
21, 1,000 problems); Sym's case 3 rewriting the wrong part gives
`H-violated` 10 and 25.

## The adopted configuration (2026-10-19, branch `r005b-replan`)

Implementation plan Task B0. Rerun from the committed tree; each exits
0. The `st.trace` hooks change no result: `node qt-adapt.mjs raw 21
2000`, `shaped 1 2000` and `dense 21 1000` print the same lines as
before them, and qt-checks.mjs `order`, `strict`, qt-checks2.mjs `sym`,
`kinds`, `generality` and qt-typed.mjs still exit 0.

| Command | Output (abridged) |
|---|---|
| `node qt-adopted.mjs examples` | 11 `ok`: S1 D4, smallest annotation two parameters (4 choices), excludes 3 of 5 solutions; S2 accept unannotated, and swapped; S3 D4, one parameter, redundant; Q1 D4, one annotation on the shared `s` (m1 or m3), excludes 1 of 3; Q1 with the re-plan's `fn(p: {}, s)` still D4; Q2 D4, one, redundant; program 11 D4, one parameter (4 choices), redundant; program 12 D4, `m0 = { x }`, redundant; program 16 `same(merge, merge)` D4 (the earlier custom design: refuse); F2 392 programs, 186 with a least solution, 0 accepted plain, 186 with the shared parameter annotated |
| `node qt-adopted.mjs three` | 10 `ok`: the fixtures with a row of three unknown tails (diag-02, -03, -08, -12, -17 and their fixes) give one outcome over every tail order and up to 720 step orders |
| `node qt-adopted.mjs controls` | 84 `ok`; `moved: design-forced-bound Solved>D4, design-quiet Solved>D4, diag-14-fix Solved>D4`; order-22-*, -23-*, -24-* D4, order-A-* and order-S-shapes-1910 refuse, domain-b-1, -17, -9 D4, domain-b-3, -7 refuse, each in every order |
| `node qt-adopted.mjs report` | 5 `ok`: under the proposed R11 the reported predicate is the same in every order: `determinate` site 9 (the second merge's result) field `a`; `odd-cycle`, `diag-01`, program 11 site 1 field `x`; Q1 site 4 field `b` |
| `node qt-given.mjs` | 7 `ok` (research/purs-given-1g README) |
| `node qt-render.mjs render 2000` | no `kindDiff` anywhere; `renderDiff` only for refusals met while solving (location rule 1 names the step being checked, which the order changes): fixtures 24 of 72, raw 758 of 2,000, shapes 855 of 2,000; none for H (fixtures 1, raw 10, dense 81, shapes 45 problems with H) or D4 (fixtures 18, raw 243, dense 1,807, shapes 342); `trace changed a verdict: 0` |
| `node qt-render.mjs case2 2000` | case 2 binds a meta to `{}` in 8 raw runs and 9 shape runs; 3 shape runs then fail at a mismatch reaching such a meta (problems 1335, 1558, 1810), and in each another order fails otherwise (1558 and 1810: a fact, `not entailed` or `overlap`) |

## Termination and locations (L1, L2; 2026-10-19, branch `r005b-replan`)

The implementation plan's gates (§10, decisions 12 and 13). The hooks
added to qt-strict.mjs (`rescan`, `pass`, `moved`) and the `trace`
option of qt-facts.mjs `makeState` only record: qt-cyclic.mjs runs every
problem with and without them and counts no verdict changed
(`traceChanged` 0 in every family), and `node qt-adopted.mjs controls`,
`examples`, `three`, `report` and `node qt-given.mjs` still exit 0.

| Command | Output (abridged) |
|---|---|
| `node qt-cyclic.mjs all` | `no violation`. Examples: self-loop with a label refuse (0 solutions), without D4 (8), own result in a part refuse (0), two-cycle D4 (8). Cyclic family (seed 31, 20,000 problems, 60,000 runs): 31,320 runs cyclic, at most 3 moves per lineage, 0 lineage violations, 0 unproductive passes, no refusal with a solution. Domain B: 36,701 of 159,650 runs cyclic, edges changed within a rescan in 2,808; the B0 measure did not fall on 2,677 of 5,277 changing acyclic passes, shifted by one on none. Domain A (one in 20): 42,299 of 333,972 cyclic. Generators (raw, dense, raw programs, shapes): no violation |
| `node qt-2g.mjs 2000` | `no violation`; the 2g variant changes verdicts only waiting → accepted: the named self-call shapes (4 runs) and 2 of 4,000 shaped runs; none in raw, dense or domain B; O4 still waits |
| `node qt-locate.mjs 2000` | reproduces qt-render's order-dependent refusals (fixtures 24 of 72, raw 758, shapes 855 of 2,000) and splits them by the MUSes in each order's failing prefix. Same conflict, same explanation: 18, 55, 91; same conflict, explanation differs: 3, 57, 4; different conflicts: 3, 646, 212; shapes past the caps (9 steps, 5 metas): 548. Under `latest` no same-conflict location differs; different conflicts keep their location in 1, 11 and 25 |

Sensitivity of the L1 checks (2026-10-19, scratch copies, deleted):
without case 3's `wellFormed(st, moved)` nothing changes (the bind rule
supplies the lack); with the bind rule not re-requiring a meta's lacks
on its image (`bindMeta`'s loop over `ex` emptied), the labelled
self-loop and the result-in-its-own-part examples reach the 10,000-pass
cap (19,998 lineage violations).

## Sensitivity

Run 2026-10-18 in deleted scratch copies (raw seed 21, 1,000 problems,
and the 72 fixtures), one mutation at a time, each restored after. The
first five were run before the follow-up; the last five on the final
code:

| Mutation | Caught |
|---|---|
| the end accepts every waiting predicate | `S-violated` and `L-violated` 230 and 245 (QS and QS-EH, one each); fixtures: 2,304 violations |
| `r t -> s` without its equal-other-sides test | `H-violated` 5; fixtures: 1,200 violations |
| `r s -> t` without its same-parts test | `H-violated` 21 and 6 (one each); fixtures: 1,484 violations |
| creation-site obligations dropped in mode `sym` | `S-violated`, `L-violated` 29 each; fixtures: none (they write their obligations as steps) |
| the end default ignores predicates with constants on one side | `S-violated`, `L-violated` 105 each; fixtures: 1,224 violations |

| rule Z disabled | `node qt-checks.mjs order`: 12 FAIL lines, exit 1 |
| `cannotHold` reduced to `excludes` (the entailment repair removed) | `node qt-checks.mjs order`: 4 FAIL lines (order-A-lacks, order-A-apart), exit 1 |
| Z without its apart test | `H-violated` 14 |
| Z without its lack test | `H-violated` 14, `L-violated` 115 |
| `cannotHold` true for every rigid | `H-violated` 17 (QS-EH) |

One mutation (the same-parts rule unifying with its own parts' side)
was caught by neither, so it is not listed as a check.

## What the evidence does not show

Labels only: no field types (so no nested predicates), no effect rows
(so no rollback or joint fixpoint), no texts. Order independence of
QS-EHZ is measured on these domains and generators, not proved. The
prototype is a toy written for the re-plan, not a port of the compiler.
Its order differences are counted, not analysed. One defect was found
and fixed while writing it: the first `r s -> t` rule replaced two
predicates by an equation that could itself only wait, which looped (raw
seed 24 never finished); every number above is from the fixed revision.
