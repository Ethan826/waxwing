import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { supportFrom } from './r0-entailed-support.mjs';
import { evaluate, solutions, variablesOf } from './r0-entailed-eval.mjs';

// Task 4.2, `entailedGround` (docs/plans/r0-entailed-ground.md §6): the
// hand list, one problem per R5 row and for R4, with each answer exact
// and each `Just` non-vacuous in the note's domain; the cycles; several
// tails; the guard fixture; and the structural "no σ" check.
const { t, problemOf, pr } = await supportFrom(load);
const Entailed = await load('Features.Check.Entailed');
const Guard = await load('Features.Check.Strategy.Guard');
const int = t.base('Int');
const bool = t.base('Bool');
const rowOf = name => t.record([], [name]);

// The answer as a value string, or null for `Nothing`.
const answer = (equations, atom) => {
  const found = Entailed.entailedGround(problemOf({ equations }))(
    { value: pr(atom) });
  return found.constructor.name === 'Just'
    ? evaluate(Entailed.groundType(found.value0), new Map()) : null;
};

// Some solution in the domain, and every one gives the atom `value`.
const nonVacuous = (equations, atom, value) => {
  const variables = new Map();
  for (const ty of [...equations.flat(), atom]) variablesOf(ty, variables);
  const found = solutions(equations, variables);
  assert.ok(found.length > 0, 'vacuous');
  for (const assignment of found)
    assert.equal(evaluate(atom, assignment), value);
};

const hand = [
  ['R4', [[t.tvar('x'), int]], t.tvar('x'), 'Int'],
  ['none, none', [[t.record([['a', t.tvar('x')]]), t.record([['a', int]])]],
    t.tvar('x'), 'Int'],
  ['none, ρ′', [[t.record([['a', int]]), rowOf('r')]], rowOf('r'),
    '{a:Int}'],
  ['ρ, ρ', [[t.record([['a', t.tvar('x')]], ['r']),
    t.record([['a', int]], ['r'])], [rowOf('r'), t.record([])]],
  t.tvar('x'), 'Int'],
  ['ρ, ρ′, A = B = ∅', [[rowOf('r'), rowOf('s')],
    [rowOf('s'), t.record([['b', int]])]], rowOf('r'), '{b:Int}'],
  ['A ≠ ∅ = B', [[t.record([['a', int]], ['r']), rowOf('s')],
    [rowOf('r'), t.record([])]], rowOf('s'), '{a:Int}'],
  ['A = ∅ ≠ B', [[rowOf('r'), t.record([['b', int]], ['s'])],
    [rowOf('s'), t.record([])]], rowOf('r'), '{b:Int}'],
  ['fresh ρ″', [[t.record([['a', int]], ['r']),
    t.record([['b', int]], ['s'])], [rowOf('s'), t.record([['a', int]])]],
  rowOf('r'), '{b:Int}'],
  ['merge', [[t.record([['a', int]], ['r']), t.record([['a', int]], ['s'])],
    [rowOf('s'), t.record([['b', bool]])]], t.record([['a', int]], ['r']),
  '{a:Int,b:Bool}']
];

for (const [row, equations, atom, value] of hand)
  test(`entailedGround, ${row}: Just ${value}, non-vacuous`, () => {
    assert.equal(answer(equations, atom), value);
    nonVacuous(equations, atom, value);
  });

test('entailedGround: the two cycles terminate with Nothing', () => {
  assert.equal(answer([[t.record([['a', rowOf('r')]], ['r']),
    t.record([['b', rowOf('s')]], ['s'])]], rowOf('r')), null);
  assert.equal(answer([[t.record([['a', int]], ['r']), rowOf('r')]],
    rowOf('r')), null);
});

test('entailedGround: Nothing with two tail variables in one record', () => {
  const equations = [[t.record([], ['r', 's']), t.record([['a', int]])],
    [t.tvar('x'), int]];
  assert.equal(answer(equations, rowOf('r')), null);
  assert.equal(answer(equations, t.tvar('x')), null);
  assert.equal(answer(equations, int), 'Int');
});

