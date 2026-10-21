# The reconciled recorder specification

Date: 2026-10-21. Base: 4a51688 (dossier §18.24). Authorized within the
research campaign by §18.24 ("Next recorder deliverable: one reconciled
specification"). This is a specification. It changes no compiler source,
no Lean file and no stream document. Recorder implementation and any
change to split policy are not authorized, and nothing here proposes a
split-selection rule. Decision 3 (§4, §18.17 item 3) and R010 (§18.22
item 3) stay as they are.

It replaces two partial specifications that do not combine (§18.23,
review §5, M1-M9): stream 5's translation (source/translation.md, R1-R16
and its §3 inventory) and stream 8's model (split-irrelevance/
statements.md, `Covers`, `Req`, ground-check.md). Where those documents
and the review differ, the review (reviews/streams-5-8-review.md) and
§18.24 are authoritative. The stream documents are being corrected in
place by another agent. This file cites their content as the review
corrects it.

Labels, as in the dossier: **proved** (Lean, named theorem),
**checked** (run; by whom is stated), **read** (read in the source at
the cited line), **derived** (argued, not mechanized), **proposed** (a
design choice or statement awaiting approval), **unproved** (a proposed
statement with no proof).

File:line references are at 4a51688. No file under src/ changed between
77e0fa3 (recorder-interface.md's base) and 4a51688, so that document's
references still hold. Paths under src/Features/ are abbreviated:
`Check/X.purs` is src/Features/Check/X.purs, and likewise for
`Specialize/`, `Resolve/`. No build or probe was run for this document:
every observed behaviour cited comes from the review's probes (§0 of the
review; its texts are repeated there) or from stream 5's coordinator run
(§18.18).

## Resume (paused 2026-10-21)

WIP checkpoint, paused by the coordinator. Rows done: all 60 rows of §3
are drafted (A1-A7, B1-B15, D1-D5, F1-F9, C1-C8, H1-H7, O1-O9), with
§4-§11. Rows remaining: none to draft; none verified. Not done: a width
check (`node scripts/width.mjs`), a re-count of §7's coverage summary
against the table (corrected to 36/10/14 of 60 at the checkpoint), a
re-read of every file:line in §3 and §5.2, a humanizer pass on the
prose. Exact next step: run `node scripts/width.mjs`, fix wide lines,
re-verify §7's counts row by row, then commit without "WIP".

Contents:

1. Vocabulary: origins, constraint kinds, four kinds of status
2. Representation
3. The table
4. Behaviour today, by kind of status
5. Preserving the original obligations: rollback and simplification
6. The rigid-overlap obligation
7. Trust boundary and coverage
8. Proposed statements (unproved)
9. What changed from streams 5 and 8, mismatch by mismatch
10. Test plan
11. Open questions for the author

## 1. Vocabulary

### 1.1 Origin and the type an obligation operates on

§18.24 item 2 asks that the specification separate where a requirement
**originates** from the **type it operates on**. Every row of §3 names
both.

Origins:

- **contract**: the declaration's own contract. In its own body it is a
  hypothesis (`D`, and requirement atoms `Q`, §2.3). It is either
  written (`where` clauses) or, for requirements, inferred by rules that
  INF001 and C001 will fix (§18.22 item 1). Nothing in this
  specification infers a contract. It records what an inference will
  need.
- **types**: implied by a type the signature writes (a tail lacks the
  labels beside it; two tails in one record are disjoint), or by the
  definedness of any type written or instantiated anywhere.
- **body**: the checked declaration's own body. This is the caller's
  own constraints when the declaration calls something. It includes
  operations on types that a callee's instantiation solves, such as a
  caller's `p == p` or `p.c` in a lambda whose parameter type is a split
  part (cmp-cf, eq-d in the review).
- **inst**: a callee's contract (clauses and requirements), copied at
  one call or reference with fresh flexible variables (instantiation).

The rule from §18.24 item 2: a caller's operation never becomes a
declaration on the callee. A requirement whose origin is **body** stays
in the caller's problem, on the caller's types, even when those types
are flexible variables that the callee's instantiation solves. A
requirement whose origin is inside a generic callee lives in that
callee's contract and reaches each caller through **inst**. Both kinds
end in one constraint problem per checked declaration: the caller's
`B` holds its body atoms and its instantiated callee contracts
side by side.

The type an obligation operates on is one of: a rigid row of the
declaration, a rigid type variable, a flexible row or type variable
(made by a construct or an instantiation), a ground type, or a record
type built from any of these.

### 1.2 Constraint kinds

| Kind | Where it lives | Atoms | In Lean today |
|---|---|---|---|
| clause | `D` | `lacks r l`, `disjoint r s`, over rigid rows | yes: `Atom` (Syntax.lean), `SigProblem.D` (Sig/Validity.lean) |
| body atom | `B` | `eq t u`, `lacks ρ l`, `disjoint ρ σ`, `ff`, over rigid and flexible variables | yes: `SigProblem.B` |
| requirement atom | `Q` (contract) and `BQ` (body, inst) | `pr τ`, `cmp τ` on a type expression | no (§8, P1); λ-split has `ok k` per site (SplitIrrelevance/Defs.lean) |
| admissibility record | beside the problem, per call | the witness's form (an instantiation or a witness term) and whether the call is inside a recursive component | no; not an atom (§18.22 item 3) |
| policy record | beside the problem, per call | whether the chosen split is forced by the recorded atoms or written by a caller-side annotation that determines it | no; decision 3, not an atom |
| resource bound | not recorded | type depth, specialization count | no |
| `Outside` marker | `outside` list of the problem | one constructor per unsupported construct, with its site | no; never dropped (§18.20 item 7) |

### 1.3 Four kinds of status, kept apart

Every behaviour statement in this file is one of these, and §4 keeps
them in separate columns (§18.24, last paragraph):

- **check-time refusal**: a diagnostic from Parse, Resolve or Check,
  before Specialize runs (Program/Compile.purs:16 runs `parse >=>
  resolve >=> check >=> specialize >=> keyed`);
- **specialization-time refusal**: a diagnostic from Specialize or from
  Format/Go's family keys (Format/Go/Families.purs:52-61);
- **reference-model behaviour**: what a Lean model says (`ValidFin` of a
  `SigProblem`; `Accepted` and `eval` of λ-split);
- **observed generated-code behaviour**: what built Go did when run.
  For records with several tails there is none: no such program passes
  Specialize today (Specialize/Record.purs:38-44, Task 8). Every
  run-time claim about several tails is therefore reference-model or
  derived.

## 2. Representation

### 2.1 The recorded problem

Per checked declaration `f`, the recorder produces:

- rigid row variables `R` and rigid type variables `Tr` (the signature's
  `RecordSort` and `TypeSort` variables; `RowSort`, i.e. effect rows,
  excluded, §3 group O);
- `D`: clause atoms, **computed** from the resolved declaration, never
  hooked (recorder-interface.md §3.4);
- `Q`: the contract's requirement atoms over `R` and `Tr`, written or
  (later) inferred; empty today, because no syntax or inference exists
  (§3 group C);
- `B`: body and inst atoms, raw, as generated (§5);
- `BQ`: requirement atoms of the body and of instantiated contracts;
- `adm`: one admissibility record per call or reference inside a
  recursive component;
- `split`: one policy record per call whose instantiation divides or
  composes a row (decision 3);
- `outside`: `Outside` markers.

`SigProblem` (Sig/Validity.lean:20) is the part `R`, `Tr`, `D`, `B`.
The remaining parts have no Lean counterpart yet (§7, §8).

