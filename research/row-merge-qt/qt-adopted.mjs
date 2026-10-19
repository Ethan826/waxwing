// Checks of the adopted configuration, QT-strict + Sym + H
// (docs/plans/2026-10-19-row-merge-implementation-plan.md, Task B0),
// committed so that the plan's figures rerun from the tree. Each prints
// one line per item and exits 1 if an expectation fails.
//   examples  S1-S3, Q1, Q2, programs 11, 12, 16 and review F2's family:
//             the verdict in every order, the smallest annotation (every
//             set of annotated unknowns at their least values, accepted
//             in every order) and whether it narrows; program 16 under
//             the earlier custom design (research/open-row-merge) too
//   three     the fixtures with a row of three unknown tails: every
//             order of those tails times every order of the steps gives
//             one outcome
//   controls  the 72 fixtures (which classes move), the order fixtures
//             and the PureScript experiment's cases: one outcome per
//             problem, the expected one
//   report    which waiting predicate D4 reports under the proposed
//             R11 (qt-render.mjs), for `determinate`, `odd-cycle`,
//             `diag-01`, program 11 and Q1
// Usage: node qt-adopted.mjs examples | three | controls | report
import { readFileSync, readdirSync } from 'node:fs';
import { verdictQT, solutionQT } from './qt-drive.mjs';
import { verdict } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf } from '../open-row-merge/oracle.mjs';
import { EXAMPLES, STRICT_EXAMPLES } from './qt-examples.mjs';
import { PROGRAMS } from './qt-programs.mjs';
import { ADOPTED, runTraced, indexed } from './qt-trace.mjs';
import { diagnostic } from './qt-render.mjs';

const here = new URL('.', import.meta.url).pathname;
const fixtures = `${here}../../test/fixtures/r005b/`;
let failed = 0;
const expect = (ok, text) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const isM = t => /^m/.test(t);
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.v] : [...c.l.tails, ...c.r.tails])).filter(isM))].sort();
const t = v => ({ fields: [], tails: [v] });
const H = { lacks: {}, apart: [] };
const key = (hyp, steps, ms) => {
  const v = verdictQT(hyp, steps, ADOPTED);
  return v.v === 'accept' ? `accept ${JSON.stringify(solutionQT(v.st, ms))}`
    : v.v;
};
// The set of outcomes over (at most `cap`) orders of the steps.
const outcomes = (hyp, steps, cap = 5040) => new Set(perms(steps)
  .slice(0, cap).map(o => key(hyp, o, metasOf(steps))).map(k =>
    (k.startsWith('accept') ? 'accept' : k)));
const fx = n => read(`${fixtures}${n}.json`).rows;
const SAME = PROGRAMS.find(([n]) => n === 16)[1][0];

function smallest(x) {
  const ms = metasOf(x.steps);
  const atoms = [...new Set(x.steps.flatMap(c => (c.k === 'lacks' ? []
    : [...c.l.fields, ...c.r.fields])))];
  const sols = allSolutions(ms, [...new Set([...atoms, 'w'])].sort(), x.hyp,
    x.steps);
  const lst = leastOf(ms, x.hyp, x.steps, sols);
  if (!lst) return { sols: sols.length, found: [] };
  const found = [];
  for (let k = 1; k <= ms.length && !found.length; k++) {
    for (const set of subsets(ms, k)) {
      const ann = set.map(m => ({ k: 'eq', l: t(m),
        r: { fields: [...lst[m]].sort(), tails: [] } }));
      const vs = outcomes(x.hyp, [...x.steps, ...ann], 720);
      if (vs.size !== 1 || !vs.has('accept')) continue;
      const kept = sols.filter(s => set.every(m => [...s[m]].sort().join()
        === [...lst[m]].sort().join()));
      found.push({ set: set.map(m => `${m}=${JSON.stringify(lst[m])}`),
        narrows: sols.length - kept.length });
    }
  }
  return { sols: sols.length, found };
}
const subsets = (xs, k) => (k === 0 ? [[]] : xs.flatMap((x, i) =>
  subsets(xs.slice(i + 1), k - 1).map(s => [x, ...s])));

