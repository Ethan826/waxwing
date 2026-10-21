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

History: the first draft (d5d48a6) was reviewed adversarially (§6).
The review found three false statements; this version corrects them.
The corrections are listed in §6, with the original wording, and none
is silent.

## 1. Diagnosis of E2 (done first)

E2 (split-selection.md §3.4): a never-applied `fn(p: { ...u }) =>
show(p)` inside `divide` is accepted when the split gives `u = {}` and
refused when it gives `u = { f: Int -> Int }`. The question (§18.17,
item 2): (a) a genuinely observable difference between two otherwise
valid splits, or (b) an incomplete constraint model that calls a split
valid before every requirement is counted.

**Verdict: (b), for printability, at ground call sites, whether the
site is in the callee (E2) or in the caller (E2c, §1.3).** The
printability requirement exists. It is a requirement on the split's
parts, and no constraint that any split is checked against contains
it. Once counted, it makes `u = { f }` invalid and leaves one split, so
E2's call is then forced *at that ground key*. Three qualifications
follow (§1.3-§1.5):

- the same holds for comparability at caller-side sites;
- if requirements are *inferred* through a split rather than fixed in
  an interface, the difference is genuine (a) again (E2′);
- the polymorphic-recursion rule R010 is a different kind of
  dependence: a syntactic rule on the witness's *form*, not a missing
  requirement. Two splits valid in every semantic model can differ in
  acceptance through it (E5). That is (a) for today's rules, unless
  R010 is relaxed or its admissibility is counted as part of split
  validity.

### 1.1 Evidence from the code

1. **Check time is optimistic for type variables and tails.**
   src/Features/Check/Printable.purs:54-58 refuses a print site only if
   `containsFunction holders (typeOf value)`. That predicate,
   src/Features/Check/Functional.purs:45-52, returns `false` for every
   type variable (`_ → false`, line 52) and looks only at a record's
   written fields (`fieldTypes row`, line 49), never at its tails. So
   `show(p)` at `{ ...u }` passes, whatever `u` will be. The check runs
   in src/Features/Check/Function.purs:97 (`printable holders env
   settled`), after the body's other constraints.
2. **The requirement is re-checked only after specialization.** Each
   `show`, `print` and `crash` site is noted while it is copied
   (src/Features/Specialize/Body.purs:92-94, `site`). Once every type
   is ground, `checkSites` judges each noted site
   (src/Features/Specialize.purs:95, which calls
   src/Features/Specialize/Printable.purs:55-63). The refusal is lines
   99-104 and 112-113, E_TYPE `Expected a printable value`. Sites
   inside never-applied lambdas are copied too, so the check is on
   types, not on executions. language.md documents this under
   "Printability at the ground type" (r001-printable, BACKLOG E017).
3. **Nothing carries the requirement into a constraint.** The checked
   declaration (src/Domain/Checked/Internal.purs:45-54,
   `FunctionDecl`) holds parameters, result, row and body, and no
   clause or requirement. The record checker's `D` (from Function.purs
   via Seed.purs) and its waiting `Merge` predicates (recon.md §1)
   contain only equations, lacks and disjointness. The split decision
   (src/Features/Check/Unresolved.purs:74, `CannotTell`) sees no
   printability atom, and neither would any future witness search.
4. **The same pattern already exists with one tail.** ADR 007, "Holes
   and the representative", condition 1, says no constraint may
   mention a hole: C001 must report a constrained hole as ambiguous and
   never pick a representative. Printability *is* such a constraint,
   kept out of the constraint system. Checked today with the main
   checkout's `output/`, built 2026-10-21 08:42 (scratch files, run
   with Stream 6's `run.mjs`):

   | Probe | Fixed by | Result |
   |---|---|---|
   | a.wxw: `probe(fn(y) => 0)`; `probe` holds a never-applied `fn(x: { ...r }) => show(x)` | nothing (hole, defaulted to `{}`) | exit 0 |
   | b.wxw: `probe(fn(y: { f: (Int) -> Int }) => 0)` | the argument | E_TYPE `Expected a printable value, found { f: Int -> Int }` |
   | g.wxw: `peek({ f: fn(n: Int) => n })`, where `peek(x: { ...r })` holds the same lambda | the argument | the same E_TYPE |
   | h1.wxw: `probe(k: ({ ...r }) -> Text, w: { ...r })`; `main` passes `fn(p) => show(p)` and `{ f: fn }` | the instantiation, in the caller | the same E_TYPE, at `p` in `main` |
   | h2.wxw: h1 with `{ a: 1 }` | the instantiation | exit 0 |
   | h3.wxw: h1 with `-> Bool` and `fn(p) => p == p` | the instantiation, in the caller | E_TYPE `Type { f: Int -> Int } is not comparable` (check time) |
   | h4.wxw: h3 with `{ a: 1 }` | the instantiation | exit 0 |

   h1-h4 are the reviewer's probes (§6), re-run here. In a.wxw the
   defaulted row satisfies a constraint that nobody recorded. In the
   others, the determined row violates it. E2 is the several-tail
   version of g.wxw, and E2c is the several-tail version of h1. In
   both, the "default" or "determination" is a split.

