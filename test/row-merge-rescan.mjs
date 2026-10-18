// The wake-up comparison of R005 Tranche B Task 5 (ledger L32, the user's
// requirement of 2026-10-17): the drain the checker uses re-examines only
// the pending equations a change woke (Features.Check.Drain `indexed`,
// over the index of every variable an equation's rules read); the
// reference re-examines every pending equation, pass after pass, until a
// pass changes nothing (`rescan`). Both run each problem in each order;
// they must agree exactly: the verdict, the failure's kind, and the whole
// state read out (bindings, facts, bounds and pending equations, ids
// included), so the index loses no re-examination that would change
// anything. `compare` tallies runs and differences; the sensitivity
// check passes a deliberately incomplete wake-up in place of `indexed`.
import { run, stateOf, WAKES } from './row-merge-entry.mjs';

const plain = v => JSON.stringify({ v: v.v,
  failure: v.failure?.constructor.name ?? null,
  state: v.subst === undefined ? null : stateOf(v.subst) },
(key, value) => (value instanceof Map ? [...value] : value));

// A candidate that stops (an equation left woken at the end, Internal)
// differs from the reference; the reference itself may not stop.
const stopped = attempt => {
  try {
    return attempt();
  } catch (error) {
    return { v: `stopped: ${error.message}` };
  }
};

export const newComparison = () => ({ runs: 0, same: 0, different: 0,
  verdicts: {}, examples: [] });

// One problem in these orders, the candidate wake-up against `rescan`.
export function compare(p, orders, t, candidate = WAKES.indexed) {
  for (const order of orders) {
    t.runs++;
    const mine = stopped(() => run(p.hyp, order, candidate));
    const reference = run(p.hyp, order, WAKES.rescan);
    t.verdicts[reference.v] = (t.verdicts[reference.v] ?? 0) + 1;
    if (plain(mine) === plain(reference)) t.same++;
    else {
      t.different++;
      if (t.examples.length < 5) {
        t.examples.push({ p, order, mine: mine.v, reference: reference.v });
      }
    }
  }
}

// A wake-up that never re-examines a pending equation, and one that runs
// a single pass: incomplete on purpose, for the sensitivity check.
export const NEVER = { ready: () => true, due: () => () => false,
  again: () => () => false };
export const ONE_PASS = { ...WAKES.indexed, again: () => () => false };
