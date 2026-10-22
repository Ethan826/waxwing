# Per-name witnesses and termination: the interface statements

Date: 2026-10-21. Base: 67ba706; revised after the reviews of 88c052d
(revision log at the end). Authority: dossier §18.66, the design
tranche ("termination and per-name witness statements, coordinated
through one interface owner"); decisions 2, 3, 4, 5 and 8 bind this
document. Planning basis: research/division-campaign/remedy/
requirements.md, revision 2 (here "requirements"), especially §3
(T1-T4), §4.2-§4.3 and §9.

**Documents and statements only.** No compiler change, no prototype, no
proof, no representation implemented, no selection rule chosen. Labels:
**cited** (file:line or section, read at 67ba706), **argued**
(reasoning, unchecked), **proposed** (a design statement awaiting
review). Nothing here is **checked**; where a cited source holds a
proved theorem, the citation says so. "Pending author Q<n>" marks a
proposed default that waits for the author's ruling on the
reconciliation review's question Q<n>; it is not decided here.

**This file is the canonical source** for the names defined in §0. The
parallel streams (T-R0a, T-R0b, T-R0e, CX) use these definitions and
point here; a stream that needs a different shape raises it with the
interface owner rather than redefining it (§5). Problem variables,
their identities and the `vars` map are T-R0b's (r0/recorder-rules.md
§2.3, §5.2, §6); this file uses them and does not redefine them.

## 0. Canonical vocabulary (proposed)

| Name | Meaning | Defined in |
|---|---|---|
| `Var` | a problem variable, by T-R0b's canonical name `⟨p, role⟩` (recorder-rules §2.3) | T-R0b |
| `NameId` | a witness-bound name, numbered per declaration | §1.1 |
| `Named n` | the marker: a third constructor of `Open`, beside `Rigid` and `Hole` | §1.1 |
| `NameEntry` | what one name binds: sort, origin, site, term, producer | §1.2 |
| `WitnessMeta` | a declaration's names, in dependency order | §1.2 |
| `RowTerm`, `SetTerm`, `TyTerm` | the term grammar a name's value is written in | §1.3 |
| Sc1-Sc3 | the term-scope rules | §1.3 |
| `eval_k` | evaluation of a term at key `k` | §1.3 |
| `Field r l` | the reserved field-reference node (decision 8; not implemented) | §1.4 |
| hole contract | when a flexible variable may stay a `Hole` | §1.5 |
| `Witness` | `{ bindings, names }`: a compilation witness | §1.6 |
| `Binding` | what `bindings` maps a non-auxiliary flexible variable to | §1.6 |
| `Compilation` | `Witnessed Witness` or `NoWitness NoWitnessReason` | §1.6 |
| `Basis` | P's judgement of a variable in a `split` site's slots | §1.7 |
| `κ` | key arguments read as a rigid assignment `θR` | §2.2 |
| `Pool`, `U_row`, `U_ty`, `U_C(E)` | the finite key universe of a component | §2.2 |
| `Adm_W`, CS | the admissibility rule over names; component-safe terms | §2.3 |
| `AdmStatus` | `Admissible`, `Inadmissible`, `AdmittedPendingR019` | §2.3 |
| FK-0, FK-W, FK-U | the finite-reachable-key statements | §2.4, §2.7 |
| `aux_k` | evaluation of auxiliary variables from their defining atoms | §3.2 |
| RC1-RC6 | the ground re-check's obligations | §3 |
| K, V, Lay, U, R, T, Adapt-N, Cov | correspondence statements | §4 |
| `Lowerable` | the conjunction that authorizes lowering | §5.1 |

## 1. Per-name typed witness metadata (decision 4)

### 1.1 Where names live: a marker in `Open`, not a new `Ty`

Cited facts:

- `Ty v` is parametric in its variables; `TVar v` and a record's
  `tails ∷ Array v` are the only places a variable occurs
  (src/Domain/Type/Core.purs:56-65; src/Domain/Type/Record.purs:28).
- The checked IR instantiates it at `Open = Rigid VarId | Hole Int`
  (src/Domain/Checked/Internal.purs:25), in every position a divided
  part reaches: expression types, parameters, results, instantiations,
  lambda parameters, patterns and rest binders (Internal.purs:32,
  45-56, 112, 122, 136). Requirements §4.1 (cited) relies on this.
- During checking, `Hole n` is also the checker's meta (for example
  src/Features/Check/Apply.purs:180-182, FreshRecord.purs:32); after
  checking, an unsolved meta is a hole, which specialization fixes to
  the representative or the empty rest (src/Features/Specialize/
  Lower.purs:52, :62; Values.purs:96-99).

Proposed: **`data Open = Rigid VarId | Hole Int | Named NameId`.** A
witness-bound name is `TVar (Named n)` in a type position and a tail
`Named n` in a record row. `Ty`'s constructors do not change (decision
3: "names inside existing `Ty`"). Names are introduced only after the
declaration's verdict and its compilation witness (§1.6), never during
checking: the checker's metas stay `Hole`, and the recorded problem
refers to problem variables, not names (§5.2).

**T1, how the marker is distinguishable (argued).** PureScript rejects
a non-exhaustive `case` without a `Partial` constraint, so every
function that matches on `Open`'s constructors must decide `Named`
explicitly: today `rigid` (src/Features/Check/Instantiation.purs:
131-134), `lowerType`'s two arms and `tail` (Lower.purs:51-52, 60-62),
`slotType` (Values.purs:98), and the diagnostic printer (src/Features/
Check/TypeName.purs:77, 87, 194). **Exhaustiveness does not cover code
generic in `v`.** Two such sites decide R010 today and would accept a
name silently:

- `admissible` returns true for every `TVar _`
  (src/Features/Check/NestedArguments.purs:26-29), so a type slot
  `TVar (Named n)` would pass as a bare variable;
- `bareRow` accepts any `TRecord { fields: [], tails }` with a
  non-empty tail list (NestedArguments.purs:78-81), so `{ ...n }`, and
  any composition of tails, would pass as bare.

So T1 needs, besides the constructor, the audit obligation **T1-a**
(proposed): every generic predicate that R010, lowering or the ground
re-check uses to classify variables takes an explicit classifier over
`Open` (as `admissibleSlot` already takes `variable`), and the bare
cases test the classifier, not the shape alone.

### 1.2 The data shape

Proposed, as a sketch (not code; names fixed, layout free):

