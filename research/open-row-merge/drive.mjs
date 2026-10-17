// Drives the solver on a list of steps. An 'eq' step first records the
// creation-site obligations of both rows (wellFormed), as the compiler
// would where the rows were made; the unification itself never checks
// well-formedness, so a forgotten creation site shows up as a soundness
// failure against the oracle. Drains after each step. Hypotheses are
// given in the oracle's encoding (apart: [['R', 'S']]) and converted.
import * as S from './solver.mjs';

const pairText = p => (typeof p === 'string' ? p
  : (p[0] < p[1] ? p[0] + '|' + p[1] : p[1] + '|' + p[0]));

const step = (st, c) => {
  if (c.k === 'eq') {
    S.wellFormed(st, c.l);
    S.wellFormed(st, c.r);
    S.drain(st);
    S.unify(st, c.l, c.r);
  } else if (c.k === 'dis') {
    S.wellFormed(st, c.l);
    S.wellFormed(st, c.r);
    S.requireDisjoint(st, c.l, c.r);
  } else if (c.k === 'lacks') S.requireLacks(st, c.v, c.l);
  S.drain(st);
};

// { v: 'accept' | 'refuse' | 'D4', st, why?, pending? }
export function verdict(hyp, steps, opts = {}) {
  const conv = { lacks: hyp.lacks, apart: (hyp.apart || []).map(pairText) };
  const st = S.makeState(conv, 100, opts);
  try {
    for (const c of steps) step(st, c);
  } catch (e) {
    if (e instanceof S.Fail) return { v: 'refuse', why: e.message, st };
    throw e;
  }
  const stuck = S.stuck(st);
  if (stuck.length) return { v: 'D4', st, pending: stuck.length };
  return { v: 'accept', st };
}
export const row = (fields, tails = []) => ({ fields, tails });
export const tail = t => row([], [t]);
