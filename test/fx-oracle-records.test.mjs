import test from 'node:test';
import assert from 'node:assert/strict';
import {
  access, add, block, call, doItem, lit, print, record, update
} from './fx-gen-ast.mjs';
import { outcome } from './fx-oracle.mjs';
import { render } from './fx-programs.mjs';
import { shrink } from './fx-shrink.mjs';
import { checked } from './support.mjs';

// R001 Task 9: records in the reference interpreter (records design §1,
// §3, §3a, §8), against hand-derived traces. The expectations follow from
// the spec alone: fields evaluate in written order, an update evaluates
// its base and then each replacement in written order, records compare
// and print in sorted label order (Text quoted, as nested in data), and a
// record payload's Fail family is its label set.
const seen = source => {
  const { stdout, stderr, status } = outcome(source);
  return { stdout, stderr, status };
};
const runs = (source, stdout) =>
  assert.deepEqual(seen(source), { stdout, stderr: '', status: 0 });
const arg = 'fn arg(n: Int): Int with Console = { Console.print(n); n }; ';
const main = body => `${arg}fn main(): Unit with Console = { ${body} };`;

test('a literal evaluates its fields once, in written order', () => {
  runs(main('let r = { b: arg(1), a: arg(2), c: arg(3) }; Console.print(r)'),
    '1\n2\n3\n{ a: 2, b: 1, c: 3 }\n');
});

test('an update evaluates its base, then each replacement in order', () => {
  runs(main('let r = { a: 1, b: 2, c: 3 }; '
    + 'Console.print(({ Console.print(9); r }) { c = arg(4), a = arg(5) }); '
    + 'Console.print(r)'),
  '9\n4\n5\n{ a: 5, b: 2, c: 4 }\n{ a: 1, b: 2, c: 3 }\n');
});

test('access reads a field, through calls and chained postfix', () => {
  const source = `${arg}fn mk(n: Int): { a: Int, b: { c: Text } } = `
    + '{ b: { c: "x" }, a: n }; fn main(): Unit with Console = { '
    + 'Console.print(mk(arg(1)) { a = 7 }.a); Console.print(mk(2).b.c); '
    + 'Console.print({ a: 3 }.a + mk(4).a) };';
  runs(source, '1\n7\nx\n7\n');
});

test('printing sorts labels and quotes nested Text', () => {
  runs('type Cell = Cell({ t: Text, n: Int }) | Empty; '
    + 'fn main(): Unit with Console = { '
    + 'let r = { zz: (), a_: "q\\"", aB: true, a1: -2, b: Cell({ t: "w", '
    + 'n: 1 }), c: { y: Empty, x: false } }; '
    + 'Console.print(r); Console.print(show(r.c)); Console.print(r.a_) };',
  '{ a1: -2, aB: true, a_: "q\\"", b: Cell({ n: 1, t: "w" }), '
    + 'c: { x: false, y: Empty }, zz: () }\n{ x: false, y: Empty }\nq"\n');
});

test('comparison is lexicographic in sorted label order', () => {
  runs(main('Console.print({ b: 1, a: 2 } < { a: 1, b: 3 }); '
    + 'Console.print({ b: 1, a: 1 } < { a: 1, b: 3 }); '
    + 'Console.print({ a: "x", b: 0 } == { b: 0, a: "x" }); '
    + 'Console.print({ a: { c: 2 } } >= { a: { c: 3 } })'),
  'false\ntrue\ntrue\nfalse\n');
});

const generic = 'fn bump(p: { n: Int, ...r }): { n: Int, ...r } = '
  + 'p { n = p.n + 1 }; '
  + 'fn mix(p: { n: Int, ...r }, q: { n: Int, ...s }): Int = p.n + q.n; '
  + 'fn sh(p: { n: Int, ...r }): Text = show(p); ';

