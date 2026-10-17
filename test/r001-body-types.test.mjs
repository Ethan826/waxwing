import test from 'node:test';
import assert from 'node:assert/strict';
import { Left, Right } from '../output/Data.Either/index.js';
import { Just } from '../output/Data.Maybe/index.js';
import { Tuple } from '../output/Data.Tuple/index.js';
import { TInt } from '../output/Domain.IR.Internal/index.js';
import { applicativeCopy, run }
  from '../output/Features.Specialize.Copy/index.js';
import { internLayout, noLayouts }
  from '../output/Features.Specialize.Layouts/index.js';
import { recordType } from '../output/Features.Specialize.Record/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { checked, rejected, runGo, spanAt } from './support.mjs';

// R001 final review C1: a type written in a body (a lambda's annotation,
// a handler's label, a `handle` clause's payload) may put beside a record
// row variable of the enclosing signature only labels the signature says
// it lacks, since the signature's caller may fill it with any other.
// Approved text (user, 2026-10-15): E_TYPE `r may already have field a`
// at the written label, note `r is introduced here` at the `...r` of the
// signature that introduces r.
const print = 'fn main(): Unit with Console = Console.print(';
const state = 'effect State(s) { fn get(): s; fn put(x: s): Unit; }; ';
const holder = 'type Holder(...r) = Holder({ x: Int, ...r }); ';

// The span of `text` where it follows `before` (that pair's nth time).
const after = (source, before, text, nth = 0) => {
  const start = spanAt(source, before + text, nth).start.offset
    + before.length;
  const position = offset => ({ offset, line: 1, column: offset + 1 });
  return { start: position(start), end: position(start + text.length) };
};

const mayHave = (source, label, at, introduced) => {
  const diagnostic = rejected(source, 'E_TYPE');
  assert.equal(diagnostic.message, `r may already have field ${label}`);
  assert.deepEqual(diagnostic.span, at);
  assert.deepEqual(diagnostic.related,
    [{ span: introduced, message: 'r is introduced here' }]);
};

test('a lambda annotation over a signature tail (l2)', () => {
  const source = 'fn g(p: { ...r }): Int = { let f = fn(q: { a: Int, '
    + `...r }) => q; 0 }; ${print}g({ a: true }));`;
  mayHave(source, 'a', after(source, 'q: { ', 'a'), spanAt(source, '...r'));
});

test('a field access no longer reads as a contradiction (l1)', () => {
  const source = 'fn g(p: { ...r }): Int = { let f = fn(q: { a: Int, '
    + `...r }) => q.a; 0 }; ${print}g({ a: 1 }));`;
  mayHave(source, 'a', after(source, 'q: { ', 'a'), spanAt(source, '...r'));
});

test('a signature tail lacking other labels (m4)', () => {
  const source = 'fn g(p: { b: Int, ...r }): Int = { let f = fn(q: { a: '
    + `Int, ...r }) => q; 0 }; ${print}g({ a: true, b: 1 }));`;
  mayHave(source, 'a', after(source, 'q: { ', 'a'), spanAt(source, '...r'));
});

test('a declared type\'s label, at the row argument (o2)', () => {
  const source = `${holder}fn g(p: { ...r }): Int = { let f = `
    + `fn(h: Holder(...r)) => h; 0 }; ${print}g({ x: true }));`;
  mayHave(source, 'x', after(source, 'h: Holder(', '...r'),
    spanAt(source, '...r', 2));
});

test('a handler\'s label argument (m1)', () => {
  const source = `${state}fn run(p: { ...r }): Int = with handler `
    + 'State({ n: Int, ...r }) { get() => crash("x"), put(x) => () } '
    + `{ 0 }; ${print}run({ n: true }));`;
  mayHave(source, 'n', after(source, 'State({ ', 'n'),
    spanAt(source, '...r'));
});

test('a handle clause\'s payload', () => {
  const source = 'fn g(p: { ...r }): Int = handle 1 '
    + '{ fail(e: { x: { a: Int, ...r } }) => 2 }; fn main(): Int = 0;';
  mayHave(source, 'a', after(source, '{ x: { ', 'a'), spanAt(source, '...r'));
});

test('the note is at the first ...r of the signature', () => {
  const source = 'fn g(p: Int, q: { b: Int, ...r }, s: { ...r }): Int = '
    + '{ let f = fn(t: { a: Int, ...r }) => t; 0 }; fn main(): Int = 0;';
  mayHave(source, 'a', after(source, 't: { ', 'a'), spanAt(source, '...r'));
});

test('a label the signature says r lacks is accepted', () => {
  assert.equal(runGo('fn g(p: { a: Int, ...r }): Int = { let f = '
    + 'fn(q: { a: Int, ...r }) => q.a; f(p) }; '
    + `${print}g({ a: 4, b: true }));`), '4\n');
});

test('a lack from a declared type in the signature is accepted', () => {
  checked(`${holder}fn g(p: Holder(...r)): Int = { let f = `
    + 'fn(q: { x: Int, ...r }) => q; 0 }; fn main(): Int = 0;');
});

test('a declared type in the body over a lacking tail is accepted', () => {
  checked(`${holder}fn g(p: { x: Int, ...r }): Int = { let f = `
    + 'fn(h: Holder(...r)) => h; 0 }; fn main(): Int = 0;');
});

test('a handler label over a lacking tail is accepted', () => {
  checked(`${state}fn run(p: { n: Int, ...r }): Int = with handler `
    + 'State({ n: Int, ...r }) { get() => crash("x"), put(x) => () } '
    + '{ 0 }; fn main(): Int = 0;');
});

test('a lack from the signature\'s own row is accepted', () => {
  checked(`${state}fn g(p: { ...r }): Int with State({ a: Int, ...r }) = `
    + '{ let f = fn(q: { a: Int, ...r }) => q; 0 }; fn main(): Int = 0;');
});

// Defence in depth: a label both written and in the tail's image is a
// checker defect, E_INTERNAL at the record, never a Go struct declaring a
// field twice. Driven directly: the checker lets no such record through.
const written = '{ a: Int, ...r }';
const lowered = (label, imageLabel) => {
  const pure = applicativeCopy.pure;
  const image = internLayout([Tuple.create(imageLabel)(TInt.value)])(
    noLayouts);
  const field = () => () => pure(TInt.value);
  const tail = () => pure(Just.create(image.ty));
  const row = { fields: [Tuple.create(label)(0)], tails: [0] };
  const lowering = recordType(field)(tail)(spanAt(written, written))(row);
  return run(lowering)({ layouts: image.layouts });
};

test('a label in a record and its tail\'s image is E_INTERNAL', () => {
  const result = lowered('a', 'a');
  assert.ok(result instanceof Left);
  const diagnostic = wire(result.value0);
  assert.equal(diagnostic.code, 'E_INTERNAL');
  assert.equal(diagnostic.message, 'Duplicate record label');
  assert.deepEqual(diagnostic.span, spanAt(written, written));
});

test('disjoint labels are one layout', () => {
  assert.ok(lowered('b', 'a') instanceof Right);
});
