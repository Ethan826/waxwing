# Tracking Handlers That May Fail (FX008) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: revision 3 (2026-10-10). Reviewed in
docs/sdd/2026-10-09-effects-plan/review-fx008-plan-result.md: round 1 was
"ready with fixes", and round 2's fixes (ec1 by pattern, setup commands,
the Task 7 design pre-review, the tamper-check note) are applied. **Approved by
the user 2026-10-10** (plan at 0d7cc27), with sign-off on P3, P5, P6, P7,
P10 and P11, and P13 accepted:
- P3: mark mismatches are E_TYPE in type comparison and E_EFFECT from the
  mark check. Identical headline text under the two codes is acceptable,
  and the notes distinguish the cause.
- P5: opening applies only to function signatures in this milestone. The
  constructor-field and operation-signature restriction is documented as
  an expressiveness limitation, with examples (Task 12), and revisited
  separately.
- P6, P7: accepted as written.
- P10: the wording is accepted. Pattern-gated messages stay provisional
  until their first observed results are reported to the user and
  approved.
- P11: the two scale scenarios are described exactly as installations and
  a function chain, never as 1,000 syntactically nested handlers.

The user authorized setup and Task 1. Stop conditions and the
report-before-pin rule stay in force.
Execution (user's choice): subagent-driven. Sonnet implements every task;
Opus reviews each (algorithm, invariants, counterexamples). Escalate to an
Opus implementer on genuine ambiguity, any gate failure, or a second failed
review of the same task — no long retry loops. Work happens in a dedicated
worktree on branch `fx008-impl` (Setup below). Never push.

**Goal:** Make `defer` sound: performing a label under a handler whose
clauses may fail is known, through rows and across calls, to possibly
abort, and cleanup may perform only labels whose frames are `nofail`.

**Architecture:** spec §3 (marks per label occurrence, handler types with
inference row R and clause row C, directional consumption, one settling
loop, per-declaration path check, marks stripped in Check). This plan
fixes the modules, interfaces, tests and texts.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node test
runner, Go 1.26.4. No new dependency.

**Spec:** docs/plans/2026-10-10-abort-tracking-design.md (rev 10, approved
2026-10-10). Executors also read: review-fx008-termination-result.md
"Corrected procedure", review-fx008-rev9-f1f2-result.md "Smallest corrected
procedure", review-fx008-rev10-result.md N1/N2/N4 (all in
docs/sdd/2026-10-09-effects-plan/).

## Global Constraints

- AGENTS.md and docs/engineering.md govern every task (style, 250-line
  files, declaration budgets, layers, IR allowlists, regression proofs with
  restored defects). They are not restated here.
- Files within 20 lines of 250 (new code goes in new modules; growth is
  offset in the same task): Domain/Type.purs 249, Domain/Syntax.purs 249,
  test/regression.mjs 249, Format/Parse/Grammar.purs 246,
  scripts/regression.mjs 245, Check/UnifyRow.purs 243, Resolve/Types.purs
  242, Check/Subst.purs 241, test/fx-oracle-parse.mjs 240,
  Check/Handler.purs 234, Format/Parse/Type.purs 233.
- A3 (§0): `bootstrap/*.go` and every emitted Go program byte-identical; the
  gate pins a SHA-256 of each accepted probe's Go.
- §6: programs without `defer` keep acceptance and meaning; texts may move
  only where this plan lists the probe. Sound gain: gain1.
- §3.3: Console labels always N (copies, extensions, `print`, frames);
  `Fail` labels `Unmarked`, never compared; no mark reaches Specialize.
- §3.6/§4.8: provenance and notes never influence typing.
- §3.5: the fallback "never extend a tail that ends any restricted row" is
  disqualified; never use it.
- T003 linearity: `sync` cost ∝ dirty rows; F2 searches only from dirty
  rows; no-feed-edge declarations settle in two rounds; settling consumes
  with throwaway tails (no copies, rev6 M9); path check O(edges × atoms).
- **Probe gate rule.** test/fx008-probes.test.mjs asserts every review
  probe. A task may change a probe's outcome only where this plan lists that
  probe for that task, with its reason and exact expected outcome. Where the
  plan gives a pattern instead of an exact text, the first observed text is
  reported to the user before it is pinned. Any other change (outcome, text,
  span, Go hash) stops the work and is reported; nothing is re-pinned to
  continue. A tamper check pins a hash of the table without `flipped`.
  That hash changes in the same commit as the table, so it only catches
  accidental edits. The real control is the reviewer's diff of the table,
  which must touch only the entries listed for the task.
- Every task: each new behavioural test seen failing first; `rm -rf output
  && npm run verify` exits 0 (timing bounds pass on the user's machine; a
  failure is reported, never relaxed or rerun away); `node
  scripts/regression.mjs <task rows>` prints the proof line per row; one
  commit on `fx008-impl` with the session's trailer.
- **Single writer of shared docs.** The controller alone writes
  docs/progress.md, BACKLOG.md and the ledger
  docs/sdd/2026-10-09-effects-plan/progress.md, on fx008 in the main
  checkout, from each implementer's report. Implementers never edit them.
- Regression rows: scripts/regression-fx008.mjs (`fx008Rows`); probes:
  test/regression-fx008.mjs (`fx008Probes`), registered through
  test/regression-probes.mjs. A probe that can hang compiles in a child
  process with its own 20 s timeout and reports `timed out` (ruling F17).

## Setup (before Task 1, controller)

- [ ] `git worktree add ../waxwing-fx008-impl -b fx008-impl fx008`, at
  execution start.
