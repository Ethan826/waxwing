# Int arithmetic operators: design note (D001 slice)

Status: statements for review, revised 2026-10-24 with the author's
rulings (below and section 9). Of the plan, only Tasks 1 and 2 are
authorized (2026-10-24); no other code or language change is;
the implementation plan for `-`, `*` and unary minus is
docs/plans/2026-10-24-int-arithmetic-plan.md. Slice of BACKLOG D001
("numeric types beyond Int32 with defined arithmetic ... split into
focused designs"). Scope: `-`, `*`, `/`, `%` and unary minus on Int
(int32). Other numeric types and bit operations are out of scope.

Evidence labels: **cited** (file:line read), **checked** (command run,
output quoted), **argued** (reasoning only, no check yet), **required**
(a check the implementation must add; not yet written or run).

## Rulings (2026-10-24)

Decided by the author on 2026-10-24. They replace the recommendations
that the first draft (2026-10-23) put to the author.

| Decision | Ruling |
|---|---|
| Division/remainder by zero | Not a raw Go panic or an untracked defect. Either a tracked `Fail(ArithmeticError)` or, initially, checked functions returning a result value. Which one is OPEN, to be resolved before division is implemented (a separate decision memo is being prepared). |
| Unary minus | Included. |
| Division rounding | Truncate toward zero. The remainder has the sign of the dividend, and `a == (a / b) * b + a % b`. |
| `INT_MIN / -1` | Wraps, consistently with fixed-width arithmetic: `-2147483648 / -1` is `-2147483648`, and `-2147483648 % -1` is `0`. |
| AST representation | A shared arithmetic node is acceptable; the refactor must preserve existing `+` behaviour exactly. |
| Prelude/operator relationship | A documented temporary representation is permitted; C001's explicit dictionaries alone will not supply operator resolution. |
| Literal zero divisor | Same semantics as any other zero divisor; constant evaluation must not silently change failure behaviour. |
| Scope | These integer operations only; other numeric types stay separate. |

Also ruled: subtraction, multiplication and unary minus can proceed
independently of the division-failure decision. The plan therefore
covers `-`, `*` and unary minus only; `/` and `%` wait for that
decision.

## 1. What exists today

- Int is signed int32; literals must fit (E_INTEGER); a minus belongs
  only to integer literals and may be separated from its digits by
  whitespace (docs/language.md:60-64). Cited.
- `->` is matched before an integer's minus (docs/language.md:15-16;
  src/Format/Lex/Chars.purs:96-97, 106). The lexer emits `-` as its own
  token; the parser folds `-` plus digits into a literal only where an
  integer is expected (src/Format/Parse/Literal.purs:21-36; the
  operand-position test is `integerStart`, :27-28, used by `primary`,
  src/Format/Parse/Expression.purs:153). Cited.
- `+` wraps modulo 2^32 (docs/language.md:151-152). Cited.
- Pipeline of `+`: Syntax.Add (src/Domain/Syntax/Core.purs:28) parsed in
  `additive` with `++` as one left-associative level
  (src/Format/Parse/Expression.purs:114-118); Resolved.Add
  (src/Features/Resolve/Expression.purs:43); `checkAddition` requires
  both operands Int, left then right
  (src/Features/Check/Infer.purs:73, 138-146); Checked.Add and IR.Add
  (src/Domain/Checked/Internal.purs:72, src/Domain/IR/Internal.purs:136);
  specialization (src/Features/Specialize/Body.purs:75 on this branch,
  :74 on main); Go emission `waxwingAdd(a, b)`
  (src/Format/Go/Expression.purs:50, 101-102) over
  `func waxwingAdd(a int32, b int32) int32 { return a + b }`
  (src/Format/Go.purs:42), emitted into every program. Cited.
