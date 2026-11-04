// What the perf attribution measurement runs on
// (docs/plans/2026-11-04-perf-attribution-protocol.md §3): three cold
// scratch builds made the same way, and the workloads' sources as one
// JSON file.
// - Each arm's src is read from git (`git archive <commit> src`), never
//   from a working tree; the `uncollected` arm then gets the removal
//   edits (scripts/r0-t2-trace-removal.mjs `removeCollection`, which
//   requires each to match once). Every arm links this worktree's
//   .spago (the dependency files are checked equal at both commits) and
//   is compiled by plain purs into an empty output/: no build reuses
//   another's output.
// - Checks: preCommit is an ancestor of the head; the head arm's src
//   digest equals this clean worktree's, the uncollected arm's equals
//   it with the edits; over the pinned corpus the uncollected build
//   collects nothing and the head build collects something.
// - The sources are the tests' own (test/fn-linear-sources.mjs,
//   fn-scale-mixed.mjs, fn-scale-programs.mjs), written once so a
//   worker imports nothing from test/.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync }
  from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileTree } from './regression-clone.mjs';
import { srcDigest } from './r0-t2-perf-builds.mjs';
import { removalEdits, removeCollection, repoRoot }
  from './r0-t2-trace-removal.mjs';
import { linearWidth, preCommit, scaleParameters, workloads }
  from './r0-t2-attr-plan.mjs';

export const dependencyFiles = ['spago.yaml', 'spago.lock'];

const git = (args, accept = [0]) => {
  const ran = spawnSync('git', args, { encoding: 'utf8', cwd: repoRoot });
  assert.ok(accept.includes(ran.status),
    `git ${args.join(' ')}: ${ran.status} ${ran.stderr}`);
  return ran;
};

export const outside = scratch => {
  const at = resolve(scratch);
  mkdirSync(at, { recursive: true });
  const path = relative(realpathSync(repoRoot), realpathSync(at));
  assert.ok(path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path),
    'the scratch directory must be outside the worktree');
  return at;
};

// The arms' recipes: which commit's src, and the edit applied to it
// (injected: identity, or the trace removal).
const unchanged = () => undefined;
export const recipesOf = head => ({
  pre: { commit: preCommit, edit: unchanged, edits: [] },
  head: { commit: head, edit: unchanged, edits: [] },
  uncollected: { commit: head, edit: removeCollection, edits: removalEdits }
});

// `<scratch>/attr-<name>`: the commit's src from git, the edit, the
// shared .spago, a cold plain-purs compile.
export const buildArm = (scratch, name, recipe) => {
  const root = join(outside(scratch), `attr-${name}`);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const tar = join(root, 'src.tar');
  git(['archive', '--format=tar', '-o', tar, recipe.commit, 'src']);
  const unpacked = spawnSync('tar', ['-xf', tar, '-C', root],
    { encoding: 'utf8' });
  assert.equal(unpacked.status, 0, unpacked.stderr);
  rmSync(tar);
  recipe.edit(root);
  symlinkSync(join(repoRoot, '.spago'), join(root, '.spago'));
  const built = compileTree(root);
  assert.ifError(built.error);
  assert.equal(built.status, 0, built.stderr);
  return { root, output: join(root, 'output'), commit: recipe.commit,
    srcTree: git(['rev-parse', `${recipe.commit}:src`]).stdout.trim(),
    digest: srcDigest(root) };
};

// Trace entry counts over the corpus, raw and finished, for one build.
const traceCounts = async output => {
  const { loadCorpus } = await import('../test/r0-corpus.mjs');
  const { traceRun } = await import('../test/r0-t2-trace-inert.mjs');
  const load = name =>
    import(pathToFileURL(join(output, name, 'index.js')).href);
  const run = await traceRun(load, await loadCorpus());
  return [...Object.values(run.counts), ...Object.values(run.collected)];
};

// All three builds, checked; the caller removes `roots` after the run.
export const prepareArms = async (scratch, head) => {
  git(['merge-base', '--is-ancestor', preCommit, head]);
  git(['diff', '--quiet', preCommit, head, '--', ...dependencyFiles]);
  const roots = [];
  try {
    const builds = {};
    for (const [name, recipe] of Object.entries(recipesOf(head))) {
      builds[name] = buildArm(scratch, name, recipe);
      roots.push(builds[name].root);
    }
    assert.equal(builds.head.digest, srcDigest(repoRoot),
      'the head arm\'s src is not this worktree\'s');
    assert.equal(builds.uncollected.digest,
      srcDigest(repoRoot, removalEdits),
      'the uncollected arm\'s src is not the head\'s with the edits');
    assert.notEqual(builds.pre.digest, builds.head.digest);
    const traces = { head: await traceCounts(builds.head.output),
      uncollected: await traceCounts(builds.uncollected.output) };
    assert.ok(traces.uncollected.every(count => count === 0),
      `the uncollected arm still collects: ${traces.uncollected}`);
    assert.ok(traces.head.some(count => count > 0),
      'the head arm collects nothing');
    return { builds, roots, traces };
  } catch (failure) {
    roots.forEach(root => rmSync(root, { recursive: true, force: true }));
    throw failure;
  }
};

// The workloads' sources and expected outcomes, from the tests' modules.
export const inputsOf = async () => {
  const linear = await import('../test/fn-linear-sources.mjs');
  const mixed = await import('../test/fn-scale-mixed.mjs');
  const { generic } = await import('../test/fn-scale-programs.mjs');
  const scale = { mixed: mixed.source,
    generic: generic(scaleParameters).source };
  return { linearWidth, scaleParameters,
    workloads: Object.fromEntries(workloads.map(workload => [workload.name,
      workload.kind === 'linear'
        ? { kind: 'linear', source: linear.forms[workload.key](linearWidth),
          expected: linear.expectedOutcome(workload.key) }
        : { kind: 'scale', source: scale[workload.key],
          expected: 'ok' }])) };
};

export const writeInputs = async scratch => {
  const inputs = await inputsOf();
  const path = join(outside(scratch), 'r0-t2-attr-inputs.json');
  writeFileSync(path, JSON.stringify(inputs));
  return { path, inputs };
};
