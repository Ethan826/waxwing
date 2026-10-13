import test from 'node:test';
import { at, rejectedWith, spanOf } from './text-spans.mjs';

// Text v1 design §6: block diagnostics with exact spans. Spans cross lines,
// and every position after or inside a block counts the real units.
const lines = (...parts) => parts.join('\n');
const head = 'fn main(): Text = ';
const open = `${head}"""`;
const own = 'The closing """ must be on its own line';
const openingBreak = '""" must be followed by a line break';
const less = 'This line is indented less than the closing """';
const lineBreak = 'Text cannot contain a line break; use \\n or a """ block';
const lineStart = (source, line) => source.split('\n').slice(0, line - 1)
  .reduce((sum, text) => sum + text.length + 1, 0);
const leading = (source, line) => {
  const start = lineStart(source, line);
  const run = /^[ \t]*/.exec(source.slice(start))[0];
  return spanOf(source, start, start + run.length);
};
const empty = (source, line) =>
  spanOf(source, lineStart(source, line), lineStart(source, line));
const whole = source => spanOf(source, source.indexOf('$'), source.length);
const spanning = lines(open, '  a ${', '    "b"', '  } c', '  """ ?');
const rows = [
  ['text after the opening', lines(`${open}x;`, '  """'),
    '""" must be followed by a line break', s => at(s, 'x;')],
  ['spaces after the opening', lines(`${open}  `, '  a', '  """'),
    '""" must be followed by a line break', s => at(s, '  ', 0, open.length)],
  ['nothing after the opening', open, 'Unterminated text literal',
    s => at(s, '"""')],
  ['nothing after the opening in a hole', head + '"$' + '{"""',
    'Unterminated interpolation', s => spanOf(s, head.length + 1, s.length)],
  ['backslash at a line end', lines(open, '  a\\', '  b', '  """;'),
    'Unknown escape \\', s => at(s, '\\')],
  ['backslash at a CRLF line end',
    lines(open, '  a\\', '  b', '  """;').replaceAll('\n', '\r\n'),
    'Unknown escape \\', s => at(s, '\\')],
  ['raw backslash at a line end', lines(`${head}#"""`, '  a\\#', '  """#'),
    'Unknown escape \\#', s => at(s, '\\#')],
  ['close after text', lines(open, '  a', '  x""";'), own,
    s => at(s, '"""', 1)],
  ['raw close after text', lines(`${head}#"""`, '  a', '  x"""#;'), own,
    s => at(s, '"""#')],
  ['close after a hole', lines(open, '  ${"a"}""";'), own,
    s => at(s, '"""', 1)],
  ['tab indent, space line', lines(open, '  b', '\t"""'), less,
    s => leading(s, 2)],
  ['no indent', lines(open, 'b', '  """'), less, s => empty(s, 2)],
  ['shorter prefix', lines(open, '  a', ' b', '  """'), less,
    s => leading(s, 3)],
  ['line after a hole', lines(open, '  ${"a"}', ' b', '  """'), less,
    s => leading(s, 3)],
  ['CRLF source', lines(open, '  a', ' b', '  """').replaceAll('\n', '\r\n'),
    less, s => leading(s, 3)],
  ['escape on a later line', lines(open, '  😀 \\q', '  """;'),
    'Unknown escape \\q', s => at(s, '\\q')],
  ['escape after a hole', lines(open, '  ${"a"} \\q', '  """;'),
    'Unknown escape \\q', s => at(s, '\\q')],
  ['unterminated', lines(open, '  a'), 'Unterminated text literal',
    s => at(s, '"""')],
  ['unterminated with quotes', lines(open, '  say "a"'),
    'Unterminated text literal', s => at(s, '"""')],
  ['raw unterminated', lines(`${head}#"""`, '  a'),
    'Unterminated text literal', s => at(s, '#"""')],
  ['raw unterminated after a quote', lines(`${head}#"""`, '  a "b"'),
    'Expected """#, found "', s => at(s, '"', 4)],
  ['raw unterminated, short close', lines(`${head}##"""`, '  a', '  """#'),
    'Expected """##, found """#', s => at(s, '"""#')],
  ['raw unterminated, no close hashes', lines(`${head}#"""`, '  a', '  """'),
    'Expected """#, found """', s => at(s, '"""', 1)],
  ['too many hashes', lines(`${head}#"""`, '  a', '  """##;'),
    'Expected """#, found """##', s => at(s, '"""##')],
  ['opening then a lone CR at the end', `${open}\r`, openingBreak,
    s => spanOf(s, s.indexOf('\r'), s.indexOf('\r'))],
  ['lone carriage return', lines(open, '  a\rb', '  """'), lineBreak,
    s => spanOf(s, head.length, s.indexOf('\r'))],
  ['unclosed hole', lines(open, '  ${a', '"""', ''),
    'Unterminated interpolation', whole]
];
for (const [name, source, message, span] of rows) {
  test(`block error: ${name}`, () =>
    rejectedWith(source, 'E_SYNTAX', message, span(source)));
}

const lex = [
  ['after the close', lines(open, '  a', '  """ ?')],
  ['after the close in CRLF', lines(open, '  a', '  """ ?')
    .replaceAll('\n', '\r\n')],
  ['after a multi-line hole', spanning],
  ['after non-BMP text', lines(open, '  😀', '  """ "😀" ?')]
];
for (const [name, source] of lex) {
  test(`block position: ${name}`, () =>
    rejectedWith(source, 'E_LEX', 'Unexpected character', at(source, '?')));
}

test('block position: a type error on a later line', () => {
  const source = lines(open, '  ${', '    1', '  }', '  """;');
  rejectedWith(source, 'E_TYPE', 'Expected Text, found Int', at(source, '1'));
});
