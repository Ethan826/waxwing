// Alternative A of docs/plans/2026-10-18-row-merge-alternatives.md, as a
// labels-only toy in the encoding of research/open-row-merge (README,
// "Encoding"). Splits are never inferred: an equation is solved only by
// the one-tail rules of ADR 013 after cancellation (a side that is one
// meta alone is bound to the other side; one meta on each side shares a
// fresh remainder; metas against nothing are all {}); anything else
// waits and is re-examined, by a full rescan, after every step. At the
// end every unsolved meta defaults to {} and each waiting equation is
// checked under that default: all hold => accept (the default is then
// the least solution), else Unresolved.
// The facts (lacks, apart pairs, hypotheses on rigids) and the bind rule
// are Tranche B Tasks 1-3's, kept. Not here: the sum rule, upper bounds,
// homes and commits (Task 4), normal forms and the wake-up index (Task 5).
// Modes: 'defer' (A, the default) and 'eager' (A0: an equation that
// would wait with a constant opposite two or more metas is Unresolved at
// once; equations with no constants still wait). `noHome: false` drops
// the one necessary-condition check (a constant every opposite meta
// already excludes is a contradiction); `commit: true` is variant AH.
export class Fail extends Error {}
export class Split extends Error {}
const isMeta = v => /^m/.test(v);
const isLab = a => /^[a-z]/.test(a);
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const tailRow = t => ({ fields: [], tails: [t] });

export const makeState = (hyp, opts = {}) => ({ hyp, bind: new Map(),
  excl: new Map(), pairs: new Set(), pending: [], fresh: 0, version: 0,
  mode: opts.mode ?? 'defer', noHome: opts.noHome ?? true,
  commit: opts.commit ?? false });

export function flatten(st, row) {
  const fields = [...row.fields], tails = [], work = [...row.tails];
  while (work.length) {
    const t = work.pop();
    const b = isMeta(t) && st.bind.get(t);
    if (b) {
      fields.push(...b.fields);
      work.push(...b.tails);
    } else tails.push(t);
  }
  return { fields: fields.sort(), tails: tails.sort() };
}

const hypLacks = (st, r, l) => (st.hyp.lacks[r] || []).includes(l);
const hypApart = (st, r, s) => (st.hyp.apart || [])
  .some(p => key(p[0], p[1]) === key(r, s));
const excludes = (st, m, a) => st.excl.get(m)?.has(a) ?? false;

function addExcl(st, m, a) {
  const s = st.excl.get(m) ?? new Set();
  if (s.has(a)) return;
  s.add(a);
  st.excl.set(m, s);
  st.version++;
}

// Two atoms (unbound metas or rigids) made apart.
function apartAtoms(st, t, u) {
  if (t === u) {
    if (!isMeta(t)) throw new Fail(`self: ${t}`);
    bindMeta(st, t, { fields: [], tails: [] });
  } else if (!isMeta(t) && !isMeta(u)) {
    if (!hypApart(st, t, u)) throw new Fail(`evidence: ${t} # ${u}`);
  } else if (!isMeta(t)) addExcl(st, u, t);
  else if (!isMeta(u)) addExcl(st, t, u);
  else if (!st.pairs.has(key(t, u))) {
    st.pairs.add(key(t, u));
    st.version++;
  }
}

function lackAtom(st, t, l) {
  if (isMeta(t)) addExcl(st, t, l);
  else if (!hypLacks(st, t, l)) throw new Fail(`lacks: ${t} has ${l}`);
}

// The decomposition of design §3.1, re-flattening before each part, so
// a meta bound meanwhile (x # x forces {}) is followed.
export function requireDisjoint(st, L, R) {
  const l = flatten(st, L), r = flatten(st, R);
  for (const a of l.fields) {
    if (r.fields.includes(a)) throw new Fail(`overlap: ${a}`);
  }
  const cross = (fs, ts) => {
    for (const a of fs) for (const t of ts) lackIn(st, t, a);
  };
  cross(l.fields, r.tails);
  cross(r.fields, l.tails);
  for (const t of l.tails) for (const u of r.tails) apartIn(st, t, u);
}

function lackIn(st, t, l) {
  const f = flatten(st, tailRow(t));
  if (f.fields.includes(l)) throw new Fail(`overlap: ${l}`);
  for (const u of f.tails) lackAtom(st, u, l);
}

function apartIn(st, t, u) {
  const f = flatten(st, tailRow(t)), g = flatten(st, tailRow(u));
  const atom = x => x.fields.length === 0 && x.tails.length === 1;
  if (atom(f) && atom(g)) apartAtoms(st, f.tails[0], g.tails[0]);
  else requireDisjoint(st, f, g);
}

// A row's own disjointness, recorded where the row is made (§1.4).
export function wellFormed(st, row) {
  const f = flatten(st, row);
  if (new Set(f.fields).size !== f.fields.length) {
    throw new Fail('duplicate label');
  }
  for (const t of f.tails) for (const a of f.fields) lackIn(st, t, a);
  for (let i = 0; i < f.tails.length; i++) {
    for (let j = i + 1; j < f.tails.length; j++) {
      apartIn(st, f.tails[i], f.tails[j]);
    }
  }
}

