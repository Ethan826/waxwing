import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { Integer, Arith, If,
  Boolean as Bool } from '../output/Domain.Syntax/index.js';
import { Binary, Plus } from '../output/Domain.Arithmetic/index.js';
import { Right } from '../output/Data.Either/index.js';
import { checked, rejected } from './support.mjs';
import { runGoBatch } from './go-batch.mjs';
import { executedTrees as executed, generator, parsedTrees,
  print } from './generators.mjs';

const shape = node => {
  if (node instanceof Integer) return { tag: 'int', value: node.value1 };
  if (node instanceof Arith) return addition(node.value1);
  assert.ok(node instanceof If);
  assert.ok(node.value1 instanceof Bool);
  return { tag: 'if', flag: node.value1.value1, yes: shape(node.value2),
    no: shape(node.value3) };
};
// Only `+` exists in these trees: an Arith node must be a Binary Plus.
const addition = arith => {
  assert.ok(arith instanceof Binary);
  assert.ok(arith.value0 instanceof Plus);
  return { tag: 'add', left: shape(arith.value1), right: shape(arith.value2) };
};
const interpret = node => {
  if (node.tag === 'int') return BigInt(node.value);
  if (node.tag === 'add')
    return BigInt.asIntN(32, interpret(node.left) + interpret(node.right));
  return interpret(node.flag ? node.yes : node.no);
};

test('200 generated expression trees survive independent printing and '
  + 'parsing', () => {
  for (const expected of parsedTrees) {
    const source = `fn main(): Int = ${print(expected)};`;
    const parsed = parse(source);
    assert.ok(parsed instanceof Right, source);
    assert.deepEqual(shape(parsed.value0.functions[0].body), expected);
    checked(source);
  }
});

const batch = runGoBatch(import.meta.url, executed.map((expected, index) =>
  [String(index), `fn main(): Int = ${print(expected)};`]));

test('12 generated programs agree with an independent BigInt interpreter ' +
  'after Go execution', () => {
  executed.forEach((expected, index) => {
    assert.equal(batch.run(index), `${interpret(expected)}\n`);
  });
});

test('whitespace shifts error locations without changing name '
  + 'rejection', () => {
  const next = generator(0x113);
  for (let index = 0; index < 100; index++) {
    const lines = (next() >>> 0) % 8;
    const spaces = (next() >>> 0) % 12;
    const prefix = '\n'.repeat(lines) + ' '.repeat(spaces);
    const diagnostic =
      rejected(`${prefix}fn main(): Int = missing;`, 'E_UNBOUND');
    assert.deepEqual(diagnostic.span.start, {
      offset: prefix.length + 17, line: lines + 1, column: spaces + 18 });
  }
});
