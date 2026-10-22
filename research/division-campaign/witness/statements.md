# Per-name witnesses and termination: the interface statements

Date: 2026-10-21. Base: 67ba706. Authority: dossier §18.66, the design
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
proved theorem, the citation says so.

**This file is the canonical source** for the names defined in §0. The
parallel streams (T-R0a, T-R0b, T-R0e, CX) use these definitions and
point here; a stream that needs a different shape raises it with the
interface owner rather than redefining it (§5).

## 0. Canonical vocabulary (proposed)

| Name | Meaning | Defined in |
|---|---|---|
| `NameId` | a witness-bound name, numbered per declaration | §1.1 |
| `Named n` | the marker: a third constructor of `Open`, beside `Rigid` and `Hole` | §1.1 |
| `NameEntry` | what one name binds: sort, origin, site, term, basis, producer | §1.2 |
| `WitnessMeta` | a declaration's names, in dependency order | §1.2 |
| `RowTerm`, `SetTerm`, `TyTerm` | the term grammar a name's value is written in | §1.3 |
| `eval_k` | evaluation of a term at key `k` | §1.3 |
| `Field r l` | the reserved field-reference node (decision 8; not implemented) | §1.4 |
| hole contract | when a flexible variable may stay a `Hole` | §1.5 |
| `Compilation` | `Witnessed WitnessMeta` or `NoWitness reason` | §1.6 |
| `Binding` | what `vars` maps a flexible problem variable to after the verdict | §5.2 |
| `κ` | key arguments read as a rigid assignment `θR` | §2.2 |
| `Pool`, `U_row`, `U_ty`, `U_C(E)` | the finite key universe of a component | §2.2 |
| `Adm_W`, CS | the admissibility rule over names; component-safe terms | §2.3 |
| FK-0, FK-W, FK-U | the finite-reachable-key statements | §2.4, §2.7 |
| RC1-RC5 | the ground re-check's obligations | §3 |
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
  , origin   ∷ ProblemVar     -- the flexible variable it binds (§5.2)
  , site     ∷ Span           -- the reference whose instantiation
                              -- introduced the variable
  , term     ∷ RowTerm | TyTerm   -- by sort (§1.3)
  , basis    ∷ Forced | Written | Selected SelectionTag
  , producer ∷ StrategyTag    -- whose adapter built the term
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
certificate to `WitnessMeta` (Adapt-N, §4).

`basis` records why the value is what it is, for decision 3 and G3
(§18.66 item 6): `Forced` claims U (§4) and must carry the forcedness
decider's evidence; `Written` names an annotation that determines it;
`Selected` names a selection rule (none is chosen; §18.62). `producer`
attributes the adapter lemma to its owner.

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

