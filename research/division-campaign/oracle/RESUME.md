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

## In flight when paused (killed)

- M2 (cell source = highest row only): 47 of 75 named done; 3
  SEPARATION (split x2, division-in-function) and 3 FLAG
  (shared-part-no-disjoint, types-independent, src-routeNarrowed).
  Detector fires as predicted; src-route not reached. logs/power/M2-partial.txt.
- supplementary brute 1e10-1e13: 65 of 75 named listed, 1 more match;
  the rest beyond 1e13 or unreached. logs/brute-supplementary-1e13-partial.txt.

## Next step

1. Optionally finish M2: copy sig-oracle and oracle to scratch, apply
   in nested-search.mjs `for (const src of [null, ...S])` ->
   `[null, S[S.length - 1]]`, run `node d3-oracle.mjs named
   --shard=i/2`, then delete the copy.
2. Rerun parts A and C to store logs (commands above).
3. Write results.md (tables: problems, agreement, flags; commands;
   timings) from logs/, then delete scratch copies
   (scratchpad/power/{M1,M2,M3,BR}) and commit.
4. Report: no separation within the frozen grammar; generator yields few
   P9s-incomplete problems (8 of 240), so generated runs have low power
   against division gaps; the named new challenges carry that load.

## Reproduce (from research/division-campaign/oracle)

    node d3-oracle.mjs named --shard=i/10
    node d3-oracle.mjs gen 120 5 --shard=i/8
    node d3-oracle.mjs gen 120 13 --shard=i/8
    node d3-oracle.mjs brute named | brute gen 120 <seed>
    node d3-oracle.mjs list named | shasum -a 256   # freeze hash

## Uncommitted

Nothing in the repo after the checkpoint. Scratch copies remain in the
session scratchpad (power/M1, M2, M3, BR; no node_modules), to delete.