- Other Go helpers are emitted only when some expression needs them, so
  programs without them keep their output byte for byte
  (src/Format/Go/Usage.purs:10-12, `needsBoolHelper`). Cited. The
  generated-Go snapshots (bootstrap/*.go, compared by
  test/compiler.test.mjs:115-140 and others) would all change if new
  helpers were emitted unconditionally. Argued.
- `Add` appears in about a dozen whole-tree walks. Checked:
  `grep -rnwE "Add" src` prints 29 lines in 24 files on this branch,
  and `git grep -nwE "Add" main -- src` prints 25 lines in 20 files on
  main; the four extra are the R0 generator's (Generate/Expr.purs:56,
  Generate/Operator.purs:36, Generate/Static/Rules.purs:71,
  Generate/Static/Walk.purs:40), which exist only on the R0 lineage.
- The helper form matters: Go rejects constant overflow and constant
  division by zero at compile time, and the helper takes variables, so
  `waxwingAdd(2147483647, 1)` builds and wraps. Integer literals lower
  to `int32(n)` (src/Format/Go/Data.purs:93-94, cited), so an inline
  `int32(65536) * int32(65536)`, `-int32(-2147483648)` or
  `int32(1) / int32(0)` would be a constant expression. Argued (Go
  specification, constant expressions; not checked in this pass).
- `with H B` parses two juxtaposed expressions, handler then body
  (src/Format/Parse/Handler.purs:49). Cited. It is the one production
  in which a complete operand can be followed by the start of another
  expression; see 4.
- Nesting: each operand of `+`, `|>` or a comparison is a level; a flat
  sum of n operands counts n - 1 (docs/language.md:954-972). BACKLOG
  G003 (one long Go expression builds superlinearly) and O001 (flat
  chains) apply to the new operators unchanged. Cited.

## 2. Semantics (statements)

S1. `a - b`, `a * b` and `-a` are the exact result reduced to the
signed int32 range, modulo 2^32, as `+` is. Consequently
`-(-2147483648)` is `-2147483648`, and `-a` equals `0 - a` for every
`a`. Ruled (wrap); the consequences are argued.
S2. `a / b` truncates toward zero. `a % b` has the sign of `a` (or is
zero) and satisfies `a == (a / b) * b + a % b` for `b != 0`, taking `*`
and `+` as wrapped. Ruled.
S3. `-2147483648 / -1` is `-2147483648`; `-2147483648 % -1` is `0`. No
trap: the quotient wraps, as fixed-width arithmetic does. Ruled.
S4. `a / 0` and `a % 0` are **not** a raw Go panic and not an untracked
defect (ruled). The outcome is OPEN between a tracked
`Fail(ArithmeticError)` and, initially, checked functions returning a
result value; the decision memo
(docs/plans/2026-10-24-int-division-memo.md, prepared separately)
resolves it before division is implemented. Whichever is chosen:
- a literal zero divisor behaves exactly as any other zero divisor
  (ruled), so `1 / 0` and `1 / (x - x)` fail the same way;
- constant evaluation must not change failure behaviour (ruled). Go
  rejects constant division by zero at compile time, so an inline
  `int32(1) / int32(0)` would turn a runtime outcome into a Go build
  error; the helper form (`waxwingDiv(int32(1), int32(0))`) takes
  variables and keeps the outcome at run time (argued);
- the emitter cannot rely on Go's own `integer divide by zero` panic,
  since that is the defect path the ruling excludes: the helper tests
  the divisor itself (argued).
S5. Operands evaluate left then right, strictly, before the operation,
as `+` (docs/language.md:148). A binary operation spans from the start
of its left operand to the end of its right operand
(spanBetween, src/Format/Parse/Expression.purs:107-110); unary minus
spans from its `-` to the end of its operand. Argued, except where
cited.
S6. Unary minus is included (ruled). At an operand position, `-`
followed by digits (whitespace allowed, as today) stays one integer
literal; any other `-` there is unary minus. So `-2147483648` remains
a valid literal (4).

Go on int32, **checked** with go1.26.4 (`go run`, variables not
constants), output: `-2147483648 / -1, % -1` printed `-2147483648 0`
with no panic; `-7/2, -7%2` printed `-3 -1`; `7/-2, 7%-2` printed `-3 1`;
`5/0` recovered `runtime error: integer divide by zero`;
`65536*65536` printed `0`; `INT_MIN - 1` printed `2147483647`.
So Go's operators give S1-S3 exactly for binary operators. Unary
negation of a variable holding INT_MIN is argued, not checked: the Go
specification defines integer `-x` as `0 - x` with wrapping overflow
(not re-read in this pass); the plan's oracle is required to cover it.
Emitter additions (argued): helpers `waxwingSub`, `waxwingMul` and
`waxwingNeg` over variables, as `waxwingAdd`, to avoid Go constant
errors, each emitted only when used (1); no INT_MIN guard. Division's
helpers depend on S4's outcome.

### Division by zero: options

| Option | Effect | Cost | Standing |
|---|---|---|---|
| A. Defect (Go panic) | `/` and `%` stay `(Int, Int) -> Int` | Total-looking operator can crash | Ruled out (2026-10-24) |
| B. `Fail(ArithmeticError)` on `/` and `%` | Honest in types; a tracked failure | Every user of `/` gains `Fail` in its row; INF001 inference not designed for this | Open |
| C. Checked functions returning a result value, initially | Total; no operator until settled | Needs a result type and a prelude (STD001) or a stopgap | Open |
| D. Refuse a literal `0` divisor at compile time | Early diagnostic | Breaks "same semantics as any other zero divisor" | Ruled out (2026-10-24) |

The choice between B and C is the decision memo's; this note does not
make it.

## 3. Precedence and associativity

Levels, loosest first (current ones cited):
`|>` (left; Expression.purs:82-86), comparison (non-chaining,
:90-105), additive `+ - ++` (left, one level, :114-118), multiplicative
`*` (and later `/ %`; left, new), unary prefix `-` (new), postfix
application, field access, update and `without`
(src/Format/Parse/Postfix.purs; docs/language.md:778-781), primary.

Binary operators:
`a + b * c` is `a + (b * c)`; `a - b - c` is `(a - b) - c`;
`a / b * c` is `(a / b) * c`; `a - b ++ c` parses and the checker
rejects it as `+ ++` mixes do today. Comparisons bind looser, so
`a - 1 < b * 2` is `(a - 1) < (b * 2)`. `x |> f` binds looser than
all of them. Each operand of a binary operator is a nesting level, as
for `+`.

Unary minus binds tighter than `*` and `+` and looser than the postfix
operations:
- `-2 - 3` is `(-2) - 3` = -5 (`-2` is a literal, 4).
- `- -x` is `-(-x)`; `--x` is the same (`--` is not a token).
- `-f(x)` is `-(f(x))`; `-p.a` is `-(p.a)`.
- `-x * y` is `(-x) * y`; under S1 it equals `-(x * y)` for all
  operands, so the choice is invisible in values and matters for spans
  and diagnostics (argued; the oracle is required to confirm).
- `-x + y` is `(-x) + y`, which differs from `-(x + y)`.
- `-x |> f` is `(-x) |> f`; `-x < y` is `(-x) < y`.
- An `if`, `match`, lambda or block operand needs parentheses:
  `-(if c then 1 else 2)`.
- The operand of unary minus is one nesting level, so 128 nested
  minus signs compile and the 129th is E_NESTING, as other forms.

Argued, except where cited.

## 4. Lexing and the position of `-`

New single-character token `*` now, `/` and `%` with division (the
list at src/Format/Lex/Chars.purs:32-49 is where `+` and `-` are). No
two-character token changes: `->` still wins over `-` (Chars.purs:106),
so `x->1` still lexes `x`, `->`, `1`. Comments do not exist, so `//`
lexes as two `/` tokens and `**` as two `*` tokens. `--` is not a
token: it lexes as two `-` tokens. Cited for the existing tokens;
argued for the new ones.

`-` is disambiguated by position, in the parser, not the lexer:
- after a complete operand it is binary;
- where an operand is expected, it starts an integer literal when the
  next token is decimal digits (whitespace between them allowed, as
  docs/language.md:62-63 states today), and is unary minus otherwise.

Resolution of the literal question: keep literal folding. `-2147483648`
and `- 2147483648` stay one literal, INT_MIN, as today. Unary minus
applied to `2147483648` never arises from that text; `-(2147483648)` is
E_INTEGER at the literal, because the parentheses end the folding.
Folding changes no value: for every n in [0, 2147483647] the literal
`-n` equals `-(n)` under S1; folding only adds INT_MIN. Argued. A folded
literal is a primary, so a postfix operation applies to it: `-2(x)` is
`(-2)(x)`, not `-(2(x))`; both are type errors, with different spans.

Consequences (argued; the plan pins each with a test):
- `5 -1` is `5 - 1` = 4; `5 - -1` is 6; `5 --1` is also 6.
- `5 - 1` and `5-1` agree.
- Patterns are unchanged: `-1 => ...` is a literal pattern and `-x` in
  a pattern stays E_SYNTAX `Expected digits after minus`.

Which currently valid programs change? A `-` after a complete operand
has no production today, so every such program is rejected, with one
exception: `with H B` reads two juxtaposed expressions
(Handler.purs:49). Today `with h -1` (and `with h - 1`) is handler
`h`, body `-1`; under this note `h - 1` becomes the handler and the
body is missing (E_SYNTAX). The same thing already happens with `(`:
`with h (x)` reads `h(x)` as the handler. Argued. No tracked program
writes `with` followed by an operand and a `-` (checked: `git ls-files
| xargs grep -nE "\bwith [A-Za-z_][A-Za-z0-9_.()]* +-"` matched only
type-level `with pure` rows, none an expression). The break is
accepted (ruled 2026-10-24, section 9).

Diagnostics (proposed; none needs a new code):
- `-true`: today E_SYNTAX `Expected digits after minus` (pinned by the
  characterization row test/diagnostics.test.mjs:20-21); under this
  note E_TYPE, with the text `1 + true` gives today, at `true`. The row
  needs a reviewed change to a trigger that still reaches the message,
  a pattern such as `match 1 { -x => 1 }`.
- `fn main(): Int = -;`: E_SYNTAX `Expected an expression` at `;`
  (existing text, Expression.purs:170-172).
- `2 ** 3`: E_SYNTAX `Expected an expression` at the second `*`.
- `a * `: E_SYNTAX `Expected an expression` at the token after `*`.
- `2147483648 * 1`: E_INTEGER (existing) at the literal.
- `a // b` (with division): E_SYNTAX `Expected an expression` at the
  second `/`.

## 5. Examples

Valid (program fragments `fn main(): Int = <e>;`, printed output):

```text
7 - 10              -3
2 + 3 * 4           14
10 - 3 - 2          5
5 -1                4
5 - -1              6
5 --1               6
65536 * 65536       0
(0 - 2147483647) - 2     2147483647
-2147483648 - 1     2147483647
-2147483648 * -1    -2147483648
-(1 + 2)            -3
-2 - 3              -5
- -7                7
-(-2147483648)      -2147483648
--2147483648        -2147483648
-2 * 3              -6
(1 < 2 * 3) == true     true  (main: Bool)
```

With `fn f(x: Int): Int = x;` and `fn g(x: Int): Int = <e>;` called as
`g(5)`:

```text
-x + 1              -4
-f(x)               -5
-x * x              -25
```

Division (values per S2 and S3; the zero-divisor rows wait for S4):

```text
100 / 10 / 5        2
-7 / 2              -3
-7 % 2              -1
7 % -2              1
7 / -2              -3
-2147483648 / -1    -2147483648
-2147483648 % -1    0
1 / 0               pending S4 (Fail or checked function)
1 % 0               pending S4
```

Invalid and boundary (proposed texts):

```text
-true         E_TYPE    as `1 + true` today, at `true`
-             E_SYNTAX  Expected an expression (at `;`)
-(2147483648) E_INTEGER at the literal
1 < 2 < 3     E_SYNTAX  Comparisons do not chain     (existing)
2 ** 1        E_SYNTAX  Expected an expression
1 * true      E_TYPE    as `1 + true` today (text not copied here)
1 - 2 ++ "x"  E_TYPE    as `1 + 2 ++ "x"` today
2147483648 * 1  E_INTEGER at the literal
match 1 { -x => 1 }  E_SYNTAX  Expected digits after minus
with h -1     E_SYNTAX  (today valid; break accepted, section 9)
x |> -f       E_TYPE    unary minus of a function
```

Examples stay in `text` fences: a `waxwing` fence would enter the
pinned R0 corpus (6).

## 6. Recorder rule and R0 sequencing

Today's rule: research/division-campaign/r0/recorder-rules.md:333,
E7 `Add l r`: result `base Int`, constraints `eq tau_l Int`,
`eq tau_r Int`, band B1, origin R16. E8 `Concat` is the Text twin.
Cited. Each new binary operator needs the same shape: `Sub`, `Mul`
(later `Div`, `Rem`) with the E7 constraints. Proposed: extend E7 to
cover them (path label per operator, as test/r0-generate-paths.mjs:16
lists `Add: { left: 1, right: 2 }`), not new rule numbers. Unary minus
needs a one-operand shape (`base Int`, `eq tau_e Int`), generated by
the same semantic pattern as E7 with its own explicit generation case
and tests (ruled 2026-10-24, section 9). Argued.

With a shared node (7), the `+` operator keeps the path label `Add`, so
the refactor leaves every recorded path unchanged; the G-total test
counts 36 Resolved.Expr constructors by reading the source
(test/r0-translator-records.test.mjs:105-123), a count the shared node
keeps when it replaces `Add`. Cited for the test; argued for the count.

Matching edits at implementation time (cited sites; all exist only on
the R0 lineage, not on main, checked with `git cat-file -e main:<path>`):
- src/Features/Check/Generate/Expr.purs:56 (`arithmetic ... 7 "Add"`),
  Operator.purs:36 comment, Static/Walk.purs:40 (`pair "Add"`),
  Static/Rules.purs:71.
- Independent translator test/r0-translator-exprs.mjs:27-32 (`binary`,
  whose path name is chosen at :29) and :141 (the E7 entry);
  test/r0-translator.mjs:12-25 names the path vocabulary.
- test/r0-generate-paths.mjs:16, test/r0-generate-expr.test.mjs:85-116.
- The pinned corpus (test/r0-corpus.mjs; manifest
  test/fixtures/r0/corpus-manifest.json; re-pin with
  `node scripts/r0-corpus-pin.mjs`): any tracked .wxw file or
  waxwing-tagged fence added changes the pin.

**Sequencing (ruled 2026-10-24, section 9).** Implementation proceeds
during the R0 shadow tranche but does not land into the R0 stack or
main then: it changes the node set the recorder, the translator and the
corpus agree on, hence today's acceptance baseline. Landing waits for a
review of recorder coverage, pinned evidence and corpus baselines.

## 7. Implementation sketch

The plan (docs/plans/2026-10-24-int-arithmetic-plan.md) covers steps
0-6 for `-`, `*` and unary minus; `/` and `%` follow S4's decision.

0. Behaviour-preserving refactor (ruled acceptable): replace `Add` by
   one `Arith (Arithmetic e)` node in Syntax, Resolved, Checked and IR,
   where `Arithmetic e` is `Binary BinaryOp e e | Negate e` in a new
   Domain module with derived Functor, Foldable and Traversable, so
   each walk has one case that folds or traverses the operands left to
   right. Evidence: the full verify and the phase differential agree
   before and after, and every Go snapshot is byte-identical.
1. Lexer: `*` (Chars.purs).
2. Parser: `multiplicative` level under `additive`; `-` joins
   `additive`'s operators; a `unary` level above `atom`, choosing
   literal or unary minus on the token after `-`; spans via
   spanBetween.
3. Resolve: the one `Arith` case (Expression.purs:43).
4. Check: generalize `checkAddition` to every Int operator
   (Infer.purs:138-146).
5. Specialize: Body.purs:75.
6. Go: helpers emitted on use beside Go.purs:42; one emission case.
7. R0: recorder rule, translator, generate paths, corpus re-pin (6),
   sequenced per 6.
8. Tests: an independent BigInt interpreter oracle in the style of
   test/adt-order.test.mjs, through the Go backend; regression rows,
   each shown failing with its defect restored (AGENTS.md); the `--`,
   `5 -1` and `with h -1` cases; nesting 128/129 for `*`, `-` and
   unary chains (test/depth.test.mjs, scripts/depth-forms.mjs).
9. Docs: language.md lines 47 and 567 (grammar), 62-63, 151-152,
   154, 778-781, 954-972; BACKLOG D001, G003 and O001.

Correction to the first draft: scripts/trusted-surface.json does not
pin Domain.Checked.Internal or Domain.IR.Internal. It pins the source
export lists and compiled export names of the importers of
Domain.Verdict.Internal and Domain.Recorded.Internal (checked: its 27
keys are Domain.Recorded, Domain.Verdict and Features.Check.Generate*).
A new case inside an existing function changes no pinned export, so a
re-pin is needed only if an export changes (for example a new
Generate.Operator function for unary minus). Argued.

## 8. Assurance-register row (proposed, for the register's format)

| Feature / owner | Guarantee and foundation | Evidence and gate | Current standing |
|---|---|---|---|
| Int `+ - *` and unary minus / D001 | Operators denote int32 two's-complement wrap (`-a` is `0 - a` wrapped, so `-INT_MIN` is INT_MIN); the checker accepts only Int operands; precedence and association as section 3. Foundation: Go spec integer operators; binary boundary cases checked on go1.26.4; unary negation argued from the spec. | Required (not yet run): independent BigInt interpreter oracle over boundary and random operands, run through the Go backend. Required (not yet run): regression rows, each shown failing with its defect restored; the refactor's before/after verify and differential. Argued: precedence table, left association, `-` position rule, literal folding. Not covered: Go compiler correctness; Lean proof not proposed (no distinctive semantic claim). | Proposed; plan written, no implementation |
| Int `/ %` / D001 | Truncating division, remainder with the dividend's sign, `INT_MIN / -1` wraps (ruled); zero divisor tracked, never a raw panic (ruled), outcome pending. | Pending the division-failure decision. | Pending decision |

## 9. Open decisions for the author

Closed by the 2026-10-24 rulings (see Rulings): division rounding
(truncation), `INT_MIN / -1` (wrap), unary minus (included), node
shape (shared node, behaviour-preserving), operators as a documented
temporary representation, literal-zero refusal (no: same semantics),
scope (these integer operations only), and division by zero as a
defect (no).

Closed by the author's second set of rulings (2026-10-24):
- **Scope and order**: `-`, `*` and unary minus proceed in isolation.
  Division is deferred, and a zero-on-divide result is excluded.
- **Branch base**: option A of the plan, a fresh branch from main
  carrying only this note and the plan (branch d001-arith). On main
  the R0 recorder, translator and corpus sites do not exist (the plan's
  header says so), so work on this branch touches only the live
  pipeline; the R0 work happens when landing is reviewed.
- **Sequencing** (was Open decision 2): implement during the R0 shadow
  tranche; do not land into the R0 stack or main. Landing requires a
  review of recorder coverage, pinned evidence and corpus baselines.
- **`with H B` with B starting with `-`** (was Open decision 3): the
  break is accepted. `with h -1` stops parsing. The binary-minus task
  documents it with an explicit migration example (`with h -1` becomes
  `with h (-1)` or `with h { -1 }`) and an ADR. Negative literals are
  preserved as specified in 4: literal folding keeps `-2147483648` a
  literal.
- **Unary-minus constraints** (was Open decision 4): generated by the
  same semantic pattern as existing integer arithmetic (one operand,
  `eq tau_e Int`, result `base Int`), with their own explicit
  generation case and tests. Applies when the R0 work is done.
- **Helpers**: emitted only when used (`waxwingSub`, `waxwingMul`,
  `waxwingNeg`), so programs without the operators keep their Go.
- **Authorized now**: plan Tasks 1 and 2 only (the behaviour-preserving
  shared-node refactor of `+`, and the independent BigInt oracle). The
  author reviews them before authorizing the rest.

Still open:
1. **Division by zero**: tracked `Fail(ArithmeticError)` or, initially,
   checked functions returning a result value. Resolved by the separate
   decision memo (docs/plans/2026-10-24-int-division-memo.md) before
   `/` and `%` are implemented.
2. **Temporary representation (ruled permitted; wording to confirm)**:
   the operators are built-in `Arith` nodes, documented as a stopgap
   whose single place of removal is that node, revisited when C001 and
   operator resolution are designed. No separate overloading mechanism.
