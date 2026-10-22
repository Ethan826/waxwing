# Bootstrap evidence and current checkpoint

## T013: incremental regression proofs (2026-10-17)

Branch t013-incremental, commit f5a06bf (docs in the commit after it).
`scripts/regression.mjs` compiles one plain-purs baseline (src, .spago,
output) per run, clones it per row (`scripts/regression-clone.mjs`: `cp
-cR`, else an ordinary copy; never hard links), applies the row's edits,
compiles incrementally and runs the unchanged probes. Each row directory is
removed in `finally`; a failing row's error is saved to
`.build/regression-failed/<row>.log` first.
`test/regression-incremental.test.mjs` is the permanent equivalence check:
`Domain.Ids` `TypeId` newtype to data changes 25 dependents' compiled JS,
and the incremental result equals a clean compile (all files and bytes
except `cache-db.json`). It also covers the fallback and clone
independence. Red logs: .build/evidence/t013-red.log (helper absent,
hard-linking fallback, non-propagating mutation, corrupted incremental
output). Measured: regression 449 s (was 1,039.5 s), full verify 728.7 s
(was 1,320.5 s), 142/142 proofs, 2123 plus 59 tests passing
(.build/evidence/t013-regression.log, t013-verify.log). Details:
docs/plans/2026-10-17-verify-profile.md "Adopted (2026-10-17)".

## Language direction recorded (2026-10-08)

User review revisions: FN001 is scheduled after P001 before C001/R001/
FX001; C001/R001 require joint design review of ordinary record instances.
Documented row-specialization key/code growth and dictionary/accessor
passing as an option needing an ADR, not a chosen fallback. Lowered IR's
default to test is after specialization, above layouts. D001 records text,
numeric and collection foundations; M001 remains required for shared
modules. Rust pragmatics are explicit; FX001 compares ZIO-like computations
and Koka-like effect rows/handlers. All five review points addressed in the
direction document and backlog/handoff. Current P001 worktree untouched.

Fresh `npm run verify` on main exited 0: 162 tests, zero failures/skips,
zero build warnings/errors, gates, strict rebuild proof and eight isolated
regression proofs. Raw log: .build/language-direction-review-verify.log.
Documentation only; these milestones remain unimplemented.

User requested a local commit of the current language/backend/effect
discussion using the planning guidance. Read brainstorming/writing-plans;
recorded docs/plans/2026-10-08-language-direction.md as direction and
hypotheses, not an implementation spec. Goals, early-release deferrals,
row/service scenarios, effect-design questions, inspectable IR and future
targets are separated from assistant recommendations and open decisions.
Backlog follow-ups FX001 (effect design), L001 (lowered IR direction) and
J001 (JavaScript evaluation direction); P001's approved scope/order intact.
README, bootstrap index, next-session, findings and provenance linked.
Self-review checked scope, status, references and distinction between
proposed acceptance scenarios and implemented behavior. Documentation only.

Fresh `npm run verify` on main exited 0: 162 tests, zero failures/skips,
zero build warnings/errors, formatting/style/layer gates, strict rebuild
proof and eight isolated regression proofs passed. Raw evidence:
.build/language-direction-verify.log. Existing .vscode/settings.json edit
excluded from this change. No feature implemented and no push authorized.

2026-10-07. The language is renamed from Sprig to Bumpus (A003 Task 3a). Dated
evidence below keeps literal historical identifiers (old module names such as
`Sprig.Check`, `sprigCmpN`-style Go helpers, old command lines, `.sprig` paths
and log names) verbatim because they name artifacts that existed; the prose
language name changes.

2026-10-07. The completed documentation/style audit is merged into main through
1f760af.
Fresh review found no blockers; merged verification passed. Baseline 9624bec
is preserved in history. Audit branch/worktree removed after retaining their
evidence. Task 1 commit: 4410609. No publishing or push.
The audit plan is docs/plans/2026-10-07-bootstrap-audit.md.

## Historical pre-audit checkpoint

The following evidence was recorded before skill installation/execution;
new worktree evidence follows below. Earlier raw logs are in the original
checkout, not assumed to exist in the isolated worktree.

## Verified evidence

`node scripts/verify.mjs` (same implementation as `npm run verify`) completed
with zero source warnings/errors, strict/pedantic workspace builds, 19 passing
Node tests, no skipped tests, and a successful isolated regression proof.
Recent raw output is in ignored `.build/verify.log`; this summary survives it.

- CLI emit/build/run: example prints `42`.
- Negative fixture checks assert exact code, span, filename, and exit status.
- Type/arity/entry/duplicate/local-scope rejection cases run as language inputs.
- Int32 min/max/wrapping cases build and execute, including constant overflow.
- Untaken recursive branch is not evaluated; forward calls and Bool returns run.
- 200 generated trees roundtrip through an independent printer and parser.
- 12 generated programs execute in Go and match a BigInt reference interpreter.
- 100 generated whitespace prefixes preserve exact diagnostic positioning.
- CST style/structure gates are tested with positive and negative cases.
- Restoring missing conditional branch compatibility in an isolated copy makes
  the regression assertion fail; the healthy compiler passes the same assertion.

A clean-output `npm run verify` passed, followed by a final successful run
after the formatter-version, cache-portability, unsafe-import, and malformed
negative-literal fixes. Final log: `.build/verification-final.log` (exit 0).
The MileAhead patch passed `git apply --check` against the read-only reference.
Online installation and cross-platform execution remain unverified.

## Artifacts already on disk

PureScript compiler: src/{Domain,Features,Format,Program}/**/*.purs and
src/Domain/IR/Internal.purs. Boundary: src/Runtime/Node.purs and Node.js.
Style tooling: tools/style/src/Style/Check.purs (separate package).
Tests: test/*.test.mjs and the regression witness/script.
Example, three negative files, and bootstrap/answer.go (example snapshot).
Documentation: README, AGENTS/CLAUDE, plan, findings, architecture, language,
provenance, ADRs, engineering guidance, bootstrap roadmap, and local backlog.

## Current remaining actions

Local integration is complete; proceed to a separate bounded ADT design/plan.
Closed ADTs/exhaustive
matching require a separate later design and plan. F001 (fresh compiler-tool
setup), F002 (unapplied external patch), E001/E002 and E003 remain explicit.

## Superpowers installation and backport

Historical installation steering: install skills, migrate, then plan the run.
15 skills installed project-locally via bunx at the revision in
skills-lock.json;
list command confirmed Codex/project scope. The unfinished audit is migrated
to docs/plans/2026-10-07-bootstrap-audit.md with a durable historical ledger.
At migration, no audit task or feature had run and Git had no HEAD. User
subsequently approved inline execution/checkpoint/worktree. W001 is resolved;
prior compiler evidence above is preserved.

Fresh migration validation: `npm run verify` on 2026-10-07 exited 0.
Strict/pedantic build reported zero source/library warnings and errors;
formatting and architecture/CST gates passed; 19 tests passed, zero failures
and skips; isolated restored branch-check defect failed as required while
the fixed compiler passed. Output was read from this session's command output,
not saved to a new raw log. This validates the preserved compiler after the
installation/migration; it does not complete the pending documentation/style
audit or represent a clean-output rebuild in this session.

## Audit execution: Task 1

User approved checkpoint, isolated worktree, inline execution and final fresh
review. Checkpoint 9624bec is on main; audit/bootstrap-docs runs in
.worktrees/bootstrap-audit. Clean-output baseline compiled 269 modules with
zero source/library warnings/errors, then passed 19 tests and the isolated
regression proof. Raw evidence: worktree .build/audit-baseline.log.

| Review focus | Source and evidence | Result/limit |
|---|---|---|
| Setup claims | README; scripts/build.mjs/cache.mjs; baseline log | Cached dependency build verified from clean compiler output. Fresh PATH-tool install/cross-platform setup remains F001. |
| IR boundary | Check/IR.Internal/Go; structure.mjs; layer test | Only checking/lowering imports internal IR in source. Checker validates encountered local/call indices; forged entry/table structure is trusted and documented. |
| Automated vs manual style | Style.Check; structure.mjs; style/structure tests | Essential CST/import/format/line gates pass. Manual fallback/callback/branch issues corrected; ten-arm (now twelve; see BACKLOG E003) tag mapping target exception recorded as E003. Full lint automation stays E001. |
| Snapshot/seed | bootstrap/answer.go; compiler snapshot assertion; docs/bootstrap.md | Example bytes match canonical emission; Stage 1 compiler seed remains proposed. Stage 0 source and locks preserved in baseline. |
| Handoff/external edit | patch; planning-skills; backlog; migration ledger | Skills installed and real BASE created. MileAhead patch remains unapplied (F002); current execution status is synchronized in Task 2. |

Style-only refactors preserve the existing public source-language contract.
The passing pre-change suite is the baseline; post-change verification and
existing isolated mutation establish continued behavior. No synthetic RED
history is asserted for documentation or helper extraction. ADRs 001/002 are
unchanged: no semantic/representation decision changed in this audit.

Task 1 post-change `npm run verify` exited 0: strict/pedantic build with zero
warnings/errors, all gates, 19/19 tests and isolated branch mutation proof
passed. Raw evidence: .build/audit-task-1-green.log. The earlier accidental
IR alias edit failed the same build; its copied defect also failed compile
in isolation. docs/findings.md retains the complete failed-attempt account.

## Audit execution: Task 2

Handoff files now identify the real baseline, audit branch, completed tasks
and final fresh review. Historical no-HEAD/no-commit statements are labeled
as historical. Review is complete; final completion verification is recorded
below. No ADT source or plan was added.

Task 2 pre-review `npm run verify` exited 0 on 2026-10-07: zero strict-build
warnings/errors, 19/19 tests with no skips, style/layer gates and regression
proof passed. Raw log: .build/audit-task-2-pre-review.log in the audit worktree.

## Fresh review and closure

Fresh reviewer inspected 9624bec..56cbde1 read-only: no Critical/Important
findings. Two pre-existing test-title inaccuracies are deferred as E004;
no assertions were changed. Full review and exhaustive scope rulings are saved
in docs/plans/bootstrap-audit-review.md and bootstrap-audit-ledger.md.
The server restart interrupted delivery; the same reviewer resumed, avoiding
a second review or repeated implementation.

Two separate actual CLI emit invocations produced byte-identical output,
also equal to bootstrap/answer.go (cmp checks succeeded). The preserved
MileAhead patch again passed git apply --check without being applied. Stage 0,
locks, tests, example bytes and pure boundaries remain preserved. ADR 001/002
remain unchanged. At audit closure no language feature, merge, push or
publication had occurred.

Raw failure evidence retained outside executor scratch:
.build/audit-task-1-failed-alias.log, .build/alias-regression/failure.log,
and .build/audit-task-1-fixed.log (the failed reproduction-helper attempt).
Successful raw evidence: .build/audit-baseline.log, audit-task-1-green.log,
audit-task-1-completion.log, and audit-task-2-pre-review.log in .build.

Final closure `npm run verify` exited 0 on 2026-10-07: strict/pedantic build
zero warnings/errors; 19/19 tests, zero skips; format/CST/layer gates and
isolated branch mutation proof passed. Raw final log: .build/audit-final.log.
Tasks 1/2 and original bootstrap tasks 7/8 are complete; no blocking review
finding remains. E004 minor titles are intentionally deferred. Integration into
main was still pending at that checkpoint; it is now
complete as recorded below.

The installed task-done helper also verified Task 2 after commit f27b499:
19/19 tests, zero skips, strict build/gates/regression proof passed; commit
range 4410609..f27b499 is recorded in the durable ledger. Raw completion log:
.build/audit-task-2-completion.log. Executor scratch was copied in full to
.build/audit-executor-evidence before cleanup; durable ledger/review remain
committed in docs/plans. Only local branch integration is pending.

## Authorized local integration

User explicitly approved merge. Main fast-forwarded 9624bec..1f760af;
`npm run verify` on the merged checkout exited 0 on 2026-10-07: zero strict
warnings/errors, 19/19 tests, zero skips, formatting/CST/import gates and
isolated regression proof passed. Raw log: .build/merge-verification.log.

Audit raw logs, emitted files, isolated rename-defect copy and executor
artifacts were preserved under .build/merged-audit-evidence before removing
the merged audit worktree and branch. Historical worktree .build paths above
now resolve under that archive. Original checkout logs were not overwritten.
Durable ledger/review remain in docs/plans and all audit commits stay in main.
The pre-existing .vscode/settings.json spell-check additions are preserved
uncommitted. No push or publication occurred.

## A001 design (in progress)

2026-10-07: brainstorming for closed ADTs and exhaustive matching. User chose
recursive types, nested patterns with Maranget usefulness, type/match brace
syntax, tagged value-struct representation and sequential first-match
lowering. User review added CtorId identity, nil-guarded projections,
inhabitedness, canonical witnesses and two-pass type resolution. Approved spec:
docs/plans/2026-10-07-closed-adts-design.md. Documentation only; no compiler
source changed, so no verification run is claimed for this step.

2026-10-07: spec approved and committed (1d71f2f). writing-plans produced
docs/plans/2026-10-07-closed-adts-plan.md: five tasks (syntax; types and
construction; patterns and match; coverage; docs and review). Plan-time spec
amendments: E_DUPLICATE at the first duplicate (Stage 0 rule), depth-named
match parameters, and the Float row moving from E_SYNTAX to E_UNBOUND.
Documentation only; no compiler source changed.

2026-10-07: closed-ADT Task 1 (syntax) done. Added `|{}` and `=>` tokens,
reserved `type`/`match`/`_`, TypeRef, Parse.Declaration and Program dispatch;
Resolve maps NamedRef to E_UNBOUND transitionally. New test/adt-syntax.test.mjs
(7 tests) failed against pre-change source, then passed. `npm run verify`
exit 0 (26 tests, regression proof, answer.go unchanged).

2026-10-07: closed-ADT Task 2 (types and construction) done. Ty moved to
Resolved
with TData; two-pass type table, shared global table, Construct through Check
and Go (Go.Data). test/adt-types.test.mjs (6 tests) failed before the change
(unbound-type errors), then passed. `npm run verify` exit 0 (32 tests,
regression
proof, answer.go unchanged).

2026-10-07: closed-ADT Task 3 (patterns and match, no coverage) done.
Parse.Literal
and Parse.Pattern, Resolve.Pattern with pre-order LocalIds, Check.Match,
Go.Match
(depth-named IIFE, nil-guarded projections); examples/shapes.sprig with snapshot
bootstrap/shapes.go. test/adt-match (12) and test/adt-properties (1) failed
before
the change (match was E_SYNTAX), then passed. Regression proof is a table:
`branch`
and new `nil-guard` both fail on their mutants. `npm run verify` exit 0.
Fix round 1: pattern-constructor arity moved from Check.Match into
Resolve.Pattern (E_ARITY in pattern pre-order, before body and later-function
errors); two new rejection rows failed before (E_UNBOUND) and pass after.
`npm run verify` exit 0.

2026-10-07: closed-ADT Task 4 (coverage) done. Check.Usefulness (inhabitation
fixed point, U(P,q), algorithm I) and Check.Coverage (E_REDUNDANT,
E_NON_EXHAUSTIVE with canonical witness) run after checking; test/adt-coverage
(6) and test/coverage (300-case oracle) failed before (non-exhaustive programs
compiled), then passed; regression row `exhaustive` fails on its mutant. No
existing test program changed. `npm run verify` exit 0 (52 tests, three
regression proofs).

2026-10-07: closed-ADT Task 5 (five layers) done. Modules moved to
Domain/Features/Format/Runtime/Program with git mv; Token, isUpper ->
Format.Lex, codeName -> Format.Diagnostic; scripts/structure.mjs per-module
table replaced by layer rules, four new structure cases failed before the gate.
bootstrap/answer.go and shapes.go cmp identical, no stale Sprig./Shell. names.
`npm run verify` exit 0 (52 tests, three regression proofs).

2026-10-07: closed-ADT Task 6 (structured diagnostics) done. Domain.Problem
holds Problem/TypeName/Witness data; Features build no text; Format.Diagnostic
code/message/wire render it, Program.Main uses wire. test/diagnostics
characterization (39 families) passed at HEAD and unchanged after; its
message/wire assertions failed before (no Domain.Problem); the R5 invalid-TypeId
case compiled at HEAD returned Right (vacuously complete) and is now E_INTERNAL.
Coverage table lookups split into Features.Check.Signature. bootstrap/answer.go
and shapes.go cmp identical. `npm run verify` exit 0 (55 tests, three regression
proofs; exhaustive mutant now `const (const (Right Nothing))`).

2026-10-07: closed-ADT Task 7 (capability ports) done. Domain.Host ports over
abstract `m`; Format.Arguments (argv, usage text) and Format.Wire
(plain/source/tool wire shapes); Program.Command over any Host; Runtime.Node is
port implementations plus argv/stdout/stderr/exit and JSON only.
test/program.test (9 fake-host cases) failed before (no Program.Command), then
passed; two new structure rows (Program.Command importing Effect/Runtime) failed
before the gate. Old/new CLI stdout, stderr and status byte-identical on 15
probes (usage, E_IO read/write, E_TYPE, E_TOOL with PATH='' and bad -o,
emit/build/run); no temp dir leaked. bootstrap/answer.go and shapes.go cmp
identical. Clean `rm -rf output && npm run verify` exit 0 (64 tests, three
regression proofs).

2026-10-07: closed-ADT Task 8 (documentation and closure) done, review step
excluded by controller ruling R6. Wrote ADRs 003 and 004; rewrote
docs/language.md and docs/architecture.md; updated engineering, provenance
(Maranget JFP 2007; MileAhead layers, conceptual only), README, BACKLOG (A001
Done; A002-A005, F005 added; E003 and F004 current), plan index and
next-session. Clean `rm -rf output && npm run verify` (.build/a001-final.log):
exit 0, 64 tests, 0 skips, regression proofs branch, nil-guard and exhaustive
all passed. Two CLI emits of examples/shapes.sprig byte-equal each other and
bootstrap/shapes.go; examples/answer.sprig emit equals bootstrap/answer.go
(cmp). $TMPDIR still holds the same four stale `sprig-regression-*` directories
after the run (F005). Final whole-branch review is run by the controller.

2026-10-07: A001 final whole-branch review findings fixed (record
docs/plans/closed-adts-review.md). Function/constructor clashes report at the
earliest declaration by source offset (new adt-types case failed before the fix
at offset 26, passed after; .build/a001-review-minor3-red.log, -green.log).
specialize and checkCtor return E_INTERNAL on field-count mismatch; the new
diagnostics test fails with either change reverted in an isolated copy
(.build/a001-review-isolated-red.log). Coverage oracle now requires witnesses to
cover only unmatched values and checks brute-forced inhabitedness over 120
generated type systems (an inhabitedness mutant fails it:
.build/a001-review-inhabited-mutation.log); 8 generated flat 3-5-arm matches run
in Go (an arm-reordering mutant fails them:
.build/a001-review-flat-mutation.log). verify.mjs runs every test/*.test.mjs (an
unlisted failing dummy made verify exit 1:
.build/a001-review-unlisted-probe.log). Clean `rm -rf output && npm run verify`
(.build/a001-review-fix.log): exit 0, 0 warnings, 13 test files, 68 tests, 0
skips, regression proofs branch, nil-guard and exhaustive passed. CLI emits of
examples/answer.sprig and examples/shapes.sprig equal bootstrap/answer.go and
bootstrap/shapes.go (cmp). $TMPDIR still holds four stale `sprig-regression-*`
directories (F005).

## Next milestone, item 1: F004 (2026-10-07)

Reproduced in an isolated copy: with a shadowed name added to Domain.Host, the
first `node scripts/build.mjs` failed with ShadowedName and the second exited
0. scripts/build.mjs now removes the output directory of every module declared
under src and tools/style/src before building (dependencies stay cached); the
same copy then failed both builds. New scripts/strict-rebuild.mjs, run by
verify, automates that proof; with HEAD's build.mjs restored in an isolated copy
it fails with "second build accepted a strict warning" (.build/f004-red.log).
AGENTS.md no longer requires a clean output directory. Clean
`rm -rf output && npm run verify` (.build/f004-verify.log) and the following
incremental `npm run verify` (.build/f004-verify-incremental.log) both exit 0:
0 warnings, 68 tests, 0 skips, strict rebuild proof and regression proofs
branch, nil-guard and exhaustive passed. The main item of the milestone is
not yet chosen.

## Next milestone, main item: A003 (design, 2026-10-07)

User chose A003 with print, equality and ordering. Design direction approved
with five clarifications (E_ENTRY keeps missing-main and parameters; round
trip recompiles with original declarations and checks structural equality via
the interpreter; ordering mutations must fail an oracle or explicit-order
assertion, with separately built equal values; nil-field panic rule scoped to
visited fields; Bool helper only when needed). Written spec:
docs/plans/2026-10-07-adt-printing-design.md, approved by the user.
Plan: docs/plans/2026-10-07-adt-printing-plan.md (4 tasks), awaiting review.
Documentation only; no compiler source changed.

## A003 execution

- 2026-10-07 Task 1 (comparison syntax, typing, primitive lowering): added
  `Operator`/`Compare` through lexer, parser (non-chaining, looser than `+`),
  resolver, checker, coverage and Go lowering; Bool ordering lowers through
  `sprigCmpBool`, emitted only when used. New test/compare.test.mjs (6 tests:
  runs, positions, rejections, left-to-right evaluation trace, helper
  presence, answer.go unchanged); the old "lone > is E_LEX" test now pins a
  lone `!`, and the branch regression needle gained context so it stays
  unique. `npm run verify` exit 0; bootstrap/answer.go and shapes.go
  unchanged.
- 2026-10-07 Task 2 (structural order for declared types): one
  `sprigCmpN` helper per declared type (tag range check, constructor order,
  fields left to right, nil check before a declared field), emitted in
  TypeId order; declared comparisons lower to `(sprigCmpN(L, R) op 0)`;
  `sprigCmpBool` is also emitted for any Bool constructor field. New
  test/value-oracle.mjs (reference order, printer, parser, alternate
  expressions) and test/adt-order.test.mjs (7 tests, all red before the
  change: hand cases, structural equality, 8192-element lists, uninhabited
  type, malformed values, evaluation trace, 8-seed oracle agreement with
  order laws and coverage assertions). Regression rows `ctor-order` and
  `first-field` fail with their defects restored; their probes run Go under
  .build/regression. bootstrap/shapes.go gains only `sprigCmp0`; answer.go
  unchanged. The compiler's ~3500-character stack limit was recorded under
  E002. `npm run verify` exit 0.
- 2026-10-07 Task 3 (printing and unrestricted `main`): `EntryResult` is
  gone and a missing entry reads `Expected fn main()`; `main` may return any
  type. New Format.Go.Show emits one `sprigShowN(out []byte, v sprigTyN)`
  per declared type in TypeId order (cases built from the constructor
  table, `fmt.Append` for Int/Bool fields, nil check before declared
  fields, unknown tag panics `bumpus: malformed value`); a declared `main`
  prints `string(sprigShowN(nil, sprigFnK()))`. The shared panic text moved
  to Format.Go.Data. New test/adt-print.test.mjs (7 tests, all red before
  the change: hand prints, Int/Bool unchanged, entry rules, 8192-element
  list print, malformed panics, 8-seed print round trip, tree snapshot);
  diagnostics and adt-types E_ENTRY rows updated per Global Constraints.
  Regression row `show-fields` fails with its defect restored (`printed
  value lost fields: Cons(1)`). New examples/tree.sprig and
  bootstrap/tree.go; shapes.go gains only `sprigShow0`; answer.go
  byte-identical. `npm run verify` exit 0.
- Task 3a (rename to Bumpus): `npm run build` rewrote spago.lock (packages
  bumpus, bumpus-style); bootstrap/answer.go, shapes.go and tree.go regenerated
  by the CLI each equal the old bytes under
  `sed s/sprig/bumpus/g;s/Sprig/Bumpus/g` (cmp, exit 0). New
  docs/assets/bumpus.svg. `npm run verify` exit 0.
- Task 3b (stack-safe lexing and declaration parsing, E002 part): Format.Lex
  scans by index in a `tailRecM` loop (Control.Monad.Rec.Class, `tailrec`
  now a direct dependency; spago.lock gains it), Format.Parse.declarations
  is a `tailRecM` loop, Format.Parse.Core reads tokens by index, and
  Format.Stack makes accumulation linear. Two quadratic resolver costs the
  20,000-declaration test exposed were fixed: globals are built once, and
  function-name duplicates use a sort (Features.Resolve.Repeated). New
  test/large-source.test.mjs (5 tests: megabyte padding, 20,000
  declarations run in Go, E_LEX at offset 1,000,020, megabyte lex under 5 s,
  duplicate among 20,000) all failed on the old code with heap exhaustion
  (.build/task3b-red.log); now 0.09 s, 2.2 s, 0.26 s, 0.07 s, 0.08 s. The
  structure allowlist admits exactly Control.Monad.Rec.Class (new structure
  test red first). Coverage-oracle `choose` reads the LCG's high 16 bits (a
  new test showed 80 two-way draws alternating `0101…`); seed-dependent
  preconditions then failed (adt-order `seed 22: one T0 constructor`,
  adt-print `nested`), so seeds were reselected, assertions unchanged.
  Dropping the backward neighbour check in Repeated fails the diagnostics
  and large-source duplicate tests in an isolated copy. bootstrap/*.go
  unchanged. `npm run verify` exit 0, 17 files, 96 tests, 0 skips
  (.build/task3b-verify.log).
2026-10-07: logo. The README shows assets/branding/bumpus-logo.png (1254 ×
1254 PNG with alpha, a bluetick coonhound with the stolen turkey above the
wordmark), chosen by the user from image-generator candidates; provenance and
final prompt in assets/branding/README.md. The Task 3a SVG icon was removed at
the user's request; no earlier image versions are kept. Documentation and
assets only.
- 2026-10-07 Task 4 (documentation and closure): language.md, ADR 005,
  architecture, engineering, README, BACKLOG (A003 In review, E002 extended
  with the quadratic `uniqueTypes`/`uniqueCtors`, new T001), findings and
  next-session updated; each claim was checked against src/ and test/.
  `rm -rf output && npm run verify` exit 0, 0 warnings, 17 files, 96 tests,
  0 skips, strict rebuild proof, six regression proofs (branch, nil-guard,
  exhaustive, ctor-order, first-field, show-fields)
  (.build/a003-final-verify.log). CLI emits compared with `cmp` (exit 0):
  examples/answer.bumpus to bootstrap/answer.go, shapes.bumpus to shapes.go,
  tree.bumpus to tree.go, and tree.bumpus a second time to tree.go. A003 is
  In review; Done follows the final whole-branch review.
- 2026-10-07 final-review fixes (docs/plans/adt-printing-review.md): I3
  Go emission and resolver tables made non-quadratic (Format.Go.Layout,
  Repeated-based type and constructor duplicate checks, linear typeInfo).
  New 20,000 one-constructor-types test failed first at 25.9-26.3 s against
  its 5 s bound, now 0.23-0.28 s; duplicates among 20,000 types 21.8 s to
  0.43 s; reporting at the later constructor fails it in an isolated copy.
  Emitted Go byte-identical: `cmp` of the CLI emits of examples/answer,
  shapes and tree against bootstrap/*.go (exit 0) and 504 programs emitted
  identically by b5dde4e and the fix. Tag-3 compare case fails under an
  emitted `.tag > count+1` mutant. adt-order runs one Go program per seed.
  E002, language.md, ADR 005 and architecture.md corrected (I1, I2); G001
  added; A003 Done. `rm -rf output && npm run verify` exit 0, 0 warnings,
  17 files, 98 tests, 0 skips, six regression proofs
  (.build/a003-review-fix-verify.log).
  Follow-up: the final test/large-source.test.mjs run against a b5dde4e
  build fails both new tests on their 5 s bounds (types 25.9 s, duplicates
  21.8 s). Remaining per-reference name scans (resolveType, findGlobal)
  measured at 1.7 s for 20,000 references and recorded in E002 for G001.

## A003 merged (2026-10-07)

User approved the merge. main fast-forwarded 74e5c2a..4b5ce2e. Clean
`rm -rf output && npm run verify` on main exited 0: zero warnings, 98 tests,
zero failures/skips, strict rebuild proof and six regression proofs
(branch, nil-guard, exhaustive, ctor-order, first-field, show-fields). Raw
log: .build/a003-merge-verify.log. Worktree .build logs and the SDD ledger
were archived under .build/merged-a003-evidence before the a003 worktree
and branch were removed. No push. Next: G001 (design first).

## G001 design (2026-10-07)

User chose an applicative-only parser (no Monad instance) and a depth limit
with a structured diagnostic for deep nesting (over a larger Node stack or
heap-based phases). Written spec:
docs/plans/2026-10-07-applicative-parser-design.md, approved as written
with clarifications (section 7).
Documentation only; no compiler source changed.
Plan: docs/plans/2026-10-07-applicative-parser-plan.md (5 tasks), awaiting
user review.

## G001 execution

- Task 1 (2026-10-07): applicative grammar core (Format.Parse.Grammar, with
  the token cursor split into Format.Parse.Cursor to stay under 250 lines);
  Literal and Pattern ported; Expression reaches them through
  fromLegacy/toLegacy. test/grammar.test.mjs RED: 1,473 arms RangeError
  (trailing-comma rows recorded from the old compiler, passing); GREEN: 1,473
  arms in 0.23 s. `npm run verify` exit 0, 101 tests, 0 failures/skips
  (.build/g001-task1-verify.log); emits of answer, shapes, tree cmp-identical
  to bootstrap/*.go.
- Task 2 (2026-10-07): Expression, Declaration and the declaration loop
  ported to the applicative grammar; Format.Parse.Core and the
  fromLegacy/toLegacy, legacyState/grammarState adapters deleted; `spanned`
  is an empty span when nothing is consumed; Functor map is direct. New CST
  rule: no `do`, `>>=` or `=<<` in Format.Parse and
  Format.Parse.{Literal, Pattern, Expression, Declaration} (Grammar, Cursor
  exempt). RED: 1,536 constructors, 1,536 fields and 1,793 arguments
  RangeError (.build/g001-task2-red.log), style fixture failing
  (.build/g001-task2-style-red.log), empty `spanned` failing in an isolated
  copy (.build/g001-task2-spanned-red.log); GREEN 15 ms, 7 ms, 56 ms
  (.build/g001-task2-green.log). `fn main(): Int = (1` keeps E_SYNTAX
  "Expected ')'" at 19-19. Parser lines 889 -> 685 (no module grew).
  `npm run verify` exit 0, 112 tests, 0 failures/skips
  (.build/g001-task2-verify.log); answer, shapes, tree emits cmp-identical
  to bootstrap/*.go. Cold-CLI nesting depth moved (BACKLOG E002).
- Task 3 (2026-10-07): E_NESTING at 128 levels (ADR 006): `nested`,
  `infixed`, `rooted` and `nestingLimit` in Format.Parse.Grammar, `depth` and
  `peak` in the Cursor state; operators count the depth of the tree they
  build, so a deep left operand counts in full; Grammar `foldAt` runs the
  first item directly. Probe (scripts/depth-probe.mjs, limit disabled):
  smallest overflow 304 (`Cons(1, `), no anomalies after classifying V8's
  regex `Stack overflow` SyntaxError as an overflow; limit = largest power
  of two ≤ 152. RED: test/depth.test.mjs 14 of 26 failing, no E_NESTING
  (and `go build` killed on 128 nested match arms, BACKLOG E005)
  (.build/g001-task3-red.log); diagnostics E_NESTING row failing with the
  limit disabled; GREEN 26/26 (.build/g001-task3-green.log). `npm run
  verify` exit 0, 138 tests, 0 failures/skips (.build/g001-task3-verify.log);
  answer, shapes, tree emits cmp-identical to bootstrap/*.go.
- Task 4 (2026-10-07): resolver numbering through Features.Resolve.Fresh
  (state-and-error, Functor/Apply/Applicative/Bind/Monad; `fresh`,
  `failure`, `liftEither`, `runFresh`); arms, arguments and pattern fields
  via balanced `traverse`; `Numbered` dropped from Domain.Resolved.
  Characterization (test/adt-match.test.mjs LocalIds row) recorded from and
  passing on the old compiler, failing when arms are numbered before the
  scrutinee in an isolated mutant. New: 10,000 binding arguments compile in
  about 1 s (test/large-source.test.mjs; RED RangeError on the old resolver,
  .build/g001-task4-red.log). Differential over 1,327 distinct sources
  compiled by the suite: all identical Go or diagnostics except that row.
  `npm run verify` exit 0, 140 tests, 0 failures/skips
  (.build/g001-task4-verify.log); answer, shapes, tree emits cmp-identical
  to bootstrap/*.go.
- Task 4b (2026-10-07): coverage breadth and parameter duplicates.
  Coverage's Array.foldM searches over Either (redundancy over arms;
  exhaustiveness and wildcard usefulness over constructors) became
  Features.Check.Search.firstJust (`tailRecM`); `specialize` checks arity
  once, then mapMaybe; parameter duplicates use Repeated. Corrected
  thresholds: the coverage overflow was about 1,929 arms (not 3,000), the
  pre-G001 resolver overflowed near 1,700 arms or arguments (not 5,000).
  RED on the pre-fix compiler (.build/g001-task4b-red.log): 5,000 integer
  arms and 3,000 constructors RangeError, 20,000 parameters 3.07 s;
  per-site mutants (each foldM restored alone, quadratic uniqueParameter,
  reversed Fresh `apply` for the strengthened 10,000-argument order test)
  each fail. GREEN (.build/g001-task4b-green.log): 5,000 arms 1.3 s,
  3,000 constructors 1.3 s, 20,000 parameters 0.17 s; still quadratic in
  arms (10,000 arms 5.2 s, BACKLOG E002). `npm run verify` exit 0, 144
  tests, 0 failures/skips (.build/g001-task4b-verify.log); `exhaustive`
  regression row holds; answer, shapes, tree emits cmp-identical to
  bootstrap/*.go.
- Task 5 (2026-10-07): closure. Regression row `state-thread`
  (scripts/regression.mjs, probe in test/regression.mjs): Grammar's `apply`
  running the second parser from the original state makes
  examples/answer.bumpus fail with `parser state not threaded` (E_SYNTAX
  "Expected an identifier" at 1:1; .build/g001-t5-state-thread-mutant.log);
  the healthy compiler emits bootstrap/answer.go. CST gate closed
  (tools/style/src/Style/Parser.purs): productions also reject `bind`,
  `join`, `discard` (plain, qualified, backticked), `>=>` and `<=<`, and
  only Format.Parse (and Grammar) may import `run`/`initialState`; open,
  `as`-only and `hiding` imports of Grammar or Cursor are rejected. RED: 2 of
  8 style tests failing (.build/g001-t5-style-red.log); the positive
  fixture fails with the importer exemption removed, in an isolated copy
  (.build/g001-t5-style-positive-mutant.log); GREEN 8/8
  (.build/g001-t5-style-green.log). Measured at the CLI: a 129-operand flat
  sum compiles and 130 is E_NESTING; a 128-element printed list compiles
  and 129 is E_NESTING. Docs: language.md (nesting rule, E_NESTING), ADR
  005 and 006, architecture.md, engineering.md, findings, README,
  next-session; BACKLOG G001 In review, E002 restated, E005 options left to
  the user, new O001, H001, F006 (stale output of deleted modules,
  recorded, not fixed). `rm -rf output && npm run verify` exit 0, 20 files,
  147 tests, 0 failures/skips, seven regression proofs
  (.build/g001-task5-verify.log); answer, shapes, tree emits cmp-identical
  to bootstrap/*.go. Final whole-branch review pending.
- Final whole-branch review fixes (2026-10-07; record
  docs/plans/applicative-parser-review.md). I1: usefulness and algorithm I
  (Features.Check.Usefulness, new Features.Check.Missing, shared
  Features.Check.Matrix) run on an explicit Search `Stack` in `tailRecM`;
  I2: inhabitation is a worklist (new Features.Check.Inhabited, lookups in
  Features.Check.Tables), and Array.modifyAtIndices is chunked after the
  20,000-type test overflowed in it. RED on the pre-fix compiler: all four
  test/coverage-scale.test.mjs cases RangeError (5,000-field exhaustive,
  non-exhaustive witness and redundant arm; 10,000-type chain after 9.9 s)
  (.build/g001-final-fix-red.log); GREEN 0.27-0.36 s, 0.08 s, 0.05 s,
  0.64-0.69 s. Remaining cliffs measured and recorded in BACKLOG E002 (4),
  (5). M1: the Bind gate also rejects ap, ifM, whenM, unlessM, liftM1,
  bindFlipped, composeKleisli, composeKleisliFlipped (style fixture failed
  first on `ap`); M2: test/depth.test.mjs imports `nestingLimit`; M4: ADR
  006 gives the exact uncommitted probe steps; M5: O001 notes. M3: accepted
  that src/Format/Parse/Literal.purs grew 51 -> 55 lines, all of it the
  purs-tidy one-per-line Grammar import list (spec section 6 "no parser
  module grows" is otherwise met). `rm -rf output && npm run verify` exit 0,
  21 files, 151 tests, 0 failures/skips, seven regression proofs (the
  `exhaustive` needle still matches once and its mutant fails)
  (.build/g001-final-fix-verify.log); answer, shapes, tree emits
  cmp-identical to bootstrap/*.go. G001 Done, pending the controller's
  scoped re-review.

## G001 merged (2026-10-07)

User approved the merge and kept the externally rewritten history. main
fast-forwarded to 44a735b. Clean `rm -rf output && npm run verify` on main
exited 0: zero warnings, 151 tests, zero failures/skips, strict rebuild
proof and seven regression proofs (branch, nil-guard, exhaustive,
ctor-order, first-field, show-fields, state-thread). Raw log:
.build/g001-merge-verify.log. Scoped re-review of the final fixes found all
findings addressed (116,000+ differential coverage cases identical to the
pre-fix build); remaining wording nits fixed here (engineering test count)
or parked (coverage-scale comment, Inhabited complexity formula). The
re-review's out-of-scope allowlist gap is BACKLOG F007. Worktree evidence and
the SDD ledger are archived under .build/merged-g001-evidence; the g001
worktree and branch are removed.

## E005 execution

- 2026-10-07, branch e005 from 0777cf6, design approved by the user. Each
  match lowers to a top-level Go function `bumpusFn{f}Match{k}` (k in
  per-function pre-order, scrutinee before arms), taking its captured
  locals in LocalId order and then `bumpusScrutinee`; lifted functions
  follow their function in number order (ADR 003 item 6). New modules
  Format.Go.Lowered (counter threading), Format.Go.Expression (moved out of
  Format.Go) and Format.Go.Capture; Format.Go.Compare's `comparison` now
  takes lowered operand code.
- RED on the closure compiler: test/match-lift.test.mjs's two signature
  tests failed (no `bumpusFn0Match*` functions; .build/e005-red-lift.log);
  its capture test passed, as expected for closures, and its RED is the
  `capture` mutant. The 128-deep timing test hit its 10 s spawn timeout
  (.build/e005-red-timing.log). The full-limit match-arm and
  compare-matches runs were not executed on the closure compiler (prior
  record: killed at 128).
- Mutants of Format.Go.Capture in isolated copies: dropping nested
  scrutinees (the `capture` row) and capturing nothing both make the probe
  fail with `captured local lost` and Go's `undefined: bumpusLocal3` /
  `bumpusLocal1` (.build/e005-mutants.log).
- Timings (.build/e005-timing.log, `go build`, Go 1.26.4): closures 0.31 s
  at d = 16, 1.26 s / 596 MB at 20, 7.99 s / 2.7 GB at 22; named functions
  0.13-0.15 s and about 67 MB at every d from 8 to 128.
- test/adt-match.test.mjs `LocalIds in emitted Go follow source pre-order`
  pinned the emitted text of one closure-form body; its expected sequence
  now covers bumpusFn0 and its four lifted matches (same binder numbering,
  plus capture parameters and arguments).
- bootstrap/answer.go byte-identical; shapes.go and tree.go regenerated
  through the CLI (matches become `bumpusFn0Match0`/`Match1` functions).
- `rm -rf output && npm run verify` exit 0: zero warnings, 22 files, 155
  tests, zero failures/skips, eight regression proofs including `capture`
  (.build/e005-verify.log).
- Review fix round 1 (2026-10-07). (1) Capture cost: each lifted match
  re-scanned its subtree. A 127-deep ladder of 50-arm matches (147 KB)
  compiled in 3.0 s against 0.27 s on 0777cf6 (depth 64: 0.71 vs 0.15 s).
  Lowering now returns each subtree's free locals (Format.Go.Lowered `free`;
  Format.Go.Capture `union`/`armFree`), so captures come from one bottom-up
  pass: 0.31 s at 127. New test `a deep, wide match ladder compiles in under
  1.5 s` failed first at 3,028 ms (.build/e005-fix1-red-ladder.log). Generated
  Go is byte-identical to the pre-fix head on 21 programs (the three
  examples, the match-lift, LocalId and capture programs, an if/match mix,
  ladders at 32 and 127, and every depth form at 128) and cmp-identical to
  bootstrap/*.go (.build/e005-fix1-identical.log). The `capture` row now
  drops a match's scrutinee from its free set (Format.Go.Match); its mutant
  fails with `undefined: bumpusLocal3` (.build/e005-fix1-mutant.log).
  (2) The 128-deep timing test emits Go, then runs `go build` detached in
  its own process group, killed as a group on timeout, and removes its temp
  directory in `finally`. Against the closure compiler it failed with `go
  build killed at 10000 ms` and left no go/compile process or temp
  directory (.build/e005-fix1-groupkill.log). (3) Its comment now says the
  build cache may supply the binary and why the bound stays honest.
  `rm -rf output && npm run verify` exit 0: zero warnings, 22 files, 156
  tests, zero failures/skips, eight regression proofs
  (.build/e005-fix1-verify.log).

## E005 merged (2026-10-08)

User approved. main fast-forwarded to 09f3071 (E005 c928d93 plus review fix
round 09f3071). Clean `rm -rf output && npm run verify` on main exited 0:
zero warnings, 156 tests, zero failures/skips, eight regression proofs. Raw
log: .build/e005-merge-verify.log. Review: 430-program base/head
differential identical (values and call traces) and malformed-value panics
identical; fix round re-review addressed all three findings. Parked: one
82-column JS test line (rule binds PureScript only), the stale
Format.Go.Capture header comment (fixed with T001), wall-clock budgets with
~5x headroom. Evidence archived under .build/merged-e005-evidence; worktree
and branch removed. Next: T001, then P001 (user order 2026-10-07).

## T001 execution (2026-10-08)

Branch t001 (.worktrees/t001) from 62f8192. Brief:
.superpowers/sdd/t001/brief.md (approved with eight binding amendments).

- Preparatory commit `docs: refresh Format.Go.Capture header`: the header now
  describes bottom-up free-local sets (parked from the E005 review).
- Baseline, same machine, warm Go cache (a warm-up verify ran first, 82.3 s):
  `rm -rf output && npm run verify` 76.4 s wall, its node --test phase
  33.0 s (duration_ms 33,026; .build/t001-before-verify.log); `node --test`
  alone 27.0 s (.build/t001-before-tests.log); 156 tests. Serial per-file:
  large-source 12.4 s, adt-order 8.8, adt-print 8.5, depth 8.0, compare 7.0,
  adt-properties 6.3, adt-match 4.7, properties 3.8, compiler 3.1, adt-types
  1.7, match-lift 1.5, adt-coverage 0.5.
- test/go-batch.mjs adds `runGoBatch` (design and failure contract in
  docs/engineering.md). Self-tests (test/go-batch.test.mjs, five tests) were
  first run against a stub that throws: 5/5 failed
  (.build/t001-selftest-red.log), then passed against the implementation
  (.build/t001-selftest-green.log). Each also kills a mutant of the harness
  in an isolated copy (.build/t001-mutants.log): a rejection failing the
  whole batch, no blame in the compile diagnostic, a disabled shape guard,
  clearing the go-batches root, and a lost exit status each fail exactly
  the matching self-test; the healthy copy passes 5/5.
- No runGo caller pinned stderr: runGo returned stdout only and asserted
  exit 0, so every caller was migrated: adt-coverage, adt-match, adt-order,
  adt-print (two batches: reprints depend on the first outputs),
  adt-properties, adt-types, compare, compiler, large-source, match-lift,
  properties. Generated-program loops in adt-properties and properties draw
  their programs at module level in the original order; adt-properties'
  20 programs were checked identical to the old in-test draws. Assertions
  and their messages are unchanged; Bumpus sources are unchanged.
- Batch compilation is lazy (first `run`), so large-source's timed
  `checked()` of the 20,000-declaration program is still the first compile
  of that source. Its 5,000-arm timed compile now follows the batch's
  compile of the same source (JIT-warm); the 5 s bound still fails a
  quadratic regression by far, and a cold-compile stack overflow would
  still surface through the batch's own first compile, rethrown by that
  case's `run`.
- After: `rm -rf output && npm run verify` exit 0, 60.7 s wall, node --test
  phase 19.2 s (duration_ms 19,167; .build/t001-after-verify.log), 23 files,
  161 tests, zero failures/skips, eight regression proofs; `node --test`
  alone 15.5 s (.build/t001-after-tests.log). Serial per-file: large-source
  10.7 s, adt-order 6.3 (rest is goTest), adt-print 2.4, depth 8.0
  (unchanged, out of scope), compare 2.1, adt-properties 0.5, adt-match 2.0,
  properties 0.5, compiler 1.6, adt-types 0.4, match-lift 1.2, adt-coverage
  0.5, go-batch 1.4.

T001 review fix round 1 (2026-10-08; review: ready to merge, six cheap items).
(1) large-source: the 5,000-arm case has its own batch (label `arms`),
declared inside its test after the timed compile, so that timed compile is
cold again. (2) The guard self-test gains `package main` followed by
`package other`, and a second multi-line `func main() {`; the two guard
clauses that no self-test bound (the `package \w+` count and the `func main`
count), each replaced by `true`, now fail that test. (3) `runGoBatch` takes
an array of `[name, spec]` pairs and refuses a duplicate name (compared as
strings, as `run` looks names up) at declaration; every caller passes pairs.
New self-test failed first with `Missing expected exception`
(.build/t001-fix1-dup-red.log). (4) The directory self-test removes its
neighbour marker in `finally`. (5) docs/engineering.md: batch directories
persist (`rm -rf .build/go-batches` reclaims them), concurrent test runs in
one checkout race on them, and the 300 s build timeout does not group-kill
(noted rather than changed: spawnSync cannot kill a group). (6) Only the
shape guard's refusal becomes "generated Go was refused"; filesystem errors
propagate as themselves. Mutants in an isolated copy
(.build/t001-fix1-mutants.log): all eight (the five earlier, both guard
clauses, no duplicate check) fail exactly their self-test; healthy 6/6.
`rm -rf output && npm run verify` exit 0: 162 tests, zero failures/skips,
eight regression proofs, test phase 19.9 s, 61.8 s wall
(.build/t001-fix1-verify.log).

## T001 merged (2026-10-08)

User approved. main fast-forwarded to 4230eb9 (T001 7cbf2dd, c4e5cd0 and
review fix round 4230eb9). Clean `rm -rf output && npm run verify` on main
exited 0: zero warnings, 162 tests, zero failures/skips, test phase 19.4 s,
eight regression proofs. Raw log: .build/t001-merge-verify.log. Evidence
and brief archived under .build/merged-t001-evidence; worktree and branch
removed. main pushed to origin at the user's request. Next: P001.

## P001 execution

Plan: docs/plans/2026-10-08-polymorphism-plan.md (spec
docs/plans/2026-10-08-polymorphism-design.md). Branch p001 in
.worktrees/p001; baseline `npm run verify` exit 0, 162 tests, eight
regression proofs (.build/p001-baseline-verify.log).

### Task 1: parameterized type, checked IR, Specialize seam (2026-10-08)

Behavior-preserving refactor; no language change. Pipeline is now Parse →
Resolve → Check → Specialize → Go (Program.Compile `parse >=> resolve >=>
check >=> specialize`, then `emit`).

- Domain.Type (new): `TypeId` (moved from Domain.Resolved, re-exported
  there), `VarId`, `data Ty v = TInt | TBool | TData TypeId (Array (Ty v))
  | TVar v` with Eq, Ord, Functor, Apply, Applicative, Bind (substitution),
  Monad, and `ground ∷ Ty v → Maybe (Ty Void)`. Domain.Resolved re-exports
  it; resolved types are `Ty VarId`. Nothing produces `TVar` or a type
  argument yet.
- Domain.Checked.Internal (new): the former IR shape over `Ty Open`, `data
  Open = Rigid VarId | Hole Int`; `Call` and `Construct` carry an
  `Instantiation` (always empty now); `rigid ∷ Ty VarId → Ty Open`.
  Features.Check* produce and cover it; `check` returns `Checked.Program`
  (the `CheckedProgram` alias is gone).
- Domain.IR.Internal: its own variable-free `Ty`, `TypeInfo`, `CtorInfo`,
  `Tables` (ruling R1). Format.Go* change only imports.
- Features.Specialize (new): `specialize ∷ Checked.Program → Either
  Diagnostic IR.Program`, a copy that converts ground `TData id []`; any
  variable, type argument or non-empty instantiation is E_INTERNAL
  `unspecialized type` at the holding span (unreachable until Task 2).
- Coverage (Signature `candidates`) and Match `typeName` report E_INTERNAL
  on a `TVar` instead of guessing; Task 6 and Task 3/4 replace those arms.
- Structure gate: two `{ module, importers }` rules in scripts/structure.mjs
  `internalModules`. AGENTS.md, docs/engineering.md, docs/architecture.md
  updated. Regression row `branch` needle follows the rename
  (`Checked.typeOf`); still one target, same defect.
- Tests: test/structure.test.mjs gains the two-IR gate test (and its old
  "Features.Check may import Domain.IR.Internal" row now names
  Domain.Checked.Internal, since that import is now forbidden);
  test/specialize.test.mjs `specialize is the identity on monomorphic
  programs` over examples/*.bumpus and the 232 generated programs of the
  two property files. Their generators moved to test/generators.mjs
  (importing a test file would register its tests and build its Go batch);
  draw order and seeds unchanged. test/diagnostics.test.mjs: the two
  white-box coverage tests now build their input from
  Domain.Checked.Internal and pass `TData` its (empty) argument array;
  their assertions are unchanged.
- RED: `node --test test/structure.test.mjs` failed the new gate test
  (`actual: []`, expected `[ 'Features.Check imports Domain.IR.Internal' ]`;
  .build/p001-task1-red-structure.log). `node --test
  test/specialize.test.mjs` failed with ERR_MODULE_NOT_FOUND for
  output/Features.Specialize (.build/p001-task1-red-specialize.log).
- GREEN: `rm -rf output && npm run verify` exit 0, 85.5 s wall, zero
  warnings, 164 tests (162 + 2), zero failures/skips, eight regression
  proofs, bootstrap snapshots unchanged (.build/p001-task1-verify.log).
- Phase reached: every test runs the full pipeline on monomorphic programs;
  the CLI does not compile polymorphic programs (none parse yet).

### Task 2: type parameters and applied types, syntax and resolution (2026-10-08)

Language change: `type List(a) = Nil | Cons(a, List(a));`, lowercase type
variables, parenthesized application. Status: done.

- Domain.Syntax: `TypeRef` gains `VarRef Span String`; `NamedRef` carries
  its arguments and spans head through `)`; `TypeDecl.parameters ∷ Array
  TypeParameter` (`{ name, span }`); `typeRefSpan`.
- Format.Parse.Declaration: optional `(lower, …)` after a type name
  (`type T() = A;` is E_SYNTAX `Expected a type parameter` at `)`); a type
  is Int, Bool, a lowercase name, or an upper name with optional arguments,
  each argument one `nested` level (ADR 006), so 129 deep is E_NESTING at
  the 129th argument. `List()` fails at `)`; `Int(a)`/`a(Int)` at `(`.
- Domain.Problem / Format.Diagnostic: `TypeArguments` (E_ARITY `Wrong
  number of type arguments for <name>`), `UnboundTypeVariable`,
  `DuplicateTypeParameter`, `EntryPolymorphic`; `TypeName` gains
  `AppliedName`, `VariableName`, `HoleName` (rendered `List(Pair(Int, a))`,
  `a`, `_`). Witness and type argument lists share one `listed` helper.
- Domain.Resolved: `TypeInfo.parameters`, `CtorInfo.fieldSyntax` (the
  field's source TypeRef, for Task 5's nested spans), `FunctionDecl.variables`.
- Features.Resolve*: order is type names, the existing duplicate checks, then
  every declaration's type parameters (reported at the repetition, via
  Repeated `laterRepeat`, sort-based), then field types. In a declaration
  `VarId i` is its i-th parameter; an unknown lowercase field type is
  E_UNBOUND. A function's variables are every lowercase name in its
  signature, first occurrence, parameters then result
  (Features.Resolve.Variables `signatureVariables`). Arity is checked at the
  whole reference before its arguments. `main` with a non-ground result is
  E_ENTRY `EntryPolymorphic`, beside `EntryParameters`.
- Features.Specialize: projects `TypeInfo` and `CtorInfo` explicitly, since
  the monomorphic IR does not carry parameters or field syntax.
- Tests: test/phases.mjs (`resolved`, `resolveRejectedAt`, `checkedPoly`,
  `checkRejectedAt`); test/poly-syntax.test.mjs, 21 tests. test/specialize
  `identical` now asserts each checked type has no parameters and each
  constructor one syntax reference per field, then drops both before the
  identity comparison (they are resolution data the IR does not hold).
- RED: `node --test test/poly-syntax.test.mjs`: 19 of 20 failed (the one
  pass, `Int(a)` at `(`, already held) (.build/p001-task2-red.log). GREEN:
  20 of 20 (.build/p001-task2-green.log).
- Conflict resolved by coordinator ruling: `fn main(): int = 1;` is now a
  polymorphic `main` (E_ENTRY `EntryPolymorphic`, span 0–19), as design §1
  requires, not E_SYNTAX at `int`. Only the inputs of two characterization
  rows changed, each keeping its code, span and text:
  test/diagnostics.test.mjs now uses `fn main(): 100 = 1;` (E_SYNTAX
  `Expected a type`, 11–14) and test/adt-syntax.test.mjs
  `fn main(): 1 = 1;`. poly-syntax pins the new `int` behavior (21 tests).
  The specialize identity-helper edit above was accepted (adds assertions,
  removes none).
- GREEN: `rm -rf output && npm run verify` exit 0, 185 tests (164 + 21),
  zero failures/skips, zero warnings, eight regression proofs
  (.build/p001-task2-verify.log).
- Phase reached: these tests reach Resolve only (rejections stop in Parse
  or Resolve through `compile`). The CLI does not compile polymorphic
  programs until Task 7: a use of a type variable or applied type stops in
  Check (E_INTERNAL `Unnamed type variable`) or Specialize (E_INTERNAL
  `unspecialized type`). A declaration whose parameters no field or
  signature uses still compiles, as a monomorphic type.

### Task 3: the unifier (2026-10-08)

No language change; nothing calls the unifier until Task 4. Status: done.

- Features.Check.Unify (new): `Flex = Rigid VarId | Meta Int`; triangular
  `Subst` (a Map from meta to `Ty Flex`), `empty`; `substitute` (one pass,
  Ty's bind; defined on every substitution) and `compose` (law
  `substitute (compose s2 s1) = substitute s2 ∘ substitute s1`);
  `resolve` (full normalization, acyclic substitutions only); `Failure =
  Mismatch | Occurs`; `unify` (rigid only with the same rigid; a meta binds
  to its walked partner unless the resolved partner properly contains it;
  TData argument-wise, left to right, stopping at the first failure). A
  Mismatch carries the first differing subterm pair, an Occurs the meta and
  the containing type, both resolved under the substitution reached at the
  failure. Meta-to-meta chains are followed by a `tailRec` loop (`walk`);
  recursion is over type structure only (see E006).
- Domain.Problem / Format.Diagnostic: `InfiniteType TypeName TypeName`,
  E_TYPE `Infinite type: <a> occurs in <b>` (raised from Task 4).
- Dependencies (user-approved): spago.yaml adds ordered-collections and
  tuples (already locked through tools/style; spago.lock's workspace entry
  lists them; build offline from .spago cache). scripts/structure.mjs
  `coreLibraries` admits exactly Data.Map, Data.Set and Data.Tuple;
  docs/engineering.md records the rule.
- Tests: test/structure.test.mjs `pure layers may use Data.Map, Data.Set
  and Data.Tuple only` (rejects Data.List, Data.Map.Internal, Data.MapX,
  Data.Tuple.Nested, Data.Set.NonEmpty). test/unify.test.mjs, 9 tests: the
  brief's pairs; left-to-right stop; substitute versus resolve on
  {m0 ↦ List(m1), m1 ↦ Int}; 500-case properties (substitute equals a
  one-pass reading and obeys the composition law over arbitrary, possibly
  cyclic substitutions; resolve idempotent with no bound meta left over
  acyclic ones; unify results acyclic, sound, most general for
  ground-range σ pairs, and in agreement with test/unify-oracle.mjs, an
  independent union-find unifier, on success and on the unified types up
  to renaming of metas, for single pairs and for pairs threaded after a
  σ pair: 268 of 1,000 sequences succeed); stack safety at 128-deep types
  and a 10,000-meta chain; the InfiniteType wire rendering (code and text).
- Generator note: drawing the keep/drop decision before each binding
  correlated with the next LCG draw and never produced a bare-variable
  binding, so a `resolve` that stops after one link passed the resolve
  property; the binding is now drawn first.
- Mutation checks (isolated copy under the session scratchpad, not
  regression rows; Task 7 adds `occurs` and `rigid`): occurs check removed,
  rigid unifying with any rigid, resolve stopping after one link, no walk
  in unify, compose with reversed union bias, arguments right to left: each
  fails at least one unify test.
- RED: `node --test test/structure.test.mjs` failed the new gate test
  (`[ 'pure module Features.Check.Unify imports Data.Map' ]`,
  .build/p001-task3-red-structure.log); `node --test test/unify.test.mjs`
  failed with ERR_MODULE_NOT_FOUND for output/Features.Check.Unify
  (.build/p001-task3-red-unify.log). GREEN: 9 of 9
  (.build/p001-task3-green-unify.log).
- GREEN: `rm -rf output && npm run verify` exit 0, 71.2 s wall, zero
  warnings, 195 tests (185 + 10), zero failures/skips, eight regression
  proofs (.build/p001-task3-verify.log).
- Phase reached: unit level only (compiled module loaded from output/). The
  CLI does not compile polymorphic programs until Task 7.

### Task 4: polymorphic checking (2026-10-08)

Language change: rank-1 polymorphic functions and constructors type-check.
Status: done.

- Features.Check is split (every file under 250 lines): Check.purs
  (`check`, `checkFunction`), Check.Infer (expressions), Check.Call (calls
  and constructions), Check.Arms (`checkMatch`), Check.Match (patterns;
  `checkPattern` keeps its old signature, from a fresh state),
  Check.Require (`require`/`expectType` by unification, `typeName`),
  Check.Scheme (state, instantiation, holes), Check.Walk (IR type
  traversal), Check.Comparable (comparison groundness).
- State: `{ subst, next }` threaded explicitly through `infer` in Either;
  arrays are threaded by a private applicative (`threadAll`), whose
  traverse is balanced, so 5,000 arms and 10,000 arguments stay linear and
  stack-safe. During checking a checked-IR `Hole m` is the meta m.
- A function: parameters bind rigid types; the body is inferred, every
  former type equality now a unification in the same order (arguments all
  inferred, then unified; `if` else against then; arms against the first);
  the result unifies; the resolved body's comparisons must be ground (rigid
  variable: E_TYPE `Type <t> is not comparable`; otherwise a hole: E_TYPE
  `Ambiguous type <t> in comparison`; pre-order, at the left operand); then
  unsolved metas are renumbered `Hole 0, 1, …` per function in
  `foldTypes` pre-order. Each use of a function instantiates its
  `variables`, each constructor its owner's `parameters`; `Call` and
  `Construct` record the resolved instantiation in that order.
- Messages: E_TYPE `Expected <t>, found <u>` names both whole operands
  resolved under the substitution before the failing unification (not
  Unify's innermost pair); `InfiniteType` names the meta (`_`) and the
  resolved containing type. Domain.Problem gains `NotComparable` and
  `AmbiguousType` (E_TYPE). The constructor-pattern arity guard (an
  internal error) now runs before the owner lookup and unification.
- Regression row `branch` now targets Features.Check.Infer's
  `checkConditional` (still one target, same defect); docs/engineering.md
  and docs/architecture.md updated.
- Tests: test/poly-check.test.mjs, 16 tests: the brief's rows (rigid
  mismatches, occurs, not comparable at `a` and `List(a)`, ambiguous
  `Nil == Nil` and `Proxy == Proxy`, literal pattern on `a`), plus a
  constructor pattern on `a`, whole-type messages (`Pair(Int, Int)` versus
  `Pair(Int, Bool)`, `Maybe(List(_))`), rigid beside a hole; checked-IR
  rows: `pair(id(1), id(true))` records `[Int, Bool]` (and `[Int]`,
  `[Bool]`, rigid `[a, b]` inside `pair`), `length(Nil)` `[Hole 0]`, dense
  per-function hole numbering, and a pattern's instantiated type.
  test/diagnostics.test.mjs and every adt-* test pass untouched.
- RED: `node --test test/poly-check.test.mjs` on the pre-change build: 16
  of 16 failed (.build/p001-task4-red.log; the final file, rerun against
  HEAD c6e87bc in an isolated copy: 16 of 16 failed,
  .build/p001-task4-red-final.log). GREEN: 16 of 16.
- GREEN: `rm -rf output && npm run verify` exit 0, 96.3 s wall, zero
  warnings, 211
  tests (195 + 16), zero failures/skips, eight regression proofs
  (.build/p001-task4-verify.log).
- Measurements (checking only, warm Node default stack): existing
  depth-forms at 128 and 20,000 declarations: deepest checked type 1;
  `id` nested 128: 1; `wrap(x: a): L(a)` nested 127: 128; `deep(x: a):
  L^127(a)` nested k: checks at k = 40 (5,081 deep), RangeError in
  Unify `resolve` from k = 44 — within every source limit (now E_NESTING
  after fix round 1, below; BACKLOG E006,
  .build/p001-task4-measure-depth.log). `dup(x: a): Pair(a, a)` nested
  12/16/20: 21 ms / 208 ms / 3.2 s, doubling per level (BACKLOG E007,
  .build/p001-task4-measure-dup.log).
- Fix round 1 (review approved; ruling R7, the compiler must not crash on
  a legal program): `inferredTypeLimit = 1000` in Features.Check.Unify. A
  type deeper than that is E_NESTING `Inferred type nesting exceeds 1000
  levels` (Problem `TypeTooDeep Int`). The decision is `exceedsLimit`, a
  stack-safe explicit-stack walk that stops past the limit. It runs on each
  expression's type when it is built (Infer `infer`, at that expression),
  on both operands before each unification and on each binding before the
  occurs check (Unify `Failure` `TooDeep`), and on every type of a finished
  body before it is resolved (Scheme `firstTooDeep`, at the holder's span).
  Also two tests: one constructor at two types in one function, and the
  left-to-right first error `g(1, true)`. `matchCtor` and `checkMatch` are
  split to stay within the declaration budget (`fieldsAgainst`,
  `checkArms`, `laterArm`). Comments now explain the two `Infer` rows and
  mark the `checkPattern` test seam. Walk's `foldTypes` passes spans.
- Fix tests: test/poly-depth.test.mjs, 6 tests: the limit constant; a type
  exactly 1,000 deep checks; 1,001 deep is E_NESTING at the eighth `deep`
  from the inside; `deep(x: a): L^127(a)` nested 44 and 127 deep are
  E_NESTING at the same call (each under 5 s, about 2 ms); a type that
  deepens after it is built is caught by the final bound at `sink`'s call.
  test/poly-check.test.mjs gains 2 tests (18).
- Fix RED: the 6 depth tests fail on HEAD 19ac4a9 in an isolated copy: 5
  fail (RangeError at 44 and 127; no diagnostic at 1,001 or for the late
  deepening; the limit is undefined). The exact-1,000 row passes there,
  because the old code had no bound to trip
  (.build/p001-task4-fix1-red.log, .build/p001-task4-fix1-red-head.log).
  With the final bound disabled in an isolated copy, the late-deepening
  test fails (.build/p001-task4-fix1-mutant-final-pass.log). The two
  poly-check additions pass on the Task 4 code too. They pin behavior
  already correct, so they have no RED.
- Fix GREEN: `rm -rf output && npm run verify` exit 0, 77.2 s wall, 219
  tests (211 + 8), zero failures/skips, eight regression proofs
  (.build/p001-task4-fix1-verify.log). Re-measured: `deep` nested 8 to 127
  is E_NESTING in 2–3 ms. `dup` nested 12/16/20 now takes 42 ms / 441 ms /
  6.8 s (BACKLOG E006, E007 updated).
- Fix round 2 (re-review: R7 partially addressed). Within one unification,
  metas bound at earlier positions chained into each other. Two operands,
  each bounded beforehand, then unified as chains about 1,780 levels deep,
  and unify's recursion threw a RangeError. Unify now threads a level
  (`unifyAt`, one level per applied type, which equals resolved depth) and
  fails with `TooDeep` past `inferredTypeLimit`. A Mismatch whose pair is
  too deep to resolve also fails with `TooDeep`. The span is the expression
  whose unification failed (Require `expectType`, the actual operand).
  Tests:
  - poly-depth: two links of deep^7 and three links of deep^4 are
    E_NESTING at `same`'s second argument.
  - poly-depth: a binding made too deep within its own unification (bindMeta
    `TooDeep`) is E_NESTING at `same`'s second argument.
  - unify: 1,000 levels unify; 1,001 fail with `TooDeep`.
- Fix-2 RED (.build/p001-task4-fix2-red.log):
  - The two-link case threw a RangeError.
  - The three-link case reported E_NESTING at the second arm's pattern `Z`,
    not at the failed unification.
  - The unit test unified 1,001 levels.
  - The bindMeta row already passed, because that branch existed but was
    untested.
- Fix-2 mutants, each in an isolated copy (.build/p001-task4-fix2-mutants.log):
  - Without the bindMeta bound, only the bindMeta row fails.
  - Without the level bound, the two chain rows and the unit test fail.
- Fix-2 margins: inside the checker, unify overflowed between 1,525 and
  about 1,779 levels; in unit context, between 2,218 and 2,250. The bound
  of 1,000 therefore leaves at least a 1.5x margin, not fix 1's 5x, which
  was resolve's figure.
- Fix-2 GREEN: `rm -rf output && npm run verify` exit 0, 65.9 s wall, 223
  tests (219 + 4), zero failures/skips, eight regression proofs
  (.build/p001-task4-fix2-verify.log).
- Fix round 3 (re-review): `bindMeta`'s strict `where` resolved the
  binding before `exceedsLimit` ran. Six or more L^997 links chained in one
  unification threw a RangeError in that resolve. The resolve and occurs
  check now live in `bindBounded`, which runs only after the bound.
  - Test: poly-depth `six chained links of L^997 are E_NESTING, not a
    crash`, at `same`'s second argument.
  - RED: RangeError in `resolve` (.build/p001-task4-fix3-red.log).
  - Reviewer probe /private/tmp/claude-501/probe-t4r2/eager.mjs at 2, 6, 8,
    12 and 20 links: all E_NESTING.
  - Audit of compiled Features.Check*: the remaining strict bindings that
    recurse over a type run only on bounded types (Comparable `variables`,
    Check `settled`, `bindBounded` `resolved`).
  - Unify's `inferredTypeLimit` comment now names unify as the binding
    limit.
  - GREEN: `rm -rf output && npm run verify` exit 0, 64.7 s wall, 224
    tests, zero failures/skips, eight regression proofs
    (.build/p001-task4-fix3-verify.log).
- Known gap: coverage of a constructor's fields at an applied type (for
  example `match m { Just(n) => n, Nothing => 0 }` over `Maybe(Int)`)
  is E_INTERNAL `Coverage of a type variable` until Task 6.
- Phase reached: these tests reach Check only (`checkedPoly`,
  `checkRejectedAt`). The CLI still rejects polymorphic programs until
  Task 7 (Specialize: E_INTERNAL `unspecialized type`).

### Task 5: the instantiation rule (2026-10-08)

Language change: polymorphic recursion and nested datatypes that would
make specialization infinite are rejected (design §4.1). Status: done.

- Check order: typing, then the instantiation rule, then coverage.
  `instantiationRule ∷ Checked.Program → Either Diagnostic Unit`
  (Features.Check.Instantiation) judges types first, in declaration order
  (Features.Check.Nested), then each function's calls in pre-order. Inside
  a strongly connected component of the call graph or of the type
  reference graph (an edge for every declared type a field mentions, at any
  depth), each type argument must be a bare variable of the referrer or
  mention no variable; a hole counts as ground.
- Diagnostics: new ErrorCode `SpecializationError` (wire E_SPECIALIZATION).
  `PolymorphicRecursion f` → `Recursive call to <f> changes its type
  arguments`, at the call; `NestedDatatype t` → `Recursive use of <t>
  changes its type arguments`, at the offending nested reference, found
  by walking the resolved field alongside `CtorInfo.fieldSyntax`.
- Features.Check.Components: `components ∷ Array (Array Int) → Array Int`,
  iterative Tarjan (explicit frame stack, self tail calls, Data.Map and
  Data.Set state), numbered in closing order.
- Function names: the message names the callee, so Resolved, Checked and
  IR `FunctionDecl` gain `name` (Specialize copies it so the identity test
  still compares checked and monomorphic IR unchanged; Go ignores it).
- Tests: test/poly-termination.test.mjs, 23 tests: the brief's accepted
  rows (`length(t)`, mutual `even`/`odd`, swapping, dropping, ground
  substitution, Rose/Forest, `T(b, a)`) plus a hole as ground and wrapping
  into another component (functions and types); rejected rows with exact
  code, span and text (self and mutual `List(a)` calls, §4.3's
  conservative case, `Pair(x, 1)`, first offence in pre-order, `Nest`,
  the nested `W(Pair(Int, a))` reference, mutual types, types before
  functions); generator coverage; 200 generated components accepted and
  each wrapped variant rejected at its call; components against a
  brute-force reachability oracle (300 graphs); 20,000-node chain and
  cycle under 5 s each (about 0.23 s for both). test/poly-components.mjs
  exports the generator (ruling R3): per component its functions,
  arities, calls (variable or ground arguments) and `groundTypes`, plus
  `render` and `wrapped`, for Task 8's bound.
- RED: with the components import stubbed (the module did not exist), 12
  of 23 failed: every rejection row, the generated wrapping test and both
  components tests (.build/p001-task5-red.log). The accepted rows and the
  generator check passed there, as they pin non-rejection. Mutants in an
  isolated copy: a rule that admits nothing fails every accepted row
  (.build/p001-task5-mutant-overreject.log); ignoring components fails
  both cross-component rows, the nested `W` row and the generated test
  (.build/p001-task5-mutant-components.log); treating holes as variables
  fails the hole row and the generated test
  (.build/p001-task5-mutant-hole.log).
- GREEN: `rm -rf output && npm run verify` exit 0, 66.4 s wall, 247 tests
  (224 + 23), zero failures/skips, eight regression proofs
  (.build/p001-task5-verify.log).
- Known gap: `length(t)` and `even`/`odd` match on `List(a)`, which still
  ends in E_INTERNAL `Coverage of a type variable` until Task 6; the test
  accepts exactly that diagnostic for those two rows (coverage runs after
  the rule, so reaching it proves the rule accepted). Task 6 should make
  them plain acceptances.
- Phase reached: these tests reach Check only (`checkRejectedAt`,
  `check`). The CLI still rejects polymorphic programs until Task 7.

### Task 6: coverage over applied types (2026-10-08)

Language change: matches over applied types (`List(a)`, `Maybe(Void)`,
`List(List(Int))`) and over type variables are checked for exhaustiveness
and redundancy (design §5); the E_INTERNAL `Coverage of a type variable`
gap is gone. Status: done.

- Features.Check.Expand: `expand ∷ Array TypeInfo → Array CtorInfo →
  Array (Ty Open) → Lookup Expansion` numbers every application reachable
  from the roots by unfolding constructor fields (finite by Task 5),
  keyed with variables forgotten (rigid variables and holes are one
  abstract type), and builds monomorphic-shaped `types`/`ctors` tables
  over those numbers: application fields as `TData (TypeId n) []`, the
  abstract type as Int (inhabited, no data). Discovery is a `tailRecM`
  loop of one round per frontier, so it is stack-safe. Roots: every data
  type the bodies carry (Features.Check.Walk `foldTypes`, deduplicated in
  a Set) plus every declared type whose constructors mention no variable,
  so inhabitation still settles over every monomorphic declaration.
- Signature: `buildSignature` runs the unchanged `inhabitation` fixpoint
  on the expanded tables; `candidates` maps an application's inhabited
  expanded constructors back to the declared ones (declaration order) and
  gives rigid variables and holes no heads; `fieldTypes ∷ Signature →
  Ty Open → Head → …` substitutes the column's type arguments. Matrix
  `complete` treats a variable column like Int (never complete). Witness
  format unchanged (constructor names only).
- Tests: test/poly-coverage.test.mjs, 19 tests through Parse, Resolve and
  Check: exhaustive `Nil`/`Cons(_, _)` over `List(a)`, a binder over `a`,
  binders under constructors over `a`, `Nothing` alone over `Maybe(Void)`,
  `Maybe(Maybe(Void))`, a hole column, nested heads through
  `List(List(a))`; E_TYPE for `Nothing` over `a` (Task 4 guard); exact
  witnesses `Cons(_, Cons(_, _))` and `Cons(Cons(_, _), _)` through
  `List(List(Int))`, `Pair(_, false)`, `Nothing`, `Just(_)`, `Cons(_, _)`
  over a hole; redundant `_` after a binder and after `Nothing` over
  `Maybe(Void)`; a generic function with a non-exhaustive match called at
  two types reports one diagnostic at the match span; five arm sets over
  `Maybe(Void)` give the same verdict as monomorphic `type MV = N |
  J(Void)` (ADR 003); a 3,000-type parameterized chain where `Dead` needs
  an arm only for `U(Int)` and `U(a)`, not `U(Void)`, each under 5 s
  (about 1.1 s for the test).
- R12: test/poly-termination.test.mjs's `length(t)` and `even`/`odd` rows
  now require plain acceptance; no poly-* test tolerates E_INTERNAL.
- RED: the new test against the pre-change source (src restored, rebuilt):
  14 of 19 failed (six with E_INTERNAL `Coverage of a type variable`; the
  `Maybe(Void)` rows and the chain because inhabitation was per declaration,
  not per application) (.build/p001-task6-red.log). The five that passed
  pin behavior the old code already had (the E_TYPE guard and witnesses
  whose types need no variable column).
- GREEN: `rm -rf output && npm run verify` exit 0, 266 tests (247 + 19),
  zero failures/skips, eight regression proofs; coverage.test.mjs,
  coverage-scale.test.mjs and adt-coverage.test.mjs unchanged and passing
  (10,000-type chain 1.10 s, was 0.89 s in Task 5's log)
  (.build/p001-task6-verify.log).
- Phase reached: these tests reach Check only (`checkedPoly`,
  `checkRejectedAt`, `check`). The CLI still rejects polymorphic programs
  until Task 7.

### Task 7: specialization (2026-10-08)

Language change: polymorphic programs now compile and run end to end
through the CLI (`npm run bumpus -- run examples/lists.bumpus` prints
`Pair(Cons(Pair(3, true), Cons(Pair(2, false), Nil)), Just(6))`).
Status: done.

- Features.Specialize replaces the Task 1 seam: `specialize = specializeWith
  TInt`; `specializeWith ∷ Ty Void → …` (hole representative, for tests);
  `specializationKeys` returns `{ declaration, function, arguments }`, types
  then functions, each in output-id order. Design §6 worklist: seeds are
  every monomorphic type (its fields may reference applications) then every
  monomorphic function, in id order; a single first-in first-out list of
  work items, filled by a `tailRecM` loop; each body is copied in pre-order
  (signature, then an expression's type, a call's instantiation, its
  callee, its arguments; a pattern's type before its fields), and a key is
  created on first reference. Monomorphic declarations keep their order and
  take the first output ids, so monomorphic programs come out unchanged.
  A polymorphic declaration never reached is not emitted.
- R15: keys are hash-consed. Each ground application is numbered once as an
  output type (`Map (Tuple Int (Array IR.Ty)) Int`; IR.Ty gains `Ord`), so
  a key compares in time linear in its arity; `specializationKeys`
  rebuilds `Ty Void` arguments from those numbers.
- Limit: `specializationLimit = 10000` counts only keys of polymorphic
  declarations (function instantiations and parameterized type
  applications); the reference that would create key 10,001 is
  E_SPECIALIZATION `More than 10000 specializations` (Problem
  `SpecializationLimit Int`). A key found in a constructor field is
  reported at its own nested reference (field syntax walked alongside, as
  Check.Nested does).
- Modules: Specialize (API, loop), Specialize.Seeds, .Keys, .Lower, .Body
  and .Copy (a state-and-failure applicative whose Apply does not use Bind,
  so Array's balanced `traverse` keeps wide bodies in shallow stack). Copy
  is a sixth module beyond the plan's Keys and Body. Format.Go needed no
  change: specialized constructors carry source names, so values print and
  re-read (`Cons(Pair(1, true), Nil)`).
- Tests: test/poly-run.test.mjs, 27 tests, one Go batch of 23 programs:
  every §9 function of examples/lists.bumpus printed from `main`; Review
  Focus 1–5 (namespaces `a(5)` → 5; `loop()` fixed by context → 1; `zip`
  value printed and re-read → `Cons(Pair(1, true), Nil)` both ways; an
  8,192-element list from generic `append`, counted by generic `length` →
  8192; `xs < Cons(2, Nil)` inside a generic function → true); `length` at
  `List(Int)` and `List(Bool)` in one program → `Pair(1, 2)`; `length(Nil)`
  → 0 with a single `length` key at Int; exact key order for a small
  program; an uninstantiated polymorphic function and type are not
  emitted; the limit (compile only): 6,000 function keys + 4,000 type keys
  + 500 monomorphic functions and types compile, one more function key and
  separately one more type key fail at `gx(1)` and `QX(1)`.
  test/large-source.test.mjs: 3,000 distinct instantiations (3,000
  function and 3,000 type keys) compile in about 0.6 s (bound 5 s); the
  20,000-declaration programs are unchanged and pass.
  test/compiler.test.mjs: bootstrap/lists.go snapshot and CLI run.
  test/specialize.test.mjs: identity now skips the one polymorphic example
  by name (its count assertion is unchanged).
- bootstrap/lists.go generated with `npm run bumpus -- emit
  examples/lists.bumpus bootstrap/lists.go` and reviewed (types numbered in
  discovery order, `Pair(Int, Bool)` first from `main`'s signature;
  constructors in contiguous blocks; one compare and show helper per
  specialized type; Bool helper emitted). answer.go, shapes.go and tree.go
  are byte-identical (CLI re-emit `cmp`, and their snapshot assertions).
- RED: the new poly-run file failed to load (`specializationKeys` not
  exported); with that import stubbed, all 27 tests failed (the Go cases
  with E_INTERNAL `unspecialized type`, the key tests on the stub); the
  limit test first failed on its own syntax (`match` as a `+` operand, now
  parenthesized), then with `unspecialized type`; the 3,000-instantiation
  test failed with `unspecialized type` (.build/p001-task7-red.log,
  .build/p001-task7-red-limit.log).
- GREEN: `rm -rf output && npm run verify` exit 0, 295 tests (266 + 29),
  zero failures/skips, eight regression proofs
  (.build/p001-task7-verify.log).
- Phase reached: these tests run the whole pipeline (`compile`, the CLI and
  Go). Task 8 adds the specialization properties.

### Task 8: specialization properties (2026-10-08)

Language change: none (tests only). Status: done.

- test/poly-properties.test.mjs, 7 tests, one Go batch of 90 packages
  (30 generated programs, each as generated, with declarations reversed,
  and with Bool as the hole representative); the file runs in about 10 s.
  - execution oracle: each of the 30 programs prints in Go what the
    reference interpreter computes;
  - uniqueness: no two `specializationKeys` are equal (normalized keys
    such as `fn f0[List(List(Int))]`), and every program has polymorphic
    keys;
  - determinism: `compile` twice gives equal Go; the reversed program
    prints the same and has the same normalized key set (sorted arrays,
    declaration and type ids replaced by source names);
  - representative independence: `specializeWith TBool` and `specialize`
    emit different Go for every program (the holes reach specialization)
    and both print the same;
  - termination bound (design §4.2): Task 5's 200 components, each entered
    once from `main` at a random function and random ground arguments
    (Task 5's four plus `List(List(Bool))` and `List(List(_))`); keys per
    component ≤ Σ_{d∈C} |T|^arity(d) with T = the entry's arguments ∪ G_C,
    holes normalized to their representative Int (Task 5's `List(_)`
    reads `List(Int)`), and every key's arguments lie in T. `outside`'s
    keys are not counted (its own component). The bound is often reached
    exactly. Component programs are only counted, never run (R13);
  - two self-checks that do not depend on specialization: the interpreter
    against known outputs (examples/lists.bumpus, int32 wrap, constructor
    order), and the generator mixes permuted and dropped type arguments
    in calls between generic functions, recursion that runs (at least a
    third of the programs make a self call at run time), a hole in every
    program, and `main` instantiations at `List(List(Int))` beside
    `List(List(Bool))` and `Pair(Int, Bool)` beside `Pair(Bool, Int)` of
    the same function.
- Helpers (each under the 250-line limit): test/poly-parse.mjs and
  test/poly-oracle.mjs, the reference interpreter (own tokenizer and
  recursive-descent parser, type syntax read and dropped; untyped values,
  int32 `+`, strict left-to-right, ADR 005 order), sharing no compiler
  code; test/poly-types.mjs, test/poly-expressions.mjs and
  test/poly-programs.mjs, the type-directed generator (List, Pair and a
  generated G whose recursive fields keep or swap its parameters; four
  generic functions calling only earlier ones, with self calls only on a
  part of the recursion parameter, so every program terminates);
  test/poly-keys.mjs, keys by source name. test/poly-components.mjs:
  `render` takes an optional `entry` in place of `main`. The brief named
  one helper file; it is split to respect the size target.
- RED: with `specialized` stubbed to return `Left` (temporary edit,
  reverted), the five properties failed and the two self-checks passed
  (.build/p001-task8-red.log). A second temporary mutant, function keys
  looked up with every applied-type argument treated as equal, failed the
  execution oracle, determinism and representative tests (the batch's Go
  no longer compiled) (.build/p001-task8-mutant-key.log); uniqueness and
  the bound do not catch that mutant, because it reuses keys rather than
  duplicating them.
- GREEN: `rm -rf output && npm run verify` exit 0, 302 tests (295 + 7),
  zero failures/skips, eight regression proofs
  (.build/p001-task8-verify.log).
- Phase reached: the whole pipeline (`compile`, `specializeWith`,
  `specializationKeys`) and Go for the generated programs; the
  components through Specialize only.

### Task 9: regression proofs and documentation (2026-10-08)

Language change: none (regression rows and documentation). Status: done.

- Four regression rows in scripts/regression.mjs, each one needle in the
  current code, probes in test/regression-poly.mjs (imported by
  test/regression.mjs, which stays at 152 lines; each probe uses only the
  compiler it is given):
  - `occurs`: Features.Check.Unify `bindBounded`, `if mentions meta
    resolved then` → `if false then`. Healthy: E_TYPE `Infinite type: _
    occurs in List(_)`. Mutant: the cyclic binding is caught later by the
    depth bound, E_NESTING `Inferred type nesting exceeds 1000 levels`, so
    the probe fails `occurs check missing`.
  - `rigid`: Unify `unifyHeads`, the rigid-with-same-rigid arm →
    `TVar (Rigid _), _ → Right subst` plus `_, TVar (Rigid _) → Right
    subst`. Healthy: `fn f(x: a): Int = x;` is E_TYPE `Expected Int, found
    a`. Mutant: accepted (`rigid variable unified with Int: null`).
  - `instantiate`: Features.Check.Scheme `instantiate` no longer advances
    the meta counter (`, state: state { next = … }` → `, state: state`), so
    later uses reuse the same metas. Healthy: `pair(id(1), id(true))`
    prints `Pair(1, true)`. Mutant: rejected (`scheme metas shared across
    uses: probe program was rejected`).
  - `spec-key`: Features.Specialize.Keys `applied` keys each data-type
    argument as `TData (TypeId 0)` (Int and Bool kept). Healthy: the
    `length` program over `List(List(Int))` and `List(List(Bool))` prints
    `Pair(1, 2)`. Mutant: Go build fails (`cannot use … (value of struct
    type bumpusTy1) as bumpusTy0 value`), probe fails `nested
    specialization keys collided`.
  Evidence: .build/p001-task9-mutants.log (each probe exit 0 on the healthy
  build, exit 1 with its message on its mutant).
- RED/GREEN for the rows is the regression script itself: each row asserts
  the healthy compiler passes and the isolated mutant fails with the row's
  message. `node scripts/regression.mjs`: twelve `Regression proof (…)`
  lines, 43.5 s wall.
- Docs: docs/adr/007-specialization.md (new: phases, typing, holes and the
  representative with the four validity conditions, opaque variables and
  comparison groundness, the instantiation rule with the §4.2 proof and
  §4.3 conservatism, the inferred-type depth bound with measured margins
  and the default-stack assumption, hash-consed keys, the limit's
  accounting, the R18 span deviation); docs/language.md (grammar, types,
  a Polymorphism section: scoping, rigid/flexible, holes, groundness,
  patterns and coverage, the rule, depth bound, limit; lowercase `int` is
  a variable); docs/architecture.md (final pipeline and phase list, depth
  bound, P001 test files, new rows); docs/engineering.md (test count, the
  four rows); BACKLOG.md (P001 Done on p001; E006 and E007 updated; new
  E008 Expand keys, E009 `did you mean Int?` hint, E010 `_` in mismatch
  messages, E011 near-limit diagnostic elision); docs/findings.md (P001
  observations); README.md (ADR 007 link); docs/next-session.md.
- GREEN: `rm -rf output && npm run verify` exit 0, 85.3 s wall, zero
  warnings, 32 test files, 302 tests, zero failures/skips, twelve
  regression proofs (.build/p001-task9-verify.log).

### P001 summary

Rank-1 polymorphism is implemented on branch p001 (Tasks 1-9, commits
959a7d1 onward). Parameterized types and generic functions type-check with
rigid signature variables, fresh metas per use and occurs-checked
unification; comparisons need ground operand types; unsolved metas are
holes that Specialize fills with Int; the instantiation rule makes the set
of specializations finite; coverage works over applied types; inferred
types are bounded at 1,000 levels (E_NESTING, never a crash); a pure
Specialize phase produces the variable-free monomorphic IR with
hash-consed keys and a 10,000-key limit. Monomorphic programs emit
byte-identical Go. Tests grew from 162 to 302 and regression proofs from
eight to twelve. ADR 007 records the decisions (rulings R1-R20 in the
plan's ledger). Open follow-ups: BACKLOG E006-E011. Pending: final
whole-branch review and the user's approval to merge; FN001's currying
direction is to be discussed with the user before its design.

### P001 final review fixes (2026-10-08)

The final whole-branch review (verdict: with fixes) found one Important
issue and several minors; all were fixed in one commit on p001.

- Unify meta chains (Important). `unifyHeads` bound the left (older) of
  two unbound metas to the right (newer), so sibling metas joined in turn
  formed one chain as long as the siblings, which every later `walk`
  followed: quadratic. Now the newer (larger id) is bound to the older;
  self-binding, the depth bound and the occurs check are unchanged
  (`bindMeta` still decides the bound before `bindBounded` resolves). New
  tests in test/large-source.test.mjs, 5 s bound: 5,000 match arms of
  `Nothing` (then `_ => Just(0)`) and 4,000 `Nil` arguments to
  `f(x0: b, …)`. RED (before the fix, built output): 15.8 s and 8.5 s;
  GREEN: 1.55 s and 0.15 s. A first `Nothing` followed by `Just` arms grows
  no chain (1.6 s before the fix too), so the test uses all-`Nothing` arms.
- The reviewer's one unexplained `actual false, expected true`. Reproduced
  by running the eight P001 test files three at once: it is the 5 s timing
  bound of poly-depth `an inferred type exactly 1000 deep checks`, which
  took 2.9 s alone and 7.0-9.0 s under that load. It does not depend on
  binding direction (2.8 s with either). Profiling showed nearly all of
  that time in `Ord (Ty Unit)` comparisons of Features.Check.Expand's
  whole-type map keys, 1,000 applications nested up to 1,000 deep. Expand
  now keys its numbering by a canonical string spelling of the key (one
  native string comparison) and keeps number-to-key in a second map:
  2.8 s to 0.35 s alone, 1.9 s under the same triple load, where it no
  longer fails; the 3,000-application coverage chain is 0.72 s to 0.65 s.
  This is a constant-factor fix; hash-consed keys (BACKLOG E008) remain
  the asymptotic one. The same triple load also failed Go batches,
  because concurrent runs of one test file in one checkout share
  .build/go-batches/<id> (BACKLOG T002); verify runs each file once.
- poly-check rejection rows now also run through `compile` (support.mjs
  `rejectedAt`), asserting the same code, span and text (design §8,
  "through the CLI"); the Check-level rows stay.
- Components: unreachable fallbacks are gone or report E_INTERNAL. A
  frame carries its node's order and low and `open` maps each open node to
  its order, so no lookup can miss; an edge to a node outside the graph,
  a component root missing from the stack and an unnumbered node stop the
  search with E_INTERNAL (`components` returns `Either Diagnostic`). New
  test: an edge to a missing node is E_INTERNAL; the reachability and
  20,000-node tests pass unchanged in substance.
- Docs: ADR 007 and next-session cite rulings R1-R20; README describes
  P001 as implemented without branch status; docs/language.md places the
  occurs-check E_TYPE at the argument `t`.

Verification: `rm -rf output && npm run verify` exits 0 in 90 s wall
(97 s on an earlier run) with 318 tests (302 + 2 timing + 1 E_INTERNAL +
13 compile twins), zero warnings and twelve regression proofs
(.build/p001-final-fix-verify.log). The eight files (`node --test
test/unify.test.mjs test/poly-*.test.mjs
test/diagnostics.test.mjs`, 153 tests) passed three sequential runs
(.build/p001-final-fix-run{1,2,3}.log).

## P001 merged (2026-10-08)

User approved the merge (no push). main fast-forwarded from 79c2327 to
dcb40fb (P001 Tasks 1-9, the final-review fix wave, and the merged main
direction commits). Clean `rm -rf output && npm run verify` on main exited
0: zero warnings, 318 tests, zero failures/skips, twelve regression
proofs. Raw log: .build/p001-merge-verify.log. Per-task logs, briefs,
reports, review packages and the ledger (rulings R1-R20) archived under
.build/merged-p001-evidence; worktree and branch removed. Next: FN001,
starting with the currying discussion recorded in BACKLOG.

## FN001 direction settled (2026-10-08)

Discussed with the user before any design decision, as BACKLOG required.
Settled: curried semantics with Algol-like multi-argument syntax as
proposed (partial application, over-application, under-application
becomes a function-typed value with a `missing N argument(s)` hint
replacing today's under-application E_ARITY); lambdas `fn(x) => body`
reusing `fn` and `=>`, parameter annotations optional and inferred
locally; `|>` included in FN001 (left-associative, below comparison),
`>>`/`<<` wait for a Prelude; no local binding form in FN001 (separate
item), so closures capture parameters and pattern variables by value.
Design draft written the same day:
docs/plans/2026-10-08-functions-design.md (syntax, names, typing, declared
arity, evaluation, instantiation rule, canonical uncurried Go
representation with adapters, tests and regression probes, deliberate
diagnostic changes, four open questions). Not reviewed or approved; no
plan, no code. Next: the user's review of the draft.

## FN001 design revised after the user's review (2026-10-08)

The user's review of the first draft: revise before approving. The
canonical uncurried representation (`A -> B -> C` as `func(A, B) C` with
adapters) lost declared-arity timing: with `fn stuck(n: Int): Int -> Int
= stuck(n);` and `use(f) = drop1(f(1))`, `use(stuck)` must diverge but
the adapter made `f(1)` a partial application returning 0; lambda
eta-expansion delayed bodies the same way, and the draft's "delays
nothing observable" claim was wrong. Revision: nested Go function values
`func(A) func(B) C`, staged wrappers for named functions and constructors
used as values, direct saturated calls unchanged; declared arity is a
stage boundary; pipe evaluates its left operand first (kept as a `Pipe`
IR node); constructors are curried values; `_` discards lambda
arguments; the under-application hint is narrow with provenance rules;
timing tests use instrumented bounded panics, never stack exhaustion;
arrow spines are depth-flat, traversed iteratively, named Go function
types keep text linear, scale tests at 5,000 parameters. Section 12 of
the design maps each finding. Not yet approved; no plan, no code.

## FN001 design approved; plan drafted (2026-10-08)

The user approved the revised design and asked for the plan. While
writing it, the section 8 `go build` question was measured on
hand-written Go (scratchpad, Go 1.26.4): nested-closure staged wrappers
took 1.3 s at 50 parameters, 2.6 s at 100, 13.9 s at 200, 221 s at 300,
and did not finish within 10 minutes at 1,000; an environment struct
copied per stage took 1.1 s at 300 and 1,000 and 12.8 s at 5,000. A
parameter bound is not viable (large-source already checks a
20,000-parameter declaration). Recorded as design Amendment A1 (section
13, proposed): no nested Go closures; staged wrappers and every lambda
lifted to top-level stage chains over linked environments; meaning and
types unchanged. Plan: docs/plans/2026-10-08-functions-plan.md (nine
tasks; Task 1 re-measures the linked environment before any lowering
code). Awaiting the user's confirmation of A1 and review of the plan.
No code.
Verify for this docs change: first run failed one timing test (match
ladder 1,830 ms over its 1.5 s bound under external load, 471 ms alone;
.build/fn001-plan-verify.log), recorded as BACKLOG T003 before
re-running; second run exit 0, 318 tests, twelve regression proofs, the
ladder at 752 ms (.build/fn001-plan-verify-2.log).

## FN001 plan approved with changes (2026-10-08)

The user approved A1's architecture (top-level stages, immutable
environments) and the nine-task structure with three changes, applied to
the plan: Task 1 has no quadratic fallback (if the linked environment
fails its linearity thresholds, stop and reconsider with the user) and
benchmarks runtime with repeated applications, every argument consumed,
explicit build/run timeouts; equality, ordering and type interning are in
the scale work (hand-written spine-iterative `Eq`/`Ord` for both `Ty`s in
Tasks 2 and 5, arrows hash-consed in Specialize.Keys, Go function type
names numbered from interned suffixes in Task 6, a 5,000-parameter
function type as a generic argument in Tasks 5 and 8); the core timing
probes move into Task 6's first step, Task 7 keeps the interpreter and
generated comparisons. Accepted diagnostic adjustments now in the design
(§2, §4, §9): over-application past a non-function and `f()` keep
E_ARITY `Wrong number of arguments`; `x()` and `N()` keep E_NOT_CALLABLE.
Task 1 (measurement only) authorized in .worktrees/fn001.

## FN001 Task 1: linked-environment measurement (2026-10-08)

Branch fn001 (.worktrees/fn001). Added scripts/stage-shapes.mjs (Go
generator: linked, copied, nested; attribution baselines direct, bare,
idle, chain; remedy candidates shared, packed) and
scripts/stage-probe.mjs (explicit build/run timeouts, repeated
applications with every argument consumed, checksums recomputed in
JavaScript, growth-exponent verdict). Every run's checksum matched. The
first verdict line ("linear") was wrong: its ratio bound admitted a 16×
build for 4× n; replaced by the exponent bound before any decision. Result
(design §13 "A1 measurement"): the linked environment fails the build
bound (k = 1.92 with the statement driver, 1.74 without applying it);
run time is linear. Attribution: the last stage's `n`-local unpack and
`n`-argument call; a packed calling convention fixes the staged value
(k = 1.23 including a k = 1.52 floor of types and `f`). Applying a value
to `n` arguments in one Go function is k ≈ 2 in every shape. Stopped per
the user's ruling: no representation adopted; decision returned to the
user. No compiler change.

## FN001 Task 1, round 2 (2026-10-08)

User authorized a second measurement round only. Added
scripts/stage-baselines.mjs (types, signature, body, call),
scripts/stage-mixed.mjs (mixed Int/Bool/pointer parameters, each read
twice out of order; today's n-ary convention, packed per-type arrays,
packed struct), scripts/stage-blocks.mjs (block-split application,
arguments evaluated in place), scripts/stage-order.mjs (order, body-entry
and shared-partial checks with expected output computed from the
semantics); probe reports total build times and an exponent per program.
All checksums matched; four order cases matched; a hoisting mutant of the
helpers failed the order check (scratchpad, not committed). Results in
design §13 "round 2": Go's growth is confirmed in large bodies (today's
convention, mixed body: 1.51 s / 33.6 s at 5,000 / 20,000); packed
arrays plus blocks of 64: 2.45 s / 19.2 s; homogeneous packed, blocks of
64: 2.08 s / 13.1 s; runtime linear. Nothing adopted; proposed Go bounds
returned to the user. No compiler change.

## FN001 Task 1 complete (2026-10-08)

The user approved the scale rule (Bumpus phases linear and stack-safe;
Go builds at most 10 s per program at 5,000 parameters in verify and
100 s at 20,000 in the milestone probe) and one final round, adoption
conditional on the shared-body bound and type-diversity allocation.
Added scripts/stage-shared.mjs. Round 3 (.build/fn001-task1/run5-*.log):
shared body with direct call, packed entry and a shared partial, total
build 3.4 s / 5.1 s at 5,000 (3 / 1,000 types) and 52.1 s / 80.0 s at
20,000; 49.3 / 52.0 bytes per stage; checksums matched. Both conditions
hold; convention adopted and written as design §13 rules 1-8; plan Task 6
interfaces and tests updated; conclusions narrowed ("tested large
bodies", not "no representation"). The 20,000 / 1,000-type build uses
80% of its bound. Next: Task 2.

### FN001 Task 2: the arrow type (2026-10-08)

Branch fn001. Behavior-preserving: no syntax produces an arrow yet.

- What changed: `Domain.Type.Ty` gains `TFun (Ty v) (Ty v)` with spine
  helpers (`spine`, `spineThrough`, `arrows`, `children`; a loop each, in
  Domain.Type itself since the instances need them). Eq, Ord and Functor
  are hand-written: arrow spines are walked in step by a loop, applications
  compare inline (the first version, through helpers, overflowed
  test/poly-depth `an inferred type exactly 1000 deep checks` in verify;
  fixed. Headroom figures are approximate (JIT variance): my probe gave
  `compare` the derived instance's spare frames at 1,000 levels and `==`
  about 8,700; the review measured `compare` at 8,592 spare frames in
  most runs but 6,249 in 2 of 10, and the pipeline's minimum stack for
  the poly-depth 1,000-deep case at about 559 KB both before and after).
  Bind (substitution) and `ground` walk spines by a loop. Unify: arrow
  against arrow unifies parameters at level + 1 and results at the same
  level in a `tailRec` loop entered only when both heads are arrows (list
  nesting stack headroom unchanged, measured); `resolve`, `exceedsLimit`
  and the occurs check follow the same measure. `Problem.FunctionName`,
  rendered right-associatively by a loop with function parameters
  parenthesized. Comparable: rigid, then hole, then a new function check
  through the new Features.Check.Functional (declared types whose fields
  reach an arrow, settled once per program over the reverse reference
  graph; a program with no arrow field builds no graph). Signature and
  Matrix treat an arrow column as abstract; Inhabited and Expand treat
  every arrow as inhabited and never unfold it; Expand spells arrows
  `f(…)`; Nested's reference graph enters arrows, and a resolved arrow
  field is an Internal field-syntax mismatch until Task 3 adds the
  syntax. Specialize.Lower: `Internal "unlowered function"`.
- Tests seen failing first (all three files failed to import `TFun` before
  the code): test/unify-arrow.test.mjs (7 tests: arrow against arrow;
  mismatch inside a parameter and a result; meta against an arrow and
  occurs through one; rigid against an arrow; a 5,000-long spine unifies
  and resolves; 1,001-deep parameter nesting is TooDeep while a 5,000-long
  spine is not; a meta bound through a spine), test/type-order.test.mjs (5
  tests: Eq/compare on equal and last-parameter-differing 20,000-long
  spines; substitution and `ground` on one; agreement with the derived
  order on 2,000 generated arrow-free pairs, whose reference was first run
  against the old derived instance and passed; arrow name rendering; a
  20,000-long name). test/unify.test.mjs and the independent oracle
  test/unify-oracle.mjs generate arrows; shared helpers moved to
  test/unify-support.mjs.
- Mutants (isolated copies in the scratchpad, not committed): result side
  counted +1 in `exceedsLimit`; parameters unified at the same level;
  recursive arrow equality; recursive, unparenthesized name rendering.
  Each fails at least one new test.
- Reach: unit level only (Domain.Type, Unify, Format.Diagnostic). The
  Comparable, Inhabited, Expand, Nested and Lower cases are covered by the
  checker identity until Task 4 can produce arrows.
- GREEN: `rm -rf output && npm run verify` exit 0, 330 tests (318 + 12),
  zero failures/skips, twelve regression proofs; bootstrap snapshots
  unchanged.
- Review fixes (commit after c4e9ed1): test/functional.test.mjs (3 tests:
  the fixed point through fields, mutual and through applied arguments;
  `containsFunction`; a 50,000-type chain under 5 s), seen failing on an
  isolated no-fixed-point mutant (seeds only: 2 of 3 fail); `spineThrough`
  can no longer file a result as a parameter (its unreachable arm adds
  none); a redundant Inhabited arm removed; a unify-arrow test renamed;
  headroom figures above reworded as approximate.

### FN001 Task 3: syntax and resolution (2026-10-08)

Branch fn001. No existing row changes; bare names and calls of locals keep
their P001 resolution until Task 4.

- What changed: Format.Lex lexes `->` and `|>` longest first. Domain.Syntax
  gains `FunRef`, `Lambda`, `Apply`, `Pipe`, `LambdaParam` and
  `typeRefSpine` (a loop). The type parser moved to the new
  Format.Parse.Type: an arrow chain is read as a list (Grammar
  `chainRight`, Cursor `rightAt`, a `tailRecM` loop) and folded right;
  `(A, B) -> C` flattens to `A -> B -> C`; a list of two or more types not
  followed by `->` is `Expected ->`, `()` is `Expected a type` at `)`.
  Nesting follows design §1 (parameter side +1, checked at its `->`;
  result side +0); type parentheses are one level while parsed (Cursor
  `groupedAt`) and none once closed, recorded in ADR 006's new FN001
  section. Format.Parse.Lambda parses `fn(x, _: T) => body` (`Expected a
  parameter`); Format.Parse.Expression adds `|>` (a `chainLeft1` over
  comparisons) and postfix application (Grammar `manyOn`; flattened by
  the review fixes below); a name call stays `Call`. Domain.Resolved
  gains `Lambda` (with `Param = { local, ty, span }`), `Apply` and `Pipe`;
  Features.Resolve.Lambda resolves parameters (E_DUPLICATE `Duplicate
  parameter x` at the first occurrence of the earliest repeated name,
  `fn(b, a, a, b)` at the first `b`, as for functions; `_` gets no
  LocalId; annotations against the signature's variables, E_UNBOUND
  `Unbound type variable b`); `resolveType` and `occurrences` walk
  written spines by loops. Check.Infer returns `Internal "unchecked
  function"` for the three new nodes. Check.Nested replaces Task 2's
  placeholder: an arrow field is judged beside its written spine
  (parameters and final result, paired by a loop), so a nested reference
  inside an arrow is reported at its own span. test/poly-parse.mjs (the
  oracle's own parser) reads arrow types, lambdas, postfix application and
  pipes, independently. Style gate: Format.Parse.Type and
  Format.Parse.Lambda join the applicative production modules. BACKLOG
  E003 notes two dispatches now over the branch target.
- Not added: Resolved `FunctionRef`/`CtorRef` expression constructors.
  Domain.Resolved's `GlobalRef` already has constructors of those names,
  so adding them needs that rename, which belongs with Task 4's bare-name
  resolution.
- Tests seen failing first (before any code): test/fn-syntax.test.mjs and
  test/fn-names.test.mjs, 43 tests, 42 failing and one passing (`1 +
  fn(y) => y` is `Expected an expression` at `fn` before and after, kept
  as a characterization row); test/fn-oracle-syntax.test.mjs, 2 tests,
  both failing. Added after the code, each shown to bite by an isolated
  mutant (scratchpad copy, not committed): `a parameter inside a
  parameter counts both levels` (mutant: a parameter contributes no level
  in `rightAt`), the `(Int -> L^127(Int)) -> Int` row (mutant: a result
  contributes a level), `127 further applications parse; one more is
  E_NESTING` (mutant: postfix application without `infixed`). Further
  mutants, each failing the named rows: type parentheses keeping their
  level (`128 nested parameter positions resolve`); no lambda duplicate
  check (both E_DUPLICATE rows); Nested arrow arm restored to a mismatch
  (all four arrow-field rows); no `Expected ->` lookahead (both rows).
- Plan Step 1's "each §2 table row" is covered for lambda parameters
  (bare local, shadowing a parameter, a function and by a match binder,
  `_`, duplicates, rigid and unbound annotations). The rows for bare
  function and constructor names and calls of locals change in Task 4
  (plan Global Constraints), so no interim outcome is pinned here.
- Reach: Parse → Resolve (test/phases.mjs); the Nested arrow-field rows
  run Check (`checkRejectedAt`, `checkedPoly`), whose programs contain no
  lambda, application or pipe.
- GREEN: `rm -rf output && npm run verify` exit 0, 380 tests (333 + 47),
  zero failures/skips, twelve regression proofs; bootstrap snapshots
  unchanged. Log .build/fn001-task3-verify.log.
- Review fixes (follow-up commit): I1, postfix chains are flattened into
  one `Apply` of every group's arguments in order (`g(1)(2)(3)` is `Apply
  (Call g [1]) [2, 3]`, exact under design §5), the callee one level
  deeper once per chain, replacing the per-group level, which made plan
  Task 8's 1,000-application chain E_NESTING. Seen failing first: the new
  row `a chain of 1000 postfix groups resolves to one Apply` failed with
  E_NESTING (NestingTooDeep 128 at the 129th group's `(`; log
  .build/fn001-task3-i1-red.log), as did the flattened shape and span
  rows; the 128-application E_NESTING row is removed. M1, ADR 006 states
  that a parenthesized type raises its contents' depth while parsed, with
  the four `L^127((Int -> Int))`/`L^128((Int))` rows in the new
  test/fn-depth.test.mjs (passing on arrival: they pin behavior). M2,
  design §1 clarifies empty value applications. M3, five FN001 forms in
  scripts/depth-forms.mjs (`functionForms`, named-only in
  depth-probe.mjs), checked at the limit and one past it through Resolve
  by test/fn-depth.test.mjs; the review's lifted-limit figures in ADR 006;
  plan Task 6 Step 3a re-measures them. M4, BACKLOG E003 trigger
  reworded. M5, the duplicate wording above, with a `fn(b, a, a, b)` row.
  GREEN: `rm -rf output && npm run verify` exit 0, 387 tests (380 - 1 + 8),
  zero failures/skips, twelve regression proofs, snapshots unchanged (log
  .build/fn001-task3-fix-verify.log).

### FN001 Task 4: checking (2026-10-08)

Branch fn001. Reach: Parse → Resolve → Check (test/phases.mjs,
test/fn-checked.mjs); one CLI row asserts that checked function programs
reach Specialize as `Internal "unlowered function"`.

- Resolution (design §2): Domain.Resolved's `GlobalRef` constructors are
  renamed `GlobalFunction FunctionId Int` (with the declared parameter
  count) and `GlobalCtor CtorId`, freeing `FunctionRef Span FunctionId`
  and `CtorRef Span CtorId` for expressions. A bare name is a local, else a
  function with parameters (`FunctionRef`), else a zero-parameter function
  (Resolve: E_ARITY `Expected f()`, new `Problem.FunctionNeedsCall`), else
  a constructor (`Construct` with none if nullary, `CtorRef` otherwise),
  else E_UNBOUND. A local called with arguments is `Apply (Local …)`, the
  local spanning the name; `x()` stays E_NOT_CALLABLE. `CtorNeedsArguments`
  is removed (no longer produced).
- Checked IR: `FunctionRef`, `CtorRef`, `Apply`, `Lambda (Array Param)`,
  `Pipe`; `Call`/`Construct` hold 1..n arguments (partial when fewer).
- Checking: Features.Check.Use (schemes; value references build the
  curried arrow, direct calls keep fields as an array), Call (named callee:
  j = n today's path; 0 < j < n checks j fields, typed as the arrow of the
  rest; `f()` with parameters E_ARITY before arguments; j > n: E_ARITY
  before any argument if the declared result can never be a function
  (Int, Bool, declared type), else check n, E_ARITY at the call if the
  instantiated result is not an arrow or unbound meta, else apply the rest
  as `Apply (Call f a1…an) rest`), Apply (one argument at a time, the type
  threaded with the state by Scheme's `threadAll`, now generic in its
  state; an unbound meta is bound to `α -> β`; anything else is E_TYPE
  `Expected a function, found T` at that argument), Pipe, Lambda (fresh
  metas or rigid annotations), Hint, Context (shared env rows). `require`
  wraps a TypeMismatch in `Hinted problem (MissingArguments f k)` per §4's
  provenance rules (the found expression's own node a partial `Call` or
  `Construct`; expected type's head, under the state before the failure,
  neither an arrow nor an unbound meta). Walk, Comparable, Coverage cover
  the new nodes; a function scrutinee admits only `_` and binders (by
  unification, unchanged Match). Check judges a printable `main` before any
  body: E_ENTRY `Expected fn main() with a printable result type` when the
  result contains an arrow directly or through declared fields
  (Functional). Instantiation's `foldCalls` enters `Apply` and `Pipe`
  (calls there are ordinary edges); value references and lambda bodies are
  Task 5's. Specialize.Body returns `Internal "unlowered function"` for
  each new node.
- Decisions not dictated by the plan: (1) `a |> g(b1…bk)` with k = n is
  the over-application `g(b1…bk, a)`: E_ARITY at the right operand's span
  when g's result is not a function; any other right side is applied to
  `a` (NotAFunction at `a`). `a |> f()` keeps `f()`'s own E_ARITY. (2) The
  over-application E_ARITY is checked before arguments when the declared
  result is Int, Bool or a declared type, so those wrong counts keep their
  pre-FN001 order of errors. (Corrected by the review: a result type
  variable cannot keep it; see the review fixes below.) (3) Only a TypeMismatch
  is hinted (an occurs
  failure never has a non-meta expected head). (4) The printable-entry
  check lives in Features.Check (it needs Functional), not
  Check.Signature, which is the coverage signature.
- Changed rows (old → new):
  - test/diagnostics.test.mjs `fn f(): P = Pair;`: E_ARITY 37-41 `Pair`
    `Constructor Pair needs arguments` → E_TYPE 37-41 `Pair`
    `Expected P, found Int -> Int -> P`.
  - test/adt-types.test.mjs `fn main(): Int = Cons;`: E_ARITY at `Cons`
    (58-62) `Constructor Cons needs arguments` → E_TYPE 58-62
    `Expected Int, found Int -> IntList -> IntList`.
  - `fn main(): Int = Cons(1);`: E_ARITY at `Cons(1)` (58-65) `Wrong number
    of arguments` → E_TYPE 58-65 `Expected Int, found IntList -> IntList;
    missing 1 argument to Cons?`.
  - `fn helper(): Int = 1; fn main(): Int = helper;`: E_UNBOUND at the
    second `helper` (80-86) `Unbound local helper` → E_ARITY 80-86
    `Expected helper()`.
  - test/adt-match.test.mjs `Cons(f, _) => f(1)`: E_NOT_CALLABLE at `f(1)`
    `Local is not callable: f` → E_TYPE at `1` (128-129)
    `Expected a function, found Int`.
  The adt-types rows now also assert these messages. No other existing
  assertion changed.
- Tests seen failing first (log .build/fn001-task4-red.log): 81 tests in
  test/fn-check.test.mjs, test/fn-hint.test.mjs, test/fn-rules.test.mjs;
  74 failed, 7 passed on arrival (comparison of `Int -> Int` and
  `Box(Int)`, three patterns on a function scrutinee and a redundant arm
  after `_`, which Task 2's type passes already gave; kept as
  characterization). Two markers were then corrected in the tests (an
  earlier `= x` in the prelude) and one unhinted row rewritten to `g + 1`
  so the found expression is the binder, not the match.
- Mutants (isolated scratchpad copy, not committed), each failing new rows:
  hint ignoring the expected type (2 rows: expected function), hint looking
  through `Apply` (`add3(1)(2)`), over-application always E_ARITY (4
  rows), partial application typed as the result (63), a non-function
  bound to an arrow instead of NotAFunction (6).
- Observed: one direct `node --test test/*.test.mjs` run failed
  match-lift's 1.5 s ladder at 1,780 ms (load); evidence added to BACKLOG
  T003. BACKLOG E003 counts updated.
- GREEN: `rm -rf output && npm run verify` exit 0, 468 tests (387 + 81),
  zero failures/skips, twelve regression proofs, bootstrap snapshots
  unchanged; `twenty thousand parameters are checked in linear time`
  passes unchanged (258 ms). Log .build/fn001-task4-verify.log.
- Review fixes (follow-up commit). I1: over-application through a result
  type variable checks the n arguments first, which inherently changes
  pre-FN001 outcomes with no existing row: `id(true + 1, 2)`,
  `fst(1, true + 1, 3)`, `loop(true, 2)` E_ARITY → E_TYPE at `true`;
  `id(id(1, 2), 3)` keeps E_ARITY at the inner `id(1, 2)`; `loop(1, 2)`
  (`loop: Int → a`) is accepted by Check (each confirmed). Recorded in
  design §9; the first two pinned in test/fn-check.test.mjs (they pass on
  0a49dfd, pinning behavior). I2: the Specialize row was vacuous (its
  prelude's `k` failed first); it now uses its own two-function program and
  asserts each node's own span for `(fn(x) => x)(1)`, `1 |> add(2)`,
  `id(add)(1, 2)`, `add(1)(2)`. Isolated mutants: Specialize copying
  `Apply`'s callee and `Pipe`'s left operand, and `Apply` alone, each make
  it fail (`invalid program compiled`). M1: a pipe into a saturated call
  whose declared result is Int, Bool or a declared type is E_ARITY right
  after the left operand, before the call's arguments (design §9);
  `1 |> add(true, 2)` failed on 0a49dfd (E_TYPE at `true`). M2:
  Format.Parse.Expression's primary reports where it starts, so an
  application of a parenthesized callee spans from its `(`; Task 3's
  `(g)(x)` row in test/fn-syntax.test.mjs moves from `g)(x)` to `(g)(x)`
  (with `((g))(x)(y)` and a bare `(g)` rows), the hint row
  `(fn(x) => add(x))(1)` likewise, and `(add)(1)` is a new no-hint row; on
  0a49dfd the three span rows and the Specialize row failed (5 failures,
  test log in the scratchpad). M3: plan Task 4 Files list corrected. M4:
  docs/language.md Names paragraph points to the design as superseding,
  pending Task 9. Perf: `supplied` builds the arrow only for a partial
  application. Match ladder alone, six alternating runs before/after the
  change: 519/518, 525/519, 524/527, 514/514, 508/535, 578/1,641 ms (the
  last pair under an external load spike), then four more under load
  average 7.4: 686/642, 741/715, 715/713, 700/705 ms: no measurable
  difference (the ladder makes no calls on that path; 0a49dfd's parent was
  508-516 ms against 523-562 ms at 0a49dfd).
  GREEN: `rm -rf output && npm run verify` exit 0, 472 tests (468 + 4),
  zero failures/skips, twelve regression proofs, snapshots unchanged;
  the ladder took 1,393 ms inside it under external load (BACKLOG T003),
  `twenty thousand parameters` 286 ms (log .build/fn001-task4-fix-verify.log).

### FN001 Task 5: instantiation rule and specialization (2026-10-08)

Branch fn001. Reach: Parse → Resolve → Check → Specialize (`specialize`,
`specializeWith` and `specializationKeys` called directly); the CLI stops
every function program at the temporary guard after Specialize.

- What changed: Check.Instantiation's `foldCalls` makes a bare
  `FunctionRef` an edge with its instantiation and enters lambda bodies,
  so references at any depth (match arms, lambdas, `Apply`, `Pipe`) are
  judged and form components (design §6); Components needed no change.
  Domain.IR.Internal gains `TFun Ty Ty` with hand-written Eq/Ord (one
  spine loop, the derived order), `spine` (two loops), and `FunctionRef`,
  `CtorRef`, `Apply`, `Lambda (Array Param)`, `Pipe`. The new
  Features.Specialize.Intern hash-conses arrows: a key part is
  `KInt | KBool | KData n | KFun n`, an arrow is numbered by its
  (parameter, result) numbers, and Lower interns a spine's suffixes from
  its final result outwards while lowering it (parameters by a balanced
  `traverse`, the interning by `Array.foldr`), so every suffix is numbered
  once and no key is found by walking or spelling a type. Lower returns a
  `Lowered = { ty, key }`; Keys' `Key` is `Tuple Int (Array Interned)`,
  `Work.arguments` are `Lowered`, the state holds the arrow table; arrow
  fields are lowered beside their written spine (as Check.Nested pairs
  them). Body copies the new nodes through the new Specialize.Values
  (`callee` for calls and bare references, `ownerCtor`: a partial
  construction or constructor value names its owner's copy, the final
  result of its arrow, `lambda`). `specializationKeys` rebuilds arrow
  arguments by a loop. The new Features.Specialize.Unlowered `reject` is
  called by Program.Compile after `specialize`. Format.Go: `goType`
  spells `TFun` inline as `func(A) func(B) R` along the spine; the field
  comparison of an arrow field emits `malformed`; Usage walks the new
  nodes; Expression lowers them to `func() T { panic("bumpus: unlowered
  function") }()`. All unreachable behind the guard; Task 6 replaces them.
- Decisions not dictated by the plan: (1) The guard rejects any program
  whose monomorphic IR holds an arrow type or a new node (a constructor
  with an arrow field, at the constructor; a signature holding an arrow,
  at the declaration; an arrow-typed expression such as a partial call,
  at it); before, a constructor's arrow field was rejected at the field's
  type. An arrow that is only a phantom type argument (`Proxy(Int ->
  Int)`) is neither, and a generic function never instantiated is not
  emitted, so such programs reach Go (worded so by the review, M1). (2)
  Constructors, called or bare, are no edges: they have no body, so they
  are in no component with a function. (3) A bare reference keeps the
  existing text `Recursive call to f changes its type arguments` (no new
  text is listed). (4) IR's `TFun` carries no number: plan and design say
  `TFun Ty Ty`. Task 6's named Go types (design §13 rule 8) must reach the
  numbers through Features.Specialize.Intern or carry them into the IR;
  left to Task 6. (Superseded by the review fixes below: the numbers are
  in the IR.) (5) The generator's edge kinds come from a seeded stream
  of their own, so P001's components are unchanged. (6) Representative
  independence is checked on the IR as a bisimulation: from both entries,
  the bodies agree node for node ignoring types and spans, constructors by
  name, and each pair of referenced functions is compared once.
- Changed rows: test/fn-check.test.mjs `checked function programs reach
  Specialize as Internal` becomes `... stop at the unlowered guard`; its
  four rows keep code (E_INTERNAL), span (each node's own) and text
  (`unlowered function`), now reported by the guard; three rows added
  (partial call at `add(1)`, arrow field at `T(Int -> Int)`, arrow
  parameter at the declaration). The `spec-key` regression row's needle
  is now `key = Tuple declaration (map keyOf arguments)` and its mutant
  collapses a data argument to `dataType 0`; still one target, still
  fails. No other existing assertion changed.
- Tests seen failing first (logs .build/fn001-task5-red-*.log):
  test/poly-termination.test.mjs, 5 of the new rows failed (lambda in a
  match arm, bare `walk`, bare `step` joining a component, bare `walk`
  inside a lambda, and `wrapping an intra-component argument` over the
  generator's value and lambda edges); the arrow type row and the two
  accepted rows passed on arrival (the arrow row since Task 3's Nested),
  kept as characterization. test/fn-specialize.test.mjs (map(id) twice,
  constructor values' owners, the 5,000-parameter keys) 3 of 3 failed;
  test/fn-representative.test.mjs failed; poly-properties' §4.2 bound
  failed (each `unlowered function` from Specialize); the guard row failed
  on the arrow-field span.
- Mutants (scratchpad copies, not committed): keys of whole IR types,
  compared by the spine loop: the 5,000-parameter test took 5.5 s against
  0.23 s; keys spelled as strings: 12.6 s (bound 2 s); arrows interned
  without their parameter: `fn id[…]` keys merged, the distinctness row
  fails; no `FunctionRef` edge: 3 rejected rows and the wrapped generator
  test fail; no lambda edge: 2 rows and the wrapped test fail; owner taken
  as the arrow itself: the owner row fails; no guard: the CLI row fails;
  a lambda parameter dropping its local when lowered at Bool: the IR
  independence property fails, but only after its third wrapper (a
  lambda never applied, so its unused parameters are bare holes) was
  added: the first version, whose parameters were `List(_)`, let it
  survive. The §4.2 bound itself passes on both rule mutants: accepted
  generated components use bare variables or ground types only, so it
  cannot distinguish them; the wrapped-variant test does.
- Linear cost: no large-source bound changed; `twenty thousand
  parameters` 310 ms and `three thousand distinct instantiations` 747 ms
  inside verify. Specializing the 5,000-parameter program takes 0.23 s
  alone.
- Observed: inside the green verify the match ladder took 1,441 ms against
  its 1.5 s bound (BACKLOG T003, evidence added).
- GREEN: `rm -rf output && npm run verify` exit 0, 483 tests (472 + 11),
  zero failures/skips, twelve regression proofs; bootstrap snapshots
  unchanged. Log .build/fn001-task5-verify.log.

## FN001 decisions (2026-10-08)

The user approved (a) fixing BACKLOG T003 (match-ladder timing margin:
1,480, 1,393 and 1,441 ms against 1,500 inside the last three verifies)
on fn001 after the Task 5 review and before Task 6, by reducing the
workload, not raising the bound; (b) durability additions: Task 8 Step
1b commits the Task 4 review's linear-cost table as bounded tests
(test/fn-linear.test.mjs), Task 8 Step 4 uses a committed
scripts/fn-milestone.mjs for the 20,000 tier, and Task 9 Step 1b
promotes four scratchpad mutants to regression rows (block-order,
value-edge, functional-fixpoint, arrow-key; 22 proofs); (c) the design
§9 documentation of over-application diagnostic changes (Task 4 review).
- Review fixes (follow-up commit; the review approved 5874482). I1: arrows
  are numbers in the IR. `IR.Ty` is `TInt | TBool | TData TypeId | TFun
  FunTypeId` with derived constant-time Eq/Ord (the hand-written spine
  instances are gone), and `IR.Program` carries `funTypes ∷ Array {
  parameter, result }` in interned-number order, from Intern's table
  (`numbers` for lookup, `entries` by number). The review measured about
  40,050,000 arrow nodes in the expression types of the 5,000-parameter
  test's IR, which any pass re-walking them in Format would visit. With
  numbered types the `Lowered` pair is gone (a lowered type is its own key
  part), so Keys' `Key` is again `Tuple Int (Array IR.Ty)` and the
  `spec-key` row is back to its P001 needle and mutant (one target; the
  proof passes). `IR.spine` reads the table by two loops;
  `specializationKeys` rebuilds arrows through it (tests only). A
  construction's or constructor value's owner is now the owner type at
  its instantiation (`applied`), not the end of its type's spine. Format.Go
  already emits the named types: `type bumpusFun<N> func(P) R` per entry,
  after the data types, and `goType (TFun n)` is `bumpusFun<N>` (no
  re-walking); a program without arrows emits none, so snapshots are
  unchanged. Design §7 and plan Task 5 Interfaces and Task 6 (number
  order, not first-use order) are amended as Task 5 review
  clarifications. M1: plan Global Constraints and decision (1) above say
  the guard judges the monomorphic IR; `a phantom arrow argument compiles
  and runs` pins `Proxy(Int -> Int)` printing 0 and its unused
  `bumpusFun0` declaration (written after the code; not run against
  5874482, where the guard already let it through by reading). M2:
  plan Task 6 Step 3 replaces the two temporary catch-all arms. M3:
  docs/architecture.md names Intern, Values, Unlowered and the numbered
  `TFun`; the full FN001 update stays Task 9's. M4: test/phases.mjs (and
  support.mjs, poly-keys.mjs and the two new test files) build failure
  messages only on failure; `checkedPoly succeeds on a 20,000-parameter
  function value` failed first with a RangeError from `JSON.stringify`
  (.build/fn001-task5-fix-red.log; a plain 20,000-parameter program did
  not reproduce it, since only a value reference puts the long arrow in
  the checked IR). Design §9 notes that the `Recursive call` text covers
  value references. New test `arrow types in the IR are interned table
  entries` (different ids for the two 5,000-parameter types, equal ids
  for equal types, each spine read through the table, at most 2 × 5,000
  entries); a parameter-blind interning mutant (scratchpad) fails it and
  the distinctness row. Timing of the 5,000-parameter specialization
  (`specializationKeys`, alone): 0.23 s before, 0.26 s after (three runs
  each). test/specialize.test.mjs now checks that a monomorphic program's
  `funTypes` is empty before comparing the rest; the first verify of
  these fixes failed it on the new field, and the match ladder at
  1,732 ms (BACKLOG T003). GREEN on the next run: `rm -rf output && npm
  run verify` exit 0, 486 tests (483 + 3), zero failures/skips, twelve
  regression proofs, snapshots unchanged; the ladder 1,497 ms, 3 ms
  under its bound (T003); `twenty thousand parameters` 241 ms (logs
  .build/fn001-task5-fix-verify.log, .build/fn001-task5-fix-verify2.log).

### T003: match-ladder compile cost (2026-10-08)

Goal (approved by the user before FN001 Task 6): make the 127-deep,
50-arm ladder in test/match-lift.test.mjs substantially cheaper so its
1.5 s bound has headroom inside verify's parallel run; the bound, the
workload and the test's place in verify are unchanged. Acceptance was a
2× drop in the isolated median, or, if that needs a design change, the
profile and the options.

Profile (c120d48, built in an isolated copy). The measurement is
committed as scripts/ladder-profile.mjs (`node scripts/ladder-profile.mjs
--rounds 7 --baseline DIR`: cold compiles in fresh processes alternating
with a built baseline tree, steady per-phase medians, load average); the
CPU and allocation profiles below used `node --cpu-prof` and V8
allocation sampling on the same source. Steady state per phase (median of 15,
in-process): parse
137 ms (lex 55), resolve 22, check 134 (infer 61, coverage 36,
firstTooDeep 9, holes 8, instantiation rule 9, retype 7, comparable 5),
specialize 24, Go emission 46. One cold compile (fresh process, the
test file's small program first, as in the test) was ~500 ms: about
1.4× the steady sum, from JIT warm-up and GC. The compile allocates about
2.8 GB for the 150 KB source (`--trace-gc`: 149 scavenges, ~110 ms of
GC). Hot spots: Format.Lex (per-character `tailRecM` steps over a copied
character array, `Array.elem`, a fresh slice per two-character-token
probe); `isName`/`decimalToken` copying each token into a character
array; Format.Go.Capture's `union` (concat, sort, then `Array.nubBy`,
which sorts again) at 26% of emission; coverage's per-arm redundancy
query re-simplifying every earlier arm and `uncons`-copying every row a
specialization drops (quadratic in arms by design, so the constant
matters); `tooDeep`/`walk` entering their loops for Int, Bool and rigid
types; `retype`/`holes` rebuilding a body that has no bound meta or
hole. Everything else is a flat spread of combinator, Either and record
overhead (no single function above 4% after these fixes).

Changes (each keeps its semantics; no public formula is new):
- Lex reads the source in place by code unit (`String.charAt`/`slice`),
  skips a whitespace run in one step, tries two-character tokens only
  after their first characters, and tests punctuation and reserved
  words with `case` instead of `Array.elem`; `isName` and Literal's
  `decimalToken` count in place.
- Parse.Cursor's State carries `upcoming`, the next token's text, set
  once per token consumed, so `peekText` is a field read.
- Coverage simplifies each arm once per match; `useful` takes simplified
  rows; Matrix's `specialize`/`defaults` judge a row by `Array.head`
  before copying its rest.
- `tooDeep` answers Int, Bool and rigid variables without converting;
  Unify's `walk` enters its loop only for a meta.
- Check skips `retype (resolved subst)` when the substitution is empty,
  and `holes` keeps a body with no hole.
- Capture's `union`/`armFree` keep the first of each id in one fold over
  the sorted array instead of `Array.nubBy`.
Tried and reverted: a loop in place of `Array.find` in Grammar's
dispatch (no measurable gain, and Grammar would pass 250 lines); a
`tailRecM` `threadAll` in place of the Thread applicative (no measurable
gain; needed a new Foldable instance).

After (steady, median of 15, load average 9-11, alternating with the
baseline): parse 124 → 92, resolve 19 → 19, check 125 → 78 (infer
53 → 35, coverage 31 → 26), specialize 21 → 21, emission 43 → 27;
sum 332 → 237. Allocation (V8 `total_allocated_bytes`, per phase
summed) 3.3 → 2.4 GB. Isolated cold compile, nine alternating rounds
at load average 5.7 (18:29): baseline 543 504 507 517 502 495 514 512
495, median 507 ms; T003 379 368 363 385 379 376 370 362 366, median
370 ms: 1.37×, short of the 2× target. Cold phases: parse 176 → 125,
check 193 → 131, emission 61 → 42.

Verify (three consecutive `npm run verify`, every run reported): all
exit 0, 486 tests, zero failures, twelve regression proofs, snapshots
byte-identical. Ladder: 942 ms (load 8.9 after), 968 ms (14.7), 852 ms
(12.0); logs .build/t003-verify{1,2,3}.log. Before T003 the same test
took 1,345-1,732 ms inside verify. Two direct `node --test` runs during
the work, while other projects' builds pushed the load average to
16-30, failed it at 1,659 ms and 2,573 ms (.build/t003-tests1.log,
.build/t003-tests2.log); the second also failed coverage-scale's
5,000-field pattern (5.1 s) and fn-specialize's 5,000-parameter keys
(2.7 s). Both pass alone (0.80 s and 3.2 s wall under load 27; baseline
0.70 s and 2.7 s in the same minute) and neither path's timing changed
in kind; these are T003's external-load symptom in other timing tests.

Why not 2×: what remains is spread over the combinator parser (each
argument passes about a dozen Either-threaded combinator layers),
monadic threading in Infer, Resolve and Specialize, coverage's quadratic
redundancy query, and GC. Options that would reach 2×, each a design
change: (1) a direct token-level parser for expressions in place of the
layered combinators (parse is now 35% of the cold compile); (2)
redundancy for literal-only columns without one usefulness query per
earlier arm; (3) fusing the checker's remaining whole-body passes
(firstTooDeep, comparable, coverage roots, instantiation's two call
folds) into one; (4) an allocation-light State/Parsed representation.
BACKLOG T003 stays Open with these.

Re-run with the committed script (18:37, load average 7.03 before, 6.40
after; 7 alternating rounds against the c120d48 copy): cold baseline
513 539 504 494 520 500 501, median 504 ms; current 396 373 392 382 373
368 368, median 373 ms. Steady medians baseline → current: lex 61 → 31,
parse 136 → 96, resolve 21 → 21, check 136 → 86, specialize 22 → 21,
emit 46 → 26 ms. `npm run verify` with the script committed: exit 0,
486 tests, twelve regression proofs, ladder 748 ms (load average 6.05
before, 19.82 after; .build/t003-script-verify.log).

Review follow-up (2026-10-08): the independent review approved 7c6c0f5
(50,453 differential cases, 0 differences). Minors fixed: Usefulness's
comment (once per arm, against all earlier arms); Lex `spaceEnd` reads
each character once (`spaceStep`); Check's `settle` uses a new
`Unify.isEmpty` (test `isEmpty holds exactly until a meta is bound`)
instead of `Subst(..)`; Coverage's import order. The reviewer's harness
is now scripts/differential.mjs (+ differential-corpus.mjs,
differential-hook.mjs; docs/engineering.md). Against the c120d48 copy,
seed 7, count 1000, harvest regenerated (3,419 parses → 2,355 distinct
sources; load average 11.6 at 18:49): harvested 2,355, fuzz 1,029 plus
1,085 isName probes, matches 1,000, mutations 1,000, 0 differences
(.build/t003-differential.log). Against a copy whose lexer no longer
treats tab as whitespace: 148 of 329 fuzz sources differ at lex, exit 1
(.build/t003-differential-broken.log). `npm run verify`: exit 0, 487
tests, twelve regression proofs, ladder 811 ms (load average 6.95
before, 12.03 after; .build/t003-review-verify.log).


## T003 decision (2026-10-08)

The user chose to accept the 1.37× isolated gain (7c6c0f5; script
scripts/ladder-profile.mjs, 6d0906c) and continue to FN001 Task 6. T003
stays Open with its five recorded design options; ladder in verify now
748-968 ms against 1,500. Task 6 starts after the T003 review.

### FN001 Task 6: Go lowering (2026-10-08)

Branch fn001. Reach: the whole CLI; programs with function types,
lambdas, function values, partial and over-application and pipes now
compile, build and run. Design §13 rules 1-8 as adopted.

- What changed: the guard Features.Specialize.Unlowered and its call in
  Program.Compile are deleted. Format.Go.Lowered's `Scope` carries the
  program's `Shape` (signatures and constructors as `Wrapper`s, the
  `funTypes` table, and a (parameter, result) → number map); `Lowered`
  gains `wrappers`, the staged wrappers its values need. New modules:
  Format.Go.Value (a saturated call or construction is today's n-ary call,
  rule 1; a partial one is `{f}Value(a1)…(aj)`; a bare reference of arity
  1 is the Go function, of arity n ≥ 2 `{f}Value`; any other application
  and over-application apply the value), .Apply (rule 6: inline up to 64
  arguments, else `bumpusFn{f}Apply{k}` helpers of at most 64 stages
  taking the value so far and their arguments' free locals, each argument
  evaluated in place), .Lambda (rule 5: `bumpusFn{f}Lambda{k}` of its free
  locals, ascending, then its parameters, `_` for a discard; the value is
  the wrapper applied to the free locals through .Apply, or the function
  itself with no free local and one parameter), .Pipe (rule 7), .Stage
  (rules 2-3: one `bumpusNode{N}` per distinct argument type of all
  wrappers, `{f}Value`, `{f}Stage{k}`) and .Entry (rule 4: package-level
  `{f}Kinds`/`{f}Slots`, one array per distinct type, one loop, one n-ary
  call). Capture gains `lambdaFree` (a lambda's named parameters are bound
  in its body; a set, so a wide lambda is not quadratic) and `without`.
  Expression dispatches every node by an explicit arm (the temporary
  wildcard is gone); Compare's `TFun` arm and a new explicit Show `TFun`
  arm emit `malformed` for a function field (never compared or printed,
  design §3, but every declared type gets both helpers). Emit order: node
  types after the function types, wrappers after the functions. A program
  with no function value emits no node, stage, entry or table: the four
  bootstrap snapshots are byte-identical (compiler, shapes, tree and
  lists tests). Usage and Layout needed no change.
- Decisions not dictated (recorded in design §13 "Task 6
  clarifications"): (1) a stage value with no interned arrow (inside the
  prefix of a partial application, or of a lambda's free locals) gets
  the wrapper's own `{f}Arrow{k}` type; every other stage uses the
  interned `bumpusFun{N}`, found by number, so uses and the wrapper agree.
  (2) The pipe's temporary is the parameter `bumpusPipe` of a lifted
  `bumpusFn{f}Pipe{k}` (free locals, then the operand), not an
  immediately invoked closure, so pipe chains nest no closure; a literal
  or local left operand is spliced in as the last argument. In both
  cases a right side `g(b1…bk)` with k < n becomes `g(b1…bk, v)`, so
  `xs |> take(3)` is a direct call. (3) Matches, lambdas, pipes and
  helpers share one pre-order counter per function. (4) Entries' tables
  are `int32`, not `uint16` (no 65,536-type ceiling). (5) Helper bodies
  are one chained expression, not one statement per stage as in Task 1's
  prototype. (6) Wrappers are emitted once each by name, in first-request
  order; node types are numbered in first-appearance order. (7)
  test/fn-lambdas.mjs now holds Task 5's lambda wrappers, shared by
  test/fn-representative.test.mjs and test/fn-run.test.mjs (moved, not
  changed).
- Deleted rows (the guard's test, test/fn-check.test.mjs `checked
  function programs stop at the unlowered guard`), each E_INTERNAL
  `unlowered function` at the span shown, now compiling and printing:
  `(fn(x) => x)(1)` (1), `1 |> add(2)` (3), `id(add)(1, 2)` (3),
  `add(1)(2)` (3), `match add(1) { _ => 0 }` at `add(1)` (0), `type T =
  T(Int -> Int); fn main(): Int = 0;` at `T(Int -> Int)` (0), `fn f(g:
  Int -> Int): Int = 0; fn main(): Int = 0;` at the declaration (0).
  test/specialize.test.mjs's monomorphic-identity set excludes the new
  polymorphic examples/functions.bumpus, as it excludes lists.bumpus (its
  first verify run failed on the new example's arrow table,
  .build/fn001-task6-verify1.log). No other existing assertion changed.
- Tests seen failing first, all at the guard (E_INTERNAL `unlowered
  function`): test/fn-timing.test.mjs, 6 of 6
  (.build/fn001-task6-red-timing.log): named value `use(stuck)`, lambda
  `use(fn(x) => stuck(x))`, partial strictness `ignore(k3(probe(1)))`,
  pipe order `probe1(1) |> g(probe2(2))`, helper order (a 65-argument
  application of `w`, whose body is entered at its second stage, before a
  third argument's probe) and sharing (`twice(k3(probe(10)))` prints `30`
  with probe entered once in the trace); test/fn-run.test.mjs, 22 of 22
  (.build/fn001-task6-red-run.log); test/fn-scale.test.mjs, 1 of 1
  (.build/fn001-task6-red-scale.log). After implementing, two structural
  rows in fn-run failed because the test assumed declaration-order ids
  (a generic `length` is numbered after the monomorphic functions); the
  ids in the tests were corrected, not the assertions.
- Mutation checks (isolated copies under the scratchpad, one mutant each,
  rebuilt, test/fn-timing.test.mjs run): eta-expanded value of a
  one-parameter function returning a function (`func(x) … { return
  func(y) … { return F(x)(y) } }`): `named value` fails (exit 0); a
  hoisting application helper (each block's arguments bound before its
  stages): `helper order` fails (probe2 entered first); lazy partial
  arguments (a partial call as nested closures around the saturated call):
  `partial strictness` fails (exit 0) and `sharing` fails (trace
  `[3 2 0 1 0 1]`, probe twice); a rewritten pipe (left operand spliced in
  place, no temporary): `pipe order` fails (probe2 first). Every other
  probe passed under each mutant.
- Scale (test/fn-scale.test.mjs, through the CLI): 5,000 parameters of
  Int, Bool and List(Int), each read twice in a strided order (Bool
  through a helper call, as Task 1's body), called directly and applied
  as a value through 79 helpers; Go's cache is defeated for the
  program's own package by a comment nonce. Alone: emit 1.3 s, `go build`
  4.0 s against the 10 s bound (2.8 s for the same program with the
  direct call only); the test logs its build time. A first body with
  `if` terms (3,333 immediately invoked closures) built in 5.8 s (4.5 s
  direct only); replaced before any verify.
- Depth (ADR 006 "Functions emitted"): the five FN001 forms joined
  `forms` and test/depth.test.mjs. Re-measured in an isolated copy with
  the limit lifted, every form, and the old forms also on an isolated
  build of 97740c6: FN001 forms 1,507 / 812 / 607 / 607 / 343; old forms
  unchanged by the lowering (within 5); minimum 276
  (constructor-argument; 274 at 97740c6), limit 128 unchanged, no
  anomalies. The drops since ADR 006's G001 table (e.g. plus-chain
  2,928 → 1,564, constructor-argument 304 → 274) predate Task 6.
- Differential (scripts/differential.mjs, a scratchpad variant that skips
  sources the baseline stops at its guard; baseline an isolated build of
  97740c6; harvest regenerated, its test run exited 0): seed 1, count
  1,000: 5,094 sources compared and 1,085 isName probes, 0 differences,
  309 function programs skipped (304 harvested, 5 mutations); seed 6,
  count 10,000: 32,054 compared and 10,085 probes, 0 differences, 349
  skipped (.build/fn001-task6-differential{,-10k}.log).
- GREEN: `rm -rf output && npm run verify` exit 0, 526 tests (487 at 97740c6,
  minus the guard test with its 7 rows, plus 6 timing probes, 22 run
  tests, 1 scale, 1 snapshot and 10 CLI depth tests), zero failures or skips,
  twelve
  regression proofs, the four bootstrap snapshots unchanged; the match
  ladder 542 ms; `twenty thousand parameters` 220 ms; the 5,000-parameter
  `go build` 6,799 ms against its 10 s bound (4.0 s alone; BACKLOG T003
  records the margin); load average 1.79 before, 6.71 after
  (.build/fn001-task6-verify3.log; earlier green run
  .build/fn001-task6-verify2.log). Usage and Layout unchanged.
- Review follow-up (2026-10-08; the independent review found the
  lowering sound and accepted the deviations). Depth: the reviewer
  bisected the margin loss (ADR 006 "Functions emitted" now attributes
  it: FN001 Task 3's postfix and pipe layers, the Task 4 review's
  `bare <$> named inner` map layer, P001 for plus-chain). Fix: `named`
  builds its `Primary` itself (Format.Parse.Expression; productions stay
  applicative). Isolated copies, limit lifted, two alternating rounds:
  constructor-argument 275 → 283, call-argument 315 → 326, parens 522 →
  522; minimum 283. Differential, d2cf616 plus only the parser change
  against d2cf616 (seed 6, count 10,000): 32,403 sources and 10,085
  probes, 0 differences (.build/fn001-task6-fix-differential-parser.log).
  BACKLOG G002 tracks recovering Task 3's ~24 levels. Minors: Stage no
  longer declares `{f}Arrow1`, which no stage names (only a helper's
  signature can; it now spells `func(A1) <next>`); bootstrap/functions.go
  loses its one unused `bumpusFn6Lambda0Arrow1` line. The full
  differential against d2cf616 shows that change alone: harvested 235 of
  2,374 sources differ, all at emit, and a scratch check finds every
  candidate emission equal to the baseline's with the `Arrow1`
  declarations removed and their uses spelled out (1,287 compiled, 0
  unexplained); fuzz and matches 0 differences; mutations 4 (seed 1) and
  32 (seed 6), the shown ones all at emit (.build/fn001-task6-fix-
  differential{,-10k}.log). The `--regenerate` harvest's own test run
  exited 1; differential.mjs discards its output, so the failing test is
  unknown (it ran the full suite in parallel under the hook). Apply's
  blocks push their lifted functions, frees and wrappers onto a stack and
  concatenate once (was O(blocks × lifted)). test/fn-specialize's stale
  guard comment and support.mjs's `goTest =(` spacing are fixed.
- Scale, from the review (pending user decisions; nothing changed): the
  reviewer's verify failed fn-scale, `go build 10584 ms, bound 10000`, at
  load average 18.3 with only verify's own runner. The same mixed-body
  program builds in 1.8 s at 2,500 parameters, 4.4 s at 5,000 (direct
  call only 3.0 s), 17.9 s at 10,000 (direct only 11.2 s); at 20,000 the
  Go compiler was killed at 7.4 GB RSS, with the direct call only too.
  The cause is the n-ary body's 2n-term `bumpusAdd` tree in one Go
  expression (the existing lowering of `+`), not Task 6's staging.
  Recorded in BACKLOG T003.
- GREEN (review follow-up): `rm -rf output && npm run verify` exit 0,
  526 tests, zero failures or skips, twelve regression proofs; the
  5,000-parameter `go build` 7,467 ms against 10 s; the match ladder
  1,030 ms; load average 3.15 before, 5.34 after
  (.build/fn001-task6-fix-verify.log). Run once.

### Differential harvest failure, unidentified (2026-10-08)

During the Task 6 review fixes, `scripts/differential.mjs --regenerate`
ran the full test suite under its harvest hook and that run exited 1;
the tool discarded the run's output, so the failing test is unknown
(likeliest a load-sensitive timing test, BACKLOG T003, unconfirmed). The
tool now writes the run's output to `<harvest>.jsonl.log` and prints the
failing test names. One rerun afterwards (load 3.3 before, 9.1 after)
exited 0: 2,374 harvested sources, 0 differences against itself.

### FN001 Task 8: scale (2026-10-09)

User decisions (2026-10-09): (A) the 5,000-parameter `go build` test
failed once at 10,584 ms against 10 s under verify's own parallel load
(4.0-4.4 s alone); bound and workload stay, and `go build`-timing scale
tests now run in a separate serial phase: scripts/verify.mjs runs
`test/*.serial.test.mjs` after the parallel `node --test` run with
`--test-concurrency=1`, still discovered by pattern (docs/engineering.md).
(B) At 20,000 parameters the mixed body's 2n-term `bumpusAdd` tree in one
Go expression kills the Go compiler (7.4 GB) even for direct calls only,
pre-existing lowering, not FN001 staging (BACKLOG G003, new). The
milestone therefore tests FN001's machinery at full width with bodies
that read six parameters (first and last three, mixed kinds).

- Files: test/fn-scale.test.mjs renamed test/fn-scale.serial.test.mjs
  (mixed-body program and its 10 s bound unchanged; now compiled in
  process with a phase bound) plus three programs; test/fn-scale-programs.mjs
  (generators shared with the milestone), test/go-timed.mjs (the
  process-group `go build` timer moved out of fn-scale),
  test/fn-linear-forms.mjs, test/fn-linear.test.mjs (20,000, parallel),
  test/fn-linear.serial.test.mjs (80,000, serial, about 11.5 s),
  scripts/fn-milestone.mjs, scripts/verify.mjs.
- Step 1 (serial; phases measured, bound 3x; `go build` bound 10 s):
  5,000-parameter mixed body, direct and value, phases 1,240-1,260 ms,
  build 4.0-4.3 s; `f(1)(2)…(1000)` 74-85 ms, 0.40-0.45 s; a written
  `Int -> … -> Int` of 1,000 parameters 65-77 ms, 0.41-0.44 s; a
  5,000-parameter function type through `id` and `Box(a)`, whole and as
  a half partial, 529-581 ms, 2.4-2.5 s. The shared partial (completed
  twice) is in the milestone's `wide` program; the 5,000-parameter
  mixed-body test keeps its workload, so its partial is covered at
  5,000 by the generic program's partial instead. The existing
  20,000-parameter and 4,000-`Nil` tests are unchanged.
- Step 1b (Parse → Resolve → Check → Specialize, 20,000 parameters, ms
  measured / bound): value 400/1,200, over-application 540/1,620, wide
  lambda 515/1,545, mismatch `f(1)` (E_TYPE) 175/525, `f(1)` 310/930,
  `f(1…n-1)` 225/675, `(f)(1…n)` 370/1,110, pipe 250/750. At 80,000 all
  eight finish with the expected outcome, about four times as long.
- Step 2 (scratchpad copies, non-strict build, test/fn-linear*.test.mjs):
  recursive spine walk (`spineThrough` as recursion with `Array.cons`):
  6 of 8 forms at 20,000 fail with RangeError (stack); spelling-based
  arrow keys (Specialize.Intern keyed by the expanded spelling of each
  suffix): 5 of 8 fail with RangeError; derived `Eq`/`Ord` on Domain.Type
  `Ty` restored: survives all Task 8 tests (fn-linear at 20,000 and
  80,000, fn-scale.serial, large-source, fn-specialize, fn-check), so
  no Task 8 form compares long source arrows with `Eq`/`Ord` (the
  specializer compares interned IR numbers). Not pursued further (user
  limited Step 2 to three mutants); open for Task 9's review. Nested
  closures were not rerun.
- Step 4 milestone, run once (`node scripts/fn-milestone.mjs`, 20,000
  parameters, CLI emit then `go build` with a 100 s timeout; load 3.1
  before, 5.4 after; .build/fn001-task8-milestone.log), all ok: wide
  (direct, value, shared partial) emit 2.4 s, build 13.7 s; chain 0.7,
  7.6; curried 0.8, 7.5; generic 2.0, 12.1; value 0.7, 6.8; over 0.8,
  7.0; lambda 0.8, 6.6; `f(1)` 0.7, 6.1; `f(1…n-1)` 0.5, 7.0;
  `(f)(1…n)` 0.7, 6.8; pipe 0.4, 0.3 (the pipe is a direct call: no
  staged wrapper is emitted).
- Step 3: `rm -rf output && npm run verify` exit 0 in 1:53 (load average
  3.69 before, 4.97 after; .build/fn001-task8-verify.log): parallel phase
  533 tests, serial phase 12, zero failures or skips; serial
  5,000-parameter build 4,733 ms; match ladder 735 ms; `twenty thousand
  parameters` 221 ms.

### FN001 Task 7: reference interpreter (2026-10-09)

- test/poly-oracle.mjs, independently of the compiler: function values
  (named functions and constructors with their declared arity, lambda
  closures, `_` parameters), staged application one argument at a time
  (a body runs exactly when its stage boundary completes), strict
  partial application, over-application, `|>` with the left operand
  first, then the callee and its explicit arguments, and an `enters`
  trace (declaration positions) with optional probes that stop the run
  on entry. test/poly-parse.mjs now records constructor field counts.
- Step 1 (seen failing against the previous interpreter): six
  test/fn-timing.test.mjs cases compare the interpreter's first entered
  probe with the Go run's (all five Task 6 probes) and the shared
  partial's printed value and entry trace (`30 [3 0 2 1 1]`); the
  generated property failed.
- test/fn-programs.mjs generates 30 programs (seeds 0x7a11 + index) over
  Int, Bool, List(Int), Pair(Int, Bool), Int -> Int and Int -> Int -> Int
  with a higher-order prelude (map, fold, compose, flip, adder):
  lambdas (with `_`, capturing match binders), partial and
  over-application of functions, constructors and lambdas, constructor
  values (`flip(Cons)`, `Pair(n)(b)`, `compose(adder, f)`) and pipes.
  test/fn-oracle.test.mjs runs them in one Go batch against the
  interpreter (failures print seed and source) and checks every form
  occurs. All 30 agree; no compiler bug found.
- Mutant (scratchpad copy, non-strict build): Format.Go.Pipe always
  splicing the left operand as the last argument (left operand
  evaluated last) fails `interpreter agrees: pipe order` (and Task 6's
  Go probe). The generated comparison does not see it: generated
  programs terminate and have no effects, so pipe order is not
  observable in their values; timing stays the probes' job.
- `rm -rf output && npm run verify` exit 0 (load average 3.01 before,
  5.77 after; .build/fn001-task7-verify.log): parallel phase 541 tests,
  serial phase 12, zero failures
  or skips.

### FN001 Task 9: regression proofs and documentation (2026-10-09)

- Ten regression rows (scripts/regression-fn.mjs, imported by
  scripts/regression.mjs; probes in test/regression-fn.mjs, imported by
  test/regression.mjs, whose `printed` now runs through a shared `ran`):
  `stage-value` (Format.Go.Expression: a bare arity-1 function whose type
  has two or more parameters lowered as a two-level eta adapter; probe
  `use(stuck)` must panic in `stuck`), `stage-lambda` (Format.Go.Lambda:
  the same adapter around a one-parameter lambda's lifted function),
  `partial-strict` (Format.Go.Value: a partial application wrapped in a
  closure awaiting its next argument, so its arguments run late),
  `pipe-order` (Format.Go.Pipe: every pipe spliced as the call),
  `lambda-capture` (Format.Go.Capture `lambdaFree` keeps parameters),
  `fun-compare` (Check.Comparable drops the function test),
  `block-order` (Format.Go.Apply: a helper binds its block's arguments to
  variables before applying), `value-edge` (Check.Instantiation: bare
  references and lambda bodies are no edges; mutant outcome `More than
  10000 specializations`), `functional-fixpoint` (Check.Functional
  returns its seeds), `arrow-key` (Specialize.Intern keys an arrow by
  `TInt` and its result). Timing probes use test/support.mjs
  `panicOnEntry`. Deviation: as built there is no uncurried value
  representation, so `stage-value`/`stage-lambda` restore the defect's
  effect (eta expansion to the type's arity) instead. The lowering
  mutants' Go builds, so those probes fail on behavior (`0` printed, or
  the wrong probe label); `lambda-capture` and `arrow-key` fail at Go
  build, inherent to those defects. `node scripts/regression.mjs
  name…` now proves only the named rows.
- Task 8 Step 2 gap (derived `Eq`/`Ord` on Domain.Type `Ty`): rebuilt in
  a scratchpad copy with both instances derived; test/type-order.test.mjs
  (Task 2) fails 2 of 5 (RangeError on 20,000-long spines), so verify
  already catches it; Task 8 had run five other files only. No pipeline
  phase compares long source arrows with `Eq`/`Ord`: the same mutant
  compiles a program unifying two 20,000-parameter written arrows with a
  20,000-parameter function (and `same(h, h)`) correctly. No new test
  added, since no pipeline test can observe that defect.
- Nested-closures mutant (Format.Go.Stage `wrapperCode` emitting the
  wrapper as nested Go closures, no nodes or entry) against
  test/fn-scale.serial.test.mjs, once (load 2.5 before, 2.9 after): the
  5,000-parameter value and the 5,000-parameter generic function type
  fail, `go build` killed at the 120 s timeout (bound 10 s); the
  1,000-partial chain (9,315 ms) and the 1,000-long arrow (6,325 ms)
  pass, against 542 and 575 ms healthy in the verify below.
- Docs: docs/adr/008-functions.md; docs/language.md (grammar, names,
  typing, evaluation, diagnostics, nesting; each claim names its test
  file; the Task 4 "pending" note removed); docs/architecture.md,
  docs/engineering.md (twenty-two rows), README (ADR 008), BACKLOG (FN001
  Done pending merge; FN002-FN005), docs/findings.md, docs/next-session.md.
- `rm -rf output && npm run verify` exit 0 in 150 s (load average 2.39
  before, 8.44 after; .build/fn001-task9-verify.log): parallel phase 541
  tests, serial phase 12, zero failures or skips; twenty-two `Regression
  proof (…)` lines; serial 5,000-parameter build 4,423 ms; match ladder
  640 ms.

## FN001 whole-branch review (2026-10-09)

Fresh reviewer, whole diff 2a61a2b..e2a6735: ready to merge, no Critical
or Important findings. Verify in an isolated copy: exit 0, 541 + 12
tests, 22 proofs. Six adversarial cross-task programs matched the
interpreter including entry order; 2,300 extra generator seeds matched;
~46,000 sources against a main build: 0 Go differences among sources
main accepts, none newly rejected, every non-syntax diagnostic change a
design §9 row. Minors fixed: language.md hint condition (M1), generator
label (M3), ADR 008 note on syntax diagnostics of invalid sources (M6),
BACKLOG T005 for the unidentified harvest failure (M5; renumbered at
the merge because main had added its own T004); deferred to
BACKLOG FN006: interpreter zero-argument calls (M2), splitting the
value-edge row (M4), fn-linear bounds in the parallel phase (M7).
Awaiting the user's merge decision.

## FX001 sequencing discussion recorded (2026-10-08)

At the user's request, language-direction records proposed `do` notation
as an expression elaborated into bind and lambdas, with an illustrative
block and its expansion. Result binding, discarded results, final
computation and the distinction between constructing and running deferred
effects are explained. Service/error inference is a goal; bind/pure
selection, binding rules and monadic versus algebraic effects stay open.
This is direction only, with no compiler change or implementation
authorization. Next-session and the FX001 backlog row point to the proposal.
Verification: `npm run verify` exited 0 with 318 tests, no failures or
skips, and all twelve regression proofs; evidence:
`.build/fx001-do-docs-verify.log`. The proposed notation is not implemented
or behaviorally verified by this suite.

## Effect-row notation and constraint scope recorded (2026-10-08)

The user asked to preserve the algebraic-effect/open-row discussion and
defer explicit effect-row constraint syntax to a future feature. The
language-direction document now records direct-style handler evaluation,
candidate `Log + ...effects` notation, inferred higher-order effect
relationships and proposed implicit universal row quantification. It
distinguishes record rows and R001's lacks constraints from effect rows.
Outer syntax, quantifier scope and handler semantics remain design work;
no compiler change or implementation authorization. BACKLOG and the
next-session handoff record the future constraint-syntax scope.
Verification: `npm run verify` exited 0 with 318 tests, no failures or
skips, and twelve regression proofs; evidence:
`.build/fx001-row-direction-verify.log`. This verifies the existing
compiler, not the proposed effects or notation.

## MileAhead error-row pattern captured (2026-10-08)

The user's error-widening question revealed that earlier direction only
mentioned extensible errors generically. Read-only inspection of MileAhead
(../trailmapper, as recorded in provenance) confirmed open error-family
rows, caller composition without conversion wrappers, context-only
wrapping, and closure at handling/test boundaries. Language-direction now
records this brief and independent Bumpus syntax candidates hiding Variant
and injection plumbing. FX001/R001 must resolve error-sum support against
the current general-variant deferral; no feature scope or code changed.
Provenance, BACKLOG and the next-session handoff track the design work.
Clarified after the user's follow-up: `errors` is an ordinary implicitly
universally quantified row-variable name, not reserved or existential;
only the spread punctuation is special syntax in the proposal.
Verification: `npm run verify` exited 0 with 318 tests, no failures or
skips, and twelve regression proofs; evidence:
`.build/fx001-error-rows-verify.log`. Proposed error sums remain unimplemented.

## Standard-library helper direction recorded (2026-10-08)

The user requested planning for common PureScript/Haskell FP helpers with
approachable Rust-informed names. Added STD001 and a dedicated direction
document covering optional/result eliminators, defaults, transformations,
functions, sequences, text, maps/sets and generic collection operations.
Candidate names distinguish getOrElse from full branch elimination and
make eager/lazy evaluation explicit. Delivery follows FN001 and stages
other APIs by their prerequisites; no compiler or helper implementation.
Acceptance requires an upstream coverage matrix, readable examples,
behavioral/law tests and explicit deferrals. Handoff and language-direction
link the brief; exact public names still need reviewed API designs.
Verification: `npm run verify` exited 0 with 318 tests, no failures or
skips, and twelve regression proofs; evidence:
`.build/std001-direction-verify.log`. Helpers are planned, not implemented.

## STD001 generic rigor clarified (2026-10-08)

The user clarified that approachable naming must preserve theoretical
rigor and HKT-based shared operations. STD001 now pins generic bimap over
any lawful Bifunctor, shared Functor/Applicative/Monad contracts, required
constructor kinds and partial type application, and coherent instance
evidence under the current rank-1/specialization constraints. Concrete
helpers are incremental delivery, not completion of the generic library.
Acceptance includes generic clients, user-defined product/sum instances,
algebraic law properties and cross-operation coherence; pure callback laws
remain distinct from FX001 effectful sequencing. BACKLOG and handoff track
the clarification. No language or library implementation changed.
Verification: `npm run verify` exited 0 with 318 tests, no failures or
skips, and twelve regression proofs; evidence:
`.build/std001-generic-rigor-verify.log`. Generic APIs and laws above are
future acceptance requirements, not implemented or proven by this run.

## Cross-language audit planned (2026-10-08)

The user asked for a structured audit of leading language specifications
and library/runtime designs. Existing STD001 only audited helper coverage;
there was no broader systematic plan. Added LA001 covering all twelve
named references, a versioned primary-source/section ledger, comparative
briefs, decision and interaction matrices, practical application scenarios,
independent review and durable scope decisions. Primary landing pages were
checked to assemble the roster; detailed reading/audit is not complete.
Relevant findings feed upcoming designs without expanding FN001 or revoking
existing advanced-feature deferrals. BACKLOG and handoff track the plan.
Verification: `npm run verify` exited 1 with 316 of 318 tests passing,
no skips, and two large-source timing failures (6.572 s and 5.633 s against
5 s bounds). Regression proofs were not reached. Evidence is
`.build/la001-plan-verify.log`; BACKLOG T004 records the cases, unconfirmed
cause and diagnostic next action. No checks or assertions were changed,
and no rerun concealed the failures. The audit itself remains planned.

## Developer tooling direction recorded (2026-10-08)

The user requested highlighting/IDE support, first-class doctests,
property-based testing, possible literate capabilities, and LLM
skills/discoverability. Added distinct IDE001, DOC001, PBT001, LIT001 and
AI001 entries with docs/plans/2026-10-08-tooling-direction.md. The brief
records outcomes, proposed acceptance and dependencies without selecting
syntax, tool protocols or implementations; literate capabilities remain
exploratory. LA001 now includes these concerns in its comparison axes and
application scenarios. Updated language direction and next-session handoff.
No language/compiler code changed and FN001's delivery is unchanged.
Verification: `npm run verify` exited 0 with 318 tests passing, no failures
or skips, and all twelve isolated regression proofs passing; evidence:
`.build/tooling-direction-verify.log`. This checks the existing compiler,
not the proposed tooling. T004's earlier timing failures remain recorded
and unresolved; this successful run does not establish their cause.

## Libraries, platform services and packages direction (2026-10-08)

The user requested distinguishing Bumpus libraries compiled to the host
target, FFI bindings and dependency-inverted services implemented through
host-language libraries, then added package management. Recorded PKG001
in the tooling brief and backlog; updated LA001, language direction and
handoff. Planning includes source packages/host-callable export assessment,
service contract/provider substitution, combined host/Bumpus dependency
resolution, manifests/locks, identity, compatibility and target/runtime
availability. Effect Platform's primary introduction was checked as a
conceptual precedent; its mechanisms are not adopted. No compiler code,
package manager, binary ABI or provider mechanism is implemented/selected,
and FN001 scope is unchanged.
Verification: `npm run verify` exited 0 with 318 tests passing, no failures
or skips, and twelve isolated regression proofs passing; evidence:
`.build/pkg001-direction-verify.log`. This validates existing behavior,
not the proposed package/interop features. T003/T004 remain open.

## FN001 merged (2026-10-09)

User approved merge and push. main had gained eight docs-only planning
commits (2190c8f..340953a: FX001 do notation, error rows, STD001, LA001,
tooling, PKG001); they were merged into fn001 (9527233). Conflicts: the
T003 row (fn001's extends main's; kept fn001's) and two different T004
items (main's large-source timing item kept as T004; fn001's unidentified
harvest failure renumbered T005); progress kept both sides. Clean `rm -rf
output && npm run verify` on the merged tree: exit 0, 541 + 12 tests,
twenty-two proofs (.build/fn001-merge-verify.log). main fast-forwarded to
fn001 and pushed to origin; worktree and branch removed.

## FX001 Task 1: runtime shape measurement (2026-10-09)

Branch fx001. No compiler change. Added scripts/effect-probe.mjs (driver:
explicit build 300 s / run 120 s timeouts, five repetitions, checksums
verified, load averages before and after each batch),
scripts/effect-runtime.mjs (Go prelude: `bumpusCtx` list, non-zero-sized
`bumpusMarker`, `bumpusAbort`, lifted `bumpusHandle` returning
`(result, abort)`, `bumpusCleanup`, defect report and `main` wrapper),
scripts/effect-semantics.mjs (Step 2 programs and independently written
expected output) and scripts/effect-programs.mjs (Step 3 loops and the
generated lifted-helper program). Semantic checks: all 7 modes pass (clause
reaches the outer handler; aborts cross unrelated and same-key inner
handles to their target; clause failures after the helper returns reach
the outer handle; nested blocks unwind LIFO; cleanup that handles a
failure internally lets the abort continue; two cleanup failures print the
three confirmed report lines in order, exit 1; normal-exit cleanup
failures; crash not caught by handle with cleanup run; guard line; 1,000
markers distinct). A first run of `abort` failed on my own expected output
(two nested blocks give `d2 d1 d2 d1`, I had written one pair); corrected
the expectation, not the program. Two mutants (handle catching every
abort; clause run in its own context) each fail their check (scratchpad,
not committed). A second full run reused Go's build cache (identical seed
per repetition; 0.2-0.4 s builds) and was discarded; the seed now varies
per run. Measurements (.build/fx001-task1/run3.log): median `go build` 0.83 s
/ 1.53 s / 2.91 s at 1,000 / 2,000 / 4,000 helpers (bound 10 s). Decision:
ADOPT the shapes. Details in findings "FX001 Task 1".

### FX001 Task 2: Unit, blocks and let (2026-10-09)

Branch fx001. No existing test assertion changes; the five bootstrap
snapshots are byte-identical (verify's snapshot tests).

- What changed: Format.Lex reserves `effect handler handle with let defer
  Unit ctl resume` at once (controller ruling; `pure` stays a name).
  Domain.Syntax gains `UnitRef`, `UnitValue`, `Block` and `Item` (`Let`,
  `Discard`); the new Format.Parse.Block parses `{}` (Unit), items
  separated by `;` (a trailing `;` makes the value `UnitValue` at the
  closing `}`, which marks the block trailing; `{ let x = 1 }` is E_SYNTAX
  `Expected ;` at `}`) and `()`; `{` joins the loosest expression dispatch,
  every item nested (128 nested blocks parse, 129 are E_NESTING). Domain.Type
  and the IR gain `TUnit` (Go `struct{}`, value `struct{}{}`); Resolved,
  Checked and IR gain `UnitValue`, `Block` and `Item`. Features.Resolve.Block
  threads the scope through the items (new Fresh `thread`, a balanced
  traverse); a `let` is in scope for later items only, shadowing as a match
  binder, its LocalId taken before its expression's binders. The resolver's
  scope and the checker's locals became maps (by name, by LocalId) so a
  20,000-let block costs no scan per lookup. Features.Check.Block: `let` is
  monomorphic, discards may have any type, the block's type is its value's.
  Check.Hint adds `TrailingSemicolon` (rendered `; remove the trailing ;?`)
  on a mismatch whose found expression is a trailing block. Unit is
  comparable (always equal; ordering lowered through an inline
  `func(struct{}, struct{}) int` so both operands still run) and prints
  `()`. Format.Go.Block lifts each block to `bumpusFn{f}Block{k}` (pre-order,
  counter shared with Match/Lambda/Pipe/Apply), captures in LocalId order
  (Capture `withoutAll`), each `let` a typed `var` plus `_ = x` (typed
  because an arity-one function value is a lifted Go func of unnamed type;
  the brief's `x :=` would leave it unnamed), `_ = e` for `let _` and
  discards, `return` the value. A Unit `main` emits `func main() {
  bumpusFn<n>() }` and prints nothing; `import "fmt"` is emitted only when
  main prints or a printer appends an Int/Bool field. The style gate's
  applicative-module list adds Format.Parse.Block. The interpreter
  (test/poly-parse.mjs, test/poly-oracle.mjs) reads and runs blocks, `let`,
  `()`, `{}` and `f()` calls.
- Tests seen failing first: test/fx-block.test.mjs, 86 tests, 85 failing
  and one passing before any code (`1 + { 2 }` was already `Expected an
  expression` at `{`, kept as a characterization row); log
  .build/fx001-task2-red.log. One test-construction slip fixed after GREEN
  (the `()` and `f()` rows pointed at the first occurrence, inside `main()`
  and `fn f()`). The 20,000-let timing test moved to
  test/fx-block.serial.test.mjs after the first verify: under the parallel
  run it took 999 ms against its 1,500 ms bound (load about 5).
- Isolated mutants (scratchpad copies, not committed), each failing its
  rows: block items emitted in reverse (3 order probes); hint ignoring the
  span (the `{ 1; () }` row); a let never entering scope (2 run rows); Unit
  ordering returning 1 (the two boxed `<=`/`>` rows); Unit main printing
  (both silent-entry rows).
- Scale: 20,000 lets compile to Go in 490-510 ms, 40,000 in 915 ms, 80,000
  in 1,739 ms (linear, no stack failure); bound 1,500 ms.
- Reach: Parse → Resolve → Check → Specialize → Go, built and run in one
  batch (two Unit-main programs via runGo, which the batch's Println shape
  check does not admit); the interpreter agrees on every run row and probe.
- GREEN: `rm -rf output && npm run verify` exit 0: 626 parallel tests and
  13 serial (was 541 + 12; +85 and +1), zero failures/skips, twenty-two
  regression proofs, load 3.6-6.1; the serial 20,000-let test 535 ms of
  1,500 (log .build/fx001-task2-verify2.log; the first run, before the
  serial split, .build/fx001-task2-verify.log, also exit 0).

### FX001 Task 3: effect rows and scoped-label unification (2026-10-09)

Branch fx001. Behavior-preserving: no syntax writes a row yet; every
existing `TFun` carries the closed empty row and every `TData` empty row
arguments. No existing assertion changes; the five bootstrap snapshots are
byte-identical (verify's snapshot tests).

- What changed: new Domain.Ids (`TypeId`, moved and re-exported by
  Domain.Type; `EffectId`) and Domain.Row (`Row t v`, `Label t`,
  `EffectRef`, `LabelKey`, `TypeHead`, `labelKey`, `closedRow`, `openRow`,
  `isPure`; parameterized over the argument type, so Domain.Type imports
  it; `Row` hides Prim's). Domain.Type: `TFun (Ty v) (TyRow v) (Ty v)`,
  `TData TypeId (Array (Ty v)) (Array (TyRow v))`, `THandler (Label (Ty
  v)) (TyRow v)`; the Monad/Bind instance is gone, replaced by sort-aware
  `substitute`/`substituteRow` over `Substitution v w = { types, rows }`
  (a row tail splices its image: labels appended, its tail the new tail);
  Functor is `substitute` with `TVar`/`openRow`. Spines are walked as
  arrow nodes (`stagesThrough`, `foldStages`: no record per arrow);
  `spine`, `arrows`, `ground`, `children`, `rowsOf`, `rowArguments` and
  `typeHead` moved to the new Domain.Type.Parts (250-line limit). The
  checker's substitution moved to Features.Check.Subst (`Subst { types,
  rows, fresh }`: fresh row metas count down from -1, apart from the
  checker's, which count up; `walkRow`, `resolveRow`), binding and the
  depth bound to Features.Check.Binding (`bindType`, `extendRow`,
  `bindTail`, `exceedsLimit` counting label arguments one level deeper),
  both re-exported by Features.Check.Unify, whose `TFun`, `TData` and
  `THandler` cases unify rows through the new Features.Check.UnifyRow
  (Leijen 2005 §7, a `tailRec` loop over labels, first occurrence by key,
  the side condition `tail(r1) ∉ dom(θ)` in both the rewrite and the
  left-over-entry cases; `unifyRowsTraced` also returns `RowEvent`s by
  `OccurrenceId`, Features.Check.Occurrence; Features.Check.RowSide holds
  the operand walk). `Failure` gains `RowMissing`, `RowExtra`,
  `RowSharedTail` and `RowMismatch` (tails alone differ: not in the brief,
  needed for closed against rigid); Require reports each as the existing
  whole-type E_TYPE mismatch. Specialize erases rows; `THandler` is an
  Internal error in Lower and Require and abstract to coverage until Tasks
  5 and 6. Scheme numbers row holes with type holes. Regression row
  `occurs` now mutates Features.Check.Binding.
- Tests seen failing first: test/unify-row.test.mjs and
  test/row-substitute.test.mjs (both failed to import
  output/Domain.Row; log .build/fx001-task3-red.log), then 14 tests pass:
  scoped commutation and order, first occurrence (mismatch never skips),
  Fail keys by payload identity (deferred keys match nothing until known),
  the side condition for `Clock + ...r`/`Log + ...r` and for a left-over
  entry, both in a child process with a 20 s timeout (the generated test
  then refuses to run if it failed), `RowMissing`/`RowExtra`/
  `RowMismatch`, 1,500 generated pairs (959 unify; 54 `RowSharedTail`)
  against the independent recursive oracle test/row-oracle.mjs (same
  acceptance, symmetric acceptance, scoped-label equality, acyclicity,
  equal normal forms up to renaming), 1,000-label rows, arrow rows in
  `unify` (occurs and depth through label arguments), traced events, and
  five substitution laws. Test support only changed elsewhere: value
  construction gains row arguments, two renderers (test/fn-shape.mjs,
  test/fn-checked.mjs) leave out pure rows, and imports follow the moved
  names.
- Isolated mutants (scratchpad copy, not committed): the rewrite-case side
  condition removed, and the left-over-entry one removed: each fails the
  timeout test at 20 s and the generated test at once; first occurrence
  replaced by last (`findLastIndex`): three tests fail.
- Found and fixed on the way: a strict `where` binding resolving both
  types on every `expectType` (the mismatch message) made the `occurs`
  regression mutant overflow instead of reporting, and cost about 2x in
  Require; it is a function now. A helper frame per applied level in
  `unify` overflowed test/unify-arrow at 1,000 levels; the fold is back in
  `unifyHeads`. `compare` on applications compares row arguments before
  type arguments so the recursive comparison stays last.
- Cost: fn-linear forms at 20,000 parameters through Specialize, alone,
  5 runs each, this build (before the final `compare` change) against an
  isolated build of e110526 (ms, medians): value 415/403, over 605/534, lambda
  542/539, mismatch
  181/161, partialFirst 423/396, partialAll 300/289, parenthesized
  397/400, pipe 289/309. Minimum `--stack-size` for test/poly-depth's
  1,000-deep check: 575 KB (was 559).
- Differential: a scratch variant of scripts/differential.mjs comparing
  resolve and check by acceptance only (their types now carry rows by
  design) against the e110526 build: 0 differences over 2,486 harvested,
  1,029 fuzz, 1,000 match and 1,000 mutation sources and 1,085 name
  probes. Its harvest run (the suite under the hook) failed four timing
  bounds (fn-linear partialFirst 1,022 ms, partialAll 702, pipe 970; the
  serial 20,000-let test, run there in parallel, 2,130 ms).
- Reach: unit and generated tests drive Domain.Type, Features.Check.Unify
  and UnifyRow directly; through the pipeline only pure rows exist, which
  every existing test exercises.
- GREEN: `rm -rf output && npm run verify` exit 0: 640 parallel tests
  and 13 serial (was 626 + 13; +14), zero failures/skips, twenty-two
  regression proofs, load 2.0-5.9 (log .build/fx001-task3-verify2.log; an
  earlier run, .build/fx001-task3-verify.log, failed only the `occurs`
  proof above).

## R003 Waxwing rename (2026-10-09, verification in progress)

User approved the Bumpus -> Waxwing / `.wxw` migration and subagent help.
Work uses the existing isolated FX001 tree at 3481468 (Tasks 1-3), with
main and its pre-existing editor setting untouched. Separate agents handled
current documentation and test identity edits; a fresh read-only reviewer
found only a stale `Provisional name` sentence, which was corrected.

CLI is scripts/waxwing.mjs, npm script waxwing; packages are waxwing,
waxwing-style and waxwing-bootstrap. Renamed nine example/negative sources;
updated Go names/panics, temporary prefixes, harvest instrumentation,
current documentation, active FX001 documents, backlog and handoff. Historical
plans/progress/findings, prior naming evidence and branding provenance remain.
ADR 009 records the decision. No semantics, verbs, aliases, extension-based
rejection or final artwork were added.

Evidence so far:
- Before code edits, `npm run verify` exited 1: 638/640 parallel tests
  passed; fn-linear lambda 1604.135291 ms > 1545 ms and mismatch
  819.499333 ms > 525 ms. Serial tests/proofs not reached; FN006 owns the
  recorded failure/next action. Log .build/waxwing-baseline-verify.log.
- RED: renamed test/program.test.mjs against original compiled output
  failed only the expected old usage text (8 pass, 1 fail),
  .build/waxwing-usage-red.log. `npm run build` then passed with zero
  warnings/errors, .build/waxwing-build.log.
- All five examples emitted snapshots equal to the old bytes under only
  Bumpus/Waxwing and bumpus/waxwing substitutions, then ran through
  `npm run --silent waxwing -- run`: outputs saved in
  .build/waxwing-examples.json. Program/compiler/shell tests: 21 passed,
  no failures/skips, .build/waxwing-cli-green.log.
- Isolated source restoration: copied the healthy source/tool/test/output
  tree into .build/waxwing-name-regression, restored only Format.Arguments'
  old usage text, rebuilt successfully, then test/program.test.mjs failed
  only the usage assertion (8 pass, 1 fail). Logs
  .build/waxwing-name-regression-{build,test}.log. Live source unchanged.
- Post-rename `npm run verify` exited 1: 639/640 parallel tests passed;
  `twenty thousand declarations compile and run` took 5.106579416 s > 5 s.
  Serial tests/proofs not reached. Log .build/waxwing-verify.log; T004
  records the timing failure rather than concealing it with a rerun.
- During that validation, unrelated checker edits appeared in five files,
  followed by missing output/Format.Parse/index.js in a harvest smoke
  attempt (ERR_MODULE_NOT_FOUND; no hook behavior exercised). Concurrent
  diff/hashes preserved in .build/waxwing-concurrent-{edits.patch,files.json};
  smoke diagnosis .build/waxwing-harvest-race.log. Asked the user to pause
  the other FX001 worker; combined-tree verification awaits a stable tree.

No whole-suite success, merge, commit or push is claimed by this entry.

## R003 paused-tree validation and supplied branding (2026-10-09)

The user confirmed the other worker paused. Its eight changed source files
remain byte-identical to .build/waxwing-paused-files.json; no worker edit
was reverted or folded into the rename's semantic claims.

- Combined paused tree: `npm run verify` builds with zero warnings/errors,
  passes strict-rebuild/structural gates and 634/640 parallel tests. Five
  fn-linear bounds fail (exact timings in FN006); unify-row's deferred-Fail
  assertion expects RowMissing but receives Subst. R003 records the worker's
  remaining test/settlement next action, without changing its assertion.
  Log .build/waxwing-paused-verify.log. Serial tests/proofs not reached.
- An accidental extra paused-tree verify ran while creating the isolated
  validation tree because its working directory was wrong. Its log is
  preserved as .build/waxwing-paused-extra-verify.log: 636/640 passed, three
  fn-linear timing failures and the same row assertion. The mistaken
  relative log-move command also failed before correction. Neither run is
  isolated evidence or a hidden retry to claim a pass.
- Isolated rename-only tree: .build/waxwing-validation has the renamed
  code/tests/packages and the original 3481468 versions of the eight worker
  files (.build/waxwing-validation-scope.json). `npm run verify` builds with
  zero warnings/errors, passes strict-rebuild/structural gates and 639/640
  parallel tests. Only pipe at 20,000 parameters exceeds its unchanged
  750 ms bound (942.893 ms); .build/waxwing-isolated-verify.log. FN006 owns
  this existing parallel-timing exposure. No whole-suite green is claimed.
- Ran the remainder explicitly, without rerunning/omitting the failed
  parallel tests: all test/*.serial.test.mjs via --test-concurrency=1,
  13 passed, zero failures/skips (.build/waxwing-isolated-serial.log);
  scripts/regression.mjs, all twenty-two healthy/mutant proofs passed
  (.build/waxwing-isolated-regression.log). Statuses in
  .build/waxwing-isolated-remaining-results.json.
- The WAXWING_HARVEST/waxwingHarvest smoke passes on stable rebuilt live
  output, recording its source exactly once (.build/waxwing-harvest-smoke.log).
- User supplied the final flight-lines logo assets in main, then confirmed
  the files visible there are right after discussing kerning. Copied all
  five assets/notes byte-for-byte into fx001; hashes recorded in
  .build/waxwing-branding-hashes.json. Inspected the white preview, parsed
  both SVGs and confirmed no scripts/raster/external references. Transparent
  logo PNG is 2048 x 1991; preview 530 x 515. README uses the logo PNG;
  branding README links vector masters/notes and archived Bumpus provenance.
  No artwork was generated or edited by this migration.
- Fresh read-only review found no remaining rename blockers. The stale
  provisional sentence and harvest-property abbreviation were corrected.
  git diff --check passes. Current FX001 status/handoff distinguishes the
  implemented rename from the incomplete worker review fixes.

## R003 final rename evidence (2026-10-09)

The original 3481468 compiler was rebuilt in .build/waxwing-baseline-compiled
for a differential comparison. Its first scratch build failed because the
copy omitted tools/style/src (.build/waxwing-original-build.log); supplying
that unchanged directory fixed the setup, and the next build passed with
zero warnings/errors (.build/waxwing-original-build-fixed.log).

A scratch copy of scripts/differential.mjs normalizes only Bumpus/Waxwing
and bumpus/waxwing in emitted-Go hashes; all seven phase comparisons and
diagnostic comparisons remain. The full harvested corpus comparison was
interrupted (status 130) after several minutes without a report; T006 owns
the investigation. The bounded comparison used sources up to 20,000
characters (2,433 captured sources, 53 stress sources outside this optional
comparison only). It exited 0: 2,433 harvested, 1,029 fuzz, 1,000 match and
1,000 mutation sources, plus 1,085 isName probes; zero differences. Log
.build/waxwing-differential.log; scope .build/waxwing-differential-scope.json.
The bounded run had already completed when an interrupt was requested.
A redundant memoized-hash scratch experiment was then stopped (status 130)
and is not validation evidence; the final scratch checker was restored to
the successful version. No maintained differential check was weakened.

Final smoke: live npm waxwing run examples/answer.wxw prints 42; all eight
paused worker files still match their saved hashes; current branding assets
match the user-supplied originals (.build/waxwing-final-smoke.log).
The user confirmed the visible logo files are right. Read the supplied
Claude continuation prompt and the local SDD ledger; they corroborate the
paused Task 3 review-fix state. No further effects implementation was
started by this rename task.

Rename implementation is complete on fx001. Full verification is **not
green**: the isolated rename tree has the recorded pipe timing failure,
and the live combined tree also contains the unfinished deferred-row test
mismatch plus timing failures. Serial continuation (13) and all twenty-two
regression proofs pass; earlier failures remain recorded. The rename and
eight preserved FX001 worker files remain uncommitted; main is unchanged.
For the continuation, commit the rename separately from Task 3 review fixes;
finish those fixes/tests and re-review before Task 4. No merge or push.


## FX001 Task 3 review-fix continuation (2026-10-09)

The user resumed FX001 after the rename's separate commit 40cf312.
Preserved and completed the eight paused source files: deferred Fail keys
postpone the whole original row equation with type/row/fresh/event rollback;
settleRows retries after other constraints and preserves undecidable pairs;
groundErased is used only for Seeds/Resolve monomorphism while strict
ground remains strict. RowOccurs distinguishes a row's occurs failure.
The left-over-right path also needed a deferred-key guard: new tests first
failed 9/10 with RowExtra, then passed after that guard. Exact closed/open
reflexivity, one-Fail settling, closed deferred right, never-skip-first,
rollback, retry, arrow continuation and erased grounding cases are covered.

The independent transactional oracle now models rollback, postponement and
settling. Generators include deferred Fail arguments, same-family
Error(Int)/Error(Bool), arrow label arguments and nonempty starting type/row
substitutions. Original 1,500-pair solved laws (including symmetric
acceptance and scoped equality) remain; 2,000 further pairs in both
directions distinguish pending acceptance from solved equality and compare
settling after ordinary constraints. Focused run: 44/44 pass, no skips
(.build/fx001-task3-fix-focused.log). Seven isolated source mutants all
compiled successfully then failed intended assertions; full logs/results
in .build/fx001-task3-fix-mutants, summarized in the local Task 3 report.

Verification history retained:

- First clean-output npm run verify exited 1; build had zero warnings/
  errors and gates/strict-rebuild passed, but parallel match-lift timing
  was 1670.670250 ms >1500 (643/644 pass). Exact raw log:
  .build/fx001-task3-fix-verify.log. T003 records evidence/next action.
  Explicit serial continuation then passed 21/21, no skips
  (.build/fx001-task3-fix-serial.log); no unchanged full rerun hid the failure.
- User-authorized FN006 prerequisite moved the byte-identical
  fn-linear.test.mjs to fn-linear-timing.serial.test.mjs; the existing
  fn-linear.serial.test.mjs stays. Controller then authorized extracting
  only match-lift's timing block to match-lift-timing.serial.test.mjs,
  keeping semantic tests parallel. Both timing workloads, all constants,
  assertions and bounds are identical (hash/block identity records in
  .build/fx001-task3-fix-{timing,ladder}-identity.txt). This applies the
  existing suffix-driven serial policy; no checks are skipped or weakened.
- After that actual scheduling change, a second clean-output npm run
  verify exited 0: 356 modules, zero source/library warnings/errors,
  pinned formatting, strict-rebuild/structural gates, 643 parallel tests
  plus 22 serial tests, zero failures/skips, and all 22 existing regression
  proofs. Ladder: 410.995667 ms test duration against unchanged 1500 ms
  timed-compilation bound. Complete raw log:
  .build/fx001-task3-fix-verify-serial-scheduling.log.

The row fix is verified through direct semantic tests/oracles; no syntax
can create nonempty effect rows yet. Task 5 must settle after body
constraints and diagnose remaining unknown families. Deferred equations
currently carry no spans/provenance; Task 9 must preserve/recover origins
when integrating traced retries. UnifyRow is 249 lines. Both are explicit
handoff concerns, not claims of completed later tasks. Active effects ADR
references now use 010 (009 is naming). Ready for independent review before
Task 4; no merge or push. Local report/ledger:
.superpowers/sdd/2026-10-09-effects-plan/{task-3-report,progress}.md.


### FX001 Task 4 — effect signatures, operations and Console (2026-10-09)

Implemented sorted signature variables with one rigid ambient row,
explicit rows, declared operations, stage consumption, Console print and
Unit entry output. Rows erase from specialization arguments. Field and
operation arrows default to pure, with declared effect names available;
lambda annotation omissions share the lambda's own fresh ambient row.
Program.Compile explicitly rejects user effects before specialization;
handlers and user effect execution remain later tasks. Wire diagnostics
carry related: [] with existing messages and spans preserved.

Clean-output npm run verify exited 0 (.build/fx001-task4-verify.log):
zero build warnings/errors, formatting/structure/strict-rebuild gates,
672 parallel tests, 22 serial tests, no failures or skips, and all 22
existing actual-source regression proofs. Four additional isolated actual
source mutants built and failed their named regressions: lambda annotation
omission, 20,000-arrow row collection, row argument erasure and effect
names in field types (.build/fx001-task4-sensitivity/{results.json,*-test.log}).
Earlier failed runs remain documented in the local Task 4 report; no
unchanged rerun hid a failure. Concrete malformed-input validation gaps
are BACKLOG FX004, with reproductions and the Task 5 next action.
No merge or push. Implementation/evidence:
.superpowers/sdd/2026-10-09-effects-plan/task-4-report.md.

### FX001 Task 5 — handlers and typed failures in Check (2026-10-09)

Implemented handler values, `with`, `handle`, and `fail` through Parse,
Resolve, and Check. Handler clauses are checked against declared operations;
`with` consumes the handler capability while preserving the outside row;
`handle` settles concrete `Fail(E)` keys and forwards unhandled error
families. Deferred retries preserve the original semantic failure category
and `fail` span. Nested failures are traversed through their payloads.

Row-parameterized ADTs support interleaved, multiple type/row parameters,
bare effect labels, and `pure`; source sorts are retained while VarIds stay
canonical (type slots first). The parser remains Applicative-only; Handler
type syntax is isolated in Format.Parse.HandlerType. A declared ADT named
Handler wins for `Handler(Foo)`, while `Handler(Clock)` resolves as a handler
type when no such ADT exists. Duplicate effects, operations, effect/type
parameters and function/handler binders use the existing duplicate
diagnostics. Both written row forms reject repeated or nonfinal tails.

Program.Compile rejects checked Handler/HandlerValue, With, Handle and Fail
nodes, plus Handler types in signatures, expressions and every constructor
field, before Specialize. The iterative type walk stays stack-safe at a
20,000-arrow signature. This is Check-only support: specialization/lowering,
runtime behavior, and Go emission remain later FX001 tasks.

Root audit findings 1–13 are fixed and recorded with reproductions in
.superpowers/sdd/2026-10-09-effects-plan/task-5-root-audit.md. The previous
FX004 validation gaps are closed. Focused handler tests pass 81/81; the
large-source suite passes 15/15, with 20,000-type duplicate rejection at
475 ms against its unchanged five-second bound. Eleven new isolated source
mutations prove the nested Fail, duplicate validation, deferred diagnostic,
metadata guard and duplicate-scan timing regressions.

Clean-output `npm run verify` exited 0 in
.build/fx-handler-task5-verify5.log: zero build warnings/errors, pinned
formatting, strict rebuild and structural gates, 722 parallel tests and 22
serial tests with no failures or skips, and all 33 actual-source regression
proofs. Earlier real failures remain preserved: verify2 exposed duplicate
and resolver-metadata compatibility issues; verify4 exposed eager
`when`-argument evaluation in duplicate scanning (6.92 s against the
unchanged five-second limit). Those defects were fixed and their regression
proofs added before verify5. Full interfaces, evidence and the remaining
Task 9 origin-provenance handoff are in
.superpowers/sdd/2026-10-09-effects-plan/task-5-report.md. No runtime or
specialization behavior is claimed for this task.

### FX001 Task 6 — effect specialization with erased rows (2026-10-09)

Resumed in a Claude Code cloud session on branch claude/vibrant-cerf-3km61i
(fast-forwarded to fx001 at 9a6befd; no .worktrees, ruling recorded in the
SDD ledger). The local SDD ledger of Tasks 1-5 was never committed; it was
recreated from git and this file. Task 6 was implemented inline by the
controller before the superpowers skills were linked into .claude/skills
(32ee2d2); it then received an independent task review.

Implemented: effect keys (EffectRef, ground type arguments) in the one
specialization worklist, created on first reference; user effect keys fill
their operations' types beside their source (Resolved.OperationInfo gains
`syntax`), so they reach type keys and the effect keys of handler types;
`Handler(L …)` lowers to L's key in bodies and constructor fields; rows are
erased everywhere. The IR gains `THandler EffectKey`, an `effects` table and
nodes OperationRef, Perform, HandlerValue, Install, Handle and Abort (fail;
`handle` clauses and aborts carry the payload's declared family). Check.Nested
judges one reference graph over type and effect declarations (constructor
fields, operation parameters and results, `Handler(L …)` edges); Grow, the
mutual pair and the data/effect cycle are E_SPECIALIZATION at the nested
reference, their bare-parameter versions compile. A function whose type
variable appears only in its own row's labels is polymorphic (it crashed
specialization before). Features.Check.Unlowered is replaced by
Features.Specialize.Unlowered over the emitted IR: effect layouts or effect
nodes stop at E_INTERNAL "unlowered effect"; unused effect declarations reach
Go unchanged. Only keys with type arguments count toward the 10,000 limit.
Tests reach Specialize directly (test/fx-specialize.test.mjs, 18 tests);
executable probes wait for Task 7.

A Task 5 parser defect surfaced: `with R` inside `Handler(L with R)` was
silently dropped (and rows after non-arrow types elsewhere). Fixed by a
Sonnet implementer in 5da7865 and 3aa1217 (round 2 pending at this entry),
reviewed by Opus; meaningless rows are now E_SYNTAX "Unexpected effect row".

Evidence: RED 15/18 (.build/fx001-task6-red.log; three characterization
tests passed before). Clean `npm run verify` at 85c5867
(.build/fx001-task6-verify.log): zero build warnings, gates pass, 752/752
parallel tests; serial phase 13/22 — the 9 failures are fixed timing bounds
that fail identically on the pre-Task-6 baseline 9a6befd on this container
(BACKLOG T007); regression proofs, run explicitly: 33/33 (.build/fx001-
task6-regression{,2,3}.log; four duplicate-declaration rows now expect an
accepted program because the old guard no longer masks them). Test-helper
defect fixed: test/poly-keys.mjs built a 5,000-deep JSON message eagerly
(stack overflow here). Task review (Opus): spec ✅, quality Approved, no
Critical/Important; Minor items deferred in the ledger.

## FX001 spec revision: `defer` must not fail (2026-10-09)

Before Task 8, the user was asked how a cleanup failure during an abort
should behave (abort-to-defect conversion as specified, drop, replace, or
suppressed causes). The user chose the static rule, after Swift's `defer`:
a deferred expression that performs an unhandled `Fail` is E_EFFECT
`defer must not fail, but it performs <L>`; cleanup that can fail handles
its failure inside the deferred expression. Only defects can fail cleanup,
so a pending typed abort reaches its `handle` unless a cleanup on the way
raises a defect (the abort then heads the report) or diverges (corrected
per CF001 §11). Spec §2 (`defer`
rule), §3 ("Cleanup failures", with rejected alternatives), §5 (report
example, probes 6 and 11), plan Global Constraints and Tasks 8, 10 and 12,
findings and the handoff were updated. Docs only; no code changed.

### FX001 Task 7 — Go lowering of handlers, operations and failures (2026-10-09)

Subagent-driven: Sonnet implementer (e9a613f, fix round 4b80bd1), Opus task
review and scoped re-review. Effect programs now build and run. ctx mode is
chosen over the emitted IR (any effect layout or effect node); in it every
function, stage, lambda, constructor, lifted helper and function type takes
`ctx *waxwingCtx` first; otherwise Go output is unchanged (bootstrap
snapshots byte-identical, Console-only programs without ctx). Runtime (Task
1's adopted shapes, emitted only when used): immutable context list,
non-zero-sized markers, targeted aborts recovered only by their own lifted
`handle` helper. Keys: user effect EffectId+1, Fail families by declared
head (negative keys); missing handler is `panic("no handler for L")`.
Handler structs per layout (empty for Console/Fail layouts), perform
functions call clauses with the frame's outer context (intercept-and-
forward), clauses lifted like lambdas. Features.Specialize.Unlowered is
deleted; every 'unlowered effect' assertion was replaced by an executable
assertion (test/fx-run.test.mjs, 24 programs with exact stdout).
Two checker defects found and fixed: constructor patterns dropped row
arguments (Check.Match/Tables), and consumption did not resolve a bound row
tail (Check.Consume); Check-level tests in test/fx-check-fixes.test.mjs,
each failing with its fix reverted. Review found one Critical: the clauses
of one `handle` were installed in reverse (runtime panic for Error(Int) vs
Error(Bool) clauses); fixed with probes. Regression rows: block-order needle
updated; handler-metadata replaced by effect-free-ctx.

Evidence: `rm -rf output && npm run verify` (.build/fx001-task7-verify.log):
build, gates, 786/786 parallel tests; serial 12/22, the 10 failures are the
BACKLOG T007 environment bounds (same set on pre-change baselines);
regression proofs 33/33 (.build/fx001-task7-regression.log). The
fx-block.serial 20,000-let test sits at its 1,500 ms bound on this
container: 49717bc 1,533-1,574 ms vs Task 7 1,386-1,505 ms, alternating.

### FX001 Task 8 — `defer`, `crash`, cleanup and the defect report (2026-10-09)

Subagent-driven: Sonnet implementer (041cb31; fix round d5bfa8d, resumed
after a container restart), Opus task review and scoped re-review.
`defer e` (block item) and `crash(value: a): b` (built-in, printable
argument, no effect, uncatchable) run through every phase. Cleanup runs
LIFO, exactly once per exiting activation, in the registration context;
the defect report follows spec §5 (exit status 1, first line the original
cause, later lines `cleanup failed: `; `<not printable>` decided
statically). Runtime pieces (Format.Go.Cleanup, Format.Go.Report) are
emitted only when used; defer and crash do not force ctx; blocks without
`defer` emit no Go `defer`. Conventions recorded: with no pending cause the
first cleanup crash is the unprefixed first line; Go runtime panics print
as `panic: <text>`.

The user's rule that `defer` must not fail is enforced soundly after
review: the first implementation checked only labels, so five programs
(callback parameters with ambient or named rows, unsettled closures,
lambdas decided later) let a typed failure escape cleanup and become a
fatal report. Ruling (controller, pending user confirmation of strict over
a lacks-Fail constraint): the deferred expression has its own row; after
the function's constraints settle, a remaining Fail label or a tail
resolved to a rigid row variable is E_EFFECT (`defer must not fail, but it
performs <L>` / `... but it may perform any effect of <r>`). Accepted
limitations (spec §2, BACKLOG FX007): the bracket idiom needs `with pure`
callbacks; a local lambda also called outside the `defer` in a non-main
function is rejected in it. Report.payloadName now walks arrow spines by a
loop (a 5,000-arrow payload crashed the compiler).

Evidence: fx-cleanup 32/32 (RED 24/26 before, then 7 new failing tests
for the fix round; seven isolated mutants caught). `npm run verify`
(.build/fx001-task8-verify.log): build, gates, 818/818 parallel tests;
serial 12/22, the 10 failures are BACKLOG T007 timing bounds; regression
proofs 33/33 (.build/fx001-task8-regression.log). Re-review probes:
legitimate defers (`defer log(1)`, `defer print(x)`, monomorphic helpers)
accepted; the check is linear (1k-8k defers).

### FX001 Task 9 — effect diagnostic provenance (2026-10-10)

Subagent-driven: Sonnet implementer (2fc7a02; fix rounds 04ab898, cee8542,
b80cc17), Opus task review and two Opus re-reviews, Sonnet re-review of the
last one-line fix. (A first dispatch was lost to a container restart; the
second was briefly stopped by a controller misreading of a user message and
resumed with its work intact.) Effect errors now carry origin, boundary and
path notes (spec §6): occurrence links live in the substitution and are
recorded on every unification path (nested arrow rows, settleRows retries,
consumption); deferred-row origins are kept apart from the function row;
note texts follow ruling R4 and the wire carries `related: [{ span,
message }]`. Resolved gains `rowSpan` on functions and parameters so
boundary notes point at the written `with` (or the parameter name when the
concerned row is nested or not the only pure row). Path hops, note count
and characters are abbreviated (`visibleLabels 4`, `pathHops 2`, `maxNotes
4`, `maxCharacters 2000` for notes); labels over 120 characters print
`Effect(…)` in headlines. Pre-FX001 diagnostics are unchanged (`related:
[]` by construction; wire JSON identical); 20,000-parameter signatures
check in about 1.5 s.

Known limits recorded: `maxCharacters` bounds notes only — a headline with a
very long type or effect name can exceed 2,000 characters (BACKLOG E011);
the late-Fail-key defer note follows let-bound locals only and otherwise
gives no note (never a wrong one; ~20 probes); origin notes may point
outside the deferred expression.

Evidence: fx-diagnostics, fx-diagnostic-origins, fx-signature 46/46; the
fix-round tests were each seen failing (the round-2 tests by the controller
against 04ab898 in an isolated worktree). Final verify
(.build/fx001-task9-fix3-verify.log): build, gates, parallel 847/848 — the
one failure is large-source "three-thousand-constructor match" timing
(BACKLOG T004; passes alone); serial phase failures are the T007 set;
regression proofs 33/33 (.build/fx001-task9-fix3-regression.log).

### FX001 Task 10 — reference interpreter and differential corpus (2026-10-10)

Subagent-driven: Sonnet implementer (50f84ae; fix round 9365db3), Opus task
review, Sonnet scoped re-review. Test-side only: no compiler source
changed (`git diff 89de11c -- src scripts` is empty). New files:
test/fx-oracle*.mjs (independent lexer, parser, values, frames, cleanup and
interpreter; no compiler import), test/fx-gen-*.mjs and fx-programs.mjs
(generator), fx-census.mjs, fx-shrink.mjs, fx-diff-support.mjs,
fx-oracle.test.mjs (parallel) and fx-differential.serial.test.mjs (serial,
ruling F11). Executable probes moved unchanged into importable modules and
imported back: fx-cleanup-programs, fx-console-programs, fx-task7-programs
(Task 7's eight inline run probes from fx-specialize and fx-handler-check).
docs/engineering.md documents the corpus and the knobs `WAXWING_FX_SEED`
and `WAXWING_FX_PROGRAMS`.

The interpreter models the shipped semantics: handler frames keyed by effect
identity, `Fail` by the payload's declared head, the first clause innermost,
clauses in their `with`'s outer context, `defer` LIFO in its registration
context, the pending abort heading a cleanup-crash report, `cleanup
failed: ` lines in execution order. It is validated against every
executable probe of Tasks 2, 4, 7 and 8 (fx-oracle.test.mjs 86/86); the
fx-cleanup `injected` cases and fx-block `orders` probes (Go transformed
after emission) are excluded by name. Ruled deviations: the oracle parser
re-implements the grammar rather than extending poly-parse.mjs (a closed
closure that may not be edited); only the first three differences per run
are shrunk (every difference's seed and source are written first); the
sensitivity check compares the interpreter with its inner-clause-context
flag (50 programs, at least one difference), Go-vs-interpreter equality
being the serial run's job.

Default run: 500 programs, seed 20261010 (program i uses seed 20261010+i),
five go-batches of 100, 0 differences, 0 rejections, 0 interpreter errors,
12.9 s (.build/fx001-task10-fix-default.log). Census (minimum): nested
same-key 225 (50), intercept-and-forward 68 (50), aborts crossing an
unrelated handle 109 (50), stage order with over-application 90 (50),
escaped callbacks 109 (50); cleanup normal 267, abort 363, defect 119,
crash on normal exit 65, crash while abort pending 38, several crashes 38,
own failure during abort 193, registration context 74, unreached defer 143
(25 each). 25 rejection variants give E_EFFECT with the Task 8 texts at the
`defer` span. Extra run: seed 7, 2,000 programs, 0 differences
(.build/fx001-task10-large.log). Mutation witnesses (isolated copies):
inner clause context, first clause outermost, FIFO cleanup, abort not
heading the report, eager argument evaluation each fail the hand traces;
disabling item removal or literal replacement fails the shrinker tests.

Finding: the interpreter exposed a hole in the strict `defer` rule — a
deferred operation whose handler clause fails ends cleanup in a typed abort
(BACKLOG FX008). The generator emits only fail-free random clauses until it
is fixed.

Verify (.build/fx001-task10-fix-verify.log): build, gates, parallel 933/934
— the one failure is large-source "three-thousand-constructor match" (T004;
passes alone). Serial phase run directly (.build/fx001-task10-fix-serial.log):
the new differential tests pass; failures are timing bounds only — the T007
set, fn-scale 1,000-long arrow (also failed in Task 9's serial log), the
match ladder (T003, also failed in Task 9's), and fn-scale "chain of 1,000
partial applications" (phases 253 ms; new in this log, and failing alone
three times at 310-341 ms with compiler, scripts and that test unchanged
since 89de11c — the container's bound, recorded under T007). Regression
proofs 33/33 (.build/fx001-task10-fix-regression.log).

## FX008 design note: tracking handlers that may fail (2026-10-10)

Branch fx008 (from claude/vibrant-cerf-3km61i at fdd375a), on the user's
machine. Baseline `rm -rf output && npm run verify`
(.build/fx008-baseline-verify.log): exit 0; build, gates, 934/934
parallel tests, 29/29 serial tests (the T003/T004/T007 timing bounds all
passed here), 33/33 regression proofs. The user ran verify on main in the
same checkout about the same time, and this session had just switched the
checkout to fx008; overlap was not established, and this run passed.

Design only, no code: docs/plans/2026-10-10-abort-tracking-design.md.
Recommended approach A: a `nofail` mark on each non-Fail label occurrence;
`with h` gives the body's label h's mark; handler clauses get own rows
(the R0 technique), and clause labels relate to the handler by ⊑, not
unification; `defer` demands N on every label it performs; signatures
write `nofail L` to rely on a handler not failing; a per-declaration
two-point propagation, linear, with no scheme constraints; marks erased
before specialization, so Go is unchanged. Alternatives B (totality per
effect) and C (inferred marks) are recorded. Newly rejected: one pinned
acceptance (fx-cleanup-programs `a defer performing a non-Fail effect`,
migrated with `with nofail Log`), plus the pinned oracle hole. Independent
Opus review dispatched; user decisions D1-D5 pending.

Review (Opus, review-fx008-design-result.md): Accept with fixes. Critical:
C1, the solve was seeded only from defer demands, so a handler mark made N
by a callee's `nofail` signature was never checked (the cross-function
hole stayed open); C2, separate clause rows need late consumption that
keeps `Fail`, to a fixpoint, or the base effect system becomes unsound
(the reviewer's late-`Fail` program is `Unhandled Fail(E) in main` today).
Important: equality merges through monomorphic locals (I1), no mark
polymorphism for forwarding helpers (I2), an understated migration (I3),
and a soundness argument to restate (I4). The reviewer ran the hole and
the I1/I2 programs on the current compiler (accepted; I1/I2 run
correctly). Revision 1 of the note applies every finding: a fixed settle
order, seeding from every N mark, limitations L4/L5 with decisions D6/D7,
the D0 interpretation decision, and minors M1-M10.

Re-review (rereview-fx008-design-result.md): C1, C2, I3, I4 and M1-M10
addressed; new Critical N1: the late-consumption fixpoint does not
terminate when a restricted row shares its tail with its target (the
reviewer's programs: a never-called lambda with a Console-only cleanup,
accepted today; a no-`defer` clause form, rejected today, which would
hang). Revision 2 adds a shared-suffix rule, the full settle order (N2)
and N3-N5. Round 3 judged the rule sound but the termination measure
unsound as written (it used provenance links, which may cycle and must
not influence typing); revision 3 uses a copy map local to that step.
Revision 3 is not re-reviewed. Stopped for the user's decisions D0-D7.

Verify at afedaec (docs only; .build/fx008-design-verify.log): `rm -rf output
&& npm run verify` exit 0; 934/934 parallel, 29/29 serial, 33/33 proofs.

## Module and instance-selection direction (2026-10-10)

At the user's request, documented module-system comparisons and fp-ts-style
selection/construction of instances without mandatory newtypes in
docs/plans/2026-10-10-modules-and-instance-selection-direction.md. Linked
from language direction and C001/M001 backlog entries. Separates user
preferences, recommendations and open decisions; covers abstraction/type
identity, coherence, collection consistency and evidence for algebraic laws.
No implementation or syntax approved. Active FX008 documents left untouched.
Documentation inspection only; verification not run, preserving the user's
instruction not to run checks for this discussion.

Outside advice, shared by the user 2026-10-10 and treated as advice only
(note §12; D0-D7 open), asked for a focused termination review. Revision
4 rewrote §3.5 steps 1-3. The fresh Opus review
(review-fx008-termination-result.md) found:
- P1 established; P2 established, given P3's correction;
- P3 and P4 refuted as written. Argument-level bindings add labels
  (argbind), the cycle test hangs on duplicates (dup), and satisfiable
  cycles are rejected (cycle2open);
- new Critical T1: clause rows' rigid tails are dropped (rigid.wxw is
  rejected today and would be accepted).

Revision 5 adopts the corrected procedure:
- per-key cycle weights;
- exit when no label count changes, whatever binding caused it;
- leftover set-aside pairs become E_TYPE;
- a clause-tail pass after the loop;
- the stated bound is (N0 + 1)(2n + 1) + 1 rounds;
- the fallback is disqualified by four programs accepted today (f1-f3 and
  cycle2open).

The procedure is the reviewer's and has had no second check.

Probes are copied to .build/fx008-probes/. The controller reproduced two
defects in today's checker:
- FX009: failvar2.wxw is accepted, and `run` panics with `no handler for
  Fail`;
- FX010: argbind-internal.wxw gives E_INTERNAL `Effect row consumption
  failed`.

Both are new BACKLOG rows.

Verify at 9b47e4b (docs only; .build/fx008-rev5-verify.log): exit 0;
934/934 parallel, 29/29 serial, 33/33 proofs.

User decisions 2026-10-10 (interview; note §11): D0-D5 as recommended;
D6 mark variables (`nofail(k) L`) and D7 directional checking are
included in FX008. Revision 6 of the note adds them. Including D7 needed
two structural changes, which remove the merge and forwarding limitations
(L4 mostly, L5):
- `with` consumes the handler's clause row as a restricted row instead of
  unifying it with the context;
- each installation gets its own frame mark.

Mark solving becomes a path check over a two-point lattice with rigid
mark variables. One Opus review of the whole note is in progress. FX009
is being fixed test-first in parallel, on branch fx009 in a worktree.

FX009 review (Opus, review-fx009-result.md): Needs fixes.
- I1: the check ran in the first `settleKeys` as well, and rejected a
  program accepted today.
- I2: the span heuristic misleads, and the requested note is missing.
- M1: callers were now rejected even when nothing fails. The user
  decided (2026-10-10) that a `Fail` whose payload head is a type
  variable is E_TYPE at the written annotation.
- The fix round is in progress on branch fx009.

FX008 revision 6 review (Opus, review-fx008-rev6-result.md): no Critical
findings and no unsound acceptance found. The path check is correct, and
the revision 5 loop holds with installation entries.
- I1: consuming the clause row at `with` lost type inference. meta2.wxw,
  accepted today, would be rejected, and hole2c.wxw's Go output would
  change.
- Revision 7 keeps R as today's inference row, unified with marks
  ignored, and adds an internal clause row C for marks. It also applies
  I2-I4 and M1-M9.
- New BACKLOG FX011: `handler Console` gives E_INTERNAL.

Revision 7 is unreviewed.

FX008 revision 7 check (Opus, review-fx008-rev7-result.md): soundness
established. The two-row split restores meta2 and hole2c, but not all of
today's inference: late1 and late2, without `defer`, would be rejected.
User decision: a one-way hook keeps R in step with the clause rows
(revision 8). The other findings are applied as text:
- R's marks are dead;
- written handler types get their own C;
- merge2 is pinned as L4;
- M1-M4.

A narrow review of the hook is in progress.

FX009 re-review (Opus, rereview-fx009-result.md):
- N1: the guard is reachable through payloads with no family key, such
  as `Fail(Int -> Int)`, which reproduces the original panic.
- N2: `handle` clause payloads give E_INTERNAL.

User decision: every written `Fail` payload without a family key is
E_TYPE at the label, in signatures and in `handle` clauses. Round 2 is in
progress.

FX008 revision 9 applies the hook review (review-fx008-rev8-hook-result.md;
no Critical findings, soundness unaffected):
- F1: R ≡ R when two handlers' clause rows share a tail. Without it,
  two1, two3 and two1f, which have no `defer` and are accepted today,
  would be rejected, and two2's Go would change.
- F2: whole-row consumption with the per-key cycle test. Without it the
  hook loops forever on cyc2 and cyc3.
- M1-M5.

F1 and F2 are unreviewed. A probe gate, which re-runs every review probe
(kept in .build/fx008-probes/), is now the first plan task.

FX009's round 2 was approved by the re-review, and the branch's docs are
committed (3518678 on fx009). Verify at 3518678: exit 0, 958/958
parallel, 29/29 serial, 36 proofs. It awaits the user's merge decision.
New BACKLOG FX012: `firstUnkeyed` runs before deferred rows settle.
## FX009: unresolved `Fail` payloads rejected (2026-10-10)

Branch fx009, from fx008 at 531e438. Sonnet implementer (c445bac;
review rounds 33a3a62 and f6cb6d0), Opus review and two re-reviews
(docs/sdd/2026-10-09-effects-plan/review-fx009-result.md and
rereview-fx009-result.md).

Defect: leftover deferred-key pairs were dropped silently, so a
`Fail(a)` parameter row let a failure escape at run time (`no handler
for Fail`).

User decisions:
- Written `Fail` payloads without a family key (a type variable, a
  function type or a handler type) are E_TYPE `Fail needs a concrete
  error family` at the label, in signatures and `handle` clauses, with a
  hint.
- `Fail(Error(a))` and `Fail(Unit)` are allowed.
- The final settle rejects any leftover pair.

The reviews found no program that reaches that guard (about 50 probes
compared against a build without it), so it is a 3-line rejection.
Mutants of the written-label checks are caught by the guard at the
wrong span.

Evidence:
- test/fx-fail-pairs.test.mjs: 25 tests, with the rejections seen
  failing first.
- Regression rows signature-fail, keyless-fail and clause-fail; nested-fail
  retargeted with a span assertion.
- `rm -rf output && npm run verify`: exit 0, 958/958 parallel, 29/29
  serial, 36 proofs.

Spec §2 "Label keys" updated. Pre-existing and recorded separately: a
`handle` whose failure key is decided only after deferred rows are
settled is rejected early (`firstUnkeyed` runs in the first settle).

FX009 merged into fx008 (26fefe3, user decision 2026-10-10). Verify on the
merged tree (.build/fx009-merge-verify.log): exit 0, 958/958 parallel,
29/29 serial, 36 proofs. The user asked for one focused review of FX008
revision 9's F1/F2 procedure (termination, inference compatibility,
scheduling). On no substantive issue, the user approves the written spec
and the implementation plan follows, starting with the probe gate.

## First-party Schema direction (2026-10-10)

Recorded the user's requested Schema foundation as SCH001 in
docs/plans/2026-10-10-schema-direction.md and the backlog, with links from
language/tooling direction and a targeted LA001 comparison. Consulted Effect
v4 Schema documentation and the supplied rae-hill/schemata-ts README/interface
docs. Covers parse-into-domain boundaries, codecs, selectable interpreters,
generators/shrinkers and independent properties. Library/compiler mechanism
and v1 subset remain open. No implementation, tests, commit or verification
run; preserves the user's request not to run checks during design discussion.

SCH001 follow-up (2026-10-10): expanded schema-direction with capability
overlap versus Effect, the direct io-ts Schema/Schemable precedent,
tagless-final research and ZIO Schema's different representation. No major
required capability exclusive to schemata established; interpreter encoding
versus AST remains open. Documentation inspection only; no checks run.

Focused F1/F2 review (review-fx008-rev9-f1f2-result.md): a
substantive issue. Termination, inference compatibility and scheduling
each failed as written (cyc1, ov1, set1, all accepted today). It found
no unsound acceptance. Revision 10 applies the corrections:
- T: process a clause row only on a signature change, and run `sync` to
  a fixpoint;
- F1′: a remainder meta per clause-tail class instead of R ≡ R;
- S: the settling loop consumes clause rows the same way.
A mapping argument in the review shows that no program accepted today is
rejected. The user's approval condition (no substantive issue) is not
met; awaiting the user.

FX008 revision 10 re-check (review-fx008-rev10-result.md): no
substantive issue.
- Termination is established with a wording correction: N1, class
  identity across merges.
- Inference compatibility is established. A supplement covers the "type
  solved" direction (pair1). gain1 is a sound gain.
- Scheduling is established. N2: the feed graph uses the clause row's own
  tail.

The wording fixes are applied. By the user's condition (2026-10-10), the
written spec is approved. The implementation plan is next, starting with
the probe gate. Probes are kept in .build/fx008-probes/ (rev6-rev10).

## FX006 constraints and FX008 hypothesis recorded (2026-10-10)

Docs only, from a review of the draft Waxwing article outline. BACKLOG
gains FX006 (general resume) ahead of FX001 Task 12, carrying the plan's
scope plus the user's constraints: multiplicity decided on language terms,
one-shot by default and declared per operation so multi-shot stays an
additive, row-visible extension, reserved spelling, at-most-once assumptions
stated in `defer`/FX003/CF001, and a double-resume regression. FX008
records an unverified hole in `defer must not fail` through a failing
handler clause. (Merged 2026-10-10 into branch fx008, which already
tracked and verified this hole as FX008: the duplicate row was folded into
that record. See "FX008 merge with the article-outline branch" below.)
language-direction.md records the user's direction that the
language (frontend, syntax, type system) outranks the Go target. No code
changed; no build or verify ran (a parallel worktree was active).

## FX008 merge with the article-outline branch (2026-10-10)

Branch claude/optimistic-dijkstra-6i21jy (81990d6, 2b42574; docs only,
from main 234d115) is merged into fx008 with a merge commit. Its FX006
row and the language-direction section "Language before target" are kept
unchanged. The FX008 work does not contradict FX006's constraints:
design §4.6 makes any `ctl` clause's handler may-fail until general
resume. Its Task 12 change to the effects plan is kept.

Its FX008 row duplicated this branch's FX008, recorded there as an
unverified hypothesis. It is folded into this branch's row and removed.
The folded-in facts:
- the argument that the handler need not be local;
- the Task 8 review's claim that clauses reach the deferred row only
  through metas or rigid tails, which this case refutes.

Established on the current compiler (probes in .build/fx008-probes/facts/):
- the lexical and cross-function forms are accepted;
- without a pending abort, the cleanup's `fail(E)` skips the enclosing
  `handle` for E: exit 1, stderr `fail(E): E`;
- with a pending `fail(F)`, F never reaches its `handle`: exit 1, stderr
  `fail(F): F` then `cleanup failed: fail(E): E`.

docs/writing/article-outline.md Part 3 §5 now states:
- how the hole was found: the Task 10 reference interpreter;
- the review findings on termination and on rejected programs, with
  references;
- the repair status: design approved, plan in progress, not implemented.

§4 (the Task 8 case study) was checked against review-task8-result.md:
the five programs and the 25/25 tests match. It is unchanged.

Verify at the outline merge (3e24e21; .build/fx008-merge-outline-verify.log):
`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` exit 0; 958/958
parallel, 29/29 serial (timing bounds included), 36 regression proofs.

History tidied before publication (2026-10-10, user-authorized):
- fx008 was rewritten so SCH001 has its own commit (b20eab5). The FX008
  revision 10 commits follow it, and the outline merge was redone (3e24e21).
- The only content change is the removal of a note about the earlier
  mixed commit.
- Pushed with a lease.
- Deleted after confirming they are contained: the remote and local
  branches claude/optimistic-dijkstra-6i21jy and claude/vibrant-cerf-3km61i
  (in fx008), and fx001 (in main).
- Removed four stale $TMPDIR waxwing-* directories from 2026-10-09.

The tree differs from the verified 207474b only in docs.

FX008 implementation plan (docs/plans/2026-10-10-abort-tracking-plan.md,
revision 3, 1,228 lines, 12 tasks plus setup). Drafted by an Opus planner
and reviewed twice by an independent Opus reviewer
(review-fx008-plan-result.md): round 1 "ready with fixes" (8 Important),
round 2 "ready with fixes" (one Important, the ec1 expected text). All
fixes are applied. The reviewer ran 102 probes, and the plan's recorded
outcomes match. The plan awaits the user's approval and sign-off on the
P3, P5, P6, P7, P10 and P11 decisions. Nothing is implemented.

User approval 2026-10-10: the FX008 plan (at 0d7cc27) is approved, with
sign-off on P3, P5, P6, P7, P10 and P11 and P13 accepted. The user
added:
- P5 is documented as an expressiveness limitation;
- P10 pattern-gated messages stay provisional until reported;
- P11 is described precisely.

Setup and Task 1 are authorized.

### FX008 Task 1: probe gate (2026-10-10)

Worktree /Users/ethan/Desktop/waxwing-fx008-impl, branch fx008-impl,
from 8fe4218. Sonnet implementer (58c3d61; fix round 71d6263), Opus task
review and scoped re-review (review-fx008-task1-result.md): Spec ✅,
Quality Approved.

test/fx008-probes/ holds 104 programs: 102 review probes, deduplicated,
plus the witnesses ec1 and tp1. The table pins each probe's outcome today:
- for accepted probes, a SHA-256 of the emitted Go, stdout, stderr and
  status (57 accepted, 4 of them defect reports);
- for rejected probes, code, message and span (47 rejected).

It also records each probe's FX008 outcome. 17 entries flip, each with a
task, a reason and an exact outcome or a pattern with report-before-pin.
14 slow probes run in child processes with a 20 s timeout. A tamper hash
covers the table, and invariant tests check flips; a flipped accepted
entry must pin its Go hash.

Rulings:
- facts/lexical prints `2` before its abort: the plan's "empty stdout"
  was a transcription error, corrected.
- design-review/r5.wxw is byte-identical to n1.wxw, because the original
  was overwritten before it was copied. It flips with n1 in Task 5.

The reviewer re-ran all 104 probes independently (0 mismatches), checked
the timeout path (fails at 20,006 ms, no orphan process) and nine
mutation kinds, each caught. Verify at 71d6263
(.build/task1-fix-verify.log in the worktree): exit 0, 1065/1065
parallel, 29/29 serial, 36 regression proofs. Stopped before Task 2, as
authorized.

### FX008 Task 2: mark representation (2026-10-10)

Sonnet implementer (66e4f5d; fix rounds c6af69f and 5ed5b0e). Opus task
review and re-review (review-fx008-task2-result.md): Spec ✅, Quality
Approved after the fixes. The second fix round (a test bound and plan
text) was checked by the controller.

What it adds:
- a `Mark` on every `Label`;
- `HandlerRows` on `THandler`;
- Domain.Type.Marks (`mapMarks`, `stripMarks`, `markVariables`);
- Features.Check.Strip, which applies before `instantiationRule`.

Behaviour is preserved: the gate is green, and the Go text and
bootstrap snapshots are unchanged.

Review C1 (Critical): two handler rows doubled at every nested handler
type. Depth 22 ran out of memory, where base accepts to 124.
Ruling: `clauses ∷ Maybe Row`, where `Nothing` means the same as R.
Passes visit C only when it is `Just`. Plan P2, P4 and the interfaces of
Tasks 2, 4, 7 and 8 are updated. Timings now match base to depth 124,
with identical Go.

Guards:
- depth 40 is accepted (parallel);
- depth 40 and depth 120 each compile within 2,000 ms after a warm-up
  (serial). This replaced a 48.9 ms bound that the reviewer measured
  failing under load; the generous bound is justified by the exponential
  gap.

The strip test now covers bodies, operations and constructor fields,
with four mutants caught. Plan updates for later tasks: Task 3's
`localMarks` gives a `Just` C only to handler types that are not nested
in a handler row, with a guard. Task 7 gets a 30-literal guard and a note
on unequal derived Eq.

Verify at 5ed5b0e (.build/task2-fix2-verify.log in the worktree): exit
0, 1070/1070 parallel, 31/31 serial, 36 proofs. New BACKLOG G004
(pre-existing): a depth-125 handler type ends in a RangeError instead of
E_NESTING.

### FX008 Task 3: `nofail` syntax, resolution and printing (2026-10-10)

Sonnet implementer (f16c6b5; fix rounds 1f9f257 and e0580a4). Opus task
review and re-review (review-fx008-task3-result.md): Spec ✅, Quality
Approved. The second fix round was checked by the controller.

What it adds:
- `nofail` and `nofail(k)` parsing, contextual through a one-token
  lookahead;
- resolution of mark variables: their own namespace; L6 refusal in type
  and effect declarations; scope checks in lambdas, handler literals and
  `fail` clauses;
- `instantiateMarks` and `localMarks`: nested handler types keep no clause
  row (the c1 rule, with a nesting guard);
- printing: `nofail L`; once one arrow of a spine prints its row, every
  arrow does;
- the approved P10 texts; the oracle ignores marks.

The reviewer compared whole-compile outcomes between base and candidate
on 3,371 harvested sources plus 23,029 mutated ones: 0 differences for
programs without `nofail`. 45 adversarial grammar programs confirm
`nofail` stays an ordinary name elsewhere.

Rulings:
- M2: every arrow prints its row once one does.
- M4 and N1: a mark variable written only on Console is not collected
  into a signature, but it is still refused and scope-checked like any
  label.

New BACKLOG E012 (pre-existing): closed and ambient rows print alike.
Verify at e0580a4 (.build/task3-fix2-verify.log in the worktree): exit
0, 1105/1105 parallel, 33/33 serial, 36 proofs; gate 107/107.

User decision 2026-10-10 (FX008 Task 4): mismatch texts are symmetric.
When either side of an E_TYPE mismatch shows a handler clause row or an
arrow row, both sides show theirs. An empty handler row prints `with
pure`, and ambient tails stay omitted. This amends the approved P3
callback text to `Expected Unit -> Unit with nofail Log, found Unit ->
Unit with Log`.

### FX008 Task 4: directional consumption, copies, mark equality (2026-10-10)

Sonnet implementer (3b0dd3e; fix rounds aa8db84, a43f56c, 84b684e). Opus
task review and re-review (review-fx008-task4-result.md): Spec ✅,
Quality Approved. Rounds 2 and 3 were checked by the controller.

What it adds:
- `RowMode`: equal, ignore marks, or directional;
- MarkStore, with bindings, edges and its own meta counter;
- RowFinish (split out of UnifyRow) and UnifyMark;
- the directional mark relations: frame ⊑ assumption, a fresh t ⊑ s on
  target extension, and frame ⊑ copy on stage-tail binding, with no
  copies on throwaway tails (`consumeLabels`);
- mark equality in types (P3), and opening of handler types at function
  use only (P5).

Review fixes:
- I1: when neither handler type has a separate clause row, their rows are
  compared with marks. Without this, signature handler types never
  compared clause-row marks, a soundness hole.
- m1: a separate mark-meta counter.
- The property test's strength was restored.
- The user's symmetric mismatch texts (see the decision above).

Evidence:
- `scripts/differential.mjs --corpus all` against e0580a4: 0 differences
  in every phase (3,421 harvested, plus fuzz, isName, matches and
  mutations).
- The reviewer's whole-compile comparison: 0 differences for programs
  without `nofail`.
- Verify at 84b684e (.build/task4-fix3-verify.log in the worktree): exit
  0, 1126/1126 parallel, 33/33 serial, 36 proofs; gate 107/107, no
  change.

User decisions 2026-10-10 (FX008 Task 5 probe gate):
- design-review/r4 is a permitted fourth flip. It is rejected today and
  stays rejected; its message moves to the side-condition text at the
  `defer` span, the same cycle as n1. The plan had wrongly predicted it
  unchanged.
- The observed texts for dup, n1, r5 and r4 are pinned exactly.

### FX008 Task 5: the settling loop over deferred rows (2026-10-10)

Sonnet implementer (d9a0576; fix round dd45b58; comment b5fab7c). Opus
task review and re-review (review-fx008-task5-result.md): Spec ✅,
Quality Approved.

The corrected §3.5 loop (Features.Check.Settle, Feed, FeedOrder, Cycle):
- `settleKeys` runs inside each round;
- the feed graph links each row's own tail to its target's tail;
- an iterative Tarjan pass and Kahn order the rows by SCC and source
  position (P14);
- a Bellman-Ford search per key reports a positive cycle as the existing
  side-condition error;
- the exit test counts label changes from any binding, with an idle round
  (controller ruling);
- leftover pairs go to `settleFinal`, and the defer judgement runs after
  the loop.

Probe gate, with the user's decisions: dup, n1 and r5 flip as planned,
and design-review/r4 (wrongly predicted unchanged) is a fourth flip. All
four texts are pinned exactly. The differential against 84b684e shows
only those programs differ. A 60,000-graph brute-force check confirms
cycle detection.

The review found the settle order quadratic: an eager `maybe` fallback
took 8,000 defers to 6.4 s against base's 0.8 s. It is fixed with
`maybe'`. Now linear, at about 1.3x base. Guards:
- a serial test: 16,000 defers within 8,000 ms after a warm-up, measured
  2.1 s idle and 4.3 s under full load;
- regression row fx008-settle-order-linear, plus fx008-cycle-presence.

Recorded:
- BACKLOG T008: the feed graph is over rows, so rows sharing a tail give
  N² edges; base is already quadratic there.
- An allowed text move: a program with a late `Fail` in a defer plus n1's
  cycle now reports the cycle.

Verify at dd45b58 (.build/task5-fix-verify.log in the worktree): exit 0,
1142/1142 parallel, 34/34 serial, 38 proofs; gate 107/107.

2026-10-10, at the user's request:
- fx008-impl (b5fab7c, Tasks 1-5) is pushed to origin as a backup and is
  not merged.
- main is fast-forwarded to fx008 (4f1b981) and pushed: FX001 Task 10,
  FX009, and the design and review docs. The verify of the last
  code-bearing commit passed: 958/958 parallel, 29/29 serial, 36 proofs.
- The FX008 implementation stays off main until it is complete and
  reviewed.

### FX008 Task 6: tail watches and the restricted registry (2026-10-11)

Sonnet implementer (01cbe77 refactor, 418cd38; fix round c8503f9). Opus
review (review-fx008-task6-result.md): Spec ✅, Quality Needs fixes; the
fix round was checked by the controller.

What it adds, with no behaviour change:
- Handle.purs: `handleFailure` and `failureClause` moved out of
  Handler.purs (241 → 184 lines);
- TailWatch/Watch: watched and dirty tail metas on Subst; binding or
  extending a watched tail marks it dirty and moves the watch; a
  postponed pair reverts it with its substitution;
- Restricted: the clause, group and installation registry, on the
  checker State; SettleEntry: Settle builds its entries through `entries`
  (deferrals only until Task 7 registers clauses); Site.purs split out.

Review fixes: I1, the revert test could not fail (a mutant keeping the
progressed watch passed); it now watches both tails and fails on that
mutant. M1 `compose` keeps the later watch. M2/M3 comment the invariants
Task 7 relies on. The reviewer killed the other three mutants (one per
test).

Evidence:
- differential against b5fab7c (at 418cd38): 0 differences in every
  corpus and phase (3,421 harvested, fuzz, isName, matches, mutations);
- gate 107/107, no table change;
- verify at c8503f9 (.build/task6-fix-verify.log in the worktree): exit
  0, 1146/1146 parallel, 34/34 serial, 38 proofs.

### FX008 Task 7: clause own rows, sync, correction S, tail pass (2026-10-11)

Sonnet implementer (wip 8dd22be; 9358d79; fix rounds 95eac9e, 66f1eca).
Opus design pre-review (review-fx008-task7-design-result.md, A1-A7, two
Critical design defects fixed before code), gate diagnosis
(review-fx008-task7-gate-diagnosis.md), code review and re-review
(review-fx008-task7-result.md); round 2 checked by the controller.

User decisions 2026-10-11:
- argbind-internal flips to accepted (sound: Go and interpreter print
  nothing, exit 0). FX010 is not fixed; a smaller reproducer remains.
- p5, r1, r2 pinned as predicted; cyc2/cyc3 texts swapped (orientation
  only); sh1 text unchanged at span 192-246 (handler literal, P13).
- ec1 keeps today's outcome (the plan's prediction was wrong: checkDefer
  consumes the deferred row at check time); witness ec2 added and proves
  fx008-exit-count.
- C keeps no label arguments (option (a)), fixing a 2^depth blow-up for
  handler literals whose clauses carry other literals' types (depth 14:
  1.8 s → 29 ms; depth 30: 71 ms; base linear). C rows pair by key with
  an argument-ignoring unifier; R checks arguments.

Controller ruling: F1′ also runs at the start of each settling round
(a plan gap, not a workaround), skipping the rigid branch (the tail
pass binds ϱ after the loop), reporting at the handler literal.

Evidence:
- gate 110 probes (ec2, famw, famw2 added); flips gain1,
  argbind-internal, p5, r1, r2, tp1; cyc2/cyc3/sh1 re-pinned;
- differential vs c8503f9: only those programs differ; vs 95eac9e: only
  famw/famw2 (the round-1 regression, fixed);
- 11 Task 7 regression rows, each proved;
- verify at 66f1eca (.build/task7-fix2-verify.log in the worktree): exit
  0, 1176/1176 parallel, 36/36 serial, 49 proof lines.

Open: no probe distinguishes F1′'s join-group from a new group (cost
only); Task 8 must build `env.current` labels from R and pair C by key.

## INF001 requirements recorded (2026-10-11)

User requested a project milestone for automatic requirement inference,
then explicitly required error composition during service assembly and
business logic. Recorded A1-A10, design alternatives, current named-function
inference gap, generic error-family questions, FX008 compatibility and
completion evidence in
[the milestone](plans/2026-10-11-requirement-and-error-inference-milestone.md).
Status: requirements defined; language design and implementation plan remain.
No compiler changes; active FX008 delivery is unchanged.

Documentation checks: A1-A10 present, tracking links resolve, and
`git diff --check` passed. Fresh `npm run verify` exited 1:
958/958 parallel tests and 28/29 serial tests passed; partialFirst at
20,000 parameters took 973.142 ms against its 930 ms bound (T007).
Build, strict rebuild proof and structural gates passed. Regression proofs
were not reached. No retry or assertion change. Evidence:
`.build/inf001-definition-verify.log`. This run verifies no INF001 behavior.

### FX008 Task 8: installations with frame marks (2026-10-11)

Sonnet implementer (b30b8b8; fix round ff0c6d1). Opus review
(review-fx008-task8-result.md): Spec ✅ given the deviation, Quality
Needs fixes; the fix round was checked by the controller.

What it adds, with no probe change: each `with` registers an
installation with a frame mark (`NoFail` for Console, else a fresh mark
meta); settling pairs the handler's clause row C with the installing row
by key and position (`Lend.assume`), taking arguments from R, and records
the frame ⊑ C edges; the tail pass gains an installation rule (a guard,
unreachable while R ≡ current).

Deviation, accepted by the controller: `install` does not consume C, as
the plan said; consumption renamed row tails (442-449 check-phase IR
differences, nothing later). The reviewer swapped the plan's consumption
back in and found identical mark-edge sets over 3,151 sources (570 with
installations), with the fallback never taken. The plan now describes
`assume`.

Review fixes: I1, 1,000 installations went from 3.97 s (base) to 11.6 s;
now 5.2-6.3 s (eager `where` bindings recomputed pairing every round);
serial guard 9.5 s. I2, edge endpoints and direction asserted (a
reversed-edge mutant fails 2 of 6), plus a nested duplicate-key case.

Evidence: gate 110/110, no change; differential 0 differences against
66f1eca and b30b8b8; verify at ff0c6d1 (.build/task8-fix-verify.log in
the worktree): exit 0, 1182/1182 parallel, 37/37 serial, 49 proof lines.

### FX008 Task 9: the mark check makes defer sound (2026-10-11/12)

Sonnet implementer (1649218; fix rounds 360f13e, 889ca99). Opus review
and re-review (review-fx008-task9-result.md); round 2 checked by the
controller.

What it adds: after settling, `markConstraints` records frame, own-abort
and defer-demand edges; `violation` searches paths from Plain and the
declaration's mark variables to a fail-free atom (P7), and
`reportViolation` chooses the headline by the last edge (P6), with the
approved P10 texts. The pinned FX008 program is rejected with `defer must
not fail, but it performs Log, whose handler may fail`. Exactly the 8
listed probes flipped (lexical, hole, c1, cross, pending, l4b, merge2,
q1). The fx-cleanup program and the generator were migrated (§6).

Review findings and user decisions:
- C1 (Critical): copying C at install closed tails later bound to a real
  C; six accepted programs ended a cleanup in a typed abort at run time
  (Go `fail(E): E`; interpreter "typed abort escaped cleanup"). User
  decision: a function result's handler type gets its own C at each use,
  keeping R's tail only when that variable occurs in a parameter or the
  own row. New limitation (plan, beside L1, L4, P5): a handler passed
  through a generic function and installed from its result gives an M
  frame when the context's rest is M or rigid.
- C2 (Critical, from that rule): closing C broke §6 (r1, r2, r9, no
  defer, rejected). User decision 2026-10-12: a fresh tail meta instead.
- I1: 1,000 installations take 7.3 s (2,000: 33 s), quadratic, from
  T008; Task 8's 9.5 s guard failed at 10.15-10.35 s under load in the
  reviewer's run. User decision: fix T008 before the whole-branch review.

Evidence:
- 17 adversarial counter-examples and controls (a, b, c, d sets) run
  against Go and the reference interpreter: every accepted program agrees;
  every unsound one is rejected;
- 15 regression rows for Task 9, each proved;
- scale: 8,000 defers 1.0 s, 1,000 installations 7.3-7.5 s, a chain of
  1,000 forwarding installations 0.31 s, 200 mark variables 3 ms;
- verify at 889ca99 (.build/task9-fix2-verify.log in the worktree): exit
  0, 1221/1221 parallel, 41/41 serial.

### FX008 Task 10: notes for mark rejections (2026-10-12)

Sonnet implementer (d85a791; fix round 52b9df8). Opus review
(review-fx008-task10-result.md): Approved, 4 Minor; the fix round was
checked by the controller.

Mark rejections now carry the approved P10 notes, from the demand back
to the source: `<L> is handled here`, `this handler's clauses perform
<L>, whose handler may fail`, `this handler's clauses may perform any
effect of <r>`, `its clause for <op> fails with <E>` / `may perform any
effect of <r>`, `the signature of <f> allows a failing <L> handler;
write with nofail <L>`, and `nofail(<k>) <L> is fail-free only when the
caller's handler is`. Every plan assertion matched on the first run,
including merge2. A 1,000-hop path keeps its first three notes and its
source within maxCharacters. Implementation decision: a path starting at
Plain through a DeferDemand edge also gives the signature note (P1).

Evidence: 12 assertions seen failing first; differential against 889ca99:
23 differences, all notes only (code, message, span unchanged); verify
at 52b9df8 (.build/task10-fix-verify.log in the worktree): exit 0,
1226/1226 parallel, 41/41 serial.

### FX008 Task 11: failing random clauses and the soundness differential (2026-10-12)

Sonnet implementer (2ef711b; fix round 0a571d4). Opus review
(review-fx008-task11-result.md): changes required; the fix round was
checked by the controller. Test-side only; no compiler change.

The generator now produces failing handler clauses in the default corpus
(178 per 500 programs; 116 without the dedicated fragment), lifting FX001
Task 10's fail-free restriction. The one-way soundness differential
(test/fx008-soundness.serial.test.mjs, 300 programs whose cleanup ignores
which handlers may fail) requires every escape the reference interpreter
witnesses to be rejected with an FX008 headline, and every accepted
program to agree with the interpreter and Go.

The review found the first version's evidence covered one shape (73 of 77
escapes lexical) and that random failing clauses never ran. After the
fix, escapes by shape at the default seed, all rejected: lexical 24,
forwarding 24, callee under a caller's handler (plain 9, nofail 9),
handler value passed 12, returned 10, ambient callback 14, random clause
18. Sensitivity: Task 8's compiler (ff0c6d1, no mark check) accepts 110 of
the 120. Ten seeds: no accepted escape, no Go/interpreter disagreement.

Evidence: serial run 15.5 s; verify at 0a571d4
(.build/task11-fix-verify.log in the worktree): exit 0, 1226/1226
parallel, 47/47 serial. Gap for the whole-branch review: the generator
has no `nofail(k)` mark-variable shape.

### FX008 Task 12: spec, CF001 and FX001 plan amendments (2026-10-12)

Sonnet implementer (9a62014), docs only; checked by the controller (the
P10 headlines and notes appear in the spec; CF001 changed only §5 R0,
§8A.6 and §8A.8). The effects spec now carries the FX008 rule, the
`nofail` and `nofail(k)` syntax, the approved texts, and the rulings made
during implementation (C carries no label arguments; F1′ in settling;
installation by `assume`; a result handler type's own C; opening only at
function signatures). Limitations are BACKLOG FX013-FX016. Verify at
9a62014: exit 0, 1226/1226, 47/47; 64 regression proofs, 28 of them FX008.

FX008 Tasks 1-12 are complete. Before merging: T008 (user decision) and
the whole-branch review.

### T008: linear settling for shared tails (2026-10-12)

Sonnet implementer (33f9854; fix round e54d869), Opus review
(review-t008-result.md): approved with fixes, checked by the controller.
Profiling showed the quadratic cost was not the feed graph: each settling
consumption added a label-free alias hop to one shared row, and every
walk crossed the whole chain. Features.Check.Aliases keeps classes of such
hops and jumps to their end. 1,000 installations in one declaration: 7.9 s
→ 0.5 s; 2,000: 35 s → 1.0 s; other scale cases unchanged. Differential
against 9a62014: 0 differences in every phase. Guards: a 2,000/1,000
ratio test, two regression rows, and a property test comparing jumps with
a naive walk (~500k checks). Verify at e54d869
(.build/t008-fix-verify.log in the worktree): exit 0.

INF001 main-integration review (2026-10-11): independent requirements and
adversarial reviews approved the brief, with no blocking findings. Minor
M1 addressed by individually named B1-B8 observations and a handler-site
failure witness; scoped adversarial follow-up approved. Reports, process
audit and dispositions: `docs/sdd/2026-10-11-inference-milestone/`.
Fresh isolated full verify exited 1: 957/958 parallel tests; unchanged
10,000-type inhabitation chain 7.196051 s against 5 s (T004), no retry.
Unreached serial phase run separately: 29/29 passed. Compiler inputs are
identical to main baseline d35edf2. The prior T007 failure remains recorded.
This records a reviewed requirements brief, not an approved language design.

User clarified that shipping documentation does not require compiler tests.
Stopped the isolated regression run; partial proof output is not a full
result. Documentation release checks and both reviews are complete; no
compiler tests are a gate for this brief. All observed failures remain
recorded. No other agent's checkout or processes were changed.

INF001 requirements and reviews integrated into local main at da1b4d0
with an atomic expected-reference guard. Shared checkout HEAD, index and
working status unchanged; other agent's implementation worktree untouched.
No remote push. Integration receipt: INF001 review ledger.

### FX001 Task 11: acceptance scenario and scale (2026-10-12)

Sonnet implementer (3b51d21). Scenario examples/services.wxw: Database,
Clock and Log, five service functions with only their own labels, cleanup
by `defer` with `nofail Log` along the chain, real and stateless fake
handlers built inline in `main` and selected there. Snapshot
bootstrap/services.go (byte-compared; other snapshots unchanged). Real and
fake outputs asserted. The scenario has no `Fail` (docs/findings.md, "FX001
Task 11: callback rows"). Keys (F6): scenario 9 = 0 type + 6 function + 3
effect (Log, Database, Clock); the baseline has the same 6 function keys;
the extras are exactly the three effect keys.

Dropped Clock handler: E_EFFECT `Unhandled Clock in main` at `report(1,
2)`; notes `audited(first)` "through report", `stamp(id)` "through
audited", `now()` "Clock is performed here", `main` "main may perform only
Console"; as spec section 6, within 2,000 characters.

Timings (serial; whole-process wall time after a warm-up run; five runs,
load averages 1.54-1.59; bound 3x median):

| Workload | Median ms (min-max) | Bound |
|---|---|---|
| 10^6 shallow installs | 131 (128-134) | 393 |
| 10^6 operations, context 100 deep | 141 (137-144) | 423 |
| one fail across 1,000 handle frames | 46 (45-47) | 138 |
| 100,000 caught failures | 38 (35-39) | 114 |
| go build of the scenario | 135 (134-142) | 405 |

Installation and lookup are about 10^6-deep non-tail recursion in the
emitted Go; the review measured about 40 ms without operations against
about 135 ms with them, so recursion does not dominate. The unwinding and
caught-failure figures are close to the roughly 30 ms process start and
resolve little. The go build bound assumes the warm `.build/go-cache` that
verify provides. Under verify (load 4.9) the build took 292 ms.

FX005 observation against Task 1's hand-written Go (loops, not process
time): installs 18.3 ms, lookup at depth 100 79.8 ms, 1,000-frame abort
34.9 ms, 100,000 caught aborts 19.9 ms. Waxwing's installs cost about 5x
and lookup about 1.4x (net of start), the others are within noise of start.
Shapes differ, so these are upper bounds, not a like-for-like comparison.

1,000-label row (CLI): `emit` compiles; rejecting a call of it prints 498
characters (`Unhandled E1 in main`); a side-condition rejection of rows of
999 and 1,000 labels prints 451 (limit 2,000).

`rm -rf output && npm run verify` (.build/task11-verify.log in the
worktree): the first run failed one parallel test, specialize.test.mjs
(it assumes examples are identity-specialized; services.wxw declares
effects), fixed by excluding it; the rerun exit 0, 1252/1252, serial and
regression proofs passed.

### FX001 Task 12: regression proofs and documentation (2026-10-12)

Part A (Sonnet implementer, ab456fa `test: FX001 regression proofs`,
reviewed): fifteen new regression rows, each restoring one defect in an
isolated copy, with probes that pass on the healthy compiler and fail on the
mutant with a named message. Checker and diagnostics rows
(scripts/regression-fx.mjs, probes in test/regression-fx.mjs):
`fx-side-condition` (the probe compiles in a child process under its own
20 s timeout and reports the timeout as the defect, so the runner's 180 s
timeout never fires), `fx-defer-fail`, `fx-defer-rigid`, `fx-defer-unified`,
`fx-closed-opened`, `fx-layout-edges`, `fx-provenance`, `fx-abbreviation`.
Emitted-Go rows (scripts/regression-fx-go.mjs, probes in
test/regression-fx-go.mjs): `fx-clause-context`, `fx-abort-target`,
`fx-clause-order` (Task 7 Critical), `fx-cleanup-context`,
`fx-cleanup-cause`, `fx-cleanup-defect`, `fx-ctx-reachable`. `ctx` for
effect-free programs is the existing row `effect-free-ctx` (Task 7), not
duplicated. test/regression.mjs is untouched; test/regression-probes.mjs
and scripts/regression.mjs gained an import and a spread. The mutant
re-targeting notes (no single-line restoration for `fx-cleanup-context`;
`fx-ctx-reachable` is an entry-body-only stand-in) are in docs/findings.md.

Verify after part A (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`,
.build/task12a-verify.log in the worktree): exit 0, 81 regression proofs in
all, each new one printing `fixed compiler passes; restored defect fails.`
No bound raised, no rerun.

Part B (documentation only, no code): ADR 010 (docs/adr/010-effects.md:
row erasure revising direction decision 1; runtime keys; first clause
innermost; `ctx` mode over the emitted IR; the 10,000-key count of keys with
type arguments only, ruling F5; the strict `defer` rule, its accepted costs
(FX007) and FX008's mark refinement with the limitations L1 with P5, L4, L6
and the handler-through-a-generic-function case; report conventions; the
empty `Handler(Console)`/`Handler(Fail(E))` structs, ruling F3; Task 11's
key-count and timing evidence); the language Effects section
(docs/language.md, with the documented limits and E_EFFECT/E_HANDLER added
to the code list); docs/architecture.md (the FX001 modules); docs/
engineering.md (the fifteen rows and the Task 11 timing convention, a
review convention: median of five, bound 3x); docs/findings.md; BACKLOG
(FX001 Done pending whole-branch review; FX008 corrected to merged; new
FX002, FX003, FX005; FX006, FX007, CF001, D001, R001, STD001, PKG001, I001
and FN006 updated; FN006 (1) only half closed); and docs/next-session.md.
FX001 Tasks 1-12 are complete on branch fx001-finish, pending the
whole-branch review, then the user's merge decision.

Final whole-branch review (2026-10-12) and fix wave (docs and test regexes
only, no compiler change): the review found the callback-row limit
untracked (FX017: probes reproduced, workaround in docs/language.md
Limits), eight documentation corrections in ADR 010, language.md,
findings and BACKLOG, and seven row `message` regexes that matched only a
prefix; they now match the observed detection and each of the seven rows
prints `fixed compiler passes; restored defect fails.` T003 and FX001 gained
notes (timing retune, timeout in `timedRun`, typed-failure scenario),
recorded only. Verify: `rm -rf output &&
GOTOOLCHAIN=go1.26.4 npm run verify` exit 0 (.build/final-fix-verify.log),
81 regression proofs, no bound raised, no rerun.

### FX017: callback-row diagnostic (2026-10-12)

Branch fx017 (from 3ff0538, the approved text). A function value applied
inside a function whose signature row has a label the value's row lacks
(`fn a(q: Int -> Int with L, x: Int): Int with L + M = q(x)`) was reported
as `a performs M, which its signature does not allow`, contradicting the
signature. It is now E_EFFECT at the call with the approved text: `q must
allow every effect of a (L + M), but its row is L` (`but its row has no
labels` for an unannotated arrow, `this function value` for a callee that
is not a named parameter), the hint `write q's row as `with L + M`; a
callback's row must equal its caller's (FX017)` after `; `, and notes
`q's row is written here` and `a's row is written here`.

Classification (Features.Check.Callback): the unifier pairs the callee's
labels first, so `RowMissing` is the callee performing what the caller
lacks (unchanged: probes p5, p6) and `RowExtra`, now carrying the row it was
left over against, is a caller label the callee lacks. The new text needs
that, an `Application` origin that crossed no boundary (installation and
`defer` set `via`), and a current row that is the signature's alone (one
site): inside a `with` or `handle` a callee's label can pair with an
installed duplicate, and the old text stays. Accepted and rejected programs
are unchanged (differential: only the new-text programs differ). Recorded
limits: a `let`-bound or lambda-bound callee is `this function value` (the
resolved syntax keeps no local's name); an unannotated arrow's note points
at the parameter's name (no type span is kept) and reads `q's row is not
written`; a call inside a `with` or
`handle`, and a callback passed as an argument, kept their old text until
FX018; the hint writes the caller's row as written, so a named tail stays
(p3: `with M + L + ...e`) and the ambient tail is omitted, while the
headline prints labels only. When a caller label's payload holds an arrow,
handler or row-applied type, the printer drops its rows, so the hint takes
the anonymous text instead of a row that would fail differently when
written. Only a parameter whose type is one arrow (its result is no arrow)
is named; later stages and two-stage types are anonymous (their `with`
belongs to the last arrow, so the hint would loop), and a leftover from a
row nested in a label payload keeps the old text. Tests:
test/fx017-callback-row.test.mjs (16); regression row `fx-callback-row`.
Subsumption of the callback's row stays with FX007.

Verify: `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` exit 0
(.build/fx017-verify.log): 1264/1264 parallel, 53/53 serial, 82 regression
proofs. Differential against a build of 3ff0538 (.build/fx017-differential.log,
exit 1 by design): 8 differences in 3,841 harvested sources, all the new
FX017 probes; 0 in 1,029 fuzz, 1,085 `isName`, 1,000 matches and 1,000
mutations sources. No bound raised, no rerun hiding a failure (the first
verify attempts failed on an 80-column comment and a regression needle
that the new `RowExtra` layout broke; both fixed, then one clean run).

### FX018: callback-row diagnostics in with/handle and argument passing (2026-10-13)

Branch fx018 (from 0a23784, wording chosen in BACKLOG FX018). Diagnostic
only: the accepted and rejected programs and the Go output are unchanged.

(a) A callback-row mismatch directly in a function's body but under `with`
or `handle` (`Features.Check.Callback`; FX017 had excluded it): `q must
allow every effect at this call (M + L + M), but its row is L; write q's row
as `with M + L + M`; a callback's row must equal the row where it is called
(FX018)`. The row at the call is the installed labels, innermost first, then
the signature's; the notes are the callee's, `M is handled here` at each
installing `with`/`handle`, and the caller's. The two corpus programs where
a callee label pairs with an installed duplicate (`around`) get this text
and it is true there: the hint (`with Log + Log + ...e`) compiles. The
FX008 probe table pins these two (rev6/around3 and rev6/around6): their
expected text, around3's notes and the table hash changed with this task, for
the reviewer's diff of test/fx008-probe-table-rev6.mjs. Inside a
lambda body there is no signature site and the old text stays.

(b) A function passed where the parameter's row has a label the function's
row lacks (`Features.Check.ArgumentRow`, from `Argument.refused`): `q must
allow every effect of take's parameter f (L + M), but its row is L; ...
(FX018)` with the callee's note and `f's row is written here`. Only the
top-level arrow row of the argument against the parameter's counts: the two
rows are unified on their own and must fail for a label the argument lacks.
The other direction (b3), a nested row, and applications of function values
keep the old text. A constructor field has no parameter name (`of the
parameter it is passed to`).

FX017's rules carry over (named only for single-stage parameters; payload
rows holding a row give the anonymous hint; named tails kept). One new
rule: the `write …` hint of (b) is printed only if a simulation of the
rewritten argument, unifying it with the parameter and consuming the
callee's row, succeeds. A sweep of 616 generated programs found cases where
the parameter's row is not enough (a caller wider than the callee, since the
callee's ambient tail is shared with the argument's; a constructor's closed
row); those keep the headline with the anonymous hint. The hint's tail is
the row at the call's named tail, which the callee's own row ends in. After
that change no printed hint failed on the sweep, and each tested hint is
shown to compile when applied. Tests: test/fx018-callback-row.test.mjs,
test/fx018-argument-row.test.mjs; regression rows `fx-callback-install` and
`fx-callback-argument` (and `fx-callback-row`, whose needle moved).

Verify: `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` exit 0
(.build/fx018-verify.log): 1291/1291 parallel, 53/53 serial, 84 regression
proofs. Differential against a build of 0a23784 (.build/fx018-differential.log,
exit 1 by design): 312 differences in 4,492 harvested sources and 5 in
1,000 mutations sources, every one a previously rejected program whose
message is now an FX018 (or FX017) text, none an acceptance or Go change; 0
in fuzz, `isName` and matches. The first verify attempts failed on the
style gate (a `case` on `Either`) and on the two FX008 probes above.

FX018 review fix (2026-10-13): an (a) or FX017 `write …` hint is printed only
for a callback read once in the function (`Features.Check.LocalUses`); with a
call outside and one inside a `with`, no one row serves both. The effect
error's subject for a function value is a named constant (`thisFunction`),
not a copy of the text. Verify exit 0 (.build/fx018-fix-verify.log):
1298/1298 parallel, 53/53 serial, 84 proofs; differential (against 0a23784):
421 harvested and 2 mutations differences, every one rejected by both
compilers with an FX017/FX018 text.

## Services example injects implementations (2026-10-13)

Principle (user): never choose an implementation with a control-flow
artifact; construct each as a value and inject it at the composition root.
examples/services.wxw now has `liveDatabase`, `systemClock` and
`consoleLogger` constructors and a `main` that installs them with `with`;
no `live` flag, no `if`. The tests build `fakeDatabase`, `fixedClock` and
`silentLogger` and their own `main` (test/fx-services-programs.mjs); the
effect-free baseline takes lambdas from named constructors. Outputs are
unchanged (live and fake). The dropped-handler diagnostic is unchanged in
text: `Unhandled Clock in main` with the through, origin and boundary notes
(drop `with systemClock()`). Key breakdown: before 9 keys (0 type, 6
function, 3 effect; baseline 6), after 12 (0 type, 9 function, 3 effect;
baseline 9). bootstrap/services.go regenerated; the other snapshots are
byte-identical. Mark sharing moved to test/fx-services-marks.test.mjs (an
`if` between two Log handlers reached by a `nofail Log` cleanup: accepted
when both are fail-free, `Expected nofail Log, found Log` when one may
fail). An entry function taking the handlers as parameters could not be
written: BACKLOG FX019 (the logger needs the named tail
`Handler(nofail Log with Console + ...e)`). No compiler change.

Verify (services-di, 2026-10-13): `rm -rf output && GOTOOLCHAIN=go1.26.4
npm run verify` exit 0 (.build/services-di-verify.log): 1301/1301 parallel,
53/53 serial, 84 regression proofs. A first run at load average about 25
failed two serial timing tests (`a 5,000-parameter function type through
generics builds in 10 s`, `20,000 let items compile in linear time`) and the
rerun at lower load passed; the failure is recorded in the BACKLOG T007 row.

## Text v1 (D001, first tranche) done on branch `text` (2026-10-13)

Plan docs/plans/2026-10-13-text-plan.md, Tasks 1-9, on branch `text` rebased
onto main 0b1f850; spec docs/plans/2026-10-13-text-design.md, ADR 011
(docs/adr/011-text.md). Not merged; the whole-branch review is next.

Delivered:
- `Text`, a reserved ground type lowered to a Go `string`, with ordinary,
  raw (`#"…"#`) and `"""` block literals, `${}` interpolation (left to
  right, nesting), `++`, comparison by code point, canonical quoting of Text
  nested in data, and the built-in `show`.
- Source read as UTF-8 with a fatal decoder; the first invalid byte is a
  diagnostic (`ReadFailure`). Non-ASCII outside a literal stays E_LEX, with a
  whole-code-point span.
- Splits made for room before adding: Domain.Type.Core, Domain.Syntax.Core,
  Format.Parse.Steps, Format.Lex.{Origin,Escape,Chars}.
- Reference model: independent decoder, quoter and code-point comparison;
  the effects oracle and FX generator gained Text. Differential 0
  disagreements on every seed tried.

Task 9 (regression proofs, scale, example, docs):
- Seven isolated-copy rows (scripts/regression-text.mjs, probes in
  test/regression-text.mjs), each printing "fixed compiler passes; restored
  defect fails": `text-order`, `text-nested-raw`, `text-indent-count`,
  `text-dollar`, `text-hash-mismatch`, `text-surrogate`, `text-utf16-order`.
  Go compares strings bytewise, which on valid UTF-8 is code-point order,
  and no Go helper compares Text, so the "native UTF-16 comparison" mutant
  replaces the field comparison in Format.Go.Compare with a UTF-16 unit
  comparison. The runner's replace now takes a function, because a `$'` in
  a replacement is a replace pattern (the `text-dollar` mutant has one).
- Scale (test/text-scale.serial.test.mjs, serial phase): a 1 MB literal,
  10,000 interpolation parts and a literal of 100,000 escapes compile and
  run with the right output; emission is deterministic (two emits equal).
  Bound = 3x the median of five runs on this host (macOS, Node 26.6.0, Go
  1.26.4), compile in-process and `go build` alone. Method (fix round 1,
  docs/engineering.md): one warm-up `go build` of a trivial program, then
  each measured build is the minimum of three; the first version timed a
  single build, which at about 130 ms (Go's fixed startup and link cost) is
  as large as the 1 MB and 100,000-escape bounds. Five serial runs under
  the new method, 1-, 5- and 15-minute load averages before each run: 2.88
  3.16 3.86; 2.82 3.14 3.84; 2.78 3.12 3.83; 2.65 3.08 3.81; 2.76 3.10
  3.81. Single-build medians of the first method (ms): 1 MB 141 compile and
  146 build, 10,000 parts 521 and 709, 100,000 escapes 142 and 130. Under
  the new method:

  | Case | Phase | Median ms | Min | Max | Bound ms |
  |---|---|---|---|---|---|
  | 1 MB literal | compile | 142 | 139 | 151 | 423 |
  | 1 MB literal | go build (min of 3) | 151 | 146 | 153 | 438 |
  | 10,000 parts | compile | 531 | 515 | 536 | 1563 |
  | 10,000 parts | go build (min of 3) | 719 | 717 | 724 | 2127 |
  | 100,000 escapes | compile | 148 | 138 | 153 | 426 |
  | 100,000 escapes | go build (min of 3) | 133 | 131 | 137 | 390 |

  The medians moved by 1 to 4 percent (noise), so no bound changed: none is
  raised, none lowered.
- examples/text.wxw (a `Directory` effect injected by `with directory()`, a
  pipe with one stage per line, a block, a raw literal, an `Entry(Text,
  Int)` printed nested, `show`) with bootstrap/text.go compared byte for byte
  in test/text-literal.test.mjs; the six existing snapshots are
  byte-identical (checked with `emit`). test/specialize.test.mjs now lists
  text.wxw with the examples that intern an arrow.
- Docs: ADR 011, the Text section of docs/language.md (including `"""`
  maximal munch, the non-BMP location convention and holes sharing the
  nesting budget), docs/architecture.md and docs/engineering.md (Text
  rows), the spec's §1 maximal-munch sentence and §6 lone-CR span note,
  README (Text under "works today", "strings" removed from "Not yet
  supported", roadmap), BACKLOG (D001, STD001, header, T007), and the stale
  `chainLeft1` / Grammar `apply` references (now `chainLeftAny` and
  Format.Parse.Steps' `applyAt`; docs/architecture.md, docs/engineering.md,
  docs/adr/006-nesting-limit.md, test/regression.mjs, BACKLOG O001).

Evidence:
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` exit 0
  (.build/text-t9-verify.log): 1535/1535 parallel, 57/57 serial, 91
  regression proofs, 7 of them the new Text rows. A first attempt
  (.build/text-t9-verify-first.log) failed one test, `specialize is the
  identity on monomorphic programs`, because examples/text.wxw interns an
  arrow; fixed by listing it, then the full run above passed.
- Differential against f36744d (`scripts/differential.mjs --corpus all
  --regenerate`, .build/text-t9-diff.log): harvested 6775 sources, fuzz
  1029, isName 1085, matches 1000, mutations 1000: 0 differences (no
  compiler change since f36744d). The harvest run's test pass exited 1 on
  timing tests under the hook; recorded in BACKLOG T007 with figures only.
- `.build/regression` and the baseline copy were deleted.

Text v1 Task 9 fix round 1 (2026-10-13): scale test now warms up and takes
the minimum of three builds (medians above; no bound changed); hash-mismatch
probe message corrected; example's `welcome` and `rawPath` renamed and
bootstrap/text.go regenerated; README shows the whole example verbatim;
EBNF, spec notes and dates fixed; a Text-only program joined `specialize is
the identity`. Verify exit 0 (.build/text-t9-fix-verify.log): 1535/1535,
57/57, 91 proofs. Inside verify the `go build` minimums were 300, 883 and
292 ms (bounds 438, 2127, 390), about twice the standalone figures: the
bounds hold but the margin is thin on the 100,000-escape case. No timing
failure, so no T007 entry.

## FX020 effect operation namespaces done on branch `fx020` (2026-10-14)

Plan docs/plans/2026-10-13-effect-namespaces-plan.md, Tasks 1-8 on branch
`fx020` from main 26611c3 (worktree .worktrees/fx020); spec
docs/plans/2026-10-13-effect-namespaces-design.md, ADR 012
(docs/adr/012-effect-namespaces.md). Not merged; the hint wordings were
approved 2026-10-14 and the merge into main is next. Ledger and
task reports: .superpowers/sdd/2026-10-13-effect-namespaces-plan/
(progress.md, task-*-report.md; rulings R1-R18).

Delivered:
- Every operation is `Effect.op`, resolved by declaration and never by the
  row; `.` is a token, and only an uppercase name before it qualifies.
- A function's own row may alias effects and import operations (`with
  Database as D + Log { log, info as note }`); lexical order binders,
  parameters, imports, globals with no fallback; the three approved
  collision and placement errors, with notes.
- `fail` is no longer a keyword: `Fail.fail(e)` and an imported `fail(e)` are
  one `Resolved.Fail` node (an imported family rides on it, R12); a Fail
  reference is an eta lambda. Console and Fail are built-in declarations with
  no EffectIds (runtime keys unchanged).
- Unbound bare operation names keep their error with a hint; the
  multi-candidate wording (R18) was approved 2026-10-14. `Console.print`
  and `show` remain compiler-provided until C001.
- Final review (R19): a qualifier's `.` touches both names (`Log . log(1)`
  and `Log\n.log(1)` give the stray-`.` `Expected ';'` at the `.`;
  test/fx020-qualified.test.mjs), at no parser stack cost (depth probe,
  limit lifted, isolated copies at 9c488ca and after: constructor-argument
  259, call-argument 296, parens 396, parens-in-call-in-constructor 326,
  all unchanged); aliases and imports are folded one label at a time, so the
  first error in source order wins (test/fx020-imports-review.test.mjs).
- The corpus (examples, 101 fixtures, tests; about 920 automatic edits
  (sum of the Task 6 report's chunk figures) plus manual ones) was migrated by a
  one-off tool, then the tool, the paired run and bare-name support were
  removed (R4, Task 7).

Tasks (commits on fx020):
- Task 1: behaviour-preserving splits (bb083c5, fb89cd5):
  Format.Diagnostic.Code, test/fx-oracle-expr.mjs, test/regression-diag.mjs.
- Task 2: qualified operations (c503adb, fix 19784ed): lexer `.`,
  Format.Parse.Name, Features.Resolve.{Name,Qualified}. G002 margin measured:
  constructor-argument 259.
- Task 2b (controller-added, R7): the Fail reference as an eta lambda (5d66dcc).
- Task 3: aliases and imports (96e8450, fix 6c88869): Resolve.Imports,
  Format.Parse.Chain, R10, R11, R12; FX021 added.
- Task 4: Console and Fail as built-in declarations, E_DUPLICATE (3c5547f).
- Task 5a: the rewrite tool, manifest, edit map and paired differential
  (739194c, c9601dd, c4e3920); Task 5b: reference interpreter and generator
  for qualified names, imports and aliases (c781627, fd83293). The 5a/5b
  split is R13.
- Task 6: corpus migration in chunks (4878aaa .. ee455f6), 10 commits plus a
  review fix round.
- Task 7: bare resolution and tooling removed, unbound hint (383699f, e21b19a).
- Task 8: review cleanups (3ab36d2, `refactor: FX020 review cleanups`) and
  the documentation commit.

Evidence (logs under .build/ in the worktree, names fx020-task<N>-*):
- Verify: exit 0 at every task's end. Final counts: Task 5b fix 1647/1647
  parallel (fx020-task5b-fix1-verify.log), Task 7 1626 parallel, 57/57
  serial, 94 regression proof lines (fx020-task7-verify.log);
  Task 8, on the committed clean tree, exit 0
  (.build/fx020-task8-verify.log): 1626/1626 parallel, 57/57 serial, 94
  regression proof lines, width 0 over 80 in 490 files.
- Regression rows (scripts/regression-fx020.mjs, probes
  test/regression-fx020.mjs), each fixed passes and restored defect fails:
  `fx020-first-declaration` (bare unbound call fell back to the first
  effect declaring the name), `fx020-function-wins` (`fn log` beside
  `Log.log` must each reach their own), `fx020-row-dependent` (resolution
  must not depend on the written row). The Task 8 cleanup made the
  function-wins probe print the rejection.
- Compiler differential per task against its base (`scripts/differential.mjs
  --corpus all --regenerate`): Task 1 0; Task 2 1,071 (966 fail-as-Call
  parse trees, 41 enclosing spans, 59 lone `.`, 1 `fail()` E_SYNTAX to
  E_ARITY; accepted, R8); Task 3 2,761 raw, 46 normalised, all parse-phase
  and new-syntax sources; Task 4 5 (sources declaring `effect Console` or
  `effect Fail`); Task 5a, 5b 0; Task 7 11 (exactly the 11 new bare-name
  rejection programs). Fuzz, isName and matches 0 throughout.
- Paired runs (original program against migrated twin, same Go required,
  scripts/fx020-paired.mjs, since removed): final Task 6 tree 6,930 pairs, 0
  unexpected, 1 ledger entry (R15, `Expected now()` to `Expected
  Clock.now()`); the seven bootstrap/*.go snapshots byte-identical
  (`git diff 26611c3..HEAD -- bootstrap` empty). Two nested-handler sources
  overflow the stack on a cold first compile in either tree (G006), so paired
  runs used `node --stack-size=3000` (R16).
- Go-vs-interpreter differential (test/fx-differential.serial.test.mjs,
  `WAXWING_FX_SEED=$((20261010 + 500*k))`, k = 0..10): 11 seeds x 500 = 5,500
  programs, 0 disagreements at Task 5b, again after its fix round (imported
  and aliased spellings 213-249 and 85-117 per seed) and at Task 7
  (.build/fx020-task7-seeds.log, 8/8 tests per seed).
- Timing failures under the differential and harvest runs are in BACKLOG T007
  (figures only, bounds unchanged); verify itself passed.

Rulings summary (ledger has the full text): R1 user `effect Console` is the
existing `Duplicate effect Console`; R2 no note for a built-in; R3-R4 bare
tests converted in Task 7, one-off tools removed; R5/R18 the multi-candidate
hint is pinned and goes to the user (approved 2026-10-14); R6 unknown
`X.y` uses existing texts; R7 Fail
reference in its own task; R8 differential categories accepted; R9 the
G002 margin is measured; R10/R12 a family rides on the Fail node; R11 a
duplicated label's import binds the reachable one (FX021); R13 Task 5 split;
R14 Task 6 as one chunked dispatch; R15 one message changes; R16 stack-size
for paired runs; R17 qualify and wrap commits are verified as a pair.
Open: FX021, G002, G006, T007.

FX022 (2026-10-14, user-approved wording): the unbound-name hint writes a
parameterised effect's parameters in the import form (`Fail(E) { fail }`,
`Box(t) { put }`, `Pair(a, b) { … }`); `use` stays bare and effects without
parameters are unchanged. The multi-candidate hint wording was approved too.
Report: .superpowers/sdd/2026-10-13-effect-namespaces-plan/fx022-report.md.

## R001 Task 10: regression rows, scale, services proxy (2026-10-14)

On branch `records` (plan .superpowers/sdd/2026-10-14-records-plan, spec
docs/plans/2026-10-14-records-design.md §8).

- Five regression rows (scripts/regression-r001.mjs, probes in
  test/regression-r001.mjs), each "fixed compiler passes; restored defect
  fails" in an isolated copy: `r001-sorted-layout` (Layouts' key in written
  order: an open row's spliced tail makes a second struct for one type),
  `r001-lacks` (RecordTail's lacks check removed), `r001-shared-remainder`
  (two open tails each given their own fresh remainder),
  `r001-field-order` (every field used in place in the Go struct literal,
  so Go evaluates them in sorted order) and `r001-shape-types` (layouts
  keyed by labels alone, so `{ x: Int }` and `{ x: Text }` share a struct).
  The E017 row `r001-print-ground` now proves that `go build` itself
  failed: the probe reads Go's `# command-line-arguments` header and first
  error, rather than calling every failed `go run` a build failure.
- Fail keys: a test where the later-sorted label set (`{ zed }`) is
  declared, raised and handled first pins `{ alpha }` to MinInt32 + 1. With
  first-use numbering restored in an isolated copy, the existing
  "count up … in sorted order" test passed and this one failed.
- Scale (test/r001-scale.serial.test.mjs, serial phase): 200 distinct
  shapes `{ k: Int, fI: Int }` through a chain of 20 generic functions,
  each updating `k`: 4,001 keys (one per shape and link, plus `main`,
  asserted exactly), 19,617 Go lines, output checked. Keys and lines grow
  linearly: 50x20 1,001 keys and 4,917 lines; 100x20 2,001 and 9,817;
  200x20 4,001 and 19,617; 100x40 4,001 and 17,817. Text v1 method: compile
  in-process; `go build` after one warm-up build, the minimum of three.
  Five serial runs on this host (macOS, Node 26.6.0, Go 1.26.4), load
  average (1, 5, 15 minutes) before each: 2.74 2.48 3.31; 3.56 2.65 3.36;
  3.35 2.62 3.35; 3.25 2.61 3.34; 3.23 2.62 3.34
  (.build/r001-t10-scale-five.log).

  | Measure | Runs | Median | Bound (3x) |
  |---|---|---|---|
  | compile ms | 243, 243, 242, 242, 251 | 243 | 729 |
  | go build ms (min of 3) | 728, 718, 714, 693, 697 | 714 | 2142 |
  | Go lines | 19617 (all five) | 19617 | 58851 |

  Each tail's layout is interned too, so the chain emits 400 structs for
  200 shapes, half of them (`{ fI: Int }`) declared and never used.
- Services proxy, a proxy and not a validation of the unimplemented
  services feature (same test file, no time bound; keys exact, output
  checked): environments are records of `(Int) -> Int with Console`
  service functions, each holding a window of `width` consecutive services
  of `services`, so neighbours overlap; generic `useI(env: { sI: …, ...r
  }, n)` calls the service through its label alone, and each environment
  calls each of its services through that code. Keys are one per
  (environment label set, service), one per service function, and `main`;
  environments with one label set share keys. Single in-process compiles:

  | Services | Environments | Width | Keys | Go lines | Structs | Compile ms |
  |---|---|---|---|---|---|---|
  | 20 | 20 | 8 | 181 | 2519 | 160 | 152 |
  | 20 | 100 | 8 | 181 | 2759 | 160 | 351 |
  | 40 | 40 | 10 | 441 | 6939 | 400 | 221 |
  | 40 | 200 | 10 | 441 | 7419 | 400 | 967 |
  | 80 | 80 | 10 | 881 | 13859 | 800 | 397 |

  The test runs 20 services, 100 environments, width 8. The first row's
  compile includes JIT warm-up; repeated environments add only `main`'s
  lines, but its compile time grows with `main`'s 100 or 200 `let`
  bindings of 8 or 10 nested calls.

## R001 records (first tranche) done on branch `records` (2026-10-14)

Plan docs/plans/2026-10-14-records-plan.md, Tasks 1-11, on branch `records`
from main de96a15 (worktree .worktrees/records); spec
docs/plans/2026-10-14-records-design.md (approved 2026-10-14), ADR 013
(docs/adr/013-records.md), language docs/language.md ("Records"). Not
merged and nothing pushed: the user's merge decision (fast-forward only)
is next. Ledger and task reports: .superpowers/sdd/2026-10-14-records-plan/
(progress.md with every ruling, task-*-report.md).

Delivered:
- Record types `{ l: T, … }` and `{ l: T, ...r }`, sorted and unique
  labels, and row sorts: a row variable is a record row or an effect row,
  solved over the declarations in both directions.
- Literals, `e.l` and `e { l = v }` as postfix operations; inference with
  rigid tails, implicit lacks sets and shared remainders; type-preserving
  update; the approved diagnostics of spec §6.
- Comparison and printing in sorted label order; records as `Fail`
  payloads keyed by label set; one Go struct per shape and one function
  copy per concrete row, with evaluation order kept by temporaries.
- E017 (printable check at the ground type) fixed first.

Tasks (commits on `records`):
- Task 1: behaviour-preserving splits (356397c): Subst/UnifyFailure,
  Unify/Compose/UnifyParts, Resolve.Types/TypeRef/TypeArguments,
  Specialize.Keys/State, Type.Core/Compare. Differential 0 differences.
- Task 2: E017 (d36fcc4): Specialize.Printable `checkSites`, Ground.
- Task 3: record types and row sorts (0a09142; fixes bd766c4, a93b899,
  c14d4b1, 61d55d4 after four review rounds): RecordType parser, Type.Record,
  Resolve.Sorts, RowSettle, SortCheck, SortConflict, Occurrences.
- Task 4: record-row unification (a16ce1b; fix b800a18): UnifyRecord,
  RecordTail, Lacks, Seed, Implied; effect operations seed lacks, and an
  effect's parameter cannot be a record tail.
- Task 5: literals, access, update (fd6f17c): Parse.Lookahead, Postfix,
  Record; Resolve.Record; Check.Record.
- Task 6: comparison and printability (ef5ca3b).
- Task 7: specialization keys and Go lowering (0d7d0e0): Specialize.Layouts,
  Record; Format.Go.Record, RecordHelpers, RecordNames, RecordUse;
  examples/records.wxw and bootstrap/records.go.
- Task 8: unsolved record-sorted arguments are the empty rest (5fbb1ac);
  records as `Fail` payloads (baf796f): `HeadRecord`, FlatRecord
  `failHead`, Format.Go.Families.
- Task 9: records in the reference interpreter and generator (dfec27a).
- Task 10: regression rows, scale, services proxy (7fd1d14; section above).
- Task 11: the five Task-10 rows' messages pin their mutant's symptom
  (9e8cf17), and this documentation.

Evidence (logs under .build/ in the worktree):
- Verify, `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`, exit 0
  at every task's end on its committed tree: Task 2 1651 parallel and 57
  serial; Task 4 fix 1717/57; Task 5 1749/57; Task 7 1786/57, 103 proofs;
  Task 8 1807/57, 103 proofs; Task 9 1819/57; Task 10 1820/59, 108 proofs
  (14 of them R001 rows). No timing failure in any verify.
- Compiler differential against each task's base (`scripts/differential.mjs
  --corpus all --regenerate`): Task 1 0; Task 2 11 (this task's own
  programs, E_TOOL at `go build` to E_TYPE; no existing source); Task 3
  final 44, all sources the base rejected with `Expected a type` at a `{`
  in a type (41 new sources, 3 mutations); Task 4 fix 26 (new sources and one
  mutant); Task 5 64, all parse-phase sources the base rejected (57 new,
  2 fx020 sources and 2 mutants whose lowercase `.` is now an access,
  3 mutants of new sources); Task 6 0; Task 7 27 (sources the base
  rejected with E_INTERNAL "Record types are not lowered yet"); Task 8 15
  (new sources). Tasks 9-11 changed no compiler source. Fuzz, isName and
  matches 0 throughout; no valid existing program's Go changed.
- The seven bootstrap/*.go snapshots are byte-identical throughout;
  bootstrap/records.go is new.
- Parser depth (scripts/depth-probe.mjs, limit lifted, isolated copies):
  constructor-argument 259, call-argument 296, parens 396,
  parens-in-call-in-constructor 326 before and after Tasks 1, 3, 4 and 5
  (one 325 reading at a base was noise). G002 unchanged.
- Go-vs-interpreter differential, `WAXWING_FX_SEED=$((20261010+500*k))`,
  k = 0..10: 0 disagreements on every seed (Task 9); seven record census
  rows met (337 to 368 programs per seed, minimum 250).
- Timing failures seen only in the differential's instrumented harvest runs
  are in BACKLOG T007 (figures only, bounds unchanged).

Rulings summary (the ledger has the full text): R1-R4 sequencing of
printer, rule-6 tests, interim E_INTERNAL and end-to-end printable tests;
the duplicate-field text is the existing template `Duplicate field
<label>`; the row-sort solver alternates phases with Jacobi rounds and one
post-solve check, blaming the later use (or the later caller's argument)
with a note at the first, and a caller clash names the variable's own
sort; an effect's parameter cannot be a record tail, and effect operations
seed lacks; the lowercase `.` on existing invalid sources is accepted;
unsolved record-sorted arguments lower to the empty rest; the label-set
capacity refusal reuses `Fail without a family` in Program.Compile; the
pre-existing Handler-payload E_EFFECT is filed, not fixed (FX024); Tasks
4, 5 and 7 ran on Opus.

Task 11 test tightening: scripts/regression-r001.mjs rows
`r001-sorted-layout` (`written-order layout … E_TOOL: … cannot use`),
`r001-lacks` (`lacks: E_TOOL: go build failed: … redeclared`),
`r001-shared-remainder` (`independently: E_TOOL: go build failed: …
cannot use`), `r001-field-order` (`field order left to Go: a\nb\n`) and
`r001-shape-types` (`field types: E_TOOL: … cannot use`), each matched
against the mutant output in the Task 10 report and re-proved with `node
scripts/regression.mjs <row>`: "fixed compiler passes; restored defect
fails" for all five. Verify on the committed tree 05da489 exit 0
(.build/r001-t11-verify.log): 1820/1820 parallel, 59/59 serial, 108
regression proofs (14 R001 rows).

Open: R004 and R005 (fast-follows), R006-R009 (later), R010 (instantiation
rule misses record rows), R011 (unused tail structs), E018 (lambda
missing-field diagnostic), T011 (corpus gaps), T012 (eight rows still match
only their label), the I001 note on nil field access, G002, T007; FX024 was
fixed by the final fix wave below, which also filed R012 and E019.

## R001 final fix wave (2026-10-15)

The whole-branch review of `records` at 96e28f2 found C1 (critical) and
I2-I4; the user approved C1's text and ruled FX024 fixed before the merge
(findings and report under .superpowers/sdd/2026-10-14-records-plan/,
final-fix-findings.md and final-fix-report.md).

- FX024 (4c7ee77). Cause: Resolve gave a type written as an effect
  label's argument in a signature the signature's ambient row, which is
  also that row's tail; a caller with a label the callee lacks bound the
  tail, and so the payload's row, to its whole row, which then differed
  from the payload the caller wrote. Fix: label arguments resolve without
  an ambient row everywhere (as fields, operations, handler labels and
  `handle` clauses already did); an unannotated arrow or bare `Handler(L)`
  there is `pure` (ADR 010). test/fx024-label-arguments.test.mjs (10
  tests, 10 red before); row `fx-label-argument-ambient`. A function that
  raises an ambient callback in such a payload is now rejected (the
  existing row-equality text); one existing test program did that and was
  rewritten (test/fx-cleanup.test.mjs, the 5,000-arrow payload).
- C1 (8d81da1; 73222ef walks a signature only when it has a record row,
  since strict `where` bindings had made every function map every
  declared type: 3,000 types and functions resolved in 121 ms, 61 ms
  after). Types written in a body (lambda annotations, `with
  handler` label arguments, `handle` clause payloads) are held to the
  signature's lacks sets in Features.Resolve.Lacking: E_TYPE `r may
  already have field a` (text approved 2026-10-15) at the label, or at
  the `...r` passed to a declared type, note `r is introduced here` (this
  placement was implemented by the wave and approved by the user on
  2026-10-15 afterwards).
  Specialize's `recordType` reports a repeated label as E_INTERNAL
  `Duplicate record label`. test/r001-body-types.test.mjs (14 tests: l1,
  l2, m1, m4, o2, a `handle` payload, note placement, four accepted forms,
  the guard driven directly); rows `r001-body-lacks` (restored: E_INTERNAL
  Duplicate record label from the guard) and `r001-record-guard`. With the
  guard, row `r001-lacks`'s restored defect also ends in that E_INTERNAL
  rather than `go build`, so its message now pins `lacks: E_INTERNAL
  Duplicate record label` (found by the wave's fourth verify).
- I2, I3, I4 and recommendation 4 are documentation: R012 (concrete row
  arguments for record-row parameters), E019 (lacks-failure wording), the
  corrected "latent" claims (ADR 013, BACKLOG R005), T011's generator
  shapes.
- Differential against 96e28f2 (`--corpus all --regenerate`, 7,170
  harvested sources; fuzz, isName, matches and mutations 0): 25
  differences. 17 change the final outcome, all this wave's new test
  programs: 8 FX024 programs the base rejected with the spurious E_EFFECT
  now compile, the pure-callback raise now compiles and the ambient one
  is now rejected; 4 C1 programs whose Go failed `go build` and 2 whose
  function is never called are now `r may already have field`, and l1's
  contradictory text became the approved one. 8 differ only in the
  resolve phase with identical final diagnostics or Go: three FX017/FX018
  callback-row programs and four nested `Handler(Log with S(…))` programs
  (their label arguments lost the ambient tail) and the rewritten
  5,000-arrow payload. Full-compile comparison of every harvested source:
  17 differ, the same 17; no existing program's Go changed. The first run
  also showed G006's one-sided parser `RangeError` on the two longest
  nested-handler sources; a `--stack-size=3000` rerun showed none, and the
  base overflows the same way after warm-up (BACKLOG G006).
- Parser untouched; no depth probe. Timing failures of the instrumented
  harvest run and of two verify runs (test/coverage-scale.test.mjs, the
  10,000-type chain, 5,145 to 6,329 ms against 5 s under the parallel
  run in five of six verifies, about 1.75 s alone on this tree and on the
  base) are in BACKLOG T007. Serial 59/59 and 111 regression proofs
  passed on 2e77dc2 when run on their own.

## R012: concrete record-row arguments (plan Task 12, 2026-10-15)

The user put R012 in this tranche and approved its surface and both
diagnostics (2026-10-15): a declared type's record-row parameter takes a
record type argument, which supplies the row beside the declaration's
labels (`Holder({ y: Bool })` holds `{ x: Int, y: Bool }`).

- Resolution only for the form: the parser already read `{ … }` as a type
  argument (depth probe not run: Format.Parse untouched).
  Features.Resolve.TypeArguments resolves a record argument to the
  `TRecord` a solved row would be; `{ ...s }` is `...s`
  (RecordArguments `asRow`, also in Occurrences, so the sort solver agrees).
  Wrong sorts: `Expected a record, found Int` (named by
  Features.Check.ResolvedName) and, for an effect's name, `Expected a
  type, found an effect row`. Features.Resolve.ArgumentClash reports a
  label the declaration writes beside the parameter, directly or through
  nested declared types, as `Duplicate field x` at the argument's label
  noted at the declaration's, even with equal field types. Resolve.Lacking
  takes passed tails from record arguments too.
- Found while testing: (1) Resolve.Lacking read a written argument
  position as the parameter's variable place, so with `type T(...e,
  ...r)` the base reported `e may already have field x` at `...e`; fixed
  by RecordArguments `slotOf`. (2) Once rows could hold fields, the
  declarations' instantiation rule (Features.Check.Nested), which skipped
  row arguments, admitted `type T(...r) = End({ ...r }) | More(T({ a: {
  ...r } }))`, and a use of it overflowed the stack in
  Features.Check.Expand. Record arguments are now judged (bare `...r` or
  no variable) and walked (Features.Check.NestedArguments), with the
  existing `Recursive use of T changes its type arguments`.
- Tests: test/r012-arguments.test.mjs (12) and
  test/r012-diagnostics.test.mjs (16). The first 23 were run before any
  source change: 20 failed, 3 passed (an effect row parameter's refusal, a
  program without concrete rows, and the sort conflict of a record
  argument's tail, which the base also reports first)
  (.build/evidence/r012-red.log). The nested-recursion, slot-position and
  spread tests were added after the defects were found; their red is the
  rows below and the base outputs in the differential.
- Regression rows (scripts/regression-r012.mjs, probes
  test/regression-r012.mjs), each proved in an isolated copy with the
  message pinning the restored symptom: `r012-record-argument` (`Expected
  an effect row, found a type`), `r012-argument-clash` (E_INTERNAL
  `Duplicate record label` from the lowering guard), `r012-argument-lacks`
  (same), `r012-slot-position` (same), `r012-spread-argument` (`Expected
  an effect row, found a type`), `r012-nested-row` and `r012-nested-walk`
  (the growing row accepted).
- Differential against 57ee9dc (`--corpus all --regenerate`; 7,205
  harvested, 1,029 fuzz, 1,000 matches, 1,000 mutations): 33 differences,
  all in the resolve phase. All 31 harvested ones are the new R012 test
  programs (checked against a harvest of test/r012-*.test.mjs alone): the
  base refused each record argument with `Expected an effect row, found a
  type`, and the slot-position program with `e may already have field
  x`. The 2 mutation differences are mutants of those programs (`Boo`,
  `xnt` for a type), unbound names on the candidate. No existing source
  differs; the eight bootstrap/*.go snapshots are byte-identical. In one
  run both compilers threw on 2 harvested sources (no difference; a
  rerun of the harvested corpus showed none, G006's warm-up overflow).

## R001 pre-merge evidence fixes (plan Task 13, 2026-10-15)

- T012 done: each of the eight rows' mutants was run in an isolated copy
  (.build/evidence/t13-mutant-outputs.log), and each `message` now pins
  what the restored defect produces: `r001-record-order` the unsorted
  `Expected { b: Bool, a: Int }`, `r001-row-sort-propagation` and
  `r001-duplicate-field` acceptance, `r001-callee-to-caller` and
  `r001-sort-feedback` the clash reported against the wrong variable,
  `r001-settled-sort` and `r001-caller-conflict` E_INTERNAL `Invalid type
  variable`, `r001-field-bound-tail` Go's `cannot use` build error.
  Re-proved: `node scripts/regression.mjs` with the eight rows, each
  "fixed compiler passes; restored defect fails"
  (.build/evidence/t13-regression-eight.log). The other rows added on this
  branch already pinned their symptom except `r001-record-guard`, whose
  probe now prints the lowered layout, pinned as `{ a, a }` (fix round
  1; .build/evidence/t13-fix1-record-guard.log).
- FX024's documented alternative to `with pure`, a payload sharing the
  signature's written `...e`: three tests in
  test/fx024-label-arguments.test.mjs (an arrow raised and run by main's
  catcher, printing the callback's Console output; a caller with the same
  shared row passing it on; a `Handler(Log with ...e)` raised and
  installed). They passed when written: the FX024 mutant (row
  `fx-label-argument-ambient`) also accepts all three, since a written
  `...e` never took the ambient row
  (.build/evidence/t13-fix1-fx024-probes-under-mutant.log). A caller that
  adds a label to the shared row is rejected with a misleading or opaque
  text (BACKLOG FX028); ADR 010 and docs/language.md state the limit.
- Docs: the o2 placement's approval history (spec §6, ADR 013), the
  unconstrained record-argument sentence (docs/language.md), the
  docs/engineering.md R001 bullet, and BACKLOG E020, FX025, FX026, FX027
  and FX028 (probe logs .build/evidence/t13-backlog-probes*.log,
  t13-fix1-fx024-probes-2.log).

## R001 timing comparison and final gate (plan Task 14, 2026-10-15)

The user kept the timing bound and asked for base and candidate under
comparable conditions, both logs kept, and the final verify with
competing builds stopped. Earlier failure records above and in BACKLOG
T007 stand as written.

- Comparison: base de96a15 (the merge base) built in .build/base-de96a15
  beside candidate ee6038c; each timing file that failed or flaked during
  R001 run alone, base and candidate interleaved, one warm-up pair and 5
  measured pairs (7 for coverage-scale), load average 1.8 to 3.0 (waits
  recorded). Logs: .build/evidence/t14-timing-coverage-scale.log,
  -large-source, -fn-linear-timing, -fn-scale, -fx-block, -fx-scale,
  -fx008-scale, -match-lift-timing, -text-scale, -r001-scale (candidate
  only: no base equivalent). Figures in BACKLOG T007.
- Finding: Records slow the 10,000-type dependency chain
  (test/coverage-scale.test.mjs) from a median 898 ms to 1,710 ms (1.90x,
  ranges disjoint). The earlier "load sensitivity" reading compared the
  tree with 96e28f2, itself a Records commit. Bisection
  (.build/evidence/t14-chain-bisect.log): about 930 ms at d36fcc4, about
  1,320 ms from 0a09142 (record types and row sorts), about 1,720 ms from
  61d55d4 (row sorts alternate both directions until settled). Smaller
  disjoint-range increases: three thousand distinct instantiations 1.17x,
  twenty thousand one-constructor types 1.09x, 200 mark variables 1.09x.
  Every other figure is within 0.86x to 1.06x. Not profiled; no bound
  changed (the chain keeps 2.9x headroom alone, 5.5x before).
- Final gate: `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` on
  the clean tree at ee6038c, no other build running, exit 0 on the first
  run (.build/evidence/t14-final-verify-1.log): 1,875/1,875 parallel,
  59/59 serial, 118 regression proofs; the chain took 2,495 ms.

## R001 compile-time regression removed (plan Task 15, 2026-10-15)

Task 14 found Records slowed three existing programs against main
de96a15. Profiled first (`node --cpu-prof` on the built output/, the
three programs compiled in-process), then fixed without behaviour change
(commits 260edaf, 2ef868c, 52e82cb). Earlier records above and in
BACKLOG T007 stand as written.

- Root causes. The 10,000-type chain: Features.Resolve.Occurrences found
  each written type by scanning every declared type (`declaredIndex`,
  about 710 ms per compile, quadratic), run twice per program by Sorts.
  Three thousand instantiations: Variables rebuilt and scanned the
  declared-type table for every signature (about 80 ms), and Ty's Ord
  instance built record-row dictionaries each time it was made, once per
  nested comparison (about 11 ms). Twenty thousand types: the row-sort
  walks ran on a program without records (about 28 ms), and E017's ground
  tables (Specialize.Printable) were a strict `where` value, built for
  every program (about 16 ms).
- Fix. Names are indexed once per program
  (Features.Resolve.TypeIndices, a stable-sorted array searched by halves
  in a loop; cheaper to build than a Map of the same names), and a
  reference without arguments is not looked up. The declared-type table
  is built once in Resolve and passed to Variables, EffectSorts and
  Lacking. Sorts settles declarations as written when no declaration
  writes a record type, where the solver can neither change nor reject
  anything (ADR 013, "Record-free fast path"). The ground tables are
  built only for a structured print site. Ty's Ord compares records
  through Domain.Type.Compare `compareRecords`, so the dictionaries are
  built only when two records meet; Eq stays inline (moving it as well
  measured slower on the wide match checks).
- Figures (interleaved file runs, main / before bf4b8e7 / candidate
  52e82cb in the worktree, medians ms with ranges in BACKLOG T007):
  chain 931 / 1,710 / 945; instantiations 875 / 968 / 879; twenty
  thousand types 660 / 707 / 684 (.build/evidence/t15-timing-coverage-
  scale-4.log, t15-timing-large-source-3.log). Every other figure in
  those files is within 0.91x to 1.04x of main except two small, noisy
  ones in the worktree run. A control with the same candidate built in a
  copy under .build (-coverage-scale-5, -large-source-4) shows running
  from the worktree root adds a few percent on some tests (the 62 ms
  redundant-arm test: copy 63.4, worktree 70.9, main 61.7); Task 14's
  candidate figures carried the same effect. r001-scale unchanged
  (compile 254 / 256 ms). Records-heavy in-process programs
  (.build/evidence/t15-records-heavy.log): 3,000 record-typed functions
  about 30% faster, the r001-scale programs unchanged.
- Found, not caused here: a records-heavy declaration chain is
  super-linear in ArgumentClash (25 s at 2,000 declarations, before and
  after); BACKLOG R013.
- Guard: test/r001-sort-cost.test.mjs (no timing): a record-free
  program's declarations come back as the same array, a written or
  nested record type still settles and still rejects a disagreement, and
  the name index agrees with a first-declaration scan over 2,000
  generated arrays. Seen failing with each defect restored in an
  isolated copy (fast path removed, a shallow record detector, a
  last-duplicate search, a search ignoring the name;
  .build/evidence/t15-red.log). A timing-free guard for the quadratic
  scan itself was not found practical; the existing chain bound stays.
- Differential against bf4b8e7 (`--corpus all --regenerate`):
  0 differences over 7,212 harvested, 1,029 fuzz, 1,085 isName, 1,000
  match and 1,000 mutation sources (.build/evidence/t15-differential.log).

### Task 15 follow-up (review, 2026-10-15)

- Correction: the chain is about 1.01 to 1.02x main, not inside main's
  range in every run. In the second worktree control run
  (.build/evidence/t15-timing-coverage-scale-5.log) the candidate's
  927-942 ms is disjoint from main's 900-919 by about 8 ms; in -4 all
  seven candidate rounds were at least 933 ms against main's median 931
  (ranges 933-966 and 913-945 overlap); the copy run overlaps (908-945).
- test/r001-sort-cost.test.mjs gains a record type in a later
  declaration; a first-declaration-only detector fails it in an isolated
  copy (.build/evidence/t15-followup-red.log).
- Filed: BACKLOG R014 (the TypeRef and RecordArguments name scans), R015
  (`type T(...e) = T(e);` is E_INTERNAL `Invalid type variable`), R016
  (a signature's effect row used as a lambda's record tail reports
  `a is not a field of { a: Int, ...r }`).

### FX025 and R015 (internal errors, 2026-10-15)

- FX025 (d0c9f8a): an unbound effect row variable in a type declaration,
  a declared type's argument or a lambda annotation was E_INTERNAL
  `Missing row variable` at offset 0. It is the existing E_UNBOUND
  `Unbound type variable z` a record tail gets, at the written row (the
  whole `with ...z`, as the row sort errors are; at `...z` as an
  argument).
- R015 (b07d11f): a row parameter written as a type, `type T(...e) =
  T(e);`, was E_INTERNAL `Invalid type variable`; a record row
  parameter so written compiled unchecked. Both are the existing E_TYPE
  `Expected a type, found an effect row` at the use, as in a signature
  (Sorts.rowsAsTypes, run before the record-free fast path).
- Tests seen failing first (.build/evidence/ie-a-red-1.log); regression
  rows fx025-unbound-row, r015-effect-row, r015-record-row proved
  failing with each defect restored in an isolated copy.
- Differential against 80b5b53 (`--corpus all --regenerate`): 11
  differences in 7,224 harvested sources, all this change's own new
  test programs (E_INTERNAL or accepted before, the texts above now);
  0 in the 1,029 fuzz, 1,085 isName, 1,000 match and 1,000 mutation
  sources (.build/evidence/ie-a-diff-2.log).

### R016 and R010 (internal errors, 2026-10-15)

- R016 (3e610b6): a type written in a body (lambda annotation, handler
  label arguments, `handle` payload) read the signature's row variables
  without their sorts. An effect row as a lambda's record tail read as
  `a is not a field of { a: Int, ...r }`, an effect row passed to a
  record parameter there was E_INTERNAL `Invalid type variable`, and a
  record row as an effect row was accepted. Features.Resolve.BodySorts
  now gives the approved `r is an effect row, not a record row` (or its
  mirror) at the body's use, noted `first written here` at the
  signature's first use. Found while fixing it: a row read as a type, or
  a type variable as a row, in a body was unchecked (BACKLOG R017, fixed
  in fix round 1 below).
- R010 (75b2aa3): the instantiation rule ignored a function call's
  record row slots, so a call growing a row reached `More than 10000
  specializations` (0.3-0.4 s). Each record slot is now judged as a
  declaration's record argument (NestedArguments `admissibleSlot`): the
  existing `Recursive call to g changes its type arguments` at the call,
  for the nested, open, lambda-inner, mutual and declared-type forms.
  The declaration form was already refused (R012).
- Tests seen failing first (.build/evidence/ie-b-r016-red-2.log,
  ie-b-r010-red-1.log); regression rows r016-effect-as-record,
  r016-record-as-effect, r010-nested-row and r010-mutual-row proved
  failing with each defect restored in an isolated copy
  (ie-b-r016-regression-1.log, ie-b-r010-regression-1.log).
- Differential against 80b5b53 (`--corpus all --regenerate`,
  .build/evidence/ie-b-diff-1.log): 24 differences in 7,246 harvested
  sources, all new test programs of this batch (6 FX025, 5 R015, 8 R016,
  5 R010: E_INTERNAL, accepted or the specialization limit before, the
  texts above now); 1 of 1,000 mutations, an R015 source whose `main`
  was renamed (E_ENTRY before, now the R015 sort error, reported first);
  0 in 1,029 fuzz, 1,085 isName and 1,000 match sources. Every existing
  example, negative and test program is unchanged.
- language.md: the row-sort paragraph gains R015's rule (a record-sorted
  row parameter written as a type has the effect row's text) and R016's;
  the instantiation rule gains record row arguments.

Fix round 1 (review of R016 and R010, 2026-10-15):

- R017 (036153b; controller ruling: the existing signature-analog
  texts): Features.Resolve.BodySorts now flags every body use whose sort
  differs from the signature's and reports it through SortConflict
  `conflict`. A row read as a type is `Expected a type, found an effect
  row` at the body's `r` (lambda annotation, inside `List(r)`, a
  `handle` payload); a type variable read as a row is `Expected an
  effect row, found a type` at `...a` or `with ...a`; no note. Row
  against row is unchanged (R016's tests pass as they were). Tests
  test/r017-body-type-sorts.test.mjs seen failing first
  (.build/evidence/ie-b-r017-red-1.log); rows r017-row-as-type and
  r017-type-as-row proved failing with the check restricted back to row
  sorts (ie-b-r017-regression-1.log).
- test/r010-record-instantiation.test.mjs pins ADR 007's R010 note: a
  type argument that mentions a record tail (`g(x, { z: x }, n + -1)`
  with `y: a`) is accepted and prints 7.
- Differential against 80b5b53 (.build/evidence/ie-b-diff-2.log): 30
  differences in 7,254 harvested sources, the 24 above plus R017's 6 new
  test programs (accepted, E_INTERNAL or the misleading field text
  before); 1 of 1,000 mutations, an R017 source without the block's
  final value (resolved before, now R017's E_TYPE in resolve); 0 in
  fuzz, isName and matches. The harvest runs' timing failures are in
  BACKLOG T007 (bounds unchanged).

## README and theme-aware branding (2026-10-15)

User-reviewed README rewrite: keep the dependency/error-composition
hypothesis prominent; distinguish implemented features from inference,
class and target plans; explain record rows, explicit function interfaces,
comparison composition and error-family narrowing. Link introductory
references and Matt Parsons's error-composition discussion. Go's selection
reflects the author's day job; WASM/JS and possibly LLVM are future targets.

White-background and dark-theme PNG/SVG variants preserve the original
logo paths and transforms. The original transparent artwork is unchanged.
README selects the dark variant with picture media markup and defaults to
the opaque white variant.

Draft validation: all seven Waxwing code blocks compile and produce the
expected output, with an entry point or existing helpers for excerpts.
Width, links and image references checked; white PNG opacity and original
path geometry checked.

Full `npm run verify` was started under AGENTS.md's blanket completion
rule, then stopped after the user questioned its relevance to this
README/artwork change. Build, strict-warning and width checks passed
before it was stopped. No complete-suite result is claimed. The relevant
draft example, link and image checks above passed.

## GitHub Pages colors (2026-10-15)

Add a Pages head include and stylesheet that follow the reader's system
light/dark preference. Page, text, links, code and logo share a theme;
override Primer's white image background for the transparent dark logo.
Keep reference link definitions on one line so Jekyll renders the README
links rather than showing their Markdown source.

Chrome previews of the live page with the new stylesheet passed at 1100
and 390 pixels in both themes: correct logo source, transparent image
background and no page overflow. Screenshots reviewed for logo and code
legibility. Width and whitespace checks pass. No compiler suite run for
this website styling and Markdown formatting change, per user direction.

## R014: written type names looked up, not scanned (2026-10-16)

Branch `r014` from main 41cbbbb. Features.Resolve.TypeRef
`resolveTypeWith` and Features.Resolve.RecordArguments `recordArguments`
found each written type's name by scanning the declared types, quadratic
in the number of types. Both now take the declared types with the
program's TypeIndices (`Indexed r`, Features.Resolve.TypeIndices, built
once in Resolve) and look the name up with `indexOf`; TypeRef's
`declared` check does the same. The indices travel in Scope, a lambda's
annotations and ArgumentClash's `Tables`; the unused `resolveType` was
removed. No behaviour change intended.

- Differential against 41cbbbb (`--corpus all --regenerate`):
  0 differences over 7,254 harvested, 1,029 fuzz, 1,085 isName, 1,000
  match and 1,000 mutation sources (.build/evidence/r014-differential.log).
  The harvest run's timing tests fail under the hook and the parallel
  load, as recorded in BACKLOG T007.
- Timing, in-process `checked`, three interleaved rounds, base in a
  .build copy and candidate in the repository root (which a Task 15
  control found adds a few percent): a 10,000-type chain 934-943 →
  575-579 ms; R013's records-heavy chain at N=1,000 4,117-4,149 →
  1,709-1,716 ms (.build/evidence/r014-timing.log). R013's remaining cost
  is ArgumentClash `declaredLabels`.
- No new test: the lookup's agreement with a first-declaration scan is
  already guarded by test/r001-sort-cost.test.mjs (TypeIndices over 2,000
  generated arrays), and the chain keeps its existing bound.
- Verify: the first run's tests passed (1909/1909, 59/59) but its
  regression proofs stopped at fx-label-argument-ambient, whose needles
  named the renamed `types` argument (`mutation must have exactly one
  target`); the needles now say `known`, and every row's needle matches
  exactly once (158 edits checked). Rerun `rm -rf output &&
  GOTOOLCHAIN=go1.26.4 npm run verify`: 1909/1909, 59/59, 127 regression
  proofs, exit 0 (.build/evidence/r014-verify-2.log).

## R014 merged; R004 design decisions (2026-10-16)

R014 fast-forwarded into main at 955ad33 at the user's request; branch
deleted. R004 design drafted (docs/plans/2026-10-16-record-patterns-
design.md) and its open decisions answered by the user: explicit `...`
for unnamed fields, punning in patterns ahead of R007, the missing-field
text and the witness form approved. Docs only; no compiler change, so no
verify run for this entry.

## R004 plan revised after review (2026-10-16)

The user's review of the R004 plan found five gaps, each confirmed in the
code: label spans lost in resolution; Check/Expand `field` reads a record
as `Int` and Check/Coverage `roots` collects only `TData`; `witnessOf`
cannot tell an open record from a closed one; intermediate commits would
not build; and no execution evidence for the feature. Plus two smaller
corrections: ADT-valued fields inside records stay pointers, and the
design's typing section now separates rigid variables from holes and
pins `Expected a record`. The plan now carries label spans, an
`HRecord { labels, open }` head, coverage roots and inhabitation through
records, explicit placeholders with a removal table and a grep gate, and
a reference-interpreter comparison in Task 7. Docs only.

## R004 Task 1: parse and resolve (2026-10-16)

Record patterns parse and resolve; checking is a placeholder. Syntax
`PRecord Span (Array FieldPattern) (Maybe Span)` and Resolved `Record Span
(Array FieldPattern) Boolean` keep each label's span; a pun is a `PBind`
at the label. New Format/Parse/RecordPattern.purs (first field mandatory,
so `{}` and `{ ... }` give `Expected an identifier`; `...` must be
followed by `}` or `,}`, else `Expected '}'`) and Features/Resolve/
RecordPattern.purs (duplicate labels through RecordFields before the
fields are resolved). Resolve/Pattern `binders` now names every case.

Placeholder: Features/Check/Match `patternAgainst` returns `Internal "R004
placeholder: record patterns are checked in Task 2"` at the pattern; the
last test in test/r004-resolve.test.mjs documents it and Task 2 replaces
it. No other case analysis needed a change.

Tests: test/r004-parse.test.mjs and test/r004-resolve.test.mjs, 22 tests,
21 failing first (.build/evidence/r004-t1-red.log), all passing after.
Depth probe identical before and after (.build/evidence/r004-t1-depth-
before.log, -after.log; 153 existing anomalies, unchanged). `rm -rf output
&& GOTOOLCHAIN=go1.26.4 npm run verify`: 1931/1931, 59/59, 127 regression
proofs, exit 0 (.build/evidence/r004-t1-verify.log).

## R004 Task 2: check (2026-10-16)

Record patterns are checked (design §2). Checked `Record (Array
FieldPattern) Boolean` (the Boolean is the `...`). New Features/Check/
RecordPattern.purs holds the rule: the expected type, resolved under the
substitution, decides. A `TRecord` (closed or open) needs each written
label to be known (else `a is not a field of { … }` at the label, first in
written order), checks each field against its type, then without `...`
reports the first unlisted label in label order (`Pattern is missing
field l; add it or end the pattern with ...`) or an open tail (`Pattern is
missing the rest of T; end the pattern with ...`), both at the pattern. An
unbound hole is unified with a record of fresh holes, closed without `...`
and with `...` open over a fresh tail given `addLacks` of the written
labels. Anything else, a rigid variable included, is `Expected a record,
found T` at the pattern. Problem gains `PatternMissingField` and
`PatternMissingRest` (E_TYPE). The pattern types shared by Match and
RecordPattern moved to Features/Check/Matched.purs (Match re-exports
them). Check/Walk `foldPattern` and `retypePattern` now name every shape.

The first commit made a later arm unable to name a field an earlier open
arm had not (a tail never supplied a field). The user decided (2026-10-16)
that a hole tail is extended instead, so arm order does not matter; see
the follow-up below.

Placeholders: Task 1's in Check/Match is gone. Check/Coverage stops any
match holding a record pattern (nested too) at the first one with
`Internal "R004 placeholder: record pattern coverage is Task 3"`;
Specialize/Body `copyShape` returns `Internal "R004 placeholder: record
patterns are lowered in Task 4"`; Matrix `simplify` returns `Any`
(unreachable behind the Coverage placeholder; Task 3 replaces it).

Tests: test/r004-check.test.mjs (16 tests; programs that check are seen
reaching the Coverage placeholder, which Task 3 turns into acceptance) and
the updated last test of test/r004-resolve.test.mjs; 17 failing first
(.build/evidence/r004-t2-red.log), all passing after. `rm -rf output &&
GOTOOLCHAIN=go1.26.4 npm run verify`: 1947/1947, 59/59, 127 regression
proofs, exit 0 (.build/evidence/r004-t2-verify.log).

Follow-up (user decision 2026-10-16): a record type whose tail is a hole
grows by the labels a pattern names and it lacks, through the same fresh
record `.l` uses (new Features/Check/FreshRecord.purs, now also behind
Check/Record `select`), and is then judged anew. A pattern without `...`
that lists every known field closes a hole tail; `Pattern is missing the
rest` is now only for a rigid tail, and a rigid tail still never supplies
a field. An open arm after a closed one naming a new field is the existing
`fz is not a field of { fk: Bool }` at the label; a call passing an extra
field after the arms closed the type is the existing record mismatch at
the argument. The Matrix `simplify` comment now carries `R004
placeholder`. Tests: 3 more in test/r004-check.test.mjs, 2 failing first
(.build/evidence/r004-t2b-red.log; the third already held under the first
rule), all 41 R004 tests passing after. `rm -rf output &&
GOTOOLCHAIN=go1.26.4 npm run verify`: 1950/1950, 59/59, 127 regression
proofs, exit 0 (.build/evidence/r004-t2b-verify.log; a first run failed
the structural gate on a `case` over a Maybe, now `maybe` helpers).

## R004 Task 3: coverage (2026-10-16)

Record patterns are judged by coverage (design §3). A behaviour-preserving
split came first: Features/Check/Spelling.purs (keys, their spelling) and
Features/Check/Substitute.purs left Expand.purs (differential against the
previous commit: 0 differences, .build/evidence/r004-t3-split-diff.log).

Check/Signature `Head` gains `HRecord { labels, open }`: `candidates` of a
`TRecord` is that one head (labels in label order, `open` when any tail,
rigid or a hole nothing closed, is left); `arity` is the label count,
`fieldTypes` the row's field types, `witnessOf` a new `WRecord` carrying
the openness. Matrix `complete` holds a record column always complete,
`_` rows included, so it always splits into its fields: a witness shows
every field and an uninhabited field leaves none. `simplify` widens a
record pattern to the labels of its own (settled) type, `_` for those
under `...`; two different record heads in one column fail as a field
count mismatch (Internal). Missing needed no change. Format/Diagnostic/
Witness.purs renders `{ admin: false, name: _ }` and `{ a: _, ... }`; a
record type with no known field (`{ ...r }`) prints `_`, since `{ ... }`
is no pattern. Coverage `roots` collects record types too, and Expand
sees through records: discovery numbers the data applications inside
them (nested records too), and a record field reaches Inhabited as its
own fields, flattened, so a constructor holding a record with an
uninhabited field is uninhabited. Both Task 3 placeholders are gone;
`grep -rn "R004 placeholder" src` shows only Specialize/Body (Task 4).

Tests: new test/r004-coverage.test.mjs (11 tests); test/r004-check.test.mjs
accepts through Check (test/phases.mjs) instead of the placeholder, two
of its programs now reporting a redundant arm; test/coverage-oracle.mjs
gains the record type `{ k: Bool, s: { b: Bool, i: Int, ...r }, t: T }`
and record patterns with omitted fields and `...`, compared over 150
generated matches through Check (coverage.test.mjs). 20 failing first
(.build/evidence/r004-t3-red.log); all pass after
(.build/evidence/r004-t3-green.log, 85 coverage and R004 tests). The
binder-over-`{ o: Opt(Bool) }` test held before (records were never
complete then); in an isolated copy it fails with the roots change
reverted, the uninhabited-holder test with records read as Int again,
and the nested-witness and uninhabited-field tests with records complete
only when a head is present.

`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: 1962/1962, 59/59,
127 regression proofs, exit 0 (.build/evidence/r004-t3-verify.log).

Differential against main (`--corpus all --regenerate`,
.build/evidence/r004-t3-diff.log; every difference listed in
r004-t3-diff-all.log): 199 differences, 187 harvested and 12 mutations,
none in fuzz, isName or matches. 195 are sources main rejected at parse
with `Expected a pattern` at a `{` in pattern position. The other 4 are
the intended inhabitation change, from the new test's programs without a
record pattern: over `Opt(Wrap)` and `Opt(Deep)` (a constructor holding a
record with a `Void` field), `Nada => 0` was `Missing pattern: Some(_)` on
main and is now accepted, and `Nada => 0, _ => 1` was accepted and is now
E_REDUNDANT at `_`. 15 timing tests failed only in the instrumented
harvest run (known, BACKLOG T007); they passed in verify.

## R004 Task 4: lowering, evidence, close-out (2026-10-16)

Record patterns reach Go and R004 is done on branch `record-patterns`
(not merged). Commits: lowering, reference execution, example and docs,
regression rows.

Lowering (design §4). Domain/IR/Internal gains `Record (Array { label,
pattern })` (243 lines, so no split); Specialize/Body `copyShape` copies
it (the `...` needs no node, since an unnamed field is read by no test).
Format/Go/Match `conditions` has no tag test: each named field's pattern
is tested on `(<access>).f_<label>` (`recordField`), through the same
`fieldAccess` as a constructor's field, now taking the Go field name. A
record-valued field is inline (`pointer` false); an ADT-valued field
(`TData`), in a record as in a constructor, is a pointer, so its nil
guard precedes any projection and a binder dereferences it (`*`).
`bindings` and Capture `binders` name every shape (no fallthrough). A
matched record's layout is interned when the pattern's type is lowered
(`typed` in `copyPattern`), so a function that only destructures a
record from its caller still gets its struct (tested). Go output of
every existing program is unchanged; `grep -rn "R004 placeholder" src`
is empty.

Tests: test/r004-go.test.mjs, 8 executed tests, 8 failing first (all
`R004 placeholder: record patterns are lowered`,
.build/evidence/r004-t4-red.log): a record in a constructor and a
constructor in a record, an ADT-valued field bound and matched, puns, an
open row matched at three rows, field binders captured by a lambda,
nested records, a destructured record from a caller, and a nil ADT
field in a record reaching the unmatched panic (a Go test, as
test/adt-match.test.mjs does for constructors).

Reference execution. The FX001 interpreter parses and matches record
patterns (test/fx-oracle-records.mjs `readRecordPattern`,
`recordMatches`; `matches` in fx-oracle-context.mjs), sharing no
compiler code. test/fx-gen-record-patterns.mjs builds each match as an
ordered partition of its scrutinee's type (lexicographic products of
per-type splits, a catch-all appended only when constructors remain), so
it is exhaustive and non-redundant by construction: omitted fields under
`...`, puns, records in constructors and constructors in records, open
rows, and binders shown by arm bodies. test/fx-oracle-record-patterns
.test.mjs: 200 programs generated, 200 accepted by the compiler (floor
95%), each form in at least 10 (pun 139, rest 171, binders 190,
record-in-ctor 135, ctor-in-record 114, nested-record 111, open-row 74),
200 compared with the Go output (stdout, stderr, status), 0 mismatches.
With the interpreter's matcher mutated (first field ignored) 175 of 200
differ. Separate from test/coverage-oracle.mjs.

Example and docs. examples/records.wxw gains `greeting` (a pun, an
explicit field and `...` over an open row, specialized at two rows) and
`leader` (a constructor in a record in a constructor);
bootstrap/records.go is regenerated (the new functions precede main, so
later functions are renumbered; no other snapshot changes) and the
pinned output extended (test/compiler.test.mjs). docs/language.md gets
the grammar and "Record patterns (R004)"; ADR 013 gets "Record patterns
(R004)" with the user's decisions of 2026-10-16.

Regression rows (scripts/regression-r004.mjs, probes
test/regression-r004.mjs), each failing with its defect restored in an
isolated copy that compiles without warnings: `r004-missing-field` (no
unlisted field found), `r004-label-span` (the field's span taken from
its pattern), `r004-widening` (record patterns not widened:
`E_INTERNAL Coverage field count mismatch`), `r004-walk-binders`
(settlement does not retype patterns in record fields: `Invalid
constructor id`), `r004-inhabitation` (record fields read as Int:
`Missing pattern: Some(_)`), `r004-go-fields` (no field conditions: the
first arm wins) and `r004-hole-tail` (a hole tail never extended). A
first attempt at `r004-walk-binders` with a binder of type Int did not
fail: lowering defaults an unresolved binder hole, so the probe uses a
constructor pattern inside the field, whose type lowering needs.

`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: 1975/1975,
59/59, 134 regression proofs (127 + 7), exit 0
(.build/evidence/r004-t4-verify.log; a first run failed the width gate
on one line of the new rows file, fixed before the run reported).

Differential against main (`--corpus all --regenerate`,
.build/evidence/r004-t4-diff.log; every difference in
r004-t4-diff-all.log; the full-source parse check in
r004-t4-diff-parse-check.log): 416 differences, 385 harvested and 31
mutations, none in fuzz, isName or matches. 411 are baseline E_SYNTAX
`Expected a pattern` where main meets a `{` in pattern position (the
harvest's every such rejection, checked against the full sources, stops
at a `{`; the log prints only 200 characters, so 205 of these show no
`{`). The other 5 are the Task 3 inhabitation change: over `Opt(Wrap)`
and `Opt(Deep)`, `Nada => 0` was `Missing pattern: Some(_)` and is
accepted, `Nada => 0, _ => 1` was accepted and is E_REDUNDANT (four
harvested sources, and one whitespace mutation of one of them).
Eleven timing tests failed only in the instrumented harvest run (known,
BACKLOG T007); they pass in verify. .build/r004-base, .build/regression
and .build/go-cache deleted afterwards.

## R005 Task 1: surface and resolution (2026-10-16)

What. The Tranche A surface parses and resolves; checking is a
placeholder (Task 2). Two preparatory splits, behaviour-preserving: the
ids, tables, parameters and patterns left Domain.Resolved for
Domain.Resolved.Core (re-exported), and the entry check left
Features.Resolve for Features.Resolve.Entry. Differential of the split
commit against its parent (`--corpus all`, .build/evidence/
r005-t1-split-differential.log): 11,769 cases, 0 differences.

Surface. `where`, `lacks`, `without` and `disjoint` are reserved
(Format.Lex.Chars; the editor grammar's `keyword.control`, regenerated,
and editors/vscode/README.md). `{}` in a type is `RecordRef span []
Nothing`, which resolves to the closed empty record. A record literal
holding `...e` is `RecordExtension Span (Array LiteralItem)`, items in
written order (`Given FieldValue | Spreading Span Expr`); without a
spread it stays `RecordLiteral`. `Spreading`, not the plan's `Spread`:
Syntax already has `Spread` as a row tail. `e without { l, … }` is
`RecordRemoval Span Expr (Array Label)`, a postfix at the level of call,
access and update. `PRecord`'s rest is `Maybe Rest`, `Rest = { span, name
∷ Maybe Label }`; Resolved's is `NoRest | IgnoredRest | NamedRest LocalId`.
A signature's `where c, …` is `constraints ∷ Array Requirement` (the
plan's `Constraint` is a Prim type in PureScript), `Lacks { variable,
span, labels }`; Resolved's also keeps the variable's index. A literal is
chosen on `{ …:` or `{ ...` (Lookahead `literalStart`); a literal is
never a block. The constraint parser is Format.Parse.Constraint; the
constraint's variable is resolved by Features.Resolve.Requirements.

Texts (all at the stated location). A second spread: E_TYPE `A record
literal accepts at most one spread`, at the second spread, refused before
repeated labels. Repeated labels in a literal, `without` or a `lacks`
list: `Duplicate field x` at the second, noted `first written here`. A
rest name repeating a binder: `Duplicate binder x` (the rest name joins
Pattern `binders`, and takes the next LocalId after the field binders; it
is in scope in its arm only). A constraint variable: unknown, `Unbound
type variable zz`; an effect row, `ee is an effect row, not a record
row`; a type variable, new E_TYPE `tv is a type, not a record row`
(approved 2026-10-16). `disjoint` in a constraint reads as `Expected
'lacks'`; `without {}` as `Expected an identifier`. A written lack joins
Resolve/Lacking `lackingOf`, so a body type writing a lacked label beside
the variable resolves with the clause and is `r may already have field a`
without it.

Placeholders (plan table; Task 2 removes them). Check/Infer: `Internal
"R005 placeholder: record extension and removal are checked in Task 2"`
at the expression for `RecordExtension` and `RecordRemoval`.
Check/RecordPattern: `Internal "R005 placeholder: rest binders are
checked in Task 2"` at the pattern for a `NamedRest`; `NoRest` and
`IgnoredRest` behave as R004's false and true did. Case analyses touched:
Check/LocalUses `parts` (real cases, it cannot fail), Check/RecordPattern
(`endsOpen`, total), Resolve/Pattern `binders`, Resolve/Expression, and
the Syntax and Resolved `exprSpan`. Written constraints are resolved and
kept on the resolved FunctionDecl, but checking ignores them until Task 2
seeds them.

Tests. test/r005-parse.test.mjs and r005-resolve.test.mjs: 79 tests, 67
failing before the change (.build/evidence/r005-t1-red.log), all passing
after. Two existing tests state behaviour R005 deliberately changes and
were updated, not weakened: test/r001-types.test.mjs (`{}` in a type was
E_SYNTAX `Expected a type`; it is the empty record) and
test/r004-parse.test.mjs (a rest is `Just` a record with an optional
name; `{ a: n, ... b }` is now a named rest, so the refused-after-rest
case uses `... 3`). No fixture used the four words as names, so none was
renamed. The fx020-row-dependent regression row (scripts/regression-
fx020.mjs) gained a second edit restoring the `maybe` import that the
entry-check split removed from Resolve.purs; its defect is unchanged.

Depth probe (scripts/depth-probe.mjs): summary identical before and
after (every form "none ≤ 65536", 153 anomalies, all E_NESTING
diagnostics); logs r005-t1-depth-before.log and -after.log.

`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: 2054/2054,
59/59, 134 regression proofs, exit 0 (.build/evidence/r005-t1-verify.log).
No regression needle stopped matching; one row (fx020-row-dependent, see
above) needed its restored source to compile.

Differential against the split commit's parent (`--corpus all`,
.build/evidence/r005-t1-differential-all.log): 2 differences in 11,769
cases, both expected and both in the harvested tests that this commit
updated: `fn f(x: {}): Int` (was E_SYNTAX `Expected a type`) and
`{ a: n, ... b }` (was `Expected '}'`, now a named rest). The syntax
and resolved hashes needed projections in scripts/differential.mjs (now
250 lines): a declaration with no `constraints` is compared without the
field, and a record pattern's rest is hashed as before (a span, a
Boolean), as `withoutSorts` did for R001. Without them every source
differed at parse. .build/regression and .build/go-cache deleted.

## R005 Task 2: checking (2026-10-16)

What. The Tranche A forms check; lowering is a placeholder (Task 3). A
preparatory split, behaviour-preserving, moved the record pattern row
helpers (Written, KnownRow, endsOpen, listed, growable, unknown,
writtenLabels) from Features.Check.RecordPattern (247 lines) to
Features.Check.PatternRow; build and the r004/r005 tests passed on it.

Spread (Features.Check.Extension). Items are checked in written order;
the checked node keeps them so (`Checked.RecordExtension (Array
LiteralItem)`, `Given Field | Spreading Expr`). The base's type under the
substitution decides: a record whose known fields hold a literal label is
`Duplicate field l` at the later of the two items in written order,
noted `first written here` at the earlier; a rigid tail must lack each
label, else `r may already have field l` at the label, noted `r is
introduced here` at the signature's first `...r` (Resolve's `introduced`
now travels on Resolved.FunctionDecl); a hole tail is given the labels as
lacks; a hole base is unified with `{ ...ρ }`, ρ fresh and lacking them
(FreshRecord `freshRest`), and judged again; anything else is `Expected a
record, found T` at the spread `...e`. The result is the base's fields
and tail with the literal's fields.

Removal (Features.Check.Removal). Each label in written order through
Check/Record `select`, `.l`'s rule (MissingField at the label,
ExpectedRecord at the receiver; a hole receiver or tail grows over a fresh
tail lacking the label); the result is the receiver's resolved type
without the labels (Domain.Type.Record `withoutLabels`), `{}` when nothing
is left. `{}` is the closed empty TRecord and never unifies with Unit
(`Expected Unit, found {}`, `Expected {}, found Unit`).

Rest binder. Checked `Record (Array FieldPattern) Rest`, `Rest = NoRest |
IgnoredRest | NamedRest LocalId (Ty Open)`: the binder's type is the
expected type, resolved after the fields' checks, without the written
labels (the open tail kept, the closed remainder, or `{}`); it joins the
arm's locals. Walk `foldPattern` visits and `retypePattern` resolves it,
so settlement and hole numbering see it. Coverage is unchanged.

Written lacks. The substitution keeps, beside each tail's lacks set, the
labels a `where` clause wrote with the clause's variable and the label's
span (`Subst.written`, Lacks `writtenOf`/`addWritten`). Seed `required`
joins a signature's clauses after its implied lacks, for the body (rigid
tails, Function `own`) and at every use (the use's metas, Use
`requiredUse`); a label the types already imply keeps no clause, so its
violation keeps the shape text. RecordTail `bindTail` is where a
violation is found: a field the meta lacks, or a lacked label a rigid
rest does not lack, is the new unification failure `Forbidden label
lack` when a clause wrote it (else the mismatch, as before), and a meta
rest inherits the clause with the lack. Require `expectType` (and Reject,
for consumptions) report it through Features.Check.Lacked: E_TYPE `admin
is not allowed here: r lacks { admin }` at the expression being required,
for a call its argument, noted `required here` at the label in the
clause (Problem `LackedField`, note `RequiredHere`). Only the violated
label is named. Paths, each tested at its location: a direct call; a
function reference (`let g = granted; g(p)`); a partial application
(`twice(1)` then applied); a pipe; a lambda passing its parameter on; a
wrapper with its own clause, refused at the outer argument and noted at
the wrapper's clause (inside the wrapper, granted's clause was met by the
wrapper's rigid `s`, which lacks the label by its own clause); a wrapper
without the clause, refused inside it at `granted(q)`'s argument `q`,
noted at granted's clause (the rigid `s` does not lack the label).

Placeholders (plan table). Removed: Check/Infer and Check/RecordPattern
(Task 1). Added: Specialize/Body `R005 placeholder: record extension and
removal are lowered in Task 3` for both expressions and `R005
placeholder: rest binders are lowered in Task 3` for a named rest. Case
analyses given real cases for the new forms: Walk (`foldTypes`, `retype`,
`foldPattern`, `retypePattern`), Failure (`firstFail`, `firstUnkeyed`),
Coverage, Comparable, Printable, DeferNotes `parts`, Instantiation
`foldCalls`, Require and Reject (the new failure), Compose (the new
substitution field). Matrix ignores the rest as before.

Tests. test/r005-check.test.mjs and r005-lacks.test.mjs: 31 tests, all
failing before the change (.build/evidence/r005-t2-red.log), 33 passing
after (two added while implementing: the hole base's shape text, a
lambda passing its parameter on). The three r005-resolve tests that
asserted the Task 1 placeholders now assert `Expected a record, found
Int` for the same sources. scripts/differential.mjs (250 lines) has no
projection for Resolved's new `introduced` or Checked's `Rest`; a
differential was not run for this task.

Regression rows whose needles this task's edits moved, each proved
again (restored defect fails): r004-missing-field and r004-hole-tail
name Check/PatternRow.purs (split commit); r001-lacks restores its
defect at bindTail's new `Array.find forbidden (map fst fields)` (no
field refused); fx020-row-dependent's second edit (restoring the `maybe`
import, Task 1) no longer had a target, since Resolve.purs imports
`maybe` again for `introduced`, so it was removed, the defect unchanged.

`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: 2084/2084,
59/59, 134 regression proofs, exit 0 (.build/evidence/r005-t2-verify.log).
.build/regression and .build/go-cache deleted.

## Unattended evening queue (2026-10-16)

The user accepted R005 Task 2's two choices (a non-record spread is
reported at the whole `...p`; the written-lacks text names only the
violated label). For the evening (until usage runs out) the user
authorized: fast-forwarding each finished item into main after a green
verify, a classified differential and the controller's review (never
pushing); the queue R005 Task 3, R013, hygiene fixes A005, F006 and
F007, a phase profile of `npm run verify` (report only), and an Opus
draft of the Tranche B algorithm (docs only, Proposed); and, where an
item needs a new text or design decision, adopting the proposed one
marked "provisional, needs approval" in the docs. Code tasks run one at
a time so timing tests stay stable.

## R005 Task 3: lowering, evidence, close-out (2026-10-16)

What. Tranche A is complete on branch `record-extension` (extension,
`without`, rest binders, written lacks, `{}`), awaiting the controller's
fast-forward; Tranche B (open-row merge) waits for its algorithm pass.
Commits, in order: the IR split (Domain.IR.Parts, below), lowering, the
reference execution, the example and docs, the regression rows, a needle
fix (r004-go-fields), and the differential's split. No provisional
choice was needed: every user-facing text is an approved one.

Preparatory split, behaviour-preserving. Domain.IR.Internal (243 lines)
lost `recordParts`, `blockParts`, `effectParts` and `itemValue` to
Domain.IR.Parts (49 lines, new importer of Domain.IR.Internal in
scripts/structure.mjs `internalModules` and docs/engineering.md); the six
Format.Go callers import it. Build, r004-go, compiler and structure tests
passed; Go output is unchanged. Likewise scripts/differential.mjs (250
lines) gave its projections and `digest` to scripts/differential-project.mjs.

Lowering. Specialize/Body copies `Checked.RecordExtension` to
`IR.RecordExtension (Array Part)`, `Part = Given Field | Spreading Expr`,
in written order, and `RecordRemoval` to `IR.RecordRemoval expr labels`.
A record pattern's `IR.Record fields rest` has `Rest = NoRest |
IgnoredRest | NamedRest local Ty`; the remainder's type is lowered with
`typed`, which interns its layout whether or not an expression has that
shape (an unused `{ a, ...unused }` over `{ a, b }` emits both structs).
Both placeholders are gone (`grep -rn "R005 placeholder" src` is empty;
the plan's table says removed). Format.Go.Extension (new, 115 lines):
an extension binds each item that could act to a typed temporary in
written order inside an immediately invoked closure (the spread's base is
`waxwingBase`, once; a trivial item is used in place), then builds the
result layout's struct: a field the literal writes is its temporary
(a declared type stored through `&`), every other field is copied from the
base, an ADT pointer as it stands. A removal evaluates its receiver once
and copies the kept fields. A base none of whose fields is copied is
discarded with `_ = waxwingBase` (Go rejects an unused variable); a named
rest in a match arm (Format.Go.Match `bindings`, which now takes the
program's record table) binds a struct of the remaining fields read from
the scrutinee's path and is discarded like any unused binder. Capture
sees the rest binder, Context and Usage the new nodes. The empty layout
is the empty struct. Format.Go.Record exports its temporaries helpers.
bootstrap/*.go are byte-identical except records.go (below).

Tests. test/r005-go.test.mjs, 12 tests executed through Go: 11 failed
before (the Task 2 placeholder; .build/evidence/r005-t3-red.log), the
bare-`...`-unchanged test passed as expected; all pass after. They cover
evaluation order with Console effects (spread first, middle, last), an
open row extended at three rows, removal's receiver once, `{}` printing
beside `()`, equality of empty records, a named rest used, closed, and
unused (two layouts emitted), ADT-valued fields through extension,
removal and rest, and a written-lacks program. The Task 2 test that
asserted the placeholders (test/r005-check.test.mjs) was removed with
them.

Reference execution. The FX001 interpreter (test/fx-oracle-records.mjs,
-expr, -parse) evaluates a literal's spread at its place among the items,
`without`, named rests and `{}` (printed `{}`); a `where` clause is
skipped; no compiler code. test/fx-gen-record-extension.mjs builds
well-typed programs by construction (a fixed type per label; disjoint
spreads; removals of labels the receiver has; rest binders whose body
spreads the remainder beside fields it lacks; generic row extensions with
`where r lacks`), with `tick` effects in items so output order is checked.
test/fx-oracle-record-extension.test.mjs: generated 200, accepted 200,
compared 200, mismatches 0 (seeds 20261017..; forms: extension 194,
removal 196, rest 173, generic 145, empty 162, effects 194, spread first
182, middle 58, last 123, binder used 87). Sensitivity (interpreter
broken, then restored): spreads evaluated last gave 16 mismatches of 200
and failed two hand traces; `without` keeping the named labels failed two
hand traces and the comparison; a rest binding the whole record made the
interpreter throw on the first comparison and failed the comparison test.

Example and docs. examples/records.wxw gained `promote` (extension with
`where r lacks { admin }`), `anonymous` (`without`) and `details` (a named
rest); bootstrap/records.go was regenerated with `waxwing emit` and the
expected output extended in test/compiler.test.mjs. docs/language.md has
the grammar, the four reserved words and the Records text (spread,
`without`, rest binders, written lacks, `{}`); ADR 013 has the section
"Extension, written lacks and removal (R005 Tranche A)" (decisions,
approved texts, the reserved-word break, evaluation order, provenance,
lowering). A sentence in the existing text was corrected: `{}` in a type
is now the empty record.

Regression rows (scripts/regression-r005.mjs, probes test/regression-
r005.mjs), each proved failing with the defect restored and compiling
with 0 warnings (checked with `purs compile --json-errors` on every
mutated copy): `r005-overlap` (Extension: no overlap check),
`r005-overlap-order` (overlap always at the item), `r005-written-use`
(Use: no written lacks at a use; the symptom is E_INTERNAL `Duplicate
record label` at lowering, the call having been accepted),
`r005-provenance` (RecordTail `refused`: clause forgotten, the shape
mismatch), `r005-rest-type` (the rest typed as the whole record),
`r005-go-order` (temporaries sorted by label, the spread first: output
2, 1, 3), `r005-empty-unit` (`{}` unifying with Unit, both directions),
`r005-rest-layout` (the remainder layout interned then forgotten, so
`go build` fails on an undefined struct). r004-go-fields' needle follows
Match.purs's new `IR.Record fields _` (the defect is unchanged).

Gate. `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: 2103/2103,
59/59, 142 regression proofs (134 + 8), exit 0 (.build/evidence/r005-t3-
verify.log). A first run failed at r004-go-fields (needle moved); fixed
and rerun from scratch. The structural gates, width (0 lines over 80) and
purs-tidy pass.

Differential against main (e0aff36 built in an isolated copy;
`--corpus all --regenerate`; .build/evidence/r005-t3-diff.log, with
full lists in r005-t3-diff-harvested.log and -mutations.log). Projections
added in scripts/differential-project.mjs: the resolved declaration's
`introduced` is dropped (Task 2), and the monomorphic IR's record pattern
hashes without its rest when none or bare (Task 3); Task 1's constraints
and boolean rests were already there. Totals: harvested 8,015 sources,
351 differences; fuzz 1,029 + 1,085 isName probes, 0; matches 1,000, 0;
mutations 1,000, 20. Every one of the 371 is in the parse phase, and a
script (not kept) classified each by its baseline or candidate error:
- 20 harvested and 2 mutated sources use `where`, `lacks`, `without` or
  `disjoint` as a name (baseline accepts, candidate E_SYNTAX): the
  reserved-word break, five test variants for each word.
- baseline rejects at the new syntax: 293 harvested and 15 mutated at
  `where`, `without` or a spread's `...`; 27 and 2 at a rest binder's
  name after `...`; 10 and 1 at the `{` of `{}` in a type; 1 at the `{`
  of a literal beginning with a spread.
- no difference in resolve, check, specialize, emit or compile for any
  source both parse (4,735 compiled sources: Go byte-identical).
The harvest run's own test failures are the known timing tests (seven
"linear through Specialize" at 20,000 parameters, BACKLOG T007).

Uncertain or noted. The Go closure for an extension evaluates a trivial
base (a local) in place, so `{ ...p }` with a local `p` and trivial
fields builds the struct with no closure. `{ ...rest }` alone is not a
record pattern (R004: a record pattern names one field); the generator
respects it. The regression harness builds mutated copies with plain
`purs compile`, so 0 warnings was checked separately (above). Files were
deleted afterwards: .build/r005-base, .build/regression, .build/go-cache.

## R013: records-heavy chains (2026-10-16)

Branch `r013` from main 1f3e6ee. `type R<i>(...r) = R<i>({ f<i>: Int,
...r }, R<i+1>(...r));` over N declarations was quadratic after R014.

- Profile (node --cpu-prof, in-process compiles of the built output/;
  .build/evidence/r013-profile-{500,1000,2000}.txt): at N=2,000 about 90%
  of the time was Features.Resolve.ArgumentClash's `declaredLabels`
  worklist, two thirds of it in `gathered` re-reading every visited
  declaration's field syntax (`recordArguments`, `subtypes`) for each
  record argument, the rest in array appends on the worklist. It ran even
  for an argument `...r` with no label, which can never clash.
- Fix. Features.Resolve.ArgumentGraph (new) reads each declaration's
  field syntax once per program: for each record parameter, the labels
  written beside it and the parameters it is passed on to, with an index
  from label name to the declarations writing it. `firstLabel` answers a
  clash by name: the labels of that name other than the argument's own,
  kept only if their declaration is reached from the callee (a loop over
  waves of unseen parameters, so recursive and mutually recursive
  declarations end), the first in source order. Nothing is followed when
  no other label of that name exists, as in the chain. The graph is built
  in Resolve beside the TypeIndices and carried in Scope, a lambda's
  Annotations and ArgumentClash's `Tables` (`argumentGraph`), so body
  types use it too. No behaviour change intended: same checks, same first
  clash in source order, same notes.
- Timing, in-process, 5 interleaved rounds after a warm-up, base main
  1f3e6ee in a .build copy, candidate in the repository root, medians in
  ms (ranges in .build/evidence/r013-timing.log): N=250 121 -> 27;
  N=500 419 -> 45; N=1,000 1,683 -> 81; N=2,000 7,466 -> 175. The
  10,000-type chain 540 -> 526 and r001-scale 215 -> 205 are unchanged.
- Tests. test/r013-argument-graph.test.mjs: 500 generated programs
  (recursive, mutually recursive and diamond declarations, labels drawn
  from four names) compared with a reference of the rule that follows the
  parameter by a plain search; it checks the code, message, span and the
  `first written here` note, and passes on main too. test/r013-scale.test.mjs:
  N=2,000 chains compile within 2 s, and a clash at the far end of a
  labelled chain is reported at the first label with the far label as
  `first written here`. Seen failing on main in an isolated copy
  (7.1, 10.4 and 10.4 s against 2 s; .build/evidence/r013-red.log), green
  here (about 0.2 s).
- Regression needle: r012-argument-clash named `hasRecordParameters
  tables.types` in `clashIn`; it now names `hasArguments
  tables.argumentGraph` (same meaning: the check skipped).
- Differential against 1f3e6ee (`--corpus all --regenerate`): 0
  differences over 8,481 harvested, 1,029 fuzz, 1,085 isName, 1,000 match
  and 1,000 mutation sources (.build/evidence/r013-diff.log). The
  harvest run's 15 failed tests are timing tests under the hook (BACKLOG
  T007).
- Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`):
  2107/2107 parallel, 59/59 serial, 142 regression proofs, exit 0
  (.build/evidence/r013-verify.log). Deleted afterwards: .build/r013-base,
  .build/regression, .build/go-cache.

## Hygiene: F007, F006, A005 (2026-10-16)

Three independent fixes on branch `hygiene`, one commit each, each test
seen failing before its fix (red logs in .build/evidence/hygiene-<id>-red.log).

- F007 (7332c7f). The structural core allowlist admitted every
  Data.Array.* module. It now admits exactly Data.Array and
  Data.Array.NonEmpty, the only two src/ imports; Data.Array.ST,
  Data.Array.ST.Iterator and near-misses are rejected.
  test/structure.test.mjs pins both directions. docs/engineering.md updated.
- F006 (0354a5f). scripts/build-prune.mjs removes every output directory
  whose module name starts with a workspace prefix (the five layers plus
  Style) as well as live modules, so deleted modules lose their output.
  The prefixes come from `layers` in scripts/structure.mjs plus Style.
  Dependency output stays cached, so incremental builds are unchanged.
  test/build-prune.test.mjs works in a temp tree. Checked by hand:
  a planted output/Format.Parse.Zombie vanished on `npm run build`.
- A005 (763379e). `HostCode` (HostUsage, HostIo, HostTool) in Domain.Host;
  Format.Wire's `hostCodeName` is the only place the strings appear. Wire
  output is byte-identical: test/program.test.mjs is unchanged and green.
  test/host-code.test.mjs pins each spelling.
- Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`):
  2112/2112 parallel, 59/59 serial, 142 regression proofs, exit 0
  (.build/evidence/hygiene-verify.log). No regression needle changed.
  Deleted afterwards: .build/regression, .build/go-cache.

## Verify phase profile (2026-10-17)

Measurement only, branch `verify-profile`; no script, test or source
changed. Report: docs/plans/2026-10-17-verify-profile.md; raw data under
`.build/profile/` (git-ignored). From a clean `output` and Go cache on an
idle 10-core host, the phases sum to 1292 s (21.5 min): tidy 0.5 s, build
7.3 s, strict rebuild 16.5 s, structure 1.1 s, width 0.1 s, parallel tests
76 s, serial tests 92.6 s, 142 regression proofs 1098 s (85%). A typical
proof is 7 s, of which 5.7 s is a full purs compile of 523 modules. Warm
Go cache saves about 23 s. Proposals (incremental compiles from a cloned
baseline, concurrent rows) are recorded as BACKLOG T013 and await the
user's approval. Deleted afterwards: .build/regression, .build/go-cache.

## T002 and R011 (2026-10-17)

Branch `t002-r011` from 41f3253; not merged or pushed.

- T002 (1ff8f75, 87a9e82). test/go-batch.mjs builds each batch under
  `.build/go-batches/<id>.<pid>` and removes it on exit and on
  SIGINT/SIGTERM; SIGKILL can still leave one (`rm -rf .build/go-batches`).
  The self-test runs three child processes (test/go-batch-child.mjs) on one
  id. Red first: against the old module all three attempts failed (EEXIST
  on the shared directory). Green after; no `<id>.<pid>` left behind. The
  first version also asserted that the root gained no directory, which
  other files' batches broke under the parallel suite (87a9e82 dropped it).
- R011 (a550787). Format.Go.RecordLayouts computes the emitted layouts: the
  record layouts of every parameter, result, constructor field, arrow,
  effect type, expression, pattern and named-rest type, closed through
  fields (RecordUse's `closed`). RecordHelpers emits structs for those
  only. Specialization keys and layout ids are unchanged. The BACKLOG row's
  `waxwingRec4` is used; the unused ones in bootstrap/records.go were
  `waxwingRec3`, `waxwingRec6` and `waxwingRec8` (three removed, nothing
  else changed; the other snapshots are byte-identical). The scale chain
  now has one struct per shape (test/r011-layouts.test.mjs, shapes + 0
  tails); test/r001-go-keys.test.mjs expects shapes + 1 instead of
  shapes + 2 (get's tail was the extra one).
- Red/green. test/r011-layouts.test.mjs against main: key-only tail,
  two-tails, snapshot and scale-chain rows failed; the rows that guard
  kept layouts (named rest only, nested rest, printed rest, empty record,
  compare-only, held in a constructor field) passed on both. Dropping the
  `NamedRest` type from the roots made five rows fail, then was restored.
- Differential against main (r011-diff.log, harvested/fuzz/matches/
  mutations): lex through specialize had no difference. Emit differed for
  614 of 8,494 harvested sources and 1 mutation. For all 614 harvested,
  stripping from main's Go every struct declaration that nothing else
  names (repeated to a fixed point) gives the candidate's Go exactly; 1,718
  declarations were removed, none unexplained. Fuzz and matches: 0
  differences. The harvest's own test run reported 15 timing or load
  failures (everything runs at once); they are not differences.
- Verify (.build/evidence/t002-r011-verify.log): 2120/2120 parallel,
  59/59 serial, 142 regression proofs, exit 0, including
  `r005-rest-layout`. No regression needle changed. Deleted afterwards:
  .build/regression, .build/go-cache, .build/t002-base.

## R005 Tranche B: the user's D4/D6 review and the plan (2026-10-17)

Branch `r005b-plan` from 97ba05b; documents and research scripts only,
no compiler change, implementation not authorized.

- The user's review of the diagnostics plan is recorded in its §0
  (status: approved 2026-10-17 with corrections). D4 means the checker
  could not resolve the constraints (neither a solution nor a
  contradiction established), not that several solutions exist; D6 an
  established contradiction caused by an equation. Draft 3 of the
  design cross-references it.
- research/open-row-merge/ gained odd-cycle.mjs (no solution, D4),
  unresolved.mjs (Unresolved with 0, 1 and 4 solutions; exit 0),
  diag.mjs (the diagnostics plan's Appendix A script, identical output)
  and three result buckets in perm.mjs. The full campaign (seeds 21-28 ×
  12,000, five orders) reproduced the recorded counts exactly;
  `solvedViolates` 0, `dishonest` 0; D4 with 0/1/several solutions:
  raw 15/15/16,165, dense 1,110/2,395/184,640 (README).
- docs/plans/2026-10-17-open-row-merge-plan.md: the Tranche B plan
  (Task 0 gate, Tasks 1-10, placeholder table, approved texts, 30
  regression rows, claims ledger, fixtures under test/fixtures/r005b/).
  Decisions pending with the user are listed at its end.
- docs/engineering.md has a proposed (not binding) section, "Evidence
  for solvers and diagnostics".

## R005 Tranche B Task 0: the gate's evidence (2026-10-17)

Branch `r005b-task0` from 746ffa7. The user approved Task 0 alone;
Tasks 1-10 are not authorized. Documents, research scripts and fixture
data only: no src change, nothing added to `npm run verify` (so verify
was not run; the width check was).

- docs/plans/2026-10-17-open-row-merge-rules.md: an argument for every
  solving rule, rewrites (preserve solutions, fresh metas accounted for)
  apart from the one defaulting rule (the end default selects the least
  solution), rejections, termination, and labelled heuristics. Two
  findings: the `naming` index is sound but not lossless (ledger L32,
  Task 5 to decide); the termination bound first written counted an
  apart pair once and was corrected.
- research/open-row-merge/exhaustive.mjs: domains A (3,339,712
  problems, 19,305,292 runs, every order) and B (79,825, 453,550): S, H,
  L, E (state solutions equal the problem's), D, C1, C2, C3 and the
  measure bounds hold on every run; three restored defects are caught.
  perm.mjs `STATE=1` over the full campaign: E 0 failures.
- test/fixtures/r005b/: 72 fixtures (every diagnostics example, fix and
  variant; the design's worked examples; P1-P7 and controls; the two
  counterexamples; Appendix B), each with `stages` (solver, check, text,
  run). fixtures.mjs: 0 failing; the asserted Unresolved counts
  (`odd-cycle` 0, `determinate` 1, `diag-01` 4) and their coverage each
  fail when wrong. P1-P7's `before` texts match today's build.
- The plan: ledger completed (34 claims: 22 backed, 4 split, 6
  argument only with reasons, L5 a proof, L34 a question about R1.1);
  test stages and the activation table (most published examples
  compile from Task 7, run from Task 8); task test lists and regression
  rows moved accordingly; the user's decisions recorded (also in the
  design); the substring test withdrawn; estimates marked as planning
  estimates.
- docs/engineering.md "Evidence for solvers and diagnostics" is binding
  with proportional scope. AGENTS.md is unchanged: it does not point to
  docs/engineering.md for solver evidence rules.

## R005 Tranche B Task 1: several-tail representation (2026-10-17)

Branch `r005b-task1` from 2448a3c. The user accepted Task 0 and
authorized Task 1 only (their Task 0 rulings are recorded in the plan's
Decisions 8-13 and ledger). Representation only: no producer makes two
tails, behaviour is unchanged.

- `RecordRow a v = { fields, tails ∷ Array v }`, tails sorted by `v`'s
  order, repeats kept. `recordRow` now needs `Ord v` and skips the sort
  for none or one tail. Domain.Type.RecordSubst (split out of Core in
  its own commit) classifies what each tail became (`Image`) and
  splices all of them; `Domain.Type.rename` replaces the `Functor Ty`
  instance, since a rename can reorder tails and the Functor had no
  `Ord`. `Problem.RecordName` carries `Array String`.
- `FlatRecord.flatten` follows every bound tail with two stacks (a
  10,000-chain, and two at once, cost no stack); `Flat` has `tails`.
  Total over any number: printing, walking, comparing, substituting,
  resolving, lacking facts (`Implied`: one fact per tail), extension
  (each tail must lack the new labels), pattern rows (a closed pattern
  needs every tail a hole), `Specialize.recordType` (each tail's layout
  spliced, the duplicate-label guard covers overlaps).
- Not total, by decision rather than placeholder (the plan's table adds
  Task 2's placeholder later): `UnifyRecord` treats a flattened row of
  several tails as a mismatch. No producer reaches it; Task 2/4 replace
  it with the placeholder and then the rule.
- Tests: test/r005b-row.test.mjs, 9 tests, seen failing against main's
  build (9 of 9, .build/evidence/r005b-t1-red.log) then passing. Five
  existing test files that built or read rows directly (row-substitute,
  r001-printable, -types, -go-keys, -body-types) and the
  regression-r001-body probe follow `tails`; no assertion weakened.
- Differential against main (isolated build, `--corpus all
  --regenerate`): 12,608 cases, 0 differences (harvested 8,494,
  fuzz 1,029, isName 1,085, matches 1,000, mutations 1,000). One
  projection added to scripts/differential-project.mjs: a record row of
  no tail or one is hashed as the old `tail` (`Nothing` or `Just`). It
  is needed: without it a one-record program's resolve hash differs
  (checked on `fn f(x: { a: Int, ...r })`). Harvest-run failures were the
  known T007 timing tests plus the tests above, fixed before verify.
- Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`): exit
  0; 2132 tests, 59 oracle tests, 142 regression proofs. Two earlier
  runs failed in the regression stage and were fixed: needles/
  replacements that named `tail` text. `r001-record-order`'s needle was
  the exact `recordRow` line (now matches `recordRow fields tails =
  { fields: sortFields fields,`, restored defect unchanged);
  `r005-empty-unit`'s replacement used `emptied.tail` (now `Array.null
  emptied.tails`, same defect). Each proved failing with the defect
  restored.
- Sizes: Core 240 lines (was 236), Parts 217, Scheme 228, Lower 222; no
  file over 250.
- Verification record (stated exactly): the full verify above ran on
  83ce639. The final commit 0351225 changed documents only (this
  section, the plan, BACKLOG) and received only the width check
  (`node scripts/width.mjs`, exit 0), which the user approved as
  sufficient for a docs-only commit (2026-10-17).
- Not done: Tasks 2-10, which stay unauthorized.

## R005 Tranche B Task 2: surface (2026-10-17)

Branch `r005b-task2` from main 0351225. The user authorized Task 2 only.
Checking stays behind placeholders; nothing in Tasks 3-10 was started.

- First commit (9df7e01), before the parser could expose several tails:
  Check/UnifyRecord returns `Failure.Placeholder`, rendered as E_INTERNAL
  `R005B placeholder: rows with several tails are checked in Task 4`
  (Check/Placeholder). Constructed-input test
  test/r005b-placeholder.test.mjs (rows built through the compiled
  modules), seen failing first (it reported a plain Mismatch) and then
  passing.
- Second commit: Format.Diagnostic.Records split out (behaviour kept).
- Surface: `{ ...r, ...s }` in record types (tails after the fields;
  `Row tail must be last` at the first tail a field follows; effect rows
  keep `Only one row tail is allowed`, tested); `where r disjoint s`
  (Syntax and Resolved `Disjoint`); D8 at TypeRef for a written record
  and in Resolve.Apart through a declared type that writes two record
  parameters into one record (Resolve.ArgumentPairs computes those
  pairs by a worklist, held in the ArgumentGraph); D9 at the second
  variable; D3 with its hint at the later `...s` for a body type whose
  tails the signature does not join (a clause, or a parameter, result
  or declared type that writes both into one record); and, as the
  design's ArgumentClash pairs, `Duplicate field x` for a label two
  record arguments share where the declaration joins them. Texts and
  locations are the approved rows (D8, D9, D3); no new text.
- Placeholders after this task (`grep -rn "R005B placeholder" src`):
  Check/UnifyRecord (several tails, Task 4) and Check/Placeholder
  `withoutDisjoint` (called by Check/Function and Check/Use, Task 3).
  Field access and removal over a row of several tails read every
  unification failure as a missing field (`a is not a field of ...`),
  a wrong text found by probing; Check/Record `select` now passes the
  placeholder through. A rest binder over several tails kept both
  tails and was accepted where nothing unified them; see the boundary
  fix below.
- Tests: test/r005b-parse.test.mjs (17), r005b-resolve.test.mjs (25),
  r005b-surface.test.mjs (14), r005b-placeholder.test.mjs (4); red log
  .build/evidence/r005b-t2-red.log (against main's build: 15 of 17, 21
  of 25 and 13 of 14 fail; the rest are controls). Two existing
  assertions in test/r005-parse.test.mjs changed meaning on purpose:
  `where r disjoint s` was E_SYNTAX and now parses, and the printed
  shape of `{}` follows the tails array. Regression rows r012-argument-
  lacks and r012-nested-walk had needles naming the one-tail text; both
  updated, same defects, re-proved failing.
- Differential against main (isolated build, `--corpus all
  --regenerate`, .build/evidence/r005b-t2-diff.log and -diff-full.log):
  67 differences, all in the parse phase: 45 sources with several
  record tails (baseline `Only one row tail is allowed`) and 22 with a
  `disjoint` clause (baseline `Expected 'lacks'`), 3 of them mutations
  of such sources that now fail later in the parse. No other
  difference among the corpus. One projection added
  (scripts/differential-project.mjs): a written record type of no tail
  or one is hashed as the old `Maybe`; without it every record type
  would differ.
- Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`): exit
  0 on 0a8f73c, the last code commit; 2191 tests, 59 oracle tests, 142
  regression proofs. Two earlier runs failed in the regression stage on
  the two needles above and were fixed. The docs commit after it
  received only the width check.
- Ruling recorded (plan, ledger and Task 3): one passed lacks fact per
  tail; it does not establish that `r` and `s` are disjoint; Task 3
  tests both, also through a declared-type wrapper.
- Boundary fix (user ruling 2026-10-17, "never called" is no guard): a
  third placeholder, `R005B placeholder: rest binders and removal over
  several tails are typed in Task 7`, from Check/SeveralTails
  `withinOneTail` (the row's tails counted after following bindings).
  It is called by Check/RecordPattern `restOf` for a NAMED rest binder
  and by Check/Removal before any label is selected, so removal no
  longer depends on unification order. Bare `...` creates no value and
  its typing needs no new rule, so it is accepted. Single-tail rest
  and removal are unchanged. Plan table: this placeholder is added in
  Task 2 (moved earlier) and removed in Task 7. Tests in
  test/r005b-surface.test.mjs (unused, returned, used and passed-on
  named rest; removal; bare rest and single-tail controls), red log
  .build/evidence/r005b-t2b-red.log (5 fail first). The `Duplicate
  field x` for overlapping record arguments is reported at the later
  contributor with `first written here` at the earlier, asserted in
  r005b-resolve.test.mjs.
- Boundary-fix evidence: differential against main (isolated build,
  .build/evidence/r005b-t2b-diff.log): 70 differences (68 harvested,
  2 mutations), every listed one in the parse phase and a several-tail
  or `disjoint` source; the count moved from 67 only because the
  harvested corpus gained this fix's new test sources and the mutations
  are regenerated. Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm
  run verify`, .build/evidence/r005b-t2b-verify.log): exit 0 on be42baf,
  the code commit; 2196 tests, 59 oracle tests, 142 regression proofs.
- Gap shipped with this merge (816140a): implied pairs were not seeded
  through declared types, so a call through a wrapper joining two tails
  was accepted though the tails could overlap. Closed by Task 3 (bcdc595);
  see "Bug fixed by Task 3" below.
- Not done: Tasks 3-10, unauthorized.

- Controller check (2026-10-17): the rest/removal fix's differential
  rerun with every difference shown
  (.build/evidence/r005b-t2b-diff-full.log): 70 differences, all in the
  parse phase; main rejected 48 with `Only one row tail is allowed` and 22
  with `Expected 'lacks'`; every one of the 70 sources has several record
  tails or a `disjoint` clause. No later-phase difference.

## R005 Tranche B Task 3: facts and precedence (2026-10-17)

Branch `r005b-task3` from main 816140a. The user authorized Task 3 only
(2026-10-17); Tasks 4-10 were not started.

- Splits first, each behaviour-preserving: 50b8312 moves the lacks and
  written clauses into Features.Check.RowStore (held by `Subst` as
  `store`), adds Features.Check.PartOrigin (empty until Task 6, `origins`)
  and Features.Check.Flex; 67140bc moves `seededUse`/`requiredUse` to
  Check/UseFacts. Differential of 67140bc against main (isolated copies,
  `--corpus all --regenerate`, .build/evidence/r005b-t3-split-diff.log):
  0 differences of 12,686 cases. Regression row `r005-written-use`
  follows the rule to UseFacts (same needle and defect; the defect now
  brings its `Data.Array` import), re-proved.
- The store (32c74fa): `lacks ∷ Map Flex (Map String Lack)`, a `Lack`
  being a `Because` and, for a lack decomposed from a pair, the meta
  whose binding brought the label; `apart ∷ Map Flex (Map Flex Because)`
  (symmetric, rigids and unbound metas only); `arrivedAt` (stamped by the
  bind rule from `site`, which Require `expectType` sets for the
  requirement it checks). `Because` (Check/Because) is `Lacks`,
  `Disjoint`, `Joined` (an implied pair: its variables and the later
  tail's span), `Implied` (an implied lack, no span) and `Spread`;
  `prefer` is the minimum of the derived order (kind, then span), so it
  is commutative and associative and the kept reason never depends on
  arrival order. `Equated`, upper bounds, pending equations and the
  binding reasons arrive with their producers (Tasks 4-5).
- Seeding: Seed `required` always records a written lack (P1-P7) and
  seeds `where r disjoint s` (`Disjoint`); Seed `joined` seeds the pairs
  a signature's or a constructor's types write into one record (option
  A), computed in Resolve (Resolve.Apart `joinedPairs`/`withJoined`,
  through declared types by the argument graph, each at its later tail;
  `Resolved.FunctionDecl.joined`, `CtorInfo.joined`). At a use on the
  use's metas (UseFacts), in a body on the rigids (Function `own`).
- Checking: RecordTail `bindTail` is the bind rule (design §3.2 steps 1,
  3-5, 7, 8): lacks pass on with their reasons; the meta's pairs are
  removed and re-required on its image by Check/Disjoint `requireApart`
  (design §3.1): labels against a meta partner become its lacks (reason
  kept), against a rigid must be hypotheses (D3''); a meta apart from
  itself is bound to `{}`; a rigid twice is D3'; two rigids need the
  hypothesis (D3). A refusal reports by the lack's reason (D1 written,
  D2/D3'' for a pair, the shape text otherwise). Texts are the approved
  rows: D2 `Field a is in both records: r disjoint s` (`first written
  here` at `arrivedAt`, `required here` at the clause or the implying
  type's later tail), D3 (now noted), D3', D3'' (`s is introduced here`,
  `required here`); `CheckEnv` gained `introduced` for D3''. The
  `disjoint` placeholder is removed; left (by text): Check/UnifyRecord's
  several-tail placeholder (Task 4) and Check/SeveralTails' rest/removal
  placeholder (Task 7).
- P1-P7 before/after, each asserted (test/r005b-precedence.test.mjs and
  the fixtures): every one was the shape text on main and is D1 now,
  noted at the clause's label: P1, P2, P3 `Expected { name: Int, ..._
  }, found { admin: Bool, name: Int }` → `admin is not allowed here: r
  lacks { admin }`; P4, P5 `Expected { ..._ }, found { admin: Bool }` →
  the same D1; P6 → `… s lacks { admin }` at w's clause; P7 `Expected {
  name: Int, ..._ }, found { name: Int, ...s }` → D1 at `q`, noted at
  f's clause. The three controls are unchanged.
- Tests: test/r005b-fixtures.test.mjs (runs every fixture from its
  stages; Task 3 activates the 13 the table assigns: P1-P7, three
  controls, `lone-meta-lack`, `-two`, `diag-06-fix`, which also runs
  through Go), r005b-precedence (10 fixtures and three pair-precedence
  probes), r005b-disjoint (17: the plan's list; Decision 14 and the
  user's clarification: with disjointness given, every tail must lack
  the label (D3'' in a body type, Tranche A's shape text at a call),
  and with every tail lacking it, disjointness is still required (D3,
  accepted once stated), each through the wrapper `W(...a, ...b) =
  W(Holder({ ...a, ...b }))`, in a body type and at a call; D2 for a
  wrapper's implied pair at metas; the pair through partial application,
  a reference and a constructor), r005b-prefer (property test).
  Red log .build/evidence/r005b-t3-red.log against main in its isolated
  copy: 7 of 15 fixture tests, 10 of 13 precedence tests, 13 of 15
  disjoint tests and the prefer file fail; with R005B_EXPECT=before all
  ten `before` texts pass exactly. A gap found by those tests on main: a
  call through a wrapper whose types join two tails was accepted though
  the tails could overlap (implied pairs were not seeded).
- Existing expectations changed (L21 checked; none by the precedence):
  Task 2's two `disjoint` placeholder tests now assert acceptance; the
  specialize test's projection drops the constructors' empty `joined`;
  three tests import `Flex` from its new module.
- Regression rows (scripts/regression-r005b.mjs): `r005b-precedence`,
  `-provenance`, `-mixed-lacks`, `-mixed-tails`, `-self-apart`,
  `-body-type`, each proved failing with its defect restored
  (.build/evidence/r005b-t3-rows.log); `r005-provenance`'s needle moved
  to the rewritten bind rule (same defect: the written reason forgotten,
  so the shape text), re-proved.
- Differential against main (isolated copies; .build/evidence/
  r005b-t3-diff.log, classified in r005b-t3-diff-classified.log by
  re-running each source through both builds): 68 differences of 12,736
  cases (harvested 8,622, 68; fuzz 1,029, isName 1,085, matches 1,000,
  mutations 1,000, 0 each). 37 in resolve: in each only the new non-empty
  `joined` differs (checked by hashing both with it removed); of their
  check outcomes 25 are unchanged (placeholders and a mismatch) and 12
  change by disjointness: 4 `disjoint` placeholder → accepted, 2 →
  Tranche A's shape text (Decision 14 at a call), 1 → D2, and 5 accepted
  → refused (D3 1, D2 4: implied pairs now seeded, including through `W`
  and a constructor). 31 in check: 7 are P1-P7 (shape text → D1); 24 are
  `disjoint` sources past the removed placeholder: 12 accepted, D2 5, D3
  2, D3' 2, D3'' 1, D1 1, and 1 `Expected {}, found { x: Int }` (the
  self-apart test's `{ x: 1 }` against the forced `{}`). Every one of
  the 68 is a source of this task's or Task 2's tests; none other. A
  first run reported 3,507 check-phase differences: the checked program
  copies constructors, which gained `joined`; de290d4 projects an empty
  one away (as the resolve phase does), after which the run above.
- Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`,
  .build/evidence/r005b-t3-verify.log): exit 0 on ade35cd, the last code
  commit; 2243 tests, 59 oracle tests, 148 regression proofs (142 + the
  six new rows). The first run, on de290d4, failed in the regression
  stage (.build/evidence/r005b-t3-verify-first.log): row `r001-lacks`
  named `Array.find forbidden`, which the bind rule made `findMap`;
  ade35cd updates the needle (same defect), re-proved. Every needle was then
  checked to have exactly one target. The docs commit after it received
  only the width check.
- Sizes: Subst 224, Use 218, Resolve 238 (no file over 250); new
  Because 75, RowStore 105, Disjoint 68, UseFacts 53, Flex 20,
  PartOrigin 12.
- Not done: Tasks 4-10, unauthorized.

### Bug fixed by Task 3: the wrapper gap (2026-10-17)

Main (from the Task 2 merge, 816140a, until Task 3's bcdc595) accepted a
call through a declared-type wrapper whose types join two tails (`type
W(...a, ...b) = W(Holder({ ...a, ...b }))`, then `k(a, b)` with `w:
W(...r, ...s)`) though the tails could overlap: after Task 2 the implied
pairs were not seeded through declared types. Task 3 seeds them (Seed
`joined`, at a use in UseFacts `joinedUse`), so the differential's five
corrected acceptances are now refusals: one D3 (two rigid tails not known
apart) and four D2 (metas that overlap, through `W` and a constructor).
Regression row `r005b-wrapper-pairs` (mutation: `joinedUse` keeps
`use.state`, discarding the seeded pairs) proves it: the probe asserts D3
at a call with `u lacks { x }, v lacks { x }`, and D2 for
`k({ y: 1 }, { y: 2 })`; with the defect restored the rigid call is
accepted. Regression proofs 149.

User decisions (2026-10-17): implied lacks keep the generic shape text in
Tranche B (D1 is for written clauses only; a future design may extend it).
Mandatory: the Decision 14 tests (a lack through the wrapper at a call)
assert rejection whatever the wording. The `Joined`/`Implied` split of
`Because` and the written order `s disjoint r` are accepted.

## R005 Tranche B Task 4: forced solving (2026-10-17)

Branch `r005b-task4` from main dceec90. The user authorized Task 4 only
(2026-10-17), with six boundaries: forced solving and the three-way
result only (waiting equations and the drain stay Task 5's, behind an
explicit placeholder); placeholders kept for rest/removal (Task 7) and
lowering (Task 8); the complete bind and decomposition rules for several
tails; property E read back independently, with a sensitivity check; the
oracle with placeholder-skipped runs reported apart, by order; a
differential with zero differences for sources without Tranche B syntax.
Tasks 5-10 were not started.

- Code commit e63f7f4. Check/UnifyRecord is the driver of design §2.1,
  one examination at a time (`tailRecM`): flatten; common labels unify
  once each (`rebound` restarts them); Check/RowResidue (multiset
  cancellation, the residue, `Constant`); Check/Homeless (step 4: a
  constant with no meta opposite); Check/SumRule (bound, lack, apart,
  both directions, reasons `Equated`); Check/Narrow (U1-U4: narrowing, a
  bound meta passing it to its image, U2 pruning with the pruning facts
  kept, U4 binding `{}` and recording `emptied`); Check/RowSettle (one
  meta alone, two bare metas newer to older, the shared remainder,
  homes, commits, and the waiting placeholder); Check/Homes (rules §8);
  Check/Commit (commit with `boundBy`, and placing a homeless constant
  anyway so its fact reports itself). Check/RowStore gained `upper`,
  `emptied`, `boundBy`, `equations` and the `changes` counter;
  Check/Because gained `Equated Equation` (ordered by site, then
  identity, last in the precedence); Check/RowBound holds `Atom`,
  `Bound`, `Narrowing`; Check/Refused holds `refusedBy`, shared by the
  rules.
- The three-way result: Check/RowOutcome `Solved Subst | Contradiction
  { failure, because } | Unresolved Subst (NonEmptyArray Pending)`.
  Where each is produced: `outcome` (used by the test entry
  Check/RowEntry) maps a unification's `Right` to `Solved` and any
  failure except a `Placeholder` to `Contradiction`; a `Placeholder` is
  returned apart (`Left` text), never a verdict. Nothing constructs
  `Unresolved` yet: the end of a body does, in Task 5. Inside
  unification a contradiction stays `Left` with its reason, as the plan
  says; Require and Reject render failures as before.
- Bind rule and decomposition, complete (rules §7, §10, §11a). Obligations
  now checked that Task 3's single-tail form (`requireApart`, an image
  against one partner) omitted: a label on both sides of a pair (a
  partner bound since it was stored); the right side's labels against
  the left side's tails; every pair of tails, not one; a rigid rest held
  to the image's own labels (step 5); the image's own pairs of tails;
  every lack passed to each of several rests; U2 on every new lack and
  pair; U3's check and narrowing (steps 2, 6). Each sub-requirement
  flattens its rows when it runs.
- Placeholders (by text; Check/Placeholder adds the `R005B
  placeholder: ` prefix): removed Task 2's `rows with several tails are
  checked in Task 4`; added Check/RowSettle `equations that wait are
  solved in Task 5` (defer and quiet), Specialize/Record `rows with
  several tails are lowered in Task 8`, and, moved earlier from Task 5,
  Check/Lacked `contradictions from equations are reported in Task 6`
  for a refusal whose reason is `Equated`, an `Outside` or a `Derived`
  lack (no source and no generated problem reaches it in Task 4: 0
  `Outside` and 0 `Derived` refusals in the generators). Left from
  before: Check/SeveralTails (Task 7).
- Property E (rules §0, ledger L29): test/row-merge-readback.mjs reads
  the state back from the exported bindings (one level each,
  Check/RowEntry `bindings`) and facts, following the bindings itself
  and never calling the compiler's flattener, enumerates the state's
  solutions and compares the program metas' values with the oracle's
  solutions. Sensitivity: a corrupted traversal (a bound tail inside a
  binding read as empty) differs on 17,904 states of domain A and is
  asserted to be caught in test/row-merge.test.mjs.
- Oracle (level 1). test/row-merge-oracle.mjs is ported from
  research/open-row-merge/oracle.mjs. Results (agreements by verdict
  class; skipped runs are placeholders, never agreements):
  - domain A whole (`node scripts/row-merge-exhaustive.mjs A 9`, 88 s,
    .build/evidence/r005b-t4-exhaustive-A.log): 3,339,712 problems,
    19,305,292 runs; Solved 796,409 (S and L hold), Contradiction
    17,705,571 (no solution), skipped 803,312 (exactly the prototype's
    deferral count); skipped by order position 0-5: 179,462, 174,781,
    132,915, 129,410, 105,753, 80,991; E checked on 796,409 states, 0
    failures; 0 order differences, 0 over the measure or the fresh-meta
    bound, 0 tail occurs.
  - domain B whole (in verify and by the script): 79,825 problems,
    453,550 runs; Solved 177,028, Contradiction 233,144, skipped 43,378
    (by position: 7,054, 6,949, 9,048, 8,758, 4,783, 6,786); 0 defects.
  - one-tail domains (in verify): A 22,308 problems / 122,232 runs, B
    585 / 2,854, equal to test/row-merge-adr013.mjs (an independent
    model of ADR 013's rules) in verdict and solution, none skipped (L1).
  - generators, five orders, 400 problems each (in verify): raw (seed 21)
    Solved 356, Contradiction 1,415, skipped 229 (by position 46, 45, 46,
    44, 48); dense (22) 243, 109, 1,648 (333, 325, 327, 329, 334); raw
    programs (23) 543, 1,421, 36 (9, 6, 7, 7, 7); program-shaped (24)
    960, 669, 371 (70, 86, 73, 73, 69); shared (25) 833, 802, 365 (79,
    78, 73, 65, 70); 0 defects.
  - fixtures: the 25 at solver stage 4 in every order, never waiting,
    each its class; at stage 5 a verdict never contradicts the class and
    every Unresolved run waits (skipped by class: Solved 13,430,
    Unresolved 404, Contradiction 3,355).
  - L31's direct check: 201 excluded homes checked, 0 with a solution,
    20 past the read-back's cap.
  - No disagreement anywhere. Cross-check with the prototype
    (scripts/row-merge-cross.mjs, seeds 21, 2,000 problems per
    generator, .build/evidence/r005b-t4-cross.log): wherever the
    prototype never waited the compiler gives its verdict; wherever it
    waited the compiler is skipped.
- Fixtures activated: the 25 with `stages.solver` 4 run their rows in
  test/row-merge.test.mjs; no fixture has `check`, `text` or `run` 4, so
  test/r005b-fixtures.test.mjs keeps Task 3's 13 (its `task` is 4).
- Regression rows (.build/evidence/r005b-t4-rows.log, each proved
  failing with its defect restored): new `r005b-cancel` (no
  cancellation: swap refused) and `r005b-pruned-reason` (U4 forgets the
  pruning fact: the shape text); needles moved with the code, same
  defects: `r005b-provenance`, `-mixed-lacks`, `-mixed-tails`,
  `-self-apart`, `r005-provenance`, `r001-field-bound-tail`,
  `r001-shared-remainder`. Two probes changed, meaning kept, because
  Task 4's U2/U4 pruning is a second guard that refuses their old
  programs before the restored defect matters: `r001-lacks` (a lone meta
  against a row with a meta of its own, where no bound arises) and
  `r005b-self-apart` (adds `g(p, both(p))`, where only the pair's check
  guards). `r001-lacks` and `r001-record-guard` re-proved.
- Chronology, corrected (user review, 2026-10-18): these tests were not
  written first. The implementation came first; the red was demonstrated
  afterwards by running the new tests against main's build in an
  isolated copy (.build/evidence/r005b-t4-red.log: all 6 of
  test/r005b-unify.test.mjs fail, and both row-merge files, whose entry
  module does not exist there). That is regression sensitivity, not
  test-first.
  Existing expectations changed: Task 2's placeholder tests
  (test/r005b-placeholder.test.mjs, r005b-surface.test.mjs) now assert
  the forced outcomes or Task 5's placeholder; Task 3's constructor test
  checks at the check phase and asserts Task 8's placeholder for the
  compile (the lowering placeholder is the plan's).
- Rules file: §7 and §10 gain Task 4 paragraphs; new §11a, the forms in
  which the port differs from the prototype, each argued (common labels
  once; two bare metas; the shared remainder before homes; a homeless
  constant placed anyway; U4's refusal and U3's check keep the pruning
  fact; live facts only; waiting is a placeholder; the tail occurs guard;
  the counters).
- Sizes: RecordTail 234, RowStore 199, Record 174, Disjoint 161,
  RowEntry 182; new modules 35-143 lines; no file over 250.
- Differential against main (isolated copy built from `git archive main`,
  `--corpus all --regenerate --show 1000`, run on e63f7f4's build,
  .build/evidence/r005b-t4-diff.log, classified in
  r005b-t4-diff-classified.log): 14 differences of 12,742 cases
  (harvested 8,628: 14; fuzz 1,029, isName 1,085, matches 1,000,
  mutations 1,000: 0 each). Sources with neither several record tails
  nor `disjoint`: **0 differences**. Every difference is a Tranche-B
  source (several tails), by category: Task 2's placeholder → accepted
  at check, 6 (`pick`, field read beside two tails, two `swap`s, `wrap(
  pick2)`, `granted2` with one lacking tail; the last two reach Task 8's
  lowering placeholder when compiled); Task 2's placeholder → Task 5's
  (an equation that would wait), 4 (`f({ a: 1 })`, `f(v)` over two rigid
  tails, the unannotated `Both`, `id({ x: 1 })`); Task 2's placeholder →
  a contradiction, 3 (`a is not a field of { ...r, ...s }`; D1 twice for
  `granted2` with both tails lacking, R10.2); accepted → Task 8's
  lowering placeholder, 1 (Task 3's constructor `ap(W)` over `{ y: Int
  }` and `{ z: Int }`). The harvest's own test run exited 1 on timing
  tests only (14, the T007 kind, under the harvest's load); verify runs
  them in its serial phase, where they passed.
- Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`,
  .build/evidence/r005b-t4-verify.log): exit 0 on e63f7f4, the code
  commit; 2262 tests, 59 oracle tests, 151 regression proofs (149 + the
  two new rows). The docs commit after it received only the width check.
- The whole domains and the prototype cross-check were rerun on
  e63f7f4's build after verify, with the results above, identical to the
  runs on the working tree before the commit's last structural split.
- Scale: test/r001-scale.serial.test.mjs's compile of 4,001 keys took
  306-312 ms against main's 293-306 ms (three runs each, same host; bound
  729 ms).
- Actual effort: about 0.6M tokens in one session (the plan's estimate
  was 400k tokens, 6-7 h; an estimate, not a budget).
- Not done: Tasks 5-10, unauthorized. Open for review: Check/Lacked's
  placeholder added early (it covers `Equated`, `Outside` and `Derived`
  refusals; a refusal a commit's binding caused, R10.1, still takes its
  fact's text until Task 6); the U2 pruning is applied by the row rules,
  not by Tranche A's `addLacks` callers (Extension, FreshRecord, seeding):
  a bound they leave holding a lacked atom is less tight, never unsound
  (homes and narrowing read the lacks again), and a scratch check (not
  committed) found no bound left in 88,716 Solved states sampled from
  the generators and domain B; the two probes changed (above).

### Task 4 review fix: the result boundary (2026-10-18)

The user's review found `outcome` mapping every failure but a
placeholder to `Contradiction`, so `TooDeep` and `Unexpected` (verified
in the compiled module) claimed that no solution exists. Fixed in
7f94d1a: `outcome ∷ Either Failure Subst → Either Stop RowOutcome`,
`Stop = Limit | Internal String | Unfinished String`, every failure
constructor classified by name (rules §11b): `Refused`, `Mismatch`,
`Occurs` and the six effect-row refusals are contradictions; `TooDeep`
is `Limit`, `Unexpected` `Internal`, `Placeholder` `Unfinished`. No
diagnostic changed. docs/engineering.md gains the general rule ("Result
boundary classification").

- Tests: test/r005b-outcome.test.mjs injects each stop directly and
  asserts the runner (test/row-merge-entry.mjs `classify`) throws on a
  limit or an internal failure, so the oracle tests and the tools fail
  rather than count a refusal. Written before the fix and seen failing
  against e63f7f4's build (.build/evidence/r005b-t4b-red.log: 4 of 5
  fail, the genuine-contradiction control passes), then passing.
- Follow-ups: the old inputs of the rewritten probes are asserted
  rejected with their current texts (test/r005b-unify.test.mjs); `ap(W)`
  is marked a permanent boundary test; the Task 5 obligation for older
  lack-adding paths is in the plan.
- Reruns on 7f94d1a's build: domain A (.build/evidence/r005b-t4b-
  exhaustive-A.log) and B: verdict counts identical to the above, 0
  defects, no run stopped; the prototype cross-check identical.
- Differential against main (isolated copy, .build/evidence/
  r005b-t4b-diff.log, classified in r005b-t4b-diff-classified.log): the
  same 14 differences in the same five Tranche-B categories; 0 among
  sources without Tranche B syntax (the old probe inputs added as tests
  are among them, unchanged). The harvest's test run again failed only
  on timing tests.
- Verify (`rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`,
  .build/evidence/r005b-t4b-verify.log): exit 0 on 7f94d1a, the fix's
  code commit; 2269 tests, 59 oracle tests, 151 regression proofs. The
  docs commit after it received only the width check.

## R005 Tranche B: alternatives assessment (2026-10-18)

Branch `row-merge-alternatives` from main de8dffc. The user paused
Tranche B before Task 5 to establish whether the custom solver is worth
its cost. docs/plans/2026-10-18-row-merge-alternatives.md assesses it
(status: assessment for the user's decision; no direction change made).
Docs and research only: no compiler source, test or script changed;
nothing built, verify not run (width check only).

- research/row-merge-alternatives/: alternative A (splits never
  inferred; one-tail rules, waiting, end default `{}` checked) and its
  variants AH (with Task 4's one-home commit) and A0 (no deferral), as
  labels-only toys, compared with the current prototype under the
  brute-force oracle on the 72 fixtures, raw and dense generators and
  program shapes; and Z3 (z3-solver 5.3.1, outside the repository) as a
  second oracle: 0 disagreements with the brute force on 2,072 problems,
  0 rejected claims of either solver, with sensitivity shown.
- Findings: A changes 2 fixture verdicts, AH 1 (`design-forced-bound`),
  all Solved to Unresolved, all at `stages.solver` 5; no oracle
  violation for any variant; AH loses no acceptance on 12,000
  program-shape runs; C keeps the F2 family (186 of 392), more proved
  contradictions and 0 order differences.
- Recommendation (for the user): keep the current rules, re-scope Task
  5 to a full-rescan drain with pending equations in the substitution,
  keep AH as a fallback with stated triggers, Z3 as an optional oracle
  outside verify. Tasks 5-10 remain unauthorized.

## R005 Tranche B: re-plan on qualified types (2026-10-18)

Branch `design-principles` from 1b45917 (ADR 014). Under ADR 014 the
user asked for Tranche B to be re-planned on qualified types with row
predicates. docs/plans/2026-10-18-row-merge-qualified-types.md (status:
proposed re-plan under ADR 014; no implementation authorized). Docs and
research only: no compiler source, test or script changed; nothing
built, verify not run, the compiler not run (width check only).

- Design: lacks, disjointness and `Merge` (disjoint union) predicates;
  improvement only when determined, by `Union`'s functional
  dependencies as PureScript solves it, the forward one applied
  symbolically (Task 1's several-tail rows); pairwise improvement;
  entailment by the signature's givens (nothing is generalized);
  `{}` defaulting at the end of a body, otherwise D4 ("annotate"). Each
  component's source is named; N1-N5 are flagged for approval.
- research/row-merge-qt/: labels-only prototype (strict QT and
  symbolic QS, options E, H, C) against the brute-force oracle: 0 S, L
  or H violations on the 72 fixtures, the 19 programs, raw and dense
  seeds 21-24, program shapes and F2; sensitivity shown with five
  mutations. QS-EH: programs 11 and 12 need an annotation (as A),
  programs 16 and `odd-cycle` become proved contradictions; F2 186 of
  392 need one annotated parameter; no acceptance lost on program
  shapes; 2.5 % of raw acceptances lost.
- Re-plan: B0 gate, B1 removal of the sum rule, bounds, homes and
  commits, B2 predicates, B3 diagnostics, then Tasks 7-10 (about
  2.05-2.25M tokens, estimate). Decisions for the user in its §9.
  Tasks 5-10 and B0-B3 remain unauthorized.

## R005 Tranche B: qualified-types evidence follow-up (2026-10-18)

Branch `qt-evidence` from main 976d8c1 (the re-plan marked not
approved, with open findings). Docs and research only; no compiler
source, test, script or test fixture changed; nothing built, verify not
run. The re-plan is not adopted; the 72 fixtures keep their classes.
Results in docs/plans/2026-10-18-row-merge-qualified-types.md §11.

- The four order-dependent raw problems: committed as
  research/row-merge-qt/fixtures/order-*.json with every permutation
  and outcome; cause: solving (a meta that can hold nothing of the
  other side, seen as a repeated tail in one order and as lack and pair
  facts in the other). Repair: rule Z (locally introduced, argued as an
  improving substitution). The exhaustive domain A then showed 38 more,
  from entailment (H's exclusion ignored facts the givens do not
  entail); repaired by `cannotHold`, pinned by two more fixtures.
  QS-EHZ: 0 order differences on raw, dense, shapes and domains A
  (3,339,712 problems) and B, 0 S, L or H violations (measured, not
  proved).
- QT against QS reported side by side; QT and QS agree on the fixtures
  and the 19 programs; Q1 and Q2 (shrunk from generated shapes) are D4
  under QT and need one annotated lambda parameter, which fixes the
  least solution QS infers.
- The three scratch checks committed (research/row-merge-qt/
  qt-checks.mjs) and rerun from the tree, with qt-domains.mjs.
- Sources audited: PureScript pinned at cb3c4965 (Entailment.hs,
  Environment.hs) and purescript-record at 8ebda016; Jones 1992
  (revised), 1995, 2000, Chlipala 2010 and the Haskell 98 Report read
  with sections; Gaster and Jones 1996, Jones 1994 and others not
  accessed. Rules classified as published, adapted or locally
  introduced (N5, H, Z).
- Cost: spent and remaining separated per path (estimates). Open
  findings in §11.7. Tasks 5-10 and B0-B3 remain unauthorized.

## R005 Tranche B: PureScript experiment (2026-10-19)

Branch `purs-experiment` from main 0bab7c7. Research and docs only;
nothing of Waxwing built, verify not run. research/purs-row-experiment/
translates the six order fixtures, five of QT's 29 domain-B order
differences and two controls into legal PureScript over `Prim.Row`
(176 programs: every order, encodings `nub`/`union`, modes `sig`/`gen`)
and compiles each with the installed purs 0.15.16 (tag commit
4c66c05a; Entailment.hs and Environment.hs identical to the audited
cb3c4965). Findings (design §12): with a signature (Waxwing's setting)
PureScript rejects every sampled case in every order; generalizing, it
shows order-dependent acceptance on domain-b-9 and -7 and error kinds on
-3; QT's differences on domain-b-1 and -17 do not occur in PureScript.
The need for N5, H and Z is shown only relative to keeping the
empty-row default. Claims about QT and the zero counts softened in the
design (§11.2). Status unchanged: not approved.

## R005 Tranche B: QT-strict measured (2026-10-19)

Branch `qt-strict` from main 648689c. Research and docs only; nothing
of Waxwing built, verify not run. research/row-merge-qt/qt-strict.mjs
implements QT-strict: PureScript 0.15.16's three `unionRows` cases
(cited by line), entailment by the signature's rows, no pairwise
improvement (none in a signature'd PureScript declaration), no N5, E,
H or Z, and no default for unknowns a waiting predicate constrains.
Five QT artefacts fixed against PureScript's source. Measured beside
QS-EHZ and the current design (design §13): no oracle violation;
acceptance order independent on every family including domains A and
B (7 shape problems differ in verdict class only, pinned by a fixture);
burden lost against the current design raw 36.3 % (QS-EHZ 1.0 %),
dense 78.2 % (28.0 %), shapes 31.5 % (0 %), F2 as QS-EHZ; on the
published examples one more annotation (design-quiet) and three
approved contradictions reported as "annotate". Recommendation (for the
user): QT-strict as the baseline under ADR 014, the need for N5/H/Z
being shown only on synthetic problems. Status unchanged: not approved.

## R005 Tranche B: QT-strict's adaptations Sym and H (2026-10-19)

Branch `qt-adaptations` from main d4d5cf4. Research and docs only;
nothing of Waxwing built, verify not run; fixtures and texts unchanged.
Design §14: Sym (PureScript's cases also with the parts swapped) is
argued to keep solutions, field types and rigid tails included, and
measured with 0 swapped-input differences on every family, a new typed
domain (research/row-merge-qt/qt-typed.mjs) included; H (Contradiction
for a constant no unknown of the other side can hold, at the end,
classification only) leaves acceptance and types unchanged on every
family (asserted) and none of its new Contradictions has a solution.
Each removes QT-strict's 7 verdict-kind order differences on the
shapes. Generality per annotation example: 5 redundant, 3 narrow the
typings by instances nothing uses. Recommendation (for the user):
QT-strict+Sym+H as the baseline candidate. Status: not approved.

## R005 Tranche B: design adopted, implementation re-plan (2026-10-19)

Branch `r005b-replan` from main 1d43341. Docs only; nothing of Waxwing
built, verify not run.

- The user's decisions (2026-10-19), recorded in
  docs/plans/2026-10-18-row-merge-qualified-types.md ("The user's
  decisions (2026-10-19)"): Sym approved; H approved as classification
  only; QT-strict + Sym + H adopted as Tranche B's design. Boundaries:
  Sym needs established disjointness and the closed-part test (closed
  means no tail at all) and preserves field-type equations and rigid
  tails; H runs only after solving and permitted defaulting end
  Unresolved, may establish a Contradiction, and binds, defaults and
  changes acceptance never; order independence is supported by
  measurement, not proved. The annotation cost stays explicit, some
  annotations narrowing typings (S1, S2, Q1). Evidence obligations are
  implementation obligations, not a reason to add N5, Z or other rules.
  Compiler implementation, fixture retirement and diagnostic text
  changes await the review of the implementation plan.
- Status lines updated: design draft 3 superseded as the algorithm; the
  rules and diagnostics files partly superseded; the 2026-10-17 plan
  superseded from Task 5 on; the alternatives assessment superseded;
  BACKLOG R005.
- Implementation plan written:
  docs/plans/2026-10-19-row-merge-implementation-plan.md (draft for the
  user's review; no task authorized). §1 lists every earlier decision as
  retained, modified or superseded, and Tasks 1-4's modules as retained,
  removed (SumRule, Narrow, RowBound, Commit and parts of six others,
  about 560-650 lines, estimate) or modified; §2 specifies the design in
  the compiler (one unknown tail per row, `Merge` predicates made at
  creation, PureScript's cases and Sym, full-rescan re-examination, the
  end of a body with H); migration B0 gate, B1 splits, B2 removal behind
  the existing placeholder, B3 predicates, B4 end and H, B5 diagnostics,
  then Tasks 7, 8, 9, 10a (the module README made authoritative) and 10b,
  with a placeholder table; evidence and permanent tests for Sym, H,
  orders, swapped inputs, association and the annotation cases; the
  retired counterexamples kept as controls with new expected outcomes
  (reclassifications proposed, not applied); estimates about 2.3-2.8M
  tokens, separated from recorded spend.
- Scratch checks run with the research prototype for the plan (not
  committed; Task B0 commits them): under `QT-strict+Sym+H`, S2 is
  accepted unannotated (Sym's case 1'); Q1's smallest annotation is on
  the shared `s`, the re-plan's `p: {}` leaving it Unresolved; programs
  11 and 12 need one annotated parameter each; all 186 F2 programs with
  a least solution are accepted with the shared parameter annotated; on
  the ten fixtures with three unknown tails every tail order and step
  order gives one outcome, and no generated problem has such a row.
- Module README drafted: docs/plans/2026-10-19-row-merge-readme-draft.md
  (final path src/Features/Check/RowMerge/README.md, made authoritative
  and reviewed in the plan's Task 10a). For an ordinary programmer: the
  problem through code, rigid variables, unknowns, waiting constraints
  and defaulting by example, the options weighed (PureScript's
  algorithm, Z3, the custom solver), what comes from PureScript and why
  Sym and H differ, what programmers get and give up (S1 and Q1 narrow;
  S2 needs no annotation with Sym; S3, program 11 and F2 redundant),
  evidence and its limits with commands, and links to the decision
  history. Width check only; nothing built.

## R005 Tranche B Task B0: the gate (2026-10-19)

The user authorized B0 alone (2026-10-19), on branch `r005b-replan`.
Docs and research only; nothing of Waxwing built, verify not run, no
fixture, text, regression row or source changed.

- Rules file docs/plans/2026-10-19-row-merge-rules.md: arguments by kind
  for desugaring, PureScript's cases, case 1g, Sym, re-examination
  (termination argued for acyclic predicate graphs only), defaulting, H
  (with a stable, provenance-based location rule), the self-pair, R10.2,
  and typed and nested rows; the ledger (M1-M18).
- Case 1g is an adaptation, not one of PureScript's cases: it agrees with
  matching a given `Union` where one exists for the same parts,
  orientation and grouping, and is broader elsewhere, where purs 0.15.16
  reports NoInstanceFound (research/purs-given-1g, 6 cases; qt-given.mjs,
  7 cases).
- R10.2: case 2 still binds a part to `{}` (17 of 14,000 runs); 3 runs
  then fail at that meta, each with another order failing otherwise; the
  binding needs its predicate as cause. Not retired; for the user.
- Diagnostics modelled across orders apart from verdict kinds
  (qt-render.mjs): no kind difference; none in H or D4 diagnostics; the
  approved location rule 1 for refusals met while solving varies with
  the order (fixtures 24 of 72, raw 758 and shapes 855 of 2,000).
- Reproduced from the tree (qt-adopted.mjs): S2 accepted unannotated; Q1
  annotated on the shared `s`; program 11 one parameter; F2 186 with one
  annotation; program 16 Contradiction → Unresolved; three-unknown
  fixtures one outcome in every tail and step order; `determinate`
  reported at the second merge, field `a`, under the proposed R11; the
  72 fixtures (three move) and the research controls.
- research/row-merge-typed (new): unknown field types, merges inside
  fields, association, with a unification-based oracle; +Sym+H no
  violation and no order, mirror or grouping difference on 4,000 nested
  and 1,000 association problems; five mutations caught. Unchecked:
  rigid tails with typed or nested rows, deeper nesting, effects.
- Proposals (not applied): docs/plans/2026-10-19-row-merge-proposals.md.
  The plan's §10 decisions updated.
- README draft rewritten (Z3's inherent and binding-specific costs apart,
  two worked examples first, maintenance details last, 1g named) after a
  prose review recorded in docs/plans/2026-10-19-row-merge-readme-review.md
  (humanizer skill and Garner's plain-English concerns; before and after
  catalogues).

## R005 Tranche B: the user's B0 decisions (2026-10-19)

The user accepted Task B0's completed evidence and authorized B1 only;
B2 onward stay unauthorized. Recorded in the plan's §10, the rules file,
BACKLOG R005 and the README draft. Docs only.

- Approved: case 1g broad; its justification is the symbolic disjoint
  union, independently of PureScript's given matching (the agreement is a
  check, not the reason). The fixture reclassifications
  (`design-forced-bound`, `design-quiet`, `diag-14-fix` to Unresolved,
  annotated companions, `same` Unresolved with zero solutions); test
  fixtures are not edited in B1 (B4's fixture step), the old design's
  results stay in research/open-row-merge (fixtures.mjs). The two
  proposed D4 forms and R11, with a required stable tie-break when
  predicates share a source span (allocation identity must not decide).
  R10.2's principle kept (the applicable written fact's diagnostic is
  preferred to D6), causal tracking extended to case-2 bindings. H's
  stable source/provenance location. N5's removal, the S2 correction,
  the module location src/Features/Check/RowMerge/README.md, T1, T3, and
  `Equated`'s removal under T5 once its remaining consumers are
  accounted for. Retiring the obsolete bound-specific regression
  mutations (keeping their behavioural controls, adding the case-2
  provenance regression) alongside the removal of their machinery (B2).
- Gate L1 (termination), blocks B3: an argument covering reachable
  cyclic predicate graphs, or proof that they cannot arise with a test
  of that invariant; the step counter is a `Stop Limit` safeguard, not
  an argument; the acyclic measure must also hold as substitutions
  change edges and share rows.
- Gate L2 (solving-time diagnostics), before that part is implemented: a
  stable-location proposal separating the same conflict at different
  locations under different orders (a provenance fix) from different
  orders finding different valid conflicts first (may need collecting or
  prioritizing, possibly costly), with examples and the smallest
  change; complete order independence of diagnostics is not promised.
- Wording corrected: the prototype renders no text; results are called
  modelled diagnostic selection and location checks, not evidence that
  complete rendered messages are stable (rules file, plan, README draft).

## R005 Tranche B B1: splits (2026-10-19)

Authorized by the user (2026-10-19), B1 only, on branch `r005b-replan`.
Behaviour-preserving splits; no semantic change, no test or fixture
change. Six commits, each built and tested for its area (456 tests of
test/r005*, row-merge*, r001*), 0 warnings, purs-tidy clean:

| Commit | Split | Lines after |
|---|---|---|
| f04903c | Settle: the round's change test, the retry and the label count into SettleChange (as 85ca98e on r005b-task5) | Settle 218, SettleChange 62 |
| 299373e | RowSettle: `placing`, `forced`, `waits` and `equationOf` into RowPlacing; UnifyRecord imports `equationOf` from there | RowSettle 90, RowPlacing 71 |
| fdd83c3 | Disjoint: both `prune` calls behind `prunedTail` | Disjoint 167 |
| 4141629 | RecordTail: `within`, `prunedBy`, `narrowedRests`, the image's constants and `Fields` into RecordTailBound (the unused export of `Fields` goes) | RecordTail 178, RecordTailBound 75 |
| 4159c77 | RowStore: `boundOf`, `withBound`, `withoutBound`, `emptiedOf`, `withEmptied` into RowStoreBound; five importers follow | RowStore 171, RowStoreBound 36 |
| 345e0df | Use: `Use`, `Callee`, `declarationUse` and its helpers into DeclarationUse; Use re-exports them, no importer changes | Use 143, DeclarationUse 90 |

Check/Failure was not split (plan: only if B3 needs it).

- Differential against main (1d43341, isolated copy with .spago, built
  0 warnings), `--corpus all --regenerate`: harvested 8,628 sources,
  fuzz 1,029, isName 1,085, matches 1,000, mutations 1,000; **total
  differences 0** (.build/evidence/r005b-b1-diff.log; the harvest run's
  timing tests failed under parallel load, as the script notes, and
  still harvested).
- Test expectations: `git diff main -- test` is empty; no import path
  changed.
- Regression needles: only the text of `fx008-exit-count` moved (the
  label count, now in SettleChange.purs); its file was updated and the
  row re-proved. The needles of r001-lacks, r001-shared-remainder,
  r005b-provenance, r005b-mixed-lacks, r005b-mixed-tails,
  r005b-self-apart and fx008-settle-phi did not move; all eight were
  proved by name (fixed passes, defect fails).
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` on code commit
  345e0df: exit 0 (tests 2269/2269, 59/59 serial, 151 regression
  proofs; .build/evidence/r005b-b1-verify.log).
- .build/r005b-base, .build/regression and .build/go-cache deleted.

## R005 Tranche B B2: the invented machinery removed (2026-10-19)

Authorized by the user (2026-10-19), B2 only, on branch `r005b-replan`;
one code commit, 1bb23ae (32 files, 1,124 lines out, 295 in). Plan §7
Task B2 lists what was removed and where B2 departed from the file list
(Check/RowPlacing, `Equation`, `boundBy`, `Exam`, `Solving.emptied` and
placeholder P2 removed as left without a producer or a cause; the
case-2 provenance row left for B3, where case 2 first exists).

- Red first (.build/evidence/r005b-b2-red.log, pre-B2 build): 6 new
  tests fail, 37 pass: P1's text (three files), the bound- and
  commit-solved problems skipped in every order, N5's D2, no `Outside`
  or `Derived`.
- Stop condition: the 25 fixtures at `stages.solver` 4 keep their
  classes in every order and none waits. Not triggered.
- Oracle, re-recorded (S, L, H, E, order, measure and fresh-meta
  defects 0 in every family; .build/evidence/r005b-b2-oracle.log and
  -oracle-tallies.log). Solved / Contradiction / skipped, Task 4 → B2:
  - domain A whole (`node scripts/row-merge-exhaustive.mjs A 9`, 79 s,
    .build/evidence/r005b-b2-exhaustive-A.log): 796,409 / 17,705,571 /
    803,312 → 605,079 / 15,026,498 / 3,673,715 of 19,305,292 runs.
  - domain B whole: 177,028 / 233,144 / 43,378 → 109,384 / 153,080 /
    191,086 of 453,550 runs.
  - domain A sample (1 in 50, in verify): 12,704 / 300,191 / 73,067.
  - generators, 400 problems, five orders: raw (21) 356 / 1,415 / 229 →
    292 / 1,387 / 321; dense (22) 243 / 109 / 1,648 → 195 / 83 /
    1,722; raw programs (23) 543 / 1,421 / 36 → 518 / 1,354 / 128;
    program-shaped (24) 960 / 669 / 371 → 931 / 611 / 458; shared (25)
    833 / 802 / 365 → 815 / 728 / 457.
  - stage-5 fixtures, skipped by class: Solved 13,430 → 13,438,
    Unresolved 404, Contradiction 3,355 → 3,363.
  - one-tail domains unchanged (A 22,308 problems, B 585; none skipped).
  Contradiction shrinks as well as Solved, which the plan did not say:
  refusals only the sum rule or a bound established now reach P1; B4's
  H is to re-establish them.
- L31's direct check is gone with `exclusions` (plan §1.2); `admits`
  has no caller until B4.
- Regression rows (.build/evidence/r005b-b2-rows.log, each proved by
  name: fixed passes, defect fails): `r005b-pruned-reason` retired with
  Check/Narrow; `r005b-self-pair` added (N5 restored reads `Expected
  {}, found { x: Int }`); re-proved because their files changed:
  r005b-self-apart, -mixed-lacks, -mixed-tails, -provenance,
  -precedence, -cancel, r005-provenance, r001-lacks,
  r001-shared-remainder, r001-field-bound-tail.
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` on 1bb23ae:
  exit 0 (tests 2269/2269, 59/59 serial, 151 regression proofs;
  .build/evidence/r005b-b2-verify.log). Two earlier runs on amended
  versions of the commit failed and were fixed before this one: a
  PureScript comment line over 80 columns (Because.purs), and five
  tests of test/r005b-surface.test.mjs still asserting P1's old text.
- Differential against the task's base d7efc6d (isolated copy with
  .spago, built 0 warnings), `--corpus all --regenerate`
  (.build/evidence/r005b-b2-diff.log; all nine listed with `--show 50`
  in -diff-harvested.log): fuzz 1,029, isName 1,085, matches 1,000,
  mutations 1,000: 0 differences; harvested 8,629: 9, every one a
  Tranche B source, none without Tranche B syntax:
  - 1 N5's removal: `f({ x: 1 })` with `f = fn(p) => g(p, p)`,
    `Expected {}, found { x: Int }` → D2, same span (planned, §1.2).
  - 5 P1's wording only, same span.
  - 1 accepted at check (a commit) → P1: `granted2({ admin: false })`
    with `s lacks { admin }`.
  - 2 D1 → P1: `granted2(…)` with both tails lacking `admin`, the
    bound-established refusal (R10.2's old path); not among the plan's
    two expected kinds, recorded in plan §7 Task B2.
  The harvest's own test run exited 1 on 14 timing and scale tests
  under the hook's load (as in B1); the same tests pass in verify.
- .build/r005b-base, .build/regression and .build/go-cache deleted.

Nothing later is authorized; gates L1 and L2 are open (plan §10) and
block B3.

## R005 Tranche B: B2 review, gates L1 and L2 (2026-10-19)

The user reviewed B2 (plan §10, decision 14: departures accepted for
this branch; N5's overlap diagnostic confirmed) and authorized L1 and L2
as research and docs work only. B3 stays blocked until both are
reviewed. Nothing merged or pushed.

- B2 correction: B2's test and note named `design-forced-bound` as
  solved by a bound before B2; it was already waiting in every order
  (Task 5's placeholder). Running every fixture's rows in every order
  through the pre-B2 and B2 compilers (.build/evidence/
  r005b-b2-fixture-rows-{before,after}.json) found two displaced
  fixtures: `diag-14` (refused in 16 of 24 orders) and `diag-14-fix`
  (accepted in 16 of 24). The test now uses them; red on the pre-B2
  build (.build/evidence/r005b-b2-correction-red.log), green on B2.
- Recovery obligations O1-O6 (plan §4.7): the two `granted2` refusals
  (D1 before; the prototype refuses them in every order, 0 solutions),
  `diag-14`, the two `granted2` acceptances with one lacking tail
  (Unresolved under the adopted design, 1 and 2 solutions: an
  annotation cost now in plan §5), `diag-14-fix`, and the labels-only
  refusals. Each is to be shown individually in B4/B5.
- T005, the harvest's 14 timing failures: all in `*.serial.test.mjs`
  files, which the harvest ran under the parallel runner. Fixed in
  scripts/differential-load.mjs (the harvest runs as verify does);
  BACKLOG T005 lists the tests and conditions.
- L1 (rules file §5, research/row-merge-qt/qt-termination.mjs and
  qt-cyclic.mjs; .build/evidence/l1-all.log): an argument that a rescan
  makes at most `P · (|Λ| + 1)` productive steps for any predicate graph
  (a lineage's moved labels are pairwise disjoint because the bind rule
  passes lacks to the image). Cyclic graphs are reachable (36,701 of
  159,650 domain-B runs). The B0 height measure was wrong as written.
  Checked with no violation on every family and a cyclic one; the
  trace changed no verdict; the bind-rule half of the premise is
  load-bearing (its mutant loops to the cap). Hooks added to
  qt-strict.mjs and qt-facts.mjs only record; `node qt-adopted.mjs
  controls`, `examples`, `three`, `report` and `node qt-given.mjs` still
  exit 0.
- L2 (docs/plans/2026-10-19-row-merge-locations.md, research/
  row-merge-qt/qt-locate.mjs; .build/evidence/l2-locate.log): the
  order-dependent refusals split into the same conflict (fixtures 18,
  raw 55, shapes 91), the same conflict explained differently (3, 57,
  4) and different conflicts (3, 646, 212); 548 shaped problems past the
  oracle's caps. Proposed: refusals found while re-examining located at
  the latest written participant; no change for the other two.
  Prose-reviewed (humanizer).

## R005 Tranche B B3: merge predicates (2026-10-19)

Authorized by the user (2026-10-19, plan §10 decision 15, with L1
accepted and L2's limited rule approved), on branch `r005b-replan`;
code commit 43490f4. Plan §7 Task B3 lists what was built, the
departures and what is not done.

- Before code: rules §5's Λ tightened (every label in the
  substitution's bindings and the waiting predicates' rows, nested
  included; a rescan cannot enlarge it); O4 recorded as having no
  annotation remedy (plan §5, README draft).
- Red first (.build/evidence/r005b-b3-red.log, the new and changed
  tests against the pre-B3 build): 32 of 60 fail. Many oracle tests
  fail early because the pre-B3 entry has no `finish`, a weaker red
  than a semantic failure; the check-phase tests fail on behaviour.
- Oracle, every family with property E also on runs that end waiting,
  the lineage lemma and the prototype's QT-strict+Sym as second
  reference; 0 S, L, H, E, order, lineage or reference defects
  everywhere. Accept / refuse / waiting (P5):
  - domain A whole (`node scripts/row-merge-exhaustive.mjs A 9`, 411 s,
    .build/evidence/r005b-b3-exhaustive-A.log): 182,332 / 16,583,318 /
    2,539,642 of 19,305,292 runs; E on 182,332 accepted and 2,349,130
    waiting states (B2: 605,079 / 15,026,498 / 3,673,715 skipped).
  - domain B whole (13 s): 8,352 / 104,832 / 340,366 of 453,550; E on
    170,816 waiting states (B2: 109,384 / 153,080 / 191,086).
  - fixtures, every order: 27,051 / 11,964 / 578 of 39,593.
  - generators (400 problems, five orders): raw 260 / 1,475 / 265;
    dense 110 / 0 / 1,890; raw programs 405 / 1,350 / 245; shaped
    680 / 930 / 390; shared 660 / 1,060 / 280.
  Acceptance falls sharply because B2's one-tail rules bound a lone
  meta to a row of two unknown tails and defaulted the rest to `{}`;
  QT-strict leaves what a waiting predicate mentions undefaulted. The
  reference agrees run for run.
- Sym: mirrors of every fixture, domain B whole (453,550 runs, stride 1
  on 2026-10-19; verify samples one in five) and three generators: 0
  differences; association: the ten three-unknown fixtures under every
  renaming and order, one outcome each.
- Order fixtures (research/row-merge-qt/fixtures, purs cases): every
  order up to seven steps, else the recorded ones; plan §4.5's classes
  before H (order-22-* wait, order-A-* and order-S-shapes-1910 refuse,
  the purs cases wait).
- Termination in the compiler: the cyclic family through the entry,
  9,004 runs, no limit; with the bind rule's lack passing removed, 936
  limits (`Exhausted`), the defect `r005b-lineage-lacks` restores.
- Regression rows proved: r005b-lineage-lacks, -case2-reason, -sym,
  -sym-rigid, -one-unknown, -end-fixpoint (.build/evidence/
  r005b-b3-rows-new*.log). `r005b-self-apart`'s second probe changed:
  `both(x): { ...u, ...v } = both(x)` now waits in its own body (a
  recursive use whose result names a variable no parameter fixes: no
  case solves `Merge U ?v {U, V}`; PureScript would match the given by
  functional dependency, which the adopted design does not do), so the
  probe uses a function-typed parameter instead; re-proved.
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` on 43490f4:
  exit 0 (2295/2295, 59/59, 157 regression proofs;
  .build/evidence/r005b-b3-verify.log). Three earlier runs on amended
  versions of the commit failed and were fixed: four test lines over 80
  columns (the files were untracked when I checked widths), then a line
  my fix joined, then the `r005b-self-apart` probe above.
- Differential against 5e65a71 (`--corpus all --regenerate`, harvest
  runs exited 0, 0; .build/evidence/r005b-b3-diff.log): fuzz, isName,
  matches, mutations 0; harvested 8,650 sources, 20 differences, all
  Tranche B sources, most of them B3's new test programs: P1 → P5 8;
  accepted at check → P5 3 (unknown parts no longer defaulted); P1 →
  accepted 1 (nested); P1 → P2 4; ordinary mismatch → P2 2 (typed clash,
  occurs: now attributed to their predicate); `Fail needs a concrete
  error family` → P5 1 (F-7); accepted by both with desugared checked
  types 1 (both then stop at Task 8's lowering placeholder).
- .build/r005b-base, .build/regression and .build/go-cache deleted.

Not done in B3: the typed research domain ported (§3.4); the
`r005b-settle-rollback` row (plan §7 Task B3). M13 is argued in part.
O1-O6 stay open. Nothing later is authorized; B4 waits for the user's
review of B3.

## R005 Tranche B B3 follow-up (2026-10-19)

The user reviewed B3 and did not approve it yet (plan §10 decision 16):
a focused follow-up within the approved rules. Code commit b3ac648;
plan §7 Task B3 "B3 follow-up" lists the results.

- Typed and nested coverage: test/row-merge-typed.test.mjs, the
  research typed families through the compiler, judged against
  research/row-merge-typed's solver (Sym, H off) and oracle (H, S/L,
  G). At the research sizes (`ROW_MERGE_TYPED_SCALE`, .build/evidence/
  r005b-b3f-typed-full.log), no violation: nested seed 1 accepted
  6,393, refused 11,004, waiting 5,939 runs; seed 2 5,897 / 10,255 /
  7,080; assoc 1,872 / 624 / 9,504 (the README's 1,872 of 12,000).
  Sensitivity: case 2 not unifying field types gives G-violated 8 and
  12 (scratch, deleted).
- Rollback at the transaction boundary (test/r005b-rollback.test.mjs,
  constructed state): bindings, waiting predicates, identities, causes,
  lineage history, facts and the fresh counter restored, also through
  a retry; a revert that kept the attempt's row store fails 2 of the 3
  tests (scratch, deleted). A case's unification postponing a new pair
  is shown there too, and settling stops with it set aside.
- M13: rules file §5 checks FX008's 4c premises against the rescan
  callbacks and bounds the pairs cases can postpone.
- Handler rows: a record of two tails in a handler's own row reached the
  invariant guard against a known handler (probe); desugared since,
  with tests.
- Limitations: probes in the compiler (test/r005b-limitations.test.mjs)
  and purs (research/purs-given-1g, 10 cases, all as recorded): purs
  accepts the self-call, the forwarding wrapper and the lambda wrapper
  through its given `Union`, and rejects O4. Proposal for the user:
  docs/plans/2026-10-19-row-merge-limitations.md (case 2g; `node
  qt-2g.mjs 2000`: no violation, verdicts change only waiting →
  accepted, 4 named and 2 of 4,000 shaped runs).
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` on b3ac648:
  exit 0 (2308/2308, 59/59, 157 proofs; .build/evidence/
  r005b-b3f-verify.log).
- Differential against 43490f4 (.build/evidence/r005b-b3f-diff.log):
  fuzz, isName, matches, mutations 0; harvested 8,659, 3 differences,
  all the handler-row fix on its tests (the guard before; now solved,
  P2 and P5). Harvest runs exited 0, 0.
- An empty file `P` at the repository root, made by a shell redirect in
  one of my probe commands, was deleted.

B4 stays blocked; O1-O6 open; the limitations proposal waits for the
user.

## R005 Tranche B B3: case 2g (2026-10-19)

The user accepted the B3 follow-up and approved case 2g and keeping
O4's limitation (plan §10 decision 17), authorizing 2g within B3; B4
stays blocked until this change is reviewed. On branch `r005b-replan`;
code commit ae295d1.

- Red first: the ten focused tests of test/r005b-case2g.test.mjs on the
  pre-2g build, 7 fail (every acceptance and the cancellation test);
  the three waiting or refusing controls pass, as they should.
- **The approved form failed.** Implemented as written (a missing atom
  waits), the parallel suite failed one test: "random problems, five
  orders: program-shaped, shared, seed 25", `orderDiff` 1 (refuse in
  some orders, waiting in others; the second reference with `g2` agreed
  run for run). Without 2g the problem is refused in every order. In
  the waiting orders 2g's precondition held for the mirror of `Merge R
  {a | u} {c}`, R was missing, and the wait kept case 3 from moving `a`
  into `{ c }`. In the prototype before H, `kindDiff` 4 in each of two
  shaped families; with H, none, which is why `qt-2g.mjs` (run with H
  only) had missed it (docs/findings.md "R005 Tranche B: case 2g").
  Variant measured before asking: 2g makes no claim on a missing atom;
  no violation with or without H, and in the compiler `orderDiff` 0
  (.build/evidence/r005b-2g-{asapproved,fall}-tests.tap,
  -variants.log, r005b-2g-fall.diff). The user chose it and amended
  rule 5 (decision 17).
- Implemented as amended (Check/RowMerge/Cases `holdsAll`; case 2 keeps
  its own wait). The counterexample, minimized to six steps, refuses in
  all 720 orders (permanent test).
- Focused tests (11, all pass): rigid cancellation, two rigid tails at
  once, labels beside them, the inputs exchanged (labels-only and
  typed), a missing rigid tail and an unknown in the result (wait), a
  missing label (no 2g; the mirror's case 3 refuses), the
  counterexample, a field-type clash (P2 at the call), nested fields
  (`w` bound to `{ m: Int }`; a later clash on it is an ordinary
  E_TYPE, R10.1 attributing only failures whose rows' tails reach a
  case's binding). test/r005b-limitations.test.mjs: the self-call, the
  forwarding wrapper and the lambda wrapper (with or without its
  annotation) accepted; O4 waits.
- Regression rows (.build/evidence/r005b-2g-rows.log, each: fixed
  passes, defect fails): `r005b-case2g` (2g absent: the self-call
  waits), `r005b-case2g-claim` (the superseded wait: a refusal becomes
  P5), `r005b-case2g-atoms` (the rigid-tail test skipped: an
  unsatisfiable merge accepted). `r005b-sym-rigid`'s probe failed on the
  fixed compiler, because 2g now solves `Merge U ?q U` (q = {}); it
  moved to an unknown result (`fn(q, w) => same(pickR(x, q), w)`) and
  was re-proved, with `r005b-sym`.
- Second reference: test/row-merge-judge.mjs `B3_REFERENCE` has `g2`;
  research/row-merge-qt `g2` is the amended rule, `g2wait` the
  superseded one (kept to reproduce the counterexample). The archived
  research configuration `ADOPTED` (qt-trace.mjs) is unchanged.
- Order checks with and without H (`node qt-2g.mjs 2000`, 90 s,
  .build/evidence/r005b-2g-qt.log): amended 2g, no S, L, H, order or
  mirror violation on named, raw, dense, shaped seeds 1 and 25 and
  domain B whole, both ways; verdict changes waiting → accepted (named
  4, shaped 2 and 6) and waiting → refused (before H: shaped 6 and 14;
  with H: shaped seed 25, 6); none from a verdict to waiting.
  Superseded `g2wait` before H: `kindDiff` 4 and 4 (information only).
- Termination (`node qt-cyclic.mjs all` with `g2`, 103 s,
  .build/evidence/r005b-2g-termination.log): no violation on any family,
  the cyclic one included; in the domain-A sample 68 runs move to
  accepted and 2 to refused. 2g removes a predicate; rules §5 updated.
- Compiler oracle (0 S, L, H, E, order, lineage, reference defects
  everywhere). Accept / refuse / waiting, B3 → 2g:
  - domain A whole (686 s, .build/evidence/r005b-2g-exhaustive-A.log):
    182,332 / 16,583,318 / 2,539,642 → 185,276 / 16,583,450 /
    2,536,566 (2,944 waiting → accepted, 132 waiting → refused).
  - domain B whole (63 s): 8,352 / 104,832 / 340,366, unchanged.
  - fixtures, every order: 27,051 / 11,964 / 578, unchanged.
  - generators: program-shaped 680 / 930 / 390 → 685 / 930 / 385;
    shared 660 / 1,060 / 280, unchanged in total, `orderDiff` 0; raw,
    dense and raw programs unchanged.
  - Sym, domain B at stride 1 (453,550 runs; .build/evidence/
    r005b-2g-sym-stride1.tap, a scratch copy of the test, deleted):
    pass.
  - typed families at the research sizes (.build/evidence/
    r005b-2g-typed-full.log): identical to the follow-up (no rigid
    tails there, so 2g cannot fire).
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` on ae295d1:
  exit 0 (2319/2319, 59/59, 160 regression proofs;
  .build/evidence/r005b-2g-verify.log). The first run, on the commit
  before amending, failed purs-tidy (the 2g condition's wrapping); the
  formatted condition moved two needles, updated and re-proved.
- Differential against c5a6e16 (`--corpus all --regenerate`, harvest
  runs exited 0, 0; .build/evidence/r005b-2g-diff.log, all seven listed
  in -diff-harvested.log): fuzz, isName, matches, mutations 0;
  harvested 8,667, 7 differences, all 2g's new test programs: P5 →
  accepted 5 (the self-call, the wrapper, the lambda wrapper, the
  field-type and nested programs); E_TYPE overlap → P2 2, same span
  (`same(y, x)` after 2g bound y to `{ ...b }`).
- Docs: rules file §3a (2g, the amendment, M20), §4 and §5; the
  limitations doc decided; plan §10 decision 17, §1.3, §2.3, §2.4, §5's
  O4 row, Task B3 and B5; README draft (2g subsection, O4 kept),
  humanizer review of the new passages (one change: the O4 sentence
  states the decision).
- .build/r005b-base, .build/regression and .build/go-cache deleted.

B4 stays blocked until the user reviews 2g. O1-O6 open (O4 kept as a
limitation). B5's hint wording comes back for approval. Nothing merged
or pushed.

## R005 Tranche B B4: the end of a body, H and Unresolved (2026-10-19)

Authorized by the user (plan §10 decision 18, with 2g accepted), on
branch `r005b-replan`; code commit 3157b6d. Plan §7 Task B4 lists what
was built and the departures.

- Red first (.build/evidence/r005b-b4-red.log: the new and changed
  tests against an isolated build of b9f3c45): 40 of 83 fail. The
  solver-level ones fail early, because the pre-B4 entry has no
  `stepped` or `settledSubst` (a weaker red than a behavioural one); the
  check-phase ones fail on behaviour (P5 where P6 or H's refusal is
  due). The three bucket counts each fail when asserted wrong
  (.build/evidence/r005b-b4-buckets-red.log: odd-cycle 1 for 0,
  determinate 2 for 1, diag-01 3 for 4).
- Compiler oracle, the second reference now QT-strict+Sym+2g+H (0 S, L,
  H, E, order, lineage, reference defects; no skipped run anywhere).
  Accept / refuse (of which H) / Unresolved:
  - domain A whole (566 s, .build/evidence/r005b-b4-exhaustive-A.log):
    185,276 / 17,220,172 (636,722) / 1,899,844 of 19,305,292; at 2g
    185,276 / 16,583,450 / 2,536,566 waiting, so H moved 636,722 runs
    from waiting to refused and changed no acceptance.
  - domain B whole (35 s): 8,352 / 130,548 (25,716) / 314,650 of
    453,550, the prototype's numbers with H exactly.
  - fixtures, every order (76 now): 28,011 / 11,988 / 1,274 of 41,273;
    stage 5 by class: Solved 27,229, Unresolved 1,274, Contradiction
    6,882 runs, each order taking its fixture's class.
  - generators (400 problems, five orders): raw 260 / 1,490 (15) / 250;
    dense 110 / 70 (70) / 1,820; raw programs 405 / 1,355 (5) / 240;
    shaped 685 / 960 (30) / 355; shared 660 / 1,085 (25) / 255.
  - typed families (verify's sizes): the reference with H agrees run
    for run, no H, S/L or G violation.
- H as classification only (test/row-merge-h.test.mjs, in verify): H on
  against H off on domain A one in 400 (48,362 runs, H 1,506), domain B
  one in 10 (50,560, H 1,994) and the five generators (5,000, H 75):
  `hDiff` 0 (same verdict or Unresolved where H refused; same state for
  accepted and Unresolved runs). A counting judge is never asked when no
  predicate waits and once per waiting predicate otherwise. diag-14 is
  refused by H alone (Unresolved without it); diag-03 and diag-05 are
  refused before the end.
- Recovery obligations (plan §4.7): O1, O2 H's refusal (P2 at the call);
  O3 diag-14 H's refusal in all 24 orders; O4 Unresolved (P6), kept as
  an accepted limitation; O5 diag-14-fix Unresolved in all 24 orders;
  O6 no run without a solution accepted in either domain, and H's
  refusals counted above against B2's (A 15,026,498, B 153,080 refused).
- Fixtures: design-forced-bound, diag-14-fix, design-quiet Unresolved
  (solutions 1 each), their `-annotated` companions Solved, `same` added
  (0 solutions). The fixture test reached `task` 5, activating diag-06,
  diag-07, design-both-plain (P6) and design-both-annotated,
  diag-07-fix (checked, not lowered). research/open-row-merge
  fixtures.mjs keeps the superseded classes: 76 fixtures, 0 failing;
  `node qt-adopted.mjs controls` and `node qt-fixtures.mjs fixtures`
  exit 0.
- Regression rows (.build/evidence/r005b-b4-rows*.log, each: fixed
  passes, defect fails): new `r005b-h-exclusion`, `-h-binds`, `-quiet`,
  `-predicate-end`; re-proved with changed symptoms: `r005b-sym`,
  `-case2g` (P6), `-case2g-claim` (H's refusal at the predicate's site
  against case 3's at the argument), `-case2g-atoms` (H's refusal),
  `-end-fixpoint` (the end's progress check), `-one-unknown`,
  `-sym-rigid`.
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` on 3157b6d:
  exit 0 (2334/2334, 59/59, 164 regression proofs;
  .build/evidence/r005b-b4-verify.log). The first run, before amending,
  failed the structural gates (`case` on Maybe and Either in
  RowMerge/End where named `maybe`/`either` helpers are required);
  rewritten, and the `r005b-predicate-end` needle moved with it.
- Differential against b9f3c45 (`--corpus all --regenerate`, harvest
  runs exited 0, 0; .build/evidence/r005b-b4-diff.log, all listed in
  -diff-harvested.log): fuzz, isName, matches, mutations 0; harvested
  8,679, 21 differences, every one at the same span: P5 → P6 18; P5 →
  H's contradiction (P2) 3 (diag-14's shape, O1, O2).
- .build/r005b-base, .build/regression and .build/go-cache deleted.

B5 is not authorized. Its hint wording (a lambda annotation where it
helps; the limitation explained for a call's own rows) comes back for
approval first. Nothing merged or pushed.

## R005 Tranche B B5: hint wording approved, texts pinned (2026-10-19)

- The user approved the hint wording (plan §10 decision 20): R9's three
  annotation hints unchanged, offered when at least one candidate part is
  a lambda parameter or comes from a function value passed as an
  argument; wording A for a call's own rows (`no annotation can decide r
  and s, which belong to this call of O`); R9's named-call row amended
  (diagnostics file R9 and Example 6), so diag-06's approved text gains
  that hint; the O4 fact-exclusion note deferred.
- First commit (texts pinned, tests red): diag-06's message; 13 new
  `render-*` fixtures without a literal of two spreads (function
  reference, three parts, partial application, nested field, `holds t`,
  no field, one candidate each, a lambda's parameters, mixed origins,
  the call's own rows (O4); D6 one part, `neither` (H), nested), with
  texts, primaries and notes derived by R1-R11 and the hints of decision
  20; an annotated companion for each of the 9 hinted ones, each
  accepted at check today; participation-control (R10.1's limit,
  passing: its text is not a predicate's). test/r005b-fixtures.test.mjs
  reaches `task` 6 and adds decision 20's companion check (every hinted
  text at its stage has an `-annotated` companion that is Solved or a
  pinned contradiction, never Unresolved).
- Red (.build/evidence/r005b-b5-red.log): 28 pass, 16 fail, each on its
  placeholder (13 P6, 3 P2): diag-06, diag-07, design-both-plain and
  the 13 `render-*` texts. research/open-row-merge `node fixtures.mjs`:
  99 fixtures, 0 failing (the new ones without `rows`).
- **For the user (not decided):**
  1. *D4's primary for a direct call.* The approved diag-06, diag-07 and
     design-both-plain put D4 at the argument; a predicate's site is
     today the use's span, the whole call. Proposed translation decision
     T6: a predicate made from a parameter's written row is sited at
     that argument; one from the result type at the use (the call, the
     partial application or the function value), nested ones inheriting
     theirs (T3). It meets every approved stage-6 location and
     render-call's argument. It does not meet diag-18's approved `p`
     (stage 7): under T6 that D4 is at `merge`, where render-holds is
     pinned (at `pickR`); diag-18's location was approved under draft 3's
     rule "where the equation was deferred", which the adopted design
     has no record of.
  2. *`none of` is not reachable.* With three parts all lacking `x`
     (`pick3` against `noX` with three `lacks`), the program is
     Unresolved, not refused: the chain's intermediate part has no fact,
     so H cannot rule it out. No `render-d6-none` is pinned; the form
     stays for the merge literal (Task 7) if any source reaches it.
  3. *same-name-parts needs a literal.* R1 names a predicate's parts by
     its owner's variables, unique within a declaration, so distinct
     parts printing alike arise only without an owner (lambda parameters
     in a literal of two spreads). Proposed: move the fixture to Task 7.
- The R11 tie-break test, the structural test (no solving module reads
  PartOrigin) and the regression rows come with the code they test.
- Decision 21 (user, 2026-10-20): T6 approved; diag-18's primary
  amended from `p` to `merge` (diagnostics file Example 18 too);
  `render-none-control` (Unresolved; three parts all lacking `x`, no
  solution, H cannot refuse it through the chain's intermediate part)
  and its companion `render-none-control-annotated` (D1, exposing the
  contradiction) pinned; `none of` and `same-name-parts` deferred to
  Task 7. Red: 29 pass, 17 fail, each on its placeholder;
  research/open-row-merge `node fixtures.mjs`: 101 fixtures, 0 failing.

## R005 Tranche B B5: implementation (2026-10-20)

D4 and D6 are rendered; P2 and P6 are gone. Code on top of 29ec312
(splits a90a625, f23d294; the needle fix cc3a089; code and this entry
in 0d5a146).

- **Metadata** (diagnostic only, plan §0 decision 5 of 2026-10-17):
  Check/PartOrigin, held by the substitution. Desugar records each
  occurrence (its predicates, steps from the type's root, parts, the
  tail that replaced them, its row, its location) through
  RowMerge/Occurrence; RowMerge/Use gives it its owner (name, how it
  was used, its variables' names, the written row through the new
  `Resolved.FunctionDecl.syntax` and Check/WrittenRef) and places
  predicates by T6; Check/UseOrigin records the written lacks each use
  states (T4); Check/Lambda records unannotated parameters (R9).
  Check/Required, called from Check/ArgumentOrigin after each argument
  meets its parameter, records where the record supplying a predicate's
  constants is written (R8's third note), from the callee's written
  parameter type or the enclosing function's own (`parameterSyntax` in
  the environment); a loop over an explicit stack, so 80,000-parameter
  callees keep a shallow stack (its first, recursive form failed
  test/fn-linear*.serial in verify; fixed and rerun).
  `UnifyFailure.Cause` gained `within`, the substitution a predicate
  failed in, which the caller's state, taken before the failing step,
  lacks.
- **D4** (Check/Unresolved): R11 orders occurrences by location, field
  path, then where the owner writes the row; R4's constant, R3's
  candidates (through Check/Homes's exclusion test), R1/R2 names, R6's
  path, R9's hints as decision 20 chose them, R8's notes 1 and 3.
- **D6** (Check/Contradicted, Check/Fault, Check/Exclusion): H's refusal
  of an atom no part can hold reads `neither`/`none of`, at T4's
  location with `excluded here` at each fact's reason; an atom a part
  holds that the other side cannot is that part's fault. A case's
  failure names the part at fault: a field (or rigid tail) it holds that
  the other side cannot take, a field it holds at another type, or (R10.1
  extended to case 2) a field of the failing records that a part the
  case closed cannot take. Where no part explains a failure it keeps its
  own text. Format/Diagnostic/Merge writes both texts from
  Domain/Problem/Merge's data.
- **Tests.** test/r005b-fixtures.test.mjs at `task` 6: 46/46 (red
  before: 17 on placeholders). New test/r005b-render.test.mjs: R11
  where the order of making and the source order differ, the structural
  test (no solving module imports the metadata or a renderer), the
  renderer-level `none of` wording, and the predicate-site test moved
  from r005b-predicates. Expectations of P2/P6 replaced with exact texts
  in r005b-case2g, -limitations, -predicates, -surface, -unify (each
  text read against the rules before pinning).
- **Regression rows**: ten new (scripts/regression-r005b-render.mjs:
  `r005b-site-argument`, `-hint-own-call`, `-hint-lambda`,
  `-tie-break`, `-required-callee`, `-required-own`, `-h-location`,
  `-within`, `-case-bound`, `-nested-path`), each proved; the B3/B4
  rows' texts updated (`r005b-case2-reason` now probes a label arriving
  in the part case 2 closed; its type-clash form keeps its own text);
  `fx-label-argument-ambient`'s needle follows the a90a625 split.
  `r005b-participation` not built: see the plan's §8.
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: exit 0
  (2363/2363, 59/59, 174 regression proofs;
  .build/evidence/r005b-b5-verify.log). Runs before it failed on a
  comment 84 columns wide and on Required's recursion (above).
- Differential against 29ec312 (`--corpus all --regenerate`, harvest
  runs exited 0, 0; the resolve projection now leaves out `syntax`, as
  it does `introduced`; .build/evidence/r005b-b5-diff.log): fuzz,
  isName, matches 0; harvested 46, mutations 1, every one at check with
  a placeholder in the baseline: P6 → D4 30; P2 → D6 12; P2 → the
  failure's own text 5 (the cancelled rigid tail twice, the shared
  field's type, a field type against a later requirement, the occurs
  case). No other source changed.
- .build/r005b-base, .build/regression and .build/go-cache deleted.
- **For the user** (B5's departures and findings, none decided):
  1. *Field type clashes.* §2.10 lists field mismatches among D6's
     causes. D6 is given where a part of the predicate holds the field
     at another type (`so r cannot have field b`); a clash between a
     predicate's result and a later requirement (`want(pickR({ a: 1 },
     { b: 2 }))` against `{ a: Bool, b: Int }`) keeps `Expected …,
     found …`, as do the occurs case and the cancelled rigid tails: no
     D6 form says which side of a later requirement is at fault.
  2. *O1, O2* (both parts lack `admin`) read as H's approved D6
     (`neither r nor s can have field admin`, `excluded here` at each
     lack), not D1; a B4 test comment had read R10.2 as preferring D1.
  3. *Names that collide.* An owner's variable and the enclosing
     function's rigid tail can share a name (`pickR's { ...r, ...s }
     must be { ...r }, so s cannot hold s`, in the `r005b-case2g-atoms`
     probe); R3's numbering covers parts only.
  4. *Not yet available*: lambda parameters' names (R1 rule 2; the
     resolved parameter has none) and the `written here` note for a row
     inside a handler's or applied type's argument (WrittenRef names
     fields and arrows only). Both meet Task 7's literal first.
  5. *design-holes* (stage 7) was approved at `k`; under T6 its D4 is at
     `merge`, as diag-18's was amended. To amend with Task 7.
  6. *Order of work.* The structural, R11 and renderer-level tests were
     written after the code; each defect they guard is proved by a
     regression row instead (except the structural test, a source scan).
  7. *Machinery added* (ADR 014 asks for it to be flagged): the
     provenance walk for R8's third note (Required, at arguments) and
     `Cause.within`. Both are diagnostic data read only by the
     renderers; neither is a published primitive, both compose the
     existing unification's results.

## R005 Tranche B B5: review correction (2026-10-20)

- The user's counterexample (plan §10 decision 22): `need(pickR, { a: w,
  b: true })` read `so r cannot have field a`; with `b: 1` it is
  accepted. Check/Fault took unequal resolved types for a clash, and an
  unknown type differs from `Int` while unifying with it. Now
  Check/Clash claims a clash only between different heads neither of
  which is an unbound meta (or such a pair inside one head); otherwise no
  part is blamed and the failure keeps its own text.
- Obligation, stated (docs/engineering.md "Blame needs evidence"): D6
  names a field only when its types are established to conflict. The
  snapshot D6 reads (`Cause.within`) was checked for the user's question:
  bindings made earlier inside the failing case are not in it, so an
  earlier compatible field can look unresolved there; Clash treats that
  as no evidence, which is the conservative reading.
- Tests: test/r005b-render.test.mjs, the family (compatible field
  before the conflicting one, after it, and with the labels' order
  reversed against the literal's), each blaming the conflicting field,
  and each with its value made compatible accepted by checking; row
  `r005b-clash-established` (the inequality test restored blames `a`),
  proved.
- Decisions recorded (§10 decision 22): §2.10 amended for the
  ordinary-text fallback; O1/O2's §4.7 rows corrected; Task 7's
  acceptance items for the gaps; `design-holes`' primary moved to
  `merge` (fixture amended, its requirement note kept). Colliding names:
  wording proposed to the user, not pinned.
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: exit 0
  (2364/2364, 59/59, 175 regression proofs;
  .build/evidence/r005b-b5-fix-verify.log). Width now also reads
  scripts/regression-r005b-render.mjs, untracked when B5's verify ran:
  three of its lines were over 80 and are reflowed.

## R005 Tranche B B5: colliding names, width coverage (2026-10-20)

- Decision 23 (plan §10): the user approved the qualified-name rule and
  its three texts, pinned first in test/r005b-render.test.mjs (red:
  .build/evidence/r005b-b5-names-red.log), then Check/Collision: when a
  callee's part and an enclosing rigid tail share a name in one message,
  the parts take the callee's name and the rigid tails, and a row holding
  them, the enclosing function's; otherwise nothing changes. The
  enclosing name reaches the renderers through the environments'
  `functionName` (pattern checking's environment gained it). Probes
  `r005b-case2g-claim`, `-atoms` updated; new row `r005b-names-collide`.
- Width: scripts/width.mjs now scans untracked files git does not ignore
  (except docs/writing/), shown by an untracked 93-column file the old
  script passed and the new one flags; test/width.test.mjs pins the
  selection; docs/engineering.md updated.
- Performance found on the way, owned: verify failed
  test/fn-linear-timing.serial `partialFirst` (943, then 955 ms; bound
  930). The base (29ec312) misses that bound too (892-1,078 ms alone;
  BACKLOG T003). Measured interleaved against it, B5 had cost: the lambda
  form +28% (1,140 → 1,465 ms), each unannotated parameter appended to an
  array copied per parameter (quadratic); about 2.5% on partialFirst from
  walking a 20,000-arrow parameter for notes no predicate needed. Fixed:
  parameters kept in a map; the argument walk skipped while no occurrence
  exists, the owner pass when a type made no predicate. After: every form
  within -1% to +2% of the base except partialAll +4.9% (527 → 553 ms),
  three rounds each (.build/evidence/r005b-b5-timing.log). The 28% loss
  stayed inside its bound: no automated check catches this class yet; a
  tighter timing row would be flaky under T003's load, so none was added.
- `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify`: exit 0
  (2366/2366, 59/59, 176 regression proofs;
  .build/evidence/r005b-b5-names-verify3.log). Two runs before it failed
  only partialFirst's bound (r005b-b5-names-verify.log, -verify2.log).
- Differential against 29ec312 (`--corpus all --regenerate`, harvest
  exited 0, 0; .build/evidence/r005b-b5-names-diff.log): fuzz, isName,
  matches, mutations 0; harvested 52, each at check with a placeholder in
  the baseline: P6 → D4 31, P2 → D6 16, P2 → the failure's own text 5.
- .build/r005b-base, .build/regression and .build/go-cache deleted.

## R005 Tranche B B5 accepted; Task 7 authorized (2026-10-20)

- The user accepted B5 at 1337bd3 (plan §10 decision 24) and authorized
  Task 7 within the approved plan; no merge or push. The reviewer ran 14
  renderer and width tests, all passing, and read the recorded
  verification, differential and timing evidence; full verify was not
  rerun.
- Kept open, not blocking: the `partialFirst` timing failures, under
  T003 by the base's measurements; the measured 4.9% `partialAll`
  slowdown and the missing automated complexity protection, new BACKLOG
  T014.
- Carried into Task 7's acceptance: `none of` and `same-name-parts`,
  lambda-parameter names, the `written here` note inside a handler's or
  an applied type's argument, and the stage-7 locations under T6.

## R005 Tranche B Task 7: stopped at a checkpoint (2026-10-20)

The author clarified the language requirements
(docs/plans/2026-10-20-composition-acceptance-programs.md) and asked for
a bounded foundation assessment before Task 7 continues; Task 7 stopped
there. Assessment: docs/plans/2026-10-20-composition-foundation-
assessment.md.

- On `r005b-replan`: three behaviour-preserving splits (fa57f41
  Check/Overlap, 0a36ae3 Check/RestBinder, 22d3631 RowMerge/Chain),
  differential against 1337bd3 0 differences (harvested 8,713, fuzz
  1,029, isName 1,085, matches 1,000, mutations 1,000;
  .build/evidence/r005b-t7-split-diff.log). 22d3631 failed one test,
  the structural metadata test (it named Desugar, not Chain), seen in the
  differential's harvest; fixed in 43b3a28 (findings, Task 7, item 1).
  Verify not run on 43b3a28; the record suites (r004, r005, r005b,
  row-merge) were run only on the checkpoint below.
- Checkpoint `r005b-task7-wip` (4d741a1, not for merging): builds with 0
  warnings; does not pass verify; differential and regression rows not
  run. The red log of its tests before the implementation:
  .build/evidence/r005b-t7-red.log (74 failing of 138). On its build:
  every stage-7 fixture matched in a survey (59 of 59, check and text);
  record suites 486 of 493 passing, failing: five tests that pin P3
  (now removed), the hinted-companion test, and the structural test
  (since fixed on `r005b-replan`). Open in it: the `written here` note
  inside an applied type's or handler's argument (started, not built),
  `same-name-parts`, the annotation tests (§4.4), `diag-14` in every
  order of its source, the Task 7 regression rows, docs.
- Findings (docs/findings.md, Task 7): the precedence hiding D2' found
  late (item 3); B5's case-bound blame naming a part the failing record
  is not (item 4).
- .build/r005b-base, .build/r005b-split, .build/regression and
  .build/go-cache deleted.

## Composition foundation assessment, revised (2026-10-20)

- The author reviewed the first version (8d5ec13), committed the
  requirements (eae3188) and asked for a focused revision with probes,
  not a solver. The improvement rule it recommended is withdrawn
  (assessment §4.4).
- Probes added (research/composition-assessment): Koka 3.2.3 on program
  9 (as written refused; wide and masked spellings under one and two
  layers of handlers), Waxwing on the wide spelling (runs, and agrees
  with Koka on handler selection), GHC 9.4.8 on six local helpers with
  and without MonoLocalBinds, Koka on local `fun`/`val`, Waxwing on two
  programs a translation to Simon would refuse.
- Simon (PLDI 2014) read in full and assessed as an algorithmic
  foundation, with a construct-by-construct translation (§4.3); not
  adopted; its four open points are decision 1.
- Found: the checkpoint's lowering of a two-spread literal with known
  rows emits Go that does not build (findings, Task 7, item 5).
- No compiler code changed; verify not run (docs and research only).

## Composition foundation assessment, third revision (2026-10-20)

- Program 11 (one input extended at two field types) added to the
  requirements (§11) at the author's direction; it runs today (generic
  and lambda forms, `0`; negative control D1).
- New probes: Ur/Web 20200209 (programs 3, 6, 11 accepted; 4, 5
  refused), PureScript on program 11 (accepted), Pottier's Wallace toy
  of 2000, built locally with OCaml 5.5.1 (program 11 accepted with
  pending conditionals; facts of program 4 checked only for
  satisfiability; no declarations). Homebrew installed `urweb` and
  `ocaml` (its automatic cleanup ran during the install).
- Assessment §4.8 answers the narrow question: among the systems
  examined, none decides programs 4 and 5 while keeping program 11 and
  checking declared signatures; the conflict is stated on the programs.
  Simon's 2014 "no solver" kept as a historical statement.
- No compiler code changed; verify not run (docs and research only).

## Composition foundation assessment, bounded pass (2026-10-20)

- At the author's direction, one bounded pass over two candidates, with
  no new algorithm: Makholm and Wells (assessment §4.9) and Sulzmann
  (§4.10). Pottier's signature claims scoped (§0, §4.8): the toy lacks
  declarations; his 1998 thesis checks module signatures by a sound,
  incomplete scheme comparison, without concatenation.
- Makholm and Wells: `bowtini` 1.3 built (Moscow ML 2.10.1, Homebrew)
  and run (research/composition-assessment/makholm-wells/). Program 11
  refused (one row per join); program 4's negative control not
  refused (⊥); no declared signatures.
- Sulzmann's thesis (read from the author's ResearchGate copy): HM(RECc)
  axioms REC5-REC6 (Fig. 5.2, rules 6-7) give the deduction from
  `lacks`, and program 11 is kept. Traced on programs 3-6 and 11; seven
  obligations listed (§4.10), including disjointness, a closure rule
  for closed results, a satisfiability test and signature entailment.
- Task 7 stays checkpointed. No compiler code changed; verify not run
  (docs and research only).

## Composition foundation assessment: Wand, Palsberg and Zhao (2026-10-20)

- At the author's direction, Wand (LICS 1989) through Gonzalez's
  reference implementation (b4a63ba, built locally; §4.11) and Palsberg
  and Zhao (I&C 2004, reading; §4.12), in parallel.
- Wand's system infers the splits of programs 4 and 5, refuses their
  negative controls and keeps program 11 (his §5 Theorem, read; shown
  on the programs by the implementation, every call with no residual
  constraints). The third revision's three-program conflict is
  withdrawn (§0, §4.8). Open: disjoint composition, declared
  signatures, unresolved alternatives in compilation.
- Gonzalez's code: residual constraints never tested for
  satisfiability, a self-unification occurs-check failure, nested
  fields not substituted. Verdicts for every probe and the two patches
  are in research/composition-assessment/wand/README.md; both builds
  reproduced byte for byte from a fresh clone.
- Palsberg and Zhao: symmetric concatenation refusing overlap, per-record
  field types, NP-complete inference by search, no row variables or
  signatures; no implementation.
- Next: a statements-first dossier with Wand as the candidate, for the
  author's approval. Task 7 stays checkpointed. No compiler code
  changed; verify not run (docs and research only).

## Record composition dossier, statements first (2026-10-20)

- At the author's direction (definitions, claim statements and
  counterexample exploration only): docs/plans/2026-10-20-record-
  composition-dossier.md. Disjoint composition defined directly (D3)
  and related to Wand's biased composition (C1, C2); the three verdicts
  with what each gives compilation (§2); finding a split, forcing a
  placement and checking a signature as separate claims (C6, C7, C9);
  when alternatives may remain (C8, §4); programs, controls and the
  implementations' counterexamples (§5, §6); claims by status (§7).
- Oracle (research/composition-assessment/oracle/): 18 of 18 checks
  hold over 1,048,576 row pairs; two mutants fail it (biased union;
  D8 without disjointness). C4, C8 and C9 unresolved.
- Awaiting the author's review of the claims. No proofs, solver design
  or compiler change. Verify not run (docs and research only).
- Revised after the author's review (same day): C7 split into presence
  and type (the first statement was false; counterexample `r = { x:
  Bool }` added to the oracle); C10 needs a call-site Contradiction
  beside the instance; verdicts stated separately for calls and
  signatures; author's decisions recorded (refuse unsatisfiable `where`
  clauses, Unresolved when undecided; require a forced or written split
  until C8 is established for a fragment); C8 restated for a fragment;
  the oracle is bounded evidence only. Oracle: 23 of 23; three mutants
  fail it. Proofs await approval of the revised statements.

## Record composition: first proof milestone (2026-10-20)

- Authorized after the dossier's second revision. Dossier §2 made
  precise first: Solved keeps the binding equations `eq(σ)`; signature
  failure is the false quantified statement, not unsatisfiability of
  `D ∧ B`.
- Lean 4.35.0 (elan via Homebrew; `~/.elan` 2.8 GB), no Mathlib:
  research/composition-proofs/. Proved: C1, C2 (and D7 = biased), C7a,
  C7b, the refutation of the first C7, signature failure's
  characterization, C10's evidence principle, C11, §2.2's example, and
  programs 3 (overlap), 4, 4 without `lacks`, 5, 6, 11 with their
  negative controls. Clean build, no warnings, no `sorry`; axioms:
  `propext`, `Quot.sound`, and `Classical.choice` in `sigFails_iff`
  only. Mutant: program 4 without its `lacks` fails its placement
  proofs.
- Not formalized: §2.1's binding equations, C3, C4, C8, C9; the step
  from Waxwing source to each program's constraint (written by hand).
- Awaiting the author's review of the exact statements (dossier §9).
  No decision procedure or compiler change. Verify not run (docs,
  research and proofs only).

## Record composition: call-site foundation, second milestone (2026-10-20)

- The author accepted the first milestone with qualifications (finite
  witnesses for later existence results; no algorithm proved; six-label
  examples), recorded in dossier §9.
- Proved (Lean, research/composition-proofs/): constraint syntax with
  nested type expressions, type and row variables, and records as
  fields plus tails; partial composition's algebra (associativity,
  permutation, flattening, domains); substitution with row bindings;
  `subst_sat` and `binding_correspondence` (a problem that entails its
  binding equations has exactly the solutions of the equations plus the
  substituted problem); `bindings_needed` (the `x = true` example).
  Clean build, no `sorry`; axioms `propext`, `Quot.sound`,
  `Classical.choice` (composition defined classically). Mutant: `lacks`
  ignoring a bound row's fields fails `subst_lacks`.
- Stated, not proved (Reduction.lean, `Prop` definitions): R1
  (existential reduction to written labels; no stand-in needed at a
  call site), R2 (presence patterns with a fresh type variable per row
  and label), R2′ (closedness), R3 (closed-problem decider spec;
  meaningful only for a computable definition). Dossier §10 has the
  statements, the unnamed-label and field-independence discussion, and
  the proof plan with its known obstacles.
- Awaiting the author's review of the reduction statements before any
  proof. No compiler change; verify not run (docs, research, proofs).
- Reduction statements revised after the author's review (directional
  evaluation lemma; freshness only for the finite pairs used, with an
  explicit allocation; R2 by the pointwise correspondence, preserving
  existence across patterns, not one pattern's solutions; `DecidableEq
  B` for R3), then proved: R1, R2, R2′, R2Enum (2^|pairs| patterns
  cover all), `freshAlloc_fresh`. Clean build, no `sorry`. Mutant: one
  shared fresh variable per label fails `r2_forward`.
- R3 proposed in dossier §11 (Robinson/Martelli-Montanari unification
  on closed problems; lexicographic measure; U1 soundness, U2
  completeness, U3 termination; call-site decider over patterns), not
  implemented. Awaiting the author's review.

## Record composition: closed-problem decider, third milestone (2026-10-20)

- Authorized after the reduction milestone was accepted. Proved in
  Lean: the unifier (Robinson/Martelli-Montanari on closed problems,
  records one field at a time) terminates (U3), is sound (U1) and
  complete (U2); R3 for `decideClosed`; call-site decidability
  (`decideCall_correct`). The occurs check is justified against `G`
  itself (immediate parts well-founded by `G`'s induction); eliminated
  bindings through the binding equation, witnesses rebuilt as the
  recursion returns (chains checked).
- Executable `#guard` examples (programs 3, 4, 5, 11, controls,
  Gonzalez's three counterexamples, occurs, chains, repeated label) all
  as expected; evaluator-checked, not kernel-checked. Mutant: a
  base-type mismatch answering true fails `unify_sound`.
- Clean build, no `sorry`. Not covered: selecting a split, Solved with
  residual, C8, C9, compiler integration. Awaiting the author's review.
  Verify not run (docs, research, proofs only).

## Record composition: C9 (signature checking), statements first (2026-10-20)

- The author accepted the R3 milestone. Proof README corrected (the
  decider is written). Dossier §13: the quantified language (rigid and
  flexible variables, `D` over rigid only, every flexible variable may
  depend on every rigid one), the account of unnamed labels in rigid
  rows (written part and rest; rests may be non-empty and may overlap
  unless declared disjoint; R1 does not transfer), procedure P9
  (patterns over rigid rows, rigid type and rest constants, a
  declared-disjointness side condition), its sources and departures,
  and claims S1-S5, all unproved.
- Lean (Sig/): `Valid` and checked examples: satisfiable but invalid
  (`lacks`, rigid type), `unnamed_labels_matter` (valid over rows
  restricted to written labels, invalid in general), program 6 valid,
  and a signature valid only with a rigid-dependent flexible solution.
  Clean build, no `sorry`. No procedure written. Awaiting review.
- Review (same day) refuted P9's completeness (`splitSig`: a valid
  signature divides a rigid row's unwritten labels by membership in
  another) and S5's hard instances (`recSig`: a row variable absorbs a
  fresh record); both checked in Lean (Sig/Adversarial.lean). Dossier
  §13.7: restrictions table with a challenge per restriction; P9
  reclassified as a candidate sound, incomplete checker (failure is
  Unresolved); S1's side condition widened to every requirement that
  two rests be disjoint (found in the soundness pass); region
  representation and a bounded ∀∃ oracle proposed. Rests wording
  corrected (they may be equal). New review convention in
  docs/engineering.md: adversarial review of proposed procedures.

## Signature checking: bounded ∀∃ oracle and BAPA reading (2026-10-20)

- research/composition-assessment/sig-oracle/: bounded validity vs P9s,
  20 hand challenges (all as predicted after two recorded corrections)
  and 8000 generated problems: no case of P9s accepting a problem
  invalid in the bounded model; incompleteness only in the `split`
  shape (rediscovered by a split-biased grammar). Power check: P9s
  without its side condition gives 15 candidate unsoundnesses in 300,
  each confirmed with larger bounds. Bounded evidence; S1 unresolved.
- research/composition-assessment/bapa/: Kuncak, Nguyen and Rinard (JAR
  2006) read in full: the presence part of signature problems fits BAPA
  (∀∃ over sets, decidable); BAPA lets existential sets take part of a
  region and counts matter beyond emptiness, so CR as stated is not
  supported; per-label field types are outside everything read.
  Dossier §13.8. Wording fixed: the proposed hard-instance construction
  fails; no impossibility claimed. No proofs, no compiler change.

## Signature checking: P9s soundness, statements first (2026-10-20)

- The author's review of §13.8: two tracks (P9s soundness as the bounded
  proof target; complete typed checking still research); a proved P9s
  would not approve its limitations as final behaviour. Recorded in
  dossier §13.9 with the region questions Q1-Q3 kept as questions and
  the presence-to-BAPA translation stated with its obligations. Found:
  Lean `Valid` ranges over arbitrary partial maps, Waxwing over finite
  rows; a ∀∃ result does not carry over automatically.
- Dossier §14: the generic model (W1-W3), disjointness obligations
  (D1-D2), acceptance rule (a checkable certificate per pattern), the
  interpretation `h`, statements L1-L4, S1, S1-fin; restrictions table
  for the soundness pass. Nothing proved; awaiting the author's
  approval of the statements.
- sig-oracle: claim-level check of `h` (interpret.mjs,
  check-interpretation.mjs): 0 failures over 261,950 instances
  (`1000 5`) and 6,255,998 (`300 9 larger`); the mutant without the
  side condition fails L2 and L4. Three challenges added (23, all as
  predicted). Generators moved to grammar.mjs; both recorded generated
  runs reproduce exactly.
- Adversarial reviewer: no counterexample to S1; corrections taken
  (absent-label constants, L4's rigid `lacks` reason, S1-fin needs a
  finite `c`, two table rows claimed checks that never ran, three §13.9
  slips). Verify not run (docs and research only).

## Signature checking: P9s soundness proved in Lean (2026-10-20)

- The author approved proof work on L1-L4, S1, S1-fin with two
  clarifications (semantic vs executable certificates; L3's scope) and
  decided: S1-fin primary; `Valid` renamed `ValidAll`, `ValidFin` added;
  the rest encoding authorized for proof under ADR 014, not for the
  compiler. Dossier §14.8.
- Lean (Sig/Finite, Generic, Interp, Commute, FinitePres, Soundness):
  `s1 : Accepts P → ValidAll P` and `s1_fin : Accepts P → ValidFin P`
  with L1-L4. Clean build, no warnings, no `sorry`, standard axioms.
  Mutants with D1 or D2 weakened to `True` break L4's equation and
  `disjoint` cases.
- Found during formalization, for the author's review: the proof needs
  neither W1 nor W2, and W3 only on values equations build (D1), so the
  theorem assumes less than §14.2 states.
- sig-oracle: deliberate certificates (standalone constants, rigid
  record types, nested rigid fields) and a `rich` rigid domain: 0
  failures (162, 352, 6,864, 242,354 instances); corrupting `h` makes
  L3 fail. Verify not run (docs, research and proofs only).

## Signature checking: certificate checker, statements first (2026-10-20)

- The author accepted the P9s soundness milestone, weakened premises
  included (`Accepts` still requires finite certificates); P9s is not
  adopted. Recorded at the end of dossier §14.8.
- Dossier §15: statements for a verified checker of finite syntactic
  certificates (K1-K6: finite denotation, decision correctness,
  evaluator agreement, one pattern, pattern coverage, checker implies
  `Accepts`), sources (certifying algorithms, translation validation),
  restrictions table, proposed `#guard` evidence with oracle-exported
  certificates. K7 (no loss against `Accepts`) stated as unresolved,
  not proposed. Adversarial review: no false statement; six
  corrections applied. Nothing written in Lean; awaiting approval.

## Signature checking: verified certificate checker (2026-10-20)

- The author approved K1-K6 and the file plan, kept K7 out, accepted the
  `DecidableEq` assumptions, and asked for three details (duplicate
  bindings, certificate tables, duplicates only in the representation)
  and a wording fix (an impossible `D` makes `ValidAll`/`ValidFin`
  vacuous, not `Accepts`). Dossier §15.7.
- Lean (Sig/Syntactic, Check, WellFormed, Decide, Patterns): K1-K6
  proved; `checkAll_validFin : checkAll P T = true → ValidFin P`.
  `checkAll` computable (no `Classical.choice`). Clean build, no
  warnings, no `sorry`.
- Evidence: sig-oracle/export-lean.mjs exports the untrusted search's
  certificates (49 problems) to Sig/CheckData.lean (generated); all pass
  `checkAll`. Boundary `#guard`s: omitted, shadowed and reordered
  entries and bindings, missing table entries, broken certificates,
  duplicates vs overlapping compositions. Mutant without D2 in
  `checkAtom`: K4's proof breaks, and the broken-certificate `#guard`
  fails. Verify not run (docs, research and proofs only).

## Signature checking: K7 statements (2026-10-20)

- The author accepted the certificate-checker milestone (general
  implication kernel-checked; the 49 acceptances are evaluator
  `#guard`s). Dossier §16: statements for K7, no loss against
  `Accepts` (`Accepts P ↔ ∃ T, checkAll P T = true` with K6), via
  congruence (K7a), representation (K7b) and the checker's
  completeness per atom (K7c); optional K8, `¬ Accepts splitSig`
  (P9s's incompleteness in the model). Adversarial review: no false
  statement; K7d dropped as unnecessary; a lifting lemma added; K8
  proved by the reviewer in scratch (not in the repository). Nothing
  proved in the repository; awaiting approval.

## Signature checking: K7 and K8 proved (2026-10-20)

- The author approved K7a-K7c, the lifting lemma, K7, and K8 with
  `ValidFin splitSig`. Dossier §16.5.
- Lean (Sig/Congr, Represent, Complete, SplitNotAccepted):
  `accepts_iff_checkAll : Accepts P ↔ ∃ T, checkAll P T = true`;
  `splitSig_not_accepts`, `splitSig_validFin`;
  `semantic_rule_boundary`: every signature the semantic rule admits
  has a finite table the checker accepts, and some valid signatures are
  excluded by that rule. Clean build, no warnings, no `sorry`.
  Mutant: the K8 script on `splitSig` plus `disjoint 0 1` fails at the
  undeclared-pair step. Verify not run (docs and proofs only).

## Signature checking: source-level boundary (2026-10-20)

- The author accepted K7 and K8. Dossier §17: Waxwing functions with
  hand-translated signature problems (rules in §17.1, from
  docs/language.md). Certified, each kernel-checked by `decide`:
  `greeting`, `mark`, `markAll`, `join`, `forwarded`, `join3`, `both`,
  `wrapAccepts`, and `route` narrowed with `r disjoint s`. Invalid
  controls Unresolved. `route` (a generic caller of a two-tailed
  `divide` with per-part `disjoint` clauses) is valid
  (`routeSig_validFin`) and refused (`routeSig_not_accepts`): the split
  pattern arises from the intended fragment, though no acceptance
  program has that shape.
- `exported_all_pass`: all 58 exported certificate tables kernel-checked
  by `decide` (the earlier 49 were evaluator `#guard`s).
- Verify not run (docs, research and proofs only).

## Signature checking: dividing rigid rows, research proposal (2026-10-20)

- The author accepted §17 and directed research on dividing rigid rests
  before compiler integration, with P9s as the conservative baseline;
  two wording corrections applied (§17.3, §17.4).
- Source reading (research/composition-assessment/division/, three
  notes by independent readers): Boolean elimination gives term
  witnesses in any Boolean algebra (Martin and Nipkow 1989); Flix
  implements ∀∃ Boolean unification with rigid constants (OOPSLA 2020)
  but no system handles hypotheses relating rigid variables; typed row
  theories (Rose, Rω, Ur) cannot derive a split. Gaps: finite rows (a
  ring without unit), written labels as constants, per-label types.
- Dossier §18: the capability (term witnesses), statements D1-D4 for
  approval, restrictions table (whole regions not assumed; a
  type-agreement placement challenge), next steps. Nothing proved, no
  solver.

## Signature checking: typed term-witness oracle, first pass (2026-10-20)

- The author approved the typed bounded oracle and asked for D1-D3 to be
  amended: D1 a proposed adaptation with obligations O1-O3 (finite rows,
  exact written/rest split, written choices per pattern); D2 requires
  uniform witnesses per pattern; D3 split into D3a (typed term
  witnesses) and D3b (a generic instance, respecting hypotheses that
  force agreement). Dossier §18.6.
- sig-oracle/templates.mjs, typed-oracle.mjs: bounded validity, uniform
  templates per pattern (exhaustive over cells and field sources) and
  per-assignment templates, kept independent. 36 named problems and 600
  generated (seeds 3, 11): no separation; `route` and `split` have
  uniform templates, also at larger bounds. Power checks in scratch
  copies. Nested-record problems excluded from this pass. §18.7.
- Stopped at the oracle results and revised statements, as directed. No
  proofs, no D4, no compiler change.

## Signature checking: typed oracle, second pass (nested records) (2026-10-21)

- Grammar and bounds fixed in the dossier before running (§18.8). The
  decomposed search (blocks by Venn cell) had a projection bug, caught
  by the cross-check against the first-pass engine and fixed; an
  independent brute-force search agrees on nested problems. The
  specified grammar lacked written fields at nested tail nodes (P9s's
  own witnesses fall outside it); an amended grammar, recorded as
  amended after a run, gives 29/29 as predicted, including division in
  fields, in function types and in record-valued rigid type variables.
  §18.9.
- Adversarial review: count fix, first-pass grammar not exhaustive for
  its fragment (records under arrows, functions), flag renamed, unknown
  uniformity in the power case, presence fragment exact only for flat
  rows, D3b must handle rigid type variables tied to rows. Further
  reading: Pottier, Rémy, Harper and Pierce, Baader. §18.10.

## Signature checking: presence proofs (O1-O3, D2) (2026-10-21)

- The author authorized O1-O3 and D2 (presence only) in parallel with
  one owner for the interface. Interface Composition/Presence/Defs.lean
  (O3 needed a vacuity disjunct, found while writing it). Four agents in
  isolated worktrees proved `o1`, `o2`, `o3` and `d2_of`; integrated
  here (`d2 := d2_of o1 o2 o3`), four clashing helper names renamed, one
  build, no warnings, standard axioms. Worktrees removed, branches kept.
- Adversarial review: no false or vacuous theorem (non-vacuity in
  Examples.lean: split valid, O1 needs infinitely many labels). Open:
  "decided" needs a finite-check lemma (in progress); D2 is existence
  only; `Scoped` is decorative. Dossier §18.12. Verify not run (proofs
  and docs only).
- Later the same day: `bitCheck_iff` (the rest part is a finite,
  computable check) and `valid_iff_validCheck` (validity of a presence
  problem is decided by a computable check), each proved in a worktree
  and integrated. D1 holds for the presence fragment. §18.12.

## Signature checking: parallel campaign after presence (2026-10-21)

- The author accepted the presence milestone and §18.9's amendment
  (qualifications in dossier §18.13) and authorized streams 1-7: D3b
  construction, D3a attack, constructive presence witnesses, typed
  oracle expansion, source-to-constraint specification, compilation and
  split selection, integration reconnaissance. Production integration,
  merging and publishing remain unauthorized. In flight.
- Stream 3 integrated: a computable presence witness procedure with
  soundness and completeness (`witness_sound`, `witness_complete`,
  `valid_iff_witness`). Dossier §18.14. The author accepted it as the
  executable presence baseline; the caller checks patterns against `D`.
- Streams 6 and 7 integrated (dossier §18.15, §18.16): split choice is
  not observable at run time in the current fragment (derived) but is
  at compile time (checked); integration would start with a recorder
  for `B`. Probes found `route` refused by a false contradiction and the
  branch tip not building (BACKLOG).
- Stream 5 integrated (dossier §18.18): the source-to-constraint
  specification does not yet include every condition that can reject a
  specialization (printability, R010 and others); source `D` never
  makes a problem vacuous (proved); run against the repaired compiler,
  `route` is refused by H's false contradiction and P9s-certified
  `wrapAccepts`, `routeNarrowed` by "Cannot tell".
- Stream 7b integrated (dossier §18.19): on the repository's corpus,
  signature checking's enumeration stays at most `2^4` patterns per
  function; deciding call sites by the written search does not scale
  (232 `main`s over `2^40`). A recorder interface is proposed, not built.
- The author's review of §18.19 (dossier §18.20): certificates for
  call-site solving (failure to find one is Unresolved); an
  application-shaped measurement and slicing statements S1/S2 next; the
  recorder stays a proposal. Next integration gate: a complete recorder
  specification, a scalable search, a checker covering exactly what was
  recorded.
- Stream 8 integrated (dossier §18.21): the `show` example is an
  incomplete model (b); inferred interfaces (E2′) and R010 (E5) give
  genuine acceptance differences (a). Proved, narrowed: run-time
  irrelevance for the reference evaluator, and acceptance irrelevance
  conditional on the recorder establishing `Covers`. A disagreement with
  stream 5 is under review.
- The author's review of §18.21 (dossier §18.22): inference stays a goal
  (requirements represented in interfaces, possibly inferred); specialization
  checks become internal only once the invariant is established; R010
  stays, validity and admissibility kept separate; the narrowed result
  accepted about its model, pending review corrections.
- Integration review of streams 5 and 8 (dossier §18.23): stream 8 right
  on comparison and the applied `peek`; three stream 5 claims false
  (comparison never separating splits, printability timing, `peek`
  showing (a)); caller-side comparison and printability are missing
  requirements (b), refused at check. The two models do not yet combine
  into a recorder specification (M1-M9).
- The author's decisions on §18.23 (dossier §18.24): correct the stream
  documents in place; caller-side annotations count as written splits
  when they determine the split; caller-side requirements are check-time
  constraints on instantiated types; C narrowed; the `peek` claim
  withdrawn; E2′ restricted. Next: one reconciled recorder specification.
- Build repair (the author's exception, §18.17): `SeveralTails.purs`
  restored (2d175e3); three regression rows moved to the files the
  fa57f41 and 0a36ae3 splits created (0f9e05b). Verify under load 11-52:
  gates pass, parallel 2366/2366, serial 57/59 (fn-linear-timing `over`,
  `partialFirst`: T003/T007), regression 176/176 (run separately after
  verify stopped). A quiet-machine verify is still owed. Evidence:
  .build/evidence/r005b-build-repair-*.log.
- Stream 9 integrated (dossier §18.25): application-shaped
  measurements. Unsliced, a request-handling function needs `2^136`
  patterns; full-dependency slicing helps only after the substitution;
  shared-constraint shapes are not helped by any slicing (`star`
  unreduced). Supports search plus certificate checking; exhaustive
  enumeration only as a bounded reference.
- The author's review of §18.25 (dossier §18.26): S1 after a validated
  substitution with a connecting theorem; `star` supported at scale as an
  acceptance benchmark; a ported program before production performance
  claims. **Paused** for the usage limit: six streams checkpointing on
  their worktree branches (list in §18.26); a quiet-machine verify is
  still owed (BACKLOG R005B-BUILD).
- Paused checkpoints (worktree branches `worktree-agent-<id>`; integrate
  through the coordinator, then resume each from its RESUME note):
  - D3b (aa6be01…): 6e8bd62, 57265e9 proved (`transfer`, `d3bSound`,
    `d3bEqFree`, `d3bFlat`, `d3bComplete` with fresh base types); 410be66
    RESUME.md. Open: general `D3bExists`; completeness with finitely many
    base types; construction.md stale.
  - D3a attack (a521d0…): 56aa801 (frozen), fcea952, 1865f41, 9c3b9b7.
    **Separation with one base type** (`shape-split`, Lean
    TypedAttack/ShapeSplit.lean, not yet imported); grammar G-A gaps
    (depth, tail-node written fields); runs R3, R4 unfinished.
  - Typed oracle (a7fa161…): f61726e freeze, 0fea334, c2b7085, 94d6a33.
    Confirmation run: 75 named + 240 generated agree, no separation
    (two base types, consistent with `shape-split`); results.md unwritten.
  - Slicing (a03f084…): eee61d8 statements and hunt (nine naive-slicing
    breakers; 7b's measured cut unsound on a ground group); §18.26 items
    not yet written.
  - Corrections (a8a3cab…): 9b55cf3, documents done; Lean comments left.
  - Recorder spec (ae79b80…): e7ce17a, 60 rows drafted, counts and
    citations unverified.

## Codex finite-base follow-up while Claude is paused (2026-10-21)

- Authorized narrowly by the author: investigate the standing finite-base
  question, use an independent agent, and leave a handoff for Claude.
  The six campaign streams were not resumed.
- Original checkpoint ShapeSplit.lean at 9c3b9b7 builds independently in
  an isolated proof copy. New modules TypedAttack/FiniteShapes,
  FiniteCompatibility, FiniteEquations and FiniteObstruction prove the
  semantic equation-family extension for any complete nonempty finite
  base list. Parts, targets and remainders are finite for finite inputs;
  every solution forces type-dependent presence. Two-/four-base instances
  and an omitted-base negative control are included.
- Full proof library builds, no warnings or proof placeholders; axiom
  report uses only propext, Classical.choice and Quot.sound. Independent
  review confirmed scope. Evidence and detailed handoff:
  research/division-campaign/finite-base-followup/README.md.
- No proof connects this branch-indexed family to a generated SigProblem
  or Waxwing source. Three source scaffolds parse/resolve and stop at
  Check's unresolved split, using existing compiled modules. Their generic
  four-base form does not cover actual TData/handler/effectful-arrow types.
  No valid full-Waxwing counterexample or desired-feature failure is shown.
- Next: settle the generic type universe, then reassess the finite-base
  and fresh-opaque-base completeness assumptions. Presence results stand.
  No new witness policy, D4 or compiler integration adopted; no npm or
  quiet-machine compiler verification run. Other owners' edits untouched.

## Codex takeover of the paused campaign (2026-10-21)

The author asked Codex to take over the paused work and parallelize it.
Research/proof-attempt scopes continue; production integration, D4 adoption,
merging and publishing remain unauthorized. Original Claude worktrees and
branches are preserved. New isolated worktrees are under /private/tmp/.

Integrated checkpoints, before launching agents:

- Corrections 9b55cf3 → 17e37d4; recorder draft e7ce17a → fca92c9.
- Oracle f61726e/0fea334/c2b7085/94d6a33 →
  635cbc0/7d97e0b/49f08f1/0c59884.
- D3a 56aa801/fcea952/1865f41/9c3b9b7 →
  6ccd2d8/cfbd4c0/d6869d8/82eebdd.
- D3b 6e8bd62/57265e9/410be66 → 25a7347/697f9f6/b248793.
- Slicing eee61d8/295bf15 → d33a389/69cd61f.
- Shared Composition.lean imports were merged by retaining both sets.

Quiet verification completed before any new agent workload (initial load
1.39/2.00/4.09). npm run verify exited 0: parallel tests 2366/2366,
serial tests 59/59, regression proofs 176/176. Full log:
.build/codex-campaign-quiet-verify.log. Source code is unchanged by the
checkpoint integration. Research-library builds and final width checks
follow separately.

Parent work: Lean comments corrected to match the narrowed split model;
non-comment code compared unchanged in four files. Recorder draft inventory
recounted (60 unique rows; 36/10/14 evidence categories, not source proof
coverage); explicit source references checked for existence/range. Fixed
soundness/completeness wording, ground comparability's handler exclusion,
and a promise to expose a failed branch's log that current Either cannot
fulfill. Refusal-prefix logging is an open interface question, not a new
implementation. Full review and stream completion are in progress.

Three isolated agents then started: D3b checkpoint/proof integration,
oracle/D3a bounded evidence, and slicing statements. No recursive agent
spawning or production implementation is authorized. The parent retains
central documentation and recorder/corrections audit ownership.

### Codex campaign stop requested by author

All three completion agents have finished. Integrated D3b f3fe0b6,
slicing 4bd24a5 and oracle/D3a b07bcf0/2668f29/39991f5. Parent audit
02ac74a records the successful quiet compiler verification and closes
R005B-BUILD; existing timing-headroom work remains separate.

Final integrated Lean build: 104 jobs, no errors/warnings. Baseline,
D3b, split-irrelevance and presence/finite-base axiom reports use only
standard axioms. Local logs: .build/codex-campaign-final-lean.log and
.build/codex-campaign-*-axioms.log; retained headline audit:
research/division-campaign/reviews/final-axioms.{lean,out}.

Independent reviews found no new false proved statement. Corrected
recorder negative-log test promises, type-directed-placement wording,
slicing duplicate-enumeration cost and stale D3a citations. Earlier
measured slicing is unsound as a preserving cut; its speedup claims
are withdrawn, with raw historical numbers retained. Oracle timeouts
and the record-constant mismatch remain explicit, not hidden by reruns.
Dossier §18.28 and stream reports give the exact boundaries.

The author requested stopping to preserve usage. No further searches,
proof attempts or compiler work will run. No merge or push. Existing
unrelated README/backlog/direction-plan edits remain untouched.

## Signature checking: campaign resumed on remaining work (2026-10-21)

- Resumed at d7113d7 after Codex's integration (dossier §18.27-18.28,
  docs/next-session.md). Assigned only work under existing approvals and
  independent of the open generic-universe decision:
  - D3b: proof attempts on `CellIndependence`, `MGUExists` (Robinson),
    `Universality`, assembling `D3bExists`, proving only statements true
    under either universe reading and reporting any dependency; the
    local backlog's exact recursive clash check (with a regression shown
    failing on the old check) and an assertion mode for run.mjs.
  - `star` at useful scale (§18.26): established techniques surveyed,
    one or two strategies with certificate/checker split, search cost,
    certificate size and checking cost measured separately against
    exhaustive enumeration; no proofs or compiler work.
  - A decision memo on the generic type universe (closed per program
    vs extensible), for the author; no interpretation selected.
- Waiting for the author: the universe decision; review of the slicing
  and recorder obligations; D3a's bounded runs (R3a, R4a) and the
  base-per-alternative oracle challenge, which follow that decision; any
  integration scope.
- Language direction recorded (dossier §18.31): generic functions work
  with opaque types, including later ones (option B); checking stable
  under unrelated additions; unused functions checked. Memo corrected
  in place (four claims). Next: bridge statements (P-1) for review; no
  typed completeness claim, class machinery or integration authorized.
- Bridge statements for option B integrated (dossier §18.32):
  `ValidOpen` proposed as the formal reading; finite-freshness form of
  `d3bComplete`; completeness under B for the equation-free and flat
  fragments stated without open premises; boundary as a
  characterization. Statements only; reviewed; awaiting the author.
- `ValidOpen` approved as option B's formal reading for the current
  model (dossier §18.33); first bridge proof tranche authorized (E1-E6,
  B0, B2f/B2c/B2/B2g, B3a/B3e/B3f, B4f/B5 as a separate soundness
  track), after BridgeDefs.lean is split and the revised statements
  re-reviewed.
- D3b general existence proved (dossier §18.34): `mguExists`,
  `cellIndependence`, `universality` (gives `WithinC`), `d3bExists`,
  none with a freshness premise; Robinson's theorem reproved for this
  model with the correspondence recorded; completeness conditional on
  `Fresh` kept separate. Clean build, standard axioms. Independent
  review of the proofs in progress. Oracle: exact clash check and assert
  mode, full named suite 59/59.
- D3b existence proofs independently reviewed (dossier §18.36): all
  seven theorems sound, none false or vacuous; "general existence with
  no freshness premise" holds with its full premises. Wording findings
  corrected (WithinC's meaning, the Robinson adaptation, θ* classical);
  open: concrete `thetaStar` checks in the repository (F6). Bridge
  statements split into six files and re-reviewed (statements.md §10);
  first proof tranche running in four parallel streams.
- `star` at useful scale (dossier §18.37): schematic certificates (A)
  and per-component lazy refinement (B) certify `star` to n = 12,288
  with linear certificates and separately timed coverage; exhaustive
  enumeration stops at n = 4. Research code against unproved
  obligations SC1-SC4, SB1-SB3; `divide3` stays exponential for B.
- Bridge B3a, B3e, B3f proved from B2 and B2f (hypotheses), integrated.
- The author's review of §18.37 (dossier §18.39): SC1-SC4 to be stated
  (untrusted solver substitution; SC2's fragment named); research target
  `star` 1,024 rows under 1 s, certificate under 1 MiB; C investigated
  statements-only, starting with projection onto written labels;
  SB1-SB3 deferred. Two reporting corrections applied. The report.md
  incident classified as a routed-around policy denial; briefs changed.
- First bridge tranche, completeness side (dossier §18.40): E1-E6, B0,
  examples, B2/B2f/B2c/B2g/B2n and B3a/B3e/B3f proved and instantiated;
  option-B completeness for the equation-free and flat fragments holds
  with no open existence premise. F6 closed. Soundness track pending.
- Completeness tranche independently reviewed (dossier §18.42): the
  headline claim holds; `WithinC` and `ConstsInC` shown necessary for
  the back map; wording fixes and audit additions applied. The general
  composition with `d3bExistsWithin` goes through without W; it waits
  for the soundness track.
- Completeness tranche accepted (dossier §18.43). Soundness track proved
  (B4f, B5, BS-c1f) and integrated; the bridge composed:
  `d3bOpenComplete` (general option-B completeness, research model) and
  the characterization `openCharacterization`. Independent integrated
  review of soundness and composition pending; executable procedure and
  source correspondence remain separate obligations.
- Soundness and composition independently reviewed (dossier §18.45):
  B5 right, the characterization holds; general option-B completeness
  and the characterization can be stated as established for the
  research model, with premises `Scoped`, `∃ z, FreshLabels` (infinite
  labels), finite values. Coverage shown load-bearing. Two comment fixes
  in fixed statement files await the author's approval.
- **Milestone accepted** (dossier §18.46): general option-B completeness
  and the validity characterization established for the research model
  (premises `Scoped`, infinite labels, finite values). W1, W2 comment
  fixes applied. Executable construction, source translation and
  integration not started; to be scoped with separate obligations for
  inference/principality and compilation correctness.

## Housekeeping: checkpoint push and research-only branch (2026-10-21)

- At the author's request, committed work was pushed to the public
  origin (github.com/Ethan826/waxwing) as checkpoint branches, verified
  against local heads: `checkpoint/r005b-replan-2026-10-21` (8945918),
  `checkpoint/r005b-task7-wip`, `checkpoint/r005b-task5`,
  `checkpoint/design-c001-explicit-evidence`,
  `checkpoint/codex-campaign-{d3b,oracles,slicing}`. The ~40
  `worktree-agent-*` branches were not pushed: their content is in
  r005b-replan by cherry-pick. Nothing merged; `main` unchanged.
- Superseded the same day (the author: get everything onto `main`,
  nothing broken): r005b-replan was rebased onto `main` (no merge
  commit; main's README and prose-review link fixes restored after the
  rebase), plus the C001 design docs, the R005B Task 5 and Task 7 work in
  progress as patches under docs/patches/ (not built), and the other
  sessions' uncommitted docs (applied three-way). Fast-forwarded and
  pushed: `main` at f6dcadb. Compiler sources are identical to the
  quiet-verified tree (02ac74a); only documents and patches changed.
  Deleting the remote `checkpoint/*` branches was denied by the
  permission classifier and is left to the author; their content is all
  on `main`. Not committed: docs/writing/ (the user's), the humanizer
  skill folders and editor .history folders.
- **Uncommitted work, not backed up by the push** (other sessions' or
  the user's; not committed here): modified BACKLOG.md, README.md and
  five direction plans (docs/plans/2026-10-08-language-direction,
  -polymorphism-design, -tooling-direction,
  2026-10-10-modules-and-instance-selection-direction,
  2026-10-11-requirement-and-error-inference-milestone); untracked
  docs/adr/015-backend-priorities-and-service-bindings.md,
  docs/plans/2026-10-20-backend-direction-prose-review.md,
  docs/plans/2026-10-21-type-system-assurance-{register,prose-review}.md,
  docs/writing/ (the user's); tooling and editor state
  (.agents/skills/humanizer, .claude/skills/humanizer, .history,
  research/composition-assessment/wand/.history); agent worktrees under
  .claude/worktrees (cleanup candidates, branches kept).
- Cell-based `ValidOpen` checker statements integrated (dossier §18.53;
  statements only, reviewed, nothing proved). **Paused** for the usage
  limit; no agents running. Next: the author's review of §18.53 (the
  `CellShape` premise, the guard, `cover`'s representation, proof
  order).
- The author's review of §18.53 (dossier §18.54): first soundness proof
  tranche approved over `LDFragment`, `CellShape` a separate premise,
  `coverS` the exact reference, no polynomial coverage promised. Order:
  instantiation and finiteness; definedness and body checking;
  conservative query soundness; coverage at `thetaFree`; CM, `CellOpen`,
  `CellOpenImpl`; with `route` and `CellShapeNeeded`. First a targeted
  re-review of §10's fixes. No source translation or integration.
- Targeted re-review clean (dossier §18.55, statements.md §10.3); N1
  puts QX3's soundness direction into stream C. Seven proof streams
  launched in parallel worktrees (proof-plan.md).
- First soundness tranche proved for the research model (dossier
  §18.56): `cellSound`, `cellOpen`, `cellOpenImpl` rest on no unproved
  hypothesis; `scRoute`, `cellShapeNeeded`; standard axioms only. Files
  split under 250 lines. Two independent reviews: sound as stated; one
  surplus claim was wrong (CI3/CD3 need `CellShape` through CD2) and is
  corrected with the other wording fixes. The author's acceptance
  pending.
- **Tranche accepted** (dossier §18.57); milestone closed and published
  to `main`. Refutation statements added (Cell/Refutations.lean, to be
  proved in wave 2). Second proof wave authorized and launched: nine
  parallel streams (proof-plan.md, "Wave 2"). 11 tranche worktrees
  removed, branches kept.
- Second wave proved (dossier §18.58): query exactness (QX1-QX3,
  QR1-QR5), `star`/`star-read` for every n and the other scenario
  families, CI4/CI5, the `CellShape` guards, the tautology reduction;
  55 theorems, standard axioms. `divide5` (valid, inside the fragment,
  refused by every certificate) shows the checker incomplete on the
  fragment. Two reviews: sound as claimed; wording corrected. The
  author's acceptance pending.
- **Wave 2 accepted** (dossier §18.59) and published to `main`;
  corollaries added (63 theorems audited). Exact queries do not make up
  for a certificate language that cannot express `divide5`'s witness.
  Next, authorized: a requirements-and-statements tranche comparing
  one-literal guards with pattern-dependent certificate selection; no
  prototype or proofs.
