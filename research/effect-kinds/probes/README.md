# Three Waxwing probes: E06a, E15, E16's near miss

Authorized by the author on 2026-10-24: run these three cases with the
existing compiler, keeping the frozen predictions, sources, commands and
outputs, disagreements included. No toolchain was installed.

Run on 2026-10-24 by the controller, on this branch at `main` 2af6e40,
after `npm run build` in this worktree (exit 0). Node v26.6.0, Go
1.26.4 darwin/arm64. Command for each file:
`node scripts/waxwing.mjs run research/effect-kinds/probes/<case>.wxw.txt`,
stdout and stderr captured to `<case>.stdout` and `<case>.stderr`, the
exit status in `<case>.exit`. Each case was run once.

The frozen predictions are in
[../predictions-e01-e16.md](../predictions-e01-e16.md)
(fixed before any run). Amendments are labelled A1-A3 below.

Storage (2026-10-24, dossier §18.87 on branch r0-t2-d1). The programs
are stored as `<case>.wxw.txt`, renamed from `.wxw` with their contents
unchanged, so that they never enter the pinned R0 corpus (which counts
every tracked `.wxw` file) if this branch is combined with the R0 stack.
The compiler runs them as named. Rerun after the rename, at the same
build: all six give identical stdout and exit status, and identical
stderr apart from the file name inside the diagnostics. The captured
`.stderr` files keep the original runs' `.wxw` paths. The frozen
command in predictions-e01-e16.md says `EXXy.wxw`; running a `.wxw.txt`
file is a labelled, non-semantic amendment (A4).

## Results

| Case | Frozen prediction | Observed | Graded |
|---|---|---|---|
| E06a `e06a.wxw.txt` | compile **unknown** (FX017's equal-row rule might reject a returned arrow called directly); prints `2` if accepted | accepted; stdout `2`; exit 0 | unknown settled: accepted |
| E06b `e06b.wxw.txt` (companion, run to read E06a against) | compile **accepted** ("rows are equal"); prints `1` | **refused**, exit 1: E_EFFECT "Console + Console + ... and Console + ... cannot be made equal: both end in ..." at `p(())` | **disagreement**: prediction refuted |
| E15 `e15.wxw.txt` | compile **unknown** (FX018 checks a local called under `with` against the installed labels); prints `2` if accepted | accepted; stdout `2`; exit 0 | unknown settled: accepted; runtime confirmed |
| E16 near miss `e16n.wxw.txt` | compile **unknown** (the Cleanup text says a deferred callback must be `with pure`; FX008 marks may admit `with nofail Log`) | refused, exit 1: E_EFFECT "bracket performs Log, which its signature does not allow", noting "cleanup registered here must not fail" and "the signature of bracket has an ambient row" | settled: refused, but for the frozen text's own row (A2) |
| E16 near miss, amended `e16n-amended.wxw.txt` | (A2, not frozen) | refused, exit 1: E_EFFECT "defer must not fail, but it may perform any effect of ...", "any effect of ... comes from this function value" | refused by the rigid-tail rule of `defer` |
| E16b `e16b.wxw.txt` (the library bracket with a `pure` release) | compile **accepted** | accepted; stdout `0`; exit 0 | confirmed |

## Amendments

- **A1 (scaffolding).** E15's frozen text uses `Ask` without declaring
  it; `effect Ask { fn ask(): Int; };` was added. E16's frozen text is a
  function only; `effect Log { fn log(n: Int): Unit; };` and `fn
  main(): Int = 0;` were added. Lines were rewrapped to stay within 80
  columns. No construct outside the frozen Waxwing fragment was used.
- **A2 (E16 near miss).** The frozen near miss gives `bracket` no
  `with` row, so it is refused because `bracket` itself may not perform
  `Log`. That answers the frozen question only indirectly. The amended
  file gives `bracket` the row `with nofail Log`. It is still refused,
  now because `release`'s row `nofail Log` ends in the ambient row
  variable, and `defer` refuses a row with a rigid tail (FX008: a
  deferred expression may not perform an unknown effect). In this
  fragment no spelling of a `nofail Log` callback row is closed, so a
  deferred callback must be `with pure` in practice.
- **A3 (companion runs).** E06b and E16b are the frozen pairs' other
  sides. They were run to read E06a and the near miss against them;
  they were not on the author's list.

## What the results say (reasoned, not further tested)

- **E06b's refusal is the finding.** Calling a returned `Console`
  callback through a `let` in a `Console` function is refused with a
  row-equality error that names `Console + Console + ...`. FX017's
  equal-row rule for function values (the callback's row must equal the
  caller's) meets the consumption of `Console` at the call. E06a, whose
  arrow is `with pure`, is accepted. Whether this refusal is intended
  (FX017's documented limit) or a defect was not investigated. It is
  recorded here as a disagreement with the frozen prediction, and for
  BACKLOG triage.
- **E15 confirms dynamic handling as documented.** The closure performs
  `Ask.ask()` where it is called, under the inner handler, and prints
  `2`. This is the deliberate dynamic scope that docs/language.md
  describes ("a closure keeps no handler"). It is also the shape that
  Zhang and Myers (POPL 2019, §2) call accidental handling. Whether
  Waxwing wants that is a design question (EF-ROOT, E15's row in the
  note's §7). The run shows behaviour, not a verdict.
