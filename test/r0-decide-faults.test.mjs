import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe, sources } from './r0-decide-support.mjs';

// Task 4.1: what stops `decide` and what does not (T-R0a §5.3 rule 4;
// G-Q13 as confirmed by dossier §18.71 item 2; ruling R10), and AT16's
// second half: every reason, `InternalFault` and `SearchFault`
// constructor is produced by a direct injection into the production
// `decide`. Stubs from test/r0-stubs.mjs.
const stubs = await stubsFrom(load);
const { behaviours: { accepting, refusing, ending, declining, inconsistent },
  checking, decide, trusted, ruleOf, firstB } = stubs;
const Verdict = await load('Domain.Verdict');
const Search = await load('Domain.Verdict.Search');
const { Path, InBody } = await load('Domain.Recorded.Origin');
const plain = stubs.recorded.problem(sources.clash);
const marked = stubs.recorded.problem(sources.boxed);
const atom = { decl: 0, path: Path({ root: InBody.value, steps: [] }),
  index: 0 };
const unsatisfied = new Search.Unsatisfied(atom);
const complete = Verdict.ClaimsComplete.value;
const broke = new Verdict.Broke('an invariant of the search\'s own code');
const run = (options, problem = plain) =>
  describe(decide(checking(options), problem));

test('an untrusted search\'s broken invariant does not stop the run (G-Q13)',
  () => {
    assert.deepEqual(run({ strategies: [ending(broke), accepting()] }), {
      verdict: 'Solved', attempts: ['Searched Broke', 'Accepted'],
      searchFaults: ['SearchBroke'] });
    assert.deepEqual(run({ strategies: [ending(broke)] }), {
      verdict: 'Unresolved Inference NoCandidate',
      attempts: ['Searched Broke'], searchFaults: ['SearchBroke'] });
  });

// Ruling R10 (i): a trusted check fails. A registered rule's derivation
// that `checkDerivation` refuses stops the run, before any strategy.
test('stops: a trusted check fails (DerivationRefused)', () => {
  const made = accepting();
  const notOriginal = ruleOf('not-original', () => [{ ...atom, decl: 7 }]);
  assert.deepEqual(run({ rules: [notOriginal], strategies: [made] }),
    { fault: 'DerivationRefused NotOriginal' });
  const premiseInD = ruleOf('premise-in-d', sig =>
    sig.d.slice(0, 1).map(entry => entry.id));
  const lacking = stubs.recorded.problem(sources.lacking);
  assert.deepEqual(run({ rules: [premiseInD] }, lacking),
    { fault: 'DerivationRefused DAtomPremise' });
  assert.equal(made.calls, 0);
});

// Ruling R10 (ii): `decide`'s own precondition. `checkDerivation` finds
// a rule by name in `Checking.rules`, so two rules of one name would
// let one rule's derivation be checked by the other.
test('stops: an orchestration invariant (two rules of one name)', () => {
  const twice = [ruleOf('twice', firstB), ruleOf('twice', () => [])];
  assert.deepEqual(run({ rules: twice, strategies: [accepting()] }),
    { fault: 'BrokenInvariant' });
});

// Ruling R10 (iii): the shared state a search reads (its injected
// context, e.g. Task 4.3's declaration-not-found) disagrees with the
// problem. Not the search's own failure, so it stops, even when a later
// strategy would accept.
test('stops: a doubt about shared state (Inconsistent)', () => {
  assert.deepEqual(run({ strategies: [inconsistent('no declaration 3'),
    accepting()] }), { fault: 'BrokenInvariant' });
});

// AT16, second half: [injection, problem, the reason or fault].
const zero = { fuel: 0, depth: 1000, keys: 10000 };
const injections = [
  [{}, plain, 'Unresolved Inference NoStrategyApplies'],
  [{ strategies: [ending(Verdict.Exhausted.value)] }, plain,
    'Unresolved Inference NoCandidate'],
  [{ strategies: [refusing(complete, unsatisfied)] }, plain,
    'Unresolved Inference NoAcceptedCertificate'],
  [{ strategies: [declining(Verdict.SeveralTailSubtraction.value)] },
    plain, 'Unresolved Unsupported SeveralTailSubtraction'],
  [{ strategies: [declining(new Verdict.GuardOutsideFragment(stubs.name))] },
    plain, 'Unresolved Unsupported GuardOutsideFragment'],
  [{ strategies: [accepting()] }, marked,
    'Unresolved Unsupported Outside DataApplication'],
  [{ strategies: [accepting()] }, stubs.recorded.withSpread(plain, 2),
    'Unresolved Unsupported SecondSpread'],
  [{ strategies: [accepting()], open: problem => problem.b }, plain,
    'Unresolved Unsupported RequirementAtoms'],
  [{ strategies: [accepting()], budget: zero }, plain,
    'Unresolved Limit StrategyBudget@body'],
  [{ strategies: [ending(new Verdict.OutOfBudget(
    new Verdict.InferredTypeDepth(1000)))] }, plain,
  'Unresolved Limit InferredTypeDepth@body'],
  [{ rules: [ruleOf('test-any', firstB)] }, plain,
    'Contradiction ByRule'],
  [{ refuters: [trusted()] }, plain, 'Contradiction ByCounterInstance'],
  [{ strategies: [accepting()] }, plain, 'Solved'],
  [{ strategies: [accepting()], refuters: [trusted()] }, marked,
    'BothVerdicts ByCounterInstance'],
  [{ rules: [ruleOf('bogus', () => [{ ...atom, index: 99 }])] }, plain,
    'DerivationRefused NotOriginal'],
  [{ strategies: [inconsistent('mismatch')] }, plain, 'BrokenInvariant'],
  [{ strategies: [refusing(complete, unsatisfied)] }, plain,
    'CandidateRefused Unsatisfied'],
  [{ strategies: [ending(broke)] }, plain, 'SearchBroke']
];

test('AT16: each reason and fault constructor by a direct injection', () => {
  for (const [options, problem, wanted] of injections) {
    const found = run(options, problem);
    const said = [found.fault, found.verdict, ...found.searchFaults ?? []];
    assert.ok(said.includes(wanted), `${wanted}: ${JSON.stringify(found)}`);
  }
  const named = injections.map(([, , wanted]) => wanted).join(' ');
  for (const constructor of ['NoStrategyApplies', 'NoCandidate',
    'NoAcceptedCertificate', 'Unsupported', 'Limit', 'BothVerdicts',
    'DerivationRefused', 'BrokenInvariant', 'CandidateRefused',
    'SearchBroke', 'Outside', 'SecondSpread', 'RequirementAtoms'])
    assert.ok(named.includes(constructor), constructor);
});

test('a refuter that finds nothing, or whose CX is refused, is recorded',
  () => {
    assert.deepEqual(run({ refuters: [trusted({ finds: () => false }),
      trusted({ confirmed: false })] }).attempts,
    ['RefuterEnded NoCounterInstance Exhausted', 'RefuterEnded CXRefused']);
  });
