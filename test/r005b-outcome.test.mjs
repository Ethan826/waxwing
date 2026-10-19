import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { classify, outcomeOf, run } from './row-merge-entry.mjs';

// R005 Tranche B Task 4, the user's review of 2026-10-18: only a genuine
// inconsistency (a rejection the rules file argues) is a `Contradiction`.
// A limit reached (`TooDeep`), an invariant broken (`Unexpected`) and a
// placeholder are outside the semantic outcome, on its outer channel
// (Features.Check.RowOutcome `Stop`), and the oracle runner fails on the
// first two rather than counting them as refusals.
const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const { Left, Right } = await load('Data.Either');
const failures = await load('Features.Check.UnifyFailure');
const { empty } = await load('Features.Check.Subst');

const row = (fields, tails = []) => ({ fields, tails });
const none = { lacks: {}, apart: [] };

test('a genuine inconsistency is a Contradiction', () => {
  const found = run(none, [{ k: 'eq', l: row(['a']), r: row(['b']) }]);
  assert.equal(found.v, 'refuse');
  const lacked = run(none, [{ k: 'lacks', v: 'm0', l: 'a' },
    { k: 'eq', l: row([], ['m0']), r: row(['a']) }]);
  assert.equal(lacked.v, 'refuse');
});

// R005 Tranche B B2: the refusals only upper bounds and the sum rule made
// (`Outside`, `Derived`) go with them, and so do their rows of the
// classifier's table.
test('no refusal of the removed bound and sum rules remains', () => {
  for (const removed of ['Outside', 'Derived']) {
    assert.equal(failures[removed], undefined, removed);
  }
  for (const kept of ['Forbidden', 'Overlap', 'MayHold', 'Unproven',
    'Twice']) {
    assert.equal(typeof failures[kept], 'function', kept);
  }
});

test('depth exhaustion is no verdict: the Limit stop', () => {
  const found = outcomeOf(new Left(failures.TooDeep.value));
  assert.equal(found.constructor.name, 'Left');
  assert.equal(found.value0.constructor.name, 'Limit');
});

test('a broken invariant is no verdict: the Internal stop', () => {
  const found = outcomeOf(new Left(new failures.Unexpected('broken')));
  assert.equal(found.constructor.name, 'Left');
  assert.equal(found.value0.constructor.name, 'Internal');
  assert.equal(found.value0.value0, 'broken');
});

test('a placeholder is no verdict: the Unfinished stop, a skipped run', () => {
  const found = outcomeOf(new Left(new failures.Placeholder('later')));
  assert.equal(found.value0.constructor.name, 'Unfinished');
  assert.deepEqual(classify(found), { skipped: 'later' });
});

test('the runner fails on a limit or an internal failure', () => {
  for (const failure of [failures.TooDeep.value,
    new failures.Unexpected('broken')]) {
    assert.throws(() => classify(outcomeOf(new Left(failure))),
      /row solver stopped/);
  }
  assert.ok('subst' in classify(outcomeOf(new Right(empty))));
});
