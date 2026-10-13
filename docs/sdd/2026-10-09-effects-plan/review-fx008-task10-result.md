# FX008 Task 10 review: notes for mark rejections

Scope: `git diff 889ca99..d85a791` in /Users/ethan/Desktop/waxwing-fx008-impl,
against plan docs/plans/2026-10-10-abort-tracking-plan.md Task 10 (P10 table
and assertions), P1/P6/P7, and AGENTS.md. Read only, with experiments run
against the worktree's built `output/` from /private/tmp/claude-501/fx10
(deleted afterwards).

**Verdict: APPROVED. No Critical or Important issues; four Minor ones,
none blocking.**

## Checks

1. **Derivation and the table.** Notes come only from `FrameOwn`,
   `FrameOuter`, `FrameRigid` and `OwnAbort`, each with the span and text
   the table gives. `Assumed`, `Copied`, `Extended` and `DeferDemand` give no
   note of their own (`_ → Right []`, MarkNotes.purs:43). Notes are in order
   from the demand back to the source (reversed path, then the origin note).
   The origin rule is: `MarkVariable` gives `MarkVariableHere`; `Plain` with a
   first edge of `Assumed` gives `SignatureMayFail`; otherwise no origin note.
   The span is `env.rowSpan`, falling back to `functionSpan`.
   **DeferDemand origin (MarkNotes.purs:91):** this is correct by the table's
   parenthetical, "a constant `Plain` lower is the declaration's own row, P1".
   A `DeferDemand` edge has `lower = labelMark` of the walked cleanup label
   (Frames.purs:111-116). So a path that starts at `Plain` and whose first
   edge is that demand means the defer's label is the constant `Plain` from
   the declaration's row. The assertions the plan pins require it: hole, c1,
   cross and pending are these cases. An experiment tried to make it point
   at the wrong declaration and could not:
   - `defer g()` with `g(): Unit with Log` inside a `nofail Log` function is
     accepted, because a callee's `Plain` does not reach the demand;
   - a lambda inside `work` correctly names `work`.

   The plan text names only `Assumed`, so record this as an implementation
   decision (Minor 1).
2. **The 1,000-hop test.** It keeps the first and last notes as the plan means.
   The raw notes are ClausesReach(f1) … ClausesReach(f1000), HandledHere(outer),
   then ClauseAborts. `limited` (Format/Diagnostic/Note.purs:65-75) keeps the
   first `maxNotes - 1 = 3` notes that are not path notes, plus the last one.
   The kept notes are f1, f2 and f3, which are nearest the demand, and the
   clause note, which is the source. The test pins those four exactly
   (fx008-defer.test.mjs:182-191). The only casualty of elision is the outer
   `Log is handled here`. That is the existing policy for notes that are not
   path notes, which have no `… k more` marker. Measured: 269 characters and 4
   notes at 3, 50 and 200 hops alike. The `maxCharacters` half of the plan
   assertion is not asserted explicitly (Minor 2).
3. **Duplicates.** Confirmed in practice. Probes produced no repeated note:
   - a forwarding clause performing `log` twice;
   - a lambda installing a forwarder called twice;
   - a Tick handler forwarding into the failing Log handler.

   A BFS predecessor path is simple in nodes, so it holds each edge at most
   once. The existing test is weaker than it looks (Minor 3).
4. **Notes pinned from observation.** All follow the table and give a useful
   path:
   - a1, a4, a8, a9 and a3c show `with <expr>` → `clauses perform Tick, whose
     handler may fail` → `Tick is handled here` → `its clause for tick fails
     with E`. This names the installed expression, the failing handler and
     its clause.
   - ownRow has the same shape, with the Tick handler outside the Get handler.
   - a6 shows `with id(x)` → `clauses perform Log` → outer failing `Log is
     handled here` → its clause. The concrete route is clause → tick →
     forwarding Tick → log(5) → failing Log. BFS takes the shorter
     row-level route through the tail `...e`, which does contain Log. That is
     true at row level and points at the right failing handler. Acceptable.
   - a10 and r5 show `with id(y)` or `with h` → `may perform any effect of
     ...e`. This is right: the tail is the rigid `...e` of `g`.
   - clauseDeferFailing shows the outer `Log is handled here` → its clause.
     This is right because the inner clause's defer is consumed by the outer
     frame.
