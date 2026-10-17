# Review: open-row merge algorithm (R005 Tranche B draft)

Status: adversarial design review, 2026-10-16, written unattended. Target:
docs/plans/2026-10-16-open-row-merge-design.md ("the draft"). Docs only;
nothing in the repository was built or run. Scripts are listed in the
appendix.

## Verdict: revise first

The core holds up. Rows with several tails, disjointness as a fact on
variables kept in the substitution, and decomposition on every binding
give a sound and order-independent solver: 0 soundness, honesty or
leastness violations and 0 order-dependent verdicts in 220,000 random
problems, each run in 5 constraint orders against an independent brute
force (appendix). The forced-only policy is defensible.

Four things must change before Tranche B is planned. (1) Removal and rest
binders, as Tranche A implements them, silently keep a field that a hole
holds (F1). (2) The claim that stuck-but-determinate bodies are rare and
never program-shaped is false for a plain higher-order shape. One
proposed refinement fixes every such case (F2). (3) Property C cannot be
tested as written (F3). (4) The drain is not specified once field types
exist (F4). The other findings are fixes inside slices.

## Findings, by severity

### F1 (high). `without` and rest binders keep a field that a hole holds

Tranche A computes the removal's result as the receiver's *resolved* type
minus the labels (Features.Check.Removal `remainder`, after `select`). The
rest binder does the same: "the expected type, resolved after the fields'
checks, without the written labels" (progress, R005 Task 2). On
`{ ...?r, ...?s }`, `select` defers: `x` has two homes. The resolved type
still shows no `x`, so nothing is removed. Once `?r` is bound, `x`
reappears in the result.

```wxw
fn main(): Int = {
  let drop = fn(p, q) => merge(p, q) without { x };
  drop({ x: 1 }, { y: 2 }).x
};
```

`drop`'s result type flattens to `{ x: Int, y: Int }`, so `.x` checks.
Lowering builds the removal from the result type (Format/Go/Expression
`lowerRemoval … term.ty`), so it copies `x`. The program prints 1:
`without` did nothing. `{ ...drop(a, b), x: 2 }` is then refused as a
duplicate field. The same holds for `match merge(p, q) { { x, ...rest }
=> rest }`. The draft's slice 5 lists removal and rest binders over
multi-tail rows in one line and gives no rule.

Fix: the result of `without` and the type of a rest binder is the fresh
`ρ` from `select`'s unification with `{ l: α, …, ...ρ }`, as Tranche A's
own design §3 states for a hole receiver. It is never a subtraction from
a resolved type. Add regression rows for both forms, with a hole on
either side.

### F2 (high). Determinate bodies are refused in a plain higher-order shape

§11.1 and Appendix A say that stuck-but-determinate bodies are rare and
that none came from program-shaped scenarios. The program generator never
shares a type variable across two higher-order parameters. Once it does,
they are routine:

```wxw
fn both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int }): Int = 0;
fn main(): Int = both(merge, merge);
```

The equations are `?r1 ⊎ ?s1 = { x }` and `?r1 ⊎ ?s2 = { y }`, the second
merge's `r` unified with the first's through `p`. The brute force finds
exactly one solution: `?r1 = {}`, `?s1 = { x }`, `?s2 = { y }`. The draft
reports D4, twice. A family of such programs (2 or 3 callbacks sharing
`p`, every non-empty closed result over 3 labels, 392 programs) has 186
with a least solution. The draft refuses all 186 as D4. The prototype's
own upper-bound variant (solver-upper.mjs) accepts all 186 and violates
no property.

On a dense generator shaped like this (two-meta sums against labels,
with shared metas), about 6.5% of runs end in D4 although a least
solution exists. That is about 12% of all D4 verdicts. The upper bound
removes 86% of them (6,515 to 890 per 100,000 runs), not the "about
half" the draft reports.

Fix: adopt the per-meta upper bound now (P4 revised). It is the dual of
lacks: a closed equation bounds each meta in it, and bounds meet. Add the
shared-parameter shape to the program generator.

### F3 (high). Property C cannot be tested as written

C says "a least solution exists ⇒ accepted, except the pinned cases",
and the pinned cases are whatever random generation finds. A new seed
finds new exceptions, so C either fails or cannot detect anything. The
user asked for an oracle that is sound and complete. The draft needs a
completeness statement that can be decided. The runs support this one:

