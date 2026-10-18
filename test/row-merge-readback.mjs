// A solver state read back as a constraint system, independently of the
// compiler (R005 Tranche B plan, Task 4, the user's requirement of
// 2026-10-17): the test follows the exported bindings itself, one level
// at a time, never calling the compiler's flattener. The state's free
// variables are its unbound metas; its constraints are the recorded lacks
// on metas, the pairs with a meta side, the upper bounds, each pending
// equation (Task 5: its two sides read through the bindings, as
// multisets), and each free meta's own well-formedness (rigid facts are
// the hypotheses). Property E
// (rules §0): the program metas' values over the state's solutions are
// exactly the problem's solutions. `skipNested` corrupts the traversal
// (a bound tail inside a binding read as empty), for the sensitivity
// check that must catch it.
import { isMeta, sat, wellFormed, keyOf } from './row-merge-oracle.mjs';

const tail = t => ({ fields: [], tails: [t] });

// The value of a variable under `asg` (the free metas' values), through
// the bindings.
export function valueOf(state, asg, name, options = {}) {
  if (!isMeta(name)) return [name];
  const bound = state.bindings.get(name);
  if (!bound) return asg[name] ?? [];
  const out = [...bound.fields];
  for (const t of bound.tails) {
    if (options.skipNested && state.bindings.has(t)) continue;
    out.push(...valueOf(state, asg, t, options));
  }
  return out;
}

// The free metas the state and these program metas reach.
export function freeMetas(state, metas) {
  const free = new Set();
  const seen = new Set();
  const visit = name => {
    if (!isMeta(name) || seen.has(name)) return;
    seen.add(name);
    const bound = state.bindings.get(name);
    if (bound) bound.tails.forEach(visit); else free.add(name);
  };
  metas.forEach(visit);
  state.lacks.forEach(f => visit(f.tail));
  state.apart.forEach(([a, b]) => { visit(a); visit(b); });
  state.upper.forEach(u => visit(u.meta));
  (state.pending ?? []).forEach(p => [...p.l.tails, ...p.r.tails]
    .forEach(visit));
  return [...free].sort();
}

// The state's constraints, each a test on the free metas' values.
function constraints(state, hyp, options) {
  const value = (asg, t) => valueOf(state, asg, t, options);
  const out = [];
  for (const f of state.lacks) {
    if (!isMeta(f.tail)) continue;
    for (const l of f.labels) {
      out.push(asg => sat(hyp, { mz: value(asg, f.tail) },
        { k: 'lacks', v: 'mz', l }));
    }
  }
  for (const [a, b] of state.apart) {
    if (!isMeta(a) && !isMeta(b)) continue;
    out.push(asg => wellFormed(hyp, [...value(asg, a), ...value(asg, b)]));
  }
  for (const u of state.upper) {
    out.push(asg => value(asg, u.meta).every(x => u.atoms.includes(x)));
  }
  const atoms = (asg, r) => [...r.fields,
    ...r.tails.flatMap(t => value(asg, t))].sort().join();
  for (const p of state.pending ?? []) {
    out.push(asg => atoms(asg, p.l) === atoms(asg, p.r));
  }
  return out;
}

// Every solution of the state: calls `visit(value)` with each one's
// value function; null when it has more than `cap` free metas.
export function eachSolution(state, hyp, universe, metas, visit,
  options = {}, cap = 4) {
  const free = freeMetas(state, metas);
  if (free.length > cap) return null;
  const out = constraints(state, hyp, options);
  const asg = {};
  const value = name => valueOf(state, asg, name, options);
  const n = universe.length;
  const rec = i => {
    if (i === free.length) {
      if (out.every(test => test(asg))) visit(value);
      return;
    }
    for (let mask = 0; mask < (1 << n); mask++) {
      asg[free[i]] = universe.filter((_, j) => mask & (1 << j));
      if (wellFormed(hyp, asg[free[i]])) rec(i + 1);
    }
    delete asg[free[i]];
  };
  rec(0);
  return free.length;
}

// Property E's keys: the program metas' values, one key per solution.
export function stateKeys(state, hyp, universe, metas, options = {}) {
  const keys = new Set();
  const found = eachSolution(state, hyp, universe, metas,
    value => keys.add(keyOf(metas, value)), options);
  return found === null ? null : keys;
}

// The emitted solution: every free meta empty, read through the bindings.
export const emitted = (state, metas) => Object.fromEntries(
  metas.map(m => [m, valueOf(state, {}, m).sort()]));

// Whether some solution of the state that also satisfies `c` (read
// through the bindings) puts `atom` in `meta`; null past the cap.
export function someHolds(state, hyp, universe, metas, c, meta, atom) {
  const rowOf = (value, r) => ({ fields: [...r.fields,
    ...r.tails.flatMap(t => value(t))], tails: [] });
  let found = false;
  const counted = eachSolution(state, hyp, universe,
    [...metas, meta, ...c.l.tails, ...c.r.tails].filter(isMeta),
    value => {
      if (found) return;
      const satisfied = sat(hyp, {}, { k: c.k, l: rowOf(value, c.l),
        r: rowOf(value, c.r) });
      if (satisfied && value(meta).includes(atom)) found = true;
    });
  return counted === null ? null : found;
}
