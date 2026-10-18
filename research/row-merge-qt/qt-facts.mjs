// The row layer of the qualified-types design
// (docs/plans/2026-10-18-row-merge-qualified-types.md), labels only, in
// the encoding of research/open-row-merge (README, "Encoding").
// Mode 'strict' (PureScript's formulation): every row the solver holds
// has at most one meta tail and any number of rigid tails (constants,
// like labels); rows of several metas exist only as `Merge` predicates
// (qt-preds.mjs). Mode 'sym': the forward dependency is applied
// symbolically, so rows keep several tails (Tranche B Task 1) and an
// equation the one-tail rules cannot solve waits as a predicate
// (qt-sym.mjs).
// - Facts: lacks (Gaster and Jones's `r \ l`) and disjointness (Ur/Web's
//   `[r ~ s]`) on metas, decomposed over known parts, and re-required on
//   a meta's image when it is bound (Tranche B Task 3's bind rule).
// - Entailment: a fact on rigids must be one of the givens (the
//   signature's hypotheses), else it fails (D3, D3'' in the compiler).
// - Unification: ADR 013's one-tail rules (Remy, Gaster and Jones)
//   after cancelling common labels and rigid tails.
export class Fail extends Error {}
export class Broken extends Error {}
export const isMeta = v => /^m/.test(v);
export const isLab = a => /^[a-z]/.test(a);
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const tailRow = t => ({ fields: [], tails: [t] });
export const EMPTY = { fields: [], tails: [] };

export const makeState = (hyp, opts = {}) => ({ hyp, bind: new Map(),
  excl: new Map(), pairs: new Set(), preds: [], fresh: 0, version: 0,
  mode: opts.mode ?? 'strict',
  home: opts.home ?? false, commit: opts.commit ?? false,
  empty: opts.empty ?? false });

export const freshMeta = st => `m${1000 + st.fresh++}`;

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

export const metasOf = row => row.tails.filter(isMeta);
export const excludes = (st, m, a) => st.excl.get(m)?.has(a) ?? false;
const hypLacks = (st, r, l) => (st.hyp.lacks[r] || []).includes(l);
const hypApart = (st, r, s) => (st.hyp.apart || [])
  .some(p => key(p[0], p[1]) === key(r, s));

function addExcl(st, m, a) {
  const s = st.excl.get(m) ?? new Set();
  if (s.has(a)) return;
  s.add(a);
  st.excl.set(m, s);
  st.version++;
}

// Atomic facts. On rigids: entailment by the givens, or failure.
function apartAtoms(st, t, u) {
  if (t === u) {
    if (!isMeta(t)) throw new Fail(`twice: ${t}`);
    bindMeta(st, t, EMPTY);
  } else if (!isMeta(t) && !isMeta(u)) {
    if (!hypApart(st, t, u)) throw new Fail(`not entailed: ${t} # ${u}`);
  } else if (!isMeta(t)) addExcl(st, u, t);
  else if (!isMeta(u)) addExcl(st, t, u);
  else if (!st.pairs.has(key(t, u))) {
    st.pairs.add(key(t, u));
    st.version++;
  }
}

function lackAtom(st, t, l) {
  if (isMeta(t)) addExcl(st, t, l);
  else if (!hypLacks(st, t, l)) throw new Fail(`not entailed: ${t} \\ ${l}`);
}

// `L # R` decomposed (Ur/Web's disjointness prover; design §3.1).
export function requireDisjoint(st, L, R) {
  const l = flatten(st, L), r = flatten(st, R);
  for (const a of l.fields) {
    if (r.fields.includes(a)) throw new Fail(`overlap: ${a}`);
  }
  for (const a of l.fields) for (const t of r.tails) lackIn(st, t, a);
  for (const a of r.fields) for (const t of l.tails) lackIn(st, t, a);
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

// A row's own disjointness, required where the row is made.
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

// The bind rule: the meta's facts are re-required on its image.
export function bindMeta(st, m, row) {
  const img = flatten(st, row);
  if (st.mode === 'strict' && metasOf(img).length > 1) {
    throw new Broken(`two metas: ${m}`);
  }
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

export const minus = (xs, ys) => {
  const rest = [...ys], out = [];
  for (const x of xs) {
    const i = rest.indexOf(x);
    if (i >= 0) rest.splice(i, 1); else out.push(x);
  }
  return out;
};

export const rowOf = (ks, ms) => ({ fields: ks.filter(isLab),
  tails: [...ks.filter(k => !isLab(k)), ...ms] });

// ADR 013's rules with rigid tails as constants (Remy; Gaster and
// Jones), after cancelling common labels and tails (Ur/Web's
// normalisation of concatenations): a side with no meta keeps no
// constant; a side that is one bare meta takes the other side; one meta
// on each side shares one fresh remainder. Anything else is 'wait': a
// deferred predicate in mode 'sym', impossible in mode 'strict'.
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
  if (k1.length && !m2.length) throw new Fail(`mismatch: ${k1[0]}`);
  if (k2.length && !m1.length) throw new Fail(`mismatch: ${k2[0]}`);
  if (!m1.length && !m2.length) return 'done';
  if (m1.length === 1 && !k1.length) {
    bindMeta(st, m1[0], rowOf(k2, m2));
  } else if (m2.length === 1 && !k2.length) {
    bindMeta(st, m2[0], rowOf(k1, m1));
  } else if (m1.length === 1 && m2.length === 1) {
    bindMeta(st, m1[0], rowOf(k2, [freshMeta(st)]));
    return unify(st, L, R);
  } else if (st.mode === 'sym') return 'wait';
  else throw new Broken('two metas');
  return 'done';
}

// The residue of an equation after cancellation, for the predicate
// rules of mode 'sym': each side's constants and metas.
export function residue(st, L, R) {
  const l = flatten(st, L), r = flatten(st, R);
  const t1 = minus(l.tails, r.tails), t2 = minus(r.tails, l.tails);
  return [
    { ks: [...minus(l.fields, r.fields), ...t1.filter(t => !isMeta(t))],
      ms: t1.filter(isMeta) },
    { ks: [...minus(r.fields, l.fields), ...t2.filter(t => !isMeta(t))],
      ms: t2.filter(isMeta) },
  ];
}

// Each program meta's value with every unbound meta empty.
export function solution(st, metas) {
  return Object.fromEntries(metas.map(m => {
    const f = flatten(st, tailRow(m));
    return [m, [...f.fields, ...f.tails.filter(t => !isMeta(t))].sort()];
  }));
}
