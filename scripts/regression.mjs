import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { applyEdits, buildBaseline, cloneTree, compileTimeoutMs,
  compileTree } from './regression-clone.mjs';
import { coreRows } from './regression-core.mjs';
import { fnRows } from './regression-fn.mjs';
import { fx008Rows } from './regression-fx008.mjs';
import { fxRows } from './regression-fx.mjs';
import { textRows } from './regression-text.mjs';
import { fx020Rows } from './regression-fx020.mjs';
import { r001Rows } from './regression-r001.mjs';
import { r004Rows } from './regression-r004.mjs';
import { r005Rows } from './regression-r005.mjs';
import { r005bRows } from './regression-r005b.mjs';
import { r005bEndRows } from './regression-r005b-end.mjs';
import { r005bRenderRows } from './regression-r005b-render.mjs';
import { r012Rows } from './regression-r012.mjs';
import { ieRows } from './regression-ie.mjs';
// Each row restores one defect in its own isolated copy of the sources.
// One plain-purs baseline is compiled per run; each row clones it (APFS
// copy-on-write, else an ordinary copy), edits the clone's sources, and
// compiles incrementally. test/regression-incremental.test.mjs proves that
// equals a from-scratch compile. A failing row's compile and probe output
// is saved under .build/regression-failed before its directory is removed.
// `node scripts/regression.mjs [name…]` proves only the named rows.
const chosen = process.argv.slice(2);
const proved = [...coreRows, ...fnRows, ...fx008Rows, ...fxRows,
  ...textRows, ...fx020Rows, ...r001Rows, ...r004Rows, ...r005Rows,
  ...r005bRows, ...r005bEndRows, ...r005bRenderRows, ...r012Rows, ...ieRows]
  .filter(row => chosen.length === 0 || chosen.includes(row.name));
const base = '.build/regression';
const failures = '.build/regression-failed';
const run = (command, args) =>
  spawnSync(command, args, { encoding: 'utf8', timeout: compileTimeoutMs });
const prove = row => {
  const root = `${base}/${row.name}`;
  cloneTree(`${base}/baseline`, root);
  applyEdits(root, row);
  const built = compileTree(root);
  assert.ifError(built.error);
  assert.equal(built.status, 0, built.stderr);
  const healthy =
    run('node', ['test/regression.mjs', 'output/Program.Compile/index.js',
    'output', row.probe]);
  assert.ifError(healthy.error);
  assert.equal(healthy.status, 0, healthy.stderr);
  const broken =
    run('node', ['test/regression.mjs',
    `${root}/output/Program.Compile/index.js`, `${root}/output`, row.probe]);
  assert.ifError(broken.error);
  assert.equal(broken.status, 1, broken.stdout + broken.stderr);
  assert.match(broken.stderr, row.message);
  console.log(`Regression proof (${row.name}): fixed compiler passes; `
    + 'restored defect fails.');
};
// The row directory goes in `finally`; a failure first saves what is needed
// to debug it (the assertion messages carry the compiler and probe output).
const proveAndClean = row => {
  try {
    prove(row);
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
rmSync(base, { recursive: true, force: true });
rmSync(failures, { recursive: true, force: true });
try {
  if (proved.length > 0) buildBaseline(`${base}/baseline`);
  proved.forEach(proveAndClean);
} finally {
  rmSync(base, { recursive: true, force: true });
}
