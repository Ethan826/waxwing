import assert from 'node:assert/strict';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { applyEdits, buildBaseline, cloneTreeAsync, compileTreeAsync,
  spawnAsync } from './regression-clone.mjs';
import { regressionJobs, runPool } from './regression-pool.mjs';
const base = '.build/regression';
const failures = '.build/regression-failed';
// A row's probe runs through `entry` (default test/regression.mjs); the
// perf-side rows (scripts/regression-perf.mjs) name test/perf-regression.mjs.
const entryOf = row => row.entry ?? 'test/regression.mjs';
const probe = (row, ...args) =>
  spawnAsync('node', [entryOf(row), ...args]);
// A row edits either the compiler (no `tree`) or the test helpers
// (`tree: 'test'`, every edit under test/); one row never mixes the two.
// Edit paths are normalized and relative, so no edit leaves the row root.
export const rowTree = row => {
  assert.ok(row.edits === undefined || row.file === undefined,
    `${row.name}: a row gives either edits or a file, not both`);
  const files = (row.edits ?? [row]).map(edit => edit.file);
  assert.ok(files.length > 0, `${row.name}: a row needs an edit`);
  for (const file of files) {
    assert.ok(typeof file === 'string' && posix.normalize(file) === file
      && !file.startsWith('/') && !file.split('/').includes('..'),
    `${row.name}: edit path must be relative and normalized: ${file}`);
  }
  const underTest = files.map(file => file.startsWith('test/'));
  if (row.tree === 'test') {
    assert.ok(underTest.every(Boolean),
      `${row.name}: a test-tree row edits only files under test/`);
    return 'test';
  }
  assert.equal(row.tree, undefined, `${row.name}: unknown tree `
    + `${row.tree} (omit tree for a compiler row)`);
  assert.ok(!underTest.some(Boolean),
    `${row.name}: edits under test/ need tree: 'test' and no src edits`);
  return 'src';
};
const healthyRun = async row => {
  const healthy = await probe(row, 'output/Program.Compile/index.js',
    'output', row.probe);
  assert.ifError(healthy.error);
  assert.equal(healthy.status, 0, healthy.stderr);
};
const assertBroken = (row, broken) => {
  assert.ifError(broken.error);
  assert.equal(broken.status, 1, broken.stdout + broken.stderr);
  assert.match(broken.stderr, row.message);
  console.log(`Regression proof (${row.name}): fixed compiler passes; `
    + 'restored defect fails.');
};
const proveSource = async row => {
  const root = `${base}/${row.name}`;
  await cloneTreeAsync(`${base}/baseline`, root);
  applyEdits(root, row);
  const built = await compileTreeAsync(root);
  assert.ifError(built.error);
  assert.equal(built.status, 0, built.stderr);
  await healthyRun(row);
  assertBroken(row, await probe(row, `${root}/output/Program.Compile/index.js`,
    `${root}/output`, row.probe));
};
// Files outside test/ that the probe set reads from its cwd (dossier
// 18.109): test/r0-g0-support.mjs and test/r0-witness-support.mjs at
// load, test/regression.mjs for its own probe.
export const testTreeInputs = [
  'research/division-campaign/r0/probes/d02-body-type-lacking.wxw',
  'research/division-campaign/source/examples/p11-route.wxw',
  'examples/answer.wxw'
];
// A test-tree row runs its broken probe wholly from its own clone of the
// baseline (src, .spago and the plain-purs output/) holding real copies of
// test/ (the helpers import ../output) and of testTreeInputs. Nothing is
// compiled, and the real test/ is never edited.
const proveTest = async row => {
  const root = `${base}/${row.name}`;
  await cloneTreeAsync(`${base}/baseline`, root);
  cpSync('test', `${root}/test`, { recursive: true });
  for (const input of testTreeInputs) {
    mkdirSync(dirname(`${root}/${input}`), { recursive: true });
    cpSync(input, `${root}/${input}`);
  }
  applyEdits(root, row);
  await healthyRun(row);
  assertBroken(row, await spawnAsync('node', ['test/regression.mjs',
    'output/Program.Compile/index.js', 'output', row.probe],
  { cwd: root }));
};
export const prove = async row => {
  await (rowTree(row) === 'test' ? proveTest : proveSource)(row);
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
export const exitCodeFor = failed => failed.length === 0 ? 0 : 1;
const requireKnown = (rows, names) => {
  const known = new Set(rows.map(row => row.name));
  const unknown = names.filter(name => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(`Unknown regression row: ${unknown.join(', ')}`);
  }
};
// Proves the rows (all, or those named) in a bounded pool. A failing row
// does not stop the others: every row runs, and the failing names come
// back in row order. Rows print as they finish; the summary is
// deterministic. The row prover and baseline builder are injected; the
// defaults are the real ones. An unknown name throws before anything runs.
export const runRegression = async (rows, names = [],
  jobs = regressionJobs(),
  { prove: proveRow = proveAndClean, buildBase = buildBaseline } = {}) => {
  requireKnown(rows, names);
  const proved = rows.filter(row => names.length === 0
    || names.includes(row.name));
  rmSync(base, { recursive: true, force: true });
  rmSync(failures, { recursive: true, force: true });
  try {
    if (proved.length > 0) buildBase(`${base}/baseline`);
    // Rows flagged `alone` (timing-sensitive growth rows) run one at a
    // time after the pooled rows, so the pool's load is not theirs.
    const pooled = await runPool(proved.filter(row => !row.alone), jobs,
      proveRow);
    const single = await runPool(proved.filter(row => row.alone), 1,
      proveRow);
    const failedNames = new Set([...pooled, ...single]
      .filter(result => !result.ok).map(result => result.item.name));
    const failed = proved.map(row => row.name)
      .filter(name => failedNames.has(name));
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
