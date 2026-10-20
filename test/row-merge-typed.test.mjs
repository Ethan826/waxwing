import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { classify, classifyEnd } from './row-merge-entry.mjs';
import { run as reference } from '../research/row-merge-typed/tr-cases.mjs';
import { canonical, least, namesOf, solutions, typing }
  from '../research/row-merge-typed/tr-oracle.mjs';
import { assocProblems, nestedProblems }
  from '../research/row-merge-typed/tr-gen.mjs';

// R005 Tranche B B3 follow-up (the user's review, 2026-10-19; plan §3.3,
// §3.4): unknown field types and nested rows, which labels-only problems
// cannot show. The families of research/row-merge-typed (fields `Int`,
// `Bool`, a type unknown, or a record whose row may have unknown tails;
// and three typed arguments merged in both groupings) go through the
// compiler's entry, rows made at every depth, and each run is judged:
//   reference  the research solver with Sym and H (B4; no rigid tail
//              here, so 2g cannot fire): accept, refuse and D4 against
//              accept, refuse and Unresolved;
//   H          a refusal has no solution (the typed oracle);
//   S/L        an accepted run's label sets are the least solution's;
//   G          its types are that solution's most general typing, up to
//              renaming (Robinson: the oracle's unifier per label sets);
//   mirror     (nested) the problem with its metas renamed in reverse
//              order, every merge's parts swapped, judged the same way.
// The read-back resolves types from the raw bindings itself.
const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const entry = await load('Features.Check.RowEntry');
const { Meta } = await load('Features.Check.Flex');
const { TInt, TBool, TVar, TRecord } = await load('Domain.Type.Core');
const { Tuple } = await load('Data.Tuple');

// Row unknowns m0 … m9 are metas 0 … 9; type unknowns t0, t1 are 20, 21.
const TYPE_BASE = 20;
const metaOf = name => new Meta(name.startsWith('t')
  ? TYPE_BASE + Number(name.slice(1)) : Number(name.slice(1)));
const tyOf = t => {
  if (t === 'Int') return TInt.value;
  if (t === 'Bool') return TBool.value;
  if (t.v) return TVar.create(metaOf(t.v));
  return TRecord.create(rowOf(t.rec));
};
const rowOf = r => entry.typedRow(r.fields.map(([k, t]) =>
  Tuple.create(k)(tyOf(t))))(r.tails.map(metaOf));

// One order through the compiler: 'accept', 'refuse', 'unresolved' or
// 'skipped' (a placeholder; none is expected since B4).
const compiled = steps => {
  let subst = entry.hypotheses([])([]);
  for (const c of steps) {
    const step = c.k === 'eq' ? entry.equate : entry.separate;
    const found = classify(entry.stepped(step(subst)(rowOf(c.l))(
      rowOf(c.r))));
    if ('skipped' in found) return { v: 'skipped' };
    if ('refuse' in found) return { v: 'refuse' };
    subst = found.subst;
  }
  const end = classifyEnd(entry.finish(subst));
  if ('skipped' in end) return { v: 'skipped' };
  if ('refuse' in end) return { v: 'refuse' };
  if ('unresolved' in end) return { v: 'unresolved' };
  return { v: 'accept', subst: end.subst };
};