**Scope (proposed, S1-S3).** S1: a term mentions only those. S2: name
references are acyclic (dependency order is `NameId` order). S3: sorts
agree (a row name's term is a `RowTerm`, a type name's a `TyTerm`).

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
...r }`, `List(a)`) is **inlined**, as today; a name is created only
when the value needs `Restrict`, `Choose`, `ChooseT` or `Field`. Why:
inlined expressions are exactly what R010 judges and lowering lowers
today, so their termination and layout arguments are unchanged (§2.1).
Consequence: every name is key-dependent beyond substitution, which is
exactly what T1 must keep from being read as ground.

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

A flexible variable may stay `Hole` only if **every value of its sort
satisfies the recorded atoms that mention it, at every key, given the
other bindings**; then the default (the representative, or `{}` for a
record row) is as good as any (the ADR 007 argument, cited docs/adr/
007-specialization.md:45-63). Proposed syntactic sufficient check:
after the bindings are applied, every `B` atom mentioning the hole is
an equation with syntactically equal sides, and every `BQ` atom
mentioning it holds at the default. A flexible variable that fails it
must be inlined or named; otherwise the declaration is `NoWitness
(HoleContract site)`. Example (cited, split-irrelevance/ground-check.md
§3): lowering fills `route`'s `u` with `{}` today, which breaks `B`.

### 1.6 A strategy that establishes validity without a witness

Proposed: **`data Compilation = Witnessed WitnessMeta | NoWitness
NoWitnessReason`**, with `NoWitnessReason = NotSolved | NonConstructive
StrategyTag | AdapterUnsupported Feature | HoleContract Span`.

- A strategy that proves `ValidOpen` without a constructive witness
  gives verdict Solved with `NoWitness (NonConstructive tag)`. The
  verdict is unchanged; validity and compilation are separate (§18.60
  bullets 3-5).
- `NoWitness` **cannot authorize lowering.** The declaration is
  refused for compilation with an Unsupported reason (decision 9's
  reason ADT; wording belongs to T-R0a), never Contradiction.
- **No per-key solving fallback** (decision 4): Specialize never solves
  `B` at a key to fill a missing witness. Option D (requirements §4.2)
  would be a separate, explicitly adopted strategy with its own Adapt
  statement, not an implicit path.

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
- **`Pool(E, C)`**, a finite set of (label, ground type) pairs:
  `Pool₀`, the fields of `E`'s record-slot arguments, of every ground
  record-slot argument written at an intra-C reference (holes at their
  defaults), and of every `Fields` part with ground types in a name
  used at an intra-C reference; and, only with §1.4's extension, the
  pairs `(l, τ)` for `l` a written label of `C` and `τ` a type of
  `Pool₀`.
- **`U_row(E)`**: the functional subsets of `Pool(E, C)` (finite:
  at most `2^|Pool|`).
- **`U_ty(E)`**: `E`'s type-slot arguments, the types of `Pool`, and
  `t[ρ̄]` for each type `t` written as a type-slot argument at an
  intra-C reference that mentions no rigid type variable and no
  type-sorted name, holes at their defaults, `ρ̄` assigning each of its
  record tails a member of `U_row(E)` (finite: finitely many `t`,
  finitely many tails each).
- **`U_C(E)`**: keys `(d, ā)` with `d ∈ C`, type slots in `U_ty(E)`,
  record slots in `U_row(E)`. Finite: at most `Σ_{d ∈ C}
  |U_ty|^{t(d)} · |U_row|^{r(d)}`.

### 2.3 The rule judged on names: `Adm_W` (proposed)

At an intra-C reference, each judged slot (NestedArguments.purs:55-58,
`judged`) must be one of the following; anything else is refused as
today's E_SPECIALIZATION "Recursive call to f changes its type
arguments", an admissibility refusal, never invalidity:

| Slot | Admitted form | Under |
|---|---|---|
| type | `TVar (Rigid a)` | FK-0 |
| type | no rigid type variable, no name of either sort anywhere (tails rigid or holes) | FK-0 |
| type | as above, with record tails that are CS names | FK-W |
| type | `TVar (Named n)`, `n`'s term a CS type term | FK-W (with §1.4) |
| record | `{ ...r }`: no field, **exactly one** tail, `r` rigid | FK-0 |
| record | no rigid variable and no name, tails included (holes allowed) | FK-0 |
| record | `{ ...n }`: no field, one tail, `n` a CS name | FK-W |
| record | no field, two or more tails, each rigid (or a CS name, with FK-W) | FK-U (R019) |

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
which no slot of an intra-C reference mentions a name, and which
satisfies `Adm_W`'s FK-0 rows. For every entering key `E` of `C`,
every key reached from `E` along intra-C references lies in `U_C(E)`.
This is the statement ADR 007's 2026-10-15 note argues for record rows
(cited) and §4.2 lacks; it is the baseline theorem to prove first.

**FK-W (proposed; with names).** As FK-0, admitting `Adm_W`'s FK-W
rows, provided evaluation is **functional** (P1) and **preserves the
universe** (P2):

- **P1, functionality:** `eval_k(n)` depends only on `κ(k)` and `n`'s
  term (one value, or undefined, per key).
- **P2, preservation:** for every key `k ∈ U_C(E)` of `d ∈ C` and every
  CS name `n` of `d`, `eval_k(n) ∈ U_row(E)` for a row name and
  `eval_k(n) ∈ U_ty(E)` for a type name, whenever defined.

P2 is what **recursive witness evaluation must preserve**. It follows
(argued) from three syntactic facts of CS: no label is invented beyond
`dom` of a rigid row (a member of `U_row`) and the written labels of
`C`; no field type is built, only copied (`Restrict`, `Field`) or
ground (`Fields`); and a defined `Union` of functional subsets of
`Pool` is a functional subset of `Pool`.

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
name.

A decreasing measure is not proposed: keys inside a component may
cycle (`f(a, b)` calling `g(b, a)`, design §4.2), so the natural
statement is a finite universe plus memoization, as §4.2 already uses.

**Who must prove:** the termination stream, after this statement's
review (no proof campaign is authorized yet, §18.66). Requirements §3.2
T2 is FK-0 for the baseline and FK-W (with P1, P2) for names.

### 2.5 Why determinism or the 10,000-key limit is not a substitute

**Determinism (argued, §18.64 item 2).** Each example below is a
deterministic function of the key with finitely many ingredients, and
reaches infinitely many keys:

1. With references (§1.4): `f(x: { ...r })` whose recursive call binds
   the callee's row to the name `Fields [(a, List(Field r a))]`. From
   `r = { a: Int }` the keys are `{ a: Int }`, `{ a: List(Int) }`,
   `{ a: List(List(Int)) }`, … (the skeleton-over-reference hazard,
   requirements §3.3, cited).
2. Without references: `f(x: { ...r }, y: a)` whose recursive call
   binds the type slot to `{ b: Int, ...r }` (admitted today: type
   slots may carry rigid tails, ADR 007:99-104) and the row slot to a
   name `Fields [(c, TVar a)]`. Each round nests the previous `a` one
   level deeper. R010 refuses the row slot written as `{ c: a }`
   (`mentionsRow`); CS refuses the name for the same reason.

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
name). Statement: every key reached from `E` lies in `U_C(E)`.

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
  admits hole tails (harmless: a hole is `{}`) and, once names exist,
  name tails (T1-a). Adopting FK-U does not endorse anything beyond its
  table row.

Not covered by FK-U: a union with written fields of key-dependent type
(`{ a: a, ...u, ...v }`), which is not pure and stays refused.

## 3. The ground re-check (decision 5)

An internal consistency check at specialization keys; it never makes
or changes a verdict. Prior investigation: split-irrelevance/
ground-check.md (cited throughout).

### 3.1 What it checks at a key (proposed)

At each copy of declaration `f` at key `k`, with `θR = κ(k)` and `σ`
the flexible assignment of §3.2:

- **RC1, key:** `Sat θR D_f` (K at this key).
- **RC2, body:** `Sat (θR ∪ σ) B_f`, over the **original recorded
  atoms** (R0's complete `B`), never atoms rewritten by the online
  substitution (requirements §2.4, cited).
- **RC3, requirements:** each `BQ_f` atom at `θR ∪ σ`, only when the
  strategy that produced the verdict validated `BQ` (until `ValidOpenR`
  is stated, a problem with non-empty `BQ` is Unsupported, requirements
  §11 item 2, so RC3 never runs on it).
- **RC4, call edge:** for each reference in `f`'s copy to `g`, `Sat
  κ(k') D_g` at the callee key `k'` that lowering actually created.
- **RC5, layouts:** every record type lowered at `k` is defined (no
  label twice); today's `Duplicate record label` (Record.purs:58) is
  the one-atom precedent.

### 3.2 How it obtains the correct key and bindings (proposed)

- **The key** is the copy's work item (`Work.arguments`, State.purs:
  52-58), slot `i` mapped to the variable by the declaration's sorts
  without row sorts, as `instantiated` does (Values.purs:82-94).
- **The bindings** come through `vars` (§5.2): a rigid variable reads
  `κ(k)`; `Inline τ` is `evalT` at `θR` and the names; `Named n` is
  `eval_k(n)`; `Free` is the default.
- **The same evaluator lowering uses.** RC reads names through the one
  `eval_k` lowering calls, and reads lowered types back through
  `groundType` (Ground.purs:62-86), so it checks the values the
  emitted program uses. A second evaluator would check something else.
- **The same problem the strategy validated:** RC2 and RC3 read the
  recorded problem attached to the verdict, never a re-derivation.

### 3.3 What failure means (proposed)

An **internal inconsistency** (a strategy, adapter, evaluator, lowering
or recorder-translation defect), reported as E_INTERNAL at the
reference or declaration span, or an **unsupported path** (an atom the
evaluator cannot evaluate at a key, such as an `outside` construct or a
reserved `Field`), reported with an Unsupported reason. Never
Contradiction, never a user diagnostic, never CX evidence: RC tests one
flexible assignment, CX refutes all of them (§5.4). Under acceptance
with Adapt-N and R, RC never fires (argued; ground-check.md §5.3).

### 3.4 What it does not cover (argued; ground-check.md §5)

1. **R:** an obligation the recorder did not record passes (E2 is the
   instance, ground-check.md §5.2).
2. **V at unreached keys:** RC checks reached keys, not every `θR ⊨ D`.
3. **T and admissibility:** RC runs per key and cannot detect an
   infinite key set; FK and `Adm_W` are static.
4. **U and behavior preservation:** RC accepts any satisfying split;
   forcedness and split irrelevance (requirements §5.1) are separate.
5. **Lay below types:** RC checks types and layouts, not the emitted
   Go statements that read fields by label; nor the Go back end.
6. **Uniformity:** a witness that works at every reached key may not be
   uniform (ground-check.md §5.4).
7. **Erased effect rows** and constructs outside the fragment.
8. **Keys of separately compiled modules** (none exist today).

## 4. Correspondence statements

Each statement is proposed; none is proved. "Must prove" names the
owner. `σ_k` is §3.2's assignment at key `k`.

**K, keys.** For every key `k` that specialization of an accepted
program reaches (a worklist entry, State.purs:81-94), with declaration
`d`, `κ(k)` is a finite rigid assignment and `Sat κ(k) D_d`. Argued
route: induction in discovery order; seeds are monomorphic, so their
`D` mentions no rigid variable; an edge from `k` to `k'` satisfies
`D_g` because `B_f` contains `g`'s instantiated clauses (R), `σ_k`
satisfies `B_f` (Adapt-N), and `κ(k')` is the lowered instantiation
read back (Lay). Must prove: the specialization stream.

**V, validity.** For each strategy `F`: `check_F P c = true ⇒ ValidOpen
P` (`Sound_F`; `ValidOpen`, Composition/Typed/Bridge/Valid.lean:17).
The cell format has it, proved (`cellOpenImpl`, Composition/Typed/
Cell/Proofs/Main.lean:44, cited). V authorizes the verdict Solved, not
lowering. Must prove: each strategy's owner.

**Adapt-N, the per-name adapter lemma.** For a constructive strategy
`F` with adapter `A_F : Cert_F → WitnessMeta`: if `check_F P c`, then
for every finite `θR` with `Sat θR D`, the assignment `σ` given by
`A_F c` (names by `eval`, inlined expressions by `evalT`, holes by
default) satisfies `Sat (θR ∪ σ) B` and every `BQ` atom `F` validated.
Requirements §4.3's form ("the witness evaluated at a ground instance
of pattern π equals the format's instantiation transferred to it") is
a sufficient route: equality to the format's instantiation, transferred
by the interpretation `h` (dossier lines 1152-1153), plus that
instantiation's satisfaction from `F`'s soundness proof. Inside the
lowering trust boundary (§18.61). Must prove: each format's owner.

**Cov, coverage and scope of names** (preconditions of Adapt-N;
syntactic, checkable at the adapter's output). Every flexible problem
variable has exactly one `Binding` (§5.2); every `Named n` occurring
in the checked IR has an entry; terms satisfy S1-S3 (§1.3); `Free`
variables satisfy the hole contract (§1.5). Must prove: none (a
validator); its specification is here, its implementation later.

**Lay, layouts.** For every key `k` of `d` and every type expression
`τ` over `d`'s rigid variables, names and holes, `groundType (lower_k
τ) = evalT (κ(k) ∪ σ_k) τ` when the right side is defined; for
several tails this is Task 8's canonical union ("fields of all tails
joined and sorted, unsolved tails empty", split-selection §1, cited),
and for record slots the hole default (Values.purs:96-99). M14 ("after
specialization every row is ground") is a prerequisite. Must prove:
the lowering stream (Task 8's owner).

**U, forced splits.** For each name with `basis = Forced`: for every
finite `θR ⊨ D` and all `σ1`, `σ2` with `Sat (θR ∪ σi) (B ∪ BQ)`,
`σ1` and `σ2` agree on its origin variable. `Written` is the same
claim with the annotation's atom included in `B`. Must prove: the
forcedness decider's owner (unassigned; requirements §11 item 5).

**R, recorder.** R1: the recorded problem is the syntax-directed
translation of the body (T-R0b's rules), so that `Sat (θR ∪ σ) (B ∪
BQ)` implies the body is well typed at the ground instance `θR ∪ σ`.
R2: `vars` (§5.2) preserves sorts and the ∀rigid/∃flexible levels, and
its `Named` bindings are injective. Must prove: T-R0b states R1-R2; the
recorder's implementer proves them.

**T, termination.** FK-0, FK-W, FK-U (§2). Must prove: the termination
stream.

How they compose (argued): K + Lay + Adapt-N + R imply each emitted
copy is a ground instance of a well-typed body; T makes the set of
copies finite; U and the selection contract (G3) are what decision 3
admission reads; RC re-establishes K, Adapt-N's conclusion and Lay's
type-level part **at reached keys only**, narrowing the adapter's trust
obligation without discharging R, U, T or behavior preservation
(§18.64 item 3).

## 5. Interfaces offered to the parallel streams

Each item is the canonical definition; the other streams cite it.

### 5.1 T-R0a, generation and verdict (r0/generation-interface.md)

- A declaration's outcome carries **`compilation ∷ Compilation`**
  (§1.6) beside its verdict.
- Invariants: `Witnessed` only with Solved; Contradiction and
  Unresolved carry `NoWitness NotSolved`.
- **`Lowerable`** = Solved ∧ `Witnessed m` ∧ Cov(m) ∧ `Adm_W` on every
  intra-component slot ∧ decision 3's admission on each name's `basis`.
  Lowering runs only on `Lowerable` declarations and their callees; any
  missing conjunct is an Unsupported or admissibility refusal, never a
  change of verdict.

### 5.2 T-R0b, recorder rules (r0/recorder-rules.md): `vars` and names

- Before the verdict, `vars` maps each problem variable to `Rigid
  VarId` or a flexible checker variable (requirements §2.4, cited).
- After the verdict and adapter, each **flexible** problem variable has
  exactly one **`Binding = Inline (Ty Open) | Named NameId | Free
  Int`**; `NameEntry.origin` is the inverse for `Named` (injective).
- Problem variables are never renamed after recording, or the renaming
  is recorded; atoms refer to problem variables, never to solved metas.
- Sorts are preserved: a RecordSort variable binds a row name or a
  record expression, a TypeSort variable a type name or a type.

### 5.3 T-R0e, boundaries (r0/boundaries.md)

- **Admissibility** is `Adm_W` (§2.3), judged on the instantiation's
  `Open` classification and on each name's **term form** (CS), not on
  supports alone (§2.3 shows why). It is not validity and is never
  conjoined into `B` (recorder-spec §2.4, cited).
- **Support** is `support(n)` (§2.3), offered for diagnostics and
  dependency order only.
- **Unsupported reasons owned here:** `FieldReference` (§1.4),
  `NonConstructive` (§1.6), `HoleContract` (§1.5), several tails before
  Task 8 (§2.7 U-c), and RC's unsupported path (§3.3).
- **Policy:** decision 3 reads `basis`; a `Forced` basis without U's
  evidence is not forced.

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
| a term mentions only its declaration's rigid variables, earlier names, written labels and ground types (S1-S2) | ∀rigid∃flexible: a flexible variable depends on its own level's rigid variables only | a split that depends on a label written only in a caller: at the callee it is an unwritten label, placed by cells (`Restrict`) |
| set terms over `dom r` and written labels, no complement | D2 (term witnesses suffice for presence), dossier §18.3, still to be argued for finite rows | **type-agreement placement** (dossier §18.4, row 3): placing a shared label by whether `r` and `s` give it equal types is not a set term; also type-directed selection for printability (E2) |
| `Choose` literals only on (rigid row, written label) presence | G1 guards and selection paths have exactly this form (requirements §6.1-6.2) | a guard on an unwritten label: none is proposed; cells handle unwritten labels |
| one term per name for every key; no per-key table | pattern dependence is expressed by `Choose` and set terms | `divide5` under the selection format: ≥ 2^m leaves (requirements §6.2) become ≥ 2^m `Choose` leaves; size, not soundness |
| the reuse rule: names only for terms outside `Ty Open` | inlined witnesses keep today's R010 and lowering | an adapter emitting `Restrict r (Dom r)` for the identity: FK-0 refuses it in a component though it equals `{ ...r }`; a sound canonicalization to `{ ...r }` is proposed |
| inside components, CS terms only (no constructor over a rigid variable, name or reference) | mirrors R010's record-slot rule; outside components any term is safe | §2.5 examples 1 and 2: refused in a component, accepted outside |
| `Field r l` reserved, not implemented | decision 8 defers G2 without prohibiting it | G2 (requirements §6.3): Solved if some strategy proves it, then `NoWitness (AdapterUnsupported FieldReference)` |
| holes only under the hole contract | a hole that every value satisfies may take the default (ADR 007) | `route`'s `u` defaulted to `{}` today (ground-check.md §3): must be named or refused |
| no witness, no lowering; no per-key solving | decision 4 | a non-constructive proof of `divide5`: Solved, not compiled |
| record slots in components: single tail (FK-0) | decision 2's baseline | `walk`'s `{ ...u, ...v }` recursion, accepted by today's code (R019): outside FK-0, inside FK-U if adopted |
| names never occur in declared types | declared types are over `VarId` (Internal.purs:142); §4.2's type half is unchanged | `Box({ ...n })` in a body: a type key per function key, finitely many per key |

## 7. Open points for the author

1. **T1-a:** accept that the marker alone is insufficient and R010's
   generic predicates (`admissible`, `bareRow`) need an explicit
   classifier (§1.1)?
2. **Reuse rule:** names only for non-`Ty` terms (§1.3), or every
   divided part a name (uniform, but FK-0 then refuses more)?
3. **FK-W in the first design**, or FK-0 only (names refused inside
   components) until FK-0 is proved?
4. **Hole contract:** the proposed syntactic check (§1.5), or a
   stricter one (no atom may mention a hole)?
5. **`ChooseT`:** keep type-sorted guards, or require pattern-dependent
   types to be rows' field types only?
6. **RC placement and cost:** per copy (RC1-RC3, RC5), per edge (RC4),
   or both; always on, or in a checking build?
7. **FK-U:** adopt the pool argument for pure unions of rigid tails,
   which would justify today's `bareRow` on that class (§2.7 U-d)?
