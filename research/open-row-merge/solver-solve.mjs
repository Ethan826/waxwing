// PROTOTYPE, second half of the solver (see solver-facts.mjs): homes,
// the residue, the sum rule, equations, pending equations and the drain.
import {
  Fail, isMeta, isLabel, freshMeta, flatten, hypLacks, hypApart, lacksOf,
  partners, constantsOf, requireLacks, requireApart, bind, narrow,
} from './solver-facts.mjs';

// Whether constant c (a label or a rigid) may go into meta m.
const admits = (st, m, c) => {
  if (st.upper.has(m) && !st.upper.get(m).has(c)) return false;
  const mates = partners(st, m);
  if (isLabel(c)) {
    if (lacksOf(st, m).has(c)) return false;
    return mates.every(p => isMeta(p) || hypLacks(st, p, c));
  }
  if (mates.includes(c)) return false;
  for (const l of lacksOf(st, m)) if (!hypLacks(st, c, l)) return false;
  return mates.every(p => isMeta(p) || hypApart(st, c, p));
};

// Is v (meta or rigid) known disjoint from constant c?
const disjointFromConst = (st, v, c) => {
  if (isLabel(c)) {
    return isMeta(v) ? lacksOf(st, v).has(c) : hypLacks(st, v, c);
  }
  if (v === c) return false;
  if (isMeta(v)) return partners(st, v).includes(c);
  return hypApart(st, v, c);
};

const removeOnce = (list, x) => {
  const i = list.indexOf(x);
  if (i >= 0) list.splice(i, 1);
  return i >= 0;
};

const duplicateCheck = r => {
  for (let i = 1; i < r.fields.length; i++) {
    if (r.fields[i] === r.fields[i - 1]) {
      throw new Fail('overlap', r.fields[i]);
    }
  }
};

// Flatten, cancel common labels and common tails; the constants and metas
// left on each side.
export const residue = (st, left, right) => {
  const a = flatten(st, left);
  const b = flatten(st, right);
  [a, b].forEach(duplicateCheck);
  const onlyA = a.fields.filter(l => !b.fields.includes(l));
  const onlyB = b.fields.filter(l => !a.fields.includes(l));
  const ta = [...a.tails];
  const tb = [];
  b.tails.forEach(t => {
    if (!removeOnce(ta, t)) tb.push(t);
  });
  return {
    cancelled: b.tails.length - tb.length,
    c1: [...onlyA, ...ta.filter(v => !isMeta(v))].sort(),
    m1: ta.filter(isMeta),
    c2: [...onlyB, ...tb.filter(v => !isMeta(v))].sort(),
    m2: tb.filter(isMeta),
  };
};

const asRow = cs =>
  ({ fields: cs.filter(isLabel), tails: cs.filter(c => !isLabel(c)) });
const normalKey = r => {
  const one = `${r.c1.join(',')}/${r.m1.join(',')}`;
  const two = `${r.c2.join(',')}/${r.m2.join(',')}`;
  return one < two ? `${one}=${two}` : `${two}=${one}`;
};

// The sum rule: C1 + M1 = C2 + M2, so each m in M1 lies within C2 + M2.
const sumRule = (st, r) => {
  const v0 = st.version;
  for (const [ms, cs, os] of [[r.m1, r.c2, r.m2], [r.m2, r.c1, r.m1]]) {
    if (ms.length === 0) continue;
    // upper bound
    if (os.every(o => st.upper.has(o))) {
      const u = new Set([...cs, ...os.flatMap(o => [...st.upper.get(o)])]);
      for (const m of ms) {
        const v1 = st.version;
        if (!st.bound.has(m)) narrow(st, m, u);
        if (st.version !== v1) st.stats.sumBound++;
      }
    }
    if (st.opts.noSumFacts || os.length === 0) continue;
    // lacks: l not among cs, lacked by every o
    const common = [...lacksOf(st, os[0])].filter(l => os.every(o =>
      lacksOf(st, o).has(l)) && cs.every(c => (isLabel(c) ? c !== l
      : hypLacks(st, c, l))));
    for (const m of ms) {
      for (const l of common) {
        const v1 = st.version;
        if (!st.bound.has(m)) requireLacks(st, m, l);
        if (st.version !== v1) st.stats.sumLack++;
      }
    }
    // apart: q apart from every o and disjoint from every constant of cs
    const qs = partners(st, os[0]).filter(q => os.every(o =>
      partners(st, o).includes(q))
      && cs.every(c => disjointFromConst(st, q, c)));
    for (const m of ms) {
      for (const q of qs) {
        if (!st.bound.has(m) && (!isMeta(q) || !st.bound.has(q))) {
          const v1 = st.version;
          requireApart(st, m, q);
          if (st.version !== v1) st.stats.sumApart++;
        }
      }
    }
  }
  if (st.version !== v0) st.stats.sumFacts++;
  return st.version !== v0;
};

