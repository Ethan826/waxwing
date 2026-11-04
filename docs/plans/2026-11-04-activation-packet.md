# Activation packet (2026-11-04, dossier §18.159, §18.160)

One consolidated return for the work §18.159 authorized: the minting
comparison, the performance evidence, today's verdicts for the gap
declarations, and one proposal for the activation prerequisites. Nothing
is activated. The minting switch, F14's retirement, live replacement and
pushing stay held. No soundness claim.

The gate (`node scripts/r0-t2-activation-gate.mjs`, spec
docs/plans/2026-11-03-a2-activation-gate.md) now reads **not met (2, 4,
6)**. Criteria 1, 3, 5 and 7 read met; the gate is an evidence
checklist, and a met citation does not show what a section approves.

## 1. What was measured and found

**Criterion 5, minting comparison** (test/fixtures/r0/t2-minting-
comparison.json; the scratch change verbatim in
docs/plans/2026-11-04-minting-comparison-scratch.diff; raw logs in
.build/evidence/2026-11-04-comparison/, git-ignored). A disposable
worktree at 354ce6e made Online mint through `validate`, with a read
fault declining as `PackageUnread` and no substitution-only fallback.
Census: 0 moved. RT8: 15 rows. Window: 16 rows. Shadow: 16 attempts,
Accepted to CheckFailed. All 16 are declarations on the honest pin's gap
lists (12 read faults, 4 ForcedTail); none is unexpected. Two Solved
acceptances are lost: the two UnreadImage `statsEvidence` declarations
(c7 and q7). The three RequirementUnjudged did not move. No C6 movement
appears in the corpus; the C6 fixture categorization passes unchanged.
Found in the tooling: RT8's accounting labels every decline as a DEFECT,
and the window classifier throws on the first DEFECT, so the shadow pin
test aborts at load under minting. The real switch needs both fixed.

**Criterion 2, today's verdicts** (test/fixtures/r0/t2-gap-verdicts.json,
recomputed by its serial test). Loss means today's substitution-only
`certify` accepts and the new path would not (§18.159's wording).

| List | Corpus loader | Effect pin |
|---|---|---|
| read faults | 11 losses | 12 losses (adds inline:fx032#g, a known defect, FX032) |
| RequirementUnjudged | 3 existing refusals | 3 existing refusals |
| ForcedTail | 4 losses | 4 losses |

Today's whole checker compiles all 19. Criterion 2 measures
certification losses only; whether the existing-refusal programs survive
replacement of the old checker is not measured.

**Criterion 6, `npm run perf`** (once, at 354ce6e; .build/evidence/
2026-11-04-perf/). Exit 1: 24 of 26 files passed. fn-linear-timing: 4
of 8 forms over their bounds (×1.13 to ×1.44; `over` 2331 ms against
1620 ms). fn-scale: one phase 1900 ms against 1650 ms. No retry, no
bound change. Load average 4.5 to 6.2, two read-only agents active.

**Criterion 6, paired measurements** (protocol docs/plans/2026-11-04-
performance-protocol.md, fixed and reviewed before the run; results
test/fixtures/r0/t2-performance.json; raw samples
.build/evidence/2026-11-04-perf-paired/). 12 measured pairs per
comparison, counterbalanced, plus one warm-up; 104 samples, none failed.
Shared machine: load 3.2 to 7.4 (median 4.5), memory pressure "warn",
29-43% free, AC power. Medians of paired ratios (with over without):

| Comparison | CPU | added | peak RSS | added |
|---|---|---|---|---|
| trace, compile | ×1.12 | +1.1 s | ×1.06 | +19 MiB |
| trace, recheck | ×1.44 | +1.5 s | ×1.08 | +29 MiB |
| online read-back | **×14.1** | **+58 s** | ×1.71 | +471 MiB |
| validator vs certify | ×2.24 | +8.1 s | ×1.00 | below setup peak; heap +91 MiB |

The online read-back is the dominant cost: about 20 ms per candidate
over 2,832 candidates, against about 1.5 ms for `recheck` alone. The
earlier "+80% on the shadow test" figure hid this. The earlier R035
memory figures also carried an artifact (the "without" process loaded a
second compiler); this protocol removes it.

## 2. Proposed budgets (none approved)

By the protocol's rule (the third quartile of the paired ratio, rounded
up to the next 0.05): trace compile CPU 1.15, RSS 1.10; trace recheck
CPU 1.50, RSS 1.20; online read-back CPU 14.40, RSS 1.95; validator CPU
2.35, RSS 1.15 (whole process; the increment over setup was 0 MiB in
every pair). **Recommendation: do not adopt the online read-back
figures as a budget.** Reduce the cost first (R035), for example by
reading back only the candidate the search keeps, then measure again
under the same protocol. Approve budgets for the trace and the validator
as proposed, or set others. Also choose which memory figure a budget
binds: whole-process peak, or the increment over setup.

## 3. The prerequisites proposal

docs/plans/2026-11-04-activation-prerequisites-proposal.md, after one
adversarial review, a revision and a re-review (approved). Five tasks:
T1 R034 (2), merge duplicate `EffectsUnchecked` kinds (Decide.Reason,
token review); T2 R034 (10), owner provenance counted once in check 4
(**a second exception to the validator freeze**); T3 R036 (3), the
conversion causes as their own read faults; T4 R036 (2), a fully
polymorphic traversal so an unnumbered meta is a `TraceUnfinished` read
fault, and an injected row resolver in place of `onRow`'s fallback; T5
R036 (1), a checked totality argument for the eager read-back (no lazy
field). Optional T6: the comparison tooling gaps above. Each task has
must-fail tests and restored-defect rows; no pin is predicted to move,
to be confirmed by runs; one routine verify at the end. Estimate
1.8-3.0M tokens, 12-13 dispatches (T6 adds 0.2-0.35M).

## 4. Decisions for the author

1. **Criterion 2:** a loss ruling for each loss list (read faults,
   ForcedTail), or keep them unresolved (activation stays blocked).
2. **Criterion 6:** budgets (section 2), the memory figure they bind,
   and whether the read-back's cost must fall before any budget.
3. **The proposal** (its Q1-Q9 carry recommended answers). The main
   ones: Q1, the second freeze exception for R034 (10), owners only or
   every obligation; Q3, totality argument rather than a lazy field;
   Q6, whether criterion 4 also counts R036's items (a gate change);
   Q8, whether the same raw-meta fallback in Holes.purs:48-51 is an
   activation blocker; Q9, whether T6 (the tooling gaps) is.
4. **The perf failures:** whether the two over-bound perf files need
   attribution (trace cost or load) before activation; the paired
   figures suggest the trace contributes about ×1.1 to ×1.4.

Held throughout: the minting switch, F14's retirement, live
replacement, pushing.
