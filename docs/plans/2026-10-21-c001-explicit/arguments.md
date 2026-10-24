# C001 assurance arguments for representation A

Status: arguments for review, 2026-10-23, for the typing, simulation and
graph-edge rows of [assurance](assurance.md), corrected the same day after an
independent review (F1, F2, A3, B1-B3, N1-N5). No Lean work and no
language-semantics change follow. *Cited*: file:line at r0-tranche 83279ed; the
cited src files are identical at this branch's base 0710fa6, where
docs/language.md runs three lines later. *Argued*: reasoning here. *Reported*:
recorded baseline evidence. *Checked*: a run recorded in
[evidence](evidence.md). *Open*: not argued. Paths: Body, Keys, Lower, State,
Values in src/Features/Specialize/; Components, Instantiation, NestedArguments,
Outcomes, Strip in src/Features/Check/; Internal is
src/Domain/Checked/Internal.purs. Each argument covers today's hole
representatives only: type-sorted holes become Int, record-sorted holes the
empty rest.

## 1. Typing preservation

**What must be argued.** A adds no typing rule: a dictionary is an R001 closed
record of FN001 function values passed as an ordinary parameter (README:49-52;
core.md:99-112). The elaboration of assurance.md:12 is the identity, `E = e`
and `|T| = T` after alias expansion. What remains (argued): each first-core
program is typed by today's P001, FN001, FX001 and R001 rules (records,
functions, captures and dictionary arguments only, README:154-157), and each
non-plain dependency below has a cited rule or stated assumption.

**(a) Aliases** (planned R008: transparent, parameterized, terminating,
no new identity; README:139-147). Decided: an arrow in an alias body has
a fixed definition-site meaning, pure in the initial core. Assumptions:

- A1. The alias graph is acyclic; a body's free variables are its
  parameters.
- A2. Expansion runs before Resolve and yields row-explicit types: each
  alias arrow carries its definition-site row (closed and empty in the
  initial core), never the using signature's ambient row, which textual
  expansion would give it. R008 needs a rule stating this. Checked IR,
  unification and the key (State.purs:47) never see an alias name.
- A3. Parameters are type-sorted and substituted as types are
  (src/Domain/Type/Core.purs:150-152); record-sorted ones are not assumed.
- Definition. `exp` is homomorphic on variables, constructors, arrows
  (rows kept) and records, and `exp(N(T̄)) = exp(B)[p̄ := exp(T̄)]` for an
  alias `N(p̄) = B`. An alias's rank is 1 plus the highest rank of the
  aliases in its body (0 if none), well defined by A1. `exp` terminates
  by (highest alias rank, then size): `B` has a lower top rank; each `Tᵢ`
  is smaller, with no higher rank.
- A4 (to show). `exp(T[σ]) = exp(T)[exp∘σ]` for substitutions `σ` of
  types, record rests and effect rows.

Proof of A4 (argued), by induction on that measure. Variables are
immediate; constructors, arrows and records go componentwise; a rest or
row variable outside an alias maps as a variable does, and a fixed alias
row is closed, so `σ` leaves it unchanged. For `N(T̄)`:
`exp(N(T̄)[σ]) = exp(B)[p̄ := exp(T̄[σ])] = exp(B)[p̄ := exp(T̄)[exp∘σ]]` by
hypothesis on each `Tᵢ`. The free variables of `exp(B)` are among `p̄`
(A1; `exp` adds none), so this is `exp(N(T̄))[exp∘σ]`. Scheme
instantiation (core.md:68-73) commutes with expansion, and a source
derivation maps step for step onto the expanded program's.

