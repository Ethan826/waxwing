import test from 'node:test';
import assert from 'node:assert/strict';
import { isMeta } from './row-merge-oracle.mjs';
import { run, stateOf } from './row-merge-entry.mjs';
import { emitted } from './row-merge-readback.mjs';
import { everyOrder, problems } from './row-merge-domains.mjs';

// R005 Tranche B Task 5, the older lack-adding path (the user's review of
// Task 4, 2026-10-18): a lack Check/Extension or Check/FreshRecord adds
// outside the row rules (Features.Check.Lacks `lackedOutside`, through
// the test entry's `lackingOlder`) must prune the bound and wake the
// waiting equations as the row rules' `requireLack` does. Domain B's
// problems with a `lacks`, in every order, through either path: the same
// verdict and the same emitted solution, so order independence holds
// through the older path too.
const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();
const older = c => (c.k === 'lacks' ? { ...c, k: 'lacksOlder' } : c);

test('domain B: a lack added the older way decides as the row rule does',
  t => {
    let runs = 0;
    let waited = 0;
    for (const p of problems('B')) {
      if (!p.cs.some(c => c.k === 'lacks')) continue;
      const metas = metasOf(p.cs);
      for (const order of everyOrder(p.cs)) {
        runs++;
        const rule = run(p.hyp, order);
        const path = run(p.hyp, order.map(older));
        assert.equal(path.v, rule.v, JSON.stringify(order));
        if (rule.v === 'D4') waited++;
        if (rule.v !== 'accept') continue;
        assert.deepEqual(emitted(stateOf(path.subst), metas),
          emitted(stateOf(rule.subst), metas), JSON.stringify(order));
      }
    }
    t.diagnostic(`${runs} runs, ${waited} Unresolved`);
    assert.ok(runs > 0 && waited > 0);
  });
