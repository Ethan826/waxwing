# Slicing validation (2026-10-21)

Worktree: /private/tmp/waxwing-campaign-slicing.
Pinned Lean: leanprover/lean4:v4.35.0.

- `lake build` from research/composition-proofs: success, 102 jobs,
  no warnings or errors. This compiles proposed statements as Prop
  definitions; no theorem in the new Slice modules is proved or assumed.
- SliceExamples guards exercise five computed slicing examples, including
  the corrected two distinct relevant pairs out of four in twoParts.
- SlicePatternExamples guards cover all 58 CheckData exports: two-way
  set coverage against patterns filtered by consistentS, and pointwise
  equality of checkAllCons and checkAll on their exported tables.
  These are finite checks, not proofs of CP or C4 for all inputs/tables.
- `node research/division-campaign/slicing/hunt.mjs`: 20 named problems,
  0 flagged, 2 with zero rigid instances. All nine naive failure shapes
  remain detected. Zero-instance cases are vacuity-one-slice and
  vacuity-ground-D, whose D is deliberately impossible.
- `node research/division-campaign/slicing/generated.mjs pair 30 1`:
  30 problems, 28 multi-slice, 4 zero-instance, 26 non-vacuous,
  60 rigid instances actually checked. No S1, P9s-sliced, S2 or
  flexLinked disagreement. Naive disagreements: noVacuity 3,
  rowsOnly 3, topLevel 3, dropGround 4, ignoreD 3, measured 4.
  Whole valid 5, P9s accepted 1. No oracle bounds were widened.

Historical 1,100 generated runs remain recorded in statements.md, not
rerun. Their zero-instance coverage was not reported. S1rAcc/S2r have
no fresh bounded enumeration here. Star has no new scalability result;
its useful-scale benchmark obligation remains open.

No npm command ran: the coordinator expressly scoped this stream to
bounded research checks and the pinned Lean library. Full compiler
verification is outside this stream's authorization. No production
source/test, solver, D4, central measurement/dossier edits or push.
