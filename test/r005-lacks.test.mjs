import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRejectedAt, checkedPoly } from './phases.mjs';
import { spanAt } from './support.mjs';

// R005 Task 2: a written `where r lacks { … }` joins what r lacks, for the
// body and at each use, keeping where it was written (design §2, §5). A
// call whose argument puts a lacked label in the row is E_TYPE `admin is
// not allowed here: r lacks { admin }` at the argument, noted `required
// here` at the label in the clause, however late the row is filled.
const granted = 'fn granted(p: { ...r }): Bool where r lacks { admin } = '
  + '{ ...p, admin: true }.admin;';
// `admin` in granted's clause is its first occurrence in every source.
const program = (body, more = '') =>
  `${granted}${more} fn main(): Int = { ${body}; 0 };`;
const message = 'admin is not allowed here: r lacks { admin }';

const violated = (source, at, nth = 0, clause = 0, text = message) => {
  const found = checkRejectedAt(source, 'E_TYPE', at, nth);
  assert.equal(found.message, text);
  assert.deepEqual(found.related,
    [{ span: spanAt(source, 'admin', clause), message: 'required here' }]);
};

test('a body extending by its lacked label is accepted', () => {
  checkedPoly(program('let b = granted({ name: 1 })'));
});

test('a direct call with the label is refused at the argument', () => {
  const source = program('let b = granted({ name: 1, admin: false })');
  violated(source, '{ name: 1, admin: false }');
});

test('the label wherever it is written in the argument', () => {
  const source = program('let b = granted({ admin: false, name: 1 })');
  violated(source, '{ admin: false, name: 1 }');
});

test('a function reference applied later is refused there', () => {
  const source = program('let g = granted; let b = g({ admin: true })');
  violated(source, '{ admin: true }');
});

test('a lambda passing its parameter on is refused when applied', () => {
  const source = program('let h = fn(x) => granted(x); '
    + 'let b = h({ admin: true })');
  violated(source, '{ admin: true }');
});

const twice = 'fn twice(n: Int, p: { ...r }): Bool where r lacks { admin }'
  + ' = { ...p, admin: n == 1 }.admin;';

test('a partial application applied later is refused there', () => {
  const source = `${twice} fn main(): Int = { let g = twice(1); `
    + 'let b = g({ admin: true }); 0 };';
  violated(source, '{ admin: true }');
  checkedPoly(`${twice} fn main(): Int = { let g = twice(1); `
    + 'let b = g({ name: true }); 0 };');
});

test('a piped argument is refused at the argument', () => {
  violated(program('let b = { admin: true } |> granted'), '{ admin: true }');
});

const wrapper = clause =>
  ` fn wrap(q: { ...s }): Bool ${clause}= granted(q);`;

test('a wrapper with the clause passes its row on', () => {
  checkedPoly(program('let b = wrap({ name: 1 })',
    wrapper('where s lacks { admin } ')));
});

// The outer call instantiates the wrapper's clause, not granted's: inside
// the wrapper, granted's lack was met by the wrapper's own rigid `s`.
test('a wrapper with the clause is refused at the outer argument', () => {
  const source = program('let b = wrap({ admin: true })',
    wrapper('where s lacks { admin } '));
  violated(source, '{ admin: true }', 0, 3,
    'admin is not allowed here: s lacks { admin }');
});

test('a wrapper without the clause is refused inside the wrapper', () => {
  const source = program('let b = wrap({ name: 1 })', wrapper(''));
  violated(source, 'q', 1, 0);
});

test('only the violated label is named', () => {
  const source = 'fn both(p: { ...r }): Int where r lacks { owner, admin }'
    + ' = 0; fn main(): Int = both({ admin: 1 });';
  violated(source, '{ admin: 1 }', 0, 0);
});
