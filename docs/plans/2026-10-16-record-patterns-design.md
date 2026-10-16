# Record patterns: design (R004), draft for review

Status: decisions approved by the user 2026-10-16 (A1, punning in
patterns, witness form); no code yet. Next: an implementation plan.

## Goal

Let `match` destructure a record. Today a record is read only by `.l`
(ADR 013), so a function that branches on a field and binds others needs
an access per field. Out of scope: binding the rest of a record as a value
(`...rest`, which needs R005's removal), punning (R007), patterns in `let`
or parameters (neither takes patterns today), and new runtime behaviour.

## 1. Surface

```
pattern = "_" | lower | literal
        | upper, [ "(", pattern, { ",", pattern }, ")" ]
        | "{", field, { ",", field }, [ ",", "..." ], [ "," ], "}" ;
field   = lower, [ ":", pattern ] ;
```

```wxw
fn greeting(p: { name: Text, admin: Bool }): Text =
  match p {
    { name: n, admin: true } => "Welcome back, ${n}",
    { name: n, admin: false } => "Hello, ${n}",
  };
```

- A field pattern is `label: pattern`, any pattern, nested freely in and
  around constructor patterns. Labels are unique (existing E_TYPE
  `Duplicate field x`, at the second).
- Field order in the pattern is not significant, as in types.
- There is no `{}` or `{ ... }` pattern; `_` already matches any record.
- A pattern position has no block, so `{` there is unambiguous.

**Decided (A1, user 2026-10-16): a pattern names every field or ends
with `...`.** The options weighed:
- *A1, explicit rest (chosen).* A pattern lists every field of the
  scrutinee's type unless it ends with `...`, which ignores the others
  (Rust's `..`). `{ name: n }` against `{ name, admin }` is an error; a new
  field added to a type then flags every pattern that does not mention it.
  Approved text: E_TYPE `Pattern is missing field admin; add it or end
  the pattern with ...` at the pattern, naming the first missing field in
  label order.
- *A2, implicit rest.* A pattern names any subset (PureScript, OCaml with a
  warning off). Shorter, but adding a field never flags a pattern.

## 2. Typing

A record pattern is checked against the type expected at its position
(the scrutinee's, or the enclosing field's), with the substitution
applied first. Three cases, decided by that type:

- **A record type**, closed or open with a tail (a rigid signature
  variable or an inference hole). Each named label must be a known field,
  else the existing E_TYPE `a is not a field of { … }` at that label's
  name (not its pattern). A pattern never learns a field from a tail:
  `{ a: x, ... }` against `{ ...r }` is that error. Each field pattern is
  checked against its field's type. Then, without `...`, the first
  unlisted known field in label order is `Pattern is missing field l;
  add it or end the pattern with ...`; and an open type with every known
  field listed is `Pattern is missing the rest of { a: Int, ...r }; end
  the pattern with ...`; both at the whole pattern.
- **An inference hole** (a type not yet known, such as an unannotated
  lambda parameter). The hole is unified with the type the pattern
  writes: closed over its labels without `...`; with `...`, open over a
  fresh tail that lacks those labels, as `.l` selection does (Check/Record
  `select`). Each field's type is a fresh hole.
- **Anything else**, including a rigid type variable `a`: the existing
  E_TYPE `Expected a record, found T` at the pattern.

Field binders, punned or written, are locals scoped to the arm, like
constructor binders.

## 3. Coverage

A record type is one constructor whose fields are the type's known
labels in label order (ADR 013's canonical order). In Maranget's matrix a
record pattern specializes to its fields, a field it does not name (via
`...`) being `_`; the head is always complete, so a record column never
forks. The head records whether the type is open, so a witness can print
`...`. Witnesses print as record literals with every known field,
`{ admin: false, name: _ }`, in label order, with `...` last for an open
type (approved 2026-10-16).

Coverage also has to see through records where it looks for data
types: the types it collects for matching, and inhabitation (a record is
inhabited exactly when every field type is), so that an ADT whose only
constructor holds a record with an uninhabited field is uninhabited. The
brute-force coverage oracle is extended with record columns and stays
independent of the compiler.

## 4. Lowering

A record pattern reads the specialized Go struct's fields; no new
runtime helper and no tag test. A record-valued field is stored inline,
and an ADT-valued field, inside a record as anywhere, stays a pointer:
its nil guard and a binder's dereference are kept. Field reads have no
effects, so their order is unobservable.

## 5. Punning in patterns (user 2026-10-16)

Patterns have no block ambiguity, so a field written without `: pattern`
puns: `{ name, admin: true }` binds `name` as `{ name: name, ... }` would.
The binder follows the usual binder rules (shadowing, arm scope). Literal
punning stays R007's, since `{ name }` there is a block.

## 6. Diagnostics

Approved 2026-10-16 (texts and locations as in §2): the missing-field
text (§1); for an open type with every known field listed and no `...`,
`Pattern is missing the rest of { a: Int, ...r }; end the pattern with
...`; and the witness form (§3),
`{ admin: false, name: _ }`, with `...` last for an open type.
Everything else reuses approved texts.

## 7. Acceptance

- Executable example with nested record and constructor patterns, Go
  output and printed results.
- Negative fixtures: unknown label, duplicate label, missing field
  (A1), non-record scrutinee, open tail without `...`; punned binders
  executing and shadowing.
- Coverage: redundancy and non-exhaustiveness through record fields,
  witnesses, the oracle extended to records.
- Regression rows proved failing with each check removed; differential
  against main showing only the new programs change.
