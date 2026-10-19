// The adopted configuration (QT-strict + Sym + H, implementation plan
// docs/plans/2026-10-19-row-merge-implementation-plan.md §2) with field
// types: a field's type is `Int`, `Bool`, a type unknown `{ v }` or a
// record `{ rec: row }`, so rows nest. Written for Task B0's evidence on
// unknown field types and nested rows, independently of
// research/row-merge-qt (whose rows are labels). No rigid tails: those
// stay covered by research/row-merge-qt's labels-only domains.
//   - a row is { fields: [[label, type]], tails: [meta] }; a row made
//     with two or more unknown tails becomes one fresh unknown and
//     `Merge` predicates folded from the left, its parts required
//     disjoint (plan §2.1), at every depth;
//   - unification: types structurally; rows by ADR 013's one-unknown
//     rules after cancelling common labels (their types unified) and
//     common tails; occurs checks for type and row unknowns;
//   - facts: lacks and pairs on unknowns, re-required on an image (the
//     bind rule); a meta apart from itself keeps the pair (no N5);
//   - predicates: PureScript's cases 1-3 on (left, right), then, with
//     `sym`, on (right, left); full rescan; at the end, with `hEnd`, H.
export class Fail extends Error {}
export class Broken extends Error {}

export const tailRow = m => ({ fields: [], tails: [m] });
const byLabel = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const has = (fs, k) => fs.some(([j]) => j === k);
const typeOf = (fs, k) => fs.find(([j]) => j === k)[1];
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const makeState = (opts = {}) => ({ rb: new Map(), tb: new Map(),
  excl: new Map(), pairs: new Set(), preds: [], fresh: 0, ver: 0,
  sym: opts.sym ?? false, hEnd: opts.hEnd ?? false });

const freshMeta = st => `m${1000 + st.fresh++}`;
const walk = (st, t) => {
  while (t && t.v && st.tb.has(t.v)) t = st.tb.get(t.v);
  return t;
};

export function flat(st, row) {
  const fields = [...row.fields], tails = [], work = [...row.tails];
  while (work.length) {
    const m = work.pop();
    const b = st.rb.get(m);
    if (b) {
      fields.push(...b.fields);
      work.push(...b.tails);
    } else tails.push(m);
  }
  fields.sort(byLabel);
  for (let i = 1; i < fields.length; i++) {
    if (fields[i][0] === fields[i - 1][0]) throw new Fail('duplicate');
  }
  return { fields, tails: tails.sort() };
}

// Whether type or row unknown `name` occurs in `t`, through bindings.
function mentions(st, t, name, seen = new Set()) {
  t = walk(st, t);
  if (typeof t === 'string') return false;
  if (t.v) return t.v === name;
  return rowMentions(st, t.rec, name, seen);
}
function rowMentions(st, row, name, seen) {
  for (const m of row.tails) {
    if (m === name) return true;
    if (seen.has(m)) continue;
    seen.add(m);
    const b = st.rb.get(m);
    if (b && rowMentions(st, b, name, seen)) return true;
  }
  return row.fields.some(([, t]) => mentions(st, t, name, seen));
}

export function unifyTy(st, a, b) {
  a = walk(st, a);
  b = walk(st, b);
  if (a === b || (a.v && a.v === b.v)) return;
  if (a.v || b.v) {
    const [v, t] = a.v ? [a.v, b] : [b.v, a];
    if (mentions(st, t, v)) throw new Fail(`occurs: ${v}`);
    st.tb.set(v, t);
    st.ver++;
    return;
  }
  if (typeof a === 'string' || typeof b === 'string') {
    if (a !== b) throw new Fail('type mismatch');
    return;
  }
  unifyRow(st, a.rec, b.rec);
}

const minus = (xs, ys) => {
  const rest = [...ys], out = [];
  for (const x of xs) {
    const i = rest.indexOf(x);
    if (i >= 0) rest.splice(i, 1); else out.push(x);
  }
  return out;
};

