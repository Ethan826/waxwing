// Random and program-shaped problems through the current design's
// prototype (C), alternative A and AH (../row-merge-alternatives), and
// the qualified-types prototype QT with its two flagged options (QT-H:
// the no-home check; QT-HC: also the one-home commit), judged by the
// independent brute-force oracle (../open-row-merge/oracle.mjs):
// S (accept => a solution), L (accept => the least solution), H (refuse
// => no solution); order differences; transitions from C's verdict
// (`accept>D4`: C accepts, the variant needs an annotation).
// Usage: node qt-compare.mjs raw|dense <seed> <problems>
//        node qt-compare.mjs shaped <seed> <problems>   (SHARE=1 too)
//        node qt-compare.mjs f2
import { verdict, row, tail } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf, sat } from '../open-row-merge/oracle.mjs';
import { mulberry } from '../open-row-merge/random.mjs';
import { shapedProblem, LABELS } from '../open-row-merge/programs-gen.mjs';
import * as S from '../open-row-merge/solver.mjs';
import { verdictA } from '../row-merge-alternatives/alt-drive.mjs';
import * as A from '../row-merge-alternatives/alt-solver.mjs';
import { generator, metasOf } from '../row-merge-alternatives/gen.mjs';
import { verdictQT, solutionQT } from './qt-drive.mjs';

const qt = opts => [o => verdictQT(o.hyp, o.cs, opts), solutionQT];
export const VARIANTS = {
  A: [o => verdictA(o.hyp, o.cs), A.solution],
  AH: [o => verdictA(o.hyp, o.cs, { commit: true }), A.solution],
  QT: [o => verdictQT(o.hyp, o.cs), solutionQT],
  'QT-E': qt({ empty: true }),
  QS: qt({ mode: 'sym' }),
  'QS-E': qt({ mode: 'sym', empty: true }),
  'QS-EH': qt({ mode: 'sym', empty: true, home: true }),
  'QS-EHC': qt({ mode: 'sym', empty: true, home: true, commit: true }),
};
const tallies = { C: {} };
for (const k of Object.keys(VARIANTS)) tallies[k] = {};
const bump = (t, k) => { t[k] = (t[k] || 0) + 1; };
const same = (got, lst, ms) => ms.every(m =>
  [...got[m]].sort().join() === [...lst[m]].sort().join());

function judge(t, p, sols, lst, v, sol) {
  bump(t, v.v);
  if (v.v === 'accept') {
    const got = sol(v.st, p.metas);
    if (!p.cs.every(c => sat(p.hyp, got, c))) bump(t, 'S-violated');
    if (!lst || !same(got, lst, p.metas)) bump(t, 'L-violated');
  }
  if (v.v === 'refuse' && sols.length) bump(t, 'H-violated');
  if (v.v === 'D4') {
    bump(t, sols.length > 1 ? 'D4:many' : `D4:${sols.length}sol`);
    if (lst) bump(t, 'D4:withLeast');
  }
}

// One problem { metas, hyp, cs, universe } in the given orders.
export function one(p, orders) {
  const sols = allSolutions(p.metas, p.universe, p.hyp, p.cs);
  const lst = leastOf(p.metas, p.hyp, p.cs, sols);
  const seen = Object.fromEntries(Object.keys(tallies)
    .map(k => [k, new Set()]));
  for (const cs of orders) {
    const o = { hyp: p.hyp, cs };
    const cur = verdict(p.hyp, cs);
    judge(tallies.C, p, sols, lst, cur, S.solution);
    seen.C.add(cur.v);
    for (const [k, [run, sol]] of Object.entries(VARIANTS)) {
      const v = run(o);
      judge(tallies[k], p, sols, lst, v, sol);
      seen[k].add(v.v);
      if (v.v !== cur.v) bump(tallies[k], `${cur.v}>${v.v}`);
    }
  }
  for (const k of Object.keys(seen)) {
    if (seen[k].size > 1) bump(tallies[k], 'orderDiff');
  }
}

const random = (seed, n, dense) => {
  const { gen, perms } = generator(seed, dense);
  for (let i = 0; i < n; i++) {
    const q = gen();
    one({ ...q, metas: metasOf(q.cs) }, perms(q.cs));
  }
};

const shaped = (seed, n) => {
  const rand = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const q = shapedProblem(rand);
    const hyp = { lacks: q.hyp.lacks,
      apart: q.hyp.apart.map(k => k.split('|')) };
    const p = { metas: q.metas, hyp, cs: q.constraints,
      universe: [...LABELS, ...q.rigids] };
    one(p, [p.cs, [...p.cs].reverse()]);
  }
};

// Review F2's 392 `k(merge, ..., merge)` programs (shared parameter).
const f2 = () => {
  const rs = [...Array(8).keys()].slice(1)
    .map(m => LABELS.filter((_, i) => m & (1 << i)));
  const combos = [...rs.flatMap(a => rs.map(b => [a, b])),
    ...rs.flatMap(a => rs.flatMap(b => rs.map(c => [a, b, c])))];
  for (const R of combos) {
    const cs = [];
    R.forEach((Ri, i) => {
      const r = `m${2 * i}`, s = `m${2 * i + 1}`;
      cs.push({ k: 'dis', l: tail(r), r: tail(s) });
      if (i > 0) cs.push({ k: 'eq', l: tail('m0'), r: tail(r) });
      cs.push({ k: 'eq', l: row([], [r, s]), r: row(Ri) });
    });
    const metas = R.flatMap((_, i) => [`m${2 * i}`, `m${2 * i + 1}`]);
    one({ metas, hyp: { lacks: {}, apart: [] }, cs, universe: LABELS },
      [cs]);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode, seed, n] = process.argv.slice(2);
  const start = Date.now();
  if (mode === 'f2') f2();
  else if (mode === 'shaped') shaped(Number(seed ?? 1), Number(n ?? 2000));
  else random(Number(seed ?? 21), Number(n ?? 2000), mode === 'dense');
  console.log(JSON.stringify({ args: process.argv.slice(2),
    share: !!process.env.SHARE, ms: Date.now() - start }));
  for (const [k, t] of Object.entries(tallies)) {
    console.log(k, JSON.stringify(t));
  }
}
