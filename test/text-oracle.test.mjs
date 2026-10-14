import test from 'node:test';
import assert from 'node:assert/strict';
import { outcome } from './fx-oracle.mjs';
import { compareValues } from './fx-oracle-values.mjs';
import { compareText, decodeLiteral, quoteText } from './text-reference.mjs';

// Text in the reference interpreter (design §5): code-point order, never
// JavaScript's UTF-16 `<`, and the printing rules of §1 and §4.
const text = value => ({ text: value });
const program = { ctors: new Map() };

test('U+1F600 sorts after U+FFFD in the interpreter', () => {
  assert.ok('\u{1f600}' < '�', 'JavaScript orders by UTF-16 unit');
  assert.equal(compareValues(program, text('\u{1f600}'), text('�')), 1);
  assert.equal(compareValues(program, text('�'), text('\u{1f600}')), -1);
  assert.equal(compareValues(program, text('a'), text('a')), 0);
  assert.equal(compareValues(program, text('a'), text('ab')), -1);
  assert.equal(compareText('\u{1f600}', '�'), 1);
});

test('the interpreter runs the pinned comparison', () => {
  const source = 'fn main(): Bool = "\u{1f600}" > "\\u{FFFD}";';
  assert.equal(outcome(source).stdout, 'true\n');
});

test('raw at top level, quoted inside data, show is raw', () => {
  const data = 'type Box = Box(Text); ';
  assert.equal(outcome('fn main(): Text = "a\\nb";').stdout, 'a\nb\n');
  const boxed = `${data}fn main(): Box = Box("a\\nb\\\${");`;
  assert.equal(outcome(boxed).stdout, 'Box("a\\nb\\${")\n');
  assert.equal(outcome('fn main(): Text = show("a\\"");').stdout, 'a"\n');
});

test('interpolation runs its parts left to right', () => {
  const source = 'fn a(): Text with Console = { Console.print(1); "x" }; '
    + 'fn b(): Text with Console = { Console.print(2); "y" }; '
    + 'fn main(): Text with Console = "${a()}-${b()}" ++ "!";';
  const found = outcome(source);
  assert.equal(found.stdout, '1\n2\nx-y!\n');
  assert.ok(found.events.has('text-ordered-holes'));
});

test('the reference decoder and printer follow the spec', () => {
  assert.equal(decodeLiteral('##"a"#b\\##n"##'), 'a"#b\n');
  assert.equal(decodeLiteral('"""\n  a\n\n    b \n  """'), 'a\n\n  b ');
  assert.equal(decodeLiteral('"\\$\\u{1F600}"'), '$\u{1f600}');
  assert.equal(quoteText('${$\u0001‮\u{1f600}'),
    '"\\${$\\u{1}\\u{202e}\u{1f600}"');
});
