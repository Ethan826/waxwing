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
const { empty, Meta } = await load('Features.Check.Subst');
const { Nothing } = await load('Data.Maybe');
const { TInt, TBool } = await load('Domain.Type.Core');
const { made } = await load('Features.Check.RowMerge.Predicate');
const { improve } = await load('Features.Check.RowMerge.Improve');

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

// B3 (plan §3.5): the re-examination's own failures. `Exhausted` (the
// rescan's bound, rules §5) is a limit; `FromMerge` is what its inner
// failure establishes, kept with its cause.
test('the rescan\'s bound is a limit; a predicate\'s failure keeps its class',
  () => {
    const limit = outcomeOf(new Left(new failures.Exhausted('bound')));
    assert.equal(limit.value0.constructor.name, 'Limit');
    const cause = { predicate: 0, at: Nothing.value };
    const mismatch = new failures.Mismatch(TInt.value, TBool.value);
    const caused = outcomeOf(new Left(new failures.FromMerge(cause,
      mismatch)));
    assert.equal(caused.value0.constructor.name, 'Contradiction');
    assert.equal(caused.value0.value0.failure.constructor.name, 'FromMerge');
    const stopped = outcomeOf(new Left(new failures.FromMerge(cause,
      new failures.Placeholder('later'))));
    assert.equal(stopped.value0.constructor.name, 'Unfinished');
    assert.throws(() => classify(limit), /row solver stopped/);
  });

// A predicate case 1 can fire on (its left part closed), examined with an
// injected unifier: a stop comes out a stop, never the predicate's; any
// other failure is the predicate's.
test('stops injected through re-examination stay stops', () => {
  const closedLeft = made(Nothing.value)({ fields: [], tails: [] })(
    { fields: [], tails: [new Meta(1)] })({ fields: [], tails: [new Meta(2)] })(
    empty);
  const through = failure => improve(() => () => () => new Left(failure))(
    closedLeft);
  for (const [failure, stop] of [[failures.TooDeep.value, 'Limit'],
    [new failures.Unexpected('broken'), 'Internal']]) {
    const found = through(failure);
    assert.equal(found.value0.constructor.name, failure.constructor.name);
    assert.equal(outcomeOf(found).value0.constructor.name, stop);
  }
  const mismatch = through(new failures.Mismatch(TInt.value, TBool.value));
  assert.equal(mismatch.value0.constructor.name, 'FromMerge');
  assert.equal(mismatch.value0.value0.predicate, 0);
  assert.equal(outcomeOf(mismatch).value0.constructor.name, 'Contradiction');
});

test('the runner fails on a limit or an internal failure', () => {
  for (const failure of [failures.TooDeep.value,
    new failures.Unexpected('broken')]) {
    assert.throws(() => classify(outcomeOf(new Left(failure))),
      /row solver stopped/);
  }
  assert.ok('subst' in classify(outcomeOf(new Right(empty))));
});