test('g0Guard: {...r} = {...q} with pr {...r} declines', () => {
  const problem = problemOf({ equations: [[rowOf('r'), rowOf('q')]],
    bq: [pr(rowOf('r'))] });
  const guarded = Guard.g0Guard(problem);
  assert.equal(guarded.constructor.name, 'OutOfScope');
  assert.equal(guarded.value0.constructor.name, 'RequirementAtoms');
});

test('entailedGround never reads a candidate', () => {
  const source = readFileSync('src/Features/Check/Entailed.purs', 'utf8')
    + readFileSync('src/Features/Check/Entailed/Mgu.purs', 'utf8')
    + readFileSync('src/Features/Check/Entailed/Merge.purs', 'utf8');
  assert.doesNotMatch(source, /import Features\.Check\.Strategy/);
  assert.match(source, new RegExp('entailedGround ∷ RecordedProblem'
    + ' → Entry ReqAtom → Maybe GroundType'));
});

// BACKLOG R021, token re-review B-1: a variable both a type and a tail
// makes the problem ill-sorted, where neither unifier's answer is a
// safe reading, so it is outside the fragment and G0 declines. A1: the
// triangular unifier read `z` as Bool where the eager one had no
// answer. A2: it read `y` as `Box({a: Int | r})`, hiding the rigid `p`
// the eager reading kept.
const Atom = await load('Domain.Recorded.Atom');
const Origin = await load('Domain.Recorded.Origin');
const { Tuple } = await load('Data.Tuple');
const z = new Atom.TVar(new Atom.FreshVar({ root: Origin.InBody.value,
  steps: [new Origin.Index(30)] }, new Atom.Param(30)));
const xTail = new Atom.Record([], [t.tvar('x').value0]);
const illSorted = {
  A1: { atom: pr(z), equations: [[t.tvar('x'), t.tvar('y')],
    [t.tvar('y'), t.record([['c', bool]], ['s'])],
    [xTail, t.record([['c', z]], ['r'])]] },
  A2: { atom: new Atom.Comparable(t.tvar('y')), equations: [
    [t.tvar('y'), t.box(t.tvar('x'))], [t.tvar('x'), t.tvar('p')],
    [xTail, t.record([['a', int]], ['r'])]] }
};
for (const [name, { atom, equations }] of Object.entries(illSorted))
  test(`ill-sorted ${name}: outside the fragment, and G0 declines`, () => {
    const problem = problemOf({ equations, bq: [atom] });
    assert.equal(Entailed.wellSorted(equations.map(([one, other]) =>
      new Tuple(one, other))), false);
    assert.equal(Entailed.reduction(problem)(atom.value0).constructor.name,
      'OutsideFragment');
    assert.equal(Entailed.entailedGround(problem)({ value: atom })
      .constructor.name, 'Nothing');
    assert.equal(Guard.g0Guard(problem).constructor.name, 'OutOfScope');
  });

test('wellSorted: a variable as a type or as a tail, not both', () => {
  const sorted = equations => Entailed.wellSorted(equations.map(
    ([one, other]) => new Tuple(one, other)));
  assert.equal(sorted(hand.flatMap(([, equations]) => equations)), true);
  assert.equal(sorted([[t.tvar('x'), int], [xTail, rowOf('r')]]), false);
  assert.equal(sorted([[t.arrow(int, t.box(t.record([['a',
    t.tvar('r')]]))), rowOf('r')]]), false);
  // Hardening re-review 2, m-5: an atom's type joined as `ty = ty` (the
  // corpus check in test/r0-shadow.serial.test.mjs) shows the clash the
  // equations alone do not: `{| r} = {a: Int}` with the atom `pr r`.
  const tailOnly = [[rowOf('r'), t.record([['a', int]])]];
  assert.equal(sorted(tailOnly), true);
  assert.equal(sorted([...tailOnly, [t.tvar('r'), t.tvar('r')]]), false);
});
