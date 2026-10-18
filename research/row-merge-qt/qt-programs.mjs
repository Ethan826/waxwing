// The 19 representative programs of the alternatives assessment
// (docs/plans/2026-10-18-row-merge-alternatives.md, section 4), by the
// fixtures that hold their labels-only rows. Program 7 has no equation
// (Task 3's facts only, regression row r005b-wrapper-pairs); program 16
// has no fixture and is written here; program 19's rows are program 1's.
import { readFileSync, existsSync } from 'node:fs';

const t = v => ({ fields: [], tails: [v] });
const merged = (a, b) => ({ fields: [], tails: [a, b] });
const lab = ls => ({ fields: ls, tails: [] });

// same(f: (p, q) -> { x: Int }, g: (p, q) -> { y: Int }) = same(merge,
// merge): both uses share both parameters, so r ⊎ s is { x } and { y }.
const SAME = { name: 'same (new)', hyp: { lacks: {}, apart: [] },
  orders: 'all', steps: [
    { k: 'dis', l: t('m0'), r: t('m1') },
    { k: 'eq', l: merged('m0', 'm1'), r: lab(['x']) },
    { k: 'dis', l: t('m2'), r: t('m3') },
    { k: 'eq', l: merged('m2', 'm3'), r: lab(['y']) },
    { k: 'eq', l: t('m0'), r: t('m2') },
    { k: 'eq', l: t('m1'), r: t('m3') },
  ] };

// A replacement for the Unresolved bucket with no solution, since
// odd-cycle becomes a contradiction here (section 4.4 of the design):
// m0 ⊎ m3 = { c } ⊎ m2 and m2 ⊎ m3 = { a } ⊎ m0 (found in dense seed
// 21, problem 1955). Counting atoms forces |m3| = 1, and each choice of
// m3's atom then breaks one equation, so no solution exists.
const ZERO = { name: 'zero (new)', hyp: { lacks: {}, apart: [] },
  orders: 'all', steps: [
    { k: 'eq', l: merged('m0', 'm3'), r: { fields: ['c'], tails: ['m2'] } },
    { k: 'eq', l: merged('m2', 'm3'), r: { fields: ['a'], tails: ['m0'] } },
  ] };

export const PROGRAMS = [
  [1, ['design-composition']],
  [2, ['diag-15']],
  [3, ['design-generic-three', 'design-generic-three-d3']],
  [4, ['design-mixed', 'design-mixed-fixed']],
  [5, ['design-both-annotated']],
  [6, ['diag-07']],
  [7, []],
  [8, ['diag-11', 'design-defer']],
  [9, ['diag-01', 'diag-01-fix']],
  [10, ['design-partial', 'diag-08']],
  [11, ['design-forced-bound']],
  [12, ['diag-14-fix']],
  [13, ['design-quiet']],
  [14, ['design-removal-left', 'design-removal-right',
    'design-removal-wait', 'design-removal-rest-field']],
  [15, ['diag-13', 'diag-17', 'diag-19']],
  [16, [SAME]],
  [17, ['design-holes', 'diag-18']],
  [18, ['determinate', 'odd-cycle']],
  [19, ['design-composition']],
  ['U0', [ZERO]],
  ['U1', ['determinate']],
  ['U4', ['diag-01']],
];

const load = (dir, x) => {
  if (typeof x !== 'string') return x;
  const path = `${dir}${x}.json`;
  if (!existsSync(path)) return null;
  const f = JSON.parse(readFileSync(path, 'utf8'));
  return f.rows ? { name: f.name, ...f.rows } : null;
};

export function programs(dir, classify) {
  for (const [n, names] of PROGRAMS) {
    if (!names.length) console.log(`#${n}: no rows (facts only)`);
    for (const x of names) {
      const p = load(dir, x);
      if (!p) {
        console.log(`#${n} ${x}: no rows`);
        continue;
      }
      const { text, sols } = classify(p.hyp, p.steps, p.orders);
      console.log(`#${n} ${p.name}: ${Object.entries(text)
        .map(([k, v]) => `${k} ${v}`).join('; ')}; ${sols} solutions`);
    }
  }
}
