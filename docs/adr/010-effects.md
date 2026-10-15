# ADR 010: effects, handlers and typed failures, with erased rows

Implemented on fx001-finish 2026-10-12, pending merge (milestone FX001,
Tasks 1-12; FX008's mark rule merged into main the same day, and is part of
this decision as shipped). Binding spec:
docs/plans/2026-10-09-effects-design.md (§1-§6 with the FX008 amendment of
2026-10-12); plans docs/plans/2026-10-09-effects-plan.md and
docs/plans/2026-10-10-abort-tracking-plan.md ("Task 9 as built");
evidence docs/progress.md ("FX001 Task ...", "FX008 ..."). Builds on
ADR 007 (whole-program specialization) and ADR 008 (staged functions), and
keeps ADR 001's strict, left-to-right evaluation. Concurrency, local state
and general resume are not part of this decision (BACKLOG FX002, FX003,
FX006).

## Context

Services such as a database, a clock and a logger need to be named in
types, supplied by the caller and replaced by fakes in tests, and
recoverable failures need to be typed. Cleanup must run on every exit.
Generated Go must stay monomorphic, a program that uses none of this must
keep today's Go byte for byte, and the checker must stay linear on large
rows. The language direction (docs/plans/2026-10-08-language-direction.md)
had recorded a strategy of confining a future continuation-passing
translation through row-keyed specialization ("decision 1"). This ADR
revises that decision.

## Decision

### Rows, labels and signatures

Every arrow carries a row: `TFun param row result`. A row is an ordered
list of labels and an optional tail (a rigid or meta row variable). Matching
takes the first occurrence of a label's key (Leijen's scoped labels); a
label's key is its effect, except `Fail`, keyed by the declared head of its
payload (`Int`, `Bool`, `Unit` or a declared type), so `Fail(Error(Int))`
and `Fail(Error(Bool))` share a key and their arguments must unify. Rows are
never treated as sets. The Leijen side condition `tail(r1)` not in
`dom(θ)` stops `Clock + ...r` against `Log + ...r` from rewriting forever
(regression row `fx-side-condition`: the probe compiles in a child process
under its own 20 s timeout and reports the timeout as the detected defect).

Every signature has one implicit rigid ambient row. `with L + ...e` names
the tail, `with pure` is closed and empty and is a promise only about
effects. A declaration's own non-final stages carry fresh rows. A closed
row is opened (given a fresh tail) in exactly one place, when a
declaration reference is instantiated; rows in parameter and field types,
named row variables and locals are not (a local of type `A -> B with pure`
passed where `A -> B with Log` is wanted is a type error; eta-expansion is
the workaround).

A type written as an effect label's argument has no ambient row, in a
signature as in a field, an operation, a handler's label or a `handle`
clause: an unannotated arrow or a bare `Handler(L)` in `Fail({ k: (Int) ->
Int })`, `State((Int) -> Int)` or `Fail(W(Handler(Log)))` is `pure`
(FX024, fixed 2026-10-15). Before, in a signature it took the ambient row,
which is also the tail of the row the label stands in; a caller with a
label the callee lacks bound that tail, and so the payload's row, to its
own whole row, and the payload the caller wrote (its ambient alone) no
longer matched: a spurious E_EFFECT `v performs Console, which its
signature does not allow`. A callback raised in such a payload must now be
`with pure` or share a written `...e` (regression row
`fx-label-argument-ambient`, test/fx024-label-arguments.test.mjs).

### Row erasure (revises direction decision 1)

Row structure is erased before specialization; types inside labels are not.
Specialization keys are type keys, function keys and effect keys (effect,
ground type arguments), built by the one worklist. Rows enter no key, so
recursion that grows a row (`with h { loop(n + 1) }`) creates no new
instance. (Record rows, ADR 013, do enter keys: they decide a struct's
fields, which effect rows never do.) The earlier idea of confining CPS by
row-keyed specialization is not available; FX006 must establish a
conservative reachability analysis or choose bounded row-aware
re-specialization. Rejected: a uniform boxed operation ABI with typed
adapters (stronger erasure at representation and conversion cost).
Finiteness rests on two rules: ADR 007's instantiation rule for function
keys, and P001's nested-declaration rule extended to one reference graph
over type and effect declarations (the mutually recursive pair A/B is
rejected, regression row `fx-layout-edges`; the self-recursive `effect
Grow(a) { fn next(): Handler(Grow(Box(a))); }` is rejected even without that
edge). Only keys that carry type arguments count toward the 10,000-key limit
(ruling F5: the limit is a guard on polymorphic keys; the spec's "every key"
is read that way, a documentation mismatch only). An effect with no type
arguments is a key but does not count.

