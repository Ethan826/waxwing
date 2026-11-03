import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { expected, gateCases, wrongCases }
  from './r0-t2-activation-gate-cases.mjs';
import { criteria, evaluate, reportText }
  from './r0-t2-activation-gate.mjs';
import { readFileSync } from 'node:fs';
import { dossierFile, section, statementsFile, statusFile }
  from './r0-t2-activation-evidence.mjs';
import { met } from './r0-t2-activation-gate-met.mjs';
import { pinApproved, pinFile } from './r0-t2-activation-pin.mjs';

// The A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md)
// on synthetic evidence (fixture-level): all seven met on `met`, and
// each must-fail case leaves unmet exactly the criteria it names,
// absent evidence included. Then the real dossier: sections up to
// §18.157 record these matters as undecided and must not count as
// rulings (review I1). Last, the working tree as the report script
// reads it: the report agrees with its exit code whatever the state.
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

test('sections up to §18.157 on the real dossier rule nothing', () => {
  const evidence = { ...met(),
    dossier: readFileSync(dossierFile, 'utf8'),
    statements: readFileSync(statementsFile, 'utf8') };
  evidence.status = { ...evidence.status, c6: '§18.157',
    routing: '§18.155', losses: { faults: '§18.155',
      refusals: '§18.155', forcedTail: '§18.157' },
    performance: { ...evidence.status.performance, ruling: '§18.157' } };
  const unmetIds = evaluate(evidence).filter(found => !found.met)
    .map(found => found.id);
  for (const id of [2, 3, 6, 7]) assert.ok(unmetIds.includes(id), `${id}`);
});

// Final review B-I1: §18.157's figures hold on the committed tree, so
// verify sees a pin that departs from them (criterion 1 on the real pin,
// dossier and status file). Must-fail: the same pin hand-lowered to
// 2822 candidates, floor 2804 (still balanced), with no re-pin ruling.
test("criterion 1 holds on the committed pin, §18.157's figures", () => {
  const json = file => JSON.parse(readFileSync(file, 'utf8'));
  const committed = { status: json(statusFile), pin: json(pinFile),
    dossier: readFileSync(dossierFile, 'utf8') };
  const found = pinApproved(committed);
  assert.ok(found.met, found.state.join('\n'));
  const lowered = structuredClone(committed.pin);
  lowered.denominators['corpus loader'].candidates = 2822;
  lowered.denominators['corpus loader'].floor = 2804;
  assert.equal(pinApproved({ ...committed, pin: lowered }).met, false);
});

// Task 16 final review, item 10: the report says why a re-pin or a
// measurement does not count.
test('the report names a figure-less re-pin and a bad measurement', () => {
  const stateOf = (change, id) => {
    const evidence = met();
    change(evidence);
    return evaluate(evidence).find(found => found.id === id).state
      .join('\n');
  };
  const partNumber = stateOf(evidence => {
    const loader = evidence.pin.denominators['corpus loader'];
    loader.candidates = 2822;
    loader.floor = 2804;
    evidence.status.repin = '§18.305';
  }, 1);
  assert.match(partNumber, /§18\.305 does not name the figures/);
  assert.doesNotMatch(partNumber, /ruling recorded: yes/);
  const measured = value => stateOf(evidence => {
    evidence.files['perf.json'].validator.compileTime.measured = value;
  }, 6);
  assert.match(measured(-1), /compileTime measurement -1 is negative/);
  assert.match(measured('1'), /compileTime measurement is not a finite/);
  assert.match(measured(undefined), /lacks a compileTime measurement/);
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
