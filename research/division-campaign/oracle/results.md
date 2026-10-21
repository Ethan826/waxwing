# Typed oracle results

These are the bounded results for Stream 4. The grammar, problem lists,
and fixed bounds are in [frozen-grammar.md](frozen-grammar.md). The
oracle classifies only that grammar and those bounds; agreement here does
not establish completeness beyond them.

## Frozen confirmation

The retained confirmation logs use the frozen search files listed in
`frozen-grammar.md`. Their SHA-256 values match its table. The SHA-256 of
the named problem list is
`97bfda6e88fa868515d048c718f1601725e464d6f5164a9dfc70b1db9e5121ed`.
Generated list hash, seed 5:
`055f87cfbb5e4c886fe2ce53566244fa1cf154fbd6fe2d3b04fc2ad3d8ab60cb`
Seed 13:
`45b251e7b004ad93ed724cd96c2c2d0295ced1f5250df10243648bb7c1310365`.

| Set | Results | Timing |
|---|---|---|
| Named, 75 problems | 75 agree; 0 prediction mismatches. Predictions: 28 I/N/U, 24 V/F/P, 23 V/F/U. | 10 shards; slowest 313 s (`division-depth2-tyvar`, 310 s). |
| Generated, seed 5, 120 | 120 agree: 47 I/N/U, 68 V/F/P, 5 V/F/U. | Slowest shard 1,045 s; slowest problem `gen5-41`, 782 s. |
| Generated, seed 13, 120 | 120 agree: 52 I/N/U, 65 V/F/P, 3 V/F/U. | Slowest shard 446 s. |

Here I/N/U means bounded invalid, no uniform template, and P9s
unresolved; V/F/P means bounded valid, template found, and P9s valid;
V/F/U means bounded valid, template found, and P9s unresolved. No frozen
confirmation returned a separation, flag, power discrepancy, or bug.
The generated set has only eight bounded-valid cases with unresolved
P9s results. It therefore gives little power against division gaps; the
named challenges carry most of that check.

## Brute-force cross-checks

The frozen brute limit is 50,000,000. Entries above it are recorded as
skipped, with their estimated search size; skipped cases are not
evidence of agreement.

| Set | Completed | Skipped | Mismatches | Logged time |
|---|---:|---:|---:|---:|
| Named, 75 | 44 | 31 | 0 | 3.2 s |
| Generated, seed 5, 120 | 80 | 40 | 0 | 15.6 s |
| Generated, seed 13, 120 | 76 | 44 | 0 | 35.7 s |

The supplementary 10-billion sweep processed 75 named entries: eight
completed (seven distinct problem names, since `split` occurs twice),
all matched, and 67 were skipped. The supplementary 10-trillion sweep
is partial: 65 entries were recorded, 64 skipped and one completed
match. It was stopped before the list ended. No larger brute run is
claimed.

The A cross-check compared first-pass and amended nested search on 36
problems and found zero mismatches. The C cross-check compared brute and
decomposed search on six small problems and found zero mismatches. Their
outputs are retained in `logs/crosscheck-A-amended.txt` and
`logs/crosscheck-C-amended.txt`.

## Power controls

The separate power controls do not belong to the frozen confirmation
set. M1 (no function skeletons) returned the predicted separation
`division-in-function` and flag `function-from-rigid`. M3 (cell blocks
unchecked) returned 19 predicted power failures. M2 (cell source is the
highest row only) is partial: 47 of 75 named cases completed, with 41
agree, 3 separations and 3 flags. Its detector fired on those defects,
but this is not a full 75-case run. Logs are in `logs/power/`.

## Formatting amendment

The frozen file `d3-grammar.mjs` had one 84-character line at its alias
clause. Commit `80f8444` reflowed only that statement across three lines;
its expression and behavior are unchanged. The frozen hash remains in
`frozen-grammar.md` as the hash of the original run input. The amended
file hash is
`f50820d96e026732747c4f07303bc657821401cc7e4f4ee6213e55136d1b13cf`.
The named and generated problem-list hashes above are unchanged after
the reflow.

## Reproduction

From this directory:

```sh
node d3-oracle.mjs named
node d3-oracle.mjs gen 120 5
node d3-oracle.mjs gen 120 13
node d3-oracle.mjs brute named
node d3-oracle.mjs brute gen 120 5
node d3-oracle.mjs brute gen 120 13
```

The run logs are under `logs/`; timings are machine-specific. These
checks establish agreement only within the recorded bounds and the
completed brute subsets.
