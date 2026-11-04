// One sample of the perf attribution measurement
// (docs/plans/2026-11-04-perf-attribution-protocol.md §3, §5), in its
// own fresh node process:
//   node scripts/r0-t2-attr-worker.mjs <output dir> <workload> <inputs>
// It imports node built-ins and the build it measures, nothing from
// test/: the sources come from the JSON file the driver wrote
// (scripts/r0-t2-attr-builds.mjs `writeInputs`). Each workload kind is a
// constructed implementation, `{ prepare, run, outcome }`; `measure`
// times `run` alone and never branches on the kind or the arm. The arms
// differ only in the build directory given; the kind is looked up once,
// at the composition root. Prints one JSON line
// (r0-t2-attr-plan.mjs `parseWorkerOutput`).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const kibibyte = 1024;
const millisecondsPerNanosecond = 1e-6;
const millisecondsPerMicrosecond = 1e-3;

// Parse, Resolve, Check and Specialize, as test/fn-linear-forms.mjs
// `throughSpecialize` runs them, the outcome read after the bracket.
const linearKind = {
  prepare: async (load, input) => ({ source: input.source,
    Right: (await load('Data.Either')).Right,
    phases: [(await load('Features.Resolve')).resolve,
      (await load('Features.Check')).check,
      (await load('Features.Specialize')).specialize],
    parse: (await load('Format.Parse')).parse,
    wire: (await load('Format.Diagnostic')).wire }),
  run: state => state.phases.reduce((result, phase) =>
    result instanceof state.Right ? phase(result.value0) : result,
  state.parse(state.source)),
  outcome: (state, result) => result instanceof state.Right
    ? { outcome: 'ok', digest: null }
    : { outcome: state.wire(result.value0).code, digest: null }
};

const sha = text => createHash('sha256').update(text).digest('hex');

// Every Waxwing phase through Go emission, as
// test/fn-scale.perf.test.mjs times `compile`; the Go text's digest is
// compared across arms (the output must not change).
const scaleKind = {
  prepare: async (load, input) => ({ source: input.source,
    Right: (await load('Data.Either')).Right,
    compile: (await load('Program.Compile')).compile }),
  run: state => state.compile(state.source),
  outcome: (state, result) => result instanceof state.Right
    ? { outcome: 'ok', digest: sha(result.value0) }
    : { outcome: 'compile rejected', digest: null }
};

export const kinds = { linear: linearKind, scale: scaleKind };

const microsToMs = used => ({ userMs: used.user * millisecondsPerMicrosecond,
  systemMs: used.system * millisecondsPerMicrosecond });

// The bracket holds `run` only. CPU is process-wide (GC and JIT threads
// included); threadCpuMs is the main thread's alone, so wall minus it is
// the time the main thread spent off a core. Context switches are the
// process's across the bracket.
export const measure = async (kind, load, input) => {
  const state = await kind.prepare(load, input);
  const usageBefore = process.resourceUsage();
  const threadBefore = process.threadCpuUsage();
  const cpu = process.cpuUsage();
  const start = process.hrtime.bigint();
  const result = kind.run(state);
  const wallMs = Number(process.hrtime.bigint() - start)
    * millisecondsPerNanosecond;
  const used = microsToMs(process.cpuUsage(cpu));
  const threadAfter = process.threadCpuUsage();
  const usageAfter = process.resourceUsage();
  const thread = microsToMs({ user: threadAfter.user - threadBefore.user,
    system: threadAfter.system - threadBefore.system });
  return { wallMs, cpuMs: used.userMs + used.systemMs, ...used,
    threadCpuMs: thread.userMs + thread.systemMs,
    involuntarySwitches: usageAfter.involuntaryContextSwitches
      - usageBefore.involuntaryContextSwitches,
    voluntarySwitches: usageAfter.voluntaryContextSwitches
      - usageBefore.voluntaryContextSwitches,
    maxRssMiB: usageAfter.maxRSS / kibibyte,
    loadAfter: loadavg().map(value => Number(value.toFixed(2))),
    ...kind.outcome(state, result) };
};

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [outputDir, name, inputsFile] = process.argv.slice(2);
  const input = JSON.parse(readFileSync(inputsFile, 'utf8')).workloads[name];
  if (input === undefined)
    throw new Error(`no workload ${JSON.stringify(name)}`);
  const kind = kinds[input.kind];
  const load = module =>
    import(pathToFileURL(resolve(outputDir, module, 'index.js')).href);
  console.log(JSON.stringify(await measure(kind, load, input)));
}
