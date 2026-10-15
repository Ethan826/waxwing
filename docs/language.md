# Waxwing language specification (stage 0, closed ADTs, comparison, polymorphism, functions, effects)

Waxwing source files use `.wxw`. A file is one program: type declarations and
functions in
any order, with required function signatures. Behavioral claims below name
their verifying test file in test/.

Identifiers: ASCII letters/underscore then letters/digits/underscore.
Whitespace: space, tab, CR, LF. Reserved words: `fn if then else true false
Int Bool Text type match`, and the lone `_`. `type`, `match` and `_` were
identifiers in Stage 0 (ADR 003). Punctuation includes `|`, `{`, `}`, the
single token `=>` (adt-syntax), the operators `== != < <= > >=`, and
(FN001) `->` and `|>`, matched longest first (`==` before `=>` and `=`,
`->` before an integer's minus, `|>` before `|`; fn-syntax); a lone `!` is
E_LEX (compare).
Comments do not exist. Text literals are described under Text, below.

```ebnf
program     = { declaration } ;
declaration = typedecl | function ;
typedecl    = "type", upper, [ "(", lower, { ",", lower }, ")" ], "=",
              ctor, { "|", ctor }, ";" ;
ctor        = upper, [ "(", type, { ",", type }, ")" ] ;
function    = "fn", identifier, "(", [ parameters ], ")", ":", type,
              "=", expression, ";" ;
parameters  = parameter, { ",", parameter } ;
parameter   = identifier, ":", type ;
type        = arrow ;
arrow       = operand, [ "->", arrow ]
            | "(", type, ",", type, { ",", type }, ")", "->", arrow ;
operand     = "Int" | "Bool" | lower
            | upper, [ "(", type, { ",", type }, ")" ] | "(", type, ")" ;
expression  = "if", expression, "then", expression, "else", expression
            | "match", expression, "{", arm, { ",", arm }, [ "," ], "}"
            | "fn", "(", lparam, { ",", lparam }, ")", "=>", expression
            | pipeline ;
lparam      = ( lower | "_" ), [ ":", type ] ;
pipeline    = comparison, { "|>", comparison } ;
arm         = pattern, "=>", expression ;
pattern     = "_" | lower | upper, [ "(", pattern, { ",", pattern }, ")" ]
            | integer | "true" | "false" ;
comparison  = addition, [ ( "==" | "!=" | "<" | "<=" | ">" | ">=" ),
              addition ] ;
addition    = atom, { ( "+" | "++" ), atom } ;
atom        = primary, { "(", [ arguments ], ")" } ;
primary     = integer | "true" | "false" | identifier | text
            | "(", expression, ")" ;
arguments   = expression, { ",", expression } ;
integer     = [ "-" ], digit, { digit } ;
upper       = identifier starting with "A".."Z" ;
lower       = identifier starting with "a".."z" or "_", other than "_" ;
```

A constructor field list must be nonempty (`C()` is E_SYNTAX). Type and
constructor names must be `upper`; `Int` and `Bool` are reserved, so
`type Int = A;`, `type Bool = A;` and `type T = Int;` are E_SYNTAX. `match`
and `if` are expression forms at the same level, so either must be
parenthesized as an addition operand; an empty `match x {}` is E_SYNTAX; a
trailing comma is accepted (adt-match). Minus belongs only to integer literals
(may be separated by whitespace); leading zeroes are decimal; values must fit
int32 (E_INTEGER). Integer patterns use the same syntax.

Types (P001, ADR 007). A lowercase name in a type is a type variable; there
is no new reserved word, so `fn main(): int = 1;` declares a variable
`int`, not a misspelled `Int` (it is then E_ENTRY, below). `type T() =
A;` is E_SYNTAX `Expected a type parameter`, `List()` is E_SYNTAX
`Expected a type` at `)`, and `Int(a)` and `a(Int)` are E_SYNTAX at `(`.
Each type argument is one nesting level (ADR 006). An applied type spans
its head through its closing parenthesis (test/poly-syntax.test.mjs).

Function syntax (FN001; ADR 008; test/fn-syntax.test.mjs). `->` is
right-associative and binds loosest in types: `Int -> Int -> Int` is
`Int -> (Int -> Int)`; `(A, B) -> C` is exactly `A -> B -> C` and `(A) ->
B` is `A -> B`. A parenthesized list of two or more types not followed by
`->` is E_SYNTAX `Expected ->`; `() -> A` is E_SYNTAX `Expected a type` at
`)`. An arrow's parameter side is one nesting level deeper than the arrow,
its result side is not, so a spine of any length is one level
(fn-depth). A lambda `fn(x, _: Int) => e` extends as far right as
possible and needs parentheses as an operand (`(fn(x) => x)(1)`); an empty
or malformed parameter list is E_SYNTAX `Expected a parameter`. `|>` binds
looser than comparison and associates left (`xs |> take(3) |> length`);
neither operand may be an unparenthesized `if`, `match` or lambda.
Application is postfix and repeatable on any primary (`f(1)(2)`, `(g)(x)`,
`make()(x)`); a value application with an empty list (`f(1)()`) is
E_SYNTAX `Expected an expression` at `)`. A lambda spans `fn` through its
body, a pipeline its left through its right operand, an application its
callee through its closing parenthesis (`(add)(1)` from its `(`).

## Semantics

Types: `Int`, `Bool`, declared types (closed, recursive, mutually recursive
in any declaration order; adt-types), applied types such as `List(Int)` or
`Pair(a, List(b))`, type variables, and function types `A -> B`. No
coercions.
Addition needs Int operands. A comparison infers its left then right operand,
and the right must have the left's type, else E_TYPE at the right operand;
its result is Bool. Every ground type is comparable, including uninhabited
ones; a type containing a variable or a function is not (Polymorphism and
Functions, below). `if` needs a Bool condition and equal branch types.
Every function is checked, including unused ones and unreachable arms.

Names. Types, and functions plus constructors (one global table), are distinct
namespaces; locals are parameters, pattern binders and lambda parameters,
and shadow globals. A bare name is a local, else a nullary constructor (a
value), else a function or a constructor with fields, which is a function
value; a bare zero-parameter function is E_ARITY `Expected f()`. Called
with arguments, a function is a call, a constructor a construction, and a
local or binder an application, checked by types. With no arguments, `x()`
on a local and `N()` on a nullary constructor are E_NOT_CALLABLE, and
`f()` on a function with parameters is E_ARITY `Wrong number of
arguments` (fn-names, fn-check). A binder shadows a parameter within its
own arm only; outside it is E_UNBOUND. A lambda parameter shadows anything
of its name in the lambda body; named lambda parameters must be distinct
(E_DUPLICATE `Duplicate parameter x`); `_` binds nothing and may repeat.
A lambda annotation's lowercase names are the enclosing signature's
variables; any other is E_UNBOUND `Unbound type variable b` (fn-names).
Duplicate types, globals, parameters or binders
(`Pair(a, a)` is never equality) are E_DUPLICATE at the first duplicated
declaration in source order, whatever its kind (`fn A(): Int = 1; type T = A;`
reports the function). A missing `main` is E_ENTRY with message
`Expected fn main()`, and so is a `main` with parameters; `main` may return
any ground type without a function in it, else E_ENTRY `Expected fn main()
with a printable result type` (adt-print, fn-rules). Rejection fixtures:
test/diagnostics.test.mjs,
adt-types, adt-match.

Patterns. `_` matches anything; a lowercase name binds; an uppercase name is a
constructor with exactly its field count (E_ARITY); literals match their
primitive type. Pattern type errors are E_TYPE at the pattern. All arm bodies
must have the first arm's type.

Coverage. After the whole program type-checks, each match is checked in
source pre-order, functions in declaration order. The first redundant arm is
E_REDUNDANT (at its pattern); then a non-exhaustive match is E_NON_EXHAUSTIVE
(at the whole match) with message `Missing pattern: <witness>`, rendered like
`Cons(_, Nil)`, `false`, `2`. Witnesses never name an uninhabited
constructor. A type with no inhabited constructor (`type T = C(T);`) is legal;
a wildcard over only such a remainder is E_REDUNDANT (adt-coverage;
coverage.test.mjs compares with a brute-force oracle).

Evaluation is strict, operands and arguments left to right; `if` and `match`
evaluate the scrutinee/condition and only the selected branch. Arms are tried
in order. Deep structures work: an 8192-element list built by doubling sums,
prints and compares correctly (adt-match, adt-print, adt-order). Int addition
wraps modulo 2^32.

Comparison. `==`, `!=`, `<`, `<=`, `>`, `>=` bind looser than `+` and do not
chain: `a < b < c` and `a == b == c` are E_SYNTAX `Comparisons do not chain`
at the second operator. `if` and `match` operands need parentheses. The span
of a comparison runs from its left to its right operand. Both operands are
evaluated, left then right, before comparing; there is no short circuit
(compare, adt-order). The order is one structural total order on well-formed
values: Int by signed int32; Bool `false < true`; a declared type by
constructor declaration position, then fields left to right, the first
difference deciding. `==` holds exactly when the order says equal (separately
built equal values are equal, never by identity); `!=` is its negation
(adt-order, whose independent interpreter oracle checks every operator, and
the `ctor-order` and `first-field` regression rows).

Printing. The executable prints `main`'s value plus LF; printing is a backend
wrapper, not a source effect. (Text prints raw alone and quoted inside data,
below.) Int prints decimal with a leading `-` when
negative, Bool `true` or `false`, a declared value `Name` or
`Name(f1, f2)` with `, ` separators: the coverage-witness format without `_`,
so every printed value is valid Waxwing source that reproduces the value
under the same declarations (adt-print round trip). Re-reading is bounded by
the nesting limit below: a printed list `Cons(1, Cons(2, … Nil))` of more
than 128 elements nests deeper than 128 levels, so it is rejected with
E_NESTING rather than recompiled (heap-based phases, BACKLOG H001, would lift
this). Malformed
values, possible only from foreign code (I001), panic with `waxwing: malformed
value` when a comparison or print visits a nil field pointer or unknown tag;
comparison stops at the first difference, so later malformed fields can go
unnoticed; total order is claimed only for well-formed values.
Foreign (Go) values are not validated: Proposed, with I001.

Polymorphism (P001; ADR 007; spec docs/plans/2026-10-08-polymorphism-design.md).

- Scoping. A type declaration's parameters scope over its own
  constructors; a field naming any other lowercase name is E_UNBOUND
  `Unbound type variable b`, and a repeated parameter is E_DUPLICATE
  `Duplicate type parameter a` at the repetition. Phantom parameters are
  allowed. A declared type used with the wrong number of arguments,
  including none where it has parameters (`List`), is E_ARITY `Wrong
  number of type arguments for List` at the reference. A function's type
  variables are every lowercase name in its signature, implicitly
  quantified over the whole signature; one may appear only in the result
  (`fn loop(): a = loop();`). `main` must have a result without type
  variables: otherwise E_ENTRY `Expected fn main() with a concrete result
  type` (poly-syntax).
- Rigid and flexible variables. Inside its own function a signature's
  variable is rigid: it equals only itself, so `fn f(x: a): Int = x;` is
  E_TYPE `Expected Int, found a`, and `fn g(x: a, y: b): a = y;` is E_TYPE.
  Constructors are polymorphic (`Nil : List(a)`). Each use of a function
  or constructor instantiates its variables afresh, so
  `pair(id(1), id(true))` is `Pair(Int, Bool)`. Unification never makes a
  type contain itself: in `match Nil { Cons(h, t) => same(h, t), Nil => 0 }`
  with `fn same(x: a, y: a): Int` it is E_TYPE `Infinite type: _ occurs
  in List(_)` at the argument `t`, whose unification fails. Messages name
  whole types, `_` for an undetermined part (`Expected Pair(Int, Int),
  found Pair(Int, Bool)`) (poly-check,
  unify; regression rows `occurs`, `rigid`, `instantiate`).
- Holes. A type argument nothing determines (the element type in
  `length(Nil)`) stays undetermined; there is no typing default.
  It does not change the program's meaning: compilation picks one fixed
  representative (Int) for such holes, which is valid because no
  comparison, `main` result or other operation depends on them
  (poly-run, poly-properties representative independence).
- Comparison groundness. A comparison's operand type, once the function is
  checked, must have no variable: a signature variable is E_TYPE `Type a
  is not comparable` (also `Type List(a) is not comparable`), and an
  undetermined one is E_TYPE `Ambiguous type List(_) in comparison`
  (`Nil == Nil`), both at the left operand; the first is reported first
  (poly-check). Comparing `List(Int)` values inside a generic function is
  fine (poly-run).
- Patterns and coverage. On a scrutinee whose type is a variable, only `_`
  and binders fit; a constructor or literal pattern is E_TYPE. Coverage
  treats variables and undetermined types as abstract and inhabited, and
  checks each source match once, whatever its instantiations; a
  constructor's field types are its declared ones with the arguments
  substituted, so for an uninhabited `Void`, `Maybe(Void)` needs no `Just`
  arm (poly-coverage).
- The instantiation rule. Within a group of mutually recursive functions
  (a strongly connected component of the call graph), every type argument
  of a call to a member of the group must be a bare variable of the
  calling function or contain no variable at all; likewise for type
  declarations that refer to each other through constructor fields. So
  `fn f(x: a): Int = f(Cons(x, Nil));` is E_SPECIALIZATION `Recursive call
  to f changes its type arguments` and `type Nest(a) = Nil | Cons(a,
  Nest(List(a)));` is E_SPECIALIZATION `Recursive use of Nest changes its
  type arguments`. The rule guarantees that only finitely many
  specializations exist (proof: spec §4.2); it also rejects some finite
  programs, such as `f(a)` calling `g(List(a))` with `g(b)` calling
  `f(Int)` (poly-termination).
- Inferred-type depth. Composing generic calls can infer types far deeper
  than any written one. A type deeper than 1,000 levels is E_NESTING
  `Inferred type nesting exceeds 1000 levels` at the expression whose type
  would exceed it, never a stack overflow (poly-depth; ADR 007).
- Specialization limit. Each distinct use of a generic function at ground
  type arguments, and each distinct ground application of a parameterized
  type, is one specialization; monomorphic declarations do not count. More
  than 10,000 in one program is E_SPECIALIZATION `More than 10000
  specializations` at the reference that would create the 10,001st (for
  one first created in a signature, the whole function declaration). A
  generic declaration never used is checked but not emitted (poly-run).
- Evaluation and printing are unchanged: a generic value prints with its
  source constructor names and re-reads (`Cons(Pair(1, true), Nil)`;
  poly-run, examples/lists.wxw and bootstrap/lists.go).

Functions (FN001; ADR 008; spec docs/plans/2026-10-08-functions-design.md).

- Typing. `fn f(p1: T1, …, pn: Tn): R` has type `T1 -> … -> Tn -> R`; a
  constructor `C(F1, …, Fn)` of `T(vs)` has `F1 -> … -> Fn -> T(vs)`. A
  lambda's parameters take their annotations or fresh variables; lambdas
  are monomorphic (an unused `fn(x) => 1` is `_ -> Int`). `e(a1, …, aj)`
  is `e(a1)…(aj)`: applying a value whose type is Int, Bool, a declared
  type or a rigid variable is E_TYPE `Expected a function, found Int` at
  the first argument that does not fit. `a |> g(b1…bk)` is checked as
  `g(b1…bk, a)`, any other `a |> e` as `e(a)` (fn-check).
- Arity. A named function's declared parameter count (a constructor's
  field count) is its stage boundary. `f(a1…aj)` with j = n is a call;
  0 < j < n is partial application, a function value; j > n is
  over-application `f(a1…an)(…)`, E_ARITY `Wrong number of arguments` at
  the call when `f`'s declared result can never be a function, or, through
  a result variable, after `f`'s n arguments when its instantiated result
  is not one (fn-check, fn-run).
