// The read-back profile (docs/plans/2026-11-04-readback-cost-proposal.md
// §2): the online path of the paired measurement's onlineReadBack arm
// (scripts/r0-t2-perf-worker.mjs `onlinePath`), timed per step and per
// candidate, over the same inputs, for attribution, not budgets:
//   node scripts/r0-t2-readback-profile.mjs <build> <inputs.json> <out>
// <build> is output/ or a variant (r0-t2-readback-variant.mjs); the
// counting variant's walk tallies are read per candidate when present.
// Writes <out> (every candidate's row) and prints the summary. Every
// result (type read-back and effect package) is digested, so two builds
// can be compared for identical output.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const named = value => value.constructor.name;
const right = value => named(value) === 'Right';
const ms = start => Number(process.hrtime.bigint() - start) * 1e-6;

// A PureScript value as text, constructors named (JSON alone would
// print every nullary constructor as `{}`).
const shown = value => {
  if (value === null || typeof value !== 'object')
    return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return `[${value.map(shown).join(',')}]`;
  const fields = Object.keys(value).sort()
    .map(key => `${key}=${shown(value[key])}`);
  return `${named(value)}{${fields.join(',')}}`;
};
const digest = text => createHash('sha256').update(text).digest('hex');

const programsOf = async (load, sources) => {
  const { parse } = await load('Format.Parse');
  const { resolve: resolveProgram } = await load('Features.Resolve');
  return sources.map(entry => ({ origin: entry.origin,
    parsed: parse(entry.source) })).filter(found => right(found.parsed))
    .map(found => ({ origin: found.origin,
      resolved: resolveProgram(found.parsed.value0) }))
    .filter(found => right(found.resolved))
    .map(found => ({ origin: found.origin, program: found.resolved.value0 }));
};

// As the worker's `itemsOf`, keeping each declaration's name.
const itemsOf = async (load, inputs) => {
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Elaborating = await load('Domain.Elaborating');
  const { functional } = await load('Features.Check.Functional');
  const items = [];
  for (const { origin, program } of await programsOf(load,
    inputs.effectPin)) {
    const tables = Inputs.generationInputs(program);
    const holders = functional(program.ctors);
    for (const decl of program.functions) {
      const made = Generate.generate(tables.tables)(tables.signatures)(decl);
      if (right(made)) items.push({ origin, program, holders, decl,
        problem: Elaborating.problem(made.value0) });
    }
  }
  return items;
};

const fresh = () => ({ lookups: 0, steps: 0, levels: 0, built: 0,
  keys: new Map() });
const distinct = tally =>
  [...tally.keys.values()].reduce((sum, set) => sum + set.size, 0);

// One candidate: each step timed apart, the walk tallied around
// readEffects when the build counts.
const profiled = (step, size, item) => {
  let start = process.hrtime.bigint();
  const live = step.recheck(item.holders)(item.program)(item.decl);
  const recheckMs = ms(start);
  if (!right(live)) return { recheckMs, accepted: false, made: false };
  const checked = live.value0;
  globalThis.readBackWalk = fresh();
  start = process.hrtime.bigint();
  const made = step.readBack(item.problem)(checked.function);
  const readBackMs = ms(start);
  const typeWalk = globalThis.readBackWalk;
  if (!right(made)) return { recheckMs, readBackMs, made: false };
  globalThis.readBackWalk = fresh();
  start = process.hrtime.bigint();
  const read = step.readEffects(item.problem)(made.value0)(checked.function)(
    checked.state.subst.marks)(checked.trace);
  const readEffectsMs = ms(start);
  const walk = globalThis.readBackWalk;
  globalThis.readBackWalk = undefined;
  const effects = step.fields(item.problem).effects;
  return { origin: item.origin, name: item.decl.name, recheckMs,
    readBackMs, readEffectsMs, made: true, read: right(read),
    nodes: size(effects.nodes), flexEff: effects.flexEff.length,
    vars: size(step.fields(item.problem).vars),
    walk: { lookups: walk.lookups, distinct: distinct(walk),
      steps: walk.steps, levels: walk.levels, built: walk.built },
    typeWalk: { lookups: typeWalk.lookups, levels: typeWalk.levels,
      built: typeWalk.built },
    digest: digest(shown(made.value0) + shown(read)) };
};

const sum = (rows, key) => rows.reduce((total, row) => total + key(row), 0);

const summary = rows => {
  const candidates = rows.filter(row => row.made);
  const byCost = [...candidates].sort((one, other) =>
    other.readEffectsMs - one.readEffectsMs);
  const effectsMs = sum(candidates, row => row.readEffectsMs);
  const share = count =>
    sum(byCost.slice(0, count), row => row.readEffectsMs) / effectsMs;
  return {
    declarations: rows.length,
    accepted: rows.filter(row => row.accepted !== false).length,
    candidates: candidates.length,
    recheckMs: sum(rows, row => row.recheckMs),
    readBackMs: sum(rows, row => row.readBackMs ?? 0),
    readEffectsMs: effectsMs,
    topShare: { 1: share(1), 10: share(10), 100: share(100) },
    walk: ['lookups', 'distinct', 'steps', 'levels', 'built']
      .map(key => [key, sum(candidates, row => row.walk[key])]),
    typeWalk: ['lookups', 'levels', 'built']
      .map(key => [key, sum(candidates, row => row.typeWalk[key])]),
    digest: digest(candidates.map(row => row.digest).join('\n')),
    costliest: byCost.slice(0, 10).map(row => ({ origin: row.origin,
      name: row.name, readEffectsMs: row.readEffectsMs, nodes: row.nodes,
      flexEff: row.flexEff, walk: row.walk }))
  };
};

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [build, inputsFile, out] = process.argv.slice(2);
  const load = module =>
    import(pathToFileURL(resolve(build, module, 'index.js')).href);
  const inputs = JSON.parse(readFileSync(inputsFile, 'utf8'));
  const items = await itemsOf(load, inputs);
  const { size } = await load('Data.Map.Internal');
  const step = {
    recheck: (await load('Features.Check.Function')).recheck,
    readBack: (await load('Features.Check.Strategy.ReadBack')).readBack,
    readEffects: (await load('Features.Check.Strategy.ReadBack.Package'))
      .readEffects,
    fields: (await load('Domain.Recorded')).fields };
  const rows = items.map(item => profiled(step, size, item));
  writeFileSync(out, JSON.stringify(rows));
  console.log(JSON.stringify(summary(rows), null, 1));
}
