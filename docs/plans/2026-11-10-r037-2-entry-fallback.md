# R037 (2): Entry's fail-open fallback (2026-11-10)

Investigation authorized by dossier §18.163 (3) and §18.176. Evidence
only; no src change. Source at 374dad39 (src identical to af830d41).

## The site

src/Features/Check/Entry.purs:43-46, `main`'s boundary check:

```purescript
Row labels _ =
  case resolve state.subst (flexible (TFun TUnit env.current TUnit)) of
    TFun _ row _ → row
    _ → Row [] Nothing
```

`check` then zips `labels` with their occurrences and rejects the first
label that is not Console. If the second arm runs, `labels` is empty, so
nothing is checked and `main` is accepted whatever it performs.

## When it runs: the preservation argument

On today's code the arm cannot run. Each step keeps the outer `TFun`:

1. `flexible` is `rename toFlex`, which is `substitute`. Its arrow arm
   rebuilds the spine by `foldStages` over `stagesThrough identity`
   (Domain/Type/Core.purs:164-171). For `TFun TUnit r TUnit`,
   `arrowCount` is 1, so there is one stage and the result is a `TFun`.
2. `resolve` (Subst.purs:186-201) first calls `walk`, which returns any
   non-`TVar` unchanged (Subst.purs:147-149). The arrow arm then
   rebuilds through `stagesThrough (walk subst)`. `walk` maps `TFun` to
   itself and `TUnit` to `TUnit`, so `arrowCount` is again 1 and
   `foldStages` builds one `TFun`.

The arm runs only if one of these stops preserving the arrow: a change to
`substitute`, `stagesThrough`, `foldStages`, `arrowCount`, `walk` or
`resolve`'s arrow arm. Nothing in the type system enforces it; the
argument above is the only guard.

A second, related site in the same function: `Array.zip labels
(occurrences ...)` truncates to the shorter list, so a label with no
occurrence would go unchecked. The lengths agree today: `resolveRow` goes
through `walkRow`, and `occurrencesAt` through `RowSide.expanded`. Both
splice the tail's bindings through `boundAt` until it is unbound, in the
same order, and `resolveLabel` maps labels one to one. This is also
preserved by argument only.

## What it masks: the reproducer

The planted defect follows the return packet's example
(docs/plans/2026-11-08-return-packet.md §6): a `resolve` that returns a
non-arrow. It is planted in a scratch copy of compiled `output/`, at
Entry's call only, by research/r037-2-entry-fallback/plant.mjs (`open`
plants the defect, and `closed` also replaces the fallback with an
`Internal BodyState` diagnostic). The integration tree's src and output
are untouched. Raw log: .build/evidence/2026-11-10-r037-2/runs.log.

