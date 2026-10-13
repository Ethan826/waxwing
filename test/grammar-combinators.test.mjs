import test from 'node:test';
import assert from 'node:assert/strict';
import { Left, Right } from '../output/Data.Either/index.js';
import { endPosition, lex } from '../output/Format.Lex/index.js';
import {
  applicativeParser, chainLeftAny, commaList, initialState, name, run,
  spanned
} from '../output/Format.Parse.Grammar/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

// Direct tests of the list combinators and `spanned` on token input,
// independent of any production that uses them.
const runOn = (parser, source) => {
  const tokens = lex(source);
  assert.ok(tokens instanceof Right, 'fixture must lex');
  return run(parser)(initialState(tokens.value0)(endPosition(source)));
};

const parsed = (parser, source) => {
  const result = runOn(parser, source);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return { value: result.value0.value, next: result.value0.rest.index };
};

const failed = (parser, source) => {
  const result = runOn(parser, source);
  assert.ok(result instanceof Left, 'parser accepted invalid input');
  const diagnostic = wire(result.value0);
  return { at: diagnostic.span.start.offset, message: diagnostic.message };
};

const text = found => found.text;
const pair = left => right => ({ left, right });
const plus = () => pair;
const tagged = operator => left => right => ({ operator, left, right });

test('chainLeftAny nests to the left and drops the operator tokens', () => {
  const sum = chainLeftAny(['+'])(plus)(name);
  const result = parsed(sum, 'a + b + c ;');
  assert.deepEqual(
    [result.value.left.left.text, result.value.left.right.text,
      result.value.right.text], ['a', 'b', 'c']);
  assert.equal(result.next, 5, 'stops before the token after the chain');
});

test('chainLeftAny returns a lone item, fails on a dangling one', () => {
  const sum = chainLeftAny(['+'])(plus)(name);
  const single = parsed(sum, 'a ;');
  assert.equal(single.value.text, 'a');
  assert.equal(single.next, 1);
  assert.deepEqual(failed(sum, 'a +'),
    { at: 3, message: 'Expected an identifier' });
  assert.deepEqual(failed(sum, 'a + ;'),
    { at: 4, message: 'Expected an identifier' });
});

test('chainLeftAny hands each operator read to combine, in order', () => {
  const sum = chainLeftAny(['+', '++'])(tagged)(name);
  const { value, next } = parsed(sum, 'a + b ++ c ;');
  assert.deepEqual([value.operator, value.left.operator,
    value.left.left.text, value.left.right.text, value.right.text],
  ['++', '+', 'a', 'b', 'c']);
  assert.equal(next, 5);
});

test('commaList is empty exactly before `)` and leaves `)` unread', () => {
  const list = commaList(name);
  assert.deepEqual(parsed(list, ')'), { value: [], next: 0 });
  const two = parsed(list, 'a, b)');
  assert.deepEqual(two.value.map(text), ['a', 'b']);
  assert.equal(two.next, 3);
  assert.equal(parsed(list, 'a b').next, 1, 'no comma ends the list');
  assert.deepEqual(failed(list, 'a, )'),
    { at: 3, message: 'Expected an identifier' });
  assert.deepEqual(failed(list, ''),
    { at: 0, message: 'Expected an identifier' });
});

const spanOf = span => value => ({ span, value });
const offsets = span => [span.start.offset, span.end.offset];

test('spanned runs from the first to the last consumed token', () => {
  const both = applicativeParser.Apply0().apply(
    applicativeParser.Apply0().Functor0().map(pair)(name))(name);
  const result = parsed(spanned(spanOf)(both), '  ab  cd ef');
  assert.deepEqual(offsets(result.value.span), [2, 8]);
});

test('spanned is empty at the next token when nothing is consumed', () => {
  const nothing = spanned(spanOf)(applicativeParser.pure(0));
  assert.deepEqual(offsets(parsed(nothing, '  ab').value.span), [2, 2]);
  assert.deepEqual(offsets(parsed(nothing, 'ab  ').value.span), [0, 0]);
  assert.deepEqual(offsets(parsed(nothing, '   ').value.span), [3, 3]);
});
