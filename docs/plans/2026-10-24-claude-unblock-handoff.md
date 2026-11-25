# Claude handoff: bounded next steps after charter review

2026-10-24. Prepared at the author's request to unblock Claude and finish
this session. The recommendations below are proposed instructions to hand
to Claude, not evidence of implementation or acceptance of unexamined work.
No agent was started, and nothing was committed or pushed here.

## Checks performed in this pass

Read arithmetic commit `3672c77`, its oracle and test, relevant plan tasks
and existing AST-shape assertions. Read U8 commit `7476097`'s pin diff,
`UnsolvedImage Var`, witness coverage placement and the constructor test.
This was a bounded source review, not an independent review of all U8 code.
No Go execution or full verification was rerun.

Ran a small model-only check using the arithmetic branch's oracle:
67 distinct boundary values; all 67 occur in the 200 literal trees;
144 of those trees exercise overflow; both int32 wrap boundary controls
pass. Left- and right-grouped addition give the same value, as required
by modular addition, so numeric outputs cannot establish associativity
or parser grouping. The existing literal/parameter forms still provide
useful arithmetic and source-form evidence.

Two comments need correction before Task 2 is called reviewed:

- `int-arith-oracle.mjs`: separate implementation reduces shared-code
  coupling; it cannot ensure the oracle shares no conceptual defect.
- `int-arith-oracle.test.mjs`: value comparison for `+` does not prove
  parser grouping. Structural assertions are needed, with numeric
  precedence/grouping evidence added when non-associative operators exist.

## Proposed instructions to Claude

1. Arithmetic Task 1: choose option (b). Update the expected AST strings
   and imports to the new representation. Keep exact assertions for
   `Arith` containing the intended binary operator and ordered operands;
   do not replace them with loose matches. A reviewed representation
   change is not a license to weaken behavioral checks. Keep emitted Go
   unchanged for existing programs and run the approved preservation
   checks. Only Tasks 1 and 2 are authorized by the existing tranche.
2. Task 2: retain the oracle as the baseline for addition. Correct the two
   comments above and pin structural grouping with the Task 1 assertions.
   Record evidence actually run; do not attribute a new Go/verify run to
   Codex. Review Task 1 before starting Tasks 3-7; those remain held.
3. Division: leave semantics deferred. No `/`, `%`, new failure category
   or division API is authorized by this handoff.
4. U8: accept the one-line `UnsolvedImage` export-pin addition, which
   matches `UnsolvedImage Var`. This accepts the pin, not a blanket review
   of the entire trusted surface or U8 implementation.
5. Add `['UnsolvedImage', 1]` to the verdict constructor test. Retain the
   must-refuse/positive-control fixtures; this inventory check does not
   replace them. Updating an expected interface for an approved constructor
   is permitted, while weakening existing assertions is not.
6. ResultC: draft its exact tail-parametricity claim and argument, then
   seek a bounded adversarial review. State the quantifiers, assumptions
   and how the result connects to installation, copying and K1. A new
   statement must be reviewed before any new proof. No implementation is
   authorized. List E10 and any other unresolved obligation separately.
7. a-min: keep implementation, Task 4.6 and G-D1 blocked. The independent
   U8 repair does not close those gates. Preserve K1's recorded ruling.
8. Effect contracts: leave all five policy decisions open. Do not infer
   answers from the charter, including a meaning for `pure`, Crash
   catchability, observation boundaries, root classes or extension rules.
   No additional broad research campaign is requested.
9. Charter: the integrate session has applied Claude's targeted fixes and
   recorded all 17 dispositions in the prose-review file. Do not duplicate
   those edits. The author confirmed latest explicit answers take priority
   within scope unless applying them substantially unsettles guarantees,
   compatibility or architecture. Charter wording and activation remain
   for final approval; do not activate contributor or README changes yet.
10. Rename only the effect-kinds research probes from `.wxw` to `.wxw.txt`
    and update their runner/document references explicitly. Check that the
    content and runnable research cases are preserved and no sources enter
    the pinned R0 corpus. Do not change corpus baselines merely to absorb
    these research artifacts.

Keep work on its existing isolated branches. Do not merge into main or the
R0 stack, push, install toolchains, or start a larger tranche on the basis
of this handoff. Existing execution/review rules still apply.

## Integrate worktree state

The charter draft, adoption proposal and prose record are under `docs/`.
The separate effect-kinds research and its prose record remain uncommitted
here as well, with progress and next-session entries for both workstreams.
These files are not present on the research branch merely because they
exist in this worktree. Preserve them when preparing later integration.

## Editorial record

Reviewed this handoff for direct instructions, distinct authorization and
evidence scopes, and retention of open decisions. Replaced the broad
claim that the arithmetic oracle checks grouping with its actual bounded
claim. Named the exact constructor arity and the limits of the pin review.
No claims of implementation, formal proof or a fresh full test run appear.
