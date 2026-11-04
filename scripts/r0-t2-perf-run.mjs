// The paired performance measurement (dossier §18.159 criterion 6;
// BACKLOG R035), run exactly as docs/plans/2026-11-04-performance-
// protocol.md fixes it, once, on the author's authorization:
//   node scripts/r0-t2-perf-run.mjs <scratch dir> [--out <path>]
// On a clean tree only. It loads the inputs once and builds both arms'
// compilers in the scratch directory (scripts/r0-t2-perf-builds.mjs),
// runs every sample of the fixed schedule (scripts/r0-t2-perf-stats.mjs)
// in a fresh worker process (scripts/r0-t2-perf-worker.mjs), recording
// the machine's conditions before each (scripts/r0-t2-perf-conditions.mjs),
// and removes the builds after. Every sample is kept: a failed or
// timed-out sample is recorded with its reason and never retried, and a
// comparison with one has no figure (the gate reads it unmet). The raw
// log goes under .build/evidence/r0-t2-perf-<time>/ as it goes
// (samples.jsonl: one line per sample with its raw command output,
// stdout and stderr; then measurement.json); a failure of the run itself
// is written there as failure.json. The measurement file goes to `--out`
// (default test/fixtures/r0/t2-performance.json), never overwritten.
// Exits 1 unless every comparison is complete. Proposes no budget.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync,
  writeFileSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sampleConditions } from './r0-t2-perf-conditions.mjs';
import { cleanCommit, prepareBuilds, writeInputs }
  from './r0-t2-perf-builds.mjs';
import { measurementFile } from './r0-t2-perf-file.mjs';
import { denominatorsCheck, parseWorkerOutput, schedule }
  from './r0-t2-perf-stats.mjs';
import { conditionsLine, hostFacts, makeRunner }
  from './verify-conditions.mjs';
import { fileTimeoutMs } from './perf.mjs';
import { repoRoot } from './r0-t2-trace-removal.mjs';

export const defaultOut = 'test/fixtures/r0/t2-performance.json';
export const pinFile = 'test/fixtures/r0/t2-honest.json';
export const workerFile = fileURLToPath(
  new URL('./r0-t2-perf-worker.mjs', import.meta.url));
export const maxBuffer = 64 * 1024 * 1024;

// verify's conditions line, its git commands run at the repository root.
const atRoot = { ...hostFacts, run: makeRunner((command, args, options) =>
  spawnSync(command, args, { ...options, cwd: repoRoot })) };
const line = () => conditionsLine('r0-t2-perf', atRoot);