### 1.2 Argument from the constraint model

Write `Pr(τ)` for "the ground type `τ` holds no arrow or handler at any
depth" (src/Features/Specialize/Printable.purs:34-35,
`groundPrintable`). A `show` site at `{ ...u }` in `divide` imposes
`Pr(θ(u))` at every key `θ` of `divide`. That is a constraint on
`divide`'s own rigid row, with the same standing as a declared clause:
callers must meet it at the instantiated key, or specialization
refuses.

- In a model **with** `Pr` counted (model M1, §4: `divide`'s
  requirement interface is `D ∧ Pr(u)`), E2's witness `u = { f }`
  violates `divide`'s interface at `main`'s key, so it is not a valid
  split. The only split satisfying both `u disjoint s` (`s = { a }`)
  and `Pr(u)` is `u = {}`, `v = { a, f }`. Disjointness keeps `a` out
  of `u` and printability keeps `f` out, so the split is forced *at
  this ground key*. (Proved for the model: `e2_not_covers₁`,
  `e2_covers₂`.) "Forced" here does not mean accepted today: a forced
  split is still refused by `CannotTell` (c.wxw, the O4 limitation,
  split-selection.md §3.1).
- In a model **without** `Pr` (model M0, today's), the requirement
  interface is `D` only. Both splits are "valid", and acceptance
  differs (`e2_m0_valid`, `e2_refused`, `e2_accepted₂`). That is the
  incompleteness of (b).

So E2 does not show that two valid splits differ observably. It shows
that "valid" was computed before printability was counted.

`Pr` is not an atom of the shared `Problem` (Syntax.lean: `eq`,
`lacks`, `disjoint`, `ff`). It depends on field types, so it breaks the
label-blind membership-vector abstraction that the presence results
(Composition/Presence, Stream 3's witnesses, Stream 6's uniformity
argument) rely on. Two labels in one region can now split by their
types. Forcing at a *generic* call by `Pr` needs typed atoms, and the
presence results do not cover them.

### 1.3 Caller-side sites (E2c) and comparison

The requirement need not sit in the callee. In h1 the site is in a
lambda the caller passes, and its type is the caller's own flexible
variable, solved through the callee's instantiation. With several
tails (`divide(..., k: ({ ...u }) -> Text)`, `main` passing `fn(p) =>
show(p)`), the split decides `p`'s type in `main`. The requirement is
then on the caller's flexible variable, not on `divide`'s rigid row. A
complete model needs `Ok` atoms on flexible variables, counted in the
caller's own obligations at its local key (clause (i) of `Covers`,
§4). Proved for the model: `e2c_refused`, `e2c_covers₂`,
`e2c_not_covers₁`, `e2c_accepted₂`.

