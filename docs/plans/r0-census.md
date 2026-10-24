# R0 census: what the switch would block

Task 3.5 of the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md), evidence for
G-switch. Date 2026-10-23, base ae578b9. The census changes no
acceptance, adds no exemption and sets no policy. Each count says how
many declarations that compile today a detector would hold
`Unresolved (Unsupported …)` if R0's verdict were live (§18.69 Q2, Q3;
T-R0b §11 items 4, 6), and how many whole programs that compile today
would then be rejected, since one Unresolved declaration stops its
program.

Labels: **checked** (a run recorded in a test or in docs/findings.md,
"The census"), **argued**, **reading** (a choice listed for review).

## 1. Inputs and commands

- Corpus: the pinned R0 corpus (test/r0-corpus.mjs,
  test/fixtures/r0/corpus-manifest.json), 1,128 programs: tracked
  `.wxw` files, test/fixtures JSON sources, Markdown blocks, strings
  exported by test/*programs.mjs and the like, and 400 programs from
  the two record generators. Not re-pinned by this task.
- Classifier: test/r0-census-classify.mjs, per program. Counts:
  test/r0-census-tally.mjs. Pinned result:
  test/fixtures/r0/census.json.
- Re-pin: `node scripts/r0-census-pin.mjs` (after `npm run build`).
  Check: `node --test test/r0-census.serial.test.mjs` (about 55 s) and
  `node --test test/r0-census-detectors.test.mjs`.

"Compiles today" is `compile` for a program and the collecting
driver's `today` slot (Features.Check.Outcomes) for a declaration.
Only declarations that compile today are counted; a program is
counted when it compiles today and has at least one counted
declaration in the category.

## 2. Categories

| Category | Detector | Section |
|---|---|---|
| SecondSpread | a `spread j`, j ≥ 2, in `vars` (rule 1′) | (a) |
| EffectArgument … LocalGeneralization | the problem's `outside` kinds (rule 1) | (a) |
| BQPendingValidR | `openRequirements` non-empty (Decide/Open.purs): a holder type, or `cmp` at a rigid variable | (a), pending G-ValidR |
| ErasedRow | C-erased (r0-erased-rows.md §4), test-only detector over resolved syntax (ruling R11) | (a), G-erased |
| BQAtTypeVariable | `g0Guard` declines (Strategy/Guard.purs): after reduction an atom still mentions a rigid variable, or lies outside the one-tail fragment unground; includes `pr` at a rigid variable | (b) |

The Q2 reading is the controller's, pending the author's G-ValidR
ruling: `pr` at a rigid variable is (b), `cmp` at a rigid variable
and types holding functions are (a). Only (b) can be lifted by adding
a strategy. G0 read-back refusals and ambiguous several-tail
read-backs need Task 4.3 and are not counted here (Task 4.5).
`ErasedRow` is a temporary support boundary; its narrowing is not
approved (§7.1 of r0-erased-rows.md), so it is counted, not ruled on.

## 3. Results (checked)

Corpus: 1,128 programs, 984 resolve, 743 compile; 3,011 declarations
in resolving programs, 2,773 compile today, 2,397 of them in programs
that compile.

The fixed order for the marginal column: the decided blocks first
(rule 1′, then rule 1's kinds in Domain.Recorded.Atom's order), then
§3.2(a)'s pending G-ValidR atoms, then erased rows, then §3.2(b) last,
since only (b) can be lifted by a strategy. "Only" counts the
programs this category alone blocks.

| Category | Section | Declarations | Programs | Only | Marginal |
|---|---|---|---|---|---|
| SecondSpread | (a) | 0 | 0 | 0 | 0 |
| EffectArgument | (a) | 32 | 31 | 0 | 31 |
| DataOverRecords | (a) | 3 | 0 | 0 | 0 |
| DataApplication | (a) | 587 | 138 | 115 | 122 |
| HandlerType | (a) | 170 | 102 | 35 | 70 |
| FailFamily | (a) | 60 | 41 | 0 | 13 |
| Deferred | (a) | 45 | 41 | 8 | 8 |
| LocalGeneralization | (a) | 0 | 0 | 0 | 0 |
| BQPendingValidR | (a) | 0 | 0 | 0 | 0 |
| ErasedRow | (a) | 91 | 72 | 6 | 6 |
| BQAtTypeVariable | (b) | 3 | 1 | 1 | 1 |

**Union: 251 of the 743 programs that compile today would be
rejected** (245 without ErasedRow). The origins are listed in
census.json (`union.origins`).

Three scenarios, kept apart (the author's ruling R-a, 2026-10-23; the
window table, test/fixtures/r0/window.json `summary.stops`, counts them
from R0's shadow decisions and reconciles with this census): (1) 245
programs stop under the implemented shadow decisions; (2) 6 more if the
erased-row boundary were adopted (its narrowing is not approved); (3)
3 more (5 with R022's two inline probes) if a future ambiguity policy
rejected the bound-hole cases, which are Solved now (hypothetical, not
approved). The census counts (1) and (2); (3) is
the window's.

- Second spreads: Resolve refuses them today, so none has a problem;
  71 corpus programs stop there (counted for completeness, not as
  narrowing).
- DataOverRecords: its three compiling declarations are in programs
  refused for other reasons.
- ErasedRow (§8 of r0-erased-rows.md): 11 marked declarations carry no
  `outside` kind (the marker's own cost). By source: own 13,
  annotation 1, handler 2, callee 5, constructor 1, perform 32,
  clause 0, fail 47 (one declaration may count under several). The six
  programs it alone blocks are all test/fixtures/r0/erased fixtures,
  written to exercise it.
- BQAtTypeVariable: all three declarations decline for a rigid
  variable, none for the fragment; the one program is
  examples/records.wxw (`details`, `show(rest)` with `rest: { ...r }`).
- Informational, not a blocking category: P-ii (§7, superseded as a
  validation trigger by §7.1) holds for 591 compiling declarations in
  192 programs that compile, the places where inferred rows exist.

By where the programs come from:

| Family | Programs | Compile | Blocked |
|---|---|---|---|
| generated (record generators) | 400 | 400 | 0 |
| test data modules | 222 | 188 | 151 |
| `.wxw` files | 231 | 98 | 71 |
| test/fixtures JSON | 235 | 57 | 29 |
| Markdown blocks | 40 | 0 | 0 |

Without the generated programs, 251 of 343 compiling programs are
blocked. Of the eight examples/ programs, five are: functions and
lists (DataApplication), records (BQAtTypeVariable), services
(Deferred, HandlerType), text (HandlerType).

**Timing (checked).** Generation of every declaration of ten scale
programs fits inside the bound their serial suites set for the whole
compile (FX008's: for the check): fn-scale, text-scale, r001-scale and
fx008-scale, largest 212 ms of 1,650 (5,000 parameters through
generics). The two `BQ` detectors are slower: their unifier grows
about as n^2.4 (findings; BACKLOG R021), so they were not timed on
the largest programs.

## 4. Detector checks (checked)

test/r0-census-detectors.test.mjs: the erased-row detector gives all
34 test/fixtures/r0/erased fixtures their hand-derived `sources`,
`marked` and `inferredRow`; one existing fixture per category is
classified as asserted (a refused declaration where no compiling one
has the category: BQPendingValidR, and G0's fragment decline);
a second-spread fixture stops at Resolve. LocalGeneralization has no
fixture (ruling R11). Corpus-wide, the erased-row detector agrees
with Task 0.7's reference reading on all 3,011 declarations
(r0-census.serial.test.mjs). Mutants are in findings.

The author's counterexample (§7.1) is test/r0-erased-challenge.test.mjs:
`g` is rejected today (E_EFFECT, `g performs Log, which its signature
does not allow`, at `Log.log(1)`); neither C-erased nor P-ii fires; its
problem holds only `Unit = Unit` (Sig3) and `Int = Int` (E17).

## 5. What the corpus cannot tell

- **Selection.** The corpus is what the repository's tests and design
  work needed: fixtures written to hit one rule, characterization
  probes, refusals kept on purpose (385 of 1,128 programs do not
  compile). It was not sampled from applications, so the proportions
  are not estimates of how often real code meets each category.
- **Size.** Most programs are a few declarations; the scale programs
  are long but repetitive. One Unresolved declaration stops a whole
  program, so in larger applications the program-level fraction would
  likely be higher than here (argued, not measured).
- **Idiom.** The 400 generated programs use records only and none is
  blocked; they weigh the totals toward that idiom. Parameterized data
  types (`List(Int)`), handlers and `defer`, the common sources of the
  largest categories, are underrepresented relative to what
  service-shaped code would use (argued). Stream 9's application-shaped
  programs are excluded from this corpus by design.
- **Missing features.** Programs the language cannot express yet (type
  classes, modules, local generalization) are absent, so
  LocalGeneralization reads 0 and categories tied to future features
  cannot appear. Programs refused today are not counted, so a future
  acceptance change would shift these numbers.
