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
are met. It reads committed files and nothing else. It runs neither
the corpus nor the compiler and writes nothing. It reads:

- the gate-status file, test/fixtures/r0/t2-activation-gate.json;
- Task 13's honest pin, test/fixtures/r0/t2-honest.json, against the
  named lists in test/r0-t2-honest-gate.mjs;
- the dossier, docs/plans/2026-10-20-record-composition-dossier.md, by
  section heading;
- the statements, docs/plans/r0-amin-statements.md (§7 and the §0e
  table's U4 and U6 rows);
- the regression registry's row names (scripts/regression-r0.mjs);
- the files the gate-status file cites (sections 5 and 6 below).

The criteria are pure functions in test/r0-t2-activation-gate.mjs,
test/r0-t2-activation-pin.mjs and test/r0-t2-activation-evidence.mjs.
An absent file, an absent key or a misshapen value is unmet, and so is
a measure that throws. Nothing is assumed met.

The gate-status file is the record of what the author has ruled and
what has been run. Today every value in it is null:

| Key | Holds | Criterion |
|---|---|---|
| `c6` | the dossier section (`§18.NNN`) recording the C6 decision | 3 |
| `landed` | per item, `"R034 (2)"` and `"R034 (10)"`, the name of its restored-defect regression row | 4 |
| `comparison` | the path of the committed comparison file | 5 |
| `performance.ruling` | the dossier section approving the budget | 6 |
| `performance.measurement` | the path of the committed measurement file | 6 |
| `routing` | the dossier section ruling routing after activation | 7 |

A cited ruling counts as recorded only if the dossier has a `###`
heading with exactly that number and the section's text names the
matter: `C6` for criterion 3, `R035` for 6, `routing` for 7.

Checks: `node --test test/r0-t2-activation-gate.test.mjs` (6 tests).
A synthetic body of evidence meets all seven criteria. Each of 26
must-fail cases changes one thing and must leave unmet exactly the
criteria it names, with every other criterion still met. Every
criterion has a case that fails it alone. With no evidence at all, all
seven are unmet. The last test runs the script on the committed tree
and checks that its exit status agrees with the criteria it names. The
regression rows in scripts/regression-r0-t2-activation.mjs (probe
`r0-t2-activation-gate`, test/regression-r0-t2-activation.mjs) each
restore one defect in the gate's helpers: a ruling not cited read as
recorded, a cited section not read for its matter, A1's count
unchecked, ForcedTail admitted by class rather than by name, and an
unreadable piece of evidence read as met.

## Criteria

### 1. Task 13's pin approved; no unexpected refusal

Check: the pin cites §18.157, and §18.157 exists and records the
admission. In both denominators every refusal is one of the three
named `RequirementUnjudged` declarations (`unjudged`), and every
ForcedTail entry is one of the four named in §18.157 (`forcedTail`)
and refused `NotCertifiable ForcedTail`. A ForcedTail case that has
been resolved leaves the pin only by a re-pin, which needs its own
ruling (§18.157).

Measured: met. Both denominators hold 3 named `RequirementUnjudged`
and 4 ForcedTail admitted by name. The pin was written by
scripts/r0-t2-honest-pin.mjs at b0d20c1. That script writes only when
§18.155 (7)'s admission holds, so no `Malformed` and no unapproved
read fault was observed then (reasoned from the script). Whether the
pin still matches a fresh run is checked by
test/r0-t2-honest.serial.test.mjs in the routine verify, not by this
gate.

### 2. A1: every accepted declaration validated or on a ruled list

Check: in each denominator, candidates equal the validated floor plus
the read faults, the `RequirementUnjudged` refusals and the ForcedTail
refusals. Every read fault is an identified unsupported declaration
with its kind or one of the two `UnreadImage` declarations (§18.155
(6), (7)). Every refusal is named as in criterion 1, and §18.155 and
§18.157 exist and name their lists.

Measured: met. Corpus loader: 2823 candidates = floor 2805 + 11 read
faults + 3 + 4. Effect-pin sources: 2832 = 2813 + 12 + 3 + 4. A
declaration today's `certify` accepts is a candidate, because
test/r0-t2-honest-report.mjs runs `certify` only on online candidates
(reasoned). The three `RequirementUnjudged` declarations are not
accepted today: the pin script admitted each only with `certify`'s own
refusal. The pin does not record `certify`'s verdict on the read
faults, so the gate cannot count how many of them are acceptances
lost; the criterion does not need that count. The live A1 check
("certify accepts, not validated nor pinned") is `gateProblems` in the
serial test.

The report also prints this note: §18.157 admits the four to the pin
and does not approve losing them when the old checker is replaced.
That loss is undecided, and it is not one of the seven criteria.

### 3. The author's C6 decision

Check: `c6` cites a dossier section that names C6.

Measured: not met; no ruling recorded. A2 specification §12 C6 leaves
the replacement-compatibility decision open "to resolve before the new
checker is enabled live", and §18.157 lists C6 as undecided.

### 4. BACKLOG R034 (2) and (10) have landed

Check: `landed` names a regression row for each item, and the
registry holds that row. Under the project's rule, a fix lands with
its restored-defect row.

Measured: not met; neither item has a row. BACKLOG R034's next action
still reads "add (10)'s check" and "land (2) before Task 16", which
the A2 plan's Task 16 guards require. Record check 6 (5f87a35, rows
`r0-a2-duplicates-*`) rejects repeated declaration-list entries
(§18.155 (2)). That is a different invariant from (10)'s duplicated
owner, and the gate does not count it.

