# T008 review: linear settling for shared tails (9a62014..33f9854)

**Verdict: Approve with fixes.** No Critical issues. `boundAt` gives the same
result as the hop-by-hop walk in every state the unifier can reach. That
holds under one precondition that nothing asserts. Fix I1 and I2 before
the whole-branch review. The Minor items can go in the same follow-up commit.

## Evidence (reviewer runs, 2026-10-12, worktree output at 33f9854)

- **Property test against a naive walk.** The script is
  `scratchpad/alias-prop.mjs`, in this session's scratch directory. It runs
  over the compiled `output/` and makes 3,000 random binding sequences of 40
  operations each, using 24 metas. Each operation calls `Binding.bindTail` on
  an unbound meta. The new row is one of these: a bare meta (60%), closed, a
  bare rigid, a labelled row with a meta tail, or a labelled closed row. With
  probability 1/8 the sequence reverts to an earlier snapshot, which models a
  postponed pair. After every operation, every meta is checked:
  `RowSide.expanded` (labels, `Extended m` occurrences and tail) and
  `Subst.walkRow` (labels and tail) are compared with a naive walk over
  `rows`.
  - Realistic mode, where the target is an unbound end: 2,446,656 checks,
    0 mismatches, 135,607 real jumps.
  - Adversarial mode, where the target is any meta, including bound members
    and bound ends, but never a cycle: 2,495,736 checks, 0 mismatches,
    138,644 jumps.
- **The cases you asked about all agree with the naive walk:**
  - a hop whose class end is later bound to a labelled row;
  - a class end bound to a rigid or closed tail;
  - an end bound to a member of another class (the unmerged `otherwise`
    branch);
  - an alone meta joining a class at its far end (the third branch);
  - reverts.

  `Extended` occurrences agree because the hops carry no labels: every label
  reached through a jump comes from the end's own binding. A hop-by-hop walk
  attributes it to that same meta.
- **Precondition, shown by a mutant of the test.** In one of four operations,
  the test was allowed to rebind an already-bound meta. That gave 21,128
  mismatches out of 2,543,136 checks: a member rebound to a bare row keeps
  jumping to its old class end. The current code never does this. Every
  `bindTail` and `extendRow` call (RowFinish.purs:94, 110-112;
  UnifyRow.purs:193) binds a tail of the `current` sides that `step`
  (UnifyRow.purs:127-131) has just re-expanded with `expanded`, so the tail is
  unbound. `stageLabel` touches marks only.
- **Reverts and other places that build a Subst.**
  - The only writers to `rows` are `bindTail`, `extendBounded` and `compose`.
  - A postponed pair restores `operands.start`, the whole record, so the
    aliases revert with it.
  - The retry pass (Unify.purs:64), `Install` (Install.purs:116), `Consume`
    (Consume.purs:206) and the watch and mark updates all use record update,
    so they keep `aliases` consistent with `rows`.
  - `compose` resets the aliases. That is sound, because an empty table walks
    hop by hop, and `compose` is used only in tests.
  - `substitution` (Subst.purs:229) still walks hop by hop through
    `Type.substituteRow`. That is correct, and it is not on the hot path.
- **Equality and order.** `Subst` has no Eq, Ord or Show instance. Nothing
  iterates over `aliases`. `isEmpty` reads `types` and `rows` only, and
  `aliases` is non-empty only when `rows` is.
- **Timing.** `node --test test/fx008-install.serial.test.mjs` at load
  average 4.25: both tests pass. The 1,000-installation test took 608 ms. The
  ratio test measured 408 ms and 793 ms, a ratio of 1.94.
- **Not re-run by the reviewer:** `npm run verify`, the differential, and the
  `fx008-install-linear` mutant. No isolated copy was made.

## Critical

None.

## Important

**I1. `Features.Check.Aliases` has no correctness test. Only timing guards
cover it.**
src/Features/Check/Aliases.purs:51-87;
test/fx008-install.serial.test.mjs:34-68.
`landing`, `aliased` and `jumped` decide every row walk. AGENTS.md says
public semantic formulas get their own tests. The ratio guard and the mutant
row catch a loss of speed, but not a wrong jump. The differential corpus may
never reach the third branch of `aliased` or the `otherwise` branch.
Fix: add `test/aliases.test.mjs`, a parallel test using a fixed seed, about
300 sequences of 40 operations each, under 2 s. It should:
- build random `Binding.bindTail` sequences over 24 metas, binding only
  unbound metas;
- use these row kinds: a bare meta, closed, a bare rigid, a labelled row with
  a meta tail, and a labelled closed row;
- skip any binding whose naive tail is the meta being bound;
- revert to a random earlier snapshot with probability 1/8;
- after each operation, check every meta: `RowSide.expanded` from
  `{ entries: [], next: 0, tail: Just (Meta x) }` must equal a naive walk
  over `rows` in its labels, its `Extended` metas and its tail, and
  `Subst.walkRow` must equal it in its labels and tail;
- assert that at least one jump happened, meaning `boundAt` returned a meta
  other than `x`, so the test cannot pass vacuously.

`scratchpad/alias-prop.mjs` in the reviewer's session already does this and
can be adapted. Then show that the test fails in an isolated copy with a
broken jump. Use this replacement at Aliases.purs:59, which changes case 3 to
use the wrong landing:
```
-      { reach = Map.insert meta (classOf aliases next) aliases.reach }
+      { reach = Map.insert meta meta aliases.reach }
```
Alternatively, make `hop` return `Tuple end (open end)`. Add the row to
`scripts/regression-fx008.mjs` beside `fx008-install-linear`.

