// Re-pins the digest of every corpus declaration's recorded effect
// problem (amin tranche 1, Task 14; test/r0-effects-pin-run.mjs) in
// test/fixtures/r0/effects.json. Needs a built output/. The pin test
// only reads; a moved digest is a changed obligation, so re-pin only
// with that change reviewed (the moved declarations listed in the
// commit message and docs/progress.md).
//
//   node scripts/r0-effects-pin.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../test/r0-corpus.mjs';
import { effectsFile, effectsTable, healthyBuild, sourcesOf }
  from '../test/r0-effects-pin-run.mjs';

const table = await effectsTable(await healthyBuild(), await sourcesOf());
writeFileSync(join(repoRoot, effectsFile),
  `${JSON.stringify(table, null, 1)}\n`);
console.log(`Pinned ${table.declarations} effect problems of `
  + `${table.programs} programs in ${effectsFile}.`);
