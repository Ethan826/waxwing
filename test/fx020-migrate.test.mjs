import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compiler } from '../scripts/differential-load.mjs';
import { environment, migrateSource } from '../scripts/fx020-file.mjs';

// FX020 Task 5a: the one-off rewrite tool (R4: Task 7 removes it and
// this file). Its bare operation names are deliberate (R3).
const tree = fileURLToPath(new URL('..', import.meta.url));
const loaded = await compiler(tree);
const log = 'effect Log { fn log(n: Int): Unit; fn info(n: Int): Unit; };\n';
const main = '\nfn main(): Unit with Console = print(0);';
const env = await environment(loaded, []);
const migrated = source => migrateSource(env, 'x.wxw', source);
const rewrites = (before, after) => {
  const result = migrated(log + before + main);
  assert.deepEqual(result.manual, []);
  assert.equal(result.text, log + after
    + main.replace('print(0)', 'Console.print(0)'));
};

test('bare calls gain their effect qualifier', () => rewrites(
  'fn work(): Unit with Console + Log + Fail(Int) = '
    + '{ log(1); print(2); fail(3) };',
  'fn work(): Unit with Console + Log + Fail(Int) = '
    + '{ Log.log(1); Console.print(2); Fail.fail(3) };'));

test('bare references gain their effect qualifier', () => rewrites(
  'fn work(): Unit with Console + Log = '
    + '{ let h = log; let p = print; h(1); p(2) };',
  'fn work(): Unit with Console + Log = '
    + '{ let h = Log.log; let p = Console.print; h(1); p(2) };'));

test('a local that shadows an operation is left alone', () => rewrites(
  'fn one(log: Int): Unit with Console = print(log);\n'
    + 'fn two(): Unit with Console = { let log = 2; print(log) };',
  'fn one(log: Int): Unit with Console = Console.print(log);\n'
    + 'fn two(): Unit with Console = { let log = 2; Console.print(log) };'));

test('handler and handle clause heads are left alone', () => rewrites(
  'fn work(): Unit with Console + Fail(Int) = '
    + 'with handler Log { log(n) => print(n), info(n) => () } '
    + '{ log(1) };\n'
    + 'fn safe(): Unit with Console = '
    + 'handle work() { fail(error: Int) => print(error) };',
  'fn work(): Unit with Console + Fail(Int) = '
    + 'with handler Log { log(n) => Console.print(n), info(n) => () } '
    + '{ Log.log(1) };\n'
    + 'fn safe(): Unit with Console = '
    + 'handle work() { fail(error: Int) => Console.print(error) };'));

test('names in holes: a call is qualified, a local is not', () => rewrites(
  'fn hole(log: Text): Unit with Console = print("${log}");\n'
    + 'fn call(): Unit with Console + Log = print("${log(1)}");',
  'fn hole(log: Text): Unit with Console = Console.print("${log}");\n'
    + 'fn call(): Unit with Console + Log = '
    + 'Console.print("${Log.log(1)}");'));

test('an imported name is left bare; a non-imported one is not', () =>
  rewrites('fn work(): Unit with Log { log } = { log(1); info(2) };',
    'fn work(): Unit with Log { log } = { log(1); Log.info(2) };'));

test('running the tool twice changes nothing', () => {
  const source = log + 'fn work(): Unit with Console + Log = '
    + '{ let h = log; log(1); print("${log(2)}") };' + main;
  const once = migrated(source).text;
  assert.notEqual(once, source);
  const twice = migrated(once);
  assert.equal(twice.text, once);
  assert.deepEqual(twice.edits, []);
});

const manualOnly = source => {
  const result = migrated(source);
  assert.equal(result.text, source, 'a rejected program is never edited');
  assert.equal(result.manual.length, 1);
  return result.manual[0];
};

test('a program with a syntax error goes to the manifest', () => {
  const entry = manualOnly(log + 'fn main(): Unit with Log = log(1) +;');
  assert.match(entry.reason, /^rejected E_SYNTAX/);
  assert.deepEqual(entry.candidates.map(({ name, qualifier, line }) =>
    ({ name, qualifier, line })),
  [{ name: 'log', qualifier: 'Log', line: 2 }]);
});

test('a program with an unbound name goes to the manifest', () => {
  const entry = manualOnly(log
    + 'fn main(): Unit with Log = { log(1); missing(2) };');
  assert.match(entry.reason, /^rejected E_UNBOUND/);
  assert.deepEqual(entry.candidates.map(({ name, column }) =>
    ({ name, column })), [{ name: 'log', column: 30 }]);
});

test('a rejected program\'s clause heads are not candidates', () => {
  const entry = manualOnly(log + 'fn main(): Unit with Console = '
    + 'with handler Log { log(n) => print(n) } { log(1) } +;');
  assert.deepEqual(entry.candidates.map(({ name }) => name),
    ['print', 'log']);
});
