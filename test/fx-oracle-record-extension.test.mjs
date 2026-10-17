import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, prelude } from './fx-gen-record-extension.mjs';
import { runGoBatch } from './go-batch.mjs';
import { outcome } from './fx-oracle.mjs';
import { checked } from './support.mjs';

// R005 Task 3: extension, removal, named rests and `{}` against the
// reference interpreter. Hand traces first (the spec alone: items evaluate
// left to right with the spread's base once, `without` drops the labels it
// names, a named rest binds the fields no pattern field names, `{}` prints
// as `{}` beside Unit's `()`), then generated programs run in Go. The
// generator (test/fx-gen-record-extension.mjs) builds well-typed programs,
// so the compiler must accept them; the corpus fails below the acceptance
// floor, and every accepted program's Go output must equal the
// interpreter's exactly, effects in order included.
const seen = source => {
  const { stdout, stderr, status } = outcome(source);
  return { stdout, stderr, status };
};
const runs = (source, stdout) =>
  assert.deepEqual(seen(source), { stdout, stderr: '', status: 0 });
const main = body => `${prelude}fn main(): Unit with Console = { ${body} };`;

test('items evaluate left to right, the spread once', () => {
  runs(`${prelude}fn mid(): { m: Int } with Console = { `
    + 'Console.print(2); { m: 20 } }; fn main(): Unit with Console = { '
    + 'Console.print({ a: tick(1), ...mid(), b: tick(3) }) };',
  '1\n2\n3\n{ a: 1, b: 3, m: 20 }\n');
});

test('a later item of the spread is not evaluated twice', () => {
  runs(main('let r = { ...{ Console.print(0); { x: 1 } }, y: tick(5) }; '
    + 'Console.print(r); Console.print(r)'),
  '0\n5\n{ x: 1, y: 5 }\n{ x: 1, y: 5 }\n');
});

test('without drops the labels it names and may leave {}', () => {
  runs(main('let p = { c: 3, a: 1, b: 2 }; Console.print(p without { b }); '
    + 'Console.print(p without { a, b, c }); Console.print(())'),
  '{ a: 1, c: 3 }\n{}\n()\n');
});

test('a named rest binds the unnamed fields, to {} when none', () => {
  runs(main('Console.print(match { n: 1, o: 2, p: 3 } { '
    + '{ o, ...more } => more }); Console.print(match { n: 1 } { '
    + '{ n, ...more } => more })'), '{ n: 1, p: 3 }\n{}\n');
});

test('empty records are equal, and a copy of one is itself', () => {
  runs(main('let e = { n: 1 } without { n }; Console.print(e == e); '
    + 'Console.print({ ...e } == e); Console.print({ ...e, k: 2 })'),
  'true\ntrue\n{ k: 2 }\n');
});

const total = Number(process.env.WAXWING_RE_PROGRAMS ?? 200);
const baseSeed = Number(process.env.WAXWING_RE_SEED ?? 20261017);
const floor = 0.95;
const features = ['extension', 'removal', 'rest', 'generic', 'empty',
  'effects', 'spread-first', 'spread-middle', 'spread-last', 'binder-used'];
const minimum = 10;

const programs = Array.from({ length: total }, (_, index) =>
  ({ seed: baseSeed + index, ...generate(baseSeed + index) }));
const accepted = [];
const rejections = [];
for (const program of programs) {
  try { checked(program.source); accepted.push(program); } catch (error) {
    rejections.push(`seed ${program.seed}: ${error.message}`);
  }
}

test('the compiler accepts the generated programs', t => {
  t.diagnostic(`generated ${total}, accepted ${accepted.length}`);
  assert.ok(accepted.length >= total * floor, rejections.slice(0, 3)
    .join('\n'));
});

test('the corpus exercises every extension form', t => {
  const counts = Object.fromEntries(features.map(name => [name,
    accepted.filter(({ features: found }) => found.has(name)).length]));
  t.diagnostic(JSON.stringify(counts));
  for (const name of features) {
    assert.ok(counts[name] >= minimum, `${name}: ${counts[name]}`);
  }
});

test('the compiled programs print what the interpreter does', t => {
  const batch = runGoBatch(import.meta.url, accepted.map(({ seed, source }) =>
    [`p${seed}`, source]), 'record-extension');
  const mismatches = [];
  for (const { seed, source } of accepted) {
    const expected = seen(source);
    const actual = batch.result(`p${seed}`);
    const found = { stdout: actual.stdout, stderr: actual.stderr,
      status: actual.status };
    if (JSON.stringify(expected) !== JSON.stringify(found)) {
      mismatches.push(seed);
    }
  }
  t.diagnostic(`compared ${accepted.length}, mismatches ${mismatches.length}`);
  assert.deepEqual(mismatches, []);
});
