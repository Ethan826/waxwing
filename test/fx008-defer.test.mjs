import test from 'node:test';
import assert from 'node:assert/strict';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';
import { rejected } from './support.mjs';
import {
  a1, a10, a3c, a4, a6, a8, a9, ownRow, r5,
  ambientCallback, boxPlainParameter, clauseDeferFailing, deferLog,
  failFreeLiteral, forwardingIntoFailing, nofailCall, probe, rigidVariable
} from './fx008-defer-programs.mjs';

// FX008 Task 9: the mark check makes `defer` sound (design §3.4). Notes are
// Task 10's, so none are asserted here.
const effect = (source, message, at) =>
  expectDiagnostic(source, { code: 'E_EFFECT', message, at, notes: [] });

test('the pinned program is rejected', () => {
  effect(probe('facts/lexical'), deferLog, ['defer log(1)']);
});

test('a fail-free handler type refuses a failing literal', () => {
  effect(failFreeLiteral,
    'This handler may fail here: its clause for log fails with E',
    ['handler Log { log(n) => fail(E) }']);
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
    ['caller(): Unit with Log = work()', 'work()']);
});

test('a forwarding clause into a failing outer handler', () => {
  effect(forwardingIntoFailing, deferLog, ['defer log(1)']);
});

test('a clause calling an ambient callback', () => {
  effect(ambientCallback, deferLog, ['defer log(1)']);
});

test('a rigid mark variable cannot be assumed fail-free', () => {
  effect(rigidVariable,
    'defer must not fail, but it performs nofail(k) Log, whose handler is '
    + "fail-free only when the caller's is", ['defer log(1)']);
});

test('a defer inside a clause follows the outer frame', () => {
  effect(clauseDeferFailing, deferLog, ['defer log(n + 1)']);
});

test('L4: l4b is rejected', () => {
  effect(probe('rev6/l4b'), deferLog, ['defer log(0)']);
});

test('L4: merge2 is rejected', () => {
  effect(probe('rev7/merge2'),
    'defer must not fail, but it performs Tick, whose handler may fail',
    ['defer tick()']);
});

test('a handler in a constructor field keeps its mark', () => {
  const diagnostic = rejected(boxPlainParameter, 'E_TYPE');
  assert.equal(diagnostic.message,
    'Expected Handler(nofail Log), found Handler(Log)');
});

// Task 9 review C1: a handler passed through a generic function and
// installed from its result keeps the clauses it will run in the caller's
// context. Each was accepted by 1649218 and died with `fail(E): E`.
const passedThrough = {
  a1, a4, a6, a8, a9, a3c, a10, r5, 'a result whose own row holds the tail': ownRow
};
for (const [name, source] of Object.entries(passedThrough)) {
  test(`a handler passed through a generic function: ${name}`, () => {
    effect(source, deferLog, ['defer log(1)']);
  });
}
