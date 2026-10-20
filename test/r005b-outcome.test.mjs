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
const end = await load('Features.Check.RowMerge.End');
const { concluded } = await load('Features.Check.RowOutcome');
const { LabelAtom } = await load('Features.Check.Atom');

// A step's classification by name: a stop's, `Contradiction`, or
// `Continued` (RowOutcome `stepped`).
const kind = found => {
  if (found.constructor.name === 'Left') return found.value0.constructor.name;
  return found.value0.constructor.name === 'Left' ? 'Contradiction'
    : 'Continued';
};

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
    assert.equal(kind(caused), 'Contradiction');
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
    assert.equal(kind(outcomeOf(found)), stop);
  }
  const mismatch = through(new failures.Mismatch(TInt.value, TBool.value));
  assert.equal(mismatch.value0.constructor.name, 'FromMerge');
  assert.equal(mismatch.value0.value0.predicate, 0);
  assert.equal(kind(outcomeOf(mismatch)), 'Contradiction');
});

// B4 (plan §3.5): the same injections through the end of a body. The
// predicate could progress (its left part is closed), so a unifier that
// fails with a stop passes the stop on, and one that fails otherwise, or
// succeeds, shows the fixpoint unfinished: a broken invariant.
test('stops injected through the end of a body stay stops', () => {
  const closedLeft = made(Nothing.value)({ fields: [], tails: [] })(
    { fields: [], tails: [new Meta(1)] })({ fields: [], tails: [new Meta(2)] })(
    empty);
  const ended = unify => concluded(end.endOfBody(unify)(end.homeless)(
    closedLeft));
  const failing = failure => () => () => () => new Left(failure);
  for (const [failure, stop] of [[failures.TooDeep.value, 'Limit'],
    [new failures.Unexpected('broken'), 'Internal'],
    [new failures.Placeholder('later'), 'Unfinished'],
    [new failures.Mismatch(TInt.value, TBool.value), 'Internal']]) {
    const found = ended(failing(failure));
    assert.equal(found.constructor.name, 'Left', stop);
    assert.equal(found.value0.constructor.name, stop);
  }
  const progressing = ended(subst => () => () => new Right(subst));
  assert.match(progressing.value0.value0, /could still progress/);
});

// B4: H's refusal is a Contradiction, its predicate's; with no predicate
// waiting the end of a body is Solved and H is never asked.
test('H\'s refusal is a contradiction; H is asked only when one waits', () => {
  const refused = concluded(new Left(new failures.FromMerge(
    { predicate: 3, at: Nothing.value },
    new failures.Homeless(new LabelAtom('x')))));
  assert.equal(refused.value0.constructor.name, 'Contradiction');
  assert.equal(refused.value0.value0.failure.value1.constructor.name,
    'Homeless');
  let asked = 0;
  const judge = () => () => {
    asked++;
    return Nothing.value;
  };
  const solved = concluded(end.endOfBody(() => () => () =>
    new Left(failures.TooDeep.value))(judge)(empty));
  assert.equal(solved.value0.constructor.name, 'Solved');
  assert.equal(asked, 0);
});

test('the runner fails on a limit or an internal failure', () => {
  for (const failure of [failures.TooDeep.value,
    new failures.Unexpected('broken')]) {
    assert.throws(() => classify(outcomeOf(new Left(failure))),
      /row solver stopped/);
  }
  assert.ok('subst' in classify(outcomeOf(new Right(empty))));
});
