// Checks the design cites (docs/plans/2026-10-18-row-merge-qualified-
// types.md, sections 3.11, 4.2 and 4.5), committed so that they rerun
// from the tree. Each prints one line per item and exits 1 if any
// expectation fails.
//   order        the order-dependence fixtures (fixtures/order-*):
//                recorded outcomes reproduce; the repaired variant gives
//                one verdict and one solution in every order; the
//                variant without the repair still differs
//   annotations  programs 11 and 12 and the QT examples Q1, Q2, without
//                and with their annotations
//   f2           review F2's 186 programs with a least solution, with
//                one annotated parameter (the shared one)
//   stage4       the 25 fixtures at stages.solver 4 never hold a
//                waiting predicate after any step, in any order
//   strict       QT-strict's examples (qt-examples.mjs), and its
//                acceptance against the installed PureScript's
// Usage: node qt-checks.mjs order | annotations | f2 | stage4 | strict
import { readFileSync, readdirSync } from 'node:fs';
import { row, tail } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf } from '../open-row-merge/oracle.mjs';
import { verdictQT, solutionQT } from './qt-drive.mjs';
import { EXAMPLES, STRICT_EXAMPLES } from './qt-examples.mjs';

const here = new URL('.', import.meta.url).pathname;
const fixtures = `${here}../../test/fixtures/r005b/`;
const QS_EH = { mode: 'sym', empty: true, home: true };
const QS_EHZ = { ...QS_EH, zero: true };
const QT = {};
const QTS = { qts: true, selfApart: false, pairwise: false };
let failed = 0;
const expect = (ok, text) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.v] : [...c.l.tails, ...c.r.tails])).filter(t => /^m/.test(t)))]
  .sort();
