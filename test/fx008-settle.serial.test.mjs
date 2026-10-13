import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';

// Task 5 review I1: the settle order must be linear in the number of
// deferrals. Measured on an idle machine at 16,000 `defer`s: 2.1 s linear,
// 26.5 s with the eager fallback that made the order quadratic (8,000: 0.9 s
// against 6.4 s). The bound sits between, with 4x headroom over the linear
// time for a loaded machine; a warm-up compile keeps JIT start-up out.
const bound = 8000;
const count = 16000;

const deferred = size => 'fn main(): Unit with Console = { '
  + Array.from({ length: size },
    (_, index) => `defer print(${index}); `).join('')
  + '() };';

test('16,000 defers settle within the bound', () => {
  checked(deferred(100));
  const started = performance.now();
  checked(deferred(count));
  const elapsed = performance.now() - started;
  assert.ok(elapsed < bound, `took ${elapsed} ms, bound ${bound} ms`);
});
