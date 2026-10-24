# a-min: statements, revision 3.3 (G-effect-rows, 2026-10-24)

Status: **statements only, for a targeted re-check** (dossier §18.82).
No code; implementation unauthorized; Task 4.6 and G-D1 blocked.
Revision 3 (one design, §18.77-18.78) was reviewed a third time (§R3);
revision 3.1 applied those fixes and delivered U1 and U6; a targeted
review of 3.1 (§R4) found one plausible S1 (N1) and four S2; revision
3.2 applied them under §18.80's conditions (§0a). A targeted re-review
of 3.2 (§R5) found two S1 (F1, F2), three S2 (F3, F5) and S3 items.
This revision 3.3 applies them under §18.82's five conditions (§0b)
and folds in the obligation semantics of §18.81 (§14). F5's unifier
entry-point audit is in §13a; it found two unrecorded paths (O1, O2). §R3a, §R4a
and §R5a are the resolution ledgers. "Local fixes" describes edit
size, not confidence that the remaining soundness work is small
(§18.80). Labels on every claim: **decided** (the author's),
**universal** (an argument for all inputs), **bounded** (a check over
finite inputs, named), **unrun** (a predicted example outcome),
**reasoned** (an argument from reading the code or the design for the
cases named, checked by no run), **design** (holds by construction of
the proposed representation once built; nothing exists to check yet),
**proposed**, **open**.

Sources: FX008's design (docs/plans/2026-10-10-abort-tracking-design.md
§1, §3.3-3.5, §5) and plan ("as built" notes for Tasks 7-9); the code
it built (Frames.purs, Defer.purs, Clauses.purs, Install.purs,
Lend.purs, ResultClauses.purs, MarkUse.purs, UnifyMark.purs,
Consume.purs, TailPass.purs, Handle.purs, Settle.purs, SyncCycle.purs,
Mark.purs); the unifier (Unify.purs, UnifyParts.purs, UnifyRow.purs,
Domain/Row.purs, Walked.purs); generation (Generate/Translate.purs,
Generate/Effect.purs, Generate/Node.purs, Generate/Callee.purs,
Domain/Recorded/Internal.purs); FX001's consumption;
r0-erased-rows.md §2, §7.1; r0-certify-argument.md; findings.md
"Effect and coverage audit". Code facts are from base 0c2ad60.

## 0. What changed from revision 3

1. **Complete edge collection** (T2-a, S1): `defer` consumes its row
   into the enclosing row directionally (Defer.purs `consumeLabels`,
   `ignoreMarks: false`), so E2's sites include `defer` and every
   settling consumption (§4). §7a traces FX008's original failing
   cleanup to the refusal of the forged package.
