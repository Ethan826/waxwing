# FX008 Task 4 review: directional consumption, copies, mark equality

Commit 3b0dd3e on fx008-impl (base e0580a4). Reviewer: Opus, 2026-10-10.

## Verdict

- **Spec ❌, but narrowly.** Directional consumption, copies, extension
  marks, throwaway skipping, postponement and opening match §3.4, P5 and the
  plan, and I confirmed each by running it. One P3 gap remains (I1): two
  handler types whose `clauses` are both `Nothing` never compare C's marks.
  The plan's interface text ("only when either side's clauses is `Just`")
  prescribes this, so it needs a plan ruling. It is a soundness hole once
  Task 9 reads edges.
- **Quality: Approved with fixes.** I1 needs a fix (one line plus a test).
  The Minor items are test gaps and one text.

## Ran vs read

**Ran** (scratch `t4review/`: `git archive` copies `base/` and `cand/`,
each built with `scripts/build.mjs`, exit 0; mutants built in `mut/`):
- Worktree: `node --test` on fx008-marks, fx008-equality and fx008-probes:
  122 pass, 0 fail. The worktree is still clean.
- `scripts/differential.mjs --corpus harvested --regenerate`: 3,427
  sources, **435 check-phase differences**. Every one is a renumbered
  residual negative row hole in the checked IR (e.g. `Hole -21` →
  `Hole -25`). Fresh mark metas now draw on `Subst.fresh`.
  The harvest's test run exited 1, but only on timing bounds under parallel
  load (two builds running).
- My own whole-compile comparison (`tools/cmp.mjs`, Go text or full wire
  diagnostic):
  - harvested corpus (examples/ and negative/ are already in it): 3,427
    sources, 2,097 accepted on base, **0 differences without `nofail`**.
    The 2 differences with `nofail` are the plan's intended P3 rejections
    (run/pass, need/give).
  - 1,500 generated match programs plus 6,000 mutations of harvested
    sources: 7,489 sources, 0 differences.
- Postponement, by unit test: a Directional pair postponed on a deferred
  Fail key reverts its edges (`[]`) and stores `mode: Directional`. After
  the key binds, `settleRows` replays it: `Assumed 2⊑1`, then `Copied 3⊑-2`.
- Mutants (each rebuilt; the tests that caught it in brackets):
  - pairMarks orientation swapped [marks 1]
  - throwaway check removed [marks 4, 5, 11]
  - extension shares the stage mark [marks 2, 11]
  - copy edge reversed [marks 3]
  - `advanceTail` a no-op [marks 5, 11]
  - consumeLabels without a throwaway [marks 11]
  - handled-label marks ignored [equality 1]
  - no opening [equality 2]
  - **survived**: consume's closed-stage throwaway removed (M2), results
    written M opened too (M3), C compared ignoring marks (M4).
- Probe programs c1–c8 run on both builds (below).

**Read:** the full diff, plan Task 4 and its interfaces, P2/P3/P5/P13,
spec §3.3–§3.5 and §5, rev6 I2/M9 and rev7 I2.

## Checks

1. **Orientation: correct at every site.** In consumption the left side is
   the stage and the right side the target (`Consume.consumeIn` passes
   `flexibleRow row` first, `env.current` second).
   - present → `pairMarks`: lower = target mark, upper = stage mark, so
     frame ⊑ assumption (UnifyMark.purs:42-50).
   - absent → `targetLabel`: fresh t, edge t ⊑ s, `Extended` (:63-77).
   - finish → `stageLabel`: fresh c, edge ρ ⊑ c, `Copied`; nothing on the
     throwaway (:82-98).
   - Console labels stay N and Fail labels Unmarked (`freshened` returns
     `Nothing`, `recorded` skips Unmarked).
   - The mutants above confirm each direction.
2. **P3: marks are equal wherever types unify**: label arguments in every
   mode (through the type unifier), function rows, the handled label
   (`handledMarks`), and C when a side is `Just`. Consumption pairs are
   directional and R is ignored. The exception is I1.
3. **Throwaway (M9): really skipped.** consumeLabels passes `Hole next` as
   the throwaway. A closed stage in `consume` gets its fresh tail as the
   throwaway, and `advanceTail` follows extensions. The 8,000-label test is
   meaningful only in its second half: a 1-label stage against an
   8,000-label target would make 7,999 copies. Its first half cannot make a
   copy at all (Minor m4).
4. **Behaviour preservation: holds** for Go and diagnostics (0 differences
   over 10,916 sources). The implementer's "0 diffs" does not hold at the
   check phase (m1).
5. **Postponed pairs: correct.** They revert to `operands.start` with its
   mark store and are retried in their starting mode, with the original
   throwaway meta, which nothing else references.
6. **Opening: correct and minimal.** `functionUse` is the only caller,
   covering both calls and function-as-value uses (Use.purs:174).
   - It opens a top-level parameter's M handled label and a result's N
     handled label. Constructors (`ctorUse`), operations and callbacks are
     never opened.
   - Attempts at an unsound acceptance:
     - c6 (`Handler(nofail Log) -> Unit` where `Handler(Log) -> Unit` is
       expected) is rejected.
     - c5 (`Handler(Log)` result into a `nofail` parameter) is rejected.
     - c7 (an M-parameter function passed as an N-parameter callback) is
       accepted, which is sound: contravariant weakening.
     - No unsound acceptance found. Nothing tests that M results stay
       closed (m3).
