import test from 'node:test';
import assert from 'node:assert/strict';
import { runGo } from './support.mjs';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';

// Mark sharing moved out of the services example (injection, 2026-10-13):
// an `if` selecting between two Log handlers, reached by a cleanup that
// needs `nofail Log`, is accepted when both are fail-free and rejected,
// with the FX008 text, when either may fail.
const program = other => `type E = E;
effect Log { fn log(n: Int): Unit; };

fn cleanup(): Unit with nofail Log = { defer log(1); () };

fn main(): Unit with Console = {
  let pick = true;
  let h = if pick then handler Log { log(n) => print(n) }
    else handler Log { log(n) => ${other} };
  handle with h { cleanup() } { fail(error: E) => print(9) }
};
`;

test('both selected Log handlers fail-free: accepted', () => {
  assert.equal(runGo(program('()')), '1\n');
});

test('one selected Log handler may fail: rejected with the FX008 text', () => {
  const source = program('fail(E)');
  expectDiagnostic(source, {
    code: 'E_EFFECT', message: 'Expected nofail Log, found Log',
    at: ['cleanup() }', 'cleanup()'],
    notes: [['with h { cleanup() }', 'with h { cleanup() }', 'Log is handled here'],
      ['log(n) => fail(E)', 'log(n) => fail(E)', 'its clause for log fails with E']]
  });
});
