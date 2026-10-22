# T-R0a: the generation and verdict interface (generate-then-decide)

Date: 2026-10-21. Base: 67ba706. Stream T-R0a of the design tranche the
author authorized in dossier §18.66 (decision 1: **generate-then-
decide**). **A design document only:** no compiler change, no prototype,
no proof. It specifies interfaces as typed pseudo-signatures
(PureScript-flavoured; not compiled) and prose.

Labels, as in requirements.md (revision 2): **cited** (file:line or
section, at 67ba706), **argued** (reasoning, unchecked), **proposed** (a
design choice awaiting the author), **predicted** (about today's
compiler, not run). Every pseudo-signature is proposed unless marked.

Planning basis: research/division-campaign/remedy/requirements.md
("requirements" below), especially §2 (R0), §4.4 (strategy interface,
verdicts) and §9 (decisions, as ruled in dossier §18.66).

Ownership. This document owns the pipeline's stage boundaries, the
outcome and verdict types, the strategy, refuter and evidence
interfaces, the driver, and the migration order. It does **not** own:

| Item | Owner | Referenced here as |
|---|---|---|
| the shape and translation rules of the recorded problem | T-R0b (syntax-directed recorder specification) | `RecordedProblem`, assumptions in §8 |
| classification of each existing refusal; c1 rule candidates | T-R0c (refusal audit) | `RefusalClass`, `SoundRule` |
| counter-instance statements | the CX stream (dossier §18.66, "CX's exact statements") | `CX`, `Refute_sound` |
| per-name witness metadata, termination | research/division-campaign/witness/statements.md | `NameWitness` |
| decision 3, R010, Task 8 and support boundaries | T-R0e | `Admission`, §6 |

## 1. Requirements this interface must meet

From requirements §2.4 and dossier §18.66 (cited); each is tested in §9.

- **G-complete.** The decision stages read a complete recorded problem
  (`D`, `B`, `BQ`, `outside`, and the policy and admissibility records)
  or nothing. A prefix is never decided (requirements §2.4, "Criterion";
  §18.61 "Moving the end-of-body gate alone does not suffice").
- **G-grounds.** Only (1) a rule proved sound for `ValidOpen`, applied
  to original recorded atoms and `D`, or (2) a checked counter-instance
  yields Contradiction. (3) Solver failure yields Unresolved and
  preserves the problem (requirements §2.4, "Three grounds").
- **G-early.** Only classes a and b′ may stop generation; class c may
  but need not (requirements §2.3 table, §2.4 "Who may stop early").
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
  │ resolve (program-wide; class a)                       today, unchanged
  ▼
for each declaration f, independently:
  generate   : Resolved f ─▶ Static refusal (class a, b′)
                           │ RecordedProblem (complete; G-complete)
  decide     : RecordedProblem ─▶ Verdict
               ├ refuters (c1 rules, CX)      ─▶ Contradiction evidence
               ├ strategies: guard, search, check ─▶ Accepted (Solved)
               └ otherwise                   ─▶ Unresolved reason
then, program-wide:
  admit      : Solved declarations + components ─▶ Admission per decl
  specialize : only if every reached declaration is Admitted
```

Proposed. Four properties of this shape, argued:

1. **Generation emits no semantic verdict.** It is a pure
   syntax-directed function of the resolved declaration and the
   signatures it references. It stops only for classes a and b′.
   Class c is *permitted* to stop generation (requirements §2.3) but
   this design does not use the permission: every semantic verdict
   comes from `decide`, which keeps the three grounds in one place.
   (A c1 rule is monotone, so running it after generation loses
   nothing; requirements §2.4.)
2. **`decide` reads only a complete problem.** `RecordedProblem` is
   opaque; its constructor is exported only to the generator (§3.1),
   so a prefix cannot be built and handed to `decide`.
3. **Declarations are independent until admission.** Today a body's
   check reads callees' written signatures, not their verdicts
   (environment, Check/Function.purs:43-61, takes the resolved
   program; predicted, to be confirmed by T-R0b, §8 Q-b1). So each
   declaration's generation and verdict depend only on its own syntax
   and the program's signatures. Admission is the first program-wide
   stage after resolve, because R010 judges recursive components
   (Check/Instantiation.purs:25-29).
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
| generator | `Features.Check.Generate.*` (T-R0b) | pure; may import Checked.Internal |
| `decide`, driver | `Features.Check.Decide`, `Features.Check` | pure |
| strategies (online, cell, later formats) | `Features.Check.Strategy.*` | pure; search untrusted, check trusted |
| refuters, rule registry | `Features.Check.Refute.*` | pure |
| admission | `Features.Check.Admit.*` (T-R0e) | pure |
| texts and codes | `Format.Diagnostic.*`, `Format/Diagnostic/Code.purs` | Features report data, never text |
| the composition root choosing strategies | `Program.Compile` | injection happens at the outermost layer |

### 3.2 Outcomes

```purescript
-- One per declaration, in declaration order. Never a bare Diagnostic.
data DeclOutcome
  = Refused StaticRefusal                -- classes a, b′: no verdict
  | Decided RecordedProblem Verdict      -- the problem is always kept

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

