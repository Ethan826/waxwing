import test from 'node:test';
import assert from 'node:assert/strict';
import { wideLinesOf } from '../scripts/width.mjs';

const pad = 'x '.repeat(40);
const url = 'https://example.com/' + 'a'.repeat(70);
const flagged = (file, text) => wideLinesOf(file, text).length;

test('a URL beside long prose is flagged', () => {
  assert.equal(flagged('a.md', `see ${url} and ${pad}\n`), 1);
});

test('a long link or URL alone on a line is exempt', () => {
  assert.equal(flagged('a.md', `[text](${url})\n`), 0);
  assert.equal(flagged('a.md', `- [two words](${url})\n`), 0);
  assert.equal(flagged('a.md', `${url}\n`), 0);
});

test('a table row and an ATX heading are exempt', () => {
  assert.equal(flagged('a.md', `| a | ${pad} |\n`), 0);
  assert.equal(flagged('a.md', `### ${pad}\n`), 0);
});

test('a table row, heading or word inside a code fence is flagged', () => {
  assert.equal(flagged('a.md', `\`\`\`\n| a | ${pad} |\n\`\`\`\n`), 1);
  assert.equal(flagged('a.md', `\`\`\`\n# ${pad}\n\`\`\`\n`), 1);
  assert.equal(flagged('a.md', `\`\`\`\n${'z'.repeat(90)}\n\`\`\`\n`), 1);
  assert.equal(flagged('a.md', `\`\`\`\n${url}\n\`\`\`\n`), 0);
});

test('source files have no exemptions', () => {
  assert.equal(flagged('a.mjs', `// ${url}\n`), 1);
  assert.equal(flagged('a.wxw', `${pad}x\n`), 1);
});
