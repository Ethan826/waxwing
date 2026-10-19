// Checks for the design's section 14 (QT-strict's adaptations), apart
// from qt-checks.mjs for size. Each prints one line per item and exits
// 1 if any expectation fails.
//   sym         typed swapped-input programs (merge(p, q) against
//               merge(q, p), nested): under QT-strict+Sym one outcome
//               (verdict and solution) over every order of the program
//               and of its mirror, equal to the typed oracle's claim;
//               QT-strict's own outcomes listed beside
//   generality  every annotation example: does fixing the annotated
//               unknown narrow the program's solutions, or is it
//               redundant (the unknown has that value in every
//               solution)?
//   kinds       QT-strict's verdict-kind fixture under each variant
// Usage: node qt-checks2.mjs sym | generality | kinds
import { readFileSync } from 'node:fs';
import { verdictQT, solutionQT } from './qt-drive.mjs';
import { ADAPT, mirror } from './qt-adapt.mjs';
import { solutions, least } from './qt-typed.mjs';
import { allSolutions, leastOf } from '../open-row-merge/oracle.mjs';
import { EXAMPLES, STRICT_EXAMPLES } from './qt-examples.mjs';

const here = new URL('.', import.meta.url).pathname;
const fixtures = `${here}../../test/fixtures/r005b/`;
let failed = 0;
const expect = (ok, text) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const H = { lacks: {}, apart: [] };
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.v] : [...c.l.tails, ...c.r.tails])).filter(t => /^m/.test(t)))]
  .sort();
const t = v => ({ fields: [], tails: [v] });
const two = (a, b) => ({ fields: [], tails: [a, b] });
const fs = (f, ts = []) => ({ fields: f, tails: ts });
const dis = (a, b) => ({ k: 'dis', l: t(a), r: t(b) });
const eq = (l, r) => ({ k: 'eq', l, r });

// p is m0; q is m1 = { a: Int }; the merge's result is m2.
const SYM = [
  { name: 'merge(p, q), p unknown', steps: [dis('m0', 'm1'),
    eq(t('m1'), fs(['a:Int'])), eq(two('m0', 'm1'), t('m2'))] },
  { name: 'merge(p, q), p later { b: Int }', steps: [dis('m0', 'm1'),
    eq(t('m1'), fs(['a:Int'])), eq(two('m0', 'm1'), t('m2')),
    eq(t('m0'), fs(['b:Int']))] },
  { name: 'merge(p, q) into { a: Bool, ..._ } (no solution)', steps: [
    dis('m0', 'm1'), eq(t('m1'), fs(['a:Int'])),
    eq(two('m0', 'm1'), fs(['a:Bool'], ['m3']))] },
  { name: 'merge(p, q) into { a: Int, b: Int }', steps: [dis('m0', 'm1'),
    eq(t('m1'), fs(['a:Int'])), eq(two('m0', 'm1'), fs(['a:Int',
      'b:Int']))] },
  { name: 'merge(merge(p, q), w), w = { b: Int }', steps: [
    dis('m0', 'm1'), eq(t('m1'), fs(['a:Int'])), dis('m2', 'm3'),
    eq(t('m2'), two('m0', 'm1')), eq(t('m3'), fs(['b:Int'])),
    eq(two('m2', 'm3'), t('m4'))] },
];

const outcome = (steps, opts, ms) => {
  const v = verdictQT(H, steps, opts);
  return v.v === 'accept' ? JSON.stringify(solutionQT(v.st, ms)) : v.v;
};

function sym() {
  for (const x of SYM) {
    const ms = metasOf(x.steps);
    const sols = solutions(ms, x.steps), lst = least(ms, x.steps, sols);
    const claim = lst ? JSON.stringify(Object.fromEntries(ms.map(m =>
      [m, [...lst[m]].sort()]))) : null;
    const runs = opts => [...perms(x.steps), ...perms(mirror(x.steps))]
      .slice(0, 1440).map(o => outcome(o, opts, ms));
    const sy = new Set(runs(ADAPT['QT-strict+Sym']));
    const st = new Set(runs(ADAPT['QT-strict']));
    const one = [...sy][0];
    const sound = one === 'refuse' ? !sols.length
      : one === 'D4' || one === claim;
    expect(sy.size === 1 && sound, `${x.name}: QT-strict+Sym ${one} in `
      + `every order of both orientations; QT-strict ${[...st].sort()
        .map(s => (s[0] === '{' ? 'accept' : s)).join('/')}`);
  }
}

