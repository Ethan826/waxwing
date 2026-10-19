// Predicates and the driver for tr-solver.mjs: PureScript 0.15.16's
// `unionRows` cases (Entailment.hs lines 636-672; plan §2.3) on
// (left, right), Sym's mirror on (right, left), a full rescan after
// each step, and at the end H (classification only). With no rigid
// tail, case 1g is case 1 (a part with no unknown is closed).
import {
  Fail, flat, unifyRow, unifyTy, made, requireDisjoint, lackIn, wellFormed,
  tailRow, has, typeOf, freshMeta,
} from './tr-solver.mjs';
import { makeState } from './tr-solver.mjs';

function oriented(st, p, a, b) {
  const L = flat(st, p[a]), R = flat(st, p[b]), T = flat(st, p.t);
  if (!L.tails.length) {
    unifyRow(st, p.t, { fields: [...L.fields, ...R.fields],
      tails: R.tails });
    return 'done';
  }
  if (!R.tails.length && !T.tails.length) {
    if (!R.fields.every(([k]) => has(T.fields, k))) return 'wait';
    for (const [k, t] of R.fields) unifyTy(st, t, typeOf(T.fields, k));
    unifyRow(st, p[a], { fields: T.fields.filter(([k]) =>
      !has(R.fields, k)), tails: [] });
    return 'done';
  }
  if (!L.fields.length) return 'wait';
  const u = freshMeta(st);
  const moved = { fields: L.fields, tails: [u] };
  wellFormed(st, moved);
  unifyRow(st, p.t, moved);
  p[a] = { fields: [], tails: L.tails };
  p.t = tailRow(u);
  st.ver++;
  return 'moved';
}

function improve(st) {
  for (;;) {
    const before = st.ver;
    for (const p of [...st.preds]) {
      if (!st.preds.includes(p)) continue;
      let r = oriented(st, p, 'r', 's');
      if (r === 'wait' && st.sym) r = oriented(st, p, 's', 'r');
      if (r === 'done') st.preds = st.preds.filter(q => q !== p);
    }
    if (st.ver === before) return;
  }
}

// H: a label on one side of a waiting predicate, after cancelling by
// name, that every unknown of the other side lacks.
function homeless(st, p) {
  const R = flat(st, p.r), S = flat(st, p.s), T = flat(st, p.t);
  const left = [...R.fields, ...S.fields].map(([k]) => k);
  const right = T.fields.map(([k]) => k);
  const lm = [...R.tails, ...S.tails], rm = T.tails;
  const lacks = (m, k) => st.excl.get(m)?.has(k) ?? false;
  const lone = (ks, os, ms) => ks.filter(k => !os.includes(k))
    .some(k => ms.every(m => lacks(m, k)));
  return lone(left, right, rm.filter(m => !lm.includes(m)))
    || lone(right, left, lm.filter(m => !rm.includes(m)));
}

// One problem in one order: { v: accept | refuse | D4, st }.
export function run(steps, opts = {}) {
  const st = makeState(opts);
  try {
    for (const c of steps) {
      if (c.k === 'eq') {
        const l = made(st, c.l), r = made(st, c.r);
        improve(st);
        unifyRow(st, l, r);
      } else if (c.k === 'dis') {
        requireDisjoint(st, made(st, c.l), made(st, c.r));
      } else lackIn(st, tailRow(c.v), c.l);
      improve(st);
    }
    improve(st);
  } catch (e) {
    if (e instanceof Fail) return { v: 'refuse', why: e.message, st };
    throw e;
  }
  if (!st.preds.length) return { v: 'accept', st };
  if (st.hEnd && st.preds.some(p => homeless(st, p))) {
    return { v: 'refuse', why: 'no home', st };
  }
  return { v: 'D4', st };
}

// The read-back the oracle checks: each meta's labels and each field's
// type, resolved through the state's bindings by this function itself
// (unbound row unknowns are `{}`; unbound type unknowns stay unknown).
export function readBack(st, metas, tvs) {
  const ty = t => {
    while (t.v && st.tb.has(t.v)) t = st.tb.get(t.v);
    if (typeof t === 'string' || t.v) return t;
    return { rec: rowOf(t.rec) };
  };
  const raw = row => [...row.fields, ...row.tails.flatMap(m =>
    (st.rb.has(m) ? raw(st.rb.get(m)) : []))];
  const rowOf = row => ({ fields: raw(row).map(([k, t]) => [k, ty(t)])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1)) });
  return { rows: Object.fromEntries(metas.map(m => [m,
    rowOf(tailRow(m)).fields])), tys: Object.fromEntries(tvs.map(v =>
    [v, ty({ v })])) };
}
