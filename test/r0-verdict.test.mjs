import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Task 1.1: the verdict types of T-R0a §3.2-§3.5, §4.1, §5.1 and §6, and
// the opaque RecordedProblem. Loaded from the compiled output.
const load = name => import(`../output/${name}/index.js`);
const Verdict = await load('Domain.Verdict');
const Admission = await load('Domain.Verdict.Admission');
const Recorded = await load('Domain.Recorded');
const Open = await load('Domain.Verdict.Open');
const VerdictInternal = await load('Domain.Verdict.Internal');
const RecordedInternal = await load('Domain.Recorded.Internal');
const TheoremInternal = await load('Domain.Verdict.Theorem.Internal');
const Unsound = await load('Domain.Verdict.Unsound');
const Search = await load('Domain.Verdict.Search');

const tokens = ['Valid', 'Refuted', 'Alternatives', 'NonForcedness',
  'ForcednessEvidence'];

// The structure rule reads source; this reads what purs actually exported.
// The Internal modules export each constructor, so the names are right and
// their absence from the public modules is not vacuous.
test('public modules export no token or problem constructor', () => {
  for (const name of tokens) assert.ok(name in VerdictInternal, name);
  assert.ok('RecordedProblem' in RecordedInternal);
  assert.ok('TheoremRef' in TheoremInternal);
  for (const [label, module] of [['Domain.Verdict', Verdict],
    ['Domain.Verdict.Admission', Admission], ['Domain.Recorded', Recorded],
    ['Domain.Verdict.Open', Open], ['Domain.Verdict.Unsound', Unsound],
    ['Domain.Verdict.Search', Search]])
    for (const name of [...tokens, 'RecordedProblem', 'TheoremRef'])
      assert.ok(!(name in module), `${label} exports ${name}`);
});

// AT16's first half: every constructor, with the arity T-R0a gives it
// (SearchBroke from G-Q13 as confirmed in dossier §18.71 item 2; Broke
// from ruling R10; NonConstructive and Domain.Verdict.Search's from
// Task 4.1). A missing or mis-shaped constructor fails here.
const shapes = [
  [Verdict, ['Refused', 2], ['Decided', 2], ['Faulted', 2],
    ['StaticRule', 2], ['Policy', 2], ['Solved', 1], ['Contradiction', 1],
    ['Unresolved', 1], ['Proved', 1], ['Pending', 1], ['Witnessed', 1],
    ['NoWitness', 1], ['ByRule', 1], ['ByCounterInstance', 1],
    ['Inference', 1], ['Unsupported', 1], ['Limit', 1],
    ['NoStrategyApplies', 0], ['NoCandidate', 0],
    ['NoAcceptedCertificate', 0], ['Outside', 1], ['RequirementAtoms', 0],
    ['GuardOutsideFragment', 1], ['SeveralTailSubtraction', 0],
    ['SecondSpread', 0], ['ClassF', 1], ['InferredTypeDepth', 1],
    ['SpecializationKeys', 1], ['ReexaminationSteps', 0],
    ['StrategyBudget', 1], ['BothVerdicts', 2], ['DerivationRefused', 2],
    ['BrokenInvariant', 1], ['ReCheckFailed', 2], ['CandidateRefused', 2],
    ['SearchBroke', 2], ['Declined', 2], ['Searched', 2],
    ['CheckFailed', 3], ['Accepted', 3], ['RefuterEnded', 2], ['Shadow', 1],
    ['Exhausted', 0], ['OutOfBudget', 1], ['Broke', 1],
    ['ClaimsComplete', 0], ['Heuristic', 0], ['NoCounterInstance', 1],
    ['CXRefused', 1], ['OnlineSolver', 0], ['NonConstructive', 1]],
  [Search, ['SearchHint', 1], ['RequirementOpen', 1], ['Unsatisfied', 1],
    ['Undefined', 1], ['NotEntailed', 1], ['RequirementFails', 1],
    ['RequirementUnjudged', 1], ['NotGeneric', 0]],
  [Admission, ['Admitted', 1], ['NotCompiled', 1], ['NotJudged', 0],
    ['Admissible', 0], ['AdmittedPendingR019', 0], ['AtP', 1], ['AtA', 1],
    ['AtS', 1], ['SplitUnforced', 2], ['ForcednessUndecided', 1],
    ['Inadmissible', 2], ['ComponentBlocked', 1], ['NotLowerable', 2],
    ['NoCompilation', 1], ['AdmissionLimit', 1], ['Forced', 1],
    ['NotForced', 1], ['Checked', 1], ['Undecided', 0]],
  [VerdictInternal, ['Valid', 0], ['Alternatives', 1],
    ['NonForcedness', 1], ['ForcednessEvidence', 0]],
  [TheoremInternal, ['TheoremRef', 1]],
  [Unsound, ['Unregistered', 0], ['Unprojectable', 0], ['DAtomPremise', 1],
    ['NotOriginal', 1], ['RuleDeclines', 0]]
];

