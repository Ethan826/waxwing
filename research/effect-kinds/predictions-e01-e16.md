# E01-E16: frozen fragments and predicted outcomes

Pre-registration for the note's §7 cases, written by a read-only agent
on 2026-10-24 **before any program ran**. Every outcome here is an
**unrun prediction**. The text below is the agent's, reformatted only;
no prediction was changed after the three Waxwing probes ran (their
results are in probes/README.md). A later run that changes a fragment,
a program or a prediction must label it as an amendment.

Baseline for Waxwing: `main` 2af6e40 (docs/language.md lexical grammar
and "Effects": Rows, Handlers, Cleanup, Defects, Limits;
examples/services.wxw; test/fx-cleanup-programs.mjs;
test/fx-services-programs.mjs). Syntax labels: **attested** (the shape
appears in a cited doc, test or library) and **illustrative** (composed
from the documented grammar). Pair labels: (a)/(b) the separating pair,
(n) a near miss that must be rejected, (p) a probe.

## 0. Frozen fragments

- **Koka v3.2.9, C backend (JS only for E13).** Top-level `fun`, `pub
  fun main()`; `effect` with `fun`/`ctl` operations and the `effect ctl
  op(...) : t` shorthand; `with handler { return(x) …; fun op …; ctl op
  … }` and the `with fun`, `with ctl`, `with return` shorthands;
  `resume` in `ctl` clauses only; `val`; `var` with `:=`; `ref`, `!`,
  `:=` (E07/E08 only); `if/elif/else`; `match` on `list` and `result`;
  `fn(){…}`; trailing lambdas. Effects: `total`, `exn`, `div`, `ndet`,
  `console`, `pure`, `st<h>`, user effects, rows `<l1,l2|e>`. Library:
  `println`, `show`, `throw`, `try{}`, `impossible`, `trace` (E05 probe
  only), `finally`, `pseudo-random`, `random-int`, `srandom-int`,
  `strong-random`, `ticks`, `duration/milli-seconds`; imports
  `std/num/random`, `std/time/timer`, `std/time/duration`. FFI: `extern`
  with a `js inline` body (E13 only). Excluded: `raw ctl`, `initially`,
  named, linear and scoped handlers, `mask`, `pretend-*`, authored
  `unsafe-*`, async.
- **Effekt v0.82.0, `--backend js` (E12 also `--backend llvm`).** `def`,
  `def main()`, `interface`, singleton `effect`, `do op(..)`, `try {…}
  with I { def op(x) = … }`, named capabilities `with x: I`, `resume`,
  `record`, `val`, `var`, `region r { var x in r = … }` (E08 only),
  `box`, capture annotations `at {…}`, effect annotations `/ {…}`, `if`;
  imports `exception`, `ref`, `random`; library `println`, `panic`,
  `show`, `raise`, `on[E].finalize`, `minstd`, `devurandom`,
  `randomInt32`, `ref`, `get`, `set`; FFI `extern def … at C: T = js
  "…"` (E03/E13 only). Excluded: promises and async, bidirectional
  effects, namespaces, multi-backend externs, the REPL.
- **Unison UCM 1.5.0 with `@unison/base` 7.20.0, run as transcripts.**
  Typed term definitions; `ability X where op : T ->{X} R`; `handle e
  with cases { op a -> k } … { r } …`; `do` and `'` thunks; forcing with
  `()` or `!`; `if`; `match`; `Either`, `Optional`, tuples, `:+`. Base:
  `printLine`, `Nat.toText`, `bug`, `IO.catchAll`, `Debug.trace` (probe),
  `Exception.raise`, `failure`, `catch`, `finally`, `abort`,
  `Abort.toOptional!`, `Random.splitmix`, `Random.run`, `Random.nat`,
  `Scope.run`, `Scope.ref`, `Ref.read`, `Ref.write`,
  `time.Clock.realtime`, `Instant.toRFC2822`, `unsafe.coerceAbilities`
  (E13), `Nat.drop`. Excluded: the base `FFI` namespace, threads,
  `Exception.unsafeRun!`.
