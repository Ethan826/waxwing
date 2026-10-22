# T-R0a: the generation and verdict interface (generate-then-decide)

Date: 2026-10-21. Base: 67ba706. Revision 1 (2026-10-21): the
reconciliation and adversarial reviews of 88c052d applied; see the
revision log at the end. Stream T-R0a of the design tranche the author
authorized in dossier §18.66 (decision 1: **generate-then-decide**).
**A design document only:** no compiler change, no prototype, no proof.
It specifies interfaces as typed pseudo-signatures (PureScript-
flavoured; not compiled) and prose.

Labels, as in requirements.md (revision 2): **cited** (file:line or
section, at 67ba706), **argued** (reasoning, unchecked), **proposed** (a
design choice awaiting the author), **predicted** (about today's
compiler, not run). Every pseudo-signature is proposed unless marked.
**Pending author Q<n>** marks a proposed default that waits on the
reconciliation review's question Q<n> (listed in §11); the alternatives
are kept beside it.

Planning basis: research/division-campaign/remedy/requirements.md
("requirements" below), especially §2 (R0), §4.4 (strategy interface,
verdicts) and §9 (decisions, as ruled in dossier §18.66).

Ownership. This document is canonical for the pipeline's stage
boundaries, the outcome and verdict types (`DeclOutcome`, `Verdict`,
`UnresolvedReason`, `InternalFault`, `Admission` and its refusals), the
strategy, refuter and evidence interfaces, `StrategyName`, the driver,
and the migration order. Other documents adopt these by reference; in
particular W's and T-R0e's `StrategyTag` is this document's
`StrategyName`. It does **not** own, and adopts by reference:

| Item | Owner | Referenced here as |
|---|---|---|
| the shape and translation rules of the recorded problem; `vars`, `types`, `OutsideKind`, origins | T-R0b, r0/recorder-rules.md | `RecordedProblem` (its §10), assumptions As1-As8 in §8 |
| evidence: classification of each existing refusal, probes | T-R0c, r0/refusal-audit.md | cited per entry |
| counter-instance and c1 statements | CX, refute/statements.md | `CXChecked`, `RefuteSound`, C1-P, C1-H, C1-O, C1-E |
| witness and termination types | W, witness/statements.md | `Compilation`, `Witness`, `SplitJudgement`, `AdmStatus`, `WitnessMeta`, `NoWitnessReason`, `Adm_W`, RC1-RC6 |
| layers (V, V2, P, A, S), their codes, decision 3, R010, Task 8, support boundaries | T-R0e, r0/boundaries.md | the layer tags of §6, `Construct` |

