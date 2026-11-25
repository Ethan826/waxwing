# Review: arithmetic Task 1, FX033 and charter scoping

2026-10-25. Read-only review of the reported checkpoints. Recommendations
below are not author decisions or implementation authorization. No branch
was switched, no implementation changed, and nothing was committed/pushed.

## Arithmetic Task 1

Reviewed `0633480` against `3672c77`. A fresh reviewer read the source/test
diff and returned Ready with fixes, finding no semantic regression. Its
one P2 finding: the committed progress note marks Task 1 done but records
only Task 2's 2371-test verification. Record the reported Task 1 totals
(2372 parallel, 59 serial, 176 regression proofs), command, revision and
available log location; do not invent a retained log if none exists.

The reviewer found operand order preserved through resolution, checking,
specialization, folds and Go rendering. Exact AST assertions remain exact.
The differential projection retains operands, spans and nesting while
normalizing only the intended representation change. It ran six small
read-only assertions over the projection and derived fold order. Those
assertions are reviewer evidence; the coordinator did not repeat them.

Coordinator run: Node's test runner over arithmetic.test.mjs,
fn-syntax.test.mjs, r001-parse.test.mjs and r005-parse.test.mjs: 103 passed,
0 failed/cancelled/skipped/todo. Output: /private/tmp/arithmetic-task1-
targeted.tap (temporary, not a durable repository artifact). Existing
built modules were used; no clean build, Go execution, full verification
or 13,253-case differential was rerun in this review.

The source still uses `chainLeftAny`. A direct unparenthesized addition
chain assertion is absent. This is a coverage gap, not an observed wrong
parse. Recommend adding it now, with a parenthesized control and a mutant
that changes association. Addition's numeric associativity makes the
structural assertion necessary to distinguish the two groupings.
The reviewer judged the gap non-blocking for the refactor itself.

Differential/verify totals remain reported evidence. Emitted-Go equality
applies to cases reaching emission, not every attempted source or isName
probe in the five corpora. No further arithmetic task or landing approval
follows automatically from this review.

## FX033 / ResultC Review 2

Read `4fca437`, the ResultC draft's Review 2, the earlier source rule and
c1/x1z with their emulations. The review reports nine accepted failing
programs on the shipped compiler and the R0 branch. The proposed H-prime
change has not been built: unused-parameter emulations exercise the
existing conservative branch. They support the repair mechanism but are
not a run of the repair.

Recommend a separate narrow, test-first repair, accepting c1 and x1z as
temporary conservative refusals. Their correctness is reasoned in the
review; rejecting them is not evidence of semantic invalidity or a final
language policy. Preserve their source and outputs, and record how to
revisit the precision loss. Do not claim RC-prime or O-SUB proved.

The repair should actually run all nine failure shapes plus controls,
retain k2f/x1d/x1n, reject for the intended diagnostic, and have a faithful
restored-defect regression. Keep a-min's E4-prime description consistent,
without implementing the broader validator or changing Task 4.6/G-D1.
This recommendation requires the author's repair/compatibility ruling.

## Scoping map findings

Read `46392b4` and probe README/source at that revision. File F1-F4 in the
local backlog with the documented observations and unknowns. Recording a
finding does not authorize a compiler fix or silently settle its cause.
Keep historical snapshots dated and fix current summaries explicitly.

| Finding | Evidence | Next action |
|---|---|---|
| S1: Named assembly claimed unavailable before modules. | Map M001 and probe classification; C2b already defines and calls `fn assemble`. | Separate named in-file assembly, cross-module packaging and automatic provider selection. Modules are not needed for the first. |
| S2: Handlers claimed to return only fixed values. | Map I001; current service examples and C2b compute from arguments/captured configuration. | State that external-host integration lacks FFI. Do not conflate that with handler computation. |
| S3: Schema prerequisites presented as blanket dependencies. | Sequencing table lists C001/K001/M001/I001/R001 while schema representation remains open. | Mark hard prerequisites versus encoding-specific needs or coordination. First-order schema-AST work does not inherently need HKTs; host adapters and opaque-domain support need their own scopes. |
| S4: FX006 placed last as an undifferentiated milestone. | Sequence puts it after schema work; its semantics affect control, cleanup and foreign boundaries. | Separate early semantics/interface design from later implementation; no automatic new work authorization. |
| S5: Probe summary counts disagree. | At `46392b4`, 30 program files and 30 result rows. Grades: 20 confirmed, 6 unknown settled, 3 refuted, 1 headline confirmed. Prose says 25 frozen and 19+3+5, which sum to 27. Earlier commit summary says 29 programs. | Reconcile initial/added cohorts and grade denominators from the actual inventory; do not sum overlapping or partial claims. |
| S6: K001 standard machinery is not yet a correspondence result. | Map says standard rules suffice, but its own O59 citation leaves the two-row-sort hypotheses unchecked. | Label the established mechanism and the remaining adaptation separately. |
| S7: R0 status in the map omits later authorized/implemented work. | It says D1 implementation unauthorized and reads only first-shadow authorization/tips, while the current handoff reports subsequent D1/U8 work. | Reconcile from later explicit rulings and commits; do not use this map alone to reset authorization. |

Sequence recommendation: prioritize the live FX033 repair; finish the
arithmetic refactor's small closure; continue the authorized R0 work within
its gates. C001 explicit-core work can stay independent of HKTs. INF001,
kinding, modules, FFI and continuation semantics can have coordinated
statement/design tracks, with their actual implementation prerequisites
identified. The map is a proposal, not an execution schedule.

## Evidence and prose limits

Source and document reading, the coordinator's 103 targeted tests, and the
reviewer's small assertions are the new evidence in this pass. Other
compiler runs and broad-corpus totals are attributed reports. No formal
proof claim is made. Read the draft once for precise actors, explicit
scope and distinction between recommendations and author decisions;
kept each finding beside its evidence and next action.
