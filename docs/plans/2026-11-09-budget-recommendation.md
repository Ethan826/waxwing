# Performance budgets (2026-11-09, dossier §18.167, §18.168)

Status: **approved** by the author (§18.168) under the recorded protocol.
These approve the measured corpus costs for this stage. They are not
universal latency or memory guarantees. The two CPU ratios have different
baselines and must not be multiplied. The earlier failed perf qualification
stays failed. The figures are from
test/fixtures/r0/t2-performance-3.json, the recorded protocol at 2c5b9e30,
whose src tree is the current one, under the derived path ordering
(dossier §18.166, §18.168).

## The intended activation path

Every accepted declaration goes through recheck, the type read-back, the
effect read-back and the validator. The strategy checks every candidate,
and the check reads each package, so all of it is paid on every accepted
declaration once minting is on.

## Absolute costs

Median CPU and peak memory over 12 pairs. Corpus: 2,832 candidates, on a
shared machine (load 3.1 to 8.8).

| Step | Without | With | Added CPU | Per candidate | Peak RSS |
|---|---|---|---|---|---|
| online read-back | 4.4 s | 10.2 s | 5.8 s | about 2.0 ms | 639 to 681 MiB |
| validator, against `certify` | 6.1 s | 13.5 s | 7.5 s | about 2.6 ms | 670 to 676 MiB |

Together that is about 13 s over the corpus, about 4.6 ms a declaration.
The costliest single declaration, the 10,000-part interpolation, measured
about 0.3 s of effect read-back and 1.2 to 1.6 s of validation in the
attribution samples.

## Approved budgets

The gate's four ratios, with whole-process peak RSS, the measure the
author chose as primary:

| Budget | Measured median | Third quartile | Approved ceiling |
|---|---|---|---|
| read-back, compile time | ×2.32 | ×2.36 | **×2.75** |
| read-back, peak memory | ×1.06 | ×1.08 | **×1.15** |
| validator, compile time | ×2.22 | ×2.26 | **×2.60** |
| validator, peak memory | ×1.00 | ×1.09 | **×1.15** |

The read-back's figures are the largest of three comparisons, so they also
bound the trace (×1.14 and ×1.45 CPU).

**Why these.** The third quartile describes today's cost and does not show
it is acceptable, so the case rests on the absolute cost: a few
milliseconds per declaration is small beside what a compile already does,
and this cost is paid only for declarations that pass through the check.
The ceilings add about 15% over the third quartile. That accommodates the
movement observed between two protocol runs on this shared machine (the
trace's recheck ratio moved from ×1.33 to ×1.45 with its code unchanged).
It cannot guarantee that ordinary load never causes a failure. The
read-back's former ×13.7 would fail by a wide margin.

**What a ratio cannot catch.** Corpus ratios can miss localized or
size-dependent regressions, which is how the walk's quadratic width stayed
hidden. The timing-free `wrapping` count (the 2026-11-04 proposal, §5,
step 3) stays beside the budgets. It covers that specific wrapping
mechanism and not every possible growth defect.

## Earlier failures stay failed

`npm run perf` failed two files at 354ce6e (§18.160; attributed in
test/fixtures/r0/t2-perf-attribution.json). These budgets are a different
measure and do not turn those failures into passes.
