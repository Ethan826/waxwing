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

**Corrected in place on 2026-10-21** after a third, independent review
of streams 5 and 8 (research/division-campaign/reviews/streams-5-8-review.md,
dossier §18.23) and the author's decisions on it (§18.24). Each
correction is marked inline; the list is at the end. The earlier
version is in Git history, and the review is the audit trail.

**Kinds of evidence** (corrected 2026-10-21, dossier §18.23, §18.24).
Four kinds are kept apart, and each claim about acceptance or behaviour
says which it is:

- **check-time refusal**: the checker refuses the program before
  specialization;
- **specialization-time refusal**: the specializer refuses it after
  check has passed;
- **reference-model behaviour**: what λ-split's evaluator or its
  acceptance predicate does (Lean), not the compiler;
- **observed generated-code behaviour**: the output of Go the compiler
  emitted and ran. None exists here: no program with two tails passes
  specialization today (Task 8 placeholder), so no pair of splits was
  run end to end.

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

- the same holds for comparability at caller-side sites (check-time
  refusal: h3, and with two tails cmp-cf in the review);
- if a generic caller's interface is inferred from a split chosen
  first inside it, two splits give two interfaces, and a caller of it
  is accepted under one and refused under the other (E2′). This is a
  finding about that strategy only. It does not show that inference in
  general requires split-dependent interfaces (corrected 2026-10-21,
  dossier §18.23 F14; §18.24 decision 5);
- the polymorphic-recursion rule R010 is a different kind of
  dependence: a syntactic rule on the witness's *form*, not a missing
  requirement. Two splits valid in every semantic model can differ in
  admissibility under it, and in a recursive group admissibility, not
  validity, decides acceptance (E5; a check-time refusal). Validity is
  unchanged, and nothing differs at run time, so this is not (a) in
  §18.17's sense. The remedies are to choose among witnesses that are
  both valid and admissible, or to relax R010 with a replacement
  termination argument (corrected 2026-10-21, dossier §18.23 F13;
  §18.22 item 3).

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

   | Probe | Fixed by | Result | Kind of evidence (corrected 2026-10-21, dossier §18.23) |
   |---|---|---|---|
   | a.wxw: `probe(fn(y) => 0)`; `probe` holds a never-applied `fn(x: { ...r }) => show(x)` | nothing (hole, defaulted to `{}`) | exit 0 | accepted by the run |
   | b.wxw: `probe(fn(y: { f: (Int) -> Int }) => 0)` | the argument | E_TYPE `Expected a printable value, found { f: Int -> Int }` | specialization-time refusal (the site is in the callee at its rigid row, item 2; the phase is read from the code, the run reported the message) |
   | g.wxw: `peek({ f: fn(n: Int) => n })`, where `peek(x: { ...r })` holds the same lambda | the argument | the same E_TYPE | specialization-time refusal (as b.wxw) |
   | h1.wxw: `probe(k: ({ ...r }) -> Text, w: { ...r })`; `main` passes `fn(p) => show(p)` and `{ f: fn }` | the instantiation, in the caller | the same E_TYPE, at `p` in `main` | check-time refusal (review §0) |
   | h2.wxw: h1 with `{ a: 1 }` | the instantiation | exit 0 | accepted by the run |
   | h3.wxw: h1 with `-> Bool` and `fn(p) => p == p` | the instantiation, in the caller | E_TYPE `Type { f: Int -> Int } is not comparable` | check-time refusal |
   | h4.wxw: h3 with `{ a: 1 }` | the instantiation | exit 0 | accepted by the run |

   "Accepted by the run" means `waxwing emit` wrote Go
   (split-selection.md §7); no Go was built or run. h1-h4 are the
   reviewer's probes (§6), re-run here. In a.wxw the defaulted row
   satisfies a constraint that nobody recorded. In the others, the
   determined row violates it. E2 is the several-tail version of g.wxw,
   and E2c is the several-tail version of h1. In both, the "default" or
   "determination" is a split.

   The third review ran the several-tail versions at the caller
   (corrected 2026-10-21, dossier §18.23). Two splits of one `divide`
   call, both meeting its clauses, written by annotating the caller's
   lambda: with `u = { c }` the caller's `p == p` (cmp-c) or `show(p)`
   (pr-c) passes check and stops at the Task 8 placeholder; with
   `u = { c, f }` (cmp-cf, pr-cf) it is refused at check (check-time
   refusal: `Type { c: Int, f: Int -> Int } is not comparable`,
   `Expected a printable value, found { c: Int, f: Int -> Int }`).

