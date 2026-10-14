import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { runGo } from './support.mjs';
import { diagnose, expectDiagnostic } from './fx-diagnostics-support.mjs';

// FX020 Task 2b: `Fail.fail` used as a value is the Fail operation
// reference; a bare `fail` is unbound (Task 7). Applying it behaves as
// `Fail.fail(e)` does: the family comes from the payload's type.
const goOf = source => {
  const result = compile(source);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0;
};
const families = 'type A = A(Int); type B = B(Int); '
  + 'fn useA(f: A -> Int with Fail(A)): Int with Fail(A) = f(A(1)); '
  + 'fn useB(f: B -> Int with Fail(B)): Int with Fail(B) = f(B(2)); ';
const clauses = '{ fail(error: A) => match error { A(n) => n }, '
  + 'fail(error: B) => match error { B(n) => n + 10 } }';
const caught = body => families + 'fn main(): Unit with Console = '
  + `Console.print(handle ${body} ${clauses});`;

test('a function taking E -> Int receives Fail.fail; handle catches it', () => {
  const source = 'type E = E(Int); '
    + 'fn mapOne(f: E -> Int with Fail(E), e: E): Int with Fail(E) = f(e); '
    + 'fn main(): Unit with Console = '
    + 'Console.print(handle mapOne(Fail.fail, E(3)) '
    + '{ fail(error: E) => match error { E(n) => n } });';
  assert.equal(runGo(source), '3\n');
});

test('a reference passed for Fail(A) is keyed by A', () => {
  assert.equal(runGo(caught('useA(Fail.fail)')), '1\n');
});

test('a reference passed for Fail(B) is keyed by B', () => {
  assert.equal(runGo(caught('useB(Fail.fail) + useA(Fail.fail)')), '12\n');
});

test('one bound reference used at two payload types is a type error', () => {
  const source = families + 'fn main(): Int = handle { let f = Fail.fail; '
    + `useA(f) + useB(f) } ${clauses};`;
  expectDiagnostic(source, {
    code: 'E_TYPE', message: 'Expected B -> Int, found A -> Int',
    at: ['useB(f)', 'f'], notes: []
  });
});

test('an undecided reference needs a concrete family, at its span', () => {
  const source = 'fn main(): Int = { let f = Fail.fail; 1 };';
  expectDiagnostic(source, {
    code: 'E_TYPE', message: 'Fail needs a concrete error family',
    at: ['= Fail.fail;', 'Fail.fail'], notes: []
  });
});

test('a reference performed outside a Fail row is an effect error', () => {
  const source = reference => families
    + `fn g(): Int = useA(${reference}); fn main(): Int = 1;`;
  const diagnostic = expectDiagnostic(source('Fail.fail'), {
    code: 'E_EFFECT',
    message: 'g performs Fail(A), which its signature does not allow',
    at: ['useA(Fail.fail)'],
    notes: [['f(A(1))', 'f(A(1))', 'Fail(A) comes from this function value'],
      ['fn g(): Int = useA(Fail.fail);', 'fn g(): Int = useA(Fail.fail);',
        'the signature of g has an ambient row']]
  });
  // Today's text: the hand-written eta-expansion is rejected the same way.
  const twin = diagnose(source('fn(x) => Fail.fail(x)')).diagnostic;
  assert.equal(diagnostic.message, twin.message);
  assert.deepEqual(diagnostic.related.map(note => note.message),
    twin.related.map(note => note.message));
});
