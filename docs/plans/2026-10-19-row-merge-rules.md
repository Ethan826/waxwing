# Open-row merge, adopted design: arguments for the solving rules

Status:
Task B0 of docs/plans/2026-10-19-row-merge-implementation-plan.md,
2026-10-19. The user accepted B0 and authorized B1 only; the decisions
of the same day are in the plan's §10 and are marked where they touch
this file (1g broad, R10.2's principle and the case-2 cause, H's
location, N5's removal). Two gates are open and recorded in the ledger:
L1, termination for cyclic predicate graphs (blocks B3), and L2,
solving-time diagnostics.

One section per rule of the adopted design (QT-strict + Sym + H, the plan's §2),
written before implementation, by kind (docs/engineering.md, "Evidence for
solvers and diagnostics"): rewrites keep the solutions (fresh unknowns accounted
for); rejections establish that no solution exists; the one defaulting rule
selects a solution that satisfies every constraint and is the least; iteration
terminates. Each argument names the check that backs it. Commands run from the
directory named; outputs are in each directory's README. Nothing here was run on
the compiler. The prototype renders no text: what the research scripts call
diagnostics are modelled diagnostic selection and location checks (which
constraint is reported, and where), not evidence that complete rendered messages
are stable.

Sections of docs/plans/2026-10-17-open-row-merge-rules.md that still
hold, unchanged: §0 (semantics, with the addition below), §1 flatten,
§2 common labels, §3 cancelling common tails, §4 a constant with no
unknown opposite, §6 one unknown alone, §7 the bind rule without U3
(steps 2 and 6), §10 decomposition without the binding of a meta apart
from itself, §11 removal's fresh remainder, §11b without the `Outside`
and `Derived` rows, and §12's rollback paragraph. Superseded: §5 (the
sum rule), §8 (homes and commits), §9 (the drain and quiet equations),
§11a, §13's measure, §14 (the `naming` index).

## 0. Semantics

As the earlier file's §0: atoms are labels and rigid row variables; an
assignment gives each unknown a set of atoms; a row denotes its fields,
its rigid tails and its unknowns' atoms, and is well formed when no atom
occurs twice, a label stands beside a rigid only if the hypotheses say
the rigid lacks it, and two rigids stand together only if the
hypotheses say they are disjoint. With field types (research/
row-merge-typed): a row denotes a finite map from labels to types, each
label of an unknown typed by a variable of its own, and two rows are
equal when they have the same labels and equal types at each.
`Merge l r t` holds under an assignment when `l` and `r` are well formed
together and `t` denotes their disjoint union.

## 1. Desugaring a row of several unknowns

**Rule** (plan §2.1). A row made with unknown tails `m1 … mk` (k ≥ 2)
becomes the row with one fresh unknown `t` in their place, with
`Merge m1 m2 t1`, …, `Merge t(k-2) mk t` and each predicate's parts
required disjoint.

**Kind: rewrite.** The written row is well formed only if its tails are
pairwise disjoint (§0), which is what the required facts say. Under any
solution of the original problem, set each `ti` to the union of its
parts: every predicate holds and the new row denotes the old one.
Conversely a solution of the new problem gives `t` the disjoint union of
`m1 … mk` (by induction along the fold), so its restriction to the old
unknowns solves the old problem. The fresh unknowns are determined by
the old ones, so nothing is added or lost. **Checked:** every run of the
prototypes desugars every multi-unknown row (research/row-merge-qt
`QT-strict` variants; research/row-merge-typed `made`, at every depth),
judged by their oracles (S, L, H; G for types): no violation.

## 2. PureScript's cases 1-3

As the re-plan's §13.1 and §14.1 (whose bullets argue the mirrored
cases; the same arguments with the parts in their written roles argue
these). Case 1: `l` closed, so `σ(t) = fields(l) ⊎ σ(r)` exactly when
`t` unifies with `{ fields(l), ...r }` (the row unifier is most general;
field types of labels both rows hold are unified). Case 2: `r` and `t`
closed; every solution needs `r`'s labels in `t` with equal types and
gives `l` the rest, its only value; a label with two types has no
unifier (a contradiction); a label of `r` missing from `t` has no
solution either, but PureScript reports no progress (line 654), kept.
Case 3: `σ(l) = F ⊎ σ(rest)`; with `u` fresh and `Merge rest r u`, `u` is
determined, so the solutions restricted to the old unknowns are kept.
**Checked:** research/row-merge-qt (labels, ground typed domain) and
research/row-merge-typed (unknown field types, nested rows; `node
tr-run.mjs nested 1 2000`, `assoc 1 500`): no S, L, G or H violation;
mutations of case 2's type unification and case 3's rewritten part are
caught (research/row-merge-typed README, "Sensitivity").

