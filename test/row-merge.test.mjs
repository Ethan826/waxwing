import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isMeta } from './row-merge-oracle.mjs';
import { run } from './row-merge-entry.mjs';
import { allOrders, fiveOrders, mulberry, permProblem, rawProblem,
  shapedProblem } from './row-merge-gen.mjs';
import { defects, judge, newTally } from './row-merge-judge.mjs';
import { checkExclusions } from './row-merge-homes.mjs';

// R005 Tranche B Task 4, level 1 of the oracle (plan, Task 4): the
// compiler's row solver (Features.Check.RowEntry) against the
// independent brute force (test/row-merge-oracle.mjs) on labels-only
// problems, each in several orders. Forced moves only: a run whose
// equation would wait reaches Task 5's placeholder and is `skipped`,
// counted by its order's position and printed, never a verdict. The
// exhaustive domains are in test/row-merge-domains.test.mjs.

const fixtures = readdirSync('test/fixtures/r005b').sort()
  .map(name => JSON.parse(readFileSync(`test/fixtures/r005b/${name}`, 'utf8')));
const verdictOf = { Solved: 'accept', Contradiction: 'refuse' };

const atomsOf = rows => [...new Set([
  ...rows.steps.flatMap(c => (c.k === 'lacks' ? [c.l]
    : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails])),
  ...Object.keys(rows.hyp.lacks)])].filter(a => !isMeta(a)).sort();

// The orders a fixture names: every one, or the given one.
const ordersOf = rows => (rows.orders === 'all' ? allOrders(rows.steps)
  : [rows.steps]);

const problemOf = fixture => ({ hyp: fixture.rows.hyp,
  cs: fixture.rows.steps, universe: atomsOf(fixture.rows) });

test('fixtures at solver stage 4 never wait and keep their class', () => {
  const t = newTally();
  for (const fixture of fixtures.filter(f => f.stages.solver === 4)) {
    const orders = ordersOf(fixture.rows);
    for (const order of orders) {
      const found = run(fixture.rows.hyp, order);
      assert.equal(found.v, verdictOf[fixture.result],
        `${fixture.name}: ${found.what ?? ''}`);
    }
    judge(problemOf(fixture), orders, t, { state: true });
  }
  assert.deepEqual(defects(t), []);
  assert.equal(t.problems, 25);
});

test('fixtures at solver stage 5: a verdict never contradicts the class', t => {
  const skipped = {};
  for (const fixture of fixtures.filter(f => f.stages.solver === 5)) {
    for (const order of ordersOf(fixture.rows)) {
      const found = run(fixture.rows.hyp, order);
      if (found.v === 'skipped') {
        skipped[fixture.result] = (skipped[fixture.result] ?? 0) + 1;
      } else {
        assert.notEqual(fixture.result, 'Unresolved', fixture.name);
        assert.equal(found.v, verdictOf[fixture.result], fixture.name);
      }
    }
  }
  t.diagnostic(`stage 5 runs skipped by class: ${JSON.stringify(skipped)}`);
  assert.ok(skipped.Unresolved > 0 && skipped.Solved > 0);
});

const GENERATORS = [
  ['raw (perm.mjs)', rnd => permProblem(rnd, false), 21],
  ['dense (perm.mjs DENSE=1)', rnd => permProblem(rnd, true), 22],
  ['raw (programs-gen.mjs)', rnd => rawProblem(rnd), 23],
  ['program-shaped', rnd => shapedProblem(rnd, false), 24],
  ['program-shaped, shared', rnd => shapedProblem(rnd, true), 25],
];
const PROBLEMS = 400;

for (const [name, generate, seed] of GENERATORS) {
  test(`random problems, five orders: ${name}, seed ${seed}`, t => {
    const rnd = mulberry(seed);
    const tally = newTally();
    for (let i = 0; i < PROBLEMS; i++) {
      const p = generate(rnd);
      judge(p, fiveOrders(rnd, p.cs), tally, { state: true });
    }
    const { examples, ...counts } = tally;
    t.diagnostic(JSON.stringify(counts));
    assert.deepEqual(defects(tally), []);
    assert.ok(tally.agreeSolved > 0 && tally.agreeContradiction > 0);
  });
}

test('property E\'s read-back catches a corrupted traversal', () => {
  const rnd = mulberry(24);
  const tally = newTally();
  for (let i = 0; i < PROBLEMS; i++) {
    const p = shapedProblem(rnd, false);
    judge(p, fiveOrders(rnd, p.cs), tally, { state: true });
  }
  assert.equal(tally.stateDiff, 0);
  assert.ok(tally.corruptCaught > 0, 'skipping nested bindings went unseen');
});

test('every home the solver excludes has no solution using it (L31)', t => {
  const rnd = mulberry(26);
  const tally = { exclusionsChecked: 0, exclusionsWrong: 0,
    exclusionsSkipped: 0, examples: [] };
  for (let i = 0; i < 300; i++) {
    const p = i % 2 ? permProblem(rnd, true) : shapedProblem(rnd, true);
    for (const order of fiveOrders(rnd, p.cs)) checkExclusions(p, order, tally);
  }
  const { examples, ...counts } = tally;
  t.diagnostic(JSON.stringify(counts));
  assert.equal(tally.exclusionsWrong, 0, JSON.stringify(examples));
  assert.ok(tally.exclusionsChecked > 0);
});
