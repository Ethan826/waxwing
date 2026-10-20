import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedPoly, resolved } from './phases.mjs';
import { checkWired, offsets } from './r005b-support.mjs';

// R005 Tranche B Task 7 (plan §7; design draft 3 §1.4): a literal of
// several spreads. Each spread's row joins the result's tails and its
// unknown tails become predicates (plan §2.1); every two items are
// required disjoint for the reason `Spread`, so an overlap is D2' (the
// existing `Duplicate field a`): at the later item when the items' types
// already show it, at the expression that completes it otherwise, noted
// at both items. The result's type is read back through a missing
// field's text, which prints it.
const merge = 'fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }\n'
  + '  where r disjoint s = { ...a, ...b };\n';
// Sources span lines, so spans are compared as offsets.
const spanOf = span => [span.start.offset, span.end.offset];
const rejects = (source, code, text, nth, message) => {
  const found = checkWired(source);
  assert.notEqual(found, null, `accepted: ${source}`);
  assert.deepEqual([found.code, found.message, ...spanOf(found.span)],
    [code, message, ...offsets(source, { text, nth })]);
  return found;
};
const typeIs = (body, type) => rejects(`${merge}fn main(): Int = ${body};`,
  'E_TYPE', 'zz', 0, `zz is not a field of ${type}`);
const notes = found => found.related.map(note => note.message);
// Each note's message and span, against `[message, text, nth]`.
const notedAt = (found, source, expected) => assert.deepEqual(
  found.related.map(note => [note.message, ...spanOf(note.span)]),
  expected.map(([message, text, nth]) =>
    [message, ...offsets(source, { text, nth })]));

test('merge is checked: its literal joins both tails', () => {
  checkedPoly(`${merge}fn main(): Int = 0;`);
  typeIs('merge({ x: 1 }, { y: 2 }).zz', '{ x: Int, y: Int }');
});

test('a lambda of two spreads is typed once its parts are known', () => {
  typeIs('{ let f = fn(p, q) => { ...p, ...q }; f({ x: 1 }, { y: 2 }).zz }',
    '{ x: Int, y: Int }');
});

test('a field between two spreads joins the result', () => {
  typeIs('{ let f = fn(p, q) => { ...p, x: 1, ...q }; '
    + 'f({ y: 2 }, { z: 3 }).zz }', '{ x: Int, y: Int, z: Int }');
});

test('three spreads, generic and through a lambda', () => {
  const merge3 = 'fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): '
    + '{ ...r, ...s, ...t } = { ...a, ...b, ...c };\n';
  checkedPoly(`${merge3}fn main(): Int = 0;`);
  rejects(`${merge3}fn main(): Int = merge3({ x: 1 }, { y: 2 }, { z: 3 })`
    + '.zz;', 'E_TYPE', 'zz', 0,
  'zz is not a field of { x: Int, y: Int, z: Int }');
  typeIs('{ let f = fn(p, q, w) => { ...p, ...q, ...w }; '
    + 'f({ x: 1 }, { y: 2 }, { z: 3 }).zz }', '{ x: Int, y: Int, z: Int }');
});

test('a spread of a merge result', () => {
  checkedPoly(`${merge}fn m3(a: { ...r }, b: { ...s }, c: { ...t }): `
    + '{ ...r, ...s, ...t } = { ...merge(a, b), ...c };\n'
    + 'fn main(): Int = 0;');
  typeIs('{ ...merge({ x: 1 }, { y: 2 }), ...merge({ z: 3 }, { w: 4 }) }.zz',
    '{ w: Int, x: Int, y: Int, z: Int }');
});

// The literal's unknown tails are a predicate's parts: nothing decides an
// unused lambda's, so the body ends Unresolved (D4, no constant; R1's
// lambda parameter names; R9's lambda hint), at the lambda.
test('a literal over unknown tails makes a predicate', () => {
  const found = rejects('fn main(): Int = { let f = fn(p, q) => '
    + '{ ...p, ...q }; 0 };', 'E_TYPE', 'fn(p, q) => { ...p, ...q }', 0,
  'Cannot tell what p and q hold; annotate this lambda\'s parameters');
  assert.deepEqual(notes(found), []);
});

