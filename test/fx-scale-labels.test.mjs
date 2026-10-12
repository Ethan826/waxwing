import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { command } from './support.mjs';
import { maxCharacters } from './fx-diagnostics-support.mjs';

// FX001 Task 11: a declaration with a 1,000-label written row, through the
// CLI. It compiles (emit); a rejection involving such a row prints within
// the diagnostic bound of Task 9 (design §6), not one line per label.
const labels = 1000;
const names = Array.from({ length: labels }, (_, at) => `E${at + 1}`);
const effects = names.map((name, at) =>
  `effect ${name} { fn op${at + 1}(): Int; };`).join(' ');
const big = `fn big(): Int with ${names.join(' + ')} = op1(); `;

const inWork = body => {
  const work = mkdtempSync(join(tmpdir(), 'waxwing-labels-'));
  try { return body(work); } finally {
    rmSync(work, { recursive: true, force: true });
  }
};
const source = (work, main) => {
  const file = join(work, 'labels.wxw');
  writeFileSync(file, `${effects} ${big}${main}`);
  return file;
};

test('a 1,000-label row compiles through emit', () => inWork(work => {
  const go = join(work, 'labels.go');
  command('node', ['scripts/waxwing.mjs', 'emit',
    source(work, 'fn main(): Int = 0;'), go]);
  assert.match(readFileSync(go, 'utf8'), /^package main$/m);
}));

const reject = (work, main) => {
  const result = spawnSync('node', ['scripts/waxwing.mjs', 'emit',
    source(work, main), join(work, 'out.go')], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.length <= maxCharacters,
    `${result.stderr.length} characters`);
  return JSON.parse(result.stderr);
};

test('rejecting a call of a 1,000-label function prints boundedly', () =>
  inWork(work => {
    const diagnostic = reject(work, 'fn main(): Int = big();');
    assert.equal(diagnostic.code, 'E_EFFECT');
    assert.equal(diagnostic.message, 'Unhandled E1 in main');
  }));

// Two written 1,000-label rows that differ by one label, sharing a tail.
const row = count => `${names.slice(0, count).join(' + ')} + ...r`;
const both = `fn both(f: Int -> Int with ${row(labels - 1)}, `
  + `g: Int -> Int with ${row(labels)}): Int = 0; `;

test('a side-condition rejection of two 1,000-label rows is bounded', () =>
  inWork(work => {
    const main = `${both}fn main(): Int = { let h = fn(x) => x; both(h, h) };`;
    const diagnostic = reject(work, main);
    assert.equal(diagnostic.code, 'E_EFFECT');
    assert.match(diagnostic.message, /both end in \.\.\.r$/);
  }));