`StaticCode` and `PolicyCode` are ADTs whose constructors are today's
`Problem` constructors that T-R0c classifies as a or b′ (for instance
`Arity`, `Unbound` and `RecordRowAsEffect` for a; `SameDisjoint` and
`RepeatedTail` for b′; cited Domain/Problem.purs:77-160).
They stay distinct types so that no semantic verdict can be built from a
static code and the reverse (proposed). Effect refusals are class a only
where they do not consume record metas the online solver bound
(requirements §2.3, class a and f); see §8 Q-b4.

### 3.3 Solved

```purescript
type Solution =
  { strategy  ∷ StrategyName
  , validity  ∷ Valid                    -- token: hidden constructor
  , assurance ∷ Assurance
  , witness   ∷ Maybe NameWitness        -- Nothing: non-constructive
  }

-- What backs `validity`: the strategy's Sound_F theorem, or a statement
-- awaiting proof (an honest interim label; §10 step 4, Q-A2).
data Assurance = Proved TheoremRef | Pending StatementRef
```

`Valid` is minted only by a strategy's trusted `check` (§4.1). It is
evidence that one injected checker accepted this problem, nothing more
(requirements §4.4, `Sound_F`). `witness` is the per-name metadata of
witness/statements.md (decision 4), filled only by a constructive
strategy. Its absence does not weaken the verdict; it blocks admission
(§6).

### 3.4 Contradiction and its evidence

```purescript
data Evidence
  = ByRule Derivation                    -- ground (1)
  | ByCounterInstance Refuted            -- ground (2)

-- A sound rule applied to original atoms only (ground 1).
type Derivation =
  { rule     ∷ SoundRule                 -- registry entry, §5.2
  , premises ∷ NonEmptyArray AtomId      -- ids in D and B, as recorded
  , blame    ∷ Array Site                -- sources of the premises
  }

-- A counter-instance that passed CX's check (ground 2). `Refuted` has
-- a hidden constructor; only the CX checker makes one (§5.1).
newtype Refuted = Refuted { instance ∷ CX, refutes ∷ NonEmptyArray AtomId }
```

`AtomId` names an atom of the recorded problem as generated
(recorder-spec §5.1, "recorded as generated"). A derivation's premises
are checked to be original ids (§5.2); an atom rewritten by the online
substitution has no id, so it cannot be a premise (G-grounds, the
author's check in §18.65). Blame cites the premises' sources, so a
contradiction's text names the evidence (memory "blame needs evidence";
recon §4.4).

### 3.5 Unresolved and its reasons

```purescript
type Unresolved =
  { reason   ∷ UnresolvedReason
  , attempts ∷ Array Attempt             -- every strategy and refuter run
  , hints    ∷ Array SearchHint          -- advisory text, §4.2
  }

data UnresolvedReason
  = Inference InferenceFailure           -- in scope; nothing accepted
  | Unsupported (NonEmptyArray Unsupport)-- outside the supported model
  | Limit (NonEmptyArray LimitReached)   -- a budget ran out
  | Defect InternalFault                 -- proposed fourth; Q-A1

data InferenceFailure
  = NoStrategyApplies                    -- every guard declined
  | NoCandidate                          -- searches ended empty
  | NoAcceptedCertificate                -- candidates refused by check

data Unsupport
  = Outside OutsideMarker                -- recorder-spec §2.5 markers
  | RequirementAtoms                     -- ValidOpenR unstated
  | GuardOutsideFragment StrategyName    -- e.g. not in LDFragment

data LimitReached
  = Depth Int | Fuel StrategyName | KeyCount Int

data InternalFault
  = CandidateRefused StrategyName CheckRefusal  -- search/check disagree
  | BothVerdicts StrategyName RefuterName       -- Solved and refuted
  | BrokenInvariant String
```

