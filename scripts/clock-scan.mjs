import { posix } from 'node:path';

// Finds clock reads in one module's parsed syntax tree, for the clock gate
// (scripts/structure-clocks.mjs, which lists the forms and blind spots).
// Only `parse` from acorn is used; the walk below is local. A bound name
// anywhere in the file (a declaration, parameter or import) makes that
// name local, so `performance` as an unrelated variable is not a clock.

const clockPaths = new Set(['performance.now', 'performance.timeOrigin',
  'performance.mark', 'performance.measure', 'Date.now', 'process.hrtime',
  'process.hrtime.bigint', 'console.time', 'console.timeEnd',
  'console.timeLog']);
const clockRoots = new Set(['performance', 'Date', 'process', 'console',
  'globalThis']);
const clockModules = new Set(['node:perf_hooks', 'perf_hooks']);
const timingHelpers = new Set(['test/go-timed.mjs', 'test/timing.mjs']);

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

const bindings = node => {
  const { type } = node;
  if (type === 'VariableDeclarator') return patternNames(node.id);
  if (type === 'ImportSpecifier' || type === 'ImportDefaultSpecifier'
    || type === 'ImportNamespaceSpecifier') return [node.local.name];
  if (type === 'CatchClause') return patternNames(node.param);
  const named = type === 'FunctionDeclaration' || type === 'ClassDeclaration'
    || type === 'FunctionExpression' || type === 'ClassExpression'
    ? patternNames(node.id) : [];
  return [...named, ...(node.params ?? []).flatMap(patternNames)];
};

const declaredNames = node =>
  new Set([...bindings(node), ...childrenOf(node).flatMap(child =>
    [...declaredNames(child)])]);

// The clock a full path names, or undefined. A leading `globalThis.` is
// the same name; `globalThis.performance` alone is itself a read.
const formOf = full => {
  if (full === 'globalThis.performance') return full;
  const bare = full.startsWith('globalThis.')
    ? full.slice('globalThis.'.length) : full;
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
  const declared = declaredNames(ast);
  const aliases = new Map();
  const findings = [];
  const imports = [];
  const report = (node, form) => findings.push({ file,
    line: node.loc.start.line, form,
    text: lines[node.loc.start.line - 1].trim() });
  const resolve = node => {
    const raw = pathOf(node);
    if (raw === undefined) return undefined;
    const [head, ...rest] = raw.split('.');
    const root = aliases.get(head) ?? (declared.has(head) ? undefined : head);
    return root === undefined ? undefined : [root, ...rest].join('.');
  };
  const noteAlias = (name, init) => {
    const full = init === null ? undefined : resolve(init);
    if (full !== undefined && clockRoots.has(full)) aliases.set(name, full);
  };
  const destructure = (pattern, base) => pattern.properties.forEach(
    property => {
      const name = property.type === 'Property'
        ? keyName(property.key, property.computed) : undefined;
      if (name === undefined) return;
      const child = `${base}.${name}`;
      if (formOf(child) !== undefined)
        report(property, `destructured ${formOf(child)}`);
      else if (property.value.type === 'ObjectPattern')
        destructure(property.value, child);
    });
  const bind = (pattern, init) => {
    if (init === null || init === undefined) return;
    const base = resolve(init);
    if (pattern.type === 'Identifier') noteAlias(pattern.name, init);
    else if (pattern.type === 'ObjectPattern' && base !== undefined)
      destructure(pattern, base);
  };
  const moduleRequest = (node, spec) => {
    if (clockModules.has(spec)) report(node, `import ${spec}`);
    if (!spec.startsWith('.')) return;
    const target = posix.normalize(posix.join(posix.dirname(file), spec));
    if (timingHelpers.has(target)) report(node, `import ${target}`);
    if (node.type !== 'ImportExpression') imports.push(target);
  };
  const visit = (node, parent) => {
    const { type } = node;
    if (type === 'MemberExpression') {
      const full = resolve(node);
      const form = full === undefined ? undefined : formOf(full);
      if (form !== undefined) return report(node, form);
    }
    if (type === 'VariableDeclarator') bind(node.id, node.init);
    if (type === 'AssignmentExpression' && node.operator === '=')
      bind(node.left, node.right);
    if (type === 'NewExpression' && node.arguments.length === 0
      && resolve(node.callee) === 'Date' && usedAsNumber(parent))
      report(node, 'new Date in arithmetic or comparison');
    if (importSource(node) !== undefined)
      moduleRequest(node, importSource(node));
    childrenOf(node).forEach(child => visit(child, node));
  };
  visit(ast, null);
  return { findings, imports };
};

const nonNumeric = new Set(['in', 'instanceof']);
const usedAsNumber = parent => parent !== null && (
  (parent.type === 'BinaryExpression' && !nonNumeric.has(parent.operator))
  || (parent.type === 'UnaryExpression'
    && ['+', '-'].includes(parent.operator)));
