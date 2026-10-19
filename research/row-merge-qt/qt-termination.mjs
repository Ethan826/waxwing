// Termination of re-examination (docs/plans/2026-10-19-row-merge-rules.md
// §5, ledger L1): the adopted configuration (QT-strict+Sym+H, with case
// 2g since plan §10 decision 17; 2g removes a predicate) run with a
// trace of every case-3 move and every rescan pass, on research
// families and on a cyclic family made to feed merge results back into
// parts. Checked on every run (each a violation, exit 1):
//   lineage: the labels successive case-3 moves of one predicate (one
//     object, replaced in place) carry into its result are pairwise
//     disjoint, so a lineage moves at most |labels| times;
//   productive: every rescan pass that changed the state removed a
//     predicate or moved labels.
// Measured (no exit): runs whose "above" graph (P' above P when P's
// result meta occurs in a part of P') was cyclic at some pass; runs
// whose edges changed between passes; and the old height measure
// (rules §5: waiting predicates, then Σ over labels in parts of their
// predicate's height) failing to fall over a changing pass where both
// graphs are acyclic.
// Usage: node qt-termination.mjs [families|cyclic|examples|all]
import { verdictQT } from './qt-drive.mjs';
import { flatten, isMeta, nameOf } from './qt-facts.mjs';
import { problems } from '../open-row-merge/exhaustive-run.mjs';
import { mulberry } from '../open-row-merge/random.mjs';
import { shapedProblem, rawProblem, LABELS }
  from '../open-row-merge/programs-gen.mjs';
import { generator } from '../row-merge-alternatives/gen.mjs';

// Passes of one rescan past which a run counts as not terminating.
const PASS_CAP = 10000;
class Capped extends Error {}

const ADOPTED = { qts: true, selfApart: false, pairwise: false, sym: true,
  g2: true, hEnd: true };
const tally = () => ({ runs: 0, accept: 0, refuse: 0, D4: 0, moves: 0,
  maxLineageMoves: 0, maxPasses: 0, cyclicRuns: 0, edgeChangeRuns: 0,
  heightChecked: 0, heightNotFalling: 0, shiftedNotFalling: 0,
  lineageViolations: 0, traceChanged: 0,
  unproductive: 0, examples: [] });

// The above graph of the waiting predicates: index -> indices above it.
const graphOf = st => st.preds.map(p => {
  const meta = flatten(st, p.t).tails.find(isMeta);
  return st.preds.flatMap((q, j) => ([q.r, q.s].some(part =>
    flatten(st, part).tails.includes(meta)) && meta ? [j] : []));
});
const cyclic = above => {
  const state = above.map(() => 0);
  const visit = i => {
    if (state[i] === 1) return true;
    if (state[i] === 2) return false;
    state[i] = 1;
    const found = above[i].some(visit);
    state[i] = 2;
    return found;
  };
  return above.some((_, i) => visit(i));
};
const heights = above => {
  const memo = new Map();
  const h = i => {
    if (!memo.has(i)) memo.set(i, 1 + Math.max(-1, ...above[i].map(h)));
    return memo.get(i);
  };
  return above.map((_, i) => h(i));
};
// As rules §5 writes it (weight: the height) and shifted by one (weight:
// height + 1, so a predicate nothing is above still counts its labels).
const measureOf = (st, above, shift) => {
  const hs = heights(above);
  const labels = p => flatten(st, p.r).fields.length
    + flatten(st, p.s).fields.length;
  return [st.preds.length, st.preds.reduce((sum, p, i) => sum
    + labels(p) * (hs[i] + shift), 0)];
};
const below = ([a, b], [c, d]) => a < c || (a === c && b < d);
const edgeKey = (st, above) => above.map((js, i) => js.map(j =>
  `${i}>${j}`)).flat().join() + `|${st.preds.length}`;

