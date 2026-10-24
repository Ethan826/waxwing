// T3c's compiler run (R0 Task 7.1a, D1 spec §10): compile the fixtures of
// test/fixtures/r0/elab-scope with real purs against a tree's sources,
// reusing a copy of its output/ as externs (an APFS clone where the
// filesystem has one), and read each module's errors from
// `--json-errors`. The copy is removed afterwards. `root` is the tree
// (this repository, or a regression clone). The fixtures are kept as
// `*.purs.txt`: spago builds every `test/**/*.purs`, and these must
// fail to compile, so they are copied in as `.purs` for this run only.
import { copyFileSync, cpSync, mkdtempSync, readdirSync, rmSync }
  from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const fixtureDir = join(dirname(fileURLToPath(import.meta.url)),
  'fixtures', 'r0', 'elab-scope');
const timeoutMs = 300_000;

export const fixtureNames = () => readdirSync(fixtureDir).filter(name =>
  name.endsWith('.purs.txt')).sort();

export const compileScope = (root, names) => {
  const scratch = mkdtempSync(join(tmpdir(), 'waxwing-elab-scope-'));
  try {
    const out = join(scratch, 'output');
    const cloned = spawnSync('cp', ['-cR', join(root, 'output'), out]);
    if (cloned.status !== 0)
      cpSync(join(root, 'output'), out, { recursive: true });
    const files = (names ?? fixtureNames()).map(name => {
      const copied = join(scratch, name.replace(/\.txt$/, ''));
      copyFileSync(join(fixtureDir, name), copied);
      return copied;
    });
    const run = spawnSync('purs', ['compile', 'src/**/*.purs',
      '.spago/p/*/src/**/*.purs', ...files, '--output', out,
      '--json-errors'], { cwd: root, encoding: 'utf8', timeout: timeoutMs,
      maxBuffer: 64 * 1024 ** 2 });
    if (run.error) throw run.error;
    const report = JSON.parse(run.stdout);
    const errors = {};
    for (const found of report.errors)
      (errors[found.moduleName] ??= []).push(
        { code: found.errorCode, message: found.message });
    return { status: run.status, errors };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

// Each rejected fixture, its error class, and a phrase of the message
// that shows the rejection is the intended one.
export const expectedRejections = {
  'Test.ElabScope.Escape': ['EscapedSkolem', 'The type variable s'],
  'Test.ElabScope.Cross': ['TypesDoNotUnify', 'while trying to match type'
    + ' Gen s'],
  'Test.ElabScope.Bound': ['NoInstanceFound', 'Control.Bind.Bind (Elab'],
  'Test.ElabScope.CoerceHandle': ['TypesDoNotUnify',
    'Prim.Coerce.Coercible (Handle'],
  'Test.ElabScope.CoerceElab': ['TypesDoNotUnify',
    'Prim.Coerce.Coercible (Elab'],
  'Test.ElabScope.Unwrap': ['UnknownName', 'Unknown data constructor Elab'],
  'Test.ElabScope.UnwrapHandle': ['UnknownName',
    'Unknown data constructor Handle'],
  'Test.ElabScope.Cheat': ['UnknownName', 'Unknown value seal']
};