// Each example: its rows, the annotation as `eq` steps, a universe.
function examples() {
  const read = n => JSON.parse(readFileSync(`${fixtures}${n}.json`,
    'utf8')).rows;
  const fix = (rows, a) => ({ hyp: rows.hyp, steps: rows.steps, ann: a });
  const ann = (m, ls) => eq(t(m), fs(ls));
  return [
    ...STRICT_EXAMPLES.map(x => ({ name: x.name, hyp: x.hyp,
      steps: x.steps, ann: x.annotation })),
    ...EXAMPLES.map(x => ({ name: x.name, hyp: x.hyp, steps: x.steps,
      ann: x.annotation })),
    { name: 'program 11 both(merge, merge)',
      ...fix(read('design-forced-bound'), [ann('m0', []),
        ann('m1', ['x'])]) },
    { name: 'program 12 apply(merge, noX)',
      ...fix(read('diag-14-fix'), [ann('m0', ['x']), ann('m1', ['y'])]) },
  ];
}

function generality() {
  for (const x of examples()) {
    const ms = metasOf(x.steps);
    const atoms = [...new Set(x.steps.flatMap(c => (c.k === 'lacks' ? []
      : [...c.l.fields, ...c.r.fields])))];
    const universe = [...new Set([...atoms, 'w'])].sort();
    const sols = allSolutions(ms, universe, x.hyp, x.steps);
    const kept = sols.filter(s => x.ann.every(a =>
      [...s[a.l.tails[0]]].sort().join() === [...a.r.fields].sort()
        .join()));
    const what = kept.length === sols.length ? 'redundant'
      : `narrows (${sols.length - kept.length} of ${sols.length} excluded)`;
    const lst = leastOf(ms, x.hyp, x.steps, sols);
    const isLeast = !!lst && x.ann.every(a => [...lst[a.l.tails[0]]]
      .sort().join() === [...a.r.fields].sort().join());
    expect(kept.length >= 1 && isLeast, `${x.name}: ${sols.length} `
      + `solutions over { ${universe.join(', ')} }; the annotation `
      + `${what}; it fixes the least solution's value`);
  }
  f2Generality();
}

// Review F2's programs with a least solution, the shared parameter
// annotated with its least value: redundant in how many?
function f2Generality() {
  const L = ['a', 'b', 'c'];
  const rs = [...Array(8).keys()].slice(1)
    .map(m => L.filter((_, i) => m & (1 << i)));
  const combos = [...rs.flatMap(a => rs.map(b => [a, b])),
    ...rs.flatMap(a => rs.flatMap(b => rs.map(c => [a, b, c])))];
  let n = 0, redundant = 0;
  for (const R of combos) {
    const cs = R.flatMap((Ri, i) => [dis(`m${2 * i}`, `m${2 * i + 1}`),
      ...(i ? [eq(t('m0'), t(`m${2 * i}`))] : []),
      eq(two(`m${2 * i}`, `m${2 * i + 1}`), fs(Ri))]);
    const ms = metasOf(cs);
    const sols = allSolutions(ms, [...L, 'w'], H, cs);
    const lst = leastOf(ms, H, cs, sols);
    if (!lst) continue;
    n++;
    if (sols.every(s => s.m0.join() === lst.m0.join())) redundant++;
  }
  expect(n === 186, `F2: ${n} programs with a least solution; the shared `
    + `parameter's annotation is redundant in ${redundant}`);
}

// QT-strict's verdict-kind fixture (Contradiction in one order,
// Unresolved in another) under each variant: rejected in every order;
// how many kinds.
function kinds() {
  const f = JSON.parse(readFileSync(`${here}fixtures/order-S-shapes-1910`
    + '.json', 'utf8'));
  for (const [k, opts] of Object.entries(ADAPT)) {
    if (k === 'QS-EHZ') continue;
    const vs = f.orders.map(ix => verdictQT(f.hyp, ix.map(i => f.steps[i]),
      opts).v);
    expect(!vs.includes('accept'), `order-S-shapes-1910 under ${k}: `
      + `${vs.join(', ')} (${new Set(vs).size} kind(s))`);
  }
}

const run = { sym, generality, kinds }[process.argv[2]];
if (!run) throw new Error('usage: sym | generality | kinds');
run();
process.exitCode = failed ? 1 : 0;
