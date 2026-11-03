import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { denominators, outcomeCounts, pinFile }
  from './r0-t2-honest-report.mjs';
import { admission, gateProblems, observe, pinOf }
  from './r0-t2-honest-gate.mjs';
import { annotated } from './r0-t2-honest-annotated.mjs';

// Tranche 2 Task 13 (design §I Task 8; dossier §18.155 (7), (8)),
// corpus-observed on both denominators (design §A): every online
// candidate's honest package (`readEffects`) through I3 and the trusted
// validator (`validate`, non-minting), beside today's `certify`. The
// pin (test/fixtures/r0/t2-honest.json, written only by
// scripts/r0-t2-honest-pin.mjs on the author's word) holds (a), (b),
// the four admitted ForcedTail refusals (b′, §18.157) and the floor
// per denominator; the lists are compared both ways. Corpus-wide,
// hence serial.
const found = await denominators(load);
const names = Object.keys(found);
const observed = Object.fromEntries(names.map(name =>
  [name, observe(found[name].rows)]));
for (const name of names)
  console.log(name, JSON.stringify(outcomeCounts(found[name].rows)));

test('the observation matches the approved pin, both ways', () => {
  const problems = names.flatMap(name => admission(observed[name],
    found[name].origins).map(problem => `${name}: ${problem}`));
  assert.ok(existsSync(join(repoRoot, pinFile)),
    `no approved pin; ruling §18.155 (7) admission:\n  `
      + problems.join('\n  '));
  assert.deepEqual(problems, []);
  const pin = JSON.parse(readFileSync(join(repoRoot, pinFile), 'utf8'));
  for (const name of names)
    assert.deepEqual(gateProblems(pin.denominators[name], observed[name]),
      [], name);
});

test('no package is Malformed', () => {
  for (const name of names) assert.deepEqual(observed[name].malformed, []);
});

// Design §B.3's 11 local-annotation declarations, which refuse at E1
// without the generation correction (§B.5): H2, observed.
test('the 11 annotation declarations validate', () => {
  const rows = found['effect pin'].rows;
  const verdicts = annotated.map(at => [at,
    rows.find(row => row.at === at)?.validate]);
  assert.deepEqual(verdicts, annotated.map(at => [at, 'validated']));
});

// Ruling §18.155 (8), for the stages a partial application supplies
// only (test/r0-t2-honest-stages.mjs); not generalized to stages
// another obligation constrains. Design §D counted 317 on the corpus
// loader; the effect pin's sources add none. A stage in a refused
// package has no completed package to check its consumption against:
// it is marked "consumption unchecked", exactly those stages and with
// that mark only, and every other stage passes all checks. The marked
// set is pinned: observed empty (2026-11-03), since none of the seven
// refused packages has a dropped stage, so on this corpus every stage
// is checked in full.
const unchecked = 'consumption unchecked: the package was refused';
const marked = [];

test('dropped partial stages are bare, settle empty and pass', () => {
  for (const name of names) {
    const stages = found[name].rows.flatMap(row => row.stages.map(stage =>
      ({ at: row.at, validated: row.validate === 'validated', ...stage })));
    const refused = stages.filter(stage => !stage.validated);
    console.log(`${name}: ${stages.length} dropped partial stages, `
      + `${refused.length} in refused packages: `
      + JSON.stringify([...new Set(refused.map(stage => stage.at))]));
    assert.equal(stages.length, 317, name);
    assert.deepEqual(refused.map(stage => stage.at), marked, name);
    assert.deepEqual(stages.filter(stage => stage.problems.length > 0),
      refused, name);
    assert.deepEqual(refused.map(stage => stage.problems),
      refused.map(() => [unchecked]), name);
  }
});

// The must-fail probes on the corpus's own observation, against a pin
// derived from it (not the approved one): a planted extra refusal, a
// removed pinned entry (from the pin, and from the observation) and a
// validated count one below the floor, each the only problem named
// where it can be; and a planted fifth ForcedTail refusal and a pin
// lacking one of the four.
test('the gate fails on each planted departure', () => {
  for (const name of names) {
    const rows = found[name].rows;
    const pin = pinOf(observed[name]);
    assert.deepEqual(gateProblems(pin, observed[name]), [], name);
    const first = rows.findIndex(row => row.validate === 'validated');
    const planted = rows.map((row, index) => (index === first
      ? { ...row, validate: 'ObligationFailed planted' } : row));
    assert.match(gateProblems(pin, observe(planted)).join('\n'),
      /refusal not pinned/);
    const forced = rows.map((row, index) => (index === first
      ? { ...row, validate: 'NotCertifiable ForcedTail planted' } : row));
    assert.match(gateProblems(pin, observe(forced)).join('\n'),
      /ForcedTail not pinned: /);
    const fewerForced = { ...pin, forcedTail: pin.forcedTail.slice(1) };
    assert.match(gateProblems(fewerForced, observed[name]).join('\n'),
      /ForcedTail not pinned: /);
    const removed = { ...pin, faults: pin.faults.slice(1) };
    assert.match(gateProblems(removed, observed[name]).join('\n'),
      /read fault not pinned/);
    const vanished = rows.map(row => (row.at === pin.faults[0].at
      ? { ...row, read: 'package', i3: 'ok', validate: 'validated' }
      : row));
    assert.deepEqual(gateProblems(pin, observe(vanished)),
      [`read fault pinned, not observed: ${pin.faults[0].at} `
        + pin.faults[0].fault]);
    const fewer = { ...observed[name], validated: pin.floor - 1 };
    assert.deepEqual(gateProblems(pin, fewer),
      [`validated ${pin.floor - 1} below the floor ${pin.floor}`]);
  }
});