Proposed. Notes:

- The problem is not repeated in `Unresolved`: `Decided` already holds
  it (§3.2), so every verdict carries the state downstream needs. For
  Unresolved that state is the complete problem plus the attempt log,
  ready for a later strategy (G-grounds, ground 3).
- `NoAcceptedCertificate` is the reason requirements §7 gives `submit`
  under the cell strategy (cited table, "cell strategy" row).
- `RequirementAtoms` follows requirements §11 item 2: until
  `ValidOpenR` is stated, a non-empty `BQ` that mentions a variable is
  unsupported for every strategy whose `Sound_F` does not cover it.
- Decision 9 names three reasons. `Defect` is a proposed fourth,
  because a search/check disagreement or a failed internal re-check is
  "never evidence that the program is invalid" (§18.64 item 3) yet is
  not a limit, nor a missing feature, nor the program's fault.
  docs/engineering.md ("Result boundary classification") keeps internal
  errors as their own class. The author may prefer a fourth top-level
  outcome instead (Q-A1).
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
  { name    ∷ StrategyName
  , sound   ∷ Assurance                  -- Sound_F, or its statement
  , guard   ∷ RecordedProblem → Guarded
  , search  ∷ Budget → RecordedProblem → Search cert
  , check   ∷ RecordedProblem → cert → Either CheckRefusal Valid
  , witness ∷ Maybe (RecordedProblem → cert → Maybe NameWitness)
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
`Valid`).

```purescript
data Attempt
  = Declined StrategyName Unsupport
  | Searched StrategyName SearchEnd
  | CheckFailed StrategyName CheckRefusal -- a candidate failed check
  | Accepted StrategyName Valid (Maybe NameWitness)
```

**Trust boundary** (argued). Trusted: each `check`, its `Sound_F`, the
evidence checks of §5, and `decide`'s combination rule (§5.3).
Untrusted: every `search`, every hint, the online solver whole. A
wrong search can only cost completeness (Unresolved), never soundness.
The witness function is inside the lowering trust boundary
(requirements §4.3), not the validity one.

### 4.2 The online solver as one search strategy

Decision 1 demotes today's solver (`infer` through `Entry.check`,
Check/Function.purs:77-98) to a search. Proposed form:

```purescript
online ∷ Strategy
online = strategy
  { name: OnlineSolver
  , sound: Pending genericSubstitutionSound   -- statement: Q-c3
  , guard: always InScope
  , search: onlineSearch                      -- today's machinery
  , check: checkSubstitution                  -- trusted, new
  , witness: Just substitutionWitness
  }

onlineSearch ∷ Budget → RecordedProblem → Search Substitution
```

What it returns: on success, `Candidate σ`, where `σ` is the online
substitution **read back to problem variables** through the problem's
site table (§8 A3): for each occurrence site, the type the solver gave
it. On failure, `NoCandidate Exhausted hints`, where each hint keeps
the solver's diagnostic (D4 "Cannot tell", H's D6, a `lacks` refusal on
substituted atoms) as **advisory text**. A hint is rendered only as
"the current solver stopped here", never as the program's error
(recon §4.4, "An Unresolved text never says the program is wrong").
A D6 hint may also seed a refuter's search (§5.1): a suggestion to
check, never evidence.

Divided rows. Where the solver binds a meta to a division of a rigid
row (a settled `Merge`), `σ` is not a substitution generic in the
rigid variables. Two candidate formats follow, as two strategies
(proposed; the choice is the implementation plan's):

- **G0, generic substitution:** every flexible variable maps to a term
  over rigid variables; `checkSubstitution` checks each atom of `B` and
  `BQ` under `σ` against `D` (entailment of `lacks` and `disjoint` on
  rigid rows, ground predicates for ground requirement atoms). Needs a
  soundness statement (Q-c3); argued to be the standard check of a
  proposed unifier, no new machinery.
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
recorder-spec §4) become `LimitReached` values. A limit is never a
contradiction (docs/engineering.md, "Result boundary classification")
and never changes the recorded problem (§18.60, last bullet).

