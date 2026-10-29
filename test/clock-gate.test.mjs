import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { clockFindings, exemptions, floors }
  from '../scripts/structure-clocks.mjs';
import { scanSource } from '../scripts/clock-scan.mjs';

const small = { parallelTests: 1, scanned: 1 };
const gate = (sources, limits = small, listed = []) =>
  clockFindings(sources, parse, limits, listed);
const only = file => exemptions.filter(entry => entry.file === file);
const parallel = body => gate({ 'test/a.test.mjs': body });
const formsOf = body => scanSource('test/a.test.mjs', body, parse)
  .findings.map(found => found.form);
const arithmetic = 'new Date()';

const detected = [
  ['performance.now()', 'performance.now'],
  ['performance.timeOrigin', 'performance.timeOrigin'],
  ["performance.mark('x')", 'performance.mark'],
  ["performance.measure('x')", 'performance.measure'],
  ['globalThis.performance', 'globalThis.performance'],
  ['globalThis.performance.now()', 'performance.now'],
  ['globalThis.Date.now()', 'Date.now'],
  ['Date.now()', 'Date.now'],
  ['process.hrtime()', 'process.hrtime'],
  ['process.hrtime.bigint()', 'process.hrtime.bigint'],
  ["console.time('x')", 'console.time'],
  ["console.timeEnd('x')", 'console.timeEnd'],
  ["console.timeLog('x')", 'console.timeLog'],
  ['new Date() - 1', arithmetic],
  ['1 < new Date()', arithmetic],
  ['+new Date()', arithmetic],
  ["performance['now']()", 'performance.now']
];

test('every detected clock form fails in a parallel file', () => {
  for (const [code, form] of detected) {
    assert.deepEqual(formsOf(`const t = ${code};`), [form], code);
    assert.equal(parallel(`const t = ${code};\n`).length, 1, code);
  }
});

const imports = [
  ["import { performance } from 'node:perf_hooks';",
    'import node:perf_hooks'],
  ["import { performance } from 'perf_hooks';", 'import perf_hooks'],
  ["import * as hooks from 'node:perf_hooks';", 'import node:perf_hooks'],
  ["export { performance } from 'perf_hooks';", 'import perf_hooks'],
  ["const hooks = await import('node:perf_hooks');",
    'import node:perf_hooks'],
  ["import { timedBuild } from './go-timed.mjs';",
    'import test/go-timed.mjs'],
  ["import { assertWithin } from './timing.mjs';", 'import test/timing.mjs']
];

test('importing a clock module or timing helper fails', () => {
  for (const [code, form] of imports)
    assert.deepEqual(formsOf(code), [form], code);
});

const aliased = [
  ['const { now } = performance;', 'destructured performance.now'],
  ['const { now: n } = performance;', 'destructured performance.now'],
  ['let now; ({ now } = performance);', 'destructured performance.now'],
  ['const { hrtime } = process;', 'destructured process.hrtime'],
  ['const { time } = console;', 'destructured console.time'],
  ['const { now } = Date;', 'destructured Date.now'],
  ['const { performance } = globalThis;',
    'destructured globalThis.performance'],
  ['const { performance: { now } } = globalThis;',
    'destructured globalThis.performance'],
  ['const p = performance; p.now();', 'performance.now'],
  ['let p; p = performance; p.now();', 'performance.now'],
  ['const p = performance; const q = p; q.now();', 'performance.now'],
  ['const p = performance; const { now } = p;',
    'destructured performance.now'],
  ['const g = globalThis; g.performance.now();', 'performance.now'],
  ['const f = Date.now.bind(Date);', 'Date.now'],
  ['const f = performance.now;', 'performance.now']
];

test('aliases by destructuring, assignment and bind are followed', () => {
  for (const [code, form] of aliased)
    assert.deepEqual(formsOf(code), [form], code);
});

test('the same code passes in a serial file', () => {
  for (const [code] of [...detected, ...aliased, ...imports.slice(0, 5)])
    assert.deepEqual(gate({ 'test/a.serial.test.mjs': code,
      'test/b.test.mjs': 'export {};\n' }), [], code);
});

