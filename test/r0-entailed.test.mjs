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
const Set = await load('Data.Set');
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
  const guarded = Guard.g0Guard(Set.empty)(problem);
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
