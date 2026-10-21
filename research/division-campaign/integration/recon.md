# Integration reconnaissance: a verified signature checker in the compiler

Stream 7 of the parallel campaign (dossier §18.13). Read-only map, written
2026-10-21 against `b5647cc` (tip of `r005b-replan`). No source, test or
plan was changed. The final implementation plan waits for the author's
approval; this file only maps the ground it would stand on.

Status labels follow the dossier: **checked** means run here (command in
the appendix), **read** means read in the source at the cited line,
**estimate** and **proposal** mean what they say.

## 0. In brief

- The compiler checks records **online**: constraints are solved as they
  are generated, by unification with rigid skolems, a fact store
  (`lacks`, `apart`) and waiting `Merge` predicates (PureScript's `Union`
  cases plus Sym, 1g, 2g), with rule H at the end of a body. There is no
  materialized constraint set `B`. The verified checker (`checkAll`)
  needs one, so the first integration step is a recorder, not a solver.
- The natural plug point already exists: `endOfBody` takes an injected
  `Judge` (src/Features/Check/RowMerge/End.purs:39, :47), and the body's
  hypotheses `D` are assembled in one place (Function.purs:124 `own`).
- Lowering cannot use a certificate today. Unsolved metas become holes,
  and holes lower to `{}` (record slots) or the representative `Int`
  (Specialize/Values.purs:96-98, Specialize/Lower.purs:52). That is wrong
  for a flexible row that a valid signature constrains but does not
  determine (`u` in `route` must be `r`'s fields outside `s`). A
  computable form of the dossier's interpretation `h` (Interp.lean,
  today `noncomputable`) is what Specialize needs per key.
- **Checked here:** the current checker refuses the valid `route`
  (dossier §17.3) with a contradiction text, `divide's { ...u, ...v }
  must be { ...r }, but neither u nor v can hold r`. Under the dossier's
  semantics that claim is false (`routeSig_validFin`). Its source is H's
  exclusion for a rigid atom (Homes.purs:31-34), which treats a rigid row
  as indivisible. Three P9s-certified shapes (`routeNarrowed`,
  `wrapAccepts`, `depSig`) get D4 `Cannot tell …` today.
- **Checked here:** the tip does not build from a clean checkout:
  43b3a28 deleted src/Features/Check/SeveralTails.purs, which
  Removal.purs:14 and RestBinder.purs:15 still import. Record literals
  with two spreads are still refused at Resolve (Resolve/Record.purs:80,
  `SecondSpread`); Task 7 sits unmerged on `r005b-task7-wip`.
- Top risks: exponential pattern enumeration in every verified decider
  (`2^(|R|·|L|)` patterns in `checkAll`) against real label counts; the
  unverified gap between source and extracted `B`; fragment gaps (ADTs
  over records, effect rows, handlers); lowering witnesses.

## 1. Where record constraints live today

### 1.1 Generated

| What | Where | Notes |
|---|---|---|
| declared clauses (`where r lacks`, `r disjoint s`) | Domain/Resolved/Core.purs:119 `Requirement`; Resolved.purs:106 `constraints` | resolved from syntax in Resolve/Requirements.purs:31 |
| implied pairs (two tails in one record of a signature or constructor) | Resolved/Core.purs:117 `Joined`; Resolved.purs:111 | computed in Resolve (Apart.purs, Types.purs) |
| implied lacks (`{ a: T, ...r }`, through declared types too) | Check/Implied.purs:28 `implied` | read by Lacks.purs:47 `seedLacks` |
| the body's hypotheses `D` | Check/Function.purs:124 `own` → Seed.purs:22 `seeded`, :41 `required`, :61 `joined` with `Unify.Rigid` | the only producer of `D` |
| a callee's clauses and implied facts at a use (part of `B`) | Check/Use.purs:36 `functionUse` → UseFacts.purs:19, :32, :44 with metas | instantiation by Scheme.purs:120 `instantiate` |
| a use's two-tailed rows | RowMerge/Use.purs:46 `desugaredUse` → Desugar.purs:54 `desugaredType`, :39 `freshRow` | k unknown tails become one meta and a chain of `Merge` predicates |
| record literal, access, update | Check/Record.purs:37, :59, :84 | access unifies the receiver with `{ l: α, ...ρ }`, `ρ` lacking `l` |
| extension, removal, rest binders, record patterns | Extension.purs:26, Removal.purs, RestBinder.purs, RecordPattern.purs:37 | removal and rest over several tails are a placeholder |
| every top-level type equation | Check/Unify.purs:68 `unify` | the one choke point; it re-examines predicates after each call |

