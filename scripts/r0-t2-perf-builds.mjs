// What the paired performance measurement runs on
// (docs/plans/2026-11-04-performance-protocol.md §2, §3): a clean tree,
// both builds in the scratch directory and the inputs as one JSON file.
// - The tree must be clean: no tracked change, and no untracked file
//   under src/, test/ or scripts/ (`dirtyPaths`; other untracked files,
//   such as docs/writing, are allowed).
// - Both builds are made the same way: this worktree's src and output/
//   cloned to the scratch directory and compiled by plain purs. The
//   collecting build has no edit; the no-collection baseline has the
//   removal edits (scripts/r0-t2-trace-removal.mjs `uncollected`, which
//   also checks that it collects nothing). `srcDigest` confirms that
//   each build's src is this worktree's src, with exactly those edits.
// - The inputs (the corpus loader's sources and the effect pin's) are
//   loaded once, here, and written as JSON, so a worker imports nothing
//   from test/ and loads no compiler but the one it measures.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync,
  writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { cloneTree, compileTree, filesUnder } from './regression-clone.mjs';
import { removalEdits, repoRoot, uncollected }
  from './r0-t2-trace-removal.mjs';

const routine = /^(src|test|scripts)\//;

// `git status --porcelain --untracked-files=all` lines that make the
// tree unfit to measure: every tracked change, and untracked paths
// under src/, test/ or scripts/.
export const dirtyPaths = porcelain => String(porcelain).split('\n')
  .filter(line => line.trim() !== '')
  .filter(line => !line.startsWith('?? ') || routine.test(line.slice(3)));

const git = args => {
  const ran = spawnSync('git', args, { encoding: 'utf8', cwd: repoRoot });
  assert.equal(ran.status, 0, `git ${args.join(' ')}: ${ran.stderr}`);
  return ran.stdout;
};

// Throws unless the tree is clean; returns the commit measured.
export const cleanCommit = () => {
  const dirty = dirtyPaths(git(['status', '--porcelain',
    '--untracked-files=all']));
  assert.deepEqual(dirty, [], 'the tree must be clean to measure');
  return git(['rev-parse', 'HEAD']).trim();
};

// A digest of every file under `<root>/src`, with `edits` applied
// in memory as removeCollection applies them on disk.
export const srcDigest = (root, edits = []) => {
  const hash = createHash('sha256');
  for (const file of filesUnder(join(root, 'src')).sort()) {
    const path = join('src', file);
    const text = edits.filter(edit => edit.file === path).reduce(
      (current, edit) => current.replace(edit.needle, edit.replacement),
      readFileSync(join(root, path), 'utf8'));
    hash.update(`${path}\n${text}\n`);
  }
  return hash.digest('hex');
};

const outside = scratch => {
  const at = resolve(scratch);
  mkdirSync(at, { recursive: true });
  const path = relative(realpathSync(repoRoot), realpathSync(at));
  assert.ok(path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path),
    'the scratch directory must be outside the worktree');
  return at;
};

// The collecting build: as buildUncollected, without the edits.
export const buildCollecting = scratch => {
  const root = join(outside(scratch), 't2-collecting');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  cloneTree(join(repoRoot, 'src'), join(root, 'src'));
  cloneTree(join(repoRoot, 'output'), join(root, 'output'));
  symlinkSync(join(repoRoot, '.spago'), join(root, '.spago'));
  const built = compileTree(root);
  assert.ifError(built.error);
  assert.equal(built.status, 0, built.stderr);
  return { root, output: join(root, 'output') };
};

// Both builds, their src confirmed against this worktree's. The caller
// removes `roots` after the run.
export const prepareBuilds = async scratch => {
  const collecting = buildCollecting(scratch);
  const roots = [collecting.root];
  try {
    const removed = await uncollected(scratch);
    roots.push(removed.root);
    const digests = { worktree: srcDigest(repoRoot),
      collecting: srcDigest(collecting.root),
      uncollected: srcDigest(removed.root),
      expectedUncollected: srcDigest(repoRoot, removalEdits) };
    assert.equal(digests.collecting, digests.worktree,
      'the collecting build\'s src is not this worktree\'s');
    assert.equal(digests.uncollected, digests.expectedUncollected,
      'the baseline\'s src is not this worktree\'s with the removal edits');
    assert.notEqual(digests.uncollected, digests.collecting);
    return { builds: { collecting: collecting.output,
      uncollected: removed.output }, roots, digests };
  } catch (failure) {
    roots.forEach(root => rmSync(root, { recursive: true, force: true }));
    throw failure;
  }
};

const plain = entry => ({ origin: entry.origin, source: entry.source });

// Both source sets, loaded once and written to `<scratch>/inputs.json`.
export const writeInputs = async scratch => {
  const { loadCorpus } = await import('../test/r0-corpus.mjs');
  const { sourcesOf } = await import('../test/r0-effects-pin-run.mjs');
  const inputs = { corpus: (await loadCorpus()).map(plain),
    effectPin: (await sourcesOf()).map(plain) };
  const path = join(outside(scratch), 'r0-t2-perf-inputs.json');
  writeFileSync(path, JSON.stringify(inputs));
  return { path, corpus: inputs.corpus.length,
    effectPin: inputs.effectPin.length };
};
