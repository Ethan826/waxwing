import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { rejected, spanAt } from './support.mjs';
import { shape } from './fn-shape.mjs';

// R005 Task 1: extension, removal, rest binders, written lacks and the
// empty record type as parsed (design §1-§4). Shapes leave spans out;
// spans are checked where they are the point.
const prefix = 'fn f(x: Int): Int = ';
const parsedFunction = (text) => {
  const result = parse(text);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0.functions[0];
};
const parsedBody = body => parsedFunction(`${prefix}${body};`).body;
const bodyShape = body => shape(parsedBody(body));
const v = name => `Variable(${name})`;
const given = (label, found) => `Given({name: ${label}, value: ${found}})`;
const spread = found => `Spreading(${found})`;
const extension = (...items) => `RecordExtension([${items.join(', ')}])`;
const removal = (receiver, ...labels) =>
  `RecordRemoval(${receiver}, [${labels.map(l => `{name: ${l}}`).join(', ')}])`;
const one = given('a', 'Integer(1)');

test('a spread may come first, last, alone or between fields', () => {
  assert.equal(bodyShape('{ ...p, admin: true }'),
    extension(spread(v('p')), given('admin', '$$Boolean(true)')));
  assert.equal(bodyShape('{ admin: true, ...p }'),
    extension(given('admin', '$$Boolean(true)'), spread(v('p'))));
  assert.equal(bodyShape('{ ...p }'), extension(spread(v('p'))));
  assert.equal(bodyShape('{ a: 1, ...p, b: 2 }'), extension(one,
    spread(v('p')), given('b', 'Integer(2)')));
});

test('a spread takes any expression, and a comma may follow the last', () => {
  assert.equal(bodyShape('{ ...g(x), a: 1, }'),
    extension(spread('Call(g, [Variable(x)])'), one));
  assert.equal(bodyShape('{ ...p, }'), extension(spread(v('p'))));
  assert.equal(bodyShape('{ a: 1, ...{ b: 2 } }'), extension(one,
    spread(`RecordLiteral([{name: b, value: Integer(2)}])`)));
});

test('a literal without a spread stays a literal; { x } stays a block', () => {
  assert.equal(bodyShape('{ a: 1 }'),
    'RecordLiteral([{name: a, value: Integer(1)}])');
  assert.equal(bodyShape('{ x }'), 'Block([], Variable(x))');
});

test('a second spread still parses: resolution refuses it', () => {
  assert.equal(bodyShape('{ ...p, ...q }'),
    extension(spread(v('p')), spread(v('q'))));
});

test('an extension and a spread have their own spans', () => {
  const source = `${prefix}{ ...p, a: 1 };`;
  const body = parsedBody('{ ...p, a: 1 }');
  assert.deepEqual(body.value0, spanAt(source, '{ ...p, a: 1 }'));
  assert.deepEqual(body.value1[0].value0, spanAt(source, '...p'));
  assert.deepEqual(body.value1[1].value0.span, spanAt(source, 'a'));
});

test('without removes labels, and a comma may follow the last', () => {
  assert.equal(bodyShape('p without { a }'), removal(v('p'), 'a'));
  assert.equal(bodyShape('p without { a, b }'), removal(v('p'), 'a', 'b'));
  assert.equal(bodyShape('p without { a, b, }'), removal(v('p'), 'a', 'b'));
});

test('without groups left to right with call, access and update', () => {
  assert.equal(bodyShape('f(x) without { a }.b'),
    `FieldAccess(${removal('Call(f, [Variable(x)])', 'a')}, {name: b})`);
  assert.equal(bodyShape('p.q without { a }'),
    removal('FieldAccess(Variable(p), {name: q})', 'a'));
  assert.equal(bodyShape('p without { a } { b = 1 }'),
    `RecordUpdate(${removal(v('p'), 'a')}, `
    + '[{name: b, value: Integer(1)}])');
  assert.equal(bodyShape('p { b = 1 } without { a }'),
    removal('RecordUpdate(Variable(p), [{name: b, value: Integer(1)}])', 'a'));
  assert.equal(bodyShape('p without { a } without { b }'),
    removal(removal(v('p'), 'a'), 'b'));
  assert.equal(bodyShape('p without { a }(1)'),
    `Apply(${removal(v('p'), 'a')}, [Integer(1)])`);
});

