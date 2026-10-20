// Checks every executable example fixture, test/fixtures/r005b/*.json
// (docs/plans/2026-10-17-open-row-merge-plan.md, "Executable example
// fixtures"), against the oracle and the prototype, on the fixture's
// labels-only projection `rows`, in the orders it names:
//   Solved        => solutions exist; the prototype accepts in every order;
//                    its default solution satisfies every constraint and
//                    is the least solution.
//   Contradiction => no solution; the prototype refuses in every order.
//   Unresolved    => the prototype ends with an equation waiting (D4) in
//                    every order. No claim about the number of solutions,
//                    except that a fixture with `solutions` asserts its
//                    count; the fixtures with asserted counts must cover
//                    zero, one and several solutions (odd-cycle 0,
//                    determinate 1, diag-01 4), so all three cases of
//                    Unresolved stay covered.
// Also checks each fixture's shape: fields, stages and that every
// location `{ text, nth }` exists in the source. Exits 1 on any failure.
// Usage: node fixtures.mjs [directory] (default ../../test/fixtures/r005b)
import { readdirSync, readFileSync } from 'node:fs';
import { verdict } from './drive.mjs';
import { allSolutions, leastOf, sat, isMeta } from './oracle.mjs';
import * as S from './solver.mjs';
import { mulberry, sampleWith } from './random.mjs';

const dir = process.argv[2]
  ?? new URL('../../test/fixtures/r005b/', import.meta.url).pathname;
const RESULTS = ['Solved', 'Contradiction', 'Unresolved'];
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const ordersOf = (steps, orders) => {
  if (orders === 'given') return [steps];
  if (orders === 'all' && steps.length <= 7) return perms(steps);
  if (!Number.isInteger(orders)) throw new Error(`orders ${orders}`);
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
const occurs = (source, { text, nth }) => {
  let i = -1;
  for (let n = 0; n <= nth; n++) {
    i = source.indexOf(text, i + 1);
    if (i < 0) return false;
  }
  return true;
};

// Shape problems of one fixture, as messages.
function shape(f, file) {
  const out = [];
  const need = (ok, what) => { if (!ok) out.push(what); };
  need(`${f.name}.json` === file, 'name differs from the file name');
  need(RESULTS.includes(f.result), `result ${f.result}`);
  need(typeof f.source === 'string' && f.source.length > 0, 'source');
  need((f.result === 'Solved') === (f.diagnostic === null),
    'a diagnostic exactly when not Solved');
  need(f.output === null || f.result === 'Solved', 'output only if Solved');
  need(f.solutions === undefined || f.result === 'Unresolved',
    'solutions only if Unresolved');
  const d = f.diagnostic, st = f.stages ?? {};
  for (const x of [d, f.before].filter(Boolean)) {
    need(x.code && x.message && x.at && Array.isArray(x.notes),
      'diagnostic fields');
    [x.at, ...x.notes.map(n => n.at)].forEach(a =>
      need(a && occurs(f.source, a), `location ${JSON.stringify(a)}`));
  }
  need(Number.isInteger(st.check), 'stages.check');
  need((st.text === null) === (d === null), 'stages.text iff diagnostic');
  need((st.run === null) === (f.output === null), 'stages.run iff output');
  need((st.solver === null) === (f.rows === null), 'stages.solver iff rows');
  need(st.text === null || st.text >= st.check, 'text before check');
  need(st.run === null || st.run >= st.check, 'run before check');
  return out;
}

// The superseded design's class of the fixtures the adopted design
// reclassified (R005 Tranche B B4, plan §4.5, decision 2): this
// directory is that design's archive, so its claim is checked against
// the class it gave; test/fixtures keeps the adopted one.
const SUPERSEDED = { 'design-forced-bound': 'Solved', 'design-quiet': 'Solved',
  'diag-14-fix': 'Solved', same: 'Contradiction' };

// The claim of one fixture's rows, as messages.
function claim(fixture) {
  const f = { ...fixture, result: SUPERSEDED[fixture.name] ?? fixture.result };
  const { hyp, steps, orders } = f.rows;
  const metas = metasOf(steps), universe = atomsOf(steps);
  const sols = allSolutions(metas, universe, hyp, steps);
  const least = leastOf(metas, hyp, steps, sols);
  const out = [];
  const seen = new Set();
  for (const order of ordersOf(steps, orders)) {
    const v = verdict(hyp, order);
    seen.add(v.v);
    if (f.result === 'Solved' && v.v === 'accept') {
      const got = S.solution(v.st, metas);
      if (!steps.every(c => sat(hyp, got, c))) out.push('not a solution');
      if (!least || metas.some(m => got[m].join()
        !== [...least[m]].sort().join())) out.push('not the least');
    }
  }
  const want = { Solved: 'accept', Contradiction: 'refuse',
    Unresolved: 'D4' }[f.result];
  if (seen.size !== 1 || !seen.has(want)) {
    out.push(`prototype ${[...seen].join('/')}, expected ${want}`);
  }
  if (f.result === 'Solved' && !sols.length) out.push('no solution');
  if (f.result === 'Contradiction' && sols.length) {
    out.push(`${sols.length} solutions`);
  }
  if (f.solutions !== undefined && sols.length !== f.solutions) {
    out.push(`${sols.length} solutions, asserted ${f.solutions}`);
  }
  return { out, count: sols.length, runs: ordersOf(steps, orders).length,
    verdicts: [...seen].join('/') };
}

let failed = 0;
const counted = [];
const files = readdirSync(dir).filter(n => n.endsWith('.json')).sort();
for (const file of files) {
  const f = JSON.parse(readFileSync(dir + '/' + file, 'utf8'));
  const problems = shape(f, file);
  let info = 'no rows';
  if (f.rows) {
    const c = claim(f);
    problems.push(...c.out);
    info = `${c.verdicts} in ${c.runs} orders, ${c.count} solutions`;
    if (f.solutions !== undefined && !c.out.length) {
      counted.push(f.solutions);
      info += ` (asserted ${f.solutions})`;
    }
  }
  if (problems.length) failed++;
  console.log(`${f.name}: ${f.result}; ${info}`
    + `${problems.length ? ` FAIL: ${problems.join('; ')}` : ''}`);
}
const buckets = { zero: counted.includes(0), one: counted.includes(1),
  several: counted.some(n => n >= 2) };
const missing = Object.keys(buckets).filter(k => !buckets[k]);
if (missing.length) {
  failed++;
  console.log(`FAIL: no Unresolved fixture asserts ${missing.join(', ')}`
    + ' solutions');
}
console.log(`${files.length} fixtures, ${failed} failing`);
process.exit(failed ? 1 : 0);
