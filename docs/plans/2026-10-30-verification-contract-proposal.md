# Verification contract: functional acceptance and performance qualification (2026-10-30)

Status: proposal for the author (dossier §18.131). Nothing here is
implemented, measured or authorized beyond writing this note. It
replaces the timing-gate proposal in §18.130.

## Why

This machine is shared with other agents and ordinary work, so a quiet
machine cannot be a condition of routine acceptance. Today `npm run
verify` mixes two questions: does the compiler behave correctly, and
does it run within absolute time budgets measured on 2026-10-09. The
second fails under shared load even on the pre-batch tree (§18.130:
partialFirst, base median 985 ms against a 930 ms bound, 6 of 6 runs
over). Task 7 is implementation complete and its acceptance is blocked
by that second question.

## The contract

1. **Routine verify** (`npm run verify`) keeps every functional test,
   the structural gates, the regression proofs, the stack-safety checks
   and generous timeouts that catch hangs.
2. **Performance budgets** (absolute elapsed-time bounds) move to a
   separate command, `npm run perf`. They stay executable; each failure
   is reported; nothing retries. Routine verify's final line says that
   it did not run them and names the command, for example
   "Performance budgets not run (npm run perf): 24 files."
3. **Growth checks** (doubling ratios) may run in routine verify, each
   only after it is shown useful under shared-machine conditions. They
   bound growth between two sizes; they do not prove linearity, and a
   ratio reduces but does not remove interference.
4. No automatic retries, no adaptive thresholds, no hidden exclusions.
   Every test file belongs to exactly one command by its name, and the
   inventory below is checked by the clock gate.

## Mechanism

- **File names decide the command.** `*.perf.test.mjs` files run only
  under `npm run perf` (new scripts/perf.mjs: one file at a time, its
  conditions line printed first, exit 1 on any failure). verify keeps
  its parallel phase (`*.test.mjs`) and serial phase
  (`*.serial.test.mjs`) and skips `*.perf.test.mjs` by name, counting
  them in its final line.
- **One growth helper.** test/growth.mjs is the only routine module
  that compares elapsed times. Its protocol is fixed in code before any
  result is collected: one untimed warm-up run per size; samples taken
  in the order small, large, large, small, repeated (5 per size); the
  statistic is median(large) / median(small); the threshold is a
  constant passed by the caller and printed with every sample.
- **Termination safeguards stay.** A timeout that kills a hung child
  (spawn timeouts, `go build` group kills) is not a budget: it fails
  only on a hang. Each keeps a margin of at least ten times its
  measured time, stated beside it in a comment.

## Inventory of elapsed-time uses (first pass, grep-based)

The implementation turns this into a checked fixture,
test/fixtures/timing-inventory.json, with one entry per file that reads
a clock and its category; the clock gate fails on a clock read in a
file that is not listed or is listed under another category. Counts
here are from `grep` over test/ and scripts/ at f43c9cc (41 files read
a clock) and will be corrected by that fixture.

| Category | Files (test/) | Disposition |
|---|---|---|
| Absolute budgets | fn-linear-timing, fn-scale (phase bounds), fn-specialize-timing, fn-syntax-timing, functional-timing, fx-block, fx-scale, fx008-install (absolute part), fx008-nesting, fx008-scale, fx008-settle, grammar-timing, match-lift-timing, coverage-scale, poly-coverage-timing, poly-depth-timing, r0-census (generation scale bounds only), r0-cx-cost (time bound only), r0-mgu-scale, r001-scale, text-scale | Budgets move unchanged into `*.perf.test.mjs` files (same workloads, same constants, no recalibration). Each file's functional and stack-safety assertions stay routine: where a file mixes them, it is split, and the routine half keeps the workload and the outcome assertions |
| Existing ratio checks | fx008-install, large-source-timing, r013-scale, r0-mgu-scale, fx008-scale | Each becomes a growth check through test/growth.mjs only after the demonstration below; until then it moves to perf with its budget |
| Termination safeguards | go-timed.mjs (spawn timeouts), depth-timing (`go build` group kill), fn-scale (`buildTimeoutMs`), fx-differential (`shrinkMs`), poly-termination-timing (to be confirmed: its name says termination, its limit may be a budget) | Stay routine; margin comment added; a limit that turns out to be a budget is reclassified, not loosened |
| Functional clock uses | clock-gate and clock-scope tests (they feed the gate fixture text), r0-exhausted (its "ratio" counts passes, not time) | Stay routine; not timing |
| Scripts outside verify | scripts/effect-probe, stage-probe, fn-milestone, ladder-profile, row-merge-exhaustive | Out of scope; listed so the inventory is complete |

