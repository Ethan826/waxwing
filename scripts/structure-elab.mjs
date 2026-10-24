// R0 Task 7.1a, D1 spec §3.1: rule E6 and the pinned export lists, read
// from the source because `purs graph` does not show re-exports. E6: a
// `module X` export whose imports reach a restricted module (E1-E5's,
// every Generate.* one, Domain.Recorded.Internal) must have the allowed
// form: `X` an alias, and every import bound to it `import P (T₁, …) as
// X` naming bare types, from the Internal module paired with the
// exporter, or a stated exception. An added export to a pinned module
// fails until it is reviewed and the pin below updated.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sourceExports } from './trusted-surface.mjs';

const restricted = new RegExp('^(Domain\\.Elaborating\\.(Build|Internal)'
  + '|Domain\\.Verdict\\.(Judged|Certified)\\.Internal'
  + '|Domain\\.Recorded\\.Internal'
  + '|Features\\.Check\\.Generate\\..+)$');
// The Internal module each public module re-exports from, with the
// stated exceptions: Generate.Elab's `Ref(..)` (§3.1); Generate's input
// and fault types (Tables and Signatures in §3.1; Inputs and
// GenerationFault a labelled amendment, Task 7.1a, since Task 3.2's
// fault is public).
const paired = {
  'Domain.Elaborating': { 'Domain.Elaborating.Internal': [] },
  'Domain.Verdict.Judged': { 'Domain.Verdict.Judged.Internal': [] },
  'Domain.Verdict.Certified': { 'Domain.Verdict.Certified.Internal': [] },
  'Domain.Recorded': { 'Domain.Recorded.Internal': [] },
  'Features.Check.Generate.Elab': {
    'Features.Check.Generate.Elab.Internal': ['Ref(..)'] },
  'Features.Check.Generate.Gen': {
    'Features.Check.Generate.Elab.Internal': [] },
  'Features.Check.Generate': { 'Features.Check.Generate.Inputs': [],
    'Features.Check.Generate.Fault': [] }
};

// Each import declaration: its module, the text in parentheses (null
// for an open import), `hiding`, and its alias. A declaration runs from
// a line starting `import` over its indented continuation lines. Block
// and line comments are removed first; a declaration the form still
// cannot read is `unread`, which is a finding (BACKLOG R027).
const importForm = new RegExp('^import\\s+([A-Z][\\w.]*)(\\s+hiding)?\\s*'
  + '(\\(([^()]|\\([^()]*\\))*\\))?\\s*(?:as\\s+([A-Z][\\w.]*))?\\s*$');
export const importsOf = source => source.split(/\n(?=\S)/)
  .filter(block => block.startsWith('import ')).map(block => {
    const text = withoutComments(block).replace(/\s+/g, ' ').trim();
    const match = importForm.exec(text);
    return match === null ? { text, unread: true } : { text,
      module: match[1], hiding: match[2] !== undefined,
      list: match[3] === undefined ? null : match[3].slice(1, -1).trim(),
      alias: match[5] ?? null };
  });

// PureScript block comments do not nest, so the first `-}` ends one.
const withoutComments = text => text.replace(/\{-[\s\S]*?-\}/g, ' ')
  .replace(/--[^\n]*/g, '');

const bareTypes = (list, exceptions) => list !== null && list !== ''
  && list.split(',').map(item => item.trim()).every(item =>
    /^[A-Z]\w*$/.test(item) || exceptions.includes(item));

const moduleName = source => /^module\s+([\w.]+)/m.exec(source)?.[1];

const aliasFindings = (file, name, alias, bound) => {
  if (!bound.some(found => found.unread || restricted.test(found.module)))
    return [];
  const allowed = paired[name] ?? {};
  const bad = bound.filter(found => found.unread || found.alias !== alias
    || found.hiding || !(found.module in allowed)
    || !bareTypes(found.list, allowed[found.module]));
  return bad.length === 0 ? [] : [`${file}: module ${alias} re-exports`
    + ` ${bad.map(found => found.text).join('; ')} outside the allowed form`];
};

// The module declaration, from `module` at the start of a line to its
// own `where`, line comments removed; `null` if there is none. A comment
// above the declaration may say "where" (review of 7.1a, Important 1).
export const declarationOf = source => {
  const start = /^module\s/m.exec(source);
  if (start === null) return null;
  const header = withoutComments(source.slice(start.index));
  return /^module\s+[A-Z][\w.]*[\s\S]*?\bwhere\b/.exec(header)?.[0] ?? null;
};

