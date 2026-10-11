# FX008 Task 7: diagnosis of the probe-gate stop

Subject: wip 8dd22be on c8503f9 (worktree waxwing-fx008-impl, branch
fx008-impl). Read: plan Task 7, Global Constraints, P13/P14; design §3.4
(hook, F1′, F2, T, S) and §3.5; the design pre-review (A1-A7); the ledger
tail; the probe table and gate; BACKLOG FX010. Experiments ran on one
isolated copy (/private/tmp/claude-501/fx008-diag, now deleted). Nothing in
the worktree was changed or committed. [ran] = executed; [read] = from
source.

## Summary

- **The report has one error.** On 8dd22be, tp1 is rejected at
  **148-335** (f's body), not 204-219 [ran: gate and hook test]. The
  rejection comes from the `sync` that Settle runs at the start of each
  round. I replaced that sync's span with a sentinel, and tp1's span
  changed to the sentinel [ran]. The tail pass never runs on tp1.
  Consequences: the hook test `a clause tail that turns rigid in settling
  is rejected by the tail pass` fails on the wip [ran], and the
  `fx008-tail-pass` row cannot be proved, because the mutant still
  rejects. The 204-219 figure matches a build without the Settle sync
  [ran], so it was probably observed before the departure was added.
- **(a) argbind-internal: accepting it is sound.**
  - Nothing runs at run time: `z` is never called. The Go program prints
    nothing and exits 0, which matches the reference interpreter [ran].
  - No deferred cleanup can reach `h`'s failing clause. `h` is installed
    only around `log(1)`, and the deferred row holds only `Cell(…)`.
  - The old E_INTERNAL was an infinite-row (occurs) failure. The reverse
    link R ≡ c, which the hook removes, created the cycle. FX010's defect
    is still present. A 5-line program without handlers still gives
    E_INTERNAL on both today's build and the wip [ran]. So FX008 removes
    this reproducer but does not fix FX010.
  - Proposed entry: `ok('', 'b524e7d7…c8c1')`. **The user decides**,
    because it is a soundness change: an unlisted second sound gain.
- **(c) The Settle sync fills a real gap in the plan; it is not a
  workaround.**
  - S consumes `labels(c) + φ_t` and so assumes F1′ class upkeep: an
    extension starts a new class (N1), and a merge unifies the φ's. The
    plan's Settle never runs F1′, and the pre-review (A2) assumed it
    would not. Rebuilding the entries each round does not help without
    it [ran].
  - Two parts of the sync are wrong as committed:
    - It runs F1′'s rigid branch (φ := ϱ) inside the loop. §3.5 puts
      that work in the tail pass, after the loop. This is what moves
      tp1.
    - It reports errors at the function body. P13's clause-entry rule
      gives the handler literal.
  - A settling mode that skips only the rigid branch restores tp1 to
    204-219, makes the tail-pass mutant accept tp1, and leaves every
    other gate result as on the wip [ran].
  - **Mechanism: the controller's call.** Recording F1′-in-settling in
    the plan or design is a plan correction for the user to note.
- **(d) ec1 cannot flip. The plan's prediction is wrong.**
  - Review I7 assumed the deferred row is consumed only in loop step (d).
    In fact `checkDefer` consumes it at check time (Defer.purs:63). The
    `Cell` pair binds g's row during checking, and the sync after `()`
    (274-276) pushes `Fail(E)` into R [ran: trace]. The `with` then
    carries it into main, and Entry.check reports at the first hop that
    has an origin: the `with` (284-301) [ran: trace].
  - Healthy and mutant builds both reject ec1, so ec1 proves nothing.
  - A corrected witness, ec2, delays the label with argbind's `k`/`w`
    trick. ec2 is rejected by the healthy build and **accepted by the
    exit-count mutant** [ran]. Its outcome is the same on today's build
    and the wip: `Unhandled Fail(E) in main` at 90-380 [ran].
  - **The user decides**, because the probe table and the plan's
    prediction change.
- **(b) The cyc2/cyc3 swap is a pure change of orientation.** The label
  lists are the same, the spans are the same, and neither version has
  related notes [ran]. Both sides follow the same convention, consumed
  row first, then the row it flows into. The reported edge is now the
  clause→R edge. That matches the predicted p5/r1/r2 texts.
  - sh1's **text is unchanged**, despite what the report says. Only its
    span moved, to the handler literal (192-246). That is the only span
    P13 allows under the hook. The first `sync` that sees both clauses is
    the one after the handler node.
  - **The user decides**, because texts and spans change. I recommend
    accepting both.

## (a) argbind-internal: from E_INTERNAL to accepted

**Finding: accepting it is sound.** It is a second sound gain, of the same
kind as gain1: the reverse link was removed.

Evidence:
- **What the program does** [read, ran]:
  - `main` defines `z` and returns `()`. `z` is never called, so nothing
    runs.
  - Reference interpreter (test/fx-oracle.mjs `outcome`): `{stdout: "",
    stderr: "", status: 0}` [ran].
  - Wip Go, sha256 `b524e7d7ebab4c06d2e9e54a13a8b127587c2d982a465d991ed76a5d82ace8c1`,
    run with `go run`: empty stdout, exit 0 [ran].
- **Can any deferred cleanup reach a failing clause?** [read]
  - The only `defer` is `defer k(())`. Its row d is shared with k's row,
    and through `w`'s call `k(())` with w's row. So d holds only `Cell(Int
    -> Unit with Fail(E) + …)`. `Fail` sits inside the label's argument;
    it is not a label of d.
  - `h` (the `Log` handler whose clause calls `f`, which may now fail) is
    installed only around `log(1)`. d contains no `Log`, and the cleanup
    runs outside that `with`.
  - So the cleanup cannot end in `h`'s abort. `Fail(E)` reaches only z's
    own inferred row, and nothing calls `z`.
- **What FX010's internal error actually was** [ran, read]:
  - On today's build, R ≡ c, and the `with` ties R to z's row. f's row
    is c's tail, so f's row ends in z's row.
  - z's row contains `Cell(type of f)`. Settling step (d) pairs it with
    the deferral's `Cell(type of the failing lambda)`, so f's type must
    contain itself. That occurs-check failure surfaces as E_INTERNAL
    `Effect row consumption failed`.
  - Under the hook, c only flows into R. f's row is no longer z's row, so
    the cycle does not exist and the program types.
  - Without the Settle sync, the wip rejects this program with a
    shared-tail error at 156-186 [ran]. That is the static-φ defect of
    question (c), not a typing truth.
- **FX010 is not fixed** [ran]. This program gives E_INTERNAL `Effect row
  consumption failed` at 102-106 on both today's build (waxwing, fx008)
  and the wip:

  ```
  effect Cell(a) { fn put(x: a): Unit; };
  fn main(): Unit with Console = {
    let z = fn(f) => { put(f); f(1) };
    ()
  };
  ```

  A variant that keeps argbind's `defer`/`w` and ends `z` with `f(1)`
  gives the same E_INTERNAL at 236-240 on both builds.
- An attempt to make `z` reachable (adding Cell and Fail handlers in
  `main`) hit unrelated rejections on the wip, from duplicate `Cell`
  labels. The reference interpreter prints `7\n9\n` for it. That proves
  nothing either way, so it is not used as evidence.

**Recommended ruling:**
- Flip argbind-internal in Task 7 as a listed sound gain:

  ```js
  probe('argbind-internal',
    no('E_INTERNAL', 'Effect row consumption failed', 318, 335),
    {
      fx008: ok('', 'b524e7d7ebab4c06d2e9e54a13a8b127587c2d982a465d991ed76a5d82ace8c1'),
      task: 7,
      reason: 'Sound gain: the hook removes R ≡ c, so f\'s row no longer ' +
        'ends in z\'s row and the occurs failure (FX010) cannot arise; no ' +
        'defer reaches h. Go and oracle print nothing, exit 0.',
      slow: true
    }),
  ```

  This uses the same `ok(stdout, go)` constructor and the sha256 of the
  emitted Go that `checkGo` checks. The gate's Go batch supplies stdout
  `''`.
- Update the plan's §6 or Task 7 list ("Sound gain: gain1") to name
  argbind-internal.
- Keep FX010 open. Replace its reproducer with the 5-line program above,
  and record that argbind-internal no longer reproduces it once FX008
  Task 7 lands.

**User decision required: yes.** This is an unlisted outcome change and a
soundness claim.

## (c) Sync at the start of each Settle round

**Finding:**
- **The plan is incomplete here. This is not an S bug and not a
  workaround.**
  - Correction S consumes `labels(c) + φ_t`, where t is c's *current*
    class.
  - Class identity (N1) says an extension starts a new class with a
    fresh φ, and merges unify the φ's.
  - Bindings made in settling (a late label, a retried `fail`) extend or
    merge clause tails. Without F1′ in settling, the group and its φ
    never change. A grown c is then consumed as `[L, old | φ]` into
    `R = [old | φ]`. That is a shared-tail error, the implementer's
    "same φ on both sides".
  - The design's S paragraph ("links the R's exactly as one made during
    checking") only works if classes are kept up to date. Neither the
    design nor the plan says who does that in settling. A2's reasoning
    explicitly assumed that "F1′ does not run in settling".
- **It is not "entries built once".** c8503f9 built the entries once
  (`built`), and the wip rebuilds them each round, which is correct for
  §3.5 (b). With the rebuild kept and the sync removed, argbind, f1 and
  set1 still regress [ran]:
  - argbind: shared-tail error at 156-186;
  - f1: shared-tail error;
  - set1: `Ambiguous type Opt(_) in comparison`.
- **φ is read correctly after a merge**: SettleEntry reads
  `groups[e.group].remainder`, and `consume` resolves it.

**What the committed version gets wrong:**
1. **It binds φ := ϱ inside the loop.** The sync runs F1′'s rigid branch,
   `ended` (Sync.purs:118). This contradicts §3.5: the tail pass "runs
   after the loop, never inside it, so acceptance does not depend on
   order". It is why tp1 is rejected at the sync's span instead of by the
   tail pass.
   - [ran] On the wip, tp1 is rejected at 148-335. With the sync's span
     replaced by a sentinel, tp1 is rejected at the sentinel.
   - [ran] In a variant with a settling mode that skips only the rigid
     branch:
     - tp1 is rejected at 204-219 with `f performs Console, which its
       signature does not allow`, from the tail pass, as planned;
     - with `tailPass` mutated to return its state, tp1 is accepted, so
       the `fx008-tail-pass` row becomes provable;
     - the gate fails on exactly the same 9 probes as the wip, with the
       same texts, except tp1, which now has its planned outcome;
     - the hook test passes 20 of 21 (only ec1 fails, see (d)).
   - Skipping the rigid branch is sound. c's rigid tail cannot grow. S
     keeps consuming `labels(c) + φ` into R, and the tail pass then binds
     R's (and C's) unbound tail to ϱ, or reports the missing capability
     at the clause (A2).
   - The closed branch can stay. Closing φ when the class closes is
     compatible either way (N4), and the variant kept it.
