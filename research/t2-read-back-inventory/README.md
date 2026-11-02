# Tranche 2 read-back inventory (Task 1, Task 2 Step 1b)

Where today's live checker holds the value of every recorded effect
variable and mark position, measured over the pinned R0 corpus for
docs/plans/2026-11-01-tranche-2-read-back-plan.md (Task 1, Task 2 Step
1b; dossier §18.151). Measurement only: no src, test, scripts or pin
change. Labels: corpus-observed (run by the Task 1 agent on
2026-11-01 at 56349c0, branch t2/stage-a), bounded (oracle
families), reasoned (read from code, not run). No soundness claim.

Run from the repository root after `npm run build`:

- `node research/t2-read-back-inventory/inventory.mjs` (about 60 s):
  the JSON tallies quoted below.
- `node research/t2-read-back-inventory/examples.mjs`: the
  distinguishing examples in `examples/*.wxw.txt`.
- `node research/t2-read-back-inventory/least-oracle.mjs` (about 4
  min; `--quick` about 90 s): the least-term implementation against
  research/amin-mark-oracle/.

Files: `corpus.mjs` (every declaration, stage), `live.mjs` (the live
check with the body before `holes`), `match.mjs` (a recorded marked
type laid over a live type), `sources.mjs` (which live structure each
recorded table meets), `classes.mjs` (recorded mark classes from `Equal`
obligations), `least.mjs` and `least-oracle.mjs` (Step 1b), `shape.mjs`.

## Method

`recheck` keeps only the body after `holes` renumbers its metas, while
`State.restricted` and the mark store keep the raw metas. `live.mjs`
repeats `checkFunction`'s first steps from exported functions (infer,
require, settleRestricted, settle, markConstraints) and checks the
repetition: on all 2,823 candidates `holes` of the rebuilt body equals
`recheck`'s body and the rebuilt mark store equals `recheck`'s
(corpus-observed, 0 apart). Each recorded table is then laid over its
live counterpart, part by part (`match.mjs`): a label takes the first
unused live label of the same effect, the live labels left over plus
the live tail are the recorded tail's value, and marks are read through
the final mark store. A variable or position is located when at
least one occurrence meets a live value, consistent when every
occurrence meets the same one.

| Recorded table | Live counterpart |
|---|---|
| `nodes[p]` | the raw body node's type at p (Walk `nodeAt`) |
| `ambient[]` (body root) | the checked declaration's `row` |
| `ambient[p/Lambda/body]` | the lambda node type's last arrow row |
| `ambient[p/With/body]` | the installation (same span): its label with `frame`, then `current` resolved |
| `ambient[p/Defer/value]` | the deferral (same body span): `row` resolved |
| `ambient[p/Handler/clauses/k/body]` | the clause entry (same clause span): `row` resolved |
| `ambient[p/Handle/body]` | none |
| `annotations[p]` | the lambda's checked parameter type |
| `instances[p]` at a reference | the node's arrow type (parameters, row, result) |
| `instances[p]` at a call, perform, construct, pattern | the node's type as the result only; parameters and row: none |
| `signature` | the checked parameters, result and row |
| clause entries, installations | `own` as `Literal p`, `inference`/`clauses` as the literal's R and C, `frame` as `Frame p` |

## Denominator (§18.151 (1)), corpus-observed

1,138 corpus entries; 144 do not parse or resolve; 3,061 declarations.

| Stage | Declarations |
|---|---|
| entry does not parse or resolve (one row per entry) | 144 |
| live-checker refusal (search: `NoCandidate Exhausted`) | 234 |
| live-checker refusal (search: `NoCandidate Broke`) | 3 |
| live-checker refusal (search: `NoCandidate OutOfBudget`) | 1 |
| online-search failure after a live acceptance | 0 |
| candidate, G0-only `certify` accepts | 2,820 |
| candidate, `certify` refuses (`RequirementUnjudged`) | 3 |

Mapping, over the 2,823 candidates:

| Mapping outcome | certify accepts | certify refuses |
|---|---|---|
| mapped, nothing required (no effect variable, no position) | 1,085 | 2 |
| mapped (every required variable and position located) | 284 | 1 |
| not mapped | 1,442 | 0 |
| not mapped, records an `Unsupported` obligation | 9 | 0 |

The plan header's "998 programs, 3071 declarations" was not reproduced
by this count; the figures above are what `loadCorpus` gave here.

Correction (dossier §18.153; docs/plans/2026-11-01-tranche-2-read-back-
design.md §A): these counts cover the corpus loader's source set only,
not the whole pinned effect set. The effect pin
(test/r0-effects-pin-run.mjs `sourcesOf`) reads the same 1,138 entries
plus R022's two probes and the window's two defect probes: 998
programs, 3,071 declarations. The 10 declarations it adds were not
inventoried here. "Mapped" below means located; one of the 1,372
mapped declarations is located inconsistently (a local annotation's
implicit row), and the 9 `UnframedInstall` declarations stay
unsupported wherever values were found (design §A).

Within the 1,372 mapped declarations the required inputs are: EffectOf
64, Stage 39, EntryTail 175, EffInst 32, HandlerInference 19,
HandlerClauses 19, Clauses 23; positions Literal 19, Frame 1,
Annotation 1.

## Roles and positions (Step 2), corpus-observed

Over all 2,823 candidates. Forced tails (`ResultClauses` in F, spec
§2.3) are record-owned and listed apart; they are not missing inputs.

