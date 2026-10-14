// FX020 migration: one Waxwing program (one-off; Task 7 removes it, R4).
// A program that resolves is rewritten from the resolver's own output:
// every Perform, OperationRef, Print, PrintRef and Fail node whose span
// starts at the bare operation name gains `Effect.` there. A qualified
// name starts with its uppercase qualifier, a renamed import with another
// name, and a name its function imports (`with Log { log }`) is left
// bare, so a second run finds nothing. Locals and clause heads are not
// such nodes. A program that does not resolve gets only token-stream
// candidates, for the manifest.
import { apply } from './fx020-editmap.mjs';

const operationNodes = new Set(['Perform', 'OperationRef', 'Print',
  'PrintRef', 'Fail']);
const builtin = { Print: ['print', 'Console'], PrintRef: ['print', 'Console'],
  Fail: ['fail', 'Fail'] };
const identifier = /[A-Za-z_][A-Za-z0-9_]*/y;

const nameAt = (source, offset) => {
  identifier.lastIndex = offset;
  return identifier.exec(source)?.[0];
};

const isSpan = value => typeof value?.start?.offset === 'number'
  && typeof value?.end?.offset === 'number';

// Iterative, so a deep program cannot overflow the stack.
const nodes = root => {
  const found = [];
  const pending = [root];
  while (pending.length > 0) {
    const item = pending.pop();
    if (item === null || typeof item !== 'object' || isSpan(item)) continue;
    if (operationNodes.has(item.constructor?.name)) found.push(item);
    for (const value of Object.values(item)) pending.push(value);
  }
  return found;
};

const operationOf = (node, effects) => {
  const known = builtin[node.constructor.name];
  if (known !== undefined) return known;
  const effect = effects[node.value1];
  return [effect.operations[node.value2].name, effect.name];
};

// The local names each function's signature imports, with its span.
const importScopes = syntax => syntax.functions.map(declaration => {
  const names = new Set();
  const pending = [declaration.parameters, declaration.result,
    declaration.row];
  while (pending.length > 0) {
    const item = pending.pop();
    if (item === null || typeof item !== 'object') continue;
    for (const entry of item.imports?.value0?.names ?? []) {
      names.add(entry.local);
    }
    for (const value of Object.values(item)) pending.push(value);
  }
  return { span: declaration.span, names };
});

const imported = (scopes, offset, name) => scopes.some(scope =>
  scope.span.start.offset <= offset && offset < scope.span.end.offset
  && scope.names.has(name));

const bareEdits = (source, syntax, program) => {
  const scopes = importScopes(syntax);
  const edits = new Map();
  for (const node of nodes(program.functions)) {
    const at = node.value0.start.offset;
    const [name, qualifier] = operationOf(node, program.effects);
    if (nameAt(source, at) !== name || source[at - 1] === '.'
      || imported(scopes, at, name)) continue;
    edits.set(at, { at, text: `${qualifier}.`, kind: 'qualifier', name });
  }
  return [...edits.values()].sort((left, right) => left.at - right.at);
};

const declaredOperations = program => [
  ['print', 'Console'], ['fail', 'Fail'],
  ...program.effects.flatMap(effect => effect.operations
    .map(operation => [operation.name, effect.name]))];

const rejection = (compiler, result, phase) => {
  const wire = compiler.wire(result.value0);
  return { status: 'rejected', phase,
    reason: `rejected ${wire.code} ${wire.message}` };
};

export const analyse = (compiler, source) => {
  try {
    const parsed = compiler.parse(source);
    if (parsed instanceof compiler.Left) {
      return rejection(compiler, parsed, 'parse');
    }
    const resolved = compiler.resolve(parsed.value0);
    if (resolved instanceof compiler.Left) {
      return rejection(compiler, resolved, 'resolve');
    }
    return { status: 'resolved', program: resolved.value0,
      edits: bareEdits(source, parsed.value0, resolved.value0),
      operations: declaredOperations(resolved.value0) };
  } catch (error) {
    return { status: 'rejected', phase: 'crash',
      reason: `crashed ${error.message}` };
  }
};

// The resolved program without its spans, to compare a program with its
// migrated twin: qualification must change positions only.
export const shape = program => {
  const parts = [];
  const pending = [program];
  while (pending.length > 0) {
    const item = pending.pop();
    if (item === null || typeof item !== 'object') {
      parts.push(String(item));
    } else if (isSpan(item)) parts.push('span');
    else {
      const keys = Object.keys(item);
      parts.push(`${item.constructor?.name}{${keys.join(',')}}`);
      for (const key of keys.reverse()) pending.push(item[key]);
    }
  }
  return parts.join(';');
};

// A resolved program's edits are trusted only if the rewritten text
// re-resolves to the same program (spans aside) with nothing left to
// rewrite.
export const verified = (compiler, source, analysed) => {
  const again = analyse(compiler, apply(source, analysed.edits));
  return again.status === 'resolved' && again.edits.length === 0
    && shape(again.program) === shape(analysed.program);
};
