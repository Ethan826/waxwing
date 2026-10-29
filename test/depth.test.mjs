import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { forms } from '../scripts/depth-forms.mjs';
import { nestingLimit } from '../output/Format.Parse.Grammar/index.js';
import { work, cli } from './depth-support.mjs';

// E_NESTING (ADR 006), through the CLI: per form, depth = limit compiles,
// builds and runs; depth = limit + 1 is E_NESTING at the token that would
// exceed it. No run may print a raw RangeError or JavaScript stack frames.
const limit = nestingLimit;

after(() => rmSync(work, { recursive: true, force: true }));

const position = offset => ({ line: 1, offset, column: offset + 1 });

const nestingAt = (program) => {
  const result = cli('emit', program.source);
  assert.equal(result.status, 1, `accepted: ${result.stderr}`);
  const diagnostic = JSON.parse(result.stderr);
  assert.deepEqual(
    { code: diagnostic.code, message: diagnostic.message,
      span: diagnostic.span },
    { code: 'E_NESTING', message: `Nesting exceeds ${limit} levels`,
      span: { start: position(program.at),
        end: position(program.at + program.text.length) } });
  assert.equal(program.source.slice(program.at,
    program.at + program.text.length), program.text, 'fixture offset');
};

const runs = (program) => {
  const result = cli('run', program.source);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, program.output);
};

// Every form, the nested-match ones included (E005: each match is now a
// named Go function, not a nested closure that Go's inliner expands).
for (const [name, form] of Object.entries(forms)) {
  test(`${name}: depth ${limit} compiles, builds and runs`, () => {
    runs(form(limit));
  });

  test(`${name}: depth ${limit + 1} is E_NESTING`, () => {
    nestingAt(form(limit + 1));
  });
}

// Review Focus 1: the depth bookkeeping does not mask an ordinary error.
test(`a syntax error at depth ${limit - 1} is still E_SYNTAX`, () => {
  const depth = limit - 1;
  const before = `fn main(): Int = ${'('.repeat(depth)}`;
  const result = cli('emit', `${before}+${')'.repeat(depth)};`);
  assert.equal(result.status, 1);
  const diagnostic = JSON.parse(result.stderr);
  assert.deepEqual(
    { code: diagnostic.code, message: diagnostic.message,
      span: diagnostic.span },
    { code: 'E_SYNTAX', message: 'Expected an expression',
      span: { start: position(before.length),
        end: position(before.length + 1) } });
});

// Sibling subtrees do not add up: only one root-to-leaf path counts, and
// each declaration body starts afresh (g follows main, which is at the limit).
test('siblings and later declarations do not add depth', () => {
  const deep = `${'('.repeat(limit - 1)}1${')'.repeat(limit - 1)}`;
  const source = `fn f(x: Int, y: Int): Int = x + y; `
    + `fn main(): Int = f(${deep}, ${deep}); `
    + `fn g(): Int = ${deep} + 1;`;
  const result = cli('run', source);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '2\n');
});
