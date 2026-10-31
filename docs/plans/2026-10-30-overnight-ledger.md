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
| T9 | Task 9 implementation (primary) | overnight/task9 | .claude/worktrees/on-task9 | f6aeda4 | dispatched 22:45, fresh Opus implementer |
| T14 | Task 14 preparation, then completion after T9 | overnight/task14 | .claude/worktrees/on-task14 | f6aeda4 | phase 1 **done** (a4c5ebc, e26ac5b; about 0.20M tokens); not yet integrated (its pin is provisional and moves with Task 9); phase 2 waits for Task 9 |
| A2 | A2 decision packet (documents, source verification) | overnight/a2-packet | .claude/worktrees/on-a2 | f6aeda4 | **done**: 697e543, integrated as bff23d0 (docs only); about 0.25M tokens |
| SH | self-hosting dependency/API gap analysis (documents) | overnight/self-hosting | .claude/worktrees/on-selfhost | f6aeda4 | dispatched 22:46, fresh Sonnet; reads main's inventory from .claude/worktrees/integrate (7093c79, read-only) |

Worktree paths are relative to the main checkout,
/Users/ethan/Desktop/waxwing.

## Bases

f6aeda4 on r0-t2-d1 (records §18.136 and this ledger).

## Events

- 22:14 EDT. Session started; authorization read in full.
- 22:30 EDT. RESUME rewritten; §18.136 and this ledger recorded
  (f6aeda4).
- 22:45 EDT. Four worktrees created from f6aeda4 (T9 and T14 with
  output/, .spago, node_modules and .build/home copied in); four
  agents dispatched. Interface agreed in both T9's and T14's briefs:
  `HandlerLit` at E20 with role `LiteralSite`, per-clause `Consume`
  `ClauseIntoR k` (marks ignored) and `ClauseIntoC k` (marks, bare);
  `Install` at E21 with role `InstallSite`, `Consume` `InstallR`
  (marks ignored) and `AtInstalledC` (marks, bare) for an `MHandler`
  handler; a non-`MHandler` handler records `Install` and keeps
  `Unsupported UnframedInstall`, with no `InstallR` (R9 Q6).

- 23:00 EDT. A2 packet returned (697e543); controller read its
  header and checked two of its findings against the sources (F1:
  statements §2's ResultC row says the package holds the
  `⟨p, result clauses⟩` binding when it is the tail, while the options
  note's forcing step refuses it as Malformed; F6: statements §10
  gives `Consume` `Var`/`RowRef` fields, the code `MRow`). Both hold.
  Cherry-picked onto r0-t2-d1 as bff23d0; width 0.
- 23:10 EDT. T14 phase 1 returned (a4c5ebc, e26ac5b). Controller
  reran test/r0-effects-pin.serial.test.mjs and
  test/r0-results-diff.test.mjs in its worktree: 8 of 8 passed. Its
  baseline dump (.build/task14-base-results.json), coverage draft
  (.build/task14-coverage-draft.json) and draft checker
  (.build/task14-check-draft.mjs) stay in that worktree, uncommitted,
  for phase 2. Held for integration until Task 9 lands.

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
- Discrepancy to settle at phase 2: T14's draft assumed a non-MHandler
  `with` records no `Install`; the agreed interface records `Install`
  plus `UnframedInstall`. ExpectedHandler's row is re-judged against
  the integrated tree.

## Reports

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