export const unify = (st, left, right, site = 'top') => {
  examine(st, { left, right, site }, null);
};

// Where each constant may go; throws when one has no home.
const homesOf = (st, { c1, m1, c2, m2 }) => {
  const plan = [];
  for (const [consts, metas] of [[c1, m2], [c2, m1]]) {
    for (const c of consts) {
      const cands = metas.filter(m => admits(st, m, c));
      if (cands.length === 0) {
        st.stats.noHome++;
        throw new Fail('mismatch', `no home for ${c}`);
      }
      plan.push({ c, cands });
    }
  }
  return plan;
};

// Defer: constants with several homes, or quiet (no constants). A fresh
// equation equal to a pending one is dropped; a re-examined one replaces
// its entry, or is dropped (the younger id) if it now equals another.
const defer = (st, eq, id, r, plan) => {
  const { c1, m1, c2, m2 } = r;
  const key = normalKey(r);
  const res = { left: { ...asRow(c1), tails: [...asRow(c1).tails, ...m1] },
    right: { ...asRow(c2), tails: [...asRow(c2).tails, ...m2] } };
  if (id === null) {
    const dup = [...st.pending.values()].find(p => p.key === key);
    if (dup) {
      st.stats.dedup++;
      return;
    }
    if (plan.length) st.stats.defers++; else st.stats.quiet++;
    const nid = st.nextId++;
    st.pending.set(nid, { ...res, key, site: eq.site, seen: st.version,
      quiet: plan.length === 0 });
    st.stats.maxPending = Math.max(st.stats.maxPending, st.pending.size);
  } else {
    const dup = [...st.pending.entries()]
      .find(([k, p]) => k !== id && p.key === key);
    if (dup) {
      st.stats.dedup++;
      st.pending.delete(Math.max(id, dup[0]));
      return;
    }
    const old = st.pending.get(id);
    st.pending.set(id, { ...res, key, site: old.site, seen: st.version,
      quiet: plan.length === 0 });
  }
};

// Examine an equation (fresh, or pending under id).
export const examine = (st, eq, id) => {
  for (;;) {
    st.stats.steps++;
    const r = residue(st, eq.left, eq.right);
    const { c1, m1, c2, m2 } = r;
    st.stats.cancelled += r.cancelled;
    const drop = () => {
      if (id !== null) st.pending.delete(id);
    };
    if (!c1.length && !c2.length && !m1.length && !m2.length) return drop();
    if ((m2.length === 0 && c1.length) || (m1.length === 0 && c2.length)) {
      st.stats.noHome++;
      throw new Fail('mismatch', `no home for ${(m2.length ? c2 : c1)[0]}`);
    }
    if (sumRule(st, r)) continue;
    // a side that is one meta and nothing else takes the other side
    if (m1.length === 1 && c1.length === 0) {
      st.stats.oneMeta++;
      drop();
      return bind(st, m1[0],
        { ...asRow(c2), tails: [...asRow(c2).tails, ...m2] });
    }
    if (m2.length === 1 && c2.length === 0) {
      st.stats.oneMeta++;
      drop();
      return bind(st, m2[0],
        { ...asRow(c1), tails: [...asRow(c1).tails, ...m1] });
    }
    const plan = homesOf(st, r);
    // one meta each side, both with constants: one shared remainder
    if (m1.length === 1 && m2.length === 1) {
      st.stats.remainder++;
      drop();
      const z = freshMeta(st);
      const a = asRow(c2), b = asRow(c1);
      bind(st, m1[0], { fields: a.fields, tails: [...a.tails, z] });
      bind(st, m2[0], { fields: b.fields, tails: [...b.tails, z] });
      return;
    }
    const forced = plan.find(p => p.cands.length === 1);
    if (forced) {
      st.stats.commits++;
      const z = freshMeta(st);
      const a = asRow([forced.c]);
      bind(st, forced.cands[0], { fields: a.fields, tails: [...a.tails, z] });
      continue;
    }
    return defer(st, eq, id, r, plan);
  }
};