// The state's answer in the oracle's terms, followed by this test.
const answer = (subst, names) => {
  const bound = new Map(entry.typeBindings(subst).map(b => [b.meta, b.ty]));
  const fields = row => [...row.fields.map(f => [f.value0, f.value1]),
    ...row.tails.flatMap(tail => tailFields(tail.value0))];
  const tailFields = meta => {
    const ty = bound.get(meta);
    if (!ty) return [];
    if (ty instanceof TRecord) return fields(ty.value0);
    return ty instanceof TVar ? tailFields(ty.value0.value0) : [];
  };
  const term = ty => {
    if (ty instanceof TVar) {
      const meta = ty.value0.value0;
      return bound.has(meta) ? term(bound.get(meta)) : { v: `_${meta}` };
    }
    if (ty instanceof TRecord) return recordTerm(fields(ty.value0));
    return { c: ty instanceof TBool ? 'Bool' : 'Int', args: [] };
  };
  const sorted = fs => [...fs].sort((x, y) => (x[0] < y[0] ? -1 : 1));
  const recordTerm = fs => ({ c: `Rec:${sorted(fs).map(f => f[0]).join()}`,
    args: sorted(fs).map(f => term(f[1])) });
  const rowFields = m => sorted(tailFields(metaOf(m).value0));
  return {
    sets: Object.fromEntries(names.metas.map(m => [m,
      rowFields(m).map(f => f[0])])),
    typed: canonical([...names.tvs.map(v => term(TVar.create(metaOf(v)))),
      ...names.metas.flatMap(m => rowFields(m).map(f => term(f[1])))]),
  };
};

const fromReference = { accept: 'accept', refuse: 'refuse',
  D4: 'unresolved' };
const bump = (t, k) => { t[k] = (t[k] ?? 0) + 1; };

function judge(t, meaning, programs) {
  const names = namesOf(meaning);
  const sols = solutions(meaning);
  const lst = least(sols, names.metas);
  for (const orders of programs) {
    for (const order of orders) {
      const found = compiled(order);
      bump(t, found.v);
      if (fromReference[reference(order, { sym: true, hEnd: true }).v]
        !== found.v) {
        bump(t, 'referenceDiff');
      }
      if (found.v === 'refuse' && sols.length) bump(t, 'H-violated');
      if (found.v !== 'accept') continue;
      const got = answer(found.subst, names);
      const same = lst && names.metas.every(m => got.sets[m].join()
        === lst.sets[m].join());
      if (!same) bump(t, 'S/L-violated');
      else if (got.typed !== typing(lst, names.metas, names.tvs)) {
        bump(t, 'G-violated');
      } else bump(t, 'G-checked');
    }
  }
}

// Metas renamed in reverse order: every merge's parts swapped.
const mirrored = steps => {
  const metas = namesOf(steps).metas;
  const rename = new Map(metas.map((m, i) => [m, metas[metas.length - 1 - i]]));
  const row = r => ({ fields: r.fields.map(([k, t]) => [k, t.rec
    ? { rec: row(t.rec) } : t]), tails: r.tails.map(m => rename.get(m)) });
  return steps.map(c => ({ ...c, l: row(c.l), r: row(c.r) }));
};

const DEFECTS = ['referenceDiff', 'H-violated', 'S/L-violated', 'G-violated'];
const defects = t => DEFECTS.filter(k => t[k]).map(k => `${k} ${t[k]}`);

// Problems per family in verify; the whole of the research README's sizes
// (nested 2,000 per seed, assoc 500) was run for the record
// (docs/progress.md "R005 Tranche B B3 follow-up").
// ROW_MERGE_TYPED_SCALE multiplies both (the record used 20/3 and 5).
const scale = Number(process.env.ROW_MERGE_TYPED_SCALE ?? 1);
const NESTED = Math.round(300 * scale);
const ASSOC = Math.round(100 * scale);

for (const seed of [1, 2]) {
  test(`nested typed rows, seed ${seed}: reference and oracle`, t => {
    const tally = {};
    for (const p of nestedProblems(seed, NESTED)) {
      judge(tally, p.meaning, p.programs);
      const swapped = mirrored(p.meaning);
      judge(tally, swapped, [[swapped]]);
    }
    t.diagnostic(JSON.stringify(tally));
    assert.deepEqual(defects(tally), []);
    assert.ok(tally['G-checked'] > 0 && tally.refuse > 0
      && tally.unresolved > 0 && !tally.skipped);
  });
}

test('three typed arguments in both groupings: reference and oracle', t => {
  const tally = {};
  for (const p of assocProblems(1, ASSOC)) judge(tally, p.meaning, p.programs);
  t.diagnostic(JSON.stringify(tally));
  assert.deepEqual(defects(tally), []);
  assert.ok(tally['G-checked'] > 0);
});
