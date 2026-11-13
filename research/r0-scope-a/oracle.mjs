// Oracle O-A, as amended by A1 (docs/plans/2026-11-13-scope-a-free-
// constructor-design.md §9, recorded before any run). For every program
// of the fixed grammar, the recorded problem of `f`, the unifier's
// candidate, and the compiler's own `substitutionOnly`: where it returns
// `Valid` (markers DataApplication alone or none, `BQ` empty), every `B`
// atom must hold in this file's evaluator of the free-constructor model
// `GA`, under every enumerated rigid assignment satisfying `D`, with each
// flexible variable at its candidate image. Bounded evidence only.
// usage: node research/r0-scope-a/oracle.mjs
import { decodeType, decodeVar } from '../../test/r0-canonical-decode.mjs';
import { load, problemsOf, resolved } from '../../test/r0-generate-support.mjs';
import { stubsFrom } from '../../test/r0-stubs.mjs';
import { g0From } from '../../test/r0-g0-support.mjs';

const stubs = await stubsFrom(load);
const g0 = await g0From(load, stubs);
const MapM = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const named = value => value.constructor.name;

const decls = 'type L(a) = N | C(a, L(a)); type P(a, b) = P(a, b);'
  + ' type T(a) = T(Int); fn main(): Int = 0;';
const types = ['Int', 'Bool', 'a', 'L(Int)', 'L(a)', 'P(a, Int)', 'T(Bool)',
  '{ x: Int, ...r }', '{ x: a }'];
const bodies = ['p', 'q', 'C(p, N)', 'C(q, N)', 'P(p, 1)', 'P(q, true)',
  'T(1)', '{ x: p }', 'p.x', 'q.x', 'N'];

// Values of GA as JSON; a row is an object from labels to values.
const L = 0;
const P = 1;
const T = 2;
const rigidTypes = [{ base: 'Int' }, { base: 'Bool' }, { base: 'β' },
  { app: [L, [{ base: 'Int' }]] },
  { app: [P, [{ base: 'Bool' }, { base: 'Int' }]] },
  { app: [T, [{ base: 'Int' }]] }, { record: { x: { base: 'Int' } } }];
const rigidRows = [{}, { y: { base: 'Int' } },
  { y: { app: [L, [{ base: 'Bool' }]] } }, { x: { base: 'Int' } }];

const key = variable => JSON.stringify(variable);
const canonical = value => JSON.stringify(value, (_, v) =>
  (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort()) : v));

// The value a canonical type denotes, or undefined.
const evaluate = (env, ty) => {
  if ('base' in ty) return { base: typeof ty.base === 'string' ? ty.base
    : `data${ty.base.data}` };
  if ('tvar' in ty) return env.ty(ty.tvar);
  if ('fun' in ty) {
    const parts = [...ty.fun.params, ty.fun.result]
      .map(part => evaluate(env, part));
    return parts.includes(undefined) ? undefined : { fun: parts };
  }
  if ('app' in ty) {
    const args = ty.app.args.map(arg => evaluate(env, arg));
    return args.includes(undefined) ? undefined
      : { app: [ty.app.head.data ?? ty.app.head, args] };
  }
  if ('record' in ty) {
    const row = {};
    const add = (label, value) => {
      if (value === undefined || label in row) return false;
      row[label] = value;
      return true;
    };
    for (const [label, field] of ty.record.fields)
      if (!add(label, evaluate(env, field))) return undefined;
    for (const tail of ty.record.tails) {
      const more = env.row(tail);
      if (more === undefined) return undefined;
      for (const [label, value] of Object.entries(more))
        if (!add(label, value)) return undefined;
    }
    return { record: row };
  }
  throw new Error(`type ${JSON.stringify(ty)}`);
};

const holds = (env, atom) => {
  if (atom === 'ff') return false;
  if ('eq' in atom) {
    const [one, other] = atom.eq.map(ty => evaluate(env, ty));
    return one !== undefined && other !== undefined
      && canonical(one) === canonical(other);
  }
  if ('lacks' in atom) {
    const row = env.row(atom.lacks[0]);
    return row !== undefined && !(atom.lacks[1] in row);
  }
  if ('disjoint' in atom) {
    const [one, other] = atom.disjoint.map(env.row);
    return one !== undefined && other !== undefined
      && Object.keys(one).every(label => !(label in other));
  }
  throw new Error(`atom ${JSON.stringify(atom)}`);
};

const counts = { programs: 0, refused: 0, judged: 0, outOfScope: 0,
  noCandidate: 0, notValid: 0, valid: 0, assignments: 0, failures: 0,
  controlProblems: 0, controlFailing: 0 };
const failures = [];
for (const t1 of types) for (const t2 of types) for (const t3 of types)
  for (const body of bodies) {
    counts.programs += 1;
    const source = `fn f(p: ${t1}, q: ${t2}): ${t3} = ${body}; ${decls}`;
    let canon;
    let problem;
    try {
      canon = problemsOf(resolved(source)).find(x => x.decl.name === 'f')
        .problem;
      problem = stubs.recorded.problem(source, 'f');
    } catch {
      counts.refused += 1;
      continue;
    }
    counts.judged += 1;
    if (canon.outside.some(entry => entry.value !== 'DataApplication')
      || canon.bq.length > 0) {
      counts.outOfScope += 1;
      continue;
    }
    let candidate;
    try {
      candidate = g0.candidateOf(problem);
    } catch {
      counts.noCandidate += 1;
      continue;
    }
    // The negative control: on candidates the check refuses, the
    // evaluator must find failing atoms, or it could not fail at all.
    const valid = named(g0.check(problem, candidate)) === 'Right';
    if (valid) counts.valid += 1;
    else {
      counts.notValid += 1;
      counts.controlProblems += 1;
    }
    const image = new Map(MapM.toUnfoldable(unfoldableArray)(candidate)
      .map(pair => [key(decodeVar(pair.value0)), decodeType(pair.value1)]));
    const sortOf = new Map(canon.vars.map(([variable, info]) =>
      [key(variable), info.sort]));
    let failingControl = false;
    for (const a of rigidTypes) for (const r of rigidRows) {
      const rigid = { ty: a, row: r };
      const env = {
        ty: variable => ('rigid' in variable ? rigid.ty
          : image.has(key(variable))
            ? evaluate(env, image.get(key(variable))) : { base: 'Int' }),
        row: variable => {
          if ('rigid' in variable) return rigid.row;
          if (!image.has(key(variable))) return {};
          const value = evaluate(env, image.get(key(variable)));
          return value?.record;
        } };
      if (!canon.d.every(entry => holds(env, entry.value))) continue;
      const broken = canon.b.filter(entry => !holds(env, entry.value));
      if (!valid) {
        if (broken.length > 0) failingControl = true;
        continue;
      }
      counts.assignments += 1;
      if (broken.length > 0) {
        counts.failures += 1;
        if (failures.length < 5) failures.push({ source, a, r,
          broken: broken.map(entry => entry.value) });
      }
      void sortOf;
    }
    if (failingControl) counts.controlFailing += 1;
  }
console.log(JSON.stringify({ counts, failures }, null, 1));
process.exitCode = counts.failures === 0 && counts.controlFailing > 0
  ? 0 : 1;