Labels in this document: the requirements G-complete … G-inject (§1),
the generator assumptions As1-As8 (§8; renamed from A1-A8, which
collided with T-R0e's admissibility layer A), the tests AT1-AT16 (§9).
G0, G1, G2 and G3 keep the dossier's meanings.

## 1. Requirements this interface must meet

From requirements §2.4 and dossier §18.66 (cited); each is tested in §9.

- **G-complete.** The decision stages read a complete recorded problem
  or nothing: T-R0b §10's `RecordedProblem`, with its `d`, `q`, `b`,
  `bq`, `outside` and the `adm`/`split` **sites** inside it; the
  judgements of those sites live beside it (§6). A prefix is never
  decided (requirements §2.4, "Criterion"; §18.61 "Moving the
  end-of-body gate alone does not suffice").
- **G-grounds.** Only (1) a rule proved sound for `ValidOpen` (CX's C1
  schema), applied to the problem's whole `D` and a subset of its
  original `B` atoms, or (2) a checked counter-instance yields
  Contradiction. (3) Solver failure, including any refusal reached
  through bindings the online solver chose, yields Unresolved and
  preserves the problem (requirements §2.4, "Three grounds"; §18.65:
  forced bindings alone do not justify a class-c refusal).
- **G-early.** Only classes a and b′ may stop generation; class c may
  but need not (requirements §2.3 table, §2.4 "Who may stop early").
  This design stops generation for none of them: static rules are
  judged beside generation (§2).
- **G-hide.** An unjustified refusal in one declaration does not hide
  later declarations (requirements §2.4).
- **G-BQ.** `BQ` is generated before any verdict (requirements §2.2:
  today the walks run after `waitingAtEnd`).
- **G-search.** The online solver is a search strategy. It returns a
  candidate or nothing, never a verdict (decision 1).
- **G-lower.** Validity without a compilation witness does not
  authorize lowering (decision 4).
- **G-reasons.** Unresolved has its own error code and a reason ADT
  that separates inference failure, unsupported features and resource
  limits (decision 9).
- **G-inject.** Strategies, refuters, rules and budgets are injected
  values, never selected by flags (AGENTS.md; recon §2.4, the `Judge`
  precedent: `homeless` versus `withoutH`, RowMerge/End.purs:69, :83).

## 2. The per-declaration pipeline

```text
Resolved.Program
  │ resolve (program-wide; class a)                  today, unchanged
  ▼
for each declaration f, independently:
  generate    : Resolved f ─▶ RecordedProblem      total; G-complete
  staticRules : Resolved f ─▶ Array StaticRefusal  beside generation
  decide      : RecordedProblem ─▶ Verdict, or an internal fault
                (run only when staticRules found nothing)
       ├ c1 rules on toSig P (whole D, sub-body) ─▶ Contradiction
       ├ refuters, CXChecked                    ─▶ Contradiction
       ├ strategies: guard, search, check       ─▶ Solved
       └ otherwise                              ─▶ Unresolved reason
then, program-wide:
  admit      : outcomes + components ─▶ Admission per decl (P, A, S)
  specialize : only if every reached declaration is Admitted;
               the ground re-check runs per key (W §3)
```

Proposed. Four properties of this shape, argued:

1. **Generation emits no verdict and never stops.** It is a pure,
   total, syntax-directed function of the resolved declaration and the
   signatures it references (T-R0b §1: "it never stops and never
   fails"). Static rules (classes a and b′) are separate passes judged
   beside generation, and a statically refused declaration keeps its
   problem (T-R0b §8, §10; T-R0e I1). Class c is *permitted* to stop
   generation (requirements §2.3) but this design does not use the
   permission: every semantic verdict comes from `decide`, which keeps
   the three grounds in one place. (A c1 rule is monotone in `B`, so
   running it after generation loses nothing; requirements §2.4, CX
   C1-P.)
2. **`decide` reads only a complete problem.** `RecordedProblem` is
   opaque; its constructor is exported only to the generator (§3.1),
   so a prefix cannot be built and handed to `decide`. Checkers inside
   `decide` may build sub-problems of the projection `toSig P` (§5);
   those are plain values of CX's type and never reach `decide`.
3. **Declarations are independent until admission.** A body's
   generation reads callees' written signatures, not their verdicts
   (T-R0b §8, confirming As8). So each declaration's generation and
   verdict depend only on its own syntax and the program's signatures.
   This needs generation not to read the call graph: T-R0b records
   every reference to a function as a site with no component flag, and
   admission filters the sites by component (reconciliation A2). Under
   a generator that records `adm` sites only within `f`'s component,
   adding a call in `f` could change `g`'s problem, and AT13 would
   fail. Admission is the first program-wide stage after resolve,
   because R010 judges recursive components (Check/Instantiation.purs:
   25-29).
4. **Specialization is reached only through admission.** A Solved
   declaration without a compilation witness, or with a refused
   admission, is reported and never lowered (G-lower).

## 3. Types

### 3.1 Layers and modules (proposed)

| Piece | Module (proposal) | Layer reason |
|---|---|---|
| `RecordedProblem` and its atoms | `Domain.Recorded` (shape: T-R0b) | data; rendered by Format |
| outcome, verdict, reason, evidence types | `Domain.Verdict` | data; rendered by Format |
| validity and evidence tokens (hidden constructors) | `Domain.Verdict.Internal`, import-enforced like Domain.Checked.Internal (AGENTS.md) | only trusted checkers may mint them |
| generator, static-rule passes | `Features.Check.Generate.*` (T-R0b) | pure; may import Checked.Internal |
| `decide`, driver | `Features.Check.Decide`, `Features.Check` | pure |
| strategies (online, cell, later formats) | `Features.Check.Strategy.*` | pure; search untrusted, check trusted |
| refuters, rule registry | `Features.Check.Refute.*` | pure |
| admission | `Features.Check.Admit.*` (T-R0e) | pure |
| texts and codes | `Format.Diagnostic.*`, `Format/Diagnostic/Code.purs` | Features report data, never text |
| the composition root choosing strategies | `Program.Compile` | injection happens at the outermost layer |

### 3.2 Outcomes

```purescript
-- One per declaration, in declaration order. Never a bare Diagnostic.
-- Every constructor keeps the recorded problem (T-R0e I1).
data DeclOutcome
  = Refused (NonEmptyArray StaticRefusal) RecordedProblem
                                         -- classes a, b′: no verdict
  | Decided RecordedProblem Verdict
  | Faulted RecordedProblem InternalFault -- pending author Q1(a)

-- Classes a and b′ (requirements §2.3). Not semantic verdicts: they
-- say a static rule or a policy was broken, worded as such.
data StaticRefusal
  = StaticRule StaticCode Site           -- class a: names, sorts, ...
  | Policy PolicyCode Site               -- class b′: `r disjoint r`, ...

data Verdict
  = Solved Solution
  | Contradiction Evidence
  | Unresolved Unresolved
```

`StaticCode` and `PolicyCode` are ADTs over today's `Problem`
constructors (cited Domain/Problem.purs:77-160) that requirements §2.3
(class a; class b′) and T-R0e §3.2's last rows classify as static: for
instance `Unbound`, sort errors and `RecordRowAsEffect` for a;
`SameDisjoint` and `RepeatedTail` for b′. T-R0c audits record-model
refusals only; it classifies d03 as b′ (and a repeated `...r`,
unprobed) and supplies no class-a list. They stay distinct types so
that no semantic verdict can be built from a static code and the
reverse (proposed).

Open, not settled by any stream, **pending author Q4**: arity at a
fixed result (class a or c1; T-R0b §11 item 7), coverage (class a per
requirements §2.3 and T-R0e §3.2; Q-c1), the second spread (class a or
a support boundary; T-R0e Q3), Resolve's body-type checks (§7) and
`AmbiguousType` (P policy or class e; T-R0e Q5). Effect refusals are
class a only where they do not consume record metas the online solver
bound (requirements §2.3, classes a and f); which ones do is **pending
author Q3** (Q-c2).

**One outcome type** (reconciliation D1). T-R0e §3.1's flat `Outcome`
is not a second definition: it is a derived classification,
`layerOf ∷ DeclReport → Layered`, used for rendering and codes, with
its `Accepted` renamed `Compiled` so it does not clash with
`Attempt.Accepted` (§4.1). T-R0e owns `layerOf` and the codes; this
document owns the types it reads.

### 3.3 Solved

```purescript
type Solution =
  { strategy    ∷ StrategyName
  , validity    ∷ Valid                  -- token: hidden constructor
  , assurance   ∷ Assurance
  , compilation ∷ Compilation            -- W §1.6, adopted as defined
  }

-- What backs `validity`: the strategy's Sound_F theorem, or a statement
-- awaiting proof (an honest interim label; §10 step 4; Q9).
data Assurance = Proved TheoremRef | Pending StatementRef
```

`Valid` is minted only by a strategy's trusted `check` (§4.1). It is
evidence that one injected checker accepted this problem, nothing more
(requirements §4.4, `Sound_F`).

`Compilation`, `Witness`, `WitnessMeta` and `NoWitnessReason` are W's
(witness/statements.md §1.2, §1.6): `Compilation = Witnessed Witness |
NoWitness NoWitnessReason` (W §1.6, B2 adopted), where `Witness = {
bindings ∷ Map Var Binding, names ∷ WitnessMeta }`; a G0 substitution
is a `Witnessed` value with empty `names`. Which flexible variables
need a binding (every one, or only those whose `VarInfo` position is
not `Auxiliary`) is W's Cov, **pending author Q6**. A non-constructive
strategy gives `NoWitness (NonConstructive name)`. The absence of a
witness does not weaken the verdict; it blocks admission (§6).

Placement (proposed; this document owns it): `compilation` sits
inside `Solution`, so "`Witnessed` only with Solved" (W §5.1) holds by
construction and W's `NotSolved` reason is never needed here.
Alternative kept: W §5.1's placement beside the verdict, as
`Decided RecordedProblem Verdict Compilation`, with Contradiction and
Unresolved carrying `NoWitness NotSolved`.

### 3.4 Contradiction and its evidence

```purescript
data Evidence
  = ByRule Derivation                    -- ground (1)
  | ByCounterInstance Refuted            -- ground (2)

-- A sound rule applied to the whole D and original B atoms (ground 1).
type Derivation =
  { rule     ∷ SoundRule                 -- registry entry, §5.2
  , premises ∷ NonEmptyArray AtomId      -- original ids in B only
  , blame    ∷ Array Site                -- sources of the premises
  }

-- A counter-instance that passed CX's check (ground 2). `Refuted` has
-- a hidden constructor; only the CX checker makes one (§5.1).
newtype Refuted = Refuted CX

-- CX's certificate at base B ⊕ Nat (refute/statements.md §4), with
-- the sub-body it refutes. Checked as
-- CXChecked (withBody (toSig P) body) rho.
type CX = { rho ∷ Subst (B ⊕ Nat), body ∷ NonEmptyArray AtomId }
```

`AtomId` is T-R0b's (§6: `{ decl, path, index }`, the path being the
id and the span metadata). A derivation's premises are checked to be
original `B` ids (§5.2); the rule always reads the problem's whole `D`,
never a subset (CX C1-P: `withBody P B₀` keeps `P.D`; dropping `D`
atoms admits more rigid assignments, so it is unsound, reconciliation
F1). An atom rewritten by the online substitution has no id, so it
cannot be a premise (G-grounds, the author's check in §18.65). Blame
cites the premises' sources, so a contradiction's text names the
evidence (memory "blame needs evidence"; recon §4.4).

`CX` carries no `θR` and no atom field beyond `body`: `CXChecked` is a
bare `rho` checked against the renamed `D` and body (refute/
statements.md §4, CX-K). Sub-body soundness is CX-KP (refute/
statements.md §3-4: stated, expected true, unproved; CX-K is its case
`body = B`). `body` may be any non-empty sublist of `B`; the refuter's
assurance is CX-K/CX-KP's, **pending author Q10**.

### 3.5 Unresolved and its reasons

```purescript
type Unresolved =
  { reason   ∷ UnresolvedReason
  , attempts ∷ Array Attempt             -- every strategy and refuter run
  , hints    ∷ Array SearchHint          -- advisory text, §4.2
  }

-- Decision 9's three families, and only those.
data UnresolvedReason
  = Inference InferenceFailure           -- in scope; nothing accepted
  | Unsupported (NonEmptyArray Unsupport)-- outside the supported model
  | Limit (NonEmptyArray LimitAt)        -- a budget ran out

data InferenceFailure
  = NoStrategyApplies                    -- every guard declined
  | NoCandidate                          -- searches ended empty
  | NoAcceptedCertificate                -- candidates refused by check

data Unsupport
  = Outside OutsideKind                  -- T-R0b §3.5, §10
  | RequirementAtoms                     -- ValidOpenR unstated; Q2
  | GuardOutsideFragment StrategyName    -- e.g. not in LDFragment
  | SeveralTailSubtraction               -- T-R0e §3.2; B9 fallback, §10
  | SecondSpread                         -- T-R0e §3.2, B3; Q4
  | ClassF Question                      -- T-R0e §3.2, class f; Q3

-- One list for verdict and compilation stages: T-R0e §3.1's names.
-- T-R0e cites these types and adds only the layer of each.
type LimitAt = { limit ∷ LimitReached, site ∷ Site }
data LimitReached
  = InferredTypeDepth Int                -- 1,000 (H5)
  | SpecializationKeys Int               -- 10,000 (H6); lowering only
  | ReexaminationSteps                   -- `Exhausted`; Q1(b)
  | StrategyBudget StrategyName          -- fuel

-- Not an Unresolved reason (reconciliation D3): a separate outcome,
-- `Faulted` (§3.2), rendered with E_INTERNAL. Pending author Q1(a).
data InternalFault
  = CandidateRefused StrategyName CheckRefusal  -- search/check disagree
  | BothVerdicts StrategyName RefuterName       -- Solved and refuted
  | ReCheckFailed FunctionName Key              -- W §3.3, T-R0e §4
  | BrokenInvariant String
```

Proposed. Notes:

- The problem is not repeated in `Unresolved`: `Decided` already holds
  it (§3.2), so every verdict carries the state downstream needs. For
  Unresolved that state is the complete problem plus the attempt log,
  ready for a later strategy (G-grounds, ground 3).
- `NoAcceptedCertificate` is the reason requirements §7 gives `submit`
  under the cell strategy (cited table, "cell strategy" row).
- **A refusal reached through solver-chosen bindings is a hint, never
  a reason of its own.** T-R0e's `UnprovedRefusal` has no counterpart
  here: that case is `Inference NoCandidate` with the refusal kept as
  a `SearchHint` (§4.2). T-R0e's `NoStrategyAccepted` is this
  document's `InferenceFailure` together with the attempt log. T-R0e's
  `ForcednessUndecided` and `NoAdmissibleWitnessFound` are compilation
  refusals (§6), not verdict reasons; the latter exists only if G3's
  contract is adopted (§6). T-R0e's class-f case is not an inference
  failure; T-R0e §3.1 settles it as the `Unsupport` constructor
  `ClassF Question`, pending author Q3. T-R0e's second spread, if
  classified as a support boundary, is `SecondSpread` (pending author
  Q4).
- **D4 "Cannot tell" is not decision 3.** It is the online search
  stopping, so it is a hint, and absent another strategy's Solved the
  reason is `Inference NoCandidate`. T-R0c's c21 shows D4 refusing a
  forced split (T-R0c §3.8, §6 item 5). Only after some strategy
  Solves does P judge forcedness (§6; T-R0e §2).
- `RequirementAtoms` (**pending author Q2**). Proposed common wording
  (reconciliation E2): `BQ` atoms over ground types are judged by a
  stated ground rule (a function type is not printable or comparable:
  a definition, not `ValidOpenR`); `BQ` atoms that mention a flexible
  or rigid variable make the problem `Unsupported RequirementAtoms`
  for every strategy whose `Sound_F` does not cover them. A ground
  `BQ` atom that fails the ground rule gives Contradiction only once
  that rule is registered as a `SoundRule` with a proved theorem over
  the definitional extension (§5.2); until then `Unsupported
  RequirementAtoms` (part of Q2). Alternatives kept: (i) requirements
  §11 item 2 and T-R0b §10 as written, any non-empty `Q` or `BQ` (with
  T-R0b Sig10's `pr ⟦R⟧` for `main`, every program would be
  Unsupported); (ii) T-R0e §1.3, only a `BQ` atom that mentions a
  split part, other atoms judged as today.
- `ReexaminationSteps` (`Exhausted`, argued unreachable) is a limit
  under T-R0e's default; whether it is instead a fault is **pending
  author Q1(b)**.
- `Faulted` versus a reason: decision 9 names three reason families.
  A search/check disagreement or a failed internal re-check is "never
  evidence that the program is invalid" (§18.64 item 3) yet is not a
  limit, nor a missing feature, nor the program's fault, and
  docs/engineering.md ("Result boundary classification") keeps
  internal errors as their own class, as T-R0e §3.1 and W §3.3 do.
  Hence the separate outcome. Alternative kept: `Defect InternalFault`
  as a fourth `UnresolvedReason` (this document's earlier proposal).
- The code: one new `ErrorCode` constructor for Unresolved (decision
  9). Today D4 maps to `TypeMismatch` (cited Format/Diagnostic/
  Code.purs:55). Whether each reason gets its own code is deferred to
  the implementation plan (decision 9: "wording and fixture migration
  belong in its implementation plan").

## 4. Strategies

### 4.1 The strategy value

Requirements §4.4: a guard, an untrusted search, a trusted check, and,
if constructive, a witness description; each supplies `Sound_F`.

```purescript
-- What an implementation provides, with its certificate type `cert`.
type StrategySpec cert =
  { name    ∷ StrategyName               -- canonical; W/T-R0e cite it
  , sound   ∷ Assurance                  -- Sound_F, or its statement
  , guard   ∷ RecordedProblem → Guarded
  , search  ∷ Budget → RecordedProblem → Search cert
  , check   ∷ RecordedProblem → cert → Either CheckRefusal Valid
  , witness ∷ RecordedProblem → cert → Compilation   -- W's adapter
  }

data Guarded = InScope | OutOfScope Unsupport
data Search cert
  = Candidate cert (Array SearchHint)
  | NoCandidate SearchEnd (Array SearchHint)
data SearchEnd = Exhausted | OutOfBudget LimitReached

-- The certificate type is hidden by closing over it (an existential in
-- closure form), so `decide` can hold strategies of different formats
-- in one array without a type-level tag.
newtype Strategy = Strategy
  { name ∷ StrategyName
  , run  ∷ Budget → RecordedProblem → Attempt
  }

strategy ∷ ∀ cert. StrategySpec cert → Strategy
```

Proposed. `strategy` composes guard, search, check and witness in a
fixed order, and is the only way to make a `Strategy`. It answers
requirements §4.4's open point on "how `Cert tag` is represented in
PureScript" (a closure-packed existential; argued, idiomatic for
PureScript, which lacks first-class existentials). The guard is a
pre-filter only: a check may refuse a candidate that the guard
admitted (requirements §4.4 asks whether the cell `check` already
contains `fragmentS`; it does, so the cell guard may be `fragmentS`
itself or always `InScope`; either is sound because only `check` mints
`Valid`). A non-constructive strategy's `witness` returns `NoWitness
(NonConstructive name)`; an adapter that cannot express a value
returns `NoWitness (AdapterUnsupported feature)` (W §1.6).

```purescript
data Attempt
  = Declined StrategyName Unsupport
  | Searched StrategyName SearchEnd
  | CheckFailed StrategyName CheckRefusal -- a candidate failed check
  | Accepted StrategyName Valid Compilation
```

**Trust boundary** (argued). Trusted: each `check`, its `Sound_F`, the
evidence checks of §5, and `decide`'s combination rule (§5.3).
Untrusted: every `search`, every hint, the online solver whole. A
wrong search can only cost completeness (Unresolved), never soundness.
The witness adapter is inside the lowering trust boundary
(requirements §4.3; W's Adapt-N), not the validity one.

### 4.2 The online solver as one search strategy

Decision 1 demotes today's solver (`infer` through `Entry.check`,
Check/Function.purs:77-98) to a search. Proposed form:

```purescript
online ∷ Strategy
online = strategy
  { name: OnlineSolver
  , sound: Pending genericSubstitutionSound   -- bounded by CX C1-E
  , guard: always InScope
  , search: onlineSearch                      -- today's machinery
  , check: checkSubstitution                  -- trusted, new
  , witness: substitutionWitness              -- W's adapter
  }

onlineSearch ∷ Budget → RecordedProblem → Search Substitution
```

What it returns: on success, `Candidate σ`, where `σ` is the online
substitution **read back to problem variables** through the problem's
`vars` and `types` (T-R0b §5.2-5.3; As3): for each AST path, the type
the solver gave it. On failure, `NoCandidate Exhausted hints`, where
each hint keeps the solver's diagnostic (D4 "Cannot tell", H's D6, a
`lacks` refusal on substituted atoms, a several-tail placeholder) as
**advisory text**. A hint is rendered only as "the current solver
stopped here", never as the program's error (recon §4.4, "An
Unresolved text never says the program is wrong"). A D6 hint may also
seed a refuter's search (§5.1): a suggestion to check, never evidence.

Divided rows. Where the solver binds a meta to a division of a rigid
row (a settled `Merge`), `σ` is not a substitution generic in the
rigid variables. Two candidate formats follow, as two strategies
(proposed; the choice is the implementation plan's):

- **G0, generic substitution:** every flexible variable maps to a term
  over rigid variables; `checkSubstitution` checks each atom of `B`
  (and of `BQ`, per Q2) under `σ` against `D` (entailment of `lacks`
  and `disjoint` on rigid rows, ground predicates for ground
  requirement atoms). Needs a soundness statement; argued to be the
  standard check of a proposed unifier, no new machinery. Its scope is
  bounded by the same question as CX's C1-E (§11, Q-c3).
- **σ adapted to a cell certificate:** the search-side adapter of
  requirements §10 ("a per-format adapter on the search side"),
  then the cell `check` with `cellOpenImpl` as `Sound_F` (checked,
  requirements §1).

What it must never do: return a verdict, mint `Valid`, write into the
recorded problem, or be the only path by which a refusal reaches the
user. Its own `Either Diagnostic` chain stays inside `onlineSearch`
(§10 step 4).

### 4.3 Budgets

`Budget` is an injected value (fuel per strategy, depth bound, key
bound). Today's limits (`TypeTooDeep` at 1,000 levels; H5 in
recorder-spec §4) become `LimitReached` values with their sites
(`InferredTypeDepth`). A limit is never a contradiction
(docs/engineering.md, "Result boundary classification") and never
changes the recorded problem (§18.60, last bullet).

## 5. Refuters, rules, and the combination

**The projection** (reconciliation F2; adversarial finding 8). CX's
statements are over `SigProblem Label B`, not over `RecordedProblem`
(which has `app` heads, `q`/`bq`, canonical names and `outside`
entries). Rules and refuters therefore read `toSig P ∷ SigProblem`,
which keeps atom ids. Stated by CX as CX-PR, `ProjectionSound ValidR
toSig` (refute/statements.md §4.1: `¬ ValidOpen (toSig P) ⇒` the
recorded problem is invalid), under conditions on `toSig`:

- `toSig` may drop `B` atoms outside CX's `TExpr`, or generalize an
  `app` occurrence in `B` to a fresh flexible variable. Dropping is
  covered by C1-M; generalizing is argued.
- `toSig` must not drop or weaken a `D` atom: a smaller `D` admits more
  rigid assignments (F1). A problem whose `D` has an atom outside
  `TExpr` is out of scope for every rule and refuter (its verdict can
  only be Solved or Unresolved) until CX states otherwise.

Until CX-PR is proved for a defined `ValidR` (CX Q8; pending Q10), no
rule or refuter is registered (§10 step 5). `withBody` acts on the
projection; building it inside a checker does not breach §2's
property 2.

### 5.1 Refuters (CX; statements owned by the CX stream)

```purescript
type RefuterSpec =
  { name   ∷ RefuterName
  , sound  ∷ Assurance       -- RefuteSound (requirements' Refute_sound)
  , search ∷ Budget → Array SearchHint → RecordedProblem → Maybe CX
  , check  ∷ RecordedProblem → CX → Either RefuteRefusal Refuted
  }
```

`check` decides `CXChecked (withBody (toSig P) cx.body) cx.rho`
(refute/statements.md §4): `Scoped`, `rho` binding exactly the rigid
variables to ground expressions at `B ⊕ Nat`, `decideCall` true on the
substituted `D` and false on the substituted body. It is total and
decidable, and it is the only way to mint `Refuted`. Its soundness is
CX-K, and the interface property is `RefuteSound` (CX-R; the Lean name,
requirements' `Refute_sound`). Whether `BQ` atoms and non-record heads
(`Int` against `Bool`) are refutable by CX is that stream's (Q-d1,
pending author Q10).

### 5.2 Sound rules (ground 1)

```purescript
-- A registry entry. The constructor is hidden; entries are listed in
-- one module, each naming its proved soundness theorem.
newtype SoundRule = SoundRule
  { name    ∷ RuleName
  , theorem ∷ TheoremRef                 -- proved, never Pending
  , apply   ∷ SigProblem → Maybe Derivation
  }

checkDerivation ∷ RecordedProblem → Derivation → Either Unsound Evidence
```

`checkDerivation` checks that every premise id is an original atom of
this problem's `B`, and re-runs `apply` on `withBody (toSig P)
premises`, which keeps the whole `D` (CX C1-P; a rule's theorem is
C1-T's `C1Sound`, reduced to the prefix form by C1-M). It never
re-runs a rule on a subset of `D` (F1). A rule enters the registry
only with a proved theorem: unlike `Assurance` for strategies, there is
no `Pending` here, because a pending rule would give a semantic
rejection without ground (1) (requirements §2.3, class e: "a c1 rule
whose soundness is not yet proved").

Candidates are CX's (refute/statements.md §5), not T-R0c's: C1-H
(top-level head clash) and C1-O (occurs check), both via C1-U. Nested
head clashes, cancellation, row occurs checks through tails and
`lacks`/`disjoint` refutations are unstated in CX (CX Q4); T-R0c's
probes are evidence for them, not statements (reconciliation F4).
Whether to state them now is **pending author Q10**. C1-X (a clash
after an arbitrary substitution) is expected false and is never a
rule.

### 5.3 `decide`

```purescript
type Checking =
  { strategies ∷ Array Strategy          -- tried in order
  , refuters   ∷ Array Refuter
  , rules      ∷ Array SoundRule
  , budget     ∷ Budget
  }

decide ∷ Checking → RecordedProblem → Either InternalFault Verdict
```

Proposed rule:

1. **Outside markers** (reconciliation E1; **pending author Q3**).
   Proposed: a marker of a kind that T-R0b and T-R0c list as
   acceptance-relevant (the list is T-R0e Q6) blocks a whole-
   declaration Solved; other kinds do not. Until that list exists and
   each exempted kind carries an argument that the recorder drops no
   obligation behind it (adversarial finding 5: E17, E20 and E21 drop
   equations behind markers), **every kind counts as acceptance-
   relevant**, so the rule in force is T-R0b §10's: non-empty
   `outside` blocks Solved. Alternative kept: the kind-free rule
   permanently. Rules and refuters still run: a contradiction among
   modelled atoms is a contradiction of the whole, since the
   unmodelled obligations only add constraints (argued; it needs each
   recorded atom to be a genuine obligation, recorder correctness
   **R**, requirements §4.3).
2. Rules, then strategies in order, then refuters (seeded with the
   strategies' hints). The first `Accepted` gives Solved; a checked
   derivation or `Refuted` gives Contradiction.
3. Otherwise Unresolved, with the reason computed from the attempts:
   `Limit` if any attempt ran out of budget and none was refused by
   check; `Unsupported` if every strategy declined; `Inference`
   otherwise (`NoAcceptedCertificate` when a heuristic search's
   candidates were refused, as a cell search adapting a partial σ may
   be). When check refuses a candidate that its search presented as a
   solution of every atom (the online solver's `Solved` end; recon §6
   Q7 proposed an internal error there), the result is `Left
   (CandidateRefused …)`, reported as `Faulted` (pending Q1(a)).
4. A test-only `Checking` value may run every strategy and refuter and
   report `BothVerdicts` if both succeed (§9 AT7). This is a different
   injected value, not a flag.

Order affects cost and which strategy's witness is used, never which
verdict class results (argued: Solved and Contradiction cannot both be
sound for one problem). Witness choice when several strategies accept
is a G3 question (decision 6), not decided here.

## 6. The boundary to admission and lowering

Admission is owned by T-R0e (layers, codes, decision 3, R010, Task 8,
support boundaries) with W's `Adm_W` as A's rule. This document fixes
its input and output types; each refusal is tagged by T-R0e's layer, so
rendering picks T-R0e's code per layer (T-R0e I4):

```purescript
admit
  ∷ AdmissionRules                       -- injected (T-R0e)
  → Array { name ∷ FunctionName, outcome ∷ DeclOutcome }
  → Array { name ∷ FunctionName, admission ∷ Admission }

data Admission
  = Admitted
      { witness ∷ Witness                -- W §1.6
      , splits  ∷ SplitJudgement         -- P's output, W §1.7
      , status  ∷ AdmittedStatus         -- A's, W §2.3
      }
  | NotCompiled (NonEmptyArray CompileRefusal)
  | NotJudged                            -- not Solved; nothing to admit

-- W's AdmStatus without Inadmissible, which goes through AtA. Its
-- constructors share W's names, so the two need separate modules.
data AdmittedStatus = Admissible | AdmittedPendingR019

-- Canonical; T-R0e §3.1 cites it and adds only Construct and layerOf.
data CompileRefusal                      -- T-R0e's layers
  = AtP PolicyRefusal
  | AtA AdmissibilityRefusal
  | AtS SupportRefusal

data PolicyRefusal                       -- P: decision 3, per split site
  = SplitUnforced CallSite (Tuple Witness Witness)
                                         -- two valid witnesses differing
  | ForcednessUndecided CallSite         -- Q1(c), Q7
  -- No G3 constructor: G3 is held (dossier §18.66 decisions 6-7).

data AdmissibilityRefusal                -- A: R010, judged by Adm_W
  = Inadmissible CallSite Int            -- the judged slot i that fails
                                         -- (T-R0b's `Slot p i`)
  | ComponentBlocked FunctionName        -- a member not Solved; Q7

data SupportRefusal                      -- S
  = NotLowerable Construct Site          -- T-R0e §3.1's Construct
  | NoCompilation NoWitnessReason        -- W §1.6, incl. HoleContract
  | AdmissionLimit LimitReached          -- e.g. SpecializationKeys
```

Proposed. Points this interface is responsible for:

- **G3's refusal.** If G3's selection contract is adopted (T-R0e §2.4),
  `PolicyRefusal` gains `NoAdmissibleWitnessFound CallSite`: inside the
  contract's fragment, no valid, `Admissible` witness was found. The
  verdict stays Solved. Until then the constructor does not exist.
- **Validity is not admission.** A Solved declaration whose
  `compilation` is `NoWitness reason` gets `AtS (NoCompilation
  reason)` (decision 4: "a strategy may establish validity without
  supplying a compilation witness, but that alone cannot authorize
  lowering"). W's reasons survive, so `NonConstructive`,
  `AdapterUnsupported FieldReference` and `HoleContract Var` stay
  distinguishable. `HoleContract` is a `NoWitnessReason`, so it has
  this one encoding and no `Construct` of its own.
- **No compilation refusal changes the verdict** or the recorded
  problem (§18.60, last bullet; recorder-spec §2.4; T-R0e I3). A Solved
  declaration refused at admission, lowering or re-check stays Solved
  in its `DeclOutcome`; T-R0e's `Stage` values `AtAdmission`,
  `AtLowering` and `AtReCheck` become these layer-tagged refusals
  (reconciliation D2). Whether the renderer gives them the Unresolved
  code or per-layer codes is **pending author Q1(c)**.
- **Decision 3 evidence** (reconciliation C4). `SplitUnforced` must
  exhibit two valid witnesses that differ on the split (memory "blame
  needs evidence"; T-R0e §2.2). When forcedness is neither proved nor
  refuted, the refusal is `ForcednessUndecided`, never `SplitUnforced`.
  Whether a proof of non-forcedness without exhibited witnesses
  suffices is **pending author Q1(d)**; who decides forcedness, and
  whether the decider takes the problem or the `Solution`, is
  **pending author Q7**. P runs only on Solved declarations (D5).
- **A's status values** are W's `AdmStatus` (§2.3; T-R0e §1.4).
  `Admitted.status ∷ AdmittedStatus` records the two admitted values;
  W's `Inadmissible` is `AtA (Inadmissible site i)`, naming the slot
  that fails (T-R0e §1.4's evidence). `AdmittedPendingR019`: matches
  no active row of `Adm_W` (FK-W/FK-U rows active once adopted),
  name-free, admitted by `bareRow`. It compiles as today and is never
  a premise. After Task 8 it is refused, unless FK-U is proved and
  adopted, as `AtS (NotLowerable ComposedTailsUnjustified site)`,
  T-R0e's constructor, `site` the `adm` call site. Whether users see
  it is **pending author Q5**.
- **Several tails.** Lowering a row with several tails is `AtS
  (NotLowerable SeveralTailLowering site)` until Task 8 (T-R0e
  §3.1).
- **The ground re-check** (W §3 for content; T-R0e §4 for position,
  pending author Q8). A failure on a path the layering marks
  unsupported is `AtS (NotLowerable UncheckedPath site)`; any other
  failure is `ReCheckFailed`, reported as a fault (§7). Neither is
  ever Contradiction or evidence of invalidity (decision 5).
- **`ComponentBlocked`.** R010 judges a recursive component as a whole
  (Check/Instantiation.purs:28-29). If one member is Unresolved, the
  others are still Solved and reported so; only their admission waits.
  This keeps G-hide at the admission stage. It is tagged A (proposed:
  the component is R010's unit); pending Q7.
- **Specialization** runs only when every declaration reached from the
  entry is `Admitted`. Today's whole-program behaviour (any error fails
  compilation) is kept for the final result (proposed; **pending author
  Q9**, Q-A3), but all outcomes are reported.

## 7. The driver

```purescript
checkProgram
  ∷ Checking
  → AdmissionRules
  → Resolved.Program
  → Report

type Report =
  { entry    ∷ Either StaticRefusal Unit -- printableEntry, Check.purs:56
  , outcomes ∷ Array DeclReport          -- declaration order
  , program  ∷ Maybe Checked.Program     -- Just only if all admitted
  }

type DeclReport =
  { name      ∷ FunctionName
  , outcome   ∷ DeclOutcome
  , admission ∷ Admission
  , faults    ∷ Array InternalFault      -- re-check faults (§6)
  }
```

Proposed:

- Each declaration is generated and decided whatever happened to the
  others (G-hide). The only program-wide refusals that stop every
  declaration are Parse and Resolve (class a, justified) and, as today,
  the entry rule (Check.purs:21, judged before any body; class a).
- **Exception, pending author Q4** (reconciliation G1, from T-R0c §3.12
  and §6 item 3): Resolve's body-type `lacks`/disjointness checks
  (Resolve/Lacking.purs:126-167, Resolve/Apart.purs:141-158) are
  semantic, not class a. Proposed: they move into generation as T-R0b
  E13's definedness atoms and are decided by `decide` (a CX or a
  stated c1 rule); they no longer stop the program. Alternative kept:
  they stay Resolve refusals (class a), as requirements §2.3 lists
  "Resolve/*".
- `BQ` is part of `RecordedProblem`, so it exists before `decide` runs
  (G-BQ), by construction rather than by stage ordering.
- `Program.Compile` turns a `Report` into either Go or a non-empty
  array of diagnostics, rendered by Format. Today it returns one
  `Diagnostic` (cited Program/Compile.purs:15-16); the plural is a
  visible change (§10 step 1).
- Diagnostic relocation through a callee (`explained`, Check.purs:43-51)
  reads the callee's `DeclReport` (its recorded origins) instead of
  re-checking the callee.

## 8. Interface with T-R0b (assumptions)

The generator must satisfy these. T-R0b (r0/recorder-rules.md) is
canonical for the shape; each item cites where it does so.

- **As1, signatures.**
  `generate ∷ Tables → Signatures → Resolved.FunctionDecl
             → RecordedProblem`, and beside it
  `staticRules ∷ Tables → Resolved.FunctionDecl → Array StaticRefusal`.
  `generate` is pure, total on every resolved declaration (it never
  stops and never fails; T-R0b §1) and deterministic (equal inputs give
  equal problems, needed for AT1's equality). `Tables` are T-R0b
  G-local's, without the call graph's components (reconciliation A2).
- **As2, contents:** exactly T-R0b §10's `RecordedProblem` (`decl,
  rigidTy, rigidRow, flexTy, flexRow, d, q, b, bq, outside, adm, split,
  vars, types`). `adm` and `split` hold **sites** inside the problem;
  the admission judgements of those sites live beside it (§6). One
  ∀/∃ level per declaration, rigid universal, flexible existential
  (requirements §2.4; T-R0b §5.1). This document writes `D`, `Q`, `B`,
  `BQ` for `d`, `q`, `b`, `bq`.
- **As3, read-back:** `types` and `vars` (T-R0b §5.2) serve as the
  site table, per AST path; read-back follows T-R0b §5.3. The online
  search reads its result back through them (§4.2).
- **As4, atom identity:** every entry has an `Origin` whose `AtomId`
  (`{ decl, path, index }`, T-R0b §6) is stable. Ids are the only
  premises a derivation may cite (§5.2).
- **As5, the criterion:** the atoms one occurrence contributes do not
  depend on how any other atom was solved (requirements §2.4; T-R0b
  §1, by the function's type).
- **As6, unsupported constructs** become `outside` entries of an
  `OutsideKind` and generation continues; they never become a static
  refusal unless a static rule is broken.
- **As7, non-record types:** `B` includes the ordinary type equations
  (`eq t u` over all types), so that G0 and the head-clash rule can
  read them.
- **As8, callees:** instantiation reads only the callee's written
  signature, never its verdict or problem (confirmed, T-R0b §8).

## 9. Acceptance tests (stated, not implemented)

Each is a test of the interface; fixtures follow docs/engineering.md
(source, result class, exact text, primary location, notes). "The
oracle" is an independent syntax-directed translation, as in
research/composition-assessment/sig-oracle/run-source-boundary.mjs, and
T-R0b §9 item 1's independent translator.

| Id | Statement | Fixtures and oracle |
|---|---|---|
| AT1 (T-R0) | For each class d and e refusal, and each refusal resting on solver-chosen bindings: a fixture where the online solver refuses partway, and the recorded problem equals the oracle's translation, not a prefix | the fixture list is T-R0b §9 item 2's (canonical; it adds the E26 placeholder, B9 and H5); among them T-R0c's b04 (a `lacks` refusal after `shareTails`, class e) and b03 (class d, rule H); requirements §2.4 |
| AT2 | Those fixtures are never Contradiction; each is Solved or Unresolved with a reason | same; `submit`: `Inference NoAcceptedCertificate` under the cell strategy (requirements §7) |
| AT3 | G-hide: a program with an Unresolved `f` and a contradictory `g` after it reports both; a Solved `h` is reported Solved | two or three declarations; outcome order |
| AT4 | G-BQ: a body whose solver stops before a `print` or `==` site has that site's `pr`/`cmp` atom in `BQ` | cmp-c and pr-c shapes (recorder-spec §4) |
| AT5 | G-grounds: every Contradiction carries evidence that passes an independent check: premises are original `B` ids and the rule is registered; or `CXChecked (withBody (toSig P) body) rho` re-evaluates to true by brute force | `routeUndeclared` (CX `s = t = {x}`, recon §4.1); `markNoClause` (rigid overlap) |
| AT6 | A derivation citing a substituted atom, citing a `D` atom as a premise, or applied to a `D`-subset, or an unregistered rule, is refused by `checkDerivation` | injected bad derivations |
| AT7 | Monotonicity: adding a strategy turns Unresolved into Solved only; Contradictions are unchanged. The test-only `Checking` reports `BothVerdicts` on an injected unsound strategy | random problems over a small grammar, fixed before running |
| AT8 | The online solver is never a verdict: a stub search returning "refused" gives Unresolved; a stub returning a wrong σ is refused by check and gives `Faulted (CandidateRefused …)` (pending Q1(a)) | stubs injected as `Strategy` values |
| AT9 | G-lower: a stub strategy accepting with `NoWitness (NonConstructive …)` gives Solved and `AtS (NoCompilation …)`; specialization does not run | stub |
| AT10 | Static refusals stay static: `r disjoint r` is `Policy`, an arity error `StaticRule`; neither is a `Verdict`; the declaration keeps its problem; codes unchanged | existing SameDisjoint and Arity fixtures |
| AT11 | `outside` blocks Solved (`Unsupported`) but not Contradiction, for every kind counted acceptance-relevant (§5.3 rule 1; all kinds until Q3) | an `EffectArgument` construct beside a refutable atom |
| AT12 | A zero budget gives `Limit`, with the problem equal to the unlimited run's | injected `Budget` |
| AT13 | Independence: changing `f`'s body (not its signature), including adding a call that merges `f` and `g` into one component, leaves `g`'s problem and verdict unchanged | pairs of programs; needs T-R0b's component-free sites (§2 item 3) |
| AT14 | `ComponentBlocked`: in a recursive component with an Unresolved member, the Solved members stay Solved | `walk`-shaped pair |
| AT15 | Rendering: an Unresolved text never says the program is wrong, has the Unresolved code, and shows hints as the solver's limit | D4 fixtures in test/fixtures/r005b (recon §4.2) |
| AT16 | Result boundary: each reason, compilation refusal and fault constructor is produced by a test that injects it directly | classifier tests (docs/engineering.md) |

## 10. Migration map from today's code

Today (cited): `check` runs the entry rule (Check.purs:21), then
`traverse checkDefinition` (:22), whose first `Left` stops every later
declaration; then `instantiationRule` (:35) and `coverage` (:36) on the
whole program. `checkFunction` is one `Either` chain
(Check/Function.purs:77-98). `endReport` (EndReport.purs:24-47) turns
the end of a body into `Left` for D6, D4, placeholders, depth and
internal errors, with a catch-all arm at :43.

Each part of `checkFunction`, mapped (proposed):

| Today | Lines (Function.purs) | Becomes |
|---|---|---|
| `infer`, `require`, `settleRestricted`, `waitingAtEnd` | :78, :79, :81, :89 | inside `onlineSearch`; their `Left`s become hints, or static refusals where requirements §2.3 and T-R0e §3.2 class them a (open cases: §3.2, Q4) |
| `firstTooDeep`/`tooDeepAt` | :80 | `Limit InferredTypeDepth` |
| `judgeDeferrals`, mark check, `Entry.check` | :91, :92-94, :98 | effect rules: class a static checks where they do not read record metas; otherwise class f (Q-c2, Q3) |
| `comparable`, `printable` on the settled body | :96-97 | generation of `BQ` by rule (T-R0b); the ground judgement moves into G0's `check` (Q2) |
| `holes settled` | :107 | the witness (W's hole contract, §1.5) |

`endReport`'s arms (EndReport.purs:36-43), mapped:

- `FromMerge` (D6) → a hint.
- `undecided` (D4, :35) → a hint; the reason is `Inference
  NoCandidate` unless some strategy Solves, and then P judges
  forcedness (§3.5, §6).
- `Placeholder` → a hint; the reason is `Unsupported
  (GuardOutsideFragment …)` while no strategy covers several tails, if
  T-R0b §11 item 1 (several-tail removal in-model) is accepted;
  otherwise Unsupported with T-R0e's `SeveralTailSubtraction`
  (reconciliation A7).
- `TooDeep` → `Limit InferredTypeDepth`.
- `Unexpected` → `Faulted`; `Exhausted` → `Limit ReexaminationSteps`
  or `Faulted` (pending Q1(b)).
- The catch-all at :43 is replaced by one arm per `Failure`
  constructor (docs/engineering.md, "no catch-all").

Order (proposed; this document owns it; each step its own change with
its own tests):

1. **Types and the collecting driver.** Add `Domain.Verdict`; make
   `check` collect one outcome per declaration (wrapping today's
   `Either`) and `compile` return every diagnostic. Behaviour: more
   diagnostics per run; fixtures expecting one move. AT3, AT13.
2. **Classify today's refusals** (requirements §2.3, T-R0e §3.2, with
   T-R0c's evidence) into static, hint, limit, placeholder or fault;
   give D4 the Unresolved code (decision 9). Behaviour: codes of class
   d and e diagnostics change. AT10, AT15, AT16.
3. **The generator, beside the solver.** T-R0b's recorder as a pure
   function, run only in tests: AT1 against the oracle, AT4, AT13.
   No user-visible change.
4. **Generate, then search.** The driver calls `generate`, then
   `decide` with `online` as the only strategy; `checkFunction`
   becomes `onlineSearch`; `checkSubstitution` (G0) mints `Valid`
   with `Pending` assurance until its statement is approved (pending
   author Q9, Q-A2). AT2, AT8, AT9, AT12.
5. **Rules and refuters.** The rule registry (CX's stated and proved
   c1 rules: C1-H, C1-O; others once stated, Q10) and the CX refuter,
   both over `toSig` (§5). Only from this step may a record refusal be
   a Contradiction. AT5, AT6, AT7, AT11.
6. **Admission split** (T-R0e): `instantiationRule` and decision 3's
   check move to `admit`; the several-tail lowering placeholder becomes
   `AtS (NotLowerable SeveralTailLowering site)`. AT14.
7. **Further strategies** (the cell format via its adapter; later G1
   formats): new `Strategy` values only, the goal of requirements
   §4.4 (conditional on R0).

T-R0e's layer-specific steps (§6 there: A's three-valued status, the
D4 split, the ground re-check and E017, Task 8, G3, the second spread)
are inserted after step 6; T-R0e cites steps 1-5 here rather than
restating them (reconciliation H1). T-R0e's "complete generation" step
is step 3-4 here: T-R0b's generator produces `B` and `BQ` by rule,
independently of the online solver (decision 1).

Step ordering constraint (argued): steps 4 and 5 interact. Today some
refusals reached through solver-chosen bindings are worded as
contradictions (H's D6 on `route`, recon §4.1). Step 4 makes them
hints. Until step 5, genuine contradictions of the same kind (for
instance `Int` against `Bool` after substitution) would be Unresolved.
Either 5 lands with 4, or the window is accepted and documented
(pending author Q9, Q-A4). No order keeps today's false contradictions.

`coverage` (Check.purs:36) reads solved types of the checked program.
Requirements §2.3 and T-R0e §3.2 classify it as class a (a static
pass), and reconciliation E3 asks T-R0b to drop `Coverage` from
`OutsideKind`; whether it is class a or c1 is pending author Q4
(Q-c1).

## 11. Questions for other streams and for the author

Closed by other documents (reconciliation, "already answered"):

- **Q-b1** (As8): confirmed by T-R0b §8; generation reads written
  signatures only. If contract inference (INF001) arrives, the driver
  must order declarations by dependency, and G-hide needs restating.
- **Q-b2** (As3): per AST path (T-R0b §5.2); there is no
  local-generalization construct (T-R0b §3.5).
- **Q-b3:** effect rows are erased, not marked (T-R0b §2.2); only
  effect arguments are marked, so the fear that every program with
  effects is Unsupported applies only through §5.3 rule 1 (Q3).
- **Q-b4:** no; generation never fails (T-R0b §1; As1).
- **Q-w1:** answered by W §5.2 with reconciliation B2 (a G0
  substitution is `Witnessed` with empty `names`). Coverage of
  auxiliaries stays open as Q6.

Redirected:

- **Q-c3** (is a ground head clash after most-general unification of
  original `eq` atoms c1?) is CX's C1-E (`ClashAfterEntailedSound`,
  expected true) and CX Q5; T-R0c §1 supplies the argument that
  today's pre-end bindings are forced, which is C1-E's premise. Per
  §18.65, forcedness alone is not originality: a rule qualifies only
  as C1-E states it, over every solution of the original body, and
  only once proved. Pending author Q10.
- **Q-c1** (coverage; `NotComparable` on rigid operands): pending
  author Q4.
- **Q-c2** (which effect refusals read record metas): pending author
  Q3; not audited by T-R0c.
- **Q-d1** (does CX cover non-record types and `BQ` atoms; how is a
  counter-instance found from a hint): pending author Q10.
- **Q-e1** (`ComponentBlocked`; does the forcedness decider take the
  `Solution` or the problem?): pending author Q7. This document
  carries the problem in every `DeclOutcome` and exposes no forcedness
  query of its own.

For the author (the reconciliation's numbering):

- **Q1:** (a) `Faulted` as a separate outcome or `Defect` as an
  Unresolved reason (was Q-A1); (b) `Exhausted` as a limit or a fault;
  (c) the code for Solved declarations refused at admission, lowering
  or re-check; (d) whether `SplitUnforced` must always exhibit two
  witnesses.
- **Q2:** which `BQ` atoms make a problem Unsupported (§3.5).
- **Q3:** which `outside` kinds block Solved (§5.3 rule 1); effect
  refusals.
- **Q4:** the static boundary (§3.2, §7, §10).
- **Q5:** visibility of `AdmittedPendingR019` (§6).
- **Q6:** which flexible variables a witness must bind (§3.3).
- **Q7:** the forcedness decider and `ComponentBlocked` (§6).
- **Q8:** placement and cost of the ground re-check (§6).
- **Q9:** `Pending` assurance on Solved (was Q-A2); compile when every
  reached declaration is admitted (was Q-A3); land steps 4 and 5
  together or accept a documented window (was Q-A4).
- **Q10:** CX and c1 scope: sub-body certificates (§3.4), the
  projection `toSig` (§5), unstated rules (§5.2), C1-E (Q-c3).

## 12. Provenance

Read for this document: requirements.md (revision 2, whole); dossier
§18.60-18.66; recorder-spec §1-2, §4-7; recon §2, §4, §5.3, §6;
docs/engineering.md ("Evidence for solvers", "Result boundary
classification"); src/Features/Check.purs, Check/Function.purs,
Check/EndReport.purs, Check/RowOutcome.purs, Program/Compile.purs,
Domain/Problem.purs, Format/Diagnostic/Code.purs. For revision 1:
the reconciliation and adversarial reviews of 88c052d; r0/recorder-
rules.md §1, §5.2, §6, §8-10; witness/statements.md §1.2, §1.5-1.6,
§5; r0/boundaries.md §3-4, §7; refute/statements.md §4-5. No code was
run. The closure-packed existential (§4.1) and the hidden-constructor
tokens follow existing practice (`Settled`, RowOutcome.purs:41; the
enforced Internal boundaries in AGENTS.md); no new machinery is
proposed beyond the composition of the published pieces named above.

## Revision log (reviews of 88c052d)

Applied (reconciliation): A1 (total `generate`, `staticRules` beside
it, `Refused` keeps the problem, Q-b4 closed); A2's consequence (§2
item 3, As1, AT13 need component-free sites); A3 (As3; Q-b2 closed);
A4 (As2 and G-complete cite T-R0b §10; sites inside, judgements
beside); A7 (`Placeholder` mapping, conditional on T-R0b §11 item 1;
not in the brief's list, but it edits this document); B1 (`Solution.
compilation ∷ Compilation`; adapter, `Attempt.Accepted`, `Admitted`;
`NameWitness` gone); B5 (`NoCompilation NoWitnessReason`); B6
(`StrategyName` canonical); C4 (`SplitUnforced` with two witnesses,
`ForcednessUndecided`; `SplitNotDetermined` dropped); C5
(`NotCompiled`, refusals tagged P/A/S); D1 (this document stays
canonical; T-R0e's flat type is `layerOf`); D3 (`Faulted`, a separate
outcome); D4 (`Outside OutsideKind`; one limit list with T-R0e's names
and sites; `UnprovedRefusal` folded into hints); D5 (D4 is a hint and
`Inference NoCandidate`; c21 note); E1 (§5.3 rule 1, AT11); E2 (§3.5);
F1 (premises in `B` only, whole `D`; AT6); F2 (§5, `toSig`); F3 (`CX`
as `{ rho, body }`, checked by `CXChecked`); F5 (Q-c3 redirected to
C1-E); F6 (`RefuteSound`); G1 (§7 exception); G4 (AT1 cites b04 and
b03); G5 (§3.2 cites requirements §2.3 and T-R0e §3.2; gaps named);
H1 (§10 owns the order; T-R0e's steps after step 6); I1 (AT1 cites
T-R0b §9 item 2); I2 (assumptions renamed As1-As8). Also F4's
consequence (§5.2 cites CX §5, not T-R0c).

Applied (adversarial): 8 (outcome placement reconciled as above;
`generate` total; `checkDerivation` builds `withBody` on the
projection `toSig P`, not on the opaque `RecordedProblem`).

Pending author rulings: Q1(a) `Faulted` versus `Defect`; Q1(b)
`Exhausted`; Q1(c) codes of compilation refusals; Q1(d) two witnesses;
Q2 requirement atoms; Q3 outside kinds and effect refusals; Q4 the
static boundary (arity, coverage, second spread, Resolve body-type
checks, `AmbiguousType`); Q5 `AdmittedPendingR019`; Q6 witness
coverage; Q7 forcedness decider and `ComponentBlocked`; Q8 the
re-check; Q9 `Pending` assurance, compile scope, steps 4-5; Q10
sub-body certificates, `toSig`, unstated c1 rules, C1-E.

Disagreements and tightenings (with reasons):

- **E1, applied with a safer default.** Making only acceptance-
  relevant kinds block Solved is kept as the proposal, but until the
  list exists every kind counts. Adversarial finding 5 shows the
  recorder drops real equations behind E17, E20 and E21's markers, so
  exempting a kind without an argument would let Solved hide a dropped
  obligation.
- **F2, tightened.** The reconciliation lets `toSig` drop atoms
  outside `TExpr`; that is sound for `B` (C1-M) but not for `D`, by
  F1's own argument. `D` atoms are never dropped; such a problem is out
  of the refuters' scope.
- **F3.** Revision 1 kept `CX.body` the whole of `B` until CX stated
  CX-P; CX now states CX-P and CX-KP, so the sub-body form is adopted
  (consistency re-check R6, below).
- **C5, a choice the review left open:** `ComponentBlocked` is tagged
  A (R010's unit is the component), pending Q7.

### Consistency re-check (39320ad)

Applied from the consistency re-check of the R0 documents:

- **R1.** §6's `CompileRefusal` is canonical; T-R0e §3.1 cites it.
  `NotLowerable` carries a `Site`; `NoCompilation` takes W's
  `NoWitnessReason`, which includes `HoleContract Var`; the re-check's
  unsupported path stays `AtS (NotLowerable UncheckedPath site)`.
- **R2.** `Compilation = Witnessed Witness | NoWitness
  NoWitnessReason` (W §1.6, B2 adopted), the conditional dropped;
  `SplitUnforced` exhibits two `Witness` values.
- **R3.** `Admitted` carries `witness`, P's `splits ∷ SplitJudgement`
  and A's `status` (W §1.7, §2.3); `Inadmissible` goes through `AtA`.
- **R5.** §3.5: a ground `BQ` atom failing the ground rule is
  Contradiction only through a registered, proved `SoundRule`;
  otherwise `Unsupported RequirementAtoms` (Q2).
- **R6.** §3.4: sub-body soundness is CX-KP; `body` is any non-empty
  sublist of `B`; the F3 log entry above is corrected.
- **R7.** §5 cites CX-PR; no rule or refuter is registered until it is
  proved for a defined `ValidR` (CX Q8; Q10).
- **R9.** RC1-RC6 in §0; "T-R0b Sig10" in §3.5.
- **R10.** `AdmittedPendingR019` worded as W §2.3; after Task 8 it is
  refused with T-R0e's `ComposedTailsUnjustified`.
- **R13.** §10's B9 fallback is `SeveralTailSubtraction`, added to
  `Unsupport`.

R11 needs no edit here: T-R0e §7 maps its old question numbers, so the
citations of T-R0e Q3, Q5 and Q6 stand.

### Residual harmonization

Residual mismatches with T-R0e left by R1, resolved here and in T-R0e:

- T-R0e §3.1 now cites `UnresolvedReason`, `Unsupport`, `LimitAt` and
  `LimitReached` instead of defining its own `Reason`. `Unsupport`
  gains `SecondSpread` (Q4) and `ClassF Question` (Q3), T-R0e's
  verdict-stage constructs; §3.5's note on class f is updated.
- `Inadmissible CallSite Int` names the slot that fails (T-R0e §1.4's
  evidence); §6 says how W's three-valued `AdmStatus` maps to
  `AdmittedStatus` and `AtA (Inadmissible site i)`.
- §6 notes that `PolicyRefusal` gains `NoAdmissibleWitnessFound
  CallSite` only if G3's contract is adopted (G3 held, §18.66
  decisions 6-7); §3.5 cross-refers.
- `ComposedTailsUnjustified` takes no argument: the refusal is `AtS
  (NotLowerable ComposedTailsUnjustified site)`.