### Runtime evidence and keys

`waxwingCtx{key, handler, outer, marker}` is an immutable linked list;
installing allocates a node and leaving pops nothing. Lookup is linear in
the installed handlers. Runtime keys: `EffectId + 1` for user effects, so
`State(Int)` and `State(Bool)` share a key and the innermost frame wins;
`Fail` families count down from -1 by the payload's declared head (`Int`
-1, `Bool` -2, `Unit` -3, a declared type -4 minus its id; since ADR 011
Text MinInt32, and since ADR 013 a record payload's label set MinInt32 + 1
upwards, in the sorted order of the program's label lists); host effects
share 0 and no frame holds one. A perform function type-asserts the frame's
handler to its own layout, which the first-occurrence rule makes
unreachable when well typed. Handlers are deep and dynamically scoped:
an operation goes to the innermost frame for its key in the context current
when it executes, and closures never retain evidence.

`Handler(Console)` and `Handler(Fail(E))` types get layouts with no
operations and compile to empty Go structs (ruling F3): the types are
uninhabited, but rejecting them in Check would change accepted programs;
revisit with D001.

### `ctx` mode over the emitted IR

The mode is chosen over the emitted IR, not over what `main` reaches:
specialization emits every monomorphic function, so one unused function
that performs an operation still needs the context (regression row
`fx-ctx-reachable`). If the emitted IR holds an operation, handler
construction or handler type, `fail`, `with` or `handle`, every function,
stage, lambda and function value takes `ctx *waxwingCtx` first. Otherwise
nothing changes: no `ctx`, and no runtime text (`effect-free-ctx`, Task 7).
A program using `defer` or `crash` gets the cleanup and defect runtime
without `ctx`. PKG001 inherits the obligation that an exported function's
calling convention must not depend on the consuming program (BACKLOG).

### Handlers, `handle` and targeted aborts

A clause runs in the context of its `with`, without the handler itself
(`fx-clause-context`), so a Log clause that logs reaches the next outer
Log. The clauses of one `handle` are frames with the first clause
innermost (regression row `fx-clause-order`, Task 7 Critical). `Fail.fail(e)`
panics with an abort aimed at the innermost frame marker for `e`'s key;
the lifted `handle` helper recovers only aborts for its own markers
(`fx-abort-target`) and re-raises everything else. Markers are fresh
allocations of a non-zero-sized type, compared by pointer. The matching
clause runs after the helper returns, in the `handle`'s context.

### Blocks and `defer`

A block exits for exactly one reason: normal completion, typed abort or
recoverable defect. Continuation discard (FX006) and cancellation (FX002,
CF001) are future reasons. `defer e` registers when the block reaches it
and evaluates the whole expression at exit, LIFO, once per exiting
activation, in the context in force at registration (`fx-cleanup-context`;
Go's `defer` evaluates arguments at registration, Waxwing's does not).
Go fatal errors (stack exhaustion, out of memory) are not exits and skip
cleanup.

### The strict `defer` rule and its accepted costs

A `defer` may not fail (user decision, 2026-10-09; CF R0). The deferred
expression has its own row; its labels are consumed into the current row
but its tail never unified with it. After the function's constraints
settle, a remaining `Fail` label is E_EFFECT `defer must not fail, but it
performs Fail(E)` (`fx-defer-fail`, and `fx-defer-unified` for a `Fail`
that arrives after the `defer`), and so is a tail resolved to a rigid
variable (`fx-defer-rigid`). Costs, accepted and recorded as FX007: a
deferred callback parameter must be `with pure`, and a local lambda also
called outside the `defer` in a non-`main` function shares that function's
ambient row and is rejected there.

### FX008 refinement: marks

The strict rule alone was unsound: an operation performed in a cleanup may
reach a handler clause that fails, possibly a handler installed by a caller
in another function, so the cleanup ends in a typed abort. User decision
(2026-10-10): track it in the types. Every non-`Fail` label carries a mark:
`nofail` (N) says the frame it runs under cannot end an operation in a typed
abort; a plain label (M) promises nothing; `nofail(k)` is a mark variable
per signature; Console is N; `Fail` labels carry no mark. A `defer` may
perform an operation only where every frame it can meet is fail-free: every
non-`Fail` label of the deferred row must be N, else E_EFFECT `defer must
not fail, but it performs Log, whose handler may fail` (or the `nofail(k)`
form). A handler type is internally `Handler(m L with R | C)`: R is the
inference row, C the clause row carrying assumption marks; each installation
has its own frame mark. The constraints form a graph over mark metas and the
atoms N, M and the rigid variables, solved as a path check over a two-point
lattice; unresolved marks close to M. Marks are erased before
specialization, so Go, `ctx` mode and finiteness are unchanged, and programs
without `defer` keep their acceptance. The shipped rule is conservative in
these documented cases (all accept-before, reject-after and never unsound):
- **L1 with P5** (FX013): marks nested in data, constructor fields,
  operation signatures or a callback's parameters are not opened (opening
  applies to function signatures only), so a handler stored in a field
  keeps its written mark.
