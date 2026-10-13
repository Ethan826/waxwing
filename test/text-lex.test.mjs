import test from 'node:test';
import assert from 'node:assert/strict';
import { rejected } from './support.mjs';

// Text v1 design §6 and §2: exact messages and spans for ordinary literals.
// Offsets are UTF-16 code units, so a character outside the BMP counts as 2.
const span = (start, end) => ({
  start: { offset: start, line: 1, column: start + 1 },
  end: { offset: end, line: 1, column: end + 1 }
});
const head = 'fn main(): Text = ';
const lineBreak = 'Text cannot contain a line break; use \\n or a """ block';

const rows = [
  ['unterminated at end of file', `${head}"abc`, 'E_SYNTAX',
    'Unterminated text literal', span(18, 19)],
  ['unterminated before a semicolon line', `${head}"abc;`, 'E_SYNTAX',
    'Unterminated text literal', span(18, 19)],
  ['raw LF', `${head}"ab\ncd";`, 'E_SYNTAX', lineBreak, span(18, 21)],
  ['raw LF after a non-BMP character', `${head}"😀b\ncd";`, 'E_SYNTAX',
    lineBreak, span(18, 22)],
  ['lone CR', `${head}"ab\rcd";`, 'E_SYNTAX', lineBreak, span(18, 21)],
  ['CRLF is a line break in an ordinary literal', `${head}"a\r\nb";`,
    'E_SYNTAX', lineBreak, span(18, 20)],
  ['unknown escape', `${head}"a\\qb";`, 'E_SYNTAX',
    'Unknown escape \\q', span(20, 22)],
  ['surrogate escape', `${head}"\\u{D800}";`, 'E_SYNTAX',
    'Invalid Unicode escape \\u{D800}', span(19, 27)],
  ['escape above 10FFFF', `${head}"\\u{110000}";`, 'E_SYNTAX',
    'Invalid Unicode escape \\u{110000}', span(19, 29)],
  ['escape without digits', `${head}"\\u{}";`, 'E_SYNTAX',
    'Invalid Unicode escape \\u{}', span(19, 23)],
  ['escape with seven digits', `${head}"\\u{1234567}";`, 'E_SYNTAX',
    'Invalid Unicode escape \\u{1234567}', span(19, 30)],
  ['escape stopped by a non-hex digit', `${head}"\\u{12G}";`, 'E_SYNTAX',
    'Invalid Unicode escape \\u{12', span(19, 24)],
  ['u without braces', `${head}"\\u12";`, 'E_SYNTAX',
    'Unknown escape \\u', span(19, 21)],
  ['unclosed unicode escape', `${head}"\\u{12";`, 'E_SYNTAX',
    'Invalid Unicode escape \\u{12', span(19, 24)],
  ['non-BMP character outside a literal', 'fn main(): Int = 😀;', 'E_LEX',
    'Unexpected character', span(17, 19)],
  ['error after a non-BMP literal counts it as 2', `${head}"😀" + \\q;`,
    'E_LEX', 'Unexpected character', span(25, 26)],
  ['unknown escape after a non-BMP character', `${head}"😀\\q";`,
    'E_SYNTAX', 'Unknown escape \\q', span(21, 23)],
  ['unterminated after a non-BMP literal', `${head}"😀" + "x`, 'E_SYNTAX',
    'Unterminated text literal', span(25, 26)]
];

for (const [name, source, code, message, expected] of rows) {
  test(`text literal: ${name}`, () => {
    const diagnostic = rejected(source, code);
    assert.deepEqual(
      { message: diagnostic.message, span: diagnostic.span },
      { message, span: expected });
  });
}