- **Haskell, GHC 9.10.x, `effectful-core` 2.6.1.0 (E01, E02, E13
  only).** `base`, `effectful-core ==2.6.1.0`, `exceptions`; modules
  `Effectful` (`Eff`, `runPureEff`, `runEff`, `IOE`, `liftIO`, `:>`),
  `Effectful.Error.Static` (`throwError`, `runErrorNoCallStack`),
  `Effectful.Dispatch.Static` (`unsafeEff_`), `Control.Monad.Catch`
  (`throwM`); extensions DataKinds, TypeApplications, FlexibleContexts,
  TypeOperators. Excluded: direct `unsafePerformIO`,
  `Effectful.Exception`.
- **Waxwing today (2af6e40).** `type` with constructors; `fn` with
  required signatures, `with L1 + L2`, `with pure`, `nofail` marks;
  `effect E { fn op(..): T; };`; qualified `E.op(..)`; built-ins
  `Fail(e)` (`Fail.fail`), `Console.print`, `crash`; `handler L { op(x)
  => e }`; `with h { … }`; `handle e { fail(error: T) => r }`; `defer
  e;`; blocks `{ let x = e; e }`; lambdas `fn(x: T) => e`; `if`; Int,
  Unit, `()`; `+`, `n + -1`, comparison. No comments; lines at most 80
  columns. Excluded: records, Text, `ctl`/`resume`, FFI.

## 1. Commands and toolchains

| Toolchain | Version | Command per program | Install cost (estimate) |
|---|---|---|---|
| Koka | v3.2.9 | `koka -e EXXy.kk`; E13 `koka --target=js -e E13y.kk` | about 150 MB; needs clang/gcc, Node for JS |
| Effekt | v0.82.0 | `effekt --backend js EXXy.effekt`; E12 also `--backend llvm` | npm about 60 MB plus JDK ≥ 11 (about 300 MB); LLVM backend needs clang/LLVM 18 and libuv (1.5-2.5 GB) |
| Unison | UCM 1.5.0, base 7.20.0 | `ucm transcript EXX.md` in a fresh codebase; read `EXX.output.md` | about 200 MB plus network |
| Haskell | GHC 9.10.x, effectful-core 2.6.1.0 | `cabal run EXXy.hs` with a script header | 2.5-3.5 GB via ghcup, about 5 min of dependency builds |
| Waxwing | 2af6e40 | `npm run build`, then `node scripts/waxwing.mjs run EXXy.wxw` | present |

Confirm Koka's `-e` flag and Unison's base-install stanza with `--help`
before a run; a flag-spelling change is a labelled, non-semantic
amendment. Record stdout, stderr, exit status or signal, version string,
backend and wall time; timeout 60 s. Compile oracle: an explicit
annotation accepted, and its near miss (n) rejected.

## 2. Cases (unrun predictions)

**E01, empty requirement vs deliberate crash.**
- Koka: (a) `fun f() : total int { 1 }`; (b) `fun f() : total int {
  impossible("boom") }`; (n) `fun f() : total int { throw("boom") }`.
  (a), (b) accepted at `total`, (n) rejected for `exn`
  (std_core_debug: `impossible : a`, no effect). Runtime: (a) `1`; (b)
  stderr `impossible:boom`, SIGABRT (status 134), from master source
  (`impossible` → `unsafe-abort` → `kk_abort` → `abort()`), to be
  rechecked at v3.2.9. Refuted if (b) is rejected or exits 0.
- Effekt: (a) `def f(): Int / {} = 42`; (b) `= panic("boom")`; (n)
  `def pureOnly(h: () => Int at {}): Int = h()` on `box { () => f() }`
  with (b)'s f; control with (a)'s. (a), (b) accepted with `/ {}`; (n)
  rejected (capture `{io}`). Runtime: (a) `42`; (b) uncaught JS throw,
  non-zero exit, stderr text unknown.
- Unison: (a) `f : '{} Nat`, `f = do 1`; (b) `f = do bug "boom"`; (n)
  `g : '{} Nat`, `g = do Exception.raise (failure "x" ())`; (p)
  `IO.catchAll do bug "boom"`. (a), (b) accepted; (n) rejected. (b)
  halts with "I've encountered a call to builtin.bug with the following
  value:"; (p) gives `Left …`.
- Haskell: (a) `runPureEff (pure 1)`; (b) `runPureEff (pure (error
  "boom"))`; (p) `runPureEff (throwM (userError "x"))`. All accepted;
  (b), (p) stderr and non-zero exit.
