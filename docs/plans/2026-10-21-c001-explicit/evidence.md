# C001 assurance evidence: fixtures and mutants

Status: specifications and results, 2026-10-23, for the checks that
[arguments](arguments.md) names. Results are under "Runs" below; the
dedupe and drop-capture defects remain unbuilt. Mutant patches are kept in
baseline/evidence/ and applied only to scratch copies of the compiler.
Authorized by the author on 2026-10-23: the N7 fixtures and M2 first, then
M1, M1′, a shared-copy check and capture controls. No Lean work and no
language-semantics change.

## N7 fixtures and graph-edge mutants

Two self-contained sources, each with its own List declaration, recorded
in the baseline as compiler `rejected`, E_SPECIALIZATION, problem
`PolymorphicRecursion`, `Recursive call to f changes its type arguments`
at the inner reference. A lambda in a record field:

```text
type List(a) = Nil | Cons(a, List(a));
fn f(x: a): { run: Int -> Int with pure } =
  { run: fn(n) => f(Cons(x, Nil)).run(n) };
fn main(): Int = f(1).run(2);
```

A `FunctionRef` stored in a record:

```text
type List(a) = Nil | Cons(a, List(a));
fn f(x: a): Int = {
  let box = { step: f };
  box.step(Cons(x, Nil))
};
fn main(): Int = f(1);
```

A control closure that recurs at the bare `a` should stay accepted. The
live gate compares the whole diagnostic, so the problem name is checked,
not just the code.

- M2 deletes the `RecordLiteral` arm of `foldCalls`
  (src/Features/Check/Instantiation.purs:117). Both fixtures should then
  pass the checker and stop in specialization at `SpecializationLimit`,
  also E_SPECIALIZATION.
- The Lambda-arm deletion (line 106) should miss the first fixture only.

## Dictionary-conflation mutants M1 and M1′

In an isolated copy, the Go emitted for each specialized function,
generic or monomorphic, gives each dictionary parameter a package-level
cell keyed by (output function, parameter index). A dictionary parameter
is a declared parameter whose IR type is a closed record of at least one
field, all of function type; `{}` is not one. Lifted lambda, block and
match helpers are left alone. On entry an empty cell stores the incoming
value; the parameter is then rebound to the cell's value. M1′
(assurance.md:70-71, "first Int dictionary for all calls") keys the cell
by the parameter's IR type alone. Covering monomorphic functions changes
no listed outcome.

| Fixture | Healthy | Under M1 | Under M1′ |
|---|---|---|---|
| p1 | `Results(9, 24, 4, 2)` | `Results(9, 9, 9, 2)` | as M1 |
| p4 | `Pair(Pair(5, 6), Pair(6, 5))` | `Pair(Pair(5, 6), Pair(5, 6))` | `Pair(Pair(5, 5), Pair(5, 5))` |
| c8 | `Results(Pair(5, 3), Pair(6, 3), 2)` | `Results(Pair(5, 5), Pair(5, 5), 5)` | as M1 |
| c9 | `Results(Pair(6, 3), Pair(5, 3), 2)` | `Results(Pair(6, 6), Pair(6, 6), 6)` | as M1 |

Each must make the gate exit 1 on these cases. a1 (discard's parameter
lowers to a function record, called once) is an unaffected control. a3
is not one, as no function in it takes a dictionary parameter; a new
control replaces it: a generic function with one dictionary parameter
that receives a single dictionary value.

c8 and c9 compare only against compiler-recorded output, which is not an
independent execution model. They stay unchanged, and new controls that
the interpreter parses must exercise returned captures and two different
same-typed dictionaries. A shared-copy check has sum and product Int
dictionaries reach one specialized copy and give 5 and 6.

## Other defects of assurance.md:70-72

Specified, not built; their rows in arguments.md §4 stay open.

- Dedupe: with two dictionary parameters of equal IR type, every use of
  the later reads the earlier. p4 should give
  `Pair(Pair(5, 5), Pair(6, 6))`.
- Drop capture: a lifted lambda receives each dictionary-typed captured
  local as its Go zero value. c8's first `configured` call should panic
  on a nil function.

## Expected outcomes, fixed before the runs

New baseline sources, 2026-10-23. "Default" is the Int-representative Go
output; "interp." the independent interpreter. Under M1 and M1′ the
default output is compared; the gate also flags changed Go hashes, so
an unaffected control is judged by its output, not by the gate's exit.

