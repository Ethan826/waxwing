import test from 'node:test';
import assert from 'node:assert/strict';
import { runGoBatch } from './go-batch.mjs';
import { at, rejectedWith, spanOf } from './text-spans.mjs';

// Text v1 design §1 "Raw and extended delimiters" and §6: `#"…"#` literals
// at run time, and their termination errors with exact spans.
const main = body => `fn main(): Text = ${body};`;
const id = 'fn id(s: Text): Text = s; ';
const cases = [
  ['backslashes', main('#"C:\\Users\\${x}"#')],
  ['interpolated', 'fn f(name: Text): Text = #"{"n": "$#{name}"}"#; '
    + main('f("Ada")')],
  ['escape', main('#"a\\#nb\\#t|\\#\\|\\#u{41}|\\#"|\\#$"#')],
  ['extended', main('##"a "# b"##')],
  ['content quote', main('##"a"#"##')],
  ['empty', main('#""#')],
  ['two hashes', id + main('##"\\##u{41} $##{id("X")} \\#n $#{y} ${z}"##')],
  ['nested literal', id + main('#"a $#{id("b${id("c")}")} d"#')],
  ['plain dollar', main('#"$ $# $x ${y} $#"#')]
];
const batch = runGoBatch(import.meta.url, cases);
const out = (name, stdout) => test(`raw: ${name}`, () =>
  assert.equal(batch.run(name), stdout));

out('backslashes', 'C:\\Users\\${x}\n');
out('interpolated', '{"n": "Ada"}\n');
out('escape', 'a\nb\t|\\|A|"|$\n');
out('extended', 'a "# b\n');
out('content quote', 'a"#\n');
out('empty', '\n');
out('two hashes', 'A X \\#n $#{y} ${z}\n');
out('nested literal', 'a bc d\n');
out('plain dollar', '$ $# $x ${y} $#\n');

const head = 'fn main(): Text = ';
const lineBreak = 'Text cannot contain a line break; use \\n or a """ block';
const rows = [
  ['too many hashes', `${head}#"x"##;`, 'Expected "#, found "##',
    s => at(s, '"##')],
  ['too many hashes after non-BMP', `${head}#"😀"##;`,
    'Expected "#, found "##', s => at(s, '"##')],
  ['quote at the end of the line', `${head}#"x"\n;`,
    'Expected "#, found "', s => at(s, '"', 1)],
  ['quote then CRLF', `${head}#"x"\r\n;`,
    'Expected "#, found "', s => at(s, '"', 1)],
  ['lone CR after a quote', `${head}#"x"\r;`, lineBreak,
    s => spanOf(s, head.length, s.indexOf('\r'))],
  ['lone CR in a raw literal', `${head}#"x\ry"#;`, lineBreak,
    s => spanOf(s, head.length, s.indexOf('\r'))],
  ['quote at the end of the file', `${head}##"x"#`,
    'Expected "##, found "#', s => at(s, '"#')],
  ['the last of several quotes', `${head}##"a"#"b"`,
    'Expected "##, found "', s => at(s, '"', 3)],
  ['no quote at the end of the file', `${head}#"x`,
    'Unterminated text literal', s => at(s, '#"')],
  ['no quote at the end of the line', `${head}##"x\n;`,
    'Unterminated text literal', s => at(s, '##"')],
  ['unknown escape', `${head}#"a\\#qb"#;`, 'Unknown escape \\#q',
    s => at(s, '\\#q')],
  ['bad Unicode escape', `${head}##"\\##u{D800}"##;`,
    'Invalid Unicode escape \\##u{D800}', s => at(s, '\\##u{D800}')],
  ['unclosed hole', `${head}#"$#{a`, 'Unterminated interpolation',
    s => at(s, '$#{a')],
  ['type error in a hole', `${head}#"$#{1}"#;`,
    'Expected Text, found Int', s => at(s, '1')]
];
for (const [name, source, message, span] of rows) {
  const code = message.startsWith('Expected Text') ? 'E_TYPE' : 'E_SYNTAX';
  test(`raw error: ${name}`, () =>
    rejectedWith(source, code, message, span(source)));
}
