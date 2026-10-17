// PROTOTYPE for the open-row merge design (draft 2 onwards), not the
// compiler. Rows are { fields: [label], tails: [var] }; a var 'm<n>' is a
// meta, an uppercase name a rigid. Labels only: field types are ignored.
// This half holds the state and the facts on variables: lacks, apart
// pairs, upper bounds, the bind rule and creation-site disjointness.
// solver-solve.mjs holds equations, the sum rule and the drain.
// Differences from draft 1's solver: unify does not run wellFormed
// (creation sites do, driven by drive.mjs); no k x l expansion (forced
// constants are committed one at a time, a residue with metas on both
// sides and no constants stays pending as a quiet equation); upper bounds
// per meta from any residue; pending equations have identities, hold the
// residue only, are replaced on re-deferral, deduplicated by normal form
// and re-examined only when a meta they name changed.
import { unify } from './solver-solve.mjs';

export class Fail extends Error {
  constructor(kind, detail) {
    super(`${kind}: ${detail}`);
    this.kind = kind;
  }
}
export const isMeta = v => v.startsWith('m');
export const isLabel = c => /^[a-z]/.test(c) && !isMeta(c);
export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// hyp: { lacks: { R: [label] }, apart: ['R|S'] }; firstFresh numbers the
// solver's own metas; opts: { expand, noSumFacts }.
export const makeState = (hyp, firstFresh, opts = {}) => ({
  bound: new Map(), lacks: new Map(), apart: new Set(), upper: new Map(),
  pending: new Map(), nextId: 0, hyp, fresh: firstFresh, version: 0,
  touched: new Map(), opts,
  stats: { commits: 0, defers: 0, quiet: 0, fresh: 0, reexam: 0,
    maxPending: 0, sumFacts: 0, binds: 0, selfApart: 0, emptied: 0,
    narrowed: 0, oneMeta: 0, remainder: 0, cancelled: 0, sumBound: 0,
    sumLack: 0, sumApart: 0, noHome: 0, dedup: 0, steps: 0 },
});
export const freshMeta = st => {
  st.stats.fresh++;
  return `m${st.fresh++}`;
};
export const touch = (st, m) => {
  st.version++;
  st.touched.set(m, st.version);
};

export const flatten = (st, row) => {
  const fields = [...row.fields];
  const tails = [];
  const work = [...row.tails];
  while (work.length > 0) {
    const v = work.pop();
    const b = st.bound.get(v);
    if (b) {
      fields.push(...b.fields);
      work.push(...b.tails);
    } else tails.push(v);
  }
  return { fields: fields.sort(), tails: tails.sort() };
};

export const hypLacks = (st, r, l) => (st.hyp.lacks[r] ?? []).includes(l);
export const hypApart = (st, r, s) => st.hyp.apart.includes(pairKey(r, s));
export const lacksOf = (st, m) => st.lacks.get(m) ?? new Set();
export const partners = (st, v) => [...st.apart].map(k => k.split('|'))
  .filter(([a, b]) => a === v || b === v)
  .map(([a, b]) => (a === v ? b : a));
export const constantsOf = r =>
  [...r.fields, ...r.tails.filter(t => !isMeta(t))];

export const requireLacks = (st, v, l) => {
  if (!isMeta(v)) {
    if (!hypLacks(st, v, l)) throw new Fail('evidence', `${v} lacks ${l}`);
    return;
  }
  if (st.bound.has(v)) {
    const row = flatten(st, { fields: [], tails: [v] });
    if (row.fields.includes(l)) throw new Fail('lacks', `${v} has ${l}`);
    row.tails.forEach(t => requireLacks(st, t, l));
    return;
  }
  const set = lacksOf(st, v);
  if (!set.has(l)) {
    if (st.upper.has(v) && st.upper.get(v).has(l)) {
      // lacking a label removes it from the upper bound
      narrow(st, v, new Set([...st.upper.get(v)].filter(x => x !== l)));
      if (st.bound.has(v)) return requireLacks(st, v, l);
    }
    set.add(l);
    st.lacks.set(v, set);
    touch(st, v);
  }
};

const bare = (row, v) => row.tails.length === 1 && row.tails[0] === v
  && row.fields.length === 0;

