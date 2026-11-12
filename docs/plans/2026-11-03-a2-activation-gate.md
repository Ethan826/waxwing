# A2 activation gate (specification, 2026-11-03)

Status: specification of the gate only. It activates nothing. A2's
Task 16, the minting switch, stays held, and so do C6, F14's
retirement and the losses an actual replacement would cause (dossier
§18.157). F14's retirement is the author's and is not a criterion.

The gate is the seven criteria shown to the author in §18.156's report.
Each one below has the check that measures it, its state as measured on
2026-11-03 (branch t2/gate from d375ffc; criterion 2 measured again at
the head of branch ap/verdicts for §18.159), and the evidence that
would meet it. None of them is a decision. Where a criterion needs the
author, the gate measures only whether the ruling is recorded, and
where. A met gate means the stated evidence exists. It does not mean
the checker should be switched on; that call stays with the author.

The gate is an evidence checklist (§18.159). Its citation checks read
that a cited section exists, comes after §18.157 and names the
matter; they cannot establish that the section approves anything. A
criterion met by a citation says only that a ruling is cited. For
example, §18.159 names C6 and routing, so criteria 3 and 7 read met,
yet its C6 ruling retains the expected shadow divergence and
authorizes no live acceptance widening, and its routing ruling
approves a direction, not activation.

## The report

`node scripts/r0-t2-activation-gate.mjs` prints each criterion's
state and exits 1 while any criterion is unmet, 0 only when all seven
are met. It reads files in the working tree and, through `git
rev-parse`, src tree ids, nothing else. It runs neither the corpus nor
the compiler and writes nothing. It reads:

- the gate-status file, test/fixtures/r0/t2-activation-gate.json;
- Task 13's honest pin, test/fixtures/r0/t2-honest.json, against the
  named lists in test/r0-t2-honest-gate.mjs and §18.157's figures;
- the gap-verdict file, test/fixtures/r0/t2-gap-verdicts.json
  (criterion 2);
- the dossier, docs/plans/2026-10-20-record-composition-dossier.md, by
  section heading;
