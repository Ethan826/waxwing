# Overnight run ledger (2026-10-30 to 2026-10-31)

The live record of the run the author authorized in
docs/plans/2026-10-30-overnight-authorization.md (dossier §18.135,
§18.136). One controller owns this file. A resumed session reads it
before redispatching anything and checks each lane branch's commits
against its base, because background-agent reports do not survive a
reset. Agents' reports are kept under "Reports" below, in substance.

## Lanes

| Lane | Work | Branch | Worktree | Base | State |
|---|---|---|---|---|---|
| T9 | Task 9 implementation (primary) | overnight/task9 | .claude/worktrees/on-task9 | f6aeda4 | **done**: integrated, reviewed, fixed (fix round 0.21M tokens), verified at 4ca1097 |
| T14 | Task 14 preparation, then completion after T9 | overnight/task14 | .claude/worktrees/on-task14 | f6aeda4 | phase 1 integrated as efcc231, 7eb388e; **done**: phase 2 integrated as 4dad5d0, f20d6ec; records written; verified at 4ca1097 |
| A2 | A2 decision packet (documents, source verification) | overnight/a2-packet | .claude/worktrees/on-a2 | f6aeda4 | **done**: 697e543, integrated as bff23d0 (docs only); about 0.25M tokens |
| SH | self-hosting dependency/API gap analysis (documents) | overnight/self-hosting | .claude/worktrees/on-selfhost | f6aeda4 | **done**: d73be05, integrated as 0c9df75 (docs only); about 0.30M tokens |

Worktree paths are relative to the main checkout,
/Users/ethan/Desktop/waxwing.

## Bases

f6aeda4 on r0-t2-d1 (records §18.136 and this ledger).

## Events

Times were corrected at 00:05 EDT from the ledger commits' committer
times; the first versions carried estimates, not clock readings.

- 22:14 EDT. Session started; authorization read in full.
- 22:16 EDT. RESUME rewritten; §18.136 and this ledger recorded
  (f6aeda4).
- 22:18 EDT. Four worktrees created from f6aeda4 (T9 and T14 with
  output/, .spago, node_modules and .build/home copied in); four
  agents dispatched. Interface agreed in both T9's and T14's briefs:
  `HandlerLit` at E20 with role `LiteralSite`, per-clause `Consume`
  `ClauseIntoR k` (marks ignored) and `ClauseIntoC k` (marks, bare);
  `Install` at E21 with role `InstallSite`, `Consume` `InstallR`
  (marks ignored) and `AtInstalledC` (marks, bare) for an `MHandler`
  handler; a non-`MHandler` handler records `Install` and keeps
  `Unsupported UnframedInstall`, with no `InstallR` (R9 Q6).

- 22:31 EDT. A2 packet returned (697e543); controller read its
  header and checked two of its findings against the sources (F1:
  statements §2's ResultC row says the package holds the
  `⟨p, result clauses⟩` binding when it is the tail, while the options
  note's forcing step refuses it as Malformed; F6: statements §10
  gives `Consume` `Var`/`RowRef` fields, the code `MRow`). Both hold.
  Cherry-picked onto r0-t2-d1 as bff23d0; width 0.
- 22:33 EDT. T14 phase 1 returned (a4c5ebc, e26ac5b). Controller
  reran test/r0-effects-pin.serial.test.mjs and
  test/r0-results-diff.test.mjs in its worktree: 8 of 8 passed. Its
  baseline dump (.build/task14-base-results.json), coverage draft
  (.build/task14-coverage-draft.json) and draft checker
  (.build/task14-check-draft.mjs) stay in that worktree, uncommitted,
  for phase 2. Held for integration until Task 9 lands.
- 22:35 EDT. SH returned (d73be05). Controller checked against main
  at 7093c79: 324 .purs modules under src, 83 importing Data.Map, no
  Generate/ (the `seal` is delta-only); all as reported. Cherry-picked
  as 0c9df75; width 0.
