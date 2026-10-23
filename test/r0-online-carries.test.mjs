import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe, sources } from './r0-decide-support.mjs';
import { accountFor, isDefect } from './r0-rt8-account.mjs';

// Task 4.3's carried items (acceptance criterion 5) other than the
// comparison carry (test/r0-online.test.mjs), and criterion 4's
// accounting rules, each constructor injected directly.
const stubs = await stubsFrom(load);
const Search = await load('Domain.Verdict.Search');
const Open = await load('Domain.Verdict.Open');
const Refuters = await load('Features.Check.Decide.Refuters');
const Verdict = await load('Domain.Verdict');
const { Left, Right } = await load('Data.Either');
const { behaviours: { accepting, ending }, checking, decide, hint } = stubs;
const plain = stubs.recorded.problem(sources.clash);

// Carry (Task 4.1 reading 11): `SearchHint` is `SearchHint String` with
// `Eq` and `Ord`, so `decide` hands refuters, and Unresolved keeps, the
// hints as a set in canonical (code-unit) order; Domain.Verdict.Open's
// placeholder `Question` derives `Eq`, so `decide` lists each `Unsupport`
// once.
test('hints sort canonically; SearchHint and Question have their Eq', () => {
  const text = hints => hints.map(found => found.value0);
  assert.equal(new Search.SearchHint('x').value0, 'x');
  assert.equal(Search.ordSearchHint.compare(hint('a'))(hint('b'))
    .constructor.name, 'LT');
  assert.ok(Search.eqSearchHint.eq(hint('a'))(hint('a')));
  assert.equal(typeof Open.eqQuestion.eq, 'function');
  assert.deepEqual(text(Refuters.canonical([hint('b'), hint('a'),
    hint('b'), hint('B')])), ['B', 'a', 'b']);
  const found = decide(checking({ strategies: [
    ending(Verdict.Exhausted.value, [hint('z'), hint('a')]),
    ending(Verdict.Exhausted.value, [hint('m'), hint('a')])] }), plain);
  assert.deepEqual(text(found.value0.verdict.value0.hints), ['a', 'm', 'z']);
});

// Carry (Task 4.1): at fuel 0 a strategy's search is not called (its
// attempt ran out of budget), while a refuter's search still runs: the
// asymmetry is kept and documented (Decide/Refuters.purs, "Fuel").
// T-R0a §5.1's refuter search returns `Maybe CX`, so a spent refuter
// budget cannot be told from an exhausted search; making refuters skip
// would need a refuter `LimitReached` the type does not have, a question
// for the author and T-R0a's owner.
test('at fuel 0 strategies skip their search; refuters still search', () => {
  const zero = { fuel: 0, depth: 1000, keys: 10000 };
  const searched = { calls: 0 };
  const refuter = stubs.trusted({ finds: (hints, budget) => {
    searched.calls += 1;
    return budget.fuel === 0;
  } });
  const strategy = accepting();
  assert.deepEqual(describe(decide(checking({ strategies: [strategy],
    refuters: [refuter], budget: zero }), plain)), {
    verdict: 'Contradiction ByCounterInstance',
    attempts: ['Searched OutOfBudget'], searchFaults: [] });
  assert.equal(strategy.calls, 0);
  assert.ok(searched.calls > 0);
});

// Criterion 4: RT8's classes from injected results. An inability to
// solve against today's refusal is agreement; a `RequirementUnjudged`
// refusal is a defect, counted, never hidden; nothing is a refutation.
const decision = (attempt, verdict) => new Right({ verdict, attempts:
  [attempt], searchFaults: [] });
const name = Verdict.OnlineSolver.value;
const unresolved = new Verdict.Unresolved({ reason: new Verdict.Inference(
  Verdict.NoCandidate.value), hints: [] });
const searchedEnd = end => new Verdict.Searched(name, end);
const refused = (claim, refusal) => new Verdict.CheckFailed(name, claim,
  refusal);
const today = { accepts: new Right({}), refuses: new Left({}) };
const atom = { decl: 0, path: { root: null, steps: [] }, index: 0 };

test('RT8 accounting: each class from an injected result', () => {
  const cases = [
    [today.refuses, decision(searchedEnd(Verdict.Exhausted.value),
      unresolved), 'agree: no candidate (Exhausted)'],
    [today.refuses, decision(searchedEnd(new Verdict.Broke('x')),
      unresolved), "today's own internal failure (SearchBroke)"],
    [today.accepts, decision(refused(Verdict.ClaimsComplete.value,
      new Search.RequirementUnjudged(atom)), unresolved),
    'DEFECT: candidate refused, RequirementUnjudged'],
    [today.accepts, decision(refused(Verdict.ClaimsComplete.value,
      new Search.RequirementOpen(atom)), unresolved), '(a) RequirementOpen'],
    [today.accepts, decision(refused(Verdict.Heuristic.value,
      new Search.Undefined(atom)), unresolved),
    'ambiguous several-tail read-back (Heuristic)'],
    [today.accepts, decision(new Verdict.Declined(name,
      Verdict.RequirementAtoms.value), unresolved),
    '(b) declined by g0Guard'],
    [today.accepts, decision(searchedEnd(Verdict.Exhausted.value),
      unresolved), 'DEFECT: no candidate where today accepts, Exhausted'],
    [today.refuses, new Left(new Verdict.BrokenInvariant('x')),
      'DEFECT: Faulted BrokenInvariant'],
    [today.refuses, decision(searchedEnd(Verdict.Exhausted.value),
      new Verdict.Contradiction(null)),
    'DEFECT: a contradiction with no refuter or rule']];
  for (const [before, result, expected] of cases)
    assert.equal(accountFor(before, result), expected, expected);
  assert.ok(isDefect('DEFECT: candidate refused, RequirementUnjudged'));
});
