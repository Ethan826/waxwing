// R036 (1), T5: the loop and cycle listing of test/readback-total-scan.mjs
// for one compiled module. Each entry is keyed `Module.declaration` for
// a `tailRec`-family use or a JS loop statement (counted), `Module.{a,
// b}` for a cycle among top-level declarations, and
// `Module.declaration/{a,b}` for a cycle among one declaration's local
// bindings. Strongly connected components by Tarjan (1972); a component
// of one node counts only with a self-reference.
import { internals, parsed } from './readback-total-scan.mjs';

const { walk, references, declarations, namespaces, locals } = internals;
const recModule = 'Control.Monad.Rec.Class';
const loopTypes = new Set(['WhileStatement', 'DoWhileStatement',
  'ForStatement', 'ForInStatement', 'ForOfStatement']);

// Tarjan's strongly connected components of `edges` (node → Set).
export const components = edges => {
  const index = new Map();
  const low = new Map();
  const stack = [];
  const on = new Set();
  const found = [];
  let next = 0;
  const visit = node => {
    index.set(node, next);
    low.set(node, next);
    next += 1;
    stack.push(node);
    on.add(node);
    for (const target of edges.get(node) ?? []) {
      if (!index.has(target)) {
        visit(target);
        low.set(node, Math.min(low.get(node), low.get(target)));
      } else if (on.has(target))
        low.set(node, Math.min(low.get(node), index.get(target)));
    }
    if (low.get(node) !== index.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      on.delete(member);
      component.push(member);
    } while (member !== node);
    found.push(component.sort());
  };
  for (const node of edges.keys()) if (!index.has(node)) visit(node);
  return found;
};

// The cycles of a graph: components of two or more, or a self-edge.
export const cycles = edges => components(edges).filter(component =>
  component.length > 1 || edges.get(component[0])?.has(component[0]));

// Control.Monad.Rec.Class's loop drivers, from its compiled JS: every
// exported value but the `Step` constructors and the instances (object
// literals), so tailRec, tailRecM, forever, whileJust, untilJust, loop2
// and loop3 and their numbered forms, and any the package adds later.
export const recDrivers = js => {
  const program = parsed(js);
  const decls = declarations(program);
  const exported = program.body.filter(statement => statement.type
    === 'ExportNamedDeclaration').flatMap(statement => statement.specifiers
    .map(each => each.local.name));
  return new Set(exported.filter(name => decls.has(name)
    && decls.get(name).type !== 'ObjectExpression'
    && !isConstructor(name, decls.get(name))));
};

const isRec = (node, spaces, drivers) => node.type === 'MemberExpression'
  && node.object.type === 'Identifier'
  && spaces.get(node.object.name) === recModule
  && drivers.has(node.property.name ?? '');

// Uses of a loop driver under `node`: a member of the class module, or a
// top-level alias of one (`var tailRecM = …(monadRec…)`,
// `var x = tailRec(step)`).
const recUses = (node, spaces, drivers, aliases) => {
  let count = 0;
  walk(node, at => {
    if (isRec(at, spaces, drivers)) count += 1;
  });
  for (const name of references(node)) if (aliases.has(name)) count += 1;
  return count;
};
const loopCount = node => {
  let count = 0;
  walk(node, at => {
    if (loopTypes.has(at.type)) count += 1;
  });
  return count;
};
const isFunction = node => node.type === 'FunctionExpression'
  || node.type === 'ArrowFunctionExpression';

// A data constructor as purs compiles it: an immediately called
// function whose body declares the constructor's function and returns
// it. Its self-references build values; they recurse into nothing.
const isConstructor = (name, init) => init.type === 'CallExpression'
  && init.arguments.length === 0 && isFunction(init.callee)
  && init.callee.body.body.some(statement => statement.type
    === 'FunctionDeclaration' && statement.id.name === name)
  && init.callee.body.body.at(-1)?.type === 'ReturnStatement'
  && init.callee.body.body.at(-1).argument?.name === name;

const restricted = (names, found) => new Set([...found].filter(name =>
  names.has(name)));

// The entries of one module's compiled JS. An alias of a driver (a
// declaration that is not a function and uses one) is scanned like any
// declaration, so a point-free `x = tailRec step` is listed even when
// only another module calls it; its uses here are listed too.
export const scanModule = (name, js, drivers) => {
  const program = parsed(js);
  const spaces = namespaces(program);
  const decls = declarations(program);
  const aliases = new Set([...decls].filter(([, init]) => !isFunction(init)
    && recUses(init, spaces, drivers, new Set()) > 0).map(([alias]) =>
    alias));
  const entries = [];
  const edges = new Map();
  for (const [decl, init] of decls) {
    if (isConstructor(decl, init)) continue;
    const uses = recUses(init, spaces, drivers, new Set([...aliases]
      .filter(alias => alias !== decl)));
    if (uses > 0) entries.push({ key: `${name}.${decl}`, kind: 'tailRec',
      count: uses });
    const loops = loopCount(init);
    if (loops > 0) entries.push({ key: `${name}.${decl}`, kind: 'loop',
      count: loops });
    const local = locals(init);
    const names = new Set(local.keys());
    edges.set(decl, restricted(new Set(decls.keys()), references(init)));
    const localEdges = new Map([...local].map(([each, inits]) => [each,
      restricted(names, new Set(inits.flatMap(one =>
        [...references(one)])))]));
    for (const cycle of cycles(localEdges))
      entries.push({ key: `${name}.${decl}/{${cycle.join(',')}}`,
        kind: 'cycle', count: 1 });
  }
  for (const cycle of cycles(edges))
    entries.push({ key: `${name}.{${cycle.join(',')}}`, kind: 'cycle',
      count: 1 });
  return entries;
};