- 22:55 EDT. T9 returned (e22f31b, 1793b1e). Integrated by
  cherry-pick with T14's two commits: ff736de, bdd9f14, efcc231,
  7eb388e (no conflicts). Controller at 7eb388e: `npm run build`
  succeeded; test/r0-obligations-handler.test.mjs,
  test/structure-surface.test.mjs, test/r0-results-diff.test.mjs 25 of
  25; width 0. T14 phase 2 sent (pin after Task 9, moved rows,
  coverage under the rulings below). Review 1 (Opus; obligation
  semantics, marked identities, provenance) dispatched on 7eb388e.
  Review 2 (coverage, gates, pins, live preservation) waits for T14
  phase 2.
- 23:02 EDT. T14 phase 2 returned. Pin after Task 9: 3071
  declarations of 998 programs; 225 declarations moved (173
  programs), exactly the 225 that record HandlerLit or Install; none
  added or removed. Census/window/RT8: `0 STOP rows, 0 MOVED rows, 0
  moved aggregates`, exit 0; no fixture touched. Coverage: 31 rows,
  fixture 19 (was 13), unfinished 12 (was 18). Integrated as 4dad5d0
  (pin, named in its message), f20d6ec (coverage). Controller at
  f20d6ec: build succeeded; test/r0-effects-coverage.test.mjs and
  test/r0-effects-pin.serial.test.mjs 4 of 4, coverage line "31 rows;
  fixture 19, unconstructible 0, unfinished 12". Review 2 (Opus;
  coverage, gates, pins, live preservation) dispatched on f20d6ec.
- 23:24 EDT. Review 2 returned. Fix round dispatched (fresh Opus,
  worktree on-task9, branch overnight/task9-fix at 8bed565): R1 P1-1
  (identity routes: block result, record field, lambda result, plus a
  Block restored-defect row), R1 P2s and P3s, R2 P0-1 (settling row
  back to unfinished), R2 P2-1 to P2-3, P3-3, P3-4. Not in the round:
  author items below; R2 P2-4, P3-6, P3-7, P3-8 (recorded only).
- 00:03 EDT (Oct 31). Fix round returned (9f4aaac, 1087223, 4194e65,
  038714f, f7c655b; no item stopped; effect pin and trusted-surface
  pin unchanged). Integrated as bdad600, e88b866, 302e140, 8457ec5,
  d898691. Controller at d898691: build succeeded; coverage, results
  diff, pin keys and effect pin tests 16 of 16, coverage "31 rows;
  fixture 18, unconstructible 0, unfinished 13"; width 0.
- 00:10 EDT. Completion records written (progress, plan, statements
  status, closure checklist A1 and 2c, the moved-pin list
  docs/plans/2026-10-31-effect-pin-moves.txt). Next: one routine
  `npm run verify` alone under the lock, then §18.137.
- 00:25 EDT. Verify 1 at aaa9c9b failed (serial, r0-marked-corpus:
  20 minted, unnamed `Frame p`); repaired in 5540ce0 (§18.137).
- 00:53 EDT. Verify 2 at 5540ce0 failed (regression,
  r0-amin-cohort-pin-readonly at load); repaired in 4ca1097.
- 01:21 EDT. Verify 3 at 4ca1097 passed: 3013/3013, 204/204,
  264/264; performance qualification not run. §18.137 recorded.
- 01:30 EDT. Final checkpoint (below). No agent is running.

## Final checkpoint (2026-10-31, 01:30 EDT)

- Integration: r0-t2-d1, worktree .claude/worktrees/r0-t2-d1, head is
  the commit that records this checkpoint (on top of 4ca1097), clean,
  unpushed. Lane branches kept: overnight/task9 (e22f31b,
  1793b1e), overnight/task9-fix (f7c655b), overnight/task14
  (534bda3), overnight/a2-packet (697e543), overnight/self-hosting
  (d73be05); all integrated by cherry-pick. Worktrees on-task9,
  on-task14, on-a2, on-selfhost kept (on-task14's .build holds the
  census/window/RT8 dumps); remove with `git worktree remove` when no
  longer wanted.
