# Effect operation namespaces: design (FX020)

Status: the user approved this design in conversation on 2026-10-13,
together with review refinements. The written spec is awaiting the user's
review. No plan exists yet and nothing is implemented. Sequencing: after
Text v1, because both rework the parser, and before Records (R001),
because `r.field` must coexist with `Effect.op`.

## Problem

Operation names currently share one global namespace with functions, and
collisions resolve silently and wrongly. Both cases below were reproduced
on main on 2026-10-13:

- **Two effects declaring the same operation.**
  - `effect Audit { fn log(n: Int): Unit; }` together with `effect Log
    { fn log(n: Int): Unit; }` is accepted.
  - Every `log(…)` then means `Audit.log`, so a function `with Log` that
    calls `log(1)` is rejected with "work performs Audit, which its
    signature does not allow".
  - `Log.log` is unreachable.
- **An operation and a function sharing a name.** If both
  `effect Log { fn log(n: Int): Unit; }` and `fn log(n: Int): Int` are
  declared, every `log(…)` calls the function. The operation is
  unreachable, and a call inside `with Log` reports `Expected Unit, found
  Int`.

Declaration uniqueness across effects is rejected by the user: independent
services must be able to reuse natural names such as `get`, `log` and
`query`.

## User decisions (2026-10-13)

1. **Always qualified.** Every effect operation is called as `Effect.op`.
   A bare operation name is never in scope by default. Rationale: adding
   an effect elsewhere can never break existing code, because there is no
   ambiguity rule to trip.
2. **Aliases at the dependency declaration.** A signature may alias an
   effect and import selected operations bare, using braces:
   `with Database as D + Log { log, info as note }`.
3. **Built-ins follow the same rule.** It is `Console.print` and
   `Fail.fail`, and `with Console { print }` gives the short form.
   Built-ins get no special syntax or naming rules anywhere. Like
   PureScript/Haskell, built-ins should be ordinary declarations wherever
   possible.
4. **Scoping is lexical, and explicit wins.**
   - Imports act like bindings at the top of the body, and shadow global
     functions.
   - Parameters and `let` shadow imports. Lambdas inherit them.
5. **Review refinements**, all accepted:
   - an alias leaves the canonical name valid;
   - qualified lookup does not depend on the row;
   - a parameterized import binds its arguments;
   - duplicates compare resulting names;
   - shadowing has no type-directed fallback;
   - hints never choose a binding.

## 1. Surface

**Qualified operation call.** `Effect.op(args)`, for example
`Database.query(id)`, `Console.print(x)` or `Fail.fail(NotFound(3))`.
- `Effect` is the declared effect name (uppercase), or an alias in scope.
- It parses as a qualified name before application. Waxwing values are
  lowercase, and record fields (R001, later) are accessed on lowercase
  values (`r.name`), so case alone distinguishes the two.
- For a parameterized effect, the arguments are inferred: `S.get()`, or
  `Fail.fail(e)`, whose family comes from the head of `e`'s type, exactly
  as `fail(e)` does today.