### 2.2 Body atoms

As recorder-interface.md §2 (`Equal`, `Lacking`, `Apart`, `Union`), each
tagged with a `Maker` naming its hook. Four makers are added by this
specification:

| Maker | Hook | Why new |
|---|---|---|
| `RigidBase` | Check/Overlap.purs:89-96, before `mayHave` | the rigid-overlap obligation (§6); recorder-interface.md folded it into `ExtensionBase` with a store write, which §18.20 item 6 forbids |
| `Defined` | Check/Lambda.purs:66 (`parameterType`); Check/Record.purs:37 (`checkLiteral`) | a definedness atom `eq τ τ` for a written body type or literal with several parts; recorder-interface.md's normalization drops `t = t` and would erase it (§5.3) |
| `ContractUse` | Check/Use.purs:36 (`functionUse`), beside UseFacts.purs:19-53 | the callee's requirement contract `Q_g`, instantiated (M9) |
| `PrintSite`, `CompareSite` | a pure walk over the **unsettled** body at Check/Function.purs:96-97 | requirement atoms of the body (M2, M3) |

### 2.3 Requirement atoms

A requirement atom is a predicate on a type expression `τ` (Lean's
`TExpr`), judged on τ's ground image:

- `pr τ` holds at `θ` iff `evalT θ τ = some g` and `g` holds no arrow and
  no handler at any depth (`Printable`, SplitIrrelevance/Defs.lean;
  Specialize/Printable.purs:34-35 `groundPrintable`);
- `cmp τ` holds at `θ` iff `evalT θ τ = some g` and `g` holds no arrow at
  any depth (Check/Comparable.purs:79 via `containsFunction`,
  Check/Functional.purs:45-52).

Both include definedness: an undefined τ fails, as `SiteOk` does in
λ-split.

**Field-level, with a row-level shorthand.** The atom is judged on the
record **type**, field by field and at every depth. That is the
compiler's judgment (h1, pr-cf: the refusal names the field type), and
stream 8's (M1). A row-level clause is a shorthand with this explicit
translation:

```text
r printable    means   pr { ...r }        (a record type, one tail)
r comparable   means   cmp { ...r }
```

