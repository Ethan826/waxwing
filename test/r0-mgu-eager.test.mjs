import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { grammarTerms, mulberry32, sampled, supportFrom }
  from './r0-entailed-support.mjs';
import { eagerFrom } from './r0-mgu-eager.mjs';

// BACKLOG R021, review I-2: the triangular unifier
// (Features.Check.Entailed.Mgu) gives exactly the eager unifier's answer
// (test/r0-mgu-eager.mjs, the replaced algorithm) on every fragment
// problem of G-EG (one equation, all; the pinned two-equation sample)
// and of a seeded generator with multi-parameter spines, chained rows,
// more variables and ill-sorted uses (a row variable as a type, a type
// variable as a tail: `fragment` does not check sorts). Equality is
// asserted on well-sorted problems. An ill-sorted problem can differ (a
// variable bound as a type, then again as a tail, is read at its later
// binding where the eager algorithm had substituted the earlier one),
// and neither answer is a safe reading (token re-review B-1), so every
// ill-sorted fragment problem must be refused: `reduction` answers
// OutsideFragment, and production `wellSorted` agrees with this file's
// predicate. Review I-1's case is ill-sorted: it is refused, and its
// unifier answer is asserted equal on its own (the place counter it
// tests matters only off the precondition, since a well-sorted problem
// never binds a variable twice). Differing ill-sorted problems are
// counted. A bounded check: it proves nothing beyond these problems.
const { t, problemOf } = await supportFrom(load);
const eager = await eagerFrom(load);
const { mgu } = await load('Features.Check.Entailed.Mgu');
const Entailed = await load('Features.Check.Entailed');
const { fragment } = Entailed;
const Atom = await load('Domain.Recorded.Atom');
const Origin = await load('Domain.Recorded.Origin');
const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const { Tuple } = await load('Data.Tuple');
const taken = problemOf({}).vars;

// Constructor-tagged, so `TVar v` and `Base b` never print alike.
const serial = value => {
  if (value === null || typeof value !== 'object')
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(serial).join(',')}]`;
  return `${value.constructor.name}{${Object.keys(value).map(key =>
    `${key}:${serial(value[key])}`).join(',')}}`;
};
const shown = theta => (theta === null ? 'Nothing'
  : serial(Map.toUnfoldable(unfoldableArray)(theta)));
const triangular = equations => {
  const found = mgu(taken)(equations.map(([one, other]) =>
    new Tuple(one, other)));
  return found.constructor.name === 'Just' ? found.value0 : null;
};

const fresh = index => new Atom.FreshVar({ root: Origin.InBody.value,
  steps: [new Origin.Index(index)] }, new Atom.Param(index));
const types = [t.tvar('x').value0, t.tvar('y').value0,
  ...[40, 41, 42, 43].map(fresh)];
const tails = [t.record([], ['r']).value1[0], t.record([], ['s']).value1[0],
  ...[50, 51, 52].map(fresh)];
const rigid = [t.tvar('p').value0, t.record([], ['q']).value1[0]];

const generator = seed => {
  const next = mulberry32(seed);
  const pick = items => items[Math.floor(items.length * next())];
  const variable = () => (next() < 0.05 ? pick(tails)
    : next() < 0.05 ? rigid[0] : pick(types));
  const tail = () => (next() < 0.05 ? pick(types)
    : next() < 0.05 ? rigid[1] : pick(tails));
  const term = depth => {
    const roll = depth <= 0 ? next() * 0.4 : next();
    if (roll < 0.08) return t.base(pick(['Int', 'Bool']));
    if (roll < 0.5) return new Atom.TVar(variable());
    if (roll < 0.6) return Array.from({ length: 1 + Math.floor(4 * next()) },
      () => term(depth - 1)).reduceRight((rest, ty) => t.arrow(ty, rest),
      term(depth - 1));
    if (roll < 0.7) return t.box(term(depth - 1));
    const labels = ['a', 'b', 'c'].filter(() => next() < 0.4);
    return new Atom.Record(labels.map(label =>
      new Tuple(label, term(depth - 1))), next() < 0.6 ? [tail()] : []);
  };
  // A chain: `{ ...ρ } = { l: T | ρ′ }`.
  const chained = () => [new Atom.Record([], [tail()]),
    new Atom.Record([new Tuple(pick(['a', 'b', 'c']), term(1))], [tail()])];
  const equation = () => (next() < 0.3 ? chained() : [term(2), term(2)]);
  return () => Array.from({ length: 2 + Math.floor(5 * next()) }, equation);
};

// No variable is both a type variable and a record tail.
const wellSorted = equations => {
  const asType = new Set();
  const asTail = new Set();
  const walk = ty => {
    if (ty instanceof Atom.TVar) asType.add(serial(ty.value0));
    else if (ty instanceof Atom.Arrow) [ty.value0, ty.value1].forEach(walk);
    else if (ty instanceof Atom.App) ty.value1.forEach(walk);
    else if (ty instanceof Atom.Record) {
      ty.value0.forEach(field => walk(field.value1));
      ty.value1.forEach(variable => asTail.add(serial(variable)));
    }
  };
  equations.flat().forEach(walk);
  return [...asType].every(variable => !asTail.has(variable));
};

// The problem's reduction of a type it does not mention.
const refusal = equations => Entailed.reduction(problemOf({ equations }))(
  t.base('Int')).constructor.name;

// Review I-1: ρ both a type and a tail, bound twice.
const [rho, sigma, z] = [fresh(10), fresh(11), fresh(30)];
const reviewCase = [[new Atom.TVar(rho), t.base('Int')],
  [t.tvar('x'), t.tvar('y')], [new Atom.Record([], [rho]),
    new Atom.Record([new Tuple('a', new Atom.TVar(z))], [sigma])],
  [new Atom.TVar(z), t.base('Bool')]];

test('the triangular unifier gives the eager answer (R021, I-2, B-1)', () => {
  const terms = grammarTerms(t);
  const random = generator(2026);
  const problems = [reviewCase,
    ...terms.flatMap(one => terms.map(other => [[one, other]])),
    ...sampled(terms), ...Array.from({ length: 40000 }, random)];
  const counted = { wellSorted: 0, answered: 0, illSorted: 0,
    illSortedDiffering: 0, outside: 0 };
  const differing = [];
  const admitted = [];
  for (const equations of problems) {
    if (!equations.flat().every(fragment)) {
      counted.outside += 1;
      continue;
    }
    const found = shown(triangular(equations));
    const agrees = found === shown(eager(taken, equations));
    const sorted = wellSorted(equations);
    assert.equal(Entailed.wellSorted(equations.map(([one, other]) =>
      new Tuple(one, other))), sorted);
    if (!sorted) {
      counted.illSorted += 1;
      if (!agrees) counted.illSortedDiffering += 1;
      if (refusal(equations) !== 'OutsideFragment') admitted.push(equations);
      if (equations === reviewCase) assert.ok(agrees, 'review I-1 case');
      continue;
    }
    counted.wellSorted += 1;
    if (found !== 'Nothing') counted.answered += 1;
    if (!agrees) differing.push(equations);
  }
  assert.equal(differing.length, 0, `${differing.length} differ`);
  assert.equal(admitted.length, 0, `${admitted.length} ill-sorted admitted`);
  assert.ok(counted.wellSorted > 30000 && counted.answered > 5000
    && counted.illSorted > 10000, JSON.stringify(counted));
  console.log(`R021 differential: ${JSON.stringify(counted)}`);
});
