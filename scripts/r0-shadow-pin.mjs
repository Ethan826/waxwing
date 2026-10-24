// Re-pins Task 4.5's window table (test/r0-shadow-run.mjs): writes the
// shadow run's rows and summary to test/fixtures/r0/window.json. Needs a
// built output/ (npm run build). A changed row is a reviewed change:
// read the diff and record its reading in docs/findings.md before
// committing.
//
//   node scripts/r0-shadow-pin.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../test/r0-corpus.mjs';
import { windowFile, windowPrograms, windowTable, windowText }
  from '../test/r0-shadow-run.mjs';

const table = windowTable(await windowPrograms());
writeFileSync(join(repoRoot, windowFile), windowText(table));
console.log(`Pinned the window over ${table.summary.declarations.all} `
  + `declarations in ${windowFile}: ${table.rows.length} rows.`);
