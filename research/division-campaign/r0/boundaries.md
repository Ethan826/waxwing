# Validity, policy, admissibility and support: four boundaries

Stream T-R0e of the design tranche authorized in dossier §18.66
(2026-10-21). Base: 67ba706. **Documents only:** no compiler change, no
prototype, no proof. Basis: research/division-campaign/remedy/
requirements.md, revision 2 (accepted as the planning basis, §18.66;
cited below as "requirements"). Binding decisions (§18.66): 1
(generate-then-decide), 2 (R019: single-tail baseline), 5 (ground
re-check as an internal consistency check), 6 (G3: a restricted C8
argument and a selection contract, no rule chosen), 9 (a distinct
Unresolved code with structured reasons).

Labels: **cited** (file:line or section), **checked** (a recorded run or
a proved theorem, cited), **argued** (reasoning here, unchecked),
**proposed** (a design choice for the author). Names of types and
constructors below are illustrative; wording, codes' spellings and
fixture migration belong to the implementation plan (decision 9).

Parallel streams this document depends on but does not define: T-R0a
(generation/verdict interface), T-R0b (recorder specification), T-R0c
(refusal audit), CX's statements, and the termination and per-name
witness statements, owned by research/division-campaign/witness/
statements.md (being written). Where this document needs one of their
statements it names it and stops.

## 0. Summary

