import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, writeFileSync,
  rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { coreRows } from './regression-core.mjs';
import { fnRows } from './regression-fn.mjs';
import { fx008Rows } from './regression-fx008.mjs';
import { fxRows } from './regression-fx.mjs';
import { textRows } from './regression-text.mjs';
import { fx020Rows } from './regression-fx020.mjs';
import { r001Rows } from './regression-r001.mjs';
import { r012Rows } from './regression-r012.mjs';
// Each row restores one defect in its own isolated copy of the sources.
// `node scripts/regression.mjs [name…]` proves only the named rows.
const chosen = process.argv.slice(2);
const proved = [...coreRows, ...fnRows, ...fx008Rows, ...fxRows,
  ...textRows, ...fx020Rows, ...r001Rows, ...r012Rows]
  .filter(row => chosen.length === 0 || chosen.includes(row.name));
const base = '.build/regression';
const commandTimeoutMs = 180_000;
const run = (command, args) =>
  spawnSync(command, args, { encoding: 'utf8', timeout: commandTimeoutMs });
rmSync(base, { recursive: true, force: true });
for (const row of proved) {
  const root = `${base}/${row.name}`;
  mkdirSync(root, { recursive: true });
  cpSync('src', `${root}/src`, { recursive: true });
  // A row restores one defect in one place, or in several (`edits`).
  for (const edit of row.edits ?? [row]) {
    const file = `${root}/${edit.file}`;
    const original = readFileSync(file, 'utf8');
    assert.equal(original.split(edit.needle).length, 2,
      `${row.name}: mutation must have exactly one target`);
    // A function, so `$'` in a replacement is not a replace pattern.
    writeFileSync(file, original.replace(edit.needle,
      () => edit.replacement));
  }
  const built =
    run('purs', ['compile', `${root}/src/**/*.purs`, '.spago/p/*/src/**/*.purs',
    '--output', `${root}/output`]);
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
}
