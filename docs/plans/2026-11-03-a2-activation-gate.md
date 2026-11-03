# A2 activation gate (specification, 2026-11-03)

Status: specification of the gate only. It activates nothing. A2's
Task 16, the minting switch, stays held, and so do C6, F14's
retirement and the losses an actual replacement would cause (dossier
§18.157). F14's retirement is the author's and is not a criterion.

The gate is the seven criteria shown to the author in §18.156's report.
Each one below has the check that measures it, its state as measured
on 2026-11-03 (branch t2/gate from d375ffc), and the evidence that
would meet it. None of them is a decision. Where a criterion needs the
author, the gate measures only whether the ruling is recorded, and
where. A met gate means the stated evidence exists. It does not mean
the checker should be switched on; that call stays with the author.

## The report

`node scripts/r0-t2-activation-gate.mjs` prints each criterion's
state and exits 1 while any criterion is unmet, 0 only when all seven
are met. It reads files in the working tree and nothing else. It runs
neither the corpus nor the compiler and writes nothing. It reads:

- the gate-status file, test/fixtures/r0/t2-activation-gate.json;
- Task 13's honest pin, test/fixtures/r0/t2-honest.json, against the
  named lists in test/r0-t2-honest-gate.mjs and §18.157's figures;
- the dossier, docs/plans/2026-10-20-record-composition-dossier.md, by
  section heading;
- the statements, docs/plans/r0-amin-statements.md (§7, and U4's and
  U6's rows in the §0e table only);
- the regression registry's row names (scripts/regression-r0.mjs);
- the files the gate-status file cites (sections 5 and 6 below).

BACKLOG.md is not read. Criterion 4 reads regression rows instead.

The criteria are pure functions in test/r0-t2-activation-gate.mjs,
test/r0-t2-activation-pin.mjs and test/r0-t2-activation-evidence.mjs.
An absent file, an absent key or a misshapen value is unmet, and so is
a measure that throws. Nothing is assumed met.

The gate-status file is the record of what the author has ruled and
what has been run. Today every value in it is null:

| Key | Holds | Criterion |
|---|---|---|
| `repin` | the dossier section of a later re-pin ruling, if the pin departs from §18.157 | 1 |
| `losses` | per gap list (`faults`, `refusals`, `forcedTail`), the section ruling its loss on replacement | 2 |
| `c6` | the section recording the C6 decision | 3 |
| `landed` | per item, `"R034 (2)"` and `"R034 (10)"`, the name of its restored-defect regression row | 4 |
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
  Task 16. Citing one of them is therefore never a ruling.
- The dossier has a `###` heading with exactly that number.
- The section's text names the matter: `C6` for criterion 3, `R035`
  for 6, `routing` for 7, and for criterion 2 `read fault`,
  `RequirementUnjudged` or `ForcedTail` according to the list.

Checks: `node --test test/r0-t2-activation-gate.test.mjs` (7 tests).
A synthetic body of evidence meets all seven criteria. Each of 42
must-fail cases changes one thing and must leave unmet exactly the
criteria it names, with every other criterion still met. One further
case must hold: a lowered pin with a later re-pin ruling that names
its figures. Every criterion has a case that fails it alone. With no
evidence at all, all seven are unmet. On the real dossier, a status
citing §18.157 for C6, the losses and the budget, and §18.155 for
routing and the losses, leaves criteria 2, 3, 6 and 7 unmet. The last
test runs the script on the working tree and checks that its exit
status agrees with the criteria it names.

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
- an unreadable piece of evidence read as met.

## Criteria

### 1. Task 13's pin approved; no unexpected refusal

Check:

- The pin cites §18.157, and §18.157 exists and records the admission.
- Each denominator holds §18.157's figures (corpus loader 2823
  candidates, floor 2805; effect-pin sources 2832, floor 2813) and
  exactly the four ForcedTail declarations it names.
- A pin that departs from §18.157 is met only if `repin` cites a ruling
  after §18.157 whose section names the new candidates and floor. A
  pin lowered consistently, with candidates and floor falling
  together, is unmet without that ruling.
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

### 2. A1: each gap list's loss on replacement ruled

Check:

- In each denominator, the candidates equal the validated floor plus
  the read faults, the `RequirementUnjudged` refusals and the
  ForcedTail refusals.
- Every read fault is either an identified unsupported declaration
  with its kind or one of the two `UnreadImage` declarations (§18.155
  (6), (7)), and every refusal is named as in criterion 1.
- Each nonempty gap list has a ruling on its loss on replacement,
  cited in `losses` and recorded after §18.157. The gap lists are the
  read faults (`UnreadImage` and `Declined` together), the
  `RequirementUnjudged` refusals and the ForcedTail refusals. The
  report prints one line per list, giving its size in each
  denominator and whether its ruling is recorded.

Measured: not met. Corpus loader: 2823 candidates = floor 2805 + 11
read faults + 3 + 4. Effect-pin sources: 2832 = 2813 + 12 + 3 + 4. The
counts balance and every entry is on a named list. No list has a
ruling on its loss: §18.155 (6) keeps the two `UnreadImage`
declarations as "named compatibility gaps", and §18.157 admits the
four ForcedTail but "does not approve losing those programs when the
old checker is replaced".

