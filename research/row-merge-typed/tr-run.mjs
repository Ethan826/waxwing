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
import { assocProblems, nestedProblems } from './tr-gen.mjs';

const VARIANTS = { 'QT-strict': {}, '+Sym': { sym: true },
  '+H': { hEnd: true }, '+Sym+H': { sym: true, hEnd: true } };
const BASE = { '+H': 'QT-strict', '+Sym+H': '+Sym' };

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

function nested(seed, n, out) {
  for (const p of nestedProblems(seed, n)) {
    one(out, p.meaning, p.programs, p.mirror);
  }
}

function assoc(seed, n, out) {
  for (const p of assocProblems(seed, n)) one(out, p.meaning, p.programs);
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
