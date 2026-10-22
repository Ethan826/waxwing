// The R0 corpus: the repository's Waxwing programs, pinned (tranche 1,
// Task 0.2; ruling R1). The rules are stream 7b's
// (research/division-campaign/integration/measure/corpus.mjs, imported,
// not copied), applied to the tracked files only (`git ls-files`), so
// untracked work such as docs/writing never enters. Every entry's
// source is pinned by its SHA-256 in test/fixtures/r0/corpus-manifest.json;
// a program added, removed or changed fails `loadCorpus` until re-pinned,
// so a snapshot, census or table built on the corpus cannot drift on an
// unrelated commit.
//
// API:
//   loadCorpus(root?)     the pinned corpus, [{ origin, source }], in
//                         corpus order; throws on drift, saying how to
//                         re-pin.
//   unpinnedCorpus(root?) the same entries, unchecked (the re-pin
//                         script's input).
//   manifestOf(entries)   the manifest those entries pin.
//   checkedCorpus(manifest, entries)
//                         the entries, or the drift error.
//   driftOf(manifest, entries)
//                         { added, removed, changed }: origins, each
//                         sorted; all empty when the manifest pins them.
//   repinCommand          the command that re-pins.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpusOf }
  from '../research/division-campaign/integration/measure/corpus.mjs';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const manifestFile = 'test/fixtures/r0/corpus-manifest.json';
export const repinCommand = 'node scripts/r0-corpus-pin.mjs';

// Programs taken from each record generator: stream 7b's default
// (measure.mjs SEEDS).
export const generatedPerGenerator = 200;

const tracked = root => execFileSync('git', ['ls-files', '-z'],
  { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\0').filter(path => path.length > 0);

export const unpinnedCorpus = async (root = repoRoot) =>
  corpusOf(root, tracked(root), generatedPerGenerator);

const digest = source => createHash('sha256').update(source).digest('hex');

export const manifestOf = entries => ({
  generatedPerGenerator,
  sources: Object.fromEntries(
    entries.map(entry => [entry.origin, digest(entry.source)]))
});

export const driftOf = (manifest, entries) => {
  const pinned = new Map(Object.entries(manifest.sources));
  const found = new Map(Object.entries(manifestOf(entries).sources));
  const sorted = names => [...names].sort();
  return {
    added: sorted([...found.keys()].filter(origin => !pinned.has(origin))),
    removed: sorted([...pinned.keys()].filter(origin => !found.has(origin))),
    changed: sorted([...found.keys()].filter(origin =>
      pinned.has(origin) && pinned.get(origin) !== found.get(origin)))
  };
};

const shown = 10;
const listed = (title, origins) => (origins.length === 0 ? []
  : [`${title} (${origins.length}): ${origins.slice(0, shown).join(', ')}`
    + (origins.length > shown ? ', ...' : '')]);

const driftMessage = (manifest, drift) => [
  `the R0 corpus differs from ${manifestFile}:`,
  ...(manifest.generatedPerGenerator === generatedPerGenerator ? []
    : [`generated per generator: pinned ${manifest.generatedPerGenerator}`
      + `, now ${generatedPerGenerator}`]),
  ...listed('added', drift.added),
  ...listed('removed', drift.removed),
  ...listed('changed', drift.changed),
  `If the change is intended, re-pin with \`${repinCommand}\`, review`
    + ' the manifest diff and commit it.'
].join('\n');

// The entries, if `manifest` pins them; otherwise an error naming the
// drift and the re-pin command.
export const checkedCorpus = (manifest, entries) => {
  const drift = driftOf(manifest, entries);
  const moved = drift.added.length + drift.removed.length
    + drift.changed.length;
  if (manifest.generatedPerGenerator !== generatedPerGenerator || moved > 0) {
    throw new Error(driftMessage(manifest, drift));
  }
  return entries;
};

export const loadCorpus = async (root = repoRoot) => checkedCorpus(
  JSON.parse(readFileSync(join(root, manifestFile), 'utf8')),
  await unpinnedCorpus(root));
