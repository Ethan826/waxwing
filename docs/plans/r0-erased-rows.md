# Erased effect rows: marker, check and effect-row values

Task 0.7 of the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md), gates **G-erased
(policy)** and **G-erased (criterion)**. Date 2026-10-22, base
cfdd007; revised in fix round 1 after the task review and the
G-erased adversarial review (.superpowers/sdd/…/gate-erased.md,
findings 1-7, probes P1-P7). A design note with a characterization
probe; no compiler source or diagnostic changes. Until the author
rules G-erased and the ruling is implemented, Task 4.6 cannot land
(plan §3).

Labels: **checked** (a run recorded in the repo: test/r0-erased.test.mjs
and docs/findings.md, "Erased effect rows"), **cited** (file:line at
cfdd007), **argued** (reasoning, unchecked), **proposed** (a design
choice for the author).

## 1. The question

T-R0b erases effect rows without a marker (research/division-campaign/
r0/recorder-rules.md §2.2, §3.5): `TFun a row b` becomes `arrow a b`,
the rows of `TData` and `THandler` are dropped, and `RowSort`
variables are never translated. Dossier §18.69 Q3 does not assume
effect/record independence, so no Solved may rest on an erased row
(T-R0b §11 item 6; VR-solved, §5.4). Two concerns follow, and this
note treats them together because both come from the same erasure:

1. **Obligations.** What accounts for the obligations the erasure
   drops, so that a Solved does not rest on them.
2. **Values.** The checked IR carries effect rows, and no problem
   variable stands for an inferred one, so D1's `build` cannot
   produce them (docs/plans/r0-generation-continuation.md §12.1,
   routed here by the Task 0.3 ruling).

## 2. What the erasure drops

Today's checker relates rows in four ways. Each is a kind of erased
obligation.

| Kind | What it is | Where today (cited) | Evidence |
|---|---|---|---|
| K1, label arguments | Two rows meet; labels with one key pair up and their arguments unify with the type unifier, so a row equation can bind or refute a type or record variable | Check/UnifyRow.purs:159-163 (`foldM unifyPair` over the label arguments); a `Fail` label's key reads its payload's solved head, :136 (`failHead`) | checked: obligation-record, obligation-annotation, obligation-data |
| K1e, effect-only arguments | The same with arguments that hold no record and no type or record variable. They may hold effect-row variables (inside an arrow's row, which the translation erases), so the equation binds only effect-row variables or is a closed fact | as K1 | checked: obligation-ground (a closed fact), obligation-rowvar (binds a row variable; gate P1) |
| K2, rows met through types | A type equation between arrows, data or handler types also equates their rows, so the record solution decides which rows meet | Check/Unify.purs:151-163 (`unifyRowsAt`, `unifyArrows`, `unifyInference`) | checked in Task 0.5: every check-time effect refusal reads `state.subst`, and the `selected` variants show the verdict following the solver's record choice (docs/findings.md, "Effect and coverage audit") |
| K3, values | The inferred rows the checked IR stores: every fresh row created at a site of §2.1's enumeration that reaches the checked IR, and rows inside the solved image of any type or record variable. The checked `Instantiation` holds type and record slots only (D1 §8, S8; gate P7: `fn g(): Int = k()` checks to `Call(0 [] [])`) | §2.1; src/Domain/Checked/Internal.purs:45-54; D1 §12.1 | checked per site (§2.1's probes) |

Mark obligations (`nofail`, mark variables) are effect-only and fall
under K2 (Task 0.5's MarkReport rows; gate P5).

### 2.1 Where fresh effect rows are made (K3, enumerated)

*Added in fix round 2 (re-review N1: bare `show` and applying a
meta-typed value were missing).* Method: every match in
src/Features/Check of `grep -rn "openRow (Hole\|Hole (state.next\|Hole
state.next\|(Just (Hole\|Just (Meta\|Meta fresh"` and of `grep -rn
"TFun [a-z(]"`, read with the helpers they call (Stages, Scheme,
DeclarationUse). Type-sorted metas (`TVar (Hole …)`) and record rows
(RowMerge) are left out; a type meta's image holds only rows made
elsewhere in this table. "Reaches the IR" was probed where the code
did not settle it, by printing `g`'s checked body (a scratch script
running parse, resolve and check on the worktree's `output/`; the
probes and their outputs are in docs/findings.md, fix round 2).