| Role or kind | Required | Located | Consistent | Unread | Live location |
|---|---|---|---|---|---|
| EffectOf | 517 | 517 | 512 | 0 | lambda node arrow row; deferral row; record literal field |
| Stage k | 1,601 | 309 | 309 | 1,292 | arrow rows of a reference's or lambda's node type |
| EntryTail | 890 | 890 | 888 | 0 | checked `row` of `main` (and installations' `current`) |
| EffInst | 17,997 | 916 | 916 | 17,081 | call result type; reference arrow type |
| OpenedRow | 22,313 | 76 | 76 | 22,237 | reference arrow type (CtorRef, OperationRef) |
| HandlerInference | 214 | 214 | 214 | 0 | literal node type; clause entry `inference` |
| HandlerClauses | 214 | 214 | 214 | 0 | literal node type; clause entry `clauses` |
| Clauses k | 220 | 220 | 219 | 0 | clause entry `row` |
| AnnotationClauses | 8 | 8 | 8 | 0 | lambda parameter type (C kept) |
| forced ResultClauses | 11 | 11 | 11 | 0 | call result type (record-owned) |
| Literal | 214 | 214 | 214 | 0 | literal label mark; clause entry `own` |
| Frame | 208 | 208 | 207 | 0 | installation `frame` |
| Opened | 16 | 7 | 7 | 9 | call result type (the result's position) |
| Annotation | 8 | 8 | 8 | 0 | lambda parameter type |
| Instantiated | 10 | 1 | 1 | 9 | call result type |

Every inconsistent count (EffectOf 5, EntryTail 2, Clauses 1, Frame 1)
is in one of the 9 declarations recording `UnframedInstall`: their
recorded ambient for the `with` body is the outer row alone, while the
live installation adds a label, so the reads differ by design
(§18.124 ruling 4). Outside those, no recorded variable or position
met two live values.

## Unread roles (Q2), corpus-observed counts, reasons reasoned

| Unread | Occurrences by source | Where it occurs | Reason |
|---|---|---|---|
| EffInst | 17,077 + 306 + 1 | a call's instance row; call parameters; an apply's row | DeclarationUse instantiates row slots as metas the checked IR does not keep (`Call` keeps type slots only: "row slots never become type arguments") |
| OpenedRow | 21,980 + 240 + 17 | the opened row tail of constructor, perform and call uses | Stages `openedRow` mints a meta no path-indexed structure records |
| Stage k | 1,292 | obligations only | `stages` makes inert quantified rows at calls, applies and pipes; none reaches a node type |
| Opened | 9 | call parameters | MarkUse `openHandlers` metas on parameters, not retained |
| Instantiated | 7 + 6 | call row and parameters | `instantiateMarks` metas, not retained |

Three examples per unread role (`origin#declaration`):

- EffInst: docs/plans/2026-10-21-c001-explicit/baseline/
  a1-discard-dictionary.wxw#main, a4-phantom.wxw#main,
  a5-one-dictionary.wxw#main.
- OpenedRow: the same folder's a3-fixed-carriers.wxw#main,
  a4-phantom.wxw#tag, c1-annotated-construction.wxw#main.
- Stage: a3-fixed-carriers.wxw#main, a5-one-dictionary.wxw#twice,
  c1-annotated-construction.wxw#main (same folder).
- Opened: test/fx008-probes/witness/famw.wxw#main,
  test/fx-run-programs.mjs:cases#2#main, cases#10#main.
- Instantiated: test/fx008-defer-programs.mjs:aroundBoth#1#main,
  pass#1#pass, pass#1#pass2.

The values of these variables exist in the live substitution, but
nothing keyed by path leads to them. A read-back can take them only
from a production change that records each use's instantiated rows and
mark metas by path, or by completing them from the recorded
obligations (Q2's alternative). No value was invented here. Under
"`NoCandidate` first", 1,451 of the 2,823 candidates would give no
package.

## Identity and sharing (Step 3, §18.151 (2)), corpus-observed

- Must share: every occurrence of one recorded variable or position
  met one live value, outside the 9 `UnframedInstall` declarations.
- Marks: recorded classes are built from `Equal` obligations
  (`classes.mjs`). A live meta was read by two or more located
  positions 6 times, each time inside one recorded class; no live meta was
  shared across recorded classes and no recorded class was read as two
  live marks, outside the `Unsupported` declarations (there: 1 and 1).
  This is P2 observed on the located positions only.
- Written marks: `FixedM` read M 435; `FixedN` read N 1,677; `FixedN`
  read `Unmarked` 107 (Fail labels: today keeps the placeholder, the
  statements give N); `FixedRigid k` read `MarkVariable k` 43.
- Rigid rows: `EffRigid v` met live `Rigid v` 4,988 times. Two
  exceptions:
  - `main`'s signature: `EffRigid v` meets a live meta (881) or a
    closed row (9) in all 890 `main` declarations. Live `mainRow`
    makes the tail flexible; the record names that tail `EntryTail`
    in the ambient and keeps `EffRigid` only in `signature`. A
    read-back must map the live meta to `EntryTail`, never to the
    rigid.
  - Local handler-type annotations with an implicit row (11
    declarations): the record writes the implicit ambient variable as
    `EffRigid v` (Generate/Marked.purs `effectVar`, declared naming);
    live Lambda.purs `annotationRow` replaces it by the lambda's own
    row, so the live R carries labels (Tick, Console, Fail) and a
    meta, rigid or closed tail. Examples:
    test/fx008-probes/rev6/amb.wxw#main, rev6/amb3.wxw#f,
    test/fixtures/r0/erased/form.annotation-bare.json#g.
- Rigid marks: `FixedRigid k` ↔ `MarkVariable k` by name (43 reads, all
  agreeing). Rigid type variables (`RigidVar`) are the type read-back's
  (ReadBack/Type.purs, `Rigid VarId`); not measured here (reasoned).
- Distinct variables sharing a live tail meta (for example a literal's
  R and `EntryTail` in `main`) are not a violation: two holes may hold
  one value. Not counted.

## Distinguishing examples, observed (examples.mjs)

Live texts: `[labels|tail]`, `E1` effect 1, `@N`/`@M` constants,
`@m:n` a mark meta, `meta:n` a row meta.

- Nested handlers (nested-handlers.wxw.txt#main): two literals, two
  frames, four distinct metas (Literal m:3 and m:10, Frame m:-1 and
  m:-5). The inner literal's R is `[E1@m:-4 Console@N|meta:-10]`, the
  outer `[Console@N|meta:-10]`; both end in `main`'s `EntryTail`
  meta -10. The inner C is `[E1@m:-3|closed]`.
- Annotations (annotation.wxw.txt): in `implicitRow`,
  `fn(h: Handler(Log))`, the recorded R is `[] | EffRigid 0` but the
  live R is `[E1@m:-5|rigid:0]`, the lambda's own `EffectOf` value
  exactly. In `pureRow`, `Handler(Log with pure)`, both are closed. The
  annotation's own position and the literal's share meta m:2 (one
  recorded class through the application's `Equal`).
- Partial applications (partial.wxw.txt): at `apply(add(1), 2)` the
  partial call's `EffInst` is read from its arrow type (`[|rigid:0]`)
  while its `Stage 0` is unread; at `let f = add` the reference's
  `Stage 0` is read from its node type (`[E0@m:-1|rigid:0]`), and the
  apply `f(1, 2)` has `Stage 0` and `Stage 1` unread; `5 |> add(1)`
  likewise.
- Entry tail (entry.wxw.txt): the same body in `notMain` and `main`.
  In `notMain` the literal's R ends in `rigid:0`; in `main` in
  `meta:-5`, which is `EntryTail`'s value, while `signature`'s
  `EffRigid 0` meets that meta.

## Least terms over the live graph (Step 1b)

`least.mjs` implements statements §5: union-find over the store's
bindings (each `meta ↦ mark` an equality), reachability over `edges`
(lower ⊑ upper), a constant class keeps its constant, else M if M
reaches it, else `J S` of the rigid constants reaching it, N if none.

Bounded (`least-oracle.mjs`, every family of research/amin-mark-oracle/
with this implementation as `least` and its `holdsTerm` as `holds`):
pairs36 36, one 5,242,880 graphs, two 12,058,624, random 200,000,
sound (2,562,208 refused graphs, 0 passing of 17,776,800 assignments):
0 disagreements; term by term against oracle.mjs `leastTerms` on
17,501,504 graphs and 80,481,870 nodes: 0 differ, 0 clash
disagreements. A mutant ignoring equalities is detected (5,632 on
`one`).

Corpus-observed: 2,823 candidates, 1,211 live edges, no class with two
constants, no edge failing `holds`. Every located position gets a term:
Literal N 164, M 50; Frame N 153, M 54, `J{..}` 1; Opened N 7;
Annotation N 7, M 1; Instantiated N 1 (counts include open metas, which
today's step 6 would close to M for display). Against Mark.purs
`violation` on the same store, wherever the rebuilt check reaches it
(live refusals included): accepts and least terms pass 2,888, refuses
and least terms fail 32, disagreements 0, not reached 141.

Shared machinery and assumptions (disclosed):

- The definition is the statements' own, as is the oracle's; agreement
  with the oracle shows the code matches the definition on bounded
  graphs, not that the definition is right.
- Union-find and fixpoint reachability are the oracle's primitives,
  written apart here.
- The live graph is Mark.purs's: the same `MarkStore`, its `bindings`
  read as equalities as UnifyMark `equateMarks` made them. `Unmarked`
  ends are dropped as UnifyMark `recorded` drops them (0 seen).
  Positions are read through MarkStore `resolveMark`.
- The live graph is not the recorded graph. P1 (the recorded graph
  equals FX008's) is untested here; `classes.mjs` repeats in
  simplified form the label pairing of the validator's E1 to build
  recorded classes, and is not independent of it.

## For the author (not decided here)

1. Local annotation implicit rows (11 declarations): generation records
   the declaration's rigid ambient variable; today's checker uses the
   lambda's own row. An honest package reading today's values would
   bind the literal's R with labels the annotation's recorded R
   (`[] | ρ`) lacks, so an E1 refusal of an honest package is likely
   there (reasoned; the validator was not run). This looks like it
   needs a semantic decision: amend the record (the lambda's
   `EffectOf`) or the statements.
2. Unread instance rows, opened tails, stages and call marks (1,451
   candidates): reading them needs either a production change that
   records the use's instantiated rows and marks by path, or
   completion (Q2). A Stage B read-back limited to today's
   path-indexed structures maps about half the candidates.
3. Fail labels read `Unmarked` today (107); the read-back must write N
   (Review Focus), never copy the live mark.