const traceFor = (t, universe) => {
  const lineages = new Map();
  const run = { passes: 0, cyclic: false, edges: false, last: null,
    moved: false, lastVersion: null, lastCount: null };
  const noop = () => undefined;
  const trace = { fact: noop, enter: noop, leave: noop, mismatch: noop,
    subtract: noop,
    moved: (p, fields) => {
      const names = fields.map(nameOf);
      const seen = lineages.get(p) ?? new Set();
      if (names.some(n => seen.has(n)) || !names.length) {
        t.lineageViolations++;
        if (t.examples.length < 5) t.examples.push(['lineage', names]);
      }
      names.forEach(n => seen.add(n));
      lineages.set(p, seen);
      t.moves++;
      run.moved = true;
      const count = [...lineages.values()].map(s => s.size);
      t.maxLineageMoves = Math.max(t.maxLineageMoves, ...count);
      if (seen.size > universe) t.lineageViolations++;
    },
    rescan: () => {
      run.rescanPasses = 0;
      run.inLoop = false;
      run.last = null;
      run.lastVersion = null;
      run.lastCount = null;
    },
    pass: st => {
      run.passes++;
      if (++run.rescanPasses > PASS_CAP) throw new Capped();
      const above = graphOf(st);
      const key = edgeKey(st, above);
      const changed = run.lastVersion !== null
        && run.lastVersion !== st.version;
      const removed = run.lastCount !== null && st.preds.length
        < run.lastCount;
      if (changed && !run.moved && !removed && run.inLoop) t.unproductive++;
      if (cyclic(above)) run.cyclic = true;
      if (run.last && run.last.key !== key) run.edges = true;
      if (run.inLoop && changed && run.last && !run.last.cyclic
        && !cyclic(above)) {
        t.heightChecked++;
        if (!below(measureOf(st, above, 0), run.last.measure[0])) {
          t.heightNotFalling++;
        }
        if (!below(measureOf(st, above, 1), run.last.measure[1])) {
          t.shiftedNotFalling++;
          if (t.examples.length < 5) t.examples.push(['shifted', run.cs]);
        }
      }
      run.last = { key, cyclic: cyclic(above), measure: cyclic(above)
        ? null : [measureOf(st, above, 0), measureOf(st, above, 1)] };
      run.lastVersion = st.version;
      run.lastCount = st.preds.length;
      run.moved = false;
      run.inLoop = true;
    },
  };
  return { trace, run };
};

// One run; passes are compared only within one rescan.
export function runOne(t, hyp, cs, universe) {
  const { trace, run } = traceFor(t, universe);
  run.cs = cs;
  let v;
  try {
    v = verdictQT(hyp, cs, { ...ADOPTED, trace }).v;
  } catch (e) {
    if (!(e instanceof Capped)) throw e;
    t.capped = (t.capped ?? 0) + 1;
    if (t.examples.length < 5) t.examples.push(['capped', cs]);
    return 'capped';
  }
  if (verdictQT(hyp, cs, ADOPTED).v !== v) t.traceChanged++;
  t.runs++;
  t[v]++;
  t.maxPasses = Math.max(t.maxPasses, run.passes);
  if (run.cyclic) t.cyclicRuns++;
  if (run.edges) t.edgeChangeRuns++;
  return v;
}

const labelCount = universe => universe.filter(a => /^[a-z]/.test(a)).length;
const orders = cs => [cs, [...cs].reverse()];

const families = {
  'domain B': t => {
    for (const p of problems('B', 0, 1)) {
      for (const o of orders(p.cs)) runOne(t, p.hyp, o, 3);
    }
  },
  'domain A, 1 in 20': t => {
    let i = 0;
    for (const p of problems('A', 0, 1)) {
      if (i++ % 20) continue;
      for (const o of orders(p.cs)) runOne(t, p.hyp, o, 3);
    }
  },
  'raw, dense (alternatives gen, seeds 21, 22)': t => {
    for (const [seed, dense] of [[21, false], [22, true]]) {
      const { gen, perms } = generator(seed, dense);
      for (let i = 0; i < 2000; i++) {
        const p = gen();
        for (const o of perms(p.cs)) {
          runOne(t, p.hyp, o, labelCount(p.universe));
        }
      }
    }
  },
  'raw and shaped programs (seed 23, 24)': t => {
    for (const [seed, make] of [[23, rawProblem], [24, shapedProblem]]) {
      const rand = mulberry(seed);
      for (let i = 0; i < 2000; i++) {
        const q = make(rand);
        const hyp = { lacks: q.hyp.lacks,
          apart: q.hyp.apart.map(k => k.split('|')) };
        for (const o of orders(q.constraints)) {
          runOne(t, hyp, o, LABELS.length);
        }
      }
    }
  },
};

export { families, tally, labelCount };
