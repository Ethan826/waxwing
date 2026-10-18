// Every executable example fixture (test/fixtures/r005b/*.json) with a
// labels-only projection `rows`, in the orders it names, through the
// current design's prototype, alternative A, A0 and AH. One line each:
// the fixture's class, the verdicts seen (several when the order
// matters), the oracle's solution count; then the transitions. Exit 0;
// this records, it does not assert (fixtures.mjs asserts the current
// design).
// Usage: node fixtures-compare.mjs [directory]
import { readdirSync, readFileSync } from 'node:fs';
import { verdict } from '../open-row-merge/drive.mjs';
import { allSolutions, isMeta } from '../open-row-merge/oracle.mjs';
import { mulberry, sampleWith } from '../open-row-merge/random.mjs';
import { verdictA } from './alt-drive.mjs';

const dir = process.argv[2]
  ?? new URL('../../test/fixtures/r005b/', import.meta.url).pathname;
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const ordersOf = (steps, orders) => {
  if (orders === 'given') return [steps];
  if (orders === 'all' && steps.length <= 7) return perms(steps);
  const sample = sampleWith(mulberry(1));
  const out = [steps, [...steps].reverse()];
  while (out.length < orders) out.push(sample(steps, steps.length));
  return out;
};
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();
const atomsOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.l, c.v] : [...c.l.fields, ...c.r.fields, ...c.l.tails,
    ...c.r.tails])))].filter(a => !isMeta(a)).sort();
const NAME = { accept: 'Solved', refuse: 'Contradiction', D4: 'Unresolved' };
const seenWith = (run, orders) =>
  [...new Set(orders.map(o => NAME[run(o).v]))].sort().join('/');

const moves = {};
let n = 0;
for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))
  .sort()) {
  const f = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
  if (!f.rows) continue;
  n++;
  const { hyp, steps } = f.rows;
  const orders = ordersOf(steps, f.rows.orders);
  const sols = allSolutions(metasOf(steps), atomsOf(steps), hyp, steps);
  const cur = seenWith(o => verdict(hyp, o), orders);
  const a = seenWith(o => verdictA(hyp, o), orders);
  const a0 = seenWith(o => verdictA(hyp, o, { mode: 'eager' }), orders);
  const ah = seenWith(o => verdictA(hyp, o, { commit: true }), orders);
  console.log(`${f.name}: ${f.result}; current ${cur}; A ${a}; A0 ${a0};`
    + ` AH ${ah}; ${sols.length} solutions`);
  for (const [k, v] of [['A', a], ['A0', a0], ['AH', ah]]) {
    if (v !== cur) {
      const m = `${k} ${cur}>${v}`;
      moves[m] = [...(moves[m] ?? []), f.name];
    }
  }
}
console.log(`${n} fixtures with rows`);
for (const [m, names] of Object.entries(moves)) {
  console.log(`${m} (${names.length}): ${names.join(', ')}`);
}
