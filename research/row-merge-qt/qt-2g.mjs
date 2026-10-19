// Case 2g (option `g2` of qt-strict.mjs; adopted as amended, plan §10
// decision 17; docs/plans/2026-10-19-row-merge-limitations.md) beside the
// configuration it extends, on the same problems, judged by the
// brute-force oracle: for the 2g variant S (accept => its answer is a
// solution), L (the least), H (refuse => no solution), `acceptDiff` and
// `kindDiff` over the orders, `mirrorDiff` (every row's tails reversed);
// and every change of verdict from the base, by kind (`D4>accept` is what
// 2g is for; anything else is reported). Run twice: with H at the end
// (the adopted configuration) and before H (the compiler until B4), so H
// cannot hide an order difference. The superseded proposal (`g2wait`,
// waiting on a missing atom) is run before H too, as information: its
// order differences are the reason for the amendment, and no violation of
// its is counted. The named problems are the limitation shapes as
// labels-only steps.
// Usage: node qt-2g.mjs [n]   (n problems per generated family)
import { allSolutions, leastOf, sat } from '../open-row-merge/oracle.mjs';
import { mulberry } from '../open-row-merge/random.mjs';
import { shapedProblem, LABELS } from '../open-row-merge/programs-gen.mjs';
import { problems } from '../open-row-merge/exhaustive-run.mjs';
import { generator, metasOf } from '../row-merge-alternatives/gen.mjs';
import { verdictQT, solutionQT } from './qt-drive.mjs';
import { ADOPTED } from './qt-trace.mjs';
import { mirror } from './qt-adapt.mjs';

const BEFORE_H = { ...ADOPTED, hEnd: false };
const RUNS = [
  ['with H', ADOPTED, { ...ADOPTED, g2: true }, true],
  ['before H', BEFORE_H, { ...BEFORE_H, g2: true }, true],
  ['superseded g2wait, before H', BEFORE_H,
    { ...BEFORE_H, g2: true, g2wait: true }, false],
];
const row = (fields, tails) => ({ fields, tails });
const eq = (l, r) => ({ k: 'eq', l, r });
const apart = { lacks: {}, apart: [['R', 'S']] };
const lacking = { lacks: { R: ['a'], S: ['a'] }, apart: [['R', 'S']] };
const atomsOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.l]
  : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails])))]
  .filter(a => !/^m/.test(a)).sort();

// R and S are a signature's rigid tails, apart by its clause.
export const NAMED = [
  // both(x) inside both: x is R; the result is { ...R, ...S }.
  ['self-call', apart, [eq(row([], ['m0']), row([], ['R'])),
    eq(row([], ['m0', 'm1']), row([], ['R', 'S']))]],
  // the same with a label beside the rigids.
  ['self-call, label', lacking, [eq(row([], ['m0']), row(['a'], ['R'])),
    eq(row([], ['m0', 'm1']), row(['a'], ['R', 'S']))]],
  // O4: s lacks admin, the argument { admin }: no rigid, 2g does not apply.
  ['o4', { lacks: {}, apart: [] }, [{ k: 'lacks', v: 'm1', l: 'a' },
    eq(row([], ['m0', 'm1']), row(['a'], []))]],
];

const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const bump = (t, k) => { t[k] = (t[k] ?? 0) + 1; };
const key = (v, ms) => (v.v === 'accept'
  ? `accept ${JSON.stringify(solutionQT(v.st, ms))}` : v.v);

function one(t, p, orders, BASE, G2) {
  const sols = allSolutions(p.metas, p.universe, p.hyp, p.cs);
  const lst = leastOf(p.metas, p.hyp, p.cs, sols);
  const keys = orders.map(cs => {
    const base = verdictQT(p.hyp, cs, BASE);
    const v = verdictQT(p.hyp, cs, G2);
    bump(t, v.v);
    if (base.v !== v.v) bump(t, `${base.v}>${v.v}`);
    if (v.v === 'refuse' && sols.length) bump(t, 'H-violated');
    if (v.v === 'accept') {
      const got = solutionQT(v.st, p.metas);
      if (!p.cs.every(c => sat(p.hyp, got, c))) bump(t, 'S-violated');
      if (!lst || p.metas.some(m => got[m].join()
        !== [...lst[m]].sort().join())) bump(t, 'L-violated');
    }
    return key(v, p.metas);
  });
  const accepts = new Set(keys.map(k => (k.startsWith('accept') ? k : 'no')));
  if (accepts.size > 1) bump(t, 'acceptDiff');
  if (keys.every(k => !k.startsWith('accept')) && new Set(keys).size > 1) {
    bump(t, 'kindDiff');
  }
  if (key(verdictQT(p.hyp, mirror(orders[0]), G2), p.metas) !== keys[0]) {
    bump(t, 'mirrorDiff');
  }
}

const BAD = ['S-violated', 'L-violated', 'H-violated', 'acceptDiff',
  'kindDiff', 'mirrorDiff'];
const n = Number(process.argv[2] ?? 2000);
let bad = false;

for (const [run, BASE, G2, counted] of RUNS) {
  const out = {};
  const family = (name, each) => { out[name] = {}; each(out[name]); };
  family('named', t => {
    for (const [name, hyp, cs] of NAMED) {
      const p = { metas: metasOf(cs), hyp, cs, universe: atomsOf(cs) };
      one(t, p, perms(cs), BASE, G2);
      console.log(run, name, 'base', verdictQT(hyp, cs, BASE).v, '2g',
        key(verdictQT(hyp, cs, G2), p.metas));
    }
  });
  for (const [name, seed, dense] of [['raw', 21, false],
    ['dense', 21, true]]) {
    family(name, t => {
      const { gen, perms: five } = generator(seed, dense);
      for (let i = 0; i < n; i++) {
        const q = gen();
        one(t, { ...q, metas: metasOf(q.cs) }, five(q.cs), BASE, G2);
      }
    });
  }
  for (const seed of [1, 25]) {
    family(`shaped, seed ${seed}`, t => {
      const rand = mulberry(seed);
      for (let i = 0; i < n; i++) {
        const q = shapedProblem(rand);
        const hyp = { lacks: q.hyp.lacks,
          apart: q.hyp.apart.map(k => k.split('|')) };
        const cs = q.constraints;
        one(t, { metas: q.metas, hyp, cs,
          universe: [...LABELS, ...q.rigids] },
        [cs, [...cs].reverse()], BASE, G2);
      }
    });
  }
  family('domain B', t => {
    for (const p of problems('B', 0, 1)) {
      one(t, { ...p, metas: metasOf(p.cs), universe: atomsOf(p.cs) },
        perms(p.cs), BASE, G2);
    }
  });
  for (const [name, t] of Object.entries(out)) {
    console.log(run, name, JSON.stringify(t));
  }
  const found = Object.values(out).some(t => BAD.some(k => t[k]));
  if (counted) bad ||= found;
  console.log(run, found ? 'violation' : 'no violation',
    counted ? '' : '(information only)');
}
console.log(bad ? 'VIOLATION' : 'no violation');
process.exitCode = bad ? 1 : 0;
