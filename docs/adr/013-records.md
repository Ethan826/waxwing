# ADR 013: Structural records with row-typed tails

Implemented on branch `records` 2026-10-14 (plan Tasks 1-11) and
2026-10-15 (Task 12, R012); not merged.
Binding spec: docs/plans/2026-10-14-records-design.md (approved
2026-10-14); plan docs/plans/2026-10-14-records-plan.md; evidence
docs/progress.md ("R001"). Builds on ADR 002 (planned specialization),
ADR 005 (structural order), ADR 007 (specialization), ADR 010 (effects and
`Fail` keys), ADR 011 (Text) and ADR 012 (qualified operations, which kept
`.` free on lowercase receivers). Records of operations as services,
extension and merge, and C001 instances are not part of this decision.
Record patterns (R004, branch `record-patterns`) are the section "Record
patterns (R004)" below, and extension, removal and written lacks (R005
Tranche A, branch `record-extension`) the section after it.

## Context

Waxwing computed only with Int, Bool, Text, Unit, user ADTs and functions.
Records are the data form the services scenario, records of operations and
C001 instances will build on. Haskell's records are the model to avoid:
generated global selectors that are partial and clash across types, field
names that collide between declarations, and awkward update syntax. The
user chose PureScript-style records: anonymous, structural, row-typed, with
type-safe access and update and functions polymorphic over the rest of a
record.

## Decision

### Surface

- Types `{ name: Text, age: Int }` (closed) and `{ name: Text, ...r }`
  (open; `r` a row variable of record sort); `{ ...r }` is any record.
  Labels are lowercase and unique; order is not significant; a trailing
  comma is allowed. `{}` in a type stays E_SYNTAX `Expected a type`, and
  `{}` in an expression stays Unit.
- A literal is `{` followed by a lowercase name and `:`
  (Format.Parse.Lookahead `labelled`); no block item begins that way, and
  `{ x }` stays a block (no punning).
- Access `e.l` and update `e { l = v, … }` are postfix operations at the
  level of calls, applied left to right (Format.Parse.Postfix), so
  `f(x) { name = n }.name` is `((f(x)) { name = n }).name`. The receiver is
  any expression but an uppercase name, which stays an effect qualifier
  (ADR 012); the `.` must touch both sides, and an update needs `name =`,
  not `name =>`, so match arms and `with` bodies parse as before.
- Each suffix goes through the parser's `infixed`, one nesting level per
  operation (128 accesses parse, the 129th is E_NESTING), and the suffixes
  are read after the primary returns, so no form costs a parser frame
  more: the depth probe gave constructor-argument 259, call-argument 296,
  parens 396 and parens-in-call-in-constructor 326 before and after Tasks
  1, 3, 4 and 5 (G002 unchanged).

### Representation

