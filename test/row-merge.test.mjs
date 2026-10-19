import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isMeta } from './row-merge-oracle.mjs';
import { run } from './row-merge-entry.mjs';
import { allOrders, fiveOrders, mulberry, permProblem, rawProblem,
  shapedProblem } from './row-merge-gen.mjs';
import { defects, judge, newTally } from './row-merge-judge.mjs';

// R005 Tranche B Task 4, level 1 of the oracle (plan, Task 4): the
// compiler's row solver (Features.Check.RowEntry) against the
// independent brute force (test/row-merge-oracle.mjs) on labels-only
// problems, each in several orders. Since B2 only the one-tail rules
// decide: a run with two or more metas on a side of a residue reaches
// placeholder P1 and is `skipped`, counted by its order's position and
// printed, never a verdict. The exhaustive domains are in
// test/row-merge-domains.test.mjs.

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

// B2: problems Task 4 solved only by an upper bound (`design-forced-bound`,
// program 11) or by a commit (a constant with one home) now reach P1 in
// every order, a skipped run and never a verdict.
const P1 = 'rows with two unknown tails on one side are solved in Task B3';
const committed = { hyp: { lacks: {}, apart: [] }, steps: [
  { k: 'lacks', v: 'm0', l: 'a' },
  { k: 'eq', l: { fields: [], tails: ['m0', 'm1'] },
    r: { fields: ['a'], tails: [] } }] };

test('solved before B2 only by a bound or a commit: P1 in every order', () => {
  const bound = fixtures.find(f => f.name === 'design-forced-bound').rows;
  for (const rows of [bound, committed]) {
    for (const order of allOrders(rows.steps)) {
      const found = run(rows.hyp, order);
      assert.equal(found.v, 'skipped', JSON.stringify(order));
      assert.equal(found.what, P1);
    }
  }
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
