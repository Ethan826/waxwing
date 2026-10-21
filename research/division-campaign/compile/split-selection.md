# Compilation and split selection (Stream 6)

Date: 2026-10-21. Base: b5647cc (dossier §18.13, the parallel campaign).
Scope: design analysis. No compiler source was changed. The only code is
split-model.mjs beside this file, an independent research prototype.

Status labels follow the dossier: **proved** (in a cited source or in
this repository's Lean), **derived** (argued here, not mechanized),
**checked** (executable evidence on finite cases), **assumed** (taken
from documentation or a design plan without independent check).

## Summary

- Under today's whole-program specialization, no split ever has to be
  computed at run time. Each rigid row is a concrete label set under a
  key, so a term witness such as `r|(dom r ∖ dom s)` is evaluated once
  per key at compile time. A forced split like `route`'s has zero
  run-time cost: the record passed is the same Go struct. (Derived from
  the code and ADRs 007 and 013.)
- Lowering needs the witness itself in each call's instantiation, as a
  rule per membership vector (or set terms), not a certificate. It
  should also re-check the callee's constraints on the ground instance at
  each key, an O(labels) translation-validation guard. (Proposal.)
- Observability: within the current construct set, a run cannot tell
  permitted splits apart (derived, by a relational argument, §3.3). The
  choice can be seen at compile time, though. The post-specialization
  printability check (BACKLOG E017) accepts the program under one split
  and rejects it under the other (example E2, §3.4). A row-variable
  projection, if one were added, would expose the choice at run time
  (E3).
- So the semantics should fix a canonical choice. Proposed: for each
  region, take the lexicographically least flexible membership vector,
  with flexible rows in declaration order and absent before present. It
  agrees with the existing `{}` default, gives uniform term witnesses,
  and on the presence fragment equals the per-key ground choice (§3.5).
  Checked on five problems by split-model.mjs.
- For the author: `route` has two uniform presence witnesses (checked).
  Its split is not forced, so policy decision 3 (dossier §4) refuses
  `route` even once division is decidable, unless C8 is established for
  a fragment or the policy is narrowed (§6, question 1).

## 1. How records are represented and lowered now

Read from src/ and docs/adr/007, 013:

- **Monomorphization, no dictionaries, no maps.** Specialization copies
  each function once per key `(declaration, ground arguments)`
  (Features.Specialize, ADR 007). A record-row variable is a key slot
  (ADR 013, "record rows enter keys, effect rows stay erased"). Under a
  key, each rigid row is replaced by the key's argument, a closed
  layout. (Derived from the code: Specialize/Lower `lowerType`, `TVar
  (Rigid i)` → the key's i-th argument.)
- **Layouts.** A closed record type is hash-consed into an
  `IR.LayoutId` keyed by its fields sorted by label, each field's type
  already a number (Specialize/Layouts `internLayout`). Two orderings
  share one layout, and so one Go struct `waxwingRec<N>`. A layout that
  is only a key argument gets no struct (Format/Go/RecordLayouts
  `emittedLayouts`).
- **Operations** are static field selections and struct constructions:
  access `(r).f_label`, update and extension build the result layout
  field by field, reading each field from the item that holds it
  (Format/Go/Record, Extension). Removal and rest binders copy the kept
  fields. No operation inspects a label set at run time.
- **What specialization knows at a call site.** The checked IR records
  each call's instantiation, `Checked.Instantiation = Array (Ty Open)`,
  as type expressions over the caller's rigid variables and holes.
  `Specialize/Values.instantiated` lowers those expressions at the
  caller's key. So by the time Go is emitted, every row variable of
  every instantiation is ground. (Derived from the code.) The
  row-merge plan states this as M14, "after specialization every row is
  ground", argued, to be asserted in Task 8. (Assumed: Task 8 is not
  done.)
- **Undetermined variables.** A type hole becomes the representative
  `Int`, and an unsolved record row becomes the empty rest `{}` (ADR
  007, "Holes and the representative"; ADR 013; Specialize/Values
  `slotType`). The row-merge plan does not default anything a waiting
  predicate mentions ("QT-strict"); such a body is refused.
- **Several tails are not lowered yet.** `Specialize/Record.recordType`
  gives `E_INTERNAL R005B placeholder: rows with several tails are
  lowered in Task 8`. Checked: `join` from program 3 with `main` calling
  `show(join({ a: 1 }, { b: 2 }))` stops there (reproduction, §7). Task
  8 plans the canonical form "fields of all tails joined and sorted,
  unsolved tails empty".

Consequence (derived): the term witness `r|(dom r ∖ dom s)` can be
computed statically after specialization. Under a key, `r` and `s` are
sorted label arrays, the set term is a merge, and the fields come from
`r`'s layout.

## 2. Witness forms: what compiled code does, what lowering needs

### 2.1 The three forms

| Witness form | Value of a flexible row at a key | Run-time code |
|---|---|---|
| P9s whole-rest (§14) | written fields `F` (types lowered at the key) ⊎ for each chosen rigid row its rest, `θ(r)` minus the written labels `L` | none |
| Term witness (§18.1) `⊎ᵢ rᵢ\|Tᵢ ⊎ F` | evaluate each `Tᵢ` on the key's label sets, take `rᵢ`'s fields there, splice `F` | none |
| Typed template (D3a, §18.6, §18.8) | per written label a field template (`A(r,l)` is `r`'s field type at `l` in the key's layout, `T(n)` the key's type argument, ground types, skeletons lowered recursively); per Venn cell absent or a source row, whose field types are copied | none |

All three produce **types**: the layout a flexible row stands for under
the key, which picks the callee's key. None moves a value. A witness
says which labels of the caller's record the callee's `u` and `v` name.
It never says "copy this field into a new struct". Values are built only
by literal, spread, extension, update, removal and rest binders, and
those read fields by label from layouts already known (§1). So the
record handed to `divide` by `route` is `x` itself. Because
`{ ...u, ...v }` under the witness has the same sorted fields as `r`,
its layout is the same `LayoutId`, hence the same Go struct, and no
conversion is emitted. (Derived from `internLayout`'s keying on sorted
fields with interned field types; to be confirmed by Task 8's
canonical form, which joins and sorts the tails' fields.)

A source choice inside a typed template (copy `l`'s type from `r` or
from `s`, where both hold `l`) is invisible even in the generated Go
when the two types are equal, which is the only case where both sources
are allowed. Only the **placement** choice (which flexible row holds the
label) changes keys.

### 2.2 Evidence the checker must hand to lowering

- **The witness itself, in the instantiation.** For each record slot of
  a call, either a `Ty` as today (P9s witnesses that are a tail plus
  written fields fit) or a **row term**. For the presence part, the
  most direct form is the table that D1's per-region reduction already
  computes: for each membership vector of a label in the caller's
  rigid rows that `D` allows, which flexible rows hold the label (and,
  typed, from which source). A specializer evaluates it per label in
  O(number of rigid rows). Set-term syntax (unions of regions) is an
  equivalent, prettier form. The two are interchangeable by D2's
  construction (proved: `d2`, existence; Stream 3 is producing the
  constructive version).
- **Pattern dependence.** P9s witnesses and D2's written choice `Q̄` are
  per written-label pattern (§14.2, §18.6). At a key the pattern is
  concrete, so the specializer selects the entry for that pattern. The
  evidence is a table indexed by pattern, or a term that uses `{l} ∩ dom
  r` to encode the dependence. (Derived.)
- **No certificate is needed for lowering to be correct.** Lowering
  needs a correct witness, not a proof of one. Proposed instead: a
  **ground re-check** at each key. Evaluate the callee's instantiated
  clauses and the parameter equations at the ground layouts (equalities
  and disjointness of sorted label arrays, field types compared by
  number), and report E_INTERNAL on failure, as `singleTail` does today
  for a label written twice. It costs O(labels) per call per key. It
  turns a checker or witness defect into a reported internal error, not
  malformed Go. It is a check of `B` at one `θ`, a closed problem, so
  it needs no solver.

### 2.3 Composition with existing lowering

- **IR.** `Instantiation = Array (Ty Open)` cannot express `r|T`. One of
  two changes is needed: a restricted tail in `RecordRow`'s tails, or a
  separate slot type for record slots. The change is confined to
  Domain.Checked.Internal and Specialize/Lower, Record and Values. `Ty`
  in Domain.IR.Internal is unchanged, because a restriction evaluates
  to a layout before the monomorphic IR.
- **The instantiation rule (R010).** `admissibleSlot` accepts, in a
  recursive component, only the referrer's bare `{ ...r }` or a slot
  with no rigid variable. A restriction of the referrer's rows would be
  refused as "changes its type arguments". The rule can admit
  restrictions without losing finiteness. A restriction's image is a
  sub-row of an entering key's rows, so per entering key and slot there
  are at most 2^m images, m being the labels of the entering rows.
  With a deterministic witness (§3.5) it is one per call. (Derived;
  ADR 007's §4.2 proof covers type variables only, so this would need
  its own argument.)
- **Several tails (Task 8)** is a prerequisite: a callee parameter
  `{ ...u, ...v }` must lower by splicing both images.

## 3. Observability of split choice

### 3.1 The question in the dossier

Dossier §4, C8 (unresolved): within a fragment, if no construct can
observe how `{ ...r, ...s }` divides, every satisfying split behaves the
same and the checker may fix the witness deterministically. Policy
(the author's decision 3): an arbitrary split must not change observable
behaviour. Until C8 holds for a fragment, the checker accepts only
forced or written splits. The current compiler does this. Checked:
c.wxw (§7) is refused with `Cannot tell how divide's u and v split { a:
Int, b: Int }`. Note that this split is in fact forced by the clauses
(`a` cannot go to `u`, `b` cannot go to `v`), so that refusal is the
O4 limitation (program 4), not decision 3.

### 3.2 Multiplicity is real (checked)

split-model.mjs enumerates the uniform complement-free presence
witnesses (per region, the permitted flexible membership vectors):

| Problem | Uniform witnesses | Free region |
|---|---|---|
| `route` (`splitSig`) | 2 | `r∖s∖t`, to `u` or `v` |
| `route` with `r disjoint s` | 2 | the same |
| forwarded `join` | 1 | none |
| three-way division | 24 | four regions with 2 or 3 choices |
| `route` without `s disjoint t` | invalid (region `r∩s∩t`) | |

The Lean proof of `splitSig_valid` uses `u = r∖s`, `v = r∩s`
(Sig/Adversarial.lean, `outside`, `inside`). The canonical rule of §3.5
gives `u = r∩t∖s`, `v = r∖t`. Both are valid, and they differ on the
free region.

### 3.3 Run time: unobservable in the current fragment (derived)

**Claim C8-rt.** Let W1 and W2 be witnesses accepted for the same call:
same argument types, same result type, each satisfying the callee's
instantiated constraints at every key. Suppose the program uses only the
constructs listed below as "no". Then the two specialized programs have
the same run-time behaviour: output, exit status and defect report.

**Argument (a sketch, not a proof).** Relate values of ground types
`τ1` (under W1) and `τ2` (under W2) structurally. Records are related
only if they have the **same label set** and related fields. Data are
related when they have the same constructor and related arguments. Base
types use identity, and functions are related when they map related
arguments to related results. Two values at record types whose label
sets differ are never related, so the claim requires that no such value
is ever built. Field types may still differ in phantom positions: `Nil
: List({ ...u })` is related to itself across W1 and W2.

1. Parameters are related. Each parameter type's image is the argument
   type, the same under W1 and W2.
2. Every record-building construct maps operands with equal label sets
   to results with equal label sets. This covers a literal (closed
   labels), extension and a multi-spread literal (⊎ of agreeing
   parts), and removal and rest binders (written labels only;
   cancellation, `F ⊎ A = F ⊎ B` with `F` disjoint from both gives
   `A = B`). The only way to reach a record type whose label sets
   differ between W1 and W2 from agreeing operands is to project a
   composite onto one of its row variables. No construct does that.
3. A value at a type that mentions `u` without its companions can only
   be a parameter component (agreeing, by 1) or phantom: the element
   type of an empty container, or the parameter type of a lambda that
   has nothing to apply it to.
4. `show`, `print` and `crash` print related values identically:
   labels from equal sets, fields related, and empty containers print
   no element type. Comparisons occur only at types fixed when checked
   (open records in generic code are `not comparable`, and holes are
   `Ambiguous`, ADR 007).
5. Calls to generic functions follow by induction on evaluation
   (step-indexed for recursion).

The argument mirrors parametricity (Reynolds 1983; Wadler 1989) with a
relation chosen per construct, and ADR 007's four conditions for the
`Int` representative. It is **derived**. A Lean proof would need a
small calculus with these constructs; no stream owns one.

**Construct inventory** (dossier §4 asked for one, construct by
construct):

| Construct | Observes the split? | Basis |
|---|---|---|
| field access, update | no | written labels only |
| extension, multi-spread literal | no | result label set is the union |
| `without`, rest binders, record patterns | no | written labels only (several-tail typing is Task 7, assumed to keep this) |
| `== != < …` | no | generic open records not comparable; holes ambiguous |
| `show`, `print`, `crash` at run time | no | step 4 |
| **post-specialization printability check** | **yes, at compile time** | E2 below |
| `Fail` payloads | no | a payload type must be concrete; that `Fail(List({ ...u }))` is refused is assumed from language.md, not tested |
| effects and handlers | no | effects take no record rows (R009); effect keys in one copy come from one witness |
| function values, lambdas | no | phantom (step 3) |
| specialization keys, Go names | Go text differs, behaviour does not | step 5 |
| 10,000-key limit, `E_SPECIALIZATION` | could differ if choices varied by caller; fixed by a deterministic rule | §3.5 |
| any row-variable projection (none exists) | **yes, at run time** | E3 below |
| future: class instance at a split row (C001), program 7 dictionaries, R009, row-polymorphic FFI | yes, unless the use is an ambiguity error | ADR 007 condition 1: a constrained undetermined variable must be reported, never defaulted |

### 3.4 Examples

**E1, run-time invariance.** `divide({ a: 1, f: fn(n: Int) => n }, {
a: 2 }, { b: 3 })` (§17.3's `divide`, body `"ok"`). Here `a` is forced
into `v` and `f` is free. Under both splits the struct passed is the
layout `{ a: Int, f: Int -> Int }` and the result is "ok". (Checked in
the hand model, split-model.mjs part 4. Not compilable today: Task 8.)

**E2, compile-time observability.**

~~~waxwing
fn divide(whole: { ...u, ...v }, left: { ...s }, right: { ...t }): Text
  where u disjoint s, v disjoint t = {
  let peek = fn(p: { ...u }) => show(p);
  "ok"
};

fn main(): Text = divide({ a: 1, f: fn(n: Int) => n }, { a: 2 }, { b: 3 });
~~~

`peek` is never applied, but its print site is checked at the ground
type `{ ...u }` after specialization (language.md, "Printability at the
ground type"). With `u = {}` it is accepted. With `u = { f }` it is
E_TYPE `Expected a printable value, found { f: Int -> Int }`. Same
run-time behaviour, different acceptance. (Checked in the hand model.
The mechanism is checked today with one tail, below.)

Today's analogue runs: a.wxw/b.wxw (§7) differ only in what fixes
`probe`'s row `r`. Left undetermined, `r` is the empty rest and
compiles. Fixed to `{ f: Int -> Int }`, the never-applied `fn(x: { ...r
}) => show(x)` is `Expected a printable value, found { f: Int -> Int
}`. The existing defaults (`Int`, `{}`) happen to be printable, and
acceptance already depends on them.

**E3, what would break run-time invariance.** A projection `fn pick(w:
{ ...p, ...q }): { ...p }`, as a primitive or row-polymorphic foreign
function, and `show(pick(whole))` in `divide`. With `whole = { a: 1, c:
2 }`, `left = { a: 0 }`, `right = { b: 0 }`, the free label is `c`.
Under the canonical choice the output is `{}`, and under the other it
is `{ c: 2 }`. Any such construct must be excluded from C8's fragment
or must require a forced or written split.

**E4, code size.** Two callers of `divide` with the same whole but
different free-label placements reach two copies of `divide`. The
behaviour is the same and the Go is duplicated. A deterministic
per-label rule removes duplication caused by the rule itself. Different
`s` and `t` legitimately give different keys.

### 3.5 Verdict and the canonical choice

- **Run time:** in the current fragment, all permitted choices are
  indistinguishable (C8-rt, derived; E1). E3 marks the boundary.
- **Compile time:** distinguishable (E2). The semantics must therefore
  **fix a canonical choice**, or exclude split-dependent print sites.
  Without one, whether a program is accepted would depend on solver
  internals. Determinism also keeps Go output and key counts
  reproducible.

**Proposed rule.** For each label, look at its membership vector in the
caller's rigid rows (and, at a ground call site, in the argument
layouts). Choose the **lexicographically least** flexible membership
vector that satisfies `B` there. Flexible rows are ordered by the
callee's declaration order of row variables, then by any internal fresh
variable in creation order, and absent comes before present. Written
labels are handled per pattern in the same way (O3's `Q̄`).

Properties:

- **Deterministic and label-blind.** It depends only on a label's
  membership vector, so renaming labels does not change it. (Derived.)
- **Uniform.** The per-region choice is a term witness (a union of
  regions). On the flat presence fragment, evaluating it at a key gives
  exactly the per-key ground choice, since every atom is per label (O2;
  the per-region form of O1, both proved in Composition/Presence). So a
  generic caller's witness and a direct call's choice agree. (Derived
  from proved O1 and O2. Checked: split-model.mjs evaluates the
  canonical terms with set operations on every assignment over three
  labels satisfying `D`, and `B` fails at 0 of 216, 125, 27 and 512
  assignments. A scratch power check that forces `u := r` reports
  failures at 152, 61 and 448, and 0 for `join`, where that is the true
  witness.)
- **Agrees with the existing default.** A flexible row that no atom
  constrains gets the all-absent vector, `{}`, which is ADR 013's rule.
- **Consequence:** free labels go to the **last** part (`route`: `u =
  r∩t∖s`, `v = r∖t`; three-way: `a = ∅`). The reverse ("first part
  takes") is equally valid. Either way, it must be written down.
- **Typed fragment.** The rule extends per cell to the least (placement,
  source) pair among uniform templates (D3a). If D3a fails, the
  specializer can still choose per label at a key, because field types
  are ground there. The choice is then not uniform, and E2-style
  acceptance can depend on type equalities. (Derived.)
- **E2 is not removed by any canonical rule.** Some placement of a
  non-printable free field may make a phantom print site fail. Two
  alternatives remove the dependence: (a) refuse, as ambiguous, a print
  site whose type mentions a split part that is not forced. This needs
  provenance from checker to specializer. (b) Once `show` becomes a
  class method (C001), such a use is a constraint on an undetermined
  variable, already ambiguous by ADR 007 condition 1. (b) is the
  coherent long-run answer. Until then, a documented canonical rule is
  the cheapest.

## 4. Forced splits at run time

- **Where one is needed:** nowhere under whole-program specialization.
  `route`'s split (no P9s witness) is a compile-time computation per key
  of `route`. Its result picks `divide`'s key, and the call passes `x`
  unchanged. (Derived, §2.1.)
- **Compile-time cost:** per key, one evaluation of the witness, O(Σ
  rows' labels) for a merge-based set term or the per-label table. Then
  layout interning, as today. Key counts are unchanged with a
  deterministic rule (one divide key per route key).
- **Run-time cost:** zero. There is no copy, no evidence and no
  membership test. The `u` and `v` layouts often get no Go struct at
  all (`emittedLayouts` emits only layouts that some value has).
- **Composition:** needs Task 8 (several tails), the instantiation-slot
  extension and the R010 admission of restrictions (§2.3). Nothing in
  Format.Go* changes for the split itself.
- **Under a future boxed backend** (ADR 002 reserves one for separate
  compilation; none exists): the value still needs no splitting,
  because no construct projects a row variable (§3.3). The callee would
  need label-set evidence for `u` and `v` only where it builds layouts
  (extension, removal). The minimal operation is the membership
  partition of `r`'s labels by `s`'s, O(|r| + |s|) by sorted merge, or
  O(words) with interned labels as bitsets. It can be cached per pair of
  layouts. (Derived; out of current scope.)

## 5. Dependencies

| Needed | From | Why | Status today |
|---|---|---|---|
| a computable, deterministic presence witness | Stream 3 (constructive D2) | lowering needs the witness, not its existence; the rule in §3.5 should be the one computed, or at least a documented deterministic one | D2 proved for existence only (`d2`, §18.12) |
| a correctness lemma for that function (satisfies `B` for every rest assignment satisfying `D`) | Stream 3 | the ground re-check (§2.2) catches defects; the lemma prevents them | open |
| typed templates exist (D3a) | Stream 2 | uniform typed witnesses let the checker hand lowering a template; without D3a the specializer chooses per key (§3.5) | unresolved, bounded evidence only |
| generic-instance validity (D3b) | Stream 1 | checking only. If the checker certifies by D3b without building templates, lowering must solve each key's ground problem itself: a second architecture, with a solver in Specialize | unresolved |
| no source construct projects a row variable; how lambda annotations and several-tail `without` and rest binders type | Stream 5 | C8-rt's inventory rests on it (E3) | assumed from language.md and the row-merge plan |
| the variable order used by the canonical rule | Stream 5 | the rule must be stated on source-visible order (declared row variables), not on internal fresh variables (row-merge T1 desugars a k-tail row into a chain of fresh variables) | open |
| several tails lowered; M14 asserted | R005B Task 8 | prerequisite for any of this to run | not done (checked: placeholder error) |

What this note establishes, by label:

- **Derived:** no run-time split under specialization (§2.1, §4);
  C8-rt for the listed constructs (§3.3); uniformity of the canonical
  rule on the flat presence fragment, from proved O1 and O2 (§3.5); a
  finiteness argument for admitting restrictions under R010 (§2.3).
- **Checked:** multiplicity of uniform witnesses and the canonical
  terms' validity on five problems (split-model.mjs); E2's mechanism
  with one tail (a.wxw, b.wxw); the several-tail placeholder (d.wxw);
  today's refusal of an undetermined or unforced split (c.wxw).
- **Assumed:** Task 8's canonical form gives the union layout the same
  `LayoutId` as the caller's row; `Fail` payloads at split rows are
  refused; Task 7 types several-tail `without` and rest binders by
  written labels only.
- **Not claimed:** any proof of C8; anything about the typed fragment
  beyond the remarks in §3.5.

## 6. Open questions for the author

1. **`route` and decision 3.** `route`'s split is not forced (two
   uniform witnesses). Under decision 3 it stays refused even after
   division is decidable. Should C8-rt (run time) be the target for
   lifting decision 3 for the current fragment, with the canonical rule
   fixed by specification?
2. **Which canonical rule:** the free labels to the last part (the
   proposal, consistent with the `{}` default) or the first part?
3. **E2:** accept that the canonical rule decides printability of
   phantom print sites (documented), or refuse such sites as ambiguous
   until C001?
4. **Evidence form:** a per-membership-vector table in the
   instantiation, or set-term syntax? And is the ground re-check at
   each key (E_INTERNAL) wanted?
5. **Proof of C8-rt:** worth a small Lean calculus, or kept derived
   with generated-program evidence like ADR 007's poly-properties (same
   output under two witnesses), once Task 8 lands?

## 7. Reproduction

~~~sh
node research/division-campaign/compile/split-model.mjs
~~~

Today's compiler behaviour (a.wxw to d.wxw as in §3.4 and §1; scratch
files, not committed). The worktree has no build, so these used the
main checkout's `output/`, built 2026-10-20 12:14, three minutes before
the last `src` commit (43b3a28, a refactor and a test count). Rebuild
with `npm run build` to confirm.

~~~sh
# a: exit 0
node run.mjs <repo>/output a.wxw a.go
# b: E_TYPE Expected a printable value, found { f: Int -> Int }
node run.mjs <repo>/output b.wxw b.go
# c: E_TYPE Cannot tell how divide's u and v split { a: Int, b: Int }
node run.mjs <repo>/output c.wxw c.go
# d: E_INTERNAL R005B placeholder: rows with several tails are lowered
# in Task 8
node run.mjs <repo>/output d.wxw d.go
~~~

`run.mjs` sets `process.argv` to `waxwing emit IN OUT` and calls
`Program.Main.main` (`emit` writes Go without running `go build`, so no
Go cache is used). The sources:

~~~waxwing
// a.wxw (b.wxw passes fn(y: { f: (Int) -> Int }) => 0 instead)
fn probe(k: ({ ...r }) -> Int): Text = {
  let p = fn(x: { ...r }) => show(x);
  "ok"
};
fn main(): Text = probe(fn(y) => 0);

// c.wxw
fn divide(whole: { ...u, ...v }, left: { ...s }, right: { ...t }): Text
  where u disjoint s, v disjoint t = "ok";
fn main(): Text = divide({ a: 1, b: 2 }, { a: 3 }, { b: 4 });

// d.wxw
fn join(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s =
  { ...a, ...b };
fn main(): Text = show(join({ a: 1 }, { b: 2 }));
~~~
