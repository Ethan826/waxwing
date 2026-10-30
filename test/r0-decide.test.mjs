import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { encodeProblem } from './r0-canonical.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe, sources } from './r0-decide-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';

// Task 4.1 (T-R0a §5.3 rules 1-5; AT8, AT9, AT11, AT12, AT17): the
// production `decide` over test-built `Checking` values (ruling R11),
// with stub strategies, refuters and rules from test/r0-stubs.mjs.
// `describe` (test/r0-decide-support.mjs) names a result's
// constructors, so each assertion reads as T-R0a writes the verdict.
const stubs = await stubsFrom(load);
const { behaviours: { accepting, refusing, ending, declining }, checking,
  decide, trusted, shadow, ruleOf, firstB, hint } = stubs;
const Verdict = await load('Domain.Verdict');
const Search = await load('Domain.Verdict.Search');
const { Path, InBody, InJoined, Named } =
  await load('Domain.Recorded.Origin');
const plain = stubs.recorded.problem(sources.clash);
const marked = stubs.recorded.problem(sources.boxed);
const atom = { decl: 0, path: Path({ root: InBody.value, steps: [] }),
  index: 0 };
const complete = Verdict.ClaimsComplete.value;
const heuristic = Verdict.Heuristic.value;
const unsatisfied = new Search.Unsatisfied(atom);
const outOfBudget = new Verdict.OutOfBudget(
  new Verdict.StrategyBudget(stubs.name));
const run = (options, problem = plain) =>
  describe(decide(checking(options), problem));

test('AT8: a refused Heuristic candidate is Unresolved, no SearchFault',
  () => {
    assert.deepEqual(run({ strategies: [refusing(heuristic, unsatisfied)] }),
      { verdict: 'Unresolved Inference NoAcceptedCertificate',
        attempts: ['CheckFailed Heuristic Unsatisfied'], searchFaults: [] });
  });

test('AT8: a wrong σ claimed complete, then an accepting stub: Solved',
  () => {
    assert.deepEqual(run({ strategies: [refusing(complete, unsatisfied),
      accepting()] }), { verdict: 'Solved',
      attempts: ['CheckFailed ClaimsComplete Unsatisfied', 'Accepted'],
      searchFaults: ['CandidateRefused Unsatisfied'] });
    assert.deepEqual(run({ strategies: [refusing(complete, unsatisfied)] }),
      { verdict: 'Unresolved Inference NoAcceptedCertificate',
        attempts: ['CheckFailed ClaimsComplete Unsatisfied'],
        searchFaults: ['CandidateRefused Unsatisfied'] });
  });

test('AT8: an injected DerivationRefused or broken invariant is Left', () => {
  const bogus = ruleOf('bogus', () => [{ ...atom, index: 99 }]);
  assert.deepEqual(run({ rules: [bogus], strategies: [accepting()] }),
    { fault: 'DerivationRefused NotOriginal' });
  assert.deepEqual(run({ strategies: [
    stubs.behaviours.inconsistent('context mismatch'), accepting()] }),
  { fault: 'BrokenInvariant' });
});

test('AT9: NoWitness (NonConstructive …) gives Solved', () => {
  const found = decide(checking({ strategies: [accepting()] }), plain);
  const solution = found.value0.verdict.value0;
  assert.equal(solution.compilation, stubs.nonConstructive);
  assert.ok(solution.validity === stubs.valid);
  assert.equal(solution.assurance.constructor.name, 'Pending');
});

test('AT11: a marker beside a refutable atom gives no Solved', () => {
  assert.equal(marked.outside.length, 1);
  assert.deepEqual(run({ strategies: [accepting()] }, marked), {
    verdict: 'Unresolved Unsupported Outside DataApplication',
    attempts: ['Accepted'], searchFaults: [] });
  assert.deepEqual(run({ refuters: [trusted()] }, marked).verdict,
    'Contradiction ByCounterInstance');
});

test('AT12: a zero budget gives Limit, and the problem is unchanged', () => {
  const before = encodeProblem(plain);
  const made = accepting();
  assert.deepEqual(run({ strategies: [made],
    budget: { fuel: 0, depth: 1000, keys: 10000 } }), {
    verdict: 'Unresolved Limit StrategyBudget@body',
    attempts: ['Searched OutOfBudget'], searchFaults: [] });
  assert.equal(made.calls, 0);
  assert.equal(encodeProblem(plain), before);
});

test('rule 3: Limit is not hidden by a Heuristic refusal', () => {
  assert.equal(run({ strategies: [ending(outOfBudget),
    refusing(heuristic, unsatisfied)] }).verdict,
  'Unresolved Limit StrategyBudget@body');
});

test('rule 3: a refused ClaimsComplete candidate outranks Limit', () => {
  assert.deepEqual(run({ strategies: [ending(outOfBudget),
    refusing(complete, unsatisfied)] }), {
    verdict: 'Unresolved Inference NoAcceptedCertificate',
    attempts: ['Searched OutOfBudget',
      'CheckFailed ClaimsComplete Unsatisfied'],
    searchFaults: ['CandidateRefused Unsatisfied'] });
});

