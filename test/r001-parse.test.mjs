import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { rejected, spanAt } from './support.mjs';
import { shape } from './fn-shape.mjs';

// R001 Task 5: record literals, field access and update as parsed
// (design §1). Shapes leave spans out; spans are checked where they are
// the point.
const prefix = 'fn f(x: Int): Int = ';
const parsedBody = body => {
  const result = parse(`${prefix}${body};`);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0.functions[0].body;
};
const bodyShape = body => shape(parsedBody(body));
const v = name => `Variable(${name})`;
const field = (receiver, label) => `FieldAccess(${receiver}, {name: ${label}})`;
const value = (label, found) => `{name: ${label}, value: ${found}}`;
const update = (receiver, ...fields) =>
  `RecordUpdate(${receiver}, [${fields.join(', ')}])`;

test('a literal keeps its fields in written order', () => {
  assert.equal(bodyShape('{ name: "Ada", age: 36 }'),
    `RecordLiteral([${value('name', 'TextLiteral(Ada)')}, `
    + `${value('age', 'Integer(36)')}])`);
  assert.equal(bodyShape('{ a: 1, }'),
    `RecordLiteral([${value('a', 'Integer(1)')}])`);
  assert.equal(bodyShape('{ a: { b: 1 } }'), `RecordLiteral([${value('a',
    `RecordLiteral([${value('b', 'Integer(1)')}])`)}])`);
});

test('{} is still Unit and { x } is still a block', () => {
  assert.equal(bodyShape('{}'), 'UnitValue');
  assert.equal(bodyShape('{ x }'), 'Block([], Variable(x))');
  assert.equal(bodyShape('{ x; }'), 'Block([Discard(Variable(x))], UnitValue)');
});

test('a literal is an operand', () => {
  assert.equal(bodyShape('1 + { a: 2 }.a'), 'Add(Integer(1), '
    + `${field(`RecordLiteral([${value('a', 'Integer(2)')}])`, 'a')})`);
});

test('access reads left to right, after any receiver', () => {
  assert.equal(bodyShape('r.a'), field(v('r'), 'a'));
  assert.equal(bodyShape('r.a.b'), field(field(v('r'), 'a'), 'b'));
  assert.equal(bodyShape('f(x).a'), field('Call(f, [Variable(x)])', 'a'));
  assert.equal(bodyShape('(g).a'), field(v('g'), 'a'));
  assert.equal(bodyShape('(1 + x).a'),
    field('Add(Integer(1), Variable(x))', 'a'));
  assert.equal(bodyShape('g(1)(2).a'),
    field('Apply(Call(g, [Integer(1)]), [Integer(2)])', 'a'));
});

test('a call after an access applies the field', () => {
  assert.equal(bodyShape('r.f(1)(2)'),
    `Apply(${field(v('r'), 'f')}, [Integer(1), Integer(2)])`);
  assert.equal(bodyShape('f(1).g(2)'),
    `Apply(${field('Call(f, [Integer(1)])', 'g')}, [Integer(2)])`);
  assert.equal(bodyShape('g(1)(2)'),
    'Apply(Call(g, [Integer(1)]), [Integer(2)])');
});

test('update, and its grouping with call and access', () => {
  assert.equal(bodyShape('r { a = 1, b = x }'),
    update(v('r'), value('a', 'Integer(1)'), value('b', v('x'))));
  assert.equal(bodyShape('r { a = 1, }'),
    update(v('r'), value('a', 'Integer(1)')));
  assert.equal(bodyShape('f(x) { name = n }.name'), field(
    update('Call(f, [Variable(x)])', value('name', v('n'))), 'name'));
  assert.equal(bodyShape('r.a { b = 1 }'),
    update(field(v('r'), 'a'), value('b', 'Integer(1)')));
});

test('postfix binds tighter than |>, + and comparisons', () => {
  assert.equal(bodyShape('x |> f(y).a'),
    `Pipe(Variable(x), ${field('Call(f, [Variable(y)])', 'a')})`);
  assert.equal(bodyShape('r { a = 1 } |> g'),
    `Pipe(${update(v('r'), value('a', 'Integer(1)'))}, Variable(g))`);
  assert.equal(bodyShape('r.a + s.b'),
    `Add(${field(v('r'), 'a')}, ${field(v('s'), 'b')})`);
  assert.equal(bodyShape('r.a == 1'),
    `Compare(Equal, ${field(v('r'), 'a')}, Integer(1))`);
});

test('spans: access to the label, update to its }', () => {
  const body = parsedBody('(r).a { b = 1 }');
  const source = `${prefix}(r).a { b = 1 };`;
  assert.deepEqual(body.value0, spanAt(source, '(r).a { b = 1 }'));
  assert.deepEqual(body.value1.value0, spanAt(source, '(r).a'));
  assert.deepEqual(body.value1.value2.span, spanAt(source, 'a'));
  assert.deepEqual(body.value2[0].span, spanAt(source, 'b'));
  const literal = parsedBody('{ a: 1 }');
  assert.deepEqual(literal.value0, spanAt(`${prefix}{ a: 1 };`, '{ a: 1 }'));
  assert.deepEqual(literal.value1[0].span, spanAt(`${prefix}{ a: 1 };`, 'a'));
});

test('a qualifier is unchanged', () => {
  assert.equal(bodyShape('Log.log(1)'),
    'QualifiedCall(Log, log, [Integer(1)])');
  assert.equal(bodyShape('Log.log'), 'Qualified(Log, log)');
});

for (const spacedDot of ['r . a', 'r .a', 'r. a', 'r\n.a', 'f(x) .a']) {
  test(`${JSON.stringify(spacedDot)} keeps Expected ';'`, () => {
    const source = `${prefix}${spacedDot};`;
    const found = rejected(source, 'E_SYNTAX');
    assert.equal(found.message, "Expected ';'");
    assert.equal(found.span.start.offset, source.indexOf('.'));
  });
}

// Review Focus 2: an update needs `name =`; `name =>` stays a match arm.
test('an update after a match scrutinee is the scrutinee', () => {
  assert.equal(bodyShape('match r { a = 1 } { _ => 1 }'),
    `Match(${update(v('r'), value('a', 'Integer(1)'))}, `
    + '[{body: Integer(1), pattern: PWildcard}])');
});

test('a match arm and a with body are unchanged', () => {
  assert.equal(bodyShape('match r { a => 1 }'),
    'Match(Variable(r), [{body: Integer(1), pattern: PBind(a)}])');
  assert.equal(bodyShape('with h { log(1) }'),
    'With(Variable(h), Block([], Call(log, [Integer(1)])))');
  assert.equal(bodyShape('with h { x }'),
    'With(Variable(h), Block([], Variable(x)))');
});

// Each postfix operation pushes its operand one level deeper, as an infix
// operator does (ADR 006): 128 operations parse, the 129th is E_NESTING
// at its first token, never a stack overflow.
for (const [name, operation, first] of [['accesses', '.a', '.'],
  ['updates', ' { a = 1 }', '{']]) {
  test(`a chain of ${name} is bounded by the nesting limit`, () => {
    const chain = n => `${prefix}r${operation.repeat(n)};`;
    assert.ok(parse(chain(128)) instanceof Right);
    const source = chain(129);
    const found = rejected(source, 'E_NESTING');
    assert.equal(found.message, 'Nesting exceeds 128 levels');
    const at = `${prefix}r${operation.repeat(128)}`.length
      + operation.indexOf(first);
    assert.equal(found.span.start.offset, at);
  });
}
