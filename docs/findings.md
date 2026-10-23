# Findings and operational memory

## Tooling

Spago 1.0.4 uses env-paths and opens a SQLite cache database under the real
user directory. The sandbox rejected that access. scripts/cache.mjs overrides
Node's os.homedir in the Spago process only to .build/home; it does not modify
HOME or the installed tool. On this macOS host the normal cache at
~/Library/Caches/spago-nodejs was copied to
.build/home/Library/Caches/spago-nodejs to allow cached package resolution.
That cache is ignored and is not part of the deliverable. No reference source
was copied into this compiler. The adapter clears host
XDG_CACHE_HOME/APPDATA/LOCALAPPDATA settings in the
Spago process so env-paths uses the workspace home on other platforms too.
Only macOS execution has been verified.

PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Go 1.26.4, and Node
26.6.0 are installed here. Spago's package set 81.0.0 declares a 0.15.15
baseline but compiles successfully under pinned 0.15.16. Strict builds caught
Prim.Type/Function name shadowing and a redundant tuples dependency; both
were fixed rather than suppressing warnings.

npm could not resolve registry.npmjs.org (ENOTFOUND) during a package-lock
attempt. Local npm dependencies were unnecessary: the pinned tools are PATH
prerequisites. No npm install is needed to verify this repository once tools
and PureScript caches are present. Online installation still needs a separate
network-capable validation; local issue F001 records this distinction.

## Compiler traps worth retaining

Go typed constant addition can reject overflowing expressions even though
runtime int32 addition wraps. Emit sprigAdd with int32 arguments rather than
folding source addition to a Go constant. Range-check source literals first.

PureScript is eager. maybe's computed fallback executes even for Just; use
maybe' with a named fallback function when work should be conditional.
Use either for Either; use maybe/maybe' for Maybe. Name record builders and
transformations in where, not just simple pass-through branches.

Resolved IDs are deterministic array indices. Local values shadow function
names in call position and are rejected as non-callable; no source names are
copied into Go identifiers. This avoids Go keyword and helper-name collisions.

Negative checks must validate the expected diagnostic, not any failure.
The mutant must compile before its rejection assertion is tested. Mutations
run in .build/regression and never change live sources or normal output.

## Reference documentation boundary

The user explicitly authorized a MileAhead guidance amendment. apply_patch
rejected /Users/ethan/Desktop/trailmapper/AGENTS.md with:
"writing outside of the project; rejected by user approval settings".
Do not claim it was changed and do not bypass the sandbox. The proposed patch
is in docs/patches/mileahead-eliminators.patch.

## Planning workflow

Plan, durable findings, and verification evidence must precede further broad
exploration. docs/plans/bootstrap.md owns task status; docs/progress.md owns
what actually ran; ADRs own decisions; BACKLOG.md owns future and unresolved
work. A future skill installation must not silently replace this convention.

purs-tidy 0.11.1 writes its version to stderr with success status. The version
gate checks the combined output exactly, rather than assuming stdout.

## Skills migration prerequisites

Escalated bunx installation and GitHub access succeeded on 2026-10-07; the
earlier npm DNS failure remains historical, not a claim of current outage.
Fresh compiler prerequisite installation/cross-platform builds remain untested.
All 15 pinned skills plus helper files are installed in .agents/skills.

At migration, Git had no commits: git rev-parse --verify HEAD reported "Needed a
single
revision". task-start/task-done require HEAD/BASE and review-package requires
commit ranges; do not invoke them until a real checkpoint exists (W001).
Sandboxed git status also emitted xcrun temporary-cache permission errors;
escalated Git inspection worked. Record this environment distinction (F003).

The reviewed pinned writing-plans uses self-review rather than a plan-review
subagent. At migration the audit plan was self-reviewed only; execution had not
begun. Existing docs stay durable even when scratch is cleaned.

## Bootstrap audit findings

Computed record/error fallbacks in Lex.scan, Parse.Core.failAt,
Parse.Expression.integer, Resolve lookups, and Check.checkLocal used eager
maybe. They now use maybe' with named fallback functions. Context-dependent
traverse/filter callbacks in checking/resolution are named in where. Resolver
globals moved from an independent do-let to where. Branch rendering/building
work was extracted and private Parse.Core plumbing is no longer exported.

Architecture prose overstated defensive E_INTERNAL coverage: Check checks
local/call indices during inference, but trusts the resolved entry/table
structure. Documentation now states that exact contract. The CLI respects an
existing GOCACHE; README now describes its default, rather than an override.

The ten-arm (now twelve; see BACKLOG E003) codeName mapping exceeds the
eight-branch review target; splitting
a short exhaustive ADT tag mapping would obscure its wire contract. E003
records it explicitly. Other declaration budgets were reviewed manually;
module/file limits remain automatically checked. The Spago no-files message
for test/**/*.purs is informational: tests are Node .mjs files. Actual strict
build tables report zero warnings/errors; no message was suppressed.

A setup command accidentally ran an extra verification in the original root
after worktree creation. It passed but is not the worktree baseline evidence.
The separate clean-output worktree run compiled 269 modules and passed 19
tests plus the regression proof; .build/audit-baseline.log in the worktree
is the actual evidence. Both locations' previous outputs were preserved.

Task 1 verification initially failed with ModuleNotFound for
Sprig.IResolved.Internal. A naive R.-to-Resolved. replacement also matched
the suffix of IR.; it corrupted the import and IR references in Check.purs.
The replacement is corrected, not retried unchanged. The original failure
is preserved in the execution workspace task-1-failed-alias.log. A copied
defective source tree independently failed purs compile with the same missing
module in .build/alias-regression/failure.log. The build itself detects this
edit failure; no gate or assertion was disabled.

The isolated reproduction helper incorrectly expected diagnostics only on
stderr, while purs wrote them on stdout. That helper assertion failed before
the live fix ran, and its trailing verify re-observed the still-broken build
in .build/audit-task-1-fixed.log. Inspected the combined saved output, confirmed
the expected missing module, then corrected live IR references. Those logs
remain evidence of the failed attempts, not successful fix evidence.

Execution setup resolved W001 with baseline 9624bec and the user-authorized
audit/bootstrap-docs worktree. Full verification from clean output passed
there, and Task 1 changes are committed at 4410609. Docs are handoff artifacts,
not evidence that unimplemented ADTs or hostile-IR validation exist.

The fresh whole-branch review found no blockers and one minor item: two test
titles overstate assertions (E004). The existing named-helper fixture uses
maybe 0, not a computed maybe' fallback; the snapshot test makes one direct
compile, not repeated CLI invocations. Manual repeated CLI emissions now
independently agree. These titles are deferred per executor minor-finding
policy, without weakening the tests or overstating their automated coverage.

## A001 closure observations (2026-10-07)

- F004 reproduced during Task 6: a promoted strict warning appears only on the
  build that compiles the module. Clean-output verify is the workaround; the
  fix is open in BACKLOG.md.
- Four `sprig-regression-*` directories from earlier Task 3-era probe runs
  remain in $TMPDIR; a clean verify did not add any. Tracked as F005.
- The nil-guard policy deliberately does not validate fields skipped by
  wildcards or binders (ADR 003); this is a documented limit, not a defect.
- `E_USAGE`, `E_IO`, `E_TOOL` are strings in Format.Wire (A005).

## A001 final review fixes (2026-10-07)

- A function/constructor clash was reported at the constructor even when the
  function came first, because constructors were checked before functions and
  the program keeps the two in separate arrays. Source order is now recovered
  from span offsets. Record: docs/plans/closed-adts-review.md.
- Random flat multi-arm matches are often redundant (an arm subsumed by an
  earlier one), so the flat execution property uses a seed whose programs are
  all accepted, asserted to reach a third arm and the `_` tail.
- The old coverage oracle passed a mutant that offers uninhabited
  constructors; only the generated-type-system test catches it.

## F004 fix (2026-10-07)

- purs recompiles a workspace module whose output directory is missing, so
  deleting only workspace module outputs is enough; a full clean is not
  needed. Each build now recompiles the 32 workspace modules (about 1 s).
- The strict-rebuild proof copies output and .spago (about 40 MB) into
  .build/strict-rebuild and shares .build/home by symlink; verify takes
  about 8 s longer. It deletes the copy only on success, leaving it for
  inspection after a failure.

## A003 observations (2026-10-07)

- Test time is dominated by `go build`, one binary per executed program, not
  by the JavaScript runtime (BACKLOG T001).
- A second quadratic resolver cost survived Task 3b: `uniqueTypes`,
  `uniqueCtors` and `typeInfo` (which filtered every constructor per type).
  The final-review fix wave made them Repeated-based or linear.
- Go emission searched the type table per constructor (`tagOf`) and every
  constructor per type (Show), so 20,000 one-constructor types took 25.7 s
  to compile; one constructor layout per program (Format.Go.Layout) brought
  it to 0.2 s with byte-identical output. Many-declaration tests should cover
  every declaration kind, not just functions.
- Go `==` on generated structs would compare field pointers, so comparison
  always goes through generated helpers (ADR 005).
- Printed values reproduce themselves under the same declarations: the
  witness format minus `_` is valid source, which made the print round trip
  a strong printer test. Re-reading is bounded by E002 (constructor nesting
  overflows the parser at about 420 levels in a cold process).
- The coverage-oracle LCG used low bits that alternate, so seeds were
  reselected in Task 3b with assertions unchanged.

## G001 observations (2026-10-07)

- An applicative-only `Parser` was enough for the whole grammar because
  every choice is LL(1) on the next token (`dispatch`); the only sequencing
  on parsed values is `refine`, which checks a value without consuming.
  The style gate is syntactic, so it also bans `run`/`initialState`
  imports outside Format.Parse: running a sub-parser and inspecting its
  result would be Bind by another route.
- The combinator layers cost more stack per nesting level than the
  hand-written parser (cold `Cons(1, ` capacity fell from about 419 to 313
  levels in Task 2), so the limit was derived from a measured minimum
  (304, ADR 006) rather than chosen first; 128 also bounds printed lists,
  replacing the A003 note above about 420 levels.
- Breadth overflows hid in three more places once the parser stopped
  crashing first: the resolver's Array.foldM (about 1,700 arms or
  arguments), Coverage.redundancy's Array.foldM (about 1,929 arms) and
  Usefulness's two constructor searches (about 2,000 constructors).
  Array.foldM over Either nests one bind per item; `traverse` is balanced
  and `tailRecM` loops, so both are safe.
- The G001 final review found two more that the breadth tests missed,
  because those tests declared wide types but never matched on them:
  usefulness and algorithm I recursed once per pattern column (a
  1,600-field constructor pattern overflowed) and the inhabitation fixed
  point recursed once per pass, one pass per link of a type chain (3,000
  chained types overflowed). A per-item recursion hides wherever a test
  only exercises declaration size; test each phase at width. Also,
  Array.modifyAtIndices nests one ST bind per index and overflows between
  6,000 and 8,000 indices, so the new worklist sets flags in chunks.
- Go's inliner expands nested immediately invoked closures exponentially:
  a match nested 24 deep took 34.6 s and 7.5 GB to build (BACKLOG E005).
  Lowering each match to a named top-level function removed the blow-up
  (128 nested matches build in 0.14 s); an emitter shape that is cheap in
  PureScript can still be pathological for the target's optimizer, so
  depth tests must build and run, not only emit.
- A flat sum counts one level per operator, so 130 operands are E_NESTING
  although the phases overflow only near 2,928 operands (ADR 006 table);
  lifting it needs iterative chains in every later phase (BACKLOG O001).
## Language-direction planning gap (2026-10-08)

Review of the direction document identified an untracked prerequisite:
the current IR has named Call but no function values/lambdas/closures.
FN001 now follows P001 before C001/R001/FX001. Joint class/record design
must consider a shared record-of-functions representation. Row-layout
specialization growth and polymorphic fields are distinct risks; a fallback
is an option, not an approved change to ADR 002. Default lowered-IR position
is after specialization and above layouts. D001 records text/numeric/
collection foundations alongside M001; FX001 compares ZIO/Koka families.
No P001 code or active worktree changed.

The source-language effect system was only a phrase in I001 and the
self-hosting roadmap; compiler Host ports do not implement it. Recorded
FX001 for a dedicated design coordinated with rows/classes/FFI. Current
discussion and unsettled choices are in
docs/plans/2026-10-08-language-direction.md. "Hostable" was clarified to
mean inspectable intermediate representations, so no embedding VM was
selected. Rows simplify service requirements but do not decide runtime
resource/cancellation semantics. Documentation only; no feature implemented.

## P001 observations (2026-10-08)

