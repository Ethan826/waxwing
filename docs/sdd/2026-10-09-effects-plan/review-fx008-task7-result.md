# Review: FX008 Task 7 (clause own rows, `sync`, S, tail pass), fx008-impl 9358d79 (wip 8dd22be, base c8503f9)

[ran] = executed by the reviewer; [read] = from reading the code.
Copies: a `git worktree` of c8503f9 and one of 9358d79, both under
/private/tmp/claude-501/fx008-t7rev, each built with `node scripts/build.mjs`
(`.spago` symlinked, nothing copied from `.build` or `output`). Mutants ran
in the 9358d79 copy against `node --test test/fx008-probes.test.mjs
test/fx008-hook.test.mjs test/fx008-settle.test.mjs` (138 tests). Both
worktrees and the directory have been removed (`git worktree list` shows only
the two real worktrees). Nothing in the worktree was changed or committed.
The full verify was not rerun; the controller's log is taken as given.

## Verdict: Spec ❌, Quality Needs fixes

- **Spec ❌ (C1).** The plan's Step 1 guard "nested handler literals stay
  linear" (Task 2 re-review c2) is not met. Its committed shape cannot see the
  defect. The shape c2 describes is exponential: depth 14 takes 1.8 s against
  7 ms on base, and depth 20 takes about 2 minutes. The plan amendment in
  this diff records this as an accepted, untested "Limitation". Task 2 set
  the precedent: its C1 was the same doubling, and it was ruled Spec ❌ and
  fixed in the representation.
- **Quality.** The hook algorithm matches the amended pseudo-code and
  A1-A7 (§3 below). Three guards are missing or deviate (I1-I3). The rest
  is Minor.

## C1 (Critical): a literal whose clause performs `L(type of another literal)` doubles per level

**Measured** [ran]. The chain is
`let h0 = handler Log { log(n) => () }; let h{i+1} = handler Log { log(n) => put(h{i}) };`
inside `main`, with `effect Cell(a) { fn put(x: a): Unit; }`. Each figure is
one warm in-process `compile`.

| depth | base c8503f9 | 9358d79 |
|---|---|---|
| 4 | 4.5 ms | 11.7 ms |
| 8 | 7.4 ms | 50.8 ms |
| 10 | 5.5 ms | 139 ms |
| 12 | 6.5 ms | 468 ms |
| 14 | 6.7 ms | 1,788 ms |
| 20 | 10.9 ms | ~2 min (extrapolated; the 20/30 runs were cut off) |
| 30 | 20.2 ms | — |

- The literals nested inline in one expression
  (`put(handler Log { log(n) => put(…) })`, no `let`s) behave the same:
  depth 14 takes 1,499 ms against 5.9 ms on base [ran].
- The committed test shape (`with h{i} { put(h{i-1}) }`) stays linear on
  both builds: depth 60 takes 158 ms against 116 ms [ran].

**Root cause** [ran, read]:
- c_i holds `Cell(a_i)`, with a_i bound to τ_{i-1}, the type of h_{i-1}. The
  hook gives that same label to both of the literal's rows:
  - C_i at filing (`consumeLabels`, Clauses.purs:133-136) and again in
    every settling round (the c → C entry, SettleEntry.purs:61);
  - R_i through T (Sync.purs `push`) and S.
- So τ_i = `Handler(Log)` {R_i ∋ τ_{i-1}, `Just` C_i ∋ τ_{i-1}}. The
  substitution graph stays linear, but every pass that walks a type through
  the substitution as a tree pays 2^i. The profile at depth 14/15 [ran]:
  - Binding.step: `exceedsLimit`, plus `bindBounded`'s and `extendRow`'s
    `resolve`, on every binding and row extension (Binding.purs:45, 95, 102);
  - `Subst.resolvedLabels`;
  - UnifyRow `keyed`;
  - Walk.node / Walk.handlerClause (the post-check resolve of node types);
  - Scheme.holes.
- Before Task 7, `uniformRows` gave the literal one row and `clauses:
  Nothing`, so one tree per level.

**What does and does not remove it** (experiments in the copy) [ran]:
- C gets no labels: both the filing consumption and the settling c → C
  entry drop their labels. **Linear**: depth 30 takes 33 ms, depth 14 takes
  12 ms. This confirms the cause. Dropping only the filing consumption is
  not enough (still about 1.7^depth), because settling refills C.
- `resolve` strips the clause rows of handler types inside label arguments:
  **still exponential** (depth 14: 841 ms; depth 20: 54.7 s). Unification,
  the occurs and limit checks and the row-extension `resolve` walk the graph
  itself, not resolved copies.
