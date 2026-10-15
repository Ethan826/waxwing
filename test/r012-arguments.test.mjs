import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejectedAt, runGo } from './support.mjs';
import { keyTexts } from './poly-keys.mjs';

// R012 (user-approved 2026-10-15): a declared type's record-sorted
// parameter takes a record type argument, which supplies the parameter's
// row, the tail of the records the declaration writes beside it:
// `Holder({ y: Bool })` holds `{ x: Int, y: Bool }`.
const holder = 'type Holder(...r) = Holder({ x: Int, ...r }); ';
const pair = 'type Pair(...r) = Pair(Holder(...r)); ';
const print = 'fn main(): Unit with Console = ';

test('the argument supplies the tail of the constructor payload', () => {
  const source = `${holder}fn payload(h: Holder({ y: Bool })): `
    + '{ x: Int, y: Bool } = match h { Holder(p) => p }; '
    + `${print}{ let h = Holder({ y: true, x: 1 }); `
    + 'Console.print(payload(h)); Console.print(payload(h).y); '
    + 'Console.print(h) };';
  assert.equal(runGo(source),
    '{ x: 1, y: true }\ntrue\nHolder({ x: 1, y: true })\n');
});

test('values compare and pass through generic functions', () => {
  const source = `${holder}fn same(a: t): t = a; `
    + 'fn first(h: Holder({ y: Bool })): Holder({ y: Bool }) = same(h); '
    + `${print}{ let h = first(Holder({ x: 1, y: true })); `
    + 'Console.print(h == Holder({ y: true, x: 1 })); '
    + 'Console.print(h < Holder({ x: 2, y: false })); '
    + 'Console.print(Holder({ x: 1, y: false }) < h) };';
  assert.equal(runGo(source), 'true\ntrue\ntrue\n');
});

test('a concrete argument unifies with a generic constructor', () => {
  const source = `${holder}fn hold(p: { x: Int, ...r }): Holder(...r) = `
    + 'Holder(p); fn f(h: Holder({ y: Bool })): Int = '
    + 'match h { Holder(p) => if p.y then p.x else 0 }; '
    + `${print}Console.print(f(hold({ y: true, x: 3 })));`;
  assert.equal(runGo(source), '3\n');
});

test('a different row is the existing mismatch', () => {
  const source = `${holder}fn f(h: Holder({ y: Bool })): Int = 0; `
    + 'fn main(): Int = f(Holder({ x: 1, y: 2 }));';
  const diagnostic = rejectedAt(source, 'E_TYPE',
    'Holder({ x: 1, y: 2 })');
  assert.equal(diagnostic.message,
    'Expected Holder({ y: Bool }), found Holder({ y: Int })');
});

test('reordered argument rows are one type and one key', () => {
  const source = `${holder}fn a(h: Holder({ y: Bool, z: Int })): Int = `
    + 'match h { Holder(p) => p.z }; '
    + 'fn b(h: Holder({ z: Int, y: Bool })): Int = a(h); '
    + 'fn c(h: Holder(...r)): Int = 0; '
    + 'fn main(): Int = b(Holder({ x: 1, y: true, z: 2 })) '
    + '+ c(Holder({ x: 1, z: 2, y: true })) + c(Holder({ z: 2, y: true, '
    + 'x: 1 }));';
  assert.equal(runGo(source.replace('fn main(): Int =',
    `${print}Console.print(`).replace(/;$/, ');')), '2\n');
  const keys = keyTexts(source).filter(key => key.startsWith('fn c'));
  assert.deepEqual(keys, ['fn c[{ y: Bool, z: Int }]']);
});

test('an open argument passes its tail on', () => {
  const source = `${holder}fn f(h: Holder({ y: Bool, ...s })): Bool = `
    + 'match h { Holder(p) => p.y }; '
    + `${print}Console.print(f(Holder({ z: 3, x: 1, y: true })));`;
  assert.equal(runGo(source), 'true\n');
});

test('{ ...s } is the same argument as ...s', () => {
  const source = `${holder}fn f(h: Holder({ ...s })): Holder(...s) = h; `
    + 'fn g(h: Holder(...s)): Holder({ ...s }) = f(h); '
    + `${print}Console.print(g(Holder({ x: 1, y: true })));`;
  assert.equal(runGo(source), 'Holder({ x: 1, y: true })\n');
});

test('a nested declared type takes a concrete row', () => {
  const source = `${holder}${pair}fn f(p: Pair({ y: Bool })): Bool = `
    + 'match p { Pair(h) => match h { Holder(q) => q.y } }; '
    + `${print}Console.print(f(Pair(Holder({ x: 1, y: true }))));`;
  assert.equal(runGo(source), 'true\n');
});

test('constructor fields and record fields take a concrete row', () => {
  const source = `${holder}type Box = Box(Holder({ y: Bool })); `
    + 'fn f(b: { h: Holder({ y: Bool }) }): Box = Box(b.h); '
    + `${print}Console.print(f({ h: Holder({ x: 1, y: false }) }));`;
  assert.equal(runGo(source), 'Box(Holder({ x: 1, y: false }))\n');
});

test('a lambda annotation takes a concrete row', () => {
  const source = `${holder}${print}{ let f = fn(h: Holder({ y: Int })) `
    + '=> match h { Holder(p) => p.x + p.y }; '
    + 'Console.print(f(Holder({ x: 1, y: 2 }))) };';
  assert.equal(runGo(source), '3\n');
});

test('a Fail payload is keyed by the declared type', () => {
  const source = `${holder}fn w(): Int with Fail(Holder({ y: Bool })) = `
    + 'Fail.fail(Holder({ y: true, x: 4 })); '
    + `${print}Console.print(handle w() `
    + '{ fail(e: Holder({ y: Bool })) => match e { Holder(p) => p.x } });';
  assert.equal(runGo(source), '4\n');
});

test('a program without concrete rows is unchanged', () => {
  const source = `${holder}fn f(h: Holder(...r)): Int = 0; `
    + 'fn main(): Int = f(Holder({ x: 1 }));';
  assert.ok(checked(source).includes('package main'));
});
