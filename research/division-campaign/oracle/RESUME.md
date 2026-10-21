# Stream 4 (typed oracle expansion): resume notes (paused 2026-10-21)

## Done (committed)

- `f61726e` frozen-grammar.md alone (freeze precedes every new run).
- `0fea334` d3-challenges.mjs (26 new problems), d3-grammar.mjs
  (generator), d3-set.mjs (frozen set, 75 named), d3-oracle.mjs
  (driver). SHA-256 match the frozen table.
- Confirmation run complete under the frozen grammar (logs/):
  - named, 75 problems: 75 `agree`, 0 prediction mismatches
    (28 I/N/U, 24 V/F/P, 23 V/F/U); 10 shards, slowest 313 s,
    slowest problem `division-depth2-tyvar` 310 s. logs/named.txt.
  - generated seed 5, 120: 120 `agree` (47 I/N/U, 68 V/F/P, 5 V/F/U);
    slowest shard 1045 s (`gen5-41`, 782 s). logs/gen5.txt.
  - generated seed 13, 120: 120 `agree` (52 I/N/U, 65 V/F/P, 3 V/F/U);
    slowest shard 446 s. logs/gen13.txt.
  - No SEPARATION, FLAG, POWER or BUG anywhere; nothing to minimize.
- Cross-checks:
  - part A (`node nested-oracle.mjs A amended`): 36 problems,
    0 mismatches, 163 s. part C (`C amended`): 6 problems, 0 mismatches.
    (Their output files were lost from the shared scratchpad; numbers
    are from the session transcript. Rerun to regenerate logs.)
  - brute (frozen bound 5e7): named 44 match / 31 skipped; seed 5
    80 / 40 skipped; seed 13 76 / 44 skipped; 0 mismatches.
    logs/brute-*.txt.
  - supplementary, NOT frozen (scratch copy, bound raised to 1e10):
    7 more named problems, all match (split twice,
    tyvar-divided-undeclared, fn-around-divided-bad, fn-codomain-divided,
    nested-alias-undeclared, split-undeclared).
    logs/brute-supplementary-1e10.txt.
- Power checks (scratch copies of sig-oracle + oracle, named set):
  - M3 (cell blocks unchecked): 19 `POWER` on broken controls, as
    predicted. logs/power/M3.txt.
  - M1 (no function skeletons): exactly `division-in-function`
    SEPARATION (beyond the grammar) and `function-from-rigid` FLAG,
    as predicted; minimizer shrank function-from-rigid's bounds.
    logs/power/M1.txt.

## Completed in the resumed task

- Re-ran A and C and retained their logs: A has 36 problems and zero
  mismatches; C has six problems and zero mismatches.
- Added `results.md` with frozen hashes, tallies, timings, brute skips,
  power-control status and the limits of the generated set.
- Reflowed the 84-character alias line in `d3-grammar.mjs` without a
  semantic change. The original frozen hash remains above; the amended
  file hash and unchanged list hashes are recorded in `results.md`.
- M2 remains a 47/75 partial control: 41 agree, 3 separations and 3
  flags. It is separate from the frozen confirmation run.

See `results.md` for completed results and reproduction commands.

## Reproduce (from research/division-campaign/oracle)

    node d3-oracle.mjs named --shard=i/10
    node d3-oracle.mjs gen 120 5 --shard=i/8
    node d3-oracle.mjs gen 120 13 --shard=i/8
    node d3-oracle.mjs brute named | brute gen 120 <seed>
    node d3-oracle.mjs list named | shasum -a 256   # freeze hash

## Uncommitted

Nothing in the repo after the checkpoint. Scratch copies remain in the
session scratchpad (power/M1, M2, M3, BR; no node_modules), to delete.
