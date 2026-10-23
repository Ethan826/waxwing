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

const tokens = ['Valid', 'Refuted', 'Alternatives', 'NonForcedness',
  'ForcednessEvidence'];

// The structure rule reads source; this reads what purs actually exported.
// The Internal modules export each constructor, so the names are right and
// their absence from the public modules is not vacuous.
test('public modules export no token or problem constructor', () => {
  for (const name of tokens) assert.ok(name in VerdictInternal, name);
  assert.ok('RecordedProblem' in RecordedInternal);
  for (const [label, module] of [['Domain.Verdict', Verdict],
    ['Domain.Verdict.Admission', Admission], ['Domain.Recorded', Recorded],
    ['Domain.Verdict.Open', Open]])
    for (const name of [...tokens, 'RecordedProblem'])
      assert.ok(!(name in module), `${label} exports ${name}`);
});

// AT16's first half: every constructor, with the arity T-R0a gives it
// (SearchBroke from G-Q13 as confirmed in dossier §18.71 item 2; Broke
// from ruling R10). A missing or mis-shaped constructor fails here.
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
    ['CXRefused', 1], ['OnlineSolver', 0]],
  [Admission, ['Admitted', 1], ['NotCompiled', 1], ['NotJudged', 0],
    ['Admissible', 0], ['AdmittedPendingR019', 0], ['AtP', 1], ['AtA', 1],
    ['AtS', 1], ['SplitUnforced', 2], ['ForcednessUndecided', 1],
    ['Inadmissible', 2], ['ComponentBlocked', 1], ['NotLowerable', 2],
    ['NoCompilation', 1], ['AdmissionLimit', 1], ['Forced', 1],
    ['NotForced', 1], ['Checked', 1], ['Undecided', 0]],
  [VerdictInternal, ['Valid', 0], ['Alternatives', 1],
    ['NonForcedness', 1], ['ForcednessEvidence', 0]]
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

// Ruling R2 and the task: nothing in today's compile path uses these
// types yet, so acceptance and diagnostics cannot have moved. Task 1.2
// narrows this when its driver starts to carry the problem slot.
test('the R0 modules are unreachable from the CLI (Task 1.1)', () => {
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
  assert.ok(seen.has('Features.Check'));
  assert.ok('Domain.Verdict' in graph && 'Domain.Recorded' in graph);
  assert.deepEqual([...seen].filter(name =>
    /^Domain\.(Verdict|Recorded)(\.|$)/.test(name)), []);
});
