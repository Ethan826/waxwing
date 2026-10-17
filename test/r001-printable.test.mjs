import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectedAt, runGo } from './support.mjs';
import { Nothing } from '../output/Data.Maybe/index.js';
import { ordInt } from '../output/Data.Ord/index.js';
import * as Set from '../output/Data.Set/index.js';
import { Tuple } from '../output/Data.Tuple/index.js';
import { ordTypeId } from '../output/Domain.Ids/index.js';
import { Label, Plain, UserEffect, closedRow }
  from '../output/Domain.Row/index.js';
import { TBool, TData, TFun, THandler, TInt, TRecord, TText }
  from '../output/Domain.Type/index.js';
import { recordRow } from '../output/Domain.Type.Record/index.js';
import { groundPrintable }
  from '../output/Features.Specialize.Printable/index.js';

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

// R001 Task 6: the ground printable formula on records (design §3). A
// record is printable exactly when every field is, whatever the holders.
// Built directly: Task 7 lowers records, so no program reaches it yet.
const field = (label, ty) => Tuple.create(label)(ty);
const record = (...fields) => TRecord.create(
  recordRow(ordInt)(fields.map(([label, ty]) => field(label, ty)))([]));
const arrow = TFun.create(TInt.value)(closedRow)(TInt.value);
const handler = THandler.create(
  Label.create(new UserEffect(0))([])(Plain.value))(
  { inference: closedRow, clauses: Nothing.value });
const holds = ty => groundPrintable(Set.empty)(ty);

test('a record is printable when every field is', () => {
  assert.equal(holds(record(['a', TInt.value], ['b', TText.value])), true);
  assert.equal(holds(record(['a', record(['b', TBool.value])])), true);
});

test('one function or handler field makes a record unprintable', () => {
  assert.equal(holds(record(['a', TInt.value], ['f', arrow])), false);
  assert.equal(holds(record(['h', handler])), false);
  assert.equal(holds(record(['a', record(['f', arrow])])), false);
});

test('a record field of a function-holding declared type is refused', () => {
  const holders = Set.insert(ordTypeId)(7)(Set.empty);
  const boxed = TData.create(7)([])([]);
  assert.equal(groundPrintable(holders)(record(['b', boxed])), false);
  assert.equal(groundPrintable(Set.empty)(record(['b', boxed])), true);
});