~~~text
type NameEntry =
  { sort     ∷ TypeSort | RecordSort
  , origin   ∷ Var            -- the flexible variable it binds
                              -- (T-R0b's canonical name ⟨p, role⟩)
  , site     ∷ Path           -- the reference whose instantiation
                              -- introduced it: origin's path p;
                              -- spans are metadata (T-R0b §6)
  , term     ∷ RowTerm | TyTerm   -- by sort (§1.3)
  , producer ∷ StrategyName   -- whose adapter built the term
  }
type WitnessMeta = Array NameEntry   -- indexed by NameId,
                                     -- dependency order
~~~

What a name binds: **one flexible problem variable of one declaration,
for every key of that declaration.** Its value at a key `k` is
`eval_k(term)` (§1.3); it is a function of `k` alone (requirements
§3.3 (ii), cited). It binds no certificate, piece, cube, cell, pattern
or table (§18.60 bullet 4; requirements §4.1), and the shape is the
same whichever strategy produced it: the strategy's adapter maps its
certificate to a `Witness` (§1.6; Adapt-N, §4). `site` is a `Path`,
not a `Span`, because spans are not unique (T-R0b §6, cited).
`producer` attributes the adapter lemma to its owner; `StrategyName` is
T-R0a's type (generation-interface §3.3, cited).

The earlier draft's `basis` field moved out of `NameEntry` to P's
judgement beside the problem (§1.7): decision 3 is judged per `split`
site, and an inlined binding has no `NameEntry` to carry it.

### 1.3 The term grammar and its evaluation

Proposed, reusing the term witness of dossier §18.1 (cited: "`⊎ᵢ
rᵢ|Tᵢ ⊎ F`", set terms "`∅ | dom r | {l} | T ∪ T | T ∩ T | T ∖ T`"),
with one guard form for pattern dependence:

~~~text
SetTerm ::= Empty | Dom r | Labels [l]
          | SetTerm ∪ SetTerm | SetTerm ∩ SetTerm | SetTerm ∖ SetTerm
RowTerm ::= Restrict r SetTerm        -- r's fields at those labels
          | Fields [(l, TyTerm)]      -- written fields
          | Union [RowTerm]           -- disjoint union
          | Choose Lit RowTerm RowTerm
TyTerm  ::= Ty Open                   -- an existing type expression;
                                      -- may mention earlier names
          | Field r l                 -- reserved (§1.4)
          | ChooseT Lit TyTerm TyTerm
Lit     ::= (r, l, Bool)              -- "r holds l" is Bool
~~~

`r` ranges over the declaration's rigid record variables, `l` over its
**written labels** (labels occurring in its signature or body), and
`Ty Open` over expressions in the declaration's rigid variables, holes
and names with a smaller `NameId`.

**Scope (proposed, Sc1-Sc3).** Sc1: a term mentions only those. Sc2:
name references are acyclic (dependency order is `NameId` order). Sc3:
sorts agree (a row name's term is a `RowTerm`, a type name's a
`TyTerm`). (Renamed from S1-S3, which collided with T-R0e's support
kinds; reconciliation I2.)

**Evaluation (proposed).** `eval_k` takes `θR = κ(k)` (§2.2): `Dom r`
is `dom θR(r)`; `Restrict r S` is `θR(r)` restricted to `S`'s value;
`Fields` evaluates each type; `Union` is defined only when its parts'
label sets are pairwise disjoint; `Choose (r,l,b) t e` is `t` if
`(l ∈ dom θR(r)) = b`, else `e`; `Ty Open` is `evalT` with names
already evaluated and holes at their defaults (§1.5). An undefined
result is an internal failure at that key (§3.3), never a verdict.
Evaluation terminates (argued: structural, over an acyclic order).

**Reuse rule (proposed).** A flexible variable whose value is a `Ty
Open` expression (today's unification results: `{ ...r }`, `{ a: Int,
...r }`, `List(a)`, `{ c: a }`) is **inlined**, as today; a name is
created only when the value needs `Restrict`, `Choose`, `ChooseT` or
`Field`. Why: inlined expressions are exactly what R010 judges and
lowering lowers today, so their termination and layout arguments are
unchanged (§2.1). Consequence: every name is key-dependent beyond
substitution, which is exactly what T1 must keep from being read as
ground. A `Fields` term with no `Field` and no `Choose` inside is a
`Ty Open` value and is therefore never a name.

Why this grammar suffices for presence witnesses (argued, conditional
on D2, dossier §18.3): at a key, a presence-only witness places each
unwritten label by its Venn cell over the rigid rows' domains, and each
written label by the pattern; a cell is a `SetTerm`, a cell's fields
come from any rigid row that holds it (`Restrict`), and pattern
dependence on written labels is `Choose` on literals of that form (the
G1 guards and the selection tree's path literals, requirements §6.1,
§6.2, are both `(rigid row, written label, Bool)`, cited).

### 1.4 Field-type references (decision 8): acknowledged, not implemented

G2 (requirements §6.3, cited) needs a type name equal to a rigid row's
field type: rigid `r`, `{ ...r, ...x } = { a: β, ...y }`, where `β` is
`r`'s type at `a` when `r` holds `a`. The grammar reserves `Field r l`
("`θR(r)` at `l`", defined only when `θR(r)` holds `l`) so that adding
it is an extension of the term language, not a change of shape. Until
G2 is authorized, an adapter that would need `Field` returns `NoWitness
(AdapterUnsupported FieldReference)` (§1.6); no checker, adapter,
evaluator or lowering supports it. What the extension will need
(proposed): scope (`l` written; `r` rigid), definedness (guarded by a
`Choose` on `(r, l, true)` or proved present by `D`), Adapt-N for the
D3b constants `A(r, l)` and `T(n)` (dossier lines 1114-1120, cited),
and the component restriction of §2.6. The cell constants `X(r, S)`
need no node: a restriction copies field types per label.

### 1.5 The hole contract (proposed)

A flexible variable may stay `Hole` (`Free` in §1.6) only if, at every
key and given the other bindings, **the default satisfies the recorded
atoms that mention it whenever any value of its sort does**; the
default is the representative for a type and `{}` for a record row
(the ADR 007 argument, cited docs/adr/007-specialization.md:45-63).

The earlier wording, "every value of its sort satisfies", is stronger
than the syntactic check below can establish: definedness depends on
the hole (`eq { a: Int, ...h } { a: Int, ...h }` needs `h` to lack
`a`), so not every value satisfies (adversarial review 9(c)).

Proposed syntactic sufficient check: after the bindings are applied,
every `B` atom mentioning the hole is an equation with syntactically
equal sides, and every `BQ` atom mentioning it holds at the default.
Why it suffices (argued): an equation with equal sides holds exactly
when its side is defined; a row hole contributes its labels to
disjointness obligations only, so definedness is antitone in the
hole's label set and `{}` is the weakest choice; a type hole occurs
only in type positions, where its value adds no label, so definedness
does not depend on it. A flexible variable that fails the check must
be inlined or named; otherwise the declaration is `NoWitness
(HoleContract v)` with `v ∷ Var`. Example (cited, split-irrelevance/
ground-check.md §3): lowering fills `route`'s `u` with `{}` today,
which breaks `B`. How strict the check should be is pending author Q6
(W Q4).

### 1.6 The compilation witness, and validity without one

Proposed:

~~~text
type Witness =
  { bindings ∷ Map Var Binding   -- every flexible Var whose
                                 -- position ≠ Auxiliary (Cov, §4)
  , names    ∷ WitnessMeta       -- §1.2
  }
data Binding = Inline (Ty Open) | Named NameId | Free Int
data Compilation = Witnessed Witness | NoWitness NoWitnessReason
data NoWitnessReason
  = NonConstructive StrategyName
  | AdapterUnsupported Feature       -- e.g. FieldReference (§1.4)
  | HoleContract Var                 -- §1.5
~~~

- **Bindings belong to the compilation, never to `vars`.** `vars` is
  part of the immutable recorded problem (T-R0b §5.2; T-R0e I1). A G0
  substitution witness is a `Witnessed` value with empty `names`: every
  binding `Inline` or `Free` (answers T-R0a Q-w1).
- `Binding.Named` and `Open.Named` carry the same `NameId`, so the
  constructor name is shared deliberately (reconciliation B5); a
  `Named n` binding's variable is `n`'s `origin`, injectively.
- **Placement** (proposed, following T-R0a's: reconciliation B1):
  `Compilation` sits inside T-R0a's `Solution` as `compilation ∷
  Compilation`, replacing `witness ∷ Maybe NameWitness`. Then
  "witnessed only with Solved" holds by construction, and the earlier
  draft's `NotSolved` reason is dropped. The alternative, a
  `Compilation` beside the verdict (`Decided RecordedProblem Verdict
  Compilation`), stays open if the author prefers it (pending author
  Q1).
- A strategy that proves `ValidOpen` without a constructive witness
  gives verdict Solved with `NoWitness (NonConstructive name)`. The
  verdict is unchanged; validity and compilation are separate (§18.60
  bullets 3-5).
- `NoWitness` **cannot authorize lowering.** The declaration is
  refused for compilation with an Unsupported reason (decision 9's
  reason ADT; wording belongs to T-R0a, its code pending author Q1),
  never Contradiction. T-R0a's admission refusal for it is
  `NoCompilation NoWitnessReason` (reconciliation B5).
- **No per-key solving fallback** (decision 4): Specialize never solves
  `B` at a key to fill a missing witness, and the re-check's auxiliary
  evaluation (§3.2) is evaluation of defining atoms, not solving.
  Option D (requirements §4.2) would be a separate, explicitly adopted
  strategy with its own Adapt statement, not an implicit path.

### 1.7 Basis: P's judgement, recorded per variable

Decision 3 is judged per `split` site on the problem's solution set,
by P (T-R0e §2.2; T-R0b E3 records the sites). The witness cannot
carry that judgement for inlined bindings, which have no `NameEntry`
(reconciliation C3). Proposed:

~~~text
data Basis
  = Forced ForcednessEvidence | Written AtomId | Selected SelectionTag
  -- ForcednessEvidence: type owned by the forcedness decider;
  -- unassigned, Q7
type SplitJudgement = Map Var Basis
  -- domain: every Var in a split site's slots, whatever its Binding
~~~

`SplitJudgement` is P's output and lives beside the problem with A's
judgement (T-R0e I2 as reconciled by A4), never inside `vars` or the
`Witness`. `Forced` claims U (§4) and carries the forcedness decider's
evidence; `Written` names an annotation atom that determines the
value; `Selected` names a selection rule (none is chosen; §18.62).
Who decides forcedness, and whether the decider reads the problem or
the `Solution`, is pending author Q7.

## 2. Termination (decision 3)

### 2.1 The baseline argument and its gap (cited)

Design §4.2 (docs/plans/2026-10-08-polymorphism-design.md:166-182)
proves finiteness for type variables: per component `C` and entering
key, every reached key's arguments lie in `T = components(τ̄0) ∪ G_C`,
holes counting as ground "because specialization replaces [them] with
a fixed ground type". ADR 007 (lines 91-104) extends R010 to record
rows and notes that "spec §4.2's proof as written covers type variables
only"; the row case is argued there, not proved. Requirements §3.1
(cited): a name whose meaning varies with the key breaks "hole =
ground"; the justification is then missing, not refuted (§18.64 item
1). Decision 2: the documented single-tail rule is the baseline; the
code's `bareRow` is broader (BACKLOG R019; docs/findings.md "R010 and
composed rows", item 3).

### 2.2 Definitions (proposed)

- **Key**: `(d, ā)`, a declaration and its ground slot arguments, as
  in src/Features/Specialize/State.purs:47 (hash-consed; type slots
  and record slots, effect rows erased).
- **`κ`**: for declaration `d`, slot `i` of sort TypeSort is the
  rigid type variable `i`'s ground type, and slot `i` of RecordSort is
  the rigid row `i`'s finite map from labels to ground types (a layout
  read back by `groundType`, src/Features/Specialize/Ground.purs:62-86).
  `κ(k)` is a finite rigid assignment `θR` (the Lean `Assign`,
  research/composition-proofs/Composition/Syntax.lean:90 `Sat`).
- **Component, intra-C reference**: as R010 computes them (strongly
  connected components of `callees`, a call or bare reference at any
  depth; Instantiation.purs:25-43, 75-82).
- **Entering key** `E` of `C`: a key of a member of `C` created by a
  reference from outside `C`, or a seed.
- **Names used transitively** at intra-C references: the least set
  holding every name occurring in a slot of an intra-C reference and
  every name occurring in the term of a member (CS terms nest other CS
  names, §2.3). Finite: each declaration has finitely many names.
- **`Pool(E, C)`**, a finite set of (label, ground type) pairs:
  `Pool₀`, the fields of `E`'s record-slot arguments, of every ground
  record-slot argument written at an intra-C reference (holes at their
  defaults), and of every `Fields` part with ground types in a name
  used transitively at an intra-C reference; and, only with §1.4's
  extension, the pairs `(l, τ)` for `l` a written label of `C` and `τ`
  a type of `Pool₀`.
- **`U_row(E)`**: the functional subsets of `Pool(E, C)` (finite:
  at most `2^|Pool|`).
- **`U_ty(E)`**: `E`'s type-slot arguments; the types of `Pool`; the
  **ground leaves** of the CS type terms (§2.3) of the type names used
  transitively at intra-C references, holes at their defaults (a
  ground leaf is a ground alternative of a `ChooseT`, or the whole
  term when it is ground); and `t[ρ̄]` for each type `t` written as a
  type-slot argument at an intra-C reference that mentions no rigid
  type variable and no type-sorted name, holes at their defaults, `ρ̄`
  assigning each of its record tails a member of `U_row(E)` (finite:
  finitely many `t`, leaves and names, finitely many tails each).
- **`U_C(E)`**: keys `(d, ā)` with `d ∈ C`, type slots in `U_ty(E)`,
  record slots in `U_row(E)`. Finite: at most `Σ_{d ∈ C}
  |U_ty|^{t(d)} · |U_row|^{r(d)}`.

The ground-leaf clause and "transitively" are the corrections of the
adversarial review's finding 1: without them a type name `ChooseT
(r, l, true) Bool Int` reaches `Int` from `E = (r = {}, a = Text)`,
outside `U_ty(E)`, although the key set is still finite.

### 2.3 The rule judged on names: `Adm_W` (proposed)

At an intra-C reference, each judged slot (NestedArguments.purs:55-58,
`judged`) is classified by the rows below.

| Slot | Admitted form | Under |
|---|---|---|
| type | `TVar (Rigid a)` | FK-0 |
| type | no rigid type variable, no name of either sort anywhere (tails rigid or holes) | FK-0 |
| type | as above, with record tails that are CS names | FK-W |
| type | `TVar (Named n)`, `n`'s term a CS type term | FK-W (with §1.4) |
| record | `{ ...r }`: no field, **exactly one** tail, `r` rigid | FK-0 |
| record | no rigid variable and no name, tails included (holes allowed) | FK-0 |
| record | `{ ...n }`: no field, one tail, `n` a CS name | FK-W |
| record | no field, two or more tails, each rigid (or a CS name, with FK-W) | FK-U (R019), **only if FK-U is adopted** |

FK-W's rows are active only if FK-W is in the first design (pending
author Q5, W Q3); FK-U's row only if FK-U is adopted and proved
(pending author Q5, W Q7). An inactive row admits nothing.

**The admissibility result is three-valued** (T-R0e §1.4's status,
adopted here as canonical; reconciliation C2, adversarial finding 3):

~~~text
data AdmStatus = Admissible | Inadmissible | AdmittedPendingR019
~~~

- **`Admissible`**: every judged slot of every intra-C reference
  matches an active row.
- **`AdmittedPendingR019`**: some slot matches no active row, every
  such slot is name-free and today's code admits it (`bareRow`,
  NestedArguments.purs:78-81: a field-free row with several tails,
  rigid or mixed rigid and hole, e.g. `{ ...u, ...v }`, `{ ...r, ...h
  }`), and no slot is `Inadmissible`.
- **`Inadmissible`**: some slot fails today's code, or mentions a name
  and matches no active row. Refused as today's E_SPECIALIZATION
  "Recursive call to f changes its type arguments": an admissibility
  refusal, never invalidity. Names do not exist today, so refusing an
  unmatched name slot narrows nothing (decision 2).

In T-R0a's types (generation-interface.md §6), the two admitted values
are `Admitted.status ∷ AdmittedStatus` (`Admissible |
AdmittedPendingR019`); `Inadmissible` is the refusal `AtA (Inadmissible
site i)`, `i` the failing slot's index.

This neither narrows nor endorses today's behaviour (decision 2): what
`bareRow` admits beyond the active rows keeps its acceptance at check,
recorded as `AdmittedPendingR019`, and **is never a premise**: no
termination argument, uniqueness claim or G3 choice rests on it (T-R0e
§1.4, cited). **Decision 3 gap (open; needs a compatibility
decision):** a component whose status is `AdmittedPendingR019` has no
finite-reachable-key theorem. What happens to it once Task 8 removes
the several-tail placeholder is a **proposed behaviour change**
(refusal would refuse for compilation programs that check today) and
needs an **explicit compatibility decision by the author** (§18.66
decision 2: "the compatibility decision stays explicit"; §2.7 U-d).
The options are T-R0e §1.4's: refuse it after Task 8 (T-R0e's
`ComposedTailsUnjustified`, §5.3); keep compiling it via the current
path, with no theorem for its keys; or prove and adopt FK-U first,
which covers rigid-tail unions only. None is approved as a default.
Before Task 8, "nothing changes" rests on an unverified claim: every
key with such a slot lowers a row with several tails, and the
placeholder stops specialization there
(src/Features/Specialize/Record.purs:38-44, cited), but that every such
key reaches it is argued, not checked; T-R0e §1.4 proposes the probe
that would check it. Whether the status is user-visible is pending
author Q5 (T-R0e Q2).

**Component-safe (CS) terms** (proposed; the syntactic form T3 asks
for): a `RowTerm` built from `Restrict r S`, `Union`, `Choose`, CS
names, and `Fields` whose types are ground (no rigid variable, no name),
or, with §1.4, a bare `Field r l`; a `TyTerm` that is ground, a bare
`TVar (Rigid a)`, a bare `Field r l` (§1.4), or `ChooseT` of those.
**Not CS:** any constructor applied over a rigid variable, a name or a
reference (`List(a)`, `{ c: a }`, `List(Field r a)`), and `Fields`
whose type is a bare rigid type variable. These mirror R010's
record-slot rule, which refuses any rigid variable in a non-bare
record slot (`mentionsRow`, NestedArguments.purs:84-89, cited).

**Supports alone do not decide admissibility** (argued). Define
`support(n)` as the rigid variables and names occurring in `n`'s term,
transitively. The safe `Restrict r (Dom r ∖ Dom s)` and the unsafe
`Fields [(a, List(Field r a))]` both have support `{r}` (and `s`), so a
rule on supports cannot tell them apart; `Adm_W` reads the term's form.

### 2.4 The statements

**FK-0 (proposed; baseline, decision 2).** Let `C` be a component in
which no slot of an intra-C reference mentions a name, and whose every
judged slot matches an FK-0 row. For every entering key `E` of `C`,
every key reached from `E` along intra-C references lies in `U_C(E)`.
This is the statement ADR 007's 2026-10-15 note argues for record rows
(cited) and §4.2 lacks; it is the baseline theorem to prove first.

**FK-W (proposed; with names; restated after review).** Let `C` be a
component whose every judged slot matches an FK-0 or FK-W row, with
`Pool` and `U_ty` as in §2.2 (names used transitively; ground leaves
of type names' CS terms included). If evaluation is **functional**
(P1) and **preserves the universe** (P2), then for every entering key
`E` of `C`, every key reached from `E` along intra-C references lies
in `U_C(E)`.

- **P1, functionality:** `eval_k(n)` depends only on `κ(k)` and `n`'s
  term (one value, or undefined, per key).
- **P2, preservation:** for every key `k ∈ U_C(E)` of `d ∈ C` and every
  CS name `n` of `d` used transitively at an intra-C reference,
  `eval_k(n) ∈ U_row(E)` for a row name and `eval_k(n) ∈ U_ty(E)` for
  a type name, whenever defined.

P2 is what **recursive witness evaluation must preserve**. It follows
(argued) from four syntactic facts of CS, by induction on `NameId`
order: no label is invented beyond `dom` of a rigid row (a member of
`U_row`) and the written labels of `C`; no field type is built, only
copied (`Restrict`, `Field`) or ground (`Fields`, whose pairs are in
`Pool₀` because the name is used transitively); a defined `Union` of
functional subsets of `Pool` is a functional subset of `Pool`; and a
type name's value is a ground leaf (in `U_ty` by §2.2's leaf clause),
`κ(k)` at a rigid type variable (in `U_ty` because `k ∈ U_C(E)`), or a
field type copied from a member of `U_row` (a type of `Pool`). With P1
and P2 every admitted slot value lies in `U_ty` or `U_row`, both
finite, so witness evaluation cannot produce unboundedly many keys
(adversarial review, finding 1: "with that fix, P1+P2 do suffice").

**Proof idea for both (argued).** Induction on the path from `E`: `E ∈
U_C(E)` by definition; at `k ∈ U_C(E)`, each admitted slot's value is
`κ(k)` at a bare variable (in `U_ty` or `U_row` by hypothesis), a
ground value (in `U_ty`, or its fields in `Pool`), `t[ρ̄]` with `ρ̄`
from `κ(k)` (in `U_ty`), or a CS name's value (P2). **Global
finiteness** then follows as in §4.2 (cited): components form a DAG,
each key's body has finitely many references and each gives one key
(P1), seeds are finite (src/Features/Specialize/Seeds.purs:37-67),
keys are memoized (Keys.purs:60-70), so the worklist is finite. The
type graph's half of §4.2 is unchanged: declared types are over
`VarId` (`rigid ∷ Ty VarId → Ty Open`, Internal.purs:142) and hold no
name. Global finiteness needs every component on the path to be
`Admissible`; an `AdmittedPendingR019` component is covered by no
statement here (§2.3).

A decreasing measure is not proposed: keys inside a component may
cycle (`f(a, b)` calling `g(b, a)`, design §4.2), so the natural
statement is a finite universe plus memoization, as §4.2 already uses.

**Who must prove:** the termination stream, after this statement's
review (no proof campaign is authorized yet, §18.66). Requirements §3.2
T2 is FK-0 for the baseline and FK-W (with P1, P2) for names.

**Note: FK-0's target property (proposed; inference extension §4,
rows O40, O43).** The property FK-0 should name is Jones, Gomard and
Sestoft's *bounded static variation* (*Partial Evaluation and
Automatic Program Generation*, printed p. 299-300): every type or row
slot is static, and for each entering key the set of its values over
the reached keys is finite, with a bound that depends on the entering
key (their Example 14.1, p. 300); "poly is finite if and only if all
static variables assume only finitely many different values"
(p. 299). The statement must also cover type slots whose arguments
carry record tails (`t[ρ̄]` in §2.2's `U_ty`): on the single-tail
baseline they are increasing edges off any self-dependency cycle
(row O40, proposed). A finite abstract analysis is not a finite set of
concrete keys (row O43, argued): JGS's congruent division does not by
itself make `poly` finite (p. 299), and §14.4 (p. 305-306) is the
further argument; likewise `Adm_W`'s table and R010's check are
decidable, and FK-0 and FK-W are the further argument. JGS argues by
size, in a sketch for a first-order flow-chart language; FK argues by
a finite universe plus memoization, so JGS supports the target, not
the proof. FK-0 remains proposed and unproved.

### 2.5 Why determinism or the 10,000-key limit is not a substitute

**Determinism (argued, §18.64 item 2).** Each example below is a
deterministic function of the key with finitely many ingredients, and
reaches infinitely many keys:

1. With references (§1.4): `f(x: { ...r })` whose recursive call binds
   the callee's row to the name `Fields [(a, List(Field r a))]`. From
   `r = { a: Int }` the keys are `{ a: Int }`, `{ a: List(Int) }`,
   `{ a: List(List(Int)) }`, … (the skeleton-over-reference hazard,
   requirements §3.3, cited).
2. Without references or names: `f(x: { ...r }, y: a)` whose recursive
   call binds the type slot to `{ b: Int, ...r }` (admitted today: type
   slots may carry rigid tails, ADR 007:99-104) and the row slot to the
   value `{ c: a }`. From `r = {}`, `a = Int` the keys nest without
   bound: `{ c: Int }` / `{ b: Int }`, then each round nests the
   previous `a` one level deeper (adversarial review, checked by hand).
   `{ c: a }` is a `Ty Open` value, so the reuse rule inlines it and it
   is never a name (§1.3); R010 refuses the slot as written
   (`mentionsRow`), and CS would refuse the same form as a term.

Both examples defeat a determinism-only argument. **Neither shows a
hazard within the currently proposed names:** example 1 needs the
unimplemented `Field` (§1.4), and example 2's value is inlined and
already refused by R010. They show why the theorem, not determinism,
must carry termination (decision 3).

**The limit (cited, argued).** `specializationLimit = 10000`
(State.purs:100-101) is "a resource guard, never the termination
argument" (ADR 007:173-174; design §4). With a name in example 1, the
program would pass check and fail at the reference creating key
10,001, so acceptance would depend on a resource bound; that is
exactly what R010 replaced for growing rows (ADR 007:94-99: "A growing
row is `Recursive call …` at the call, not the limit"). The limit
cannot tell a finite large key set from an infinite one, it reports at
an arbitrary key, not at the growing reference, and §18.60 bullet 5
keeps resource refusals apart from the modelled problem.

### 2.6 The skeleton-over-reference hazard (argued)

Requirements §3.3 (cited): finiteness needs every image built from the
entering key's fields plus the component's written labels and types;
this holds for presence-only witnesses and bare references and fails
for skeletons over references. Restated against §2.2: a skeleton
`κ(t)` with `t` a constructor over `Field r l` produces a type not in
`Pool`'s types, so P2 fails and `U_row` is not closed. The rule: such
terms are not CS, so a name using one is refused **inside a recursive
component**; outside components it is harmless (one key per reference,
§2.4). The same holds for a constructor over a rigid type variable or
a name. When §1.4 is implemented, its admission criterion is CS.

### 2.7 The R019 extension: pure unions of caller row variables

**FK-U (proposed; decision 2's investigated extension).** As FK-0
(or FK-W), also admitting a record slot with no field and two or more
tails, each a rigid row variable of the referrer (or, with FK-W, a CS
name). Statement: every key reached from `E` lies in `U_C(E)`. Its
`Adm_W` row is inactive until FK-U is adopted (§2.3).

**What its termination argument needs (argued):**

- **U-a, the pool argument:** a defined union of functional subsets of
  `Pool` is a functional subset of `Pool`, so `U_row(E)` is closed
  under pure unions; nothing else changes in §2.4's induction.
- **U-b, definedness at reached keys:** the tails' values must be
  pairwise disjoint at each reached key; this is K (§4) for the
  callee's implied disjointness ("two tails in one record are
  disjoint", recorder-spec §1.1, cited). An undefined union is an
  internal failure (RC5), not a new key.
- **U-c, lowering:** Lay for several tails, which waits for Task 8;
  today the placeholder stops specialization (src/Features/Specialize/
  Record.purs:39-44; findings item 2, cited), so FK-U cannot be
  exercised end to end before Task 8.
- **U-d, the compatibility decision stays explicit** (decision 2): FK-U
  would justify today's `bareRow` for rigid tails only; `bareRow` also
  admits hole tails mixed with rigid ones and, once names exist, name
  tails (T1-a). Adopting FK-U does not endorse anything beyond its
  table row; what remains stays `AdmittedPendingR019` (§2.3).

Not covered by FK-U: a union with written fields of key-dependent type
(`{ a: a, ...u, ...v }`), which is not pure and stays refused.

## 3. The ground re-check (decision 5)

An internal consistency check at specialization keys; it never makes
or changes a verdict. Prior investigation: split-irrelevance/
ground-check.md (cited throughout). This section is the re-check's
definition; T-R0e §4 keeps only its position and outcomes
(reconciliation I1).

**Position (proposed; reconciliation C6):** at each key, **after
lowering computes the key's layouts and callee keys, before Go
emission**. RC4-RC6 read lowering's output, so the check cannot run
before lowering; it must run before emission so that no copy it fails
is emitted.

### 3.1 What it checks at a key (proposed)

At each copy of declaration `f` at key `k`, with `θR = κ(k)`, `σ` the
assignment of the non-auxiliary flexible variables and `α` that of the
auxiliary ones (§3.2), and `ρ = θR ∪ σ ∪ α`:

- **RC1, key:** `Sat θR D_f` (K at this key).
- **RC2, body:** `Sat ρ B_f`, over the **original recorded atoms**
  (R0's complete `B`), never atoms rewritten by the online
  substitution (requirements §2.4, cited). `σ` covers the variables
  that have a checked-IR position; `α` is computed from their defining
  atoms by evaluation (§3.2), never by solving, and RC2 then checks
  every atom, the defining atoms included.
- **RC3, requirements:** each `BQ_f` atom at `ρ` that the producing
  strategy validated. Under the proposed default (pending author Q2),
  that includes ground atoms judged by the stated ground rule; atoms
  mentioning a variable make the problem Unsupported for every strategy
  whose `Sound_F` does not cover them, so RC3 meets them only under such
  a strategy.
- **RC4, call edge:** for each reference at path `p` in `f`'s copy to
  `g`, at the callee key `k'` that lowering actually created:
  `Sat κ(k') D_g`, **and** `κ(k') = ρ(⟨p, inst i⟩)` slot by slot, that
  is `κ(k') = evalT ρ (the reference's slots)`: the callee key is the
  reference's instantiation evaluated under `θR ∪ σ` (with `α`), not
  merely some key satisfying `D_g`.
- **RC5, layouts:** every record type lowered at `k` is defined (no
  label twice); today's `Duplicate record label` (Record.purs:58) is
  the one-atom precedent.
- **RC6, positions:** for every checked-IR position `c` that T-R0b's
  `vars` and `types` name (recorder-rules §5.2): `groundType (lower_k
  ty_c) = evalT ρ (types(p))` for a node or pattern position at path
  `p` (`NodeType p`, `PatternType p`), and `groundType (lower_k ty_c)
  = ρ(v)` for the variable `v` whose position is a `Slot`, `ParamType`,
  `LambdaBody` or `RestType` `c`; `ty_c` is the checked IR's `Ty Open`
  at `c`.

RC4's equation and RC6 are the corrections of the adversarial review's
finding 2: without them, (a) a callee key created with two disjoint
slots swapped satisfies `D_g` and passes, and (b) a `Named n` placed at
the wrong IR position passes RC2, because each variable's binding is
right while lowering emits `n`'s value elsewhere.

### 3.2 How it obtains the correct key and bindings (proposed)

- **The key** is the copy's work item (`Work.arguments`, State.purs:
  52-58), slot `i` mapped to the variable by the declaration's sorts
  without row sorts, as `instantiated` does (Values.purs:82-94).
- **`σ`, the named bindings,** come through the `Witness`'s
  `bindings` (§1.6), never through `vars`: a rigid variable reads
  `κ(k)`; `Inline τ` is `evalT` at `θR` and the names; `Named n` is
  `eval_k(n)`; `Free` is the default.
- **`α`, the auxiliaries** (variables whose position is `Auxiliary`,
  T-R0b §5.2), by `aux_k`: in the defining order T-R0b §5.3 argues
  exists, each auxiliary is read from one defining atom whose other
  side is already evaluated: from `eq τ { l̄: β̄, ...ν }` with `τ`
  ground, `ν` is `τ` without `l̄` and an auxiliary `β_i` is `τ` at
  `l_i`; from `eq τ { ...ν }`, `ν` is `τ`; an auxiliary occurring in
  some `types(p)` is read by matching against `groundType (lower_k
  ty_p)` with exactly one unknown tail. Each step is a function of
  ground values, with no search. If `τ` is not a record holding `l̄`,
  the atom is false and RC2 fails; if no defining atom of that form
  exists, or a match would leave more than one unknown tail, the
  auxiliary is an **unsupported path** (§3.3), never solved for
  (decision 4). Whether adapters should bind auxiliaries instead is
  pending author Q6 (reconciliation B3).
- **The same evaluator lowering uses.** RC reads names through the one
  `eval_k` lowering calls, and reads lowered types back through
  `groundType` (Ground.purs:62-86). With RC4's key equation and RC6 it
  compares the values the emitted program's types and callee keys use
  with the values the witness assigns, at the positions the recorder
  names; §3.4 lists what remains unchecked. A second evaluator would
  check something else.
- **The same problem the strategy validated:** RC2 and RC3 read the
  recorded problem attached to the verdict, never a re-derivation.

### 3.3 What failure means (proposed)

An **internal inconsistency** (a strategy, adapter, evaluator, lowering
or recorder-translation defect), reported as E_INTERNAL at the
reference or declaration span, or an **unsupported path** (an atom or
auxiliary the evaluator cannot evaluate at a key, such as an `outside`
construct, a reserved `Field`, or an auxiliary without a single-tail
defining atom), reported with an Unsupported reason (T-R0e's
`UncheckedPath`). Whether the internal case is a separate outcome or a
reason inside Unresolved is pending author Q1 (T-R0a Q1(a), formerly
Q-A1; T-R0e §7's `Internal` row);
every placement keeps it apart from invalidity. Never Contradiction,
never a user diagnostic, never CX evidence: RC tests one flexible
assignment, CX refutes all of them (§5.4). **A failed re-check is never
evidence that the program is invalid** (decision 5). Under acceptance
with Adapt-N, Lay and R, RC never fires (argued; ground-check.md
§5.3).

### 3.4 What it does not cover (argued; ground-check.md §5)

1. **R:** an obligation the recorder did not record passes (E2 is the
   instance, ground-check.md §5.2). The same holds for a wrong
   defining atom: `α` is computed from it, so RC2 cannot detect it.
2. **V at unreached keys:** RC checks reached keys, not every `θR ⊨ D`.
   The pass-while-wrong cases (a) and (b) of §3.1 are caught at
   reached keys only.
3. **T and admissibility:** RC runs per key and cannot detect an
   infinite key set; FK and `Adm_W` are static.
4. **U and behavior preservation:** RC accepts any satisfying split;
   forcedness and split irrelevance (requirements §5.1) are separate.
5. **Lay below types:** RC checks types, callee keys and layouts, not
   the emitted Go statements that read fields by label; nor the Go
   back end.
6. **Lay at unnamed positions:** RC6 covers the positions `vars` and
   `types` name. A lowered type at a position the recorder does not
   name (a type lowering introduces itself, or a position T-R0b maps to
   `Auxiliary`) is checked only through the atoms that mention it.
7. **Auxiliaries without a single-tail defining atom:** reported as
   unsupported paths, so a declaration that needs one is not checked
   at that key (and is not compiled, §3.3).
8. **Uniformity:** a witness that works at every reached key may not be
   uniform (ground-check.md §5.4).
9. **Erased effect rows** and constructs outside the fragment.
10. **Keys of separately compiled modules** (none exist today).

**Note: RC in Leroy's terms (argued; inference extension §6, row
O53).** In the terms of Leroy's Definition 9 and Theorem 1 (*A
Formally Verified Compiler Back-end*, §2.2.2, p. 7), RC is a validator
for a property weaker than semantic preservation: type-level agreement
at reached keys (typing, callee keys and layout definedness). It is
not translation validation of behaviour (items 4 and 5 above). Were RC
verified, Theorem 1 would make the compiler verified for that property
only; RC is unverified. It already follows Leroy's rule that a
validator answers false when it cannot establish its property:
unsupported paths are never verdicts (§3.3).

