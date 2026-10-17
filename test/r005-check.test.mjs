import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRejectedAt, checkedPoly } from './phases.mjs';
import { spanAt } from './support.mjs';

// R005 Task 2: checking the spread, `without`, rest binders and `{}`
// (design §1, §3, §4, §5). Written lacks are r005-lacks.test.mjs's.
const main = ' fn main(): Int = 0;';
const noted = (found, source, text, message, nth = 0) =>
  assert.deepEqual(found.related,
    [{ span: spanAt(source, text, nth), message }]);
const typeError = (source, text, message, nth = 0) => {
  const found = checkRejectedAt(source, 'E_TYPE', text, nth);
  assert.equal(found.message, message);
  return found;
};

test('a spread adding a known field: at the label, noted at the spread',
  () => {
    const source = 'fn f(p: { admin: Bool }): Bool = '
      + `{ ...p, admin: true }.admin;${main}`;
    const found = checkRejectedAt(source, 'E_DUPLICATE', 'admin', 1);
    assert.equal(found.message, 'Duplicate field admin');
    noted(found, source, '...p', 'first written here');
  });

test('the field written first: at the spread, noted at the label', () => {
  const source = 'fn f(p: { admin: Bool }): Bool = '
    + `{ admin: true, ...p }.admin;${main}`;
  const found = checkRejectedAt(source, 'E_DUPLICATE', '...p');
  assert.equal(found.message, 'Duplicate field admin');
  noted(found, source, 'admin', 'first written here', 1);
});

test('the first overlapping label in written order is reported', () => {
  const source = 'fn f(p: { aa: Int, bb: Int }): Int = '
    + `{ ...p, cc: 1, bb: 2, aa: 3 }.cc;${main}`;
  checkRejectedAt(source, 'E_DUPLICATE', 'bb', 1);
});

const rigid = (literal, clause = '') =>
  `fn f(p: { ...r }): Bool ${clause}= ${literal}.admin;${main}`;

test('a rigid tail that may hold the label: at the label, both orders',
  () => {
    for (const literal of ['{ ...p, admin: true }', '{ admin: true, ...p }']) {
      const source = rigid(literal);
      const found = typeError(source, 'admin',
        'r may already have field admin');
      noted(found, source, '...r', 'r is introduced here');
    }
  });

test('a rigid tail that lacks the label by a clause extends', () => {
  checkedPoly(rigid('{ ...p, admin: true }', 'where r lacks { admin } '));
  checkedPoly(rigid('{ admin: true, ...p }', 'where r lacks { admin } '));
});

test('a rigid tail that lacks the label by its signature extends', () => {
  checkedPoly('fn f(p: { name: Text, ...r }): { name: Text, ...r } = '
    + `p;${main}`);
  checkedPoly('fn f(p: { name: Text, ...r }): Text = '
    + `{ ...(p without { name }), name: "a" }.name;${main}`);
});

test('a spread of a non-record is Expected a record, at the spread', () => {
  typeError(`fn f(p: Int): Bool = { ...p, admin: true }.admin;${main}`,
    '...p', 'Expected a record, found Int');
  typeError(`fn f(p: Int): Bool = { admin: true, ...p }.admin;${main}`,
    '...p', 'Expected a record, found Int');
});

test('the result holds the base fields and the new ones', () => {
  checkedPoly('fn f(p: { name: Text }): { admin: Bool, name: Text } = '
    + `{ ...p, admin: true };${main}`);
  checkedPoly('fn f(p: { name: Text, ...r }): { admin: Bool, name: Text, '
    + `...r } where r lacks { admin } = { admin: true, ...p };${main}`);
  checkedPoly(`fn f(p: { name: Text }): { name: Text } = { ...p };${main}`);
  typeError('fn f(p: { name: Text }): { name: Text } = '
    + `{ ...p, admin: true };${main}`, '{ ...p, admin: true }',
  'Expected { name: Text }, found { admin: Bool, name: Text }');
});

const lambda = (body, use) =>
  `fn main(): Int = { let g = fn(q) => ${body}; ${use} };`;

