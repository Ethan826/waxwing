// The token boundary's trusted surface (Task 1.1 ruling, threat model).
// An allowed importer of a token Internal module can build tokens, so all
// it exports is trusted: its source export list (operator aliases, value
// wrappers) and its compiled `export { … }` names (instance dictionaries,
// which no export list shows). scripts/trusted-surface.json pins both for
// each allowed importer; a difference, an unpinned importer or a header
// the parser below does not accept is a finding. Re-pinning is a reviewed
// change: node scripts/trusted-surface-pin.mjs.
export const manifestFile = 'scripts/trusted-surface.json';
const repin = `re-pin with \`node scripts/trusted-surface-pin.mjs\`;`
  + ` a re-pin changes the trusted surface and needs review`;

// Fail closed: the parser accepts a deliberately small header form, so
// that what it reads is what purs reads. Before `module`, only blank
// lines and lines starting `--` (a comment, or a parse error in purs);
// in the header, no comments, tabs, CR or non-ASCII, and the plain
// export-list grammar.
const preamble = /^(?:[ ]*\n|--[^\n]*\n)*/y;
const tokenForms = [
  ['space', /[ \n]+/y], ['comment', /--|\{-/y], ['punct', /[(),]/y],
  ['proper', /[A-Z][A-Za-z0-9_']*(?:\.[A-Z][A-Za-z0-9_']*)*/y],
  ['lower', /[a-z_][A-Za-z0-9_']*/y], ['op', /[:!#$%&*+./<=>?@\\^|~-]+/y]
];

const tokenAt = (text, at) => {
  for (const [kind, form] of tokenForms) {
    form.lastIndex = at;
    const match = form.exec(text);
    if (match !== null) return { kind, text: match[0] };
  }
  return { kind: 'unknown', text: text[at] };
};

const headerTokens = (text, start) => {
  const tokens = [];
  let at = start;
  while (at < text.length) {
    const token = tokenAt(text, at);
    if (token.kind === 'comment' || token.kind === 'unknown'
      || (token.kind === 'op' && token.text.includes('--')))
      throw new Error(`unsupported text ${JSON.stringify(token.text)}`
        + ' in the module header (comments, tabs, CR, non-ASCII)');
    at += token.text.length;
    if (token.kind !== 'space') tokens.push(token);
    if (token.text === 'where') return tokens;
  }
  throw new Error('no `where` ends the module header');
};

const reader = tokens => {
  let at = 0;
  const peek = () => tokens[at] ?? { kind: 'end', text: '' };
  const next = () => tokens[at++] ?? { kind: 'end', text: '' };
  const expect = (kind, text) => {
    const token = next();
    if (token.kind !== kind || (text !== undefined && token.text !== text))
      throw new Error(`expected ${text ?? kind}, found`
        + ` ${JSON.stringify(token.text)} in the export list`);
    return token.text;
  };
  return { peek, next, expect };
};

const members = read => {
  if (read.peek().kind === 'op') return `(${read.expect('op', '..')})`;
  const names = [];
  while (read.peek().text !== ')') {
    if (names.length > 0) read.expect('punct', ',');
    names.push(read.expect('proper'));
  }
  return `(${names.join(', ')})`;
};

const entry = read => {
  const token = read.next();
  if (token.text === 'module') return `module ${read.expect('proper')}`;
  if (token.text === 'class') return `class ${read.expect('proper')}`;
  if (token.text === 'type' || token.text === '(') {
    const prefix = token.text === 'type'
      ? `type ${read.expect('punct', '(')}` : '(';
    const op = read.expect('op');
    return `${prefix}${op}${read.expect('punct', ')')}`;
  }
  if (token.kind === 'lower') return token.text;
  if (token.kind !== 'proper')
    throw new Error(`unexpected ${JSON.stringify(token.text)}`
      + ' in the export list');
  if (read.peek().text !== '(') return token.text;
  read.next();
  const inner = members(read);
  read.expect('punct', ')');
  return `${token.text}${inner}`;
};

// The export list's entries, normalized (`T(..)`, `(~~)`, `module X`).
export const sourceExports = (name, source) => {
  preamble.lastIndex = 0;
  preamble.exec(source);
  const read = reader(headerTokens(source, preamble.lastIndex));
  read.expect('lower', 'module');
  if (read.expect('proper') !== name)
    throw new Error(`the header does not declare module ${name}`);
  read.expect('punct', '(');
  const entries = [entry(read)];
  while (read.peek().text === ',') {
    read.next();
    entries.push(entry(read));
  }
  read.expect('punct', ')');
  read.expect('lower', 'where');
  return entries;
};

// Every `export { … }` statement purs emitted, one string per name, with
// its source module when it is a re-export. Any other `export` line fails.
const exportStatement =
  /export \{([^}]*)\}(?: from "([^"]+)")?;(?:\n|$)/y;
