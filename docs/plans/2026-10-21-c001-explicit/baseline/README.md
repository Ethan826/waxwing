# Executable ordinary-record baseline

Status: bounded exploratory results, 2026-10-21. No compiler, solver or
language-policy change. This tranche runs existing Waxwing syntax with
closed record types expanded in full. The proposed class alternative and all
four C001 decisions remain open.

Changing the hole representative from Int to Bool left eleven program
outputs unchanged. Those programs compile and print their hand-derived
expected Go output, including P2-style construction and P3-style captures
after making both stages of their supplied carrier operations pure. The
discarded dictionary, unused local and phantom-instantiation cases retain
type holes and run successfully. Their observations do not motivate blanket
rejection of those holes. No universal preservation or hole-representative
theorem follows.

## Results and limits

[cases.json](cases.json) froze twelve initial cases before their first
compiler run. After observing failures, six controls were added, then two
controls with both stages of supplied carrier operations pure, then a
reversed-source-order case. These are labelled amendments, not a predeclared
exhaustive grammar. There are twenty-one final sources: seventeen intended
positive candidates and four intended rejections. No generator or
property-testing campaign ran.

| Cases | Current compiler / Go result | Interpretation |
|---|---|---|
| p1-choices | `Results(9, 24, 4, 2)` | Sum, bounded product, last and empty fold use explicit operations |
| p4-two-operands | `Pair(Pair(5, 6), Pair(6, 5))` | Two operands of the same record type retain their independent choices |
| c7-pure-stages-construction | `Results(5, 20, 6, 2)` | Constructs dictionaries, selects Stats field policies and reverses last via a capture |
| c8-pure-stages-runtime | `Results(Pair(5, 3), Pair(6, 3), 2)` | Runtime branch, forwarding and returned captures retain choices |
| c9-source-order | `Results(Pair(6, 3), Pair(5, 3), 2)` | Reversed call order retains both choices |
| a1-discard-dictionary, a2-unused-local, a4-phantom | Each prints `7` with Int or Bool as hole representative | Actual type-hole occurrences survive checking; these outputs do not depend on that choice |
| a3-fixed-carriers | `Pair(false, "new")` | Generic last independently instantiates at Bool and Text |
| c4-unary-inferred, c5-unary-annotated | Each prints `7` | Generic function application in a capturing lambda works with one arrow |
| p2, p3, c1, c2, c3, c6 | TypeMismatch; no Go program | The original arrow spelling leaves an earlier stage ambient; parameter annotations, concrete carrier and named partial application do not repair that contract |
| n1-rigid-comparison | NotComparable in an unused generic body | No built-in comparison at rigid a; unused bodies are checked |
| n2-hole-comparison | AmbiguousType | Unconstrained comparison still rejects |
| n3-function-print | NotPrintable | An operation record remains a function-containing value |
| n4-multiplication | Lexical | Current Int syntax does not include `*` |

[results.json](evidence/results.json) records source hashes, diagnostics,
function keys, type-hole occurrence counts, Go outputs and the alternate
representative outputs. Hole counts are occurrences, not distinct unknowns;
`Hole` is an aggregate of type-variable and row-tail occurrences.
`typeHoleOccurrences` separately counts only `TVar(Hole)`.

Eight accepted sources agree with the existing independent interpreter on
the exact source and expected output. Six rejected candidates also execute
to the expected values in that untyped interpreter; that does not make their
contracts well typed. The interpreter cannot parse the explicit per-stage
rows in c7-c9. Their generated Go is checked against hand-derived expected
outputs, not an interpreter result from another source. No parser was
patched, bypassed or described as supporting those inputs.

The exploratory runner exits 1 with nine unmet original expectations: six
typing rejections and three interpreter parse gaps. All eleven emitted
programs match expected stdout, with exit 0 and empty stderr, both under
default specialization and Bool representative substitution: twenty-two Go
executions. Four negative diagnostic checks pass. The runner executes
compiler/Go checks even when interpreter parsing fails. It does not turn
these limitations into a green conformance suite.

## Arrow-stage translation

The local FX001 design states that a row suffix annotates the nearest arrow
to its left; `(A, B) -> C with E` is `A -> B -> C with E`. An unwritten
arrow row uses its named declaration's ambient row. Therefore:

```text
(a, a) -> a with pure
```

marks only the final stage pure. The proposed first-order C001 core uses
pure arrows throughout. Its current-syntax operation type needs:

