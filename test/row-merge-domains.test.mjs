import test from 'node:test';
import assert from 'node:assert/strict';
import { isMeta } from './row-merge-oracle.mjs';
import { run, stateOf } from './row-merge-entry.mjs';
import { emitted } from './row-merge-readback.mjs';
import { adr013 } from './row-merge-adr013.mjs';
import { everyOrder, problems } from './row-merge-domains.mjs';
import { defects, judge, newTally } from './row-merge-judge.mjs';

// R005 Tranche B Task 4: Task 0's exhaustive domains through the
// compiler's row solver, every problem in every order of its constraints
// (test/row-merge-domains.mjs). The one-tail problems in full, against
// ADR 013's rules (ledger L1); domain B in full and domain A as a
// deterministic sample here, with property E; the whole of domain A by
// `node scripts/row-merge-exhaustive.mjs A`, outside verify (about ten
// minutes of one core).

const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.v]
  : [...c.l.tails, ...c.r.tails])).filter(isMeta))].sort();

for (const name of ['A', 'B']) {
  test(`one-tail domain ${name}: ADR 013's rules, verdict and solution`, t => {
    let runs = 0;
    const tally = newTally();
    for (const p of problems(name, { oneTail: true })) {
      const metas = metasOf(p.cs);
      for (const order of everyOrder(p.cs)) {
        runs++;
        const want = adr013(p.hyp, order);
        const found = run(p.hyp, order);
        assert.equal(found.v, want.v, JSON.stringify(order));
        if (want.v !== 'accept') continue;
        const got = emitted(stateOf(found.subst), metas);
        for (const m of metas) {
          assert.deepEqual(got[m], atoms(want.value(m)), m);
        }
      }
      judge(p, everyOrder(p.cs), tally, { state: true });
    }
    t.diagnostic(`${tally.problems} problems, ${runs} runs`);
    assert.deepEqual(defects(tally), []);
    assert.equal(tally.skipped, 0);
  });
}

// A one-tail value's atoms: its labels, and its tail if rigid (an
// unsolved meta tail is empty, as the emitted solution reads it).
const atoms = value => [...value.fields,
  ...(value.tail !== null && !isMeta(value.tail) ? [value.tail] : [])].sort();

const SAMPLE = { A: 50, B: 1 };

for (const name of ['A', 'B']) {
  test(`domain ${name}, one candidate in ${SAMPLE[name]}, every order`,
    t => {
      const tally = newTally();
      for (const p of problems(name, { stride: SAMPLE[name] })) {
        judge(p, everyOrder(p.cs), tally, { state: true });
      }
      const { examples, ...counts } = tally;
      t.diagnostic(JSON.stringify(counts));
      assert.deepEqual(defects(tally), []);
      assert.ok(tally.stateChecked > 0 && tally.unresolved > 0);
    });
}
