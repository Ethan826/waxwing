# Int `-`, `*` and unary minus: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-plan-execution
> (recommended) or inline-plan-execution to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: Tasks 1 and 2 authorized, 2026-10-24; Tasks 3-7 wait for the
author's review of them.

**Rulings (2026-10-24; design section 9).** `-`, `*` and unary minus
proceed in isolation; division is deferred and zero-on-divide is
excluded. Branch base: option A below, branch d001-arith from main
2af6e40 carrying only the design and this plan. Sequencing: implement
during the R0 shadow tranche, land into neither the R0 stack nor main;
landing requires a review of recorder coverage, pinned evidence and
corpus baselines. The `with h -1` break is accepted (Task 3 adds a
migration example and an ADR); literal folding keeps `-2147483648` a
literal. Unary-minus constraints follow the existing integer
arithmetic pattern, with their own generation case and tests (Task 5's
R0 step). Helpers are emitted only on use. Only Tasks 1 and 2 are
authorized now. On main the R0 recorder, translator and corpus sites
do not exist (Branch base, below), so on this branch Tasks 1 and 2
touch only the live pipeline and skip their "R0 stack" steps; the R0
work happens when landing is reviewed.

**Goal:** add binary `-`, `*` and unary minus on Int with int32 wrap
semantics, after a behaviour-preserving refactor of `+` into a shared
arithmetic node. `/` and `%` are out of scope (they wait for the
division-failure decision).

**Architecture:** one `Arith (Arithmetic e)` node per tree (Syntax,
Resolved, Checked, IR), where `Arithmetic e` lives in a new Domain
module and folds its operands left to right, so the dozen whole-tree
walks keep one case each. The parser gains a multiplicative level and
a unary level; Go emission uses helpers over variables, each emitted
only when used.

**Tech Stack:** PureScript 0.15.16 (purs-tidy 0.11.1, Spago 1.0.4),
Node test runner, Go 1.26.4 (package.json `toolchain`).

**Spec:** docs/plans/2026-10-23-int-arithmetic-design.md (Rulings
2026-10-24; sections 2-5 and 7). Read it before any task.

## Global Constraints

- AGENTS.md is the single source of engineering rules; read it, then
  README.md, docs/plans/bootstrap.md, docs/progress.md, docs/findings.md.
- Run `npm run verify` before reporting any task complete; report what
  actually ran and keep verified and proposed behaviour apart.
- One verify at a time across worktrees. AGENTS.md states no lock; the
  author's working convention is an atomic `mkdir <scratchpad>/verify.lock`
  before verify, `rmdir` after (also on failure), anchored process
  checks (`pgrep -f "^node scripts/verify.mjs"`), and clearing
  `.build/go-cache` afterwards. A lone timing failure counts only if a
  quiet re-run of that test passes; report both runs.
- Never disable checks, skip tests or weaken assertions. Every
  regression row is shown failing with its defect restored, in an
  isolated copy (scripts/regression.mjs does this per row).
- Domain, Features and Format stay pure; imports run to the same or an
  earlier layer. Only Features.Check* and Features.Specialize* import
  Domain.Checked.Internal; only Features.Specialize* and Format.Go*
  import Domain.IR.Internal.
- Files at most 250 physical lines; declarations aim at 30 lines; `where`,
  never `let … in`; no anonymous lambdas passed to map/traverse; name
  numeric constants except 0, 1, 2 and test data.
- Every .md, .mjs, .js and .wxw line at most 80 code points
  (`node scripts/width.mjs`).
- Commits stage explicit paths only (never a directory, `-A` or `.`);
  compare `git status --short` with the session-start snapshot first.
  No merge commits: integrate by rebase and fast-forward. No push
  without an explicit request.
- Keep plan status, docs/progress.md, docs/findings.md and BACKLOG.md
  current in the same commit as the change they describe.
- Examples in Markdown use `text` fences; a `waxwing` fence or a new
  tracked .wxw file enters the pinned R0 corpus.
- **Sequencing (ruled 2026-10-24, design section 6):** implement
  during the R0 shadow tranche; do not land into the R0 stack or main
  until recorder coverage, pinned evidence and corpus baselines are
  reviewed.

