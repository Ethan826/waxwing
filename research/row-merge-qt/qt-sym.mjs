// Mode 'sym' of the qualified-types prototype: the forward dependency
// r s -> t is applied symbolically, so `{ ...r, ...s }` stays one row of
// two tails (Ur/Web's `$(r ++ s)`; Tranche B Task 1's representation),
// and an equation between rows that ADR 013's one-tail rules cannot
// solve after cancellation waits as the predicate `Merge(P, O)`: the
// metas P of one side, joined, are the other side O. It is re-examined
// after every step and solved once determined (one meta left on a side,
// which is the dependencies r t -> s and s t -> r). Two waiting
// predicates with the same parts P have the same O (r s -> t).
// Options as qt-preds.mjs: `empty` (O is {}: every part is {}), `home`
// and `commit` (flagged, not standard).
import {
  Fail, isLab, EMPTY, freshMeta, flatten, excludes, bindMeta, unify,
  residue, rowOf, minus, tailRow,
} from './qt-facts.mjs';

export function wait(st, l, r) {
  st.preds.push({ l, r });
  st.version++;
}

const partsKey = side => (side.ks.length || side.ms.length < 2 ? null
  : [...side.ms].sort().join());

// Two predicates over the same parts have equal other sides (r s -> t);
// the second is dropped once that equation is solved (if it would only
// wait, both stay: nothing is lost and nothing loops).
// Two with equal other sides whose parts differ in one meta each have
// those metas equal (r t -> s: cancel the common parts).
function pairwise(st) {
  const keyed = st.preds.flatMap(p => {
    const sides = residue(st, p.l, p.r);
    return sides.map((side, i) => ({ p, key: partsKey(side),
      ms: side.ms, other: sides[1 - i] })).filter(x => x.key);
  });
  const okey = x => `${[...x.other.ks].sort()}|${[...x.other.ms].sort()}`;
  for (let i = 0; i < keyed.length; i++) {
    for (let j = i + 1; j < keyed.length; j++) {
      const a = keyed[i], b = keyed[j];
      if (a.p === b.p) continue;
      if (a.key === b.key && unify(st, rowOf(a.other.ks, a.other.ms),
        rowOf(b.other.ks, b.other.ms)) === 'done') {
        st.preds = st.preds.filter(p => p !== b.p);
        st.version++;
        return true;
      }
      const da = minus(a.ms, b.ms), db = minus(b.ms, a.ms);
      if (okey(a) === okey(b) && da.length === 1 && db.length === 1) {
        unify(st, tailRow(da[0]), tailRow(db[0]));
        return true;
      }
    }
  }
  return false;
}

// The flagged options on one waiting predicate; true if it acted.
function options(st, p) {
  const sides = residue(st, p.l, p.r);
  for (const [own, other] of [sides, [...sides].reverse()]) {
    if (st.empty && !own.ks.length && !own.ms.length) {
      for (const m of other.ms) {
        if (!st.bind.has(m)) bindMeta(st, m, EMPTY);
      }
      return true;
    }
    for (const c of own.ks) {
      const homes = other.ms.filter(m => !excludes(st, m, c));
      if (st.home && other.ms.length && !homes.length) {
        throw new Fail(`no home: ${c}`);
      }
      if (st.commit && homes.length === 1) {
        bindMeta(st, homes[0], isLab(c) ? { fields: [c],
          tails: [freshMeta(st)] } : { fields: [], tails: [c,
          freshMeta(st)] });
        return true;
      }
    }
  }
  return false;
}

// Re-examination to a fixpoint, a full rescan.
export function improveSym(st) {
  for (;;) {
    const before = st.version;
    for (const p of [...st.preds]) {
      if (!st.preds.includes(p)) continue;
      if (unify(st, p.l, p.r) === 'done') {
        st.preds = st.preds.filter(q => q !== p);
      } else if (options(st, p)) break;
    }
    if (!pairwise(st) && st.version === before) return;
  }
}

// The end: every unbound meta defaults to {} (Haskell 98 section
// 4.3.4's defaulting, all at once); accepted only if every waiting
// predicate then holds.
export function finishSym(st) {
  improveSym(st);
  const atoms = r => {
    const f = flatten(st, r);
    return [...f.fields, ...f.tails.filter(t => !/^m/.test(t))].sort()
      .join();
  };
  return st.preds.every(p => atoms(p.l) === atoms(p.r)) ? 'accept' : 'D4';
}
