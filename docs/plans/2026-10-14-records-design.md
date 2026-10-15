# Records: design (R001, first tranche)

Status: approved by the user 2026-10-14 (revised 2026-10-14 after
the first review: printability, ADT storage, Fail payloads, row sorts).
The user approved this design section by section in conversation on
2026-10-14, together with review refinements. Implemented on branch
`records` (plan docs/plans/2026-10-14-records-plan.md, Tasks 1-11); not
merged. As built: docs/adr/013-records.md, which records the decisions the
plan's rulings added. Sequencing: after FX020 (effect operation
namespaces), which kept `.` free for `r.field` on lowercase receivers.

## Goal

Records as data. Waxwing gets structural, row-typed records in the style
of PureScript, with type-safe field access and update, functions that are
polymorphic over the rest of a record, and lowering to ordinary Go
structs. This tranche is the base that service environments, records of
operations and C001 instances will later build on. It does not implement
those.

Haskell's records are the model to avoid: generated global selector
functions, which are partial and clash across types, field names that
collide between declarations, and awkward update syntax. Waxwing records
are anonymous values. A field name belongs to no global namespace, and no
function is generated per field.

## User decisions (2026-10-14)

1. **Scope.** Records as data only: types, literals, access, update,
   row-polymorphic functions with implicit lacks constraints, equality,
   ordering, printing and Go lowering. Services, record merge and C001
   follow later.
2. **Syntax.** PureScript-style, with the update form `p { name = n }`.
3. **Updates preserve types.** An update never changes a field's type. A
   type-changing update, if ever added, needs an explicitly declared type
   somewhere and is never inferred. Implicit coercion is ruled out.
4. **Lowering.** Each distinct closed record type is one Go struct. Each
   function gets one Go copy per concrete record row it is used with. This
   is ADR 002's plan.
5. **Equality, ordering and printing** behave as if derived from each
   field's selected instance (see §4).
6. **Fast follows,** each its own backlog item and tranche:
   - record patterns;
   - extension, merge and removal, with written lacks constraints.

   Later: polymorphic fields, punning and type aliases.
7. **Diagnostics.** The texts in §6 are approved.

## 1. Surface

**Record types.**
- A closed record type is `{ l1: T1, …, ln: Tn }`.
- An open record type is `{ l1: T1, …, ...r }`, where `r` is a row
  variable of record sort.
- Labels are lowercase names and must be unique. A trailing comma is
  allowed (G005).
- Label order is not significant: `{ a: Int, b: Bool }` and
  `{ b: Bool, a: Int }` are the same type.
- Record types may appear anywhere a type may: parameters, results, type
  arguments, constructor fields, other record fields and `main`'s result.
- Source has no empty record type or literal: `{}` stays Unit in
  expressions. Empty rows still exist internally; for example, the tail of
  `{ a: Int, ...r }` is empty when it is applied to `{ a: Int }`.
- The tail-only type `{ ...r }` is allowed. It means any record, and needs
  no literal of its own. If a specialization ever needs the empty layout,
  it is emitted as an empty Go struct.

**Literal.** `{ name: "Ada", age: 36 }` has the closed type of its fields.
In expression position, `{` followed by a lowercase name and `:` begins a
literal. No block item can begin that way, so a literal is never confused
with a block. There is no punning (`{ name }` is a block).

**Access.** `e.name` reads a field.
- The receiver is any expression except an uppercase name, which stays an
  effect qualifier (`Log.log`, ADR 012). That includes lowercase names,
  calls, parenthesised expressions and other accesses.
- The `.` must touch both the receiver and the label, as for qualifiers.
  A spaced `.` keeps today's E_SYNTAX `Expected ';'`.

**Update.** `e { name = v, age = w }` copies `e` with the named fields
replaced.
- After an expression, `{` followed by a lowercase name and `=` (not
  `=>`) is an update. Match arms use `=>`, and no `with` or handler body
  item begins with `name =`, so the form is unambiguous.
- Updates replace fields. They never add fields or change a field's type.

**Chaining.** Call, access and update are postfix operations at one
level, applied left to right. For example, `f(x) { name = n }.name` is
`((f(x)) { name = n }).name`. Postfix binds tighter than `|>`, `+` and
comparisons.

**Evaluation order.**
- A literal evaluates each field once, in written order.
- An update evaluates its base once, then each replacement once, in
  written order.
- Access evaluates its receiver once.

**Row sorts.**
- A row variable has exactly one sort: record or effect. Reusing the
  `...r` spelling does not make the two interchangeable.
- A variable's sort is fixed by its first use, in a record type or in a
  `with` row. A later use of the other sort is the row-sort error (§6).