- Completed and integrated: Task 9, Task 14, the fix round, the A2
  packet, the self-hosting analysis. Reviewed: Task 9 and Task 14 (two
  fresh reviews, fixes integrated; the verify repairs 5540ce0 and
  4ca1097 were not re-reviewed). Accepted: none yet (Task 7 earlier).
- Tests: routine verify passed at 4ca1097 (logs
  .build/evidence/2026-10-31-overnight-verify-{1,2,3}/verify.log in
  the r0-t2-d1 worktree, local); performance qualification not run.
- Next: the author's acceptance and answers (§18.137); nothing else is
  authorized.
- Morning (2026-10-31). The author accepted Tasks 8-14 and settled the
  run's questions (dossier §18.138). Statement corrections applied (§2,
  E2, E4, E5, §13; the design note's A3). A2 consolidation dispatched
  (the packet's agent resumed, branch overnight/a2-spec at fa3f82a).
- Morning. A2 specification returned (92d3b00), integrated as 0469df3
  (docs only; width 0). Controller checked: the statements and options
  note are unedited; `solvedForm` is at Strategy/Witness.purs:86 as
  cited; statements E9 reads "each payload's head concrete after
  settling", so the specification's D7 (E9 judged before hole
  defaults) is a new restriction, flagged as such by the agent.
- Morning. The author ruled the A2 table (§18.139: D7 rejected, the
  rest approved with amendments; four inconsistencies to repair). The
  consistency pass returned (829ada5, fast-forwarded): specification
  rewritten with a proposed concrete EffectPackage, the four repairs,
  distinguishing cases C1-C7; statements and options note amended.
  Controller checked two citations (Substitution.purs:53-55 `certify`
  settles before checking; Online.purs:72 `Certificate`). Packet status
  updated (dc7bd37). One focused adversarial review (fresh Opus)
  dispatched on the specification. Open for the author from the pass:
  `readsForced` as a flag on ObligationFailed instead of a forcing
  refusal tag; the solved-form and domain asymmetries between
  types/rows and effects/marks; `Unsupported` checked after I3; the
  completed package not carried in `Certified`.

## Decisions made for review

- Controller: the installed-C site is recorded as an E2 `Consume` at
  `AtInstalledC` (statements §13: "installation's edge ρ partner ⊑ C
  label (Lend `assume`) → E2 (installed-C site; N8)"; plan Task 9
  "`InstalledC` site"), with C the owned C or R's bare alias (rule J).
  Cost if wrong: one record shape changes before the validator reads it.
- Controller: the Task 9 implementer is Opus (trusted surface and
  semantics); T14's preparation and the self-hosting scan are Sonnet;
  the A2 packet is Opus.
- Controller: A2 and SH write their documents on their own branches
  (named as deliverables, not reports); each returns a summary as text.

## Tests run

None yet.

## Stops and open questions

- A2 fix pass (§18.141) STOPPED on a denied tool call. The agent ran one
  Bash command that removed its probe directory
  (scratchpad/a2-probes), ran `git status --short` in r0-t2-d1 and ran
  `git commit` in on-a2. Denied by the auto-mode classifier, reason
  "[Modify Shared Resources]"; not retried, and the controller did not
  perform it either. State: on-a2, branch `a2/fix` at d9bd6d7, three
  files edited and staged, uncommitted
  (docs/plans/2026-10-31-a2-specification.md,
  docs/plans/r0-amin-statements.md,
  docs/plans/2026-10-25-amin-a2-options.md); width 0; probe scripts
  census.mjs and failvar.mjs still in the scratchpad. r0-t2-d1 clean
  (controller, read-only check). Waits for the author. Author: leave it
  staged, keep the probes as evidence, no broad permission rule, no
  retry; the scoped re-review ran on the staged diff (§18.142).