- **C1.** If the checker gives D4 with exactly one pending equation left
  at the end, no least solution exists. Over 60,000 dense problems in 5
  orders (300,000 runs), 19,590 runs were D4 with a least solution, and
  not one had a single pending equation.
- **C2.** The verdict class (accept, refuse, D4) does not depend on the
  order of the constraints: 0 differences over 220,000 problems in 5
  orders (260,000 with the upper-bound variant).
- **C3.** Each remaining D4 with a least solution has two or more
  pending equations sharing a meta. That is the stated, intended
  incompleteness, and its rate is reported rather than pinned case by
  case.

With F2's upper bound, C1 and C3 still hold, and the 1-in-3 instances
(F12) stay D4. Those are the fixtures worth pinning.

### F4 (medium). The drain is unspecified once field types exist

§2.5 re-runs "every pending equation until a pass changes nothing". A
pending equation stores the original rows (§1.3 `RowEquation`), so
re-running it repeats steps 1 and 2: it unifies the common labels' field
types again. If such a field holds its own multi-tail equation, the
nested equation is deferred again on every pass:

```
{ a: { ...?p, ...?q }, ...?r, ...?s } ~ { a: { x: Int, y: Int }, z: Int }
```

If re-deferral counts as a change, the drain never stops. If it does
not, as in the prototype, which only compares `version`, `pending`
gains a duplicate on every drain: quadratic cost, and D4 reported
several times. The prototype ignores field types ("Not covered"), so it
cannot show either way. This is argued, not run. The same gap lets a
drain create new nested equations whose site is the current expression,
not where they arose.

