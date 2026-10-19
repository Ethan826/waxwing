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

// B3: every fixture's rows in every order judged in full: the oracle (S,
// L, H, E with waiting predicates), the lineage lemma, and the research
// prototype's QT-strict+Sym as the second reference.
test('every fixture with rows, every order: oracle and reference agree',
  t => {
    const tally = newTally();
    for (const fixture of fixtures.filter(f => f.rows)) {
      judge(problemOf(fixture), ordersOf(fixture.rows), tally,
        { state: true });
    }
    const { examples, ...counts } = tally;
    t.diagnostic(JSON.stringify(counts));
    assert.deepEqual(defects(tally), []);
    assert.ok(tally.waitingChecked > 0 && tally.lineageChecked > 0);
  });

// Rows Task 4 decided only by an upper bound or a commit (B2 made them
// placeholder P1): `diag-14-fix` (accepted in 16 of its 24 orders before
// B2), `diag-14` (refused in 16 of 24) and a constant with one home.
// Since B3 their predicates wait to the end of the body in every order,
// placeholder P5, as QT-strict+Sym leaves them Unresolved: never a
// verdict. B4 owes their classes (plan §4.7, O3 and O5: `diag-14` a
// Contradiction by H, `diag-14-fix` Unresolved).
const P5 = 'merge predicates still waiting at the end of a body are '
  + 'classified in Task B4';
const committed = { hyp: { lacks: {}, apart: [] }, steps: [
  { k: 'lacks', v: 'm0', l: 'a' },
  { k: 'eq', l: { fields: [], tails: ['m0', 'm1'] },
    r: { fields: ['a'], tails: [] } }] };
const rowsOf = name => fixtures.find(f => f.name === name).rows;

test('decided before B2 only by a bound or a commit: P5 in every order',
  () => {
    for (const rows of [rowsOf('diag-14-fix'), rowsOf('diag-14'),
      committed]) {
      for (const order of allOrders(rows.steps)) {
        const found = run(rows.hyp, order);
        assert.equal(found.v, 'skipped', JSON.stringify(order));
        assert.equal(found.what, P5);
      }
    }
  });

// The dense family refuses nothing before H (B4): every run it does not
// accept waits, as QT-strict+Sym leaves it (the reference agrees).
const GENERATORS = [
  ['raw (perm.mjs)', rnd => permProblem(rnd, false), 21, true],
  ['dense (perm.mjs DENSE=1)', rnd => permProblem(rnd, true), 22, false],
  ['raw (programs-gen.mjs)', rnd => rawProblem(rnd), 23, true],
  ['program-shaped', rnd => shapedProblem(rnd, false), 24, true],
  ['program-shaped, shared', rnd => shapedProblem(rnd, true), 25, true],
];
// Waiting states checked by property E per family in verify; the
// exhaustive script checks them all.
const WAITING_CAP = 300;
const PROBLEMS = 400;

for (const [name, generate, seed, refuses] of GENERATORS) {
  test(`random problems, five orders: ${name}, seed ${seed}`, t => {
    const rnd = mulberry(seed);
    const tally = newTally();
    for (let i = 0; i < PROBLEMS; i++) {
      const p = generate(rnd);
      judge(p, fiveOrders(rnd, p.cs), tally,
        { state: true, waitingCap: WAITING_CAP });
    }
    const { examples, ...counts } = tally;
    t.diagnostic(JSON.stringify(counts));
    assert.deepEqual(defects(tally), []);
    assert.ok(tally.agreeSolved > 0 && tally.waitingChecked > 0);
    assert.equal(tally.agreeContradiction > 0, refuses);
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