test('a hole base becomes an open record lacking the labels', () => {
  checkedPoly(lambda('{ ...q, admin: true }',
    'if g({ name: 1 }).admin then 1 else 0'));
  // ρ's lack is the literal's, not a clause's: the shape text (ADR 013).
  typeError(lambda('{ ...q, admin: true }', 'g({ admin: false }); 0'),
    '{ admin: false }', 'Expected { ..._ }, found { admin: Bool }');
  typeError(lambda('{ ...q, admin: true }', 'g(1); 0'), '1',
    'Expected { ..._ }, found Int');
});

test('a hole tail of a record base lacks the labels', () => {
  checkedPoly(lambda('{ let n = q.name; { ...q, admin: true } }',
    'g({ name: 1, age: 2 }).age'));
  checkRejectedAt(lambda('{ let n = q.name; { ...q, admin: true } }',
    'g({ name: 1, admin: true }); 0'), 'E_TYPE',
  '{ name: 1, admin: true }');
});

test('a removal leaves the remaining fields, closed or open', () => {
  checkedPoly('fn f(p: { name: Text, age: Int }): { age: Int } = '
    + `p without { name };${main}`);
  checkedPoly('fn f(p: { name: Text, age: Int, ...r }): { ...r } = '
    + `p without { name, age };${main}`);
});

test('removing every field gives {}', () => {
  checkedPoly(`fn f(p: { name: Text }): {} = p without { name };${main}`);
});

test('a removal of an unknown label is at the label', () => {
  const source = 'fn f(p: { name: Text, age: Int }): Int = '
    + `p without { name, zz };${main}`;
  typeError(source, 'zz', 'zz is not a field of { age: Int, name: Text }');
  typeError(`fn f(p: { ...r }): Int = p without { zz };${main}`, 'zz',
    'zz is not a field of { ...r }');
});

test('a removal from a non-record is at the receiver', () => {
  typeError(`fn f(pp: Int): Int = pp without { zz };${main}`, 'pp',
    'Expected a record, found Int', 1);
});

test('a hole receiver gains the labels and an open rest', () => {
  checkedPoly(lambda('q without { name }', 'g({ name: 1, age: 2 }).age'));
  checkRejectedAt(lambda('q without { name }', 'g({ age: 2 }).age'),
    'E_TYPE', '{ age: 2 }');
});

test('{} and Unit do not unify, either way', () => {
  typeError(`fn f(p: { name: Text }): Unit = p without { name };${main}`,
    'p without { name }', 'Expected Unit, found {}');
  typeError(`fn f(): {} = ();${main}`, '()', 'Expected {}, found Unit', 1);
});

const arms = (scrutinee, ty, arm) =>
  `fn f(p: ${scrutinee}): ${ty} = match p { ${arm} };${main}`;

test('a named rest has the closed remainder, used in the body', () => {
  checkedPoly(arms('{ name: Text, age: Int }', 'Int',
    '{ name, ...rest } => rest.age'));
  checkedPoly(arms('{ name: Text, age: Int }', '{ age: Int }',
    '{ name, ...rest } => rest'));
  typeError(arms('{ name: Text, age: Int }', 'Text',
    '{ name, ...rest } => rest.name'), 'name',
  'name is not a field of { age: Int }', 2);
});

test('a named rest keeps an open tail', () => {
  checkedPoly(arms('{ name: Text, ...r }', '{ ...r }',
    '{ name, ...rest } => rest'));
});

test('a named rest of every field is {}', () => {
  checkedPoly(arms('{ name: Text }', '{}', '{ name, ...rest } => rest'));
});

// The rest's type in the checked IR, found by its constructor.
const restTypes = found => {
  if (found === null || typeof found !== 'object') return [];
  const own = found.constructor?.name === 'NamedRest' ? [found.value1] : [];
  return own.concat(Object.values(found).flatMap(restTypes));
};
const holes = found => found !== null && typeof found === 'object'
  && (found.constructor?.name === 'Hole'
    || Object.values(found).some(holes));

test('a named rest against a hole is typed after settlement', () => {
  const program = checkedPoly(lambda('match q { { name, ...rest } => rest }',
    'g({ name: 1, age: 2 }).age'));
  const [ty] = restTypes(program);
  assert.equal(ty.constructor.name, 'TRecord');
  assert.deepEqual(ty.value0.fields.map(field => field.value0), ['age']);
  assert.equal(holes(ty), false);
});
