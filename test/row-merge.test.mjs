import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { allSolutions, isMeta } from './row-merge-oracle.mjs';
import { byH, finishWithoutH, run } from './row-merge-entry.mjs';
import { allOrders, fiveOrders, mulberry, permProblem, rawProblem,
  shapedProblem } from './row-merge-gen.mjs';
import { defects, judge, newTally } from './row-merge-judge.mjs';

// R005 Tranche B Task 4, level 1 of the oracle (plan, Task 4): the
// compiler's row solver (Features.Check.RowEntry) against the
// independent brute force (test/row-merge-oracle.mjs) on labels-only
// problems, each in several orders. Since B4 every run ends in a
// verdict: accepted, refused (H's refusal at the end of a body among
// them) or Unresolved; a placeholder's skip is a defect. The exhaustive
// domains are in test/row-merge-domains.test.mjs.

const fixtures = readdirSync('test/fixtures/r005b').sort()
  .map(name => JSON.parse(readFileSync(`test/fixtures/r005b/${name}`, 'utf8')));
const verdictOf = { Solved: 'accept', Contradiction: 'refuse',
  Unresolved: 'unresolved' };

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

// B4: the end of a body classifies what waits (H, then Unresolved), so
// every order of every stage-5 fixture takes the fixture's class; the
// three reclassified fixtures and `same` are Unresolved, their annotated
// companions Solved (plan §4.5, decision 2).
test('fixtures at solver stage 5: every order takes the class', t => {
  const runs = {};
  for (const fixture of fixtures.filter(f => f.stages.solver === 5)) {
    for (const order of ordersOf(fixture.rows)) {
      const found = run(fixture.rows.hyp, order);
      assert.equal(found.v, verdictOf[fixture.result],
        `${fixture.name}: ${JSON.stringify(order)}`);
      runs[fixture.result] = (runs[fixture.result] ?? 0) + 1;
    }
  }
  t.diagnostic(`stage 5 runs by class: ${JSON.stringify(runs)}`);
  assert.ok(runs.Unresolved > 0 && runs.Solved > 0 && runs.Contradiction > 0);
});

// Unresolved claims nothing about how many solutions exist (ledger M6):
// the fixtures pin 0 (`odd-cycle`, `same`), 1 (`determinate` and the
// reclassified three) and several (`diag-01`, 4), counted by the oracle
// over each fixture's own atoms, and every one is Unresolved.
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();
const BUCKETS = { 'odd-cycle': 0, same: 0, determinate: 1, 'diag-01': 4,
  'design-forced-bound': 1, 'diag-14-fix': 1, 'design-quiet': 1 };

test('the Unresolved buckets: 0, 1 and several solutions', () => {
  const counted = fixtures.filter(f => f.solutions !== undefined);
  assert.deepEqual(Object.fromEntries(counted.map(f => [f.name,
    f.solutions])), BUCKETS);
  for (const fixture of counted) {
    const p = problemOf(fixture);
    const sols = allSolutions(metasOf(p.cs), p.universe, p.hyp, p.cs);
    assert.equal(sols.length, fixture.solutions, fixture.name);
    assert.equal(fixture.result, 'Unresolved', fixture.name);
  }
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
// placeholder P1; since B3 they waited to the end of the body, P5): the
// recovery obligations each shown (plan §4.7). O3: `diag-14` is a
// Contradiction by H in every order, Unresolved with H off. O5:
// `diag-14-fix` is Unresolved in every order. O4's labels-only shape, a
// constant with one home only a lacks fact names, is Unresolved. O1, O2
// and O4's programs are checked at the check phase
// (test/r005b-limitations.test.mjs, test/r005b-unify.test.mjs).
const oneHome = { hyp: { lacks: {}, apart: [] }, steps: [
  { k: 'lacks', v: 'm0', l: 'a' },
  { k: 'eq', l: { fields: [], tails: ['m0', 'm1'] },
    r: { fields: ['a'], tails: [] } }] };
const rowsOf = name => fixtures.find(f => f.name === name).rows;

test('recovery obligations O3, O5 and O4\'s shape, in every order', () => {
  for (const order of allOrders(rowsOf('diag-14').steps)) {
    const found = run(rowsOf('diag-14').hyp, order);
    assert.ok(found.v === 'refuse' && found.atEnd && byH(found.failure),
      JSON.stringify(order));
    const off = run(rowsOf('diag-14').hyp, order, finishWithoutH);
    assert.equal(off.v, 'unresolved');
  }
  for (const rows of [rowsOf('diag-14-fix'), oneHome]) {
    for (const order of allOrders(rows.steps)) {
      assert.equal(run(rows.hyp, order).v, 'unresolved',
        JSON.stringify(order));
    }
  }
});

// The dense family refused nothing before H; since B4 H refuses some of
// its Unresolved runs (the reference with H agrees).
const GENERATORS = [
  ['raw (perm.mjs)', rnd => permProblem(rnd, false), 21, true],
  ['dense (perm.mjs DENSE=1)', rnd => permProblem(rnd, true), 22, true],
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
