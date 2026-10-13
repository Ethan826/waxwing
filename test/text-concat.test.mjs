import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, rejectedAt } from './support.mjs';
import { runGoBatch } from './go-batch.mjs';

// Text v1 design §1 "Joining": `++` shares `+`'s level, associates left and
// needs Text on both sides. Runs are built once (T001).
const main = (type, body) => `fn main(): ${type} = ${body};`;
const chain = (count, operator) =>
  main('Text', Array(count).fill('"a"').join(` ${operator} `));
const noisy = 'fn t1(): Text with Console = { print(1); "a" }; '
  + 'fn t2(): Text with Console = { print(2); "b" }; ';
const cases = [
  ['chain', main('Text', '"a" ++ "b" ++ "c"')],
  ['binds tighter', main('Bool', '"a" ++ "b" == "ab"')],
  ['order', noisy + 'fn main(): Unit with Console = print(t1() ++ t2());'],
  ['empty', main('Text', '"" ++ "" ++ "x"')],
  ['parens', main('Text', '"a" ++ ("b" ++ "c")')],
  ['astral', main('Bool', '"\u{1F600}" ++ "x" == "\u{1F600}x"')],
  ['129 operands', chain(129, '++')]
];
const batch = runGoBatch(import.meta.url, cases);
const out = (name, stdout) => test(name, () =>
  assert.equal(batch.run(name), stdout));

out('chain', 'abc\n');
out('binds tighter', 'true\n');
out('order', '1\n2\nab\n');
out('empty', 'x\n');
out('parens', 'abc\n');
out('astral', 'true\n');
out('129 operands', `${'a'.repeat(129)}\n`);

test('1 + 2 ++ "x" is (1 + 2) ++ "x", an Int on the left', () => {
  const source = main('Text', '1 + 2 ++ "x"');
  const diagnostic = rejectedAt(source, 'E_TYPE', '1 + 2');
  assert.equal(diagnostic.message, 'Expected Text, found Int');
});

test('a non-Text right operand is a type error at it', () => {
  const diagnostic = rejectedAt(main('Text', '"x" ++ 1'), 'E_TYPE', '1');
  assert.equal(diagnostic.message, 'Expected Text, found Int');
});

test('the left operand is checked first', () => {
  const source = main('Text', '1 ++ true');
  assert.equal(rejectedAt(source, 'E_TYPE', '1').message,
    'Expected Text, found Int');
});

test('+ does not take Text', () => {
  const diagnostic = rejectedAt(main('Int', '"a" + "b"'), 'E_TYPE', '"a"');
  assert.equal(diagnostic.message, 'Expected Int, found Text');
});

// The start of the last `+` or `++` token (not of a `+` inside a `++`).
const lastOperator = source =>
  [...source.matchAll(/\+\+|\+/g)].at(-1).index;

test('a chain of 130 operands is E_NESTING at the last operator', () => {
  const source = chain(130, '++');
  const diagnostic = rejected(source, 'E_NESTING');
  const last = lastOperator(source);
  assert.deepEqual(diagnostic.span.start.offset, last);
  assert.equal(diagnostic.span.end.offset, last + 2);
});

test('mixed + and ++ operators count together', () => {
  const mixed = count => main('Text', Array.from({ length: count },
    (_, index) => (index === 0 ? '1' : `${index % 2 ? '+' : '++'} 1`))
    .join(' '));
  assert.equal(rejected(mixed(130), 'E_NESTING').span.start.offset,
    lastOperator(mixed(130)));
  assert.equal(rejected(mixed(129), 'E_TYPE').message,
    'Expected Text, found Int');
});
