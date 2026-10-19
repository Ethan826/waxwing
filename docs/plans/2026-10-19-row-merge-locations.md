# Open-row merge: locating refusals found while solving (gate L2)

Status: proposal for the user's review, 2026-10-19 (implementation plan
§10, decision 13; rules file §11, M19). Nothing here is decided or
implemented, and no diagnostic policy changes until the user decides.
Research only: research/row-merge-qt/qt-locate.mjs, output in
.build/evidence/l2-locate.log.

## The question

Approved location rule 1 (diagnostics file R7, for D6): a refusal is
located at the expression being checked when the failure was found. A
waiting `Merge` predicate is decided when some later requirement makes
it decidable, so under rule 1 the refusal lands at that requirement.
Different processing orders then give different locations. The
modelled comparison (`node qt-render.mjs render 2000`) found the
modelled diagnostic of a refusal met while solving to depend on the
order in 24 of the 72 fixtures, 758 of 2,000 raw problems and 855 of
2,000 shaped ones. The user asked that two causes be kept apart:

1. the same conflict located differently by different orders, which
   provenance could fix;
2. different orders finding different valid conflicts first, which
   would need collecting or ranking conflicts.

The model permutes every constraint of a problem, so these counts bound
what the compiler can show. The compiler checks a body in source order
and departs from it where it defers: effect-row pairs postponed to the
settling rounds, and, from B3, waiting predicates, whose conflicts
surface at whichever later requirement decides them. For one program
the compiler's diagnostic is deterministic; the question is whether two
programs that differ only in the order of independent requirements, or
one program checked through different deferrals, point at the same
place.

## What identifies a conflict

A refusal at step `k` means the steps processed so far (the order's
prefix) have no solution: the prototype's refusals are sound (H on
every family). So the prefix holds at least one minimal unsatisfiable
subset (MUS) of the problem's steps, and the oracle finds them all by
brute force. The order's **conflict** is the set of MUSes inside its
prefix. This is an oracle-level definition the compiler cannot compute;
it is used here only to classify.

For each problem whose modelled diagnostic differs between orders:
**same conflict** when every order's prefix holds the same single MUS;
**different conflicts** otherwise. The candidate rule `latest`
locates a refusal at the latest written step of its conflict (with
several MUSes, of the one whose latest step is earliest). What still
differs after it: the location (`atDiff`) or the failure's kind or
label (`whyDiff`: the explanation).

## Measured (`node qt-locate.mjs 2000`)

Caps: a problem with more than 9 steps or more than 5 metas is not
classified (the oracle's cost grows with both); none of the fixtures or
raw problems hit them, 548 of the 855 shaped ones did.

| Family | Order-dependent | Same conflict, same explanation | Same conflict, different explanation | Different conflicts | Not classified |
|---|---|---|---|---|---|
| fixtures | 24 of 72 | 18 | 3 | 3 | 0 |
| raw | 758 of 2,000 | 55 | 57 | 646 | 0 |
| shapes | 855 of 2,000 | 91 | 4 | 212 | 548 |

Under `latest`, every same-conflict problem gets one location in all
orders (by construction; `atDiff` 0). The different-conflict problems
mostly keep differing: the location becomes stable in 1 of 3, 11 of 646
and 25 of 212 (where their MUSes share their latest step), location and
explanation both in 1, 7 and 14. The explanation differences are
untouched by any location rule.

## Examples (fixtures)

Steps are the fixture's rows (`rows.steps`), numbered as written; each
is one requirement of the program.

### Same conflict, located differently: `design-partial-overlap`

```wxw
fn twice(): Int = {
  let add = merge({ x: 1 });
  add({ x: 5 }).y
};
```

One MUS, steps 0, 1, 2. Rule 1 reports `overlap: x` at step 2, 1 or 0
depending on the order; `latest` reports it at step 2 in every order.

### Same conflict, explained differently: `design-removal-left`

```wxw
let drop = fn(p, q) => merge(p, q) without { x };
drop({ x: 1 }, { y: 2 }).x
```

One MUS, steps 1 and 4. Depending on the order the first failure is a
mismatch on `x`, an overlap on `x` or a duplicate label. `latest` puts
all three at step 4, but they remain three texts: which fact the solver
meets first decides the explanation, not only the location
(`design-removal-right` the same).

### Different conflicts: `precedence-control-two-clauses`

```wxw
fn granted(p: { ...r }): Bool
  where r lacks { admin }, r lacks { admin } =
  { ...p, admin: true }.admin;
```

Two MUSes, steps {0, 2} and {1, 2} (one per clause). Orders report the
overlap at step 0, 1 or 2; both MUSes end at step 2, so `latest` gives
one location here.

### Different conflicts that stay different: `design-mixed`

```wxw
fn tagged(p: { id: Int, ...r }, q: { ...s }): Int = size(merge(p, q));
fn main(): Int = tagged({ id: 1 }, { y: 2 });
```

Two MUSes, {0, 1, 2} and {1, 2, 3}. Rule 1 gives step 0, 1, 2 or 3;
`latest` gives 2 or 3, depending on which MUS the order completed
first.

## Proposal

### (1) Same conflict: locate at the latest written participant

For a
refusal found while re-examining predicates (B3) only: the primary
location is the latest, in source order, of the requirement being
checked, the sites of the predicates whose cases made bindings the
failing rows reach (`boundBy`, B3), and the arrival sites of the metas
those rows hold (`arrivedAt`, already kept in Check/RowStore). Notes
keep their approved rules. Refusals found outside re-examination, and
every existing Tranche A and one-tail diagnostic, keep rule 1, so no
approved text moves. This is a provenance approximation of `latest`;
the model shows `latest` itself is stable for the same conflict, not
that the approximation picks the same step. B3 must check that on the
compiler: each same-conflict fixture above, written so that its steps
are reached in different orders (independent `let`s swapped, arguments
of a merge swapped), must keep one location. If the approximation does
not reach `latest`'s stability there, it comes back to the user before
B5 pins any text.

Cost: collecting the three kinds of span at the failure and taking the
latest: about 40-80 src lines in the failure path of B3's
re-examination (a located failure carrying its span), plus the tests
above; no solving change, no new search. The spans already exist except
the predicate site, which B3 adds anyway (plan §2.2).

### (2) Same conflict, different explanation: no change

Making
the explanation order independent would mean finding every explanation
of the conflict (each fact that could refuse it) and choosing by the
approved precedence, which a first-failure unifier does not see. That
is a new search, outside ADR 014's bounds without a published source.
The location is still stabilized by (1). Measured: 3 fixtures, 57 raw
and 4 classified shaped problems.

### (3) Different conflicts: no change

Reporting the conflict
whose latest step is earliest would need either checking constraints
in source order everywhere (the compiler already does, except where it
defers) or continuing past the first failure to find the others. The
first changes deferral, the second is a multi-error mode the checker
does not have. Complete diagnostic order independence is not promised
(plan §10, decision 13); these are documented as order dependent.

### Alternatives considered

Always locating at the predicate's site gives a fixed place, but often
not where the program went wrong (the merge can be far from the
requirement that contradicts it), and it ignores which requirement
completed the conflict. Locating at the earliest participant is also
stable for the same conflict, but it points at a requirement that was
fine on its own and became wrong only later. `latest` names the step
that completed the conflict, as rule 1 does when checking follows
source order.

## What this does not establish

The model renders no text: these are modelled selection and location
checks. The participant set in the compiler is an approximation the
model does not check (above). Shaped problems are classified for 307 of
855. Nothing is measured for nested rows or effect retries.
