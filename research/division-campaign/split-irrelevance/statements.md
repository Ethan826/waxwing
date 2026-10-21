# Split irrelevance: statements first (Stream 8)

Date: 2026-10-21. Base: 77e0fa3 (dossier §18.17, items 2, 4 and 5).
Scope: statements, the E2 diagnosis, an adversarial review, and (after
the review) proofs in Lean under
research/composition-proofs/Composition/SplitIrrelevance/. No compiler
change. No canonical split rule is proposed or adopted; decision 3
(forced or written splits only) stays in force.

Status labels follow the dossier: **proved** (Lean, this repository),
**derived** (argued here, not mechanized), **checked** (executable
evidence on finite cases), **assumed**, **unresolved**.

## 1. Diagnosis of E2 (done first)

E2 (split-selection.md §3.4): a never-applied `fn(p: { ...u }) =>
show(p)` inside `divide` is accepted when the split gives `u = {}` and
refused when it gives `u = { f: Int -> Int }`. The question (§18.17,
item 2): (a) a genuinely observable difference between two otherwise
valid splits, or (b) an incomplete constraint model that calls a split
valid before every requirement is counted.

**Verdict: (b), at the call sites where E2 makes its choice.** The
printability requirement exists, is a requirement on `u`, and is in no
constraint any split is checked against. Counted, it makes `u = { f }`
invalid and leaves one split, so E2's call is then forced. A caveat
for generic callers follows the evidence (E2′): if the requirement is
*inferred* through the split instead of fixed in the callee's
interface, the difference becomes genuine again.

### 1.1 Evidence from the code

1. **Check time is optimistic for type variables and tails.**
   src/Features/Check/Printable.purs:54-58 refuses a print site only if
   `containsFunction holders (typeOf value)`. That predicate,
   src/Features/Check/Functional.purs:45-52, returns `false` for every
   type variable (`_ → false`, line 52) and looks only at a record's
   written fields (`fieldTypes row`, line 49), never at its tails. So
   `show(p)` at `{ ...u }` passes, whatever `u` will be. It runs in
   src/Features/Check/Function.purs:97 (`printable holders env
   settled`) after the body's other constraints.
2. **The requirement is re-checked only after specialization.** Each
   `show`, `print` and `crash` site is noted during copying
   (src/Features/Specialize/Body.purs:92-94, `site`), and once every
   type is ground `checkSites` judges each noted site
   (src/Features/Specialize.purs:95, calling
   src/Features/Specialize/Printable.purs:55-63; the refusal is
   lines 99-104 and 112-113, E_TYPE `Expected a printable value`).
   Sites inside never-applied lambdas are copied too, so the check is
   on types, not on executions. language.md, "Printability at the
   ground type" (r001-printable, BACKLOG E017), documents this.
3. **Nothing carries the requirement into a constraint.** The checked
   declaration (src/Domain/Checked/Internal.purs:45-54,
   `FunctionDecl`) holds parameters, result, row and body; no clause
   and no requirement. The record checker's `D` (from Function.purs via
   Seed.purs) and its waiting `Merge` predicates (recon.md §1) contain
   equations, lacks and disjointness only. The split decision
   (src/Features/Check/Unresolved.purs:74, `CannotTell`) and any future
   witness search see no printability atom.