- A source nesting limit does not bound inferred types. Composing generic
  calls multiplies depth (`fn deep(x: a): L^127(a)` nested 44 deep infers
  about 5,600 levels within every source limit), and the unifier, resolve
  and the occurs check recurse over type structure, so a legal program
  crashed with a RangeError (Task 4). Ruling R7 added the inferred-type
  bound (ADR 007), and it took three fix rounds to make it hold:
  1. Fix 1 checked each expression's type when built, both operands
     before each unification and each finished body. Review found that
     metas bound earlier in the same unification chain into each other,
     so two operands that were each within the bound unified as chains
     about 1,780 deep and still overflowed. Fix 1 also stated a 5x margin
     using resolve's overflow figure; unify, the binding limit, gives
     about 1.5x.
  2. Fix 2 threaded a level through unification (one per applied type
     entered, which equals resolved depth) and failed past the limit.
     Review then found six or more L^997 links bound in one unification
     still overflowing, in `bindMeta`.
  3. The cause: `bindMeta` named `resolved = resolve subst ty` in a
     `where`, guarded by an `if exceedsLimit … then … else …` in the body.
     PureScript `where` (and `let`) bindings are strict: the compiled
     JavaScript evaluates every binding before the body runs, so the
     resolve ran before the guard that was meant to prevent it. Fix 3
     moved the resolve into `bindBounded`, a function called only after
     the bound, and audited the compiled output of Features.Check* for
     other strict bindings that recurse over a type (all run on bounded
     types).
  Lesson: in PureScript, a `where` binding is not lazy; anything a guard
  must protect belongs in a helper function called from the guarded
  branch (AGENTS.md's `maybe'` rule exists for the same reason). And a
  bound is only as good as the deepest path that runs before it; review
  each recursion, not each entry point.
- Whole-type keys hide quadratic and exponential costs: Task 6's coverage
  keys made a 3,000-type growing chain take 16.6 s, and argument-doubling
  chains give exponentially large keys. Specialize therefore hash-conses
  its keys (R15), numbering each ground application once; Expand still
  uses whole-type keys (BACKLOG E008).
- Regression mutants must change one thing the probe can see. The
  `spec-key` mutant keys only the data-type arguments of a type
  application, without their identity, so `List(List(Int))` and
  `List(List(Bool))` collide; the Go build then fails on mismatched
  struct types. Removing the occurs check does not loop forever: the
  cyclic binding is caught by the inferred-type bound (E_NESTING), so the
  `occurs` probe requires the exact E_TYPE text rather than any
  rejection.
- Binding direction is a complexity choice. Binding the older of two
  unbound metas to the newer chains siblings into one long path that
  every later walk follows (a 5,000-arm `Nothing` match took 15.8 s);
  binding newer to older keeps every sibling one link from the oldest
  (1.55 s). Union-find's rank heuristic is the general form; meta age is
  a free approximation here.
- A timing bound's headroom must survive the parallel test runner. A
  2.9 s workload under a 5 s bound failed once in three reviewer runs and
  every time with three suites at once; the fix was the workload (Expand's
  deep `Ord` key comparisons), not the bound or a rerun.
- A single cold compile costs about 1.4× the steady-state sum of its
  phases (JIT warm-up and GC), and the PureScript pipeline allocates
  about 15 KB per source byte (2.8 GB for the 150 KB match ladder before
  T003). Measure a timing test's workload as the test runs it, in a
  fresh process: T003's steady-state per-phase sum fell 332 → 237 ms,
  and the cold compile the test times 507 → 370 ms.
- `go build` is superlinear in the size of one Go function or
  expression even when the generated text is linear (FN001 Task 1,
  design §13): an `n`-argument application chain in one function is
  k ≈ 2 at n = 5,000 to 20,000, and a stage that unpacks `n` locals and
  makes an `n`-argument call is the superlinear part of the linked
  environment. Linear text is necessary, not sufficient; measure the Go
  build at the largest size a test claims, and judge growth by the
  exponent, not by a ratio bound (a "within 5 × 4" bound passed a 16.4×
  quadratic build).
- Go's own build cost is superlinear in the size of one function body
  even when its signature is not (FN001 Task 1 round 2: a 20,000-
  parameter signature is linear, k = 0.19; an ordinary body reading each
  parameter twice is k = 2.24 under today's n-ary convention). Linear
  generated text did not give linear `go build` for the tested large
  bodies (this does not show that no representation could); bound Go
  builds by measured times at stated sizes, and keep linearity claims
  for Bumpus's own phases.
- A mutant's survival is a claim about the tests run, not about the
  suite (FN001 Task 9): Task 8 recorded that derived `Eq`/`Ord` on
  `Domain.Type.Ty` "survives all Task 8 tests" after running five files,
  and the gap was carried forward; test/type-order.test.mjs (Task 2)
  fails on it with RangeError. Name the files a mutant was run against,
  and run the whole parallel phase before calling a defect uncaught.
- A lowering mutant should still emit Go that builds, so its probe fails
  on behavior (which body runs first, what prints), not on a Go type
  error; when the built code no longer has the representation a plan
  names (an uncurried value), restore the defect's effect (an eta
  adapter at the type's arity) and say so.

## FX001 Task 1: runtime shapes (2026-10-09)

Hand-written Go of effects design §4 (scripts/effect-probe.mjs; raw output
in .build/fx001-task1/, run3.log is the record). Host load averages 2.6-5.8
(`uptime` before and after each batch in the log), so timings are upper
bounds; five runs each, median (min-max), checksums matched everywhere.

| Configuration | Median ms (min-max) |
|---|---|
| 10^6 shallow installs | 18.3 (16.3-36.2) |
| 10^6 performs, depth 1 | 1.65 (1.62-1.77) |
| 10^6 performs, depth 100 | 79.8 (79.4-79.9) |
| 10^6 performs, depth 10,000 | 11,770 (11,567-12,012) |
| one abort across 1,000 unrelated `handle` frames | 34.9 (34.3-35.1) |
| one abort across 1,000 cleanup frames | 27.5 (27.1-27.8) |
| 100,000 caught aborts, depth 1 | 19.9 (19.3-20.5) |

| `go build`, lifted helpers | Median s (min-max) | Ratio to previous |
|---|---|---|
| 1,000 | 0.83 (0.81-1.17) | |
| 2,000 | 1.53 (1.51-1.56) | 1.84 |
| 4,000 | 2.91 (2.88-2.97) | 1.90 |

Observations, not a linearity proof: the ratios are close to 2 for 2x size.
Lookup is linear in depth (about 1.2 ns per link; 11.8 s at depth 10,000
justifies the cached-index follow-up for FX005, not a design change).
Installation is about 18 ns each (one heap allocation). A caught abort is
about 200 ns; an abort through 1,000 re-panicking frames costs about 35 us
per frame. Decision rule: every semantic check passed and the 4,000-helper
median 2.91 s is within 10 s, so the shapes are adopted. Pitfall recorded:
Go's build cache makes identical regenerated sources look 8x faster; vary
the source per repetition when timing builds. Design reading to confirm in
FX001 review: a cleanup failure of any kind while a typed abort is pending
turns it into an uncatchable defect listing both causes. Superseded by the
user 2026-10-09: `defer` must not fail (spec §2, §3), so only defects can
fail cleanup and a pending typed abort is never converted by a typed
cleanup failure.

## Waxwing migration baseline (2026-10-09)

The existing isolated FX001 worktree was clean at 3481468 (Tasks 1-3
committed), while main remained at 2084638 with its pre-existing editor
settings change. Rename work uses the FX001 checkpoint, not main.
Before production edits, `npm run verify` exited 1: 638/640 parallel tests
passed. fn-linear lambda took 1604.135291 ms against 1545 ms; mismatch
819.499333 ms against 525 ms. Serial tests and regression proofs were not
reached. Evidence `.build/waxwing-baseline-verify.log`; FN006 owns the
existing parallel-timing exposure and next action, with no bounds changed.
Historical findings and paths above remain unchanged by the rename.

Concurrent FX001 checker edits appeared during rename validation, outside
its source scope (Binding, Require, Subst, Unify, UnifyRow). Preserved their
diff/hashes under .build/waxwing-concurrent-*; do not revert or attribute
them to the rename. A later harvest smoke could not import Format.Parse
because output was absent; this is not evidence of a hook defect. Require a
paused worker and stable build before combined-tree validation. The rename
verify's twenty-thousand-declaration timing failure is recorded in T004.

The user confirmed the FX001 worker paused. Its eight modified files are
preserved (the previous five plus Domain.Type.Parts, Features.Resolve and
Features.Specialize.Seeds). Combined-tree verification builds cleanly but
fails test/unify-row.test.mjs:57: deferred Fail now returns Subst rather
than the test's RowMissing. R003 records the exact test and next action for
FX001; no assertion was changed by the rename. Five fn-linear timing
failures are recorded in FN006. An accidental extra combined-tree verify
ran from the wrong working directory; its separate failure log is
.build/waxwing-paused-extra-verify.log (636/640 pass). A subsequent log-move
command used that same wrong relative-path assumption and failed; the log
was then preserved at its correct path. These are execution mistakes, not
additional compiler defects. Isolated rename validation uses the original
3481468 versions of the eight worker files in a copy only, leaving live
files intact (.build/waxwing-validation-scope.json).


## FX001 Task 3 fix continuation (2026-10-09)

The inherited matching-path postponement still immediately rejected a
left-over deferred right label in finish. New row-deferred regression ran
first: 9/10 passed; the left-over case failed with RowExtra
(.build/fx001-task3-fix-red.log). Guarding that path by the resolved key
now postpones the entire pair with rollback, just like the matching path.
Focused post-fix run passed 44/44 (.build/fx001-task3-fix-focused.log).
The eight inherited source edits were preserved and completed; no fresh
RED history is claimed for their already-implemented behavior. Isolated
source mutants supply regression proof for those inherited fixes.

Operational failures: an exploratory read requested nonexistent
scripts/test.mjs (verify is scripts/verify.mjs); no check was omitted.
After the user interruption, the former focused-run session identifier no
longer existed; its complete 44-test TAP summary confirmed completion.
No duplicate build/verification was started. FN006's timing suite is
renamed to fn-linear-timing.serial.test.mjs with identical file contents,
under the user's authorized existing serial-runner policy.

The continuation's single clean-output full verify exited 1
(.build/fx001-task3-fix-verify.log): zero build warnings/errors, tidy,
strict-rebuild and structural gates passed; 643/644 parallel tests passed.
The sole failure was the existing match-lift ladder timing bound:
1670.670250 ms >1500. T003 records the exact evidence and next profiling
step; no bound/runner change or unchanged rerun hides it. Host load observed
afterward was 5.89/5.64/4.54, which does not establish causation. Serial
verification and regression proofs are run explicitly as the unreached
remainder, with separate logs and statuses.

Controller ruling after this reproduced T003 failure: apply the existing
fixed-bound scheduling policy by extracting only the deep/wide ladder
block into match-lift-timing.serial.test.mjs with its required imports.
All semantic match-lift tests remain parallel; the extracted block/source,
constants, assertion and 1500 ms bound are byte-identical
(.build/fx001-task3-fix-ladder-identity.txt). First serial continuation
passed 21/21 (.build/fx001-task3-fix-serial.log). A second clean-output full
verify follows the actual scheduling change, preserving the first failed
log; it is not an unchanged retry. No further scheduling iteration is
authorized blindly if another timing failure appears.

After the authorized scheduling extraction, the changed-tree clean-output
npm run verify exited 0: 643 parallel + 22 serial tests, no failures/skips,
zero build warnings/errors and all 22 existing regression proofs
(.build/fx001-task3-fix-verify-serial-scheduling.log). The ladder test took
410.995667 ms total against its unchanged 1500 ms timed-compilation bound.
The original failed log remains. No later-task effect syntax/runtime
behavior is claimed; deferred origin/provenance retention remains Task 9.


FX001 Task 4: omitted rows in lambda annotations cannot resolve as pure.
Resolve marks them with the signature's unwriteable ambient variable;
Check substitutes only that row slot with the lambda's fresh row. Named
row variables and type variables remain rigid. New Console callback and
legacy comparison diagnostics verify the distinction. Collecting signature
row variables must loop over long arrow spines, just as type collection
already did; a 20,000-arrow regression and restored-source mutant pin it.
Full verification: 672 parallel +22 serial tests, 22 existing proofs and
four new isolated source sensitivity checks (docs/progress.md).

FX001 Task 5: handler checking is complete through Check only. Rowless
`Handler(Name)` is ambiguous with an ADT application, so resolution prefers
a declared type named Handler and uses the effect interpretation only when
no such type exists. Explicit `with` makes the special type unambiguous.
Repeated duplicate scanning exposed a strictness trap: `when predicate
 (expensive Either)` evaluates the diagnostic computation even when the
predicate is false. Guarded branches keep it limited to actual collisions;
one combined repeated-name pass preserves constructor/function namespace
checking. The 20,000-type duplicate test is 475 ms after the fix (same 5 s
bound); an isolated restored-strictness mutation fails that workload's
timing assertion. Full Task 5 evidence and Task 9 deferred-row provenance
handoff: .superpowers/sdd/2026-10-09-effects-plan/task-5-report.md.

## Module boundaries and explicit instances (2026-10-10)

C001 already called for several selectable instances per type without
mandatory newtypes. The new modules-and-instance-selection direction expands
that requirement to dictionary construction and composition, and coordinates
it with M001/R001. Explicit selection removes implicit-choice ambiguity but
not ordering consistency in collections or obligations for algebraic laws.
Rust restricts orphan implementations; Haskell permits orphan instances with
GHC warnings. No compiler behavior changed or runtime guarantee established.

## Set-aside constraints must be judged, never dropped (FX009, 2026-10-10)

The scoped-label unifier sets aside a `Fail` pair whose key is not yet
known, and `settleRows` retries it. A pair that is never decided must
become a diagnostic. Before FX009 it was dropped, and a failure could
escape to run time. Any constraint deferred "until more is known" needs
an explicit final judgement. Rejecting malformed labels where they are
written (no family key) keeps the final guard a backstop rather than the
primary diagnostic.

## Schema and parsing boundaries (2026-10-10)

The roadmap mentioned schema ingress only as research, not a first-party
requirement. SCH001 now records the user's explicit direction. Effect and
schemata-ts connect parsing/encoding with test-data generation; schemata-ts's
Schemable interpretation is relevant to selectable class dictionaries. Derived
generators do not derive business properties, prove laws or independently
validate a parser generated from the same description. Arbitrary predicates
and lossy transforms need explicit support and codec-specific laws.

SCH001 precedent comparison (2026-10-10): the interpreter-parametric idea
has a direct io-ts precedent and broader tagless-final literature. ZIO
Schema supports the multi-interpretation goal through a different encoding.
Effect also has an AST and interpreter customization. Library-specific
conveniences do not establish architectural superiority; io-ts's relevant
API is explicitly experimental. Details/sources in schema-direction.

## Shared checkouts need explicit staging (2026-10-10)

Two sessions edited one checkout concurrently. A `git commit -a` in one of
them swept the other's uncommitted SCH001 edits into an unrelated commit.
It was split before publication. Independently, a second session recorded
the FX008 hole as a new BACKLOG row on its own branch, duplicating this
branch's record. In a shared checkout, stage explicit paths. Before adding
a BACKLOG row, check the other active branches for one.

## Requirement inference must include both error boundaries (2026-10-11)

INF001 records the user's service-assembly and business-logic error
composition requirement. Dependency provision does not remove operation
errors; effectful assembly adds its own reachable setup errors. Handling
errors must account for recovery's own errors and requirements. Local lambda
inference does not establish named-function inference: today's rigid ambient
signatures deliberately reject undeclared own effects. Generic `Fail(a)` and
same-family payload keys are additional parity questions. See
[the milestone](plans/2026-10-11-requirement-and-error-inference-milestone.md).

## A `defer` can run under a handler that fails (FX008, 2026-10-12)

The hole. FX001 rejected a `defer` that performs `Fail`, but allowed one
that performs another effect such as `Log`. If the handler of that effect
had a clause that fails, the cleanup ended in a typed abort, with a
`fail(E): E` run-time error where the type system promised none. Neither
rows nor the label check could see it: a row says which operations a
computation performs, not whether the frame that handles them can abort.

Its cause. The type of a handler value (`Handler(Log with R)`) records what
the clauses perform, and `with` unified R with the context, so a clause's
failure reached the context only as a `Fail` label, and only when the
handler was installed in view. A function's signature said `Log`, and
nothing said which Log handler it would meet.

The rule. A label occurrence carries a mark (`nofail` or plain). A `defer`
may perform an operation only if every frame it can meet is fail-free;
each installation has its own frame mark, constrained by the handler's
own-abort mark and by the outer frames its clauses reach; consumption
imposes `context mark <= stage mark`; and the constraints are solved as a
path check over a two-point lattice with rigid mark variables. Programs
without `defer` keep their acceptance, by a one-way hook that keeps R in
step with the clauses. Sound but imprecise cases are recorded as
limitations (L1 with P5, L4, L6, and handlers passed through generic
functions).

Lessons from building it. Every simpler design failed on a probe: sharing
marks through R, equating marks when R unified, consuming R, an R-to-R
link, and an alias of R as the clause row all rejected safe programs or
depended on the order of bindings. Letting C carry label arguments doubled
the work at each level of literal nesting (30 chained literals timed out).
A closed result C failed to merge with a C that had more labels. Each
became a regression row with a named mutant; the one-way soundness
differential (compiler acceptance implies the oracle never reports
`typed abort escaped cleanup`) found no unsound acceptance.

## FX001 Task 11: callback rows (2026-10-12)

Found while writing the acceptance scenario's effect-free baseline
(test/fx-services-programs.mjs); both are existing behavior, not changed.

1. A callback parameter with a written closed row (`q: Int -> Int with L`)
   is unified into its caller's body row, not subsumed by it. A function
   `with L + M` that calls `q` is rejected at the call: `a performs M,
   which its signature does not allow`. The same happens with `L + Fail(E)`.
   A written callback row must equal the caller's row label for label.
   FX017 (2026-10-12) gave it its own diagnostic, `q must allow every
   effect of a (L + M), but its row is L`, with the caller's label, the
   callback's row and both written rows named; whether the callback's row
   should instead be subsumed by the caller's stays open (FX007).
2. A callback whose row is ambient or `with Console` cannot be deferred:
   `defer must not fail, but it may perform any effect of ...`. A written
   `with Console` on a parameter keeps a rigid tail, and no closed Console
   row can be written on a callback, so only `with pure` callbacks defer.

Together these forced the baseline's callbacks to `with pure`, and its log
lambda cannot print, so the baseline is compared with the scenario by keys,
not output, and the scenario carries no `Fail`. For item 2, FX007 (BACKLOG)
is the relaxation that would let cleanup call effect-polymorphic callbacks;
item 1 is FX017.

## FX001 Task 12: regression proofs (2026-10-12)

Learned while retargeting mutants for the fifteen new rows
(scripts/regression-fx.mjs, scripts/regression-fx-go.mjs):

1. `fx-cleanup-context` has no single-line restoration. The cleanup
   closure captures its block's own `ctx`, so the exit-time context cannot
   be restored by editing one expression. The mutant makes `waxwingInstall`
   mutate the caller's context in place, which gives cleanup the context at
   exit. It also leaks installs past their `with`; the probe observes only
   the cleanup operation (`1,9` healthy, `101,9` mutant).
2. `fx-ctx-reachable` is an entry-body-only stand-in. Effect layouts exist
   for any operation an unused function uses, so the needle must remove the
   `program.effects` test together with the function scan; the row then
   restores "mode by what the entry function contains", not literally "by
   reachability from `main`".
3. A mutant must sit where the defect is raised. `fx-closed-opened` first
   targeted UnifyRow `absent`, which the probe never reached: the
   rejection of a `Console` lambda given to a `with pure` parameter arises
   in RowFinish. `fx-layout-edges` needs the mutually recursive pair A/B;
   the self-recursive `Grow` is rejected without the dropped edge.
4. `fx-defer-fail` and `fx-defer-unified` overlap: both accept a late
   `Fail` (a closure whose `Fail` arrives after the `defer`) when either
   defect is restored. The rows differ in which line of Check.Defer is
   restored (the `Fail` refusal, or checking against the current row).
5. The regression runner leaves about 2 GB under `.build/regression` per
   run; delete it afterwards (see the disk-hygiene rule).
6. FN006 (1): the zero-argument call gap in the oracle parsers is closed
   for `f()` but not for `make()(x)`, which still has no oracle row
   (BACKLOG FN006).
7. `ctl` and `resume` are reserved everywhere, but the dedicated E_SYNTAX
   `General control (ctl/resume) is not supported yet` appears only in
   expression position (Format/Parse/Expression.purs). Probed with the CLI:
   `resume(1)` gives that message; `effect E { ctl op(): Int; };` gives
   `Expected '}'`; `with handler E { ctl op() => 1, } {...}` gives
   `Expected an identifier`. Spec §1 asks for a dedicated diagnostic; the
   code falls short in the two declaration positions (BACKLOG FX006).

## FX020: effect namespaces (2026-10-14)

1. `node scripts/width.mjs` checks git-tracked files only. A new, unstaged
   file passes the gate silently; run it after `git add`. The Task 5b commit
   claimed a clean width gate and had an 81-column line for that reason.
2. A `where` helper without a type signature is monomorphic: one used at two
   record types (Unbound's built-in and user effects) fails to unify. Lift it
   to a top level function with a row-polymorphic signature.
3. A regression probe that only asserts "program was rejected" hides which
   rejection a mutant produces; print the code and message
   (test/regression-fx020.mjs `prints`).
4. The unbound-name hint is not narrowed by the row, by design: resolution
   never depends on rows, so it also offers the import form inside lambdas and
   for effects that cannot be imported; FX022 (done) made the import
   form write `Fail(E) { fail }`.
5. V8 warm-up changes the stack depth available to the first `compile` of a
   near-limit source (BACKLOG G006); paired comparisons of old and new trees
   need `node --stack-size=3000`, never a retry.

## R001: records (2026-10-14)

1. A regression row's `message` must pin the restored defect's symptom (the
   Go error or the wrong output), not just the probe's own failure label:
   the five Task-10 rows matched only the label, so any mutant failure,
   such as a checker crash, would have satisfied the proof (tightened in
   Task 11).
2. Sort inference over declarations needs both directions, alternated until
   nothing changes, and one check of every use afterwards. A one-way fixed
   point, then one pass each way, each accepted contradictory programs or
   rejected valid ones (Task 3, four review rounds; ADR 013 "Row sorts").
   Reading only the previous round's sorts (Jacobi rounds) removes the
   dependence on declaration order.
3. Unifying a record's shared fields can bind the record's own tail
   (`{ a: { ...r }, ...r }`); deciding the tails from rows flattened before
   that overwrote the binding (Task 4 review). Flatten again after the
   fields unify.
4. The depth probe's boundary is noisy by one: parens-in-call-in-constructor
   read 325 once and 326 otherwise on the same tree (Tasks 4 and 5). Sample
   the boundary repeatedly before calling a margin lost. Moving hot helpers
   (`resolve*`, the `Subst` constructors) out of Features.Check.Subst cost a
   unit of margin and was reverted (Task 1).
5. A new field in a phase's output (IR `records`, checked `sorts`) makes
   every program differ in the differential; normalise it in the digest
   only where a baseline without it agrees, and say so (Tasks 7 and 8).
6. Field access through a nil declared-type pointer inside a record is a
   raw Go nil dereference; only foreign code can make one, and comparison
   and printing are nil-guarded (Task 7 review; BACKLOG I001 note).
7. The instantiation rule does not see record-row arguments: a recursive
   call that grows a record row reaches the 10,000-specialization limit
   instead of the rule's diagnostic (found while writing ADR 013; BACKLOG
   R010).
8. Seeding lacks only at signatures, constructors and operations left
   every type written in a body unchecked against its signature's rigid
   tails; the hole reached `go build` (a field declared twice), so it was
   not latent (final review C1). Treat every written type as a seeding
   site, and keep a lowering-time guard so a checker hole is an internal
   error, never a Go failure.
9. The ambient row is a function's own row tail as well as its callbacks'
   row; any type that shares it outside a callback position (a label's
   argument, FX024) must equal the caller's whole row at each call. Give
   such positions no ambient row.
10. A declared type's arguments are numbered two ways: by written
    position, and by variable place (type and record parameters first).
    Resolve.Lacking read one as the other, which only an effect row
    parameter before a record one exposes (R012, `r012-slot-position`).
    Convert in one named helper (RecordArguments `slotOf`).
11. Making a form writable widens every rule that assumed it was not: once
    a record row argument could hold fields, the declarations'
    instantiation rule, which skipped row arguments, admitted rows growing
    through recursion and the checker overflowed its stack (R012). Audit
    each rule that says "stands for no type" when a form becomes writable.

## R005 Tranche B: case 2g (2026-10-19)

1. A classification rule run at the end hides order differences an
   earlier rule causes. The 2g proposal was measured only with H on and
   reported "no order difference"; before H, its wait on a missing atom
   kept case 3 from refusing, and refusals became order dependent
   (`kindDiff` 4 in each shaped family; the compiler's judge, which runs
   before H, caught it in "program-shaped, shared"). Measure a new solver
   rule with and without any later classification, on every generated
   family the judge runs (research/row-merge-qt `node qt-2g.mjs`).
2. A precondition that only limits where a rule applies must make the
   rule step aside, not return "no progress": a no-progress answer stops
   the cases after it. Case 2's wait on a missing label is PureScript's
   and kept; 2g's makes no claim (rules file §3a, "The amendment").
3. A research prototype's options object is copied field by field
   (qt-facts.mjs `makeState`): a new option passed in but not copied is
   silently off, and a variant run with it measured nothing new until
   the field was added. Check that a new option changes some verdict
   before reading its measurements.
4. Once H classifies at the end of a body, a regression that only turns
   a refusal into a wait (the superseded 2g) is refused anyway, so a
   test of the refusal's class no longer catches it. Keep a check with
   H off (the entry's `finishWithoutH`) wherever an earlier rule's
   refusal is what is being protected; at the check phase, compare the
   location, since H refuses at the predicate's site (B4,
   `r005b-case2g-claim`).
5. scripts/width.mjs reads `git ls-files`, so a new file is not checked
   until it is added; B3 and B4 both met this (lines over 80 in new
   files reported clean). Run `git add -N <path>` on new files before
   checking widths; verify, which runs on a committed tree, is not
   affected.
6. `readdirSync(...).sort()` orders `diag-06-fix.json` before
   `diag-06.json` (`-` sorts before `.`), so lists of fixture names in
   tests follow that order, not the names' own.

## R005 Tranche B Task 7: stopped for the foundation assessment (2026-10-20)

1. A behaviour-preserving split can break a test that names files: the
   structural metadata test (test/r005b-render.test.mjs) listed the
   modules that write metadata by file name, so RowMerge/Chain, split
   from Desugar in 22d3631, read as a solving module and the test
   failed. The split was committed after a build and the formatter
   only, with no test run; the differential's harvest, which runs the
   suite in the frozen copy, caught it. Run the suite on a split commit's
   own tree before committing it. Fixed in 43b3a28.
2. A differential run reads the candidate's output/ while it runs:
   rebuilding output/ in the working tree mid-run invalidated one run
   (module not found). Run the candidate from a frozen copy
   (`git archive` of the commit, built there).
3. The approved provenance precedence (written lacks, written disjoint,
   implied, spread) hides D2' found late when a solving case binds
   between the two items' arguments: the case's binding states the
   second part's lack as `Implied` (a row the checker made), which ranks
   before `Spread`, so `f({ a: 1 }, { a: 2 })` through `fn(p, q) => {
   ...p, ...q }` reads Tranche A's shape text. D2' late is reached when
   one unification binds both parts (a callback whose parameter types
   are given; one argument holding both). On `r005b-task7-wip`, pinned
   as `d2-late` and a control; the precedence is the author's to change.
4. B5's case-bound blame (Check/Fault, R10.1 as amended by decision 22)
   took any field of either failing record that a case-bound part cannot
   take: `.x` on a removal's rest after `drop({ y: 2 }, { x: 1 })` read
   `so s cannot have field y`, though `y` is on the record that is fine
   and `x` was removed. On `r005b-task7-wip`, blame is limited to a label
   one record holds and the other cannot take, on a part the lacking
   record is (built through it, or equal to its row); `design-removal-
   right` and `diag-17` then read as approved. Not merged; it changes an
   accepted B5 behaviour and needs the author's review with Task 7.
5. On the Task 7 checkpoint (`r005b-task7-wip`), a literal of two
   spreads whose rows are all known passes checking and emits Go that
   does not build (`undefined: waxwingBasewaxwingLocal0`;
   research/composition-assessment/programs/shared-type-*.wxw). Task 8's
   placeholder P4 guards rows of several tails, not literals of several
   spreads, so lowering takes the one-spread path. To fix with Task 7
   (a placeholder at the literal's lowering until Task 8) if it resumes.

## R010 and composed rows: the `walk` probe (2026-10-21)

Narrow probe authorized in dossier §18.62 item 2, run against a scratch
copy of today's compiler (src identical to `main` at 6ee4144; nothing
in the repository changed). Program: `fn walk(whole: { ...u, ...v },
left: { ...s }, n: Int): Int where u disjoint s = if n == 0 then 0 else
walk(whole, left, n + -1);` (the language has no binary minus).

1. `walk` as written is refused at **check** with E_TYPE "Cannot tell
   whether walk's u or v holds walk's u; no annotation can decide u and
   v, which belong to this call of walk", at the recursive call's
   `whole`; the same with or without a caller and with or without the
   `where` clause. The one annotation form tested, a lambda parameter
   annotated `{ ...u, ...v }`, does not decide the split (same
   diagnostic); the probe does not show that every annotation fails.
   It is a refusal, not a selection of the identity split; it is
   E_TYPE, not E_SPECIALIZATION.
2. Pinning the split needs a changed signature (an extra `uonly: {
   ...u }` parameter). Pinned to the identity split, or to `u' = {}`,
   `v' = { ...u, ...v }`, check passes; with no caller both build and
   run (print `0`), which does not validate specializing or running a
   called `walk`; with a caller both stop at specialize with
   E_INTERNAL "R005B placeholder: rows with several tails are lowered in
   Task 8", as does a non-recursive two-tail function (not tied to
   recursion).
3. **The `u' = {}`, `v' = { ...u, ...v }` recursion is not refused by
   R010.** Cause, read from the code: `bareRow`
   (src/Features/Check/NestedArguments.purs:78-81) accepts a composed
   row with no fields, while docs/language.md describes the rule as the
   calling function's bare `{ ...r }` and dossier §18.18 says a composed
   witness is refused. Which is intended is open; BACKLOG R019. So
   "the identity split is the only admissible split" holds under the
   documented single-tail rule only, not for today's compiler.
4. docs/language.md's Tranche B paragraph ("stops at E_INTERNAL R005B
   placeholder" for a `disjoint` clause) is stale: such functions now
   pass check, and the placeholder appears at specialization of several
   tails. Recorded here; the language doc is not changed in this
   research tranche.

## R019 compatibility probe (2026-10-22)

Task 0.1 of the first R0 shadow tranche. Characterization only: no
source changed. `test/r0-r019-probe.test.mjs` pins, for seven shapes
named in T-R0e §1.4 (each with a caller and without), the stage that
stops today's compiler, its code and its exact text; fixtures are in
`test/fixtures/r0/r019/`, run through `phaseOf`
(test/r0-probe-support.mjs), which calls parse, resolve, check,
`specializationKeys` and `compile` directly.

| Shape | Without a caller | With a caller |
| --- | --- | --- |
| `walk` as written (`{ ...u, ...v }`, `where u disjoint s`) | stops at check, E_TYPE "Cannot tell whether walk's u or v holds walk's u; ..." | the same |
| `walk`, identity split via `uonly` | compiled | stops at specialize, E_INTERNAL "R005B placeholder: rows with several tails are lowered in Task 8" |
| `walk`, `u' = {}` via `uonly` | compiled | the placeholder |
| mixed `{ ...r, ...h }`, non-recursive | compiled | the placeholder |
| mixed with a named field before the tails | compiled | the placeholder |
| mixed, self-recursive | compiled | the placeholder |
| recursive component called from another recursive component | compiled | the placeholder |

Reading, for the probed sources only:

1. Every case that compiled is one in which the function is never
   called, so specialization never reaches it. No probed program that
   calls a multi-tail function compiled; all stopped at the Task 8
   placeholder (or, for `walk` as written, earlier at check).
2. So over these shapes, option 1 of T-R0e §1.4 narrows nothing that
   compiles *when called*. It would narrow the uncalled definitions,
   which compile today. This is evidence about seven sources, not about
   the language; it does not show that no multi-tail program compiles.