// The bind rule of design §3.2 without upper bounds: the meta's
// exclusions and apart partners are re-required on its image.
function bindMeta(st, m, row) {
  const img = flatten(st, row);
  if (img.tails.includes(m)) throw new Fail(`occurs: ${m}`);
  const ex = [...(st.excl.get(m) ?? [])];
  const partners = [...st.pairs].filter(k => k.split('|').includes(m));
  for (const k of partners) st.pairs.delete(k);
  st.excl.delete(m);
  st.bind.set(m, img);
  st.version++;
  for (const a of ex) {
    requireDisjoint(st, img, isLab(a) ? { fields: [a], tails: [] }
      : tailRow(a));
  }
  for (const k of partners) {
    requireDisjoint(st, img, tailRow(k.split('|').find(x => x !== m)));
  }
  wellFormed(st, img);
}

const minus = (xs, ys) => {
  const rest = [...ys], out = [];
  for (const x of xs) {
    const i = rest.indexOf(x);
    if (i >= 0) rest.splice(i, 1); else out.push(x);
  }
  return out;
};

const homeless = (st, consts, metas) => consts.some(c =>
  metas.length > 0 && metas.every(m => excludes(st, m, c)));

// Variant AH only: a constant that all opposite metas but one already
// exclude is committed to that one (Task 4's commit, without bounds).
function commitOne(st, consts, metas) {
  for (const c of consts) {
    const homes = metas.filter(m => !excludes(st, m, c));
    if (homes.length !== 1) continue;
    const z = `m${100 + st.fresh++}`;
    bindMeta(st, homes[0], isLab(c) ? { fields: [c], tails: [z] }
      : { fields: [], tails: [c, z] });
    return true;
  }
  return false;
}

// One examination: 'done' or 'wait'; throws Fail or Split.
export function unify(st, L, R) {
  const l = flatten(st, L), r = flatten(st, R);
  for (const s of [l, r]) {
    if (new Set(s.fields).size !== s.fields.length) {
      throw new Fail('duplicate label');
    }
  }
  const t1 = minus(l.tails, r.tails), t2 = minus(r.tails, l.tails);
  const k1 = [...minus(l.fields, r.fields), ...t1.filter(t => !isMeta(t))];
  const k2 = [...minus(r.fields, l.fields), ...t2.filter(t => !isMeta(t))];
  const m1 = t1.filter(isMeta), m2 = t2.filter(isMeta);
  const rowOf = (ks, ms) => ({ fields: ks.filter(isLab),
    tails: [...ks.filter(k => !isLab(k)), ...ms] });
  if (k1.length && !m2.length) throw new Fail(`mismatch: ${k1[0]}`);
  if (k2.length && !m1.length) throw new Fail(`mismatch: ${k2[0]}`);
  if (!m1.length && !m2.length) return 'done';
  const empty = { fields: [], tails: [] };
  if (!k1.length && !k2.length && (!m1.length || !m2.length)) {
    for (const m of [...m1, ...m2]) bindMeta(st, m, empty);
    return 'done';
  }
  if (m1.length === 1 && !k1.length) {
    bindMeta(st, m1[0], rowOf(k2, m2));
    return 'done';
  }
  if (m2.length === 1 && !k2.length) {
    bindMeta(st, m2[0], rowOf(k1, m1));
    return 'done';
  }
  if (m1.length === 1 && m2.length === 1) {
    const z = `m${100 + st.fresh++}`;
    bindMeta(st, m1[0], rowOf(k2, [z]));
    return unify(st, L, R);
  }
  if (st.noHome && (homeless(st, k2, m1) || homeless(st, k1, m2))) {
    throw new Fail('no home');
  }
  if (st.commit && (commitOne(st, k2, m1) || commitOne(st, k1, m2))) {
    return unify(st, L, R);
  }
  if (st.mode === 'eager' && (k1.length || k2.length)) {
    throw new Split('split needs an annotation');
  }
  return 'wait';
}

// Re-examines every waiting equation until a pass changes nothing.
export function drain(st) {
  for (;;) {
    const before = st.version, waiting = st.pending;
    st.pending = [];
    for (const e of waiting) {
      if (unify(st, e.l, e.r) === 'wait') st.pending.push(e);
    }
    if (st.version === before) return;
  }
}

// Under the end default (unsolved metas empty), whether e holds.
export function holdsEmpty(st, e) {
  const atoms = r => { const f = flatten(st, r);
    return [...f.fields, ...f.tails.filter(t => !isMeta(t))].sort(); };
  return atoms(e.l).join() === atoms(e.r).join();
}

export function solution(st, metas) {
  return Object.fromEntries(metas.map(m => {
    const f = flatten(st, tailRow(m));
    return [m, [...f.fields, ...f.tails.filter(t => !isMeta(t))].sort()];
  }));
}