### 1.2 Argument from the constraint model

Write `Pr(τ)` for "the ground type `τ` holds no arrow or handler at any
depth" (src/Features/Specialize/Printable.purs:34-35,
`groundPrintable`). A `show` site at `{ ...u }` in `divide` imposes
`Pr(θ(u))` at every key `θ` of `divide`. That is a constraint on
`divide`'s own rigid row, with the same standing as a declared clause:
callers must meet it at the instantiated key, or specialization
refuses.

- In a model **with** `Pr` counted (model M1, §4: `divide`'s
  requirement interface is `D ∧ Pr(u)`; Examples.lean writes this
  interface by hand as an instance of M1, corrected 2026-10-21, dossier
  §18.23 F15), E2's witness `u = { f }`
  violates `divide`'s interface at `main`'s key, so it is not a valid
  split. The only split satisfying both `u disjoint s` (`s = { a }`)
  and `Pr(u)` is `u = {}`, `v = { a, f }`. Disjointness keeps `a` out
  of `u` and printability keeps `f` out, so the split is forced *at
  this ground key*. (Proved for the model: `e2_not_covers₁`, the
  `f`-in-`u` split fails, and `e2_covers₂`, the other passes.
  Uniqueness over all splits of `{ a, f }` is derived above, not
  proved.) "Forced" here does not mean accepted today: a forced
  split is still refused by `CannotTell` (c.wxw, the O4 limitation,
  split-selection.md §3.1).