2. **One home for each fact** (T3-b, T2-c): every FX008 position has
   exactly one authoritative place (§2's ownership table); other uses
   refer to it; I3 refuses any second copy.
3. **Concrete obligations** (T3-a, T2-b, T2-e): E1 compares full marked
   types recorded with both sides; consumption, clause tails and
   installation are conditions on final rows, not inference steps.
4. **As-built handler rules** (T2-d, T2-e; corrected in 3.2, N2): a
   handler literal, a top-level result handler type at a use
   (ResultClauses `ownClauses`) and an outermost handler type in a local
   annotation (MarkUse `handlerRows`) own a C; every other C is R's bare
   alias; C rows are bare and installation pairs by key and position.
   (Corrected in 3.3, F6: in a local annotation every handler type not
   inside another handler type's rows owns a C, not only the outermost;
   §2.)
5. **Least terms over equality classes** (T1-a), U1's premises stated
   (T1-b), and U1's bounded oracle run (§5).
6. **Routing pinned to the code** (T5-a): an unsupported obligation
   kind blocks at rule 1 (`Unsupported EffectsUnchecked`), as
   Decide.purs's header and r0-erased-rows §7.1 place it; a failed
   candidate is a `CheckFailed` attempt and later strategies run.
7. **U6 written** (§13): every source rule that can refuse an effect
   or a mark, mapped to its obligation or to an exclusion with its
   reason.

## 0a. What changed in revision 3.2 (§18.80)

1. **Every owned C has one home with stated obligations** (N1, N2,
   N6): a literal's C is an effect-row binding; a ResultC's and an
   annotation C's labels and fixed marks are **derived by trusted code
   from the recorded problem** (R's labels, bare), so a package cannot
   supply or forge them; only their flexible marks and tail come from
   the package (§2, E4, E5). Label added in 3.3: **design** (the
   package has no slot for these facts and I3's exact domain refuses
   one; nothing is built). In 3.3 generation records the C itself
   (§0b item 3).
2. **Copies through equations** (N5): a handler literal's recorded type
   names its site positions, generation records an E1 at the literal's
   node, and every image copy of a site position arises from a recorded
   unification, so a position and its copies form one class; P2 is
   per class; mark assignments are checked per class (§2, §5). Label
   added in 3.3: **open** pending the entry-point audit (§13a, F5).
3. **Inclusion, not equality** (N4): R is consumed into ρ ignoring marks
   (E2 with marks ignored), so ρ may hold more effects (§4 E5, §12).
4. **Routing described as built** (N3): a rule-1 block still runs every
   strategy and refuter; Solved is suppressed afterwards (§7).
5. **Reproducible evidence**: the forgery cases (cleanup, owned C
   forged empty, let-bound handler, inclusion), each beside an honest
   control and judged under the earlier obligation set too, and three
   injected mutants, run from the repository (§5, §12).
6. Smaller corrections N7-N12 (§R4a).

## 0b. What changed in revision 3.3 (§18.82)

1. **One definition of handler-type equality** (F1, condition 1):
   Definition 4.1 (§4), read from Unify.purs and UnifyParts.purs.
   Revision 3.2's E1 ignored R's marks on every handler type and had no
   C ≡ C; E1, §12, §13 and §14 now refer to Definition 4.1. Its
   justification is FX008 §5 point 1 (class S); today's behaviour is
   supporting evidence. Attempt A is its separating example (reasoned,
   not run).
2. **No package-side ResultC** (F2, condition 2): `ResultC { c ∷ MRow
   }` is removed from §10's `SiteFact`. Generation records the derived
   C in the use's recorded instance type (`Fields.instances`; §2, §10).
3. **Recorded inputs for derivation** (F3, F6, condition 3): §2 states
   what generation records at each use with a top-level handler result
   and at each local annotation, with no checker state outside the
   recorded problem; E4′ reads those records. In an annotation every
   handler type not inside another handler type's rows owns a C, with
   its own `Annotation` positions and an always-fresh tail (F6).
4. **F5** (condition 4): §13a maps every unifier entry point; two
   paths have no recorded equation (O1, O2), so §2's copies claim is
   false as written until they are recorded; O3-O7 follow.
5. **S3 items**: E2's remainder states the closed-source case (F7);
   §2 names the readers of R's extension marks; §12 separates the rows
   reproduced in cases.mjs from unrun predictions; §0a's and §2's
   claims carry labels.
6. **Semantics folded in** (§18.81): §14 holds the classes, arguments,
   obligation table (with rows for Definition 4.1 and C ≡ C),
   compatibility-only list and open decisions;
   r0-amin-obligation-semantics.md is now a pointer to it.
7. **Not in this revision**: condition 5's oracle work (derivation
   cases from recorded inputs, attempts A and B with passing controls, a
   C-equality mutant, a replacement for the inclusion case) is being
   done in research/amin-mark-oracle/ in parallel. No result of it is
   reported here.

## 1. Goal, threat model, scope (unchanged from revision 3)

Every effect, mark and clause fact that reaches compilation is judged
by trusted code over the one package `build` reads; the fidelity target
is the post-Strip program, rows included (decided, Q1). Soundness holds
for any candidate from any strategy, forged ones included (decided,
§18.76). Lowering and today's checker are unchanged; effect soundness
stays Pending.

## 2. The package and who owns each fact

**Marked types** `MTy = Ty Var` with a `MarkTerm` on every label
occurrence and `{ inference: R, clauses }` on every handler type.
**Mark terms** `N | M | J S` (S a non-empty set of the declaration's
rigid mark variables), `norm (J ∅) = N`, every comparison on normal
forms. `Fail` labels carry the term N as a placeholder: E2's
matched-pair edges include `Fail` pairs, where N ⊑ N always holds; I3
refuses another term on a `Fail` label, and `strip` erases it (T3-d,
N9). Console labels are N
(FX008 §3.3); I3 refuses another term on a Console label, and the
generator records a written `nofail(k) Console` as N (T3-e). Image
variables: declared rigids at their sort (the implicit ambient row
variable included), holes, no flexible problem variable; declared data
row counts (decided, §18.76).

**Ownership.** Each FX008 position has one home; every other mention
is a reference by key.

| Fact | Home | Referred to by |
|---|---|---|
| a flexible type, record-row or effect-row variable's value | `bindings` (`Inline`, `InlineRow`, `Free`) | images, rows, obligations |
| a clause's own row c (a tail meta in FX008) | `bindings`, at the clause's `⟨p, clauses k⟩` effect-row variable | `HandlerLit` by variable |
| a deferred row d | `bindings`, at the `defer`'s `⟨p, effect⟩` variable | `Deferred` by variable |
| a stage tail's binding, copies of ρ's prefix included | `bindings`, at the stage tail variable (the copies are its labels) | E2 by variable |
| a handler literal's own-abort mark m | `sites` `HandlerLit { m }` | E4, E5 |
| a handler literal's C (its clause row aggregate) | `bindings`, at the literal's `⟨p, handler clauses⟩` effect-row variable (a bare row) | `HandlerLit` by variable; E4, E5 |
| a ResultC (top-level result handler type at a use, ResultClauses `ownClauses`) | **the recorded problem**: generation records it in the use's instance type (`instances`, §10), labels, marks and tail as "What generation records" below states; the package holds only the binding of `⟨p, result clauses⟩` when that variable is the tail | Definition 4.1, E4′, E5 |
| an annotation C (each handler type in a local annotation not inside another handler type's rows, MarkUse `freshType`, `handlerRows`; F6) | **the recorded problem**: generation records the annotation's MTy with this C (`annotations`, §10): labels R's, bare; written `nofail`, `nofail(k)` kept; every other mark a position of its own in `sites` `Annotation { marks }`, distinct from R's position for the same label; tail always `⟨p, annotation clauses i⟩`, an effect-row variable bound in `bindings` | Definition 4.1, E4′, E5 |
| an installation's frame mark f | `sites` `Installation { frame }` | E5 |
| a callee's `nofail(k)` at a use (one meta per k, shared across its signature) | `sites` `Instantiated { marks ∷ Map MarkName MarkTerm }` | the instance's written labels, by name |
| an opened handler mark at a use | `sites` `Opened { mark }` | E1, E3 |
| an unmarked label in a local annotation | that annotation's recorded type in the problem names a position; its term lives in `sites` `Annotation { marks }` | E1 |
| marks that consuming R into ρ adds to R by extension | none of their own: fresh terms inside R's tail binding, erased by `strip` | Lend `assume`'s edge when C is R's alias (upper side only), and Definition 4.1(d) through the alias if the value later meets a type owning a C (F7; both only add constraints, reasoned) |

Every site fact holds marks or variable names, never rows (rows are
bindings or recorded in the problem); I3 refuses a site fact that
carries a row (T3-b, N6). The package's domain equals the recorded
positions exactly (N10); R's extension marks are terms inside bindings,
read only as the last table row says (F7: §R5 judged the `assume`
reading harmless; a reading through Definition 4.1 equates them with
another type's C marks, which can only refuse more).

**What generation records for handler types (F3, condition 3;
proposed, unbuilt).** Today generation records no handler row or mark.
Translating a handler type emits an `Outside HandlerType` marker
(Generate/Translate.purs `handlerOf` adds `HandlerMark`, which
Generate/Node.purs `markersAt` emits as `EmitOutside HandlerType`); a
handler literal and a `with` emit the same marker (Generate/Effect.purs
`handler`, rule E20, and `with`, rule E21); recorded atoms erase a
handler type to `App (HandlerHead e) args` (Generate/Elab/Recorded.purs);
and `Fields` (Domain/Recorded/Internal.purs) holds a use's callee only
as a `FunctionId` with its slots (`adm`), no signature. Generation does
read the callee's signature to translate it under θ
(Generate/Callee.purs). So generation records:
- **At each use whose instantiated result is a top-level handler
  type** (Use.purs `openedUse` runs `ownClauses` after `openHandlers`):
  the use's instance MTy in `instances`, its handler result carrying
  `clauses: Just C`, C as ResultClauses `ownClauses` builds it.
  Labels: R's at the use, in order and count, bare (Walked.purs
  `bareLabel`: no arguments; a `Fail` label keeps its payload's head,
  or the payload as it stands when the head is not known, e.g. an
  instantiated variable). Marks: R's at the use, each N, M or a
  reference to the use's `Instantiated` k (callee marks are
  instantiated before `ownClauses` runs, DeclarationUse.purs
  `instantiateMarks`; `openHandlers` opens only the handled label).
  Tail (`copied`, `kept`): R's tail variable (the instance slot of the
  callee's effect-row variable that R ends in) when it occurs in a
  parameter or in the callee's own row (`occurs` folds over `TFun
  TUnit row TUnit` and the parameters); otherwise the use's own
  effect-row variable `⟨p, result clauses⟩` (`kept`: `Hole meta | not
  (occurs meta) → Just (Hole next)`); closed when R is closed (`kept
  =<< tail` with no tail); any other tail as it stands (`other → Just
  other`).
- **At each local annotation** (Lambda.purs `parameterType` calls
  `localMarks` on the annotation after the rigid substitution): the
  annotation's MTy in `annotations`. Each handler type in it not inside
  another handler type's rows carries its own C: MarkUse `freshType`
  passes `outside` unchanged through arrows, data arguments, records and
  labels, and only `handlerRows` turns it false for R's labels. C's
  labels are R's, bare (`clausesOf` with `bareLabel empty`). Marks:
  `handlerRows` runs the `inference` supply twice (`withClauses <$>
  inference <*> inference <*> (Hole <$> next)`), and each run draws new
  metas, so each unwritten mark of C is a position distinct from R's
  for the same label; written `nofail` and `nofail(k)` stay
  (`freshMark`). Tail: always fresh (`Hole <$> next`; `clausesOf`
  ignores R's tail), even when R is closed or ends in a rigid; recorded
  as `⟨p, annotation clauses i⟩`, i the handler type's index in the
  annotation. A handler type inside another's rows keeps C = R.
- **No unrecorded checker state** (design): every input of E4′ is in
  these records. R's labels and marks are in the recorded MTy; the
  occurs choice is made by generation from the callee's signature, as
  `ownClauses` makes it from the instantiated signature, and recorded
  as the chosen tail; nothing is read from the checker's substitution.
  Whether generation records them correctly is generation's obligation
  (U6, §13; its fixtures in §12.2), not `validateEffects`'s.

**Copies through equations (N5; open pending §13a, F5).** A handler
literal's recorded type is
`THandler (Label e args (HandlerLit.m)) { inference: ⟨p, handler
inference⟩, clauses: Just ⟨p, handler clauses⟩ }`, and generation
records `Equal (TVar node) (that type)` at the literal's node. An image
can hold a copy of a site position only where today's checker unifies
two types, and each such unification is recorded as an E1 (§13, first
row), so a site position and every image copy of it are joined by
recorded equations into one class. P2 holds per class (§5), and
`validateEffects` checks mark assignments per class (`norm` equality on
every E1 mark pair). Standing: the recorded type and the E1 at the
literal's node are **design**; "an image can hold a copy only where
today's checker unifies two types, each such unification recorded" is
**open** until every unifier entry point is mapped to an E1, an E2 or
an open obligation (§13a, F5): refuted as written by O1 and O2.

**Stripped projection.** `strip` maps marks to `Unmarked`, clauses to
`Nothing`, drops `sites` and keeps bindings' shapes (Check/Strip.purs's
rule); `build` reads `strip P` only.

## 3. Rigid and fixed marks

Rigid: the declaration's own `nofail(k)` variables (recorded in the
problem as `rigidMarks`). Fixed: written `nofail` (N), written plain
labels in signatures (M), Console (N). Everything in §2's `sites` and
every mark on a label inside `bindings` is a flexible position.
"Fresh" in FX008 always means a new flexible position, never a
distinct value; no obligation forces two positions to differ (review
3 task 4, clean).

## 4. Obligations as conditions on final rows (recorded in the problem)

The recorded problem gains `obligations` (Domain.Recorded.Internal,
covered by `elaborate`'s whole-`Fields` identity). Each obligation is a
**condition on the completed package**, read after settling holes to
their defaults (§6); none is an instruction to extend, bind or merge.
Rows are compared up to scoped-label order (Leijen 2005's row
equivalence, FX001's representation).

**E1, equations.** `Equal lhs rhs` with both sides recorded as marked
types over the problem's variables (`lhs, rhs ∷ MTy`, the written side
keeping its fixed and rigid marks, annotation marks naming their
`Annotation` positions). Holds when the two sides, under the package,
are equal types: same structure; rows equal up to scoped order; labels'
arguments equal, nested marks included; marks equal on normal forms;
two handler types, at any depth, equal by Definition 4.1 and by nothing
else. (R ≡ ρ at installation is not an E1: it is E5's consumption.)
Refusals: TypeMismatch, InfiniteType, LabelMismatch (RowPayload), the
mark E_TYPE clashes (UnifyMark `equateMarks`). Recorded atoms (RTExpr)
stay row-free for G0; E1 is a separate record. An E1 side that is a
use's instance type or a local annotation refers to its `instances` or
`annotations` entry by site rather than repeating it (single home).

**Definition 4.1 (handler-type equality; F1, condition 1).** Two marked
handler types `THandler (Label e as m) { inference: R, clauses: C? }`
and `THandler (Label e′ as′ m′) { inference: R′, clauses: C′? }`, C?
present exactly when the type owns a C (§2), are equal under a package
when all of the following hold:
- (a) e = e′, the argument lists have one length, and the arguments are
  pairwise equal by E1 (Unify.purs `unifyHeads`, the `THandler` case:
  `one == other && sameLength lefts rights`, then `unifyPair` over the
  arguments);
- (b) the handled marks are equal on normal forms, m ≡ m′
  (UnifyParts.purs `handledMarks`, through UnifyMark `equateMarks`; a
  clash is a type mismatch, `mismatch subst left right`);
- (c) if neither side owns a C: R ≡ R′ as rows with marks, that is,
  E1's row equality with label arguments equal and marks equal on
  normal forms (Unify.purs `unifyInference`, first branch, `unifyRowAt`
  to UnifyRow `unifyRows`, mode `EqualMarks`). R stands in as C
  (Domain/Row.purs `clauseRow rows = fromMaybe rows.inference
  rows.clauses`), so this comparison is also C ≡ C, and (d) does not
  apply (UnifyParts `unifyClauses` returns at once when both `clauses`
  are `Nothing`);
- (d) if either side owns a C: R ≡ R′ with label arguments equal and
  marks ignored (`unifyInference`, second branch: `unifyRowsIgnoring
  (unifyAt (level + 1))`), and clauseRow ≡ clauseRow′ with marks
  (`unifyClauses`: `unifyRows ignoringArguments` on `clauseRow left`
  and `clauseRow right`, mode `EqualMarks`): labels paired by key and
  per-key position (a `Fail` label's key is its payload's head,
  Domain/Row.purs `labelKey`), marks equal on normal forms (a `Fail`
  label holds the placeholder N, §2, as today's `normalMark` leaves it
  unmarked, so it never clashes), tails equal, no label argument
  compared beyond the `Fail` head (UnifyRow `ignoringArguments`: "C's
  arguments are never unified; R carries and checks them"). A side
  without its own C contributes R as its bare alias: R's labels read
  bare, with R's mark positions and R's tail.

Conditions are on completed rows (after settling, §6), where E9 makes
every `Fail` head concrete; today's postponement of a pair whose `Fail`
head is unknown (UnifyRow `unifyRows`, retried by Unify.purs
`settleRows`) is an inference step, not a condition. Justification:
FX008 §5 point 1, "Handler values reach installations only by type
equality (C ≡ C, marks included) [...] So m and C are honest wherever
the handler is installed. R adds only equalities, and its marks are
dead", and §3.4, "Two handler types unify C with C, marks included".
Class S (§14); today's code is supporting evidence, not the argument.
Reasoned: FX008's design gives a written signature type its own C, "a
structural copy of R with the same written marks and the same closed or
rigid tail" (§3.4); as built (Task 9) such a type has no C and (c)
compares R with marks instead. Comparing R with marks and arguments in
one pass asks what (d) asks of two structural copies plus R ≡ R′
ignoring marks, so the alias implements the design's C ≡ C for those
types (U7, §11; unchecked). Separating examples: attempt A for (c) and
attempt B for (d)'s tails (§12.2; reasoned, not run).

**E2, consumption of a row s into a target ρ.** Sites: call, perform,
apply, pipe, over- and partial-application stages, callback, **`defer`
(d into the enclosing row)**, and settling's consumptions: **clause rows
into C, installed C into ρ, deferred rows into their row** (FX008 §3.5
step (d)); the installed-C site contributes only E2's per-key count and
Lend `assume`'s edge `mark(ρ partner) ⊑ mark(C label)` (no remainder;
N8). With s and ρ completed, the condition is: for each key κ, the r-th
occurrence of κ in s is matched with the r-th occurrence of κ in ρ, and
ρ has at least as many occurrences of κ as s (the side-condition, per
key); matched labels' arguments are equal (nested marks included),
except that C rows are bare and compare keys only (T2-e); the remainder:
if s is closed, or ends in a hole (which settles to the closed row, §6),
there is no remainder condition: ρ's further labels and its tail are
unconstrained, and no copy is made or copy edge recorded (F7;
Consume.purs `consume` gives a closed stage a throwaway tail, "the one
nobody reads", and UnifyMark `stageLabel` adds no copy edge on the
throwaway); if s ends in a rigid ϱ, ρ ends in ϱ (the tail pass, T2-b);
otherwise s's tail variable's binding is ρ's labels after the matched
ones followed by ρ's tail, labels equal up to marks (the copies). Mark
edges, unless the site ignores marks (consumption into R): each matched
pair `mark(ρ occurrence) ⊑ mark(s occurrence)`; each copy `mark(ρ label)
⊑ mark(copy)`; each label s adds to a target's tail `mark(added) ⊑
mark(s label)`. Refusals: EffectNotAllowed, MustBePure,
CallbackRowLacks, RowEquality (shared tail, `both end in`),
LabelMismatch, InfiniteType (RowOccurs).

**E3, opening at use** (handler types only; MarkUse `openHandlers`):
the opened handled label's mark is the `Opened` position; no
condition beyond E1's use of it.

**E4, handler literal** with clause rows c_k (bindings) and own-abort
mark m: each c_k is consumed into R ignoring marks and into C with
marks (E2's conditions; C bare); for each c_k holding a `Fail` label or
ending in a rigid ϱ, `M ⊑ m` (Frames `aborting`); a c_k ending in rigid
ϱ needs R and C to end in ϱ (the tail pass, TailPass.purs).

**E4′, an owned C not from a literal** (N1; F3, F6 in 3.3). The
validator reads the C generation recorded (§2, "What generation
records") and derives nothing from checker state; I3 refuses a
package-supplied C, label or fixed mark at that site (design).
- A ResultC: labels exactly R's at the use, bare (`Fail` heads kept),
  in order and count; marks N, M or the use's `Instantiated` k; tail as
  recorded: R's tail variable (occurring in a parameter or the callee's
  own row), the use's own `⟨p, result clauses⟩`, or closed when R is
  closed.
- An annotation C: labels exactly R's, bare; marks written or its own
  `Annotation` positions, distinct from R's; tail always its own
  `⟨p, annotation clauses i⟩`, whatever R's tail is (F6).

An owned C's own tail variable is constrained by Definition 4.1(d)
wherever its type meets another; a `Free` binding defaults to the
closed row (§6, the tail pass's closing). Reasoned: a larger C or a
rigid tail only adds E5's pairing, frame and per-key count constraints
and Definition 4.1's equalities, so no binding of such a tail is weaker
than the closed row. The ResultC tail rule's soundness rests on the
parametricity claim in ResultClauses.purs's comment ("by parametricity
its clauses reach nothing else through R's tail"): open decision 3
(§14). The annotation tail follows FX008 §3.4 (a local annotation's C
"has a fresh tail meta", review M5).

**E5, installation `with h { body }`.** m and C are read from h's marked
type, wherever it comes from (an image, an instance, a literal; T3-c); C
is the owned C if h's type owns one, else R's bare alias (Install
`clausesOf`; T2-d; owned per E4′ or E4). Conditions: R is consumed into
ρ ignoring marks (Consume `consumeIgnoring`: E2 with marks ignored, so
inclusion, and ρ may hold more effects; N4); C is paired with ρ by key
and position (Lend `partners`), recording only mark edges (no
consumption, no arguments; T2-e); unless the frame is N (Console,
unreachable today, FX011): `m ⊑ f`, each paired ρ label's mark `⊑ f`,
and a rigid C tail gives `M ⊑ f` and ρ ending in ϱ (Frames `framed`);
the body's ambient row is `f L + ρ`. Refusals: HandlerMayFail,
ExpectedHandler (h's head not a handler); the rigid-tail mismatch is
unreachable today (`Internal BodyState`, TailPass `installed`).

**E6, `defer e`** with row d (binding): no `Fail` label and no rigid
tail in d (DeferMayFail, DeferMayPerform); each non-`Fail` label's
mark `⊑ N` (Frames `demanded`; DeferHandlerMayFail,
DeferHandlerVariable); and d consumed into the enclosing row (E2).

**E7, a call's `nofail` assumption**: an instance of E2's matched-pair
edge (ExpectedNofail).

**E8, entry**: `main`'s completed row within `Console`
(UnhandledEffect).

**E9, Fail payloads**: each payload's head concrete after settling
(FailNeedsConcrete, Failure.purs:102).

**E10, the body's row within the declared row** (E2 with the declared
row as target; EffectNotAllowed, MustBePure).

**E11, ambient rows.** Generation records each body's ambient row: the
declared row; a lambda's `⟨p, effect⟩`; `f L + ρ` in a `with` body;
`Fail(E…) + ρ` in a `handle` body (Handle `withFailures`, T2-f); the
clause row in a clause; d in a deferred expression.

**E12, marks**: every edge E2-E6 generate, collected exhaustively from
those rows, holds by `holds` on normal forms (§5); every mark equality
of E1 holds by `norm` equality.

## 5. Mark correspondence (U1; universal argument plus bounded oracle)

**The check** (universal). `holds x y` on normal forms: `x = N`, or
`y = M`, or `x = J S`, `y = J T` with `S ⊆ T`. For two-point values
N ⊑ M and a valuation v of the rigid marks (`J S` read as the join of
v(S)), `holds x y` is true exactly when x ⊑ y for every v: N on the
left always holds; M on the left holds only against M (the all-N
valuation makes any `J T` N); `J S ⊑ N` with S non-empty fails (set
some k in S to M); `J S ⊑ J T` fails exactly when some k ∈ S \ T (set
that k to M, the rest to N). The author checked all 36 term pairs over
two rigid marks against all four valuations (bounded, run by the
author, 2026-10-24; reported in §18.78, not in the repository), which
found the un-normalized `J ∅ ⊑ N` gap that `norm` closes.

**Premises of the correspondence (T1-b; P2 restated in 3.2, N5).** P1:
the package's obligation graph is exactly FX008's edge set and mark
equalities for the same program (U6, §13). P2: every FX008 mark meta
corresponds to exactly one equality class of package positions (a meta
shared between a site and an image is two positions joined by a
recorded E1). P3: written constants are only N, M or a single rigid
`J {k}` (Domain/Row.purs `Mark`).

**Claim (universal, given P1-P3).** Let classes be the equivalence
classes of positions and constants under E1's mark equalities and the
callee-k sharing (union-find). A package passing `holds` on every edge
and `norm` equality on every equation exists exactly when FX008's
step-5 path criterion accepts (no path from atom a to atom b with
a ≠ b, a not N, b not M, after equalities, a class holding two
different constants a clash, as UnifyMark `equateMarks` refuses).
- Package ⇒ FX008: each edge holds for every valuation, so for each
  valuation the classes have a two-point solution; FX008's criterion
  is satisfiability for every valuation (per-valuation satisfiability
  of atomic two-point constraints is exactly the absence of a path from
  a constant valued M to one valued N; over all valuations those are
  the forbidden pairs).
- FX008 ⇒ package: give each class its **least term**: a class holding
  a constant takes it (two different constants were refused); any other
  class takes M if M reaches it, otherwise the join of the rigid
  constants that reach it, N if none. Equalities hold by construction
  (one term per class). A class-to-class edge holds since reachability
  is transitive and a constant class's term is reached by what reaches
  it. An edge into a constant class N, M or `J {k}` holds because the
  corresponding forbidden paths (M→N, k→N, M→k, k′→k) are absent.

Mark.purs `violation` checks the same criterion without passing
through atoms; a path through an intermediate atom contains a
forbidden sub-path exactly when the whole is forbidden (review 3,
universal, confirmed by reading).

**Bounded oracle** (research/amin-mark-oracle/, `node run.mjs`,
2026-10-24): three verdicts (path criterion, brute-force semantics over
every valuation, least terms over classes) agree on every graph with
one flexible position (5,242,880 graphs, atom-to-atom edges included),
every graph with two flexible positions over the edges touching them
with none, one or two of the nine single equalities (12,058,624), and
200,000 seeded random graphs with three or four positions and up to
four equalities. `holds` against the meaning on all 36 term pairs over
two rigid marks (the author's check, now `pairs36`). Soundness of
`holds`, exhaustively on the two-position family with at most one
equality: on the 2,562,208 graphs whose meaning fails, 17,776,800 term
assignments tried and **none** passing; on the 59,232 whose meaning
holds, 573,280 tried and 93,696 passing. Two rigid marks, at most four
positions. `node mutants.mjs` detects three injected wrong
implementations (one ground valuation; no normalization; least terms
per position). Bounded evidence; P1 is not tested by it.

**Two solutions, kept apart.** The least terms are an honest
read-back's evidence and the argument's witness. FX008's step 6,
closing remaining metas to M, is display and erasure only and is never
evidence.

## 6. Holes (unchanged from revision 3)

One sort per hole number across the package; defaults are lowering's
(type Int, record tail none, effect tail the closed empty row);
settling replaces holes by defaults before G0 and before every
obligation; holes in label arguments and nested tails are judged at
their defaults (extends certify-argument C1-C2; U4).

## 7. Pipeline and routing

1. Source rule; 2. generation records atoms (row-free), obligations
E1-E12 with full marked sides and site keys, `rigidMarks`, arities,
effect rigids, ambient rows (E11), and `instances` and `annotations`
with their owned Cs (§2, 3.3); a construct whose obligation kind
the validator does not support (FX032's operation `with` rows) records
an `Unsupported` obligation; 3. the search proposes one package (the
online read-back: unstripped images, least mark terms, clause and
deferred row bindings, sites); 4. `certify`: (a) I3 (variable
restrictions, arities, one sort per hole, binding constructor matching
sort, Console N, the ownership table's single homes, domain exact),
(b) settle, G0 on `erase`, (c) `validateEffects` E1-E12; 5. routing;
6. `elaborate` (problem identity, seal, Cov), `build (strip P)`.

**Routing, pinned to the code (T5-a).**
- An `Unsupported` obligation is known from the problem before any
  search, so `decide`'s rule 1 blocks the declaration with
  `Unsupported (EffectsUnchecked kinds)`: a new `Unsupport`
  constructor, joining rule 1 as Decide.purs's header and
  r0-erased-rows §7.1 item 2 place it. As built (Decide.purs
  `untilVerdict = not blocked && (solved || refuted)`), a blocked
  declaration still runs every strategy and refuter; an acceptance is
  then suppressed by `solvedUnlessBlocked`, so the verdict is Unresolved
  (§7.1 item 3), never Solved (N3; documentation only, behaviour
  unchanged).
- A candidate that fails (a)-(c) is a `CheckRefusal`; Strategy.purs
  `checked` makes it a `CheckFailed` attempt with no solution, and
  `decide`'s rule 2 (`untilVerdict`) continues to the next strategy
  and to the refuters (review 3, universal, confirmed against
  Strategy.purs and Decide.purs). With every strategy refused, today's
  reading applies (Decide.Reading: a `ClaimsComplete` refusal is a
  `CandidateRefused` search fault, the reason `Inference
  NoAcceptedCertificate`).
- If a read-back cannot build a package, it returns `NoCandidate`,
  never `Inconsistent` (which stops the run; T5-b).
- Acceptance mints `Certified Valid (Witnessed (strip P))`.

## 7a. Trace: FX008's failing cleanup

FX008 §1's program: `fn work(): Unit with Log = { defer log(1); () };`
with `main` installing `handler Log { log(n) => fail(E) }` around
`work()`. Today FX008 refuses `work` (the design's motivating case;
bounded: pinned by the probes test/fx008-probes/rev6/hole.wxw,
facts/cross.wxw and design-review/c1.wxw, spelled `Log.log(1)`; N12).
Its mark graph is reproduced, with a control, in
research/amin-mark-oracle/cases.mjs.

1. Source: `defer log(1)` in a body whose declared row is plain `Log`
   (fixed M).
2. Recorded: E6 for the `defer` at variable d = `⟨p, effect⟩`; E2
   consuming d into the ambient row (the declared row `Log`, mark M).
3. Honest package: d = `Log` with mark x = M (the least term: M
   reaches x through the consumption edge).
4. Check: E6's demand `x ⊑ N` is `M ⊑ N`: false; refused
   (DeferHandlerMayFail's obligation). The honest candidate fails, as
   today.
5. Forged package: x = N. E6's demand `N ⊑ N` holds, but E2's edge
   `mark(ρ's Log) ⊑ x` is `M ⊑ N`: false; refused. Under revision 3,
   which lacked E2 at `defer`, this forged package passed (T2-a).

So `work` is never certified, honest or forged; `main` then fails
elsewhere or not at all, but no compiled `work` exists. Bounded check
before implementation: this program and the FX008 probes as forged-
package fixtures (§12).

## 8. Obligations kept apart (as revision 3)

Soundness: S1 G0 on `erase` (P-G0); S2 settle, `erase`, `strip`
against lowering (certify argument C1-C2, extended); S3 the validator
accepts only packages satisfying their obligations for every rigid
valuation (§5, universal for `holds`); S4 coverage (U6, §13); S5
coupling (obligations in the problem, one package, single homes, the
checked stripped projection). Acceptance preservation: A1 the honest
read-back passes for every declaration today accepts and the online
search solves (least terms supplied); A2 the solved-form restriction
rejects none of them; A3 U1 (§5); A4 RT8 and window moves explained.

## 9. Exclusions and unsupported (see §13 for each reason)

FX032 operation `with` rows: unsupported, rule-1 `EffectsUnchecked` in
shadow for a declaration with any perform form of such an operation in
its body, nested lambdas and clauses included (a qualified call, a
pipe, a partial application, the operation as a value; N11), live
unchanged (§18.78; `OperationInfo` gains the field
generation reads). F1′, correction S and termination T: excluded as
inference only (§13). Resolve-time refusals: precede generation.
Constructs behind `Outside` markers: specified, still blocked by G0's
markers today (every handler type, literal and `with` emits `Outside
HandlerType`, §2).

## 10. Interfaces (revision 3's, amended)

`Fields += { obligations ∷ Array Obligation, instances ∷ Map Site
MTy, annotations ∷ Map Site MTy, rigidMarks, arities, effectRigids,
ambient rows }`: `instances` holds each use's instantiated marked
signature, naming its `Instantiated` k by name, a top-level handler
result carrying the derived C; `annotations` holds each local
annotation's MTy with its owned Cs (§2; proposed, 3.3). `Obligation =
Equal MTy MTy | Consume { site, source ∷ Var, target ∷ RowRef, marks ∷
Bool, bare ∷ Bool } | HandlerLit … | Install … | Defer … | Entry … |
FailConcrete … | Unsupported Kind`; `SiteFact += Instantiated { marks
} | Annotation { marks }` (R's and each owned C's unwritten marks;
there is no `ResultC` site fact: the derived C is in `instances`, F2),
and `HandlerLit` and `Deferred` hold variable names only; `Unsupport +=
EffectsUnchecked (Array Kind)`; `CheckRefusal += Malformed |
ObligationFailed Obligation`.
Change surface (N11), from revision 3: Strategy.purs `checked` (unchanged shape:
`Certified` still carries `Valid` and `Compilation`); Decide.Reason
(maps `EffectsUnchecked` to its Unresolved reason); Witness.purs
`bindingsOf`, `sameSort`, `bareHole`; HoleContract.purs `image`;
Candidate.purs `generic`; the read-back; Generate's context and every
row-writing site (§3, review 2's N6 list: `⟨p, apply⟩`, a lambda's inner
stage rows, partial-application stages, plus review 1's I6 list); the
certify argument and `certifySound`'s statement.
Added in revision 3.1: Decide's rule 1 (the new `Unsupport`) and
Resolve/Effect.purs (`OperationInfo`'s field). Added in revision 3.3:
Generate/Callee.purs and the use rules (record `instances`, with the
derived C), generation's lambda-parameter rule (records
`annotations`), and Domain/Recorded/Internal.purs (`Fields`).

## 11. Unresolved claims

- U1: delivered (§5): universal argument under P1-P2, bounded oracle
  run. Open within it: P1, which is U6.
- U2. A1, the read-back's honest package for every accepted
  declaration, including least mark terms from today's mark graph.
- U3. A2, sufficiency of the solved-form restriction on the corpus.
- U4. Extension of certify-argument C1-C2 to effect rows, marks and
  label-argument holes.
- U5. E10: checking containment of the final restricted rows equals
  FX008's settling loop's acceptance ("accepts exactly when the
  containments and equalities have a finite solution", FX008 §3.5
  property 4), taken from FX008's stated property, not re-argued.
- U6: delivered as an argument (§13); its fixtures and mutants (§12)
  are unrun. Open within it (3.3): the unifier entry points (§13a,
  pending, F5), on which P1 (§5) and §2's copies claim also rest.
- U7. Definition 4.1(c) as built (a written type's C is R, compared
  with marks) against FX008's design (a structural copy of R as C):
  reasoned equal (§4), unchecked.
- Novel, for approval (ADR 014): I3; the ∅ default for effect-row
  holes; consumption-based inclusion (FX001/FX008's design, no
  published source); the mark-term evidence and §5's correspondence.

## 12. Separating examples

Split in 3.3 (§R5 S3). §12.1's rows are reproduced as hand-translated
mark graphs in research/amin-mark-oracle/cases.mjs (bounded; `node
run.mjs`, output recorded in the oracle's README, 2026-10-24); they
judge a forged package's mark graph, not generation or derivation.
Every row of §12.2 is an unrun prediction. Any handler-type equality
an oracle case computes is meant to implement Definition 4.1 exactly;
attempts A and B, derivation cases from recorded inputs, a C-equality
mutant and a replacement for the inclusion case are being added to the
oracle in parallel (§18.82 condition 5), and no result of theirs is
claimed here.

### 12.1 Reproduced in cases.mjs (bounded)

| Claim | Fixture | Fails under |
|---|---|---|
| E2 at `defer` (T2-a; cases.mjs "cleanup (§7a)") | FX008 §1's `work`, its deferred mark forged to N: refused by `M ⊑ N`; control (declared row `nofail Log`) accepted; the forgery passed under revision 3's obligations | E2 without `defer`'s site |
| owned C forged empty (N1; "owned C forged empty") | `fn mk(): Handler(nofail Ask with Log)` installed under a plain `Log` row around `defer Ask.ask()`: honest refused (f = M), forged ResultC = ∅ with f = y = N refused because C's labels are derived ([Log]); control: the caller's row `nofail Log`, accepted; under revision 3.1's package-supplied C the forgery passed | C supplied by the package |
| let-bound handler (N5; "let-bound failing handler") | `let h = handler Log { log(n) => fail(E) }; … with h { defer Log.log(1) }`: honest refused; h's image mark forged to N refused by the E1 joining it to `HandlerLit.m`; control: a clause that does not fail, accepted; without the E1 the forgery passed | images unlinked to site positions |
| inclusion (N4; "inclusion with extra effects") | `fn st(h: Handler(State(Int))): Int with Log = with h { State.get() }`: R ⊆ ρ with ρ holding the extra `Log`: accepted; revision 3.1's equality refused it | R ≡ ρ |

Limits of these rows (§R5 S3): in the owned-C case the handled mark m
is an `Opened` meta at the use (MarkUse `openHandlers` opens an N
handled label in the result), not the constant N the case encodes;
§R5 found the verdict unchanged. The owned-C case hard-codes the
derived C, so it shows the forged package unsatisfiable, not that
derivation yields that C. The inclusion case is a set comparison that
does not exercise E2's rigid-tail rule.

### 12.2 Unrun predictions

Revision 3's rows, with two corrections (the E4/E5 row's rule, and
the hole-identity row's "pinned", which read as if a test existed),
followed by the rows revision 3.1 adds and then those 3.3 adds:

| Claim | Fixture | Fails under |
|---|---|---|
| R026 | forged `id2`, full images | erase-only check of separate images |
| E1 (K2) | `effect Log { fn log(n: Int): Unit; }; fn f(h: Unit -> Unit with Log): Unit with pure = { let k = h; k(()) }`, the Apply row forged to `pure` | judging erased atoms only |
| E1 marks | test/fixtures/r0/audit/expected-nofail.inferred.json with honest bindings and every flexible mark chosen freely: refused; control .selected.json accepted | marks only at named variables |
| E4, E5 | handler-may-fail.inferred.json refused by E5's frame edges; its clause row's binding forged to `pure` refused by E2 at the clause's sites | clause rows outside the package |
| routing | two strategies on `fn run(f: Unit -> Unit with pure): Unit = f(()); fn g(): Unit = { let k = fn(u: Unit) => (); run(k) }`, the first forging the lambda's row to `Console`, the second honest: the second is used | a standing inside an accepted `Certified` |
| E2 payloads | `effect State(s) { fn get(): s; fn put(value: s): Unit; }; fn g(h: Unit -> Unit with State(Int)): Unit with State(Bool) = h(());` refused (LabelMismatch) | inclusion by key only |
| E1 order | `fn f(h: Unit -> Unit with State(Int) + State(Bool)): Unit -> Unit with State(Bool) + State(Int) = h;` refused | multiset row equality |
| E2 Fail | `Fail(Error(Int))` against `Fail(Error(Bool))` refused | comparing keys only |
| holes in labels | `fn id(x: a): a = x; fn g(h: Unit -> Unit with State(Bool)): Unit with State(Bool) = { let k = id(h); k(()) }`, `id`'s instance forged to `State(_h)`: refused at the default | holes unjudged in label arguments |
| nested tail | the same with `h: … with Log` and the image `Unit -> Unit with ...h4`: refused (∅ ≠ Log) | effect tails nested in images unjudged |
| hole identity | `fn g(): Unit = { let k = fn(u: Unit) => (); k(()) }`, the lambda row `Free 3`, the Apply row `Free 4`: both default to ∅, so predicted accepted | comparing holes syntactically |
| no Cov for marks | `let k = fn(h: Unit -> Unit with Log) => h(())` (a local-annotation mark): not `Uncovered` | marks as problem variables |
| domain exact | an extra mark for a nonexistent site; a missing frame mark: both `Malformed` | an open evidence domain |
| sites | an inner stage row of a two-parameter lambda; an Apply and a Pipe arrow; a partial call: one fixture each | review 1's site list alone |
| rigid marks (§5) | `fn h(g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log = { let r = fn(u: Unit) => g(u); r(()) }` with the lambda's flexible label mark forged to N: refused, since the edge `J {k} ⊑ N` is `{k} ⊆ ∅`, false, though it holds at k = N | checking one ground valuation |
| rigid marks, stronger | the same program with the lambda's mark `J {k}` (the least term): accepted; and `fn h(g: Unit -> Unit with nofail Log): Unit with nofail(k) Log = g(())`, a written edge `J {k} ⊑ N`, refused as FX008 refuses it (path k → N) | refusing every rigid-dependent package; accepting a contract valid only at k = N |
| normalization | the same edge with the context's mark spelled `J ∅` and spelled N: identical verdicts, and `J ∅ ⊑ N` holds | comparing un-normalized terms |
| FX032 | `effect Op { fn op(): Int with Log; }; fn g(): Int with Op = Op.op(); fn main(): Int = 0;`: R0 shadow verdict `EffectsUnchecked`, today's live outcome unchanged | dropping the `with` row at resolution |
| R031 | both pins flip to today's form | — |
| single homes (T3-b) | a package whose `HandlerLit` carries its own clause row besides the binding: `Malformed` | two homes for one meta |
| E1 marked sides (T3-a) | a forged N nested in an image equated with a written plain `Log`: refused | row-free equations |
| tail pass (T2-b) | a clause calling an ambient-row callback, its R forged to a closed row: refused | containment without tails |
| owned C (T2-d) | a written handler parameter type (not a lambda's annotation) with a forged C dropping a label: `Malformed` (C is R's bare alias) | C owned everywhere |
| annotation C forged empty (N1, N2) | the same with `let k = fn(h: Handler(nofail Ask with Log)) => with h { defer Ask.ask() }`: forged annotation C = ∅ refused (labels derived from the annotation) | annotation C without a home |
| Console (T3-e, N10) | `fn g(h: Unit -> Unit with nofail(k) Console): Unit with Console = h(())`: Console recorded as N; a package giving it M is `Malformed` | Console marks as positions |
| bare C (T2-e) | famw: `Fail(Job)` in C against `Fail(Job(Int))` in ρ: accepted | comparing C's arguments |
| callee marks (T2-c) | two uses of one callee with different terms for its `k` across labels of one use: `Malformed` | marks only in images |
| `handle` ambient (T2-f) | a `fail(E)` in a `handle` body whose ambient row omits `Fail(E)`: refused | E11 without `handle` |
| routing | FX032's `Op.op()` call: rule-1 `Unsupported EffectsUnchecked`; strategies run, an acceptance is suppressed, never Solved | candidate-level `EffectsUnchecked` |
| routing | a failing first strategy and an honest second: Solved by the second | stopping at the first refusal |
| Definition 4.1(c), R with marks (F1; attempt A) | `fn f(h: Handler(nofail Ask with Log)): Unit with Log = with h { Ask.ask() }; fn g(h2: Handler(nofail Ask with nofail Log)): Unit with Log = f(h2);` with an honest package: refused (N against M on R, neither type owning a C); today's checker refuses it too (§R5's reading, not run); accepting it lets a caller of `g` install a handler whose clause defers `Log.log` under a failing `Log`. Reasoned, not run | E1 ignoring R's marks on every handler type (revision 3.2) |
| Definition 4.1(d), C ≡ C tails (F1; attempt B) | `let h = if b then mk() else g` with `mk(): Handler(nofail Ask with ...s)` and `g: Handler(nofail Ask with ...r)`, r rigid: the ResultC tail `⟨p, result clauses⟩` forged to ∅ is refused (∅ against g's alias tail r), so FrameRigid's `M ⊑ f` is kept. Reasoned, not run | no C ≡ C |
| recorded ResultC (F2, F3) | `mk()` as in the owned-C row, a package carrying a C for the use's site: `Malformed` (no package slot; the C is in `instances`) | a package-side ResultC |
| annotation C below the top (F6) | `let k = fn(f: Unit -> Handler(nofail Ask with Log)) => with f(()) { defer Ask.ask() }`: the handler type in the arrow's result owns a recorded C; a package dropping its `Log` label: `Malformed` | C only for the outermost handler type |
| closed source (F7) | `fn g(h: Unit -> Unit with Log): Unit with Log + Ask = h(())`: accepted; no remainder condition, no copy edge for `Ask` | a remainder rule applied to closed sources |
| recording, generation side (F3) | one generation fixture per `ownClauses` tail case (occurs in a parameter; occurs in the callee's row; occurs only in the result; R closed): the recorded tail is R's variable, R's variable, `⟨p, result clauses⟩`, closed | derivation reading checker state |

## 13. U6: coverage of generated obligations (argument)

For every rule of today's checker that can refuse a program for an
effect or a mark, after resolution, the obligation that records it, or
an exclusion with its reason. The rule list is the union of the audit
table's class-f effect refusals (findings.md), FX008 §3.4-3.5's
constraint generators, and the row-unification refusals reachable from
E1 and E2; review 3 checked it against the code (task 2). Rows that
compare two handler types refer to Definition 4.1 (§4) and to nothing
else. Which unifier entry points can reach these rules is §13a's
audit (pending, F5).

| Rule (code) | Obligation |
|---|---|
| type unification of marked types (UnifyMark `equateMarks`, EqualMarks) | E1 |
| R into ρ ignoring marks (Consume `consumeIgnoring`: inclusion; a closed R gets a throwaway tail) | E2 with marks ignored; E5 (N4) |
| two handler types: effect and arguments (Unify `unifyHeads`, `THandler` case, `unifyPair`) | E1, Definition 4.1(a) |
| handled marks by equality (UnifyParts `handledMarks`, UnifyMark `equateMarks`) | Definition 4.1(b) |
| R ≡ R: with marks when neither side owns a C, else ignoring marks (Unify `unifyInference`, UnifyRow `unifyRows`, `unifyRowsIgnoring`) | Definition 4.1(c), (d) |
| C ≡ C when either side owns a C, R standing in for a side without one: marks, tails, `Fail` heads, no other arguments (UnifyParts `unifyClauses`, Domain/Row `clauseRow`, UnifyRow `ignoringArguments`) | Definition 4.1(d) |
| installation's edge ρ partner ⊑ C label (Lend `assume`) | E2 (installed-C site; N8) |
| consumption: first occurrence, payloads, ρ ⊑ s, copies, extension t (UnifyMark `pairMarks`, `stageLabel`, `targetLabel`) | E2 |
| `defer` consumes d into the current row (Defer `checkDefer`, `ignoreMarks: false`) | E2 (site `defer`) |
| settling step (d): clause rows into C, installed C into ρ, deferred rows (Settle) | E2 (settling sites) |
| side-condition per-key cycle test (§3.5 (c), SyncCycle, F2) | E2's per-key count on final rows |
| opening at use (MarkUse `openHandlers`) | E3 |
| local-annotation fresh marks and C for every handler type not inside another's rows (MarkUse `freshType`, `handlerRows`) | E1 with `Annotation` positions; the annotation C recorded by generation (`annotations`), read by E4′ (N1, N2, F6) |
| a handler literal's type copied into images (unification) | E1 at the literal's node and at each unification (N5); open pending §13a |
| handler literal: c into R and C, C ⊑ c (Clauses `consumeBare`) | E4 |
| own abort (Frames `aborting`) | E4 |
| clause tail pass (TailPass) | E4 |
| owned C at a use (ResultClauses `ownClauses`); C = R's alias elsewhere (Install `clausesOf`) | §2 (recorded by generation in `instances`), E4′, E5, I3 |
| frame marks (Frames `framed`: FrameOwn, FrameOuter, FrameRigid) | E5 |
| installation pairing (Lend `partners`) | E5 |
| ExpectedHandler (Handler `withHandler`) | E5 |
| defer absence and demand (Defer `judge`, Frames `demanded`) | E6 |
| ExpectedNofail (MarkReport) | E7 |
| UnhandledEffect (Entry) | E8 |
| FailNeedsConcrete (Failure.purs:102) | E9 |
| EffectNotAllowed, MustBePure (Reject, Require) | E2, E10 |
| CallbackRowLacks (CallbackParts) | E2 |
| RowEquality (Argument, RowName) | E2 |
| LabelMismatch (Reject `RowPayload`), RowOccurs | E1, E2 |
| `handle` ambient (Handle `withFailures`) | E11 |
| step-5 mark check (Mark `violation`) | E12, §5 |

Exclusions, each with why it is safe or what it limits:
- **F1′ hook, correction S, termination T** (FX008 §3.4-3.5): they
  decide type solutions and acceptance order, not mark soundness (C,
  the frame edges and the tail pass carry soundness, FX008 §3.4). Safe
  for soundness, since a package is judged on its completed rows;
  limits correspondence: R0 may accept a program today rejects (FX008's
  gain1.wxw is such a case for revision 10 itself), which the shadow
  differential must report rather than count as agreement.
- **Step 6, closing metas to M**: display and erasure only (§5).
- **Resolve-time refusals** (FailNeedsConcrete at Resolve/Row.purs:82,
  NofailOnFail, MarkVariableOutsideSignature, HandlerMissing,
  HandlerDuplicate, HandlerOperation, RecordRowAsEffect,
  EffectRowAsRecord, RowSort): they precede generation, so no package
  exists for those programs.
- **InBothRows** (Lacked.purs): record disjointness, judged by G0's
  atoms, not an effect rule.
- **FX032** (operation `with` rows): unsupported, so it limits support
  (rule-1 `EffectsUnchecked`), never soundness.
- **Console frames** (Frames `framed`'s guard): no edges for a Console
  frame; unreachable while FX011 stands (no `Handler(Console …)` value
  can be built); D001 must revisit it, as the code says. A
  compatibility rule with a conflict candidate: §14 decision 1, open.

Tests of this mapping (unrun; listed in §12 and revision 3's I10): one
forged-package fixture per refusal kind; one mutation per row of this
table that drops its obligation and flips a fixture.

## 13a. Unifier entry points (F5)

Done for §18.82 condition 4: an independent read-only audit (Opus, at
0c2ad60; nothing run by it), whose three headline programs the
controller then ran through today's checker (`waxwing emit`, at
0c2ad60's build). Every substitution writer was traced (Binding.purs
`bindType`, `bindTail`, `extendRow`; RecordTail.purs; MarkStore
`bindMark` through `equateMarks`); each caller is mapped below.
Standing: **reasoned** by reading, except where a run is named. The
search covered src/Features/Check outside Refute/, Strategy/, Decide*
and Entailed* (the G0 path, which unifies unmarked atoms and writes no
handler rows); the patterns are in the audit's report, not repeated.

**Result: §2's copies claim is false as written.** Two checker paths
put handler types into images with no recorded equation (O1, O2), and
four points of wording or definition differ from the code (O3-O6).

| Entry point (code) | What it unifies or copies | Obligation |
|---|---|---|
| `unify` and every `require`/`expectType` caller (Apply `applyNext`, `applyValue`, `bindArrow`; Call `supplied`; Infer comparison, `if`, arithmetic; Arms; Match; RecordPattern; PatternRow; Handle; Function; Record; Extension; Defer; Failure `familyFixed`) | full types, Definition 4.1 for handler types | E1, at the rule where G0 records a `GenEqual` |
| ClauseBody.purs:52 (`require` of the clause body against the operation result instantiated by the handled label's arguments, rows closed) | e.g. a handler literal ≡ a written `Handler(Log with Console)` | **none: O1** |
| Install.purs:73 (the `with` node's type is the body's type, by reference) | the body's type term, handler types included | **none: O2** (G0 gives a fresh `⟨p, res⟩`, Generate/Effect.purs E21: "no equation through the handler") |
| `reexamine` = `improve unifyPlain`; RowMerge Cases `oriented`, `subtracted`, `moved` | records with several tails; field terms copied by reference | E1 only if E1 defines several-tailed record equality: **O6** |
| `unifyRecord`, RecordTail `bindTail`, `shareTails` | fields by label | E1 (records) |
| `settleRows` (Unify.purs:85-101, via Failure.purs `settleKeys`) | postponed row pairs, retried with full `unify` in their stored mode | by the pair's origin; a postponed C pair: **O5** |
| `consumeAt`, `consumeVia` (call, apply, pipe, perform, `fail`, `print`) | Directional; copies get a fresh top-level mark, arguments shared | E2 |
| `consumeLabels` (Defer; Settle deferred rows) | Directional, throwaway tail | E2 (`defer`, settling) |
| `consumeBare` (Clauses; Settle c into C) | Directional, `ignoringArguments` | E4; E2 settling; postponement **O5** |
| `consumeIgnoring` at `with` (Install.purs:60) | R into ρ, top-level marks ignored, arguments unified | E5 |
| `consumeIgnoring`, `consumeRelayed`, `closeTail` in the F1′ hook (Sync, Settle, Filing) | `labels(c) + φ` into R; closing φ closes R | excluded (§13); its effect on R is E4's c into R; stricter than a-min (correspondence only, O7) |
| TailPass `ensure`, `closeTail` | R or C tail to a rigid, or closed | E4 tail pass; E4′ closing |
| `Lend.assume`; Frames `markConstraints` | mark edges only | E2 installed-C site; E4-E6 |
| `handledMarks`, `unifyClauses` | Definition 4.1 (b), (d) | E1 via Definition 4.1; the alias: **O4** |
| `let`, locals, pattern binders, lambda and clause parameters (Block, Infer, Match, ClauseBody, Lambda) | the same type term, no unification | none needed: the image is the same variable (confirms §R5: `let h` shares the literal node's variable) |
| `handle`, `if`, `match` node types | the first part's term | E1 (G0 records the equations) |
| instantiation, `openHandlers`, `ownClauses`, `localMarks`, the literal, installation's `clausesOf` | construction of positions | §2 table, E3, E4′, `Equal` at the literal, E5 |
| diagnostic-only: Argument `sharedTail`; ArgumentRow `short`, `writes`; the Require hint; SettleChange `retry`; End `stillWaits`, EndReport; RowEntry (test entry only) | results discarded | none needed |
| `Lend.lend` | — | dead code: no caller in src |

**Open obligations.**
- **O1 (S1 for a-min, not for today's checker). Clause body against the
  operation result.** `effect Get(a) { fn get(): a; }` with a clause
  `get() => handler Log { log(n) => Fail.fail(E) }` under
  `Get(Handler(Log with Console))`, its result installed around
  `Log.log(1)`. Run (controller, `waxwing emit`): refused today, E_EFFECT
  "This function must be pure, but it performs Fail(E)" at the clause.
  Without an E1 here the literal's R, C and m are unconstrained against
  the written type that installation reads, so an honest package for
  the clause passes (reasoned). Same shape: test/fx008-probes/rev7/
  late1.wxw, rev8/one3.wxw. Proposed repair: generation records E1
  between the clause body's type and the instantiated operation result
  (with rows closed, as ClauseBody `instantiateType` does).
- **O2 (S1 for a-min). The `with` node's type.** `let h = with h0 {
  handler Log { log(n) => Fail.fail(E) } }; with h { Log.log(1) }`. Run:
  refused today, E_EFFECT "Unhandled Fail(E) in main". A forged image
  for the node's fresh variable (R closed, C ∅, m N) would be read by
  the enclosing installation, which E5 permits (reasoned). Proposed
  repair: E1 between the `with` node's variable and the body's type.
- **O3 (wording). "Up to marks" is top-level only.** A consumption copy
  keeps its arguments, so nested marks and nested handler types are
  shared with the source (UnifyMark `freshened`, Binding `extendRow`);
  Definition 4.1 (d)'s "marks ignored" on R likewise ignores only R's
  labels' own marks, arguments being unified with marks (Unify.purs
  `unifyInference`, `unifyAt (level + 1)`). E2's copy condition and
  Definition 4.1 (d) must say so.
- **O4 (decision). The alias is R itself, not a copy.** When one side
  owns a C and the other does not, `unifyClauses` unifies the owned C
  with the other side's R, so unmatched own-C labels extend R's tail as
  bare labels (`present` zips arguments without an arity check,
  UnifyRow.purs:159). Definition 4.1 (d)'s "R's bare alias with R's
  positions" leaves open whether such labels join R. The audit predicted
  an unsound acceptance today (a clause performing `Cell.put(n)` with
  `n: Int` under `Cell(Bool)`, through `run(h: Handler(Log with ...e))`);
  run (controller): **refused today**, E_TYPE "Expected Cell(Bool),
  found Cell(Int)". So no checker defect is shown by that program; the
  definition must still choose (labels join R, or the alias is a copy)
  and keep a separating example.
- **O5 (correspondence). A postponed C pair is retried with argument
  unification.** A stored pair keeps its mode but not its unifier
  (Subst.purs, `postponed`), and `settleRows` retries with `unify`, so a
  C ≡ C or `consumeBare` pair postponed on an unknown `Fail` head later
  unifies arguments. a-min compares C by keys only, so it may accept a
  program today refuses (not unsound; reported by the shadow
  differential). No example constructed.
- **O6 (definition). Records with several tails.** RowMerge copies field
  terms, handler types included, into result records by reference; E1
  covers them only once §4 defines equality for several-tailed records
  (disjoint union of images).
- **O7 (correspondence).** Today's c-into-R stage is `labels(c) + φ`
  and settling stages use throwaway tails; E4/E2 with s = c_k would ask
  c_k's tail to equal R's remainder, which the checker never imposes.
  Filing.purs closes φ, and so R, more strictly than a-min.

Consequences: §2's copies claim and P1 (§5) stand only once O1 and O2
are recorded and O6 is defined; O4 needs the author's choice; O3 is a
wording fix to E2 and Definition 4.1. These are additions of E1 sites
and definitions within the representation, not changes to it (the stop
rule does not apply), but they are proposed, not yet written into §4.

## 13b. Conflicts found while building 3.3's oracle cases

The oracle agent and the controller ran the §12 programs through
today's checker (`waxwing emit`, 0c2ad60's build; scratch files, not
fixtures). Under §18.81 each conflict keeps its example and goes to the
author; none is resolved here.

- **K1 (decision; soundness candidate). Inclusion with a rigid-tailed
  source.** §12.1's N4 row predicts `fn st(h: Handler(State(Int))): Int
  with Log = with h { State.get() }` accepted; today refuses it, E_EFFECT
  "st performs Log, which its signature does not allow" (run twice,
  2026-10-24). R ends in st's rigid ambient ϱ, and today a rigid-tailed
  source cannot absorb ρ's extra labels: the remainder must be empty.
  E2 as written ("if s ends in a rigid ϱ, ρ ends in ϱ") drops that, so
  a-min accepts more than today. Reasoned argument that today's rule is
  soundness, not compatibility: with s = `ϱ` and ρ = `Log + ϱ`, the
  stage may perform any operation in ϱ; if ϱ is instantiated with a row
  holding `Log`, scoped-label dispatch sends that operation to ρ's first
  `Log`, which is not the handler ϱ's own `Log` names (Leijen 2005's
  shadowing, [L17] adapted). Unchecked; the same shape for an ordinary
  call stage would make E2's inclusion unsound, not only imprecise.
  Proposed: E2's rigid case requires ρ's labels after the matched ones
  to be empty (ρ = matched labels + ϱ), with the N4 program as the
  separating example. The oracle's N4 case follows the statements and
  so still reports accepted.
- **K2 (example repair). The N1 program texts are refused today for a
  reason unrelated to C.** `fn mk(): Handler(nofail Ask with Log)` has
  R = `Log + ϱ_mk`, ϱ_mk occurring in mk's own row, so by `ownClauses`
  the ResultC's tail is R's variable and binds to the caller's rigid
  ambient (FrameRigid); the control with `nofail Log` is refused the
  same way (run). The owned-C cases hold as graphs only; §12.1's N1 row
  needs a program whose R is closed or `pure`-tailed.
- **K3 (wording). E2 at `defer`.** Defer.purs `checkDefer` consumes d's
  labels with a fresh throwaway tail never joined to the enclosing row
  (`consumeLabels`); E2's general remainder clause, read literally,
  would bind d's tail to the remainder. E2's `defer` site uses the
  labels-only form, as the settling sites do.
- **K4 (wording). E2's remainder on completed rows.** On a completed
  package s's tail is rigid, closed or a hole; "s's tail variable's
  binding is the remainder" must be restated as a condition on the
  package's binding of the variable s ends in before completion, or
  dropped where it is a throwaway (K3, settling sites, closed sources).

Agreements (run): attempt A refused today (E_TYPE "Expected
Handler(nofail Ask with Log), found Handler(nofail Ask with nofail
Log)"), its control accepted; attempt B refused today
(DeferHandlerMayFail), its control accepted; the rigid-tail lambda
program accepted. O1 and O2 (§13a) refused today; O4's program refused
today.

## 14. What each obligation means, and why (§18.81)

Folded in revision 3.3 from r0-amin-obligation-semantics.md (proposed
there for the author, 2026-10-24), with rows added for Definition 4.1
and C ≡ C and the E1 exception and E4′ rows updated; that file is now
a pointer here. No code.

The author's rule (§18.81; decided): **today's compiler is the
compatibility baseline, not the correctness specification.** Every
validator obligation names its intended semantic property and the
independent argument for it. A rule supported only by existing
behaviour is a **compatibility obligation**. Where compatibility and
soundness appear to conflict, the separating example is kept and the
conflict comes to the author; old behaviour is not reproduced
automatically.

**Classes.**
- **S, soundness**: needed for a stated guarantee about running
  programs; the argument is named with its standing.
- **P, precision**: accepts more programs that are safe; such a rule
  widens acceptance, so its own soundness needs an argument too.
- **I, implementation**: required by lowering or the runtime's
  representation, not by the language's meaning.
- **C, compatibility**: supported only by what today's compiler does;
  no independent argument is claimed.

The guarantees in play: **effect safety** (every operation a running
program performs is handled by an enclosing handler of its effect; no
operation escapes `main` except Console) and **abort safety** (FX008
§3.1: under a row whose k-th κ occurrence is marked N for every value
of the mark variables, the k-th κ frame cannot end an operation in a
typed abort; hence no deferred expression ends in a typed abort).

**Arguments and their standing.**
- **[L05]** Leijen, "Extensible records with scoped labels", TFP 2005:
  row equality up to scoped-label order, row unification. Published.
- **[L17]** Leijen, "Type directed compilation of row-typed algebraic
  effects", POPL 2017: effect safety for row-typed algebraic effects
  with scoped labels (an operation goes to the innermost handler of its
  label). Published; Waxwing's consumption is a project variant of it
  (FX001), not the paper's rule.
- **[FX008-5]** FX008 design §5, "Soundness argument (a proof
  obligation)": abort safety from the least solution, honest frames,
  met assumptions, mark variables and `defer`. A project argument,
  reviewed against probes (revisions 6-7 found no unsound acceptance);
  **not proved**, not published.
- **[FX008-3.4]** FX008 design §3.4's per-rule justifications. Project
  arguments.
- **[§5]** §5 of this document: `holds` exact for every rigid valuation
  (universal), the correspondence with FX008's criterion (universal
  given P1-P3) and its bounded oracle.
- **[REP]** spec §6 and Specialize.purs `specializeWith`: program output
  does not depend on the representative a hole lowers to (tested with
  another representative; bounded).

**The obligations.**

| Obligation | Intended semantic property | Independent argument (standing) | Class |
|---|---|---|---|
| E1 type equality, rows up to scoped order | the two sides denote the same type, so a value of one may stand for the other | standard unification over rows [L05] (published) | S |
| E1 marks equal inside types (function types invariant) | a handler or callback passed by type carries the mark facts its type promises | [FX008-5] point 1 (handler values reach installations only by type equality, marks included) (argued); invariance is the conservative choice | S |
| Definition 4.1, handler-type equality (handled marks by equality; R with marks when neither side owns a C, R standing in as C; otherwise R ignoring marks and clauseRow ≡ clauseRow) | a handler value carries, wherever it is installed, the m and C its type promises | [FX008-5] point 1, "Handler values reach installations only by type equality (C ≡ C, marks included)"; FX008 §3.4, "Two handler types unify C with C, marks included" (argued); Unify.purs and UnifyParts.purs as supporting evidence only | S; separating example attempt A (§12.2; reasoned, not run) |
| C ≡ C with marks, tails and `Fail` heads, no other arguments (Definition 4.1(c), (d)) | an owned C's labels, assumption marks and tail survive every type equality, so no frame edge it implies is lost | [FX008-5] point 1 (argued); E5's FrameOuter and FrameRigid edges read C's labels and tail | S; separating example attempt B (§12.2; reasoned, not run) |
| E1 exception: R ≡ ρ (E5) ignores marks; R ≡ R ignores marks only when either side owns a C (Definition 4.1(d)) | where a C carries the marks, R's marks are never read, so ignoring them loses nothing | [FX008-3.4] "R's marks are dead", [FX008-5] point 1 (argued) | P (sound by argument) |
| E2 labels matched by first occurrence per key; ρ holds at least as many | effect safety: each label the stage may perform has a handler occurrence in the target, the innermost first | scoped-label dispatch [L17] (published, adapted); per-key counts give finite rows (FX008 §3.5 (c)) | S |
| E2 payloads equal | the handler that receives the operation is the one for its effect instance | [L17], [L05] (published) | S |
| E2 remainder: rigid ϱ needs ρ to end in ϱ (tail pass) | a computation that may perform anything in ϱ runs where ϱ is present | FX008 §3.5's tail pass: "without the pass, the base effect system is unsound" (argued, with the rigid.wxw probe) | S |
| E2 remainder: none for a closed source (F7) | a closed stage performs only its labels, all matched | effect safety needs only the matched labels [L17] (published, adapted) | S |
| E2 edge mark(ρ) ⊑ mark(s) on matched pairs | assumptions are met: a computation assuming N runs under an N frame | [FX008-5] point 2 (argued) | S |
| E2 copies: fresh positions with mark(ρ) ⊑ mark(copy) | the copy inherits the assumption edge (soundness); fresh positions avoid merging unrelated handlers (precision) | [FX008-5] point 2 for the edge; [FX008-3.4] review I1 for freshness (argued) | S (edge), P (freshness) |
| E2 target extension t ⊑ mark(s) | a label added to a target's tail inherits the stage's assumption | [FX008-3.4] review rev6 I2 (argued) | S |
| E2 at `defer` (d into the enclosing row) | cleanup's assumptions are met by its registration context | [FX008-5] point 2, "cleanup runs in its registration context" (argued) | S |
| E2 installed-C site (per-key count; Lend `assume` edge) | the frame's clauses reach outer frames at least as strong as they assume | [FX008-5] point 1 (argued) | S |
| E3 opening at use (an M handled label in a parameter, an N one in the result, made fresh) | accepts handler values at weakening positions | [FX008-3.4] D3; callback rows never opened ("would be unsound") (argued) | P (sound by argument) |
| E4 c into C with marks (C ⊑ c); c into R ignoring marks | C over-approximates what the clauses perform, with their assumptions | [FX008-5] point 1 (argued) | S |
| E4 own abort: `Fail` or rigid tail in a clause gives M ⊑ m | a handler whose clause may abort by itself is not N | [FX008-5] point 1 (argued) | S |
| E4′ owned C not from a literal, recorded by generation: R's labels, bare; a ResultC's tail by `ownClauses`' occurs rule; an annotation C's tail always fresh | the C a caller installs covers what the callee's or the argument's clauses may perform | ResultC tail: ResultClauses.purs's comment, by parametricity clauses reach nothing else through a tail the caller cannot fill (argued in a code comment only); annotation tail: FX008 §3.4, review M5 (argued) | S; **argument needed** for the ResultC tail (decision 3) |
| C rows bare (no label arguments) | marks attach to effect keys; dispatch is by key | Task 7 ruling; [FX008-5] point 1 reads C only for keys and marks (argued) | S by argument; C for the ruling |
| E5 R into ρ ignoring marks (inclusion) | effect safety of the handler's inference row in its context | [L17] (published, adapted); marks dead (argued) | S |
| E5 frame edges m ⊑ f, paired ρ marks ⊑ f, rigid C tail gives M ⊑ f | frames are honest | [FX008-5] point 1 (argued) | S |
| E5 Console frame edges skipped (Frames `framed` guard) | none: a Console frame is N by definition | sound only while no `Handler(Console …)` value can be built (FX011); the code says it "drops real demands" | **C, conflict candidate** (decision 1) |
| E6 no `Fail` and no rigid tail in d | cleanup neither fails nor performs an unknown effect | [FX008-5] point 4; spec's `defer` rule (argued) | S |
| E6 d's labels ⊑ N | cleanup's operations reach frames that cannot abort | [FX008-5] point 4 (argued) | S |
| E7 a call's `nofail` assumption | as E2's edge | [FX008-5] point 2 (argued) | S |
| E8 `main` within Console | effect safety at the top: only the runtime's Console handler exists | the runtime (spec §1); [L17]'s top-level condition (published, adapted) | S |
| E9 Fail payload head concrete | lowering needs a concrete error family for the Go layout | audit C6; lowering's family read (cited) | I |
| E10 body row within the declared row | the signature's row is a sound upper bound for callers | [L17] (published, adapted) | S |
| E11 ambient rows | defines E2's targets | definitional | — |
| E12 every edge for every rigid valuation | abort safety holds for every value of the mark variables | [FX008-5] point 3; [§5] (universal for `holds`; correspondence bounded) | S |
| Console labels N; `nofail(k) Console` recorded as N | the runtime is Console's only handler, which cannot abort | spec §1, FX008 §3.3 (argued) | S, while FX011 holds |
| hole defaults: type Int, record tail none | the program's output does not depend on the representative | [REP] (bounded) | I |
| hole default: effect tail the closed row | obligations judged at ∅ hold for every row lowering might choose, since lowering reads no effect row | audit §3 C1 (argued from the code) | S by argument |
| FX008's F1′ hook, correction S, termination T (excluded) | reproduce today's type solutions and acceptance order | FX008 §3.4's compatibility argument (argued) | C (excluded from the validator) |
| side-condition texts, diagnostic headlines | which message a refusal prints | today's behaviour only | C |

**Compatibility-only obligations.** The rules above supported only by
existing behaviour: the Console frame guard (E5), the bare-C ruling as
a ruling (its soundness has an argument), FX008's F1′, S and T
(already excluded from the validator), and diagnostic texts and
headlines. None is a soundness obligation of the validator; each is
kept only to match today's acceptance or output and is listed so it is
not mistaken for one. Definition 4.1 is not on this list: it is class S
on FX008 §5's argument, and today's agreement with it is supporting
evidence (§18.82).

**Conflicts and decisions for the author.** Each keeps its separating
example; none is resolved by copying today's behaviour. Decisions 1, 3
and 4 are **open**; 2 is decided and listed as the precedent.

1. **Console frame guard** (E5; open). Frames `framed` adds no edge for
   a frame marked N, which today means only a Console frame; the code
   says this "drops real demands" and that user Console handlers
   (D001) must revisit it. Separating example (unrun, not constructible
   today because of FX011): a user `Handler(Console …)` whose clause
   fails, installed around `defer print(1)`. Proposed: the validator
   generates the frame edges for Console frames too; that costs nothing
   today (unreachable) and stays sound if FX011 is lifted.
2. **FX032** (decided, §18.78): today's checker drops an operation's
   own `with` row, which accepts unsound programs; a-min records it as
   unsupported. Listed as the precedent for this rule.
3. **E4′'s ResultC tail rule rests on a parametricity claim in a code
   comment** (ResultClauses.purs; open). It is soundness-relevant (a
   ResultC's tail decides which outer frames its clauses can reach) and
   has no independent argument. Separating example to construct: a
   callee returning a handler whose clauses call a callback through a
   row variable that occurs only in the result. Proposed: write the
   argument before implementation, or treat such ResultCs as
   unsupported. (The annotation C's always-fresh tail does not rest on
   this claim.)
4. **Divergence, not a soundness conflict** (open): with F1′, S and T
   excluded, R0 may accept a program today's checker rejects (FX008's
   gain1.wxw is such a program for FX008 revision 10 itself). FX008
   argues these gains are sound. The shadow differential reports each
   such program for review rather than counting it as agreement or
   refusing it to match today.

Not covered here: proofs of any [FX008-5] point, which remain a proof
obligation; the effect-safety theorem for Waxwing's consumption
variant, for which [L17] is the published model, not a proof of this
rule.

## R1. Adversarial review 1 (2026-10-24): not ready

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

## R1a. Revision 2's answers to review 1

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

## R2. Adversarial review 2 (2026-10-24): not ready

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

## R3. Adversarial review 3 (2026-10-24): not ready; fixes local

A bounded independent review (Opus, read-only; nothing run) of revision
3 at 3bf8708, under §18.78's brief. The controller re-read T2-a's and
T5-a's evidence (Defer.purs consumes d into the current row with
`ignoreMarks: false`; `UnresolvedReason` has only the Inference,
Unsupported and Limit families) and they hold. The reviewer judged the
structure sound and the fixes local, and expects revision 3 to be
approvable once the nine findings marked below are resolved, pending
U1's and U6's oracle and written argument.

**Checked clean.** `holds` is sound and exact on normal forms,
including M on the left (universal argument). Per-valuation
satisfiability matches FX008's path criterion, and Mark.purs
`violation` agrees with the design's criterion. Cycles, constants,
several rigid variables, joins on flexible positions, and equalities
with constants all behave the same on both sides. Forged holes in label
arguments, at two sorts and in nested tails are refused (given U4).
Forged extra or missing sites are refused. "Fresh" means a fresh
position everywhere. Routing: a failed check lets later strategies
run; `Certified` is minted only through `certify`, so no strategy
reaches Solved without effect validation; an unsupported obligation is
refused alike by every strategy.

**S1.**
- **T2-a.** The edge ρ ⊑ d from consuming a deferred row into the
  enclosing row is missing: `defer` is not among E2's sites, E6 holds
  only absence and d ⊑ N, E10 checks containment only, and E12 collects
  edges from E2-E7. A forged package can mark d's Log N and pass, so
  `defer log(1)` under a failing handler would be accepted. Fix:
  `defer` joins E2's sites, and E12 collects the directional edges of
  E10's settling consumptions (deferred rows into their row, clause rows
  into C, installed C into ρ).

**S2 (several S1 risks if built literally).**
- T3-b one FX008 meta in two places: clause rows, deferred rows and
  copies would be both effect-row bindings and site facts; forging
  `HandlerLit.clauses` to `pure` could drop the own-abort constraint.
  Pick one home each; I3 forbids the other.
- T3-a E1's `Obligation` is undefined; recorded atoms are row-free, so
  nothing records the written side's rows, fixed marks or annotation
  mark positions, and a forged N nested in an image equated with a
  written M label would pass. Define E1's obligation with rowed and
  marked sides.
- T2-b the tail pass (a clause row ending in rigid ϱ needs R and C to
  end in ϱ) is unstated for clauses; consumption and containment are
  worded as procedure steps, not conditions on final rows.
- T2-d Task 9's as-built rule: a top-level result handler type at a
  use gets its own bare C; every other written handler type has C
  aliased to R; I3 must enforce the alias.
- T1-a the least-term construction must be stated over equality classes
  (union-find over E1 and callee-k sharing), a class holding a fixed
  term taking it; as written, a position equated with an unreached
  rigid k gets N and breaks the equality.
- T2-c callee mark variables at a use have no package position (they
  belong to the signature, not an image): add an `Instantiated` site.
- T2-e C rows are bare (no label arguments) and installation pairs C
  with ρ by key and position, recording mark edges only, not consuming.
- T5-a `EffectsUnchecked` is not reachable as an Unresolved reason as
  specified; add it as an `Unsupport` constructor read as a decline
  (like `RequirementOpen`), never as a `CandidateRefused` search fault;
  reconcile with r0-erased-rows §7.1 item 2's rule-1 placement.
- T1-b U1's premises (the package's graph is exactly FX008's, every
  meta has a position). T2-f `handle`'s ambient `Fail(E…) + ρ`. T2-g
  F1′, correction S and termination T need explicit exclusions
  (inference only; R0 may then accept programs today rejects, as gain1).

**S3.** T1-c the 36-pair check has no recorded location; T2-h smaller
mismatches (installation's unreachable case, Console frames, E1's
refusal list, nested marks in payloads); T3-c E5 must name the head's
marked type as the source of m and C; T3-d `Fail`'s placeholder is not
a `MarkTerm`; T3-e a fixture that `nofail(k) Console` is recorded as N;
T5-b an unsupported construct gives `NoCandidate`, not `Inconsistent`;
T5-c FX032's scope covers every perform site; two §12 wording items.

## R3a. Revision 3.1's resolution ledger for review 3

| Finding | Resolution in revision 3.1 |
|---|---|
| T2-a (S1) defer's edge | §4 E2 sites include `defer` and settling consumptions; E12 collects exhaustively; §7a trace; §12 fixture |
| T3-b two homes | §2 ownership table; site facts hold variable names; I3 refuses a second copy; §12 fixture |
| T3-a E1 sides | §4 E1 records full marked sides; §10 `Obligation`; §12 fixture |
| T2-b tail pass, final rows | §4 E2 final-row conditions with tails; E4 clause tail pass; §12 fixture |
| T2-d owned C, alias | §2 table (`ResultC`), E5, I3; §12 fixture |
| T1-a equality classes | §5 least terms over classes; oracle's per-position mutant shows the difference |
| T2-c callee marks | §2 `Instantiated` site; §12 fixture |
| T2-e bare C | §4 E2 (C bare, keys only), E5 pairing by key and position; §12 famw fixture |
| T5-a routing | §7: rule-1 `Unsupported EffectsUnchecked`; candidate failures `CheckFailed`; §12 fixtures |
| T1-b premises | §5 P1, P2 |
| T2-f `handle` | §4 E11; §12 fixture |
| T2-g exclusions | §13 with reasons |
| T1-c 36-pair check | §5 says where it is reported and that it is not in the repository |
| T2-h mismatches | E5's unreachable case and Console frames; E1's refusal list; E2 nested marks |
| T3-c head's type | E5 reads m and C from h's marked type |
| T3-d Fail placeholder | §2: the term N, never read, erased |
| T3-e Console | §2: I3 refuses a non-N Console term; generator records `nofail(k) Console` as N |
| T5-b NoCandidate | §7 routing |
| T5-c FX032 scope | §7 step 2 (every perform site's construct) and §9 |
| §12 wording | the E4/E5 row and "pinned" corrected |

## R4. Targeted confirmation review of revision 3.1 (2026-10-24)

An independent targeted review (Opus, read-only; one run of the
oracle, matching its README) at af588f6, under §18.79. The controller
re-read N2's and N3's evidence (Lambda.purs calls MarkUse `localMarks`,
whose `handlerRows` gives an annotation's outermost handler type its
own C; Decide.purs `untilVerdict` is `not blocked && (solved ||
refuted)`, so a blocked declaration still runs every strategy and
refuter, Solved being suppressed afterwards by `solvedUnlessBlocked`)
and they hold. No scope expansion found: every repair stays within the
representation and theorem scope.

**Confirmed sound.** `holds`, §5's argument (written constants are only
N, M or one rigid, which should become a stated premise), the `defer`
edges, §7a's trace (honest and forged packages refused; forged d = ∅
refused by the per-key count), failed-candidate routing, U6's refusal
coverage against every effect and mark `Problem` constructor, and the
exclusions' reasons. Ledger: T2-a, T3-a, T2-b, T1-a, T2-c, T2-e, T2-f,
T2-g, T2-h, T5-b and the §12 wording resolved; T3-b, T2-d, T5-a, T1-b,
T3-e, T5-c partly (below); T1-c resolved as disclosure; T3-d resolved
with wording off.

**Required before implementation approval.**
- **N1 (S1, plausible).** An owned C that does not come from a literal
  (`ResultC` from ResultClauses `ownClauses`; a lambda annotation's C
  from MarkUse `handlerRows`) is constrained by nothing: forged to the
  closed empty row it drops every FrameOuter and FrameRigid edge. Fix:
  an obligation that such a C holds bare(R) per key count, its tail as
  `ownClauses`' occurs rule gives (or the annotation's fresh tail); a
  §12 fixture (a handler returned as `Handler(nofail Ask with Log)` and
  installed under a plain `Log` row around a `defer`).
- **N2 (S2).** Lambda-annotation handler types own a C; §0 item 4's
  "every other C is R's bare alias" is false. Give that C a home.
- **N3 (S2).** "No strategy runs" under a rule-1 block is false (see
  above); the outcome, never Solved, holds.
- **N4 (S2).** Today R is consumed into ρ ignoring marks (Consume
  `consumeIgnoring`; a closed R gets a throwaway tail), so it is
  R ⊆ ρ, not R ≡ ρ; E5 as written would refuse programs today accepts
  (unrun example `fn st(h: Handler(State(Int))): Int with Log = with h
  { State.get() }`). A completeness loss. Fix: E5 is E2 with marks
  ignored.
- **N5 (S2).** State that a handler literal's recorded type names
  `HandlerLit.m`, `HandlerLit.c` and R's variable; that generation
  records an E1 wherever an image can copy a site position; restate P2
  per class (a meta shared between a site and an image is two positions
  joined by E1); fixture: a let-bound failing handler installed around
  a `defer`, its image mark forged to N.

**S3.** N6 §2's "site facts hold variable names, never rows"
contradicts `HandlerLit.c` and `ResultC` as rows. N7 §5 over-claims:
2,351 of the 200,000 random assignments passed `holds` (in a family
without equalities); the `two` family has at most one equality; the
mutants and the author's 36-pair check are not reproducible from the
repository (an injected-mutant module would make them so). N8 E2's
"installed C into ρ" and E5's "no consumption": say the site gives
E2's per-key count and Lend `assume`'s edge `mark(ρ partner) ⊑
mark(C label)`. N9-N12 the `Fail` placeholder wording; the Console
fixture; FX032's "every perform form"; §7a's probe citation
(test/fx008-probes/…) and label (bounded, not universal).

## R4a. Revision 3.2's resolution ledger for the targeted review

| Finding | Resolution in revision 3.2 |
|---|---|
| N1 (S1) owned C unconstrained | §2 rows for ResultC and the annotation C (labels and fixed marks derived from the recorded problem); E4′ (label count, order, tail rule); §12 rows; cases.mjs "owned C forged empty" with control and the earlier set |
| N2 annotation C | §0 item 4 corrected; §2 row; E4′; §12 row |
| N3 routing wording | §7: strategies run, acceptance suppressed by `solvedUnlessBlocked`; §12 routing row; behaviour unchanged |
| N4 inclusion | E5 consumes R into ρ ignoring marks (E2, inclusion); §13 rows; §12 row; cases.mjs "inclusion" |
| N5 copies | §2 "Copies through equations"; P2 per class; §13 row; §12 row; cases.mjs "let-bound handler" |
| N6 rows in sites | §2: site facts hold marks or variable names only; the literal's C is a binding |
| N7 oracle over-claims | §5 reports tried and passing separately; equality coverage expanded; `pairs36` and `mutants.mjs` reproducible |
| N8 installed C | E2: the installed-C site gives the per-key count and Lend `assume`'s edge only |
| N9 `Fail` placeholder | §2: N, edges hold trivially, I3 refuses another term |
| N10 Console fixture | §12 Console row |
| N11 FX032 perform forms | §9 lists every perform form |
| N12 §7a citation, label | §7a: bounded, the three named probes; cases.mjs |

## R5. Targeted re-review of revision 3.2 (2026-10-24): not ready

An independent targeted review (Opus, read-only; one run each of
run.mjs and mutants.mjs, both matching the README) at e26d76f, under
§18.80. The controller re-read F1's and F2's evidence (Unify.purs
`unifyInference`: "When neither type has a C of its own, C is R and its
marks are compared with it", marks ignored on R only when a side owns a
C, and `unifyClauses` comparing C rows separately; §10 still declaring
`ResultC { c ∷ MRow }`) and they hold. No scope expansion: every repair
stays within the representation and theorem scope.

Ledger: N3, N4, N7-N12 resolved; N2 resolved with wording off; N1, N5,
N6 partly (below).

**S1.**
- **F1. E1 omits C ≡ C, and ignores R's marks even when neither type
  owns a C.** E1 says marks are ignored on inference rows; today's
  checker compares R's marks when neither side owns a C, and compares C
  rows (marks, tails, `Fail` heads, no other arguments) whenever either
  side owns one. §13 has no `unifyClauses` row and its R ≡ R row is
  wrong. Attempt A (unrun; accepted under E1 as written with an honest
  package): `fn f(h: Handler(nofail Ask with Log)): Unit with Log = with
  h { Ask.ask() }; fn g(h2: Handler(nofail Ask with nofail Log)): Unit
  with Log = f(h2);`, today refused (N against M on R), lets a caller
  install a handler whose clause defers `Log.log` under a failing `Log`.
  Attempt B (unrun): `let h = if b then mk() else g` with
  `mk(): Handler(nofail Ask with ...s)` and `g: Handler(nofail Ask with
  ...r)`, the ResultC tail forged ∅, drops FrameRigid. Fix: E1 on
  handler types compares handled marks by equality, R ≡ R ignoring
  marks, and clauseRow ≡ clauseRow with marks, tails and `Fail` heads,
  a side without its own C contributing R's bare alias with R's
  positions; §13 rows; attempts A and B in cases.mjs with controls; a
  mutant dropping C ≡ C.
- **F2.** §10's `SiteFact += … ResultC { c ∷ MRow }` makes the ResultC a
  package-side row again, contradicting §2 and §18.80's single home.
  Remove it and name where the derived C is recorded.

**S2.** F3 the recorded problem cannot yet supply what E4′ derives
from: handler forms are `Outside HandlerType` markers today and
`Fields` holds no callee signature; record, at each use with a
top-level handler result, the derived C (R's labels bare with `Fail`
heads; each mark N, M or a reference to the `Instantiated` k; the tail
as R's variable, the use's own variable, or closed when R is closed),
and at each annotation the MTy with its C (own `Annotation` positions,
a fresh tail). F5 "every image copy arises from a recorded unification"
is unchecked against all unifier entry points (Merge `improve`,
Argument, ArgumentRow, Consume, RowEntry, EndReport): enumerate each in
§13.

**S3.** F6 an annotation C's tail is always fresh (E4′'s single rule
reads otherwise), and `freshType` gives a C to every handler type not
inside another's rows, not only the outermost. F7 E2's remainder lacks
a closed source; R's extension marks are read by the alias's `assume`
edge (harmless). Cases: m in the owned-C case is an `Opened` meta, not
the constant N (verdict unchanged); the owned-C case hard-codes the
derived C, so it shows unsatisfiability, not derivation; the inclusion
case is a set tautology that does not exercise E2's rigid-tail rule;
§12's "reproduced" rows sit under an "all unrun" header. Labels: §2's
copies claim and §0a's "cannot supply or forge" are unlabelled
universal or design claims.

Clean by reading: inclusion with C pairing (both take the r-th
occurrence of a key from the front); the per-key count against
`partners`; copies during consumption (fresh, with edges) and during
equality (same meta); monomorphic `let` (h shares the literal node's
variable).

## R5a. Revision 3.3's resolution ledger for the re-review

| Finding | Resolution in revision 3.3 |
|---|---|
| F1 (S1) E1 omits C ≡ C; R's marks ignored even with no owned C | Definition 4.1 (§4), cited from Unify `unifyHeads`, `unifyInference`, UnifyParts `handledMarks`, `unifyClauses`, Domain/Row `clauseRow`, UnifyRow `ignoringArguments`, `unifyRowsIgnoring`; E1 refers to it; §13 rows for arguments, handled marks, R ≡ R and C ≡ C replace the wrong R ≡ R row; §14 rows for Definition 4.1 and C ≡ C (class S); attempts A and B in §12.2 (reasoned, not run); oracle cases and the C-equality mutant are condition 5's parallel work, no result claimed |
| F2 (S1) `ResultC { c ∷ MRow }` in §10 | removed from `SiteFact`; the derived C is recorded by generation in `Fields.instances` (§2, §10); §12.2 "recorded ResultC" row |
| F3 (S2) no recorded inputs for derivation | §2 "What generation records" (today: `Outside HandlerType` markers, no callee signature in `Fields`); `instances` and `annotations` in §10; E4′ reads the records; §12.2 generation-side row |
| F5 (S2) unifier entry points unchecked | §13a: audit done; O1, O2 unrecorded (proposed E1s), O3-O7 (§18.82 condition 4); §2's copies claim, §0a item 2, U6 and the §13 copy row labelled open pending it |
| F6 (S3) annotation C tail always fresh; a C for every handler type not inside another's rows | §2 annotation row and "What generation records" (`freshType`, `handlerRows` run twice, `Hole <$> next`); E4′ split by kind; §0 item 4 corrected; §13 row; §12.2 row |
| F7 (S3) E2's remainder lacks a closed source; R's extension marks read by `assume` | E2 remainder states the closed-source case (Consume `consume`, UnifyMark `stageLabel`); §2's extension-marks row names its readers; §14 row; §12.2 row |
| S3: m in the owned-C case is an `Opened` meta | §12.1 limits note; changing the case is the oracle's work |
| S3: the owned-C case hard-codes the derived C | §12.1 limits note; derivation cases are condition 5's parallel work |
| S3: the inclusion case is a set tautology | §12.1 limits note; its replacement is condition 5's parallel work |
| S3: "reproduced" rows under an "all unrun" header | §12 split into §12.1 (reproduced, bounded) and §12.2 (unrun) |
| S3: §2's copies claim and §0a's "cannot supply or forge" unlabelled | §2: design and open (pending §13a); §0a item 1 design, item 2 open |
| §18.81 fold | §14; r0-amin-obligation-semantics.md reduced to a pointer; decisions 1, 3, 4 kept open |
