# Review: FX008 Task 3 (`nofail` syntax, resolution and printing)

Commit f16c6b5 (base 5ed5b0e), worktree /Users/ethan/Desktop/waxwing-fx008-impl.
Reviewer: Opus, 2026-10-10. Worktree's tracked files not modified.

**Verdict: Spec ❌ (one narrow gap) · Quality: Needs fixes (one small fix, plus test gaps)**

## Ran (not just read)

- `node --test` fx008-syntax, fx008-markuse, fx-oracle, fx008-nesting,
  fx008-probes, type-order: 228/228 pass.
- Built the base (5ed5b0e) in scratch (`git archive` + `scripts/build.mjs`).
  Harvested 4,625 sources by running the base test suite under
  scripts/differential-hook.mjs.
- **Compared base and candidate by whole-compile outcome** (Go text, or the
  wire diagnostic: code, message, span, notes):
  - 3,371 harvested sources plus examples/ and negative/: **0 differences**.
  - 20,000 mutations of harvested sources, the targeted cases and 3,000
    token soups (scripts/differential-corpus.mjs): **0 differences**.

  So existing diagnostics are unchanged, Go is byte-identical, and the
  meta-numbering shift from lambda annotations has no visible effect (holes
  still print `_`, and no diagnostic or Go output moved). I did not use
  scripts/differential.mjs as is, because its parse and resolve digests
  differ on every program now that LabelRef has a new `mark` field.
- 45 adversarial programs, run on both builds (see below).
- Mutation in a scratch copy: dropping `"("` from `opensLabel`. **Survives**
  every test: fx008-syntax, markuse, oracle and the probe gate (201+19
  pass).
- Nesting performance: deep lambda and signature handler types nested
  through handled-label arguments (`Handler(S(…) with Log)` at 40 and 60
  levels, and a mixed form) take 4–22 ms. A doubly branching type
  (`Handler(S(T) with S(T))`) costs about 3× per 2 levels while the source
  grows 4×, so it is linear in the source size.

## Plan steps, texts and spans

All of these are delivered, with their exact texts, codes and spans:
- `nofail does not apply to Fail` (E_TYPE at `Fail(E)`). This also works for
  `Handler(nofail Fail(E) …)`.
- `nofail(k) is allowed only in function signatures` (at `nofail(k)`, in
  ctor fields, operation parameters, operation rows, and nested handler or
  row-argument positions in type declarations).
- `Unbound mark variable j` (at `nofail(j)`, earliest by offset).
- `nofail ...e is not supported yet`, after `with` and after `+`. **It is
  missing at the start of a row argument (I1).**
- `Expected nofail State(Int), found State(Bool)`.
- `f performs nofail Log, which its signature does not allow`.
- `nofail Console` never prints.

The Interfaces later tasks consume are all present with the plan's names:
- `MarkRef`/`NofailRef`/`NofailVariableRef`, `LabelRef.mark`;
- `NofailOnFail`, `MarkVariableOutsideSignature`, `UnboundMarkVariable`,
  `FunctionName TypeName (Maybe String) TypeName`;
- `FunctionDecl.markVariables`, `markedLabel`, and the Resolve.Marks
  functions and type;
- `instantiateMarks` and `localMarks` (the right shapes for the Task 9 rows
  `fx008-local-plain` and `fx008-c-alias`);
- `CheckEnv`/`Infer.Env.markVariables`, `declarationUse` (the third
  argument is the mark names; ctor and operation pass `[]`);
- RowName and TypeName printing.

Task 10 can add new reasons to Domain.Note as planned. The probe table and
its hash are untouched.

## Grammar adversarial results (both builds)

**Unchanged on the base build:**
- `nofail` stays an ordinary name in all of these: `Opt(nofail)`,
  `x: nofail`, `Opt(nofail -> Int)`, `P(nofail, Int)`, `S(nofail)` as a
  label argument, a parameter named `nofail`, `let nofail`, the call
  `nofail(2)`, `with nofail { … }` (a handler variable in expression
  `with`), `effect S(nofail)`, `type B(nofail)`, a lambda parameter named
  `nofail`.
- Every program that does not write `nofail`.

**Changed: only programs that write `nofail`:**
- Former syntax errors that are now accepted (the intended feature).
- Former syntax errors whose text or span moved: `Opt(nofail(k))`,
  `Opt(nofail (Int))` (now "Expected a mark variable"), `with nofail =`,
  `with nofail log`, `with nofail(K) Log`.

## Deviations

1. Domain.Note holds only NoteReason: **OK.** `Note` needs `Span`, which
   would make an import cycle. Domain.Syntax re-exports it, and Task 10
   only adds reasons.
2. `ifSecond` lookahead, and `foldAt` moved to Cursor: **OK.** Grammar is
   the monadic core. Grammar.purs goes from 246 to 241 lines.
3. `label` moved to Format.Parse.Mark; Row exports `markedOr`: **OK.** Mark
   is on the G001 lists (engineering.md, Style/Parser.purs, style.test).