test('D2\' found at once: the later item, noted at the earlier', () => {
  const two = 'fn main(): Int = { ...{ a: 1 }, ...{ a: 2 } }.a;';
  notedAt(rejects(two, 'E_DUPLICATE', '...{ a: 2 }', 0, 'Duplicate field a'),
    two, [['first written here', '...{ a: 1 }', 0]]);
  const field = 'fn main(): Int = { ...{ a: 1 }, a: 2, ...{ b: 3 } }.a;';
  notedAt(rejects(field, 'E_DUPLICATE', 'a', 2, 'Duplicate field a'), field,
    [['first written here', '...{ a: 1 }', 0]]);
});

// Late: one unification binds both parts after the literal was checked.
// Through two arguments of one call the case that solves the predicate
// between them states the second part's lack as `Implied` (a row the
// checker made), which the approved precedence prefers to `Spread`, so
// that form keeps Tranche A's shape text (docs/findings.md, Task 7).
test('D2\' found late: the completing expression, noted at both items',
  () => {
    const source = 'fn g(k: ({ a: Int }, { a: Int }) -> Int): Int = 0;\n'
      + 'fn main(): Int = g(fn(p, q) => { let m = { ...p, ...q }; 0 });';
    notedAt(rejects(source, 'E_DUPLICATE',
      'fn(p, q) => { let m = { ...p, ...q }; 0 }', 0, 'Duplicate field a'),
    source, [['first written here', '...p', 0],
      ['written again here', '...q', 0]]);
    const fields = 'fn main(): Int = { let f = fn(w) => { ...w.l, ...w.r }; '
      + 'f({ l: { a: 1 }, r: { a: 2 } }).a };';
    notedAt(rejects(fields, 'E_DUPLICATE', '{ l: { a: 1 }, r: { a: 2 } }', 0,
      'Duplicate field a'), fields, [['first written here', '...w.l', 0],
      ['written again here', '...w.r', 0]]);
    const calls = 'fn main(): Int = { let f = fn(p, q) => { ...p, ...q }; '
      + 'f({ a: 1 }, { a: 2 }).a };';
    notedAt(rejects(calls, 'E_TYPE', '{ a: 2 }', 0,
      'Expected { ..._ }, found { a: Int }'), calls, []);
  });

// The rigid forms keep their approved texts, at the later item, with no
// note for a literal's reason (D3, D3'), D3'' at the field.
test('rigid spreads: D3, D3\' and D3\'\'', () => {
  rejects('fn f(a: { ...r }, b: { ...s }): Int = { let c = { ...a, ...b }; '
    + '0 };\nfn main(): Int = 0;', 'E_TYPE', '...b', 0,
  'r and s are not known to be disjoint; require r disjoint s in the '
    + 'signature');
  rejects('fn f(p: { ...r }): Int = { let c = { ...p, ...p }; 0 };\n'
    + 'fn main(): Int = 0;', 'E_TYPE', '...p', 1,
  'r is in both records and may have fields');
  const mayHave = 'fn f(a: { ...r }, b: { ...s }): Int where r disjoint s '
    + '= { let c = { ...a, x: 1, ...b }; 0 };\nfn main(): Int = 0;';
  notedAt(rejects(mayHave, 'E_TYPE', 'x', 0, 'r may already have field x'),
    mayHave, [['r is introduced here', '...r', 0]]);
});

// The sources Tranche A refused with `A record literal accepts at most
// one spread` (test/r005-resolve.test.mjs): resolved now, and judged by
// checking.
test('former second-spread sources resolve and are checked', () => {
  const two = 'fn f(p: Int, q: Int): Int = { ...p, fa: 1, ...q };\n'
    + 'fn main(): Int = 0;';
  const three = 'fn f(p: Int): Int = { ...p, ...p, ...p };\n'
    + 'fn main(): Int = 0;';
  resolved(two);
  resolved(three);
  rejects(two, 'E_TYPE', '...p', 0, 'Expected a record, found Int');
  rejects(three, 'E_TYPE', '...p', 0, 'Expected a record, found Int');
});
