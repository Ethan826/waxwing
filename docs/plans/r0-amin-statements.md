# a-min: statements for review (G-effect-rows, 2026-10-24)

Status: **statements only, for adversarial review.** No code. The author
approved a-min for statements and adversarial review first, with
answers to the audit's seven questions (dossier §18.74); implementation
follows the review. Sources: docs/plans/r0-effect-rows-audit.md (the
audit and the a-min sketch), r0-ea-representation.md (options a-c),
r0-erased-rows.md §7.1 (E-a and the effect-validation invariant),
r0-certify-argument.md (R026's coupling, C1-C3). Labels: **decided**
(the author's), **proposed** (this note), **open** (for the author).
Task 4.6 and G-D1 stay open.

## 1. Goal and non-goals

Goal: the witness and `build` carry faithful effect information to the
checking boundary, the post-Strip program (decided, Q1), and every piece
of it that reaches compilation has been judged by trusted code over the
same witness `build` reads. Non-goals: carrying marks or clause rows
through lowering (decided, Q2); proving effect soundness (assurance
stays Pending); changing what today's compiler accepts.

## 2. Definitions (proposed)

**D1. Image types.** `ImageTy = Ty Var` (Domain.Type.Core) restricted to
the *stripped* form: every `Label e args m` has `m = Unmarked` and every
handler's `HandlerRows` has `clauses = Nothing`. A row tail is a rigid
variable, a hole variable (`holeVar n`) or an effect-row problem
variable (D3). Precedent: Check/Strip.purs and Type/Marks.purs
`stripMarks`, which produce this form for today's program.

**D2. Bindings.** `Binding = Inline ImageTy | InlineRow (TyRow Var) |
Free Int`. `Inline` binds a type- or record-sorted variable, `InlineRow`
an effect-row variable, `Free n` any sort, meaning hole n at its
variable's sort (W §1.6, extended to effect rows: an effect-row hole).

**D3. Sorts.** `VarSort` gains `SortEffectRow`. The generator mints an
effect-row variable at every slot of §5 (I6), named as r0-erased-rows
§6 (`⟨p, effect⟩`, `⟨p, stage k⟩`, `⟨p, handler⟩`, `⟨p, apply⟩`,
`⟨p, inst i⟩`, `⟨p, opened⟩`) plus the new slots of I6. Recorded atoms
(RTExpr) still mention no effect-row variable.

**D4. Trusted erasure.** One function `erase : ImageTy → RTExpr` (and
`eraseRow` for record rows), T-R0b §2.2's translation: effect rows,
data row arguments and handler rows dropped, a declared type of no
arguments and no rows a base, record fields by label and tails in
`Ord Var` order. It is the only projection certification uses
(decided, Q4), and it is trusted surface.

**D5. Reference projection.** An independently written projection of
the same meaning, test-only and untrusted, used for differential tests
against D4 (decided, Q4: not collapsed into D4). Candidate: today's
ReadBack.Type `readType` route generalised from `Open` to `Var`, or a
fresh test implementation; the existing independence of `readType` and
Generate.Elab.Recorded, which RT8 relies on, is kept.

**D6. Effect validation (open in algorithm, proposed in contract).** A
trusted function `validateEffects` that, given the declaration's
generated effect obligations (D7) and the witness's effect bindings,
either accepts, giving a token `EffectsChecked`, or refuses with a
reason. It reads the witness itself, not a copy.

**D7. Effect obligations.** Generation records, beside the recorded
problem, the effect obligations of the body: for every call, perform,
handler, lambda and stage, the row inclusions or equalities today's
checker enforces (r0-erased-rows §2.1's sites), over effect-row
variables, rigid tails and written labels. Proposed as a separate
structure because RTExpr atoms stay row-free (D3). Its exact form is
open (§7, O1).

**D8. Acceptance.** A strategy's acceptance remains `Certified`
(R026). Compilation needs a second token over the same witness:
`Compilable = Compilable Certified EffectsChecked`, minted only where
both checks ran over the identical witness value (proposed; §4).

## 3. Invariants (proposed)

**I1. R026's coupling, unchanged.** G0 judges exactly `erase` of the
witness's type- and record-sorted bindings (settled), and the witness
offered is the one built from the same pre-default σ₀. `certify` keeps
building the witness itself; no strategy supplies images separately.

**I2. Effect coupling.** Every effect row `build` writes into the IR
comes from a witness binding (`InlineRow` or `Free`) or from the
declaration's written signature (rigid), and `validateEffects` judges
exactly those bindings. No row reaches `build` that the validator did
not read, and vice versa.

**I3. Stripped images.** A witness whose image holds a mark other than
`Unmarked` or a clause row is refused by trusted code before G0 runs
(a `CheckRefusal`, not a fault: the search offered a malformed
candidate).

**I4. Projection agreement, by test.** `erase` and the reference
projection agree on every image the corpus produces, and on generated
images (a property test). Agreement is evidence that `erase` means
T-R0b §2.2's translation; it is not made true by construction.

**I5. `Free` effect-row bindings.** Cov's coverage alone never makes a
witness compilable (decided, Q5). A `Free n` at an effect-row variable
is judged by `validateEffects`: its interpretation (hole n; lowering
gives it no row) must satisfy the obligations that mention it.
Otherwise the declaration is not compiled, with reason
`EffectsUnchecked` (r0-erased-rows §7.1 item 3).

**I6. Slot inventory follows reads.** Every generator site that writes
an effect row today writes a handle instead: Translate `rowOf
Instantiated` (A6), `arrowOf` (A7), over-application stages (A8),
`show` and `crash` (A9), the handler literal's inference row (A10),
the lambda annotation's ambient tail (A11), `main`'s tail (A12); plus
nested rows inside images (D1) and data row arguments at the declared
count. A structural test lists every generator write of `closedRow` or
a literal row and requires each to be a named exception with a reason
(decided, Q3: a test per site).

**I7. Shared hole numbering.** `build`'s IR numbers type holes, row-tail
holes and row-label-argument holes jointly as Check/Holes.purs `holes`
does, so after Strip it equals today's numbering up to renaming.

**I8. Fidelity target.** T2 compares `strip (build …)` with today's
post-Strip declaration, rows included, exact where no variable is in
`Amb` and site by site otherwise (decided, Q1). Marks and clause rows
are compared only through validation (I5), not through T2.

**I9. Correspondence is not soundness.** T2 equality shows `build`
reproduces today's checker. Effect validation (D6) is what judges the
rows; a passing T2 with a failing or absent validator does not make a
declaration compilable.

## 4. Trust boundaries (proposed)

| Component | Trust | Reason |
|---|---|---|
| `erase` (D4) | trusted, review-required list | G0's verdict rests on it |
| `validateEffects` (D6) | trusted, review-required list | compilation's effect claim rests on it |
| `certify` | trusted (unchanged role) | I1 |
| image well-formedness (I3) | trusted, inside `certify` | a malformed image must not reach G0 |
| `Compilable` minting | trusted, one module | D8: both tokens over one witness |
| D7's generation | lowering boundary (Generate family) | obligations are generated, as the recorded problem is |
| `build` with handles | lowering boundary | I2 |
| reference projection (D5) | test-only, untrusted | differential only |
| the online search's rows | untrusted | today's checker proposes; D6 judges |

## 5. Distinguishing tests (proposed; each fails under the nearest weaker variant)

| Claim | Fixture | Fails under |
|---|---|---|
| I1 | R026's forged-`id2` probe with full images | erase-only check of a separately supplied image |
| I2 | a witness whose `InlineRow` adds `Console` to a pure lambda's row; G0 passes (erased equal) | checking only the erased projection |
| I3 | an image with `Plain` or a clause row | trusting the search's stripping |
| I4 | a mutant `erase` that keeps a data row argument as a type argument | collapsing D4 and D5 |
| I5 | `Free` on a lambda's effect row whose body performs `Console`, in a declaration written `with pure` | coverage alone (Cov) approving compilation |
| I5 | `Free` on a row no obligation constrains | rejecting all `Free` effect rows (too strong) |
| I6 | one fixture per site: nested arrow (a lambda returning a lambda), data row argument (R031 (2)), handler literal through `id`, annotated lambda (R031 (1)), `main` performing `Console`, an over-application, `show` and `crash` | a slot list taken from §2.1 alone |
| I7 | a body with a row-tail hole before a type hole | numbering type holes alone |
| I8 | a declaration whose only difference from today is a row label | effect-erased T2 |
| I9 | a declaration T2 accepts whose obligations fail | treating T2 as validation |

R031's two pins flip to assert today's form when I6 lands. RT8 and
window moves are accepted when each is explained and reviewed; the
current pins are kept as a comparison cohort (decided, Q6).

## 6. What a-min does not change

RTExpr, G0's atoms and judgements, the Lean vocabulary, the hole
contract's type- and record-sorted judgements (it judges `erase` of
images), lowering, and today's checker.

## 7. Open for the author or the review

- **O1. The validator's algorithm and source.** Proposed: checking,
  not inference, of D7's obligations with every row known from the
  witness: row inclusion and equality over labels with scoped
  duplicates and one tail (Leijen, TFP 2005), as a checker over an
  elaborated term (precedent: GHC's Core Lint over explicitly typed
  Core; translation validation, Pnueli, Siegel and Singerman 1998).
  Novel parts, if any, are flagged at design time.
- **O2. Where `EffectsUnchecked` sits.** As an Unresolved reason
  (verdict level, r0-erased-rows §7.1 item 3) or as a `NoWitness`
  reason (compilation level) when the verdict is Solved but effects
  are not validated. The two differ in what the census counts.
- **O3. Pre-Strip evidence.** Q1 asks that evidence effect validation
  needs before stripping be kept separately. Proposed: D7's
  obligations and `validateEffects`' result are that evidence; marks
  and clause rows are judged by D6 (handler clauses) before Strip, and
  only then dropped.
- **O4. Clause rows.** Q2 lets clause rows disappear at Strip "after
  their checking obligations are discharged": D7 must therefore hold
  the clause-row obligations of every handler literal, and D6 judge
  them; whether the witness needs a binding for a clause row's tail is
  open.
- **O5. `main`.** Whether today's `main` row carries inferred labels
  (unknown in the audit) decides whether its slot is a handle or a
  closed row by rule.
- **O6. Cost.** The canonical encoding, Cov's domain, RT8 and window
  pins and T2's harness all change (audit §5); the old pins stay as a
  cohort.

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
