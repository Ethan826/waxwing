import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejectedAt, runGo } from './support.mjs';

// R010: the instantiation rule (ADR 007) judges a record row variable's
// slot as it judges a type variable's. Inside a component a record row
// argument must be the referrer's bare `{ ...r }` or mention no variable,
// a record tail included; a call that grows the row is the existing
// `Recursive call to g changes its type arguments` at the call, where it
// reached `More than 10000 specializations` before.
const changes = (source, callee, call) => {
  const diagnostic = rejectedAt(source, 'E_SPECIALIZATION', call);
  assert.equal(diagnostic.message,
    `Recursive call to ${callee} changes its type arguments`);
};
const count = ' fn main(): Int = g({ a: 1 }, 3);';
const recur = (parameter, call) => `fn g(x: ${parameter}, n: Int): Int = `
  + `if n == 0 then 0 else ${call};${count}`;

test('a call that nests the row is refused', () => {
  changes(recur('{ ...r }', 'g({ inner: x }, n + -1)'), 'g',
    'g({ inner: x }, n + -1)');
});

test('a call that extends an open row is refused', () => {
  changes(recur('{ a: Int, ...r }', 'g({ a: 1, inner: x }, n + -1)'), 'g',
    'g({ a: 1, inner: x }, n + -1)');
});

test('a call inside a lambda in the body is refused', () => {
  changes(recur('{ ...r }', '{ let f = fn(y: Int) => g({ inner: x }, y); '
    + 'f(n + -1) }'), 'g', 'g({ inner: x }, y)');
});

test('mutual recursion that nests the row is refused', () => {
  const source = 'fn f(x: { ...r }, n: Int): Int = if n == 0 then 0 else '
    + 'h({ inner: x }, n + -1); fn h(y: { ...s }, n: Int): Int = f(y, n); '
    + 'fn main(): Int = f({ a: 1 }, 3);';
  changes(source, 'h', 'h({ inner: x }, n + -1)');
});

test('a row grown through a declared type is refused', () => {
  const source = 'type H(...r) = H({ a: Int, ...r }); fn g(h: H(...r), '
    + 'n: Int): Int = if n == 0 then 0 else g(H({ a: 1, inner: h }), '
    + 'n + -1); fn main(): Int = g(H({ a: 1 }), 3);';
  changes(source, 'g', 'g(H({ a: 1, inner: h }), n + -1)');
});

test('a declaration that grows its row is still refused', () => {
  const source = 'type T(...r) = End({ ...r }) | More(T({ inner: Int, '
    + '...r })); fn main(): Int = 0;';
  const diagnostic = rejectedAt(source, 'E_SPECIALIZATION',
    'T({ inner: Int, ...r })');
  assert.equal(diagnostic.message,
    'Recursive use of T changes its type arguments');
});

test('the same row, or a ground one, is accepted', () => {
  assert.equal(runGo('fn g(x: { a: Int, ...r }, n: Int): Int = if n == 0 '
    + 'then x.a else g(x, n + -1); fn main(): Unit with Console = '
    + 'Console.print(g({ a: 7, b: true }, 3));'), '7\n');
  checked(recur('{ ...r }', 'g(x, n + -1) + g({ b: 1 }, n + -1)'));
  checked('fn f(x: { ...r }, n: Int): Int = if n == 0 then 0 else '
    + 'h(x, n + -1); fn h(y: { ...s }, n: Int): Int = f(y, n);'
    + ' fn main(): Int = f({ a: 1 }, 3);');
});

test('a type argument over the row is judged as before', () => {
  checked('fn g(x: a, y: { ...r }, n: Int): Int = if n == 0 then 0 else '
    + 'g(y, y, n + -1); fn main(): Int = g(1, { a: 1 }, 3);');
});

// ADR 007's R010 note: a type slot is judged as before, so its argument
// may mention a record tail the record slots pass unchanged; that is
// finite, and accepted.
test('a type argument that mentions a record tail is accepted', () => {
  assert.equal(runGo('fn g(x: { a: Int, ...r }, y: a, n: Int): Int = '
    + 'if n == 0 then x.a else g(x, { z: x }, n + -1); fn main(): Unit '
    + 'with Console = Console.print(g({ a: 7 }, 1, 3));'), '7\n');
});
