import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'acorn';
import { clockFindings, emptyInventory, floors }
  from '../scripts/structure-clocks.mjs';

// The clock gate's inventory policy (scripts/structure-clocks.mjs): must-fail
// fixtures for each way a timing use can leave its category, and a check
// that the real tree matches the real inventory.
const small = { parallelTests: 0, scanned: 0, perfFiles: 0 };
const perfCount = sources => Object.keys(sources).filter(file =>
  /^test\/[^/]+\.perf\.test\.mjs$/.test(file)).length;
const gate = (sources, inventory = {}, limits, outside) =>
  clockFindings(sources, parse, limits ?? { ...small,
    perfFiles: perfCount(sources) }, { ...emptyInventory, ...inventory },
  outside);
const use = (file, form, line, category, count = 1) =>
  ({ file, form, line, category, count });
const bound = 'const t = performance.now();\nwork();\n'
  + 'assert.ok(performance.now() - t < 5);\n';
const started = use('test/s.serial.test.mjs', 'performance.now',
  'const t = performance.now();', 'absolute budget');
const finished = use('test/s.serial.test.mjs', 'performance.now',
  'assert.ok(performance.now() - t < 5);', 'absolute budget');

test('an absolute bound in a serial file fails, listed or not', () => {
  const sources = { 'test/s.serial.test.mjs': bound };
  const unlisted = gate(sources);
  assert.equal(unlisted.length, 2);
  assert.ok(unlisted.every(text => text.includes('serial test')));
  const listed = gate(sources, { uses: [started, finished] });
  assert.equal(listed.length, 2);
  assert.ok(listed.every(text => text.includes('absolute budget use in a '
    + 'serial test')));
});

test('a termination safeguard, listed, passes in a serial file', () => {
  const as = category => ({ uses: [started, finished].map(entry =>
    ({ ...entry, category })) });
  const sources = { 'test/s.serial.test.mjs': bound };
  assert.deepEqual(gate(sources, as('termination safeguard')), []);
});

test('a direct clock read labeled growth check fails', () => {
  const sources = { 'test/s.serial.test.mjs': bound };
  const found = gate(sources, { uses: [started, finished].map(entry =>
    ({ ...entry, category: 'growth check' })) });
  assert.equal(found.length, 2);
  assert.ok(found.every(text => text.includes('labeled growth check')));
  const helper = { 'test/growth.mjs': 'const s = performance.now();\n' };
  assert.deepEqual(gate(helper, { uses: [use('test/growth.mjs',
    'performance.now', 'const s = performance.now();', 'growth check')] }),
  []);
});

test('a budget in a regression-phase module fails', () => {
  const probe = 'const t = Date.now();\n';
  const sources = { 'test/regression-x.mjs': probe };
  const unlisted = gate(sources);
  assert.equal(unlisted.length, 1);
  assert.ok(unlisted[0].includes('regression-phase module'));
  const listed = gate(sources, { uses: [use('test/regression-x.mjs',
    'Date.now', 'const t = Date.now();', 'absolute budget')] });
  assert.equal(listed.length, 1);
  assert.ok(listed[0].includes('absolute budget use in a regression test'));
  const reached = gate({ 'test/regression.mjs': "import './h.mjs';\n",
    'test/h.mjs': probe });
  assert.ok(reached[0].startsWith('test/h.mjs:1: clock read in a regression'));
});

test('a clock read in a parallel file fails whatever its category', () => {
  const sources = { 'test/p.test.mjs': 'const n = Date.now();\n' };
  assert.equal(gate(sources).length, 1);
  const listed = category => gate(sources, { uses: [use('test/p.test.mjs',
    'Date.now', 'const n = Date.now();', category)] });
  assert.equal(listed('termination safeguard').length, 1);
  assert.equal(listed('absolute budget').length, 1);
  assert.deepEqual(listed('functional clock use'), []);
});

const budget = (file, line) => use(file, 'performance.now', line,
  'absolute budget');
const perfSource = { 'test/x.perf.test.mjs': 'const u = performance.now();\n'
  + 'work();\nassert.ok(performance.now() - u < 5);\n' };

test('a perf file missing from the inventory fails', () => {
  const found = gate(perfSource, { uses: [] });
  assert.ok(found.some(text => text.includes('perf file missing')));
  const listed = { perfFiles: ['test/x.perf.test.mjs'], uses: [
    use('test/x.perf.test.mjs', 'performance.now',
      'const u = performance.now();', 'absolute budget'),
    use('test/x.perf.test.mjs', 'performance.now',
      'assert.ok(performance.now() - u < 5);', 'absolute budget')] };
  assert.deepEqual(gate(perfSource, listed), []);
  assert.ok(gate(perfSource, { ...listed, perfFiles: [] })
    .some(text => text.includes('perf file missing')));
});