| Case | Compiler | Default | Interp. | M1 | M1′ | M2 | Lambda arm |
|---|---|---|---|---|---|---|---|
| n7a-record-closure | PolymorphicRecursion | none | not run | | | SpecializationLimit | SpecializationLimit |
| n7b-record-reference | PolymorphicRecursion | none | not run | | | SpecializationLimit | unchanged |
| n7c-bare-recursion | accepted | `0` | `0` | | | unchanged | unchanged |
| a5-one-dictionary | accepted | `15` | `15` | `15` | `15` | | |
| r1-returned-captures | accepted | `Pair(5, 6)` | same | `Pair(5, 5)` | `Pair(5, 5)` | | |
| r2-source-order-captures | accepted | `Pair(5, 6)` | same | `Pair(6, 6)` | `Pair(6, 6)` | | |
| s1-shared-copy | accepted, one Int `client` key | `Pair(5, 6)` | same | `Pair(5, 5)` | `Pair(5, 5)` | | |
| q1-pure-choices | accepted | as p1 | parse error | as p1 | as p1 | | |
| q4-pure-two-operands | accepted | as p4 | parse error | as p4 | as p4 | | |
| q7-pure-construction | accepted | `Results(5, 20, 6, 2)` | parse error | unchanged | unchanged | | |

r1 and r2 return closures that capture two different same-typed
dictionaries and call them after both exist; r2 creates them in the
reverse source order. They use the `(a, a) -> a with pure` spelling that
p1 and p4 use, which the interpreter parses. q1, q4 and q7 are the
canonical all-stages-pure rewrites of p1, p4 and c7; c7 is unchanged.
q7's dictionaries reach `reverse` once and `statsEvidence` takes a record
of records, so M1 should not change it. Every existing case should keep
its output under M1 and M1′ except p1, p4, c8 and c9.

## Runs

Setup, reproducible from this branch. The baseline pins compiler sources
at c341109 (evidence/compiler-manifest.json), which differ from this
branch's src in 54 files, so the gate ran in a scratch tree:
`git archive c341109 src scripts test package.json` plus this branch's
C001 directory, built with the baseline README's `purs compile` command
(purs 0.15.16, 0 errors, 0 warnings; Go 1.26.4, Node 26.6.0). The two
graph-edge functions touched by the mutants are identical at c341109 and
at this branch apart from an import and an error-kind argument. Before
any change the 24-case live gate exited 0 against that build.

Every tracked `.wxw` file joins the R0 corpus (test/r0-corpus.mjs), so
each new source was re-pinned in test/fixtures/r0/corpus-manifest.json
and appended to test/fixtures/r0/first-diagnostic.json by that file's
extension rule: outcomes computed with this branch's compiler (src as at
0710fa6) and confirmed byte-equal with a scratch build of 5d6b1cb. The
seven corpus tests (r0-corpus, r0-hand and the five corpus-wide serial
tests) pass after each extension.

### N7 fixtures (checked)

n7a-n7c were added to cases.json from the live observations after
comparison with the table above; every expectation held. n7a is
rejected at `f(Cons(x, Nil))` (line 4, columns 19-34), n7b at the bare
`f` in `{ step: f }` (line 4, columns 21-22), both E_SPECIALIZATION,
`PolymorphicRecursion`, `Recursive call to f changes its type
arguments`. n7c prints `0` for all five stand-ins and in the
interpreter. Commands, from the scratch tree:

```text
node docs/plans/2026-10-21-c001-explicit/baseline/run.mjs \
  docs/plans/2026-10-21-c001-explicit/baseline/evidence/results.json
node docs/plans/2026-10-21-c001-explicit/baseline/check-runner.mjs
node docs/plans/2026-10-21-c001-explicit/baseline/run.mjs \
  --replay docs/plans/2026-10-21-c001-explicit/baseline/evidence/results.json
```

Exits 0, 0 and 0 with 27 cases (`Baseline differences: 0`); replay
with `--require-uniform` exits 1 (h1, h2), as before.

### M2 and the Lambda-arm deletion (checked)

Each mutant is one deleted line of
src/Features/Check/Instantiation.purs in its own scratch copy, rebuilt
with the same command (0 errors, 0 warnings). The patches, which apply
with `patch -p1` to c341109's src, are baseline/evidence/m2.patch and
lambda-arm.patch:

```text
M2, line 117 deleted:
  Checked.RecordLiteral fields → foldl recur found (Checked.fieldValues fields)
Lambda arm, line 106 deleted:
  Checked.Lambda _ body → recur found body
```

