# Executable ordinary-record baseline

Status: bounded exploratory results and current-behavior replay gate,
2026-10-21. No compiler, solver or language-policy change. The class
alternative is deferred. The [author rulings](../README.md) select ordinary
records and hold the unknown-type rule open.

Thirteen sources compile under the default Int stand-in. All sixty-three
successful Go executions match their expected output across Int, Bool, Text,
a closed record and a pure function stand-in. Two printing sources reject
the function stand-in during specialization, so uniform stand-in
substitution, including acceptance, fails for those examples. The original
discarded-value cases establish acceptance, not harmless substitution. Those
observations are consistent with existing hole handling and do not settle
the proposed all-meta restriction.

## A baseline gate that detects changes

[cases.json](cases.json) pins the expected current outcome for each of
24 sources. It checks source hashes, exact compiler diagnostic codes,
problem constructors, messages, spans and related notes. Interpreter
outcomes and representative-specific compilation/runtime outcomes are
checked separately. The original eleven default Go hashes and their recorded
function keys are also checked. A missing or additional case or
representative fails the comparison. Private compiler source/output hashes
and the zero-warning build record are checked during live runs.

| Recorded outcome | Cases | Meaning of a match |
|---|---|---|
| Accept and execute | p1, p4, a1-a4, c4, c5 | Expected output for all five stand-ins; direct interpreter output agrees |
| Reject the written contract | p2, p3, c1-c3, c6 | Exact TypeMismatch; no Go execution; untyped interpreter result is independent of typing acceptance |
| Go passes, interpreter cannot parse | c7-c9 | Expected output for all five stand-ins and exact known interpreter error; Go success remains visible |
| Builtin/syntax rejection | n1-n4 | Exact NotComparable, AmbiguousType, NotPrintable or Lexical diagnostic |
| Unknown element reaches printing | h1, h2 | Nil for four stand-ins; exact NotPrintable rejection for Function |
| Unknown element reaches comparison | h3 | Exact AmbiguousType diagnostic before specialization |

The six original contract rejections and three interpreter grammar gaps are
still present. A baseline exit of 0 means these recorded outcomes all match;
it does not mean the rejected design candidates now compile or the
interpreter supports c7-c9. Any new difference exits 1. Compiler, Go and
interpreter failures cannot replace each other's status.

[results.json](evidence/results.json) contains the observations and
baseline comparison. Its nonuniformRepresentatives list names h1/h2.
`--require-uniform` is a separate gate that exits 1 for those differences
even when the baseline itself matches. Unknown or malformed CLI options
exit 2; they cannot silently omit the requested gate.

[check-runner.mjs](check-runner.mjs) runs the real replay CLI against
copies of the result data. Healthy replay exits 0; eight deliberate
result-record mutations each exit 1. They alter a compiler outcome, a Go
output, the known parser error, a representative, the printing result, the
printability rejection, or the case census. These are checker sensitivity
tests, not source or compiler mutation tests. The separate uniformity gate
is also checked to fail on the healthy recorded data.

## Program observations

| Cases | Default Go output |
|---|---|
| p1-choices | `Results(9, 24, 4, 2)` |
| p4-two-operands | `Pair(Pair(5, 6), Pair(6, 5))` |
| c7-pure-stages-construction | `Results(5, 20, 6, 2)` |
| c8-pure-stages-runtime | `Results(Pair(5, 3), Pair(6, 3), 2)` |
| c9-source-order | `Results(Pair(6, 3), Pair(5, 3), 2)` |
| a1, a2, a4, c4, c5 | `7` |
| a3-fixed-carriers | `Pair(false, "new")` |
| h1-print-empty, h2-print-chosen | `Nil` |

Construction, runtime branch selection, captures, forwarding and reversed
call order work in these programs. c7 makes both stages of its supplied
carrier operations pure but retains an ambient first stage in its Stats
result. It is not a fully all-pure Stats dictionary.

Default-specialization keys include one Int copy each of client, configured
and reverse in c8/c9, despite their different runtime policies. P4 has one
Int copy of both. The manifest checks those recorded keys; the outputs
independently check the observed behavior. No dictionary value or closure
environment was added to a specialization key.

Ten accepted sources agree with the existing independent interpreter on the
exact source and expected output. Six rejected contract candidates also
execute to their expected values in that untyped interpreter; that does not
make their contracts well typed. c7-c9 retain the parser gaps. No reference
parser was changed or bypassed to manufacture agreement.

## Unknown-type observations and their limits

[unknown-plan.md](unknown-plan.md) froze the additional h1-h3 scope before
execution. The stand-ins use the existing specializeWith entry point: Int,
Bool, Text, `{ probe: Int }`, and `Int -> Int with pure`.

