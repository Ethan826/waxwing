import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync,
  writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyEdits, buildBaseline, cloneTree, compareOutputs, compileTree,
  filesUnder } from '../scripts/regression-clone.mjs';
// The incremental regression runs (scripts/regression.mjs) are sound only
// if an incremental compile of a mutant equals a from-scratch compile.
const scratch = mkdtempSync('.build/incremental-');
test.after(() => rmSync(scratch, { recursive: true, force: true }));
// Mutation by construction: TypeId becomes a data type, so it stops being
// erased. Its externs change, and every importer's compiled JS changes with
// them: dependents are rebuilt, not just the edited module.
const mutation = {
  name: 'equivalence', file: 'src/Domain/Ids.purs',
  needle: 'newtype TypeId = TypeId Int',
  replacement: 'data TypeId = TypeId Int'
};
const edited = 'Domain.Ids';
const modulesOf = files => new Set(files.map(file => file.split('/')[0]));
test('incremental compile equals a clean compile, with dependents changed',
  { timeout: 300_000 }, () => {
    const baseline = buildBaseline(join(scratch, 'baseline'));
    const incremental = join(scratch, 'incremental');
    cloneTree(baseline, incremental);
    applyEdits(incremental, mutation);
    const rebuilt = compileTree(incremental);
    assert.equal(rebuilt.status, 0, rebuilt.stderr);
    const clean = join(scratch, 'clean');
    mkdirSync(clean);
    cloneTree(join(baseline, '.spago'), join(clean, '.spago'));
    cloneTree(join(incremental, 'src'), join(clean, 'src'));
    const scratchBuild = compileTree(clean);
    assert.equal(scratchBuild.status, 0, scratchBuild.stderr);
    // Propagation was exercised: modules other than the edited one differ
    // between the baseline and the mutant.
    const moved = compareOutputs(join(baseline, 'output'),
      join(clean, 'output'));
    const changed = modulesOf(moved.differing);
    assert.ok(changed.has(edited), 'the edited module must differ');
    changed.delete(edited);
    assert.ok(changed.size >= 3,
      `dependents must change, saw ${[...changed].join(', ')}`);
    const diff = compareOutputs(join(incremental, 'output'),
      join(clean, 'output'));
    assert.deepEqual(diff, { onlyLeft: [], onlyRight: [], differing: [] });
    assert.ok(filesUnder(join(clean, 'output')).length > 1000);
  });
test('the ordinary-copy fallback is independent of its source', () => {
  const source = join(scratch, 'tree');
  mkdirSync(join(source, 'output'), { recursive: true });
  writeFileSync(join(source, 'output', 'index.js'), 'original');
  const copy = join(scratch, 'copy');
  assert.equal(cloneTree(source, copy, { useClone: false }), 'copy');
  for (const file of filesUnder(source)) {
    const before = statSync(join(source, file));
    const after = statSync(join(copy, file));
    assert.notEqual(before.ino, after.ino, `${file} shares an inode`);
    assert.equal(after.nlink, 1, `${file} is hard-linked`);
    assert.equal(before.nlink, 1, `${file} is hard-linked`);
  }
  writeFileSync(join(copy, 'output', 'index.js'), 'changed');
  assert.equal(readFileSync(join(source, 'output', 'index.js'), 'utf8'),
    'original');
});
test('a clone is independent of its source too', () => {
  const source = join(scratch, 'cow');
  mkdirSync(source);
  writeFileSync(join(source, 'file'), 'original');
  const copy = join(scratch, 'cow-copy');
  cloneTree(source, copy);
  assert.equal(statSync(join(copy, 'file')).nlink, 1);
  writeFileSync(join(copy, 'file'), 'changed');
  assert.equal(readFileSync(join(source, 'file'), 'utf8'), 'original');
});
