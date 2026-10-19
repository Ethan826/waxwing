// QT-strict and its two adaptations (design section 14), measured
// separately and combined, beside QS-EHZ and the current design (C):
//   Sym  PureScript's cases also on the parts swapped (option `sym`);
//   H    an Unresolved body whose waiting predicate has a constant no
//        unknown of the other side can hold is a Contradiction
//        (option `hEnd`; classification only).
// Per variant, judged by the brute-force oracle: verdicts, S, L, H
// violations; `acceptDiff` (acceptance or solution differs between
// orders); `kindDiff` (rejected in every order, Contradiction in some
// and Unresolved in others); `mirrorDiff` (the problem with every
// row's unknown tails in reverse order, so every merge's arguments
// swapped, differs in verdict or solution, first order); for +H
// variants `baseDiff` (acceptance or solution differs from the variant
// without H, any order), `H:new` (Contradiction where it is Unresolved)
// and `H:newWithSolution` (such a Contradiction with a solution).
// Usage: node qt-adapt.mjs raw|dense <seed> <n> | shaped <seed> <n> | f2
import { verdict, row, tail } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf, sat } from '../open-row-merge/oracle.mjs';
import { mulberry } from '../open-row-merge/random.mjs';
import { shapedProblem, LABELS } from '../open-row-merge/programs-gen.mjs';
import * as S from '../open-row-merge/solver.mjs';
import { generator, metasOf } from '../row-merge-alternatives/gen.mjs';
import { verdictQT, solutionQT } from './qt-drive.mjs';

export const STRICT = { qts: true, selfApart: false, pairwise: false };
export const ADAPT = {
  'QT-strict': STRICT,
  'QT-strict+Sym': { ...STRICT, sym: true },
  'QT-strict+H': { ...STRICT, hEnd: true },
  'QT-strict+Sym+H': { ...STRICT, sym: true, hEnd: true },
  'QS-EHZ': { mode: 'sym', empty: true, home: true, zero: true },
};
const BASE = { 'QT-strict+H': 'QT-strict',
  'QT-strict+Sym+H': 'QT-strict+Sym' };
const tallies = Object.fromEntries(['C', ...Object.keys(ADAPT)]
  .map(k => [k, {}]));
const bump = (t, k) => { t[k] = (t[k] || 0) + 1; };
const key = (v, ms) => (v.v === 'accept'
  ? `accept ${JSON.stringify(solutionQT(v.st, ms))}` : v.v);
export const mirror = cs => cs.map(c => (c.k === 'lacks' ? c
  : { ...c, l: flip(c.l), r: flip(c.r) }));
const flip = r => ({ fields: r.fields, tails: [...r.tails].reverse() });

function judge(t, p, sols, lst, v, got) {
  bump(t, v.v);
  if (got) {
    if (!p.cs.every(c => sat(p.hyp, got, c))) bump(t, 'S-violated');
    if (!lst || p.metas.some(m => got[m].join()
      !== [...lst[m]].sort().join())) bump(t, 'L-violated');
  }
  if (v.v === 'refuse' && sols.length) bump(t, 'H-violated');
}

// One problem { metas, hyp, cs, universe } in the given orders.
export function one(p, orders, out = tallies) {
  const sols = allSolutions(p.metas, p.universe, p.hyp, p.cs);
  const lst = leastOf(p.metas, p.hyp, p.cs, sols);
  const keys = {};
  for (const cs of orders) {
    const c = verdict(p.hyp, cs);
    judge(out.C, p, sols, lst, c, c.v === 'accept'
      ? S.solution(c.st, p.metas) : null);
    (keys.C ??= []).push(c.v === 'accept' ? 'accept' : c.v);
    for (const [k, opts] of Object.entries(ADAPT)) {
      const v = verdictQT(p.hyp, cs, opts);
      judge(out[k], p, sols, lst, v, v.v === 'accept'
        ? solutionQT(v.st, p.metas) : null);
      (keys[k] ??= []).push(key(v, p.metas));
    }
  }
  for (const [k, ks] of Object.entries(keys)) {
    const acc = new Set(ks.map(x => (x.startsWith('accept') ? x : 'no')));
    if (acc.size > 1) bump(out[k], 'acceptDiff');
    const rej = ks.filter(x => !x.startsWith('accept'));
    if (rej.length === ks.length && new Set(rej).size > 1) {
      bump(out[k], 'kindDiff');
    }
    if (BASE[k]) {
      const base = keys[BASE[k]];
      ks.forEach((x, i) => {
        const b = base[i];
        if ((x.startsWith('accept') || b.startsWith('accept')) && x !== b) {
          bump(out[k], 'baseDiff');
        }
        if (x === 'refuse' && b === 'D4') {
          bump(out[k], 'H:new');
          if (sols.length) bump(out[k], 'H:newWithSolution');
        }
      });
    }
    if (k !== 'C') {
      const m = verdictQT(p.hyp, mirror(orders[0]), ADAPT[k]);
      if (key(m, p.metas) !== ks[0]) bump(out[k], 'mirrorDiff');
    }
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
