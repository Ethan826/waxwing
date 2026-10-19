// Ledger L1's checks (docs/plans/2026-10-19-row-merge-rules.md §5): the
// termination trace of qt-termination.mjs on the research families, on
// named examples whose predicates reach a cycle, and on a cyclic family
// that unifies merge results with parts of merges (itself or another).
// The oracle judges the cyclic runs (S: accept => a solution; H: refuse
// => none). A run past PASS_CAP passes of one rescan is reported as not
// terminating. Exit 1 on any lineage, productivity, S, H or cap failure.
// Usage: node qt-cyclic.mjs [families|cyclic|examples|all]
import { allSolutions, isMeta } from '../open-row-merge/oracle.mjs';
import { mulberry, sampleWith } from '../open-row-merge/random.mjs';
import { families, labelCount, runOne, tally } from './qt-termination.mjs';

const LAB = ['a', 'b', 'c'];
const row = (fields, tails) => ({ fields, tails });
const none = { lacks: {}, apart: [] };

// Named: each reaches a predicate above itself or a two-cycle.
export const EXAMPLES = [
  // Merge(m0, m1, t) and t = m0 with m1 holding a: m0 = m0 ⊎ {a, ..}.
  ['self-loop with a label', none, [
    { k: 'eq', l: row([], ['m0', 'm1']), r: row([], ['m2']) },
    { k: 'eq', l: row([], ['m2']), r: row([], ['m0']) },
    { k: 'eq', l: row([], ['m1']), r: row(['a'], ['m3']) }], 'refuse'],
  // The same with no label: m1 = {} is the only solution; QT waits.
  ['self-loop, no label', none, [
    { k: 'eq', l: row([], ['m0', 'm1']), r: row([], ['m2']) },
    { k: 'eq', l: row([], ['m2']), r: row([], ['m0']) }], 'D4'],
  // A label in a part whose tail is the predicate's own result.
  ['own result in a part', none, [
    { k: 'eq', l: row([], ['m0', 'm1']), r: row([], ['m2']) },
    { k: 'eq', l: row([], ['m0']), r: row(['a'], ['m2']) }], 'refuse'],
  // Two predicates, each result in the other's part; solutions exist
  // (m1 ⊎ m4 = {a, b}), so QT waits.
  ['two-cycle', none, [
    { k: 'eq', l: row([], ['m0', 'm1']), r: row([], ['m2']) },
    { k: 'eq', l: row([], ['m3', 'm4']), r: row([], ['m5']) },
    { k: 'eq', l: row([], ['m2']), r: row(['a'], ['m3']) },
    { k: 'eq', l: row([], ['m5']), r: row(['b'], ['m0']) }], 'D4'],
];

// Merges whose results are then unified with parts of merges.
const cyclicFamily = (t, judge, seed, n) => {
  const rnd = mulberry(seed);
  const sample = sampleWith(rnd);
  const pick = xs => xs[Math.floor(rnd() * xs.length)];
  for (let i = 0; i < n; i++) {
    const merges = 1 + Math.floor(rnd() * 2);
    const parts = [], results = [], cs = [];
    for (let k = 0; k < merges; k++) {
      const [a, b, r] = [`m${3 * k}`, `m${3 * k + 1}`, `m${3 * k + 2}`];
      parts.push(a, b);
      results.push(r);
      cs.push({ k: 'eq', l: row(sample(LAB, Math.floor(rnd() * 2)), [a, b]),
        r: row(sample(LAB, Math.floor(rnd() * 2)), [r]) });
    }
    for (let k = 0; k < 1 + Math.floor(rnd() * 2); k++) {
      cs.push({ k: 'eq', l: row(sample(LAB, Math.floor(rnd() * 2)),
        [pick(results)]), r: row(sample(LAB, Math.floor(rnd() * 2)),
        [pick(parts)]) });
    }
    if (rnd() < 0.4) cs.push({ k: 'lacks', v: pick(parts), l: pick(LAB) });
    const orders = [cs, [...cs].reverse(), sample(cs, cs.length)];
    for (const o of orders) judge(t, none, o);
  }
};

const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();

// One run, judged by the oracle.
const judged = (t, hyp, cs) => {
  const v = runOne(t, hyp, cs, LAB.length);
  if (v === 'D4') return v;
  const sols = allSolutions(metasOf(cs), LAB, hyp, cs);
  if (v === 'refuse' && sols.length) t.soundness = (t.soundness ?? 0) + 1;
  if (v === 'accept' && !sols.length) t.soundness = (t.soundness ?? 0) + 1;
  return v;
};

const failed = t => t.lineageViolations + t.unproductive + t.traceChanged
  + (t.soundness ?? 0) + (t.capped ?? 0);
const report = (name, t) => {
  const { examples, ...counts } = t;
  console.log(JSON.stringify({ family: name, ...counts }));
  if (examples.length) console.log(JSON.stringify(examples));
  return failed(t);
};

const mode = process.argv[2] ?? 'all';
let bad = 0;
if (mode === 'examples' || mode === 'all') {
  const t = tally();
  for (const [name, hyp, cs, want] of EXAMPLES) {
    const got = judged(t, hyp, cs);
    const count = allSolutions(metasOf(cs), LAB, hyp, cs).length;
    console.log(`${name}: ${got} (expected ${want}), ${count} solutions`);
    if (got !== want) bad++;
  }
  bad += report('examples', t);
  if (t.cyclicRuns < EXAMPLES.length) bad++;
}
if (mode === 'cyclic' || mode === 'all') {
  const t = tally();
  cyclicFamily(t, judged, 31, 20000);
  bad += report('cyclic (seed 31, 20,000 problems)', t);
}
if (mode === 'families' || mode === 'all') {
  for (const [name, run] of Object.entries(families)) {
    const t = tally();
    run(t);
    bad += report(name, t);
  }
}
console.log(bad ? `FAILED: ${bad}` : 'no violation');
process.exit(bad ? 1 : 0);
export { labelCount };
