# Erased effect rows: marker, check and effect-row values

Task 0.7 of the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md), gates **G-erased
(policy)** and **G-erased (criterion)**. Date 2026-10-22, base
cfdd007. A design note with a characterization probe; no compiler
source or diagnostic changes. Until the author rules G-erased and the
ruling is implemented, Task 4.6 cannot land (plan §3).

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
| K1, label arguments | Two rows meet; labels with one key pair up and their arguments unify with the type unifier, so a row equation can bind or refute a type or record variable | Check/UnifyRow.purs:159-163 (`foldM unifyPair` over the label arguments); a `Fail` label's key reads its payload's solved head, :136 (`failHead`) | checked: obligation-record and obligation-annotation (below) |
| K1g, ground arguments | The same with arguments that hold no record and no variable: a closed fact, true or false | as K1 | checked: obligation-ground |
| K2, rows met through types | A type equation between arrows, data or handler types also equates their rows, so the record solution decides which rows meet | Check/Unify.purs:151-163 (`unifyRowsAt`, `unifyArrows`, `unifyInference`) | checked in Task 0.5: every check-time effect refusal reads `state.subst`, and the `selected` variants show the verdict following the solver's record choice (docs/findings.md, "Effect and coverage audit") |
| K3, values | The rows the checked IR stores: a lambda's row (a fresh meta, Check/Lambda.purs:37), each instantiated `RowSort` variable (every signature has an ambient row variable, Resolve/Signature.purs:46-48, so every call instantiates one), a constructor's row parameters, and the rows inside the solved image of any type or record variable | src/Domain/Checked/Internal.purs:45-54; D1 §12.1 | argued |

Mark obligations (`nofail`, mark variables) are effect-only and fall
under K2 (Task 0.5's MarkReport rows).

**The three obligation fixtures (checked).** Each is a refused program
and a control that differs in one record or one type
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
- obligation-ground: `one(f: Unit -> Unit with State(Bool))` given
  `h: Unit -> Unit with State(Int)`. Refused with the same text; with
  `State(Bool)` it compiles. No record and no variable is involved.

With label-argument unification removed (mutant M1, findings), all
three refused programs compile, and nothing else in the probe changes
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
  applications).
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

K1g, K2 and K3 are **effect-only**. No trusted code checks effects on
any path today; today's checker checks them jointly with records. No
marker of record obligations can account for them: obligation-ground
holds no record and no variable, so a record criterion leaves it
unmarked, yet its erased obligation is false. Every option therefore
needs two parts: one for (i) record obligations hidden in rows, one
for (ii) effect-only obligations and the row values.

## 4. Option (a): a syntactic marker (T-R0b's default)

**Kind name (proposed):** `ErasedRow`, a new `Outside` constructor
beside T-R0b §3.5's; the reason is `Unsupported (Outside ErasedRow)`
under T-R0a §5.3 rule 1.

**Criterion C-erased (proposed).** For a resolved declaration `f`,
its *label sources* are the labels in these places, each read at any
depth (inside arrow rows, data type arguments and rows, handler types,
record fields, and label arguments):

| Source | Labels |
|---|---|
| `own` | `f.row`, `f.parameters[].ty`, `f.result` |
| `annotation` | every lambda parameter annotation `Param.ty` in `f.body` |
| `handler` | every `Handler` literal's label and each clause's parameter and result types; every `Handle` clause's label; every written `fail` family (`Fail _ (Just ty) _`) |
| `callee` | for every `FunctionRef` or `Call` of `g` in `f.body`: `g.row`, `g.parameters[].ty`, `g.result` |
| `constructor` | for every `CtorRef`, `Construct` or constructor pattern of `c` in `f.body`: `c.fields` |
| `operation` | for every `OperationRef` or `Perform` of operation `i` of effect `e`, and every handler clause for it: the operation's parameter and result types, and the **performed label** `e(ē)` whose arguments are `e`'s parameters as variables |
| `fail` | for every `Fail _ family e`: the **failed label** `Fail(τ)`, with `τ` the written family, or unknown when none is written |

"In `f.body`" includes dead code (T-R0b G-dead). `Console` labels
have no argument and never count.

A label is **record-capable** when some argument, translated by
T-R0b §2.2 (rows erased), contains a `record` node or a `tvar` (a type
or record variable, rigid or flexible); a performed label is
record-capable exactly when `e` has a parameter; a failed label is
record-capable unless its family is written and holds no record and
no variable (T-R0b E23's condition for `FailFamily`, so every `fail`
it marks is also `FailFamily`). **`f` is marked when some label
source of `f` holds a record-capable label.** The marker is emitted
once per firing occurrence, with that occurrence's origin (`contract`
for `own`), so it is decided from the node and the tables, never from
a solved type (T-R0b §3.5).

