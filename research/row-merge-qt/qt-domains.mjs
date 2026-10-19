// Every problem of research/open-row-merge's exhaustive domains A and B
// (exhaustive-run.mjs `problems`: two equations plus nothing, a `lacks`
// or a `dis`; every order) through QT, QS-EH and QS-EHZ, judged by the
// brute-force oracle: S (accept => a solution), L (accept => the least
// solution), H (refuse => no solution), and order independence: one
// verdict class, and for accepts one solution, over all orders.
// Exit 1 on any S, L or H violation, or an order difference in QS-EHZ.
// Usage: node qt-domains.mjs A|B [workers]
import { Worker, isMainThread, parentPort, workerData }
  from 'node:worker_threads';
import { cpus } from 'node:os';
import { problems } from '../open-row-merge/exhaustive-run.mjs';
import { allSolutions, leastOf, sat, isMeta }
  from '../open-row-merge/oracle.mjs';
import { verdictQT, solutionQT } from './qt-drive.mjs';

const VARIANTS = { QT: {}, 'QS-EH': { mode: 'sym', empty: true, home: true },
  'QS-EHZ': { mode: 'sym', empty: true, home: true, zero: true } };
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
  for (const [k, opts] of Object.entries(VARIANTS)) {
    const t = tally[k] ??= {};
    const seen = new Set();
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
      seen.add(key);
    }
    if (seen.size > 1) bump(t, 'orderDiff');
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
  bad ||= !!t['QS-EHZ'].orderDiff;
  process.exitCode = bad ? 1 : 0;
}