test('generic functions run on each record they are given', () => {
  const source = `${generic}fn main(): Unit with Console = { `
    + 'let r = { t: "x", n: 1 }; Console.print(bump(bump(r))); '
    + 'Console.print(mix(r, { n: 5, b: true })); '
    + 'Console.print(sh({ n: 0 })) };';
  runs(source, '{ n: 3, t: "x" }\n6\n{ n: 0 }\n');
});

test('the census sees literals, accesses, updates and generic calls', () => {
  const plain = outcome(main('Console.print(1)')).events;
  const used = outcome(`${generic}fn main(): Unit with Console = `
    + 'Console.print(bump({ n: 1 }) < { n: 0 });').events;
  for (const event of ['record-literal', 'record-access', 'record-update',
    'record-generic', 'record-compare', 'record-print']) {
    assert.ok(!plain.has(event), event);
    assert.ok(used.has(event) || event === 'record-print', event);
  }
  assert.ok(outcome(main('Console.print({ a: 1 })')).events
    .has('record-print'));
});

const families = 'fn raise(n: Int): Int '
  + 'with Fail({ code: Int }) + Fail({ msg: Text }) = '
  + 'if n == 0 then Fail.fail({ code: 7 }) '
  + 'else if n == 1 then Fail.fail({ msg: "m" }) else n; '
  + 'fn caught(n: Int): Text = handle show(raise(n)) '
  + '{ fail(e: { code: Int }) => "code ${show(e.code)}", '
  + 'fail(e: { msg: Text }) => "msg ${e.msg}" }; ';

test('two label sets are two Fail families, each to its own', () => {
  runs(`${families}fn main(): Unit with Console = { `
    + 'Console.print(caught(0)); Console.print(caught(1)); '
    + 'Console.print(caught(2)) };', 'code 7\nmsg m\n2\n');
});

test('a reordered payload shape is caught by its family', () => {
  runs('fn work(): Int with Fail({ a: Int, b: Int }) { fail } = '
    + 'fail({ b: 2, a: 1 }); fn main(): Unit with Console = '
    + 'Console.print(handle work() { fail(e: { b: Int, a: Int }) => '
    + 'e.a + e.b + e.b });', '5\n');
});

test('an abort crossing an inner handle of another label set', () => {
  runs(main('Console.print(handle { handle { Fail.fail({ x: 1, y: "s" }); 0 }'
    + ' { fail(e: { x: Int }) => e.x } } '
    + '{ fail(e: { y: Text, x: Int }) => e.x + 10 })'), '11\n');
});

test('a pending record abort names its type in sorted order', () => {
  assert.deepEqual(seen(main('handle { defer crash("boom"); '
    + 'Fail.fail({ k: 3, j: "s" }) } { fail(e: { j: Text, k: Int }) => () }')),
  { stdout: '', status: 1, stderr: 'fail({ j: Text, k: Int }): '
    + '{ j: "s", k: 3 }\ncleanup failed: crash: boom\n' });
});

// The generator's record nodes print as source, and the shrinker reaches
// into a literal's and an update's fields while the program checks.
test('the shrinker reduces record fields to literals', () => {
  const shape = 'record';
  const made = record([['b', add(lit(4), lit(5))], ['a', call('arg',
    [lit(3)], 'Int')]], shape);
  const changed = update(made, [['a', add(lit(1), lit(2))]]);
  const main = { name: 'main', params: [], retText: 'Unit', rowText: 'Console',
    body: block([doItem(print(access(changed, 'b', 'Int')))]) };
  assert.ok(render({ fns: [], main }).endsWith('Console.print({ b: 4 + 5, '
    + 'a: arg(3) } { a = 1 + 2 }.b); };'));
  const keep = candidate => {
    const source = render(candidate);
    try { checked(source); } catch { return false; }
    return source.includes('{ a = ');
  };
  const smallest = shrink({ fns: [], main }, keep);
  assert.ok(render(smallest).endsWith('Console.print({ b: 0, a: 0 } '
    + '{ a = 0 }.b); };'), render(smallest));
});
