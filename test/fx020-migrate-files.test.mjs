import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compiler } from '../scripts/differential-load.mjs';
import { environment, migrateSource } from '../scripts/fx020-file.mjs';

// FX020 Task 5a: how the rewrite tool finds programs inside JavaScript
// test files and maps resolver spans back to file offsets (R4: Task 7
// removes this file; its bare operation names are deliberate, R3).
const tree = fileURLToPath(new URL('..', import.meta.url));
const loaded = await compiler(tree);
const effect = 'effect Log { fn log(n: Int): Unit; };';
const main = 'fn main(): Unit with Console = print(0);';
const fragment = 'fn work(): Unit with Log = log(2);';
// What a test run harvested: the fragment behind a prelude (`effect +`).
const harvest = [effect + fragment + main];
const env = await environment(loaded, harvest);
const file = [
  `const effect = '${effect}';`,
  `const whole = '${effect}'`,
  `  + 'fn main(): Unit with Console = print(1);';`,
  `const located = effect + '${fragment}' + '${main}';`,
  'const lonely = \'fn other(): Unit with Log = log(3);\';',
  'const held = `fn main(): Unit with Console = print("\\${show(4)}");`;',
  'test(\'a print(1) title\', () => print(5));',
  '// print(6) in a comment',
  ''].join('\n');

test('literals, chains and located fragments are rewritten in place', () => {
  const result = migrateSource(env, 'test/x.test.mjs', file);
  const lines = result.text.split('\n');
  assert.equal(lines[2],
    '  + \'fn main(): Unit with Console = Console.print(1);\';');
  assert.equal(lines[3], 'const located = effect + '
    + '\'fn work(): Unit with Log = Log.log(2);\' + '
    + '\'fn main(): Unit with Console = Console.print(0);\';');
  assert.equal(lines[5], 'const held = `fn main(): Unit with Console = '
    + 'Console.print("\\${show(4)}");`;');
  assert.deepEqual([lines[0], lines[4], lines[6], lines[7]],
    file.split('\n').filter((_, index) => [0, 4, 6, 7].includes(index)));
});

test('a fragment found in no resolving source goes to the manifest', () => {
  const { manual } = migrateSource(env, 'test/x.test.mjs', file);
  assert.deepEqual(manual.map(({ line, reason, candidates }) =>
    ({ line, reason, names: candidates.map(({ name }) => name) })),
  [{ line: 5, reason: 'fragment: no resolving source contains it',
    names: ['log'] }]);
});

test('a fragment whose contexts disagree goes to the manifest',
  async () => {
    const shadowed = 'fn work(log: Int -> Unit): Unit with Log = log(2);';
    const split = await environment(loaded,
      [...harvest, effect + shadowed + main]);
    const text = 'const tail = head + \'= log(2);\';\n';
    const result = migrateSource(split, 'test/y.test.mjs', text);
    assert.equal(result.text, text);
    assert.deepEqual(result.manual.map(({ reason }) => reason),
      ['fragment: its resolving sources disagree']);
  });

test('every change lands in the edit map with file positions', () => {
  const { edits } = migrateSource(env, 'test/x.test.mjs', file);
  assert.deepEqual(edits.map(({ line, text }) => ({ line, text })), [
    { line: 3, text: 'Console.' }, { line: 4, text: 'Log.' },
    { line: 4, text: 'Console.' }, { line: 6, text: 'Console.' }]);
});

test('the command line dry run writes nothing; --write writes', () => {
  const root = mkdtempSync(join(tmpdir(), 'fx020-migrate-'));
  try {
    mkdirSync(join(root, 'examples'));
    const path = join(root, 'examples', 'one.wxw');
    writeFileSync(path, `${effect}\n${fragment}\n${main}\n`);
    const run = extra => spawnSync(process.execPath, [
      join(tree, 'scripts/fx020-migrate.mjs'), '--root', root,
      '--compiler', tree, '--harvest', join(root, 'none.jsonl'),
      '--manifest', join(root, 'manual.json'),
      '--edits', join(root, 'edits.json'), ...extra], { encoding: 'utf8' });
    const dry = run([]);
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /examples\s+1 files\s+1 units\s+2 edits/);
    assert.equal(readFileSync(path, 'utf8'),
      `${effect}\n${fragment}\n${main}\n`);
    const wrote = run(['--write']);
    assert.equal(wrote.status, 0, wrote.stderr);
    assert.equal(readFileSync(path, 'utf8'), `${effect}\n`
      + 'fn work(): Unit with Log = Log.log(2);\n'
      + 'fn main(): Unit with Console = Console.print(0);\n');
    const manifest = JSON.parse(readFileSync(join(root, 'manual.json')));
    assert.deepEqual(manifest.entries, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// Review fix round 1: an occurrence must be a token sequence of its own,
// in code, and a fragment placed with no edit for its candidates is for
// a human.
const reasons = async (contexts, literal) => {
  const placed = await environment(loaded, contexts.map(body =>
    `${effect}fn work(): Unit with Log + Console = ${body}${main}`));
  const text = `const tail = head + '${literal}';\n`;
  const result = migrateSource(placed, 'test/z.test.mjs', text);
  assert.equal(result.text, text);
  return result.manual.map(({ reason }) => reason);
};

test('a qualified, identifier-embedded or quoted occurrence is no place',
  async () => assert.deepEqual(await reasons(['{ Log.log(2); () };',
    '{ catalog(2); () };', 'print("log(2);");'], 'log(2);'),
  ['fragment: no resolving source contains it']));

test('an occurrence starting inside a name is no place', async () =>
  assert.deepEqual(await reasons(['{ log(1); log(2); () };'],
    'g(1); log(2);'), ['fragment: no resolving source contains it']));

test('a fragment placed with no edit for its candidates is manual',
  async () => {
    const shadowed = 'fn work(log: Int -> Unit): Unit = log(2);';
    const placed = await environment(loaded, [effect + shadowed + main]);
    const text = 'const tail = head + \'= log(2);\';\n';
    assert.deepEqual(migrateSource(placed, 'test/z.test.mjs', text).manual
      .map(({ reason }) => reason),
    ['fragment: located, but no edit for its candidates']);
  });

// A compiler whose qualified text resolves to a different program: the
// rewrite must be refused, and such a source is no context.
const drifting = { ...loaded, parse: source =>
  loaded.parse(source.replace('Log.log(2)', 'Log.log(3)')) };

test('a rewrite that does not re-resolve alike is refused', async () => {
  const source = `${effect}\n${fragment}\n${main}\n`;
  const result = migrateSource(await environment(drifting, []), 'x.wxw',
    source);
  assert.equal(result.text, source);
  assert.deepEqual(result.manual.map(({ reason }) => reason),
    ['resolved, but the rewrite does not re-resolve alike']);
});

test('a context whose rewrite does not verify is not used', async () => {
  const { index } = await environment(drifting, harvest);
  assert.deepEqual([index.contexts.length, index.unverified.length], [0, 1]);
});

test('a line continuation with CRLF is skipped', () => {
  const text = 'const crlf = \'fn main(): Unit with Console = \\\r\n'
    + 'print(7);\';\n';
  assert.equal(migrateSource(env, 'test/c.test.mjs', text).text,
    text.replace('print(7)', 'Console.print(7)'));
});

test('a line continuation with U+2028 is skipped', () => {
  const text = 'const ls = \'fn main(): Unit with Console = \\\u2028'
    + 'print(8);\';\n';
  assert.equal(migrateSource(env, 'test/l.test.mjs', text).text,
    text.replace('print(8)', 'Console.print(8)'));
});
