# Review: FX008 Task 6 (hook infrastructure), fx008-impl 418cd38 (base b5fab7c)

[ran] = executed by the reviewer; [read] = from reading the code.
Scratch copy: /private/tmp/claude-501/fx008-t6-mut (rsync of the worktree
without `.build`, incremental `spago build`); mutant script in the
session scratchpad (`mut.py`). The worktree was not modified.

## Verdict

- **Spec ✅.** Watches, the registry, `Site`, `Entry`/`EntryTail` and
  `entries` match the Task 6 interfaces. Every row-meta binding goes
  through the two noted sites. The watch is plain data that nothing in
  unification reads. The refactor commit is a pure move. The probe table
  and regression files are untouched.
- **Quality: Needs fixes.** I1: the postponed-pair test is vacuous. No
  watched meta is bound before the pair is set aside, so the test passes
  even when the revert does not restore the watch. It needs a one-line
  change to the test. The rest is Minor.

## What ran

- `.build/task6-verify.log` exists (09:47, after the last source edit at
  09:41 and before the 09:53 commit). It shows 1146/1146 parallel, 34/34
  serial, the four Task 5 regression proof lines and the final
  "Verified compiler, gates, …" line [ran]. Neither
  test/fx008-probes.test.mjs nor the regression files appear in
  `git diff --stat b5fab7c..418cd38` [ran].
- `node --test test/fx008-watch.test.mjs` in the copy: 4/4 pass [ran].
- Refactor 01cbe77: every line removed from Handler.purs reappears in
  Handle.purs, apart from the module header and two imports [ran].
- Row-meta binding sites: `grep "rows = Map."` finds only
  Binding.purs:82 (`bindTail`) and :122 (`extendBounded`), and both call
  `noteBound` [ran]. `compose` is called only from tests [ran]; its own
  comment says the same.
- Nothing compares substitutions or states for equality. Settle's exit
  test compares label counts, and the `postponed` count is unchanged.
  Adding `watch` to Subst and `restricted` to State therefore cannot
  change a result [read].

## Mutation results [ran]

Each mutant was applied alone in the copy, followed by `spago build` and
`node --test test/fx008-watch.test.mjs`.

| Mutant | Result |
|---|---|
| `bindTail` drops `noteBound` | "binding a watched tail…" fails; the other 3 pass ✅ |
| `extendBounded` notes `Nothing` (fresh tail not watched) | "extension … watches the fresh tail" fails ✅ |
| Postponed pair keeps the progressed watch (UnifyRow `consume` passes `operands { start = start with pending.subst's watch }` to `postponed`) | **all 4 pass** ❌ (I1) |
| `bound` marks unwatched metas dirty | "unwatched bindings mark nothing" fails, and the extension test fails too ✅ |

With the revert test strengthened to `watching(10, 11)` and expecting
`watched` = `[10, 11]`, it passes on the healthy build and fails on the
revert mutant [ran].

## Issues

### Important

- **I1. test/fx008-watch.test.mjs:36-44: the revert test cannot fail.**
  Only meta 10 is watched. Before the deferred `fail` label postpones the
  pair, the unifier extends only the right tail, 11 (for label `2`).
  Meta 10 would be bound only in `finish`, which is never reached. No
  watch change happens, so there is nothing to revert, and a unifier
  that kept the progressed watch passes (mutant above).
  **Fix:** watch 11 as well: `solved(unifyRows(left, right,
  watching(10, 11)))`, and assert `dirty(subst)` = `[]` and
  `watched(subst)` = `[10, 11]`. Verified: passes healthy, fails the
  mutant.

### Minor

- **M1. Unify.purs:96 / TailWatch.purs:43-48: `compose` should keep the
  later watch rather than union the two.** Under compose's precondition
  (`later` was made from `earlier`), the later watch already contains
  the earlier one. A union brings back the watch on a meta that `later`
  bound, which contradicts deviation 2. `marks.edges` uses the later
  value for this reason. It has no effect today because only tests call
  `compose`, and it does not affect the revert, which never composes.
  **Fix:** `watch: laterBindings.watch`, remove `unionWatch`, and update
  the comment to match the edges sentence.
