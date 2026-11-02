// Tranche 2 Task 7 regression probes (the trace gates); the rows are in
// scripts/regression-r0-t2-gates.mjs. The scan probe reads the src tree
// of the compiler under test (the directory above its output/) with the
// healthy build's Style.Trace reader, the gate's own tool; the counts
// probe loads modules from the compiler under test only.
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { filesUnder } from '../scripts/structure.mjs';
import { traceFindings } from '../scripts/structure-trace.mjs';
import { facts } from '../output/Style.Trace/index.js';
import { loadCorpus } from './r0-corpus.mjs';
import { pinnedEntries, traceRun } from './r0-t2-trace-inert.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const rootOf = context => resolve(dirname(context.compilerPath), '..', '..');

const scanned = async context => {
  const root = rootOf(context);
  const sources = Object.fromEntries(filesUnder(resolve(root, 'src'))
    .filter(file => file.endsWith('.purs')).map(file =>
      [relative(root, file), readFileSync(file, 'utf8')]));
  const found = traceFindings(sources, facts);
  if (found.length > 0) fail(`${context.probe}: ${found.join('; ')}`);
  passed(context);
};

const fixture = () => JSON.parse(readFileSync(
  'test/fixtures/r0/t2-trace-inert.json', 'utf8'));

const counted = async context => {
  const load = name => import(pathToFileURL(
    resolve(dirname(context.compilerPath), '..', name, 'index.js')));
  const run = await traceRun(load, await loadCorpus());
  const pinned = fixture().digests;
  const moved = Object.keys(pinned).filter(key =>
    run.digests[key] !== pinned[key]);
  if (JSON.stringify(run.counts) !== JSON.stringify(pinnedEntries)
    || moved.length > 0)
    fail(`${context.probe}: entries ${JSON.stringify(run.counts)};`
      + ` recheck moved ${moved.length}`);
  passed(context);
};

export const t2GatesProbes = {
  'r0-t2-gates-scan': scanned,
  'r0-t2-gates-counts': counted
};
