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
// entry), for the in-process compile and for `go build` alone.
const buildTimeoutMs = 120_000;
const bounds = {
  // Medians of five: compile 141 ms, go build 146 ms.
  'a 1 MB literal': { compileMs: 3 * 141, buildMs: 3 * 146 },
  // Compile 521 ms, go build 709 ms.
  '10,000 interpolation parts': { compileMs: 3 * 521, buildMs: 3 * 709 },
  // Compile 142 ms, go build 130 ms.
  'a literal of 100,000 escapes': { compileMs: 3 * 142, buildMs: 3 * 130 }
};

for (const program of scalePrograms) {
  test(`${program.name} compiles and runs`, async t => {
    const started = performance.now();
    const result = compile(program.source);
    const compileMs = performance.now() - started;
    assert.ok(result instanceof Right, 'program was rejected');
    const built = await timedBuild(work => {
      const go = join(work, 'main.go');
      writeFileSync(go, result.value0);
      return go;
    }, buildTimeoutMs);
    const bound = bounds[program.name];
    t.diagnostic(`compile ${Math.round(compileMs)} ms, bound `
      + `${bound.compileMs}; go build ${Math.round(built.buildMs)} ms, `
      + `bound ${bound.buildMs}`);
    assert.equal(built.killed, false, `go build killed at ${buildTimeoutMs}`);
    assert.equal(built.status, 0, built.errors);
    assert.equal(built.stdout, program.expected);
    assert.ok(compileMs <= bound.compileMs, `compile took ${compileMs} ms`);
    assert.ok(built.buildMs <= bound.buildMs,
      `go build took ${built.buildMs} ms`);
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
