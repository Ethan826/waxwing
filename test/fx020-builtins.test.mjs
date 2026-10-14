import test from 'node:test';
import assert from 'node:assert/strict';
import { runGo } from './support.mjs';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';

// FX020 Task 4: Console and Fail are declarations in the one table that
// user effects use. A user effect of either name collides with them
// (E_DUPLICATE, the form two user effects give, minus the note: a
// built-in has no source span). Rows resolve through the same table, so
// every program that compiled before compiles to the same Go.
const main = 'fn main(): Unit with Console = print(1);';

for (const [name, declaration] of [
  ['Console', 'effect Console { fn shout(n: Int): Unit; };'],
  ['Fail', 'effect Fail { fn oops(): Int; };'],
  ['Fail', 'effect Fail(E) { fn oops(e: E): Int; };'],
]) test(`a user effect ${name} is a duplicate`, () => {
  expectDiagnostic(declaration + main, {
    code: 'E_DUPLICATE',
    message: `Duplicate effect ${name}`,
    at: [declaration],
    notes: [],
  });
});

test('the collision is reported at the declaration, not a use', () => {
  const declaration = 'effect Console { fn print(n: Int): Unit; };';
  const source = 'fn first(): Unit with Console = print(1); '
    + declaration + main;
  expectDiagnostic(source, {
    code: 'E_DUPLICATE',
    message: 'Duplicate effect Console',
    at: [declaration],
    notes: [],
  });
});

test('two user effects give the same duplicate form (no note)', () => {
  const first = 'effect Clock { fn now(): Int; };';
  const second = 'effect Clock { fn later(): Int; };';
  expectDiagnostic(first + second + main, {
    code: 'E_DUPLICATE',
    message: 'Duplicate effect Clock',
    at: [second],
    notes: [],
  });
});

test('Console and Fail rows resolve as before', () => {
  const source = 'type E = E(Int); '
    + 'fn a(): Int with Fail(E) = Fail.fail(E(2)); '
    + 'fn b(): Unit with Console { print } = print(1); '
    + 'fn c(): Unit with Console as C = C.print(2); '
    + 'fn main(): Unit with Console = { b(); c(); '
    + 'print(handle a() { fail(error: E) => match error { E(n) => n } }) };';
  assert.equal(runGo(source), '1\n2\n2\n');
});

test('Handler(Console) and Handler(Fail(E)) rows resolve as before', () => {
  const source = 'type E = E(Int); '
    + 'fn run(h: Handler(Console), g: Handler(Fail(E))): Int = 4; '
    + 'fn main(): Unit with Console = print(1);';
  assert.equal(runGo(source), '1\n');
});
