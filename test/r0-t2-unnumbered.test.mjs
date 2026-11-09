import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { rowsCases } from './r0-t2-rows-cases.mjs';
import { exportsWrong, home, notOnlyFinish, scanWrong, staleSlots, strayUses,
  wrongUnnumberedCases } from './r0-t2-unnumbered-cases.mjs';

test('the unnumbered row converts by the trace numbering', async () => {
  assert.deepEqual(await wrongUnnumberedCases(load), []);
});

test('the opaque type exports only its operations', async () => {
  assert.deepEqual(await exportsWrong(load), []);
});

test('each operation is used only where permitted', () => {
  const compiled = Object.fromEntries(readdirSync('output')
    .filter(name => existsSync(`output/${name}/index.js`))
    .map(name => [name, readFileSync(`output/${name}/index.js`, 'utf8')]));
  assert.ok(home in compiled);
  assert.deepEqual(strayUses(compiled), []);
  assert.deepEqual(staleSlots(compiled), []);
  assert.deepEqual(notOnlyFinish(compiled), []);
  assert.deepEqual(scanWrong(), []);
});

test('corpus collision: raw meta 0 is not the body hole 0', async () => {
  const { live } = await rowsCases(load);
  const source = readFileSync('docs/plans/2026-10-21-c001-explicit/'
    + 'baseline/a1-discard-dictionary.wxw', 'utf8');
  const item = live(source, 'main');
  assert.equal(item.checked.row.value1.value0.value0, 0);
  assert.equal(item.trace.row.value1.value0.value0, 1);
});
