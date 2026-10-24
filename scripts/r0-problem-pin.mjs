// Re-pins the digest of every corpus declaration's recorded problem
// (R0 Task 7.1b; test/r0-problem-pin-run.mjs) in
// test/fixtures/r0/problems.json. Needs a built output/. A changed
// digest is a changed recorded problem, which RT1, RT8, the window and
// the census read: re-pin only with that change reviewed and its
// reading recorded in docs/findings.md.
//
//   node scripts/r0-problem-pin.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../test/r0-corpus.mjs';
import { problemTable, problemsFile } from '../test/r0-problem-pin-run.mjs';

const table = await problemTable();
writeFileSync(join(repoRoot, problemsFile),
  `${JSON.stringify(table, null, 1)}\n`);
console.log(`Pinned ${table.declarations} problems of ${table.programs}`
  + ` programs in ${problemsFile}.`);