Probes (research/r037-2-entry-fallback/*.wxw.txt), run with
`waxwing run`:

| Probe | Today | Planted, fallback as written | Planted, fail-closed |
|---|---|---|---|
| p1: `main` performs user `Log` | E_EFFECT "Unhandled Log in main", exit 1 | compiles; program panics "no handler for Log", E_TOOL, exit 1 | E_INTERNAL, exit 1 |
| p2: `main` performs `Fail(Boom)` | E_EFFECT "Unhandled Fail(Boom) in main", exit 1 | compiles; panics "no handler for Fail", E_TOOL, exit 1 | E_INTERNAL, exit 1 |
| p3: `main` performs Console only | prints, exit 0 | prints, exit 0 | E_INTERNAL, exit 1 |
| p4: pinned unhandled-effect audit source | E_EFFECT (row mismatch, before Entry) | unchanged | unchanged |

`waxwing emit` on p1: exit 1 today, exit 0 under the plant. The compiler
reports success and writes Go.

The defect it masks is a broken arrow-preservation invariant in the
substitution machinery: a checker defect, not a user error.

## User-visible result

With the defect present, a program whose `main` performs any effect but
Console compiles without a diagnostic. `emit` and `build` succeed. The
program then panics at run time when it first performs the effect, with
a Go stack trace naming generated code (E_TOOL from `run`). The user
sees a crash at run time in place of the compile-time "Unhandled X in
main" and its notes. Programs that perform only Console behave
correctly. Shadow minting (§18.170) did not prevent acceptance in this
run, since the shadow result does not decide acceptance.

The packet predicted silent acceptance. The observed outcome is
acceptance followed by a run-time panic, which supersedes the reasoned
prediction.

## Proposed repair (not implemented)

Make the arm impossible to write instead of choosing what it returns:

1. Row-level conversion: a `renameRow` beside `rename` in
   Domain/Type/Core.purs, built from `substituteRow`. `Scheme.flexibleRow`
   becomes `renameRow toFlex`. This removes Scheme.purs:141-144's
   `Meta 0` arm too, which Entry's `occurrences` depends on.
2. Entry's `labels` become `resolveRow state.subst (flexibleRow
   env.current)`, with no `TFun` wrapper and no partial match.
   `resolvedRow` (Entry.purs:22-26) gets the same treatment with a row-level
   `opened`.
3. Pair each label with its occurrence from one walk (the entries of
   `expanded subst (written span row)`, each label resolved), replacing
   the zip, so no length invariant is left.

Predicted effect on acceptance and diagnostics: none on any reachable
input. The arm and the truncation never run (argument above), and the
row operations compute what the arrow round trip computes. No new
diagnostic is added, since no arm is left to report. This is a
prediction. The check is that pins and the regression rows do not move
under a routine verify, plus the comparison and protocol repeated on the
new src (any src change makes the gate's records stale). If anything
moves, that is a stop, reported with the measured losses.

A restored-defect check for the repair: plant.mjs against the pre-repair
output shows the defect is detectable (p1 accepted). After the repair,
Entry has no `TFun` round trip to plant into. The behavior is guarded by
the existing "Unhandled ... in main" tests (for example
test/fx-diagnostic-origins.test.mjs, seven cases;
test/fx-scale-labels.test.mjs; test/regression-fx008.mjs).

The other R037 (2) sites (Walked, DeclarationUse, Function, Body,
Desugar, Core) are outside this step.

## Repair (§18.178, implemented)

Authorized by the author (§18.178). Scope kept to row conversion, Entry's
two wrapper removals, and one-walk pairing.

- Domain/Type/Core.purs: `renameRow change = substituteRow (renaming
  change)`, beside `rename`, which now shares `renaming`.
- Scheme.purs: `flexibleRow = renameRow toFlex`, with no `Meta 0` arm, and a
  new `checkedRow = renameRow toOpen`. `toFlex` and `toOpen` move to the
  top level unchanged.
- Entry.purs: `resolvedRow subst row = checkedRow (resolveRow subst
  (flexibleRow row))`. The new `finalEntries` resolves each entry of
  `expanded subst (written span (flexibleRow row))`, and `check` traverses
  it. There is no `TFun`, no partial match and no zip.

Why each is equal to the old form on every input: `substitute` on `TFun
TUnit r TUnit` takes one stage and rebuilds `TFun TUnit (substituteRow s r)
TUnit`, so the old wrapped row was `substituteRow s r`, which is
`renameRow`. `resolve` on that arrow likewise yields `resolveRow subst r`.
`walkRow` and `expanded` follow the same `boundAt` chain in the same order,
so the old zip never truncated. `flexibleRow`'s other callers (Defer,
Callback, Sync, Consume, Walked, ArgumentRow) therefore see equal values.
The independent review re-derived all three arguments and found them
sound.

Checks:
- test/r0-entry-rows.test.mjs (9 tests). The conversions and
  `resolvedRow` are compared against the old arrow round trip on 400
  generated rows plus fixed ones (repeated labels, closed, bare and rigid
  tails). `finalEntries` is compared against the old zip on 400 cases (45
  with tail-expanded occurrences, 154 with duplicate labels, measured).
  Fixed cases cover a one-hop tail with duplicates and a two-hop chain.
  Three end-to-end rejections are included.
- The seven end-to-end probes (the three tests among them) give identical
  diagnostics on the pre-repair compiler (an isolated build of 7153f66d)
  and the repaired one. Programs that perform only Console still compile.
- Restored-defect detection on the new path
  (research/r037-2-entry-fallback/mutants.mjs, compiled output patched in
  an isolated copy; log .build/evidence/2026-11-10-r037-2/mutants.log):

| Mutant | r0-entry-rows | fx-diagnostic-origins | fx-scale-labels |
|---|---|---|---|
| effect-check bypass (no entries) | 6 fail | 5 fail | 1 fail |
| truncation after the first label | 6 fail | 0 | 0 |
| truncation of the last label (zip analog) | 6 fail | 5 fail | 0 |
| no tail expansion | 6 fail | 3 fail | 1 fail |
| occurrences paired with the wrong labels | 6 fail | 0 | 0 |
| renameRow merges repeated labels | 2 fail | 1 fail | 0 |

  The pre-existing suites miss truncation after the first label and wrong
  pairing; only the new tests catch them.
- plant.mjs applies to pre-repair output only (its site is gone).
  docs/findings.md's mutant M5 record names that site and stays as a
  record of its run.

Independent review (2026-11-10, of bfd3f0e4): no behavioral defect. Its
findings and their disposition:
- Activation-gate test red: expected, because src changed. The fix is to
  repeat the comparison and protocol and repoint the records.
- Mutant results unrecorded: recorded here.
- Stale citations: docs/findings.md fixed; plant.mjs annotated; RESUME
  updated.
- Test comments inaccurate, no multi-hop case: fixed, and a two-hop test
  added.
- `openedRow` collided with Stages' and Generate's minting `openedRow`:
  renamed `checkedRow`.
