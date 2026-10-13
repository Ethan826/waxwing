// The Text v1 scale programs (design §7, plan Task 9), shared by
// test/text-scale.serial.test.mjs. Each is { name, source, expected }, with
// `expected` what the program's `main` prints, LF included.

// Roughly 1 MB of one-line literal text, with multi-byte characters.
const unit = 'héllo wörld ☕😀 ';
const bytes = Buffer.byteLength(unit);
const repeats = Math.ceil(1_000_000 / bytes);
const megabyte = unit.repeat(repeats);

const partCount = 10_000;
const parts = Array.from({ length: partCount }, (_, index) => index);

const escaped = '\\u{1F600}\\n\\\\\\"\\t';
const decoded = '\u{1F600}\n\\"\t';
const escapeUnits = 25_000;

export const scalePrograms = [
  {
    name: 'a 1 MB literal',
    source: `fn main(): Text = "${megabyte}";`,
    expected: `${megabyte}\n`
  },
  {
    name: '10,000 interpolation parts',
    source: 'fn id(s: Text): Text = s; fn main(): Text = "'
      + parts.map(index => `\${id("${index}")},`).join('') + '";',
    expected: `${parts.map(index => `${index},`).join('')}\n`
  },
  {
    name: 'a literal of 100,000 escapes',
    source: `fn main(): Text = "${escaped.repeat(escapeUnits)}";`,
    expected: `${decoded.repeat(escapeUnits)}\n`
  }
];
