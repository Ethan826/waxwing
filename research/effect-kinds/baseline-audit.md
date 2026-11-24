# Waxwing's effect baseline, checked against the code

Read-only audit by an agent, 2026-10-24, in the `integrate` worktree at
`main` 2af6e40. No build, verify or program was run. "Read" means
verified by reading the cited lines; "inferred" means reasoning from
them. The controller re-read `crashCall` (Check/Operation.purs:96-116)
and Resolve/Handler.purs `effectIdOf` and confirmed both.

Observation boundary (author's qualification). Two outputs below are
I/O that no row records: printing `main`'s result and the fatal defect
report. A contract must say whether they are inside or outside what it
observes. Their existence alone does not show that ordinary
function-level effect checking is unsound.

## The note's §6 claims

| §6 claim | Verdict | Evidence |
|---|---|---|
| Effects and `Fail(E)` families are user vocabulary | confirmed | built-ins in src/Features/Resolve/Builtin.purs:32-53; a user `effect Console` or `effect Fail` is E_DUPLICATE (Resolve/Effect.purs:95-100); `Fail` keyed by payload head, keyless payloads refused (Resolve/Row.purs:63-90) |
| Handlers are dynamically scoped | confirmed (read) | every function takes `ctx *waxwingCtx` first (Format/Go/Context.purs:1-6); `waxwingFind` walks `ctx.outer` to the innermost frame with the key (:135-143); a clause runs with its frame's outer context (Go/Effect.purs:1-10, 47-60); test/fx-run-programs.mjs:10-15 |
| Closures keep no installed handler | confirmed by reading; no dedicated test | lambdas and clauses are lifted functions taking the caller's ctx (Go/Lambda.purs:62-75); only locals are captured |
| `Console` and `Fail` are compiler-provided | confirmed | Builtin.purs:32-53; `EffectRef = UserEffect \| FailEffect \| ConsoleEffect` (Domain/Row.purs:50) |
| Their handler types are uninhabited (FX011) | partly | no value can be built, but only because `resolveHandler` returns `Internal "Invalid handler effect"` for a non-user effect (Resolve/Handler.purs:63-68); the probe table pins E_INTERNAL (test/fx008-probe-table-rev6.mjs:45-46); `Handler(Console with pure)` is writable and accepted as a parameter (:47-48; test/fx020-builtins.test.mjs:60-62); BACKLOG FX011 lists this as an open defect, not a rule; `handler Fail(E) {}` takes the same path |
| Printing is a compiler special case | confirmed | `PrintOperation` built in (Builtin.purs:11-20); typing consumes `Console` (Check/Operation.purs:60-77); lowering is `fmt.Println` with no frame lookup (Go/Expression.purs:125-130); `main`'s result printed by a wrapper (Go.purs:80-94) |
| Only immediate-resumption clauses and aborting failures | confirmed | `ctl`/`resume` reserved (Lex/Chars.purs:74-75), E_SYNTAX "General control (ctl/resume) is not supported yet" (Parse/Expression.purs:148-149; Parse/Handler.purs:70-77); `Fail` lowers to a Go panic recovered by `waxwingHandle` (Context.purs:145-175) |
| `nofail` constrains typed abort for cleanup | confirmed | marks in Domain/Row.purs:42; Console always N, Fail unmarked (:114-118); `nofail Fail(E)` is E_TYPE (Resolve/Row.purs:58-62); frame checks Check/Frames.purs:43-70; defer check Check/Defer.purs:38-60; marks erased in the IR (Domain/IR/Internal.purs:13-30) |
| It does not establish external purity or termination | confirmed | no mark code mentions I/O or termination |
| `with pure` does not exclude `crash` | confirmed | `crashCall`: "`with pure` promises neither" (Operation.purs:96-116); language.md:496-497 |
| `with pure` does not exclude divergence | confirmed | no termination check; `fn loop(): a = loop();` accepted and run (test/poly-run.test.mjs:58-59, test/compiler.test.mjs:17-18) |
| No mutable state | confirmed | no reference, assignment or cell in the IR (IR/Internal.purs:133-166) |
| No recording fakes | confirmed (inferred) | clauses return values from arguments and captured immutable locals; examples/services.wxw:29-33 has constant fakes only |

Corrections to the note's wording: `with pure` is the closed empty row
(Parse/Row.purs:44-50; Resolve/Row.purs:30), while a row written
without a tail still gets the ambient tail (Resolve/Row.purs:24-29).
EF-FFI's "JS then LLVM" is ADR 015's direction; no JS backend or FFI
exists today.

## Abnormal termination without `Fail` in the row

| Path | Typed? | At runtime |
|---|---|---|
| `crash(v)` | no; allowed under `with pure` | panics with `waxwingDefect`; deferred expressions run; stderr report and `os.Exit(1)` (Go/Cleanup.purs:59-61, 120-133); test/fx-cleanup.test.mjs:30-46 |
| non-exhaustive match | refused at compile time (E_NON_EXHAUSTIVE, Check/Coverage.purs:103-113) | the Go fallthrough panic guards malformed values only (Go/Match.purs:86) |
| division, indexing | not possible (no `*`, `/`, `%`, arrays, or Text indexing) | — |
| Int overflow | not an abort: int32 wraps (Go/Data.purs:42; test/compiler.test.mjs:92-93) | — |
| missing handler | untyped guard, believed unreachable when well typed (`main` may perform only Console, Check/Entry.purs:28-58); no proof or test | `panic("no handler for …")` (Context.purs:135-143); reachable historically through FX009 |
| handler type assertion, malformed value | untyped guards, unreachable without FFI (inferred) | Go panic |
| Go runtime panics | treated as recoverable defects; `handle` never catches one (Context.purs:161-175) | none reachable from well-typed code found (inferred) |
| cleanup crashes while an abort unwinds | the typed abort is in the row but never delivered | `fail(T): V` then `cleanup failed: …`, exit 1 (Cleanup.purs:93-116) |
| stack exhaustion, out of memory | not typed | Go fatal error; cleanup skipped; exit 2 by Go's default (ADR 010:143-144; concurrency design :459) |
| program without `crash` or `defer` | — | no `waxwingReport`; a guard panic gets Go's default output and exit 2 (Cleanup.purs:27-50) |

## Divergence, external I/O, handled failure, backends

- **Divergence.** Recursion is unrestricted, including in `pure`
  functions, handler clauses and `defer`. There is no termination
  check. In practice (inferred) infinite recursion grows the Go stack
  to a fatal overflow, since Go does not eliminate tail calls.
- **External I/O.** `Console.print` (stdout, `Console` label); `main`'s
  result (stdout, no label); the defect report (stderr plus exit, no
  label). Nothing else: no input, clock, randomness, file, network or
  environment primitive, and the generated Go imports only `fmt` and
  `os` (Go.purs:95-101). No FFI (BACKLOG I001 planned; ADR 015:57 calls a
  future foreign declaration "a trusted contract").
- **A fully handled `Fail`** stays out of the row: `handleFailure`
  extends only the body's row (Check/Handle.purs:23-48, 75-80). No test
  combines `with pure` with `handle` (prediction P1 below).
- **Backend.** Go only; rows and marks are erased in the IR; handlers
  are a runtime frame chain; aborts are Go panics aimed at markers; a
  program with no effect construct emits no context.

## Unrun predictions from this audit

- P1: `type E = E; fn safe(n: Int): Int with pure = handle Fail.fail(E)
  { fail(error: E) => n }; fn main(): Int = safe(4);` compiles, prints
  `4`, exit 0.
- P2: `fn boom(n: Int): Int with pure = crash(n); fn main(): Int =
  boom(3);` compiles; stderr `crash: 3`; exit 1.
- P3: `fn spin(n: Int): Int with pure = spin(n + 1); fn main(): Int =
  spin(0);` compiles; Go `fatal error: stack overflow`; exit 2.
- P4: a diverging `defer` in a pure function: accepted; same fatal
  overflow; the result never printed.
- P5: `defer crash(1)` before `Fail.fail(E)` under a `handle`: stderr
  `fail(E): E` then `cleanup failed: crash: 1`; exit 1.
- P6: `with handler Console { print(n) => () } { … }`: E_INTERNAL
  `Invalid handler effect` (already pinned in the probe table).

Agent's rulings, kept: FX011 marked "partly"; the missing-handler guard
listed as believed unreachable; divergence as stack overflow inferred,
not run; Q5 rests on tests of `main` without a row; "exit 2" from the
concurrency design document, not checked against Go's source.
