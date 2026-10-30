# Tranche 1 parallel batch: proposal for one authorization (2026-10-30)

Status: proposal (dossier §18.121). Nothing is dispatched until the
author authorizes the cap below. Base: 8f8eac8 on r0-t2-d1. Spend so
far about 5.22M.

## Deliverables

| Lane | Work | Deliverable |
|---|---|---|
| A | Finish Task 7: the erasure-preserving mark mutant (registered row), the existing Sig3 row relabeled as detecting through erasure, candidate matching documented (the dead needle is already fixed, 8f8eac8) | Task 7 ready for acceptance |
| B | Task 8: stage consumptions and ambient rows (E2, E10, E11) | implementation, focused tests, registered regression proof |
| C | Tasks 10-11: defer, Fail, entry, FX032 `Unsupported`; rule 1 routes to `EffectsUnchecked` | implementation, tests, live behavior preserved |
| D | Tasks 12-13: boundary extended to obligations; one coverage row per §13 rule (31 rows) | tests and fixture; rows not yet satisfied stay `unfinished` |
| R9 | Task 9 design, document only: the literal-to-image E1 with explicit sides and a separating example | a design note for the author; no implementation |

Out of the batch: Task 9's implementation, Task 14 (effects pin,
census and window rerun as a deliverable, records), A2's algorithm and
R031.

## Lane ownership and files

Each implementer is a fresh agent in its own worktree under
.claude/worktrees/, branched from the base after step 0.

| Lane | Owns (edits) | Reads only |
|---|---|---|
| A | test/r0-obligations-equal.test.mjs, a new shared check module (e.g. test/r0-obligations-sides.mjs), scripts/regression-r0-amin-equal.mjs, test/regression-r0-amin-equal.mjs | src/ |
| B | Generate/Call.purs, Operator.purs, Builtin.purs, Body.purs (ambient), Control.purs, the perform part of Effect (after step 0), Obligation.purs additions `consumeAt`, `ambientAt`; test/r0-obligations-consume.test.mjs; its regression row | Domain/Recorded/Effect.purs |
| C | Generate/Block.purs (defer), Failure.purs, Body.purs (`Entry`, main only), Domain/Resolved/Core.purs and Features/Resolve/Effect.purs (`OperationInfo.effects`, data only), the `Unsupported` perform forms (Effect after step 0), Obligation.purs additions for its kinds, Decide/Reason.purs; test/r0-obligations-misc.test.mjs, test/r0-decide.test.mjs; its regression rows | Call, Operator (pipe and partial forms read; any edit there is a shared-file change the controller integrates) |
| D | test/r0-effects-boundary.serial.test.mjs (extension), test/r0-effects-coverage.test.mjs, test/fixtures/r0/effects-coverage.json (new) | everything |
| R9 | a note under docs/plans/ | everything |

Shared files the controller owns: Obligation.purs (B and C each add
exports in their own lane; the controller merges them), Body.purs
(B's ambient row and C's `Entry` touch different rules), the Effect
split, scripts/trusted-surface.json, every pin, scripts/regression*.mjs
spreads, docs/plans/*, docs/progress.md, the dossier and the ledger.

## Step 0, before dispatch (controller)

Split Generate/Effect.purs (247 lines; B and C both add to it) by
moving its perform rules verbatim into a new module (for example
Generate/Perform.purs), with no change in behavior. Checks: build,
checkStructure, the generation tests that cover perform, the problem
pin, r0-obligations-equal. Trusted-surface re-pin for Effect and the
new module, named in the commit.

## Integration order

1. A (test-only; Task 7's acceptance does not wait for B to D).
2. B, then C (C's Body and Effect edits rebase on B's); the controller
   resolves mechanical conflicts and merges Obligation.purs exports.
3. D last: its `unfinished` rows are rechecked against the integrated
   tree, and each row that B or C now satisfies becomes a `fixture` row
   only when its program records the named obligation.
4. One combined review, then one bounded fix allowance, then one full
   verify (below).

No merge commits: each lane's commits are rebased onto the integration
branch in order.

## Planned re-pins and boundary changes (listed for authorization)

- Trusted surface (scripts/trusted-surface.json): step 0's Effect split;
  B's and C's Obligation.purs exports; any Generate.* export a lane
  adds; Domain.Recorded.Effect if B or C adds an `Obligation` or
  `SiteKind` constructor. Each named in its commit.
- Census and window fixtures (test/fixtures/r0/census.json,
  window.json): Task 11 is predicted to move only FX032-shaped
  declarations to `EffectsUnchecked`. Re-pinned by the controller with
  every moved row listed in the commit; any other moved row is a stop.
- New fixture test/fixtures/r0/effects-coverage.json (D).

Protected, each a stop if it would move: G0's problem pin, timing
tests and their bounds, live acceptance (test/compiler.test.mjs and the
corpus), first diagnostics (test/r0-first-diagnostic.serial.test.mjs)
and generated Go.

## Execution rules for this batch

- Lanes run focused tests and their affected regression rows only. One
  full verify after integration and review replaces the between-task
  verify rule for this batch.
- Lanes do not run timing tests (*-timing.serial.test.mjs and the other
  serial timing files); the acceptance verify runs alone under the
  lock, with no agent building.
- The controller may resolve mechanical conflicts, update stale
  mutation needles without changing the restored defect or expected
  failure, and make the re-pins listed above.
- Ordinary implementation choices inside this scope are recorded for
  review, not brought back for permission.
- Stops: a semantic ambiguity that affects acceptance or a guarantee;
  a boundary change not listed above; a weakened check; a denied
  command; scope growth; the cap.
- Review once, on the integrated change, with three targeted reviewers
  on different concerns: (1) A and the obligations' marked sides and
  provenance; (2) B and C's obligation semantics against statements §4
  and §13; (3) gates, pins, live preservation and D's coverage honesty.

## Cost

| Part | Estimate |
|---|---|
| Step 0 (controller split and re-pin) | 0.03M |
| A (fresh Sonnet) | 0.08M |
| B, Task 8 (fresh Sonnet) | 0.25M |
| C, Tasks 10-11 (fresh Sonnet; Resolve and Decide touched) | 0.30M |
| D, Tasks 12-13 (fresh Sonnet) | 0.20M |
| R9, Task 9 design (Opus, document only) | 0.10M |
| Integration, census and window re-pin, needles (controller) | 0.08M |
| Review, three targeted Opus reviewers | 0.30M |
| Fix allowance, bounded | 0.20M |
| Acceptance: one full verify and records (controller) | 0.03M |
| Total | 1.57M |

Proposed all-in cap 1.60M, running ceiling 6.82M. The estimates come
from this tranche's history: a Task 7 implementation about 0.25M,
targeted reviews 0.1M to 0.125M, fix rounds 0.075M to 0.085M.

## Report

Progress is reported by completed deliverables and remaining
dependencies. Parallel preparation is not accepted implementation.
Nothing is pushed.
