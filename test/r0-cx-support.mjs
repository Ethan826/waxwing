// Support for Task 5.2's CX tests: an independent bounded brute-force
// re-evaluation of a counter-instance, written from CX
// refute/statements.md §4, not from the check's code. The sub-problem
// `withBody (toSig P) body` goes through Task 5.1's bridge to the
// sig-oracle (test/r0-rules-support.mjs `toOracle`); `ρ` becomes the
// oracle's rigid assignment, its ground values canonical strings
// (research/composition-assessment/sig-oracle/semantics.mjs). Then
// (1) `D` is evaluated under `ρ` exactly: a scoped `D` mentions only
// rigid variables; (2) `solve` searches the sub-body's flexible
// assignments in a bounded domain: rows over the
// labels written in the sub-body and in `ρ` (Lean's R1, proved: written
// labels suffice), each field one of `fieldValues` or the ground values
// `ρ` uses, and each type variable forced by an equation or one of those
// values or a value the sub-body builds. (2) is bounded
// evidence of unsatisfiability, not a proof; a search past its limit
// throws `BeyondBound` rather than passing.
import { builtValues, evalT, product, rowsOver, sat, scan }
  from '../research/composition-assessment/sig-oracle/semantics.mjs';
import { keyOf, toOracle } from './r0-rules-support.mjs';

const named = value => value.constructor.name;
export const fieldValues = ['Int', 'Bool', '{}', '(Int->Int)'];
export const domainLimit = 5_000_000;

// The brute force's bound was reached: no claim either way.
export class BeyondBound extends Error {}

const baseName = base => (named(base) === 'DataBase' ? `D${base.value0}`
  : named(base).replace(/Base$/, ''));

const recordString = row => evalT({ ty: () => null, row: () => row },
  { k: 'r', fields: [], tails: [0] });

export const groundOf = ground => {
  switch (named(ground)) {
  case 'GroundBase': return baseName(ground.value0);
  case 'GroundFresh': return `#${ground.value0}`;
  case 'GroundArrow':
    return `(${groundOf(ground.value0)}->${groundOf(ground.value1)})`;
  case 'GroundRecord': return recordString(rowOf(ground.value0));
  }
  throw new Error(`unknown CXGround ${named(ground)}`);
};

const rowOf = fields => Object.fromEntries(fields.map(pair =>
  [pair.value0, groundOf(pair.value1)]));

// `ρ`'s binding of a variable, by structural key.
const bindingOf = (pairs, variable) => {
  const found = pairs.filter(pair => keyOf(pair.value0) === keyOf(variable));
  if (found.length !== 1) throw new Error('rho does not bind it once');
  return found[0].value1;
};

// The oracle's rigid assignment `ρ` denotes, in toOracle's numbering
// (each rigid list keeps its order there).
export const rigidOf = (sig, oracle, rho) => new Map([
  ...sig.rigidTy.map((variable, at) => [`t${oracle.rigidTys[at]}`,
    groundOf(bindingOf(rho.ty, variable))]),
  ...sig.rigidRow.map((variable, at) => [`r${oracle.rigidRows[at]}`,
    rowOf(bindingOf(rho.row, variable))])]);

const thetaOf = rigid => ({ ty: n => rigid.get(`t${n}`),
  row: r => rigid.get(`r${r}`) });

// The sub-body is every `B` atom carrying a certificate id.
export const subProblem = (sig, ids) => ({ ...sig, b: sig.b.filter(entry =>
  ids.some(id => keyOf(id) === keyOf(entry.id))) });

// The flexible search. Rows range over the bounded domain; then a type
// variable an equation forces (`v = e`, no unassigned variable in `e`)
// takes `e`'s value, and only an unforced one ranges over `values` and
// the values the sub-body builds. Forcing loses no solution; whatever
// assignment it reaches is tested with `sat` on the whole sub-body. It
// throws past `domainLimit` assignments.
const varsOf = t => (t.k === 'v' ? [t.n] : t.k === 'f'
  ? [...varsOf(t.a), ...varsOf(t.c)]
  : t.k === 'r' ? t.fields.flatMap(([, ft]) => varsOf(ft)) : []);

