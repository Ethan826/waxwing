import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { applyEdits, buildBaseline, cloneTreeAsync, compileTreeAsync,
  spawnAsync } from './regression-clone.mjs';
import { regressionJobs, runPool } from './regression-pool.mjs';
const base = '.build/regression';
const failures = '.build/regression-failed';
const probe = (...args) =>
  spawnAsync('node', ['test/regression.mjs', ...args]);
const prove = async row => {
  const root = `${base}/${row.name}`;
  await cloneTreeAsync(`${base}/baseline`, root);
  applyEdits(root, row);
  const built = await compileTreeAsync(root);
  assert.ifError(built.error);
  assert.equal(built.status, 0, built.stderr);
  const healthy = await probe('output/Program.Compile/index.js', 'output',
    row.probe);
  assert.ifError(healthy.error);
  assert.equal(healthy.status, 0, healthy.stderr);
  const broken = await probe(`${root}/output/Program.Compile/index.js`,
    `${root}/output`, row.probe);
  assert.ifError(broken.error);
  assert.equal(broken.status, 1, broken.stdout + broken.stderr);
  assert.match(broken.stderr, row.message);
  console.log(`Regression proof (${row.name}): fixed compiler passes; `
    + 'restored defect fails.');
};
// The row directory goes in `finally`; a failure first saves what is needed
// to debug it (the assertion messages carry the compiler and probe output).
const proveAndClean = async row => {
  try {
    await prove(row);
  } catch (failure) {
    mkdirSync(failures, { recursive: true });
    writeFileSync(`${failures}/${row.name}.log`, String(failure.stack));
    console.error(`Regression row ${row.name} failed; log saved to `
      + `${failures}/${row.name}.log`);
    throw failure;
  } finally {
    rmSync(`${base}/${row.name}`, { recursive: true, force: true });
  }
};
// Proves the rows (all, or those named) in a bounded pool. A failing row
// does not stop the others: every row runs, and the failing names come
// back in row order. Rows print as they finish; the summary is
// deterministic.
export const runRegression = async (rows, names = [],
  jobs = regressionJobs()) => {
  const proved = rows.filter(row => names.length === 0
    || names.includes(row.name));
  rmSync(base, { recursive: true, force: true });
  rmSync(failures, { recursive: true, force: true });
  try {
    if (proved.length > 0) buildBaseline(`${base}/baseline`);
    const results = await runPool(proved, jobs, proveAndClean);
    const failed = results.filter(result => result.error !== undefined)
      .map(result => result.item.name);
    console.log(`Regression proofs: ${proved.length - failed.length} of `
      + `${proved.length} passed (jobs ${jobs}).`);
    if (failed.length > 0) {
      console.error(`Regression proofs FAILED: ${failed.join(', ')}`);
    }
    return failed;
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
};
