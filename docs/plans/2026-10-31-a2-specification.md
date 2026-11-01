# A2 specification: the trusted effect validator (2026-10-31)

Implementation plan (implemented through Task 15 as a non-minting
validator; Task 16, the minting switch, held; dossier §18.147):
docs/plans/2026-10-31-a2-validator-plan.md.

Status (2026-11-01): **implemented as a non-minting validator, plan Tasks
0-15 (dossier §18.145-§18.147); Task 16, the minting switch, held, so the
existing substitution-only `certify` still mints under F14 (joint-checker
assurance); no soundness claim.** Amended 2026-11-01 for the completion
wave (dossier §18.148 (2)-(5)): §4.1's checks numbered, with check 4 (the
companion table) and check 5 (arity metadata) added and the
`ResultClauses` ruling ratified under check 2; §9's two controller
rulings ratified with their failure ordering; §12 C6's prediction
corrected; §2.5 and §11's compatibility property stated up to record
field order with one canonical comparison. Then, after the wave
review (2026-11-01): §5 item 3 gains check (k) and the bare clause-row
reading, §5 item 1 the `InDeclarations` entry, §4.1 check 5 is stated
in full with its blind spot (I1, M3); record tails keep their order in
the canonical comparison (I2); C6's hole-bound case is "observed on
the fixture" throughout. Earlier status: **main
choices approved with amendments (dossier §18.139); this revision
is the fix pass §18.141 authorized after the adversarial review of §18.140,
applying rulings A1-A6. Not ready for implementation authorization; no validator
exists or is authorized; no soundness claim.** A scoped adversarial re-review of
the repairs and their examples followed (§18.142); this revision applies the
§18.143 correction pass (N1-N4, C6 and the re-review's S3 items), dated
2026-10-31 and citing §18.143, for the author's own commit. The concrete package
representation (§2) is **proposed**, not an approved type. Earlier revisions:
0469df3 (proposal, D7 since rejected), 829ada5 (consistency pass, reviewed in
§18.140). §14 maps every §18.140 finding to its repair.

Sources: the A2 packet (docs/plans/2026-10-31-a2-decision-packet.md),
the options note (docs/plans/2026-10-25-amin-a2-options.md), the
statements (docs/plans/r0-amin-statements.md, revision 3.6 with §R7b
and the dated amendments through 2026-10-31), dossier §18.138-§18.141,
the overnight ledger's "A2 specification review". Code citations are to
d9bd6d7.

**Rulings applied.** From §18.138: R-a, the installed-C `Consume`
(`AtInstalledC`) stands for count/pairing and mark edges only; R-b,
`bare: true` ignores arguments without erasing them; R-c, a non-handler
`with` records `Install` and `UnframedInstall` is a hard blocker; R-d,
mixed coverage rows report the recorded part demonstrated, validation
open. From §18.139: D1-D6, D8-D15 approved with amendments; D7
rejected (E9 after settling; U4 open). From §18.141:
- A1. Forcing refusals keep §R7b's `NotCertifiable`; the forced-tail
  dependency is defined structurally, indirect references included,
  and described as a dependency, not proof that forcing caused the
  failure.
- A2. The authoritative completed, forced package (or an opaque value
  preserving it) is retained, and the build witness is derived from the
  same data; the completed package before defaults (keeping the holes
  the witness contract needs) is distinguished from its settled
  interpretation, which the obligations judge, with shared hole
  identities.
- A3. Unsolved type and record-row images are refused before the
  obligations, like effect images, by one solved-form definition.
- A4. A declared, well-formed site lacking demonstrated recording
  coverage (`AtDeferredRow`) is not a `RecordDefect`; its condition is
  evaluated when supported.
- A5. Record references are validated before search, with their sorts
  and permitted domains (declared rigids, package-owned variables,
  record-owned forced variables).
- A6. The record is validated first, then `Unsupported` checked, both
  independent of candidates and before I3; existing routing
  distinctions kept.

Labels: **published**, **derived**, **reasoned** (from code or design,
no run), **bounded**, **observed** (a run; who ran it is named),
**decided**, **proposed**, **owed** (a check not yet run), **open**.

## 1. Scope and trust

`certify` judges one input package against the recorded problem and
searches for nothing. Its only rewrites are completion (§4): absent
type and row variables become fresh holes, and forced ResultC tails
become copies of an input image. Both are fixed by the record and the
input. A defect in it can certify a wrong program; a defect in the
search can only lose acceptances. The certifying-algorithm pattern is
used one-sidedly (acceptances certified; a refusal means "cannot
certify"); its source was read only through an author's slides (§13,
partly).

Relied on, not established: O-SUB, A1 (the statements' static-rows
obligation, not ruling A1), [FX008-5] points 1-4, Definition 4.2's
sufficiency, E10's reading, U2, U3, U4 (the hole default, open), U6/P1,
U8's extension (statements §0e). D6's differential tests agreement on
the inputs it exercises; it does not establish E12's exhaustiveness.

## 2. The package (proposed representation)

### 2.1 What exists today

- `Substitution = Map Var RTExpr` (src/Features/Check/Strategy/
  Candidate.purs:31), one map for both sorts; a record-row variable's
  image is a `Record` term (`generic`, Candidate.purs:33-44).
- `RTExpr` (src/Domain/Recorded/Atom.purs:52-57): `Base`, `Arrow`,
  `TVar Var`, `Record fields tails`, `App Head args`. Nullary data is
  `Base (DataBase t)`, other data `App (DataHead t) args`, a handler
  `App (HandlerHead e) args` (generation:
  src/Features/Check/Generate/Elab/Recorded.purs:36-40; read-back:
  src/Features/Check/Strategy/ReadBack/Type.purs, `readType`). G0's
  equality is syntactic (src/Features/Check/Strategy/Atoms.purs:75-79).
- `Var = RigidVar VarId | FreshVar Path Role` (Atom.purs:36); hole n is
  `holeVar n` (src/Domain/Recorded/Hole.purs:19-22).
- `Witness = { bindings ∷ Map Var Binding, names }`, `Binding = Inline
  RTExpr | Free Int` (src/Domain/Verdict/Witness.purs:25-27), built by
  `bindingsOf` (src/Features/Check/Strategy/Witness.purs:137-148):
  absent flexible variables become fresh `Free` holes numbered after
  the largest hole in the candidate's type images.
- `Certified = Certified Valid Compilation`
  (src/Domain/Verdict/Certified/Internal.purs:13), minted only by
  `certify` (src/Features/Check/Strategy/Substitution.purs:53-58).
- The recorded side (src/Domain/Recorded/Effect.purs:40-92): `EVar`,
  `MTy` (`MBase`, `MVar`, `MArrow MTy MRow MTy`, `MRecord`, `MData
  TypeId (Array MTy) (Array MRow)`, `MHandler MLabel { inference,
  clauses ∷ Maybe MRow }`), `MarkRef = Written Fixed | At Position`.
  Corpus (observed, this pass's probe over 3071 declarations): no
  recorded `MBase (DataBase _)`; nullary `MData t [] []` is the only
  spelling of nullary data (16850 distinct objects; §18.140's reviewer
  counted 52412 occurrences); 375 recorded handler types own a C and
  171 do not.

### 2.2 Proposed types

Module `Domain.Verdict.EffectPackage` (Domain; types only; imports
Domain.Recorded.Atom, Domain.Recorded.Effect, Domain.Row, Domain.Type).

```purescript
-- N, M, or the join of named rigid marks; compared on normal forms
-- (`TermJ ∅` normalizes to `TermN`).
data Term = TermN | TermM | TermJ (Set String)

data PTy
  = PBase Base                    -- never `DataBase` (I3, canonical)
  | PVar Var                      -- a declared rigid at SortType, or a hole
  | PArrow PTy PRow PTy
  | PRecord PRecordRow
  | PData TypeId (Array PTy) (Array PRow)
  | PHandler PLabel { inference ∷ PRow, clauses ∷ Maybe PRow }

-- Fields, and tails that are declared SortRow rigids or holes.
type PRecordRow = { fields ∷ Array (Tuple String PTy), tails ∷ Array Var }

type PLabel = { effect ∷ EffectRef, args ∷ Array PTy, mark ∷ Term }

data PTail = PTailRigid VarId | PTailHole Int
type PRow = { labels ∷ Array PLabel, tail ∷ Maybe PTail }

type EffectPackage =
  { types ∷ Map Var PTy           -- flexible SortType variables
  , rows ∷ Map Var PRecordRow     -- flexible SortRow variables
  , effects ∷ Map EVar PRow       -- package-owned effect-row variables
  , marks ∷ Map Position Term     -- recorded positions
  }

-- The completed package, before defaults (§2.4); constructor hidden.
newtype Completed = Completed EffectPackage
```

- **Sort-correct by construction**: one map per sort; I3 checks that
  each key's recorded sort is its map's.
- **Marks inside bindings** are the `Term` on each `PLabel` (copies,
  extension labels, handled labels). A recorded mark is read through
  the record: `Written FixedN ↦ TermN`, `Written FixedM ↦ TermM`,
  `Written (FixedRigid k) ↦ TermJ {k}`, `At pos ↦ marks[pos]`. No
  image names a `Position`.
- **Nullary data has one spelling**, `PData t [] []`, as recorded;
  `PBase (DataBase t)` is refused as non-canonical. `erase` maps it to
  `Base (DataBase t)` (§2.5), so the erasure is compatible with today's
  read-back by a stated property, not only by this case (§11).
- **An image's handler type may own a C** (`PHandler … clauses: Just`;
  resolves §18.140's question, proposed). An image C is a copy, not a
  home: statements §2's three homes stay the literal, the ResultC and
  the annotation C, and an image copy is joined to its source by the
  recorded E1 that moved it, under Definition 4.1(d) (clauseRow ≡
  clauseRow′ with marks and tails). An image C is read only through
  `Equal` obligations (§18.143 N2). `Install` never reads one: an
  `Install` whose recorded handler is not syntactically an `MHandler`
  (an image variable included) records `Unsupported UnframedInstall`
  and is refused before I3 (§4), and an `Install` over a recorded
  `MHandler` reads that recorded type. Reason for allowing it: today's
  checker carries C through metas by reference (UnifyParts
  `unifyClauses`), so honest read-back images would hold it
  (reasoned); refusing it would force every image to rule J's alias.
  Case C13 keeps the two claims apart.
- **Holes**: type and record-row holes are `holeVar n`, an effect-row
  hole `PTailHole n`; one sort per hole number across the three sorts;
  marks hold no holes.

**Alternative for the reviewer**: generalize `MTy` over its mark and
tail types; it changes a pinned recorded type and every generation
signature. Not chosen.

### 2.3 Domains

Let F be the forced tails: every `EffFresh p ResultClauses` that is the
tail of a ResultC in `instances[p]` (minted by
src/Features/Check/Generate/Owned.purs:54-56; 17 in the corpus,
observed by §18.140's reviewer, each its ResultC's tail). **Placement
rule** (§18.143; checked at step 0): a member v of F occurs in the
record only as the clause-row tail (`clauses: Just C`, C's tail) of
`instances[p].result` and of exact copies of that result type. Observed
by §18.142's reviewer over the corpus: in `Install` 11, `AtInstalledC`
11, `Equal` 6, `nodes` 17, `instances` 17 occurrences, all in that
position.

- **Input domain** (a strategy supplies it; I3 checks it):
  `keys effects` = `flexEff` (Effect.purs:191) \ F; `keys marks` =
  `positions` (Effect.purs:192); `keys types` and `keys rows` ⊆ the
  problem's flexible variables of each sort (absent allowed, as
  `generic` and `bindingsOf` allow today).
- **Completed domain** (judged and certified): every flexible type and
  row variable, `flexEff` (F included), `positions`.

The asymmetry is inherited: absent type and row variables keep today's
fresh-hole meaning so G0 and the witness do not change; effect
variables and positions are exact (statements §2, N10; §18.97). A
well-formed term at the unread frame of a non-handler `with` is
required by the domain and conveys no evidence that the installation is
valid (§18.139). Under A6 such a problem is refused before I3 (§4), so
the requirement is checked by I3's own tests, not seen in `certify`'s
verdict (C5).

### 2.4 Completion, settling and hole identities (A2)

- `complete problem P_in = Completed P_cu`, where P_cu is P_in plus:
  (i) each absent flexible type variable `↦ PVar (holeVar n)` and each
  absent row variable `↦ { fields: [], tails: [holeVar n] }`, n fresh,
  assigned in `Ord Var` order from h+1, h the largest hole number in
  any of P_in's `types`, `rows` and `effects` (marks hold none).
  Completion renames no existing hole: it is the identity on P_in's
  hole numbers and assigns distinct new ones, so the map from holes to
  holes is injective, and the hole contract, which reads hole identity
  (which variables share a hole) and each hole's sort, judges the same
  facts it would judge under today's numbering (reasoned). Today's
  `bindingsOf` numbers fresh holes after the largest hole in type
  images only, so the numerals can differ; whether any pinned witness
  or test records those numerals is owed (§11); (ii)
  each v ∈ F `↦ P_in.effects[t]`, t R's tail variable in the same
  instance result (an exact copy, holes keep their numbers).
- `settle` replaces every hole by lowering's default for its sort
  pointwise (type `PBase IntBase`, record tail dropped, `PTailHole`
  dropped so the row closes), as ReadBack.Type `settled` does
  (ReadBack/Type.purs:88-102).
- P_c = settle P_cu is the **settled interpretation**: every
  obligation, E9 included, reads it.
- **The witness is derived from P_cu**: `witnessOf (Completed P_cu)`
  is `{ bindings, names: [] }` with, for every flexible variable, `Free
  n` when its erased image is the bare hole n of its sort, else `Inline
  (erase image)`, the rule `bindingsOf`'s `binding` applies today
  (Witness.purs:150-165). Because completion already bound every
  absent variable, `bindingsOf`'s own fresh numbering is not used: one
  numbering, completion's, shared by P_cu, the witness's `Free n`, the
  hole contract and P_c (n settles to n's default).
- **The certificate retains P_cu and stores its compilation**
  (§18.143 N1; §7): `certify`, in Features.Check.Strategy.Substitution,
  where the `RecordedProblem` and `coverage` are available
  (src/Features/Check/Strategy/Witness.purs:69-75), computes
  `compilation = either NoWitness (const (Witnessed w)) (coverage
  (flexDomain problem) problem w)` with `w = witnessOf (Completed
  P_cu)`, once, at mint time, from the same `Completed` value it then
  stores. Domain accessors return the stored fields and compute
  nothing. Nothing completes P_in a second time or renumbers a hole:
  `complete` runs once per `certify` call, its result is the only
  source of P_c, of `w` and of the stored package.
- Relationship: P_c = settle P_cu by definition. On F,
  settle(complete P_in) and complete(settle P_in) agree (a copy of an
  image settles as the image does); on absent variables they differ
  (completing after settling leaves fresh holes unsettled). The order
  is therefore complete, then settle (statements §7, amended; case C6
  separates them). Property tests owed (§11).

### 2.5 Erasure

`erase ∷ EffectPackage → Map Var RTExpr` (Features; §8): `types` and
`rows` merged; `PBase b ↦ Base b`; `PVar v ↦ TVar v`; `PArrow a _ r ↦
Arrow (erase a) (erase r)`; `PRecord { fields, tails } ↦ Record
(sortWith fst fields') (sort tails)`; `PData t [] [] ↦ Base (DataBase
t)`; `PData t as _ ↦ App (DataHead t) (erase as)` otherwise; `PHandler
l _ ↦ App (HandlerHead l.effect) (erase l.args)`; effect rows and terms
dropped. This mirrors `recordedWith` (Elab/Recorded.purs:25-42) case
for case. **Compatibility property (owed):** for every corpus
declaration the online strategy solves, `erase` of its honest package
equals today's read-back substitution, up to record field order
(approved 2026-11-01, §18.148 (5)), compared by the one canonical
comparison of §11.

## 3. The ResultC binding (D5)

Statements §2's ResultC row (amended 2026-10-31, §18.139): an input
package holds no binding of `⟨p, result clauses⟩`; it is derived by
forcing; supplying one is `Malformed (BindsForced v)`, checked before
any other domain fact (§5) so it is reported as such; the completed
package includes it. Forced bindings are not I3-checked: they are
copies of input images that I3 has checked, so they are in solved form
by construction. Revisit if the provisional restriction is lifted.

## 4. The pipeline

```
certify problem P_in:
  0. record validation   problem only (pre-search block, §6)
  1. Unsupported check   problem only (rule 1 already blocks)
  2. I3 on P_in          domain, sorts, canonical forms, terms,
                         solved form for all sorts (A3), keyless Fail
  3. G0 on erase (settle P_in)          = today's projection
  4. P_cu = complete P_in;  P_c = settle P_cu
  5. obligations on P_c, in recorded order, each judged fully
  6. Certified Valid (Completed P_cu)
```

- **G0's projection (kept apart, §18.141):** `erase (settle P_in)`,
  equal to today's `map settled unsettled` (Substitution.purs:53-55)
  given `erase`∘`settle` = `settled`∘`erase` (owed). G0 does not see
  completion's fresh holes or forced tails (effect rows), as today.
  Owed: G0 accepts `erase P_c` whenever it accepts `erase (settle
  P_in)`.
- **The obligations' package:** P_c only.
- **Entry point (repair 3, A6):** steps 0 and 1 read only the problem
  and precede I3. A problem with a record defect or an `Unsupported`
  obligation never reaches step 6, whatever the caller; Decide's rule 1
  (and the new pre-search block, §6) are routing, not what prevents
  certification.
- **No path bypasses effect validation:** `certify` with this signature
  replaces today's G0-only `certify` as the only minter of `Certified`
  (§8).

### 4.1 Record validation (step 0; A5, D12)

Problem-only, before search and again in `certify` as a backstop. A
violation is `RecordDefect`. The checks, numbered by their index j in
`RecordDefect (provenance, j)` (§5 item 1; amended 2026-11-01, dossier
§18.148, which added checks 4 and 5 and ratified check 2's last clause):
- **0**: every `Consume`'s `marks`/`bare` match §9's site table (corpus:
  exact match, observed by §18.140's reviewer);
- **1**: every recorded reference is in its permitted domain at its sort:
  effect variables in `effectRigids` (`EffRigid`), `flexEff` \ F
  (package-owned) or F (record-owned; where it may occur is §2.3's
  placement rule, which replaces this bullet's older wording, 2026-10-31,
  §18.144); type variables declared
  rigid or flexible in `fields.vars` at the sort of their position;
  positions in `positions`; `FixedRigid k` with k in `rigidMarks`;
  every `flexEff` member and position referenced somewhere (corpus: two
  sets agree, observed by §18.140's reviewer);
- **2**: every forced tail v ∈ F occurs only where §2.3's placement rule
  allows (§18.143); and **ratified (author, 2026-11-01, §18.148 (3))**: a
  `⟨q, result clauses⟩` (`ResultClauses`) variable outside the
  record-derived forced set F is a `RecordDefect`, wherever it occurs (a
  ResultC at another path, or one whose R is closed, which forcing
  omits). Implemented failure ordering, kept: it is check 2 of the first
  entry in §5 item 1's order that names it (an obligation, else the
  table entry, as `InRecord`), so checks 0 and 1 of that entry, and any
  earlier entry's defect, are reported first;
- **3**: every recorded `Fail` label with a flexible-variable payload has a
  `FailConcrete` on that variable, and no recorded `Fail` payload is a
  declared rigid variable, an arrow, a handler or a record with a tail
  (§4.2, §18.143);
- **4** (added 2026-11-01, §18.148 (2); Effects.RecordCompanions): every
  owner obligation has the companions this table requires, each exactly
  once, and every companion has an owner. A companion's identity is the
  owner's declaration, path and rule with the companion's role; it
  records a site, a source and a target (flags are check 0's):

  | Owner (rule, role) | Companion role | Records | Source | Target |
  |---|---|---|---|---|
  | `Install` over `MHandler` R C (E21, `InstallSite`) | `Consumed InstallR 0` | `Consume InstallR` | R (`inference`) | the `Install`'s `ambient` ρ |
  | same | `Consumed AtInstalledC 0` | `Consume AtInstalledC` | the owned C, else R (rule J) | ρ |
  | `Install` over any other type (E21, `InstallSite`) | `UnframedWith` | `Unsupported UnframedInstall` | — | — |
  | `HandlerLit` (E20, `LiteralSite`), per clause row c_k | `Consumed (ClauseIntoR k) 0` | `Consume (ClauseIntoR k)` | c_k alone | R alone (`inference`) |
  | same | `Consumed (ClauseIntoC k) 0` | `Consume (ClauseIntoC k)` | c_k alone | C alone (`clauses`) |
  | `Defer` (E16, `DeferRegistration`) | `DeferInto` | `Consume AtDefer` | d alone (`row`) | the `Defer`'s `enclosing` |

  ("Alone": the row of that variable with no labels, as generation
  records it.) An owner violates check 4 unless its own rule and role
  are the table's and each companion it requires occurs exactly once; a
  companion-kind obligation (`Consume` at `InstallR`, `AtInstalledC`,
  `ClauseIntoR k`, `ClauseIntoC k` or `AtDefer`, or an `Unsupported
  UnframedInstall`) violates it unless some owner requires it. Each
  owner is recorded before its companions, so a missing, miswired or
  duplicated companion is reported at the owner's provenance, and a
  companion whose owner is absent, or which is stray beside an intact
  one, at its own. Corpus: no defect over the effect pin's 3071
  declarations (observed, test/r0-a2-record-corpus.serial.test.mjs).
  This is local record consistency only: it does not show that
  generation recorded every source site that needs an owner; U6 stays
  open;
- **5** (added 2026-11-01, §18.148 (1); Effects.RecordArity, schema
  and reading in docs/plans/2026-11-01-a2-arity-metadata.md §2.1,
  §2.3): two parts.
  (i) **The declared arities are valid** (`effects.declarations`,
  Effects.Arity `validDeclarations`): both built-ins are recorded with
  Resolve's counts (`builtinEffects`: `Fail` 1, `Console` 0); every
  effect count and every data type's `types` and `rows` count is
  non-negative; and the data map's key set equals `holders.declared`
  (recorded independently, ruling K-a), so a declared type dropped
  from the metadata and an extra one are both defects. A user effect's
  count has no second record to agree with: only its sign is checked.
  So a phantom user effect id (an extra `UserEffect` key the program
  does not declare, with any non-negative count) is **not** detected
  by this check (review M3, 2026-11-01). The metadata is trusted input
  from generation: accepting a fabricated declaration inside it does
  not let a package invent undeclared labels (check (k) refuses any
  label the metadata lacks), and the correctness of the recorded
  declaration environment stays a generation obligation (author,
  §18.150). Invalid arities are reported
  once, as the `InDeclarations` entry (§5 item 1), never at an entry
  that reads them.
  (ii) **Every recorded application conforms** to valid arities, in
  every entry (obligations, `instances`, `annotations`, `nodes`,
  `ambient`, `signature`), by the reading of §5 item 3's check (k):
  an effect label (its argument count, no rows) or a data type (its
  type- and row-argument counts; `DataBase t` counts as `t` with 0 and
  0) whose head is declared with exactly those counts, or, in a clause
  row C, the bare spelling. C rows in the record: a handler type's
  `clauses`, the source of `AtInstalledC` and the target of
  `ClauseIntoC k` (§9's bare sites; the other side of each is a full
  row). An entry is judged only when (i) holds; with invalid arities
  no entry has a check-5 defect;
- a recorded `AtDeferredRow` is **not** a defect (A4): its condition is
  supported (labels-only, §9) and evaluated; it occurs 0 times in the
  corpus (observed, §18.140). Being no table's companion, check 4 does
  not read it.

### 4.2 Keys and E9 (D7 rejected; §18.141)

`key` of a label after completion and settling: an effect label's key
is its effect; a `Fail` label's key is `typeHead` of its payload read
as a type (src/Domain/Type/Parts.purs:130-138): defined for `Int`,
`Bool`, `Unit`, `Text`, data, and a closed record; undefined (keyless)
for a variable (only a declared rigid can remain after settling), an
arrow, a handler and a record with a tail (a rigid tail after
settling). These are the cases today's resolver calls keyless
(src/Features/Resolve/Row.purs:80-92) and `labelKey` leaves `Nothing`
(src/Domain/Row.purs:99-105).

- **E9** (`FailConcrete ty`): holds iff the payload under P_c has a key.
- **Every keyless `Fail` label** is disposed of as follows: in a
  package image, `Malformed (KeylessFail v)` at I3 (decided on the
  settled payload, a local computation); in a recorded row, a
  condition failure of the first obligation (recorded order) whose
  matching reads it, so no keyless label ever reaches matching.
- A hole payload settles to `Int`, which has a key: E9 holds. This is
  not covered by U4 (§18.143): it is a **shadow-only expected
  divergence** from today's checker, recorded in differential
  reporting and to be decided as a replacement-compatibility question
  before the new checker is enabled live (C6). E9 stays after
  settling; no language widening and no D7-like guard is adopted.
- **Record invariant for recorded `Fail` labels** (§18.143; step 0): a recorded
  `Fail` label whose payload is a flexible variable `MVar v` has a `FailConcrete
  (MVar v)` obligation in the same declaration (observed by §18.142's reviewer,
  9 of 9 corpus cases); a recorded `Fail` payload that is a declared rigid
  variable, an arrow, a handler or a record with a tail is a `RecordDefect`
  (resolution refuses written ones, Resolve/Row.purs `failFamily`; reasoned that
  generation records none). So an unmatched keyless recorded label cannot occur
  in a valid record: if the payload is keyless on P_c, the `FailConcrete` on the
  same variable refuses, unless an earlier obligation's matching reads the label
  first and fails, which the previous bullet already disposes of.

## 5. Failure order (repair 2; total)

One refusal per candidate, the first in this order:

1. **Record validation** (step 0): recorded order of `obligations`,
   then the other record tables in a fixed order (`instances`,
   `annotations`, `nodes`, `ambient`, `signature`), keys in `Ord`
   order, then the declared arities (the `InDeclarations` entry,
   `InRecord { table: InDeclarations, path: Nothing }`, check 5's
   validity part only; amended 2026-11-01, §18.148 (1)), then the
   domain coverage (`InCoverage`, check 1's last clause).
   `RecordDefect (provenance, j)`, j the index of the violated
   check (§4.1's list order) within that record entry.
2. **Unsupported** (step 1): the first `Unsupported` obligation in
   recorded order. `NotCertifiable (UnsupportedRecorded kind)
   (provenance, 0)`.
3. **I3** (step 2), checks in this order, each over keys in `Ord`
   order within the maps `effects`, `marks`, `types`, `rows`:
   (a) `BindsForced v`; (b) a key in the wrong sort's map; (c) a
   missing key; (d) an extra key; (e) a non-canonical form
   (`PBase (DataBase _)`); (f) a term naming a mark outside
   `rigidMarks`; (g) a `Console` or `Fail` label whose term is not N on
   normal forms (`TermJ ∅` is N); (h) a hole number at two sorts;
   (i) solved form: an image naming a variable that is neither a
   declared rigid at its sort nor a hole (A3, all sorts); (j) a keyless
   `Fail` label in an image; (k) (added 2026-11-01, §18.148 (1);
   Effects.Arity, MalformedTerms) an undeclared or wrong-arity
   application in any key's image, every key of `effects`, `marks`,
   `types`, `rows` in `Ord` order, unused bindings included, each
   image read recursively (labels in rows, label arguments, data
   arguments and rows, a handler's label, R and C, record fields); the
   first offending application, in pre-order, of the first offending
   key gives the reason. `Malformed reason`.

   Check (k)'s refusals, with `data Applied = AppliedEffect EffectRef
   | AppliedData TypeId` (Domain.Verdict.Search): `Undeclared
   PackageKey Applied` (the head is not in `declarations`) and
   `WrongArity PackageKey Applied` (it is, with other counts). An
   application is an effect label (head its `EffectRef`, its argument
   count, rows 0) or a data type (`PData t args rows`; `PBase
   (DataBase t)` counts as `t` with 0 and 0). It conforms when its
   head is declared with exactly its counts, with one relaxation, the
   bare spelling of a clause row C:
   - a non-`Fail` label of a C row may have no arguments (C's labels
     are R's, bare; Generate/Owned.purs `bareLabel`) or its declared
     count (R-b: the bare reading ignores arguments without erasing
     them);
   - a `Fail` label of a C row keeps its one payload, and a top-level
     data payload may be its head only, `t [] []` (Owned.purs
     `headOnly`), or full.

   Any other count is wrong; nested applications (inside arguments)
   are read as anywhere else. C rows in a package: the `clauses: Just
   C` of a handler type, and the image of an effect key whose role is
   `HandlerClauses`, `AnnotationClauses _ _` or `ResultClauses` (a
   forced `ResultClauses` key is refused by (a) first). A `Fail` label
   with no argument is refused by (j) (keyless) before (k); one with
   two arguments has a key and is refused by (k). Check (k) reads the
   arities as recorded; record check 5 (step 0) has validated them,
   so `malformed` is only meaningful after `recordDefect` passes.
4. **G0** (step 3): G0's own order, unchanged.
5. **Obligations** (step 5): obligation index i ascending; obligation
   i is judged completely (conditions and edges) before obligation
   i+1, so an earlier obligation's edge failure is never masked by a
   later one's condition. Within i, check index j in the order §9 gives
   per kind, which always puts Definition 4.2's additions last, so a
   limitation never hides an ordinary failure at the same site.

Every edge and mark equality carries (provenance of i, j). Since every
mark term is given, an edge is judged when produced; there is no
separate global edge phase.

**Classification of an obligation failure** (A1; first match):
- `NotCertifiable RigidExact (provenance, j)`: the failing check is
  Definition 4.2's addition to E2 (an exact per-key count; ρ ending in
  ϱ is the tail pass's, ordinary);
- `NotCertifiable ForcedTail (provenance, j)`: obligation i **depends
  on a forced tail** (§5.1). `NotCertifiable` here denotes dependency
  on the provisional restriction, not proof that forcing caused the
  failure (§18.143 N3);
- `ObligationFailed (provenance, j)` otherwise.

### 5.1 Forced-tail dependency (§18.143 N3)

The nodes are the problem's flexible variables (type, record-row,
effect-row) and its recorded positions. The **mentions** of an
obligation are the flexible variables and positions occurring anywhere
in its recorded fields, a position counting when a mark is `At pos`.
Dep is the least set containing F and closed under these documented
edges, one per obligation kind, each the way that kind's checks relate
values or terms:

| Obligation | Edge: if it mentions a Dep member, add | Why (the checks that relate them) |
|---|---|---|
| `Equal lhs rhs` | every mention of both sides | E1 equates images, row tails and marks pairwise; a copy reached through an E1 into an image is linked here |
| `Consume` (every site) | every mention of source and target | matching pairs labels, equates arguments and puts edges between their marks |
| `Install { frame, handler, ambient }` | every mention of `handler` and `ambient`, and `frame` | E5's edges put m, each ρ partner's mark and, for a rigid C tail, `M` under the frame term: a forced C tail decides `M ⊑ f` |
| `HandlerLit { m, inference, clauses, clauseRows }` | `m`, the three variables and every clause row | E4 puts `M ⊑ m` from a clause row's content |
| `Defer { row, enclosing }` | `row` and every mention of `enclosing` | E6's demands on d, and `enclosing` holds the frame label `At (Frame p)` inside a `with` body |
| `Entry`, `FailConcrete` | every mention | their conditions read those values |
| forcing (not an obligation) | for each v ∈ F, its source t, R's tail variable in the same instance result | v's value is a copy of t's |

The variable-to-frame-to-`Defer` route is the composition of the
`Install` and `Defer` rows: a forced tail in an installed handler type
puts `Frame p` in Dep, and a `Defer` whose enclosing row is that `with`
body's ambient row (`f L + ρ`, its `L` marked `At (Frame p)`) mentions
it. Obligation i depends on a forced tail when it mentions a member of
Dep.

**What Dep says, exactly.** Dep is the set of nodes connected to F by recorded
obligations: every path along which a check of one obligation relates a value or
term to another passes through an obligation that mentions both ends, so a node
outside Dep is related to no forced binding by any recorded obligation (reasoned
from §9's conditions and edges). Package images add no path of their own: an
image names no position and no flexible variable (solved form), and its terms
are linked to recorded positions only through the obligations that read it. A
hole shared by two images relates nothing on P_c: each hole settles to a fixed
default. Dep does not say the failure would disappear under another tail
binding: that would need evaluating under a binding the package does not hold.
The earlier wording ("over-approximates", closure over `Equal` and variables
only) is withdrawn: it missed frame positions. Cases C1, C15 and C16 separate
direct dependency, dependency through a frame, and an unrelated failure.

Coarseness (2026-10-31, §18.144): where the ambient tail is flexible (in
`main` and lambda bodies), every obligation sharing that tail mentions a
Dep member, so every such obligation is `ForcedTail`. This is acceptable
as a dependency and was previously unstated.

## 6. Refusals and Decide (repair 4, A6)

`CheckRefusal` (src/Domain/Verdict/Search.purs:25-48) gains four
constructors. Each has one `Reading` (src/Features/Check/Decide/
Reading.purs:143-150, `refusedWith`); a `Declines` reading is not a
refused candidate, so it raises no `CandidateRefused` search fault
(Reading.purs:171-175).

| Refusal | Candidate-dependent? | `Reading` | Decide |
|---|---|---|---|
| `RecordDefect (provenance, j)` | no | `Declines (RecordDefective provenance)` | also a **pre-search block**: `Decide.Reason.blocks` (Reason.purs:41-42) gains `defective problem`, first in the list, beside `unchecked` (:62-63); verdict Unresolved, reason `Unsupported` naming `RecordDefective`; Solved impossible |
| `NotCertifiable (UnsupportedRecorded kind) (provenance, j)` | no | `Declines (EffectsUnchecked [kind])` | rule 1 already blocks; no search fault |
| `NotCertifiable RigidExact (provenance, j)`, `NotCertifiable ForcedTail (provenance, j)` | yes | `Declines (EffectLimit limitation)` | next strategy runs; if every strategy declines, the reason is `Unsupported` (Reason.purs:98-104); no search fault |
| `Malformed MalformedReason` | yes | claimed (`RefusedComplete` / `RefusedHeuristic`) | next strategy runs; a `ClaimsComplete` candidate's refusal is a `CandidateRefused` fault (a read-back defect) |
| `ObligationFailed (provenance, j)` | yes | claimed | as above |

Every refusal has one shape, a constructor with `(provenance, j)`, j
the check index (§5); Malformed's reason names the key instead.
`Unsupport` (src/Domain/Verdict.purs:142-149) gains `RecordDefective
Provenance` and `EffectLimit Limitation`. Priorities, unchanged where
they exist: a refuter's `Contradiction` still stands over any block
(Decide.purs:195-206, `verdictOf`: blocks only suppress Solved). A
record defect should still be reported under a `Contradiction`;
**proposed design**: the shadow differential reads `blocks` (today
only Features.Check.Decide imports Decide.Reason's `blocks`) and
reports `RecordDefective` as a generation defect, apart from candidate
refusals, whatever the verdict. With every
strategy returning `NoCandidate`, the block still reports the defect
(C4b).

## 7. The certificate (A2)

`Certified = Certified Valid Completed Compilation` in
Domain.Verdict.Certified.Internal (proposed; §18.143 N1; the
constructor stays importable only by Domain.Verdict.Certified and
Features.Check.Strategy.Substitution, AGENTS.md:40-42). The
`Compilation` is computed in `certify` at mint time from the stored
`Completed` (§2.4) and stored beside it. Accessors, in Domain, return
stored fields only (as Certified.purs:14-18 do today):
`certifiedValidity`, `certifiedCompilation ∷ Certified → Compilation`,
`certifiedPackage ∷ Certified → Completed` (read-only, for the shadow
differential and tests). No accessor runs coverage, completes or
renumbers. No duplicate mutable copy, no
serialization, no audit UI (§18.141 A2). Because A3 refuses unsolved
images at step 2, a `Certified` never pairs an effect `Valid` with a
`NoWitness (UnsolvedImage v)`; `NoWitness` remains for the hole
contract and `Uncovered`.

## 8. Module homes

| Module | Content | Layer and rule |
|---|---|---|
| Domain.Verdict.EffectPackage (new), with .Internal | §2.2's types; `Completed`'s constructor in .Internal, importable only by Domain.Verdict.EffectPackage and Features.Check.Strategy.Effects.Complete (`complete` is its only builder; corrected 2026-11-01 per §18.145 (a), which moved `complete` out of Effects.Package) | Domain; a new structure rule pins .Internal's importers |
| Domain.Verdict.Search | `CheckRefusal`'s four constructors; `MalformedReason`, `Limitation` | Domain |
| Domain.Verdict | `Unsupport += RecordDefective, EffectLimit` | Domain |
| Domain.Verdict.Certified(.Internal) | `Certified Valid Completed Compilation`, stored-field accessors | Domain; importers unchanged |
| Features.Check.Strategy.Effects.Package (new) | `erase`, `under`, `settle`, `complete`, `witnessOf`, `key` | Features (Domain may not import Features, AGENTS.md:18-20); trusted |
| Features.Check.Strategy.Effects.Record (new) | step 0, the site table; imported by `certify` and Decide.Reason | trusted |
| Features.Check.Strategy.Effects.Malformed, .Rows, .Handler, .Obligations (new) | steps 2 and 5 | trusted |
| Features.Check.Strategy.Witness | `solvedForm` extended to all four maps (D9), called by I3 and by coverage | trusted, re-pinned |
| Features.Check.Strategy.Substitution | the only `certify`, now `RecordedProblem → EffectPackage → Either CheckRefusal Certified`; the G0-only `certify ∷ … → Substitution → …` removed, so nothing mints without effect validation | trusted; still the only Certified.Internal importer besides Certified |
| Features.Check.Strategy.Online | certificate type `EffectPackage` (Online.purs:72, :156-157) | — |
| Features.Check.Decide.Reason, .Reading | `defective`, the new readings | trusted |
| test-only M-B collector | union-find, reachability | unreachable from live compilation |

Named changes for any future plan: scripts/trusted-surface.json pins
for every new or re-pinned trusted module, the structure rules for
`Completed`'s and the validator modules' importers, AGENTS.md's
review-required list, and the callers of today's `certify`, which
change with its signature: test/r0-g0-support.mjs:68, :71,
test/r0-online-support.mjs:70, test/r0-g0-atoms.test.mjs:13 and the
U8 tests (test/r0-u8-solved-form.test.mjs:16, :29), whose
`Certified Valid` + `NoWitness` expectations become `Malformed`
refusals under A3.
Elaborate (src/Features/Check/Elaborate.purs:52, :102) calls
`coverage`, not `certify`; it keeps doing so on the derived witness.

## 9. Reading every recorded obligation kind

At d9bd6d7 (src/Domain/Recorded/Effect.purs `Obligation`, `SiteKind`;
Generate/Literal.purs:40-74; Generate/Effect.purs:156-193;
Generate/Obligation.purs:146-170). Conditions on P_c. The `marks` and
`bare` columns are step 0's site table. The last column is the
within-obligation order j.

| Obligation | marks | bare | Condition | Edges | Order j |
|---|---|---|---|---|---|
| `Equal lhs rhs` | — | — | structural equality; rows by R-A; handler types by Definition 4.1 (rule J; an image C compared as any C); O6 for several tails (proposed) | `norm` equality per mark pair | pre-order over the type; at a node: constructor and head, then its marks, then children left to right; a row: keys of lhs's normal form in first-occurrence order (count, then each pair: arguments, then mark), extra keys of rhs, then the tail |
| `Consume` `AtCall`, `AtPerform`, `AtApply`, `AtPipe`, `AtStage k`, `AtCallback`, `AtFail` | true | false | each source label in source order: a partner of its key and rank (key defined, §4.2), arguments equal, edge; then the tail (closed: none; rigid ϱ: ρ ends in ϱ); then Definition 4.2's exact counts | `mark(ρ occ) ⊑ mark(s occ)` | as written in the condition |
| `Consume` `AtDefer` | true | false | labels only, s closed | as above | per source label |
| `Consume` `AtDeferredRow` | true | false | labels only (A4: evaluated; 0 recorded) | as above | per source label |
| `Consume` `ClauseIntoR k` | false | false | as the call row, top-level marks ignored | none | as the call row |
| `Consume` `ClauseIntoC k` | true | true | as the call row, arguments ignored, keys kept (R-b) | per pair | as the call row |
| `Consume` `InstallR` | false | false | as the call row, marks ignored | none | as the call row |
| `Consume` `AtInstalledC` | true | true | R-a: each C label in order: a ρ partner of its key and rank | `mark(ρ partner) ⊑ mark(C label)` | per C label: partner, edge |
| `HandlerLit` | — | — | — | for each k in order, if c_k holds a `Fail` label or ends in a rigid: `M ⊑ term(m)` | k ascending |
| `Install`, recorded `handler` an `MHandler` | — | — | m, R, C from the recorded handler type read under P_c (C its recorded C, owned, else R itself) | `term(m) ⊑ f`; each C label's ρ partner `⊑ f`; a rigid C tail: ρ ends in it (condition), `M ⊑ f`; Console frames too | in that order, C labels in order |
| `Install`, recorded `handler` not an `MHandler` (an image variable included) | — | — | never judged: its `with` records `UnframedInstall` (step 1); an image's C is therefore never read by `Install` | — | — |
| `Defer { row, enclosing }` | — | — | no `Fail` label, no rigid tail in d | each non-`Fail` label `⊑ N` | conditions, then labels in order |
| `Entry row` | — | — | each label Console, then a closed tail | — | labels, tail |
| `FailConcrete ty` | — | — | the payload has a key (§4.2) | — | one |
| `Unsupported kind` | — | — | step 1 | — | — |

Marks: `holds x y` iff `x = N`, `y = M`, or `J S ⊆ J T` on normal
forms (statements §5, universal; pairs36 and the oracle, bounded).
Rows: grouped normal form by key (derived; bounded check owed, §11).

Notes on the implementation (2026-11-01, whole-branch review; dossier
§18.147):

- **Ratified (author, 2026-11-01, §18.148 (3)):** a C label lacking its
  required ambient (ρ) partner fails `Install`, not only
  `AtInstalledC`. Implemented failure ordering, kept: generation
  records `Install` before its `InstallR` and `AtInstalledC` (§4.1 check
  4), so `Install` reports first, at the check of that C label (j = 1 +
  its index among C's labels, after j 0, `term(m) ⊑ f`, and the earlier
  C labels' checks); it is classified by §5 (`ForcedTail` when `Install`
  depends on a forced tail, else `ObligationFailed`). `AtInstalledC`
  keeps the same condition as its own, reached only if `Install` holds.
- **Ratified (author, 2026-11-01, §18.148 (3)):** same-key labels with
  unequal argument counts are refused, never zipped over their common
  prefix. Implemented failure ordering, kept: `Equal` (rows, Effects.
  Handler `argumentsEqual`) and `Consume` (Effects.Consume
  `argumentsEqual`) fail at the matched pair's argument check, the
  index that pair's arguments would start at; for two handler types the
  handled label's count is part of the head check (`sameHead`). A
  malformed arity may be refused earlier: a recorded application's at
  step 0 (§4.1 check 5), a package's at I3 (`Malformed`;
  docs/plans/2026-11-01-a2-arity-metadata.md, §18.148 (1)); the
  obligation-level check stays as a defensive check.
- Recorded `Fail` and `Console` labels are assumed `Written FixedN` by
  generation (Generate/Marked.purs:130 writes them so). The validator
  relies on that; step 0 does not check it.
- Generate/Owned.purs:91 records a `Fail` label's payload in an owned
  ResultC by its head only, `MData t [] []`. This is safe because a
  ResultC is compared bare (`bare` true: keys kept, arguments ignored)
  at every site that reads it.

## 10. Restrictions

From the packet (§3.2 there): T1 Definition 4.2, T2 forcing, T3 solved
form (now all sorts before obligations, A3), T4 ∅ effect default (U4
open), T5 invariant marks, T6 bare C, T7 Console N and uniform frames,
T8 terms N, M, `J S`, T9 `Unsupported` (refused before I3, A6), T10
`Outside HandlerType`, T11 rule J, T12 first-failure reporting (§5).
New: an input package may not bind a forced tail; every recorded
position needs a term; nullary data has one spelling; a keyless `Fail`
label in an image is malformed; `ForcedTail` covers every obligation
connected to a forced tail by §5.1's edges.

## 11. Owed checks

Status (2026-11-01, plan Task 15 and earlier tasks): each item is
marked run, with its label and test file, or still owed. Run results
are bounded: fixture-level holds on the listed packages only;
corpus-observed and corpus-derived hold on today's pinned corpus only.

- `erase`∘`settle` = `settled`∘`erase` over generated well-sorted
  package types and rows. **Run, bounded:** 2000 generated types
  (test/r0-a2-erase.test.mjs "settle commutes with erase").
- `erase` of the honest package = today's read-back substitution, on
  the corpus (the compatibility property for nullary data and every
  other constructor). **Still owed** until tranche 2's read-back
  produces honest packages. Today's σ has record fields out of label
  order in 14 of 2820 corpus candidates, and `erase` sorts them
  (docs/findings.md; test/r0-a2-properties.serial.test.mjs), so the
  property is stated **up to record field order (approved by the
  author, 2026-11-01, §18.148 (5))**, with one canonical comparison,
  `canonicalSubstitution` (test/r0-a2-canonical.mjs): record fields
  sorted by label, each keeping its own value; hole and other variable
  identities kept, no renaming; every other sequence, record tails and
  effect labels included, kept in order and length, so record-tail
  order, effect-label multiplicity and same-key occurrence order are
  never changed (nor is the order of different keys: the ruling
  permits field order only; tails keep their order, the controller's
  ruling on review I2 ratified by the author, §18.150); maps read in key
  order. The author kept this comparison for the erased-substitution
  property (§18.150): it permits record-field reordering only, and
  erasure drops effect rows, so label order never reaches it. It is not
  to be broadened into a helper that reorders arbitrary arrays. A
  future comparison of full effect packages uses R-A's semantic row
  equality instead: labels with distinct keys commute, while same-key
  occurrence order, multiplicity, arguments, marks and tails stay
  significant. Its unit
  tests (test/r0-a2-canonical.test.mjs) equate field-order variants and
  refuse records differing only in tail order, a moved field value, a
  changed or dropped hole, a swapped same-key label order and a dropped
  duplicate label. Related, run:
  erasure of recorded types matches `recordedWith` over the effect
  pin's corpus (test/r0-a2-erase-corpus.serial.test.mjs).
- settle∘complete = complete∘settle on F; differ on absent variables
  (C6 is the fixture). **Run, fixture-level:** equal on F for C1 and
  C15 (test/r0-a2-properties.test.mjs "complete/settle order"); differ
  on C6's absent variable (test/r0-a2-complete.test.mjs "C6 order
  separates"; a stage reading only: G0 refuses that package end to
  end, §12 C6).
- G0 accepts `erase P_c` whenever it accepts `erase (settle P_in)`.
  **Run, fixture-level** over the case packages
  (test/r0-a2-properties.test.mjs "G0 monotonicity on fixtures").
- Whether any pinned witness or test records fresh hole numerals that
  completion's numbering (§2.4) would change. **Type part run,
  corpus-observed and corpus-derived:** completion numbers as
  `bindingsOf` on every corpus candidate and on each less its first or
  last variable; no pinned fixture records a `Free n`
  (test/r0-a2-properties.serial.test.mjs "hole numerals"). **Effect
  part still owed** (no effect hole until tranche 2's read-back).
- A3's completeness impact: how many honest packages the all-sort
  solved form refuses at I3 (related evidence only: 0 of 14,867
  `Inline` images name a non-hole fresh variable over Solved rows,
  statements §11 U8). **Type part run, corpus-observed:** 0 of 2030
  Solved candidates refused by `unsolvedKey`
  (test/r0-a2-properties.serial.test.mjs "A3 impact, type part").
  **Effect part still owed** (tranche 2).
- Dep's claim (§5.1) that no check relates a node outside Dep to a
  forced binding: a test that every check of §9 relates only mentions
  of its own obligation. **Run, fixture-level,** with a control showing
  the perturbations bite inside `mentions`
  (test/r0-a2-properties.test.mjs "Dep completeness").
- The grouped normal form against (eq-swap)'s closure on small rows;
  `norm` equality over every valuation of up to four marks. **Run,
  bounded:** rows of up to four labels over two effects, closed or
  rigid-tailed; terms over four rigid marks, all 16 valuations
  (test/r0-a2-terms.test.mjs).
- One fixture per case of §12, one forged package per refusal
  constructor, one restored-defect proof per obligation kind, and a
  test that every `SiteKind` has a site-table row. **Run in part:**
  C1-C16 each appear in test/r0-a2-*.test.mjs; every `SiteKind` has a
  row (test/r0-a2-record.test.mjs); the A2 rows are in
  scripts/regression-r0-a2*.mjs. Per-constructor and per-kind
  completeness of the forged packages and rows was not audited here.

## 12. Distinguishing cases

Predictions are for the corrected pipeline; every verdict is
**reasoned** unless marked observed. "Order" facts marked observed were
run by §18.140's reviewer or by this pass's probe (read-only, over the
built output of r0-t2-d1 at d9bd6d7).

**C1. Forced-tail domain.** §12.1's N1 source: `fn mk():
Handler(nofail Ask with Log + ...s) with pure = handler Ask { ask() =>
Log.log(1) }; fn use(): Unit with Log = with mk() { defer Ask.ask();
() };`. At the use p of `mk()` the ResultC tail is `⟨p, result
clauses⟩` ∈ F. Recorded order in `use` (observed, reviewer): `Install`
0, `Defer` 7, `AtDefer` 8, `AtPerform` 9.
- A: every package-owned variable and position bound, least terms,
  nothing for `⟨p, result clauses⟩`. `Install` (0) holds with frame
  term M; `Defer` (7) fails `M ⊑ N` on `Ask`. `Install` mentions
  `⟨p, result clauses⟩` in its handler, so `Frame p` is in Dep (§5.1);
  `Defer`'s enclosing row is the `with` body's ambient row, whose `Ask`
  label is marked `At (Frame p)`: **`NotCertifiable ForcedTail
  DeferRegistration`**, a dependency through the frame (§18.143 N3;
  the previous revision predicted `ObligationFailed`). Today refuses
  the program (observed §R5b).
- A′: A with the frame term forged to N: `Install` (0) fails on its
  C-partner edge `M ⊑ N`; its handler is the instance result, which
  mentions `⟨p, result clauses⟩`: `NotCertifiable ForcedTail Install`
  (a dependency, not a cause).
- B: A plus a binding for `⟨p, result clauses⟩`: `Malformed
  (BindsForced ⟨p, result clauses⟩)` (I3 check a), not "extra key".
- Wrong W1, exact domain against the completed domain at input: A is
  `Malformed` (missing key). Wrong W2, forcing overrides a supplied
  binding: B is read as A. Wrong W3, the certificate omits F: now
  observable, since `Certified` retains P_cu (`certifiedPackage` lacks
  the forced binding). Wrong W4, Dep closed over `Equal` and variables
  only (the previous revision): A is `ObligationFailed`.

**C2. Prerequisites against recorded order.**
- (a) §7a's `work` (`fn work(): Unit with Log = { defer Log.log(1); ()
  }`), d's `Log` term `TermJ {z}`, z not in `rigidMarks`: `Malformed`
  (I3 f) before any obligation.
- (b) The same with term M: `Defer` precedes its `AtDefer`
  (Generate/Obligation.purs:149-152); `ObligationFailed
  DeferRegistration`. With term N: `ObligationFailed DeferInto`.
  Wrong: a pooled FX008 graph names neither.
- (c) `fn work(h: Unit -> Unit with State(Int)): Unit with Log +
  State(Bool) = { defer Log.log(1); h(()) }`, honest terms. Recorded
  order (observed, reviewer): `Defer` 2, the failing `Consume
  AtCallback` 7 (h is a callback parameter; its row `State(Int) + ϱ`
  ends in the rigid ambient). `Defer` (2) fails on an edge: reported
  `ObligationFailed DeferRegistration`. Wrong "conditions everywhere,
  then edges" (the previous revision's steps 5 then 6): reports
  obligation 7.

**C3. Unsupported at the entry point.** FX032's `effect Op { fn op():
Int with Log; }; fn g(): Int with Op = Op.op(); fn main(): Int = 0;`;
`Unsupported` is `g`'s obligation 0 (observed, reviewer). Any package,
from a `ClaimsComplete` strategy: `NotCertifiable (UnsupportedRecorded
(OperationWithRow …))`, read `Declines (EffectsUnchecked …)`, no
`CandidateRefused` fault; verdict Unresolved, `EffectsUnchecked`.
Wrong W1, routing-dependent: a `Certified` minted and only rule 1
suppressing Solved, so the online strategy's `check` returns a
certificate for an unchecked problem. Wrong W2, the refusal read as
claimed: a spurious `CandidateRefused` fault.

**C4. Record defect.** A restored-defect mutant recording
`AtInstalledC` with `bare: false`, on famw (§12.2: `Fail(Job)` in C
against `Fail(Job(Int))` in ρ). (Correction, 2026-11-01, Task 3: famw
records no `AtInstalledC`, having no `with`; its bare C meets ρ at
`ClauseIntoC`. The tests flip `bare` at famw's `ClauseIntoC` and at C1
`use`'s `AtInstalledC`.)
- (a) A strategy offers an honest package: pre-search block
  `RecordDefective`; `certify` refuses `RecordDefect` (step 0) and the
  attempt reads `Declines`; verdict Unresolved, reason names
  `RecordDefective`; reported as a generation defect.
- (b) Every strategy returns `NoCandidate`: the block alone reports the
  defect; verdict Unresolved naming `RecordDefective`.
- Wrong W1, flags trusted: `AtInstalledC` judged with argument
  equality refuses famw as `ObligationFailed` (a generation bug shown as
  a candidate failure). Wrong W2, defect found only in `certify` and
  read as claimed: the verdict is still not Solved (every strategy uses
  the same `certify`), but it reads `Inference NoAcceptedCertificate`
  with spurious `CandidateRefused` faults instead of a generation
  defect, and in case (b) the defect is not reported at all; it
  differs only in reporting and routing.

**C5. The unread frame term.** `fn main(): Unit with Console = { let h
= 1; with h { () } }` (h: Int). Recorded (observed, reviewer):
`Install` then `Unsupported UnframedInstall`, `positions = [Frame p]`.
Every package, with or without a term for `Frame p`: `NotCertifiable
(UnsupportedRecorded UnframedInstall)` (step 1, before I3; A6). I3's
own test, given this problem directly, reports a missing term as
`Malformed` and accepts N or M alike. Wrong W1, unread positions
optional: I3's test accepts the missing term. Wrong W2, the term read
as evidence of a safe installation: impossible here, since step 1
precedes any obligation.

**C6. E9 and the completion order; a shadow-only expected divergence.**
The audit fixture fail-needs-concrete-check (inferred role): `type E =
E; fn k(): Unit with Fail(E) = { let go = fn(r) => Fail.fail(r.e); ()
}; fn main(): Int = 0;`. Recorded: `FailConcrete (MVar ⟨…, field e⟩)`,
`k`'s obligation 1, a flexible type variable (observed, this pass's
probe; 9 corpus `FailConcrete`s have a flexible variable payload).
- **Old checker (observed):** today refuses `k`, FailNeedsConcrete
  (the fixture's recorded verdict).
- **Corrected (author, 2026-11-01, §18.148 (4); G0's projection
  unchanged).** The earlier prediction (the absent field accepted, "bound
  to a hole: as absent") is withdrawn. Two cases, two tests
  (test/r0-a2-differential.test.mjs):
  - **Field binding absent: refused at G0 (observed, fixture).** G0
    reads `erase (settle P_in)`, where the field variable stays
    flexible, and refuses `k` (`Unsatisfied`) before any obligation; no
    end-to-end acceptance, and not a divergence (today also refuses).
  - **Field explicitly bound to a suitable hole (`PVar (holeVar n)`):
    settling gives `Int`, which has a key, so E9 holds, every other
    obligation holds, and the validator accepts (observed on the
    fixture, as the reporter labels a fixture row; corpus reporting
    waits for Task 16).** This is the demonstrated shadow divergence and
    the only C6 case in the expected-divergence category. Ruled
    (§18.143, option c): a **shadow-only expected divergence**, kept
    visible in differential reporting; not covered by U4; E9 stays
    after settling; no language widening and no D7-like guard. The
    replacement-compatibility decision stays open, to resolve before
    the new checker is enabled live. Latent today: the online strategy
    offers no candidate where today's checker refuses (§18.142).
- **Order separation (obligation-reading stages only):** on the
  absent-field package, settle-then-complete (the statements' order
  before §18.141) leaves the fresh hole unsettled, the payload a
  variable, so E9 would refuse; complete-then-settle gives the payload
  `Int`, so E9 would hold (test/r0-a2-complete.test.mjs "C6 order
  separates"). This distinguishes what the obligations read; it claims
  no end-to-end acceptance, since G0 refuses that package first.
- The field variable bound to `PArrow …`: its settled value has no key,
  so the `FailConcrete` refuses, or an earlier obligation whose matching
  reads the `Fail` label it heads, whichever is first in recorded order.
  (I3 j applies only to a `Fail` label written inside a package image,
  not to this type binding.)
- **Rigid variant**, impossible for `k`, which declares no type
  parameter: a declaration with one, `fn k2(x: a): Unit = { let go =
  fn(r) => Fail.fail(r.e); () }`, field variable bound to `PVar
  (RigidVar a)`: keyless after settling, refused as the arrow case
  (reasoned; k2's recording not probed).
- Wrong (D7, rejected): refuses the hole-bound case (the absent case is
  refused at G0 either way).

**C7. Which settled projection.** (a) §12.2's hole identity: `fn g():
Unit = { let k = fn(u: Unit) => (); k(()) }`, the lambda row
`PTailHole 3`, the Apply row `PTailHole 4`: both settle to the closed
row; E1 holds; accepted. Wrong: obligations on P_cu (unsettled) refuse
(hole 3 ≠ hole 4). (b) A type hole: `fn id2(x: Int): Int = { let g =
fn(y) => y; g(x) }` (BACKLOG R026's program), y's variable bound to
`PVar (holeVar 0)`: G0 on `erase (settle P_in)` sees `Int` and
accepts, and the stored compilation is `NoWitness (HoleContract …)`
(§18.142's reviewer; not run in this pass; label: reasoned, 2026-10-31,
§18.144): `Certified Valid` without
a witness, so not compilable. Wrong G0 on `erase P_in` compares `TVar
(holeVar 0)` with `Int` syntactically and refuses at G0, a different
outcome.

**C8. Nullary data.** `type E = E; fn f(x: E): E = { let g = fn(y) =>
y; g(x) }`, y's variable bound to `PData E [] []`: `erase` gives `Base
(DataBase E)`, which G0 compares equal to the recorded atoms' `Base
(DataBase E)`: accepted by G0. Wrong `erase` to `App (DataHead E) []`:
G0 refuses (syntactic equality). Bound to `PBase (DataBase E)`:
`Malformed` (I3 e).

**C9. BindsForced against an extra key.** C1's B is `BindsForced`.
A binding for an `EffFresh` outside `flexEff` entirely is an extra key
(I3 d).

**C10. Rigid-tailed consumption.** (a) `fn w(h: Unit -> Unit with
State(Int)): Unit with Log + State(Bool) = h(())`: the `AtCallback`
consumption fails the payload (ordinary, j earlier) and Definition
4.2's exact count (`Log` extra, j last): `ObligationFailed`. (b) `fn
w(h: Unit -> Unit with State(Int)): Unit with Log + State(Int) =
h(())`: only the exact count fails: `NotCertifiable RigidExact` (an s1
or p1-like validator limitation; today refuses, FX017, reasoned).
Wrong: Definition 4.2 checked first reports (a) as `RigidExact`.

**C11. A type image naming an absent flexible variable.** P_in binds a
type variable x to `PVar y`, y flexible and absent: `Malformed
(UnsolvedImage x)` at I3 i (A3). Wrong W1: completion binds y to a
fresh hole and the obligations accept. Wrong W2: today's behavior,
`Certified Valid` with `NoWitness (UnsolvedImage x)`, an effect
judgment beside a hidden type defect.

**C12. Console's term.** A package image `Console` label with `TermJ
∅`: N on normal forms; accepted by I3 g. With `TermJ {k}`: `Malformed`.
Wrong: syntactic comparison refuses `TermJ ∅`.

**C13. An image that owns a C: two separate claims** (§18.143 N2).
- **The program is blocked.** `fn use(b: Bool): Unit with Log = { let
  h = if b then mk() else mk(); with h { defer Ask.ask(); () } }` with
  C1's `mk`. The installed handler is `h`, an image variable, so the
  `with` records `Install` with handler `MVar ⟨…/Let/value, Res⟩` at
  index 0 and `Unsupported UnframedInstall` at index 1 (observed by
  §18.142's reviewer): every package is refused `NotCertifiable
  (UnsupportedRecorded UnframedInstall)` at step 1, before I3.
- **An image C is examined through `Equal` only**, in an isolated
  obligation fixture, not end-to-end certification: one `Equal` whose
  left side is a recorded handler type owning a C (a ResultC) and whose
  right side is `MVar x`, with packages binding x to `PHandler …
  clauses: Just C′` or `clauses: Nothing`. With C′ equal to the ResultC
  on keys, per-key counts, marks and tail: holds; with C′ = ∅ while the
  ResultC has `Log`: fails Definition 4.1(d); with `Nothing`: the
  ResultC is compared with x's R itself (rule J). Wrong W1: an image C
  refused as `Malformed`. Wrong W2: an image C accepted without
  Definition 4.1(d). `Install` is never said to read C′.

**C14. A forced tail's source.** In C1, t (s's instance slot) bound
to `{ [], PTailHole 5 }`: the forced binding is the same hole 5 (one
identity); both settle to ∅; the witness has no effect rows. Bound to
`{ [], PTailRigid r }` (a caller with `...r` in scope): the forced
binding is r, and E5's rigid-C-tail edge `M ⊑ f` applies. Wrong: a
forced binding computed from P_s with a fresh hole number gives the
same verdict but two hole identities; a forced binding defaulting to
∅ drops `M ⊑ f` (attempt B's shape) and could accept.

**C15. Dependency through a frame, by a rigid forced tail.** `fn mk2():
Handler(nofail Ask with ...s) with pure = handler Ask { ask() => () };
fn use2(): Unit with ...e = with mk2() { defer Ask.ask(); () }`. At the
use p of `mk2()`, s occurs only in the result: `⟨p, result clauses⟩` ∈
F, its source t s's instance slot.
- Package with t bound to the closed empty row (least): the forced C
  tail is closed, no `M ⊑ f`; with least terms the frame is N and the
  `defer` holds: accepted, if the rest holds (reasoned).
- Package with t bound to `{ [], PTailRigid e }`: InstallR's rigid R
  meets ρ = `e` exactly (Definition 4.2 holds); the forced C tail is
  `e`, so `Install` asks `M ⊑ f`; with f = M, `Install` holds and the
  `Defer` fails `M ⊑ N` on `Ask`: **`NotCertifiable ForcedTail
  DeferRegistration`**, through the frame. Wrong W4 (Dep over `Equal`
  and variables only): `ObligationFailed`. (Recorded order: `Install`
  0, `Defer` 7, observed by §18.144's probe, 2026-10-31; before that,
  assumed as C1's, `Install` before the body.)

**C16. An unrelated failure.** `fn use3(): Unit with Log = { defer
Log.log(1); with mk() { () } }`, honest least terms. The first `defer`
fails `M ⊑ N` (declared `Log` is M). Its `Defer` mentions only its own
d and the declared ambient row, whose marks are written and whose tail
is rigid; d reaches nothing else: not in Dep. Reported
**`ObligationFailed DeferRegistration`**, though the declaration also
holds a forced tail. Wrong: classifying every failure in a declaration
with a forced tail as `ForcedTail`. (Recorded order, corrected
2026-10-31, §18.144: a `with` that is a block's result records
`Install`, `InstallR` and `AtInstalledC` before the preceding `defer`'s
obligations, not the block's items in order; the reported failure is
unchanged because those three hold.)

C1's A′ is the direct dependency (`Install` itself mentions the forced
tail); C1's A and C15 are dependencies through a frame; C16 is
unrelated.

## 13. Source verification (unchanged from the packet, §1)

Access date 2026-10-30. Labels exactly as the packet gives them; none
upgraded.

| Key | Source | Verdict |
|---|---|---|
| [BS01] | Baader, Snyder. Unification theory. Handbook of Automated Reasoning I, ch. 8, 2001; §2.2.3 p. 448 read | **verified** for the definition; the options note's "faithful" amended to "adapted" (F2) |
| [L05] | Leijen. Extensible records with scoped labels. TFP 2005; draft rev. 76 read (Fig. 1, §3.2, §7.1) | **verified** (draft; TFP text not accessed) |
| [Tar75] | Tarjan. Efficiency of a good but not linear set union algorithm. JACM 22(2), 1975; Berkeley memo ERL-M434 abstract read | **verified** (memo version) |
| [BPPS18] | Biernacki, Piróg, Polesiuk, Sieczkowski. Handle with care. PACMPL 2(POPL), 2018; §1 p. 4 read | **verified** for `lift` |
| [L17] | Leijen. Type directed compilation of row-typed algebraic effects. POPL 2017; Aug 2016 technical report read | **partly** (report, not POPL text); `inject` **unconfirmed** |
| [MMNS11] | McConnell, Mehlhorn, Näher, Schweitzer. Certifying algorithms. Computer Science Review 5(2), 2011 | **partly** (Mehlhorn's slides only; paper not accessible) |
| [GJ96] | Gaster, Jones. A polymorphic type system for extensible records and variants. NOTTCS-TR-96-3, 1996 | **partly** (abstract only) |
| [RM99] | Rehof, Mogensen. Tractable constraints in finite semilattices. SCP 35, 1999 | **not accessible** (publisher 403; secondary abstract consistent) |
| [DG84] | Dowling, Gallier. Linear-time Horn satisfiability. J. Logic Programming 1(3), 1984 | **not accessible**; not relied on |

## 14. Decision table and review ledger

The dossier calls the decision table §12; it is this section (§13 in
the previous revision).

| # | Decision | Ruling | Where now |
|---|---|---|---|
| D1 | M-C | approved (§18.139) | §9, §11 |
| D2 | R-A | approved | §9 |
| D3 | F14 items 1-3 | approved | options note |
| D4 | one `EffectPackage` | approved; representation proposed here | §2 |
| D5 | forced ResultC tails record-owned; two domains | approved | §2.3, §3 |
| D6 | independent test-only collector | approved; agreement on exercised inputs only | §1 |
| D7 | E9 before defaults | **rejected** | §4.2 (after settling), C6 |
| D8 | first-failure reporting | approved; ordering clarified | §5 |
| D9 | one solved-form definition | approved; with A3 | §5 (I3 i), §8 |
| D10 | four refusal categories | approved; with A1 | §5, §6 |
| D11 | UnframedInstall blocked | approved | §4, C5 |
| D12 | flags checked | approved; with A5 | §4.1 |
| D13 | fixture-only differential | approved | §11 |
| D14 | fidelity corrections | approved, applied | options note |
| D15 | citation, stale §10 | approved, applied | statements §10, §13b |

| §18.140 finding | Repair |
|---|---|
| S1-1 statements §7 settle-then-complete | statements §7 amended to complete-then-settle; §2.4, §4; C6 separates |
| S2 nullary data erasure | §2.2 one spelling, §2.5 `erase` mirrors `recordedWith`; compatibility property owed; C8 |
| S2 hole numbering | §2.4: completion's numbering over all maps, the witness derived from P_cu, shared identities |
| S2 type solved form | A3: I3 i for all sorts, before obligations; C11 |
| S2 E9 concrete, keyless `Fail` | §4.2: `typeHead` defined; every keyless label disposed; C6 variants |
| S2 steps 5-6 masking, order j | §5 total order, per-obligation judging; §9 order column; C2(c), C10 |
| S2 I3 order and C1's B | §5 item 3 (a) `BindsForced` first; C1, C9 |
| S2 Decide readings | §6 table |
| S2 RecordDefect only via certify | §6 pre-search block; C4(b) |
| S2 module homes, old minter | §7, §8 |
| S2 image-owned C | §2.2 allowed as a copy; C13 |
| S2 `readsForced` | A1: `NotCertifiable ForcedTail` with Dep; §5 |
| S2 C4 W2 | C4 restated: reporting and routing only |
| S2 record references | A5: §4.1 |
| S3 C7 vacuous wrong pipeline | C7(b) with a type hole |
| S3 C1 W3 unobservable | observable through `certifiedPackage` (A2) |
| S3 C3 Elaborate | §8: Elaborate calls `coverage`; C3 restated |
| S3 C2(c) AtCallback, Definition 4.2 | C2(c), C10 |
| S3 Reason.purs citation | §6 cites `blocks` :41-42, `unchecked` :62-63, `reason` :76-83; `verdictOf` Decide.purs:195-206 |
| S3 refusal shape | one shape, `(provenance, j)` (§5, §6) |
| S3 I3 (iv)-(vi) order, `TermJ ∅` | §5 item 3 total; normal forms (g); C12 |
| S3 table number | noted above |
| S3 observed orders | C1, C2(c), C3, C5 cite the reviewer's observations |
| missing cases | C6 (both orders, `PArrow`), C8, C9, C10, C3 (`ClaimsComplete`), C4(b), C13, C11, C12, C14 |

| §18.142 finding (§18.143 pass) | Repair |
|---|---|
| N1 `certifiedCompilation` cannot run coverage in Domain | §2.4, §7: compilation computed once in `certify`, stored; accessors return stored data |
| N2 C13 mis-predicted; Install never reads an image C | §2.2, §9 Install rows, C13 split into two claims |
| N3 Dep missed frame positions | §5.1 documented edges, forcing edge, exact statement; C1 A now `ForcedTail`; C15, C16 |
| N4 statements §7 routed limitations to search faults | statements §7 amended: `Declines (EffectLimit)`, not search faults |
| C6 widening | option (c): shadow-only expected divergence; U4 claim removed; §4.2, C6 |
| S3 `blocks` read by the differential | §6: stated as proposed design |
| S3 forced-variable placement | §2.3 placement rule with the reviewer's counts; checked at step 0 |
| S3 C6 rigid variant | C6: `k2` with a type parameter |
| S3 C7(b) | C7(b): `NoWitness (HoleContract)` |
| S3 refusal shape | §5, §6: `(provenance, j)` throughout |
| S3 hole renaming | §2.4: injective, contract facts preserved (reasoned); numerals owed |
| S3 old `certify` callers | §8 names them |
| S3 unmatched keyless recorded `Fail` | §4.2 record invariant (observed 9 of 9) |
| S3 A3 completeness impact | §11 owed |

Open after this pass: the targeted confirmation (§18.143); U2-U8's
extension, O-SUB, the statements' A1, [FX008-5], Definition 4.2's
sufficiency; every owed check of §11; implementation authorization.