- `unifyAt` returns at once on two identical metas: **still exponential**
  (depth 14: 1,182 ms). Binding.step dominates.

So the fix has to keep one tree per level by construction. A local patch
to one pass cannot do it.

**Fix (forward verbatim; it needs a ruling first, as Task 2 C1 did):**

> C1. A handler literal's type must stay one tree per level of nesting when
> a clause performs a label whose argument holds another literal's type
> (Task 2 c2). Today C_i and R_i both carry the label `Cell(τ_{i-1})`, so
> every substitution walk (Binding `exceedsLimit`/occurs/`extendRow`,
> `resolve`, keyed row unification, Walk, `holes`) doubles per level.
> Choose one, by a controller or Opus ruling, before coding:
> (a) **C carries no label arguments of its own** (preferred: root cause,
> mirrors the Task 2 C1 ruling). The clause row C becomes, per label of c,
> its key, count and mark plus C's own tail. Its arguments are read from R,
> which holds every label of every c, because T/S feed R whenever they feed
> C (filing happens just before the handler node's `sync`). A `clauseRow`
> accessor builds C from R's arguments when Task 8's `with` consumes it.
> Every walker visits only R's arguments. This is an interface change to
> `HandlerRows`/`ClauseEntry`, carried into the Task 8/9 plan text in the
> same fix.
> (b) **Sharing-aware walkers.** Memoize by meta id in Binding
> (`exceedsLimit`, `bindBounded`, `extendRow`'s resolve/occurs), `resolve`,
> Walk and `holes`, and add an identical-meta short-circuit in `unifyAt`
> and the keyed row pairing. Semantics are unchanged, but the change cuts
> across modules (pre-existing checker code) and is harder to keep linear.
> (c) Keep it as a documented limitation. Only with the user's sign-off:
> base was linear here, and real programs can write the shape.
> Whatever is chosen, remove the "Limitation: … 2^depth (untested)"
> sentence from the plan's Task 7 amendment (plan l.840-843), or replace it
> with the ruling.
>
> Guard (red on 9358d79, green on c8503f9): in test/fx008-nesting.mjs add
> `clauseLiteralProgram = depth => 'effect Log { fn log(n: Int): Unit; };
> effect Cell(a) { fn put(x: a): Unit; }; fn main(): Int = { let h0 =
> handler Log { log(n) => () }; ' + [1..depth].map(i => `let h${i} =
> handler Log { log(n) => put(h${i-1}) }; `) + '0 };'`.
> - Parallel (fx008-nesting.test.mjs): `accepted at depth 30`.
> - Serial: the same 2000 ms warm bound at depth 30, measured through
>   `compileWithin` (a child process with a 20 s timeout), so a regression
>   fails instead of hanging the suite. Base takes 20 ms at depth 30
>   [ran]; 9358d79 takes 1.8 s at depth 14 and minutes at 20.
> - Keep the existing `literalProgram` (the `with` shape) as well. It
>   guards R-only nesting, but it cannot fail on this defect: C_i holds no
>   nested type there, so its comment "Each level adds one tree, not two"
>   overstates it. Reword the comment.

## Important

**I1. The A1 "Join" branch of F1′ has no killing test** (Filing.purs:118).
- The mutant `| grownSince now entry = maybe New (const New) found` passes
  all 138 probe/hook/settle tests [ran]. That includes the six-orders test.
  Design review A1 (Critical there) said a grown clause must join the group
  already on its new tail, or the φ link breaks and grouping depends on
  drain order.
- One attempt failed: two1 plus `let j = if true then k1 else fn(u: Unit)
  => { tick(); k(()) };` after the handlers. It is accepted by base, by HEAD
  and by the mutant [ran].
- Fix: "Add a probe in which a clause's filed tail t is bound, after its
  first push, to `[L | m]`, where m is another handler's filed clause tail,
  and whose acceptance needs the two R's linked (two1's `put(v)`/`v == v`
  pattern). Prove it red under the mutant above, and add the row
  `fx008-join` (Filing.purs, that needle, `/join: Ambiguous/`). If no
  accepted program distinguishes Join from New, say so in the plan's Task 7
  amendment with the reason. In that case A1 only affects cost and order,
  and the six-orders test is its guard."

**I2. `fx008-phi`: the planned defect is guardable, but no row guards it.**
- The plan's mutant was "fresh tail instead of φ" in T, and it does
  reproduce. The two-line form (stage `Row (labelsOf entry) (map (const
  (Hole (state.next + 999999))) tail)`) fails 10 tests [ran]:
  - two3 → E_TYPE `Expected a handler` 409-430;
  - two1f → E_TYPE `Fail needs a concrete error family`;
  - rig1, rig2, sh1, rigid, and the exact-text and cyc tests.
  Only two1, the plan's probe, still prints 0. So the implementer's
  conclusion that the planned mutant did not reproduce is true of two1
  only.
- The committed row guards a different defect: the merge branch (no join,
  no φ consumption). That defect is real and the row should stay.
- Fix: "Add row `fx008-phi-tail`: Sync.purs, needle `stage: Row (labelsOf
  entry) tail`, replacement ending the stage in a fresh `Hole` (import
  `Open(..)` if the row tool allows a second needle; otherwise use the same
  fresh meta through an existing qualified import); probe
  `accepts('rev8/two3', 'remainder tail', '0\n')`, mutant message
  `/remainder tail: Expected a handler/`."

**I3. The settling-side guards changed meaning. Record what is now
unguardable.**
- **`fx008-signature`.** The plan's "always changed" mutant (`| false &&
  entry.signature == …`) passes 138/138, and the `with`-shape timings do
  not change (72 ms at depth 30) [ran].
  - This follows from the design, not from a missing guard. `sync`'s loop
    ends when nothing is dirty or pending (Sync.purs `affected`), not on
    the signature.
  - T's consumption of an unchanged row binds nothing and dirties nothing.
  - So the signature only saves an idempotent push. Its one semantic use is
    `grew` (the counts), and the committed row (counts emptied, argbind
    rejected) guards that correctly.
- **`fx008-settle-phi`.** With `syncSettling` present, the plan's mutant
  (c → R entries use `Fresh`) keeps every outcome. Only ec2's span moves,
  to 327-333 from 90-380. The hook test kills it through ec2's exact span
  [ran].
  - Settling's T push already consumes `labels(c) + φ`, and φ's tail is R's
    tail afterwards, so S's `Remainder φ` is all but redundant.
  - The committed row (remove `syncSettling`; set1 is refused) guards the
    mechanism that now carries the class upkeep. It is the right row.
- Fix: "In the plan's Task 7 rows table, replace the parentheticals with:
  (signature) 'an always-changed comparison cannot loop: `sync` ends when
  nothing is dirty or pending, and an unchanged push binds nothing; the
  signature's semantic part is `grew`'; (settle-phi) 'with `syncSettling`,
  S's `Remainder φ` only affects ec2's span (Fresh: 327-333), which the hook
  test pins'. No new row is needed for either."

## Minor

- **M1. These paths have no killing test.** Each mutant passes 138/138 (and
  168/168 with test/fn-hint.test.mjs for A5) [ran]:
  - F1′'s closed branch (Filing.purs:85, φ left open);
  - the tail pass's closing of C (TailPass.purs:30);
  - A5's synced hint (Require.purs:54).

  C is consumed only from Task 8 on, so the C closing cannot be observed
  yet. Fix: "Add a one-line comment at each site that no Task 7 program
  observes it (Task 8 adds the C test). Add Task 8 Step 1 items: a `with`
  of a literal whose clause row closed, and one whose clause tail turned
  rigid."
- **M2. Partial text matches.** fx008-hook.test.mjs:46-48 matches
  cyc2/cyc3/sh1 by prefix. The table pins full texts, so assert those:
  `Tick + ... and ... cannot be made equal: both end in ...`,
  `Log + Tick + ... and ... cannot be made equal: both end in ...`,
  `... and Tick + ... cannot be made equal: both end in ...` (`^…$`).
  - The `fx008-f2` row (regression-fx008.mjs:115, `rejects`) accepts any
    E_EFFECT. The plan says "cyc2's side-condition error". Check that
    message (`/^Tick \+ \.\.\. and \.\.\. cannot be made equal/`) so that an
    unrelated E_EFFECT cannot prove the row.
- **M3. Keyless `Fail` labels are invisible to the signature.**
  - `signatureOf` counts with `Cycle.counted`, where `labelKey` gives
    `Nothing` for `Fail(x)` while x's head is unknown (Groups.purs:44).
  - So an extension of c by such a label neither "grows" nor changes the
    signature, and T does not push it during checking. Settling's c → R
    entry (`keepFail`) delivers it.
  - This is consistent with A7 (such a pair would be postponed anyway), but
    nothing says so.
  - Fix: "Comment in `signatureOf`: keyless `Fail` labels are not counted;
    T leaves them to settling's S entry, as a postponed pair would be (A7)."
- **M4. Tail pass cost.** `round` rescans every clause per productive
  round (TailPass.purs `round`). A chain of n handlers installed inside
  each other's clauses, with rigid tails, takes O(n) rounds, so O(n²)
  overall. This is not T003-critical, but a worklist of the clauses whose
  row tail is the meta just bound would make it linear. Optional; at least
  note it in the TailPass header comment.
- **M5. The stale `next` after settling (latent).** Settling can now
  allocate group ids and φ metas from `state.next` (Filing `fresh`), but
  Check.purs:120-122 keeps only the settled `subst`, so `ended.next` is
  below metas that occur in it. Nothing allocates after settling today
  (judgeDeferrals, Entry.check and `holes` are read-only) [read]. Fix:
  "Carry `restricted.next` into `ended`, or comment the invariant 'nothing
  allocates after settling' at Check.purs:122 for Tasks 8-9."

## Item 4: `closeTail` and the shallow reads

- **A closed stage as a no-op is a pre-existing meaning** [read, base
  Consume.purs]. `consume` gives a closed stage a fresh tail ("Closed rows
  open only for consumption"). So the plan's `consumeIgnoring { stage:
  closedRow, target: φ }` really does nothing, and `closeTail` (row
  unification with the closed row, ignoring marks) is the right primitive.
- **`closeTail` is safe.**
  - On a bare tail (the tail pass's C) it cannot fail.
  - On a φ that already holds R's extra labels, it rejects at the clause
    entry's origin. That matches today: R ≡ c there, and a closed c with
    another clause's label is rejected today too.
- **The shallow reads.**
  - `walkedRow` supplies labels for consumption (unification walks the
    arguments), for counts by length, and for C's filing.
  - `headedRow` follows each argument to its head, which is all
    `labelKey`/`counted` need.
  - `Consume.consume` now walks the stage instead of resolving it. Its case
    split reads only the tail, and keyed pairing walks the heads itself
    (UnifyRow.purs:135). The verify and the 114-file differential agree.
  - The only staleness found is M3, and it is benign. No deep walk is
    needed anywhere.

## Item 3: the algorithm against the amended pseudo-code [read]

- **`affected`** takes the dirty metas and the pending set and drops the
  dirty `byTail` entries. Ordering is by handler offset, then id (P14).
- **F1′.**
  - grew → `groupAt m` or a new group (A1). There is no merge in that
    branch, and no signature filter in `groupAt`.
  - Otherwise a different group → φ consumed into φ(g′), and the entry
    takes the older id (A4: no id-based φ identity).
  - Otherwise stay.
  - `unfiled` then `placed`, so no duplicate (A6).
  - Rigid: φ := ϱ while checking, skipped in settling (the ruling).
  - Closed: `closeTail` on φ.
- **F2** runs on the closure of the affected rows, after F1′ has refiled
  them. A rigid or closed R tail has no successors. Starts are the
  affected indices. Reports go to `originOf mode` (node, or the handler
  literal in settling, per the P13 amendment).
- **T** runs only where the signature changed, after F1′, stage `labels(c)
  + φ(current group)`.
- **Settle:**
  - (a), then `syncSettling`, then entries rebuilt from the current
    groups, then (c), then (d), then retry.
  - The exit test compares against the round's start, so a change made
    only by the sync adds at most one round.
  - After the loop: `settleFinal`, then `tailPass`.
- **TailPass** follows A2: an unbound target tail is bound alone; the same
  ϱ needs nothing; anything else is consumed whole, which gives the error.
  Origin is the clause span. C tails close afterwards.
- **Six orders** (Review Focus 1): the test exists and passes [ran]. It does
  not exercise A1's Join (I1).

## Item 6: layering, style, budgets

- **Accepted.**
  - A5 prescribed that `Require` take a `CheckEnv` and sync only in the
    failure branch. The synced state never escapes.
  - `Arms.MatchEnv` widening to `CheckEnv (locals ∷ Locals | r)` is the
    forced consequence, since Arms calls `require`.
  - Both modules are in the Features layer, and the import graph has no
    cycle (the build succeeds).
- **Budgets.** All touched files are ≤ 183 lines. The `where`-binding counts
  I checked (Filing `unbound` 7, Clauses `file` 6, Settle `round` 4) are
  within budget. `let` in `do` is used only after binds.
- **New modules.** ClauseBody, Filing, Groups, SyncCycle and Walked are
  file-map additions for the ledger.

## Item 5: tests

- **Red on base** [ran] (new tests copied into a base worktree):
  - gain1;
  - p5/r1/r2;
  - cyc2/cyc3/sh1;
  - tp1;
  - argbind-internal.
- **Green on base, by design:** the controls (prints-0 set, exact texts,
  six orders, ec1, ec2) and the `with`-shape nesting test.
- **Exact texts:** the controls use the table's `today` (exact), as do
  p5/r1/r2, tp1, ec1 and ec2. Exceptions: M2.
- **Nesting test shape:** see C1. The plan's c2 shape (each level carrying
  the nested type in a `Just` C) is not the committed one.
