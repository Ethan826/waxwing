import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { conditionsLine } from './verify-conditions.mjs';

// `npm run perf`: performance qualification. Runs every
// `<dir>/*.perf.test.mjs`, one file at a time, so no budget is timed under
// another file's load. Prints the run conditions first, runs every file
// even after a failure, reports each failure, exits 1 if any file failed
// and retries nothing. A file that runs longer than `fileTimeoutMs` is
// killed and reported as failed, and the run continues; that limit is a
// termination safeguard (about ten times the longest perf file measured),
// not a budget, and it can also fire on a merely slow machine. A skipped,
// todo or `only` test inside a perf file is reported as a failure, so a
// budget cannot be switched off quietly. After the files, the perf-side
// regression proofs (scripts/regression-perf.mjs: a fixed compiler passes,
// a restored defect fails) run through the regression runner; one that
// fails counts as a failure. The default directory only: `--dir` runs files
// alone. It does not build: run `npm run build` first (verify
// does). Routine `npm run verify` never runs these files
// (docs/engineering.md, "Verification contract").
//   node scripts/perf.mjs [--dir <dir>]   (default dir: test)
export const perfSuffix = '.perf.test.mjs';

// verify and perf split test file names by suffix: a `.perf.test.mjs` file
// belongs to perf only, any other `.test.mjs` file to verify only.
export const splitTestNames = names => ({
  perf: names.filter(name => name.endsWith(perfSuffix)),
  routine: names.filter(name => name.endsWith('.test.mjs')
    && !name.endsWith(perfSuffix))
});

export const perfFiles = dir => readdirSync(dir)
  .filter(name => name.endsWith(perfSuffix)).sort()
  .map(name => `${dir}/${name}`);

export const fileTimeoutMs = 600_000;

const nodeTest = file => {
  const run = spawnSync('node', ['--test', '--test-concurrency=1', file],
    { stdio: 'inherit', timeout: fileTimeoutMs, killSignal: 'SIGKILL' });
  return run.error?.code === 'ETIMEDOUT' ? 'timed out' : run.status;
};

// Text that switches a test off: `test.skip`, `.todo`, `.only`, or a
// `skip:` / `todo:` option.
const offPattern = new RegExp('\\b(?:test|it|describe|suite)\\.'
  + '(?:skip|todo|only)\\b|\\b(?:skip|todo)\\s*:');
export const switchedOff = text => offPattern.test(text);
const readable = file => {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
};

// Returns the failed files. `run` returns a file's exit status.
export const runPerf = (files, run = nodeTest, log = console.log,
  textOf = readable) => {
  const failed = [];
  for (const file of files) {
    log(`perf: ${file}`);
    const off = switchedOff(textOf(file));
    if (off) log(`perf: ${file} has a skipped, todo or only test`);
    const status = run(file);
    if (status !== 0 || off) {
      failed.push(file);
      log(`perf: FAILED ${file} (${off ? 'switched-off test; ' : ''}exit ${
        status})`);
    }
  }
  log(`perf: ${files.length - failed.length} of ${files.length} files `
    + 'passed');
  failed.forEach(file => log(`perf: failed ${file}`));
  return failed;
};

const main = async () => {
  const flag = process.argv.indexOf('--dir');
  const dir = flag === -1 ? 'test' : process.argv[flag + 1];
  const files = perfFiles(dir);
  if (files.length === 0) {
    console.error(`perf: no ${perfSuffix} files in ${dir}`);
    process.exit(1);
  }
  console.log(conditionsLine('perf'));
  const failed = runPerf(files);
  if (flag === -1) failed.push(...await regressionProofs());
  process.exitCode = failed.length === 0 ? 0 : 1;
};

// The perf-side regression proofs; returns the names that failed.
const regressionProofs = async () => {
  const { perfRows } = await import('./regression-perf.mjs');
  const { runRegression } = await import('./regression-run.mjs');
  console.log('perf: regression proofs (scripts/regression-perf.mjs)');
  return (await runRegression(perfRows)).map(name => `proof ${name}`);
};

if (import.meta.url === `file://${process.argv[1]}`) await main();