- the statements, docs/plans/r0-amin-statements.md (§7, and U4's and
  U6's rows in the §0e table only);
- the regression registry's row names (scripts/regression-r0.mjs);
- the files the gate-status file cites (sections 5 and 6 below);
- the src tree of HEAD and of each cited file's `commit`
  (`git rev-parse <commit>:src`, criteria 5 and 6).

BACKLOG.md is not read. Criterion 4 reads regression rows instead.

The criteria are pure functions in test/r0-t2-activation-gate.mjs,
test/r0-t2-activation-pin.mjs, test/r0-t2-activation-verdicts.mjs and
test/r0-t2-activation-evidence.mjs.
An absent file, an absent key or a misshapen value is unmet, and so is
a measure that throws. Nothing is assumed met.

The gate-status file is the record of what the author has ruled and
what has been run. At 354ce6e only `c6` and `routing` are set, both
to §18.159; every other value is null:

| Key | Holds | Criterion |
|---|---|---|
| `repin` | the dossier section of a later re-pin ruling, if the pin departs from §18.157 | 1 |
| `losses` | per gap list (`faults`, `refusals`, `forcedTail`), the section ruling its loss on replacement; read only for a list holding a loss | 2 |
| `c6` | the section recording the C6 decision | 3 |
| `landed` | per item, `"R034 (2)"`, `"R034 (10)"`, `"R036 (1)"`, `"R036 (2)"`, `"R036 (3)"` and `"T6"`, the name of its restored-defect regression row | 4 |
| `comparison` | the path of the comparison file | 5 |
| `performance.ruling` | the section approving the budget | 6 |
| `performance.budget` | the approved figures, per part and metric | 6 |
| `performance.measurement` | the path of the measurement file | 6 |
| `routing` | the section ruling routing after activation | 7 |

A cited ruling counts as recorded only if all three hold:

- Its number comes after §18.157, compared as integer pairs (§18.158
  is later, §18.16 is not). §18.157 and the sections before it record
  these matters as undecided or deferred: §18.157 lists C6 and the
  replacement losses as undecided, and §18.155 (5) leaves routing to
  Task 16. Citing one of them is therefore never a ruling on these
  matters. The restriction applies to these currently open decisions
  only; it is not a general rule invalidating earlier rulings
  (§18.159).
- The dossier has a `###` heading with exactly that number.
- The section's text names the matter: `C6` for criterion 3, `R035`
  for 6, `routing` for 7, and for criterion 2 `read fault`,
  `RequirementUnjudged` or `ForcedTail` according to the list.

Checks: `node --test test/r0-t2-activation-gate.test.mjs` (13 tests).
A synthetic body of evidence meets all seven criteria. Each of 75
must-fail cases changes one thing and must leave unmet exactly the
criteria it names, with every other criterion still met. Three further
cases must hold: a lowered pin with a later re-pin ruling that names
its figures; the `RequirementUnjudged` ruling absent while the verdict
file records them as existing refusals; and the read-fault ruling
absent while the verdict file records every read fault refused. A case
that changes the pin's lists writes the synthetic verdict file again
for the changed pin, so only the check it aims at sees the change.
Every criterion has a case that fails it alone. With no evidence at
all, all seven are unmet. On the real dossier, a status
citing §18.157 for C6, the losses and the budget, and §18.155 for
routing and the losses, leaves criteria 2, 3, 6 and 7 unmet. On the
committed tree, criterion 2 reads the three `RequirementUnjudged` as
existing refusals on both denominators and the read faults and
ForcedTail as losses; without the verdict file it reads none as an
existing refusal. A test runs the script on the working tree and
checks that its exit status agrees with the criteria it names. Another
checks that the "Today's report" block below equals the script's
unindented lines on the working tree. A third reads both committed
records as fresh against src and, on the synthetic evidence, names a
stale record and one without a `commit`.

The regression rows in scripts/regression-r0-t2-activation.mjs (probe
`r0-t2-activation-gate`, test/regression-r0-t2-activation.mjs) each
restore one defect in the gate's helpers:

- a ruling not cited read as recorded;
- a cited section not read for its matter;
- a section up to §18.157 read as a ruling;
- §18.157's figures left unchecked;
- the measurement file's own budget read before the status file's;
- A1's count left unchecked;
- ForcedTail admitted by class rather than by name;
- an unreadable piece of evidence read as met;
- an existing refusal still asked for a loss ruling (§18.159);
- a loss read from the verdict file's own label rather than from
  `certify`'s verdict, so a loss marked an existing refusal passes;
- the verdict file not compared with the pin, so a stale file backs
  it;
- losses read from the first denominator only;
- `certify`'s recorded verdict not checked against the pin, so a
  ForcedTail relabelled refused reads as an existing refusal;
- any text read as a `certify` refusal, so a typo reads as one;
- a record whose src changed since its `commit` read as fresh;
- a record without a full `commit` sha read as fresh.

## Criteria

### 1. Task 13's pin approved; no unexpected refusal

Check:

- The pin cites §18.157 as a whole number (`§18.1570` does not
  count), and §18.157 exists and records the admission.
- Each denominator holds §18.157's figures (corpus loader 2823
  candidates, floor 2805; effect-pin sources 2832, floor 2813) and
  exactly the four ForcedTail declarations it names.
- A pin that departs from §18.157 is met only if `repin` cites a ruling
  after §18.157 whose section names each departing denominator's new
  figures in the form `corpus loader: 2822 candidates, floor 2804`.
  The phrase ties the figures to their denominator, and the floor must
  be a whole number there (`floor 28040` does not name 2804). A pin
  lowered consistently, with candidates and floor falling together,
  is unmet without that ruling.
- In both denominators every refusal is one of the three named
  `RequirementUnjudged` declarations (`unjudged`). Every ForcedTail
  entry is one of the four (`forcedTail`), refused `NotCertifiable
  ForcedTail`.
- The pin's `explanations` must be a list. The report prints it.

Measured: met. Both denominators hold §18.157's figures, 3 named
`RequirementUnjudged` and the four ForcedTail by name. The pin's
explanations are none. The pin was written by
scripts/r0-t2-honest-pin.mjs at b0d20c1. That script writes only when
§18.155 (7)'s admission holds, so no `Malformed` and no unapproved
read fault was observed then (reasoned from the script). Whether the
pin still matches a fresh run is checked by
test/r0-t2-honest.serial.test.mjs in the routine verify, not by this
gate.

### 2. A1: whole-program losses under decide ruled

Corrected by dossier §18.186. Replacement acts on `decide`, and one
declaration `decide` does not solve stops its program (r0-census.md),
so criterion 2 assesses whole programs. Certification losses (the
checks after this one) remain supporting evidence. Both must hold.

Check, whole programs (test/r0-t2-replacement-losses.mjs):