| Site | Fresh row | Reaches the checked IR | P-ii trigger | E-a slot |
|---|---|---|---|---|
| Check/Lambda.purs:37 and Stages.purs:23 (`stages`, via Lambda.purs:42) | a lambda's row and its inner stages' rows | yes: the lambda's arrow type | `Lambda` | `⟨p, effect⟩`, `⟨p, stage k⟩` |
| Check/Clauses.purs:73-74 | a handler literal's inference and clause rows | yes: the THandler type (gate P7) | `Handler` | `⟨p, handler⟩`, `⟨p, clauses⟩` |
| Check/Operation.purs:123 (`crashRef`) | `crash` as a value: its lambda's row | yes (gate P7) | `CrashRef` | `⟨p, effect⟩` |
| Check/Show.purs:47 (`showRef`) | bare `show`: its lambda's row | yes: probe show-reference, `TFun(TVar(Hole(0)) Row([] Just(Hole(1))) TText)` | `ShowRef` (new) | `⟨p, effect⟩` |
| Check/Apply.purs:182 (`bindArrow`, :176-184) | applying a value whose type is a meta binds it to an arrow with a fresh row | yes, solved: probe apply-meta stores `TFun(TInt Row([] Just(Rigid(0))) TInt)` in the `Construct`, pattern and local types, though no row is written | any `Apply` or `Pipe` (new) | `⟨p, apply⟩` |
| Check/Scheme.purs:126 (`instantiate`) with DeclarationUse.purs:75-81 (`openedRow`, Stages.purs:35; `stages`, Stages.purs:23) | at a use of a function, constructor or operation: instances of its `RowSort` variables, its own row opened with a fresh tail, and fresh rows for its stages | yes, in a reference's arrow (`FunctionRef`, `CtorRef`, `OperationRef`), in the remaining stages of a partial application (Call.purs:191; probes partial-call, partial-construct, partial-perform), and wherever a declared type with an open row is instantiated | a reference; a partial `Call`, `Construct` or `Perform`; an application whose declared types hold an open row | `⟨p, inst i⟩`, `⟨p, opened⟩`, `⟨p, stage k⟩` |
| Check/Match.purs:110 (`instantiate` of the owner) | a constructor pattern's instances of the owner's row parameters | yes, solved: probe pattern-row stores the instance in the pattern types | a constructor pattern whose fields hold an open row (new) | `⟨p, inst i⟩` |
| Check/Defer.purs:84 | the deferred expression's row | no: the checked `Defer` item holds only its expression (src/Domain/Checked/Internal.purs:109); probe defer-plain | none needed | none |
| Check/Consume.purs:113, :226 | the throwaway tail of a consumed stage | no: an operand of consumption, never stored in an expression (argued from the code) | none needed | none |
| Check/Binding.purs:134-136, UnifyRow.purs:200, RowFinish.purs:100, Groups.purs:102 | the fresh tail when a row meta is extended, and a handler group's remainder | only inside the image of a row meta made above (derived, argued) | that row's | inside that slot's image |
| Check/TailPass.purs:116, :129; RowFinish.purs:112 | none: they re-bind an existing meta | as that meta | that meta's | that meta's |
| Check/Operation.purs:84 (`printRef`), :137 | `Console`, closed and written | not inferred | none needed | none |
| Check/MarkUse.purs:113-129 (`freshRow`) | fresh marks only; labels and tails unchanged | not a new row | none needed | none |
| Check/ArgumentRow.purs:155 | a hypothetical arrow for a diagnostic | no | none needed | none |

**The five obligation pairs (checked).** Each is a refused program and
a control that differs in one record, type or label
(test/fixtures/r0/erased/obligation-*). With
`effect State(s) { fn get(): s; fn put(value: s): Unit; }` and
`fn apply(f: Unit -> Unit with State(a), x: a): Unit with State(a)`:

- obligation-record: `fn g(h: Unit -> Unit with State({ x: Int })):
  Unit with State({ x: Int }) = apply(h, { y: 1 })` is E_TYPE
  `Expected { x: Int }, found { y: Int }` at `{ y: 1 }`; with
  `{ x: 1 }` it compiles. Its recorded problem by hand (T-R0b E4,
  Sig rules; argued, no generator exists yet) is `eq (Unit → Unit)
  (Unit → Unit)` for `h` and `eq { y: Int } α` for `apply`'s fresh
  `α = ⟨p, inst a⟩`, which `α = { y: Int }` satisfies. The obligation
  `α = { x: Int }` reaches `apply` only through the `State` label's
  argument. No T-R0b marker applies: there is no operation, handler,
  `fail`, `with`, `defer` or data application.
- obligation-annotation: the same obligation through a lambda
  annotation, `let k = fn(q: Unit -> Unit) => apply(q, { y: 1 });
  k(h)`, where `q`'s arrow gets the lambda's row (`annotationRow`,
  Check/Lambda.purs:83-85). Refused with E_TYPE `Expected Unit ->
  Unit, found Unit -> Unit` at `h`; the control compiles.
- obligation-data (gate P2): the same obligation through a data type's
  row argument, `type Job(...e) = Job(Unit -> Unit with ...e)`,
  `apply(j: Job(State(a)), x: a)` and `g(j: Job(State({ x: Int })))`.
  The same E_TYPE at `{ y: 1 }`; the control compiles.
- obligation-ground: `one(f: Unit -> Unit with State(Bool))` given
  `h: Unit -> Unit with State(Int)`. Refused with `Expected Unit ->
  Unit, found Unit -> Unit`; with `State(Bool)` it compiles. No record
  and no variable is involved.