export function unifyRow(st, L, R) {
  const done = new Set();
  for (;;) {
    const l = flat(st, L), r = flat(st, R);
    const fresh = l.fields.filter(([k]) => has(r.fields, k) && !done.has(k));
    if (fresh.length) {
      for (const [k, t] of fresh) {
        done.add(k);
        unifyTy(st, t, typeOf(r.fields, k));
      }
      continue;
    }
    const lx = l.fields.filter(([k]) => !has(r.fields, k));
    const rx = r.fields.filter(([k]) => !has(l.fields, k));
    const lt = minus(l.tails, r.tails), rt = minus(r.tails, l.tails);
    if ((lx.length && !rt.length) || (rx.length && !lt.length)) {
      throw new Fail('mismatch');
    }
    if (!lt.length && !rt.length) return;
    if (lt.length > 1 || rt.length > 1) throw new Broken('two unknowns');
    if (lt.length && !lx.length) {
      bindRow(st, lt[0], { fields: rx, tails: rt });
      return;
    }
    if (rt.length && !rx.length) {
      bindRow(st, rt[0], { fields: lx, tails: lt });
      return;
    }
    bindRow(st, lt[0], { fields: rx, tails: [freshMeta(st)] });
  }
}

function addLack(st, m, k) {
  const s = st.excl.get(m) ?? new Set();
  if (s.has(k)) return;
  s.add(k);
  st.excl.set(m, s);
  st.ver++;
}

export function lackIn(st, row, k) {
  const f = flat(st, row);
  if (has(f.fields, k)) throw new Fail(`lacks: ${k}`);
  for (const m of f.tails) addLack(st, m, k);
}

export function requireDisjoint(st, A, B) {
  const a = flat(st, A), b = flat(st, B);
  for (const [k] of a.fields) if (has(b.fields, k)) throw new Fail('overlap');
  for (const [k] of a.fields) for (const m of b.tails) addLack(st, m, k);
  for (const [k] of b.fields) for (const m of a.tails) addLack(st, m, k);
  for (const m of a.tails) {
    for (const n of b.tails) {
      if (!st.pairs.has(pairKey(m, n))) {
        st.pairs.add(pairKey(m, n));
        st.ver++;
      }
    }
  }
}

export function wellFormed(st, row) {
  const f = flat(st, row);
  for (const [k] of f.fields) for (const m of f.tails) addLack(st, m, k);
  for (let i = 0; i < f.tails.length; i++) {
    for (let j = i + 1; j < f.tails.length; j++) {
      requireDisjoint(st, tailRow(f.tails[i]), tailRow(f.tails[j]));
    }
  }
}

// The bind rule: the meta's lacks and pairs re-required on its image.
function bindRow(st, m, row) {
  const img = flat(st, row);
  if (img.tails.includes(m) || img.fields.some(([, t]) => mentions(st, t,
    m))) throw new Fail(`occurs: ${m}`);
  const ex = [...(st.excl.get(m) ?? [])];
  if (img.fields.some(([k]) => ex.includes(k))) throw new Fail('lacks');
  const partners = [...st.pairs].filter(k => k.split('|').includes(m));
  for (const k of partners) st.pairs.delete(k);
  st.excl.delete(m);
  st.rb.set(m, img);
  st.ver++;
  for (const k of ex) for (const n of img.tails) addLack(st, n, k);
  for (const k of partners) {
    const other = k.split('|').find(x => x !== m) ?? m;
    requireDisjoint(st, img, tailRow(other));
  }
  wellFormed(st, img);
}

// A written row as the checker makes it (plan §2.1), at every depth.
export function made(st, row) {
  const fields = row.fields.map(([k, t]) => [k, madeTy(st, t)]);
  let acc = null;
  for (const m of row.tails) {
    if (acc === null) acc = m;
    else {
      const t = freshMeta(st);
      st.preds.push({ r: tailRow(acc), s: tailRow(m), t: tailRow(t) });
      requireDisjoint(st, tailRow(acc), tailRow(m));
      acc = t;
    }
  }
  const out = { fields, tails: acc === null ? [] : [acc] };
  wellFormed(st, out);
  return out;
}
const madeTy = (st, t) => (t.rec ? { rec: made(st, t.rec) } : t);

export { has, typeOf, minus, freshMeta, pairKey };
