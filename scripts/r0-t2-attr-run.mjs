// The perf attribution measurement (dossier §18.161, performance
// paragraph), run as docs/plans/2026-11-04-perf-attribution-protocol.md
// fixes it, by the controller alone:
//   node scripts/r0-t2-attr-run.mjs <scratch dir outside the worktree>
// On a clean tree only. It writes the workloads' sources, builds the
// three arms cold in the scratch directory (scripts/r0-t2-attr-builds.mjs),
// runs every sample of the fixed schedule (scripts/r0-t2-attr-plan.mjs)
// in a fresh worker process (scripts/r0-t2-attr-worker.mjs), recording
// the machine's conditions before each (scripts/r0-t2-perf-conditions.mjs),
// and removes the builds after. Every sample is kept: a failed or
// timed-out one is recorded with its reason and never retried, and a
// workload with one has no attribution. The raw log goes under
// .build/evidence/r0-t2-attr-<time>/ as it goes (samples.jsonl), then
// attribution.json; a failure of the run itself goes there as
// failure.json. Exits 1 unless every workload is complete. Changes no
// bound and calls no failed bound passing.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, writeFileSync }
  from 'node:fs';
import { cpus, platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sampleConditions } from './r0-t2-perf-conditions.mjs';
import { cleanCommit } from './r0-t2-perf-builds.mjs';
import { prepareArms, writeInputs } from './r0-t2-attr-builds.mjs';
import { attributionFile } from './r0-t2-attr-file.mjs';
import { parseWorkerOutput, schedule, workloads }
  from './r0-t2-attr-plan.mjs';
import { conditionsLine, hostFacts, makeRunner }
  from './verify-conditions.mjs';
import { fileTimeoutMs } from './perf.mjs';
import { repoRoot } from './r0-t2-trace-removal.mjs';

export const workerFile = fileURLToPath(
  new URL('./r0-t2-attr-worker.mjs', import.meta.url));
export const maxBuffer = 64 * 1024 * 1024;

const atRoot = { ...hostFacts, run: makeRunner((command, args, options) =>
  spawnSync(command, args, { ...options, cwd: repoRoot })) };
const line = () => conditionsLine('r0-t2-attr', atRoot);

// One sample: its conditions first, then the worker, once. A non-zero
// exit, a timeout or a malformed line is a failure, kept as such.
// `context` holds `buildOf` (arm to output dir), `inputs` (the file)
// and `env` (the worker's environment).
export const runSample = (entry, context, spawn = spawnSync,
  conditionsOf = sampleConditions) => {
  const { raw, ...conditions } = conditionsOf();
  const buildDir = context.buildOf(entry.arm);
  const ran = spawn(process.execPath,
    [workerFile, buildDir, entry.workload, context.inputs],
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
    return { sample: { ...sample, result: parseWorkerOutput(ran.stdout) },
      log };
  } catch (failure) {
    return { sample: { ...sample, failure: failure.message }, log };
  }
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const envOf = env => ({ NODE_OPTIONS: env.NODE_OPTIONS ?? null,
  UV_THREADPOOL_SIZE: env.UV_THREADPOOL_SIZE ?? null,
  names: Object.keys(env).sort() });

const pursVersion = () => {
  const ran = spawnSync('purs', ['--version'], { encoding: 'utf8' });
  return ran.status === 0 ? ran.stdout.trim() : 'unavailable';
};

const samplesRun = (context, evidence) => {
  const samples = [];
  const order = schedule();
  for (const [index, entry] of order.entries()) {
    const { sample, log } = runSample(entry, context);
    samples.push(sample);
    appendFileSync(join(evidence, 'samples.jsonl'),
      `${JSON.stringify({ ...sample, ...log })}\n`);
    console.log(`r0-t2-attr: ${index + 1}/${order.length} round ${
      entry.round}${entry.warmup ? ' (warm-up)' : ''} ${entry.workload} ${
      entry.arm}: ${sample.failure ?? `wall ${Math.round(
      sample.result.wallMs)} ms, load ${sample.conditions.loadavg[0]}`}`);
  }
  return samples;
};

const describeBuilds = builds => Object.fromEntries(Object.entries(builds)
  .map(([name, { commit, srcTree, digest }]) =>
    [name, { commit, srcTree, digest }]));

const run = async (scratch, evidence, progress) => {
  progress.stage = 'clean tree';
  const commit = cleanCommit();
  const env = { ...process.env };
  const start = line();
  console.log(start);
  progress.stage = 'inputs';
  const written = await writeInputs(scratch);
  progress.stage = 'builds';
  const prepared = await prepareArms(scratch, commit);
  let samples;
  try {
    progress.stage = 'samples';
    samples = samplesRun({ buildOf: arm => prepared.builds[arm].output,
      inputs: written.path, env }, evidence);
  } finally {
    prepared.roots.forEach(root =>
      rmSync(root, { recursive: true, force: true }));
    rmSync(written.path, { force: true });
  }
  progress.stage = 'file';
  const header = { start, end: line(), commit, node: process.version,
    purs: pursVersion(), platform: platform(), cores: cpus().length,
    cpu: cpus()[0]?.model ?? 'unavailable', fileTimeoutMs,
    workerEnv: envOf(env), evidence, builds: describeBuilds(prepared.builds),
    traces: prepared.traces,
    driverMaxRssMiB: Math.round(process.resourceUsage().maxRSS / 1024) };
  const expected = Object.fromEntries(workloads.map(workload =>
    [workload.name, written.inputs.workloads[workload.name].expected]));
  const file = attributionFile(header, samples, expected);
  writeFileSync(join(evidence, 'attribution.json'),
    `${JSON.stringify(file, null, 1)}\n`);
  for (const found of file.workloads)
    console.log(`r0-t2-attr: ${found.name}: ${found.attribution.verdict}${
      found.complete ? '' : ` (${found.problems.join('; ')})`}`);
  console.log(`r0-t2-attr: wrote ${evidence}`);
  return file.complete ? 0 : 1;
};

const main = async () => {
  const startedAt = new Date().toISOString();
  const evidence = join(repoRoot, '.build', 'evidence',
    `r0-t2-attr-${stamp()}`);
  mkdirSync(evidence, { recursive: true });
  const progress = { stage: 'arguments' };
  try {
    const scratch = process.argv[2];
    if (scratch === undefined || scratch.startsWith('--'))
      throw new Error('usage: node scripts/r0-t2-attr-run.mjs <scratch>');
    process.exitCode = await run(scratch, evidence, progress);
  } catch (failure) {
    const record = { stage: progress.stage, message: failure.message,
      stack: failure.stack, start: startedAt, at: new Date().toISOString() };
    writeFileSync(join(evidence, 'failure.json'),
      `${JSON.stringify(record, null, 1)}\n`);
    console.error(`r0-t2-attr: FAILED at ${record.stage}: ${
      record.message} (${join(evidence, 'failure.json')})`);
    process.exitCode = 1;
  }
};

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
