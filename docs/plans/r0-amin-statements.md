# a-min: statements for review (G-effect-rows), revision 2 (2026-10-24)

Status: **statements only, for a second adversarial review.** No code.
Revision 1 was reviewed and found not ready (§8, F1-F17); this revision
applies the author's rulings on that review (dossier §18.76) and answers
every finding (§9). The author approved a-min for statements and review
first (§18.74); implementation follows a review that finds no S1 or S2.
Sources: docs/plans/r0-effect-rows-audit.md, r0-ea-representation.md,
r0-erased-rows.md §2 and §7.1, r0-certify-argument.md, findings.md
"Effect and coverage audit". Labels: **decided** (the author's),
**proposed** (this note), **open**. Task 4.6 and G-D1 stay blocked.

## 1. Goal, non-goals, threat model

Goal: the witness and `build` carry faithful effect information to the
post-Strip program (decided, Q1), and every effect fact that reaches
compilation has been judged by trusted code over the binding package
`build` reads, pre-Strip obligations included (decided, Q1, §18.76
ruling 1). Non-goals: carrying marks or clause rows through lowering
(Q2); proving effect soundness (assurance stays Pending); changing
today's live acceptance.

**Threat model (decided, §18.76 ruling 4).** The search is untrusted.
Soundness must hold for any candidate any strategy supplies: online or
not, inconsistent, malformed or deliberately forged. This is a
correctness boundary, not a claim about hostile programmers. An
`Outside` marker that prevents live exposure today does not excuse an
interface contract or theorem that would fail once the marker is
removed. §6 lists the independently forged inputs each invariant must
withstand.

## 2. Definitions (proposed)

**D1. Image types.** `ImageTy = Ty Var` (Domain.Type.Core) in stripped
form: every `Label e args m` has `m = Unmarked`, every handler's
`clauses = Nothing`. Its variables are restricted (decided, §18.76
ruling 2, a solved-substitution form):
- a rigid variable is allowed only if the declaration declares it, at
  the sort of its position (type, record row or effect row);
- a hole (`holeVar n`) is allowed, under the hole contract (types and
  record rows) or effect validation (effect rows, I5);
- no flexible problem variable appears, at any sort, effect-row
  variables included. The search resolves such references before it
  submits; trusted code checks the restriction (I3) and does not rely
  on the read-back. Precedent: Pottier 2014's solved forms, and today's
  `ImageVariable` fault (Image.purs), which this turns from a fault in
  `build` into a refusal in `certify`. If a required program cannot be
  represented this way, it comes back as a demonstrated example with a
  separately sourced extension.
- a data type carries exactly the declared number of row arguments.

**D2. Bindings.** `Inline ImageTy` for type- and record-sorted
variables, `InlineRow (TyRow Var)` for effect-row variables (same
variable restrictions), `Free n` for any sort, meaning hole n at its
variable's sort. One hole number has one sort across the whole package
(I3). The binding constructor agrees with the variable's sort (I3).

**D3. Pre-Strip evidence** (decided, ruling 1). The search also
proposes, beside the bindings: a mark for every mark variable the
problem records (`NoFail`, `Plain`, or a written mark variable in
scope; never `MarkMeta` or `Unmarked`), and a row for every handler
literal's clause row (`⟨p, clauses⟩`, same restrictions as D2). The
bindings and the evidence form one **binding package**; trusted code
judges the evidence against the recorded obligations (D7) and then the
package's evidence is discarded: `build` never reads it, and the
post-Strip IR has none. FX008's existing rules are the specification of
the mark obligations; reusing them makes the validator a checker, not
an inference engine.

**D4. Sorts, roles, positions.** `VarSort` gains `SortEffectRow` and
`SortMark`; `Role` and `CheckedName` (Domain.Recorded.Atom, trusted)
gain constructors for the new slots, and an effect-row variable's
position is a new `CheckedName` form, distinct from checked
`Slot p i`, so its index never collides with a checked instantiation
slot (F17). Effect-row instances stay out of checked `Instantiation`
slots (T5's positions unchanged).

**D5. Slot rule** (F5). A written label translates under θ: its type
arguments are ordinary type-sorted images, so a label lives in one
place. Handles sit only at row tails: an effect-row type parameter of
an instantiated callee, constructor or operation (`⟨p, inst i⟩`), the
opened tail (`⟨p, opened⟩`), a lambda's row (`⟨p, effect⟩`, which the
annotation's ambient tail reuses, as `annotationRow` does), each
over-application stage (`⟨p, stage k⟩`, shared by the atom and the IR
stage), the handler literal's inference-row tail (`⟨p, handler⟩`), the
clause row (`⟨p, clauses⟩`, evidence), `show`'s and `crash`'s rows, and
`main`'s tail (decided, Q3).

**D6. Trusted erasure.** `erase : ImageTy → RTExpr` and `eraseRow :
TyRow Var → RTExpr` (a record row to a record term), T-R0b §2.2's
translation, **sort-aware**: a record-sorted bare hole erases to
`Record [] [hole]` (R022). It is the only projection certification
uses (decided, Q4) and lives in a trusted Strategy-side module, since
Strategy modules may not import Generate.*.

**D7. Reference projections, for tests only.** A fresh, independently
written projection (not ReadBack.Type, which is trusted and serves the
read-back), compared with D6 on images; and Generate.Elab.Recorded, the
translator the atoms are built with, compared with D6 on generator
types (I4).

**D8. Effect obligations.** Part of `RecordedProblem` (in
Domain.Recorded.Internal; generated with the atoms), so `elaborate`'s
problem identity covers them. Inventory, to be complete for today's
effect checks (I10): every class-f effect refusal of findings.md's
audit table (EffectNotAllowed at Reject.purs:69 and Require.purs:123,
MustBePure, RowEquality at Argument.purs:70 and RowName.purs:96,
CallbackRowLacks, UnhandledEffect, DeferMayFail, DeferMayPerform,
DeferHandlerMayFail, DeferHandlerVariable, ExpectedNofail,
HandlerMayFail, ExpectedHandler, FailNeedsConcrete at Failure.purs:102);
r0-erased-rows §2's K1, K1e and **K2**: every `Equal` atom re-read at
full types, its row parts equal up to scoped-label order (F2); and
§7.1's counterexample `fn g(): Unit with pure = Log.log(1)`. Forms:
row inclusion, row equality, absence (no rigid tail in a deferred row;
no `Fail` label; `main` within `Console`), and FX008's mark constraints.
Generation threads an ambient row through its context (the lambda's
`⟨p, effect⟩` in a lambda body, the declared row in a declaration
body).

**D9. Effect validation.** A trusted checker `validateEffects` over D8
with every row, mark and clause row known from the package. Three
outcomes (decided, ruling 3): `EffectsChecked`; `ObligationFailed
reason`, a check failure of this candidate (not evidence that the
source is invalid: an untrusted candidate may simply be wrong);
`EffectsUnchecked reason`, validation absent or not supported for an
obligation kind.

**D10. Placement** (F4). `certify` builds the package from the
search's σ₀ and evidence, checks I3, runs G0 on `erase`, then runs
`validateEffects` on the same package against the same problem, and
the result is part of the `Certified` it mints: `Certified Valid
Compilation EffectStanding`. Only `EffectsChecked` lets `elaborate`
build; otherwise the declaration is not compiled, with the standing as
the reason. No separate token is paired later, so "the same witness"
means the value `certify` constructed, not an identity PureScript
cannot express.

## 3. Invariants (proposed)

**I1. R026's coupling.** G0 judges exactly `erase` of the package's
type- and record-sorted bindings, settled; the compilation is built
from the same σ₀; no strategy supplies images, evidence or obligations
separately.

**I2. Every row is accounted for** (F10). Each row in `build`'s IR is
either a written row translated by a named rule (declaration signature;
callee, constructor or operation signature under θ; builtin signature;
body annotation; Fail payload), mentioning only the declaration's
rigids, or a witness row (`InlineRow`, `Free`, or nested in an
`Inline` image). Every witness row, including those that appear only in
atoms (Operator.purs's Apply and Pipe arrows, Call.purs:161's
over-application arrow), and every evidence item is read by
`validateEffects`.

**I3. Package well-formedness, checked in `certify` before G0.** A
package is refused (a `CheckRefusal`) if an image holds a mark or a
clause row; a variable violates D1 (out-of-scope or wrong-sort rigid,
any flexible reference); a data type's row count differs from its
declaration's; a hole number is used at two sorts; a binding
constructor disagrees with its variable's sort; or evidence holds a
mark outside D3's set. The read-back (untrusted) strips marks and
resolves references; I3 only checks (F6).

**I4. Projection agreement, by test.** `erase` agrees with the fresh
reference on every corpus image and on generated images, and with
Generate.Elab.Recorded on every generator type. Evidence that `erase`
means T-R0b §2.2's translation; not made true by construction.

**I5. `Free` effect rows.** A `Free n` at an effect-row variable means
the closed empty row (the default, argued as W §1.5: obligations are
judged at that default). If an obligation fails there, the standing is
`ObligationFailed`, not `EffectsUnchecked` (F12). Coverage alone never
makes a package compilable (decided, Q5).

**I6. Slot inventory follows reads.** One fixture per site of D5, plus
the sites the review added: `translate … Rigidly` in body contexts
(Control.purs:151, Failure.purs:82 and :115), Fresh.purs's
`RowSort → Nothing` (to mint effect-row instances), constructor
patterns (Match.purs:110), function and constructor references
(Call.purs:112), atom-only arrows. A structural test lists every
generator write of `closedRow`, a literal row, or a body-context
`Rigidly` translation, each a named exception with a reason (F11).

**I7. Exact hole numbering.** `build` applies `holes` (Body.purs), so
its post-Strip IR numbers type, row-tail and row-label-argument holes
exactly as today's (S3-d). The fresh-hole numbering for absent
variables (Witness.purs) counts holes inside rows (F9).

**I8. Fidelity target.** T2 compares `strip (build …)` with today's
post-Strip declaration, rows included, exact where no variable is in
`Amb`, by site otherwise.

**I9. Correspondence is not soundness.** T2 equality shows `build`
reproduces today's checker; only `EffectsChecked` makes a package
compilable.

**I10. Obligations complete** (F3). D8 holds an obligation for every
check of today's that refuses effects; shown by one forged-package
fixture per refusal kind (through the harness where an `Outside`
marker blocks the program) and a mutation test per obligation kind
that drops it and shows its fixture flip.

**I11. Coupling** (F4). Obligations live in the recorded problem;
validation runs inside `certify` over the package it built; its result
is inside `Certified`; `elaborate`'s problem identity covers both.

**I12. Evidence lifecycle.** Evidence is read by `validateEffects`
alone, never by `build`, and is absent from the IR.

## 4. Trust boundaries (proposed)

| Component | Trust | Reason |
|---|---|---|
| `certify` (gains I3, `erase`, `validateEffects`) | trusted | I1, I3, I11 |
| `erase` (D6) | trusted, review-required list | G0's verdict rests on it |
| `validateEffects` (D9) | trusted, review-required list | compilation's effect claim |
| Strategy.Witness `bindingsOf`, Cov | trusted (listed) | the package's bindings |
| Strategy.HoleContract | trusted (listed) | judges `erase` of images; not effect rows (I5) |
| Domain.Recorded.Atom | trusted (listed); `VarSort`, `Role`, `CheckedName` change | D4 |
| D8's generation | lowering boundary (Generate family) | obligations are generated |
| `build` with handles; Features.Check.Elaborate | lowering boundary | I2, D10 |
| the read-back, the online search | untrusted | they propose; I3 and D9 judge |
| reference projections (D7) | test-only | differential only |

## 5. Interim (decided, ruling 3)

Until `validateEffects` exists, option c stays a shadow comparison path:
provisional output is built and inspected only in explicitly labelled
shadow tests; no compilation result is effect-approved; every Solved
declaration's standing is `EffectsUnchecked`; Task 4.6 and G-D1 stay
blocked; today's live acceptance is preserved.

## 6. Distinguishing tests (proposed)

Each fixture separates its claim from the nearest weaker variant (and,
where marked, the stronger one). Programs are proposed, not yet run.

| Claim | Fixture | Fails under |
|---|---|---|
| I1 | R026's forged `id2`, full images | an erase-only check of separately supplied images |
| I2, D8 (K2) | `effect Log { fn log(n: Int): Unit; }; fn f(h: Unit -> Unit with Log): Unit with pure = { let k = h; k(()) }` with the Apply arrow's row handle forged to `pure` | judging only the erased atoms |
| I2 | `fn run(f: Unit -> Unit with pure): Unit = f(()); fn g(): Unit = run(fn(u: Unit) => ())` with the lambda's `⟨p, effect⟩` forged to `Console`: refused | rows read only where the IR writes them |
| I2 control | `fn g(): Int = { let k = fn(u: Unit) => (); 0 }`, same forgery: validation accepts, T2 differs | (fidelity is T2's, not validation's) |
| D3, I12 (marks) | test/fixtures/r0/audit/expected-nofail.inferred (refused today) against .selected (compiles): rows equal up to marks | a rows-only validator |
| I3 | an image with `Plain` or a clause row; an out-of-scope rigid (R031 (1)'s program with rigid 7); a flexible reference in an image; `type Box(a, ...e) = Box(a, Unit -> Unit with ...e)` passed through `id` with the image forged to `TData Box [Int] []`; one hole number at two sorts; an `Inline` at an effect-row variable | trusting the search's form |
| I3 stronger | written signature marks (`fn g(h: Unit -> Unit with nofail Log): Unit with nofail Log = h(())`) pass; an online package holding a handler type passes once the read-back strips | refusing every marked or handler-typed candidate |
| I4 | a mutant `erase` keeping a data row argument as a type argument; a mutant blind to record-sorted holes | collapsing `erase` into one reference |
| I5 | a `Free` lambda row whose body performs `Console`, passed to a `pure` parameter: `ObligationFailed` | coverage alone approving |
| I5 stronger | `fn run(f: Unit -> Unit with pure): Unit = f(()); fn g(): Unit = { let k = fn(u: Unit) => (); run(k) }` with the lambda's row `Free`: accepted | refusing every `Free` effect row |
| I6 | one fixture per site of D5 and I6's list, including R031 (1) and (2), `main` performing `Console`, an over-application, `show`, `crash`, a constructor pattern | a slot list from r0-erased-rows §2.1 alone |
| I7 | a body with a row-tail hole before a type hole | numbering type holes alone |
| I8 | a declaration differing from today only in a row label | effect-erased T2 |
| I8 stronger | output differing from today only in a mark or clause row passes T2 | comparing pre-Strip |
| I9 | a package equal to today's post-Strip IR whose mark evidence fails (built through the harness; today's checker refuses such programs) | treating T2 as validation |
| I10 | one forged package per refusal kind of D8's inventory; a mutation dropping each obligation kind flips its fixture | an obligation list without completeness |
| I11 | obligations or evidence from another declaration's problem paired with this package | validation outside `certify` |
| D5 | a callee `apply(f: Unit -> Unit with State(a), x: a)`: a package whose tail binding repeats `State` at a different argument is refused or judged, never silently duplicated | a whole-row handle holding written labels |

R031's two pins flip to today's form when D5 and I3 land. RT8 and
window moves are accepted when explained and reviewed; current pins
stay as a comparison cohort (decided, Q6).

## 7. What a-min does not change

RTExpr's grammar and G0's atom judgements; the Lean vocabulary; lowering;
today's checker. It does change Domain.Recorded.Atom's `VarSort`, `Role`
and `CheckedName` (D4), the recorded problem (D8), the witness and the
`Certified` token (D2, D3, D10), and the read-back (I3).

## 8a. Open after revision 2

- **The validator's algorithm.** Checking, not inference: row inclusion
  and equality with scoped labels and one tail (Leijen, TFP 2005), as a
  checker over an elaborated term (precedents: GHC's Core Lint;
  translation validation, Pnueli, Siegel and Singerman 1998). Its mark
  part reuses FX008's rules, a project design with no published
  source: flagged for explicit approval (ADR 014).
- **The new well-formedness check (I3)** and **the ∅ default for effect
  rows (I5)**: small, new, flagged.
- **Cost.** The canonical encoding, Cov's domain, the recorded problem's
  pins, RT8 and window, and T2's harness all change.

## 8. Adversarial review 1 (2026-10-24): not ready

An independent reviewer (Opus, read-only; nothing run) reviewed these
statements at d7f30b0. The controller re-read F1's and F2's evidence
(the mark refusals `ExpectedNofail`, `HandlerMayFail` in
Domain/Problem.purs and the fixture pair
test/fixtures/r0/audit/expected-nofail.{inferred,selected}.json;
Generate/Operator.purs's Apply arrow with its row handle appearing only
inside a `GenEqual` atom) and they hold. The statements need revision
before approval. Findings, by severity:

**S1.**
- **F1. Marks cannot be judged.** Today's effect refusals include mark
  obligations (ExpectedNofail, HandlerMayFail, DeferHandlerMayFail,
  DeferHandlerVariable); D1/I3 forbid marks in images, D2 has no mark
  binding and D7's vocabulary has none, so O3's "marks judged by D6
  before Strip" has no data. The nofail fixture pair differs only by a
  mark: a rows-only D6 accepts both. Contradicts Q1's pre-Strip
  evidence. Fix: separate pre-Strip evidence (mark-variable and
  ⟨p, clauses⟩ bindings outside images, dropped after D6), or D6 infers
  marks (FX008's design as source; novelty).
- **F2. K2 is missing; nested rows unjudged.** A type equation between
  arrows, data or handler types also equates their rows
  (r0-erased-rows §2, K2). G0 judges erased atoms, so the row parts of
  every `Equal` atom and the rows nested in `Inline` images are judged
  by no one. Example: `fn f(h: Unit -> Unit with Log): Unit with pure =
  { let k = h; k(()) }` with the Apply arrow's row forged to `pure`.
  Fix: D7 re-reads every `Equal` atom at full types (row equality up to
  scoped-label order); I2 covers every row in any binding.
- **F3. D7 cites the wrong inventory and claims no completeness.**
  §2.1 lists where rows are made, not checked. The checking inventory
  is findings.md "Effect and coverage audit" (13 effect refusals),
  r0-erased-rows §2's K1, K1e, K2 and §7.1's counterexample; some are
  absence constraints (no rigid tail in a deferred row, no Fail label,
  `main` ⊆ Console). A dropped obligation makes D6 accept vacuously.
  Fix: I10, D7 complete for today's effect checks, with one forged-
  witness fixture per refusal kind and a mutation test per obligation
  kind; widen D7's form.
- **F4. The coupling is not tied down.** D7 "beside the recorded
  problem" is tied to neither the problem nor the witness (R026's
  shape); D8's "identical witness value" has no meaning in PureScript.
  Fix: D7 inside `RecordedProblem` (Domain.Recorded.Internal), so
  `elaborate`'s problem identity covers it; name where
  `validateEffects` runs (inside `certify` on the witness it builds, or
  in `elaborate` just before `build` on the same binding);
  `EffectsChecked` minted by one private function.
- **F5. One piece of information in two places.** A whole-row handle at
  Translate `rowOf Instantiated` would hold written labels (e.g.
  `State(a)`) that also live in ⟨p, inst a⟩'s `Inline`, unrelated by
  any check; likewise a new A11 slot and the over-application stage.
  Fix: written labels translate under θ; handles only at RowSort tails
  and the opened tail; A11's tail is the lambda's ⟨p, effect⟩; atom and
  IR stage rows share handles.

**S2.** F6 the online read-back is pre-Strip, so I3 refuses legitimate
witnesses unless the read-back strips (it must, untrusted; I3 checks).
F7 I3 must also refuse a wrong data row count, an out-of-scope or
wrong-sort rigid, one hole number at two sorts, a binding constructor
disagreeing with the variable's sort, and images naming problem
variables. F8 images naming effect-row problem variables is new
resolution machinery (occurs check), unflagged: forbid, or specify with
a source. F9 the fresh-hole numbering (Witness.purs) must count holes
inside rows; one hole number, one sort. F10 I2's source list is false
(instantiated signatures, builtins, body annotations, Fail payloads) and
"vice versa" is false (atom-only handles, clause rows). F11 I6's
structural test misses `translate … Rigidly` body sites (A11 itself),
Fresh.purs's `RowSort → Nothing`, constructor patterns and references.
F12 a `Free` that fails its obligations is checked-and-failed, not
`EffectsUnchecked`; its default is the closed empty row, argued as in
W §1.5. F13 `erase` must be sort-aware (R022) and must agree with
Generate.Elab.Recorded, the translator the atoms use: add that
differential. F14 the interim before D6 exists is unstated. F15 the I2
fixture does not separate (use a lambda passed to a `pure` parameter
with its row forged to Console; control: an unconstrained lambda). F16
O5 reopens Q3; O4 conflicts with O1. F17 positions for effect-row
variables are unspecified.

**S3.** A §-reference typo; ⟨p, clauses⟩ dropped silently; §6
understates changes to Atom.purs (`VarSort`, `Role`, `CheckedName`);
I7 can claim exact numbering (build already applies `holes`);
ReadBack.Type is trusted and serves the read-back, so D5 cannot simply
be it; the trust table lacks the read-back, Atom.purs, `bindingsOf`,
HoleContract and Elaborate, and `certify` is not "unchanged"; no
ambient-row field in generation's `Context`.

Reviewer's rulings to confirm: forged and non-online witnesses count
as a soundness threat (R026's model); gaps behind `Outside` markers
were kept at S1 where the statements claim coverage.

## 9. Revision 2's answers to review 1

| Finding | Resolution in revision 2 |
|---|---|
| F1 marks | D3 pre-Strip evidence (marks, clause rows) in the package; D8 holds FX008's mark obligations; I12; the nofail fixture pair in §6 |
| F2 K2, nested rows | D8 re-reads every `Equal` atom at full types; I2 covers nested and atom-only rows; §6's K2 fixture |
| F3 inventory, completeness | D8 cites the audit table, K1, K1e, K2 and §7.1; absence forms; I10 with fixtures and mutations |
| F4 coupling | D8 inside the recorded problem; D10 validation inside `certify`, result in `Certified`; I11 |
| F5 two places | D5: labels under θ, handles only at tails; A11 reuses `⟨p, effect⟩`; stages shared |
| F6 pre-Strip read-back | I3: the read-back strips, `certify` checks; §6 stronger-side fixture |
| F7 I3 incomplete | I3's six conditions |
| F8 flexible references | D1 forbids them (ruling 2) |
| F9 hole numbering | I3 one sort per hole; I7 fresh numbering counts row holes |
| F10 I2's sources | I2 restated |
| F11 structural test | I6's added sites and scan |
| F12 `Free` reason, default | I5: closed empty row; `ObligationFailed` |
| F13 erase | D6 sort-aware, located; I4 against Generate.Elab.Recorded |
| F14 interim | §5 (ruling 3) |
| F15 I2 fixture | §6's replacement and control |
| F16 O4/O5 | `⟨p, clauses⟩` is evidence (D3); `main`'s slot decided (D5) |
| F17 positions | D4 |
| S3 (a)-(i) | references fixed; `⟨p, clauses⟩` restored; §7 lists the Atom.purs changes; I7 exact; D7 fresh reference; trust table extended; D10 replaces "identical value"; the `effectErased` case stays until validation exists, then compilation requires `EffectsChecked`; D8 threads the ambient row |

## 10. Adversarial review 2 (2026-10-24): not ready

A fresh independent reviewer (Opus, read-only; nothing run) reviewed
revision 2 at 3daf6f9. The controller re-read N1's and N2's evidence
(expected-nofail.inferred.json's note: "work's nofail Log reaches
caller's plain Log through r's record meta"; r0-erased-rows §7.1 item
3: `EffectsUnchecked` "stays Unresolved"; Strategy.purs `checked` turns
any `Certified` into an accepted Solution) and they hold. Review-1
status: F5, F8, F9, F11, F13, F16, F17 resolved; F1-F4, F6, F10, F12,
F14 partly (via the findings below); F7 resolved as text but not
checkable from the problem alone (N9).

**S1.**
- **N1. Marks carried by bindings have no evidence slot.** Marks are
  constrained through type equalities (FX008 §3.3-3.4); in the cited
  fixtures the `nofail` mark travels through stripped bindings (a
  record image, a lambda row, a stage row). Evidence only at recorded
  mark variables leaves the validator to infer the rest, or to treat
  every program whose marks pass through a binding as unsupported. Fix:
  evidence holds a mark for every label occurrence in every witness row
  and image (keyed by variable and label path), plus m and C for every
  handler type in an image; K2 compares marks except on inference rows;
  equivalently, a marked pre-Strip package of which `build` reads only
  the stripped projection.
- **N2. An effect failure would be a Solved verdict.** D10 puts
  `ObligationFailed` and `EffectsUnchecked` inside an accepted
  `Certified`, which `checked` turns into a Solution; rule 2 stops at
  the first acceptance. §7.1 item 3 (the author's) keeps
  `EffectsUnchecked` Unresolved, and ruling 3's "check failure" is a
  `CheckRefusal` in the code. Fix: `ObligationFailed` is a
  `CheckRefusal` (the run continues to other strategies);
  `EffectsUnchecked` is an Unresolved reason; or fold the standing into
  `Compilation` so that `Witnessed` implies `EffectsChecked`.
- **N3. Holes nested in rows have no explicit contract.** I5 covers
  `Free` at effect-row variables only; a type or record hole sitting
  only in an effect label argument is erased from the atoms and judged
  by no one. Fix: the validator judges every hole in a row at
  lowering's default (effect tail none, type Int, record tail dropped);
  say whether K2 compares holes syntactically or at defaults; extend
  r0-certify-argument C1-C2 to effect rows.

**S2.** N4 generation records no mark variables today; D3 and D8 must
enumerate FX008's mark sites (local annotations, the handler's m, each
installation's frame mark, opening at a use, consumption copies). N5
no slot for each clause's row, the deferred row, or the ambient rows of
`with`, `handle` and clause bodies; generation's context has no row
field. N6 D5 omits `⟨p, apply⟩`, a lambda's inner stage rows and
partial-application stages. N7 refusal kinds missing from D8:
LabelMismatch, row-driven TypeMismatch and InfiniteType, FX032; the
mutation granularity cannot detect a dropped FX008 constraint class;
use FX008's constraint generators as obligation kinds and its probes as
the oracle. N8 `SortMark` variables would enter Cov's domain with no
binding form, so every marked program would be `Uncovered`; the
exhaustive matches to change are unlisted. N9 I3 needs declaration
arities and effect rigids the recorded problem does not hold (an
amendment to `Fields`); the implicit ambient row variable counts as
declared. N10 the evidence domain must equal the recorded sites
exactly. N11 D10's change surface (Strategy.purs `checked`, `Solution`,
`Attempt`, `NoWitnessReason`, `certifySound`, the certify argument) is
unlisted. N12 the online read-back must compute a mark assignment (for
example the least solution of the mark graph) or honest packages fail.
N13 §6 lacks forged clause-row and mark evidence on programs accepted
today, rows nested in `Inline` images, missing or extra evidence; the
D5 fixture's expectation is indeterminate. N14 completeness of a
ground mark assignment relative to FX008's path criterion is a derived
claim needing an argument and a source (least solutions in a finite
lattice, e.g. Rehof and Mogensen 1999) and an oracle.

**S3.** Reject.purs's raise is at :78, not :69; fixture paths lack
`.json`; "Pottier 2014's solved forms" is unspecific; D10's "only
`EffectsChecked` builds" must be labelled post-interim; row inclusion
by consumption is FX001's design, not Leijen's (novelty flag).

Separating examples proposed by the reviewer (twelve, including the two
FX008 fixtures with free mark choices, two strategies where the first
fails effects, LabelMismatch, scoped order, Fail payloads, holes in
label arguments and nested tails, hole identity, a local-annotation
mark, missing and extra evidence, and the stage and Apply sites) are
to be added in revision 3.
