# a-min: statements, revision 3 (G-effect-rows, 2026-10-24)

Status: **statements only, returned to the author before any further
review** (dossier §18.77). No code; implementation unauthorized; Task
4.6 and G-D1 blocked. Revisions 1 and 2 were reviewed and found not
ready (§§R1-R2, kept at the end with revision 2's answer table). This
revision replaces §§1-8a of revision 2 as one design, not patches. §0
summarizes what changed. Labels: **decided** (the author's),
**derived** (argued here, not proved), **proposed**, **open**.

Sources: FX008's design (docs/plans/2026-10-10-abort-tracking-design.md
§3.3-§3.5, the mark rules this revision maps one by one); FX001's
consumption (spec §2, "Consumption and opening"); the audit
(r0-effect-rows-audit.md); r0-erased-rows.md §2, §7.1;
r0-certify-argument.md; findings.md "Effect and coverage audit".

## 0. What changed from revision 2

1. **One authoritative marked package** (decided, §18.77). The search
   proposes a single package holding full pre-Strip types: every label
   occurrence carries its mark, every handler type its own-abort mark
   and both rows, nested occurrences included, plus the per-site facts
   FX008 introduces (frame marks, clause rows, deferred rows). `build`
   receives the stripped projection that trusted code computes from it.
   There is no second copy (replaces revision 2's D1-D3).
2. **Marks are positions, not problem variables.** No `SortMark`; marks
   never enter Cov's domain (N8). Rigid mark variables are the
   declaration's `nofail(k)` variables; every other mark is a flexible
   position the package must fill.
3. **Mark evidence is a term over rigid mark variables**, not a ground
   mark, and trusted checking quantifies over every rigid valuation
   (§5; N14 and the author's qualification). FX008's path criterion
   stays the reference.
4. **Obligations mapped rule by rule from FX008 and FX001** (§4), with
   the refusal each produces; recorded in the problem (R026's coupling).
5. **Outcome routing corrected** (N2): a failed effect check is a
   `CheckRefusal` (later strategies run); missing or unsupported
   validation is Unresolved `EffectsUnchecked`; `Witnessed` implies
   effects checked.
6. **The hole contract extends through rows and label arguments**, one
   sort per hole, defaults stated (N3).
7. **Soundness and acceptance preservation stated apart** (§8), with
   the unsupported cases (§9) and the unresolved claims (§11).

## 1. Goal, threat model, scope

Goal: replacing today's checker means carrying its complete effect-and-
mark contract. Every effect, mark and clause fact that reaches
compilation is judged by trusted code over the one package `build`
reads, pre-Strip obligations included; the fidelity target is the
post-Strip program, rows included (decided, Q1).

Threat model (decided, §18.76 ruling 4): soundness holds for any
candidate from any strategy, including inconsistent, malformed and
forged ones. An `Outside` marker does not excuse a contract that would
fail once removed.

Out of scope: lowering (unchanged), today's checker (unchanged), proof
of effect soundness (assurance Pending).

## 2. The package (proposed)

**Marked types.** `MTy = Ty Var` with marks: every `Label e args m` has
`m : MarkTerm`, and every handler type `THandler (Label e args m)
{ inference: R, clauses: Just C }` holds its own-abort mark m, its
inference row R and its clause row C (FX008 §3.4). Nested occurrences
are ordinary parts of `MTy`.

**Mark terms.** `MarkTerm = N | M | J (Set RigidMark)`: the strong mark
N, the weak mark M, or the join of a non-empty set of the declaration's
rigid mark variables; a single `nofail(k)` is `J {k}`. **Normalization**
(the author's correction, §18.78): `norm (J ∅) = N`, every other term
is its own normal form, and every comparison, inequality and equality
alike, is made on normal forms; the read-back and I3 accept `J ∅` only
as a spelling of N. Console is always N; `Fail` labels carry the fixed
placeholder (FX008 §3.3) and are never compared.

**Variables in images** (decided, §18.76 ruling 2): a rigid type, record
row or effect row variable only if the declaration declares it, at its
sort (the implicit ambient row variable counts as declared, N9); holes;
no flexible problem variable of any sort. A data type has exactly its
declared number of row arguments.

**The package.**

```text
Package =
  { bindings ∷ Map Var MBinding        -- every flexible variable
  , sites    ∷ Map SiteKey SiteFact    -- per-site FX008 facts
  }
MBinding = Inline MTy                  -- type or record sort
         | InlineRow (TyRow Var)'      -- effect-row sort, marked labels
         | Free Int                    -- hole n at the variable's sort
SiteFact = HandlerLit { m ∷ MarkTerm, clauses ∷ Array MRow }
         | Installation { frame ∷ MarkTerm }
         | Deferred { row ∷ MRow }
         | Opened { mark ∷ MarkTerm }  -- handler opening at a use
         | Copy { marks ∷ Array MarkTerm }  -- consumption copies
```

Every flexible mark position FX008 creates has exactly one place in the
package (§3), and the package's domain equals the recorded positions
exactly: nothing missing, nothing extra (N10).

**The stripped projection.** `strip : Package → Witness` replaces every
mark by `Unmarked`, every `clauses` by `Nothing`, drops `sites`, and
maps `InlineRow` to its stripped row; it is Check/Strip.purs's rule
applied to the package. `build` reads `strip P` and nothing else;
trusted code computes it (§7).

## 3. Rigid and flexible marks, and where each lives (FX008 §3.3-3.4)

| FX008 source | Rigid or flexible | Package position |
|---|---|---|
| `nofail(k)` in the declaration's own signature | rigid (declared) | none: recorded in the problem as a declared mark variable |
| written `nofail` / plain label in a signature | fixed (N or M) | none: recorded with the written type |
| a callee's `nofail(k)` at a declaration use (one fresh meta per k, shared across its signature) | flexible | the instance's images: the label occurrences that carry it, which must agree (one term per callee k, checked by I3) |
| unmarked label in a local annotation | flexible | the annotation's image occurrences |
| handler literal's own-abort mark m | flexible | `HandlerLit.m` |
| each clause's own row c | flexible marks | `HandlerLit.clauses` |
| an installation's frame mark f | flexible | `Installation.frame` |
| consumption copies of ρ's remaining prefix | flexible | `Copy.marks`, keyed by the consumption site |
| target extension label t | flexible | the extended row's image occurrence |
| opening of a handler type at a use (M handled label in a parameter, N in the result) | flexible | `Opened.mark` |
| labels R ≡ ρ adds by extension | flexible, dead (never compared) | none: R's marks are dead (FX008 §3.4) |

## 4. Obligations, rule by rule (recorded in the problem)

Obligations are generated with the atoms and stored in
`RecordedProblem` (Domain.Recorded.Internal), so `elaborate`'s problem
identity, which compares the whole `Fields`, covers them (R026's
coupling; review 2 confirmed `fields` is the whole record). Each row
gives the source rule, the obligation, the package facts it reads and
today's refusal when it fails.

| # | Source rule | Obligation | Reads | Today's refusal |
|---|---|---|---|---|
| E1 | type equation (K2): every `Equal` atom | sides equal at full types, rows up to scoped-label order, marks equal, except handler inference rows (R ≡ ρ, R ≡ R ignore marks) | images, instances | TypeMismatch, InfiniteType via rows |
| E2 | consumption of a stage row s into ρ (FX001; FX008 D7) at call, perform, apply, pipe, stage, callback | labels matched by first occurrence per key; payloads equal; unmatched labels of s are in ρ or extend its tail; each matched pair ρmark ⊑ smark; copies c with ρmark ⊑ c; an extension t with t ⊑ smark | rows, `Copy` sites | EffectNotAllowed, MustBePure, CallbackRowLacks, RowEquality (shared tail), LabelMismatch, InfiniteType (`RowOccurs`) |
| E3 | opening at declaration use (handler types only) | the opened mark is fresh; nothing else | `Opened` | none |
| E4 | handler literal `handler L { … }` | each c consumed into C with marks (C ⊑ c, "requirement marks") and into R ignoring marks; a `Fail` label or rigid tail in any c gives M ⊑ m | `HandlerLit` | via E2's refusals; HandlerMayFail through E5 |
| E5 | installation `with h { body }` | R ≡ ρ ignoring marks; C restricted into ρ: ρ's matched mark ⊑ C's; m ⊑ f; each C label's matched ρ mark ⊑ f; a rigid C tail ϱ gives M ⊑ f and ρ ends in ϱ; the body's row is f L + ρ | `HandlerLit`, `Installation`, rows | HandlerMayFail, the missing-capability error, ExpectedHandler (head not a handler) |
| E6 | `defer e` | no `Fail` label and no rigid tail in d (absence); each non-`Fail` label's mark ⊑ N | `Deferred` | DeferMayFail, DeferMayPerform, DeferHandlerMayFail, DeferHandlerVariable |
| E7 | a call's `nofail` assumption | the frame's mark ⊑ the assumption (an instance of E2) | rows | ExpectedNofail |
| E8 | entry | `main`'s row within Console | `main`'s tail binding | UnhandledEffect |
| E9 | Fail payloads | each payload's head is concrete after settling (type-sorted) | images | FailNeedsConcrete (Failure.purs:102) |
| E10 | restricted rows settled (FX008 §3.5 steps 1-4) | every restricted row (clause rows into R and C, installed C into ρ, deferred rows into their row) is contained in its target in the package's final rows; per key, counts are consistent (the side-condition) | final rows | RowEquality (`both end in`) |
| E11 | the declaration's written row | the body's row, under the package, within the declared row | rows | EffectNotAllowed, MustBePure |
| E12 | marks (FX008 §3.5 step 5) | every ⊑ edge E2-E7 generate holds for every valuation of the declaration's rigid mark variables (§5) | mark terms | the step-5 refusals above |

Resolve-time refusals (FailNeedsConcrete at Resolve/Row.purs:82,
NofailOnFail, MarkVariableOutsideSignature, HandlerMissing) are not
obligations: they precede generation.

**Completeness (I10; corrected by the author, §18.78).** Two separate
claims:
- *Coverage of generated obligations:* generation records every effect
  and mark requirement of the claimed fragment. This is established by
  a **rule-by-rule argument**: for every checker rule of today that can
  refuse an effect or a mark (each raise site of the audit table, every
  constraint FX008 §3.4-3.5 generates, the row-unification refusals of
  E1 and E2), the row of E1-E12 that records it, or an explicit
  exclusion with its reason (§9). Fixtures and mutants test that
  mapping; they do not establish it, since a rule absent from the
  inventory can be absent from its tests too.
- *Correct checking of supplied obligations:* `validateEffects`
  accepts only packages that satisfy the obligations it is given (S3).
  A perfect validator still accepts vacuously if generation omits a
  requirement, so this claim never substitutes for the first.

Tests of the mapping: one forged-package fixture per refusal kind that
the validator refuses, and a mutation dropping each generator rule
E1-E12 that flips at least one fixture, against today's checker on
FX008's probes, the regression-fx008 rows, test/fx-gen-failing.mjs and
the audit fixtures (N7). The rule-by-rule argument is unwritten (U6).

## 5. Mark checking and the universal quantification (derived)

**The check.** On normal forms (§2), for an edge x ⊑ y define
`holds(x, y)`: `x = N` or `y = M` or (`x = J S`, `y = J T`, `S ⊆ T`).
`validateEffects` requires `holds (norm x) (norm y)` on every edge E2-E7
generate, read on the package's terms; equalities (E1) require
`norm x = norm y`. Without normalization `holds (J ∅) N` would be
false although `J ∅ ⊑ N` is true: the author checked all 36 term pairs
over two rigid marks against all four valuations and found that one
mismatch, a representation gap fixed by `norm`, not a counterexample to
the join-set approach.

**It preserves the quantification (derived).** Over the two-point
lattice N ⊑ M, a valuation v maps each rigid k to N or M, and
`J S` (S non-empty, after `norm`) denotes the join of v(S). Then
`J S ⊑ J T` holds for every v exactly when S ⊆ T: if some k ∈ S \ T,
the valuation with v(k) = M and every other variable N breaks it; if S ⊆ T it holds pointwise. M on the
left holds only against M; N on the left always holds. So `holds` is
true exactly when the edge holds for every rigid valuation. The
author's example: an obligation `J {k} ⊑ N` is `{k} ⊆ ∅`, false, so it
is refused, though it holds at k = N.

**Relation to FX008's path criterion (derived; the criterion stays the
reference).** FX008 accepts exactly when no path in the edge graph runs
from atom a to atom b with a ≠ b, a ≠ N, b ≠ M (forbidden: M→N, M→k,
k→N, k→k′). Claim: a package passing `holds` on every edge exists
exactly when FX008 accepts the same graph.
- If a package passes, every edge holds for every valuation, so for
  each valuation the metas have a solution; FX008's criterion is
  satisfiability for every valuation, so it accepts.
- If FX008 accepts, let each meta x take the least term: M if M reaches
  x, otherwise `J` of the rigid atoms reaching x (N if none). A
  meta-to-meta edge holds because reachability is transitive. An edge
  into atom N, M or k holds because the corresponding forbidden paths
  are absent. So this assignment passes.

This is the standard least solution of atomic inequalities over a
distributive lattice (the free join-semilattice on the rigid variables,
with top M), cited as a foundation only: Rehof and Mogensen, "Tractable
Constraints in Finite Semilattices", SCP 1999. The correspondence above
is derived here, not cited, and is unproved. Checks before it is relied
on: a bounded oracle that enumerates small graphs and every valuation
and compares `holds`-satisfiability with the path criterion; and a
corpus differential: today's mark graph's verdict (MarkReport) against
the validator's verdict on the read-back's least package.

**Two different "solutions".** The least term assignment above is what
an honest online read-back supplies as evidence and what the argument
uses. FX008's step 6, closing every remaining meta to M, is for display
and erasure only; it is never evidence, and the package does not
contain its result.

## 6. Holes

Every hole occurrence in the package, at a type position, a record
tail, an effect tail, a label argument or nested in any of them, has one
sort, and one hole number has one sort across the package (I3). Its
default is lowering's: a type hole Int, a record tail none, an effect
tail none (the closed empty row). Settling replaces each hole by its
default; G0 judges `erase` of the settled type and record bindings (the
hole contract judges those, as today, through `erase`); every
obligation E1-E12 is judged on the settled package, so a hole in a
label argument or an effect tail is judged at its default (N3). This
extends r0-certify-argument.md C1-C2 from type and record holes to
effect rows and label arguments (§11, U4).

## 7. The pipeline, end to end

1. **Source rule.** A construct of the body (call, perform, handler,
   `with`, `defer`, annotation, entry).
2. **Recorded obligation.** Generation records its atoms (type-sorted,
   row-free, unchanged) and its effect obligations E1-E12 with their
   site keys, the declared rigid mark variables, the declaration
   arities and the effect rigids, all in `Fields` (a labelled amendment
   of the recorded problem's shape; N9). Generation threads an ambient
   row through its context: the declared row, a lambda's
   `⟨p, effect⟩`, `f L + ρ` in a `with` body, the clause row in a
   clause, `d` in a deferred expression (N5).
3. **Candidate evidence.** The search proposes one package. The online
   read-back builds it from today's checked declaration and mark
   graph: images and rows unstripped, the least mark terms of §5,
   clause rows, frame marks, copies (N12).
4. **Trusted check (`certify`).** In order, each failure a
   `CheckRefusal`:
   (a) well-formedness (I3): variable restrictions, arities, one sort
   per hole, binding constructor matching sort, callee mark variables
   consistent, the package's domain equal to the recorded positions,
   mark terms over declared rigid mark variables only;
   (b) settle holes; G0 on `erase` of the type and record bindings;
   (c) `validateEffects`: E1-E12 on the settled package.
   An obligation kind the validator does not support gives
   `EffectsUnchecked kinds` (§9).
5. **Outcome routing** (N2). A refusal in (a)-(c) is a `CheckRefusal`:
   the attempt is `CheckFailed` and later strategies run; it is not
   evidence that the source is invalid. `EffectsUnchecked` is a
   refusal whose Unresolved reason is `EffectsUnchecked`
   (r0-erased-rows §7.1 item 3), never Solved. Acceptance mints
   `Certified Valid (Witnessed (strip P))`: `Witnessed` therefore
   implies that effects were checked; there is no separate standing.
6. **Stripped output.** `elaborate` checks problem identity (covering
   the obligations), seal and Cov, then `build (strip P)`. The marks,
   clause rows and sites end at `strip`.

## 8. Obligations, kept apart

**Soundness** (what a compilable result guarantees):
- S1. G0 is sound on `erase` (P-G0, Pending).
- S2. Settling, `erase` and `strip` agree with lowering's defaults and
  Strip (certify argument C1-C2, extended; Pending).
- S3. `validateEffects` accepts only packages on which every recorded
  obligation holds for every rigid mark valuation (§5's `holds`; the
  checker is direct, its correctness reviewable by reading).
- S4. The obligations are complete for today's effect and mark checks
  (I10).
- S5. Coupling: obligations in the problem, one package, the checked
  stripped projection is what `build` reads.

**Acceptance preservation** (that today's accepted programs stay
accepted when R0 is live):
- A1. For every declaration today accepts and the online search
  solves, the read-back produces a package that passes (a)-(c).
- A2. The solved-form restriction rejects no such package (shown on the
  corpus, or a demonstrated counterexample comes back with a sourced
  extension, ruling 2).
- A3. §5's correspondence with the path criterion (derived; oracle
  and differential until justified).
- A4. RT8 and window moves explained and reviewed, old pins kept as a
  cohort (Q6).

## 9. Unsupported, stated

- **FX032** (decided, §18.78): an operation's own `with` row, which
  today's checker parses, mark-checks and then drops
  (Resolve/Effect.purs:47-58 builds `OperationInfo` without it), is
  recorded as **unsupported in shadow**: a declaration that performs
  such an operation gets `EffectsUnchecked` in R0's shadow verdict,
  rather than reproducing the silent omission. Live acceptance does not
  change in this tranche; rejecting or implementing operation-level
  `with` is a separate compatibility change. For the marker to survive
  resolution, `OperationInfo` gains a field recording that the
  operation was written with a `with` row (the row itself, or a flag),
  which generation reads to record an `Unsupported OperationWith`
  obligation; today's live checker does not read the field, so its
  behaviour is unchanged.
- **Constructs behind `Outside` markers** (handler types, `defer`, Fail
  families) still block G0's Solved today; their obligations (E4-E6,
  E9) are specified so the contract holds when the markers go.
- **Mark variables in `type` and `effect` declarations** are not part of
  the language (FX008 L6); none are recorded.

## 10. Interfaces (proposed)

```text
-- Domain.Recorded (Fields amendment)
Fields += { obligations  ∷ Array Obligation   -- E1-E12, with site keys
          , rigidMarks   ∷ Set RigidMark      -- declared nofail(k)
          , arities      ∷ Map TypeId { types ∷ Int, rows ∷ Int }
          , effectRigids ∷ Set VarId }
VarSort += SortEffectRow                    -- no SortMark
Role, CheckedName += effect-row slot forms  -- distinct from Slot p i

-- Domain.Verdict.Witness
MarkTerm = N | M | J (Set RigidMark)
MBinding = Inline MTy | InlineRow MRow | Free Int
Package  = { bindings ∷ Map Var MBinding, sites ∷ Map SiteKey SiteFact }

-- Features.Check.Strategy.Substitution (trusted)
certify ∷ RecordedProblem → Package → Either CheckRefusal Certified
strip   ∷ Package → Witness
erase   ∷ MTy → RTExpr                     -- sort-aware, R022

-- Features.Check.Strategy.Effects (new, trusted)
validateEffects ∷ RecordedProblem → Package → Either CheckRefusal Unit

-- Domain.Verdict.Search
CheckRefusal += Malformed Reason | ObligationFailed Obligation
             |  EffectsUnchecked (Array ObligationKind)
```

Change surface (N11): Strategy.purs `checked` (unchanged shape:
`Certified` still carries `Valid` and `Compilation`); Decide.Reason
(maps `EffectsUnchecked` to its Unresolved reason); Witness.purs
`bindingsOf`, `sameSort`, `bareHole`; HoleContract.purs `image`;
Candidate.purs `generic`; the read-back; Generate's context and every
row-writing site (§3, review 2's N6 list: `⟨p, apply⟩`, a lambda's inner
stage rows, partial-application stages, plus review 1's I6 list); the
certify argument and `certifySound`'s statement.

## 11. Unresolved claims (for the next review)

- U1. §5's correspondence with FX008's path criterion (derived; oracle
  and corpus differential named).
- U2. A1, the read-back's honest package for every accepted
  declaration, including least mark terms from today's mark graph.
- U3. A2, sufficiency of the solved-form restriction on the corpus.
- U4. Extension of certify-argument C1-C2 to effect rows, marks and
  label-argument holes.
- U5. E10: checking containment of the final restricted rows equals
  FX008's settling loop's acceptance ("accepts exactly when the
  containments and equalities have a finite solution", FX008 §3.5
  property 4), taken from FX008's stated property, not re-argued.
- U6. I10's rule-by-rule coverage argument (unwritten), tested by the
  named fixtures and mutants.
- Novel, for approval (ADR 014): the I3 well-formedness check; the ∅
  default for effect-row holes; consumption-based inclusion is FX001's
  and FX008's design (project precedent, no published source); the
  mark-term evidence and §5's correspondence.

O1 (FX032) decided, §18.78.

## 12. Separating examples

Programs are proposed, not run; refusal predictions are plausible.

| Claim | Fixture | Fails under |
|---|---|---|
| R026 | forged `id2`, full images | erase-only check of separate images |
| E1 (K2) | `effect Log { fn log(n: Int): Unit; }; fn f(h: Unit -> Unit with Log): Unit with pure = { let k = h; k(()) }`, the Apply row forged to `pure` | judging erased atoms only |
| E1 marks | test/fixtures/r0/audit/expected-nofail.inferred.json with honest bindings and every flexible mark chosen freely: refused; control .selected.json accepted | marks only at named variables |
| E4, E5 | handler-may-fail.inferred.json refused; its clause row forged to `pure`: refused by C ⊑ c | clause rows outside the package |
| routing | two strategies on `fn run(f: Unit -> Unit with pure): Unit = f(()); fn g(): Unit = { let k = fn(u: Unit) => (); run(k) }`, the first forging the lambda's row to `Console`, the second honest: the second is used | a standing inside an accepted `Certified` |
| E2 payloads | `effect State(s) { fn get(): s; fn put(value: s): Unit; }; fn g(h: Unit -> Unit with State(Int)): Unit with State(Bool) = h(());` refused (LabelMismatch) | inclusion by key only |
| E1 order | `fn f(h: Unit -> Unit with State(Int) + State(Bool)): Unit -> Unit with State(Bool) + State(Int) = h;` refused | multiset row equality |
| E2 Fail | `Fail(Error(Int))` against `Fail(Error(Bool))` refused | comparing keys only |
| holes in labels | `fn id(x: a): a = x; fn g(h: Unit -> Unit with State(Bool)): Unit with State(Bool) = { let k = id(h); k(()) }`, `id`'s instance forged to `State(_h)`: refused at the default | holes unjudged in label arguments |
| nested tail | the same with `h: … with Log` and the image `Unit -> Unit with ...h4`: refused (∅ ≠ Log) | effect tails nested in images unjudged |
| hole identity | `fn g(): Unit = { let k = fn(u: Unit) => (); k(()) }`, the lambda row `Free 3`, the Apply row `Free 4`: both default to ∅, so accepted (pinned) | comparing holes syntactically |
| no Cov for marks | `let k = fn(h: Unit -> Unit with Log) => h(())` (a local-annotation mark): not `Uncovered` | marks as problem variables |
| domain exact | an extra mark for a nonexistent site; a missing frame mark: both `Malformed` | an open evidence domain |
| sites | an inner stage row of a two-parameter lambda; an Apply and a Pipe arrow; a partial call: one fixture each | review 1's site list alone |
| rigid marks (§5) | `fn h(g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log = { let r = fn(u: Unit) => g(u); r(()) }` with the lambda's flexible label mark forged to N: refused, since the edge `J {k} ⊑ N` is `{k} ⊆ ∅`, false, though it holds at k = N | checking one ground valuation |
| rigid marks, stronger | the same program with the lambda's mark `J {k}` (the least term): accepted; and `fn h(g: Unit -> Unit with nofail Log): Unit with nofail(k) Log = g(())`, a written edge `J {k} ⊑ N`, refused as FX008 refuses it (path k → N) | refusing every rigid-dependent package; accepting a contract valid only at k = N |
| normalization | the same edge with the context's mark spelled `J ∅` and spelled N: identical verdicts, and `J ∅ ⊑ N` holds | comparing un-normalized terms |
| FX032 | `effect Op { fn op(): Int with Log; }; fn g(): Int with Op = Op.op(); fn main(): Int = 0;`: R0 shadow verdict `EffectsUnchecked`, today's live outcome unchanged | dropping the `with` row at resolution |
| R031 | both pins flip to today's form | — |

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
