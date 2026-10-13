# Waxwing / Text v1 done on branch `text`; whole-branch review next (2026-10-13)

Text v1 (BACKLOG D001, first tranche) is implemented on branch `text` (worktree
`.worktrees/text`, rebased onto main 0b1f850): Tasks 1-9 of
docs/plans/2026-10-13-text-plan.md, ADR 011 (docs/adr/011-text.md), the Text
section of docs/language.md, examples/text.wxw with bootstrap/text.go, and
the Text entry in docs/progress.md. Nothing is pushed or merged.

Order from here:
1. The whole-branch review of `text` (Opus), then its fixes and the user's
   merge decision.
2. Phase 2 of the 80-column sweep (scripts/width.mjs): the text-touched files
   that phase 1 left (about 98 lines over 80 across 462 files at the end of
   Task 9, in docs/engineering.md, scripts/structure.mjs and several tests).
   The width.mjs argv guard and the fence toggle for mixed fence characters
   are phase-2 items.
3. IDE001 waits to be rebased onto main after Text merges.
4. FX020 (effect operation namespaces; spec awaiting the user's review) is
   next after that, then R001.

Open items from Text: `show` is compiler-provided until C001 (ADR 011);
user Console handlers are still uninhabited (BACKLOG D001); Text operations
are STD001; a flat chain of 130 `++` operands is E_NESTING until O001.

Setup facts: run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in the
worktree; the regression runner leaves about 2 GB under .build/regression,
delete it after a run. Agent copies for mutant proofs and differentials
exclude .build and are deleted.

# Waxwing / FX001 Tasks 1-12 reviewed; awaiting merge decision (2026-10-12)

FX001 Tasks 1-12 are complete on branch fx001-finish (worktree
`.worktrees/fx001-finish`). The whole-branch review (Opus) answered "with
fixes" (no Critical); its fixes are in e53cab9 and passed a scoped
re-review. Nothing is pushed from the branch. Task 11 added the
acceptance scenario (examples/services.wxw) and scale tests; Task 12 added
fifteen regression rows (81 proofs in verify), ADR 010
(docs/adr/010-effects.md), the language Effects section (docs/language.md)
and the documentation updates (docs/progress.md, "FX001 Task 12"). Ledger:
docs/sdd/2026-10-09-effects-plan/progress.md ("FX001 Tasks 11-12").
Evidence logs are in the worktree's .build/ (final-fix-verify.log: exit 0,
1252/1252 parallel, 53/53 serial, 81 proofs).

Next: the user's decision on merging fx001-finish into main.

FX018 (callback-row diagnostics under `with`/`handle` and in argument
passing) is done on branch fx018 from 0a23784; not pushed or merged
(docs/progress.md, "FX018").

FX017 (callback-row diagnostic) is done on branch fx017, a diagnostic-only
change from 3ff0538: `q must allow every effect of a (L + M), but its row
is L; ...` with notes at both written rows (docs/progress.md, "FX017").
Not pushed or merged; it touches the same tree as fx001-finish, so merge it
after the fx001-finish decision. Open question left with FX007: whether a
callback's row should be subsumed by its caller's.

Open BACKLOG items after FX001: FX002 (concurrency, builds on CF001), FX003
(local state, recording fakes), FX005 (`ctx` elimination, cached lookup),
FX006 (general resume), FX007 (relax strict `defer`; `nofail ...e`), FX010,
FX011, FX012, FX013-FX016 (FX008 limitations: L1 with P5, L4, L6, handler
through a generic function), T009, T010, D002, E013, FN006 items (1) (a
`make()(x)` oracle row) and (2), plus the notes added to D001, R001, STD001,
PKG001, I001 and CF001. INF001 stays the next language milestone after
FX001 merges. FX008 is merged into main and pushed (2026-10-12).

Size notes: Subst.purs 245 lines, Domain/Type.purs 250 (no headroom),
Format/Diagnostic.purs near the limit. Agent copies for mutant proofs
exclude .build and are deleted; the regression runner leaves about 2 GB
under .build/regression, delete it after a run.

Setup facts: run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in
the worktree; .spago and .build/home were copied in.

# Waxwing / FX008 merged into main; FX001 Tasks 11-12 next (2026-10-12)

Future milestone INF001 was defined at the user's request on 2026-10-11:
[automatic requirement and error composition](plans/2026-10-11-requirement-and-error-inference-milestone.md).
Includes setup/assembly errors and business-logic errors, automatic named
function channels, partial provision and recovery. Requirements brief only;
independent and adversarial review complete.
Ledger: `docs/sdd/2026-10-11-inference-milestone/progress.md`. Finish active
FX008/FX001 work before its language design and plan.

FX008 (type-level tracking of handlers that may fail; `nofail` and
`nofail(k)` marks; the mark check makes `defer` sound) is complete:
Tasks 1-12 of docs/plans/2026-10-10-abort-tracking-plan.md, T008 (linear
settling) and the whole-branch review with its fixes
(docs/sdd/2026-10-09-effects-plan/review-fx008-branch-result.md). Merged
from fx008-impl into fx008 (dd1efd6), with main's INF001 docs merged in
(1331ae4), then main fast-forwarded and pushed with the user's approval
(2026-10-12). The worktree's evidence logs are kept in the main checkout
under .build/fx008-impl-evidence/ (gitignored); docs/progress.md cites
them as "in the worktree".

