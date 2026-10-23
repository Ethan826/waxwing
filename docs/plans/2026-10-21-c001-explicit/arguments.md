# C001 assurance arguments for representation A

Status: arguments for review, 2026-10-23, authorized by the README's
first-core decisions, for the typing, simulation and graph-edge rows of
[assurance](assurance.md). Nothing was built or run: no claim is
*checked*. *Cited*: file:line at 81bf5f8 (cited src equals r0-tranche
HEAD). *Argued*: reasoning here. *Reported*: recorded baseline evidence.
Paths: src/Features/Specialize.purs; Body, Keys, Lower, State, Values in
src/Features/Specialize/; Components, Instantiation, NestedArguments,
Outcomes, Strip in src/Features/Check/; src/Domain/Checked/Internal.purs.
Holes stay open: each argument holds under today's Int representative and
says where it depends on it.

## 1. Typing preservation

**What must be argued.** A adds no typing rule: a dictionary is an R001
closed record of FN001 function values passed as an ordinary parameter
(README:49-52; core.md:99-112). The elaboration of assurance.md:12 is the
identity, `E = e` and `|T| = T` after alias expansion. What remains
(argued): each first-core program is ordinary, typed by today's P001,
FN001, FX001 and R001 rules (the tranche uses only records, functions,
captures and dictionary arguments, README:154-157), and each non-plain
dependency below has a cited rule or stated assumption.

**(a) Aliases, assumptions about the planned R008 slice** (transparent,
parameterized, terminating, no new identity; README:139-147):

- A1. The alias graph is acyclic and each body's free variables are its
  parameters; expansion recurses on types under alias rank, so it ends.
- A2. Expansion precedes checking: checked IR, unification and the key
  `Tuple Int (Array IR.Ty)` (State.purs:47) never see an alias name.
- A3. Parameters are type-sorted, substituted like a declared type's
  (NestedArguments.purs:51-58); record-sorted parameters are not assumed.
- A4 (to show). `exp(T[σ]) = exp(T)[exp∘σ]`.

Induction for A4 (argued), on alias rank, then on `T`. Variables are
immediate; constructors, arrows and records follow componentwise. For
`N(T̄)` with body `B` over `p̄`: `exp(N(T̄)[σ]) = exp(B[p̄ := exp(T̄[σ])])`,
which by hypothesis on the arguments is `exp(B)[p̄ := exp(T̄)[exp∘σ]]`;
since `B` mentions only `p̄` and has lower rank, that is
`exp(N(T̄))[exp∘σ]`. So scheme instantiation (core.md:68-73) commutes
with expansion, and a source derivation maps step for step onto the
expanded program's. Open: the ambient row of an unannotated arrow inside
an alias body (§5).

**(b) Per-stage pure arrows.** An arrow without `with` shares its
signature's rigid ambient row; `with` binds the nearest arrow
(effects-design.md:140-145, 260-267; language.md:414-417). So
`{ combine: a -> a with pure -> a with pure }` has closed empty rows and
is one type in producer and consumer signatures (argued). This fits the
reported split: c7-c9 compile; p3, c1, c3 fail with `Expected a -> a ->
a, found a -> a -> a` (effects-syntax-usability.md:12-31). p1 and p4 mark
only the final stage and compile (reported), so §1 needs only that each
fixture types under today's FX001 rules (kept: README:171-178). Rows are
not in keys (effects-design.md:484; Values.purs:92-93). c7 keeps an
ambient first stage (baseline/README.md:71-73; §5).

**(c) Closures capturing dictionaries** (cited). Lambdas are
monomorphic, typed from the expected arrow, and capture the values of the
locals they read (language.md:265-266, 298-299); their bodies are checked
in the enclosing function (functions-design.md:265-267). In `configured`
and `reverse` the captured `d` keeps its monotype over the caller's rigid
`a` (programs.md:147-150; core.md:74-78). Nothing new is shown.

**(d) Method use** (cited). `d.combine(x, y)` is a field access, then
application of a value, which creates no edge or key
(functions-design.md:259).

**(e) Holes.** An unsolved meta becomes a hole with no typing default
(polymorphism-design.md:115-118; language.md:210-215); specialization
sets every hole to Int (Specialize.purs:46-47; Lower.purs:53). A has no
constraints, so P001's "no constraint mentions a hole"
(polymorphism-design.md:238-241) holds vacuously, and ground substitution
is the ordinary substitution lemma: the specialized program is well typed
at any representative (argued). This uses today's hole behaviour, not the
open reject-all-metas boundary (core.md:157-176).

