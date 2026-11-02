// Writes test/fixtures/r0/t2-honest.json, tranche 2 Task 13's pin of the
// honest packages through I3 and the validator (design §I Task 8), on
// the author's word only. It refuses, writing nothing, when ruling
// §18.155 (7)'s condition fails on either denominator
// (test/r0-t2-honest-gate.mjs `admission`: a Malformed, a read fault
// outside the identified ones, an unexpected validator refusal, more
// than three RequirementUnjudged), and when an existing pin would be
// replaced without `--repin`, or an entry would vanish from an approved
// list without `--explain=<why>`, which the pin then records. Floors
// derive from the lists and the denominators (`pinOf`); there is no
// option to lower one or add an exception.
//   node scripts/r0-t2-honest-pin.mjs [--repin] [--explain=<why>]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { load } from '../test/r0-generate-support.mjs';
import { denominators, outcomeCounts, pinFile }
  from '../test/r0-t2-honest-report.mjs';
import { admission, observe, pinOf } from '../test/r0-t2-honest-gate.mjs';

const flag = name => process.argv.includes(name);
const explanation = process.argv.find(arg => arg.startsWith('--explain='))
  ?.slice('--explain='.length);

const vanished = (before, after) => {
  const ats = entries => new Set(entries.map(entry => entry.at));
  const kept = new Set([...ats(after.faults), ...ats(after.refusals)]);
  return [...before.faults, ...before.refusals]
    .filter(entry => !kept.has(entry.at)).map(entry => entry.at);
};

const found = await denominators(load);
const pin = { ruling: 'dossier §18.155 (7)', denominators: {} };
const problems = [];
for (const [name, { origins, rows }] of Object.entries(found)) {
  const observed = observe(rows);
  console.log(name, JSON.stringify(outcomeCounts(rows)));
  problems.push(...admission(observed, origins)
    .map(problem => `${name}: ${problem}`));
  pin.denominators[name] = pinOf(observed);
}

if (existsSync(pinFile)) {
  const before = JSON.parse(readFileSync(pinFile, 'utf8'));
  if (!flag('--repin')) problems.push(`${pinFile} exists: --repin`);
  for (const name of Object.keys(pin.denominators)) {
    const gone = vanished(before.denominators[name],
      pin.denominators[name]);
    if (gone.length > 0 && explanation === undefined)
      problems.push(`${name}: vanished from an approved list without `
        + `--explain: ${gone.join(', ')}`);
  }
  if (explanation !== undefined)
    pin.explanations = [...before.explanations ?? [], explanation];
}

if (problems.length > 0) {
  console.error(`refused (ruling §18.155 (7)); nothing written:\n  `
    + problems.join('\n  '));
  process.exitCode = 1;
} else {
  writeFileSync(pinFile, `${JSON.stringify(pin, null, 2)}\n`);
  console.log(`wrote ${pinFile}`);
}
