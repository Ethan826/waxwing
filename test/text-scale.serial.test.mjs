import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '../output/Program.Compile/index.js';
import { Right } from '../output/Data.Either/index.js';
import { timedBuild } from './go-timed.mjs';
import { scalePrograms } from './text-scale-programs.mjs';

// Text v1 Task 9: the scale rule (design §7). A 1 MB literal, 10,000
// interpolation parts and a literal of 100,000 escapes each compile and
// run with the right output. A serial test (`*.serial.test.mjs`):
// scripts/verify.mjs runs it after the parallel phase. Each bound is 3x
// the median of five runs on the development host (docs/progress.md, Text
// entry), for the in-process compile and for `go build` alone (after a
// warm-up build, the minimum of three).
const buildTimeoutMs = 120_000;
const bounds = {
  // Medians of five: compile 141 ms, go build 146 ms.
  'a 1 MB literal': { compileMs: 3 * 141, buildMs: 3 * 146 },
  // Compile 521 ms, go build 709 ms.
  '10,000 interpolation parts': { compileMs: 3 * 521, buildMs: 3 * 709 },
  // Compile 142 ms, go build 130 ms.
  'a literal of 100,000 escapes': { compileMs: 3 * 142, buildMs: 3 * 130 }
};

const buildOf = result => timedBuild(work => {
  const go = join(work, 'main.go');
  writeFileSync(go, result);
  return go;
}, buildTimeoutMs);

// Method (docs/engineering.md): one warm-up `go build` first, so Go's
// toolchain and standard library are cached, then each measured build is
// the minimum of three. Load inflates some runs; a real regression
// inflates all of them.
const builds = 3;
const warmUp = async () => {
  const trivial = compile('fn main(): Text = "x";');
  assert.ok(trivial instanceof Right);
  const built = await buildOf(trivial.value0);
  assert.equal(built.status, 0, built.errors);
};

for (const program of scalePrograms) {
  test(`${program.name} compiles and runs`, async t => {
    const started = performance.now();
    const result = compile(program.source);
    const compileMs = performance.now() - started;
    assert.ok(result instanceof Right, 'program was rejected');
    await warmUp();
    const runs = [];
    for (let run = 0; run < builds; run++) {
      runs.push(await buildOf(result.value0));
    }
    const buildMs = Math.min(...runs.map(one => one.buildMs));
    const bound = bounds[program.name];
    t.diagnostic(`compile ${Math.round(compileMs)} ms, bound `
      + `${bound.compileMs}; go build min of ${builds} `
      + `${Math.round(buildMs)} ms, bound ${bound.buildMs}`);
    for (const one of runs) {
      assert.equal(one.killed, false, `go build killed at ${buildTimeoutMs}`);
      assert.equal(one.status, 0, one.errors);
      assert.equal(one.stdout, program.expected);
    }
    assert.ok(compileMs <= bound.compileMs, `compile took ${compileMs} ms`);
    assert.ok(buildMs <= bound.buildMs, `go build took ${buildMs} ms`);
  });
}

// Review Focus 5: emission is deterministic, whatever the text.
test('emission is deterministic for the scale programs', () => {
  for (const program of scalePrograms) {
    const first = compile(program.source);
    const second = compile(program.source);
    assert.ok(first instanceof Right && second instanceof Right);
    assert.equal(first.value0, second.value0, program.name);
  }
});
