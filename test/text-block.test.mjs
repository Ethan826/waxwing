import test from 'node:test';
import assert from 'node:assert/strict';
import { runGoBatch } from './go-batch.mjs';

// Text v1 design §1 "Multiline blocks": run-time values of `"""` blocks.
// Each block is wrapped in brackets so a missing or extra newline shows.
const lines = (...parts) => parts.join('\n');
const wrap = block => `fn main(): Text = "[" ++ ${block} ++ "]";`;
const id = 'fn id(s: Text): Text = s; ';
const indented = lines('"""', '    a', '      b', '    """');
const spanning = lines('"""', '  a ${', '    id("b")', '  } c', '  """');
const cases = [
  ['indent', wrap(indented)],
  ['crlf', wrap(indented.replaceAll('\n', '\r\n'))],
  ['blank lines', wrap(lines('"""', '    a', '', '   ', '        ', '    b',
    '    """'))],
  ['blank line before the close', wrap(lines('"""', '    a', '', '    """'))],
  ['no final newline', wrap(lines('"""', '    a', '    """'))],
  ['empty', wrap(lines('"""', '"""'))],
  ['one blank line', wrap(lines('"""', '', '"""'))],
  ['two blank lines', wrap(lines('"""', '', '', '"""'))],
  ['trailing spaces', wrap(lines('"""', '    a  ', '    """'))],
  ['tabs', wrap(lines('"""', '\ta', '\t\tb', '\t"""'))],
  ['escapes and quotes', id + wrap(lines('"""',
    '  x ${id("y")} \\t \\u{41} "q" ""', '  \\"z\\nw', '  """'))],
  ['raw', id + wrap(lines('#"""', '  a\\n ${x} \\#n $#{id("y")} """ "',
    '  """#'))],
  ['extended close', wrap(lines('##"""', '  a """# b', '  """##'))],
  ['multi-line hole', id + wrap(spanning)],
  ['multi-line hole in CRLF', id + wrap(spanning.replaceAll('\n', '\r\n'))],
  ['nested block', id + wrap(lines('"""', '  outer ${id("""',
    '    inner', '    """)} end', '  """'))],
  ['holes at line starts', id + wrap(lines('"""', '  ${id("A")}',
    '  ${id("B")} x', '  """'))],
  ['hole then blank line', id + wrap(lines('"""', '  ${id("A")}', '', '  b',
    '  """'))]
];
const batch = runGoBatch(import.meta.url, cases);
const out = (name, stdout) => test(`block: ${name}`, () =>
  assert.equal(batch.run(name), stdout));

out('indent', '[a\n  b]\n');
out('crlf', '[a\n  b]\n');
out('blank lines', '[a\n\n\n\nb]\n');
out('blank line before the close', '[a\n]\n');
out('no final newline', '[a]\n');
out('empty', '[]\n');
out('one blank line', '[]\n');
out('two blank lines', '[\n]\n');
out('trailing spaces', '[a  ]\n');
out('tabs', '[a\n\tb]\n');
out('escapes and quotes', '[x y \t A "q" ""\n"z\nw]\n');
out('raw', '[a\\n ${x} \n y """ "]\n');
out('extended close', '[a """# b]\n');
out('multi-line hole', '[a b c]\n');
out('multi-line hole in CRLF', '[a b c]\n');
out('nested block', '[outer inner end]\n');
out('holes at line starts', '[A\nB x]\n');
out('hole then blank line', '[A\n\nb]\n');
