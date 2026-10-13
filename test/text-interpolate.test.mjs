import test from 'node:test';
import assert from 'node:assert/strict';
import { rejected, rejectedAt } from './support.mjs';
import { runGoBatch } from './go-batch.mjs';

// Text v1 design §1 "Interpolation" and §3 "Lexing": `${e}` holes, nesting,
// escapes, boundaries and the nesting limit. Runs are built once (T001).
const main = (type, body) => `fn main(): ${type} = ${body};`;
const id = 'fn id(s: Text): Text = s; ';
const noisy = 'fn t1(): Text with Console = { print(1); "a" }; '
  + 'fn t2(): Text with Console = { print(2); "b" }; ';
const who = 'effect Who { fn who(): Text; }; ';
const cases = [
  ['hello', 'fn greet(name: Text): Text = "Hello, ${name}!"; '
    + main('Text', 'greet("World")')],
  ['nested', id + 'fn g(c: Text): Text = "a ${id("b ${c}")} d"; '
    + main('Text', 'g("C")')],
  ['escaped', main('Text', '"\\${x}"')],
  ['dollar', main('Text', '"$x cost: $5 $ {y} $"')],
  ['only a hole', id + main('Text', '"${id("v")}"')],
  ['empty text hole', main('Text', '"[${""}]"')],
  ['adjacent holes', id + main('Text', '"${id("a")}${id("b")}${id("c")}"')],
  ['order', noisy + 'fn main(): Unit with Console = '
    + 'print("${t1()}${t2()}");'],
  ['block braces', 'fn main(): Unit with Console = '
    + 'print("<${ { print(1); "x" } }>");'],
  ['braces in a nested text', id + main('Text', '"${id("}{")}"')],
  ['quote in a nested text', id + main('Text', '"${id("\\"")}"')],
  ['match braces', 'type T = A | B; ' + id
    + main('Text', '"${match A { A => "x", B => "y" }}!"')],
  ['hole in a hole', id + main('Text', '"${id("${id("${id("z")}")}")}"')],
  ['defer', 'fn t(): Text with Console = { print(0); "x" }; '
    + 'fn main(): Unit with Console = '
    + '{ defer print("[${t()}]"); print("hi") };'],
  ['handled operation', who + 'fn main(): Unit with Console = '
    + 'with handler Who { who() => "Ada" } { print("Hi ${who()}!") };'],
  ['failing hole stops later holes', 'type Err = Err1; '
    + 'fn t(n: Int): Text with Console = { print(n); "x" }; '
    + 'fn bad(): Text with Fail(Err) = { fail(Err1); "y" }; '
    + 'fn main(): Unit with Console = print(handle '
    + '"${t(1)}${bad()}${t(2)}" { fail(error: Err) => "caught" });'],
  ['brace text in a block', main('Text', '"${ { "}" } }"')],
  ['brace text in a handler', who + 'fn main(): Text = '
    + '"${ with handler Who { who() => "}" } { who() } }";'],
  ['non-BMP', id + main('Text', '"\u{1F600}${id("\u{1F600}")}\u{1F600}"')]
];
const batch = runGoBatch(import.meta.url, cases);
const out = (name, stdout) => test(name, () =>
  assert.equal(batch.run(name), stdout));

out('hello', 'Hello, World!\n');
out('nested', 'a b C d\n');
out('escaped', '${x}\n');
out('dollar', '$x cost: $5 $ {y} $\n');
out('only a hole', 'v\n');
out('empty text hole', '[]\n');
out('adjacent holes', 'abc\n');
out('order', '1\n2\nab\n');
out('block braces', '1\n<x>\n');
out('braces in a nested text', '}{\n');
out('quote in a nested text', '"\n');
out('match braces', 'x!\n');
out('hole in a hole', 'z\n');
out('defer', 'hi\n0\n[x]\n');
out('handled operation', 'Hi Ada!\n');
out('failing hole stops later holes', '1\ncaught\n');
out('brace text in a block', '}\n');
out('brace text in a handler', '}\n');
out('non-BMP', '\u{1F600}\u{1F600}\u{1F600}\n');