// Every `module X` export of every src module (or of `sources`).
export const reexportSourceFindings = (sources = srcSources()) =>
  Object.entries(sources).flatMap(([file, source]) => {
    const name = moduleName(source);
    const declaration = declarationOf(source);
    // An unreadable header is a finding, never "no re-exports" (review
    // of the repairs, P3-9).
    if (declaration === null)
      return [`${file}: a module header E6 cannot read`];
    const list = declaration.includes('(')
      ? declaration.slice(declaration.indexOf('(')) : '';
    const imports = importsOf(source);
    const unread = imports.filter(found => found.unread).map(found =>
      `${file}: an import E6 cannot read: ${found.text}`);
    return unread.concat([...list.matchAll(/\bmodule\s+([A-Z][\w.]*)/g)]
      .flatMap(([, alias]) => aliasFindings(file, name, alias,
        imports.filter(found => found.alias === alias
          || (found.alias === null && found.module === alias)))));
  });

const srcSources = () => Object.fromEntries(readdirSync('src',
  { recursive: true }).filter(file => file.endsWith('.purs')).map(file =>
  [join('src', file), readFileSync(join('src', file), 'utf8')]));

// Spec §3.1's pins (T3b), as they stand after Task 7.1a. `aliases`: the
// names each re-export alias's import lists.
export const pinnedExports = {
  'Domain.Elaborating': { exports: ['module Exports', 'positionsOf',
    'problem', 'requests', 'untracked'],
  aliases: { Exports: ['Elaborating'] } },
  'Domain.Elaborating.Build': { exports: ['build'], aliases: {} },
  'Domain.Verdict.Judged': { exports: ['module Exports', 'judgedProblem',
    'judgedSolution'], aliases: { Exports: ['Judged'] } },
  // BACKLOG R026's token, pinned like Judged (review of the repairs).
  'Domain.Verdict.Certified': { exports: ['module Exports',
    'certifiedCompilation', 'certifiedValidity'],
  aliases: { Exports: ['Certified'] } },
  // BACKLOG R029: `Elaboration`'s constructors hidden, read by its fold.
  'Features.Check.Elaborate': { exports: ['Elaboration', 'ElaborationCases',
    'covDomain', 'elaborate', 'foldElaboration'], aliases: {} },
  'Features.Check.Decide': { exports: ['Checking', 'Progress', 'decide',
    'judgedDecision', 'untilVerdict'], aliases: {} },
  'Features.Check.Generate': { exports: ['module Exports', 'generate',
    'generationInputs', 'generationProblem', 'staticRules'],
  aliases: { Exports: ['GenerationFault', 'Inputs', 'Signatures', 'Tables'] } },
  'Features.Check.Generate.Elab': { exports: ['module Exports', 'readRow',
    'readType', 'seal'], aliases: { Exports: ['Elab', 'GenTy', 'Handle',
    'Ref(..)'] } },
  'Features.Check.Generate.Gen': { exports: ['module Exports', 'GenAtom(..)',
    'GenEntry(..)', 'GenReq(..)', 'GenSite', 'Minted', 'Rigid', 'Tagged',
    'emit', 'fresh', 'lifted', 'positioned', 'rigid', 'slots'],
  aliases: { Exports: ['Gen'] } }
};

const aliasNames = (source, alias) => importsOf(source).filter(found =>
  found.alias === alias).flatMap(found => (found.list ?? '*').split(',')
  .map(item => item.trim())).sort();

// `sources`: module name to source text.
export const pinnedFindings = sources => Object.entries(pinnedExports)
  .flatMap(([name, pin]) => {
    const source = sources[name];
    if (source === undefined) return [`${name}: pinned but not found`];
    const exports = sourceExports(name, source);
    const aliases = Object.fromEntries(Object.keys(pin.aliases).map(alias =>
      [alias, aliasNames(source, alias)]));
    const same = JSON.stringify(exports) === JSON.stringify(pin.exports)
      && JSON.stringify(aliases) === JSON.stringify(Object.fromEntries(
        Object.entries(pin.aliases).map(([alias, names]) =>
          [alias, [...names].sort()])));
    return same ? [] : [`${name}: exports ${JSON.stringify(exports)}`
      + ` ${JSON.stringify(aliases)} differ from the pin`
      + ' (scripts/structure-elab.mjs; a change needs review)'];
  });

export const elabFindings = () => [...reexportSourceFindings(),
  ...pinnedFindings(Object.fromEntries(Object.keys(pinnedExports).map(name =>
    [name, readFileSync(`src/${name.split('.').join('/')}.purs`, 'utf8')])))];
