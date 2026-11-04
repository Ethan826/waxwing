// Writes test/fixtures/r0/t2-gap-verdicts.json: today's verdicts on
// every declaration of the honest pin's gap lists, both denominators
// (dossier §18.159 criterion 2; test/r0-t2-gap-verdicts.mjs). It
// records what the committed checker returns and decides nothing: a
// loss is derived from `certify`'s verdict, never chosen. It refuses,
// writing nothing, when the file it would write does not back the pin
// (`verdictProblems`). test/r0-t2-gap-verdicts.serial.test.mjs
// recomputes the file and compares it both ways.
//   node scripts/r0-t2-gap-verdicts-pin.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { observedVerdicts } from '../test/r0-t2-gap-verdicts-run.mjs';
import { honestPinFile, verdictFileOf, verdictProblems, verdictsFile }
  from '../test/r0-t2-gap-verdicts.mjs';

const pin = JSON.parse(readFileSync(honestPinFile, 'utf8'));
const file = verdictFileOf(pin, await observedVerdicts(pin));
const problems = verdictProblems(file, pin);
if (problems.length > 0) {
  console.error(`refused; nothing written:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
} else {
  writeFileSync(verdictsFile, `${JSON.stringify(file, null, 1)}\n`);
  console.log(`wrote ${verdictsFile}`);
}
