// One sample of the paired performance measurement
// (docs/plans/2026-11-04-performance-protocol.md §3), in its own fresh
// node process so its peak resident set is its own:
//   node scripts/r0-t2-perf-worker.mjs <output dir> <arm>
// Each arm is a constructed implementation, `{ prepare, run }`: the
// harness `measure` times `run` over what `prepare` built and never
// branches on which arm it holds. The two arms of a comparison differ
// only in the implementation injected: the trace arms in the build
// loaded (this worktree's output/ or the no-collection baseline,
// scripts/r0-t2-trace-removal.mjs), the online and validator arms in
// the step run on each item. The arm's name is looked up once, here at
// the composition root; prints one JSON line (r0-t2-perf-stats.mjs
// `parseWorkerOutput` reads it).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const kibibyte = 1024;
const millisecondsPerNanosecond = 1e-6;
const millisecondsPerMicrosecond = 1e-3;
const named = value => value.constructor.name;
const right = value => named(value) === 'Right';

// The corpus loader's sources (test/r0-corpus.mjs), as R035's figures.
const corpusSources = async () =>
  (await import('../test/r0-corpus.mjs')).loadCorpus();

// The trace arms: `compile` on every source, or `recheck` on every
// declaration, of whichever build `load` reads.
const compileArm = {
  prepare: async load => ({ compile: (await load('Program.Compile')).compile,
    sources: await corpusSources() }),
  run: state => {
    state.sources.forEach(entry => state.compile(entry.source));
    return { sources: state.sources.length };
  }
};

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

const recheckArm = {
  prepare: async load => ({
    recheck: (await load('Features.Check.Function')).recheck,
    functional: (await load('Features.Check.Functional')).functional,
    programs: await programsOf(load, await corpusSources()) }),
  run: state => {
    let declarations = 0;
    for (const { program } of state.programs) {
      const holders = state.functional(program.ctors);
      for (const decl of program.functions) {
        state.recheck(holders)(program)(decl);
        declarations += 1;
      }
    }
    return { declarations };
  }
};

// Every declaration of the effect pin's sources (both denominators,
// test/r0-t2-honest-report.mjs) with its recorded problem; the online
// arms' items, built the same way for both arms.
const itemsOf = async load => {
  const { sourcesOf } = await import('../test/r0-effects-pin-run.mjs');
  const corpus = new Set((await corpusSources()).map(entry => entry.origin));
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Elaborating = await load('Domain.Elaborating');
  const { functional } = await load('Features.Check.Functional');
  const items = [];
  for (const { origin, program } of await programsOf(load,
    await sourcesOf())) {
    const inputs = Inputs.generationInputs(program);
    const holders = functional(program.ctors);
    for (const decl of program.functions) {
      const made = Generate.generate(inputs.tables)(inputs.signatures)(decl);
      if (right(made)) items.push({ origin, program, holders, decl,
        corpus: corpus.has(origin),
        problem: Elaborating.problem(made.value0) });
    }
  }
  return items;
};

const steps = async load => ({
  recheck: (await load('Features.Check.Function')).recheck,
  readBack: (await load('Features.Check.Strategy.ReadBack')).readBack,
  readEffects: (await load('Features.Check.Strategy.ReadBack.Package'))
    .readEffects });

// What Online.searched and Online.packaged run on one declaration:
// today's recheck, then on acceptance the type read-back, then on its
// success the effect package (tranche 2).
const onlinePath = (step, item) => {
  const live = step.recheck(item.holders)(item.program)(item.decl);
  if (!right(live)) return { live: null };
  const made = step.readBack(item.problem)(live.value0.function);
  if (!right(made)) return { live: live.value0, made: null };
  return { live: live.value0, made: made.value0,
    read: step.readEffects(item.problem)(made.value0)(live.value0.function)(
      live.value0.state.subst.marks)(live.value0.trace) };
};

const onlineArm = stepOf => ({
  prepare: async load => ({ items: await itemsOf(load),
    step: await steps(load) }),
  run: state => {
    let candidates = 0;
    for (const item of state.items)
      if (stepOf(state.step, item)) candidates += 1;
    return { declarations: state.items.length, accepted: candidates };
  }
});

// Without: today's recheck alone. With: the whole online path.
const recheckAlone = (step, item) =>
  right(step.recheck(item.holders)(item.program)(item.decl));
const withReadBack = (step, item) => onlinePath(step, item).live !== null;

// The validator arms' items: every honest package (a candidate whose
// package reads and is not Malformed), with its σ for `certify`.
const honestOf = async load => {
  const step = await steps(load);
  const Malformed = await load('Features.Check.Strategy.Effects.Malformed');
  const honest = [];
  const counts = { candidates: 0, corpusCandidates: 0, packages: 0 };
  for (const item of await itemsOf(load)) {
    const path = onlinePath(step, item);
    if (!path.made) continue;
    counts.candidates += 1;
    if (item.corpus) counts.corpusCandidates += 1;
    if (!right(path.read)) continue;
    counts.packages += 1;
    if (named(Malformed.malformed(item.problem)(path.read.value0))
      === 'Nothing') honest.push({ problem: item.problem,
      unsettled: path.made.unsettled, pkg: path.read.value0,
      corpus: item.corpus });
  }
  return { honest, counts };
};

const validatorArm = judge => ({
  prepare: async load => ({ ...await honestOf(load),
    Substitution: await load('Features.Check.Strategy.Substitution') }),
  run: state => {
    let accepted = 0;
    for (const found of state.honest)
      if (right(judge(state.Substitution, found))) accepted += 1;
    return { ...state.counts, honest: state.honest.length,
      corpusHonest: state.honest.filter(found => found.corpus).length,
      accepted };
  }
});

export const arms = {
  'uncollected compile': compileArm, 'collecting compile': compileArm,
  'uncollected recheck': recheckArm, 'collecting recheck': recheckArm,
  'recheck alone': onlineArm(recheckAlone),
  'recheck and read-back': onlineArm(withReadBack),
  certify: validatorArm((Substitution, found) =>
    Substitution.certify(found.problem)(found.unsettled)),
  validate: validatorArm((Substitution, found) =>
    Substitution.validate(found.problem)(found.pkg))
};

// Times `arm.run` (wall by hrtime, CPU user+sys by cpuUsage); the peak
// resident set is the whole process's (module load and `prepare`
// included, the same work for both arms of a comparison).
export const measure = async (arm, load) => {
  const state = await arm.prepare(load);
  const cpu = process.cpuUsage();
  const start = process.hrtime.bigint();
  const counts = arm.run(state);
  const wallMs = Number(process.hrtime.bigint() - start)
    * millisecondsPerNanosecond;
  const used = process.cpuUsage(cpu);
  const userMs = used.user * millisecondsPerMicrosecond;
  const systemMs = used.system * millisecondsPerMicrosecond;
  return { wallMs, cpuMs: userMs + systemMs, userMs, systemMs,
    maxRssMiB: process.resourceUsage().maxRSS / kibibyte, counts };
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [outputDir, name] = process.argv.slice(2);
  const arm = arms[name];
  if (arm === undefined) throw new Error(`no arm ${JSON.stringify(name)}`);
  const load = module =>
    import(pathToFileURL(resolve(outputDir, module, 'index.js')).href);
  console.log(JSON.stringify(await measure(arm, load)));
}
