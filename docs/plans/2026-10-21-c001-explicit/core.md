# Proposed core typing and dictionary elaboration

Status: proposed rules, no implementation. `D(C, T)`, `evidence`, `project`,
`forall` and angle-bracket type arguments below are metalanguage or proposed
syntax. Choose source representation A or B in [README](README.md).
[Sources](sources.md) distinguish published rules from adaptations.

## Fragment and environments

```text
T ::= a | Int | Bool | Text | Unit | N(T1,...,Tn)
    | T -> T | { l1:T1,...,ln:Tn } | D(C,T)
S ::= forall a1,...,an. T
```

`N` is a declared constructor with fixed arity; each argument has kind
`Type`. No type variable occurs as an application head. Function arrows and
dictionary method arrows are pure. Records are closed, unique-label
products. Dictionary fields are monotypes; schemes occur only on named
function declarations. Local bindings are monomorphic. This deliberately
avoids the separate local-generalization/effects problem.

`Gamma` holds local monotypes; `Sigma` holds checked named schemes. `K`
holds fixed nominal constructor arities. A finite declaration table
`Methods(C,a)` gives distinct method labels and monotypes, with only `a`
free. Method schemas contain no `D` references; their expansion is finite.
No superclasses, associated types or implicit method defaults occur. A
closed method signature may mention a fixed constructor such as `List(a)`.
In A, `Methods` is an explanatory abbreviation expanded to a record type; in
B it is a source class table. B's class identity is declaration identity in
this one-program core.

Example schema declarations in proposed metalanguage:

```text
type Ordering = Less | Equal | Greater
Methods(Semigroup,a) = { combine: a -> a -> a }
Methods(Eq,a) = { equal: a -> a -> Bool }
Methods(Ord,a) = { compare: a -> a -> Ordering }
Methods(Show,a) = { show: a -> Text }
```

`D(C,T)` means the closed record `Methods(C,a)[T/a]` in A. In B it means a
nominal evidence type whose payload has those fields. Nominal wrappers
introduce class identity only, not the identity of a particular value. Two
different values of `D(Ord,Int)` may disagree everywhere. In A a phantom
carrier can disappear: if `Methods(Tag,a)` is just `{ tag: Unit -> Unit }`,
`D(Tag,Int)` equals `D(Tag,Bool)`. B retains that carrier distinction. The
concrete Eq/Ord/Semigroup examples use their carrier in method arguments, so
changing it changes their record shape.

Programs are finite, checked declarations plus an expression. Recursion is
allowed through annotated named declarations subject to P001's finite
specialization rule, extended by FN001 to value references. There are no
recursive value bindings. Existing ADT/match rules are assumed unchanged.

## Structural rules

Write `Gamma |- e : T => E` for checking with elaborated target `E`. The
target has products, closures, ordinary pure application and explicit type
instantiation on named references before specialization. `|T|` erases source
evidence wrappers to their payload product in B, expands dictionary
abbreviations in A, and maps other types structurally.

- Variable: if `Gamma(x)=T`, elaborate `x` to the same bound variable.
- Named reference: instantiate `Sigma(f)=forall a. T` with a fresh vector
  of metas, or a written type vector in this proposed metalanguage. Check
  written arguments have kind Type; unify with the expected monotype using
  rigid variables and an occurs check. Record the type vector on `f` in
  checked IR. Explicit instantiation can fix a phantom parameter that an
  expanded record shape cannot determine.
- Function: check a lambda against the expected `T -> U`. Bind `x:T`
  monomorphically in `Gamma`, check `e:U => E`, and elaborate to
  `lambda(x:|T|). E`. Multiple parameters are nested arrows. Rigid type
  variables in T/U keep their identity from the enclosing named signature;
  lambdas introduce no type scheme and capture their lexical environment.
- Application: check `e:T -> U` and `v:T`; elaborate to `E V : |U|`.
  Evaluate the callee and arguments once in source left-to-right order.
- Products: check each distinct field against its declared monotype;
  elaborate to a product. A projection at a present label has that field's
  type. Missing/duplicate fields fail checking; no row inference is needed.
- Local binding: check the initializer, bind its monotype in `Gamma`,
  then check the body. Evaluation runs the initializer once. It creates no
  generalized scheme, including when the initializer returns evidence.
- Named definition: skolemize its written scheme, check its body under
  rigid signature variables and monomorphic parameters, and retain that
  scheme only if checking succeeds. Quantified variables do not become
  flexible inside the body. Recursive references instantiate the written
  scheme, subject to the finite-specialization check.

