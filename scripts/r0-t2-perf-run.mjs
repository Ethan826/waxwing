// The paired performance measurement (dossier §18.159 criterion 6;
// BACKLOG R035), run exactly as docs/plans/2026-11-04-performance-
// protocol.md fixes it, once, on the author's authorization:
//   node scripts/r0-t2-perf-run.mjs <scratch dir> [--out <path>]
// It does not build: run `npm run build` first. It builds the
// no-collection baseline under the scratch directory (outside the
// worktree; scripts/r0-t2-trace-removal.mjs, which throws if the
// baseline still collects), runs every sample of the fixed schedule
// (scripts/r0-t2-perf-stats.mjs) in a fresh worker process
// (scripts/r0-t2-perf-worker.mjs), recording the machine's conditions
// before each (scripts/r0-t2-perf-conditions.mjs), and removes the
// baseline after. Every sample is kept: a failed or timed-out sample is
// recorded with its reason and never retried, and a comparison with
// one has no figure (the gate reads it unmet). Writes the raw log under
// .build/evidence/r0-t2-perf-<time>/ as it goes (samples.jsonl, one
// line per sample with its raw command output, stdout and stderr; then
// measurement.json), then the measurement file at `--out` (default
// test/fixtures/r0/t2-performance.json), which it never overwrites.
// Exits 1 unless every comparison is complete. Proposes no budget.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync,
  writeFileSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleConditions } from './r0-t2-perf-conditions.mjs';
import { denominatorsCheck, measurementFile, parseWorkerOutput,
  schedule } from './r0-t2-perf-stats.mjs';
import { conditionsLine } from './verify-conditions.mjs';
import { fileTimeoutMs } from './perf.mjs';
import { repoRoot, uncollected } from './r0-t2-trace-removal.mjs';

export const defaultOut = 'test/fixtures/r0/t2-performance.json';
export const pinFile = 'test/fixtures/r0/t2-honest.json';
export const workerFile = fileURLToPath(
  new URL('./r0-t2-perf-worker.mjs', import.meta.url));
// The arms that load the baseline; every other arm loads output/.
export const baselineArms = ['uncollected compile', 'uncollected recheck'];

// One sample: its conditions first, then the worker, once. A non-zero
// exit, a timeout or a malformed line is a failure, kept as such.
export const runSample = (entry, buildOf, pin, spawn = spawnSync,
  conditionsOf = sampleConditions) => {
  const { raw, ...conditions } = conditionsOf();
  const build = buildOf(entry.arm);
  const ran = spawn(process.execPath, [workerFile, build, entry.arm],
    { encoding: 'utf8', timeout: fileTimeoutMs, killSignal: 'SIGKILL' });
  const sample = { ...entry, build, conditions };
  const log = { raw, stdout: ran.stdout, stderr: ran.stderr };
  if (ran.error !== undefined)
    return { sample: { ...sample, failure: ran.error.code === 'ETIMEDOUT'
      ? `timed out after ${fileTimeoutMs} ms` : ran.error.message }, log };
  if (ran.status !== 0)
    return { sample: { ...sample, failure: `exit ${ran.status}` }, log };
  try {
    const result = parseWorkerOutput(ran.stdout);
    const countsCheck = denominatorsCheck(result.counts, pin);
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

const main = async () => {
  const { scratch, out } = argsOf(process.argv.slice(2));
  if (existsSync(out))
    throw new Error(`${out} exists; a recorded run is never overwritten`);
  const evidence = join(repoRoot, '.build', 'evidence',
    `r0-t2-perf-${stamp()}`);
  mkdirSync(evidence, { recursive: true });
  const pin = JSON.parse(readFileSync(join(repoRoot, pinFile), 'utf8'))
    .denominators;
  const header = { start: conditionsLine('r0-t2-perf'),
    node: process.version, platform: platform(), cores: cpus().length,
    cpu: cpus()[0]?.model ?? 'unavailable', fileTimeoutMs };
  console.log(header.start);
  const removed = await uncollected(scratch);
  const samples = [];
  try {
    const buildOf = arm => baselineArms.includes(arm) ? removed.output
      : join(repoRoot, 'output');
    const order = schedule();
    for (const [index, entry] of order.entries()) {
      const { sample, log } = runSample(entry, buildOf, pin);
      samples.push(sample);
      appendFileSync(join(evidence, 'samples.jsonl'),
        `${JSON.stringify({ ...sample, ...log })}\n`);
      console.log(`r0-t2-perf: ${index + 1}/${order.length} round ${
        entry.round}${entry.warmup ? ' (warm-up)' : ''} ${entry.arm}: ${
        sample.failure ?? `cpu ${Math.round(sample.result.cpuMs)} ms, `
          + `rss ${Math.round(sample.result.maxRssMiB)} MiB`}`);
    }
  } finally {
    rmSync(removed.root, { recursive: true, force: true });
  }
  const file = measurementFile({ ...header,
    end: conditionsLine('r0-t2-perf'), evidence }, samples);
  const text = `${JSON.stringify(file, null, 1)}\n`;
  writeFileSync(join(evidence, 'measurement.json'), text);
  writeFileSync(out, text);
  const incomplete = [...file.readBack.comparisons,
    ...file.validator.comparisons].filter(found => !found.complete);
  incomplete.forEach(found => console.log(`r0-t2-perf: ${found.name} `
    + `incomplete: ${found.failed.join('; ') || 'counts check failed'}`));
  console.log(`r0-t2-perf: wrote ${out} and ${evidence}`);
  process.exitCode = incomplete.length === 0 ? 0 : 1;
};

if (import.meta.url === `file://${process.argv[1]}`) await main();