test('without binds tighter than |>, + and comparison', () => {
  assert.equal(bodyShape('p without { a } |> g'),
    `Pipe(${removal(v('p'), 'a')}, Variable(g))`);
  assert.equal(bodyShape('1 + p without { a }.b'),
    `Arith(Binary(Plus, Integer(1), `
    + `FieldAccess(${removal(v('p'), 'a')}, {name: b})))`);
  assert.equal(bodyShape('p without { a } == q'),
    `Compare(Equal, ${removal(v('p'), 'a')}, Variable(q))`);
});

test('a removal and its labels have spans', () => {
  const source = `${prefix}p without { aa, bb };`;
  const body = parsedBody('p without { aa, bb }');
  assert.deepEqual(body.value0, spanAt(source, 'p without { aa, bb }'));
  assert.deepEqual(body.value2[0].span, spanAt(source, 'aa'));
  assert.deepEqual(body.value2[1].span, spanAt(source, 'bb'));
});

for (const [text, message] of [
  ['p without {}', 'Expected an identifier'],
  ['p without { , a }', 'Expected an identifier'],
  ['p without { A }', 'Expected an identifier'],
  ['p without a', "Expected '{'"],
  ['p without { a b }', "Expected '}'"]
]) {
  test(`${text} is E_SYNTAX`, () => {
    assert.equal(rejected(`${prefix}${text};`, 'E_SYNTAX').message, message);
  });
}

const wrap = pattern => `fn f(x: Int): Int = match x { ${pattern} => 1 };`;
const patternShape = pattern => shape(
  parsedFunction(wrap(pattern)).body.value2[0].pattern);
const entry = (label, found) => `{label: ${label}, pattern: ${found}}`;
const bind = name => `PBind(${name})`;
const record = (fields, rest = 'Nothing') =>
  `PRecord([${fields.join(', ')}], ${rest})`;
const named = name => `Just({name: Just({name: ${name}})})`;

test('a rest may be bare or named, and ends the pattern', () => {
  assert.equal(patternShape('{ a, ... }'),
    record([entry('a', bind('a'))], 'Just({name: Nothing})'));
  assert.equal(patternShape('{ a, ...rest }'),
    record([entry('a', bind('a'))], named('rest')));
  assert.equal(patternShape('{ a: n, b, ...rest, }'),
    record([entry('a', bind('n')), entry('b', bind('b'))], named('rest')));
  assert.equal(patternShape('{ a: n }'), record([entry('a', bind('n'))]));
});

test('a rest spans ...name, and the name has its own span', () => {
  const source = wrap('{ a, ...rest }');
  const found = parsedFunction(source).body.value2[0].pattern;
  assert.deepEqual(found.value2.value0.span, spanAt(source, '...rest'));
  assert.deepEqual(found.value2.value0.name.value0.span,
    spanAt(source, 'rest'));
  const bare = parsedFunction(wrap('{ a, ... }')).body.value2[0].pattern;
  assert.deepEqual(bare.value2.value0.span,
    spanAt(wrap('{ a, ... }'), '...'));
});

for (const [text, message] of [
  ['{ a, ...r, b }', "Expected '}'"],
  ['{ a, ...r s }', "Expected '}'"],
  ['{ a, ...r, ... }', "Expected '}'"],
  ['{ a, ...R }', "Expected '}'"],
  ['{ ...r }', 'Expected an identifier'],
  ['{ ... }', 'Expected an identifier']
]) {
  test(`${text} is E_SYNTAX`, () => {
    assert.equal(rejected(wrap(text), 'E_SYNTAX').message, message);
  });
}