- Waxwing: `type Why = Oops;` (a) `fn f(): Int with pure = 1; fn
  main(): Int = f();` (b) `fn f(): Int with pure = crash(Oops); …`. Both
  accepted; (a) prints `1`; (b) stderr `crash: Oops`, exit 1. `crash`
  at Int type is illustrative.

**E02, escaping failure vs caught and converted.**
- Koka: `fun parse(n : int) : exn int { if n < 0 then throw("bad") else
  n }`; (a) printed in main; (b) `fun safe() : total int { match try{
  parse(-1) } { Ok(x) -> x; Error(_) -> -1 } }`; (n) `fun g() : total
  int { parse(-1) }`. (a), (b) accepted, (n) rejected. (a) prints
  `uncaught exception: bad`, exit unknown; (b) `-1`.
- Effekt: `record ParseError()`; `def parse(n: Int): Int /
  Exception[ParseError]`; (a) in main rejected (unhandled); (b) `def
  safe(): Int / {} = try { parse(-1) } with Exception[ParseError] { def
  raise(e, msg) = -1 }` accepted, prints `-1`.
- Unison: `parse : Nat ->{Exception} Nat`; (a) in main accepted, uncaught
  failure, text unknown; (b) `catch` accepted, prints `caught`; (n) `p :
  Nat ->{} Nat` rejected.
- Haskell: `parse :: Error String :> es => Int -> Eff es Int`; (b)
  `runPureEff (runErrorNoCallStack @String (parse (-1)))` prints `Left
  "bad"`; (n) `runPureEff (parse (-1))` rejected.
- Waxwing: `type ParseError = Bad(Int); fn parse(n: Int): Int with
  Fail(ParseError) = if n < 0 then Fail.fail(Bad(n)) else n;` (a) `fn
  main(): Unit with Console = Console.print(parse(-1));` rejected,
  E_EFFECT (wording unknown); (b) `… Console.print(handle parse(-1) {
  fail(error: ParseError) => 0 });` accepted, prints `0` (`handle` as an
  argument illustrative).

**E03, constant Clock fake vs wall clock.**
- Koka: `effect clock` with `fun now() : int`; (a) `with fun now() 42`
  at `total`, prints `42`; (b) `with fun now()
  ticks().milli-seconds` at `ndet`, prints a varying int; (n) (b) at
  `total` rejected (`ticks() : ndet duration`).
- Effekt: `interface Clock`; `extern def wallNow() at io: Int = js
  "Date.now()"`; (a) and (b) both accepted with `/ {}`; (n)
  `pureOnly(box { () => real() })` rejected (capture `{io}`), control
  on `fake` accepted. The observation shows in the capture set, not the
  effect set.
- Unison: `ability Wall where now : {Wall} Text`; (b)'s handler must
  carry `{IO, Exception}` (`realtime : '{IO, Exception} Instant`); (b)
  annotated `{}` rejected.
- Waxwing: the fake side is expressible (`handler Clock { now() => 100
  }`, attested in examples/services.wxw); the wall-clock side is **not
  expressible** (no time primitive, no FFI).

**E04, seeded randomness vs entropy.** Koka: (a) `pseudo-random(42) {
random-int() }` at `total`; (b) `srandom-int()` at `ndet`; (n) (b) at
`total` rejected; two runs each: (a) equal, (b) usually different.
Effekt: (a) `minstd(1337) { … }`; (b) `devurandom { … }` under
`on[IOError].report`; both accepted; (a) equal across runs, (b) varies.
Unison: (a) `Random.splitmix 42 Random.nat` at `'{}`; (b) `Random.run
Random.nat`; (n) (b) at `'{}` rejected. Waxwing: **not expressible** (no
entropy source). Finite runs cannot prove determinism.

**E05, buffered log vs console output.** Koka: `effect log`; (a) a
`var`-buffering handler at `total`; (b) `with fun log(m) println(m)` at
`console`; (n) (b) at `total` rejected; (p) `fun t() : total () {
trace("hidden") }` accepted and writes `hidden` (stream unknown).
Effekt: (a) buffering handler, (b) `println` handler, both `/ {}`; (n)
`pureOnly` on (b) rejected. Unison: (a) pure buffer; (b) requires IO;
(p) `Debug.trace` in a `'{}` term prints. Waxwing: `effect Log { fn
log(n: Int): Unit; }; fn work(): Unit with Log = { Log.log(1);
Log.log(2) };` (a) `fn main(): Unit = with handler Log { log(n) => () }
{ work() };` silent; (b) `fn main(): Unit with Console = with handler
Log { log(n) => Console.print(n) } { work() };` prints `1`, `2`; (n) (b)
without `with Console` rejected, E_EFFECT.

