import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checked } from './support.mjs';
import { runGoBatch } from './go-batch.mjs';
import { shapeChain } from './r001-scale-programs.mjs';

// R011: a record layout's struct is emitted only when some emitted type
// mentions it (a value, field, parameter, pattern, named rest or helper). An
// open tail that is just a specialization-key argument is interned for the
// key and gets no struct. Every program here is built and run, so a layout
// wrongly dropped fails Go's compile with an undefined name.
const structs = go => (go.match(/^type waxwingRec\d+ struct/gm) ?? []).length;

const sources = {
  keyOnlyTail: 'fn f(r: { a: Int, ...t }): Int = r.a; '
    + 'fn main(): Int = f({ a: 1, b: 2 });',
  // The tail { b: Int } of both calls is a key argument alone.
  twoTails: 'fn f(r: { a: Int, ...t }): Int = r.a; '
    + 'fn main(): Int = f({ a: 1, b: 2 }) + f({ a: 3, c: true });',
  restOnly: 'fn first(p: { a: Int, b: Text }): Int = '
    + 'match p { { a, ...unused } => a }; '
    + 'fn main(): Int = first({ a: 1, b: "x" });',
  restNested: 'fn first(p: { a: Int, b: { x: Int } }): Int = '
    + 'match p { { a, ...more } => a + more.b.x }; '
    + 'fn main(): Int = first({ a: 1, b: { x: 2 } });',
  restPrinted: 'fn tail(p: { a: Int, b: Text, c: Bool }): Unit '
    + 'with Console = match p { { a, ...more } => Console.print(more) }; '
    + 'fn main(): Unit with Console = tail({ a: 1, b: "x", c: true });',
  empty: 'fn bare(p: { name: Text }): {} = p without { name }; '
    + 'fn main(): Unit with Console = { Console.print(bare({ name: "a" })) };',
  comparedOnly: 'fn same(a: { n: Int }, b: { n: Int }): Bool = a == b; '
    + 'fn main(): Bool = same({ n: 1 }, { n: 1 });',
  heldInField: 'type Box = Box({ x: Int }); '
    + 'fn main(): Unit with Console = { Console.print(Box({ x: 1 })) };'
};

const batch = runGoBatch(import.meta.url, Object.entries(sources));

test('a key-only open tail has no struct', () => {
  assert.equal(structs(checked(sources.keyOnlyTail)), 1);
  assert.equal(batch.run('keyOnlyTail'), '1\n');
});

test('each call shape keeps its struct, no tail gets one', () => {
  assert.equal(structs(checked(sources.twoTails)), 2);
  assert.equal(batch.run('twoTails'), '4\n');
});

test('the records snapshot declares no unused layout', () => {
  const go = readFileSync('bootstrap/records.go', 'utf8');
  for (const name of go.match(/^type waxwingRec\d+/gm)) {
    const id = name.replace('type ', '');
    const uses = go.split(new RegExp(`${id}\\b`)).length - 1;
    assert.ok(uses > 1, `${id} is declared and never used`);
  }
});

test('the scale chain has one struct per shape, not two', () => {
  const shapes = 20;
  const program = shapeChain(shapes, 4);
  assert.equal(structs(checked(program.source)), shapes);
});

test('a named rest whose shape appears nowhere else is emitted', () => {
  assert.equal(structs(checked(sources.restOnly)), 2);
  assert.equal(batch.run('restOnly'), '1\n');
  assert.equal(batch.run('restNested'), '3\n');
  assert.equal(batch.run('restPrinted'), '{ b: "x", c: true }\n');
});

test('an empty record struct is emitted when it is used', () => {
  assert.match(checked(sources.empty), /^type waxwingRec\d+ struct \{\n\}/m);
  assert.equal(batch.run('empty'), '{}\n');
});

test('layouts used only by helpers or through a field are emitted', () => {
  assert.equal(batch.run('comparedOnly'), 'true\n');
  assert.equal(structs(checked(sources.heldInField)), 1);
  assert.equal(batch.run('heldInField'), 'Box({ x: 1 })\n');
});
