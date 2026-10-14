// FX020 migration: proposals for text the resolver cannot speak for (a
// rejected program, or a fragment no resolving source contains). One-off;
// Task 7 removes it (R4). These are candidates for the manifest, never
// edits: a bare name followed by `(` that some effect declares, or such
// a name standing as a value between `(`, `,`, `=`, `[` or `>` and `)`,
// `,`, `;`, `]` or `}`. A declaration (`fn log(`), a qualified name and
// a clause head (`log(n) =>`) are not candidates; text outside string
// holes is skipped.
const name = /[A-Za-z_][A-Za-z0-9_]*/y;

// Offsets of code: everything but the text of string literals, whose
// `${…}` holes are code again.
export const codeMask = source => {
  const code = new Uint8Array(source.length);
  const holes = [];
  let inString = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (inString) {
      if (char === '\\') index++;
      else if (char === '"') inString = false;
      else if (source.startsWith('${', index)) {
        holes.push(0);
        inString = false;
        index++;
      }
      continue;
    }
    code[index] = 1;
    if (char === '"') { code[index] = 0; inString = true; }
    if (char === '{' && holes.length > 0) holes[holes.length - 1]++;
    if (char === '}' && holes.length > 0) {
      if (holes[holes.length - 1] === 0) { holes.pop(); inString = true; }
      else holes[holes.length - 1]--;
    }
  }
  return code;
};

const skipSpace = (source, index, step) => {
  while (/\s/.test(source[index] ?? '')) index += step;
  return index;
};

const closing = (source, open) => {
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === '(') depth++;
    if (source[index] === ')' && --depth === 0) return index;
  }
  return source.length;
};

const wordBefore = (source, index) => {
  const end = skipSpace(source, index - 1, -1) + 1;
  let start = end;
  while (/[A-Za-z0-9_]/.test(source[start - 1] ?? '')) start--;
  return source.slice(start, end);
};

const kindAt = (source, at, length) => {
  const before = source[skipSpace(source, at - 1, -1)] ?? '';
  if (before === '.' || /[A-Za-z0-9_]/.test(source[at - 1] ?? '')
    || wordBefore(source, at) === 'fn') return undefined;
  const after = skipSpace(source, at + length, 1);
  if (source[after] === '(') {
    const next = skipSpace(source, closing(source, after) + 1, 1);
    return source.startsWith('=>', next) ? undefined : 'call';
  }
  return '(,=[>'.includes(before) && before !== ''
    && '),;]}'.includes(source[after] ?? ')') ? 'reference' : undefined;
};

// `qualifiers` maps an operation name to the effects declaring it; a
// candidate's qualifier is null when that is not exactly one.
export const candidates = (source, qualifiers) => {
  const code = codeMask(source);
  const found = [];
  for (let index = 0; index < source.length; index++) {
    if (!code[index] || /[A-Za-z0-9_]/.test(source[index - 1] ?? '')) {
      continue;
    }
    name.lastIndex = index;
    const word = name.exec(source)?.[0];
    if (word === undefined) continue;
    const effects = qualifiers.get(word);
    const kind = effects && kindAt(source, index, word.length);
    if (kind) {
      found.push({ at: index, name: word, kind,
        qualifier: effects.size === 1 ? [...effects][0] : null });
    }
    index += word.length - 1;
  }
  return found;
};

// Whether text names an operation in no candidate shape: the bare name
// alone (a pinned span's text, say), or an operation word in code-like
// text (one with `(`, `;`, `=` or `{`). Prose and kebab-case names
// (`nested-fail`) are not mentions.
export const mentions = (source, qualifiers) => {
  if (qualifiers.has(source.trim())) return true;
  if (!/[(;={]/.test(source)) return false;
  const code = codeMask(source);
  for (const match of source.matchAll(/[A-Za-z_][A-Za-z0-9_-]*/g)) {
    if (code[match.index] && qualifiers.has(match[0])
      && source[match.index - 1] !== '.') return true;
  }
  return false;
};

// Offsets of code words that are operation names, not after `.`.
export const operationWords = (source, qualifiers) => {
  const code = codeMask(source);
  return [...source.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)]
    .filter(match => code[match.index] && qualifiers.has(match[0])
      && source[match.index - 1] !== '.')
    .map(match => match.index);
};

// Operations a text declares, by tokens alone (it need not resolve).
export const declared = source => {
  const found = [['print', 'Console'], ['fail', 'Fail']];
  const effects = /\beffect\s+([A-Z][A-Za-z0-9_]*)[^{;]*\{([^}]*)\}/g;
  for (const [, effect, body] of source.matchAll(effects)) {
    for (const [, operation] of body.matchAll(/\bfn\s+([a-z_]\w*)/g)) {
      found.push([operation, effect]);
    }
  }
  return found;
};