- Comparability and patterns. A type that mentions `->`, directly or
  through the fields of a declared type it names (to a fixed point:
  `type Outer = Outer(Box)` with `type Box = Box(Int -> Int)`), is not
  comparable: E_TYPE `Type Int -> Int is not comparable` (`Type Box(Int)
  is not comparable`), judged after the rigid and hole checks. On a
  function-typed scrutinee only `_` and binders fit (`Expected Int ->
  Int, found Int`). Function types are inhabited (fn-rules; rows
  `fun-compare`, `functional-fixpoint`).
- Hint. When an E_TYPE is reported anyway, the found expression is,
  through parentheses only, a direct partial application of a named
  function or constructor, and the expected type is not a function or an
  unsolved type variable (a signature's own variable does qualify), the
  message adds `; missing 1 argument to take?` (`missing 2
  arguments to …`); code, span and types are unchanged (fn-hint).
- Evaluation. Strict, left to right: `e(a1, …, aj)` evaluates `e`, `a1`,
  applies, `a2`, applies, and so on; a value's body runs exactly when an
  application completes its stage boundary: a named function or
  constructor at its declared arity, whatever its type (`use(stuck)` in
  ADR 008 enters `stuck` at `f(1)`), a lambda at its last parameter. A
  partial application evaluates its arguments at once, and a shared
  partial never re-evaluates them. A lambda captures the values of the
  locals it reads. `a |> e` evaluates `a` first, then `e`'s callee and
  arguments, then applies (fn-timing, which checks each of these on the
  generated Go and against the independent interpreter; fn-oracle
  compares generated higher-order programs; rows `stage-value`,
  `stage-lambda`, `partial-strict`, `pipe-order`, `block-order`,
  `lambda-capture`).
- Specialization. Every reference to a named function, called or bare,
  at any depth inside lambdas, is an edge of the instantiation rule, so
  `fn grow(x: a): Int = apply(fn(y) => grow(Cons(y, Nil)), x);` is
  E_SPECIALIZATION `Recursive call to grow changes its type arguments`;
  `->` in a type declaration's fields is a type constructor for the rule
  (fn-names, fn-specialize; rows `value-edge`, `arrow-key`).
- Scale. Long parameter lists and arrow spines cost Waxwing's phases
  linear time and no stack in their length (fn-linear, at 20,000 and
  80,000 parameters); generated Go builds within 10 s at 5,000
  parameters (fn-scale.serial). Functions are neither printed nor
  compared.

## Effects (FX001, FX008, FX020)

Decision records docs/adr/010-effects.md and
docs/adr/012-effect-namespaces.md; specs docs/plans/2026-10-09-effects-design.md
and docs/plans/2026-10-13-effect-namespaces-design.md. Everything below is
implemented and checked by test/fx-*.test.mjs, test/fx008-*.test.mjs,
test/fx020-*.test.mjs and the
regression rows of scripts/regression-fx*.mjs, except the limits at the
end, which are stated, not tested.

Syntax. Reserved words added: `effect handler handle with let defer Unit
ctl resume`; `ctl` and `resume` are reserved everywhere and unsupported.
In expression position (`resume(1)`) the error is E_SYNTAX `General control
(ctl/resume) is not supported yet`; in an effect declaration or a handler
clause the parser gives a generic syntax error (`Expected '}'`, `Expected
an identifier`; BACKLOG FX006). `pure` and `nofail` are contextual.
An effect declares operations, `effect Clock { fn now(): Int; };` and
`effect State(s) { fn get(): s; fn put(value: s): Unit; };`; an operation
is called qualified by its effect (`Clock.now()`, "Operation names" below).
Built in: `Fail(e)` with `fail(error: e)`, `Console` with `print(value: a)`,
handled only by the runtime at `main`, and `crash(value)`, a plain global
function.
A signature may end in `with L1 + L2`, `with L + ...e` (a named row
variable) or `with pure`. Expressions: blocks `{ let x = e; e; e }`, `()`,
`handler L { op(x) => e, ... }`, `with h { body }`, `handle body {
fail(error: E) => r }` and block items `defer e;`. `{}` and `()` are Unit;
a trailing `;` makes a block Unit; `let` is monomorphic.

Operation names (FX020, ADR 012). An operation is always called, or used as
a value, qualified by its effect: `Database.query(id)`, `Console.print(x)`,
`Fail.fail(NotFound(3))`, or passing `Database.query` as an argument. Two
effects may declare the same operation name, and an operation may share a
name with a function: `fn log` and `Log.log` are different things.
Qualified names resolve by declaration, never by the row: `Database.query` in
a function whose row lacks Database resolves, and is then E_EFFECT `f
performs Database, which its signature does not allow`. `Nope.log(1)` is
`Unbound function Nope.log`, and `Log.nope(1)` is E_HANDLER `nope is not an
operation of Log`. A qualifier is an uppercase name directly followed by `.`
and then the operation name, with no whitespace between the three
(`Log . log(1)` is `Expected ';'` at the `.`); lowercase `x.y` is not one.
`Fail.fail(e)` takes its family from the type of `e`, and `Fail.fail` alone
is a function value of the payload, `E -> a` performing `Fail(E)`; it is not a
keyword, and the `handle` clause head `fail(error: E) => r` is unchanged.

A function's own row (the `with` of its final stage) may alias effects and
import operations, scoped to its body:
`fn audit(n: Int): Unit with Database as D + Log { log, info as note } = …`
makes `D.query` another spelling of `Database.query` (the canonical name stays
valid), and `log` and `note` the operations `Log.log` and `Log.info`.
`Console { print }` gives `print(x)`; `Fail(Error) { fail }` binds `fail` to
that family, so `fail(x)` requires `x : Error`, and `Fail(E1) { fail as f1 }
+ Fail(E2) { fail as f2 }` imports two families under two names. Marks
combine (`nofail Log { log }`), and a trailing comma is allowed. Handler
clause heads still name the handled effect's own operations. Lambdas inherit
the function's aliases and imports; they cannot declare any.

Scoping is lexical and the first match wins, with no fallback: binders (`let`,
pattern, lambda parameter), then function parameters, then imports, then
global functions and constructors. A binder named like an import wins, and if
it has the wrong type the result is the ordinary type error at the use
(`Expected a function, found Int`). An import wins over a global function of
that name. A bare operation name with no binding is E_UNBOUND with a hint
that only lists fixes (it never resolves the name, and does not depend on the
row): `Unbound function log; use Log.log, or import it with Log { log }`. With
several candidates, in declaration order, built-ins first: `Unbound function
log; use Audit.log or Log.log, or import one with Audit { log } or Log { log
}` for a program declaring Audit before Log (this wording was approved
2026-10-14; three or more read `A.log, B.log or C.log`). A parameterised
effect is imported with its parameters: `Unbound function fail; use
Fail.fail, or import it with Fail(E) { fail }`, and `Box(t) { put }` for
`effect Box(t)`. `print` is `Console.print` and `fail` is `Fail.fail`; there
is no bare `print`.
`Console.print` is compiler-provided because it ranges over every printable
type, a temporary gap until C001, and `show` is a bare global function,
likewise compiler-provided until C001.

Errors (E_SYNTAX unless noted; each has an exact-text test in
test/fx020-*.test.mjs):
- `note is imported twice in this signature`, with the note `first imported
  here`, when two imports bind one local name after renaming.
- `Log is already an effect name`, with the note `declared here` or `first
  bound here`, when an alias equals any declared effect name (present in the
  row or not) or an earlier alias; Console and Fail carry no note.
- `Imports and aliases are allowed only in a function's own row`, for alias
  or import syntax in a parameter type, a handler type, a lambda annotation,
  an effect operation's signature or the row of an arrow result.
- `nope is not an operation of Log` (E_HANDLER) for an unknown import.
- A user `effect Console` or `effect Fail` is E_DUPLICATE `Duplicate effect
  Console`.

A duplicated effect in a row (`State(Int) + State(Bool)`) has only its first
label reachable, so an import from the second binds the first (BACKLOG FX021).

Rows. A row is an ordered list of labels and an optional tail. Matching
takes the first occurrence of a label's key; a label's key is its effect,
except `Fail`, keyed by its payload's declared head, so `Fail(DbError)` and
`Fail(ValidationError)` are different and `Fail(Error(Int))` and
`Fail(Error(Bool))` share a key. Omitting `with` is not a promise of
purity: every signature has an ambient row through which a function passes
what its callbacks perform. `with pure` demands an empty row of the
callbacks it annotates. A type written as a label's argument has no
ambient row, in a signature as in a field, an operation or a `handle`
clause: the arrow in `Fail({ k: (Int) -> Int })` and the handler in
`Fail({ h: Handler(Log) })` are `pure`, so a function and its caller with
more labels name the same payload (FX024); a callback raised in such a
payload is written `with pure`, or shares a written `...e` with it (`fn
w(f: (Int) -> Int with ...e): Int with Fail({ k: (Int) -> Int with ...e
}) + ...e`), which works only where a caller's row equals the callee's: a
caller that adds a label must use `with pure` (FX017's equal-row rule;
BACKLOG FX028). `main` may perform only `Console`; any other left-over
label is E_EFFECT `Unhandled Database in main`, with notes naming the path
from the call that needs it (test/fx-diagnostics.test.mjs,
test/fx-services.test.mjs).

Injection. Construct each implementation as a handler value and install it
at the composition root; never select one with a flag (`if live then …`).
Program code takes effects through its row and does not check which
implementation it got; tests install fakes in a `main` of their own
(examples/services.wxw, test/fx-services-programs.mjs).

Handlers. Handlers are deep and dynamically scoped: an operation goes to
the innermost installed handler for its key at the moment it runs, and a
closure keeps no handler. A clause runs in the context of its `with`,
without that handler, so a logger's clause that logs reaches the next outer
logger. `Fail.fail(e)` unwinds to the innermost `handle` for `e`'s family in the
context where it runs; the clauses of one `handle` are frames with the
first clause innermost. A handler value is neither comparable nor
printable, nor may `crash` take it or `main` return it. A program that
emits no effect construct generates the same Go as before; otherwise every
function takes a context first (ADR 010).

Cleanup. `defer e` registers when the block reaches it. At exit, by normal
completion, typed abort or recoverable defect, the deferred expressions run
last-in first-out, once, each evaluated in full then, in the context where
it was registered. Block exits are those three; continuation discard
(FX006) and cancellation (FX002, CF001) are future exit reasons.

A `defer` must not fail. A `Fail` label in the deferred expression, or a
rigid row tail that a caller could fill with `Fail`, is E_EFFECT `defer must
not fail, but it performs Fail(E)` or `... may perform any effect of <r>`.
Consequently a deferred callback parameter must be `with pure`, and a local
lambda that is also called outside the `defer` in a non-`main` function
is rejected there (FX007 records the relaxation). Since FX008 the rule also
covers handlers: an operation performed in a `defer` must meet only
fail-free handler frames. A label written `nofail Log` in a signature
assumes the caller's Log handler cannot end an operation in a typed abort
(a clause may fail internally and handle it); a plain label promises
nothing, and `defer Log.log(1)` under a plain `Log` is E_EFFECT `defer must not
fail, but it performs Log, whose handler may fail`, with notes naming the
signature or clause responsible. `nofail(k) Log` ties the assumption to a
mark variable of the signature (usable in function signatures and their
lambdas, not in `type` or `effect` declarations); `nofail Fail(E)` is
E_TYPE; `nofail Console` means `Console`; `nofail ...e` is not supported.
Marks are erased before code generation (test/fx008-*.test.mjs; the mark
rows of scripts/regression-fx008*.mjs).

Documented limits of the mark rule. All are conservative (a safe program
may be rejected, an unsafe one never accepted): marks inside data,
constructor fields, operation signatures or a callback's parameters are not
opened at a function's use (L1 with P5, BACKLOG FX013); labels merged
through one handler value, or through a shared row tail, share a mark (L4,
FX014); mark variables are not allowed in `type` or `effect` declarations
(L6, FX015); a handler passed through a generic function and installed from
its result gives a may-fail frame when the context's rest is may-fail or
rigid (FX016). A trap: `Handler(nofail Log)` written without `with pure`
ends in the callee's rigid ambient row, so every installation of it inside
the callee is may-fail; write `Handler(nofail Log with pure)`.

Defects. A defect is a recoverable runtime panic that is not a typed
abort: `crash(value)`, the missing-handler guard, a Go runtime panic. No
handler catches one. Unwinding runs every deferred expression, then the
program writes one report to stderr and exits 1: one cause per line in
execution order, newlines escaped, the original cause first and each later
cause prefixed `cleanup failed: `. A cause reads `crash: V`, `fail(T): V`
for a typed abort (`<not printable>` for V when T holds a function or
handler), `no handler for L`, or `panic: <text>`. With no earlier cause the
first cleanup crash is the unprefixed first line.

Limits, stated plainly.
- `with pure` promises neither termination nor freedom from `crash` or other
  recoverable defects.
- Go fatal errors (stack exhaustion, out of memory) are not panics and skip
  cleanup.
- A pending typed abort reaches its `handle` only if every cleanup on the
  way completes normally. A cleanup defect makes the abort head the report
  and its `handle` never runs; a cleanup that diverges never delivers it.
- A callback parameter's written row must equal the caller's row label for
  label: `fn a(q: Int -> Int with L, x: Int): Int with L + M = q(x)` is
  rejected (FX017) with `q must allow every effect of a (L + M), but its
  row is L; write q's row as `with L + M`; a callback's row must equal its
  caller's (FX017)`, notes at both written rows. The hint writes the
  caller's row as written, so a named tail stays (`with M + L + ...e`). A
  callback with no `with` reads `but its row has no labels`, and its note
  reads `q's row is not written`. Only a
  parameter whose type is a single arrow is named; any other callee (a
  later stage of a curried type, a call result, a `let` local) reads `this
  function value`. When a label of the caller's row has a payload that
  holds a row (a function type, a handler, a row-applied type), the hint
  omits `write q's row as …`, because the printed row would drop the
  payload's row. Workaround: write the callback's row as the
  caller's full row (`q: Int -> Int with L + M`).
  Under `with` or `handle` in the function's body the row at the call also
  holds the installed labels, innermost first (FX018): `q must allow every
  effect at this call (M + L), but its row is L; write q's row as `with M +
  L`; a callback's row must equal the row where it is called (FX018)`, with
  a note `M is handled here` at each installation. Passing a function whose
  row lacks a label of the parameter's row reads `q must allow every effect
  of take's parameter f (L + M), but its row is L; write q's row as `with L
  + M`; a function passed as an argument must have its parameter's row
  (FX018)`. Both keep the old text inside a lambda body, for a row nested
  in a label's payload, and for the other direction. The `write …` part is
  left out when the row it would write does not fix the call (a constructor
  field's closed row, a caller wider than the callee), and, for a
  callback, when the callback is read more than once in the function: one
  row cannot serve a call outside and a call inside a `with`. The notes are
  bounded as all notes are (at most four besides path lines), so with three
  or more installations, or a `handle` with several clauses, some `is
  handled here` notes are dropped. A hint is checked only inside its own
  function, so applying it can expose a truthful (b) error in a caller, for
  example `fn b(p: Int -> Int with L): Int with L = a(p, 1)` after the hint
  rewrote `a`'s parameter.
- There is no mutable state, so a fake handler is stateless (fixed clock,
  canned results, a prefixing logger); recording fakes are FX003.
- `let` is monomorphic. A local of type `A -> B with pure` is not accepted
  where `A -> B with Log` is expected; `fn(x) => g(x)` is the workaround
  (eta-expansion for pure locals).
- No generic helper turns an arbitrary `Result(error, value)` into a
  failing computation: a `Fail` payload needs a concrete family (E_TYPE
  `Fail needs a concrete error family`), so helpers are per family or return
  `Result` (STD001).
- Handler types for `Console` and `Fail` are uninhabited (FX011).

Text (Text v1; ADR 011; design docs/plans/2026-10-13-text-design.md). `Text`
is a built-in ground type and a reserved type name, like `Int` and `Bool`.
Its values are immutable sequences of Unicode scalar values, stored as
UTF-8 and lowered to a Go `string`. Source files are UTF-8; invalid UTF-8
is E_SYNTAX `Invalid UTF-8 in source` at the first invalid byte (one unit,
found when the CLI reads the file). Identifiers and keywords stay ASCII, so
a non-ASCII character outside a literal is E_LEX `Unexpected character`,
spanning the whole code point. A byte order mark is such a character.

```ebnf
text     = [ hashes ], ( line | block ), [ hashes ] ;
line     = '"', { char | escape | hole }, '"' ;
block    = '"""', LF, { char | escape | hole | LF }, LF, [ indent ],
           '"""' ;
escape   = '\', [ hashes ], ( 'n' | 't' | 'r' | '"' | '\' | '$'
         | 'u', '{', hex, { hex }, '}' ) ;
