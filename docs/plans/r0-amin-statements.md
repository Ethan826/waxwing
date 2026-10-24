# a-min: statements, revision 3.2 (G-effect-rows, 2026-10-24)

Status: **statements only, for a targeted re-review** (dossier §18.80).
No code; implementation unauthorized; Task 4.6 and G-D1 blocked.
Revision 3 (one design, §18.77-18.78) was reviewed a third time (§R3);
revision 3.1 applied those fixes and delivered U1 and U6; a targeted
review of 3.1 (§R4) found one plausible S1 (N1) and four S2. This
revision 3.2 applies them under §18.80's conditions (§0a) and extends
the oracle (research/amin-mark-oracle/, now with hand-translated
forgery cases and injected mutants). §R3a and §R4a are the resolution
ledgers. "Local fixes" describes edit size, not confidence that the
remaining soundness work is small (§18.80). Labels on every claim:
**decided** (the author's), **universal** (an argument for all
inputs), **bounded** (a check over finite inputs, named), **unrun** (a
predicted example outcome), **proposed**, **open**.

Sources: FX008's design (docs/plans/2026-10-10-abort-tracking-design.md
§1, §3.3-3.5) and plan ("as built" notes for Tasks 7-9); the code it
built (Frames.purs, Defer.purs, Clauses.purs, Install.purs, Lend.purs,
ResultClauses.purs, MarkUse.purs, UnifyMark.purs, Consume.purs,
TailPass.purs, Handle.purs, Settle.purs, SyncCycle.purs, Mark.purs);
FX001's consumption; r0-erased-rows.md §2, §7.1;
r0-certify-argument.md; findings.md "Effect and coverage audit".

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
   the package (§2, E4, E5).
2. **Copies through equations** (N5): a handler literal's recorded type
   names its site positions, generation records an E1 at the literal's
   node, and every image copy of a site position arises from a recorded
   unification, so a position and its copies form one class; P2 is
   per class; mark assignments are checked per class (§2, §5).
3. **Inclusion, not equality** (N4): R is consumed into ρ ignoring marks
   (E2 with marks ignored), so ρ may hold more effects (§4 E5, §12).
4. **Routing described as built** (N3): a rule-1 block still runs every
   strategy and refuter; Solved is suppressed afterwards (§7).
5. **Reproducible evidence**: the forgery cases (cleanup, owned C
   forged empty, let-bound handler, inclusion), each beside an honest
   control and judged under the earlier obligation set too, and three
   injected mutants, run from the repository (§5, §12).
