// The solver's state read back as a constraint system, to check that its
// rewriting steps preserve solutions (docs/plans/2026-10-17-open-row-
// merge-rules.md, "Rewrites"). The state's free variables are its unbound
// metas, the problem's and the solver's fresh ones alike; its constraints
// are the recorded lacks, apart pairs, upper bounds and pending
// equations, with every row read through the bindings. A solution of the
// state gives each of the problem's metas a value through its binding;
// the claim checked is that these values are exactly the problem's
// solutions, as oracle.mjs enumerates them. Semantics come from the
// oracle (`sat`, `denote`); only `within`, an upper bound, is new here.
import { sat, denote, isMeta } from './oracle.mjs';
import { flatten } from './solver.mjs';

const tail = t => ({ fields: [], tails: [t] });
const empty = { fields: [], tails: [] };
const key = (metas, value) => metas.map(m => `${m}=${value(m)}`).join(';');

// The constraints a state records, and its free (unbound) metas.
export function stateSystem(st, metas) {
  const cs = [];
  for (const [v, ls] of st.lacks) {
    for (const l of ls) cs.push({ k: 'lacks', v, l });
  }
  for (const pair of st.apart) {
    const [a, b] = pair.split('|');
    cs.push({ k: 'dis', l: tail(a), r: tail(b) });
  }
  for (const [v, atoms] of st.upper) cs.push({ k: 'within', v, atoms });
  for (const p of st.pending.values()) {
    cs.push({ k: 'eq', l: flatten(st, p.left), r: flatten(st, p.right) });
  }
  const free = new Set(metas.flatMap(m => flatten(st, tail(m)).tails));
  for (const c of cs) {
    const ts = c.k === 'lacks' || c.k === 'within' ? [c.v]
      : [...c.l.tails, ...c.r.tails];
    ts.forEach(t => free.add(t));
  }
  return { cs, free: [...free].filter(isMeta).sort() };
}

const holds = (hyp, asg, c) => (c.k === 'within'
  ? denote(asg, tail(c.v)).every(a => c.atoms.has(a)) : sat(hyp, asg, c));
const metasIn = c => (c.k === 'lacks' || c.k === 'within' ? [c.v]
  : [...c.l.tails, ...c.r.tails]).filter(isMeta);

// Each state solution as the problem metas' values, one key per
// solution; null when the state has more than `cap` free metas.
export function stateKeys(st, metas, universe, hyp, cap = 6) {
  const { cs, free } = stateSystem(st, metas);
  if (free.length > cap) return null;
  const asg = {}, out = new Set(), n = universe.length;
  const ready = free.map((m, i) => cs.filter(c => metasIn(c).includes(m)
    && metasIn(c).every(x => free.indexOf(x) <= i)));
  if (!cs.filter(c => metasIn(c).length === 0)
    .every(c => holds(hyp, {}, c))) return out;
  const value = m => denote(asg, flatten(st, tail(m))).sort().join(',');
  const rec = i => {
    if (i === free.length) {
      out.add(key(metas, value));
      return;
    }
    for (let mask = 0; mask < (1 << n); mask++) {
      asg[free[i]] = universe.filter((_, j) => mask & (1 << j));
      const own = { k: 'dis', l: tail(free[i]), r: empty };
      if (holds(hyp, asg, own) && ready[i].every(c => holds(hyp, asg, c))) {
        rec(i + 1);
      }
    }
    delete asg[free[i]];
  };
  rec(0);
  return out;
}

// The oracle's solutions in the same keys.
export const solutionKeys = (sols, metas) =>
  new Set(sols.map(s => key(metas, m => [...s[m]].sort().join(','))));

// Whether the empty default (every free meta {}) satisfies the state.
export function defaultHolds(st, metas, hyp) {
  const { cs, free } = stateSystem(st, metas);
  const asg = Object.fromEntries(free.map(m => [m, []]));
  return cs.every(c => holds(hyp, asg, c));
}