const signature = tail => `fn f(p: { ...r }): Int ${tail} = 1;`;
const lacks = (variable, ...labels) =>
  `Lacks({labels: [${labels.map(l => `{name: ${l}}`).join(', ')}], `
  + `variable: {name: ${variable}}})`;
const constraintsOf = text => shape(parsedFunction(text).constraints);

test('where lists constraints, with braced labels', () => {
  assert.equal(constraintsOf(signature('where r lacks { admin }')),
    `[${lacks('r', 'admin')}]`);
  assert.equal(constraintsOf(signature('where r lacks { a, b, }')),
    `[${lacks('r', 'a', 'b')}]`);
  const several = signature('where r lacks { a }, s lacks { b, c }');
  assert.equal(constraintsOf(several),
    `[${lacks('r', 'a')}, ${lacks('s', 'b', 'c')}]`);
  assert.equal(constraintsOf(signature('')), '[]');
});

test('where follows a written row and precedes =', () => {
  const found = parsedFunction(
    'fn f(p: { ...r }): Int with pure where r lacks { a } = 1;');
  assert.equal(shape(found.constraints), `[${lacks('r', 'a')}]`);
  assert.equal(shape(found.body), 'Integer(1)');
});

test('a constraint and its parts have spans', () => {
  const source = signature('where rr lacks { aa, bb }');
  const [found] = parsedFunction(source).constraints;
  assert.deepEqual(found.value0.span, spanAt(source, 'rr lacks { aa, bb }'));
  assert.deepEqual(found.value0.variable.span, spanAt(source, 'rr'));
  assert.deepEqual(found.value0.labels[1].span, spanAt(source, 'bb'));
});

for (const [tail, message] of [
  ['where', 'Expected an identifier'],
  ['where r lacks {}', 'Expected an identifier'],
  ['where r lacks a', "Expected '{'"],
  ['where r lacks { a } s lacks { b }', "Expected '='"],
  ['where r lacks { a },', 'Expected an identifier'],
  ['where R lacks { a }', 'Expected an identifier'],
  ['where r { a }', "Expected 'lacks'"]
]) {
  test(`${tail} is E_SYNTAX`, () => {
    assert.equal(rejected(signature(tail), 'E_SYNTAX').message, message);
  });
}

const typeShape = text => shape(parsedFunction(text).parameters[0].ty);
const empty = 'RecordRef([], [])';

test('{} is the empty record type in every type position', () => {
  assert.equal(typeShape('fn f(x: {}): Int = 1;'), empty);
  assert.equal(shape(parsedFunction('fn f(): {} = 1;').result), empty);
  assert.equal(typeShape('fn f(x: { a: {} }): Int = 1;'),
    `RecordRef([{name: a, ty: ${empty}}], [])`);
  assert.equal(typeShape('fn f(x: ({}) -> {}): Int = 1;'),
    `FunRef(${empty}, ${empty})`);
});

test('{} in a type spans its two braces', () => {
  const source = 'fn f(x: {}): Int = 1;';
  assert.deepEqual(parsedFunction(source).parameters[0].ty.value0,
    spanAt(source, '{}'));
});

test('{} in an expression is still Unit', () => {
  assert.equal(bodyShape('{}'), 'UnitValue');
});

for (const word of ['where', 'lacks', 'without', 'disjoint']) {
  for (const [place, source] of [
    ['a function name', `fn ${word}(): Int = 1;`],
    ['a parameter', `fn f(${word}: Int): Int = 1;`],
    ['a let binding', `${prefix}{ let ${word} = 1; ${word} };`],
    ['a field label', `${prefix}{ ${word}: 1 }.${word};`],
    ['a pattern binder', `fn f(x: Int): Int = match x { ${word} => 1 };`]
  ]) {
    test(`${word} is reserved: not ${place}`, () => {
      rejected(source, 'E_SYNTAX');
    });
  }
}