test('a perf file with no listed budget or ratio use fails', () => {
  const file = 'test/x.perf.test.mjs';
  const bare = gate({ [file]: 'work();\n' }, { perfFiles: [file] });
  assert.equal(bare.length, 1);
  assert.ok(bare[0].includes('must reach a listed absolute budget'));
  const other = gate(perfSource, { perfFiles: [file], uses: [
    use(file, 'performance.now', 'const u = performance.now();',
      'diagnostics only'),
    use(file, 'performance.now', 'assert.ok(performance.now() - u < 5);',
      'diagnostics only')] });
  assert.equal(other.length, 1);
  const through = gate({ [file]: "import './h.mjs';\n",
    'test/h.mjs': 'const u = performance.now();\n' }, { perfFiles: [file],
    uses: [budget('test/h.mjs', 'const u = performance.now();')] });
  assert.deepEqual(through, []);
});

test('a perf clock read the inventory does not list fails', () => {
  const found = gate(perfSource, { perfFiles: ['test/x.perf.test.mjs'] });
  const reads = found.filter(text => text.includes('perf file or helper'));
  assert.equal(reads.length, 2);
  assert.equal(found.length, 3);
});

const growthImport = "import { assertGrowth } from './growth.mjs';\n";

test('a growth-helper import from an unlisted file fails', () => {
  const sources = { 'test/g.serial.test.mjs': growthImport,
    'test/growth.mjs': 'export const assertGrowth = () => {};\n' };
  const found = gate(sources);
  assert.equal(found.length, 1);
  assert.ok(found[0].includes('import test/growth.mjs'));
  const listed = use('test/g.serial.test.mjs', 'import test/growth.mjs',
    growthImport.trim(), 'growth check');
  assert.deepEqual(gate(sources, { uses: [listed] }), []);
  const parallel = { 'test/g.test.mjs': growthImport,
    'test/growth.mjs': sources['test/growth.mjs'] };
  assert.equal(gate(parallel, { uses: [{ ...listed,
    file: 'test/g.test.mjs' }] }).length, 1);
});

test('a stale inventory entry fails', () => {
  const sources = { 'test/s.serial.test.mjs': bound };
  const every = category => [started, finished].map(entry =>
    ({ ...entry, category }));
  const stale = (uses, extra = {}, outside) =>
    gate(sources, { uses, ...extra }, small, outside);
  assert.ok(stale([{ ...every('termination safeguard')[0], count: 2 },
    every('termination safeguard')[1]]).some(text =>
    text.includes('matches 1 uses, '
    + 'listed 2')));
  assert.ok(stale(every('termination safeguard').map(entry => ({ ...entry,
    line: `${entry.line} // changed` }))).some(text =>
    text.includes('serial test')));
  assert.ok(stale([...every('termination safeguard'), use('test/gone.mjs',
    'Date.now', 'x', 'termination safeguard')]).some(text =>
    text.includes('missing file test/gone.mjs')));
  assert.ok(stale(every('termination safeguard'), {
    perfFiles: ['test/y.perf.test.mjs']
  }).some(text => text.includes('missing perf file')));
  assert.ok(stale(every('termination safeguard'), { timeouts: [{ file:
    'test/s.serial.test.mjs', line: 'gone();', category:
    'termination safeguard' }] }).some(text => text.includes('is gone')));
  assert.ok(stale(every('termination safeguard'), { outOfScope: [{ file:
    'scripts/gone.mjs' }] }, new Set()).some(text =>
    text.includes('missing file scripts/gone.mjs')));
});

test('the real tree matches the real inventory', () => {
  const sources = Object.fromEntries(readdirSync('test').filter(name =>
    name.endsWith('.mjs')).map(name => [`test/${name}`,
    readFileSync(`test/${name}`, 'utf8')]));
  const inventory = JSON.parse(readFileSync(
    'test/fixtures/timing-inventory.json', 'utf8'));
  const outside = new Set(readdirSync('scripts').map(name =>
    `scripts/${name}`));
  assert.deepEqual(clockFindings(sources, parse, floors, inventory, outside),
    []);
  assert.equal(Object.keys(sources).filter(file =>
    file.endsWith('.perf.test.mjs')).length, floors.perfFiles);
  const budgets = inventory.uses.filter(entry =>
    entry.category === 'absolute budget' || entry.category
    === 'existing ratio check');
  for (const entry of budgets)
    assert.ok(entry.file.endsWith('.perf.test.mjs')
      || !entry.file.endsWith('.serial.test.mjs'), entry.file);
});
