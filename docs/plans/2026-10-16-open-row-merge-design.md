# Open-row merge: the algorithm (R005 Tranche B)

Status: Draft 2, 2026-10-17, written unattended after an adversarial
review (docs/plans/2026-10-16-open-row-merge-review.md); every choice is
Proposed and needs the user's review.

Answers the algorithm pass that draft 2 of the record extension design
(docs/plans/2026-10-16-record-extension-design.md §6) requires before
Tranche B is planned. No code. The prototypes in Appendix A are toy
solvers in JavaScript, not the compiler.

## Changes from draft 1

Each review finding (F1-F13) and where it is resolved. "Open" means the
finding needs the user's judgment and is in §14 with a recommendation.

| Finding | Resolution |
|---|---|
| F1 `without` and rest binders keep a field a hole holds | Not a current bug: Tranche A is correct for one tail (verified on the current compiler, §5.1). A requirement on Tranche B: the result is the fresh rest row of one requirement, never a resolved type minus labels (§5.2); three regression rows (§12) |
| F2 determinate bodies refused in a higher-order shape | Adopted: an upper bound per meta, with lacks and apart facts carried by one sum rule (§2.5). Reproduced: all 186 shared-parameter programs with a least solution now accepted (Appendix A) |
| F3 property C untestable | Replaced by C1 (one pending equation at D4 ⇒ no least solution) and C2 (verdict independent of constraint order), checked by brute force; the rest of the incompleteness is a reported rate, C3 (§12) |
| F4 drain unspecified with field types | Pending equations hold only the residue, have an identity, a normal form, a meta index, and nested equations inherit the outer site; a measure that decreases (§2.6, §2.7) |
| F5 exponential pieces | The `k × l` basis is never built: forced constants are committed one at a time and a residue with no constants stays pending as a quiet equation, which the empty default satisfies (§2.2). Linear in the prototype at n = 40 (was 2^n). P5 and D5 withdrawn |
| F6 drain failures read as nonsense | P9 replaced: the failure carries the equation that excludes it; text D6 with a `required here` note at the equation's site (§10) |
| F7 end of body with postponed effect pairs | The end alternates the effect settle rounds and the drain to a joint fixpoint; D4 before `Fail needs a concrete error family`; postponed pairs keep a site (§6) |
| F8 P3 makes the written clause dead | Open (§14.1): implied versus required disjointness, both specified. Either way, provenance has a fixed precedence, so notes cite the written clause (§1.3) |
| F9 signatures no call can use | Interchangeable tails reported at the declaration (D7, §8), a sound but narrow check whose reach is open (§14.5); a repeated tail reported at resolve (D8) |
| F10 termination measure, cost | New measure over pairs (program meta, constant) (§2.7); cost names partners per meta and the index |
| F11 D2' location against rule 1 | Rule 1 wins; a late overlap in a literal is at the completing expression with notes at both items; `arrivedAt` stamped on every binding (§10) |
| F12 NP claim targets the wrong question | Restated: satisfiability is NP-complete; whether a least solution exists is coNP-hard (new switch construction, brute-force checked) and in P^NP (§2.7) |
| F13 smaller points | Creation-site obligations only in the oracle harness (§12); `boundAt` renamed `arrivedAt`; D4 names the callee's variables; slice 4 split and a specialization placeholder (§13); `Holder({ ...a, ...b })` in §1.4 |

## Settled by the user (not reopened)

1. Merge combines disjoint records only; any overlap is an error, and
   the update `p { a = v }` is the only replacement.
2. Surface: `fn merge(a: { ...r }, b: { ...s }): { ...r, ...s } where r
   disjoint s = { ...a, ...b };`.
3. Constraints in a `where` clause, in words: `r lacks { a, b }`, `r
   disjoint s`.
4. Each field and spread is evaluated once, left to right.
5. After specialization every row is ground; lowering builds one struct
   from several.
6. Draft 1's "at most one hole per row" is withdrawn and not relied on.

## 0. The choice in brief

- **Rows hold several tails.** A record row is labelled fields plus a
  multiset of tails (P1). `{ ...r, ...s }` is one row with two tails,
  and instantiating `merge` gives `{ ...?r, ...?s }`.
- **Facts on variables, kept in the substitution.** Disjointness (Gaster
  and Jones's lacks predicates, extended with Harper and Pierce's
  compatibility assertion `r # s`) and, new in this draft, an upper
  bound per meta, the dual of lacks. Every obligation between two rows
  decomposes into label/label (checked at once), label/tail (a lack) and
  tail/tail (an apart pair). Facts on metas are decomposed again
  whenever a meta is bound, so they are never approximated by the labels
  known at the time.
- **Equations between rows are solved by forced moves only.** Common
  labels and common tails cancel. Each remaining constant (a label or a
  rigid tail) needs a home among the other side's metas. A constant
  with one admissible home is committed there; with several the
  equation waits; with none it fails. A residue with metas on both
  sides and no constants is quiet: it waits too, and the empty default
  satisfies it. The `k × l` basis of linear AC unification is the
  meaning of a quiet equation, never built.
- **Bodies, not signatures, end with residue.** Signatures are explicit
  and nothing is generalized, so no residual becomes a constraint. At
  the end of a function, facts on unsolved metas and quiet equations
  are met by the empty row, the row lowering already gives them. An
  equation still waiting with a constant is an ambiguity error.
- **Why not complete.** Whether a least solution exists is coNP-hard
  (§2.7). The checker decides the forced cases, says so when it cannot,
  and its incompleteness is characterized by testable properties (§12).

# Part I: the algorithm

## 1. Representation

### 1.1 Rows

```
type RecordRow a v = { fields ∷ Array (Tuple String a), tails ∷ Array v }
```

`tails` replaces `tail ∷ Maybe v` (P1). It is kept sorted by variable,
with repeats kept, so `{ ...r, ...r }` can be represented and reported
rather than silently collapsed. A closed row has no tails. The meaning
of a row is the disjoint union (written `⊎` below) of its fields and
its tails' images. The representation does not assume the union is
disjoint; that is an obligation (§3), recorded where the row is made.

Alternatives considered:

- **A concatenation node beside `TRecord`** (`TConcat [Ty]`): two
  shapes for one concept, and every walk over records learns both.
- **Single-tail types plus a side equation** (`{ ...?t }` with `?t ≐
  ?r ⊎ ?s` in a store): cannot express the body of `merge`, whose result
  `{ ...r, ...s }` over rigids has no single-tail form.
- **`tail` plus `spreads`**: keeps old call sites compiling but splits
  one multiset across two fields; rejected for clarity.

### 1.2 Normal form

`flatten` (Features.Check.FlatRecord, today a loop over one tail)
follows every bound tail: the fields of each image join, its tails are
followed in turn, and the result is fields sorted by label and tails
that are rigid or unbound metas, sorted. It is a worklist loop, so long
chains cost no stack, as today.

### 1.3 The obligation store

The substitution (Features.Check.Subst) already keeps `lacks` and
`written` per tail. It gains (P2):

```
apart     ∷ Map Flex (Map Flex Because)   -- symmetric pairs of tails
upper     ∷ Map Flex Bound                -- §2.5; absent = unbounded
pending   ∷ Map PendingId Pending         -- §2.6
naming    ∷ Map Flex (Set PendingId)      -- index: equations per meta
because   ∷ Map Flex (Map String Because) -- generalises `written`
arrivedAt ∷ Map Int Span                  -- where a meta was bound

data Because
  = Lacks { variable ∷ String, span ∷ Span }  -- `where r lacks { a }`
  | Disjoint { variables ∷ Array String, span ∷ Span } -- `r disjoint s`
  | Implied { span ∷ Span } -- a label or a second tail beside the tail
  | Spread { earlier ∷ Span, later ∷ Span }   -- a literal's items

type Bound = { atoms ∷ Set Atom, why ∷ Equation }  -- Atom: label, rigid
type Equation = { left ∷ Row, right ∷ Row, site ∷ Span, owner ∷ Owner }
type Pending = Equation & { residue ∷ Residue, seen ∷ Int, quiet ∷ Bool }
```