2. **The span.** The committed version passes `Checked.spanOf body`
   (Settle.purs:55). P13 does not list "function body" for anything.
   - Errors from sync inside settling are per clause entry: a merge or
     T consumption, or an F2 cycle at the earliest row. They should
     report at P13's clause-entry span, the handler literal
     (`ClauseEntry.handler`). That is the same origin S's c→R entry
     already uses (SettleEntry.purs:73).
   - No probe currently raises an error from the settling sync once the
     rigid branch is skipped. I checked every probe with a sentinel span
     [ran]. So this fix moves no gate entry.
   - Note that the trail for a label that reaches `main` through such a
     push has no recorded origin. ec2 falls back to the declaration span
     (see (d)). This is today's provenance behaviour, not a regression.
3. F2 and T inside settling duplicate the loop's (c) and (d). That is
   harmless: T is idempotent with (d)'s c→R entry, and F2 only reports
   earlier at the same per-entry span once fix 2 is in.

**T003 linearity** [read, ran]:
- A sync with nothing dirty or pending costs O(1) (`takeDirty` is
  empty), so declarations without feed edges still settle in one round.
- Each later round's sync costs in proportion to the tails that (a) and
  (d) dirtied.
- The exit test compares counts from the round's start state, so a
  change made by the sync can add at most the one round the change
  requires.