**Jones correspondence** (argued; sources.md:10-30, 64-72). Evidence
abstraction and application are ordinary abstraction and application over
a record; evidence beta is CBV beta with value substitution. Departures:
no predicates or entailment, so equal shapes interchange (N10, N12);
exactly-once CBV evaluation, outside Jones's typing; evidence kept as a
runtime argument through specialization (sources.md:89-90), the flagged
ADR 014 composition that §2 argues; holes. No new solver or calculus.

## 2. Dynamic preservation (simulation)

**Facts used (cited).** A function key is the declaration and its ground
argument vector only (State.purs:43-47; Keys.purs:59-71;
polymorphism-design.md:226-228), created only at `Call` and `FunctionRef`
(Body.purs:69-71, 84-85; Values.purs:45-52). `copyNode` rebuilds each
node with children in source order, maps `Local id` to itself and keeps
record fields in written order (Body.purs:63-135, lines 68, 121-122);
lambdas keep their locals (Values.purs:104-116). There is no mutable
state (language.md:538).

**Relation (argued).** Fix a key substitution θ (variables to the key's
ground types, holes to Int). `v ~ w` relates source values (unspecialized
checked IR, CBV) to target values: equal scalars; constructors under
`C ↦ ctorAt(C, owner θ)` and records with equal labels, fieldwise; a named
value `f` at `ι` with the output of key `(f, ground(ιθ))`, partials with
related arguments; and a closure `(λp. e, ρ)` made under θ with
`(λp. copyθ(e), ρ')` when `ρ ~ ρ'`.

**Claim (argued).** If `ρ ~ ρ'`, evaluating `e` under `ρ` and `copyθ(e)`
under `ρ'` both return related values, both diverge, or both stop with
the same crash or abort, after the same sequence of stage executions, so
method invocation order agrees. Induction on the source big-step
derivation (coinduction or step indexing for divergence). Cases:

- Local: `ρ(x) ~ ρ'(x)`. A dictionary parameter is a local, so the copy
  reads the caller's value: explicit choices are preserved.
- Call, FunctionRef: the target enters key `(f, ground(ιθ))`, whose body
  is `copyθ'(body)` (Values.purs:51-52), binding related arguments.
- Lambda: the closure takes the current, related environment, so
  captures are preserved (functions-design.md:262-267).
- Apply, Pipe, FieldAccess, RecordLiteral, Match, If, Block: children
  evaluate once in the order of language.md:292-304, 826-829, which the
  copy keeps; stages run at the same applications
  (effects-design.md:269-277).
- Holes: θ sets them to Int; lowering is uniform in types
  (polymorphism-design.md:244-248; functions-design.md:268-271) and a
  method is chosen by value, so no hole selects a dictionary. Acceptance
  can still vary: h1/h2 reject a function stand-in (README:234-242).

**No conflation (argued).** Calls with sum and product at Int share one
output function because the key holds only types, but each call evaluates
its own arguments and binds its own parameters. The shared copy is code
with no state where a first value could persist. Two same-typed
dictionaries can be identified only by adding state or replacing an
argument expression; M1 adds state.

**Evidence** (reported). p4 has one Int copy of `both`, c8/c9 one each
of client, configured and reverse (baseline/README.md:75-79); outputs are
the healthy column below (59-65). Only p4 also agrees with the
independent interpreter, which cannot parse c8/c9 (32, 84).

**Mutant M1, baked-in first dictionary (to be built).** In an isolated
copy, the Go emitted for each specialized generic function gives each
dictionary parameter (a closed record whose fields all have function
type) a package-level cell keyed by (output function, parameter index).
On entry an empty cell stores the incoming value; the parameter is then
rebound to the cell's value. Expected kills:

| Fixture | Healthy | Under M1 |
|---|---|---|
| p1 | `Results(9, 24, 4, 2)` | `Results(9, 9, 9, 2)` |
| p4 | `Pair(Pair(5, 6), Pair(6, 5))` | `Pair(Pair(5, 6), Pair(5, 6))` |
| c8 | `Results(Pair(5, 3), Pair(6, 3), 2)` | `Results(Pair(5, 5), Pair(5, 5), 5)` |
| c9 | `Results(Pair(6, 3), Pair(5, 3), 2)` | `Results(Pair(6, 6), Pair(6, 6), 6)` |

Variant M1′ (assurance.md:69-71, "first Int dictionary for all calls")
keys the cell by the dictionary's IR type alone. Each must make the gate
exit 1 on these cases; a1 and a3 (at most one dictionary per key) are
controls and should be unaffected.

## 3. Graph-edge audit, resolving N7

**Rule (cited).** At each reference inside a call-graph component, each
type argument is a bare variable of the referrer or ground, a hole
counting as ground (polymorphism-design.md:141-157; language.md:230-245).
FN001 makes references at any depth in lambdas edges, called or bare
(functions-design.md:253-258; language.md:305-310). P001 §4.2
(polymorphism-design.md:168-180) needs every key-creating reference to be
a judged edge.