## 4. Correspondence statements

Each statement is proposed; none is proved. "Must prove" names the
owner. `σ_k` and `α_k` are §3.2's assignments at key `k`.

**K, keys.** For every key `k` that specialization of an accepted
program reaches (a worklist entry, State.purs:81-94), with declaration
`d`, `κ(k)` is a finite rigid assignment and `Sat κ(k) D_d`. Argued
route: induction in discovery order; seeds are monomorphic, so their
`D` mentions no rigid variable; an edge from `k` to `k'` satisfies
`D_g` because `B_f` contains `g`'s instantiated clauses (R), `σ_k ∪
α_k` satisfies `B_f` (Adapt-N), and `κ(k')` is the lowered
instantiation read back (Lay). Must prove: the specialization stream.

**V, validity.** For each strategy `F`: `check_F P c = true ⇒ ValidOpen
P` (`Sound_F`; `ValidOpen`, Composition/Typed/Bridge/Valid.lean:17).
The cell format has it, proved (`cellOpenImpl`, Composition/Typed/
Cell/Proofs/Main.lean:44, cited). V authorizes the verdict Solved, not
lowering. Must prove: each strategy's owner.

**Adapt-N, the per-name adapter lemma.** For a constructive strategy
`F` with adapter `A_F : Cert_F → Compilation`: if `check_F P c` and
`A_F c = Witnessed w`, then for every finite `θR` with `Sat θR D`, the
assignment `σ` given by `w.bindings` (names by `eval`, inlined
expressions by `evalT`, holes by default), extended by `α = aux(θR,
σ)` (§3.2), is defined and satisfies `Sat (θR ∪ σ ∪ α) B` and every
`BQ` atom `F` validated. Requirements §4.3's form ("the witness
evaluated at a ground instance of pattern π equals the format's
instantiation transferred to it") is a sufficient route: equality to
the format's instantiation, transferred by the interpretation `h`
(dossier lines 1152-1153), plus that instantiation's satisfaction from
`F`'s soundness proof. Inside the lowering trust boundary (§18.61).
Must prove: each format's owner.

**Cov, coverage and scope of names** (preconditions of Adapt-N;
syntactic, checkable at the adapter's output; reconciliation B3,
adversarial finding 6). Every flexible variable whose `vars` position
is not `Auxiliary` has exactly one `Binding` in `bindings`;
auxiliaries have none and are determined by their defining atoms
(T-R0b §5.3, checked by RT7), evaluated by §3.2's `aux_k`;
every `Named n` occurring in the checked IR or in `bindings` has an
entry in `names`; terms satisfy Sc1-Sc3 (§1.3); `Free` variables
satisfy the hole contract (§1.5). Must prove: none (a validator); its
specification is here, its implementation later.

**Lay, layouts.** For every key `k` of `d` and every type expression
`τ` over `d`'s rigid variables, names and holes, `groundType (lower_k
τ) = evalT (κ(k) ∪ σ_k) τ` when the right side is defined; for
several tails this is Task 8's canonical union ("fields of all tails
joined and sorted, unsolved tails empty", split-selection §1, cited),
and for record slots the hole default (Values.purs:96-99). M14 ("after
specialization every row is ground") is a prerequisite. Must prove:
the lowering stream (Task 8's owner).

**U, forced splits.** For each variable `v` with `basis(v) = Forced`
in P's `SplitJudgement` (§1.7): for every finite `θR ⊨ D` and all
`σ1`, `σ2` with `Sat (θR ∪ σi) (B ∪ BQ)`, `σ1` and `σ2` agree on `v`.
`Written` is the same claim with the annotation's atom included in
`B`. Must prove: the forcedness decider's owner (unassigned;
requirements §11 item 5; pending author Q7).

**R, recorder.** R1: the recorded problem is the syntax-directed
translation of the body (T-R0b's rules), so that `Sat (θR ∪ σ) (B ∪
BQ)` implies the body is well typed at the ground instance `θR ∪ σ`.
R2: `vars` (T-R0b §5.2) preserves sorts and the ∀rigid/∃flexible
levels, and assigns each checked-IR position to at most one variable;
`bindings`' `Named` entries are injective. Must prove: T-R0b states
R1-R2; the recorder's implementer proves them.

**T, termination.** FK-0, FK-W, FK-U (§2). Must prove: the termination
stream.

How they compose (argued): K + Lay + Adapt-N + R imply each emitted
copy is a ground instance of a well-typed body; T makes the set of
copies finite; U and the selection contract (G3) are what decision 3
admission reads; RC re-establishes, **at reached keys only**, K (RC1,
RC4), Adapt-N's conclusion for the named variables and the
auxiliaries' defining atoms (RC2), Lay's type-level part at the
positions the recorder names and at callee keys (RC6, RC4), and layout
definedness (RC5). That narrows the adapter's trust obligation without
discharging R, U, T, Lay at unnamed positions or behavior preservation
(§18.64 item 3; §3.4).

## 5. Interfaces offered to the parallel streams

Each item is the canonical definition; the other streams cite it.

### 5.1 T-R0a, generation and verdict (r0/generation-interface.md)

- **`Solution.compilation ∷ Compilation`** (§1.6) replaces `witness ∷
  Maybe NameWitness`; the strategy adapter returns `Compilation`;
  `Attempt.Accepted StrategyName Valid Compilation`; `Admitted
  { witness ∷ Witness, splits ∷ SplitJudgement, status ∷
  AdmittedStatus }` (T-R0a §6); T-R0a's `NameWitness` is this file's
  `Witness`
  (reconciliation B1, B2). Placement beside the verdict instead:
  pending author Q1.
- Invariant: `Witnessed` occurs only inside a Solved verdict (by
  construction under the placement above).
- **`Lowerable`** = Solved ∧ `Witnessed w` ∧ Cov(w) ∧ `AdmStatus =
  Admissible` for every component on the path (§2.3; before Task 8,
  `AdmittedPendingR019` also compiles as today, §2.3) ∧ decision 3's
  admission on every `split` site, read from P's `SplitJudgement`
  (§1.7). Lowering runs only on `Lowerable` declarations and their
  callees; any missing conjunct is an Unsupported or admissibility
  refusal (T-R0a: `NoCompilation NoWitnessReason` for the witness
  conjunct, B5), never a change of verdict.

### 5.2 T-R0b, recorder rules (r0/recorder-rules.md): `vars` and names

- **`vars` is T-R0b's** (recorder-rules §5.2, reconciliation A3).
  Before and after the verdict it gives each problem variable its sort,
  quantifier (`Forall VarId | Exists`), origin and checked-IR position
  (`CheckedName`; the field `named` is renamed `position`,
  reconciliation B5). It holds no binding and no checker meta: T-R0b's
  generator is pure.
- After the verdict and adapter, each non-auxiliary **flexible**
  problem variable has exactly one `Binding` in the `Witness`'s
  `bindings` (§1.6); `NameEntry.origin` is the inverse for `Named`
  (injective). Auxiliaries are covered by §3.2's evaluation.
- Problem variables are T-R0b's canonical names `⟨p, role⟩` and are
  never renamed after recording; atoms refer to problem variables,
  never to solved metas. Identity is the path, never the span (T-R0b
  §6).
- Sorts are preserved: a RecordSort variable binds a row name or a
  record expression, a TypeSort variable a type name or a type.
- RC6 relies on `types : Map Path RTExpr` (T-R0b §5.2) and on R2's
  "one variable per position".

### 5.3 T-R0e, boundaries (r0/boundaries.md)

- **Admissibility** is `Adm_W` (§2.3), judged on the instantiation's
  `Open` classification and on each name's **term form** (CS), not on
  supports alone (§2.3 shows why), with the three-valued `AdmStatus`
  (T-R0e's names, canonical here). It admits type slots carrying rigid
  tails (`{ b: Int, ...r }`, today's `admissible`), which T-R0e §1.4's
  paraphrase should not narrow (reconciliation C1). It is not validity
  and is never conjoined into `B` (recorder-spec §2.4, cited).
- **Support** is `support(n)` (§2.3), offered for diagnostics and
  dependency order only.
- **Unsupported reasons owned here** (names; T-R0a §6 owns
  `CompileRefusal`, T-R0e §3.1 its `Construct`; reconciliation C7,
  re-check R1): T-R0a's `AtS (NoCompilation NoWitnessReason)`, covering
  `NonConstructive` (§1.6), `AdapterUnsupported FieldReference` (§1.4)
  and `HoleContract Var` (§1.5); `HoleContract Var` is a
  `NoWitnessReason`, not a separate `Construct`. Several tails before
  Task 8 (§2.7 U-c; T-R0e's `SeveralTailLowering`); composed tails
  without FK-U after Task 8, only if the author's compatibility
  decision chooses refusal (§2.3; T-R0e's `ComposedTailsUnjustified`);
  and RC's unsupported path (§3.3; T-R0e's `UncheckedPath`).
- **Policy:** decision 3 is judged per `split` site by P (T-R0e §2);
  P's `SplitJudgement` records the result per variable (§1.7); a
  `Forced` basis without U's evidence is not forced.
- **The re-check** is defined in §3; T-R0e §4 keeps its position
  (after lowering computes layouts and callee keys, before Go
  emission) and its outcomes (reconciliation C6, I1).

### 5.4 CX (refute/statements.md)

- CX's counter-instance is a finite `θR` in the same representation as
  `κ` (§2.2); witnesses and names play no part in CX.
- **An RC failure is never a counter-instance:** RC evaluates one
  flexible assignment; CX's conclusion `¬ ValidOpen P` needs `B`
  refuted at `θR` for every flexible assignment (requirements §4.4,
  cited).

## 6. Restrictions of the representation

| Restriction | Why harmless (argued) | Challenge example |
|---|---|---|
| names are introduced only after the verdict; checker metas stay `Hole` | R0 records problem variables, so no check-time pass needs a name | a class-e diagnostic that wants to print the chosen witness: it must print the problem variable or its `site` |
| a term mentions only its declaration's rigid variables, earlier names, written labels and ground types (Sc1-Sc2) | ∀rigid∃flexible: a flexible variable depends on its own level's rigid variables only | a split that depends on a label written only in a caller: at the callee it is an unwritten label, placed by cells (`Restrict`) |
| set terms over `dom r` and written labels, no complement | D2 (term witnesses suffice for presence), dossier §18.3, still to be argued for finite rows | **type-agreement placement** (dossier §18.4, row 3): placing a shared label by whether `r` and `s` give it equal types is not a set term; also type-directed selection for printability (E2) |
| `Choose` literals only on (rigid row, written label) presence | G1 guards and selection paths have exactly this form (requirements §6.1-6.2) | a guard on an unwritten label: none is proposed; cells handle unwritten labels |
| one term per name for every key; no per-key table | pattern dependence is expressed by `Choose` and set terms | `divide5` under the selection format: ≥ 2^m leaves (requirements §6.2) become ≥ 2^m `Choose` leaves; size, not soundness |
| the reuse rule: names only for terms outside `Ty Open` | inlined witnesses keep today's R010 and lowering | an adapter emitting `Restrict r (Dom r)` for the identity: FK-0 refuses it in a component though it equals `{ ...r }`; a sound canonicalization to `{ ...r }` is proposed |
| inside components, CS terms only (no constructor over a rigid variable, name or reference) | mirrors R010's record-slot rule; outside components any term is safe | §2.5 example 1 (with `Field`): refused in a component, accepted outside; example 2's value is inlined and R010 refuses it |
| auxiliaries carry no binding; the re-check evaluates them from single-tail defining atoms | T-R0b §5.3: each auxiliary is a function of named and rigid variables | an auxiliary whose only defining atom has two unknown tails: an unsupported path, not solved (§3.2) |
| `Field r l` reserved, not implemented | decision 8 defers G2 without prohibiting it | G2 (requirements §6.3): Solved if some strategy proves it, then `NoWitness (AdapterUnsupported FieldReference)` |
| holes only under the hole contract | the default satisfies whenever any value does (ADR 007; §1.5) | `route`'s `u` defaulted to `{}` today (ground-check.md §3): must be named or refused |
| no witness, no lowering; no per-key solving | decision 4 | a non-constructive proof of `divide5`: Solved, not compiled |
| record slots in components: single tail (FK-0) | decision 2's baseline | `walk`'s `{ ...u, ...v }` recursion, accepted by today's code (R019): `AdmittedPendingR019`, compiled as today before Task 8; after it, the author's compatibility decision (refuse, keep compiling via the current path, or prove FK-U first; §2.3) |
| names never occur in declared types | declared types are over `VarId` (Internal.purs:142); §4.2's type half is unchanged | `Box({ ...n })` in a body: a type key per function key, finitely many per key |

## 7. Open points for the author

Each is mapped to the reconciliation review's questions; the default
proposed here stands until the author rules.

1. **T1-a:** accept that the marker alone is insufficient and R010's
   generic predicates (`admissible`, `bareRow`) need an explicit
   classifier (§1.1)? (Q5.)
2. **Reuse rule:** names only for non-`Ty` terms (§1.3), or every
   divided part a name (uniform, but FK-0 then refuses more)? (Q6.)
3. **FK-W in the first design**, or FK-0 only (names refused inside
   components) until FK-0 is proved? (Q5.)
4. **Hole contract:** the proposed syntactic check (§1.5), or a
   stricter one (no atom may mention a hole)? (Q6.)
5. **`ChooseT`:** keep type-sorted guards, or require pattern-dependent
   types to be rows' field types only? (Q6.)
6. **RC placement and cost:** per copy (RC1-RC3, RC5, RC6), per edge
   (RC4), or both; always on, or in a checking build? (Q8.)
7. **FK-U:** adopt the pool argument for pure unions of rigid tails,
   which would justify today's `bareRow` on that class (§2.7 U-d)?
   Should `AdmittedPendingR019` be user-visible? (Q5.) Separately, an
   explicit compatibility decision (§18.66 decision 2): after Task 8,
   refuse it for compilation, keep compiling it via the current path,
   or prove FK-U first (§2.3; T-R0e §1.4)? Refusal is a behaviour
   change; the claim that these cases already stop at the placeholder
   is unverified, and T-R0e §1.4's probe should run first.
8. **`Compilation` placement:** inside `Solution` (default) or beside
   the verdict (§1.6)? Where do internal re-check failures sit (§3.3)?
   (Q1.)
9. **Auxiliaries:** evaluated by the re-check from defining atoms
   (default, §3.2), or bound by adapters (Cov extended)? (Q6.)
10. **Forcedness:** who decides it, and does the decider read the
    problem or the `Solution` (§1.7)? (Q7.)

## Revision log (reviews of 88c052d)

Reviews: the adversarial soundness review and the interface
reconciliation of the §18.66 design tranche, both read-only.

**Applied.**

- Adversarial 1 (FK-W/P2 false): §2.2 defines names used transitively
  and uses it in `Pool₀`; `U_ty` gains the ground leaves of type
  names' CS terms; FK-W and P2 restated (§2.4), P2's argument extended
  to type names.
- Adversarial 2 (re-check overclaim): RC4 now requires `κ(k') = evalT
  (θR ∪ σ)` of the reference's slots; RC6 added (lowered type at each
  named position against `types(p)` or the variable's value); §3.2's
  claim narrowed to what RC4-RC6 check; §3.4 lists the residual gaps
  (items 1, 2, 5, 6, 7); §4's composition paragraph restated.
- Adversarial 3 (R019 in `Adm_W`): FK-U row marked "only if FK-U is
  adopted"; `AdmStatus` with `AdmittedPendingR019` adopted as the
  canonical result (§2.3); such components must not reach
  specialization after Task 8 unless FK-U is proved (`PendingR019`,
  §5.3); `Lowerable` restated.
- Adversarial 6 / reconciliation B3 (auxiliaries): Cov exempts
  auxiliaries; RC2 is over `θR ∪ σ ∪ α` with `α` computed by `aux_k`
  from single-tail defining atoms, by evaluation, then checked; no
  per-key solving (§3.2, §4).
- Adversarial 9(b): §2.5 example 2 now uses the inlined value `{ c: a
  }`, and says neither example is a hazard within the current names.
- Adversarial 9(c): hole contract restated as "the default satisfies
  whenever any value does", with the argument for the syntactic check.
- Reconciliation A3: `vars` is T-R0b's (§5.2); no checker metas.
- B1: `Compilation` placed inside `Solution`; `NotSolved` dropped;
  alternative placement pending author Q1.
- B2: `Witnessed Witness` with `Witness = { bindings, names }`;
  bindings live in the compilation, never in `vars`.
- B4: `origin ∷ Var`, `site ∷ Path`, `HoleContract Var`.
- B5: `Binding.Named` kept (same `NameId` as `Open.Named`); `vars`
  field `named` renamed `position`; T-R0a's refusal `NoCompilation`.
- B6: `StrategyName` throughout.
- C1: §5.3 states that `Adm_W` admits rigid tails in type slots.
- C2: covered by `AdmStatus` (rigid-plus-hole composed slots are
  `AdmittedPendingR019`; hole-only composed slots `Admissible`).
- C3: `basis` moved to P's per-site `SplitJudgement` (§1.7), recorded
  per variable whatever its binding; `U` and `Lowerable` read it.
- C6: position after lowering computes layouts and callee keys, before
  Go emission (§3).
- C7: Unsupported reason names aligned with T-R0e's `Construct` (§5.3).
- I1: this file keeps the re-check's definition; T-R0e §4 keeps
  position and outcomes. I2: S1-S3 renamed Sc1-Sc3.
- Decisions 3 and 5 re-stated where touched: termination rests on FK
  theorems only (§2.4-§2.5); a failed re-check is never invalidity
  (§3.3).

**Pending (proposed default, not decided).**

- Q1: `Compilation` inside `Solution` (default) or beside the verdict;
  the outcome for internal re-check failures and for NoWitness.
- Q2: which `BQ` atoms make RC3 inapplicable (RC3 unchanged).
- Q5: FK-W and FK-U activation; `AdmittedPendingR019` visibility;
  refusal after Task 8 unless FK-U is proved; T1-a. (Superseded:
  compatibility decision, no default; External review 2026-10-22.)
- Q6: auxiliaries evaluated (default) or bound by adapters; hole
  contract strictness; reuse rule; `ChooseT`.
- Q7: the forcedness decider and its input (§1.7, U).
- Q8: RC placement and cost.

**Disagreements and refinements.**

- Adversarial 2's RC6 compares "each `CheckedName` position" with
  `types(p)`; `types` is keyed by path, so RC6 compares node and
  pattern positions with `types(p)` and `Slot`, `ParamType`,
  `RestType` positions with the variable's value. Same intent.
- Reconciliation C3 offered two options; the second (P judges, the
  judgement records the basis) was taken, and `basis` left `NameEntry`
  entirely rather than being duplicated on `Binding`.
- Adversarial 3 asks that pending components not reach specialization
  after Task 8. Before Task 8 this file states, as argued rather than
  checked, that the placeholder already stops them, so "compiled as
  today" and the decision-3 gap do not conflict; a probe should confirm
  that every such key reaches the placeholder.

### Consistency re-check (39320ad)

Edits from the consistency re-check of the R0 documents; no design
decision changed.

- R1: §5.3 cites T-R0a §6's `CompileRefusal`; no witness is T-R0a's
  `AtS (NoCompilation NoWitnessReason)`, and `HoleContract Var` is a
  `NoWitnessReason`, not a separate `Construct` (T-R0e's
  `ConstrainedHole` mapping dropped).
- R4: RC3 restated for the common requirement-atom wording: validated
  `BQ` atoms, ground atoms by the stated ground rule under the
  proposed default (pending author Q2).
- R8: RC6 adds T-R0b §5.2's `LambdaBody` position.
- R9: Cov's auxiliaries are checked by RT7, not "T-vars".
- R10: the post-Task-8 refusal is T-R0e's `ComposedTailsUnjustified`
  (§2.3, §5.3); `AdmittedPendingR019`'s definition (§2.3) stays the
  canonical one.
- R11: "T-R0e Q2" kept; T-R0e §7 maps its old numbers. ("T-R0e Q9"
  was corrected later; see the verifier fixes below.)
- R13: `Basis`'s `Forced Evidence` renamed `Forced ForcednessEvidence`,
  apart from T-R0a's contradiction `Evidence`.

### Residual harmonization (168d446)

- §2.3: records how T-R0a carries `AdmStatus`: `AdmittedStatus` for
  the two admitted values, `AtA (Inadmissible site i)` for the third.

### Verifier fixes (2b73666)

From the read-only verification of 2b73666 (findings 1, 5, 9):

- §5.1: `Admitted { witness ∷ Witness, splits ∷ SplitJudgement,
  status ∷ AdmittedStatus }` (T-R0a §6) replaces `Admitted Witness`.
- §3.3: the internal-outcome question is T-R0a Q1(a) (formerly Q-A1)
  and T-R0e §7's `Internal` row, not "T-R0e Q9" (old Q9 is
  `Exhausted`); the R11 log line is adjusted.
- §1.7: `ForcednessEvidence` is owned by the forcedness decider,
  unassigned (Q7).

### Inference-extension notes (b08c4d4)

Notes from docs/plans/2026-10-22-inference-foundations-extension.md
§11, applied only where no pending author decision (D1-D6, §18.67
Q1-Q12) bears on them; no design decision changed.

- §2.4: a note naming bounded static variation as FK-0's target, the
  type-slot-with-tail case, and the abstract/concrete distinction
  (extension §4, O40 proposed, O43 argued). FK-0 stays proposed.
- §3.4: a note naming RC's property in Leroy's terms (extension §6,
  O53, argued).
- Not applied: §1.5's EL3 (O29; it depends on IF6 and §18.67 Q6, and
  speaks of variables read by `build`, which exists only if D1 adopts
  the continuation); §1.4's EL5 (O32) and §4's Cov domain (O31), both
  conditional on D1.

### External review (2026-10-22)

An external review forwarded by the author (issue 4 applies here):

- The post-Task-8 refusal of `AdmittedPendingR019` is a proposed
  behaviour change, not maintenance. §2.3's "Decision 3 gap closed"
  becomes an open gap needing the author's explicit compatibility
  decision (§18.66 decision 2), with T-R0e §1.4's three options
  (refuse after Task 8; keep compiling via the current path; prove
  FK-U first) and no default; the "already stopped at the
  placeholder" claim is marked unverified, with T-R0e §1.4's probe.
  §5.3, §6's table row and §7 item 7 follow.
- Issue 6 needs no edit here: W's "never Contradiction" sentences
  (§1.6, §3.3) concern compilation refusals and the re-check, not
  unsupported syntax.

### Review of the correction pass (2026-10-22)

A read-only review of the correction pass (finding 1) noted that the
historical "Pending (proposed default, not decided)" list still gave
Q5 a refusal default. That entry now carries a supersession note
pointing to the External review entry above; nothing else changed.
