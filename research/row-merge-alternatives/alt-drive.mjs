// Drives alternative A (alt-solver.mjs) on a list of steps, as
// research/open-row-merge/drive.mjs drives the current design's
// prototype: creation-site obligations of both rows before an equation,
// a rescan of the waiting equations after every step, then the end
// default. Verdicts use the same names: 'accept', 'refuse' (a
// contradiction: no solution) and 'D4' (Unresolved: no claim).
import * as A from './alt-solver.mjs';

const step = (st, c) => {
  if (c.k === 'eq') {
    A.wellFormed(st, c.l);
    A.wellFormed(st, c.r);
    A.drain(st);
    if (A.unify(st, c.l, c.r) === 'wait') st.pending.push(c);
  } else if (c.k === 'dis') {
    A.wellFormed(st, c.l);
    A.wellFormed(st, c.r);
    A.requireDisjoint(st, c.l, c.r);
  } else if (c.k === 'lacks') {
    A.requireDisjoint(st, { fields: [], tails: [c.v] },
      { fields: [c.l], tails: [] });
  }
  A.drain(st);
};

// { v, st, why?, pending? }; opts as alt-solver's makeState.
export function verdictA(hyp, steps, opts = {}) {
  const st = A.makeState(hyp, opts);
  try {
    for (const c of steps) step(st, c);
  } catch (e) {
    if (e instanceof A.Fail) return { v: 'refuse', why: e.message, st };
    if (e instanceof A.Split) return { v: 'D4', why: e.message, st };
    throw e;
  }
  const failing = st.pending.filter(e => !A.holdsEmpty(st, e));
  if (failing.length) return { v: 'D4', st, pending: failing.length };
  return { v: 'accept', st };
}
