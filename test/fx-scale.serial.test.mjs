import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGo, runBinary } from './fx-scale-support.mjs';
import { caught, expected, installation, lookup, unwinding }
  from './fx-scale-programs.mjs';
import { scenario } from './fx-services-programs.mjs';

// FX001 Task 11 (design §5, "Scale, attributed separately"): Waxwing-
// emitted programs. Routine half: each program builds, runs and prints the
// right output twice; the time bounds (three times the median of five
// runs, 2026-10-12) are in fx-scale.perf.test.mjs (npm run perf).
const programs = [
  ['installation: 1,000,000 shallow installs', installation],
  ['lookup: 1,000,000 operations through a context 100 deep', lookup],
  ['unwinding: one fail across 1,000 handle frames', unwinding],
  ['unwinding: 100,000 caught failures', caught]
];

for (const [title, source] of programs) {
  test(title, () => {
    const built = buildGo(source);
    try {
      const warm = runBinary(built.binary);
      assert.equal(warm.stdout, `${expected.get(source)}\n`);
      const run = runBinary(built.binary);
      assert.equal(run.status, 0);
      assert.equal(run.stdout, warm.stdout);
    } finally { built.cleanup(); }
  });
}

// buildGo asserts that `go build` succeeds.
test('go build of the acceptance scenario', () => {
  buildGo(scenario).cleanup();
});
