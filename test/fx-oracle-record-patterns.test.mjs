import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from './fx-gen-record-patterns.mjs';
import { runGoBatch } from './go-batch.mjs';
import { outcome } from './fx-oracle.mjs';
import { checked } from './support.mjs';

// R004 Task 4: record patterns against the reference interpreter. Hand
// traces first (the spec alone: a pattern tests the fields it names, a
// pun binds the label, `...` ignores the rest), then generated programs
// run in Go. Each generated match is exhaustive and non-redundant by
// construction (test/fx-gen-record-patterns.mjs), so the compiler must
// accept it; the corpus fails below the acceptance floor, and every
// accepted program's Go output must equal the interpreter's exactly.
const seen = source => {
  const { stdout, stderr, status } = outcome(source);
  return { stdout, stderr, status };
};
const runs = (source, stdout) =>
  assert.deepEqual(seen(source), { stdout, stderr: '', status: 0 });

test('fields, puns and ... in the interpreter', () => {
  runs('type Opt = None | Some(Int); fn f(p: { n: Int, o: Opt, ...r }): '
    + 'Int = match p { { n: 0, ... } => 100, { o: Some(k), n } => n + k, '
    + '{ n, ... } => n }; fn main(): Unit with Console = { '
    + 'Console.print(f({ n: 0, o: None, z: true })); '
    + 'Console.print(f({ o: Some(5), n: 2 })); '
    + 'Console.print(f({ o: None, n: 7 })) };', '100\n7\n7\n');
});

test('a record inside a constructor and a constructor inside a record', () => {
  runs('type T = Z | P({ a: T, b: Int }); fn f(t: T): Int = match t { '
    + 'Z => 0, P({ a: P({ b, ... }), ... }) => b, P({ b: c, ... }) => c '
    + '+ 10 }; fn main(): Unit with Console = { '
    + 'Console.print(f(P({ b: 1, a: P({ a: Z, b: 2 }) }))); '
    + 'Console.print(f(P({ a: Z, b: 3 }))) };', '2\n13\n');
});

const total = Number(process.env.WAXWING_RP_PROGRAMS ?? 200);
const baseSeed = Number(process.env.WAXWING_RP_SEED ?? 20261016);
const floor = 0.95;
const features = ['pun', 'rest', 'binders', 'record-in-ctor',
  'ctor-in-record', 'nested-record', 'open-row'];
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

test('the corpus exercises every record-pattern form', t => {
  const counts = Object.fromEntries(features.map(name => [name,
    accepted.filter(({ features: found }) => found.has(name)).length]));
  t.diagnostic(JSON.stringify(counts));
  for (const name of features) {
    assert.ok(counts[name] >= minimum, `${name}: ${counts[name]}`);
  }
});

test('the compiled programs print what the interpreter does', t => {
  const batch = runGoBatch(import.meta.url, accepted.map(({ seed, source }) =>
    [`p${seed}`, source]), 'record-patterns');
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
