// RT1's independent translator (T-R0b §9 item 1; Task 3.3): the state of
// one declaration's translation and the canonical forms it builds
// (test/r0-canonical.mjs). Written from T-R0b alone; see
// test/r0-translator.mjs for the readings it fixes.
import { compareVar, comparePath, sortedVars } from './r0-canonical.mjs';

export const listNames = ['d', 'q', 'b', 'bq', 'outside', 'adm', 'split'];

export const contextOf = (program, decl) => ({
  program, decl,
  lists: Object.fromEntries(listNames.map(name => [name, []])),
  vars: new Map(), types: new Map(), counters: new Map(),
  rigidTy: [], rigidRow: []
});

const keyOf = value => JSON.stringify(value);

// A child's path: the parent's steps, then the child's (`Call`, `args`,
// 2): constructor, field, index (§6).
export const at = (path, ...steps) =>
  ({ root: path.root, steps: [...path.steps, ...steps] });

export const bodyPath = { root: 'body', steps: [] };

// A site is where a rule emits: `{ path, rule, span, kind }`. `index` is
// the entry's position among the entries this rule emits at this path,
// in the rule's listed order (§6 "Index"), counted over every list.
export const emit = (cx, site, list, row, value, change = {}) => {
  const counter = `${keyOf(site.path)} ${site.rule}`;
  const index = cx.counters.get(counter) ?? 0;
  cx.counters.set(counter, index + 1);
  cx.lists[list].push({ origin: {
    atom: { decl: cx.decl.id, path: site.path, index },
    rule: site.rule, row, span: change.span ?? site.span,
    kind: change.kind ?? site.kind
  }, value });
};

// A fresh variable `⟨p, role⟩` (§2.3) entered in `vars` (§5.2). G-fresh:
// a name introduced twice is a translator defect, so it throws.
export const fresh = (cx, site, role, sort, position, span = site.span) => {
  const variable = { fresh: { path: site.path, role } };
  const key = keyOf(variable);
  if (cx.vars.has(key))
    throw new Error(`r0-translator: ${key} introduced twice`);
  cx.vars.set(key, [variable, { sort, quant: 'exists',
    origin: { path: site.path, role, rule: site.rule, span }, position }]);
  return variable;
};

export const rigid = (cx, index, sort, span) => {
  const variable = { rigid: index };
  cx.vars.set(keyOf(variable), [variable, { sort, quant: { forall: index },
    origin: { path: { root: 'parameters', steps: ['variables', index] },
      role: null, rule: 'Sig1', span }, position: { rigidName: index } }]);
  (sort === 'type' ? cx.rigidTy : cx.rigidRow).push(variable);
};

export const typed = (cx, path, type) => {
  cx.types.set(keyOf(path), [path, type]);
  return type;
};

// Canonical builders. An arrow's spine is flat: a result that is itself
// an arrow joins the spine.
export const base = name => ({ base: name });
export const tvar = variable => ({ tvar: variable });
export const eq = (left, right) => ({ eq: [left, right] });
export const arrow = (params, result) => {
  if (params.length === 0) return result;
  if (result.fun) return { fun: { params: [...params, ...result.fun.params],
    result: result.fun.result } };
  return { fun: { params, result } };
};
const byLabel = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);
export const record = (fields, tails) => ({ record: {
  fields: [...fields].sort(byLabel), tails: sortedVars(tails) } });

// The problem in canonical form (test/r0-canonical.mjs's order).
export const finish = cx => {
  const vars = [...cx.vars.values()].sort((a, b) => compareVar(a[0], b[0]));
  const flexible = sort => vars.filter(([, info]) =>
    info.quant === 'exists' && info.sort === sort).map(([found]) => found);
  return {
    decl: cx.decl.id, rigidTy: cx.rigidTy, rigidRow: cx.rigidRow,
    flexTy: flexible('type'), flexRow: flexible('row'),
    ...cx.lists, vars,
    types: [...cx.types.values()].sort((a, b) => comparePath(a[0], b[0]))
  };
};
