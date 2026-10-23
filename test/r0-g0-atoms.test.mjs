import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { supportFrom } from './r0-entailed-support.mjs';

// Task 4.2 fix round 1 (review I-2): `checkSubstitution`'s equality,
// entailment, genericity and `ff` arms, each driven by a candidate that
// is not the problem's own unifier, with a positive control beside each
// refusal. Problems are built directly (test/r0-entailed-support.mjs).
const { Atom, t, v, problemOf } = await supportFrom(load);
const { checkSubstitution } =
  await load('Features.Check.Strategy.Substitution');
const Map = await load('Data.Map.Internal');
const Set = await load('Data.Set');
const int = t.base('Int');

const candidate = bindings => bindings.reduce((made, [name, image]) =>
  Map.insert(Atom.ordVar)(v(name))(image)(made), Map.empty);
// The refusal's constructor name, or 'Right'.
const checked = (options, bindings = []) => {
  const found = checkSubstitution(Set.empty)(problemOf(options))(
    candidate(bindings));
  return found.constructor.name === 'Right' ? 'Right'
    : found.value0.constructor.name;
};

test('an equation whose sides σ makes unequal is Unsatisfied', () => {
  const equations = [[t.tvar('x'), int]];
  assert.equal(checked({ equations }, [['x', t.base('Bool')]]),
    'Unsatisfied');
  assert.equal(checked({ equations }, [['x', int]]), 'Right');
});

test('a lacks atom D does not list is NotEntailed; one it lists holds',
  () => {
    const b = [new Atom.Lacks(v('q'), 'a')];
    assert.equal(checked({ b }), 'NotEntailed');
    assert.equal(checked({ b, d: [new Atom.Lacks(v('q'), 'a')] }), 'Right');
  });

test('a disjoint atom D does not entail is NotEntailed; one it does holds',
  () => {
    const b = [new Atom.Disjoint(v('q'), v('s'))];
    const added = [['s', t.record([['b', int]])]];
    assert.equal(checked({ b }, added), 'NotEntailed');
    assert.equal(checked({ b }, [['s', t.record([], ['q'])]]),
      'NotEntailed');
    assert.equal(checked({ b, d: [new Atom.Lacks(v('q'), 'b')] }, added),
      'Right');
  });

test('a candidate that is not generic is NotGeneric', () => {
  const equations = [[t.tvar('x'), t.tvar('y')]];
  assert.equal(checked({ equations }, [['p', int]]), 'NotGeneric');
  assert.equal(checked({}, [['r', int]]), 'NotGeneric');
  assert.equal(checked({ equations }, [['x', t.tvar('y')], ['y', int]]),
    'NotGeneric');
  assert.equal(checked({ equations }, [['x', int], ['y', int]]), 'Right');
});

test('an ff atom is Unsatisfied under any candidate', () => {
  assert.equal(checked({ b: [Atom.Ff.value] }), 'Unsatisfied');
  assert.equal(checked({ b: [] }), 'Right');
});
