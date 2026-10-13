import test from 'node:test';
import assert from 'node:assert/strict';
import { expectDiagnostic, length,
  maxCharacters } from './fx-diagnostics-support.mjs';
import { rejected } from './support.mjs';
import {
  a1, a10, a3c, a4, a6, a8, a9, ownRow, r5,
  ambientCallback, boxPlainParameter, clauseDeferFailing, deferLog,
  chain, failFreeLiteral, forwardingIntoFailing, nofailCall, probe,
    rigidVariable
} from './fx008-defer-programs.mjs';

// FX008 Tasks 9-10: the mark check makes `defer` sound (design §3.4), and
// its notes run from the demand back to the source. A note is
// [container, inner, message].
const effect = (source, message, at, notes) =>
  expectDiagnostic(source, { code: 'E_EFFECT', message, at, notes });
const handledHere = (container, label) => [container, container,
  `${label} is handled here`];
const forwarded = "this handler's clauses perform Log, whose handler may fail";
const chainWith =
  index => `with handler Log { log(n) => log(n) } { f${index - 1}(()) }`;
const clauseFails = (container, operation) => [container, container,
  `its clause for ${operation} fails with E`];
const allows = (container, name, label, inner = container) => [container, inner,
  `the signature of ${name} allows a failing ${label} handler; write with `
  + `nofail ${label}`];
const lexicalWith = 'with handler Log { log(n) => fail(E) } '
  + '{ defer log(1); print(2) }';

test('the pinned program is rejected', () => {
  effect(probe('facts/lexical'), deferLog, ['defer log(1)'], [
    handledHere(lexicalWith, 'Log'),
    clauseFails('log(n) => fail(E)', 'log')]);
});

test('hole, c1 and cross: the signature of work allows a failing Log', () => {
  for (const file of ['rev6/hole', 'design-review/c1', 'facts/cross']) {
    effect(probe(file), deferLog, ['defer log(1)'],
      [allows('with Log', 'work', 'Log')]);
  }
});

test('pending: the signature of work allows a failing Log', () => {
  effect(probe('facts/pending'), deferLog, ['defer log(1)'],
    [allows('with Log + Fail(F)', 'work', 'Log')]);
});

test('q1: run is written with a plain Log', () => {
  effect(probe('design-review/q1'), deferLog, ['defer log(0)'],
    [allows('Unit with Log + ...e', 'run', 'Log', 'with Log + ...e')]);
});

test('a fail-free handler type refuses a failing literal', () => {
  effect(failFreeLiteral,
    'This handler may fail here: its clause for log fails with E',
    ['handler Log { log(n) => fail(E) }'],
    [clauseFails('log(n) => fail(E)', 'log')]);
});

test("mk returning Handler(nofail Log) keeps today's row error", () => {
  const source = probe('design-review/q2').replace('Handler(Log)',
    'Handler(nofail Log)');
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: 'This function must be pure, but it performs Fail(E)',
    at: ['handler Log { log(n) => fail(E) }'],
    // The note's span is today's: it stops before the closing parenthesis.
    notes: [['handler Log { log(n) => fail(E) }', 'fail(E',
      'Fail(E) is raised here']]
  });
});

test('a nofail call under a plain signature', () => {
  effect(nofailCall, 'Expected nofail Log, found Log',
    ['caller(): Unit with Log = work()', 'work()'],
    [allows('with Log', 'caller', 'Log')]);
});

test('a forwarding clause into a failing outer handler', () => {
  const outer = 'with handler Log { log(n) => fail(E) } { with handler Log '
    + '{ log(n) => log(n + 1) } { defer log(1); () } }';
  effect(forwardingIntoFailing, deferLog, ['defer log(1)'], [
    ['with handler Log { log(n) => log(n + 1) } { defer log(1); () }',
      'with handler Log { log(n) => log(n + 1) } { defer log(1); () }',
      "this handler's clauses perform Log, whose handler may fail"],
    handledHere(outer, 'Log'), clauseFails('log(n) => fail(E)', 'log')]);
});

test('a clause calling an ambient callback', () => {
  effect(ambientCallback, deferLog, ['defer log(1)'], [[
    'with handler Log { log(n) => cb(()) } { defer log(1); () }',
    'with handler Log { log(n) => cb(()) } { defer log(1); () }',
    "this handler's clauses may perform any effect of ..."]]);
});

test('a rigid mark variable cannot be assumed fail-free', () => {
  effect(rigidVariable,
    'defer must not fail, but it performs nofail(k) Log, whose handler is '
    + "fail-free only when the caller's is", ['defer log(1)'], [[
      'with nofail(k) Log', 'with nofail(k) Log',
      "nofail(k) Log is fail-free only when the caller's handler is"]]);
});

test('a defer inside a clause follows the outer frame', () => {
  const outer = 'with handler Log { log(n) => fail(E) } { with handler Log '
    + '{ log(n) => { defer log(n + 1); () } } { log(1) } }';
  effect(clauseDeferFailing, deferLog, ['defer log(n + 1)'],
    [handledHere(outer, 'Log'), clauseFails('log(n) => fail(E)', 'log')]);
});

