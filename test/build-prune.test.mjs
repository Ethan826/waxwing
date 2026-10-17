import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync,
  writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pruneOutput } from '../scripts/build-prune.mjs';
import { layers } from '../scripts/structure.mjs';

const fakeOutput = names => {
  const root = mkdtempSync(join(tmpdir(), 'wx-prune-'));
  for (const name of names) {
    mkdirSync(join(root, name));
    writeFileSync(join(root, name, 'index.js'), '');
  }
  return root;
};

// F006: a deleted module's compiled output must not outlive its source.
test('prune removes workspace output whose source was deleted', () => {
  const root = fakeOutput(['Format.Parse.Core', 'Format.Parse',
    'Data.Array', 'Control.Monad.Rec.Class', 'Style.Gone', 'cache-db']);
  try {
    pruneOutput(root, ['Format.Parse']);
    assert.deepEqual(readdirSync(root).sort(),
      ['Control.Monad.Rec.Class', 'Data.Array', 'cache-db']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('prune treats every layer prefix and Style as workspace', () => {
  const names = [...layers, 'Style'].map(layer => `${layer}.Deleted`);
  const root = fakeOutput([...names, 'Data.Map']);
  try {
    pruneOutput(root, []);
    assert.deepEqual(readdirSync(root), ['Data.Map']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('prune tolerates a missing output directory', () => {
  const root = join(tmpdir(), 'wx-prune-absent');
  assert.equal(existsSync(root), false);
  pruneOutput(root, []);
});
