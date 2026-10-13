import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { command, checked, runGo } from './support.mjs';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';
import { namedKeys } from './poly-keys.mjs';
import { baseline, dropped, fake, fakeOutput, realOutput, scenario }
  from './fx-services-programs.mjs';

// FX001 Task 11 (design §5, acceptance scenario): services with overlapping
// requirements, composed with no row annotations beyond each function's own
// labels; implementations constructed by named functions and installed in
// `main`, never selected by a flag (injection, 2026-10-13); cleanup only
// through `defer`, with `nofail` marks along the cleanup chain (FX008).
test('live handlers constructed and installed in main, through the CLI', () => {
  assert.equal(command('node', ['scripts/waxwing.mjs', 'run',
    'examples/services.wxw']), realOutput);
});

test('stateless fakes constructed and installed by their own main', () => {
  assert.equal(runGo(fake), fakeOutput);
});

test('the example matches its Go snapshot byte for byte', () => {
  assert.equal(checked(scenario), readFileSync('bootstrap/services.go', 'utf8'));
});

test('a dropped handler: headline, origin, path and boundary notes', () => {
  const main = /fn main\(\): Unit with Console =\n[^]*\n  \};/.exec(dropped)[0];
  expectDiagnostic(dropped, {
    code: 'E_EFFECT', message: 'Unhandled Clock in main', at: ['report(1, 2)'],
    notes: [['audited(first)', 'audited(first)', 'through report'],
      ['stamp(id)', 'stamp(id)', 'through audited'],
      ['let at = now();', 'now()', 'Clock is performed here'],
      [main, main, 'main may perform only Console']]
  });
});

const keyNames = (keys, wanted) => keys.filter(key => key.effect === wanted)
  .map(key => key.text).sort();
const functionKeys = keys => keys.filter(key => key.function)
  .map(key => key.name).sort();
const typeKeys = keys => keys.filter(key => !key.function && !key.effect)
  .map(key => key.text).sort();

test('keys equal the effect-free baseline plus the effect keys (F6)', t => {
  const full = namedKeys(scenario);
  const plain = namedKeys(baseline);
  const extra = full.filter(key => !plain.some(base => base.text === key.text));
  t.diagnostic(`scenario ${full.length} keys: ${typeKeys(full).length} type, `
    + `${functionKeys(full).length} function, ${keyNames(full, true).length}`
    + ` effect; baseline ${plain.length}; extra ${extra.map(k => k.text)}`);
  assert.deepEqual(typeKeys(full), typeKeys(plain));
  assert.deepEqual(functionKeys(full), functionKeys(plain));
  assert.ok(extra.length > 0 && extra.every(key => key.effect), 'effect keys');
  assert.deepEqual(keyNames(full, true),
    ['effect Clock[]', 'effect Database[]', 'effect Log[]']);
  assert.equal(full.length, plain.length + extra.length);
  assert.deepEqual([typeKeys(full).length, functionKeys(full).length,
    keyNames(full, true).length, plain.length], [0, 9, 3, 9]);
});