const outcome = (hyp, steps, opts, ms) => {
  const v = verdictQT(hyp, steps, opts);
  return { v: v.v, why: v.why ?? null,
    solution: v.v === 'accept' ? solutionQT(v.st, ms) : null };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Variants a fixture may name: `independent` must give one verdict and
// one solution in every order; `dependent` (the configuration without
// the repair the fixture pins) must still differ.
const NAMED = { 'QS-EH': QS_EH, 'QS-EHZ': QS_EHZ,
  'QS-EHZ-plain': { ...QS_EHZ, plain: true } };

function order() {
  const dir = `${here}fixtures/`;
  for (const file of readdirSync(dir).filter(f => f.startsWith('order-'))
    .sort()) {
    const f = read(dir + file);
    const ms = metasOf(f.steps);
    if (f.classDifference) {
      classOnly(f, ms);
      continue;
    }
    const runs = name => f.orders.map(ix => outcome(f.hyp,
      ix.map(i => f.steps[i]), NAMED[name], ms));
    const dep = runs(f.dependent), ind = runs(f.independent);
    expect(same(dep, f.outcomes[f.dependent])
      && same(ind, f.outcomes[f.independent]),
      `${f.name}: recorded outcomes reproduce (${f.orders.length} orders)`);
    expect(ind.every(x => same(x, ind[0])), `${f.name}: ${f.independent}`
      + ` ${ind[0].v}, one outcome in every order`);
    expect(new Set(dep.map(x => x.v)).size > 1, `${f.name}: ${f.dependent}`
      + ` order-dependent (${dep.map(x => x.v).join(', ')})`);
  }
}

// A fixture pinning a difference of verdict class only (Contradiction
// in one order, Unresolved in another): acceptance must not differ.
function classOnly(f, ms) {
  const runs = f.orders.map(ix => outcome(f.hyp, ix.map(i => f.steps[i]),
    QTS, ms));
  expect(same(runs, f.outcomes[f.variant]), `${f.name}: recorded outcomes`
    + ` reproduce (${f.orders.length} orders)`);
  expect(runs.every(x => x.v !== 'accept'), `${f.name}: ${f.variant}`
    + ' rejects in every order');
  expect(new Set(runs.map(x => x.v)).size > 1, `${f.name}: ${f.variant}`
    + ` classes differ (${runs.map(x => x.v).join(', ')})`);
}

const withSteps = (f, extra) => [...f.rows.steps, ...extra];
const eqTail = (m, labels) => ({ k: 'eq', l: tail(m), r: row(labels) });

function annotations() {
  const both = read(`${fixtures}design-forced-bound.json`);
  const fix11 = withSteps(both, [eqTail('m0', []), eqTail('m1', ['x'])]);
  for (const steps of [fix11, [...fix11].reverse()]) {
    expect(verdictQT(both.rows.hyp, steps, QS_EH).v === 'accept',
      'program 11 with fn(p: {}, q: { x: Int }) => merge(p, q): accept');
  }
  const noX = read(`${fixtures}diag-14-fix.json`);
  const fix12 = withSteps(noX, [eqTail('m0', ['x']), eqTail('m1', ['y'])]);
  expect(verdictQT(noX.rows.hyp, fix12, QS_EH).v === 'accept',
    'program 12 with fn(p: { x: Int }, q: { y: Int }) => ...: accept');
  for (const x of EXAMPLES) {
    const run = (steps, opts) => perms(steps).map(o =>
      verdictQT(x.hyp, o, opts).v);
    const all = (vs, v) => vs.every(w => w === v);
    expect(all(run(x.steps, QT), 'D4'), `${x.name}: QT D4 in every order`);
    expect(all(run(x.steps, QS_EHZ), 'accept'),
      `${x.name}: QS-EHZ accept in every order`);
    const annotated = [...x.steps, ...x.annotation];
    expect(all(run(annotated, QT), 'accept'),
      `${x.name}: QT accepts with ${x.annotationText}`);
    const ms = metasOf(x.steps);
    const lst = leastOf(ms, x.hyp, x.steps,
      allSolutions(ms, ['a', 'b', 'c'], x.hyp, x.steps));
    const qs = verdictQT(x.hyp, x.steps, QS_EHZ);
    const qt = verdictQT(x.hyp, annotated, QT);
    expect(lst && same(solutionQT(qs.st, ms), lst)
      && same(solutionQT(qt.st, ms), lst),
      `${x.name}: the annotated QT solution is the least, as QS's`);
  }
}

function f2() {
  const L = ['a', 'b', 'c'];
  const rs = [...Array(8).keys()].slice(1)
    .map(m => L.filter((_, i) => m & (1 << i)));
  const combos = [...rs.flatMap(a => rs.map(b => [a, b])),
    ...rs.flatMap(a => rs.flatMap(b => rs.map(c => [a, b, c])))];
  const H = { lacks: {}, apart: [] };
  const t = { least: 0, plain: 0, annotated: 0 };
  for (const R of combos) {
    const cs = [];
    R.forEach((Ri, i) => {
      const r = `m${2 * i}`, s = `m${2 * i + 1}`;
      cs.push({ k: 'dis', l: tail(r), r: tail(s) });
      if (i > 0) cs.push({ k: 'eq', l: tail('m0'), r: tail(r) });
      cs.push({ k: 'eq', l: row([], [r, s]), r: row(Ri) });
    });
    const ms = R.flatMap((_, i) => [`m${2 * i}`, `m${2 * i + 1}`]);
    const lst = leastOf(ms, H, cs, allSolutions(ms, L, H, cs));
    if (!lst) continue;
    t.least++;
    if (verdictQT(H, cs, QS_EHZ).v === 'accept') t.plain++;
    const ann = [...cs, eqTail('m0', lst.m0)];
    for (const opts of [QS_EHZ, QT]) {
      if (verdictQT(H, ann, opts).v === 'accept') t.annotated++;
    }
  }
  expect(t.least === 186 && t.plain === 0 && t.annotated === 372,
    `F2: ${t.least} with a least solution; accepted plain ${t.plain}; `
    + `with the shared parameter annotated, QS-EHZ + QT ${t.annotated}`);
}

function stage4() {
  let n = 0;
  const waited = [];
  for (const file of readdirSync(fixtures).sort()) {
    const f = read(fixtures + file);
    if (!f.rows || f.stages.solver !== 4) continue;
    n++;
    let w = false;
    const after = st => { if (st.preds.length) w = true; };
    for (const o of f.rows.steps.length <= 7 ? perms(f.rows.steps)
      : [f.rows.steps]) {
      verdictQT(f.rows.hyp, o, { ...QS_EH, after });
      verdictQT(f.rows.hyp, o, { ...QS_EHZ, after });
    }
    if (w) waited.push(f.name);
  }
  expect(n === 25 && !waited.length, `stage 4: ${n} fixtures, waiting in `
    + `${waited.length} (${waited.join(', ') || 'none'})`);
}

// The rows of a case of research/purs-row-experiment, as its run.mjs
// loads them.
function caseSource(name) {
  if (name.startsWith('order-')) return read(`${here}fixtures/${name}.json`);
  if (name.startsWith('control-')) {
    return read(`${fixtures}${name.slice(8)}.json`).rows;
  }
  return read(`${here}../purs-row-experiment/cases/${name}.json`);
}

// QT-strict: its examples without and with their annotations, and its
// acceptance against the installed PureScript's in Waxwing's setting
// (research/purs-row-experiment/results.json, mode sig, encoding nub).
function strict() {
  const all = (h, steps, opts, v) => perms(steps).every(o =>
    verdictQT(h, o, opts).v === v);
  for (const x of STRICT_EXAMPLES) {
    expect(all(x.hyp, x.steps, QTS, 'D4'), `${x.name}: QT-strict D4`);
    expect(all(x.hyp, x.steps, QS_EHZ, 'accept'), `${x.name}: QS-EHZ`
      + ' accept');
    const ann = [...x.steps, ...x.annotation];
    const ms = metasOf(x.steps);
    const lst = leastOf(ms, x.hyp, x.steps,
      allSolutions(ms, ['a', 'b', 'c'], x.hyp, x.steps));
    expect(all(x.hyp, ann, QTS, 'accept') && same(solutionQT(
      verdictQT(x.hyp, ann, QTS).st, ms), lst), `${x.name}: QT-strict`
      + ` accepts ${x.annotationText}, with the least solution`);
    if (x.swapped) {
      expect(all(x.hyp, x.swapped, QTS, 'accept'), `${x.name}: QT-strict`
        + ' accepts the arguments swapped');
    }
  }
  const res = read(`${here}../purs-row-experiment/results.json`);
  for (const c of res.cases) {
    const src = caseSource(c.name);
    const qts = c.orders.map(ix => verdictQT(src.hyp,
      ix.map(i => src.steps[i]), QTS).v === 'accept');
    const ps = c.purs['sig-nub'].map(o => o.v === 'accept');
    expect(same(qts, ps), `${c.name}: QT-strict and purs (sig, nub) agree`
      + ` on acceptance in every order (${ps.join(', ')})`);
  }
}

const run = { order, annotations, f2, stage4, strict }[process.argv[2]];
if (!run) throw new Error('usage: order | annotations | f2 | stage4 | strict');
run();
process.exitCode = failed ? 1 : 0;