Next: FX001 Task 11 (amended for `nofail`) and Task 12 (ADR 010, language
Effects section, regression-fx rows; see docs/plans/2026-10-09-effects-plan.md).
Open FX008 follow-ups in BACKLOG: FX010 (narrowed), FX013-FX016
(limitations), T009 (remaining alias shapes and accepted constant
factors), T010 (`nofail(k)` generator shape), D002, E013.

Size notes: Subst.purs 245 lines, Domain/Type.purs 250 (no headroom).
Agent copies for mutant proofs exclude .build and are deleted.

Execution: subagent-driven, as the user directed (2026-10-10). Sonnet
implements each task, and Opus reviews each. Escalate to Opus on a
genuine ambiguity, a gate failure, or a second failed review.

Stop conditions still in force:
- any probe change the gate table does not list (stop and report);
- the first observed text of a pattern-gated probe (report to the user
  before pinning);
- user-facing text changes outside the approved P10 texts.

Setup facts:
- run `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` in the
  worktree;
- .spago and .build/home were copied in;
- baseline for comparisons: `node scripts/differential.mjs --baseline
  <build of the previous task's commit>`.

Open BACKLOG items from this session: FX010, FX011, FX012, E012, G004,
T008. FX009 is fixed and merged.

# Waxwing / FX001: Task 10 done; FX008 design next (2026-10-10)

Branch claude/vibrant-cerf-3km61i = main (PR Ethan826/waxwing#1, Tasks 1-9)
+ Task 10 (reference interpreter, generator, 500-program differential
corpus with 0 differences; test-side only) + docs. FX001 Tasks 1-10 are
complete and reviewed; Tasks 11-12 are amended in the plan (rulings
R1-R12) and not started. Work continues on the user's machine.

Next, before Tasks 11-12: FX008 (BACKLOG), a soundness hole in the strict
`defer must not fail` rule. Cleanup may perform an operation whose handler
clause fails — the handler may be installed by a caller in another
function — so a typed abort can end a cleanup (pinned in
test/fx-oracle.test.mjs). User decisions 2026-10-10: do not weaken the
language's structure or design (no runtime delivery or conversion of such
aborts); fix by type-level tracking: performing L under a handler whose
clauses may fail may abort, carried through rows and across calls. Write a
design note (spec §2/§3 change), get it reviewed, decide with the user,
then implement test-first; afterwards lift Task 10's generator restriction
(fail-free random clauses).

Awaiting the user's review:
- CF001 concurrency foundations, docs/plans/2026-10-09-concurrency-
  foundations-design.md: recommended fork-join subset (`par let`),
  R0 "performs no X" rule, task-boundary rules, failure selection, discard
  contract, and the 2026-10-10 operational addendum (§8A: supervision vs
  structured concurrency, defect boundaries, state ownership, overload,
  observability, host boundaries, tooling) with decisions O-1..O-7. Four
  Opus review rounds plus addendum reviews; not authorized for
  implementation.
- BK001 Go backend maintainability, docs/plans/2026-10-10-backend-syntax-
  proposal.md: Tier 1 (total plan records, Signature/Callee by call kind,
  Go-correct quoting, Lines/Inline helpers) after FX001; migration steps
  0, 1, 6 before FX005/FX002 lowering. Not authorized.
- FX007: strict `defer must not fail` (adopted 2026-10-09; bracket idiom
  needs `with pure` callbacks) vs a future lacks-Fail constraint.
- Task 12 ADR 010 wording additions from CF001 §10/§8A (cause kinds an
  open set; report and exit 1 are main's root policy; Go fatal errors are
  Go's behaviour, not a Waxwing guarantee; `cleanup failed:` means a cause
  raised by cleanup).

Execution: superpowers subagent-driven-development (skills linked under
.claude/skills): Sonnet implementers, Opus reviews; Haiku/Sonnet for
mechanical edits and small re-reviews. Ledger and every brief/report/review
are snapshotted in docs/sdd/2026-10-09-effects-plan/ (the live workspace
.superpowers/sdd/ is git-ignored).

Cloud environment notes: run `NODE_USE_ENV_PROXY=1 npm run build` once to
fill .spago (not during verify). Use `GOTOOLCHAIN=go1.26.4`. On this
container fixed timing bounds fail at unchanged baselines (BACKLOG T007,
T004); per ruling R1 a verify passes when only those fail and
`node scripts/regression.mjs` exits 0. Never relax a bound. The container
restarted twice during this session; work in flight was recovered or
re-dispatched.

# FN001 merged into main

Workspace: /Users/ethan/Desktop/gofuncyourself, branch main (FN001 merged
2026-10-09 and pushed to origin/main; P001 at dcb40fb). Read AGENTS.md,
README.md, docs/adr/008-functions.md (FN001), ADRs 001-007,
docs/plans/bootstrap.md, docs/progress.md, docs/findings.md,
docs/engineering.md and BACKLOG.md. The uncommitted .vscode/settings.json
change predates this work.