- a1/a2/a4 pass the unknown value to discard or leave it unused. They
  contain actual TVar(Hole) occurrences but output 7 regardless of their
  contents. Trying more stand-ins does not make these strong evidence
  of representative independence. a4 uses a nominal phantom ADT; it
  does not test structural alias identity or nominal class evidence.
- h1 applies show to Nil with an unknown element type. h2 first passes
  Nil through an explicitly selected last dictionary, then applies show.
  They put the unknown element type under a builtin printability check.
  Int/Bool/Text/record stand-ins print Nil. Function substitution returns
  NotPrintable during specialization, before emitting Go for that variant.
- h3 applies built-in comparison to the chosen empty List. It rejects
  with AmbiguousType. An explicit last operation does not supply Eq/Ord
  evidence or determine the inner unknown type.

The generated Int and record versions of h1 have different dormant Cons
payload types. The Nil constructor initializes only the tag, leaving those
payload slots at their Go zero values; its printer uses the tag and prints
Nil. The successful outputs check that no such payload leaks in these
executions. Source code cannot directly read an inactive payload or
fabricate an arbitrary unknown value; no unsafe operation was added.

h1/h2 demonstrate a stand-in-dependent acceptance difference. They do not
show different printed values between successful variants, nor a current
type-safety defect. Unqualified representative independence is not an
outcome of this experiment. A future ambiguity rule must state which
operations and stand-ins it admits; this report adopts no such policy. The
proposed all-meta restriction remains pending.

## Effects syntax is a separate usability finding

See the author-facing [effects-syntax note](../effects-syntax-usability.md).
In named signatures, a row suffix marks only the nearest arrow:

```text
(a, a) -> a with pure
```

leaves an earlier stage ambient. To write both operation stages pure:

```text
a -> a with pure -> a with pure
```

The six contract rejections arose from this distinction. Parameter
annotations, a concrete carrier and named partial application do not repair
the written contract. Changing carrier-operation stage signatures makes
c7/c8 check. The diagnostic still prints identical expected/found types
because it omits the distinguishing rows; CB002 records that issue. This is
not evidence of a record-solver defect.

Source correspondence: the local effects design §1 syntax and §2 typing;
Format.Parse.Chain folded/combined; Features.Check.Lambda checkLambda; and
Features.Check.Stages. No new inference rule follows.

## Reproduction and history

The private fresh compiler build uses unchanged c341109 compiler sources and
existing pinned dependency sources, with zero warnings/errors.
[compiler-manifest.json](evidence/compiler-manifest.json) records source
and compiled-JavaScript hashes. This is not full npm verification. From
`/private/tmp/waxwing-c001-design`, with that private build available:

```text
node docs/plans/2026-10-21-c001-explicit/baseline/run.mjs \
  docs/plans/2026-10-21-c001-explicit/baseline/evidence/results.json
node docs/plans/2026-10-21-c001-explicit/baseline/check-runner.mjs
node docs/plans/2026-10-21-c001-explicit/baseline/run.mjs \
  --replay docs/plans/2026-10-21-c001-explicit/baseline/evidence/results.json
```

All three commands should exit 0 for this baseline. Adding
`--require-uniform` to replay should exit 1. A live run executes 63 Go
programs serially in a private cache; replay invokes no compiler or Go. Each
runtime observation includes exit status, stderr and generated hash.

To recreate the private compiler output, first create
`.build/c001-baseline`, then run:

```text
purs compile 'src/**/*.purs' \
  '/Users/ethan/Desktop/waxwing/.spago/p/*/src/**/*.purs' \
  --output .build/c001-baseline/output --json-errors \
  > .build/c001-baseline/compiler-build.json \
  2> .build/c001-baseline/compiler-build.stderr
```

The original twelve-case candidate set was amended after observations with
six controls, two carrier-stage controls and a source-order control. Its
scope and intended outcomes remain in
[design-candidates.json](evidence/design-candidates.json).
The old always-nonzero runner's final report is retained in
[pre-review-results.json](evidence/pre-review-results.json). Earlier
[initial-harness.json](evidence/initial-harness.json),
[initial-compiler.json](evidence/initial-compiler.json) and
[preflight-results.json](evidence/preflight-results.json) preserve the
harness failure, contract rejections and discovery of parser gaps. Their old
labels describe historical runs, not the current baseline gate.

smallProduct supplies repeated addition only for the small nonnegative
fixture arguments. No full-domain arithmetic law or termination claim is
checked. No compiler implementation, record-solver or policy change is
included.
