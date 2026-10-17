// The enumeration and the per-problem checks of exhaustive.mjs.
import { verdict, row } from './drive.mjs';
import { allSolutions, leastOf, sat, isMeta } from './oracle.mjs';
import * as S from './solver.mjs';
import { stateKeys, solutionKeys, defaultHolds } from './state.mjs';

// Domain A is the plan's bound; domain B trades the rigid and a label for
// a fourth meta, so that quiet equations (two metas a side) arise.
const DOMAINS = {
  A: { labels: ['a', 'b'], metas: ['m0', 'm1', 'm2'], rigids: ['R'] },
  B: { labels: ['a'], metas: ['m0', 'm1', 'm2', 'm3'], rigids: [] },
};
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const tail = t => row([], [t]);

function domain(name) {
  const { labels, metas, rigids } = DOMAINS[name];
  const vars = [...metas, ...rigids];
  const tailSets = [[]];
  vars.forEach((v, i) => {
    tailSets.push([v]);
    vars.slice(i).forEach(w => tailSets.push([v, w]));
  });
  const rows = [[], ...labels.map(l => [l])]
    .flatMap(f => tailSets.map(t => row(f, t)));
  const eqs = [];
  rows.forEach((l, i) => rows.slice(i).forEach(r =>
    eqs.push({ k: 'eq', l, r })));
  const extras = [null,
    ...vars.flatMap(v => labels.map(l => ({ k: 'lacks', v, l }))),
    ...tailSets.filter(t => t.length === 2)
      .map(([v, w]) => ({ k: 'dis', l: tail(v), r: tail(w) }))];
  const renames = perms(metas).flatMap(ms => perms(labels).map(ls => {
    const map = Object.fromEntries([...metas.map((m, i) => [m, ms[i]]),
      ...labels.map((l, i) => [l, ls[i]]), ...rigids.map(r => [r, r])]);
    return x => map[x];
  }));
  const hyps = rigids.length
    ? [[], ...labels.map(l => [l]), labels].map(h => ({ R: h })) : [{}];
  return { eqs, extras, renames, hyps, rigids };
}

const rowText = (f, r) => `${r.fields.map(f).sort()}/${r.tails.map(f).sort()}`;
const cText = (f, c) => (c.k === 'lacks' ? `L${f(c.v)}${f(c.l)}`
  : [rowText(f, c.l), rowText(f, c.r)].sort().join(c.k));
const pText = (f, cs) => cs.map(c => cText(f, c)).sort().join(' ');

export function* problems(name, w, workers) {
  const { eqs, extras, renames, hyps, rigids } = domain(name);
  // Canonical: no renaming gives a smaller text.
  const canonical = cs => {
    const own = pText(x => x, cs);
    return renames.every(f => pText(f, cs) >= own);
  };
  for (let i = w; i < eqs.length; i += workers) {
    for (let j = i; j < eqs.length; j++) {
      for (const extra of extras) {
        const cs = [eqs[i], eqs[j], ...(extra ? [extra] : [])];
        if (!canonical(cs)) continue;
        const rigid = cs.some(c => (c.k === 'lacks' ? [c.v]
          : [...c.l.tails, ...c.r.tails]).some(t => rigids.includes(t)));
        for (const lacks of rigid ? hyps : [{}]) {
          yield { hyp: { lacks, apart: [] }, cs };
        }
      }
    }
  }
}

const STATS = ['commits', 'defers', 'quiet', 'fresh', 'binds', 'selfApart',
  'emptied', 'narrowed', 'oneMeta', 'remainder', 'cancelled', 'sumBound',
  'sumLack', 'sumApart', 'noHome', 'dedup', 'reexam'];

export const newTally = () => ({ problems: 0, runs: 0, accept: 0,
  refuse: 0, D4: 0, dishonest: 0, solvedViolates: 0, notLeast: 0,
  unsound: 0, equivChecked: 0, equivSkipped: 0, equivFail: 0,
  defaultFail: 0, c1fail: 0, c3fail: 0, d4WithLeast: 0, unresolved0: 0,
  unresolved1: 0, unresolvedMany: 0, orderDiff: 0, freshOver: 0,
  versionOver: 0, maxFreshRatio: 0, maxVersionRatio: 0, oneTail: 0,
  oneTailNotForced: 0, crash: 0, refusedBy: {},
  fired: Object.fromEntries(STATS.map(s => [s, 0])), examples: [] });

