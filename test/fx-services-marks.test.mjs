import test from 'node:test';
import assert from 'node:assert/strict';
import { runGo } from './support.mjs';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';

// Mark sharing moved out of the services example (injection, 2026-10-13):
// an `if` selecting between two Log handlers, reached by a cleanup that
// needs `nofail Log`, is accepted when both are fail-free and rejected,
// with the FX008 text, when either may fail.
const program = (first, second) => `type E = E;
effect Log { fn log(n: Int): Unit; };

fn cleanup(): Unit with nofail Log = { defer Log.log(1); () };

fn main(): Unit with Console = {
  let pick = true;
  let h = if pick then handler Log { log(n) => ${first} }
    else handler Log { log(n) => ${second} };
  handle with h { cleanup() } { fail(error: E) => Console.print(9) }
};
`;

test('both selected Log handlers fail-free: accepted', () => {
  assert.equal(runGo(program('Console.print(n)', '()')), '1\n');
});

const rejected = {
  code: 'E_EFFECT', message: 'Expected nofail Log, found Log',
  at: ['cleanup() }', 'cleanup()'],
  notes: [
    ['with h { cleanup() }', 'with h { cleanup() }', 'Log is handled here'],
    ['log(n) => Fail.fail(E)', 'log(n) => Fail.fail(E)',
      'its clause for log fails with E']]
};

test('a may-fail handler in the else branch: rejected, FX008 text', () => {
  expectDiagnostic(program('Console.print(n)', 'Fail.fail(E)'), rejected);
});

test('a may-fail handler in the then branch: rejected, same text', () => {
  expectDiagnostic(program('Fail.fail(E)', 'Console.print(n)'), rejected);
});
