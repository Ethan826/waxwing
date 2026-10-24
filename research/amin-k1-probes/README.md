# K1 probes: E2's rigid clause against runs

Evidence for r0-amin-statements.md §13b K1 (dossier §18.83 item 2).
Written by an independent agent on 2026-10-24 in a scratch directory and
copied here by the controller. The controller reran p7, p7h, c3 and the
sim6 and sim7 simulations and got the outputs quoted below. The other
verdicts are the agent's runs.

Compiler: this worktree's build (`node scripts/waxwing.mjs emit IN OUT`
or `run IN`), src unchanged since 0c2ad60. Simulations: `go run
main.go` in each `sim*` directory, with `GOCACHE` set to a scratch
cache.

| File | What it is | Today |
|---|---|---|
| p1-k1.wxw | K1's program: R ending in rigid ϱ installed under `Log + ϱ` | refused, E_EFFECT "st performs Log, which its signature does not allow" |
| p2-install-payload.wxw | installation; `Out(Text)` outside `Out(Int)`; the clause performs `Out.out("hi")` | refused (same rule) |
| p3, p2i | the instance written monomorphically, or inlined | refused, E_TYPE "Expected Out(Int), found Out(Text)" |
| p4-install-mark.wxw | installation; failing `Log` inside printing `Log`; the clause defers `Log.log(7)` | refused (same rule) |
| p4i | inlined instance | refused, "defer must not fail, but it performs Log, whose handler may fail" |
| p5 | written handler type; refused by the K1 rule again, so not clean instance evidence | refused |
| p6-call-payload.wxw | call stage `a(q: … with ...e)` with `Out(Int) + ...e` | refused, the FX017 diagnostic |
| p6i | inlined | refused, E_TYPE |
| p7-call-mark.wxw | call stage with `Log + ...e`; the lambda defers `Log.log(7)` | refused, FX017 (controller rerun) |
| p7i, p7h | inlined; FX017's hinted row | refused, the `defer` rule (p7h: controller rerun) |
| p8, p9 | a rigid clause row into a larger R | refused |
| c1-c4 (.wxw, .go) | accepted controls: equal-row payload, equal-row dispatch, `nofail Log` callee with the failing handler outer, its installation version | accepted; c3 prints `7`, `1` (controller rerun) |
| s1, s1h | a safe callback the proposed premise refuses; its hinted twin | s1 refused (FX017); s1h prints `1`, `2` |
| sim6/main.go | c1.go with the lambda's perform changed to the `Out(Text)` operation: the Go a-min would compile for p6 | `panic: interface conversion: interface {} is *main.waxwingEff1, not *main.waxwingEff0`, exit 2 (controller rerun) |
| sim7/main.go | c3.go with the two `Log` handler literals swapped (the diff is those two lines): the Go for p7 | stderr `fail(E): E`, exit 1; the `handle` never runs (controller rerun) |
| sim4/main.go | c4.go swapped the same way: the Go for p4 | `fail(E): E`, exit 1 |

Why a simulation stands for the program: rows and marks are erased
before Go is generated (docs/language.md), so a program the type
checker refuses compiles to the same Go as its accepted twin, apart from
which handler is installed where. The patched Go may differ from a
compiled program in names, not in dispatch logic.

Conclusion and proposed premise: r0-amin-statements.md §13b, K1.