- test/fixtures/r0/t2-replacement-losses.json holds one entry per
  program: every census-union program (test/fixtures/r0/census.json)
  and every program of the gap lists (the gap-verdict file, both
  denominators), together and deduplicated, plus any other program
  that compiles today and that `decide` would lose. Each entry records
  `named` (which of `census` and the gap lists name it), `today` (the
  whole program's `compile`), `blockers` (each declaration `decide`
  leaves unsolved) and `class`.
- An omitted program, a repeated one, a `named` that differs from its
  sources, or a `class` its facts do not give is unmet, with the
  program named. The class is derived, never chosen: `existingRefusal`
  when refused today; `notLost` when it compiles and `decide` solves
  every declaration; `knownDefect` when every blocker is a declaration
  the gate status registers under `knownDefects`; otherwise `lost`. A
  program with no decided declaration (one that does not resolve)
  records one blocker standing for the whole program, so it is never
  `notLost`. `today` and `class` must be recorded values.
- Each registered known defect cites a ruling after §18.157 whose
  section holds, as a whole line, `Known defect, correctly refused:
  <origin#name> (<id>).`, and names a declaration that blocks a
  recorded program.
- Each `lost` program is unmet unless `acceptedLosses` maps it to a
  ruling after §18.157 whose section holds, as a whole line, `Live
  replacement accepts the loss of <origin>.`; an accepted entry must be
  a lost program. Mentioning a program and live replacement is not
  acceptance: "Held: live replacement" accepts nothing (review,
  2026-11-12).
- The file is written by scripts/r0-t2-replacement-losses-pin.mjs,
  which refuses to write an inconsistent file.
  test/r0-t2-replacement-losses.serial.test.mjs recomputes it from the
  committed checker and compares both ways, with must-fail cases on the
  real data. test/r0-t2-replacement-losses.test.mjs holds the must-fail
  cases on synthetic evidence. As with the gap-verdict file, the gate
  reads the file; whether it still matches the checker is the serial
  test's.

Measured on 2026-11-12: not met. 262 programs assessed: 252 lost (none
accepted), 1 known defect correctly refused (inline:fx032, FX032,
§18.186), 3 existing refusals (rigid, f05-print-key, split-selection:
refused today), and 6 census programs not lost under `decide` (the
ErasedRow-only fixtures under test/fixtures/r0/erased/, where `decide`
solves every declaration). Of the 252, 250 are census programs and 2
(c7 and q7 `statsEvidence`, UnreadImage) are named only by the read
fault list. The author recommends accepting none of these losses for
live replacement (§18.186). The report names the known defect and each
lost program on a gap list; the file lists all of them.

Supporting check, certification losses (§18.159):

- In each denominator, the candidates equal the validated floor plus
  the read faults, the `RequirementUnjudged` refusals and the
  ForcedTail refusals.
- Every read fault is either an identified unsupported declaration
  with its kind or one of the two `UnreadImage` declarations (§18.155
  (6), (7)), and every refusal is named as in criterion 1.
