# Effect contracts: decision memo

Status: research memo for the author, 2026-10-24, written by a read-only
agent from the material committed in this directory (no new reading).
Nothing here adopts a rule. It does not change a-min, which checks
today's rules; every recommendation below is a candidate for a later
tranche.

Evidence labels. **[O]** observed: read from code at `main` 2af6e40
(baseline-audit.md) or run once (probes/). **[P]** a frozen, unrun
prediction (predictions-e01-e16.md, or the audit's P1-P6). **[R]**
reasoning in this memo, untested. Code is **attested** when its shape
appears in probes/, the predictions' Waxwing fragment or
docs/language.md, and **illustrative** otherwise.

## 0. The candidate architecture

Library-defined effects and handlers over a small checked core, with
explicit external roots and separately stated failure, termination and
lifetime guarantees. Evaluation [R]: each part is published (row-typed
effects with handlers, Leijen 2014 and the 2016 TR; host primitives as
operations that escape every handler, Pretnar 2015 §6.5; primitive
versus algebraic effects, Flix). The combination with Waxwing's own
rules (dynamic scope, FX001 consumption, FX008 marks) has no directly
applicable theorem found in this survey (correspondence.md G4, G7). It
fits the material so far. Its weak points are dynamic scope (E15),
callbacks that carry authority (E06b) and the trust boundary at a future
FFI. Sections 1-4 test it topic by topic.

## 1. What `pure` excludes

Today [O]: `with pure` is the closed empty row. It excludes every
unhandled operation, escaping `Fail` included; it allows `crash` and
divergence (Check/Operation.purs `crashCall`; language.md "Limits"). A
fully handled `Fail` stays out of the row (Check/Handle.purs).

Published meanings. Koka's `pure` is the alias for `<exn,div>`: it
allows exceptions and divergence (Leijen 2014 §2.2; std/core: "may not
terminate or raise an exception"); Koka's empty row is `total`.
Effekt's contextual purity (Brachthäuser, Schuster and Ostermann, TR
and OOPSLA 2020 §1.5): "A contextually pure function can still have effects, it
merely places no requirements on its caller." Unison's `{}` admits
`bug`. Today's `with pure` is closer to Koka's `total` and to contextual
purity than to Koka's `pure`. [P] E01: Koka's `impossible` under
`total`, Effekt's `panic` under `/ {}` and Unison's `bug` under `{}` are
all predicted accepted.

Alternatives.
- **1A, requests only (today).** No outstanding request, no escaping
  `Fail`; `crash` and divergence allowed.
- **1B, requests and deliberate aborts.** `crash` performs a built-in
  label (illustratively `Crash`) that only the runtime at `main`
  discharges; `with pure` excludes it. A fully handled `Fail` is
  allowed. Divergence is allowed and said so.
- **1C, intensional.** As 1B, and no `Fail` operation at all, even one
  handled inside.

1A against 1B (attested; E01 (b)):

```text
type Why = Oops;
fn f(): Int with pure = crash(Oops);
fn main(): Int = f();
```

1A accepts; [P] stderr `crash: Oops`, exit 1. 1B refuses at `crash`;
`f` must say `with Crash` (illustrative), and so must each caller up to
`main`.

1B against 1C (attested shapes; the audit's P1, [P] prints `4`):

```text
type E = E;
fn safe(n: Int): Int with pure =
  handle Fail.fail(E) { fail(error: E) => n };
```

1B accepts: no failure escapes, which is what Koka's Theorem 2 promises
for `exn` (Leijen 2014 §6). 1C refuses it, though no run under O1 or O2
can tell `safe` from `fn safe(n: Int): Int with pure = n`. The glossary
marks 1C invented.

Costs.
- 1A refuses nothing new. It leaves the author's objection standing for
  `crash`, an unhandled abort under the word `pure`.
- 1B refuses `pure` functions that can crash. Rows do not absorb the
  label: a signature without `with` has a rigid ambient row [O] (E16n's
  "the signature of bracket has an ambient row"), so callers must
  annotate. Compiler: `crashCall` gains the label; `main`'s entry check
  (Check/Entry.purs, today `Console` only) admits it; a user handler for
  it needs a real diagnostic (FX011). Runtime and lowering unchanged,
  since rows are erased. Residual untracked defects must be listed as
  contract exclusions with evidence: the missing-handler guard (believed
  unreachable, no proof or test [O]), Go runtime panics (none reachable
  found, inferred [O]), cleanup crashes, Go fatal errors.
- 1B's proof route [R]: with `crash` an operation no user can handle,
  "a `pure` function does not crash" becomes an instance of the effect
  safety statement promise P1 needs anyway (the shape of the 2016 TR's
  Theorem 1 and Lemma 4.b). For Waxwing's rules that statement is itself
  gap G7. A tracked but uncatchable defect reuses `Console`'s status
  (handled only at `main`) [O], but as a defect design it has no
  published precedent found in this survey; it needs ADR 014 approval.
  The published alternative is a catchable channel (Koka's `exn`).
- 1C loses the idiom "handle locally, then promise `pure`" and buys
  nothing observable.

Recommendation: **1B, uncatchable for now, divergence explicitly
allowed.** The documented promise would read: no outstanding request,
no escaping failure, no deliberate abort; may diverge; physical
exhaustion excluded. Would change it: once division or indexing exists,
a sample in which most `pure` arithmetic helpers would carry `Crash`
(then fix how division is typed before weakening 1B); or residual
guards that cannot be shown unreachable (then narrow the promise in
writing).

## 2. Observations, commands and the boundary

Today [O]: three external outputs. `Console.print` writes stdout and is
in the row. `main`'s result is printed by a wrapper (Go.purs:80-94) and
the defect report goes to stderr with exit 1; neither is in any row.
No input primitive and no FFI.

Alternatives.
- **2A, one host label.** Every host primitive counts as both
  observation and command (the broad groupings of Koka's `io` and Flix's
  `IO`).
- **2B, per-root labels.** Each host binding declares its label and a
  class (observation, command or both); library effects sit on top; a
  root is discharged only by the runtime or its binding, never by a
  user handler.
- **2C, capabilities and capture.** Authority is a captured capability,
  scoped lexically (Effekt; System C; Capturing Types, Theorem 4.14).

2A against 2B (illustrative: no clock primitive exists; E03 records the
wall-clock side as not expressible):

```text
fn stamp(): Int with WallClock = WallClock.now();
fn report(n: Int): Unit with Console = Console.print(n);
```

Under 2A both rows are the one host label, so a caller that allows
reading but not writing cannot tell them apart. Under 2B the rows differ
and the caller can require `WallClock` only. In both, handling a library
effect does not erase a root: [P] E05's `Log` handler that prints makes
`main` need `with Console`.

2B against 2C: E15 (attested, [O] accepted, prints `2`). Under 2B, on
today's dynamic rows, the closure's `Ask.ask()` meets the handler
installed where it is called; Zhang and Myers (POPL 2019 §2) call this
accidental handling. Under 2C the closure keeps its defining scope; [P]
Effekt's lexical variant prints `1`.

Costs.
- 2A is cheap and loses the distinction the author asked for.
- 2B: each class is a trusted declaration (ADR 015: a foreign
  declaration is "a trusted contract"); no directly applicable theorem
  for a read/write split was found in this survey (G5). Many host calls
  (network) are both. The compiler needs `Console`'s "handled only by
  the runtime" status (and the FX011 diagnostic).
- 2C changes closure and handler scope, dynamic today [O] (closures keep
  no handler), reopens FX017/FX018, and its general inference is left
  open by System C (§5.3).

The boundary. Recommended: place the two unlabelled outputs in a
program-level trace, under O2, as two events of the runtime root:
`result(v)` on normal exit and `defect(causes)` with exit 1.
Function-level promises quantify over function bodies, where neither
event arises. Under 1B, `defect` is the root's discharge of `Crash` in
`main`'s row, so it is accounted for; §1's residual defects are the
stated exceptions. Example: `fn main(): Int = 3;` has an empty row and
the program trace `[result(3)]`.

Recommendation: **2B on today's dynamic rows, with that boundary.**
Record E15's behaviour as documented and its abstraction-safety
question (G6) as open for a later milestone (Zhang-Myers tunneling, or
2C). Would change it: the first real bindings mostly classify as "both"
(then 2A now, finer labels later), or a library abstraction broken by
accidental handling in practice (then tunneling or 2C sooner).

## 3. What libraries extend; what the core enforces

Alternatives.
- **3A, open names, closed reasoning.** Libraries declare effects,
  handlers, failure families, fakes and wrappers over roots. The
  compiler checks one generic discipline and knows no business meaning.
- **3B, trusted library properties.** A library may tag an effect (say,
  read-only) and the compiler believes the tag.
- **3C, library encoding.** Effects as free or freer monads in libraries
  (Kiselyov, Sabry and Swords 2013; "Freer Monads, More Extensible
  Effects", Kiselyov and Ishii 2015, authorship confirmed in
  source-checks.md).

3A against 3B: E10 (clause illustrative; [P] accepted, prints `99` then
`1`):

```text
effect ReadOnly { fn get(): Int; };
fn main(): Int with Console =
  with handler ReadOnly { get() => { Console.print(99); 1 } } {
    ReadOnly.get() };
```

3A accepts; the name promises nothing and `Console` in the row shows the
write. Under 3B the tag is either believed, a lie here, or checked
against handler bodies, a new compiler rule rather than a library
feature.

3A against 3C: a service with a fake (`handler Clock { now() => 100 }`,
attested in examples/services.wxw). Both express it; 3C needs
higher-kinded types and class resolution (K001, C001) and changes the
programming model, while native declarations already exist [O].

Recommendation: **3A**, with this split [R]:

| Owner | Enforces or supplies |
|---|---|
| Libraries | effect declarations, handlers, failure families, fakes, wrappers over roots; later `Console`'s print API (after D001, C001) |
| Compiler | every operation handled or in the row; `main`'s row within roots plus `Crash`; FX008 marks and the `defer` rule; roots and `Crash` not handleable by users, with a user diagnostic (FX011) |
| Runtime | dispatch, abort routing to `handle`, `defer` once and LIFO, the defect report, the two boundary events |
| FFI (I001, future) | each root's label and class; host exceptions translated to a typed `Fail` or to a defect (undecided); trusted, not a sandbox |

`Fail` stays in the core: an aborting operation cannot be written by a
user without `ctl` (FX006). Moving it out waits for that. Would change
3A: a needed guarantee (such as "no commands") that cannot be read off
root labels; that calls for a verified rule, not a tag.

## 4. Guarantees for later milestones

- **Termination.** Alternatives: none, stated (today [O]: `fn loop(): a
  = loop();` accepted and run); a `div` label (Koka, Leijen 2014 §6
  Theorem 4, proved without handlers); a termination checker. E14's
  attested pair (`fn loop(n: Int): Int with pure = loop(n);` and `down`,
  counting to 0) separates them: the first accepts both, a `div` label
  marks `loop`, and whether `down` needs it depends on the checker, since
  Int recursion is not structural [R]. For handlers with recursion no
  directly applicable theorem was found in this survey (G1), and
  arrow-returning operations allow Landin's knot (Kammar and Pretnar
  §3). Recommended: none, stated, until after FX006.
- **State.** Alternatives: none (today [O]); a state-passing handler
  (needs `resume`, FX006); scoped references (Koka's `st<h>` with `run`,
  Leijen 2014 Theorem 3; Effekt regions). E07 and E08 are not expressible
  today. Recommended: decide with FX006 (EF-STATE).
- **Resources.** Today [O] cleanup covers normal exit, typed abort and
  defect; E16's near miss shows a deferred callback must be `with pure`
  in practice. Discard (FX006) and cancellation (CF001) come later.
  Runners in Action's Theorem 7 assumes no recursion and affine
  continuations (G2), so it does not transfer as is. Under 1B a `pure`
  deferred callback cannot crash, which shrinks the cleanup-failure path
  to the residual defects [R].

## 5. Interactions

- **Division by zero.** Under 1B it must not become a new untracked
  panic: a typed `Fail`, a result value, or the `Crash` label. The
  division memo (docs/plans/2026-10-24-int-division-memo.md, branch
  d001-int-arith) depends on the §1 decision.
- **FX011.** 1B and 2B both need labels only the runtime handles,
  reported to users; today such a handler reaches E_INTERNAL "Invalid
  handler effect" [O]. Fixing it is a prerequisite.
- **E06b [O].** Returning a `Console` callback and calling it through
  `let` is refused ("Console + Console + ... and Console + ... cannot be
  made equal"); the pure E06a is accepted. Not triaged. If it is a
  defect, any 2B design handing root-carrying callbacks around hits it;
  triage it before relying on returned authority.
- **E15 [O].** Dynamic handling as documented; accidental handling in
  Zhang and Myers' sense; G6 open.

## 6. Decide now or later

| Item | When |
|---|---|
| Meaning of `pure` (1B or not) and the handled-`Fail` rule | now |
| Observation boundary (program trace with two root events) | now |
| Extension rule (3A) | now |
| Root classes, observation versus command (2B) | now in principle; binding by binding with FFI (I001) |
| `Crash` catchable by users | later, with typed host exceptions (I001) |
| Division's typing | division memo, after the `pure` decision |
| Lexical scope or tunneling (E15, G6) | later, effects milestone after FX006 |
| Termination label or checker | after FX006 |
| Local state | with FX006 (EF-STATE) |
| Discard and cancellation in cleanup | FX006 and CF001 |
| E06b triage | BACKLOG now; independent of these choices |

## 7. Author decisions (five)

1. Does `pure` exclude deliberate `crash` (1B) while allowing a fully
   handled `Fail` and divergence?
2. Is `Crash` uncatchable for now (no published precedent found in this
   survey; ADR 014 approval) or a catchable channel like Koka's `exn`?
3. Is the boundary a program-level trace in which `main`'s result and
   the defect report are events of the runtime root?
4. Are external roots separate labels with declared, trusted classes
   (2B), on today's dynamic rows, with E15 left open?
5. Is extension "open names, closed reasoning" (3A), with termination,
   state and wider cleanup deferred to the FX006 and CF001 milestones?

## The agent's rulings, kept

- The boundary gets one recommendation, not three alternatives (the
  program-level trace contains the function-level one); cost: no
  separating example for the boundary choice itself.
- "Rows do not absorb `Crash`" is read from E16n's diagnostic.
- The `Crash` proof route is reasoning tied to the 2016 TR's Theorem 1
  and Lemma 4.b, inheriting G7.
- Tracked but uncatchable `Crash` flagged for ADR 014.
- E14's `down` under a termination checker is reasoning.
- The `pure` meaning and the handled-`Fail` rule are one decision;
  catchability is separate.
- E06b triage placed as "BACKLOG now"; nothing filed (read-only run).