## 3. Case 1g: parts with no unknown

**Rule** (qt-strict.mjs `oriented`, its first condition). When neither
part has an unknown tail (each is fields plus zero or more rigid tails),
`t` is unified with `{ fields(l), fields(r), ...tails(l), ...tails(r) }`.

**Prerequisites.** (a) The parts' disjointness `l # r` was required when
the predicate was made (§1) and, on rigids, entailed by the givens: a
label beside a rigid needs the rigid to lack it (otherwise D3''), two
rigids need a `disjoint` clause or an implying row (otherwise D3), a
rigid twice is D3'. (b) No unknown in either part, at the time of the
test, after following bindings.

**Kind: rewrite (an improving substitution).** With no unknown in either
part, `σ(l)` and `σ(r)` are the same for every assignment: the fixed
atoms of each. Their disjoint union is defined by (a), and it is what
the symbolic row denotes; the row is well formed by (a). So every
solution gives `t` that value, and unifying `t` with the row keeps every
solution (Jones 1995 §4: an improving substitution leaves the
satisfiable instances unchanged; the dependency left right -> union of
Environment.hs lines 525-527 says the same). Associativity and
commutativity of disjoint union make the result independent of which
part is written first and of how three or more parts were grouped.

**Correspondence with PureScript.** PureScript has no symbolic union: a
wanted `Union r s t` over rigid `r`, `s` is solved only by matching a
given `Union r s rs` from the signature through left right -> union
(Entailment.hs `matches`, lines 275, 735-750), which binds `t := rs`.
The two operations agree exactly where a given exists for the same
parts, in the same orientation and grouping, after case 3 has moved the
known labels; there the given's result variable is, written in
Waxwing's notation, the row `{ ...r, ...s }`. Elsewhere 1g is broader:
the parts swapped, another grouping, or disjointness entailed by a
`where` clause or an implying row with no `Union` given. Checked against
the installed purs 0.15.16 (research/purs-given-1g, `node run.mjs`, 6
cases; expectations written before the run, all held) and through the
adopted configuration (research/row-merge-qt, `node qt-given.mjs`, 7
cases):

| Program | purs | 1g |
|---|---|---|
| `merge a b` under `Union r s rs` | accept | accept |
| `merge b a` under it | NoInstanceFound | accept |
| `merge a b`, no given (Waxwing: `where r disjoint s`) | NoInstanceFound | accept; without the clause D3 |
| `merge (ext "a" a) b` under the given | accept | accept |
| `merge (merge a b) c` under `Union r s rs`, `Union rs u rsu` | accept | accept |
| `merge a (merge b c)` under them | NoInstanceFound | accept |

**Classification: adapted** (not "as published" as the plan's first
draft had it). Its justification is the symbolic disjoint union argued
above, independently of PureScript's given matching; the agreement with
matching where a given exists is a check on that argument, not the
reason for the rule. **Narrowing it** to where a given
would match (the parts joined, in that orientation and grouping, by a
row the signature writes) would reject the swapped and regrouped
programs and every merge inside a function whose signature states only
`r disjoint s`; no annotation can repair those (rigid parts cannot be
annotated further), so the programmer would have to restructure the
signature. The user approved the broad form on 2026-10-19 (plan §10,
decision 4).

## 4. Sym

