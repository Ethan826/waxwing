import test from 'node:test';
import assert from 'node:assert/strict';
import { pinCommand, pinnedRt8, rt8File, rt8Rows, rt8Table }
  from './r0-rt8-run.mjs';
import { boundHoleClass, holeContractClass } from './r0-rt8-account.mjs';
import { r022Probes } from './r0-r022-probes.mjs';

// Task 4.3, RT8 (T-R0b §9 item 8) and acceptance criteria 2 and 4, over
// the pinned corpus: every declaration today's checker accepts or
// refuses is accounted for against the shadow verdict (`shadowDecisions`:
// `online` alone, no refuter or rule), and every read-back candidate
// reproduces the checked node's type at every recorded body path. A
// defect (of the recorder, the read-back, G0 or the search) fails here;
// the expected classes are counted and pinned in test/fixtures/r0/rt8.json
// for Task 4.5's window table. Corpus-wide, so serial.
const rows = await rt8Rows();
const table = rt8Table(rows);

test('RT8: no defect and no position finding', () => {
  assert.deepEqual(table.defects, []);
  assert.deepEqual(table.positions, []);
});

test('RT8: the classes equal their pinned counts', () => {
  assert.deepEqual(table, pinnedRt8(),
    `${rt8File} is stale; re-pin with \`${pinCommand}\` and review`);
});

// The expected classes, by the plan's labels: an inability to solve is
// agreement with today's refusal, never a refutation; a decline is
// §3.2(b); a block or a `RequirementOpen` refusal is §3.2(a); an
// ambiguous several-tail read-back is G-A-i(g)'s `Heuristic`.
const expected = [/^agree: Solved$/, /^Solved with a bound hole /,
  /^Solved, no witness: HoleContract /,
  /^agree: no candidate \(\w+\)$/,
  /^\(a\) blocked: Unresolved Unsupported /, /^\(a\) RequirementOpen$/,
  /^\(b\) declined by g0Guard(, today refuses)?$/,
  /^ambiguous several-tail read-back \(Heuristic\)$/,
  /^today's own internal failure \(SearchBroke\)$/];

test('RT8: every class is an expected one or a defect', () => {
  for (const name of Object.keys(table.classes))
    assert.ok(expected.some(pattern => pattern.test(name))
      || name.startsWith('DEFECT'), name);
  assert.equal(Object.values(table.classes).reduce((a, b) => a + b, 0),
    table.declarations);
  assert.ok(table.declarations > 3000);
});

// Review I-1: the hole binding (ReadBack step 4) is provisional, pending
// the author's ambiguity ruling, so a Solved resting on it is counted
// apart, and every declaration whose candidate bound a hole is listed
// (rt8.json `boundHoles`). C001's h1/h2 print a hole but are blocked by
// DataApplication first. Task 4.4: r005b/render-quiet-annotated's
// witness fails the hole contract, so it is that class, still listed.
const c001 = 'docs/plans/2026-10-21-c001-explicit/baseline';
const quiet = 'test/fixtures/r005b/render-quiet-annotated.json#main';
test('RT8: a Solved resting on a bound hole is its own class', () => {
  const pending = rows.filter(row => row.class === boundHoleClass)
    .map(row => row.at);
  assert.deepEqual(pending, [`${c001}/a1-discard-dictionary.wxw#main`,
    `${c001}/a2-unused-local.wxw#main`,
    'test/fixtures/r0/erased/form.show-reference.json#g']);
  const listed = table.boundHoles.map(entry => entry.split(': ')[0]);
  for (const at of [`${c001}/h1-print-empty.wxw#main`,
    `${c001}/h2-print-chosen.wxw#main`, ...pending, quiet])
    assert.ok(listed.includes(at), at);
  assert.equal(table.classes[boundHoleClass], pending.length);
  assert.ok(rows.filter(row => row.class === 'agree: Solved')
    .every(row => row.holes.length === 0));
});

// Task 4.4: every accepted candidate's witness, blocked or not, passes
// Cov's coverage; those without a witness fail the hole contract, W
// §1.5's check refusing `{}` at a `disjoint` or `lacks` atom (their own
// class, listed with the variable named; docs/findings.md): the corpus's
// render-quiet-annotated, and R022's inline probes once read back.
const probes = r022Probes.map(({ origin }) => `${origin}#g`);
test('RT8: every candidate is covered; a hole-contract refusal is listed',
  () => {
    const accepted = Object.values(table.witnesses).reduce((a, b) => a + b);
    assert.ok(accepted > 2700);
    assert.deepEqual(Object.keys(table.witnesses).sort(),
      ['NoWitness HoleContract', 'Witnessed']);
    assert.deepEqual(table.noWitness.map(entry => entry.split(': ')[0]),
      [quiet, ...probes]);
    for (const at of [quiet, ...probes])
      assert.equal(rows.find(row => row.at === at).class,
        holeContractClass, at);
  });