```text
a -> a with pure -> a with pure
```

The failed p2/p3 spellings and c1-c6 controls are retained. Changing only
the operation-arrow signatures in c7/c8 makes the same runtime bodies check.
c3 also rejects at concrete Int, so the failure is not evidence that rigid
generic variables or the record-composition solver are broken. The current
diagnostic prints identical expected and found types because it omits the
distinguishing rows; this is recorded in the local backlog.

Source correspondence: `docs/plans/2026-10-09-effects-design.md`, §1 type
syntax and §2 staged rows; `src/Format/Parse/Chain.purs`, `folded` and
`combined`; `src/Features/Check/Lambda.purs`, `checkLambda`; and
`src/Features/Check/Stages.purs`. These explain the stage-row contract; no
new inference rule or record-solver claim is made.

P1/P4 use the shorter, final-stage-pure contract and already work. c7/c8
make every stage of their supplied Int/generic carrier operations pure. c7
still leaves the first stage of the constructed Stats combine result
ambient. It demonstrates construction under that contract, not a fully
all-pure Stats dictionary. These are observations about current contracts;
they do not validate every type in the proposed all-pure core.

## What this says about the all-meta boundary

The current compiler accepts `discard(lastFor())`, an unused local holding a
last dictionary, and an unconstrained phantom ADT reference. All three
contain `TVar(Hole)` in checked IR and print `7` under both tested hole
representatives. a4 uses a nominal phantom ADT; it does not test structural
alias identity or nominal class evidence.

Recommendation for decision 2: keep P001's existing hole discipline for
ordinary operation records unless a concrete operation requires a stronger
rule. The global all-meta restriction rejects useful existing programs and
is not justified by these observations. Its proposed rule remains pending;
this report does not replace it with a new language policy. A future class
predicate, implicit selection or type-dependent evidence operation would
need its own ambiguity account. Existing built-in comparison and printing
already enforce their distinct restrictions, as n1-n3 demonstrate.

This is bounded evidence. Changing one representative in eleven programs
cannot establish independence for every accepted record program, nor settle
future evidence construction or local generalization with effects.

## Specialization observations

Default-specialization keys include one Int instance each of client,
configured and reverse in c8 and c9, despite their different runtime
policies. P4 has one Int key for both. Multiple values therefore share these
function copies in the measured programs. Keys alone do not show correct
behavior; the emitted Go outputs supply the separate observation. No
dictionary value or closure environment was added to a key.

## Reproduction and provenance

A fresh private compiler build compiled unchanged checkpoint sources at
`c341109` plus the existing pinned dependency sources, with zero warnings
and errors. No mutable compiled output from the shared checkout was used.
[compiler-manifest.json](evidence/compiler-manifest.json) records all source
and compiled-JavaScript hashes and the spago.lock hash. Only that fresh
output was loaded by the runner. The build does not run style tools or the
whole verification suite and is not a full `npm run verify` result.

From `/private/tmp/waxwing-c001-design`:

```text
mkdir -p .build/c001-baseline
purs compile 'src/**/*.purs' \
  '/Users/ethan/Desktop/waxwing/.spago/p/*/src/**/*.purs' \
  --output .build/c001-baseline/output --json-errors \
  > .build/c001-baseline/compiler-build.json \
  2> .build/c001-baseline/compiler-build.stderr
node docs/plans/2026-10-21-c001-explicit/baseline/run.mjs \
  docs/plans/2026-10-21-c001-explicit/baseline/evidence/results.json
```

The final command intentionally reports the nine limitations above and exits
1. Runtime versions are in the results. The runner uses a private Go cache
and local toolchain, needs no dependency download, and leaves generated
Go/cache files under `.build/c001-baseline/`.

Current syntax has no multiplication operator. smallProduct uses repeated
addition solely for the small nonnegative fixture arguments. No full-domain
multiplication, law or termination claim is checked. No standard-library API
follows from this helper.

The initial harness mistakenly read `checked.value0.functions` even though
Checked.Program is an erased newtype; fixing that read to checked.functions
allowed the six initially accepted sources to reach Go. The initial failure
report is preserved in
[initial-harness.json](evidence/initial-harness.json).
[initial-compiler.json](evidence/initial-compiler.json) retains the next run,
with two compiler rejections.
[preflight-results.json](evidence/preflight-results.json) records the
extended run that first exposed the interpreter grammar gaps. No assertions,
compiler checks or diagnostics were disabled for a pass.