**What counts, in the brief's terms.** Effect operations: a perform
or reference of an operation of a parameterized effect (`State.put`,
`State.get`), always; of an unparameterized one (`Log.log`), only
through record-capable labels in its operation's types. Handler
types: a handler literal or handler type whose label arguments, or
whose rows' labels, are record-capable (`handler State({ x: Int })`;
`Handler(State(a))` in a signature); `handler State(Int)` and
`handler Log` do not count, though `HandlerType` still marks them.
`fail` payloads: every `fail` without a written family, and every
written family holding a record or a variable.

**The lambda annotation row (T-R0b §11 item 10).** `annotationRow`
replaces the declaration's ambient row variable (a `RowSort`
variable, the last `VarId`, Resolve/Signature.purs:46-48) inside an
annotation by the lambda's fresh row (Check/Lambda.purs:37, 83-85).
It adds no label, so the label sources are unchanged; it makes rows
meet, which is K2. A record obligation carried through it still needs
a record-capable label from some source (A1): in obligation-annotation
those are `g`'s own row and `apply`'s signature, and form/annotation-
bare (a `Log` callback through the shared row) is unmarked (argued;
fixtures checked to compile).

**Argument for unmarked declarations (argued).** If `f` is unmarked,
every label in a row of `f`'s check has arguments with no record and
no variable (A1, since instances of ground labels are the labels
themselves), so every K1 equation is between closed types and binds
nothing (A2); handler arguments are recorded anyway (A3); the other
checks bind nothing (A4). So the recorded atoms carry every record
obligation of `f`, and a Solved on them does not rest on independence
for records. Part (ii) is untouched: obligation-ground is unmarked.

**Precision (argued).** Conservative: `f` is marked even when its
record-capable label never meets another label with its key (an
unused `with State(a)`). A finer criterion needs flow between rows,
which a syntactic rule cannot see; none is proposed.

**Overlap with T-R0b's markers.** Every `EffectArgument` site fires
`operation`; every `fail` firing `fail` is also `FailFamily`;
`HandlerType` neither implies nor is implied. The new cost is the
declarations marked by `own`, `annotation`, `callee`, `constructor`
or a record-capable written handler label alone, which the census
counts (§8).

## 5. Option (b): a check at the accepted witness

**The check (proposed).** Given the accepted witness `σ` with its
effect rows (§6), substitute `σ` into the declaration and check every
erased obligation: today's effect rules over the built declaration,
with every type and record variable fixed by `σ`. Its argument, by
kind (docs/engineering.md, "a written argument before implementation";
this is an acceptance check, so the argument is that acceptance
implies the claim, and a refusal establishes nothing beyond `σ`):

- K1 and K1g. If they hold at `σ`, `σ` with its rows solves the whole
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
  is untrusted, as today. No new code.
- **(b-trusted)** A new checker of the erased obligations over the
  built IR, for any strategy's witness. **New machinery, flagged
  (ADR 014):** its parts are published (Leijen's scoped-label
  unification, 2005 §7, which UnifyRow already cites; checking a
  candidate solution), their composition and the trusted effect
  checker are not. Not proposed for this plan.

## 6. Effect-row values (D1 §12.1)