7. **Interfaces: present with the planned names and types.** MarkStore (all
   eight `EdgeReason` constructors, `AbortSite`, `Direction`), `Subst.marks`,
   `RowPair.mode`, `unifyRowsTraced`/`unifyRows`/`unifyRowsIgnoring`,
   `consumeLabels` with `LabelConsumption` field-for-field,
   `consumeIgnoring`, and `openHandlers`. Deviations, all acceptable:
   - `pairMarks` takes an `OccurrenceId`;
   - `advanceTail` is added;
   - `Edge.label` means the stage label for Assumed and Extended edges, and
     the target label for Copied ones. Document that at MarkStore.purs:24.
8. **AGENTS.md: no new violations found.**
   - Sizes: Subst 241, Handler 241, Unify 227, UnifyRow 202.
   - `unifyHeads` is 30 lines and `finish` 28.
   - `consumeIn` has 12 `where` bindings, all but 2 inherited from
     `consumeVia`.
   - No lambdas and no `let … in`.
   - Nit: Unify.purs:18 imports `Features.Check.Occurrence` between
     `Domain.Row` and `Domain.Type`, out of order.

## Findings

### Important

**I1. Two handler types with `clauses = Nothing` never compare C's marks
(Unify.purs `unifyClauses`, ~:190).**
- **Why it matters:**
  - P2 makes `Nothing` mean "C is R". Spec §3.4 and P3 say two handler
    types unify C with C, marks included.
  - With both sides `Nothing`, R is unified with `IgnoreMarks` and C is
    skipped.
  - Every signature type is `Nothing`, so written-to-written
    unification drops C's marks.
- **Program (c1), ran:**
  ```
  effect Log { fn log(n: Int): Unit; };
  effect Tick { fn tick(): Unit; };
  fn inner(h: Handler(Log with Tick)): Unit with Tick = with h { log(1) };
  fn outer(h: Handler(Log with nofail Tick)): Unit with Tick = inner(h);
  fn main(): Int = 0;
  ```
  It is accepted, and should be E_TYPE. The handled-label variant (c2) is
  rejected correctly.
- **Consequence once Task 9 lands (read):**
  1. A caller passes `outer` a literal whose clause runs `defer tick()`.
     That forces C_Tick = N, which equals outer's written N.
  2. `inner` installs the handler under an M Tick frame (C there is
     `[Tick(M)]`).
  3. A failing Tick handler around the call then aborts the cleanup, with
     no path in the mark graph.
- **Fix:** when both `clauses` are `Nothing`, unify `inference` with
  `EqualMarks` instead of `IgnoreMarks`. That is still one pass per level,
  so C1 linearity holds. Written C shares R's tail by the spec (structural
  copy, same tail), so equality semantics are right there.
  - Verified in a mutant (C compared even when both sides are `Nothing`):
    c1 becomes E_TYPE, and fx008-*, unify*, row* tests pass 208/208.
  - Add c1 to fx008-equality.
  - Amend the plan's Task 4 interface line, with the controller's ruling.

### Minor

- **m1. "Differential 0 diffs" is inaccurate at the check phase.**
  - 435/3,427 harvested sources differ in residual negative hole ids,
    because `freshened` (UnifyMark.purs:112) shares `Subst.fresh` with row
    tails. Go and diagnostics are identical.
  - Step 0's separate refactor commit was skipped, so no differential
    exists for the move alone.
  - Option: give fresh mark metas their own counter in MarkStore. The
    checked IR then stays identical, and `scripts/differential.mjs` stays
    usable for the "no behaviour change" Tasks 6 and 8. Otherwise, record
    the deviation in the ledger.
- **m2. A C-mark clash prints identical types:** `Expected Handler(Log),
  found Handler(Log)` (c3, ran: a lambda annotation `Handler(Log with
  nofail Tick)` applied to a signature `Handler(Log with Tick)`). P3 has no
  text for this.
  - Fix: print a handler type's row when it holds a `nofail` label, as the
    callback rule does.
  - It is a P10 text, so it needs the user's sign-off.
- **m3. Test gaps** (surviving mutants):
  - No test pins that a result written M stays closed (M3). Add
    `fn mk(): Handler(Log with pure) …; run(mk())` into a `nofail`
    parameter → E_TYPE (c5).
  - No test covers consume's closed-stage throwaway (M2): a `consumeVia` of
    a closed stage into a wider target should record 0 `Copied` edges.
  - No test covers C compared with marks (M4). c3 is testable today
    through a local annotation, which is `Just`.
- **m4. The first half of "consumeLabels makes no copies" cannot fail** (no
  leftover target labels), so the 8,000-copy claim rests on the second half
  alone. Say so in the test, or drop the first half.
- **m5. Directional pairs record N ⊑ N edges for Console.** They are
  harmless, but they grow the graph every settling round. Skip edges whose
  marks are both `NoFail`.
- **m6. Test-only API:**
  - `compose` keeps only the later substitution's edges, correct only
    under its precondition, and has no caller in src.
  - `handledMarks` builds a dummy `Written nowhere 0` occurrence for a
    failure it discards.

## Deviations accepted

- `literalMark`: Task 4 already gives the literal a fresh mark (planned for
  Task 7); `next + 2` keeps hole ids monotone.
- Pending carries the current mode and Operands the starting mode.
- `isEmpty` ignores mark bindings; `stripProgram` erases them.
- Failure.purs is unchanged: P3 reuses `RowPayload` and `Mismatch`.
- There is no refactor commit; see m1.
