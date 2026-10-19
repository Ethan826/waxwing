// Ledger L2 (docs/plans/2026-10-19-row-merge-rules.md §11, M19): the
// refusals met while solving whose modelled diagnostic depends on the
// order (`node qt-render.mjs render`: location rule 1 names the step
// being checked), split by what differs. The oracle identifies each
// order's conflict: a refusal at step k means the steps processed so
// far (the prefix) have no solution, so the prefix holds a minimal
// unsatisfiable subset (MUS) of the problem's steps; the order's
// conflict is the set of MUSes inside its prefix.
//   sameConflict        every order's prefix holds the same one MUS:
//                       the same conflict, located differently;
//   differentConflicts  orders hold different MUSes (or several):
//                       different valid conflicts found first.
// Then the stable candidate rule `latest`: a refusal is located at the
// latest written step of its conflict (its MUS; with several, the one
// whose latest step is earliest). Residuals after it: `atDiff` (the
// location still differs) and `whyDiff` (the failure's kind or label
// differs, e.g. a mismatch in one order and an overlap in another).
// Problems with more than MAX_STEPS steps or MAX_METAS metas are skipped
// and counted (the oracle's cost grows with both).
// Usage: node qt-locate.mjs [n]   (n problems per generated family)
import { allSolutions, isMeta } from '../open-row-merge/oracle.mjs';
import { runTraced, renamed } from './qt-trace.mjs';
import { problems } from './qt-render.mjs';

const MAX_STEPS = 9;
const MAX_METAS = 5;

const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();
const atomsOf = (hyp, cs) => [...new Set([...cs.flatMap(c => (c.k === 'lacks'
  ? [c.l] : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails])),
...Object.keys(hyp.lacks ?? {})])].filter(a => !isMeta(a)).sort();
const unsat = (hyp, cs, universe) => !allSolutions(metasOf(cs), universe,
  hyp, cs).length;

// Every MUS of the steps, each as a sorted array of their `idx`.
function muses(hyp, steps) {
  const universe = atomsOf(hyp, steps);
  const n = steps.length, found = [];
  for (let size = 1; size <= n; size++) {
    for (let mask = 1; mask < (1 << n); mask++) {
      if (popcount(mask) !== size) continue;
      if (found.some(m => (m.mask & mask) === m.mask)) continue;
      const cs = steps.filter((_, i) => mask & (1 << i));
      if (unsat(hyp, cs, universe)) {
        found.push({ mask, idx: cs.map(c => c.idx).sort((a, b) => a - b) });
      }
    }
  }
  return found.map(m => m.idx);
}
const popcount = x => (x ? (x & 1) + popcount(x >> 1) : 0);

// The order's conflict: the MUSes inside its failing prefix.
const conflictOf = (order, failedAt, all) => {
  const upto = order.findIndex(c => c.idx === failedAt);
  const prefix = new Set(order.slice(0, upto + 1).map(c => c.idx));
  return all.filter(m => m.every(i => prefix.has(i)));
};
const latestOf = conflict => Math.min(...conflict.map(m => Math.max(...m)));

const bump = (t, k, by = 1) => { t[k] = (t[k] ?? 0) + by; };

function classify(t, examples, fam, name, hyp, orders) {
  const runs = orders.map(o => ({ o, r: runTraced(hyp, o) }));
  if (runs.some(({ r }) => r.v !== 'refuse' || r.why === 'no home')) return;
  const shown = runs.map(({ r }) => `${renamed(r.why)}@${r.failedAt}`);
  if (new Set(shown).size === 1) return;
  bump(t, 'orderDependent');
  if (orders[0].length > MAX_STEPS
    || metasOf(orders[0]).length > MAX_METAS) return bump(t, 'skippedLarge');
  const all = muses(hyp, orders[0]);
  const conflicts = runs.map(({ o, r }) => conflictOf(o, r.failedAt, all));
  const keys = conflicts.map(c => JSON.stringify(c));
  const same = new Set(keys).size === 1 && conflicts[0].length === 1;
  const kind = same ? 'sameConflict' : 'differentConflicts';
  bump(t, kind);
  const at = conflicts.map(latestOf);
  const whys = runs.map(({ r }) => renamed(r.why));
  const atDiff = new Set(at).size > 1, whyDiff = new Set(whys).size > 1;
  if (atDiff) bump(t, `${kind}:atDiff`);
  if (whyDiff) bump(t, `${kind}:whyDiff`);
  if (!atDiff && !whyDiff) bump(t, `${kind}:stable`);
  const list = examples[kind] ??= [];
  if (list.length < 3) {
    list.push({ fam, name, steps: orders[0].map(c => c.idx),
      musses: all, before: [...new Set(shown)],
      after: [...new Set(runs.map(({ r }, i) =>
        `${renamed(r.why)}@${at[i]}`))] });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = {}, examples = {};
  let last = null;
  const flush = () => last && console.log(last, JSON.stringify(out[last]));
  for (const [fam, name, hyp, orders] of problems(Number(process.argv[2]
    ?? 2000))) {
    if (fam !== last) flush();
    last = fam;
    const t = out[fam] ??= {};
    bump(t, 'problems');
    classify(t, examples, fam, name, hyp, orders);
  }
  flush();
  for (const [kind, list] of Object.entries(examples)) {
    for (const e of list) console.log(kind, JSON.stringify(e));
  }
}
