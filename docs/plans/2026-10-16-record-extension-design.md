# Record extension, merge and removal: design (R005), draft 2

Status: draft 2, 2026-10-16. Tranche A (§1-§5) approved for planning
(user, 2026-10-16): braced lacks labels, `{}` as the empty record type,
and the §5 texts as corrected there. Tranche B (§6) keeps its surface
but needs a dedicated algorithm pass before planning. No code.

## Decided (user, 2026-10-16)

1. **Merge combines disjoint records.** Overlap is an error everywhere.
   Spread adds fields; the update `p { admin = v }` (R001) stays the only
   way to replace one.
2. **Extension is spread-first:** `{ ...p, admin: true }`.
3. **Full open-row merge** is in scope (Tranche B), with its disjointness
   constraint and the input/result row relationship designed before it
   is planned.
4. **Removal:** the rest pattern `{ name, ...rest }` and an expression,
   `p without { name, age }` (review, 2026-10-16).
5. **Constraints** in a `where` clause, in words: `r lacks …` and
   `r disjoint s` (review, 2026-10-16; `#` withdrawn).
6. **Evaluation:** each field and spread once, left to right.
7. **Two tranches:** A is single-tail; B adds multi-tail rows.

# Tranche A

## 1. Extension and copy

```
literal = "{", item, { ",", item }, [ "," ], "}" ;
item    = lower, ":", expression | "...", expression ;
```

- A record literal lists fields and spreads in any order:
  `{ ...p, admin: true }`, `{ id: 1, ...rest }`, `{ ...p }` (a copy).
  In Tranche A a literal holds at most one spread; a second is E_TYPE
  until Tranche B (text in §5).
- A literal begins with a lowercase name and `:`, or with `...`. No block
  item begins with `...`, so a literal is never a block.
- Every label must be absent from the spread's type: a known field there
  is an overlap; a rigid tail must lack the label (written or implied).
  A hole spread is unified with `{ ...ρ }`, ρ fresh and lacking the
  literal's labels.
- Items are evaluated left to right, each once; the record is built after
  the last.

## 2. Written lacks

```wxw
fn granted(p: { ...r }): Bool where r lacks { admin } =
  { ...p, admin: true }.admin;
```

- A signature may end its types with `where` and constraints separated
  by commas, before `=`: `where r lacks { admin, owner }`.
- Labels are always braced (approved 2026-10-16), so commas inside
  braces separate labels and commas outside separate constraints:
  `where r lacks { a, b }`, matching `without { … }`.
- A label already written beside `r` in the signature is implied; writing
  it again is allowed and has no effect.
- A written lack seeds the body like an implied one and is checked at
  each instantiation like one (Check/Seed, Lacks, Resolve/Lacking).
- `where`, `lacks` and `without` become reserved words; `disjoint` too
  (Tranche B uses it, reserving it now avoids a second break).

## 3. Removal

**Rest pattern.** `{ name, ...rest }` binds `rest` to the record without
the fields the pattern names. Against `{ name: Text, ...r }` it has type
`{ ...r }`; against a closed type, the closed remainder. Bare `...` still
ignores the rest. It is a record pattern (R004) whose rest has a binder;
coverage treats the binder as `_`.

**Expression.** `p without { name, age }`:
- **Precedence:** a postfix operation at the level of call, access and
  update, applied left to right: `f(x) without { a }.b` is
  `((f(x)) without { a }).b`. It binds tighter than `|>`, `+` and
  comparisons, as the others do.
- **Evaluation:** the receiver once.
- **Typing:** each label must be a known field of the receiver's type
  (`.name`'s rule); the result has the receiver's type minus those
  labels. A hole receiver is unified with `{ name: α, age: β, ...ρ }`, ρ
  fresh and lacking both; the result is `{ ...ρ }`.
- **Unknown label:** existing `age is not a field of { … }` at the
  label. **Repeated label:** existing `Duplicate field age` at the second,
  noted `first written here`. **Empty braces** `p without {}`: E_SYNTAX
  with the parser's existing text for a missing label.

## 4. Empty records

Removing every field, or binding the rest after naming every field,
gives an empty record. It becomes an observable value:
- **Type:** written `{}` in type position (E_SYNTAX there today, so free)
  and printed `{}` in diagnostics. It is distinct from `Unit`: `{}` and
  `Unit` do not unify.
- **Value:** no literal of its own; `{}` in an expression stays Unit. An
  empty record arises from removal, a rest binding, or `{ ...rest }`.
- **Printing:** `{}` (Unit prints `()`).
- **Equality and ordering:** all empty records are equal.
- **Lowering:** the empty Go struct (ADR 013 already emits it for an
  empty specialized layout).
- Tests: removal to empty, rest binding to empty, copy of an empty rest,
  equality, printing beside Unit, a signature written with `{}`.

## 5. Diagnostics (Tranche A; approved 2026-10-16)

| Case | Text | Location |
|---|---|---|
| A literal adds a label its spread's known type has | existing `Duplicate field admin`, note `first written here` | the later item in written order, noted at the earlier: `{ ...p, admin: true }` at `admin`, noted at `...p`; `{ admin: true, ...p }` at `...p`, noted at `admin` |
| A literal adds a label a rigid tail may hold | existing `r may already have field admin`, note `r is introduced here` | the label |
| A call's argument has a field a written `lacks` forbids | E_TYPE `admin is not allowed here: r lacks { admin }`, note `required here` | the argument; the note at `admin` in the `where` clause |
| A second spread in one literal (until Tranche B) | E_TYPE `A record literal accepts at most one spread` | the second spread |
| `without` a missing or repeated label | existing texts (§3) | the label |

# Tranche B (needs an algorithm pass before planning)

## 6. Merge of open rows

Surface (kept):

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s } where r disjoint s =
  { ...a, ...b };
```

A record type may hold several tails, the type-level mirror of a merge
literal; the result row is the concatenation of the inputs'.

**Withdrawn:** draft 1's claim that one hole per row and multiset
matching suffice. Instantiating `merge` gives `{ ...?r, ...?s }`, two
holes in one row before the arguments resolve them; nested calls
(`merge(merge(a, b), c)`), partial application and function references
keep such rows alive.

**The algorithm pass must specify:**
- **Representation** of unresolved concatenations, and how they are
  solved as holes are bound, including composition and rows reached only
  through a function reference.
- **Persistent disjointness obligations** between holes: `?r disjoint
  ?s` must be retained and re-checked whenever either side gains a field
  or a tail, not approximated by lacks sets from current labels.
- **The mixed case:** `{ a: Int, ...r } disjoint { ...s }` requires both
  `s lacks { a }` and `r disjoint s`, and both survive substitution and
  calls through generic wrappers.
- **Residual obligations** at generalization: whether they become
  required written constraints or errors.
- **Oracle:** soundness and completeness against finite row assignments
  (test/unify-oracle.mjs or a new oracle), including composition.

**Diagnostics to draft** in that pass, each separate:
- a known field forbidden by `lacks` (Tranche A's row);
- a known overlap under `disjoint`, with both contributing items'
  locations (the earlier spread noted as `first written here` when it
  supplied the field);
- missing evidence that two symbolic rows are disjoint, where no
  overlapping label is known.

Lowering is unchanged in principle: after specialization every row is
ground, so a merge builds one struct from several, field by field.

## 7. Acceptance (Tranche A)

- Executed examples: extension, copy, written lacks, rest binding,
  `without`, empty records; reference interpreter and Go agree.
- Negative fixtures for each §5 row and §3's errors.
- Unification and lacks properties extended to written lacks.
- Regression rows proved failing with each check removed.
