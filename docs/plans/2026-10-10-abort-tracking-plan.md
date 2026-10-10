# Tracking Handlers That May Fail (FX008) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: written 2026-10-10, not started. Execution: subagent-driven, on
branch fx008, chosen by the user for this effort. Sonnet implementers do
the mechanical tasks (1, 2, 8, 9). Opus implements the algorithmic tasks
(3-7). Every review is done by Opus. A BLOCKED implementer is escalated
to Opus. Never push.

**Goal:** Make `defer` sound. A computation that performs a label under
a handler whose clauses may fail is known, through rows and across
calls, to possibly abort. Cleanup must perform only labels whose frames
are `nofail`.

**Architecture:** Each label occurrence carries a mark: `nofail` (N),
plain (M), a rigid mark variable `nofail(k)`, or a checker meta. Handler
types carry two rows. R is today's inference row: it unifies with
contexts, its marks are ignored, and a one-way hook keeps it in step
with the clause rows. C is the exact clause row, with its marks.
Consumption is directional and records edges `frame ⊑ assumption`.
Settling becomes one loop over every restricted row. A per-declaration
path check over a two-point lattice then decides the marks. Marks are
stripped before the checked program leaves Check, so Go output does not
change.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Spec:** docs/plans/2026-10-10-abort-tracking-design.md (revision 10,
approved by the user 2026-10-10). "§n" below means its sections; "rev N
review" means docs/sdd/2026-10-09-effects-plan/review-fx008-*-result.md.
The corrected settling loop is in review-fx008-termination-result.md
("Corrected procedure"). Corrections T, F1′ and S are in
review-fx008-rev9-f1f2-result.md ("Smallest corrected procedure"). N1,
N2 and N4 are in review-fx008-rev10-result.md. Executors read the spec
and those three sections.

## Global Constraints

- AGENTS.md and docs/engineering.md govern:
  - `where`, never `let … in`; no anonymous lambdas; `maybe`/`maybe'`/
    `either` with named helpers;
  - 250 physical lines per maintained file, comments included, with a
    target of about 100;
  - about 30 lines, 3 nested decisions, 8 branches and 8 where bindings
    per declaration;
  - 80 columns, purs-tidy and Unicode punctuation;
  - the layer rules and both IR import allowlists, unchanged.
- These files are within 20 lines of the 250-line limit. New code goes
  in new modules, and any growth is offset in the same task:

  | File | Lines |
  |---|---|
  | src/Domain/Type.purs | 249 |
  | src/Domain/Syntax.purs | 249 |
  | test/regression.mjs | 249 |
  | src/Format/Parse/Grammar.purs | 246 |
  | scripts/regression.mjs | 245 |
  | src/Features/Check/UnifyRow.purs | 243 |
  | src/Features/Resolve/Types.purs | 242 |
  | src/Features/Check/Subst.purs | 241 |
  | test/fx-oracle-parse.mjs | 240 |
  | src/Features/Check/Handler.purs | 234 |
  | src/Format/Parse/Type.purs | 233 |
- A3 (§0): run-time behaviour and Go output do not change. `bootstrap/*.go`
  and every emitted Go program stay byte-identical. The probe gate pins a
  SHA-256 of the Go text of every accepted probe.
- §6: programs without `defer` keep their acceptance and meaning; only
  diagnostic texts may move. The single exception is the lost reverse
  link: gain1 becomes accepted.
- §3.3:
  - Console labels are always N, including copies, extensions, `print`'s
    label and a Console frame;
  - `Fail` labels carry a placeholder that is never compared;
  - marks never reach Specialize: specialization keys and `admissible`
    never see them.
- §3.6, §4.8: provenance and notes never influence typing.
- §3.5: the fallback "never extend a tail that ends any restricted row"
  is disqualified. It must not be used, not even silently as a
  simplification.
- T003 linearity:
  - `sync` costs time proportional to the dirty rows;
  - F2 searches only from dirty rows;
  - a declaration with no feed edges settles in two loop rounds;
  - mark propagation is O(edges × atoms).
- **Probe gate rule.** test/fx008-probes.test.mjs (Task 1) asserts every
  review probe's outcome. A task may change a probe's outcome only if
  this plan lists that probe for that task (the `task` field of its
  entry). Any other change stops the work and is reported to the user.
  This includes a moved diagnostic text, span or Go hash. The probe is
  never re-pinned to the new outcome to continue.
- Every task:
  - each new behavioural test is seen failing before its code exists;
  - `rm -rf output && npm run verify` exits 0. On the user's machine the
    timing bounds pass. Any failure is reported as it is: bounds are
    never relaxed, and nothing is rerun to hide a failure;
  - `node scripts/regression.mjs <the task's rows>` prints `Regression
    proof (<row>): fixed compiler passes; restored defect fails.` for
    each row;
  - one commit on branch fx008, ending with the session's attribution
    trailer;
  - docs: an evidence entry in docs/progress.md, which the controller
    writes from the implementer's report (as in FX001 Tasks 6-10); the
    FX008 BACKLOG row's status; one ledger line in
    docs/sdd/2026-10-09-effects-plan/progress.md.
