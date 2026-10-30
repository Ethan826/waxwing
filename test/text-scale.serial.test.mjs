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
// run with the right output. Routine half: the compile and `go build` time
// bounds (3x the median of five runs, docs/progress.md, Text entry) are in
// text-scale.perf.test.mjs (npm run perf). Only the 10,000-part program
// kept the multi-build method (a warm-up, then the minimum of three).
// The kill is a termination safeguard, about ten times the measured 0.7 s.
const buildTimeoutMs = 120_000;
const timedPrograms = new Set(['10,000 interpolation parts']);

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
  test(`${program.name} compiles and runs`, async () => {
    const result = compile(program.source);
    assert.ok(result instanceof Right, 'program was rejected');
    const timed = timedPrograms.has(program.name);
    if (timed) await warmUp();
    const runs = [];
    for (let run = 0; run < (timed ? builds : 1); run++) {
      runs.push(await buildOf(result.value0));
    }
    for (const one of runs) {
      assert.equal(one.killed, false, `go build killed at ${buildTimeoutMs}`);
      assert.equal(one.status, 0, one.errors);
      assert.equal(one.stdout, program.expected);
    }
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
