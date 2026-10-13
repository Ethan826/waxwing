# FX020 Effect Operation Namespaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every effect operation lives in its effect's namespace. Calls
are qualified (`Log.log`, `Console.print`, `Fail.fail`). A function's
own `with` row may alias effects and import operations. The two silent
misbindings are fixed.

**Architecture:** Lexing gains `.`, and syntax gains qualified names.
Signature labels gain `as` and `{ … }`. Resolution gets a layered
lexical scope (binders, parameters, imports, globals) plus per-effect
operation tables, including built-in Console and Fail tables. The
change is staged so that verify passes after every task:
1. Add qualified names and imports while bare operation names still
   resolve.
2. Migrate every program in the repository with a rewrite tool that
   reads the compiler's own resolution.
3. Remove bare operation resolution and the `fail` keyword.

Go output does not change at any stage.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Spec:** docs/plans/2026-10-13-effect-namespaces-design.md, including
its plan-time amendments.

## Global Constraints

- AGENTS.md governs:
  - files at most 250 lines;
  - 80 columns everywhere (scripts/width.mjs for non-PureScript);
  - `where`, never `let … in`; no lambdas;
  - layer and IR allowlists;
  - error codes as an ADT.
- **Approved texts only** (spec §3):
  - `note is imported twice in this signature`, with the note `first
    imported here`.
  - `Log is already an effect name`, with the note `declared here` or
    `first bound here`.
  - `Imports and aliases are allowed only in a function's own row`.
  - The existing E_HANDLER `x is not an operation of Log`.
  - The unbound-name error keeps its text, and gains the hint `; use
    Log.log, or import it with Log { log }`. The multi-candidate hint
    wording comes back to the user before it is pinned.
  - Any other user-facing text is a stop: report it.
- **Resolution never depends on rows.** Qualified names resolve by
  declaration. Bare names resolve lexically in this order: binders,
  parameters, imports, globals. There is no type-directed fallback.
