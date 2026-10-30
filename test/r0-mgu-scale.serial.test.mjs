import test from 'node:test';
import assert from 'node:assert/strict';
import { generic } from './fn-scale-programs.mjs';
import { generatedOrThrow, load, resolved }
  from './r0-generate-support.mjs';

// BACKLOG R021: the shadow `BQ` detectors' unifier
// (Features.Check.Entailed.Mgu) on `main`'s problem of fn-scale's
// `generic(n)` (one `BQ` atom, about 1.8 n `B` atoms). Routine half: the
// 2,500 ms bounds are in r0-mgu-scale.perf.test.mjs (npm run perf), with
// the history (docs/findings.md, "R021").
const count = 1000;
const { generationInputs } = await load('Features.Check.Generate.Inputs');
const { generate } = await load('Features.Check.Generate');
const { openRequirements } = await load('Features.Check.Decide.Open');
const { g0Guard } = await load('Features.Check.Strategy.Guard');

const problemOf = n => {
  const program = resolved(generic(n).source);
  const main = program.functions.find(found => found.name === 'main');
  const { tables, signatures } = generationInputs(program);
  return generatedOrThrow(generate(tables)(signatures)(main), 'main');
};

const direct = run => ({ value: run() });

test(`openRequirements on generic(${count})`, () => {
  const problem = problemOf(count);
  assert.equal(problem.bq.length, 1);
  const { value } = direct(() => openRequirements(problem));
  assert.equal(value.length, 0, 'main\'s atom is not open');
});

test(`g0Guard on generic(${count})`, () => {
  const problem = problemOf(count);
  direct(() => g0Guard(problem));
});