- Coverage (T14's open questions; controller's provisional handling,
  for the author): (1) the "handler literal's type copied into images"
  row becomes a fixture row only when Task 9's identity tests (A1-A5,
  A5 corpus-wide) and its restored-defect row pass on the integrated
  tree, and the row says so; (2) own abort, frame marks and
  installation pairing stay `unfinished`: §13 maps them to conditions
  the validator evaluates on HandlerLit and Install, and recording the
  carrier is not demonstrating the check (the author's §18.124 rule);
  the drafted fixture rows are ready if the author counts the record;
  (3) the coverage row check matches constructor tokens only, so the
  `marks`/`bare` booleans are asserted by Task 9's own tests, not by
  the coverage fixture.
- For the author, from review 2: (1) settling's deferred rows: the
  controller sent the row back to unfinished rather than reading the
  `defer`-site consumption as the settling consumption; (2) whether
  rows whose §13 cell names validator-side parts (I3, E4′, Definition
  4.2) count once the recorded part is shown (the CallbackRowLacks
  precedent); (3) the literal-images ruling; (4) `siteAt`'s export.
  From review 1: the §2 amendment's identity list omits block results
  (and lambda results); the fix round tests them, the statement text
  waits for the author.
- Review 1's four author items are listed under its report; none
  blocks the run (each records an existing reading).
- Discrepancy to settle at phase 2 (settled: Install is recorded):
  T14's draft assumed a non-MHandler `with` records no `Install`;
  the agreed interface records `Install` plus `UnframedInstall`.
  ExpectedHandler's row is re-judged against the integrated tree.

## Reports

### A2 specification review (§18.140)

Summary in dossier §18.140. Missing distinguishing cases: a nullary
data image; an absent payload variable under both orders; BindsForced
against an extra key; a rigid-tailed consumption failing a payload and
an exact count; FX032 with a `ClaimsComplete` candidate (no
`CandidateRefused`); a record defect where every strategy returns
`NoCandidate`; an `if` over two `mk()` results with an image C
`Just`/`Nothing`; `v ↦ PArrow` in `FailConcrete`; a type image naming
an absent flexible variable; a Console label with `TermJ ∅`; a forced
tail whose source is a hole, and rigid. Property tests owed: erase and
settle commute over generated well-sorted package types; erase of the
honest package equals today's read-back on the corpus; settle after
complete equals complete after settle on forced tails and differs on
absent variables; G0 accepts erase(P_c) whenever it accepts
erase(P_s). Restrictions table, soundness and completeness passes: in
the reviewer's report as summarized in §18.140.

### Fix round (9f4aaac..f7c655b)

Identity routes checked corpus-wide with marks (new
test/r0-obligations-routes.mjs): block 1346, record fields 19404,
lambdas 646, 0 problems, floors about 80%; all three are identities in
the code. New rows r0-amin-literal-block-route (reviewer 1's mutant;
fails on the mark), r0-amin-install-r-marks (InstallR marks flip,
probe r0-amin-handler-exact), r0-amin-coverage-installed-c,
r0-amin-coverage-install. Failing-first: the block mutant fails 2 of 10
of the new handler test (passes the old 9 of 9); record and lambda
mutants also fail. Comments on symbolic framing agree; consumption-site
floors (ClauseIntoR/C 324 > 259, InstallR/AtInstalledC 297 > 237);
corpus check that `clauseRows[k]` is clause k's ambient row. Settling
step (d) back to unfinished (18 fixture, 13 unfinished); the
literal-images note names the routes and both defect rows, without the
A4 claim. Results diff compares arrays as multisets except
`census/order` (3 new unit tests). `movedKeys` shared by the pin test
and its probe; the encoder throws on an unexpected field set. Checks:
build 0 warnings, purs-tidy, checkStructure [], width 0; 85 of 85
focused tests; serial pin, boundary, problem pin 6 of 6; regression-run
12 of 12; 11 of 11 regression rows.

### Review 2 (Opus; coverage, gates, pins, live) on f20d6ec

P0-1: the "settling step (d)" coverage row over-claims: its deferred
rows part is E2 at settling (`AtDeferredRow`, never emitted), and the
row cites the `defer`-site `DeferInto`, the related-token pattern
§18.124 rejected; fix: back to unfinished (18 fixture, 13
unfinished), or the author rules otherwise. No P1. P2-1: no registered
proof that coverage detects loss of Task 9 rows (hand-proved: dropping
AtInstalledC or Install fails coverage); add two rows. P2-2: coverage
does not check marks/bare (Task 9's tests do, corpus-wide; flips fail
the handler test 5/9); add a registered flip row. P2-3: the diff
tool compares arrays as sets, not multisets (its HEAD and d4148de
dumps were byte-identical, so "0 moved" stands). P2-4: "owned C at a
use" names validator-side parts (I3, E4′); author's call. P3: the
moved pin declarations are not listed (independently confirmed: the
225 with HandlerLit/Install, nothing else); efcc231 and 7eb388e fail
their own pin test (bisect hazard, note only); the pin probe
reimplements the comparison (share `movedKeys`); the encoder should
assert its field set; the note over-states A4; the unfinished-reason
regex is met formally by "after Task 13"; the diff tool treats an RT8
class move as MOVED; `siteAt` export (author). Checked sound:
trusted-surface re-pin limited to the planned exports; src confined to
Generate/{Effect,Literal,Obligation} and Domain/Recorded/Effect; no
test weakened; 50 r0-amin rows unique with live needles; pin writer
separate; census/window/RT8 dumps byte-identical across the change;
r0-verdict, structure-surface 12/12; problem pin, first diagnostic,
effect pin, boundary, equal, diff, forgery, forged-witness 32/32; 7
regression rows 7/7.

### Review 1 (Opus; semantics, identities, provenance) on 7eb388e

No P0. Fields match E4/E5 and the interface (checked from source and
probe dumps: literal, owned annotation C, ResultC, alias, nested `with`
ρ). P1-1: the literal's identity route through a block result is
unchecked: mutant Block.purs:60 `marked: forged final.marked` (top
`MHandler` mark to `Written FixedN`, erasure preserved) passes the
handler test 9/9 and the equal test 6/6; Install.handler carries the
forged mark. A5 covers let/local only; record-literal fields (E24) and
lambda results are the same class (by reading). R9's table and the §2
amendment's list omit block results. Consequence: f20d6ec's coverage
note over-claims. Fix: extend A5 to block result, record field and
lambda result (marks included); a restored-defect row with the Block
mutant; scope the note until then. P2-1: r0-amin-node-erasure does not
evidence erasure for the forged node (it checks base-typed nodes of
another fixture); erasure holds by construction (`erase` drops marks);
cite that, optionally assert it in the probe. P2-2: the handler test's
header over-claims (A1-A5 test let/local, direct installation, one
argument E1). P3: stale comments (Ambient.purs:59-60, Recorded/Effect
.purs:116 vs Effect.purs:175 on `unframed`/symbolic framing); per-site
-kind minimums in the uniqueness inventory; Q5's shared clause row
asserted on one fixture only (add a corpus check). For the author:
(1) installed-C as `Consume` while E5 and Definition 4.2 say "no
consumption" there: state its meaning in E2/E5; (2) unstripped rows
with `bare: true` mean "the validator ignores label arguments": ratify;
(3) A3's wording; (4) a non-MHandler `with` records Install naming an
unused Frame p: confirm intended.

### T14 phase 2 (d5cda56, 534bda3)

Moved to fixture: R into ρ ignoring marks (InstallR, also
ClauseIntoR); installation's edge ρ partner ⊑ C label (AtInstalledC);
settling step (d) (AtInstalledC, also ClauseIntoC, DeferInto); handler
literal c into R and C (HandlerLit at E20:LiteralSite, also both
consumes); owned C at a use (Install[OwnedC,ResultClauses] at
E21:InstallSite); a literal's type copied into images
(Equal[source:Literal,target:Opened] at main:E5, also HandlerLit, O1,
O2; a `note` key, ignored by the test, names the A1-A5 tests and
r0-amin-literal-reaches-use and the provisional ruling). Unfinished:
own abort, frame marks, installation pairing, clause tail pass
(validator-side over the recorded HandlerLit/Install); ExpectedHandler
(probe `with h { 1 }`, `h: Int`: Install with handler `MBase Int`
plus UnframedInstall, no consumption, nothing demonstrates the head
check); step-5 mark check; the Definition 4.1 rows, per-key cycle,
ExpectedNofail, RowEquality. Regression rows r0-amin-coverage-equal,
-consume and r0-amin-effects-pin-obligation 3 of 3. Census and
detectors 19 of 19; shadow, classes, effect pin, diff tool 24 of 24;
R021 guard unchanged (3067 problems, 7624 BQ atoms, 0 ill-sorted).

### T9 (e22f31b, 1793b1e)

Recorded as briefed: HandlerLit at E20 (LiteralSite) with per-clause
ClauseIntoR k / ClauseIntoC k; Install at E21 (InstallSite) with
InstallR and AtInstalledC over an MHandler; a non-MHandler `with`
records Install plus UnframedInstall, no consumption. Re-pin: new
module Generate.Literal (`literalAt`, `literalType`, `literalVars`;
split from Effect, which would be 267 lines); Obligation exports
`Consumption`, `consumedAt`, `siteAt`; SiteRole adds LiteralSite,
InstallSite; structure-surface lists `.Literal`. Tests (implementer's
runs): handler test 1 of 9 on base sources, 9 of 9 after; corpus
survey 531 let-bound locals, 317 literals, 317 installs (297 MHandler,
20 not), 0 problems; r0-obligations-* 35 of 35 (uniqueness over
149359 obligations, 0 repeats); effects boundary 4 of 4, non-vacuous
(225 declarations, floor 180 added); problem pin passes; other r0 and
structure tests 86 of 86; checkStructure [], purs-tidy clean, width 0,
build 0 warnings; 15 regression rows pass, 4 new
(r0-amin-literal-reaches-use, r0-amin-handler-lit,
r0-amin-handler-lit-clauses, r0-amin-install-r). R9's mutant: probe
fails on the marked side; r0-amin-node-erasure green under it; Task
7's equal test misses it (both R9 predictions observed). Decisions for
review: Frame p minted explicitly for every `with`; R's alias at the
installed-C site recorded unstripped with `bare: true`; `siteAt`
exported; A3 as an exact set (HandlerLit plus two consumptions per
clause); boundary floor; two rows share one probe. Observation: R9's
A3 wording ("no obligation at p_lit under E20 except HandlerLit")
conflicts with the approved E4 consumptions at p_lit; the statements
may want the same wording fix. Consume count +634, positions 670 to
690. first-diagnostic not run (nothing outside Generate* and
Domain.Recorded.Effect changed).

### SH (d73be05, docs/plans/2026-10-31-self-hosting-api-gaps.md)

Reading: the compiler is main's src at 7093c79 (324 modules, one FFI
file); the R0 line adds 118 modules and changes 78. Observed rows rest
on source reading and counts; no build, corefn pass or run. Ledger of
26 gaps (AG01-AG26); top ten: ordered persistent Map/Set (AG01), an
indexable sequence with stable sort and first-occurrence nub (AG02),
left-to-right balanced traverse (AG03), stack-safe monadic loops
(AG04; Array.foldM over Either overflows near 1930 arms), Char and
code-unit Text operations with the UTF-16 diagnostic-offset question
(AG05, new item proposed), annotated rank-2 `seal` (AG06, delta only),
constructor hiding and gateable import graph (AG07), host services
(AG08), user-defined Functor-to-Monad instances and `Host m` (AG09), a
deterministic JSON writer (AG10, new item proposed). Five porting
slices (lexer, ArgumentGraph, Search's tailRecM, Host/Command/Node.js,
the generator seal), sketches marked not implemented. Twelve
corrections to the readiness doc and inventory (import-statement
counts read as module counts: Array 309, Map 109, Set 55 modules at
2643df3; the inventory counted r0-t2-d1, not main; SV10's `seal` is
delta-only; SV12's coherence mechanism; SV18's UTF-16 `Ord String`;
BACKLOG E002 stale). Seven questions for the author (port target;
offsets; `Host` as effect or record; persistent-only collections;
E_NESTING; whether to run a corefn pass).

