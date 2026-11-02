import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { filesUnder } from '../scripts/structure.mjs';
import { testTreeInputs } from '../scripts/regression-run.mjs';

// The probe registry loads in a test-tree row's layout (Task 12 review):
// scripts/regression-run.mjs `proveTest` runs test/regression.mjs from a
// clone of the plain-purs baseline (src, .spago and their output/ only)
// holding copies of test/ and `testTreeInputs`, so a probe file that
// imports scripts/, the style tool's output or an absent source at load
// makes every test-tree row fail. Here: a temp dir outside the worktree
// with copies of test/ and the inputs, and output/ as links to each
// built module except the style tool's (tools/style/src), which the
// baseline does not compile. Limits (reasoned): src/ and .spago/ are not
// copied, so a probe reading them at load fails here though the clone
// has them (fails closed); a module whose output the baseline lacks for
// another reason is still linked.
const styleModules = new Set(filesUnder('tools/style/src').filter(file =>
  file.endsWith('.purs')).map(file => relative('tools/style/src', file)
  .replace(/\.purs$/, '').split('/').join('.')));

const layout = () => {
  const root = mkdtempSync(join(tmpdir(), 'waxwing-probes-tree-'));
  cpSync('test', join(root, 'test'), { recursive: true });
  for (const input of testTreeInputs) {
    mkdirSync(dirname(join(root, input)), { recursive: true });
    cpSync(input, join(root, input));
  }
  mkdirSync(join(root, 'output'));
  for (const name of readdirSync('output').filter(item =>
    !styleModules.has(item)))
    symlinkSync(resolve('output', name), join(root, 'output', name));
  return root;
};

const loads = root => spawnSync('node', ['--input-type=module', '-e',
  'await import("./test/regression-probes.mjs");'],
{ cwd: root, encoding: 'utf8' });

test('the probe registry loads in a test-tree row\'s layout', () => {
  assert.ok(styleModules.has('Style.Trace'));
  const root = layout();
  try {
    const run = loads(root);
    assert.equal(run.status, 0, run.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Must-fail: a planted static import of scripts/, or of the style tool's
// output, in a probe file stops the registry loading.
test('a probe file importing scripts/ or Style.Trace at load fails', () => {
  const planted = [['../scripts/structure.mjs', /scripts\/structure\.mjs/],
    ['../output/Style.Trace/index.js', /Style\.Trace/]];
  for (const [path, named] of planted) {
    const root = layout();
    try {
      const file = join(root, 'test/regression-r0-t2-online.mjs');
      writeFileSync(file, `import '${path}';\n${readFileSync(file, 'utf8')}`);
      const run = loads(root);
      assert.notEqual(run.status, 0, path);
      assert.match(run.stderr, named, path);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
