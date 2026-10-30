import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '../output/Program.Compile/index.js';
import { Right } from '../output/Data.Either/index.js';
import { timedBuild } from './go-timed.mjs';
import { chain, curried, generic } from './fn-scale-programs.mjs';
import { expected, source } from './fn-scale-mixed.mjs';

// FN001 Task 6: the scale rule (design §13) for the adopted convention.
// A 5,000-parameter function with a mixed body (Int, Bool and list
// parameters, each read twice out of order) is called directly and used
// as a staged value; through the CLI, its generated program's `go build`
// takes at most 10 s. Task 8 adds the full scale set below. A serial
// test (`*.serial.test.mjs`): scripts/verify.mjs runs these one at a time
// after the parallel phase, so `go build` is not timed under the parallel
// runner's load (user decision A, 2026-10-09; it failed once at 10,584 ms
// there, 4.0-4.4 s alone).
const buildBoundMs = 10_000;
const buildTimeoutMs = 120_000;

// Each program's Waxwing phases (Parse through Go emission, in process)
// are bounded at three times their time measured 2026-10-09 on the
// author's laptop (cold, one process per file); `go build` at 10 s.
const scaleTest = (title, program, phaseBoundMs) => test(title, async t => {
  const { source: text, expected: output } = program;
  const started = performance.now();
  const result = compile(text);
  const phaseMs = performance.now() - started;
  assert.ok(result instanceof Right, 'the program compiles');
  const built = await timedBuild(dir => {
    const go = join(dir, 'main.go');
    writeFileSync(go, result.value0);
    return go;
  }, buildTimeoutMs);
  t.diagnostic(`phases ${Math.round(phaseMs)} ms, bound ${phaseBoundMs}; `
    + `go build ${Math.round(built.buildMs)} ms, bound ${buildBoundMs}`);
  assert.ok(phaseMs <= phaseBoundMs, `phases took ${phaseMs} ms`);
  assert.equal(built.killed, false, `go build killed at ${buildTimeoutMs}`);
  assert.equal(built.status, 0, built.errors);
  assert.ok(built.buildMs <= buildBoundMs, `go build took ${built.buildMs}`);
  assert.equal(built.stdout, output);
});

// Phases measured 1,240-1,260 ms.
scaleTest('a 5,000-parameter function used as a value builds within 10 s',
  { source, expected: `${expected}\n` }, 3 * 1250);
// f(1)(2)…(1000); measured 74-85 ms.
scaleTest('a chain of 1,000 partial applications builds within 10 s',
  chain(1000), 3 * 75);
// `Int -> Int -> …`, 1,000 parameters, one nesting level; measured 65-77 ms.
scaleTest('a 1,000-long written arrow type builds within 10 s',
  curried(1000), 3 * 75);
// Through `id` and `Box(a)`, whole and as a partial: the specializer keys,
// compares and orders the 5,000-parameter arrow and Go gets its named
// function types; measured 529-581 ms.
scaleTest('a 5,000-parameter function type through generics builds in 10 s',
  generic(5000), 3 * 550);
