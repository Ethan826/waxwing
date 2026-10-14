import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly, checkRejectedAt } from './phases.mjs';

// R001 Task 6: comparison and printability on records, at check time
// (design §3). Records cannot lower yet (Task 7), so programs stop after
// checking; the ground printable formula is tested in
// r001-printable.test.mjs.
const main = ' fn main(): Int = 0;';
const log = 'effect Log { fn log(n: Int): Unit; }; ';
const accepted = source => checkedPoly(`${source}${main}`);
const typeError = (source, message, at = 'p', nth = 1) => {
  const diagnostic = checkRejectedAt(`${source}${main}`, 'E_TYPE', at, nth);
  assert.equal(diagnostic.message, message);
};

test('an open record is a variable for comparison groundness', () => {
  typeError('fn f(p: { name: Text, ...r }): Bool = p == p;',
    'Type { name: Text, ...r } is not comparable');
  typeError('fn f(p: { name: Text, ...r }): Bool = p < p;',
    'Type { name: Text, ...r } is not comparable');
});

test('the error is at the left operand', () => {
  const source = 'fn f(p: { name: Text, ...r }, q: Int): Bool = p == p;';
  typeError(source, 'Type { name: Text, ...r } is not comparable');
});

test('a nested open record is refused too', () => {
  typeError('fn f(p: { a: { b: Int, ...r } }): Bool = p == p;',
    'Type { a: { b: Int, ...r } } is not comparable');
});

test('a known record is comparable', () => {
  accepted('fn f(p: { name: Text, age: Int }): Bool = p == p;');
  accepted('fn f(): Bool = { name: "Ada", age: 36 } < { name: "Bo", age: 1 };');
});

test('a call site comparing a known record is accepted', () => {
  accepted('fn same(p: { name: Text, age: Int }): Bool = p == p; '
    + 'fn g(): Bool = same({ name: "Ada", age: 36 });');
});

test('a function field is not comparable', () => {
  typeError('fn f(p: { g: Int -> Int }): Bool = p == p;',
    'Type { g: Int -> Int } is not comparable');
});

test('a Handler field is neither comparable nor printable', () => {
  typeError(`${log}fn f(p: { h: Handler(Log) }): Bool = p == p;`,
    'Type { h: Handler(Log) } is not comparable');
  typeError(`${log}fn f(p: { h: Handler(Log) }): Text = show(p);`,
    'Expected a printable value, found { h: Handler(Log) }');
});

test('a function field is not printable', () => {
  typeError('fn f(p: { g: Int -> Int }): Text = show(p);',
    'Expected a printable value, found { g: Int -> Int }');
});

test('a generic printer of an open record is accepted', () => {
  accepted('fn p(x: { a: Int, ...r }): Text = show(x);');
  accepted('fn p(x: { a: Int, ...r }): Unit with Console = Console.print(x);');
});

test('a known printable record is accepted', () => {
  accepted('fn f(x: { name: Text, age: Int }): Text = show(x);');
});
