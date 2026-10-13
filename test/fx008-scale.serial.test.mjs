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
const MEASURED_DEFERS = 1001; // 8,000 defers
const MEASURED_INSTALLATIONS = 486; // 1,000 installations
const MEASURED_CHAIN = 311; // a chain of 1,000 installing functions
const MEASURED_VARIABLES = 115; // 200 mark variables
const slack = 3;
const repeats = 50;

const resolved = source => resolve(parse(source).value0).value0;

const within = (t, name, make, size, measuredMs, times = 1) => {
  assert.equal(check(resolved(make(20))).constructor.name, 'Right');
  const program = resolved(make(size));
  const started = performance.now();
  let result;
  for (let run = 0; run < times; run++) result = check(program);
  const elapsedMs = performance.now() - started;
  t.diagnostic(`${name}: ${Math.round(elapsedMs)} ms, bound ${slack
    * measuredMs}`);
  assert.equal(result.constructor.name, 'Right');
  assert.ok(elapsedMs <= slack * measuredMs,
    `took ${elapsedMs} ms, bound ${slack * measuredMs} ms`);
};

test('8,000 defers check within the bound', t => {
  within(t, 'defers', manyDefers, 8000, MEASURED_DEFERS);
});

test('1,000 installations in one declaration', t => {
  within(t, 'installations', manyInstallations, 1000,
    MEASURED_INSTALLATIONS);
});

test('a chain of 1,000 forwarding installations', t => {
  within(t, 'chain', forwardingChain, 1000, MEASURED_CHAIN);
});

test('200 mark variables', t => {
  within(t, 'variables', markVariables, 200, MEASURED_VARIABLES,
    repeats);
});
