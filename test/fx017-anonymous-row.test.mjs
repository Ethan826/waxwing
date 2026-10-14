import test from 'node:test';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';

// FX017, continued from fx017-callback-row.test.mjs: the cases where the
// hint cannot name the callback's row and falls back to the anonymous text.
const effects = 'effect L { fn l(): Int; }; effect M { fn m(): Int; }; ';
const main = ' fn main(): Unit with Console = Console.print(1);';

const anonymous = (row, own) => 'this function value must allow every effect '
  + `of a (${row}), but its row ${own}; a function value's row must equal `
  + 'its caller\'s (FX017)';
const callerNote =
  [': Int with L + M =', 'with L + M', 'a\'s row is written here'];

test('a later stage of a curried parameter is an anonymous function '
  + 'value', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> (Int -> Int with L) with L + M, '
    + 'x: Int): Int with L + M = q(x, x);' + main, {
    code: 'E_EFFECT', message: anonymous('L + M', 'is L'),
    at: ['q(x, x)'], notes: [callerNote]
  });
});

test('a parameter with a two-stage type is anonymous: its hint would '
  + 'loop', () => {
  const head = effects + 'fn a(q: Int -> Int -> Int with L, x: Int): Int '
    + 'with L + M = ';
  expectDiagnostic(head + 'q(x, x);' + main, {
    code: 'E_EFFECT', message: anonymous('L + M', 'has no labels'),
    at: ['q(x, x)'], notes: [callerNote]
  });
  expectDiagnostic(head + 'q(x)(x);' + main, {
    code: 'E_EFFECT', message: anonymous('L + M', 'has no labels'),
    at: ['q(x)'], notes: [callerNote]
  });
});

test('a row nested in a label payload keeps the old message', () => {
  expectDiagnostic(effects + 'effect S(s) { fn get(): s; }; '
    + 'fn a(q: Int -> Int with S(Int -> Int with L), x: Int): Int '
    + 'with S(Int -> Int with L + M) = q(x);' + main, {
    code: 'E_EFFECT',
    message: 'a performs M, which its signature does not allow',
    at: ['q(x)'],
    notes: [[': Int with S(Int -> Int with L + M) =',
      'with S(Int -> Int with L + M)',
      'the signature of a does not allow M']]
  });
});

// The hint cannot print a payload's arrow rows, so it falls back to the
// anonymous text rather than a row that, written, fails differently.
test('a callback read twice: the named headline, no written hint', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int with L, x: Int): Int '
    + 'with L + M = q(x) + q(x);' + main, {
    code: 'E_EFFECT',
    message: 'q must allow every effect of a (L + M), but its row is L; '
      + 'a function value\'s row must equal its caller\'s (FX017)',
    at: ['q(x)'],
    notes: [['q: Int -> Int with L', 'with L', 'q\'s row is written here'],
      [': Int with L + M =', 'with L + M', 'a\'s row is written here']]
  });
});

test('a payload holding an arrow row: the hint is anonymous', () => {
  const state = 'effect S(s) { fn get(): s; }; ';
  for (const payload of ['Int -> Int with L + M', 'Int -> Int with pure']) {
    const callee = `with S(${payload})`;
    const caller = `with S(${payload}) + M`;
    expectDiagnostic(effects + state + `fn a(q: Int -> Int ${callee}, x: Int): `
      + `Int ${caller} = q(x);` + main, {
      code: 'E_EFFECT',
      message: 'q must allow every effect of a (S(Int -> Int) + M), but its '
        + 'row is S(Int -> Int); a function value\'s row must equal its '
        + 'caller\'s (FX017)',
      at: ['q(x)'],
      notes: [[`q: Int -> Int ${callee}`, callee, 'q\'s row is written here'],
        [`: Int ${caller} =`, caller, 'a\'s row is written here']]
    });
  }
});
