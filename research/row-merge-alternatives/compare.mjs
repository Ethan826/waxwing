// Random problems, five orders each, through the current design's
// prototype (research/open-row-merge) and alternative A in three
// variants, judged by the independent brute-force oracle.
// For each variant: S (accept => a solution), L (accept => the least
// solution), H (refuse => no solution), order differences (C2), and the
// verdict counts; and, run by run, the transitions from the current
// design's verdict to the variant's (`accept>D4` is a program the
// current design accepts and the variant leaves needing an annotation;
// `refuse>D4` a contradiction the variant reports as unresolved).
// Usage: node compare.mjs <seed> <problems> [dense]
import { verdict } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf, sat } from '../open-row-merge/oracle.mjs';
import * as S from '../open-row-merge/solver.mjs';
import { verdictA } from './alt-drive.mjs';
import * as A from './alt-solver.mjs';
import { generator, metasOf } from './gen.mjs';

const seed = Number(process.argv[2] ?? 21);
const count = Number(process.argv[3] ?? 2000);
const dense = process.argv[4] === 'dense';
const { gen, perms } = generator(seed, dense);
const VARIANTS = {
  A: { mode: 'defer' }, A0: { mode: 'eager' },
  'A-nohome': { mode: 'defer', noHome: false }, AH: { commit: true },
};
const tallies = { current: {} };
for (const k of Object.keys(VARIANTS)) tallies[k] = {};
const bump = (t, k) => { t[k] = (t[k] || 0) + 1; };
const same = (got, lst, ms) => ms.every(m =>
  [...got[m]].sort().join() === [...lst[m]].sort().join());

function judge(t, p, ms, sols, lst, v, sol) {
  bump(t, v.v);
  if (v.v === 'accept') {
    const got = sol(v.st, ms);
    if (!p.cs.every(c => sat(p.hyp, got, c))) bump(t, 'S-violated');
    if (!lst || !same(got, lst, ms)) bump(t, 'L-violated');
  }
  if (v.v === 'refuse' && sols.length) bump(t, 'H-violated');
  if (v.v === 'D4') {
    bump(t, sols.length === 0 ? 'D4:0sol' : sols.length === 1
      ? 'D4:1sol' : 'D4:many');
    if (lst) bump(t, 'D4:withLeast');
  }
}

const start = Date.now();
for (let i = 0; i < count; i++) {
  const p = gen();
  const ms = metasOf(p.cs);
  const sols = allSolutions(ms, p.universe, p.hyp, p.cs);
  const lst = leastOf(ms, p.hyp, p.cs, sols);
  const classes = { current: new Set() };
  for (const k of Object.keys(VARIANTS)) classes[k] = new Set();
  for (const order of perms(p.cs)) {
    const cur = verdict(p.hyp, order);
    judge(tallies.current, p, ms, sols, lst, cur, S.solution);
    classes.current.add(cur.v);
    for (const [k, opts] of Object.entries(VARIANTS)) {
      const v = verdictA(p.hyp, order, opts);
      judge(tallies[k], p, ms, sols, lst, v, A.solution);
      classes[k].add(v.v);
      if (v.v !== cur.v) bump(tallies[k], `${cur.v}>${v.v}`);
    }
  }
  for (const k of Object.keys(classes)) {
    if (classes[k].size > 1) bump(tallies[k], 'orderDiff');
  }
}
console.log(JSON.stringify({ seed, count, dense, runs: count * 5,
  ms: Date.now() - start }));
for (const [k, t] of Object.entries(tallies)) {
  console.log(k, JSON.stringify(t));
}
