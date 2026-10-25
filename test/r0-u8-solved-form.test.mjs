import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { supportFrom } from './r0-entailed-support.mjs';
import { stableStringify } from './r0-canonical.mjs';

// U8's solved form (docs/plans/r0-u8-solved-form.md §2): every variable
// in a witness binding's image is a declared rigid at its position's
// sort or a hole at one sort across the witness. Each must-refuse
// fixture goes through `certify` over a directly built problem
// (test/r0-entailed-support.mjs: x, y flexible types; r, s flexible
// rows; p rigid type 100; q rigid row 101) and keeps G0's `Valid`: the
// refusal is the compilation's, `NoWitness (UnsolvedImage v)`. Each has
// a positive control that is Witnessed.
const { Atom, t, v, problemOf } = await supportFrom(load);
const { certify } = await load('Features.Check.Strategy.Substitution');
const { certifiedCompilation } = await load('Domain.Verdict.Certified');
const { holeVar } = await load('Domain.Recorded.Hole');
const Origin = await load('Domain.Recorded.Origin');
const Map = await load('Data.Map.Internal');
const { Tuple } = await load('Data.Tuple');
const int = t.base('Int');

const candidate = bindings => bindings.reduce((made, [name, image]) =>
  Map.insert(Atom.ordVar)(v(name))(image)(made), Map.empty);
// 'Witnessed', or the reason and the variable it names; G0's refusal,
// if any, fails the test, since every fixture here is Valid.
const compiled = (bindings, options = {}) => {
  const found = certify(problemOf(options))(candidate(bindings));
  assert.equal(found.constructor.name, 'Right', 'G0 accepts σ');
  const compilation = certifiedCompilation(found.value0);
  if (compilation.constructor.name === 'Witnessed') return 'Witnessed';
  return [compilation.value0.constructor.name,
    stableStringify(compilation.value0.value0)];
};
const unsolved = name => ['UnsolvedImage', stableStringify(v(name))];

const rigid = id => new Atom.RigidVar(id);
const hole = index => new Atom.TVar(holeVar(index));
const holeRow = index => new Atom.Record([], [holeVar(index)]);
const made = index => new Atom.FreshVar({ root: Origin.InBody.value,
  steps: [new Origin.Named('entailed'), new Origin.Index(index)] },
Atom.Rest.value);

test('(a) an image naming an unbound flexible variable is refused', () => {
  assert.deepEqual(compiled([['x', t.tvar('y')]]), unsolved('x'));
  assert.equal(compiled([['x', int]]), 'Witnessed');
  assert.equal(compiled([['x', t.tvar('p')]]), 'Witnessed');
});

test('(a) with x = y, the solved form refuses before the hole contract',
  () => {
    const equations = [[t.tvar('x'), t.tvar('y')]];
    assert.deepEqual(compiled([['x', t.tvar('y')]], { equations }),
      unsolved('x'));
    assert.equal(compiled([['x', int], ['y', int]], { equations }),
      'Witnessed');
  });

test('(b) a record tail naming an unbound flexible row is refused', () => {
  assert.deepEqual(compiled([['r', t.record([['a', int]], ['s'])]]),
    unsolved('r'));
  assert.equal(compiled([['r', t.record([['a', int]], ['q'])]]),
    'Witnessed');
});

test('(c) a nested reference is refused at any depth', () => {
  for (const image of [t.box(t.tvar('y')), t.arrow(int, t.tvar('y')),
    t.arrow(t.tvar('y'), int), t.record([['a', t.tvar('y')]]),
    t.box(t.record([], ['s']))])
    assert.deepEqual(compiled([['x', image]]), unsolved('x'));
  for (const image of [t.box(t.tvar('p')), t.arrow(int, t.tvar('p')),
    t.arrow(t.tvar('p'), int), t.record([['a', t.tvar('p')]]),
    t.box(t.record([], ['q']))])
    assert.equal(compiled([['x', image]]), 'Witnessed');
});

test('(d) an out-of-scope or wrong-sort rigid is refused', () => {
  assert.deepEqual(compiled([['x', new Atom.TVar(rigid(999))]]),
    unsolved('x'));
  assert.deepEqual(compiled([['r', new Atom.Record([], [rigid(999)])]]),
    unsolved('r'));
  // q is a row rigid in a type position; p a type rigid as a tail.
  assert.deepEqual(compiled([['x', t.tvar('q')]]), unsolved('x'));
  assert.deepEqual(compiled([['r', t.record([], ['p'])]]), unsolved('r'));
  assert.equal(compiled([['x', t.tvar('p')], ['r', t.record([], ['q'])]]),
    'Witnessed');
});

test('(e) a made entailed variable is refused', () => {
  assert.deepEqual(compiled([['r', new Atom.Record([], [made(0)])]]),
    unsolved('r'));
  assert.equal(compiled([['r', t.record([], ['q'])]]), 'Witnessed');
});

test('(f) one hole at two sorts is refused', () => {
  // x is `Free 0` at the type sort, r `Free 0` at the row sort.
  // Charged to the first key mentioning it in `Ord Var` order, x.
  assert.deepEqual(compiled([['x', hole(0)], ['r', holeRow(0)]]),
    unsolved('x'));
  // The same, both inside `Inline` images.
  assert.deepEqual(compiled([['x', t.box(hole(0))],
    ['r', new Atom.Record([new Tuple('a', int)], [holeVar(0)])]]),
  unsolved('x'));
  assert.equal(compiled([['x', hole(0)], ['r', holeRow(1)]]), 'Witnessed');
  assert.equal(compiled([['x', t.box(hole(0))], ['y', hole(0)]]),
    'Witnessed');
});