The live gate exits 1 under both. The case differences, apart from the
expected source and build drift of that one module:

| Mutant | Case | Observed compiler outcome |
|---|---|---|
| M2 | n7a | E_SPECIALIZATION `SpecializationLimit`, `More than 10000 specializations` |
| M2 | n7b | E_SPECIALIZATION `SpecializationLimit`, same message |
| Lambda arm | n7a | E_SPECIALIZATION `SpecializationLimit`, same message |
| Lambda arm | n7b | unchanged: `PolymorphicRecursion` |

No other case differs under either mutant, n7c included, so only the
N7 fixtures detect these defects, and only because the gate compares
the problem and message: the error code alone is unchanged.

### New controls and canonical fixtures (checked)

a5, r1, r2, s1, q1, q4 and q7 were added to cases.json from a live run
after comparison with the table above. One expectation failed first and
the source was amended before pinning: r1 and r2 as first written gave
`configured` the result `a -> a with pure`, and the compiler rejected the
returned lambda with E_TYPE `Expected a -> a, found a -> a` (line 17), the
per-stage row mismatch of CB002, since `client` applies a dictionary whose
first stage keeps an ambient row. The result is now the ambient `a -> a`;
every other line is unchanged, and the amended sources met every
expectation: the listed outputs for all five stand-ins, the same output
in the interpreter for a5, r1, r2 and s1, and parse errors there for q1,
q4 and q7 (`expected } at token 95`, `token 78`, `expected ) at token
74`). s1's function keys hold one `client` copy at `[TInt]`, used with
sum and with product: the shared-copy check. The live gate, check-runner
and replay exit 0 with 34 cases; `--require-uniform` exits 1 (h1, h2).

### M1 and M1′ (checked)

Scratch copies of the c341109 compiler with baseline/evidence/m1.patch
or m1-prime.patch applied to src/Format/Go.purs (0 errors, 0 warnings).
Each emits `var waxwingM1Cells = map[string]any{}` and, at the top of
every emitted function, one line per dictionary parameter, for example
in p4's `both`:

```text
if waxwingM1v, waxwingM1ok := waxwingM1Cells["waxwingFn5/0"]; waxwingM1ok {
  waxwingLocal0 = waxwingM1v.(waxwingRec0) } else {
  waxwingM1Cells["waxwingFn5/0"] = waxwingLocal0 }
```

(one line in the output, wrapped here). M1′ keys the cell by the Go
record type (`"waxwingRec0"`) instead. The live gate exits 1 under each.
Every case whose output changed, the same for all five stand-ins:

| Case | Healthy | M1 | M1′ |
|---|---|---|---|
| p1 | `Results(9, 24, 4, 2)` | `Results(9, 9, 9, 2)` | `Results(9, 9, 9, 2)` |
| p4 | `Pair(Pair(5, 6), Pair(6, 5))` | `Pair(Pair(5, 6), Pair(5, 6))` | `Pair(Pair(5, 5), Pair(5, 5))` |
| c8 | `Results(Pair(5, 3), Pair(6, 3), 2)` | `Results(Pair(5, 5), Pair(5, 5), 5)` | same as M1 |
| c9 | `Results(Pair(6, 3), Pair(5, 3), 2)` | `Results(Pair(6, 6), Pair(6, 6), 6)` | same as M1 |
| r1 | `Pair(5, 6)` | `Pair(5, 5)` | `Pair(5, 5)` |
| r2 | `Pair(5, 6)` | `Pair(6, 6)` | `Pair(6, 6)` |
| s1 | `Pair(5, 6)` | `Pair(5, 5)` | `Pair(5, 5)` |
| q1 | as p1 | as p1 under M1 | as p1 under M1′ |
| q4 | as p4 | as p4 under M1 | as p4 under M1′ |

Each matches the expectation fixed above and in
[arguments](arguments.md). Every other case keeps its output: a1, a5,
c7 and q7 run with a cell in place (their Go contains the cell line) and
still print `7`, `15` and `Results(5, 20, 6, 2)`, so the controls are
live, not vacuous. Their gate rows differ only in the Go hash, which
the added package variable changes in every program. Rejections are
unchanged.

What this shows and does not: the baseline detects a backend that bakes
in the first dictionary per function or per type, including through
returned captures and across source order, and r1, r2 and s1 detect it
with an interpreter result alongside. It says nothing about the dedupe
and drop-capture defects, which remain unbuilt, or about defects that
keep no state.
