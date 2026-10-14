import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectedAt, runGo } from './support.mjs';

// R001 Task 2 (BACKLOG E017): a print site is checked again at the ground
// type of each specialization it is reached with, so a type variable
// instantiated with a function or handler is E_TYPE at the site, never a
// Go build failure (E_TOOL).
const prelude = 'effect Log { fn log(n: Int): Unit; }; '
  + 'type Box(a) = Box(a); ';
const sites = [
  ['show', 'Text', 'show(item)'],
  ['Console.print', 'Unit with Console', 'Console.print(item)'],
  ['crash', 'Unit', 'crash(item)']
];
const instances = [
  ['a function', 'fn(n: Int) => n', 'Int -> Int'],
  ['a Handler(Log)', 'handler Log { log(n) => () }', 'Handler(Log)'],
  ['a function nested in Box', 'Box(fn(n: Int) => n)', 'Box(Int -> Int)']
];

const program = (result, site, argument) => prelude
  + `fn p(item: a): ${result} = ${site}; `
  + `fn main(): ${result} = p(${argument});`;

for (const [name, result, site] of sites) {
  for (const [what, argument, shown] of instances) {
    test(`${name} reached with ${what} is E_TYPE at the site`, () => {
      const diagnostic = rejectedAt(program(result, site, argument),
        'E_TYPE', 'item', 1);
      assert.equal(diagnostic.message,
        `Expected a printable value, found ${shown}`);
    });
  }
}

test('printable instantiations still run', () => {
  const run = argument => runGo(program('Unit with Console',
    'Console.print(item)', argument));
  assert.equal(run('1'), '1\n');
  assert.equal(run('Box(1)'), 'Box(1)\n');
});

test('the first non-printable site in a generic copy is reported', () => {
  const source = prelude + 'fn p(item: a): Text = show(item); '
    + 'fn main(): Text = p(1) ++ p(Box(1)) ++ p(fn(n: Int) => n);';
  const diagnostic = rejectedAt(source, 'E_TYPE', 'item', 1);
  assert.equal(diagnostic.message,
    'Expected a printable value, found Int -> Int');
});

test('a type storing a function is refused whatever its arguments', () => {
  const source = 'type Holder(a) = Holder(a -> a); '
    + 'fn p(item: a): Text = show(item); '
    + 'fn main(): Text = p(Holder(fn(n: Int) => n));';
  const diagnostic = rejectedAt(source, 'E_TYPE', 'item', 1);
  assert.equal(diagnostic.message,
    'Expected a printable value, found Holder(Int)');
});
