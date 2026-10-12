# FX008 Task 9 review: the mark check (ff0c6d1..1649218)

**Verdict: not ready. One Critical soundness hole (Deviation 3), with a
fix prototyped and checked against the suite. Everything else is sound or
Minor.**

Reviewer: Opus, 2026-10-11. Worktree /Users/ethan/Desktop/waxwing-fx008-impl
at 1649218, built `output/` used as is. `[ran]` means I compiled the
program with that build, ran the emitted Go, and compared it with the
reference interpreter (`test/fx-oracle.mjs` `outcome`, as
test/fx-oracle.test.mjs drives it). I made one isolated copy
(`git archive HEAD` + `.spago`, `purs compile` from scratch) under
/private/tmp/claude-501/ for experiments. It is deleted. There are no
tracked edits and no commits.

## Critical

### C1. A handler type's C, copied at install, misses clause effects that reach R's tail later: cleanups end in typed aborts [ran]

**Where.** src/Features/Check/Install.purs:98-112 (`clausesOf`). A written
handler type has `clauses = Nothing`. At `with`, C is taken as a copy of
R's labels, and an unbound tail meta is closed. When that meta is bound
after the install, the clauses' real effects never reach C. So no
`FrameOuter` or `FrameRigid` edge is made, the frame can be N, and a
`defer` under it is accepted.