(`&` is shorthand for the record's fields plus these.) `Owner` names the
callee use whose variables the metas instantiate, when there is one
(`merge` at this site, with `?r ↦ r`), so texts can print `merge's r`.

- `apart` holds pairs whose two sides are each a rigid or an unbound
  meta. Rigid pairs are the body's hypotheses (seeded from the
  signature, like rigid lacks); meta pairs are obligations.
- `because` replaces `written` (Task 2): for each lacked label, why it
  is lacked. An apart obligation that decomposes into a lack passes its
  own `Because` on, so a violation knows whether it broke a `lacks`
  clause (text D1) or a disjointness (text D2).
- **Precedence.** A label or pair can have several reasons. The store
  keeps one, the first in the order `Lacks`, `Disjoint`, `Implied`,
  `Spread`, and between two of one kind the earlier span. The result
  does not depend on the order in which facts arrive, and a note cites
  a written clause in preference to a type that implies the same fact.
  This replaces Task 2's "the first seeded wins" for lacks too, a
  visible change to Tranche A's notes when a clause repeats an implied
  lack (slice 3 pins it).
- `arrivedAt` is stamped for every meta bound during a requirement,
  including bindings made by commits and by the drain, with the span of
  that requirement; bindings made by the end-of-body settle are stamped
  with the postponed pair's site (§6). It feeds the `first written here`
  notes (§10). Renamed from draft 1's `boundAt`, which clashes with the
  existing function `Subst.boundAt`.
- The whole store lives in the substitution, so a postponed effect row
  pair that reverts the substitution reverts it too, as `watch` and
  `marks` do.

### 1.4 Where multi-tail rows and obligations come from

| Source | Row | Obligations recorded |
|---|---|---|
| A signature type `{ a: A, ...r, ...s }` (its own body) | rigid tails | `r`, `s` lack `a` (as today); `r # s` hypothesis, `Implied` under §14.1 option A, else required as a clause |
| The same type at a use (Use `seededUse`) | meta tails | the same on the use's metas |
| A clause `where r disjoint s` | none | `r # s`, `Disjoint` |
| A literal `{ ...e1, x: v, ...e2 }` | fields and both spreads' tails | `row(e1) # row(e2)`, `x` against both, `Spread` |
| A declared type writing `{ ...r, ...s }` in a field | as for signatures | through Implied `declared`, extended to pairs |
| A record-row argument `Holder({ ...a, ...b })` | the argument row | `a # b` (Implied at the argument); ArgumentClash between two arguments a declaration concatenates |
| A row made by the checker (`select`'s `{ l: α, ...ρ }`, a commit's `{ c } ⊎ ?m'`) | its image | its own disjointness, as any creation site |
| A binding `?m := F ⊎ T` (§3.2) | its image | the image's own disjointness, plus what `?m` had |

A type written in a body (lambda annotation, handler label, `handle`
payload) with two tails over the signature's variables is held to the
signature's facts by Resolve.Lacking, as single tails are since R001's
C1 fix: `r and s are not known to be disjoint` (D3) at its later `...s`.
A written row with the same tail twice is D8 at resolve (§8).

### 1.5 Worked example: instantiation and composition

```wxw
fn main(): Int = merge(merge({ x: 1 }, { y: 2 }), { z: 3 }).x;
```

