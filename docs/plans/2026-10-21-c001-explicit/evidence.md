# C001 assurance evidence: fixtures and mutants

Status: specifications, 2026-10-23, for the checks that
[arguments](arguments.md) names; nothing here has been built or run yet.
Mutants are built only in scratch copies of the compiler and never
committed. Authorized by the author on 2026-10-23: the N7 fixtures and
M2 first, then M1, M1′, a shared-copy check and capture controls. No Lean
work and no language-semantics change.

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
