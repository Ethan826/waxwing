# FX008 Task 2 review: mark representation

Reviewed 66e4f5d against base bc959aa, in the worktree
/Users/ethan/Desktop/waxwing-fx008-impl (branch fx008-impl). Reviewer: Opus.
I made no changes to the worktree.

**Verdict.**
- **Spec ❌.** Every interface is delivered with exactly the planned name and
  type. Behaviour is not fully preserved: see C1, which needs a ruling on the
  plan.
- **Quality: Needs fixes.** C1 must be resolved. I1 is a cheap test gap.

## What I ran and what I only read

**Ran:**
- In the worktree: `node --test test/fx008-representation.test.mjs`, 3/3
  pass.
- In scratch (…/scratchpad/t2review/): `git archive` copies of bc959aa
  (`base/`) and 66e4f5d (`head/`), each built with `scripts/build.mjs`.
  - Timed `waxwing emit` on generated programs whose handler types nest
    inside handler rows, on both builds.
  - Profiled the check phase with `--cpu-prof`.
  - Built a Strip mutant in `head/` and ran the new test against it.

**Read:**
- The full diff.
- Every consumer of `rowsOf`, `THandler`, `.inference` and `.clauses`.
- `Checked.Internal`, `Walk.retype`, the `Resolved` tables, and the Ty
  Eq/Ord/Functor instances.

**Not run by me:** `npm run verify`, the probe gate and the regression rows.
I accept the controller's figures for these: verify exit 0, 1068/1068,
29/29, 36 proofs, gate 107/107, Go hashes unchanged.

## Interfaces later tasks consume (all ✅)

**Domain.Row:**
- `Mark` = NoFail | Plain | MarkVariable String | MarkMeta Int | Unmarked,
  with Eq and Ord.
- `Label EffectRef (Array t) Mark`, mark last.
- `HandlerRows t v = { inference, clauses }`.
- `labelMark`, `withMark`, `normalMark` and `mapHandlerRows`, each with the
  exact planned signature.

**Domain.Type:** `THandler (Label (Ty v)) (HandlerRows (Ty v) v)`.
Domain/Type.purs is at exactly 250 lines. That is legal, but there is no
headroom left.

**Domain.Type.Marks:** `mapMarks`, `mapRowMarks`, `stripMarks` and
`markVariables`, with the planned types. Spines are walked by `foldStages`.

**Features.Check.Strip:** `stripProgram ∷ Checked.Program → Checked.Program`.
- It is applied inside `check` before `instantiationRule`. Coverage now also
  sees the stripped program, which is harmless.
- It covers function types, bodies (via `retype`), operations and
  constructor fields.
- `TypeInfo` holds no types, so leaving the types table untouched is
  correct.

**Marks supplied:**
- Resolve gives `normalMark effect Plain`.
- Fail gets `Unmarked` in Resolve, Failure and Defer.
- Console gets `NoFail` in `Operation.console`.
- The Specialize builder (Specialize.purs:171) gives `Unmarked`.
- Lower and Format.Go only pattern-match on labels or use IR.
- Specialize calls no Check builder. Handlers.purs mentions Check only in a
  comment.
- **P4 holds on every path I found.**

**Unification ignores marks** (`_` in Unify, UnifyRow and RowSide).

**Test helpers:** the plan lists row-support, poly-keys and
fx-handler-type.test.mjs. None of them constructs a `Label`, so changing only
unify-support is correct.

## Implementer deviations

1. **`uniformRows`: accepted.** It reads better than six record literals, and
   the sites Task 7 must revisit can be found with one grep.
2. **Exporting `stripRowMarks`: accepted.** Strip needs it for
   `FunctionDecl.row`.
3. **`rowsOf` returning both rows, and Binding, `groundWith` and Unify
   visiting both: semantically harmless, but this is the cause of C1.**
   - `Argument.pureRows` now counts a pure handler row twice. `topRowPure`
     is unchanged, because any handler pure row already made the count 2 or
     more.
   - `Scheme.foldHoles` deduplicates through `seen`, so hole numbering is
     unchanged.
   - Every other consumer is an `any` test, or a `nub` in `markVariables`.
   - The second `unifyRowAt` has no provenance events: `unifyRows` is
     untraced. It can, however, add a duplicate `postponed` pair when the
     row holds a Fail label with a deferred key (see M1).
4. **`operationUse` using `Plain` directly: accepted.** `normalMark` is the
   identity on a user effect. Calling it anyway would match the plan's
   wording.

## Findings

### Critical

**C1. Handler types nested inside handler rows now take exponential time and
memory, and accepted programs crash.**

The type has one row per level, and C = R is the same row. Since this
change, every structural pass handles both rows separately:
- `substitute` / `map` (Type.purs:153)
- `Subst.resolve` (Subst.purs:204)
- `edited` (Marks.purs)
- `groundWith` (Parts.purs:125)
- `exceedsLimit` (Binding.purs:58)
- `rowsOf` (Parts.purs:80)

