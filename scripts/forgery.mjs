// Forgery by the primitives (Task 1.1 breaker ruling, re-review 5). A
// compiled token is plain JS (a newtype is erased), so any value of an
// arbitrary type forges one, whatever module the token types reach it
// through (a re-export, a synonym, a polymorphic helper). The rule is
// therefore on the primitives that produce such values, not on modules
// near the tokens:
// (a) no src module outside a reviewed allowlist may depend on a library
//     module whose exports produce a value of any type;
// (b) a src module may have a foreign module or a `foreign import` only
//     if scripts/foreign-surface.json pins it, with its signatures.
// The JS body behind a pinned signature is left to review.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Surveyed over the installed package set (docs/findings.md, "The
// verdict token boundary"): unsafeCoerce, and Record.Unsafe's unsafeGet,
// unsafeSet and unsafeDelete. Every other unsafeCoerce in the packages is
// unexported or behind a parametric type (Data.Exists, Safe.Coerce,
// Control.Monad.Free, Data.Symbol, Data.Reflectable).
export const forgingModules = ['Unsafe.Coerce', 'Record.Unsafe'];
// Reviewed src modules allowed to use them: none today.
const forgingAllowed = [];
export const foreignPinFile = 'scripts/foreign-surface.json';
const repin = 're-pin with `node scripts/foreign-surface-pin.mjs`;'
  + ' a re-pin is a reviewed change';

const inSrc = module => module.path.startsWith('src/');

export const coercionFindings = (graph, allowed = forgingAllowed) =>
  Object.entries(graph).filter(([name, module]) =>
  inSrc(module) && !allowed.includes(name)).flatMap(([name, module]) =>
  module.depends.filter(dependency => forgingModules.includes(dependency))
    .map(dependency => `${name} depends on ${dependency},`
    + ' which can produce a value of any type'));

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
const hasForeignJs = (name, path) =>
  existsSync(path.replace(/\.purs$/, '.js'))
  || existsSync(join('output', name, 'foreign.js'));

// Each src module with a foreign module or a foreign import: its
// signatures, or the reason they cannot be read.
export const foreignModules = (graph, read = readSource,
  hasJs = hasForeignJs) => Object.fromEntries(Object.entries(graph)
  .filter(([, module]) => inSrc(module)).flatMap(([name, module]) => {
  let entry;
  try {
    entry = { imports: foreignImports(read(module.path)) };
  } catch (error) {
    entry = { error: error.message };
  }
  return entry.imports?.length === 0 && !hasJs(name, module.path)
    ? [] : [[name, entry]];
}));

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const moduleFindings = (name, pinned, { imports, error }) => {
  if (pinned === undefined)
    return [`${name} has a foreign module or foreign import and no entry`
      + ` in ${foreignPinFile}; ${repin}`];
  if (error !== undefined)
    return [`${name}: cannot read its foreign imports (${error});`
      + ' fails closed'];
  if (same(pinned, imports)) return [];
  const added = imports.filter(item => !pinned.includes(item));
  const removed = pinned.filter(item => !imports.includes(item));
  return [`${name}: foreign imports differ from the pin`
    + (added.length > 0 ? `, added ${added.join(', ')}` : '')
    + (removed.length > 0 ? `, removed ${removed.join(', ')}` : '')
    + (added.length + removed.length === 0 ? ' (order)' : '')
    + `; ${repin}`];
};

export const foreignSurfaceFindings = (pin, modules) => [
  ...Object.entries(modules).flatMap(([name, entry]) =>
    moduleFindings(name, pin[name], entry)),
  ...Object.keys(pin).filter(name => !(name in modules)).map(name =>
    `${foreignPinFile} pins ${name}, which has no foreign module or`
    + ` foreign import; ${repin}`)];
