// A small typed domain for the field-type claims of Sym (design section
// 14.1): fields are `label:Type` (a:Int, a:Bool, b:Int), unique by
// label, so moving a label also equates its type. Its own brute-force
// oracle (written for this domain, not the prototype's facts): an
// unknown denotes a set of typed fields with unique labels; an equation
// holds when both sides are well formed (no label twice) and equal;
// `dis` when the two sides together are well formed. Every problem: two
// equations over rows of at most one field and up to two unknown tails
// (both orders), every order of the steps, and the problem with every
// row's tails reversed (`mirrorDiff`); QT-strict and its adaptations.
// Exit 1 on any S, L or H violation, an acceptance difference between
// orders, a +Sym mirror difference, or a +H difference from its base.
// Usage: node qt-typed.mjs [workers]
import { Worker, isMainThread, parentPort, workerData }
  from 'node:worker_threads';
import { cpus } from 'node:os';
import { verdictQT, solutionQT } from './qt-drive.mjs';
import { ADAPT, mirror } from './qt-adapt.mjs';

const FIELDS = ['a:Int', 'a:Bool', 'b:Int'];
const METAS = ['m0', 'm1', 'm2'];
const name = f => f.split(':')[0];
const wf = atoms => new Set(atoms.map(name)).size === atoms.length;
const denote = (asg, r) => [...r.fields, ...r.tails.flatMap(t => asg[t])];
const eqms = (a, b) => [...a].sort().join() === [...b].sort().join();
const sat = (asg, c) => {
  const l = denote(asg, c.l), r = denote(asg, c.r);
  return c.k === 'eq' ? wf(l) && wf(r) && eqms(l, r) : wf([...l, ...r]);
};
const SUBSETS = [...Array(1 << FIELDS.length).keys()]
  .map(m => FIELDS.filter((_, i) => m & (1 << i))).filter(wf);

export function solutions(ms, cs) {
  const out = [];
  const rec = (i, asg) => {
    if (i === ms.length) {
      if (cs.every(c => sat(asg, c))) out.push({ ...asg });
      return;
    }
    for (const s of SUBSETS) rec(i + 1, { ...asg, [ms[i]]: s });
  };
  rec(0, {});
  return out;
}

export const least = (ms, cs, sols) => {
  if (!sols.length) return null;
  const meet = Object.fromEntries(ms.map(m => [m, sols[0][m]
    .filter(a => sols.every(s => s[m].includes(a)))]));
  return cs.every(c => sat(meet, c)) ? meet : null;
};

const TAILS = [[], ...METAS.map(m => [m]), ...METAS.flatMap(m =>
  METAS.filter(n => n !== m).map(n => [m, n]))];
const ROWS = [[], ...FIELDS.map(f => [f])].flatMap(fields =>
  TAILS.map(tails => ({ fields, tails })));
const EQS = ROWS.flatMap((l, i) => ROWS.slice(i).map(r =>
  ({ k: 'eq', l, r })));
const metasOf = cs => [...new Set(cs.flatMap(c => [...c.l.tails,
  ...c.r.tails]))].sort();
const bump = (t, k) => { t[k] = (t[k] || 0) + 1; };

function run(cs, tally) {
  const ms = metasOf(cs);
  const sols = solutions(ms, cs), lst = least(ms, cs, sols);
  bump(tally, 'problems');
  const keys = {};
  for (const [k, opts] of Object.entries(ADAPT)) {
    const t = tally[k] ??= {};
    for (const order of [cs, [...cs].reverse()]) {
      const v = verdictQT({ lacks: {}, apart: [] }, order, opts);
      bump(t, v.v);
      const got = v.v === 'accept' && solutionQT(v.st, ms);
      if (got && !cs.every(c => sat(got, c))) bump(t, 'S-violated');
      if (got && !(lst && ms.every(m => eqms(got[m], lst[m])))) {
        bump(t, 'L-violated');
      }
      if (v.v === 'refuse' && sols.length) bump(t, 'H-violated');
      (keys[k] ??= []).push(got ? JSON.stringify(got) : v.v);
    }
    const acc = new Set(keys[k].map(x => (x[0] === '{' ? x : 'no')));
    if (acc.size > 1) bump(t, 'acceptDiff');
    const m = verdictQT({ lacks: {}, apart: [] }, mirror(cs), opts);
    const mk = m.v === 'accept' ? JSON.stringify(solutionQT(m.st, ms)) : m.v;
    if (mk !== keys[k][0]) bump(t, 'mirrorDiff');
  }
  for (const [h, b] of [['QT-strict+H', 'QT-strict'],
    ['QT-strict+Sym+H', 'QT-strict+Sym']]) {
    keys[h].forEach((x, i) => {
      const y = keys[b][i];
      if ((x[0] === '{' || y[0] === '{') && x !== y) {
        bump(tally[h], 'baseDiff');
      }
      if (x === 'refuse' && y === 'D4') bump(tally[h], 'H:new');
    });
  }
}

const main = import.meta.url === `file://${process.argv[1]}`;
if (isMainThread && main) {
  const workers = Number(process.argv[2] ?? cpus().length);
  const total = {}, start = Date.now();
  let done = 0;
  for (let w = 0; w < workers; w++) {
    new Worker(new URL(import.meta.url), { workerData: { w, workers } })
      .on('message', t => {
        for (const [k, v] of Object.entries(t)) {
          if (typeof v === 'number') total[k] = (total[k] || 0) + v;
          else for (const [x, n] of Object.entries(v)) {
            (total[k] ??= {})[x] = (total[k][x] || 0) + n;
          }
        }
        if (++done === workers) report(total, start);
      });
  }
} else if (!isMainThread) {
  const tally = {};
  const { w, workers } = workerData;
  for (let i = w; i < EQS.length; i += workers) {
    for (let j = i; j < EQS.length; j++) run([EQS[i], EQS[j]], tally);
  }
  parentPort.postMessage(tally);
}

function report(t, start) {
  console.log(JSON.stringify({ problems: t.problems,
    seconds: Math.round((Date.now() - start) / 1000) }));
  let bad = false;
  for (const k of Object.keys(ADAPT)) {
    console.log(k, JSON.stringify(t[k]));
    bad ||= ['S-violated', 'L-violated', 'H-violated', 'acceptDiff']
      .some(x => t[k][x] && k !== 'QS-EHZ');
  }
  bad ||= !!t['QT-strict+Sym'].mirrorDiff || !!t['QT-strict+Sym+H'].mirrorDiff
    || !!t['QT-strict+H'].baseDiff || !!t['QT-strict+Sym+H'].baseDiff;
  process.exitCode = bad ? 1 : 0;
}
