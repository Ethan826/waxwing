// FX020 migration: the string literals of a JavaScript file (one-off;
// Task 7 removes it, R4). Each literal keeps its cooked text and, for
// every cooked UTF-16 unit, the raw file offset it came from, so an
// insertion before a cooked offset lands at the right place in the file.
// A template literal's chunks between `${…}` holes are literals of their
// own. Comments are skipped; a `/` starts a regular expression where an
// operand is expected. The scan is lexical only, which suffices for test
// files: a chain is a run of literals joined by `+` alone.
const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v',
  0: '\0' };
const keywordsBeforeOperand = new Set(['return', 'typeof', 'case', 'do',
  'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);
const word = /[A-Za-z0-9_$]/;

// The escape at `index` (a backslash): its cooked text and raw length.
const escapeAt = (text, index) => {
  const next = text[index + 1];
  if (next === '\n') return ['', 2];
  if (next === 'x') {
    return [String.fromCharCode(parseInt(text.slice(index + 2, index + 4),
      16)), 4];
  }
  if (next === 'u' && text[index + 2] === '{') {
    const close = text.indexOf('}', index);
    return [String.fromCodePoint(parseInt(text.slice(index + 3, close), 16)),
      close + 1 - index];
  }
  if (next === 'u') {
    return [String.fromCharCode(parseInt(text.slice(index + 2, index + 6),
      16)), 6];
  }
  return [simple[next] ?? next, 2];
};

// Cooks from `start` to the closing quote, or for a template to `${`.
const cook = (text, start, quote) => {
  let cooked = '';
  const offsets = [];
  let index = start;
  while (index < text.length && text[index] !== quote
    && !(quote === '`' && text.startsWith('${', index))) {
    const [unit, width] = text[index] === '\\'
      ? escapeAt(text, index) : [text[index], 1];
    for (let part = 0; part < unit.length; part++) offsets.push(index);
    cooked += unit;
    index += width;
  }
  offsets.push(index);
  return { cooked, offsets, start, end: index };
};

const skipRegex = (text, index) => {
  let inClass = false;
  for (let at = index + 1; at < text.length; at++) {
    const char = text[at];
    if (char === '\\') at++;
    else if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (char === '/' && !inClass) {
      while (word.test(text[at + 1] ?? '')) at++;
      return at + 1;
    }
  }
  return text.length;
};

const operandExpected = previous => previous === undefined
  || (previous.type === 'punct' && !')]}'.includes(previous.value))
  || (previous.type === 'word' && keywordsBeforeOperand.has(previous.value));

// Scans code from `index`; inside a template hole it stops at the `}`
// that closes the hole and returns the offset after it.
const scanCode = (text, index, state, inHole) => {
  let depth = 0;
  while (index < text.length) {
    const char = text[index];
    const previous = state.tokens[state.tokens.length - 1];
    if (/\s/.test(char)) index++;
    else if (text.startsWith('//', index)) {
      index = text.indexOf('\n', index) === -1 ? text.length
        : text.indexOf('\n', index);
    } else if (text.startsWith('/*', index)) {
      const close = text.indexOf('*/', index + 2);
      index = close === -1 ? text.length : close + 2;
    } else if (char === '\'' || char === '"') {
      const literal = cook(text, index + 1, char);
      state.tokens.push({ type: 'string',
        literal: state.literals.push(literal) - 1 });
      index = literal.end + 1;
    } else if (char === '`') index = scanTemplate(text, index, state);
    else if (char === '/' && operandExpected(previous)) {
      index = skipRegex(text, index);
      state.tokens.push({ type: 'regex' });
    } else if (word.test(char)) {
      const start = index;
      while (index < text.length && word.test(text[index])) index++;
      state.tokens.push({ type: 'word', value: text.slice(start, index) });
    } else {
      if (inHole && char === '}' && depth === 0) return index + 1;
      if (char === '{') depth++;
      if (char === '}') depth--;
      state.tokens.push({ type: 'punct', value: char });
      index++;
    }
  }
  return index;
};

// A template with no hole is one literal like a quoted string; with holes,
// each chunk is a separate literal that never joins a chain.
const scanTemplate = (text, index, state) => {
  const chunks = [];
  let at = index + 1;
  for (;;) {
    const chunk = cook(text, at, '`');
    chunks.push(state.literals.push(chunk) - 1);
    if (chunk.end >= text.length || text[chunk.end] === '`') {
      at = chunk.end + 1;
      break;
    }
    at = scanCode(text, chunk.end + 2, state, true);
  }
  state.tokens.push(chunks.length === 1
    ? { type: 'string', literal: chunks[0] }
    : { type: 'template', chunks });
  return at;
};

const titleWords = new Set(['test', 'it', 'describe', 'suite']);

const isTitle = (tokens, index) => tokens[index - 1]?.value === '('
  && titleWords.has(tokens[index - 2]?.value);

const isReceiver = token => token?.type === 'punct'
  && (token.value === '.' || token.value === '[');

// Units of a file: each chain of literals (`'a' + 'b'`), and each template
// chunk alone. A literal that is a test's title is not a unit.
export const literalUnits = text => {
  const state = { tokens: [], literals: [] };
  scanCode(text, 0, state, false);
  const { tokens, literals } = state;
  const units = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'template') {
      for (const chunk of token.chunks) units.push([literals[chunk]]);
    } else if (token.type === 'string' && !isTitle(tokens, index)) {
      const chain = [literals[token.literal]];
      while (!isReceiver(tokens[index + 1])
        && tokens[index + 1]?.value === '+'
        && tokens[index + 2]?.type === 'string'
        && !isReceiver(tokens[index + 3])) {
        chain.push(literals[tokens[index + 2].literal]);
        index += 2;
      }
      units.push(chain);
    }
  }
  return units;
};
