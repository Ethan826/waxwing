import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isMeta } from './row-merge-oracle.mjs';
import { run, stateOf } from './row-merge-entry.mjs';
import { emitted } from './row-merge-readback.mjs';
import { allOrders, fiveOrders, mulberry, permProblem, shapedProblem }
  from './row-merge-gen.mjs';
import { everyOrder, problems } from './row-merge-domains.mjs';

// R005 Tranche B B3, plan §4.1. Sym (approved 2026-10-19) makes a merge
// symmetric: swapping its parts changes nothing. The compiler keeps a
// row's tails sorted by meta number and folds them from the left (§2.1),
// so swapping the parts of every merge is renaming the metas so that
// their order reverses (`mirrored`). Each problem and its mirror must
// give the same verdict in every order and, when accepted, the same
// solution under the renaming (the prototype measured `mirrorDiff` 0).
// Association: a row of three unknown tails folds in the tails' order, so
// every renaming of the metas regroups it; one outcome over all of them.

const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))]
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

// The problem with its metas renamed by `rename` (a map), steps in order.
const renamed = (cs, rename) => {
  const name = t => rename.get(t) ?? t;
  const row = r => ({ fields: r.fields, tails: r.tails.map(name) });
  return cs.map(c => (c.k === 'lacks' ? { ...c, v: name(c.v) }
    : { ...c, l: row(c.l), r: row(c.r) }));
};
const reversal = cs => {
  const metas = metasOf(cs);
  return new Map(metas.map((m, i) => [m, metas[metas.length - 1 - i]]));
};

// The run's verdict and, when accepted, each original meta's value.
const outcome = (hyp, cs, rename) => {
  const found = run(hyp, renamed(cs, rename));
  if (found.v !== 'accept') return found.v;
  const metas = metasOf(cs);
  const values = emitted(stateOf(found.subst), metas.map(m => rename.get(m)
    ?? m));
  return JSON.stringify(metas.map(m => values[rename.get(m) ?? m]));
};

const mirrorDiffs = (hyp, orders) => orders.filter(order =>
  outcome(hyp, order, new Map()) !== outcome(hyp, order, reversal(order)))
  .length;

const fixtures = readdirSync('test/fixtures/r005b').sort()
  .map(name => JSON.parse(readFileSync(`test/fixtures/r005b/${name}`, 'utf8')))
  .filter(f => f.rows);
const ordersOf = rows => (rows.orders === 'all' ? allOrders(rows.steps)
  : [rows.steps]);

test('swapped inputs: every fixture, every order, one outcome', () => {
  let runs = 0;
  for (const f of fixtures) {
    const orders = ordersOf(f.rows);
    runs += orders.length;
    assert.equal(mirrorDiffs(f.rows.hyp, orders), 0, f.name);
  }
  assert.ok(runs > 10000);
});

// One problem in DOMAIN_STRIDE in verify; the whole domain (453,550 runs)
// was compared on 2026-10-19 with stride 1, 0 differences (docs/progress.md
// "R005 Tranche B B3").
const DOMAIN_STRIDE = 5;

test('swapped inputs: domain B sampled, every order, one outcome', t => {
  let runs = 0, diffs = 0;
  for (const p of problems('B', { stride: DOMAIN_STRIDE })) {
    const orders = everyOrder(p.cs);
    runs += orders.length;
    diffs += mirrorDiffs(p.hyp, orders);
  }
  t.diagnostic(`${runs} runs`);
  assert.equal(diffs, 0);
});

test('swapped inputs: generated problems, five orders, one outcome', () => {
  for (const [generate, seed] of [[r => permProblem(r, false), 21],
    [r => permProblem(r, true), 22], [r => shapedProblem(r, false), 24]]) {
    const rnd = mulberry(seed);
    for (let i = 0; i < 400; i++) {
      const p = generate(rnd);
      assert.equal(mirrorDiffs(p.hyp, fiveOrders(rnd, p.cs)), 0,
        JSON.stringify(p.cs));
    }
  }
});

// Every bijection of a list onto itself.
const permutations = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));

const threeUnknown = f => f.rows.steps.some(c => c.k !== 'lacks'
  && [c.l, c.r].some(r => r.tails.filter(isMeta).length >= 3));

test('association: rows of three unknown tails, every grouping and order',
  t => {
    const chosen = fixtures.filter(threeUnknown);
    t.diagnostic(chosen.map(f => f.name).join(', '));
    assert.ok(chosen.length >= 10);
    for (const f of chosen) {
      const metas = metasOf(f.rows.steps);
      const seen = new Set();
      for (const image of permutations(metas)) {
        const rename = new Map(metas.map((m, i) => [m, image[i]]));
        for (const order of ordersOf(f.rows)) {
          seen.add(outcome(f.rows.hyp, order, rename));
        }
      }
      assert.equal(seen.size, 1, `${f.name}: ${[...seen]}`);
    }
  });