Comparison behaves the same way at check time: h3/h4 (refused with a
function field, accepted with `{ a: 1 }`). If the part is left as a
hole instead, ADR 007 makes the comparison `Ambiguous`. So acceptance
also depends on whether a part is chosen or defaulted (row "witness
form" in §5). Comparability is a second requirement kind. The model is
generic in the requirement (`Prog.ok`, per site).

### 1.4 Inferred interfaces (E2′)

Counting `Pr` can take two forms, and they differ.

- **Declared** (fixed by the text). Every function's requirement
  interface is fixed independently of any split inside it, for
  instance by a C001-style `where` clause, or by a rule that refuses
  `show` at a rigid row without one. A generic caller is then checked
  against the callee's fixed interface at every key, so the same
  interface decides whether each of two splits is valid. §4's (C)
  covers this form: split variants share `Req`.
- **Inferred through the split.** Here the interface of a generic
  caller is whatever its body needs under the split chosen inside it:
  today's template semantics, lifted to interfaces. Two splits inside
  one function then give two interfaces, and callers of that function
  are accepted under one and refused under the other.

  Example (derived; the reviewer checked it, §6 S10): `route` (dossier
  §17.3) calls `divide` with the `show` site above, and `s disjoint t`
  holds. Under split A (free labels to `v`), `u = r ∩ t ∖ s` and
  `route` needs `Pr(r ∩ t ∖ s)`. Under split B (free labels to `u`),
  `u = r ∖ s` and it needs `Pr(r ∖ s)`. A caller passing `x = { f: fn
  }` with `f` outside `s` and `t` is accepted under A and refused under
  B. Each split is valid in its own inferred model, so the difference
  is genuine: (a).

  In this example a weakest inferred interface exists: per region,
  either "printable" or "no requirement". But choosing it is a
  selection rule again (free labels away from print sites). With two
  incomparable requirement kinds, say printability and a future `Eq`,
  a weakest interface need not exist. None of this is proved.

  In the Lean model this case falls outside (C)'s hypothesis by
  construction: `Req₁` (M1 in general, Defs.lean) depends on `loc`,
  which varies with the split, so inferred interfaces are not split
  variants.

### 1.5 The instantiation rule R010 (E5)

src/Features/Check/Instantiation.purs:60-73 (`judgeCall`) judges every
call inside a recursive component. A record slot must be the caller's
bare `...r` or mention no rigid variable
(src/Features/Check/NestedArguments.purs:45-48, `admissibleSlot`;
otherwise E_SPECIALIZATION `PolymorphicRecursion`). Example (the
reviewer's, derived from the code; several tails are not checked end to
end today):

~~~waxwing
fn walk(whole: { ...u, ...v }, left: { ...s }, n: Int): Int
  where u disjoint s =
  if n == 0 then 0 else walk(whole, left, n - 1);
~~~

The witness `u' ↦ u, v' ↦ v` is admitted. The witness `u' ↦ {}, v' ↦ {
...u, ...v }` satisfies `D` (`v'` has no clause) and also reaches
finitely many keys. But `v'` is not a bare row, so the call is refused.
No requirement is missing: R010 is a rule on the witness's *syntax*,
there to guarantee finitely many keys. Under today's rules, then, two
semantically valid splits can differ in acceptance through it. It
leaves this theorem's scope (§2, excluded). The author has two ways to
remove it: relax R010 to admit restrictions (split-selection.md §2.3),
or make "admissible under R010" part of what makes a split valid.

## 2. The fragment

A small calculus, λ-split (Defs.lean). Types are the shared model's
type expressions (`TExpr`, Composition/Syntax.lean): base, arrow, type
variable, and record of written fields and row tails. They are
interpreted at a key `θ : Assign` by `evalT θ`, which is partial: a
composition of overlapping rows is undefined. Ground types are `G`.

**Terms** use de Bruijn variables. Each annotated node carries a site
number `k` into the program's tables.

| Term | Meaning |
|---|---|
| `x` | variable |
| `n` | a literal (natural number) |
| `{}` | the empty record (not a source literal; language.md has no `{}` expression) |
| `{ l: t, ...t' }` | extension, defined iff `t'` lacks `l` |
| `{ ...t, ...t' }` | composition, defined iff the label sets are disjoint (R005B's multi-spread: intended semantics, one spread today) |
| `t.l` | field access |
| `t without l` | the rest after removing `l` (rest binder `{ l: _, ...rest }`) |
| `fn(t)` | lambda |
| `t(t')` | application |
| `f_k(t)` | call of declaration `f`; site `k` names the call's **witness** |
| `show_k(t)` | a `show`-like class operation; site `k` names its argument type |
| `ann_k(t)` | any other typed position (a lambda parameter's annotation, a comparison operand): `t` at run time, but its type must be defined and meet site `k`'s requirement |
| `project_k(t)` | **excluded** (E3): restrict a record to the labels of the type at site `k` |

**Programs.** A program `P` has these parts:

- per declaration `f`: a body; declared clauses `D f` (the shared
  `Problem`); a **requirement interface** `Req f : Assign → Prop` on
  rigid keys; and a **local key** `loc f : Assign → Assign`. The local
  key extends a rigid key with the solutions of `f`'s own flexible
  variables. A split inside `f` may change them, as in E2c;
- per site: a type `ty k : TExpr` and a requirement `ok k : G → Prop`
  (printability for `show`, comparability for `==`, none for a plain
  annotation);
- per call site: a witness `wit k : Assign → Assign`, the callee's
  rigid key as a function of the caller's local key.

The witness is a function of the key, and that is its whole content
for these theorems. Today's `Array (Ty Open)` instantiation, P9s
whole-rest witnesses, term witnesses `r|T` and typed templates
(split-selection.md §2.1) all compute the callee's key in this way. The
model does not see a witness's *form*, so form-sensitive rules (R010,
holes versus chosen parts) are outside it (§5).

**Split variants.** `P₁` and `P₂` are split variants if they agree on
bodies, `ty`, `ok`, `D` and `Req`. They may differ on `wit` and `loc`.
Two splits of one call, including the caller-side typing they induce,
give two split variants. `Req` is the same text in both; this is the
declared form of §1.4.

**Allowed operations**: every row of the table except `project_k`. A
program is *projection-free* if no body contains `project_k`.

**Excluded, with reasons:**

| Excluded | Why |
|---|---|
| row-variable projection (`project_k`, E3), any primitive or row-polymorphic foreign function returning `{ ...p }` from `{ ...p, ...q }` | its result is the split, so R fails (E3, proved: `e3_differs`) |
| type-directed operations whose run-time behaviour reads a type argument (type case, class dictionaries chosen per instance, `Fail` families keyed by a type's label set) | the same reason |
| `Fail` payloads | open record payloads are refused at check time (language.md, "Failure payloads"); data payloads that mention a row, such as `Fail(List({ ...u }))`, are untested (assumed refused) |
| R010, the instantiation rule (E5, §1.5) | a rule on witness form; two valid splits can differ (proved nowhere; derived from the code) |
| holes versus chosen parts | a defaulted hole and a chosen `{}` lower alike but differ at check time (comparison `Ambiguous`; R010 counts a hole as ground; ADR 007 condition 1) |
| `CannotTell` (Unresolved.purs:74) | today's refusal of unforced splits; decision 3, not a split-dependent outcome |
| data types, effects, handlers, `print` as an effect, record update, record patterns, `if`/`match`, interpolation, text and bool literals, pipe, `let` | not modeled; believed harmless (they read written labels or no record at all) but unexamined; `show` stands for the print sites (all three are judged by one check) |
| the 10,000-key limit (`E_SPECIALIZATION`, Specialize/Keys.purs:150) | two splits may reach different numbers of keys (split-selection.md E4); a resource bound, outside (C) |
| several-tail lowering and Go (Task 8) | not implemented (Record.purs:39 placeholder); assumption A-go (§5) |

## 3. Observations

1. **Run time.** A big-step evaluator with fuel, `eval P θ n ρ t :
   Option V`, where values are `V ::= n | record [(l, v)] | clo ρ t |
   shown v`. `show_k(t)` evaluates `t` to `v` and yields `shown v`. The
   printed form is modeled as the value printed, which determines any
   rendering of it. `none` means stuck or out of fuel, so equal results
   at every fuel `n` mean equal results, stuck states and divergence.
   There is no output channel: `print`, exit status and the crash
   report are not modeled, and a discarded `shown v` is invisible. Only
   `project_k` reads the key.
2. **Compile acceptance (specialization).** Specializing `t` at local
   key `θ` *reaches* site `k` at `θ` when `t` contains `show_k` or
   `ann_k` under any lambda, applied or not. It reaches it at `θ'` when
   `t` contains a call `f_j(…)`, again under any lambda, and
   specializing `f`'s body at `loc f (wit j θ)` reaches it there. `t`
   is **accepted at `θ`** if every reached site's type is defined at
   its key and meets its requirement (`SiteOk`). An undefined type
   refuses, as Record.purs:58 does with E_INTERNAL.
3. **Compile acceptance (check time).** In the model, a declaration's
   own obligations at its local key (clause (i) of `Covers`) stand for
   the check-time judgments that see the instantiation: comparison and
   printability at caller-side sites (h1-h4). R010 and `CannotTell` are
   not modeled (§2).
4. **Diagnostics.** The compiler reports the first failing site in
   specialization order, and that order depends on the keys, hence on
   the witnesses. Under (C)'s hypotheses no site fails, so neither
   split produces a diagnostic. Outside them (M0, R010, the key limit)
   the diagnostics can differ, and nothing here constrains them.

## 4. The constraint model and the statements

**Coverage**, meaning the model counts every specialization-time
requirement: `Covers P` holds if for every declaration `f` and rigid key
`θ` with `Req f θ`:

- (i) every site `k` local to `f`'s body (not inside a callee) is
  `SiteOk` at `loc f θ`; and
- (ii) every call `g_k` in `f`'s body satisfies `Req g (wit k (loc f
  θ))`.

A split at a call is **valid in the model** when the caller's (i) holds
at its local key and the call's (ii) holds.

- Model M0 (today): `Req₀ f θ := Sat θ (D f)`, with no requirement
  atoms.
- Model M1 in general: `Req₁ f θ := Sat θ (D f) ∧` every local site is
  `SiteOk` at `loc f θ`. Under M1, (i) holds by definition, and
  `Covers` reduces to (ii) (`covers_req₁_iff`). The obligation then
  falls entirely on the witness search. Because `Req₁` depends on
  `loc`, it is the declared form only when a declaration's own sites do
  not mention its own splits; otherwise it is the inferred form of
  §1.4.

Statements, with their status after the proofs:

- **R, run-time irrelevance** (proved, `eval_split`). Let `P₁` and `P₂`
  be split variants and projection-free. Then for all keys `θ₁` and
  `θ₂`, fuel `n`, environments `ρ` of projection-free values, and
  projection-free `t`, `eval P₁ θ₁ n ρ t = eval P₂ θ₂ n ρ t`.
  *Standing:* a sanity lemma about this reference semantics. It holds
  by construction, because a projection-free evaluator never reads its
  key, and it needs no validity. Run-time irrelevance of *compiled*
  code rests on assumption A-go (§5), for which no evidence exists in
  this fragment: no several-tail Go exists, so no differential can run.
  Stream 6's C8-rt argument (relations at equal label sets, phantom
  positions, layout identity) lives inside A-go.
- **R-boundary, E3** (proved, `e3_differs`, with `e3_variant`,
  `sat_divide₁`, `sat_divide₂`, `param_image`). There are split
  variants whose witnesses both satisfy `divide`'s `D` and give `{
  ...u, ...v }` the same image, with one `project_k`, whose results
  differ: `{ f: … }` against `{}`.
- **C-local, coverage gives acceptance** (proved,
  `accepted_of_covers`). If `Covers P` and `Req f θ`, then `f`'s body
  is accepted at `loc f θ`. Also `req_of_covers`: every copy that
  specialization creates meets its callee's interface, so a call-edge
  ground check never fires (ground-check.md).
- **C, acceptance irrelevance** (proved, `accepted_split`). Let `P₁`
  and `P₂` be split variants, both satisfying `Covers`. Then at every
  declaration `f` and rigid key `θ` with `Req f θ`, both are accepted.
  This covers every seeded monomorphic declaration
  (Specialize/Seeds.purs:35-36), taking `θ` as the empty key.
  *Standing:* C is C-local applied twice. Its content is in the
  definitions: what "the model counts every requirement" must mean
  (`Covers`, with caller-side sites at local keys), and the fact that
  under it, specialization-time refusal cannot depend on the split.
  When `Req f θ` fails, C says nothing.
- **E2-formal** (proved, Examples.lean). With `ok = Pr`, take `P₁` (`u
  = { f }`, `v = { a }`) and `P₂` (`u = {}`, `v = { a, f }`), split
  variants of E2's `main`/`divide`. Both witnesses satisfy `divide`'s
  `D` (`e2_m0_valid`), and `{ ...u, ...v }` has the same image under
  both (`param_image`). The run-time results are equal (`e2_run`) and
  are `0` (`e2_result`). `P₂` is accepted (`e2_accepted₂`) and `P₁` is
  refused (`e2_refused`). Under M1, `Covers P₂` holds (`e2_covers₂`)
  and `Covers P₁` fails (`e2_not_covers₁`).
- **E2c-formal** (proved, Boundary.lean). The same with the site in
  `main`'s lambda, typed through `loc`: `e2c_refused`, `e2c_covers₂`,
  `e2c_not_covers₁`, `e2c_accepted₂`.
- **E2′** (derived, §1.4; not formalized). With interfaces inferred
  through the split, two splits of one generic call give callers
  different acceptance.
- **E5** (derived from the code, §1.5; not formalized). R010 can refuse
  one of two semantically valid witnesses.

## 5. Restrictions table

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| reference semantics untyped; Go lowering not modeled (A-go: accepted Go compiles and behaves as the reference) | for allowed constructs, Go copies read only written labels and whole-value layouts (split-selection.md §1, §2.1) | a construct whose Go lowering reads a split part's layout; layout identity of `{ ...u, ...v }` with the argument (Task 8); `without` and rest binders at several tails (Task 7) | assumed; no evidence in this fragment (no several-tail Go) |
| `show` returns the shown value instead of text | rendering is a function of the value | Go's printer is chosen by the site's static type | assumed (A-go); "the static type is equal under both splits for every reachable value" is Stream 6's step-3 argument (derived, not established) |
| witnesses are functions of the caller's key | covers every witness's *meaning* (§2) | R010 (E5) and holes versus chosen parts (h3, ADR 007): the *form* matters to check-time rules | real limit: form-sensitive rules are excluded, not covered |
| split variants agree on `ty`; the caller's split-dependent types go through `loc` | review finding S1: caller-side sites are typed through the instantiation | h1, h3; E2c | addressed by `loc` (proved examples); `ty` stays shared |
| `Req` is a semantic predicate on keys | any clause language denotes one | a clause language that cannot express what (i) needs (`Pr` of a restriction `r|T`, E2′) | real limit: (C) holds for the model; whether a syntactic checker can establish `Covers` is separate |
| interfaces fixed by the text (declared form) | needed: E2′ | E2′; `Req₁` depends on `loc` | (C) is stated only for this form |
| undefined site types refuse | Record.purs:58 refuses a repeated label | none (corrected from the first draft, S5) | modeled |
| every typed position is a site | lowering lowers every node's type (Body.purs:37-39, 55-57) | a typed position not written as `ann_k` | modeling convention: a program must annotate every typed position for "accepted" to mean the compiler's acceptance |
| sites are reached by an inductive relation (finite derivations) | the compiler copies finitely many keys (R010, ADR 007 §4.2) | polymorphic recursion with unbounded keys | harmless for (C), which quantifies over every reached site |
| requirement kinds as `ok k` per site | printability and comparability are the type checks that see split parts (Specialize.purs:95; Check/Comparable.purs) | Stream 5's inventory | generic in `ok`; the list of kinds is the recorder's completeness, not proved |
| key limit excluded | resource bound | E4: different splits, different key counts | excluded; a counterexample at the limit is expected, not constructed |
| other specialization-time refusals | internal id failures (Keys.purs:39, 62, 76, 95; Lower.purs; Handlers.purs:112) are invariant checks, not split-related; Record.purs:39 is a temporary placeholder | a split that triggers one | listed; not modeled |
| no data types, effects, handlers, `Fail` | the key-reading parts (`Fail` families) are refused at check time when open | an effect operation polymorphic in a record row (R009, future); `Fail(List({ ...u }))` | excluded; re-examine when R009 lands |
| acceptance per declaration and key | the compiler seeds every monomorphic declaration (Seeds.purs:35-36) | dead declarations | (C) quantifies over all declarations with `Req f θ` |

## 6. Adversarial review and corrections

An independent reviewer (a subagent, read-only, 2026-10-21) reviewed
d5d48a6 in two separate passes. It checked every file:line citation
and found them accurate, except one ambiguity (fixed: §1.2 now names
src/Features/Specialize/Printable.purs). It re-ran probes h1-h4 on
today's compiler, and this session re-ran them too (§1.1).

**False statements found: three.** All three come from one gap: split
variants shared `ty`, so the model could not express a caller-side type
fixed by the instantiation, nor check-time rules on the witness.

| Finding | First draft said | Correction |
|---|---|---|
| S1 (false) | "Two splits of one call give two split variants"; witnesses are "any function" and cover today's instantiation | caller-side sites are typed through the split (h1, h3). Added `loc` (per-declaration local key), sites evaluated at local keys, and E2c. §1 verdict extended to caller-side sites |
| S2 (false) | refusals before specialization "are not about splits"; under (C) refusal "can then only come from the signature check, which does not see the split choice" | deleted. Check-time printability and comparability see the instantiation; R010 judges witness form (E5, §1.5). Both are now in the observations and the excluded table |
| S3 (false) | comparison at open records "never split-dependent" | deleted. Comparison is a second requirement kind (h3/h4) and depends on hole versus chosen part |
| S4 (vacuity) | R presented as the run-time result | R is labeled a sanity lemma; compiled code rests on A-go, which has no evidence here |
| S5 (vacuity) | undefined site types are "not reached" | undefined types now refuse (`SiteOk`); every typed position is an `ann_k` site |
| S6 (scope) | C stated for the entry only | C quantifies over every declaration and key |
| S7 (near-tautology) | M1 defined only for E2 | `Req₁` in general; `covers_req₁_iff`; the standing of C stated plainly |
| S8 (unjustified) | "Counted, it makes `u = { f }` invalid … forced" | "forced at the ground key"; `Pr` is not a shared atom and breaks the presence abstraction; forced is not accepted today (`CannotTell`) |
| S9 (wording) | "equal … output"; "a ground printer reads only the value's type" | "output" dropped; the printer claim marked derived |
| S10 (checked) | E2′ | confirmed correct |
| C1-C10 (completeness) | missing refusals, check-time and form-sensitive rules, lambdas and references, Go acceptance, unmodeled operations, `Fail` data payloads, diagnostics order, table rows | all added to §2, §3 and §5. Function references (Body.purs:73-74) create keys as calls do; the model treats a reference as an eta-expanded call |

After the corrections, no statement in §4 is known to be false. The
proofs followed the corrected statements. The corrected version was not
sent back to the reviewer, because the run's instructions asked for one
review. It should be re-reviewed before the author relies on it.

## 7. Status and narrowing

Proved in Lean (research/composition-proofs/Composition/SplitIrrelevance/;
Lean 4.35; `lake build` clean, no warnings; no `sorry`, `admit`,
`native_decide` or declared axiom; `#print axioms` gives `propext`,
`Classical.choice` and `Quot.sound` for every theorem, the classical
one coming from the shared `compose`/`evalT`):

