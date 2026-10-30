import { posix } from 'node:path';

// Finds clock reads in one module's parsed syntax tree, for the clock gate
// (scripts/structure-clocks.mjs, which lists the forms and blind spots).
// Only `parse` from acorn is used; the walk below is local. A name bound in
// an enclosing lexical scope (declaration, parameter, import, catch clause,
// loop head) is local there, so `performance` as an unrelated variable is
// not a clock, and a local elsewhere in the file does not hide the root.

const clockPaths = new Set(['performance.now', 'performance.timeOrigin',
  'performance.mark', 'performance.measure', 'Date.now', 'process.hrtime',
  'process.hrtime.bigint', 'console.time', 'console.timeEnd',
  'console.timeLog']);
const clockRoots = new Set(['performance', 'Date', 'process', 'console',
  'globalThis', 'global']);
const clockModules = new Set(['node:perf_hooks', 'perf_hooks']);
const timingHelpers = new Set(['test/go-timed.mjs', 'test/growth.mjs',
  'test/timing.mjs']);

const isNode = value => typeof value?.type === 'string';
const childrenOf = node => Object.values(node).flatMap(value =>
  Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []);

const keyName = (property, computed) => {
  if (property.type === 'Identifier' && !computed) return property.name;
  return property.type === 'Literal' && typeof property.value === 'string'
    ? property.value : undefined;
};

const pathOf = node => {
  if (node.type === 'Identifier') return node.name;
  if (node.type !== 'MemberExpression') return undefined;
  const head = pathOf(node.object);
  const name = keyName(node.property, node.computed);
  return head === undefined || name === undefined ? undefined
    : `${head}.${name}`;
};

const patternNames = pattern => {
  if (pattern === null || pattern === undefined) return [];
  const { type } = pattern;
  if (type === 'Identifier') return [pattern.name];
  if (type === 'AssignmentPattern') return patternNames(pattern.left);
  if (type === 'RestElement') return patternNames(pattern.argument);
  if (type === 'ArrayPattern') return pattern.elements.flatMap(patternNames);
  return type === 'ObjectPattern' ? pattern.properties.flatMap(property =>
    patternNames(property.value ?? property.argument)) : [];
};

// Scopes. A statement list declares its let/const/class/function/import
// names (modules are strict, so a block's function is block-scoped); `var`
// is hoisted to the nearest function, static block or Program.
const lexicalNames = statement => {
  const { type } = statement;
  if (type === 'VariableDeclaration') return statement.kind === 'var' ? []
    : statement.declarations.flatMap(entry => patternNames(entry.id));
  if (type === 'ClassDeclaration' || type === 'FunctionDeclaration')
    return patternNames(statement.id);
  if (type === 'ImportDeclaration')
    return statement.specifiers.map(entry => entry.local.name);
  return type.startsWith('Export') && statement.declaration
    ? lexicalNames(statement.declaration) : [];
};

const isFunction = type => type === 'FunctionDeclaration'
  || type === 'FunctionExpression' || type === 'ArrowFunctionExpression';
const varsIn = node => childrenOf(node).flatMap(varNames);
const varNames = node => {
  if (isFunction(node.type) || node.type === 'StaticBlock') return [];
  return node.type === 'VariableDeclaration' && node.kind === 'var'
    ? node.declarations.flatMap(entry => patternNames(entry.id))
    : varsIn(node);
};

// Names a node declares for its own scope, or undefined when it opens none.
const scopeNames = node => {
  const { type } = node;
  if (type === 'Program' || type === 'StaticBlock')
    return [...node.body.flatMap(lexicalNames), ...varsIn(node)];
  if (isFunction(type)) return [
    ...(type === 'FunctionExpression' ? patternNames(node.id) : []),
    ...node.params.flatMap(patternNames), ...varNames(node.body)];
  if (type === 'BlockStatement') return node.body.flatMap(lexicalNames);
  if (type === 'SwitchStatement')
    return node.cases.flatMap(entry => entry.consequent.flatMap(lexicalNames));
  if (type === 'CatchClause') return patternNames(node.param);
  if (type === 'ForStatement') return node.init ? lexicalNames(node.init) : [];
  if (type === 'ForInStatement' || type === 'ForOfStatement')
    return lexicalNames(node.left);
  return type === 'ClassExpression' ? patternNames(node.id) : undefined;
};

