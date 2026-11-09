# Performance-budget recommendation (2026-11-09, dossier §18.167)

Status: a recommendation. No budget is approved, and criterion 6 stays
unmet until the author rules. The figures are from
test/fixtures/r0/t2-performance-3.json, the recorded protocol at 2c5b9e30,
whose src tree is the current one. It assumes the derived path ordering
stays (dossier §18.166).

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

## Recommended budgets

The gate's four ratios, with whole-process peak RSS, the measure the
author chose as primary:

| Budget | Measured median | Third quartile | Recommended ceiling |
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
The ceilings add about 15% over the third quartile. That is about the
movement between two protocol runs on this shared machine (the trace's
recheck ratio moved from ×1.33 to ×1.45 with its code unchanged), so
ordinary load does not fail them while a real regression does. The
read-back's former ×13.7 would fail by a wide margin.

**What a ratio cannot catch.** A ceiling on the corpus median misses a
cost that grows faster than a program does, which is how the walk's
quadratic width stayed hidden. I recommend keeping the `wrapping` count
check of the 2026-11-04 proposal (§5, step 3) as a timing-free growth
check beside the budgets.

## Open

The validator would be about a third faster with a `case` on `Maybe` in
one function, at the price of a structural-gate exception (dossier
§18.166). I recommend against it: the saving is about 5 s over the
corpus, under 2 ms a declaration. If it is taken, the validator's row
must be measured again.
