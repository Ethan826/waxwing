// Prints the A2 activation gate's report (docs/plans/2026-11-03-a2-
// activation-gate.md): each of the seven criteria with its measured
// state, read from files in the working tree only (the gate-status file
// test/fixtures/r0/t2-activation-gate.json, Task 13's honest pin, the
// dossier, the statements, the regression registry's row names and the
// files the status cites). It runs neither the corpus nor the compiler,
// and it changes nothing. Exit 1 while any criterion is unmet, an
// absent or unreadable file included; exit 0 only when all seven are
// met. A met gate activates nothing: activation is A2's Task 16, held.
//   node scripts/r0-t2-activation-gate.mjs
import { existsSync, readFileSync } from 'node:fs';
import { r0Rows } from './regression-r0.mjs';
import { dossierFile, statementsFile, statusFile }
  from '../test/r0-t2-activation-evidence.mjs';
import { pinFile } from '../test/r0-t2-activation-pin.mjs';
import { evaluate, reportText, unmet }
  from '../test/r0-t2-activation-gate.mjs';

const text = path => (existsSync(path) ? readFileSync(path, 'utf8') : null);

// A JSON file, or null when absent or unparsable (then unmet).
const json = path => {
  try {
    return JSON.parse(text(path));
  } catch {
    return null;
  }
};

const status = json(statusFile);
const cited = [status?.comparison, status?.performance?.measurement]
  .filter(path => typeof path === 'string');
const results = evaluate({
  status, pin: json(pinFile), dossier: text(dossierFile),
  statements: text(statementsFile),
  rows: new Set(r0Rows.map(row => row.name)),
  files: Object.fromEntries(cited.map(path => [path, json(path)]))
});
console.log(reportText(results));
process.exitCode = unmet(results).length === 0 ? 0 : 1;
