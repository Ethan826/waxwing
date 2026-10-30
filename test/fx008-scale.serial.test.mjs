import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';
import {
  forwardingChain, manyDefers, manyInstallations, markVariables
} from './fx008-scale-programs.mjs';

// FX008 Task 9 (P11): the mark check stays linear in what it is given. Only
// `check` is timed, after a warm-up on a small program (JIT start-up), and
// each bound is three times the median of five runs of this test, one
// process each, on the author's laptop (2026-10-11, load average 3.5).
// `MEASURED_*` are those medians in milliseconds; the installations one was
// measured again after T008 made settling linear (2026-10-12, load average
// 3.3, median of five runs, 486 ms). The 200 variables take
// 3 ms, too little to time against a ratio, so that test checks the program
// `repeats` times.
// Bounds are in fx008-scale.perf.test.mjs (npm run perf).
const repeats = 50;

const resolved = source => resolve(parse(source).value0).value0;

const within = (make, size, times = 1) => {
  assert.equal(check(resolved(make(20))).constructor.name, 'Right');
  const program = resolved(make(size));
  let result;
  for (let run = 0; run < times; run++) result = check(program);
  assert.equal(result.constructor.name, 'Right');
};

test('8,000 defers check', () => {
  within(manyDefers, 8000);
});

test('1,000 installations in one declaration', () => {
  within(manyInstallations, 1000);
});

test('a chain of 1,000 forwarding installations', () => {
  within(forwardingChain, 1000);
});

test('200 mark variables', () => {
  within(markVariables, 200, repeats);
});
