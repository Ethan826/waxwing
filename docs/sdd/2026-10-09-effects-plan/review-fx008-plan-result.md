# Review: FX008 implementation plan (docs/plans/2026-10-10-abort-tracking-plan.md)

Reviewed against the approved spec (rev 10), the termination, rev9-F1/F2 and
rev10 review procedures, the writing-plans skill, AGENTS.md and
docs/engineering.md. The design and D0–D7 were not reopened. Only this file
was written in the repo. Probes are in the session scratchpad under
`planreview/`.

Tags: [ran] means run on the current build (fca4134 code; HEAD 03002e0 has no
src/test/scripts change since). [read] means reasoned from source or spec.

## Verdict: Ready with fixes

No Critical finding. The algorithmic content is faithful to the spec, and P1–P12
do not contradict it. But eight Important fixes are needed:
- two before Task 1 (the worktree, and the gate's coverage);
- one about model allocation, which conflicts with the user's direction;
- the rest before the task that owns each.

## Critical

None.

## Important

**I1. Execution setup: worktree and branch (D).** The plan says "on branch fx008". But fx008 is checked out in the main checkout, and concurrent sessions commit there: HEAD moved from 0a20e5e to 03002e0 during this review [ran]. Git does not allow one branch in two worktrees. Fix: add a "Setup" section before Task 1.
- `git worktree add ../waxwing-fx008-impl -b fx008-impl fx008`. The work merges into fx008 at the end; it is never pushed.
- These paths are absent in a fresh worktree:
  - `.build/` is gitignored, so Task 1's source `.build/fx008-probes/` does not exist there. Copy from the main checkout's absolute path, or copy the probes first.
  - `.spago/`: scripts/regression.mjs compiles `.spago/p/*/src/**/*.purs` (line ~232).
  - `.build/home`: scripts/cache.mjs points `os.homedir` at `resolve('.build/home')`, so the spago cache is cold and per-worktree. Copy or symlink `.build/home` and `.spago`, or run spago install with network.
  - `node_modules`: run `npm ci`.
  - `.build/go-cache`: scripts/waxwing.mjs sets GOCACHE; it is cold but harmless.
  - `output/`: it is per-worktree. The regression "healthy" run uses `output/Program.Compile/index.js`, which is correct only after the worktree's own build.
- Docs ledger lines (docs/progress.md and the sdd progress.md) are edited concurrently in the main checkout. Say that evidence entries are committed on fx008-impl and merged, or written by the controller on fx008. Do not write them from both.

**I2. The probe gate omits review probes that are present (C, 3).** `.build/fx008-probes/` holds 119 files, not 83 [ran]:
- 14 top-level files;
- rev6 29, rev7 11, rev8 17, rev9 6, rev10 6;
- design-review 16, facts 3;
- fx008facts 3 and termination 14, which are byte-identical duplicates [ran: cmp].

The plan takes only p1, p2, p3, q1 and q2 from design-review. §10 says "every review probe is kept". Not gated:
- design-review/c2, c3, late, p4, p5, r1–r5;
- facts/lexical and facts/pending (facts/cross differs from c1/hole only in layout; c1 = rev6/hole).

Several are exactly the reverse-link shapes the hook changes. p4, p5, r1 and r2 are rejected today by the reverse link [ran]:
- p4: `run performs Log…` 162-168;
- p5, r1, r2: `Console + ... and Log + Console + ... cannot be made equal…`.

facts/pending must flip in Task 6: today it runs to status 1 with `fail(F): F\ncleanup failed: fail(E): E` [ran].

Fix:
- Step 1: copy design-review/* to review/ instead of retyping five programs. Copy facts/lexical and facts/pending. List the excluded duplicate directories explicitly, so that "83" is not ambiguous.
- Add today's outcomes:
  - c2 E_TYPE `Expected a handler` 177-194;
  - c3 the same, 168-185;
  - late E_TYPE `Fail needs a concrete error family` 109-116;
  - p4, p5, r1, r2 and r4 as rejected today (r4: `Unhandled Log in main` 163-167);
  - r3 and r5 accepted with empty output;
  - facts/lexical status 1 `fail(E): E`.
- FX008 flips:
  - facts/lexical and facts/pending: rejected E_EFFECT `defer must not fail, but it performs Log, whose handler may fail` at `defer log(1)` (§1, the pinned form);
  - every other new entry unchanged.

**I3. Model allocation conflicts with the user's direction (E).** The plan header assigns Opus as implementer for Tasks 3–7. The user's direction is Sonnet for every task, with Opus reviewing and taking escalations. Fix the header. Add the escalation triggers: genuine ambiguity, any gate failure, two failed reviews. Under Sonnet, these tasks are too large or ambiguous:
- **Task 5 (largest risk, see §6).** Six new modules, eleven modified, ten rows, and the subtlest algorithm. It cannot split by feature without breaking the gate: the hook without S makes set1 ambiguous, which is exactly the fx008-settle-phi mutant. Split it instead into:
  - 5a, behaviour-neutral, gate unchanged: Handle move, Watch on Subst/Binding with unit tests, the Restricted registry, Settle generalized to typed entries with modes;
  - 5b, the switch-over: Clauses, Sync, the S entries and TailPass, with all ten rows.
- **Task 6.** Split into:
  - 6a: Install, the installation entries in Settle, and TailPass's installation rule. This is gate-neutral, with unit tests that the edges are recorded;
  - 6b: Frames, Mark, MarkReport, texts, migration, generator `nofail`, the 12 rows and the scale file.
- **Task 2.** Split into:
  - 2a: representation only. The mark field, `HandlerRows`, `stripProgram`, and every site given `Plain`/`NoFail`/`Unmarked`. This is a pure refactor, with snapshots identical;
  - 2b: parse, resolve, print, MarkUse and the oracle.
- **Ambiguities for Sonnet in the Task 5 Sync pseudocode.** `groupAt(m)`, `currentSignature(e)` and how `byTail` is pruned are undefined. Define `currentSignature = { counts, group, kind }` read on the resolved row. Define `groupAt(m)` as the group whose representative resolves to m.

**I4. The consumption interface cannot express the throwaway that M9 needs (type consistency, T003).** Task 3 defines Directional's `throwaway` as "the fresh tail [consumeVia] adds to a closed stage". But:
- every throwaway caller builds an *open* stage with its own fresh tail:
  - today's settleDeferred passes `Row kept (Just (Hole reached.next))` (Defer.purs:108-111);
  - Task 4 says "with a fresh Hole tail, which is the throwaway";
  - Task 5 says c into C "with a fresh throwaway tail";
  - Task 6 Install says "C's labels … with a fresh throwaway tail";
- Consume.purs:79-86 adds a tail only to a resolved-closed stage.

So the throwaway is `Nothing` everywhere it matters. Then:
- copies of the whole remaining target prefix are made on every (d) consumption, every round;
- that is the M9 violation;
- it is a quadratic risk for "8,000 defers".

Fix: give consumeVia (and consumeIgnoring) the stage as labels plus an explicit `Maybe Int` throwaway, or require callers to pass the labels as a *closed* row so that consume adds the tail.

Also say how the target is chosen. consumeVia always targets `env.current`. Consuming c into R or C, and C into ρ, needs `env { current = … }`, as settleDeferred does today. State that per call.

**I5. P3's text needs TypeName changes the plan does not list (feasibility).** `Expected Handler(nofail Log), found Handler(Log)` is printed through Features/Check/TypeName.purs:41-55 `handlerName`. That builds `AppliedName "Handler" [applied head parts]`, and Domain.Problem `TypeName` (Problem.purs:11-19) has no mark. Add both files, and the Format printer, to Task 3 (or Task 2b).
- `callback rows are invariant in marks`: `FunctionName TypeName TypeName` carries no row. If the failure surfaces as a type Mismatch, the message would read `Expected Unit -> Unit, found Unit -> Unit`.
- The plan's hedge ("assert the text it prints") would pin a confusing text. Decide that the row-payload path reports it. That is RowPayload through `labelName`, giving `Expected nofail Log, found Log`. Make it a requirement, not an observation.

**I6. fx008-tail-pass: the plan's reasoning about the candidate is wrong, but the candidate is a valid witness (A, 4).** The plan says today's rejection of its program (E_EFFECT `f performs Console, which its signature does not allow` 266-278) happens "during checking". [ran]: the span 266-278 is `fail(Job(k1)`, the retried postponed pair, so it happens in **settling**.
- Controls [ran, scratch tp2/tp3]:
  - with `k1(1)` and no handler: rejected at the same pair;
  - with k1 unused: accepted.
- Under rev 10 [read]:
  - the clause row c ≡ k1's tail stays open, because one-way R ≡ ρ_f binds only φ := [Console];
  - round 1 (a) retries the pair and binds k1's tail := `...e` (rigid);
  - the loop adds no labels;
  - the tail pass then needs R to end in `...e`, but R = [] + φ = [Console] (closed). That gives the missing-capability error.
- With the mutant (`tailPass` returns the state unchanged), no later check sees it: no defer, and the own-abort edge is harmless. **Fixed: rejected E_EFFECT. Mutant: accepted.**

Fixes:
- Correct the Step 1 narrative.
- Specify the tail-pass error's origin span. The plan gives none for any tail-pass or Settle-entry consumption. Proposal:
  - the clause span (`ClauseEntry.clause`) for the clause rules;
  - the `with` span for the installation rule;
  - the handler span for clause-entry consumptions in Settle.
- Pin the message after Task 5, under Opus review. Predicted: the text consumeVia gives for `[| ...e]` against `[Console]`, which today reads `f performs Console, which its signature does not allow` (tp0 [ran]).

**I7. fx008-exit-count: a concrete witness (A, 4).** Scratch `ec1.wxw`:

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

- Today [ran]: E_EFFECT `Unhandled Fail(E) in main` at 284-301 (`with h { log(1) }`). The control without `with h` (ec3) is accepted.
- Rev 10 [read]. The deferred row `[Cell(Int -> Unit with Fail(E) + t)]` is consumed only in loop step (d). Its Cell pair matches z's `Cell(type of g)`, so the *argument-level* unification binds g's tail, which is the clause row c's tail, to `Fail(E) + t`. Then:
  - Round 1, in source order (the clause at line 6, the defer at 9, the installation at 12): the clause entries consume nothing new, and the deferral adds no label to its target. So only c's own count changes.
  - Correct exit test: round 2 consumes `Fail(E)` from c into R = [Console] (closed through φ) and into C, and C into ρ_main. That gives the rejection.
  - Mutant (counts only labels added to targets by (d)): it exits after round 1, so it is accepted.

  This is a typing-level unsound acceptance: g's type says it may fail, and it runs under closed `main`. It is not observable at run time.
- Fixed outcome: rejected E_EFFECT `Unhandled Fail(E) in main`. Its span depends on the Settle origin (I6); pin it under review. Mutant: accepted (`/exit test: accepted/`).
- It does not touch FX010: no `h` escapes through a parameter, unlike argbind-internal.
- Add ec1 to the gate as well (today: rejected, as above).
- Precondition for the row: Settle's order is by span start (Minor m4). The clause entries must precede the deferral; if they do not, the label reaches R in round 1 under both builds.

**I8. Post-Check label construction and the C row after strip (A3 risk).**
- Task 2 says "constructed labels use `Plain`". After Check, labels must be `Unmarked`, or derived `Eq`/`Ord` will distinguish them from stripped ones. Example: Features/Specialize.purs:171 builds `THandler (Label info.effect arguments) closedRow`, and Lower.purs and Nested.purs match labels.
- `stripProgram` should also set `clauses := inference` (or close C), so that every `Eq`/`Ord` on `Ty` after Check (Instantiation/Nested, Specialize keys) sees today's single row. As written, P4 leaves C's labels in place, and "admissible ignores them by construction" is not true for the row.
- Mid-Check, `Eq` now sees marks: Failure.purs:137 `differs`. Diagnostic texts can move, but the gate catches that.

## Minor

- m1. **P10 contradicts Task 2.** P10 says all new mark rejections are E_EFFECT except P3's. But Task 2 asserts E_TYPE (`nofail Fail`, L6), E_SYNTAX (`nofail ...e`) and E_UNBOUND. Reword it as "all new mark-check rejections". A second point for the user: the same text `Expected nofail Log, found Log` occurs as E_TYPE (P3, type equality) and as E_EFFECT (`ExpectedNofail`, path).
- m2. Task 4's heading says "settleKeys, settleDeferred and settleKeys". The code is settleKeys, settleDeferred, settleFinal (Check.purs:116-118).
- m3. **dup and n1 are flipped with a pattern and an "observed" span** (C). The span is derivable. In Task 4 only deferrals are entries, so the cycle is the deferral's self-loop, and the origin is `crossing deferral.span`, as today (Defer.purs:110). Pin `at: 'defer k(1)'` (dup 150-160, n1 138-148, if the deferral span is the expression) in Task 1. Keep the message as the pattern, since the spec says only "the existing side-condition error".
- m4. **Order key.** Cycle's "index, which is source order" is wrong for deferrals, which are appended post-order (Defer.purs:65 `Array.snoc` after the body). Use span start everywhere, as the spec does ("source position"), with registration index as the tie-break.
- m5. `fx008-new-labels` accepts `(timed out|accepted)`. The spec says cyc2 "hits the timeout". Require `timed out`, or justify the alternative in the row comment.
- m6. **Gate enforceability (3).** "Change only `flipped`" is a convention. Add a check to the gate test: a SHA-256 of the table with the `flipped` fields removed, which a task may update only when it flips or pins listed entries. The reviewer also diffs the table.
- m7. **Subst.purs budget.** It is 241 lines. Task 3 adds `marks` (+3–4) and Task 5 adds `watch` (+3–4). Only Task 3 mentions moving `compose`. Say in Task 5 that the move is required if Task 3 did not make it. Domain/Type.purs (249) is feasible if the import is qualified.
- m8. A handler literal's C before Task 5 is unspecified. State `clauses = inference` for literals in Tasks 2–4. Note that Task 3's EqualMarks on C ≡ C then also equates the literal's R marks. That is harmless, because R is dead, but it is worth knowing.
- m9. Task 7 "1,000-hop … nested lambdas, depth within the nesting limit" is contradictory: nesting is capped at 128. Say "1,000 sequential let-bound lambdas, each installing a forwarding handler and calling the previous one".
- m10. **Missing notes.** §9 wants notes on every rejection. Task 7 omits merge2, review/q1, facts/lexical and facts/pending. Add them, or state that the gate pins only the headline for these.
- m11. **Name checks [read, grep].** These names are accurate:
  - UnifyRow `Operands`, `Pending`, `postponed`, `finish`, `unifyTails`, `shared`; `present` takes `sides`, so the mode goes through `Operands`;
  - Consume `consumeVia` and `consumeAt`; Use `declarationUse`;
  - Handler `handleFailure` (its only external user is Infer.purs:112, which needs an import change in Task 5 Step 0);
  - the `headOf` sites (Handler:117, Apply:107/123, Hint:39) and `functionLike` (Call:123/125, Pipe:36);
  - the line counts in the Global Constraints table, all exact.

## 1. Spec coverage

- **Covered:**
  - §3.1–§3.6;
  - §3.5 order (settle, judge, marks, then comparable/printable/entry);
  - T (signature), F1′ (φ per class), S (settling clause→R), N1 (identity), N2 (own tail in the graph), N4 (φ closes);
  - the fallback ban;
  - the §6 list (migration, the L4 pair, dup/n1, the gain1 gain, I1/I2/N5/annotb);
  - the §9 rejections and acceptances (Task 6, the gate and Task 5);
  - 23 of 23 mutants (count verified: 1 + 10 + 12);
  - the differential (Task 8);
  - §8, D4, D5, the FX001 Tasks 11–12 amendments (Task 9);
  - §4.6, which is a no-op today.
- **Gaps:**
  - the gate omissions (I2);
  - notes on some rejections (m10);
  - §9 "1,000 nested handlers", interpreted by P11 and needing an ack (B).

## 2. Feasibility and type consistency

The problems are I4, I5, I8 and m7. Interfaces otherwise match across tasks:
- `RowMode`, `MarkEdge`, `ClauseEntry`, `Installation`, `HandlerRows`;
- the `declarationUse` arity: callers are functionUse, Operation.purs:154 and ctorUse.

**Green between tasks** holds as sequenced: P12 puts the migration with the check. Each split proposed in I3 keeps the gate unchanged in its first half.

The most likely stop-and-report triggers:
- argbind-internal (FX010) and rev6/con (FX011), whose code Tasks 2 and 4–6 touch;
- texts that move in the side-condition rejections (annot, l4, reuse2, cyc2/3, sh1) once clause rows are separate.

The gate rule makes these stops, which §10 requires.

## 3. Probe gate [ran]

- **All 83 recorded outcomes match**: every code, message, span and stdout in the Task 1 tables. 102 probes were run, including the extra design-review/facts files. There are 88 entries, which matches the count.
- **FX008 flips** (C):
  - hole, l4b, merge2 and q1: an exact message and span, each with a reason tied to §1/§6/I2 ✓;
  - gain1: exact stdout and status; the Go hash is pinned by observation, which is acceptable, as there is no prior Go;
  - dup and n1: reason ✓, but only a pattern, and the span is "observed" (m3).
- **No other probe should flip** [read]. Every accepted probe with a `defer` performs its labels under fail-free frames (p1, p2, annotb, extb, reuse, annotc/d, merge1, merge2ctl, cycle2, f1, f2, argbind). This agrees with §6/§9.
- Missing entries: see I2.

## 4. Regression rows

- All 23 are assigned. The probe for each fails for the spec's stated reason, except where noted:
  - `fx008-new-labels` (m5);
  - `fx008-exit-count`: probe proposed in I7;
  - `fx008-tail-pass`: I6 confirms the plan's candidate.
- The regression harness runs probes in-process under a 180 s spawn timeout. The plan's `compileWithin` child process with 20 s timeout plus `context.compilerPath` is the right fix: without it, a hang fails `assert.ifError(broken.error)` instead of proving the row.
- Line budget: scripts/regression.mjs (245) gains +1. test/regression.mjs (249) nets −2 ✓.

## 5. Step quality and length (F)

Steps are mostly unambiguous and test-first. Exceptions:
- the hedged texts (I5, I6);
- the Sync helpers (I3).

At 1,828 lines against 1,016, the plan carries spec text and records it does not need. Cut about 400–500 lines:
- **Global Constraints bullets** that restate AGENTS.md/engineering.md (lines 41–49): replace with a reference.
- **"Architecture"**, which re-summarizes spec §3.
- **Task 4's settling pseudocode** (937–951), which copies the termination review's "Corrected procedure". Keep only the deltas: modes, the S entries, N2, keepFail.
- **Task 5's Sync pseudocode.** Keep it, but drop the prose that restates F1′/T (1112–1114) and the narrative of Step 1's "today" (1175–1185), after I6.
- **Task 9 Steps 1–4**, which re-type spec §8, §4.4, §4.5 and §10. Say "apply §8 / §4.4 / §4.5 / §10 verbatim" and keep only the plan's own additions (the regression-fx.mjs location, FX010/11/12 notes, L1/L4/L6 rows).
- **"Coverage of the spec's §9 and §6"** (1787–1828), a self-review record that duplicates the task tables. Move it to the report.
- **Review Focus items**, each restated in full in its owning task. Keep one copy of each.

Keep:
- the today/FX008 tables;
- P1–P12;
- the Cycle algorithm;
- the Mark BFS;
- every text table;
- every test assertion;
- all regression tables.

## 6. Risk

Task 5 is the most likely to blow up:
- **Coupling:** `sync` is called from Infer, Handler, Apply, Hint, Call and Pipe, and its bindings must re-dirty through Binding while postponed pairs revert the watch.
- **Line limits:** Subst and Scheme are near their limits.
- **Size:** ten rows, two of which need constructed probes.
- **Linearity:** sync runs after every node.

Split it as in I3. Task 6 is next, then Task 2 (≈100 sites, mechanical). Keep the task order. Put the I2 gate additions and the I1 setup into Task 1.

## B. P1–P12 classification

| P | Class | Note |
|---|---|---|
| P1 | i | Consistent with §3.3/§3.4. |
| P2 | i | Record `Eq`/`Ord` exist; fine. |
| P3 | **ii** (wording and codes) | Consistent: §3.4 says types unify marks by equality. The user should ack the E_TYPE texts and the shared text with E_EFFECT (m1). |
| P4 | i | Consistent with §3.3. Amend as in I8. |
| P5 | **ii** (acceptance) | Operation signatures are not opened. The spec is silent; this is sound and only rejects more. Needs a user ack and a BACKLOG mention beside L1. |
| P6 | **ii** (headline) | It demotes §3.6's "… performs Log, whose handler may fail" frame headline to a note. Defensible, since an own mark gets only own-abort edges, but it deviates from §3.6's list. Needs an explicit user ack. |
| P7 | **ii** (which violation is reported) | Acceptance is unaffected. Consistent with "fixed by source order", once m4's order key is fixed. Opus review only. |
| P8 | i | Consistent with §3.2 and step 6. |
| P9 | i | Consistent with §3.2's "own namespace". Record that the §3.2 sort error is unreachable by grammar. |
| P10 | **ii** (user-visible texts) | §3.6 delegates the exact texts to the plan, so approving the plan approves them. Ask the user explicitly. Fix m1. |
| P11 | **ii** (verification scope) | It reinterprets §9's "1,000 nested handlers" under ADR 006's limit of 128. Sound, but needs an ack. Fix m9. |
| P12 | i | Sequencing. |

## Ran vs read

- **[ran]:**
  - all 102 non-duplicate probes, with outcomes matching the plan's 88-entry baseline;
  - the .build inventory and its duplicates;
  - HEAD movement;
  - the tail-pass controls tp0–tp5 and the exit-count probe ec1 and its control ec3 on today's compiler.
- **[read]:** every rev 10 and fixed-versus-mutant prediction in I6 and I7; the code-site claims (by grep); feasibility; the line budgets; the coverage mapping; the P classification.
