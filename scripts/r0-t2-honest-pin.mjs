// Writes test/fixtures/r0/t2-honest.json, tranche 2 Task 13's pin of the
// honest packages through I3 and the validator (design §I Task 8), on
// the author's word only. It refuses, writing nothing, when ruling
// §18.155 (7)'s condition fails on either denominator
// (test/r0-t2-honest-gate.mjs `admission`: a Malformed, a read fault
// outside the identified ones, a refusal other than the three named
// RequirementUnjudged with certify's own refusal and the four named
// ForcedTail refusals certify accepts (§18.157), an approved entry
// missing without `--explain`), and when the re-pin rule refuses
// (test/r0-t2-honest-repin.mjs: no `--repin`, a vanished entry
// without `--explain=<why>`, a denominator the old pin lacks, and a
// lower floor or candidate count whatever the explanation, §18.157).
// The explanation documents an approved change and is recorded with
// what it covers; it approves nothing. Floors derive from the lists and
// the denominators (`pinOf`); there is no option to lower one or add an
// exception.
//   node scripts/r0-t2-honest-pin.mjs [--repin] [--explain=<why>]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { load } from '../test/r0-generate-support.mjs';
import { denominators, outcomeCounts, pinFile }
  from '../test/r0-t2-honest-report.mjs';
import { admission, observe, pinOf, vanishedApproved }
  from '../test/r0-t2-honest-gate.mjs';
import { repin } from '../test/r0-t2-honest-repin.mjs';

const explanation = process.argv.find(arg => arg.startsWith('--explain='))
  ?.slice('--explain='.length);
const explained = explanation !== undefined;

const found = await denominators(load);
const after = { ruling: 'dossier §18.155 (7), §18.157',
  denominators: {} };
const problems = [];
const covers = [];
for (const [name, { origins, rows }] of Object.entries(found)) {
  const observed = observe(rows);
  console.log(name, JSON.stringify(outcomeCounts(rows)));
  problems.push(...admission(observed, origins, explained)
    .map(problem => `${name}: ${problem}`));
  covers.push(...vanishedApproved(observed, origins)
    .map(gone => `${name}: ${gone}`));
  after.denominators[name] = pinOf(observed);
}

const before = existsSync(pinFile)
  ? JSON.parse(readFileSync(pinFile, 'utf8')) : null;
const result = repin(before, after,
  { repin: process.argv.includes('--repin'), explanation, covers });
problems.push(...result.problems);

if (problems.length > 0) {
  console.error(`refused (ruling §18.155 (7)); nothing written:\n  `
    + problems.join('\n  '));
  process.exitCode = 1;
} else {
  writeFileSync(pinFile, `${JSON.stringify(result.pin, null, 2)}\n`);
  console.log(`wrote ${pinFile}`);
}
