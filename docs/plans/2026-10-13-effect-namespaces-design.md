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

**Signature aliases and imports.** These are allowed in any written row:
the final `with` of a function signature, and rows inside parameter types
and handler types where a row is written. The forms, in order:

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
- **Lambdas inherit** the enclosing function's imports. A lambda's own
  written rows, in its parameter types, do not import.
- **Hints never choose a binding.** A bare name with no binding is the
  existing unbound-name error, and the hint (below) only lists fixes.

## 3. Static rules (errors)

All of these are E_SYNTAX at the offending name, each with a note at the
first binding. The texts are approved, with the user's refinements.

- Two imports in one signature bind the same local name, compared after
  renaming, so `{ log as note, info as note }` conflicts: `note is imported
  twice in this signature`, with the note `first imported here`.
- An alias equals an effect name in the row, or an earlier alias: `D is
  already an effect name in this row`, with the note `first bound here`.
- An import names something the effect does not declare: the existing
  E_HANDLER `x is not an operation of Log`.

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
  It rewrites each bare operation call to its qualified form, and never
  to an import, so the result is reviewable.
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
- **Regression rows** for the two collision bugs in "Problem": the
  defects restored in isolated copies must be caught.
- **Gates.** Go output is unchanged (snapshots and differential), and
  `npm run verify` exits 0 under the usual rules.
- **Documentation.**
  - docs/language.md (Effects): qualified calls and imports.
  - README samples migrated.
  - An ADR, numbered after Text's ADR 011.
  - BACKLOG: FX020 done, with the INF001 note.