**How it arises.** The meta comes from instantiating a generic signature
whose handler-type tail variable also occurs in a parameter (or in the own
row's label arguments). C ≡ R in that signature (P2), so a caller's
value with a real C (a local annotation, or a literal) is unified with
that meta. When the value only arrives later, for example as a lambda's
argument, the copy has already closed the tail.

**Counterexamples.** All are accepted by 1649218. Go exits 1 with
`fail(E): E`, and the interpreter reports `oracle error: typed abort
escaped cleanup`. Prelude for each:
`type E = E; effect Log { fn log(n: Int): Unit; }; effect Tick { fn tick(): Unit; };`

- **a1.** Identity through a lambda.
  ```
  fn id(h: Handler(nofail Log with ...e)): Handler(nofail Log with ...e) with pure = h;
  fn main(): Unit with Console = handle {
    let run = fn(x: Handler(nofail Log)) => with id(x) { defer log(1); () };
    with handler Tick { tick() => fail(E) } { run(handler Log { log(n) => tick() }) }
  } { fail(error: E) => print(9) };
  ```
  Control: the same program with `tick() => print(5)` prints `5` in Go and
  in the interpreter.
- **a4.** a1 with an unannotated parameter, `fn(x) => with id(x) {…}`.
- **a6.** A forwarding chain. The inner literal's `tick()` reaches a Tick
  handler `tick() => log(5)`, which reaches a failing Log handler.
- **a8.** The handler returned inside a closure:
  `fn later(h: Handler(nofail Log with ...e)): Unit -> Handler(nofail Log with ...e) with pure = fn(u: Unit) => h;`
  then `with later(x)(()) {…}`.
- **a9.** The handler returned inside a data value:
  `type Box(a) = Box(a); fn boxed(h: …): Box(Handler(nofail Log with ...e)) with pure = Box(h);`
  then `match boxed(x) { Box(h) => with h {…} }`.
- **a10.** The implementer's own concern: a missed `FrameRigid`. The defer
  is accepted inside a generic function, because the tail becomes rigid
  `e` only after the install.
  ```
  fn g(x: Handler(nofail Log with ...e)): Unit with ...e = {
    let run = fn(y: Handler(nofail Log)) => with id(y) { defer log(1); () }; run(x) };
  fn main(): Unit with Console = handle with handler Tick { tick() => fail(E) }
    { g(handler Log { log(n) => tick() }) } { fail(error: E) => print(9) };
  ```
  Control: `with x {…}` directly in g is rejected, correctly.

**Lazy resolution does not fix it [ran].** Reading C lazily from the
resolved R, or keeping C linked to R's tail, is the same thing:
`with` binds R's tail to the installing row, so C then contains the whole
installing context. I built exactly that variant (keep `found` in
`clausesOf`). It rejects a1, a4 and a6, but it also rejects the plan's
acceptance program `aroundBoth`:
`defer must not fail …` at `body(())`, by a `FrameRigid e` edge. That is
the spurious M frame the implementer avoided. The tail of a *result* type
cannot be told apart at install time. The decision has to be made at the
declaration's use.

**Fix (forward verbatim).**

> Make C explicit at a function's use instead of copying it at `with`.
>
> (1) In `Use.functionUse`, before `declarationUse`, give a top-level
> result `THandler` whose `clauses` is `Nothing` its own clause row:
> `Just (Row (map bare R.labels) tail)`. Keep `tail` as R's tail variable
> when that variable occurs anywhere in the parameter types or in the own
> row (label arguments included). Otherwise make it closed.
> Parametricity makes the closing sound. Inside the callee, a clause can
> reach a variable that occurs nowhere but the result only through a rigid
> tail, which makes its own mark M (OwnAbort), so `own ⊑ frame` already
> makes the frame M.
>
> (2) In `Install.clausesOf`, the fallback for the remaining `Nothing`
> types (constructor fields, operation results, nested result types such
> as `Unit -> Handler(…)` or `Box(Handler(…))`) keeps R's tail as it is,
> unbound metas included. That is sound and conservative: C then also
> covers the installing context. Rewrite its comment.
>
> (3) Add tests seen failing first: a1, a4, a6, a8, a9 and a10 rejected
> with the Log defer message at the `defer`, and the a1 control accepted
> (`5`). Add a regression row `fx008-result-clauses`: the mutant restores
> today's `found >>= signatureVariable`, and the probe a1 must give
> `/result clauses: accepted/`.
>
> (4) Record a plan deviation under Task 9. It refines P2 and design §3.4:
> "a written type in a signature gets its own C", for result types at use.
> List the limitation beside L1, L4 and P5: a handler passed through a
> generic function and installed from its result gives an M frame when
> the context's rest is M or rigid.

**Prototype evidence [ran].** I prototyped (1) and (2) in the copy: a
45-line module `ResultClauses.ownClauses`, called from `functionUse`, plus
the `clausesOf` fallback. With the bare-label detail not done (C kept
label arguments):
- a1, a4, a6, a8, a9, a10 and a3c (`unbox(HBox(x))`) are rejected;
- every plan acceptance program is still accepted with the same output:
  aroundBoth, q1Nofail, p1, p2, copies, extb, annotb, merge1, annotc,
  count, pass, the box programs, clauseDefer and forwardingFailFree;
- every non-serial test passes, 1200/1201; the one failure is style.test,
  from the prototype module itself. That includes test/fx008-probes.test.mjs
  with its Go hashes, fx008-defer*, fx-oracle and fx-cleanup;
- the generator differential passes, 7/7.

Full `verify` was not run.

**The own row matters [ran].** My first prototype checked only the
parameters, and it *accepted* this program:
```
effect Get(a) { fn get(): a; };
fn mk(): Handler(nofail Log with ...e) with Get(Handler(nofail Log with ...e)) + ...e = get();
… { with handler Get(Handler(nofail Log with Tick + Fail(E) + Console)) { get() => handler Log { log(n) => tick() } } { with mk() { defer log(1); () } } }
```
That is a hole which 1649218 itself rejects. So the occurs check must
cover the own row.

**User decision.** This changes acceptance in one direction: unsound
programs are rejected, and generic pass-through handlers become more
conservative. It also refines P2 and design §3.4. The plan's deviation
rule needs the user's sign-off on the rule and on the new limitation.

## Important

### I1. Scale: 1,000 installations is quadratic, and Task 8's guard now has a 1.29× margin (user decision) [ran]

- **The new bound.** test/fx008-scale.serial.test.mjs:20 sets
  `MEASURED_INSTALLATIONS = 7342`, so the bound is 22 s. I measured
  7381 ms with the other scale tests at their bounds:
  - defers 1002 ms (bound 3003);
  - chain 306 ms (933);
  - variables 114 ms (345).
- **Task 9's own work is linear [ran].**

  | Program | Size | Time |
  |---|---|---|
  | defers | 8k / 16k | 1.02 / 1.98 s |
  | chain | 1k / 2k | 0.36 / 0.55 s |
  | variables | 200 / 400 / 800, ×20 | 49 / 96 / 216 ms |

  The path check is O(edges × atoms) as written (below).
- **The quadratic cost is T008's family.**
  - 3.97 s at 66f1eca, 5.9 s at ff0c6d1 and 7.3 s now; 2,000
    installations take 33 s.
  - The 3× bound is per plan, but at n = 1,000 it allows about 5.5× the
    66f1eca cost.
  - test/fx008-install.serial.test.mjs times essentially the same program
    with a bound of 9.5 s ("never raise the bound", T008). Its margin is
    now 9.5 / 7.3 ≈ 1.29.
  - It failed at 10.35 s in the harvest run
    (.build/differential-harvest.jsonl.log), and at 10.15 s in my parallel
    run. It passed alone (6.8 s), so `verify`'s serial phase is fine on
    an idle machine.
- **Decision for the user.** Either accept this cost and record the
  1.29× margin in T008, or do T008's fix (a feed graph over tail classes;
  Task 8 review I1's Lend walk) before the merge. Fix: "in T008, record
  7.3 s at 1649218 and the 1.29× margin of test/fx008-install.serial.test.mjs;
  the user decides whether T008's tail-class graph lands before fx008-impl
  merges." The 22 s bound adds little beside the 9.5 s guard. Consider
  dropping that scenario from fx008-scale, or bounding the mark check alone.

## Minor

- **M1. Console frames.** src/Features/Check/Frames.purs:49 skips Console
  frames.
  - This is unreachable today. No `Handler(Console …)` value can be built
    (FX011), and my attempts to install a parameter of that type are
    rejected first, as `f performs Console, which its signature does not
    allow`.
  - The skip drops real demands, not only the trivial `own ⊑ N`: the
    clauses' outer labels ⊑ N, and a rigid C tail.
  - Fix: "delete the `found.frame == NoFail` guard (the graph already
    drops `N ⊑ N`, and outer edges into N are the correct demands), or add
    to FX011/D001: user Console handlers must generate frame edges."