- **M2. Settle.purs:134 (`remaining entry (Row _ tail)`): the remainder
  row's labels are silently dropped.** This is safe only while φ is
  always a bare `Row [] (Just (Hole h))`, which is how Task 7 creates it.
  The branch also ignores `entry.ignoreMarks` and `entry.sites`: it
  always consumes ignoring marks, so the `Remainder` tail implies the
  mode. **Fix:** say both in the comment ("φ is created bare; a
  Remainder entry always ignores marks"), or append φ's labels to the
  stage.
- **M3. SettleEntry.purs:57: `maybe Fresh Remainder (remainderOf found)`
  falls back to `Fresh` when the group is missing.** That fallback is
  exactly the `fx008-settle-phi` mutant. `registerClause` always inserts
  the group, so the fallback is unreachable today, but a group-merge bug
  in Task 7 would quietly turn into the mutant's behaviour. **Fix:** add
  a comment naming the invariant (every clause's `group` is in `groups`),
  and ask Task 7's reviewer to confirm that merging keeps it.
- **M4. Subst.purs is at 246 (+5) and Unify.purs at 235 (+2).** The
  Global Constraints list both as near the limit, with growth "offset in
  the same task". The task as a whole shrank (Handler −50, Settle −22),
  but these two files did not. Subst.purs has 4 lines of headroom left.
  No action is needed now (Task 7 does not touch Subst.purs). Record the
  headroom in the ledger.

## Declared deviations

1. **TailWatch.purs split from Watch.purs: accept.** Subst needs the type
   and Watch needs Subst, which is a real import cycle. Watch re-exports
   TailWatch, so callers import one module.
2. **Binding a watched m removes it from `watched`: accept.** A bound meta
   is never bound again. Its single change is recorded in `dirty`, and
   `dirty` survives until `takeDirty`. A chain m→m2→m3 before `sync`
   leaves both m and m2 dirty, so `byTail[m]` is still reached. Task 7's
   `sync` re-watches each entry's resolved unbound tail itself
   (`watchTail m; byTail[m] += e`), and the plan already drops
   `byTail` entries whose meta is bound. A postponed pair restores the
   whole Subst, removed watches included. Removal also keeps `watched`
   bounded by the live tails. The one inconsistency is M1.
3. **Site moved to Site.purs: accept.** It breaks the
   Scheme ↔ Restricted dependency; a pure move.
4. **Entry, EntryTail and `entries` in SettleEntry.purs: accept.** It
   keeps Settle.purs at 150 lines.
5. **`entries` already builds clause entries and `consume` handles
   `Remainder`: accept. This is in the plan, not speculative.** Task 6's
   Files say Settle gets "entries from the registry, modes, EntryTail".
   The interface is `entries ∷ Restricted → Array Deferral → …`. Step 3's
   "(deferrals only, as before)" describes the output while the registry
   is empty. The code follows Task 7's Settle bullet: c→R `ignoreMarks`,
   `Remainder φ`, consumed like S's `Row labels (Just φ)`; c→C
   Directional, `Fresh`; both `keepFail`, origin the handler span,
   position the handler start, which puts clause entries before
   deferrals per P14. It is unexercised. Its proof is Task 7's
   `fx008-settle-phi` row, and Task 7's reviewer should check M2, M3 and
   the `consumed: Application` origin kind there. Removing it would only
   move the same code into Task 7.
6. **Register signatures: accept.** `registerClause id group entry`
   leaves `Restricted` independent of `Subst`, so the caller pairs it
   with `watchTail`. Note that it overwrites `groups[entry.group]`. That
   is right for Task 7, which always registers into a new group, but
   would reset an existing group's representative.
7. **`compose` unions watches: change to the later watch (M1).** Union is
   harmless for the only callers (tests) and does not interact with the
   revert, which restores `operands.start` and never composes.

## Hot paths [read]

Every `bindTail` and every extension pays one `Set.member` and builds an
array of at most one element. With nothing watched, that is a lookup in
an empty set. Under Task 7 it is O(log w) per binding. Nothing iterates
`watched` and nothing is quadratic. `takeDirty` is O(dirty). `entries`
sorts once per `settleRestricted`, as before.

## Style [read]

No lambdas or let-in. Comments explain the reasoning: why the watch
lives in the substitution, and why ties put clause rows first. All the
new files are well under 250 lines. purs-tidy and the style tool pass
inside verify (from the log). `watchedTails` is exported only for the
test; that is acceptable, and `sync` may use it.
