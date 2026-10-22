// Re-pins the R0 corpus (test/r0-corpus.mjs): writes the manifest of
// the corpus as the tracked files now give it, and prints what changed
// against the manifest it replaces. Review that diff before committing.
//
//   node scripts/r0-corpus-pin.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync }
  from 'node:fs';
import { dirname, join } from 'node:path';
import { driftOf, manifestFile, manifestOf, repoRoot, unpinnedCorpus }
  from '../test/r0-corpus.mjs';

const file = join(repoRoot, manifestFile);
const entries = await unpinnedCorpus();
const previous = existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : { sources: {} };
const drift = driftOf(previous, entries);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, `${JSON.stringify(manifestOf(entries), null, 1)}\n`);
console.log(`Pinned ${entries.length} programs in ${manifestFile}: `
  + `${drift.added.length} added, ${drift.removed.length} removed, `
  + `${drift.changed.length} changed.`);