State: first-class functions, lambdas, closures, staged partial and
over-application and `|>` are implemented (ADR 008; design and plan
docs/plans/2026-10-08-functions-{design,plan}.md). `rm -rf output && npm
run verify` exits 0 on the merged tree: 541 parallel tests, 12 serial
tests (`test/*.serial.test.mjs`), twenty-two regression proofs
(.build/fn001-merge-verify.log). Tools: scripts/differential.mjs
(compare two compiler builds), scripts/fn-milestone.mjs (20,000-parameter
tier, not in verify), scripts/ladder-profile.mjs, scripts/stage-probe.mjs,
`node scripts/regression.mjs name…`.

Update 2026-10-09: the user chose FX001. Its written spec,
docs/plans/2026-10-09-effects-design.md, was settled section by section
with the user; the whole-spec review is applied (fd625a4) and §6
diagnostic quality was added at the user's request (provenance, row
difference first, origin/boundary/path notes, distinguished missing-
handler, same-key mismatch and callback-purity errors, bounded
abbreviation, regression cases; PureScript research cases in LA001).
The spec is approved; the implementation plan
docs/plans/2026-10-09-effects-plan.md (12 tasks) was revised after the
user's review and execution is authorized: subagent-driven (fresh
implementer and reviewer per task, whole-branch review), branch fx001 in
.worktrees/fx001; stop and report if Task 1 rejects a runtime shape.

Earlier next steps (before FX001 was chosen): none authorized. Candidates, for
the user to choose: C001
and R001 (review jointly; decide whether instances are ordinary records),
FX001, FN001 follow-ups FN002-FN006, and the open timing/scale items
T002-T005, G002, G003.

Long-term discussion is recorded in plans/2026-10-08-language-direction.md:
row/service architecture, explicit effects design (FX001), inspectable
lowered IR (L001), and future target evaluation (J001). These do not
authorize new implementation.

The same direction document records proposed `do` notation under FX001:
bind/lambda elaboration, result bindings and discarded results, final
computation, deferred execution, and inferred service/error requirements.
Syntax, bind/pure selection and monadic versus algebraic effects remain
open; this records discussion without authorizing implementation.

Further discussion favors evaluating Koka-inspired direct-style effects
and familiar `+`/named spread notation (`Log + ...effects`). See the
direction document's open-row section for inference and proposed implicit
universal quantification. Explicit effect-row constraint syntax is a
future feature outside initial FX001; keep record-row constraints separate.

Language-direction now also captures MileAhead's open error-row pattern
from read-only ../trailmapper: family rows compose without wrappers, stay
open until handling, and wrap only to add context. Candidate Waxwing error
sums hide `Variant`/injection plumbing. FX001/R001 must resolve the open
error-sum need against R001's deferred general variants before changing scope.

STD001 records the user's common-FP-helper requirement and approachable
naming direction, informed by Rust. Read
docs/plans/2026-10-08-standard-library-direction.md: inventory, candidate
names (getOrElse, mapOrElse, matchWith, joinWith), eager/lazy distinctions,
coverage acceptance and staged prerequisites. No helpers added to FN001.
User clarification: naming convenience must preserve lawful HKT-based
generic contracts. bimap works for any Bifunctor; optional values and
fixed-error Result share Functor/Applicative/Monad APIs. Read STD001's
generic-rigor section for constructor kinds, instance/evidence design,
user-defined-instance acceptance and law/coherence properties.

LA001 now plans the broader cross-language audit, beyond STD001's helper
coverage. Read docs/plans/2026-10-08-language-audit-plan.md: twelve required
references, source/version/section ledger, comparative briefs, feature and
interaction matrix, practical scenarios and independent review. Feed it
into upcoming type/row/effect designs without interrupting FN001; existing
advanced-feature deferrals remain. Source entry points checked, audit not run.

Tooling direction is recorded in plans/2026-10-08-tooling-direction.md:
IDE001 highlighting/editor support, DOC001 first-class doctests, PBT001
language-user generators/shrinking/replay and law suites, AI001 versioned
LLM skills/discovery, and exploratory LIT001 literate capabilities. Feed
these into LA001 and focused subsystem designs; no tooling implementation
is authorized or added to FN001. Existing compiler properties do not
complete PBT001. Preserve the tentative status of literate capabilities.
PKG001 extends that direction with portable Waxwing libraries, host FFI,
service implementations/fakes and package management over both Waxwing and
host dependencies. Review exports, source/type identity, target/runtime
support, manifests/locks and host resolver integration with M001/I001/FX001.
Effect Platform is conceptual influence; no package manager, ABI or provider
mechanism is selected and no publication is authorized.

Open items: E002 remainder, E006-E011 (P001 follow-ups: stack margin,
exponential type size, Expand keys, lowercase-type hint, mismatch `_`,
near-limit elision), F001-F003, F005-F007, E001, E003, E004, O001, H001,
A002, A004, A005; design follow-ups FX001, L001, J001 and D001.
