// Ledger L31's direct check (R005 Tranche B plan, Task 4): every home the
// solver excludes is one no solution uses. Before each equation of a run,
// the homes `left = right` excludes under the state reached are listed by
// the compiler (Features.Check.RowEntry `exclusions`); for each, the
// state's solutions that also satisfy the equation, read back
// independently (test/row-merge-readback.mjs), must never put the atom in
// the meta. Stops at the first step that refuses or reaches a
// placeholder.
import { isMeta } from './row-merge-oracle.mjs';
import { exclusions, start1, stateOf, step1 } from './row-merge-entry.mjs';
import { someHolds } from './row-merge-readback.mjs';

export function checkExclusions(p, order, t) {
  const metas = [...new Set(p.cs.flatMap(c => (c.k === 'lacks' ? [c.v]
    : [...c.l.tails, ...c.r.tails])).filter(isMeta))];
  let subst = start1(p.hyp);
  for (const c of order) {
    if (c.k === 'eq') {
      const state = stateOf(subst);
      for (const e of exclusions(subst, c)) {
        const held = someHolds(state, p.hyp, p.universe, metas, c, e.meta,
          e.atom);
        if (held === null) t.exclusionsSkipped++;
        else if (held) {
          t.exclusionsWrong++;
          if (t.examples.length < 10) t.examples.push(['L31', p, order, e]);
        } else t.exclusionsChecked++;
      }
    }
    const next = step1(subst, c);
    if (next.constructor.name === 'Left') return;
    subst = next.value0;
  }
}