- **L4** (FX014): labels merged through one handler value's R, or a
  residual merge through a shared tail, share a mark, so a fail-free use
  can be rejected because another use may fail (probes l4b and merge2).
- **L6** (FX015): mark variables are not allowed in `type` or `effect`
  declarations.
- **Handler through a generic function** (FX016): a handler passed through
  a generic function and installed from its result gives an M frame when
  the context's rest is M or rigid, because the result's clause row gets a
  fresh tail unless its variable occurs in a parameter or the own row
  (user decision, 2026-10-11/12).
Bracket-style cleanup through `...e` stays rejected until FX007 (written
`nofail ...e`, not yet supported). Any `ctl` clause will make its handler's
own mark M (FX006).

### Defects and the report

A defect is any recoverable runtime panic that is not a targeted abort;
nothing catches one. `crash(value)` is a built-in function that raises one;
`with pure` promises neither termination nor freedom from it. Unwinding
runs every cleanup, then `main` reports once on stderr and exits 1. Report
conventions: one cause per line in execution order, newlines escaped; the
first line is the original cause, every later line is prefixed `cleanup
failed: `. A cause is `crash: V`, `fail(T): V` for a typed abort, `no
handler for L` for the guard, or `panic: <text>` for a Go runtime panic.
With no pending cause the first cleanup crash is the first line, unprefixed.
A pending typed abort reaches its `handle` only if every cleanup on the way
completes normally; a cleanup defect makes the abort head the report and
the `handle` never runs (`fx-cleanup-defect`), and a diverging cleanup
never delivers it. The pending cause is kept as the first cause
(`fx-cleanup-cause`). Rejected: converting a pending abort into an
uncatchable defect on a typed cleanup failure, dropping the cleanup
failure, replacing the original, attaching a suppressed cause.

### Diagnostics

Effect diagnostics are acceptance, not polish (spec §6): the row
difference first, then origin, boundary and path notes in order from the
demand back to the source (provenance, regression row `fx-provenance`),
distinguished kinds, and bounded output (2,000 characters; long rows
abbreviate, row `fx-abbreviation`). A `with pure` (closed) parameter row
stays a demand when an argument is checked against it: a lambda that
prints, given to a `with pure` parameter, is rejected (`fx-closed-opened`).

## Evidence (Task 11)

Acceptance scenario examples/services.wxw (snapshot bootstrap/services.go):
Database, Clock and Log, five service functions, cleanup by `defer` with
`nofail Log`, real and stateless fake handlers selected in `main`. Keys
(F6): 9 = 0 type + 6 function + 3 effect; the baseline without effects has
the same 6 function keys. Timings are whole-process wall time after a
warm-up run, serial phase, five runs, bound 3x the median: 10^6 shallow
installs 131 ms, 10^6 operations at context depth 100 141 ms, one fail
across 1,000 `handle` frames 46 ms, 100,000 caught failures 38 ms, `go
build` of the scenario 135 ms. The last two (unwinding and caught failures)
are close to the roughly 30 ms process start. A 1,000-label row compiles;
the rejection prints 498 characters. FX005 records the lookup cost (Task 1's
hand-written Go at depth 10,000: 11.8 s per 10^6 lookups).

## Consequences and limits

- Documented in docs/language.md: `with pure` is not totality; Go fatal
  errors skip cleanup; a cleanup defect heads the report and a diverging
  cleanup never delivers a pending abort; `defer` must not fail, including
  through a rigid tail; no mutable state, so fakes are stateless (FX003);
  `let` is monomorphic; pure locals need eta-expansion; there is no generic
  `Result`-to-failure helper (a `Fail` payload needs a concrete family;
  STD001).
- A `Handler(Console)` or `Handler(Fail(E))` cannot be built (FX011).
  User Console handlers wait for Text (D001).
- Lookup is linear in installed handlers; a cached index (FX005) must keep
  context nodes immutable, because a cache written into a node reachable
  from another goroutine would race (CF001 §10.4).
- Concurrency (FX002), local state (FX003) and general resume (FX006) each
  need their own design; CF001's settle-before-concurrency list applies.
