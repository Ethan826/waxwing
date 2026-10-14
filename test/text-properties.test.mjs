import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from './fx-gen-rng.mjs';
import { runGoBatch } from './go-batch.mjs';
import { literal, randomStyle, randomText } from './text-literal-gen.mjs';
import { compareText, decodeLiteral, quoteText } from './text-reference.mjs';

// Text v1 design §7, properties: over generated Unicode text (non-BMP,
// controls, quotes, backslashes, `$` and `#`), the compiler's quoted form
// reads back; literals of every form with random `#` counts decode as the
// reference decoder (test/text-reference.mjs) does; and comparison agrees
// with the reference code-point order. Each runs `cases` programs in one Go
// batch (test/go-batch.mjs). WAXWING_TEXT_SEED chooses another run.
const seed = Number(process.env.WAXWING_TEXT_SEED ?? 20261013);
const cases = 500;
const box = 'type Box = Box(Text); ';
const ordinary = { hashes: 0, block: false };
const texts = (offset) => {
  const r = rng(seed + offset);
  return Array.from({ length: cases }, () => randomText(r));
};

test(`${cases} quoted printed forms read back to the same text`, () => {
  const r = rng(seed);
  const values = texts(0);
  const printed = runGoBatch(import.meta.url, values.map((text, index) => [
    `p${index}`, `${box}fn main(): Box = Box(${literal(r, [text], ordinary)});`
  ]), 'printed');
  const quoted = values.map((text, index) => {
    const out = printed.run(`p${index}`);
    assert.ok(out.startsWith('Box(') && out.endsWith(')\n'), out);
    const form = out.slice(4, -2);
    assert.equal(form, quoteText(text), `case ${index} (seed ${seed})`);
    return form;
  });
  const reread = runGoBatch(import.meta.url, quoted.map((form, index) => [
    `q${index}`, `fn main(): Text = ${form};`]), 'reread');
  values.forEach((text, index) => {
    assert.equal(reread.run(`q${index}`), `${text}\n`,
      `case ${index} (seed ${seed}): ${JSON.stringify(text)}`);
  });
});

test(`${cases} ordinary, raw and block literals decode as the reference`,
  () => {
  const r = rng(seed + 1);
  const values = texts(1).map(text => text || 'x');
  const styles = values.map(() => randomStyle(r));
  const sources = values.map((text, index) =>
    literal(r, [text], styles[index]));
  const batch = runGoBatch(import.meta.url, sources.map((source, index) => [
    `l${index}`, `fn main(): Text = ${source};`]), 'literals');
  sources.forEach((source, index) => {
    const expected = decodeLiteral(source);
    if (!styles[index].block) assert.equal(expected, values[index]);
    assert.equal(batch.run(`l${index}`), `${expected}\n`,
      `case ${index} (seed ${seed}): ${JSON.stringify(source)}`);
  });
});

const small = ['a', 'b', '', '￿', '�', '\u{10000}',
  '\u{1f600}', '\u{10ffff}'];
const operators = ['==', '!=', '<', '<=', '>', '>='];
const holds = {
  '==': order => order === 0, '!=': order => order !== 0,
  '<': order => order < 0, '<=': order => order <= 0,
  '>': order => order > 0, '>=': order => order >= 0
};
const shortText = r =>
  Array.from({ length: r.int(4) }, () => r.pick(small)).join('');

test(`${cases} comparisons agree with the code-point order`, () => {
  const r = rng(seed + 2);
  const pairs = [['\u{1f600}', '�'], ['�', '\u{1f600}']];
  while (pairs.length < cases) {
    const left = shortText(r);
    pairs.push([left, r.chance(30) ? left + shortText(r) : shortText(r)]);
  }
  const printed = ([left, right]) => operators.map(operator =>
    `Console.print(${literal(r, [left], ordinary)} ${operator} `
    + `${literal(r, [right], ordinary)});`).join(' ');
  const batch = runGoBatch(import.meta.url, pairs.map((pair, index) => [
    `c${index}`, `fn main(): Unit with Console = { ${printed(pair)} };`]),
  'compare');
  pairs.forEach(([left, right], index) => {
    const order = compareText(left, right);
    const expected = operators.map(operator => `${holds[operator](order)}\n`)
      .join('');
    assert.equal(batch.run(`c${index}`), expected,
      `case ${index} (seed ${seed}): ${JSON.stringify([left, right])}`);
  });
  assert.equal(compareText('\u{1f600}', '�'), 1);
});
