# ADR 012: Effect operation namespaces

Implemented on branch `fx020` 2026-10-13 and 2026-10-14 (plan Tasks 1-8,
with the controller-added Task 2b and Task 5 split into 5a and 5b); not
merged. Binding spec: docs/plans/2026-10-13-effect-namespaces-design.md,
with its plan-time amendments; plan
docs/plans/2026-10-13-effect-namespaces-plan.md; evidence docs/progress.md
("FX020"). Builds on ADR 010 (effects) and ADR 011 (Text). One wording is
still pending the user's review (see "The unbound-name hint").

## Context

Operation names shared one global namespace with functions, and collisions
resolved silently and wrongly (reproduced on main 2026-10-13). With
`effect Audit { fn log(n: Int): Unit; }` and `effect Log { fn log(n: Int):
Unit; }` both declared, every `log(…)` meant `Audit.log`, so a function
`with Log` calling `log(1)` was rejected as performing Audit, and `Log.log`
was unreachable. With `effect Log { fn log … }` and `fn log(n: Int): Int`
both declared, every `log(…)` called the function. The user rejected a
uniqueness rule across effects: independent services must be able to reuse
natural names such as `get`, `log` and `query`. Adding an effect elsewhere
must never break existing code.

## Decision

### Operations are always qualified

