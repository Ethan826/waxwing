import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { validateList } from './regression-r0-a2-mb.mjs';
import { diffRunner } from './r0-t2-diff-run.mjs';
import { sample, stepDown, stepUp } from './r0-t2-diff-forge.mjs';
import { fixtureRun, vacuityWrong } from './regression-r0-t2-diff.mjs';

// Tranche 2 Task 15, fixture-level: the forgery grammar of
// test/r0-t2-diff-forge.mjs (marks only) and the differential over A2
// Task 11's case packages. The corpus run is
// test/r0-t2-differential.serial.test.mjs.

test('marks only: one covering step on N ⊑ J S ⊑ M', () => {
  const rows = [[['N', []], 'M', undefined], [['M', []], undefined, 'N'],
    [['N', ['b', 'a']], ['a'], undefined],
    [[['a'], ['a', 'b']], ['a', 'b'], 'N'],
    [[['a', 'b'], ['a', 'b']], 'M', ['a']],
    [['M', ['b', 'a']], undefined, ['a', 'b']]];
  for (const [[term, rigid], up, down] of rows) {
    assert.deepEqual(stepUp(term, rigid), up, `${term} up`);
    assert.deepEqual(stepDown(term, rigid), down, `${term} down`);
  }
});

test('marks only: the cap samples evenly and deterministically', () => {
  const items = Array.from({ length: 10 }, (_, index) => index);
  assert.deepEqual(sample(items, 4), [0, 2, 5, 7]);
  assert.deepEqual(sample(items, 20), items);
});

test('marks only: a forgery changes exactly one term', async () => {
  const runner = await diffRunner(load);
  const { forge, cases } = runner;
  const [, problem, input] = validateList(cases)
    .find(([name]) => name === 'C2(b) d at M');
  const forged = forge.forgeries(problem, input);
  assert.ok(forged.some(item => item.kind === 'binding'));
  for (const item of forged)
    assert.equal(forge.marksOnly(input, item.input), null);
  assert.equal(forge.marksOnly(input, input), 'no term changed');
  // A row forgery (a dropped label) is not a mark forgery.
  const [{ at: [variable] }] = forged.filter(item =>
    item.kind === 'binding');
  const row = cases.Maps.lookup(cases.Effect.ordEVar)(variable)(
    input.effects).value0;
  const dropped = { ...input, effects: cases.Maps.insert(
    cases.Effect.ordEVar)(variable)({ ...row, labels: [] })(input.effects) };
  assert.equal(forge.marksOnly(input, dropped), 'row');
  // `J ∅` is N; a moved `marks` key is not a term change.
  assert.equal(forge.plain(cases.J()), 'N');
  const [, c1] = validateList(cases).find(([name]) => name === 'C1 A');
  const [first, second] = c1.effects.positions;
  const at = position => ({ ...input,
    marks: cases.Maps.singleton(position)(cases.N) });
  assert.equal(forge.marksOnly(at(first), at(second)), 'position');
});

test('marks only: the fixture differential agrees', async t => {
  const out = await fixtureRun(load);
  t.diagnostic(`marks only: ${JSON.stringify(out.forgeries)} forgeries; ${
    JSON.stringify(out.agreements)}`);
  assert.deepEqual(vacuityWrong(out), []);
  assert.deepEqual(out.apart, []);
  assert.deepEqual(out.disagreements, []);
});