| Statement | Lean | File |
|---|---|---|
| calculus, evaluator, sites, `Covers`, `Req₀`, `Req₁`, `Printable` | definitions | Defs.lean |
| R | `eval_split` (with `eval_vpf`) | Run.lean |
| C-local; ground check silent | `accepted_of_covers`; `req_of_covers` | Acceptance.lean |
| C | `accepted_split` | Acceptance.lean |
| M1 reduces to (ii) | `covers_req₁_iff` | Acceptance.lean |
| E2-formal | `e2_variant`, `e2_m0_valid`, `param_image`, `e2_run`, `e2_result`, `e2_refused`, `e2_accepted₂`, `e2_covers₂`, `e2_not_covers₁` | Examples.lean |
| E2c-formal, E3 | `e2c_*`, `e3_variant`, `e3_differs` | Boundary.lean |

**Narrowing, stated explicitly.** The theorem is about this model, not
about the compiler:

- run time is about the reference evaluator, not about Go (A-go);
- acceptance covers specialization-time requirements and the
  check-time judgments that see the instantiation (as clause (i)). It
  does not cover R010, holes versus chosen parts, `CannotTell` or the
  key limit;
- interfaces must be declared (fixed by the text). Inferred interfaces
  are E2′;
- the fragment omits data types, effects, handlers, `Fail`, update,
  patterns and control flow.

What C establishes is conditional: *if* a recorder and checker
establish `Covers` (every requirement counted, caller-side included),
*then* specialization-time acceptance is split-independent. Whether the
source-to-constraint specification counts every requirement is Stream
5's question. This note does not answer it, beyond the inventory in §2
and §5.
