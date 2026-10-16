import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRejectedAt, resolved } from './phases.mjs';
import { rejectedAt, spanAt } from './support.mjs';

// R005 Task 1: extension, removal, rest binders and written lacks through
// Resolve (design §1-§3, §5). Names are chosen so that no text occurs
// inside another.
const main = ' fn main(): Int = 0;';
const arms = (...found) =>
  `fn f(x: Int): Int = match x { ${found.join(', ')} };${main}`;
const arm = (pattern, result = '1') => `${pattern} => ${result}`;
const bodyOf = source => resolved(source).functions[0].body;
const named = found => found.constructor.name;

test('a literal with one spread resolves to an extension', () => {
  const body = bodyOf(`fn f(p: Int): Int = { ...p, fa: 1 }.fa;${main}`);
  assert.equal(named(body), 'FieldAccess');
  assert.equal(named(body.value1), 'RecordExtension');
  assert.deepEqual(body.value1.value1.map(named), ['Spreading', 'Given']);
});

test('a literal without a spread is still a literal', () => {
  const body = bodyOf(`fn f(): Int = { fa: 1 }.fa;${main}`);
  assert.equal(named(body.value1), 'RecordLiteral');
});

test('a removal resolves its receiver and keeps its labels', () => {
  const body = bodyOf(`fn f(p: Int): Int = p without { fa, fb };${main}`);
  assert.equal(named(body), 'RecordRemoval');
  assert.deepEqual(body.value2.map(label => label.name), ['fa', 'fb']);
});

test('a second spread is E_TYPE at the second spread', () => {
  const source = `fn f(p: Int, q: Int): Int = { ...p, fa: 1, ...q };${main}`;
  const found = resolveRejectedAt(source, 'E_TYPE', '...q');
  assert.equal(found.message, 'A record literal accepts at most one spread');
});

test('with three spreads the second is the one reported', () => {
  const source = `fn f(p: Int): Int = { ...p, ...p, ...p };${main}`;
  resolveRejectedAt(source, 'E_TYPE', '...p', 1);
});

test('a repeated label in a literal is Duplicate field at the second', () => {
  const source = `fn f(p: Int): Int = { ...p, fa: 1, fa: 2 };${main}`;
  const found = resolveRejectedAt(source, 'E_DUPLICATE', 'fa', 1);
  assert.equal(found.message, 'Duplicate field fa');
  assert.deepEqual(found.related, [{ span: spanAt(source, 'fa'),
    message: 'first written here' }]);
});

test('a repeated label in a removal is Duplicate field at the second', () => {
  const source = `fn f(p: Int): Int = p without { fa, fb, fa };${main}`;
  const found = resolveRejectedAt(source, 'E_DUPLICATE', 'fa', 1);
  assert.equal(found.message, 'Duplicate field fa');
  assert.deepEqual(found.related, [{ span: spanAt(source, 'fa'),
    message: 'first written here' }]);
});

test('a repeated label in a lacks list is Duplicate field', () => {
  const source = `fn f(p: { ...r }): Int where r lacks { fa, fa } = 1;${main}`;
  const found = resolveRejectedAt(source, 'E_DUPLICATE', 'fa', 1);
  assert.equal(found.message, 'Duplicate field fa');
  assert.deepEqual(found.related, [{ span: spanAt(source, 'fa'),
    message: 'first written here' }]);
});

test('rest names resolve: bare, named and none stay distinct', () => {
  const kind = pattern => named(
    resolved(arms(arm(pattern))).functions[0].body.value2[0].pattern.value2);
  assert.equal(kind('{ fa }'), 'NoRest');
  assert.equal(kind('{ fa, ... }'), 'IgnoredRest');
  assert.equal(kind('{ fa, ...rr }'), 'NamedRest');
});

test('a rest name repeating a field binder is a duplicate binder', () => {
  const found = resolveRejectedAt(arms(arm('{ fa, ...fa }')),
    'E_DUPLICATE', 'fa');
  assert.equal(found.message, 'Duplicate binder fa');
  resolveRejectedAt(arms(arm('{ fa: va, ...va }')), 'E_DUPLICATE', 'va');
});

test('a rest binder is in scope in its arm only', () => {
  resolved(arms(arm('{ fa, ...rr }', 'rr')));
  const source = arms(arm('{ fa, ...rr }', 'rr'), arm('_', 'rr'));
  const found = resolveRejectedAt(source, 'E_UNBOUND', 'rr', 2);
  assert.equal(found.message, 'Unbound local rr');
});

