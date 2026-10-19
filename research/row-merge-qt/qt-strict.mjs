// QT-strict: the strict formulation (qt-preds.mjs's desugaring into
// `Merge r s t`, at most one meta tail per row) solved exactly as
// PureScript 0.15.16 solves Prim.Row.Union, with no local rule and no
// default for what a waiting predicate constrains. The design's
// section 13. PureScript source: purescript/purescript tag v0.15.16
// (commit 4c66c05a), src/Language/PureScript/TypeChecker/Entailment.hs.
//   case 1 (lines 636-638): the left part closed (no tail): t is its
//     fields followed by the right part, whatever the right part is;
//   case 2 (639-660): the right part and t closed: the left part is t
//     minus the right part's labels, if every one of them is in t;
//   case 3 (661-672): the left part open with known labels: those
//     labels move into t, and `Union rest(left) right t'` remains;
//   otherwise no progress (`canMakeProgress` false, line 628).
// Entailment by the signature (case 1g): parts with no unknown, only
// fields and the signature's rigid row variables, give t := r ⊎ s. In
// PureScript the signature would state `Union r s rs` as a given and
// the wanted `Union r s t` would match it by the dependency left right
// -> union (`matches`, lines 275, 735-750); in Waxwing the signature
// states it by writing the row `{ ...r, ...s }` (design section 3.5).
// Pairwise improvement: two predicates agreeing on the arguments of a
// dependency agree on the rest; the dependencies are positional, as
// declared (Environment.hs lines 525-527: left right -> union, right
// union -> left, union left -> right). PureScript applies them between
// a wanted constraint and an earlier unsolved one it has stored as a
// dictionary (Entailment.hs 314-320, matched by `matches`, 275 and
// 735-750); Jones 2000 section 6.2 states the rule.
// No N5 (state option selfApart: false), no E, H or Z. At the end of a
// body any predicate still waiting is 'D4' (annotate); an unknown that
// no waiting predicate mentions defaults to {} as today (its lacks and
// disjointness facts hold for {}).
import {
  Fail, isMeta, tailRow, freshMeta, flatten, wellFormed, unify, nameOf,
  residue, cannotHold,
} from './qt-facts.mjs';

const rowKey = f => `${f.fields.join()};${f.tails.join()}`;
const closed = f => f.tails.length === 0;

// PureScript's three cases on one orientation: `a` is the left part's
// key in the predicate, `b` the right's ('r' and 's' as written; 's'
// and 'r' under option `sym`, design section 14.1).
function oriented(st, p, a, b) {
  const L = flatten(st, p[a]), R = flatten(st, p[b]), T = flatten(st, p.t);
  if (closed(L) || (!L.tails.some(isMeta) && !R.tails.some(isMeta))) {
    unify(st, p.t, { fields: [...L.fields, ...R.fields],
      tails: [...L.tails, ...R.tails] });
    return 'done';
  }
  if (closed(R) && closed(T)) return subtract(st, p[a], R, T);
  if (!L.fields.length) return 'wait';
  const u = freshMeta(st);
  const moved = { fields: L.fields, tails: [u] };
  wellFormed(st, moved);
  st.trace?.moved?.(p, L.fields);
  unify(st, p.t, moved);
  p[a] = { fields: [], tails: L.tails };
  p.t = tailRow(u);
  st.version++;
  return 'moved';
}

// Case 2: the left part is t minus the right part's labels, matched by
// name (lines 647-653); each matched field's type must be the right
// part's (PureScript unifies the solved instance with the constraint,
// lines 290-296); a right label missing from t is no progress.
function subtract(st, left, R, T) {
  const tName = new Map(T.fields.map(f => [nameOf(f), f]));
  if (!R.fields.every(f => tName.has(nameOf(f)))) return 'wait';
  const bad = R.fields.find(f => tName.get(nameOf(f)) !== f);
  if (bad) throw new Fail(`mismatch: ${nameOf(bad)}`);
  const taken = new Set(R.fields.map(nameOf));
  st.trace?.subtract(left, T.fields.length === R.fields.length);
  unify(st, left, { fields: T.fields.filter(f => !taken.has(nameOf(f))),
    tails: [] });
  return 'done';
}

function improveOne(st, p) {
  const r = oriented(st, p, 'r', 's');
  return r === 'wait' && st.sym ? oriented(st, p, 's', 'r') : r;
}

const DEPENDENCIES = [['r', 's', 't'], ['s', 't', 'r'], ['t', 'r', 's']];

function pairwise(st) {
  const keyed = st.preds.map(p => ({ p, r: rowKey(flatten(st, p.r)),
    s: rowKey(flatten(st, p.s)), t: rowKey(flatten(st, p.t)) }));
  for (let i = 0; i < keyed.length; i++) {
    for (let j = i + 1; j < keyed.length; j++) {
      const a = keyed[i], b = keyed[j];
      for (const [x, y, z] of DEPENDENCIES) {
        if (a[x] !== b[x] || a[y] !== b[y]) continue;
        st.preds = st.preds.filter(q => q !== b.p);
        st.version++;
        unify(st, a.p[z], b.p[z]);
        return true;
      }
    }
  }
  return false;
}

export function improveStrict(st) {
  st.trace?.rescan?.();
  for (;;) {
    const before = st.version;
    st.trace?.pass?.(st);
    for (const p of [...st.preds]) {
      if (!st.preds.includes(p)) continue;
      if (improveOne(st, p) === 'done') {
        st.preds = st.preds.filter(q => q !== p);
      }
    }
    if (!(st.pairwise && pairwise(st)) && st.version === before) return;
  }
}

// Option `hEnd` (H, design section 14.2): classification only, at the
// end, of a body that is already Unresolved. A waiting predicate with a
// constant on one side (after cancelling) that no unknown of the other
// side can hold has no solution: Contradiction instead of D4. It binds
// nothing and runs after every binding, so acceptance and types are
// QT-strict's.
export const finishStrict = st => {
  improveStrict(st);
  if (!st.preds.length) return 'accept';
  const h = st.hEnd && st.preds.find(p => homeless(st, p));
  if (h) {
    st.why = 'no home';
    return 'refuse';
  }
  return 'D4';
};

function homeless(st, p) {
  const R = flatten(st, p.r), S = flatten(st, p.s);
  const sides = residue(st, { fields: [...R.fields, ...S.fields],
    tails: [...R.tails, ...S.tails] }, p.t);
  return sides.some((side, i) => side.ks.some(c => sides[1 - i].ms
    .every(m => cannotHold(st, m, c))));
}

// The unknowns a waiting predicate mentions (they get no default).
export const constrained = st => new Set(st.preds.flatMap(p =>
  [p.r, p.s, p.t].flatMap(r => flatten(st, r).tails.filter(isMeta))));

// Whether every waiting predicate is quiet (no part and no result has a
// field or a rigid tail): what the {} default of QS would have met.
export const quietOnly = st => st.preds.every(p => [p.r, p.s, p.t]
  .every(r => { const f = flatten(st, r);
    return !f.fields.length && f.tails.every(isMeta); }));