- In a model **without** `Pr` (model M0, today's), the requirement
  interface is `D` only. Both splits are "valid", and acceptance
  differs (`e2_m0_valid`, `e2_refused`, `e2_accepted₂`: reference-model
  behaviour; in the compiler the refusal is at specialization time).
  That is the incompleteness of (b).

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
then on the caller's flexible variable, not on `divide`'s rigid row,
and the compiler judges it at check time (check-time refusal: h1;
pr-cf with two tails, §1.1). A complete model needs `Ok` atoms on
flexible variables, counted in the caller's own obligations at its
local key (clause (i) of `Covers`, §4). The author's decision: such a
caller-side requirement is recorded as a check-time constraint on the
instantiated type, flexible variables included, and does not become a
declaration on the callee (corrected 2026-10-21, §18.24 decision 2).
Proved for the model (reference-model behaviour): `e2c_refused`,
`e2c_covers₂`, `e2c_not_covers₁`, `e2c_accepted₂`.

Comparison behaves the same way at check time: h3/h4 (refused with a
function field, accepted with `{ a: 1 }`), and with two tails cmp-c and
cmp-cf (§1.1). If the part is left as a hole instead, ADR 007 makes the
comparison `Ambiguous`. So acceptance also depends on whether a part is
chosen or defaulted (row "witness form" in §5). With several tails and
the split left open, though, `CannotTell` refuses first (cmp-open in the
review), so the `Ambiguous` route is not what the user sees there
(corrected 2026-10-21, dossier §18.23; review §3.2). Comparability is a second
requirement kind. The model is generic in the requirement (`Prog.ok`,
per site).

**Where the written split sits** (corrected 2026-10-21, dossier §18.23
F12). Today an unforced split passes check only when the caller writes
it, by annotating a lambda parameter of type `({ ...u }) -> …`, as the
`CannotTell` diagnostic asks. Two splits are then two texts that differ
in that annotation, and the annotation is itself a typed site: cmp-cf's
refusal is at it. Such an annotation counts as a written split under
decision 3 when it actually determines the split; it must still satisfy
every caller and callee requirement (§18.24 decision 1).

### 1.4 Interfaces inferred from a split chosen first (E2′)

(Restricted to this strategy: corrected 2026-10-21, dossier §18.23
F14; §18.24 decision 5. Inference stays a goal, §18.22 item 1.)

Counting `Pr` can take several forms. Two are compared here.

- **Declared** (fixed by the text). Every function's requirement
  interface is fixed independently of any split inside it, for
  instance by a C001-style `where` clause, or by a rule that refuses
  `show` at a rigid row without one. A generic caller is then checked
  against the callee's fixed interface at every key, so the same
  interface decides whether each of two splits is valid. §4's (C) is
  proved for interfaces that both split variants share, and this form
  gives that.
- **Inferred from a split chosen first.** Here the interface of a
  generic caller is whatever its body needs under the split already
  chosen inside it: today's template semantics, lifted to interfaces.
  Two splits inside one function then give two interfaces, and callers
  of that function are accepted under one and refused under the other.

  Example (derived; the reviewer checked it, §6 S10): `route` (dossier
  §17.3) calls `divide` with the `show` site above, and `s disjoint t`
  holds. Under split A (free labels to `v`), `u = r ∩ t ∖ s` and
  `route` needs `Pr(r ∩ t ∖ s)`. Under split B (free labels to `u`),
  `u = r ∖ s` and it needs `Pr(r ∖ s)`. A caller passing `x = { f: fn
  }` with `f` outside `s` and `t` is accepted under A and refused under
  B. Under this strategy each split is valid in its own inferred
  interface, and acceptance of the caller differs between them.

  This shows that choosing a split first and then inferring an
  interface from it is unstable. It does not show that inference must
  make acceptance depend on the split. In this example a weakest
  interface exists: per region, either "printable" or "no
  requirement". Computing it together with the split would be a
  principal-interface computation, not an arbitrary split selection.
  With two incomparable requirement kinds, say printability and a
  future `Eq`, whether such an interface exists in general is open.
  None of this is proved.

  In the Lean model the split-first case falls outside (C)'s
  hypothesis by construction: `Req₁` (M1 in general, Defs.lean) depends
  on `loc`, which varies with the split, so interfaces inferred that
  way are not shared by the split variants.

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
semantically valid splits can differ in admissibility, and so in
acceptance (a check-time refusal; derived from the code, not run). It
leaves this theorem's scope (§2, excluded). Validity and admissibility
stay separate properties (§18.22 item 3): witness selection must choose
among witnesses that are both valid and admissible, and R010 stays
unless it is relaxed to admit restrictions (split-selection.md §2.3)
with a replacement termination argument and its own approval
(corrected 2026-10-21, dossier §18.23 F13).

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
| `{}` | the empty record (no source literal, but `{ ...rest }` with an empty rest denotes it, language.md:933) |
| `{ l: t, ...t' }` | extension, defined iff `t'` lacks `l` |
| `{ ...t, ...t' }` | composition, defined iff the label sets are disjoint (R005B's multi-spread: intended semantics, one spread today) |
| `t.l` | field access |
| `t without l` | the rest after removing `l` (rest binder `{ l: _, ...rest }`) |
| `fn(t)` | lambda |
| `t(t')` | application |
| `f_k(t)` | call of declaration `f`; site `k` names the call's **witness** |
| `show_k(t)` | a `show`-like class operation; site `k` names its argument type |
| `ann_k(t)` | any other typed position (a lambda parameter's annotation, a comparison operand): `t` at run time, but its type must be defined and meet site `k`'s requirement. For `==` it models only the operand's type; the Boolean result is not modelled (corrected 2026-10-21, dossier §18.23 F5) |
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
are *encoded* as two split variants. That is a convention, not a
derived fact: nothing ties `loc` to `wit` (E2c sets `main`'s row 4 to
the witness's `u` by hand, Boundary.lean:25-26). `Req` is the same text
in both; this is the declared form of §1.4.

What the convention hides (corrected 2026-10-21, dossier §18.23 F12):
today an unforced split reaches past `CannotTell` only when the caller
writes it as an annotation on a lambda parameter (§1.3). The two splits
are then two source texts, and the annotation is itself a typed site,
where a caller-side requirement fails (cmp-cf). "Same bodies and `ty`"
holds only because the model encodes the annotation as `wit` and `loc`,
not as text.

**Allowed operations**: every row of the table except `project_k`. A
program is *projection-free* if no body contains `project_k`.

**Excluded, with reasons:**

| Excluded | Why |
|---|---|
| row-variable projection (`project_k`, E3), any primitive or row-polymorphic foreign function returning `{ ...p }` from `{ ...p, ...q }` | its result is the split, so R fails (E3, proved: `e3_differs`) |
| type-directed operations whose run-time behaviour reads a type argument (type case, class dictionaries chosen per instance, `Fail` families keyed by a type's label set) | the same reason |
| `Fail` payloads | open record payloads are refused at check time (language.md, "Failure payloads"); data payloads that mention a row, such as `Fail(List({ ...u }))`, are untested (assumed refused) |
| R010, the instantiation rule (E5, §1.5) | a rule on witness form; two valid splits can differ in admissibility, and so in acceptance; validity is unchanged (proved nowhere; derived from the code; corrected 2026-10-21, dossier §18.23 F13) |
| the caller's and callee's body equations (`B`: access, literals, annotations as equations) | λ-split has no equations; `SiteOk` tests only definedness and `ok`. A split that meets `D` can still be refused at check time by the caller's own equation (eq-c passes check, eq-d is refused: `Expected { c: Int, ..._ } -> Bool, found { d: Int } -> Bool`). "Valid in the model" presupposes that the split solves `B`; `Covers` does not establish it (corrected 2026-10-21, dossier §18.23 F6; §18.24 decision 3) |
| `==`'s run-time result | no equality operator in λ-split; R does not cover comparison output (corrected 2026-10-21, dossier §18.23 F5) |
| holes versus chosen parts | a defaulted hole and a chosen `{}` lower alike but differ at check time (comparison `Ambiguous`; R010 counts a hole as ground; ADR 007 condition 1) |
| `CannotTell` (Unresolved.purs:74) | today's refusal of splits the checker cannot determine, forced ones included (c.wxw, O4); decision 3 and O4, not a split-dependent outcome |
| data types, effects, handlers, `print` as an effect, record update, record patterns, `if`/`match`, interpolation, text and bool literals, pipe, `let` | not modeled; believed harmless (they read written labels or no record at all) but unexamined; `show` stands for the print sites (all three are judged by one check) |
| the 10,000-key limit (`E_SPECIALIZATION`, Specialize/Keys.purs:150) | two splits may reach different numbers of keys (split-selection.md E4); a resource bound, outside (C) |
| the type-depth limit (the unifier's `TooDeep`, more than 1,000 levels; Unify.purs:105; Stream 5's C4) | a check-time refusal whose trigger depends on the size of the solution, so in principle on the split; a resource bound, outside (C) (corrected 2026-10-21, dossier §18.23 F11) |
| several-tail lowering and Go (Task 8) | not implemented (Record.purs:39 placeholder); assumption A-go (§5) |

## 3. Observations

1. **Run time.** A big-step evaluator with fuel, `eval P θ n ρ t :
   Option V`, where values are `V ::= n | record [(l, v)] | clo ρ t |
   shown v`. `show_k(t)` evaluates `t` to `v` and yields `shown v`. The
   printed form is modeled as the value printed, which determines any
   rendering of it. `none` means stuck or out of fuel, so equal results
   at every fuel `n` mean equal results, stuck states and divergence.
   There is no output channel: `print`, exit status and the crash
   report are not modeled, and a discarded `shown v` is invisible.
   There is no equality operator, so `==`'s result is not modelled
   either (corrected 2026-10-21, dossier §18.23 F5). Only `project_k`
   reads the key.
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
   the check-time *requirement* judgments that see the instantiation:
   comparison and printability at caller-side sites (h1-h4, cmp-cf,
   pr-cf). They do not stand for the caller's own equations, which are
   also check-time judgments that see the instantiation (eq-d, §2): the
   model has none, and they are presupposed (corrected 2026-10-21,
   dossier §18.23 F6). R010, `CannotTell` and the type-depth limit are
   not modeled (§2).
4. **Diagnostics.** The compiler reports the first failing site in
   specialization order, and that order depends on the keys, hence on
   the witnesses. Under (C)'s hypotheses no site fails, so neither
   split produces a diagnostic. Outside them (M0, R010, the key limit)
   the diagnostics can differ, and nothing here constrains them.

## 4. The constraint model and the statements

**Coverage**, meaning the model counts every requirement *site* it
has (specialization-time sites, and caller-side sites that check time
judges on the instantiated type): `Covers P` holds if for every
declaration `f` and rigid key `θ` with `Req f θ`:

- (i) every site `k` local to `f`'s body (not inside a callee) is
  `SiteOk` at `loc f θ`; and
- (ii) every call `g_k` in `f`'s body satisfies `Req g (wit k (loc f
  θ))`.

`Covers` says nothing about body equations (`B`): the model has none
(corrected 2026-10-21, dossier §18.23 F6; §18.24 decision 3).

A split at a call is **valid in the model** when the caller's (i) holds
at its local key and the call's (ii) holds. This presupposes that the
split solves the caller's and the callee's body equations `B`; `Covers`
does not establish that, and a split meeting (i) and (ii) can still be
refused at check time by the caller's own equation (eq-d, §2)
(corrected 2026-10-21, dossier §18.23 F6).

- Model M0 (today): `Req₀ f θ := Sat θ (D f)`, with no requirement
  atoms.
- Model M1 in general: `Req₁ f θ := Sat θ (D f) ∧` every local site is
  `SiteOk` at `loc f θ`. Under M1, (i) holds by definition, and
  `Covers` reduces to (ii) (`covers_req₁_iff`). The obligation then
  falls entirely on the witness search. Because `Req₁` depends on
  `loc`, it is the declared form only when a declaration's own sites do
  not mention its own splits; otherwise it is the form inferred from a
  split chosen first, §1.4.

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
  positions, layout identity) lives inside A-go. R is reference-model
  behaviour only. It does not cover `==`'s result, which λ-split does
  not model (corrected 2026-10-21, dossier §18.23 F5).
- **R-boundary, E3** (proved, `e3_differs`, with `e3_variant`,
  `sat_divide₁`, `sat_divide₂`, `param_image`). There are split
  variants whose witnesses both satisfy `divide`'s `D` and give `{
  ...u, ...v }` the same image, with one `project_k`, whose results
  differ: `{ f: … }` against `{}`.
- **C-local, coverage gives acceptance** (proved,
  `accepted_of_covers`). If `Covers P` and `Req f θ`, then `f`'s body
  is accepted at `loc f θ`.
- **Ground check silent** (proved, `req_of_covers`). Under `Covers`,
  every copy that specialization creates, starting from any declaration
  and key whose interface holds (`Req f θ`), meets its callee's
  interface. Copies reached from a root whose own interface fails are
  not covered; under `Req₁`, E2c's split-1 `main` is such a root
  (corrected 2026-10-21, dossier §18.23 F7). When the interface
  includes the callee's clauses (`Req₀`, `Req₁`), a call-edge ground
  check of `D` never fires there (ground-check.md). The copy-placement
  check of `B` is not covered: `B` is not in this model.
- **C, acceptance irrelevance** (proved, `accepted_split`). Let `P₁`
  and `P₂` be split variants, both satisfying `Covers`. Then at every
  declaration `f` and rigid key `θ` with `Req f θ`, both are accepted.
  This covers every seeded monomorphic declaration
  (Specialize/Seeds.purs:35-36), at any key, *provided* `Req f θ`
  holds there (under `Req₁`, E2c's split-1 `main` fails it, and C is
  silent).
  *Standing:* C is C-local applied twice. The proof uses `SplitVariant`
  only to transport `Req`: C holds for any two programs that share
  `Req` and both satisfy `Covers`, and uses nothing else about splits.
  Its content is in the definitions: what "the model counts every
  requirement site" must mean (`Covers`, with caller-side sites at
  local keys), and the fact that under it, *modeled* refusal at
  requirement sites cannot depend on the split (reference-model
  behaviour). The key limit, the type-depth limit, R010 and the
  several-tail placeholder (Record.purs:39) remain outside. When
  `Req f θ` fails, C says nothing.
  *Narrowed* (corrected 2026-10-21, dossier §18.23 F6; §18.24
  decision 3): C is about requirement sites and call interfaces only.
  The caller's and callee's body equations (`B`) are presupposed, not
  established by `Covers`. A split that both variants' `Covers` admit
  can still be refused at check time by the caller's own equation
  (eq-d, §2). C does not claim acceptance irrelevance for the complete
  recorder; C+ below is the proposed statement for that.
- **C+, acceptance irrelevance with body equations** (*proposed*,
  unproved, not formalized; corrected 2026-10-21, §18.24 decision 3).
  Extend a program with per-declaration body equations `B f`, a
  `Problem` over `f`'s local key, and let split variants also agree on
  `B`. Let `Covers⁺ P` be `Covers P` together with: for every `f` and
  `θ` with `Req f θ`, `Sat (loc f θ) (B f)`. Let `Accepted⁺ P θ t` be
  `Accepted P θ t` together with: every copy of a declaration `g` that
  specializing `t` at `θ` reaches, at local key `θ'`, has
  `Sat θ' (B g)`. Proposed statement: if `P₁` and `P₂` are split
  variants and both satisfy `Covers⁺`, then at every declaration `f` and
  rigid key `θ` with `Req f θ`, both are `Accepted⁺` at `loc f θ`.
  Status: a statement for review, not a theorem. Whether
  `Sat (loc f θ) (B f)` faithfully stands for check-time success of the
  caller's equations, and how `B` relates to Stream 5's translation
  (review M5), are part of what review must settle. It would also cover
  ground-check.md's copy-placement check of `B`. The prose claim for C
  is not enlarged until a proof of C+ exists.
- **E2-formal** (proved, Examples.lean). With `ok = Pr`, take `P₁` (`u
  = { f }`, `v = { a }`) and `P₂` (`u = {}`, `v = { a, f }`), split
  variants of E2's `main`/`divide`. Both witnesses satisfy `divide`'s
  `D` (`e2_m0_valid`), and `{ ...u, ...v }` has the same image under
  both (`param_image`). The run-time results are equal (`e2_run`) and
  are `0` (`e2_result`). `P₂` is accepted (`e2_accepted₂`) and `P₁` is
  refused (`e2_refused`). With `divide`'s interface `D ∧ Pr(u)`,
  `Covers P₂` holds (`e2_covers₂`) and `Covers P₁` fails
  (`e2_not_covers₁`). That interface is a hand-written instance of M1:
  `e2`'s `Req` is written out in Examples.lean, equal to `Req₁ (e2 w)`
  by inspection, and no lemma states the equality (corrected
  2026-10-21, dossier §18.23 F15). All of this is reference-model
  behaviour.
- **E2c-formal** (proved, Boundary.lean). The same with the site in
  `main`'s lambda, typed through `loc`: `e2c_refused`, `e2c_covers₂`,
  `e2c_not_covers₁`, `e2c_accepted₂`.
- **E2′** (derived, §1.4; not formalized). With a generic caller's
  interface inferred from a split chosen first inside it, two splits
  of one generic call give that caller's callers different acceptance.
  Restricted to that strategy: it does not establish that inference
  generally requires split-dependent interfaces (corrected 2026-10-21,
  dossier §18.23 F14; §18.24 decision 5).
- **E5** (derived from the code, §1.5; not formalized). R010 can refuse
  one of two semantically valid witnesses at check time: a difference
  in admissibility, not in validity (corrected 2026-10-21, dossier
  §18.23 F13).

## 5. Restrictions table

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| reference semantics untyped; Go lowering not modeled (A-go: accepted Go compiles and behaves as the reference) | for allowed constructs, Go copies read only written labels and whole-value layouts (split-selection.md §1, §2.1) | a construct whose Go lowering reads a split part's layout; layout identity of `{ ...u, ...v }` with the argument (Task 8); `without` and rest binders at several tails (Task 7) | assumed; no evidence in this fragment (no several-tail Go) |
| `show` returns the shown value instead of text | rendering is a function of the value | Go's printer is chosen by the site's static type | assumed (A-go); "the static type is equal under both splits for every reachable value" is Stream 6's step-3 argument (derived, not established) |
| witnesses are functions of the caller's key | covers every witness's *meaning* (§2) | R010 (E5) and holes versus chosen parts (h3, ADR 007): the *form* matters to check-time rules | real limit: form-sensitive rules are excluded, not covered |
| split variants agree on `ty`; the caller's split-dependent types go through `loc` | review finding S1: caller-side sites are typed through the instantiation | h1, h3; E2c | addressed by `loc` (proved examples); `ty` stays shared |
| `Req` is a semantic predicate on keys | any clause language denotes one | a clause language that cannot express what (i) needs (`Pr` of a restriction `r|T`, E2′) | real limit: (C) holds for the model; whether a syntactic checker can establish `Covers` is separate |
| interfaces shared by both split variants (the declared form gives this) | C is proved for shared interfaces; interfaces inferred from a split chosen first are not shared (E2′) | E2′; `Req₁` depends on `loc`; a principal inference that computes the requirement with the split is not examined | (C) is stated only for shared interfaces; inference stays a goal (§18.22 item 1) (corrected 2026-10-21, dossier §18.23 F14) |
| no body equations (`B`) | the model's subject is requirement sites | eq-c/eq-d: a caller's equation refuses one of two splits that meet `D` | real limit: `B` presupposed, not established by `Covers`; C+ proposed, unproved (§4) (corrected 2026-10-21, dossier §18.23 F6) |
| no equality operator | `ann_k` stands for a comparison operand's type | `==`'s result under two splits | not modelled; R does not cover it (corrected 2026-10-21, dossier §18.23 F5) |
| type-depth limit excluded | resource bound | a solution over 1,000 levels deep under one split only | excluded, like the key limit (corrected 2026-10-21, dossier §18.23 F11) |
| undefined site types refuse | Record.purs:58 refuses a repeated label | none (corrected from the first draft, S5) | modeled |
| every typed position is a site | lowering lowers every node's type (Body.purs:37-39, 55-57) | a typed position not written as `ann_k` | modeling convention: a program must annotate every typed position for "accepted" to mean the compiler's acceptance. The E2 examples do not annotate `divide`'s parameter types; `param_image` proves their definedness separately |
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
| C1-C10 (completeness) | missing refusals, check-time and form-sensitive rules, lambdas and references, Go acceptance, unmodeled operations, `Fail` data payloads, diagnostics order, table rows | all added to §2, §3 and §5. Function references (Body.purs:83-84) create keys as calls do; the model treats a reference as an eta-expanded call |

The proofs followed the corrected statements.

**Second review** (the same reviewer, of a9cf06a: the corrected text,
the Lean definitions and statements, and ground-check.md). It found no
false statement in §4 and confirmed that the Lean definitions and
theorems match §2-§4. Its remaining findings, all fixed in the next
commit:

| Finding | Was | Fix |
|---|---|---|
| G1 (false, ground-check.md §3) | a lowering defect "gives malformed Go (a duplicated field)" | Record.purs:58 already refuses a repeated label with E_INTERNAL; only "a silently wrong layout" kept |
| G2 (unjustified) | "C-local shows the call-edge check holds at every reached key" | the lemma is `req_of_covers`; it covers call edges only when interfaces include `D` (`Req₀`, `Req₁`); the copy-placement check of `B` is not covered |
| W1, W8 (citations) | function references at Body.purs:73-74; "language.md has no `{}` expression"; ground-check.md's calls row citing Body.purs:84 | Body.purs:83-84 (references) and :69 (calls); no empty-record literal, but `{ ...rest }` with an empty rest denotes `{}` (language.md:933) |
| W2 (overclaim) | the split "forced" marked proved | only that one split fails and the other passes is proved; uniqueness derived |
| W3 | `CannotTell` refuses "unforced splits" | it refuses splits the checker cannot determine, forced ones included |
| W4, W5 | C "covers every seeded declaration … the empty key"; refusal "cannot depend on the split" | only where `Req f θ` holds, at any key; *modeled* refusal |
| V1 (vacuity) | C's dependence on splits | stated: the proof uses only the shared `Req` |
| V2 | split variants "give" the caller-side typing | an encoding convention: nothing ties `loc` to `wit` |
| W6 | the examples break "every typed position is a site" | stated: `divide`'s parameter types are not `ann` sites; `param_image` proves their definedness separately |
| modeling note | `app` runs a closure at the applying key | comment added in Defs.lean; only the excluded `project` reads the key |

The fixes after the second review were reviewed by a third,
independent reviewer (dossier §18.23, 2026-10-21). It confirmed them
except F7 and F10 (G1's "silently" kept too much); its corrections are
applied in place and listed under Corrections at the end.

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

- run time is about the reference evaluator, not about Go (A-go), and
  not about `==`'s result, which is not modelled (corrected 2026-10-21,
  dossier §18.23 F5);
- acceptance covers requirement sites: specialization-time
  requirements and the check-time requirement judgments that see the
  instantiation (as clause (i)). The caller's and callee's body
  equations are check-time judgments that see the instantiation too,
  and they are presupposed, not covered (corrected 2026-10-21, dossier
  §18.23 F6; §18.24 decision 3; C+ in §4 is the proposed extension,
  unproved). It does not cover R010, holes versus chosen parts,
  `CannotTell`, the key limit or the type-depth limit (corrected
  2026-10-21, dossier §18.23 F11);
- C is proved for interfaces both split variants share; the declared
  form gives that. Interfaces inferred from a split chosen first are
  E2′; other inference strategies are not examined (corrected
  2026-10-21, dossier §18.23 F14; §18.24 decision 5);
- the fragment omits data types, effects, handlers, `Fail`, update,
  patterns and control flow.

What C establishes is conditional: *if* a recorder and checker
establish `Covers` (every requirement site counted, caller-side
included), and the split solves the body equations, *then* modelled
acceptance at requirement sites is split-independent (reference-model
behaviour). Whether the source-to-constraint specification counts
every requirement is Stream 5's question. This note does not answer
it, beyond the inventory in §2 and §5.

## 8. Coordination with Stream 5

Stream 5's translation.md (its worktree, read 2026-10-21, not yet
integrated) inventories the checks independently. It agrees on
printability (its S1, the verdict (b), §3.2) and on R010 (its C1, a
side condition on witnesses). Two points differed. The independent
review (dossier §18.23) resolved both in this note's favour, and
translation.md is corrected accordingly:

- **Comparison.** Its row C2 said comparison "never separates two
  splits", because the check is conservative at the generic type. That
  holds for comparisons *in the generic function*. It fails for a
  comparison in the *caller*, at a type the instantiation fixes (h3/h4
  above: refused with `{ f: fn }`, accepted with `{ a: 1 }`). With
  several tails the instantiation of a split part is the split (E2c's
  shape with `==`), and the review ran it: cmp-c passes check, cmp-cf
  is refused at check (check-time refusal; §1.1). This is a missing
  requirement (b), not an observable difference between valid splits.
- **"The same construct also shows (a)"** (its §3.2: once `peek` is
  applied, the output depends on the split; withdrawn there by the
  author, §18.24 decision 4). The earlier version of this item argued
  by a two-way case split on where a value of type `{ ...u }` comes
  from (a parameter of that type, or a projection). That enumeration
  was incomplete: `{ ...u }` can also come from a callback's result or
  from a field or extension of a parameter, and well-typed expressions
  of that type exist that fix nothing (a crashing callback, a divergent
  function) (corrected 2026-10-21, dossier §18.23 F4). The conclusion
  rests instead on R: `eval_split` holds for every projection-free
  term, whatever its type and wherever its values come from, so in the
  reference model no projection-free program makes the two splits'
  results differ (reference-model behaviour). The bottom-typed
  expressions crash or diverge, so `show` never receives a value; the
  model's `none` covers both (it has no `crash`), and in the compiler
  the crash report does not depend on the split (derived). Compiled
  code rests on A-go; no generated code was observed.


## Corrections

Corrected in place on 2026-10-21 after the third review
(research/division-campaign/reviews/streams-5-8-review.md, dossier
§18.23), following the author's decisions (§18.24). No theorem
statement or proof changed; Lean comments were corrected to match.

- **Kinds of evidence** (head, §1.1 table, §4): check-time refusal,
  specialization-time refusal, reference-model behaviour and observed
  generated-code behaviour are named and labelled; there is none of
  the last kind.
- **F4** (§8): the two-way case split on where `{ ...u }` comes from is
  replaced by a citation of R, with a note on bottom-typed expressions.
- **F5** (§2, §3.1, §4 R, §5, §7): `==`'s result is not modelled; R does
  not cover comparison output.
- **F6, decision 3** (§2, §3.3, §4, §5, §7): C narrowed to requirement
  sites and call interfaces; body equations `B` are presupposed, not
  established by `Covers` (eq-c/eq-d). C+ added as a clearly labelled
  *proposed* statement covering the equations, unproved.
- **F7** (§4): "ground check silent" now states the premise that the
  starting declaration's interface holds.
- **F11** (§2, §3.3, §5, §7): the type-depth limit added to the
  exclusions, beside the key limit; the review's other missing items
  (body equations, `==`'s result) added too.
- **F12** (§1.3, §2): the written split is a caller-side annotation,
  itself a typed site where caller-side requirements fail; decision 1
  recorded.
- **F13** (§1, §1.5, §2, §4 E5): R010 decides admissibility, not
  validity; E5 is not (a).
- **F14, decision 5** (§1, §1.4, §4 E2′, §5, §7): E2′ restricted to
  inferring an interface from a split chosen first; principal
  inference left open.
- **F15** (§1.2, §4 E2-formal): `e2`'s interface is a hand-written
  instance of M1.
- **Decision 2** (§1.3): caller-side requirements are check-time
  constraints on the instantiated type, not declarations on the callee.
- §1.1 gains the review's several-tail probes (cmp-c, cmp-cf, pr-c,
  pr-cf); §6 notes the third review; §8 records the resolution.