- obligation-rowvar (gate P1): `link(h: Unit -> Unit with Reg(Unit ->
  Unit with ...r), k: Unit -> Unit with ...r)` given `h` with
  `Reg(Unit -> Unit with Log + ...e)` and `k` with `Clock + ...e`. K1
  binds `r` to `Log + ...e` through `Reg`'s argument, and `k` is
  refused with E_EFFECT (FX018's text); with `Log + ...e` it
  compiles. Unmarked: every label argument translates to `arrow unit
  unit`.

With label-argument unification removed (mutant M1, findings), all
five refused programs compile, and nothing else in the probe changes
outcome (checked).

**Claim A (argued; the reviewer's main target).** Erased obligations
reach a type or record variable only through K1:

- A1. Every label in a row built while checking `f` is an instance
  of a label written in a source of §4 or made at one of three sites:
  the performed label (Check/Operation.purs:160-162, the effect's
  parameters as fresh variables), the failed label
  (Check/Failure.purs:47, the payload's type) and `Console`
  (Check/Operation.purs:137, no argument). Every other `Label` built
  in Features.Check copies one, changing only its mark or applying a
  substitution (UnifyMark.purs:66-125, Install.purs:123-124,
  Frames.purs:123-124, MarkUse.purs:119, Subst.purs:211-212,
  RowMerge/Desugar.purs:134-137; found by searching for `Label`
  applications; the gate's search of Features.Check and
  Features.Resolve agreed, and found `Fail.fail` as a value resolves
  to a lambda around a `Fail` node, Resolve/Qualified.purs:173-181).
- A2. Row unification calls the type unifier only on matched labels'
  arguments (UnifyRow.purs:159-163), and its only other read of a type
  is the `Fail` key (:136), again of a label argument.
- A3. A handler type's label arguments are recorded, as `app (Handler
  e)` arguments (T-R0b §2.2); only its two rows are erased.
- A4. Consumption, mark, `defer` and `main` checks read rows and marks
  and bind no type variable (Task 0.5's table cites each read).

## 3. What "accounted for" must cover

K1 hides **record obligations** in rows. Under R0 a record obligation
is decided by a trusted check over recorded atoms, so a Solved on a
problem that misses one rests on effect/record independence, which
Q3 forbids. obligation-record shows the gap: the online search refuses
it today, but a strategy that solves only the recorded atoms would
call it Solved.

K1e, K2 and K3 are **effect-only**. No trusted code checks effects on
any path today; today's checker checks them jointly with records. No
marker of record obligations can account for them: obligation-ground
and obligation-rowvar are unmarked, yet their erased obligations are
false. Every option therefore needs two parts: one for (i) record
obligations hidden in rows, one for (ii) effect-only obligations
(K1e, K2) and the row values (K3).

## 4. Option (a): a syntactic marker (T-R0b's default)

**Kind name (proposed):** `ErasedRow`, a new `Outside` constructor
beside T-R0b §3.5's; the reason is `Unsupported (Outside ErasedRow)`
under T-R0a §5.3 rule 1.

**Criterion C-erased (proposed).** For a resolved declaration `f`,
its *label sources* are the labels in these places. Types are read
**as declared**, in their owner's variables, before instantiation
(instantiation maps variables to variables, so it cannot change
whether an argument holds one), and each type is read at any depth
(inside arrow rows, data type arguments and rows, handler types,
record fields and label arguments):

| Source | Labels |
|---|---|
| `own` | `f.row`, `f.parameters[].ty`, `f.result` |
| `annotation` | every lambda parameter annotation `Param.ty` in `f.body` |
| `handler` | every `Handler` literal's label, and each of its clauses' parameter and result types; every `Handle` clause's label |
| `callee` | for every `FunctionRef` or `Call` of `g` in `f.body`: `g.row`, `g.parameters[].ty`, `g.result` |
| `constructor` | for every `CtorRef`, `Construct` or constructor pattern of `c` in `f.body`: `c.fields` |
| `perform` | for every `OperationRef` or `Perform` of operation `i` of effect `e` in `f.body`: the **performed label** `e(ē)`, whose arguments are `e`'s parameters as variables, and the declared parameter and result types of operation `i` |
| `clause` | for every clause of a `Handler` literal of effect `e` in `f.body`, handling operation `i`: the declared parameter and result types of operation `i` (no performed label) |
| `fail` | for every `Fail _ family e` in `f.body`: the **failed label** `Fail(τ)`, with `τ` the written family, or unknown when none is written; and the labels inside a written family |

"In `f.body`" includes dead code (T-R0b G-dead). `Console` labels
have no argument and never count. **`Fail` overlap:** a `Fail` node,
including `Fail.fail` used as a value (A1), contributes to `fail`
only; it is not an `OperationRef` or `Perform`, so `perform` never
sees it; a `Handle` clause's label (`fail(error: E)`) belongs to
`handler` only. So each place in the syntax belongs to one source.

A label is **record-capable** when some argument, translated by
T-R0b §2.2 (rows erased), contains a `record` node or a `tvar` (a type
or record variable, rigid or flexible); effect-row variables do not
count. A performed label is record-capable exactly when `e` has a
parameter; a failed label is record-capable unless its family is
written and holds no record and no variable (T-R0b E23's condition
for `FailFamily`, so every `fail` it marks is also `FailFamily`).
A source **fires** when one of its labels is record-capable. **`f` is
marked when some source fires.** The marker is emitted once per
firing occurrence, with that occurrence's origin (`contract` for
`own`), so it is decided from the node and the tables, never from a
solved type (T-R0b §3.5).

**Reference reading (checked).** test/r0-erased-criterion.mjs reads
this table over resolved syntax. Each fixture's `sources`, `marked`
and `inferredRow` (§7) were derived by hand from the table, and
test/r0-erased.test.mjs checks them against the reference reading for
all 34 fixtures. The mutants of the reference reading are each
caught (findings, M5-M7 and M8-M12). It is a check of the fixtures' answers, not
Task 3.5's detector.

**What counts, in the brief's terms.** Effect operations: a perform
or reference of an operation of a parameterized effect (`State.put`,
`State.get`), always; of an unparameterized one (`Log.log`), only
through record-capable labels in its operation's types. Handler
types: a handler literal whose label arguments, or whose clauses'
types, hold a record-capable label (`handler State({ x: Int })`), and
any handler type written in a source (`Handler(State(a))` in a
signature); `handler State(Int)` and `handler Log` do not count,
though `HandlerType` still marks them. `fail` payloads: every `fail`
without a written family, and every written family holding a record
or a variable.

**The lambda annotation row (T-R0b §11 item 10).** `annotationRow`
replaces the declaration's ambient row variable (a `RowSort`
variable, the last `VarId`, Resolve/Signature.purs:46-48) inside an
annotation by the lambda's fresh row (Check/Lambda.purs:37, 83-85).
It adds no label, so the label sources are unchanged; it makes rows
meet, which is K2. A record obligation carried through it still needs
a record-capable label from some source (A1): in obligation-annotation
those are `g`'s own row and `apply`'s signature, and form/annotation-
bare (a `Log` callback through the shared row) is unmarked (checked
against the reference reading; the fixture compiles).

**Argument for unmarked declarations (argued; restated after gate
finding 1).** If `f` is unmarked, every label in a row of `f`'s check
has arguments with no record and no type or record variable (A1,
since instantiation keeps that property). Such arguments may still
hold effect-row variables, so a K1 equation in `f` binds only
effect-row variables (A2), whose images hold labels from the same
sources (A1), which again hold no record and no type or record
variable; or it is a closed fact. Handler arguments are recorded
anyway (A3), and the other checks bind nothing (A4). So no erased
obligation of `f` binds or refutes a type or record variable: the
recorded atoms carry every record obligation, and a Solved on them
does not rest on independence for records. What remains is
effect-only, part (ii): obligation-ground and obligation-rowvar are
unmarked and refused.

**Precision (argued).** Conservative: `f` is marked even when its
record-capable label never meets another label with its key (an
unused `with State(a)`). A finer criterion needs flow between rows,
which a syntactic rule cannot see; none is proposed.

**Overlap with T-R0b's markers.** Every `EffectArgument` site fires
`perform`; every `fail` firing `fail` is also `FailFamily`;
`HandlerType` neither implies nor is implied. The new cost is the
declarations marked by `own`, `annotation`, `callee`, `constructor`,
`clause` or a record-capable written handler label alone, which the
census counts (§8).

## 5. Option (b): a check at the accepted witness

**The check (proposed).** Given the accepted witness `σ` with its
effect rows (§6), substitute `σ` into the declaration and check every
erased obligation: today's effect rules over the built declaration,
with every type and record variable fixed by `σ`. Its argument, by
kind (docs/engineering.md, "a written argument before implementation";
this is an acceptance check, so the argument is that acceptance
implies the claim, and a refusal establishes nothing beyond `σ`):

- K1 and K1e. If they hold at `σ`, `σ` with its rows solves the whole
  declaration, so the claimed result (Solved with `σ`) is unaffected.
  `σ` keeps rigid variables symbolic, so a unification check at `σ`
  holds for every rigid assignment (argued).
- K2. The effect verdict at `σ`. A refusal reads a solver-selected
  binding, so it is class f, `Unsupported (ClassF …)` (Q3, decided),
  unless `σ` is forced (G-forced).
- K3. The rows checked are the witness's (§6, E-a), so the IR built
  from them satisfies the erased obligations.
- The lambda annotation row is one of the checked rows; nothing
  special.

Two realizations:

- **(b-joint)** The check is today's checker solving records and
  effects together, as it does now. It exists only inside the online
  search, so it covers only the online witness, and its effect part
  is untrusted. No new code. Kept provisionally; its trigger is
  superseded by the ruling (§7.1).
- **(b-trusted)** A new checker of the erased obligations over the
  built IR, for any strategy's witness. **New machinery, flagged
  (ADR 014):** its parts are published (Leijen's scoped-label
  unification, 2005 §7, which UnifyRow already cites; checking a
  candidate solution), their composition and the trusted effect
  checker are not. Not proposed for this plan.

## 6. Effect-row values (D1 §12.1)

- **E-a.** Effect-row metas become atom-free flexible variables of
  sort `EffectRowSort` with canonical names; the witness binds them;
  the online adapter reads them back. Names (proposed, extending
  §12.1's `⟨p, effect⟩` and `⟨p, inst i⟩`): one per IR-reaching site
  of §2.1's table, in its last column (`⟨p, effect⟩`, `⟨p, stage k⟩`,
  `⟨p, handler⟩`, `⟨p, clauses⟩`, `⟨p, apply⟩`, `⟨p, inst i⟩`,
  `⟨p, opened⟩`).
  **Clarification (argued; amended after gate finding 3).** K3 also
  holds rows inside images. A witness binding `Inline τ` is a
  `Ty Open` (D1 §3.2's table), whose arrows, data and handler types
  carry rows, and G0 checks atoms that erase them, so those rows are
  witness content no atom checks. Moreover D1 §9 keeps the metas
  inside `Inline` images in the online solver's numbering, while E-a
  names the effect-row slots canonically: an image's `Hole m` matches
  a slot `⟨p, effect⟩ ↦ Free m` only through the online adapter's
  shared numbering. **E-a is therefore sufficient only together with
  (b-joint)**, which makes every other strategy's Solved non-lowerable
  (§7, §7.1); without (b-joint), E-a must also require effect-row metas
  inside images to be named variables. Under E-a, D1 §9's
  effect-erased scope for T2 and T8 (§10) should be revisited: the
  effect positions are then in the witness, so the comparison can
  include them for the online witness.
- **E-b.** `build` takes an injected effect elaboration. A second
  input outside the witness, the untracked read D1 exists to prevent,
  unless it is (b-trusted)'s output computed from `σ`.
- **E-c.** Lowering stops reading effect rows. Needs an audit of
  specialization keys (they carry an effect component), and removes
  no obligation: part (ii) still needs the rows.

## 7. Recommended default (policy, for the author)

**Part (ii)'s trigger, P-ii (proposed; revised in fix round 2).**
P-ii(`f`) holds when `f.body`, dead code included, contains a
`Lambda`, a `Handler` literal, `CrashRef`, `Crash`, `ShowRef`, a
`FunctionRef`, `CtorRef` or `OperationRef`, or any `Apply` or `Pipe`;
or a `Call`, `Construct` or `Perform` that is partial (fewer arguments
than declared parameters) or whose declared parameter or result types
hold a row with a tail variable or a label with a variable argument;
or a constructor pattern whose constructor's fields hold such a row.
Each disjunct is the trigger of an IR-reaching site of §2.1's
enumeration, so P-ii holds whenever one of those sites is in `f`
(argued from the enumeration; each new disjunct has a fixture and a
mutant, findings). It over-approximates "the checked IR of `f` holds
an inferred effect row" (K3): an `Apply` of a parameter of known arrow
type triggers it without making a row. The exact property would need
the provenance of each row in the checked IR, which today's IR does
not keep. **It holds for pure declarations too:** any declaration with
a lambda, a function reference or an application of a local, such as
`fn g(): Int = k(fn(u: Unit) => (), 1)` (gate P7). The reference
reading implements it, and the fixtures' `inferredRow` field records
it.

1. **Part (i): option (a).** `ErasedRow` by C-erased, joining T-R0a
   §5.3 rule 1 (plan Task 4.1: "After G-erased, its ruled marker or
   check joins here"). No new machinery; Task 3.5 counts its cost.
2. **Part (ii): (b-joint).** *Superseded by §7.1 (2026-10-23): P-ii
   no longer decides whether effect validation is needed; every
   lowered declaration needs it. P-ii survives only as a detector
   of where inferred rows exist, i.e. E-a's slots and the census's
   informational count (§8).* A Solved on a declaration for which P-ii
   holds is lowered only with rows and an effect verdict from a joint
   solve at the same witness. Today only the online strategy provides
   that. Another strategy's Solved on such a declaration is
   Unresolved with a **new support reason, distinct from `ClassF`**:
   class f is a refusal that reads a solver-selected binding, and this
   is a Solved whose effect part nobody checked, closer to an
   `outside` kind. A placeholder name is `EffectsUnchecked`; the
   constructor and its place in T-R0a §3.5 are the T-R0a owner's.
   Consequence: the first non-online strategy (Task 5.2 or later) can
   lower nothing for which P-ii holds, which is nearly every
   declaration with a lambda or a function reference, until
   (b-trusted) exists.
3. **Assurance.** An online Solved's effect part rests on the joint
   solve, which is untrusted code. Under §18.69 item 9 it is labelled
   **Pending assurance**, never presented as checked; the record part
   is checked by G0 as usual.
4. **Values: E-a with §6's names and clarification**, dependent on
   (b-joint), which lets G-D1 close on the author's ruling.
5. **Exemption route:** (b-trusted), later, under G-exempt's rule
   (an argument and a check per kind). Not authorized here.

Why: it keeps the trusted record check over every record obligation
(the marker removes the declarations whose rows could hide one),
leaves effect checking where it is today with its assurance stated,
and adds no code beyond syntactic detectors.

| Choice | Narrowing at the switch | Trust in effects | New machinery | Other strategies |
|---|---|---|---|---|
| Recommended: (a) + (b-joint) + E-a | declarations marked `ErasedRow` and no other marker (census) | untrusted joint solve, Pending assurance | none | no lowerable Solved without equivalent effect validation (§7.1) |
| (b-joint) alone + E-a | none expected (argued: online accepts exactly today's programs) | as recommended, and record obligations hidden in rows are also checked only by untrusted code | none | as above |
| (a) + (b-trusted) + E-a | as recommended, until exemptions | trusted | trusted effect checker | any |
| (a) alone | as recommended | none: K1e, K2, K3 unaccounted | none | rejected: obligation-ground and obligation-rowvar are unmarked and their obligations false |
| Call such declarations Solved anyway | none | none | none | rejected (§18.70, option D) |

**Points the author rules (G-erased (policy); from the gate review).**
**Ruled 2026-10-23; see §7.1.** The list is kept for the record.

1. `ErasedRow` as a new `Outside` kind under C-erased as revised here.
2. Whether a Solved may rest on the untrusted online joint solve for
   effects, labelled Pending assurance (item 3). This is a trust and
   assurance boundary that §18.69 items 3 and 9 and §18.70 do not
   settle; it is needed before Task 4.6, not in this tranche.
3. The Unresolved reason for a demoted non-online Solved: not
   `ClassF`; named by the T-R0a owner.
4. E-a, stated as dependent on (b-joint) and with the K3 list of §2.1,
   so that G-D1 can close.
5. Whether an operation's ignored `with` row (gate P6; BACKLOG FX032)
   is a live-checker defect.

### 7.1 The author's ruling (2026-10-23)

G-erased (policy), in the author's terms:

1. `ErasedRow` is adopted as a temporary support boundary for shadow
   recording and the census. It means "the record model discarded
   information that might matter to this declaration's record
   types", not that the program is invalid. The narrowing it causes
   is **not approved**; it is decided after the census and review.
   Option E remains the destination.
2. Joint record-and-effect checking stays provisionally, under a
   broader invariant: *every declaration that reaches lowering has
   its effect obligations validated against the same record/type
   witness used to build its checked representation.* Today's joint
   checker supplies that validation. Another strategy needs
   equivalent validation, or a reviewed exemption showing no erased
   obligations remain; the absence of inferred rows is insufficient.
   Assurance is stated separately: record witness checked; effect
   assurance pending; never presented as formally verified.
3. A distinct Unresolved reason, working name `EffectsUnchecked`,
   covers omitted effect obligations generally, not only missing
   inferred-row values. "This strategy hasn't checked your effects"
   is an implementation limitation and stays Unresolved.
4. E-a is adopted conditionally, tied to item 2: recording an answer
   does not validate it. Adapter tests must check consistent
   bindings at the named slots and inside nested types. This settles
   G-D1's policy dependency, not the implementation's correctness.
5. Silently ignored operation-level `with` clauses (BACKLOG FX032)
   are a defect. Recommended: reject unsupported ones for now rather
   than invent a meaning, distinguishing an operation requiring an
   effect whenever invoked from a handler using an effect to
   implement it; effects on callbacks inside operation parameters
   stay supported. A separate compatibility fix, outside the
   acceptance-preserving shadow tranche.

**Counterexample behind item 2 (the author's; argued from §7's P-ii
text; a fixture is scheduled with Task 3.5; not run). A plain fence
keeps it out of the pinned corpus until that fixture lands.**

```text
effect Log { fn log(n: Int): Unit; };

fn g(): Unit with pure = Log.log(1);

fn main(): Int = 0;
```

Today's compiler rejects `g` (correct). Neither detector (C-erased,
P-ii) fires, and the recorder retains only `Unit = Unit` and
`Int = Int`, so a records-only strategy could satisfy those without
establishing the purity promise.

## 8. The census categories (Task 3.5)

**Erased rows (G-erased), §3.2(a).** Among the declarations that
compile today, those C-erased marks, computed by Task 3.5's test-only
detector over resolved syntax (ruling R11) with the tables (callee
signatures, constructors, effects). Recorded:

- declarations marked, and programs with at least one marked
  declaration (as for every category);
- declarations marked by `ErasedRow` and no other `outside` kind: the
  marker's own cost;
- declarations per firing source (`own`, `annotation`, `handler`,
  `callee`, `constructor`, `perform`, `clause`, `fail`); one
  declaration may count under several.

**Inferred effect rows (part (ii)), informational.** Among the
declarations that compile today, those for which P-ii holds, and the
programs containing one. Not narrowing while the online strategy is
the only one; read as where inferred rows exist (§7.1 supersedes
P-ii as the validation trigger) and as the reach of the
Pending-assurance label.

The fixtures' `sources`, `marked` and `inferredRow` fields are the
detectors' expected answers: Task 3.5 asserts them, and a
disagreement is a detector or criterion defect.

## 9. For the adversarial review (G-erased (criterion))

The reviewer's task: **find an erased obligation that C-erased misses**
(an unmarked declaration whose rows bind or refute a type or record
variable), or a false step in Claim A. The first review (gate-erased.md)
found none; its findings 1-7 are applied here.

| Restriction | Why believed harmless | Built to challenge it |
|---|---|---|
| Labels are read from written types and three construction sites (A1) | search of `Label` applications in Features.Check and Features.Resolve | a label built elsewhere, e.g. in RowMerge or handler installation |
| Effect-only label arguments bind no type or record variable | they hold none; effect-row variables they hold bind to source labels | obligation-ground, obligation-rowvar: harmless for records, not for effects (part ii) |
| Data types without arguments are nominal | `base t = base t` binds nothing | a constructor's fields reached without naming the constructor (gate: no route) |
| Callees are read by signature only (G-local) | every signature is written, row included (Resolve/Signature.purs) | an inferred row anywhere in a signature |
| Operations' own `with` rows are not read | they are dropped at Resolve (gate P6; Resolve/Effect.purs:47-58) | if they are ever honoured, `perform` must read them |

Soundness pass: start from obligation-record and move its labels
(into a data field, a data row argument, a handler type, an
operation's type, a label argument's row) until it is unmarked yet
still refused on a record; each form fixture and obligation-data is
one such move that the criterion catches. Completeness pass: C-erased
is not complete and is not claimed to be (§4, precision); the census
measures its cost.

**Claims ledger.**

| Claim | Label |
|---|---|
| The five obligation pairs: refused and compiling as stated | checked (test/r0-erased.test.mjs) |
| Those refusals need label-argument unification | checked (mutant M1, findings) |
| The 24 form fixtures compile today and contain their form | checked |
| The fixtures' `sources`, `marked` and `inferredRow` are the tables' answers | checked against the reference reading (mutants M5-M12); Task 3.5's detector checks them again |
| obligation-record's recorded problem is satisfiable | argued (hand translation) |
| Claim A (A1-A4) and the unmarked-declaration argument | argued, with citations; gate review found no counterexample |
| §2.1 lists every fresh effect-row site in Features.Check | checked by grep (method in §2.1); "reaches the IR" probed where unclear |
| P-ii triggers at every IR-reaching site of §2.1 | argued from the table; each disjunct has a fixture and a mutant (M8-M12) |
| (b-joint) narrows nothing | argued |
| Rows inside witness images are unchecked by G0 | argued from D1 §3.2 and §9 |

Not covered: the census numbers wait for Task 3.5; the reason name
and the trusted checker of (b-trusted) are left to their owners.