- Sorts propagate through declared-type applications and forward
  references. When a row argument is passed to a type's row parameter,
  the argument takes that parameter's sort, and the reverse, solved to a
  fixed point over the declarations.
- A row parameter defaults to effect sort (today's behaviour) only if no
  use constrains it, directly or through propagation. Not having met a
  direct record use is not enough.

## 2. Typing

**Representation.** One new type form: a record over a record row. A
record row is a set of unique labels, each mapped to a field type, plus an
optional tail variable of record sort.
- It has its own label key, the field name, and its own unifier. Effect
  rows keep scoped duplicates, marks and deferred Fail keys.
- Record rows and effect rows never unify with each other.
- Every record tail variable carries a lacks set: the labels it may never
  contain. For `{ name: Text, ...r }`, `r` lacks `name`. The checker
  enforces this now, although lacks constraints cannot be written yet.

**Unification rules.**
1. Two closed records unify when they have exactly the same labels; each
   field pair then unifies.
2. A label present on one side only extends the other side's tail, which
   must be a meta variable. A closed tail that lacks a needed label is a
   mismatch, and so is a rigid tail.
3. **Shared remainder.** Two open tails share one fresh remainder.
   Unifying `{ a: A, ...ρ }` with `{ b: B, ...σ }` binds
   `ρ = { b: B, ...τ }` and `σ = { a: A, ...τ }`, with a single fresh `τ`
   that lacks both `a` and `b`. The two tails are never extended
   independently.
4. **Lacks propagation.** Binding a tail to explicit fields plus another
   tail checks those fields against the tail's lacks set, and carries the
   lacks set into the remaining tail. Instantiating a signature gives each
   row variable the implicit lacks set its written type implies.
5. **Occurs check.** Cyclic equations are rejected, including a shared
   tail on both sides with incompatible explicit labels.
6. **Rigid tails.** A signature's row variables are rigid, like its type
   variables.
   - Accessing a known field of `{ name: Text, ...r }` succeeds by binding
     the access's fresh tail to the rigid `r`.
   - Accessing an unknown field cannot extend `r`, so it is the
     missing-field error.

**Inference.**
- A literal infers `{ l1: T1, … }`, closed.
- `e.l` unifies `e`'s type with `{ l: α, ...ρ }` for fresh `α` and `ρ`,
  where `ρ` lacks `l`. The result has type `α`.
- `e { l = v, … }` does the same for each label, requires each `v : α`,
  and the result has `e`'s type.

**Polymorphism.** Signatures stay mandatory and rank 1. A row variable is
an implicit universal, exactly like a lowercase type variable (P001).
Fields cannot be polymorphic.

## 3. Comparison and printing

- **Equality and ordering.** Every ground type already has one structural
  total order, used by `== != < <= > >=`.
  - Records join that order. Fields are compared lexicographically in
    sorted label order, the first difference deciding.
  - A record is comparable exactly when every field type is. A record
    with a function field is not, and gives today's error.
- **Printing.** `{ age: 36, name: "Ada" }`: fields are printed in sorted
  label order, each in nested-value form, so Text is quoted as it is when
  nested in data.
- **Printability is a separate rule from comparison.**
  - Today, `show`, `Console.print` and `crash` accept any printable type,
    which is everything except functions and handlers. They do not apply
    comparison's groundness rule.
  - A record is printable exactly when every field type is.
  - Inside generic code, printing a record whose tail is a row variable
    is accepted, as printing a type variable is today. The tail is
    checked once it is known.
  - That check does not exist today, even for type variables (BACKLOG
    E017). `fn show2(x: a): Text = show(x)` called with a function passes
    the checker, then fails `go build`.
  - The plan's first task therefore adds a specialization-time printable
    check at each `show`, `Console.print` and `crash` site, on the site's
    ground type. A function or handler anywhere in that type, including
    one in a record tail, is E_TYPE `Expected a printable value, found
    <t>` (existing text), reported at the print site.
  - Records reuse that check.
- **Comparison groundness.**
  - Today's rule applies unchanged. A comparison's operand type must
    contain no variable once the function is checked, and a record row
    variable is a variable.
  - So comparing a `{ name: Text, ...r }` inside generic code
    is E_TYPE `Type { name: Text, ...r } is not comparable`. Specialization
    does not rescue a comparison that was rejected in the generic body.
  - A call site that compares a fully known record is accepted.

## 3a. Records as typed-failure payloads

- `Fail` families are keyed by the payload's declared head (ADR 010).
  ADTs share a family across type arguments: `Fail(Error(Int))` and
  `Fail(Error(Bool))` share a key, so their arguments must unify.
- **Record payloads.** A record's head is its label set, in sorted order.
  - The labels play the part a declared type's name plays, and the field
    types play the part of its type arguments.
  - `Fail({ code: Int })` and `Fail({ code: Text })` therefore share a
    family, and their field types must unify.
  - `Fail({ code: Int })` and `Fail({ msg: Text })` are different
    families.
  - Reordered equivalent shapes have the same label set and the same
    family.
- **Open payloads.** A payload whose label set is not yet known has a
  deferred key, as a payload whose head is still a meta variable does
  today. That covers a payload whose tail is an unsolved meta.
  - If the key is never settled, the payload is the existing E_TYPE
    `Fail needs a concrete error family`.
  - A payload with a rigid row tail, such as `Fail({ code: Int, ...r })`
    in a generic signature, is rejected the same way that `Fail(a)` is
    rejected today.
  - Specialization does not rescue a rejected payload.
- **Runtime keys.** Existing keys are unchanged:
  - `Int` -1, `Bool` -2, `Unit` -3;
  - a declared type -4 minus its id;
  - Text MinInt32.

  Record label sets get keys counting up from MinInt32 + 1, numbered in
  sorted order of their canonical label lists. That keeps the numbering
  deterministic and disjoint from the declared-type range, which counts
  down from -4. The emitter refuses a program in which the two ranges
  would meet; that needs over two billion declarations.

## 4. Relation to C001

The behaviour of `==`, ordering and printing on records is equivalent to
deriving each from the instance selected for each field. C001 allows
several instances per type, so instance selection will happen
independently per field (the modules direction lists "constructing record
instances from independently selected field instances"). Until C001
exists, the compiler supplies this behaviour directly, as it does for
ADTs. The design must not block:
- records of functions as service environments and handler-like values;
- instances represented as records;
- the services scenario of the language direction: overlapping
  requirements, providing a larger environment, replacing one service
  with a fake.

## 5. Go lowering and specialization

**Structs.** Each distinct closed record type in the specialized program
is one Go struct, `waxwingRec<N>`.
- **Shape identity** is the set of labels together with their field
  types, compared recursively. `{ x: Int }` and `{ x: Text }` are
  different structs. Two orderings of the same type are one struct.
- Shapes are hash-consed like interned function types.
- Fields are laid out in sorted label order.
- Go field names are derived from labels deterministically and without
  collisions, and can never be a Go keyword (for example, a fixed prefix
  on every label).
- Records are Go values, not pointers. Nested records are stored inline,
  and so is a record in an ADT field.
- **ADT-valued fields inside records keep the existing indirection.** A
  record field whose type is a declared type is stored as a pointer,
  exactly as an ADT field of declared type is today.
  - Without that, `type Node = Node({ child: Node })` would be a recursive
    Go value type.
  - Construction allocates, and access dereferences. Comparison and
    printing walk the pointer with the existing nil-guarded paths, so a
    nil field still reports the existing malformed-value panic.

**Specialization.**
- A record row variable in a signature is a specialization parameter, like
  a type variable.
- Row arguments are canonicalised (sorted labels, interned field types)
  before they enter a key. Equivalent rows therefore share a function copy
  whatever their written order.
- Effect rows stay erased (ADR 010).
- Record layouts are not counted against the 10,000-specialization limit,
  as function types are not. Function copies are counted, so the limit
  still bounds growth.

**Expressions.**
- Access is a Go field selection.
- An update evaluates the base into a temporary, then each replacement
  into a temporary in written order, then copies the struct and assigns
  the fields.
- A literal evaluates its fields into temporaries in written order, then
  builds the struct, so Go's unspecified evaluation order for composite
  literals is never relied on.
- Only a trivial operand skips its temporary. Trivial means an expression
  whose evaluation cannot perform an effect or abort: a literal or a local
  name. Preserving source order takes priority over removing temporaries.

**Helpers.** Equality, ordering and printing helpers are generated per
struct, only when the program uses them, following the ADT helpers.

## 6. Diagnostics (approved 2026-10-14)

| Case | Code and text | Location |
|---|---|---|
| Missing field (access or update) | E_TYPE `age is not a field of { name: Text }` | the field name in the access or update |
| Duplicate label (type, literal, update) | E_DUPLICATE `Duplicate field name`, note `first written here` | the second label; note at the first |
| Access on a non-record | E_TYPE `Expected a record, found Int` | the receiver expression |
| Record row used as an effect row | E_TYPE `r is a record row, not an effect row` | the conflicting use of `r`; note at the first use where possible |
| Effect row used as a record row | E_TYPE `r is an effect row, not a record row` | as above |
| Shape mismatch | existing E_TYPE `Expected { age: Int, name: Text }, found { name: Text }` | existing expected/found conventions |
| Field type mismatch | existing E_TYPE `Expected Int, found Text` | the value, by existing conventions |
| Comparing an open record | E_TYPE `Type { name: Text, ...r } is not comparable` | the left operand, as today |
| Printing a non-printable value (now also checked at the ground type) | existing E_TYPE `Expected a printable value, found <t>` | the print site |
| Record payload with an unknown label set | existing E_TYPE `Fail needs a concrete error family` | as today |

- A record type is printed in diagnostics with its labels sorted and its
  tail written `...r`.
- A lacks violation uses the duplicate-field diagnostic only when two
  source occurrences can be identified accurately. Otherwise it uses the
  shape-mismatch template. A duplicate location is never invented from an
  inferred row.
- Any other user-facing text is a stop: report it to the user before it
  is pinned.

## 7. Structure

The existing phases stay distinct (parse, resolve, check, specialize, Go):
- syntax nodes for record types, literals, access and update;
- resolution of record types and row sorts;
- a record-row unifier, a module of its own beside the effect-row
  unifier, with lacks sets;
- inference for literals, access and update;
- interning of layouts in specialization;
- Go struct and helper emission.

AGENTS.md governs: files at most 250 lines, the layer and IR allowlists,
no `let … in`, no lambdas. Near-limit files are split first, in a
behaviour-preserving task (as FX020 Task 1). New postfix parsing must not
lower the parser's stack margin (G002: constructor-argument 259 against
twice the nesting limit, 256). The margin is measured with
scripts/depth-probe.mjs before and after, and the nesting limit itself is
unchanged.

## 8. Acceptance and evidence

- **Exact-text tests** for every §6 row, with spans and notes.
- **Algorithm tests** for each §2 rule:
  - the shared remainder;
  - lacks propagation, including through instantiation;
  - the occurs check;
  - rigid-tail access, known and unknown;
  - closed versus open, in both directions.
- **Semantics tests:**
  - chaining, including `f(x) { name = n }.name`;
  - evaluation order of literals and updates, with effects in the field
    expressions;
  - type-preserving update;
  - row-sort separation;
  - comparison and printing, including groundness and nested records;
  - printability (E017): specialized printable checks for each of
    `show`, `Console.print` and `crash`, at a bare type variable and at a
    record tail, with a function and with a handler, both directly and
    nested inside records and ADTs, rejected with the existing text and
    never E_TOOL;
  - recursive storage: `type Node = End | Node({ child: Node })` builds,
    runs, compares and prints a multi-level value, and so does a list of
    records; a nil field reports the existing panic;
  - Fail payloads: reordered equivalent shapes in one family; distinct
    label sets in distinct families, with handlers for two label sets
    active at once and each abort reaching its own handler; same labels
    with incompatible field types rejected with the existing mismatch; an
    open payload in generic code rejected; existing Fail keys and the
    seven snapshots unchanged.
- **Reference interpreter and generator** (test/fx-oracle*,
  test/fx-gen-*). Both are extended with records as an independent model.
  The Go-versus-interpreter differential must show 0 disagreements across
  11 seeds.
- **Regression rows,** each failing with its defect restored in an
  isolated copy:
  - layouts that ignore sorted order;
  - a missing lacks check;
  - independently extended tails instead of a shared remainder;
  - field evaluation order left to Go;
  - shape identity that ignores field types (`{ x: Int }` and
    `{ x: Text }` sharing a struct);
  - the missing specialization-time printable check (E017).
- **Scale.** A test measures key and code growth as many record shapes
  flow through a chain of generic functions. Its bound is set from
  measurement on this host, never relaxed later. A synthetic proxy for
  the services scenario is measured too: overlapping record-of-function
  environments passed through generic code, using only this tranche's
  features. It is recorded as a proxy, not as validation of the
  unimplemented services feature.
- **Parser depth.** Stack margins are measured before and after, with no
  loss.
- **Snapshots.** A records example with its Go snapshot. The seven
  existing bootstrap/*.go snapshots stay byte-identical, and repeated
  emits are byte-identical.
- **Gates.** `npm run verify` exits 0, and the differential against the
  base shows only new-source differences, with one narrow exception
  (E017). An existing program that the base accepted and that then failed
  `go build` with E_TOOL, because a non-printable type reached a print
  site through a type variable, may change to the approved E_TYPE
  `Expected a printable value, found <t>`. Every such difference is listed
  and classified. Every valid existing program keeps byte-identical Go.
- **Documentation:**
  - ADR 013;
  - the Records section of docs/language.md;
  - docs/architecture.md;
  - README;
  - BACKLOG: R001 first tranche done, with fast-follow items for record
    patterns and for extension, merge and removal with written lacks;
    later items for polymorphic fields, punning and type aliases.
