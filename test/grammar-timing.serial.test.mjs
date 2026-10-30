import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';

// The applicative grammar (G001) parses lists in a stack-safe loop. Before
// it, match arms recursed once per arm, and 1,473 arms overflowed the stack
// with a RangeError (BACKLOG E002).
const armCount = 1473;
const main = ' fn main(): Int = 0;';

// 1,472 distinct integer arms and a final wildcard: no arm is redundant.
const integerArms = Array.from({ length: armCount - 1 },
  (_, index) => `${index} => ${index}`).concat(['_ => -1']).join(', ');

// The 5 s bounds are in grammar-timing.perf.test.mjs (npm run perf).
test('a match with 1,473 arms compiles', () => {
  checked(`fn f(n: Int): Int = match n { ${integerArms} };${main}`);
});

// Breadth inputs from BACKLOG E002: each overflowed the stack (RangeError)
// while constructor, field and argument lists recursed once per item.
const constructorCount = 1536;
const fieldCount = 1536;
const argumentCount = 1793;
const listOf = (count, item) => Array.from({ length: count }, item);

const boundedCompile = checked;

test('a type with 1,536 constructors compiles', () => {
  const constructors = listOf(constructorCount, (_, index) => `C${index}`);
  boundedCompile(`type T = ${constructors.join(' | ')};${main}`);
});

test('a constructor with 1,536 fields compiles', () => {
  const fields = listOf(fieldCount, () => 'Int');
  boundedCompile(`type P = Wide(${fields.join(', ')});${main}`);
});

test('a call with 1,793 arguments compiles', () => {
  const parameters = listOf(argumentCount, (_, index) => `p${index}: Int`);
  const zeros = listOf(argumentCount, () => '0');
  boundedCompile(`fn f(${parameters.join(', ')}): Int = 0; `
    + `fn main(): Int = f(${zeros.join(', ')});`);
});
