// Families for tr-solver.mjs against tr-oracle.mjs (implementation plan
// Task B0: unknown field types, nested rows, association).
//   nested <seed> <n>  random problems over labels a, b: fields typed
//                      Int, Bool, a type unknown or a record whose row
//                      may itself have unknown tails; two to four steps;
//                      every order, and the problem with every row's
//                      tails reversed (swapped merge arguments)
//   assoc <seed> <n>   three typed arguments A, B, C and a result T over
//                      labels a, b, c, merged as merge(merge(X, Y), Z)
//                      and merge(X, merge(Y, Z)) for every order X, Y, Z
//                      of A, B, C (12 programs), every program in two
//                      orders; judged against the one meaning, T = A ⊎ B
//                      ⊎ C with the parts pairwise disjoint
// Per variant (QT-strict, +Sym, +H, +Sym+H): verdicts; `S/L/G-violated`
// (an accepted answer's label sets are not the least solution's, or its
// types are not that solution's most general typing up to renaming);
// `H-violated` (a refusal with a solution); `acceptDiff` and `kindDiff`
// across the orders and programs of one problem; `mirrorDiff`; for the
// +H variants `baseDiff` (acceptance or answer differs from the variant
// without H) and `H:newWithSolution`. Exit 1 on any violation, any
// `acceptDiff` or `mirrorDiff` of +Sym+H, or any `baseDiff`.
// Usage: node tr-run.mjs nested|assoc <seed> <n>
import { run, readBack } from './tr-cases.mjs';
import { solutions, least, namesOf, canonical, typing } from './tr-oracle.mjs';

const VARIANTS = { 'QT-strict': {}, '+Sym': { sym: true },
  '+H': { hEnd: true }, '+Sym+H': { sym: true, hEnd: true } };
const BASE = { '+H': 'QT-strict', '+Sym+H': '+Sym' };

const mulberry = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));

function gen(rand, labels, nested) {
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const ty = depth => {
    const r = rand();
    if (r < 0.3) return 'Int';
    if (r < 0.45) return 'Bool';
    if (r < 0.75 || depth > 0 || !nested.length) {
      return { v: pick(['t0', 't1']) };
    }
    return { rec: row(depth + 1, nested) };
  };
  const row = (depth, ms) => {
    const fields = labels.filter(() => rand() < 0.35).map(k => [k, ty(depth)]);
    const n = Math.floor(rand() * 3);
    const tails = [...new Set([...Array(n)].map(() => pick(ms)))];
    return { fields, tails };
  };
  return { row, ty };
}

// The solver's typing in the oracle's terms.
const toTerm = t => (typeof t === 'string' ? { c: t, args: [] } : t.v ? t
  : { c: `Rec:${t.rec.fields.map(([k]) => k).join(',')}`,
    args: t.rec.fields.map(([, x]) => toTerm(x)) });

function judge(tally, steps, sols, lst, names, r) {
  const t = tally;
  t[r.v] = (t[r.v] ?? 0) + 1;
  if (r.v === 'refuse' && sols.length) t['H-violated'] = (t['H-violated']
    ?? 0) + 1;
  if (r.v !== 'accept') return r.v;
  const back = readBack(r.st, names.metas, names.tvs);
  const sets = Object.fromEntries(names.metas.map(m => [m,
    back.rows[m].map(([k]) => k)]));
  const typed = canonical([...names.tvs.map(v => toTerm(back.tys[v])),
    ...names.metas.flatMap(m => back.rows[m].map(([, x]) => toTerm(x)))]);
  const same = lst && names.metas.every(m => sets[m].join()
    === lst.sets[m].join());
  if (!same) t['S/L-violated'] = (t['S/L-violated'] ?? 0) + 1;
  else if (typed !== typing(lst, names.metas, names.tvs)) {
    t['G-violated'] = (t['G-violated'] ?? 0) + 1;
  }
  return `accept ${JSON.stringify(sets)} ${typed}`;
}

const bump = (t, k) => { t[k] = (t[k] ?? 0) + 1; };

