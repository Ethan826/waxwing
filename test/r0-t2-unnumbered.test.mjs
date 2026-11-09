import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { rowsCases } from './r0-t2-rows-cases.mjs';
import { wrongUnnumberedCases } from './r0-t2-unnumbered-cases.mjs';

const conversion = 'rawForRenumbering';

test('the unnumbered row converts by the trace numbering', async () => {
  assert.deepEqual(await wrongUnnumberedCases(load), []);
});

test('the opaque type exports no constructor', async () => {
  const module = await load('Domain.Checked.Unnumbered');
  assert.deepEqual(Object.keys(module).sort(), ['mappedUnnumbered',
    conversion, 'unnumbered', 'unnumberedArguments'].sort());
});

test('only the trace takes the raw row out', () => {
  const users = readdirSync('src', { recursive: true })
    .filter(name => name.endsWith('.purs'))
    .filter(name => readFileSync(`src/${name}`, 'utf8')
      .includes(conversion))
    .sort();
  assert.deepEqual(users, ['Domain/Checked/Unnumbered.purs',
    'Features/Check/Trace.purs']);
});

test('corpus collision: raw meta 0 is not the body hole 0', async () => {
  const { live } = await rowsCases(load);
  const source = readFileSync('docs/plans/2026-10-21-c001-explicit/'
    + 'baseline/a1-discard-dictionary.wxw', 'utf8');
  const item = live(source, 'main');
  assert.equal(item.checked.row.value1.value0.value0, 0);
  assert.equal(item.trace.row.value1.value0.value0, 1);
});
