# Open-row merge: the algorithm (R005 Tranche B)

Status: Draft, 2026-10-16, written unattended; every choice is Proposed
and needs the user's review.

Answers the algorithm pass that draft 2 of the record extension design
(docs/plans/2026-10-16-record-extension-design.md §6) requires before
Tranche B is planned. No code. The prototype in Appendix A is a toy
solver in JavaScript, not the compiler.

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
- **Disjointness is a predicate on variables, kept in the substitution**
  (Gaster and Jones's lacks predicates, extended with Harper and
  Pierce's compatibility assertion `r # s`). Every obligation between
  two rows is decomposed into label/label (checked at once),
  label/tail (a lack) and tail/tail (an apart pair). Pairs on metas
  persist and are decomposed again whenever a meta is bound, so they
  are never approximated by the labels known at the time.
- **Equations between rows are solved by linear AC unification**
  (Stickel's basis for `x1 + … + xk = y1 + … + yl`), restricted to the
  cases with exactly one answer. Common labels and common tails cancel.
  Each remaining constant (a label or a rigid tail) needs a home among
  the other side's metas. With exactly one admissible home it goes
  there; with several the equation is deferred and re-examined when a
  meta in it is bound or gains a fact; with none it fails.
- **Bodies, not signatures, end with residue.** Signatures are explicit
  and nothing is generalized, so no residual becomes a constraint. At
  the end of a function, obligations on unsolved metas are met by the
  empty row, the row lowering already gives them. A still deferred
  equation is an ambiguity error.
- **Why not complete.** Deciding whether deferred equations have a
  solution is NP-complete (§2.6). The checker decides only the cases
  where the answer is forced, and says so when it is not.

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
apart   ∷ Map Flex (Map Flex Because)  -- symmetric pairs of tails
pending ∷ Array RowEquation            -- deferred equations
because ∷ Map Flex (Map String Because) -- generalises `written`
boundAt ∷ Map Int Span                 -- where a record meta was bound

data Because
  = Clause { variables ∷ Array String, span ∷ Span } -- `where …`
  | Implied { span ∷ Span }    -- a type with two tails, at the later
  | Spread { earlier ∷ Span, later ∷ Span }          -- a literal

type RowEquation = { left ∷ Row, right ∷ Row, site ∷ Span }
```

- `apart` holds pairs whose two sides are each a rigid or an unbound
  meta. Rigid pairs are the body's hypotheses (seeded from the
  signature, like rigid lacks); meta pairs are obligations.
- `because` replaces `written` (Task 2): for each lacked label, why it
  is lacked. Task 2's `{ variable, span }` becomes `Clause`. An apart
  obligation that decomposes into a lack passes its own `Because` on, so
  a violation knows whether it broke a `lacks` clause (text D1) or a
  disjointness (text D2).
- `boundAt` is stamped by Require after each unification it starts,
  for metas bound during it. It only feeds the `first written here`
  note of D2.
- `pending` equations are stamped with the site whose requirement
  deferred them. The whole store lives in the substitution, so a
  postponed effect row pair that reverts the substitution reverts it
  too, as `watch` and `marks` do.

### 1.4 Where multi-tail rows and obligations come from

| Source | Row | Obligations recorded |
|---|---|---|
| A signature type `{ a: A, ...r, ...s }` (its own body) | rigid tails | `r`, `s` lack `a` (as today); `r # s` hypothesis, `Implied` (P3) |
| The same type at a use (Use `seededUse`) | meta tails | the same on the use's metas |
| A clause `where r disjoint s` | none | `r # s`, `Clause` |
| A literal `{ ...e1, x: v, ...e2 }` | fields and both spreads' tails | `row(e1) # row(e2)`, `x` against both, `Spread` |
| A declared type writing `{ ...r, ...s }` in a field | as for signatures | through Implied `declared`, extended to pairs |
| A binding `?m := F ⊎ T` (§3.2) | its image | the image's own disjointness, plus what `?m` had |

A type written in a body (lambda annotation, handler label, `handle`
payload) with two tails over the signature's variables is held to the
signature's facts by Resolve.Lacking, as single tails are since R001's
C1 fix: `r and s are not known to be disjoint` (D3) at its later `...s`.

### 1.5 Worked example: instantiation and composition

```wxw
fn main(): Int = merge(merge({ x: 1 }, { y: 2 }), { z: 3 }).x;
```

| Step | Substitution and store |
|---|---|
| outer use of `merge` | `?r2`, `?s2`; apart `?r2 # ?s2` (Clause) |
| inner use | `?r1`, `?s1`; apart `?r1 # ?s1` |
| `{ x: 1 }` against `{ ...?r1 }` | `?r1 := { x: Int }`; the pair decomposes: `?s1` lacks `x` |
| `{ y: 2 }` against `{ ...?s1 }` | `?s1 := { y: Int }` (its lacks allow it) |
| inner result `{ ...?r1, ...?s1 }` | flattens to `{ x: Int, y: Int }` |
| it against `{ ...?r2 }` | `?r2 := { x: Int, y: Int }`; `?s2` lacks `x`, `y` |
| `{ z: 3 }` against `{ ...?s2 }` | `?s2 := { z: Int }` |
| `.x` | the result flattens to `{ x: Int, y: Int, z: Int }` |

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
   `rebound`).
3. **Cancel common tails**, as multisets. Disjoint union cancels: if
   `A ⊎ X = B ⊎ X` then `A = B`.
4. What is left: constants `C1` (labels and rigid tails only in `L`),
   metas `M1`, and likewise `C2`, `M2`. Every constant of one side must
   lie inside a meta of the other: a rigid tail is an opaque row, so it
   never holds a label and never grows.
5. **Homes.** A constant `c` of `C2` may go into `m ∈ M1` when `m` does
   not lack `c` (a label), is not apart from `c` (a rigid), and moving
   `c` in would not break one of `m`'s facts at once: each rigid `σ`
   apart from `m` must lack the label (or be apart from the rigid), and
   a rigid `c` must lack every label `m` lacks. Likewise for `C1`.
6. **Decide.**
   - Every constant has exactly one home (or there are none): solve
     (§2.2). The equation is gone.
   - Some constant has no home: if its side has exactly one meta, bind
     it anyway, so the fact that excludes it reports itself (D1, D2, D3
     or `s may already have field a`); otherwise the records' mismatch.
   - Some constants have one home and others several: **commit** one
     forced constant, `m := { c } ⊎ ?m'` with `?m'` fresh, and go to 1.
   - Otherwise **defer**: record the equation in `pending` and report
     success.

### 2.2 The general solution

With every constant placed, each `mi ∈ M1` becomes its constants plus
one fresh piece `zij` for each `nj ∈ M2`, and each `nj` its constants
plus the same `zij`:

```
mi := C2(mi) ⊎ zi1 ⊎ … ⊎ zil        nj := C1(nj) ⊎ z1j ⊎ … ⊎ zkj
```

This is the basis of linear AC unification with unit coefficients
(Stickel): the minimal solutions of `x1 + … + xk = y1 + … + yl` are the
`k × l` pairs. Each binding is made through the bind rule (§3.2), which
hands each piece the lacks and apart facts of both its owners and the
disjointness of the pieces within one owner. Two shortcuts keep today's
shapes and avoid fresh metas:

- **One meta on a side and no constants opposite** (`k = 1`, `C1` empty):
  `m1 := C2 ⊎ T2`, binding to the other side's tails directly (today's
  rule 2, now with several tails).
