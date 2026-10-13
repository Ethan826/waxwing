// Reference model of Waxwing Text (Text v1 design §1 and §4), written from
// the spec and sharing no code with the compiler: a literal decoder
// (ordinary, raw, block and extended delimiters), the quoted printed form
// of nested Text, and the code-point order. The FX001 interpreter uses it
// for literals, printing and comparison. `decodeLiteral` and `scanLiteral`
// assume valid input: they accept a mid-line `"""` in a block with no `#`
// and holes spanning lines in one-line literals, which the compiler rejects.
const escapeLetters = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\',
  $: '$' };
const isSpace = ch => ch === ' ' || ch === '\t';
const fail = message => { throw new Error(`text reference: ${message}`); };

const countHashes = (source, at) => {
  let found = 0;
  while (source[at + found] === '#') found++;
  return found;
};

// The escape at `at` (just after `\` and its n hashes): { text, end }.
const escapeAt = (source, at) => {
  const letter = source[at];
  if (letter in escapeLetters) {
    return { text: escapeLetters[letter], end: at + 1 };
  }
  if (letter !== 'u' || source[at + 1] !== '{') fail(`escape at ${at}`);
  const close = source.indexOf('}', at);
  const digits = source.slice(at + 2, close);
  if (!/^[0-9a-fA-F]{1,6}$/.test(digits)) fail(`digits ${digits}`);
  const scalar = parseInt(digits, 16);
  if (scalar > 0x10ffff || (scalar >= 0xd800 && scalar <= 0xdfff)) {
    fail(`scalar ${digits}`);
  }
  return { text: String.fromCodePoint(scalar), end: close + 1 };
};

// The end (index of the closing `}`) of the hole whose text starts at `at`:
// braces balance over tokens, and a nested literal counts as one token.
const holeEnd = (source, start) => {
  let depth = 1;
  let at = start;
  while (at < source.length) {
    if (source[at + countHashes(source, at)] === '"') {
      at = scanLiteral(source, at).end;
    } else {
      if (source[at] === '{') depth++;
      if (source[at] === '}' && --depth === 0) return at;
      at++;
    }
  }
  return fail('unterminated hole');
};

// Units of a literal body: { raw: ch } (a source character), { esc: text }
// (an escape's text) or { hole: source }; newlines are { raw: '\n' }.
const scanBody = (source, from, hashes, block) => {
  const units = [];
  const marks = '#'.repeat(hashes);
  const closer = (block ? '"""' : '"') + marks;
  let at = from;
  for (;;) {
    if (at >= source.length) fail('unterminated literal');
    const ch = source[at];
    if (source.startsWith(closer, at)
      && (!block || units.slice(lastBreak(units) + 1).every(isRawSpace))) {
      if (hashes > 0 && source[at + closer.length] === '#') {
        fail('too many hashes');
      }
      return { units, end: at + closer.length };
    }
    if (ch === '\r' && source[at + 1] === '\n') { at++; continue; }
    if (ch === '\n' || ch === '\r') {
      if (!block || ch === '\r') fail('line break');
      units.push({ raw: '\n' }); at++;
    } else if (ch === '\\' && source.startsWith(marks, at + 1)) {
      const found = escapeAt(source, at + 1 + hashes);
      units.push({ esc: found.text }); at = found.end;
    } else if (ch === '$' && source.startsWith(marks, at + 1)
      && source[at + 1 + hashes] === '{') {
      const open = at + 2 + hashes;
      const close = holeEnd(source, open);
      units.push({ hole: source.slice(open, close) }); at = close + 1;
    } else {
      const point = String.fromCodePoint(source.codePointAt(at));
      units.push({ raw: point }); at += point.length;
    }
  }
};
const isRawSpace = unit => isSpace(unit.raw);
const lastBreak = units => units.findLastIndex(unit => unit.raw === '\n');

const lines = units => {
  const found = [[]];
  for (const unit of units) {
    if (unit.raw === '\n') found.push([]); else found.at(-1).push(unit);
  }
  return found;
};

// Strips the closing line's indent from every content line.
const stripBlock = units => {
  const split = lines(units);
  const indent = split.pop().map(unit => unit.raw ?? '?').join('');
  return split.map(line => {
    if (line.every(isRawSpace)) return [];
    const prefix = line.slice(0, indent.length)
      .map(unit => unit.raw ?? '?').join('');
    if (prefix !== indent || line.length < indent.length) {
      fail('under-indented line');
    }
    return line.slice(indent.length);
  }).flatMap((line, index) => (index === 0 ? line
    : [{ raw: '\n' }, ...line]));
};

const merge = units => {
  const parts = [];
  for (const unit of units) {
    const text = unit.raw ?? unit.esc;
    if (text === undefined) parts.push({ hole: unit.hole });
    else if (typeof parts.at(-1) === 'string') parts[parts.length - 1] += text;
    else parts.push(text);
  }
  return parts;
};

// Scans the literal starting at `start` (its `#`s, quotes and body):
// { parts, end, block, hashes }, a part being a string or { hole: source }.
export const scanLiteral = (source, start) => {
  const hashes = countHashes(source, start);
  let at = start + hashes;
  if (source[at] !== '"') fail(`no literal at ${start}`);
  const block = source.startsWith('"""', at);
  at += block ? 3 : 1;
  if (block) {
    if (source.startsWith('\r\n', at)) at += 2;
    else if (source[at] === '\n') at++;
    else fail('""" needs a line break');
  }
  const body = scanBody(source, at, hashes, block);
  const units = block ? stripBlock(body.units) : body.units;
  return { parts: merge(units), end: body.end, block, hashes };
};

// The text of a literal with no holes.
export const decodeLiteral = source => {
  const { parts, end } = scanLiteral(source, 0);
  if (end !== source.length) fail('trailing characters');
  if (parts.some(part => typeof part !== 'string')) fail('has holes');
  return parts.join('');
};

// The quoted printed form of nested Text (§4).
const named = { '"': '\\"', '\\': '\\\\', '\n': '\\n', '\t': '\\t',
  '\r': '\\r' };
const written = scalar => (scalar <= 0x1f || (scalar >= 0x7f
  && scalar <= 0x9f) || scalar === 0x2028 || scalar === 0x2029
  || (scalar >= 0x202a && scalar <= 0x202e)
  || (scalar >= 0x2066 && scalar <= 0x2069));
export const quoteText = text => {
  const points = Array.from(text);
  const out = points.map((ch, index) => {
    if (ch in named) return named[ch];
    if (ch === '$' && points[index + 1] === '{') return '\\$';
    return written(ch.codePointAt(0))
      ? `\\u{${ch.codePointAt(0).toString(16)}}` : ch;
  });
  return `"${out.join('')}"`;
};

// Code-point order, not UTF-16 order: -1, 0 or 1.
export const compareText = (left, right) => {
  let a = 0;
  let b = 0;
  while (a < left.length && b < right.length) {
    const x = left.codePointAt(a);
    const y = right.codePointAt(b);
    if (x !== y) return x < y ? -1 : 1;
    a += x > 0xffff ? 2 : 1;
    b += y > 0xffff ? 2 : 1;
  }
  if (a < left.length) return 1;
  return b < right.length ? -1 : 0;
};
