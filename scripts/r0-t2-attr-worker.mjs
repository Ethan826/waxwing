// One sample of the perf attribution measurement
// (docs/plans/2026-11-04-perf-attribution-protocol.md §3, §5): one
// fresh node process runs one test file's workloads in that test's
// order, each bracketed as the test brackets it:
//   node scripts/r0-t2-attr-worker.mjs <output dir> <file> <inputs>
// It imports node built-ins and the build it measures, nothing from
// test/: the sources come from the JSON file the driver wrote
// (scripts/r0-t2-attr-builds.mjs `writeInputs`). Each file kind is a
// constructed implementation, `{ prepare, run, outcome }`; `measure`
// brackets `run` alone, with an injected clock, and never branches on
// the kind or the arm. The kind is looked up once, at the composition
// root. Prints one JSON line (r0-t2-attr-plan.mjs `parseWorkerOutput`).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const kibibyte = 1024;
const millisecondsPerNanosecond = 1e-6;
const millisecondsPerMicrosecond = 1e-3;

// fn-linear-timing: the bracket holds test/fn-linear-forms.mjs
// `throughSpecialize` whole, the outcome code (`wire`) included.
export const linearKind = {
  prepare: async load => ({ Right: (await load('Data.Either')).Right,
    phases: [(await load('Features.Resolve')).resolve,
      (await load('Features.Check')).check,
      (await load('Features.Specialize')).specialize],
    parse: (await load('Format.Parse')).parse,
    wire: (await load('Format.Diagnostic')).wire }),
  run: (state, source) => {
    const result = state.phases.reduce((current, phase) =>
      current instanceof state.Right ? phase(current.value0) : current,
    state.parse(source));
    return result instanceof state.Right ? 'ok'
      : state.wire(result.value0).code;
  },
  outcome: (state, code) => ({ outcome: code, digest: null })
};

export const sha = text => createHash('sha256').update(text).digest('hex');

// fn-scale: the bracket holds `compile` alone; the Go text's digest is
// taken after it (the test writes and builds the Go there; no go build
// runs here).
export const scaleKind = {
  prepare: async load => ({ Right: (await load('Data.Either')).Right,
    compile: (await load('Program.Compile')).compile }),
  run: (state, source) => state.compile(source),
  outcome: (state, result) => result instanceof state.Right
    ? { outcome: 'ok', digest: sha(result.value0) }
    : { outcome: 'compile rejected', digest: null }
};

export const kinds = { linear: linearKind, scale: scaleKind };

// The process's clocks, injected so the bracket can be tested.
export const processClock = {
  wall: () => process.hrtime.bigint(),
  cpu: () => process.cpuUsage(),
  thread: () => process.threadCpuUsage(),
  usage: () => process.resourceUsage()
};

const ms = micros => micros * millisecondsPerMicrosecond;

// One bracket around `run` on one source: wall, process CPU (GC and JIT
// threads included), main-thread CPU, and context switches.
export const bracket = (kind, state, source, clock = processClock) => {
  const usage = clock.usage();
  const thread = clock.thread();
  const cpu = clock.cpu();
  const start = clock.wall();
  const result = kind.run(state, source);
  const wallMs = Number(clock.wall() - start) * millisecondsPerNanosecond;
  const cpuAfter = clock.cpu();
  const threadAfter = clock.thread();
  const usageAfter = clock.usage();
  const userMs = ms(cpuAfter.user - cpu.user);
  const systemMs = ms(cpuAfter.system - cpu.system);
  return { wallMs, cpuMs: userMs + systemMs, userMs, systemMs,
    threadCpuMs: ms(threadAfter.user - thread.user + threadAfter.system
      - thread.system),
    involuntarySwitches: usageAfter.involuntaryContextSwitches
      - usage.involuntaryContextSwitches,
    voluntarySwitches: usageAfter.voluntaryContextSwitches
      - usage.voluntaryContextSwitches,
    ...kind.outcome(state, result) };
};

// The file's workloads in order, after one `prepare` (the tests import
// the compiler before their first test).
export const measure = async (kind, load, entries, clock = processClock) => {
  const state = await kind.prepare(load);
  const results = {};
  for (const entry of entries)
    results[entry.name] = bracket(kind, state, entry.source, clock);
  return { entries: results, maxRssMiB: clock.usage().maxRSS / kibibyte,
    loadAfter: loadavg().map(value => Number(value.toFixed(2))) };
};

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [outputDir, file, inputsFile] = process.argv.slice(2);
  const entries = JSON.parse(readFileSync(inputsFile, 'utf8')).files[file];
  const kind = kinds[file];
  if (entries === undefined || kind === undefined)
    throw new Error(`no file ${JSON.stringify(file)}`);
  const load = module =>
    import(pathToFileURL(resolve(outputDir, module, 'index.js')).href);
  console.log(JSON.stringify(await measure(kind, load, entries)));
}
