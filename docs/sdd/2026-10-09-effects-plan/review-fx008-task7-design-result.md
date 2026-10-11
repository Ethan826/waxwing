# FX008 Task 7 design pre-review

Reviewed: `/Users/ethan/Desktop/waxwing-fx008-impl/.build/task7-design.md`
(150 lines) against plan Task 7, Global Constraints, P13/P14, and design
§3.4 (the one-way hook, F1′, F2, corrections T and S, the tail pass), with
review-fx008-rev10-result.md (N1, 1b) and review-fx008-rev9-f1f2-result.md
(3g). Code read at c8503f9: Consume, RowFinish, Restricted, Watch,
TailWatch, Settle, Cycle/Feed, Apply, Call, Pipe, Hint, Require, Infer,
Handler.

## Verdict: Approved with amendments

The data model, the round structure (F1′ for all affected, then F2, then
the consumption step, repeated until nothing is affected), the signature
(counts, group, kind), "grew" vs "changed", the cost argument and the
TailPass termination are right. Two defects must be fixed before coding:
F1′'s "grew" branch departs from the plan in a way that breaks the φ link
and makes groups depend on drain order (A1), and the tail pass's Hole branch,
as written, rejects programs accepted today (A2). One `open` caller is
missing (A3), and the Hint site may not be dropped (item 5).

## Rulings on items 1-9

1. **Groups.purs: accept.** Global Constraints say new code goes in new
   modules, and Sync plus the group and signature helpers would exceed 250
   lines. Groups is imported only by Sync (and Clauses, if it builds the
   first Group). Name it in the report as a file-map addition so the
   controller can record it in the ledger.

2. **F2 on the closure reachable from the affected rows: accept. This is
   the plan's reading, not a departure.** The design note says "the search
   starts only from dirty rows", and rev9 3g says "on the c→R edges
   reachable from the changed rows". `positiveCycle rows feeds starts`
   already searches only `components feeds starts`. Building `rows` and
   `feeds` over the whole registry is what would break T003. Soundness: by
   rev10 1b, every up-to-date hook edge has weight count(c) − count(R) ≤ 0,
   so a positive cycle cannot appear unless some row's signature changes.
   A signature changes only through a binding or extension of that row's
   watched tail, which makes the row dirty and so affected. If a positive
   cycle goes through an affected row, the BFS from that row covers the
   whole cycle. A cycle can still become closed through an R tail binding,
   since R tails are not watched. It then has no affected row, but it
   cannot grow anything until a consumption extends a clause tail on it.
   That makes the row affected, and the next round reports the cycle,
   "after at most one finite consumption", as the design allows. Settling's
   `rejectCycle` over all entries is the backstop. Conditions, which the
   design already meets and must keep: (a) successors are computed after
   F1′ has filed every affected entry under its new tail; (b) a rigid or
   closed R tail has no successors; (c) a start index is the affected
   row's index in the closure array.

3. **The loser keeps its `groups` entry: accept.** φ stays consistent: the
   merge's `consumeIgnoring` unifies φ(loser) with φ(winner)
   (`unifyRowsTraced` binds the larger meta to the smaller), so every later
   read of φ(loser) resolves to the same class. This covers T's stage,
   Settle's `Remainder φ(group)` (SettleEntry reads
   `groups[e.group].remainder`, and Settle resolves its tail) and the tail
   pass. After the merge, only the merging entry gets the winner id. The
   other members keep the loser id, and the byTail-based `groupAt` (see A1)
   may return it. That is harmless: the ids name one φ class, a repeated
   merge consumption binds nothing, and a changed id costs at most one
   idempotent re-consumption by T. Do not read `representative` to look up
   a group: the loser's representative is stale. Amendment A4 makes this
   explicit.

4. **T in the tail pass: accept the reading, which is the plan's own
   definition and not a departure.** The plan's sentence before it says
   "ensure `inference` and `clauses` end in ϱ", so "T" ranges over each of
   the two targets in turn. The design note says the same in §3.5 ("needs R
   and C to end in ϱ") and in §3.4 ("binds R's tail through the hook during
   checking, and C's through the tail pass. The pass is a no-op for R when
   R already ends in the same rigid tail"). T is not correction T's target,
   not the clause's own row, and not R alone. However, the way the design
   implements "ensure T ends in ϱ" is wrong; see A2.

5. **No sync at Hint.hinted's caller: reject.** Both reasons fail. "No
   unification" is beside the point: `hinted` reads
   `headOf state expected`, and a sync can bind a type meta in `expected`
   through label-argument pairing as c is consumed into R. Today R is c,
   so that binding is already there. "Require follows a node whose sync
   already ran" is false. `require` is called partway through nodes (Call
   argument unification, Apply.applyNext after `infer` and `open`, Arms,
   Handle, Defer, Handler), after unifications that may have dirtied clause
   tails. The design note lists Hint as an eager decision, and the plan
   lists the site. See A5 for the instruction.

