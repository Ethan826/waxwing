import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { sources } from './r0-decide-support.mjs';

// R0 Task 7.1a, D1 spec §6.2: `decide`'s Solved verdict comes with a
// `Judged`, the problem it decided paired with the solution it found,
// minted only in Features.Check.Decide (rule E5). `judgedDecision` is
// `decide` with that pairing (a labelled reading: `decide`'s own type
// is unchanged, so Task 4.5's harness and its tests stay as they are).
const stubs = await stubsFrom(load);
const Decide = await load('Features.Check.Decide');
const Judged = await load('Domain.Verdict.Judged');
const { accepting, ending } = stubs.behaviours;
const Verdict = await load('Domain.Verdict');
const plain = stubs.recorded.problem(sources.clash);
const other = stubs.recorded.problem(sources.lacking);

const judgedOf = (strategies, problem) => Decide.judgedDecision(
  stubs.checking({ strategies }))(problem);

test('a Solved verdict is paired with the problem decide was given', () => {
  for (const problem of [plain, other]) {
    const result = judgedOf([accepting()], problem);
    assert.equal(result.constructor.name, 'Right');
    const { decision, judged } = result.value0;
    assert.equal(judged.constructor.name, 'Just');
    assert.equal(Judged.judgedProblem(judged.value0), problem);
    assert.equal(Judged.judgedSolution(judged.value0),
      decision.verdict.value0);
    // The decision is `decide`'s, unchanged.
    assert.deepEqual(decision, stubs.decide(stubs.checking(
      { strategies: [accepting()] }), problem).value0);
  }
});

test('no Solved verdict, no Judged; a fault stays a fault', () => {
  const ended = judgedOf([ending(Verdict.Exhausted.value)], plain);
  assert.equal(ended.value0.judged.constructor.name, 'Nothing');
  assert.equal(ended.value0.decision.verdict.constructor.name, 'Unresolved');
  const broken = judgedOf([stubs.behaviours.inconsistent('mismatch')],
    plain);
  assert.equal(broken.constructor.name, 'Left');
});