- The serial bounds pass on the wip [ran]:
  - fx008-settle.serial (16,000 defers);
  - fx008-nesting.serial (5/5).
- The plan's Step 1 test "nested handler literals stay linear" (about 30
  literals, 2000 ms) is **missing** from test/fx008-hook.test.mjs and
  must be added.

**Review Focus 1, order independence** [ran, read]:
- `three handlers merging in settling agree in every order` passes on
  both the wip and the variant.
- The sync orders affected clauses by handler position, then id (P14).
- A1's `groupAt` has no signature filter (Groups.purs:67-71).
- Skipping the rigid branch in settling also removes the in-loop ϱ
  binding, which was the one source of order dependence in §3.5.

**The correct span for sync errors in settling** (P13): the clause
entry's handler literal (`ClauseEntry.handler`), not the body. Add it to
P13 as a clarification: "settling's F1′/F2/T consumptions → the clause
entry's handler literal".

**Recommended ruling:**
- Accept F1′ in settling as the plan's missing step.
- Require the two corrections above.
- Record a plan/design note (S needs F1′'s class upkeep in settling;
  φ := ϱ stays with the tail pass).

**User decision required:** no for the mechanism (controller). The plan
and design note is for the user's information.

## (d) Why ec1 does not flip

**Finding: the plan's prediction is wrong. ec1's `Fail(E)` is not late.**