As the re-plan's §14.1. Prerequisites (the user's boundaries): the
parts were required disjoint when the predicate was made (every maker
does: §1 and Task 7's literal); a part is closed only when it has no
tail at all, so a rigid tail makes it open; field types are unified,
never compared or dropped; rigid tails are never bound, split or
subtracted. **Checked:** `mirrorDiff` 0 for +Sym on every family of
research/row-merge-qt and research/row-merge-typed (where unknown field
types and nested rows are included); the mutation "case 1 firing for a
part with no fields" (closed tested by fields, not tails) is caught.

## 5. Re-examination and termination

A full rescan applies §2-§4 to every waiting predicate until a pass
changes nothing.

**The first argument (B0), superseded.** It ordered predicates by
"above" (`P'` is above `P` when `P`'s result unknown occurs in a part of
`P'`) and, for an acyclic relation, took the measure (number of waiting
predicates, Σ over labels in parts of the height of their predicate).
It covered acyclic graphs only, and as written it is wrong there too: a
predicate nothing is above has height 0, so its labels weigh nothing
and case 3 on it does not lower the measure. **Measured** (`node
qt-cyclic.mjs families`): the measure failed to fall on 2,677 of 5,277
changing acyclic passes in domain B (4,490 of 6,661 in a twentieth of
domain A). Weighted by height + 1 it fell on every one in every family,
including passes whose edges changed; but it still says nothing about a
cyclic graph, and cyclic graphs arise (below).

**Cyclic graphs are reachable** (so option (b) of the gate is closed).
Unifying a merge's result with one of its own parts, or two merges'
results with each other's parts, makes one: `qt-cyclic.mjs`'s examples
(a self-loop with and without a label, a result in its own part, a
two-cycle), and in ordinary families a cyclic graph at some pass in
36,701 of 159,650 runs of domain B and 42,299 of 333,972 sampled runs of
domain A. Edges also change within one rescan (2,808 and 2,284 runs).

**The argument (L1, 2026-10-19, for the user's review).** It does not
look at the graph. Premises, each a property of the compiler's existing
rules or of B3's:

- (P1) A case 3 or 3' step on `Merge l r t` unifies `t` with `{ F, ...u
  }`, `F` the moved part's fields (non-empty) and `u` fresh, through the
  ordinary unifier, and the predicate becomes one with result `u`. The
  bind rule makes every meta rest of an image lack the image's labels and
  everything the bound meta lacked, and refuses a rigid rest that does
  not already lack them (Check/RecordTail `bindTail`, `passed`; the
  prototype's `bindMeta` and `wellFormed`). Case 3 also requires `u` to
  lack `F` (§2; redundant given the bind rule, see the checks).
- (P2) Within a rescan, lack facts are never removed and bindings never
  undone (a revert happens only when a postponed effect pair is retried,
  between rescans).
- (P3) A rescan makes no label and no predicate: cases move and remove
  labels, unification copies them, and predicates are made only by the
  desugaring at creation (a row with two unknown tails met later is the
  invariant guard, a `Stop Internal`).

Call the predicates one predicate becomes through successive case 3 and
3' steps a lineage, with results `t0, t1, …` and moved label sets `F0,
F1, …`; `M_i = F0 ∪ … ∪ F(i-1)`. **Lemma.** The `F_i` are pairwise
disjoint. By induction, at step `i` the flattened `t_i` holds no field in
`M_i` and its unknown tail, if any, lacks `M_i`: after step `i - 1`,
`t_(i-1)` and `{ F(i-1), ...u }` flatten to the same row, so `t_i = u`
holds what `t_(i-1)` held less `F(i-1)`, and its unknown tail lacks
`F(i-1)` and what the earlier tail lacked (P1); later bindings respect
those lacks (P1, P2). At step `i`, each label of `F_i` must go into
`t_i`'s row, whose fields exclude `M_i` and whose unknown tail lacks
it; a label of `M_i` is refused, a `Failure` that ends the rescan.
**What `Λ` is** (tightened at the user's request, 2026-10-19): the
labels occurring, when the rescan starts, in the substitution's bindings
and in the waiting predicates' rows, field types included at every
depth. That covers every label the rescan can reach: the types the body
has instantiated so far (the signatures of every function, constructor
and effect operation it used, with their nested record types) enter
cases only as bound metas' images, and a case reads a part or a result
only by flattening it through those bindings. A label written in the
body but never unified into one of those rows cannot reach a predicate,
so leaving it out is sound. The set is finite (the substitution is), and
the rescan cannot enlarge it: cases and the unifier copy labels out of
rows already there and remove them, the fresh metas they make carry
none, and instantiation and the desugaring, the only makers of new
types, run when a requirement is checked, never inside a rescan (P3).
A later rescan may start with a larger `Λ`; each rescan's bound uses its
own.

**Theorem.** With `P` the predicates waiting when a rescan starts and
`Λ` as above, a lineage makes at most
`|Λ|` moves and is removed at most once, so the rescan makes at most `P
· (|Λ| + 1)` productive steps. Every pass that changes the state makes
one (a pass changes it only by a case firing; a case that fires removes
or moves), so there are at most `P · (|Λ| + 1) + 1` passes, each of at
most `P` examinations, each finite (the unifier, ADR 013, with its
occurs check and its depth limit, a `Stop Limit`). Nothing here depends
on the shape of the "above" graph: cycles, edges that bindings add or
remove, and predicates that share parts or results are all covered,
since a lineage's bound uses only its own result chain and the lacks
every binding respects.

**Checked** (`node qt-cyclic.mjs all`, .build/evidence/l1-all.log, the
adopted configuration with a trace of every move and pass, the trace
changing no verdict): no lineage moved a label twice and none moved more
than `|Λ|` times (at most 3 = `|Λ|`), and every changing pass was
productive, on the named examples, a cyclic family (20,000 problems,
three orders each, 31,320 runs cyclic; the oracle finds no refusal with
a solution; no run there is accepted), domain B whole, a twentieth
of domain A, and the raw, dense, raw-program and shaped generators.
**Sensitivity** (scratch copies, deleted): without case 3's requirement
that `u` lack `F`, nothing changes (the bind rule supplies the lack);
without the bind rule passing a meta's lacks to its image, the labelled
self-loop and the result-in-its-own-part examples move `a` forever and
reach the 10,000-pass cap, so (P1)'s bind-rule half is load-bearing.

**The joint fixpoint with effect settling (M13, B3, 2026-10-19).** What
is argued: (1) every rescan, including those a settling retry starts
(Check/Unify `settleRows` retries with the re-examining unifier),
terminates by the theorem; (2) settling makes no predicate and no label
(P3), so across all of settling's rescans each lineage's moves stay
pairwise disjoint: lacks and bindings persist, except what a postponed
pair's revert undoes, and the revert undoes the moves made inside it
too, since predicates live in the substitution it restores (Check/
RowFinish `postponed` returns to the pair's starting substitution);
(3) B3 adds no reason for a settling round to continue: a round goes on
only if it decided a pair, grew an effect row's label count, or can
decide one (FX008, Check/SettleChange), and predicates change none of
those directly. What is not separately argued: a case's unification of
field types can meet effect rows and postpone a pair, as any
unification of those types could; that such pairs cannot keep a round
going is FX008's argument, which B3 relies on without re-arguing it.
**Checked:** the B3 tests that settle through predicates in both
directions, each within a 2-second bound (test/r005b-predicates.test.
mjs), and every program of the suite and the differential.

**What B3 inherits.** The step counter gets a stated bound from the
theorem, `P · (|Λ| + 1) + 1` passes (exceeding it is a `Stop Limit`,
which the argument says cannot happen; still a safeguard, never a
verdict). The compiler-level oracle runner checks the lemma on every run
(moved labels per predicate identity pairwise disjoint). A regression
row restores the defect the sensitivity check found (the bind rule not
passing lacks to a meta rest): a cyclic program then reaches the
counter's `Stop Limit` instead of its Contradiction.

## 6. The end of a body

**Defaulting** (one rule, kind: selection). When no predicate waits,
every unbound unknown carries at most lacks facts and pairs (including a
pair of an unknown with itself, §8), all met by `{}`, so the all-`{}`
completion satisfies every remaining constraint; bindings were most
general and every image is monotone in the free unknowns, so it is the
least solution (the earlier file's §12 argument, unchanged). No unknown
a waiting predicate mentions is defaulted: a waiting predicate makes the
body Unresolved or (by H) a Contradiction. **Checked:** S and L on every
accepted run of every family, labels and types.

## 7. H: classification only

**Rule** (re-plan §14.2). Only when solving and permitted defaulting
end Unresolved: for each waiting predicate, cancel equal atoms between
`l ⊎ r` and `t`; a constant left on one side that every unknown of the
other side cannot hold (re-plan §11.1, `cannotHold`) makes the body a
Contradiction. **Kind: rejection.** Argument as §14.2: the constant must
lie in some unknown of the other side in any solution; none can. It
reads the final state and writes nothing, so acceptance and types are
those without H by construction. **Checked:** `baseDiff` 0, no new
Contradiction with a solution, on research/row-merge-qt's families and
research/row-merge-typed's; H ignoring lacks is caught (1,352
Contradictions with solutions).

**Location (approved 2026-10-19; replaces the plan's first draft).** The first
draft's "the latest site at which a fact or binding arrived" depends on
the order of processing. The rule is, from provenance only: each
fact that rules the constant out of a part keeps its reason by the
approved precedence (`prefer`: kind, then source position, so the
reason kept does not depend on arrival order) and, as metadata, the
source span of the use whose seeding stated it. The primary location is
the latest of those spans in source order; when no such fact has a
written reason (every one was made while solving), the predicate's own
site. Notes: `required here` at the predicate's site, `excluded here`
at each reason's written span in source order. On `diag-14` this gives
the approved location: the excluding facts are `noX`'s two clauses,
seeded at the use `noX` (prototype: steps 2 and 3, location 3, notes 2
and 3, predicate site 1, the `merge`). **Checked** in the prototype as a
model: no text is rendered there, so `node qt-render.mjs render 2000`
is a modelled diagnostic selection and location check, not evidence
that complete rendered messages are stable. It gives one modelled H
diagnostic per problem across orders in every family (fixtures 1, raw
10, dense 81, shapes 45 problems with H).

## 8. A meta apart from itself (N5 removed)

`m # m` is stored as a pair, as any pair. It is the fact itself, so no
solution changes; `{}` meets it at the end, and a label later bound into
`m` meets the pair when the bind rule re-requires it on the image (an
overlap, D2). **Checked:** the prototypes run with `selfApart: false`.

## 9. What R10.2 protected, and case 2's empty bindings

R10.2 kept the fact that pruned an upper bound to `{}` so that a later
failure at that meta read as the fact (D1, D2), never `Expected {},
found …`. Bound-driven emptying goes with the bounds. Emptying does not
go entirely: case 2 binds the left part to `{}` when the right part and
the result have the same labels. **Measured** (`node qt-render.mjs
case2 2000`): case 2 empties a meta in 8 of 10,000 raw runs and 9 of
4,000 shape runs; 3 shape runs then fail at a mismatch whose rows reach
such a meta, and in each of those problems another order fails
differently (problems 1558 and 1810 with a fact: `not entailed` or
`overlap`). **Finding.** Ordinary case bindings still need protection:
without the predicate kept as the binding's cause, those runs would read
`Expected {}, found …`. R10.1 as modified (bindings a case made keep
their predicate, plan G-2) covers them with D6. Whether a written fact
that also excludes the label should be preferred (D1 over D6, R10.2's
principle) is a rendering question for the user; R10.2 is not retired
here. Decided 2026-10-19 (plan §10, decision 5): the principle is
kept, so where a written fact also excludes the label, its specific
diagnostic is preferred to D6; causal tracking extends to case-2
bindings (R10.1 extended), and the case-2 provenance regression is
added when the machinery it replaces is removed (B2).

## 10. Unknown field types, nested rows and association

research/row-merge-typed's oracle is complete for its problems: for
fixed label sets the type constraints are first-order equations, which
have a solution exactly when they unify (Robinson), with the unifier as
the most general typing; labels the problem never names can be dropped.
Measured (README there): `nested` seeds 1 and 2, 2,000 problems each
(about 1,300 with a type unknown in a field, about 220 with a merge
inside a field), every order and the mirror: +Sym+H no violation, no
`acceptDiff`, `kindDiff` or `mirrorDiff`. `assoc` seeds 1 and 2, 500
problems each, twelve programs per problem (both groupings, every
argument order), two orders each: +Sym+H no `acceptDiff` or `kindDiff`
(QT-strict alone: 50 and 68 `acceptDiff`). In research/row-merge-qt,
the ten fixtures with three unknown tails give one outcome over every
tail order and step order (`node qt-adopted.mjs three`).

**Not checked:** rigid tails together with unknown field types or nested
rows; more than one level of nesting; more than two labels in nested
rows or three in `assoc`; effects. Association is measured, not argued
beyond §3's remark for 1g.

## 11. Ledger (the plan's §6), status after B0

| # | Claim | Status |
|---|---|---|
| M1 | each case keeps solutions | argued (§2-§4); checked, labels and types |
| M2 | desugaring keeps solutions | argued (§1); checked |
| M3 (L1, gate before B3; proposed closed, for the user's review) | re-examination terminates | argued for every predicate graph (§5: a lineage moves at most `\|Λ\|` times; no graph assumption); cyclic graphs shown reachable; checked on every family and a cyclic one, with a sensitivity check; the effect rounds' joint fixpoint is M13's |
| M4 | Solved is a solution, the least | argued (§6); S, L, G checked |
| M5 | Contradiction has no solution | argued (§2, §7); H checked |
| M6 | Unresolved with 0, 1, several | `odd-cycle` 0, `determinate` 1, `diag-01` 4 under the adopted configuration (`node qt-fixtures.mjs programs`) |
| M7 | H changes no acceptance or type | by construction; `baseDiff` 0 |
| M8 | order independence | measured, not proved |
| M9 | swapped arguments change nothing | measured (`mirrorDiff` 0) |
| M10 | association changes nothing | measured (§10); argued for 1g only |
| M11 | unknown field types | checked (§10) without rigid tails |
| M12 | nested predicates | checked one level deep (§10); sites and paths are the compiler's (B3) |
| M13 | rollback, joint fixpoint | argued in part (§5, B3): rescans in settling terminate, the lineage bound survives reverts, and predicates add no round condition; a pair a case's unification postpones relies on FX008's argument, not re-argued; tested within time bounds (B3) |
| M14 | rows ground after specialization | argued; Task 8 |
| M15 | one unknown tail per row | argued (plan §2.1); guard in B3 |
| M16 | §5's annotations, narrowing | checked (`node qt-adopted.mjs examples`) |
| M17 | 1g agrees with given matching where a given exists, and is broader | checked against purs (§3) |
| M18 | the H location and R11 choice are order independent | modelled diagnostic selection and location checks (`node qt-render.mjs render`, `node qt-adopted.mjs report`); the prototype renders no text; R11 needs a stable tie-break for predicates at one span (plan §10.3) |
| M19 (L2, gate; proposal for the user's review) | diagnostics found while solving are located stably | proposal: docs/plans/2026-10-19-row-merge-locations.md (the same conflict located at its latest written participant; different explanations and different conflicts left order dependent; `node qt-locate.mjs 2000`). Not established: refusals met while solving are located at the step being checked, which varies with the order (modelled: fixtures 24 of 72, raw 758 and shapes 855 of 2,000); two causes, the same conflict at different locations and different valid conflicts found first; a proposal separating them comes before any decision (plan §10.13) |