3. A spread literal `{ ...u, ...h }` is not a shape here: Resolve
   refuses it first (E_TYPE "A record literal accepts at most one
   spread"), so the shapes use `{ ...r, ...h }` in types only.
4. No decision is taken. G-R019 stays open; no default is built.

## `Exhausted` is not a budget (2026-10-22)

Task 0.2 of the first R0 shadow tranche (dossier §18.69 Q1: genuine
budget exhaustion is a limit, an invariant violation a fault). The
re-examination bound, P · (|Λ| + 1) + 1 passes
(Features/Check/RowMerge/Improve.purs `bound`), is the theorem of
docs/plans/2026-10-19-row-merge-rules.md §5 (L1): a lineage moves at
most |Λ| labels and is removed once, so a rescan makes at most
P · (|Λ| + 1) passes that change the state. The rule, fixed before
running: if no run of the domain below reaches the bound, and the
argument, re-read, is not refuted, `Exhausted` is a broken invariant;
if one reaches it, the author decides and no mapping is chosen.

How it was measured: test/r0-exhausted-support.mjs copies output/ and
reassigns the copy's module-level `pass` (stream 7b's copy-and-patch,
`patchedCopy` in
research/division-campaign/integration/measure/instrument.mjs) to
report, at each pass, the rescan's own counter `found.passes`
(changing passes so far) and `bound(found.start)`. The theorem allows
at most P · (|Λ| + 1) = bound − 1 changing passes, so its maximum is
`found.passes = bound − 1` and the ratio `found.passes / bound` stays
below 1; at `found.passes = bound` the theorem is broken. The
compiler raises `Exhausted` at `found.passes = bound + 1` (its check
is `found.passes > bound`, and also past its cheap count): one pass
after the theorem breaks, two after its maximum. The domain, every run
counted, valid or not: the five families of test/row-merge-gen.mjs,
the same generators and orders as test/row-merge.test.mjs but one seed
per problem, seeds 1-2000, each problem in its five orders (10,000
runs each, through test/row-merge-entry.mjs on the copy), and the
1,006 programs of the pinned R0 corpus (test/r0-corpus.mjs), compiled
through the copy's `compile`.

| Domain | Runs | Rescans | Passes | Largest ratio |
| --- | --- | --- | --- | --- |
| raw (perm.mjs) | 10,000 | 11,985 | 12,367 | 1/2 (seed 27) |
| dense (perm.mjs DENSE=1) | 10,000 | 44,822 | 44,822 | 0 |
| raw (programs-gen.mjs) | 10,000 | 6,499 | 6,611 | 1/2 (seed 300) |
| program-shaped | 10,000 | 53,798 | 62,169 | 2/3 (seed 142) |
| program-shaped, shared | 10,000 | 53,352 | 60,899 | 2/3 (seed 411) |
| R0 corpus, compiled | 1,006 | 289 | 366 | 1/2 |

No run reached the bound. The theorem's maximum was attained exactly,
though: the worst rescans have `found.passes = bound − 1` (1 at bound
2, 2 at bound 3), so they made P · (|Λ| + 1) + 1 passes in all, the
whole bound, in every family except dense and in the corpus. The
largest ratio, 2/3, is the theorem's limit at those bounds, not slack
below it; the bound is tight there and was not exceeded. The argument,
re-read (premises P1-P3, the lemma that a lineage's moved label sets
are disjoint, the theorem), is not refuted: the runs agree with it and
the re-reading found no step wrong. So `Exhausted` is a broken
invariant: Task 2.1 maps it to `AsFault (BrokenInvariant …)`. The
evidence is bounded: no counterexample within this grammar and corpus,
plus the argument; it is not a proof.

**Amendment (labelled): the measured quantity.** The first run
measured passes made, `found.passes + 1`, against the bound and
asserted that ratio below 1. It failed at once, for example
`{"made":2,"bound":2}` at program-shaped seed 24, program-shaped
shared seed 16 and the corpus's
research/division-campaign/r0/probes/b02-mayhold-forced.wxw (the
output kept showed those three; the rest scrolled off): each a
rescan that made exactly the bound's passes, which the theorem
allows. The measure was then changed to `found.passes` before
any result was read as a verdict, for two reasons. It is the brief's
quantity ("records `found.passes` and `bound(found.start)`"). It is
also the only reading under which reaching the bound refutes §5: the
theorem allows `found.passes` up to bound − 1, so a ratio of 1 breaks
it, while passes made equal to the bound is the theorem's own
maximum. The domain and the rule were not changed.

**For the author: the rule's wording.** "If a run reaches the bound"
admits two readings: total passes made reach P · (|Λ| + 1) + 1 (which
happened, within the theorem), or changing passes reach it,
`found.passes ≥ bound` (which did not happen, and which alone breaks
the theorem). This entry applies the second. If the author meant the
first, the rule as worded would have stopped the task on runs that
the theorem permits, and the mapping waits for a ruling.

Checks: test/r0-exhausted.serial.test.mjs asserts the ratio stays below
1 and that some pass was recorded (a changed output cannot measure
nothing; the support also fails if `pass` or `bound` is no longer
declared). Shown failing on a scratch copy of output/ with the
`r005b-quiet` defect (every pass counts as a change): the corpus run
reached ratio 16.5 (33 passes, bound 2, on
research/division-campaign/r0/probes/b02-mayhold-forced.wxw) and the
family run stopped with `Limit`. The source-level guard stays
`r005b-quiet` (scripts/regression-r005b-end.mjs), proved again.

The brief cites docs/plans/2026-10-17-open-row-merge-rules.md §5 for the
argument; that section is the sum rule. Improve.purs's "Rules §5" and
the theorem are in docs/plans/2026-10-19-row-merge-rules.md §5, which
is the one re-read here.

## `ValidR` sketch and today's printability (2026-10-22)

Evidence: test/r0-requirements-probe.test.mjs (Task 0.4, 16 tests, one
per case, in eight groups numbered in draft §2); the draft is
docs/plans/r0-validr-draft.md. Three findings for G-ValidR, none a
defect in today's compiler:

- **VR-sub fails under T-R0b §5.4's literal sketch.** With `Q` empty
  and every finite `θR` quantified, `pr a` at a rigid `a` fails at
  `θR(a) = Int -> Int`, so `fn p(item: a): Text = show(item)` has
  `¬ ValidR`; yet it compiles, and only its instances are judged after
  specialization (probe group 5). No verdict is wrong today (the plan
  keeps such atoms Unsupported), but the meaning that CX-PR consumes
  is. The draft's recommended reading adds an implicit printable
  hypothesis at every rigid variable (Pr-1), a policy point for the
  author.
- **The ground rule needs the holder set.** Today a declared type
  whose constructors hold a function (`Box(Int)` for `type Box(a) =
  Box(a -> a)`) is neither printable nor comparable whatever its
  arguments, and a phantom argument counts (`Tag(Int -> Int)` for
  `type Tag(a) = Tag(Int)` is refused). The sketch's "through record
  fields and `app` arguments" alone would accept `Box(Int)` (mutant 1
  below compiles `show(Box(inc))`). `ReqG` therefore reads the
  program's holder set, which the recorded problem must carry for
  VR-independent (draft §3.5).
- **VR-CX's encoding lands outside `ValidOpen`'s base set.** Encoding
  `app` values injectively as fresh bases gives solutions over an
  extension `B₂ ⊋ B₁`, while `ValidOpen` at `B₁` needs them over `B₁`.
  A non-injective collapse (every `app` node to one fixed value)
  suffices, since CX §4.1 condition 4 makes each occurrence its own
  variable (argued; draft §5.3). CX §4.1 condition 4 needs the same
  edit as T-R0b after the gate.

Status of each: finding 2 is checked (the probe, plus mutant 1).
Finding 1's "today" half (`p` compiles; its instances fail at
specialize) is checked; its `¬ ValidR` half is argued from the
definition. Finding 3 is argued and waits for a Lean rendering of
`GA` (§18.69 item 10). Foreign base types cannot be written today
(docs/language.md:182), so fresh bases reach `ReqG` only as rigid
variables' instances.

**Mutant runs (recorded, fix round 1).** Each on a fresh copy of
output/ (`cp -cR output <scratch>/output`, with the probe and
test/r0-probe-support.mjs copied to `<scratch>/test/`), patching only
output/Features.Check.Functional/index.js, then
`cd <scratch> && node --test test/r0-requirements-probe.test.mjs`;
the copy was deleted afterwards. The unpatched probe passes 16/16.

- Mutant 1, holders ignored (`TData` judged by arguments only):
  `return member(v.value0)(found) || Data_Array.any(...)` became
  `return Data_Array.any(...)`. Exit 1; 8 pass, 8 fail: "a holder
  type at a function-free argument, Box(Int)", "a holder type of no
  parameters, F", "a holder through the fixed point, Outer", "a type
  that stores its argument, Wrap, at each argument", "a phantom
  argument counts, Tag", "main returning each: E_ENTRY exactly where
  show is refused", "print at a rigid variable: accepted at check,
  judged per key", "print at a declared type over a rigid variable".
  First failing rows: `show(Box(inc))`, `show(F(inc))`,
  `show(Outer(Box(inc)))`, `show(Wrap(Box(inc)))`, `show(t())` at
  `Tag(Box(Int))`, `main(): Box(Int)`, `p(Box(inc))`, `show` of a
  `Box(a)` parameter, each with actual `{ phase: 'compiled', code:
  null, text: null }`.
