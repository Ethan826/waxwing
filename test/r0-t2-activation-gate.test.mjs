import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { expected, gateCases, wrongCases }
  from './r0-t2-activation-gate-cases.mjs';
import { criteria, evaluate, reportText }
  from './r0-t2-activation-gate.mjs';
import { section } from './r0-t2-activation-evidence.mjs';

// The A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md)
// on synthetic evidence (fixture-level): all seven met on `met`, and
// each must-fail case leaves unmet exactly the criteria it names,
// absent evidence included. Then the committed tree, read as the
// report script reads it: the report is consistent with its exit code
// whatever the gate's state.
const cases = gateCases();

test('the met evidence meets all seven criteria', () => {
  assert.deepEqual(cases.met, []);
  assert.equal(criteria.length, 7);
});

test('each must-fail case leaves unmet exactly its criteria', () => {
  for (const [name, ids] of Object.entries(expected))
    assert.deepEqual(cases[name], ids, name);
  assert.deepEqual(wrongCases(), []);
});

test('every criterion has a case that leaves it unmet alone', () => {
  const alone = Object.values(expected).filter(ids => ids.length === 1)
    .map(ids => ids[0]);
  for (const id of [1, 2, 3, 4, 5, 6, 7]) assert.ok(alone.includes(id));
});

test('absent evidence is unmet, never assumed met', () => {
  const nothing = evaluate({ status: null, pin: null, dossier: null,
    statements: null, rows: new Set(), files: {} });
  assert.deepEqual(nothing.filter(found => found.met), []);
  assert.match(reportText(nothing), /gate: not met \(1, 2, 3, 4, 5, 6, 7\)/);
});

test('a section is found by its whole number only', () => {
  const dossier = '### 18.15 a\nx\n### 18.157 b\ny\n## c\nz\n';
  assert.equal(section(dossier, '§18.157'), '### 18.157 b\ny');
  assert.equal(section(dossier, '§18.15'), '### 18.15 a\nx');
  assert.equal(section(dossier, '§18.1'), null);
  assert.equal(section(dossier, '18.157'), null);
});

test('the report script on the committed tree agrees with its exit', () => {
  const run = spawnSync('node', ['scripts/r0-t2-activation-gate.mjs'],
    { encoding: 'utf8' });
  assert.equal(run.stderr, '');
  const lines = run.stdout.split('\n');
  const heads = lines.filter(line => /^\d (met|NOT MET): /.test(line));
  assert.equal(heads.length, 7);
  const notMet = heads.filter(line => line.includes(' NOT MET: '))
    .map(line => line[0]);
  assert.equal(run.status, notMet.length === 0 ? 0 : 1);
  assert.ok(lines.includes(notMet.length === 0 ? 'gate: met'
    : `gate: not met (${notMet.join(', ')})`));
});
