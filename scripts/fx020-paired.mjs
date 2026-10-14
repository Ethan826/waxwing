// FX020 paired differential (one-off; Task 7 removes it, R4). Proves the
// corpus migration (Task 6) preserved behaviour: each original program,
// compiled by the baseline compiler, against its migrated twin compiled
// by the candidate (pairing and comparison: scripts/fx020-pairs.mjs).
//
//   node scripts/fx020-paired.mjs --baseline DIR [--candidate DIR]
//     [--regenerate] [--ledger FILE] [--show N] [--report FILE]
//
// DIR is a tree from before Task 6, i.e. this branch at the end of Task 5
// (`git archive` extracted, .spago copied in, `node scripts/build.mjs`):
// it holds both the baseline compiler (output/) and the frozen original
// corpus. The candidate (default: the working tree) holds the migrated
// corpus and the current compiler. Programs come from each tree's own
// test run under scripts/differential-hook.mjs (`--regenerate`; kept in
// the candidate's .build as fx020-paired-original.jsonl and
// fx020-paired-migrated.jsonl), plus examples/, negative/, every .wxw
// file and every Waxwing fence of the Markdown corpus. Differences listed
// in the ledger (default scripts/fx020-expected.json) with a reason pass;
// any other difference, or a ledger entry nothing matched, exits 1. The
// full list is written to the report (default .build/fx020-paired.json).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { compiler, harvested, regenerate } from './differential-load.mjs';
import { corpusFiles } from './fx020-corpus.mjs';
import { unitText, unitsOf } from './fx020-file.mjs';
import { judge, pairUp, sourceKey } from './fx020-pairs.mjs';

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};

const staticSources = tree => corpusFiles(tree)
  .filter(path => /\.(wxw|md)$/.test(path))
  .flatMap(path => unitsOf(path, readFileSync(join(tree, path), 'utf8'))
    .map(unitText));

const sources = (tree, file) =>
  [...harvested(tree, file), ...staticSources(tree)];

const shown = (item, limit) => [
  `  ${item.kind}: original ${sourceKey(item.original ?? '')} `
    + `migrated ${sourceKey(item.migrated ?? '')}`,
  ...['baseline', 'candidate'].filter(side => item[side] !== undefined)
    .map(side => `    ${side} ${String(item[side]).slice(0, limit)}`),
  `    source ${JSON.stringify((item.migrated ?? item.original)
    .slice(0, limit))}`];

const main = async () => {
  const baselineTree = option('--baseline', undefined);
  if (baselineTree === undefined) {
    throw new Error('--baseline DIR is required');
  }
  const baseline = resolve(baselineTree);
  const candidate = resolve(option('--candidate', '.'));
  const before = join(candidate, '.build/fx020-paired-original.jsonl');
  const after = join(candidate, '.build/fx020-paired-migrated.jsonl');
  if (process.argv.includes('--regenerate')) {
    regenerate(baseline, before);
    regenerate(candidate, after);
  }
  const ledger = JSON.parse(readFileSync(resolve(option('--ledger',
    join(candidate, 'scripts/fx020-expected.json'))), 'utf8')).differences;
  const pair = { baseline: await compiler(baseline),
    candidate: await compiler(candidate) };
  const result = judge(pair, pairUp(sources(baseline, before),
    sources(candidate, after)), ledger);
  console.log(`paired: ${result.compared} pairs, `
    + `${result.unexpected.length} unexpected differences, `
    + `${result.expected.length} expected (ledger), `
    + `${result.stale.length} stale ledger entries`);
  const show = Number(option('--show', 5));
  for (const item of result.unexpected.slice(0, show)) {
    console.log(shown(item, 300).join('\n'));
  }
  for (const entry of result.stale) {
    console.log(`  stale: ${JSON.stringify(entry)}`);
  }
  const report = resolve(option('--report',
    join(candidate, '.build/fx020-paired.json')));
  mkdirSync(dirname(report), { recursive: true });
  writeFileSync(report, `${JSON.stringify(result, null, 1)}\n`);
  process.exitCode = result.unexpected.length === 0
    && result.stale.length === 0 ? 0 : 1;
};

await main();
