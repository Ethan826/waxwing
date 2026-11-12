// Writes test/fixtures/r0/t2-replacement-losses.json: whole-program
// losses under `decide` (dossier §18.186; test/r0-t2-replacement-
// losses.mjs). It records what the committed checker returns; each class
// is derived from the facts and the gate status's registered known
// defects, never chosen. It refuses, writing nothing, when the file it
// would write is inconsistent with the census, the gap lists or the
// registry (`fileProblems`). test/r0-t2-replacement-losses.serial.test.mjs
// recomputes the file and compares it both ways.
//   node scripts/r0-t2-replacement-losses-pin.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { observedPrograms } from '../test/r0-t2-replacement-losses-run.mjs';
import { censusFile, fileProblems, lossesFile, lossesFileOf }
  from '../test/r0-t2-replacement-losses.mjs';
import { verdictsFile } from '../test/r0-t2-gap-verdicts.mjs';
import { statusFile } from '../test/r0-t2-activation-evidence.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const census = json(censusFile);
const verdicts = json(verdictsFile);
const known = json(statusFile).knownDefects ?? {};
const file = lossesFileOf(await observedPrograms(), census, verdicts, known);
const problems = fileProblems(file, census, verdicts, known);
if (problems.length > 0) {
  console.error(`refused; nothing written:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
} else {
  writeFileSync(lossesFile, `${JSON.stringify(file, null, 1)}\n`);
  console.log(`wrote ${lossesFile}`);
}