**(b) Per-stage pure arrows.** An arrow without `with` shares its signature's
rigid ambient row; `with` binds the nearest arrow (effects-design.md:140-145,
260-267; language.md:414-417). So
`{ combine: a -> a with pure -> a with pure }` has closed empty rows and is
one type in producer and consumer signatures (argued). This fits the
reported split: c7-c9 compile; p3, c1, c3 fail with
`Expected a -> a -> a, found a -> a -> a` (effects-syntax-usability.md:12-31).
Rows are not in keys (effects-design.md:484; Values.purs:92-93). Decided:
canonical positive fixtures make every method stage `with pure`; c7, whose
Stats result keeps an ambient first stage (baseline/README.md:71-73), stays as
a separate characterization test. p1 and p4 mark only the final stage and
compile (reported); their all-pure rewrites q1, q4 and q7 (for c7) emit Go
byte-identical to p1, p4 and c7, so rows are erased (checked,
[evidence](evidence.md)). a5, r1, r2 and s1 deliberately keep p1's
non-canonical spelling so that the interpreter can parse them.

**(c) Closures capturing dictionaries** (cited). Lambdas are monomorphic, typed
from the expected arrow, and capture the values of the locals they read
(language.md:265-266, 298-299), checked in the enclosing function
(functions-design.md:265-267). In `configured` and `reverse` the captured `d`
keeps its monotype over the caller's rigid `a` (programs.md:147-150;
core.md:74-78). **(d) Method use** (cited). `d.combine(x, y)` is a field
access, then an application: no edge or key. functions-design.md:259 covers
applying a local; `foldCalls` recurses through FieldAccess and Apply without
`step` (Instantiation.purs:101-102, 118).

**(e) Holes.** An unsolved meta becomes a hole with no typing default
(polymorphism-design.md:115-118; language.md:210-215). Specialization sets
type-sorted holes to Int and record-sorted ones to the empty rest
(Specialize.purs:46-47; Lower.purs:53; Values.purs:78-82, 97-100). A adds no
class constraints, but record, printing (Printable, rechecked at
specialization) and comparison obligations remain, and h1/h2 show that the
representative changes acceptance (README:234-242). The claim is limited to
today's representatives: with every applicable obligation discharged there, the
ordinary substitution lemma makes the specialized program well typed (argued).
Representative independence is not established. Hole defaulting is conditional
and separate (README, 2026-10-23); the reject-all-metas boundary stays open
(core.md:157-176).

**Jones correspondence** (argued; sources.md:10-30, 64-72). Evidence
abstraction and application are ordinary abstraction and application over a
record; evidence beta is CBV beta with value substitution. Departures: no
predicates or entailment, so equal shapes interchange (N10, N12); exactly-once
CBV evaluation, outside Jones's typing; evidence kept as a runtime argument
through specialization (sources.md:89-90), the flagged ADR 014 composition that
§2 argues; holes. No new solver or calculus.

## 2. Dynamic preservation (simulation)

**Fragment.** Source: the unspecialized checked IR of a whole program with a
monomorphic entry, evaluated call by value, big step, children once and left to
right. Target: its specialized IR under the same evaluator, with the same
primitives. Nodes (Internal.purs:64-101): Integer, Boolean, Text, UnitValue,
Local, FunctionRef, CtorRef, Call, Construct, Add, Concat, Compare, If, Match,
Apply, Lambda, Pipe, Block and the five record nodes. Excluded: Print, Show,
Interpolate and Crash, which render or emit, and OperationRef, Perform,
Handler, With, Handle and Fail; an output-trace observation for them is open.
Observation: the entry's result, up to the relation below. The IR→Go gap is
open; Go outputs are evidence only.

**Facts used (cited).** A function key is the declaration and its ground
argument vector only (State.purs:43-47; Keys.purs:59-71;
polymorphism-design.md:226-228), created only at `Call` and `FunctionRef`
(Body.purs:69-71, 84-85; Values.purs:45-52). `fillFunction` builds a key's body
(Body.purs:31-53) when the worklist reaches it (Specialize.purs:104-118).
`copyNode` keeps children in source order, maps `Local id` to itself and keeps
record fields in written order (Body.purs:63-135, lines 68, 121-122). No
mutable state (language.md:538).