Trace [ran: logged in the copy]:
1. `checkDefer` consumes the deferred row's labels into the enclosing row
   **at check time** (src/Features/Check/Defer.purs:63, `consumeLabels`
   with `crossing`). So `put(fn(n: Int) => fail(E))`'s `Cell(…)` pairs
   with z's `Cell(type of g)` during checking. That argument-level
   unification binds g's row, which is clause c's tail, to `Fail(E) + …`.
2. The defer statement has no sync of its own. The next one, after `()`
   at 274-276, finds clause 5 dirty and pushes `[Fail(E) | φ′]` into R.
   The log shows `SYNC 161-191 [5]` (the handler node), then `SYNC
   274-276 [5]`, then nothing in settling.
3. `with h { log(1) }` consumes R as it stands into main's row (origin
   the `with`, via `Installation Log`, Handler.purs:71).
4. Entry.check (Entry.purs:45-60) reports at the first hop that has an
   origin. The hops are occurrence 0 (284-301, the `with`), then
   occurrence 2 (274-276), then the written row. So the error is
   `Unhandled Fail(E) in main` at 284-301, the same as today.

Against the plan's conditions:
- **P14 order:** satisfied but irrelevant. The clause entry (161) does
  precede the deferral (239), but no label arrives in settling.
- **Exit count:** a mutant that counts target labels instead of own
  labels also rejects ec1 identically [ran]. ec1 cannot prove
  `fx008-exit-count`, which is the plan's own "both builds reject, stop
  and report" case.
- **Review I7's mechanism** ("the deferred row … is consumed only in loop
  step (d)") is false for this program.