`{ ...r }` is always defined, so the shorthand says exactly "every field
of `r`, at every depth, is printable". It is not a new kind of atom.
Proposed lemma P6 (§8) gives the distribution that makes the shorthand
compositional: `pr { l̄: τ̄, ...r1, ..., ...rk }` holds iff the
composition is defined, every `τi` is printable, and every `{ ...rj }` is
printable. So a requirement on a split part `{ ...u' }` with `u' ⊆ r`
holds whenever `r printable` holds, and can also hold without it, when
the split keeps `r`'s non-printable labels out of `u'`. The second case
places labels by their type. That is outside the presence results and
outside `checkAll`'s label-blind patterns (§8, P1; open question 2).

**Origin is metadata.** An atom's meaning does not depend on its origin.
The origin decides only where it goes: `Q` (contract, a hypothesis in
the declaration's own body), `BQ` with origin body (the caller's own
obligation), or `BQ` with origin inst (a callee's contract at a call).

### 2.4 Admissibility and policy records

R010 (Check/Instantiation.purs:53-70, `judgeCall`; Check/
NestedArguments.purs:45-48, `admissibleSlot`) judges a witness's
**form**: inside a recursive component, each type or record slot must be
the caller's bare variable or mention no rigid variable. It is recorded
as the form itself, per call: `{ site, callee, inComponent, slots }`,
with `slots` the instantiation as solved (today) or the certificate's
witness term (once a gate exists). `Adm` is the predicate R010
computes. It is never conjoined into `B` and never part of validity
(§18.22 item 3; review F13). A witness is usable only if it is valid
**and** admissible.

Decision 3 is recorded the same way: per call whose witness divides or
composes a row, whether the recorded atoms (`D`, `B`, `BQ`, a caller's
annotation included) force the split. A caller-side annotation counts
as written when it actually determines the split (§18.24 item 1). The
selected split must still satisfy every atom of both origins.

### 2.5 `Outside`

Recorder-interface.md's `Outside` (`EffectArgument`, `DataOverRecords`,
`HandlerType`) extended to the rows of §3 group O: `EffectRow`,
`FailFamily`, `Deferred`, `PatternGrowth`, `LocalGeneralization`,
`Coverage`, and, until P1 is proved and ported, `RequirementAtom` for
the checker's verdict (§7). A problem with a non-empty `outside` is
never certified as if it covered the whole function. An independently
supported slice may be checked with its scope stated (§18.20 item 7).

## 3. The table

One row per source obligation. Columns: source construct and
obligation; origin (§1.1); the type it operates on; constraint
representation (§2); when it is recorded; covered by; status.

"Covered by" names what establishes that a verdict on the row's
representation is right: a Lean theorem, an oracle or a test. Recording
itself (that the recorder produces the representation) is covered by no
theorem for any row; §10 plans its tests. Abbreviations: `checkAll` is
`checkAll_validFin` (Sig/Patterns.lean:131); `C` is `accepted_split`
with `accepted_of_covers` (SplitIrrelevance/Acceptance.lean); `R` is
`eval_split` (SplitIrrelevance/Run.lean). "Spec" means a specialization-
time judgment.

### 3.1 Group A: the contract (`D`, `Q`)

| # | Source construct and obligation | Origin | Operates on | Representation | When recorded | Covered by | Status |
|---|---|---|---|---|---|---|---|
| A1 | `where r lacks { l̄ }` | contract (written) | rigid row `r` | `D`: `lacks r l` per label | computed from `function.constraints` (Resolved.purs:106), as `own` reads them (Check/Function.purs:124-125 → Check/Seed.purs:41) | `checkAll`; `clauseOnly_down`, `clauseOnly_empty`, `clauseOnly_drop` (Sig/SourceCampaign.lean: no vacuity from source) | in |
| A2 | `where r disjoint s` | contract (written) | rigid rows | `D`: `disjoint r s` | as A1 | as A1 | in |
| A3 | implied lacks: `{ l: T, ...r }` written in a parameter, result or effect-row type, at any depth (arrows, declared-type arguments) | types | rigid row | `D`: `lacks r l` | computed: Check/Implied.purs:28 `implied`, as Check/Lacks.purs:47 `seedLacks` uses it (Check/Seed.purs:22) | as A1; `mark_validFin` (p03, result-only lack, SourceBoundary.lean) | in; contravariant and result-only positions are open (translation.md §8 Q2, Q3) |
| A4 | implied disjoint: two tails in one written signature record | types | rigid rows | `D`: `disjoint r s` | computed from `function.joined` (Resolved.purs:111; Check/Seed.purs:61) | as A1; `join_validFin` | in |
| A5 | declared type with record-row arguments used as an abbreviation (R012: `Holder({ y: Bool, ...s })`) | types | rigid row | expand to the record it writes, then A3/A4 | computed: Check/Implied.purs:52 `passed` | as A1 (after expansion); test/r012-arguments.test.mjs | in; data types with constructors over rows: O5 |
| A6 | contract requirement on a rigid row: `u printable` / `u comparable` | contract (written or inferred) | rigid row | `Q`: `pr { ...u }` / `cmp { ...u }` (shorthand, §2.3) | no syntax and no inference today: nothing to record. Once written: computed with `D`; once inferred: from C1/C6 by INF001/C001 rules | λ-split `C` for a declared `Req` (`accepted_split`; `covers_req₁_iff`); checker: none (P1) | in as a representation; `Outside RequirementAtom` for the checker until P1 |
| A7 | contract requirement on a rigid type variable: `a printable` | contract | rigid type variable | `Q`: `pr (tvar a)` | as A6 | as A6 | as A6 |

### 3.2 Group B: the body's equations and record operations

| # | Source construct and obligation | Origin | Operates on | Representation | When recorded | Covered by | Status |
|---|---|---|---|---|---|---|---|
| B1 | **caller equations**: every typed agreement the body states (argument against parameter, result against declared result, `if` branches, `match` arms and scrutinee, application, pipe, `let`, operators `+` `++`, interpolation holes, comparison operands equal), including agreements on types that a callee's instantiation solves (eq-c / eq-d) | body | any; flexible variables shared with instantiations | `B`: `eq t u` | Check/Require.purs:83-88 `expectType` (maker `Expected`), the one hook for every `require` caller | `checkAll` (validity of the recorded problem); **not** `C` (presupposed, §18.24 item 3; F6); proposed C⁺ and P3 (§8) | in |
| B2 | record literal, written fields and at most one spread (`{ l̄: ē, ...s }`) | body | fresh flexible row and field types | `B`: `eq α { l̄: τ̄, ...ρ }`, `eq σ { ...ρ }` for the spread | Check/Record.purs:37 `checkLiteral`; Check/Extension.purs:26 for a spread (makers `Expected`, `FreshLacking`) | `checkAll`; `greeting_validFin`, `mark_validFin` | in |
| B3 | literal with several spreads (†, intended; refused at Resolve today: Resolve/Record.purs:80 `SecondSpread`) | body | flexible rows | `B`: `eq α { ...ρ1, ..., ...ρk }` (or `Union`), definedness built in | Check/RowMerge/Chain.purs:46-63, :99-104 (Task 7, unmerged; maker `LiteralParts`) | `checkAll`; `join_validFin`, `forwarded_validFin`, `join3_validFin`, `both_validFin` | in (intended); check-time refusal today |
| B4 | field access `e.l` | body | the receiver's type | `B`: `eq τe { l: β, ...ρ }`; `lacks ρ l` | Check/Record.purs:138-149 `select` (`Selected`); Check/FreshRecord.purs:27 (`FreshLacking`) | `checkAll`; `missing_not_validFin` (n02) | in |
| B5 | extension `{ ...p, l: e }`, base a flexible row | body | flexible row | `B`: `lacks ρ l` | Check/Overlap.purs:85-87 (`ExtensionBase`) | `checkAll` | in |
| B6 | extension `{ ...p, l: e }`, base a rigid row: **the rigid-overlap obligation** | body | rigid row | `B`: `lacks r l` (valid only if `D` entails it) | Check/Overlap.purs:89-96, recorded **before** `mayHave` decides, into the log only (§6; maker `RigidBase`) | `checkAll` (a `lacks` on a rigid row in `B`; `lacks_sat_not_valid`, Sig/Validity.lean, shows it is not vacuous) | in |
| B7 | update `e { l = e' }` | body | the receiver's type | `B`: `eq τe { l: β, ...ρ }`, `eq τe' β` | Check/Record.purs:84 `checkUpdate` (`Expected`, `Selected`) | `checkAll`; p13 (derived) | in; not in λ-split (M6) |
| B8 | removal `e without { l̄ }` over one tail | body | the receiver's type | `B`: `eq τe { l̄: β̄, ...ρ }`; result `{ ...ρ }` | Check/Removal.purs:25 `checkRemoval` | `checkAll`; p14 (derived) | in |
| B9 | removal or named rest binder over **several** tails | body | composed row | none yet | refused at check: Check/Removal.purs:14, Check/RestBinder.purs:15 import `withinOneTail` (SeveralTails.purs, restored from 43b3a28^ for builds) | none | `Outside` (Task 7 placeholder) |
| B10 | rest binder `{ l̄, ...x }` over one tail | body | the scrutinee's type | `B`: `eq τs { l̄: β̄, ...ρ }`; `x : { ...ρ }` | Check/RestBinder.purs:25 `matched` | `checkAll`; p15 (derived) | in |
| B11 | open record pattern `{ l̄: p̄, ... }` | body | the scrutinee's type | `B`: `eq τs { l̄: β̄, ...ρ }`; subpatterns against `βi` | Check/RecordPattern.purs:37 `recordAgainst` | `checkAll`; p20 (derived); test/fx-oracle-record-patterns.test.mjs | in; not in λ-split (M6) |
| B12 | closed record pattern `{ l̄: p̄ }` against a rigid or ground scrutinee | body | the scrutinee's type | `B`: `eq τs { l̄: β̄ }` | Check/RecordPattern.purs:37 | `checkAll`; n07 (derived) | in |
| B13 | a pattern that extends an unknown tail by its labels, or closes it when it lists every known field (Check/PatternRow.purs:76 `growable`, :84) | body | flexible row | none specified: arm order may matter (translation.md §8 Q7) | — | none | `Outside PatternGrowth` until specified |
| B14 | lambda annotation `fn(x: T) => e`, including the caller-side annotation that writes a split (`fn(p: { c: Int }) => …`, §18.24 item 1) | body | the annotation's type | `B`: `eq σ T⟦T⟧`, and `eq T⟦T⟧ T⟦T⟧` (definedness, maker `Defined`) | Check/Lambda.purs:66 `parameterType`; earlier, Resolve's syntactic entailment (Resolve/Apart.purs:141-158 `disjointIn`; Resolve/Lacking.purs `lackingIn`) | `checkAll`; n16 (refused at Resolve, checked §18.18) | in |
| B15 | nested record equations: records inside fields, inside arrows, through a row (`{ ...Y } = { box: { ...r } }`) | body, inst | nested record types | `B`: `eq` on nested `TExpr`; no decomposition by the recorder | as B1 (the unifier decomposes field-wise, Check/UnifyRecord.purs:42, but the recorder keeps the top-level atom) | `checkAll` (any `SigProblem`); presence projection exact only under E1-E3 (translation.md §2.4; `valid_iff_validCheck` is flat only) | in for checking; division through N1 needs D3a/D3b |

### 3.3 Group D: definedness of compositions

| # | Source construct and obligation | Origin | Operates on | Representation | When recorded | Covered by | Status |
|---|---|---|---|---|---|---|---|
| D1 | a literal's parts pairwise disjoint, used or not (program 11's `let first`) | body | flexible rows | built into `eq α { …parts… }` (Lean's `record` denotes the disjoint composition; `Holds` needs both sides defined, Syntax.lean:81-84) | with B2/B3 | `checkAll`; `both_validFin` | in |
| D2 | a body annotation's composition defined (`fn(q: { ...r, ...s })` needs `r disjoint s`) | types (of a written body type) | rigid or flexible rows | `eq T T` (maker `Defined`) | with B14 | `checkAll`; n16 | in |
| D3 | signature types defined | types | rigid rows | implied `D` (A3, A4) makes every signature type defined | computed with `D` | `param_image` (SplitIrrelevance/Examples.lean) for `divide`; derived in general | in |
| D4 | an instantiated callee type defined at the call | inst | flexible rows | the callee's implied clauses instantiated (F2, F3) | with F2/F3 | `checkAll` | in |
| D5 | a type defined at a specialization key | — (a consequence) | ground types | none: a ground check | spec: Specialize/Record.purs:57-58 (E_INTERNAL `Duplicate record label`) | `SiteOk` refuses undefined types (λ-split); under `Covers`, never fires (derived from `accepted_of_covers`) | in; an internal assertion |

### 3.4 Group F: calls and references (instantiation)

| # | Source construct and obligation | Origin | Operates on | Representation | When recorded | Covered by | Status |
|---|---|---|---|---|---|---|---|
| F1 | call `f(ē)` of a generic declaration: fresh flexible copies `θ`, arguments against `θ(params)` | inst, body | flexible copies of the callee's variables | `B`: `eq τei θ(T⟦Ti⟧)` | Check/Scheme.purs:120-127 `instantiate` (numbering only); arguments through `expectType` | `checkAll`; §17.1 examples (`forwarded_validFin`, `wrapAccepts_validFin`, `routeNarrowed_validFin`, `routeSig_validFin`) | in |
| F2 | the callee's written clauses at the call | inst | flexible copies | `B`: `θ(lacks)`, `θ(disjoint)` | Check/UseFacts.purs:32-40 (`UseRequired`) | `checkAll`; λ-split clause (ii) via `req_of_covers` (when `Req` includes `D`) | in |
| F3 | the callee's implied lacks and pairs at the call | inst, types | flexible copies | `B`: as F2 | Check/UseFacts.purs:19-28 (`UseSeeded`), :44-53 (`UseJoined`) | as F2 | in |
| F4 | a callee parameter with several tails, matched against one argument row | inst | flexible copies and the argument's row | `B`: `Union l r t`, read as `eq { ...t } { ...l, ...r }` | Check/RowMerge/Use.purs:46 → Desugar.purs:54; the store's predicate at Check/RowMerge/Predicate.purs:36 `made` (`Composed`); `predicateFor` runs twice (Chain.purs:60-61, Desugar.purs:49-50), so only the kept substitution's record counts (§5) | `checkAll`; `routeSig_validFin` | in |
| F5 | the callee's requirement contract at the call | inst | `θ` of the callee's rigid rows and type variables | `BQ`: `θ(pr τ)`, `θ(cmp τ)` per atom of `Q_g` | Check/Use.purs:36 `functionUse`, beside UseFacts (`ContractUse`); nothing to copy today (A6 empty) | λ-split clause (ii) (`req_of_covers`, `accepted_split`); checker: none (P1, P4) | in as a representation; `Outside RequirementAtom` for the checker until P1 |
| F6 | bare reference to `f` or partial application | inst | as F1 | as F1-F5, the reference read as an eta-expanded call | Check/Use.purs:134 `checkFunctionRef` | as F1-F5 (statements.md treats a reference as an eta-expanded call) | in |
| F7 | recursive call inside a component | inst, body | as F1 | as F1-F5, plus an admissibility record (H1) | as F1 | as F1; admissibility: H1 | in |
| F8 | constructor use of a declared type with no record-row argument | inst | base-like data | `SBase` of its ground name | Check/Use.purs:102 `ctorUse` | none specific | in |
| F9 | a call in a declaration with no rigid row (`main`): a call-site problem | inst, body | flexible only | the same atoms; no rigid variables | as F1-F5 | `decideCall_correct` (Unify/Decider.lean:82); certificates preferred (§18.20 item 2) | in |

### 3.5 Group C: requirements (printability, comparability)

| # | Source construct and obligation | Origin | Operates on | Representation | When recorded | Covered by | Status |
|---|---|---|---|---|---|---|---|
| C1 | printability in a generic body at a type that mentions the declaration's rigid row: `show(p)`, `Console.print(p)`, `crash(p)` with `p : { ...u }` (E2) | contract (it originates in the callee; it belongs in the callee's contract, written or inferred) | rigid row, as the record type `{ ...u }` | in the declaration's own check: `BQ`: `pr { ...u }`, which `Q` must entail; for its callers: an atom of `Q` (A6), copied by F5 | check: PrintSite walk at Check/Function.purs:97 over the unsettled body (today's check passes it: Check/Printable.purs:54-58, `containsFunction` is false for a tail, Check/Functional.purs:49-52); spec today: Specialize/Body.purs:92-94 notes the site, Specialize/Printable.purs:55-63 `checkSites` (called at Specialize.purs:95) judges it per key | λ-split `C`; `e2_refused`, `e2_accepted₂`, `e2_covers₂`, `e2_not_covers₁` (Examples.lean; `e2`'s `Req` is a hand-written M1 instance, F15); checker: none (P1) | in as a representation; `Outside RequirementAtom` for the checker until P1 |
| C2 | printability at a rigid type variable: `fn p(item: a): Text = show(item)` (language.md, "Printability at the ground type") | contract | rigid type variable | as C1, with `pr (tvar a)` (A7) | as C1 | test/r001-printable.test.mjs (today's per-key rule); checker: none | as C1 |
| C3 | printability in the caller at a type the instantiation solves: `fn(p) => show(p)` passed where `({ ...u }) -> Text` is expected (h1, pr-c, pr-cf) | body | flexible variable (the caller's), solved through the instantiation | `BQ`: `pr τ`, `τ` the site's **unsettled** type, metas kept | check: PrintSite walk at Check/Function.purs:97 (today's check judges the settled type there and refuses pr-cf) | λ-split `C` clause (i) at local keys; `e2c_refused`, `e2c_covers₂`, `e2c_not_covers₁`, `e2c_accepted₂` (Boundary.lean); checker: none (P1) | in as a representation; `Outside RequirementAtom` for the checker until P1 |
| C4 | printability at a type with no variable (either origin) | body | ground type | `BQ`: `pr τ`, decided at once | check: Check/Printable.purs:54-58 | test/r001-printable.test.mjs | in; split-independent |
| C5 | `main`'s result printable and ground | contract (of `main`) | ground type | none: a ground check | check: Check.purs:21 → :56-65 `printableEntry` | existing entry tests | in |
| C6 | comparison `a == b` in a generic body whose operand mentions the declaration's rigid row or type variable | contract (would belong to the callee's contract) | rigid row or type variable | none today: refused at check whatever the split (Check/Comparable.purs:77, `not comparable`); once C001 gives a contract form: `cmp τ` in `Q` (A6), as C1 | check: Check/Function.purs:96 → Comparable.purs:76-80 | test/r001-compare.test.mjs, test/compare.test.mjs | in (as a refusal); a contract form is `Outside` until C001 |
| C7 | comparison in the caller at a type the instantiation solves: `fn(p) => p == p` (h3, cmp-c, cmp-cf) | body | flexible variable, solved through the instantiation | `BQ`: `cmp τ`, `τ` the left operand's unsettled type | check: CompareSite walk at Check/Function.purs:96 (today's check refuses cmp-cf there: `Type { c: Int, f: Int -> Int } is not comparable`) | λ-split `C` clause (i) (`ok k` = comparable); no worked Lean example for `==` (review F5); checker: none (P1) | in as a representation; `Outside RequirementAtom` for the checker until P1 |
| C8 | comparison at a type still holding a hole after checking | body | hole | none: refused (`Ambiguous type`, Check/Comparable.purs:78; ADR 007 condition 2) | check: Check/Function.purs:96 | test/r001-compare.test.mjs | in (as a refusal); see H3 |

### 3.6 Group H: separate properties, holes and limits

| # | Source construct and obligation | Origin | Operates on | Representation | When recorded | Covered by | Status |
|---|---|---|---|---|---|---|---|
| H1 | **R010 admissibility**: inside a recursive component, each type or record slot of a call's witness is the caller's bare variable or mentions no rigid variable | body (the call's witness) | the witness's form | admissibility record (§2.4); never an atom, never part of validity | check, after every body: Check.purs:35 `instantiationRule` → Check/Instantiation.purs:60-70; Check/NestedArguments.purs:45-48 | test/r010-record-instantiation.test.mjs; no theorem; E5 derived (statements.md §1.5) | in, as a separate property |
| H2 | decision 3: a divided or composed split is accepted only if forced, or written by an annotation that determines it | body | the call's witness | policy record (§2.4) | today: Check/Unresolved.purs:74 `CannotTell` refuses splits the checker cannot determine, forced ones included (O4) | none (policy) | in, as a separate property |
| H3 | **holes**: metas unsolved at the end of a body | body | flexible variable | kept as a flexible variable in every atom that mentions it; never replaced by its default in the record. A hole mentioned by a requirement atom is ambiguous (ADR 007 condition 1) | check: Check/Scheme.purs:190 `holes` (Check/Function.purs:108) | none; a.wxw (statements.md §1.1) shows the defaulted case | in for the checker; lowering of a constrained hole: H4 |
| H4 | **defaults**: a record-sorted hole lowers as the empty rest, a type hole as the representative `Int` | — (lowering) | hole | none: lowering may default only holes no atom mentions; a constrained hole needs the certificate's witness at the key | spec: Specialize/Values.purs:96-98; Specialize/Lower.purs:52 | none (needs a computable `interp`, recon.md §2.3) | in for unconstrained holes; `Outside` for constrained ones until a witness slot exists |
| H5 | type-depth limit: inferred types over 1,000 levels | — (resource) | any | not recorded; reported as a resource refusal, which may depend on the solution's size, hence on the split (F11) | check: Check/Unify.purs:105 (`inferredTypeLimit`, Check/Binding.purs:41); Check/Function.purs:80 `firstTooDeep` | test/depth.test.mjs, test/poly-depth.test.mjs | `Outside` the semantic problem (resource bound) |
| H6 | specialization-count limit: more than 10,000 polymorphic keys | — (resource) | the specialized program | not recorded; may differ between splits (E4) | spec: Specialize/Keys.purs:146-153 `claim` | test/r001-go-keys.test.mjs, test/poly-run.test.mjs | `Outside` the semantic problem (resource bound) |
| H7 | several-tail lowering (Task 8) | — (implementation gap) | rows with several tails | none | spec: Specialize/Record.purs:38-44 (E_INTERNAL placeholder) | none | `Outside` (not implemented) |

### 3.7 Group O: outside the fragment

| # | Source construct and obligation | Origin | Operates on | Representation | When recorded | Covered by | Status |
|---|---|---|---|---|---|---|---|
| O1 | effect rows on arrows (`TFun a row b`) in a record-polymorphic body | types, body | effect rows | `Outside EffectRow` at the arrow when the row is not empty or is a variable; the record slice may be checked with that scope stated | translation `Ty Flex` → `STy` (recorder-interface.md §4) | none (recon.md risk 6: independence assumed) | `Outside` |
| O2 | effect operations whose label arguments hold records (`perform`, consumption) | body | effect labels | `Outside EffectArgument` | Check/Consume.purs:66, :170; also during `settleRestricted` (Check/Function.purs:81) | none | `Outside` |
| O3 | handlers and handler types | body, types | `THandler` | `Outside HandlerType` | Check/Handler.purs:26, :48 | none | `Outside` |
| O4 | `Fail` payloads: a record payload's family is its label set, which must be concrete at check | body | record payload types | `Outside FailFamily` (an open payload is already refused at check: `Fail needs a concrete error family`) | Check/Failure.purs:43; Check/Defer.purs:144-169; spec: Format/Go/Families.purs:52-61 key guard | test/r001-fail.test.mjs | `Outside` |
| O5 | data types over record rows (a constructor writing `{ ...r, ...s }`, Resolved/Core.purs:51) | types, inst | `TData` with a record-row argument | `Outside DataOverRecords` | Check/Use.purs:102 `ctorUse`; translation | none | `Outside` |
| O6 | deferrals and marks (`defer`, FX008) | body | effect rows | `Outside Deferred` | Check/Function.purs:91 `judgeDeferrals`, :92-94 marks | none | `Outside` |
| O7 | `match` exhaustiveness and redundancy | body | constructors, not rows | `Outside Coverage` (no record atom; judged on the checked program) | check: Check.purs:36 → Check/Coverage.purs:26 | test/r004-coverage.test.mjs | `Outside` (not modelled) |
| O8 | local generalization (program 8A) | body | local schemes | `Outside LocalGeneralization` | — | none | `Outside` (translation.md §1) |
| O9 | a projection primitive or row-polymorphic foreign function returning `{ ...p }` from `{ ...p, ...q }` (E3) | — | split parts | none: no such construct exists | — | `e3_differs` shows why it is excluded | `Outside` by construction |

## 4. Behaviour today, by kind of status

Four columns, never merged (§1.3). "Pass" means no refusal of that
kind. Sources: the review's probes (its §0 table), stream 5's run
(§18.18), and code reading where marked.

| Rows | Check-time refusal | Specialization-time refusal | Reference model | Generated code |
|---|---|---|---|---|
| A1-A5, B1-B8, B10-B12, B14-B15, D1-D4, F1-F4, F6-F9 | the online solver's verdicts (unification, facts, `Merge`, rule H); H's rigid-atom clause refuses the valid `route` with a false contradiction (Check/Homes.purs:31-34; SIG-ROUTE-H) | pass for one tail; H7 for several | `ValidFin` of the translated problem (§17.1, stream 5 examples) | one tail: built and run by the existing Go tests; several tails: none |
| B3 | refused at Resolve (`SecondSpread`) | — | valid (`join_validFin` and others) | none |
| B9 | refused (Task 7 placeholder) | — | not modelled | none |
| B6 with no clause | refused: `r may already have field l` (n03) | — | invalid (`lacks_sat_not_valid` shape) | — |
| C1, C2 | pass (Check/Printable.purs judges no tail or variable) | refused per key by `checkSites` (E2; r001-printable) | λ-split: refused under M0 at the bad split, accepted at the other (`e2_refused`, `e2_accepted₂`); under M1 the bad split is not covered | several tails: none; one tail: the existing tests |
| C3, C7 | refused at check when the solved part holds a function (h1, h3, pr-cf, cmp-cf); pass otherwise (h2, h4, pr-c, cmp-c) | pr-c, cmp-c: H7 placeholder | λ-split: `e2c_*` for printability; `==`'s result is not modelled (F5) | none (no several-tail Go) |
| C6 | refused whatever the split (rigid operand) | — | not modelled | — |
| C8 | refused (`Ambiguous type`) | — | not modelled (holes versus chosen parts, excluded) | — |
| H1 | refused (`PolymorphicRecursion`) for a non-admissible witness; E5 derived, not run | — | not modelled (form-sensitive) | — |
| H2 | refused (`Cannot tell …`) for undetermined splits, forced ones included (cmp-open, pk-crash-open, c21) | — | not modelled | — |
| H4 | — | defaults applied silently (S6) | not modelled | a.wxw: exit 0 (checked by stream 8, one tail) |
| H5 | refused past 1,000 levels | — | not modelled | — |
| H6 | — | refused past 10,000 keys | not modelled | — |
| O1-O8 | today's rules for each construct | O4: Families key guard | not modelled | the existing effect and handler tests |
| Run time, projection-free | — | — | `eval_split`: every projection-free term evaluates alike under two split variants | not observed (A-go; no several-tail Go) |

## 5. Preserving the original obligations

§18.20 item 5: the record keeps the original obligations, and solver
simplification must not erase what the checker needs. Rollback for
speculative checking and retries is specified here.

### 5.1 What "original" means

An atom is recorded **as generated**: its operands are the `Ty Flex`
values at the hook, with metas as metas. The read-out applies no
substitution (recorder-interface.md §2: "no solution applied"). The
online solver's bindings are a candidate certificate (recon.md step 4),
never part of `B`. Consequences:

- a `Merge` predicate that the solver later solves, replaces or moves
  (Check/RowMerge/Predicate.purs:47, :53, :59) keeps its `Union` record,
  because the record list is separate from `merges`;
- facts that propagation hands from a bound meta to its image
  (Check/RecordTail.purs:90-118) are not recorded again; the original
  `Lacking` or `Apart` stays as made;
- requirement atoms are read from the **unsettled** body (`body.value`,
  Check/Function.purs:78), not from `settled` (:95). Today's walks
  (`comparable`, `printable`, :96-97) judge the settled body, whose
  types are the solution. Recording those would keep only the ground
  instance and lose the dependence on the flexible variable that the
  split decides (cmp-c against cmp-cf).

### 5.2 Rollback

Recorded atoms are data in the substitution's row store
(RowStore.purs:54, a `recorded` field beside `merges`). Every path that
discards a substitution therefore discards its atoms, with no extra
code. The paths, each **read**:

| Path | file:line | What happens to atoms |
|---|---|---|
| a postponed effect row pair reverts to the substitution it started from | Check/RowFinish.purs:51-61 (`postponed`); test/r005b-rollback.test.mjs pins the revert of bindings and predicates | atoms made inside the attempt revert with it |
| a postponed pair retried by `settleRows` | Check/Unify.purs:84-100 | the retry re-unifies a pair whose atoms were recorded at its generation site; retries record nothing new (they are not hooks) |
| `predicateFor` evaluated twice per predicate | Check/RowMerge/Chain.purs:60-61; Desugar.purs:49-50 | only the second evaluation's substitution is kept, so one `Union` survives (checked by stream 7b's measurement: a side-channel log counts two) |
| a hint's synced state | Check/Require.purs:61-62 | the branch returns `Left`; nothing escapes |
| a hypothetical unification for a hint | Check/ArgumentRow.purs:152-156 | its substitution is discarded (`isRight` only) |
| re-unification to word a refusal | Check/Argument.purs:65 | on a refusal path; the body's check fails |
| `settleRestricted` | Check/Function.purs:81-89 | the settled substitution is kept, so atoms made while settling persist. They come only from effect consumption (O2, `Outside`) or propagation (not recorded). A record-sorted equation made there is reported `Outside EffectArgument`, never dropped |
| another declaration re-checked to relocate a diagnostic | Check.purs:49 (`hush (rechecked definition)`) | a separate run whose log is discarded; the recorded problem of a declaration comes only from Check.purs:22 |

The specification is that the recorded problem of a declaration equals
the log of the substitution that `checkFunction` keeps. No path above
adds an atom that the kept substitution's generation did not make.
§10 T7 tests each path.

### 5.3 Normalization must not erase

Recorder-interface.md §5 test 1 normalizes before comparing: it drops
trivially true atoms (`t = t`). A `Defined` atom has exactly that form
and is not trivial when `t` is a record with several parts (B14, D2).
The normalization keeps `eq t t` whenever `t` contains a record with
two or more parts, or a written label beside a tail. Equal bases (`Int
= Int`) may still be dropped.

## 6. The rigid-overlap obligation

§18.20 item 6. Check/Overlap.purs:84-96 (`ofTail`): for an extension
`{ ...p, l: e }` whose base tail is a meta, the branch writes the lack
(`addLacks`). Whose base tail is the declaration's rigid row `r`, it
looks up `lacksOf state.subst (Rigid r)`. If some added label is
missing, it refuses (`mayHave`: `r may already have field l`). If not,
it returns the state unchanged. Either way it writes nothing.

The obligation is real: the body needs `lacks r l`, and only `D` can
supply it (n03 without the clause; p02 with it). It is recorded so:

1. At entry to the `Rigid variable` arm, before `Array.find` and before
   `mayHave`, append `Lacking RigidBase r l` for **every** added label
   `l` to the store's `recorded` list. Not to `lacks`.
2. Then run the arm unchanged.

The `lacks` table, every predicate, and every other part of the
substitution are the same as without the recorder, so solver behaviour
does not change. Only `recorded` grows. If the arm refuses, the body's
check fails and the recorded problem (read for diagnostics or tests)
contains the atom that `D` does not entail. A counter-instance (`r = {
l: … }`) exists, so the refusal is consistent with ∀∃ (dossier §2.1).
If it succeeds, the atom is entailed by `D` and the checker sees it as a
`B` atom over a rigid row. Recorder-interface.md §3.3 proposed adding a
store write here. That is withdrawn: it would change the store that
later rules read.

## 7. Trust boundary and coverage

"Verified checker, tested recorder, tested port" (§18.17 item 6). Each
link:

| Link | Status | Evidence |
|---|---|---|
| L1. source → obligations (this table) | specification; unproved | stream 5's rules, the review's probes; §10 T2, T10 |
| L2. obligations → recorded log | not implemented; unproved | §10 T1-T9 |
| L3. log → `SigProblem` (+ requirement atoms) | not implemented; unproved | round trips; T12 for `Outside` |
| L4. `checkAll P T = true` → `ValidFin P` | **proved** for Lean's `checkAll` (`checkAll_validFin`) | — |
| L5. PureScript port = Lean `checkAll` | not proved | differential tests; translation validation (recon.md §3.4) |
| L6. requirement atoms (`Q`, `BQ`) checked for all keys | **no theorem**; no checker | P1 |
| L7. split acceptance | **proved** in λ-split for requirement sites (`accepted_split`), presupposing the caller's and callee's `B` (§18.24 item 3) | C⁺ and P3 proposed |
| L8. admissibility | no theorem | test/r010-record-instantiation.test.mjs; P5 |
| L9. lowering implements the certified bindings | no theorem; ground checking is evidence about bindings, not layouts (F8) | ground-check.md; a computable `interp` is a new obligation |
| L10. Go behaves as the reference evaluator | assumption A-go; no evidence for several tails | none until Task 8 |

**What the guarantees cover, exactly.** For a declaration whose
recorded `outside` is empty and whose `Q` and `BQ` are empty, a `true`
from Lean's `checkAll` on the recorded `SigProblem` establishes
`ValidFin` of that recorded problem. That covers rows A1-A5, B1-B8,
B10-B12, B14-B15, D1-D4 and F1-F4, F6-F9, as recorded. It says nothing
about whether the recording is complete (L1, L2), nor about the port
(L5).

**Where coverage is missing** (the next integration gate, §18.20):

1. Requirement atoms (A6, A7, C1-C3, C7, F5): recorded, but no checker
   and no theorem covers them. Until P1, a declaration with a non-empty
   `BQ` that mentions a variable is `Outside RequirementAtom` for the
   checker's verdict. Today's per-key `checkSites` stays a user error
   for those rows (§18.22 item 2).
2. Caller equations in split acceptance (B1 and every `B` row): `C`
   presupposes them. C⁺ with P3 would link the Sig checker's
   certificate to λ-split's local keys.
3. Admissibility (H1) and decision 3 (H2): no theorem; separate
   properties checked by today's code.
4. Lowering and Go (H4, H7, L9, L10): not covered.
5. Every `Outside` row: not covered, by design, and reported.

Summary of the table's 60 rows by the strongest coverage of the row's
representation (recording itself is untested for all of them):

| Coverage | Rows | Count |
|---|---|---|
| a Lean theorem covers the verdict on the representation | A1-A7, B1-B8, B10-B12, B14, B15, D1-D5, F1-F7, F9, C1, C3, C7 | 36 |
| an oracle or test only | C2, C4-C6, C8, H1, H5, H6, O4, O7 | 10 |
| nothing yet | B9, B13, F8, H2, H3, H4, H7, O1-O3, O5, O6, O8, O9 | 14 |

Notes on the count. A6, A7, C1, C3 and C7 are counted under "theorem"
for λ-split's `C` only; no theorem covers the checker's verdict on
them (L6). D3 is counted for `param_image` (one example) and is
derived in general. B3's theorems are about examples whose literals
the compiler refuses today. O9 has `e3_differs`, which shows why it is
excluded, not that anything about it is checked; it is counted as
nothing.

## 8. Proposed statements (unproved)

Statements first, for the author's approval (proof-dossier policy).
None is argued here beyond a sketch of why it is believed.

**P1. Requirement atoms in the signature problem.** Extend the
problem, not `Atom`:

```text
ReqAtom ::= pr τ | cmp τ                    (τ : TExpr)
HoldsR θ (pr τ)  := ∃ g, evalT θ τ = some g ∧ Printable g
HoldsR θ (cmp τ) := ∃ g, evalT θ τ = some g ∧ Comparable g
SigProblemR := SigProblem + Q (over rigid variables) + BQ
ValidFinR P := ∀ finite θR, Sat θR D → SatR θR Q →
               ∃ finite θF, Sat (combine θR θF) B ∧
                            SatR (combine θR θF) BQ
```

- P1a (source shape): if `D` is clause-only and every atom of `Q` has
  the shorthand form `pr { ...r }`, `cmp { ...r }` or `pr (tvar a)`,
  then `D ∧ Q` is closed downwards and holds at the all-empty
  assignment (with type variables at a base type). So vacuity still
  never arises from source. Believed by the argument of
  `clauseOnly_down`: removing fields keeps a type printable.
- P1b (a checker): a computable `checkAllR` with
  `checkAllR P T = true → ValidFinR P`. Not believed provable with
  `checkAll`'s label-blind patterns alone: a requirement on a flexible
  part of a rigid row (`pr { ...u' }`, `u' ⊆ r`) with no `r printable`
  in `Q` can be met only by placing labels by their field types, and a
  pattern does not see field types. Under the row-level shorthand in
  `Q` (every rigid row a requirement touches carries it), the patterns
  stay label-blind. Which of the two the language wants is open
  question 2.

**P2 (C⁺). Caller equations in split acceptance.** Extend λ-split's
`Prog` with per-declaration body constraints `Bc f : Problem`, shared
by split variants:

```text
Covers⁺ P := Covers P ∧ ∀ f θ, Req f θ → Sat (loc f θ) (Bc f)
Accepted⁺ P f θ := Accepted P (loc f θ) (body f) ∧ Sat (loc f θ) (Bc f)
C⁺: SplitVariant⁺ P₁ P₂ → Covers⁺ P₁ → Covers⁺ P₂ →
    ∀ f θ, Req f θ → Accepted⁺ P₁ f θ ∧ Accepted⁺ P₂ f θ
```

Like `C`, it is near-definitional. Its content is in P3, which says
when `Covers⁺` holds.

**P3. Copy placement: from the Sig certificate to λ-split's local
keys.** If `checkAll (sig f) T = true` and `f`'s local key is the
certificate's interpretation (`loc f θ = combine θ (interp T θ)` for
every `θ` satisfying `D f`), then `Sat (loc f θ) (Bc f)` for every such
`θ`, where `Bc f` is the `B` of `sig f`. With P1, the same for `BQ`
and `SiteOk` at every local site. This is the theorem ground-check.md
§5.3 lists as missing. It needs the certificate's interpretation, which
is `noncomputable` today (recon.md §2.3). A statement about existence
does not need it computable.

**P4. Instantiation carries contracts.** For a call `g_k` in `f`, if
`f`'s recorded `B` and `BQ` contain `θk(D g)` and `θk(Q g)` over the
call's fresh variables, and `wit k` maps `g`'s rigid variables to their
images under `f`'s solution, then any `θ'` solving `f`'s problem gives
`Sat (wit k θ') (D g) ∧ SatR (wit k θ') (Q g)`: clause (ii) of `Covers`
with `Req g := Sat D ∧ SatR Q`. Believed by renaming.

**P5. Admissibility is separate (E5 formal).** Define `Adm` on a
witness's syntax (R010's rule). Example statement: for `walk`
(statements.md §1.5), two witnesses both satisfy `walk`'s recursive
call's `D` and `B`, one is admissible and one is not. Specification
statement for a future search: it returns a witness that is valid and
admissible, or Unresolved; it never refuses because one particular
witness is not admissible.

**P6. The row-level shorthand distributes.** For a defined composition,
`Printable (evalT θ { l̄: τ̄, ...r1, ..., ...rk })` iff every `τi` is
printable and every `{ ...rj }` is printable; `Printable` of `{}`; and
the same for `Comparable`. This is what makes `r printable` mean
`pr { ...r }` compositionally (§2.3).

Pending from the review, not new: F15 (`e2_req₁ : (e2 w).Req = Req₁
(e2 w)`, or the wording "a hand-written instance of M1"), being handled
in statements.md.

## 9. What changed from streams 5 and 8

| # | Stream 5 | Stream 8 | Reconciled |
|---|---|---|---|
| M1 requirement atom | `printable τ` in `B`, plus a row-level clause `r printable` in `D`; field-level said to be "outside set terms" | `ok k` on the site's ground type; forcing by field type | field-level atoms `pr τ`, `cmp τ` on record types (§2.3); the row-level clause is a shorthand, `r printable` ≡ `pr { ...r }`, with the distribution lemma P6. Whether a caller may meet a requirement by type-directed placement is open question 2 |
| M2 comparability | not a requirement (C2, false: F1) | a requirement kind | `cmp τ`, recorded on both origins: C7 (caller, recorded at check), C6 (callee: refused today; a contract form waits for C001) |
| M3 timing | caller-side requirements judged after specialization (S1; false: F2) | at check time, at the local key | caller-side requirements are judged at check (Check/Function.purs:96-97) and recorded there from the unsettled body (C3, C7). Only callee-origin printability (C1, C2) is judged per key after specialization today |
| M4 where a callee's requirement lives | `D`, a declared clause; `divide` invalid without one under the ∀ reading | `Req`, declared (where `C` applies) or `Req₁` (inferred from local sites) | in the callee's **contract** `Q` (A6, A7), written or inferred by INF001/C001 (§18.22 item 1). It reaches callers through instantiation (F5). Inference must not choose a split first (E2′, §18.24 item 5). The ∀ reading holds once the contract carries the requirement; "invalid without a written clause" is only the conservative fallback |
| M5 `B` | every body atom (R1-R16) | none; `C` does not cover `B` (F6) | `B` recorded in full (group B, D, F) and covered by `checkAll`; `C` presupposes it (§18.24 item 3); C⁺ and P3 proposed to link them |
| M6 fragment | update, removal, patterns, `let`, `match` translated | excluded | translated and recorded (B7, B8, B10-B12); covered by `checkAll`, not by `C`. Removal and rest over several tails (B9) and pattern growth on flexible rows (B13) are `Outside` |
| M7 R010 | side condition on witnesses ("restricts which solutions count", F13) | excluded; a rule on form | admissibility, a separate record and property (H1); never part of validity |
| M8 holes | lowered as the empty rest (S6) | excluded | kept as variables in the record; a hole a requirement mentions is ambiguous; lowering may default only unconstrained holes (H3, H4) |
| M9 calls | R11, R12 instantiate `D_f` into `B` | clause (ii), `Req g` at the witness; a reference as an eta-expanded call | F1-F6: `D_g` into `B` and `Q_g` into `BQ` (`ContractUse`), a reference as an eta-expanded call; P4 links them to clause (ii) |

Other corrections applied: four kinds of status kept apart (§1.3, §4);
the type-depth limit listed beside the key limit (H5, F11); `==`'s
run-time result recorded as not modelled (§4, F5); the written split is
a caller-side annotation, which is also where caller-side requirements
fail (B14, F12); recorder-interface.md's store write at Overlap is
withdrawn (§6); the `t = t` normalization keeps definedness atoms
(§5.3). The applied-`peek` claim (stream 5, F3) is withdrawn per
§18.24 item 4 and plays no part here.

## 10. Test plan

Adapted from recorder-interface.md §5 (tests 1-6) to the reconciled
table, plus tests for what this specification adds. None exists yet,
since nothing is implemented. Incompleteness is the dangerous direction
throughout.

1. **T1, against the §17.1 hand translations** (sig-oracle/
   source-boundary.mjs). As before, with §5.3's normalization: keep
   `Defined` atoms. Rows A1-A4, B1-B4, F1-F4.
2. **T2, against an independent translator of this table.** A
   JavaScript translator over the resolved AST that implements each
   in-fragment row, requirement atoms included, run with the recorder
   over the measurement corpus (measurements.md: 488 functions with a
   rigid row). A disagreement is a finding against one of them, decided
   by the row's text. Each row id appears in the translator, and a
   script checks that every in-fragment row id is implemented and every
   `Outside` row id maps to a constructor.
3. **T3, refusal agreement** (bounded.mjs). As before for `D`/`B`.
   Requirement atoms need bounded.mjs extended with `pr`, `cmp` over its
   ground values (a typed oracle change, labelled before running).
4. **T4, agreement with the measurement tool** (labels, `R`, `Rm`). As
   before; it does not see requirement atoms.
5. **T5, hook mutation.** As before, one hook at a time, now including
   `RigidBase`, `Defined`, `ContractUse`, `PrintSite`, `CompareSite`.
6. **T6, maker coverage.** Every `Maker` appears in at least one
   fixture, and every row of §3 with a hook names a maker that appears.
7. **T7, rollback** (§5.2). One fixture per path: a postponed effect
   pair that reverts after making a record atom; a `settleRows` retry;
   two-spread literals and two-tail uses (`predicateFor` twice); a
   refused argument with a hint. The recorded problem must equal the
   hand expectation: no orphan atom from a discarded substitution, no
   duplicate `Union`.
8. **T8, preservation** (§5.1). (a) Certificate soundness: for every
   body the online solver accepts, its substitution read as a
   certificate passes `checkAll` on the recorded problem (recon.md §6
   Q7: a failure is an internal error). (b) For C3 and C7 fixtures, the
   recorded requirement atom mentions a flexible variable, never only
   its solved ground type (cmp-c and cmp-cf must record the same atom
   and differ only in `B`).
9. **T9, the rigid-overlap obligation** (§6). n03 (refused) and p02
   (accepted) both record `lacks r reviewed`. A differential compares
   the whole substitution with and without the recorder, except
   `recorded`, on the corpus: it must be equal (solver behaviour
   unchanged).
10. **T10, origin and type.** Fixtures from the review's probes: h1-h4,
    cmp-c, cmp-cf, pr-c, pr-cf, eq-c, eq-d, E2's `peek` in `divide`.
    Each records its requirement atoms with the expected origin (body
    for the caller's sites, contract for `divide`'s), and no caller
    site adds an atom to the callee's `Q`.
11. **T11, four statuses.** Each fixture carries four expected
    outcomes: check-time verdict, specialization-time verdict,
    reference-model verdict (a Lean theorem name, or "not modelled"),
    generated-code behaviour (or "not observed"). No outcome is inferred
    from another.
12. **T12, `Outside` is never silent.** One fixture per row of group O
    and per `Outside` row of groups B and H. Each recorded problem has a
    non-empty `outside` with the expected constructor, and no checker
    verdict is reported as covering the whole function.
13. **T13, admissibility apart.** `walk` (statements.md §1.5) and the
    r010 tests: the admissibility record holds the witness's form, and
    the recorded `D`, `B` are the same whether the witness is admissible
    or not.
14. **T14, holes.** a.wxw (defaulted, unconstrained: no atom mentions
    the hole); a hole mentioned by a requirement atom (recorded as a
    variable, flagged ambiguous); `route`'s `u` (constrained by `B`;
    lowering must not default it).

Order: T4 and T9 need only hooks; T1, T7, T8a and T12 need the
translation; T2, T3 and T10 need the independent translator and the
oracle extension.

## 11. Open questions for the author

1. **Contract syntax before C001.** Requirement atoms on rigid rows and
   type variables (A6, A7) have no syntax and no inference. Is a
   written form (`where u printable`) wanted as the documented
   conservative fallback §18.22 item 1 allows, or do these rows stay
   unrecorded in `Q` until INF001/C001?
2. **Field-level satisfaction at a generic call.** When a callee
   requires `pr { ...u }` and the caller's `u'` is a part of its rigid
   row `r`, may the caller meet it without `r printable` by keeping
   `r`'s non-printable labels out of `u'` (type-directed placement)? If
   yes, the checker needs typed certificates (P1b) and a split chosen
   by field types. If no, the caller's contract must carry `r
   printable`, and the patterns stay label-blind.
3. **Callee-origin comparability.** Keep today's refusal of any rigid
   operand (C6) until C001 gives `cmp` a contract form, or record
   `cmp` in `Q` now, like printability?
4. **Effect rows** (O1). Report any record-polymorphic body with a
   non-empty effect row on an arrow as `Outside` as a whole, or check
   the record slice with its scope stated (§18.20 item 7 allows the
   second)?
5. **Pattern growth on flexible rows** (B13). Specify today's
   "extend, or close when every known field is listed" as atoms (and
   check whether arm order can change a verdict), or keep it `Outside`?
6. **Constrained holes** (H3, H4). Until the checked IR carries
   witnesses, should a body whose hole is mentioned by any atom be
   Unresolved, so that the empty-rest default never meets a constraint?
7. **What forces a split under decision 3** (H2). Does a requirement
   atom count among the atoms that can force a split (E2's split is
   forced at its ground key only once `pr` is counted)? And is
   "forced" judged on the recorded problem of the caller including its
   annotations, as §18.24 item 1 suggests?
8. **Order of inference.** Functions are checked one at a time against
   their callees' written signatures (Check.purs:22). An inferred
   contract needs callees first and a fixed point in recursive
   components. Should the recorder's output be kept per declaration
   until a later inference pass, as §18.22 item 1's "preserving the
   relevant constraints" suggests?
9. **Result-only and contravariant implied clauses** (A3; stream 5's
   §8 Q2, Q3) remain open; the table records them as today's compiler
   does.