- [ ] From the worktree root (`cd ../waxwing-fx008-impl`), copy from the
  main checkout. All of these are gitignored. The worktree is outside the
  project directory, so a sandboxed session may need the user's
  permission to write there.
  - `.build/fx008-probes/` without its duplicate directories
    `fx008facts/` and `termination/` (byte-identical to `facts/` and the
    top level): `rsync -a --exclude fx008facts --exclude termination
    /Users/ethan/Desktop/waxwing/.build/fx008-probes/ .build/fx008-probes/`
  - `.spago/` (scripts/regression.mjs compiles `.spago/p/*/src/**`),
    `.build/home` (scripts/cache.mjs's spago home) and `node_modules/`:
    `cp -R /Users/ethan/Desktop/waxwing/.spago .spago`,
    `mkdir -p .build && cp -R /Users/ethan/Desktop/waxwing/.build/home
    .build/home`, and `cp -R /Users/ethan/Desktop/waxwing/node_modules
    node_modules` if it exists.
  - `.build/go-cache` is not copied: scripts/waxwing.mjs and test/support.mjs
    set GOCACHE under `.build`; a cold cache is harmless.
- [ ] Build once: `rm -rf output && npm run verify` in the worktree; exit 0.
- [ ] After the whole-branch review: in the main checkout, `git merge --no-ff
  fx008-impl` into fx008; remove the worktree.

## Review Focus

1. Three or more handlers whose clause tails merge in settling through a
   retried `fail` pair agree in every source order (rev9 review 3e). Task 7.
2. A `defer` inside a clause performing the outer label follows the outer
   frame. Task 9.
3. A `nofail` label prints `nofail L` in every label message; `nofail
   Console` never prints. Task 3.
4. Self- and mutually-recursive `nofail` / `nofail(k)` functions, Go
   identical to the unmarked program. Task 9.
5. A handler in a constructor field (not opened, L1) under a `defer`.
   Task 9.

---

## Decisions where the spec is silent

(i) routine, reviewed by Opus; (ii) needs the user's sign-off.

- **P1 (i) Mark type.** `Mark = NoFail | Plain | MarkVariable String |
  MarkMeta Int | Unmarked`. `Plain` = nothing written: atom M in
  signatures and data, "fresh meta" in lambda-parameter annotations (Check
  replaces it). `Unmarked` = Fail placeholder and every mark after Check.
  Mark variables are named (unique per signature).
- **P2 (i)** `THandler (Label (Ty v)) (HandlerRows (Ty v) v)` with
  `HandlerRows = { inference ∷ R, clauses ∷ C }`; the label's mark is m.
  Record `Eq`/`Ord` keep Type.purs's instances unchanged.
- **P3 (ii, codes and texts)** Equality of marks (types, C ≡ C, handled
  label): metas bind; `Unmarked` skipped; two different non-meta marks fail
  as differing arguments, E_TYPE: `Expected Handler(nofail Log), found
  Handler(Log)`; a row label `Expected nofail Log, found Log` (RowPayload →
  LabelMismatch); a callback type `Expected Unit -> Unit with nofail Log,
  found Unit -> Unit` (a function type's row prints only when it holds a
  `nofail`/`nofail(k)` label, so today's texts are unchanged). Note for the
  user: `Expected nofail Log, found Log` exists both as E_TYPE (P3) and as
  E_EFFECT (path check, `ExpectedNofail`).
- **P4 (i)** Strip at the end of `Features.Check.check`, before
  `instantiationRule`: every mark → `Unmarked`, and every handler type's
  `clauses := inference`, in bodies and tables. After Check, every
  constructed label is `Unmarked` (e.g. Features/Specialize.purs:171).
- **P5 (ii, acceptance)** Opening (§3.4) applies to function signatures
  only (top-level parameter and result types), not constructor fields or
  operation signatures. Sound; only rejects more. Listed beside L1.
- **P6 (ii, headline)** The headline is chosen by the path's last edge: a
  defer demand → `DeferHandlerMayFail` (or `DeferHandlerVariable` from a
  rigid k); a handler's own mark → `HandlerMayFail`; otherwise
  `ExpectedNofail`. §3.6's frame headline "… performs Log, whose handler
  may fail" cannot end a path (m gets only own-abort edges); it becomes
  the note `this handler's clauses perform Log, whose handler may fail`.
- **P7 (ii, which violation)** BFS from each non-N atom (M first, then
  mark variables in signature order), edges in insertion order; report the
  violating edge with the smallest span start, ties by insertion.
- **P8 (i)** Step 6 needs no code: unsolved marks print plain; strip erases.
- **P9 (i)** The §3.2 sort error is unreachable by grammar: mark variables
  occur only inside `nofail(…)`; `x: k` names a type variable.
- **P10 (ii, texts)** The exact texts in Tasks 3, 9 and 10. Codes:
  syntax E_SYNTAX, resolution E_TYPE / E_UNBOUND (Task 3), P3 E_TYPE, every
  mark-check rejection E_EFFECT.
- **P11 (ii, verification scope)** §9 "1,000 nested handlers" under ADR 006's
  nesting limit 128: 1,000 installations in one declaration, and a chain of
  1,000 functions each installing a forwarding handler.
- **P12 (i)** The fx-cleanup migration and generator `nofail` rows land with
  the check that needs them (Task 9).
- **P13 (i, spans)** `sync` takes the span of the node after which (or the
  site before which) it runs; its consumption failures and F2 errors report
  there. Settle and tail-pass consumptions report at: clause entries → the
  handler literal (`ClauseEntry.handler`); the tail pass's clause rule →
  the clause (`ClauseEntry.clause`); installation entries and the
  installation rule → the `with`; deferrals → the deferral span (today's
  `crossing`).
- **P14 (i, order)** Settling orders entries by span start, ties by
  registration index; deferrals are stored post-order and are sorted.

## File map

| Module (new unless marked) | Responsibility | Task |
|---|---|---|
| test/fx008-probes/** (data), test/fx008-probe-table*.mjs, test/fx008-probe-hash.mjs, test/fx008-probes.test.mjs | probe gate | 1 |
| Domain/Row.purs, Domain/Type.purs (mod) | `Mark`, `Label` mark field, `HandlerRows` | 2 |
| Domain/Type/Marks.purs | `mapMarks`, `stripMarks`, `markVariables` | 2 |
| Features/Check/Strip.purs | `stripProgram` | 2 |
| Domain/Note.purs | `Note`, `NoteReason` (moved; re-exported by Domain.Syntax) | 3 |
| Format/Parse/Mark.purs | `nofail`, `nofail(k)` | 3 |
| Features/Resolve/Marks.purs | mark variables: collection, L6, lambda scope | 3 |
| Features/Check/MarkUse.purs | instantiation, local fresh marks, opening | 3-4 |
| test/fx-oracle-marks.mjs | oracle drops mark tokens | 3 |
| Features/Check/MarkStore.purs | bindings, edges, `RowMode` | 4 |
| Features/Check/RowFinish.purs | end of the row unifier (moved) | 4 |
| Features/Check/UnifyMark.purs | mark pairing, copies, extension labels | 4 |
| Features/Check/Cycle.purs | feed graph, SCC order, positive cycles | 5 |
| Features/Check/Settle.purs | the §3.5 loop | 5-8 |
| test/regression-probes.mjs | aggregator of external probes | 5 |
| Features/Check/Handle.purs | `handleFailure` (moved) | 6 |
| Features/Check/Watch.purs | watched/dirty tail sets | 6 |
| Features/Check/Restricted.purs | registry | 6 |
| Features/Check/Clauses.purs, Sync.purs, TailPass.purs | clause rows, hook, tail pass | 7 |
| Features/Check/Install.purs | `with`: C, frame mark | 8 |
| Features/Check/Frames.purs, Mark.purs, MarkReport.purs, Format/Diagnostic/Mark.purs | edges, path check, texts | 9-10 |
| test/fx008-soundness.serial.test.mjs | one-way soundness differential | 11 |

---

### Task 1: Probe gate

No compiler change.

**Files:**
- Create: `test/fx008-probes/` (data: copy of the worktree's
  `.build/fx008-probes/` after Setup — top level (14), rev6 (29), rev7 (11),
  rev8 (17), rev9 (6), rev10 (6), design-review (16), facts (3): 102 files —
  plus `witness/ec1.wxw` and `witness/tp1.wxw`, sources below: 104);
  `test/fx008-probe-table.mjs` (may split per directory to stay ≤ 250);
  `test/fx008-probe-hash.mjs`; `test/fx008-probes.test.mjs`.
- Modify: `docs/engineering.md` (one sentence: the gate and its rule).

**Interfaces:**
- Produces: `export const probes = [{ file, today, fx008, task?, reason?,
  flipped, slow? }]`; `today`/`fx008` are `{ accepted: true, stdout, stderr,
  status, go }` (go = SHA-256 hex of the emitted Go) or `{ accepted: false,
  code, message | pattern, start, end }` (or `at: '<text>'`, offsets by
  `indexOf`). `export const tableHash` in fx008-probe-hash.mjs: SHA-256 of
  `JSON.stringify(probes)` with every `flipped` removed.
- Consumed by: Tasks 2-11 change only `flipped` (and pin a listed pattern),
  updating `tableHash` in the same commit; the reviewer diffs the table.

`witness/ec1.wxw` (review I7):
```
type E = E;
effect Log { fn log(n: Int): Unit; };
effect Cell(a) { fn put(x: a): Unit; };
fn main(): Unit with Console = {
  let g = fn(n: Int) => ();
  let h = handler Log { log(n) => g(n) };
  let z = fn(u: Unit) => {
    put(g);
    defer put(fn(n: Int) => fail(E));
    ()
  };
  with h { log(1) }
};
```
`witness/tp1.wxw` (review I6):
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

- [ ] **Step 1: Copy** the probes as listed (104 files).
- [ ] **Step 2: Record today's outcomes** with the current build: compile
  each; run the accepted ones in one `runGoBatch` (`batch.result(name)` for
  raw stdout/stderr/status); hash the Go. Compare with the planner's and
  reviewer's runs below (fca4134); any difference stops the task.

  Rejected today:

  | Probe | Code | Message | Span |
  |---|---|---|---|
  | argbind-internal | E_INTERNAL | `Effect row consumption failed` | 318-335 |
  | failvar | E_TYPE | `Fail needs a concrete error family` | 25-32 |
  | failvar2, failvar3 | E_TYPE | same | 37-44 |
  | rigid-ok | E_EFFECT | `Fail(E) + Console + ... and Console + ... cannot be made equal: both end in ...` | 216-236 |
  | rigid | E_TYPE | `Expected Handler(Log), found Handler(Log)` | 98-128 |
  | rev10/gain1 | E_EFFECT | `Unhandled Cell(Bool) in main` | 263-268 |
  | rev10/pair1ctl | E_TYPE | `Ambiguous type Opt(_) in comparison` | 302-303 |
  | rev6/amb2 | E_EFFECT | `Unhandled Tick in main` | 162-200 |
  | rev6/annot | E_EFFECT | `Console + Log + ... and Console + ... cannot be made equal: both end in ...` | 235-262 |
  | rev6/around | E_EFFECT | `around performs Log, which its signature does not allow` | 185-211 |
  | rev6/around2, around3, around6 | E_EFFECT | same | 158-182, 154-162, 211-219 |
  | rev6/around4 | E_SYNTAX | `Expected a capitalized name` | 74-78 |
  | rev6/con | E_INTERNAL | `Invalid handler effect` | 0-0 |
  | rev6/ext | E_EFFECT | `defer must not fail, but it performs Fail(E)` | 227-241 |
  | rev6/l4 | E_EFFECT | `Log + Fail(E) + Console + ... and Log + Console + ... cannot be made equal: both end in ...` | 304-309 |
  | rev6/reuse2 | E_EFFECT | same as l4 | 354-359 |
  | rev6/meta3 | E_TYPE | `Ambiguous type Opt(_) in comparison` | 247-248 |
  | rev7/late1ctl | E_TYPE | `Expected a handler` | 311-332 |
  | rev7/rig1, rig2 | E_EFFECT | `f performs Tick, which its signature does not allow` | 255-261, 256-261 |
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
  | design-review/c2 | E_TYPE | `Expected a handler` | 177-194 |
  | design-review/c3 | E_TYPE | `Expected a handler` | 168-185 |
  | design-review/late | E_TYPE | `Fail needs a concrete error family` | 109-116 |
  | design-review/p3 | E_EFFECT | `Unhandled Fail(E) in main` | 174-191 |
  | design-review/p4 | E_EFFECT | `run performs Log, which its signature does not allow` | 162-168 |
  | design-review/p5 | E_EFFECT | `Console + ... and Log + Console + ... cannot be made equal: both end in ...` | 163-169 |
  | design-review/r1, r2 | E_EFFECT | same as p5 | 180-186, 194-200 |
  | design-review/r4 | E_EFFECT | `Unhandled Log in main` | 163-167 |
  | design-review/q2 | E_EFFECT | `This function must be pure, but it performs Fail(E)` | 74-107 |
  | witness/ec1 | E_EFFECT | `Unhandled Fail(E) in main` | 284-301 |
  | witness/tp1 | E_EFFECT | `f performs Console, which its signature does not allow` | 266-278 |

  Accepted today, status 0, empty stderr:

  | Stdout | Probes |
  |---|---|
  | empty | argbind, cycle2open, dup, n1, rev6/hole2, hole2b, hole2c, hole3, hole4, meta2, rev7/late3, design-review/r3, r5 |
  | `0\n7\n1\n` | cycle2 |
  | `1\n2\n` | f1, f2, rev6/annotb |
  | `9\n` | f3 |
  | `0\n` | rev10/gain1ctl, pair1, rl1, rl1ctl; rev6/l4b; rev7/late1, late2; rev8/cyc1, cyc1ok, one1, one1rev8, one3, two1, two1f, two2, two2ctl, two3; rev9/ov1, ov1f, set1 |
  | `1\n` / `5\n` / `101\n` / `2\n` / `7\n` / `true\n` | rev6/amb / amb3 / around5 / con2 / hole1 / meta1 |
  | `12\n0\n9\n` / `12\n0\n` | rev6/extb / reuse |
  | `1\n5\n9\n` | rev7/annotc, annotd |
  | `1\n9\n` | rev7/merge1, merge2, merge2ctl |
  | `2\n1\n9\n` / `11\n9\n` / `101\n101\n0\n9\n` | design-review/p1 / p2 / q1 |

  Accepted with a defect report (empty stdout, status 1): rev6/hole,
  design-review/c1, facts/cross, facts/lexical with stderr `fail(E): E\n`;
  facts/pending with `fail(F): F\ncleanup failed: fail(E): E\n`.
- [ ] **Step 3: Mark the FX008 outcomes.** `fx008 = today` except:

  | Probe | FX008 outcome | Task | Reason |
  |---|---|---|---|
  | dup | E_EFFECT, pattern `/ cannot be made equal: both end in \.\.\.$/`, span 150-160 (`defer k(1)`) | 5 | §6: no finite solution; only deferrals are entries in Task 5, so the cycle is the deferral's self-loop, reported at `crossing deferral.span` |
  | n1 | same pattern, span 138-148 | 5 | same |
  | rev10/gain1 | accepted `0\n`, status 0 (Go hash pinned on first observation) | 7 | §6 sound gain (rev10 N3) |
  | design-review/p5, r1, r2 | E_EFFECT, same spans as today, predicted message `Console + Log + ... and Console + ... cannot be made equal: both end in ...`, pattern `/ cannot be made equal: both end in \.\.\.$/` | 7 | §3.4 F2: the reverse link is gone, so the monomorphic `say` reaching main's flexible tail surfaces as a positive c→R self-loop, reported by `sync` at the node's span (P13); still rejected, text may move (§6) |
  | witness/ec1 | E_EFFECT at span 161-191 (`handler Log { log(n) => g(n) }`), message matching `/^(Unhandled Fail\(E\) in main|Fail\(E\) \+ Console \+ \.\.\. and Console \+ \.\.\. cannot be made equal: both end in \.\.\.)$/`; the observed text is reported to the user before it is pinned | 7 | review I7, and plan review Round 2 N1: the late `Fail(E)` arrives in settling round 2 through the clause entry, whose origin is the handler literal (P13). The re-check's hand trace predicts the side-condition text, because the hook removes today's reverse link to the entry check |
  | witness/tp1 | E_EFFECT, predicted `f performs Console, which its signature does not allow`, span 204-219 (`log(n) => k1(n)`); pattern `/^f performs /` | 7 | review I6: k1's tail becomes rigid only when the pair is retried in settling; the tail pass then rejects R = [Console] at the clause (P13) |
  | rev6/hole, design-review/c1, facts/cross | E_EFFECT `defer must not fail, but it performs Log, whose handler may fail`, span 79-91 (`defer log(1)`) | 9 | §1 cross-function form |
  | facts/lexical | same message, span 129-141 | 9 | §1 pinned form |
  | facts/pending | same message, span 101-113 | 9 | §1: `work`'s `Log` is plain |
  | rev6/l4b | same message, span 153-165 (`defer log(0)`) | 9 | L4 (§6) |
  | rev7/merge2 | `defer must not fail, but it performs Tick, whose handler may fail`, span 244-256 | 9 | L4 (§6) |
  | design-review/q1 | the Log message, span 203-215 (`defer log(0)`, in `run`) | 9 | I2: `run`'s `Log` is plain (§6) |

  p4 and r4 stay unchanged: p4's `say` really needs `Log` in `run`'s closed
  row, which the hook carries from c to R and reports at `say(2)` (P13); r4
  involves no clause row. argbind-internal (FX010) and rev6/con (FX011) are
  unchanged by assumption; a change stops the work.
  `slow: true`: dup, n1, cycle2, cycle2open, argbind, argbind-internal,
  rev8/cyc1, cyc1ok, cyc2, cyc3, rev9/sh1, set1, witness/ec1, witness/tp1.
- [ ] **Step 4: Write test/fx008-probes.test.mjs**: one test per entry
  (`probe <file>`), expected `flipped ? fx008 : today`; slow probes compile in
  a child `node` process (imports `output/Program.Compile/index.js`, prints
  the wire diagnostic or Go) with a 20,000 ms timeout (`timed out` fails);
  accepted entries run in one go-batch; plus `the probe table is untampered`
  (hash equals `tableHash`).
- [ ] **Step 5: Prove the gate can fail** in a scratch copy: one changed
  stdout, one changed message and one changed `fx008` field → those tests
  and the tamper test FAIL. Not committed; recorded in the report.
- [ ] **Step 6: Run** `node --test test/fx008-probes.test.mjs` → PASS (105
  tests); `rm -rf output && npm run verify` → 0.
- [ ] **Step 7: Commit** `test: FX008 probe gate`.

---

### Task 2: Mark representation (behaviour-preserving)

The mark field and the two-row handler type exist; every site supplies a
mark; strip runs. No syntax yet; snapshots and gate identical.

**Files:**
- Modify: `src/Domain/Row.purs`; `src/Domain/Type.purs` (net ≤ +1 line,
  qualified `import Domain.Row as Row` if needed); every `Label`/`THandler`
  construction and match (≈100 sites, compiler-listed); `src/Features/Check.purs`;
  test helpers `test/unify-support.mjs`, `test/row-support.mjs`,
  `test/poly-keys.mjs`, `test/fx-handler-type.test.mjs`.
- Create: `src/Domain/Type/Marks.purs`, `src/Features/Check/Strip.purs`,
  `test/fx008-representation.test.mjs`.

**Interfaces:**
- Domain.Row: `data Mark = NoFail | Plain | MarkVariable String | MarkMeta
  Int | Unmarked` (Eq, Ord); `data Label t = Label EffectRef (Array t)
  Mark` (mark last, so derived Ord ranks by effect first); `type HandlerRows
  t v = { inference ∷ Row t v, clauses ∷ Row t v }`; `labelMark ∷ ∀ t. Label
  t → Mark`; `withMark ∷ ∀ t. Mark → Label t → Label t`; `normalMark ∷
  EffectRef → Mark → Mark` (Console → NoFail, Fail → Unmarked, else
  unchanged); `mapHandlerRows ∷ ∀ t v u w. (Row t v → Row u w) →
  HandlerRows t v → HandlerRows u w`.
- Domain.Type: `THandler (Label (Ty v)) (HandlerRows (Ty v) v)`.
- Domain.Type.Marks (spines by loop): `mapMarks ∷ ∀ v. (Mark → Mark) → Ty v
  → Ty v`; `mapRowMarks ∷ ∀ v. (Mark → Mark) → TyRow v → TyRow v`;
  `stripMarks ∷ ∀ v. Ty v → Ty v` (marks → Unmarked, `clauses :=
  inference`); `markVariables ∷ ∀ v. Array (Ty v) → Array String` (distinct,
  first occurrence).
- Strip: `stripProgram ∷ Checked.Program → Checked.Program` (bodies, function
  types, effect/type/ctor tables), applied in `check` before
  `instantiationRule`.
- Marks supplied: Resolve and Check builders `Plain` (Console `NoFail`, Fail
  `Unmarked`, via `normalMark`); every builder after Check (Specialize,
  Lower, Format.Go) `Unmarked`. Handler literals and written handler types:
  `clauses = inference` (until Task 7). Unification ignores marks (`_`).

- [ ] **Step 1: Failing tests** (test/fx008-representation.test.mjs):
  `stripMarks erases every mark and C` (JS-built type with NoFail, Plain,
  MarkMeta labels and a distinct C → every label `Unmarked`, C equal to R);
  `stripMarks walks a 1,000-arrow spine` (no stack failure).
- [ ] **Step 2: Run** `node --test test/fx008-representation.test.mjs` → FAIL
  (modules missing).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, `test/fx008-probes.test.mjs` → PASS; verify →
  0, snapshots identical.
- [ ] **Step 5: Commit** `refactor: mark field on labels and two handler rows
  (FX008)`.

---

### Task 3: `nofail` syntax, resolution and printing

**Files:**
- Modify: `src/Domain/Syntax.purs` (move `Note`/`NoteReason` to
  Domain.Note; `module Domain.Syntax (module Domain.Syntax, module
  Domain.Note) where`); `src/Domain/Problem.purs`; `src/Domain/Resolved.purs`;
  `src/Format/Parse/Row.purs`, `HandlerType.purs`, `Type.purs` (`argument`
  dispatch, net 0-2 lines); `src/Features/Resolve/Row.purs`, `Resolve.purs`,
  `Types.purs`, `HandlerType.purs`, `Lambda.purs`, `Effect.purs`;
  `src/Features/Check/Lambda.purs`, `Use.purs`, `Operation.purs`,
  `RowName.purs`, `TypeName.purs` (`handlerName`, arrow rows), `Context.purs`,
  `Infer.purs` (Env), `Check.purs`; `src/Format/Diagnostic.purs`,
  `Format/Diagnostic/Name.purs` (FunctionName row); `tools/style/src/Style/Parser.purs`
  (add `"Format.Parse.Mark"`); `docs/engineering.md` (G001 list);
  `test/fx-oracle-parse.mjs` (one import).
- Create: `src/Domain/Note.purs`, `src/Format/Parse/Mark.purs`,
  `src/Features/Resolve/Marks.purs`, `src/Features/Check/MarkUse.purs`,
  `test/fx-oracle-marks.mjs`, `test/fx008-syntax.test.mjs`.

**Interfaces:**
- Domain.Syntax: `data MarkRef = NofailRef Span | NofailVariableRef Span
  String`; `LabelRef` gains `mark ∷ Maybe MarkRef` (`span` stays the label's).
- Domain.Problem: `NofailOnFail`; `MarkVariableOutsideSignature String`;
  `UnboundKind.UnboundMarkVariable`; `FunctionName TypeName (Maybe String)
  TypeName` (the row text, `Just` only when the row has a NoFail or
  MarkVariable label).
- Domain.Resolved: `FunctionDecl.markVariables ∷ Array String`.
- Format.Parse.Mark: `markedLabel ∷ Parser TypeRef → Parser LabelRef`.
- Resolve.Marks: `markVariableRefs ∷ Syntax.TypeRef → Array MarkVariableRef`,
  `rowMarkVariableRefs ∷ Syntax.RowRef → Array MarkVariableRef` (`type
  MarkVariableRef = { name ∷ String, span ∷ Syntax.Span }`);
  `refuseMarkVariables ∷ Array MarkVariableRef → Either Syntax.Diagnostic
  Unit`; `scopedMarkVariables ∷ Array String → Array MarkVariableRef →
  Either Syntax.Diagnostic Unit`.
- Check.MarkUse: `instantiateMarks ∷ Array String → State → Threaded (Mark →
  Mark)` (one fresh `MarkMeta` per name from `state.next`); `localMarks ∷
  State → Ty Open → Threaded (Ty Open)` (each `Plain` → fresh meta; each
  `THandler`'s C → its labels, marks freshened, plus a fresh `Hole` tail).
- CheckEnv and Infer.Env: `markVariables ∷ Array String`.
- Use: `declarationUse ∷ State → Array String → Array String → Array
  Syntax.Sort → Array (Ty Resolved.VarId) → Ty Resolved.VarId → TyRow
  Resolved.VarId → Threaded Use` (2nd: mark variables; ctors and operations
  pass `[]`).
- RowName `labelName`/`labelView` and TypeName `handlerName` print `nofail
  L` (NoFail) and `nofail(k) L` (MarkVariable k) except on Console/Fail;
  anything else plain.

- [ ] **Step 1: Failing tests** in test/fx008-syntax.test.mjs (sources include
  `effect Log { fn log(n: Int): Unit; };` and a `main` installing `handler Log
  { log(n) => print(n) }` where needed):
  - `nofail parses in every row position`: `with nofail Log`, `with Console +
    nofail Log`, `x: Box(nofail Log)` with `type Box(...e) = Box(Unit -> Unit
    with ...e);`, `Handler(nofail Log with pure)` (result of a function
    returning `handler Log { log(n) => () }`), `with nofail(k) Log` — each
    compiles with Go byte-identical to the source with marks removed.
  - `nofail is an ordinary name elsewhere`: `type Opt(a) = No | Some(a); fn
    nofail(x: Int): Int = x; fn g(y: Opt(nofail)): Int = { let nofail = 1;
    nofail }; fn main(): Int = nofail(2);` prints `2\n`.
  - `nofail on Fail is E_TYPE`: `with nofail Fail(E)` and `with nofail(k)
    Fail(E)` → E_TYPE `nofail does not apply to Fail` at `Fail(E)`.
  - `nofail on a row variable is E_SYNTAX`: `with nofail ...e` → E_SYNTAX
    `nofail ...e is not supported yet` at `nofail ...e`.
  - `mark variables only in function signatures`: `type T = T(Unit -> Unit
    with nofail(k) Log);` and operation `fn op(f: Unit -> Unit with
    nofail(k) Log): Unit;` → E_TYPE `nofail(k) is allowed only in function
    signatures` at `nofail(k)`.
  - `a lambda names only its signature's mark variables`: `fn f(): Unit with
    nofail(k) Log = { let g = fn(x: Unit -> Unit with nofail(j) Log) => ();
    () };` → E_UNBOUND `Unbound mark variable j` at `nofail(j)`; with `k`, it
    compiles.
  - `x: k beside nofail(k) is a type variable`: `fn f(x: k): k with
    nofail(k) Log = x;` compiles.
  - `nofail Console is redundant`: `with nofail Console` and `with nofail(k)
    Console` compile; Go equal to plain Console.
  - `nofail prints in label messages, Console never` (Review Focus 3):
    `effect State(s) { fn put(value: s): Unit; }; fn f(): Unit with nofail
    State(Int) = put(true); fn main(): Int = 0;` → E_TYPE `Expected nofail
    State(Int), found State(Bool)` at `put(true)`; `fn f(k: Unit -> Unit with
    nofail Log + ...e): Unit with Clock + ...e = k(());` → E_EFFECT `f
    performs nofail Log, which its signature does not allow`; a row error
    in `with nofail Console + Log` contains `Console`, never `nofail
    Console`.
  - `marks never reach Go`: specialization keys (test/poly-keys.mjs) of the
    marked and unmarked forms of the programs above and examples/answer.wxw
    are equal.
  - test/fx-oracle.test.mjs `the oracle ignores nofail marks`.
- [ ] **Step 2: Run** `node --test test/fx008-syntax.test.mjs` → FAIL at `nofail`.
- [ ] **Step 3: Implement.** Grammar: `nofail` before a label after `with`,
  after `+`, at a row argument's start, and as `Handler(…)`'s handled
  label; in a type-argument position it is a mark only when followed by an
  uppercase name or `(` (dispatch on the token after `nofail`, applicative,
  G001), and a marked label there is always a `RowArgument`; `nofail
  ...name` is the E_SYNTAX. Resolution: none → `Plain`, `nofail` →
  `NoFail`, `nofail(k)` → `MarkVariable "k"`, then `normalMark`; any written
  mark on Fail → `NofailOnFail` at the label span; signature mark variables
  → `FunctionDecl.markVariables`; type, ctor and effect declarations refuse
  `nofail(k)`; lambda annotations are checked against the enclosing list
  (`Annotations.markVariables`). Check: `Lambda.parameterType` applies
  `localMarks`; `functionUse` passes `markVariables`; `declarationUse` maps
  scheme types through `instantiateMarks`. Texts: `NofailOnFail` → `nofail
  does not apply to Fail`; `MarkVariableOutsideSignature k` → `nofail(k) is
  allowed only in function signatures`; `UnboundMarkVariable` word `mark
  variable`. test/fx-oracle-marks.mjs `withoutMarks(tokens)` drops `nofail`
  and `nofail ( name )` before an uppercase name.
- [ ] **Step 4: Run** the tests above, test/fx-oracle.test.mjs,
  test/fx008-probes.test.mjs → PASS; verify → 0.
- [ ] **Step 5: Commit** `feat: nofail syntax, resolution and printing (FX008)`.

---

### Task 4: Directional consumption, copies and mark equality

Edges recorded, not yet read. New rejections: only P3's.

**Files:**
- Create: `src/Features/Check/MarkStore.purs`, `RowFinish.purs`,
  `UnifyMark.purs`; `test/fx008-marks.test.mjs`, `test/fx008-equality.test.mjs`.
- Modify: `UnifyRow.purs` (Step 0: move `Operands`, `Pending`, `postponed`,
  `finish`, `unifyTails`, `shared` to RowFinish unchanged); `Subst.purs`
  (field `marks`; move `compose` to Unify.purs — it is re-exported — so the
  file stays ≤ 250); `Binding.purs` (`extendBounded` copies fields);
  `Unify.purs` (`THandler` arm, `settleRows` modes); `Consume.purs`;
  `Use.purs` (opening); `Handler.purs` (R via `consumeIgnoring`);
  `Defer.purs`, `Failure.purs`; `test/unify-support.mjs`, `test/row-support.mjs`.

**Interfaces:**
- MarkStore: `type MarkEdge t = { lower ∷ Mark, upper ∷ Mark, label ∷ Label
  t, reason ∷ EdgeReason }` (lower ⊑ upper; N ⊑ M); `data EdgeReason =
  Assumed Span | Copied Span | Extended Span | OwnAbort AbortSite |
  FrameOwn Span | FrameOuter Span | FrameRigid Span String | DeferDemand
  Span`; `type AbortSite = { handler ∷ Span, clause ∷ Span, operation ∷
  String, rigid ∷ Maybe String }`; `type MarkStore t = { bindings ∷ Map Int
  Mark, edges ∷ Stack (MarkEdge t) }`; `emptyMarks`, `resolveMark ∷ ∀ t.
  MarkStore t → Mark → Mark`, `bindMark ∷ ∀ t. Int → Mark → MarkStore t →
  MarkStore t`, `addEdge`, `edgesOf` (insertion order); `data RowMode =
  EqualMarks | IgnoreMarks | Directional Direction`, `type Direction = {
  span ∷ Span, throwaway ∷ Maybe Int }`.
- Subst: `marks ∷ MarkStore (Ty Flex)`; `resolveLabel` resolves marks;
  `RowPair.mode ∷ RowMode` (postponed pairs retry in their mode).
- UnifyMark (stage/left label first): `pairMarks ∷ RowMode → Subst → Label
  (Ty Flex) → Label (Ty Flex) → Either Failure Subst` (Equal: P3, failure
  `RowPayload`; Ignore: nothing; Directional: `Assumed span`, lower target,
  upper stage; `Unmarked` adds nothing); `targetLabel ∷ RowMode → Subst →
  Label (Ty Flex) → { label ∷ Label (Ty Flex), subst ∷ Subst }` (Equal:
  itself; Ignore: fresh mark; Directional: fresh t, edge t ⊑ s `Extended`);
  `stageLabel ∷ RowMode → Int → Subst → Label (Ty Flex) → { label, subst }`
  (Equal: itself; Ignore: fresh; Directional: fresh c, edge ρ ⊑ c `Copied`;
  if the meta is the `throwaway`, the label itself, no edge). Fresh marks
  from `Subst.fresh`; Console stays NoFail, Fail Unmarked.
- UnifyRow: `unifyRowsTraced ∷ Unifier → RowMode → Sides → Subst → TyRow Flex
  → TyRow Flex → Either Failure Traced`; `unifyRows` (EqualMarks);
  `unifyRowsIgnoring ∷ Unifier → Subst → TyRow Flex → TyRow Flex → Either
  Failure Subst`.
- Consume (explicit target and throwaway, review I4):
  - `consumeVia` (unchanged signature): stage as it stands into
    `env.current`, Directional; throwaway = the tail it adds to a
    resolved-closed stage.
  - `consumeLabels ∷ ∀ r. CheckEnv r → State → LabelConsumption → Either
    Diagnostic State`, `type LabelConsumption = { origin ∷ Origin, sources ∷
    Array OccurrenceId, labels ∷ Array (Label (Ty Open)), target ∷ TyRow
    Open, sites ∷ Array Site, ignoreMarks ∷ Boolean }`: consumes the labels
    with one fresh tail meta passed as the throwaway, into `target` (env
    with `current = target, sites = sites`). Used by every settling entry,
    clause→C, and C→ρ.
  - `consumeIgnoring ∷ ∀ r. CheckEnv r → State → { origin ∷ Origin, stage ∷
    TyRow Open, target ∷ TyRow Open } → Either Diagnostic State`: stage as
    it stands into `target`, IgnoreMarks (R ≡ ρ at `with`; the hook).
- Unify `THandler`: handled label args and mark EqualMarks; `inference` by
  `unifyRowsIgnoring`; `clauses` by `unifyRows`. Until Task 7 a literal's
  C is its R, so C ≡ C also equates those R marks (harmless: R is dead).
- MarkUse: `openHandlers ∷ State → Array (Ty Open) → Ty Open → Threaded {
  fields ∷ Array (Ty Open), result ∷ Ty Open }` (top-level parameter
  `THandler` with `Plain` m, and result `THandler` with `NoFail` m, get a
  fresh meta; P5); applied by `functionUse`.

- [ ] **Step 0: Refactor** UnifyRow's end into RowFinish; verify → 0;
  `node scripts/differential.mjs` against the base build → 0 differences;
  commit `refactor: split the row unifier's end (FX008)`.
- [ ] **Step 1: Failing tests.** test/fx008-marks.test.mjs (rows via
  unify-support `toLabel({ e, args, mark })`, default `Plain`):
  `a matched pair records frame ⊑ assumption` (stage `[Log(m1)]`, target
  `[Log(m2) | r]`, Directional → exactly one edge lower m2, upper m1);
  `a label added to the target gets a fresh mark below the stage's` (new t ≠
  m1, edge t ⊑ m1 `Extended`); `a label copied into the stage tail gets a
  fresh mark above the frame's` (edge m2 ⊑ c `Copied`); `no copy lands on a
  throwaway tail` (label keeps m2, no edge); `Console stays nofail through
  copies and extensions`; `equality binds mark metas and records no edge`;
  `equality of two different written marks fails` (`RowPayload`); `ignoring
  marks gives fresh marks and no edge`; `the scoped-label properties hold in
  every mode` (row-properties generator with random marks: resolved results
  equal after `stripMarks` to the mark-free run; Directional: one `Assumed`
  edge per matched pair); `consumeLabels makes no copies` (8,000 labels
  consumed into a row ending in a meta: zero `Copied` edges).
  test/fx008-equality.test.mjs:
  - `a fail-free handler parameter refuses a plain handler` (§9):
    ```
    effect Log { fn log(n: Int): Unit; };
    fn run(h: Handler(nofail Log with pure)): Unit = with h { log(1) };
    fn pass(h: Handler(Log with pure)): Unit = run(h);
    fn main(): Int = 0;
    ```
    → E_TYPE `Expected Handler(nofail Log), found Handler(Log)` at `h` in
    `run(h)`.
  - `handler types open at declaration use`: `fn run(h: Handler(Log with
    pure)): Unit = with h { log(1) }; fn mk(): Handler(nofail Log with pure)
    = handler Log { log(n) => () }; fn main(): Int = { run(mk()); 0 };`
    prints `0\n`, Go equal to the unmarked source's.
  - `callback rows are invariant in marks`: `fn need(k: Unit -> Unit with
    nofail Log): Unit = (); fn give(k: Unit -> Unit with Log): Unit =
    need(k);` → E_TYPE `Expected Unit -> Unit with nofail Log, found Unit ->
    Unit` at `k` in `need(k)` (P3).
  - `a lambda passed to a nofail callback compiles`: `need(fn(u: Unit) =>
    log(1))` inside `with nofail Log`.
- [ ] **Step 2: Run** both files → FAIL.
- [ ] **Step 3: Implement.** UnifyRow `present` → `pairMarks`, `absent` →
  `targetLabel`, RowFinish leftover extension → `stageLabel`; `Operands`
  carries the mode; `withHandler` consumes R with `consumeIgnoring`;
  checkDefer and settleDeferred use `consumeLabels`.
- [ ] **Step 4: Run** both files and the gate → PASS; verify → 0.
- [ ] **Step 5: Commit** `feat: directional consumption and mark equality
  (FX008)`.

---

### Task 5: The settling loop (deferred rows)

Replaces `settleKeys` / `settleDeferred` / `settleFinal` (Check.purs:116-118)
with the termination review's corrected loop over deferral entries; the
defer judgement moves after it. dup and n1 flip.

**Files:**
- Create: `src/Features/Check/Cycle.purs`, `Settle.purs`;
  `test/fx008-settle.test.mjs`; `scripts/regression-fx008.mjs`;
  `test/regression-fx008.mjs`; `test/regression-probes.mjs` (imports
  polyProbes, fnProbes, task5Probes, fx008Probes; exports `externalProbes`).
- Modify: `src/Features/Check.purs`; `Defer.purs` (delete `settleDeferred`,
  export `judgeDeferrals`); `scripts/regression.mjs` (+1: `fx008Rows`);
  `test/regression.mjs` (import `externalProbes`; `compilerPath` in
  `context`; net −2); probe table and hash (flip dup, n1);
  `docs/engineering.md` (regression files).

**Interfaces:**
- Cycle: `type FeedRow = { own ∷ TyRow Flex, target ∷ TyRow Flex, keepFail ∷
  Boolean, position ∷ Int }` (resolved rows; `position` = span start, P14);
  `feedOrder ∷ Array FeedRow → Array Int` (edge i → j when target_i's and
  own_j's tails are the same unbound meta; topological SCC order, position
  inside and between; Tarjan by a loop, linear); `positiveCycle ∷ Array
  FeedRow → Array Int → Maybe Int` (reachable from the starts; w_i(κ) =
  count_κ(own_i) − count_κ(target_i), Fail keys out when not `keepFail`; a
  cycle with Σ w(κ) > 0 → its earliest-position row with w_i(κ) > 0):
  ```
  for each SCC S with an edge (|S| > 1 or a self-loop), each κ with some w_i(κ) > 0 in S:
    dist[i] = 0 (i ∈ S); repeat |S| rounds: relax edges i→j in S by w_i(κ), recording pred
    a relaxation in round |S| ⇒ walk pred |S| steps to reach the cycle; return its earliest row with w(κ) > 0
  ```
- Settle: `type Entry = { own ∷ TyRow Open, target ∷ TyRow Open, sites ∷
  Array Site, keepFail ∷ Boolean, ignoreMarks ∷ Boolean, tail ∷ EntryTail,
  origin ∷ Origin, position ∷ Int }`, `data EntryTail = Fresh | Remainder
  (TyRow Open)` (Task 7's φ); `settleRestricted ∷ ∀ r. CheckEnv (locals ∷
  Locals | r) → State → Checked.Expr → Either Diagnostic State`. Task 5's
  entries: one per deferral (`keepFail = false`, Directional, `Fresh`,
  origin `crossing deferral.span`). The loop is the termination review's
  "Corrected procedure" with these specifics: (a) is today's `settleKeys`
  (its `firstUnkeyed` check unchanged; FX012 untouched); "decided" = the
  postponed count changed; (c) reports `rejected env state origin
  (RowSharedTail own target)` at the entry's origin; (d) consumes through
  `consumeLabels` (`Fresh`) in `feedOrder`; exit compares per-entry own-row
  label counts before (a) and after (d); on exit, settleFinal's leftover
  check.
- Defer: `judgeDeferrals ∷ ∀ r. DeferEnv r → State → Checked.Expr → Either
  Diagnostic Unit` (today's `judge` over all deferrals).
- `checkFunction`: `settleRestricted` → `judgeDeferrals` → (Task 9 mark
  check) → comparable → printable → entry.
- scripts/regression-fx008.mjs `export const fx008Rows`;
  test/regression-fx008.mjs `export const fx008Probes`,
  `compileWithin(context, source, ms) → { timedOut, diagnostic, go }`
  (child `node` with `context.compilerPath`).

- [ ] **Step 1: Failing tests** (test/fx008-settle.test.mjs, child processes,
  20 s): `dup has no finite solution` (dup.wxw → E_EFFECT matching the
  pattern, span 150-160); `n1 has no finite solution` (138-148); `a
  satisfiable two-row cycle settles` (cycle2 prints `0\n7\n1\n`); `8,000
  defers settle` (main with 8,000 `defer print(i)` compiles; timed in
  Task 9). Flip dup and n1. The existing fx-cleanup tests `a Fail reaching
  a shared lambda meta later is rejected (P4)` and `a defer handling a Fail
  of a key settled later is accepted` must pass unchanged.
- [ ] **Step 2: Run** → FAIL (dup, n1 accepted).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Row `fx008-cycle-presence`** (Cycle.purs): weight = 1 when κ
  is in own_i but not target_i, else 0. Probe: dup.wxw within 20 s → the
  side-condition rejection; mutant `/cycle weight: timed out/`.
- [ ] **Step 5: Run** tests and gate → PASS; verify → 0; `node
  scripts/regression.mjs fx008-cycle-presence` → proof line. Report dup's
  and n1's observed messages to the user (gate rule) before pinning them.
- [ ] **Step 6: Commit** `feat: settle restricted rows in one loop (FX008)`.

---

### Task 6: Hook infrastructure (no behaviour change)

Watch sets, registry and generalized settling entries exist; nothing uses
clause rows yet; gate unchanged.

**Files:**
- Create: `src/Features/Check/Handle.purs` (Step 0: `handleFailure`,
  `failureClause` moved from Handler.purs; Infer.purs:112's import
  changes), `Watch.purs`, `Restricted.purs`; `test/fx008-watch.test.mjs`.
- Modify: `Subst.purs` (field `watch`; move `compose` now if Task 4 did
  not), `Binding.purs`, `Scheme.purs` (State `restricted`), `Settle.purs`
  (entries from the registry, modes, `EntryTail`).

**Interfaces:**
- Watch: `type TailWatch = { watched ∷ Set Int, dirty ∷ Set Int }`;
  `emptyWatch`; `watchTail ∷ Int → Subst → Subst`; `takeDirty ∷ Subst → {
  dirty ∷ Array Int, subst ∷ Subst }`. Binding: binding a watched meta m
  (`bindTail`) adds m to `dirty` and the bound row's tail meta to `watched`;
  `extendRow` adds m to `dirty` and the fresh tail to `watched`. Data only;
  postponed pairs revert it with their substitution.
- Restricted: `type ClauseEntry = { row ∷ TyRow Open, inference ∷ TyRow
  Open, clauses ∷ TyRow Open, own ∷ Mark, handler ∷ Span, clause ∷ Span,
  operation ∷ String, group ∷ Int, tail ∷ Int, signature ∷ Maybe
  ClauseSignature }`; `type ClauseSignature = { counts ∷ Map LabelKey Int,
  group ∷ Int, kind ∷ TailKind }`; `data TailKind = UnboundTail | RigidTail
  VarId | ClosedTail`; `type Group = { representative ∷ Int, remainder ∷
  TyRow Open }` (φ); `type Installation = { span ∷ Span, label ∷ Label (Ty
  Open), own ∷ Mark, frame ∷ Mark, clauses ∷ TyRow Open, current ∷ TyRow
  Open, sites ∷ Array Site }`; `type Restricted = { clauses ∷ Map Int
  ClauseEntry, groups ∷ Map Int Group, byTail ∷ Map Int (Array Int),
  pending ∷ Set Int, installations ∷ Map Int Installation }`;
  `emptyRestricted`; `registerClause`; `registerInstallation`; `entries ∷
  Restricted → Array Deferral → Array Entry` (sorted by position, P14).

- [ ] **Step 0:** move `handleFailure`; verify → 0; commit `refactor: move
  handle into its own module (FX008)`.
- [ ] **Step 1: Failing tests** (test/fx008-watch.test.mjs, JS on the
  unifier): `binding a watched tail marks it dirty and moves the watch`;
  `extension marks it dirty and watches the fresh tail`; `a postponed pair
  reverts the watch`; `unwatched bindings mark nothing`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Settle builds its entries through `entries`
  (deferrals only, as before).
- [ ] **Step 4: Run** the test, gate, test/fx008-settle.test.mjs → PASS;
  verify → 0.
- [ ] **Step 5: Commit** `feat: tail watches and the restricted registry
  (FX008)`.

---

### Task 7: Clause own rows, `sync`, correction S and the tail pass

One switch-over: the hook without S breaks set1 (the `fx008-settle-phi`
mutant), so these land together. gain1, p5, r1, r2, ec1, tp1 flip.

Before any code, the Sonnet implementer writes a short design of Sync.purs
and TailPass.purs: the functions, the data, and the order of F1′, F2 and
consumption against the pseudo-code. Opus reviews that design first, and
reviews the code after (plan review Round 2 (d)). The 10 regression rows
may be split into a follow-on Task 7b with no behaviour change if the
implementer or reviewer asks; that change is recorded in the ledger.

**Files:**
- Create: `src/Features/Check/Clauses.purs`, `Sync.purs`, `TailPass.purs`;
  `test/fx008-hook.test.mjs`.
- Modify: `Handler.purs`; `Infer.purs` (`sync` after each node); `Apply.purs`
  (`open`'s callers), `Hint.purs`'s caller, `Call.purs`, `Pipe.purs`;
  `Settle.purs`; `Check.purs`; regression files; probe table and hash.

**Interfaces:**
- Clauses: `checkClauses ∷ ∀ r. Infer (locals ∷ Locals | r) → HandlerEnv r →
  State → Span → Label (Ty Resolved.VarId) → Array Resolved.HandlerClause →
  Either Diagnostic (Threaded { clauses ∷ Array Checked.HandlerClause, rows
  ∷ HandlerRows (Ty Open) Open, own ∷ Mark })`: each clause against a fresh
  row c; R, C fresh open rows; m a fresh `MarkMeta`; each c registered (new
  group, `tail` = c's resolved tail, `signature = Nothing`, in `pending`),
  watched, and consumed into C by `consumeLabels` (Directional, Fail kept,
  origin the handler span). R is reached only through `sync`.
  `Handler.handler` builds `THandler (withMark own label) rows`.
- Sync: `sync ∷ ∀ r. CheckEnv r → State → Span → Either Diagnostic State`
  (span per P13). Definitions on resolved rows: `currentSignature(e) = {
  counts: per-key label counts of e.row, group: e.group, kind: kind of
  e.row's tail }`; `groupAt(m)` = the group whose `representative`
  resolves to the unbound meta m, if any. `byTail` entries whose meta is
  bound are removed as they are drained.
  ```
  repeat until no entry is processed:
    dirty ← takeDirty; affected ← pending ∪ byTail[dirty], by position; clear pending
    for e in affected:                                       -- F1′, N1, N4
      case resolved tail of e.row of
        unbound m:
          if e.signature ≠ Nothing and counts grew: e.group ← groupAt(m) or a new group (fresh Hole φ)
          else if groupAt(m) = g′ ≠ e.group: consumeIgnoring φ(e.group) into φ(g′); merge into the older id
          else: keep e.group; its representative ← m
          watchTail m; byTail[m] += e
        rigid ϱ: consumeIgnoring { stage: Row [] (Just ϱ), target: φ(e.group) }
        closed:  consumeIgnoring { stage: closedRow, target: φ(e.group) }
    positiveCycle (FeedRow own = c, target = R per clause entry) affected → side-condition error   -- F2, N2
    for e in affected with currentSignature(e) ≠ e.signature:                                       -- T
      consumeIgnoring { stage: Row labels(e.row) (Just φ(e.group)), target: e.inference }
      e.signature ← currentSignature(e)
  ```
- Settle: each clause entry adds two entries — c → R (`ignoreMarks`,
  `Remainder φ(group)`, S) and c → C (Directional, `Fresh`); both
  `keepFail`, origin the handler span; in `feedOrder`/`positiveCycle` their
  `own` is c with its own tail (N2). After the loop: leftover check, then
  `tailPass`.
- TailPass: `tailPass ∷ ∀ r. CheckEnv r → State → Either Diagnostic State`:
  repeat while a binding was made: for each clause entry whose resolved
  row tail is a rigid ϱ, ensure `inference` and `clauses` end in ϱ (origin
  the clause span). Ensure T ends in ϱ: unbound tail → `consumeIgnoring
  (Row [] (Just ϱ))` into T; already ϱ → nothing; otherwise the error that
  consumption gives. Then every clause entry's unbound `clauses` tail closes.
- `sync` call sites: `Infer.infer` after `inferNode` (the node's span);
  before `headOf` in `withHandler`, `Apply.open`'s callers and
  `Hint.hinted`'s caller; before `functionLike` in Call.purs and Pipe.purs.

- [ ] **Step 1: Failing tests** (test/fx008-hook.test.mjs, child processes,
  20 s):
  - `gain1 is a sound gain` (prints `0\n`); flip gain1, p5, r1, r2, ec1,
    tp1.
  - `no-defer probes keep their outcomes under the hook`: late1, late2, two1,
    two2, two3, two1f, one1, one3, one1rev8, ov1, ov1f, set1, cyc1, cyc1ok,
    pair1 print `0\n`; two2's and hole2c's Go hashes equal the table's;
    rig1, rig2, sh1, ov1ctl, set1ctl, pair1ctl, cyc2, cyc3, p4 keep exact
    texts.
  - `three handlers merging in settling agree in every order` (Review Focus
    1): set1 plus `k3 = fn(n: Int) => ()`, `h3 = handler Log { log(n) =>
    k3(n) }`, `g3 = fn(u: Unit) => with h3 { if put(Some(true)) then () else
    () }`, and `fail(Job(k3))` added to `r`; all six orders of the `let h…`
    lines print `0\n`.
  - `a clause tail that turns rigid in settling is checked by the tail pass`:
    witness/tp1 → its table outcome. Today's rejection (266-278) is the
    retried pair in settling, binding k1's tail (= c's) to `[Console]`
    through R; under the hook, R ≡ ρ_f binds only φ, the retry binds k1's
    tail to `...e`, the loop adds nothing, and only the tail pass rejects
    (review I6).
  - `a late Fail reaching a clause through an argument binding is consumed`:
    witness/ec1 → its table outcome (review I7).
- [ ] **Step 2: Run** with the gate → FAIL (gain1 rejected).
- [ ] **Step 3: Implement.** Handler.purs keeps `handler` and `withHandler`.
- [ ] **Step 4: Rows** (each one needle; probe passes healthy, fails mutant):

  | Row | File | Mutant | Probe; mutant message |
  |---|---|---|---|
  | `fx008-hook` | Sync.purs | `sync` returns the state | late1 prints `0`; `/hook: Expected a handler/` |
  | `fx008-phi` | Sync.purs | fresh tail instead of φ | two1 prints `0`; `/remainder: Ambiguous/` |
  | `fx008-phi-equal` | Sync.purs | φ step replaced by R ≡ R of the merged handlers | ov1 prints `0`; `/R≡R: rejected/` |
  | `fx008-f2` | Sync.purs | F2 call removed | cyc2's side-condition error within 20 s; `/F2: timed out/` |
  | `fx008-new-labels` | Sync.purs | only labels past the recorded count consumed | cyc2 within 20 s; `/new labels: timed out/` |
  | `fx008-signature` | Sync.purs | signature comparison always "changed" | cyc1 prints `0` within 20 s; `/signature: timed out/` |
  | `fx008-settle-phi` | Settle.purs | c → R entries use `Fresh` | set1 prints `0`; `/settling φ: Ambiguous/` |
  | `fx008-r-consumed` | Handler.purs | R consumed with a fresh tail, not as it stands | meta2 compiles; `/R consumed: Ambiguous/` |
  | `fx008-exit-count` | Settle.purs | exit counts only labels (d) added to targets | ec1 rejected with E_EFFECT at 161-191 (either text above); `/exit test: accepted/` |
  | `fx008-tail-pass` | TailPass.purs | `tailPass` returns the state | tp1 rejected; `/tail pass: accepted/` |

  ec1 needs P14's order: the clause entries (line 6) precede the deferral
  (line 9); if they do not, both builds reject and the row cannot be proved
  — stop and report.
- [ ] **Step 5: Run** tests and gate → PASS; verify → 0; `node
  scripts/regression.mjs fx008-hook fx008-phi fx008-phi-equal fx008-f2
  fx008-new-labels fx008-signature fx008-settle-phi fx008-r-consumed
  fx008-exit-count fx008-tail-pass` → 10 proof lines. Report the observed
  texts of p5, r1, r2 and tp1 to the user before pinning them.
- [ ] **Step 6: Commit** `feat: clause own rows and the one-way hook (FX008)`.

---

### Task 8: Installations (no new rejection)

`with` consumes C and gives each installation a frame mark; installation
entries join settling; gate unchanged.

**Files:** Create `src/Features/Check/Install.purs`,
`test/fx008-install.test.mjs`. Modify `Handler.purs` (`withHandler` →
`install`), `Settle.purs`, `TailPass.purs`.

**Interfaces:**
- `install ∷ ∀ r. Infer (locals ∷ Locals | r) → HandlerEnv r → State → Span →
  Checked.Expr → Label (Ty Open) → HandlerRows (Ty Open) Open →
  Resolved.Expr → Either Diagnostic (Threaded Checked.Expr)`: R into
  `env.current` by `consumeIgnoring`; C's labels into `env.current` by
  `consumeLabels` (Directional, Fail kept, origin the `with`); frame f =
  `NoFail` for Console, else a fresh `MarkMeta`; the body is checked against
  `withMark f label` prepended to the current row; registers an
  `Installation`.
- Settle: each installation adds an entry C → `current` (Directional,
  `Fresh`, `keepFail`, origin the `with`). TailPass: an installation whose
  resolved C tail is a rigid ϱ needs `current` to end in ϱ (origin the
  `with`).

- [ ] **Step 1: Failing tests** (JS via the compiled checker or a debug
  export of edge counts): `an installation records frame ⊑ C edges` (one
  `Assumed` edge per C label); `a Console frame is nofail`; `a late clause
  label reaches the installing row` (f1.wxw and f2.wxw still print `1\n2\n`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** with
  the gate → PASS; verify → 0.
- [ ] **Step 5: Commit** `feat: installations with frame marks (FX008)`.

---

### Task 9: Frames, the mark check, texts and migration

The check that makes `defer` sound. hole, c1, cross, lexical, pending,
l4b, merge2 and q1 flip.

**Files:**
- Create: `src/Features/Check/Frames.purs`, `Mark.purs`, `MarkReport.purs`;
  `src/Format/Diagnostic/Mark.purs`; `test/fx008-defer.test.mjs`;
  `test/fx008-scale.serial.test.mjs`.
- Modify: `Check.purs`; `src/Domain/Problem.purs`; `src/Format/Diagnostic.purs`
  (codes and `noted` delegate); `test/fx-cleanup-programs.mjs`;
  `test/fx-programs.mjs`, `test/fx-gen-*.mjs`; regression files; probe
  table and hash.

**Interfaces:**
- Frames: `markConstraints ∷ State → State`, after `settleRestricted`, on
  resolved rows (rev6 M2). Order of insertion: per installation (position
  order) `own ⊑ frame` (`FrameOwn span`); for the r-th κ-label of C, the
  mark of the r-th κ-label of `current` ⊑ `frame` (`FrameOuter span`; Fail
  skipped); if C's tail is a rigid ϱ, `Plain ⊑ frame` (`FrameRigid span
  name(ϱ)`); then per clause entry, if the resolved c holds a Fail label or
  ends in a rigid ϱ, `Plain ⊑ own` (`OwnAbort { handler, clause, operation,
  rigid }`, edge label the first Fail label or the handled label); then per
  deferral, each non-Fail label's mark ⊑ `NoFail` (`DeferDemand span`).
- Mark: `type Violation = { path ∷ Array (MarkEdge (Ty Flex)), start ∷ Mark,
  end ∷ Mark }`; `violation ∷ Array String → Subst → Maybe Violation` (atoms
  `NoFail`, `Plain`, `MarkVariable k` for the declaration's own k):
  ```
  edges ← edgesOf, marks resolved, Unmarked dropped
  for a in [Plain, MarkVariable k1, …]: BFS from a in insertion order, pred[(node, a)] = first edge reaching node
  violating: x ⊑ b, b an atom ≠ Plain, reached from some a ≠ b (x = a included)
  pick per P7; rebuild the path from pred
  ```
- MarkReport: `reportViolation ∷ ∀ r. CheckEnv r → State → Violation →
  Either Diagnostic Diagnostic` (headline and span by P6; notes in Task 10).
- Domain.Problem (E_EFFECT, `noted`):

  | Constructor | Text | Span |
  |---|---|---|
  | `DeferHandlerMayFail label` | `defer must not fail, but it performs <L>, whose handler may fail` | the deferral |
  | `DeferHandlerVariable variable label` | `defer must not fail, but it performs nofail(<k>) <L>, whose handler is fail-free only when the caller's is` | the deferral |
  | `ExpectedNofail expected found` | `Expected <expected>, found <found>` (labels with their atoms' marks: `nofail Log`, `nofail(k) Log`, `Log`) | the last edge's span |
  | `HandlerMayFail (ClauseFails operation payload)` | `This handler may fail here: its clause for <op> fails with <E>` | `AbortSite.handler` |
  | `HandlerMayFail (ClauseMayPerform operation tail)` | `This handler may fail here: its clause for <op> may perform any effect of <r>` (`...` or `...e`) | `AbortSite.handler` |

- `checkFunction`: after `judgeDeferrals`, `markConstraints`, then
  `violation` → `reportViolation`.

- [ ] **Step 1: Failing tests** (test/fx008-defer.test.mjs, `expectDiagnostic`
  with `notes: []` until Task 10; sources start with `type E = E; effect Log {
  fn log(n: Int): Unit; };` unless shown).

  Rejections (§9):
  - `the pinned program is rejected`: facts/lexical → Log defer message at
    129-141. Flip lexical, hole, c1, cross, pending, l4b, merge2, q1 (table).
  - `a fail-free handler type refuses a failing literal`: `fn mk():
    Handler(nofail Log with Fail(E)) = handler Log { log(n) => fail(E) }; fn
    main(): Int = 0;` → `This handler may fail here: its clause for log fails
    with E` at the literal.
  - `mk returning Handler(nofail Log) keeps today's row error`:
    design-review/q2 with `nofail ` before `Log` → `This function must be
    pure, but it performs Fail(E)` at 81-114.
  - `a nofail call under a plain signature`: `fn work(): Unit with nofail Log
    = (); fn caller(): Unit with Log = work(); fn main(): Int = 0;` →
    `Expected nofail Log, found Log` at `work()`.
  - `a forwarding clause into a failing outer handler` (today accepted, dies
    with `fail(E): E`):
    ```
    fn main(): Unit with Console = handle {
      with handler Log { log(n) => fail(E) } {
        with handler Log { log(n) => log(n + 1) } { defer log(1); () }
      }
    } { fail(error: E) => print(9) };
    ```
    → Log defer message at `defer log(1)`.
  - `a clause calling an ambient callback` (today prints `1`): `fn f(cb: Unit
    -> Unit): Unit = with handler Log { log(n) => cb(()) } { defer log(1); ()
    }; fn main(): Unit with Console = f(fn(u: Unit) => print(1));` → Log
    defer message at `defer log(1)`.
  - `a rigid mark variable cannot be assumed fail-free`: `fn f(): Unit with
    nofail(k) Log = { defer log(1); () }; fn main(): Int = 0;` →
    `DeferHandlerVariable` text at `defer log(1)`.
  - `L4: l4b is rejected`, `L4: merge2 is rejected` (table outcomes).

  Acceptances (one go-batch, exact stdout, status 0):
  - `a nofail signature under a fail-free handler`: the migrated fx-cleanup
    program prints `2\n1\n`.
  - `I1: a local lambda under two handlers` (p1) `2\n1\n9\n`; `I1: one handler
    value installed under two rows` (p2) `11\n9\n`.
  - `I2 and N5 with nofail`: q1 with `fn prefix(): Handler(nofail Log with
    Log) with pure` and `fn run(h: Handler(Log with Log + ...e)): Unit with
    nofail Log + ...e` prints `101\n101\n0\n9\n`.
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
  - `a fail-free forwarding clause under a defer`: the forwarding program
    with `print(n)` for `fail(E)` prints `2\n`.
  - `Console cleanup`: `fn f(): Unit with Console = { defer print(1); print(2)
    }; fn main(): Unit with Console = f();` prints `2\n1\n`.
  - `a defer inside a clause follows the outer frame` (Review Focus 2):
    `with handler Log { log(n) => print(n) } { with handler Log { log(n) => {
    defer log(n + 1); () } } { log(1) } }` prints `2\n`; with the outer
    clause `fail(E)` inside `handle … { fail(error: E) => print(9) }` it is
    rejected with the Log defer message at `defer log(n + 1)`.
  - `recursive nofail and nofail(k) functions` (Review Focus 4): `fn
    count(n: Int): Unit with nofail Log = if n == 0 then () else ({ defer
    log(n); count(n + -1) });` (`count(3)` prints `1\n2\n3\n`); `fn pass(n:
    Int): Unit with nofail(k) Log = if n == 0 then log(0) else pass2(n + -1);
    fn pass2(n: Int): Unit with nofail(k) Log = pass(n);` (`pass(3)` prints
    `0\n`); Go equal to the unmarked programs'.
  - `a handler in a constructor field keeps its mark` (Review Focus 5): with
    `type Box = Box(Handler(nofail Log with pure));`, `match Box(handler Log {
    log(n) => () }) { Box(h) => with h { defer log(1); () } }` compiles and
    prints nothing; a clause handling its own failure (`log(n) => handle
    fail(E) { fail(e: E) => () }`) and one that crashes (`crash(1)`, a
    defect, §3.1) compile; `Box(h)` with a parameter `h: Handler(Log with
    pure)` → E_TYPE `Expected Handler(nofail Log), found Handler(Log)`.

  test/fx008-scale.serial.test.mjs (bounds = 3 × the median of five runs on
  the implementer's host, named constants with date, load and runs, as
  test/fx-block.serial.test.mjs; twice the size measured and reported):
  `8,000 defers check within the bound` (`fn work(): Unit with nofail Log`
  with 8,000 `defer log(0);` items); `1,000 installations in one
  declaration`; `a chain of 1,000 forwarding installations` (`fn f<i>():
  Unit with nofail Log = with handler Log { log(n) => log(n) } { f<i+1>() };`,
  ending `fn f1000(): Unit with nofail Log = { defer log(0); () };`); `200
  mark variables` (`fn wide(): Unit with nofail(k1) Log + … + nofail(k200)
  Log = wide2();` with `wide2` the same over j1…j200).
- [ ] **Step 2: Run** → FAIL (rejections accepted).
- [ ] **Step 3: Implement**, then migrate: fx-cleanup `a defer performing a
  non-Fail effect` gets `fn work(): Unit with nofail Log` (same name and
  output, §6); the generator writes `nofail L` on every generated signature
  label with a frame (random clauses are still fail-free; `crossing` calls
  only operations and `risky`). Any other existing test that newly fails is
  a stop-and-report item (§6 names only the fx-cleanup case).
- [ ] **Step 4: Rows:**

  | Row | File | Mutant | Probe; mutant message |
  |---|---|---|---|
  | `fx008-directional` | UnifyMark.purs | Directional pairs bind as EqualMarks | p1 `2 1 9`; `/directional: rejected/` |
  | `fx008-copies` | UnifyMark.purs | Directional `stageLabel` returns the label | p1; `/copies: rejected/` |
  | `fx008-c-unified` | Install.purs | C consumed as it stands (unified with ρ) | p2 `11 9`; `/C unified: rejected/` |
  | `fx008-r-marks` | Consume.purs | `consumeIgnoring` uses EqualMarks | p2; `/R marks: rejected/` |
  | `fx008-extension` | UnifyMark.purs | Directional `targetLabel` returns the stage label | extb `12 0 9`; `/extension: rejected/` |
  | `fx008-local-plain` | MarkUse.purs | `localMarks` keeps `Plain` | annotb `1 2`; `/local marks: rejected/` |
  | `fx008-r-identity` | UnifyMark.purs | IgnoreMarks extension keeps the mark | merge1 `1 9`; `/R identity: rejected/` |
  | `fx008-c-alias` | MarkUse.purs | `localMarks` keeps C = R | annotc `1 5 9`; `/C alias: rejected/` |
  | `fx008-frame-m` | Install.purs | frame mark = own mark m | I2 with nofail `101 101 0 9`; `/frame: rejected/` |
  | `fx008-own-frame` | Frames.purs | no `own ⊑ frame` | pinned program rejected; `/own frame: accepted/` |
  | `fx008-outer-frame` | Frames.purs | no `FrameOuter` | forwarding-into-failing rejected; `/outer frame: accepted/` |
  | `fx008-rigid-n` | Mark.purs | mark variables not source atoms | `nofail(k)` defer rejected; `/rigid: accepted/` |

- [ ] **Step 5: Run** test/fx008-defer.test.mjs, the gate,
  test/fx-cleanup.test.mjs, and `node --test --test-concurrency=1
  test/fx008-scale.serial.test.mjs` → PASS; verify → 0 (differential: every
  generated program compiles, 0 differences); `node scripts/regression.mjs`
  with the 12 rows → 12 proof lines.
- [ ] **Step 6: Commit** `feat: the mark check makes defer sound (FX008)`.

---

### Task 10: Notes for mark rejections

**Files:** Modify `src/Domain/Note.purs`, `src/Features/Check/MarkReport.purs`,
`src/Format/Diagnostic/Mark.purs`, `src/Format/Diagnostic/Note.purs`
(`noteText` delegates), `test/fx008-defer.test.mjs`, the probe test (notes
for the flipped probes).

**Interfaces:** Notes, ordered from the demand back to the source, one per
path edge of these kinds; `Assumed`/`Copied`/`Extended`/`DeferDemand` give
none except the source rule; `maxNotes`/`maxCharacters` apply.

| Reason | From | Span | Text |
|---|---|---|---|
| `HandledHere label` (existing) | `FrameOwn` | the `with` | `<L> is handled here` |
| `ClausesReach label` | `FrameOuter` | the inner `with` | `this handler's clauses perform <L>, whose handler may fail` |
| `ClausesMayPerform tail` | `FrameRigid` | the `with` | `this handler's clauses may perform any effect of <r>` |
| `ClauseFailsWith operation payload` | `OwnAbort`, `rigid = Nothing` | the clause | `its clause for <op> fails with <E>` |
| `ClauseMayPerform operation tail` | `OwnAbort`, `rigid = Just r` | the clause | `its clause for <op> may perform any effect of <r>` |
| `SignatureMayFail function label` | path from `Plain` through an `Assumed` edge (a constant `Plain` lower is the declaration's own row, P1) | `env.rowSpan`, else the function span | `the signature of <f> allows a failing <L> handler; write with nofail <L>` |
| `MarkVariableHere variable label` | path from `MarkVariable k` | `env.rowSpan`, else the function span | `nofail(<k>) <L> is fail-free only when the caller's handler is` |

- [ ] **Step 1: Failing assertions** (`[container, inner, text]`):
  - pinned (lexical): the `with` → `Log is handled here`; `log(n) =>
    fail(E)` → `its clause for log fails with E`.
  - hole, c1, cross: `with Log` → `the signature of work allows a failing Log
    handler; write with nofail Log`; pending: `with Log + Fail(F)` → same text.
  - q1: in `run`, `with Log + ...e` → `the signature of run allows a failing
    Log handler; write with nofail Log`.
  - forwarding into failing: inner `with` → `this handler's clauses perform
    Log, whose handler may fail`; outer `with` → `Log is handled here`; outer
    clause → `its clause for log fails with E`.
  - ambient callback: the `with` → `this handler's clauses may perform any
    effect of ...` (the rigid frame edge is one BFS hop from M).
  - nofail call: `with Log` (in `caller`) → `the signature of caller allows
    a failing Log handler; write with nofail Log`.
  - rigid k: `with nofail(k) Log` → `nofail(k) Log is fail-free only when the
    caller's handler is`.
  - fail-free literal: `log(n) => fail(E)` → `its clause for log fails with E`.
  - l4b: the failing `with` → `Log is handled here`; its clause → `its
    clause for log fails with E`. merge2: the failing `with handler Tick {
    tick() => fail(E) } { b(()) }` → `Tick is handled here`; `tick() =>
    fail(E)` → `its clause for tick fails with E`. If the path through the
    shared tail yields other notes, stop and report.
  - `a 1,000-hop mark path is bounded`: 1,000 sequential let-bound lambdas,
    each installing a forwarding handler and calling the previous one, the
    first deferring under a failing handler; the diagnostic stays within
    `maxCharacters` and keeps its first and last notes.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS;
  verify → 0.
- [ ] **Step 5: Commit** `feat: notes for mark rejections (FX008)`.

---

### Task 11: Failing random clauses and the one-way soundness differential

**Files:** Modify `test/fx-gen-expr.mjs`, `test/fx-gen-fragments.mjs`,
`test/fx-gen-cleanup.mjs`, `test/fx-census.mjs`, `test/fx-gen-reject.mjs`,
`test/fx-differential.serial.test.mjs`, `docs/engineering.md`. Create
`test/fx008-soundness.serial.test.mjs` (and `test/fx-gen-unconstrained.mjs`
if fx-programs.mjs would pass 250).

**Interfaces:**
- `generate(seed, index, options = {})`. Default corpus: a random clause
  body may be `fail(<payload>)` of a family handled outside its `with`;
  `ctx.failing` holds every label whose innermost frame may fail; cleanup
  performs only labels outside it and calls generated `nofail` functions
  only where those frames are outside it; every program compiles.
  `options.unconstrained`: cleanup ignores `ctx.failing`.
- Census rows (observed by the oracle): `failing random clause` (≥ 25,
  default corpus); `escape witnessed` (soundness file).
- `rejection(seed, index)` gains three kinds after the existing 25 (defer
  reaching a failing handler directly; through a forwarding clause; through
  a clause calling an ambient callback) → E_EFFECT `defer must not fail, but
  it performs <L>, whose handler may fail` at the `defer` span.

- [ ] **Step 1: Failing tests:** census `failing random clause ≥ 25`; `25
  defers reaching failing handlers are rejected with the FX008 text`;
  test/fx008-soundness.serial.test.mjs: 300 programs `generate(SEED + 100000
  + i, i, { unconstrained: true })`; accepted → the oracle never reports
  `oracle error: typed abort escaped cleanup` and Go equals the oracle
  exactly; rejected → E_EFFECT, an FX008 headline or a Task 8 (FX001) text,
  at a `defer` span; minimums: ≥ 50 accepted with a cleanup performing a
  user operation, ≥ 50 rejected by an FX008 headline, ≥ 25 escapes
  witnessed by the oracle, all rejected by the compiler; failures saved to
  `.build/fx008-soundness/`.
- [ ] **Step 2: Run** `node --test --test-concurrency=1
  test/fx-differential.serial.test.mjs test/fx008-soundness.serial.test.mjs`
  → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Sensitivity** (ruling R1): in an isolated copy with the mark
  check disabled (Task 8's state), the soundness test fails with ≥ 1 escape
  accepted; record the count.
- [ ] **Step 5: Run** Step 2's command → PASS, 0 differences; verify → 0;
  report census, seeds, run time.
- [ ] **Step 6: Commit** `test: failing random clauses and the soundness
  differential (FX008)`.

---

### Task 12: Spec, CF001 and plan amendments

**Files:** Modify `docs/plans/2026-10-09-effects-design.md`,
`docs/plans/2026-10-09-concurrency-foundations-design.md`,
`docs/plans/2026-10-09-effects-plan.md`, `docs/architecture.md`,
`docs/findings.md`, `docs/next-session.md`. (BACKLOG, progress and ledger:
the controller.)

- [ ] **Step 1:** Apply FX008 design §8 to the effects spec verbatim in
  substance, with the exact texts of Tasks 9-10 in §6; each edit names FX008
  and the date.
- [ ] **Step 2:** Apply §4.4 (D4) to CF001: §5 R0, decision O-2 (§8A.8),
  the §8A.6 escaping-callback row. Nothing else.
- [ ] **Step 3:** Amend the FX001 plan per FX008 design §10 (Task 11 Step
  1) and add: Task 12's ADR 010 and language Effects section record the
  FX008 rule and L1/L4/L6; Task 12's rows go in scripts/regression-fx.mjs
  beside scripts/regression-fx008.mjs, its probes in
  test/regression-probes.mjs; update the status line.
- [ ] **Step 4:** architecture.md (the Check list gains the mark modules);
  findings (the hole, its cause, the rule); next-session handoff. Report to
  the controller the BACKLOG changes to make: FX008 done pending
  whole-branch review; FX007 re-scoped per §4.5 (D5), deferred; FX010/FX011
  unchanged (still pinned by the gate); FX012 note (round 1 keeps the
  unkeyed check); rows for L1 (with P5), L4 (l4b, merge2), L6; FX006 note
  (§4.6: `ctl` makes m M).
- [ ] **Step 5:** verify → 0; `node scripts/regression.mjs` → every row,
  including 23 FX008 rows.
- [ ] **Step 6: Commit** `docs: FX008 spec amendment, CF001 abort-free
  boundaries, FX001 plan amendments`.

---

## Coverage

| Spec item | Task |
|---|---|
| §3.2 syntax, §3.3 representation | 2, 3 |
| §3.4 consumption, opening, equality | 4 |
| §3.5 loop, cycle test, exit, leftover, order | 5, 6 |
| §3.4 hook (F1′, F2, T), S, tail pass | 7 |
| §3.4 `with`, frames | 8, 9 |
| §3.5 step 5 path check, §3.6 headlines and notes | 9, 10 |
| §6 compatibility list, §9 rejections and acceptances | 1 (gate), 7, 9 |
| §9 mutants (23 rows) | 5 (1), 7 (10), 9 (12) |
| §9 differential | 11 |
| §8, D4, D5, §10 FX001 amendments | 12 |
| §3.5 step 6, §4.6 | P8; no-op (`ctl` is E_SYNTAX) |
