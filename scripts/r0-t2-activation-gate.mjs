// Prints the A2 activation gate's report (docs/plans/2026-11-03-a2-
// activation-gate.md): each of the seven criteria with its measured
// state, read from files in the working tree only (the gate-status file
// test/fixtures/r0/t2-activation-gate.json, Task 13's honest pin, the
// gap-verdict file, the census, the replacement-loss file, the dossier,
// the statements, the regression registry's row names and the files the
// status cites), and, through `git rev-parse`, the src trees of HEAD and
// of each cited record's `commit`. It runs neither the corpus nor the
// compiler, and it changes nothing. Exit 1 while any criterion is unmet,
// an absent or unreadable file included;
// exit 0 only when the seven and the shadow criteria (S1, S2) are all met.
// Shadow minting and live replacement report apart (§18.168). A met gate
// activates nothing:
// activation is A2's Task 16, held.
//   node scripts/r0-t2-activation-gate.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { r0Rows } from './regression-r0.mjs';
import { dossierFile, fullSha, statementsFile, statusFile }
  from '../test/r0-t2-activation-evidence.mjs';
import { pinFile } from '../test/r0-t2-activation-pin.mjs';
import { verdictsFile } from '../test/r0-t2-gap-verdicts.mjs';
import { censusFile, lossesFile }
  from '../test/r0-t2-replacement-losses.mjs';
import { evaluate, reportText }
  from '../test/r0-t2-activation-gate.mjs';
import { allMet, evaluateShadow, shadowReport }
  from '../test/r0-t2-shadow-gate.mjs';

const text = path => (existsSync(path) ? readFileSync(path, 'utf8') : null);

// A JSON file, or null when absent or unparsable (then unmet).
const json = path => {
  try {
    return JSON.parse(text(path));
  } catch {
    return null;
  }
};

// A commit's src tree id, or null when git cannot resolve it.
const srcTree = commit => {
  try {
    return execFileSync('git', ['rev-parse', '--verify', '--quiet',
      `${commit}:src`], { encoding: 'utf8', stdio: ['ignore', 'pipe',
      'ignore'] }).trim();
  } catch {
    return null;
  }
};

const status = json(statusFile);
const cited = [status?.comparison, status?.performance?.measurement]
  .filter(path => typeof path === 'string');
const files = Object.fromEntries(cited.map(path => [path, json(path)]));
const commits = Object.values(files).map(file => file?.commit)
  .filter(commit => typeof commit === 'string' && fullSha.test(commit));
const evidence = {
  status, pin: json(pinFile), verdicts: json(verdictsFile),
  census: json(censusFile), losses: json(lossesFile),
  dossier: text(dossierFile),
  statements: text(statementsFile),
  rows: new Set(r0Rows.map(row => row.name)),
  unsupport: text('src/Domain/Verdict.purs'),
  files,
  src: { head: srcTree('HEAD'), at: Object.fromEntries(commits
    .map(commit => [commit, srcTree(commit)])) }
};
const results = evaluate(evidence);
const shadow = evaluateShadow(evidence);
console.log(reportText(results));
console.log(shadowReport(results, shadow));
process.exitCode = allMet(results, shadow) ? 0 : 1;
