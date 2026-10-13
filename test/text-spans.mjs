import assert from 'node:assert/strict';
import { rejected } from './support.mjs';

// Positions by the location convention (design §2): offsets are UTF-16
// units, an LF starts the next line, and every other unit is a column.
export const position = (source, offset) => {
  let line = 1;
  let column = 1;
  for (let index = 0; index < offset; index++) {
    if (source[index] === '\n') {
      line++;
      column = 1;
    } else column++;
  }
  return { offset, line, column };
};

export const spanOf = (source, start, end) =>
  ({ start: position(source, start), end: position(source, end) });

// The span of the `nth` occurrence of `text`, searching from `from`.
export const at = (source, text, nth = 0, from = 0) => {
  let start = from - 1;
  for (let found = 0; found <= nth; found++) {
    start = source.indexOf(text, start + 1);
    assert.notEqual(start, -1, `${text} occurrence ${nth} not found`);
  }
  return spanOf(source, start, start + text.length);
};

export const rejectedWith = (source, code, message, span) => {
  const diagnostic = rejected(source, code);
  assert.deepEqual(
    { message: diagnostic.message, span: diagnostic.span },
    { message, span });
};