| Step | Substitution and store |
|---|---|
| outer use of `merge` | `?r2`, `?s2`; apart `?r2 # ?s2`, reason `Disjoint` (merge's clause) |
| inner use | `?r1`, `?s1`; apart `?r1 # ?s1` |
| `{ x: 1 }` against `{ ...?r1 }` | `?r1 := { x: Int }`; the pair decomposes: `?s1` lacks `x` |
| `{ y: 2 }` against `{ ...?s1 }` | `?s1 := { y: Int }` (its lacks allow it) |
| inner result `{ ...?r1, ...?s1 }` | flattens to `{ x: Int, y: Int }` |
| it against `{ ...?r2 }` | `?r2 := { x: Int, y: Int }`; `?s2` lacks `x`, `y` |
| `{ z: 3 }` against `{ ...?s2 }` | `?s2 := { z: Int }` |
| `.x` | the result flattens to `{ x: Int, y: Int, z: Int }` |

Under §14.1 option A the result type also implies the pair; by the
precedence of §1.3 the reason kept is still `Disjoint`, so notes point
at the clause the user wrote.

A function reference or a partial application changes nothing: the
apart pair lives in the substitution, keyed by the metas, not on the
value, so it survives however the arrow is passed, stored or returned.

```wxw
fn twice(): Int = {
  let add = merge({ x: 1 });
  add({ y: 2 }).y
};
```

The partial application binds `?r := { x: Int }`, so `?s` lacks `x`;
the later call binds `?s := { y: Int }`. `add({ x: 5 })` instead is D2
at `{ x: 5 }`, noted at `{ x: 1 }`. A `let` is not generalized
(Check/Block), so a second `add(…)` shares `?s`, as it would today for
any let-bound reference.

## 2. Solving equations between rows

### 2.1 The rule

To unify rows `L` and `R` (UnifyRecord, generalised):

1. **Flatten** both. A label twice on one side is the mismatch (today's
   `duplicated`).
2. **Common labels** unify field-wise in label order (today). If that
   bound a tail of either row, flatten again and restart (today's
   `rebound`). This step runs once per label: a label cancelled here
   never returns to the residue (§2.6).
3. **Cancel common tails**, as multisets. Disjoint union cancels: if
   `A ⊎ X = B ⊎ X` then `A = B`.
4. **The residue**: constants `C1` (labels and rigid tails only in `L`),
   metas `M1`, and likewise `C2`, `M2`. Every constant of one side must
   lie inside a meta of the other: a rigid tail is an opaque row, so it
   never holds a label and never grows. A side with constants and no
   metas opposite fails at once.
5. **Sum rule** (§2.5): the residue bounds each meta of one side by the
   other side, and passes facts every meta of one side shares to each
   meta of the other. If that changed anything, go to 1.
6. **One meta alone.** If a side is exactly one meta `m` and nothing
   else, bind `m` to the other side (today's rule 2, now with several
   tails; also today's `sameTails` for two bare metas, the newer bound
   to the older).
7. **Homes.** A constant `c` of `C2` may go into `m ∈ M1` when `m` does
   not lack `c` (a label), is not apart from `c` (a rigid), `c` is
   within `m`'s upper bound, and moving `c` in would not break one of
   `m`'s facts at once: each rigid `σ` apart from `m` must lack the
   label (or be apart from the rigid), and a rigid `c` must lack every
   label `m` lacks. Likewise for `C1`.
8. **Decide.**
   - Some constant has no home: if its side has exactly one meta, bind
     it anyway, so the fact that excludes it reports itself (D1, D2, D3,
     D6 or `s may already have field a`); otherwise the records'
     mismatch.
   - One meta on each side, both with constants: one fresh remainder,
     `m := C2 ⊎ ?z` and `n := C1 ⊎ ?z` (today's rule 3,
     `r001-shared-remainder`).
   - Some constant has exactly one home: **commit** it, `m := { c } ⊎
     ?m'` with `?m'` fresh, and go to 1.
   - Constants remain, each with several homes: **defer** (§2.6).
   - No constants remain (metas on both sides, at least two on each):
     **quiet**, deferred the same way but never an ambiguity (§2.2).

### 2.2 Quiet equations instead of the general solution

Draft 1 solved an equation whose constants were all placed by the basis
of linear AC unification with unit coefficients (Stickel): each `mi ∈
M1` becomes its constants plus one fresh piece `zij` for each `nj ∈
M2`. That basis is still the meaning, but it is no longer built:

- Constants with one home are committed one at a time (§2.1 step 8),
  each commit making one fresh meta.
- What is left after the last commit has metas on both sides and no
  constants, `m1 ⊎ … ⊎ mk = n1 ⊎ … ⊎ nl`. It is kept, quiet, in
  `pending`. It is re-examined like any pending equation when one of
  its metas changes; a binding that brings a constant in makes it an
  ordinary equation again, and a side reduced to one meta is solved by
  step 6.
- The empty assignment satisfies a quiet equation, so at the end of the
  body it is met by the default (§6) and is never D4.

Why: the basis multiplies. Draft 1's prototype, on `h(merge, …, merge)`
with n callbacks sharing a result type, built 2^n parts and 4^n apart
pairs (n = 9: 512 parts, 130,816 pairs, 4.3 s), although the least
solution, everything empty, was never in doubt (review F5). With quiet
equations the same program is n − 1 quiet equations, no fresh meta and
n apart pairs at n = 40, in 3 ms (Appendix A). The cap of draft 1 (P5,
D5) has nothing left to bound and is withdrawn (§2.7 gives the bound).

What it costs: the pieces carried facts (each piece is apart from the
others of its owner, inherits both owners' lacks) that a quiet equation
does not state. The sum rule (§2.5) restores the facts that hold for
whole metas. What is lost is reasoning that needs a piece: in the raw
generator, 20 of 480,000 runs end in D4 with a least solution because
of it, each with a quiet equation sharing a meta with a waiting one,
and all inside C3 (§12); in the dense generator, none. Building the
basis at that moment (prototyped, `expand`) removes them at the old
cost; not proposed (§14.2).

### 2.3 Today's rules are the one-tail case

With at most one tail per side the rule makes the decisions of ADR 013's
rules 1-6: the same tail cancels (1); labels against a meta bind it (2);
two metas share one remainder (3); a lacked label has no home (4); `{ a:
A, ...?m } ~ { ...?m }` cancels to `{ a: A } ~ {}`, the mismatch (5);
a rigid or closed side offers no meta, the mismatch (6). With one tail
per side no residue has two metas on a side, so no commit, deferral or
quiet equation arises, and the sum rule gives a bound only to a meta
that step 6 binds at once. The first slice of the plan proves this
with a differential (§12).

New and harmless: `{ ...?m } ~ { ...?m, ...?n }` cancels to `{} ~ { ...?n
}` and binds `?n := {}` where today a single tail could not express it.

### 2.4 Worked examples

**Deferral resolved by a later argument.**

```wxw
fn apply2(f: (a, b) -> { x: Int, y: Int }, p: a, q: b): Int = f(p, q).x;
fn main(): Int = apply2(merge, { x: 1 }, { y: 2 });
```

`merge` against `f`'s parameter binds `?a := { ...?r }` and `?b :=
{ ...?s }`, then meets `{ ...?r, ...?s } ~ { x: Int, y: Int }`. The sum
rule bounds `?r` and `?s` by `{ x, y }`. Both `x` and `y` may go to
`?r` or `?s`: deferred, at `merge`. The argument `{ x: 1 }` binds `?r
:= { x: Int }`; the drain re-examines the equation, now `{ x: Int,
...?s } ~ { x: Int, y: Int }`, which cancels `x` and binds `?s := { y:
Int }`. The third argument checks against `{ y: Int }`.

**Never resolved.** Without `p` and `q`, `fn apply0(f: (a, b) -> { x:
Int, y: Int }): Int`, the equation is still pending when `main` ends:
D4 at `merge`. Four splits of `{ x, y }` are solutions; no choice is
forced, and each gives `merge` a different specialization.

**Forced by a fact.** If `?s` lacks `x` (say the program also passed
`{ ...?s }` where `{ x: Int, ...t }` was expected), the only home of
`x` is `?r`: commit `?r := { x: Int, ...?r' }`; the rest, `{ y }`
against `?r' ⊎ ?s`, may still defer.

**Forced by a bound** (review F2).

```wxw
fn both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int }): Int = 0;
fn main(): Int = both(merge, merge);
```

The first `merge` gives `?r1 ⊎ ?s1 = { x }`, the second, whose `r` meets
the first's through `p`, gives `?r1 ⊎ ?s2 = { y }`. The sum rule bounds
`?r1` by `{ x }` and then by `{ y }`; the meet is empty, so `?r1 := {}`
(forced), and the equations solve to `?s1 = { x }`, `?s2 = { y }`, the
only solution. Draft 1 reported D4 twice.

**Two holes against one.** `{ ...?r, ...?s } ~ { ...?t }` (a merge
result passed where an inferred lambda parameter's record is expected):
`?t` is alone on its side, so `?t := { ...?r, ...?s }` (step 6). The
apart pair `?r # ?s` keeps `?t`'s row well formed.

### 2.5 Upper bounds and the sum rule

**Representation.** `upper ∷ Map Flex Bound`: for an unbound meta, a
finite set of atoms (labels and rigids) and the equation that set it.
An absent entry means unbounded. A bound is the dual of a lack: a lack
says an atom is never in the meta, a bound says nothing outside the set
ever is.

**Invariants.**

- U1 (sound): in every solution of the recorded obligations, the
  meta's atoms lie within its bound.
- U2 (pruned): a bound never holds a label the meta lacks or a rigid the
  meta is apart from. Adding such a fact removes the atom.
- U3 (unbound only): binding `?m := F ⊎ T` checks that the image's
  constants (labels of `F`, rigid tails of `T`) lie within the bound,
  else D6; each meta of `T` is then narrowed to the bound minus those
  constants; the entry for `?m` is removed.
- U4 (empty forces): a bound narrowed to the empty set binds the meta
  to `{}`.

**The sum rule.** For a residue `C1 ⊎ M1 = C2 ⊎ M2`, each `m ∈ M1` lies
within `C2 ⊎ M2` (and symmetrically):

- *bound*: if every `n ∈ M2` has a bound (vacuously when `M2` is
  empty), narrow `m` to `C2 ∪ ⋃ upper(n)`;
- *lack*: a label every `n ∈ M2` lacks, which no constant of `C2` is or
  may hold (a rigid in `C2` must lack it by hypothesis), is lacked by
  `m`;
- *apart*: a tail `q` apart from every `n ∈ M2`, and known disjoint from
  every constant of `C2`, is apart from `m`.

Each derived fact keeps the equation as its reason, so a violation is
reported with D6 and a `required here` note at the equation's site.
The rule is sound because it only restates `m ⊆ C2 ⊎ M2`. It runs on
every residue, quiet or not, at each examination.

**Termination.** A narrowing either changes nothing (no version change)
or strictly shrinks a finite set; fresh metas start with a subset of
their owner's bound (U3); lacks and apart pairs only grow over finite
sets. The total size of all bounds is part of the measure of §2.7.

**Evidence.** On review F2's family (2 or 3 callbacks sharing a
parameter, every non-empty closed result over three labels, 392
programs) draft 1 refused all 186 that have a least solution; draft 2
accepts all 186 and violates no property. On the dense generator it
cuts D4-with-a-least-solution from 7.35% of runs to 0.66% (300,000
runs each, same problems). Appendix A.

### 2.6 Pending equations and the drain

**What is stored.** A pending equation holds its residue after step 3:
the constants and metas on each side, with the field types of labels
still in the residue. The field-wise unification of step 2 has already
run for every label that cancelled; it is never repeated. It also holds
the original rows and `Owner` for texts, its `site`, and `seen`, the
substitution version when it was last examined.

**Identity and normal form.** Each pending equation has a `PendingId`.
Its normal form is the residue flattened, each side's constants and
metas sorted, and the two sides ordered by a fixed total order on
rows. Re-examining an equation that waits again replaces its entry under
the same id; it never appends. If its new normal form equals another
pending equation's, the younger id is dropped and the older id and site
kept. So `pending` never holds two equal equations, and D4 is reported
once per equation.

**Index.** `naming` maps each meta to the ids of the equations whose
residue names it, updated on every replacement. A binding or a new fact
on a meta marks that meta changed (with the version).

**The drain.** After each top-level unification (P8), and in the end
loop (§6): re-examine every pending equation that names a meta changed
since its `seen`; repeat until a pass changes nothing. An unchanged
watch costs one set lookup per unification. A re-examination flattens
the residue, so labels that a binding brought in are cancelled (step 2,
once each), constants placed, the sum rule run, and the equation
dropped, committed, solved, failed or replaced.

**Nested equations.** If a label newly cancelled in a re-examination
has field types that meet a multi-tail row of their own, the nested
equation that waits takes the outer equation's `site` and `Owner`; the
expression being checked when it arose is kept only to locate a failure
(D6). The draft 1 problem (review F4):

```
{ a: { ...?p, ...?q }, ...?r, ...?s } ~ { a: { x: Int, y: Int }, z: Int }
```

cancels `a` once, defers `{ ...?p, ...?q } ~ { x: Int, y: Int }` once
(its own id), and leaves `?r ⊎ ?s = { z }` pending under another id.
Re-examining the outer equation sees no label `a`, so it cannot defer the
inner one again. Field types are not in the prototype; this part is
argued.

**Failures found by the drain** are reported at the expression being
checked, whose unification made the equation fail, with the text built
from the equation (D6) and `required here` at the equation's site (P9).

### 2.7 Termination, complexity and cost

**Termination.** Let Π be the metas made by instantiation and inference
and Κ the constants written in the program (labels and rigids). The
solver makes a meta only in a commit or a shared remainder, and each
such step puts a constant into the image of an unbound meta `u`. Let
owners(`u`) be the metas of Π whose flattened image contains `u` (`u`
itself if `u ∈ Π`); it is never empty, since a solver-made meta is
born inside an image. Images only grow and a flattened image never
holds a constant twice (well-formedness, checked at each binding), so
each such step adds a new pair to owners(`u`) × {`c`} ⊆ Π × Κ. Hence
at most |Π|·|Κ| solver-made metas. Then:

- each meta is bound at most once;
- lacks (metas × labels) and apart pairs ((metas + rigids)²) only grow;
  bounds only shrink (§2.5);
- a label cancels in an equation at most once (step 2) and enters a
  residue only through a binding, so the nested equations made from
  field types are finite; field types are finite trees (occurs check);
- the drain re-examines an equation only after a change to a meta it
  names, and a re-examination that waits again with an equal normal form
  changes nothing.

The measure (unbound metas still to bind, facts still addable, total
bound size, cancellations still possible) decreases with every change,
and a pass with no change ends the drain. Draft 1 counted commits per
equation; a commit in one equation adds its constant to every other
equation naming the meta, and each commit makes a fresh meta, so that
count did not decrease (review F10).

**Complexity.** With field types ignored, a row problem is a set of
equations, disjointness and lacks over metas, labels and rigids.

- *Satisfiability is NP-complete.* In NP: removing an atom the program
  does not mention from every meta keeps every constraint, so a solution
  assigns each meta a subset of the program's atoms, a polynomial
  certificate. NP-hard: positive one-in-three SAT reduces with one meta
  per variable, one label `t`, and one equation `?X ⊎ ?Y ⊎ ?Z = { t:
  Unit }` per clause (each meta is `{}` or `{ t }`, exactly one per
  clause; a repeated variable still works, `?x ⊎ ?x` forces `{}`).
- *Whether a least solution exists is the checker's question* (property
  L: accepted bodies get the least solution), and it is coNP-hard. Add
  one switch meta `?w` to every clause, `?X ⊎ ?Y ⊎ ?Z ⊎ ?w = { t }`. The
  solutions are `?w = { t }` with every other meta empty, plus each
  satisfying assignment with `?w = {}`. The meet of the first with any
  other leaves a clause with no `t`, so a least solution exists iff the
  formula is unsatisfiable. Brute force agreed on 400 random instances
  (Appendix A). It is in P^NP: one NP query per meta and atom computes
  the meet of all solutions, which is then checked.
- On one-in-three systems themselves a least solution exists iff the
  solution is unique (the meet of two distinct solutions leaves a clause
  with no `t`), the review's observation.

A Waxwing program can state these systems (`merge3` or `merge4`
passed for several parameters sharing type variables), so no
polynomial checker accepts exactly the bodies with a least solution
unless P = NP. Hence the policy: decide the forced cases, report the
rest, and state the incompleteness as testable properties (§12).
Acceptance itself is decidable: the checker always ends.

**Cost.**

- A commit makes one meta; a quiet equation makes none. Fresh metas are
  at most |Π|·|Κ|, so a flattened row has at most |Π|·(|Κ| + 1) + |Κ|
  parts. In the prototype's random stress (40 metas, 12 equations,
  3,000 problems) the worst was 12 solver-made metas against a bound
  of 196, at most 11 parts in a row, 19 ms per problem.
- Apart partners per meta are not bounded by a constant: one per merge
  the meta takes part in. A binding decomposes against each partner in
  `O(|image| × partners)`.
- A change re-examines only the equations the index names for that meta.
- Programs that call `merge` with known arguments never wait: each
  argument binds a lone meta (step 6).

### 2.8 Why this design (the literature)

- **Rémy (presence flags) and Wand (concatenation).** One tail per row;
  Wand showed that concatenation without disjointness has no principal
  types. Not chosen.
- **Leijen (scoped labels).** Duplicate labels shadow; ADR 002 and ADR
  013 rejected them, and the user's merge forbids overlap.
- **Harper and Pierce (symmetric concatenation).** Merge needs explicit
  compatibility assertions in the quantifier: the user's `where r
  disjoint s` is that, so the surface matches a known sound calculus.
- **Gaster and Jones (lacks predicates).** Lacks as qualified-type
  predicates, already Waxwing's model (R001, Task 2). Disjointness is
  the same idea between two variables; an upper bound is its dual on
  one variable.
- **Ur/Web (Chlipala).** Disjointness obligations `[r1 ~ r2]`, a prover
  that decomposes them over known fields and variables, and a unifier
  for concatenations that defers and is incomplete by design. Closest
  in spirit; chosen for the obligation store and its decomposition.
- **Morris and McKinna (Rose).** A general row theory with a combination
  predicate `ρ1 ⊙ ρ2 ~ ρ3`; their predicate is what `pending` holds,
  but Waxwing needs no evidence passing (every function is specialized)
  and no generalization over it (signatures are explicit).
- **Stickel (AC unification).** The `k × l` basis for unit
  coefficients is the meaning of a quiet equation (§2.2).

Influence is conceptual only; no reference code is used.

## 3. Persistent disjointness

### 3.1 Decomposition

`require L # R`, both flattened:

1. A label on both sides: the overlap, D2 (both labels are known).
2. Each label of one side against each tail of the other: a lack. On a
   meta it is added (with this `Because`, by the precedence of §1.3); on
   a rigid it must be a hypothesis, else `s may already have field a`.
3. Each tail of one side against each tail of the other: an apart pair.
   - The same meta twice: `x # x` holds only for the empty row, so the
     meta is bound to `{}` (forced, not a choice).
   - The same rigid twice: D3', `r is in both records`.
   - Two rigids: must be a hypothesis, else D3.
   - Otherwise the pair is stored.

A row's own disjointness is the same check between its parts: each
tail against the fields, each pair of tails. It is recorded where the
row is made (§1.4), not at each unification.

### 3.2 The bind rule (RecordTail `bindTail`, generalised)

Binding an unbound meta `?m := F ⊎ T` (flattened):

1. No label of `F` is one `?m` lacks (today's rule 4; the failure is
   D1 or D2 by the lack's `Because`).
2. The image's constants lie within `?m`'s bound (U3; else D6).
3. Each label `?m` lacks passes to each tail in `T`: a meta inherits it
   with its `Because`; a rigid must already lack it (today).
4. Each apart partner `p` of `?m` is removed from the store and
   re-required as `(F ⊎ T) # p`, keeping its `Because`.
5. The image's own disjointness is required (§3.1's last paragraph).
6. Each meta of `T` is narrowed to the bound minus the constants (U3).
7. The occurs check runs on the resolved image (today's `place`).
8. `arrivedAt` is stamped, and the metas naming index marks `?m`
   changed.

Steps 3 and 4 make the obligation persistent: it is re-expressed on
whatever the meta becomes, field or tail, however late, and is never
replaced by the set of labels known when it was made.

### 3.3 Worked example: a merge of merges, generically

```wxw
fn three(a: { ...r }, b: { ...s },
    c: { ...t }): { ...r, ...s, ...t } = merge(merge(a, b), c);
```

The result type gives `r # s`, `r # t`, `s # t` (implied under §14.1
option A; under option B the signature must write them). Inner use:
`?r1 := r`, `?s1 := s`, so `?r1 # ?s1` becomes `r # s`, a hypothesis.
Outer use: `{ ...?r2 } ~ { ...r, ...s }` binds `?r2 := { ...r, ...s }`
(step 6); its pair `?r2 # ?s2` decomposes into `r # ?s2` and `s #
?s2`. Then `?s2 := t` turns those into `r # t` and `s # t`, both
hypotheses. The result `{ ...r, ...s, ...t }` cancels against the
signature's, tail by tail.

With result `Int` and only `where r disjoint s`, the same steps reach
`r # t` with no hypothesis: D3 `r and t are not known to be disjoint;
add where r disjoint t`, at `c`, noted `required here` at merge's
clause. (Both prototypes run both, Appendix A.)

## 4. The mixed case and wrappers

`{ a: Int, ...r } # { ...s }` decomposes into `s lacks a` and `r # s`
(§3.1 steps 2 and 3). Both are facts on variables in the substitution,
so both survive substitution and every call path.

```wxw
fn tagged(p: { id: Int, ...r }, q: { ...s }): Int = size(merge(p, q));
```

Here and below, `size` is any function over `{ ...q }` returning `Int`;
it only consumes the merged record.

`?r := { id: Int, ...r }`, `?s := s`. The pair `?r # ?s` needs `s lacks
id` (no hypothesis: `s may already have field id` at `q`, noted `s is
introduced here` and `required here` at merge's clause) and `r # s` (no
hypothesis: D3 at `q`). Only the first failure is reported. With
`where s lacks { id }, r disjoint s` the body checks, and every caller
of `tagged` meets those clauses through the use's metas, with
`Lacks` and `Disjoint` provenance naming `tagged`'s clause.

**Through generic wrappers** the rule is Task 2's: inside a wrapper
whose own clause (or result type) states the fact, the callee's
obligation is met by the wrapper's rigid hypothesis, and the wrapper's
callers are checked against the wrapper's clause, reported at their
argument and noted at the wrapper's clause. A wrapper without the fact
is refused inside itself, at the argument that completed the
obligation, noted at the callee's clause. Provenance flows with each
decomposed fact: a lack that came from `r disjoint s` keeps that
`Disjoint`, so its violation is D2 with the clause note, not D1, unless
a written `lacks` clause also names the label, which wins by §1.3.

## 5. Access, removal and rest binders over multi-tail rows

### 5.1 Tranche A today

Tranche A computes a removal's result as the receiver's resolved type,
after `select` has required each label, minus the labels
(Features.Check.Removal `remainder`); a rest binder's type is likewise
the expected type, resolved after the fields' checks, without the
written labels. With at most one tail this is correct: `select` either
finds the label among the fields or binds the tail to `{ l: α, ...ρ }`,
so the resolved type always shows the label and the subtraction removes
it. Verified on the current compiler: `fn(p) => p without { x }`
applied to `{ x: 1, y: 2 }` and then `.x` is refused with `x is not a
field of { y: Int }`; `.y` runs and prints 2; a rest binder behaves the
same. There is no current bug.

### 5.2 The requirement on Tranche B

With several tails, `select` can wait: on `{ ...?r, ...?s }` the label
`x` has two homes. The resolved type then shows no `x`, a subtraction
removes nothing, and once `?r` is bound `x` reappears in the result
(review F1):

```wxw
fn main(): Int = {
  let drop = fn(p, q) => merge(p, q) without { x };
  drop({ x: 1 }, { y: 2 }).x
};
```

would check and print 1, since lowering builds the removal from the
result type (Format/Go/Expression `lowerRemoval … term.ty`). So in
Tranche B (P10):

- `e without { l1, …, ln }` requires `e` against `{ l1: α1, …, ln: αn,
  ...ρ }` in one requirement, with `ρ` and the `αi` fresh, and its type
  is `ρ`. It is never computed from a resolved type.
- A record pattern `{ l1, …, ln, ...rest }` requires the scrutinee
  against the same row; `rest` has type `ρ`.
- `{ l: α, ...ρ }` is a row the checker makes, so its creation
  obligation (`ρ lacks l`) is recorded (§1.4). Access to `x` on the
  result therefore fails at once, while the equation still waits: in
  the prototype, `.x` on `ρ` is refused by `ρ lacks x` before `?r` or
  `?s` is known.
- When the equation is solved later, `ρ` is whatever is left: with `?r
  := { x: Int }` and `?s := { y: Int }`, `ρ = { y: Int }`; with `?r :=
  { y: Int }` and `?s := { x: Int }`, also `{ y: Int }`; with neither
  holding `x`, D6 at the argument that showed it.
- Lowering is unchanged: after specialization `ρ` is ground, so
  `lowerRemoval … term.ty` copies exactly the receiver's other fields.

The printed result in Tranche A's text is `ρ` as resolved when the
error is found; while it waits that is `{ ..._ }`, so the text reads `x
is not a field of { ..._ }`. Proposed to keep the text and add the note
`removed here` at the `without` (or at the pattern's label).

Regression rows (§12): `r005b-without-hole-left`, `-right` (the label
held by either part) and `r005b-rest-hole`.

## 6. The end of a body

Waxwing has no generalization: functions are fully annotated, lambdas
are monomorphic and checked inside their function, and a `let` is not
generalized. So nothing can become a new written constraint (inference
of constraints is INF001's, out of scope).

**The joint fixpoint** (review F7). The end of a body today runs the
settle rounds of `settleRestricted` (Features.Check.Settle) and then
`settleFinal`. A round's retry binds metas outside a top-level
unification, so a pending equation it unblocks would never be drained.
Proposed: each round ends with a drain, and a round in which the drain
changed anything counts as changed (beside "decided a pair" and
"changed a label count"). The rounds therefore stop only when neither
the effect rows nor the record equations move.

**Then, in order:**

1. **Facts on unsolved metas** (lacks, apart pairs, bounds) and **quiet
   equations** are met by the empty row. Lowering already reads an
   unsolved record tail as the empty rest (Specialize/Record, Values),
   so accepting them is exactly what runs. Property L (§12) checks that
   this default is the least solution of what was accepted.
2. **A pending equation with a constant** is D4, at its site. By
   construction it still has a constant with two homes, so the default
   cannot satisfy it. D4 is reported before `settleFinal`'s `Fail needs
   a concrete error family`, so a `Fail` payload like `{ ...?r, ...?s }`
   whose key waits on the equation reports the real ambiguity.
3. `settleFinal`, as today.

**Postponed pairs.** A postponed effect pair reverts the substitution,
and with it any record equation deferred while its labels were unified.
`RowPair` keeps the site of its unification, so an equation deferred
again at the retry takes that site, and its bindings are stamped with it
in `arrivedAt`.

**Facts on rigids** never wait: each is checked against the signature's
hypotheses when it arises (§3.1), at the expression that made it.

So residual obligations never become required written constraints, and
the only end-of-body error from records is D4.

## 7. Two multi-tail rows with holes on both sides

`{ ...?a, ...?b } ~ { x: Int, ...r }` (rigid `r` lacking `x`): the
constants `x` and `r` each have two homes, `?a` and `?b`. The checker:

1. bounds `?a` and `?b` by `{ x, r }` (sum rule), and defers the
   equation, at the site of the unification that met it;
2. re-examines it whenever `?a` or `?b` is bound or gains a fact: if
   `?b` comes to lack `x`, `x` is committed to `?a`; if `?a` is bound
   to `{ x: Int }`, cancellation leaves `{ ...?b } ~ { ...r }`, solved;
3. if the function ends with it pending: D4 at that site, naming the
   first constant with two homes (labels before rigids, labels in
   order).

With metas on both sides and no constants (`{ ...?a, ...?b } ~ { ...?c,
...?d }`) the equation is quiet (§2.2): it is never ambiguous and builds
nothing.

## 8. Declarations that no call can use

**Interchangeable tails** (review F9). In `fn split(p: { ...r, ...s }):
Int`, every type that has `...r` also has `...s`, and the two have the
same facts. Swapping `r` and `s` then maps every solution at a call to
another solution, and the meet of the two leaves both empty (they are
disjoint). So at every call where `r ⊎ s` holds anything, no least
solution exists and the call is D4; the function can only be called
with an empty record there. The declaration is the mistake, as with
Haskell's ambiguity check.

Proposed check, at each signature and each declared type: two record
variables `r`, `s` are interchangeable when every row written in it (at
any depth, parameters, result, callbacks and declared-type arguments)
has both or neither, and they have the same lacked labels, the same
partners other than each other, and appear symmetrically in its
clauses. Interchangeable variables are D7 at the first row that has
both. The check is sound (every D7 declaration has only empty calls
there) and deliberately narrow: `fn f(p: { ...r, ...s }, q: { ...r, ...t
})` is not D7, because `f({ x: 1 }, { y: 2 })` forces `r = {}` through
the bounds, although `f({ x: 1 }, { x: 2 })` is D4 at the call. A
declared type is checked over its constructors' payloads:
`type Both(...r, ...s) = Both({ ...r, ...s })` is D7.

**A repeated tail.** `{ ...r, ...r }` written in a type, or reached
through a declared type (`Pair(...a, ...a)` where `Pair` concatenates
its arguments), is D8 at resolve. Without it, the implied `r # r` would
force callers to `{}` without a word. `where r disjoint r` (slice 2)
is D9.

## 9. Specialization and lowering

**Canonical form.** Under a key every rigid is replaced by its key row,
so a multi-tail row flattens to a closed row: the fields of all tails
joined and sorted, unsolved tails empty (today's rule). The layout is
then hash-consed as today (Specialize/Layouts). A label twice is
Specialize's existing E_INTERNAL `Duplicate record label`, unreachable
if the checker is sound. A row slot's key row is unchanged; `merge` at
`r = { a }, s = { b }` and at `r = { a, b }, s = {}` are two copies with
one result layout.

**The merge literal.** Items are evaluated left to right into typed
temporaries inside the immediately invoked closure (ADR 013 "Go
lowering"); a literal or a local name is used in place. The struct is
then built field by field in sorted label order, each field read from
the one item that supplies it, known from the items' ground layouts:

```go
func() waxwingRec3 {
  t0 := p                    // ...p, a local, used in place
  t1 := f()                  // x: f(), may perform an effect
  t2 := g()                  // ...g()
  return waxwingRec3{f_a: t0.f_a, f_b: t2.f_b, f_x: t1}
}()
```

No composite literal holds an effectful expression, so Go's unspecified
evaluation order is never relied on. A spread whose layout is empty
contributes no field but is still evaluated.

**Instantiation rule.** Passing `{ ...r, ...s }` to a record slot of a
recursive call is growth under ADR 007's rule (NestedArguments
`admissibleSlot`): the existing `Recursive call to g changes its type
arguments`.

**Until lowering lands.** Slices 4 and 5 accept multi-tail programs
that slice 6 lowers. Until then Specialize reports an `R005 placeholder`
for a multi-tail row (as slice 2 does for checking), so `npm run
verify` stays green.

## 10. Diagnostics (all Proposed)

All E_TYPE. Location rules follow the table.

| ID | Case | Text | Location and notes |
|---|---|---|---|
| D1 | A known field meets a lack a `lacks` clause wrote | Task 2's approved `admin is not allowed here: r lacks { admin }` | the argument (or item) being required; `required here` at the label in the clause |
| D2 | A known overlap under disjointness, in a call | `Field a is in both records: r disjoint s` | the later contributing argument; `first written here` where the other side's field arrived (`arrivedAt`); `required here` at the clause, or at the later `...s` of the implying type |
| D2' | A known overlap in a literal with several spreads | existing `Duplicate field a` | when the items' types already show it: the later item, noted `first written here` at the earlier (Tranche A's rule, extended to spreads); when found later: the expression that completed it (rule 1), notes `first written here` at the earlier item and `written again here` at the later |
| D3 | No evidence that two rigid rows are disjoint, no overlapping label known | `r and s are not known to be disjoint; add where r disjoint s` | the expression being required; `required here` at the obligation's clause or implying type; none for a literal |
| D3' | The same rigid in both rows | `r is in both records and may have fields` | as D3 |
| D3'' | A known label against a rigid under disjointness | existing `s may already have field a` | the expression being required; `s is introduced here` at the signature's first `...s`; `required here` at the clause |
| D4 | A pending equation with a constant at the end of a function | `Cannot tell whether merge's r or s has field x` (or `holds t` for a rigid); `{ ..._, ..._ }` style `Cannot tell which part of { ..._, ..._ } has field x` when no callee owns the metas | the site of the unification that deferred it; hint `a type for r or s here would decide it` |
| D5 | (withdrawn with P5) | | |
| D6 | A failure caused by a pending equation or a bound | `merge's { ...r, ...s } must be { x: Int, y: Int }, so r cannot have field z`; when no part can: `…, but neither r nor s can have field x` | the expression being checked (rule 1); `required here` at the equation's site |
| D7 | Interchangeable tails in a declaration (§8) | `r and s cannot be told apart: every type here has both or neither` | the first row with both; note `so a call can only pass an empty record here` |
| D8 | A repeated tail in a written row | `...r is written twice in one record` | the second `...r`; `first written here` at the first |
| D9 | `where r disjoint r` | `A row cannot be disjoint from itself` | the clause's second `r` |
| D10 | (only under §14.1 option B) two rigid tails in one signature row with no clause | `{ ...r, ...s } needs where r disjoint s` | the later `...s` |

Location rules:

1. The error is at the expression whose requirement failed (Require
   `expectType`, Reject for consumptions). Arguments are checked left
   to right, so in a call it is the later contributor. This rule wins
   over any other, including D2' found late.
2. `first written here` marks the earlier contributor: in a literal, the
   item; in a call, the site where the other side's field arrived
   (`arrivedAt`). Every binding is stamped (§1.3): by a requirement, by
   a commit or the drain within one, or by the end loop with the
   postponed pair's site. A label that arrives from a signature type is
   noted at that type's field. So the note is always present; draft 1's
   "omitted when unknown" is withdrawn.
3. `required here` marks why the obligation exists: a clause's
   constraint, for an implied one the later `...s` of the type, and for
   D6 the waiting equation's site.
4. A message names the variables a fix would mention: D3 names the
   enclosing signature's rigids (the clause to add is theirs), while
   its note shows the callee's requirement. D4 and D6 name the callee's
   variables through the equation's `Owner`.
5. Of several violations, the first in decomposition order is reported:
   labels before tails, each in sorted order.

D2 could instead mirror D1 as `a is not allowed here: r disjoint s`;
the draft keeps a distinct text because the user asked for separate
messages.

# Part II: evidence and plan

## 11. What a test can and cannot show

The checker is sound and order independent by construction and by
test; it is incomplete by design (§2.7). The properties below are each
decidable on a generated problem, so a failure is a defect and a new
seed cannot turn the suite red by finding a new instance of the
intended incompleteness.

## 12. Oracle and tests

**Reference.** A new test/row-merge-oracle.mjs, written from this
document's rules and not from the PureScript: atoms are labels and
rigid names, a meta denotes a set of atoms, and a rigid's lacks and
disjointness hold only by hypothesis (rigids are uninterpreted, as in
the checker; by parametricity this equals the universal reading). It
enumerates every assignment of the metas to subsets of the atoms (3
labels, up to 2 rigids, up to 7 metas, depth-first with pruning) and
returns all solutions and the least one (their meet, when it is itself
a solution). The atom universe is adequate: removing an atom no
constraint mentions from every meta keeps every constraint.

**The harness drives creation-site obligations only.** An equation is
passed to the checker as the unification it is; the disjointness of its
rows is passed separately, where the row is made (§1.4), as the
compiler records it. The checker's unification does not check
well-formedness itself, so a creation site the implementation forgets
shows up as a soundness failure (review F13).

**Properties**, each checked on every generated problem:

| Property | Statement |
|---|---|
| S, soundness | accepted ⇒ the checker's solution, unsolved metas empty, is a solution |
| H, honest refusal | refused with D1-D3, D6 or a mismatch ⇒ no solution exists |
| L, least | accepted ⇒ that solution is the least solution |
| C1, single wait | D4 with exactly one pending equation (quiet ones counted) ⇒ no least solution exists |
| C2, order | the verdict class (accept, refuse, D4) is the same for every order of the constraints |
| C3, the rest (reported) | every D4 with a least solution has two or more pending equations sharing a meta; its rate per generator is printed and compared with a recorded ceiling |

C1 and C2 are the testable completeness: a stuck single equation is
genuinely ambiguous, and no verdict depends on the order the program
happens to present constraints in. C3 is the stated incompleteness. Its
rate is reported rather than pinned case by case; a rise above the
recorded ceiling fails the run, a fall is a deliberate change to record.
Pinned fixtures are the instances that are hard by §2.7, not random
finds: the uniquely satisfiable one-in-three systems and the switch
systems with an unsatisfiable formula, which stay D4.

**Generators.**

- *Raw*: random equations, disjointness and lacks over 2-4 metas,
  0-2 rigids with random hypotheses.
- *Program-shaped*: expression trees of `merge` (depth 2) over leaves
  that are literals, rigid-tailed rows (a generic wrapper's parameters,
  hypotheses as its clauses) or bare metas (lambda parameters); some
  uses fix the result before the arguments (a higher-order use), some
  check arguments right to left; composition and wrappers by
  construction.
- *Shared parameter* (review F2): 2 or 3 higher-order parameters sharing
  a type variable, `both(merge, merge)` and its family, with and without
  later arguments.
- *Dense*: several two-meta sums against labels sharing metas, to hunt
  stuck-but-determinate cases.

**At two levels.**

1. test/row-merge.test.mjs drives Features.Check.Unify (through a
   small exported entry, like test/unify.test.mjs) on the generated
   problems against the oracle, each in five constraint orders.
2. A program generator renders the program-shaped and shared-parameter
   problems as Waxwing sources (`merge`, wrappers with and without
   clauses, `let` references, partial applications, `apply2`-style and
   `both`-style uses, `without` and rest binders on merge results) and
   compares the compiler's verdict class with the oracle's; accepted
   programs also run in Go and in the reference interpreter
   (test/fx-oracle-records.mjs gains spreads), which must agree.

**Regression rows** (each proved failing in an isolated copy with its
defect restored):

| Row | Defect restored | Probe |
|---|---|---|
| `r005b-apart-persist` | a bound meta drops its apart pairs | `merge(merge(a, b), c)` with `a` and `c` sharing `x` accepted |
| `r005b-mixed-lacks` | label/tail decomposition skipped | `{ id: Int, ...r }` merged with `{ ...s }` accepted without `s lacks { id }` |
| `r005b-mixed-tails` | tail/tail decomposition skipped | the same with the lack written, accepted without `r disjoint s` |
| `r005b-provenance` | a decomposed lack loses its `Because` | D1's text where D2's is due, through a wrapper |
| `r005b-precedence` | the first reason seeded wins | merge's D2 note at the result type instead of the clause |
| `r005b-defer` | ambiguous constants placed in the first home | `apply2(merge, { y: 2 }, { x: 1 })` refused |
| `r005b-upper` | no upper bounds | `both(merge, merge)` D4 |
| `r005b-quiet` | quiet equations expanded | `h(merge × 12)` takes seconds (timing row, generous bound) |
| `r005b-pending-dedup` | re-deferral appends | the nested-field equation of §2.6 reports D4 twice |
| `r005b-pending-end` | pending equations dropped at the end | `apply0(merge)` accepted; layouts disagree |
| `r005b-end-fixpoint` | no drain in the settle rounds | a body whose effect retry unblocks a record equation is D4 |
| `r005b-drain-text` | drain failures use Require's own text | `apply2(merge, { z: 1 }, { y: 2 })` reads `Expected { ..._ }, found { z: Int }` |
| `r005b-self-apart` | `x # x` not forcing `{}` / rigid allowed | `merge(p, p)` over `{ ...r }` reaches `go build` with a field twice |
| `r005b-cancel` | common tails not cancelled | `{ ...r, ...s } ~ { ...s, ...r }` refused |
| `r005b-body-type` | Resolve.Lacking ignores tail pairs | a lambda annotated `{ ...r, ...s }` under a signature without the fact accepted |
| `r005b-without-hole-left`, `-right` | removal subtracts from the resolved type | `drop({ x: 1 }, { y: 2 }).x` and `drop({ y: 2 }, { x: 1 }).x` run |
| `r005b-rest-hole` | the rest binder subtracts | `match merge(p, q) { { x, ...rest } => rest.x }` runs |
| `r005b-interchangeable` | no declaration check | `fn split(p: { ...r, ...s }): Int` accepted, D4 at each call |
| `r005b-merge-order` | items built in label order | effects in `{ ...g(), x: f() }` run out of order |

Plus: the one-tail differential (§2.3) over `--corpus all` shows no
change from the representation slice and from the new unifier.

## 13. Task breakdown (for the implementation plan)

Each slice keeps every commit building and `npm run verify` green.

1. **Representation.** `tails ∷ Array v`; every consumer handles any
   number, every producer still makes at most one. Behaviour-preserving;
   differential `--corpus all` shows 0 differences. About 44 modules
   name `TRecord`; mechanical but wide.
2. **Surface.** Types with several `...` tails parse and resolve (sorts:
   each tail a record use); `where r disjoint s` (Format.Parse.Constraint,
   Resolve.Requirements, Resolved `Disjoint`); D8, D9, and D10 if §14.1
   goes to option B; Resolve.Lacking and ArgumentClash learn pairs.
   Checking a multi-tail type is an `R005 placeholder` until slice 4.
3. **The store, single-tail.** `apart`, `because` with its precedence,
   `upper`, seeding for bodies and uses (Seed, Use, Implied `declared`
   with pairs), decomposition and the bind rule. Testable before
   multi-tail unification: `fn g(a: { ...r }, b: { ...s }): Int where r
   disjoint s` called as `g(p, p)` over `{ ...t }` is D3'; over `{ x:
   Int }` twice, D2.
4. **Multi-tail unification, forced only.** Flatten, cancel, the sum
   rule, homes, commits, the shared remainder; a constant with several
   homes or a quiet residue is an immediate `R005 placeholder` error.
   Oracle test level 1 lands with S, H, L and C2.
5. **Pending equations.** `pending` with identity, normal form and the
   index; the drain after each top-level unification; nested sites;
   the joint fixpoint with the settle rounds (§6); D4, D6. C1 and C3
   join the oracle test.
6. **The merge literal and friends.** Several spreads (Tranche A's
   `at most one spread` text retires), access, removal and rest binders
   by §5.2 (fresh rest row, never subtraction), record patterns over
   multi-tail rows; D1-D3 locations and notes; D7. Specialize keeps its
   placeholder for multi-tail rows.
7. **Specialization and lowering.** Canonical form, the struct from
   several sources, evaluation order; the placeholder retires; Go and
   interpreter agree.
8. **Evidence.** The program generator (§12 level 2), regression rows,
   ADR 013 section, docs/language.md, BACKLOG.

**Risks.**

- Slice 1's churn collides with concurrent record work (Task 3
  lowering); land it on a quiet main.
- Drain cost on large bodies: one index lookup per unification when
  nothing is pending; measure on the scale programs (R001, T003).
- Apart partners grow with the number of merges a meta joins; measure.
- The sum rule runs at every examination; if it shows in profiles, run
  it only when a meta of the residue changed.
- `arrivedAt` is new provenance state on every binding; if costly,
  stamp only metas that occur in a record row.
- Postponed effect pairs revert the substitution; the store must revert
  with it (it lives there), and a test should pin that.
- The precedence of §1.3 changes which note Tranche A prints when a
  clause repeats an implied lack; the affected expectations move in
  slice 3.
- Field types in pending equations (§2.6) are argued, not prototyped.
- Timing tests: slices run one at a time, as now.

## 14. Open questions

1. **Implied or required `disjoint`** (review F8). The settled `merge`
   writes `where r disjoint s` beside a result type `{ ...r, ...s }`.
   - *Option A, implied* (draft 1's P3): a row with two tails implies
     their disjointness, as `{ a: A, ...r }` implies `r lacks a`
     (shipped, docs/language.md). Writing the clause is allowed and
     redundant; its only effect is provenance, which by §1.3 prefers it,
     so merge's notes cite the clause. No new text; declared types,
     which have no `where`, work the same way.
   - *Option B, required*: two rigid tails in one row of a signature
     without the clause is D10 at the later tail. Every hypothesis a
     body uses is then written, and the user's clause is what makes
     `merge` check. Costs: it departs from implied lacks, and a declared
     type `type Both(...r, ...s) = Both({ ...r, ...s })` would need a
     `where` on type declarations (new surface) or stay implied (two
     rules).
   - *Recommendation*: A, for symmetry with implied lacks and because
     declared types need no new surface; the precedence keeps the
     user's clause visible in every note. If the user wrote the clause
     because they expect it to be needed, B is coherent and costs one
     text and the declared-type decision.
2. **How complete to be.** Draft 2 adds upper bounds and the sum rule
   and keeps the rest of the incompleteness as C3. Two further steps
   were measured: building the `k × l` basis for a quiet equation when
   it shares a meta with a waiting one (removes the 20 raw runs of §2.2,
   brings back the geometric cost in the stress, worst 3.7 s), and a
   bounded search at the end (exponential). Proposed: neither.
3. **Printing order of tails.** Proposed: fields in label order, then
   rigid tails in signature order, then `..._` for metas.
4. **D2's wording** (§10, last paragraph), and the texts D4, D6-D10.
5. **D7's reach.** The proposed check is sound and narrow (§8). A wider
   one (every variable never alone in a row) would also reject
   functions some calls can use, such as `f` in §8. Proposed: narrow.

## Proposed decisions, collected

| ID | Decision |
|---|---|
| P1 | `RecordRow` holds `tails ∷ Array v`, sorted, repeats kept |
| P2 | The obligation store (`apart`, `upper`, `pending`, `naming`, `because`, `arrivedAt`) lives in the substitution |
| P3 | §14.1: option A (implied, the clause redundant but preferred in notes) or option B (required, D10); recommendation A |
| P4 | Acceptance: forced moves only, with upper bounds and the sum rule; quiet equations met by the default; a pending equation with a constant at the end is D4 |
| P5 | Withdrawn: no part cap; the solver makes at most (program metas × constants) metas (§2.7) |
| P6 | Unsolved metas default to the empty row at the end, as lowering already does |
| P7 | The texts D1-D10 and the location rules of §10 |
| P8 | The drain runs after each top-level unification and in each settle round |
| P9 | A failure found against a pending equation or a bound is reported at the current expression with D6 and `required here` at the equation's site |
| P10 | `without` and rest binders take the fresh rest row of one requirement, never a resolved type minus labels |
| P11 | Provenance precedence `Lacks`, `Disjoint`, `Implied`, `Spread`, then the earlier span, for lacks and pairs |
| P12 | Interchangeable tails are D7 at the declaration; a repeated tail is D8 at resolve |
| P13 | Pending equations hold the residue, have an identity and a normal form, are replaced on re-deferral and indexed by meta |

# Appendix A: prototypes (toys, not the compiler)

All in the session scratchpad (/private/tmp/claude-501/…/scratchpad),
not part of the repository. JavaScript, labels only (field types
ignored), no imports from output/.

**Draft 1** (solver.mjs, solver-upper.mjs, oracle.mjs, run.mjs,
dense.mjs, examples.mjs): the solver of draft 1 with eager `k × l`
expansion; the upper-bound variant bounded a meta only from an equation
with no tails on the other side. The review's scripts (review/: bf.mjs,
an independent brute force; drive.mjs, perm.mjs, shared.mjs, cx1.mjs,
cx2.mjs, sat13.mjs and their `-upper` variants) run those solvers.

**Draft 2** (d2/solver2.mjs, about 380 lines): §2 as written here. No
well-formedness inside unification (creation sites only, driven by
d2/drive2.mjs before each equation); the sum rule for bounds, lacks and
apart facts on every residue; commits one constant at a time; quiet
equations; pending equations with identity, normal form, replacement,
deduplication, and re-examination only when a named meta changed; an
optional `expand` that builds the basis for a quiet equation sharing a
meta with a waiting one (§14.2).

**Runs for draft 2.** `perm3.mjs` runs each problem in five constraint
orders (the given one, reversed, three shuffles) against review/bf.mjs.
Dense and raw: 8 seeds × 12,000 problems each, so 480,000 runs per row.

| Solver, generator | Runs | S, H, L | C2 order differences | C1 violations | D4 with a least solution |
|---|---|---|---|---|---|
| draft 2, dense | 480,000 | 0 | 0 | 0 | 3,205 (0.67%), all within C3 |
| draft 2, raw | 480,000 | 0 | 0 | 0 | 45, all within C3 |
| draft 2 + expand, dense | 480,000 | 0 | 0 | 0 | 3,205 |
| draft 2 + expand, raw | 480,000 | 0 | 0 | 0 | 25 |

Comparison on 5 seeds × 12,000 problems × 5 orders (300,000 runs per
row), same problems, same brute force:

| Solver | Dense: D4 with least | Raw: D4 with least | S, H, L, C2 |
|---|---|---|---|
| draft 1 (eager basis) | 22,050 (7.35%) | 120 | 0 |
| draft 1 with the review's upper bound | 2,130 (0.71%) | 15 | 0 |
| draft 2 | 1,975 (0.66%) | 25 | 0 |

In the raw rows, the 20 runs (4 problems × 5 orders) that `expand`
removes are each one equation with a constant waiting beside a quiet
one that shares a meta, e.g. `?m3 ⊎ ?m0 = ?m2 ⊎ ?m1` with `?m0 ⊎ ?m1 =
{ a } ⊎ ?m2`: only the basis's pieces show that `a` must be in `?m1`.
Counting quiet equations as pending, C1 holds there; that is why C1
counts them.

**Other draft 2 runs.**

| Script | What | Result |
|---|---|---|
| d2/cx1.mjs | `both(merge, merge)` | accepted, the unique solution |
| d2/shared.mjs | review F2's 392 programs | 186 with a least solution, all accepted; draft 1: all D4 |
| d2/sat13.mjs | uniquely satisfiable one-in-three systems | D4, as intended (pinned fixtures) |
| d2/switch2.mjs | switch systems over unsatisfiable formulas (a least solution exists) | 308 of 308 D4, as intended (pinned fixtures) |
| d2/switch.mjs | §2.7's switch construction, 400 random formulas | a least solution exists iff the formula is unsatisfiable: 400 of 400 |
| d2/cx2.mjs | `h(merge × n)`, n up to 40 | accepted; no fresh meta, n apart pairs, n − 1 quiet equations, ≤ 3 ms (draft 1: 2^n parts, n = 9 in 4.3 s) |
| d2/growth.mjs | the same with z = { a, b }, then each part fixed | D4 (genuinely ambiguous), then accepted; n = 60 in 38 ms |
| d2/growth.mjs | random stress, 40 metas, 12 equations, 3,000 problems | worst 12 solver-made metas (bound 28 × 7 = 196), ≤ 11 parts in a row, ≤ 19 ms |
| d2/run2.mjs | draft 1's program-shaped and raw generators, with and without shared parameters, 10 × 4,000 | no soundness or honesty failure; no D4 with a least solution in program-shaped problems |
| d2/removal.mjs | `without { x }` on `{ ...?r, ...?s }` (§5.2) | waits; `.x` on the rest refused at once; `ρ = { y }` with `x` in either part; no part with `x` refused |

**Found by the draft 2 prototype and folded in.**

- The sum rule's lack must check rigid constants: a rigid in `C2` that
  may hold the label blocks it. The first version derived `?m0 lacks a`
  from `{ ...R, ...?m1 } = { ...?m0 }` and refused satisfiable programs;
  the program-shaped generator found it.
- C1 must count quiet equations (above).
- Building the basis on demand reintroduces the cost: in the random
  stress, 254 solver-made metas and 3.7 s for one problem.

Not covered by either prototype: field types (so §2.6's nested
equations), provenance and texts, specialization and lowering, effect
rows and the joint fixpoint of §6.
