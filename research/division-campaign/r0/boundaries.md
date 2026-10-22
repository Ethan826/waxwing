# Validity, policy, admissibility and support: four boundaries

Stream T-R0e of the design tranche authorized in dossier §18.66
(2026-10-21). Base: 67ba706; revised after the reviews of 88c052d (the
interface reconciliation and the adversarial soundness review; see the
revision log at the end). **Documents only:** no compiler change, no
prototype, no proof. Basis: research/division-campaign/remedy/
requirements.md, revision 2 (accepted as the planning basis, §18.66;
cited below as "requirements"). Binding decisions (§18.66): 1
(generate-then-decide), 2 (R019: single-tail baseline), 3 (a
finite-reachable-key theorem per component), 5 (ground re-check as an
internal consistency check), 6 (G3: a restricted C8 argument and a
selection contract, no rule chosen), 9 (a distinct Unresolved code
with structured reasons).

Labels: **cited** (file:line or section), **checked** (a recorded run or
a proved theorem, cited), **argued** (reasoning here, unchecked),
**proposed** (a design choice for the author). Names of types and
constructors below are illustrative; wording, codes' spellings and
fixture migration belong to the implementation plan (decision 9).
**Pending author Q<n>** marks a proposed default that waits for one of
the author's questions Q1-Q10 of the reconciliation review; this
document does not decide those.

**What this document owns, and what it cites.** It is canonical for
the layers V, P, A, S, their order and the error code each layer's
refusals are rendered with. It cites, and does not redefine:

- witness/statements.md ("W") for `Adm_W` (§2.3), the
  finite-reachable-key statements FK-0, FK-W, FK-U (§2.4, §2.7), the
  re-check obligations RC1-RC6 (§3), `Compilation` and its
  `NoWitnessReason` (§1.6), and `Lowerable` (§5.1);
- r0/generation-interface.md ("T-R0a") for the outcome and verdict
  types (`DeclOutcome`, `Verdict`, `UnresolvedReason`, the admission
  types, `DeclReport`), the pipeline and the migration order (§10);
- r0/recorder-rules.md ("T-R0b") for the problem's shape
  (`RecordedProblem`, §10), the `adm` and `split` sites, `outside`
  markers (`OutsideKind`) and canonical variable names.

The layer classification of §3 is **derived** from T-R0a's types
(`layerOf`), not a second outcome type. Refusal evidence is T-R0c's
(r0/refusal-audit.md); refutation statements are CX's
(refute/statements.md).

**Naming** (reconciliation I2). The letters V, P, A, S, the kinds S1
and S2, V1 and V2, and the invariants I1-I4 are local to this
document. They are not W's term-scope rules S1-S3 (now Sc1-Sc3), W's
P1/P2, T-R0c's statements P1-P3, T-R0a's assumptions As1-As8, or
requirements §11 item 11's slicing S1/S2. G1-G3 here are the dossier's
gaps (§18.66 decisions 6-8), not T-R0b's declaration rules (now
Sig1-Sig10). W1-W3 are the `walk` findings (§5), not the witness
document, which is cited as "W" or by path.

## 0. Summary

- **Four boundaries, applied in a fixed order** (proposed, §1): **V**,
  the verdict on the complete recorded problem (row validity, V1, and
  acceptance requirements, V2, both semantic); **P**, admission policy
  (decision 3, with G3's contract as a later, optional route); **A**,
  admissibility (`Adm_W` on the single-tail baseline); **S**, support
  (S1 unsupported constructs, S2 resource limits). Static rules
  (classes a and b′, requirements §2.3) are judged beside generation,
  which still records the problem (T-R0b §1, §10).
- **One invariant governs all four** (proposed, §1.6): the recorded
  problem is fixed by generation; P's and A's judgements of its `split`
  and `adm` sites live beside it; none of P, A, S adds, drops or
  rewrites an atom, and none of their refusals changes V's verdict or
  is worded as one.
- **Decision 3 is an admission step, not an inference failure** (§2).
  Today one diagnostic, D4 "Cannot tell", covers both. D4 is the
  online search stopping, so under the layering it is a **verdict**
  outcome: Unresolved (Inference `NoCandidate`), with D4 as a hint.
  Only once some strategy Solves does P judge the split by evidence:
  forced (admitted), unforced with two exhibited witnesses
  (NotAdmitted), or undecided (`ForcednessUndecided`).
- **Verdict-stage Unresolved gets its own code** with T-R0a's three
  reason families, inference, unsupported and limit (§3). A Solved
  declaration refused by P, A, S or the re-check keeps its Solved
  verdict; its refusal is tagged by layer, and which code renders it
  is pending author Q1. Contradiction, admission and admissibility keep
  separate codes; internal defects stay a separate outcome (pending
  Q1).
- **Non-empty `outside` blocks a whole-function Solved** (§1.5) until a
  slice theorem exists (pending author Q3).
- **The ground re-check runs after lowering computes a key's layouts
  and callee keys, before Go emission** (§4); its content is W §3; its
  failure is Internal or an unsupported path, never V.
- **W1, W2, W3 land in three different layers** (§5): V/P, A, S1.
  Fixing any one leaves `walk` refused or unjustified by the other
  two.
- **Migration** (§6): T-R0a §10 steps 1-6 first; then this document's
  layer-specific steps, each behind its own decision.

## 1. The layers and their order

### 1.1 The order (proposed)

```
generate (T-R0b, total) ─► ⟨D, B, Q, BQ, outside, adm, split⟩
  static rules (a, b′) judged beside generation, problem kept
                    │
                    ▼
                  V: verdict on the complete problem
                    │ Solved (some witness set W)
                    ▼
                  P: admission — forced │ written │ G3 contract
                    │ one admitted witness w
                    ▼
                  A: admissibility of w (Adm_W, single-tail baseline)
                    ▼
                  S: support — lowering constructs (S1),
                     key and depth limits (S2); lowering computes
                     each key's layouts and callee keys
                    ▼
                  ground re-check at each key (§4)
                    ▼
                  Go emission
```

Why this order (argued):

1. V first, because decision 1 makes the complete problem the input of
   every later judgement, and because P's "forced" is a property of V's
   solution set (§2.1). P needs V's Solved; V needs nothing from P. A
   declaration that is not Solved reaches no later layer.
2. P before A, because admissibility judges the **form of one
   witness** (recorder-spec §2.4, cited; W §2.3) and P is what names
   that witness. Under decision 3 without G3, P's output is the forced
   or written witness; A then judges it. P never consults A to decide
   forcedness (§18.62 item 1). G3's contract, if adopted, consults A as
   a constraint on its choice (§2.4), which is a use of A, not a
   merger with it.
3. S after A, because lowering support and the key limit concern the
   specialized program, which exists only once a witness is admitted
   and admissible. The `outside` markers are recorded at generation
   (T-R0b §10) and applied at V (§1.5). A second spread is in-model
   (T-R0b E25); S1 reads the spread count from T-R0b's `vars` entries
   with role `spread j` (T-R0b §3.3), if the author classifies it S1
   (pending author Q4).
4. The re-check last, because it validates lowering's output (the
   keys' layouts and callee keys) against the problem (W §3.1-3.2,
   cited); it is downstream of every choice it re-examines, and it
   precedes Go emission.