Stack safety (deep nesting and 20,000-parameter forms completing
without a stack overflow) is a functional property: those workloads
stay routine with their outcome assertions, without a time bound.

## The current blocker: partialFirst

test/fn-linear-timing.serial.test.mjs keeps its eight workloads at
20,000 parameters and their `expectedOutcome` assertions in routine
verify, so stack safety and outcomes are still checked. Its eight
absolute bounds (3 × the 2026-10-09 medians) move unchanged to
fn-linear-timing.perf.test.mjs.

Proposed growth check, adopted only after the demonstration: partialFirst
at 10,000 and 20,000 parameters through test/growth.mjs, threshold
t(20000)/t(10000) ≤ 3.0. Demonstration, with the protocol above fixed
first and its raw samples and conditions kept:
1. healthy base b71a472 passes;
2. healthy head passes;
3. a cleanly built restoration of a quadratic defect fails the ratio
   assertion (not a timeout, not an outcome failure).
Correction to §18.130: it named "FN001's earlier quadratic
partial-application path" as the defect to restore. I have not found a
registered row or a findings entry for it. The first implementation
step is to locate that defect in FN001's history; if no restorable
quadratic exists, the proposal comes back with a constructed one
(stated as constructed) rather than proceeding silently. The same
demonstration is required for each existing ratio check before it
becomes a growth check.

## The clock gate

Today (scripts/structure-clocks.mjs) no parallel-phase test reads a
clock, and timing belongs in serial files. Proposed policy:
- parallel phase: unchanged, no clock reads;
- serial phase: clock reads only through test/growth.mjs, the
  termination helpers (go-timed.mjs timeouts) and a
  diagnostics-only helper that prints elapsed time and returns
  nothing; any other clock read, or an import of a timing helper not
  listed for that file in the inventory, is a finding;
- `*.perf.test.mjs`: free to read clocks; must be in the inventory.
Limits, stated in the gate and in docs/engineering.md: the gate sees
syntax, not intent. It cannot tell a generous timeout from a tight one
(the ten-times margin is a review rule), cannot see a duration a child
process reports in its output, and cannot stop a misuse of a listed
helper; the growth helper's threshold is reviewed, not machine-checked.
Must-fail fixtures: an absolute bound in a serial file, a clock read in
a parallel file, a perf file missing from the inventory, a growth
helper import from an unlisted file.

## Documentation and completion criteria

- AGENTS.md: "Run `npm run verify` before reporting completion" stays,
  with: report functional acceptance (routine verify) and performance
  qualification (`npm run perf`) separately; never describe a perf
  check that did not run as passing.
- docs/engineering.md: the contract, the inventory's categories, the
  gate's policy and limits.
- Plan completion criteria (tranche 1 and later plans): acceptance
  needs a passing routine verify; performance qualification is
  recorded as run or not run, with its result and conditions.
- Records: both failed acceptance runs (§18.127, §18.129) stay as they
  are. Task 7 closes only after this contract is approved,
  implemented, reviewed, and a complete routine verify passes.

## Estimate (one all-in cap)

| Part | Estimate |
|---|---|
| perf command, verify's phase split and final line, file splits for about 24 budget files (one Sonnet implementer) | 0.20M |
| growth helper, partialFirst growth check, defect identification, the three-way demonstration | 0.10M |
| clock gate policy, inventory fixture, must-fail fixtures | 0.10M |
| registered regression evidence (gate rows; the growth row's restored defect) | 0.03M |
| docs and completion criteria (controller) | 0.03M |
| targeted review, one Opus reviewer on gates and honesty of the split | 0.10M |
| bounded fix allowance | 0.08M |
| integration, one routine acceptance verify, records (controller) | 0.04M |
| Total | 0.68M |

Proposed cap 0.70M all-in, controller and reviewer spend counted. The
existing ratio checks' demonstrations are not in this cap: until each
is demonstrated, it moves to perf with its budget.

## Gate and pin changes needing authorization (together)

- scripts/structure-clocks.mjs policy and its exemption list; new
  test/fixtures/timing-inventory.json.
- scripts/verify.mjs (phases, the not-run line); new scripts/perf.mjs
  and `npm run perf` in package.json.
- Moving about 24 budgets out of routine verify (constants unchanged),
  and the file splits that keep their functional assertions routine.
- Adopting the partialFirst growth threshold 3.0, after the
  demonstration.
- AGENTS.md's completion rule and docs/engineering.md.
- New regression rows in scripts/regression*.mjs.
Not expected to change: the trusted-surface pin, G0's problem pin, the
census, window and RT8 pins.

## Open

- poly-termination-timing's classification.
- Whether routine verify should also print the perf inventory count
  per category.
- The quiet-machine collection protocol stays held; nothing here
  depends on it.
