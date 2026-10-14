// FX008 Task 5: deferred rows settle in one loop (design §3.5 steps 1-3).
// A program with no finite solution is rejected, not looped on, so each
// probe compiles in a child process under a timeout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runGo } from './support.mjs';
import { compileWithin } from './regression-fx008.mjs';

const context = { compilerPath: 'output/Program.Compile/index.js' };
const timeoutMs = 20_000;
const pattern = / cannot be made equal: both end in \.\.\.$/;
const probe = name => readFileSync(`test/fx008-probes/${name}.wxw`, 'utf8');

const noFiniteSolution = (name, start, end) => {
  const source = probe(name);
  const found = compileWithin(context, source, timeoutMs);
  assert.equal(found.timedOut, false, 'timed out');
  assert.equal(found.diagnostic?.code, 'E_EFFECT');
  assert.match(found.diagnostic.message, pattern);
  assert.deepEqual([found.diagnostic.span.start.offset,
    found.diagnostic.span.end.offset], [start, end]);
};

test('dup has no finite solution', () => {
  noFiniteSolution('dup', 162, 172);
});

test('n1 has no finite solution', () => {
  noFiniteSolution('n1', 146, 156);
});

test('r5 has no finite solution', () => {
  noFiniteSolution('design-review/r5', 146, 156);
});

test('r4 has no finite solution', () => {
  noFiniteSolution('design-review/r4', 115, 125);
});

test('a satisfiable two-row cycle settles', () => {
  assert.equal(runGo(probe('cycle2')), '0\n7\n1\n');
});

test('8,000 defers settle', () => {
  const deferred = Array.from({ length: 8000 },
    (_, index) => `defer Console.print(${index}); `).join('');
  const source = `fn main(): Unit with Console = { ${deferred}() };`;
  const found = compileWithin(context, source, timeoutMs);
  assert.equal(found.timedOut, false, 'timed out');
  assert.equal(found.diagnostic, null);
  assert.ok(found.go.length > 0);
});