4. `arrowRows` moved to Resolve.Marks: **OK.** The new version uses two
   loops and is O(n); the old one built the array with `cons`. It is a
   general syntax helper placed in a marks module, which is acceptable while
   Syntax.purs is at 248 lines.
5. `markVariables` threaded in but unused: **OK.** It is the plan's
   interface.
6. Scope checks on handler-literal label arguments and Fail-clause
   payloads: **OK, and needed.** Those are the only other written types in
   a body (LambdaParam, FailClause, the handler-literal LabelRef), so no
   rigid k can enter Check without a scope check.
7. Interpretations:
   - **C for handler types among the handled label's arguments: correct.**
     Such a value can be installed (`with get() { … }`), so its C is
     consumed. The C1 rule only covers "inside a handler type's row". C's
     copy of R is traversed with `outside = false`, so each R is copied at
     most once and the tree is at most 2× its size (measured linear above).
   - **In C, Plain becomes a fresh meta and written N or k is kept:
     sound, and consistent with the local-annotation rule** ("a written
     nofail there is N", §3.4) and with signatures (same written marks). It
     only rejects more. Spec §3.4's wording, "R's written labels with fresh
     mark metas", should be amended in Task 12.
   - **Ambient or unsolved tails are omitted from printed arrow rows: not
     misleading in itself.** The text matches what the user wrote, since an
     unwritten tail in a signature means the ambient row. It also follows
     RowName's existing `tailName` convention (Meta → "") and P3's text.
     One caveat: a closed row prints the same as an ambient one. That is
     pre-existing (the base build already says
     `Expected Handler(Log), found Handler(Log)` for closed vs ambient).
     Consider a BACKLOG item for it.
   - Rows printed after their segment match the source form
     `A -> B with r1 -> C with r2`.
   - Bare `Handler(nofail Log)` becomes `THandlerRef … Nothing`, which
     resolves to the ambient row. The Go output equals the unmarked form's
     (tested).

## Findings

### Critical
None.

### Important
- **I1: `nofail ...e` at the start of a row argument does not get the
  approved P10 text.** `fn u(b: Box(nofail ...e))` and
  `Handler(nofail ...e)` give E_SYNTAX `Expected ')'` at `...`, not
  `nofail ...e is not supported yet` at `nofail ...e`. Spec §3.2 names "the
  start of a row argument" as a `nofail` position, and plan Step 3 says
  "`nofail ...name` is the E_SYNTAX". The cause is
  src/Format/Parse/Mark.purs:65-66: `opensLabel` returns false for `...`,
  so `markedOr` reads `nofail` as a type variable. The positions after
  `with` and after `+` work because `rowPart` dispatches unconditionally.
  - Fix: `opensLabel text = text == "(" || text == "..." || (isName text &&
    isUpper text)`. This is unambiguous, because a type variable `nofail`
    followed by `...` is never valid. Update the comment.
  - Add the `Box(nofail ...e)` case to `nofail on a row variable is
    E_SYNTAX`, and show that the test fails with the defect restored.

### Minor
- **M1: Test gap (mutation survives).** No test parses `nofail(k)` in a
  row-argument position (`Box(nofail(k) Log)`) or as a handled label
  (`Handler(nofail(k) Log with pure)`). Dropping `"("` from `opensLabel`
  passes everything. Add both to `positions` in test/fx008-syntax.test.mjs.
- **M2: An arrow chain's rows print only partly.** For
  `Int -> Int with nofail Log -> Unit with Log`, the message says
  `Int -> Int with nofail Log -> Unit` and silently drops the last arrow's
  `with Log` (src/Features/Check/TypeName.purs:415-418, decided per
  arrow). This is not covered by a P10 text. Either print every arrow's row
  once any arrow in the chain shows one (today's texts stay unchanged), or
  report this text to the user as provisional.
- **M3: Declaration budgets grew.**
  - `declarationUse` (src/Features/Check/Use.purs:101-126) now has 9
    `where` bindings (it had 7).
  - `HandlerType.operand` (src/Format/Parse/HandlerType.purs:48-138) was
    already over budget. It grew from 77 to 91 lines and has about 25
    bindings.
  - Fix: lift `marked`/`markedHandler` into a top-level production (for
    example `markedHandlerType ∷ Parser TypeRef → Parser TypeRef`), and
    fold `withMarks`/`marked` into a small helper.
- **M4:** `nofail(k) Console` adds k to `markVariables`, which costs one
  unused meta per use. This is harmless. Note it, or filter by effect, if
  P7's "mark variables in signature order" BFS should skip it.
- **M5: Housekeeping.** `marks never reach Go` is vacuous after Task 2's
  strip, but the plan asks for it, so keep it. Task 12 should record the
  §3.4 "fresh mark metas" amendment for C (deviation 7).

## AGENTS.md

- File sizes: all files are 250 lines or less (Syntax 248, Grammar 241,
  test/fx-oracle-parse 241).
- PureScript stays within 80 columns (checked by characters).
- No anonymous lambdas and no `let … in`.
- New Supply applicative in Features: pure.
- No imports cross layer or IR boundaries: MarkUse imports
  Domain.Checked.Internal, which is allowed for Check.
- G001 lists are updated in engineering.md, the style tool and style.test.
