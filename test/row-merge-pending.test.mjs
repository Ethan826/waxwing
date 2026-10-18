import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { allSolutions, isMeta } from './row-merge-oracle.mjs';
import { run, solverMetas, stateOf } from './row-merge-entry.mjs';
import { fixtureOrders } from './row-merge-gen.mjs';

// R005 Tranche B Task 5 (plan, Task 5; evidence rule 1): equations that
// wait. The three permanent Unresolved fixtures pin the buckets of the
// result that claims nothing about the number of solutions: their counts
// are asserted here through the compiler's solver (as research
// fixtures.mjs asserts them through the prototype), each run ends
// Unresolved in every order named, and the test fails if a count changes
// or a bucket loses its fixture. Quiet equations do not multiply (L7).

const fixtures = readdirSync('test/fixtures/r005b').sort()
  .map(name => JSON.parse(readFileSync(`test/fixtures/r005b/${name}`, 'utf8')));
const BUCKETS = { 'odd-cycle': 0, determinate: 1, 'diag-01': 4 };

const atomsOf = rows => [...new Set([
  ...rows.steps.flatMap(c => (c.k === 'lacks' ? [c.l]
    : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails])),
  ...Object.keys(rows.hyp.lacks)])].filter(a => !isMeta(a)).sort();
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();

for (const [name, count] of Object.entries(BUCKETS)) {
  test(`bucket fixture ${name}: Unresolved, ${count} solutions`, t => {
    const fixture = fixtures.find(f => f.name === name);
    assert.ok(fixture, `bucket fixture ${name} is missing`);
    assert.equal(fixture.result, 'Unresolved');
    assert.equal(fixture.solutions, count);
    const { hyp, steps } = fixture.rows;
    const sols = allSolutions(metasOf(steps), atomsOf(fixture.rows), hyp,
      steps);
    assert.equal(sols.length, count, `${name}: solutions`);
    const orders = fixtureOrders(fixture.rows);
    for (const order of orders) {
      const found = run(hyp, order);
      assert.equal(found.v, 'D4', `${name}: ${JSON.stringify(order)}`);
      assert.ok(stateOf(found.subst).pending.some(p => !p.quiet));
    }
    t.diagnostic(`${orders.length} orders, each Unresolved`);
  });
}

test('the asserted counts cover zero, one and several solutions', () => {
  const counted = fixtures.filter(f => f.solutions !== undefined)
    .map(f => f.solutions);
  assert.ok(counted.includes(0) && counted.includes(1)
    && counted.some(n => n >= 2), JSON.stringify(counted));
});

// research/open-row-merge/chain.mjs: h(merge, ..., merge) with n
// callbacks sharing a result; n - 1 quiet equations, no solver meta.
const tail = t => ({ fields: [], tails: [t] });
const chain = n => Array.from({ length: n }, (_, i) => [
  { k: 'dis', l: tail(`m${2 * i}`), r: tail(`m${2 * i + 1}`) },
  ...(i > 0 ? [{ k: 'eq', l: { fields: [], tails: ['m0', 'm1'] },
    r: { fields: [], tails: [`m${2 * i}`, `m${2 * i + 1}`] } }] : [])]).flat();
const QUIET_BOUND_MS = 2000;

test('a quiet chain of 12 is accepted, within a generous bound', t => {
  const started = performance.now();
  const found = run({ lacks: {}, apart: [] }, chain(12));
  const took = performance.now() - started;
  assert.equal(found.v, 'accept');
  const pending = stateOf(found.subst).pending;
  assert.equal(pending.length, 11);
  assert.ok(pending.every(p => p.quiet));
  assert.equal(solverMetas(found.subst), 0);
  assert.ok(took < QUIET_BOUND_MS, `${took} ms`);
  t.diagnostic(`${took.toFixed(1)} ms`);
});

// Identity and deduplication (design §2.6; rows r005b-pending-dedup): a
// re-examined equation that waits again replaces its entry under the same
// id, and an equation equal to an older one (the same normal form) is
// dropped, the older id kept.
const none = { lacks: {}, apart: [] };
const waits = { k: 'eq', l: { fields: [], tails: ['m0', 'm1'] },
  r: { fields: ['x', 'y'], tails: [] } };
const idsOf = found => stateOf(found.subst).pending.map(p => p.id);

test('a re-examined equation that waits again keeps its one entry', () => {
  const first = idsOf(run(none, [waits]));
  assert.equal(first.length, 1);
  const woken = run(none, [waits, { k: 'lacks', v: 'm0', l: 'z' }]);
  assert.equal(woken.v, 'D4');
  assert.deepEqual(idsOf(woken), first);
});

test('an equation met twice waits once, under the older id', () => {
  const first = idsOf(run(none, [waits]));
  const twice = run(none, [waits, { ...waits, l: { fields: [],
    tails: ['m1', 'm0'] }, r: { fields: ['y', 'x'], tails: [] } }]);
  assert.deepEqual(idsOf(twice), first);
});
