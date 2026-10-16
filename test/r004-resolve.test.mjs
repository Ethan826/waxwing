import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRejectedAt, resolved } from './phases.mjs';
import { rejectedAt, spanAt } from './support.mjs';

// R004 Task 1: record patterns through Resolve (design §1, §5). Names are
// chosen so that no text occurs inside another.
const main = ' fn main(): Int = 0;';
const types = 'type P = P(Int, Int); ';
const arms = (...found) =>
  `fn f(x: Int): Int = match x { ${found.join(', ')} };${main}`;
const arm = (pattern, result = '1') => `${pattern} => ${result}`;

test('a duplicate label is Duplicate field at the second, noted at the first',
  () => {
    const source = arms(arm('{ fa: va, fa: vb }'));
    const found = resolveRejectedAt(source, 'E_DUPLICATE', 'fa', 1);
    assert.equal(found.message, 'Duplicate field fa');
    assert.deepEqual(found.related, [{ span: spanAt(source, 'fa'),
      message: 'first written here' }]);
  });

test('a duplicate label is reported before the fields are resolved', () => {
  const source = arms(arm('{ fa: Missing, fa: vb }'));
  resolveRejectedAt(source, 'E_DUPLICATE', 'fa', 1);
});

test('a binder repeated across two fields is a duplicate binder', () => {
  const found = resolveRejectedAt(arms(arm('{ fa: va, fb: va }')),
    'E_DUPLICATE', 'va');
  assert.equal(found.message, 'Duplicate binder va');
});

test('a pun repeating another field binder is a duplicate binder', () => {
  const found = resolveRejectedAt(arms(arm('{ fa, fb: fa }')),
    'E_DUPLICATE', 'fa');
  assert.equal(found.message, 'Duplicate binder fa');
});

test('a binder in a nested constructor is seen too', () => {
  const source = types + arms(arm('{ fa: P(va, _), fb: va }'));
  resolveRejectedAt(source, 'E_DUPLICATE', 'va');
});

test('a field binder is not visible in another arm', () => {
  const source = arms(arm('{ fa: va }', 'va'), arm('_', 'va'));
  const found = resolveRejectedAt(source, 'E_UNBOUND', 'va', 2);
  assert.equal(found.message, 'Unbound local va');
});

test('a well-formed record pattern resolves', () => {
  resolved(arms(arm('{ fa: va, fb: true, ... }', 'va')));
});

// Documents the Task 1 placeholder (Check/Match patternAgainst); Task 2
// replaces this test with real checking.
test('a record pattern stops at the check placeholder', () => {
  const source = arms(arm('{ fa: va }'));
  const found = rejectedAt(source, 'E_INTERNAL', '{ fa: va }');
  assert.equal(found.message,
    'R004 placeholder: record patterns are checked in Task 2');
});
