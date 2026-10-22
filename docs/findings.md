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
