import test from 'node:test';
import assert from 'node:assert/strict';
import { Left } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

// Every printed "write q's row as `with …`" (FX017, FX018) must fix the
// program when applied. A sweep over callee rows, caller rows and
// installations (a), and parameter rows (b). A program whose caller is
// ill-formed anyway (a lambda in q's place fails the same way) is skipped.
const effects = 'effect L { fn l(): Int; }; effect M { fn m(): Int; }; '
  + 'effect N { fn n(): Int; }; ';
const tail = ' fn main(): Unit with Console = Console.print(1);';
const calleeRows = ['', 'with L', 'with M', 'with L + M', 'with M + L',
  'with M + L + M', 'with L + ...e', 'with M + L + ...e', 'with L + M + ...e',
  'with N + M + L', 'with Console + L'];
const callerRows = ['with L', 'with L + M', 'with M + L', 'with L + ...e',
  'with L + M + ...e', 'with M + M', 'with N + L + M + ...e'];
const installs = [call => call,
  call => `{ let h = handler M { m() => 1 }; with h { ${call} } }`,
  call => '{ let h = handler M { m() => 1 }; let g = handler N { n() => 2 }; '
    + `with h { with g { ${call} } } }`];
const parameterRows = ['with L + M', 'with M + L', 'with L + M + ...r',
  'with L', 'with L + M + L'];

const failure = source => {
  const result = compile(source);
  return result instanceof Left ? wire(result.value0).message : null;
};
const hintOf = message =>
  /write \S+'s row as `with ([^`]+)`/.exec(message)?.[1];
const unrelated = source => failure(source
  .replace(/fn a\(q: Int -> Int[^)]*\)/, 'fn a(z: Int)')
  .replace('take(q)', 'take(fn(y: Int) => y)')) !== null;

const checked = (source, before, rewrite, skip) => {
  const message = failure(source);
  const row = message === null ? undefined : hintOf(message);
  if (row === undefined) return 0;
  const fixed = source.replace(before, rewrite(row));
  const still = failure(fixed);
  assert.ok(still === null || (skip && unrelated(source)),
    `${fixed}\n${message}\n${still}`);
  return 1;
};

test('hints under installations fix the program', () => {
  let hints = 0;
  for (const callee of calleeRows) for (const caller of callerRows) {
    for (const install of installs) {
      const type = `Int -> Int ${callee}`;
      const source = effects + `fn a(q: ${type}, x: Int): Int ${caller} = `
        + `${install('q(x)')};` + tail;
      hints += checked(source, `q: ${type},`,
        row => `q: Int -> Int with ${row},`, false);
    }
  }
  assert.ok(hints > 50, `hints printed: ${hints}`);
});

test('hints for an argument fix the call', () => {
  let hints = 0;
  for (const callee of calleeRows) for (const param of parameterRows) {
    for (const caller of callerRows) {
      const source = effects + `fn take(f: Int -> Int ${param}): Int ${param} `
        + `= f(1); fn a(q: Int -> Int ${callee}): Int ${caller} = take(q);`
        + tail;
      hints += checked(source, `q: Int -> Int ${callee})`,
        row => `q: Int -> Int with ${row})`, true);
    }
  }
  assert.ok(hints > 30, `hints printed: ${hints}`);
});

test('a callback used outside and inside a with is given no written '
  + 'hint', () => {
  const inside = 'with handler M { m() => 1 } { q(y) }';
  const forms = [`let y = q(x); ${inside}`,
    `let y = with handler M { m() => 1 } { q(x) }; q(y)`,
    `let y = q(x); let z = q(y); ${inside}`];
  let hints = 0;
  let unwritten = 0;
  for (const callee of calleeRows) for (const caller of callerRows) {
    for (const form of forms) {
      const type = `Int -> Int ${callee}`;
      const source = effects + `fn a(q: ${type}, x: Int): Int ${caller} = `
        + `{ ${form} };` + tail;
      hints += checked(source, `q: ${type},`,
        row => `q: Int -> Int with ${row},`, false);
      unwritten += /\(FX018\)$/.test(failure(source) ?? '') ? 1 : 0;
    }
  }
  assert.ok(unwritten > 20, `FX018 texts without a hint: ${unwritten}`);
  assert.equal(hints, 0, 'a used-twice callback gets no written hint');
});