**E06, callback without resources vs capturing output authority.**
- Koka: (a) `fun mk-pure() : (() -> total int)`; (b) `fun mk-print() :
  (() -> console ())`; (n) `(() -> total ())` printing, rejected.
  Runtime `42`, then `hi`.
- Effekt: the tour's `parallel(f: () => Unit at {}, …)` with a printing
  box rejected; (b) returning `box { () => println("hi") }` accepted,
  prints `hi`; (n2) returning a handler capability rejected.
- Unison: (a) `'{} Nat`; (b) `'{IO, Exception} ()` stored and forced;
  (n) a `'{}` thunk printing, rejected.
- Waxwing: (b) `fn mkPrint(): Unit -> Unit with Console = fn(u: Unit) =>
  Console.print(1);` invoked in `main … with Console` via `let p =
  mkPrint(); p(())`: **accepted** (rows equal), prints `1`. (a) `fn
  mkPure(): Unit -> Int with pure = fn(u: Unit) => 2;` with `fn main():
  Int = mkPure()(());`: **unknown** (FX017's equal-row rule may reject);
  prints `2` if accepted. The returned-arrow shape is attested
  (`liveDatabase(): Int -> Int with pure`). Closures keep no handler; the
  authority sits in the arrow's row.

**E07, two state instances vs aliased state.** Koka: two `var`s, `21`;
`val r = ref(0); val s = r; r := 1; !s` at `total`, `1`. Effekt: the
tour's regions `example1` (`2 2`) against `example2` (`2 1`). Unison:
`Scope.run` with two refs `(2, 1)`, aliased `1`. Waxwing: **not
expressible** (no mutable state).

**E08, scratch state vs escaping reference.** Koka: the tour's `fib3` at
`total` accepted, `55`; the tour's `wrong()` (a `var` escaping through a
lambda) rejected. Effekt: `example3` returning `closure` rejected;
`example5` with `import ref` accepted, `1`. Unison: `Scope.run do r =
Scope.ref 0; Ref.write r 5; Ref.read r` gives `5`; returning the ref
rejected. Waxwing: **not expressible**.

