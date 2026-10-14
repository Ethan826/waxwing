import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejectedAt, runGo } from './support.mjs';
import { checkedPoly } from './phases.mjs';
import { TRecord, TVar } from '../output/Domain.Type/index.js';
import { Hole } from '../output/Domain.Checked.Internal/index.js';

// R001 Task 7: record rows in specialization keys (design §5). Layouts
// are interned, not counted; function copies at row arguments count.
const range = (count, from = 0) =>
  Array.from({ length: count }, (_, index) => from + index);

// 9,999 copies of generic functions and one of `get` reach the limit
// exactly; 300 monomorphic record shapes add layouts, not keys.
const generic = 9999;
const shapes = 300;
const perUser = 101;
const users = Math.ceil(generic / perUser);
const user = index => `fn u${index}(): Int = ${range(perUser, index * perUser)
  .filter(call => call < generic).map(call => `g${call}(1)`).join(' + ')};`;
const atLimit = [
  ...range(generic).map(index => `fn g${index}(x: a): a = x;`),
  ...range(users).map(user),
  ...range(shapes).map(index => `fn m${index}(): Int = { l${index}: 1 }.l${
    index};`),
  'fn get(x: { a: Int, ...r }): Int = x.a;',
  'fn main(): Int = get({ a: 1, b: 1 });'].join(' ');

test('record layouts do not count toward the limit; row copies do', () => {
  const go = checked(atLimit);
  // Each m shape, get's argument and its tail { b: Int }.
  assert.equal((go.match(/^type waxwingRec\d+ struct/gm) ?? []).length,
    shapes + 2);
  const over = `${atLimit} fn extra(): Int = get({ a: 1, c: 1 });`;
  assert.equal(rejectedAt(over, 'E_SPECIALIZATION', 'get({ a: 1, c: 1 })')
    .message, 'More than 10000 specializations');
  const shared = `${atLimit} fn extra(): Int = get({ b: 2, a: 1 });`;
  assert.match(checked(shared), /func main\(\)/);
});

// Carried from Task 6 (R4): a generic printer reached with a record whose
// tail holds a function or a handler is E_TYPE at the print site, naming
// the whole record; never E_TOOL.
const log = 'effect Log { fn log(n: Int): Unit; }; ';
const sites = [
  ['show', 'Text', 'show(x)'],
  ['Console.print', 'Unit with Console', 'Console.print(x)'],
  ['crash', 'Unit', 'crash(x)']
];
const tails = [
  ['f: fn(n: Int) => n', 'f: Int -> Int'],
  ['h: handler Log { log(n) => () }', 'h: Handler(Log)']
];

for (const [name, result, site] of sites) {
  for (const [field, shown] of tails) {
    test(`${name} of a record tail holding ${shown} is E_TYPE`, () => {
      const source = `${log}fn p(x: { a: Int, ...r }): ${result} = ${site}; `
        + `fn main(): ${result} = p({ a: 1, ${field} });`;
      const at = source.indexOf(site) + site.length - 2;
      const nth = source.slice(0, at).split('x').length - 1;
      const diagnostic = rejectedAt(source, 'E_TYPE', 'x', nth);
      assert.equal(diagnostic.message,
        `Expected a printable value, found { a: Int, ${shown} }`);
    });
  }
}

test('a printable record tail prints through the generic printer', () => {
  assert.equal(runGo('fn p(x: { a: Int, ...r }): Text = show(x); '
    + 'fn main(): Text = p({ b: "z", a: 1 });'), '{ a: 1, b: "z" }\n');
});

// Carried from Task 4: an unsolved record tail is a hole like any other,
// numbered with the body's holes, never left at its meta's number.
const holes = (ty, found) => {
  if (ty instanceof TVar && ty.value0 instanceof Hole) {
    found.add(ty.value0.value0);
  }
  if (ty instanceof TRecord) {
    const tail = ty.value0.tail.value0;
    if (tail instanceof Hole) found.add(tail.value0);
    for (const field of ty.value0.fields) holes(field.value1, found);
  }
  return found;
};

test('an unsolved record tail is renumbered with the holes', () => {
  const source = 'fn main(): Int = { let g = fn(r) => r.a; 1 };';
  const body = checkedPoly(source).functions[0].body.value0;
  const lambda = body.node.value0[0].value1.value0;
  const parameter = lambda.node.value0[0].ty;
  assert.ok(parameter instanceof TRecord, 'parameter is a record');
  assert.deepEqual([...holes(parameter, new Set())].sort(), [0, 1]);
  assert.equal(runGo(source), '1\n');
});

// Carried from Task 3: a record-sorted argument (`Box(...s)`) is passed
// among the type arguments, so a field's source pairs with it too.
test('record-sorted type arguments lower beside their source', () => {
  const source = 'type Box(...r) = Box({ a: Int, ...r }); '
    + 'type Outer(...s) = Outer(Box(...s)); '
    + 'type Mixed(x, ...r, ...e) = '
    + 'Mixed(x, { k: x, ...r }, Int -> Int with ...e); '
    + 'fn get(o: Outer(...s)): Int = match o { Outer(Box(x)) => x.a }; '
    + 'fn main(): Unit with Console = { '
    + 'let o = Outer(Box({ a: 1, b: true })); '
    + 'Console.print(get(o)); Console.print(o); '
    + 'let m = Mixed(1, { k: 2, z: "q" }, fn(n: Int) => n); '
    + 'Console.print(match m { Mixed(x, r, f) => f(r.k + x) }) };';
  assert.equal(runGo(source), '1\nOuter(Box({ a: 1, b: true }))\n3\n');
});