test('near misses are not clock reads', () => {
  for (const code of [
    'const performance = { now: () => 1 }; performance.now();',
    'function f(performance) { return performance.now(); }',
    'import { performance } from "./local.mjs"; performance.now();',
    'const Date = { now: () => 1 }; Date.now();',
    "const s = 'Date.now() performance.now()';",
    '// Date.now() performance.now()\nconst x = 1;',
    '/* process.hrtime */ const y = `performance.now`;',
    'const d = new Date(0) - new Date(1);',
    'const e = new Date(0); const t = e.valueOf;',
    'const o = { performance: 1 }; o.performance;',
    'const a = other.performance.now;',
    'const n = foo.Date.now();',
    'const t = new Date(0) instanceof Date;',
    "import { readFileSync } from 'node:fs';"
  ]) assert.deepEqual(formsOf(code), [], code);
});

const shrink = 'test/fx-shrink.mjs';
const approved = {
  [shrink]: 'export const shrink = limitMs => {\n'
    + '  const deadline = Date.now() + limitMs;\n'
    + '  for (;;) {\n'
    + '    if (++calls > budget || Date.now() > deadline) return current;\n'
    + '  }\n};\n',
  'test/a.test.mjs': "import { shrink } from './fx-shrink.mjs';\n"
};

test('the approved fx-shrink exemptions pass, and only exactly', () => {
  assert.deepEqual(gate(approved, small, only(shrink)), []);
  const wider = { ...approved,
    [shrink]: `${approved[shrink]}const x = Date.now();\n` };
  assert.deepEqual(gate(wider, small, only(shrink))
    .map(text => text.slice(0, 24)),
    ['test/fx-shrink.mjs:7: cl']);
});

test('an exemption matching a different count fails', () => {
  const fewer = { ...approved,
    [shrink]: approved[shrink].replace('Date.now() > deadline', 'false') };
  assert.ok(gate(fewer, small, only(shrink))
    .some(text => text.includes('matches 0 uses')));
  const twice = { ...approved, [shrink]: `${approved[shrink]}${approved[
    shrink].split('\n')[1]}\n` };
  assert.ok(gate(twice, small, only(shrink))
    .some(text => text.includes('matches 2 uses')));
});

const real = file => readFileSync(new URL(`../${file}`, import.meta.url),
  'utf8');
const goTimed = 'test/go-timed.mjs';

test('the go-timed nonce is exempt, its performance.now is not', () => {
  const found = gate({ [goTimed]: real(goTimed),
    'test/a.test.mjs': "import { fx } from './go-timed.mjs';\n" },
  small, only(goTimed));
  assert.ok(found.some(text => text.includes('(performance.now)')));
  assert.ok(found.some(text => text.includes('import test/go-timed.mjs')));
  assert.ok(!found.some(text => text.includes('(Date.now)')));
  assert.ok(!found.some(text => text.includes('exemption')));
});

test('an exemption is checked against its file even when unreached', () => {
  const text = real(goTimed);
  assert.deepEqual(gate({ [goTimed]: text, 'test/a.test.mjs': '' },
    small, only(goTimed)), []);
  const stale = gate({ [goTimed]: text.replace('Date.now()', 'Date.zzz()'),
    'test/a.test.mjs': '' }, small, only(goTimed));
  assert.ok(stale.some(item => item.includes('matches 0 uses')));
  assert.ok(gate({ 'test/a.test.mjs': '' }, small, only(goTimed))
    .some(item => item.includes('missing file')));
});

test('modules reached by relative import are scanned, others are not', () => {
  const found = gate({
    'test/a.test.mjs': "import { x } from './helper.mjs';\n",
    'test/helper.mjs': "export { y } from './deep.mjs';\n",
    'test/deep.mjs': 'export const y = performance.now();\n',
    'test/orphan.mjs': 'export const z = performance.now();\n',
    'test/serial-only.mjs': 'export const w = Date.now();\n',
    'test/b.serial.test.mjs': "import './serial-only.mjs';\n" });
  assert.equal(found.length, 1);
  assert.ok(found[0].startsWith('test/deep.mjs:1:'));
});

test('a file that cannot be parsed is a finding', () => {
  assert.ok(gate({ 'test/a.test.mjs': 'const = ;' })
    .some(text => text.includes('cannot parse')));
});

test('an empty or small scan cannot pass', () => {
  assert.ok(gate({}).some(text => text.includes('floor')));
  assert.ok(gate({ 'test/a.test.mjs': '' }, { parallelTests: 2,
    scanned: 1 }).some(text => text.includes('parallel test files')));
  assert.ok(floors.parallelTests >= 250 && floors.scanned >= 380);
});
