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

- A record pattern is checked against the scrutinee's (or enclosing
  field's) type, which must be a record type: closed, or open with a tail.
- Each named label must be in the type's known fields, else the existing
  E_TYPE `a is not a field of { … }` at the label. A pattern cannot learn a
  field from an open tail: `{ a: x, ... }` against `{ ...r }` is that error,
  because a rigid tail has no known fields.
- Under A1, a closed type's unlisted fields need `...`; an open type
  always needs `...` (its tail may hold more fields).
- Against a non-record type, the existing pattern E_TYPE mismatch text,
  at the pattern, as a constructor pattern on the wrong type is today.
  Against a type variable, as now, only `_` and binders fit.
- Field binders are locals scoped to the arm, like constructor binders.

## 3. Coverage

A record type is one constructor whose fields are the type's known
labels in label order (ADR 013's canonical order). In Maranget's matrix a
record pattern specializes to its fields, an unnamed field (via `...` or
under A2) being `_`; the head is always complete, so a record column
never forks. Witnesses print as record literals with every known field,
`{ admin: false, name: _ }`, in label order; an open type's witness adds
`...` (proposed rendering; part of the approved-text request with A1).
The existing brute-force oracle test is extended with record columns.

## 4. Lowering

A record pattern reads the Go struct's fields of the specialized type;
no new runtime helper. Each field is read at most once per arm test, in
label order; reads have no effects, so order is unobservable.

## 5. Punning in patterns (user 2026-10-16)

Patterns have no block ambiguity, so a field written without `: pattern`
puns: `{ name, admin: true }` binds `name` as `{ name: name, ... }` would.
The binder follows the usual binder rules (shadowing, arm scope). Literal
punning stays R007's, since `{ name }` there is a block.

## 6. Diagnostics

Approved 2026-10-16: the missing-field text (§1); for an open type with
every known field listed and no `...`, `Pattern is missing the rest of
{ a: Int, ...r }; end the pattern with ...`; and the witness form (§3),
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
