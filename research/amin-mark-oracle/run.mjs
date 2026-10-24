// Runs U1's bounded oracle with the real `holds` and least-term
// construction: every family must show no disagreement. Families in
// families.mjs; the hand-translated forgery cases in cases.mjs.
import { holds, leastVerdict } from './oracle.mjs';
import { oneFamily, pairsFamily, randomFamily, soundFamily, twoFamily }
  from './families.mjs';
import { runCases } from './cases.mjs';

const results = [pairsFamily(holds), oneFamily(leastVerdict),
  twoFamily(leastVerdict), randomFamily(leastVerdict), soundFamily(holds)];
let failures = 0;
for (const result of results) {
  console.log(`${result.name}: ${JSON.stringify(result.counts)}`
    + `, ${result.found.length} disagreements`);
  failures += result.found.length;
  for (const item of result.found.slice(0, 3))
    console.log('  ', JSON.stringify(item));
}
failures += runCases(holds);
console.log(failures === 0 ? 'no disagreement' : `${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