5. **Naming, layering and style.** These are fine:
   - `ClauseAborts AbortCause` is consistent with `AbortCause`'s
     `ClauseFails` and `ClauseMayPerform`.
   - The Domain.Note → Domain.Problem import stays within Domain.
   - Format.Diagnostic.Mark is pure string building.
   - `""` prints as `...` (ambient callback test).
   - File sizes are within budget (MarkNotes 106 lines, MarkReport 85).

   There is small duplication (Minor 4).
6. **Timing.** Keep the test in the parallel suite at 1,000 hops. The
   `.serial.test.mjs` suffix is for tests with fixed *time bounds*
   (docs/engineering.md:74-89), and this test has none. The parallel runner
   cannot make it fail, and moving it to the serial phase would add its
   9 s to wall time instead of overlapping it. The plan fixes "1,000-hop",
   so do not shrink it. Measured compile cost: 30 ms at 3 hops, 78 ms at 50,
   419 ms at 200, so the cost is superlinear, as the controller said.

## Additional observation (no action required for Task 10)

Two rejections carry no notes because their `Plain` comes from a type rather
than the declaration's row. The table does not cover this.
`type Box = Box(Unit -> Unit with Log)` with
`Box(fn(u: Unit) => { defer log(1); () })` and
`fn take(f: Unit -> Unit with Log)` with
`take(fn(u: Unit) => { defer log(1); () })` both give only the headline. A
future origin note, such as "this type allows a failing Log handler", would
help. Candidate for BACKLOG, not this task.

## Critical

None.

## Important

None.

## Minor

1. **src/Features/Check/MarkNotes.purs:91**: the `Plain, DeferDemand _`
   origin is not named in the plan table, which says "through an `Assumed`
   edge". Fix: record in the Task 10 decisions that a path from a constant
   `Plain` whose first edge is `DeferDemand` is the declaration's own row
   (P1 parenthetical), required by the hole/c1/cross/pending assertions. Also
   extend the comment at MarkNotes.purs:77-79 to say "an assumed edge, or a
   defer demand on a label the signature wrote".
2. **test/fx008-defer.test.mjs:191**: the plan asks that the diagnostic "stays
   within `maxCharacters`", but only `related.length <= 4` is asserted. Fix: add
   `assert.ok(found.message.length + found.related.reduce((sum, note) => sum +
   note.message.length, 0) <= 2000);` or import `maxCharacters` from
   `../output/Format.Diagnostic.Row/index.js` instead of the literal.
3. **test/fx008-defer.test.mjs:169-180**: `chain(3)` gives five raw notes, so
   `maxNotes` elision drops `Log is handled here`. The span-uniqueness check
   then runs on an already truncated list. Fix: use `chain(2)`, which gives four
   notes with nothing elided. Assert `[chainWith(1), chainWith(2)] forwarded,
   handledHere(<outer with>, 'Log'), clauseFails('log(n) => fail(E)', 'log')`
   and keep the unique-span assertion. Alternatively, rename the test to say
   what it checks.
4. **src/Features/Check/MarkReport.purs:56-66 and
   src/Format/Diagnostic/Mark.purs:32-39**: the abort cause is built twice, by
   `abortHeadline` and by MarkNotes' `abortCause`. The "its clause for …" text
   is also written twice, in `handlerFails` and in `clauseNote` at
   Mark.purs:50-56. Fix: export `abortCause` from MarkNotes and write
   `abortHeadline env state label site = noted site.handler <<< HandlerMayFail
   <$> abortCause env state label site`. Then drop `clausePayload` from the
   export list. In Mark.purs, write `handlerFails typeName cause = "This handler
   may fail here: " <> clauseNote typeName cause`. Neither change alters any
   text.