Order of **reporting** (proposed): a declaration reports the first
layer, in the order above, that does not pass. One exception: a
Contradiction is reported even when the problem has `outside` markers,
because a c1 rule or CX on recorded atoms refutes a subset of the
obligations, and adding obligations cannot restore satisfiability
(argued; conditional on recorder correctness, requirements §4.3 R; the
same rule as T-R0a §5.3 rule 1). A later layer is not evaluated when
it needs an output an earlier layer did not produce; the diagnostic
does not speculate about it.

### 1.2 V1: semantic validity

| | |
|---|---|
| Decides | a checking strategy over the complete problem `⟨D, B⟩` with its ∀rigid/∃flexible structure (requirements §2.4) |
| Evidence for Solved | a strategy's acceptance plus its `Sound_F` (acceptance ⇒ `ValidOpen`); today the cell format has it (`cellOpenImpl`, checked, requirements §4.4) |
| Evidence for Contradiction | c1, a rule proved sound for `ValidOpen` applied to original recorded atoms and `D`; or c2, a checked counter-instance (CX, refute/statements.md) |
| Refusal | Contradiction (a type error proper; today's E_TYPE contradiction texts, once each rests on c1 or c2) |
| Otherwise | Unresolved with a reason from T-R0a §3.5 (Inference, Unsupported or Limit); a solver refusal is a hint, never a reason (T-R0a §4.2); no claim about the number of solutions (docs/engineering.md:556-565, cited) |
| Must not | treat failure of the current solver, or a contradiction reached through bindings the online solver chose, as Contradiction (requirements §2.4 "Three grounds", cited; §18.65) |

`divide5`, refused by every cell certificate, is Unresolved
(requirements §4.4, cited), never invalid (§18.60).

### 1.3 V2: acceptance requirements

Printability and comparability are **typing obligations**, recorded as
requirement atoms `pr τ`, `cmp τ` in `BQ` (caller origin, generated by
rule, T-R0b §1) and `Q` (callee contract), reaching callers through
instantiation (recorder-spec §1.2, §9 M1-M4, cited; §18.24 item 2,
cited).

| | |
|---|---|
| Decides | the same verdict as V1, over `⟨D, B, BQ⟩` jointly: V1 and V2 are one layer, the complete typing obligations, split here only to say what each needs |
| Evidence | for Solved, `ValidOpenR` and a strategy sound for it; **unstated today** (requirements §11 item 2, cited) |
| Refusal | Contradiction only with c1 or c2 evidence on the requirement atoms |
| Until `ValidOpenR` is stated (proposed common wording, pending author Q2) | `BQ` atoms over ground types are judged by a stated ground rule (a function type is not printable or comparable: a definition, not `ValidOpenR`); `BQ` atoms that mention a flexible or rigid variable make the problem Unsupported (`RequirementAtoms`) for every strategy whose `Sound_F` does not cover them |
| Must not | be judged on an unforced settled type (class d, requirements §2.3, cited), or be dropped because a strategy cannot read it |

The common wording replaces this document's earlier trigger ("a `BQ`
that mentions a split part"; "an atom no split reaches is judged as
today"), which let a ground refusal rest on no stated rule. The same
wording is proposed for T-R0a §3.5, T-R0b's preamble and §10, and W's
RC3 (reconciliation E2); the trigger is the author's (Q2).

V2 belongs to V, not to P: a split that satisfies the row equations but
not a requirement is **not a solution** (§18.62 item 1). This is what
lets "forced" (§2) include requirements without P re-deciding them.

### 1.4 A: admissibility

| | |
|---|---|
| Decides | `Adm_W` (W §2.3), judged on the admitted witness's `Open` classification and on each name's term form (CS), at each intra-component `adm` site; this document does not restate the rule. Type slots may carry rigid row tails (`{ b: Int, ...r }`), as today (ADR 007:99-104; W §2.5 example 2, cited) |
| Justification | FK-0 for the baseline rows; FK-W for the name rows, if adopted (W §2.4; W Q3, reconciliation Q5); FK-U for pure unions of rigid tails, only if adopted (W §2.7; W Q7). ADR 007 "The instantiation rule" (cited) for today's code |
| Evidence for a refusal | the witness form at the reference and the slot that fails |
| Refusal | T-R0a's `AtA (Inadmissible site i)`, `i` the slot that fails (T-R0a §6): today E_SPECIALIZATION `Recursive call to f changes its type arguments` (Instantiation.purs:70, cited); unchanged code |
| Must not | enter `B`, change validity (§18.22 item 3, cited), or decide forcedness (§18.62 item 1) |

**Decision 2 applied** (proposed). A's result for a slot is
three-valued, W's `AdmStatus` (W §2.3); it is the admissibility result
W's `Lowerable` reads (adversarial review, finding 3). T-R0a records
the two admitted values as its `AdmittedStatus` in `Admitted.status`
and the third as `AtA (Inadmissible site i)` (T-R0a §6):

- `Admissible`: admitted by an active row of `Adm_W` (FK-0's; FK-W's
  and FK-U's once adopted);
- `Inadmissible`: refused by today's code (refused, as today), or
  mentioning a name and matching no active row (W §2.3);
- `AdmittedPendingR019` (W §2.3's wording): matches no active row of
  `Adm_W` (FK-W/FK-U rows active once adopted), name-free, admitted by
  today's `bareRow` (NestedArguments.purs:78-81, cited). This covers a
  field-free union of rigid tails (`{ ...u, ...v }`, until FK-U's row
  is adopted) and a mixed rigid-and-hole union (`{ ...r, ...h }`,
  which no row admits).

A union of holes only (`{ ...h1, ...h2 }`) has no rigid variable and
no name, so it is `Admissible` under FK-0 (W §2.3 record row 2).

`AdmittedPendingR019` compiles exactly as today, so no accepted program
is rejected, but it is recorded as such and **may not be used as a
premise**: no uniqueness claim ("only admissible split"), no G3 choice,
no termination argument rests on it. **It must not reach
specialization once Task 8 lands, unless FK-U is adopted and proved**
(adversarial review, finding 3): a component holding such a slot then
has no finite-reachable-key theorem (decision 3). Until then, such a
slot cannot be lowered anyway: `recordType` stops at the several-tail
placeholder for any row with more than one tail, holes included
(Specialize/Record.purs:38-40, cited), so the restriction refuses no
program that compiles today (argued; that every several-tail slot of a
key reaches `recordType` is unchecked). After Task 8, the proposed
outcome is an S refusal, `AtS (NotLowerable ComposedTailsUnjustified
site)` (§3.1), `site` the `adm` call site, pending author Q5; W uses the
same constructor (reconciliation C2; consistency re-check R10).

Pure unions of caller row variables as an extension are
**investigation** (R019, §18.66 decision 2), with their own termination
argument (FK-U); when R019 is decided, every `AdmittedPendingR019`
becomes one of the other two by that decision, not by default. Whether
the status should be user-visible is the author's (Q5).

### 1.5 S: support boundaries and resource limits

S says nothing about the program's meaning. Two kinds, kept apart in
the reason ADT (§3), never merged with V:

**S1, unsupported constructs** (proposed classification; cited
sources):

| Construct | Where today | Today | Model |
|---|---|---|---|
| several-tail lowering (Task 8; recorder-spec H7) | Specialize/Record.purs:38-44 | E_INTERNAL "R005B placeholder: rows with several tails are lowered in Task 8" | valid problems exist (W3) |
| removal and rest binders over several tails (Task 7; B9) | Check/SeveralTails.purs:19-27 | E_INTERNAL "R005B placeholder: … typed in Task 7" | in-model if T-R0b §11 item 1 is accepted; then the placeholder is a hint and the reason is `Unsupported (GuardOutsideFragment …)` while no strategy's guard covers several tails |
| other check-time placeholders | EndReport.purs:39, Require.purs:105, Record.purs:160 | E_INTERNAL "R005B placeholder: …" | — |
| a second spread in a literal (B3) | Resolve/Record.purs:73-80 | E_TYPE "A record literal accepts at most one spread" | in-model (T-R0b E25; `join_validFin` and others, recorder-spec §4 B3, cited); S1 reads T-R0b's `vars` entries with role `spread j` (T-R0b §3.3), pending author Q4 |
| constructs outside the model (O1-O8) | recorder-spec §3.7 | each construct's own rules | `outside` markers (T-R0b `OutsideKind`) |
| a hole the hole contract does not cover, at lowering (H4) | Specialize/Values.purs:96-98 | defaulted silently | W §1.5: `NoWitness (HoleContract …)`; T-R0a's `AtS (NoCompilation …)` |
| a Solved verdict without a compilation witness | — | — | W §1.6: `NoWitness (NonConstructive …)`, `NoWitness (AdapterUnsupported FieldReference)`; T-R0a's `AtS (NoCompilation …)` |
| requirement atoms mentioning a variable | — | judged on a settled type | `ValidOpenR` unstated (§1.3) |

Evidence: the construct and its site, and the named boundary (task or
model gap). The refusal claims only that the compiler does not handle
the construct.

**The outside markers block a whole-function Solved** (proposed,
pending author Q3). Generation drops real equations behind some markers
(T-R0b E17: no equation through an effect argument; E21: none through
a handler), so a Solved over the recorded slice could hide a dropped
obligation (adversarial review, finding 5). Until a slice theorem
exists (requirements §11 item 11: slicing must quantify over the
original problem), this document adopts T-R0a §5.3 rule 1 and T-R0b
§10: **a non-empty `outside` gives no whole-function Solved**; the
verdict is Unresolved (Unsupported (Outside kind)). Rules and refuters
still run, so a Contradiction among recorded atoms is still reported
(§1.1). The earlier proposal here, that a marker blocks Solved only
when acceptance depends on a fact the slice cannot establish, becomes
the relaxation a slice theorem would license; which O-kinds it would
cover is the author's (Q3), with T-R0b and T-R0c.

The second spread is documented as a language rule (docs/language.md:
897-898, cited). The brief lists it as a support boundary, and the
model calls such programs valid; this document proposes classifying it
S1, with an explicit compatibility decision for the author (Q4). T-R0c
§6 item 4's "Unsupported" is a proposal under the same question.

**S2, resource limits**:

| Limit | Where | Today | Depends on the split? |
|---|---|---|---|
| inferred type depth 1,000 (H5) | Check/Unify.purs:105; Binding.purs:41 | E_NESTING (`TypeTooDeep`) | yes (F11, recorder-spec H5, cited) |
| specialization keys 10,000 (H6) | Specialize/Keys.purs:146-154 | E_SPECIALIZATION "More than 10000 specializations" | yes (E4) |
| re-examination step bound | UnifyFailure.purs:39-41 (`Exhausted`); EndReport.purs:42 | E_INTERNAL | argued unreachable (rules §5) |
| a strategy's search budget (future) | — | — | per strategy |

The inferred-depth limit and a strategy's budget arise at the verdict
(T-R0a §4.3) and give Unresolved (Limit); the key limit arises in S
after Solved and gives a compilation refusal (§3.1). Source nesting
(`NestingTooDeep`, at parse) is a static limit on the text, not on a
constraint problem; it stays in the static layer with its code
(proposed). The 10,000 limit is "a resource guard, never the
termination argument" (ADR 007 "The specialization limit", cited), and
decision 3 of §18.66 repeats that it does not substitute for the
theorem; S2 keeps it a limit.

### 1.6 The invariant: no layer redefines the problem (proposed)

- **I1, fixed problem:** the recorded problem (T-R0b §10) is a
  function of the resolved declaration (decision 1; T-R0b's criterion,
  requirements §2.4). It is the same whichever later layer refuses,
  and it exists for a statically refused declaration too (T-R0b §8,
  §10).
- **I2, judgements beside, never atoms:** the `adm` and `split` sites
  are inside the problem (T-R0b §10); P's and A's judgements of those
  sites live beside the problem (recorder-spec §2.4, cited); S records
  its refusals and counters beside it. None adds an atom to `B` or
  removes one.
- **I3, verdict monotone:** V's verdict is computed once; P, A, S and
  the re-check can only refuse compilation. None turns Unresolved into
  Solved, Solved into Contradiction, or a refusal of its own into a
  type error's text.
- **I4, text by layer:** a contradiction text only from Contradiction,
  an unresolved text only from verdict-stage Unresolved
  (docs/engineering.md:556-561, cited), extended: an admission text only
  from P, an admissibility text only from A, a support text only from
  S or the re-check's unsupported path.

Checks that would back these (proposed, per the claims-backed-by-checks
rule; for the implementation plan): for I1 and I2, a property over the
T-R0 fixtures that the recorded problem is equal when each refusing
layer is replaced by an injected permissive implementation (an
injected value, not a flag); for I3, each fixture's verdict class is
asserted separately from its compilation outcome; for I4, rendering is
a function of `layerOf` (§3.1), so a text cannot be produced from the
wrong constructor.

## 2. Decision 3 as admission

### 2.1 What "forced" means (§18.62 item 1; recorder-spec §2.4)

A split at a call is **forced** when every solution of the complete
typing obligations (`D`, `B`, `BQ` of both origins, caller annotations
recorded) assigns it the same value (cited: "forced" accounts for the
complete semantic typing obligations, including printability and
comparability). It is **written** when a caller-side annotation
actually determines it; an annotation that leaves the ambiguity
unresolved does not count (§18.24 item 1, cited). Written reduces to
forced on the problem with the annotation recorded (argued).

**"Only admissible split" is a different property** (§18.62 item 1,
cited): if several splits satisfy the typing obligations and one passes
`Adm_W`, that split is admissible-unique, not forced. P never computes
forcedness on the admissible subset. Under decision 3 without G3,
admissible-uniqueness admits nothing (argued from the policy text,
dossier §4).

### 2.2 The admission step (proposed)

P runs only on a Solved declaration, per `split` site.

| Outcome | Evidence required | Result |
|---|---|---|
| forced | a forcedness decision over the complete obligations (who decides it: requirements §11 item 5, open; reconciliation Q7) | admitted; the witness passes to A |
| written | the same, on the problem with the annotation | admitted |
| not forced, not written | **two valid witnesses differing on the split**, each accepted by a sound strategy (or by the decider) | NotAdmitted: "valid; split not determined", naming the part and the exhibited alternatives (dossier §4 policy, cited); T-R0a's `SplitUnforced` (reconciliation C4) |
| undecided | none | P refusal `ForcednessUndecided`; the verdict stays Solved; its code is pending author Q1 |
| G3 contract applies (future) | §2.4 | admitted with the contract's witness |

The evidence row for NotAdmitted follows the blame-needs-evidence rule:
a diagnostic naming alternatives exhibits them; "the checker could not
tell" is not evidence that two exist. Whether a proof of
non-forcedness without two exhibited witnesses suffices is the
author's (Q1(d)); the default is that both are shown.

**NotAdmitted is not Unresolved and not a contradiction** (proposed):
the program is valid and the obstacle is policy. It gets its own code
(name for the implementation plan). recorder-spec H2 rendered decision
3 as Unresolved; requirements §10 already marks that row for revision
to "a separate admission refusal" (cited).

### 2.3 Why D4 "Cannot tell" is not decision 3 (argued, from citations)

1. **Different evidence.** D4 is reported when the online solver ends a
   body with merges it did not decide (`ended … undecided`,
   EndReport.purs:30-35; Unresolved.purs:41-54). It holds no proof that
   the split is unforced and refuses forced splits too (O4, c21,
   cmp-open; recorder-spec §4 H2, cited; T-R0c §3.8, c21 checked).
2. **Incomplete premises.** D4 is decided by `waitingAtEnd` before the
   printability and comparability walks that produce today's
   requirement judgements (requirements §2.2, cited: Function.purs:89
   before :96-97). So it cannot count requirement atoms toward
   forcedness, which §18.62 item 1 requires.
3. **No verdict.** D4 is the online search stopping. It establishes no
   Solved verdict, so P cannot run on it (reconciliation D5).
4. **Different class.** D4 is class e (requirements §2.3, cited); an
   admission refusal is policy on a valid problem.

So, under the layering, today's D4 maps as follows (proposed). The
verdict is Unresolved (Inference `NoCandidate`, D4 as a hint, T-R0a
§4.2 and §10) unless some strategy Solves. If one does, P judges the
split: admitted if forced (today wrongly refused), NotAdmitted with two
witnesses, else `ForcednessUndecided`.

### 2.4 Where G3's selection contract would sit (decision 6)

**Position:** a third admission route inside P, after forced and
written, consulted only when both fail. No rule is chosen; this fixes
only the slot and its limits.

It may admit a witness only if (proposed, restating requirements §5.3
and §18.66 decision 6):

- the call lies in the fragment of the restricted C8 argument, where
  behaviour preservation is justified (the exact proved fragment of
  `eval_split` today, requirements §5.1, cited; not a whole-language
  theorem);
- the witness satisfies V1 and V2, and A's single-tail baseline
  (`Admissible`, never `AdmittedPendingR019`);
- it is a function of the recorded problem and the key only, chosen
  after inference, independent of certificate format and solver
  internals.

It must not:

- override a forced or written split, or apply where one exists;
- redefine validity (turn Unresolved into Solved), or treat
  admissible-uniqueness as forcedness;
- refuse because one particular witness is inadmissible: it returns a
  valid, admissible witness or reports that it found none
  (recorder-spec P5, cited);
- apply outside its fragment (B2, B3 in requirements §5.2, cited);
- relax R010 (relaxing it needs its own termination argument and
  approval, §18.22 item 3, cited).

Outside its fragment decision 3 stands and the outcome is NotAdmitted
or `ForcednessUndecided` as in §2.2. Inside, failure to find a witness
is the P refusal `NoAdmissibleWitnessFound`, not NotAdmitted; the
verdict stays Solved (code pending author Q1). T-R0a's `PolicyRefusal`
gains it only if this contract is adopted (T-R0a §6, "G3's refusal").

## 3. Codes and reasons by layer (decision 9)

### 3.1 The layer classification (proposed; illustrative names)

The outcome and verdict types are T-R0a's (§3.2-§3.5, §6-§7): the
verdict-stage reasons `UnresolvedReason`, `Unsupport`, `LimitAt` and
`LimitReached` (T-R0a §3.5), and the compilation refusals,
`CompileRefusal` with its layer tags `AtP`, `AtA`, `AtS`, and
`PolicyRefusal`, `AdmissibilityRefusal` and `SupportRefusal` (T-R0a
§6, canonical). This document adds only a total, derived
classification used for rendering and codes (reconciliation D1), the
`Construct` that T-R0a's `NotLowerable Construct Site` carries, and
the layer of each reason and refusal:

```
-- Derived from T-R0a's DeclReport; not a second outcome type.
layerOf ∷ DeclReport → Layered

data Layered
  = Static (NonEmptyArray StaticRefusal)       -- a, b′: codes unchanged
  | Compiled                                   -- Solved; every layer
                                               -- passed
  | Contradiction Evidence                     -- V (T-R0a §3.4)
  | Unresolved UnresolvedReason                -- V: no verdict; the
                                               -- Unresolved code
  | NotCompiled (NonEmptyArray CompileRefusal) -- Solved; refused by
                                               -- P, A or S (T-R0a §6)
  | Internal InternalFault                     -- E_INTERNAL (Q1(a))

-- Carried by T-R0a's AtS (NotLowerable Construct Site): S1 after
-- Solved. A missing compilation witness, including a hole the hole
-- contract does not cover, is T-R0a's AtS (NoCompilation r), with r
-- W §1.6's NoWitnessReason; it is not a Construct.
data Construct
  = SeveralTailLowering                -- Task 8 (W3)
  | ComposedTailsUnjustified           -- §1.4, after Task 8; the Site
                                       -- is the adm call site; Q5
  | UncheckedPath                      -- W §3.3's unsupported path
```

S1 constructs that stop a verdict are T-R0a's `Unsupport` values, not
`Construct`s, and give `Unresolved (Unsupported …)`: `Outside
OutsideKind` (T-R0b §10; §1.5), `RequirementAtoms` (§1.3, pending
author Q2), `GuardOutsideFragment StrategyName` (e.g. several tails),
`SeveralTailSubtraction` (Task 7, until T-R0b §11 item 1 is decided),
`SecondSpread` (B3, pending author Q4) and `ClassF Question` (a
refusal reading record metas, until settled; pending author Q3). Their
site is read from the recorded problem (the `outside` entry, the `BQ`
atom, the `spread j` variable) or is the whole declaration; a limit's
site is `LimitAt.site`. T-R0a's `LimitReached` list keeps these names
(reconciliation D4); `InferredTypeDepth`, `ReexaminationSteps`
(argued unreachable, Q1(b)) and `StrategyBudget` arise at the verdict
stage (`Limit`), `SpecializationKeys` in S2 (`AtS (AdmissionLimit …)`).

Each T-R0a constructor belongs to exactly one layer (reconciliation
C5), so `layerOf` reads the layer from the tag:

- P, `AtP`: `SplitUnforced CallSite (Tuple Witness Witness)`, two
  valid witnesses differing on the split (§2.2; `Witness` is W's B2
  record, W §1.6); `ForcednessUndecided CallSite`; and, if G3 is
  adopted, `NoAdmissibleWitnessFound CallSite` (§2.4), which T-R0a's
  `PolicyRefusal` gains then (T-R0a §6, "G3's refusal").
- A, `AtA`: `Inadmissible CallSite Int`, `Adm_W` refused at slot `i`
  (today's E_SPECIALIZATION). `AtA (ComponentBlocked f)` renders with
  E_SPECIALIZATION's layer (pending Q7).
- S, `AtS`: `NotLowerable Construct Site` (S1, and the re-check's
  unsupported path as `AtS (NotLowerable UncheckedPath site)`, W §3.3);
  `NoCompilation NoWitnessReason` (W §1.6, including `HoleContract
  Var`); `AdmissionLimit LimitReached` (S2).

Design points (proposed):

- **No `Stage` on Unresolved** (reconciliation D2). Verdict-stage
  Unresolved is the only `Unresolved`; a Solved declaration refused
  later is `NotCompiled`, tagged by layer, and keeps its verdict
  (T-R0a §6: "no admission refusal changes the verdict"; I3). W3 is
  Solved with `AtS (NotLowerable SeveralTailLowering site)`.
- **Codes by layer** (proposed default, pending author Q1(c)):
  Contradiction keeps E_TYPE; verdict-stage Unresolved gets the new
  Unresolved code; `AtP SplitUnforced` gets its own admission code;
  `AtA` keeps E_SPECIALIZATION; `AtS` (the re-check's unsupported path
  included), `ForcednessUndecided` and `NoAdmissibleWitnessFound` are
  rendered with the Unresolved code and their reason family, because decision 9
  names unsupported features and resource limits among the Unresolved
  reasons. Their text states that the declaration is valid (Solved)
  and names the layer. The alternative is a per-layer code for each.
- **`Internal` stays a separate outcome** (reconciliation D3, pending
  author Q1(a)), with E_INTERNAL, never Unresolved: a search/check
  disagreement or a failed re-check is not a limit, a missing feature
  or the program's fault (docs/engineering.md, "Result boundary
  classification"; W §3.3). T-R0a proposes the same (`Faulted`, its
  §3.2); `Defect` as an Unresolved reason is the kept alternative
  (Q1(a)).
- **No solver refusal is a reason** (reconciliation D4). A refusal
  resting on solver-chosen bindings, or on a c1 rule not yet proved,
  is a hint of the online search (T-R0a §4.2); the reason is
  `Inference NoCandidate`. This document's earlier `UnprovedRefusal`
  is dropped.
- The three reason families are disjoint constructors, so "the solver
  could not decide", "the compiler does not support this" and "a limit
  was reached" never share a text.
- No reason constructor asserts a number of solutions
  (docs/engineering.md:562-565, cited). Fixtures for Unresolved cover
  zero, one and several solutions, as that rule requires.
- A reason names its evidence-free status plainly: Unresolved is the
  absence of a verdict, so no reason may say "ambiguous" or "invalid".
- Every `DeclOutcome` carries the recorded problem (I1; T-R0a §3.2 as
  revised per reconciliation A1), so a later strategy or tool can
  resume from it.
- Strategies are injected values (requirements §4.4, cited); a new
  strategy adds `StrategyName` values and, at most, reason
  constructors.

### 3.2 Mapping from today's diagnostics (proposed; cited sources)

| Today (code, problem, source) | Class (requirements §2.3) | Target |
|---|---|---|
| E_TYPE `CannotTell` (D4), EndReport.purs:35, Unresolved.purs:74 | e | verdict Unresolved (Inference NoCandidate), D4 as a hint, unless some strategy Solves; then P: admitted if forced, `SplitUnforced` with two witnesses, else `ForcednessUndecided`. See §2.3 |
| E_TYPE D6, H's `Homeless` via `contradicted`, EndReport.purs:37-38, Contradicted.purs | d | not a refusal; the atom is recorded and D6 is a hint; V decides (`route`: Solved if some strategy certifies it, else Unresolved (Inference NoCandidate or NoAcceptedCertificate)) |
| E_TYPE row refusals on substituted atoms (`NotKnownDisjoint`, `InBothRecords`, `InBothRows`, `RowMayHaveField`, `LackedField`, head clashes) | e, c pending | Contradiction where a c1 rule stated by CX applies with its theorem, or a CX; otherwise a hint, and the verdict is Unresolved (Inference NoCandidate) |
| E_TYPE `lacks`/disjointness checks on body types at Resolve (Resolve/Lacking.purs:126-167, Resolve/Apart.purs:141-158; T-R0c d02, n16) | a today; semantic per T-R0c §3.12 (c2 with checked counter-instances) | move into generation as T-R0b E13 definedness atoms; V decides (Contradiction only with c1 or CX). Pending author Q4 |
| E_TYPE `NotPrintable`, `NotComparable` at check on an unforced settled type | d | recorded in `BQ`; V2 decides. Not reachable today: D4 refuses first (T-R0c f03); the live cases are f01, f02, f05 |
| E_TYPE `NotPrintable` per key, Specialize/Printable.purs:55-63 (E017) | transitional | until contracts carry `Q`: keeps its code, labelled transitional (pending author Q2); after: part of the re-check (§4) |
| E_TYPE `AmbiguousType` (ADR 007 condition 2) | e, or P policy, pending author Q4 | P policy on an observed undetermined type if the author so rules; otherwise class e (Unresolved). Code unchanged meanwhile |
| E_INTERNAL "R005B placeholder: rows with several tails …", Specialize/Record.purs:42-44 | e | Solved; `NotCompiled` (AtS (NotLowerable SeveralTailLowering site)) |
| E_INTERNAL "R005B placeholder: …" at check in SeveralTails (B9) | e | a hint; verdict Unresolved (Unsupported (GuardOutsideFragment …)) while no strategy covers several tails, if T-R0b §11 item 1 puts B9 in-model; else Unresolved (Unsupported SeveralTailSubtraction) |
| E_INTERNAL "R005B placeholder: …" at check (EndReport, Require, Record) | e | Unresolved (Unsupported, the named task) |
| E_INTERNAL `Exhausted` | e | Unresolved (Limit ReexaminationSteps), pending author Q1(b); also defect evidence while argued unreachable |
| E_INTERNAL `Unexpected`, "the end of a body failed outside its predicates", invalid ids | defect | Internal, unchanged; never Unresolved, never invalid (pending author Q1(a)) |
| E_NESTING `TypeTooDeep` (inferred) | e | Unresolved (Limit InferredTypeDepth) |
| E_NESTING `NestingTooDeep` (source) | a | unchanged |
| E_SPECIALIZATION `SpecializationLimit` | e | Solved; `NotCompiled` (AtS (AdmissionLimit SpecializationKeys)) |
| E_SPECIALIZATION `PolymorphicRecursion`, `NestedDatatype` | A | `AtA (Inadmissible site i)`, unchanged code; name-free slots `bareRow` admits and no active `Adm_W` row does are recorded `AdmittedPendingR019` (§1.4) |
| E_TYPE `SecondSpread` (Resolve) | a today | Unresolved (Unsupported SecondSpread), pending author Q4 |
| E_TYPE `SameDisjoint`, `RepeatedTail` in a signature | b′ | unchanged, worded as policy |
| syntax, names, arity, sorts, coverage, effect and handler codes | a | unchanged (effect refusals consuming record-solved metas: class f, `ClassF`, pending author Q3) |

Codes change for fixtures pinned to E_TYPE D4, the E_INTERNAL
placeholders, E_NESTING `TypeTooDeep` and E_SPECIALIZATION's limit
(recon §4.2, as cited in requirements §9 item 9), the last two subject
to Q1(c). Wording, the code's name and the fixture migration belong to
the implementation plan (decision 9).

## 4. The ground re-check (decision 5)

What it checks, how it obtains the key and the bindings, what failure
means and what it does not cover are W §3 (RC1-RC6, §3.1-§3.4, cited);
the keys it runs at are bounded by FK-0 (FK-W, FK-U if adopted; W
§2.4, §2.7). This document fixes only its position and the outcome its
results map to.

**Position** (proposed): at each key, **after lowering computes the
key's layouts and callee keys, before Go emission**. RC4 reads the
callee key lowering actually created and RC5 every record type lowered
at the key (W §3.1, cited), so it cannot run before lowering
(reconciliation C6). Placement and cost (per copy, per edge; always or
in a checking build) are the author's (Q8; W Q6).

**Outcomes** (proposed):

| Re-check result | Outcome |
|---|---|
| passes | continue to Go emission; narrows the adapter's trust only (§18.64 item 3, cited) |
| fails on an unsupported path (W §3.3: an atom the evaluator cannot evaluate at a key, such as an `outside` construct or a reserved `Field`) | `NotCompiled` (AtS (NotLowerable UncheckedPath site)); code pending author Q1(c) |
| fails otherwise | Internal (E_INTERNAL, W §3.3) |

It never yields Contradiction, NotAdmitted or Inadmissible, and its
text never says the program is invalid (§18.64 item 3; decision 5;
W §5.4: an RC failure is never a counter-instance).

Today's per-key printability check (E017) is the nearest existing
mechanism. Once callee-origin requirements live in contracts and are
decided in V2, it moves into the re-check (argued; the transition is
pending author Q2).

## 5. The `walk` findings in the layering

Program and runs: docs/findings.md "R010 and composed rows" (checked
run, cited); requirements §2.3.

| Finding | Today | Layer | Target outcome alone |
|---|---|---|---|
| W1 | E_TYPE "Cannot tell whether walk's u or v holds walk's u", at check | V, then P | V: valid with the identity split (argued); the verdict is Solved once a strategy accepts, and until then Unresolved (Inference NoCandidate), D4 as a hint. P, once Solved: argued not forced: the identity and the composed split both pass check once pinned through a changed signature (an extra `uonly` parameter; checked run, evidence about `walk`'s splits, not proof for the original signature), and no tested annotation decides it; so `SplitUnforced` with those two witnesses, or `ForcednessUndecided` until a decider exists |
| W2 | R010 admits `u' = {}`, `v' = { ...u, ...v }` | A | `AdmittedPendingR019` for the composed witness (`bareRow` admits it, no active `Adm_W` row does while FK-U is not adopted); the identity witness `Admissible` (FK-0's single-rigid-tail row). Identity is the only admissible split under the documented rule only (§18.63, cited) |
| W3 | E_INTERNAL Task 8 placeholder at specialize, with a caller | S1 | Solved; `NotCompiled` (AtS (NotLowerable SeveralTailLowering site)) |

**Why fixing one discharges none of the others** (argued):

- **Fixing W1 alone** (a strategy that Solves `walk`) moves it from an
  Unresolved verdict to its true P status: not forced, so NotAdmitted
  under decision 3. The program is still refused; the refusal is now
  policy, with evidence.
- **Adding a G3 contract** to admit `walk` needs A's answer: the
  contract may choose only `Admissible` witnesses, and whether the
  identity is the unique one depends on R019 (W2). Choosing the
  identity is not presented as a remedy (§18.63; requirements §5.3,
  cited).
- **Deciding R019 alone** (W2) changes which witnesses A admits, not
  forcedness (§2.1) and not lowering: `walk` is still refused at P and,
  with a caller, unsupported at S1.
- **Implementing Task 8 alone** (W3) gives several-tail layouts, but
  `walk` never reaches specialization: it is refused at P (or, today,
  at check by W1). The composed witness, being `AdmittedPendingR019`,
  must not reach specialization after Task 8 unless FK-U is adopted and
  proved (§1.4). The probe's no-caller build does not validate
  specializing or running a called `walk` (§18.63, cited).
- **The end-to-end question** (does a called `walk` compile and run
  under an admitted, admissible witness?) needs all three: an admission
  route (forced, written via a changed signature, or a G3 contract), an
  R019 decision or an `Admissible` witness, and Task 8.

## 6. Migration map (no code)

The order is T-R0a's (§10); this document does not restate it
(reconciliation H1). T-R0a steps 1-6 come first: types and the
collecting driver; classification, with D4 given the Unresolved code;
the generator beside the solver; generate, then search; rules and
refuters; the admission split. Two points this document relies on:

- **Complete generation** (decision 1): T-R0b's generator produces `B`
  and `BQ` by rule, independent of the online solver; D4 and D6 become
  hints of the online search (T-R0a §4.2). No walk over a settled body
  produces `BQ` (reconciliation A5).
- **The layer column.** This document's contribution to T-R0a steps
  1-2 is the layer of each diagnostic (§3.2) and `layerOf` (§3.1), so
  that rendering by layer makes I4 structural.

Layer-specific steps, inserted after T-R0a step 6. Behaviour changes
are flagged; every one needs fixtures seen failing first and a
regression row, per AGENTS.md, in its implementation plan.

- 6a. **A's three-valued status** (decision 2). Record
  `AdmittedPendingR019` as defined in §1.4; no user-visible change
  unless the author rules otherwise (Q5). Its value is in blocking
  later steps from relying on composed tails.
- 6b. **Split D4 at P** (after a forcedness decider; requirements §11
  item 5; reconciliation Q7). Once a strategy Solves, forced splits
  are admitted (acceptance widens: O4, c21, cmp-open); unforced ones
  get `SplitUnforced` with two witnesses; the rest
  `ForcednessUndecided`. Needs the author's approval as a language
  change.
- 6c. **Ground re-check and E017** (after the witness representation,
  decision 4, and W §3). Placed per §4; E017 moves into the re-check
  once contracts carry `Q` (Q2).
- 6d. **Task 8** (S1 lowering) where its plan schedules it; it changes
  only S1 outcomes. It lands with the §1.4 guard: an
  `AdmittedPendingR019` component is not specialized unless FK-U is
  adopted and proved (Q5).
- 6e. **G3's contract** (decision 6): only after a restricted C8
  argument is stated and accepted; it adds an admission route and
  touches no other layer.
- 6f. **Second spread** (Q4): reclassification only if the author
  agrees; text and code per the implementation plan.

6a can run at any time after T-R0a step 6; 6b needs T-R0a steps 3-5
(the complete problem and a strategy that Solves); 6d needs 6a; 6c and
6e come last.

## 7. Open questions

The reconciliation review grouped every stream's questions as Q1-Q10;
this document's questions map onto them. The "was" column gives each
question's old local number (§7 at 88c052d), which other documents
still cite ("T-R0e Q3", "§7 Q5"); "—" marks a question added since.

| was | This document's question | Status |
|---|---|---|
| Q1 | T-R0a: does the interface carry the problem in every outcome, and expose a forcedness query? | carrying: answered by T-R0a with reconciliation A1. Forcedness query: open, Q7 |
| Q2 | Should `AdmittedPendingR019` be visible to users? | open, Q5 |
| Q3 | Second spread: language rule (a) or support boundary (S1)? | open, Q4 |
| Q4 | Per-key E017 before contracts carry `Q`: a transitional V2 refusal or Unresolved? | open, Q2 |
| Q5 | `AmbiguousType`: P policy or class e? | open, Q4 |
| Q6 | Which O-kinds make acceptance depend on the record slice? | open, Q3; default meanwhile: every non-empty `outside` blocks a whole-function Solved (§1.5) |
| Q7 | Identifiers of the re-check, its binding source and the key theorem | closed: W §0 (RC1-RC6, `vars`/`Binding`, FK-0/FK-W/FK-U) |
| Q8 | NotAdmitted: must two witnesses be exhibited? | open, Q1(d); default: yes |
| Q9 | `Exhausted`: limit or defect? | open, Q1(b); default: Limit |
| — | `Internal`: a separate outcome or an Unresolved reason? | open, Q1(a); default: separate |
| — | Codes for a Solved declaration refused by P, A, S or the re-check | open, Q1(c); default in §3.1 |
| — | Requirement-atom trigger | open, Q2; default: §1.3's common wording |

## Revision log (reviews of 88c052d)

Reviews: the interface reconciliation (findings A1-I2, questions
Q1-Q10) and the adversarial soundness review (findings 1-9), both at
88c052d. Only findings that edit this document are listed.

**Applied:**

- A4: I2 now says the `adm`/`split` sites are inside the problem and
  P's and A's judgements of them live beside it (§1.6).
- A5: complete generation is T-R0b's rule-based generation; D4 and D6
  are hints of the online search (§6, §3.2).
- A6: the second spread is not "recorded at generation"; S1 reads the
  E25 sites (§1.1 item 3, §1.5 table).
- A7: B9 is in-model if T-R0b §11 item 1 is accepted; the check-time
  placeholder becomes a hint with `GuardOutsideFragment` (§1.5, §3.2).
- C1 and adversarial 9(d): A decides `Adm_W` by reference (W §2.3),
  which admits rigid row tails in type slots; FK-0/FK-W/FK-U and
  RC1-RC5 replace the descriptive names (§1.4, §4); old §7 Q7 closed.
- C2: `AdmittedPendingR019` is "admitted by `bareRow`, by no FK-0/FK-W
  row"; hole-only unions are `Admissible`; rigid-plus-hole unions are
  pending (§1.4).
- Adversarial 3: `AdmittedPendingR019` components must not reach
  specialization after Task 8 unless FK-U is proved; argued to refuse
  no program that compiles today (§1.4, §5, §6 step 6d).
- C5: refusals after Solved are `NotCompiled`, each constructor tagged
  by one layer; NotAdmitted is P only (§3.1).
- C6: the re-check runs after lowering computes layouts and callee
  keys, before Go emission (§1.1, §4).
- C7: `Construct` gains `NoCompilationWitness NoWitnessReason`;
  `ConstrainedHole` becomes `HoleContract Var`; `UncheckedPath` is W
  §3.3's unsupported path (§3.1).
- C8: `AmbiguousType` cites ADR 007 condition 2 (§3.2).
- D1: the flat `Outcome` is restated as the derived `layerOf ∷
  DeclReport → Layered`; `Accepted` is renamed `Compiled` (§3.1).
- D2: `Stage` (`AtAdmission`, `AtLowering`, `AtReCheck`) is dropped;
  compilation refusals are tagged by layer; their code is pending Q1.
- D3: `Internal` kept as a separate outcome, pending Q1(a).
- D4: `UnprovedRefusal` dropped (solver refusals are hints; reason
  `Inference NoCandidate`); `GuardOutsideFragment` added; T-R0a's
  inference constructors adopted; one `LimitReached` list with these
  names; `StrategyName` replaces `StrategyTag` (B6).
- D5: D4 is a verdict-stage Unresolved; P runs only after Solved (§2.2,
  §2.3, §3.2, §5).
- E1 and adversarial 5: non-empty `outside` blocks a whole-function
  Solved until a slice theorem exists (§1.1, §1.5).
- E2: the common requirement-atom wording replaces this document's
  trigger (§1.3).
- G1: a row for the Resolve-time body-type checks, moved into
  generation as E13 atoms (§3.2).
- G2: `AmbiguousType` is class e unless the author makes it P policy
  (§3.2).
- G3: the unforced-settled-type row is marked not reachable today
  (f03) (§3.2).
- H1: §6 cites T-R0a §10 for the order and keeps only steps 6a-6f,
  inserted after T-R0a step 6.
- I1: §4 keeps only the re-check's position and outcome, citing W §3.
- I2: a naming note separates this document's labels from the other
  streams' (preamble).

**Pending author rulings** (proposed defaults in the text):

- Q1(a): `Internal` as a separate outcome (default) or T-R0a's
  `Defect` reason.
- Q1(b): `Exhausted` as `Limit ReexaminationSteps` (default) or a
  defect.
- Q1(c): codes for refusals after Solved; default: the Unresolved code
  with the reason family for S, the re-check, `ForcednessUndecided` and
  `NoAdmissibleWitnessFound`; an admission code for `SplitUnforced`;
  E_SPECIALIZATION for A.
- Q1(d): NotAdmitted always exhibits two witnesses (default).
- Q2: the requirement-atom trigger (default: the common wording) and
  E017's transition.
- Q3: `outside` markers (default: any non-empty `outside` blocks a
  whole-function Solved); the class-f `ClassF` construct.
- Q4: the second spread, the Resolve-time body-type checks and
  `AmbiguousType`.
- Q5: `AdmittedPendingR019` visibility, the rigid-plus-hole case, and
  the post-Task-8 `ComposedTailsUnjustified` refusal.
- Q7: who decides forcedness (step 6b). Q8: re-check placement and
  cost.

**Disagreements:** none with the findings applied here. One note: C2's
consequence (ii), that W would refuse rigid-plus-hole tails, is
resolved by the definition adopted (they are `AdmittedPendingR019`,
not refused); it depends on W adopting the matching sentence in its
§2.3.

### Consistency re-check (39320ad)

The consistency re-check of the parallel revisions found residual
mismatches between the R0 documents. Only items that edit this
document are listed.

- R1: §3.1 no longer defines `CompileRefusal`, `PolicyRefusal` or
  `SupportRefusal`; it cites T-R0a §6 (canonical) and keeps
  `Construct`, `Layered` and `layerOf`, with a per-layer list of
  T-R0a's constructors. `NoCompilationWitness` and `HoleContract Var`
  leave `Construct`: both are T-R0a's `AtS (NoCompilation r)`, `r`
  from W's `NoWitnessReason`. The `ReCheck` tag becomes `AtS
  (NotLowerable UncheckedPath)`; `AtA (ComponentBlocked f)` renders
  with E_SPECIALIZATION's layer (pending Q7). Uses in §1.4, §1.5,
  §3.1, §3.2, §4 and §5 follow T-R0a's tags.
- R2: `SplitUnforced CallSite (Tuple Witness Witness)`, with W's B2
  `Witness` (§3.1).
- R9: RC1-RC6 (preamble, §4, §7); the naming note says "now Sc1-Sc3"
  and "now Sig1-Sig10", and cites T-R0a's assumptions As1-As8.
- R10: `AdmittedPendingR019` takes W §2.3's wording (no active `Adm_W`
  row, FK-W/FK-U rows active once adopted; name-free; admitted by
  `bareRow`), and `Admissible` reads "an active row" to match (§1.4,
  §3.2, §5). `ComposedTailsUnjustified` stays the post-Task-8
  constructor; W adopts it.
- R11: §7 gains a "was" column with each question's local number at
  88c052d.
- R12: the `Defect` note in §3.1 describes T-R0a's current proposal
  (`Faulted`), with `Defect` the kept alternative.
- R13: S1 reads T-R0b's `vars` entries with role `spread j` (T-R0b
  §3.3), not E25 sites, which E25 does not emit (§1.1, §1.5).
  `SeveralTailSubtraction` stays, for T-R0a to cite.

### Residual harmonization

Residual mismatches with T-R0a left by R1, resolved here and in T-R0a:

- `Reason` and this document's `LimitReached` are gone; §3.1 cites
  T-R0a's `UnresolvedReason`, `Unsupport`, `LimitAt` and `LimitReached`
  and keeps only the layer of each. `Layered.Unresolved` carries
  T-R0a's `UnresolvedReason`.
- `Construct` keeps only what `NotLowerable Construct Site` carries
  after Solved: `SeveralTailLowering`, `ComposedTailsUnjustified` (its
  `CallSite` moved to `NotLowerable`'s `Site`) and `UncheckedPath`. The
  verdict-stage constructs are T-R0a's `Unsupport` values; T-R0a gains
  `SecondSpread` and `ClassF Question` to hold them. Their site is read
  from the problem, so no `Site` was added to `Unsupport`. §3.2's
  second-spread target reads `Unresolved (Unsupported SecondSpread)`.
- Every `NotLowerable …` now has T-R0a's exact form, with `site`.
- A's refusal names the failing slot again: `AtA (Inadmissible site
  i)`, T-R0a's `Inadmissible CallSite Int` (§1.4, §3.1, §3.2). §1.4
  says A's three values are W's `AdmStatus`, the admitted two stored
  as T-R0a's `AdmittedStatus`.
- `NoAdmissibleWitnessFound` cites T-R0a §6's note that
  `PolicyRefusal` gains it only if G3's contract is adopted (§2.4,
  §3.1).
