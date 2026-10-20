// Judges the compiler's row solver against the oracle on one problem in
// several orders (R005 Tranche B plan, Task 4, §3.2 since B3, B4's H): S
// (Solved: the emitted solution, every free meta empty, satisfies every
// constraint), L (it is the least solution), H (Contradiction, H's
// refusal at the end of a body included: no solution), order (one
// verdict for every order), property E (a state's solutions, read back
// independently with its waiting predicates, are exactly the problem's:
// for accepted runs and for Unresolved ones), the lineage lemma (rules
// §5: the labels one predicate's case-3 moves carry are pairwise
// disjoint and at most the problem's labels), the second reference
// (research/row-merge-qt's QT-strict+Sym+2g+H: accept, refuse and D4
// against accept, refuse and Unresolved), the bounds on state changes
// (L3) and on solver-made metas (L4), and with `hOff` H as
// classification only (plan §4.2: the same run without H differs only
// by Unresolved where H refused, with the same state). A limit or an
// internal failure (the tail occurs guard, the two-unknown guard, the
// rescan's bound, an unfinished fixpoint) makes the runner throw
// (test/row-merge-entry.mjs `classify`): a test failure. A skipped run
// (a placeholder) is a defect since B4.
import { allSolutions, isMeta, keyOf, leastOf, sat }
  from './row-merge-oracle.mjs';
import { byH, changes, finishWithoutH, lineages, run, solverMetas, stateOf }
  from './row-merge-entry.mjs';
import { emitted, stateKeys } from './row-merge-readback.mjs';
import { verdictQT } from '../research/row-merge-qt/qt-drive.mjs';

// The research prototype's configuration B4 matches: QT-strict with Sym,
// case 2g (option `g2`, plan §10 decision 17) and H at the end.
export const B4_REFERENCE = { qts: true, selfApart: false, pairwise: false,
  sym: true, g2: true, hEnd: true };
const fromReference = { accept: 'accept', refuse: 'refuse', D4: 'unresolved' };

export const newTally = () => ({ problems: 0, runs: 0, accept: 0, refuse: 0,
  unresolved: 0, skipped: 0, unresolvedByOrder: {}, hRefuse: 0,
  hOffChecked: 0, hDiff: 0, agreeSolved: 0, agreeContradiction: 0,
  solvedViolates: 0, notLeast: 0, unsound: 0, dishonest: 0, orderDiff: 0,
  stateChecked: 0, waitingChecked: 0, stateSkipped: 0, stateDiff: 0,
  corruptCaught: 0, mergeCorruptCaught: 0, measureOver: 0, freshOver: 0,
  lineageChecked: 0, lineage: 0, referenceDiff: 0, otherSkip: 0,
  waitingUnchecked: 0,
  examples: [] });

const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();

// Design §2.7's measure as state changes: N metas each bound once, N.L
// lacks, (N + R)(N + R + 1) pair sides (research/open-row-merge/
// exhaustive-run.mjs; its term for upper bounds went with them in B2).
// Since B3 N also counts what desugaring and case 3 make: per meta of the
// problem, one desugared result and one fresh meta per label it can move.
const measure = (P, K, L) => {
  const N = P * (2 + K) * (1 + L);
  const R = K - L;
  return N + N * L + (N + R) * (N + R + 1);
};

