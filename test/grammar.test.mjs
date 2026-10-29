import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, rejectedAt } from './support.mjs';

const main = ' fn main(): Int = 0;';

const single = 'type B = T; fn f(b: B): Int = match b { T => 1';

test('a trailing comma after the last arm is accepted', () => {
  checked(`${single}, };${main}`);
});

// Recorded from the compiler before the applicative grammar.
test('a doubled trailing comma reports a pattern at the second comma', () => {
  const diagnostic = rejectedAt(`${single},, };${main}`, 'E_SYNTAX', ',', 1);
  assert.equal(diagnostic.message, 'Expected a pattern');
});

// Recorded from the compiler before the applicative grammar: an unclosed
// parenthesis at end of input is an empty span at the end.
test('an unclosed parenthesis at end of input expects the parenthesis', () => {
  const source = 'fn main(): Int = (1';
  const diagnostic = rejected(source, 'E_SYNTAX');
  const end = { offset: source.length, line: 1, column: source.length + 1 };
  assert.deepEqual(diagnostic.span, { start: end, end });
  assert.equal(diagnostic.message, "Expected ')'");
});