### Branch base (ruled 2026-10-24: option A)

d001-int-arith sits on the R0 lineage: it forks r0-shadow-tranche-1 at
0710fa6 (2 ahead of that commit's line, 35 behind the tranche's tip)
and is 44 commits ahead of main and 3 behind (checked: `git rev-list
--count`). The R0 sites in Tasks 1-4 (Generate/*, test/r0-*,
scripts/trusted-surface.json, the corpus manifest) exist only on the
R0 lineage (checked: `git cat-file -e main:<path>` fails for each).

| Option | What changes | Cost |
|---|---|---|
| A. Fresh branch from main | Tasks run without their R0 steps; `Add` is 25 lines in 20 files there (checked) and Body.purs's case is at :74 | The R0 stack must later absorb `Arith` (generator, translator, path labels, G-total, corpus): conflict work moves to the R0 branch and changes its acceptance baseline under it |
| B. On the R0 stack (rebased onto the tranche's current tip first) | Tasks include their R0 steps | Cannot land on main before R0 does; inherits the 35-commit catch-up and the tranche's churn; the sequencing constraint binds directly |

## Provenance

| Component | Source | Fidelity |
|---|---|---|
| int32 wrap for `+ - *` and negation | Go specification, integer operators and integer overflow; two's-complement arithmetic | faithful |
| Reference model | ECMAScript `BigInt` with `BigInt.asIntN(32, x)` | faithful |
| Left-associative operator levels, prefix level | the parser's existing `chainLeftAny`, `dispatch`, `ifSecond` (src/Format/Parse/Grammar.purs:138-185) | faithful (reuse) |
| Shared node with derived Functor, Foldable, Traversable | standard deriving (PureScript 0.15) | faithful |
| Seeded random operands | the LCG of scripts/differential-corpus.mjs:5-14 (Numerical Recipes constants) | faithful (copied into the test, not imported, to keep the oracle independent of tooling) |
| Behaviour-preservation evidence | scripts/differential.mjs phase differential with a projection, as earlier representation changes did (scripts/differential-project.mjs) | faithful (reuse) |

Nothing invented.

## Review Focus

1. `with h -1` stops parsing (design 4, Open decision 3). Task 3
   (binary `-`) pins the new rejection; if the author rules otherwise, Task 3's
   parser step changes before it lands.
2. Operands with effects evaluate left then right for `-`, `*` and
   inside unary minus: `p(1) - p(2) * p(3)` prints 1, 2, 3. Tasks 3,
   4 and 5 each add an evaluation-order row.
3. Programs that never use the new operators keep byte-identical Go
   (helpers on use). The bootstrap snapshots (test/compiler.test.mjs,
   test/adt-print.test.mjs, test/adt-match.test.mjs,
   test/fx-services.test.mjs) and Task 7's differential pin it.
4. INT_MIN through every path: literal `-2147483648`, `- 2147483648`,
   `--2147483648`, `-(-2147483648)`, `-2147483648 * -1`; Task 5 and the
   oracle (Task 2, extended per task).
5. Deep chains: 128/129 for `-`, `*` and unary minus, no stack
   overflow (Tasks 3-5 via scripts/depth-forms.mjs). G003 (superlinear
   `go build` of long helper chains) is inherited, not fixed.

Out of scope, flagged: the FX001 reference interpreter's tokenizer
(test/fx-oracle-lex.mjs:14-16) reads `-\s*\d+` as a literal everywhere
and knows no `*`; it needs updating only if its programs start using
these operators.

---

### Task 1: `Arith` refactor of `+`, behaviour preserved

**Blocked (found 2026-10-24, on d001-arith; for the author).** The file
list below misses existing tests that pin the `Add` constructor itself,
not behaviour (checked: `git grep -nwE Add -- test`):
test/properties.test.mjs:4,14 (imports `Add` from Domain.Syntax and
matches `instanceof Add`), and expected shape strings printed by
test/fn-shape.mjs in test/fn-check.test.mjs:48,64,
test/fn-syntax.test.mjs:86, test/r001-parse.test.mjs:41,51,82 and
test/r005-parse.test.mjs:90. Any `Arith` node breaks them, and the
execution brief forbids editing existing tests to pass. Options: (a) a
projection in test/fn-shape.mjs and properties.test.mjs that renders
`Arith(Binary(Plus, l, r))` as `Add(l, r)`, as fn-shape.mjs already
erases rows for legacy FN001 shapes; (b) rewrite the nine expected
strings and the import to the new shape. Either is a reviewed change
to existing tests and needs the author's approval. Task 2 does not
depend on Task 1 and was done first.

**Files:**
- Create: `src/Domain/Arithmetic.purs`, `test/arithmetic.test.mjs`
- Modify (each `Add` site; line numbers on this branch):
  `src/Domain/Syntax/Core.purs:28`, `src/Domain/Syntax.purs:71`,
  `src/Domain/Resolved.purs:26,134`, `src/Domain/Checked/Internal.purs:72`,
  `src/Domain/IR/Internal.purs:136`,
  `src/Format/Parse/Expression.purs:114-118`,
  `src/Features/Resolve/Expression.purs:43-44`,
  `src/Features/Check/Infer.purs:73,138-146`,
  `src/Features/Check/Comparable.purs:34`, `Coverage.purs:44`,
  `DeferNotes.purs:133`, `Failure.purs:137,189`,
  `Instantiation.purs:94`, `LocalUses.purs:21`, `Printable.purs:32`,
  `Walk.purs:28,87`, `src/Features/Specialize/Body.purs:75`,
  `src/Format/Go/Context.purs:49`, `src/Format/Go/Expression.purs:50,101-102`,
  `src/Format/Go/Usage.purs:29,93`, `scripts/differential-project.mjs`
- Modify (R0 stack only): `src/Features/Check/Generate/Expr.purs:56`,
  `Generate/Operator.purs:36` (comment), `Generate/Static/Rules.purs:71`,
  `Generate/Static/Walk.purs:40`, `test/r0-translator-exprs.mjs:27-32,141`,
  `test/r0-generate-paths.mjs:16`

**Interfaces:**
- Produces, in `Domain.Arithmetic`:
  `data BinaryOp = Plus` (derive Eq);
  `data Arithmetic e = Binary BinaryOp e e` (derive Functor, Foldable,
  Traversable; Task 5 adds `Negate e`);
  `operands ∷ ∀ e. Arithmetic e → Array e` (left to right).
- Produces the node `Arith Span (Arithmetic Expr)` in Syntax and
  Resolved, and `Arith (Arithmetic Expr)` in Checked and IR, replacing
  `Add`. `exprSpan` cases follow.

- [ ] **Step 1: Baseline.** Build the current HEAD in an isolated copy
  as the header of scripts/differential.mjs describes (`git archive`
  extracted, `.spago` and `output` copied, `node scripts/build.mjs`).
  Run `npm run verify` under the lock in the working tree and keep its
  summary lines (test counts, regression rows) as the baseline record.
- [ ] **Step 2: Failing test.** `test/arithmetic.test.mjs`, test
  `operands are left then right`: import
  `../output/Domain.Arithmetic/index.js`; assert
  `operands(Binary.create(Plus.value)('l')('r'))` deep-equals
  `['l', 'r']`, and that the derived `foldr` over the same value with
  `Array.cons`-style accumulation gives `['l', 'r']`.
- [ ] **Step 3:** `node scripts/build.mjs && node --test
  test/arithmetic.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement** `src/Domain/Arithmetic.purs` (header
  comment: the operators are built-in nodes, a documented stopgap whose
  single place of removal is this node, design Rulings). Replace each
  `Add` with `Arith`; every walk folds or traverses the `Arithmetic`
  value (`traverse_ recur arith`, `foldl recur found arith`,
  `operands arith`, `map recur arith`, `traverse recur arith`); the
  parser builds `Arith span (Binary Plus left right)`; `checkAddition`
  becomes `checkArithmetic ∷ Env → State → Span → Arithmetic
  Resolved.Expr → Inferred` requiring Int for each operand in
  `operands` order; Go emits `waxwingAdd` for `Plus`. R0 stack: the
  generator's path label comes from a private `label ∷ BinaryOp →
  String` with `Plus → "Add"`, so recorded paths do not change; the
  translator maps the compiled `Arith`/`Binary`/`Plus` constructors back
  to `Add`. No export of a Generate module changes, so
  scripts/trusted-surface.json is untouched (its pin test fails if
  that is wrong).
- [ ] **Step 5:** `node scripts/build.mjs && node --test
  test/arithmetic.test.mjs` PASS.
- [ ] **Step 6: Differential.** Add `withoutArith` to
  scripts/differential-project.mjs (comment: "D001 Task 1: `Add l r`
  became `Arith (Binary Plus l r)`; the candidate's node is hashed as
  the baseline's `Add`") and apply it in the phase hashes. Run
  `node scripts/differential.mjs --baseline <copy> --corpus all`.
  Expected: `0 differences`, every phase reached. Paste the counts into
  docs/progress.md.
- [ ] **Step 7: Verify** under the lock. Expected: the same test count
  and regression rows as Step 1 plus the one new test; all bootstrap
  snapshot tests pass unchanged (they compare bytes). Record both
  summaries in docs/progress.md as the refactor's evidence.
- [ ] **Step 8: Commit** the files above (explicit paths),
  `refactor: Arith node for +, behaviour preserved (D001 Task 1)`.

### Task 2: BigInt interpreter oracle, `+` only

**Files:**
- Create: `test/int-arith-oracle.mjs` (model, generator, printer),
  `test/int-arith-oracle.test.mjs`

**Interfaces:**
- Produces: `evaluate(tree) → BigInt` (exact, then `BigInt.asIntN(32,
  ·)` at every node); `render(tree, { minimal }) → string` (fully
  parenthesized, or with only the parentheses the design's section 3
  table needs, derived from an operator table in the file);
  `boundary` = 0, 1, -1, 2147483647, -2147483648, 2147483646,
  -2147483647, and ±2^k for k = 1..30; `generate(seed, count, ops)`
  for trees of depth at most 6 over boundary and seeded-random int32
  leaves. Later tasks pass more `ops`.

- [ ] **Step 1: Test.** For `ops = ['+']`, seed 1, 200 trees: each case
  `fn main(): Int = <render>;` (both renderings), plus 50 cases whose
  leaves are parameters of `fn g(a: Int, b: Int, c: Int): Int` called
  with boundary arguments, all built once with `runGoBatch`
  (test/go-batch.mjs); assert each printed line equals
  `evaluate(tree)`. Also assert the model itself on fixed rows:
  `2147483647 + 1 → -2147483648`.
- [ ] **Step 2:** run it; expected PASS (`+` exists). This step proves
  the harness, not the feature.
- [ ] **Step 3: Show it can fail.** In an isolated copy, change
  `waxwingAdd`'s body (src/Format/Go.purs:42) to `return a - b`,
  build, run the test there; expected FAIL naming a case. Record the
  command and output in docs/progress.md; delete the copy.
- [ ] **Step 4: Commit** the two test files and docs/progress.md.

### Task 3: binary `-`

**Files:**
- Modify: `src/Domain/Arithmetic.purs` (`Minus`),
  `src/Format/Parse/Expression.purs:114-118`,
  `src/Format/Go/Expression.purs:50,101-102`, `src/Format/Go.purs:42`,
  `src/Format/Go/Usage.purs` (helper use walk),
  `scripts/depth-forms.mjs:49-55`, `test/int-arith-oracle.test.mjs`
- Create: `test/int-minus.test.mjs`, `scripts/regression-arith.mjs`,
  `test/regression-arith.mjs`; register them in
  `scripts/regression.mjs` and `test/regression-probes.mjs`
- R0 stack: `Generate/Expr.purs` label `Minus → "Sub"`;
  `test/r0-translator-exprs.mjs`, `test/r0-generate-paths.mjs`,
  `test/r0-generate-expr.test.mjs:85-116`
- Docs: `docs/language.md` 47, 567, 62-63, 151-152; BACKLOG D001 note

**Interfaces:**
- Produces: `BinaryOp = Plus | Minus`; `usesOperator ∷ BinaryOp →
  IR.Program → Boolean` in Format.Go.Usage (modelled on
  `needsBoolHelper`, Usage.purs:10-20); Go helper
  `func waxwingSub(a int32, b int32) int32 { return a - b }`, emitted
  only when `usesOperator Minus` holds.

- [ ] **Step 1: Failing tests** in `test/int-minus.test.mjs` (batch via
  runGoBatch; rejections via `rejectedAt` from test/support.mjs):
  printed `7 - 10` → `-3`; `10 - 3 - 2` → `5`; `5 -1` → `4`;
  `5-1` → `4`; `5 - -1` → `6`; `5 --1` → `6`;
  `-2147483648 - 1` → `2147483647`; `(0 - 2147483647) - 2` →
  `2147483647`; `1 - true` E_TYPE at `true`; `1 - 2 ++ "x"` E_TYPE at
  `1 - 2` (as `1 + 2 ++ "x"`); span of `(1) - 2` starts at `1`;
  evaluation order: with `fn p(n: Int): Int with Console =
  { Console.print(n); n };`, `p(1) - p(2)` prints `1`, `2`, `-1`
  (modelled on test/fx-block.test.mjs); a program without `-` emits no
  `waxwingSub` and one with `-` does; `with h -1` (a valid handler `h`)
  is E_SYNTAX (pins Open decision 3 as recommended). Oracle: add `'-'`
  to `ops`. Depth: a `minus-chain` form like `plus-chain`.
- [ ] **Step 2:** build, run the new and changed tests; expected FAIL
  (`5 -1` is E_SYNTAX today, oracle cases with `-` rejected).
- [ ] **Step 3: Implement.** `additive` reads `[ "+", "-", "++" ]`
  with `-` building `Arith span (Binary Minus l r)`; the checker needs
  no change beyond Task 1's `checkArithmetic`; Go emits
  `waxwingSub(a, b)` for `Minus` and the helper on use. R0 stack: label
  `Sub`, translator and path table entries, a generate-expr row
  `fn f(x: Int): Int = x - 1;` → E7 at `['body']` with paths
  `Sub/left`, `Sub/right`.
- [ ] **Step 4:** run the tests; expected PASS. Run
  `node --test test/depth.test.mjs` for `minus-chain` 128 compiles,
  129 E_NESTING at the operator.
- [ ] **Step 5: Regression rows** in scripts/regression-arith.mjs, each
  with its probe: `sub-operands` (emit `waxwingSub(b, a)`; probe
  `7 - 10` must print `-3`), `sub-inline` (emit `(a - b)` inline;
  probe `-2147483648 - 1` must build and print `2147483647`),
  `sub-helper-missing` (never emit the helper; probe must build),
  `sub-check-right` (skip the right operand's Int requirement for
  `Minus`; probe `1 - true` must be rejected). Run
  `node scripts/regression.mjs sub-operands sub-inline
  sub-helper-missing sub-check-right`; expected each "fixed compiler
  passes; restored defect fails".
- [ ] **Step 6: Docs.** language.md: grammar line 47 and its copy at
  567 become `addition = atom, { ( "+" | "-" | "++" ), atom }`;
  62-63: a minus after an operand is binary;
  151-152: `-` wraps too; record the `with h -1` break if accepted.
  docs/progress.md, docs/findings.md, BACKLOG D001.
- [ ] **Step 7: Verify** under the lock; **commit** the listed files.

### Task 4: `*`

**Files:**
- Modify: `src/Format/Lex/Chars.purs:32-49` (`'*'`),
  `src/Domain/Arithmetic.purs` (`Times`),
  `src/Format/Parse/Expression.purs` (new `multiplicative` beneath
  `additive`), `src/Format/Go/Expression.purs`, `src/Format/Go.purs`,
  `scripts/depth-forms.mjs`, `test/int-arith-oracle.test.mjs`,
  `scripts/regression-arith.mjs`, `test/regression-arith.mjs`
- Create: `test/int-times.test.mjs`
- R0 stack: label `Times → "Mul"`, translator, path table, generate row
- Docs: `docs/language.md` 47, 154, 567, 778-781, 954-972

**Interfaces:**
- Produces: `BinaryOp = Plus | Minus | Times`;
  `multiplicative ∷ Parser Expr → Parser Expr`
  (`chainLeftAny [ "*" ]` over the Task 5 `unary` level, over `atom`
  until then); helper `waxwingMul`, on use.

- [ ] **Step 1: Failing tests:** `2 + 3 * 4` → `14`; `2 * 3 + 4` →
  `10`; `65536 * 65536` → `0`; `-2147483648 * -1` → `-2147483648`;
  `(1 < 2 * 3) == true` → `true`; `2 ** 3` E_SYNTAX `Expected an
  expression` at the second `*`; `fn main(): Int = 2 *;` E_SYNTAX at
  `;`; `1 * true` E_TYPE at `true`; `2147483648 * 1` E_INTEGER at the
  literal; lexing `**` gives two `*` tokens (the lexer test style of
  test/text-lex.test.mjs); evaluation order `p(1) - p(2) * p(3)`
  prints `1`, `2`, `3`, `-5`. Oracle `ops` gains `'*'`. Depth:
  `times-chain` and a mixed `1 + 1 * 1 + …` form.
- [ ] **Step 2:** expected FAIL (`*` is E_LEX today).
- [ ] **Step 3: Implement** the token, the level and the helper.
- [ ] **Step 4:** tests and depth PASS.
- [ ] **Step 5: Regression rows:** `mul-precedence` (additive beneath
  multiplicative; probe `2 + 3 * 4` must print `14`), `mul-inline`
  (inline `(a * b)`; probe `65536 * 65536` must build and print `0`),
  `mul-check-right`. Each shown failing as in Task 3.
- [ ] **Step 6: Docs:** grammar `addition = term, { ( "+" | "-" |
  "++" ), term }` and `term = atom, { "*", atom }`;
  comparison binds looser than `+` and `*` (154); postfix tighter than
  `*` (778-781); nesting list gains `-` and `*` operands (954-972).
- [ ] **Step 7: Verify** under the lock; **commit**.

### Task 5: unary minus

**Files:**
- Modify: `src/Domain/Arithmetic.purs` (`Negate e`),
  `src/Format/Parse/Expression.purs` (new `unary` between
  `multiplicative` and `atom`), `src/Format/Parse/Literal.purs`
  (export `decimalToken`), `src/Features/Check/Infer.purs`,
  `src/Format/Go/Expression.purs`, `src/Format/Go.purs`,
  `src/Format/Go/Usage.purs`, `test/diagnostics.test.mjs:20-21`,
  `scripts/depth-forms.mjs`, oracle and regression files
- Create: `test/int-negate.test.mjs`
- R0 stack: the recorder rule for `Negate` waits for Open decision 4;
  the generator and translator follow that answer (one operand,
  `eq τ_e Int`, path `Neg/operand` unless the author names otherwise)
- Docs: `docs/language.md` 47, 62-63, 567, 954-972

**Interfaces:**
- Produces: `Arithmetic e = Binary BinaryOp e e | Negate e`;
  `unary ∷ Parser Expr → Parser Expr`: on `-`, `ifSecond decimalToken`
  chooses `atom` (the folded literal, then postfix) or
  `expect "-"` then `nested (unary inner)` building
  `Arith span (Negate operand)`, span from `-` to the operand's end;
  `usesNegate ∷ IR.Program → Boolean`; helper
  `func waxwingNeg(a int32) int32 { return -a }`, on use.

- [ ] **Step 1: Failing tests:** `-(1 + 2)` → `-3`; `-2 - 3` → `-5`;
  `- -7` → `7`; `--2147483648` → `-2147483648`; `-(-2147483648)` →
  `-2147483648`; `-2147483648` and `- 2147483648` still accepted;
  `-(2147483648)` E_INTEGER at the literal; with `x = 5`: `-x + 1` →
  `-4`, `-f(x)` → `-5`, `-x * x` → `-25`, `-p.a` for
  `p = { a: 5 }` → `-5`; `-true` E_TYPE at `true`;
  `fn main(): Int = -;` E_SYNTAX `Expected an expression` at `;`;
  `match 1 { -x => 1 }` E_SYNTAX `Expected digits after minus`;
  span of `-x` is `-` through `x`; `-p(1) * p(2)` prints `1`, `2`,
  `-2`. Change the characterization row
  test/diagnostics.test.mjs:20-21 to the pattern trigger (a reviewed
  change: the message and code stay, the input moves). Oracle `ops`
  gains unary `-` (the renderer writes `- ` before a negative literal
  operand only where the design's folding rule requires). Depth:
  `negation-chain`, 128 compiles, 129 E_NESTING.
- [ ] **Step 2:** expected FAIL (`-x` is E_SYNTAX today).
- [ ] **Step 3: Implement** the level, the check (operand Int), the
  emission and the helper.
- [ ] **Step 4:** tests and depth PASS.
- [ ] **Step 5: Regression rows:** `neg-binding` (unary operand parsed
  at the additive level; probe `-x + 1` with `x = 5` must print
  `-4`), `neg-fold` (always unary, no folding; probe `-2147483648` must
  be accepted), `neg-inline` (emit `-(a)` inline; probe
  `-(-2147483648)` must build), `neg-check`. Each shown failing.
- [ ] **Step 6: Docs:** grammar `term = factor, { "*", factor }` and
  `factor = "-", factor | atom`, with the folding note; 62-63
  rewritten (minus starts a literal
  before digits, else is unary or binary by position); nesting list
  gains the unary operand.
- [ ] **Step 7: Verify** under the lock; **commit**.

### Task 6: R0 re-pins and acceptance (R0 stack only)

**Files:** `test/fixtures/r0/corpus-manifest.json` (only if a tracked
program changed), `scripts/trusted-surface.json` (only if a Generate
export changed), docs/progress.md, docs/findings.md

- [ ] **Step 1:** `node scripts/r0-corpus-pin.mjs` only if
  `loadCorpus` reports drift; review the diff (no `waxwing` fences or
  .wxw files should have been added).
- [ ] **Step 2:** `node scripts/trusted-surface-pin.mjs` only if the
  surface test fails; review the printed `changed:` lines.
- [ ] **Step 3:** run the tranche's acceptance comparison named by the
  R0 plan (docs/plans/2026-10-22-r0-implementation-plan.md) and record
  the result. Sequencing per the header.
- [ ] **Step 4: Commit** the re-pins with their review notes.

### Task 7: whole-change evidence and docs

**Files:** `docs/progress.md`, `docs/findings.md`, `BACKLOG.md`
(D001, G003, O001), an ADR in `docs/adr/` if Open decision 3 accepts
the `with` break, this plan's status line

- [ ] **Step 1: Differential** of Task 1's baseline copy against the
  final tree (`--corpus all`, with `withoutArith`). Expected: the only
  differences are sources that use `-` after an operand, `*` or unary
  minus, all rejected by the baseline; list them, and confirm none was
  accepted by the baseline (the `with h -1` class is the expected
  exception: list each one found).
- [ ] **Step 2: Docs:** BACKLOG D001 (operators done; division pending
  its decision), G003 and O001 (chains of `-` and `*` share the
  problem); findings for the `with` break and the trusted-surface
  correction; progress with every verify summary.
- [ ] **Step 3: Final verify** under the lock; **commit**.

## Execution handoff (estimate)

Seven tasks. Subagent execution: about 21 dispatches (implementer,
reviewer, fixer per task) plus one branch review, roughly 2-3 million
tokens and 6-10 hours wall clock, dominated by verifies (each run
serialized by the lock). Inline: one review dispatch, roughly 1-1.5
million tokens. Both exceed the spend that needs the author's yes.
Recommendation: subagent, because Task 1 touches about 25 sites
whose errors only the differential exposes and an independent reviewer
per task catches them before later tasks build on them.