export const requireApart = (st, v, w) => {
  const left = flatten(st, { fields: [], tails: [v] });
  const right = flatten(st, { fields: [], tails: [w] });
  if (!bare(left, v) || !bare(right, w)) {
    return requireDisjoint(st, left, right);
  }
  if (v === w) {
    if (isMeta(v)) {
      st.stats.selfApart++;
      return bind(st, v, { fields: [], tails: [] });
    }
    throw new Fail('evidence', `${v} disjoint ${v}`);
  }
  if (!isMeta(v) && !isMeta(w)) {
    if (!hypApart(st, v, w)) throw new Fail('evidence', `${v} disjoint ${w}`);
    return;
  }
  const key = pairKey(v, w);
  if (!st.apart.has(key)) {
    st.apart.add(key);
    if (isMeta(v)) touch(st, v);
    if (isMeta(w)) touch(st, w);
    // a rigid partner leaves the meta's upper bound
    for (const [m, r] of [[v, w], [w, v]]) {
      if (isMeta(m) && !isMeta(r) && st.upper.get(m)?.has(r)) {
        narrow(st, m, new Set([...st.upper.get(m)].filter(x => x !== r)));
      }
    }
  }
};

export const requireDisjoint = (st, one, other) => {
  const a = flatten(st, one);
  const b = flatten(st, other);
  const common = a.fields.filter(l => b.fields.includes(l));
  if (common.length) throw new Fail('overlap', common[0]);
  a.fields.forEach(l => b.tails.forEach(t => requireLacks(st, t, l)));
  b.fields.forEach(l => a.tails.forEach(t => requireLacks(st, t, l)));
  a.tails.forEach(t => b.tails.forEach(u => requireApart(st, t, u)));
};

// The obligation a row carries where it is made.
export const wellFormed = (st, row) => {
  const r = flatten(st, row);
  for (let i = 1; i < r.fields.length; i++) {
    if (r.fields[i] === r.fields[i - 1]) {
      throw new Fail('overlap', r.fields[i]);
    }
  }
  r.fields.forEach(l => r.tails.forEach(t => requireLacks(st, t, l)));
  for (let i = 0; i < r.tails.length; i++) {
    for (let j = i + 1; j < r.tails.length; j++) {
      requireApart(st, r.tails[i], r.tails[j]);
    }
  }
};

export const bind = (st, m, row) => {
  if (st.bound.has(m)) return unify(st, { fields: [], tails: [m] }, row);
  const image = flatten(st, row);
  if (image.tails.includes(m)) throw new Fail('mismatch', `occurs ${m}`);
  const lacked = lacksOf(st, m);
  const hit = image.fields.find(l => lacked.has(l));
  if (hit) throw new Fail('lacks', `${m} lacks ${hit}`);
  const up = st.upper.get(m);
  const consts = constantsOf(image);
  if (up && consts.some(x => !up.has(x))) {
    throw new Fail('upper', `${m} within {${[...up]}}`);
  }
  const mates = partners(st, m);
  mates.forEach(p => st.apart.delete(pairKey(m, p)));
  st.stats.binds++;
  st.bound.set(m, image);
  st.lacks.delete(m);
  st.upper.delete(m);
  touch(st, m);
  lacked.forEach(l => image.tails.forEach(t => requireLacks(st, t, l)));
  mates.forEach(p => requireDisjoint(st, image, { fields: [], tails: [p] }));
  wellFormed(st, image);
  if (up) {
    const rest = new Set([...up].filter(x => !consts.includes(x)));
    image.tails.filter(isMeta).forEach(t => narrow(st, t, rest));
  }
};

// Narrows m's upper bound to u (a bound meta passes it to its parts); a
// bound narrowed to nothing binds the meta to the empty row.
export const narrow = (st, m, u) => {
  if (st.bound.has(m)) {
    const r = flatten(st, { fields: [], tails: [m] });
    const consts = constantsOf(r);
    if (consts.some(x => !u.has(x))) throw new Fail('upper', `${m}`);
    const rest = new Set([...u].filter(x => !consts.includes(x)));
    return r.tails.filter(isMeta).forEach(t => narrow(st, t, rest));
  }
  const old = st.upper.get(m);
  let next = old ? new Set([...old].filter(x => u.has(x))) : new Set(u);
  // drop what the meta lacks or is apart from: they can never enter
  next = new Set([...next].filter(x => (isLabel(x)
    ? !lacksOf(st, m).has(x) : !partners(st, m).includes(x))));
  if (old && next.size === old.size) return;
  st.upper.set(m, next);
  st.stats.narrowed++;
  touch(st, m);
  if (next.size === 0) {
    st.stats.emptied++;
    bind(st, m, { fields: [], tails: [] });
  }
};