`substitute` and `resolve` also rebuild C as a separate tree, so the value
sharing that Resolve's `uniformRows` gave is lost. The work and the type's
size double at every level.

Reproduction: `effect S(a) { fn get(): a; };` and
`fn f(x: Handler(Log with S(Handler(Log with S(…Int))))): Int = 0;` at
depth k.

| k | base `emit` | head `emit` |
|---|---|---|
| 16 | 0.14 s | 0.35 s |
| 18 | 0.13 s | 0.66 s |
| 20 | 0.13 s | 2.11 s |
| 22 | 0.13 s | V8 heap out of memory |
| 40 | 0.13 s | — |

Base accepts nesting up to the parser limit, about 127 levels.

Profile at k = 18: Resolve takes 7 ms and Check 427 ms. Almost all of it is
garbage collection, `Domain.Type.substitute` / `substituteLabel`, and
`Domain.Type.Marks`.

This breaks two requirements:
- **"Behaviour-preserving" (Task 2).** An accepted program now ends in an
  uncaught crash, not a Diagnostic.
- **The plan's linearity constraints.**

**The root cause is P2 itself, not this implementation.** Task 3's
`localMarks` makes C a separate copy of R, with fresh marks and a fresh tail.
So handler types nested inside rows will stay exponential in every later
task.

**Fix: this needs a ruling from the controller or the user before Task 3.**
- *Task-2-local option.* While C ≡ R holds, structural passes visit and
  rebuild only `inference`, then set `clauses` to that same result:
  - `mapHandlerRows` applies `change` once and builds the result with
    `uniformRows`.
  - `rowsOf`, `exceedsLimit`, `groundRows` and Unify use `inference` only.
  - This is cheap and restores the base behaviour, but Task 7 must revisit
    it.
- *Design option.* Represent C so that a nested handler type cannot double
  it. For example, C could be `Maybe` (Nothing meaning C = R), or C's label
  arguments could share R's.
- *Either way, add a guard.* A test that an accepted nesting of at least 40
  levels compiles within a bound. Mark it `.serial` if it is timed.

### Important

**I1. No test pins the stripping of bodies, operations or constructor
fields.**

I built a mutant in which `stripProgram` leaves bodies
(`retype identity`), operation types and constructor fields unstripped. All
3 tests in test/fx008-representation.test.mjs still pass. Test 3 checks only
the parameters and row of `functions[0]`. P4 is a stated review focus.

Today every mark is fixed by its effect, so nothing observable can split.
From Task 3 onward it can.

**Fix:** in test 3, use a program that has an operation with a handler-typed
parameter, a constructor with a handler field, and a body containing a
handler literal and a `with`. Then assert that:
- every label reached by `foldTypes` over each body is `Unmarked`, with
  C deep-equal to R;
- every type in `effects[].operations` and `ctors[].fields` is `Unmarked`.

Confirm that the test fails against the mutant above.

### Minor

**M1. Unify.purs:124-125 unifies the same rows twice.**
- When a row is deferred, this puts two identical `RowPair`s on `postponed`,
  and both are retried.
- It doubles the work for every handler type, and contributes to C1.
- It is harmless today because both pairs succeed or fail together. Task 4
  replaces it anyway: R via `unifyRowsIgnoring`, C via `unifyRows`.
- The comment at Unify.purs:119 should say why there are two calls.

**M2. `markVariables` is a public formula with no test** (AGENTS.md: "Public
semantic formulas deserve their own tests").
- Its order matters for P7.
- **Fix:** test the distinct, first-occurrence order (own label, then
  arguments, then rows) on a handler type and an arrow. Or record it as
  deferred to Task 3, which first uses it.

**M3. Strip.purs: inconsistent local annotations.** In the `where` block,
`effect`, `operation` and `constructor` have type annotations, but
`parameter` and `function` do not. There are 5 where-bindings, within the
budget of 8.

**M4. The comment above `pureRows` (Argument.purs:83-91) no longer matches
what it counts.** It now counts a handler's pure row twice. Behaviour is
unchanged (see deviation 3), but the comment should say so, or the function
should count distinct rows.

**M5. Plan bookkeeping.** The Task 2 file list names three test helpers that
did not need changes. Note this in the ledger so a later reviewer does not
flag it.

## AGENTS.md conformance

- **Lambdas and `let`:** no anonymous lambdas and no `let … in`.
- **Layers:** Domain.Type.Marks imports only Domain modules. Strip imports
  `Domain.Checked.Internal`, which is allowed for `Features.Check*`.
- **Size:** declaration sizes and where-binding counts are within budget.
  The largest new declarations are `edited` (3 bindings) and `stripProgram`
  (5 bindings).
- **File length:** Domain/Type.purs is at 250 lines (cap). Handler.purs is at
  237 and Resolve/Types.purs at 243, still under the cap.
- **Width:** the lines my byte count flagged are under 80 columns once
  Unicode punctuation is counted as one character. The gate passed.