### T14 phase 1 (a4c5ebc, e26ac5b)

Effect pin: test/r0-effects-pin.serial.test.mjs (read-only),
test/r0-effects-pin-run.mjs, writer scripts/r0-effects-pin.mjs,
provisional pin test/fixtures/r0/effects.json (3071 declarations, 998
programs, per-declaration SHA-256 keyed `origin#decl`; two writer runs
byte-identical); `encoderFor` added to test/r0-effects-canonical.mjs
(default encoding unchanged); regression row
r0-amin-effects-pin-obligation (drops E9's FailConcrete; probe samples
12 `fail` sources; "fixed compiler passes; restored defect fails").
Baseline at f6aeda4: census and detectors 19/19; shadow and classes
16/16 (RT8 0 defects, 0 position findings, 120 bound holes; R021 guard
3067 problems, 0 ill-sorted); per declaration 2038 Solved, 1033
Unresolved. Tool: scripts/r0-results-dump.mjs, r0-results-moved.mjs
(exit 1 on a STOP row: verdict head, today's result, blocked window
class, compiles, rows added or removed; exit 2 on other movement),
r0-results-diff.mjs with 7 tests. Coverage draft: 6 rows to fixture
after Task 9 (R into ρ, installed-C edge, settling step (d), literal
images, clause rows into R and C, owned C at a use), 12 unfinished.
Record drafts for the plan, statements, closure checklist A1/2d and
progress are in its report (kept by the controller for phase 2).