const build = (constructor, arity) => {
  const args = Array.from({ length: arity }, (_, index) => `arg${index}`);
  return { args, value: args.reduce((made, arg) => made(arg),
    constructor.create ?? (() => constructor.value)) };
};

test('AT16 first half: each verdict constructor, at its arity', () => {
  for (const [module, ...constructors] of shapes)
    for (const [name, arity] of constructors) {
      const constructor = module[name];
      assert.ok(constructor, name);
      if (arity === 0) {
        assert.ok(constructor.value instanceof constructor, name);
        continue;
      }
      const { args, value } = build(constructor, arity);
      assert.ok(value instanceof constructor, name);
      assert.deepEqual(Object.values(value), args, name);
    }
});

// Task 1.2 makes compile reach the R0 types through the collecting driver
// (DeclReport names FunctionName and RecordedProblem), so the Task 1.1
// check that nothing reaches them is narrowed: from Program.Main only the
// public type modules, the Internal modules they re-export types from and
// the recorded problem's plain data modules (Task 3.1) are reachable,
// only Features.Check.Outcomes imports them, and no
// checking, strategy, refuter, admission or generation module is
// reachable (ruling R6: no such wiring into Program.Compile in this
// tranche).
test('the CLI reaches the R0 types only through the driver (Task 1.2)',
  () => {
    const result = spawnSync('purs',
      ['graph', 'src/**/*.purs', '.spago/p/*/src/**/*.purs'],
      { encoding: 'utf8', maxBuffer: 4 * 1024 ** 2 });
    assert.equal(result.status, 0, result.stderr);
    const graph = JSON.parse(result.stdout);
    const seen = new Set();
    const visit = name => {
      if (seen.has(name)) return;
      seen.add(name);
      graph[name].depends.forEach(visit);
    };
    visit('Program.Main');
    const r0 = name => /^Domain\.(Verdict|Recorded)(\.|$)/.test(name);
    assert.ok(seen.has('Features.Check.Outcomes'));
    assert.ok('Domain.Verdict.Admission' in graph);
    assert.deepEqual([...seen].filter(r0).sort(), ['Domain.Recorded',
      'Domain.Recorded.Atom', 'Domain.Recorded.Internal',
      'Domain.Recorded.Origin', 'Domain.Verdict',
      'Domain.Verdict.Internal', 'Domain.Verdict.Open',
      'Domain.Verdict.Search', 'Domain.Verdict.Static',
      'Domain.Verdict.Theorem.Internal', 'Domain.Verdict.Unsound']);
    assert.deepEqual([...seen].filter(name => !r0(name)
      && graph[name].depends.some(r0)), ['Features.Check.Outcomes']);
    assert.deepEqual(graph['Features.Check.Outcomes'].depends.filter(r0)
      .sort(), ['Domain.Recorded', 'Domain.Verdict']);
    assert.deepEqual([...seen].filter(name => new RegExp('^Features\\.Check'
      + '\\.(Strategy|Refute|Admit|Decide|Generate|Checking)(\\.|$)')
      .test(name)), []);
  });