test('rule 4: BothVerdicts in production, under a marker', () => {
  assert.deepEqual(run({ strategies: [accepting()],
    refuters: [trusted()] }, marked),
  { fault: 'BothVerdicts ByCounterInstance' });
  assert.deepEqual(run({ strategies: [accepting()],
    rules: [ruleOf('test-any', firstB)] }, marked),
  { fault: 'BothVerdicts ByRule' });
});

test('rule 5: only the test-only Checking reports BothVerdicts unmarked',
  () => {
    const both = { strategies: [accepting()], refuters: [trusted()] };
    assert.equal(run(both).verdict, 'Solved');
    assert.deepEqual(run({ ...both, stop: stubs.ends.everything }),
      { fault: 'BothVerdicts ByCounterInstance' });
  });

test('AT17: a shadow refuter leaves a record and the verdict unchanged',
  () => {
    for (const strategies of [[accepting()],
      [refusing(heuristic, unsatisfied)], []]) {
      const alone = run({ strategies });
      const beside = run({ strategies, shadows: [shadow()] });
      assert.equal(beside.verdict, alone.verdict);
      assert.deepEqual(beside.attempts, [...alone.attempts,
        'Shadow Right']);
    }
  });

test('a RequirementOpen refusal is Unsupported, no SearchFault', () => {
  assert.deepEqual(run({ strategies: [refusing(complete,
    new Search.RequirementOpen(atom))] }), {
    verdict: 'Unresolved Unsupported RequirementAtoms',
    attempts: ['CheckFailed ClaimsComplete RequirementOpen'],
    searchFaults: [] });
});

test('an incomplete problem blocks every strategy', () => {
  const main = stubs.recorded.problem(sources.main, 'main');
  assert.equal(main.bq.length, 1);
  assert.deepEqual(run({ strategies: [accepting(), accepting()],
    open: problem => problem.bq }, main), {
    verdict: 'Unresolved Unsupported RequirementAtoms',
    attempts: ['Accepted', 'Accepted'], searchFaults: [] });
});

test('rule 1′: a second spread blocks Solved; every strategy runs', () => {
  const spread = stubs.recorded.withSpread(plain, 2);
  assert.equal(run({ strategies: [accepting()] },
    stubs.recorded.withSpread(plain, 1)).verdict, 'Solved');
  assert.deepEqual(run({ strategies: [accepting(), accepting()] }, spread), {
    verdict: 'Unresolved Unsupported SecondSpread',
    attempts: ['Accepted', 'Accepted'], searchFaults: [] });
});

test('a strategy\'s decline is local', () => {
  const declines = declining(Verdict.RequirementAtoms.value);
  assert.equal(run({ strategies: [declines, accepting()] }).verdict,
    'Solved');
  assert.deepEqual(run({ strategies: [declines] }), {
    verdict: 'Unresolved Unsupported RequirementAtoms',
    attempts: ['Declined RequirementAtoms'], searchFaults: [] });
  assert.equal(declines.calls, 0);
});

// Carry from Task 5.1's review: `decide` blames the premises' sites,
// whatever the rule's derivation says.
test('a rule\'s blame is its premises\' sites', () => {
  const elsewhere = Path({ root: InJoined.value,
    steps: [new Named('elsewhere')] });
  const found = decide(checking({ rules: [ruleOf('test-any', firstB,
    [elsewhere])] }), plain).value0.verdict.value0.value0;
  assert.deepEqual(found.blame, found.premises.map(premise => premise.path));
  assert.notDeepEqual(found.blame, [elsewhere]);
});

test('refuters and shadows receive the hints sorted, each on its own', () => {
  const seen = [];
  const spy = stubs.shadow({ finds: hints => {
    seen.push(hints.map(item => item.value0));
    return false;
  } });
  run({ strategies: [ending(Verdict.Exhausted.value,
    [hint('b'), hint('a')]), ending(Verdict.Exhausted.value,
    [hint('a')])], shadows: [spy] });
  assert.deepEqual(seen, [[], ['a'], ['b']]);
});

// Task 11 (statements §7 "Routing", §12.2 FX032 rows): an `Unsupported`
// obligation is known from the problem, so rule 1 blocks the declaration
// with `EffectsUnchecked`, whatever a strategy accepts.
const unchecked = 'Unresolved Unsupported EffectsUnchecked'
  + ' [OperationWithRow 1 0]';

test('FX032: an accepting strategy is suppressed, never Solved', () => {
  const problem = stubs.recorded.problem(sources.fx032, 'g');
  assert.deepEqual(run({ strategies: [accepting()] }, problem),
    { verdict: unchecked, attempts: ['Accepted'], searchFaults: [] });
});

test('FX032: the production online strategy accepts and is suppressed',
  async () => {
    const online = await onlineFrom(load);
    const program = online.programOf(sources.fx032);
    const found = describe(online.decisionOf(program, 'g'));
    assert.deepEqual(found.attempts, ['Accepted', 'Shadow Left']);
    assert.equal(found.verdict, 'Unresolved Unsupported EffectsUnchecked'
      + ' [OperationWithRow 1 0]');
  });

test('no Unsupported obligation: the verdict is what it was', () => {
  const problem = stubs.recorded.problem(sources.fx032, 'main');
  assert.deepEqual(run({ strategies: [accepting()] }, problem),
    { verdict: 'Solved', attempts: ['Accepted'], searchFaults: [] });
});