### 5. Scratch-build comparison with the validator minting

Check: `comparison` names a committed JSON file holding `build` (the
commit compared) and, for `census`, `window`, `rt8` and `shadow`, a
`moved` list with every moved row. That is the comparison the A2
plan's Task 16 Step 1 describes, made with r0-results-diff on the
dumps. The gate checks that the comparison was recorded. Whether the
moves are acceptable is for the author to rule.

Measured: not met; not run. Minting is held (§18.157), so no such
build exists. Evidence it needs: the comparison file above, from a
run the author authorizes.

### 6. Performance qualification, read-back and validator apart

Check: `performance.ruling` cites a dossier section naming R035 that
approves a budget. `performance.measurement` names a committed JSON
file with `conditions` and two parts, `readBack` (trace collection and
read-back) and `validator`. Each part has `compileTime` and
`peakMemory`, each a `budget` and a `measured` number, measured within
budget. BACKLOG R035's acceptance asks for "an approved budget met by
a recorded measurement before activation", memory included.

Measured: not met; no budget ruling and no measurement. The only
figures are §18.156's noisy reports (collection +22% compile and +35%
recheck CPU, read-back about +80% CPU on the shadow test), which
§18.157 says establish neither a regression size nor acceptable
performance. R034 (11) makes no performance claim for the validator.
Evidence it needs: the ruling and the measurement file above.

### 7. Routing after activation; U4 and U6 standing

Check: `routing` cites a dossier section naming routing, and
statements §7 cites that section. The report prints U4's and U6's
standing from the statements' §0e table. The gate requires both rows
to be present and judges neither; the author weighs them in the
routing ruling.

Measured: not met; no ruling recorded. Statements §7 says routing
after activation "is part of Task 16's approval" (§18.155 (5)). U4:
"unresolved". U6: "argued; fixtures and mutants never run".

## What the gate cannot see

- It reads that a cited section exists and names the matter, not what
  the section decides. A section that mentions C6 and defers it would
  pass check 3. Review of the gate-status change catches that.
- It reads the pin as committed. Whether the corpus still matches is
  checked by the serial test.
- A named regression row shows that a row exists, not that it proves
  the fix. The regression run in verify proves that.
- The comparison and measurement files are read as recorded. Whether
  every moved row is listed depends on r0-results-diff, and units and
  conditions are the measurer's.
- U4's and U6's standing is printed, not judged.

## Today's report

```text
A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md)
1 met: Task 13's pin approved; no unexpected refusal
2 met: A1: every candidate validated or on a ruled list
3 NOT MET: the author's C6 decision
4 NOT MET: BACKLOG R034 (2) and (10) landed
5 NOT MET: scratch-build comparison with the validator minting
6 NOT MET: performance qualified, read-back and validator apart
7 NOT MET: routing after activation; U4 and U6 standing
gate: not met (3, 4, 5, 6, 7)
```

Each heading is followed by its measured lines, as quoted in the
criteria above. Today the gate is not met, which is what the
committed evidence shows.
