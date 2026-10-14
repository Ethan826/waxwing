// Diagnostic regression probes, delegated to by test/regression.mjs. Each
// compiles with the compiler under test only (the context's `compile`).
import assert from 'node:assert/strict';

const expectsDiagnostic = (context, source, code, message, label) => {
  const { compile, Left, wire } = context;
  const result = compile(source);
  assert.ok(result instanceof Left, `${label}: program was accepted`);
  const found = wire(result.value0);
  assert.equal(found.code, code, `${label}: wrong diagnostic code`);
  assert.equal(found.message, message, `${label}: wrong diagnostic message`);
};

// Both payloads are unsolved: the walk into the outer Fail's payload must
// reach the inner one first, else the outer Fail's span is reported.
const nestedFail = context => {
  const { compile, wire } = context;
  const source = 'fn hole(u: Unit): a = hole(u); fn h(k: b): a = hole(()); '
    + 'fn f(): Int with Fail(Int) = fail(h(fn(e) => fail(e))); '
    + 'fn main(): Int = 0;';
  expectsDiagnostic(context, source, 'E_TYPE',
    'Fail needs a concrete error family', 'nested Fail payload');
  const found = wire(compile(source).value0);
  assert.equal(found.span.start.offset, source.indexOf('fail(e)'),
    'nested Fail payload: wrong span');
};

const duplicateBinder = context => expectsDiagnostic(
  context,
  'effect Add { fn add(x: Int, y: Int): Int; }; '
    + 'fn main(): Int = with handler Add { add(x, x) => x } { add(1, 2) };',
  'E_DUPLICATE', 'Duplicate parameter x', 'duplicate handler binder'
);

const duplicateRowTail = context => expectsDiagnostic(
  context,
  'fn f(): Int with ...e + ...r = 0; fn main(): Int = 0;',
  'E_SYNTAX', 'Only one row tail is allowed', 'duplicate row tail'
);

const constructorFunction = context => expectsDiagnostic(
  context,
  'fn F(): Int = 0; type T = F; fn main(): Int = 0;',
  'E_DUPLICATE', 'Duplicate function F', 'constructor and function collision'
);

const duplicateEffect = context => expectsDiagnostic(
  context,
  'effect Clock { fn now(): Int; }; effect Clock { fn later(): Int; }; '
    + 'fn main(): Int = 0;',
  'E_DUPLICATE', 'Duplicate effect Clock', 'duplicate effect'
);

const duplicateOperation = context => expectsDiagnostic(
  context,
  'effect Clock { fn now(): Int; fn now(): Int; }; fn main(): Int = 0;',
  'E_DUPLICATE', 'Duplicate operation now', 'duplicate operation'
);

const duplicateEffectParameter = context => expectsDiagnostic(
  context,
  'effect State(a, a) { fn get(): a; }; fn main(): Int = 0;',
  'E_DUPLICATE', 'Duplicate type parameter a', 'duplicate effect parameter'
);

const duplicateOperationParameter = context => expectsDiagnostic(
  context,
  'effect State { fn put(a: Int, a: Bool): Unit; }; '
    + 'fn main(): Int = 0;',
  'E_DUPLICATE', 'Duplicate parameter a', 'duplicate operation parameter'
);

const deferredFailEffect = context => expectsDiagnostic(
  context,
  'type DbError = DbError; fn f(): Int with pure = { '
    + 'let raise = fn(error) => fail(error); raise(DbError) }; '
    + 'fn main(): Int = 0;',
  'E_EFFECT', 'f performs Fail(DbError), which its signature does not allow',
  'deferred Fail capability'
);

export const diagProbes = {
  'nested-fail': nestedFail,
  'duplicate-binder': duplicateBinder,
  'duplicate-row-tail': duplicateRowTail,
  'duplicate-effect': duplicateEffect,
  'constructor-function': constructorFunction,
  'duplicate-operation': duplicateOperation,
  'duplicate-effect-parameter': duplicateEffectParameter,
  'duplicate-operation-parameter': duplicateOperationParameter,
  'deferred-fail-effect': deferredFailEffect,
};