These are proposed checking rules, not a claim that all current checker
paths already implement this fragment. ADT constructors instantiate their
written schemes with fresh metas; matches substitute the scrutinee's data
arguments into constructor fields. Branch results must unify. Primitive
arithmetic, Bool branching and Text literals keep existing semantics.

## Construction and use

For every method `li:Ui(a)` in `Methods(C,a)`, require `Gamma |- ei : Ui(T)
=> Ei`. A uses ordinary records and projection:

```text
Gamma |- { li: ei } : { li: Ui(T) } => { li: Ei }
Gamma |- d : { li: Ui(T) } => E
-----------------------------------------------
Gamma |- d.li : Ui(T) => E.li
```

These schemas stand for the full distinct label set. In A, `D(C,T)` is only
an abbreviation for that record type. No `make` or other special
construction form is introduced. B instead checks the nominal class ID,
carrier and exact field set through its proposed explicit constructor:

```text
Gamma |- evidence C<T>({ li: ei }) : D(C,T) => { li: Ei }
Gamma |- d : D(C,T) => E
-----------------------------------------------
Gamma |- project C.li(d) : Ui(T) => E.li
```

B erases its wrapper after checking. A record with B's payload shape does
not silently become evidence; its explicit constructor must be used. Eq and
Ord share no automatic entailment rule. A named adapter can construct Eq
from an Ord comparison. If an interface includes both, consistency is a law
obligation.

A pure constructor such as `reverse(d)` or `pairEvidence(da,db)` is an
ordinary named function. Its signature fixes all intermediate types.
Constructing an instance does not register it anywhere. No search or
repeated type-directed construction happens during checking.

Every evidence operand is an ordinary explicit parameter, including two
operands of the same dictionary type. Each method occurrence names its
operand. There is no new evidence binder, unqualified method selection,
superclass insertion, constraint reordering or deduplication. The target
abstraction/application is ordinary function abstraction/application.

## Inference boundary and errors

Constructor arities and closed signatures suffice; HKTs are unnecessary.
Checking may use ordinary first-order unification of monotypes. It never
unifies functions by behavior or decides dictionary equivalence. This
proposal checks written signatures; it promises neither complete inference
nor principal schemes for full Waxwing. Within this annotated fragment, a
future checker should accept every derivable program that also passes its
annotation boundary and specialization restriction. That relative
completeness obligation remains unproved.

An omitted operand is an arity/missing-evidence error. A method-type or
effect mismatch is a type error at the field/operand. B also rejects a wrong
nominal class or carrier index. A rejects a carrier mismatch only when it
changes the expanded shape. Two available alternatives cause no ambiguity
when the operand is written.

The proposed checker rejects any type meta left unsolved at the end of body
checking, including those in named-reference instantiation vectors. Rigid
signature variables remain allowed. Otherwise report ambiguity; do not
choose P001's Int hole representative here. This is a general annotation
boundary, not special dictionary-origin tracking in A. It rejects
`discard(lastFor())` and an unconstrained phantom `tag()` reference even if
their result ignores the carrier. The existing P001 allowance for
unconstrained holes remains outside this narrower core; its broader language
policy is unchanged. No claim that the restriction is semantically
necessary, or that these rejected programs are unsound, is made. No new
diagnostic wording or error-code policy is adopted here.

## Evaluation and specialization

Dictionary expressions are ordinary computations returning products of
closures. Purity does not imply termination. Constructing a dictionary can
diverge, so elaboration must preserve evaluation count and order. Creating a
closure does not execute its method body. There is no runtime law check.

Checked IR retains each chosen operand as an expression/value reference,
including captures in returned closures and forwarding through helpers.
Specialization substitutes types throughout the dictionary's field types and
bodies while retaining its value flow. With runtime dictionary parameters,
sum and product can share a function copy at Int. Its key remains
`(declaration ID, full ground type vector)`; the incoming dictionary value
remains a parameter. Neither replacing it with a per-type default nor baking
the first caller's value into that shared copy is valid.

No evidence values, closure environments, method results or policy IDs enter
specialization keys. Thus runtime construction of unboundedly many
dictionaries does not itself require unbounded code generation. Every named
reference inside a method constructor or nested closure still adds a
P001/FN001 graph edge. For example, recursive `f(a)` referring to
`f(List(a))` through an evidence field is still rejected. An implementation
must audit desugaring and all such references before reusing P001's bound.
Value recursion may diverge even when code generation terminates.

The intended preservation statement is in [assurance](assurance.md). Nothing
here proves the combined Waxwing checker, effects or backend.