// One problem: `programs` (lists of steps meaning the same thing) each
// in its orders; `mirror` the reversed-tails program, if any.
function one(out, meaning, programs, mirror) {
  const names = namesOf(meaning);
  const sols = solutions(meaning);
  const lst = least(sols, names.metas);
  const keys = {};
  for (const [k, opts] of Object.entries(VARIANTS)) {
    keys[k] = programs.flatMap(orders => orders.map(o =>
      judge(out[k], meaning, sols, lst, names, run(o, opts))));
    const acc = new Set(keys[k].map(x => (x.startsWith('accept') ? x : 'no')));
    if (acc.size > 1) bump(out[k], 'acceptDiff');
    const rej = keys[k].filter(x => !x.startsWith('accept'));
    if (rej.length === keys[k].length && new Set(rej).size > 1) {
      bump(out[k], 'kindDiff');
    }
    if (mirror && judge({}, meaning, sols, lst, names, run(mirror, opts))
      !== keys[k][0]) bump(out[k], 'mirrorDiff');
  }
  for (const [k, b] of Object.entries(BASE)) {
    keys[k].forEach((x, i) => {
      const y = keys[b][i];
      if ((x.startsWith('accept') || y.startsWith('accept')) && x !== y) {
        bump(out[k], 'baseDiff');
      }
      if (x === 'refuse' && y === 'D4') {
        bump(out[k], 'H:new');
        if (sols.length) bump(out[k], 'H:newWithSolution');
      }
    });
  }
  bump(out.oracle, sols.length === 0 ? 'none' : lst ? 'least' : 'noLeast');
  const rows = [];
  const visit = (r, d) => {
    rows.push([r, d]);
    r.fields.forEach(([, t]) => t.rec && visit(t.rec, d + 1));
  };
  meaning.forEach(c => c.k !== 'lacks' && (visit(c.l, 0), visit(c.r, 0)));
  if (rows.some(([r, d]) => d && r.tails.length > 1)) {
    bump(out.oracle, 'withNestedMerge');
  }
  if (rows.some(([r]) => r.fields.some(([, t]) => t.v))) {
    bump(out.oracle, 'withTypeUnknown');
  }
}

const reverse = steps => steps.map(c => (c.k === 'lacks' ? c
  : { ...c, l: flipRow(c.l), r: flipRow(c.r) }));
const flipRow = r => ({ fields: r.fields.map(([k, t]) => [k, t.rec
  ? { rec: flipRow(t.rec) } : t]), tails: [...r.tails].reverse() });

function nested(seed, n, out) {
  const rand = mulberry(seed);
  const g = gen(rand, ['a', 'b'], ['m3', 'm4']);
  for (let i = 0; i < n; i++) {
    const steps = i % 2 ? planted(rand) : [...Array(2 + Math.floor(rand()
      * 3))].map(() => ({ k: rand() < 0.25 ? 'dis' : 'eq',
      l: g.row(0, ['m0', 'm1', 'm2']), r: g.row(0, ['m0', 'm1', 'm2']) }));
    one(out, steps, [perms(steps).slice(0, 24)], reverse(steps));
  }
}

