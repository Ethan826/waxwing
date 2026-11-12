// The no-collection baseline (tranche 2 Task 7; design §C.4, dossier
// §18.155 (4)): today's src with trace collection removed, built in a
// scratch copy outside the worktree. Read by the inertness pin
// (scripts/r0-t2-trace-inert-pin.mjs) and the cost measurement
// (scripts/r0-t2-trace-cost.mjs). A reviewed artifact: each edit must
// match exactly once, so a recorder that moves or a new one that is not
// listed here fails the build instead of leaving collection in. The
// `State` field stays (a constant `emptyTrace`); every recorder's caller
// leaves it unchanged, and checkFunction drops `finish` and its second
// `numbering`. `uncollected` then checks, over the corpus, that the
// baseline's raw and finished traces hold no entry, so neither the pin
// nor the cost measurement can use a baseline that still collects.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync,
  writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep }
  from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCorpus } from '../test/r0-corpus.mjs';
import { traceRun } from '../test/r0-t2-trace-inert.mjs';
import { cloneTree, compileTree } from './regression-clone.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)),
  '..');
const check = 'src/Features/Check';

export const removalEdits = [
  [`${check}/Apply.purs`, 'appliedAt span argument row state = state\n'
    + '  { trace = recordApplied span argument row state.trace }\n',
  'appliedAt _ _ _ state = state\n'],
  [`${check}/Apply.purs`, 'pipedAt argument row state = state\n'
    + '  { trace = recordPiped argument row state.trace }\n',
  'pipedAt _ _ state = state\n'],
  [`${check}/DeclarationUse.purs`, 'traced span use = use\n'
    + '  { state = use.state\n'
    + '      { trace = recordUse span entry use.state.trace }\n'
    + '  }\n  where\n  entry =\n'
    + '    { slots: use.value.allocated.slots\n'
    + '    , marks: use.value.allocated.marks\n'
    + '    , opened: use.value.allocated.opened\n'
    + '    , stages: use.value.allocated.stages\n'
    + '    , fields: use.value.fields\n'
    + '    , result: use.value.result\n    }\n',
  'traced _ use = use\n'],
  [`${check}/Clauses.purs`,
    '    , trace = recordClause clause.span traced consumed.trace\n', ''],
  [`${check}/Clauses.purs`, '  -- The entry\'s rows and mark, kept for the'
    + ' read-back (tranche 2 Task 6b).\n  traced =\n    { row\n'
    + '    , own: setup.own\n    , inference: setup.inference\n'
    + '    , clauses: setup.clauses\n    }\n', ''],
  [`${check}/Defer.purs`, '        , trace = recordDeferral'
    + ' (Checked.spanOf inferred.value) row\n            consumed.trace\n',
  ''],
  [`${check}/Install.purs`, '    , trace = recordInstallation span'
    + ' { frame, current: env.current }\n        framed.trace\n', ''],
  // `row` (Task 8): the closed empty row, as `emptyTraced` has it. Its
  // `Nothing` needs the import that R037 (2)'s `current` no longer uses
  // (dossier §18.182).
  [`${check}/Function.purs`, 'import Data.Maybe (maybe)\n',
    'import Data.Maybe (Maybe(..), maybe)\n'],
  [`${check}/Function.purs`, '    , trace: finish (resolver settledSubst)'
    + ' (numbering settled) entryRow\n        marked.trace\n',
  '    , trace: Right\n        { uses: Map.empty, applied: Map.empty,'
    + ' piped: Map.empty\n        , clauses: Map.empty,'
    + ' deferrals: Map.empty, installations: Map.empty\n'
    + '        , row: Row [] Nothing\n        }\n']
].map(([file, needle, replacement]) => ({ file, needle, replacement }));

// Applies the edits to the src tree under `root`; each matches once.
export const removeCollection = root => {
  for (const { file, needle, replacement } of removalEdits) {
    const path = join(root, file);
    const text = readFileSync(path, 'utf8');
    assert.equal(text.split(needle).length - 1, 1,
      `${file}: a removal edit no longer matches exactly once; review`
      + ' scripts/r0-t2-trace-removal.mjs against the recorders');
    writeFileSync(path, text.replace(needle, replacement));
  }
};

// Builds the baseline in `<scratch>/t2-uncollected` from this worktree's
// src (output/ cloned first so purs recompiles only what changed) and
// returns its output directory. `scratch` must lie outside the worktree.
export const buildUncollected = scratch => {
  const at = resolve(scratch);
  mkdirSync(at, { recursive: true });
  const path = relative(realpathSync(repoRoot), realpathSync(at));
  assert.ok(path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path),
    'the scratch directory must be outside the worktree');
  const root = join(at, 't2-uncollected');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  cloneTree(join(repoRoot, 'src'), join(root, 'src'));
  cloneTree(join(repoRoot, 'output'), join(root, 'output'));
  symlinkSync(join(repoRoot, '.spago'), join(root, '.spago'));
  removeCollection(root);
  const built = compileTree(root);
  assert.ifError(built.error);
  assert.equal(built.status, 0, built.stderr);
  return { root, output: join(root, 'output') };
};

// The baseline built, then run over the pinned corpus: every trace count,
// raw (the final `State`'s) and finished, must be zero, or the build is
// removed and this throws. Returns the build and the run.
export const uncollected = async scratch => {
  const built = buildUncollected(scratch);
  try {
    const load = name =>
      import(pathToFileURL(join(built.output, name, 'index.js')).href);
    const run = await traceRun(load, await loadCorpus());
    const counted = [...Object.values(run.counts),
      ...Object.values(run.collected)];
    assert.ok(counted.every(count => count === 0), 'the baseline still'
      + ` collects: ${JSON.stringify({ counts: run.counts,
        collected: run.collected })}; review scripts/r0-t2-trace-removal.mjs`);
    return { ...built, run };
  } catch (failure) {
    rmSync(built.root, { recursive: true, force: true });
    throw failure;
  }
};
