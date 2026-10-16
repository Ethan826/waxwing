# Record extension, merge and removal: design (R005), draft

Status: draft, 2026-10-16. The user's decisions are recorded in
"Decided"; everything marked **Proposed** needs review. No code.

## Decided (user, 2026-10-16)

1. **Merge combines disjoint records.** Overlap is an error everywhere.
   Spread adds fields; the update `p { admin = v }` (R001) stays the only
   way to replace one. Accidental overlap is a useful error.
2. **Extension is spread-first:** `{ ...p, admin: true }`.
3. **Full open-row merge:** `{ ...a, ...b }` where both are open is in
   scope. Its disjointness constraint and the relationship between the
   input and result rows are designed here (§3) before implementation;
   `where r lacks a, b` alone cannot express them.
4. **Removal:** the rest pattern `{ name, ...rest }` (finishing R004's
   deferred rest binding) and an expression form (§4).
5. **Written lacks:** a clause `where r lacks a, b` after a signature's
   types (§2).
6. **Evaluation:** each field and spread once, left to right, as
   literals already are.

## 1. Surface

```
literal  = "{", item, { ",", item }, [ "," ], "}" ;
item     = lower, ":", expression | "...", expression ;
```

- A record literal is a list of fields and spreads in any order:
  `{ ...p, admin: true }`, `{ ...a, ...b }`, `{ id: 1, ...rest }`.
  Labels across all items must be disjoint (§3).
- `{ ...p }` alone is a copy and is allowed.
- **Proposed:** a literal must start with a lowercase name and `:` or
  with `...`, so it is never a block. A block cannot begin with `...`.
- Evaluation: items left to right, each once; the result is built after
  all are evaluated.

## 2. Written lacks

```wxw
fn granted(p: { ...r }): Bool where r lacks admin =
  { ...p, admin: true }.admin;
```

`admin` appears nowhere in the signature, so only the clause tells the
body that `r` lacks it. (`fn tag(p: { ...r }): { admin: Bool, ...r }`
needs no clause: `admin` beside `r` in the result already implies it.)

- A signature may end its types with `where`, then constraints separated
  by commas, before `=`. `r lacks a, b` says `r` never holds `a` or `b`.
- A label written beside `r` anywhere in the signature is already lacked
  (ADR 013's implied lacks); writing it again is allowed and has no
  effect. **Proposed:** no warning (Waxwing has none).
- A written lack seeds the body like an implied one, and each
  instantiation checks it like an implied one (Check/Seed, Lacks).
- `where` and `lacks` become reserved words. The clause is shaped so
  C001's class constraints can share it.

## 3. Disjointness and merged rows (**Proposed**, needs review)

### 3.1 Rows with several tails

The type language gains concatenated rows, the type-level mirror of a
merge literal:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s } where r # s =
  { ...a, ...b };
```

- A record type is fields plus zero or more tails: `{ id: Int, ...r,
  ...s }`. The result type of a merge says exactly how it relates to its
  inputs: its row is the concatenation of theirs.
- **Constraint** `r # s` ("r and s are disjoint"), in the `where` clause.
  A row variable is disjoint from the labels written beside it, as today,
  and from each tail beside it only if a written `#` says so: two tails in
  one row need `#` between them, else E_TYPE (text to approve).
- Spelling alternatives: `r # s` (Ur/Web), `r disjoint s`, `disjoint(r,
  s)`. **Open for the user.**

### 3.2 Checking

- **Normal form.** A row is a sorted set of labelled fields plus a
  multiset of tails, at most one of them an inference hole. Rows are
  flattened through bound tails (FlatRecord) before every comparison.
- **Unification.** Fields are unified label by label as today. Rigid
  tails must match as a multiset on both sides. What remains goes to the
  single hole tail on the side that has one (ADR 013 rules 2 and 3); two
  holes on one side are never created, so this stays a first-order
  problem without AC-unification search.
- **Disjointness facts** live beside lacks sets: each rigid variable
  carries the set of variables it is disjoint from. Concatenating two
  tails requires that fact; adding a field to a row requires every tail
  in it to lack the label.
- **Instantiation.** A call substitutes the callee's row variables. Each
  `r # s` becomes a check on the substituted rows: concrete labels must
  not meet, and a caller's own rigid variables in them must be disjoint
  by the caller's constraints. A leftover hole gets lacks sets from the
  other side's labels, as rule 3 does today.
- **Specialization.** Record rows already enter specialization keys
  (ADR 013). After substitution every row is ground, so a merge lowers
  to building one struct from several, field by field; no runtime row
  representation is needed.

### 3.3 Out of scope

Constraints between rows other than disjointness, rows minus rows, and
inferring a `#` constraint (written only; INF001 may infer later).

## 4. Removal (**Proposed**)

- **Rest pattern:** `{ name, ...rest }` binds `rest` to the record
  without the named fields. Against `{ name: Text, ...r }`, `rest` has
  type `{ ...r }`; against a closed type, the closed remainder. `...`
  without a name keeps meaning "ignore the rest".
- **Expression:** `p without name, age` has `p`'s type minus those
  labels; each must be a known field of `p` (as `.name` requires). A
  hole receiver is unified with `{ name: α, age: β, ...ρ }`, ρ fresh and
  lacking both, as access does. `without` becomes a reserved word.
  Alternatives: `p { -name }`, `remove(p, name)`. **Open for the user.**

## 5. Diagnostics (all **Proposed**, need approval)

| Case | Text | Location |
|---|---|---|
| A field or spread adds a label the record already has, both known | existing `Duplicate field x`, note `first written here` | the second label, or the spread that brings it |
| A label meets a rigid tail that may hold it | existing `r may already have field a`, note `r is introduced here` | the label |
| Two tails concatenated without `#` | E_TYPE `r and s may share fields; add where r # s` | the second spread or `...s` |
| A `#` or `lacks` constraint fails at a call | E_TYPE `Expected { …r } and { …s } to share no field, but both have a` | the call argument |
| `without` a label the record lacks | existing `a is not a field of { … }` | the label |

## 6. Acceptance

- Examples: extension, merge of two open rows through two generic
  functions, rest pattern and `without`, each executed against Go and
  the reference interpreter.
- Negative fixtures for each §5 row.
- Unification oracle (test/unify-oracle.mjs) extended with multi-tail
  rows; lacks and disjointness properties.
- Regression rows proved failing with each check removed.

## 7. Sequencing (**Proposed**)

Two tranches, each with its own plan: (A) extension, written lacks,
rest pattern and `without`, all single-tail; (B) multi-tail rows, `#`
and open-row merge. A needs none of §3; B is the larger type-system
change and benefits from A's surface being settled.
