# Return packet: index-first batch (2026-11-09, dossier §18.164)

The return §18.163 asked for.

**Milestones.** None has moved since 2026-10-25. Everything in this batch
is implemented, reviewed and verified. Milestone 1 is still blocked by
activation-gate criteria 2 (replacement losses) and 6 (budgets). The gate
reads **not met (2, 6)**. No soundness claim.

Held: replacement losses, numerical budgets, the minting switch, F14's
retirement, live replacement, pushing.

## 1. Verification

Routine verify at 2d68a85d **passed**, one complete run under the lock,
with 2 test files at a time and regression jobs 1: parallel 3481/3481,
serial 238/238, regression proofs 478/478, growth ratio 2.302 against 3.0.
Performance qualification (`npm run perf`) was not run. Free memory
stayed at 26% or above; one of 118 samples read pressure level critical,
the rest normal or warn. Evidence: .build/evidence/2026-11-09-verify/.

**One failed run is kept.** Verify at 808ebfe5 failed 477 of 478 regression
proofs. `r0-t2-rows-entry-finish` could no longer find its search text,
because the unnumbered row reformatted that line of `finish`. The restored
defect is unchanged and only the row's search text moved. Source is the
same at both commits.

## 2. What landed

| Change | Result | Evidence |
|---|---|---|
| Index-first lookup | Only the named item is wrapped, the over-applied alias included | 17 path and boundary cases; 14 array constructions read by a counting `Proxy` |
| R037 (3), opaque `UnnumberedRow` | The raw row reaches a numbered reader only through the trace's numbering | collision, sharing, extension and the a1-discard-dictionary corpus case; each operation's callers pinned |
| R038 (2) classes | Read-fault declines §3.2(b); `RequirementOpen` where today refuses §3.2(a), pending G-ValidR | separating rows against each nearest neighbor; defects stay defects |

Corpus agreement: the read-back and package digest over all 2,832
candidates equals the base commit's (2c3479f1...). Compiled output
differed from the base only in the expected modules, at the first
review's commit. No protected pin moved.

New regression rows: an eager sibling rebuild, a clamped index, the
collision, a blind caller scan, and each class label flipped. The row
`r0-t2-rows-entry-root` now restores its defect through the explicit
conversion, because the raw row no longer type-checks at that reader.

**Independent review** (one, Opus, static reading): no semantic defect, two
Important findings, six Minor. Fixed: the raw-arguments escape became a
named predicate; each operation's callers are pinned, with a must-fail
case; the over-applied alias reads by index; the width test covers every
construction; the class rows separate from their neighbors; comments and
status corrected. The reviewer's fixes were not re-reviewed.

One limit stays: RT8's read-fault branch is unrun until the real
`EffectsUnread` constructor lands (R038 (3)), so the two rows on rendered
read-fault text pin only the rendering.

R037 (2) is recorded as ruled: blocks live replacement, not shadow
minting; the planted example's behavior is reasoned, not run.

## 3. Compatibility comparison

test/fixtures/r0/t2-minting-comparison3.json, a disposable build at
2c5b9e30. The moved report equals the previous comparison's in 103 of 104
lines. The one difference is the read-fault class's source, which now
cites your ruling. Census 0 moved, RT8 15, window 16, shadow 16, the same
16 declarations, none unexpected. Two are status changes, the
`statsEvidence` declarations from Solved. Nothing was re-pinned. Neither
figure measures what users would lose at replacement.

## 4. Protocol measurements

test/fixtures/r0/t2-performance-3.json, the recorded protocol at 2c5b9e30:
12 pairs per comparison, none failed. Shared machine, load 3.1 to 8.8
(median 4.0), 31 to 51% memory free. Median paired ratios:

| Comparison | CPU, before | CPU, now | Peak RSS, now |
|---|---|---|---|
| trace, compile | ×1.11 | ×1.14 | ×1.04 |
| trace, recheck | ×1.33 | ×1.45 | ×1.03 |
| online read-back | ×13.7 | **×2.32** | **×1.06** |
| validator vs `certify` | ×2.25 | ×2.22 | ×1.00 |

"Before" is t2-performance-2.json at fc93a92b. The read-back result is at
the low end of the indicative ×2.3 to ×3.2. The trace was not changed, so
its movement is not attributed to this batch; these are single runs on a
shared machine. No budget is proposed.

## 5. Validator cost

docs/plans/2026-11-09-validator-path-cost-proposal.md. Nothing is
implemented. Most validator time is ordering: 14.6 million path
comparisons, with 84% of the compared steps in shared prefixes. Replacing
the derived comparison with one monomorphic loop, in a disposable copy,
took the validator from 14.0 to 7.1 s. Results were identical, and an
oracle ran both comparisons side by side with 0 mismatches. A same-object
shortcut adds nothing measurable on top.

## 6. Decisions awaiting the author

1. Whether to authorize the monomorphic path comparison, and whether that
   change to a `Domain` module needs a validator-freeze exception.
2. Criterion 6: numerical budgets, held.
3. Criterion 2: replacement losses, held.