6. **The gate instruction: confirmed, the stated instruction is wrong.**
   Put `sync` after `inferNode` and before `bounded`. This matches today,
   where R is c and `bounded` sees the bindings `inferNode` made. Do not
   decide the order from the gate, and do not move it to make the gate
   pass. Correct instruction: "If the gate shows any change to a probe not
   listed for Task 7 (gain1, p5, r1, r2, ec1, tp1), whether in outcome,
   text, span or Go hash, STOP and report the probe, the old and new
   results, and the sync placement. Do not reorder sync and `bounded`, do
   not flip or re-pin anything, and do not continue. For the listed probes
   whose plan entry gives a pattern (p5, r1, r2, ec1, tp1), report the
   first observed text to the user before pinning it."

7. **Postponed pairs: accept the conclusion; correct the reasoning.** A T
   (or merge) consumption that meets a deferred `Fail` key postpones the
   **whole** pair: `unifyRowsTraced` reverts the substitution, and the watch
   with it, and appends the pair to `postponed`. R then lacks all of c's
   labels, not just the `Fail`, until the pair is decided. Sync has already
   recorded the new signature, so it will not retry. Recovery: settling's
   step (a) (`settleKeys`) retries the pair, step (d)'s c→R `Remainder φ`
   entry re-consumes c into R every round, and an undecided pair ends as
   `Fail needs a concrete error family`. Final acceptance is therefore
   unaffected. Sync must not handle postponed pairs itself: retrying would
   re-postpone, and an unrecorded signature would only add duplicate pairs.
   Today the postponed pair is the clause body's own consumption. Under the
   hook it is the c→R stage, so an eager decision made between the
   postponement and settling may see a smaller R. The design accepts this
   ("Postponed pairs revert `dirty` with their bindings"), and the probe
   gate is the check. If any unlisted probe moves for this reason, stop
   (item 6). State this in the report as an observation for Task 12.

8. **Call sites: one missing, one wrongly dropped, none extra.** The
   `headOf` callers are Handler.withHandler, Apply.open (callers
   `applyNext` at Apply.purs:80 and `applyValue` at :99), Hint.hinted
   (caller `Require.require`), and `functionLike` (callers
   Call.overApplied :123 and :125, Pipe.checkPipe :36).
   - Infer.infer, withHandler, Call.overApplied (both `functionLike`),
     Pipe.checkPipe and Apply.applyValue: correct.
   - **Missing: `Apply.applyNext`, before its `open`.** From the second
     argument on, its state comes after `require` and `consumeAt`, which
     can bind clause tails. See A3.
   - **Dropped: `require` (Hint).** See A5.

9. **No Task 7b: accept.** scripts/regression-fx008.mjs is 25 lines and
   test/regression-fx008.mjs is 85, so both have room for ten rows under
   250. If a file passes 230 during implementation, report it and ask for
   the 7b split; do not compress rows to fit.

## Amendments to forward to the implementer

**A1 (Critical: F1′ "grew" branch and `groupAt`).** Replace §3 step 2's
first two branches with the plan's text:
- Hole m, `e.signature ≠ Nothing`, and `grew`: `e.group := groupAt m` if it
  returns a group. Otherwise create a new group (fresh id and fresh φ meta)
  with representative m. Do not merge φ(old e.group) in this branch: an
  extension starts a new class (rev10 N1).
- Else, if `groupAt m = g′` and `g′ ≠ e.group`: merge as designed.
- Else: keep the group and set its representative to m.
- `groupAt m` = the `group` of the first id in `byTail[m]`, **whatever its
  signature**. Drop the `signature ≠ Nothing` filter.

Why: the design always makes a new group when counts grew, which
contradicts the plan ("e.group ← groupAt(m) or a new group"). It also
breaks the φ link. Suppose A's tail t is bound to `[L | m]`, where m is
clause B's undisturbed tail. A gets a fresh φ unrelated to φ_B, so R_A and
R_B no longer share a tail, though today's R_A = c_A and R_B = c_B share m.
That is the compatibility argument's map and fx008-phi's failure shape.
With the filter, the result also depends on drain order. Take a pending
fresh clause F and a grown clause A that share m in one round:
- If A drains first, A gets a new group gA. Then F finds `groupAt m = gA`
  and merges, so F and A are linked.
- If F drains first, F keeps gF and is filed under m with signature
  Nothing. Then A grows and gets a fresh group anyway, so F and A are not
  linked.

That breaks Review Focus 1, where acceptance must not depend on merge or
drain order. The plan's version gives one φ class in every order.

**A2 (Critical: tail pass, Hole branch target).** In `ensureEnds`, resolve
target T (each of `e.inference` and `e.clauses`) to `Row ls tl`:
- `tl = Just (Hole t)`: `consumeIgnoring { origin, stage: Row [] (Just ϱ),
  target: Row [] (Just (Hole t)) }`. The target is **T's tail only**, so
  the effect is `t := ϱ`.