### A2 (697e543, docs/plans/2026-10-31-a2-decision-packet.md)

Recommendation, for the author's decision: M-C with R-A (M-A's per-edge
`holds`/`norm` check as the trusted gate; M-B, union-find plus
reachability, as a test-side differential checking both directions);
forcing as §R7b; F14 items 1-3 kept. Runner-up M-D (both checks
gated). Prerequisites before any implementation: a package carrying
effect bindings and mark terms (today `Substitution = Map Var RTExpr`,
Candidate.purs:31), tranche 2's read-back, Task 9's records, and an
end to `Outside HandlerType` blocking every handler declaration.
Sources (accessed 2026-10-30): Baader-Snyder 2001 verified (cited too
strongly, F2); Leijen 2005 verified (draft rev. 76); Tarjan 1975
verified; Biernacki et al. 2018 verified; Leijen 2017 partly (2016
report; `inject` unconfirmed); McConnell et al. 2011 partly (slides
only); Gaster-Jones 1996 abstract only; Rehof-Mogensen 1999 and
Dowling-Gallier 1984 not accessible. Questions Q1-Q12 for the author
(mark check option; rows; F14; package type's home; M-B's edge
source; E9 hole head at default Int; first-failure reporting; package
binding of `⟨p, result clauses⟩`; solvedForm extension vs new module;
limitation refusal constructors; differential on fixtures until
tranche 2; fidelity corrections). Findings against existing documents:
F1 (options note vs statements §2 on the ResultC binding), F2/F3
(V2, V3 "faithful" should be "adapted"), F4 (`inject` citation
unconfirmed), F5 (package shape unspecified), F6 (statements §10
stale), F7 (options inputs 1, 3, 4 already built), F8 (Rehof-Mogensen
bears on M-B, not M-A). Nothing in the statements or options note was
edited; the findings wait for the author.

### T14 phase 2 steps (from its report, kept for a resumed session)

1. After Task 9 is integrated: `npm run build`.
2. `node scripts/r0-effects-pin.mjs`; review the key diff of
   test/fixtures/r0/effects.json (predicted: only declarations with a
   handler literal or `with` move); commit with the pin change named.
3. `node scripts/r0-results-dump.mjs <new.json>`, then
   `node scripts/r0-results-moved.mjs <base dump> <new.json>` with the
   base dump .build/task14-base-results.json from the on-task14
   worktree (or regenerate it at f6aeda4); list every moved row; a
   STOP row is a substantive stop. Predicted exit 0.
4. `node .build/task14-check-draft.mjs` (on-task14); fix site keys to
   the integrated tree; apply the coverage rows; rerun
   test/r0-effects-coverage.test.mjs and the coverage regression rows.
5. Census, shadow and effect pin tests again.
6. Records (plan Task 14 status, statements status, closure checklist
   A1 and 2d, progress entry), then the reviews and one routine verify.
