// Writes test/fixtures/r0/t2-trace-inert.json (tranche 2 Task 7, read by
// test/r0-t2-trace-inert.serial.test.mjs): per declaration of the pinned
// corpus, the digest of `recheck`'s outcome less its trace, computed with
// the no-collection baseline (scripts/r0-t2-trace-removal.mjs applied to
// this worktree's src, built under the scratch directory named, which
// must lie outside the worktree; the build is removed after). Fails
// closed: src must be committed (the fixture names the commit), and the
// baseline's trace must be empty. A re-pin is a reviewed change (the
// procedure is in the test's header and docs/engineering.md).
//   node scripts/r0-t2-trace-inert-pin.mjs <scratch dir>
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCorpus } from '../test/r0-corpus.mjs';
import { corpusHash, inertFixture, traceRun }
  from '../test/r0-t2-trace-inert.mjs';
import { buildUncollected, repoRoot } from './r0-t2-trace-removal.mjs';

const [scratch] = process.argv.slice(2);
if (scratch === undefined)
  throw new Error('usage: r0-t2-trace-inert-pin.mjs <scratch dir>');
const git = args => execFileSync('git', args,
  { cwd: repoRoot, encoding: 'utf8' }).trim();
if (git(['status', '--porcelain', '--', 'src']) !== '')
  throw new Error('src has uncommitted changes; commit before pinning');
const commit = git(['rev-parse', 'HEAD']);
const built = buildUncollected(scratch);
try {
  const load = name =>
    import(pathToFileURL(join(built.output, name, 'index.js')).href);
  const run = await traceRun(load, await loadCorpus());
  if (run.repeated.length > 0)
    throw new Error(`repeated declaration keys: ${run.repeated.join(', ')}`);
  const counted = [...Object.values(run.counts),
    ...Object.values(run.collected)];
  if (counted.some(count => count !== 0))
    throw new Error(`the baseline still collects: ${JSON.stringify(
      { counts: run.counts, collected: run.collected })}; review`
      + ' scripts/r0-t2-trace-removal.mjs');
  const digests = Object.fromEntries(Object.keys(run.digests).sort()
    .map(key => [key, run.digests[key]]));
  writeFileSync(join(repoRoot, inertFixture), `${JSON.stringify({
    commit,
    baseline: 'scripts/r0-t2-trace-removal.mjs applied to commit',
    corpusManifest: corpusHash(),
    declarations: Object.keys(digests).length,
    digests
  }, null, 1)}\n`);
  console.log(`pinned ${Object.keys(digests).length} declarations`
    + ` from ${commit} less collection`);
} finally {
  rmSync(built.root, { recursive: true, force: true });
}
