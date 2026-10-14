// Operation names for the FX001 reference interpreter (FX020 design §1-§4).
// Effects are known by declaration, Console { print } and Fail { fail }
// among them, so `Effect.op` resolves by declaration or through an alias
// of the enclosing function's own row, never by row. A function's aliases
// and imports seed its body's scope beneath its parameters, so binders,
// parameters, imports and globals shadow in that order, with no fallback.
// Shares no code with the compiler.
import { OracleError } from './fx-oracle-cleanup.mjs';

// The built-in operations are the interpreter's builtins of the same name.
const builtinEffects = new Map([['Console', 'print'], ['Fail', 'fail']]);

// An alias lives in the scope under a key no identifier can spell.
const aliasKey = name => `alias ${name}`;

export const operation = (program, env, effect, name) => {
  const target = env.get(aliasKey(effect)) ?? effect;
  if (builtinEffects.get(target) === name) {
    return { kind: 'builtin', name, arity: 1, args: [] };
  }
  const arity = program.effects.get(target)?.get(name);
  if (arity === undefined) {
    throw new OracleError(`unknown operation ${effect}.${name}`);
  }
  return { kind: 'op', name, effect: target, arity, args: [] };
};

// The scope a function's body starts in: its row's aliases and imports.
export const functionScope = (program, row) => {
  const scope = new Map();
  for (const item of row) {
    if (item.alias) scope.set(aliasKey(item.alias), item.head);
  }
  for (const item of row) {
    for (const [name, local] of item.imports) {
      scope.set(local, operation(program, scope, item.head, name));
    }
  }
  return scope;
};
