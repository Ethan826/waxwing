# Review: FX008 Task 1 "Probe gate" (fx008-impl 58c3d61, base 8fe4218)

Verdict: **Spec ✅** (one justified deviation, below). **Quality: Needs fixes**
(2 Important, in the gate's flip path; both are small).

## What I ran and what I read

Ran, in the worktree:
- `node --test test/fx008-probes.test.mjs`: 105/105 pass, 6.2 s wall with a
  warm go cache.
- An independent re-run of **all 104 probes** by a separate path: CLI
  `scripts/waxwing.mjs emit`, then `go build`, then running the binary, and
  comparing the SHA-256 of the Go, stdout, stderr, status, code, message and
  span with the table. 0 mismatches. This covers every directory, the 14
  slow probes, and the 5 defect-report probes (rev6/hole, c1, facts/cross,
  facts/lexical with stdout `2\n`, facts/pending). Each compile took
  120–170 ms.
- The 16 flipped spans, sliced from the sources: each one is the text the
  plan names (`defer k(1)`, `handler Log { … }`, `log(n) => k1(n)`,
  `defer log(1)`/`log(0)`/`tick()`, `say(2)`).

Ran, in a scratch copy (output/ symlinked, Program.Compile copied):
- **Timeout path.** I made `compile` busy-loop when the child's argv names
  cycle2.wxw. `probe cycle2` failed with `AssertionError: timed out` at
  20006 ms. The other tests passed, and no orphan process was left. Correct.
- **Mutations.** Each mutated test failed, and in every case the tamper
  test failed too:
  - stdout: f1, amb3, and slow cyc1;
  - message: rigid;
  - span: failvar, and slow cyc2;
  - Go hash: f3;
  - stderr: pending;
  - status: rev6/hole.
  - Changing lexical's `fx008` span, r1's `task`, or deleting the f2 entry
    made only the tamper test fail, as designed.
- **Flip mechanics.** These runs found I1 and I2 below.

Read:
- AGENTS.md;
- docs/engineering.md §test/go-batch;
- plan Global Constraints, Task 1, and the flip lists in Tasks 5, 7 and 9;
- spec §9 lists;
- all 7 new .mjs files;
- go-batch.mjs `runGoBatch`.

## Step compliance

1. 104 files: 102 copied from `.build/fx008-probes/` (`diff -r` shows only
   `witness/` added), plus ec1 and tp1, which match the plan text. ✅
2. The `today` values match the plan's tables and my independent run. The
   ruling on facts/lexical (`2\n`) is applied. ✅
3. The flips are exactly the plan's 16:
   - Task 5: dup, n1;
   - Task 7: gain1, p5, r1, r2, ec1, tp1;
   - Task 9: hole, c1, cross, lexical, pending, l4b, merge2, q1.

   There are no extra flips. Each flip has its task, reason and span.
   - Patterns are used where the plan gives one: dup, n1, p5, r1, r2, ec1
     (alternation) and tp1.
   - Report-before-pin is stated in ec1's reason.
   - The slow list is exactly the plan's 14 probes.
   - `flipped` is false everywhere. ✅
4. One test per entry plus the tamper test (105 tests).
   - Slow probes compile in a child with a 20 s timeout, and a timeout
     fails as `timed out`.
   - The hash is `JSON.stringify` with `flipped` removed, and patterns are
     stored as strings so the hash covers them.
   - The deviation: slow *accepted* probes are built and run one by one
     (`runAlone`), not in the go-batch. This is justified. `runGoBatch`
     compiles from source in-process, so a hanging compile would escape
     the child's timeout. Today 8 probes take this path (argbind, cycle2,
     cycle2open, dup, n1, cyc1, cyc1ok, set1). The cost is small: the whole
     file takes 6 s. See M1.
5. The proof that the gate can fail is not committed, which is correct. I
   re-did it independently (above).
6. 105 pass. verify 0 per the controller facts; I did not re-run it.
7. One commit, with the trailer. docs/progress.md, BACKLOG.md and docs/sdd
   are untouched; the only doc changes are engineering.md and the
   lexical typo in the plan. ✅

## Findings

### Critical
None.

### Important

**I1. A per-entry flip cannot be expressed, and the natural attempt
silently does nothing.**
- In test/fx008-probe-kit.mjs:15, `probe` builds
  `{ file, today, fx008: today, ...change, flipped: false }`. `flipped`
  comes after the spread, so a later task that writes
  `{ flipped: true, fx008: …, task: 5 }` in `change` gets `flipped: false`.
- Ran: I added `flipped: true` to dup's change. All 105 tests pass, and
  even the tamper test passes, because the hash strips `flipped`.