**Relation (argued), indexed by creation key.** For a key κ, θκ sends its
function's variables to κ's ground types and holes to today's representatives.
`v ~ w`: equal scalars; a constructor value made under κ with
`ctorAt(C, owner θκ)`, fieldwise; records with equal labels, fieldwise; a
named value or partial `f` at `ι` made under κ with key `(f, ground(ιθκ))`'s
output and related arguments; a closure `(λp. e, ρ)` made under κ with
`(λp. copyθκ(e), ρ')` when `ρ ~ ρ'`. A value keeps its creation key wherever
it flows, so a closure made in one copy and called from another stays related.

**Claim (argued for terminating runs).** If `ρ ~ ρ'` and `e`, in a body of key
κ, returns `v` under `ρ`, then `copyθκ(e)` returns some `w ~ v` under `ρ'`,
after the same sequence of stage executions, so method invocation order agrees.
Induction on the source derivation. Open: divergence and abort are not argued
(a coinductive big-step or step-indexed relation).

- Local: `ρ(x) ~ ρ'(x)`. A dictionary parameter is a local, so the copy
  reads the caller's value: explicit choices are preserved.
- Parameter binding: argument `i` binds `LocalId i` in both. Resolve
  numbers parameters by position (Resolve.purs:146-148); the copy keeps
  parameter order and local ids (Body.purs:39, 68).
- Call, FunctionRef: the target enters key `(f, ground(ιθκ))` and binds
  the related arguments, evaluated left to right in both.
- Field selection: FieldAccess keeps its label (Body.purs:123-124) and
  related records relate by label. Update, extension and removal keep
  labels too (125-130). Go's sorted-label layout is in the IR→Go gap.
- Lambda, captures: the copy keeps parameter and body local ids
  (Values.purs:104-116); the closure takes the current related
  environment (functions-design.md:262-267). In Go a lambda or block is
  lifted to a top-level function receiving its free locals as parameters
  (src/Format/Go/Lambda.purs:1-9, Block.purs:1-13), and a local is
  declared only as a parameter or one typed `var` (Block.purs:88-94;
  Handle.purs:160-165). That no local is reassigned is read, not checked;
  it lies in the IR→Go gap declared open above.
- Apply, Pipe, Construct, record literals, Add, Compare, Match, If, Block:
  children evaluate once in the order of language.md:292-304, 823-826,
  which the copy keeps; stages run at the same applications
  (effects-design.md:269-277).
- Holes, as in §1(e): lowering is uniform in types
  (polymorphism-design.md:244-248; functions-design.md:268-271) and a
  method is chosen by value, so no hole selects a dictionary.

**No conflation within this copy relation (argued).** Calls with sum and
product at Int share one output function because the key holds only types, but
each call evaluates its own arguments and binds its own parameters; the shared
copy has no state where a first value could persist. Within this relation, and
only there, two same-typed dictionaries can be identified only by adding state
or replacing an argument expression.

