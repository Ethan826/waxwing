# D3b stream: resume notes (paused 2026-10-21)

Branch: worktree-agent-aa6be01f97f93df27, from b5647cc. Commits:
6e8bd62 (statements, transfer, equation-free, route), 57265e9 (flat
hypotheses, vacuity, completeness).

## Done

- Statements: Composition/Typed/Model.lean, Typed/Defs.lean.
- Proved (no sorry; propext, Classical.choice, Quot.sound only):
  `transfer`, `d3bSound`, `d3bValidAll`, `d3bEqFree`, `d3bFlat`,
  `instanceIffUnifiable`, `d3bComplete`; examples `routeP_valid`,
  `splitFree_unsolvable`, `splitFree_not_valid`, `agreeP_valid`.
- Open (reviewed, believed true, not proved): `Universality`,
  `CellIndependence`, `MGUExists` (hence general `D3bExists`).
- Adversarial review (two passes, plus a pass on D3bFlat): no false or
  vacuous statement. Gaps to record: §6 needs the reviewer's steps
  (ii)-(v); §7 must describe `dn` as reading labels, and repeat the
  fresh-bases caveat (finite bases: completeness open); thetaFlat's
  docstring no longer claims it equals the mgu classes; reviewer's
  suggested next statements: P9s no-loss (`Accepts P → HasInstance P π
  → SolvableFinAt P (thetaStar P π τ)`), and thetaFlat = thetaStar up
  to renaming. Item 7 (add Scoped to D3bComplete) was withdrawn.
- Oracle (bounded): named 58 problems, 0 failures, all verdicts as
  expected (36 valid, 22 invalid); generated 120+120 (seeds 3, 11),
  0 failures; mutants: noUnify puts θ* outside D (16 inD fails),
  allCells fails independence (9).

## In flight (stopped, not finished)

- construction.md is stale: §10 status table says "to prove", §15
  Results empty, no §16 review record. A ready edit script was in the
  scratchpad (doc.py); redo it: update §6, §7, §8 (flat fragment),
  §10 table, §12 rows, and write §15 results and §16 review findings.
- Runs killed: rerun of named problems (adds `record-constant`), and the
  `contextFree` mutant (never completed).

## Exact next step

Update construction.md as above, rerun `node run.mjs 0 3` and
`node run.mjs 0 3 contextFree`, record results, commit, report.
Optionally widen RIGID_FIELDS in run.mjs (reviewer: ties like
`{f: α} = {...s}` get no bounded instances now).

## Reproduce

    cd research/composition-proofs && lake build
    lake env lean <file with #print axioms transfer ... agreeP_valid>
    cd research/division-campaign/d3b && node run.mjs 0 3
    node run.mjs 120 3; node run.mjs 120 11; node run.mjs 0 3 noUnify

Uncommitted: nothing besides this file at pause time.
