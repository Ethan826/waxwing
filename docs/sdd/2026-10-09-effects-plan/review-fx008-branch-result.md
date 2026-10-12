# FX008 whole-branch review (8fe4218..e54d869)

Reviewer: Opus, 2026-10-12. Worktree /Users/ethan/Desktop/waxwing-fx008-impl,
branch fx008-impl at e54d869 (35 commits). Nothing was committed, edited or
pushed. The base build (8fe4218) and an attribution build (66f1eca) were
made in throwaway copies under /private/tmp/claude-501/ and deleted
afterwards. One side effect: `--regenerate` rewrote the gitignored
`.build/differential-harvest.jsonl` in the worktree (3,811 sources, from
e54d869's own tests).

## Verdict: Ready after fixes

There is no Critical issue. 26 new adversarial programs combine settling
merges, installations, result-handler C, alias jumps, `nofail(k)` through
recursion and higher-order functions, handlers in data, nesting inside
clauses and `defer` inside clauses. Every program whose cleanup the
reference interpreter shows ending in a typed abort is rejected. All 16
accepted programs run identically in Go and in the interpreter, and their Go
matches the base build wherever the base accepts them.

The final-outcome differential against 8fe4218 shows no Go difference in
any program both builds accept. The 412 newly accepted `nofail` programs
emit Go byte-identical to their unmarked versions on the base build. Every
acceptance or headline change falls in an approved category.

One Important issue: four programs without `defer` changed their notes
in Task 7, and nothing approved or pinned the change. I1 below needs either
a small fix or the user's approval. The Minor items are cleanups.

## Issues

### Important

**I1. Unapproved note changes on four no-`defer` probes (from Task 7).**
The affected probes are rev6/amb2, rev6/around3, design-review/p3 and
rev9/ov1ctl. Code, message and span are unchanged; only `related`
differs. The change is already present at 66f1eca, the end of Task 7.

| probe | base 8fe4218 notes | e54d869 notes |
|---|---|---|
| amb2 | Tick is performed here; main may perform only Console | **Tick comes from this function value** (at the handler literal); Tick is performed here; main may perform only Console |
| around3 | Log comes from this function value; Log is performed here; **Log is handled here**; the signature of around does not allow Log | Log comes from this function value; **Log comes from this function value** (at the handler literal); Log is performed here; the signature of around does not allow Log |
| p3 | **Fail(E) is raised here**; Log is handled here; main may perform only Console | **Fail(E) comes from this function value**; Log is handled here; main may perform only Console |
| ov1ctl | Tick is performed here; Log is handled here; main may perform only Console | **Tick comes from this function value** (at the handler literal); Tick is performed here; Log is handled here; main may perform only Console |

Cause: clause-row consumptions are registered with
`consumed: Application` at src/Features/Check/Clauses.purs:148,
src/Features/Check/SettleEntry.purs:107 (clause entries) and
src/Features/Check/Filing.purs:43. src/Features/Check/Report.purs:83 maps
`Application` to `FromFunctionValue`, so a handler literal is called "this
function value". The clause-row hop also displaces "Log is handled here"
(around3) and "Fail(E) is raised here" (p3).

The probe gate pins the notes of flipped probes only
(test/fx008-probes.test.mjs:76-84), and Task 7's differential was run over
the probe files. So nothing caught the change. §6 allows a text to move only
where the plan lists the probe.

Fix (forward verbatim): "Add a `Consumed` variant for clause-row and
installation consumptions (e.g. `ClauseRow`) in
src/Features/Check/Provenance.purs, and use it at Clauses.purs:148,
Filing.purs:43 and SettleEntry.purs:75/107. Make Report.reasonOf give no
note for it, and let the trail continue past it, so that the base notes
come back exactly. Add a test asserting the base 8fe4218 notes, quoted in
review-fx008-branch-result.md I1, for rev6/amb2, rev6/around3,
design-review/p3 and rev9/ov1ctl. Show it failing on e54d869 first. The
probe gate and the differential must stay unchanged otherwise." If the user
prefers the new notes, pin these four in test/fx008-probe-notes.mjs with a
user-approved text for a handler literal (e.g. "Tick comes from this
handler's clauses") instead of "function value".

### Minor

**M1. Stale serial bounds after T008.**
- test/fx008-scale.serial.test.mjs:18 keeps `MEASURED_INSTALLATIONS = 7342`.
  The bound is therefore 22 s, while the check now takes about 550 ms, so a
  40x regression would pass.
- test/fx008-install.serial.test.mjs:16 keeps `bound = 9500`, which its
  comment acknowledges.

Linearity is still guarded by the ratio test. Fix: "Re-measure the median of
five runs of the 1,000-installation check at e54d869, set
MEASURED_INSTALLATIONS to it, and update the comment's date and load. Lower
fx008-install.serial's `bound` to about 4x the new median, or remove that
test in favour of the ratio test and the scale test."

**M2. Pre-settle state is used after settling.** At
src/Features/Check.purs:143-148,
`ended = finished { subst = settledSubst }` throws away the settled
registry. `markConstraints` (Frames) then reads
`restricted.installations` and `restricted.clauses` from the state
*before* settling. This is correct today, because settling changes only
`group`, `tail`, `signature` and `matched` (Groups.purs:86-109,
Sync.purs:100, Settle.purs:224), and Frames reads none of them. But the
code is fragile, and the comment ("Tasks 8-9 must carry `restricted.next`
forward") is stale. Fix: "Use the settled state:
`let ended = restricted`, and delete the comment at Check.purs:143-146. Run
the differential against e54d869 (expect 0 differences) and verify."

**M3. Unreachable or silent paths left from superseded designs.**
(a) src/Features/Check/Lend.purs:71-72: `either (const reached) identity`
drops a `Left` that `pairMarks (Directional …)` never returns today. A
later change that made directional pairing fail would lose a mark edge
silently, which is a soundness risk. Fix: "In `assume`, call
`UnifyMark.recorded` directly with `{ lower: labelMark partner, upper:
labelMark stage, label: …, reason: Assumed span }`, so that no edge can be
dropped. Behaviour is identical (Directional is `Right (recorded …)`)."
(b) The installation rule in src/Features/Check/TailPass.purs:51-70 is
documented as unreachable, and the `fallback` consumeBare in
src/Features/Check/Settle.purs:228-237 is "not reached" (the Task 8 review
measured 0 of 570 sources). Neither has a test. Fix: "Either delete both
and state the invariants (R ≡ current; lent labels ⊆ R ⊆ current) in
comments, or keep them and add a unit test that builds a state reaching
each. User/controller choice."

**M4. The soundness generator has no `nofail(k)` shape**
(test/fx-gen-failing.mjs). This review covered that case by hand (p01,
p02, p11, q03, q09, q10). Fix: "Add `callee-k` (a `nofail(k)` callback
whose defer runs under the caller's failing frame) and `value-k` (a
nofail(k) function value returned and called) shapes, each at least 5
witnessed escapes, or register p01, p02, p11 and q03 from this review, with
their accepted controls run in Go against the interpreter, as tests in
test/fx008-defer.test.mjs and test/fx008-defer-run.test.mjs."

**M5. The BACKLOG FX008 row is stale.** Its status reads "T008 fix and
whole-branch review pending", and its last sentence still lists T008 as
remaining. Fix: after this review and I1, set the status to
"Done (merged …)" and replace "Remaining: …" with the merge commit and this
review's path.

**M6. Line budgets.**
- src/Domain/Type.purs is at exactly 250 lines, the limit, with no headroom.
- src/Domain/Syntax.purs is at 248 lines.
- test/regression.mjs is at 247 lines.

Fix: none needed now. The next change to these files must split them first.

**M7. Test-only export.** `checkedStates` (src/Features/Check.purs:1,
72-80) re-runs checking for test/fx008-install.test.mjs only. It is
documented and pure. Acceptable as is. Optionally move it to a
`Features.Check.Inspect` module, so that the public API of Features.Check
stays `check`.

### Observations (no action)

- A `nofail` handler literal whose clause calls a callback parameter is
  rejected, even when the parameter is written with `nofail Tick` (v1-v3
  below). The cause: a signature arrow row ends in the declaration's
  ambient tail, so the clause row is rigid and its own mark is M. The
  message reads "its clause for log may perform any effect of ..." for a
  row written without `...`, which is E012's ambiguity. This follows the
  design (a rigid tail makes m M) and L3/FX007. It is worth an example in
  FX007's design note.
- The chain of 1,000 installing functions is linear but about 4x the base
  build's constant (83 → 332 ms). The rigid-tail chain of `let` handlers is
  about 5x (49 → 331 ms at 1,000). Both stay linear (2.1-2.2x per doubling).

## End-to-end soundness: adversarial programs

Harness: candidate verdict; base verdict; reference interpreter
(`test/fx-oracle.mjs` `outcome`); for accepted programs, `go build` and
run, compared with the interpreter. All programs start with
`type E = E; effect Log { fn log(n: Int): Unit; }; effect Tick { fn tick(): Unit; };`.
Sources of the escape programs are listed at the end. "c" variants are the
fail-free controls.

| # | program | features combined | interpreter | e54d869 verdict |
|---|---|---|---|---|
| 1 | p01 app-failing-k | `nofail(k)` callback only in a parameter; the callee installs a failing handler around it | escape | rejected at `f(())`: Expected nofail(k) Log, found Log (M→k) |
| 2 | p02 / p02c | two callbacks share k, defer in one; failing / fail-free caller | escape / `1 2` | rejected at defer / accepted, Go = interpreter |
| 3 | p03 / p03c | recursive `nofail` through a forwarding handler at each level | escape / `30` | rejected at call / accepted, Go = interpreter |
| 4 | p04, p04b | `nofail(k)` parameter handler returned as result (closed C; `...e` C with failing Tick) | escape | both rejected at defer |
| 5 | p05 / p05c | clause installs a forwarding handler and defers inside it | escape / `1` | rejected / accepted, Go = interpreter = base |
| 6 | p06 / p06c | failing handler stored in generic `Box(a)`, matched and installed | escape / `1` | rejected / accepted, Go = base |
| 7 | p07 | handler literal returned by a local closure, failing Tick | escape | rejected |
| 8 | p08 / p08c | one handler value installed 9 times under three Tick handlers (alias chains); defer under the failing one / only under the fail-free one | escape / `5 5 9` | rejected / accepted, Go = base |
| 9 | p10 / p10c | clause calls a `nofail` function under a failing outer handler | escape / `1` | rejected at the call / accepted |
| 10 | p11 / p11c | `nofail(k)` callback returned by a higher-order `id2`, called under fail-free then failing handlers | escape / `1` | rejected / accepted |
| 11 | p12, p12b | result handler with a fresh C tail merged by `if` with a literal that ticks; failing Tick | no escape / escape | both rejected (p12 conservative) |
| 12 | p13 / p13c | three handlers nested inside clauses, defer at the innermost, failing Tick outside | escape / `7` | rejected / accepted, Go = base |
| 13 | p14 / p14c | handler in a row-parameterized field `HB(...e)` | escape / `7` | rejected (strict Fail text) / rejected as base rejects the unmarked program ("Unhandled Log in main") |
| 14 | p15 | clause containing `defer tick()` passed as `Handler(nofail Log with nofail Tick + ...e)` under failing Tick | escape | rejected at the argument |
| 15 | p16, p16b | three literals merged through `if`; install the merge, or a fail-free member, with defer under failing Tick | no escape / no escape | both rejected (conservative: merged C) |
| 16 | p17, p17b, p17c | `Cell(Int)` / `Cell(Bool)`: C without arguments, pairing by key and position | no escape | p17, p17b accepted, Go = interpreter = base; p17c E_TYPE as base |
| 17 | p18, p18c | merge through a lambda parameter after the installation is registered | escape / no escape | both rejected (p18c conservative: annotated C holds Tick) |
| 18 | p19, p19b | a lambda with defer called under fail-free and failing handlers, both orders | escape | both rejected |
| 19 | q02 | callback given a failing literal typed `Handler(nofail Log with Fail(E))` | escape | rejected at the literal ("This handler may fail here") |
| 20 | q03 / q03c | `nofail(k)` in a parameter handler's clause row; clause does `defer tick()` | escape / `7` | rejected / accepted, Go = interpreter |
| 21 | q04 / q04b / q04c | 30 nested forwarding literals under a failing Log; ticking level in the middle; fail-free | escape / escape / `31` | rejected / rejected / accepted, Go = base |
| 22 | q05 | Box handler installed inside a clause, defer, failing Tick | escape | rejected |
| 23 | q06 / q06c | clause handles its fail and rethrows / handles fully | escape / `1` | rejected / accepted, Go = base |
| 24 | q08 | clause calls a generic `call(g)` with a failing lambda | escape | rejected |
| 25 | q09 | mutual recursion `nofail(k)` → `nofail` → `nofail(k)` | escape | rejected at the call (k→N) |
| 26 | q10 | k shared by a frame's own mark, its C and a callback, with C open | escape / `7` | both rejected (rigid C tail ⇒ M frame; conservative) |

Result: 0 accepted escapes. 16 accepted programs, all agreeing with the
interpreter. Conservative rejections, all within the documented
limitations L4, FX016 and the rigid-tail rule: p12, p16b, p18c, q10c, and
handler factories calling callback parameters (v1-v3).

## §6 compatibility: differential against 8fe4218

`node scripts/differential.mjs --corpus all --regenerate --baseline <8fe4218>`
ran, but its first-phase hashes differ for nearly every source:
- harvested: 3,584 of 3,811 differ at parse or resolve;
- matches: 990 of 1,000 differ.

The cause is that Task 2 changed the representation of parsed and resolved
labels (the mark field and handler rows). So I compared final outcomes over
the same corpora and seeds: compile verdict, wire diagnostic (code,
message, span, notes separately) and Go text.

| corpus | sources | same | difference classes |
|---|---|---|---|
| harvested | 3,811 | 3,171 | see below |
| fuzz | 1,029 | 1,029 | none; isName 1,085 probes, 0 differences |
| matches | 1,000 | 1,000 | none |
| mutations | 1,000 | 915 | 81 both rejected with a different text, 4 newly accepted: all contain `nofail` (base: E_SYNTAX) |

Harvested differences:

| class | count | classification |
|---|---|---|
| newly accepted, `nofail` | 408 | new syntax (base E_SYNTAX). With the following 4 mutations, 412 programs: Go byte-identical to the unmarked program on base (412/412) |
| both rejected, text differs, `nofail` | 123 | new syntax (base E_SYNTAX) |
| newly rejected, `defer`, no `nofail` | 87 | 85 FX008 headline (52 witnessed escapes, 34 conservative, 1 interpreter n/a); dup and n1: approved Task 5 flips |
| both rejected, text differs, `defer` | 8 | 1 r4-style side-condition text (approved r4 flip); 5 generated defer programs now rejected first by the FX008 defer headline instead of the base's `Fail(Err) + Fail(Err) …` row text (programs with defer, allowed); 2 F2 orientation swaps (approved p5 family) |
| notes only, `defer` | 3 | programs with defer (allowed) |
| newly accepted, `defer` | 1 | argbind-internal (approved, user 2026-10-11) |
| newly accepted, no `defer` | 1 | rev10/gain1 (approved sound gain) |
| both rejected, text, no `defer` | 5 | r1 (approved p5/r1/r2), cyc2 and cyc3 (approved swaps), sh1 (approved span 192-246), tp1 (approved) |
| notes only, no `defer` | 4 | amb2, around3, p3, ov1ctl: **not approved → I1** |
| Go differs, both accepted | 0 | — |

## Cross-task coherence

- **C without arguments (Task 7) with Lend.assume (Task 8) and ResultClauses
  (Task 9).**
  - `assume` and `partners` pair C's bare labels with the installing row
    by key and position (Lend.purs `paired`), the same rule row
    unification uses. `lend` takes arguments from R.
  - Frames recomputes outer edges from the resolved rows (`partners`), so
    a pairing made in an earlier round cannot go stale.
  - The result C (ResultClauses.ownClauses) is bare and has a fresh tail.
    Rows only grow at tails, so the `matched` shortcut (Settle.purs:197)
    re-pairs whenever C grows.
  - p17-p17c check the arguments case end to end. No inconsistency was
    found, apart from M3a.
- **Per-round sync (Task 7) with installation entries (Task 8) and alias
  classes (T008).**
  - `syncSettling` runs before entries are built each round, and
    installation entries are bare and keep `Fail`.
  - Alias jumps only shorten walks. The 0 Go differences, the 412
    marked/unmarked Go identities and the T008 property test agree.
  - Settling mutates only registry fields that Frames does not read (M2).
- **Strip (Task 2).**
  - `aliases`, `restricted` and `watch` live in `State` and `Subst`, never
    in the checked IR.
  - stripProgram erases marks and `clauses` in function types, bodies
    (`Walk.retype` visits every typed node, including handler clause
    parameters and instantiations), effect and constructor tables.
    TypeInfo holds no types.
  - Go identity across all 412 marked programs confirms that no mark
    reaches Specialize.
- **Dead code:**
  - TailPass installation rule and Settle fallback (M3b);
  - Lend's dropped `Left` (M3a);
  - c→R entries in SettleEntry beside the per-round sync: redundant in
    part but harmless, and the design pins them (fx008-settle-phi);
  - the Console-frame guard (D002, recorded).
- **Plan, spec and code.** The installation rule in spec §2 (assume, frame
  edges, rigid C tail ⇒ M), the result-C rule, L1-L6, FX016 and the `ctl`
  note match the code. Spec says "a Fail label … in a clause row makes m
  M": Frames.aborting does this; frame edges skip Fail labels of C, which
  is consistent because a literal with Fail in a clause row already has M.
- **History.** wip commit 8dd22be stays in the history (merge --no-ff).
  There are no TODO, FIXME or debug leftovers in src.

## Performance

Check phase only; median of 3 after a warm-up. Same machine; load average
3.0-4.1; base measured after the differential finished.

| shape | 8fe4218 | e54d869 |
|---|---|---|
| mixed: 500 installations, 2,000 defers, 20 handler literals chained through clauses, 20 nested forwarding handlers | 7,192 ms | 618 ms |
| mixed ×2 (1,000 / 4,000 / 20) | 30,340 ms | 1,282 ms |
| 8,000 defers | 694 | 1,056 |
| 1,000 installations | 2,118 | 550 |
| 2,000 installations | 9,235 (quadratic, pre-existing) | 1,044 (linear) |
| chain of 1,000 installing functions | 83 | 332 |
| chain of 2,000 | 127 | 709 |
| 200 mark variables ×50 | n/a | 118 |
| handler type nested 120 deep | 0 | 0 |
| 30 literals chained through clauses | 14 | 36 |
| 30 literals through rows | 22 | 57 |
| rigid-tail `let` handler chain 1,000 / 2,000 (TailPass) | 49 / 130 | 331 / 720 |
| handlers nested in clauses, depth 60 | 11 | 30 |
| nested forwarding body + defer, depth 30 / 60 | 10 / 28 | 23 / 68 (same 2.8-3x growth as base) |

- No quadratic path remains among the four P11 shapes, the nesting shapes
  or the TailPass chain.
- Serial bounds: the 16,000-defer settle bound (8 s), the ratio test
  (≤ 3.2) and the nesting bound (2 s) are consistent with these numbers.
  The installation constants are stale (M1).

## Readiness to merge

- Verify at e54d869 (.build/t008-fix-verify.log): exit 0; 1,228/1,228
  parallel, 48/48 serial; style and CST gates pass.
- Regression rows: 30 FX008/T008 rows in scripts/regression-fx008*.mjs, all
  30 with a proof line (66 in total).
- Files at 240 lines or more: src/Domain/Type.purs 250,
  src/Domain/Syntax.purs 248, test/regression.mjs 247,
  scripts/regression.mjs 246, src/Features/Check/Unify.purs 243,
  src/Format/Diagnostic.purs 242, src/Features/Check/Subst.purs 241,
  src/Format/Parse/Grammar.purs 241, test/fx-oracle-parse.mjs 241.
  All are at or under 250 (M6).
- BACKLOG: FX013-FX016, T009, D002 and E013 are accurate; the FX008 status
  is stale (M5).

## Review Focus 1-5: covering tests (all pass in the verify log)

1. test/fx008-hook.test.mjs "three handlers merging in settling agree in
   every order" (all 6 orders built and run, output `0`). Also
   test/fx008-cycle.test.mjs "rows of one cycle settle together in source
   order". It asserts agreement of acceptance and output; marks are not
   involved.
2. test/fx008-defer.test.mjs "a defer inside a clause follows the outer
   frame" (failing outer: rejected); test/fx008-defer-run.test.mjs same
   name (fail-free outer: runs `2`).
3. test/fx008-syntax.test.mjs "nofail prints in label messages, Console
   never".
4. test/fx008-defer-run.test.mjs "a recursive nofail function", "a recursive
   nofail(k) function" (mutual `pass`/`pass2`), "recursive nofail(k)
   functions emit the unmarked Go", "a recursive nofail function emits the
   unmarked Go" (pinned hash).
5. test/fx008-defer-run.test.mjs "a handler in a constructor field keeps its
   mark" (boxPlain under a defer, runs); test/fx008-defer.test.mjs same name
   (boxPlainParameter E_TYPE); "a constructor field handler may handle its
   own failure or crash".

## Decisions for the user

1. I1: restore the base notes for amb2, around3, p3 and ov1ctl
   (recommended, §6), or accept the new notes with a handler-literal
   wording and pin them.
2. M3b: delete the unreachable TailPass installation rule and the Settle
   fallback (keeping the invariants as comments), or keep them as guards
   with constructed-state tests.
3. M4: add `nofail(k)` generator shapes, or register this review's p01,
   p02, p11 and q03 as fixed tests.
4. Accept the linear constant-factor costs: chain of installing functions
   about 4x the base, rigid-tail handler chain about 5x. Installations and
   the mixed program are 4-11x faster than the base.
5. Merge as planned (`git merge --no-ff fx008-impl`, keeping wip commit
   8dd22be in history) after I1 and the Minor fixes chosen.

## Program sources

v1-v3 (observation): `fn mk(g: Unit -> Unit with [nofail] Tick [+ ...e]):
Handler(nofail Log with [nofail] Tick [+ ...e]) with pure = handler Log
{ log(n) => g(()) };` all rejected "This handler may fail here: its clause
for log may perform any effect of ...". q04 is 30 nested
`with handler Log { log(n) => log(n + 1) } {` around `defer log(1); ()`
inside `handle with handler Log { log(n) => fail(E) } { … }`. Control
variants replace the failing clause with `print`. Common header omitted.

p01-app-failing-k.wxw
```
fn app(f: Unit -> Unit with nofail(k) Log + Fail(E) + ...e): Unit with ...e = handle with handler Log { log(n) => fail(E) } { f(()) } { fail(e: E) => () };
fn main(): Unit with Console = app(fn(u: Unit) => { defer log(1); () });
```
p02-two-callbacks.wxw
```
fn both(f: Unit -> Unit with nofail(k) Log, g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log = { f(()); g(()) };
fn main(): Unit with Console = handle with handler Log { log(n) => fail(E) } { both(fn(u: Unit) => { defer log(1); () }, fn(u: Unit) => log(2)) } { fail(e: E) => print(9) };
```
p03-rec-nofail-forward.wxw
```
fn loop(n: Int): Unit with nofail Log = if n == 0 then { defer log(0); () } else with handler Log { log(m) => log(m + 10) } { loop(n + -1) };
fn main(): Unit with Console = handle with handler Log { log(n) => fail(E) } { loop(3) } { fail(e: E) => print(9) };
```
p04-pick-k.wxw
```
fn pick(h: Handler(nofail(k) Log with Fail(E))): Handler(nofail(k) Log with Fail(E)) with pure = h;
fn main(): Unit with Console = handle { with pick(handler Log { log(n) => fail(E) }) { defer log(1); () } } { fail(e: E) => print(9) };
```
p04b-pick-k-open.wxw
```
fn pick(h: Handler(nofail(k) Log with ...e)): Handler(nofail(k) Log with ...e) with pure = h;
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { with pick(handler Log { log(n) => tick() }) { defer log(1); () } } { fail(e: E) => print(9) };
```
p05-clause-forward-defer.wxw
```
fn main(): Unit with Console = handle with handler Log { log(n) => fail(E) } { with handler Log { log(n) => with handler Log { log(m) => log(m) } { defer log(n); () } } { log(1) } } { fail(e: E) => print(9) };
```
p06-box-generic.wxw
```
type Box(a) = Box(a);
fn main(): Unit with Console = handle { let b = Box(handler Log { log(n) => fail(E) }); match b { Box(h) => with h { defer log(1); () } } } { fail(e: E) => print(9) };
```
p07-closure-literal.wxw
```
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { let mk = fn(u: Unit) => handler Log { log(n) => tick() }; with mk(()) { defer log(1); () } } { fail(e: E) => print(9) };
```
p08-one-value-many-installs.wxw
```
fn main(): Unit with Console = handle { let h = handler Log { log(n) => tick() };
  with handler Tick { tick() => print(5) } { with h { defer log(1); () }; with h { log(2) }; with h { log(3) }; with h { log(4) } };
  with handler Tick { tick() => print(6) } { with h { log(5) }; with h { log(6) } };
  with handler Tick { tick() => fail(E) } { with h { log(7) }; with h { defer log(8); () } } } { fail(e: E) => print(9) };
```
p10-clause-calls-nofail.wxw
```
fn work(): Unit with nofail Log = { defer log(1); () };
fn main(): Unit with Console = handle with handler Log { log(n) => fail(E) } { with handler Tick { tick() => work() } { tick() } } { fail(e: E) => print(9) };
```
p11-k-returned.wxw
```
fn id2(f: Unit -> Unit with nofail(k) Log + ...e): Unit -> Unit with nofail(k) Log + ...e = f;
fn main(): Unit with Console = handle { let g = id2(fn(u: Unit) => { defer log(1); () }); with handler Log { log(n) => print(n) } { g(()) }; with handler Log { log(n) => fail(E) } { g(()) } } { fail(e: E) => print(9) };
```
p12b-result-merge-literal-false.wxw
```
fn mk(): Handler(nofail Log with ...e) with pure = handler Log { log(n) => () };
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { let h = if false then mk() else handler Log { log(n) => tick() }; with h { defer log(1); () } } { fail(e: E) => print(9) };
```
p13-nested-clause-chain.wxw
```
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { with handler Log { log(a) => with handler Log { log(b) => with handler Log { log(c) => tick() } { defer log(b); () } } { log(a) } } { log(1) } } { fail(e: E) => print(9) };
```
p14-row-param-box.wxw
```
type HB(...e) = HB(Handler(nofail Log with ...e));
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { match HB(handler Log { log(n) => tick() }) { HB(h) => with h { defer log(1); () } } } { fail(e: E) => print(9) };
```
p15-clause-defer-through-param.wxw
```
fn inst(h: Handler(nofail Log with nofail Tick + ...e)): Unit with nofail Tick + ...e = with h { log(1) };
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { inst(handler Log { log(n) => { defer tick(); () } }) } { fail(e: E) => print(9) };
```
p16-three-merge.wxw
```
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { let a = handler Log { log(n) => () }; let b = handler Log { log(n) => print(n) }; let c = handler Log { log(n) => tick() }; let h = if true then a else if true then b else c; with h { defer log(1); () } } { fail(e: E) => print(9) };
```
p17-cell-args.wxw
```
effect Cell(a) { fn get(): a; };
fn main(): Unit with Console = handle with handler Cell(Int) { get() => fail(E) } { with handler Cell(Bool) { get() => true } { with handler Log { log(n) => { let x = get(); () } } { defer log(1); () } } } { fail(e: E) => print(9) };
```
p18-late-merge-param.wxw
```
fn main(): Unit with Console = handle { let a = handler Log { log(n) => () }; let c = handler Log { log(n) => tick() }; let r = fn(x: Handler(Log with Tick)) => with handler Tick { tick() => fail(E) } { with x { defer log(1); () } }; r(a); r(c) } { fail(e: E) => print(9) };
```
p19b-lambda-defer-reversed.wxw
```
fn main(): Unit with Console = handle { let k = fn(u: Unit) => { defer log(1); () }; with handler Log { log(n) => fail(E) } { k(()) }; with handler Log { log(n) => print(n) } { k(()) } } { fail(e: E) => print(9) };
```
q02-callback-takes-handler.wxw
```
fn useh(f: Handler(nofail Log with Fail(E)) -> Unit with Fail(E)): Unit with Fail(E) = f(handler Log { log(n) => fail(E) });
fn main(): Unit with Console = handle useh(fn(h: Handler(nofail Log with Fail(E))) => with h { defer log(1); () }) { fail(e: E) => print(9) };
```
q03-k-in-clause-row.wxw
```
fn inst(h: Handler(nofail Log with nofail(k) Tick + ...e)): Unit with nofail(k) Tick + ...e = with h { log(1) };
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { inst(handler Log { log(n) => { defer tick(); () } }) } { fail(e: E) => print(9) };
```
q05-box-clause-install-defer.wxw
```
type Box(a) = Box(a);
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { let b = Box(handler Log { log(n) => tick() }); with handler Tick { tick() => match b { Box(h) => with h { defer log(1); () } } } { tick() } } { fail(e: E) => print(9) };
```
q06-handled-inside-rethrow.wxw
```
fn main(): Unit with Console = handle with handler Log { log(n) => handle fail(E) { fail(e: E) => fail(E) } } { defer log(1); () } { fail(e: E) => print(9) };
```
q08-call-generic-fail.wxw
```
fn call(g: Unit -> Unit with ...e): Unit with ...e = g(());
fn main(): Unit with Console = handle with handler Log { log(n) => call(fn(u: Unit) => fail(E)) } { defer log(1); () } { fail(e: E) => print(9) };
```
q09-mutual-k.wxw
```
fn a(n: Int): Unit with nofail(k) Log = if n == 0 then log(0) else b(n + -1);
fn b(n: Int): Unit with nofail Log = if n == 0 then { defer log(5); () } else a(n);
fn main(): Unit with Console = handle with handler Log { log(n) => fail(E) } { a(3) } { fail(e: E) => print(9) };
```
q10-k-shared-frame.wxw
```
fn inst(h: Handler(nofail(k) Log with nofail(k) Tick + ...e), body: Unit -> Unit with nofail(k) Log + nofail(k) Tick + ...e): Unit with nofail(k) Tick + ...e = with h { body(()) };
fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) } { inst(handler Log { log(n) => tick() }, fn(u: Unit) => { defer log(1); () }) } { fail(e: E) => print(9) };
```
