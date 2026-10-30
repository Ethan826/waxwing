import test from 'node:test';
import { forms, partialFirstGrowth,
  throughSpecialize } from './fn-linear-forms.mjs';
import { assertGrowth } from './growth.mjs';

// FN001 Task 8 Step 1b, growth form of the partialFirst check: the same
// workload as fn-linear-timing.serial.test.mjs at 10,000 and 20,000
// parameters through Specialize, bounded by growth, not by an absolute time
// (docs/plans/2026-10-30-verification-contract-proposal.md). The protocol is
// test/growth.mjs; the sizes and threshold are partialFirstGrowth in
// fn-linear-sources.mjs. The regression row partialfirst-growth shows the
// assertion fails on a constructed quadratic.
const { small, large, threshold } = partialFirstGrowth;

test('partialFirst grows no worse than 3.0x from 10,000 to 20,000', () => {
  assertGrowth({ label: 'partialFirst', threshold, expected: 'ok', small,
    large, prepare: forms.partialFirst,
    run: source => throughSpecialize(source).outcome });
});
