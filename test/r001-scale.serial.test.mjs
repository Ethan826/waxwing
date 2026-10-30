import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '../output/Program.Compile/index.js';
import { Right } from '../output/Data.Either/index.js';
import { timedBuild } from './go-timed.mjs';
import { keyTexts } from './poly-keys.mjs';
import { serviceEnvironments, shapeChain } from './r001-scale-programs.mjs';

// R001 Task 10: the scale rule (design §8). 200 distinct record shapes
// flow through a chain of 20 generic functions: one key per shape and
// link, so keys grow linearly. Routine half: the key count is exact, the Go
// lines are deterministic and bounded (3x the median of five runs on the
// development host, docs/progress.md, R001 entry), and every build runs and
// prints the right output. The compile and `go build` time bounds are in
// r001-scale.perf.test.mjs (npm run perf).
const shapes = 200;
const depth = 20;
const slack = 3;
const measured = { lines: 19617 };
const bounds = { lines: slack * measured.lines };
// A termination safeguard, about ten times the measured 0.7 s build.
const buildTimeoutMs = 120_000;
const builds = 3;

const buildOf = go => timedBuild(work => {
  const path = join(work, 'main.go');
  writeFileSync(path, go);
  return path;
}, buildTimeoutMs);

const warmUp = async () => {
  const trivial = compile('fn main(): Int = 0;');
  assert.ok(trivial instanceof Right);
  const built = await buildOf(trivial.value0);
  assert.equal(built.status, 0, built.errors);
};

const lineCount = go => go.split('\n').length;

test(`${shapes} shapes through a chain of ${depth} generic functions`,
  async t => {
    const program = shapeChain(shapes, depth);
    const result = compile(program.source);
    assert.ok(result instanceof Right, 'program was rejected');
    const keys = keyTexts(program.source).length;
    const lines = lineCount(result.value0);
    await warmUp();
    const runs = [];
    for (let run = 0; run < builds; run++) {
      runs.push(await buildOf(result.value0));
    }
    t.diagnostic(`keys ${keys}; lines ${lines}, bound ${bounds.lines}`);
    for (const one of runs) {
      assert.equal(one.killed, false, `go build killed at ${buildTimeoutMs}`);
      assert.equal(one.status, 0, one.errors);
      assert.equal(one.stdout, program.expected);
    }
    assert.equal(keys, program.keys);
    assert.ok(lines <= bounds.lines, `${lines} Go lines`);
  });

// The services proxy (design §8): measured and recorded in
// docs/progress.md as a proxy, not a validation of the services feature,
// so it has no time bound; its keys are exact and its output checked.
test('overlapping environments of functions through generic code',
  async t => {
    const program = serviceEnvironments(20, 100, 8);
    const result = compile(program.source);
    assert.ok(result instanceof Right, 'program was rejected');
    const keys = keyTexts(program.source).length;
    t.diagnostic(`keys ${keys}; lines ${lineCount(result.value0)}`);
    assert.equal(keys, program.keys);
    const built = await buildOf(result.value0);
    assert.equal(built.status, 0, built.errors);
    assert.equal(built.stdout, program.expected);
  });