Fix: defer only the residue after step 3 (cancelled tails and constants
on one side only). The field-wise unification happens once, when the
equation is deferred. Give each pending equation an identity that is
replaced, never appended, when it is re-deferred. Index pending
equations by meta, so that a fact re-runs only the equations naming that
meta (this also bounds F10's cost).

### F5 (medium). Meta-only equations grow pieces exponentially

```wxw
fn h(f1: (a1, b1) -> z, f2: (a2, b2) -> z, …, fn: (an, bn) -> z): Int = 0;
fn main(): Int = h(merge, merge, …, merge);
```

Each merge's result meets `z`'s binding with metas on both sides and no
constants, and §2.2 expands it into k × l pieces. In the prototype `z`
flattens to 2^n parts with 4^n apart pairs: n = 8 gives 256 parts,
32,640 pairs, 0.5 s; n = 9 gives 512 parts, 130,816 pairs, 4.3 s; n = 10
gives 36 s. With P5 the n = 9 program is D5, although its least solution
(everything empty) is never in doubt. At the cap, one solve already
makes about 32,000 pairs, so "every step bounded by a constant" holds
only for a large constant.

Fix: do not expand an equation with no constants on either side. Keep
it as a residue that the empty assignment satisfies, which never causes
D4. Expand it only when a constant reaches one of its metas, or by its
pieces lazily. The common case (known arguments) is unchanged.

### F6 (medium). Drain failures are reported confusingly (P9)

```wxw
fn apply2(f: (a, b) -> { x: Int, y: Int }, p: a, q: b): Int = f(p, q).x;
fn main(): Int = apply2(merge, { z: 1 }, { y: 2 });
```

`{ z: 1 }` binds `?r := { z: Int }`, and the drain finds that `z` has no
home in `{ x, y }`. Under P9 the error is at `{ z: 1 }` with no note.
Require reports the argument's own expected and found types, so it
reads as `Expected { ..._ }, found { z: Int }`, a record that plainly
fits. The real reason, that merge's result must be `{ x: Int, y: Int }`,
is never shown. This fails the user's requirements (5) and (7).

Fix: a failure found by the drain carries the pending equation. Report
it at the current expression with a text built from the equation (for
example `merge's result must be { x: Int, y: Int }, but its part r has
field z`), plus the note `required here` at the pending site. Drop P9.

### F7 (medium). End-of-body order with postponed effect pairs

The draft runs its end step "after settleRows". Two things go wrong:

- A `settleRows` retry binds metas outside a top-level `unify`, so a
  pending equation that the retry unblocks is never drained. The body
  gets D4 although one more drain would solve it.
- A `Fail` payload such as `{ ...?r, ...?s }` keeps its key deferred
  while its equation is pending. FX001 then reports `Fail needs a
  concrete error family`, not the D4 that names the real ambiguity.

Also, a postponed pair reverts the substitution, so record equations
deferred inside its label arguments vanish. They come back at the retry
with no site. This is argued; the prototype has no effect rows.

Fix: at the end, alternate `settleRows` and the drain until neither
changes anything. Report D4 before the Fail-family error when the stuck
key's record names a pending meta. Keep the site in `RowPair`.

### F8 (medium). P3 makes the user's own clause dead, and §1.5 contradicts it

The settled surface writes `fn merge(...): { ...r, ...s } where r
disjoint s`. Under P3 the result type already implies `r # s`, and
writing the clause "has no effect". Seed seeds implied facts before
clauses and keeps the first (Task 2's precedent for lacks). So the pair
at each use of `merge` carries `Implied`, and D2's `required here` points
at the result's `...s`, not at the clause the user wrote. §1.5's table
says `(Clause)`, which contradicts this. And `because` holds one reason
per label without saying which reason wins when a written `lacks` and a
lack decomposed from a disjointness meet. Then D1 or D2 depends on
evaluation order.

That the user writes the clause in the canonical example suggests they
expect it to matter. Fix: escalate open question 2 with this
observation. Whichever way it goes, prefer `Clause` over `Implied` for a
note, and fix the precedence (Clause, then Implied, then Spread) for
both pairs and lacks.

### F9 (medium). Ambiguous signatures fail only at every call

`fn split(p: { ...r, ...s }): Int`, or `type Both(...r, ...s) = Both({
...r, ...s })`, can never be called with a concrete record: each call
`split({ x: 1 })` is D4 at the call. The declaration itself is the
mistake, as with Haskell's ambiguity check. Separately, a written
`{ ...r, ...r }` (or `Pair(...a, ...a)` through a declared type) has no
diagnostic. Under P3 it would seed a rigid `r # r`, which holds only for
`{}`, so callers would be forced to `{}` without a word.

Fix: at the declaration, report a record variable that occurs only
beside other tails in multi-tail rows (text to approve). Report a
repeated tail in a written type at resolve, beside slice 2's `r disjoint
r`.

### F10 (low). The termination argument needs another measure; cost is understated

§2.6 bounds commits per equation, but a commit in one equation puts its
constant into every other equation that names the meta. Each commit also
makes a fresh meta, so the number of unbound metas never falls. The
conclusion still holds by a different measure: every fresh meta is a
part of some meta from the program (commits and pieces only split
existing metas), and each commit adds a constant to the flattened
content of such a meta, which is bounded by labels × rigids. The cost
paragraph misses two things: apart partners per meta are unbounded (one
per merge a meta takes part in), and a fact re-runs every pending
equation (see F4's index).

### F11 (low). The D2' location conflicts with rule 1 when the overlap is found late

`let f = fn(p, q) => { ...p, ...q }; f({ a: 1 }, { a: 2 })` finds the
overlap while checking the argument `{ a: 2 }`. Location rule 1 says the
error is there, while D2' says it is at the literal's later item `...q`,
noted at `...p`. Pick one. The draft also weakens the user's "both
contributing items' locations" to "when known". It should list when they
are unknown (drain-found failures, labels that arrive through a commit
or a piece) and stamp `boundAt` for those too.

### F12 (low). The NP-completeness claim is right but targets the wrong question

The reduction is sound. A clause that repeats a variable still works,
because `?x ⊎ ?x` forces `{}`. It shows that *satisfiability* is
NP-hard. Acceptance, though, is meant to track whether a *least*
solution exists. For 1-in-3 systems that is unique satisfiability: the
meet of two distinct solutions is never a solution (checked: 0 of 40
pairs, over covered variables). Deciding uniqueness is still intractable
(NP-hard under randomized reductions, Valiant and Vazirani), so the
policy stands, but §2.6 should state this. Five uniquely satisfiable
instances are D4 with and without upper bounds. They are the honest
pinned fixtures for F3's C3.

### F13 (low). Smaller points

- The prototype runs `wellFormed` on both sides of every equation. That
  is stronger than the draft, which records disjointness only where a
  row is made. The oracle harness should drive only creation-site
  obligations, or a forgotten creation site cannot be caught. The
  finite atom universe is adequate: removing an unmentioned atom from
  every meta keeps every constraint.
- `boundAt ∷ Map Int Span` clashes with the existing function
  `Subst.boundAt`.
- D4's `{ ..._, ..._ }` hides which part is meant. The use knows the
  callee's variables, so print `merge's r or s`, with a fix hint.
- Slices 4 and 5 accept multi-tail programs that slice 6 cannot lower
  yet. Name a specialization placeholder (as slice 2 does for checking)
  so that `verify` stays green. Split slice 4: first cancellation and
  forced solving, with ambiguity an immediate error; then pending and
  the drain. F1 belongs in slice 5's plan text, and F7's joint fixpoint
  in slice 4.
- A row passed as a record-row argument, `Holder({ ...a, ...b })`, should
  appear in §1.4's table (implied `a # b`; ArgumentClash between two
  arguments that a declaration concatenates).

## What holds up

- **Representation (P1).** A multiset of tails is the right shape. The
  alternatives are fairly dismissed, and keeping repeats so that they
  can be reported is correct.
- **Persistence.** Decomposing into label/label, label/tail and
  tail/tail facts, and re-requiring a meta's partners on every binding,
  meets requirement (2) exactly. Nothing is approximated by the labels
  known at the time. The mixed case, requirement (3), falls out as
  claimed.
- **Soundness of the forced moves.** A constant's only admissible home
  is forced, and facts only grow, so commits stay forced. My brute force
  agrees: no accepted problem without a least solution, no hard refusal
  of a satisfiable problem, and the solution with unsolved metas empty
  is the least one whenever the checker accepts (property L).
- **Defaulting (§5, P6).** It matches what lowering already does
  (Specialize/Record, Values: an unsolved tail is the empty rest), and
  property L justifies it.
- **"Nothing is generalized."** I checked this and it holds. `let` is
  monomorphic and lambdas are monomorphic (language.md). An operation's
  variables are only its effect's parameters (Resolve/Effect), and an
  effect cannot take a record row (R009), so an operation has no record
  polymorphism. Handler and `handle` types are held to the signature by
  Resolve.Lacking. A partial application bound by `let` shares its metas,
  as the draft says.
- **Sorts.** Record rows and effect rows stay apart. Only `RecordRow`
  changes, and the obligation store rides in the substitution, which a
  postponed effect pair already reverts.
- **Lowering (§7).** Temporaries in written order, then one struct in
  label order, keep Go's unspecified evaluation order out of play. A
  spread with an empty layout is still evaluated.
- **Literature.** The placement next to Harper and Pierce, Gaster and
  Jones, and Ur/Web is accurate, and the k × l basis is the right one
  for unit coefficients.

## Appendix: what I ran

All scripts are in the session scratchpad, under `review/`, and nothing
is imported from output/. The brute force (`bf.mjs`) was written
independently of the previous author's oracle. Atoms are labels and
rigids. A meta denotes a set of atoms, and every row, including each
meta's own value, must be well formed under the rigid hypotheses. The
least solution is the meet of all solutions, if the meet is itself a
solution. The draft's verdicts come from the previous author's
prototype solver, run through `drive.mjs` with a drain after each step.

| Script | What | Result |
|---|---|---|
| cx1.mjs | `both(merge, merge)` | unique solution; draft D4; upper bound accepts |
| shared.mjs | 392 shared-parameter programs | 186 with a least solution, all D4; upper bound 0 |
| perm.mjs, raw | 160,000 problems × 5 orders | 0 S/H/L violations, 0 order differences |
| perm.mjs, dense | 60,000 × 5 orders | 19,590 D4 runs with least; none with one pending |
| perm-upper.mjs | dense, upper bound | 6,515 → 890 per 100,000 runs; no violations |
| cx2.mjs | `h(merge × n)` | 2^n parts, 4^n pairs; n = 9: 4.3 s, over the cap |
| sat13.mjs | 1-in-3 systems | unique instances D4 both ways; meets never solve |

One false alarm while building the harness: my first runs passed rigid
hypotheses in a different encoding from the prototype's, and the result
looked like honesty violations. Once the encoding was converted, none
remained.
