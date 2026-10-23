// Re-pins the R0 census (Task 3.5; test/r0-census-run.mjs): writes the
// counts the pinned corpus now gives to test/fixtures/r0/census.json.
// Needs a built output/ (npm run build). A changed count is a reviewed
// change: read the diff and record its reading in docs/plans/
// r0-census.md before committing.
//
//   node scripts/r0-census-pin.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../test/r0-corpus.mjs';
import { censusFile, corpusCensus } from '../test/r0-census-run.mjs';

const census = await corpusCensus();
writeFileSync(join(repoRoot, censusFile),
  `${JSON.stringify(census, null, 1)}\n`);
console.log(`Pinned the census of ${census.corpus.programs} programs in `
  + `${censusFile}: ${census.union.programs} accepted programs blocked.`);