## 5. Refuters, rules, and the combination

### 5.1 Refuters (CX; statements owned by the CX stream)

```purescript
type RefuterSpec =
  { name   ∷ RefuterName
  , sound  ∷ Assurance                   -- Refute_sound (requirements §4.4)
  , search ∷ Budget → Array SearchHint → RecordedProblem → Maybe CX
  , check  ∷ RecordedProblem → CX → Either RefuteRefusal Refuted
  }
```

`CX` is the counter-instance the CX statement describes: an injective
base map `i`, a ground substitution of the rigid variables denoting a
finite `θR`, `Sat θR (P.mapBase i).D`, and `B` refuted there
(requirements §4.4, "Proposed **CX**"). This document fixes only that
`check` is total and decidable on a recorded problem and that only it
mints `Refuted`. Whether `BQ` atoms and non-record heads (`Int` against
`Bool`) are refutable by CX is a question for that stream (Q-d1).

### 5.2 Sound rules (ground 1)

```purescript
-- A registry entry. The constructor is hidden; entries are listed in
-- one module, each naming its proved soundness theorem.
newtype SoundRule = SoundRule
  { name    ∷ RuleName
  , theorem ∷ TheoremRef                 -- proved, never Pending
  , apply   ∷ RecordedProblem → Maybe Derivation
  }

checkDerivation ∷ RecordedProblem → Derivation → Either Unsound Evidence
```

`checkDerivation` checks that every premise id is an original atom of
`D` or `B` of this problem, and re-runs `apply` on those premises
alone. A rule enters the registry only with a proved theorem: unlike
`Assurance` for strategies, there is no `Pending` here, because a
pending rule would give a semantic rejection without ground (1)
(requirements §2.3, class e: "a c1 rule whose soundness is not yet
proved"). Candidates are T-R0c's (a ground head clash between original
atoms, an occurs check on original atoms, `lacks`/`disjoint`
refutations from original atoms).

### 5.3 `decide`

```purescript
type Checking =
  { strategies ∷ Array Strategy          -- tried in order
  , refuters   ∷ Array Refuter
  , rules      ∷ Array SoundRule
  , budget     ∷ Budget
  }

decide ∷ Checking → RecordedProblem → Verdict
```

Proposed rule:

1. If `outside` is non-empty, no strategy may return Solved for the
   whole declaration (recorder-spec §2.5). Rules and refuters still
   run: a contradiction among modelled atoms is a contradiction of the
   whole, since the unmodelled obligations only add constraints
   (argued; it needs each recorded atom to be a genuine obligation,
   recorder correctness **R**, requirements §4.3).
