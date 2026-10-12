import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGo, timedRun } from './fx-scale-support.mjs';
import { caught, expected, installation, lookup, unwinding }
  from './fx-scale-programs.mjs';
import { scenario } from './fx-services-programs.mjs';

// FX001 Task 11 (design §5, "Scale, attributed separately"): Waxwing-
// emitted programs against fixed bounds, so they run serially (the
// fx-block.serial convention). Each bound is three times the median of five
// runs of the test on the author's laptop (2026-10-12; load averages and
// the minimum and maximum are in docs/progress.md, FX001 Task 11). The
// first run of a fresh binary pays the host's scan, so it is a warm-up that
// also checks the output; the second is timed. A failure under load goes
// to BACKLOG T003/T007; neither the bound nor a rerun hides it.
const medianMs = new Map([
  ['installation', 131], ['lookup', 141], ['unwinding', 46], ['caught', 38],
  ['go build', 135]]);
const bound = name => 3 * medianMs.get(name);

const timed = [
  ['installation: 1,000,000 shallow installs', 'installation', installation],
  ['lookup: 1,000,000 operations through a context 100 deep', 'lookup', lookup],
  ['unwinding: one fail across 1,000 handle frames', 'unwinding', unwinding],
  ['unwinding: 100,000 caught failures', 'caught', caught]
];

for (const [title, name, source] of timed) {
  test(title, t => {
    const built = buildGo(source);
    try {
      const warm = timedRun(built.binary);
      assert.equal(warm.stdout, `${expected.get(source)}\n`);
      const run = timedRun(built.binary);
      t.diagnostic(`${Math.round(run.elapsedMs)} ms, bound ${bound(name)}`);
      assert.equal(run.status, 0);
      assert.equal(run.stdout, warm.stdout);
      assert.ok(run.elapsedMs <= bound(name), `took ${run.elapsedMs} ms`);
    } finally { built.cleanup(); }
  });
}

test('go build of the acceptance scenario', t => {
  const built = buildGo(scenario);
  try {
    t.diagnostic(`${Math.round(built.buildMs)} ms, bound ${bound('go build')}`);
    assert.ok(built.buildMs <= bound('go build'), `took ${built.buildMs} ms`);
  } finally { built.cleanup(); }
});
