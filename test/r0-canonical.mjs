// The one canonical serialization of a recorded problem (ruling R9;
// T-R0b §10, §6; Task 3.1's types in src/Domain/Recorded*.purs). RT1
// (Task 3.3), RT3 (Task 3.6) and Task 4.1 read problems through it.
//
// Canonical data, plain JSON (the generator's problems are decoded into
// it through Domain.Recorded's `fields`; RT1's translator emits it):
//   Path     { root: 'body'|'constraints'|'parameters'|'result'|'joined',
//              steps: [string | number] }      Named → string, Index → n
//   Var      { rigid: i } | { fresh: { path, role } }
//   Role     { inst: i } | 'res' | { param: k } | { field: l } | 'rest'
//            | { upd: l } | { updrest: l } | { spread: j }
//   RTExpr   { base: 'Int'|'Bool'|'Text'|'Unit'|{ data: t } }
//            | { fun: { params: [RTExpr], result } }   an arrow spine,
//              `result` never an arrow, so the form is unique and a
//              long spine is a loop, not nesting
//            | { tvar: Var } | { record: { fields: [[l, RTExpr]], tails } }
//            | { app: { head: { data: t } | { handler: e }, args } }
//              e: a declared effect's id, or 'Console' | 'Fail'
//   Atom     { eq: [t, u] } | { lacks: [Var, l] } | { disjoint: [Var, Var] }
//            | 'ff';  ReqAtom { pr: t } | { cmp: t };  Outside: its name
//   CallSite { callee: { function: n } | { ctor: n }, slots: [Var] }
//   Origin   { atom: { decl, path, index }, rule: 'Sig3'|'E5'|'P6',
//              row: 'B1', span, kind: 'contract'|'types'|'body'|'inst' }
//   VarInfo  { sort: 'type'|'row', quant: { forall: i } | 'exists',
//              origin: { path, role: Role | null, rule, span }, position }
//   position { rigidName: i } | { slot: [path, i] } | { nodeType: path }
//            | { paramType: [path, k] } | { lambdaBody: path }
//            | { patternType: path } | { restType: path } | 'auxiliary'
//   problem  §10's fields; `vars` and `types` as [key, value] pairs;
//            `holders` { declared: [t], holding: [t] }, ascending
//            (ruling K-a).
//
// Canonical order (stated here, checked by `outOfOrder`): a record's
// fields ascend by label (code units, PureScript's Ord String) and its
// tails by `compareVar`, the derived Ord Var; `vars` ascends by
// `compareVar` and `types` by `comparePath`, as Data.Map yields them.
// `canonicalOf` keeps the entry arrays and `flexTy`/`flexRow` in
// recorded order (RT3 compares bytes); RT1's translator emits
// `flexTy`/`flexRow` ascending by `compareVar`, so a comparison of them
// sorts both (`sortedVars`), and `entryMultiset` sorts entries for RT1's
// multisets. Record fields and tails must be strictly ascending: a
// repeated label or tail is out of order.
// `encodeProblem` is JSON with object keys sorted.
import { canonicalOf } from './r0-canonical-decode.mjs';

export { canonicalOf };

const compareNumbers = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const compareStrings = compareNumbers;
const rank = (order, value) => order.indexOf(value);
const roots = ['body', 'constraints', 'parameters', 'result', 'joined'];
const roles = ['inst', 'res', 'param', 'field', 'rest', 'upd', 'updrest',
  'spread'];

// Named before Index (constructor order), then by value.
const compareStep = (a, b) => typeof a !== typeof b
  ? (typeof a === 'string' ? -1 : 1)
  : (typeof a === 'string' ? compareStrings(a, b) : compareNumbers(a, b));

// Data.Array's Ord: element by element, then the shorter first.
const compareArrays = (compare, a, b) => {
  for (let at = 0; at < Math.min(a.length, b.length); at += 1) {
    const found = compare(a[at], b[at]);
    if (found !== 0) return found;
  }
  return compareNumbers(a.length, b.length);
};

// A record's derived Ord compares its labels alphabetically: `root`,
// then `steps`.
export const comparePath = (a, b) =>
  compareNumbers(rank(roots, a.root), rank(roots, b.root))
  || compareArrays(compareStep, a.steps, b.steps);

const roleName = role => (typeof role === 'string' ? role
  : Object.keys(role)[0]);

export const compareRole = (a, b) => {
  const name = roleName(a);
  const found = compareNumbers(rank(roles, name), rank(roles, roleName(b)));
  if (found !== 0 || typeof a === 'string') return found;
  return compareStep(a[name], b[name]);
};

// RigidVar before FreshVar; a fresh one by path, then role.
export const compareVar = (a, b) => ('rigid' in a) !== ('rigid' in b)
  ? ('rigid' in a ? -1 : 1)
  : ('rigid' in a ? compareNumbers(a.rigid, b.rigid)
    : comparePath(a.fresh.path, b.fresh.path)
      || compareRole(a.fresh.role, b.fresh.role));

// JSON with every object's keys sorted. Depth follows nesting only:
// spines are arrays (above).
export const stableStringify = value => JSON.stringify(value,
  (key, found) => (found && typeof found === 'object'
    && !Array.isArray(found)
    ? Object.fromEntries(Object.keys(found).sort()
      .map(name => [name, found[name]]))
    : found));

export const entryLists = ['d', 'q', 'b', 'bq', 'outside', 'adm', 'split'];

// RT1's multiset: every entry as `[list, Origin.atom, value]`, sorted.
export const entryMultiset = problem => entryLists.flatMap(list =>
  problem[list].map(entry =>
    stableStringify([list, entry.origin.atom, entry.value]))).sort();

const sortedBy = (compare, items) => [...items].sort(compare);
const inOrder = (compare, items, strict = false) =>
  items.every((item, at) => at === 0
    || compare(items[at - 1], item) < (strict ? 0 : 1));
const fieldOrder = ([a], [b]) => compareStrings(a, b);

// Every record of a canonical value whose fields or tails are out of
// canonical order, and whether `vars` and `types` are; [] when canonical.
export const outOfOrder = problem => {
  const found = [];
  const visit = value => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    if (value.record && !(inOrder(fieldOrder, value.record.fields, true)
      && inOrder(compareVar, value.record.tails, true)))
      found.push(stableStringify(value));
    Object.values(value).forEach(visit);
  };
  visit(problem);
  if (!inOrder((a, b) => compareVar(a[0], b[0]), problem.vars))
    found.push('vars');
  if (!inOrder((a, b) => comparePath(a[0], b[0]), problem.types))
    found.push('types');
  return found;
};

export const sortedVars = items => sortedBy(compareVar, items);

// A whole canonical problem as one string, with every array whose order
// is recorded rather than canonical sorted: the entry lists and the
// flexible variables (RT1's whole-problem comparison; RT2 reuses it).
export const wholeProblem = problem => stableStringify({ ...problem,
  ...Object.fromEntries(entryLists.map(list =>
    [list, problem[list].map(stableStringify).sort()])),
  flexTy: sortedVars(problem.flexTy), flexRow: sortedVars(problem.flexRow)
});

// A generated problem (Domain.Recorded's opaque type), encoded.
export const encodeProblem = problem => stableStringify(canonicalOf(problem));
