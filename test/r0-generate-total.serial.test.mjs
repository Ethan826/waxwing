import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeProblem, outOfOrder } from './r0-canonical.mjs';
import { loadCorpus } from './r0-corpus.mjs';
import { entryLists, load, problemsOf, resolved }
  from './r0-generate-support.mjs';
import { problemFindings } from './r0-generate-checks.mjs';
import { nameOf, nodesOf } from './r0-generate-paths.mjs';

// R0 Task 3.2 over the pinned corpus (T-R0b §9 RT5-RT7): generation
// returns for every declaration of every resolving program, twice
// alike (deterministic); RT6 and RT7 hold for each problem; records
// are in canonical order; every rule with entries and every marker
// kind but LocalGeneralization occurs. Corpus-wide, hence serial.
const corpus = await loadCorpus();
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const { expressions } = await load('Features.Check.Generate.Static.Walk');
const Origin = await load('Domain.Recorded.Origin');

const programs = corpus.flatMap(({ origin, source }) => {
  try { return [{ origin, program: resolved(source) }]; } catch {
    return [];
  }
});
const generatedAll = programs.map(({ origin, program }) =>
  ({ origin, problems: problemsOf(program) }));

test('generation returns for every corpus declaration, deterministically',
  () => {
    const declarations = generatedAll.reduce((count, found) =>
      count + found.problems.length, 0);
    assert.ok(programs.length > 900, `${programs.length} programs`);
    assert.ok(declarations > 2500, `${declarations} declarations`);
    for (const { program } of programs) {
      const { tables, signatures } = Inputs.generationInputs(program);
      for (const decl of program.functions) {
        const once = Generate.generate(tables)(signatures)(decl);
        assert.equal(encodeProblem(once),
          encodeProblem(Generate.generate(tables)(signatures)(decl)));
      }
    }
  });

test('RT6, RT7 and canonical order hold for every corpus problem', () => {
  const findings = generatedAll.flatMap(({ origin, problems }) =>
    problems.flatMap(({ decl, problem }) =>
      [...problemFindings(decl, problem), ...outOfOrder(problem)]
        .map(found => `${origin} ${decl.name}: ${found}`)));
  assert.deepEqual(findings.slice(0, 10), []);
});

// Sig1, Sig2, Sig9, E1, E2, E24, P1 and P2 record no entry (§3).
const entryRules = ['Sig3', 'Sig4', 'Sig5', 'Sig6', 'Sig7', 'Sig8', 'Sig10',
  ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 25, 26, 27, 28].map(n => `E${n}`),
  ...[3, 4, 5, 6, 7].map(n => `P${n}`)];
const markers = ['EffectArgument', 'DataOverRecords', 'DataApplication',
  'HandlerType', 'FailFamily', 'Deferred'];
test('every rule with entries and every emitted marker kind occurs', () => {
  const rules = new Set();
  const kinds = new Set();
  for (const { problems } of generatedAll)
    for (const { problem } of problems) {
      for (const list of entryLists)
        for (const entry of problem[list]) rules.add(entry.origin.rule);
      for (const entry of problem.outside) kinds.add(entry.value);
    }
  assert.deepEqual(entryRules.filter(rule => !rules.has(rule)), []);
  assert.deepEqual([...kinds].sort(), [...markers].sort());
});

// §5.2: `types` holds every expression and pattern node, at its path;
// the static rules' walk (Generate.Static.Walk) visits exactly the
// expression paths, so its sites share generation's paths.
const items = new Set(['Let', 'Defer', 'Discard', 'Given', 'Spreading']);
const patterns = new Set(['Wildcard', 'Bind', 'IntLit', 'BoolLit', 'Ctor',
  'Record']);
test('types covers every node; the static walk every expression', () => {
  const body = Origin.Path({ root: Origin.InBody.value, steps: [] });
  const findings = [];
  for (const { origin, problems } of generatedAll)
    for (const { decl, problem } of problems) {
      const nodes = nodesOf(decl.body).filter(found =>
        !items.has(nameOf(found.node)));
      const keys = problem.types.map(([path]) => JSON.stringify(path.steps));
      const wanted = nodes.map(found => JSON.stringify(found.steps));
      if (JSON.stringify([...keys].sort())
        !== JSON.stringify([...wanted].sort()))
        findings.push(`${origin} ${decl.name}: types`);
      const walked = expressions(body)(decl.body).map(pair =>
        JSON.stringify(pair.value0.steps.map(step => step.value0)));
      const exprs = nodes.filter(found => !patterns.has(nameOf(found.node)))
        .map(found => JSON.stringify(found.steps));
      if (JSON.stringify([...walked].sort())
        !== JSON.stringify([...exprs].sort()))
        findings.push(`${origin} ${decl.name}: walk`);
    }
  assert.deepEqual(findings.slice(0, 10), []);
});
