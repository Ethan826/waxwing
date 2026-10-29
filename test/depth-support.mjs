import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const work = mkdtempSync(join(tmpdir(), 'waxwing-depth-'));

export const cli = (verb, source, timeout = 120000) => {
  const input = join(work, 'input.wxw');
  writeFileSync(input, source);
  const extra = verb === 'emit' ? [join(work, 'output.go')] : [];
  const result = spawnSync('node',
    ['scripts/waxwing.mjs', verb, input, ...extra],
    { encoding: 'utf8', timeout,
      env: { ...process.env, GOCACHE: resolve('.build/go-cache') } });
  assert.ifError(result.error);
  const output = result.stdout + result.stderr;
  assert.doesNotMatch(output, /RangeError|Stack overflow/, 'raw overflow');
  assert.doesNotMatch(output, /^\s+at /m, 'JavaScript stack frames');
  return result;
};