const head = 'fn main(): Text = ';
const span = (start, end) => ({
  start: { offset: start, line: 1, column: start + 1 },
  end: { offset: end, line: 1, column: end + 1 }
});
// A literal whose body is `inside`, after `fn main(): Text = `.
const text = inside => `${head}"${inside}";`;
const open = '${';
const hole = 'Unterminated interpolation';
// Offsets: the opening quote is at 18, so `${` at 19, and the body at 21.
const rows = [
  ['non-Text hole', text(`${open}1}`), 'E_TYPE',
    'Expected Text, found Int', span(21, 22)],
  ['empty hole', text(`${open}}`), 'E_SYNTAX',
    'Expected an expression', span(21, 22)],
  ['quote ends the line', `${text(`${open}a`)}\n`, 'E_SYNTAX', hole,
    span(19, 24)],
  ['end of file', `${head}"${open}a`, 'E_SYNTAX', hole, span(19, 22)],
  ['end of line', text(`${open}a + \nb}`), 'E_SYNTAX', hole, span(19, 25)],
  ['spaces to the line end', text(`${open}a  \n}`), 'E_SYNTAX', hole,
    span(19, 24)],
  ['carriage return', text(`${open}a\r}`), 'E_SYNTAX', hole, span(19, 22)],
  ['after a non-BMP character', `${head}"😀${open}a`, 'E_SYNTAX', hole,
    span(21, 24)],
  ['unclosed brace in a hole', text(`${open} { a }`), 'E_SYNTAX', hole,
    span(19, 29)],
  ['two holes, the second open', `${head}"${open}a}${open}b`, 'E_SYNTAX',
    hole, span(23, 26)],
  ['hole in a nested text', text(`${open}f("${open}a")}`), 'E_SYNTAX', hole,
    span(24, 32)],
  ['two expressions', text(`${open}a b}`), 'E_SYNTAX', "Expected '}'",
    span(23, 24)]
];

for (const [name, source, code, message, expected] of rows) {
  test(`interpolation: ${name}`, () => {
    const diagnostic = rejected(source, code);
    assert.deepEqual(
      { message: diagnostic.message, span: diagnostic.span },
      { message, span: expected });
  });
}

test('a non-Text hole is an error at it, in order', () => {
  const source = main('Text', '"${"a"}${1}${true}"');
  assert.equal(rejectedAt(source, 'E_TYPE', '1').message,
    'Expected Text, found Int');
});

// Hole k of `nest(n)` opens at `base + 3 * (k - 1) + 1`.
const nest = count => '"${'.repeat(count) + '"x"' + '}"'.repeat(count);
const nestedMain = count => main('Text', nest(count));
const holeStart = k => head.length + 3 * (k - 1) + 1;

const depth = runGoBatch(import.meta.url, [['128', nestedMain(128)]], 'depth');
test('128 nested holes compile', () => {
  assert.equal(depth.run('128'), 'x\n');
});

test('129 nested holes are E_NESTING at the innermost ${', () => {
  const diagnostic = rejected(nestedMain(129), 'E_NESTING');
  assert.equal(diagnostic.message, 'Nesting exceeds 128 levels');
  assert.deepEqual(diagnostic.span, span(holeStart(129), holeStart(129) + 2));
});

test('10,000 nested holes give the same diagnostic, with no overflow', () => {
  const diagnostic = rejected(nestedMain(10000), 'E_NESTING');
  assert.deepEqual(diagnostic.span, span(holeStart(129), holeStart(129) + 2));
});

test('a 10,000-deep unclosed nesting stops at the limit too', () => {
  const diagnostic = rejected(main('Text', '"${'.repeat(10000)), 'E_NESTING');
  assert.equal(diagnostic.message, 'Nesting exceeds 128 levels');
  assert.deepEqual(diagnostic.span, span(holeStart(129), holeStart(129) + 2));
});

test('10,000 holes in one literal compile', () => {
  const parts = Array(10000).fill('${"a"}').join('');
  const programs = runGoBatch(import.meta.url,
    [['many', main('Text', `"${parts}"`)]], 'many');
  assert.equal(programs.run('many'), 'a'.repeat(10000) + '\n');
});

// The quoted printed form of a Text (design §4) reads back unchanged.
const some = 'type Opt = Some(Text); ';
const texts = [
  ['hole', '"a \\${x} b"'],
  ['dollar five', '"$5"'],
  ['backslash before a hole', '"\\\\\\${x}"'],
  ['mixed', '"\\\\ $ \\${ \\" \\n $5 \\\\\\${y}"']
];
const printed = runGoBatch(import.meta.url, texts.map(([name, literal]) =>
  [name, some + main('Opt', `Some(${literal})`)]), 'quoted');
const quotedOf = name => {
  const text = printed.run(name);
  return text.slice('Some('.length, -')\n'.length);
};
const back = runGoBatch(import.meta.url, texts.flatMap(([name, literal]) => [
  [`${name} quoted`, main('Text', quotedOf(name))],
  [`${name} source`, main('Text', literal)]
]), 'reread');

for (const [name] of texts) {
  test(`round trip: ${name}`, () => {
    assert.equal(back.run(`${name} quoted`), back.run(`${name} source`));
  });
}

test('round trip: a backslash before a hole stays a backslash', () => {
  assert.equal(back.run('backslash before a hole source'), '\\${x}\n');
  assert.equal(quotedOf('backslash before a hole'), '"\\\\\\${x}"');
});