- **Go output is unchanged throughout.** The seven bootstrap/*.go
  snapshots stay byte-identical. The differential pairs each original
  program with its migrated twin, and their Go must be equal.
- **Built-ins:** the user's principle is that built-ins get no special
  syntax.
  - `print` and `show` stay compiler-provided only because they range
    over every printable type, a temporary gap until C001.
  - `crash` stays a plain global function.
- **Every task:**
  - behavioural tests seen failing first;
  - `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` exits 0;
  - the differential against the task's base;
  - record any timing failure in T007, with figures only;
  - no bare `git stash`;
  - delete .build/regression afterwards.

## Review Focus

1. **Shadowing.** A `let`, parameter or lambda binder named like an
   imported operation must win. A wrong-typed binder gives a type error,
   never a fallback to the import. Task 3.
2. **A qualified call whose effect is not in the row**, e.g.
   `Database.query` in a function `with Log`. It resolves by
   declaration, then effect checking rejects it with today's
   diagnostic. Tasks 2 and 3.
3. **Rewrite fidelity.** The migration tool must not rewrite:
   - a local that shadows an operation name;
   - handler clause heads;
   - names inside text literals and holes that are not operation calls
     (`"${log}"` where `log` is a local).

   It must rewrite references as well as calls. Task 5.
4. **Parameterised imports.** `Fail(E1) { fail as f1 } + Fail(E2) {
   fail as f2 }` checks each payload against its own family, and
   `Fail.fail(e)` infers the family from `e`. Task 3.
5. **`.` in the lexer.** `...` must still lex as one token. A stray `.`
   elsewhere (`1.5`, `x.y` on a lowercase value) gives today's E_LEX or
   a clear existing error. Record fields (R001) will later reuse `.` on
   lowercase receivers, so no rule may block that. Task 2.

## Execution

- **Method:** subagent-driven. Sonnet implements and Opus reviews, with
  a review gate after every task and a whole-branch Opus review before
  the user's merge decision. Critical and Important findings are fixed
  and re-reviewed; Minor ones go to the ledger.
- **Branch:** `fx020` in `.worktrees/fx020`, from main. Integration is
  by fast-forward only, and pushing needs the user's approval.

---

### Task 1: Behaviour-preserving splits

**Files:**
- Split src/Format/Diagnostic.purs (249 lines).
- Split test/fx-oracle-parse.mjs (249).
- Split scripts/regression.mjs and test/regression.mjs (250 each), and
  scripts/differential.mjs (250), if it must change.

**Interfaces:** export lists unchanged; no importer changes beyond
module names.

- [ ] Split, verify, then run the differential against the base:
  0 differences.
- [ ] Commit `refactor: splits for FX020`.

### Task 2: `.` and qualified operation names (bare still resolves)

**Files:**
- src/Format/Lex/Chars.purs: add `.` to the punctuation, keeping `...`
  first.
- src/Domain/Syntax/Core.purs and Syntax.purs: a qualified
  name on `Variable` and `Call`, or new nodes.
- src/Format/Parse/Expression.purs: `named` accepts `Upper.lower` and
  `Upper.lower(args)`.
- src/Features/Resolve/Effect.purs, Scope.purs and Expression.purs:
  per-effect operation tables, including built-in Console (`print`)
  and Fail (`fail`).
- Tests: test/fx020-qualified.test.mjs.

**Interfaces:**
- `Effect.op(args)` resolves to the existing `Perform`, `Print` or
  `Fail` nodes.
- `Effect.op` without arguments resolves to `OperationRef`, `PrintRef`
  or the Fail reference.
- An unknown `X.y` gives the existing unbound or E_HANDLER texts as
  appropriate. Report if neither fits.

- [ ] Write the failing tests:
  - `Log.log(1)` performs;
  - `Console.print(1)` prints;
  - `Fail.fail(E)` is caught by `handle`;
  - `map(Database.query, ids)` passes a reference;
  - `Database.query` in a `with Log` function is rejected by effect
    checking with today's text;
  - two effects both declaring `log`, called as `Audit.log` and
    `Log.log`, each reach their own handler;
  - `1.5` and `x.y` give their errors (Review Focus 5);
  - `...` is unchanged.
- [ ] Make `fail` an ordinary name. The parser stops intercepting
  `fail(…)` (Format/Parse/Expression.purs `on "fail"`). The resolver
  then binds `fail` through a temporary legacy global entry pointing at
  Fail's operation, so unmigrated programs still compile. That entry is
  marked as transitional in code and removed in Task 7.
  - The resolved node for `fail(e)` and `Fail.fail(e)` is unchanged.
  - Test: an existing `fail(E)` program gives identical Go.
- [ ] Implement it. Bare names keep working, and the existing suite is
  unchanged.
- [ ] Run verify and the differential, which should show only new
  sources.
- [ ] Commit `feat: qualified effect operations`.

### Task 3: Signature aliases and imports

**Files:**
- src/Format/Parse/Mark.purs `label`: `[as Alias] [{ op [as name], … }]`,
  with a trailing comma allowed.
- src/Domain/Syntax/Core.purs: `LabelRef.alias` and `LabelRef.imports`.
- src/Features/Resolve.purs `resolveFunction`: builds the alias and
  import table from the function's own row.
- src/Features/Resolve/Scope.purs: a layered lookup.
- New errors use `Syntax "<approved text>"` with notes; new
  `NoteReason`s are `FirstImportedHere` and `FirstBoundHere`.
- Tests: test/fx020-imports.test.mjs.

**Interfaces:**
- An alias leaves the canonical name valid.
- An alias may not equal any declared effect name (built-ins included)
  or an earlier alias.
- Duplicate bare names are compared after renaming.
- Placement: alias or import syntax anywhere except a function
  declaration's own row is the placement error. That covers parameter
  types, handler types, lambda annotations and operation signatures.
- Lambdas inherit the enclosing function's bindings.

- [ ] Write the failing tests, with exact text, spans and notes:
  - each of the three errors, including an alias equal to a declared
    effect that is absent from the row;
  - placement in a parameter type, a handler type and a lambda
    annotation;
  - Review Focus 1: parameter, `let` and lambda shadowing, and a
    wrong-typed binder giving a type error;
  - Review Focus 4: two Fail families;
  - an imported `fail` passed as a value;
  - `nofail Log { log }`;
  - the existing `not an operation of` error for an unknown import.
- [ ] Implement it.
- [ ] Run verify and the differential.
- [ ] Commit `feat: signature aliases and imports`.

### Task 4: Built-in effects as declarations; collisions

**Files:**
- src/Features/Resolve/Row.purs `lookupEffect`.
- src/Features/Resolve/Effect.purs `uniqueEffects`.

**Interfaces:**
- A user `effect Console` or `effect Fail` gives the existing E_DUPLICATE
  `Duplicate effect Console`.
- Rows resolve Console and Fail through the same declaration table as
  user effects.

- [ ] Invariant: adding built-in declarations must preserve every
  existing user `EffectId` and every emitted runtime key:
  - host effects 0;
  - user effects EffectId+1;
  - Fail keys by head, Text MinInt32.

  Built-ins must therefore not take positions in `program.effects`.
  - Test: the services and Fail corpus programs emit byte-identical Go.
  - The seven snapshots are unchanged.
- [ ] Write the failing tests: `effect Console {…}` and `effect Fail
  {…}` are rejected, and today's Console and Fail programs are
  unchanged.
- [ ] Implement it.
- [ ] Run verify and the differential.
- [ ] Commit `feat: Console and Fail as declared effects`.

### Task 5: Rewrite tool, reference interpreter and generator

**Files:**
- Create scripts/fx020-migrate.mjs. It locates bare operation calls and
  references through the compiled compiler's resolved output (spans of
  `Perform`, `OperationRef`, `Print`, `PrintRef`, `Fail`), and inserts
  the qualifier. It is idempotent and never touches clause heads.
- Update test/fx-oracle*.mjs:
  - the `.` token;
  - qualified names;
  - imports from the function's own row;
  - Console and Fail as effects;
  - lexical priority.
- Update test/fx-gen-*.mjs so the generator emits qualified calls, and
  imports in some functions.

- **Rejected programs.** Fixtures that fail before or during resolution
  produce no resolved output.
  - For those, the tool proposes candidate edits from the token stream:
    a bare name followed by `(` that matches a declared operation. It
    never edits them silently. Every such file and edit goes into an
    explicit manifest, scripts/fx020-manual.json, which is reviewed
    line by line.
  - Programs that resolve are always rewritten from the resolver's
    output.
- **Edit map.** Every change the tool makes is recorded as an edit map
  from original offsets to new ones. Each entry is an insertion
  position plus a length, and wrapping adds line-break insertions. The
  map is how pinned spans, notes and differential diagnostics are
  translated. Wrapping long lines is a separate step with its own map,
  never mixed with qualification in one edit.
- **Paired differential mode.** This is a new script,
  scripts/fx020-paired.mjs.
  - It keeps a frozen copy of the original corpus and a baseline build
    of the compiler from before Task 6.
  - For each original and migrated pair, it compares:
    - for accepted programs, the final emitted Go, which must be equal;
    - for rejected programs, the diagnostic code, the message, and the
      span and note positions mapped through the edit map.
  - Intentional differences, such as new namespace errors and hints, are
    listed in a narrow ledger file (scripts/fx020-expected.json) with a
    reason for each. Any difference not in the ledger fails the run.
- [ ] Write the failing tests for the tool itself. A fixture set must
  cover:
  - a rejected program, with a syntax error and with an unbound name,
    that contains an operation call, which must land in the manifest,
    not be edited;
  - edit-map translation of a span on the edited line, of a span after
    a wrapped line, and of a span whose two ends move independently;
  - the paired mode reporting an unexpected difference, plus one
    ledger-listed difference that passes.
  - calls;
  - references;
  - shadowing locals left alone;
  - clause heads left alone;
  - names in holes;
  - idempotence (running the tool twice changes nothing).
- [ ] Write the failing tests for the interpreter: its tests on
  qualified and imported programs.
- [ ] Implement it. Then run the differential test at 11 seeds. It
  must show 0 disagreements between Go and the interpreter.
- [ ] Commit `test: FX020 rewrite tool, interpreter and generator`.

### Task 6: Migrate the corpus

**Files:**
- examples/*.wxw;
- test/**, including the fx008-probes fixtures;
- scripts/regression*.mjs embedded programs;
- the user-facing docs: README.md, docs/language.md, ADRs 010 and 011.

Historical logs (docs/progress.md, docs/sdd/**, docs/plans/**) keep their
original text.

- [ ] Run the tool across the corpus, in chunks by area.
  - Commit each chunk separately, with verify passing at each.
  - Where a test pins a span, translate it through that chunk's edit
    map. Each commit message names the files whose pins moved.
  - Manifest entries (rejected fixtures) are applied by hand in the same
    chunk, each matching its manifest line.
- [ ] Gate, for every chunk: the paired differential (Task 5) passes.
  Accepted pairs give equal Go. Rejected pairs give equal diagnostics
  through the edit map. Any other difference must be in the ledger,
  with its reason.
- [ ] Gate: the seven snapshots are unchanged.
- [ ] Gate: no migrated line exceeds 80 columns. Wrapping is its own
  commit per chunk, after qualification, with its own edit map and its
  own paired-differential run.
- [ ] Commit `style: FX020 migration, <area>`.

### Task 7: Remove bare operations and the legacy `fail` binding

**Files:**
- src/Features/Resolve/Effect.purs: stop exporting operations into
  `globals`.
- src/Features/Resolve: remove the transitional legacy `fail` global
  from Task 2. The parser keyword path was already removed there.
- src/Domain/Problem.purs `Hint` and Format/Diagnostic*: the
  unbound-name hint.
- New scripts/regression-fx020.mjs and test/regression-fx020.mjs.

- [ ] Write the failing tests:
  - a bare `log(1)` gives `Unbound function log; use Log.log, or import
    it with Log { log }`;
  - a bare `print(1)` gives the same with `Console.print`;
  - `fail(E)` gives the same with `Fail.fail`;
  - the multi-candidate case pins the wording only after the user
    approves it (stop and report the observed text);
  - the two original collision programs now resolve correctly.
- [ ] Add regression rows: each restores one collision bug (an
  operation hidden behind the first-declared effect, and a function
  winning over an operation), plus row-dependent resolution.
- [ ] Run verify, the differential, and all proofs.
- [ ] Commit `feat: operations are always qualified`.

### Task 8: Documentation

- [ ] Write ADR 012 (effect operation namespaces), with the as-built
  decisions and the temporary `print`/`show` gap.
- [ ] Update docs/language.md (Effects: qualified calls, imports,
  aliases, scoping, errors) and docs/architecture.md.
- [ ] Update BACKLOG: FX020 done; the INF001 import requirement stays;
  record the multi-candidate hint wording.
- [ ] Update the README samples (already migrated in Task 6), plus
  docs/progress.md and docs/next-session.md.
- [ ] Run `node scripts/width.mjs` on the changed files, then verify.
- [ ] Commit `docs: FX020 ADR 012 and language`.
