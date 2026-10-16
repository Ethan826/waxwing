import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { rejected, spanAt } from './support.mjs';
import { shape } from './fn-shape.mjs';

// R004 Task 1: record patterns as parsed (design §1, §5). Shapes leave
// spans out; spans are checked where they are the point.
const wrap = pattern => `fn f(x: Int): Int = match x { ${pattern} => 1 };`;
const parsedPattern = pattern => {
  const result = parse(wrap(pattern));
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0.functions[0].body.value2[0].pattern;
};
const patternShape = pattern => shape(parsedPattern(pattern));
const entry = (label, found) => `{label: ${label}, pattern: ${found}}`;
const bind = name => `PBind(${name})`;
// R005 Task 1: a rest is `Just` a record holding its optional name.
const bare = 'Just({name: Nothing})';
const record = (fields, rest = 'Nothing') =>
  `PRecord([${fields.join(', ')}], ${rest})`;

test('fields keep their written order and any pattern', () => {
  assert.equal(patternShape('{ name: n, admin: true }'),
    record([entry('name', bind('n')), entry('admin', 'PBool(true)')]));
  assert.equal(patternShape('{ a: _, b: 3 }'),
    record([entry('a', 'PWildcard'), entry('b', 'PInt(3)')]));
});

test('a record pattern nests in a constructor pattern and around one', () => {
  assert.equal(patternShape('Some({ a: n })'),
    `PCtor(Some, [${record([entry('a', bind('n'))])}])`);
  assert.equal(patternShape('{ a: Some(n), b: { c: m } }'),
    record([entry('a', `PCtor(Some, [${bind('n')}])`),
      entry('b', record([entry('c', bind('m'))]))]));
});

test('a trailing comma is allowed, with or without the rest', () => {
  assert.equal(patternShape('{ a: n, }'), record([entry('a', bind('n'))]));
  assert.equal(patternShape('{ a: n, ..., }'),
    record([entry('a', bind('n'))], bare));
});

test('... ends the pattern and is recorded', () => {
  assert.equal(patternShape('{ a: n, ... }'),
    record([entry('a', bind('n'))], bare));
  const found = parsedPattern('{ a: n, ... }');
  assert.deepEqual(found.value2.value0.span,
    spanAt(wrap('{ a: n, ... }'), '...'));
});

test('a field without a pattern puns as a binder at its label', () => {
  assert.equal(patternShape('{ name }'),
    record([entry('name', bind('name'))]));
  assert.equal(patternShape('{ name, admin: true, age, ... }'),
    record([entry('name', bind('name')), entry('admin', 'PBool(true)'),
      entry('age', bind('age'))], bare));
  const source = wrap('{ name, admin: true }');
  const found = parsedPattern('{ name, admin: true }');
  assert.deepEqual(found.value1[0].pattern.value0, spanAt(source, 'name'));
});

test('a label has its own span, apart from its pattern', () => {
  const source = wrap('{ unknown: value }');
  const found = parsedPattern('{ unknown: value }');
  assert.deepEqual(found.value0, spanAt(source, '{ unknown: value }'));
  assert.deepEqual(found.value1[0].span, spanAt(source, 'unknown'));
  assert.deepEqual(found.value1[0].pattern.value0, spanAt(source, 'value'));
});

for (const [text, message] of [
  ['{ a: n, ..., b: m }', "Expected '}'"],
  ['{ a: n, ... 3 }', "Expected '}'"],
  ['{ a: n, ..., ... }', "Expected '}'"],
  ['{}', 'Expected an identifier'],
  ['{ ... }', 'Expected an identifier'],
  ['{ , a }', 'Expected an identifier'],
  ['{ a: }', 'Expected a pattern']
]) {
  test(`${text} is E_SYNTAX`, () => {
    assert.equal(rejected(wrap(text), 'E_SYNTAX').message, message);
  });
}

test('... must be last: the error is at what follows it', () => {
  const source = wrap('{ a: n, ..., b: m }');
  assert.deepEqual(rejected(source, 'E_SYNTAX').span.start,
    spanAt(source, ',', 1).start);
});
