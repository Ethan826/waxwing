# U8: the solved form for witness bindings

Status: contract for a separate repair, authorized by the author on
2026-10-24 (implement U8's trusted check with honest controls and
must-refuse fixtures). It does not authorize a-min's broader validator,
Task 4.6, G-D1 or the live switch. Statements first; the code and its
tests follow them.

Labels: **cited** (stated by a source named here), **argued** (reasoned
here, no check), **checked** (a named test or run backs it).

## 1. The gap

Dossier §18.76 item 2 rules that an image is in solved-substitution form:
declared rigids within their scope and sort, holes under the explicit
hole contract, and no reference to another unresolved flexible problem
variable (cited). r0-amin-statements.md §11 U8 records that trusted
certification does not enforce it: Candidate `generic` refuses only an
image that mentions a key of σ, Witness `coverage` judges coverage and
the hole contract judges holes, and build's `ImageVariable` is a late
`Broken` fault for site-read variables only (cited). A controller probe
certified σ = {x ↦ y}, y unbound, as Valid with a Witnessed compilation
(cited; reproduced by fixture (a) below before the repair, checked).

## 2. The statement

Let P be the recorded problem and W a witness offered for it. For every
key v of `W.bindings` (auxiliaries included, not only variables a site
reads), take its occurrences:

- `Inline τ`: every variable occurrence in τ at any depth, arrow
  parameters and results, record fields, record tails and `App`
  arguments, each with the sort of its position: a `TVar u` is at the
  type sort, a record tail u at the row sort.
- `Free n`: one occurrence of `holeVar n` at v's recorded sort (`vars`),
  the position lowering gives it (Strategy.HoleContract `image`). A key
  with no recorded entry gives no occurrence (ruling, §6).

W is in solved form when every occurrence (sort s, variable u) is one of:

1. a declared rigid of P at s: u ∈ `rigidTy` when s is the type sort,
   u ∈ `rigidRow` when s is the row sort;
2. `holeVar n` (Domain.Recorded.Hole), where every occurrence of hole n
   across the whole witness has the same sort.

Nothing else is allowed: no flexible problem variable, in σ's domain or
not; no made variable (`entailed i`, Entailed/Mgu.purs); no rigid
outside the declaration's lists; no rigid at the other sort.

## 3. Where it runs and what it refuses

The check is `solvedForm`, a private function of
Features.Check.Strategy.Witness, called by `coverage` after every domain
variable is found bound and before the hole contract. A failure is
`NoWitness (UnsolvedImage v)`, a new `NoWitnessReason` constructor
(Domain.Verdict), naming the first key in `Ord Var` order whose
occurrences break §2, as `HoleContract` names its variable. A hole at two
sorts is charged to the first key mentioning it.

Why the decision cannot be Witnessed without it (argued, from the code):
`Witnessed` reaches a decision only inside `Certified`, whose constructor
only Strategy.Substitution imports (Certified/Internal.purs; enforced by
scripts/structure-modules.mjs, cited); `certify` builds its compilation
only through `substitutionWitness`, which yields `Witnessed` only when
`coverage` returns `Right`. Elaborate's `witnessed` runs `coverage` again
on the `Judged` witness before `build`, so a witness from any other
source is judged by the same function. The check sits inside `coverage`,
not beside it, so neither caller can skip it.

Valid is unchanged. G0's check judges σ with holes at their defaults; a
reference to an unbound flexible variable is a compilation problem, not
evidence that the B atoms fail, so the refusal is `NoWitness`, never a
`CheckRefusal` (argued). Order in `coverage`: `Uncovered`, then
`UnsolvedImage`, then `HoleContract`. The hole contract applies bindings
and reads occurrences of holes, so it is judged only on solved images.

Exhaustive matches the constructor touches (checked by grep over src,
test and scripts, 2026-10-24): no PureScript `case` over
`NoWitnessReason` exists (Elaborate and Admission carry it opaquely).
JavaScript readers name reasons by constructor: test/r0-rt8-account.mjs
classifies any reason other than `HoleContract` as a DEFECT, which is
right for this one (production must never produce it; §5).
scripts/trusted-surface.json pins Domain.Verdict's compiled exports, so
the constructor is a reviewed re-pin.

## 4. What it does not cover

- Effect rows and marks: recorded types erase effect rows (T-R0b §2.2)
  and have no marks, so there is nothing to judge today (cited,
  Domain/Recorded/Atom.purs). a-min's effect-row bindings must extend §2
  to effect-row tails, rows nested in label arguments and arrows,
  data-type row arguments and `J S` marks (`rigidMarks`) before they are
  certified (U8, cited).
- The hole contract itself (W §1.5) stays Strategy.HoleContract's.
- Sort agreement between a key and its `Inline` image's root (a row key
  bound to a non-record) stays `generic`'s (`fits`) for σ and build's
  `SortMismatch` for a forged witness.
- Scope of a rigid beyond the declaration: `rigidTy`/`rigidRow` are the
  declaration's lists; the check does not model nested scopes because
  the recorded problem has none (argued).

## 5. Checks

- test/r0-u8-solved-form.test.mjs: must-refuse fixtures through
  `certify` over `problemOf` (test/r0-entailed-support.mjs): (a) x ↦ y,
  y unbound; (b) a record tail naming an unbound flexible row; (c) a
  nested reference in an `App` argument and in an arrow part; (d) an
  out-of-scope rigid, and wrong-sort rigids both ways; (e) a made
  `entailed i` variable; (f) one hole at two sorts; plus x ↦ y with the
  equation x = y, previously refused by `HoleContract` incidentally.
  Each has a positive control, and each refusal was shown failing before
  the check existed.
- Production: the online read-back over the pinned corpus keeps every
  witness (test/r0-elab-corpus.serial.test.mjs T1 and its pinned
  counts).

## 6. Rulings

- A `Free` binding whose key has no recorded sort contributes no hole
  occurrence: no lowering site reads such a key, so its hole has no
  position. Cost if wrong: a forged witness could carry a hole at two
  sorts through a key outside `vars`; build never reads it.
- The reason names the binding's key, not the offending variable,
  matching `HoleContract`. Cost if wrong: a diagnostic names less.
