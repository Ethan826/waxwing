import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The TextMate grammar is generated because a raw literal's escapes and
// holes depend on its `#` count, and a TextMate rule cannot read a count
// captured by its parent (only an `end` pattern can back-reference). So
// one rule is written per count up to `explicitCounts`; longer runs close
// correctly by back-reference but get no inner escapes or holes.
const schema = 'https://raw.githubusercontent.com/martinring/'
  + 'tmlanguage/master/tmlanguage.json';
export const grammarPath = 'editors/vscode/syntaxes/waxwing.tmLanguage.json';
const explicitCounts = 16;
const scope = suffix => `${suffix}.waxwing`;
const word = '[A-Za-z0-9_]';
const boundary = names => `(?<!${word})(?:${names.join('|')})(?!${word})`;

// Every reserved word of Format.Lex.Chars.reserved is placed in exactly one
// of these groups, except `_`, which has its own rule. `pure`, `nofail` and
// `fail` are contextual: ordinary names to the lexer.
export const wordGroups = [
  ['keyword.control', ['if', 'then', 'else', 'match', 'with', 'handle',
    'defer', 'resume']],
  ['keyword.declaration', ['fn', 'type', 'effect', 'handler', 'let', 'ctl']],
  ['constant.language.boolean', ['true', 'false']],
  ['support.type.builtin', ['Int', 'Bool', 'Unit', 'Text']],
  ['storage.modifier.contextual', ['pure', 'nofail', 'fail']]
];

const wordRule = ([name, names]) => ({
  name: scope(name), match: boundary(names)
});
const hashes = count => '#'.repeat(count);
// An invalid `\u{...}` is marked through its closing brace, as the lexer's
// error span runs.
const badUnicode = 'u(?!\\{[0-9A-Fa-f]{1,6}\\})(?:\\{[0-9A-Fa-f]*\\}?)?';
const escapeOf = count => {
  const mark = `\\\\${hashes(count)}`;
  return [
    { name: scope('constant.character.escape'),
      match: `${mark}(?:[ntr"\\\\$]|u\\{[0-9A-Fa-f]{1,6}\\})` },
    { name: scope('invalid.illegal.escape'),
      match: `${mark}(?:${badUnicode}|[^ntr"\\\\$u\\n]|(?=\\n|$))` }
  ];
};
const delimiter = 'punctuation.definition.string';
const interpolation = 'punctuation.section.interpolation';
const hole = (count, spans) => ({
  name: scope('meta.interpolation'),
  begin: `\\$${hashes(count)}\\{`,
  end: spans ? '\\}' : '\\}|$',
  beginCaptures: { 0: { name: scope(`${interpolation}.begin`) } },
  endCaptures: { 0: { name: scope(`${interpolation}.end`) } },
  patterns: [{ include: spans ? '#expression' : '#hole-line' }]
});
const literal = (count, block) => {
  const quote = block ? '"""' : '"';
  const open = `${hashes(count)}${block ? quote : '"(?!"")'}`;
  const close = `${quote}${hashes(count)}`;
  return {
    name: scope(count ? 'string.quoted.other.raw' : 'string.quoted.double'),
    begin: open,
    end: block ? close : `${close}|$`,
    beginCaptures: { 0: { name: scope(`${delimiter}.begin`) } },
    endCaptures: { 0: { name: scope(`${delimiter}.end`) } },
    patterns: [...escapeOf(count), hole(count, block)]
  };
};
const longRun = block => ({
  name: scope('string.quoted.other.raw'),
  begin: `(#{${explicitCounts + 1},})${block ? '"""' : '"(?!"")'}`,
  end: block ? '"""\\1' : '"\\1|$',
  beginCaptures: { 0: { name: scope(`${delimiter}.begin`) } },
  endCaptures: { 0: { name: scope(`${delimiter}.end`) } }
});
const counts = Array.from({ length: explicitCounts + 1 }, (_, count) => count);
const literals = block => [...counts.map(count => literal(count, block)),
  longRun(block)];

const items = [
  ...literals(true), ...literals(false),
  ...wordGroups.map(wordRule),
  { name: scope('variable.language.wildcard'), match: boundary(['_']) },
  { name: scope('constant.numeric.integer'), match: `-?(?<!${word})[0-9]+` },
  { name: scope('keyword.operator.minus'), match: '-(?!>)' },
  { name: scope('keyword.operator.arrow'), match: '->|=>|\\|>' },
  { name: scope('keyword.operator.comparison'), match: '==|!=|<=|>=|<|>' },
  { name: scope('keyword.operator.join'), match: '\\+\\+' },
  { name: scope('keyword.operator.arithmetic'), match: '\\+' },
  { name: scope('keyword.operator.spread'), match: '\\.\\.\\.' },
  { name: scope('keyword.operator.assignment'), match: '=' },
  { name: scope('punctuation.separator'), match: '[:,;|]' },
  { name: scope('entity.name.type'), match: `(?<!${word})[A-Z]${word}*` },
  { name: scope('variable.other'), match: `(?<!${word})[a-z_]${word}*` },
  { name: scope('punctuation.section.parens'), match: '[()]' }
];
const braces = end => ({
  name: scope('meta.braces'), begin: '\\{', end,
  patterns: [{ include: end === '\\}' ? '#expression' : '#hole-line' }]
});

export const grammar = () => ({
  $schema: schema,
  name: 'Waxwing',
  scopeName: 'source.waxwing',
  patterns: [{ include: '#expression' }],
  repository: {
    items: { patterns: items },
    expression: { patterns: [{ include: '#items' }, braces('\\}')] },
    // A hole in a one-line literal ends at its line's end, as the lexer
    // ends it; so do braces opened inside it.
    'hole-line': {
      patterns: [{ include: '#items' }, braces('\\}|$')]
    }
  }
});

export const render = () => `${JSON.stringify(grammar(), null, 2)}\n`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(grammarPath, render());
  const lines = readFileSync(grammarPath, 'utf8').split('\n').length;
  console.log(`wrote ${grammarPath}, ${lines} lines`);
}