An operation is called, or referenced as a value, as `Effect.op`, for
example `Database.query(id)`, `Console.print(x)`, `Fail.fail(e)`. A bare
operation name is never in scope by default. A qualified name resolves by
declaration, never by the function's row: `Database.query` in a function
whose row lacks Database resolves, and effect checking then rejects it with
today's E_EFFECT (`f performs Database, which its signature does not
allow`). Resolution never depends on inferred rows, which keeps INF001
unblocked. `.` is a token; only an uppercase name followed by `.` is a
qualifier (Format.Parse.Name `upperNamed`) whose `.` touches both names
(R19: `Log . log(1)` and `Log\n.log(1)` are a plain `Log` followed by a stray
`.`, `Expected ';'`; Grammar `ifQualifier`, no parser stack cost: depth probe
259 / 296 / 396 / 326 before and after), so `x.y` on a lowercase value is
not read as one and R001's `r.field` can reuse `.`. `1.5` stays E_LEX.

An unknown qualifier or member uses existing texts only: `Nope.log(1)` is
`Unbound function Nope.log` (E_UNBOUND, the whole written name; `Unbound
local Nope.log` without a call), and `Log.nope(1)` is E_HANDLER `nope is not
an operation of Log`, at the whole qualified expression. A nullary operation
used without its call is E_ARITY `Expected Clock.now()`; an operation
with parameters used as a value is an ordinary function value.

### Aliases and imports, only in a function's own row

The final stage's row of a function declaration, `FunctionDecl.row`, may
carry `Effect[(args)] [as Alias] [{ op [as name], … }]` (a trailing comma is
allowed), after `nofail`/`nofail(k)`, so `nofail Log { log }` combines.
`with Database as D + Log { log, info as note }` makes `D` a second name for
`Database` (the canonical name stays valid) and binds `log` and `note` for
that function's body. Placement is refused by the parser, not a walker: an
arrow row in any type (parameter types, lambda annotations, result arrows,
constructor fields), a handler type, a row argument and an effect
operation's signature all give the placement error (Format.Parse.Chain
`combined`, Parse.Effect, Parse.HandlerType). A staged function whose result
is an arrow (`fn f(): A -> B with Log as L`) has its row on the arrow, so it
gets the placement error. Lambdas inherit the enclosing function's aliases
and imports; they cannot declare their own. Handlers are unchanged: clause
heads (`handler Log { log(n) => … }`, `fail(error: E) => …`) name the
handled effect's own operations.

`Fail(Error) { fail }` binds `fail` to that family: `fail(x)` requires `x :
Error`, and `Fail(E1) { fail as f1 } + Fail(E2) { fail as f2 }` checks each
payload against its own family. Resolution carries the family on the node
(R12), so an imported `fail(x)` is the same `Resolved.Fail` as `Fail.fail(x)`
with an optional family annotation the checker unifies with the payload; its
diagnostics and Go equal the qualified twin's.

### Lexical order, no fallback

A bare name resolves, innermost first, in the order binders (pattern, `let`,
lambda parameter), function parameters, imports, then global functions and
constructors (Features.Resolve.Name; Scope holds only data). The first match
wins. A wrong-typed binder is an ordinary type error at the use (`Expected a
function, found Int`), never a fall-through to an outer binding of the same
name. Hints never choose a binding.

### `fail` is not a keyword

The parser's own `fail(e)` form (`Syntax.Fail`) is gone. `Fail.fail(e)` and
an imported `fail(e)` are ordinary operation calls resolving to
`Resolved.Fail`, spanning the name through the payload as before. `Fail.fail`
or an imported `fail` as a value is an eta lambda `fn(e) => Fail.fail(e)`
over a fresh binder, every part at the reference's span
(Qualified.failReference); an import annotates the binder with its family.
Applying it behaves exactly as a call, because its body is a `Fail` node:
keying by the payload's head, `FailNeedsConcrete` and Go lowering are the
existing paths, and no Checked or IR constructor was added. A lambda is
monomorphic, so one bound reference has one family, while each written
reference gets its own. The `handle` clause head `fail(error: E) =>` stays.

### Console and Fail are built-in declarations

They were names hard-coded in row resolution, with no declaration. A table
in Features.Resolve.Builtin (`builtinEffects`: Console with `print`, Fail
with `fail`) is searched like a declared effect's operations by qualified
names, imports and rows (Row.lookupEffect), so `Console.print`, `Console {
print }` and `Fail.fail` follow the user rules. They are not `EffectId`
declarations and do not enter `program.effects`, so runtime keys are
unchanged (Fail keyed by payload head). `print` ranges over every printable
type, so it cannot be written as an ordinary declaration until type classes
(C001): it, like `show`, stays compiler-provided, a temporary gap and not a
design choice. `crash` stays a plain global function. A user `effect Console`
or `effect Fail` gives the existing E_DUPLICATE `Duplicate effect Console`
(R1), at the whole later declaration with no note (R2: nothing to point at).

### Static rules and exact texts

All approved by the user on 2026-10-13.
- Two imports bind one local name, compared after renaming (`{ log as note,
  info as note }`): E_SYNTAX `note is imported twice in this signature`, at
  the second name, with the note `first imported here`.
- An alias equal to any declared effect name, in the row or not, or to an
  earlier alias in the row: E_SYNTAX `Log is already an effect name`, at the
  alias, with the note `declared here` (user effect) or `first bound here`
  (earlier alias); no note for Console and Fail.
- Alias or import syntax in any other written row: E_SYNTAX `Imports and
  aliases are allowed only in a function's own row`, at the alias name, else
  the `{`.
- An import naming a non-operation: the existing E_HANDLER `nope is not an
  operation of Log`, without a note. Errors are raised in source order
  across aliases and imports, one label at a time, a label's alias before its
  imports (R19: `{ log as note, info as note } + Database as Log` reports the
  duplicate import, not the later `Log` collision).

Notes on E_SYNTAX problems now render (`Format.Diagnostic` `noted`), with
new note reasons `EffectDeclaredHere`, `FirstImportedHere` and
`FirstBoundHere`; the existing `DeclaredHere` renders "X is declared here",
not the approved bare text.

### The unbound-name hint

A bare operation name with no binding keeps its error and code (E_UNBOUND,
`Unbound function log`, or `Unbound local log` as a value; a bare nullary
`now` as a value is now this error, not E_ARITY `Expected now()`), gaining a
hint that only lists fixes (Features.Resolve.Unbound,
Format.Diagnostic.Qualify):
- one effect declares the name (approved): `Unbound function log; use
  Log.log, or import it with Log { log }`;
