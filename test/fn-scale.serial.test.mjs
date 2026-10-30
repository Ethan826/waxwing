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
// builds and prints the right output. Task 8 adds the full scale set below.
// Routine half: the time bounds (phases, `go build` at 10 s) are in
// fn-scale.perf.test.mjs (npm run perf). The `go build` kill below
// (`buildTimeoutMs`) is a termination safeguard, about ten times the
// measured 4 s: a review guideline, not a guarantee.
const buildTimeoutMs = 120_000;

const scaleTest = (title, program) => test(title, async () => {
  const { source: text, expected: output } = program;
  const result = compile(text);
  assert.ok(result instanceof Right, 'the program compiles');
  const built = await timedBuild(dir => {
    const go = join(dir, 'main.go');
    writeFileSync(go, result.value0);
    return go;
  }, buildTimeoutMs);
  assert.equal(built.killed, false, `go build killed at ${buildTimeoutMs}`);
  assert.equal(built.status, 0, built.errors);
  assert.equal(built.stdout, output);
});

scaleTest('a 5,000-parameter function used as a value builds',
  { source, expected: `${expected}\n` });
// f(1)(2)…(1000).
scaleTest('a chain of 1,000 partial applications builds', chain(1000));
// `Int -> Int -> …`, 1,000 parameters, one nesting level.
scaleTest('a 1,000-long written arrow type builds', curried(1000));
// Through `id` and `Box(a)`, whole and as a partial: the specializer keys,
// compares and orders the 5,000-parameter arrow and Go gets its named
// function types.
scaleTest('a 5,000-parameter function type through generics builds',
  generic(5000));
