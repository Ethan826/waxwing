// Re-pins RT8's accounting (Task 4.3; test/r0-rt8-run.mjs): writes the
// classes the pinned corpus now gives to test/fixtures/r0/rt8.json.
// Needs a built output/ (npm run build). A changed count is a reviewed
// change: read the diff and record its reading in docs/findings.md
// before committing.
//
//   node scripts/r0-rt8-pin.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../test/r0-corpus.mjs';
import { rt8File, rt8Rows, rt8Table } from '../test/r0-rt8-run.mjs';

const table = rt8Table(await rt8Rows());
writeFileSync(join(repoRoot, rt8File), `${JSON.stringify(table, null, 1)}\n`);
console.log(`Pinned RT8 over ${table.declarations} declarations in `
  + `${rt8File}: ${table.defects.length} defects, `
  + `${table.positions.length} position findings.`);