6. Smaller corrections N7-N12 (§R4a).

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
| a ResultC (top-level result handler type at a use, ResultClauses `ownClauses`) | labels and fixed marks: **derived by trusted code** from the recorded callee signature (R's labels, bare, R's written marks); tail: R's tail where `ownClauses`' occurs rule keeps it, else the `⟨p, result clauses⟩` effect-row binding | E5 |
| an annotation C (outermost handler type in a local annotation, MarkUse `handlerRows`) | labels: **derived** from the recorded annotation (R's labels, bare); marks: written `nofail` kept, others positions in `sites` `Annotation { marks }`; tail: the `⟨p, annotation clauses⟩` effect-row binding | E5 |
| an installation's frame mark f | `sites` `Installation { frame }` | E5 |
| a callee's `nofail(k)` at a use (one meta per k, shared across its signature) | `sites` `Instantiated { marks ∷ Map MarkName MarkTerm }` | the instance's written labels, by name |
| an opened handler mark at a use | `sites` `Opened { mark }` | E1, E3 |
| an unmarked label in a local annotation | that annotation's recorded type in the problem names a position; its term lives in `sites` `Annotation { marks }` | E1 |
| marks R ≡ ρ adds by extension (dead) | none: unconstrained, erased by `strip` | nothing |

Every site fact holds marks or variable names, never rows (rows are
bindings or derived); I3 refuses a site fact that carries a row (T3-b,
N6). The package's domain equals the recorded positions exactly (N10);
R's dead extension marks are terms inside bindings that no obligation
reads, listed as such in the domain.

**Copies through equations (N5).** A handler literal's recorded type is
`THandler (Label e args (HandlerLit.m)) { inference: ⟨p, handler
inference⟩, clauses: Just ⟨p, handler clauses⟩ }`, and generation
records `Equal (TVar node) (that type)` at the literal's node. An image
can hold a copy of a site position only where today's checker unifies
two types, and each such unification is recorded as an E1 (§13, first
row), so a site position and every image copy of it are joined by
recorded equations into one class. P2 holds per class (§5), and
`validateEffects` checks mark assignments per class (`norm` equality on
every E1 mark pair).

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
arguments equal, nested marks included; marks equal on normal forms,
except on handler inference rows (FX008: R ≡ ρ and R ≡ R ignore marks).
Refusals: TypeMismatch, InfiniteType, LabelMismatch (RowPayload), the
mark E_TYPE clashes (UnifyMark `equateMarks`). Recorded atoms (RTExpr)
stay row-free for G0; E1 is a separate record.

**E2, consumption of a row s into a target ρ.** Sites: call, perform,
apply, pipe, over- and partial-application stages, callback, **`defer`
(d into the enclosing row)**, and settling's consumptions: **clause
rows into C, installed C into ρ, deferred rows into their row**
(FX008 §3.5 step (d)); the installed-C site contributes only E2's
per-key count and Lend `assume`'s edge `mark(ρ partner) ⊑ mark(C
label)` (no remainder; N8). With s and ρ completed, the condition is: for
each key κ, the r-th occurrence of κ in s is matched with the r-th
occurrence of κ in ρ, and ρ has at least as many occurrences of κ as s
(the side-condition, per key); matched labels' arguments are equal
(nested marks included), except that C rows are bare and compare keys
only (T2-e); the remainder: if s ends in a rigid ϱ, ρ ends in ϱ (the
tail pass, T2-b); if s ends in a hole, it is the closed row (§6);
otherwise s's tail variable's binding is ρ's labels after the matched
ones followed by ρ's tail, labels equal up to marks (the copies). Mark
edges, unless the site ignores marks (consumption into R): each
matched pair `mark(ρ occurrence) ⊑ mark(s occurrence)`; each copy
`mark(ρ label) ⊑ mark(copy)`; each label s adds to a target's tail
`mark(added) ⊑ mark(s label)`. Refusals: EffectNotAllowed, MustBePure,
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

**E4′, an owned C not from a literal** (N1). A ResultC or an annotation
C: its labels are exactly R's labels at creation, bare, in order and
count, and its fixed marks are R's written ones; trusted code derives
both from the recorded problem, so the package supplies neither. Its
tail is R's tail where `ownClauses`' occurs rule keeps it (a variable
occurring in a parameter or the own row), else its own effect-row
variable, which grows only through recorded E1 `C ≡ C` equations and,
if unbound, defaults to the closed row (the tail pass's closing).

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
effect rigids and ambient rows (E11); a construct whose obligation kind
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
markers today.

## 10. Interfaces (revision 3's, amended)

`Fields += { obligations ∷ Array Obligation, rigidMarks, arities,
effectRigids, ambient rows }`; `Obligation = Equal MTy MTy | Consume
{ site, source ∷ Var, target ∷ RowRef, marks ∷ Bool, bare ∷ Bool } |
HandlerLit … | Install … | Defer … | Entry … | FailConcrete … |
Unsupported Kind`; `SiteFact += Instantiated { marks } | ResultC
{ c ∷ MRow } | Annotation { marks }`, and `HandlerLit` and `Deferred`
hold variable names only; `Unsupport += EffectsUnchecked (Array
Kind)`; `CheckRefusal += Malformed | ObligationFailed Obligation`.
Change surface (N11), from revision 3: Strategy.purs `checked` (unchanged shape:
`Certified` still carries `Valid` and `Compilation`); Decide.Reason
(maps `EffectsUnchecked` to its Unresolved reason); Witness.purs
`bindingsOf`, `sameSort`, `bareHole`; HoleContract.purs `image`;
Candidate.purs `generic`; the read-back; Generate's context and every
row-writing site (§3, review 2's N6 list: `⟨p, apply⟩`, a lambda's inner
stage rows, partial-application stages, plus review 1's I6 list); the
certify argument and `certifySound`'s statement.
Added in revision 3.1: Decide's rule 1 (the new `Unsupport`) and
Resolve/Effect.purs (`OperationInfo`'s field).

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
  are unrun.
- Novel, for approval (ADR 014): I3; the ∅ default for effect-row
  holes; consumption-based inclusion (FX001/FX008's design, no
  published source); the mark-term evidence and §5's correspondence.

## 12. Separating examples (all unrun predictions)

Revision 3's rows, with two corrections (the E4/E5 row's rule, and
the hole-identity row's "pinned", which read as if a test existed),
followed by the rows revision 3.1 adds:

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
| E2 at `defer` (T2-a) | FX008 §1's `work`, its deferred mark forged to N: refused by `M ⊑ N` | E2 without `defer`'s site |
| single homes (T3-b) | a package whose `HandlerLit` carries its own clause row besides the binding: `Malformed` | two homes for one meta |
| E1 marked sides (T3-a) | a forged N nested in an image equated with a written plain `Log`: refused | row-free equations |
| tail pass (T2-b) | a clause calling an ambient-row callback, its R forged to a closed row: refused | containment without tails |
| owned C (T2-d) | a written handler parameter type (not a lambda's annotation) with a forged C dropping a label: `Malformed` (C is R's bare alias) | C owned everywhere |
| owned C forged empty (N1; reproduced, cases.mjs) | `fn mk(): Handler(nofail Ask with Log)` installed under a plain `Log` row around `defer Ask.ask()`: honest refused (f = M), forged ResultC = ∅ with f = y = N refused because C's labels are derived ([Log]); control: the caller's row `nofail Log`, accepted; under revision 3.1's package-supplied C the forgery passed | C supplied by the package |
| annotation C forged empty (N1, N2) | the same with `let k = fn(h: Handler(nofail Ask with Log)) => with h { defer Ask.ask() }`: forged annotation C = ∅ refused (labels derived from the annotation) | annotation C without a home |
| let-bound handler (N5; reproduced, cases.mjs) | `let h = handler Log { log(n) => fail(E) }; … with h { defer Log.log(1) }`: honest refused; h's image mark forged to N refused by the E1 joining it to `HandlerLit.m`; control: a clause that does not fail, accepted; without the E1 the forgery passed | images unlinked to site positions |
| inclusion (N4; reproduced, cases.mjs) | `fn st(h: Handler(State(Int))): Int with Log = with h { State.get() }`: R ⊆ ρ with ρ holding the extra `Log`: accepted; revision 3.1's equality refused it | R ≡ ρ |
| Console (T3-e, N10) | `fn g(h: Unit -> Unit with nofail(k) Console): Unit with Console = h(())`: Console recorded as N; a package giving it M is `Malformed` | Console marks as positions |
| bare C (T2-e) | famw: `Fail(Job)` in C against `Fail(Job(Int))` in ρ: accepted | comparing C's arguments |
| callee marks (T2-c) | two uses of one callee with different terms for its `k` across labels of one use: `Malformed` | marks only in images |
| `handle` ambient (T2-f) | a `fail(E)` in a `handle` body whose ambient row omits `Fail(E)`: refused | E11 without `handle` |
| routing | FX032's `Op.op()` call: rule-1 `Unsupported EffectsUnchecked`; strategies run, an acceptance is suppressed, never Solved | candidate-level `EffectsUnchecked` |
| routing | a failing first strategy and an honest second: Solved by the second | stopping at the first refusal |

## 13. U6: coverage of generated obligations (argument)

For every rule of today's checker that can refuse a program for an
effect or a mark, after resolution, the obligation that records it, or
an exclusion with its reason. The rule list is the union of the audit
table's class-f effect refusals (findings.md), FX008 §3.4-3.5's
constraint generators, and the row-unification refusals reachable from
E1 and E2; review 3 checked it against the code (task 2).

| Rule (code) | Obligation |
|---|---|
| type unification of marked types (UnifyMark `equateMarks`, EqualMarks) | E1 |
| R into ρ ignoring marks (Consume `consumeIgnoring`: inclusion; a closed R gets a throwaway tail) | E2 with marks ignored; E5 (N4) |
| R ≡ R between two handler types (marks ignored) | E1 on inference rows |
| installation's edge ρ partner ⊑ C label (Lend `assume`) | E2 (installed-C site; N8) |
| consumption: first occurrence, payloads, ρ ⊑ s, copies, extension t (UnifyMark `pairMarks`, `stageLabel`, `targetLabel`) | E2 |
| `defer` consumes d into the current row (Defer `checkDefer`, `ignoreMarks: false`) | E2 (site `defer`) |
| settling step (d): clause rows into C, installed C into ρ, deferred rows (Settle) | E2 (settling sites) |
| side-condition per-key cycle test (§3.5 (c), SyncCycle, F2) | E2's per-key count on final rows |
| opening at use (MarkUse `openHandlers`) | E3 |
| local-annotation fresh marks and C (MarkUse `handlerRows`) | E1 with `Annotation` positions; the annotation C by E4′ (N1, N2) |
| a handler literal's type copied into images (unification) | E1 at the literal's node and at each unification (N5) |
| handler literal: c into R and C, C ⊑ c (Clauses `consumeBare`) | E4 |
| own abort (Frames `aborting`) | E4 |
| clause tail pass (TailPass) | E4 |
| owned C at a use (ResultClauses `ownClauses`); C = R's alias elsewhere (Install `clausesOf`) | §2, E5, I3 |
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
  can be built); D001 must revisit it, as the code says.

Tests of this mapping (unrun; listed in §12 and revision 3's I10): one
forged-package fixture per refusal kind; one mutation per row of this
table that drops its obligation and flips a fixture.

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
