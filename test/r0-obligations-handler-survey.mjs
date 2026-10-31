// The corpus survey behind test/r0-obligations-handler.test.mjs (amin
// tranche 1, Task 9; design note docs/plans/2026-10-30-task-9-literal-
// design.md). Over the rt8 sources and the defect probes, as Task 7's
// survey: A5 (every `Local` of a `let`-bound local carries the `let`
// value's marked type exactly, marks included) and the other identity
// routes (block results, record-literal fields, lambda results;
// r0-obligations-routes.mjs), each `HandlerLit` and `Install` against
// the nodes they name (A3, A4, the clause rows and E5's records), and
// the minted positions (each once; exactly those the obligations,
// instances and annotations name). Values are compared as shaped data.
import { load, resolved } from './r0-generate-support.mjs';
import { nameOf, nodesOf } from './r0-generate-paths.mjs';
import { rt8Sources } from './r0-rt8-run.mjs';
import { defectProbes } from './r0-shadow-known.mjs';
import { stableStringify } from './r0-canonical.mjs';
import { shape } from './regression-r0-amin-support.mjs';
import { literalProblems, installProblems } from './r0-obligations-handled.mjs';
import { routeProblems } from './r0-obligations-routes.mjs';

const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

// Key order differs between records built apart, so compare stably.
const key = stableStringify;
const pairs = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
  .map(pair => [key(shape(pair.value0)), shape(pair.value1)]);
// A body path's steps as the recorded path's shaped key.
export const bodyKey = steps => key({ root: { InBody: [] },
  steps: steps.map(step => (typeof step === 'number'
    ? { Index: [step] } : { Named: [step] })) });

// Every position a shaped value names as a mark (`At position`).
const marksIn = (values, into) => {
  const pending = [...values];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (!Array.isArray(value) && value.At) into.push(key(value.At[0]));
    pending.push(...Object.values(value));
  }
  return into;
};

// The positions the obligations, instances and annotations name: every
// `At` mark, `HandlerLit.m` and `Install.frame`.
export const namedPositions = effects => {
  const obligations = effects.obligations.map(item => shape(item.value));
  const own = obligations.flatMap(value =>
    value.HandlerLit ? [key(value.HandlerLit[0].m)]
      : value.Install ? [key(value.Install[0].frame)] : []);
  const maps = [effects.instances, effects.annotations]
    .flatMap(map => pairs(map).map(([, value]) => value));
  return new Set(marksIn([...obligations, ...maps], own));
};

// A5 over one declaration: [locals checked, problems].
const letIdentity = (at, decl, nodes) => {
  const lets = new Map();
  const locals = [];
  for (const { steps, node } of nodesOf(decl.body)) {
    if (nameOf(node) === 'Let' && nameOf(node.value1) === 'Just')
      lets.set(node.value1.value0, bodyKey([...steps, 'Let', 'value']));
    if (nameOf(node) === 'Local') locals.push({ steps, id: node.value1 });
  }
  const problems = [];
  let checked = 0;
  for (const { steps, id } of locals) {
    const bound = lets.get(id);
    if (bound === undefined) continue;
    checked += 1;
    const use = nodes.get(bodyKey(steps));
    if (key(use) !== key(nodes.get(bound)))
      problems.push(`${at}: local ${id} at ${steps.join('/')} is `
        + `${key(use)?.slice(0, 120)}, not its let value's`);
  }
  return [checked, problems];
};

const positionProblems = (at, effects) => {
  const minted = shape(effects.positions).map(item => key(item));
  const once = new Set(minted);
  const named = namedPositions(effects);
  return [...(once.size === minted.length ? []
    : [`${at}: a position is minted twice`]),
  ...[...once].filter(item => !named.has(item))
    .map(item => `${at}: minted, unnamed ${item}`),
  ...[...named].filter(item => !once.has(item))
    .map(item => `${at}: named, unminted ${item}`)];
};

export const survey = async () => {
  const found = { locals: 0, blocks: 0, fields: 0, lambdas: 0, literals: 0,
    installs: 0, framed: 0, positions: 0, problems: [] };
  for (const { origin, source } of [...await rt8Sources(), ...defectProbes]) {
    let program;
    try { program = resolved(source); } catch { continue; }
    const { tables, signatures } = Inputs.generationInputs(program);
    for (const decl of program.functions) {
      const result = Generate.generate(tables)(signatures)(decl);
      if (result.constructor.name !== 'Right') continue;
      const at = `${origin}#${decl.name}`;
      const { effects } = Recorded.fields(Elaborating.problem(result.value0));
      const nodes = new Map(pairs(effects.nodes));
      const [checked, problems] = letIdentity(at, decl, nodes);
      const handled = { at, effects, nodes, ambient:
        new Map(pairs(effects.ambient)), found };
      found.locals += checked;
      found.positions += effects.positions.length;
      found.problems.push(...problems,
        ...routeProblems(at, decl, nodes, found),
        ...positionProblems(at, effects),
        ...literalProblems(handled), ...installProblems(handled));
    }
  }
  return found;
};