// One sample: its conditions first, then the worker, once. A non-zero
// exit, a timeout or a malformed line is a failure, kept as such.
// `context` holds `buildOf` (build name to output dir), `pin`, `inputs`
// (the inputs file) and `env` (the worker's environment).
export const runSample = (entry, context, spawn = spawnSync,
  conditionsOf = sampleConditions) => {
  const { raw, ...conditions } = conditionsOf();
  const buildDir = context.buildOf(entry.build);
  const ran = spawn(process.execPath,
    [workerFile, buildDir, entry.arm, context.inputs],
    { encoding: 'utf8', timeout: fileTimeoutMs, killSignal: 'SIGKILL',
      maxBuffer, env: context.env });
  const sample = { ...entry, buildDir, conditions };
  const log = { raw, stdout: ran.stdout, stderr: ran.stderr };
  if (ran.error !== undefined)
    return { sample: { ...sample, failure: ran.error.code === 'ETIMEDOUT'
      ? `timed out after ${fileTimeoutMs} ms` : ran.error.message }, log };
  if (ran.status !== 0)
    return { sample: { ...sample, failure: `exit ${ran.status}` }, log };
  try {
    const result = parseWorkerOutput(ran.stdout);
    const countsCheck = denominatorsCheck(result.counts, context.pin);
    return { sample: { ...sample, result,
      ...(countsCheck === undefined ? {} : { countsCheck }) }, log };
  } catch (failure) {
    return { sample: { ...sample, failure: failure.message }, log };
  }
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const argsOf = argv => {
  const at = argv.indexOf('--out');
  const out = at === -1 ? defaultOut : argv[at + 1];
  const scratch = argv.find((arg, index) => !arg.startsWith('--')
    && argv[index - 1] !== '--out');
  if (scratch === undefined || out === undefined)
    throw new Error('usage: node scripts/r0-t2-perf-run.mjs <scratch dir>'
      + ' [--out <path>]');
  return { scratch, out: resolve(repoRoot, out) };
};

const envOf = env => ({ NODE_OPTIONS: env.NODE_OPTIONS ?? null,
  UV_THREADPOOL_SIZE: env.UV_THREADPOOL_SIZE ?? null,
  names: Object.keys(env).sort() });

const driverMiB = () => Math.round(process.resourceUsage().maxRSS / 1024);

const samplesRun = (context, evidence) => {
  const samples = [];
  const order = schedule();
  for (const [index, entry] of order.entries()) {
    const { sample, log } = runSample(entry, context);
    samples.push(sample);
    appendFileSync(join(evidence, 'samples.jsonl'),
      `${JSON.stringify({ ...sample, ...log })}\n`);
    console.log(`r0-t2-perf: ${index + 1}/${order.length} round ${
      entry.round}${entry.warmup ? ' (warm-up)' : ''} ${entry.arm} (${
      entry.build}): ${sample.failure ?? `cpu ${Math.round(
      sample.result.cpuMs)} ms, rss ${Math.round(
      sample.result.maxRssMiB)} MiB`}`);
  }
  return samples;
};

const run = async (scratch, out, evidence, progress) => {
  progress.stage = 'clean tree';
  const commit = cleanCommit();
  const env = { ...process.env };
  const header = { start: line(), commit, node: process.version,
    platform: platform(), cores: cpus().length,
    cpu: cpus()[0]?.model ?? 'unavailable', fileTimeoutMs,
    workerEnv: envOf(env), evidence };
  console.log(header.start);
  const pin = JSON.parse(readFileSync(join(repoRoot, pinFile), 'utf8'))
    .denominators;
  progress.stage = 'inputs';
  const inputs = await writeInputs(scratch);
  progress.stage = 'builds';
  const prepared = await prepareBuilds(scratch);
  let samples;
  try {
    progress.stage = 'samples';
    const context = { buildOf: name => prepared.builds[name], pin,
      inputs: inputs.path, env };
    samples = samplesRun(context, evidence);
  } finally {
    prepared.roots.forEach(root =>
      rmSync(root, { recursive: true, force: true }));
    rmSync(inputs.path, { force: true });
  }
  progress.stage = 'file';
  const file = measurementFile({ ...header, end: line(),
    inputs: { corpus: inputs.corpus, effectPin: inputs.effectPin },
    digests: prepared.digests, driverMaxRssMiB: driverMiB() }, samples);
  const text = `${JSON.stringify(file, null, 1)}\n`;
  writeFileSync(join(evidence, 'measurement.json'), text);
  writeFileSync(out, text, { flag: 'wx' });
  const incomplete = [...file.readBack.comparisons,
    ...file.validator.comparisons].filter(found => !found.complete);
  incomplete.forEach(found => console.log(`r0-t2-perf: ${found.name} `
    + `incomplete: ${found.problems.join('; ')}`));
  console.log(`r0-t2-perf: wrote ${out} and ${evidence}`);
  return incomplete.length === 0 ? 0 : 1;
};

const main = async () => {
  const start = new Date().toISOString();
  const evidence = join(repoRoot, '.build', 'evidence',
    `r0-t2-perf-${stamp()}`);
  mkdirSync(evidence, { recursive: true });
  const progress = { stage: 'arguments' };
  try {
    const { scratch, out } = argsOf(process.argv.slice(2));
    if (existsSync(out))
      throw new Error(`${out} exists; a recorded run is never overwritten`);
    process.exitCode = await run(scratch, out, evidence, progress);
  } catch (failure) {
    const record = { stage: progress.stage, message: failure.message,
      stack: failure.stack, start, at: new Date().toISOString() };
    writeFileSync(join(evidence, 'failure.json'),
      `${JSON.stringify(record, null, 1)}\n`);
    console.error(`r0-t2-perf: FAILED at ${record.stage}: ${
      record.message} (${join(evidence, 'failure.json')})`);
    process.exitCode = 1;
  }
};

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
