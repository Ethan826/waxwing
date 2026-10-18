// Judges the compiler's row solver against the oracle on one problem in
// several orders (R005 Tranche B plan, Tasks 4-5): S (Solved: the emitted
// solution, every free meta empty, satisfies every constraint), L (it is
// the least solution), H (Contradiction: no solution), C2 (one verdict
// for every order), property E (a state's solutions, read back
// independently with its pending equations, are exactly the problem's;
// on Solved and Unresolved states), the measure bound on state changes
// (L3) and on solver-made metas (L4). Unresolved (`D4`) claims nothing
// about the number of solutions; it is counted by that number (0, 1,
// several), and C1 (never with exactly one pending equation while a least
// solution exists) and C3 (with a least solution, two pending equations
// share a meta) are checked, `d4WithLeast` counting the measured
// incompleteness. A limit or an internal failure (the tail occurs guard,
// L33) makes the runner throw (test/row-merge-entry.mjs `classify`): a
// test failure. A run that reaches a placeholder is `skipped`, counted by
// its order's position, and never judged as agreement.
import { allSolutions, isMeta, keyOf, leastOf, sat }
  from './row-merge-oracle.mjs';
import { changes, run, solverMetas, stateOf } from './row-merge-entry.mjs';
import { emitted, stateKeys } from './row-merge-readback.mjs';

export const newTally = () => ({ problems: 0, runs: 0, accept: 0, refuse: 0,
  D4: 0, skipped: 0, skippedByOrder: {}, agreeSolved: 0,
  agreeContradiction: 0, unresolved0: 0, unresolved1: 0, unresolvedMany: 0,
  d4WithLeast: 0, solvedViolates: 0, notLeast: 0, unsound: 0, dishonest: 0,
  orderDiff: 0, c1fail: 0, c3fail: 0, stateChecked: 0, stateSkipped: 0,
  stateDiff: 0, corruptCaught: 0, measureOver: 0, freshOver: 0,
  examples: [] });

const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();

// Design §2.7's measure as state changes: N metas each bound once, N.L
// lacks, (N + R)(N + R + 1) pair sides, a bound set and shrunk K + 1
// times per meta (research/open-row-merge/exhaustive-run.mjs).
const measure = (P, K, L) => {
  const N = P * (1 + K);
  const R = K - L;
  return N + N * L + (N + R) * (N + R + 1) + N * (K + 1);
};

const defect = (t, kind, ...more) => {
  t[kind]++;
  if (t.examples.length < 10) t.examples.push([kind, ...more]);
};

export function judge(p, orders, t, options = {}) {
  const metas = metasOf(p.cs);
  const sols = allSolutions(metas, p.universe, p.hyp, p.cs);
  const least = leastOf(metas, p.hyp, p.cs, sols);
  const keys = new Set(sols.map(s => keyOf(metas, m => s[m])));
  const labels = p.universe.filter(a => /^[a-z]/.test(a)).length;
  const bound = measure(metas.length, p.universe.length, labels);
  const classes = new Set();
  t.problems++;
  orders.forEach((order, position) => {
    t.runs++;
    const v = run(p.hyp, order);
    t[v.v]++;
    if (v.v === 'skipped') {
      t.skippedByOrder[position] = (t.skippedByOrder[position] ?? 0) + 1;
      return;
    }
    classes.add(v.v);
    if (changes(v.subst) - changes(v.base) > bound) {
      defect(t, 'measureOver', p, order);
    }
    if (solverMetas(v.subst) > metas.length * p.universe.length) {
      defect(t, 'freshOver', p, order);
    }
    if (v.v === 'refuse') {
      if (sols.length) defect(t, 'dishonest', p, order);
      else t.agreeContradiction++;
      return;
    }
    if (v.v === 'D4') {
      unresolved(p, order, v, { metas, least, sols }, t);
      readBack(p, order, v, { metas, keys }, t, options);
      return;
    }
    solved(p, order, v, { metas, least, keys }, t, options);
  });
  if (classes.size > 1) defect(t, 'orderDiff', p, [...classes]);
}

function solved(p, order, v, known, t, options) {
  const { metas, least, keys } = known;
  const state = stateOf(v.subst);
  const got = emitted(state, metas);
  let fine = true;
  if (!p.cs.every(c => sat(p.hyp, got, c))) {
    fine = false;
    defect(t, 'solvedViolates', p, order, got);
  }
  if (!least) {
    fine = false;
    defect(t, 'unsound', p, order);
  } else if (metas.some(m => got[m].join() !== [...least[m]].sort().join())) {
    fine = false;
    defect(t, 'notLeast', p, order, got, least);
  }
  if (fine) t.agreeSolved++;
  readBack(p, order, v, known, t, options);
}

// Unresolved: counted by the number of solutions; C1 and C3.
function unresolved(p, order, v, known, t) {
  const n = known.sols.length;
  t[n === 0 ? 'unresolved0' : n === 1 ? 'unresolved1' : 'unresolvedMany']++;
  if (!known.least) return;
  t.d4WithLeast++;
  const pending = stateOf(v.subst).pending;
  if (pending.length === 1) defect(t, 'c1fail', p, order);
  if (!shareAMeta(pending)) defect(t, 'c3fail', p, order);
}

const shareAMeta = pending => {
  const sets = pending.map(e => new Set([...e.l.tails, ...e.r.tails]
    .filter(isMeta)));
  return sets.some((a, i) => sets.slice(i + 1).some(b =>
    [...a].some(x => b.has(x))));
};

// Property E on the state reached, with its sensitivity check.
function readBack(p, order, v, known, t, options) {
  const { metas, keys } = known;
  if (!options.state) return;
  const state = stateOf(v.subst);
  const found = stateKeys(state, p.hyp, p.universe, metas);
  if (found === null) {
    t.stateSkipped++;
    return;
  }
  t.stateChecked++;
  const same = set => set.size === keys.size
    && [...set].every(k => keys.has(k));
  if (!same(found)) defect(t, 'stateDiff', p, order, [...found], [...keys]);
  const corrupt = stateKeys(state, p.hyp, p.universe, metas,
    { skipNested: true });
  if (corrupt !== null && !same(corrupt)) t.corruptCaught++;
}

export const DEFECTS = ['solvedViolates', 'notLeast', 'unsound', 'dishonest',
  'orderDiff', 'stateDiff', 'measureOver', 'freshOver', 'c1fail', 'c3fail',
  'skipped'];

// The tally without its examples, and the defects it found.
export const defects = t => DEFECTS.filter(k => t[k] > 0)
  .map(k => `${k} ${t[k]}: ${
    JSON.stringify(t.examples.find(e => e[0] === k))}`);
