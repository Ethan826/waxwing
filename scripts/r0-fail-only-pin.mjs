// Re-pins the fail-only cohort (dossier 18.102): the declarations whose
// only handler construct is `fail`, with their shadow verdicts, in
// test/fixtures/r0/effects-fail-only.json. The boundary test only
// compares. Needs a built output/. Run it only on the author's word: the
// cohort moving means a verdict changed for a declaration whose effects
// were never independently validated.
//
//   node scripts/r0-fail-only-pin.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../test/r0-corpus.mjs';
import { cohortOf, survey } from '../test/r0-effects-boundary-run.mjs';
import { pinFile } from '../test/r0-fail-only-compare.mjs';

const { facts, refused } = await survey();
if (refused.length > 0) {
  console.error(`Not pinning: generation refused ${refused.length} `
    + `declarations, the first at ${refused[0]}.`);
  process.exit(1);
}
const cohort = cohortOf(facts);
writeFileSync(join(repoRoot, pinFile), `${JSON.stringify({
  amendment: 'dossier 18.102',
  command: 'node scripts/r0-fail-only-pin.mjs', cohort }, null, 1)}\n`);
console.log(`Pinned ${cohort.length} fail-only declarations in ${pinFile}.`);