**Construction (cited).** `programWide` runs `instantiationRule` on the
mark-stripped checked program that specialization receives
(Outcomes.purs:82-95; Strip.purs:8-11). Edges come from `callees`, a
`foldCalls` over each body (Instantiation.purs:25-29, 39-43); Tarjan
numbers components (Components.purs:15-17, 45-48); `judgeCall` judges
each intra-component reference (Instantiation.purs:60-73). `foldCalls`
calls `step` at `Call` and `FunctionRef` (90-92, 104-105), recurses into
`Lambda` bodies (106), `RecordLiteral` field values (117;
Internal.purs:158-161) and every other node with expression children
(93-123). The catch-all (124) covers only `Integer`, `Boolean`, `Local`,
`CtorRef`, `UnitValue`, `Text` and `OperationRef`, which hold no
expression (Internal.purs:64-101).

**Correspondence (argued).** Specialization creates function keys only
at `Call` and `FunctionRef` (Body.purs:69-71, 84-85), exactly where
`foldCalls` calls `step`, on the same IR; so §4.2 applies unchanged.

**N7.** A self-reference inside a record-field closure has the path
`RecordLiteral` → field value → `Lambda` → body → `Call f` or
`FunctionRef f`. A `FunctionRef` stored directly in a field has the path
`RecordLiteral` → `FunctionRef f`. Each reaches `step`. With a
`List(a)` instantiation, `admissibleSlot` rejects the reference
(NestedArguments.purs:26-29, 45-49), and the diagnostic is
`PolymorphicRecursion` at the reference (Instantiation.purs:68-70).
**Verdict (i), cited and argued, not checked: edges are created; N7 is
refused as required; no compiler change is needed.**

**Fixtures that would make it checked (to be built).** Add both to
cases.json as compiler `rejected`, E_SPECIALIZATION, problem
`PolymorphicRecursion`, `Recursive call to f changes its type arguments`
at the inner reference (the fixture task confirms syntax and span; the
second shares the first's `List` declaration):

```text
type List(a) = Nil | Cons(a, List(a));
fn f(x: a): { run: Int -> Int with pure } =
  { run: fn(n) => f(Cons(x, Nil)).run(n) };
fn main(): Int = f(1).run(2);
```

```text
fn f(x: a): Int = {
  let box = { step: f };
  box.step(Cons(x, Nil))
};
fn main(): Int = f(1);
```

Run `node docs/plans/2026-10-21-c001-explicit/baseline/run.mjs
docs/plans/2026-10-21-c001-explicit/baseline/evidence/results.json`. Assert
the problem, not just the code: under mutant M2 (delete the `RecordLiteral`
arm, Instantiation.purs:117) the checker should accept both and
specialization should stop at `SpecializationLimit`, also E_SPECIALIZATION.
A control closure recurring at the bare `a` should stay accepted.

## 4. Claims and closure

| Claim | Label | Closed by |
|---|---|---|
| A adds no typing rule; elaboration is the identity | argued, rules cited | review of §1 |
| Alias expansion terminates and commutes with substitution | argued under assumptions A1-A4 | R008 slice design review; alias fixtures when it lands |
| Per-stage `with pure` dictionaries type in both signatures | cited rule; reported c7-c9 | review; CB002 diagnostics follow-up |
| Holes do not affect typing or chosen methods | argued; depends on today's Int representative | representative-independence runs (recorded h1/h2 limit) |
| Specialized program simulates source | argued | review of §2; fixtures p4, c8, c9; M1/M1′ kill |
| Same-typed dictionaries never conflated | argued; key cited | p4 and c8/c9 under M1 |
| Captures preserved | argued; FN001 cited | c8 reverse case; drop-capture mutant (assurance.md:70-71) |
| Every key-creating reference is a judged edge | cited, argued | review of §3; M2 |
| N7 refused without compiler change | cited, argued (verdict i) | n7 lambda and FunctionRef fixtures in the live gate |

## 5. Open points for the author

- R008 must decide whether an unannotated arrow in an alias body takes
  the using signature's ambient row (textual expansion) or a fixed row;
  the meanings differ. §1 holds for either if expansion precedes Resolve.
- Lean candidate, only if review finds §2 insufficient and with separate
  authorization: no conflation under type-only keys with runtime
  dictionary arguments, the small distinctive composition here.
- Hole dependence is in §1(e) and §2's hole case; a future ambiguity
  policy that defaults differently must recheck P001 §6 condition 4.
- c8/c9 have no independent interpreter result (parser gap), so their
  simulation evidence is weaker than p4's.
- Should first-core fixtures make every method stage `with pure` (c7)?
- Suggested build order: n7 fixtures, M2, then M1 and M1′.
