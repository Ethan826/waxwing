// `Merge r s t` (t is the disjoint union of r and s) as a predicate of
// qualified types (Jones 1994), improved only when determined
// (functional dependencies r s -> t, r t -> s, s t -> r; Jones 2000),
// as PureScript's compiler solves Prim.Row.Union; deferred otherwise.
// See docs/plans/2026-10-18-row-merge-qualified-types.md, section 3.
import {
  Fail, isMeta, isLab, tailRow, EMPTY, freshMeta, flatten, metasOf,
  excludes, requireDisjoint, wellFormed, bindMeta, unify,
} from './qt-facts.mjs';

// Desugaring: a row with k >= 2 meta tails becomes one fresh meta and
// k - 1 predicates, folded from the left. Parts are required disjoint
// when the predicate is made (Ur/Web: `++` needs `~`).
export function desugar(st, row) {
  const ms = row.tails.filter(isMeta);
  if (ms.length < 2) return row;
  let acc = ms[0];
  for (const m of ms.slice(1)) {
    const t = freshMeta(st);
    addPred(st, tailRow(acc), tailRow(m), tailRow(t));
    acc = t;
  }
  return { fields: row.fields,
    tails: [...row.tails.filter(t => !isMeta(t)), acc] };
}

export function addPred(st, r, s, t) {
  st.preds.push({ r, s, t });
  st.version++;
  requireDisjoint(st, r, s);
}

const constants = f => [...f.fields, ...f.tails.filter(t => !isMeta(t))];
const rowKey = f => `${f.fields.join()};${f.tails.join()}`;

// One predicate: 'done' (replaced by equations), 'moved' (its known
// parts moved into t, PureScript's third case) or 'wait'.
function improveOne(st, p) {
  const R = flatten(st, p.r), S = flatten(st, p.s);
  const ms = [...metasOf(R), ...metasOf(S)];
  if (ms.length <= 1 || ms[0] === ms[1]) {
    requireDisjoint(st, R, S);
    unify(st, p.t, { fields: [...R.fields, ...S.fields],
      tails: [...R.tails, ...S.tails] });
    return 'done';
  }
  const ks = [...constants(R), ...constants(S)];
  if (!ks.length) return bare(st, p, ms[0], ms[1]);
  requireDisjoint(st, R, S);
  const u = freshMeta(st);
  const moved = { fields: ks.filter(isLab),
    tails: [...ks.filter(k => !isLab(k)), u] };
  wellFormed(st, moved);
  unify(st, p.t, moved);
  p.r = tailRow(metasOf(R)[0]);
  p.s = tailRow(metasOf(S)[0]);
  p.t = tailRow(u);
  st.version++;
  return 'moved';
}

// A predicate whose parts are the bare metas a and b. Backward,
// t b -> a (PureScript's second case, subtraction) when t contains b's
// tail, so t minus b is computable; and, with option `empty`, a t that
// is {} empties both parts (an improvement, not a dependency).
function bare(st, p, a, b) {
  const T = flatten(st, p.t);
  for (const [x, y] of [[a, b], [b, a]]) {
    if (!T.tails.includes(y)) continue;
    requireDisjoint(st, tailRow(a), tailRow(b));
    const rest = [...T.tails];
    rest.splice(rest.indexOf(y), 1);
    unify(st, tailRow(x), { fields: T.fields, tails: rest });
    return 'done';
  }
  if (st.empty && !T.fields.length && !T.tails.length) {
    bindMeta(st, a, EMPTY);
    if (!st.bind.has(b)) bindMeta(st, b, EMPTY);
    return 'done';
  }
  return 'wait';
}

// Pairwise improvement by the dependencies: two predicates that agree
// on two arguments agree on the third (Merge is symmetric in r and s).
function pairwise(st) {
  const ps = st.preds.map(p => ({ p, r: rowKey(flatten(st, p.r)),
    s: rowKey(flatten(st, p.s)), t: rowKey(flatten(st, p.t)) }));
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      const swap = a.r === b.s && a.s === b.r;
      const br = swap ? b.p.s : b.p.r, bs = swap ? b.p.r : b.p.s;
      const kr = swap ? b.s : b.r, ks = swap ? b.r : b.s;
      let eq = null;
      if (a.r === kr && a.s === ks) eq = [a.p.t, b.p.t];
      else if (a.r === kr && a.t === b.t) eq = [a.p.s, bs];
      else if (a.s === ks && a.t === b.t) eq = [a.p.r, br];
      else if (a.r === ks && a.t === b.t) eq = [a.p.s, br];
      else if (a.s === kr && a.t === b.t) eq = [a.p.r, bs];
      if (eq) {
        st.preds = st.preds.filter(p => p !== b.p);
        st.version++;
        unify(st, eq[0], eq[1]);
        return true;
      }
    }
  }
  return false;
}

// Optional, not standard (flagged in the design, section 3.6): `home`,
// a constant of t that both parts exclude is a contradiction; `commit`,
// one that exactly one part excludes goes to the other.
function homes(st, p) {
  const T = flatten(st, p.t);
  const a = metasOf(flatten(st, p.r))[0], b = metasOf(flatten(st, p.s))[0];
  for (const c of constants(T)) {
    const ea = excludes(st, a, c), eb = excludes(st, b, c);
    if (st.home && ea && eb) throw new Fail(`no home: ${c}`);
    if (st.commit && ea !== eb) {
      const z = freshMeta(st);
      bindMeta(st, ea ? b : a, isLab(c) ? { fields: [c], tails: [z] }
        : { fields: [], tails: [c, z] });
      return true;
    }
  }
  return false;
}

// Improvement to a fixpoint (a full rescan, as alternative A's drain).
export function improve(st) {
  for (;;) {
    const before = st.version;
    for (const p of [...st.preds]) {
      if (!st.preds.includes(p)) continue;
      if (improveOne(st, p) === 'done') {
        st.preds = st.preds.filter(q => q !== p);
      } else if ((st.home || st.commit) && homes(st, p)) break;
    }
    if (!pairwise(st) && st.version === before) return;
  }
}

// The end of a body: defaulting in the style of Haskell 98 section
// 4.3.4. Every unbound meta is ambiguous here (nothing is generalized)
// and defaults to {}; that is accepted only if every waiting predicate
// holds under it, i.e. no waiting t has a constant (its parts are two
// bare metas). Then 'accept' (the default is the least solution, as the
// bindings are most general and images monotone), else 'D4'.
export function finish(st) {
  improve(st);
  const quiet = p => constants(flatten(st, p.t)).length === 0;
  return st.preds.every(quiet) ? 'accept' : 'D4';
}