One new type form, `TRecord` over Domain.Type.Record's `RecordRow a v =
{ fields, tail }`: fields kept sorted by label (`recordRow` sorts on
construction), each with a field type, and an optional tail variable whose
image is a record type. The field type is a parameter of the row, which
avoids a module cycle with Domain.Type.Core. Record rows and effect rows are
separate types and never unify. Diagnostics print a record with sorted
labels and its tail written `...r`; an unsolved meta tail prints `..._`.

### Row sorts

A row variable is record sort or effect sort, never both; reusing the
`...r` spelling does not make them interchangeable. A record tail is a
record use, a `with` row an effect use, and an argument to a declared
type's row parameter takes that parameter's sort and gives it its own.
Features.Resolve.Sorts and RowSettle solve the declarations' row
parameters (controller rulings, Task 3, after four review rounds):

- **Two phases alternate** until neither adds a sort. Phase 1 (callee to
  caller): a parameter takes the sort of its first use that has one,
  direct or passed to an already settled parameter. Phase 2 (caller to
  callee): a parameter still without a sort takes the one its first
  settled caller passes. One pass of each was not enough: a sort a caller
  gives a callee must flow back up to the callee's other callers
  (regression row `r001-sort-feedback`).
- **Jacobi rounds.** Each phase-1 round reads only the previous round's
  map, so the settled sorts do not depend on declaration order.
- **One post-solve check.** Every use of every row variable is then
  checked against its settled sort in one place (Sorts, SortCheck), so no
  use can disagree silently (`r001-settled-sort`).
- **Blame.** Within a declaration, the later use in source order is the
  error, with a note `first written here` at the first. Callers passing
  different sorts to one parameter clash at the later caller's argument,
  noted at the earlier's, and the message names the variable at the
  reported site with its own sort (`b is an effect row, not a record
  row` when `b` is an effect row; `r001-caller-conflict`).
- A parameter left without a sort is effect sort, today's behaviour.
- **Record-free fast path** (R001 Task 15, T007). With no record type
  written in any declaration's fields no use has record sort, so every
  parameter stays effect sort and no two uses can disagree; Sorts returns
  the declarations as written without the walks. A written type's name is
  found through an index built once per program
  (Features.Resolve.TypeIndices, a sorted array searched by halves), not a
  scan of the declared types, and a reference without arguments is not
  looked up at all.

The texts are the approved `r is a record row, not an effect row` and its
mirror. A type written in a body (a lambda's annotation, a handler's label
arguments, a `handle` clause's payload) uses its signature's row variables
with the sorts the signature settled (BACKLOG R016, 2026-10-15,
Features.Resolve.BodySorts): reading one row sort as the other is that
text at the body's use, noted `first written here` at the signature's
first use, the later use being the error as above. Before, an effect row
used as a lambda's record tail read as `a is not a field of { a: Int,
...r }`, a record row as a lambda's effect row was accepted, and an
effect row passed to a record parameter in a body reached E_INTERNAL
(rows `r016-effect-as-record`, `r016-record-as-effect`). A row variable
read as a type there, or a type variable as a row, is the signature's
own text too, through SortConflict `conflict`, with no note: `Expected a
type, found an effect row` at the `r`, `Expected an effect row, found a
type` at the `...a` or `with ...a` (BACKLOG R017; before, accepted,
E_INTERNAL or `b is not a field of { b: Int, ...a }`; rows
`r017-row-as-type`, `r017-type-as-row`). A record tail naming a type
parameter, and `...r` naming an effect's parameter
(Features.Resolve.EffectSorts), are the existing E_TYPE `Expected an
effect row, found a type`: an effect's parameters are types, so effects
cannot take record-row parameters in this tranche (Task 4 ruling; BACKLOG
R009).

### Record-row arguments (R012)

The final review (I2) found that a declared type's record-row parameter
took only a written `...r`, although diagnostics print `Holder({ y: Bool
})` where a solved row fills it. Plan Task 12 added the form; the user
approved the surface and both diagnostics on 2026-10-15.

- A record type written for a record parameter is its row, the tail of
  the records the declaration writes beside the parameter:
  `Holder({ y: Bool })` with `type Holder(...r) = Holder({ x: Int, ...r
  })` holds `{ x: Int, y: Bool }`. The parser already read `{ … }` as a
  type argument, so only resolution changed
  (Features.Resolve.TypeArguments `recordType`); the depth probe is
  untouched. The argument resolves to the `TRecord` a solved row would
  be, so checking, specialization keys and lowering needed no change.
- `{ ...s }` written for any row parameter is the argument `...s`
  (Features.Resolve.RecordArguments `asRow`, applied in TypeArguments and
  in Occurrences, so the sort solver sees the same use). A record argument
  with labels is a record use of its tail; it gives the callee's
  parameter no sort, and an effect row parameter keeps refusing it with
  `Expected an effect row, found a type`.
- Wrong sorts reuse approved texts: a type that is not a record is
  `Expected a record, found Int` at the argument, named as checking names
  types (Features.Check.ResolvedName), and an effect's name is `Expected a
  type, found an effect row`, as a labelled row already was.
- The argument's labels must be disjoint from those the declaration
  writes beside that parameter, directly or through declared types it
  passes the parameter to (Features.Resolve.ArgumentClash over the graph of
  Features.Resolve.ArgumentGraph, built once from the constructors' field
  syntax, as Features.Check.Implied `declared` reads them; R013): a
  shared label, even with the same field type, is
  `Duplicate field x` at the argument's label with `first written here`
  at the declaration's, two written occurrences. Types outside bodies are
  checked once their signatures resolve (`programClashes`); body types
  where Resolve.Lacking checks them. Programs without a record parameter
  skip both walks.
- An open argument's tail lacks the declaration's labels as a `...r`
  argument's does: Implied already read a `TRecord` argument's tail, and
  Resolve.Lacking now takes its passed tails from the same record
  arguments, at the tail's `...s`. That also fixed a found defect: Lacking
  read a written argument position as the parameter's place among the
  declaration's variables, which differ after an effect row parameter, so
  `T(...e, ...r)` with `type T(...e, ...r) = T((Int) -> Int with ...e, {
  x: Int, ...r })` was reported as `e may already have field x` at `...e`
  (RecordArguments `slotOf`; row `r012-slot-position`).
- The instantiation rule over declarations (ADR 007, Features.Check.Nested)
  judged only type arguments: a record argument stood for a row, which
  could not grow while only `...r` was writable. Now a row could grow
  through recursion, `type T(...r) = End({ ...r }) | More(T({ a: { ...r }
  }))`, and a use of it overflowed the stack in Features.Check.Expand
  (found while testing Task 12). Inside a component a record argument must
  be a bare `...r` or mention no variable, a record tail included, and the
  rule walks into record arguments' fields
  (Features.Check.NestedArguments; rows `r012-nested-row`,
  `r012-nested-walk`). The existing text applies: `Recursive use of T
  changes its type arguments`. A label a declaration passes back to its
  own parameter (`More(T({ inner: Int, ...r }))`) is that same growth, so
  the clash check skips a label matching itself and leaves it to this
  rule, whose report names the offending reference rather than noting a
  label at its own span. Function instantiation was unchanged then
  (BACKLOG R010); it was brought into line on 2026-10-15, below.

### Unification and lacks sets

Features.Check.UnifyRecord follows each side through its tail's bindings
(Features.Check.FlatRecord, a loop) to its fields and a tail that is
closed, rigid or an unbound meta, unifies the labels both hold field by
field in label order, then decides the tails (Features.Check.RecordTail):
the same labels and tails (rule 1); labels on one side extend the other's
meta tail (rule 2); labels on both sides give two distinct meta tails one
fresh remainder, which lacks both sides' labels (rule 3,
`r001-shared-remainder`); anything else (a closed or rigid tail asked to
grow, one tail on both sides, an occurs-check cycle) is the records'
mismatch. If unifying the shared fields bound a row's own tail, as in
`{ a: { ...r }, ...r }`, the rows are flattened again and unified anew
rather than the binding overwritten (Task 4 review;
`r001-field-bound-tail`).

Every record meta has a lacks set in the substitution
(Features.Check.Lacks): binding a tail checks the new fields against it
and carries it into the rest (rule 4, `r001-lacks`). Signatures,
constructors and effect operations seed the implied lacks sets at each
instantiation, and a function's own signature seeds them for its body
(Features.Check.Seed, Implied), also through declared types' record
parameters. A lacks violation reports the shape mismatch (`Expected
{ ..._ }, found { a: Int }`), never a duplicate location invented from an
inferred row.

Seeding scope. Those seeds cover signatures, constructors and effect
operations, not types written in a body. The final review (C1) found that
this hole was not latent: a lambda annotation `{ a: Int, ...r }`, a `with
handler State({ n: Int, ...r })` label or a `Holder(...r)` annotation
under `fn g(p: { ...r })` passed the checker, a caller filled `r` with
`a`, and lowering declared the field twice (`go build` failed with `f_a
redeclared`; probes l2, m1, m4, o2), while a field access through such an
annotation read as the self-contradictory `a is not a field of { a: Int,
...r }` (l1). Resolve now holds every type written in a body (a lambda's
parameter annotations, a handler's label arguments, a `handle` clause's
payload) to its signature's lacks sets (Features.Resolve.Lacking, with the
same Implied facts the body is seeded with): each label the type puts
beside one of the signature's record row variables, directly or through a
declared type's record parameter, must be one the signature says the
variable lacks. Otherwise it is E_TYPE `r may already have field a`
(text approved 2026-10-15) at the written label, or at the `...r` passed
to the declared type when the label is that type's, with the note `r is
introduced here` at the signature's first `...r`; the placement at the
passed `...r`, with its note, was implemented by the fix wave and approved
by the user on 2026-10-15 afterwards. As defence in depth, Specialize's
`recordType` reports a label both written and in the tail's image as
E_INTERNAL `Duplicate record label` rather than lowering it (regression
rows `r001-body-lacks`, `r001-record-guard`).

### Inference and diagnostics

A literal infers the closed type of its fields; its checked node keeps the
written order, its type the sorted one. Access, and each update label,
unify the receiver with `{ l: α, ...ρ }`, ρ fresh and lacking `l`
(Features.Check.Record). Since α and ρ are fresh, a failure has two
causes only: a record whose tail cannot hold `l` is `age is not a field of
{ name: Text }` at the label, and anything else is `Expected a record,
found Int` at the receiver. An update requires each value to have its
field's type and has the base's type, so an update never changes a type.
A repeated label in a type, literal or update is the existing template
`Duplicate field <label>` at the second label, noted `first written here`
(ruling, Task 3: the spec's `Duplicate field name` is that template at the
label `name`). No other new text was added in the tasks; the final review
added `r may already have field a` with its note (text approved
2026-10-15; placement approved afterwards, "Unification and lacks sets").

### Comparison and printability

Records join ADR 005's order: fields compare in sorted label order, the
first difference deciding. A record tail is a variable for comparison
groundness (Features.Check.Comparable), so comparing `{ name: Text, ...r }`
in generic code is `Type { name: Text, ...r } is not comparable`. A record
is printable when every field is: `{ age: 36, name: "Ada" }`, each field in
nested form.

Printability is now also checked at the ground type (BACKLOG E017, Task
2): after specialization, Features.Specialize.Printable `checkSites` judges
each `show`, `Console.print` and `crash` site with `groundPrintable ∷
Functional → Ty Void → Boolean` (it takes the set of declared types that
store a function, so `Holder(Int)` with `type Holder(a) = Holder(a -> a)`
is refused), giving the existing `Expected a printable value, found <t>`
at the site instead of E_TOOL from `go build`. Generic printers of open
records are accepted and judged at each instantiation.

### Records as `Fail` payloads

A closed record's head is `HeadRecord labels`, its sorted label set
(Domain.Row), so the labels play the part of a declared type's name and
the field types its arguments: reordered shapes share a family, the same
labels with other field types unify field-wise, and different label sets
are different families. A payload whose labels are not yet known has a
deferred key (Features.Check.FlatRecord `failHead`); never settled, it is
`Fail needs a concrete error family`. A payload with a row tail written in
a signature or a handle clause is refused where written, as `Fail(a)` is.

Runtime keys (Format.Go.Families): the existing keys are unchanged (Int
-1, Bool -2, Unit -3, a declared type -4 minus its id, Text MinInt32), and
label sets take MinInt32 + 1 upwards, numbered in the sorted order of the
program's label lists, so the numbering is deterministic and lies between
Text's key and the declared types'. ADR 010's key list gains this range. A
program whose two ranges would meet needs over 2^31 - 4 label sets and
declared types, so the refusal is an invariant check, not a user limit:
`keyed`, called by Program.Compile after specialization and before `emit`
(which stays total), reports the existing internal text `Fail without a
family` (E_INTERNAL). Only its boundary, `familiesFit`, is tested; no
program reaches the refusal.

### Specialization: record rows enter keys, effect rows stay erased

A record row variable is a specialization parameter, like a type variable.
Rows are canonicalised before they enter a key: fields sorted, field types
numbered, and each closed shape hash-consed into one layout
(Features.Specialize.Layouts, Record), so reordered rows share one
function copy. An unsolved record-sorted argument or tail is the empty
rest, never the Int representative, so every empty rest reaches one key
(Task 8 carry-over fix).

Record rows enter keys while effect rows stay erased (ADR 010) because
only a record row decides representation. A function reading `p.name` from
`{ name: Text, ...r }` selects a field of a specific Go struct, whose field
set the row fixes; one copy per concrete row makes every access a static
Go field selection, with no evidence, maps or boxing. An effect row
changes no representation: operations are found at run time by key in the
context, so a function's code is the same for every row, and erasing rows
keeps row-growing recursion from creating instances.

Layouts are not specialization keys: they create no work and are not
counted against the 10,000 limit, as interned arrows are not; the function
copies that reach a new row are counted (test/r001-go-keys.test.mjs pins
both). Growth was measured: 200 shapes through 20 generic links give
exactly 4,001 keys and 19,617 Go lines, linear in both (scale test), and a
services proxy is recorded in docs/progress.md as a proxy, not a
validation.

This confirms ADR 002's records clause as written: unique labels with
lacks constraints, normalized label order, and open-row functions
specialized to concrete layouts. No accessor evidence was needed, because
every function is specialized, and the boxed or dictionary fallback was
not chosen.

### Go lowering

- Each layout that some emitted type mentions is one Go value struct
  `waxwingRec<N>` (R011; an open tail interned only as a key argument has
  none, and the ids of the others do not change), numbered in
  first-use order, fields `f_<label>` in sorted order (the prefix keeps
  every field distinct from Go keywords). Nested records are inline. A
  field of declared type is a pointer, as a constructor field is, so
  `type Node = End | Node({ child: Node })` is not a recursive Go value
  type; construction allocates and access dereferences. The empty layout
  is `struct {}`.
- A literal or update evaluates each field that could perform an effect
  or abort into a typed temporary, in written order, inside an
  immediately invoked closure, then builds or copies the struct; only a
  literal or a local name is used in place (`r001-field-order`). Go's
  unspecified composite-literal order is never relied on.
- Compare and show helpers (`waxwingCmpRec<N>`, `waxwingShowRec<N>`) are
  emitted only for layouts the program compares or prints, including those
  inside declared types' fields (Format.Go.RecordUse); comparison always
  calls the helper, and a nil ADT pointer in a record reports the existing
  malformed-value panic. A program without records emits unchanged Go.

### Record patterns (R004)

Spec: docs/plans/2026-10-16-record-patterns-design.md; plan
docs/plans/2026-10-16-record-patterns-plan.md; evidence docs/progress.md
("R004 Task 1" to "Task 4"). Decided by the user on 2026-10-16.

- **Surface.** `match` destructures a record: `{ name: n, admin: true }`.
  A field is `label: pattern`, any pattern, nested freely in and around
  constructor patterns; order is not significant; labels are unique
  (`Duplicate field x`, at the second). A pattern position has no block,
  so `{` there is unambiguous. There is no `{}` or `{ ... }` pattern
  (`_` already matches any record).
- **Explicit rest.** A pattern names every field of the scrutinee's type
  or ends with `...`, which ignores the others (Rust's `..`). Adding a
  field to a type then flags every pattern that does not mention it:
  `Pattern is missing field admin; add it or end the pattern with ...`,
  at the pattern, naming the first unlisted label in label order. An
  open type with every known field listed and no `...` is `Pattern is
  missing the rest of { a: Int, ...r }; end the pattern with ...`.
- **Puns.** A field written without `: pattern` binds its label,
  `{ name, admin: true }`, a `PBind` at the label from the parser on, so
  no later layer sees a pun. Literal punning stays R007's, since
  `{ name }` in an expression is a block.
- **Typing.** The expected type, under the substitution, decides. A
  record type supplies its fields; a label it lacks is `a is not a field
  of { … }` at the label, and a rigid tail never supplies one. A hole
  tail is extended by the labels the pattern names, as `.l` extends one
  (Check/Record `select`, Check/FreshRecord), so arm order does not
  matter; a pattern without `...` listing every known field closes a hole
  tail, as a closed pattern closes a bare hole. A bare hole (an
  unannotated parameter) is unified with the record the pattern writes,
  closed without `...` and open over a fresh tail lacking its labels with
  it. Anything else, a rigid variable included, is `Expected a record,
  found T`, at the pattern.
- **Coverage.** A record type is one always-complete head, so a record
  column never forks: a pattern widens to the type's labels (`_` for
  those under `...`) and specializes to its fields. A witness is a
  record literal with every known field in label order, `{ admin: false,
  name: _ }`, and `...` last for an open type; a record type with no
  known field prints `_`, since `{ ... }` is no pattern.
- **Inhabitation.** A record is inhabited exactly when every field type
  is, and its data fields enter the dependency graph like a
  constructor's. Before this change a record field was read as `Int`.
  Existing programs change only in the corner this fixes: an ADT whose
  only constructor holds a record with an uninhabited field is now
  uninhabited. Over `Opt(Wrap)` with `Wrap` such a type, `Nada => 0` is
  now accepted (it was `Missing pattern: Some(_)`), and `_` after it is
  now E_REDUNDANT (it was accepted).
- **Lowering.** No tag test and no new runtime helper: each named field's
  pattern is tested and bound on the struct's field `f_<label>`. A
  record-valued field is stored inline. An ADT-valued field, inside a
  record as in a constructor, is a pointer: its nil guard precedes any
  projection through it and a binder dereferences it. Field reads have
  no effects, so their order is unobservable. A matched record's layout
  is interned when its pattern's type is specialized, so a function that
  only destructures a record from its caller still gets the struct.
- **Consequences.** Output of every existing valid program is unchanged
  (the differential changes only sources with `{` in a pattern position,
  parse errors before, and the inhabitation corner above). The reference
  interpreter (test/fx-oracle-records.mjs) matches record patterns
  without compiler code, and generated matches run in Go agree with it
  (test/fx-oracle-record-patterns.test.mjs). Binding the rest of a
  record (`...rest`) is R005 Tranche A, below. Not decided here: patterns
  in `let` or parameters, which take none today.

### Extension, written lacks and removal (R005 Tranche A)

Spec: docs/plans/2026-10-16-record-extension-design.md §1-§5 (Tranche A
approved by the user, 2026-10-16); plan
docs/plans/2026-10-16-record-extension-plan.md; evidence docs/progress.md
("R005 Task 1" to "R005 Task 3"). Branch `record-extension`; not merged.

- **Decisions (user, 2026-10-16).** Merge combines disjoint records and
  overlap is an error everywhere; extension is spread-first, `{ ...p,
  admin: true }`; removal is the rest pattern `{ name, ...rest }` and the
  expression `p without { name, age }`; constraints are a `where` clause
  in words (`r lacks { admin }`), labels always braced; `{}` is the empty
  record type, distinct from Unit; each field and spread is evaluated once,
  left to right; two tranches, A single-tail, B (open-row merge,
  `disjoint`) pending its algorithm pass.
- **Surface.** A literal is a list of items, `label: expression` or
  `...expression`, at most one spread (a second is E_TYPE `A record
  literal accepts at most one spread` at the second). A literal begins
  with a lowercase name and `:` or with `...`, so it is never a block;
  `{}` in an expression stays Unit. `without { … }` is a postfix beside
  call, access and update. A record pattern's rest is `NoRest`, a bare
  `...` or `...name` (three states, not a Boolean); coverage treats a
  named rest as `_`. A signature's `where` clause lists `r lacks { a, b }`
  constraints separated by commas.
- **Reserved-word break.** `where`, `lacks`, `without` and `disjoint` are
  reserved (`disjoint` now, so that Tranche B causes no second break).
  A program using one as a name is E_SYNTAX. The repository's fixtures
  and examples used none; the differential classified every difference.
- **Approved texts.** Overlap: existing `Duplicate field admin`, note
  `first written here`, at the later item in written order, noted at the
  earlier (`{ ...p, admin: true }` at `admin`, noted at `...p`; `{ admin:
  true, ...p }` at `...p`, noted at `admin`). A rigid tail: existing `r may
  already have field admin`, note `r is introduced here`, at the label.
  A written lack violated at a call: E_TYPE `admin is not allowed here: r
  lacks { admin }` at the argument, noted `required here` at the label in
  the clause. `without`: existing `age is not a field of { … }` and
  `Duplicate field age` at the label; `Expected a record, found T` at a
  non-record spread (the whole `...p`, accepted 2026-10-16) or receiver.
  A `lacks` target that is not a record row variable (approved
  2026-10-16): unknown name `Unbound type variable zz`; effect row `ee is
  an effect row, not a record row`; type variable `tv is a type, not a
  record row`, each at the variable.
- **Provenance of written lacks.** The substitution keeps, beside each
  tail's lacks set, the labels a clause wrote with the clause's variable
  and the label's span. A label the types already imply keeps no clause
  (its violation keeps the shape text). The clause survives instantiation:
  through a function value, partial application, pipe or generic wrapper
  the violation names the clause of the function whose requirement was
  broken, as a note at that clause. The text names only the violated label.
- **Evaluation order.** In a spread literal the items run left to right,
  the spread's base once, in the reference interpreter and in Go
  (`{ a: f(), ...g(), b: h() }` calls f, g, h). `p without { … }`
  evaluates `p` once. A rest binder reads the scrutinee, which the match
  evaluated once.
- **Empty records.** `{}` is a closed record type with no field and never
  unifies with Unit (`Expected Unit, found {}`). It prints `{}` beside
  Unit's `()`, all empty records are equal, and the layout is the empty
  Go struct. It arises from removal, a rest binder or `{ ...rest }`.
- **Go lowering.** `IR.RecordExtension` keeps its items in written order
  and `IR.RecordRemoval` its labels; a pattern's `IR.Rest` is `NoRest`,
  `IgnoredRest` or `NamedRest local remainderType`. Format.Go.Extension
  evaluates each item that could act into a typed temporary, in written
  order, inside an immediately invoked closure (the spread's base is one
  such temporary), then builds the result layout's struct: a field the
  literal writes is the temporary (a declared type stored through its
  pointer), every other field is copied from the base, a pointer as it
  stands. A removal evaluates its receiver once and copies the kept
  fields. A base none of whose fields is copied is discarded (`_ =`), as
  Go rejects an unused variable. A named rest in a match arm binds a
  struct of the remaining fields read from the scrutinee's path, and is
  discarded like any unused binder (`_ =`). Specialization interns the
  remainder's layout from the rest's type, so an unused rest, whose shape
  appears nowhere else, still has its struct. Extension and removal types
  are interned as the expression's own type is.
- **Evidence.** test/r005-*.test.mjs; the reference interpreter
  evaluates spreads, `without`, named rests and `{}` without compiler code
  and generated programs agree with Go, effects in order included
  (test/fx-gen-record-extension.mjs, fx-oracle-record-extension.test.mjs);
  rows `r005-*` of scripts/regression-r005.mjs (probes in
  test/regression-r005.mjs); examples/records.wxw.
- **Provisional choices.** None was needed in Task 3: every user-facing
  text is one of the approved ones above.

## Consequences and limits

- Go output of every valid existing program is unchanged: the seven
  bootstrap/*.go snapshots are byte-identical, examples/records.wxw adds
  bootstrap/records.go, and each task's differential showed only new
  sources, E017's E_TOOL to E_TYPE, invalid sources whose `{` in a type
  now begins a record (three mutations; a mutated `{ Int; }` changes from
  `Expected a type` to `Expected an identifier`, E_SYNTAX both sides,
  ruling, Task 3), and invalid sources whose lowercase `.` is now an
  access (ruling, Task 5). The final fix wave's differential against
  96e28f2 changed the final outcome of its 17 new sources only; eight
  sources differ in the resolve phase alone (label arguments now carry no
  ambient row, FX024) with identical diagnostics or Go: seven existing
  ones and the rewritten 5,000-arrow payload of test/fx-cleanup.test.mjs,
  whose earlier form raised an ambient callback and is now rejected.
- The differential's digests gained two normalisations (Tasks 7 and 8):
  the specialize digest drops an empty `records` field and the check
  digest drops a checked function's `sorts`, a copy of resolve-phase data.
- Each open tail's layout is interned and emitted as a struct even when it
  is only a key argument: the scale chain emits 400 structs for 200
  shapes, and bootstrap/records.go has two unused ones (BACKLOG R011).
- The instantiation rule (ADR 007) did not judge a function call's
  record-row arguments: a recursive call that grew a record row reached
  the 10,000 limit (`More than 10000 specializations`) instead of
  `Recursive call to g changes its type arguments` (found while writing
  this ADR; BACKLOG R010). Fixed 2026-10-15 on branch `r001-followups`:
  Features.Check.Instantiation judges each record row slot, by the
  callee's sorts, as Features.Check.Nested judges a declaration's record
  argument (NestedArguments `admissibleSlot`): the referrer's bare
  `{ ...r }`, or no rigid variable, a record tail included. The existing
  text is reported at the call, as for a type variable (rows
  `r010-nested-row`, `r010-mutual-row`).
- Field access through a nil declared-type pointer inside a record is a
  Go nil dereference, not the malformed-value panic; only foreign code can
  make one (docs/findings.md "R001", I001).
- Not in this tranche: merging open rows and `disjoint` (R005 Tranche B),
  polymorphic fields (R006),
  punning (R007), type aliases (R008), record-row parameters of effects
  (R009).

## Alternatives considered

- **Accessor or dictionary passing** for open rows (ADR 002's fallback):
  not needed while every function is specialized and growth is linear.
- **Scoped labels** (duplicate labels shadowing): rejected by ADR 002;
  labels are unique and lacks sets enforce it.
- **Independent fresh tails** when two open rows meet: unsound, since the
  remainder one use fixes must be the other's (rule 3).
- **One-directional sort propagation** (a single fixed point, or one pass
  each way): rejected after review found programs accepted with
  contradictory sorts and valid ones rejected.
- **A new text for the label-set capacity refusal:** rejected; it is an
  unreachable invariant, reported like the other internal checks.

Evidence and gates are in docs/progress.md ("R001"). Isolated-copy
regression rows (scripts/regression-r001.mjs, probes in
test/regression-r001.mjs): `r001-print-ground`, `r001-record-order`,
`r001-row-sort-propagation`, `r001-duplicate-field`,
`r001-callee-to-caller`, `r001-settled-sort`, `r001-caller-conflict`,
`r001-sort-feedback`, `r001-field-bound-tail`, `r001-sorted-layout`,
`r001-lacks`, `r001-shared-remainder`, `r001-field-order`,
`r001-shape-types`, and from the final review `r001-body-lacks` and
`r001-record-guard` (probes in test/regression-r001-body.mjs), and for
R012 `r012-record-argument`, `r012-argument-clash`, `r012-argument-lacks`,
`r012-slot-position`, `r012-spread-argument`, `r012-nested-row` and
`r012-nested-walk` (scripts/regression-r012.mjs, probes in
test/regression-r012.mjs), and for the follow-ups `r015-effect-row`,
`r015-record-row`, `r016-effect-as-record`, `r016-record-as-effect`,
`r017-row-as-type`, `r017-type-as-row`,
`r010-nested-row` and `r010-mutual-row` (scripts/regression-ie.mjs, probes
in test/regression-ie.mjs). Tests:
test/r001-*.test.mjs (test/r001-body-types.test.mjs for C1), the scale test
test/r001-scale.serial.test.mjs, test/r012-*.test.mjs, and the
reference interpreter and
generator (test/fx-oracle-records.mjs, fx-gen-records.mjs,
fx-gen-record-fns.mjs).