test('a rest binder takes the next LocalId after the field binders', () => {
  const source = arms(arm('{ fa, fb, ...rr }', 'rr'));
  const { pattern } = bodyOf(source).value2[0];
  // LocalId is a newtype: an Int at run time.
  const [first, second] = pattern.value1.map(f => f.pattern.value1);
  assert.equal(first + 1, second);
  assert.equal(second + 1, pattern.value2.value0);
});

const tail = clause => `fn f(p: { ...r }): Int ${clause} = 1;${main}`;

test('a constraint on an unknown name is Unbound type variable', () => {
  const found = resolveRejectedAt(tail('where zz lacks { fa }'), 'E_UNBOUND',
    'zz');
  assert.equal(found.message, 'Unbound type variable zz');
});

test('a constraint on an effect row says so, at the variable', () => {
  const source = 'fn f(g: (Unit) -> Unit with ...ee): Int '
    + `where ee lacks { fa } = 1;${main}`;
  const found = resolveRejectedAt(source, 'E_TYPE', 'ee', 1);
  assert.equal(found.message, 'ee is an effect row, not a record row');
});

test('a constraint on a type variable says so, at the variable', () => {
  const source = `fn f(x: tv): tv where tv lacks { fa } = x;${main}`;
  const found = resolveRejectedAt(source, 'E_TYPE', 'tv', 2);
  assert.equal(found.message, 'tv is a type, not a record row');
});

test('a well-formed constraint resolves and is kept with its spans', () => {
  const source = tail('where r lacks { fa, fb }');
  const [found] = resolved(source).functions[0].constraints;
  assert.deepEqual(found.value0.labels.map(l => l.name), ['fa', 'fb']);
  assert.deepEqual(found.value0.labels[1].span, spanAt(source, 'fb'));
  assert.equal(found.value0.variable, 0);
  assert.equal(found.value0.written.name, 'r');
});

// A type written in a body may put beside a signature's record tail only
// labels the signature lacks (R001 final review, C1). A written lack
// counts, so the clause admits the label; without it, `r may already
// have field fa`.
const lambda = 'fn(q: { fa: Int, ...r }) => q';
const body = clause => `fn g(p: { ...r }): Int ${clause} = `
  + `{ let h = ${lambda}; 0 };${main}`;

test('a body type writing a lacked label is accepted with the clause', () => {
  resolved(body('where r lacks { fa }'));
  resolved(body('where r lacks { fb, fa }'));
});

test('without the clause the same body type is refused', () => {
  const source = body('');
  const found = resolveRejectedAt(source, 'E_TYPE', 'fa');
  assert.equal(found.message, 'r may already have field fa');
  assert.deepEqual(found.related, [{ span: spanAt(source, '...r'),
    message: 'r is introduced here' }]);
});

test('a clause for another label does not admit it', () => {
  const found = resolveRejectedAt(body('where r lacks { fb }'), 'E_TYPE',
    'fa');
  assert.equal(found.message, 'r may already have field fa');
});

// Task 2 replaces these placeholders with checking (the spread, `without`
// and a rest binder's type); until then they reach `Internal` errors.
const placeholder = 'R005 placeholder: record extension and removal are '
  + 'checked in Task 2';

test('an extension reaches the checking placeholder', () => {
  const source = `fn f(p: Int): Int = { ...p, fa: 1 }.fa;${main}`;
  const found = rejectedAt(source, 'E_INTERNAL', '{ ...p, fa: 1 }');
  assert.equal(found.message, placeholder);
});

test('a removal reaches the checking placeholder', () => {
  const source = `fn f(p: Int): Int = p without { fa };${main}`;
  const found = rejectedAt(source, 'E_INTERNAL', 'p without { fa }');
  assert.equal(found.message, placeholder);
});

test('a named rest reaches the checking placeholder', () => {
  const found = rejectedAt(arms(arm('{ fa, ...rr }')), 'E_INTERNAL',
    '{ fa, ...rr }');
  assert.equal(found.message,
    'R005 placeholder: rest binders are checked in Task 2');
});

test('bare and no rest are checked as before', () => {
  const found = rejectedAt(arms(arm('{ fa, ... }')), 'E_TYPE',
    '{ fa, ... }');
  assert.equal(found.message, 'Expected a record, found Int');
});
