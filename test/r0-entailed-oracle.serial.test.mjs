import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { grammarTerms, sampled, supportFrom } from './r0-entailed-support.mjs';
import { evaluate, solutions, variablesOf } from './r0-entailed-eval.mjs';

// Task 4.2, EG-oracle (docs/plans/r0-entailed-ground.md §6, grammar
// G-EG fixed before the first run): every one-equation problem
// exhaustively and 2,000 sampled two-equation problems. If
// `entailedGround` answers `Just g`, every assignment in the bounded
// domain that solves the equations gives the atom the value `g`. A
// bounded check: a counterexample refutes EG, none does not prove it.
// Serial: ~10k problems, four atoms each, each solved by enumeration.
const { t, problemOf, pr } = await supportFrom(load);
const Entailed = await load('Features.Check.Entailed');
const terms = grammarTerms(t);
const atoms = [t.tvar('x'), t.tvar('y'), t.record([], ['r']),
  t.record([], ['s'])];

const problems = [
  ...terms.flatMap(one => terms.map(other => [[one, other]])),
  ...sampled(terms)
];

// Checks one problem; returns what it counted.
const judged = equations => {
  const ask = Entailed.entailedGround(problemOf({ equations }));
  const answers = atoms.map(atom => ask({ value: pr(atom) }));
  const reduce = Entailed.reduction(problemOf({ equations }));
  const counted = { just: 0, nonVacuous: 0, agreeing: 0 };
  // Only the equations' variables are enumerated: an atom variable
  // they do not mention is unconstrained, so its atom is never fixed.
  const variables = new Map();
  for (const ty of equations.flat()) variablesOf(ty, variables);
  const found = solutions(equations, variables);
  const fixedBy = atom => [...variablesOf(atom).keys()].every(variable =>
    variables.has(variable));
  answers.forEach((answer, index) => {
    if (answer.constructor.name === 'Just' || found.length === 0
      || !fixedBy(atoms[index])
      || reduce(atoms[index]).constructor.name !== 'Reduced') return;
    const values = new Set(found.map(assignment =>
      evaluate(atoms[index], assignment)));
    if (values.size === 1) counted.agreeing += 1;
  });
  answers.forEach((answer, index) => {
    if (answer.constructor.name !== 'Just') return;
    assert.ok(fixedBy(atoms[index]), `${index} is unconstrained`);
    counted.just += 1;
    if (found.length > 0) counted.nonVacuous += 1;
    const value = evaluate(Entailed.groundType(answer.value0), new Map());
    for (const assignment of found)
      assert.equal(evaluate(atoms[index], assignment), value,
        `${JSON.stringify(equations)} atom ${index}`);
  });
  return counted;
};

test('EG-oracle: every Just is the atom\'s value in every solution', t0 => {
  // `agreeing`: in-fragment `Nothing` answers whose solutions all agree
  // at the atom (§5's claim, bounded; reported, not asserted).
  const total = { just: 0, nonVacuous: 0, agreeing: 0,
    problems: problems.length };
  for (const equations of problems) {
    const counted = judged(equations);
    for (const key of ['just', 'nonVacuous', 'agreeing'])
      total[key] += counted[key];
  }
  t0.diagnostic(JSON.stringify(total));
  assert.equal(problems.length, 8100 + 2000);
  assert.ok(total.nonVacuous > 0);
});
