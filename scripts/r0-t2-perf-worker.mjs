// One sample of the paired performance measurement
// (docs/plans/2026-11-04-performance-protocol.md §3, §5), in its own
// fresh node process so its peak resident set is its own:
//   node scripts/r0-t2-perf-worker.mjs <output dir> <arm> <inputs.json>
// It imports node built-ins and the build it measures, nothing from
// test/: the inputs come from the JSON file the driver wrote
// (scripts/r0-t2-perf-builds.mjs `writeInputs`). Each arm is a
// constructed implementation, `{ prepare, run }`: `measure` times `run`
// over what `prepare` built and never branches on which arm it holds.
// The two arms of a comparison differ only in what is injected: the
// trace arms in the build loaded (scratch builds with and without
// collection), the online and validator arms in the step run on each
// item. The arm's name is looked up once, at the composition root.
// Prints one JSON line (r0-t2-perf-stats.mjs `parseWorkerOutput`).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const kibibyte = 1024;
const mebibyte = 1024 * 1024;
const millisecondsPerNanosecond = 1e-6;
const millisecondsPerMicrosecond = 1e-3;
const named = value => value.constructor.name;
const right = value => named(value) === 'Right';

// `compile` on every corpus loader source, of whichever build `load`
// reads (the trace arms).
const compileArm = {
  prepare: async (load, inputs) => ({ sources: inputs.corpus,
    compile: (await load('Program.Compile')).compile }),
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

// `recheck` on every declaration of the corpus loader's programs.
const recheckArm = {
  prepare: async (load, inputs) => ({
    recheck: (await load('Features.Check.Function')).recheck,
    functional: (await load('Features.Check.Functional')).functional,
    programs: await programsOf(load, inputs.corpus) }),
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

// Every declaration of the effect pin's sources (both denominators)
// with its recorded problem, built the same way for both arms.
const itemsOf = async (load, inputs) => {
  const corpus = new Set(inputs.corpus.map(entry => entry.origin));
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
      if (right(made)) items.push({ program, holders, decl,
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

// Counts each key a step reports true for, every key the step has.
const onlineArm = stepOf => ({
  prepare: async (load, inputs) => ({ items: await itemsOf(load, inputs),
    step: await steps(load) }),
  run: state => {
    const counts = { declarations: state.items.length };
    for (const item of state.items)
      for (const [key, yes] of Object.entries(stepOf(state.step, item)))
        counts[key] = (counts[key] ?? 0) + (yes ? 1 : 0);
    return counts;
  }
});

// Without: today's recheck alone. With: the whole online path, which
// also counts the candidates checked against Task 13's pin.
const recheckAlone = (step, item) => ({
  accepted: right(step.recheck(item.holders)(item.program)(item.decl)) });
const withReadBack = (step, item) => {
  const path = onlinePath(step, item);
  return { accepted: path.live !== null, candidates: Boolean(path.made),
    corpusCandidates: Boolean(path.made) && item.corpus };
};

// The validator arms' items: every honest package (a candidate whose
// package reads and is not Malformed), with its σ for `certify`.
const honestOf = async (load, inputs) => {
  const step = await steps(load);
  const Malformed = await load('Features.Check.Strategy.Effects.Malformed');
  const honest = [];
  const counts = { candidates: 0, corpusCandidates: 0, packages: 0 };
  for (const item of await itemsOf(load, inputs)) {
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
  prepare: async (load, inputs) => ({ ...await honestOf(load, inputs),
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
  compile: compileArm, recheck: recheckArm,
  'recheck alone': onlineArm(recheckAlone),
  'recheck and read-back': onlineArm(withReadBack),
  certify: validatorArm((Substitution, found) =>
    Substitution.certify(found.problem)(found.unsettled)),
  validate: validatorArm((Substitution, found) =>
    Substitution.validate(found.problem)(found.pkg))
};

const peakMiB = () => process.resourceUsage().maxRSS / kibibyte;
const heapMiB = () => process.memoryUsage().heapUsed / mebibyte;

// The bracket holds `run` only: module load and `prepare` lie outside
// it and count toward the peak resident set alone. CPU is
// process.cpuUsage's, process-wide (GC and JIT threads included).
// maxRSS is a high-water mark, so it is also read after `prepare`, and
// heap use before and after `run`.
export const measure = async (arm, load, inputs) => {
  const state = await arm.prepare(load, inputs);
  const maxRssAfterPrepareMiB = peakMiB();
  const heapUsedBeforeMiB = heapMiB();
  const cpu = process.cpuUsage();
  const start = process.hrtime.bigint();
  const counts = arm.run(state);
  const wallMs = Number(process.hrtime.bigint() - start)
    * millisecondsPerNanosecond;
  const used = process.cpuUsage(cpu);
  const heapUsedAfterMiB = heapMiB();
  const userMs = used.user * millisecondsPerMicrosecond;
  const systemMs = used.system * millisecondsPerMicrosecond;
  return { wallMs, cpuMs: userMs + systemMs, userMs, systemMs,
    maxRssMiB: peakMiB(), maxRssAfterPrepareMiB, heapUsedBeforeMiB,
    heapUsedAfterMiB, counts };
};

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [outputDir, name, inputsFile] = process.argv.slice(2);
  const arm = arms[name];
  if (arm === undefined) throw new Error(`no arm ${JSON.stringify(name)}`);
  const load = module =>
    import(pathToFileURL(resolve(outputDir, module, 'index.js')).href);
  const inputs = JSON.parse(readFileSync(inputsFile, 'utf8'));
  console.log(JSON.stringify(await measure(arm, load, inputs)));
}
