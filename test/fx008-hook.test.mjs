// FX008 Task 7: clause own rows, the one-way hook (`sync`), correction S and
// the tail pass. Probes that can hang compile in a child process under a
// timeout; the gate (fx008-probes.test.mjs) pins every outcome and hash.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runGo } from './support.mjs';
import { compileWithin } from './regression-fx008.mjs';
import { probes } from './fx008-probe-table.mjs';

const context = { compilerPath: 'output/Program.Compile/index.js' };
const timeoutMs = 20_000;
const probe = name => readFileSync(`test/fx008-probes/${name}.wxw`, 'utf8');
const compiled = source => compileWithin(context, source, timeoutMs);

const accepted = source => {
  const found = compiled(source);
  assert.equal(found.timedOut, false, 'timed out');
  assert.equal(found.diagnostic, null, JSON.stringify(found.diagnostic));
  assert.ok(found.go.length > 0);
  return found;
};

const exactly = text =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const rejectedAt = (source, start, end, pattern) => {
  const found = compiled(source);
  assert.equal(found.timedOut, false, 'timed out');
  assert.equal(found.diagnostic?.code, 'E_EFFECT');
  assert.match(found.diagnostic.message, pattern);
  assert.deepEqual([found.diagnostic.span.start.offset,
    found.diagnostic.span.end.offset], [start, end]);
};

test('gain1 is a sound gain', () => {
  assert.equal(runGo(probe('rev10/gain1')), '0\n');
});

// F2 reports the clause row first (c -> R), at the sync's node (P13).
test('p5, r1 and r2 are rejected by the hook (F2)', () => {
  const text = /^Console \+ Log \+ \.\.\. and Console \+ \.\.\. cannot be made equal: both end in \.\.\.$/;
  rejectedAt(probe('design-review/p5'), 163, 169, text);
  rejectedAt(probe('design-review/r1'), 180, 186, text);
  rejectedAt(probe('design-review/r2'), 194, 200, text);
});

test('cyc2, cyc3 and sh1 report the c -> R edge of their cycle', () => {
  const ends = ' cannot be made equal: both end in ...';
  rejectedAt(probe('rev8/cyc2'), 174, 179, exactly(`Tick + ... and ...${ends}`));
  rejectedAt(probe('rev8/cyc3'), 338, 344,
    exactly(`Log + Tick + ... and ...${ends}`));
  rejectedAt(probe('rev9/sh1'), 192, 246, exactly(`... and Tick + ...${ends}`));
});

const printsZero = [
  'rev7/late1', 'rev7/late2', 'rev8/two1', 'rev8/two2', 'rev8/two3',
  'rev8/two1f', 'rev8/one1', 'rev8/one3', 'rev8/one1rev8', 'rev9/ov1',
  'rev9/ov1f', 'rev9/set1', 'rev8/cyc1', 'rev8/cyc1ok', 'rev10/pair1'
];

for (const name of printsZero) {
  test(`${name} keeps printing 0 under the hook`, () => {
    assert.equal(runGo(probe(name)), '0\n');
  });
}

const keepsText = [
  'rev7/rig1', 'rev7/rig2', 'rev9/ov1ctl', 'rev9/set1ctl', 'rev10/pair1ctl',
  'design-review/p4'
];

// The hook keeps the exact code, text and span of these rejections: the
// expected outcome is the probe table's, not a looser check.
test('rejections without defer keep their exact texts under the hook', () => {
  for (const name of keepsText) {
    const expected = probes.find(found => found.file === name).today;
    const found = compiled(probe(name));
    assert.equal(found.timedOut, false, `${name}: timed out`);
    assert.equal(found.diagnostic?.code, expected.code, name);
    assert.equal(found.diagnostic.message, expected.message, name);
    assert.deepEqual([found.diagnostic.span.start.offset,
      found.diagnostic.span.end.offset], [expected.start, expected.end], name);
  }
});

const permutations = items => items.length <= 1 ? [items]
  : items.flatMap((item, at) => permutations(
    [...items.slice(0, at), ...items.slice(at + 1)]).map(rest => [item, ...rest]));

const three = order => [
  'type Opt(a) = No | Some(a);',
  'type Job(a, ...effects) = Job(Int -> a with ...effects);',
  'effect Log { fn log(n: Int): Unit; };',
  'effect Cell(a) { fn put(x: a): Bool; };',
  'fn main(): Unit with Console = {',
  '  let k1 = fn(n: Int) => ();', '  let k2 = fn(n: Int) => ();',
  '  let k3 = fn(n: Int) => ();',
  ...order.map(n => `  let h${n} = handler Log { log(n) => k${n}(n) };`),
  '  let g1 = fn(u: Unit) => with h1 { let v = No; if put(v) then print(v == v) else () };',
  '  let g2 = fn(u: Unit) => with h2 { if put(Some(true)) then () else () };',
  '  let g3 = fn(u: Unit) => with h3 { if put(Some(true)) then () else () };',
  '  let r = fn(x) => { fail(Job(k1)); fail(Job(k3)); fail(x) };',
  '  let q = fn(u: Unit) => r(Job(k2));', '  print(0)', '};'
].join('\n');

test('three handlers merging in settling agree in every order', () => {
  for (const order of permutations([1, 2, 3])) {
    assert.equal(runGo(three(order)), '0\n', `order ${order}`);
  }
});

test('a clause tail that turns rigid in settling is rejected by the tail pass', () => {
  rejectedAt(probe('witness/tp1'), 204, 219,
    /^f performs Console, which its signature does not allow$/);
});

// ec1's Fail(E) arrives at check time (checkDefer), so it is a control with
// today's outcome; ec2 delays it to settling and proves the exit count.
test('ec1 keeps its outcome: its Fail(E) is not late', () => {
  rejectedAt(probe('witness/ec1'), 284, 301, /^Unhandled Fail\(E\) in main$/);
});

test('a late Fail reaching a clause through an argument binding is rejected', () => {
  rejectedAt(probe('witness/ec2'), 90, 380, /^Unhandled Fail\(E\) in main$/);
});

test('argbind-internal is accepted (sound gain)', () => {
  accepted(probe('argbind-internal'));
});

