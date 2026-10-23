import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { accountFor, boundHoleClass, holeContractClass, isDefect,
  witnessFor } from './r0-rt8-account.mjs';

// Task 4.4: RT8's reading of an accepted candidate's compilation, each
// `Compilation` and `NoWitnessReason` constructor injected. A Solved
// without a witness is never `agree: Solved`; a hole-contract refusal is
// its own class, apart from missing coverage, which is a defect of the
// online adapter (it binds every flexible variable), as is the
// placeholder it replaced.
const Verdict = await load('Domain.Verdict');
const { Left, Right } = await load('Data.Either');
const name = Verdict.OnlineSolver.value;
const variable = { fresh: 'v' };
const solved = new Verdict.Solved({});
const blocked = new Verdict.Unresolved({ reason: new Verdict.Unsupported(
  [Verdict.RequirementAtoms.value]), hints: [] });
const accepted = (compilation, verdict = solved) => new Right({ verdict,
  attempts: [new Verdict.Accepted(name, null, compilation)],
  searchFaults: [] });
const witnessed = new Verdict.Witnessed({ bindings: null, names: [] });
const missing = reason => new Verdict.NoWitness(reason);
const today = new Right({});

const cases = [
  [witnessed, 'agree: Solved', boundHoleClass, { class: 'Witnessed' }],
  [missing(new Verdict.HoleContract(variable)), holeContractClass,
    holeContractClass, { class: 'NoWitness HoleContract', variable }],
  [missing(new Verdict.Uncovered(variable)),
    'DEFECT: Solved, no witness: Uncovered',
    'DEFECT: Solved, no witness: Uncovered',
    { class: 'NoWitness Uncovered', variable }],
  [missing(new Verdict.NonConstructive(name)),
    'DEFECT: Solved, no witness: NonConstructive',
    'DEFECT: Solved, no witness: NonConstructive',
    { class: 'NoWitness NonConstructive', variable: null }]];

test('each compilation of a Solved has its RT8 class', () => {
  for (const [compilation, plain, withHole, witness] of cases) {
    assert.equal(accountFor(today, accepted(compilation)), plain, plain);
    assert.equal(accountFor(today, accepted(compilation), [0]), withHole);
    assert.deepEqual(witnessFor(accepted(compilation)), witness);
    assert.deepEqual(witnessFor(accepted(compilation, blocked)), witness);
  }
  assert.ok(!isDefect(holeContractClass));
  assert.ok(isDefect('DEFECT: Solved, no witness: Uncovered'));
});

test('a blocked or unaccepted candidate keeps its class', () => {
  for (const [compilation] of cases)
    assert.match(accountFor(today, accepted(compilation, blocked)),
      /^\(a\) blocked: Unresolved Unsupported RequirementAtoms$/);
  assert.equal(witnessFor(new Left(new Verdict.BrokenInvariant('x'))), null);
  assert.equal(witnessFor(new Right({ verdict: blocked, attempts: [
    new Verdict.Searched(name, Verdict.Exhausted.value)],
  searchFaults: [] })), null);
});
