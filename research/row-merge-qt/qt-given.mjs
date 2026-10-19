// Case 1g of the adopted configuration on the six programs of
// research/purs-given-1g (implementation plan Task B0): a `Merge` whose
// parts hold no unknown, only fields and rigid tails, is solved by
// writing its result as the row of both parts (`r ⊎ s`). Each program is
// written as the labels-only rows a Waxwing body would make: rigids R, S
// and U are the signature's variables, `hyp` its facts (a `disjoint`
// clause or an implying row gives `apart`; `lacks` a lacks clause); m0,
// m1 are one merge's parts, m2 its result. Prints one line each; exit 1
// if a verdict or result differs from the one recorded.
// Usage: node qt-given.mjs
import { verdictQT, solutionQT } from './qt-drive.mjs';
import { ADOPTED } from './qt-trace.mjs';

const t = (...ts) => ({ fields: [], tails: ts });
const f = (fs, ...ts) => ({ fields: fs, tails: ts });
const merge = (a, b, r) => [{ k: 'dis', l: t(a), r: t(b) },
  { k: 'eq', l: t(a, b), r: t(r) }];
const APART = { lacks: {}, apart: [['R', 'S'], ['R', 'U'], ['S', 'U']] };

const CASES = [
  ['given-same-order', APART, [...merge('m0', 'm1', 'm2'),
    { k: 'eq', l: t('m0'), r: t('R') }, { k: 'eq', l: t('m1'), r: t('S') }],
  'accept', { m2: ['R', 'S'] }],
  ['given-swapped', APART, [...merge('m0', 'm1', 'm2'),
    { k: 'eq', l: t('m0'), r: t('S') }, { k: 'eq', l: t('m1'), r: t('R') }],
  'accept', { m2: ['R', 'S'] }],
  ['no-given, with the clause', APART, [...merge('m0', 'm1', 'm2'),
    { k: 'eq', l: t('m0'), r: t('R') }, { k: 'eq', l: t('m1'), r: t('S') }],
  'accept', { m2: ['R', 'S'] }],
  ['no-given, without it', { lacks: {}, apart: [] }, [...merge('m0', 'm1',
    'm2'), { k: 'eq', l: t('m0'), r: t('R') },
  { k: 'eq', l: t('m1'), r: t('S') }], 'refuse', null],
  ['label-then-given', { lacks: { R: ['a'], S: ['a'] }, apart: [['R', 'S']] },
    [...merge('m0', 'm1', 'm2'), { k: 'eq', l: t('m0'), r: f(['a'], 'R') },
      { k: 'eq', l: t('m1'), r: t('S') }], 'accept', { m2: ['R', 'S', 'a'] }],
  ['assoc-given', APART, [...merge('m0', 'm1', 'm2'),
    ...merge('m2', 'm3', 'm4'), { k: 'eq', l: t('m0'), r: t('R') },
    { k: 'eq', l: t('m1'), r: t('S') }, { k: 'eq', l: t('m3'), r: t('U') }],
  'accept', { m4: ['R', 'S', 'U'] }],
  ['assoc-other', APART, [...merge('m1', 'm3', 'm2'),
    ...merge('m0', 'm2', 'm4'), { k: 'eq', l: t('m0'), r: t('R') },
    { k: 'eq', l: t('m1'), r: t('S') }, { k: 'eq', l: t('m3'), r: t('U') }],
  'accept', { m4: ['R', 'S', 'U'] }],
];

const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
let failed = 0;
for (const [name, hyp, steps, want, sol] of CASES) {
  const ms = sol ? Object.keys(sol) : [];
  const seen = new Set(perms(steps).slice(0, 5040).map(o => {
    const v = verdictQT(hyp, o, ADOPTED);
    return v.v === 'accept' ? JSON.stringify(solutionQT(v.st, ms)) : v.v;
  }));
  const expected = sol ? JSON.stringify(sol) : want;
  const ok = seen.size === 1 && seen.has(expected);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${[...seen].join(' | ')}`);
}
process.exitCode = failed ? 1 : 0;