// A problem with a planted solution: each unknown gets labels with Int or
// Bool, each type unknown a type; equations rewrite a row by expanding
// some unknowns into their planted fields, writing a type as its type
// unknown at random, at both depths.
function planted(rand) {
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const val = ms => Object.fromEntries(ms.map(m => [m, ['a', 'b']
    .filter(() => rand() < 0.4).map(k => [k, pick(['Int', 'Bool'])])]));
  const plant = { ...val(['m0', 'm1', 'm2']), ...val(['m3', 'm4']) };
  const tv = { t0: pick(['Int', 'Bool']), t1: pick(['Int', 'Bool']) };
  const write = t => {
    const vs = Object.keys(tv).filter(v => tv[v] === t);
    return vs.length && rand() < 0.5 ? { v: pick(vs) } : t;
  };
  const row = (ms, depth) => {
    const tails = [], used = new Set();
    for (const m of ms) {
      if (rand() < 0.45 && plant[m].every(([k]) => !used.has(k))) {
        tails.push(m);
        plant[m].forEach(([k]) => used.add(k));
      }
    }
    const fields = ['a', 'b'].filter(k => !used.has(k) && rand() < 0.4)
      .map(k => [k, depth === 0 && rand() < 0.3
        ? { rec: row(['m3', 'm4'], 1) } : pick(['Int', 'Bool'])]);
    return { fields, tails };
  };
  const rewrite = r => {
    const fields = r.fields.map(([k, t]) => [k, t.rec
      ? { rec: rewrite(t.rec) } : write(t)]);
    const tails = [];
    for (const m of r.tails) {
      if (rand() < 0.5) tails.push(m);
      else fields.push(...plant[m].map(([k, t]) => [k, write(t)]));
    }
    return { fields, tails };
  };
  return [...Array(2 + Math.floor(rand() * 3))].map(() => {
    const l = row(['m0', 'm1', 'm2'], 0);
    if (rand() < 0.2) return { k: 'dis', l, r: { fields: [], tails: [] } };
    return rand() < 0.5 ? { k: 'eq', l, r: rewrite(l) }
      : { k: 'eq', l: rewrite(l), r: l };
  });
}

function assoc(seed, n, out) {
  const rand = mulberry(seed);
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const both = (x, y) => ({ fields: [...x.fields, ...y.fields],
    tails: [...x.tails, ...y.tails] });
  const v = { fields: [], tails: ['m9'] };
  for (let i = 0; i < n; i++) {
    const args = [0, 1, 2].map(j => ({ fields: [],
      tails: rand() < 0.7 ? [`m${j}`] : [] }));
    const T = { fields: [], tails: [] };
    for (const k of ['a', 'b', 'c']) {
      const t = pick(['Int', 'Bool', { v: pick(['t0', 't1']) },
        { rec: { fields: [['a', 'Int']], tails: rand() < 0.5
          ? ['m5', 'm6'] : ['m5'] } }]);
      const owner = Math.floor(rand() * 5);
      if (owner < 3) args[owner].fields.push([k, t]);
      if (owner < 4 && rand() < 0.6) T.fields.push([k, rand() < 0.1
        ? 'Bool' : t]);
      else if (owner < 4 || rand() < 0.2) T.tails = ['m3'];
    }
    if (rand() < 0.3) T.tails = ['m3'];
    const [A, B, C] = args;
    const meaning = [{ k: 'dis', l: A, r: B }, { k: 'dis', l: A, r: C },
      { k: 'dis', l: B, r: C }, { k: 'eq', l: T, r: both(both(A, B), C) }];
    const programs = perms([A, B, C]).flatMap(([X, Y, Z]) => [
      [{ k: 'dis', l: X, r: Y }, { k: 'eq', l: v, r: both(X, Y) },
        { k: 'dis', l: v, r: Z }, { k: 'eq', l: T, r: both(v, Z) }],
      [{ k: 'dis', l: Y, r: Z }, { k: 'eq', l: v, r: both(Y, Z) },
        { k: 'dis', l: X, r: v }, { k: 'eq', l: T, r: both(X, v) }]]);
    one(out, meaning, programs.map(p => [p, [...p].reverse()]));
  }
}

const out = { oracle: {}, ...Object.fromEntries(Object.keys(VARIANTS)
  .map(k => [k, {}])) };
const [mode, seed, n] = process.argv.slice(2);
const family = { nested, assoc }[mode];
if (!family) throw new Error('usage: nested|assoc <seed> <n>');
const start = Date.now();
family(Number(seed ?? 1), Number(n ?? 500), out);
for (const [k, t] of Object.entries(out)) console.log(k, JSON.stringify(t));
console.log(`ms ${Date.now() - start}`);
const adopted = out['+Sym+H'];
const bad = Object.values(out).some(t => t['S/L-violated'] || t['G-violated']
  || t['H-violated'] || t['H:newWithSolution'] || t.baseDiff)
  || adopted.acceptDiff || adopted.mirrorDiff;
process.exitCode = bad ? 1 : 0;
