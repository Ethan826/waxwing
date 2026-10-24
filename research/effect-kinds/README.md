# Effect kinds: research reports and frozen predictions

Research only, 2026-10-24. Nothing here adopts a language rule, a
validator change or a theorem. Implementation, Task 4.6 and G-D1 stay
blocked.

The research note that frames this work is
`docs/plans/2026-10-24-effect-kinds-research.md`, written by another
session in the `integrate` worktree. When these files were committed it
was still uncommitted there, along with its editorial note
`docs/plans/2026-10-24-effect-kinds-prose-review.md`. This branch does
not copy or change either file. Read the note first: its §5 promises,
§7 cases E01-E16 and §8 passes P1-P6 are the frame for everything
below.

| File | What it is | Pass |
|---|---|---|
| [baseline-audit.md](baseline-audit.md) | the note's §6 claims about Waxwing checked against the code at `main` 2af6e40 | P2 input |
| [glossary-draft.md](glossary-draft.md) | candidate definitions of the promises, with the author's decisions | P1 draft |
| [correspondence.md](correspondence.md) | each promise mapped to published rules, owners and Waxwing departures | P2 |
| [predictions-e01-e16.md](predictions-e01-e16.md) | frozen fragments and predicted outcomes for Koka, Effekt, Unison, `effectful` and Waxwing | P3, before any run |
| [probes/](probes/) | the three Waxwing cases the author authorized (E06a, E15, E16's near miss): programs, commands, outputs | P3, partial |

How these were made. Four read-only agents wrote the reports. The
controller spot-checked two claims in the baseline audit against the
code (`crashCall` and the FX011 path) and checked nothing else in them.
Each report keeps its sources and its "not read" lists. The predictions
were fixed before anything ran. A later run that changes a fragment or a
prediction must label it as an amendment.

Two qualifications from the author (2026-10-24) apply to every file:
- Printing `main`'s result and the fatal defect report are I/O that no
  row records. They need an explicit observation boundary in any
  contract. Their existence alone does not show that ordinary
  function-level effect checking is unsound.
- Where a survey found no theorem, it says "no directly applicable
  theorem found in this survey", not that no published theorem covers
  the rules. Each definition of purity is attributed to its author and
  source.

Not done: no other language toolchain was installed and no other
language's program was run. The rest of E01-E16 waits for that.
