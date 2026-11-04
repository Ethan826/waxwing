// R036 (1), T5 (dossier §18.161 (3)): the read-back's termination and
// partiality audit scan (docs/plans/2026-11-04-readback-termination-
// audit.md). Evidence, not a proof of totality or exception freedom:
// it lists what it can see, and the reviewed table states an argument
// for each loop and cycle it lists.
//
// Over the src modules in the module closure of ReadBack.Package (from
// `purs graph`): forbidden imports and constraints (partiality, unsafe
// effects, laziness; the test adds scripts/forgery.mjs's forging
// modules, as a cross-check of that scan), src FFI, and from each
// module's compiled JS (parsed with acorn, never matched as text):
// every `tailRec`-family use, every JS loop statement, and every
// reference cycle among declarations (Tarjan, "Depth-first
// search and linear graph algorithms", SIAM J. Comput. 1(2), 1972),
// top-level and local. PureScript's module graph is acyclic, so a cycle
// through src code is a reference cycle inside one module.
//
// Limits (reasoned): local bindings are matched by name within their
// top-level declaration, so two locals of one name merge and a
// parameter named like a local or a top-level declaration adds an edge
// (both over-approximate: a spurious row, never a missed cycle).
// Library code (its loops, FFI and partiality) is outside the scan and
// trusted as the package set is; so is the runtime (stack depth, memory).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';

export const root = 'Features.Check.Strategy.ReadBack.Package';
export const forbiddenImports = ['Partial', 'Partial.Unsafe',
  'Effect.Unsafe', 'Effect.Exception.Unsafe', 'Data.Array.Partial',
  'Control.Lazy', 'Data.Lazy'];
const recModule = 'Control.Monad.Rec.Class';
const recNames = /^tailRec(M)?\d*$/;

// The module closure of `from` over `graph` (name → { path, depends }).
export const closure = (graph, from = root) => {
  const seen = new Set();
  const stack = [from];
  while (stack.length > 0) {
    const name = stack.pop();
    if (seen.has(name) || graph[name] === undefined) continue;
    seen.add(name);
    stack.push(...graph[name].depends);
  }
  return [...seen].sort();
};
export const srcClosure = (graph, from = root) => closure(graph, from)
  .filter(name => graph[name].path.startsWith('src/'));

const importsOf = source => [...source.matchAll(/^import\s+([\w.]+)/gm)]
  .map(match => match[1]);
const partialConstraint = /\bPartial\s*(⇒|=>)/;

// Forbidden imports, `Partial` constraints and FFI, per src module.
// `read(path)` gives a source; `hasJs(path)` whether a foreign file is
// beside it.
export const surfaceFindings = (graph, modules, read, hasJs,
  forbidden = forbiddenImports) =>
  modules.flatMap(name => {
    const { path } = graph[name];
    const source = read(path);
    return [
      ...importsOf(source).filter(imported => forbidden.includes(imported))
        .map(imported => `${name} imports ${imported}`),
      ...(partialConstraint.test(source) ? [`${name} has a Partial `
        + 'constraint'] : []),
      ...(/^foreign import /m.test(source) || hasJs(path)
        ? [`${name} has FFI`] : [])];
  });

// The scan's entries against the reviewed table, both ways: an entry
// with no row (a new loop or cycle, or a changed count) and a row with
// no entry (a stale argument). Every row must state an argument.
export const tableFindings = (entries, table) => {
  const derived = entries;
  const id = entry => `${entry.kind} ${entry.key} ×${entry.count}`;
  const listed = new Set(table.map(id));
  const found = new Set(derived.map(id));
  return [
    ...derived.filter(entry => !listed.has(id(entry))).map(entry =>
      `no reviewed termination argument for ${id(entry)}`),
    ...table.filter(row => !found.has(id(row))).map(row =>
      `the table lists ${id(row)}, which the scan no longer finds`),
    ...table.filter(row => !(row.argument?.trim().length > 0)).map(row =>
      `the table's row ${id(row)} states no argument`)];
};

export const readSource = path => readFileSync(path, 'utf8');
export const besideJs = path => existsSync(path.replace(/\.purs$/, '.js'));

// Every node under `node` with its parent's key, by an explicit stack.
const walk = (node, visit) => {
  const stack = [[node, null, null]];
  while (stack.length > 0) {
    const [at, parent, key] = stack.pop();
    visit(at, parent, key);
    for (const [name, value] of Object.entries(at))
      for (const child of Array.isArray(value) ? value : [value])
        if (child !== null && typeof child === 'object'
          && typeof child.type === 'string') stack.push([child, at, name]);
  }
};
const lazyName = name => name.replace(/^\$lazy_/, '');
const isPropertyName = (parent, key) => (parent?.type === 'MemberExpression'
  && key === 'property' && !parent.computed)
  || (parent?.type === 'Property' && key === 'key' && !parent.computed);

// Identifier references under `node`, property names excluded.
const references = node => {
  const found = new Set();
  walk(node, (at, parent, key) => {
    if (at.type === 'Identifier' && !isPropertyName(parent, key))
      found.add(lazyName(at.name));
  });
  return found;
};

// A compiled module's top-level declarations (name → init) and import
// namespaces (alias → module name).
const declarations = program => new Map(program.body.flatMap(statement =>
  (statement.type === 'VariableDeclaration' ? statement.declarations
    .filter(each => each.init !== null)
    .map(each => [lazyName(each.id.name), each.init]) : [])));
const namespaces = program => new Map(program.body.filter(statement =>
  statement.type === 'ImportDeclaration').flatMap(statement =>
  statement.specifiers.filter(each => each.type
    === 'ImportNamespaceSpecifier').map(each => [each.local.name,
  statement.source.value.replace(/^\.\.\/|\/index\.js$/g, '')])));

// Local named bindings inside a declaration: name → [init].
const locals = init => {
  const found = new Map();
  const add = (name, node) => found.set(name, [...(found.get(name) ?? []),
    node]);
  walk(init, at => {
    if (at.type === 'VariableDeclarator' && at.init !== null)
      add(at.id.name, at.init);
    if (at.type === 'FunctionDeclaration' && at.id !== null) add(at.id.name,
      at);
  });
  return found;
};

export const parsed = js => parse(js, { ecmaVersion: 'latest',
  sourceType: 'module' });
export const internals = { walk, references, declarations, namespaces,
  locals, lazyName };