There is no implementation defect for ec1. The witness's premise is
wrong.

**Corrected witness, ec2** [ran]. ec2 makes the deferred label arrive
after `checkDefer`: the deferred row is k's row, which later gains
`Cell(…)` through `w`'s call, as in argbind.

```
type E = E;
effect Log { fn log(n: Int): Unit; };
effect Cell(a) { fn put(x: a): Unit; };
fn main(): Unit with Console = {
  let g = fn(n: Int) => ();
  let h = handler Log { log(n) => g(n) };
  let z = fn(u: Unit) => {
    put(g);
    let k = fn(v: Unit) => ();
    defer k(());
    let w = fn(v: Unit) => { put(fn(n: Int) => fail(E)); k(()) };
    ()
  };
  with h { log(1) }
};
```

Results [ran]:
- **Today (waxwing, fx008), the wip, and the variant from (c):** E_EFFECT
  `Unhandled Fail(E) in main` at **90-380** (the declaration span; no hop
  on the trail has an origin, so Entry.check falls back to it).
- **The trace shows the label is late:** the only sync that sees clause 5
  after the handler node is the settling one.
- **The variant with the exit-count mutant** (count `entry.target`
  instead of `entry.own`, Settle.purs:91): **accepted**. So ec2 proves
  the row.
- **Reference interpreter:** stdout `""`, status 0. The rejection is the
  typing-level kind I7 described.

**Recommended ruling (user):**
- Keep ec1 at today's outcome and remove its Task 7 flip. It stays in the
  gate as a check-time-arrival control.
- Add ec2 (`witness/ec2`) to the gate with today = fx008 = `no('E_EFFECT',
  'Unhandled Fail(E) in main', 90, 380)`.
- Re-target `fx008-exit-count` to ec2: healthy = rejected E_EFFECT;
  mutant message `/exit test: accepted/`.
- Correct I7's narrative in the plan.

**User decision required: yes** (the probe table changes and a plan
prediction is withdrawn).

## (b) cyc2, cyc3, sh1 and the F2 orientation

**Findings** [ran; today = waxwing (fx008) build, wip = 8dd22be]:

| probe | today | wip | span |
|---|---|---|---|
| cyc2 | `... and Tick + ... cannot be made equal: both end in ...` | `Tick + ... and ... cannot be made equal: both end in ...` | 174-179 both |
| cyc3 | `... and Log + Tick + ...` | `Log + Tick + ... and ...` | 338-344 both |
| sh1 | `... and Tick + ...` | `... and Tick + ...` (**identical**) | 237-242 → **192-246** |
| p5 | `Console + ... and Log + Console + ...` | `Console + Log + ... and Console + ...` (predicted) | 163-169 both |

None of these diagnostics has related notes, today or on the wip.

**Orientation:**
- Today's message comes from unification, `RowFinish.shared`, with the
  left side being the consumed stage. F2 and the loop's (c) print
  `RowSharedTail own target` (Sync.purs:192, Settle.purs:119). Both use
  the same convention: the row that flows, then the row it flows into.
- What changed is which edge of the same positive cycle gets reported.
  Today it is callee row → clause row, under R ≡ c. Under the hook it is
  the clause row c → R.
- The label lists on the two sides are the same multisets, only
  exchanged. No information is lost, and the text agrees with the
  p5/r1/r2 predictions, which also print the clause row first.
- The controller's proposal is consistent: keep p5/r1/r2 as predicted and
  pin cyc2/cyc3 swapped.

**sh1's span:**
- 192-246 is `handler Two { a() => k(()), b() => with h0 { k(()) } }`.
- Clause rows are registered after their bodies (Clauses.purs:128-131).
  So no sync inside clause b can see the a/b cycle. The first sync that
  holds both clauses is the one after the handler-literal node, and P13
  says that sync reports at that node's span. With the settling sync's
  span replaced by a sentinel, sh1 still reports at 192-246, so the error
  comes from checking, not settling.
