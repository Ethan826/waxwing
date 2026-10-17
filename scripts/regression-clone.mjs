import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync,
  writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
// Support for scripts/regression.mjs: one plain-purs baseline per run, and
// an independent copy of it per row, so purs recompiles only what a row's
// mutation can reach. Rows never share writable output (user, 2026-10-17).
export const compileTimeoutMs = 180_000;
// Relative globs, run with the tree as cwd: purs records source paths in
// its output, so baseline and clone must spell them identically.
const sourceGlobs = ['src/**/*.purs', '.spago/p/*/src/**/*.purs'];
// Plain purs, not spago or scripts/build.mjs: their output carries source
// maps and corefn, so its bytes differ from a plain compile's.
export const compileTree = root => spawnSync('purs',
  ['compile', ...sourceGlobs, '--output', 'output'],
  { encoding: 'utf8', timeout: compileTimeoutMs, cwd: root });
export const buildBaseline = baseline => {
  mkdirSync(baseline, { recursive: true });
  cpSync('src', join(baseline, 'src'), { recursive: true });
  cpSync('.spago', join(baseline, '.spago'), { recursive: true });
  const built = compileTree(baseline);
  assert.ifError(built.error);
  assert.equal(built.status, 0, built.stderr);
  return baseline;
};
// A copy-on-write clone (APFS `cp -cR`) where the filesystem has one, else
// an ordinary recursive copy. Neither hard-links: a write in the copy must
// never reach the original. `useClone: false` forces the fallback.
export const cloneTree = (from, to, { useClone = true } = {}) => {
  if (useClone) {
    const cloned = spawnSync('cp', ['-cR', from, to]);
    if (cloned.status === 0) return 'clone';
    rmSync(to, { recursive: true, force: true });
  }
  cpSync(from, to, { recursive: true, preserveTimestamps: true });
  return 'copy';
};
// A row restores one defect in one place, or in several (`edits`).
export const applyEdits = (root, row) => {
  for (const edit of row.edits ?? [row]) {
    const file = join(root, edit.file);
    const original = readFileSync(file, 'utf8');
    assert.equal(original.split(edit.needle).length, 2,
      `${row.name}: mutation must have exactly one target`);
    // A function, so `$'` in a replacement is not a replace pattern.
    writeFileSync(file, original.replace(edit.needle,
      () => edit.replacement));
  }
};
export const filesUnder = (dir, rel = '') => readdirSync(join(dir, rel),
  { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? filesUnder(dir, join(rel, entry.name)) : [join(rel, entry.name)]);
// `cache-db.json` records source mtimes and hashes: build-state metadata,
// not output, and the only file excluded from any comparison.
const buildState = 'cache-db.json';
const outputFiles = dir => filesUnder(dir).filter(file => file !== buildState);
export const sameBytes = (left, right, file) =>
  readFileSync(join(left, file)).equals(readFileSync(join(right, file)));
// File-set and byte differences between two output directories.
export const compareOutputs = (left, right) => {
  const leftFiles = outputFiles(left), rightFiles = outputFiles(right);
  const rightSet = new Set(rightFiles), leftSet = new Set(leftFiles);
  return {
    onlyLeft: leftFiles.filter(file => !rightSet.has(file)),
    onlyRight: rightFiles.filter(file => !leftSet.has(file)),
    differing: leftFiles.filter(file => rightSet.has(file)
      && !sameBytes(left, right, file))
  };
};