**Evidence.** Reported: p4 has one Int copy of `both`, c8/c9 one each of
client, configured and reverse (baseline/README.md:75-79). Checked
([evidence](evidence.md), c341109 compiler): s1 gives `Pair(5, 6)` from one Int
`client` copy; r1/r2 return closures over sum and product and agree with the
interpreter. Mutants M1 and M1′ add exactly that state; detection is the
per-case output change, confined to p1, p4, c8, c9, r1, r2, s1, q1 and q4 with
the expected values (q1/q4 share p1/p4's Go, so add no independent detection);
a1, a5 and q7 keep theirs. Dedupe and drop-capture (assurance.md:70-72) are
specified, not built.

## 3. Graph-edge audit, resolving N7

**Rule (cited).** At each reference inside a call-graph component, each type
argument is a bare variable of the referrer or ground, a hole counting as
ground (polymorphism-design.md:141-157; language.md:230-245). FN001 makes
references at any depth in lambdas edges, called or bare
(functions-design.md:253-258; language.md:305-310). P001 §4.2
(polymorphism-design.md:168-180) needs every key-creating reference to be a
judged edge.

**Construction (cited).** `programWide` runs `instantiationRule` on the
mark-stripped checked program that specialization receives
(Outcomes.purs:82-95; Strip.purs:8-11). Edges come from `callees`, a
`foldCalls` over each body (Instantiation.purs:25-29, 39-43); Tarjan numbers
components (Components.purs:15-17, 45-48); `judgeCall` judges each
intra-component reference (Instantiation.purs:60-73). `foldCalls` calls `step`
at `Call` and `FunctionRef` (90-92, 104-105), recurses into `Lambda` bodies
(106), `RecordLiteral` field values (117; Internal.purs:158-161) and every
other node with expression children (93-123). The catch-all (124) covers only
`Integer`, `Boolean`, `Local`, `CtorRef`, `UnitValue`, `Text` and
`OperationRef`, which hold no expression (Internal.purs:64-101).

**Correspondence (argued).** Specialization creates function keys only
at `Call` and `FunctionRef` (Body.purs:69-71, 84-85), exactly where
`foldCalls` calls `step`, on the same IR; so §4.2 applies unchanged.

**N7.** A self-reference in a record-field closure has the path `RecordLiteral`
→ field → `Lambda` → body → `Call f`; a `FunctionRef` stored in a field has
`RecordLiteral` → `FunctionRef f`. Each reaches `step`. At a `List(a)`
instantiation `admissibleSlot` rejects the reference
(NestedArguments.purs:26-29, 45-49) with `PolymorphicRecursion`
(Instantiation.purs:68-70). **Verdict (i): edges are created; N7 is refused as
required; no compiler change is needed.**

**Checked** ([evidence](evidence.md), c341109 compiler). Baseline cases n7a (a
lambda in a record field) and n7b (a `FunctionRef` stored in a record) are
rejected with E_SPECIALIZATION `PolymorphicRecursion`; the control n7c,
recurring at the bare `a`, prints `0`. Deleting the `RecordLiteral` arm (M2,
Instantiation.purs:117) turns both rejections into `SpecializationLimit`;
deleting the Lambda arm (106) turns n7a's. Detection is these per-case
differences, confined to n7a/n7b; the gate's exit 1 alone proves nothing, as
any mutant changes a pinned src hash.

## 4. Claims and closure

| Claim | Label | Closed by |
|---|---|---|
| A adds no typing rule; elaboration is the identity | argued, rules cited | review of §1 |
| Alias expansion terminates and commutes with substitution | argued under A1-A3 and the fixed-row decision | R008 rule for definition-site rows; alias fixtures when it lands |
| Per-stage `with pure` dictionaries type in both signatures | cited rule; reported c7-c9; checked q1, q4, q7 | review; CB002 diagnostics follow-up |
| Holes do not affect typing or chosen methods | Int representative only (empty rest for records); independence open | conditional hole-defaulting follow-up, separate |
| Specialized program simulates source | argued for terminating runs in the §2 fragment; divergence, aborts, effects and IR→Go open | review of §2; p4, c8, c9, r1, r2, s1; M1/M1′ killed (checked) |
| Same-typed dictionaries never conflated | argued within this copy relation; key cited; M1/M1′ killed (checked) | review of §2 |
| Captures preserved | argued; FN001 cited; Go side read only; r1/r2 checked with interpreter agreement | drop-capture mutant (not built: open) |
| Equal-typed operands not deduplicated | specified only | dedupe mutant (not built: open) |
| Every key-creating reference is a judged edge | cited, argued; two arms checked by mutants | review of §3; M2 and Lambda-arm mutants killed |
| N7 refused without compiler change | checked (verdict i), c341109 compiler | n7a, n7b, n7c in the live gate |

## 5. Open points and decisions

- Decided (§1): alias arrows keep their definition-site row (R008 rule
  and fixture needed); no Lean work now; all-pure canonical fixtures.
- Hole defaulting is a conditional, separate follow-up; a policy that
  defaults differently must recheck P001 §6 condition 4.