- **One meta on each side, both with constants**: one fresh remainder
  (today's rule 3, `r001-shared-remainder`). Two bare metas: the newer
  is bound to the older (today's `sameTails`).

### 2.3 Today's rules are the one-tail case

With at most one tail per side the rule makes the decisions of ADR 013's
rules 1-6: the same tail cancels (1); labels against a meta bind it (2);
two metas share one remainder (3); a lacked label has no home (4); `{ a:
A, ...?m } ~ { ...?m }` cancels to `{ a: A } ~ {}`, the mismatch (5);
a rigid or closed side offers no meta, the mismatch (6). The first slice
of the plan proves this with a differential (§9).

New and harmless: `{ ...?m } ~ { ...?m, ...?n }` cancels to `{} ~ { ...?n
}` and binds `?n := {}` where today a single tail could not express it.

### 2.4 Worked examples

**Deferral resolved by a later argument.**

```wxw
fn apply2(f: (a, b) -> { x: Int, y: Int }, p: a, q: b): Int = f(p, q).x;
fn main(): Int = apply2(merge, { x: 1 }, { y: 2 });
```

`merge` against `f`'s parameter binds `?a := { ...?r }` and `?b :=
{ ...?s }`, then meets `{ ...?r, ...?s } ~ { x: Int, y: Int }`. Both `x`
and `y` may go to `?r` or `?s`: deferred, at `merge`. The argument
`{ x: 1 }` binds `?r := { x: Int }`; the drain re-examines the equation,
now `{ x: Int, ...?s } ~ { x: Int, y: Int }`, which cancels `x` and binds
`?s := { y: Int }`. The third argument checks against `{ y: Int }`.

**Never resolved.** Without `p` and `q`, `fn apply0(f: (a, b) -> { x:
Int, y: Int }): Int`, the equation is still pending when `main` ends:
D4 at `merge`. Four splits of `{ x, y }` are solutions; no choice is
forced, and each gives `merge` a different specialization.

**Forced by a fact.** If `?s` lacks `x` (say the program also passed
`{ ...?s }` where `{ x: Int, ...t }` was expected), the only home of
`x` is `?r`: commit `?r := { x: Int, ...?r' }`; the rest, `{ y }`
against `?r' ⊎ ?s`, may still defer.

**Two holes against one.** `{ ...?r, ...?s } ~ { ...?t }` (a merge
result passed where an inferred lambda parameter's record is expected):
no constants, so `?t := { ...?r, ...?s }` (§2.2's first shortcut). The
apart pair `?r # ?s` keeps `?t`'s row well formed.

### 2.5 When re-examination happens

After each top-level `unify` that bound a meta or added a fact on a
meta named in `pending`, the drain re-runs every pending equation until
a pass changes nothing (as `settleRows` does for postponed effect rows,
but eagerly, so later expressions see the bindings). The metas named in
`pending` are watched as TailWatch watches clause rows; an unchanged
watch costs one set lookup per unification. A failure found by the
drain is reported at the expression being required, the one whose
unification made the equation fail, with no note pointing to the
pending equation's site (P9).

### 2.6 Decidability, termination and cost

**Termination.** Every step ends:

- A solve discards an equation; each call to `unify` makes finitely
  many (recursion into field types is bounded by `inferredTypeLimit`).
- A commit moves a constant out of one side of one pending equation. It
  cannot come back to that side: it would then be there twice, the
  mismatch. Labels and rigids come only from the program (fresh metas
  bring none), so there are at most `2 × (labels + rigids)` commits per
  equation.
- Each meta is bound at most once, and fresh metas are made only by
  solves and commits, finitely many each. Facts (lacks, apart pairs)
  only grow over a finite set of labels and live metas.
- A drain pass that changes nothing stops, and a pass that changes
  something consumes one of the finite resources above.

**Decidability.** The checker always ends with accept, a hard error or
ambiguity, so acceptance is decidable. Satisfiability of the pending
equations themselves is NP-complete: positive one-in-three SAT reduces
to it with one meta per variable, one label `t`, and one equation `?X ⊎
?Y ⊎ ?Z = { t: Unit }` per clause (each meta is then `{}` or `{ t }`,
exactly one per clause). A Waxwing program can state that system
(`merge3` passed for several parameters sharing type variables), so no
polynomial checker accepts exactly the satisfiable bodies unless P =
NP. Hence the policy: decide the forced cases, report the rest.

**Cost.** A solve with `k` and `l` metas makes `k × l` pieces and
`O((k l)²)` apart pairs; a binding decomposes against each partner in
`O(|image| × |partner|)`. Pieces multiply when equations with metas on
both sides chain, so rows could grow geometrically in contrived code.
A cap on the parts of one flattened row (P5: 256, the error as D5)
bounds every step by a constant and the body by `O(E × (L + R))` steps,
`E` the row equations, `L` the labels, `R` the rigids. Programs that
only call `merge` with known arguments never make a piece: each
argument binds a lone meta (shortcut one).

### 2.7 Why this design (the literature)

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
  the same idea between two variables.
- **Ur/Web (Chlipala).** Disjointness obligations `[r1 ~ r2]`, a prover
  that decomposes them over known fields and variables, and a unifier
  for concatenations that defers and is incomplete by design. Closest
  in spirit; chosen for the obligation store and its decomposition.
- **Morris and McKinna (Rose).** A general row theory with a combination
  predicate `ρ1 ⊙ ρ2 ~ ρ3`; their predicate is what `pending` holds,
  but Waxwing needs no evidence passing (every function is specialized)
  and no generalization over it (signatures are explicit).

Influence is conceptual only; no reference code is used.

## 3. Persistent disjointness

### 3.1 Decomposition

`require L # R`, both flattened:

1. A label on both sides: the overlap, D2 (both labels are known).
2. Each label of one side against each tail of the other: a lack. On a
   meta it is added (with this `Because`); on a rigid it must be a
   hypothesis, else `s may already have field a` (§8).
3. Each tail of one side against each tail of the other: an apart pair.
   - The same meta twice: `x # x` holds only for the empty row, so the
     meta is bound to `{}` (forced, not a choice).
   - The same rigid twice: D3's variant, `r is in both records`.
   - Two rigids: must be a hypothesis, else D3.
   - Otherwise the pair is stored.

A row's own disjointness is the same check between its parts: each
tail against the fields, each pair of tails.

### 3.2 The bind rule (RecordTail `bindTail`, generalised)

Binding an unbound meta `?m := F ⊎ T` (flattened):

1. No label of `F` is one `?m` lacks (today's rule 4; the failure is
   D1 or D2 by the lack's `Because`).
2. Each label `?m` lacks passes to each tail in `T`: a meta inherits it
   with its `Because`; a rigid must already lack it (today).
3. Each apart partner `p` of `?m` is removed from the store and
   re-required as `(F ⊎ T) # p`, keeping its `Because`.
4. The image's own disjointness is required (§3.1's last line).
5. The occurs check runs on the resolved image (today's `place`).

Steps 2 and 3 are what makes the obligation persistent: it is
re-expressed on whatever the meta becomes, field or tail, however late,
and is never replaced by the set of labels known when it was made.

### 3.3 Worked example: a merge of merges, generically

```wxw
fn three(a: { ...r }, b: { ...s },
    c: { ...t }): { ...r, ...s, ...t } = merge(merge(a, b), c);
```

The result type implies `r # s`, `r # t`, `s # t` (P3). Inner use:
`?r1 := r`, `?s1 := s`, so `?r1 # ?s1` becomes `r # s`, a hypothesis.
Outer use: `{ ...?r2 } ~ { ...r, ...s }` binds `?r2 := { ...r, ...s }`
(shortcut one); its pair `?r2 # ?s2` decomposes into `r # ?s2` and
`s # ?s2`. Then `?s2 := t` turns those into `r # t` and `s # t`, both
hypotheses. The result `{ ...r, ...s, ...t }` cancels against the
signature's, tail by tail.

With result `Int` and only `where r disjoint s`, the same steps reach
`r # t` with no hypothesis: D3 `r and t are not known to be disjoint;
add where r disjoint t`, at `c`, noted `required here` at merge's
clause. (The prototype runs both, Appendix A.)

## 4. The mixed case and wrappers

`{ a: Int, ...r } # { ...s }` decomposes into `s lacks a` and `r # s`
(§3.1 steps 2 and 3). Both are facts on variables in the substitution,
so both survive substitution and every call path.

```wxw
fn tagged(p: { id: Int, ...r }, q: { ...s }): Int = size(merge(p, q));
```

Here and in §3.3, `size` is any function over `{ ...q }` returning
`Int`; it only consumes the merged record.

`?r := { id: Int, ...r }`, `?s := s`. The pair `?r # ?s` needs `s lacks
id` (no hypothesis: `s may already have field id` at `q`, noted `s is
introduced here` and `required here` at merge's clause) and `r # s` (no
hypothesis: D3 at `q`). Only the first failure is reported. With
`where s lacks { id }, r disjoint s` the body checks, and every caller
of `tagged` meets those clauses through the use's metas, with
`Clause` provenance naming `tagged`'s clause.

**Through generic wrappers** the rule is Task 2's: inside a wrapper
whose own clause (or result type) states the fact, the callee's
obligation is met by the wrapper's rigid hypothesis, and the wrapper's
callers are checked against the wrapper's clause, reported at their
argument and noted at the wrapper's clause. A wrapper without the fact
is refused inside itself, at the argument that completed the
obligation, noted at the callee's clause. Provenance flows with each
decomposed fact: a lack that came from `r disjoint s` keeps that
`Because`, so its violation is D2 with the clause note, not D1.

## 5. The end of a body: residual obligations

Waxwing has no generalization: functions are fully annotated, lambdas
are monomorphic and checked inside their function, and a `let` is not
generalized. So nothing can become a new written constraint (inference
of constraints is INF001's, out of scope). At the end of a function
(after `settleRows`, beside `settleFinal`):

- **Facts on unsolved metas** (lacks, apart pairs) are met by the empty
  row. Lowering already reads an unsolved record tail as the empty rest
  (Specialize/Record, Values), so accepting them is exactly what runs.
  The prototype checked that this default is always the least solution
  of what was accepted (Appendix A).
- **Facts on rigids** never wait: each is checked against the
  signature's hypotheses when it arises (§3.1), at the expression that
  made it.
- **A pending equation** is D4, at its site. By construction it still
  has a constant with two homes, so the default cannot satisfy it.

So residual obligations never become required written constraints, and
the only end-of-body error is D4.

## 6. Two multi-tail rows with holes on both sides

`{ ...?a, ...?b } ~ { x: Int, ...r }` (rigid `r` lacking `x`): the
constants `x` and `r` each have two homes, `?a` and `?b`. The checker:

1. defers the equation, at the site of the unification that met it;
2. re-examines it whenever `?a` or `?b` is bound or gains a fact: if
   `?b` comes to lack `x`, `x` is committed to `?a`; if `?a` is bound
   to `{ x: Int }`, cancellation leaves `{ ...?b } ~ { ...r }`, solved;
3. if the function ends with it pending: D4, `Cannot tell which part of
   { ..._, ..._ } has field x`, at that site, naming the first constant
   with two homes (labels before rigids, labels in order).

With metas on both sides and no constants (`{ ...?a, ...?b } ~ { ...?c,
...?d }`) the equation is never ambiguous: §2.2 gives four pieces.

## 7. Specialization and lowering

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

## 8. Diagnostics (all Proposed)

All E_TYPE. Location rules follow the table.

| ID | Case | Text | Location and notes |
|---|---|---|---|
| D1 | A known field meets a lack a `lacks` clause wrote | Task 2's approved `admin is not allowed here: r lacks { admin }` | the argument (or item) being required; `required here` at the label in the clause |
| D2 | A known overlap under disjointness, in a call | `Field a is in both records: r disjoint s` | the later contributing argument; `first written here` at the earlier when `boundAt` knows it; `required here` at the clause, or at the later `...s` of the implying type |
| D2' | A known overlap in a literal with several spreads | existing `Duplicate field a`, note `first written here` | the later item in written order, noted at the earlier item that supplied it (Tranche A's rule, extended to spreads) |
| D3 | No evidence that two rigid rows are disjoint, no overlapping label known | `r and s are not known to be disjoint; add where r disjoint s` | the expression being required; `required here` at the obligation's clause or implying type; none for a literal |
| D3' | The same rigid in both rows | `r is in both records and may have fields` | as D3 |
| D3'' | A known label against a rigid under disjointness | existing `s may already have field a` | the expression being required; `s is introduced here` at the signature's first `...s`; `required here` at the clause |
| D4 | A pending equation at the end of a function | `Cannot tell which part of { ..._, ..._ } has field x` (or `holds r` for a rigid) | the site of the unification that deferred it |
| D5 | A flattened row over the part cap | `Inferred record row has more than 256 parts` | the expression being required |

Location rules:

1. The error is at the expression whose requirement failed (Require
   `expectType`, Reject for consumptions). Arguments are checked left
   to right, so in a call it is the later contributor.
2. `first written here` marks the earlier contributor: in a literal, the
   item; in a call, the site where the other side's field arrived
   (`boundAt`), and is omitted when no site is known.
3. `required here` marks why the obligation exists: a clause's
   constraint, or for an implied one the later `...s` of the type.
4. A message names the variables a fix would mention: D3 names the
   enclosing signature's rigids (the clause to add is theirs), while
   its note shows the callee's requirement.
5. Of several violations, the first in decomposition order is reported:
   labels before tails, each in sorted order.

D2 could instead mirror D1 as `a is not allowed here: r disjoint s`;
the draft keeps a distinct text because the user asked for separate
messages.

# Part II: evidence and plan

## 9. Oracle and tests

**Reference.** A new test/row-merge-oracle.mjs, written from this
document's rules and not from the PureScript: atoms are labels and
rigid names, a meta denotes a set of atoms, and a rigid's lacks and
disjointness hold only by hypothesis (rigids are uninterpreted, as in
the checker; by parametricity this equals the universal reading). It
enumerates every assignment of the metas to subsets of the atoms (3
labels, up to 2 rigids, up to 7 metas, depth-first with pruning) and
returns all solutions.

**Properties**, each checked on every generated problem:

| Property | Statement |
|---|---|
| S, soundness | accepted ⇒ the checker's solution, unsolved metas empty, is a solution |
| H, honest refusal | refused with D1-D3 or a mismatch ⇒ no solution exists |
| L, least | accepted ⇒ that solution is the least solution (the meet of all) |
| A, ambiguity | D4 ⇒ no least solution exists, except the pinned cases below |
| C, completeness | a least solution exists ⇒ accepted, except the pinned cases |

C and A are the completeness the design claims: acceptance agrees with
the brute force except on bodies whose answer needs reasoning across
two pending equations (§11, Appendix A). Those are pinned as fixtures
asserting the current verdict, so a future refinement shows up as a
deliberate change.

**Generators.**

- *Raw*: random equations, disjointness and lacks over 2-3 metas,
  0-2 rigids with random hypotheses.
- *Program-shaped*: expression trees of `merge` (depth 2) over leaves
  that are literals, rigid-tailed rows (a generic wrapper's parameters,
  hypotheses as its clauses) or bare metas (lambda parameters); some
  uses fix the result before the arguments (a higher-order use), some
  check arguments right to left; composition and wrappers by
  construction.
- *Dense*: several multi-hole equations sharing metas, to hunt
  stuck-but-determinate cases.

**At two levels.**

1. test/row-merge.test.mjs drives Features.Check.Unify (through a
   small exported entry, like test/unify.test.mjs) on the generated
   problems against the oracle.
2. A program generator renders the program-shaped problems as Waxwing
   sources (`merge`, wrappers with and without clauses, `let` references,
   partial applications, `apply2`-style uses) and compares the
   compiler's verdict class with the oracle's; accepted programs also
   run in Go and in the reference interpreter (test/fx-oracle-records.mjs
   gains spreads), which must agree.

**Regression rows** (each proved failing in an isolated copy with its
defect restored):

| Row | Defect restored | Probe |
|---|---|---|
| `r005b-apart-persist` | a bound meta drops its apart pairs | `merge(merge(a, b), c)` with `a` and `c` sharing `x` accepted |
| `r005b-mixed-lacks` | label/tail decomposition skipped | `{ id: Int, ...r }` merged with `{ ...s }` accepted without `s lacks { id }` |
| `r005b-mixed-tails` | tail/tail decomposition skipped | the same with the lack written, accepted without `r disjoint s` |
| `r005b-provenance` | a decomposed lack loses its `Because` | D1's text where D2's is due, through a wrapper |
| `r005b-defer` | ambiguous constants placed in the first home | `apply2(merge, { y: 2 }, { x: 1 })` refused |
| `r005b-pending-end` | pending equations dropped at the end | `apply0(merge)` accepted; layouts disagree |
| `r005b-self-apart` | `x # x` not forcing `{}` / rigid allowed | `merge(p, p)` over `{ ...r }` reaches `go build` with a field twice |
| `r005b-cancel` | common tails not cancelled | `{ ...r, ...s } ~ { ...s, ...r }` refused |
| `r005b-body-type` | Resolve.Lacking ignores tail pairs | a lambda annotated `{ ...r, ...s }` under a signature without the fact accepted |
| `r005b-merge-order` | items built in label order | effects in `{ ...g(), x: f() }` run out of order |

Plus: the one-tail differential (§2.3) over `--corpus all` shows no
change from the representation slice and from the new unifier.

## 10. Task breakdown (for the implementation plan)

Each slice keeps every commit building and `npm run verify` green.

1. **Representation.** `tails ∷ Array v`; every consumer handles any
   number, every producer still makes at most one. Behaviour-preserving;
   differential `--corpus all` shows 0 differences. About 44 modules
   name `TRecord`; mechanical but wide.
2. **Surface.** Types with several `...` tails parse and resolve (sorts:
   each tail a record use); `where r disjoint s` (Format.Parse.Constraint,
   Resolve.Requirements, Resolved `Disjoint`); `r disjoint r` refused
   (text to approve); Resolve.Lacking and ArgumentClash learn pairs.
   Checking a multi-tail type is an `R005 placeholder` until slice 4.
3. **The store, single-tail.** `apart`, `because`, seeding for bodies
   and uses (Seed, Use, Implied `declared` with pairs), decomposition and
   the bind rule. Testable before multi-tail unification: `fn g(a: {
   ...r }, b: { ...s }): Int where r disjoint s` called as `g(p, p)` over
   `{ ...t }` is D3'; over `{ x: Int }` twice, D2.
4. **Multi-tail unification.** Flatten, cancel, homes, AC basis,
   commits, `pending`, the drain, D4 at the end, the part cap. Oracle
   test 1 (§9) lands here, with the pinned exceptions.
5. **The merge literal and friends.** Several spreads (Tranche A's
   `at most one spread` text retires), access, removal, record patterns
   and rest binders over multi-tail rows; D1-D3 locations and notes.
6. **Specialization and lowering.** Canonical form, the struct from
   several sources, evaluation order; Go and interpreter agree.
7. **Evidence.** The program generator (§9 level 2), regression rows,
   ADR 013 section, docs/language.md, BACKLOG.

**Risks.**

- Slice 1's churn collides with concurrent record work (Task 3
  lowering); land it on a quiet main.
- Drain cost on large bodies: one watch lookup per unification when
  nothing is pending; measure on the scale programs (R001, T003).
- Fresh pieces multiply in contrived code; the cap turns that into D5.
- `boundAt` is new provenance state; if it proves costly, D2 drops its
  `first written here` note in calls (rule 2 already allows omission).
- Postponed effect pairs revert the substitution; the store must revert
  with it (it lives there), and a test should pin that.
- Timing tests: slices run one at a time, as now.

## 11. Open questions

1. **Hardest: how complete to be.** Propagation alone leaves rare
   bodies refused as ambiguous although one least solution exists. All
   found by the prototype need two pending equations sharing a meta,
   e.g. `{ ...?m0, ...?m2 } = { a }` and `{ ...?m0, ...?m1 } = { b }`
   force `?m0 = {}` (it would need to hold both `a` and `b`). An upper
   bound per meta (`?m0 ⊆ { a }`, intersected across equations) removes
   about half of them in the prototype, at the cost of one more fact
   kind; a bounded search at the end would remove the rest at
   exponential cost. Proposed: neither for now (none arose from
   program-shaped scenarios), pinned as fixtures.
2. **Implied or required `disjoint`.** P3 makes `{ ...r, ...s }` in a
   signature imply `r disjoint s`, as `{ a: A, ...r }` implies `r lacks
   a`; the settled `merge` then writes a redundant but allowed clause.
   The alternative requires the clause and adds a text.
3. **Printing order of tails.** Proposed: fields in label order, then
   rigid tails in signature order, then `..._` for metas.
4. **D2's wording** (§8, last paragraph).

## Proposed decisions, collected

| ID | Decision |
|---|---|
| P1 | `RecordRow` holds `tails ∷ Array v`, sorted, repeats kept |
| P2 | The obligation store (`apart`, `pending`, `because`, `boundAt`) lives in the substitution |
| P3 | A signature type with two tails implies their disjointness; writing the clause is allowed and has no effect |
| P4 | Acceptance: forced propagation only; a pending equation at the end is D4 |
| P5 | A cap of 256 parts per flattened row, D5 |
| P6 | Unsolved metas default to the empty row at the end, as lowering already does |
| P7 | The texts D1-D5 and the location rules of §8 |
| P8 | The drain runs after each top-level unification, not only at the end |
| P9 | A failure found by the drain is reported at the current expression, with no extra note |

# Appendix A: prototype (a toy, not the compiler)

Written for this draft in the session scratchpad
(/private/tmp/claude-501/…/scratchpad: solver.mjs, oracle.mjs, run.mjs,
dense.mjs, examples.mjs, solver-upper.mjs); not part of the repository.
JavaScript, labels only (field types ignored), no imports from output/.

**Solver** (solver.mjs, 223 lines): rows as `{ fields, tails }`;
flatten; `requireLacks`, `requireApart`, `requireDisjoint`,
`wellFormed`; `bind` with the §3.2 rule; `unify` with cancellation,
homes, the AC basis, commits and deferral; `drain`; the empty default.

**Oracle** (oracle.mjs): depth-first enumeration of meta assignments
over 3 labels and up to 2 rigid atoms, rigid facts by hypothesis; all
solutions (capped at 300,000) and the least one (the meet, if it is a
solution).

**Runs.**

| Generator | Problems | Accepted | Hard refusals | D4 | S, H, L violations | Least exists but D4 |
|---|---|---|---|---|---|---|
| program-shaped (5 seeds) | 38,279 checked (11,721 over 7 metas skipped) | 18,598 | 18,914 | 767 | 0 | 0 |
| raw (5 seeds) | 50,000 | 12,411 | 37,000 | 589 | 0 | 3 |
| dense (5 seeds) | 50,000 | 11,064 | 37,373 | 1,563 | 0 | 5 |

Hard refusals are mismatch, overlap, lacks and evidence verdicts; every
one was confirmed unsatisfiable by the oracle. Of the D4 verdicts, 91
were unsatisfiable and the rest had several minimal solutions, except
the eight in the last column. With the upper-bound refinement
(solver-upper.mjs) the dense runs over seeds 11-16 dropped from 12 such
cases to 6, still with no S, H or L violation.

**Worked examples** (examples.mjs), each as §1-§6 predicts: closed
composition gives `{ x, y, z }`; generic three-way composition accepted
with all three hypotheses and refused with `s # t` missing (evidence
`T disjoint S`); the mixed case refused without hypotheses and accepted
with `s lacks a` and `r # s`; a known overlap refused through the
disjointness lack; `{ ...?a, ...?b } ~ { x, ...R }` left pending;
higher-order before arguments solved by the drain; a lack forcing `x`
into one hole; two holes against one solved with the pair kept.

**Found by the prototype and folded into the design.**

- A constant with no admissible home first produced a bare mismatch
  where a lack or a missing hypothesis was the cause; §2.1 step 6 now
  binds a lone meta anyway so the specific fact reports itself.
- The default-to-empty is always the least solution of what is
  accepted (property L held on every run), which justifies §5.
- Stuck-but-determinate bodies exist only with two pending equations
  sharing a meta (§11.1).

Not covered by the prototype: field types, provenance and texts,
specialization and lowering, effect-row interaction, and cost.
