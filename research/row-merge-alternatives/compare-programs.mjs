// Program-shaped problems through the current design's prototype and
// alternative A (and A0), judged by the brute-force oracle:
//   shaped: research/open-row-merge/programs-gen.mjs's merge trees
//           (SHARE=1 lets a merge's r meet the first meta, as callbacks
//           sharing a parameter do), in the given order and reversed;
//   f2:     review F2's 392 `k(merge, ..., merge)` programs (shared.mjs),
//           callbacks sharing one parameter, each result a closed label
//           set: the `both(merge, merge)` family.
// Prints verdict counts, oracle violations, current>variant
// transitions and order differences as compare.mjs does.
// Usage: node compare-programs.mjs shaped <seed> <problems> | f2
import { verdict, row, tail } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf, sat } from '../open-row-merge/oracle.mjs';
import { mulberry } from '../open-row-merge/random.mjs';
import { shapedProblem, LABELS } from '../open-row-merge/programs-gen.mjs';
import * as S from '../open-row-merge/solver.mjs';
import { verdictA } from './alt-drive.mjs';
import * as A from './alt-solver.mjs';

const VARIANTS = { A: { mode: 'defer' }, A0: { mode: 'eager' },
  AH: { commit: true } };
const tallies = { current: {}, A: {}, A0: {}, AH: {} };
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
  if (v.v === 'D4' && lst) bump(t, 'D4:withLeast');
}

function one(p, orders) {
  const sols = allSolutions(p.metas, p.universe, p.hyp, p.cs);
  const lst = leastOf(p.metas, p.hyp, p.cs, sols);
  const seen = Object.fromEntries(Object.keys(tallies)
    .map(k => [k, new Set()]));
  for (const order of orders) {
    const cur = verdict(p.hyp, order);
    judge(tallies.current, p, sols, lst, cur, S.solution);
    seen.current.add(cur.v);
    for (const [k, opts] of Object.entries(VARIANTS)) {
      const v = verdictA(p.hyp, order, opts);
      judge(tallies[k], p, sols, lst, v, A.solution);
      seen[k].add(v.v);
      if (v.v !== cur.v) bump(tallies[k], `${cur.v}>${v.v}`);
    }
  }
  for (const k of Object.keys(seen)) {
    if (seen[k].size > 1) bump(tallies[k], 'orderDiff');
  }
}

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

const start = Date.now();
if (process.argv[2] === 'f2') f2();
else shaped(Number(process.argv[3] ?? 1), Number(process.argv[4] ?? 2000));
console.log(JSON.stringify({ args: process.argv.slice(2),
  share: !!process.env.SHARE, ms: Date.now() - start }));
for (const [k, t] of Object.entries(tallies)) {
  console.log(k, JSON.stringify(t));
}
