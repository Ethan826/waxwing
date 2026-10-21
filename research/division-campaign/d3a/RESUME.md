# Stream 2 (D3a attack): resume notes

Paused 2026-10-21 at the coordinator's request.

## Done (committed)

- Frozen grammars, bounds and problems: commit 56aa801.
- Lean refutation, finite base types:
  research/composition-proofs/Composition/TypedAttack/ShapeSplit.lean
  (`shapeSplit_valid`, `shapeSplit_validFin`, `shapeSplit_not_valid`,
  `u1_holds_iff`, `no_uniform_presence`; no `sorry`, standard axioms;
  built with `lake build Composition.TypedAttack.ShapeSplit`; not
  imported from Composition.lean, left to the owner).
- Runs finished: `check` (bt vs bounded.mjs 37/0 differ; search copy vs
  findNested 17/0 differ), R1, R2, R2W, R5, R5a. Results are written
  into attack.md (b).
- attack.md sections (a)-(e) drafted, including the positive argument.

## Original confirmation runs (incomplete)

The original R3 used 729 rigid assignments and was killed after about
40 minutes. Original R4 seed 5 at 500 problems was killed after about
40 minutes; seed 17 was not run. Neither original run has a result.

## Bounded diagnostics

- R3a was amended and committed before each replacement. The first
  reduced run used one unwritten label (27 assignments); the second also
  limited flexible field types to the rigid types. Both were stopped at
  120 seconds without output. Logs are in `../oracle/logs/R3a-timeout*.txt`.
- R4a completed five problems for each of seeds 5 and 17 with one
  unwritten label. Seed 5: two valid and uniform, three invalid. Seed 17:
  one valid and uniform, four invalid. The ten cases do not establish the
  result of the original 500-case runs. Logs are in `../oracle/logs/`.
- `attack.md` incorporates the finite-base follow-up: the generalized
  finite-base family differs from the singleton example and is not a
  Waxwing source theorem. `prose-review.md` retains the before/after
  prose catalogue.

There are no pending R3/R4 result placeholders. See `attack.md` for the
run limits and scope.

## Reproduction

From research/division-campaign/d3a/: `node run.mjs check|R1|R2|R2W|R3|R5|R5a`,
`node agreement.mjs <count> <seed>`. From research/composition-proofs/:
`lake build Composition.TypedAttack.ShapeSplit`.

## Uncommitted

Resumed work is recorded in the commits and logs on this branch.