- **Four boundaries, applied in a fixed order** (proposed, §1): **V**,
  the verdict on the complete modeled problem (row validity, V1, and
  acceptance requirements, V2, both semantic); **P**, admission policy
  (decision 3, with G3's contract as a later, optional route); **A**,
  admissibility (R010 on the single-tail baseline); **S**, support (S1
  unsupported constructs, S2 resource limits). A static layer (classes
  a and b′, requirements §2.3) precedes them, unchanged.
- **One invariant governs all four** (proposed, §1.6): the recorded
  problem is fixed by generation; P, A and S record their judgements
  beside it and never add, drop or rewrite an atom, and none of their
  refusals changes V's verdict or is worded as one.
- **Decision 3 is an admission step, not an inference failure** (§2).
  Today one diagnostic, D4 "Cannot tell", covers both. Under the
  layering it splits by evidence: forcedness proved false (two valid
  witnesses differing on the split) is a P refusal; forcedness not
  decided is Unresolved; forcedness proved true is admitted.
- **Unresolved gets its own code and a reason ADT** with three
  families, inference, unsupported and limit, plus the stage where it
  arose (§3). Contradiction, admission, admissibility and internal
  defects keep separate codes.
- **The ground re-check sits after A and before lowering emits** (§4);
  its failure is Internal or Unresolved(Unsupported), never V.
- **W1, W2, W3 land in three different layers** (§5): P/V-inference,
  A, S1. Fixing any one leaves `walk` refused or unjustified by the
  other two.
- **Migration** (§6): tag before changing; complete generation; then
  codes; then the split of D4; then re-check and G3, each behind its
  own decision.

## 1. The layers and their order

### 1.1 The order (proposed)

```
static (a, b′) ─► V: verdict on ⟨D, B, BQ, outside⟩
                    │ Solved (some witness set W)
                    ▼
                  P: admission — forced │ written │ G3 contract
                    │ one admitted witness w
                    ▼
                  A: admissibility of w (R010, single-tail baseline)
                    ▼
                  S: support — lowering constructs (S1),
                     key and depth limits (S2)
                    ▼
                  ground re-check at each key (§4) ─► lowering
```

Why this order (argued):

1. V first, because decision 1 makes the complete problem the input of
   every later judgement, and because P's "forced" is a property of V's
   solution set (§2.1). P needs V's solutions; V needs nothing from P.
2. P before A, because R010 judges the **form of one witness**
   (recorder-spec §2.4, cited) and P is what names that witness. Under
   decision 3 without G3, P's output is the forced or written witness;
   A then judges it. P never consults A to decide forcedness (§18.62
   item 1). G3's contract, if adopted, consults A as a constraint on
   its choice (§2.4), which is a use of A, not a merger with it.
3. S after A, because lowering support and the key limit concern the
   specialized program, which exists only once a witness is admitted
   and admissible. S1 constructs detectable from syntax alone (second
   spreads, outside markers) are **recorded** at generation, earlier;
   their effect on the outcome is applied at the layer that needs them
   (§1.5).
4. The re-check last, because it validates a lowering input against
   the problem; it is downstream of every choice it re-examines.

Order of **reporting** (proposed): a declaration reports the first
layer, in the order above, that does not pass. Two exceptions: (i) a
Contradiction is reported even when the problem has `outside` markers,
because a c1 rule or CX on recorded atoms refutes a subset of the
obligations, and adding obligations cannot restore satisfiability
(argued; conditional on recorder correctness, requirements §4.3 R);
(ii) an S1 marker that makes V's Solved cover only a slice turns that
Solved into Unresolved(Unsupported) for the declaration (§1.5). A later
layer is not evaluated when it needs an output an earlier layer did not
produce; the diagnostic does not speculate about it.

### 1.2 V1: semantic validity

| | |
|---|---|
| Decides | a checking strategy over the complete problem `⟨D, B⟩` with its ∀rigid/∃flexible structure (requirements §2.4) |
| Evidence for Solved | a strategy's acceptance plus its `Sound_F` (acceptance ⇒ `ValidOpen`); today the cell format has it (`cellOpenImpl`, checked, requirements §4.4) |
| Evidence for Contradiction | c1, a rule proved sound for `ValidOpen` applied to original recorded atoms and `D`; or c2, a checked counter-instance (CX, statements pending) |
| Refusal | Contradiction (a type error proper; today's E_TYPE contradiction texts, once each rests on c1 or c2) |
| Otherwise | Unresolved, reason family Inference (§3); no claim about the number of solutions (docs/engineering.md:556-565, cited) |
| Must not | treat failure of the current solver, or a contradiction reached through bindings the online solver chose, as Contradiction (requirements §2.4 "Three grounds", cited; §18.65) |

`divide5`, refused by every cell certificate, is Unresolved
(requirements §4.4, cited), never invalid (§18.60).

### 1.3 V2: acceptance requirements

Printability and comparability are **typing obligations**, recorded as
requirement atoms `pr τ`, `cmp τ` in `BQ` (caller origin, at check) and
`Q` (callee contract), reaching callers through instantiation
(recorder-spec §1.2, §9 M1-M4, cited; §18.24 item 2, cited).

| | |
|---|---|
| Decides | the same verdict as V1, over `⟨D, B, BQ⟩` jointly: V1 and V2 are one layer, the complete typing obligations, split here only to say what each needs |
| Evidence | for Solved, `ValidOpenR` and a strategy sound for it; **unstated today** (requirements §11 item 2, cited) |
| Refusal | Contradiction only with c1 or c2 evidence on the requirement atoms (a ground site whose type holds a function independently of any split is the obvious c1 candidate, pending T-R0c) |
| Until `ValidOpenR` is stated | a problem whose `BQ` mentions a split part is Unresolved(Unsupported RequirementAtoms) for every strategy (requirements §11 item 2, cited); an atom on a type no split reaches is judged as today (argued; T-R0a/T-R0b to confirm) |
| Must not | be judged on an unforced settled type (class d, requirements §2.3, cited), or be dropped because a strategy cannot read it |

V2 belongs to V, not to P: a split that satisfies the row equations but
not a requirement is **not a solution** (§18.62 item 1). This is what
lets "forced" (§2) include requirements without P re-deciding them.

### 1.4 A: admissibility (R010)

| | |
|---|---|
| Decides | a syntactic rule on the admitted witness's form: inside a recursive component each type or record slot is the caller's bare variable or mentions no rigid variable (recorder-spec H1, cited; NestedArguments.purs:45-49, Instantiation.purs:60-70, cited) |
| Justification | specialization terminates (ADR 007 "The instantiation rule", cited); for key-dependent witnesses, the finite-reachable-key theorem owned by witness/statements.md (decision 3 of §18.66), not defined here |
| Evidence for a refusal | the witness form at the call and the slot that fails |
| Refusal | Inadmissible: today E_SPECIALIZATION `Recursive call to f changes its type arguments`, reported at check (Instantiation.purs:70, cited); unchanged code |
| Must not | enter `B`, change validity (§18.22 item 3, cited), or decide forcedness (§18.62 item 1) |

**Decision 2 applied** (proposed): A judges records by the documented
single-tail rule, the justified baseline. Today's `bareRow`
(NestedArguments.purs:78-81, cited) also admits a field-free composed
row (`{ ...u, ...v }`). The layering keeps that behaviour and does not
endorse it: A's result for a record slot is three-valued,

- `Admissible`: passes the single-tail rule;
- `Inadmissible`: fails today's code (refused, as today);
- `AdmittedPendingR019`: passes today's code only because a composed
  field-free row counts as bare.

`AdmittedPendingR019` compiles exactly as today, so no accepted program
is rejected, but it is recorded as such and **may not be used as a
premise**: no uniqueness claim ("only admissible split"), no G3 choice,
no termination argument rests on it. Pure unions of caller row
variables as an extension are **investigation** (R019, §18.66 decision
2), with their own termination argument; when R019 is decided, every
`AdmittedPendingR019` becomes one of the other two by that decision,
not by default. Whether the status should be user-visible is an open
question (§7 Q2).

### 1.5 S: support boundaries and resource limits

S says nothing about the program's meaning. Two kinds, kept apart in
the reason ADT (§3), never merged with V:

**S1, unsupported constructs** (proposed classification; cited
sources):

| Construct | Where today | Today | Model |
|---|---|---|---|
| several-tail lowering (Task 8; recorder-spec H7) | Specialize/Record.purs:38-44 | E_INTERNAL "R005B placeholder: rows with several tails are lowered in Task 8" | valid problems exist (W3) |
| removal and rest binders over several tails (Task 7; B9) | Check/SeveralTails.purs:19-27 | E_INTERNAL "R005B placeholder: … typed in Task 7" | not modelled |
| other check-time placeholders | EndReport.purs:39, Require.purs:105, Record.purs:160 | E_INTERNAL "R005B placeholder: …" | — |
| a second spread in a literal (B3) | Resolve/Record.purs:73-80 | E_TYPE "A record literal accepts at most one spread" | valid (`join_validFin` and others; recorder-spec §4 B3, cited) |
| constructs outside the model (O1-O8) | recorder-spec §3.7 | each construct's own rules | `outside` markers |
| a hole mentioned by an atom, at lowering (H4) | Specialize/Values.purs:96-98 | defaulted silently | constrained holes need a witness |
| requirement atoms on split parts | — | judged on a settled type | `ValidOpenR` unstated |

Evidence: the construct and its site, and the named boundary (task or
model gap). The refusal claims only that the compiler does not handle
the construct. **The outside markers are not refusals by themselves**
(argued): the constructs O1-O8 keep today's rules for the parts they
govern; an `outside` marker turns a V Solved into
Unresolved(Unsupported) only when the declaration's acceptance depends
on a fact the record slice cannot establish (for example an effect
refusal consuming record-solved metas, class f, requirements §2.3).
Which O-rows do so is T-R0b's and T-R0c's to state; this document fixes
only the class.

The second spread is documented as a language rule (docs/language.md:
897-898, cited). The brief lists it as a support boundary, and the
model calls such programs valid; this document proposes classifying it
S1, with an explicit compatibility decision for the author (§7 Q3).

**S2, resource limits**:

| Limit | Where | Today | Depends on the split? |
|---|---|---|---|
| inferred type depth 1,000 (H5) | Check/Unify.purs:105; Binding.purs:41 | E_NESTING (`TypeTooDeep`) | yes (F11, recorder-spec H5, cited) |
| specialization keys 10,000 (H6) | Specialize/Keys.purs:146-154 | E_SPECIALIZATION "More than 10000 specializations" | yes (E4) |
| re-examination step bound | UnifyFailure.purs:39-41 (`Exhausted`); EndReport.purs:42 | E_INTERNAL | argued unreachable (rules §5) |
| a strategy's search budget (future) | — | — | per strategy |

Source nesting (`NestingTooDeep`, at parse) is a static limit on the
text, not on a constraint problem; it stays in the static layer with
its code (proposed). The 10,000 limit is "a resource guard, never the
termination argument" (ADR 007 "The specialization limit", cited), and
decision 3 of §18.66 repeats that it does not substitute for the
theorem; S2 keeps it a limit.

### 1.6 The invariant: no layer redefines the problem (proposed)

- **I1, fixed problem:** the recorded `⟨D, B, BQ, outside⟩` is a
  function of the resolved declaration (decision 1; T-R0b's criterion,
  requirements §2.4). It is the same whichever later layer refuses.
- **I2, records beside, never atoms:** P's policy record and A's
  admissibility record live beside the problem (recorder-spec §2.4,
  cited); S records markers and counters. None adds an atom to `B` or
  removes one.
- **I3, verdict monotone:** V's verdict is computed once; P, A, S and
  the re-check can only refuse compilation. None turns Unresolved into
  Solved, Solved into Contradiction, or a refusal of its own into a
  type error's text.
- **I4, text by class:** a contradiction text only from Contradiction,
  an unresolved text only from Unresolved (docs/engineering.md:556-561,
  cited), extended: an admission text only from P, an admissibility
  text only from A.

Checks that would back these (proposed, per the claims-backed-by-checks
rule; for the implementation plan): for I1 and I2, a property over the
T-R0 fixtures that the recorded problem is equal when each refusing
layer is replaced by an injected permissive implementation (an
injected value, not a flag); for I3, each fixture's verdict class is
asserted separately from its compilation outcome; for I4, rendering is
a function of the layer outcome type, so a text cannot be produced from
the wrong constructor.

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
R010, that split is admissible-unique, not forced. P never computes
forcedness on the admissible subset. Under decision 3 without G3,
admissible-uniqueness admits nothing (argued from the policy text,
dossier §4).

### 2.2 The admission step (proposed)

| Outcome | Evidence required | Result |
|---|---|---|
| forced | a forcedness decision over the complete obligations (who decides it: requirements §11 item 5, open) | admitted; the witness passes to A |
| written | the same, on the problem with the annotation | admitted |
| not forced, not written | **two valid witnesses differing on the split**, each accepted by a sound strategy (or by the decider) | NotAdmitted: "valid; split not determined", naming the part and the exhibited alternatives (dossier §4 policy, cited) |
| undecided | none | Unresolved(Inference ForcednessUndecided) |
| G3 contract applies (future) | §2.4 | admitted with the contract's witness |

The evidence row for NotAdmitted follows the blame-needs-evidence rule:
a diagnostic naming alternatives exhibits them; "the checker could not
tell" is not evidence that two exist.

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
   cmp-open; recorder-spec §4 H2, cited).
2. **Incomplete premises.** D4 is decided by `waitingAtEnd` before the
   printability and comparability walks that produce `BQ`
   (requirements §2.2, cited: Function.purs:89 before :96-97). So it
   cannot count requirement atoms toward forcedness, which §18.62
   item 1 requires.
3. **Different class.** D4 is class e (requirements §2.3, cited); an
   admission refusal is policy on a valid problem.

So, under the layering, today's D4 text corresponds to three outcomes
selected by evidence: admitted (forced, today wrongly refused),
NotAdmitted (unforced, with two witnesses), or
Unresolved(ForcednessUndecided).

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
  valid, admissible witness or Unresolved (recorder-spec P5, cited);
- apply outside its fragment (B2, B3 in requirements §5.2, cited);
- relax R010 (relaxing it needs its own termination argument and
  approval, §18.22 item 3, cited).

Outside its fragment decision 3 stands and the outcome is NotAdmitted
or Unresolved as in §2.2. Inside, failure to find a witness is
Unresolved(Inference NoAdmissibleWitnessFound), not NotAdmitted.

## 3. The Unresolved code and its reasons (decision 9)

### 3.1 ADT sketch (proposed; illustrative names)

```
-- One outcome per declaration (static refusals keep their codes).
data Outcome
  = Accepted Admitted              -- every layer passed
  | Contradiction Evidence         -- V: c1 rule + theorem, or c2 CX
  | NotAdmitted Admission          -- P: decision 3 (own code)
  | Inadmissible Admissibility     -- A: R010 (E_SPECIALIZATION)
  | Unresolved Stage (NonEmptyArray Reason)   -- the new code
  | Internal Defect                -- E_INTERNAL: a compiler defect

data Stage = AtVerdict | AtAdmission | AtLowering | AtReCheck

data Reason
  = Inference InferenceFailure
  | Unsupported Construct Site
  | Limit Limit Site

data InferenceFailure
  = NoStrategyAccepted (Array StrategyTag)  -- divide5 under cells
  | UnprovedRefusal Rule                    -- class e: rests on
                                            -- solver-chosen bindings,
                                            -- or c1 soundness unproved
  | ForcednessUndecided Call                -- part of today's D4
  | NoAdmissibleWitnessFound Call           -- G3 search (future)
  | Unsettled Question                      -- class f until settled

data Construct
  = SeveralTailLowering                     -- Task 8 (W3)
  | SeveralTailSubtraction                  -- Task 7
  | SecondSpread                            -- B3, if §7 Q3 agrees
  | Outside OutsideKind                     -- O1-O8, when depended on
  | ConstrainedHole                         -- H4
  | RequirementAtoms                        -- ValidOpenR unstated
  | UncheckedPath                           -- re-check, §4

data Limit
  = InferredTypeDepth Int                   -- 1,000 (H5)
  | SpecializationKeys Int                  -- 10,000 (H6)
  | ReexaminationSteps                      -- argued unreachable
  | StrategyBudget StrategyTag              -- future
```

Design points (proposed):

- The three reason families are disjoint constructors, so "the solver
  could not decide", "the compiler does not support this" and "a limit
  was reached" never share a text.
- `Stage` keeps "Solved, but lowering is unsupported" apart from "the
  type is undecided": W3 is `Unresolved AtLowering [Unsupported
  SeveralTailLowering]`, not an inference failure.
- No reason constructor asserts a number of solutions
  (docs/engineering.md:562-565, cited). Fixtures for Unresolved cover
  zero, one and several solutions, as that rule requires.
- A reason names its evidence-free status plainly: Unresolved is the
  absence of a verdict, so no reason may say "ambiguous" or "invalid".
- Every outcome carries the recorded problem (I1), so a later strategy
  or tool can resume from it.
- Strategies are injected values (requirements §4.4, cited); a new
  strategy adds `StrategyTag` values and, at most, reason constructors.

### 3.2 Mapping from today's diagnostics (proposed; cited sources)

| Today (code, problem, source) | Class (requirements §2.3) | Target |
|---|---|---|
| E_TYPE `CannotTell` (D4), EndReport.purs:35, Unresolved.purs:74 | e | admitted if forced; NotAdmitted with two witnesses; else Unresolved AtAdmission (ForcednessUndecided). See §2.3 |
| E_TYPE D6, H's `Homeless` via `contradicted`, EndReport.purs:37-38, Contradicted.purs | d | not a refusal; the atom is recorded; V decides (`route`: Solved if some strategy certifies it, else Unresolved NoStrategyAccepted) |
| E_TYPE row refusals on substituted atoms (`NotKnownDisjoint`, `InBothRecords`, `InBothRows`, `RowMayHaveField`, `LackedField`, head clashes) | e, c pending | Contradiction where T-R0c gives a c1 rule with its theorem or a CX; otherwise Unresolved AtVerdict (UnprovedRefusal) |
| E_TYPE `NotPrintable`, `NotComparable` at check on an unforced settled type | d | recorded in `BQ`; V2 decides |
| E_TYPE `NotPrintable` per key, Specialize/Printable.purs:55-63 (E017) | transitional | until contracts carry `Q`: keeps its code, labelled transitional (§7 Q4); after: part of the re-check (§4) |
| E_TYPE `AmbiguousType` (ADR 007 condition 1) | policy | P-like policy on an observed undetermined type; code unchanged pending §7 Q5 |
| E_INTERNAL "R005B placeholder: rows with several tails …", Specialize/Record.purs:42-44 | e | Unresolved AtLowering (Unsupported SeveralTailLowering) |
| E_INTERNAL "R005B placeholder: …" at check (SeveralTails, EndReport, Require, Record) | e | Unresolved AtVerdict (Unsupported, the named task) |
| E_INTERNAL `Exhausted` | e | Unresolved (Limit ReexaminationSteps); also defect evidence while argued unreachable |
| E_INTERNAL `Unexpected`, "the end of a body failed outside its predicates", invalid ids | defect | Internal, unchanged; never Unresolved, never invalid |
| E_NESTING `TypeTooDeep` (inferred) | e | Unresolved AtVerdict (Limit InferredTypeDepth) |
| E_NESTING `NestingTooDeep` (source) | a | unchanged |
| E_SPECIALIZATION `SpecializationLimit` | e | Unresolved AtLowering (Limit SpecializationKeys) |
| E_SPECIALIZATION `PolymorphicRecursion`, `NestedDatatype` | A | Inadmissible, unchanged code; composed-tail passes recorded `AdmittedPendingR019` |
| E_TYPE `SecondSpread` (Resolve) | a today | Unsupported SecondSpread, if §7 Q3 agrees |
| E_TYPE `SameDisjoint`, `RepeatedTail` in a signature | b′ | unchanged, worded as policy |
| syntax, names, arity, sorts, coverage, effect and handler codes | a | unchanged (effect refusals consuming record-solved metas: class f, T-R0c) |

Codes change for fixtures pinned to E_TYPE D4, the E_INTERNAL
placeholders, E_NESTING `TypeTooDeep` and E_SPECIALIZATION's limit
(recon §4.2, as cited in requirements §9 item 9). Wording, the code's
name and the fixture migration belong to the implementation plan
(decision 9).

## 4. The ground re-check (decision 5)

**Position** (proposed): after A admits a witness and specialization
reaches a key, before lowering emits that key's layouts. It reads the
evaluated witness at the key and the callee's obligations instantiated
there.

**What it checks and how it gets its bindings** are stated by the
termination and witness interface owner in research/division-campaign/
witness/statements.md: its re-check statement (the obligation list at
a key, and that it reads the correct key and bindings), the per-name
witness metadata it evaluates (decision 4), and the finite-reachable-key
theorem that bounds the keys it runs at (§18.66 decision 3). This
document uses those descriptive names until that file fixes the
identifiers; it defines none of them.

**Outcomes** (proposed):

| Re-check result | Meaning | Outcome |
|---|---|---|
| passes | the adapter's output agrees with the obligations it re-checked at this key | continue; narrows the adapter's trust only (§18.64 item 3, cited) |
| fails on a path the layering already marks unsupported (a constrained hole defaulted, a construct outside the witness interface) | unsupported path | Unresolved AtReCheck (Unsupported UncheckedPath) |
| fails otherwise | internal inconsistency between verdict, selection, witness and lowering | Internal |

It never yields Contradiction, NotAdmitted or Inadmissible, and its text
never says the program is invalid (§18.64 item 3; decision 5, cited). A
pass does not discharge recorder completeness, binding-to-layout
correspondence, admissibility or behaviour preservation; each keeps its
own obligation (requirements §4.3, cited).

Today's per-key printability check (E017) is the nearest existing
mechanism: a ground judgement at keys. Once callee-origin requirements
live in contracts and are decided in V2, a per-key failure can only
mean the selection or lowering disagreed with V2, so the check moves
into the re-check and its refusal into the table above (argued; §7 Q4
for the transition).

## 5. The `walk` findings in the layering

Program and runs: docs/findings.md "R010 and composed rows" (checked
run, cited); requirements §2.3.

| Finding | Today | Layer | Target outcome alone |
|---|---|---|---|
| W1 | E_TYPE "Cannot tell whether walk's u or v holds walk's u", at check | P (with V as precondition) | V: Solved (valid with the identity split, argued). P: argued not forced: the identity and the composed split both pass check once pinned through a changed signature (an extra `uonly` parameter; checked run, evidence about `walk`'s splits, not proof for the original signature), and no tested annotation decides it; so NotAdmitted with those two witnesses; or Unresolved(ForcednessUndecided) until a decider exists |
| W2 | R010 admits `u' = {}`, `v' = { ...u, ...v }` | A | `AdmittedPendingR019` for the composed witness; the identity witness `Admissible`. Identity is the only admissible split under the documented rule only (§18.63, cited) |
| W3 | E_INTERNAL Task 8 placeholder at specialize, with a caller | S1 | Unresolved AtLowering (Unsupported SeveralTailLowering) |

**Why fixing one discharges none of the others** (argued):

- **Fixing W1 alone** (an inference fix that removes the early "Cannot
  tell") moves `walk` from an inference failure to its true P status:
  not forced, so NotAdmitted under decision 3. The program is still
  refused; the refusal is now policy, with evidence.
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
  at check by W1). The probe's no-caller build does not validate
  specializing or running a called `walk` (§18.63, cited).
- **The end-to-end question** (does a called `walk` compile and run
  under an admitted, admissible witness?) needs all three: an admission
  route (forced, written via a changed signature, or a G3 contract), an
  R019 decision or an `Admissible` witness, and Task 8.

## 6. Migration map (no code)

Each step names what changes, in order, and what it waits for.
Behaviour changes are flagged; every one needs fixtures seen failing
first and a regression row, per AGENTS.md, in its implementation plan.

1. **Tag, change nothing** (after this layering is reviewed). Inventory
   every diagnostic in §3.2 with its target class and stage, joined
   with T-R0c's refusal audit. No code changes.
2. **Outcome type beside today's `Either Diagnostic`** (after T-R0a).
   The layered outcome of §3.1 is introduced and rendered to **today's**
   codes and texts, so the step is behaviour-preserving; rendering by
   class makes I4 structural. Modules: Check (EndReport, Unresolved,
   Contradicted), Format/Diagnostic/Code, Domain.Problem.
3. **Complete generation** (decision 1; after T-R0b). D4 and D6 stop
   ending generation; the `BQ` walks run on every body; one refusal no
   longer hides later declarations (requirements §2.4, cited).
   Behaviour change: more diagnostics per program; verdicts unchanged
   in this step.
4. **The Unresolved code** (decision 9). Switch the placeholders, the
   inferred-depth and key limits and `Exhausted` to Unresolved with
   reasons. Behaviour change: codes in pinned fixtures; wording per the
   implementation plan. `PolymorphicRecursion` keeps E_SPECIALIZATION.
5. **Contradiction only with evidence** (after T-R0c and CX). Each E_TYPE
   contradiction text either cites its c1 rule or a CX, or becomes
   Unresolved(UnprovedRefusal). Behaviour change: some refusals change
   class; `route` stops being called contradictory.
6. **Split D4** (after a forcedness decider; requirements §11 item 5).
   Forced splits are admitted (acceptance widens: O4, c21, cmp-open);
   unforced ones become NotAdmitted with two witnesses; the rest
   Unresolved(ForcednessUndecided). Needs the author's approval as a
   language change.
7. **A's three-valued status** (decision 2). Record
   `AdmittedPendingR019` for composed-tail passes; no user-visible
   change unless §7 Q2 decides otherwise. Waits for nothing; its value
   is in blocking later steps from relying on composed tails.
8. **Ground re-check and E017** (after the witness representation,
   decision 4, and witness/statements.md's re-check statement). E017
   moves into the re-check once contracts carry `Q`.
9. **Task 8** (S1 lowering) where its plan schedules it; it changes
   only S1 outcomes.
10. **G3's contract** (decision 6): only after a restricted C8 argument
    is stated and accepted; it adds an admission route and touches no
    other layer.
11. **Second spread** (§7 Q3): reclassification only if the author
    agrees; text and code per the implementation plan.

Steps 1-2 are prerequisites of all others; 3 precedes 5 and 6 (both
need the complete problem); 4 is independent of 5-7; 8 and 10 come
last. Step 7 can run at any time after 1.

## 7. Open questions

For other streams:

1. **T-R0a:** does the generation/verdict interface carry the recorded
   problem in every outcome (I1), and does it expose the solution set,
   or a forcedness query, that P needs (§2.2)?
2. **Author:** should `AdmittedPendingR019` be visible to users (a
   note, a warning) or only to tests and the author until R019 is
   decided?
3. **Author:** is the second spread a language rule (class a, as
   docs/language.md states it) or a support boundary (S1, as the model
   and the brief suggest)? The choice changes its code and text.
4. **Author and the witness owner:** until contracts carry callee-
   origin requirements, the per-key E017 check refuses some programs
   whose split is unforced (E2). Keep it as a transitional V2 refusal
   with today's code, or report Unresolved when the split is unforced?
5. **Author:** is ADR 007's ambiguous-hole rule a P-layer policy (like
   decision 3: an observed undetermined type) with its own code, or a
   type error as today?
6. **T-R0b and T-R0c:** which outside rows (O1-O8) can make acceptance
   depend on the record slice, so that their marker turns Solved into
   Unresolved(Unsupported) (§1.5)?
7. **witness/statements.md:** the identifiers of the re-check statement,
   its binding source and the finite-reachable-key theorem, to replace
   the descriptive names in §1.4 and §4.
8. **Author:** NotAdmitted needs two exhibited witnesses (§2.2). Is a
   strategy that proves non-forcedness without exhibiting them
   acceptable evidence, or must the diagnostic always show both?
9. **Author:** should `Exhausted`, argued unreachable, be a limit
   (Unresolved) or a defect (Internal) when it occurs?
