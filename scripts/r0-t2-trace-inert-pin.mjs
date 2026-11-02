// Writes test/fixtures/r0/t2-trace-inert.json (tranche 2 Task 7, read by
// test/r0-t2-trace-inert.serial.test.mjs): per declaration of today's
// pinned corpus, the digest of `recheck`'s outcome less its trace, with
// the compiler whose output directory is named. Run once, with a build
// of the last commit before collection made in a scratch copy outside
// the worktree (deleted after); naming today's own output/ would pin
// the code under test against itself.
//   node scripts/r0-t2-trace-inert-pin.mjs <output dir> <commit>
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCorpus } from '../test/r0-corpus.mjs';
import { traceRun } from '../test/r0-t2-trace-inert.mjs';

const [outputDir, commit] = process.argv.slice(2);
if (outputDir === undefined || commit === undefined)
  throw new Error('usage: r0-t2-trace-inert-pin.mjs <output dir> <commit>');
const load = name =>
  import(pathToFileURL(resolve(outputDir, name, 'index.js')).href);
const run = await traceRun(load, await loadCorpus());
if (run.repeated.length > 0)
  throw new Error(`repeated declaration keys: ${run.repeated.join(', ')}`);
const digests = Object.fromEntries(Object.keys(run.digests).sort()
  .map(key => [key, run.digests[key]]));
writeFileSync('test/fixtures/r0/t2-trace-inert.json', `${JSON.stringify({
  commit,
  method: 'scripts/r0-t2-trace-inert-pin.mjs over test/r0-corpus.mjs',
  declarations: Object.keys(digests).length,
  digests
}, null, 1)}\n`);
console.log(`pinned ${Object.keys(digests).length} declarations`
  + ` from ${commit}`);