**I2. Write down the precondition that soundness rests on.**
src/Features/Check/Aliases.purs:15-30; src/Features/Check/Binding.purs:81-82.
A jump is equal to the hop-by-hop walk only if no bound meta is ever bound
again. If a class member is rebound to a bare row, `jumped` follows the old
class end. The reviewer's mutant shows this: 21,128 mismatches out of 2.5M
checks. Today the unifier only binds tails that `step` has just re-expanded.
Nothing states this rule, and a future caller such as a settle or sync
shortcut could break it without any test failing.
Fix: add this paragraph to the Aliases header comment:

> Precondition: only an unbound meta is ever bound (`bindTail`,
> `extendBounded`). The unifier binds only tails that `step` has just
> re-expanded. Rebinding a member would leave its jump pointing at the old
> end.

Add one line above `bindTail`: "`meta` is unbound (see
Features.Check.Aliases)." The I1 test then pins the behaviour.

## Minor

**M1. Declaration order.** In src/Features/Check/Aliases.purs, the private
`classOf` (lines 36-37) comes before the public `landing` and `aliased`, and
the private `alone` (lines 64-65) comes before the public `jumped`.
AGENTS.md: types, constants, public functions, then private functions. Fix:
move `classOf` and `alone` after `jumped`.

**M2. Computed fallback.** src/Features/Check/Aliases.purs:87 uses
`fromMaybe (open end) (Map.lookup end table)`. AGENTS.md: "Computed Maybe
fallbacks use `maybe'`". Fix: name a helper in the `where`, for example
`unbound _ = open end`, and write
`Tuple end (maybe' unbound identity (Map.lookup end table))`.

**M3. Unneeded export.** `landing` is exported at
src/Features/Check/Aliases.purs:4 but no other module uses it. The mutant
needle matches its text, not its export. Fix: remove it from the export list.

**M4. `compose` comment.** src/Features/Check/Unify.purs:79-86 lists how
each field is combined but does not mention `aliases`. Fix: append "The
aliases are dropped. An empty table walks hop by hop, so this is always
sound."

**M5. Stale evidence in the install test.** In
test/fx008-install.serial.test.mjs:7-14, the header still says "5.2 to
6.3 s now", but the measured cost is now 0.4-0.6 s. That leaves the 9.5 s
bound about 16 times above the measured cost. Fix: add a sentence: "Since
T008 (33f9854) the check takes about 0.5 s; this bound still separates the
Task 8 regression, and the ratio test below guards linearity." Do not tighten
the bound in this change; T007 covers timing on slower hosts.

**M6. Inconsistent ratio figures and long lines.**
- test/fx008-install.serial.test.mjs:38 and :42 give the old ratio as 4.5,
  while the plan's T008 note gives 4.27. Fix: use one figure in both places,
  for example "4.27 (best of 3; 7.9 s then 35 s as single runs)".
- Lines 43 (85 columns) and 67 (81 columns) exceed 80 columns. Fix: reflow
  them.

**M7. Residual quadratic shapes: record them in BACKLOG, don't fix them now.**
The T008 row in BACKLOG.md on the ledger branch (fx008, from 0da02cf) is
still Open, and its next action is the feed-graph fix. Fix, on the ledger
branch:
- Mark T008 Done and point to 33f9854. Record the evidence: 1,000
  installations went from 7.9 s to 0.5 s, 2,000 from 35 s to 1.0 s, and the
  guard ratio from 4.27 to 2.0 against a bound of 3.2. Correct the cause from
  the feed graph to alias-hop chains.
- Open a new row, either T008b or the next T number, for the two shapes
  that remain:
  - **Labelled `extendRow` chains.** A walk's cost is already proportional to
    the labels it returns, so this is quadratic only when N consumptions each
    read N labels of one row.
  - **Unmergeable alias hops.** These come from the `otherwise` branch in
    `aliased`, when an end is bound into another class. They cost one extra
    hop per class boundary.

  Neither shape is known in a real program. Next action: make a probe that
  counts `otherwise` hits and the longest labelled chain over the
  differential corpus, then decide from that measurement.

## Notes on the specific questions

- **The ratio guard is sound.** Taking the best of 3, after a 20-installation
  warm-up, is a reasonable defence against noise. A bound of 3.2 sits between
  the measured 2.0 (1.94 in the reviewer's run under load 4.25) and the
  pre-fix 4.27. Load affects both timings, so the ratio is more stable than
  an absolute bound. The guard adds about 4 s of serial time.
- **The mutant row is meaningful.** `| true = aliases` leaves the tables
  empty, which is exactly the old `boundRow` walk. At 2,000 installations
  the timeout is 12 s, between about 1 s now and 35 s before. As
  regression-fx008.mjs says, the margin depends on the machine.
- **Budgets and layering are fine.**
  - File lengths: Subst.purs 241 lines (was 246), Aliases.purs 87,
    Links.purs 19, Binding.purs 158.
  - `Domain.Row.isBare` is a pure row predicate beside `isPure`. Features
    importing Domain follows the layering rule.
  - Moving `linkTo` and `linkOf` into `Features.Check.Links` is a sensible
    split that keeps Subst.purs within budget.
  - `jumped` takes `bare` and `open` as parameters, which keeps Aliases
    independent of the row types. That is acceptable.
