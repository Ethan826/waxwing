// Drives the qualified-types prototype on a list of steps, as
// research/open-row-merge/drive.mjs and ../row-merge-alternatives/
// alt-drive.mjs drive theirs: rows are desugared (mode 'strict') and
// their creation-site obligations required before each step,
// improvement runs after every step, and the end of the body defaults
// every unbound meta to {}. Verdicts: 'accept' (Solved), 'refuse'
// (Contradiction: no solution) and 'D4' (Unresolved: needs an
// annotation; no claim).
import * as F from './qt-facts.mjs';
import { desugar, improve, finish } from './qt-preds.mjs';
import { wait, improveSym, finishSym } from './qt-sym.mjs';
import { improveStrict, finishStrict } from './qt-strict.mjs';

const sym = st => st.mode === 'sym';
const made = (st, row) => {
  const r = sym(st) ? row : desugar(st, row);
  F.wellFormed(st, r);
  return r;
};

const step = (st, c) => {
  if (c.k === 'eq') {
    const l = made(st, c.l), r = made(st, c.r);
    settle(st);
    if (F.unify(st, l, r) === 'wait') wait(st, l, r);
  } else if (c.k === 'dis') {
    F.requireDisjoint(st, made(st, c.l), made(st, c.r));
  } else if (c.k === 'lacks') {
    F.requireDisjoint(st, F.tailRow(c.v), { fields: [c.l], tails: [] });
  }
  settle(st);
};
const settle = st => (sym(st) ? improveSym(st)
  : st.qts ? improveStrict(st) : improve(st));

// { v, st, why? }; opts: { mode: 'strict' | 'sym', empty, home,
// commit, zero, selfApart, qts } (qt-preds.mjs, qt-sym.mjs,
// qt-strict.mjs); `after(st)`, if given, is
// called after each step (qt-checks.mjs `stage4` reads waiting
// predicates there).
export function verdictQT(hyp, steps, opts = {}) {
  const st = F.makeState(hyp, opts);
  try {
    for (const c of steps) {
      step(st, c);
      opts.after?.(st);
    }
  } catch (e) {
    if (e instanceof F.Fail) return { v: 'refuse', why: e.message, st };
    throw e;
  }
  const v = sym(st) ? finishSym(st) : st.qts ? finishStrict(st)
    : finish(st);
  return { v, st };
}

export const solutionQT = F.solution;
