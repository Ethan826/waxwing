// Support for Task 5.1's tests (T-R0a §5.2, AT5, AT6): recorded problems
// from source, two test-only rules over `SigProblem` values, and a
// bridge from a `SigProblem` to the bounded oracle's problems
// (research/composition-assessment/sig-oracle/bounded.mjs; its format
// is semantics.mjs's header). Neither rule is claimed sound: each is a
// stub that a test registers through test/r0-stubs.mjs.
import { boundedValid }
  from '../research/composition-assessment/sig-oracle/bounded.mjs';
import { generatedOrThrow, load, resolved } from './r0-generate-support.mjs';

const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Sig = await load('Features.Check.Refute.Sig');
const { Just, Nothing } = await load('Data.Maybe');

// The named declaration's `RecordedProblem`, as generation built it.
export const recorded = (source, name = 'f') => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  return generatedOrThrow(Generate.generate(tables)(signatures)(decl), name);
};

// A structural key of a compiled PureScript value: constructor names are
// kept, so `Res` and `Rest` (no fields) differ.
export const keyOf = value => JSON.stringify(value, (_, part) =>
  part !== null && typeof part === 'object' && !Array.isArray(part)
    && part.constructor !== Object
    ? { [part.constructor.name]: { ...part } } : part);

const baseName = base => base.constructor.name === 'DataBase'
  ? `D${base.value0}` : base.constructor.name.replace(/Base$/, '');

// Variables are numbered per sort in order of first mention; the rigid
// lists keep their own, and every other variable is flexible.
export const toOracle = sig => {
  const tys = new Map();
  const rows = new Map();
  const number = (map, value) => {
    const key = keyOf(value);
    if (!map.has(key)) map.set(key, map.size);
    return map.get(key);
  };
  const expr = t => {
    switch (t.constructor.name) {
    case 'SigBase': return { k: 'b', b: baseName(t.value0) };
    case 'SigArrow': return { k: 'f', a: expr(t.value0), c: expr(t.value1) };
    case 'SigTVar': return { k: 'v', n: number(tys, t.value0) };
    case 'SigRecord': return { k: 'r', fields: t.value0.map(field =>
      [field.value0, expr(field.value1)]),
    tails: t.value1.map(tail => number(rows, tail)) };
    }
    throw new Error(`unknown expression ${t.constructor.name}`);
  };
  const atom = ({ atom: a }) => {
    switch (a.constructor.name) {
    case 'SigEqual': return ['eq', expr(a.value0), expr(a.value1)];
    case 'SigLacks': return ['lacks', number(rows, a.value0), a.value1];
    case 'SigDisjoint':
      return ['disjoint', number(rows, a.value0), number(rows, a.value1)];
    case 'SigFf': return ['ff'];
    }
    throw new Error(`unknown atom ${a.constructor.name}`);
  };
  const [D, B] = [sig.d.map(atom), sig.b.map(atom)];
  const rigidTys = sig.rigidTy.map(v => number(tys, new Sig.Named(v)));
  const rigidRows = sig.rigidRow.map(v => number(rows, v));
  const flexible = (map, rigid) =>
    [...map.values()].filter(n => !rigid.includes(n));
  return { D, B, rigidTys, rigidRows, flexTys: flexible(tys, rigidTys),
    flexRows: flexible(rows, rigidRows) };
};

export const bounded = sig => boundedValid(toOracle(sig)).verdict;

const derived = (rule, entry) => entry === undefined ? Nothing.value
  : new Just({ rule, premises: [entry.id], blame: [] });

// C1-H's shape on one equation: top-level heads differ (base, arrow,
// record) or two bases differ; neither side a variable.
const headOf = t => t instanceof Sig.SigBase ? `base ${baseName(t.value0)}`
  : t instanceof Sig.SigArrow ? 'arrow'
    : t instanceof Sig.SigRecord ? 'record' : null;
const clashes = ({ atom: a }) => a instanceof Sig.SigEqual
  && headOf(a.value0) !== null && headOf(a.value1) !== null
  && headOf(a.value0) !== headOf(a.value1);
export const clashApply = sig => derived('test-clash', sig.b.find(clashes));

// Reads `D`: fires on a body record with a field `l` and a rigid tail
// `r` when `D` has no `lacks r l` (the composition may be undefined).
// On a sub-`D` it fires where the whole `D` forbids it (CX X7's lesson).
export const compositionApply = sig => {
  const rigid = new Set(sig.rigidRow.map(keyOf));
  const lacked = new Set(sig.d.filter(({ atom: a }) =>
    a instanceof Sig.SigLacks).map(({ atom: a }) =>
    keyOf([a.value0, a.value1])));
  const open = t => t instanceof Sig.SigRecord && t.value1.some(tail =>
    rigid.has(keyOf(tail)) && t.value0.some(field =>
      !lacked.has(keyOf([tail, field.value0]))));
  return derived('test-composition', sig.b.find(({ atom: a }) =>
    a instanceof Sig.SigEqual && (open(a.value0) || open(a.value1))));
};