Three points are reasoned rather than checked. A declaration today's
`certify` accepts is a candidate, because
test/r0-t2-honest-report.mjs runs `certify` only on online candidates.
The pin script admitted each `RequirementUnjudged` only with
`certify`'s own refusal. The pin does not record `certify`'s verdict
on the read faults. The live A1 check ("certify accepts, not
validated nor pinned") is `gateProblems` in the serial test.

### 3. The author's C6 decision

Check: `c6` cites a section after §18.157 that names C6.

Measured: not met; no ruling recorded. A2 specification §12 C6 leaves
the replacement-compatibility decision open "to resolve before the new
checker is enabled live", and §18.157 lists C6 as undecided.

### 4. BACKLOG R034 (2) and (10) have landed

Check: `landed` names a regression row for each item, and the
registry holds that row. Under the project's rule, a fix lands with
its restored-defect row. The two rows must differ, and each row's
name must carry its item's tag as a hyphen-separated part: `r034-2`
or `r034-10`. That rule keeps an unrelated row from counting. Rows
for these items must follow it.

Measured: not met; neither item has a row. BACKLOG R034's next action
(read by hand, not by the gate) still says "add (10)'s check" and
"land (2) before Task 16", which the A2 plan's Task 16 guards require.
Record check 6 (5f87a35, rows `r0-a2-duplicates-*`) rejects repeated
declaration-list entries (§18.155 (2)). That is a different invariant
from (10)'s duplicated owner, and the gate does not count it.

### 5. Scratch-build comparison with the validator minting

Check: `comparison` names a JSON file holding `build` (the commit
compared) and, for `census`, `window`, `rt8` and `shadow`, a `moved`
list with every moved row. That is the comparison the A2 plan's Task
16 Step 1 describes, made with r0-results-diff on the dumps. The gate
checks that the comparison was recorded. Whether the moves are
acceptable is for the author to rule.

Measured: not met; not run. Minting is held (§18.157), so no such
build exists. Evidence it needs: the comparison file above, from a
run the author authorizes.

### 6. Performance qualification, read-back and validator apart

Check:

- `performance.ruling` cites a section after §18.157 that names R035
  and approves a budget.
- `performance.budget` holds the approved figures, a number for each
  part and metric.
- `performance.measurement` names a JSON file with `conditions` and
  two parts, `readBack` (trace collection and read-back) and
  `validator`. Each part has `compileTime` and `peakMemory`, each with
  a `measured` number.
- Each measured value is at most the status file's budget. Any budget
  written in the measurement file is ignored.

BACKLOG R035's acceptance asks for "an approved budget met by a
recorded measurement before activation", memory included.

Measured: not met. There is no budget ruling, no budget figures and
no measurement. The only figures are §18.156's noisy reports
(collection +22% compile and +35% recheck CPU, read-back about +80%
CPU on the shadow test). §18.157 says they establish neither a
regression size nor acceptable performance. R034 (11) makes no
performance claim for the validator.

### 7. Routing after activation; U4 and U6 standing

Check: `routing` cites a section after §18.157 that names routing, and
statements §7 cites that section's whole number (`§18.15` does not
match `§18.155`). The report prints U4's and U6's standing from the
statements' §0e table, the only rows it reads. The gate requires both
rows to be present and judges neither; the author weighs them in the
routing ruling.

Measured: not met; no ruling recorded. Statements §7 cites only
§18.155 (5), which says routing after activation "is part of Task
16's approval". U4: "unresolved". U6: "argued; fixtures and mutants
never run".

## What the gate cannot see

- It reads that a cited section comes after §18.157, exists and names
  the matter. It cannot read what that later section decides, so a
  section after §18.157 that mentions the matter while deferring it
  would pass. This applies to the re-pin (1), the losses (2), C6 (3),
  the budget (6) and routing (7). Review of the gate-status change
  catches that.
- It reads the pin as it stands. Whether the corpus still matches is
  checked by the serial test.
- A named regression row shows that a correctly tagged row exists,
  not that it proves the fix. The regression run in verify proves
  that.
- The comparison and measurement files are read as recorded. Whether
  every moved row is listed depends on r0-results-diff, and units and
  conditions are the measurer's.
- U4's and U6's standing is printed, not judged.

## Today's report

```text
A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md)
1 met: Task 13's pin approved; no unexpected refusal
2 NOT MET: A1: each gap list's loss on replacement ruled
3 NOT MET: the author's C6 decision
4 NOT MET: BACKLOG R034 (2) and (10) landed
5 NOT MET: scratch-build comparison with the validator minting
6 NOT MET: performance qualified, read-back and validator apart
7 NOT MET: routing after activation; U4 and U6 standing
gate: not met (2, 3, 4, 5, 6, 7)
```

Each heading is followed by its measured lines, as quoted in the
criteria above. Today the gate is not met, which is what the evidence
in the working tree shows.
