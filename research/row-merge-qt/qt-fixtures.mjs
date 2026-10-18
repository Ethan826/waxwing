// The 72 executable fixtures (test/fixtures/r005b/*.json, labels-only
// `rows`) and the alternatives assessment's 19 representative programs
// (docs/plans/2026-10-18-row-merge-alternatives.md, section 4) through
// the current design's prototype (C), A, AH and the qualified-types
// variants of qt-compare.mjs, in the orders each fixture names. Each
// verdict is judged by the brute-force oracle: S, L, H as qt-compare.mjs;
// a violation is printed as `VIOLATION` and makes the exit code 1.
// Usage: node qt-fixtures.mjs fixtures | programs
import { readFileSync, readdirSync } from 'node:fs';
import { verdict } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf, sat, isMeta }
  from '../open-row-merge/oracle.mjs';
import { mulberry, sampleWith } from '../open-row-merge/random.mjs';
import { VARIANTS } from './qt-compare.mjs';

const dir = new URL('../../test/fixtures/r005b/', import.meta.url).pathname;
const NAME = { accept: 'S', refuse: 'C', D4: 'U' };
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const ordersOf = (steps, orders) => {
  if (orders === 'given' || !orders) return [steps];
  if (orders === 'all' && steps.length <= 7) return perms(steps);
  const sample = sampleWith(mulberry(1));
  const out = [steps, [...steps].reverse()];
  while (out.length < (Number(orders) || 2)) {
    out.push(sample(steps, steps.length));
  }
  return out;
};
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();
const atomsOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.l] : [...c.l.fields, ...c.r.fields, ...c.l.tails,
    ...c.r.tails])))].filter(a => !isMeta(a)).sort();
let violations = 0;

// Verdict classes seen over the orders, per variant, oracle-judged.
export function classify(hyp, steps, orders) {
  const ms = metasOf(steps);
  const sols = allSolutions(ms, atomsOf(steps), hyp, steps);
  const lst = leastOf(ms, hyp, steps, sols);
  const out = { C: new Set() };
  for (const k of Object.keys(VARIANTS)) out[k] = new Set();
  for (const o of ordersOf(steps, orders)) {
    out.C.add(NAME[verdict(hyp, o).v]);
    for (const [k, [run, sol]] of Object.entries(VARIANTS)) {
      const v = run({ hyp, cs: o });
      out[k].add(NAME[v.v]);
      const got = v.v === 'accept' && sol(v.st, ms);
      const bad = (got && !steps.every(c => sat(hyp, got, c)))
        || (got && !(lst && ms.every(m => got[m].join()
          === [...lst[m]].sort().join())))
        || (v.v === 'refuse' && sols.length);
      if (bad) {
        violations++;
        console.log(`VIOLATION ${k} ${v.v}`);
      }
    }
  }
  const text = Object.fromEntries(Object.entries(out)
    .map(([k, s]) => [k, [...s].sort().join('/')]));
  return { text, sols: sols.length };
}

const fixtures = () => {
  const moves = {};
  let n = 0;
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))
    .sort()) {
    const f = JSON.parse(readFileSync(dir + file, 'utf8'));
    if (!f.rows) continue;
    n++;
    const { text, sols } = classify(f.rows.hyp, f.rows.steps,
      f.rows.orders);
    console.log(`${f.name}: ${f.result}; ${Object.entries(text)
      .map(([k, v]) => `${k} ${v}`).join('; ')}; ${sols} solutions`);
    for (const [k, v] of Object.entries(text)) {
      if (k !== 'C' && v !== text.C) {
        (moves[`${k} ${text.C}>${v}`] ??= []).push(f.name);
      }
    }
  }
  console.log(`${n} fixtures with rows`);
  for (const [m, names] of Object.entries(moves)) {
    console.log(`${m} (${names.length}): ${names.join(', ')}`);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv[2] === 'programs') {
    const { programs } = await import('./qt-programs.mjs');
    programs(dir, classify);
  } else fixtures();
  console.log(`violations ${violations}`);
  process.exitCode = violations ? 1 : 0;
}