4. **The same pattern already exists with one tail.** ADR 007, "Holes
   and the representative", condition 1: no constraint may mention a
   hole; C001 must report a constrained hole as ambiguous, never pick a
   representative. Printability *is* such a constraint, kept out of the
   constraint system. Checked today (main checkout's `output/`, built
   2026-10-21 08:42; scratch files, run with Stream 6's `run.mjs`):

   | Probe | `r` fixed by | Result |
   |---|---|---|
   | a.wxw: `probe(fn(y) => 0)` | nothing (hole, defaulted to `{}`) | exit 0 |
   | b.wxw: `probe(fn(y: { f: (Int) -> Int }) => 0)` | the argument | E_TYPE `Expected a printable value, found { f: Int -> Int }` |
   | g.wxw: `peek({ f: fn(n: Int) => n })`, `peek` holding the same never-applied lambda | the argument | the same E_TYPE |

   In a.wxw the defaulted row satisfies a constraint nobody recorded;
   in b.wxw and g.wxw the determined row violates it. E2 is the
   several-tail version: the "default" is a split.

### 1.2 Argument from the constraint model

Write `Pr(τ)` for "the ground type `τ` holds no arrow or handler at any
depth" (Printable.purs:34-35, `groundPrintable`). A `show` site at
`{ ...u }` in `divide` imposes `Pr(θ(u))` at every key `θ` of
`divide`. That is a constraint on `divide`'s own rigid row, of the same
standing as a declared clause: callers must meet it at the instantiated
key, or specialization refuses.

- In a model **with** `Pr` counted (§3, model M1: `divide`'s
  requirement interface is `D ∧ Pr(u)`), E2's witness `u = { f }`
  violates `divide`'s interface at `main`'s key: it is not a valid
  split. `u = {}`, `v = { a, f }` is the only split satisfying both
  `u disjoint s` (`s = { a }`) and `Pr(u)`: `a` cannot go to `u`
  (disjointness) and `f` cannot (printability), so the split is
  forced. Two valid splits with different acceptance do not exist
  here.
- In a model **without** `Pr` (model M0, today's: requirement interface
  `D` only), both splits are "valid", and acceptance differs. That is
  the incompleteness of (b).

So E2 does not show that two valid splits are observably different.
It shows that "valid" was computed before printability was counted.

### 1.3 Where (a) comes back: inferred interfaces (E2′)

Counting `Pr` has two forms, and they differ.

- **Declared** (fixed by the text): every function's requirement
  interface is fixed independently of any split inside it, for
  instance a C001-style `where` clause or a rule that refuses `show` at
  a rigid row without one. A generic caller is then checked against
  the callee's fixed interface for every key, so two splits are both
  valid or not, by the same interface. §3's (C) is about this form.
- **Inferred through the split** (the interface of a generic caller is
  whatever its body needs under the split chosen inside it, the
  template semantics of today, lifted to interfaces): then two splits
  inside one function give two different interfaces, and callers of
  that function are accepted under one and refused under the other.
  Example (derived): `route` (dossier §17.3) calls `divide` with the
  `show` site above. Under split A (free labels to `v`), `route` needs
  `Pr(r ∩ t ∖ s)`; under split B (free labels to `u`), `Pr(r ∖ s)`. A
  caller passing `x = { f: fn }` with `f` outside `s` and `t` is
  accepted under A and refused under B. Both splits are valid in their
  own inferred model; the difference is genuine, (a).

  A weakest inferred interface exists in this example (per region,
  "printable" or "no requirement"), but choosing it is a selection
  rule again (free labels away from print sites), and with two
  incomparable requirement kinds (printability, a future `Eq`) there
  need not be a weakest one. This is not proved; it is a reason why
  "count the requirement" must say which form.

## 2. The fragment

A small calculus, λ-split. Types are the shared model's type
expressions (`TExpr`, Composition/Syntax.lean: base, arrow, type
variable, record of written fields and row tails), interpreted at a key
`θ : Assign` by `evalT θ`, which is partial (a composition of
overlapping rows is undefined). Ground types are `G`.

**Terms** (de Bruijn variables; each annotated node carries a site
number `k` into the program's tables):

| Term | Meaning |
|---|---|
| `x` | variable |
| `n` | a literal (natural number) |
| `{}` | the empty record |
| `{ l: t, ...t' }` | extension, defined iff `t'` lacks `l` |
| `{ ...t, ...t' }` | composition (spread), defined iff the label sets are disjoint |
| `t.l` | field access |
| `t without l` | the rest after removing `l` (rest binder `{ l: _, ...rest }`) |
| `fn(t)` | lambda (annotations play no run-time role and are not modeled) |
| `t(t')` | application |
| `f_k(t)` | call of declaration `f`; site `k` names the call's **witness** |
| `show_k(t)` | a `show`-like class operation; site `k` names its argument type |
| `project_k(t)` | **excluded** operation (E3): restrict a record to the labels of the type at site `k` |

**Programs.** A program `P` has, per declaration `f`: a body; declared
clauses `D f` (the shared `Problem`, atoms `eq`, `lacks`, `disjoint`,
`ff`); and a **requirement interface** `Req f : Assign → Prop`, the
model's statement of what a key of `f` must satisfy. Per site: a type
`ty k : TExpr` (for `show_k` and `project_k`) and a witness
`wit k : Assign → Assign` (for `f_k`), the callee's key as a function of
the caller's key.

A witness is any function of the caller's key. This covers today's
`Array (Ty Open)` instantiation, P9s whole-rest witnesses, term witnesses
`r|T` and typed templates (split-selection.md §2.1): each computes the
callee's key from the caller's. The **split** at a call is its witness.

**Split variants.** `P₁` and `P₂` are split variants if they agree on
bodies, `ty`, `D` and `Req`, and may differ on `wit`. Two splits of one
call give two split variants.

**Allowed operations**: every row of the table except `project_k`. A
program is *projection-free* if no body contains `project_k`.

**Excluded, with reasons:**

| Excluded | Why |
|---|---|
| row-variable projection (`project_k`, E3), any primitive or row-polymorphic foreign function returning `{ ...p }` from `{ ...p, ...q }` | its result is the split; R fails (§5, E3, proved) |
| type-directed operations whose run-time behaviour reads a type argument (type case, class dictionaries chosen per instance, `Fail` families keyed by a type's label set) | the same reason; `Fail({ ...r })` is refused at check time today (language.md, "Failure payloads"), so it is excluded, not modeled |
| comparison at open records | refused at check time (ADR 007, "Opaque variables and comparison groundness"); never split-dependent |
| data types, effects, handlers, `Fail`, `print` as an effect | not modeled; `show` stands for the print sites (all three are judged by one check) |
| the 10,000-key limit (`E_SPECIALIZATION`, Specialize/Keys.purs:150) | two splits may reach different numbers of keys (split-selection.md E4), so acceptance at the limit can differ; a resource bound, outside (C) |
| several-tail lowering (Task 8) | not implemented; the model assumes the intended semantics |

## 3. Observations

1. **Run time.** A big-step evaluator with fuel,
   `eval P θ n ρ t : Option V`, values `V ::= n | rec [(l, v)] | clo ρ t
   | shown v`. `show_k(t)` evaluates `t` to `v` and yields `shown v`: the
   printed form is modeled as the value printed, which is at least as
   fine as any rendering of it. `none` is "stuck or out of fuel"; equal
   results at every fuel `n` mean equal termination, divergence and
   output. Only `project_k` reads the key `θ`.
2. **Compile acceptance.** Specializing `t` at key `θ` *reaches* a site
   `(k, g)` when `t` contains `show_k`, under any lambda, applied or
   not, and `evalT θ (ty k) = some g`; or contains a call `f_k(t')` and
   specializing `f`'s body at `wit k θ` reaches it. `t` is
   **accepted at `θ`** for a ground predicate `Ok` (for E2,
   `Ok = Pr`) if every reached site has `Ok g`. A site whose type is
   undefined at the key is not reached: definedness belongs to signature
   validity (`B`), not to this check (restriction table).
3. **Diagnostics.** The compiler reports the first failing site in
   specialization order. Under (C)'s hypotheses no site fails, so there
   is no diagnostic under either split. Diagnostics of programs refused
   before specialization (by the signature check) are not about splits
   and are out of scope.

## 4. The constraint model and the statements

**Local coverage** (the model counts every specialization-time
requirement): `Covers P` holds if for every declaration `f` and key
`θ` with `Req f θ`:

- (i) every site `(k, g)` reached *locally* in `f`'s body at `θ`
  (without descending into calls) has `Ok g`; and
- (ii) every call `g_k` in `f`'s body satisfies `Req g (wit k θ)`.

(i) is what a signature check must establish universally for `f`'s
own sites; (ii) is what it means for a split to be **valid in the
model**: the witness meets the callee's interface at every key the
caller admits.

Model M0 (today): `Req f θ := Sat θ (D f)`, with no `Ok` atoms. Model
M1 adds the requirements: for E2, `Req divide θ := Sat θ (D divide) ∧
Pr(θ(u))`.

Statements (the names are the Lean names after the proofs; §6):

- **R, run-time irrelevance.** If `P₁`, `P₂` are split variants and
  projection-free, then for all keys `θ₁`, `θ₂`, fuel `n`, environments
  `ρ` of projection-free values and projection-free `t`:
  `eval P₁ θ₁ n ρ t = eval P₂ θ₂ n ρ t`.
  Note: R needs no validity. In this reference semantics a projection-
  free program never reads its key; validity matters for acceptance
  (C) and for the correspondence with typed Go lowering (assumption
  A-go below).
- **R-boundary (E3).** There are split variants `P₁`, `P₂`, differing
  only in one call's witness, both satisfying `D` at the witness keys
  and with equal parameter images, and containing one `project_k`,
  whose results differ.
- **C-local, coverage gives acceptance.** If `Covers P` and
  `Req f θ`, then `f`'s body is accepted at `θ`.
- **C, acceptance irrelevance.** If `P₁`, `P₂` are split variants, both
  satisfy `Covers`, and the entry `e` has `Req e θ₀`, then both bodies
  of `e` are accepted at `θ₀`. In particular acceptance under `P₁` and
  under `P₂` agree. (The "both refused" case cannot come from
  specialization when the model is complete; refusal can then only come
  from the signature check, which does not see the split choice.)
- **E2-formal.** With `Ok = Pr`: there are split variants `P₁`
  (`u = { f }`, `v = { a }`), `P₂` (`u = {}`, `v = { a, f }`) of E2's
  `main`/`divide`, both witnesses satisfying `divide`'s `D` at the
  witness key and giving `{ ...u, ...v }` the same image, with equal
  run-time results, `P₂` accepted and `P₁` refused (M0 calls both
  valid). Under M1, `Covers P₂` holds and `Covers P₁` fails.
- **E2′-formal** (optional, if the proofs reach it): with interfaces
  inferred through the split, two splits of one generic call give
  callers different acceptance.

## 5. Restrictions table

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| reference semantics untyped; Go lowering not modeled (A-go) | Go copies are type-directed but, for allowed constructs, read only written labels and whole-value layouts (split-selection.md §1, §2.1) | a construct whose Go lowering reads a split part's layout (none known besides projection) | assumed; Go-vs-interpreter differential is the only evidence |
| `show` returns the shown value instead of text | rendering is a function of the value | a printer that reads the static type (Go: generated per type) | assumed (A-go); a ground printer reads only the value's type, equal under both splits for every reachable value |
| witnesses are arbitrary functions of the caller's key | covers every witness form (§2) | none: more general than any form | harmless by generality; says nothing about computing them |
| `Req` is a semantic predicate on keys | any clause language denotes one | a clause language that cannot express what (i) needs (`Pr` of a restriction `r|T`, E2′) | real limit: (C) holds for the model; whether a syntactic checker can establish `Covers` is separate |
| definedness of site types not part of acceptance | it is part of `B`, signature validity (§14, §15) | a split valid for `B` but making a site's type undefined | argued: a site's type is built from the body's types, which `B` defines; not proved here |
| specialization reaches sites by an inductive relation (finite derivations) | the compiler copies finitely many keys (R010, ADR 007 §4.2) | polymorphic recursion with unbounded keys | harmless for (C): the theorem quantifies over every reached site |
| one requirement kind per program (`Ok`) | printability is the only post-specialization type check today (Specialize.purs:95) | a second check (Stream 5's inventory) | the theorem is generic in `Ok`; several kinds are a conjunction |
| no data types, effects, handlers, `Fail` | the parts that read keys (`Fail` families) are refused at check time when open | an effect operation polymorphic in a record row (R009, future) | excluded; must be re-examined when R009 lands |
| key limit excluded | resource bound | E4: different splits, different key counts | excluded from (C); a counterexample at the limit is expected, not constructed |
| interfaces fixed by the text (declared form) | needed: E2′ | E2′ | (C) is stated only for this form |

## 6. Status

To be filled after the review and the proofs.