function examples() {
  const xs = [...STRICT_EXAMPLES, ...EXAMPLES,
    { name: 'program 11 both(merge, merge)', ...fx('design-forced-bound') },
    { name: 'program 12 apply(merge, noX)', ...fx('diag-14-fix') }];
  const want = {
    'S1': ['D4', 2, 3], 'S2': ['accept', 0, 0], 'S3': ['D4', 1, 0],
    'Q1': ['D4', 1, 1], 'Q2': ['D4', 1, 0], 'program 11': ['D4', 1, 0],
    'program 12': ['D4', 1, 0] };
  for (const x of xs) {
    const plain = [...outcomes(x.hyp, x.steps)].join('/');
    const [v, size, narrows] = want[x.name.split(' ').slice(0, 2)
      .join(' ')] ?? want[x.name.split(' ')[0]];
    const s = plain === 'accept' ? { found: [{ set: [], narrows: 0 }] }
      : smallest(x);
    const first = s.found[0] ?? { set: ['none'], narrows: -1 };
    expect(plain === v && first.set.length === size
      && s.found.every(f => f.narrows === narrows),
    `${x.name}: ${plain} in every order; smallest annotation `
      + `${first.set.join(' ') || 'none'} (${s.found.length} choices), `
      + `excludes ${first.narrows} of ${s.sols ?? '-'} solutions`);
  }
  const q1 = EXAMPLES[0];
  const qt = outcomes(q1.hyp, [...q1.steps, ...q1.annotation], 720);
  expect([...qt].join() === 'D4', `Q1 with the re-plan's QT annotation `
    + `${q1.annotationText}: ${[...qt].join('/')}`);
  const s2 = STRICT_EXAMPLES[1];
  expect([...outcomes(s2.hyp, s2.swapped)].join() === 'accept',
    'S2 with its arguments swapped: accept in every order');
  const mine = [...outcomes(SAME.hyp, SAME.steps)].join('/');
  const old = new Set(perms(SAME.steps).map(o => verdict(SAME.hyp, o).v));
  expect(mine === 'D4' && [...old].join() === 'refuse', `program 16 `
    + `same(merge, merge): adopted ${mine}; earlier design ${[...old]}`);
  f2();
}

function f2() {
  const L = ['a', 'b', 'c'];
  const rs = [...Array(8).keys()].slice(1)
    .map(m => L.filter((_, i) => m & (1 << i)));
  const combos = [...rs.flatMap(a => rs.map(b => [a, b])),
    ...rs.flatMap(a => rs.flatMap(b => rs.map(c => [a, b, c])))];
  let least = 0, plain = 0, annotated = 0;
  for (const R of combos) {
    const cs = R.flatMap((Ri, i) => [{ k: 'dis', l: t(`m${2 * i}`),
      r: t(`m${2 * i + 1}`) }, ...(i ? [{ k: 'eq', l: t('m0'),
      r: t(`m${2 * i}`) }] : []), { k: 'eq', l: { fields: [],
      tails: [`m${2 * i}`, `m${2 * i + 1}`] }, r: { fields: Ri, tails: [] } }]);
    const ms = metasOf(cs);
    const lst = leastOf(ms, H, cs, allSolutions(ms, [...L, 'w'], H, cs));
    if (verdictQT(H, cs, ADOPTED).v === 'accept') plain++;
    if (!lst) continue;
    least++;
    const ann = [...cs, { k: 'eq', l: t('m0'), r: { fields: [...lst.m0],
      tails: [] } }];
    if (verdictQT(H, ann, ADOPTED).v === 'accept') annotated++;
  }
  expect(least === 186 && plain === 0 && annotated === 186, `F2: `
    + `${combos.length} programs, ${least} with a least solution, accepted `
    + `plain ${plain}, with the shared parameter annotated ${annotated}`);
}