**E09, printing before failure vs failure before printing.** Koka,
Effekt, Unison: (a) prints `before` then the handler's output; (b) only
the handler's output. Waxwing: `type E = E;` (a) `fn work(): Unit with
Fail(E) + Console = { Console.print(1); Fail.fail(E) };` with `fn
main(): Unit with Console = handle work() { fail(error: E) =>
Console.print(9) };` prints `1`, `9`; (b) the body `{ Fail.fail(E);
Console.print(1) }` prints `9`. Refuted if an already printed line is
missing after the handler runs.

**E10, a new library effect vs a guarantee named `ReadOnly`.** Each
language declares `metrics` and `readonly`; the `get` handler prints
`write!` and answers `1`. Both declarations and the writing handler
accepted (Koka gains `console`; Effekt captures `{io}`; Unison
`{IO, Exception}`; Waxwing's `main` needs `with Console`, the clause
`get() => { Console.print(99); 1 }` illustrative). Runtime `write!` (or
`99`) then `1`. Refuted only if a compiler treats the name specially.

**E11, finalisation exit matrix.**
- Koka `with finally { println("fin") }`: normal `fin`; `throw` `fin`
  then uncaught; non-resuming `ctl stop()` `fin`; `impossible` no `fin`,
  SIGABRT; cancellation not expressible; finaliser throwing while the
  body threw: unknown; finaliser diverging: timeout.
- Effekt `on[ParseError].finalize { println("fin") } { … }`: normal and
  `raise` `fin`; another interface aborting: no `fin`; `panic`: no
  `fin`; cancellation not expressible; finaliser failure unknown;
  divergence timeout.
- Unison `finally (do printLine "fin") body`: normal and
  `Exception.raise` `fin`; `abort` under `Abort.toOptional!` no `fin`,
  `None`; `bug` no `fin`; cancellation not expressible.
- Waxwing `defer Console.print(1);`: normal `0 1`; `Fail.fail` `1 9`;
  `crash(7)` stdout `1`, stderr `crash: 7`, exit 1; discard and
  cancellation **not expressible**; `defer Fail.fail(E)` rejected
  (E_EFFECT "defer must not fail, but it performs Fail(E)"); a crashing
  defer adds `cleanup failed: crash: …`; a diverging defer times out,
  the abort never delivered.

**E12, continuation resumed once, twice, or after its scope.** Koka: (a)
`with ctl ask() resume(21)` gives `42`; (b) `choice-all` around `with
finally`: `fin` twice and `[0,1]`. Effekt: (b) sequential resumes
around `finalize`: `fin 1 fin 0` on js and llvm; (c) the paper's
reentrant example in tour syntax, `effect thunk(): () => Unit at {}`:
accepted; llvm runtime abort, no `done` (Muhcu et al. 2025 §6); js
`done` twice (derived). Unison: `allChoices` around `finally`: `fin`
twice and `[1,0]`. Waxwing: **not expressible** (`resume` is E_SYNTAX).

**E13, honest foreign declaration vs a lie or a host exception.** Koka
(JS): (a) `extern wall() : ndet float64 { js inline "Date.now()" }`;
(b) the same typed total; (c) an extern throwing a JS Error. All
accepted (externs trusted); (b) varies while typed total; (c) uncaught,
non-zero exit; whether `try{}` catches it unknown. Effekt: (a) `at io`;
(b) `at {}` (passes `pureOnly`); (c) a throwing extern inside `try …
with Exception[ParseError]` is not caught. Unison: (b) `liar =
unsafe.coerceAbilities sayHi` accepted, runtime unknown. Haskell: (b)
`unsafeEff_ (putStrLn "hi")` under `runPureEff` prints `hi` then `1`
(moderate confidence); (c) `throwM` stderr, non-zero exit. Waxwing:
**not expressible** (no FFI).

**E14, loop with no operation vs terminating recursion.** Koka: (a)
`fun spin(n : int) : div int { spin(n) }` accepted, (n) at `total`
rejected; (b) a list count at `total` accepted (moderate confidence);
(a) times out. Effekt: both accepted with `/ {}`; (a) times out or
overflows (unknown which). Unison: both accepted at `{}`; (a) times out
(tail calls eliminated). Waxwing: (a) `fn loop(n: Int): Int with pure =
loop(n); fn main(): Int = loop(0);` (b) `fn down(n: Int): Int with pure
= if n <= 0 then 0 else down(n + -1);` both accepted; (a) times out or
Go fatal stack overflow (unknown which; either confirms); (b) `0`.
Refuted if (a) is rejected for nontermination (except Koka's (n)).

**E15, caller's same-named handler vs the callback's defining scope.**
Koka: `with fun ask() 1`, `val f = fn() ask()`, `with fun ask() 2`,
`println(f())` prints `2` (dynamic). Effekt: the tour's
`effectsVsCaptures` prints `1` (lexical closure) then `2`
(contextual). Unison: nested `constAsk` prints `2`. Waxwing: `fn main():
Unit with Console = with handler Ask { ask() => 1 } { let f = fn(u:
Unit) => Ask.ask(); with handler Ask { ask() => 2 } {
Console.print(f(())) } };` compile **unknown** (FX018); prints `2` if
accepted.

**E16, scoped `bracket` vs a first-order request.** Koka: `effect ctl
stop() : a`; (a) `with finally { println("released") }; stop()` prints
`released` then `0`; (b) `with return(x) { println("released"); x };
stop()` prints only `0` (tour #sec-resource). Effekt: library
`finalize[E]` misses another interface's abort. Unison: `finally` misses
`Abort`. Waxwing: (a) core `defer Log.log(1)` under `nofail Log`
(attested) runs on a `Fail` exit; (b) `fn bracket(release: Unit -> Unit
with pure, body: Unit -> Int with pure): Int = { defer release(());
body(()) };` **accepted**; (n) the same with release `with nofail Log`:
compile **unknown** (Cleanup says the callback must be `with pure`;
FX008 marks may admit it).

## 3. Summary (compile / runtime / expressible)

| Case | Koka | Effekt | Unison | effectful | Waxwing |
|---|---|---|---|---|---|
| E01 | acc, rej(n) / SIGABRT | acc `/ {}`, capture rej(n) / JS throw | acc / bug banner; catchAll Left | acc / stderr, exit≠0 | acc / `crash: Oops`, exit 1 |
| E02 | acc, rej(n) / uncaught vs `-1` | (a) rej, (b) acc / `-1` | acc, rej(n) / unk vs `caught` | (b) acc, (n) rej / `Left "bad"` | (a) rej, (b) acc / `0` |
| E03 | acc, rej(n) / 42 vs varying | acc, capture rej | acc, IO required | — | fake only; pair n/e |
| E04 | acc, rej(n) / equal vs varying | acc / equal vs varying | acc, rej(n) | — | n/e |
| E05 | acc, rej(n); `trace` prints under total | acc, capture rej | acc; `trace` prints under pure | — | acc, rej(n) / silent vs `1 2` |
| E06 | acc, rej(n) / `42 hi` | rej (tour); io escape ok | acc, rej(n) | — | (b) acc, (a) unk |
| E07 | acc / `21`, `1` | acc / `2 2` vs `2 1` | acc / `(2,1)`, `1` | — | n/e |
| E08 | acc, rej(n) / `55` | rej(n), acc / `1` | acc, rej(n) / `5` | — | n/e |
| E09 | before kept | same | same | — | `1 9` vs `9` |
| E10 | acc / `write! 1` | acc | acc | — | acc / `99 1` |
| E11 | fin on normal, exn, discard; not on defect | fin on normal, E; not other abort or panic | fin on normal, Exception; not Abort or bug | — | defer on normal, Fail, crash; discard, cancel n/e |
| E12 | fin twice | sequential ok; reentrant llvm abort, js `done`×2 | fin twice | — | n/e |
| E13 | lie varies; host throw uncaught | lie varies; throw uncaught | unk | `hi 1`; stderr | n/e |
| E14 | div acc, total rej / TO | acc / TO or overflow | acc / TO | — | acc / TO or Go fatal |
| E15 | `2` | `1 2` | `2` | — | unk / `2` if acc |
| E16 | finally runs, return clause does not | finalize misses other abort | finally misses Abort | — | (b) acc; (n) unk |

## 4. Grading rules

A compile prediction is confirmed when acceptance matches and a
rejection names the predicted effect, capture or label; a rejection for
an unrelated reason is a fragment error, fixed by a labelled amendment
registered before rerunning. Runtime: exact stdout lines and order;
named stderr substrings; exit class only (0, non-zero, SIGABRT, timeout
at 60 s). Unknown cells are recorded, not graded. E04 uses two runs;
equality does not prove determinism.

## 5. The agent's rulings, kept

Compile oracle by annotation plus near miss; Koka pinned to v3.2.9
though its book's news stops at v3.2.3; Effekt on js except E12c;
Unison as transcripts; Unison FFI excluded (E13 via
`coerceAbilities`); Koka E13 on JS; Koka's defect outcome from master
source; Effekt E12c's syntax adapted from the paper before any run;
Effekt js assumed to allow reentrant resumption; library brackets
compared by a non-intercepted abort; Waxwing "unknown" where FX017 or
FX018 might reject (E06a, E15); Waxwing programs at most 80 columns,
without comments, stored outside the repository (now under probes/);
Haskell limited to E01, E02, E13; 60 s timeout; exit codes as classes;
E10 a design observation.

## 6. Sources checked by the agent

Koka: the book (tour.kk.md sections With Finally, Effect types,
Semantics, #sec-var, #sec-runst, #sec-handlers, #sec-resume,
#sec-return, #sec-state, #sec-multi-resume, #sec-resource), spec.kk.md,
getstarted.kk.md, std library pages (core_exn, core_debug, num_random,
time_timer, time_duration, core_hnd, core_list), sources
lib/std/core/debug.kk, lib/std/core/inline/debug.c, kklib/src/init.c,
GitHub releases. Effekt: tour pages (effects, captures, regions, ffi,
io, variables), docs, examples/tour/regions.effekt.md, libraries/common
(exception, effekt, random, bench, ref), EffektConfig.scala, releases,
Muhcu et al. 2025 §6. Unison: abilities reference, writing abilities,
`bug`, transcripts docs, base 7.20.0 definitions by name, releases.
effectful-core 2.6.1.0: Effectful, Effectful-Error-Static,
Effectful-Dispatch-Static. Not checked: Node exit codes, GHC's
top-level handler, Go's fatal-error exit status (graded by class).