- Mutant 2, a rigid variable or rigid record tail counts as a
  function: three lines added at the top of `containsFunction`
  (`TVar` holding a `Rigid` → true; `TRecord` with a `Rigid` tail →
  true). Exit 1; 11 pass, 5 fail: "print at a rigid variable:
  accepted at check, judged per key" (row `fn p(item: a): Text =
  show(item); fn main(): Int = 1;`), "an uncalled caller of p(inc):
  non-generic judged, generic not", "print reaching a rigid variable
  through a lambda or a reference", "print at a declared type over a
  rigid variable" (`s(Wrap(1))`) and "print at an open record: judged
  per key", each with actual phase `check`, E_TYPE, `Expected a
  printable value, found a` (or `Wrap(a)`, `{ a: Int, ...r }`). The
  compare-at-rigid cases still pass: today refuses them already.

## Effect and coverage audit (2026-10-22)

Task 0.5 of the first R0 shadow tranche, for gates G-effects (Q-c2)
and G-coverage (Q-c1), with fix round 1 (task review and the gate's
re-derivation). The criterion is the author's (dossier §18.69 Q4): a
check that depends on a solver-selected type is semantic. Q3 sets the
default for effects: an effect refusal is class a only where it is
shown not to consume record metas the online solver bound, otherwise
class f (`ClassF`). In the fixtures and the test, `semantic` is class
f for an effect refusal and `structural` is class a. Nothing in the
compiler changed.

**Method.** Each row cites the raise site and the lines that say what
the check reads. Each fixture in test/fixtures/r0/audit/ is one
variant of a program, by `role`: `inferred` (the record part is a
lambda parameter `r` the solver binds), `pinned` (annotated with some
type), `pinned-selection` (annotated with exactly the type the solver
selects), `selected` (the refusal site unchanged, something outside
it changed so that the solver selects another type), `control`,
`written` or `resolve`. A `selected` or `pinned-selection` variant
names its base (`against`) and the text it changes (`changes`; the
test recomputes it). test/r0-audit.test.mjs records each outcome
(stage, code, text, covered text, notes) and checks the class rules
on today's outcomes.

*Amended in fix round 1 (reason: the task review found the first
rule nearly vacuous).* Pinned against inferred alone is not evidence
when the pinned type differs from the solver's selection: two
different texts differ in text, span or notes anyway, and a lambda
annotation `with L` means L plus the ambient row, so most pinned
forms failed first for a new reason. A semantic row is now
"checked" only when a `selected` or `pinned-selection` variant
differs from its base, which check refuses, in stage or code. The
first round's pinned fixtures are kept as records. Every effect row
that was "checked" on a pinned difference now has a `selected`
variant that compiles, so no row was downgraded; HandlerMayFail and
Require.purs:123, argued in the first round, are now checked.
Evidence still holds only for these programs; the class itself is
derived from the cited lines.

| Refusal | Raise site | Reads (cited) | Decisive fixtures | What they show | Class |
| --- | --- | --- | --- | --- | --- |
| EffectNotAllowed | Check/Reject.purs:69 | a consumption's `RowMissing`/`RowExtra` under `state.subst` (Reject.purs:41-48, 75-77; Consume.purs:182-194) | effect-not-allowed inferred, selected | the same lambda; refused when the argument `h` performs Log, compiles when it does not | f, checked |
| EffectNotAllowed | Check/Require.purs:123 | `unify` under `state.subst` (Require.purs:86-99), `RowMissing` with a non-pure row (121-123); at the top level ArgumentRow.purs:62 rewrites it into CallbackRowLacks (FX018) | effect-not-allowed-require inferred, selected (and written) | a nested record argument `{ f: g }`: `This function performs Log…`; with the lambda's first argument `{ f: h }` changed to `{ f: g }` (outside the refused `{ f: g }`), compiles | f, checked |
| MustBePure | Check/Require.purs:122 | as above | must-be-pure inferred, selected, pinned-selection | refused, and refused the same with `r` pinned to the selected type; compiles with a pure `h` | f, checked |
| RowEquality | Check/Argument.purs:70 | the conflict re-derived for its tail: `unify state.subst` (Argument.purs:65) and `resolveRow state.subst` (:111) | row-equality inferred, selected | `r` carries p's row to q; compiles when q's row is p's (the change is in `both`'s q, not in the lambda) | f, checked |
| RowEquality | Check/RowName.purs:96 | `RowSharedTail` from `unify` under `state.subst` (Require.purs:100; `RowMismatch` there, :101, is TypeMismatch) and `RowSharedTail`/`RowMismatch` from a consumption (Reject.purs:45-46, 78) | none decisive; raised in the pinned forms of effect-not-allowed, callback-row-lacks, unhandled-effect | reads `state.subst` | f, argued |
| CallbackRowLacks | Check/CallbackParts.purs:63 | a consumption's `RowExtra` (Reject.purs:63-64 → Callback.purs:85; ArgumentRow.purs:107) | callback-row-lacks inferred, selected | compiles when q's row is `Log + M` | f, checked |
| UnhandledEffect | Check/Entry.purs:54 | `main`'s row under the settled `state.subst` (Entry.purs:43-44; Function.purs:88-90, 98) | unhandled-effect inferred, selected | compiles with a pure `h`; mutant M5 | f, checked |
| DeferMayFail | Check/Defer.purs:165 | the deferred row after settling (Defer.purs:125; Function.purs:91), and at the item (Defer.purs:60-61) | defer-may-fail inferred, selected | compiles when the stored function does not fail | f, checked |
| DeferMayPerform | Check/Defer.purs:134 | the settled deferred row's rigid tail (Defer.purs:123-136) | defer-may-perform inferred, selected | compiles when `g` is `with pure` | f, checked |
| DeferHandlerMayFail | Check/MarkReport.purs:49 | the mark graph from settled rows (Frames.purs:28-34), edges added by unification (UnifyMark.purs:132), searched in `Subst.marks` (Function.purs:92-94) | defer-handler-may-fail inferred, selected | compiles when the stored function performs nothing | f, checked |
| DeferHandlerVariable | Check/MarkReport.purs:48 | as above | defer-handler-variable inferred, selected | as above | f, checked |
| ExpectedNofail | Check/MarkReport.purs:74 | as above | expected-nofail inferred, selected | compiles when `work` is plain `Log` | f, checked |
| HandlerMayFail | Check/MarkReport.purs:61 | as above | handler-may-fail inferred, selected | compiles when the lambda no longer passes `r` to `use` (outside the refused handler literal); the pinned form is kept | f, checked |
| ExpectedHandler | Check/Handler.purs:75 | `headOf handlerValue.state` (Handler.purs:61-63) | expected-handler inferred, pinned-selection | `with r.h` at a meta is refused; pinned to exactly the selected `Handler(Log)`, compiles | f, checked |
| FailNeedsConcrete | Check/Failure.purs:102 | `typeHead (resolved subst ty)` of each payload, settled (Failure.purs:73-79, 214) | fail-needs-concrete-check inferred, applied | refused while `r` is unbound; compiles once applied to `{ e: E }` | f, checked |
| FailNeedsConcrete | Resolve/Row.purs:82 | the written payload (Row.purs:79-93) | fail-needs-concrete-resolve | raised in Resolve | a, checked |
| NofailOnFail | Resolve/Row.purs:71 | the written label | nofail-on-fail | raised in Resolve | a, checked |
| MarkVariableOutsideSignature | Resolve/Marks.purs:67 | written mark variables | mark-variable-outside-signature | raised in Resolve | a, checked |
| HandlerMissing | Resolve/Handler.purs:161 | declared operations against clause names (Handler.purs:148-163) | handler-missing | raised in Resolve | a, checked |
| HandlerDuplicate | Resolve/Handler.purs:142 | clause names (Handler.purs:133-146) | handler-duplicate | raised in Resolve | a, checked |
| HandlerOperation | Resolve/Handler.purs:90, Imports.purs:131, Qualified.purs:152 | a name against declared operations | handler-operation-{clause,import,qualified} | raised in Resolve | a, checked |
| NonExhaustive | Check/Coverage.purs:112 | the scrutinee's settled type (Coverage.purs:83; Function.purs:95, 107), inhabitedness per type application (Signature.purs `buildSignature`; Matrix.purs:59-63), record patterns widened by their settled type (Matrix.purs:139-149) | non-exhaustive selected-int, selected-v | the same match: refused when the argument is `Opt(Int)`, compiles at `Opt(V)`; mutant M2 | semantic, checked |
| RedundantArm | Check/Coverage.purs:101 | pattern types (Usefulness.purs:60; Matrix.purs:59-63, 137) | redundant-arm inferred, selected-int | `_` redundant at `Opt(V)`, not at `Opt(Int)`; mutant M2 | semantic, checked |
| AmbiguousType | Check/Comparable.purs:78 | holes left in the settled operand type (Comparable.purs:76-84; Function.purs:95-96) | ambiguous-type inferred, applied | ambiguous while `e` is never applied; compiles once applied | semantic, checked |
| Arity (pipe) | Check/Pipe.purs:36 | `functionLike`: `headOf state`, the type solved so far (Apply.purs:147-151; Scheme.purs:161-164) | arity-pipe-function-like inferred, order | E_ARITY once an earlier `r.f + 1` binds `f` to Int; otherwise a hole passes and E_TYPE comes later; mutant M1 | semantic, checked |
| Arity (call) | Check/Call.purs:148 | `functionLike` at the call's result, after the arguments | arity-call-function-like inferred, order, selected-fn | as for the pipe; compiles with `inc` | semantic, checked |
| Arity (call) | Check/Call.purs:144 | `functionLike` at the callee's freshly instantiated declared result, before any argument: a fixed head is never a function, a variable is an unbound hole | arity-call-fixed-result | E_ARITY at `size(r, 1)` pinned or inferred, before `r.x` is read (control: E_TYPE); mutant R3 | a, checked |
| Arity (pipe) | Check/Pipe.purs:33 | the callee's declared result and the argument count (Call.purs:83-106); no `State` | arity-pipe-fixed-result | as for Call.purs:144 | a, checked |

Other arity sites, cited and not probed: Call.purs:123 (a count
against declared fields), Show.purs:27 and Operation.purs:64, 104
(one argument): structural by the code, class a (argued). FieldArity,
FunctionNeedsCall and TypeArguments were not examined.

**Q-c2 (G-effects).** Every effect refusal raised by check is class f,
ExpectedHandler included: each reads the online solver's state, and
each row but RowName.purs:96 has a decisive selected variant. Q3
speaks of record metas; Reject.purs:69 is also reached with none
(`fn k(): Unit = h(1)`, the gate's probe ena-direct, not recorded
here), which is consistent with a per-site class f. The class-a
refusals are those raised in Resolve: HandlerMissing,
HandlerDuplicate, HandlerOperation (three sites), NofailOnFail,
MarkVariableOutsideSignature and the Resolve-time FailNeedsConcrete.
Every E_HANDLER refusal is raised in Resolve.

**Q-c1 (G-coverage).** Today's coverage has no structural part at a
raise site: RedundantArm and NonExhaustive read settled types on
every path (cited above), and the selected fixtures show both
verdicts following the type the solver selects. Some matches read
only written types (a parameter typed `Bool`), but telling them
apart needs a predicate today's code does not compute ("no column
type has a solver-bound part"). Task 2.3 classifies at each check's
raise site (plan Task 2.3 "Interfaces": "applied at each check's
raise site"; plan review rows S5 and N5), so it cannot split one
site without that predicate, which would be new machinery and is not
proposed. Recommendation (argued): both coverage refusals are
semantic, and Task 2.3 adds no coverage `StaticRule` rows. Arity has
two structural sites (Pipe.purs:33, Call.purs:144) and two semantic
ones (Pipe.purs:36, Call.purs:148). **Open:** semantic coverage runs on
the accepted witness after `admit` (plan Task 6.1); what a semantic
coverage refusal becomes when it is reached only through an unforced
choice of the solver is not decided here.

**`AmbiguousType`'s reason (for the author; for Task 2.2).** Derived
through T-R0a §5.3 rule 3 (generation-interface.md:815-828) with G0's
guard and check as plan Task 4.2 specifies them (argued). f02's atom
is `cmp α` at a flexible `α`. `g0Guard` declines only atoms that stay
non-ground after `entailedGround` and mention a rigid variable, or lie
outside the unitary fragment, so it admits this one. `online` then
produces a candidate that keeps the hole, and G0's `check` either
refuses it with the `RequirementUnjudged` backstop (a guard/check
disagreement, which RT8 counts as a defect) or accepts it (Solved,
which conflicts with the decided Unresolved of §18.69 Q4, since `cmp`
at an unconstrained variable is satisfiable, T-R0b C8). No specified
path gives a reason today. Options, not chosen:

- `Unsupported RequirementAtoms`. Needs a new mechanism: for example a
  check refusal for a requirement at an unbound flexible variable that
  rule 3 reads as `Unsupported RequirementAtoms`, as it reads
  `RequirementOpen`. The guard cannot do it, because it cannot tell
  f02's `α` from AT19's second case (an atom σ grounds, which must
  reach check). Novel machinery; needs the author's approval.
  Consequence: f02 is reported as outside the supported model, beside
  `pr a` at a rigid `a`.
- `Inference NoAcceptedCertificate`. What rule 3 gives if G0's check
  refuses the candidate. Consequence: the online candidate is
  `ClaimsComplete`, so the refusal is also a `CandidateRefused`
  search fault, and the `RequirementUnjudged` backstop that RT8
  counts as a defect becomes an expected path unless the check's
  refusal is given its own kind.
- `Inference NoCandidate`: rejected. It says the search found
  nothing, but the online search finds a solution that keeps the hole.

**Defect found (live checker; recorded, not fixed).**
fx010-record-payload/pinned is a user program that ends in E_INTERNAL
`Effect row consumption failed`, the catch-all at Check/Reject.purs:54.
The same program with the record part inferred gets the user
diagnostic `k performs Log, which its signature does not allow`. This
is a new, smaller reproducer for BACKLOG FX010. Which `Failure`
constructor reaches the catch-all was not investigated. Two
diagnostic problems found by the gate are in BACKLOG FX030
(must-be-pure/clock-row, effect-not-allowed-require/written).

**Mutant runs (recorded, first round, against the first round's
test and 52 fixtures).** Each run used one isolated copy in the
session scratchpad: output/, src/, test/r0-audit.test.mjs,
test/r0-probe-support.mjs, test/fixtures/r0/audit/ and
scripts/structure.mjs, copied to the same paths. The copy was
patched, run with `node --test test/r0-audit.test.mjs`, restored
after each mutant and deleted at the end. Unpatched, 7 of 7 tests
pass.

- M1, `functionLike` ignores the substitution
  (output/Features.Check.Apply/index.js line 44: `var v =
  Features_Check_Scheme.headOf(state)(ty);` became `var v = ty;`).
  1 test failed, "every audit fixture gives its recorded refusal", at
  arity-call-function-like/pinned. Both pinned arity forms became
  E_TYPE `Expected a function, found Int` at `1`, so their E_ARITY
  needs the solved binding of `get`'s `a`.
- M2, every constructor is inhabited
  (output/Features.Check.Signature/index.js line 162: `inhabited:
  inhabited` became `inhabited: inhabited.map(function () { return
  true; })`). 2 tests failed: "every audit fixture gives its recorded
  refusal" (non-exhaustive/selected-v is refused) and "a semantic row
  has variants that differ" (redundant-arm: all three forms compile).
- M3, redundant-arm's three fixtures relabelled `"class":
  "structural"`. 1 test failed: "a structural row is resolve-time or
  agrees across variants" (redundant-arm/pinned).
- M4, `import Features.Check.Scheme (State)` added to
  src/Features/Resolve/Lacking.purs. 1 test failed: "Features.Resolve
  imports none of the online solver".
- M5, `main`'s row read without the substitution
  (output/Features.Check.Entry/index.js line 38:
  `resolve(state.subst)` became `resolve(Features_Check_Subst.empty)`).
  1 test failed, "every audit fixture gives its recorded refusal":
  unhandled-effect/inferred compiles, because Log is in `main`'s row
  only through the solved binding of `r`.

**Fix-round runs (recorded).** Same method, on a fresh copy of the
fix-round test and its 78 fixtures; 8 of 8 pass unpatched. The copy
was deleted afterwards.

- R1, must-be-pure.selected.json removed. 2 tests failed: "every
  audit fixture gives its recorded refusal" (the count pin) and "a
  checked semantic row has a decisive selected variant"
  (must-be-pure/inferred): its pinned and pinned-selection forms
  alone do not pass the rule.
- R2, M5's patch (Entry line 38, the empty substitution). 2 tests
  failed: the recorded-refusal test and the decisive-variant test,
  both at unhandled-effect/inferred, which compiles.
- R3, Call.purs:144 given an empty substitution
  (output/Features.Check.Call/index.js: `functionLike(usable)` became
  `functionLike(Object.assign({}, usable, { subst:
  Features_Check_Subst_M.empty }))`, with that module imported). 8 of
  8 pass: the structural Call.purs:144 fixtures do not depend on the
  substitution (bounded evidence on these programs).
- must-be-pure/clock-row, the 79th fixture (BACKLOG FX030), was added
  after these runs; the test then passed 8 of 8 with it.

**Fix round 2 (re-review N1).** Two `selected` variants changed text
inside their base's refusal span, against the definition above:
effect-not-allowed-require/selected (`g` to `h` inside `{ f: g }`)
and handler-may-fail/selected (the handler literal itself). The first
now changes the lambda's other argument (`{ f: h }` to `{ f: g }`);
the second is the former control (`use(r)` to `0`), now
`role: "selected"`, and the in-span variant is removed. Both compile,
and both rows stay checked. 78 fixtures.

**Limit of the tests (argued).** The class tests check that the
evidence is consistent with each class; they do not derive it, and
they cannot check that a `selected` change lies outside the refusal
site (the `changes` field records it for the reviewer). The gate's
reviewer re-derives each class from the cited lines.

## Erased effect rows (2026-10-22)

Task 0.7 of the first R0 shadow tranche, for gate G-erased. The design
note is docs/plans/r0-erased-rows.md; this section records its runs.
Nothing in the compiler changed.

**Probe (checked).** test/r0-erased.test.mjs runs the fixtures in
test/fixtures/r0/erased/ (23 in the first round, 27 after fix round
1) through `refusalOf` and pins each outcome (phase, code, text,
covered text). `node --test test/r0-erased.test.mjs`: 4 of 4 pass.
First-round results:

- obligation-record/refused, `apply(h, { y: 1 })` where `apply`'s
  `a` is fixed only by the `State` label argument of `h`'s row:
  check, E_TYPE `Expected { x: Int }, found { y: Int }` at
  `{ y: 1 }`. The control `apply(h, { x: 1 })` compiles. No T-R0b
  marker applies (argued), and the recorded problem is satisfiable by
  hand translation (argued), so a strategy solving only the recorded
  atoms would call it Solved.
- obligation-annotation/refused, the same obligation through a
  lambda annotation's shared row: E_TYPE `Expected Unit -> Unit,
  found Unit -> Unit` at `h`; the control compiles.
- obligation-ground/refused, `State(Int)` against `State(Bool)` with
  no record or variable: the same text at `h`; the control compiles.
- The 17 `form` fixtures (one per operation, handler and `fail` form,
  signature, annotation and constructor source) all compile, and
  each declaration `g` contains its resolved form (checked by walking
  the resolved program).

**Mutant runs (recorded).** One isolated copy in the session
scratchpad: output/, package.json, test/r0-erased.test.mjs,
test/r0-probe-support.mjs and test/fixtures/r0/erased/, at the same
paths. Unpatched: 4 of 4 pass. Each mutant was restored before the
next; the copy was deleted at the end.

- M1, label arguments never unified
  (output/Features.Check.UnifyRow/index.js line 74:
  `bind(foldM(unifyPair)(pending.subst)(Data_Array.zip(entry.label.value1)(found.other.label.value1)))(marked)`
  became `bind(new Data_Either.Right(pending.subst))(marked)`).
  1 test failed, "every erased-row fixture gives its recorded
  outcome". Listing every fixture's outcome under M1: exactly
  obligation-record/refused, obligation-annotation/refused and
  obligation-ground/refused changed, each to compiled. So the three
  refusals come from label-argument unification
  (Check/UnifyRow.purs:159-163).
- M2, form/fail-written relabelled `"family": "unwritten"`. 1 test
  failed, "each form fixture writes its resolved form in g", at
  form/fail-written.
- M3, form/reference-plain's `node` changed from `OperationRef` to
  `Perform`. The same test failed at form/reference-plain.
- M4, form/print relabelled `"marked": true` with no source. 1 test
  failed, "predictions use the criterion vocabulary", at form/print.

**Diagnostic found (live checker; recorded, not fixed).** Two of the
refused programs report `Expected Unit -> Unit, found Unit -> Unit`:
the types differ only in their rows, which the text omits, so it
names two equal-looking types as a mismatch. BACKLOG FX031.

**Limits (first round).** The fixtures' `sources` and `marked` were
the criterion's predictions, unchecked, and data types with row
parameters had no fixture. Fix round 1 removes both limits (below).

**Fix round 1 (task review Important 1-2; G-erased gate findings
1-7).** *Amended after the first round's runs (reason: the task
review found the `operation` source ambiguous and the prediction test
tautological).* The `operation` source is split into `perform`
(OperationRef and Perform: the performed label and the operation's
declared types) and `clause` (handler clauses: the declared types
only); types are read as declared; a `Fail` node contributes to
`fail` only. Every fixture's `sources` was re-derived by hand from the
revised table, and a new field `inferredRow` records the part (ii)
predicate P-ii (note §7), also by hand. test/r0-erased-criterion.mjs
is a reference reading of both tables over resolved syntax; the test
"each fixture has the criterion's answers for g" compares it with the
hand-derived fields of all 27 fixtures and replaces the vocabulary
test (M4 above tested the replaced test). The hand derivation and the
reference reading agreed on the first run.

New fixtures (checked, `node --test test/r0-erased.test.mjs`, 4 of 4
pass):

- obligation-rowvar/refused (gate P1): `link(h, k)` with `h: Unit ->
  Unit with Reg(Unit -> Unit with Log + ...e)` and `k: Unit -> Unit
  with Clock + ...e` against `link(h: … Reg(Unit -> Unit with ...r),
  k: Unit -> Unit with ...r)`: check, E_EFFECT `k must allow every
  effect of link's parameter k (Log), but its row is Clock; a
  function value passed as an argument must have its parameter's row
  (FX018)`. Control (`k` with `Log + ...e`): compiled. Unmarked.
- obligation-data/refused (gate P2): `type Job(...e) = Job(Unit ->
  Unit with ...e)`, `apply(j: Job(State(a)), x: a)`, `g(j:
  Job(State({ x: Int }))) = apply(j, { y: 1 })`: check, E_TYPE
  `Expected { x: Int }, found { y: Int }`. Control: compiled. Marked
  by `own` and `callee`.

Mutant runs (recorded; same method as above, on a fresh isolated
copy that also held test/r0-erased-criterion.mjs; 4 of 4 pass
unpatched; deleted afterwards):

- M1 again (the UnifyRow patch above) on the 27 fixtures. 1 test
  failed, "every erased-row fixture gives its recorded outcome".
  Listing every outcome: exactly the five refused obligation fixtures
  (record, annotation, data, ground, rowvar) changed, each to
  compiled.
- M5, the performed label ignores the effect's parameters
  (test/r0-erased-criterion.mjs: `program.effects[node.value1]
  .parameters.length > 0 || fires(…)` became `fires(…)`). 1 test
  failed, "each fixture has the criterion's answers for g", at
  form/perform-parameterized.
- M6, P-ii ignores row tails (`row.value1.constructor.name ===
  'Just' ||` removed from `openRows`). The same test failed at
  obligation-ground/control.
- M7, variables do not make a label argument record-capable (the
  `TVar` disjunct removed from `recordOrVariable`). The same test
  failed at form/callee-signature.

Gate probe P6 re-run (checked by a scratch script, not a test): with
`effect Op { fn op(): Int with State({ x: Int }); }`, `fn g(): Int
with Op = Op.op()` compiles, and so does the same with `with Log`.
An operation's own row is dropped at Resolve (Resolve/Effect.purs:
47-58). Recorded as BACKLOG FX032, an observation for the author; not
fixed.

**Fix round 2 (re-review N1; gate finding 2).** *Amended after fix
round 1's runs (reason: the re-review found two fresh-row sites
reaching the checked IR that P-ii missed: bare `show` and applying a
meta-typed value).* The fresh effect-row sites of src/Features/Check
were enumerated mechanically (note §2.1: `grep -rn "openRow (Hole\|Hole
(state.next\|Hole state.next\|(Just (Hole\|Just (Meta\|Meta fresh"`
and `grep -rn "TFun [a-z(]"` over src/Features/Check, with the helpers
they call). The enumeration found a third missed site: a partial
application's remaining stages (Stages.purs:23 via Call.purs:191),
and a fourth trigger, constructor patterns (Match.purs:110).

Probes (checked; a scratch script ran parse, resolve and check on the
worktree's `output/` and printed `g`'s checked body and its count of
rows with a `Hole` tail; `node ir.mjs "<source>"`; deleted after):

- `fn k(x: a): Int = 0; fn g(): Int = k(show);`: 2 hole rows;
  `Call(0 [TFun(TVar(Hole(0)) Row([] Just(Hole(1))) TText)] [Lambda …])`.
- `type Opt(a) = None | Some(a); fn g(): Int = { let n = None; match
  n { Some(f) => f(1), None => 0 } };`: 0 hole rows, but
  `Construct(0 [TFun(TInt Row([] Just(Rigid(0))) TInt)] [])` and the
  same arrow in the pattern and local types; no row is written. The
  same with `1 |> f`.
- `fn add(x: Int, y: Int): Int = x + y; fn g(): Int = { let f =
  add(1); 0 };`: 1 hole row, `TFun(TInt Row([] Just(Hole(0))) TInt)`.
  Likewise `type P = P(Int, Int)` with `P(1)`, and `effect Two { fn
  two(a: Int, b: Int): Unit; }` with `Two.two(1)` (row `Two` plus a
  hole tail).
- `type Job(...e) = Job(Unit -> Unit with ...e); fn g(j: Job(Log)):
  Int = match j { Job(f) => 0 };`: the pattern types hold the
  instantiated row parameter, solved to `Log` with `g`'s rigid tail.
- defer-plain, `fn g(): Int = { defer (); 0 };` and the `nofail Log`
  form with `defer Log.log(1)`: no row in the IR
  (`Block([Defer(Expr(… UnitValue))] …)`).
- `fn g(): Text = show(1);` and `fn g(): Int = crash(1);`: no row
  (`Show(…)`, `Crash(…)`); only the bare references make one.

P-ii and the reference reading's `inferredRow` gained `ShowRef`, any
`Apply` or `Pipe`, partial applications and constructor patterns.
Seven form fixtures were added (show-reference, apply-meta, pipe-meta,
partial-call, partial-construct, partial-perform, pattern-row; each
compiles, `sources` `[]`, `inferredRow` true by hand, and each
triggers P-ii by its own disjunct only). Re-derived by hand:
form/own-signature's `inferredRow` becomes true (`h(())` is an
`Apply`); the reference reading agreed with every other fixture.
`node --test test/r0-erased.test.mjs`: 4 of 4 pass on 34 fixtures.

Mutant runs (recorded; isolated copy as before; 4 of 4 pass
unpatched; deleted afterwards). Each drops one site from
test/r0-erased-criterion.mjs `inferredRow`, and each failed "each
fixture has the criterion's answers for g" at that site's fixture:

- M8, `'ShowRef'` removed from the `made` list: form/show-reference.
- M9, `'Apply'` removed: form/apply-meta.
- M10, `'Pipe'` removed: form/pipe-meta.
- M11, partiality ignored (`partial ||` removed): form/partial-call.
- M12, the constructor-pattern line removed: form/pattern-row.

## The verdict token boundary (2026-10-22)

Task 1.1 of the first R0 shadow tranche: Domain.Verdict (with
Verdict/Admission, Verdict/Open and Verdict/Internal) and the opaque
`RecordedProblem` (Domain.Recorded, Recorded/Internal). Nothing in
the compile path imports them (test/r0-verdict.test.mjs, last test).

**Compile probes (checked; purs 0.15.16).** Each probe module was
compiled with `purs compile 'src/Domain/**/*.purs'
'.spago/p/*/src/**/*.purs' <probe> -o <scratch>`, one per run, and
deleted afterwards. A client importing `Domain.Verdict (Valid,
Refuted, NonForced, ForcednessEvidence, Solution)` and
`Domain.Recorded (RecordedProblem)` and naming each type compiled
(exit 0). So did a trusted module importing `Domain.Verdict.Internal
(Valid(..), Refuted(..), CX, NonForced(..), ForcednessEvidence(..))`
and building each. Each of these failed (exit 1):

| Probe | purs error |
|---|---|
| `import Domain.Verdict (Valid(..))`, then `Valid` | Unknown data constructor Valid |
| `import Domain.Verdict as V`, then `V.Valid` | Unknown data constructor V.Valid |
| `V.ForcednessEvidence` from Domain.Verdict | Unknown data constructor V.ForcednessEvidence |
| `coerce ∷ CX → Refuted` | No type class instance for `Coercible { body, rho } Refuted` |
| `coerce ∷ Array CX → Array Refuted` | the same instance |
| `coerce ∷ {} → RecordedProblem` | No type class instance for `Coercible (Record ()) RecordedProblem`; needs the newtype constructor in scope |
| `import Domain.Recorded (RecordedProblem(..))`, then `RecordedProblem {}` | Unknown data constructor RecordedProblem |
| `CheckRefusal` from Domain.Verdict.Open as a value | Unknown data constructor CheckRefusal (uninhabited) |

**purs accepts a leak, so the source rule is needed (checked).** With
Domain.Verdict's import changed to `Valid(..)` inside `as Exports`,
`node scripts/build.mjs` succeeded (exit 0). Two gates caught it:
test/r0-verdict.test.mjs "public modules export no token or problem
constructor" failed with `Domain.Verdict exports Valid`, and
`checkStructure()` reported `src/Domain/Verdict.purs: imports
Domain.Verdict.Internal beyond bare type names`. Source restored and
rebuilt.

**RED runs (checked).** Before the source existed, `node --test
test/structure-r0.test.mjs` failed with `SyntaxError: The requested
module '../scripts/structure.mjs' does not provide an export named
'exportFindings'`, and `node scripts/build.mjs && node --test
test/r0-verdict.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for
output/Domain.Verdict/index.js.

**Mutant runs (checked)** on scripts/structure.mjs, each restored
afterwards; `node --test test/structure-r0.test.mjs` passes 5 of 5
unpatched:

- A, the Domain.Verdict.Internal entry deleted from
  `internalModules`: "only the trusted checkers import
  Domain.Verdict.Internal" fails.
- B, the Recorded rule's `Generate(\.|$)` replaced by `Generate`:
  "only Generate* and Domain.Recorded import Domain.Recorded.Internal"
  fails (Features.Check.GenerateX admitted).
- C, the trailing `$` dropped from the Verdict rule: the trusted-checker
  test fails (Features.Check.Refute.Rules.X admitted).
- D, `bareTypes` replaced by `/^\(.*\)(\s+as\s+\w+)?$/s`: both
  re-export-form tests fail.
- E, other modules' re-exports no longer reported: "no other module
  re-exports a token Internal module" fails.

**Fix round 1 (review I1; checked).** The review compiled three shapes
that purs 0.15.16 accepts, that re-export a token constructor, and that
the first `exportFindings` passed: a dotted alias (`as T.I`, `module
T.I`), a trailing `-- comment` on the import, and a comment containing
`) where` inside the export list. Against the old check, a throwaway
script gave 0 findings for each of these six: (a) the dotted alias,
(b) the trailing comment, (c) a line comment in the export list, (c2)
a block comment `{- ) where -}` there, (c3) a comment before `module
Domain.Verdict.Internal` in the export list, and (d) an aliased import
that is not re-exported. It also gave 1, a false positive, for a
public module whose bare-types import ends in a comment. `node --test
test/structure-r0.test.mjs` failed "no other module re-exports a
token Internal module" (first at `module T.I`) and "comments do not
hide or invent a public-module finding". The new check removes
comments first, and outside the public module it reports any alias on
an import of a restricted Internal module and any export of the
Internal module by its own name. After the change the script gave 1
for each of (a)-(d) and 0 for the commented public import, and the
file passes 6 of 6. Mutants, each restored: M-F (comments not
removed) fails both tests above; M-G (aliases never reported) fails
"no other module re-exports a token Internal module".

**Fix round 2 (re-review 1, I1; checked).** Re-review 1 compiled eight
more forms that purs 0.15.16 accepts and the round-1 source check
passed: P1 and P7 (a `{-` inside a line comment, which the stripper
read as a block comment), P9 and P10 (`-->` and `--|`, which purs reads
as comments), P2 and P11 (an indented top-level block), P3 (an
indented module header) and P4 (CRLF). Ruling: check the compiler's
output instead of source. Probes, each compiled with `purs compile
'src/Domain/**/*.purs' '.spago/p/*/src/**/*.purs' <probe> -o
<scratch>/out` (exit 0) together with a client module that imports the
constructor through the probe module and builds it (exit 0 for P0-P11):
every one of P0 (a plain alias), P1, P2, P3, P4, P7, P9, P10, P11 and
N0 (an alias named `Exports` outside the public module) emitted the
same statement, `export { Valid } from
"../Domain.Verdict.Internal/index.js"` (`RecordedProblem` from
Domain.Recorded.Internal for P11, `Refuted` for N0). T0, a type-only
`module X` re-export, emitted no export at all, as does the real
Domain.Verdict. The sources and emitted index.js files are kept
verbatim in test/fixtures/r0/reexport/probes.json. Against them the
round-1 `exportFindings` gave 1 finding for P0 and N0, 0 for P1-P11,
and 1 for the harmless T0. `reexportFindings` gives exactly one
finding for each of P0-P11 and N0, none for T0 and none over the real
output/. Mutants, each restored: M-H (`export *` not matched, which
also shifts the capture group) fails both fixture tests; M-I (public
modules exempted by name) fails "type-only re-exports and other
modules pass; export * does not"; M-J (matching a wrong target) fails
both fixture tests.

**Fix round 3 (re-review 2; checked).** Re-review 2 found a route with
no re-export: in an allowed importer, `infix 4 Valid as <!>` exported
as `((<!>))`. Probe (purs 0.15.16, as before, exit 0): Rules declares
`infix 4 Valid as <!>` and `infix 4 NonForcedness as ~~` and exports
both; a client builds `v = (<!>)` and `n e = (~~) e`. Rules' index.js
has no import and no export at all; the client's has `import * as
Domain_Verdict_Internal from "../Domain.Verdict.Internal/index.js"`,
`Domain_Verdict_Internal.Valid.value` and `new
Domain_Verdict_Internal.NonForcedness(e)`. A second probe compiled a
client of P0's plain re-export (`import Features.Check.Refute.Rules
(Valid(..))`, `v = Valid`): it too imports Domain.Verdict.Internal's
JS directly, not the re-exporter's. So the import check alone would
catch any client of a re-export, but not a re-export nobody uses yet;
`reexportFindings` stays, to report the re-exporter itself. The three
emitted files are in probes.json under `inlined`. RED: under the
round-2 scripts/structure.mjs, `reexportFindings` gives 0 for all
three, there is no import check, and the new test file fails to load
(`does not provide an export named 'importFindings'`); re-review 2
recorded `graphFindings` giving `[]` (the client's source names only
Domain.Verdict, Domain.Verdict.Open and Rules). `importFindings`
gives one finding for each client, none for the same JS under an
allowed importer's name, and none over the real output/, where only
Domain.Verdict and Domain.Recorded import a token module. Mutants,
each restored: M-K (allowed importers not exempted) fails "a
disallowed module importing a token module's JS is a finding" and the
real-output test; M-L (only `import { … } from` matched, not `import *
as`) fails the first.

**Fix round 4 (re-review 3; checked).** Controller ruling ("threat
model"): allowed importers are trusted, so their export surface is
pinned and reviewed; other modules are held off by the graph rule, the
two output checks, the compiler, and a scan of FFI JS. Probes, each
compiled with `purs compile 'src/Domain/**/*.purs'
'.spago/p/*/src/**/*.purs' '<probe>/*.purs' -o <probe>/out` (exit 0)
in a scratch directory, deleted afterwards, kept verbatim with their
index.js (and foreign.js) in test/fixtures/r0/trusted-surface/
probes.json. Adaptation, labelled: re-review 3's I, K and J export
only the alias or `module X`; each here also exports one reviewed type
(`RuleSpec`, `Spec`) so that a baseline pin exists, because purs
rejects an empty export list (`module … () where`: "Unable to parse
module: Unexpected token ')'"). Baselines: Rules `(RuleSpec)` (A's
Rules without the instance) and Generate `(Spec)`; both emit no
`export`. I: Rules `(RuleSpec, (~~))` with `infix 4 Refuted as ~~`;
its client's index.js is `var r2 = function (cx) { return cx; };` with
no import. K: Generate `(Spec, (##))`; Decide's index.js is `var
forged = {};`. J: Rules `(RuleSpec, module X)` emits `export { Refuted
} from "../Domain.Verdict.Internal/index.js"`; its client imports
nothing. A: Rules `(RuleSpec)` with `instance mintRuleSpec`; it emits
`export { mintRuleSpec }`, and the client calls
`Features_Check_Mintable.mint(Features_Check_Refute_Rules.mintRuleSpec)`.
E: Runtime.Mint's foreign.js imports `Valid` from
"../Domain.Verdict.Internal/index.js"; Program.Use re-exports it. At
run time A's `v` and E's `v` are `instanceof` the compiled `Valid`,
and I's `r2({rho: 1})` returns the record unchanged.

RED: under HEAD f786078's scripts/structure.mjs, a throwaway script
ran `reexportFindings`, `importFindings` and `graphFindings` (purs
graph of src/Domain plus the probe, probe paths rewritten to src/)
over each probe: I, K, A and E gave `[]` from all three; J gave only
`Features.Check.Refute.Rules re-exports { Refuted } from
Domain.Verdict.Internal`, nothing for its client. The new
test/structure-surface.test.mjs failed to load there
(`ERR_MODULE_NOT_FOUND` for scripts/trusted-surface.mjs). GREEN: it
passes 7 of 7. With each baseline pinned, `surfaceFindings` reports
I `source … added (~~)`, K `source … added (##)`, J `source … added
module X` and `compiled … added Refuted from
../Domain.Verdict.Internal/index.js`, A `compiled … added
mintRuleSpec`; `foreignFindings` reports E's foreign.js under
src/Runtime/Mint.js and output/Runtime.Mint/foreign.js. Ten header
variants the parser does not accept (block or line comment in the
header, CR, tab, `(-->)`, `(<--)`, no export list, wrong module name,
a leading `{- -}`, non-ASCII) each give one fails-closed finding.
End to end: exporting a new `probe ∷ Int` from Domain.Recorded and
rebuilding made `checkStructure()` report `Domain.Recorded: source
exports differ from the pin, added probe` and the same for compiled
exports; restored and rebuilt, it gave `[]`.

Mutants (patches applied by a scratch script, each restored; `node
--test test/structure-surface.test.mjs`): M1, compare only `source`:
"an allowed importer's surface beyond its pin is a finding" fails.
M2, compare only `compiled`: the same test fails. M3, an unpinned
importer returns `[]`: "an unpinned allowed importer and a stale pin
are findings" fails. M4, the `op` containing `--` rejection removed:
survived at first (`(-->)` is already refused as a comment), so the
`(<--)` variant was added (amendment, after the run); then "a surface
the parsers cannot read fails closed" fails. M5, allowed importers not
exempted from the FFI scan: "FFI naming a token Internal module is a
finding (probe E)" fails. M6, output/<M>/foreign.js not collected:
"the real tree matches its pin and its FFI names no token module"
fails. M7, the FFI pattern matching only `Domain/…/Internal`: the
probe E test fails.

**Fix round 5 (re-review 4; checked).** Re-review 4 found two routes
outside the round-4 model. Repurposed surface (a pinned name whose
body, type or instance class changes) passes the pin by design
(controller ruling); docs/engineering.md, AGENTS.md and
scripts/trusted-surface.mjs now say the pin catches new surface only
and every diff to an allowed importer needs token review. No check
covers it (argued). Forgery: probe Runtime.Forge (`foreign import
forge ∷ CX → Refuted` with foreign.js `export const forge = x => x;`,
and `forge2 = unsafeCoerce`), compiled with `purs compile
'src/Domain/**/*.purs' '.spago/p/*/src/**/*.purs' <probe>/Forge.purs`
(exit 0), and graphed with `purs graph` over the same files (depends
`["Domain.Verdict","Unsafe.Coerce"]`). At run time both `forge(cx)`
and `forge2(cx)` return `cx` itself, a `Refuted` once erased. Source,
graph entry, index.js and foreign.js are under `forge` in
test/fixtures/r0/trusted-surface/probes.json. RED: under HEAD
e773573's scripts, a throwaway script gave `[]` from
`reexportFindings`, `importFindings`, `foreignFindings` (src and
output paths) and `graphFindings` (path rewritten to src/Runtime/);
the new test file failed to load (`does not provide an export named
'forgeryFindings'`). GREEN: `forgeryFindings` reports `Runtime.Forge
depends on Domain.Verdict and on Unsafe.Coerce (forgery by
unsafeCoerce)` and `… and has a foreign module (forgery by FFI)`,
each route alone, none for an allowed importer or a module not
depending on a public token module; test/structure-surface.test.mjs
passes 8 of 8. Real tree: `[]`; only Domain.Verdict,
Domain.Verdict.Admission and Domain.Verdict.Internal depend on a
public token module, and no src module depends on Unsafe.Coerce.
Mutants (each restored; the Forge test fails under each): N1, the
Unsafe.Coerce route dropped; N2, the foreign-module route dropped; N3,
allowed importers not exempted. That rule was bypassed (re-review 5)
and is replaced by the rule on the primitives below.

**Forgery by the primitives (Task 1.1 breaker ruling, carried into
Task 1.2's first commit; checked).** Re-review 5 found the round-5
rule keyed on a direct dependency on Domain.Verdict or
Domain.Recorded, so three routes pass it: a type re-export or synonym
(Runtime.Types and Runtime.ForgeA; Runtime.Syn and Runtime.ForgeB), a
polymorphic helper (Runtime.Cast, `cast = unsafeCoerce`, used by
Program.UseC, which imports Domain.Verdict but no unsafe module), and
Record.Unsafe (Program.UseD, `unsafeGet "x" { x: cx }`). Reproduced:
the seven probes compiled with `purs compile -o <scratch>/out
'src/Domain/**/*.purs' '.spago/p/*/src/**/*.purs' '<probe>/*.purs'`
(purs 0.15.16, exit 0) and graphed with `purs graph` over the same
files; at run time `forgeA`, `forgeA2`, `forgeB`, `forgeC` and
`forgeD` each return their argument (`=== cx`). Source, graph entry,
index.js and foreign.js are in
test/fixtures/r0/trusted-surface/forgery.json. RED: under HEAD
f170e91's scripts, `forgeryFindings` (paths rewritten to src/,
ForgeA given a foreign module) and `graphFindings` both returned `[]`
on the probe graph; test/structure-forgery.test.mjs failed to load
(`Cannot find module … scripts/forgery.mjs`). The textual
partial-escape rule (`textFindings`) does flag the four probe
sources that name `unsafe…`, but it is a word scan, not a dependency
check, and misses an FFI-only forger.

Survey (checked by reading the export lists of the installed
packages, listed in
test/fixtures/r0/trusted-surface/surveyed-packages.json; corrected
after the carry review, see below): the library modules using
`unsafeCoerce` are Data.Array.NonEmpty, Data.Exists,
Control.Monad.Free, Data.Functor.App, Partial.Unsafe, Data.Reflectable,
Data.Symbol, Safe.Coerce, Control.Monad.ST.Global,
Data.String.NonEmpty.CodeUnits, Data.String.NonEmpty.Internal and
PureScript.CST. Free, Data.Symbol and Data.Reflectable do not export
their `unsafeCoerce*` helpers; the others export only parametric types
(`mkExists`, `runExists`, `hoistLiftApp`, `coerce` under `Coercible`,
`toEffect`, `toRecovered`) or keep the coercion local. Of the
polymorphic foreign imports, Unsafe.Coerce's `unsafeCoerce ∷ ∀ a b. a
→ b` and Record.Unsafe's `unsafeGet`, `unsafeSet` and `unsafeDelete`
return an unconstrained type; Partial's `_crashWith` and
Partial.Unsafe's `_unsafePartial` are unexported, and `crash`,
`crashWith` and `unsafeCrashWith` throw.

GREEN (scripts/forgery.mjs): `coercionFindings` reports Runtime.ForgeA,
Runtime.ForgeB and Runtime.Cast (`depends on Unsafe.Coerce, which can
produce a value of any type`) and Program.UseD (Record.Unsafe);
`foreignSurfaceFindings` reports Runtime.ForgeA's unpinned foreign
module. Runtime.Types, Runtime.Syn and Program.UseC pass: each forges
nothing without one of those. The real tree gives `[]`; the pin holds
Runtime.Node's nine signatures. End to end: adding `import
Record.Unsafe (unsafeGet)` and `foreign import cast ∷ ∀ a b. a → b` to
src/Runtime/Node.purs made `checkStructure()` report `Runtime.Node
depends on Record.Unsafe, …` and `Runtime.Node: foreign imports differ
from the pin, added foreign import cast ∷ ∀ a b. a → b; …` (and the
partial-escape finding); restored, `[]`. Mutants (each applied to
scripts/forgery.mjs by a scratch script and restored; `node --test
test/structure-forgery.test.mjs test/structure-surface.test.mjs`): M1
Record.Unsafe dropped from the set, M2 allowlist ignored, M3 src filter
dropped, M4 foreign JS without a foreign import ignored, M5 comments
inside a declaration accepted, M6 a `foreign` not at column 0 ignored,
M7 signatures not compared, M8 stale pin ignored, M9 unpinned module
passes: each killed (M1 the routes and survey tests; M2 the routes
test; M3 the routes and real-tree tests; M4, M7 and M8 the signature
test; M5 and M6 the fails-closed test; M9 the routes, signature and
Forge tests). Limits (argued, superseded below): the JS body behind a
pinned signature and a type synonym it names were left to review; the
carry review's fix pins both files' hashes. A repurposed body in an
allowed importer stays with review.


## The collecting driver (2026-10-22)

R0 Task 1.2 (T-R0a §7, G-hide). `checkProgram` (Features.Check.Outcomes)
checks every body whatever happened to the others and returns a
`Report`: the entry judgement, one `DeclReport` per declaration in
declaration order (`name`, `today`, the shadow phase's legacy slot
holding today's `recheck` result, and `problem`, `Nothing` until
generation exists; ruling R2), and `program`, every diagnostic in
order or the checked program. The order is today's: `main`'s
printability, then bodies in declaration order, then the program-wide
stages (instantiation rule, then coverage), which still run only when
the entry and every body passed. `check` and `compile` are now the
first of `checkProgram` and `compileReport`; relocation through a
callee (`explained`) reads the callee's report instead of re-checking
it. The CLI is unchanged (its step is held back, §18.71).

Snapshot (checked): test/fixtures/r0/first-diagnostic.json is
`compile`'s output over the pinned corpus (1117 programs, 374
rejected), written at the parent commit 5d6b1cb from a fresh build
before any source change, by a scratch script equal to the test's
`outcome` (SHA-256 of the Go text, or the wired diagnostic).
test/r0-first-diagnostic.serial.test.mjs compares both `compile` and
the first of `compileReport` with it: no program moved, so acceptance,
emitted Go, codes, texts, spans and notes are unchanged. No fixture
changed. RED: test/r0-driver.test.mjs failed to load (`Cannot find
module … Features.Check.Outcomes`), the snapshot test with `does not
provide an export named 'compileReport'`. GREEN: both pass (5 tests).
Corpus compile time 5.1 s before, 5.4 s after (one run each): every
body is now checked when one fails.

Mutants (each applied to Features/Check/Outcomes.purs by a scratch
script, rebuilt, then restored; `node --test test/r0-driver.test.mjs
test/r0-first-diagnostic.serial.test.mjs`): D1, bodies after the first
failing one dropped (today's `traverse`): the three driver tests that
see two diagnostics fail. D2, the entry's diagnostic after the bodies':
the order test fails (no corpus program fails both, so the snapshot
does not see it). D3, the callee's report not found by `explained`:
the snapshot test fails on three programs (p10-neg.wxw,
p9-neg-alone.wxw, fx-services-programs.mjs:dropped#1), whose notes are
relocated through a callee. D4, coverage before the instantiation
rule: the order test fails. Regression row `r0-first-left-hides`
(scripts/regression-r0.mjs, D1 in a clone): the healthy compiler
passes its probe, the restored defect fails with `second broken
declaration hidden: E_TYPE Expected Int, found Bool`.

Task 1.1's check that compile reaches no R0 module is narrowed
(test/r0-verdict.test.mjs): from Program.Main exactly Domain.Verdict,
Domain.Recorded, their Internal modules and Domain.Verdict.Open are
reachable; only Features.Check.Outcomes imports them, and only the two
public modules; no Features.Check Strategy, Refute, Admit, Decide,
Generate or Checking module is reachable (ruling R6).

**Carry review of the forgery rule (final ruling; checked).** Threat
model, now stated in docs/engineering.md and AGENTS.md: the rules stop
accidental construction of a trusted verdict outside the trusted
modules; deliberate use of library partiality is out of scope and left
to review. Two corrections. The earlier survey sentence ("the only
modules whose exports produce a value of any type") was false, and
`unsafeIndex` does not give bottom: out of bounds it returns
`undefined` without throwing, as does `Data.Array.NonEmpty.foldl1` on
an empty array. C1: Program.UseE (`forgeE ∷ Valid; forgeE = foldl1
const (NonEmptyArray [])`, the same for `Refuted`), compiled with
`purs compile -o <scratch>/out 'src/Domain/**/*.purs'
'.spago/p/*/src/**/*.purs' '<probe>/*.purs'` (exit 0); both values are
`undefined` at run time; depends on Prelude, Data.Array.NonEmpty,
Data.Array.NonEmpty.Internal and Domain.Verdict; added verbatim to
test/fixtures/r0/trusted-surface/forgery.json. Survey of the library
`*.Internal` modules: Data.Array.NonEmpty.Internal exports
`NonEmptyArray(..)` (an empty one), Data.String.NonEmpty.Internal
exports `NonEmptyString`'s constructor (an empty one) and
Data.Map.Internal exports `Map(..)` (an unordered or unbalanced tree):
each added to `forgingModules`. Data.List.Internal exports `Set`
abstractly, Control.Monad.ST.Internal exports `ST`, `STRef` and
`Region` without constructors, and Data.Traversable.Accum.Internal's
`StateL`/`StateR` wrap functions with no invariant: not added. No src
module imports any of the five. C2: Runtime.Node's pinned signatures
name local synonyms, so `type ReadAttempt = ∀ a. Effect (Either
ReadFailure a)` retargeted `readSourceWith` with the signature text
unchanged. scripts/foreign-surface.json now pins, in addition to the
signatures, the SHA-256 of each pinned module's whole .purs and .js;
any edit fails until a reviewed re-pin. The probe test now also checks
the JS-only route (ForgeA's source with its foreign import removed,
its JS kept); the fixture's `foreign` key was present, so ForgeA had
been flagged, but only through its `foreign import` line. RED (old
scripts/forgery.mjs plus a stub `foreignPin`; `node --test
test/structure-forgery.test.mjs`): UseE not reported, the forging set
test failed, and the synonym edit gave `[]` where a SHA-256 finding was
expected. GREEN: 28 structure tests pass; the real tree gives `[]`.
Mutants (each restored): MC1, Data.Array.NonEmpty.Internal dropped:
the routes and survey tests fail; MC2, the .purs hash not compared:
the signature and whole-module tests fail.

## No catch-all at the end of a body (2026-10-23)

R0 shadow tranche, Task 2.1 (AT16's first half; rulings R3, R11).

**`classify`.** Features.Check.Classify maps each `Failure` to
`AsHint | AsLimit | AsPlaceholder | AsFault | AsMismatch`. It is built
on RowOutcome's `classified`, the one match over `Failure` by name
(no catch-all), whose stops give the limit, fault and placeholder
classes. Its contradictions are refined by a fact `classified` now
keeps, `caused` (the cause and inner failure of a `FromMerge`): a
predicate's contradiction is a hint (T-R0a §10, D6 → a hint), the rest
a mismatch. `Stop`'s `Limit` now carries its `LimitReached`.
`Exhausted` is a fault (`Internal` stop, `AsFault (BrokenInvariant …)`)
by Task 0.2's result. Checked: test/r0-classify.test.mjs injects all
15 constructors directly, the payloads, a predicate's failure around
each stop, and agreement with `classified` on every arm. RED: before
the module existed, `node --test test/r0-classify.test.mjs` failed
with ERR_MODULE_NOT_FOUND for output/Features.Check.Classify. Regression
row `r0-classify-catchall` (deletes `classified`'s `Exhausted` arm, adds
`_ → contradiction`): `node scripts/regression.mjs
r0-classify-catchall` proves it (the fixed compiler passes; the
restored defect's probe fails with `Exhausted classed as AsMismatch,
not a fault`).

**`Exhausted` and compile.** RowOutcome is reached only through
Features.Check.RowEntry, the labels-only test driver; compile's
renderers already reported `Exhausted` as E_INTERNAL with its text. So
the mapping changes no compile output (argued from the import graph;
the corpus snapshot test/r0-first-diagnostic.serial.test.mjs is green,
checked). One test expectation moved: test/r005b-outcome.test.mjs's
injected `Exhausted` is now the `Internal` stop, not `Limit`.

**Today's renderers are not routed through `Classified`.** The plan
said EndReport, Require, Record and Reject render from `Classified`.
They still match `Failure` by name, now with one arm per constructor
and no catch-all, for two reasons (argued). They read payloads no
class keeps (a mismatch's types, a refusal's reason). And a
`FromMerge` around a stop goes to the predicate's renderer today
(`mergedAt`), where `classify` gives the stop's class, so routing
through it could change a text, which ruling R11 forbids. Nothing
makes such a `FromMerge` today (`located` and `attributed` never wrap
a stop), but that is an argument, not a check.

**`Internal`'s kinds (ruling R3).** `Internal InternalKind String`,
the kind never rendered: every kind renders as its text with
E_INTERNAL (checked, test/r0-classify.test.mjs). The kinds, derived
from the 82 places that now name one (each call of Specialize's
`internal` helper counted), each reviewed:
- `LaterWork`: Check/Placeholder.purs and Specialize/Record.purs's
  several-tail placeholder.
- `RuleBroken`: the four renderers' `Unexpected`, EndReport's failure
  outside its predicates, a bare `Homeless` in Require and Reject.
- `BoundPassed`: the four renderers' `Exhausted`.
- `BodyState`: Settle (two), Filing, TailPass, MarkReport, Removal.
- `Unrendered`: Reject's consumption fallback (`TooDeep`, `Occurs`,
  `RowOccurs`) and EndReport's unexplained predicate refusal.
- `TableLookup`: every lookup of an id or index in a table an earlier
  phase built (Resolve, Check and Specialize; the "Invalid … id",
  "Invalid resolved …", "No such function", "Unnamed type variable",
  "Inhabitation index out of range", "Invalid type argument" sites).
- `InputShape`: an earlier phase's output of a shape it excludes
  (Arms, Extension, Handle, Signature (two), Matrix's field count,
  Match's arity, Nested's and Lower's syntax mismatches, Resolve's
  handler effect, Specialize's family and duplicate label).
- `PassInvariant`: a whole-program pass's own computation (Matrix's
  vector length, Missing (two), Coverage, Expand (two), Components,
  Go's families).
Routing for Task 4.3 (fixed now, while the assignment is fresh):
`LaterWork`, `RuleBroken`, `BoundPassed`, `BodyState` and `Unrendered`
are confined to one body's checking (`SearchBroke`, the run goes on);
`TableLookup`, `InputShape` and `PassInvariant` stop it. R3's context
mismatch (input an earlier phase built that does not fit) is
`InputShape`, or `TableLookup` when it is a missed lookup; 4.3's own
declaration-not-found is made by 4.3, not by a site here. Ambiguous:
`PassInvariant`'s coverage faults. Coverage runs per match but today
outside the body check (Features.Check.Outcomes, after every body), so
they stop; if a search ever runs coverage itself, they are confined.
Checked per kind at one site each, the failure injected directly
(Reject for `RuleBroken`, `BoundPassed`, `Unrendered`; placeholderAt,
Filing.missing, Tables.typeInfo, Signature.fieldTypes, Matrix.column).
Mutant: Reject's `Unexpected` kind set to `BoundPassed`; `node --test
test/r0-classify.test.mjs` failed "the renderers' stops: a rule
broken, a bound passed, no text" (7 pass, 1 fail); restored.

**`_` arms reviewed.** EndReport:43, Reject:54 and Record:166 became
named arms with the same results. UnifyRecord's `open` blames an open
failure on a predicate, a semantic claim, so its `_ → true` became
named arms (same booleans). RowMerge/End's `stop` sends a non-stop to
`Unexpected`, a fault, not a semantic claim: unchanged. Seen but
outside the task's files, not changed: RowMerge/Improve's `located`
(`_ → caused failure`, the same blame shape as `open`), Merged's
`mergedAt`, Contradicted's `rendered` and RowOutcome's `reasonOf`.

**A live defect (BACKLOG R020), recorded, not fixed.** Record.purs's
former catch-all sent every contradiction to `notSelected`, which
reports a missing field. With `fn pair(a: { ...r }, b: { ...s }): Int
where r disjoint s = 0;`, the body `let f = fn(p, q) => { let v = q.x;
let u = pair(p, q); p.x };` gives E_TYPE `x is not a field of { ..._
}` at `p.x`: `p`'s row is open, and what rules `x` out is the
disjointness with `q`, which the text does not name. A call that
breaks the same fact, `first({ x: 1 }, { x: 2 })` with `first`
returning its first argument under `r disjoint s`, gets D2's `Field x
is in both records: r disjoint s`. The failure is `Refused (Overlap
…)`: checked by adding `console.error('SELECT-FAILURE',
v.constructor.name, v.value0.constructor.name)` at the top of
`failed` in output/Features.Check.Record/index.js, compiling the
program (`Refused Overlap`), then restoring the file. Pinned by
test/r0-classify.test.mjs ("pinned R020"); the named arm `Refused _ →
unselected unit` keeps it.

**FX010's constructor.** The same instrumentation at
output/Features.Check.Reject/index.js `rejected` shows the pinned
test/fixtures/r0/audit/fx010-record-payload.pinned.json reaches the
consumption fallback with `RowOccurs`.

**Fixtures.** 20 audit fixtures under test/fixtures/r0/audit/ had
their `site` line number moved to follow the edited files (MarkReport,
Reject, Resolve/Handler); source, code and text are unchanged, so no
corpus re-pin. No diagnostic fixture changed.

**Fix round 1 (review of Task 2.1).** A bare `Homeless` was a
contradiction in `classified`, so `classify` called it a mismatch,
while Require and EndReport report it as a broken invariant (it is
made only inside `FromMerge`). Now a bare `Homeless` is the `Internal`
stop (`AsFault (BrokenInvariant "H's refusal outside a predicate")`),
and inside `FromMerge` it stays a contradiction (`AsHint`): the
`FromMerge` arm decides a `Homeless` inner itself and sends anything
else back to `classified`. Reject's bare `Homeless` now has kind
`RuleBroken` (was `Unrendered`); kinds are unrendered, so its text is
unchanged. Checked in test/r0-classify.test.mjs. The regression row's
needle follows the edited lines.

**Regression rows.** Two older rows restore a defect that builds an
`Internal` (`deferred-fail-effect`, `fx025-unbound-row`); their
replacements now name a kind and import it (a second edit each). The
first full verify failed on the first of them (the clone did not
compile); after the fix `node scripts/regression.mjs
deferred-fail-effect fx025-unbound-row r0-classify-catchall` proves all
three.

## Static rules beside the verdict (2026-10-23)

R0 shadow tranche, Task 2.3 (AT10; rulings R5, R8; plan review S5,
N5). Features.Check.Generate.Static classifies each raise site of the
refusals below, where today's code raises it: `Rule StaticCode` (class
a), `ByPolicy PolicyCode` (class b′) or `Semantic` (left to the
verdict). `staticRefusal at site` gives the `StaticRefusal` at a node,
or none for a semantic site. The sites are constructors of
Features.Check.Generate.Static.Site, grouped by what they read; each
group's classifier names every constructor, with no wildcard arm. No
raise site was edited and no check moved. `staticRules ∷ Tables → …`
is Task 3.2's (`Tables` does not exist yet).

**Ordering rule.** Every check keeps the position where today's code
raises it, so the first diagnostic is unchanged (checked: the
first-diagnostic snapshot, test/r0-first-diagnostic.serial.test.mjs,
passes in the full verify). A separate pass before generation takes
effect only with Task 4.6. `SameDisjoint` (Resolve/Requirements.purs:72)
and `RepeatedTail` (Resolve/Apart.purs:88, RecordFields.purs:53) stay
in Resolve, classified `Policy`; moving them to per-declaration
refusals is left to a later ruling (plan §8.1).

**Classes.** The site table, with file:line, token and evidence per
site, is test/r0-static-sites.mjs (48 sites). In summary:

| Sites | Class | Evidence |
| --- | --- | --- |
| Arity at Pipe.purs:33 (`fixedResult`), Call.purs:144 | StaticRule | checked (audit) |
| Arity at Pipe.purs:36, Call.purs:148 (`functionLike`) | Semantic | checked (audit) |
| Arity at Call.purs:123, Show.purs:27, Operation.purs:64, 104 | StaticRule | argued: a count against declared fields, or one argument, before inference |
| Arity in Resolve: Handler.purs:102, Qualified.purs:168 | StaticRule | checked (probe) |
| EntryProblem in Resolve: Entry.purs:30, 43 | StaticRule | checked (probe) |
| EntryProblem at Check/Outcomes.purs:136 (`printableEntry`) | StaticRule | argued: reads `main`'s resolved result and the declared types' function holders, no `State` |
| FieldArity (Pattern.purs:90), FunctionNeedsCall (Qualified.purs:97, Name.purs:47), TypeArguments (Row.purs:47, TypeArguments.purs:49, HandlerType.purs:27) | StaticRule | checked (probe) |
| HandlerMissing, HandlerDuplicate, HandlerOperation (3), FailNeedsConcrete (Resolve/Row.purs:82), NofailOnFail, MarkVariableOutsideSignature | StaticRule | checked (audit) |
| SameDisjoint, RepeatedTail (2) | Policy | checked (probe) |
| Every effect refusal raised by check (14 sites), FailNeedsConcrete at Check/Failure.purs:102 | Semantic | checked (audit); RowName.purs:96 argued |
| RedundantArm, NonExhaustive, AmbiguousType | Semantic | checked (audit) |

No coverage site is a static rule (the audit's recommendation).
FieldArity, FunctionNeedsCall and TypeArguments, unexamined by the
audit, were examined by its method for Resolve rows: every raise site
is in Resolve (the completeness test below finds no other), Resolve
reaches none of the online solver (r0-audit.test.mjs), and a probe of
each site's refusal stops in Resolve with today's code and text. The
probes do not show which of two Resolve sites of one refusal a program
reaches; the class does not depend on it.

**Tests (checked).** test/r0-static.test.mjs, 8 tests: every site and
family constructor of the compiled Site module is in the table, once;
each, injected directly, has its class and refusal (at a stand-in
site, since `Site` is uninhabited); the classifier's source has no
wildcard arm; every cited line holds its token; every line of
src/Features naming a classified refusal is a cited site, a match, or
the arity helpers, whose callers are pinned (Pipe.purs:33, 36;
Call.purs:123, 144, 149); every audit fixture's class agrees with its
site's (structural is a StaticRule, semantic is Semantic); the Resolve
probes; and AT10: d03 (`r disjoint r`) stops in Resolve with E_TYPE
and its site gives `Policy PolicySameDisjoint`, a fixed-result arity
program stops in check with E_ARITY and its site gives `StaticRule
StaticArity`. `StaticRefusal` is not `Verdict`: a scratch module
`bad ∷ Site → Verdict; bad at = StaticRule StaticArity at` fails purs
0.15.16 with `Could not match type StaticRefusal with type Verdict`; a
positive module using `staticRefusal` compiles (probes deleted).

**RED and mutant runs (recorded).** RED: before the module existed,
`node --test test/r0-static.test.mjs` failed with ERR_MODULE_NOT_FOUND
for output/Features.Check.Generate.Static. Mutants ran in one isolated
copy in the session scratchpad (output/, src/, scripts/, the test, its
support, the audit fixtures), each restored after its run, the copy
deleted; unpatched, 8 of 8 pass.

- S1, output/Features.Check.Generate.Static/index.js line 176,
  `PipeFunctionLike` returns `new Rule(Domain_Verdict.StaticArity.value)`
  for `Semantic.value`: fails "each site injected directly has its class
  and refusal".
- S2, same file line 68, `DisjointSame` gives `PolicyRepeatedTail`:
  fails that test and "AT10: d03 is a Policy, a fixed-result arity a
  StaticRule".
- S3, src/Features/Check/Generate/Static.purs, `settledClass`'s arms
  replaced by `_ → Semantic` (the same behaviour): fails "the
  classification has no wildcard arm".
- S4, src/Features/Check/Operation.purs, a second line `again _ = Left
  (problemAt Arity span)` after line 64: fails "every raise site of a
  classified refusal is classified" (and "every cited site holds its
  token", since line 104 moved).
- S5, an exported nullary constructor `ExtraSite` appended to
  output/Features.Check.Generate.Static.Site/index.js: fails "every
  site and family constructor is injected once". (Its first run read the
  constructors through Static's re-exports and passed, so the test now
  reads them from the Site module; S1-S4 were re-run on that version
  with the same results.) After these runs Static stopped re-exporting
  the Site types (amendment: callers import Site); the compiled arms
  S1 and S2 patch are at the same lines, and 8 of 8 still pass.

**Fix round 1 (review Important 1; amendment).** The first wildcard
test read lines with a regex, and three forms passed it while behaving
the same: `settledClass _ = Semantic`, `markClass = const Semantic`,
and `ArityAt _ → Semantic` with `arityClass` deleted. It is replaced
by "the classification names every constructor, with no catch-all",
which reads the syntax tree: a new tools/style/src/Style/Arms.purs
parses a module with language-cst-parser (as Style.Check does; a parse
error is refused) and reports its `_` binders, the constructor each
case-arm pattern starts with, arm patterns that start with none, the
constructors its data types declare, the declarations whose equations
bind arguments, and the identifiers it uses. The test requires no `_`
binder and no arm without a constructor in Static.purs; its arm
constructors equal, once each, the 56 Site declares (48 sites, 8
families) and StaticClass's 3 (staticRefusal's match); only
staticRefusal binds arguments; no `const`. An arm that binds a family's
site and ignores it (`ArityAt site → Semantic`, helper kept) passes
this test, but purs warns UnusedName (Static.purs:61) and
UnusedDeclaration (`arityClass`), which the build's `spago build
--strict` makes errors (scripts/build.mjs; checked by running `purs
compile` on the mutant, warnings shown).

Mutant runs (recorded): one isolated copy in the session scratchpad
(output/, src/, tools/, scripts/, the test and its support, the audit
fixtures), Static.purs patched and restored for each, the copy deleted;
unpatched, 8 of 8 pass. Command each time: `node --test
test/r0-static.test.mjs`. Each of the four fails exactly "the
classification names every constructor, with no catch-all":
- S3, `settledClass`'s four arms replaced by `_ → Semantic`.
- S3-equation, `settledClass` defined as `settledClass _ = Semantic`.
- S3-const, `markClass = const Semantic` (with `import Prelude
  (const)`).
- S3-nested, `ArityAt site → arityClass site` replaced by `ArityAt _ →
  Semantic`, `arityClass` deleted.

## The recorded problem's fields (2026-10-23)

R0 shadow tranche, Task 3.1 (ruling R4; T-R0b §2.3, §3.5, §5.2, §6,
§10; D1 spec §6.2). `RecordedProblem` wraps `Fields`, T-R0b §10's
record verbatim, and derives `Eq`; `decl ∷ FunctionId` is carried
unconditionally. Domain.Recorded exports the type names and `fields ∷
RecordedProblem → Fields`; it imports the constructor to define the
view, as an allowed importer of Domain.Recorded.Internal.

**Representation choices (argued).** `Var` is `RigidVar VarId |
FreshVar Path Role`: §2.3 names fresh variables `⟨p, role⟩` and §6
identifies a rigid one by its `VarId`, while §10's `rigidTy` holds
`Var`s. `Path` is a newtype over `{ root, steps }`, the root being the
body or one of §6's four signature fields, each step a name or an
index. `RuleId` and `SpecRow` are typed (`ExprRule 11`, `SpecRow RowB
1`), not strings. **Amendment** to §5.2: `VarInfo.origin.role` is
`Maybe Role`, `Nothing` for a rigid variable, which §2.3 gives no role.
`CheckedName` keeps T-R0b's eight constructors; the D1 spec's proposed
`ClauseParamType` (§12.2) is not added.

**Boundary probes (checked; purs 0.15.16, scratch modules compiled
with src and .spago packages, then deleted).** A module named
Features.Check.Decide.Probe reading `(fields p).outside` and
`(fields p).decl` compiles. In the same module, `Recorded.RecordedProblem
record` fails with `Unknown data constructor Recorded.RecordedProblem`;
importing `RecordedProblem(..)` from Domain.Recorded and applying it
fails with `Unknown data constructor RecordedProblem`; `coerce ∷ Fields
→ RecordedProblem` (Safe.Coerce) fails with `No type class instance
… Coercible … Solving this instance requires the newtype constructor
RecordedProblem to be in scope`. Features.Check.Generate.Probe
importing `RecordedProblem(..)` from the Internal module compiles.

**Tests (checked).** test/r0-recorded.test.mjs, 5 tests: the view has
exactly the 14 fields and reads them back; two problems built alike
are equal, and changing any one field makes them unequal; `decl` alone
tells two atom-free problems apart; every constructor of Atom and
Origin has its arity; Domain.Recorded exports `fields` and no
`RecordedProblem`. RED: before the modules existed, `node --test
test/r0-recorded.test.mjs` failed with ERR_MODULE_NOT_FOUND for
output/Domain.Recorded.Atom. A first GREEN run failed "problems built
alike compare equal": the test passed a bare role where `Maybe Role` is
expected; the test was corrected. test/r0-verdict.test.mjs's
reachability list gains Domain.Recorded.Atom and .Origin.

**Mutant runs (recorded).** In one copy of output/ and the test in the
session scratchpad (deleted afterwards); unpatched, 5 of 5 pass.

- M1, output/Domain.Recorded.Internal/index.js, ` && eq6(x.types)
  (y.types)` deleted from `eqRecordedProblem`: fails "problems built
  alike compare equal; a change in any field does not".
- M2, same file, `eq3(x.decl)(y.decl) && ` deleted: fails that test and
  "decl alone distinguishes two otherwise empty problems".
- M3, output/Domain.Recorded/index.js, `export { RecordedProblem } from
  "../Domain.Recorded.Internal/index.js";` appended: fails "Domain.Recorded
  exports the view, not the constructor".

**Fix round 1: equality on long spines (checked).** The paragraph
first here argued that derived `Eq` on `RTExpr`, recursing once per
arrow, was safe because depth is bounded by nesting. That was wrong:
an arrow spine is as long as a declaration's parameter list
(Type/Core.purs:46-48), the repo compiles 80,000-parameter forms
(test/fn-linear.serial.test.mjs, value reference `g(f)`), and D1's
`elaborate` compares problems. The reviewer's run: derived `eqRTExpr`
true at 5,000 arrows, `RangeError` at 20,000. `Eq RTExpr` is now hand
written: `sameSpine` walks the spine by a self tail call, which purs
compiles to a loop (`$copy_left` in output/Domain.Recorded.Atom), and
recurses only into parameters and record or application arguments; no
wildcard arm. No other new instance walks a spine (`Var`, `Role`,
`Path` and the rest hold no `RTExpr` chain; `Atom`'s and `Fields`'
derived `Eq` call `eqRTExpr`). Test "RTExpr equality walks an
80,000-arrow spine without overflow": equal spines, spines unequal at
the end, and two problems holding one in `types`. RED: in a scratch
copy of src/ and output/ with `derive instance eqRTExpr ∷ Eq RTExpr`
restored and recompiled (purs 0.15.16), that test failed with
`RangeError: Maximum call stack size exceeded`; the other 5 passed
(copy deleted). Also in this round: `OriginKind`'s `Inst` is now
`InstOrigin`, so a module importing `Atom(..)` and `Origin(..)`
unqualified meets no ambiguity with the role `Inst`.

## RT1's translator (2026-10-23)

R0 shadow tranche, Task 3.3 steps 1-3 (T-R0b §9 item 1; ruling R9).
A second implementation of T-R0b §3, written from
research/division-campaign/r0/recorder-rules.md and Task 3.1's types
before any generator code exists (Task 3.2 has no commit). It is
test-only: test/r0-translator.mjs and six helper modules read resolved
syntax from the compiled output and return canonical problems. The
canonical serialization, test/r0-canonical.mjs (decoder in
r0-canonical-decode.mjs), is ruling R9's single one: plain JSON with
sorted object keys, arrow spines flattened (`{ fun: { params, result
} }`, a loop for long spines), entry arrays in recorded order, `vars`
and `types` as pairs in Data.Map's key order. `canonicalOf` keeps
`flexTy`/`flexRow` in recorded order; the translator emits them by
`compareVar`, so a comparison sorts both. Canonical order, stated
there: record fields by label (code units, PureScript's `Ord String`),
tails by the derived `Ord Var` (`compareVar`; RigidVar before
FreshVar, then path root, steps with `Named` before `Index`, then role
in constructor order). `entryMultiset` gives RT1's multiset of `[list,
Origin.atom, value]`; the comparison itself (steps 4-5) waits for Task
3.2.

**Readings T-R0b leaves open (argued; each a finding for RT1's
comparison to settle by T-R0b's text).** The translator implements the
most literal reading and states it in test/r0-translator.mjs.

1. Path steps (§6) are examples only (`Call/args/2`). Read as
   constructor, field, index; the field names are this translator's
   (listed in the module header). Task 3.1's report already left the
   vocabulary to Task 3.2, so the two will differ unless one adopts the
   other's.
2. §6 gives no path to Sig1 (rigid variables) or to `f.row`. Rigid
   variables: `parameters/[variables, i]`; effect-row label arguments:
   `result/[row]`. Sig3's atom sits at ε, "at path ε" in its row.
3. `AtomId` is not unique. Several rules emit at one path (Sig3 and the
   body's root rule at ε; Sig6, Sig8 and Sig8's markers at a
   parameter), and the index counts per rule. `Origin.rule` tells them
   apart. RT1's pair `(Origin.atom, entry)` still compares as a
   multiset.
4. Index order: a rule's listed entries in order, then §2.2's markers
   in pre-order of the types translated. §3 does not place markers in
   the order. The rule is uniform: E5's and E6's listed entries
   include E3's or E4's block and then the argument equations and the
   over-application atom, so their markers come after all of these
   (E6 over-applied: F1 at index 0, B1 at 1, the marker at 2). Sig8's
   markers follow Sig8's `lacks` at the same path; E20's follow its
   HandlerType; E17's follow its equations and EffectArgument.
5. Marker granularity: one marker per `app` built. DataOverRecords
   when the declared type has a record-row parameter, else
   DataApplication. A `TData` whose only arguments are effect rows is
   `app t []`, marked DataApplication. Markers of f's own parameter and
   result types are Sig8's, whatever the kind.
6. **Conflict with Task 3.1's types:** `Handler(Console)` (a builtin
   effect's handler type, §2.2) has no `Head`: `HandlerHead` takes an
   `EffectId`. Three corpus programs write one
   (test/fx008-probes/rev6/con2.wxw, test/fx-run-programs.mjs:cases#17,
   test/fx-task7-programs.mjs:checkedRuns#3). The translator writes
   `{ handler: 'Console' }` (or `'Fail'`); Task 3.2 must extend `Head`
   or state another form.
7. Rows (§6 "Row"). Rows are not part of RT1's multiset; the
   translator's choices, exactly: Sig3 B1, Sig4 A1, Sig5 A2, Sig6 A3,
   Sig7 A4, Sig8's `lacks` A5, Sig10 C5. E3/E5: written clauses of
   θ(D_g) F2, implied F3, `adm` F7, `split` H2; E5/E6 argument
   equations F1, the over-application atom B1; E4/E6 joined pairs F8.
   E7-E9, E11, E12, E14, E15 and E10's `eq` B1, E10's `cmp` C6; E13
   B14; E16 `eq` B1 and Deferred O6; E17 equations B1 and
   EffectArgument O2; E18, E19 `pr` C1; E20, E21 HandlerType O3; E22
   and E23 equations B1 and FailFamily O4; E25 B2, E26 B4, E27 B7, E28
   B8; P3, P4 B1, P5 B12, P6 B11, P7 B10. §2.2's markers, under every
   rule: DataOverRecords O5, DataApplication F8, HandlerType O3. Where
   these differ from the rule's rows column (B1 for E6, E17, E22, E23;
   F1 for E6; F8 outside E4/E6/P4), the text ties the entry to the
   row: B1 is recorder-spec's "every typed agreement the body states",
   F1 its argument row, F8 its row for `app` with arguments (§7).
8. E4's "implied of c.joined" read as `disjoint` per joined pair only;
   the constructor's fields' implied `lacks` are not added.
9. E6 with more arguments than fields: τ, `⟨p, res⟩` and the
   over-application atom as E5, although E6's Fresh column says "as
   E4".
10. E20 types the handler by fresh `inst` variables only, as written;
    the label's written arguments (`State(Int)`) are not equated;
    HandlerType marks the gap.
11. E23's "translates to a type with no record and no variable" is read
    on the translation: a declared family (`Err`) is `base`, so no
    marker even when its constructors hold records; a written record
    family is marked.
12. `spread j` counts from 1 (E25 writes `spread 1 … spread k`).
13. `adm` slots: every `inst` variable; `split` slots: the record-row
    ones (§10 "RecordSort slots").
14. A variable's origin span: the label's for `field l`, `upd l`,
    `updrest l`; the spread item's for `spread j`; the parameter's for
    E13's `param k`; the node's otherwise; the declaration's for a
    rigid one.
15. Effect parameters are taken as types: resolved `EffectInfo` has no
    sorts, and BACKLOG R009 says effects take type parameters only.
16. E22's clause local is bound at the label's single argument; a
    clause label with another count binds nothing (none in the corpus).
17. Sig6 and Sig8 split Implied.purs's facts: a record's own labels are
    Sig6, a declared type's record argument Sig8, its labels by
    `declared` (reimplemented, not imported).
18. RT1's "§5.3 normalization" is recorder-spec §5.3's
    definedness-preserving one (T-R0b §5.3 is the site table). It
    belongs to the comparison, so steps 1-3 do not apply it.
19. E16's `defer` entries (`eq τ_e Unit`, then Outside Deferred) sit at
    the item's path, `Block/items/i`, with the item's span, not at the
    Block node's path; the deferred expression is at
    `Block/items/i/Defer/value`.
20. **T-R0b gap:** §5.2 assigns every `inst i` to `Slot p i`, and the
    translator does so for P4's too, but `Slot` lists only Call,
    FunctionRef, Construct, CtorRef, OperationRef, Perform and Handler:
    a checked `Ctor` pattern (Checked/Internal.purs:129) has no
    Instantiation, so P4's `Slot` names no checked-IR position. Task
    3.2 should decide between this literal reading and `Auxiliary`
    (which would then need a defining atom, §5.3).
21. Origin kinds: Sig4, Sig5, Sig10 contract; Sig6-Sig8 types; Sig3
    body. θ(D_g), `adm` and `split` (E3, E5) and E4/E6's joined pairs
    inst; E13's definedness atom types; every other atom body. Markers
    of §2.2 take the translating rule's kind: types for f's own types
    (Sig8) and written types in the body (E13, E22, E23), inst for
    θ-instantiated ones (E3-E6, E17, E20, P4). Explicit markers
    (Deferred, EffectArgument, E20's and E21's HandlerType, FailFamily)
    are body.

B13 is not settled here: its evidence is RT1's comparison (step 4).
LocalGeneralization is produced by no resolved construct (§3.5), so it
is exempt from the per-kind check (ruling R11).

**Tests (checked).** `node --test test/r0-canonical.test.mjs
test/r0-translator-signature.test.mjs test/r0-translator-calls.test.mjs
test/r0-translator-forms.test.mjs test/r0-translator-records.test.mjs`:
40 pass. Each rule's expected entries are written by hand from §3's
tables. G-total: the translator's constructor lists equal those parsed
from src/Domain/Resolved.purs (36 Expr) and Resolved/Core.purs (6
Pattern). r0-canonical decodes every constructor of Domain.Recorded's
vocabulary, each injected in its fixture (fix round 1 added SortType,
RowGroups A, B, C, D, H, O and kinds Contract, Types, InstOrigin),
sorts as the compiled `ordVar` does, and decodes an
80,000-arrow spine. `node --test
test/r0-translator-total.serial.test.mjs`: 5 pass. Over the pinned
corpus (973 resolving programs, 2,958 declarations) it checks that
translation returns, that every variable an entry or type mentions is
in `vars`, that canonical order holds, that every rule but the
entry-free ones (Sig1, Sig2, Sig9, E1, E2, E24, P1, P2) emits, and
that every marker kind but LocalGeneralization occurs. No RED run
exists: the modules were written before their tests. The mutants
below stand in for it.

**Mutant runs (recorded).** Each mutant was run on a copy of the new
test modules in the session scratchpad, with output/ and src/ linked,
over the five rule-level files; the copy was then deleted. Unpatched:
40 of 40 pass.

| Mutant | Patch | Failing tests |
|---|---|---|
| M1 | calls.mjs `arrow(args.slice(n), res)` → `slice(n + 1)` | E5, E6 |
| M2 | records.mjs `{ spread: spreads.length + 1 }` → `spreads.length` | E25 |
| M3 | records.mjs P6's rest positioned `restType` (`rule !== 'P5'`) | P5-P7 |
| M4 | types.mjs `rowsOf(type).forEach(row` → `[].forEach(row` | Sig6 depth |
| M5 | canonical.mjs `compareVar` puts FreshVar first | compareVar, outOfOrder |
| M6 | exprs.mjs E10's `cmp` of `Bool` instead of the left operand | E7-E11 |
| M7 | context.mjs index counter keyed by path only | Sig3, Sig6/7, Sig8 |
| M8 | calls.mjs `split` only when `rows.length > 1` | E3 |
| M9 | effects.mjs `pr` when `types.length >= 1` | E19 |
| M10 | effects.mjs FailFamily only when no family is written | E23 |

M4 and M10 survived a first run. The Sig6 test gained an arrow's
effect row and E23 a record family, and both then failed as listed.

**Fix round 1 (task review, 2026-10-23).** The reading list above is
the shared spec reading Task 3.2 receives, so it now states what the
code does. E5/E6 emitted their markers before the argument equations,
against reading 4; the code now emits them last (one uniform rule
rather than a per-rule exception), and the E6 test pins F1 at 0, B1 at
1, the marker at 2. Readings 19-21 (E16's path, P4's `Slot` gap,
origin kinds) are new; reading 7 lists every row. The marker-row
choice is a table with no default arm, and `outOfOrder` requires
strictly ascending fields and tails (a repeated label is out of order,
tested). Focused tests: 40 pass.

## Generation rules (2026-10-23)

R0 shadow tranche, Task 3.2 (T-R0b §2-§6, §10; rulings R2, R6; Task
2.3 and 3.1 carries). Features.Check.Generate exports `generate ∷
Tables → Signatures → FunctionDecl → RecordedProblem` (an `Either`
since fix round 1, below), `staticRules` and the types `Tables` and
`Signatures`, an enumerated list with no empty problem (checked: the
export test;
a scratch module importing `emptyProblem` from it fails purs 0.15.16
with `Cannot import value emptyProblem`). Compile does not call it.
The builder is Generate.Inputs `generationInputs ∷ Resolved.Program →
{ tables, signatures }` (named apart from Features.Check.Tables). The
rules live in Generate.Signature (Sig1-Sig10, with Generate.Rigid and
Generate.Facts), .Call (E3-E6), .Expr (dispatch, E1, E2), .Operator
(E7-E11, E14, E15), .Control (E12, E13, E16), .Record (E24-E28),
.Builtin (E18, E19), .Effect (E17, E20, E21), .Failure (E22, E23) and
.Pattern (P1-P7); each rule id is in a comment beside its code.

**The applicative invariant (T-R0b §4), and how the code keeps it.**
Every rule reads only Generate.Context (`decl`, `tables`, `signatures`,
`locals`) and its children's results; no checker state, substitution,
meta counter or solved type is in scope. Mechanically (checked: test
"generation reaches no checker state"), the import closure of
Features.Check.Generate reaches no Features module but Generate.* and
seven pure table readers it reuses (Check.Implied `declared`,
Check.Tables `ownerType`, Check.Functional, and their imports
Check.Nested, NestedArguments, Components; Resolve.Builtin), and no
Generate module imports Domain.Checked* directly. (Corrected, fix round
1: the closure does reach Domain.Checked.Internal, through
Check.Functional's import of Check.Nested; the test bans only direct
imports. That is harmless: generation is handed no checked value and
builds none, so the reachable checked-IR types are never inhabited
here.) Fresh variables are canonical
names, so generation needs no counter: it is a pure fold, and each
rule's index is its own listed order. Records are built by one
constructor that sorts fields by label and tails by `Ord Var`.

**Readings.** docs/findings.md "RT1's translator" readings 2-21 are
followed as written. Reading 1 leaves the step vocabulary open; this
generator's (indices from 0): `Call/args/i`, `Construct/args/i`,
`Add|Concat|Compare/left|right`, `Interpolate/parts/i`,
`If/condition|then|else`, `Match/scrutinee`,
`Match/arms/k/pattern|body`, `Lambda/body`, `Apply/function`,
`Apply/args/i`, `Pipe/left|right`,
`Block/items/i/(Let|Defer|Discard)/value`, `Block/result`,
`(Perform|Print|Show|Crash)/args/i`, `Handler/clauses/k/body`,
`With/handler|body`, `Handle/body`, `Handle/clauses/k/body`,
`Fail/payload`, `RecordLiteral/fields/i/value`, `FieldAccess/record`,
`RecordUpdate/record`, `RecordUpdate/fields/i/value`,
`RecordExtension/items/i/(Given|Spreading)/value`,
`RecordRemoval/record`; patterns `Ctor/args/k`,
`Record/fields/k/pattern`. RT1's comparison (Task 3.3 step 4) will
find where the translator's differs. Choices the readings leave open,
argued:

- θ(D_g) (E3, E5): written clauses in constraint order (a `lacks`
  clause's labels in written order), then implied: Sig6's facts over
  the callee's parameters, result and row arguments, Sig7's pairs,
  Sig8's facts. One fact's labels are in label order.
- Markers' pre-order: E3, E5 translate T₁ … Tₙ then R; E4, E6 the
  fields then the owner; P4 the owner then the fields; E17 T̄ then the
  result; E20 the clauses' parameter types in order; E22 the clauses'
  payloads in order.
- Spans: an entry has its node's span, except Sig4 (the label), E25's
  spread atom (the item), E26 and E27 (the label). Sig6 and Sig8 use
  the parameter's span, the written result type's for the result
  (Sig10 too) and `rowSpan` (else the declaration's) for the row.
- E15's `⟨p, res⟩` is positioned at `NodeType p`, as E14's; §5.2's
  list names E14 but not E15.
- E20's clause parameters take the clause's `HandlerParameter.ty`,
  which Resolve copies from the operation's declared parameter
  (Resolve/Handler.purs:106-112), under θ. A builtin effect's
  parameters come from Resolve.Builtin (Console none, Fail one).
- E22 binds a clause's local when its label has exactly one argument
  (reading 16), translating that argument with `ν_f`.
- (Superseded in fix round 1, below: a lookup that misses is a fault,
  not an empty entry.)

Concerns with the shared readings (followed anyway): reading 20 (P4's
`inst` at `Slot`, a position the checked `Ctor` pattern lacks) is kept
literal; reading 9 (E6 over-applied gets `⟨p, res⟩`, against E6's
Fresh column) is kept.

**`Handler(Console)`.** Domain.Recorded.Atom's `HandlerHead` now takes
a Domain.Row `EffectRef`, so a builtin effect's handler type has a head
(`HandlerHead ConsoleEffect`); the canonical form writes a declared
effect by its id and a builtin by name (`{ handler: 'Console' }`).
Checked: the canonical test decodes both builtins; E21's test pins
`Handler(Console)`; a scratch module applying `HandlerHead` to an
`EffectId` fails purs with `Could not match type`.

**Static rules.** `staticRules` is Generate.Static.Rules (not
Generate/Static.purs, whose syntax-tree test admits only the
classification's own arms). **Amendment:** its type is `Tables →
Signatures → FunctionDecl → Array StaticRefusal` (in `Either` since
fix round 1), since arity at a
fixed result reads the callee's declared result, which `Tables` lacks.
A resolved declaration can break only the class-a rules check raises:
Pipe.purs:33, Call.purs:123 and :144 (functions and constructors),
Show.purs:27, Operation.purs:64 and :104, Outcomes.purs:136. Each is
found syntactically and refused through Task 2.3's `staticRefusal`,
at the node's path. Checked (test/r0-static-rules.test.mjs): for each
site a fixture that today's checker stops in check with the same code
(E_ARITY, E_ENTRY) gets exactly that refusal; Pipe.purs:36's
instantiated case gets none; an accepted program gets none. Its walk
(Generate.Static.Walk) visits exactly the expression paths generation
records, over the whole corpus (checked, serial test).

**Every `Problem` constructor (Task 2.3 carry).**
Generate.Static.Problem's `disposition ∷ Problem → Disposition` is a
typed path from a raised problem to its class: Task 2.3's 28 give
their raise sites (`AtSites`, classed by `staticClass`); the other 36
name the phases that raise them (`Placed`): before resolution (lexer,
parser), a Resolve rule with its `StaticCode`, a Resolve body-type
check that is semantic (`RowMayHaveField`, `NotKnownDisjoint`, decided
to move into generation), a Resolve support limitation
(`SecondSpread`), check's semantic refusals, whole-program stages
(`PolymorphicRecursion`, `NestedDatatype`), lowering, the inferred-type
limit (`TypeTooDeep`) and faults (`Internal`); `Hinted` takes its
inner problem's. `StaticCode` gains `StaticUnbound`, `StaticDuplicate`,
`StaticNotCallable` and `StaticSort` (sort errors: `RowSort`,
`RecordRowAsEffect`, `EffectRowAsRecord`, `TypeAsRecordRow`, Resolve's
`ExpectedRecord`). These Resolve refusals never stand beside a
recorded problem (no resolved declaration exists, T-R0b §8);
`staticRules` raises none of them. Domain.Verdict was split first
(its static types are Domain.Verdict.Static, re-exported, behaviour
unchanged). Checked (test/r0-static-problem.test.mjs): the 64
constructors (read from the source by Style.Arms) are the 28 sited
and 36 placed, once; each, injected, has its disposition, the sited
ones exactly their rows of test/r0-static-sites.mjs; the match has
no catch-all; each placed one's cited raise line holds it in its
phase; and every src line naming a placed constructor lies in one of
its phases (`Internal`, and `RowSort`, `Syntax`, `SecondSpread`, which
other types also name, exempt).

**Tests (checked).** `node --test test/r0-generate-signature.test.mjs
test/r0-generate-expr.test.mjs test/r0-generate-forms.test.mjs
test/r0-generate-pattern.test.mjs test/r0-static-rules.test.mjs
test/r0-static-problem.test.mjs`: 45 pass. Each rule (Sig1-Sig10,
E1-E28, P1-P7) has a fixture whose `(AtomId, entry)` list is written
by hand from §3's tables and the readings, each fixture also passing
RT6 and RT7. RT5: the Expr, Pattern, Rest and Item constructor lists
equal those declared in Domain/Resolved.purs and Resolved/Core.purs,
and each reaches its rule in a fixture (its node's type is recorded).
RT6: every entry's path resolves, by a resolver written against the
compiled resolved syntax, to a node of the recorded span (a label's
or item's span inside it). RT7: every variable an entry, type or site
mentions is in `vars`; `Forall` ones are exactly Sig1's; a fresh key
agrees with its origin's path and role, a rigid one has none; every
auxiliary has exactly one §5.3 defining atom whose operand mentions no
variable of its node. `node --test
test/r0-generate-total.serial.test.mjs`: 4 pass; over the pinned corpus
(973 resolving programs, 2,958 declarations) generation returns, twice
alike; RT6, RT7 and canonical order hold for every problem; every rule
with entries and every marker kind but LocalGeneralization occurs;
`types` holds exactly the expression and pattern nodes.

**RED and mutants (recorded).** In one copy of output/, src/, scripts/
and test/ in the session scratchpad (deleted afterwards): with the
generator's compiled modules removed, each of the six files above
failed with ERR_MODULE_NOT_FOUND for output/Features.Check.Generate.
Mutants patch the compiled JS, one at a time, restored after each;
command `node --test` over the six files; unpatched, none fail.

| Mutant | Patch | Failing tests |
|---|---|---|
| M1 | Call: E5/E6 markers before the equations | E6 over-applied |
| M2 | Translate: DataOverRecords never chosen | Sig6, Sig8 |
| M3 | Record: `spread j` from 0 | E25 |
| M4 | Pattern: P6's rest at `RestType` | P5, P6 |
| M5 | Fresh: effect-row variables given a sort | 28 tests (RT7, every `inst` fixture) |
| M6 | Generate: `rigidRow` keeps type variables | Sig1; rigid variables |
| M7 | Effect: EffectArgument unconditional | E17 |
| M8 | Static.Rules: a variable result counted fixed | static sites |
| M9 | Static.Problem: TypeMismatch as ProgramWide | dispositions |
| M10 | Signature: no entry | Sig9, Sig10; static sites |
| M11 | Operator: `cmp` at the right operand | E7-E11 |
| M12 | Pattern: field at the record's path | P7 |

M7 and M11 survived a first run; E17 gained an effect without
parameters and E10 a comparison whose operands' types differ, and both
were then killed as listed.

**Fix round 1 (task review, 2026-10-23).** RT1's comparison by the
reviewer (all 2,958 corpus declarations, generator against the
independent translator) agreed on every `(Origin.atom, entry)` but one
path step; the controller's rulings (progress ledger, "Task 3.2:
Ruling") settle four points.

1. The `fail` payload's step is `Fail/payload` (the translator's, the
   shared reading), in Generate.Failure, Generate.Static.Walk and the
   RT6 resolver.
2. **Amendment** to the brief's signature: `generate ∷ Tables →
   Signatures → FunctionDecl → Either GenerationFault RecordedProblem`,
   and `staticRules` likewise returns `Either GenerationFault`. The
   earlier fallbacks (an empty callee or constructor, no effect
   parameters, `Unit` for an unbound local or a payload-less clause, a
   DataApplication marker for an unknown type) dropped obligations
   silently; each lookup now returns `Gen = Either GenerationFault`
   (Generate.Fault): `UnknownFunction`, `UnknownCtor`, `UnknownType`,
   `UnknownEffect`, `UnknownBuiltinEffect`, `UnknownOperation`
   (`generationProblem` gives `Internal TableLookup`), `UnboundLocal`,
   `PayloadShape`, `ResultShape` (`Internal InputShape`), both kinds
   that stop a run under ruling R3. The rules stay applicative: they
   combine children by `<$>`, `<*>`, `traverse` and `ado`; a bind
   appears only where a rule reads a child's generated result or a
   table entry another names (the scrutinee's type for E12's arms, a
   constructor's owner, `Γ` along a block), never a solved shape.
   Check.Implied's `declared` still walks other declarations' fields
   with its own `maybe []`; those ids are the tables' own, and the
   owner it starts from is checked first.
3. Entries at `result` (Sig6, Sig8, Sig10) carry the written result
   type's span (T-R0b §6, "the node's"): `syntax` at the parameter
   count, its absence a `ResultShape` fault. No diagnostic changes:
   the generator renders none. The RT6 resolver now reads that span
   from the resolved syntax (`typeRefSpan`), not from the generator's
   own choice.
4. The import-invariant sentence above is corrected.

Checked: test/r0-generate-faults.test.mjs (3 tests) injects each fault
by doctoring the inputs or the declaration (a callee id 99, no
constructors, no types, no effects, an effect without operations, a
local 99, a clause label with no payload, no result syntax) and checks
the `Left`, its constructor and its `Internal` kind; `staticRules`
faults on the unknown callee too. The serial corpus test now requires
`Right` on every corpus declaration (no fault taken), and the focused
generator tests pass (67). Regression runs (recorded) in a scratch
copy of output/ and test/, deleted afterwards, command `node --test
test/r0-generate-faults.test.mjs`; unpatched, none fail. F1, compiled
Expr's `localOf` answering `Right Unit` for an unbound local: fails
"an unbound local, a payload-less clause, no result syntax". F2,
compiled Lookup's `calleeOf` reading function 0's signature for any
id: fails "a missing callee, constructor, type, effect or operation"
and "the undoctored program generates Right for every declaration".

## RT1's comparison and B13 (2026-10-23)

R0 shadow tranche, Task 3.3 steps 4-5 (T-R0b §9 item 1, §11 item 2).
The generator (Task 3.2, at ae27ebb) and RT1's translator (8515ab3,
907c961, written before any Task 3.2 commit) are compared by
test/r0-rt1.serial.test.mjs over the pinned corpus, which holds the
fixtures' sources: 973 resolving programs, 2,958 declarations, 160,937
translator entries.

**Result (checked).** `node --test test/r0-rt1.serial.test.mjs`: 7
pass, no disagreement.

- `generate` is `Right` on every declaration.
- RT1 as stated: the multisets of `[list, Origin.atom, value]` agree
  after recorder-spec §5.3's normalization. The normalization drops
  `eq t t` unless `t` holds a record of two or more parts (a written
  label beside a tail counts as two parts); on the translator's side
  it drops 45,394 of 48,377 such atoms. The `vars` maps agree in full,
  origins and positions included.
- Beyond the statement: the whole canonical problems agree. That
  covers every origin (rule, row, span, kind), `types`, the rigid
  arrays, and the raw entries before normalization. Entry lists and
  `flexTy`/`flexRow` are compared sorted, since their order is
  recorded, not canonical; the two sides do record entries in
  different orders.
- Every rule id of T-R0b §3 occurs on both sides (entries or `vars`
  origins), except Sig2, Sig9, E1, E2, E24, P1 and P2, whose rows give
  no entry and no variable. Every Outside constructor occurs in some
  corpus program on both sides, except LocalGeneralization (no
  resolved construct produces it; exempt, ruling R11).

So the shared reading list ("RT1's translator", readings 1-21) and the
generator agree. Reading 6's conflict was resolved by Task 3.2's prep
(5bfe2c0): `HandlerHead` takes an `EffectRef`. The generator takes
the entry by name (`main`), the translator by `program.entry`; they
agree on the corpus.

**Mutants (recorded).** Each was run on a copy of output/ and the new
test modules in the session scratchpad (deleted afterwards). The copy's
test read the corpus from the worktree's git index and ran from the
worktree directory; that is harness only. Unpatched: 7 of 7 pass.

| Mutant | Patch | Failing tests |
|---|---|---|
| MG (generator) | output/Features.Check.Generate.Failure/index.js `("Fail")("payload")` → `("Fail")("value")` | RT1 multisets, vars, whole problems (first: editors/vscode/fixtures/effect-namespaces.wxw `failing`) |
| MT (translator) | test/r0-translator-records.mjs `{ spread: spreads.length + 1 }` → `spreads.length` | RT1 multisets, vars, whole problems (first: examples/records.wxw `promote`) |

**B13 settled (generation side).** T-R0b §3.4 and §11 item 2 propose
that P5-P7 give each record pattern its own equation against the
scrutinee, with no `Outside PatternGrowth`, pending RT1. Two
independent implementations agree on every record-pattern atom of the
corpus (580 P5, 1,737 P6, 419 P7; the B13 test compares them by
declaration). Neither emits a growth marker: PatternGrowth is not an
`OutsideKind`. The proposal stands as implemented. What RT1 cannot
show is whether today's growth rule (Check/PatternRow.purs:76
`growable`) accepts exactly the problems P5-P7 make valid. That is a
question about the online solver against `ValidR` (RT8 or CX), not
about generation, and it stays open there (recorder-spec Q5).

## RT2, RT4, RT9, RT10, AT13 and B9 (2026-10-23)

R0 shadow tranche, Task 3.4 (T-R0b §9 items 2, 4, 9, 10; T-R0a AT1,
AT4, AT13; T-R0b §11 item 1). The generator at 0c703e1, unchanged: no
run named a generator defect, so no generator code changed. First runs
failed only on the tests' own expectations, each corrected against the
rule text: RT4's normalization (the amendment below); RT9's E23 and
E16 spans; RT10's `bq` order (recorded, not canonical) and `main`'s
`crash` (E19 too); AT13's spans, moved when `f` preceded `g`. RT7's
determination check moved to Task 4.3 (plan re-review S2); the brief
lists no RT8 step, so none is here.

**RT2 = AT1, with AT4 (checked).** test/r0-refusal-independence.test.mjs
over test/fixtures/r0/rt2 (11 programs, T-R0b §9 item 2's minimum set:
D4 at `walk` W1, p10, c21; D6 at p11 and `submit`; b04, b03; E26's
several-tail receiver; B9's removal and rest binder; H5's depth). Each
adds, after the refusing expression, `let shown = show(1 + 2); if shown
== "3" then 1 else 2`, a later declaration and an over-applied call
(E_ARITY). Per fixture: the collecting driver's legacy slot holds the
fixture's exact diagnostic; every declaration's whole problem equals
RT1's translator's (not a prefix); the entries whose node starts after
the refused span are non-empty and the translator's; the `bq` sites are
exactly the fixture's (`pr`/`cmp`, by covered text, origin body),
including those before the refusal that today's end-of-body walks never
reach (`n == 0` in `walk`); the later declaration has its problem; the
static one has `StaticArity` and its problem. `node --test
test/r0-refusal-independence.test.mjs`: 25 pass.

Two findings from building the set (checked, the fixtures pin both):
- `submit` (requirements.md §7, "predicted D6") is refused today by D4,
  not rule H: `Cannot tell how file's u, t and q split { ...r }; no
  annotation can decide u, t and q, which belong to this call of file`.
- E26's `Placeholder` at a several-tail receiver (Record.purs:160, cited
  by T-R0c §3.6) is unreachable: no compiled module constructs
  `UnifyFailure.Placeholder` (`grep -rn "UnifyFailure.Placeholder"
  output/*/index.js | grep -v instanceof` prints nothing; only its own
  module's `create`). A field access at a receiver of two flexible
  tails is refused by D4 instead (`Cannot tell whether ext's s or t has
  field a; annotate this lambda's parameters`), and that program is the
  E26 fixture.

The corpus is re-pinned (11 added, 1,128 programs), and the 11 outcomes
are appended to test/fixtures/r0/first-diagnostic.json under
`extended` (computed by `compile` at 0c703e1, src/ unchanged); no
existing entry changed. They are confirmed at the snapshot's baseline
too (fix round 1; `confirmed: "5d6b1cb"`), since src/ changed between
5d6b1cb and 0c703e1 (88 files): a detached worktree at 5d6b1cb, built
by `node scripts/build.mjs` only, compiled the 11 programs (sources
from the corpus loader) with its own `compile` and `wire`, and a
script compared each outcome's JSON with the snapshot's: `11 of 11
byte-equal`. The worktree was removed afterwards.
`node --test --test-concurrency=1` over the five
corpus-wide suites: 23 pass (RT1 included, so RT1 covers the fixtures).

**B9 settled (generation side; checked).** RT1 (corpus-wide, now with
both B9 fixtures) and RT2 agree on E28 and P7 over several tails: each
records `eq { a: Int, ...r, ...s } { a: ⟨field a⟩, ...⟨rest⟩ }` with no
marker, where today's checker stops at its R005B placeholder
(`withinOneTail`). As with B13, what generation cannot show is the
verdict side: B9's reason (`Unsupported (GuardOutsideFragment …)` while
no guard covers several tails) is decision's (Task 4.x).

**RT4 (checked; one labelled amendment).** test/r0-hand.test.mjs:
translation.md §5's 44 example files. Nine write a second spread or a
two-tail annotation without a clause and are refused at Resolve, so
they have no problem (T-R0b §8; S1 and the body-type move are not
implemented); the test pins each refusal. For the other 35, one
declaration's `D` and `B` equal the hand translation after eliminating
defining equations on both sides, as sets, up to a bijective renaming
of flexible variables (test/r0-hand-support.mjs and
test/r0-hand-match.mjs state the rules). Hand translations: §5.1's,
quoted (§17's from sig-oracle/source-boundary.mjs where a row cites
§17); for §5.2, which gives none, written here by §2.3's rules and
labelled so in the test (n02 is §17's `missingField`). `BQ`, `adm` and
`split` are outside §5's notation. 46 pass, including a control that
wrong translations and renamings fail.
Amendment, after the first run: p14 and p15 failed because elimination
was order-dependent (the generator's Sig3 atom bound the rest row first,
leaving `{ a: Int, ...r } = { a: β, ...r }`). A rule was added: two
records of the same labels and tails equal field by field (cancellative
composition), keeping the record's definedness. Then 46 pass. No hand
translation was changed to fit.

**RT9 (checked).** test/r0-markers.test.mjs: one fixture per `Outside`
constructor (HandlerType and FailFamily once per rule), each beside
`1 + true`; the marker is in `outside` with its rule, kind and node span,
and `eq Bool Int` (E7) is in `b`, which today's checker also refuses.
LocalGeneralization has no construct (R11). E17 and E20 at `State(s)`:
`inst 0` is in `vars`, type, exists, `Slot` at the node. The verdict
half (no Solved; Contradiction still found) waits for Tasks 4.1 and
5.1. E23's span is `Fail.fail(1`: Resolve spans `fail` through the
payload's end on purpose (Qualified.purs:154).

**RT10 (checked; two points for the author).** test/r0-origin-kinds.test.mjs:
the review's probes kept no files, so h1-h4, cmp-c, cmp-cf, pr-c,
pr-cf, eq-c, eq-d and `peek` (pk-crash-c) are rebuilt from its text,
and each meets today's checker as recorded (phase and text). Every `bq`
atom has T-R0b §6's kind (E10/E19 body, Sig10 contract), every `q` is
empty, and `divide`'s problem is the same under each written split.
- recorder-spec T10 expects `divide`'s `peek` site with origin
  contract; T-R0b §6 makes E19 body and §3.1's Sig9 leaves `Q` empty
  [VOR]. The test follows T-R0b.
- RT10's "cmp-c and cmp-cf record the same atom" holds for the origin
  (same AtomId and rule), not the value: by E13, E2 and E10 the operand
  is the lambda's written annotation, `{ c: Int }` against `{ c: Int, f:
  Int -> Int }`, and the pair writes the split exactly there. The
  statement (recorder-spec T8b: the atom mentions a flexible variable)
  fits only an unannotated lambda (cmp-open). Decided here by the rule
  text; the test pins both values.

**AT13 (checked).** test/r0-independence.test.mjs: four pairs change
only `f`'s body (no calls; a call to `g`, so `f` and `g` form one
recursive component; a body today's checker refuses; a call to a callee
`g` also calls). `g`'s canonical problem bytes and static refusals are
equal in each pair, and `g` keeps its two `adm` sites; a control that
changes `g` changes them. The verdict half waits for decision.

**Mutants (recorded).** Each was applied to a copy of output/ in the
session scratchpad (with test/, the examples and the corpus module;
deleted afterwards) and run with the five new test files; unpatched, 101
pass.

| Mutant | Patch (compiled module) | Failing |
|---|---|---|
| M1 prefix | Generate.Control: `concatOut(Data_Array.snoc(outs)($$final.out))` → `concatOut(outs.slice(0, 1))` | 30: every RT2 test, RT4 p09 and c23, the RT9 fixtures |
| M2 `cmp` not in BQ | Generate.Operator: `ToBQ(new …Comparable(` → `ToB(…` | 32: RT10 h3, h4, cmp-c, cmp-cf, eq-c, eq-d and the split pair; every RT2 test |
| M3 no implied callee clauses | Generate.Signature: `implied: append(` → `implied: [], unusedImplied: append(` | 16: RT4 p10, p11, p12, p19, c21, n04, n09, n13 and the control; seven RT2 |
| M4 Deferred's kind | Generate.Control: `ToOutside(…Deferred.value)` → `FailFamily` | RT9 Deferred |
| M5 E19 origin contract | Generate.Builtin: the E19 `Body.value` → `Contract.value` | 16: RT10 h1, h2, pr-c, pr-cf, peek; every RT2 first test |
| M6 reads a body | Generate.Inputs: `parameters` empty when the body is a `Block` | AT13 (the first pair), RT4 n10, RT2 walk |

## Rules and the projection (2026-10-23)

R0 shadow tranche, Task 5.1 (T-R0a §5, §5.1, §5.2, AT5, AT6; CX
refute/statements.md §4.1 conditions 1-5, §5's C1-P, C1-M, C1-D and
X7). New: Features.Check.Refute.Sig (`SigProblem`), Refute.Project
(`toSig`, `withBody`), Refute.Rules (`checkDerivation`, the empty
`registry`, `RefuterSpec`, `Refuter`, `trustedRefuter`),
Refute.Rules.Internal (`SoundRule`'s constructor), Refute.Theorems (the
empty `theorems`), Domain.Verdict.Theorem.Internal (`TheoremRef`'s
constructor) and Domain.Verdict.Unsound. Nothing reachable from
compile calls any of them: Program.Main now reaches the two new Domain
modules as types only (test/r0-verdict.test.mjs lists them).

**Readings (labelled; the rulings in the SDD ledger decide the rest).**
1. `TheoremRef`'s constructor is in Domain.Verdict.Theorem.Internal
   (Task 1.1's ruling). Refute.Theorems imports and re-exports the type
   alone, so a test mints a `TheoremRef` through the Domain module's
   compiled JS, not through Theorems as the brief says. Rules imports
   the type from Theorems, without `(..)`, which the source scan checks.
2. `SoundRule` (ruling R7) and `TheoremRef` are `data`, not T-R0a's
   newtype: no `coerce` reaches them, and the compiled form keeps a
   constructor for tests to mint through (test/r0-stubs.mjs).
3. `Unsound` has five constructors: `Unregistered`, `Unprojectable`,
   `DAtomPremise AtomId`, `NotOriginal AtomId`, `RuleDeclines`. The rule
   is not repeated: `DerivationRefused RuleName Unsound` carries it.
4. `Budget` (T-R0a §4.3), needed by `RefuterSpec`'s search, is an
   uninhabited type in Domain.Verdict.Open until Task 4.1 defines it.
5. `Refuter` is opaque; `refuterParts` gives its name, theorem, the
   spec's untouched search and `confirm`, the spec's check with an
   accepted CX wrapped as `Refuted`. A search's `Nothing` is not read
   here as `NoCounterInstance Exhausted`: the spec's `Maybe` cannot
   tell exhaustion from a spent budget, so `decide` (Task 4.1) owns it.
6. Condition 1: names stay the recorded `Var`s, so the map is injective
   trivially; a generalized `app` occurrence is `Generalized n`, a name
   no recorded variable has. As in Lean, a variable not in the rigid
   lists is flexible.
7. Condition 3: the only body atoms outside `TExpr` are `bq`'s. Every
   `b` atom is in Lean's atom language once its `app` occurrences are
   generalized, so `toSig` keeps every `b` atom with its id.
8. Condition 2 covers `q` as well as `D`: a non-empty `q` leaves
   `toSig` undefined (requirement atoms in `D`).
9. `AtomId` is not unique ("RT1's translator", item 3), so a premise
   names every `B` atom that carries it, and `withBody` keeps them all
   (a sublist of `B`, so C1-M still applies). A premise found among
   `D`'s ids is refused first; that never refuses a `B` atom, since no
   corpus `D` id is a `B` id (checked below).
10. `checkDerivation` checks, in order, that the rule is in the
    injected set, that `toSig` is defined, that each premise is an
    original `B` atom, and that the rule fires again on `withBody (toSig
    P) premises`. The evidence is the submitted derivation; what the
    re-run derives is not compared with it.
11. AT6's "applied to a `D`-subset": a derivation found on a sub-`D`
    (the rule fires there), which the re-run on the whole `D` refuses.
12. T-R0a's AT5 fixtures (`routeUndeclared`, `markNoClause`) are CX
    certificates, ground (2), Task 5.2's. Here AT5 covers ground (1).

**Checked.** test/r0-rules.test.mjs (12 tests): `toSig` keeps `D` and
`B` ids in order, the rigid lists, and drops `bq`; `Box(Int) =
Box(Int)` becomes two distinct generalized variables (bounded: valid);
an `app` in `D` or a non-empty `q` gives no projection and
`Unprojectable`. AT5: a test-only head-clash rule (C1-H's shape, not
claimed sound), registered through the stub, gives `ByRule` evidence
on `fn f(): Int = true`, on the same with `where r lacks { a }` and on
`x + true`: every premise is a `B` id and no `D` id, `withBody` keeps
the whole `D`, and research/composition-assessment/sig-oracle/
bounded.mjs (default bounds) finds the premises' problem `invalid`.
AT6: an unregistered rule (empty `registry`, or another rule's name);
a premise at a non-existent index, of another declaration, or of a
`bq` atom (`NotOriginal`); a `D` premise (`DAtomPremise`); a
composition rule run with `D` dropped fires on `{ a: 1, ...p }` under
`r lacks { a }`, and the re-run on the whole `D` refuses it
(`RuleDeclines`): bounded finds the problem without `D` `invalid` and
with it `valid`, X7's lesson on a source program. A non-clashing
premise beside a clash is refused (the re-run reads the premises
only). `registry` and `theorems` are empty. `trustedRefuter` wraps only
what the check accepts and passes a refusal through.

test/r0-project.serial.test.mjs: over the pinned corpus (984 programs
that resolve, 3,011 problems) `toSig` is defined on every problem,
keeps every `D` and `B` id in order, and no `D` id is a `B` id.

Stack: the first `toSig` recursed along arrow spines. A probe
(`fn f(k: (Int, …, Int) -> Int): … = k`, n parameters, scratchpad
script) printed `1000 ok`, then `5000 toSig threw RangeError: Maximum
call stack size exceeded` and the same at 20,000. Spines are now
walked by a loop (as Domain.Type.Core's `stagesThrough`); the same
probe prints `ok` with spine depth 1000, 5000 and 20000, and a test
pins 20,000.

Structure (test/structure.test.mjs, test/structure-r0.test.mjs): a
module other than Refute.Rules importing Refute.Theorems is a graph
finding; the import scan flags an open import, `as` without a list,
`hiding`, `TheoremRef(..)` and `TheoremRef (TheoremRef)` on a
continuation line, and passes Rules' real import; each new Internal
module's graph, compiled-import and re-export rules, both directions.

purs 0.15.16 probes (a copy-on-write copy of src, .spago and output in
the scratchpad, one probe module at a time, deleted afterwards):

| Probe | Result |
|---|---|
| `TheoremRef "x"` with `Domain.Verdict (TheoremRef)` | does not compile: `Unknown data constructor TheoremRef` |
| the same through `Refute.Theorems (TheoremRef(..))` | does not compile: `Unknown data constructor TheoremRef` |
| `SoundRule {…}` through `Refute.Rules (SoundRule(..))` | does not compile: `Unknown data constructor SoundRule` |
| `Refuter parts` through `Refute.Rules (Refuter(..))` | does not compile: `Unknown data constructor Refuter` |
| `coerce ∷ String → TheoremRef` (Safe.Coerce) | does not compile: no `Coercible` instance |
| `Domain.Verdict.Theorem.Internal (TheoremRef(..))` in Features.Check.Probe | compiles; findings: `imports Domain.Verdict.Theorem.Internal` and its compiled JS imports it |
| `Refute.Rules.Internal (SoundRule(..))` in Features.Check.Probe | compiles; the same two findings |
| `Refute.Theorems (theorems)` in Features.Check.Probe | compiles; finding `imports Features.Check.Refute.Theorems` |
| Rules importing `Refute.Theorems (TheoremRef(..))` | compiles (Theorems exports no constructor); the scan's finding |

**Mutants (recorded).** Each patched a copy of output/ (with test/ and
the sig-oracle) in the scratchpad, deleted afterwards; unpatched, the
11 tests of r0-rules then present pass.

| Mutant | Patch (compiled module) | Failing |
|---|---|---|
| M1 D premise | Rules: `var $37 = any(cites)(sig.d);` → `var $37 = false;` | AT6 D atom |
| M2 sub-`D` | Project: `withBody`'s `d: problem.d,` → `d: [],` | AT5; AT6 D-subset |
| M3 shared variable | Project: `accum: next + 1 \| 0` → `accum: next` | app occurrences |
| M4 whole body | Rules: `rerun(rule)(…withBody(sig)(derivation.premises))` → `rerun(rule)(sig)` | re-run on premises |
| M5 `q` ignored | Project: `null(view.q)` → `true` | toSig undefined |

Regression row `r0-d-premise` (scripts/regression-r0.mjs, probe in
test/regression-r0.mjs): premises read from `D` as well as `B`. `node
scripts/regression.mjs r0-d-premise`: "fixed compiler passes; restored
defect fails", the probe printing `D atom accepted as a premise:
Right`.

RED runs: before Project, Rules and Theorems existed and before the
structure rules, `node --test` over the four touched test files gave
6 pass, 4 fail (r0-rules and r0-verdict: no
Domain.Verdict.Theorem.Internal output; structure-r0: Rules allowed to
import it; structure: no `theoremImportFindings`).

## Strategies and `decide` (2026-10-23)

R0 shadow tranche, Task 4.1 with Task 3.6 (T-R0a §4.1, §4.3, §5.1,
§5.3; AT7, AT8, AT9, AT11, AT12, AT16, AT17; T-R0b RT3). New:
Domain.Verdict.Search (`Budget`, `SearchHint`, `CheckRefusal`),
Features.Check.Strategy (`StrategySpec`, `Strategy`, `strategy`),
Features.Check.Decide (`Checking`, `decide`, `untilVerdict`),
Decide.Reason (rules 1, 1′, 3) and Decide.Refuters (seeding,
`shadowRefuter`). Changed: Domain.Verdict (`NoWitnessReason =
NonConstructive StrategyName`, moved from Open; `Eq` for `StrategyName`
and `Unsupport`), Domain.Verdict.Open (four placeholders moved out; `Eq
Question`), Refute.Rules (`ruleName`, `ruleDerivation`). Nothing
reachable from compile builds a `Checking` (ruling R6): Program.Main
reaches Domain.Verdict.Search as types only and no Strategy or Decide
module (test/r0-verdict.test.mjs).

**Readings (labelled; the SDD ledger's rulings decide the rest).**
1. `Checking` has T-R0a's five fields and two injected implementations:
   `openRequirements`, §3.2(a)'s detector (Task 4.2's; a stub until it
   lands, ruling R11), and `ends ∷ Progress → Boolean`, when the run
   stops early. Production's is `untilVerdict`; rule 5's test-only
   value never ends early. That is the "different injected value" of
   rule 5 (ruling R7), not a flag.
2. A strategy's run gives `Ran = { attempt, hints, solution }`, not
   T-R0a's bare `Attempt`: rule 2 seeds refuters with the hints, and
   Solved carries the strategy's assurance.
3. `Search` gains `Inconsistent String` (ruling R10 (iii)): the state a
   search reads beside the problem (its injected context) disagrees
   with it, which stops the run as `BrokenInvariant`. A search's own
   broken invariant is `NoCandidate (Broke …)`, a `SearchBroke` record
   that never stops the run (G-Q13, dossier §18.71 item 2). Task 4.3
   routes `InternalKind` by ruling R3's partition: the confined kinds
   to `Broke`, the stop kinds and `GenerationFault` to `Inconsistent`.
4. Zero fuel: once the guard admits, `strategy` does not call a search
   given `fuel ≤ 0`; the attempt is `Searched (OutOfBudget
   (StrategyBudget name))`.
5. A refuter search's `Nothing` is `NoCounterInstance Exhausted` (the
   choice Task 5.1 left here): a `Maybe` cannot tell exhaustion from a
   spent budget, so a refuter never contributes `Limit` to rule 3.
6. Seeding: each refuter (and shadow) searches once with no hint and
   once with each hint alone, in canonical order (sorted, duplicates
   removed), each on the whole budget; the first counter-instance its
   check accepts wins, else the first refusal is reported. Adding a
   hint adds a run and removes none, so the search is monotone in its
   hints whatever it does with several.
7. Blame (carry from Task 5.1's review): `decide` derives a
   derivation's `blame` from its premises' paths, whatever the rule
   wrote, rather than refusing a foreign blame site. The premises are
   what `checkDerivation` checked, so the culprit named is the
   evidence; no `Unsound` constructor or trusted check changes.
8. Stopping: production stops at the first Solved or contradiction
   (rules first), unless rule 1 or 1′ blocks Solved, when every rule,
   strategy and refuter runs; an `Accepted` beside a contradiction is
   then `BothVerdicts` (rule 4 in production). Shadows always run, after
   the rest, seeded with the hints gathered.
9. Rule 3: a `RequirementOpen` refusal reads as a decline
   (`RequirementAtoms`) and so never as a refused `ClaimsComplete`
   candidate; "every strategy declined" counts strategy attempts only;
   with no strategy at all the reason is `Inference NoStrategyApplies`
   (T-R0a §3.5 glosses it "every guard declined", which rule 3 gives
   to `Unsupported`; rule 3 is followed). A budget limit has no node,
   so its site is the body's root. `Unsupported` lists each reason
   once.
10. Ruling R10 (ii), an orchestration invariant: `checkDerivation`
    finds a rule by name, so two rules of one name in `Checking.rules`
    stop the run as `BrokenInvariant`.
11. `CheckRefusal = RequirementOpen AtomId | Unsatisfied AtomId`; Task
    4.2 adds G0's own. `SearchHint = SearchHint String`, ordered (T-R0a
    §3.5's advisory text). `Budget = { fuel, depth, keys }` (§4.3).
12. No `StrategyName` constructor was added: every stub is
    `OnlineSolver`, and no test needed two names.
13. RT3 is test/r0-injection.serial.test.mjs (corpus-wide, ruling R11).
    Task 4.3's `onlineSearch` does not exist yet, so "the online search"
    is today's per-declaration search, `checkProgram`'s `recheck`.
14. No `ErasedRow` marker and no `EffectsUnchecked` reason: the
    2026-10-23 ruling defers them to the task that builds the marker
    (docs/plans/r0-erased-rows.md §7.1); `decide`'s comment says so.

**Checked.** test/r0-decide.test.mjs (17 tests), r0-decide-faults (6)
and r0-order (4), all through the production `decide` with stubs from
test/r0-stubs.mjs, which mints `Valid`, `TheoremRef` and `SoundRule`
through the compiled Internal modules. AT8: a refused `Heuristic`
candidate is `Unresolved (Inference NoAcceptedCertificate)` with no
`SearchFault`; a refused `ClaimsComplete` one, then an accepting stub,
is Solved with both attempts and a `CandidateRefused`; alone, the same
Unresolved, never Faulted; `DerivationRefused` and `BrokenInvariant`
are `Left`. AT9: `NoWitness (NonConstructive OnlineSolver)` is Solved.
AT11: the `DataApplication` fixture with an accepting stub is
`Unsupported [Outside DataApplication]`; with a trusted stub refuter,
Contradiction. AT12: fuel 0 gives `Limit [StrategyBudget]`, the search
is not called and `encodeProblem` is unchanged. Rule 3's two ordering
probes; rule 4's `BothVerdicts` under a marker by refuter and by
registered rule; rule 5's only through `ends`; AT17 for Solved,
Unresolved and no strategy; `RequirementOpen` as `Unsupported
[RequirementAtoms]`; an injected open atom and a second spread (a test
`vars` key, since Resolve refuses one) each block two accepting stubs,
both run; a decline is local; blame is the premises' paths; seeds are
`[]`, `['a']`, `['b']` for hints `b, a, a`. G-Q13 without "proposed",
and the three stops of ruling R10. AT16: each `InferenceFailure`,
reason family, the `Unsupport`s rule 1 and guards give, both `Limit`
kinds, each `InternalFault` and each `SearchFault` by one injection.

test/r0-injection.serial.test.mjs (RT3): over the pinned corpus (more
than 900 programs and 2,500 declarations, the test's floors) each
declaration's `encodeProblem` is the same alone, after `checkProgram`
on the program and after `decide` with a stub refusing at once; and the
compiled import closure of Features.Check.Generate holds no Strategy,
Decide or Refute module.

AT7. The grammar is in test/r0-order.test.mjs, fixed before the first
run. First run, `node --test test/r0-order.test.mjs`: two properties
failed, `AssertionError: {"Solved":13,"Contradiction":76,
"Unresolved":195,"Faulted":116}` and `a refused candidate never gives
Faulted: world 1`. Cause: the generator called each rule kind with the
random source as its index, so every rule was named alike and the
distinct-names invariant stopped the run; the grammar says "named
apart". Correction to the generator, not an amendment of the grammar:
rule kinds take `(next, index)`. Second run: 4 pass. A scratch copy
printing its counters gave classes Solved 25, Contradiction 96,
Unresolved 279 (400 worlds), 169 worlds with a refused candidate, and
25 monotonicity worlds where seeding with the whole hint set would
lose the counter-instance.

**Mutants (recorded).** Each patched one compiled module in a scratch
copy of output/ and test/ (deleted afterwards), running r0-order,
r0-decide and r0-decide-faults; unpatched, all pass.

| Mutant | Patch (compiled module) | Failing |
|---|---|---|
| M1 whole-set seeding | Refuters: `var seeds = …cons([])(…)` → `var seeds = [canonical(hints)];` | monotone in hints; seeds |
| M2 hints unsorted | Refuters: `return sort(nub(hints));` → `return hints;` | seeds |
| M3 block ignored for running | Decide: `!progress.blocked && (…)` → `(…)` | incomplete problem; rule 1′; rule 4; AT16 |
| M4 rule's own blame | Decide: `blame: nub1(map1(…))` → `blame: v.value0.blame` | blame |
| M5 `RequirementOpen` as refusal | Reason: `new Declines(RequirementAtoms)` → `claimed(claim)` | RequirementOpen |
| M6 zero fuel searches | Strategy: `if (budget.fuel <= 0)` → `if (false)` | AT12; AT16 |

M2 leaves AT7 green: with per-hint seeding the order of the seeds
cannot change whether a counter-instance is found.

Regression rows (scripts/regression-r0.mjs; probes in
test/regression-r0.mjs): `r0-refused-stops` (a refusal becomes
`BrokenInvariant`; AT8's probe expects Solved), `r0-limit-hidden` (any
refusal outranks `Limit`; the `Heuristic` probe expects `Limit`),
`r0-marker-ignored` (rule 1 reads no marker; AT11's probe expects no
Solved), `r0-shadow-decides` (a shadow's checked CX turns the verdict
Unresolved; AT17's probe expects Solved). `node scripts/regression.mjs
r0-refused-stops r0-limit-hidden r0-marker-ignored r0-shadow-decides`:
each "fixed compiler passes; restored defect fails".

purs 0.15.16 probes (a copy-on-write copy of src, .spago and output in
the scratchpad, deleted afterwards):

| Probe | Result |
|---|---|
| `Strategy` through `Features.Check.Strategy (Strategy(..))` | does not compile: `Unknown data constructor Strategy` |
| `ShadowRefuter` through `Decide.Refuters (ShadowRefuter(..))` | does not compile: `Unknown data constructor ShadowRefuter` |
| `coerce` from a run function to `Strategy` | does not compile: no `Coercible` instance |
| `Valid` through `Domain.Verdict (Valid(..))` | does not compile: `Unknown data constructor Valid` |
| `strategy` and `shadowRefuter` (control) | compiles |

Trusted surface re-pinned: Domain.Verdict adds `NoWitnessReason(..)`
(source), `NonConstructive`, `eqStrategyName`, `eqUnsupport` (compiled);
Refute.Rules adds `ruleDerivation` and `ruleName` (both). None names a
token constructor; `ruleDerivation` returns a plain `Derivation`, which
is evidence only through `checkDerivation`.

RED: before Domain.Verdict.Search, Strategy and Decide existed, `node
--test test/r0-decide.test.mjs test/r0-decide-faults.test.mjs
test/r0-order.test.mjs` failed all three files with
`ERR_MODULE_NOT_FOUND` for output/Domain.Verdict.Search.
