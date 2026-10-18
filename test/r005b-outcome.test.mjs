import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { classify, concluded, entry, flexOf, Left, Right, run }
  from './row-merge-entry.mjs';

// R005 Tranche B Task 4, the user's review of 2026-10-18: only a genuine
// inconsistency (a rejection the rules file argues) is a `Contradiction`.
// A limit reached (`TooDeep`), an invariant broken (`Unexpected`) and a
// placeholder are outside the semantic outcome, on its outer channel
// (Features.Check.RowOutcome `Stop`), and the oracle runner fails on the
// first two rather than counting them as refusals. Task 5 (the user,
// 2026-10-18): the channel survives the drain and the end of a body, and
// a successful unification is no verdict: `Solved` and `Unresolved` are
// made only by the end of a body (`concluded` on a whole run).
const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const failures = await load('Features.Check.UnifyFailure');
const { empty } = await load('Features.Check.Subst');

const row = (fields, tails = []) => ({ fields, tails });
const none = { lacks: {}, apart: [] };
const waits = [{ k: 'eq', l: row([], ['m0', 'm1']), r: row(['x', 'y']) }];

test('a genuine inconsistency is a Contradiction', () => {
  const found = run(none, [{ k: 'eq', l: row(['a']), r: row(['b']) }]);
  assert.equal(found.v, 'refuse');
  const lacked = run(none, [{ k: 'lacks', v: 'm0', l: 'a' },
    { k: 'eq', l: row([], ['m0']), r: row(['a']) }]);
  assert.equal(lacked.v, 'refuse');
});

test('a successful unification is no verdict: an equation still waits', () => {
  const step = entry.equate(entry.indexed)(empty)(entry.row([])([flexOf('m0'),
    flexOf('m1')]))(entry.row(['x', 'y'])([]));
  assert.ok(step instanceof Right);
  const found = concluded(step);
  assert.equal(found.value0.constructor.name, 'Unresolved');
  assert.equal(run(none, waits).v, 'D4');
});

const stops = [[() => failures.TooDeep.value, 'Limit'],
  [() => new failures.Unexpected('broken'), 'Internal']];

test('depth exhaustion and a broken invariant are no verdict', () => {
  for (const [failure, name] of stops) {
    const found = concluded(new Left(failure()));
    assert.equal(found.constructor.name, 'Left');
    assert.equal(found.value0.constructor.name, name);
  }
});

// A re-examination that stops, injected through the drain: the stop
// survives, wrapped as the drain's (`Drained`), never a verdict.
test('a limit or a broken invariant met by the drain is still a stop', () => {
  const waiting = entry.equate(entry.indexed)(empty)(entry.row([])(
    [flexOf('m0'), flexOf('m1')]))(entry.row(['x', 'y'])([])).value0;
  const woken = entry.lackingOlderRaw(waiting)(flexOf('m0'))('z').value0;
  for (const [failure, name] of stops) {
    const failing = () => () => new Left(failure());
    const drained = entry.drainWith(entry.indexed)(failing)(woken);
    assert.equal(drained.constructor.name, 'Left');
    assert.equal(drained.value0.constructor.name, 'Drained');
    const found = concluded(drained);
    assert.equal(found.value0.constructor.name, name);
    assert.throws(() => classify(found), /row solver stopped/);
  }
});

// The end of a body classifies a drained state; an equation woken and
// not re-examined is a checker defect, Internal, never a verdict.
test('the end of a body with an equation left woken is Internal', () => {
  const waiting = entry.equate(entry.indexed)(empty)(entry.row([])(
    [flexOf('m0'), flexOf('m1')]))(entry.row(['x', 'y'])([])).value0;
  const woken = entry.lackingOlderRaw(waiting)(flexOf('m0'))('z').value0;
  const found = concluded(new Right(woken));
  assert.equal(found.value0.constructor.name, 'Internal');
  assert.throws(() => classify(found), /row solver stopped: Internal/);
});

test('a placeholder is no verdict: the Unfinished stop, a skipped run', () => {
  const found = concluded(new Left(new failures.Placeholder('later')));
  assert.equal(found.value0.constructor.name, 'Unfinished');
  assert.deepEqual(classify(found), { skipped: 'later' });
});

test('the runner fails on a limit or an internal failure', () => {
  for (const [failure] of stops) {
    assert.throws(() => classify(concluded(new Left(failure()))),
      /row solver stopped/);
  }
  assert.ok('subst' in classify(concluded(new Right(empty))));
});