- `tl = Just ϱ` (the same rigid variable): nothing.
- Otherwise (closed, or a different rigid variable):
  `consumeIgnoring { origin, stage: Row [] (Just ϱ), target: T }` over the
  whole T. It always fails and gives the missing-capability error naming
  T's labels (tp1's `f performs Console…`). If it returns Right, which it
  cannot, return the state unchanged.

Why: `consume` is row unification (RowFinish `knownExtra`). Target labels
missing from the stage must go into the stage's tail, and ϱ is rigid, so
any label gives `RowExtra`. Consuming `Row [] ϱ` into a whole
`T = [Console | t]` rejects every clause that performs a label and also
ends in a rigid tail, for example `log(n) => { print(n); cb(()) }`. Its C
is always `[Console | t]`. Its R is `[Console | φ]` with φ unbound when the
tail became rigid only in settling, because F1′ does not run in settling.
The design note's own wording is "bind the target's unbound tail meta to
ϱ".

**A3 (Important: missing `open` caller).** Add
`synced ← sync env applying.state (Resolved.exprSpan argument)` in
`Apply.applyNext` before `open`, and pass `synced` to `open`. Use the same
span as `open` (P13: the site before which it runs). Apply.purs grows by
about 2 lines.

**A4 (Minor: merge bookkeeping, write down the invariant).** In Groups.purs,
add a comment that group ids are not canonical. After a merge, other
members may still carry the loser id. Every φ read must go through
`resolvedRow` and never compare ids for φ identity. `representative` is
written but never used for lookup. On merge, set the winner's
representative to m. Leave the loser's entry and do not relabel the other
members: relabeling would cost the class size per merge.

**A5 (Important: Hint site).** Keep the plan's site. Change
`Require.require`'s env type to `CheckEnv` (extended with the `Declared`
fields it already needs, which CheckEnv includes). Its callers (Apply,
Arms, Call, Defer, Handle, Infer, Handler) are expected to hold a CheckEnv
already. In the failure branch only, compute the hint from a synced state:
`hint d = Left (hinted env (either (const state) identity (sync env state (Checked.spanOf actual))) expected actual d)`.
The synced state never escapes, because the branch returns Left, so the
success path, its cost and every accepted program are unchanged. If any
caller of `require` lacks a CheckEnv, stop and report. Do not drop the
site.

**A6 (Minor: byTail duplicates).** `registerClause` already appends the id
to `byTail[t]`. In F1′, append e to `byTail[m]` only if `m ≠ e.tail` or
the id is not already there. Otherwise a pending clause whose tail did not
move is listed twice, which duplicates F2 rows and makes `groupAt` scan
more.

**A7 (Minor: gate instruction).** Replace open question 4's "flip if the
gate shows a text move" with item 6's instruction above.

## Core algorithm against the pseudo-code

- **Order:** F1′ for all affected rows, then F2, then T, per round. This
  matches the plan, and the F2 error comes before the round's consumptions
  (design: "F1′ merges, then F2, then consumption"). Correct.
- **Repeat loop termination:** a round with no affected rows ends the
  loop. Rows become affected only when pending (once) or when their tail is
  dirty. A rename does not change the signature, so T does nothing
  (correction T). φ merges, rigid and closed tails each remove a class, and
  extensions keep the class count (rev10 1c). So the bound
  (N0+n_c+1)(2n_c+1)n_c holds once A1 is applied. With A1 unapplied, every
  member of a class gets its own fresh φ on each extension, and the bound
  argument no longer holds.
- **Cost:** O(dirty + pending + F2 closure + labels of affected rows). A
  sync with nothing dirty or pending is O(1). Keep test 6.
- **Merge direction:** e.group gets the smaller id, which is fine. φ
  identity comes from unification, not from ids (A4).
- **Signature:** "grew" (some key's count increased) chooses the new class;
  "changed" (counts, group or kind) triggers T. Taking the signature after
  F1′ is correct, so a new group counts as a change.
- **TailPass termination:** each productive round binds a distinct unbound
  R or C tail meta to ϱ (with A2, exactly that meta), and a bound meta
  cannot be bound again, so rounds ≤ the number of R and C rows. The
  repeat is needed because an R tail can be a clause tail: `with h` inside
  another clause's body makes R ≡ c_j, so binding R's tail can make c_j
  rigid.
- **Review Focus 1 (three handlers merging in settling, all six orders):**
  with A1, the φ classes after any drain order are the same union of the
  classes the merges joined. Group ids may differ, but only ids, which
  never decide acceptance (A4). Settling then consumes `labels(c) + φ`
  through S. Without A1, order changes which φ a grown clause joins.
  Test 3 of §8 must run all six orders against the amended code.

## Other notes (no change needed)

- Registering a clause after its body, with C consumed at filing through
  `consumeLabels` (throwaway tail, so c is not bound), is right. T not
  re-consuming C matches the plan: sync only feeds R.
- Clause ids, group ids and φ all come from `state.next`, which is fine.
- Open questions 1 and 7 (ec1's P14 order: stop if it fails; report
  pattern texts before pinning) match the plan.