- **M2. Generator coverage.** test/fx-programs.mjs:31-34 and
  test/fx-gen-fragments.mjs:67-69, 121-122 make every generated
  user-effect signature label `nofail`.
  - This follows plan Step 3 and P12, which is the sanctioned migration.
  - Coverage is lost, though. The differential never generates a plain
    (M) signature label, which is the shape of every program without a
    `defer`. It never exercises an M frame either.
  - Fix: "write `nofail` only on labels the function's body defers, or by
    a seeded coin elsewhere; and lift the fail-free-clause restriction
    (BACKLOG FX008 'afterwards lift Task 10's generator restriction') as a
    tracked follow-up."
- **M3. Budgets.**
  - src/Format/Diagnostic.purs grew from 229 to 242 lines and is now
    within 20 of 250.
  - scripts/regression.mjs grew from 245 to 247, on the Global
    Constraints list, and the growth is not offset in the task.
  - Fix: "offset scripts/regression.mjs by 2 lines (e.g. move the
    fx008 imports into one rows index), and add Diagnostic.purs to the
    near-limit list."
- **M4. The ambient's name.** `FrameRigid` and `OwnAbort` name the ambient
  variable `""`, because `nameOf` misses it (Frames.purs:115-116). The
  texts render it as `...`, as the plan's text table intends. Task 10's
  note texts must keep that convention: a note to pass along, not a bug.

## Checked and sound

- **Path check (Mark.purs) against the pseudo-code.**
  - BFS runs from Plain, then the declaration's mark variables, in
    signature order.
  - `leaving` is ascending by insertion (foldr over Push, read
    top-first). `next` and `stackItems` keep discovery order. So `pred`
    is the first edge that reaches a node.
  - A violation is an edge into N, or into a different `nofail(k')`, from
    a reached mark. Atoms are never passed through. Edges into M, and out
    of N or Unmarked, are dropped after resolution.
  - P7's key is (span start of the violating edge, insertion, atom order).
  - P6 dispatches on the last edge. `FrameRigid`, `FrameOwn` and
    `FrameOuter` end in a frame meta, so they can never be last, which
    matches the plan.