test('L4: l4b is rejected', () => {
  effect(probe('rev6/l4b'), deferLog, ['defer log(0)'], [
    handledHere('with handler Log { log(n) => fail(E) } { k(()) }', 'Log'),
    clauseFails('log(n) => fail(E)', 'log')]);
});

test('L4: merge2 is rejected', () => {
  effect(probe('rev7/merge2'),
    'defer must not fail, but it performs Tick, whose handler may fail',
    ['defer tick()'], [
      handledHere('with handler Tick { tick() => fail(E) } { b(()) }', 'Tick'),
      ['tick() => fail(E)', 'tick() => fail(E)',
        'its clause for tick fails with E']]);
});

test('a handler in a constructor field keeps its mark', () => {
  const diagnostic = rejected(boxPlainParameter, 'E_TYPE');
  assert.equal(diagnostic.message,
    'Expected Handler(nofail Log), found Handler(Log)');
});

// Task 9 review C1: a handler passed through a generic function and
// installed from its result keeps the clauses it will run in the caller's
// context. Each was accepted by 1649218 and died with `fail(E): E`.
const tickOuter = 'with handler Tick { tick() => fail(E) } { run(handler '
  + 'Log { log(n) => tick() }) }';
const viaTick = installed => [
  [installed, installed,
    "this handler's clauses perform Tick, whose handler may fail"],
  handledHere(tickOuter, 'Tick'), clauseFails('tick() => fail(E)', 'tick')];
const rigidTail = installed => [[installed, installed,
  "this handler's clauses may perform any effect of ...e"]];
const withId = 'with id(x) { defer log(1); () }';
const passedThrough = {
  a1: [a1, viaTick(withId)],
  a4: [a4, viaTick(withId)],
  a6: [a6, [
    ['with id(x) { defer log(1); () }', 'with id(x) { defer log(1); () }',
      "this handler's clauses perform Log, whose handler may fail"],
    handledHere('with handler Log { log(n) => fail(E) } { with handler Tick '
      + '{ tick() => log(5) } { run(handler Log { log(n) => tick() }) } }',
    'Log'), clauseFails('log(n) => fail(E)', 'log')]],
  a8: [a8, viaTick('with later(x)(()) { defer log(1); () }')],
  a9: [a9, viaTick('with match boxed(x) { Box(h) => h } { defer log(1); () }')],
  a3c: [a3c, viaTick('with unbox(Box(x)) { defer log(1); () }')],
  a10: [a10, rigidTail('with id(y) { defer log(1); () }')],
  r5: [r5, rigidTail('with h { defer log(1); () }')],
  'a result whose own row holds the tail': [ownRow, [
    ...viaTick('with mk() { defer log(1); () }').slice(0, 1),
    handledHere('with handler Tick { tick() => fail(E) } { with handler Get'
      + '(Handler(nofail Log with Tick + Fail(E) + Console)) { get() => '
      + 'handler Log { log(n) => tick() } } { with mk() { defer log(1); () } ' +
        '} }',
    'Tick'), clauseFails('tick() => fail(E)', 'tick')]]
};
for (const [name, [source, notes]] of Object.entries(passedThrough)) {
  test(`a handler passed through a generic function: ${name}`, () => {
    effect(source, deferLog, ['defer log(1)'], notes);
  });
}

test('a path with repeated edges has no repeated notes', () => {
  const found = expectDiagnostic(chain(3), {
    code: 'E_EFFECT', message: deferLog, at: ['defer log(0)'],
    notes: [
      [chainWith(1), chainWith(1), forwarded],
      [chainWith(2), chainWith(2), forwarded],
      [chainWith(3), chainWith(3), forwarded],
      clauseFails('log(n) => fail(E)', 'log')]
  });
  const spans = found.related.map(note => note.span.start.offset);
  assert.equal(new Set(spans).size, found.related.length);
});

test('a 1,000-hop mark path is bounded', () => {
  const found = expectDiagnostic(chain(1000), {
    code: 'E_EFFECT', message: deferLog, at: ['defer log(0)'],
    notes: [
      [chainWith(1), chainWith(1), forwarded],
      [chainWith(2), chainWith(2), forwarded],
      [chainWith(3), chainWith(3), forwarded],
      clauseFails('log(n) => fail(E)', 'log')]
  });
  assert.ok(found.related.length <= 4);
  assert.ok(length(found) <= maxCharacters, `${length(found)} characters`);
});

// The user accepted this note on 2026-10-12 (FX008 branch review): ec1 (the
// argbind rejection) now blames the fail(E) itself, not the put call's value.
test('ec1: Unhandled Fail(E) names the raise, the handler and main', () => {
  const source = probe('witness/ec1');
  const main = source.slice(source.indexOf('fn main'),
    source.lastIndexOf('};') + 2);
  expectDiagnostic(source, {
    code: 'E_EFFECT', message: 'Unhandled Fail(E) in main',
    at: ['with h { log(1) }'],
    notes: [
      ['put(fn(n: Int) => fail(E))', 'fail(E', 'Fail(E) is raised here'],
      ['with h { log(1) }', 'with h { log(1) }', 'Log is handled here'],
      [main, main, 'main may perform only Console']]
  });
});
