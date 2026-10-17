// Random problems, each run in five constraint orders (the given one,
// reversed, three shuffles) through the solver and classified by the
// independent oracle. Checks S (accepted => a solution), H (refused =>
// unsatisfiable), L (accepted => the least solution), C2 (one verdict
// class for every order), C1 (no D4 with exactly one pending equation
// while a least solution exists) and C3 (every D4 with a least solution
// has two pending equations sharing a meta); counts D4 with a least
// solution, the measured incompleteness. The three result buckets
// (user review, 2026-10-17): Solved => the emitted solution satisfies
// every constraint (`solvedViolates`); Contradiction => no solution
// (`dishonest`); Unresolved => no claim, counted by its number of
// solutions (`unresolved0`, `unresolved1`, `unresolvedMany`).
// Usage: node perm.mjs <seed> <problems>
// Env: DENSE=1 (two-meta sums against labels), EXPAND=1 (build the basis
// for a quiet equation beside a stuck one), NOSUM=1 (no sum-rule facts).
import { verdict, row } from './drive.mjs';
import { allSolutions, leastOf, sat } from './oracle.mjs';
import * as S from './solver.mjs';
import { mulberry, sampleWith } from './random.mjs';

const rnd = mulberry(Number(process.argv[2] ?? 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const sample = sampleWith(rnd);
const LAB = ['a', 'b', 'c'], RIG = ['R', 'S'];
const META = ['m0', 'm1', 'm2', 'm3'];

function randRow(useRig) {
  const f = sample(LAB, Math.floor(rnd() * 3));
  const t = sample([...META, ...(useRig ? RIG : [])],
    Math.floor(rnd() * 3));
  return row(f, t);
}

const denseEquation = () => ({ k: 'eq', l: row([], sample(META, 2)),
  r: row(sample(LAB, 1 + Math.floor(rnd() * 2)),
    rnd() < 0.3 ? [pick(META)] : []) });

function gen() {
  const useRig = rnd() < 0.5;
  const hyp = { lacks: {}, apart: [] };
  if (useRig) {
    for (const r of RIG) hyp.lacks[r] = LAB.filter(() => rnd() < 0.6);
    if (rnd() < 0.6) hyp.apart.push(['R', 'S']);
  }
  const cs = [];
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const x = rnd();
    if (process.env.DENSE && x < 0.65) cs.push(denseEquation());
    else if (x < 0.65) {
      cs.push({ k: 'eq', l: randRow(useRig), r: randRow(useRig) });
    } else if (x < 0.85) {
      cs.push({ k: 'dis', l: row([], [pick(META)]),
        r: row([], [pick(META)]) });
    } else cs.push({ k: 'lacks', v: pick(META), l: pick(LAB) });
  }
  return { hyp, cs, universe: [...LAB, ...(useRig ? RIG : [])] };
}

const perms = cs => {
  const out = [cs, [...cs].reverse()];
  for (let i = 0; i < 3; i++) out.push(sample(cs, cs.length));
  return out;
};
const tally = { accept: 0, refuse: 0, D4: 0, problems: 0, orderDiff: 0,
  unsound: 0, dishonest: 0, notLeast: 0, d4WithLeast: 0,
  d4OnePendingWithLeast: 0, examples: [] };
const bump = key => { tally[key] = (tally[key] || 0) + 1; };

const metasOfPending = p => new Set([...p.left.tails, ...p.right.tails]
  .filter(t => t.startsWith('m')));
const shareAMeta = st => {
  const ms = [...st.pending.values()].map(metasOfPending);
  for (let i = 0; i < ms.length; i++) {
    for (let j = i + 1; j < ms.length; j++) {
      if ([...ms[i]].some(x => ms[j].has(x))) return true;
    }
  }
  return false;
};

const bucket = (p, used, sols, v) => {
  if (v.v === 'accept') {
    const got = S.solution(v.st, used);
    if (!p.cs.every(c => sat(p.hyp, got, c))) bump('solvedViolates');
  }
  if (v.v !== 'D4') return;
  bump(sols.length === 0 ? 'unresolved0'
    : sols.length === 1 ? 'unresolved1' : 'unresolvedMany');
};

const judge = (p, used, sols, lst, order, v) => {
  bucket(p, used, sols, v);
  if (v.v === 'accept' && lst) {
    const got = S.solution(v.st, used);
    const same = m => [...got[m]].sort().join() === [...lst[m]].sort().join();
    if (used.some(m => !same(m))) {
      tally.notLeast++;
      tally.examples.push(['L', p, order, got, lst]);
    }
  }
  if (v.v === 'refuse' && sols.length) {
    tally.dishonest++;
    tally.examples.push(['H', p, order, v.why]);
  }
  if (v.v === 'D4' && !sols.length) bump('d4Unsat');
  if (v.v === 'D4' && lst) {
    tally.d4WithLeast++;
    if (!shareAMeta(v.st)) {
      bump('c3fail');
      tally.examples.push(['C3', p, order]);
    }
    if (v.st.pending.size === 1) {
      tally.d4OnePendingWithLeast++;
      tally.examples.push(['D4-1', p, order]);
    }
  }
  if (v.v === 'accept' && !lst) {
    tally.unsound++;
    tally.examples.push(['S/L', p, order]);
  }
};

const run = (p, order) => {
  try {
    return verdict(p.hyp, order, { noSumFacts: !!process.env.NOSUM,
      expand: !!process.env.EXPAND });
  } catch (e) {
    return { v: 'crash:' + e.message };
  }
};

for (let i = 0; i < Number(process.argv[3] ?? 3000); i++) {
  const p = gen();
  const used = [...new Set(p.cs.flatMap(c => c.k === 'lacks' ? [c.v]
    : [...c.l.tails, ...c.r.tails]).filter(t => t.startsWith('m')))];
  const sols = allSolutions(used, p.universe, p.hyp, p.cs);
  const lst = leastOf(used, p.hyp, p.cs, sols);
  tally.problems++;
  const classes = new Set();
  for (const order of perms(p.cs)) {
    const v = run(p, order);
    classes.add(v.v);
    bump(v.v);
    judge(p, used, sols, lst, order, v);
  }
  if (classes.size > 1) {
    tally.orderDiff++;
    if (tally.examples.filter(e => e[0] === 'ORD').length < 3) {
      tally.examples.push(['ORD', p, [...classes]]);
    }
  }
}
const ex = tally.examples;
delete tally.examples;
console.log(JSON.stringify(tally));
for (const e of ex.slice(0, 6)) console.log(JSON.stringify(e));
