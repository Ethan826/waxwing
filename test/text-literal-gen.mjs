// Source for Text literals of every form (ordinary, raw with `#`s, block),
// built from pieces: a string (text to produce) or { hole: source }. Used
// by the Text properties and the FX001 generator. Each choice the
// language leaves open (named escape or \u{..}, raw or escaped quote) is
// drawn from the seeded RNG (test/fx-gen-rng.mjs).
const letters = { '\n': 'n', '\t': 't', '\r': 'r', '"': '"', '\\': '\\',
  $: '$' };
const mustEscape = scalar => scalar < 0x20 || (scalar >= 0x7f
  && scalar <= 0x9f) || scalar === 0x2028 || scalar === 0x2029
  || (scalar >= 0x202a && scalar <= 0x202e)
  || (scalar >= 0x2066 && scalar <= 0x2069);

const hex = (r, scalar) => {
  const digits = scalar.toString(16);
  const cased = r.chance(50) ? digits.toUpperCase() : digits;
  return cased.padStart(Math.min(6, cased.length + r.int(3)), '0');
};

const hashesAfter = (points, index) => {
  let found = 0;
  while (points[index + 1 + found] === '#') found++;
  return found;
};

// One piece of text as source. `style` is { hashes, block }; `first` marks
// the literal's first piece, whose leading quotes are escaped so that a
// raw literal never opens with `"""` (a block).
export const encode = (r, text, style, first = false) => {
  const { hashes, block } = style;
  const marks = '#'.repeat(hashes);
  const points = Array.from(text);
  const escape = body => `\\${marks}${body}`;
  const out = points.map((ch, index) => {
    const scalar = ch.codePointAt(0);
    const after = hashesAfter(points, index);
    if (ch === '\n' && block) return '\n';
    if (ch === '\t' && hashes + (block ? 1 : 0) > 0 && r.chance(40)) return ch;
    if (ch === '"') {
      return hashes === 0 || after >= hashes || r.chance(20)
        || (first && index < 2) ? escape('"') : ch;
    }
    if (ch === '\\') {
      return hashes === 0 || after >= hashes || r.chance(20)
        ? escape('\\') : ch;
    }
    if (ch === '$') {
      const brace = points[index + 1] === '{';
      const hole = hashes > 0 && after >= hashes
        && points[index + 1 + hashes] === '{';
      return (hashes === 0 && brace) || hole || r.chance(15)
        ? escape('$') : ch;
    }
    if (ch in letters && r.chance(70)) return escape(letters[ch]);
    if (ch in letters || mustEscape(scalar)) {
      return escape(`u{${hex(r, scalar)}}`);
    }
    return r.chance(5) ? escape(`u{${hex(r, scalar)}}`) : ch;
  });
  return out.join('');
};

const indentOf = r => {
  const kinds = ['', ' ', '  ', '    ', '\t', '\t\t', ' \t', '  \t'];
  return r.pick(kinds);
};

// The literal source for `pieces`. options: { hashes, block, crlf }.
export const literal = (r, pieces, options = {}) => {
  const { hashes = 0, block = false, crlf = false } = options;
  const marks = '#'.repeat(hashes);
  const body = pieces.map((piece, index) => (typeof piece === 'string'
    ? encode(r, piece, { hashes, block }, index === 0)
    : `$${marks}{${piece.hole}}`))
    .join('');
  if (!block) return `${marks}"${body}"${marks}`;
  const indent = indentOf(r);
  const newline = crlf ? '\r\n' : '\n';
  const content = body.split('\n').map(line =>
    (line === '' ? line : indent + line)).join(newline);
  return `${marks}"""${newline}${content}${newline}${indent}"""${marks}`;
};

// A random style: ordinary (40%), raw (30%), block (30%), hashes 0-3.
export const randomStyle = r => {
  const block = r.chance(30);
  const hashes = block ? r.int(3) : (r.chance(40) ? 0 : 1 + r.int(3));
  return { hashes, block, crlf: block && r.chance(30) };
};

// Scalars worth drawing: ASCII, quoting hazards, controls, the bidi set,
// the BMP edge, and non-BMP.
const pool = ['a', 'b', 'Z', '0', ' ', ' ', '"', '"', '\\', '\\', '$', '$',
  '#', '#', '{', '}', '\n', '\t', '\r', '\u0001', '\u001f', '\u007f',
  '\u0085', '\u009f', ' ', 'é', ' ', ' ', '‪',
  '‮', '⁦', '⁩', ' ', '⁥', '⁪', '�',
  '￿', '', '～', '\u{10000}', '\u{1f600}', '\u{10ffff}',
  '\u{1f468}‍\u{1f469}'];
const chunks = ['${', '${x}', '"#', '"##', '\\#', '$#{', '\\u{41}', '"""',
  '\\$', '#"'];

// Random text of up to `length` pieces from the pool.
export const randomText = (r, length = 12) => {
  const count = r.int(length + 1);
  const parts = Array.from({ length: count }, () =>
    (r.chance(8) ? r.pick(chunks) : r.pick(pool)));
  return parts.join('');
};
