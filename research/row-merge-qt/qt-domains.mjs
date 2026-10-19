// Every problem of research/open-row-merge's exhaustive domains A and B
// (exhaustive-run.mjs `problems`: two equations plus nothing, a `lacks`
// or a `dis`; every order) through QT, QT-strict and its adaptations
// (+Sym, +H, +Sym+H: `mirrorDiff`, the first order with every row's
// tails reversed; for +H `baseDiff` against the variant without H and
// `H:new`, its new Contradictions), QS-EH and QS-EHZ,
// judged by the brute-force oracle: S (accept => a solution), L (accept
// => the least solution), H (refuse => no solution), and order
// independence:
// `orderDiff`, more than one verdict class or solution over the orders;
// `acceptDiff`, accepted in some orders and not others, or with
// different solutions. Exit 1 on any S, L or H violation, an order
// difference in QS-EHZ, an acceptance difference in a QT-strict
// variant, a +Sym mirror difference or a +H base difference.
// Usage: node qt-domains.mjs A|B [workers]
import { Worker, isMainThread, parentPort, workerData }
  from 'node:worker_threads';
import { cpus } from 'node:os';
import { problems } from '../open-row-merge/exhaustive-run.mjs';
import { allSolutions, leastOf, sat, isMeta }
  from '../open-row-merge/oracle.mjs';
import { verdictQT, solutionQT } from './qt-drive.mjs';

const STRICT = { qts: true, selfApart: false, pairwise: false };
const VARIANTS = { QT: {}, 'QT-strict': STRICT,
  'QT-strict+Sym': { ...STRICT, sym: true },
  'QT-strict+H': { ...STRICT, hEnd: true },
  'QT-strict+Sym+H': { ...STRICT, sym: true, hEnd: true },
  'QS-EH': { mode: 'sym', empty: true, home: true },
  'QS-EHZ': { mode: 'sym', empty: true, home: true, zero: true } };
const BASE = { 'QT-strict+H': 'QT-strict',
  'QT-strict+Sym+H': 'QT-strict+Sym' };
const flip = r => ({ fields: r.fields, tails: [...r.tails].reverse() });
const mirror = cs => cs.map(c => (c.k === 'lacks' ? c
  : { ...c, l: flip(c.l), r: flip(c.r) }));
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.v] : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();
const atomsOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.l] : [...c.l.fields, ...c.r.fields, ...c.l.tails,
    ...c.r.tails])))].filter(a => !isMeta(a)).sort();
const bump = (t, k, n = 1) => { t[k] = (t[k] || 0) + n; };

function run(p, tally) {
  const ms = metasOf(p.cs);
  const sols = allSolutions(ms, atomsOf(p.cs), p.hyp, p.cs);
  const lst = leastOf(ms, p.hyp, p.cs, sols);
  bump(tally, 'problems');
  const keys = {};
  for (const [k, opts] of Object.entries(VARIANTS)) {
    const t = tally[k] ??= {};
    const ks = keys[k] = [];
    for (const order of perms(p.cs)) {
      const v = verdictQT(p.hyp, order, opts);
      bump(t, v.v);
      let key = v.v;
      if (v.v === 'accept') {
        const got = solutionQT(v.st, ms);
        key += JSON.stringify(got);
        if (!p.cs.every(c => sat(p.hyp, got, c))) bump(t, 'S-violated');
        if (!lst || ms.some(m => got[m].join() !== [...lst[m]].sort()
          .join())) bump(t, 'L-violated');
      }
      if (v.v === 'refuse' && sols.length) bump(t, 'H-violated');
      ks.push(key);
    }
    tallyOrders(t, ks);
    const m = verdictQT(p.hyp, mirror(perms(p.cs)[0]), opts);
    const mk = m.v === 'accept' ? m.v + JSON.stringify(solutionQT(m.st, ms))
      : m.v;
    if (mk !== ks[0]) bump(t, 'mirrorDiff');
  }
  for (const [h, b] of Object.entries(BASE)) {
    keys[h].forEach((x, i) => {
      const y = keys[b][i];
      if ((x.startsWith('accept') || y.startsWith('accept')) && x !== y) {
        bump(tally[h], 'baseDiff');
      }
      if (x === 'refuse' && y === 'D4') bump(tally[h], 'H:new');
    });
  }
}

// orderDiff: verdict class or solution differs between orders;
// acceptDiff: acceptance or solution differs; kindDiff: rejected in
// every order, Contradiction in some and Unresolved in others.
function tallyOrders(t, ks) {
  if (new Set(ks).size > 1) bump(t, 'orderDiff');
  if (new Set(ks.map(x => (x.startsWith('accept') ? x : 'no'))).size > 1) {
    bump(t, 'acceptDiff');
  }
  if (ks.every(x => !x.startsWith('accept')) && new Set(ks).size > 1) {
    bump(t, 'kindDiff');
  }
}

if (isMainThread) {
  const name = process.argv[2] ?? 'B';
  const workers = Number(process.argv[3] ?? cpus().length);
  const started = Date.now(), total = {};
  let done = 0;
  for (let w = 0; w < workers; w++) {
    new Worker(new URL(import.meta.url), { workerData: { name, w, workers } })
      .on('message', t => {
        for (const [k, v] of Object.entries(t)) {
          if (typeof v === 'number') bump(total, k, v);
          else for (const [x, n] of Object.entries(v)) {
            bump(total[k] ??= {}, x, n);
          }
        }
        if (++done === workers) report(total, name, started);
      });
  }
} else {
  const tally = {};
  const { name, w, workers } = workerData;
  for (const p of problems(name, w, workers)) run(p, tally);
  parentPort.postMessage(tally);
}

function report(t, name, started) {
  console.log(JSON.stringify({ domain: name, problems: t.problems,
    seconds: Math.round((Date.now() - started) / 1000) }));
  let bad = false;
  for (const k of Object.keys(VARIANTS)) {
    console.log(k, JSON.stringify(t[k]));
    bad ||= ['S-violated', 'L-violated', 'H-violated'].some(x => t[k][x]);
  }
  bad ||= !!t['QS-EHZ'].orderDiff || ['QT-strict', 'QT-strict+Sym',
    'QT-strict+H', 'QT-strict+Sym+H'].some(k => t[k].acceptDiff)
    || !!t['QT-strict+Sym'].mirrorDiff || !!t['QT-strict+Sym+H'].mirrorDiff
    || !!t['QT-strict+H'].baseDiff || !!t['QT-strict+Sym+H'].baseDiff;
  process.exitCode = bad ? 1 : 0;
}
