import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compiler } from '../scripts/differential-load.mjs';
import { align, apply, mapSpan } from '../scripts/fx020-editmap.mjs';
import { judge, pairUp, sourceKey } from '../scripts/fx020-pairs.mjs';

// FX020 Task 5a: the edit map and the paired differential (R4: Task 7
// removes them and this file; its bare operation names are deliberate).
const tree = fileURLToPath(new URL('..', import.meta.url));
const loaded = await compiler(tree);
const pair = { baseline: loaded, candidate: loaded };
const position = (offset, line, column) => ({ offset, line, column });
const span = (start, end) => ({ start, end });

const original = 'fn f(): Unit with Log = { log(1); g(2) };\nfn g(): Int = 3;';
const qualified = [{ at: original.indexOf('log'), text: 'Log.',
  kind: 'qualifier' }];

test('a span on the edited line moves by the qualifier', () => {
  const after = apply(original, qualified);
  const at = original.indexOf('g(2)');
  assert.deepEqual(mapSpan(qualified, original, after,
    span(position(at, 1, at + 1), position(at + 4, 1, at + 5))),
  span(position(at + 4, 1, at + 5), position(at + 8, 1, at + 9)));
});

test('a span after a wrapped line moves down a line', () => {
  const wrap = [{ at: original.indexOf('g(2)'), text: '\n  ',
    kind: 'break' }];
  const after = apply(original, wrap);
  const at = original.indexOf('3;');
  const line = original.indexOf('\n') + 1;
  assert.deepEqual(mapSpan(wrap, original, after,
    span(position(at, 2, at - line + 1), position(at + 1, 2, at - line + 2))),
  span(position(at + 3, 3, at - line + 1),
    position(at + 4, 3, at - line + 2)));
});

test('the two ends of a span move independently', () => {
  const after = apply(original, qualified);
  const at = original.indexOf('log');
  // The call keeps its start (the qualifier joins it); its end moves.
  assert.deepEqual(mapSpan(qualified, original, after,
    span(position(at, 1, at + 1), position(at + 6, 1, at + 7))),
  span(position(at, 1, at + 1), position(at + 10, 1, at + 11)));
  const wrap = [{ at: at + 2, text: '\n', kind: 'break' }];
  const wrapped = apply(original, wrap);
  assert.deepEqual(mapSpan(wrap, original, wrapped,
    span(position(at + 2, 1, at + 3), position(at + 2, 1, at + 3))),
  span(position(at + 3, 2, 1), position(at + 2, 1, at + 3)));
});

test('alignment recovers the insertions from a migrated twin', () => {
  const edits = [...qualified,
    { at: original.indexOf('g(2)'), text: '\n  ', kind: 'break' }];
  assert.deepEqual(align(original, apply(original, edits)), edits);
  assert.equal(align(original, original.replace('1', '2')), undefined);
});

test('a hand wrap aligns, and a span after it moves down', () => {
  const before = 'fn f(a: Int, b: Int): Int = a;';
  const after = 'fn f(a: Int,\n  b: Int): Int = a;';
  const edits = align(before, after);
  assert.deepEqual(edits, [{ at: 12, text: '\n ', kind: 'break' }]);
  const at = before.indexOf('b: Int');
  assert.deepEqual(mapSpan(edits, before, after,
    span(position(at, 1, at + 1), position(at + 6, 1, at + 7))),
  span(position(at + 2, 2, 3), position(at + 8, 2, 9)));
  assert.equal(align(before, 'fn f(a: Int,\n b: Int): Int = a;').length, 1);
});

const log = 'effect Log { fn log(n: Int): Unit; };\n';
const main = '\nfn main(): Unit with Console = print(0);';
const program = body => log + body + main;
const qualify = text => text.replace(/(?<!fn )\blog\(/g, 'Log.log(')
  .replace(/\bprint\(/g, 'Console.print(');
const accepted = program('fn work(): Unit with Log = log(1);');
const rejected = program('fn work(): Unit with Log = { log(1); 1 + true };');
// Rewriting a shadowing local changes the program: the difference the
// paired run exists to catch.
const shadow = number => log + 'fn work(log: Int -> Unit with Log): Unit '
  + `with Log = log(${number});\nfn main(): Unit with Console = with `
  + 'handler Log { log(n) => print(n) } { work(Log.log) };';
const wrongly = number => shadow(number)
  .replace(`= log(${number})`, `= Log.log(${number})`)
  .replace('=> print(n)', '=> Console.print(n)');

const run = (originals, migrated, ledger) => judge(pair,
  pairUp(originals, migrated), ledger);

test('faithful pairs, accepted and rejected, show no difference', () => {
  const result = run([accepted, rejected],
    [qualify(rejected), qualify(accepted)], []);
  assert.deepEqual(result, { compared: 2, unexpected: [], expected: [],
    stale: [] });
});

test('an unexpected difference fails; a ledger-listed one passes', () => {
  const result = run([shadow(1), shadow(2)], [wrongly(1), wrongly(2)],
    [{ original: sourceKey(shadow(2)), kind: 'go',
      reason: 'test: a deliberate shadowing rewrite' }]);
  assert.deepEqual(result.unexpected.map(({ original, kind }) =>
    ({ original, kind })), [{ original: shadow(1), kind: 'go' }]);
  assert.deepEqual(result.expected.map(({ original }) => original),
    [shadow(2)]);
  assert.deepEqual(result.stale, []);
});

test('a migrated source with no original twin is a difference', () => {
  const result = run([accepted], [qualify(accepted).replace('1', '7')], []);
  assert.deepEqual(result.unexpected.map(({ kind }) => kind),
    ['unpaired original', 'unpaired migrated']);
});

test('a ledger entry that matches nothing is stale', () => {
  const result = run([accepted], [qualify(accepted)],
    [{ original: sourceKey(shadow(9)), kind: 'go', reason: 'gone' }]);
  assert.equal(result.stale.length, 1);
});

test('a ledger entry naming neither source excuses nothing', () => {
  const result = run([shadow(3)], [wrongly(3)],
    [{ kind: 'go', reason: 'too broad' }]);
  assert.equal(result.unexpected.length, 1);
  assert.equal(result.stale.length, 1);
});
