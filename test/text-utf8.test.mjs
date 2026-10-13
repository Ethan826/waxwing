import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spanOf } from './text-spans.mjs';

// Text v1 design §2, §6 and amendment 4: the CLI rejects source that is not
// valid UTF-8 at the first invalid byte, one unit, by the location
// convention (UTF-16 units, LF starts a line).
const head = Buffer.from('fn main(): Text = "');
const tail = Buffer.from('";');

const cli = (bytes, verb = 'emit') => {
  const work = mkdtempSync(join(tmpdir(), 'waxwing-utf8-'));
  try {
    const file = join(work, 'in.wxw');
    writeFileSync(file, bytes);
    const result = spawnSync('node',
      ['scripts/waxwing.mjs', verb, file, join(work, 'out.go')],
      { encoding: 'utf8', timeout: 60000 });
    assert.ifError(result.error);
    return { ...result, file };
  } finally { rmSync(work, { recursive: true, force: true }); }
};

const refusal = (valid, invalid, rest = Buffer.alloc(0)) => {
  const bytes = Buffer.concat([valid, Buffer.from(invalid), rest]);
  const prefix = valid.toString('utf8');
  const result = cli(bytes);
  assert.equal(result.status, 1, result.stderr);
  const wire = JSON.parse(result.stderr);
  assert.equal(wire.code, 'E_SYNTAX');
  assert.equal(wire.message, 'Invalid UTF-8 in source');
  assert.equal(wire.file, result.file);
  assert.deepEqual(Object.keys(wire).sort(),
    ['code', 'file', 'message', 'related', 'span']);
  assert.deepEqual(wire.span,
    spanOf(prefix, prefix.length, prefix.length + 1));
};

test('0xFF in the middle of the file', () =>
  refusal(Buffer.concat([head, Buffer.from('ab')]), [0xFF],
    Buffer.concat([Buffer.from('cd'), tail])));

test('the span counts UTF-16 units of the valid prefix', () =>
  refusal(Buffer.concat([head, Buffer.from('é😀')]), [0x80], tail));

test('the line and column follow LF', () =>
  refusal(Buffer.from('-- 😀\n-- é\nfn main(): Text = "x'), [0xC3, 0x28],
    Buffer.from('";')));

test('CRLF counts as an ordinary column then LF', () =>
  refusal(Buffer.from('-- a\r\nfn main(): Text = "'), [0xFE], tail));

test('a truncated 3-byte sequence at the end of the file', () =>
  refusal(Buffer.from('fn main(): Text = "x'), [0xE2, 0x82]));

test('a truncated sequence followed by ASCII starts at its lead', () =>
  refusal(Buffer.concat([head, Buffer.from('x')]), [0xE2, 0x82], tail));

test('a surrogate, an overlong form and a high code point', () => {
  const forms = [[0xED, 0xA0, 0x80], [0xC0, 0x80], [0xF4, 0x90, 0x80, 0x80]];
  for (const bad of forms)
    refusal(Buffer.concat([head, Buffer.from('x')]), bad, tail);
});

test('a valid U+FFFD in the prefix is not the invalid byte', () =>
  refusal(Buffer.concat([head, Buffer.from('�')]), [0xFF], tail));

test('the first of several invalid bytes is reported', () => {
  const valid = Buffer.concat([head, Buffer.from('a')]);
  refusal(valid, [0xFF, 0xFE], Buffer.concat([Buffer.from([0xFF]), tail]));
});

test('a valid non-ASCII literal is accepted', () => {
  const bytes = Buffer.concat([head, Buffer.from('é😀'), tail]);
  const result = cli(bytes);
  assert.equal(result.status, 0, result.stderr);
});

test('a BOM is treated as it was before, not stripped', () => {
  const bytes = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]),
    head, tail]);
  const result = cli(bytes);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).code, 'E_LEX');
});