- **E-a.** Effect-row metas become atom-free flexible variables of
  sort `EffectRowSort` with canonical names; the witness binds them;
  the online adapter reads them back. **Clarification (argued):** K3
  also holds rows inside images. A witness binding `Inline τ` is a
  `Ty Open` (D1 §3.2's table), whose arrows, data and handler types
  carry rows, and G0 checks atoms that erase them. So those rows are
  witness content no atom checks, exactly as the metas are. E-a must
  say so; it needs no further mechanism, and the online adapter reads
  them back with the images.
- **E-b.** `build` takes an injected effect elaboration. A second
  input outside the witness, the untracked read D1 exists to prevent,
  unless it is (b-trusted)'s output computed from `σ`.
- **E-c.** Lowering stops reading effect rows. Needs an audit of
  specialization keys (they carry an effect component), and removes
  no obligation: part (ii) still needs the rows.

Under E-a the rows are the witness's and nothing trusted checks them,
so a witness's rows are only as good as the strategy that produced
them: the online strategy's come from today's joint solve.

## 7. Recommended default (policy, for the author)

1. **Part (i): option (a).** `ErasedRow` by C-erased, joining T-R0a
   §5.3 rule 1 (plan Task 4.1: "After G-erased, its ruled marker or
   check joins here"). No new machinery; Task 3.5 counts its cost.
2. **Part (ii): (b-joint).** A Solved on a declaration whose checked
   IR has an effect row that is not declared is lowered only with
   rows and an effect verdict from a joint solve at the same witness.
   Today only the online strategy provides that; another strategy's
   Solved on such a declaration is `Unsupported (ClassF …)` (the
   `Question` tag, T-R0a §3.5, is the T-R0a owner's to name).
3. **Values: E-a with §6's clarification**, which lets G-D1 close on
   the author's ruling.
4. **Exemption route:** (b-trusted), later, under G-exempt's rule
   (an argument and a check per kind). Not authorized here.

Why: it keeps the trusted record check over every record obligation
(the marker removes the declarations whose rows could hide one),
leaves effect checking where it is today, and adds no code beyond a
syntactic detector.

| Choice | Narrowing at the switch | Trust in effects | New machinery | Other strategies |
|---|---|---|---|---|
| Recommended: (a) + (b-joint) + E-a | declarations marked `ErasedRow` and no other marker (census) | as today (online) | none | no lowerable Solved on effectful declarations |
| (b-joint) alone + E-a | none expected (argued: online accepts exactly today's programs) | record obligations hidden in rows checked by untrusted code | none | as above |
| (a) + (b-trusted) + E-a | as recommended, until exemptions | trusted | trusted effect checker | any |
| (a) alone | as recommended | none: K1g, K2, K3 unaccounted | none | rejected: obligation-ground is unmarked and its obligation false |
| Call such declarations Solved anyway | none | none | none | rejected (§18.70, option D) |

## 8. The census category (Task 3.5)

**Erased rows (G-erased), §3.2(a).** Among the declarations that
compile today, those C-erased marks, computed by Task 3.5's test-only
detector over resolved syntax (ruling R11) with the tables (callee
signatures, constructors, effects). Recorded:

- declarations marked, and programs with at least one marked
  declaration (as for every category);
- declarations marked by `ErasedRow` and no other `outside` kind: the
  marker's own cost;
- declarations per firing source (`own`, `annotation`, `handler`,
  `callee`, `constructor`, `operation`, `fail`); one declaration may
  count under several.

The fixtures' `sources` and `marked` fields are the detector's
expected answers: Task 3.5 asserts them, and a disagreement is a
detector or criterion defect. Not a census category: the declarations
part (ii) restricts to the online strategy, since no other strategy
exists today and nothing is blocked by it.

## 9. For the adversarial review (G-erased (criterion))

The reviewer's task: **find an erased obligation that C-erased misses**
(an unmarked declaration whose rows bind or refute a type or record
variable), or a false step in Claim A.

| Restriction | Why believed harmless | Built to challenge it |
|---|---|---|
| Labels are read from written types and three construction sites (A1) | search of `Label` applications in Features.Check | a label built elsewhere, e.g. in RowMerge or handler installation |
| Ground label arguments are closed facts | they hold no variable | obligation-ground: harmless for records, not for effects (part ii) |
| Rows inside label arguments are erased, so a `RowSort` variable there never counts | its binding's labels are themselves label sources | a row variable in a label argument whose binding comes from outside `f`'s sources |
| Data types without arguments are nominal | `base t = base t` binds nothing | a constructor's fields reached without naming the constructor |
| Callees are read by signature only (G-local) | every signature is written, row included (Resolve/Signature.purs) | an inferred row anywhere in a signature |

Soundness pass: start from obligation-record and move its labels
(into a data field, a handler type, an operation's type, a label
argument's row) until it is unmarked yet still refused today; each
form fixture is one such move that the criterion catches. Completeness
pass: C-erased is not complete and is not claimed to be (§4,
precision); the census measures its cost.

**Claims ledger.**

| Claim | Label |
|---|---|
| The three obligation pairs: refused and compiling as stated | checked (test/r0-erased.test.mjs) |
| Those refusals need label-argument unification | checked (mutant M1, findings) |
| The 17 form fixtures compile today and contain their form | checked |
| obligation-record's recorded problem is satisfiable | argued (hand translation) |
| Claim A (A1-A4) | argued, with citations |
| The fixtures' `sources` and `marked` are C-erased's answers | argued; Task 3.5's detector checks them |
| (b-joint) narrows nothing | argued |
| Rows inside witness images are unchecked by G0 | argued from D1 §3.2 |

Not covered: data types with row parameters have no fixture; the
census numbers wait for Task 3.5; the `ClassF` tag and the trusted
checker of (b-trusted) are left to their owners.