function three() {
  for (const n of readdirSync(fixtures).sort()) {
    const f = read(fixtures + n);
    const cs = f.rows?.steps ?? [];
    const big = c => c.k !== 'lacks' && [c.l, c.r]
      .some(r => r.tails.filter(isM).length >= 3);
    if (!cs.some(big)) continue;
    const ms = metasOf(cs);
    const seen = new Set();
    for (let k = 0; k < 6; k++) {
      const turn = r => {
        const xs = r.tails.filter(isM);
        if (xs.length < 2) return r;
        const ps = perms(xs);
        return { fields: r.fields, tails: [...r.tails.filter(x => !isM(x)),
          ...ps[k % ps.length]] };
      };
      const moved = cs.map(c => (c.k === 'lacks' ? c
        : { ...c, l: turn(c.l), r: turn(c.r) }));
      for (const o of perms(moved).slice(0, 720)) {
        seen.add(key(f.rows.hyp, o, ms));
      }
    }
    expect(seen.size === 1, `${f.name} (${f.result}): one outcome over `
      + `every tail order and step order: ${[...seen][0].slice(0, 50)}`);
  }
}

const CONTROLS = {
  'design-forced-bound': 'D4', 'design-quiet': 'D4', 'diag-14-fix': 'D4',
  'order-22-581': 'D4', 'order-22-3634': 'D4', 'order-23-3089': 'D4',
  'order-24-3802': 'D4', 'order-A-lacks': 'refuse', 'order-A-apart':
  'refuse', 'order-S-shapes-1910': 'refuse', 'domain-b-1': 'D4',
  'domain-b-17': 'D4', 'domain-b-3': 'refuse', 'domain-b-7': 'refuse',
  'domain-b-9': 'D4' };
const CLASS = { Solved: 'accept', Contradiction: 'refuse', Unresolved: 'D4' };

function controls() {
  const moved = [];
  for (const n of readdirSync(fixtures).sort()) {
    const f = read(fixtures + n);
    if (!f.rows) continue;
    const vs = outcomes(f.rows.hyp, f.rows.steps);
    const got = [...vs].join('/');
    if (got !== CLASS[f.result]) moved.push(`${f.name} ${f.result}>${got}`);
    expect(vs.size === 1 && (CONTROLS[f.name] ?? CLASS[f.result]) === got,
      `${f.name}: ${got}`);
  }
  console.log(`moved: ${moved.join(', ')}`);
  for (const dir of ['fixtures/', '../purs-row-experiment/cases/']) {
    for (const n of readdirSync(here + dir).sort()) {
      const f = read(here + dir + n);
      const orders = f.steps.length > 6 ? f.orders.map(ix => ix.map(i =>
        f.steps[i])) : perms(f.steps);
      const vs = new Set(orders.map(o => verdictQT(f.hyp, o, ADOPTED).v));
      expect(vs.size === 1 && [...vs][0] === CONTROLS[f.name],
        `${f.name}: ${[...vs].join('/')} in every order`);
    }
  }
}

function report() {
  const xs = [['determinate', fx('determinate')], ['odd-cycle',
    fx('odd-cycle')], ['diag-01', fx('diag-01')], ['program 11',
    fx('design-forced-bound')], ['Q1', EXAMPLES[0]]];
  for (const [name, x] of xs) {
    const shown = new Set(perms(indexed(x.steps)).slice(0, 5040)
      .map(o => JSON.stringify(diagnostic(runTraced(x.hyp, o)))));
    expect(shown.size === 1, `${name}: ${[...shown].join(' | ')}`);
  }
}

const run = { examples, three, controls, report }[process.argv[2]];
if (!run) throw new Error('usage: examples | three | controls | report');
run();
process.exitCode = failed ? 1 : 0;