- several (R18, **pending the user's approval or rewording**, pinned in
  test/fx020-unbound.test.mjs, for a program declaring Audit before Log):
  `Unbound function log; use Audit.log or Log.log, or import one with
  Audit { log } or Log { log }`; three or
  more: `A.log, B.log or C.log` and `A { log }, B { log } or C { log }`;
- candidates are built-in effects declaring the name first, then user effects
  in declaration order; the hint is not narrowed by the function's row
  (resolution never depends on rows), and it offers the import form even
  inside lambdas (the import goes on the enclosing function's row);
- no effect declares the name: no hint. For a parameterised effect the hint
  omits the arguments (`Box { put }`), so for `Fail` it writes `Fail { fail
  }`, which is not valid syntax as written (`Fail(E) { fail }` is).

### Duplicated labels in a row bind the reachable one (R11)

A row matches the first occurrence of a label's key, and a user effect's key
is the effect alone. In `State(Int) + State(Bool)` the second label is
unreachable by any perform, qualified or imported, so an import from it binds
the label a perform reaches, as `State.get()` does: `State(Int) { get } +
State(Bool) { get as g2 }` makes `g2()` E_TYPE `Expected Bool, found Int`.
This is sound, and silently surprising; a diagnostic needs new text, so it is
BACKLOG FX021 (tests pin today's behaviour).

## Consequences and limits

- Go output is unchanged: the seven bootstrap/*.go snapshots are
  byte-identical, and the migration (about 920 automatic edits, the sum of
  the Task 6 report's chunk figures, plus manual ones across the examples,
  101 fixtures and the test programs) was proved
  by a paired differential of 6,930 original/migrated program pairs with
  equal Go. One message changed
  (R15): the bare `now` value error echoed the written name,
  `Expected now()`, and now reads `Expected Clock.now()` for the qualified
  form. The one-off migration tool and paired run were removed in Task 7
  (R4); git keeps them.
- INF001 must provide a way to alias or import without writing the whole
  inferred row, because imports exist only at a written function row.
- Records (R001) keep `r.field` on lowercase receivers; modules (M001) will
  qualify effects themselves, leaving signature imports as the local form.
- Lexing: `.` after an integer is still E_LEX; a lone `.` elsewhere is a
  token, so a few malformed sources change error (parse-only differences in
  the differential, R8). Parser depth: the constructor-argument stack margin
  is 259 against the twice-limit bound 256 (G002).
- An imported `fail` as a value, and a family-annotated one, lower through a
  lambda, so their Go differs from a qualified call's for new sources only.
- `print` and `show` stay compiler-provided until C001.

## Alternatives considered

- **Unique operation names across effects.** Rejected by the user: it
  forbids reusing `get`, `log`, `query` across independent services.
- **Bare names with an ambiguity error, or a type- or row-directed
  fallback.** Rejected: adding an effect elsewhere could break working code,
  and resolution would depend on inferred rows (INF001). Hints never choose.
- **Imports and aliases in any written row.** Rejected: one row, one body,
  one scope; a function's bindings are all visible on its signature line.
- **A dedicated Fail reference node through Checked and IR.** Rejected for
  the eta lambda (R7): it duplicated Fail keying in four layers.
- **Declaring Console and Fail as ordinary effects with `EffectId`s.**
  Rejected: runtime keys would move and `print` cannot be typed until C001.
- **Migrating to imports rather than qualified names.** Rejected: the rewrite
  produces qualified names only, so the result is reviewable.

Evidence and gates are in docs/progress.md ("FX020"). Isolated-copy
regression rows: `fx020-first-declaration`, `fx020-function-wins`,
`fx020-row-dependent` (scripts/regression-fx020.mjs). Tests:
test/fx020-qualified, -imports, -imports-review, -builtins, -fail-ref,
-unbound and -oracle (reference interpreter and generator for qualified
names, imports and aliases).
