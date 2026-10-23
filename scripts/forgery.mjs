// Forgery by the primitives (Task 1.1 breaker ruling, re-review 5; carry
// review C1, C2). A compiled token is plain JS (a newtype is erased), so
// a value of an arbitrary type forges one, whatever module the token
// types reach it through (a re-export, a synonym, a polymorphic helper).
// Threat model (final ruling): these rules stop ACCIDENTAL construction
// of a trusted verdict outside the trusted modules. Deliberate use of
// library partiality (a function returning `undefined` at any type
// without throwing, e.g. Data.Array.unsafeIndex out of bounds) is out of
// scope and left to review. The rules are on the primitives:
// (a) no src module outside a reviewed allowlist may depend on a library
//     module listed in `forgingModules`;
// (b) a src module may have a foreign module or a `foreign import` only
//     if scripts/foreign-surface.json pins it: its signatures, and the
//     SHA-256 of its whole .purs and .js, so a synonym a signature names
//     or the JS body cannot change without a reviewed re-pin.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const anyType = 'which can produce a value of any type';
const invariant = 'whose constructors bypass an invariant';
// Surveyed over the installed package set (docs/findings.md, "The
// verdict token boundary"): the coercions (unsafeCoerce; Record.Unsafe's
// unsafeGet, unsafeSet, unsafeDelete), and the *.Internal modules whose
// exported constructors build a value their API forbids (an empty
// NonEmptyArray, on which foldl1 returns `undefined`; an empty
// NonEmptyString; an unordered or unbalanced Map).
export const forgingModules = {
  'Unsafe.Coerce': anyType,
  'Record.Unsafe': anyType,
  'Data.Array.NonEmpty.Internal': invariant,
  'Data.String.NonEmpty.Internal': invariant,
  'Data.Map.Internal': invariant
};
// Reviewed src modules allowed to use them: none today.
const forgingAllowed = [];
export const foreignPinFile = 'scripts/foreign-surface.json';
const repin = 're-pin with `node scripts/foreign-surface-pin.mjs`;'
  + ' a re-pin is a reviewed change';

const inSrc = module => module.path.startsWith('src/');

export const coercionFindings = (graph, allowed = forgingAllowed) =>
  Object.entries(graph).filter(([name, module]) =>
  inSrc(module) && !allowed.includes(name)).flatMap(([name, module]) =>
  module.depends.filter(dependency => dependency in forgingModules)
    .map(dependency => `${name} depends on ${dependency},`
    + ` ${forgingModules[dependency]}`));

// Fail closed: every line naming `foreign`, other than a line comment,
// must start a declaration at column 0. A declaration runs to the next
// line that starts at column 0 with code; a comment inside it is refused,
// because a comment line at column 0 would otherwise end it early.
const foreignWord = /\bforeign\b/;
const lineComment = /^\s*--/;
const continues = /^(\s|--|\{-|$)/;

const declarationAt = (lines, start) => {
  let end = start + 1;
  while (end < lines.length && continues.test(lines[end])) end += 1;
  const text = lines.slice(start, end).join('\n');
  if (/--|\{-/.test(text))
    throw new Error(`line ${start + 1}: a comment inside a foreign import`);
  return text.replace(/\s+/g, ' ').trim();
};

export const foreignImports = source => {
  const lines = source.split('\n');
  return lines.flatMap((line, index) => {
    if (!foreignWord.test(line) || lineComment.test(line)) return [];
    if (!line.startsWith('foreign import '))
      throw new Error(`line ${index + 1}: \`foreign\` outside a`
        + ' column-0 `foreign import`');
    return [declarationAt(lines, index)];
  });
};

const readSource = path => readFileSync(path, 'utf8');
// The module's foreign JS (beside the source, else its output copy), or
// undefined.
const readForeignJs = (name, path) => [path.replace(/\.purs$/, '.js'),
  join('output', name, 'foreign.js')].filter(file => existsSync(file))
  .map(file => readFileSync(file, 'utf8'))[0];
const digest = text => text === undefined ? null
  : createHash('sha256').update(text).digest('hex');

// Each src module with a foreign module or a foreign import: its
// signatures (or why they cannot be read) and its files' SHA-256.
export const foreignModules = (graph, read = readSource,
  readJs = readForeignJs) => Object.fromEntries(Object.entries(graph)
  .filter(([, module]) => inSrc(module)).flatMap(([name, module]) => {
  const source = read(module.path);
  const js = readJs(name, module.path);
  const hashes = { path: module.path, purs: digest(source), js: digest(js) };
  let entry;
  try {
    entry = { imports: foreignImports(source), ...hashes };
  } catch (error) {
    entry = { error: error.message, ...hashes };
  }
  return entry.imports?.length === 0 && js === undefined
    ? [] : [[name, entry]];
}));

// The pin of readable modules: signatures and both files' SHA-256.
export const foreignPin = modules => Object.fromEntries(Object.entries(
  modules).sort().map(([name, { imports, purs, js }]) =>
  [name, { imports, purs, js }]));

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const importFindings = (name, pinned, imports) => {
  if (same(pinned, imports)) return [];
  const added = imports.filter(item => !pinned.includes(item));
  const removed = pinned.filter(item => !imports.includes(item));
  return [`${name}: foreign imports differ from the pin`
    + (added.length > 0 ? `, added ${added.join(', ')}` : '')
    + (removed.length > 0 ? `, removed ${removed.join(', ')}` : '')
    + (added.length + removed.length === 0 ? ' (order)' : '')
    + `; ${repin}`];
};

const moduleFindings = (name, pinned, entry) => {
  if (pinned === undefined)
    return [`${name} has a foreign module or foreign import and no entry`
      + ` in ${foreignPinFile}; ${repin}`];
  if (entry.error !== undefined)
    return [`${name}: cannot read its foreign imports (${entry.error});`
      + ' fails closed'];
  return [...importFindings(name, pinned.imports ?? [], entry.imports),
    ...(pinned.purs === entry.purs ? [] : [`${name}: ${entry.path} differs`
      + ` from its pinned SHA-256; ${repin}`]),
    ...(pinned.js === entry.js ? [] : [`${name}: its foreign JS differs`
      + ` from its pinned SHA-256; ${repin}`])];
};

export const foreignSurfaceFindings = (pin, modules) => [
  ...Object.entries(modules).flatMap(([name, entry]) =>
    moduleFindings(name, pin[name], entry)),
  ...Object.keys(pin).filter(name => !(name in modules)).map(name =>
    `${foreignPinFile} pins ${name}, which has no foreign module or`
    + ` foreign import; ${repin}`)];