### 1.2 Represented

- Types: `Ty v` with `TRecord (RecordRow (Ty v) v)`
  (Domain/Type/Core.purs:56-65); a row is sorted fields plus sorted
  tails, repeats kept (Domain/Type/Record.purs:28).
- Variables inside the checker: `Flex = Rigid VarId | Meta Int`
  (Check/Flex.purs:12). In the checked IR: `Open = Rigid VarId | Hole
  Int` (Domain/Checked/Internal.purs:25).
- The substitution `Subst` (Check/Subst.purs:66) is triangular and
  carries `store ∷ RowStore` (RowStore.purs:54): `lacks` per tail with
  reasons, `apart` pairs with reasons, `merges` (the waiting predicates,
  RowMerge/Merge.purs:24), arrival sites and a change counter. Everything
  reverts with a postponed effect pair.

### 1.3 Solved

- Record unification: UnifyRecord.purs:42 (flatten, field-wise, cancel,
  then RowSettle's one-tail rules).
- Facts: Disjoint.purs:39 `requireDisjoint`, :74 `requireLack`, :95
  `requireApart`; two rigids need a declared pair (:102-108).
- Predicates: RowMerge/Cases.purs:35 `examine` (cases 1, 1g, 2, 2g, 3
  and the Sym mirror), RowMerge/Improve.purs:41 `improve` (full rescan).
- The end of a body: RowMerge/End.purs:47 `endOfBody` with H (:69
  `homeless`, using Homes.purs:21 `admits`); the three-way result is
  RowOutcome.purs:33 (`Solved`, `Contradiction`, `Unresolved`).

### 1.4 Reported

- EndReport.purs:24 turns the end of a body into a diagnostic:
  `Contradicted.purs:44` (D6, `MustBeRow`) and `Unresolved.purs:41` (D4,
  `CannotTell`), as data in Domain/Problem.purs:151-152 and
  Domain/Problem/Merge.purs; text in Format/Diagnostic/Merge.purs:20,
  :51.
- Fact refusals: Lacked.purs:32 (`LackedField`, `RowMayHaveField`,
  `NotKnownDisjoint`, `InBothRecords`).
- All of it reaches `Format` as `Problem` data, never text, and maps to
  `E_TYPE` (Format/Diagnostic/Code.purs:55-56).

### 1.5 Lowered

- Function bodies are specialized per key of ground arguments; a call's
  `Instantiation` (`Array (Ty Open)`) is lowered at the key
  (Specialize/Values.purs:88). A record-sorted hole is the empty rest
  (:96-98); a type hole is the representative (Lower.purs:52). Layouts
  are hash-consed (Specialize/Layouts.purs). Rows of several tails are a
  placeholder (Specialize/Record.purs:39-44, Task 8).

## 2. The interface a signature checker plugs into

### 2.1 Inputs

| Input | Source today | Gap |
|---|---|---|
| rigid row variables `R`, rigid type variables `Tr` | `FunctionDecl.variables` and `sorts` (Resolved.purs:93-111): `RecordSort` → `R`, `TypeSort` → `Tr`; `RowSort` (effects) excluded | none |
| declared clauses `D` | Seed.purs on `Rigid` tails; afterwards readable from `RowStore.lacks`/`apart` on rigid keys | needs a pure reader that keeps rigid facts apart from meta facts |
| body constraints `B` | not materialized: equations pass through Unify.purs:68, facts through Disjoint.purs and UseFacts, predicates through Desugar | a recorder (§5, step 1) |
| flexible variables | metas (`Meta Int`, positive from Scheme, negative from row extension, Subst.purs:47-51) | renumbering to `Nat`, both sorts |

### 2.2 Outputs

The dossier's §2.2 verdicts, as they map to the code:

- **Accept.** For the checker this is `checkAll P T = true`; for the
  compiler, `RowOutcome.Solved` plus the certificate kept for lowering.
- **Refuse with a diagnostic.** P9s never refuses; a signature
  `Contradiction` needs a rigid counter-instance `θR` satisfying `D` and
  a call-site refutation at it (§2.2). No component produces `θR` today;
  D3b (stream 1) is the candidate. Until then refusals stay the online
  solver's, and each one needs the argument that a counter-instance
  exists (§4.3).
- **Unresolved.** `RowOutcome.Unresolved`, rendered D4, never worded as
  an error in the program.

### 2.3 What lowering needs back

A witness for every flexible variable that reaches an `Instantiation`
or a checked type, evaluable at each key. P9s's certificate gives one
per written-label pattern; at a key the rigid rows are ground, so the
pattern is known and `h` (§14.3) maps the generic value to a ground
one. Lean's `interp`/`hAssign` (Interp.lean:38-61) are `noncomputable`;
a computable `hS` over `SG`, with a lemma that it agrees with `interp ∘
den`, is a new, small Lean obligation. For D4 the witness is a set term
over the rigid rows' domains; at a key that is a filter over ground
layouts.

### 2.4 Layer placement under AGENTS.md

| Piece | Layer and module (proposal) | Why there |
|---|---|---|
| problem syntax (`SAtom`, `STy`), certificates (`SG`, `Cert`, table) | Domain (`Domain.Sig.*`) if Format renders any of it or Checked IR carries it; otherwise Features | data only, pure, no Checked IR import |
| the checker (`evalS`, `eqS`, `wfS`, `checkAtom`, `consistentS`, `patterns`, `checkAll`) | Features (`Features.Check.Sig.*`) | a decision procedure; needs no `Domain.Checked.Internal` |
| recorder and translation `Ty Flex` → `STy` | Features.Check.* | reads `Subst`, `Flex`; may import Checked.Internal |
| certificate search (from `σ`, later D4) | Features.Check.* | untrusted, behind the checker |
| witness kept for lowering | Domain/Checked/Internal.purs (new field on `FunctionDecl` or per-hole table) | Specialize reads only the checked IR |
| witness evaluation per key (`hS`) | Features.Specialize.* | only Check* and Specialize* may import Checked.Internal |
| new `Problem` constructors | Domain/Problem*.purs; text in Format/Diagnostic/* | Features reports data, never text |
| Go | unchanged | layouts arrive ground in `IR.Internal` |

The checker choice is injected, never selected by a flag (the `Judge`
parameter of `endOfBody` is the precedent: `homeless` versus
`withoutH`).

## 3. Reuse, replacement, and the Lean model

### 3.1 Reusable as is

- `Domain.Type`, `RecordRow`, `flatten` (FlatRecord.purs:22): the
  translation's input.
- The three-way result and its classifier (RowOutcome.purs:33, :67),
  the `Settled` witness, and the `Stop` channel.
- Seed/UseFacts for `D` and the callee half of `B`.
- The test entry pattern of Features.Check.RowEntry (driven from
  test/row-merge-entry.mjs) for a `SigEntry`.
- The fixture format of test/fixtures/r005b (source, result class,
  exact text, location, a labels-only `rows` problem); 11 of the 76
  fixtures with `rows` already name rigid rows `R`/`S`.
- sig-oracle (research/composition-assessment/sig-oracle): `bounded.mjs`,
  `p9s.mjs`, `typed-oracle.mjs`, `export-lean.mjs` all read one JS
  problem format (`rigidRows, rigidTys, D, B`, atoms `['eq', t, u]`,
  `['lacks', r, l]`, `['disjoint', r, s]`). A compiler exporter that
  writes this format reuses every one of them unchanged.

### 3.2 Replacement points

| Point | Today | With a signature checker |
|---|---|---|
| End.purs:47 `endOfBody` and its `Judge` | H classifies waiting predicates | for a body with rigid record rows: certificate check, then search, then Unresolved |
| Homes.purs:31-34 (rigid atom clause of `admits`) | excludes a whole rigid row from a meta apart from another rigid | not a contradiction under ∀∃ (rows divide); reclassify as Unresolved or replace by the checker's verdict |
| Contradicted.purs (H's D6) | names parts that "cannot hold" a rigid tail | only with evidence: a counter-instance |
| Unresolved.purs (D4) and its hints | "no annotation can decide" for a call's own rows | P9s-certified shapes stop reaching it; `route` reaches it until D4 |
| Specialize/Values.purs:96-98, Lower.purs:52 | holes become `{}` or `Int` | holes the certificate constrains take `hS` at the key |
| Domain/Checked/Internal.purs:45 `FunctionDecl` | no residual, no witness | carries the certificate or per-hole witnesses |

### 3.3 Lean ↔ PureScript

| Lean (Composition/…) | Meaning | PureScript today | Note |
|---|---|---|---|
| `Label` (String in CheckData) | labels | `String` field labels | same |
| `B` (String) | base types | `TInt`, `TBool`, `TText`, `TUnit` | names as strings |
| `TExpr.base/arrow/tvar/record` (Syntax.lean:27-32) | type syntax | `Ty Flex` | `TFun a row b` loses its effect row; `TData`, `THandler` have no counterpart |
| `Fields` (written order; a repeat is undefined) | fields | sorted `Array (Tuple String a)`, repeats kept | a repeat is UnifyRecord's mismatch in both |
| `record fs tails` denotes disjoint composition | `{ ...r, ...s }` | `RecordRow` with several tails | definedness is built into the Lean record; the compiler states it as `apart` facts |
| `Atom.eq` | equation | calls of Unify.purs:68; `Merge l r t` is `t = l ⊎ r` | Merge needs no separate atom |
| `Atom.lacks r l`, `Atom.disjoint r s` | facts | `RowStore.lacks`, `RowStore.apart`; `Requirement`, `Joined` | rigid keys → `D`, meta keys → `B` |
| `Atom.ff` | false | none (a refusal is `Left Failure`) | — |
| `SigProblem` (Validity.lean:20) | rigidTy, rigidRow, D, B | `FunctionDecl` plus recorded `B` | new |
| `Const`, `GL`, `GB`, `SG`, `Cert`, `CertTable` | generic values, certificates | none | new types |
| `patterns`, `consistentS`, `checkAll` (Patterns.lean:22-114) | the checker | none; nearest: `endOfBody` + `Judge` | port |
| `Cert` default: unbound = `{}` | | holes → `{}` for record slots, `Int` for type slots | the type-slot defaults differ; a certificate from σ must bind type metas explicitly |
| `interp`, `hAssign` (noncomputable) | witness at an instance | none | needs a computable `hS` |
| `decideCall` (Unify/) | call-site decider | online unifier + Merge cases | a second integration (call sites) |
| `validCheck` (Presence/DecideValid.lean:40) | flat presence validity | none | exact only for flat rows |

### 3.4 Linking proof to implementation

1. **Hand port plus differential testing.** Port the executable Lean
   definitions (Check.lean, WellFormed.lean, Decide.lean,
   Patterns.lean: 663 Lean lines with proofs, fewer without) to
   `Features.Check.Sig.*`. Differential: export (P, T) pairs (oracle
   certificates, the deliberate and broken ones of CheckExamples.lean,
   mutants) to both and compare booleans. Cheap; the gap is the port.
2. **Translation validation.** The compiler, under a test entry, writes
   (P, T) for every function it accepts in a corpus (fixtures, examples,
   generated programs) as Lean data, as export-lean.mjs does today; Lean
   checks each by `decide`. Each accepted problem is then kernel-checked
   without trusting the port. It does not cover programs outside the
   corpus.
3. **Refinement by mirroring.** Write the Lean checker in the shape of
   the PureScript (lists, explicit recursion, same function split) and
   keep a function-by-function table; the residual gap is reading.
   Combine with 1.
4. **Calling compiled Lean.** Lean compiles to C, not to JavaScript; a
   binary would be a host capability (Runtime, injected through
   Domain.Host) and would make `compile` effectful. Fit for a test
   harness, not for the compiler.
5. **Bounded oracle as a third reference.** The PureScript checker must
   never accept a problem `bounded.mjs` finds invalid; generated problems
   come from sig-oracle's grammars.

Proposal: 1 + 2 + 5, with 3 if the port is non-obvious. None of them
links source to `B`; only the source-to-constraint specification
(stream 5) and a differential between it and the recorder do.

## 4. Migration tests and diagnostics

### 4.1 Behaviour that would change (checked, appendix A)

| Program | Today | P9s baseline | With division (D4) | Lean |
|---|---|---|---|---|
| `route` (§17.3) | D6: `neither u nor v can hold r` (a false contradiction) | Unresolved (D4 text) | accepted | `routeSig_validFin` |
| `routeNarrowed` | D4 `Cannot tell how divide's u and v split { ...r }` | accepted | accepted | `routeNarrowed_validFin` |
| `wrapAccepts` | D4 `Cannot tell how acceptsParts's a and b split { ...r }` | accepted | accepted | `wrapAccepts_validFin` |
| `depSig` (via `takes(join(a, b))`) | D4 | predicted accepted (`depSig_valid`; not run through P9s here) | accepted | `depSig_valid` |
| `routeUndeclared` | D6 `neither u nor v can hold r` | Unresolved | refused, with a counter-instance (`s = t = { x }`) | — |
| `forwarded`, `join3`, `markAll` | accepted | accepted | accepted | §17.2 |
| `markNoClause` | `reviewed is not allowed here: r lacks { reviewed }` | unchanged (online refusal) | unchanged | `lacks_sat_not_valid` shape |

### 4.2 Existing tests that pin behaviour this changes

- Fixtures test/fixtures/r005b: `diag-18`, `design-holes`,
  `render-holds` are Unresolved with rigid rows in the body. Predicted
  (not run) to be P9s-certified; check with sig-oracle before any pin.
  `diag-18-wrong`, `design-generic-three-d3`, `design-mixed`,
  `diag-16`, `precedence-p7` are contradictions with rigid rows that look
  invalid under ∀∃ too (each has a counter-instance by hand); keep, and
  give each its counter-instance.
- test/row-merge-h.test.mjs (H's properties) and the regression rows of
  scripts/regression-r005b-end.mjs: `r005b-h-exclusion` restores a
  defect by exact text in Homes.purs:33. Any edit there moves the
  needle; the row must move with it.
- test/r005b-limitations.test.mjs: `O4, kept` pins D4 for a call in
  `main` (a call site, not a signature; stream 6's question).
- test/r005b-render, -predicates, -unify, -surface: D4 and D6 texts.
- Lowering: test/specialize.test.mjs, r005-go, r001-go-keys if holes
  stop meaning `{}` (§2.3).

### 4.3 New tests

- **Differential, checker:** PureScript `checkAll` against Lean `checkAll`
  on exported tables, including every broken certificate of
  CheckExamples.lean; never accepting a bounded-invalid problem.
- **Differential, extraction:** the recorder's `B` against the §17.1
  hand translations (sig-oracle/source-boundary.mjs) and against stream
  5's specification, compared up to renaming and equivalent atoms.
- **Corpus translation validation:** every accepted function's (P, T)
  checked by Lean (outside verify).
- **Witness lowering:** for each certified function and each key reached,
  the ground witness satisfies `B` at the key (an oracle evaluation), and
  the emitted Go runs.
- **Fragment boundary:** each out-of-fragment type former (`TData` with
  record arguments, handlers, effect rows on arrows) has a fixture fixing
  what the compiler does there.

### 4.4 Diagnostic expectations (blame needs evidence)

- A signature contradiction names its evidence: the counter-instance
  (`for r = { x: Int } and s = { x: Int }, …`) and the requirement that
  fails at it. "Not known to be disjoint" texts already have an obvious
  instance; H's rigid-atom texts do not, and `route` shows they can be
  false.
- An Unresolved text never says the program is wrong. For a P9s
  boundary case, the narrower-signature workaround (`where r disjoint
  s`) may be a hint, labelled as narrowing the contract (§17.3), not as a
  fix.
- Tests for each blamed part include a compatible earlier suspect beside
  the failing one, in both orders (docs/engineering.md).

## 5. Integration steps, risks, sizes

### 5.1 Steps (sizes are **estimates**: src lines / test lines)

| Step | What | Size | Depends on |
|---|---|---|---|
| 0 | restore the build (SeveralTails), decide Task 7/8 (two spreads, several-tail lowering) | trivial / Task 7-8 as planned | author |
| 1 | recorder: `B` logged at Unify.unify, Disjoint, UseFacts, Desugar; `D` from `own`; kept in `Subst` so it reverts | 150-250 / 150 | 0 |
| 2 | translation `Ty Flex` → `STy`, numbering, fragment test | 150-250 / 150 | 1 |
| 3 | `SigEntry` test module and exporter to the sig-oracle JS format; shadow runs on the corpus; measure `|R|`, `|L|`, metas per function | 100 / 200 (+ JS) | 2 |
| 4 | certificates from the online σ for Solved bodies; Lean checks them offline | 150 / 100 | 3 |
| 5 | PureScript port of `checkAll` | 500-800 over 5-7 modules / 300 | 2 |
| 6 | gate: inject the checker at `endOfBody`; P9s search for Unresolved bodies; reclassify H's rigid clause; diagnostics | 250-400 / 300 + fixture updates | 4, 5 |
| 7 | witnesses for lowering: computable `hS` in Lean, port, Checked IR field, Specialize per key | 250-400 / 250; Lean 100-200 | 6, stream 6 |
| 8 | D4: certificate format with region parts, its checker (proved), search, set-term evaluation | unknown (research) | streams 1-4 |
| 9 | pattern-count mitigation (a proved slicing lemma or a symbolic checker) | unknown (research) | 3's measurements |

### 5.2 Risks and unknowns, ranked

1. **Pattern explosion.** `checkAll` enumerates every sublist of
   `rigidRow × written P` (Patterns.lean:22); `decideCall` enumerates
   `2^|pairsOf C|`; `bitCheck` enumerates bit vectors over the mentioned
   rigid and flexible sets. `L` is every label written in `D` and `B`, so
   a body with two rigid rows and twenty labels unrelated to them gives
   `2^40` patterns. Mitigation needs a new lemma (patterns restricted to
   labels connected to each rigid row) or a symbolic checker, each with
   its own proof. Unknown until step 3 measures real functions.
2. **Source to `B` is unverified.** The proofs are about `SigProblem`.
   The compiler interleaves generation and solving, defers effect pairs
   and reverts them, and desugars rows; whether the recorded `B` is the
   source's meaning rests on stream 5's specification and a
   differential, not on proof.
3. **Fragment gaps.** Lean has base types, arrows and records. Waxwing
   has `TData` with record-row arguments (a constructor writing `{ ...r,
   ...s }`, Resolved/Core.purs:51), handler types, `Text`, effect rows on
   every arrow, marks. Encoding `TData` as a tagged record is injective
   but lets a row absorb it; extending `TExpr` with constructors means
   re-proving the Sig stack. A fallback policy for out-of-fragment
   bodies is needed.
4. **Lowering witnesses.** Holes lower to `{}`, which violates `B` for
   constrained, undetermined flexible rows; no computable `h` exists;
   the checked IR has no place for a witness; D4's set terms need one
   more. Stream 6 (split selection) decides what a call site with
   several solutions lowers to.
5. **Existing false contradictions.** H's rigid-atom exclusion refuses
   valid signatures (`route`, checked). Its rules argument assumed
   indivisible rigid tails. Signature contradictions have no
   counter-instance producer yet.
6. **Record certificates and effect solving share type metas.** A type
   meta can be a function whose effect row the online solver binds;
   certificates derived from σ agree with it by construction, a
   separately searched (D4) certificate needs an argument.
7. **Branch health.** The tip does not build; Task 7 is unmerged and
   its WIP branch fails verify (dossier context, assessment §1); two
   spreads are refused at Resolve, so `join`-shaped bodies cannot be
   written at the tip.
8. **Budgets near their caps.** Format/Diagnostic.purs 205 lines (a
   comment in Domain/Problem.purs calls it at its cap), RowEntry.purs
   245, Scheme.purs
   228, Subst.purs 224, Domain/Problem.purs 177. New constructors force
   splits first.
9. **Toolchain.** Lean is not in verify; adding it pins a second
   toolchain and slows verify. Translation validation can run outside
   verify, as CheckData does now.
10. **Policy.** The rest-label encoding is authorized for investigation,
    not adoption (§14.8); certifying algorithms are published (§15.1).
    ADR 014 approval is needed before step 6.

### 5.3 Constraints from AGENTS.md that shape the design

- Domain, Features and Format stay pure: the checker cannot call Lean or
  a solver at run time; anything external is a test harness.
- Layers import only earlier layers; only Check* and Specialize* import
  Domain.Checked.Internal; only Specialize* and Format.Go* import
  Domain.IR.Internal. Witnesses travel in the checked IR and are gone
  before Format.Go.
- Expected failures are `Either Diagnostic`; error codes are an ADT
  (Format/Diagnostic/Code.purs). New verdicts need `Problem`
  constructors and a classified `Failure` constructor (the
  result-boundary rule: no catch-all).
- 250 physical lines per file, about 100 targeted; 30 lines, 3 nested
  decisions and 8 `where` bindings per declaration: the Lean checker's
  ~10 functions become 5-7 modules.
- `where`, no `let … in`, no anonymous lambdas, named helpers for
  `maybe`/`either`: Lean's `fun` arguments become named helpers.
- Inject implementations, never flag-select: the checker is a `Judge`
  argument, as `homeless` is.
- Regression proofs restore the defect in an isolated copy: each new
  rule (the gate, the reclassification) needs a row.
- Evidence rules (docs/engineering.md §"Evidence for solvers"): an
  independent oracle per result class, a claims ledger, and a written
  argument per rule before implementation.

## 6. Questions for the author

1. Does the online solver stay the certificate search, with the
   verified checker as a gate (translation validation), or is record
   solving to become generate-then-decide?
2. Out-of-fragment bodies (`TData` over records, handlers): today's
   behaviour, or Unresolved?
3. H's rigid-atom exclusion gives a false contradiction on `route`.
   Record it now as a defect (BACKLOG, owner's edit), or leave it for
   integration?
4. Lean in verify, or translation validation outside it?
5. May the checked IR carry certificates or per-hole witnesses, so that
   Specialize evaluates them per key?
6. Should a P9s-only integration land before D4, given that it turns
   `route`'s text from a contradiction into Unresolved and changes the
   pinned D4 fixtures?
7. A certificate built from a Solved σ that fails `checkAll`: an
   internal error (a checker defect), as proposed?

## Appendix A. Probes (checked)

Built at `b5647cc` in this worktree with
src/Features/Check/SeveralTails.purs restored from `43b3a28^` for the
build only (`node scripts/build.mjs`; without it the build fails with
`ModuleNotFound Features.Check.SeveralTails` at Removal.purs:14 and
RestBinder.purs:15). Each program then ran through `parse`, `resolve`
and `check` from output/ (Format.Parse, Features.Resolve,
Features.Check), as test/r005b-support.mjs `checkWired` does. The
scratch scripts were not committed; the restored file and the build
output were deleted.

~~~waxwing
fn divide(whole: { ...u, ...v }, left: { ...s },
  right: { ...t }): Int where u disjoint s, v disjoint t = 0;
fn route(x: { ...r }, y: { ...s }, z: { ...t }): Int
  where s disjoint t = divide(x, y, z);
fn main(): Int = 0;
~~~

Result: `E_TYPE divide's { ...u, ...v } must be { ...r }, but neither u
nor v can hold r` at `z`. With `r disjoint s` added: `Cannot tell how
divide's u and v split { ...r }; no annotation can decide u and v, which
belong to this call of divide`. With no clause: the same D6 as `route`.

`wrapAccepts` (`fn acceptsParts(p: { ...a, ...b }): Bool where b lacks
{ admin } = true; fn wrapAccepts(x: { ...r }): Bool =
acceptsParts(x);`): `Cannot tell how acceptsParts's a and b split
{ ...r }; …`.

`depSig` (`join` written as `join(a, b)` recursively, since two spreads
are refused at the tip; `fn takes(p: { ...u, ...v }): Bool where u lacks
{ admin } = true; fn dep(a: { ...r }, b: { ...s }): Bool where r
disjoint s = takes(join(a, b));`): `Cannot tell how takes's u and v
split { ...r, ...s }; …`.

Accepted: `forwarded`, `join3` (both over the recursive `join`),
`markAll`. Refused: `markNoClause` (`reviewed is not allowed here: r
lacks { reviewed }`); `{ ...a, ...b }` in a body (`A record literal
accepts at most one spread`, at Resolve).