const CORRUPT_EVERY = 8;

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
  const known = { metas, least, keys, labels };
  const classes = new Set();
  t.problems++;
  orders.forEach((order, position) => {
    t.runs++;
    const v = run(p.hyp, order);
    t[v.v]++;
    reference(p, order, v, t);
    lineage(v, labels, p, order, t);
    if (changes(v.subst) - changes(v.base) > bound) {
      defect(t, 'measureOver', p, order);
    }
    if (solverMetas(v.subst) > bound) defect(t, 'freshOver', p, order);
    classes.add(v.v);
    if (options.hOff) hOnlyClassifies(p, order, v, t);
    if (v.v === 'skipped') {
      defect(t, 'otherSkip', p, order, v.what);
      return;
    }
    if (v.v === 'unresolved') {
      t.unresolvedByOrder[position] = (t.unresolvedByOrder[position] ?? 0)
        + 1;
      if (options.state && t.waitingChecked < (options.waitingCap
        ?? Infinity)) checkState(p, order, v, known, t, 'waiting');
      else t.waitingUnchecked++;
      return;
    }
    if (v.v === 'refuse') {
      if (v.atEnd && byH(v.failure)) t.hRefuse++;
      if (sols.length) defect(t, 'dishonest', p, order);
      else t.agreeContradiction++;
      return;
    }
    solved(p, order, v, known, t, options);
  });
  if (classes.size > 1) defect(t, 'orderDiff', p, [...classes]);
}

function reference(p, order, v, t) {
  const found = verdictQT(p.hyp, order, B4_REFERENCE).v;
  if (fromReference[found] !== v.v) {
    defect(t, 'referenceDiff', p, order, found, v.v);
  }
}

// H off (plan §4.2): the verdict is the same, or Unresolved where H
// refused; an accepted or Unresolved run's state is the same.
function hOnlyClassifies(p, order, v, t) {
  const off = run(p.hyp, order, finishWithoutH);
  t.hOffChecked++;
  const hRefused = v.v === 'refuse' && v.atEnd && byH(v.failure);
  const same = off.v === v.v || (hRefused && off.v === 'unresolved');
  const kept = !['accept', 'unresolved'].includes(v.v)
    || JSON.stringify(stateOf(off.subst)) === JSON.stringify(stateOf(v.subst));
  if (!same || !kept) defect(t, 'hDiff', p, order, v.v, off.v);
}

function lineage(v, labels, p, order, t) {
  for (const { moves } of lineages(v.subst)) {
    t.lineageChecked++;
    const all = moves.flat();
    if (new Set(all).size !== all.length || all.length > labels
      || moves.some(m => m.length === 0)) {
      defect(t, 'lineage', p, order, moves);
    }
  }
}

function solved(p, order, v, known, t, options) {
  const { metas, least } = known;
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
  if (options.state) checkState(p, order, v, known, t, 'solved');
}

// Property E on the state, and its two sensitivity corruptions.
function checkState(p, order, v, known, t, kind) {
  const { metas, keys } = known;
  const state = stateOf(v.subst);
  const found = stateKeys(state, p.hyp, p.universe, metas);
  if (found === null) {
    t.stateSkipped++;
    return;
  }
  t[kind === 'waiting' ? 'waitingChecked' : 'stateChecked']++;
  const same = set => set.size === keys.size
    && [...set].every(k => keys.has(k));
  if (!same(found)) defect(t, 'stateDiff', p, order, [...found], [...keys]);
  // The two corruptions show the read-back can fail; a regular sample of
  // states suffices for that, and each costs a full enumeration.
  if ((t.stateChecked + t.waitingChecked) % CORRUPT_EVERY) return;
  const corrupt = stateKeys(state, p.hyp, p.universe, metas,
    { skipNested: true });
  if (corrupt !== null && !same(corrupt)) t.corruptCaught++;
  if (!state.merges.length) return;
  const dropped = stateKeys(state, p.hyp, p.universe, metas,
    { skipMerge: true });
  if (dropped !== null && !same(dropped)) t.mergeCorruptCaught++;
}

export const DEFECTS = ['solvedViolates', 'notLeast', 'unsound', 'dishonest',
  'orderDiff', 'stateDiff', 'measureOver', 'freshOver', 'lineage',
  'referenceDiff', 'otherSkip', 'hDiff'];

// The tally without its examples, and the defects it found.
export const defects = t => DEFECTS.filter(k => t[k] > 0)
  .map(k => `${k} ${t[k]}: ${
    JSON.stringify(t.examples.find(e => e[0] === k))}`);
