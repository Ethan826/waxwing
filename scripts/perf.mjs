import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { conditionsLine } from './verify-conditions.mjs';

// `npm run perf`: performance qualification. Runs every
// `<dir>/*.perf.test.mjs`, one file at a time, so no budget is timed under
// another file's load. Prints the run conditions first, runs every file
// even after a failure, reports each failure, exits 1 if any file failed
// and retries nothing. It does not build: run `npm run build` first (verify
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

const nodeTest = file => spawnSync('node',
  ['--test', '--test-concurrency=1', file], { stdio: 'inherit' }).status;

// Returns the failed files. `run` returns a file's exit status.
export const runPerf = (files, run = nodeTest, log = console.log) => {
  const failed = [];
  for (const file of files) {
    log(`perf: ${file}`);
    const status = run(file);
    if (status !== 0) {
      failed.push(file);
      log(`perf: FAILED ${file} (exit ${status})`);
    }
  }
  log(`perf: ${files.length - failed.length} of ${files.length} files `
    + 'passed');
  failed.forEach(file => log(`perf: failed ${file}`));
  return failed;
};

const main = () => {
  const flag = process.argv.indexOf('--dir');
  const dir = flag === -1 ? 'test' : process.argv[flag + 1];
  const files = perfFiles(dir);
  if (files.length === 0) {
    console.error(`perf: no ${perfSuffix} files in ${dir}`);
    process.exit(1);
  }
  console.log(conditionsLine('perf'));
  process.exitCode = runPerf(files).length === 0 ? 0 : 1;
};

if (import.meta.url === `file://${process.argv[1]}`) main();