const exportedName = /^[A-Za-z0-9_$]+(?: as [A-Za-z0-9_$]+)?$/;

export const compiledExports = js => [...js.matchAll(/^export\b/gm)]
  .flatMap(match => {
  exportStatement.lastIndex = match.index;
  const statement = exportStatement.exec(js);
  if (statement === null)
    throw new Error('unrecognized compiled export statement');
  return statement[1].split(',').map(part => part.trim().replace(/\s+/g,
    ' ')).filter(part => part !== '').map(part => {
    if (!exportedName.test(part))
      throw new Error(`unrecognized compiled export ${JSON.stringify(part)}`);
    return statement[2] === undefined ? part : `${part} from ${statement[2]}`;
  });
});

export const surfaceOf = (name, source, js) => {
  if (source === undefined) throw new Error('no source module found');
  if (js === undefined) throw new Error('no output/<M>/index.js found');
  return { source: sourceExports(name, source), compiled: compiledExports(js) };
};

const difference = (kind, pinned, now) => {
  const added = now.filter(item => !pinned.includes(item));
  const removed = pinned.filter(item => !now.includes(item));
  return `${kind} exports differ from the pin`
    + (added.length > 0 ? `, added ${added.join(', ')}` : '')
    + (removed.length > 0 ? `, removed ${removed.join(', ')}` : '')
    + (added.length + removed.length === 0 ? ' (order)' : '');
};

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const importerFindings = (name, pinned, { source, js }) => {
  if (pinned === undefined)
    return [`${name} is an allowed importer of a token Internal module`
      + ` with no entry in ${manifestFile}; ${repin}`];
  let surface;
  try {
    surface = surfaceOf(name, source, js);
  } catch (error) {
    return [`${name}: cannot read its trusted surface (${error.message});`
      + ` fails closed`];
  }
  return ['source', 'compiled'].filter(kind =>
    !same(pinned[kind], surface[kind])).map(kind =>
    `${name}: ${difference(kind, pinned[kind] ?? [], surface[kind])}`
    + `; ${repin}`);
};

// `importers` maps each allowed importer present in src/ or output/ to
// its source text and compiled index.js (either may be missing).
export const surfaceFindings = (manifest, importers) => [
  ...Object.entries(importers).flatMap(([name, files]) =>
    importerFindings(name, manifest[name], files)),
  ...Object.keys(manifest).filter(name => !(name in importers)).map(name =>
    `${manifestFile} pins ${name}, which no longer exists; ${repin}`)];

// FFI JavaScript (src/**/*.js and output/<M>/foreign.js) naming a token
// Internal module, from a module not allowed to import it. A textual scan:
// a path built at run time evades it (docs/engineering.md).
const internalPath = /Domain[./\\](Verdict|Recorded)[./\\]Internal/g;

export const foreignFindings = (files, allowed) =>
  Object.entries(files).flatMap(([file, { module, js }]) =>
  [...new Set([...js.matchAll(internalPath)].map(match =>
    `Domain.${match[1]}.Internal`))].filter(internal =>
    !allowed(module, internal)).map(internal =>
    `${file} (FFI of ${module}) names ${internal}`));