2. Rules, then strategies in order, then refuters (seeded with the
   strategies' hints). The first `Accepted` gives Solved; a checked
   derivation or `Refuted` gives Contradiction.
3. Otherwise Unresolved, with the reason computed from the attempts:
   `Limit` if any attempt ran out of budget and none was refused by
   check; `Unsupported` if every strategy declined; `Defect` when check
   refuses a candidate that its search presented as a solution of every
   atom (the online solver's `Solved` end; recon §6 Q7 proposed an
   internal error there); else `Inference` (`NoAcceptedCertificate`
   when a heuristic search's candidates were refused, as a cell search
   adapting a partial σ may be).
4. A test-only `Checking` value may run every strategy and refuter and
   report `BothVerdicts` if both succeed (§9 AT7). This is a different
   injected value, not a flag.

Order affects cost and which strategy's witness is used, never which
verdict class results (argued: Solved and Contradiction cannot both be
sound for one problem). Witness choice when several strategies accept
is a G3 question (decision 6), not decided here.

## 6. The boundary to admission and lowering

Admission is owned by T-R0e (decision 3, R010, Task 8, support
boundaries). This interface fixes only its input and output:

```purescript
admit
  ∷ AdmissionRules                       -- injected (T-R0e)
  → Array { name ∷ FunctionName, outcome ∷ DeclOutcome }
  → Array { name ∷ FunctionName, admission ∷ Admission }

data Admission
  = Admitted CompilationWitness
  | NotAdmitted (NonEmptyArray AdmissionRefusal)
  | NotJudged                            -- not Solved; nothing to admit

data AdmissionRefusal
  = NoWitness StrategyName               -- decision 4
  | SplitNotDetermined CallSite          -- decision 3, G3
  | NotAdmissible CallSite               -- R010
  | ComponentBlocked FunctionName        -- a member is not Solved
  | NotLowerable SupportGap              -- e.g. several tails, Task 8
  | AdmissionLimit LimitReached
```

Proposed. Points this interface is responsible for:

- **Validity is not admission.** A Solved declaration with `witness =
  Nothing` gets `NoWitness` (decision 4: "a strategy may establish
  validity without supplying a compilation witness, but that alone
  cannot authorize lowering"). No admission refusal changes the
  verdict or the recorded problem (§18.60, last bullet; recorder-spec
  §2.4).
- **`CompilationWitness`** is built from `NameWitness`
  (witness/statements.md), plus whatever T-R0e's checks add. Its
  contents, the T1 marker separating witness-bound names from holes,
  and the termination theorem are that stream's.
- **`ComponentBlocked`.** R010 judges a recursive component as a whole
  (Check/Instantiation.purs:28-29). If one member is Unresolved, the
  others are still Solved and reported so; only their admission waits.
  This keeps G-hide at the admission stage.
- **Specialization** runs only when every declaration reached from the
  entry is `Admitted`. Today's whole-program behaviour (any error fails
  compilation) is kept for the final result (proposed; Q-A3), but all
  outcomes are reported.

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
  { name ∷ FunctionName, outcome ∷ DeclOutcome, admission ∷ Admission }
```

Proposed:

- Each declaration is generated and decided whatever happened to the
  others (G-hide). The only program-wide refusals that stop every
  declaration are Parse and Resolve (class a, justified) and, as today,
  the entry rule (Check.purs:21, judged before any body; class a).
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

The generator must satisfy these; each is an assumption on the shape
of recorder-spec §2.1, stated so T-R0b can confirm or reject it.

- **A1, signature.**
  `generate ∷ Signatures → Resolved.FunctionDecl
             → Either StaticRefusal RecordedProblem`;
  pure, total on every resolved declaration, and deterministic (equal
  inputs give equal problems, up to nothing: needed for AT1's
  equality).
- **A2, contents** (recorder-spec §2.1): `R`, `Tr`, `D` computed from
  the declaration, `Q`, `B` raw as generated, `BQ` from the unsettled
  body, `adm`, `split`, `outside`; one ∀/∃ level per declaration,
  rigid universal, flexible existential (requirements §2.4).
- **A3, a site table:** each syntactic occurrence (dead `let`s
  included) maps to the problem variables it introduced. The online
  search reads its result back through this table (§4.2). This
  replaces recorder-spec's `vars` map to checker metas, which assumed
  the recorder ran inside the solver.
- **A4, atom identity:** every atom of `D`, `B`, `BQ` has a stable
  `AtomId` and an origin (contract, types, body, inst; recorder-spec
  §1.1). Ids are the only premises a derivation may cite (§5.2).
- **A5, the criterion:** the atoms one occurrence contributes do not
  depend on how any other atom was solved (requirements §2.4).
- **A6, unsupported constructs** become `outside` markers and
  generation continues; they never become a static refusal unless a
  static rule is broken.
- **A7, non-record types:** `B` includes the ordinary type equations
  (`eq t u` over all types), so that G0 and the head-clash rule can
  read them.
- **A8, callees:** instantiation reads only the callee's written
  signature, never its verdict or problem.

## 9. Acceptance tests (stated, not implemented)

Each is a test of the interface; fixtures follow docs/engineering.md
(source, result class, exact text, primary location, notes). "The
oracle" is an independent syntax-directed translation, as in
research/composition-assessment/sig-oracle/run-source-boundary.mjs.

| Id | Statement | Fixtures and oracle |
|---|---|---|
| AT1 (T-R0) | For each class d and e refusal, and each refusal resting on solver-chosen bindings: a fixture where the online solver refuses partway, and the recorded problem equals the oracle's translation, not a prefix | `route` (H's D6 today), `walk` (W1, D4), `submit` (D6, predicted), a `lacks` refusal after `shareTails`; requirements §2.4 |
| AT2 | Those fixtures are never Contradiction; each is Solved or Unresolved with a reason | same; `submit`: `Inference NoAcceptedCertificate` under the cell strategy (requirements §7) |
| AT3 | G-hide: a program with an Unresolved `f` and a contradictory `g` after it reports both; a Solved `h` is reported Solved | two or three declarations; outcome order |
| AT4 | G-BQ: a body whose solver stops before a `print` or `==` site has that site's `pr`/`cmp` atom in `BQ` | cmp-c and pr-c shapes (recorder-spec §4) |
| AT5 | G-grounds: every Contradiction carries evidence that passes an independent check: premises are original ids and the rule is registered; or the CX re-evaluates to false by brute force | `routeUndeclared` (CX `s = t = {x}`, recon §4.1); `markNoClause` (rigid overlap) |
| AT6 | A derivation citing a substituted atom, or an unregistered rule, is refused by `checkDerivation` | injected bad derivation |
| AT7 | Monotonicity: adding a strategy turns Unresolved into Solved only; Contradictions are unchanged. The test-only `Checking` reports `BothVerdicts` on an injected unsound strategy | random problems over a small grammar, fixed before running |
| AT8 | The online solver is never a verdict: a stub search returning "refused" gives Unresolved; a stub returning a wrong σ is refused by check and gives `Defect CandidateRefused` | stubs injected as `Strategy` values |
| AT9 | G-lower: a stub strategy accepting with no witness gives Solved and `NoWitness`; specialization does not run | stub |
| AT10 | Static refusals stay static: `r disjoint r` is `Policy`, an arity error `StaticRule`; neither is a `Verdict`; codes unchanged | existing SameDisjoint and Arity fixtures |
| AT11 | `outside` non-empty blocks Solved (`Unsupported`) but not Contradiction | an `EffectArgument` construct beside a refutable atom |
| AT12 | A zero budget gives `Limit`, with the problem equal to the unlimited run's | injected `Budget` |
| AT13 | Independence: changing `f`'s body (not its signature) leaves `g`'s problem and verdict unchanged | pairs of programs |
| AT14 | `ComponentBlocked`: in a recursive component with an Unresolved member, the Solved members stay Solved | `walk`-shaped pair |
| AT15 | Rendering: an Unresolved text never says the program is wrong, has the Unresolved code, and shows hints as the solver's limit | D4 fixtures in test/fixtures/r005b (recon §4.2) |
| AT16 | Result boundary: each reason constructor is produced by a test that injects it directly (limits, defects) | classifier tests (docs/engineering.md) |

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
| `infer`, `require`, `settleRestricted`, `waitingAtEnd` | :78, :79, :81, :89 | inside `onlineSearch`; their `Left`s become hints or class-a static refusals per T-R0c |
| `firstTooDeep`/`tooDeepAt` | :80 | `Limit (Depth n)` |
| `judgeDeferrals`, mark check, `Entry.check` | :91, :92-94, :98 | effect rules: class a static checks where they do not read record metas; otherwise class f (Q-c2) |
| `comparable`, `printable` on the settled body | :96-97 | generation of `BQ` from the unsettled body (T-R0b); the ground judgement moves into G0's `check` |
| `holes settled` | :107 | the witness (witness/statements.md; T1 marker) |

`endReport`'s arms (EndReport.purs:36-43), mapped: `FromMerge` (D6) →
a hint; `undecided` (D4, :35) → `Inference`; `Placeholder` →
`Unsupported`; `TooDeep` → `Limit`; `Unexpected`, `Exhausted` →
`Defect`; the catch-all at :43 is replaced by one arm per `Failure`
constructor (docs/engineering.md, "no catch-all").

Order (proposed; each step its own change with its own tests):

1. **Types and the collecting driver.** Add `Domain.Verdict`; make
   `check` collect one outcome per declaration (wrapping today's
   `Either`) and `compile` return every diagnostic. Behaviour: more
   diagnostics per run; fixtures expecting one move. AT3, AT13.
2. **Classify today's refusals** (T-R0c's table) into static, hint,
   limit, placeholder or defect; give D4 the Unresolved code (decision
   9). Behaviour: codes of class d and e diagnostics change. AT10,
   AT15, AT16.
3. **The generator, beside the solver.** T-R0b's recorder as a pure
   function, run only in tests: AT1 against the oracle, AT4, AT13.
   No user-visible change.
4. **Generate, then search.** The driver calls `generate`, then
   `decide` with `online` as the only strategy; `checkFunction`
   becomes `onlineSearch`; `checkSubstitution` (G0) mints `Valid`
   with `Pending` assurance until its statement is approved (Q-A2).
   AT2, AT8, AT9, AT12.
5. **Rules and refuters.** The rule registry (T-R0c's proved c1 rules)
   and the CX refuter (T-R0d). Only from this step may a record
   refusal be a Contradiction. AT5, AT6, AT7, AT11.
6. **Admission split** (T-R0e): `instantiationRule` and decision 3's
   check move to `admit`; the several-tail placeholder becomes
   `NotLowerable`. AT14.
7. **Further strategies** (the cell format via its adapter; later G1
   formats): new `Strategy` values only, the goal of requirements
   §4.4 (conditional on R0).

Step ordering constraint (argued): steps 4 and 5 interact. Today some
refusals reached through solver-chosen bindings are worded as
contradictions (H's D6 on `route`, recon §4.1). Step 4 makes them
hints. Until step 5, genuine contradictions of the same kind (for
instance `Int` against `Bool` after substitution) would be Unresolved.
Either 5 lands with 4, or the window is accepted and documented (Q-A4).
No order keeps today's false contradictions.

`coverage` (Check.purs:36) reads solved types of the checked program;
recorder-spec §2.5 lists `Coverage` as `outside`. Whether it is a
static rule run on the Solved witness, or class f, is T-R0c's (Q-c1).

## 11. Questions for other streams and for the author

For T-R0b (recorder):

- **Q-b1:** confirm A8, that checking a body reads callees' written
  signatures only. If contract inference (INF001) arrives, the driver
  must order declarations by dependency, and G-hide needs restating.
- **Q-b2:** the site table (A3): granularity (expression node,
  instantiation, pattern) and how it survives local generalization
  (`LocalGeneralization` is `outside` today).
- **Q-b3:** are effect-row constraints in the problem, or only
  `outside EffectRow` markers? If outside, every program with effects
  would be Unsupported under rule 1 of §5.3, so a separate effect
  component, solved and checked apart, seems necessary.
- **Q-b4:** may generation ever fail other than by a class-a or b′
  rule (for instance, a placeholder construct)? This design assumes
  not (A6).

For T-R0c (refusal audit):

- **Q-c1:** the class of `coverage`, and of `NotComparable` on rigid
  operands (C6), under generate-then-decide.
- **Q-c2:** which effect refusals read record metas (class f) and
  which are static (class a).
- **Q-c3:** is "ground head clash after most-general unification of
  original `eq` atoms" a c1 rule? It reaches through bindings, but
  ones every solution factors through. If yes, it needs a soundness
  statement; if no, ordinary type errors depend on CX. The same
  question bounds G0's soundness statement.

For the CX stream:

- **Q-d1:** does CX cover non-record types and `BQ` atoms, and how is
  a counter-instance found from a hint?

For the witness stream (witness/statements.md):

- **Q-w1:** the type name and completeness of `NameWitness` (every
  flexible name, or only those reaching checked types); whether a G0
  substitution is already a `NameWitness`.

For T-R0e (admission):

- **Q-e1:** is `ComponentBlocked` the right outcome when a component
  member is Unresolved, and does decision 3's forcedness decider take
  the `Solution` or the problem?

For the author:

- **Q-A1:** `Defect` as a fourth Unresolved reason, or a separate
  top-level outcome.
- **Q-A2:** may `Solved` carry `Pending` assurance during migration,
  shown as such, or must step 4 wait for a proved G0 statement?
- **Q-A3:** keep "any declaration not admitted fails compilation",
  or compile when every declaration reached from the entry is admitted.
- **Q-A4:** land steps 4 and 5 together, or accept a documented window
  in which some genuine contradictions are Unresolved.

## 12. Provenance

Read for this document: requirements.md (revision 2, whole); dossier
§18.60-18.66; recorder-spec §1-2, §4-7; recon §2, §4, §5.3, §6;
docs/engineering.md ("Evidence for solvers", "Result boundary
classification"); src/Features/Check.purs, Check/Function.purs,
Check/EndReport.purs, Check/RowOutcome.purs, Program/Compile.purs,
Domain/Problem.purs, Format/Diagnostic/Code.purs. No code was run.
The closure-packed existential (§4.1) and the hidden-constructor
tokens follow existing practice (`Settled`, RowOutcome.purs:41; the
enforced Internal boundaries in AGENTS.md); no new machinery is
proposed beyond the composition of the published pieces named above.
