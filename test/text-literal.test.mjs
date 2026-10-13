import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejectedAt, runGo } from './support.mjs';

// Text v1 design §1 and §4: ordinary literals, end to end.
test('a Text main prints its decoded text raw', () => {
  const source =
    'fn main(): Text = "café ☕\\t\\u{1F600}\\\\\\"\\$";';
  assert.equal(runGo(source), 'café ☕\t\u{1F600}\\"$\n');
});

test('print of a literal writes it raw', () => {
  assert.equal(runGo('fn main(): Unit = print("a");'), 'a\n');
});

test('every ordinary escape decodes', () => {
  const source = 'fn main(): Text = "\\n|\\r|\\t|\\"|\\\\|\\$|\\u{41}|\\u{0041}";';
  assert.equal(runGo(source), '\n|\r|\t|"|\\|$|A|A\n');
});

test('control and non-printing scalars survive the Go literal', () => {
  const source = 'fn main(): Text = "\\u{1}\\u{7F}\\u{85}\\u{FFFD}\\u{10FFFF}";';
  assert.equal(runGo(source), '\u0001\u007f\u0085\ufffd\u{10FFFF}\n');
});

test('the empty literal is empty text', () => {
  assert.equal(runGo('fn main(): Text = "";'), '\n');
});

test('a bare dollar and braces are literal text', () => {
  assert.equal(runGo('fn main(): Text = "$ {} $";'), '$ {} $\n');
});

test('Text parameters and results', () => {
  const source = 'fn keep(t: Text): Text = t;\n'
    + 'fn main(): Text = keep(keep("x\u{1F600}y"));';
  assert.equal(runGo(source), 'x\u{1F600}y\n');
});

test('Text works in a branch and a let', () => {
  const source = 'fn pick(b: Bool, x: Text): Text = if b then x else "no";\n'
    + 'fn main(): Text = { let t = pick(true, "yes"); t };';
  assert.equal(runGo(source), 'yes\n');
});

test('a Text where an Int is expected is a type error', () => {
  const source = 'fn main(): Int = "x";';
  const diagnostic = rejectedAt(source, 'E_TYPE', '"x"');
  assert.equal(diagnostic.message, 'Expected Int, found Text');
});

test('an Int where a Text is expected is a type error', () => {
  const source = 'fn main(): Text = 1;';
  const diagnostic = rejectedAt(source, 'E_TYPE', '1');
  assert.equal(diagnostic.message, 'Expected Text, found Int');
});

test('Text is not a pattern literal, so match over it needs a catch-all', () => {
  const source = 'fn main(): Int = match "a" { _ => 1, };';
  assert.match(checked(source), /main/);
});

test('Text is a reserved type name', () => {
  rejectedAt('fn Text(): Int = 1; fn main(): Int = 1;', 'E_SYNTAX', 'Text');
});

// Until interpolation lands (plan Task 5), `${` is ordinary text, and `\$`
// is still a valid escape; Task 5 replaces this test.
test('before interpolation, ${ is literal text', () => {
  assert.equal(runGo('fn main(): Text = "a${b}\\${c}";'), 'a${b}${c}\n');
});