export const merge = (into, t) => {
  for (const [k, v] of Object.entries(t)) {
    if (k === 'examples') into.examples.push(...v);
    else if (k === 'fired') {
      for (const s of STATS) into.fired[s] += v[s];
    } else if (k === 'refusedBy') {
      for (const [r, n] of Object.entries(v)) {
        into.refusedBy[r] = (into.refusedBy[r] ?? 0) + n;
      }
    } else if (k.startsWith('max')) into[k] = Math.max(into[k], v);
    else into[k] += v;
  }
};

const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();
const atomsOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.l, ...(isMeta(c.v) ? [] : [c.v])]
  : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails])))]
  .filter(a => !isMeta(a)).sort();
const shareAMeta = st => {
  const ms = [...st.pending.values()].map(p => new Set([...p.left.tails,
    ...p.right.tails].filter(isMeta)));
  return ms.some((a, i) => ms.slice(i + 1).some(b => [...a].some(x =>
    b.has(x))));
};
const oneTail = cs => cs.every(c => c.k === 'lacks'
  || (c.l.tails.length <= 1 && c.r.tails.length <= 1));

// The measure of design §2.7 as a number of state changes (version
// steps): at most N metas, each bound once; N.L lacks; (N + R)(N + R + 1)/2
// apart pairs, each touching both its sides (2 steps); a bound set once
// and then shrunk at most K times per meta.
const measure = (P, K, L, R) => {
  const N = P * (1 + K);
  return N + N * L + (N + R) * (N + R + 1) + N * (K + 1);
};

export function runProblem(p, t) {
  const metas = metasOf(p.cs), universe = atomsOf(p.cs);
  const sols = allSolutions(metas, universe, p.hyp, p.cs);
  const least = leastOf(metas, p.hyp, p.cs, sols);
  const keys = solutionKeys(sols, metas);
  const labels = universe.filter(a => /^[a-z]/.test(a)).length;
  const K = universe.length, bound = measure(metas.length, K, labels,
    K - labels);
  t.problems++;
  const one = oneTail(p.cs);
  if (one) t.oneTail++;
  const classes = new Set();
  for (const order of perms(p.cs)) {
    t.runs++;
    let v;
    try {
      v = verdict(p.hyp, order);
    } catch (e) {
      t.crash++;
      t.examples.push(['crash', e.message, p]);
      continue;
    }
    classes.add(v.v);
    t[v.v]++;
    check(p, t, v, { metas, universe, sols, least, keys, bound, one });
  }
  if (classes.size > 1) {
    t.orderDiff++;
    t.examples.push(['C2', p, [...classes]]);
  }
}

function check(p, t, v, ctx) {
  const { metas, universe, sols, least, keys, bound, one } = ctx;
  const bad = (kind, ...more) => {
    t[kind]++;
    if (t.examples.length < 20) t.examples.push([kind, p, ...more]);
  };
  const st = v.st;
  STATS.forEach(s => { if (st.stats[s] > 0) t.fired[s]++; });
  const P = metas.length, K = universe.length;
  t.maxFreshRatio = Math.max(t.maxFreshRatio, st.stats.fresh / (P * K || 1));
  if (st.stats.fresh > P * K) bad('freshOver', st.stats.fresh);
  if (bound > 0) {
    t.maxVersionRatio = Math.max(t.maxVersionRatio, st.version / bound);
  }
  if (st.version > bound) bad('versionOver', st.version, bound);
  if (one && st.stats.commits + st.stats.defers + st.stats.quiet > 0) {
    bad('oneTailNotForced', st.stats);
  }
  if (v.v === 'refuse') {
    const kind = v.why.split(':')[0];
    t.refusedBy[kind] = (t.refusedBy[kind] ?? 0) + 1;
    if (sols.length) bad('dishonest', v.why);
    return;
  }
  const got = stateKeys(st, metas, universe, p.hyp);
  if (got === null) t.equivSkipped++;
  else {
    t.equivChecked++;
    const same = got.size === keys.size && [...got].every(k => keys.has(k));
    if (!same) bad('equivFail', [...got], [...keys]);
  }
  if (v.v === 'accept') {
    const sol = S.solution(st, metas);
    if (!p.cs.every(c => sat(p.hyp, sol, c))) bad('solvedViolates', sol);
    if (!defaultHolds(st, metas, p.hyp)) bad('defaultFail');
    if (!least) bad('unsound', sol);
    else if (metas.some(m => sol[m].join() !== [...least[m]].sort().join())) {
      bad('notLeast', sol, least);
    }
    return;
  }
  t[sols.length === 0 ? 'unresolved0' : sols.length === 1 ? 'unresolved1'
    : 'unresolvedMany']++;
  if (least) {
    t.d4WithLeast++;
    if (st.pending.size === 1) bad('c1fail');
    if (!shareAMeta(st)) bad('c3fail');
  }
}
