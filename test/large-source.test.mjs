import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected, rejectedAt } from './support.mjs';
import { program, paddingLength, padded, declarationsFrom }
  from './large-source-support.mjs';

// Lexing and declaration parsing must run in constant stack and linear time
// (BACKLOG E002); before they were loops, these sizes exhausted the stack or,
// through per-character array copies, the heap.
test('a megabyte of trailing whitespace compiles like none', () => {
  assert.equal(checked(padded), checked(program));
});

// Coverage.redundancy searched the arms with an Array.foldM over Either, one
// stack frame chain per arm, so a match of about 1,929 arms overflowed on a
// cold compile (G001 Task 4b). Each arm is still judged against the
// earlier ones; 5,000 arms take about 1.3 s.
const armCount = 5000;

// Duplicate detection sorts names instead of comparing every pair; the
// clash is still reported at the first declaration of the name.
test('a duplicate among many functions is reported where it first '
  + 'occurs', () => {
  const source =
    `${declarationsFrom(' ')} fn f7(): Int = 0; fn main(): Int = 0;`;
  rejectedAt(source, 'E_DUPLICATE', 'fn f7(): Int = 7;');
});

test('a lexical error after a megabyte reports its exact position', () => {
  const offset = program.length + paddingLength;
  const diagnostic = rejected(`${padded}@`, 'E_LEX');
  assert.deepEqual(diagnostic.span, {
    start: { offset, line: 1, column: offset + 1 },
    end: { offset: offset + 1, line: 1, column: offset + 2 }
  });
});

test('a five-thousand-arm match reports its redundant arm', () => {
  const arms = Array.from({ length: armCount - 1 },
    (_, index) => `${index} => ${index}`);
  const source = `fn main(): Int = match 7 { ${arms.join(', ')}, _ => 0, `
    + '3 => 3 };';
  const diagnostic = rejected(source, 'E_REDUNDANT');
  const offset = source.lastIndexOf('3 => 3');
  assert.deepEqual(diagnostic.span, {
    start: { offset, line: 1, column: offset + 1 },
    end: { offset: offset + 1, line: 1, column: offset + 2 }
  });
});