const forcedOf = (atoms, theta, open) => {
  for (const atom of atoms.filter(found => found[0] === 'eq'))
    for (const [side, other] of [[atom[1], atom[2]], [atom[2], atom[1]]])
      if (side.k === 'v' && open.has(side.n)
        && varsOf(other).every(n => !open.has(n)))
        return { n: side.n, value: evalT(theta, other) };
  return null;
};

// `n` is a whole side of an equation, so it may be forced later.
const bare = (atoms, n) => atoms.some(atom => atom[0] === 'eq'
  && [atom[1], atom[2]].some(side => side.k === 'v' && side.n === n));

// The values of the sub-body's closed subexpressions (no variable, no
// tail): candidates for a flexible row's fields.
export const closedValues = atoms => {
  const out = new Set();
  const visit = t => {
    if (t.k === 'f') { visit(t.a); visit(t.c); }
    if (t.k === 'r') t.fields.forEach(([, ft]) => visit(ft));
    if (varsOf(t).length > 0 || tailsOf(t).length > 0) return;
    const value = evalT({ ty: () => null, row: () => ({}) }, t);
    if (value !== null) out.add(value);
  };
  atoms.filter(atom => atom[0] === 'eq').forEach(atom => {
    visit(atom[1]); visit(atom[2]); });
  return [...out];
};

const tailsOf = t => (t.k === 'f' ? [...tailsOf(t.a), ...tailsOf(t.c)]
  : t.k === 'r' ? [...t.tails, ...t.fields.flatMap(([, ft]) => tailsOf(ft))]
    : []);

export const solve = (oracle, rigid, rows, values, limit = domainLimit) => {
  let tried = 0;
  const thetaOf = (pick, tys) => ({
    ty: n => rigid.get(`t${n}`) ?? tys.get(n),
    row: r => rigid.get(`r${r}`) ?? pick.get(`r${r}`) });
  const assign = (pick, tys) => {
    tried += 1;
    if (tried > limit) throw new BeyondBound(`over ${limit} assignments`);
    const theta = thetaOf(pick, tys);
    const open = new Set(oracle.flexTys.filter(n => !tys.has(n)));
    if (open.size === 0) return sat(theta, oracle.B) ? tys : null;
    const forced = forcedOf(oracle.B, theta, open);
    if (forced !== null) return forced.value === null ? null
      : assign(pick, new Map(tys).set(forced.n, forced.value));
    const first = [...open].find(n => !bare(oracle.B, n)) ?? [...open][0];
    const built = builtValues(theta, oracle.B, open);
    for (const value of new Set([...values, ...built])) {
      const found = assign(pick, new Map(tys).set(first, value));
      if (found !== null) return found;
    }
    return null;
  };
  for (const pick of product(oracle.flexRows.map(r => `r${r}`), () => rows)) {
    const found = assign(pick, new Map());
    if (found !== null) return { rows: Object.fromEntries(pick),
      tys: Object.fromEntries(found) };
  }
  return null;
};

export const recheck = (sig, cx, limit = domainLimit) => {
  const sub = subProblem(sig, cx.body);
  const oracle = toOracle(sub);
  const rigid = rigidOf(sub, oracle, cx.rho);
  const given = [...rigid.values()].flatMap(value =>
    typeof value === 'string' ? [value] : Object.values(value));
  const values = [...new Set([...fieldValues, ...given,
    ...closedValues(oracle.B)])];
  const labels = new Set(scan(oracle.B).labels);
  for (const value of rigid.values())
    if (typeof value !== 'string') Object.keys(value).forEach(label =>
      labels.add(label));
  const rows = rowsOver([...labels], () => values);
  return { dHolds: sat(thetaOf(rigid), oracle.D),
    solution: solve(oracle, rigid, rows, values, limit) };
};
