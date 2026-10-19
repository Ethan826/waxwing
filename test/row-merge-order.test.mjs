import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isMeta } from './row-merge-oracle.mjs';
import { allOrders } from './row-merge-gen.mjs';
import { defects, judge, newTally } from './row-merge-judge.mjs';

// R005 Tranche B B3, plan §4.3: the research problems that were order
// dependent under an earlier configuration (research/row-merge-qt/
// fixtures/order-*.json) and those QT was order dependent on beside the
// installed purs (research/purs-row-experiment/cases), every permutation
// of their steps, judged in full (test/row-merge-judge.mjs): one verdict
// kind, acceptance and read-back solution per problem, the oracle, and
// the prototype's QT-strict+Sym as the second reference. Each problem's
// verdicts are recorded; B4 adds H's.

const read = directory => readdirSync(directory)
  .filter(f => f.endsWith('.json')).sort()
  .map(f => JSON.parse(readFileSync(`${directory}/${f}`, 'utf8')));
const problemsOf = directory => read(directory).map(found => ({
  name: found.name,
  p: { hyp: { lacks: found.hyp.lacks ?? {}, apart: found.hyp.apart ?? [] },
    cs: found.steps, universe: atomsOf(found) },
  orders: ordersOf(found),
}));

// Every permutation up to seven steps (5,040); beyond, the orders the
// problem records (plan §4.3).
const MAX_PERMUTED = 7;
const ordersOf = found => (found.steps.length <= MAX_PERMUTED
  ? allOrders(found.steps)
  : found.orders.map(order => order.map(index => found.steps[index])));
const atomsOf = found => [...new Set([
  ...found.steps.flatMap(c => (c.k === 'lacks' ? [c.l]
    : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails])),
  ...Object.keys(found.hyp.lacks ?? {})])].filter(a => !isMeta(a)).sort();

for (const directory of ['research/row-merge-qt/fixtures',
  'research/purs-row-experiment/cases']) {
  test(`every order of ${directory}: one outcome, oracle and reference`,
    t => {
      const tally = newTally();
      const verdicts = {};
      for (const { name, p, orders } of problemsOf(directory)) {
        const before = { ...tally };
        judge(p, orders, tally, { state: true });
        verdicts[name] = ['accept', 'refuse', 'skipped']
          .filter(v => tally[v] > before[v]).join('/');
      }
      t.diagnostic(JSON.stringify(verdicts));
      assert.deepEqual(defects(tally), []);
      assert.ok(tally.problems >= 5);
    });
}