- The gap-verdict file backs the pin entry for entry, on both
  denominators: the same declarations on the same lists with the
  pin's own fault or refusal text, none repeated, each with today's
  verdicts as text, and each `loss` the one its `certify` verdict
  gives (below). Each `certify` is `accepted` or a refusal by a whole
  `CheckRefusal` constructor name (the only verdicts `certify` gives);
  any other text is unmet, never a refusal. Where the pin fixes
  `certify`'s verdict, the file must agree: a `RequirementUnjudged`
  entry carries exactly the pinned refusal (the pin admitted each only
  with `certify`'s own refusal), and a ForcedTail entry `accepted`
  (admitted only where `certify` accepts). An absent, unreadable or
  stale file is unmet, and then no list is read as existing refusals.
- A gap entry whose recorded `certify` verdict is a refusal is an
  existing refusal: it is not a loss and needs no loss ruling
  (§18.159). An entry today's `certify` accepts is a loss. Each list
  holding a loss on either denominator needs a ruling on its loss on
  replacement, cited in `losses` and recorded after §18.157. The gap
  lists are the read faults (`UnreadImage` and `Declined` together),
  the `RequirementUnjudged` refusals and the ForcedTail refusals. The
  report prints one line per list: its losses and existing refusals
  in each denominator, then either "existing refusals only, no loss
  ruling needed" or whether the ruling is recorded, with every loss
  named.

The verdict file. For each declaration on the pin's gap lists, on each
denominator, test/fixtures/r0/t2-gap-verdicts.json records `at`,
`origin`, `list`, `pinned` (the pin's fault or refusal), `decide` (the
shadow `decide`'s verdict class), `reason` (its verdict as described),
`checker` (today's whole checker), `certify` (the substitution-only
`certify`, which mints under F14: `accepted` or its refusal), `shadow`
(the shadow differential's window class, or the agreement a row-less
declaration stands for) and `loss`. Every listed declaration is one
the validator does not validate, so `loss` is `yes` exactly when
`certify` accepts. scripts/r0-t2-gap-verdicts-pin.mjs writes it from
the committed checker (test/r0-t2-gap-verdicts-run.mjs; it refuses
to write a file that does not back the pin), and
test/r0-t2-gap-verdicts.serial.test.mjs recomputes it and compares
both ways, with must-fail cases for a moved verdict, a relabelled
loss and a stale file. The gate reads the file; whether it still
matches the checker is the serial test's.

Measured at the head of branch ap/verdicts: not met. Corpus loader:
2823 candidates = floor 2805 + 11 read faults + 3 + 4. Effect-pin
sources: 2832 = 2813 + 12 + 3 + 4. The counts balance, every entry is
on a named list and the verdict file backs the pin. Today's verdicts:

| List | Corpus loader | Effect pin | `certify` | `decide` |
|---|---|---|---|---|
| read faults | 11 losses, 0 existing refusals | 12 losses, 0 existing refusals | accepts all | Solved (2 `UnreadImage`), Unresolved Unsupported (the rest) |
| `RequirementUnjudged` | 0 losses, 3 existing refusals | 0 losses, 3 existing refusals | refuses all (`RequirementUnjudged`) | Unresolved Unsupported RequirementAtoms |
| ForcedTail | 4 losses, 0 existing refusals | 4 losses, 0 existing refusals | accepts all | Unresolved Unsupported Outside HandlerType |

Today's whole checker compiles all of them. The `RequirementUnjudged`
list needs no ruling. The read faults and the ForcedTail have no
ruling on their losses: §18.159 keeps the four ForcedTail and the two
`UnreadImage` unresolved for replacement and says that listing a gap
is not approval to lose it. The losses, by name: the two
`UnreadImage` (c7-pure-stages-construction and q7-pure-construction
`statsEvidence`), the nine `Declined UnframedInstall`, `inline:fx032#g`
(`Declined (OperationWithRow 1 0)`, effect-pin sources only) and the
four ForcedTail (effect-namespaces, services, fx-services fake,
fx008-defer aroundBoth). The report prints each in full.
`inline:fx032#g`'s shadow class is `defect`: it is FX032, a known
defect under the author's G-erased ruling item 5
(test/r0-shadow-known.mjs), which matters when ruling on the read-fault
losses.

This supporting check reads certification losses, as §18.159 defines
them. Whether programs survive the replacement of the old checker is
the whole-program check above (§18.186). The three existing refusals
here are certification refusals: there, examples/records.wxw is lost,
and the other two programs are refused today.

One point is reasoned rather than checked: a declaration today's
`certify` accepts is a candidate, because
test/r0-t2-honest-report.mjs runs `certify` only on online
candidates. The live A1 check ("certify accepts, not validated nor
pinned") is `gateProblems` in the serial test.

### 3. The author's C6 decision

Check: `c6` cites a section after §18.157 that names C6.

Measured on 2026-11-03: not met; no ruling recorded. A2 specification
§12 C6 leaves the replacement-compatibility decision open "to resolve
before the new checker is enabled live", and §18.157 lists C6 as
undecided. Since 354ce6e the status cites §18.159, so the criterion
reads met. That ruling retains the expected shadow divergence and
does not authorize live acceptance widening; the gate reads only the
citation.

### 4. BACKLOG R034 (2), (10), R036 (1)-(3) and T6 landed

Dossier §18.161 (5) extended this criterion from R034 (2) and (10) to
R036 (1), (2) and (3) and T6 (the RT8 and window tooling fixes,
§18.161 (4)).

Check: `landed` names a regression row for each item, and the
registry holds that row. Under the project's rule, a fix lands with
its restored-defect row. No row may be recorded for two items, and
each row's name must carry its item's tag as a hyphen-separated part:
`r034-2`, `r034-10`, `r036-1`, `r036-2`, `r036-3` or `t6`. That rule
keeps an unrelated row from counting, and `r036-10` does not carry
`r036-1`. Rows for these items must follow it.

Met means the evidence exists: each item has its own tagged,
registered row. It is not permission to activate, and the met state
says so (§18.161 (5)).

Must-fail cases (test/r0-t2-activation-gate-cases.mjs): each item
missing (null or absent), a row with the wrong tag (an R034 row for
R034 (2), `r036-10` for R036 (1)), a row shared by two items (the
R034 pair, and R036 (2) with R036 (3)), and a row the registry lacks.
Restored-defect rows (scripts/regression-r0-t2-activation.mjs):
`r0-t2-activation-items-two` reads the R034 items alone,
`r0-t2-activation-shared-pair` checks only the first two items for a
shared row, and `r0-t2-activation-tag-prefix` reads a tag as a prefix.

Measured on 2026-11-04 (3cad78cd): met. Each item names its own
tagged row, and the registry holds it: R034 (2)
`r0-a2-r034-2-unmerged`, R034 (10) `r0-a2-r034-10-owner-twice`,
R036 (1) `r0-t2-r036-1-scan-blind`, R036 (2) `r0-t2-r036-2-meta-raw`,
R036 (3) `r0-t2-r036-3-row-coarse` and T6 `r0-t6-rt8-declines-defect`.
The met state adds "met: the evidence exists; not permission to
activate (§18.161 (5))". Record check 6 (5f87a35, rows
`r0-a2-duplicates-*`) rejects repeated declaration-list entries
(§18.155 (2)). That is a different invariant from (10)'s duplicated
owner, and the gate does not count it.

### 5. Scratch-build comparison with the validator minting

Check: `comparison` names a JSON file holding `build` (the build
compared, as text), `commit` (the full sha it was built from) and, for
`census`, `window`, `rt8` and `shadow`, a `moved` list with every
moved row. The src tree at `commit` must equal HEAD's; otherwise the
record is unmet ("stale: src changed since <commit>"), and a record
without `commit` is unmet too. That is the comparison the A2 plan's
Task 16 Step 1 describes, made with r0-results-diff on the dumps. The
gate checks that the comparison was recorded. Whether the moves are
acceptable is for the author to rule.

Measured on 2026-11-12: met. The status cites
test/fixtures/r0/t2-minting-comparison10.json, the repeat after the
R037 (2) remaining-sites repair (§18.182) and its formatting fix, at
59e70fdb. Census 0 moved, window 16, rt8 15, shadow 16. Its `commit` is
59e70fdb57975bc01f09f6f8984d17e612ceef46, and src is unchanged since.
Whether the moves are acceptable is the author's to rule.

### 6. Performance qualified, read-back and validator apart

Check:

- `performance.ruling` cites a section after §18.157 that names R035
  and approves a budget.
- `performance.budget` holds the approved figures, a number for each
  part and metric.
- `performance.measurement` names a JSON file with `conditions`,
  `commit` (as for criterion 5: its src tree must equal HEAD's, and a
  file without it is unmet) and two parts, `readBack` (trace
  collection and read-back) and `validator`. Each part has
  `compileTime` and `peakMemory`, each with a `measured` number that
  is finite and not negative.
- Each measured value is at most the status file's budget. Any budget
  written in the measurement file is ignored.

BACKLOG R035's acceptance asks for "an approved budget met by a
recorded measurement before activation", memory included.

Measured on 2026-11-04 (3cad78cd): not met. There is no budget
ruling and there are no budget figures, so the report lists the
missing ruling, the missing figures and each of the four budgets the
status lacks. A measurement is recorded:
test/fixtures/r0/t2-performance-10.json, measured at 59e70fdb
(2026-11-12), with its conditions and both parts. Its `commit` is
59e70fdb57975bc01f09f6f8984d17e612ceef46, and src is unchanged since.
The budgets are approved (§18.168) and its figures are within them; the
source identity check passes. The attribution of the
failed perf files (test/fixtures/r0/t2-perf-attribution.json) is not
read by the gate. R034 (11) makes no performance claim for the
validator.

### 7. Routing after activation; U4 and U6 standing

Check: `routing` cites a section after §18.157 that names routing, and
statements §7 cites that section's whole number (`§18.15` does not
match `§18.155`). The report prints U4's and U6's standing from the
statements' §0e table, the only rows it reads. The gate requires both
rows to be present and judges neither; the author weighs them in the
routing ruling.

Measured on 2026-11-03: not met; no ruling recorded. Statements §7
cited only §18.155 (5), which says routing after activation "is part
of Task 16's approval". Since 354ce6e the status and statements §7
cite §18.159, so the criterion reads met; that ruling approves the
routing direction, not activation. U4: "unresolved". U6: "argued;
fixtures and mutants never run".

## What the gate cannot see

- It reads that a cited section comes after §18.157, exists and names
  the matter. It cannot read what that later section decides, so a
  section after §18.157 that mentions the matter while deferring it
  would pass. This applies to the re-pin (1), the losses (2), C6 (3),
  the budget (6) and routing (7). Review of the gate-status change
  catches that.
- It reads the pin as it stands. Whether the corpus still matches is
  checked by the serial test.
- It reads the gap-verdict file as recorded, against the pin. Whether
  the file still matches the committed checker is checked by
  test/r0-t2-gap-verdicts.serial.test.mjs, not by the gate. A loss
  counts as an existing refusal only by `certify`'s recorded verdict;
  the gate does not judge whether a refusal is the right one. A read
  fault's verdict is not fixed by the pin, so a read fault recorded
  with a well-formed refusal it was never given is caught only by
  the serial test.
- A named regression row shows that a correctly tagged row exists,
  not that it proves the fix. The regression run in verify proves
  that.
- The comparison and measurement files are read as recorded. Whether
  every moved row is listed depends on r0-results-diff, and units and
  conditions are the measurer's.
- A record whose `commit` has HEAD's src tree can still be stale in
  every other input: the test helpers and scripts that ran it, the
  corpus, dependencies, the compiler toolchain and the machine. The
  check also compares committed trees, so uncommitted changes to src
  are not seen, and a `commit` that names the wrong run is taken at
  its word.
- U4's and U6's standing is printed, not judged.

## Shadow minting and live replacement (dossier §18.168)

Enabling stricter shadow certification does not approve losing working
programs in the live compiler, so the two decisions report apart, in
test/r0-t2-shadow-gate.mjs.

- **S1**: the read-fault and ForcedTail lists are each accepted within
  shadow certification. The status's `shadowLosses` cites a section naming
  `shadow certification` and the list. A citation also used for that
  list's or another's live loss (`losses`) is unmet for both S1 and
  criterion 2.
- **S2**: the real `EffectsUnread` constructor reaches RT8 and the window.
  `realReadFaultRow` names a registered regression row carrying the tag
  `effects-unread-real`, and the constructor exists in `Unsupport`. The
  switch's own change adds both.

Each citation is compared in one spelling across every list, so a section
cited for live on one list cannot stand for shadow on another. A live
citation must name `live replacement` and not `shadow certification`. These
are name checks: as elsewhere in this gate, they read that a section names
its matter, not what it decides, ignoring case and line wrapping. S2 also
requires `EffectsUnread` among the constructors of `Unsupport`.

Shadow minting needs every criterion but 2, plus S1 and S2. Live
replacement needs them all. The script exits 0 only when all are met, and
a met gate still activates nothing.

## Today's report

The script's unindented lines on the working tree (exit 1), checked
by test/r0-t2-activation-gate.test.mjs. Its measured lines are longer
than this file's 80-column limit, so they are left out here; the
Measured paragraphs above paraphrase them, and the script prints them
in full.

```text
A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md)
1 met: Task 13's pin approved; no unexpected refusal
2 NOT MET: A1: whole-program losses under decide ruled
3 met: the author's C6 decision
4 met: BACKLOG R034 (2), (10), R036 (1)-(3) and T6 landed
5 met: scratch-build comparison with the validator minting
6 met: performance qualified, read-back and validator apart
7 met: routing after activation; U4 and U6 standing
criteria 1-7: not met (2)
S1 met: each loss accepted within shadow certification only
S2 met: the real EffectsUnread reaches RT8 and the window
shadow minting: met
live replacement: not met (2)
```

Criterion 2's lines on the working tree, the same at 3cad78cd as at
the head of branch ap/verdicts, each wrapped here and with the loss
names left out:

```text
loss on replacement, RequirementUnjudged (corpus loader: losses 0,
  existing refusals 3; effect pin: losses 0, existing refusals 3):
  existing refusals only, no loss ruling needed
  (test/fixtures/r0/t2-gap-verdicts.json)
loss on replacement, read faults (corpus loader: losses 11, existing
  refusals 0; effect pin: losses 12, existing refusals 0): ruling
  recorded: no; losses: …
loss on replacement, ForcedTail (corpus loader: losses 4, existing
  refusals 0; effect pin: losses 4, existing refusals 0): ruling
  recorded: no; losses: …
```

Today the gate is not met, which is what the evidence in the working
tree shows.