const lookup = (name, scope) => {
  for (let at = scope; at !== null; at = at.parent)
    if (at.names.has(name)) return at;
  return undefined;
};

// The clock a full path names, or undefined. A leading `globalThis.` is
// the same name (so is `global.`); `globalThis.performance` alone is a read.
const bareOf = full => full.replace(/^(globalThis|global)\./, '');
const formOf = full => {
  if (full === 'globalThis.performance' || full === 'global.performance')
    return 'globalThis.performance';
  const bare = bareOf(full);
  return clockPaths.has(bare) ? bare : undefined;
};

// The module named by an import, `export … from` or `import()`.
const importSource = node =>
  node.source?.type === 'Literal' && typeof node.source.value === 'string'
    ? node.source.value : undefined;

export const scanSource = (file, source, parse) => {
  const lines = source.split('\n');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module',
    locations: true, allowHashBang: true });
  const findings = [];
  const imports = [];
  const report = (node, form) => findings.push({ file,
    line: node.loc.start.line, form,
    text: lines[node.loc.start.line - 1].trim() });
  const resolve = (node, scope) => {
    const raw = pathOf(node);
    if (raw === undefined) return undefined;
    const [head, ...rest] = raw.split('.');
    const owner = lookup(head, scope);
    const root = owner === undefined ? head : owner.aliases.get(head);
    return root === undefined ? undefined : [root, ...rest].join('.');
  };
  const noteAlias = (name, init, scope) => {
    const full = resolve(init, scope);
    const owner = lookup(name, scope);
    if (full !== undefined && clockRoots.has(full) && owner !== undefined)
      owner.aliases.set(name, full);
  };
  const destructure = (pattern, base, scope) => pattern.properties.forEach(
    property => {
      const name = property.type === 'Property'
        ? keyName(property.key, property.computed) : undefined;
      if (name === undefined) return;
      const child = `${base}.${name}`;
      if (formOf(child) !== undefined)
        report(property, `destructured ${formOf(child)}`);
      else if (property.value.type === 'ObjectPattern')
        destructure(property.value, child, scope);
    });
  const bind = (pattern, init, scope) => {
    if (init === null || init === undefined) return;
    const base = resolve(init, scope);
    if (pattern.type === 'Identifier') noteAlias(pattern.name, init, scope);
    else if (pattern.type === 'ObjectPattern' && base !== undefined)
      destructure(pattern, base, scope);
  };
  const moduleRequest = (node, spec) => {
    if (clockModules.has(spec)) report(node, `import ${spec}`);
    if (!spec.startsWith('.')) return;
    const target = posix.normalize(posix.join(posix.dirname(file), spec));
    if (timingHelpers.has(target)) report(node, `import ${target}`);
    if (node.type !== 'ImportExpression') imports.push(target);
  };
  const visit = (node, outer) => {
    const { type } = node;
    const names = scopeNames(node);
    const scope = names === undefined ? outer : { names: new Set(names),
      aliases: new Map(), parent: outer };
    if (type === 'MemberExpression') {
      const full = resolve(node, scope);
      const form = full === undefined ? undefined : formOf(full);
      if (form !== undefined) return report(node, form);
    }
    if (type === 'VariableDeclarator') bind(node.id, node.init, scope);
    if (type === 'AssignmentExpression' && node.operator === '=')
      bind(node.left, node.right, scope);
    if (type === 'NewExpression' && node.arguments.length === 0) {
      const callee = resolve(node.callee, scope);
      if (callee !== undefined && bareOf(callee) === 'Date')
        report(node, 'new Date()');
    }
    if (importSource(node) !== undefined)
      moduleRequest(node, importSource(node));
    childrenOf(node).forEach(child => visit(child, scope));
  };
  visit(ast, null);
  return { findings, imports };
};
