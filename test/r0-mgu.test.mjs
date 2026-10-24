import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { grammarTerms, sampled, supportFrom } from './r0-entailed-support.mjs';

// The unifier itself (Features.Check.Entailed.Mgu; BACKLOG R021): the
// occurs check, bindings read back through a chain, and, over G-EG's
// one-equation problems and its pinned two-equation sample, that every
// answer is an idempotent unifier of its equations.
const { t, problemOf } = await supportFrom(load);
const { mgu } = await load('Features.Check.Entailed.Mgu');
const { fragment } = await load('Features.Check.Entailed');
const { substitute } = await load('Features.Check.Entailed.Merge');
const { mentions } = await load('Features.Check.Mentions');
const Atom = await load('Domain.Recorded.Atom');
const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const { Tuple } = await load('Data.Tuple');
const int = t.base('Int');
const bool = t.base('Bool');
const rowOf = name => t.record([], [name]);
const taken = problemOf({}).vars;
const same = (one, other) => Atom.eqRTExpr.eq(one)(other);

const solve = equations => mgu(taken)(equations.map(([one, other]) =>
  new Tuple(one, other)));
const entries = theta => Map.toUnfoldable(unfoldableArray)(theta);

// θ binds exactly `expected`'s variables, each to its type.
const binds = (equations, expected) => {
  const found = solve(equations);
  assert.equal(found.constructor.name, 'Just');
  const theta = found.value0;
  assert.equal(entries(theta).length, expected.length);
  for (const [variable, ty] of expected) {
    const image = Map.lookup(Atom.ordVar)(variable)(theta);
    assert.ok(image.constructor.name === 'Just' && same(image.value0, ty));
  }
};
const v = ty => ty.value0;
const tail = ty => ty.value1[0];

test('mgu: the occurs check refuses a type, a chain and a row', () => {
  assert.equal(solve([[t.tvar('x'), t.box(t.tvar('x'))]])
    .constructor.name, 'Nothing');
  assert.equal(solve([[t.tvar('x'), t.arrow(t.tvar('y'), int)],
    [t.tvar('y'), t.tvar('x')]]).constructor.name, 'Nothing');
  assert.equal(solve([[rowOf('r'), t.record([['a', rowOf('r')]])]])
    .constructor.name, 'Nothing');
});

test('mgu: a later binding reaches an earlier image', () => {
  binds([[t.tvar('y'), t.box(t.tvar('x'))], [t.tvar('x'), int]],
    [[v(t.tvar('y')), t.box(int)], [v(t.tvar('x')), int]]);
  binds([[rowOf('r'), t.record([['a', t.tvar('x')]], ['s'])],
    [rowOf('s'), t.record([['b', int]])], [t.tvar('x'), bool]],
  [[tail(rowOf('r')), t.record([['a', bool], ['b', int]])],
    [tail(rowOf('s')), t.record([['b', int]])], [v(t.tvar('x')), bool]]);
  // r's image reaches y through s, three bindings deep, so the last
  // equation contradicts y = Int.
  assert.equal(solve([[rowOf('r'), t.record([['a', t.tvar('x')]], ['s'])],
    [rowOf('s'), t.record([['b', t.tvar('y')]])], [t.tvar('y'), int],
    [rowOf('r'), t.record([['a', bool], ['b', bool]])]])
    .constructor.name, 'Nothing');
});

// Equal up to the order of record fields and tails.
const sorted = (items, key) => [...items].sort((one, other) =>
  key(one) < key(other) ? -1 : (key(one) > key(other) ? 1 : 0));
const canonical = ty => {
  if (ty instanceof Atom.Arrow)
    return new Atom.Arrow(canonical(ty.value0), canonical(ty.value1));
  if (ty instanceof Atom.App)
    return new Atom.App(ty.value0, ty.value1.map(canonical));
  if (!(ty instanceof Atom.Record)) return ty;
  const fields = ty.value0.map(field =>
    new Tuple(field.value0, canonical(field.value1)));
  return new Atom.Record(sorted(fields, field => field.value0),
    sorted(ty.value1, JSON.stringify));
};
const rowEqual = (one, other) => same(canonical(one), canonical(other));

// Every answer: no image mentions a bound variable, and both sides of
// every equation are equal under θ.
const unifies = (equations, theta) => {
  const bound = new Set(entries(theta).map(entry => entry.value0));
  const isBound = variable => [...bound].some(other =>
    Atom.eqVar.eq(variable)(other));
  for (const entry of entries(theta))
    assert.ok(!mentions(isBound)(entry.value1), 'idempotent');
  for (const [one, other] of equations) {
    const left = substitute(theta)(one);
    const right = substitute(theta)(other);
    assert.ok(left.constructor.name === 'Just'
      && right.constructor.name === 'Just'
      && rowEqual(left.value0, right.value0), 'a unifier');
  }
};

// Both callers solve only fragment problems (Entailed `fragment`).
const inFragment = equations => equations.flat().every(fragment);

test('mgu: every G-EG answer is an idempotent unifier', () => {
  const terms = grammarTerms(t);
  const problems = [
    ...terms.flatMap(one => terms.map(other => [[one, other]])),
    ...sampled(terms)
  ];
  let answered = 0;
  for (const equations of problems.filter(inFragment)) {
    const found = solve(equations);
    if (found.constructor.name !== 'Just') continue;
    unifies(equations, found.value0);
    answered += 1;
  }
  assert.ok(answered > 1000, `only ${answered} answers`);
});
