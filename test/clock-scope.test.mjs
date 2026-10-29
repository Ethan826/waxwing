import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'acorn';
import { scanSource } from '../scripts/clock-scan.mjs';

const formsOf = body => scanSource('test/a.test.mjs', body, parse)
  .findings.map(found => found.form);

test('a local in one scope does not hide the root elsewhere', () => {
  for (const [code, form] of [
    ['function f() { const console = {}; console.time(); }\n'
      + "console.time('x');", 'console.time'],
    ['function f(process) {}\nprocess.hrtime.bigint();',
      'process.hrtime.bigint'],
    ['function f(Date) {}\nconst t = new Date() - 1;', 'new Date()'],
    ['{ let performance = 1; }\nperformance.now();', 'performance.now'],
    ['try {} catch (Date) {}\nDate.now();', 'Date.now'],
    ['for (const performance of []) {}\nperformance.now();',
      'performance.now'],
    ['const f = () => { var Date = 1; };\nDate.now();', 'Date.now'],
    ['const p = performance;\nfunction f(p) { p.now(); }\np.now();',
      'performance.now']
  ]) assert.deepEqual(formsOf(code), [form], code);
});

test('a clock-named local used inside its own scope passes', () => {
  for (const code of [
    'function f() { const console = { time() {} }; console.time(); }',
    'function f(process) { return process.hrtime.bigint(); }',
    'const f = (Date) => Date.now();',
    '{ const performance = {}; performance.now(); }',
    'try {} catch (performance) { performance.now(); }',
    'for (let Date = {}; ;) { Date.now(); }',
    'for (const performance of []) { performance.now(); }',
    'function f() { if (1) { var Date = {}; } return Date.now(); }',
    'const g = function Date() { return Date.now; };',
    'class performance {} performance.now();',
    'switch (1) { case 1: let console = {}; console.time(); }'
  ]) assert.deepEqual(formsOf(code), [], code);
});

test('every zero-argument new Date() is a finding, stored or not', () => {
  for (const code of [
    'const a = new Date(); work(); const b = new Date();\n'
      + 'if (b - a > 100) throw 1;',
    'const n = Number(new Date());',
    'const n = Date.parse(new Date());',
    'let e = 5; e -= new Date();',
    'const s = new Date();',
    'const s = new globalThis.Date();'
  ]) assert.ok(formsOf(code).length >= 1
    && formsOf(code).every(form => form === 'new Date()'), code);
  assert.equal(formsOf('const a = new Date(); const b = new Date();').length,
    2);
  for (const code of ['const d = new Date(0);', 'const d = new Date(x);',
    'const d = new Date("2026-10-29");'])
    assert.deepEqual(formsOf(code), [], code);
});

test('global. is read like globalThis.', () => {
  for (const [code, form] of [
    ['global.performance.now();', 'performance.now'],
    ['global.performance;', 'globalThis.performance'],
    ['global.Date.now();', 'Date.now'],
    ['global.process.hrtime();', 'process.hrtime'],
    ["global.console.time('x');", 'console.time'],
    ['const g = global; g.performance.now();', 'performance.now'],
    ['const { performance } = global;', 'destructured globalThis.performance']
  ]) assert.deepEqual(formsOf(code), [form], code);
  assert.deepEqual(formsOf('function f(global) { global.Date.now(); }'), []);
});