- Regression rows go in scripts/regression-fx008.mjs (`fx008Rows`,
  spread into scripts/regression.mjs's `proved`). Their probes go in
  test/regression-fx008.mjs (`fx008Probes`), merged through the
  aggregator test/regression-probes.mjs (Task 4). Each row is a
  single-file needle and replacement in an isolated copy, as the existing
  rows are. The needle is written against the code as built. A probe
  that can hang compiles in a child process with its own 20 s timeout,
  and reports the timeout as the detected defect (FX001 ruling F17).

## Review Focus

1. Three or more handlers whose clause tails merge during settling,
   through a retried `fail` pair (set1's shape with three handlers),
   must give the same acceptance in every source order (rev9 review 3e).
   Task 5 adds `three handlers merging in settling agree in every order`.
2. A `defer` inside a handler clause that performs the outer label. It
   is accepted when the outer frame cannot fail, and rejected when it
   can. Task 6 adds `a defer inside a clause follows the outer frame`.
3. Marks in existing messages. A `nofail` label prints as `nofail L` in
   every message that names labels. A redundant `nofail Console` never
   prints as `nofail Console`. Task 2 adds `nofail prints in label
   messages, Console never`.
4. Recursion through `nofail` and `nofail(k)` signatures: self and
   mutual. It is accepted, with Go identical to the unmarked program.
   Task 6 adds `recursive nofail and nofail(k) functions`.
5. A handler value carried in a constructor field (L1: fields are not
   opened) and installed under a `defer`. It is accepted when the
   literal cannot fail and rejected when it can. Task 6 adds `a handler
   in a constructor field keeps its mark`.

---

## Decisions this plan makes where the spec is silent

Each one is reported to the user with the plan. Where any of them
conflicts with the spec, the spec wins.

- **P1, representation.** The mark type is `Mark = NoFail | Plain |
  MarkVariable String | MarkMeta Int | Unmarked`.
  - `Plain` means no mark was written. In signatures and data it is the
    atom M. In lambda-parameter annotations it means "fresh meta", and
    Check replaces it (§3.4 "Labels in local annotations").
  - `Unmarked` is the `Fail` placeholder. It is also every mark after
    stripping.
  - A mark variable is named, not numbered. Names are unique per
    signature, and lambda annotations refer to the enclosing signature's
    names.
  - Resolve therefore needs no signature/local context.
- **P2, handler rows.** `THandler` keeps two fields: the handled label,
  whose mark is the own-abort mark m, and a record `{ inference ∷ R,
  clauses ∷ C }`. Record `Eq`/`Ord` keep src/Domain/Type.purs's
  instances unchanged, so that file stays within 250 lines.
- **P3, equality of marks** (types, C ≡ C, the handled label):
  - a meta binds;
  - `Unmarked` is skipped;
  - two different non-meta marks fail like differing arguments: E_TYPE
    `Expected Handler(nofail Log), found Handler(Log)` for a handled
    label, and `Expected nofail Log, found Log` for a row label.
- **P4, where marks are stripped.** Marks are stripped at the end of
  `Features.Check.check`, before `instantiationRule`. `stripProgram` maps
  every mark in every body type and in every table type of the
  `Checked.Program` to `Unmarked`. Specialize then never sees marks, and
  `admissible` ignores them by construction.
- **P5, opening.** §3.4's opening applies to function declarations only:
  their top-level parameter and result types. It does not apply to
  constructor fields (L1 "fields") or to operation signatures.
- **P6, headlines** (§3.6). The headline is chosen by the last edge of
  the violating path, which is the edge into the N or k′ atom:
  - a `defer` demand gives `DeferHandlerMayFail`, or
    `DeferHandlerVariable` when the path starts at a rigid k;
  - a handler's own mark gives `HandlerMayFail`;
  - any other edge gives `ExpectedNofail`.

  §3.6 lists "… performs Log, whose handler may fail" among the frame
  headlines. A handler's own mark m only receives own-abort edges, so
  that case can only occur in the middle of a path. It is rendered as
  the note `this handler's clauses perform Log, whose handler may fail`.
- **P7, path choice.** Paths are found by breadth-first search from each
  non-N atom, M first, then mark variables in signature order, following
  edges in insertion order. The reported violation is the one whose last
  edge has the smallest span start; ties go to the earlier edge. This
  makes headlines and notes deterministic (§3.4 "fixed by source order").
- **P8, step 6.** "Close every remaining mark meta to M" needs no code:
  an unsolved mark prints plain, and stripping erases it.
- **P9, the sort error of §3.2.** Mark variables appear only inside
  `nofail(…)`, so no program can use one as a type. `x: k` beside
  `nofail(k)` names a type variable k (§3.2).
- **P10, texts** for rejections the spec names without wording: see
  Task 2 Step 3 and Task 6 Step 3. All new mark rejections are E_EFFECT,
  except P3's, which are E_TYPE.
- **P11, "1,000 nested handlers"** (§9). Source nesting is capped at
  128 (ADR 006), so the scale test uses two shapes:
  - 1,000 handler installations in one declaration, each with a `defer`;
  - a chain of 1,000 functions, each installing a forwarding handler and
    calling the next (dynamic nesting 1,000).
- **P12, migration timing.** The fx-cleanup migration and the generator's
  `nofail` rows land in Task 6, with the check that rejects them.
  Otherwise verify fails between tasks.

## File map

| Module (new unless marked) | Responsibility | Task |
|---|---|---|
| test/fx008-probes/** (data), test/fx008-probe-table.mjs, test/fx008-probes.test.mjs | probe gate | 1 |
| src/Domain/Row.purs (mod) | `Mark`, the mark field on `Label`, `HandlerRows` | 2 |
| src/Domain/Type.purs (mod) | `THandler (Label (Ty v)) (HandlerRows (Ty v) v)` | 2 |
| src/Domain/Type/Marks.purs | `mapMarks`, `stripMarks`, `markVariables` over types | 2 |
| src/Domain/Note.purs | `Note`, `NoteReason`, moved out of Domain.Syntax and re-exported by it | 2 |
| src/Domain/Syntax.purs (mod) | `MarkRef`; `LabelRef.mark` | 2 |
| src/Format/Parse/Mark.purs | `nofail` and `nofail(k)` before labels | 2 |
| src/Features/Resolve/Marks.purs | mark variables: collection, L6 refusal, lambda scope | 2 |
| src/Features/Check/MarkUse.purs | instantiation of mark variables, local fresh marks, opening | 2-3 |
| src/Features/Check/Strip.purs | `stripProgram` | 2 |
| test/fx-oracle-marks.mjs | the oracle drops mark tokens | 2 |
| src/Features/Check/MarkStore.purs | mark bindings, edges, `RowMode` | 3 |
| src/Features/Check/RowFinish.purs | `finish`, `unifyTails`, moved out of UnifyRow | 3 |
| src/Features/Check/UnifyMark.purs | mark pairing, copies, extension labels | 3 |
| src/Features/Check/Cycle.purs | feed graph, SCC order, per-key positive cycles | 4 |
| src/Features/Check/Settle.purs | the §3.5 loop | 4-6 |
| test/regression-probes.mjs | aggregator of external regression probes | 4 |
| src/Features/Check/Handle.purs | `handleFailure`, moved out of Handler | 5 |
| src/Features/Check/Restricted.purs | registry of clause entries, classes, installations | 5 |
| src/Features/Check/Watch.purs | watched/dirty tail sets on Subst | 5 |
| src/Features/Check/Sync.purs | the one-way hook (F1′, F2, T) | 5 |
| src/Features/Check/Clauses.purs | clause own rows of a handler literal | 5 |
| src/Features/Check/TailPass.purs | the clause-tail pass | 5-6 |
| src/Features/Check/Install.purs | `with`: C consumption, frame mark | 6 |
| src/Features/Check/Frames.purs | own-abort, frame and defer-demand edges | 6 |
| src/Features/Check/Mark.purs | the path check | 6 |
| src/Features/Check/MarkReport.purs | a violation as a diagnostic | 6-7 |
| src/Format/Diagnostic/Mark.purs | headline and note texts | 6-7 |
| test/fx008-*.test.mjs, test/fx008-scale.serial.test.mjs | tests per task | 2-8 |
| scripts/regression-fx008.mjs, test/regression-fx008.mjs | regression rows and probes | 4-6 |
| test/fx008-soundness.serial.test.mjs | one-way soundness differential | 8 |

---

### Task 1: Probe gate

Keeps every review probe and pins what today's compiler does with it.
There is no compiler change. Implementer: Sonnet.

**Files:**
- Create:
  - `test/fx008-probes/` (data fixtures): a copy of every `.wxw` under
    `.build/fx008-probes/`, keeping the layout: the top level, then
    rev6, rev7, rev8, rev9 and rev10;
  - `test/fx008-probes/review/` with the five design-review programs
    listed below;
  - `test/fx008-probe-table.mjs`: the table. Data only, which may split
    by directory (`test/fx008-probe-table-rev6.mjs` and so on) to stay
    within 250 lines;
  - `test/fx008-probes.test.mjs`: the executable gate.
- Modify: `docs/engineering.md`, with one sentence naming the gate and
  its rule.

**Interfaces:**
- Produces, in test/fx008-probe-table.mjs:
  `export const probes = [{ file, today, fx008?, task?, flipped, slow? }]`.
  - `file` is relative to test/fx008-probes.
  - `today` and `fx008` are each one of:
    - `{ accepted: true, stdout, stderr, status, go }`, where `go` is the
      SHA-256 hex of the emitted Go text;
    - `{ accepted: false, code, message, start, end }`, with span
      offsets;
    - for an FX008 rejection whose text the spec leaves to the
      implementation, `{ accepted: false, code, pattern }`, with the
      pattern a regular expression.
  - `task` names the task that flips the probe.
  - `flipped` is false until that task sets it.
  - `slow: true` marks a probe that compiles in a child process with a
    20,000 ms timeout.
- Later tasks consume the table. They change only the `flipped` field
  of the entries listed for them, and they pin exact texts where this
  task left a pattern.

- [ ] **Step 1: Copy the probes.** Copy all 83 `.wxw` files under
  .build/fx008-probes/ into test/fx008-probes/, keeping the layout.
  Write these into test/fx008-probes/review/ verbatim:

  `p1.wxw` (I1, local lambda):
  ```
  type E = E;
  effect Log { fn log(n: Int): Unit; };
  fn main(): Unit with Console =
    handle {
      let k = fn(n: Int) => log(n);
      with handler Log { log(n) => print(n) } { defer log(1); k(2) };
      with handler Log { log(n) => fail(E) } { k(3) }
    } { fail(error: E) => print(9) };
  ```
  `p2.wxw` (I1, let-bound handler installed under two rows):
  ```
  type E = E;
  effect Log { fn log(n: Int): Unit; };
  fn main(): Unit with Console =
    handle {
      let fwd = handler Log { log(n) => log(n + 10) };
      with handler Log { log(n) => print(n) } { with fwd { defer log(1); () } };
      with handler Log { log(n) => fail(E) } { with fwd { log(3) } }
    } { fail(error: E) => print(9) };
  ```
  `p3.wxw` (review C2):
  ```
  type E = E;
  effect Log { fn log(n: Int): Unit; };
  fn main(): Unit with Console = {
    let mk = fn(g) => handler Log { log(n) => g(n) };
    let h = mk(fn(n: Int) => fail(E));
    with h { log(1) }
  };
  ```

  `q1.wxw` (I2 and N5, today's syntax):
  ```
  type E = E;
  effect Log { fn log(n: Int): Unit; };
  fn prefix(): Handler(Log with Log) with pure = handler Log { log(n) => log(n + 100) };
  fn run(h: Handler(Log with Log + ...e)): Unit with Log + ...e = { defer log(0); with h { log(1) } };
  fn main(): Unit with Console =
    handle {
      with handler Log { log(n) => print(n) } { with prefix() { defer log(1); () } };
      with handler Log { log(n) => print(n) } { run(prefix()) };
      with handler Log { log(n) => fail(E) } { with prefix() { log(3) } }
    } { fail(error: E) => print(9) };
  ```
  `q2.wxw`:
  ```
  type E = E;
  effect Log { fn log(n: Int): Unit; };
  fn mk(): Handler(Log) = handler Log { log(n) => fail(E) };
  fn main(): Unit with Console = handle with mk() { log(1) } { fail(error: E) => print(9) };
  ```

- [ ] **Step 2: Record today's outcomes.**
  - Compile every probe with the current build.
  - Run every accepted probe in one `runGoBatch(import.meta.url, …)`
    batch, using `batch.result(name)` for the raw stdout, stderr and
    status.
  - Hash the emitted Go text with `node:crypto` SHA-256.
  - Write the results as `today`.
  - Compare them with the planner's run (fca4134, 2026-10-10) below. Any
    difference stops the task and is reported, because it means the
    baseline is not the one the spec was reviewed on.

  Rejected today (code, message, span):

  | Probe | Code | Message | Span |
  |---|---|---|---|
  | argbind-internal | E_INTERNAL | `Effect row consumption failed` | 318-335 |
  | failvar | E_TYPE | `Fail needs a concrete error family` | 25-32 |
  | failvar2, failvar3 | E_TYPE | `Fail needs a concrete error family` | 37-44 |
  | rigid-ok | E_EFFECT | `Fail(E) + Console + ... and Console + ... cannot be made equal: both end in ...` | 216-236 |
  | rigid | E_TYPE | `Expected Handler(Log), found Handler(Log)` | 98-128 |
  | rev10/gain1 | E_EFFECT | `Unhandled Cell(Bool) in main` | 263-268 |
  | rev10/pair1ctl | E_TYPE | `Ambiguous type Opt(_) in comparison` | 302-303 |
  | rev6/amb2 | E_EFFECT | `Unhandled Tick in main` | 162-200 |
  | rev6/annot | E_EFFECT | `Console + Log + ... and Console + ... cannot be made equal: both end in ...` | 235-262 |
  | rev6/around | E_EFFECT | `around performs Log, which its signature does not allow` | 185-211 |
  | rev6/around2 | E_EFFECT | the same message | 158-182 |
  | rev6/around3 | E_EFFECT | the same message | 154-162 |
  | rev6/around6 | E_EFFECT | the same message | 211-219 |
  | rev6/around4 | E_SYNTAX | `Expected a capitalized name` | 74-78 |
  | rev6/con | E_INTERNAL | `Invalid handler effect` | 0-0 |
  | rev6/ext | E_EFFECT | `defer must not fail, but it performs Fail(E)` | 227-241 |
  | rev6/l4 | E_EFFECT | `Log + Fail(E) + Console + ... and Log + Console + ... cannot be made equal: both end in ...` | 304-309 |
  | rev6/reuse2 | E_EFFECT | that same message | 354-359 |
  | rev6/meta3 | E_TYPE | `Ambiguous type Opt(_) in comparison` | 247-248 |
  | rev7/late1ctl | E_TYPE | `Expected a handler` | 311-332 |
  | rev7/rig1 | E_EFFECT | `f performs Tick, which its signature does not allow` | 255-261 |
  | rev7/rig2 | E_EFFECT | the same message | 256-261 |
  | rev8/cyc2 | E_EFFECT | `... and Tick + ... cannot be made equal: both end in ...` | 174-179 |
  | rev8/cyc3 | E_EFFECT | `... and Log + Tick + ... cannot be made equal: both end in ...` | 338-344 |
  | rev8/one1ctl | E_TYPE | `Ambiguous type Opt(_) in comparison` | 276-277 |
  | rev8/one3ctl | E_TYPE | `Expected a handler` | 358-379 |
  | rev8/two1ctl | E_TYPE | `Ambiguous type Opt(_) in comparison` | 322-323 |
  | rev8/two1fctl | E_TYPE | `Fail needs a concrete error family` | 365-371 |
  | rev8/two3ctl | E_TYPE | `Expected a handler` | 406-427 |
  | rev9/ov1ctl | E_EFFECT | `Unhandled Tick in main` | 290-308 |
  | rev9/set1ctl | E_TYPE | `Ambiguous type Opt(_) in comparison` | 411-412 |
  | rev9/sh1 | E_EFFECT | `... and Tick + ... cannot be made equal: both end in ...` | 237-242 |
  | review/p3 | E_EFFECT | `Unhandled Fail(E) in main` | 174-191 |
  | review/q2 | E_EFFECT | `This function must be pure, but it performs Fail(E)` | 74-107 |

  Accepted today, with status 0 and empty stderr:

  | Stdout | Probes |
  |---|---|
  | empty | argbind, cycle2open, dup, n1, rev6/hole2, hole2b, hole2c, hole3, hole4, meta2, rev7/late3 |
  | `0\n7\n1\n` | cycle2 |
  | `1\n2\n` | f1, f2, rev6/annotb |
  | `9\n` | f3 |
  | `0\n` | rev10/gain1ctl, pair1, rl1, rl1ctl; rev6/l4b; rev7/late1, late2; rev8/cyc1, cyc1ok, one1, one1rev8, one3, two1, two1f, two2, two2ctl, two3; rev9/ov1, ov1f, set1 |
  | `1\n` | rev6/amb |
  | `5\n` | rev6/amb3 |
  | `101\n` | rev6/around5 |
  | `2\n` | rev6/con2 |
  | `12\n0\n9\n` | rev6/extb |
  | `7\n` | rev6/hole1 |
  | `true\n` | rev6/meta1 |
  | `12\n0\n` | rev6/reuse |
  | `1\n5\n9\n` | rev7/annotc, annotd |
  | `1\n9\n` | rev7/merge1, merge2, merge2ctl |
  | `2\n1\n9\n` | review/p1 |
  | `11\n9\n` | review/p2 |
  | `101\n101\n0\n9\n` | review/q1 |

  Accepted with a defect report: rev6/hole runs to status 1, with empty
  stdout and stderr `fail(E): E\n` (the hole itself).

- [ ] **Step 3: Mark the FX008 outcomes.** Every entry gets `fx008`
  equal to `today` (unchanged), except these:

  | Probe | FX008 outcome | Task |
  |---|---|---|
  | dup, n1 | rejected E_EFFECT, pattern `/ cannot be made equal: both end in \.\.\.$/` (§6) | 4 |
  | rev10/gain1 | accepted, `0\n` (§6, sound gain; Go hash pinned by Task 5) | 5 |
  | rev6/hole | rejected E_EFFECT `defer must not fail, but it performs Log, whose handler may fail`, span `defer log(1)` (§1) | 6 |
  | rev6/l4b | rejected, same message, span `defer log(0)` (L4) | 6 |
  | rev7/merge2 | rejected E_EFFECT `defer must not fail, but it performs Tick, whose handler may fail`, span `defer tick()` (L4) | 6 |
  | review/q1 | rejected, the Log message, span `defer log(0)`: `run`, checked before `main`, has an M `Log` (I2: "as written, prefix is M") | 6 |

  `slow: true` goes on dup, n1, cycle2, cycle2open, argbind,
  argbind-internal, rev8/cyc1, cyc1ok, cyc2 and cyc3, and rev9/sh1 and
  set1.

  argbind-internal (FX010) and rev6/con (FX011) are pre-existing
  defects. Their FX008 outcome is not determined by the spec, so it is
  recorded as unchanged, and the gate rule applies to them.

- [ ] **Step 4: Write test/fx008-probes.test.mjs.** It has one `test` per
  entry, named `probe <file>`. The expected outcome is `flipped ? fx008 :
  today`.
  - A slow probe is compiled by spawning `node` on a small script that
    imports `output/Program.Compile/index.js` and prints the wire
    diagnostic or the Go text, with a timeout of 20,000 ms. A timeout is
    a failure named `timed out`.
  - Accepted entries are run in one go-batch, compared exactly on
    stdout, stderr and status, and compared on the Go hash.
  - Rejected entries are compared on code and message, or on the
    pattern, and on `[start, end]`.
  - A span given as text (`at: 'defer log(1)'`) is computed with
    `indexOf`.

- [ ] **Step 5: Show that the gate can fail.** In a scratch copy only,
  change one recorded stdout and one recorded message.
  - Expected: those two tests FAIL, with the probe file named.
  - Restore the copy and record the check in the report. It is not
    committed.

- [ ] **Step 6: Run** `node --test test/fx008-probes.test.mjs`.
  - Expected: PASS, with 88 tests.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0.

- [ ] **Step 7: Commit** `test: FX008 probe gate (today's outcomes of
  every review probe)`.

---

### Task 2: Marks in the representation, syntax and resolution

Marks exist, parse, resolve, print and are stripped. Unification still
ignores them, so acceptance and Go output are unchanged, and the gate is
unchanged.

**Files:**
- Modify:
  - `src/Domain/Row.purs`
  - `src/Domain/Type.purs`: net growth of at most 1 line, through a
    qualified `import Domain.Row as Row` if the import list would wrap
  - `src/Domain/Syntax.purs`: move `Note` and `NoteReason` into
    Domain.Note and re-export them with `module Domain.Syntax (module
    Domain.Syntax, module Domain.Note) where`, so importers are unchanged
  - `src/Domain/Problem.purs`
  - `src/Domain/Resolved.purs`
  - every `Label` and `THandler` construction or match, which the
    compiler lists: about 100 sites, mechanical, each gaining a mark
    argument (constructed labels use `Plain`, Console `NoFail`, Fail
    `Unmarked`)
  - `src/Format/Parse/Row.purs` and `src/Format/Parse/HandlerType.purs`:
    route labels through Format.Parse.Mark
  - `src/Format/Parse/Type.purs`: the `argument` dispatch gains
    `on "nofail"`, with net growth of 0-2 lines
  - `src/Features/Resolve/Row.purs`, `Resolve.purs`, `Types.purs`,
    `HandlerType.purs`, `Lambda.purs`, `Effect.purs`
  - `src/Features/Check/Lambda.purs`, `Use.purs`, `Operation.purs`,
    `RowName.purs`, `Context.purs`, `Infer.purs` (Env) and
    `src/Features/Check.purs`
  - `src/Format/Diagnostic.purs`
  - `tools/style/src/Style/Parser.purs`: add `"Format.Parse.Mark"` to
    the applicative module list
  - `docs/engineering.md`: the G001 module list
  - `test/unify-support.mjs`, `test/row-support.mjs`, `test/poly-keys.mjs`
    and `test/fx-handler-type.test.mjs`: label and handler constructors
    gain the mark
  - `test/fx-oracle-parse.mjs`: one import line
- Create:
  - `src/Domain/Note.purs`
  - `src/Domain/Type/Marks.purs`
  - `src/Format/Parse/Mark.purs`
  - `src/Features/Resolve/Marks.purs`
  - `src/Features/Check/MarkUse.purs`
  - `src/Features/Check/Strip.purs`
  - `test/fx-oracle-marks.mjs`
  - `test/fx008-syntax.test.mjs`

**Interfaces:**
- Produces in Domain.Row:
  - `data Mark = NoFail | Plain | MarkVariable String | MarkMeta Int | Unmarked`,
    with `Eq` and `Ord`;
  - `data Label t = Label EffectRef (Array t) Mark`. The mark is last,
    so derived `Ord` ranks labels by effect first, as today;
  - `type HandlerRows t v = { inference ∷ Row t v, clauses ∷ Row t v }`;
  - `labelMark ∷ ∀ t. Label t → Mark`;
  - `withMark ∷ ∀ t. Mark → Label t → Label t`;
  - `normalMark ∷ EffectRef → Mark → Mark`: Console gives `NoFail`, Fail
    gives `Unmarked`, anything else the given mark;
  - `mapHandlerRows ∷ ∀ t v u w. (Row t v → Row u w) → HandlerRows t v →
    HandlerRows u w`.
- Produces in Domain.Type: `THandler (Label (Ty v)) (HandlerRows (Ty v) v)`.
  `substitute` and the instances cover both rows.
- Produces in Domain.Type.Marks:
  - `mapMarks ∷ ∀ v. (Mark → Mark) → Ty v → Ty v`;
  - `mapRowMarks ∷ ∀ v. (Mark → Mark) → TyRow v → TyRow v`;
  - `stripMarks ∷ ∀ v. Ty v → Ty v` (every mark becomes `Unmarked`);
  - `markVariables ∷ ∀ v. Array (Ty v) → Array String` (distinct, in
    first-occurrence order).

  All of them walk spines by a loop, like Domain.Type.
- Produces in Domain.Syntax:
  - `data MarkRef = NofailRef Span | NofailVariableRef Span String`;
  - `type LabelRef = { name ∷ String, arguments ∷ Array TypeRef, span ∷
    Span, mark ∷ Maybe MarkRef }`. `span` stays the label's own span, so
    existing spans are unchanged.
- Produces in Domain.Problem: `NofailOnFail`, `MarkVariableOutsideSignature
  String` and `UnboundKind`'s `UnboundMarkVariable`.
- Produces in Domain.Resolved: `FunctionDecl` gains `markVariables ∷
  Array String`.
- Produces in Format.Parse.Mark: `markedLabel ∷ Parser TypeRef → Parser
  LabelRef`, an optional `nofail` or `nofail(name)` followed by `label`.
- Produces in Features.Resolve.Marks:
  - `markVariableRefs ∷ Syntax.TypeRef → Array { name ∷ String, span ∷
    Syntax.Span }` and `rowMarkVariableRefs ∷ Syntax.RowRef → Array { name
    ∷ String, span ∷ Syntax.Span }`;
  - `refuseMarkVariables ∷ Array { name ∷ String, span ∷ Syntax.Span } →
    Either Syntax.Diagnostic Unit`;
  - `scopedMarkVariables ∷ Array String → Array { name ∷ String, span ∷
    Syntax.Span } → Either Syntax.Diagnostic Unit`.
- Produces in Features.Check.MarkUse:
  - `instantiateMarks ∷ Array String → State → Threaded (Mark → Mark)`:
    one fresh `MarkMeta` per name, from `state.next`, and identity on
    other marks;
  - `localMarks ∷ State → Ty Open → Threaded (Ty Open)`: every `Plain`
    becomes a fresh meta, and every `THandler`'s `clauses` row becomes
    its labels, with those marks freshened, plus a fresh `Hole` tail.
- Produces in Features.Check.Strip: `stripProgram ∷ Checked.Program →
  Checked.Program`.
- Produces in CheckEnv and Infer.Env: a field `markVariables ∷ Array
  String`, the function's own.
- Changes Use: `declarationUse ∷ State → Array String → Array String →
  Array Syntax.Sort → Array (Ty Resolved.VarId) → Ty Resolved.VarId →
  TyRow Resolved.VarId → Threaded Use`. The new second argument is the
  mark variables. Constructors and operations pass `[]`.
- Changes RowName: `labelName` and `labelView` print `nofail L` for a
  resolved `NoFail` mark and `nofail(k) L` for `MarkVariable k`, except
  on Console and Fail. Anything else prints plain.

- [ ] **Step 1: Write the failing tests** in test/fx008-syntax.test.mjs,
  using `checked`, `rejectedAt` and `runGo` from test/support.mjs. Names
  and assertions:
  - `nofail parses in every row position`. These compile, and their Go
    is byte-identical to the same source with every `nofail` and
    `nofail(k)` removed:
    - `fn f(): Unit with nofail Log = log(1);`
    - `fn g(): Unit with Console + nofail Log = log(1);`
    - `fn h(x: Box(nofail Log)): Unit = ();`, with `type Box(...e) =
      Box(Unit -> Unit with ...e);`
    - `fn m(): Handler(nofail Log with pure) = handler Log { log(n) => () };`
    - `fn v(): Unit with nofail(k) Log = log(1);`

    Each has `effect Log { fn log(n: Int): Unit; };` and a `main` that
    uses it under `with handler Log { log(n) => print(n) }`.
  - `nofail is an ordinary name elsewhere`.
    `type Opt(a) = No | Some(a); fn nofail(x: Int): Int = x; fn g(y:
    Opt(nofail)): Int = { let nofail = 1; nofail }; fn main(): Int =
    nofail(2);` runs and prints `2\n`, as today.
  - `nofail on Fail is E_TYPE`. `rejectedAt(source, 'E_TYPE', 'Fail(E)')`,
    with message `nofail does not apply to Fail`, for `fn f(): Unit with
    nofail Fail(E) = ();` and for `nofail(k) Fail(E)`.
  - `nofail on a row variable is E_SYNTAX`. `fn f(): Unit with nofail
    ...e = ();` is E_SYNTAX `nofail ...e is not supported yet`, spanning
    `nofail ...e`.
  - `mark variables only in function signatures`. `type T = T(Unit ->
    Unit with nofail(k) Log);` and an operation `fn op(f: Unit -> Unit
    with nofail(k) Log): Unit;` are E_TYPE `nofail(k) is allowed only in
    function signatures`, spanning `nofail(k)`.
  - `a lambda names only its signature's mark variables`. `fn f(): Unit
    with nofail(k) Log = { let g = fn(x: Unit -> Unit with nofail(j)
    Log) => (); () };` is E_UNBOUND `Unbound mark variable j`, spanning
    `nofail(j)`. With `k` in place of `j`, it compiles.
  - `x: k beside nofail(k) is a type variable`. `fn f(x: k): k with
    nofail(k) Log = x;` compiles.
  - `nofail Console is redundant`. `fn f(): Unit with nofail Console =
    print(1);` and `nofail(k) Console` compile, with Go identical to
    plain `Console`.
  - `nofail prints in label messages, Console never` (Review Focus 3):
    - `effect State(s) { fn put(value: s): Unit; }; fn f(): Unit with
      nofail State(Int) = put(true); fn main(): Int = 0;` is E_TYPE
      `Expected nofail State(Int), found State(Bool)`, spanning
      `put(true)`;
    - `fn f(k: Unit -> Unit with nofail Log + ...e): Unit with Clock +
      ...e = k(());` (with Log and Clock declared) is E_EFFECT `f
      performs nofail Log, which its signature does not allow`;
    - `fn f(): Unit with nofail Console + Log = g();` with `fn g(): Unit
      with Clock = …` gives a message containing `Console` and never
      `nofail Console`.
  - `marks never reach Go`. For examples/answer.wxw and a program using
    every form above, the specialization keys of the marked program and
    the unmarked one are equal. Use test/poly-keys.mjs, as test/fx-*
    does. bootstrap/*.go stay byte-identical, which the existing
    snapshot tests check.
  - In test/fx-oracle.test.mjs: `the oracle ignores nofail marks`. The
    interpreter's outcome on the first program above equals its outcome
    on the unmarked source.

- [ ] **Step 2: Run** `node --test test/fx008-syntax.test.mjs`.
  - Expected: FAIL. The parse fails at `nofail`.

- [ ] **Step 3: Implement.**
  - Grammar:
    - `nofail` before a label after `with`, after `+`, at the start of a
      row argument, and as the handled label of `Handler(…)`;
    - in a type-argument position, `nofail` is a mark only when the next
      token is an uppercase name or `(`, and otherwise a type variable.
      The dispatch reads the `nofail` token, then dispatches on the next
      token. It stays applicative (G001);
    - a marked label in a type-argument position is always a
      `RowArgument`, never a `NamedRef`. `Box(nofail Log)` is a
      one-label row, and in a type slot it gives today's sort error;
    - `nofail ...name` is the E_SYNTAX above.
  - Resolution of a mark:
    - none gives `Plain`; `nofail` gives `NoFail`; `nofail(k)` gives
      `MarkVariable "k"`;
    - then `normalMark`, so that Console is `NoFail`;
    - on Fail a written mark is `NofailOnFail`, at the label span.
  - Mark variables:
    - a signature's mark variables are `markVariables` of its parameter
      and result types and its row, set on `FunctionDecl.markVariables`;
    - type, constructor and effect declarations refuse every
      `nofail(k)`;
    - lambda annotations check theirs against the enclosing function's
      list (`Annotations` gains `markVariables`).
  - Handler types: a written `Handler(m L with R)` resolves to `clauses =
    inference`. That is the structural copy of §3.4 for signatures, and
    Check re-makes it for locals.
  - In Check:
    - `Lambda.parameterType` applies `localMarks` to annotated types;
    - `Use.functionUse` passes `function.markVariables`;
    - `declarationUse` maps each scheme type through `instantiateMarks`;
    - `Check.check` applies `stripProgram` before `instantiationRule`;
    - all unification still ignores marks: `Label` matches with `_` for
      the mark.
  - Diagnostic texts in Format.Diagnostic: `NofailOnFail` is `nofail
    does not apply to Fail`; `MarkVariableOutsideSignature k` is
    `nofail(` k `) is allowed only in function signatures`;
    `UnboundMarkVariable` is `mark variable`.
  - test/fx-oracle-marks.mjs exports `withoutMarks(tokens)`. It drops
    `nofail` before an uppercase name, and `nofail ( name )` before one.
    fx-oracle-parse.mjs applies it to its token list.

- [ ] **Step 4: Run** `node --test test/fx008-syntax.test.mjs
  test/fx-oracle.test.mjs test/fx008-probes.test.mjs`.
  - Expected: PASS. The gate is unchanged.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0, with
    the snapshots byte-identical.

- [ ] **Step 5: Commit** `feat: nofail marks in rows, syntax and
  resolution (FX008)`.

---

### Task 3: Directional consumption, copies and mark equality

Consumption records `frame ⊑ assumption` edges. Types unify marks by
equality. Handler types are opened at declaration use. Nothing reads the
edges yet. The only new rejections are P3's equality mismatches, which
need a written `nofail`. Implementer: Opus.

**Files:**
- Create:
  - `src/Features/Check/MarkStore.purs`
  - `src/Features/Check/RowFinish.purs`
  - `src/Features/Check/UnifyMark.purs`
  - `test/fx008-marks.test.mjs`: unifier unit tests, through JS
  - `test/fx008-equality.test.mjs`: CLI behaviour
- Modify:
  - `src/Features/Check/UnifyRow.purs`: first, as its own refactor step,
    move `Operands`, `Pending`, `postponed`, `finish`, `unifyTails` and
    `shared` to RowFinish, unchanged
  - `src/Features/Check/Subst.purs`: add the field `marks`; move
    `compose` to Unify.purs if the file would pass 250 lines (it is
    re-exported, so test imports stay the same)
  - `Binding.purs`: `extendBounded` copies the new field
  - `Unify.purs`: the `THandler` arm
  - `Consume.purs`
  - `Use.purs`: opening
  - `Handler.purs`: `with` consumes R with marks ignored
  - `Defer.purs`, `Failure.purs` and `Unify.purs` `settleRows`: these
    pass modes
  - `test/unify-support.mjs` and `test/row-support.mjs`: the new
    `unifyRowsTraced` argument

**Interfaces:**
- Produces in Features.Check.MarkStore:
  - `type MarkEdge t = { lower ∷ Mark, upper ∷ Mark, label ∷ Label t,
    reason ∷ EdgeReason }`. It reads "lower ⊑ upper", N ⊑ M;
  - `data EdgeReason = Assumed Span | Copied Span | Extended Span |
    OwnAbort AbortSite | FrameOwn Span | FrameOuter Span | FrameRigid
    Span String | DeferDemand Span`;
  - `type AbortSite = { handler ∷ Span, clause ∷ Span, operation ∷
    String, rigid ∷ Maybe String }`. `rigid` is `Nothing` for a `Fail`
    and the tail name for a rigid tail. This task only defines it;
    Task 6 uses it;
  - `type MarkStore t = { bindings ∷ Map Int Mark, edges ∷ Stack (MarkEdge
    t) }`, using Features.Check.Search `Stack`, since edges grow with
    the input;
  - `emptyMarks ∷ ∀ t. MarkStore t`;
  - `resolveMark ∷ ∀ t. MarkStore t → Mark → Mark`, which follows meta
    bindings by a loop;
  - `bindMark ∷ ∀ t. Int → Mark → MarkStore t → MarkStore t`;
  - `addEdge ∷ ∀ t. MarkEdge t → MarkStore t → MarkStore t`;
  - `edgesOf ∷ ∀ t. MarkStore t → Array (MarkEdge t)`, in insertion
    order;
  - `data RowMode = EqualMarks | IgnoreMarks | Directional Direction`,
    with `type Direction = { span ∷ Span, throwaway ∷ Maybe Int }`.
- Produces in Subst: the field `marks ∷ MarkStore (Ty Flex)`.
  `resolveLabel` resolves the mark. `RowPair` gains `mode ∷ RowMode`,
  so a postponed consumption is retried in its own mode.
- Produces in Features.Check.UnifyMark. The left/stage label comes
  first and the right/target label second:
  - `pairMarks ∷ RowMode → Subst → Label (Ty Flex) → Label (Ty Flex) →
    Either Failure Subst`:
    - `EqualMarks` follows P3. A failure is `RowPayload` with the two
      labels resolved;
    - `IgnoreMarks` does nothing;
    - `Directional` adds `Assumed span` with lower the target's mark and
      upper the stage's;
    - `Unmarked` on either side adds nothing.
  - `targetLabel ∷ RowMode → Subst → Label (Ty Flex) → { label ∷ Label
    (Ty Flex), subst ∷ Subst }` is the label added to the target's tail.
    `EqualMarks` gives the label itself. `IgnoreMarks` gives a fresh
    meta. `Directional` gives a fresh meta t and the edge `t ⊑ s`,
    `Extended span`.
  - `stageLabel ∷ RowMode → Int → Subst → Label (Ty Flex) → { label ∷
    Label (Ty Flex), subst ∷ Subst }` is the label added to the stage's
    tail meta. `EqualMarks` gives the label itself. `IgnoreMarks` gives
    a fresh meta. `Directional` gives a fresh c and the edge `ρ ⊑ c`,
    `Copied span`. If the meta is the `throwaway`, the label is shared
    and no copy is made (rev6 M9).
  - Fresh marks come from `Subst.fresh`, counting down. Console labels
    stay `NoFail` and Fail labels stay `Unmarked`.
- Produces in UnifyRow:
  - `unifyRowsTraced ∷ Unifier → RowMode → Sides → Subst → TyRow Flex →
    TyRow Flex → Either Failure Traced`;
  - `unifyRows`, which uses `EqualMarks`;
  - `unifyRowsIgnoring ∷ Unifier → Subst → TyRow Flex → TyRow Flex →
    Either Failure Subst`.
- Produces in Consume:
  - `consumeVia` is directional. Its span is the origin's span, and its
    throwaway is the fresh tail it adds to a closed stage;
  - `consumeIgnoring ∷ ∀ r. CheckEnv r → State → Origin → TyRow Open →
    Either Diagnostic State`, the same with `IgnoreMarks`;
  - `consumeAt` stays directional.
- Changes Unify `THandler`:
  - the handled labels' arguments and marks unify with `EqualMarks`;
  - `inference` rows with `unifyRowsIgnoring`;
  - `clauses` rows with `unifyRows`.
- Produces in MarkUse: `openHandlers ∷ State → Array (Ty Open) → Ty Open →
  Threaded { fields ∷ Array (Ty Open), result ∷ Ty Open }`. A top-level
  parameter `THandler` whose handled mark is `Plain`, and a top-level
  result `THandler` whose mark is `NoFail`, each get a fresh `MarkMeta`
  for that mark (§3.4 "Opening", P5). `functionUse` applies it.

- [ ] **Step 0: Refactor.**
  - Move the end of the row unifier into RowFinish, unchanged.
  - Run `rm -rf output && npm run verify`. Expected: exit 0.
  - Run `node scripts/differential.mjs` against a build of the base
    commit. Expected: 0 differences.
  - Commit `refactor: split the row unifier's end (FX008)`.

- [ ] **Step 1: Write the failing tests.**

  In test/fx008-marks.test.mjs, build rows with test/unify-support.mjs.
  Its `toLabel` takes `{ e, args, mark }`, with mark default `Plain`.
  Then call `unifyRowsTraced`:
  - `a matched pair records frame ⊑ assumption`. A stage `[Log(m1)]`
    against a target `[Log(m2) | r]`, Directional, gives exactly one
    edge, with lower `MarkMeta m2` and upper `MarkMeta m1`;
  - `a label added to the target gets a fresh mark below the stage's`.
    A stage `[Log(m1)]` against a target `[| r]` gives a target label
    with a new meta t ≠ m1 and the edge `t ⊑ m1`, `Extended`;
  - `a label copied into the stage tail gets a fresh mark above the
    frame's`. A stage `[| s]` against a target `[Log(m2) | r]`, with s
    not throwaway, binds s to a label with a fresh c and the edge
    `m2 ⊑ c`, `Copied`;
  - `no copy lands on a throwaway tail`. The same with `throwaway = s`
    binds the label with mark m2 and records no edge;
  - `Console stays nofail through copies and extensions`. Every Console
    label in the result has mark `NoFail`, and no edge mentions it;
  - `equality binds mark metas and records no edge`;
  - `equality of two different written marks fails`. `NoFail` against
    `Plain` with `EqualMarks` is `RowPayload`;
  - `ignoring marks gives fresh marks and no edge`;
  - `the scoped-label properties hold in every mode`. Extend
    test/row-properties.test.mjs's generator with random marks. For
    every pair and every mode, the resolved results are equal after
    `stripMarks`, compared with the mark-free run. In Directional mode,
    every matched pair has exactly one `Assumed` edge.

  In test/fx008-equality.test.mjs (CLI):
  - `a fail-free handler parameter refuses a plain handler` (§9). This
    source gives E_TYPE `Expected Handler(nofail Log), found
    Handler(Log)`, spanning the argument `h` in `run(h)`:
    ```
    effect Log { fn log(n: Int): Unit; };
    fn run(h: Handler(nofail Log with pure)): Unit = with h { log(1) };
    fn pass(h: Handler(Log with pure)): Unit = run(h);
    fn main(): Int = 0;
    ```
  - `handler types open at declaration use`. This compiles, prints
    `0\n`, and its Go equals the unmarked source's:
    ```
    effect Log { fn log(n: Int): Unit; };
    fn run(h: Handler(Log with pure)): Unit = with h { log(1) };
    fn mk(): Handler(nofail Log with pure) = handler Log { log(n) => () };
    fn main(): Int = { run(mk()); 0 };
    ```
  - `callback rows are invariant in marks`. `fn need(k: Unit -> Unit with
    nofail Log): Unit = (); fn give(k: Unit -> Unit with Log): Unit =
    need(k);` gives E_TYPE `Expected nofail Log, found Log`, spanning
    `k` in `need(k)`. If the existing payload reporting prints the
    whole function type instead, assert the text it prints and record
    it in the report.
  - `a lambda passed to a nofail callback compiles`. `need(fn(u: Unit)
    => log(1))` under `with nofail Log` compiles.

- [ ] **Step 2: Run** `node --test test/fx008-marks.test.mjs
  test/fx008-equality.test.mjs`.
  - Expected: FAIL. There are no edges, and the first program compiles.

- [ ] **Step 3: Implement** the interfaces above.
  - UnifyRow's `present` calls `pairMarks`. `absent` calls
    `targetLabel`. RowFinish's leftover extension calls `stageLabel`.
  - `Operands` carries the mode.
  - `settleRows` retries each pair in its stored mode.
  - `Handler.withHandler` consumes R with `consumeIgnoring`.
  - UnifyRow.purs and Subst.purs stay within 250 lines.

- [ ] **Step 4: Run** the tests of Step 2 and test/fx008-probes.test.mjs.
  - Expected: PASS. The gate is unchanged.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0.

- [ ] **Step 5: Commit** `feat: directional consumption, mark copies
  and mark equality (FX008)`.

---

### Task 4: The restricted-row settling loop (deferred rows)

Replaces `settleKeys`, `settleDeferred` and `settleKeys` with the
corrected loop of review-fx008-termination-result.md, over deferred
rows. Task 5 adds clause rows and Task 6 adds installations. The defer
judgement moves after the loop. dup and n1 flip. Implementer: Opus.

**Files:**
- Create:
  - `src/Features/Check/Cycle.purs`
  - `src/Features/Check/Settle.purs`
  - `test/fx008-settle.test.mjs`
  - `scripts/regression-fx008.mjs`
  - `test/regression-fx008.mjs`
  - `test/regression-probes.mjs`, which imports polyProbes, fnProbes,
    task5Probes and fx008Probes and exports `externalProbes`
- Modify:
  - `src/Features/Check.purs` (`checkFunction`)
  - `src/Features/Check/Defer.purs`: delete `settleDeferred`, export
    `judgeDeferrals`
  - `scripts/regression.mjs`: import `fx008Rows` and add it to `proved`
  - `test/regression.mjs`: import only `externalProbes`, and add
    `compilerPath` to `context` for child-process probes; net −2 lines
  - `test/fx008-probe-table.mjs`: flip dup and n1, pinning the exact
    message and span observed
  - `docs/engineering.md`: the regression list, rows and probe files

**Interfaces:**
- Produces in Features.Check.Cycle:
  - `type FeedRow = { own ∷ TyRow Flex, target ∷ TyRow Flex, keepFail ∷
    Boolean }`, both rows resolved;
  - `feedOrder ∷ Array FeedRow → Array Int`. Rows are numbered by
    index, which is source order. There is an edge i → j when the tail
    of `target_i` and the tail of `own_j` are the same unbound meta. The
    result is the topological order of the strongly connected
    components, with index order inside and between them (§3.5 (b)).
    It is linear: Tarjan's algorithm by a loop;
  - `positiveCycle ∷ Array FeedRow → Array Int → Maybe Int`. It
    considers the subgraph reachable from the given starts. For each
    key κ, w_i(κ) = count_κ(own_i) − count_κ(target_i), with Fail keys
    left out when `keepFail` is false. A cycle, self-loops included,
    whose Σ w(κ) > 0 is reported as its earliest row with w_i(κ) > 0.

  Algorithm. The spec fixes the test but not the search:
  ```
  for each strongly connected component S that has an edge (|S| > 1 or a self-loop):
    for each key κ with some w_i(κ) > 0, i ∈ S:
      dist[i] = 0 for i ∈ S; pred[i] = none
      repeat |S| times: for each edge i→j inside S (index order):
        if dist[i] + w_i(κ) > dist[j]: dist[j] = dist[i] + w_i(κ); pred[j] = i
      if a relaxation happened in round |S|:
        walk pred |S| steps from the last relaxed node to reach the cycle;
        collect the cycle; return its smallest index with w(κ) > 0
  ```
  Only components with an edge cost more than linear time. With no
  feed edges, the test is linear.
- Produces in Features.Check.Settle: `settleRestricted ∷ ∀ r. CheckEnv
  (locals ∷ Locals | r) → State → Checked.Expr → Either Diagnostic
  State`. For each deferral, the entry has own row `deferral.row`, the
  target `deferral.current` with its `sites`, `keepFail = false`, and is
  consumed with `consumeVia` with a fresh `Hole` tail, which is the
  throwaway.

  Procedure, from the termination review:
  ```
  repeat:
    counts0 ← per entry, the resolved label count of its own row
    subst  ← settleKeys env state body                 -- (a); its firstUnkeyed check stays (FX012 untouched)
    decided ← the postponed count changed
    rows   ← entries resolved under subst               -- (b)
    order  ← feedOrder rows
    positiveCycle rows (all) → the side-condition error at that row:
            `rejected env state origin (RowSharedTail own target)`  -- (c)
    for i in order: consume entry i's resolved labels    -- (d)
    counts1 ← per entry, the resolved label count of its own row
    exit when not decided and counts1 == counts0
  then: settleFinal's leftover check (E_TYPE `Fail needs a concrete error family`)
  ```
- Produces in Defer: `judgeDeferrals ∷ ∀ r. DeferEnv r → State →
  Checked.Expr → Either Diagnostic Unit`. This is today's `judge`, over
  every deferral, run after `settleRestricted`.
- Changes `checkFunction`. The order becomes `settleRestricted`, then
  `judgeDeferrals`, then (from Task 6) the mark check, then comparable,
  printable and entry.
- Produces in scripts/regression-fx008.mjs: `export const fx008Rows`.
  In test/regression-fx008.mjs: `export const fx008Probes`. A child
  compile helper, `compileWithin(context, source, ms)`, spawns `node`
  with `context.compilerPath` and returns `{ timedOut, diagnostic, go }`.

- [ ] **Step 1: Write the failing tests** in test/fx008-settle.test.mjs.
  Each compiles in a child process with a 20 s timeout:
  - `dup has no finite solution`: test/fx008-probes/dup.wxw is E_EFFECT
    matching `/ cannot be made equal: both end in \.\.\.$/`.
  - `n1 has no finite solution`: the same for n1.wxw.
  - `a satisfiable two-row cycle settles`: cycle2.wxw runs and prints
    `0\n7\n1\n`.
  - `8,000 defers settle`: a `main` with 8,000 `defer print(i)` items
    compiles. Its time is bounded in Task 6's serial file.

  Flip dup and n1 in the probe table. The existing
  test/fx-cleanup.test.mjs tests `a Fail reaching a shared lambda meta
  later is rejected (P4)` and `a defer handling a Fail of a key settled
  later is accepted` cover the late `Fail` and the moved judgement. They
  must pass unchanged.

- [ ] **Step 2: Run** `node --test test/fx008-settle.test.mjs
  test/fx008-probes.test.mjs`.
  - Expected: FAIL. dup and n1 are accepted.

- [ ] **Step 3: Implement** Cycle and Settle as above. Rewire
  `checkFunction`. Delete `settleDeferred`.

- [ ] **Step 4: Add regression row `fx008-cycle-presence`**
  (src/Features/Check/Cycle.purs). The mutant replaces the per-key count
  weight by key presence: w_i(κ) = 1 when κ is in own_i but not in
  target_i, else 0.
  - Probe `fx008-cycle-presence`: compiles dup.wxw within 20 s and
    requires the side-condition rejection.
  - On the mutant, the loop hangs: the probe reports `timed out`, and
    the row's message is `/cycle weight: timed out/`.
  - Add test/regression-probes.mjs and rewire test/regression.mjs.

- [ ] **Step 5: Run** `node --test test/fx008-settle.test.mjs
  test/fx008-probes.test.mjs`. Expected: PASS.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0.
  - Then run `node scripts/regression.mjs fx008-cycle-presence`.
    Expected: the proof line.

- [ ] **Step 6: Commit** `feat: settle restricted rows in one loop
  (FX008)`.

---

### Task 5: Clause own rows, the one-way hook, and clause rows in settling

Handler literals check each clause against its own row c. R stays
today's inference row, kept in step by `sync` (F1′, F2, T). C collects
the clauses' effects with their marks. Settling consumes clause rows
(correction S), and the tail pass runs. Every no-`defer` probe keeps its
outcome. gain1 flips. Implementer: Opus.

**Files:**
- Create:
  - `src/Features/Check/Handle.purs`: move `handleFailure` and
    `failureClause` out of Handler.purs, unchanged, as Step 0
  - `src/Features/Check/Restricted.purs`
  - `src/Features/Check/Watch.purs`
  - `src/Features/Check/Sync.purs`
  - `src/Features/Check/Clauses.purs`
  - `src/Features/Check/TailPass.purs`
  - `test/fx008-hook.test.mjs`
- Modify:
  - `Subst.purs`: the field `watch`
  - `Binding.purs`: `bindTail` and `extendRow` maintain `watch`
  - `Scheme.purs`: the State field `restricted`
  - `Handler.purs`
  - `Infer.purs`: `infer` runs `sync` after each node
  - `Apply.purs` (`open`), `Hint.purs`, `Call.purs` and `Pipe.purs`:
    call `sync` before the eager decision
  - `Settle.purs`
  - `Check.purs`
  - `scripts/regression-fx008.mjs` and `test/regression-fx008.mjs`
  - `test/fx008-probe-table.mjs`: flip gain1 and pin its Go hash

**Interfaces:**
- Produces in Features.Check.Watch:
  - `type TailWatch = { watched ∷ Set Int, dirty ∷ Set Int }`;
  - `emptyWatch ∷ TailWatch`;
  - `watchTail ∷ Int → Subst → Subst`;
  - `takeDirty ∷ Subst → { dirty ∷ Array Int, subst ∷ Subst }`.

  Binding maintains the watch on any binding of a watched meta m:
  - `bindTail` adds m to `dirty`, and adds the bound row's tail meta, if
    any, to `watched`;
  - `extendRow` adds m to `dirty` and the fresh tail to `watched`.

  This is data only (§3.4 "Where it runs"). A postponed pair reverts it,
  with its substitution.
- Produces in Features.Check.Restricted:
  - `type ClauseEntry = { row ∷ TyRow Open, inference ∷ TyRow Open,
    clauses ∷ TyRow Open, own ∷ Mark, handler ∷ Span, clause ∷ Span,
    operation ∷ String, group ∷ Int, tail ∷ Int, signature ∷ Maybe
    ClauseSignature }`. `own` is the handler's m. `tail` is the
    representative meta last seen;
  - `type ClauseSignature = { counts ∷ Map LabelKey Int, group ∷ Int,
    kind ∷ TailKind }`, with `data TailKind = UnboundTail | RigidTail
    VarId | ClosedTail`;
  - `type ClassEntry = { representative ∷ Int, remainder ∷ TyRow Open }`,
    where the remainder is φ;
  - `type Installation = { span ∷ Span, label ∷ Label (Ty Open), own ∷
    Mark, frame ∷ Mark, clauses ∷ TyRow Open, current ∷ TyRow Open,
    sites ∷ Array Site }`. Task 6 uses it;
  - `type Restricted = { clauses ∷ Map Int ClauseEntry, classes ∷ Map Int
    ClassEntry, byTail ∷ Map Int (Array Int), pending ∷ Set Int,
    installations ∷ Map Int Installation }`. Maps keyed by registration
    index avoid copying an array per handler (T003);
  - `emptyRestricted ∷ Restricted`;
  - `registerClause ∷ ClauseEntry → Restricted → Restricted`;
  - `registerInstallation ∷ Installation → Restricted → Restricted`.
- Produces in Scheme: `State` gains `restricted ∷ Restricted`.
- Produces in Features.Check.Clauses: `checkClauses ∷ ∀ r. Infer (locals ∷
  Locals | r) → HandlerEnv r → State → Span → Label (Ty Resolved.VarId) →
  Array Resolved.HandlerClause → Either Diagnostic (Threaded { clauses ∷
  Array Checked.HandlerClause, rows ∷ HandlerRows (Ty Open) Open, own ∷
  Mark })`.
  - Each clause is checked against a fresh row c (`Hole`). R and C are
    fresh open rows, and m is a fresh `MarkMeta`.
  - Each c is registered: `group` is new, `tail` is c's resolved tail,
    `signature` is `Nothing`, and c goes into `pending`.
  - Each c is consumed into C by `consumeVia` (Directional, C ⊑ c) with
    a fresh throwaway tail, keeping Fail.
  - Its resolved tail is watched. R is reached only through `sync`.
  - `Handler.handler` builds `THandler (withMark own label) rows` from
    it.
- Produces in Features.Check.Sync: `sync ∷ ∀ r. CheckEnv r → State →
  Either Diagnostic State`. Its algorithm (rev9 review "Smallest
  corrected procedure", with rev10 N1 and N4):
  ```
  repeat until no entry is processed:
    { dirty } ← takeDirty; affected ← pending ∪ entries indexed by byTail at dirty (index order)
    for e in affected:                                   -- F1′ bookkeeping
      t ← resolved tail of e.row
      grew ← label counts of e.row ≠ e.signature.counts (or no signature)
      case t of
        unbound m:
          if grew and e.signature exists: e.group ← groupAt(m) or a new group (fresh φ = Hole)
          else if another group c′ ≠ e.group has representative m:
            unify φ(e.group) ≡ φ(c′) with consumeIgnoring; merge into the older group id
          else: keep e.group (identity kept, N1); representative ← m
          watchTail m; byTail[m] += e
        rigid ϱ: consumeIgnoring (Row [] (Just ϱ)) into φ(e.group)   -- φ := ϱ
        closed:  consumeIgnoring closedRow into φ(e.group)            -- φ closes (N4)
    cycle ← positiveCycle (clause→R FeedRows: own = c, target = R) affected   -- F2, own tail (N2)
    on cycle: the side-condition error at that row
    for e in affected with currentSignature(e) ≠ e.signature:        -- T
      consumeIgnoring (Row labels(e.row) (Just φ(e.group))) into e.inference
      e.signature ← currentSignature(e)
  ```
  A rename does not change the signature. `sync`'s own bindings
  re-dirty through Binding, so the outer loop reaches a fixpoint within
  the bound of §3.4 (correction T).
- Produces in Features.Check.TailPass: `tailPass ∷ ∀ r. CheckEnv r →
  State → Either Diagnostic State`.
  ```
  repeat while some binding was made:
    for each clause entry whose resolved row tail is rigid ϱ: ensure e.inference and e.clauses end in ϱ
    (Task 6: for each installation whose resolved clauses tail is rigid ϱ: ensure installation.current ends in ϱ)
  ensure T ends in ϱ:
    T's tail is unbound      → consumeVia (Row [] (Just ϱ)) into T   -- one distinct meta per binding
    T's tail is ϱ            → nothing
    otherwise                → the error consumeVia gives for that consumption
  then every clause entry's `clauses` row with an unbound tail closes to empty
  ```
- Changes Settle: clause entries join the loop, in index order with the
  deferrals, by span start.
  - Each clause entry contributes two entries:
    - c into R, consumed as `Row labels(c) (Just φ(group))` by
      `consumeIgnoring` (correction S);
    - c into C, consumed by `consumeVia` with a fresh throwaway tail.
  - Both keep Fail.
  - In `feedOrder` and `positiveCycle`, the own row of both is c itself,
    with its own tail (rev10 N2).
  - After the loop: the leftover check, then `tailPass`.

- [ ] **Step 0: Move `handleFailure`.**
  - Move it into Features.Check.Handle, unchanged.
  - Run `rm -rf output && npm run verify`. Expected: exit 0.
  - Commit `refactor: move handle into its own module (FX008)`.

- [ ] **Step 1: Write the failing tests** in test/fx008-hook.test.mjs:
  - `gain1 is a sound gain`: rev10/gain1.wxw runs and prints `0\n`. Flip
    gain1 in the table.
  - `no-defer probes keep their outcomes under the hook`. Assert this
    explicitly, beside the gate, with a child compile timeout of 20 s:
    late1, late2, two1, two2, two3, two1f, one1, one3, one1rev8, ov1,
    ov1f, set1, cyc1, cyc1ok and pair1 print `0\n`. two2's Go hash and
    hole2c's equal the table's. rig1, rig2, sh1, ov1ctl, set1ctl,
    pair1ctl, cyc2 and cyc3 keep their exact texts.
  - `three handlers merging in settling agree in every order` (Review
    Focus 1). This is set1 with a third handler `h3 = handler Log {
    log(n) => k3(n) }`, `k3 = fn(n: Int) => ()`, `g3 = fn(u: Unit) =>
    with h3 { if put(Some(true)) then () else () }`, and `r` extended
    with `fail(Job(k3))`. All six orders of the three `let h…` lines
    compile and print `0\n`.
  - `a clause row whose tail turns rigid during settling needs R to end
    there`. The tail pass (T1 at settling time):
    ```
    type Job(a, ...effects) = Job(Int -> a with ...effects);
    effect Log { fn log(n: Int): Unit; };
    fn f(cb: Int -> Unit with ...e): Unit with Console = {
      let k1 = fn(n: Int) => ();
      let h1 = handler Log { log(n) => k1(n) };
      with h1 { log(1) };
      let r = fn(x) => { fail(Job(k1)); fail(x) };
      let q = fn(u: Unit) => r(Job(cb));
      ()
    };
    fn main(): Unit with Console = f(fn(n: Int) => print(n));
    ```
    It must be rejected. Record the exact code, message and span
    observed in the report, and pin them in the test.
    - Today it is rejected during checking with E_EFFECT `f performs
      Console, which its signature does not allow`, at 266-278. Today
      the clause row is R, so the link to f's closed row binds k1's tail
      at once.
    - Under the one-way hook that link is gone. k1's tail stays open
      until the retried `fail` pair binds it to `...e` in settling, and
      only the tail pass then rejects it.
    - If the program is still rejected before settling, it cannot detect
      the `fx008-tail-pass` mutant. In that case the implementer derives
      one in which a clause tail first becomes rigid in settling. If none
      can be found, stop and report.
  - `sync is linear`: 1,000 handler literals, each sharing one lambda
    `k` and installed once, compile. They are timed in Task 6's serial
    file, not here.

- [ ] **Step 2: Run** `node --test test/fx008-hook.test.mjs
  test/fx008-probes.test.mjs`.
  - Expected: FAIL. gain1 is still rejected. The three-order test may
    already pass, because today's R ≡ R holds.

- [ ] **Step 3: Implement** the interfaces above.
  - Handler.purs keeps `handler` and `withHandler`. Its clause code
    moves to Clauses.
  - `sync` runs:
    - in `Infer.infer`, after `inferNode`;
    - in `Handler.withHandler`, before `headOf`;
    - in `Apply.open`'s callers and in `Hint.hinted`'s caller, before
      `headOf`;
    - in Call.purs and Pipe.purs, before `functionLike`.

- [ ] **Step 4: Add regression rows.** Each is one needle in the named
  file. Each probe passes on the healthy build and fails on the mutant
  with the given message:

  | Row | File | Mutant | Probe and message |
  |---|---|---|---|
  | `fx008-hook` | Sync.purs | `sync` returns the state unchanged | late1.wxw prints `0`; `/hook: Expected a handler/` |
  | `fx008-phi` | Sync.purs | each consumption uses a fresh tail instead of φ | two1.wxw prints `0`; `/remainder: Ambiguous/` |
  | `fx008-phi-equal` | Sync.purs | the φ step is replaced by unifying the two handlers' R (rev 9 F1) | ov1.wxw prints `0`; `/R≡R: rejected/` |
  | `fx008-f2` | Sync.purs | the F2 call is removed | cyc2.wxw is its side-condition error within 20 s; `/F2: timed out/` |
  | `fx008-new-labels` | Sync.purs | only labels past the recorded count are consumed | cyc2.wxw within 20 s; `/new labels: (timed out\|accepted)/` |
  | `fx008-signature` | Sync.purs | the signature comparison always reports a change | cyc1.wxw prints `0` within 20 s; `/signature: timed out/` |
  | `fx008-settle-phi` | Settle.purs | clause→R entries use a fresh tail | set1.wxw prints `0`; `/settling φ: Ambiguous/` |
  | `fx008-r-consumed` | Handler.purs | `with` consumes R with a fresh tail instead of `consumeIgnoring` as it stands | meta2.wxw compiles; `/R consumed: Ambiguous/` |
  | `fx008-exit-count` | Settle.purs | the exit test counts only labels added by (d) consumption to targets, not argument-level bindings | see below |
  | `fx008-tail-pass` | TailPass.purs | `tailPass` returns the state unchanged | the late-rigid program of Step 1 is rejected; `/tail pass: accepted/` |

  The probe for `fx008-exit-count` is derived from argbind.wxw. A late
  `Fail(E)` reaches a clause row only through an argument-level binding
  in round 1. The handler is then installed where `Fail(E)` must be
  handled, so that a missed label is an unsound acceptance.
  - The implementer constructs it, and shows it compiles on the healthy
    build with the expected rejection and is accepted by the mutant.
  - If no such program exists without hitting FX010 (E_INTERNAL), stop
    and report. Do not substitute another mutant.

- [ ] **Step 5: Run** `node --test test/fx008-hook.test.mjs
  test/fx008-probes.test.mjs`. Expected: PASS.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0.
  - Then run `node scripts/regression.mjs fx008-hook fx008-phi
    fx008-phi-equal fx008-f2 fx008-new-labels fx008-signature
    fx008-settle-phi fx008-r-consumed fx008-exit-count fx008-tail-pass`.
    Expected: 10 proof lines.

- [ ] **Step 6: Commit** `feat: clause own rows and the one-way hook
  (FX008)`.

---

### Task 6: Installations, frames and the mark check

`with` consumes C and gives each installation its frame mark. Settling
adds the installation entries and the tail pass's installation rule. The
own-abort, frame and defer-demand edges are generated. The path check
rejects with the §3.6 headline and primary span; Task 7 adds the notes.
The migration lands here (P12). hole, l4b, merge2 and review/q1 flip.
Implementer: Opus.

**Files:**
- Create:
  - `src/Features/Check/Install.purs`
  - `src/Features/Check/Frames.purs`
  - `src/Features/Check/Mark.purs`
  - `src/Features/Check/MarkReport.purs`
  - `src/Format/Diagnostic/Mark.purs`
  - `test/fx008-defer.test.mjs`: the §9 rejections and acceptances
  - `test/fx008-scale.serial.test.mjs`
- Modify:
  - `Handler.purs` (`withHandler` uses Install), `Settle.purs`,
    `TailPass.purs`, `Check.purs`
  - `src/Domain/Problem.purs`
  - `src/Format/Diagnostic.purs`: codes and `noted` arms delegate to
    Format.Diagnostic.Mark
  - `test/fx-cleanup-programs.mjs`: migration
  - `test/fx-programs.mjs` and `test/fx-gen-*.mjs`: `nofail` rows,
    keeping every generated program compilable
  - `scripts/regression-fx008.mjs`, `test/regression-fx008.mjs` and
    `test/fx008-probe-table.mjs`

**Interfaces:**
- Produces in Features.Check.Install: `install ∷ ∀ r. Infer (locals ∷
  Locals | r) → HandlerEnv r → State → Span → Checked.Expr → Label (Ty
  Open) → HandlerRows (Ty Open) Open → Resolved.Expr → Checked`.
  - It consumes R into ρ with `consumeIgnoring`, as Task 3 does.
  - It consumes C's labels into ρ with `consumeVia`, with a fresh
    throwaway tail, keeping Fail.
  - The frame mark f is `NoFail` for a Console label, and a fresh
    `MarkMeta` otherwise.
  - The body is checked against `withMark f label` prepended to ρ.
  - It registers an `Installation`.
- Changes Settle: installation entries join the loop, with own row C,
  target `current`, and `keepFail = true`.
- Changes TailPass: it gains the installation rule.
- Produces in Features.Check.Frames: `markConstraints ∷ State → State`.
  It runs after `settleRestricted` and reads resolved rows (rev6 M2).
  It adds these edges:
  - per installation, in index order:
    - `own ⊑ frame`, as `FrameOwn span`;
    - for the r-th label of key κ of C, the mark of the r-th κ-label of
      `current`, ⊑ `frame`, as `FrameOuter span`. Labels are matched by
      key and position, and Fail is skipped;
    - if C's resolved tail is a rigid ϱ, `Plain ⊑ frame`, as `FrameRigid
      span (the name of ϱ)`;
  - per clause entry: if the resolved c holds a Fail label, or ends in a
    rigid ϱ, `Plain ⊑ own`, as `OwnAbort { handler, clause, operation,
    rigid }`. Its edge label is the first Fail label, or the handled
    label;
  - per deferral: for each non-Fail label of the resolved own row, `mark
    ⊑ NoFail`, as `DeferDemand deferral.span`.
- Produces in Features.Check.Mark:
  - `type Violation = { path ∷ Array (MarkEdge (Ty Flex)), start ∷ Mark,
    end ∷ Mark }`. The path goes from the start atom to the end atom,
    with marks resolved;
  - `violation ∷ Array String → Subst → Maybe Violation`, given the
    declaration's mark variables.

  Atoms are `NoFail`, `Plain`, and `MarkVariable k` for the
  declaration's own k. Metas are nodes.

  Algorithm (§3.5 step 5, with M3's predecessors and P7):
  ```
  edges ← edgesOf marks, resolved; drop any with Unmarked
  for each source atom a in [Plain, MarkVariable k1, …]:   -- never NoFail
    BFS from a over edges in insertion order; pred[(node, a)] = the edge that first reached node
  violating edges: e = x ⊑ b, where b is an atom, b ≠ Plain, and some a ≠ b reaches x (x = a included)
  choose the violating edge with the smallest span start, then the earliest inserted; then a = Plain if it reaches, else the first k
  rebuild the path from pred back to a
  ```
  The cost is O(edges × atoms).
- Produces in MarkReport: `reportViolation ∷ ∀ r. CheckEnv r → State →
  Violation → Either Diagnostic Diagnostic`. It builds the headline and
  span by P6. Notes are `[]` until Task 7.
- Produces in Domain.Problem (P10). All are E_EFFECT and all are
  `noted`:

  | Constructor | Text |
  |---|---|
  | `DeferHandlerMayFail label` | `defer must not fail, but it performs <L>, whose handler may fail` |
  | `DeferHandlerVariable variable label` | `defer must not fail, but it performs nofail(<k>) <L>, whose handler is fail-free only when the caller's is` |
  | `ExpectedNofail expected found` | `Expected <expected>, found <found>`, each a label as `labelName` prints it with its atom's mark: `nofail Log`, `nofail(k) Log` or `Log` |
  | `HandlerMayFail (ClauseFails operation payload)` | `This handler may fail here: its clause for <op> fails with <E>` |
  | `HandlerMayFail (ClauseMayPerform operation tail)` | `This handler may fail here: its clause for <op> may perform any effect of <r>` |

  `data HandlerFault = ClauseFails String String | ClauseMayPerform
  String String`. `<r>` is spelled as `DeferMayPerform` spells it: `...`
  or `...e`.

  The primary span:
  - a `defer` demand: the deferral's span;
  - `HandlerMayFail`: the handler literal (`AbortSite.handler`);
  - `ExpectedNofail`: the span of the last edge.
- Changes `checkFunction`: after `judgeDeferrals`, it runs
  `markConstraints`, then `violation`, which is rejected through
  `reportViolation`.

- [ ] **Step 1: Write the failing tests.**

  In test/fx008-defer.test.mjs, use `expectDiagnostic`, asserting code,
  message and `at`, with `notes: []` until Task 7. Every source starts
  with `type E = E; effect Log { fn log(n: Int): Unit; };` unless shown.

  Rejections (§9):
  - `the pinned program is rejected`. The source of test/fx-oracle.test.mjs
    `a cleanup ending in a typed abort…` gives `defer must not fail, but
    it performs Log, whose handler may fail`, at `defer log(1)`.
  - `the cross-function form is rejected` (§1): rev6/hole.wxw, the same
    message, at `defer log(1)`. Flip hole.
  - `a fail-free handler type refuses a failing literal`. `fn mk():
    Handler(nofail Log with Fail(E)) = handler Log { log(n) => fail(E) };
    fn main(): Int = 0;` gives `This handler may fail here: its clause
    for log fails with E`, at `handler Log { log(n) => fail(E) }`.
  - `mk returning Handler(nofail Log) keeps today's row error`. q2.wxw
    with `nofail` before `Log` gives `This function must be pure, but it
    performs Fail(E)`, at offsets 81-114: the literal, 7 characters
    later than in q2.
  - `a nofail call under a plain signature`. `fn work(): Unit with
    nofail Log = (); fn caller(): Unit with Log = work(); fn main(): Int
    = 0;` gives `Expected nofail Log, found Log`, at `work()`.
  - `a forwarding clause into a failing outer handler`:
    ```
    fn main(): Unit with Console = handle {
      with handler Log { log(n) => fail(E) } {
        with handler Log { log(n) => log(n + 1) } { defer log(1); () }
      }
    } { fail(error: E) => print(9) };
    ```
    gives `defer must not fail, but it performs Log, whose handler may
    fail`, at `defer log(1)`. Today it is accepted and dies with
    `fail(E): E`.
  - `a clause calling an ambient callback`. `fn f(cb: Unit -> Unit):
    Unit = with handler Log { log(n) => cb(()) } { defer log(1); () };
    fn main(): Unit with Console = f(fn(u: Unit) => print(1));` gives
    the same message, at `defer log(1)`. Today it prints `1`.
  - `a rigid mark variable cannot be assumed fail-free`. `fn f(): Unit
    with nofail(k) Log = { defer log(1); () }; fn main(): Int = 0;`
    gives `defer must not fail, but it performs nofail(k) Log, whose
    handler is fail-free only when the caller's is`, at `defer log(1)`.
  - l4b and merge2: their table entries flip. Each is also asserted
    here, as an explicit L4 test named `L4: <probe> is rejected`.
  - `I2 as written is rejected`: review/q1.wxw flips.

  Acceptances, which run in one go-batch, with exact stdout and status 0:
  - `a nofail signature under a fail-free handler`. The migrated
    fx-cleanup program prints `2\n1\n`.
  - `I1: a local lambda under two handlers` (review/p1) prints
    `2\n1\n9\n`.
  - `I1: one handler value installed under two rows` (review/p2) prints
    `11\n9\n`.
  - `I2 and N5 with nofail`: q1 with `fn prefix(): Handler(nofail Log
    with Log) with pure` and `fn run(h: Handler(Log with Log + ...e)):
    Unit with nofail Log + ...e` prints `101\n101\n0\n9\n`.
  - `around under a fail-free and a failing outer`:
    ```
    fn prefix(): Handler(nofail Log with Log) with pure = handler Log { log(n) => log(n + 100) };
    fn around(body: Unit -> Unit with nofail(k) Log + nofail(k) Log + ...e): Unit with nofail(k) Log + ...e = with prefix() { body(()) };
    fn main(): Unit with Console = handle {
      with handler Log { log(n) => print(n) } { around(fn(u: Unit) => { defer log(1); () }) };
      with handler Log { log(n) => fail(E) } { around(fn(u: Unit) => log(2)) }
    } { fail(error: E) => print(9) };
    ```
    prints `101\n9\n`.
  - `a fail-free forwarding clause under a defer`: the forwarding
    program above with `print(n)` in place of `fail(E)` prints `2\n`.
  - `Console cleanup`. `fn f(): Unit with Console = { defer print(1);
    print(2) }; fn main(): Unit with Console = f();` prints `2\n1\n`.
  - `a defer inside a clause follows the outer frame` (Review Focus 2).
    `with handler Log { log(n) => print(n) } { with handler Log { log(n)
    => { defer log(n + 1); () } } { log(1) } }` prints `2\n`. With the
    outer clause `fail(E)` inside `handle … { fail(error: E) => print(9)
    }`, it is rejected with the Log defer message, at `defer log(n + 1)`.
  - `recursive nofail and nofail(k) functions` (Review Focus 4):
    - `fn count(n: Int): Unit with nofail Log = if n == 0 then () else ({
      defer log(n); count(n + -1) });`. Waxwing has no `-`, and the block
      branch is parenthesized, as in the planner's run;
    - `fn pass(n: Int): Unit with nofail(k) Log = if n == 0 then log(0)
      else pass2(n + -1); fn pass2(n: Int): Unit with nofail(k) Log =
      pass(n);`

    Called under `with handler Log { log(n) => print(n) }`, `count(3)`
    prints `1\n2\n3\n` and `pass(3)` prints `0\n`, as the unmarked
    programs do today. Their Go equals the unmarked programs'.
  - `a handler in a constructor field keeps its mark` (Review Focus 5).
    With `type Box = Box(Handler(nofail Log with pure));`, `match
    Box(handler Log { log(n) => () }) { Box(h) => with h { defer log(1);
    () } }` compiles. A literal whose clause handles its failure inside,
    `log(n) => handle fail(E) { fail(e: E) => () }`, also compiles.
    `Box(handler Log { log(n) => crash(1) })` compiles: a defect is not
    an abort (§3.1). `Box(h)` with `h: Handler(Log with pure)` taken as
    a parameter is E_TYPE `Expected Handler(nofail Log), found
    Handler(Log)`.

  In test/fx008-scale.serial.test.mjs:
  - Bounds are 3× the median of five runs on the implementer's host,
    recorded as named constants with a comment giving the date, the
    host load and the five runs, as test/fx-block.serial.test.mjs does.
    Twice the size is also measured and recorded in the progress entry.
  - `8,000 defers check within the bound`:
    `fn work(): Unit with nofail Log = { defer log(0); … ; () }`, with
    8,000 items.
  - `1,000 installations in one declaration`: 1,000 `with handler Log {
    log(n) => print(n) } { defer log(i); () };` items in `main`.
  - `a chain of 1,000 forwarding installations`:
    `fn f<i>(): Unit with nofail Log = with handler Log { log(n) =>
    log(n) } { f<i+1>() };` for i < 1,000, ending in `fn f1000(): Unit
    with nofail Log = { defer log(0); () }`.
  - `200 mark variables`: `fn wide(): Unit with nofail(k1) Log + … +
    nofail(k200) Log = wide2(); fn wide2(): Unit with nofail(j1) Log + …
    + nofail(j200) Log = ();`.

- [ ] **Step 2: Run** `node --test test/fx008-defer.test.mjs
  test/fx008-probes.test.mjs`.
  - Expected: FAIL. The rejections are accepted.

- [ ] **Step 3: Implement** the interfaces above. Then migrate:
  - test/fx-cleanup-programs.mjs `a defer performing a non-Fail effect`:
    `fn work(): Unit with Log` becomes `fn work(): Unit with nofail
    Log`. The output and the test name stay the same (§6).
  - The generator writes `nofail L` on every generated signature row
    label that has a frame, because its random clauses are still
    fail-free in this task. The `crossing` scenario's failing clause
    never reaches a generated `nofail` function: it calls only
    operations and `risky`.

  The design (§6) says only the fx-cleanup case relies on an unknown
  handler. Any other existing test that newly fails is a stop-and-report
  item. It is never migrated silently.

- [ ] **Step 4: Add regression rows.** Each probe is the named program:
  healthy, it gives the stated outcome; the mutant fails it with the
  message given.

  | Row | File | Mutant | Probe and message |
  |---|---|---|---|
  | `fx008-directional` | UnifyMark.purs | `Directional` pairs bind marks as `EqualMarks` does | p1 prints `2 1 9`; `/directional: rejected/` |
  | `fx008-copies` | UnifyMark.purs | `stageLabel` in Directional mode returns the label itself | p1; `/copies: rejected/` |
  | `fx008-c-unified` | Install.purs | C is unified with ρ (`consumeVia` as it stands, not with a fresh tail) | p2 prints `11 9`; `/C unified: rejected/` |
  | `fx008-r-marks` | Consume.purs | `consumeIgnoring` uses `EqualMarks` (R ≡ ρ equates marks) | p2; `/R marks: rejected/` |
  | `fx008-extension` | UnifyMark.purs | `targetLabel` in Directional mode returns the stage label | extb prints `12 0 9`; `/extension: rejected/` |
  | `fx008-local-plain` | MarkUse.purs | `localMarks` leaves `Plain` | annotb prints `1 2`; `/local marks: rejected/` |
  | `fx008-r-identity` | UnifyMark.purs | `IgnoreMarks` extension keeps the label's mark | merge1 prints `1 9`; `/R identity: rejected/` |
  | `fx008-c-alias` | MarkUse.purs | `localMarks` leaves C equal to R | annotc prints `1 5 9`; `/C alias: rejected/` |
  | `fx008-frame-m` | Install.purs | the frame mark is the own mark m | I2 with nofail prints `101 101 0 9`; `/frame: rejected/` |
  | `fx008-own-frame` | Frames.purs | no `own ⊑ frame` edge | the pinned program is rejected; `/own frame: accepted/` |
  | `fx008-outer-frame` | Frames.purs | no `FrameOuter` edges | the forwarding-into-failing program is rejected; `/outer frame: accepted/` |
  | `fx008-rigid-n` | Mark.purs | mark variables are not source atoms | the `nofail(k)` defer is rejected; `/rigid: accepted/` |

- [ ] **Step 5: Run** `node --test test/fx008-defer.test.mjs
  test/fx008-probes.test.mjs test/fx-cleanup.test.mjs` and
  `node --test --test-concurrency=1 test/fx008-scale.serial.test.mjs`.
  Expected: PASS.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0. The
    differential corpus still compiles every generated program and
    shows 0 differences.
  - Then run `node scripts/regression.mjs fx008-directional fx008-copies
    fx008-c-unified fx008-r-marks fx008-extension fx008-local-plain
    fx008-r-identity fx008-c-alias fx008-frame-m fx008-own-frame
    fx008-outer-frame fx008-rigid-n`. Expected: 12 proof lines.

- [ ] **Step 6: Commit** `feat: per-installation frames and the mark
  check: defer is sound (FX008)`.

---

### Task 7: Notes for mark rejections

Each mark rejection explains its path: the signature to change (with the
hint), the installation, the failing clause and the outer handler.
Implementer: Opus.

**Files:**
- Modify:
  - `src/Domain/Note.purs`
  - `src/Features/Check/MarkReport.purs`
  - `src/Format/Diagnostic/Mark.purs`
  - `src/Format/Diagnostic/Note.purs`: `noteText` delegates the new
    reasons
  - `test/fx008-defer.test.mjs`: fill in `notes`

**Interfaces:**
- Produces in Domain.Note. Each reason is rendered at the span given,
  and every text is exact:

  | Reason | Source | Span | Text |
  |---|---|---|---|
  | `HandledHere label` (existing) | `FrameOwn` | the `with` | `<L> is handled here` |
  | `ClausesReach label` | `FrameOuter` | the inner `with` | `this handler's clauses perform <L>, whose handler may fail` |
  | `ClausesMayPerform tail` | `FrameRigid` | the `with` | `this handler's clauses may perform any effect of <r>` |
  | `ClauseFailsWith operation payload` | `OwnAbort` with `Nothing` | `AbortSite.clause` | `its clause for <op> fails with <E>` |
  | `ClauseMayPerform operation tail` | `OwnAbort` with `Just r` | `AbortSite.clause` | `its clause for <op> may perform any effect of <r>` |
  | `SignatureMayFail function label` | a path starting at `Plain` through an `Assumed` edge; a constant `Plain` lower can only be a label of the declaration's own row (P1) | `env.rowSpan`, else the function's span | `the signature of <f> allows a failing <L> handler; write with nofail <L>` |
  | `MarkVariableHere variable label` | a path starting at `MarkVariable k` | `env.rowSpan`, else the function's span | `nofail(<k>) <L> is fail-free only when the caller's handler is` |
- Changes MarkReport: notes are ordered from the demand back to the
  source, one per path edge of the kinds above. `Assumed`, `Copied`,
  `Extended` and `DeferDemand` give no note, except the source rule.
  The existing `maxNotes` and `maxCharacters` bounds apply (§3.6 "hops
  are bounded").

- [ ] **Step 1: Write the failing assertions.** Fill `notes` in each
  Task 6 rejection test. Each note is `[container, inner, text]`:
  - pinned program: `[with handler Log { log(n) => fail(E) } { defer
    log(1); print(2) }, same, 'Log is handled here']`, then `[log(n) =>
    fail(E), same, 'its clause for log fails with E']`;
  - cross-function: `[with Log, same, 'the signature of work allows a
    failing Log handler; write with nofail Log']`;
  - forwarding into failing: the inner `with` and `this handler's clauses
    perform Log, whose handler may fail`; the outer `with` and `Log is
    handled here`; the outer clause and `its clause for log fails with
    E`;
  - ambient callback: the `with` and `this handler's clauses may perform
    any effect of ...` (P7: the rigid frame edge is one hop from M);
  - nofail call: `[with Log, same, 'the signature of caller allows a
    failing Log handler; write with nofail Log']` (in `caller`);
  - rigid k: `[with nofail(k) Log, same, 'nofail(k) Log is fail-free
    only when the caller's handler is']`;
  - fail-free literal: `[log(n) => fail(E), same, 'its clause for log
    fails with E']`;
  - l4b: the failing `with` and `Log is handled here`, then its clause
    and `its clause for log fails with E`.

  Add `a 1,000-hop mark path is bounded`, built from the
  1,000-forwarding chain inside one declaration (nested lambdas, depth
  within the nesting limit). The diagnostic stays within
  `maxCharacters` and keeps its first and last notes.

- [ ] **Step 2: Run** `node --test test/fx008-defer.test.mjs`.
  - Expected: FAIL. The notes are `[]`.

- [ ] **Step 3: Implement** the interfaces above.

- [ ] **Step 4: Run** `node --test test/fx008-defer.test.mjs`. Expected:
  PASS.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0.

- [ ] **Step 5: Commit** `feat: notes for mark rejections (FX008)`.

---

### Task 8: Failing random clauses and the one-way soundness differential

Lifts Task 10's fail-free-clause restriction. Adds the differential that
would have found the hole: compiler acceptance implies that the oracle
never reports `typed abort escaped cleanup`. Implementer: Sonnet,
escalating to Opus on BLOCKED.

**Files:**
- Modify:
  - `test/fx-gen-expr.mjs`, `test/fx-gen-fragments.mjs` and
    `test/fx-gen-cleanup.mjs`: random clauses may fail; a per-label
    `failing` set in `ctx`
  - `test/fx-census.mjs`: the new rows
  - `test/fx-gen-reject.mjs`: mark rejection variants
  - `test/fx-differential.serial.test.mjs`
  - `docs/engineering.md`: the corpus paragraph
- Create:
  - `test/fx008-soundness.serial.test.mjs`
  - `test/fx-gen-unconstrained.mjs`, if fx-programs.mjs would pass 250
    lines

**Interfaces:**
- Changes `generate(seed, index, options = {})`.
  - With `options.unconstrained` false, which is the default corpus:
    - a random clause body may be `fail(<payload>)` of a family handled
      outside its `with`;
    - `ctx.failing` holds every label whose innermost frame may fail;
    - cleanup performs only labels outside `ctx.failing`, and calls
      generated functions only where their written `nofail` labels'
      frames are outside it;
    - every program must compile.
  - With `options.unconstrained` true, cleanup ignores `ctx.failing`.
- Census rows (fx-census.mjs counts what the oracle observed):
  - `failing random clause`: a clause that ended in an abort, with a
    minimum of 25 in the default corpus;
  - in the soundness file only, `escape witnessed`.
- Changes `rejection(seed, index)`: it gains three FX008 kinds, chosen by
  index after the existing 25:
  - a `defer` reaching a failing handler directly;
  - through a forwarding clause;
  - through a clause calling a callback with an ambient row.

  Each gives E_EFFECT `defer must not fail, but it performs <L>, whose
  handler may fail` at the `defer` span.

- [ ] **Step 1: Write the failing tests.**

  In test/fx-differential.serial.test.mjs:
  - `the corpus meets the census minimums` gains `failing random clause
    ≥ 25`;
  - add `25 defers reaching failing handlers are rejected with the FX008
    text`.

  In test/fx008-soundness.serial.test.mjs:
  - 300 programs, from `generate(SEED + 100000 + i, i, { unconstrained:
    true })`, with `WAXWING_FX_SEED` as in the default corpus.
  - For each accepted program:
    - the oracle's outcome must not be `oracle error: typed abort escaped
      cleanup`;
    - Go must equal the oracle exactly (stdout, stderr, status).
  - For each rejected program:
    - the code is E_EFFECT;
    - the message is one of the FX008 headlines or a Task 8 (FX001) text;
    - the span is a `defer` span.
  - Minimums, which fail the run when unmet: at least 50 accepted with a
    cleanup that performs a user operation; at least 50 rejected by an
    FX008 headline; at least 25 programs where the oracle reports
    `typed abort escaped cleanup`, every one of them rejected by the
    compiler.
  - A soundness failure writes the seed and source to
    `.build/fx008-soundness/`, as fx-diff-support `saveEvidence` does.

- [ ] **Step 2: Run** `node --test --test-concurrency=1
  test/fx-differential.serial.test.mjs test/fx008-soundness.serial.test.mjs`.
  - Expected: FAIL. There are no failing clauses yet, and
    `unconstrained` is unknown.

- [ ] **Step 3: Implement** the generator changes.

- [ ] **Step 4: Show that the comparison can fail.** In an isolated copy
  only, on the source restored to Task 5's state (the mark check
  disabled), the soundness test must fail with at least one escape
  witnessed and accepted. Record the count. This is the sensitivity of
  FX001 ruling R1.

- [ ] **Step 5: Run** the command of Step 2. Expected: PASS, with 0
  differences.
  - Then run `rm -rf output && npm run verify`. Expected: exit 0.
  - Report the census, the seeds and the run time.

- [ ] **Step 6: Commit** `test: failing random clauses and the one-way
  soundness differential (FX008)`.

---

### Task 9: Specification, CF001, backlog and plan amendments

Brings the documents in line with the shipped rule. Implementer: Sonnet,
reviewed by Opus against the spec.

**Files:**
- Modify:
  - `docs/plans/2026-10-09-effects-design.md`: apply §8 of the FX008
    design
  - `docs/plans/2026-10-09-concurrency-foundations-design.md`: D4, §4.4
  - `BACKLOG.md`
  - `docs/plans/2026-10-09-effects-plan.md`: amend Tasks 11-12 and the
    status line
  - `docs/architecture.md`: the Check bullet list gains the mark
    modules
  - `docs/findings.md`
  - `docs/progress.md`
  - `docs/next-session.md`
  - `docs/sdd/2026-10-09-effects-plan/progress.md`

- [ ] **Step 1: Apply design §8 to the effects spec.**
  - §1: `nofail` is contextual; `nofail(k)` is a mark variable.
  - §2:
    - a paragraph "Marks" condensing FX008 §3.1-§3.4;
    - "Consumption and opening": directional pairs, copies at tail
      binding, and handler-type opening only;
    - the `handler` rule: `Handler(m L with R | C)`, own rows, the
      inference row R, the exact clause row C, the own-abort constraint;
    - the `with` rule: R unified as today, ignoring marks; C consumed;
      the frame mark f and its constraints;
    - the `defer` rule: append "every other label it performs must be
      marked `nofail`", with the E_EFFECT text of Task 6.
  - §3 "Cleanup failures": after "an open row tail", add "or perform an
    operation whose frame may fail (FX008)". §3 "Clause context" is
    unchanged.
  - §5: probe 6 and the regression proofs gain FX008 §9's cases.
  - §6: the new headline kinds, with Task 6's and Task 7's exact texts.

  Each edit names FX008 and the date.

- [ ] **Step 2: Apply D4 to CF001.**
  - §5 R0: "performs no X" becomes a per-label predicate plus the
    rigid-tail rule. For `defer`: not `Fail`, and marked N. For a `par`
    child: is `Fail`.
  - Decision O-2 (§8A.8): long-lived boundaries are *abort-free*: no
    `Fail`, every label N, no rigid tail.
  - The §8A.6 escaping-callback row: "Shareable and abort-free (R0)".

  Nothing else in CF001 changes.

- [ ] **Step 3: Update BACKLOG.md.**
  - FX008: "Done pending whole-branch review", with the commit range,
    the test counts and the regression rows.
  - FX007: re-scoped (D5) to written abort-free row constraints
    `nofail ...e`, carried on row metas and checked at instantiation;
    deferred. The bracket idiom stays rejected until then (L3).
  - FX010 and FX011: unchanged, noting argbind-internal and con are
    still pinned unchanged by the gate.
  - FX012: note that the loop keeps today's unkeyed check in round 1.
  - New rows for the remaining limitations:
    - L1 (marks inside data and fields are not opened);
    - L4 (sharing through tails and through one handler value's R), with
      l4b and merge2;
    - L6 (no mark variables in `type`/`effect`).

- [ ] **Step 4: Amend the FX001 plan.**
  - Task 11 Step 1 (design §10 and rereview "L4, L5 …"):
    - `nofail` along every cleanup call chain;
    - real and fake handlers selected by `if`/`match` share one mark, so
      each handler a cleanup reaches is fail-free in both forms or
      handles its failures inside its clauses;
    - no callbacks in clauses on cleanup paths.

    The dropped-handler diagnostic and the key-count baseline are
    unaffected.
  - Task 12:
    - Step 2's ADR 010 records the FX008 rule: marks, the frame per
      installation, the path check, and L1/L4/L6;
    - the language Effects section documents `nofail`, `nofail(k)` and
      the two limits;
    - Step 1's rows go in scripts/regression-fx.mjs, next to
      scripts/regression-fx008.mjs, and its probes are registered in
      test/regression-probes.mjs, not test/regression.mjs.
  - Update the plan's status line.

  ADR 010 and the language Effects section are written by FX001 Task
  12, not here. Docs/language.md has no Effects section yet.

- [ ] **Step 5: Record and run.**
  - Add a findings entry: the hole, its cause, and the rule.
  - Add the progress entry, a next-session handoff and a ledger line.
  - Run `rm -rf output && npm run verify`. Expected: exit 0.
  - Run `node scripts/regression.mjs`. Expected: every row proved,
    including the 23 FX008 rows.

- [ ] **Step 6: Commit** `docs: FX008 spec amendment, CF001 abort-free
  boundaries, backlog and plan amendments`.

---

## Coverage of the spec's §9 and §6 (self-review record)

- Rejections:
  - pinned and §1 forms: Task 6;
  - the `Handler(nofail Log with pure)` parameter: Task 3 (E_TYPE, P3)
    and Task 6 (the `with Fail(E)` literal);
  - `mk(): Handler(nofail Log)`: Task 6 (today's row error, plus the
    `with Fail(E)` form);
  - a nofail call under M: Task 6;
  - the forwarding clause into a failing outer handler: Task 6;
  - the ambient callback: Task 6;
  - `nofail Fail(E)`: Task 2;
  - rigid k: Task 6;
  - C2 (p3) and T1 (rigid): gate;
  - dup and n1: Task 4;
  - rig1 and rig2: gate and Task 5;
  - cyc2 and cyc3: gate and Task 5;
  - l4b and merge2: Task 6.
- Acceptances:
  - the N signature, I1 (×2), I2 and N5, around, Console cleanup, the
    migration: Task 6;
  - one value under two rows: p2, Task 6;
  - meta2 and hole2c, extb, annotb, merge1, annotc, annotd, late1-3,
    two*, one*, ov1, ov1f, set1, cyc1, cyc1ok, sh1, the ctl variants,
    pair1, gain1, cycle2open, f1-f3 and argbind: the gate, with Task 5
    asserting the hook-sensitive ones.
- Other checks:
  - unifier properties with marks: Task 3;
  - linearity: Tasks 4 and 6;
  - the path check with many variables: Task 6.
- Mutants: §9's full list is assigned:
  - the rev 5 settling mutants: Tasks 4 and 5;
  - the hook mutants: Task 5;
  - the mark mutants: Task 6.

  That is 23 rows.
- Differential: Task 8.
- Spec text, CF001, FX007 and the FX001 amendments: Task 9.
- Requirements not placed as code:
  - §4.6 (`ctl` clauses make m M): `ctl` is E_SYNTAX today, so there is
    nothing to do. Recorded in Task 9's BACKLOG note for FX006;
  - §3.5 step 6: P8.
