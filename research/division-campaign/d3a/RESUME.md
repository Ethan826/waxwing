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

## In flight (killed, no results)

- R3 `pigeonhole` (`node run.mjs R3`): bounded search over 729 rigid
  assignments with nine flexible rows did not finish in about 40
  minutes, even after reordering atoms.
- R4 (`node agreement.mjs 500 5`, then seed 17): seed 5 did not finish
  in about 40 minutes; no line was printed (no separation reported
  before the kill, but the run is incomplete and proves nothing).

attack.md still has the placeholders `RESULT-R3` and `RESULT-R4`, and
its Verdict item 3 claims R3/R4 outcomes that are NOT yet established.
Fix those before reporting.

## Exact next step

1. Make R3 tractable: reduce `pigeonhole`'s rigid domain (for example
   unwritten labels `z1` only: 27 rigid assignments), recorded as an
   amendment in attack.md, then `node run.mjs R3`.
2. Make R4 tractable: add a progress line and a per-problem time log to
   agreement.mjs, try `node agreement.mjs 20 5` to find the slow
   problems, and if needed record a smaller count or bound as an
   amendment; then run seeds 5 and 17.
3. Fill `RESULT-R3`, `RESULT-R4`, correct Verdict item 3, run
   `node scripts/width.mjs`, run `lake build` (default target), commit,
   and report.

## Reproduction

From research/division-campaign/d3a/: `node run.mjs check|R1|R2|R2W|R3|R5|R5a`,
`node agreement.mjs <count> <seed>`. From research/composition-proofs/:
`lake build Composition.TypedAttack.ShapeSplit`.

## Uncommitted

Nothing after the paused checkpoint commits. Scratch output in the
session scratchpad only (no repo copies).