- Today's 237-242 (`k(())` inside b) came from unifying against the
  shared R ≡ c, which the hook removes. 192-246 is therefore the only
  span P13 allows.
- The report's claim that sh1's sides are swapped does not show in the
  text, which is identical.

**Recommended ruling (user):**
- Pin cyc2 and cyc3 with their swapped texts.
- Pin sh1 with the same text at 192-246.
- List all three under Task 7 with the reason "F2 reports the c→R edge
  of the same cycle, at the sync's node (P13)".

**User decision required: yes** (texts and a span move).

## Instructions for the implementer (forwardable verbatim)

Do these on fx008-impl from wip 8dd22be. Do not touch the probe table
until the user has ruled on (a), (b) and (d); the controller will forward
the rulings.

1. **Settling mode for `sync`, rigid branch** (Sync.purs, Settle.purs):
   - Add a settling variant (for example `syncSettling`, or a flag
     threaded through `round` → `filing` → `filed`).
   - In settling mode, `filed`'s rigid case (Sync.purs:118, `Just rigid →
     ended …`) does nothing beyond unfiling (`Right loose`). φ := ϱ stays
     with the tail pass (§3.5: after the loop, never inside it).
   - Keep the closed branch and the unbound (grow/merge) branch
     unchanged.
   - Settle.purs:55 calls the settling variant.
   - Expected result: tp1 is rejected at 204-219 with `f performs
     Console, which its signature does not allow`, and the hook test for
     tp1 passes. Under the `fx008-tail-pass` mutant, tp1 is accepted.
2. **Span of the settling sync** (P13):
   - In settling mode, every consumption and F2 report for a clause uses
     that clause entry's origin: `{ span: entry.handler, consumed:
     Application, via: Nothing }`, the same as SettleEntry.purs:73.
   - Pass an origin function, `ClauseEntry → Origin`, instead of the
     single body span. For F2 use the reported row's entry, so
     `cycleTest` must map the cycle index back to its entry.
   - Checking-time `sync` keeps its node span.
   - Expected: no gate entry moves, because no probe currently raises an
     error from the settling sync.
3. **A5:** do it as the pre-review specified (`Require.require` takes a
   `CheckEnv`, and its failure branch computes the hint from a synced
   state). If a caller lacks a `CheckEnv`, stop and report.
4. **Missing Step 1 test:** add `nested handler literals stay linear` to
   test/fx008-hook.test.mjs, and its timing half to
   test/fx008-nesting.serial.test.mjs.
5. **Exact texts:** the test `rejections without defer keep their codes
   under the hook` must check the exact texts and spans the plan names,
   not only that a diagnostic exists. Compare with the probe table
   entries.
6. **After the user's rulings:**
   - (a) If accepted: flip argbind-internal to `ok('',
     'b524e7d7ebab4c06d2e9e54a13a8b127587c2d982a465d991ed76a5d82ace8c1')`,
     task 7, slow.
   - (b) Pin cyc2/cyc3 with the swapped texts and sh1 at 192-246 (same
     text). Pin p5/r1/r2 with the observed text `Console + Log + ... and
     Console + ... cannot be made equal: both end in ...`.
   - (d) Revert ec1's flip (fx008 = today). Add `witness/ec2` (text
     above) with today = fx008 = `no('E_EFFECT', 'Unhandled Fail(E) in
     main', 90, 380)`, and point `fx008-exit-count` at ec2 (healthy:
     rejected E_EFFECT; mutant `/exit test: accepted/`). Change the hook
     test for ec1 accordingly.
   - Pin tp1 at 204-219 with the observed text.
   - Update the table hash.
7. Then follow Steps 4-5 as planned: 10 rows, each proved with its
   mutant, and verify → 0. Report the observed texts before pinning,
   then commit per Step 6.