- So the gate keeps testing `today`. The task would then fail on dup
  (which is the safe direction), but the documented interface ("Tasks 2-11
  change only `flipped`") cannot be followed without editing the kit.
- Fix: `({ file, today, fx008: today, flipped: false, ...change })`. Also
  add a test that every `flipped` entry has a `task` and has
  `fx008 !== today`. That test is cheap and makes a mistaken flip of an
  unlisted entry visible without depending on the hash.

**I2. A flipped entry with a null Go hash passes without any Go check.**
This is the gain1 risk.
- In test/fx008-probes.test.mjs:76, the hash check is skipped when
  `expected.go === null`.
- Ran: I flipped f1 to `fx008: ok('1\n2\n', null)`. `probe f1` passed, and
  only the tamper test failed, because I had edited `fx008`.
- For gain1, `fx008` is already `ok('0\n', null)`. Flipping it with
  `flipped: true` alone (once I1 is fixed) passes with no Go hash pinned,
  which contradicts "Go hash pinned on first observation" (plan Task 1,
  Step 3) and A3.
- Fix: in `checkGo`, replace the conditional with
  `assert.match(String(expected.go), /^[0-9a-f]{64}$/, 'Go hash not
  pinned'); assert.equal(sha256(shown.go), expected.go);`.
  - Unflipped gain1 is a rejection, so this is green today.
  - Task 7 is then forced to pin the hash when it flips gain1.

### Plan defect surfaced (for the controller; not the implementer's fault)

**P-r5. design-review/r5.wxw is byte-identical to n1.wxw**, so their Go
hashes are equal too [ran: cmp, sha256]. The plan:
- flips n1 in Task 5 to the side-condition pattern at 138-148;
- lists r5 as "accepted, empty" with no flip.

When Task 5 lands, r5 will be rejected exactly like n1, and the gate will
stop the work. The cause is likely a copy slip when the design-review set
was made: r5's mtime is 13:47, n1's is 10:24. The plan review asked for
"r3 and r5 accepted".

Rule before Task 5 dispatch. Either:
- add r5 to Task 5's flip list (same pattern, span 138-148, reason "same
  source as n1"); or
- recover the intended r5.

The pair rev6/hole ≡ design-review/c1 is also identical, but both flip in
Task 9, so they are consistent.

### Minor

- **M1.** docs/engineering.md:161 lists what is "Not batched", and
  fx008-probes' slow accepted builds are not on the list. Add them with the
  reason (an in-process batch compile would escape the child timeout).
  The new paragraph, at engineering.md:190–196, is three sentences where
  the plan asked for one. It is fine, but say there that slow probes run
  outside the batch.
- **M2.** The predicted texts for p5, r1, r2 and tp1, which the plan gives
  as the expected first observation, are only in the plan. Adding a
  `predicted` string (it is hashed) would let the report-before-pin step
  compare against them mechanically. dup's and n1's reasons do not mention
  report-before-pin; plan Task 5, Step 5 requires it.
- **M3.** `runAlone` (test/fx008-probes.test.mjs:89–101) uses `tmpdir()`
  and a 120 s go-build timeout that does not group-kill. This matches
  support.mjs and is acceptable. Noted only because engineering.md already
  documents that limitation for the batch.

## Code quality

- All files are within the line limits: the largest is 124 lines, all are
  ≤ 250, and none is close to the limit.
- The structure follows test/*.mjs: named helpers, `node:test`, and
  `assert/strict`.
- No check is weakened, except the null-hash skip (I2).
- Lines over 80 columns are only the hash and data lines. Existing tests
  have them too, and the width is not enforced for JS.
- Runtime fits the parallel phase: 6 s total, slow compiles under 0.7 s
  against a 20 s budget, and one batch build.

## Re-review: fix round 1 (71d6263)

Verdict: **all addressed. Spec ✅, Quality Approved.**

Ran: the gate in a scratch copy at 71d6263. The baseline is 107/107. Each
mutation below ran in that copy and was then restored.

| Item | Status | How I confirmed it |
|---|---|---|
| **I1** | ADDRESSED | The kit is now `{…, flipped: false, ...change}`. I added `flipped: true` to dup's change, and `probe dup` FAILS (dup is still accepted today). Two new consistency tests also hold: `{ flipped: true }` on f2 with no change fails with `f2: no task`, and an fx008 change on f3 with no task fails with `f3: no task`. |
| **I2** | ADDRESSED | test/fx008-probes.test.mjs:79 now requires a 64-hex hash before it compares. I flipped f1 to `fx008: ok('1\n2\n', null)` and `probe f1` FAILS with `Go hash not pinned`. The tamper test failed too, as expected. gain1 flipped while still rejected fails on `expected acceptance`. |
| **r5 ruling** | ADDRESSED | The r5 entry is now: today `ok('', 11c749…)` (unchanged), fx008 the same pattern as n1 at 138-148, task 5, a reason that includes report-before-pin, and `slow: true` (which the controller accepted). The hash was updated. |
| **M1** | ADDRESSED | engineering.md:162 lists the slow accepted probes under "Not batched", with the reason. |
| **M2** | ADDRESSED | `predicted` is added for p5, r1, r2 and tp1. It is hashed, so a change to it is caught. The report-before-pin note is now in the reasons for dup, n1 and r5. |

Plan diff (`git diff HEAD~1 -- docs/plans/…`): only r5 lines changed.
- In the Task 1 flip table, the n1 row now reads `n1, design-review/r5`.
- In Task 5, the intro, Files, Step 1 (a new `r5 has no finite solution`
  test), Step 2 and Step 5 (report r5's message) now include r5.
- Nothing else in the plan changed.

New breakage: none.
- Every file is at most 143 lines.
- docs/progress.md, BACKLOG.md and docs/sdd are untouched, and the worktree
  is clean.

Two trivial nits, both optional:
- Task 1 Step 6 still says "PASS (105 tests)"; it is now 107.
- The new Step 1 line at plan:718 is longer than the surrounding wrap.