- **Duplicates.** A re-recorded edge has the same span and a later index,
  so it can change neither the minimum nor `pred`. This agrees with the
  Task 8 review's Q3.
- **Cost.** Each mark enters the frontier once per atom, and each edge is
  crossed once per atom: O(E log V × atoms).
- **Frames [read].**
  - The insertion order matches the Interfaces.
  - `partners` pairs C with the outer row as `assume` does.
  - OwnAbort fires on a `Fail` label or a rigid clause tail.
  - DeferDemand skips `Fail`.
  - Everything is generated after `settleRestricted` on resolved rows
    (rev6 M2).
- **Adversarial set (item 4) [ran].** b1-b11 are aimed at the original
  hole. Every one that should be rejected is:

  | Program | Route | Verdict |
  |---|---|---|
  | b1 | caller-installed failing handler | `Expected nofail Log, found Log` at `work()` |
  | b2 | two-function forwarding chain | the same, at `f2()` |
  | b3, b3b | value parameter whose clause reaches failing Tick | Log defer message |
  | b4 | returned `Handler(nofail Log with Tick)` | Log defer message |
  | b5 | stored lambda called under two handlers | Log defer message |
  | b6 | `nofail(k)` callback under failing Log | Log defer message |
  | b6b | swapped mark variables | `Expected nofail(k) Log, found nofail(j) Log` |
  | b7 | triple nested same-label forwarding | Log defer message |
  | b8 | constructor field | Log defer message |
  | b9 | effect-operation result | Log defer message |
  | b11 | callback demanded `nofail` under a failing `let h` | `Expected nofail Log …` |

  b10 (a defer inside a failing clause, under a fail-free outer) is
  accepted, and Go and the interpreter agree (`2 9`). The fail-free
  controls of b4, b8 and b9 are accepted and agree (`7`). The only
  accepted program that fails at run time is the C1 family.
- **Regression rows (item 5).**
  - `copies`: in the mutant, the lambda's tail takes the first context's
    Tick label itself. The second use then imposes M on the first Tick
    frame, which the first context's deferred `tick()` needs N. The row
    guards the defect.
  - `frame-m` with p2: one value installed under two rows shares m when
    frame = own. With q1, each `prefix()` call opens its own m, so q1 cannot
    tell; the implementer's reasoning is right.
  - Every proof line is in .build/task9-verify.log.
- **Differential (item 6).**
  - scripts/differential.mjs is not in the diff (`shownDifferences = 5`,
    line 35).
  - .build/task9-diff-harvested2.log has 13 differences, all "candidate
    rejected" with E_EFFECT, no acceptance gained and no Go change:
    - 7 sources of the 8 flipped probes, with q1 included;
    - 6 new Task 9 rejection programs: fail-free literal, nofail call,
      forwarding into failing, ambient callback, rigid k, failing clause
      defer.
  - The earlier 25-difference log is the stale harvest from before the
    migration.
  - The regeneration's test run exited 1 only on timing tests under the
    hook (see I1).
- **Probe table.** The diff adds only `flipped: true` to the 8 listed
  entries. Their expected outcomes predate this task.
- **Review Focus 2, 4 and 5.** Each has its test:
  - Focus 2: clauseDefer and clauseDeferFailing;
  - Focus 4: Go equality for `pass`, and a pinned hash for `count`;
  - Focus 5: boxPlain, boxOwnFailure, boxCrash, and the parameter E_TYPE.
- **Scale methodology.** The 50-repetition variables test is sound as a
  regression bound: `check` is pure, with no memoisation. Its comment
  says "3 ms", which is a single run (115 / 50 ≈ 2.3 ms).

## Decisions that are the user's

1. **C1's fix.** The rule "the result clause row is closed only when its
   tail variable occurs nowhere else in the signature", the new
   conservative limitation for generic pass-through handlers, and the
   refinement of P2 and design §3.4.
2. **I1.** Accept the quadratic 1,000-installation cost (7.3 s, a 1.29×
   margin under Task 8's 9.5 s guard), or land T008's fix before the
   merge.
3. **M1, when D001 arrives.** Whether Console frames generate edges.