**Operation references.** A qualified operation is also a value. For
example, `Database.query` can be passed as an argument without being
called, as in `map(Database.query, ids)`, exactly as a bare operation
reference (the compiler's existing `OperationRef`) works today. An
imported bare name is a reference in the same way: with
`Fail(Error) { fail }`, `fail` may be passed as a value of the family's
operation type.

**Signature aliases and imports.** These are allowed only in a function
declaration's own row: the `with` of its final stage. They are scoped to
that function's body. Alias or import syntax in any other written row is
an error (§3). Other written rows include:
- a parameter's type;
- a handler type;
- a lambda parameter's annotation;
- an effect operation's signature.

The rule is that one row, one body, one scope. A function's bindings are
therefore all visible in its signature line. The forms, in order:

```
[nofail | nofail(k)] Effect[(args)] [as Alias] [{ op [as name], … }]
```

- **Alias.** `Database as D` makes `D` a local alias of the effect.
  `Database.query` remains valid alongside `D.query`, and the alias never
  hides the canonical name.
- **Imports.** `Log { log, info as note }` binds the bare local names
  `log` and `note` to `Log.log` and `Log.info` for the function body.
- **Imports through parameterized effects.**
  `Fail(Error) { fail }` binds `fail` to the operation of that specific
  family, so `fail(x)` requires `x : Error`. `Fail(E1) { fail as fail1 }`
  together with `Fail(E2) { fail as fail2 }` imports two families under
  two names.
- **Marks combine.** For example `nofail Log { log }`.
- **Trailing commas.** A trailing comma inside the braces is allowed,
  consistent with G005.

**Handlers are unchanged.** In `handler Log { log(n) => … }` and
`handle e { fail(error: E) => … }`, clause heads name the handled
effect's own operations. Clause bodies follow the ordinary rules, so a
body that performs `Log` writes `Log.log` or uses an import of the
enclosing function.

## 2. Resolution rules

- **Qualified names resolve by declaration, never by row.**
  `Database.query` resolves to the declared operation whether or not
  `Database` is written in the signature. Effect checking then decides
  whether performing it is allowed, with the existing diagnostics.
  Resolution therefore never depends on inferred rows (INF001).
- **Bare names resolve lexically, innermost first.**
  1. Pattern binders, `let` bindings and lambda parameters.
  2. Function parameters.
  3. The signature's imports.
  4. Global functions and constructors.

  The first match wins, with no fallback. If the inner binding has the
  wrong type, the result is an ordinary type error at the use. It never
  silently falls through to an outer binding of the same name.
- **Lambdas inherit** the enclosing function's aliases and imports.
  Lambdas cannot declare their own, because only a function declaration's
  own row may (§1).
- **Hints never choose a binding.** A bare name with no binding is the
  existing unbound-name error, and the hint (below) only lists fixes.

## 3. Static rules (errors)

The texts below are approved by the user. The two that were marked
*pending* were approved on 2026-10-13. The duplicate-binding errors are
E_SYNTAX at the offending name, each with a note at the first binding.

- Two imports in one signature bind the same local name, compared after
  renaming, so `{ log as note, info as note }` conflicts: `note is imported
  twice in this signature`, with the note `first imported here`.
- An alias equals any declared effect name, whether or not that effect is
  in the row, or equals an earlier alias in the same row. For example,
  `with Database as Log` is rejected even when `Log` is absent from the
  row, because otherwise `Log.query` would mean Database and contradict
  canonical lookup.
  - Text (approved 2026-10-13; this broadens the earlier "… in this row"):
    `Log is already an effect name`.
  - Note: `declared here` at the effect declaration, or `first bound
    here` at the earlier alias.
- Alias or import syntax in any row other than a function declaration's
  own row (E_SYNTAX at the alias or the opening brace):
  - Text (approved 2026-10-13): `Imports and aliases are allowed only in a
    function's own row`.
- An import names something the effect does not declare: the existing
  E_HANDLER `x is not an operation of Log`. It has no first-binding
  note.

**Unbound bare operation names.** These keep the existing unbound-name
error and code, with a hint attached in the existing hint form:
`; use Log.log, or import it with Log { log }`.
- With several effects declaring the name, the hint lists each candidate
  in declaration order: `; use Audit.log or Log.log, or import one with
  … { log }`.
- Candidates are only names actually available at that location.
- The exact hint text for several candidates is pinned when implemented.
  Any wording beyond the pattern above returns to the user.

## 4. Built-ins and the prelude

- `print` is `Console.print` and `fail` is `Fail.fail`, with no
  exceptions.
- `crash` and `show` are not operations. They are global functions with
  ordinary names.
  - `crash` is compiler-provided because it is a defect primitive.
  - `show` is compiler-provided only until type classes (C001), and then
    becomes an ordinary class method.
  - This is a recorded temporary gap, not a design choice.
- A user effect named `Console` or `Fail` collides with the built-in
  declaration under the same rules as any duplicate declaration (existing
  `E_RESOLVE`-family error).

## 5. Interaction with other work

- **INF001.** Inferred rows have no declaration site, so INF001 must
  provide a way to alias or import without writing the whole row. This
  is a requirement recorded on INF001, not solved here.
- **Records (R001).** `Effect.op` is uppercase-qualified and `r.field` is
  lowercase-receiver access. R001's design must keep that distinction.
- **Modules (M001).** Later, modules qualify effects themselves
  (`Billing.Log.log`), with imports at module level. This design's
  signature imports remain as the local form.
- **FX017/FX018 diagnostics.** These are unaffected: they speak about
  rows, not names.

## 6. Migration

Every existing program uses bare operation names: examples, hundreds of
test programs, the reference interpreter's corpus and the generator.

- A one-off mechanical rewrite script migrates all of them in one change.
  It rewrites each bare operation call and each bare operation reference
  to its qualified form, and never to an import, so the result is
  reviewable.
  - It rewrites only names that resolve to operations today. A local or
    parameter that shadows an operation name is left alone, so shadowing
    is preserved.
  - Handler clause heads (`handler Log { log(n) => … }`, `fail(error: E)
    => …`) are not rewritten.
- The reference interpreter's parser and the generator are updated in the
  same change.
- There is no deprecation period before 1.0.
- The generated Go must be unchanged:
  - the six `bootstrap/*.go` snapshots, plus Text's `bootstrap/text.go`
    once Text lands, stay byte-identical;
  - the differential shows zero Go differences on the migrated corpus.
  This is name resolution only.

## 7. Acceptance and evidence

- **Exact-text tests** for each §3 error and hint, with spans and notes.
- **Shadowing:**
  - a parameter, a `let` and a lambda parameter each shadowing an import;
  - an import shadowing a global function;
  - a wrong-typed inner binding giving a type error, never a fallback.
- **Collisions:**
  - renamed-import collisions (`{ log as note, info as note }`);
  - an alias colliding with a canonical name and with a previous alias.
- **Qualified calls with omitted dependencies.** `Database.query` in a
  function whose row lacks Database resolves, then fails effect checking
  with the existing diagnostic.
- **Multiple Fail families.** `Fail(E1) { fail as f1 } + Fail(E2) { fail
  as f2 }` checks each payload against its own family, and
  `Fail.fail(e)` infers the family from `e`.
- **Operation references.** A higher-order use, `map(Database.query,
  ids)`. A reference to an imported `Fail(Error) { fail }` passed as a
  value.
- **Placement errors.** Import or alias syntax in a parameter type, a
  handler type and a lambda annotation each gives the placement error. An
  alias equal to a declared effect absent from the row gives the
  collision error.
- **Regression rows** for the two collision bugs in "Problem": the
  defects restored in isolated copies must be caught.
- **Gates.** Go output is unchanged (snapshots and differential), and
  `npm run verify` exits 0 under the usual rules.
- **Documentation.**
  - docs/language.md (Effects): qualified calls and imports.
  - README samples migrated.
  - An ADR, numbered after Text's ADR 011.
  - BACKLOG: FX020 done, with the INF001 note.

## Plan-time amendments (2026-10-13)

A survey of the compiler while writing the plan found four facts the
design did not state. Each one is recorded here, and none adds
user-facing text.

1. **`fail` is a keyword today.** The parser recognises `fail(e)` as its
   own expression form (Syntax.Fail) before ordinary names. Under this
   design, `fail` stops being syntax: `Fail.fail(e)`, or an imported
   `fail`, is an ordinary operation call whose family comes from `e`. The
   `handle` clause head `fail(error: E) =>` is a clause head naming the
   handled effect's operation, and it stays. This removes a special form,
   in line with the principle that built-ins get no special syntax.
2. **Console and Fail are not declared effects.** They are names
   hard-coded in row resolution, with no declaration and no operation
   table. FX020 gives them a built-in declaration table, resolved like
   user effects, so that `Console.print`, `Fail.fail`, imports and the
   collision rule (§4) work uniformly.
   - `print` accepts any printable type, so it cannot be written as an
     ordinary Waxwing declaration until type classes exist (C001).
   - Like `show`, it stays compiler-provided. This is a recorded
     temporary gap, not a design choice.
3. **Migration is large.** About 818 call sites exist across 170 test
   files, plus 118 `.wxw` fixtures, and many tests pin exact columns
   that a qualifier shifts. The migration therefore runs in reviewable
   stages:
   1. qualified names and imports are added while bare operation names
      still resolve;
   2. the corpus is migrated in chunks;
   3. bare operation resolution and the `fail` keyword are removed,
      together with the unbound-name hint.

   Verify passes after every stage.
4. **Pinned spans.** When a migrated test pins a span that the qualifier
   shifts, the new span is the old one moved by exactly the inserted
   characters. Each such update is mechanical and is checked in review.
   The rewrite tool locates operation names from the compiler's own
   resolved output, never from a regular expression, so a local that
   shadows an operation name is never rewritten.
