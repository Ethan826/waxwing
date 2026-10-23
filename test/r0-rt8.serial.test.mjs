import test from 'node:test';
import assert from 'node:assert/strict';
import { pinCommand, pinnedRt8, rt8File, rt8Rows, rt8Table }
  from './r0-rt8-run.mjs';

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
const expected = [/^agree: Solved$/, /^agree: no candidate \(\w+\)$/,
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
