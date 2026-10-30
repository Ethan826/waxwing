import test from 'node:test';
import assert from 'node:assert/strict';
import { generic } from './fn-scale-programs.mjs';
import { generatedOrThrow, load, resolved }
  from './r0-generate-support.mjs';

// BACKLOG R021: the shadow `BQ` detectors' unifier
// (Features.Check.Entailed.Mgu) on `main`'s problem of fn-scale's
// `generic(n)` (one `BQ` atom, about 1.8 n `B` atoms). Before the
// triangular unifier, `openRequirements` took 5,648 ms at n = 1,000
// and 33,602 ms at 2,000 (docs/findings.md, "R021"); the bound is
// generous against the new times (about 200 ms) so that only a return
// to quadratic cost fails, and still under half the old times (review
// M-1 raised it from 1,000 ms). A timing test, so under `npm run perf`.
const count = 1000;
const boundMs = 2500;
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

const timed = run => {
  const start = performance.now();
  const value = run();
  return { value, ms: performance.now() - start };
};

test(`openRequirements on generic(${count}) within ${boundMs} ms`, () => {
  const problem = problemOf(count);
  assert.equal(problem.bq.length, 1);
  const { value, ms } = timed(() => openRequirements(problem));
  assert.equal(value.length, 0, 'main\'s atom is not open');
  assert.ok(ms <= boundMs, `took ${Math.round(ms)} ms`);
});

test(`g0Guard on generic(${count}) within ${boundMs} ms`, () => {
  const problem = problemOf(count);
  const { ms } = timed(() => g0Guard(problem));
  assert.ok(ms <= boundMs, `took ${Math.round(ms)} ms`);
});