hole     = "$", [ hashes ], "{", expression, "}" ;
primary  = ... | text ;
addition = atom, { ( "+" | "++" ), atom } ;
```

Ordinary literals (text-literal, text-lex). `"…"` is one line. The escapes
are `\n \t \r \" \\ \$` and `\u{H…}` with 1 to 6 hex digits naming a
Unicode scalar value; a surrogate (D800 to DFFF) or a value above 10FFFF is
E_SYNTAX `Invalid Unicode escape \u{…}`, any other `\x` is `Unknown escape
\x`, and a raw line break (LF, CRLF or a lone CR) is `Text cannot contain a
line break; use \n or a """ block`. A literal with no closing quote is
`Unterminated text literal`. Every one of these has an exact span
(test/text-lex.test.mjs, text-spans.mjs).

Interpolation (text-interpolate). `${e}` holds any expression of type Text;
other types go through `show(x)`, and a non-Text hole is the ordinary E_TYPE
`Expected Text, found <t>` at the hole's expression. Holes nest
(`"a ${f("b ${c}")} d"`). A hole ends at the `}` that balances it, counted
over tokens: braces of blocks, handlers and matches inside the hole count,
and a nested literal is one token, so braces and quotes inside it do not. A
hole reaching the end of its line (a `"""` block's holes may span lines, and
so may a hole holding a nested block) or
the end of the file is `Unterminated interpolation`. `${}` is `Expected an
expression`, `\$` is a literal `$` (so `\${` writes `${`), and a `$` not
followed by `{` is literal. Parts are evaluated left to right, each once,
with their ordinary effects (FN001's order), so `"${a()}${b()}"` performs
a's effects first. Holes share the parser's nesting budget (below).

Joining and comparison (text-concat, text-print). `a ++ b` takes Text on
both sides, is left-associative and has the precedence of `+`, so it binds
tighter than comparison and looser than application. It is not a special
case of `+`: `1 + "a"` is an ordinary type error, and `1 + 2 ++ "x"` is
`Expected Text, found Int` at `1 + 2`. `== != < <= > >=` compare Text by
Unicode code point, lexicographically, not by UTF-16 unit: U+1F600 sorts
after U+FFFD. Go's string order is bytewise, which on valid UTF-8 is exactly
code-point order, so Text fields take part in the structural order of ADR
005 unchanged.

Multiline blocks (text-block, text-block-errors). A block opens with `"""`
followed by a line break and closes with `"""` on its own line. Trailing
whitespace after the opening `"""` stays an error, because the formatter
will strip it. The closing
line's leading whitespace is the indent, removed from every content line;
it must be an exact character-for-character prefix of each non-blank line,
so a tab never stands for a space. A line indented less is `This line is
indented less than the closing """` at its leading whitespace; blank or
whitespace-only lines are exempt and become empty. The break after the
opening and the one before the closing delimiter are not text, so the text
ends with the last content line's own characters, and a blank line before
the closing delimiter adds one `\n`. CRLF in the source reads as `\n`; a
lone CR is the line-break error, spanning from the opening delimiter to the
CR, which can cross lines. Trailing spaces are kept. Other block errors are
`""" must be followed by a line break` and `The closing """ must be on its
own line`.

Raw and extended delimiters (text-raw). Wrapping a literal or block in n
`#`s, as in `#"…"#`, `##"…"##` and `#"""…"""#`, makes `\` and `${`
literal. An escape is then written `\` and n `#`s and the escape
(`\#n`, `\##u{41}`), and a hole `$` and n `#`s and `{…}` (`$#{x}`). A
quote followed by exactly n `#`s closes the literal; followed by fewer, it
is text; followed by more, it is E_SYNTAX `Expected "##, found "###` (the
expected delimiter, then the one found, at that quote and its `#`s). A
line literal that runs out of line, or a block out of file, reports its last
quote the same way (`Expected "#, found "` for `#"x"`) or, with no quote at
all, `Unterminated text literal`.

Maximal munch: `"""` always opens a block. So a one-line literal whose text
begins with `""` writes its first quote as `\"` (or `\#"` when raw): the
literal `#"\#"""x"#` is the text `"""x`, while `#"""x"#` is read as a
block opening (here an error, as no line break follows).

`show` and printing (text-print). `show(x)` is a compiler built-in like
`print`, not a type class and not reserved. It takes one printable value
(everything except functions and handlers, else `Expected a printable
value, found <t>`), is pure, and returns as Text exactly what `Console.print(x)`
writes, without the final LF. `show(t)` of a Text is `t` itself. Until
type classes exist (BACKLOG C001) its output format is fixed and cannot be
customised. A Text printed alone (`Console.print(t)`, a `main` returning
Text) is written raw; a Text nested in data is written quoted with the canonical
escaping: `\"`, `\\`, `\n`, `\t` and `\r` by name, `\$` before `{`, and
`\u{…}` in lowercase hex for the controls U+0000 to U+001F and U+007F to
U+009F (apart from the three named), U+2028, U+2029 and the bidi controls
U+202A to U+202E and U+2066 to U+2069 (Trojan Source). Every other scalar is
written as is, so invisible scalars such as U+200B print raw. The set is
fixed, independent of any Unicode table, and the quoted form is a valid
literal that reads back to the same text. `Fail(Text)` is accepted; its
runtime key is outside every other family's range (ADR 011).

Locations with non-BMP text. Offsets and columns stay UTF-16 code units
(below), so a character outside the BMP, such as U+1F600, counts as 2.
Tests pin spans after such a character. Wherever the lexer quotes a
character it takes a whole code point, so no span splits a surrogate pair.

Not in v1: length, indexing, slicing, split, join, trim and parsing (BACKLOG
STD001), Char and byte APIs, a trailing-`\` line continuation, comments,
and user `Console` handlers (`print` accepts any printable value, so a
clause has no single parameter type; the handler stays uninhabited).

Records (R001, first tranche; ADR 013; design
docs/plans/2026-10-14-records-design.md). Records are anonymous and
structural, typed by rows, in the style of PureScript: no field name
belongs to a global namespace and no function is generated per field.
Behaviour below is checked by test/r001-*.test.mjs, the reference
interpreter (test/fx-oracle-records.mjs) and the rows of
scripts/regression-r001.mjs.

```ebnf
operand    = ... | recordtype ;
recordtype = "{", rpart, { ",", rpart }, [ "," ], "}" ;
rpart      = lower, ":", type | "...", lower ;
primary    = ... | "{", lower, ":", expression,
             { ",", lower, ":", expression }, [ "," ], "}" ;
atom       = primary, { suffix } ;
suffix     = "(", [ arguments ], ")" | ".", lower
           | "{", lower, "=", expression,
             { ",", lower, "=", expression }, [ "," ], "}" ;
```

Types (r001-types). `{ name: Text, age: Int }` is a closed record type and
`{ name: Text, ...r }` an open one, whose tail `r` is a row variable of
record sort; `{ ...r }` is any record. A tail is last and single (`Row
tail must be last`, `Only one row tail is allowed`). Labels are lowercase
and unique: a repeated label in a type, literal or update is E_DUPLICATE
`Duplicate field <label>` (`Duplicate field a` for `a`) at the second,
with the note `first written here` at the first. Label order is not
significant, so `{ a: Int, b: Bool }` and `{ b: Bool, a: Int }` are one
type, and types print with sorted labels and the tail written `...r`
(`..._` when undetermined). Record types go wherever a type goes:
parameters, results, type arguments, constructor fields, other records'
fields and `main`'s result. There is no empty record in source: `{}` in a
type is E_SYNTAX `Expected a type`, and `{}` in an expression stays Unit.

Row sorts (r001-types, r001-sorts). A row variable is a record row or an
effect row, never both: `fn f(x: { a: Int, ...r }): Unit with ...r` is
E_TYPE `r is a record row, not an effect row` at the later use, with the
note `first written here` at the first (and `r is an effect row, not a
record row` the other way). A declared type's row parameter takes the sort
of its uses, through other declarations in both directions, until nothing
changes; one no use constrains stays an effect row, so existing programs
are unchanged. Two declarations passing different sorts to one parameter
are the same error at the later argument. A record tail may not name a
type parameter, and an effect's parameters are types, so `effect E(r) {
fn op(y: { ...r }): Int; }` is E_TYPE `Expected an effect row, found a
type`: effects cannot take record rows yet (BACKLOG R009).

Record-row arguments (R012, approved by the user 2026-10-15;
r012-arguments, r012-diagnostics). A declared type's record-row
parameter takes a record type argument wherever a type is written
(signatures, constructor and record fields, lambda annotations, handler
type arguments, `Fail` payloads). The argument is the parameter's row,
the tail of the records the declaration writes beside it, not the whole
payload: with `type Holder(...r) = Holder({ x: Int, ...r })`,
`Holder({ y: Bool })` holds `{ x: Int, y: Bool }`. `Holder({ y: Bool,
...s })` passes the open row with tail `s`, a record use of `s`;
`Holder(...s)` is unchanged, and `Holder({ ...s })` means the same as
`Holder(...s)`. Labels are unordered here too, so `Holder({ y: Bool, z:
Int })` and `Holder({ z: Int, y: Bool })` are one type, the form
diagnostics print (`Expected Holder({ y: Bool }), found Holder({ y: Int
})`). The argument's labels must differ from those the declaration writes
beside that parameter, directly or through the declared types it passes
the parameter to: `Holder({ x: Bool })`, and also `Holder({ x: Int })`,
is E_DUPLICATE `Duplicate field x` at the argument's `x`, with the note
`first written here` at the declaration's `x` (for `type Pair(...r) =
Pair(Holder(...r))`, `Pair({ x: Bool })` notes Holder's `x`). An open
argument's tail lacks those labels, as a signature's does: in
`Pair({ y: Bool, ...s })`, `s` lacks `x` and `y`. A type that is not a
record is E_TYPE `Expected a record, found Int` at the argument, and an
effect label or labelled row (`Holder(Console)`, `Holder(Log + ...s)`) is
E_TYPE `Expected a type, found an effect row`. An effect row parameter is
unchanged: a record type there is `Expected an effect row, found a type`.
A labelled record argument gives an otherwise unconstrained parameter no
sort, so it stays an effect row: `type Q(...q) = Q(Int); type P = P(Q({
a: Int }))` is `Expected an effect row, found a type`. Inside a recursive
group of declarations a record argument must be a bare `...r` or mention
no variable, as a type argument must be a bare variable or ground, so a
row cannot grow through recursion: `type T(...r) = End({ ...r }) |
More(T({ a: { ...r } }))` is E_SPECIALIZATION `Recursive use of T changes
its type arguments` at `T({ a: { ...r } })`, and a reference inside a
record argument's fields is judged as any other.

Literals, access and update (r001-parse, r001-expressions). `{ name:
"Ada", age: 36 }` has the closed type of its fields. In expression
position `{` followed by a lowercase name and `:` begins a literal; `{ x
}` stays a block (there is no punning). `e.name` reads a field of any
receiver but an uppercase name, which stays an effect qualifier (`Log.log`):
locals, calls, parentheses and other accesses (`r.a.b`, `f(x).a`). The `.`
touches both the receiver and the label; a spaced `.` is the existing
syntax error at the `.`. `e { name = n, age = a }` copies `e` with those
fields replaced; it never adds a field or changes a field's type (`p {
age = "x" }` is `Expected Int, found Text` at `"x"`). Calls, accesses and
updates are postfix at one level, left to right, and bind tighter than
`|>`, `+` and comparisons: `f(x) { name = n }.name` is `((f(x)) { name =
n }).name`. An update needs `name =`, so `match r { a = 1 } { … }` updates
its scrutinee and a match arm `a => …` is unchanged. Reading a field the
record cannot have is E_TYPE `age is not a field of { name: Text }` at the
label (also through an open type: `age is not a field of { name: Text,
...r }`), and an access or update on anything else is E_TYPE `Expected a
record, found Int` at the receiver.

Evaluation. A literal evaluates each field once, in written order; an
update evaluates its base once, then each replacement once, in written
order; an access evaluates its receiver once. `{ b: say("b"), a: say("a")
}` performs b's effects first, though the value is laid out sorted.

Row polymorphism (r001-unify). A function over `{ name: Text, ...r }`
accepts any record with a Text `name` and returns the rest unchanged:
`fn older(p: { age: Int, ...r }): { age: Int, ...r } = p { age = p.age +
1 }` gives back every other field. A signature's row variable is rigid in
its own body, like a type variable: it can be read through but never
extended, so a function cannot read a field its type does not name. Each
tail lacks the labels written beside it, and the checker enforces it at
every use: `{ a: Int, ...r }` can never have `r` hold `a`, so passing a
record through `fn k(y: { ...r }): { a: Int, ...r }` where `r` would have
to hold `a` is a shape mismatch. A type written in a body (a lambda's
parameter annotation, a `with handler` label's arguments, a `handle`
clause's payload) is held to the same sets: under `fn g(p: { ...r })`,
`fn(q: { a: Int, ...r }) => q` is E_TYPE `r may already have field a`
(approved 2026-10-15) at `a`, with the note `r is introduced here` at the
signature's first `...r`; through a declared type, `fn(h: Holder(...r))`
with `type Holder(...r) = Holder({ x: Int, ...r })`, it is `r may already
have field x` at that `...r` (r001-body-types). Writing the label in the
signature, `p: { a: Int, ...r }`, makes the annotation valid. Lacks
constraints cannot be written yet (BACKLOG R005). Two open rows that meet
share one remainder, so what one use fixes the other sees. Mismatches use
the existing texts: `Expected { a: Int, b: Bool }, found { a: Int }` for
shapes and `Expected Int, found Text` for fields. Fields cannot be
polymorphic (R006).

Comparison and printing (r001-compare, r001-go). `== != < <= > >=` compare
records field by field in sorted label order, the first difference
deciding, so `{ name: "Ada", age: 36 } < { name: "Bo", age: 1 }` is false.
A record is comparable when every field type is, and a record tail is a
variable for groundness: comparing a `{ name: Text, ...r }` inside generic
code is E_TYPE `Type { name: Text, ...r } is not comparable` at the left
operand; a call site that compares a known record is fine. A record prints
as `{ age: 36, name: "Ada" }`, labels sorted, each field in nested form (a
Text quoted). A record is printable when every field is; generic code may
print an open record, and the type is checked at each instantiation.

Printability at the ground type (r001-printable, BACKLOG E017).
`show`, `Console.print` and `crash` are checked again after specialization
at their argument's ground type, so `fn p(item: a): Text = show(item)`
reached with a function, a `Handler(Log)`, or a type holding one (also in
a record tail) is E_TYPE `Expected a printable value, found Int -> Int` at
the print site, never a failed `go build`.

Failure payloads (r001-fail). A record can be a `Fail` payload. Its family
is its label set: `Fail({ code: Int })` and `Fail({ code: Text })` are one
family, so their field types must agree (a mismatch is the existing
`Expected X, found Y`, oriented by which use is expected, e.g. `Expected
Int, found Text`);
`Fail({ code: Int })` and `Fail({ msg: Text })` are two, and each `handle`
clause catches its own; reordered shapes are one family. A payload whose
labels are unknown when the function is checked, such as `Fail({ code:
Int, ...r })` in a signature or clause, is the existing E_TYPE `Fail needs
a concrete error family`. Label sets have runtime keys of their own,
outside every other family's range (ADR 013).

Representation. Each distinct record type of the specialized program is
one Go value struct with its fields in sorted label order; a function over
an open record gets one Go copy per concrete row it is used with, and
reordered rows share it. A field of declared type is stored through a
pointer, as a constructor field is, so `type Node = End | Node({ child:
Node })` is legal. Field access through a nil pointer, which only foreign
code can produce, is a Go nil dereference rather than the `waxwing:
malformed value` panic that comparison and printing give.

Not in this tranche: record patterns (BACKLOG R004), extension, merge and
removal with written lacks constraints (R005), polymorphic fields (R006),
punning (R007), type aliases (R008) and record-row parameters of effects
(R009).

Nesting. One declaration body may nest at most 128 levels (ADR 006,
Format.Parse.Grammar `nestingLimit`). A level is a parenthesized expression,
an `if` condition or branch, a `match` scrutinee or arm body, a call or
constructor argument, a constructor-pattern field, a `+`, `|>` or
comparison operand, a `++` operand (it counts like `+`), an interpolation
hole's expression, or (FN001) a lambda body or the parameter side of an
arrow; a postfix application chain nests its callee once (ADR 006,
fn-depth), and so does each record access or update (R001), while a record
type's field type and a literal's or update's field value are one level
each (128 accesses in a chain parse, the 129th is E_NESTING). Only one
root-to-leaf path counts; siblings and later declarations do not add up,
and every function body starts at 0. Operators count the
depth of the tree they build: `a + b + c` is `(a + b) + c`, so a flat sum
of n operands counts n - 1 levels (129 operands compile, 130 do not), and
a deep left operand counts in full. Deeper input is E_NESTING `Nesting
exceeds 128 levels` at the token that would exceed the limit, never a stack
overflow (test/depth.test.mjs, through the CLI, for each form at 128 and
129). A flat sum without that bound is Proposed (BACKLOG O001). Interpolation
holes share this budget: a hole's expression is one level (a literal inside
a hole nests further), and the lexer allows at most 128 holes open at once,
reporting E_NESTING at the 129th `${` (two units). A literal has no
nesting of its own, so 10,000 holes side by side in one literal compile; a
flat `++` chain is bounded like `+` (129 operands compile, 130 do not;
text-concat, text-interpolate).

Locations are half-open UTF-16 code-unit offsets, zero based; line/column one
based; LF increments line and resets column. Parenthesized expressions keep
the inner span. A diagnostic reports the first error in phase/traversal order.
E_INTERNAL is a compiler invariant failure. Codes are a closed ADT: E_LEX,
E_SYNTAX, E_INTEGER, E_ENTRY, E_DUPLICATE, E_UNBOUND, E_NOT_CALLABLE, E_TYPE,
E_ARITY, E_REDUNDANT, E_NON_EXHAUSTIVE, E_NESTING, E_SPECIALIZATION,
E_EFFECT, E_HANDLER, E_INTERNAL. The CLI adds
E_USAGE, E_IO and E_TOOL.
