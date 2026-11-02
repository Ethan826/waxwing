// Tranche 2 Task 9's bounded evidence (statements §5; design §F): every
// family of U1's mark oracle (research/amin-mark-oracle/families.mjs)
// run once against the PureScript least terms (ReadBack/Least.purs)
// and the validator's `holds`, through test/r0-t2-marks-oracle-cases.mjs
// (its encoder and disclosures). Term by term against oracle.mjs
// `leastTerms` on every graph the least-term families build; the
// equalities-ignored mutant must be detected. Bounded: agreement with
// the definition on these graphs; not independent evidence of
// recorded/live correspondence (P1 untested). The unit test
// (test/r0-t2-marks-oracle.test.mjs) runs a seeded subset.
//   node research/t2-read-back-design/marks-oracle.mjs
import { load } from '../../test/r0-generate-support.mjs';
import { oracleCases } from '../../test/r0-t2-marks-oracle-cases.mjs';

const { verdict, holds, counts, families } = await oracleCases(load);
const started = Date.now();
const real = verdict();
const runs = [() => families.pairsFamily(holds),
  () => families.oneFamily(real), () => families.twoFamily(real),
  () => families.randomFamily(real), () => families.soundFamily(holds)];
let failures = 0;
for (const run of runs) {
  const result = run();
  console.log(`${result.name}: ${JSON.stringify(result.counts)}, `
    + `${result.found.length} disagreements `
    + `(${Math.round((Date.now() - started) / 1000)}s)`);
  failures += result.found.length;
}
console.log(`terms against oracle.mjs leastTerms: ${JSON.stringify(
  counts)}`);
failures += counts.differ + counts.clashDiffer;
const mutant = families.oneFamily(verdict(false));
console.log(`mutant (equalities ignored) on 'one': `
  + `${mutant.found.length} disagreements (must be > 0)`);
if (mutant.found.length === 0) failures += 1;
console.log(failures === 0 ? 'no disagreement' : `${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
